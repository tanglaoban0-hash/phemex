const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/auth');
const db = require('../../config/db');
const { success, error, parsePagination } = require('../../utils/helpers');

// ========== 充值管理 ==========

// 获取充值列表
router.get('/deposits', adminAuth, async (req, res) => {
  try {
    const { status, userId, startDate, endDate } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status !== undefined) {
      whereClause += ' AND d.status = ?';
      params.push(status);
    }
    if (userId) {
      whereClause += ' AND d.user_id = ?';
      params.push(userId);
    }
    if (startDate) {
      whereClause += ' AND d.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND d.created_at <= ?';
      params.push(endDate);
    }

    const records = await db.query(
      `SELECT d.*, c.symbol as coin_symbol, c.name as coin_name,
              u.username, u.email, u.real_name,
              a.username as audit_username
       FROM deposits d
       JOIN coins c ON d.coin_id = c.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN admins a ON d.audit_by = a.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM deposits d ${whereClause}`,
      params
    );

    const statusMap = { 0: '待审核', 1: '已通过', 2: '已驳回' };

    res.json(success({
      list: records.map(r => ({ ...r, statusName: statusMap[r.status] || '未知' })),
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) }
    }));
  } catch (err) {
    console.error('Admin get deposits error:', err);
    res.json(error('获取充值列表失败'));
  }
});

// 获取充值详情
router.get('/deposits/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deposit = await db.getOne(
      `SELECT d.*, c.symbol as coin_symbol, c.name as coin_name,
              u.username, u.email, u.real_name,
              a.username as audit_username
       FROM deposits d
       JOIN coins c ON d.coin_id = c.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN admins a ON d.audit_by = a.id
       WHERE d.id = ?`,
      [id]
    );

    if (!deposit) {
      return res.json(error('充值记录不存在'));
    }

    const statusMap = { 0: '待审核', 1: '已通过', 2: '已驳回' };
    
    // 确保返回相对路径，让前端根据当前 host 拼接
    if (deposit.payment_proof && deposit.payment_proof.startsWith('http')) {
      try {
        const url = new URL(deposit.payment_proof);
        deposit.payment_proof = url.pathname;
      } catch (e) {}
    }

    res.json(success({
      ...deposit,
      statusName: statusMap[deposit.status] || '未知'
    }));
  } catch (err) {
    console.error('Get deposit detail error:', err);
    res.json(error('获取充值详情失败'));
  }
});

// 审核充值
router.post('/deposits/:id/audit', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (![1, 2].includes(parseInt(status))) {
      return res.json(error('审核状态错误'));
    }

    const deposit = await db.getOne('SELECT * FROM deposits WHERE id = ? AND status = 0', [id]);
    if (!deposit) {
      return res.json(error('充值记录不存在或已审核'));
    }

    // 更新充值状态
    await db.update(
      `UPDATE deposits SET status = ?, audit_by = ?, audit_remark = ? WHERE id = ?`,
      [status, req.adminId, remark || '', id]
    );

    // 如果通过审核，增加用户余额
    if (parseInt(status) === 1) {
      const balance = await db.getOne(
        'SELECT available FROM user_balances WHERE user_id = ? AND coin_id = ?',
        [deposit.user_id, deposit.coin_id]
      );
      const beforeBalance = balance ? parseFloat(balance.available) : 0;
      const amount = parseFloat(deposit.amount);

      if (balance) {
        await db.update(
          'UPDATE user_balances SET available = available + ?, total_recharge = total_recharge + ? WHERE user_id = ? AND coin_id = ?',
          [amount, amount, deposit.user_id, deposit.coin_id]
        );
      } else {
        await db.insert(
          'INSERT INTO user_balances (user_id, coin_id, available, total_recharge) VALUES (?, ?, ?, ?)',
          [deposit.user_id, deposit.coin_id, amount, amount]
        );
      }

      // 记录余额变动
      await db.insert(
        `INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, relation_id, relation_type, remark)
         VALUES (?, ?, 1, ?, ?, ?, ?, 'deposit', ?)`,
        [deposit.user_id, deposit.coin_id, amount, beforeBalance, beforeBalance + amount, deposit.id, '充值到账']
      );
    }

    res.json(success(null, parseInt(status) === 1 ? '充值已审核通过' : '充值已驳回'));
  } catch (err) {
    console.error('Audit deposit error:', err);
    res.json(error('审核失败'));
  }
});

// ========== 提现管理 ==========

// 获取提现列表
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const { status, userId, startDate, endDate } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status !== undefined) {
      whereClause += ' AND w.status = ?';
      params.push(status);
    }
    if (userId) {
      whereClause += ' AND w.user_id = ?';
      params.push(userId);
    }
    if (startDate) {
      whereClause += ' AND w.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND w.created_at <= ?';
      params.push(endDate);
    }

    const records = await db.query(
      `SELECT w.*, c.symbol as coin_symbol, c.name as coin_name,
              u.username, u.email, u.real_name,
              a.username as audit_username
       FROM withdrawals w
       JOIN coins c ON w.coin_id = c.id
       JOIN users u ON w.user_id = u.id
       LEFT JOIN admins a ON w.audit_by = a.id
       ${whereClause}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM withdrawals w ${whereClause}`,
      params
    );

    const statusMap = { 0: '待审核', 1: '审核通过', 2: '已驳回', 3: '已到账' };

    res.json(success({
      list: records.map(r => ({ ...r, statusName: statusMap[r.status] || '未知' })),
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) }
    }));
  } catch (err) {
    console.error('Admin get withdrawals error:', err);
    res.json(error('获取提现列表失败'));
  }
});

// 审核提现
router.post('/withdrawals/:id/audit', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (![1, 2].includes(parseInt(status))) {
      return res.json(error('审核状态错误'));
    }

    const withdrawal = await db.getOne('SELECT * FROM withdrawals WHERE id = ? AND status = 0', [id]);
    if (!withdrawal) {
      return res.json(error('提现记录不存在或已审核'));
    }

    const userId = withdrawal.user_id;
    const coinId = withdrawal.coin_id;
    const amount = parseFloat(withdrawal.amount);

    // 更新提现状态
    await db.update(
      `UPDATE withdrawals SET status = ?, audit_by = ?, audit_remark = ? WHERE id = ?`,
      [status, req.adminId, remark || '', id]
    );

    if (parseInt(status) === 1) {
      // 审核通过 - 解冻并扣除，标记为已到账
      await db.update(
        'UPDATE withdrawals SET status = 3 WHERE id = ?',
        [id]
      );

      // 扣除冻结金额
      await db.update(
        'UPDATE user_balances SET frozen = frozen - ?, total_withdraw = total_withdraw + ? WHERE user_id = ? AND coin_id = ?',
        [amount, amount, userId, coinId]
      );

      // 记录余额变动
      const balance = await db.getOne(
        'SELECT available, frozen FROM user_balances WHERE user_id = ? AND coin_id = ?',
        [userId, coinId]
      );

      await db.insert(
        `INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, relation_id, relation_type, remark)
         VALUES (?, ?, 2, ?, ?, ?, ?, 'withdraw', ?)`,
        [userId, coinId, -amount, parseFloat(balance.available) + amount, parseFloat(balance.available), withdrawal.id, '提现成功']
      );
    } else {
      // 驳回 - 解冻返还
      await db.update(
        'UPDATE user_balances SET available = available + ?, frozen = frozen - ? WHERE user_id = ? AND coin_id = ?',
        [amount, amount, userId, coinId]
      );

      const balance = await db.getOne(
        'SELECT available FROM user_balances WHERE user_id = ? AND coin_id = ?',
        [userId, coinId]
      );

      await db.insert(
        `INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, relation_id, relation_type, remark)
         VALUES (?, ?, 4, ?, ?, ?, ?, 'withdraw_reject', ?)`,
        [userId, coinId, amount, parseFloat(balance.available) - amount, parseFloat(balance.available), withdrawal.id, '提现驳回-解冻资金']
      );
    }

    res.json(success(null, parseInt(status) === 1 ? '提现已审核通过' : '提现已驳回'));
  } catch (err) {
    console.error('Audit withdrawal error:', err);
    res.json(error('审核失败'));
  }
});

// ========== 支付方式配置管理 ==========

// 获取支付方式列表
router.get('/payment-configs', adminAuth, async (req, res) => {
  try {
    const configs = await db.query(
      'SELECT * FROM payment_configs ORDER BY sort_order ASC'
    );
    res.json(success(configs));
  } catch (err) {
    console.error('Get payment configs error:', err);
    res.json(error('获取支付方式配置失败'));
  }
});

// 添加支付方式
router.post('/payment-configs', adminAuth, async (req, res) => {
  try {
    // 兼容前端字段名（下划线或驼峰）
    const method = req.body.method;
    const methodType = req.body.method_type || req.body.methodType;
    const name = req.body.name;
    const address = req.body.address;
    const bankName = req.body.bank_name || req.body.bankName;
    const accountName = req.body.account_name || req.body.accountName;
    const network = req.body.network;
    const minAmount = req.body.min_amount || req.body.minAmount;
    const maxAmount = req.body.max_amount || req.body.maxAmount;
    const feeRate = req.body.fee_rate || req.body.feeRate;
    const feeFixed = req.body.fee_fixed || req.body.feeFixed;
    const qrCode = req.body.qr_code || req.body.qrCode;
    const sortOrder = req.body.sort_order || req.body.sortOrder;

    if (!method || !methodType || !name) {
      return res.json(error('请填写完整信息'));
    }

    const id = await db.insert(
      `INSERT INTO payment_configs (method, method_type, name, address, bank_name, account_name, network,
        min_amount, max_amount, fee_rate, fee_fixed, qr_code, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [method, methodType, name, address || null, bankName || null, accountName || null, network || null,
       minAmount || 0, maxAmount || 0, feeRate || 0, feeFixed || 0, qrCode || null, sortOrder || 0]
    );

    res.json(success({ id }, '添加成功'));
  } catch (err) {
    console.error('Add payment config error:', err);
    res.json(error('添加失败'));
  }
});

// 更新支付方式
router.put('/payment-configs/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('更新支付方式 ID:', id);
    console.log('请求数据:', req.body);
    
    // 兼容前端字段名（下划线或驼峰）
    const name = req.body.name;
    const address = req.body.address;
    const bankName = req.body.bank_name || req.body.bankName;
    const accountName = req.body.account_name || req.body.accountName;
    const network = req.body.network;
    const minAmount = req.body.min_amount || req.body.minAmount;
    const maxAmount = req.body.max_amount || req.body.maxAmount;
    const status = req.body.status;

    // 检查记录是否存在
    const existing = await db.getOne('SELECT * FROM payment_configs WHERE id = ?', [id]);
    if (!existing) {
      return res.json(error('支付方式不存在'));
    }

    const result = await db.update(
      `UPDATE payment_configs SET 
        name = ?, address = ?, bank_name = ?, account_name = ?, network = ?,
        min_amount = ?, max_amount = ?, status = ?
       WHERE id = ?`,
      [
        name !== undefined ? name : existing.name,
        address !== undefined ? address : existing.address,
        bankName !== undefined ? bankName : existing.bank_name,
        accountName !== undefined ? accountName : existing.account_name,
        network !== undefined ? network : existing.network,
        minAmount !== undefined ? minAmount : existing.min_amount,
        maxAmount !== undefined ? maxAmount : existing.max_amount,
        status !== undefined ? status : existing.status,
        id
      ]
    );
    
    console.log('更新结果:', result);
    res.json(success(null, '更新成功'));
  } catch (err) {
    console.error('Update payment config error:', err);
    res.json(error('更新失败: ' + err.message));
  }
});

// 删除支付方式
router.delete('/payment-configs/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM payment_configs WHERE id = ?', [id]);
    res.json(success(null, '删除成功'));
  } catch (err) {
    console.error('Delete payment config error:', err);
    res.json(error('删除失败'));
  }
});

// ========== 统计 ==========

// 资金统计
router.get('/statistics', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 充值统计
    const depositStats = await db.getOne(
      `SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 1 THEN amount ELSE 0 END) as total_amount
       FROM deposits ${dateFilter}`,
      params
    );

    // 提现统计
    const withdrawStats = await db.getOne(
      `SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 3 THEN real_amount ELSE 0 END) as total_amount
       FROM withdrawals ${dateFilter}`,
      params
    );

    // 各币种统计
    const coinStats = await db.query(
      `SELECT 
        c.symbol,
        SUM(CASE WHEN d.status = 1 THEN d.amount ELSE 0 END) as deposit_amount,
        SUM(CASE WHEN w.status = 3 THEN w.amount ELSE 0 END) as withdraw_amount
       FROM coins c
       LEFT JOIN deposits d ON c.id = d.coin_id ${dateFilter ? dateFilter.replace('WHERE', 'AND') : ''}
       LEFT JOIN withdrawals w ON c.id = w.coin_id ${dateFilter ? dateFilter.replace('WHERE', 'AND') : ''}
       GROUP BY c.id`
    );

    res.json(success({
      deposit: depositStats,
      withdraw: withdrawStats,
      coins: coinStats
    }));
  } catch (err) {
    console.error('Get statistics error:', err);
    res.json(error('获取统计失败'));
  }
});

module.exports = router;
