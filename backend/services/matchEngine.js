const { generateTradeNo } = require('../utils/helpers');
const db = require('../config/db');

class MatchEngine {
  constructor() {
    this.orderBooks = new Map();
    this.isRunning = false;
  }

  // 初始化交易对订单簿
  async initPairs() {
    try {
      const pairs = await db.query('SELECT id FROM trading_pairs WHERE status = 1');
      for (const pair of pairs) {
        this.orderBooks.set(pair.id, {
          buyOrders: [],
          sellOrders: []
        });
      }
      console.log(`✅ 撮合引擎初始化完成，加载 ${pairs.length} 个交易对`);
    } catch (err) {
      console.error('撮合引擎初始化失败:', err);
    }
  }

  // 启动撮合引擎
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.initPairs();
    console.log('🚀 撮合引擎已启动');
  }

  // 添加订单到订单簿
  async addOrder(order) {
    const { id, pair_id, side, price, amount, filled_amount, type } = order;
    const remainingAmount = parseFloat(amount) - parseFloat(filled_amount || 0);
    
    if (remainingAmount <= 0) return;

    const orderBook = this.orderBooks.get(pair_id);
    if (!orderBook) return;

    const orderItem = {
      id,
      price: parseFloat(price) || 0,
      amount: remainingAmount,
      type,
      timestamp: Date.now()
    };

    if (side === 1) {
      orderBook.buyOrders.push(orderItem);
      orderBook.buyOrders.sort((a, b) => b.price - a.price);
    } else {
      orderBook.sellOrders.push(orderItem);
      orderBook.sellOrders.sort((a, b) => a.price - b.price);
    }

    // 尝试撮合
    await this.match(pair_id);
  }

  // 从订单簿移除订单
  removeOrder(orderId, pairId, side) {
    const orderBook = this.orderBooks.get(pairId);
    if (!orderBook) return;

    if (side === 1) {
      orderBook.buyOrders = orderBook.buyOrders.filter(o => o.id !== orderId);
    } else {
      orderBook.sellOrders = orderBook.sellOrders.filter(o => o.id !== orderId);
    }
  }

  // 撮合逻辑
  async match(pairId) {
    const orderBook = this.orderBooks.get(pairId);
    if (!orderBook) return;

    try {
      while (orderBook.buyOrders.length > 0 && orderBook.sellOrders.length > 0) {
        const buyOrder = orderBook.buyOrders[0];
        const sellOrder = orderBook.sellOrders[0];

        const canMatch = this.canMatch(buyOrder, sellOrder);
        if (!canMatch) break;

        const matchAmount = Math.min(buyOrder.amount, sellOrder.amount);
        const matchPrice = sellOrder.type === 1 ? sellOrder.price : buyOrder.price;

        // 执行成交
        await this.executeTrade(pairId, buyOrder, sellOrder, matchAmount, matchPrice);

        buyOrder.amount -= matchAmount;
        sellOrder.amount -= matchAmount;

        if (buyOrder.amount <= 0) {
          orderBook.buyOrders.shift();
        }
        if (sellOrder.amount <= 0) {
          orderBook.sellOrders.shift();
        }
      }
    } catch (err) {
      console.error('撮合错误:', err);
    }
  }

  canMatch(buyOrder, sellOrder) {
    if (buyOrder.type === 1 && sellOrder.type === 1) {
      return buyOrder.price >= sellOrder.price;
    }
    return true;
  }

  // 执行单笔成交
  async executeTrade(pairId, buyOrder, sellOrder, amount, price) {
    const total = amount * price;
    const tradeNo = generateTradeNo();

    try {
      // 获取订单信息
      const buy = await db.getOne('SELECT * FROM orders WHERE id = ?', [buyOrder.id]);
      const sell = await db.getOne('SELECT * FROM orders WHERE id = ?', [sellOrder.id]);
      
      if (!buy || !sell) return;

      const pair = await db.getOne(
        `SELECT tp.*, bc.id as base_coin_id, qc.id as quote_coin_id
         FROM trading_pairs tp
         JOIN coins bc ON tp.base_coin_id = bc.id
         JOIN coins qc ON tp.quote_coin_id = qc.id
         WHERE tp.id = ?`,
        [pairId]
      );
      
      if (!pair) return;

      const buyFee = total * 0.001;
      const sellFee = total * 0.001;

      // 1. 创建成交记录
      await db.execute(
        `INSERT INTO trades (trade_no, buy_order_id, sell_order_id, buyer_id, seller_id, 
                            pair_id, price, amount, total, buy_fee, sell_fee)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tradeNo, buy.id, sell.id, buy.user_id, sell.user_id, pairId, price, amount, total, buyFee, sellFee]
      );

      // 2. 更新买方订单
      const newBuyFilled = parseFloat(buy.filled_amount || 0) + amount;
      const newBuyTotal = parseFloat(buy.filled_total || 0) + total;
      const buyStatus = newBuyFilled >= parseFloat(buy.amount) ? 2 : 1;
      await db.execute(
        `UPDATE orders SET filled_amount = ?, filled_total = ?, avg_price = ?, 
                           status = ?, fee = fee + ?
         WHERE id = ?`,
        [newBuyFilled, newBuyTotal, newBuyTotal / newBuyFilled, buyStatus, buyFee, buy.id]
      );

      // 3. 更新卖方订单
      const newSellFilled = parseFloat(sell.filled_amount || 0) + amount;
      const newSellTotal = parseFloat(sell.filled_total || 0) + total;
      const sellStatus = newSellFilled >= parseFloat(sell.amount) ? 2 : 1;
      await db.execute(
        `UPDATE orders SET filled_amount = ?, filled_total = ?, avg_price = ?, 
                           status = ?, fee = fee + ?
         WHERE id = ?`,
        [newSellFilled, newSellTotal, newSellTotal / newSellFilled, sellStatus, sellFee, sell.id]
      );

      // 4. 更新买方余额（解冻计价币，增加基础币）
      await db.execute(
        `UPDATE user_balances 
         SET frozen = frozen - ?
         WHERE user_id = ? AND coin_id = ?`,
        [total, buy.user_id, pair.quote_coin_id]
      );
      
      // 买方获得基础币
      await db.execute(
        `INSERT INTO user_balances (user_id, coin_id, available) VALUES (?, ?, ?)
         ON CONFLICT(user_id, coin_id) DO UPDATE SET available = available + excluded.available`,
        [buy.user_id, pair.base_coin_id, amount]
      );

      // 5. 更新卖方余额（解冻基础币，增加计价币）
      await db.execute(
        `UPDATE user_balances 
         SET frozen = frozen - ?
         WHERE user_id = ? AND coin_id = ?`,
        [amount, sell.user_id, pair.base_coin_id]
      );
      
      // 卖方获得计价币（扣除手续费）
      await db.execute(
        `INSERT INTO user_balances (user_id, coin_id, available) VALUES (?, ?, ?)
         ON CONFLICT(user_id, coin_id) DO UPDATE SET available = available + excluded.available`,
        [sell.user_id, pair.quote_coin_id, total - sellFee]
      );

      // 6. 更新最新价格
      await db.execute(
        'UPDATE trading_pairs SET price = ? WHERE id = ?',
        [price, pairId]
      );

      // 7. 推送成交消息
      if (global.io) {
        global.io.emit('trade', {
          pairId,
          price,
          amount,
          total,
          time: new Date().toISOString()
        });
      }

      console.log(`✅ 成交: ${pairId} 价格:${price} 数量:${amount}`);
    } catch (err) {
      console.error('执行成交错误:', err);
    }
  }

  // 获取订单簿深度
  getOrderBook(pairId, limit = 20) {
    const orderBook = this.orderBooks.get(pairId);
    if (!orderBook) return { bids: [], asks: [] };

    const bids = this.aggregateOrders(orderBook.buyOrders.slice(0, limit), 'buy');
    const asks = this.aggregateOrders(orderBook.sellOrders.slice(0, limit), 'sell');

    return { bids, asks };
  }

  aggregateOrders(orders, side) {
    const priceMap = new Map();
    
    for (const order of orders) {
      const price = order.price.toFixed(2);
      if (priceMap.has(price)) {
        priceMap.set(price, priceMap.get(price) + order.amount);
      } else {
        priceMap.set(price, order.amount);
      }
    }

    return Array.from(priceMap.entries()).map(([price, amount]) => ({
      price: parseFloat(price),
      amount: parseFloat(amount.toFixed(6))
    }));
  }
}

const engine = new MatchEngine();
module.exports = engine;