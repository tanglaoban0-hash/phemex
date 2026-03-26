const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error, generateOrderNo, parsePagination } = require('../utils/helpers');

// 获取合约类型列表
router.get('/contracts', async (req, res) => {
  try {
    const contracts = await db.query(
      'SELECT * FROM option_contracts WHERE status = 1 ORDER BY sort_order ASC'
    );
    res.json(success(contracts));
  } catch (err) {
    console.error('Get contracts error:', err);
    res.json(error('获取合约类型失败'));
  }
});

// 获取当前交易对价格
router.get('/price/:pairId', async (req, res) => {
  try {
    const { pairId } = req.params;
    const pair = await db.getOne(
      'SELECT id, symbol, price FROM trading_pairs WHERE id = ? AND status = 1',
      [pairId]
    );
    
    if (!pair) {
      return res.json(error('交易对不存在'));
    }
    
    res.json(success({
      pairId: pair.id,
      symbol: pair.symbol,
      price: pair.price,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error('Get price error:', err);
    res.json(error('获取价格失败'));
  }
});

// 下秒合约单
router.post('/order', auth, async (req, res) => {
  try {
    const { pairId, contractId, direction, amount } = req.body;

    // 验证参数
    if (!pairId || !contractId || !direction || !amount) {
      return res.json(error('请填写完整信息'));
    }

    if (direction !== 1 && direction !== 2) {
      return res.json(error('方向错误'));
    }

    // 获取合约信息
    const contract = await db.getOne(
      'SELECT * FROM option_contracts WHERE id = ? AND status = 1',
      [contractId]
    );

    if (!contract) {
      return res.json(error('合约类型不存在'));
    }

    // 验证金额
    if (parseFloat(amount) < parseFloat(contract.min_amount)) {
      return res.json(error(`最小金额为 ${contract.min_amount}`));
    }
    if (parseFloat(amount) > parseFloat(contract.max_amount)) {
      return res.json(error(`最大金额为 ${contract.max_amount}`));
    }

    // 获取交易对信息
    const pair = await db.getOne(
      'SELECT * FROM trading_pairs WHERE id = ? AND status = 1',
      [pairId]
    );

    if (!pair) {
      return res.json(error('交易对不存在'));
    }

    // 检查余额（需要USDT）
    const usdt = await db.getOne('SELECT id FROM coins WHERE symbol = ?', ['USDT']);
    if (!usdt) {
      return res.json(error('系统错误'));
    }

    const balance = await db.getOne(
      'SELECT available FROM user_balances WHERE user_id = ? AND coin_id = ?',
      [req.userId, usdt.id]
    );

    if (!balance || parseFloat(balance.available) < parseFloat(amount)) {
      return res.json(error('余额不足'));
    }

    // 扣除余额
    await db.execute(
      'UPDATE user_balances SET available = available - ? WHERE user_id = ? AND coin_id = ?',
      [amount, req.userId, usdt.id]
    );

    // 创建订单
    const orderNo = generateOrderNo();
    const startPrice = pair.price;
    const now = new Date();
    const startTime = process.env.USE_MYSQL === 'true' 
      ? now.toISOString().slice(0, 19).replace('T', ' ')
      : now.toISOString();
    const endTime = process.env.USE_MYSQL === 'true'
      ? new Date(Date.now() + contract.duration * 1000).toISOString().slice(0, 19).replace('T', ' ')
      : new Date(Date.now() + contract.duration * 1000).toISOString();

    const result = await db.execute(
      `INSERT INTO option_orders (order_no, user_id, pair_id, contract_id, direction, amount, 
                                   start_price, profit_rate, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderNo, req.userId, pairId, contractId, direction, amount, startPrice, 
       contract.profit_rate, startTime, endTime]
    );

    // 添加到结算队列
    addToSettlementQueue(result.lastID, contract.duration);

    res.json(success({
      orderId: result.lastID,
      orderNo,
      startPrice,
      amount,
      direction,
      duration: contract.duration,
      profitRate: contract.profit_rate,
      endTime
    }, '下单成功'));

  } catch (err) {
    console.error('Option order error:', err);
    res.json(error('下单失败'));
  }
});

// 获取进行中的订单
router.get('/active', auth, async (req, res) => {
  try {
    const orders = await db.query(
      `SELECT oo.*, tp.symbol as pair_symbol, oc.name as contract_name, oc.duration
       FROM option_orders oo
       JOIN trading_pairs tp ON oo.pair_id = tp.id
       JOIN option_contracts oc ON oo.contract_id = oc.id
       WHERE oo.user_id = ? AND oo.status = 0
       ORDER BY oo.created_at DESC`,
      [req.userId]
    );
    
    // 计算剩余时间
    const now = Date.now();
    const ordersWithCountdown = orders.map(order => {
      const endTime = new Date(order.end_time).getTime();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      return { ...order, remainingSeconds: remaining };
    });
    
    res.json(success(ordersWithCountdown));
  } catch (err) {
    console.error('Get active orders error:', err);
    res.json(error('获取订单失败'));
  }
});

// 获取历史订单
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const orders = await db.query(
      `SELECT oo.*, tp.symbol as pair_symbol, oc.name as contract_name
       FROM option_orders oo
       JOIN trading_pairs tp ON oo.pair_id = tp.id
       JOIN option_contracts oc ON oo.contract_id = oc.id
       WHERE oo.user_id = ? AND oo.status != 0
       ORDER BY oo.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.userId, String(limit), String(offset)]
    );

    const [{ count }] = await db.query(
      'SELECT COUNT(*) as count FROM option_orders WHERE user_id = ? AND status != 0',
      [req.userId]
    );

    res.json(success({
      list: orders,
      total: count,
      page: parseInt(page),
      pageSize: String(limit)
    }));
  } catch (err) {
    console.error('Get history error:', err);
    res.json(error('获取历史订单失败'));
  }
});

// 结算队列（简单实现，生产环境应使用消息队列）
const settlementQueue = new Map();

function addToSettlementQueue(orderId, delaySeconds) {
  const timer = setTimeout(() => {
    settleOrder(orderId);
    settlementQueue.delete(orderId);
  }, delaySeconds * 1000);
  
  settlementQueue.set(orderId, timer);
}

// 结算订单
async function settleOrder(orderId) {
  try {
    // 获取订单信息
    const order = await db.getOne(
      'SELECT * FROM option_orders WHERE id = ? AND status = 0',
      [orderId]
    );
    
    if (!order) return;

    // 获取当前价格
    const pair = await db.getOne(
      'SELECT price FROM trading_pairs WHERE id = ?',
      [order.pair_id]
    );
    
    if (!pair) return;

    const endPrice = pair.price;
    const startPrice = parseFloat(order.start_price);
    const direction = order.direction;
    const amount = parseFloat(order.amount);
    const profitRate = parseFloat(order.profit_rate);

    // 判断输赢
    let status; // 1-盈利 2-亏损 3-平局
    let profitAmount = 0;

    if (endPrice > startPrice) {
      // 涨了
      status = direction === 1 ? 1 : 2;
    } else if (endPrice < startPrice) {
      // 跌了
      status = direction === 2 ? 1 : 2;
    } else {
      // 平局
      status = 3;
    }

    // 后端控制盈亏（根据系统配置调整胜率）
    const control = await db.getOne(
      "SELECT user_profit_rate FROM option_control WHERE date = date('now')"
    );
    
    const userProfitRate = control ? control.user_profit_rate : 50;
    
    // 如果随机数大于用户胜率，则强制让用户输（后端可控）
    if (Math.random() * 100 > userProfitRate) {
      // 强制输
      status = status === 1 ? 2 : 1;
    }

    // 计算盈亏金额
    if (status === 1) {
      // 盈利
      profitAmount = amount * profitRate;
    } else if (status === 2) {
      // 亏损
      profitAmount = -amount;
    } else {
      // 平局，退还本金
      profitAmount = 0;
    }

    // 更新订单
    const updateSql = process.env.USE_MYSQL === 'true'
      ? "UPDATE option_orders SET status = ?, end_price = ?, profit_amount = ?, settled_at = NOW() WHERE id = ?"
      : "UPDATE option_orders SET status = ?, end_price = ?, profit_amount = ?, settled_at = datetime('now') WHERE id = ?";
    
    await db.execute(updateSql, [status, endPrice, profitAmount, orderId]);

    // 更新用户余额
    const usdt = await db.getOne("SELECT id FROM coins WHERE symbol = 'USDT'");
    if (usdt) {
      if (status === 1) {
        // 盈利：返还本金+收益
        const totalReturn = amount + profitAmount;
        await db.execute(
          'UPDATE user_balances SET available = available + ? WHERE user_id = ? AND coin_id = ?',
          [totalReturn, order.user_id, usdt.id]
        );
      } else if (status === 3) {
        // 平局：退还本金
        await db.execute(
          'UPDATE user_balances SET available = available + ? WHERE user_id = ? AND coin_id = ?',
          [amount, order.user_id, usdt.id]
        );
      }
      // 输了不需要操作，因为本金已经扣除了
    }

    // 推送结果
    if (global.io) {
      global.io.emit('option_settled', {
        orderId,
        status,
        startPrice,
        endPrice,
        profitAmount,
        userId: order.user_id
      });
    }

    console.log(`✅ 秒合约结算: 订单${orderId} 结果:${status === 1 ? '盈' : status === 2 ? '亏' : '平'} 盈亏:${profitAmount}`);

  } catch (err) {
    console.error('Settlement error:', err);
  }
}

module.exports = router;