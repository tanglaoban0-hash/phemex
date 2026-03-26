const db = require('../config/db');

class MarketSimulator {
  constructor() {
    this.pairs = [];
    this.intervals = [];
    this.isRunning = false;
  }

  // 启动行情模拟
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 加载所有启用的交易对
      this.pairs = await db.query(`
        SELECT tp.*, bc.symbol as base_symbol, qc.symbol as quote_symbol
        FROM trading_pairs tp
        JOIN coins bc ON tp.base_coin_id = bc.id
        JOIN coins qc ON tp.quote_coin_id = qc.id
        WHERE tp.status = 1
      `);

      console.log(`📈 行情模拟器启动，监控 ${this.pairs.length} 个交易对`);

      // 先生成历史K线数据
      await this.generateInitialKlines();

      // 为每个交易对启动模拟
      for (const pair of this.pairs) {
        this.simulatePair(pair);
      }

      // 启动K线生成
      this.startKlineGeneration();

    } catch (err) {
      console.error('行情模拟器启动失败:', err);
    }
  }

  // 生成初始历史K线数据
  async generateInitialKlines() {
    try {
      const now = Date.now();
      const periods = ['1m', '5m', '15m', '1h', '4h', '1d'];
      
      for (const pair of this.pairs) {
        // 生成过去100条1分钟K线
        for (let i = 100; i >= 0; i--) {
          const timestamp = Math.floor((now - i * 60000) / 60000) * 60000;
          const basePrice = parseFloat(pair.price);
          const change = (Math.random() - 0.5) * 0.02; // ±1%波动
          const open = basePrice * (1 + change);
          const close = basePrice * (1 + (Math.random() - 0.5) * 0.01);
          const high = Math.max(open, close) * (1 + Math.random() * 0.005);
          const low = Math.min(open, close) * (1 - Math.random() * 0.005);
          const volume = Math.random() * 100 + 10;

          try {
            await db.execute(
              `INSERT OR REPLACE INTO kline_data (pair_id, period, timestamp, open, high, low, close, volume)
               VALUES (?, '1m', ?, ?, ?, ?, ?, ?)`,
              [pair.id, timestamp, open, high, low, close, volume]
            );
          } catch (e) {
            // 忽略重复错误
          }
        }
      }
      console.log('✅ 初始K线数据生成完成');
    } catch (err) {
      console.error('生成初始K线失败:', err);
    }
  }

  // 模拟单个交易对的价格波动
  simulatePair(pair) {
    const volatility = 0.002; // 0.2% 波动率
    
    const interval = setInterval(async () => {
      try {
        if (!pair || !pair.price) return;
        
        // 随机价格波动 (-0.2% ~ +0.2%)
        const change = (Math.random() - 0.5) * 2 * volatility;
        const newPrice = parseFloat(pair.price) * (1 + change);
        
        // 更新24小时数据
        const priceChange = ((newPrice - pair.price) / pair.price) * 100;
        
        // 更新交易对数据
        await db.execute(
          `UPDATE trading_pairs 
           SET price = ?, price_change_24h = ?, 
               high_24h = MAX(high_24h, ?), 
               low_24h = MIN(low_24h, ?),
               volume_24h = volume_24h + ?
           WHERE id = ?`,
          [
            newPrice.toFixed(pair.price_precision || 2),
            priceChange.toFixed(2),
            newPrice,
            newPrice,
            (Math.random() * 10).toFixed(4),
            pair.id
          ]
        );

        pair.price = newPrice;

        // 推送实时行情
        if (global.io) {
          global.io.emit('ticker', {
            pairId: pair.id,
            symbol: pair.symbol,
            price: newPrice.toFixed(pair.price_precision || 2),
            change: priceChange.toFixed(2),
            high: pair.high_24h,
            low: pair.low_24h,
            volume: pair.volume_24h,
            time: Date.now()
          });
        }

      } catch (err) {
        console.error(`行情模拟错误 [${pair?.symbol}]:`, err);
      }
    }, 3000 + Math.random() * 2000); // 3-5秒随机间隔

    this.intervals.push(interval);
  }

  // 生成K线数据
  startKlineGeneration() {
    // 每分钟生成1分钟K线
    const klineInterval = setInterval(async () => {
      try {
        const now = Date.now();
        
        for (const pair of this.pairs) {
          if (!pair || !pair.price) continue;
          
          // 生成1分钟K线
          const basePrice = parseFloat(pair.price);
          const open = basePrice * (1 + (Math.random() - 0.5) * 0.01);
          const close = basePrice;
          const high = Math.max(open, close) * (1 + Math.random() * 0.005);
          const low = Math.min(open, close) * (1 - Math.random() * 0.005);
          const volume = Math.random() * 100;

          const timestamp = Math.floor(now / 60000) * 60000; // 对齐到分钟

          // SQLite兼容：先查询是否存在
          const existing = await db.getOne(
            'SELECT id, high, low FROM kline_data WHERE pair_id = ? AND period = ? AND timestamp = ?',
            [pair.id, '1m', timestamp]
          );

          if (existing) {
            // 更新现有K线
            await db.execute(
              `UPDATE kline_data 
               SET high = MAX(?, ?), low = MIN(?, ?), close = ?, volume = volume + ?
               WHERE pair_id = ? AND period = ? AND timestamp = ?`,
              [existing.high, high, existing.low, low, close, volume, pair.id, '1m', timestamp]
            );
          } else {
            // 插入新K线
            await db.execute(
              `INSERT INTO kline_data (pair_id, period, timestamp, open, high, low, close, volume)
               VALUES (?, '1m', ?, ?, ?, ?, ?, ?)`,
              [pair.id, timestamp, open, high, low, close, volume]
            );
          }

          // 推送K线更新
          if (global.io) {
            global.io.emit('kline', {
              pairId: pair.id,
              period: '1m',
              data: {
                time: timestamp,
                open: open.toFixed(pair.price_precision || 2),
                high: high.toFixed(pair.price_precision || 2),
                low: low.toFixed(pair.price_precision || 2),
                close: close.toFixed(pair.price_precision || 2),
                volume: volume.toFixed(4)
              }
            });
          }
        }
      } catch (err) {
        console.error('K线生成错误:', err);
      }
    }, 60000); // 每分钟

    this.intervals.push(klineInterval);
  }

  // 停止模拟
  stop() {
    this.isRunning = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    console.log('📉 行情模拟器已停止');
  }

  // 获取K线历史数据
  async getKlineHistory(pairId, period, limit = 100) {
    try {
      const rows = await db.query(
        `SELECT * FROM kline_data 
         WHERE pair_id = ? AND period = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [pairId, period, limit]
      );
      return rows.reverse();
    } catch (err) {
      console.error('获取K线历史失败:', err);
      return [];
    }
  }
}

// 创建单例
const simulator = new MarketSimulator();

module.exports = simulator;