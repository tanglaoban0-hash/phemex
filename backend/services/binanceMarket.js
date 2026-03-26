const axios = require('axios');
const WebSocket = require('ws');
const db = require('../config/database-mysql');

class BinanceMarketService {
  constructor() {
    this.baseURL = 'https://api.binance.com';
    this.wsURL = 'wss://stream.binance.com:9443/ws';
    this.ws = null;
    this.isRunning = false;
    this.priceCache = new Map();
    this.subscribers = new Set();
  }

  // 启动服务
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('📈 启动Binance行情服务...');
    
    // 初始化价格
    await this.initPrices();
    
    // 启动WebSocket连接
    this.startWebSocket();
    
    // 定期更新K线数据
    this.startKlineSync();
  }

  // 初始化交易对价格
  async initPrices() {
    try {
      // 获取24小时价格变化
      const response = await axios.get(`${this.baseURL}/api/v3/ticker/24hr`, {
        params: { symbols: JSON.stringify(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ETHBTC']) }
      });

      for (const ticker of response.data) {
        const symbol = this.formatSymbol(ticker.symbol);
        const priceData = {
          symbol: symbol,
          price: parseFloat(ticker.lastPrice),
          priceChange: parseFloat(ticker.priceChangePercent),
          high: parseFloat(ticker.highPrice),
          low: parseFloat(ticker.lowPrice),
          volume: parseFloat(ticker.volume),
          timestamp: Date.now()
        };
        
        this.priceCache.set(symbol, priceData);
        
        // 更新数据库
        await this.updatePriceInDB(symbol, priceData);
        
        // 缓存到Redis
        await db.setCache(`price:${symbol}`, priceData, 5);
      }

      console.log('✅ Binance价格初始化完成');
    } catch (err) {
      console.error('Binance价格初始化失败:', err.message);
    }
  }

  // 启动WebSocket实时行情
  startWebSocket() {
    try {
      // 订阅多个交易对的实时价格
      const streams = 'btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker/ethbtc@ticker';
      this.ws = new WebSocket(`${this.wsURL}/stream?streams=${streams}`);

      this.ws.on('open', () => {
        console.log('✅ Binance WebSocket连接成功');
      });

      this.ws.on('message', async (data) => {
        try {
          const parsed = JSON.parse(data);
          const ticker = parsed.data;
          
          if (ticker && ticker.s) {
            const symbol = this.formatSymbol(ticker.s);
            const priceData = {
              symbol: symbol,
              price: parseFloat(ticker.c),
              priceChange: parseFloat(ticker.P),
              high: parseFloat(ticker.h),
              low: parseFloat(ticker.l),
              volume: parseFloat(ticker.v),
              timestamp: Date.now()
            };

            this.priceCache.set(symbol, priceData);
            
            // 更新数据库
            await this.updatePriceInDB(symbol, priceData);
            
            // 更新Redis缓存（5秒过期）
            await db.setCache(`price:${symbol}`, priceData, 5);
            
            // 推送实时行情给前端
            if (global.io) {
              const pair = await db.getOne(
                'SELECT id FROM trading_pairs WHERE symbol = ?',
                [symbol]
              );
              if (pair) {
                global.io.emit('ticker', {
                  pairId: pair.id,
                  symbol: symbol,
                  price: priceData.price,
                  change: priceData.priceChange,
                  high: priceData.high,
                  low: priceData.low,
                  volume: priceData.volume,
                  time: Date.now()
                });
              }
            }
          }
        } catch (err) {
          console.error('处理WebSocket消息错误:', err);
        }
      });

      this.ws.on('error', (err) => {
        console.error('Binance WebSocket错误:', err.message);
      });

      this.ws.on('close', () => {
        console.log('Binance WebSocket断开，5秒后重连...');
        setTimeout(() => this.startWebSocket(), 5000);
      });

    } catch (err) {
      console.error('启动WebSocket失败:', err.message);
    }
  }

  // 同步K线数据
  startKlineSync() {
    // 每30秒同步一次K线数据
    setInterval(async () => {
      await this.syncKlines('BTC/USDT', '1m');
      await this.syncKlines('ETH/USDT', '1m');
      await this.syncKlines('BNB/USDT', '1m');
    }, 30000);

    // 立即执行一次
    this.syncKlines('BTC/USDT', '1m');
    this.syncKlines('ETH/USDT', '1m');
    this.syncKlines('BNB/USDT', '1m');
  }

  // 同步K线数据
  async syncKlines(symbol, interval) {
    try {
      // 检查Redis缓存
      const cacheKey = `kline:${symbol}:${interval}`;
      const cached = await db.getCache(cacheKey);
      if (cached && cached.length > 0) {
        // 缓存有效，直接返回
        return;
      }

      const binanceSymbol = symbol.replace('/', '');
      const response = await axios.get(`${this.baseURL}/api/v3/klines`, {
        params: {
          symbol: binanceSymbol,
          interval: interval,
          limit: 100
        }
      });

      const klines = response.data.map(k => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }));

      // 保存到数据库
      const pair = await db.getOne(
        'SELECT id FROM trading_pairs WHERE symbol = ?',
        [symbol]
      );

      if (pair) {
        for (const k of klines) {
          await db.execute(
            `INSERT INTO kline_data (pair_id, period, timestamp, open, high, low, close, volume)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             open = VALUES(open), high = VALUES(high), low = VALUES(low),
             close = VALUES(close), volume = VALUES(volume)`,
            [pair.id, interval, k.timestamp, k.open, k.high, k.low, k.close, k.volume]
          );
        }
      }

      // 缓存到Redis（5分钟过期）
      await db.setCache(cacheKey, klines, 300);
      
      console.log(`✅ ${symbol} K线数据同步完成`);
    } catch (err) {
      console.error(`同步${symbol} K线失败:`, err.message);
    }
  }

  // 更新数据库中的价格
  async updatePriceInDB(symbol, priceData) {
    try {
      await db.execute(
        `UPDATE trading_pairs 
         SET price = ?, price_change_24h = ?, high_24h = ?, low_24h = ?, volume_24h = ?, updated_at = NOW()
         WHERE symbol = ?`,
        [priceData.price, priceData.priceChange, priceData.high, priceData.low, priceData.volume, symbol]
      );
    } catch (err) {
      console.error('更新数据库价格失败:', err);
    }
  }

  // 格式化交易对符号
  formatSymbol(binanceSymbol) {
    const map = {
      'BTCUSDT': 'BTC/USDT',
      'ETHUSDT': 'ETH/USDT',
      'BNBUSDT': 'BNB/USDT',
      'ETHBTC': 'ETH/BTC'
    };
    return map[binanceSymbol] || binanceSymbol;
  }

  // 获取当前价格
  getPrice(symbol) {
    return this.priceCache.get(symbol);
  }

  // 停止服务
  stop() {
    this.isRunning = false;
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = new BinanceMarketService();