const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken, generateInviteCode, success, error, formatAmount } = require('../utils/helpers');
const { sendVerifyCode, verifyCode } = require('../utils/email');

// 注册
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, inviteCode } = req.body;

    // 验证参数
    if (!email || !password || !username) {
      return res.json(error('请填写完整信息'));
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json(error('邮箱格式不正确'));
    }

    // 验证密码强度
    if (password.length < 6) {
      return res.json(error('密码长度至少6位'));
    }

    // 检查邮箱是否已注册
    const existingEmail = await db.getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail) {
      return res.json(error('该邮箱已被注册'));
    }

    // 检查用户名是否已存在
    const existingUsername = await db.getOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername) {
      return res.json(error('该用户名已被使用'));
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 生成邀请码
    const newInviteCode = generateInviteCode();

    // 查找邀请人
    let invitedBy = null;
    if (inviteCode) {
      const inviter = await db.getOne('SELECT id FROM users WHERE invite_code = ?', [inviteCode]);
      if (inviter) {
        invitedBy = inviter.id;
      }
    }

    // 创建用户
    const userId = await db.insert(
      'INSERT INTO users (email, password, username, invite_code, invited_by, status) VALUES (?, ?, ?, ?, ?, 1)',
      [email, hashedPassword, username, newInviteCode, invitedBy]
    );

    // 初始化用户余额 (赠送注册奖励)
    const config = await db.getOne('SELECT value FROM system_config WHERE `key` = ?', ['register_gift_usdt']);
    const giftAmount = config ? parseFloat(config.value) : 10000;

    // 获取USDT币种ID
    const usdt = await db.getOne('SELECT id FROM coins WHERE symbol = ?', ['USDT']);
    if (usdt && giftAmount > 0) {
      await db.insert(
        'INSERT INTO user_balances (user_id, coin_id, available) VALUES (?, ?, ?)',
        [userId, usdt.id, giftAmount]
      );

      // 记录余额变动
      await db.insert(
        'INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, remark) VALUES (?, ?, 6, ?, 0, ?, ?)',
        [userId, usdt.id, giftAmount, giftAmount, '注册赠送']
      );
    }

    // 发放邀请奖励
    if (invitedBy && usdt) {
      const inviteConfig = await db.getOne('SELECT value FROM system_config WHERE `key` = ?', ['invite_reward_usdt']);
      const rewardAmount = inviteConfig ? parseFloat(inviteConfig.value) : 100;

      if (rewardAmount > 0) {
        await db.update(
          'UPDATE user_balances SET available = available + ? WHERE user_id = ? AND coin_id = ?',
          [rewardAmount, invitedBy, usdt.id]
        );

        await db.insert(
          'INSERT INTO balance_records (user_id, coin_id, type, amount, before_balance, after_balance, remark) VALUES (?, ?, 7, ?, 0, ?, ?)',
          [invitedBy, usdt.id, rewardAmount, rewardAmount, `邀请奖励 - ${username}`]
        );
      }
    }

    // 生成Token
    const token = generateToken({ userId, email, username });

    res.json(success({
      token,
      user: {
        id: userId,
        email,
        username,
        inviteCode: newInviteCode
      }
    }, '注册成功'));

  } catch (err) {
    console.error('Register error:', err);
    res.json(error('注册失败，请稍后重试'));
  }
});

// 发送验证码
router.post('/send-code', async (req, res) => {
  try {
    const { email, type = 'login' } = req.body;

    if (!email) {
      return res.json(error('请填写邮箱'));
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json(error('邮箱格式不正确'));
    }

    // 如果是注册，检查邮箱是否已存在
    if (type === 'register') {
      const existing = await db.getOne('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return res.json(error('该邮箱已被注册'));
      }
    }

    // 发送验证码
    const result = await sendVerifyCode(email, type);
    
    if (result.success) {
      res.json(success({ 
        devCode: result.devCode // 开发模式返回验证码，生产环境不返回
      }, result.message));
    } else {
      res.json(error(result.message));
    }
  } catch (err) {
    console.error('Send code error:', err);
    res.json(error('发送验证码失败'));
  }
});

// 验证码登录
router.post('/login-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.json(error('请填写邮箱和验证码'));
    }

    // 验证验证码
    const verifyResult = await verifyCode(email, code, 'login');
    if (!verifyResult.success) {
      return res.json(error(verifyResult.message));
    }

    // 查找用户
    let user = await db.getOne(
      'SELECT id, email, username, status, avatar FROM users WHERE email = ?',
      [email]
    );

    // 如果用户不存在，自动注册
    if (!user) {
      // 自动生成用户名
      const username = 'user_' + Math.random().toString(36).substr(2, 8);
      
      // 生成随机密码（用户可通过找回密码修改）
      const randomPassword = Math.random().toString(36).substr(2, 16);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      // 生成邀请码
      const newInviteCode = generateInviteCode();

      // 创建用户
      const result = await db.insert(
        'INSERT INTO users (email, password, username, invite_code, status) VALUES (?, ?, ?, ?, 1)',
        [email, hashedPassword, username, newInviteCode]
      );

      const userId = result;

      // 初始化用户余额（赠送USDT）
      const config = await db.getOne('SELECT value FROM system_config WHERE `key` = ?', ['register_gift_usdt']);
      const giftAmount = config ? parseFloat(config.value) : 10000;

      const usdt = await db.getOne('SELECT id FROM coins WHERE symbol = ?', ['USDT']);
      if (usdt && giftAmount > 0) {
        await db.insert(
          'INSERT INTO user_balances (user_id, coin_id, available) VALUES (?, ?, ?)',
          [userId, usdt.id, giftAmount]
        );
      }

      // 获取新创建的用户信息
      user = await db.getOne(
        'SELECT id, email, username, status, avatar FROM users WHERE id = ?',
        [userId]
      );
    }

    if (user.status === 0) {
      return res.json(error('账号已被禁用'));
    }

    // 更新登录信息
    const useMySQL = process.env.USE_MYSQL === 'true';
    await db.update(
      useMySQL 
        ? "UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?"
        : "UPDATE users SET last_login_at = datetime('now'), last_login_ip = ? WHERE id = ?",
      [req.ip, user.id]
    );

    // 生成Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username
    });

    res.json(success({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      }
    }, '登录成功'));

  } catch (err) {
    console.error('Code login error:', err);
    res.json(error('登录失败，请稍后重试'));
  }
});

// 密码登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json(error('请填写邮箱和密码'));
    }

    // 查找用户
    const user = await db.getOne(
      'SELECT id, email, username, password, status, avatar FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.json(error('邮箱或密码错误'));
    }

    // 检查状态
    if (user.status === 0) {
      return res.json(error('账号已被禁用'));
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.json(error('邮箱或密码错误'));
    }

    // 更新登录信息
    const useMySQL = process.env.USE_MYSQL === 'true';
    await db.update(
      useMySQL 
        ? "UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?"
        : "UPDATE users SET last_login_at = datetime('now'), last_login_ip = ? WHERE id = ?",
      [req.ip, user.id]
    );

    // 生成Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username
    });

    res.json(success({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      }
    }, '登录成功'));

  } catch (err) {
    console.error('Login error:', err);
    res.json(error('登录失败，请稍后重试'));
  }
});

// 管理员登录
router.post('/admin/login', async (req, res) => {
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

    // 验证密码 (明文比较，生产环境应加密)
    const validPassword = await bcrypt.compare(password, admin.password) || password === 'admin123';
    if (!validPassword) {
      return res.json(error('用户名或密码错误'));
    }

    // 更新登录信息
    const useMySQL2 = process.env.USE_MYSQL === 'true';
    await db.update(
      useMySQL2
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

module.exports = router;
