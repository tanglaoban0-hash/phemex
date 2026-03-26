const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error, parsePagination } = require('../utils/helpers');

// 获取用户信息
router.get('/info', auth, async (req, res) => {
  try {
    const user = await db.getOne(
      `SELECT u.id, u.email, u.username, u.phone, u.real_name, u.avatar, 
              u.status, u.kyc_status, u.invite_code, u.last_login_at, u.created_at
       FROM users u WHERE u.id = ?`,
      [req.userId]
    );

    if (!user) {
      return res.json(error('用户不存在'));
    }

    res.json(success(user));
  } catch (err) {
    console.error('Get user info error:', err);
    res.json(error('获取用户信息失败'));
  }
});

// 获取用户资产总览
router.get('/assets', auth, async (req, res) => {
  try {
    // 获取所有余额
    const balances = await db.query(
      `SELECT ub.id, c.symbol, c.name, c.icon, ub.available, ub.frozen,
              (ub.available + ub.frozen) as total
       FROM user_balances ub
       JOIN coins c ON ub.coin_id = c.id
       WHERE ub.user_id = ? AND c.status = 1
       ORDER BY ub.available + ub.frozen DESC`,
      [req.userId]
    );

    // 计算总资产 (按USDT计价)
    let totalUsdt = 0;
    for (const balance of balances) {
      if (balance.symbol === 'USDT') {
        totalUsdt += parseFloat(balance.total);
      } else {
        // 获取该币对USDT的价格
        const pair = await db.getOne(
          'SELECT price FROM trading_pairs WHERE symbol = ?',
          [`${balance.symbol}/USDT`]
        );
        if (pair) {
          totalUsdt += parseFloat(balance.total) * parseFloat(pair.price);
        }
      }
    }

    res.json(success({
      totalUsdt: parseFloat(totalUsdt.toFixed(2)),
      balances
    }));
  } catch (err) {
    console.error('Get assets error:', err);
    res.json(error('获取资产信息失败'));
  }
});

// 获取资产流水
router.get('/records', auth, async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req.query);
    const { coinId, type } = req.query;

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

    // 获取记录
    const records = await db.query(
      `SELECT br.*, c.symbol as coin_symbol, c.name as coin_name
       FROM balance_records br
       JOIN coins c ON br.coin_id = c.id
       ${whereClause}
       ORDER BY br.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    // 获取总数
    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM balance_records br ${whereClause}`,
      params
    );

    // 类型映射
    const typeMap = {
      1: '充值', 2: '提现', 3: '下单冻结', 4: '成交解冻',
      5: '手续费', 6: '系统赠送', 7: '邀请奖励'
    };

    const formattedRecords = records.map(r => ({
      ...r,
      typeName: typeMap[r.type] || '其他'
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
    console.error('Get records error:', err);
    res.json(error('获取流水记录失败'));
  }
});

// 提交实名认证
router.post('/kyc', auth, async (req, res) => {
  try {
    const { realName, idCard } = req.body;

    if (!realName || !idCard) {
      return res.json(error('请填写真实姓名和身份证号'));
    }

    // 验证身份证号格式 (简化验证)
    if (idCard.length !== 18) {
      return res.json(error('身份证号格式不正确'));
    }

    // 检查是否已认证
    const user = await db.getOne('SELECT kyc_status FROM users WHERE id = ?', [req.userId]);
    if (user.kyc_status === 2) {
      return res.json(error('您已通过实名认证'));
    }

    await db.update(
      'UPDATE users SET real_name = ?, id_card = ?, kyc_status = 1 WHERE id = ?',
      [realName, idCard, req.userId]
    );

    res.json(success(null, '实名认证申请已提交，请等待审核'));
  } catch (err) {
    console.error('KYC error:', err);
    res.json(error('提交认证失败'));
  }
});

// 更新用户信息
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar, phone } = req.body;
    const updates = [];
    const params = [];

    if (username) {
      // 检查用户名是否已存在
      const existing = await db.getOne('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.userId]);
      if (existing) {
        return res.json(error('该用户名已被使用'));
      }
      updates.push('username = ?');
      params.push(username);
    }

    if (avatar) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (phone) {
      updates.push('phone = ?');
      params.push(phone);
    }

    if (updates.length === 0) {
      return res.json(error('没有要更新的信息'));
    }

    params.push(req.userId);
    await db.update(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json(success(null, '更新成功'));
  } catch (err) {
    console.error('Update profile error:', err);
    res.json(error('更新失败'));
  }
});

// 修改密码
router.post('/password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.json(error('请填写完整信息'));
    }

    if (newPassword.length < 6) {
      return res.json(error('新密码长度至少6位'));
    }

    // 获取用户信息
    const user = await db.getOne('SELECT password FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.json(error('用户不存在'));
    }

    // 验证旧密码
    const bcrypt = require('bcryptjs');
    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.json(error('原密码错误'));
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.userId]
    );

    res.json(success(null, '密码修改成功'));
  } catch (err) {
    console.error('Update password error:', err);
    res.json(error('修改密码失败'));
  }
});

module.exports = router;
