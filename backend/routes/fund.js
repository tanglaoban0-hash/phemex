const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error, generateOrderNo, parsePagination } = require('../utils/helpers');

// ========== 用户端接口 ==========

// 获取启用的支付方式
router.get('/methods', auth, async (req, res) => {
  try {
    const methods = await db.query(
      `SELECT id, method, method_type, name, network, min_amount, max_amount, 
              address, fee_rate, fee_fixed, qr_code, bank_name, account_name
       FROM payment_configs 
       WHERE status = 1 
       ORDER BY sort_order ASC`
    );
    res.json(success(methods));
  } catch (err) {
    console.error('Get payment methods error:', err);
    res.json(error('获取支付方式失败'));
  }
});

// 提交充值申请
router.post('/deposit', auth, async (req, res) => {
  try {
    const { coinId, amount, paymentMethod, paymentProof, fromAddress } = req.body;

    if (!coinId || !amount || !paymentMethod) {
      return res.json(error('请填写完整信息'));
    }

    if (parseFloat(amount) <= 0) {
      return res.json(error('充值金额必须大于0'));
    }

    // 验证币种
    const coin = await db.getOne('SELECT * FROM coins WHERE id = ? AND status = 1', [coinId]);
    if (!coin) {
      return res.json(error('币种不存在'));
    }

    // 获取支付方式配置
    const paymentConfig = await db.getOne(
      'SELECT * FROM payment_configs WHERE method = ? AND status = 1 LIMIT 1',
      [paymentMethod]
    );

    if (!paymentConfig) {
      return res.json(error('支付方式不可用'));
    }

    // 验证金额范围
    if (parseFloat(amount) < parseFloat(paymentConfig.min_amount)) {
      return res.json(error(`最小充值金额为 ${paymentConfig.min_amount}`));
    }
    if (paymentConfig.max_amount > 0 && parseFloat(amount) > parseFloat(paymentConfig.max_amount)) {
      return res.json(error(`最大充值金额为 ${paymentConfig.max_amount}`));
    }

    // 生成充值单号
    const depositNo = 'D' + generateOrderNo();

    // 创建充值记录
    await db.insert(
      `INSERT INTO deposits (deposit_no, user_id, coin_id, amount, payment_method, payment_proof, from_address, to_address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [depositNo, req.userId, coinId, amount, paymentMethod, paymentProof || null, fromAddress || null, paymentConfig.address]
    );

    res.json(success({ depositNo }, '充值申请已提交，等待审核'));

  } catch (err) {
    console.error('Deposit apply error:', err);
    res.json(error('充值申请失败'));
  }
});

// 获取充值记录
router.get('/deposits', auth, async (req, res) => {
  try {
    const { coinId, status } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE d.user_id = ?';
    const params = [req.userId];

    if (coinId) {
      whereClause += ' AND d.coin_id = ?';
      params.push(coinId);
    }
    if (status !== undefined) {
      whereClause += ' AND d.status = ?';
      params.push(status);
    }

    const records = await db.query(
      `SELECT d.*, c.symbol as coin_symbol, c.name as coin_name, c.icon
       FROM deposits d
       JOIN coins c ON d.coin_id = c.id
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
    console.error('Get deposits error:', err);
    res.json(error('获取充值记录失败'));
  }
});

// 提交提现申请
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { coinId, amount, toAddress, fundPassword } = req.body;

    if (!coinId || !amount || !toAddress) {
      return res.json(error('请填写完整信息'));
    }

    if (parseFloat(amount) <= 0) {
      return res.json(error('提现金额必须大于0'));
    }

    // 验证资金密码
    const user = await db.getOne('SELECT fund_password FROM users WHERE id = ?', [req.userId]);
    if (!user.fund_password) {
      return res.json(error('请先设置资金密码'));
    }
    if (!fundPassword) {
      return res.json(error('请输入资金密码'));
    }
    const validFundPassword = await bcrypt.compare(fundPassword, user.fund_password);
    if (!validFundPassword) {
      return res.json(error('资金密码错误'));
    }

    // 获取币种信息
    const coin = await db.getOne('SELECT * FROM coins WHERE id = ? AND status = 1', [coinId]);
    if (!coin) {
      return res.json(error('币种不存在'));
    }

    // 验证最小提现额
    if (parseFloat(amount) < parseFloat(coin.min_withdraw)) {
      return res.json(error(`最小提现金额为 ${coin.min_withdraw} ${coin.symbol}`));
    }

    // 检查KYC认证
    const kycConfig = await db.getOne('SELECT value FROM system_config WHERE `key` = ?', ['kyc_required_for_withdraw']);
    if (kycConfig?.value === '1') {
      const kyc = await db.getOne(
        'SELECT * FROM kyc_verifications WHERE user_id = ? AND status = 2',
        [req.userId]
      );
      if (!kyc) {
        return res.json(error('请先完成实名认证(L1或L2)'));
      }

      // 检查每日提现限额
      const today = new Date().toISOString().split('T')[0];
      const todayWithdraw = await db.getOne(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM withdrawals 
         WHERE user_id = ? AND status IN (0, 1, 3) AND DATE(created_at) = ?`,
        [req.userId, today]
      );
      
      const todayAmount = parseFloat(todayWithdraw?.total || 0);
      const dailyLimit = parseFloat(kyc.daily_withdraw_limit);
      
      if (todayAmount + parseFloat(amount) > dailyLimit) {
        return res.json(error(`今日提现额度已用完或超出限制，剩余额度: ${(dailyLimit - todayAmount).toFixed(2)} USDT`));
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
    const withdrawNo = 'W' + generateOrderNo();

    // 创建提现记录
    await db.insert(
      `INSERT INTO withdrawals (withdraw_no, user_id, coin_id, amount, fee, real_amount, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [withdrawNo, req.userId, coinId, amount, fee, realAmount, toAddress]
    );

    // 冻结余额
    await db.update(
      'UPDATE user_balances SET available = available - ?, frozen = frozen + ? WHERE user_id = ? AND coin_id = ?',
      [amount, amount, req.userId, coinId]
    );

    // 记录余额变动
    await db.insert(
      `INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, relation_type, remark)
       VALUES (?, ?, 3, ?, ?, ?, 'withdraw_apply', ?)`,
      [req.userId, coinId, -amount, available, available - amount, '申请提现-冻结资金']
    );

    res.json(success({ withdrawNo }, '提现申请已提交，等待审核'));

  } catch (err) {
    console.error('Withdraw apply error:', err);
    res.json(error('提现申请失败'));
  }
});

// 获取提现记录
router.get('/withdrawals', auth, async (req, res) => {
  try {
    const { coinId, status } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE w.user_id = ?';
    const params = [req.userId];

    if (coinId) {
      whereClause += ' AND w.coin_id = ?';
      params.push(coinId);
    }
    if (status !== undefined) {
      whereClause += ' AND w.status = ?';
      params.push(status);
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

    const statusMap = { 0: '待审核', 1: '审核通过', 2: '已驳回', 3: '已到账' };

    res.json(success({
      list: records.map(r => ({ ...r, statusName: statusMap[r.status] || '未知' })),
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) }
    }));
  } catch (err) {
    console.error('Get withdrawals error:', err);
    res.json(error('获取提现记录失败'));
  }
});

// 获取资金记录
router.get('/records', auth, async (req, res) => {
  try {
    const { coinId, type } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE br.user_id = ?';
    const params = [req.userId];

    if (coinId) {
      whereClause += ' AND br.coin_id = ?';
      params.push(coinId);
    }
    if (type) {
      whereClause += ' AND br.type = ?';
      params.push(type);
    }

    const records = await db.query(
      `SELECT br.*, c.symbol as coin_symbol, c.name as coin_name
       FROM balance_records br
       JOIN coins c ON br.coin_id = c.id
       ${whereClause}
       ORDER BY br.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM balance_records br ${whereClause}`,
      params
    );

    const typeMap = {
      1: '充值', 2: '提现', 3: '冻结', 4: '解冻', 
      5: '手续费', 6: '系统赠送', 7: '邀请奖励', 8: '成交'
    };

    res.json(success({
      list: records.map(r => ({ ...r, typeName: typeMap[r.type] || '其他' })),
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) }
    }));
  } catch (err) {
    console.error('Get records error:', err);
    res.json(error('获取资金记录失败'));
  }
});

module.exports = router;
