const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error, generateOrderNo, parsePagination } = require('../utils/helpers');
const matchEngine = require('../services/matchEngine');

// 下单
router.post('/order', auth, async (req, res) => {
  try {
    const { pairId, type, side, price, amount } = req.body;

    // 验证参数
    if (!pairId || !type || !side || !amount) {
      return res.json(error('请填写完整订单信息'));
    }

    if (type === 1 && !price) {
      return res.json(error('限价单需要填写价格'));
    }

    // 获取交易对信息
    const pairInfo = await db.getOne(
      `SELECT tp.*, bc.id as base_coin_id, bc.symbol as base_symbol,
              qc.id as quote_coin_id, qc.symbol as quote_symbol
       FROM trading_pairs tp
       JOIN coins bc ON tp.base_coin_id = bc.id
       JOIN coins qc ON tp.quote_coin_id = qc.id
       WHERE tp.id = ? AND tp.status = 1`,
      [pairId]
    );

    if (!pairInfo) {
      return res.json(error('交易对不存在或已禁用'));
    }

    // 验证最小交易量
    if (parseFloat(amount) < parseFloat(pairInfo.min_amount)) {
      return res.json(error(`最小交易数量为 ${pairInfo.min_amount}`));
    }

    const orderNo = generateOrderNo();
    const orderPrice = type === 1 ? price : pairInfo.price;

    // 计算所需金额
    let requiredAmount;
    if (side === 1) {
      requiredAmount = parseFloat(orderPrice) * parseFloat(amount);
    } else {
      requiredAmount = parseFloat(amount);
    }

    const coinId = side === 1 ? pairInfo.quote_coin_id : pairInfo.base_coin_id;

    // 检查余额
    const balance = await db.getOne(
      'SELECT available FROM user_balances WHERE user_id = ? AND coin_id = ?',
      [req.userId, coinId]
    );

    const availableBalance = balance ? parseFloat(balance.available) : 0;

    if (availableBalance < requiredAmount) {
      return res.json(error('余额不足'));
    }

    // 冻结资金
    await db.execute(
      `UPDATE user_balances 
       SET available = available - ?, frozen = frozen + ?
       WHERE user_id = ? AND coin_id = ?`,
      [requiredAmount, requiredAmount, req.userId, coinId]
    );

    // 创建订单
    const orderResult = await db.execute(
      `INSERT INTO orders (order_no, user_id, pair_id, type, side, price, amount, filled_amount, filled_total, avg_price, fee, status, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?)`,
      [orderNo, req.userId, pairId, type, side, type === 1 ? price : null, amount, req.ip]
    );

    const orderId = orderResult.lastID;

    // 获取完整订单信息
    const order = await db.getOne('SELECT * FROM orders WHERE id = ?', [orderId]);

    // 添加到撮合引擎
    matchEngine.addOrder(order);

    res.json(success({
      orderId,
      orderNo,
      status: 0
    }, '下单成功'));

  } catch (err) {
    console.error('Order error:', err);
    res.json(error('下单失败'));
  }
});

// 撤单
router.post('/cancel/:orderId', auth, async (req, res) => {
  try {
    const { orderId } = req.params;

    // 获取订单信息
    const order = await db.getOne(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, req.userId]
    );

    if (!order) {
      return res.json(error('订单不存在'));
    }

    if (order.status !== 0 && order.status !== 1) {
      return res.json(error('订单状态不允许撤单'));
    }

    // 计算需要解冻的金额
    let unfrozenAmount;
    if (order.side === 1) {
      // 买入订单，解冻计价币
      const remainingAmount = parseFloat(order.amount) - parseFloat(order.filled_amount);
      unfrozenAmount = remainingAmount * parseFloat(order.price || 0);
    } else {
      // 卖出订单，解冻基础币
      unfrozenAmount = parseFloat(order.amount) - parseFloat(order.filled_amount);
    }

    // 获取交易对信息
    const pair = await db.getOne(
      'SELECT * FROM trading_pairs WHERE id = ?',
      [order.pair_id]
    );

    if (pair && unfrozenAmount > 0) {
      const coinId = order.side === 1 ? pair.quote_coin_id : pair.base_coin_id;
      
      // 解冻资金
      await db.execute(
        `UPDATE user_balances 
         SET available = available + ?, frozen = frozen - ?
         WHERE user_id = ? AND coin_id = ?`,
        [unfrozenAmount, unfrozenAmount, req.userId, coinId]
      );
    }

    // 更新订单状态
    await db.execute(
      'UPDATE orders SET status = 3 WHERE id = ?',
      [orderId]
    );

    // 从撮合引擎移除
    matchEngine.removeOrder(orderId, order.pair_id, order.side);

    res.json(success(null, '撤单成功'));

  } catch (err) {
    console.error('Cancel order error:', err);
    res.json(error('撤单失败'));
  }
});

// 获取当前委托
router.get('/open-orders', auth, async (req, res) => {
  try {
    const { pairId } = req.query;

    let whereClause = 'WHERE o.user_id = ? AND o.status IN (0, 1)';
    const params = [req.userId];

    if (pairId) {
      whereClause += ' AND o.pair_id = ?';
      params.push(pairId);
    }

    const orders = await db.query(
      `SELECT o.*, tp.symbol as pair_symbol
       FROM orders o
       JOIN trading_pairs tp ON o.pair_id = tp.id
       ${whereClause}
       ORDER BY o.created_at DESC`,
      params
    );

    res.json(success(orders));

  } catch (err) {
    console.error('Get open orders error:', err);
    res.json(error('获取委托失败'));
  }
});

// 获取历史订单
router.get('/history', auth, async (req, res) => {
  try {
    const { pairId, status } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE o.user_id = ?';
    const params = [req.userId];

    if (pairId) {
      whereClause += ' AND o.pair_id = ?';
      params.push(pairId);
    }

    if (status !== undefined) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    } else {
      whereClause += ' AND o.status IN (2, 3)';
    }

    const orders = await db.query(
      `SELECT o.*, tp.symbol as pair_symbol
       FROM orders o
       JOIN trading_pairs tp ON o.pair_id = tp.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM orders o ${whereClause}`,
      params
    );

    res.json(success({
      list: orders,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
      }
    }));

  } catch (err) {
    console.error('Get history error:', err);
    res.json(error('获取历史订单失败'));
  }
});

// 统一订单查询接口
router.get('/orders', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE o.user_id = ?';
    const params = [req.userId];
    
    if (status !== undefined) {
      const statuses = status.split(',').map(s => parseInt(s.trim()));
      whereClause += ` AND o.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
    
    const orders = await db.query(
      `SELECT o.*, tp.symbol as pair_symbol
       FROM orders o
       JOIN trading_pairs tp ON o.pair_id = tp.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );
    
    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM orders o ${whereClause}`,
      params
    );
    
    res.json(success({
      list: orders,
      total: count,
      page: parseInt(page),
      pageSize: String(limit)
    }));
  } catch (err) {
    console.error('Get orders error:', err);
    res.json(error('获取订单失败'));
  }
});

// 获取成交记录
router.get('/trades', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const trades = await db.query(
      `SELECT t.*, tp.symbol as pair_symbol,
        CASE WHEN t.buyer_id = ? THEN 1 ELSE 2 END as side
       FROM trades t
       JOIN trading_pairs tp ON t.pair_id = tp.id
       WHERE t.buyer_id = ? OR t.seller_id = ?
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.userId, req.userId, req.userId, String(limit), String(offset)]
    );
    
    const [{ count }] = await db.query(
      'SELECT COUNT(*) as count FROM trades WHERE buyer_id = ? OR seller_id = ?',
      [req.userId, req.userId]
    );
    
    res.json(success({
      list: trades,
      total: count,
      page: parseInt(page),
      pageSize: String(limit)
    }));
  } catch (err) {
    console.error('Get trades error:', err);
    res.json(error('获取成交记录失败'));
  }
});

module.exports = router;