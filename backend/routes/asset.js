const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error, generateWithdrawNo, parsePagination } = require('../utils/helpers');

// 获取币种列表
router.get('/coins', auth, async (req, res) => {
  try {
    const coins = await db.query(
      'SELECT id, symbol, name, icon, decimals, min_withdraw, withdraw_fee FROM coins WHERE status = 1'
    );
    res.json(success(coins));
  } catch (err) {
    console.error('Get coins error:', err);
    res.json(error('获取币种列表失败'));
  }
});

// 获取用户余额
router.get('/balance/:coinId', auth, async (req, res) => {
  try {
    const { coinId } = req.params;

    const balance = await db.getOne(
      `SELECT ub.*, c.symbol, c.name, c.icon
       FROM user_balances ub
       JOIN coins c ON ub.coin_id = c.id
       WHERE ub.user_id = ? AND ub.coin_id = ?`,
      [req.userId, coinId]
    );

    if (!balance) {
      // 返回空余额
      const coin = await db.getOne('SELECT symbol, name, icon FROM coins WHERE id = ?', [coinId]);
      return res.json(success({
        coin_id: parseInt(coinId),
        available: 0,
        frozen: 0,
        symbol: coin?.symbol,
        name: coin?.name,
        icon: coin?.icon
      }));
    }

    res.json(success(balance));
  } catch (err) {
    console.error('Get balance error:', err);
    res.json(error('获取余额失败'));
  }
});

// 获取用户所有余额
router.get('/balances', auth, async (req, res) => {
  try {
    const balances = await db.query(
      `SELECT ub.*, c.symbol as coin_symbol, c.name as coin_name, c.icon, c.decimals
       FROM user_balances ub
       JOIN coins c ON ub.coin_id = c.id
       WHERE ub.user_id = ?
       ORDER BY ub.available DESC`,
      [req.userId]
    );
    res.json(success(balances));
  } catch (err) {
    console.error('Get balances error:', err);
    res.json(error('获取余额列表失败'));
  }
});

// 获取总资产估值
router.get('/total', auth, async (req, res) => {
  try {
    // 获取用户所有余额
    const balances = await db.query(
      `SELECT ub.*, c.symbol, c.is_base, tp.price as coin_price
       FROM user_balances ub
       JOIN coins c ON ub.coin_id = c.id
       LEFT JOIN trading_pairs tp ON tp.base_coin_id = c.id AND tp.quote_coin_id = 1
       WHERE ub.user_id = ?`,
      [req.userId]
    );

    let totalUsdt = 0;
    for (const balance of balances) {
      const total = parseFloat(balance.available) + parseFloat(balance.frozen);
      if (balance.symbol === 'USDT') {
        totalUsdt += total;
      } else if (balance.coin_price) {
        totalUsdt += total * parseFloat(balance.coin_price);
      }
    }

    res.json(success({
      total_usdt: totalUsdt.toFixed(2),
      btc_value: (totalUsdt / 65000).toFixed(6) // 按BTC价格估算
    }));
  } catch (err) {
    console.error('Get total asset error:', err);
    res.json(error('获取总资产失败'));
  }
});

// 申请提现
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { coinId, amount, address } = req.body;

    if (!coinId || !amount || !address) {
      return res.json(error('请填写完整信息'));
    }

    if (parseFloat(amount) <= 0) {
      return res.json(error('提现金额必须大于0'));
    }

    // 获取币种信息
    const coin = await db.getOne(
      'SELECT * FROM coins WHERE id = ? AND status = 1',
      [coinId]
    );

    if (!coin) {
      return res.json(error('币种不存在'));
    }

    // 验证最小提现额
    if (parseFloat(amount) < parseFloat(coin.min_withdraw)) {
      return res.json(error(`最小提现金额为 ${coin.min_withdraw} ${coin.symbol}`));
    }

    // 检查KYC认证
    const kycConfig = await db.getOne('SELECT value FROM system_config WHERE `key` = ?', ['kyc_required_for_withdraw']);
    if (kycConfig && kycConfig.value === '1') {
      const user = await db.getOne('SELECT kyc_status FROM users WHERE id = ?', [req.userId]);
      if (user.kyc_status !== 2) {
        return res.json(error('请先完成实名认证'));
      }
    }

    const fee = parseFloat(coin.withdraw_fee);
    const realAmount = parseFloat(amount) - fee;

    if (realAmount <= 0) {
      return res.json(error('扣除手续费后金额不足'));
    }

    // 检查余额
    const balance = await db.getOne(
      'SELECT available FROM user_balances WHERE user_id = ? AND coin_id = ?',
      [req.userId, coinId]
    );

    const available = balance ? parseFloat(balance.available) : 0;

    if (available < parseFloat(amount)) {
      return res.json(error('余额不足'));
    }

    // 生成提现单号
    const withdrawNo = generateWithdrawNo();

    // 创建提现记录
    await db.insert(
      `INSERT INTO withdrawals (withdraw_no, user_id, coin_id, amount, fee, real_amount, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [withdrawNo, req.userId, coinId, amount, fee, realAmount, address]
    );

    // 扣除余额
    await db.update(
      'UPDATE user_balances SET available = available - ? WHERE user_id = ? AND coin_id = ?',
      [amount, req.userId, coinId]
    );

    // 记录余额变动
    await db.insert(
      `INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, relation_type, remark)
       VALUES (?, ?, 2, ?, ?, ?, 'withdraw', ?)`,
      [req.userId, coinId, -amount, available, available - amount, '申请提现']
    );

    res.json(success({ withdrawNo }, '提现申请已提交，等待审核'));

  } catch (err) {
    console.error('Withdraw error:', err);
    res.json(error('提现申请失败'));
  }
});

// 获取提现记录
router.get('/withdrawals', auth, async (req, res) => {
  try {
    const { coinId } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE w.user_id = ?';
    const params = [req.userId];

    if (coinId) {
      whereClause += ' AND w.coin_id = ?';
      params.push(coinId);
    }

    const records = await db.query(
      `SELECT w.*, c.symbol as coin_symbol, c.name as coin_name
       FROM withdrawals w
       JOIN coins c ON w.coin_id = c.id
       ${whereClause}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM withdrawals w ${whereClause}`,
      params
    );

    // 状态映射
    const statusMap = {
      0: '待审核', 1: '审核通过', 2: '已驳回', 3: '已到账'
    };

    const formattedRecords = records.map(r => ({
      ...r,
      statusName: statusMap[r.status] || '未知'
    }));

    res.json(success({
      list: formattedRecords,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
      }
    }));
  } catch (err) {
    console.error('Get withdrawals error:', err);
    res.json(error('获取提现记录失败'));
  }
});

// 模拟充值 (测试用)
router.post('/deposit', auth, async (req, res) => {
  try {
    const { coinId, amount } = req.body;

    if (!coinId || !amount || parseFloat(amount) <= 0) {
      return res.json(error('参数错误'));
    }

    const coin = await db.getOne('SELECT * FROM coins WHERE id = ?', [coinId]);
    if (!coin) {
      return res.json(error('币种不存在'));
    }

    // 获取当前余额
    const balance = await db.getOne(
      'SELECT available FROM user_balances WHERE user_id = ? AND coin_id = ?',
      [req.userId, coinId]
    );

    const beforeBalance = balance ? parseFloat(balance.available) : 0;

    // 增加余额
    if (balance) {
      await db.update(
        'UPDATE user_balances SET available = available + ? WHERE user_id = ? AND coin_id = ?',
        [amount, req.userId, coinId]
      );
    } else {
      await db.insert(
        'INSERT INTO user_balances (user_id, coin_id, available) VALUES (?, ?, ?)',
        [req.userId, coinId, amount]
      );
    }

    // 记录余额变动
    await db.insert(
      `INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, remark)
       VALUES (?, ?, 1, ?, ?, ?, ?)`,
      [req.userId, coinId, amount, beforeBalance, beforeBalance + parseFloat(amount), '模拟充值']
    );

    res.json(success(null, `成功充值 ${amount} ${coin.symbol}`));

  } catch (err) {
    console.error('Deposit error:', err);
    res.json(error('充值失败'));
  }
});

module.exports = router;
