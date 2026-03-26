const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error } = require('../utils/helpers');

// 获取用户KYC状态
router.get('/status', auth, async (req, res) => {
  try {
    const kyc = await db.getOne(
      'SELECT * FROM kyc_verifications WHERE user_id = ?',
      [req.userId]
    );

    // 获取系统配置的提现限额
    const l1Limit = await db.getOne("SELECT value FROM system_config WHERE `key` = 'kyc_l1_daily_limit'");
    const l2Limit = await db.getOne("SELECT value FROM system_config WHERE `key` = 'kyc_l2_daily_limit'");

    const statusMap = {
      0: '未认证',
      1: '待审核',
      2: '已认证',
      3: '已拒绝'
    };

    const levelMap = {
      0: '未认证',
      1: 'L1基础认证',
      2: 'L2高级认证'
    };

    // 返回相对路径，前端根据当前host拼接完整URL
    // 如果存储的是完整URL，提取路径部分
    if (kyc) {
      if (kyc.id_card_front && kyc.id_card_front.startsWith('http')) {
        try {
          const url = new URL(kyc.id_card_front);
          kyc.id_card_front = url.pathname;
        } catch (e) {}
      }
      if (kyc.id_card_back && kyc.id_card_back.startsWith('http')) {
        try {
          const url = new URL(kyc.id_card_back);
          kyc.id_card_back = url.pathname;
        } catch (e) {}
      }
      if (kyc.id_card_hand && kyc.id_card_hand.startsWith('http')) {
        try {
          const url = new URL(kyc.id_card_hand);
          kyc.id_card_hand = url.pathname;
        } catch (e) {}
      }
    }

    res.json(success({
      kyc: kyc ? {
        ...kyc,
        statusName: statusMap[kyc.status] || '未知',
        levelName: levelMap[kyc.level] || '未知'
      } : {
        user_id: req.userId,
        level: 0,
        status: 0,
        statusName: '未认证',
        levelName: '未认证'
      },
      limits: {
        l1: parseFloat(l1Limit?.value || 10000),
        l2: parseFloat(l2Limit?.value || 100000)
      }
    }));
  } catch (err) {
    console.error('Get KYC status error:', err);
    res.json(error('获取认证状态失败'));
  }
});

// 提交L1基础认证（姓名+身份证号）
router.post('/l1', auth, async (req, res) => {
  try {
    const { realName, idCard, idType = 'id_card', country = 'CN' } = req.body;

    if (!realName || !idCard) {
      return res.json(error('请填写完整信息'));
    }

    // 检查是否已提交过
    const existing = await db.getOne(
      'SELECT * FROM kyc_verifications WHERE user_id = ?',
      [req.userId]
    );

    if (existing && existing.status === 1) {
      return res.json(error('您已有待审核的认证申请'));
    }

    if (existing && existing.status === 2) {
      return res.json(error('您已完成认证'));
    }

    // 获取L1限额
    const limitConfig = await db.getOne("SELECT value FROM system_config WHERE `key` = 'kyc_l1_daily_limit'");
    const dailyLimit = parseFloat(limitConfig?.value || 10000);

    if (existing) {
      // 更新
      await db.update(
        `UPDATE kyc_verifications SET
          level = 1, status = 1, real_name = ?, id_card = ?, id_type = ?, country = ?,
          daily_withdraw_limit = ?, submit_count = submit_count + 1, updated_at = datetime('now')
         WHERE user_id = ?`,
        [realName, idCard, idType, country, dailyLimit, req.userId]
      );
    } else {
      // 新建
      await db.insert(
        `INSERT INTO kyc_verifications 
          (user_id, level, status, real_name, id_card, id_type, country, daily_withdraw_limit, submit_count)
         VALUES (?, 1, 1, ?, ?, ?, ?, ?, 1)`,
        [req.userId, realName, idCard, idType, country, dailyLimit]
      );
    }

    // 更新用户表的KYC状态
    await db.update(
      'UPDATE users SET kyc_status = 1, real_name = ?, id_card = ? WHERE id = ?',
      [realName, idCard, req.userId]
    );

    res.json(success(null, 'L1认证申请已提交，等待审核'));
  } catch (err) {
    console.error('Submit L1 KYC error:', err);
    res.json(error('提交失败'));
  }
});

// 提交L2高级认证（上传证件照片）
router.post('/l2', auth, async (req, res) => {
  try {
    const { idCardFront, idCardBack, idCardHand } = req.body;

    // 检查L1是否已通过
    const kyc = await db.getOne(
      'SELECT * FROM kyc_verifications WHERE user_id = ?',
      [req.userId]
    );

    if (!kyc || kyc.level < 1) {
      return res.json(error('请先完成L1基础认证'));
    }

    if (kyc.status === 1) {
      return res.json(error('您有待审核的申请，请等待审核完成'));
    }

    if (kyc.status === 2 && kyc.level === 2) {
      return res.json(error('您已完成L2高级认证'));
    }

    // 获取L2限额
    const limitConfig = await db.getOne("SELECT value FROM system_config WHERE `key` = 'kyc_l2_daily_limit'");
    const dailyLimit = parseFloat(limitConfig?.value || 100000);

    await db.update(
      `UPDATE kyc_verifications SET
        level = 2, status = 1,
        id_card_front = ?, id_card_back = ?, id_card_hand = ?,
        daily_withdraw_limit = ?, submit_count = submit_count + 1, updated_at = datetime('now')
       WHERE user_id = ?`,
      [idCardFront || null, idCardBack || null, idCardHand || null, dailyLimit, req.userId]
    );

    res.json(success(null, 'L2认证申请已提交，等待审核'));
  } catch (err) {
    console.error('Submit L2 KYC error:', err);
    res.json(error('提交失败'));
  }
});

// 检查今日提现额度
router.get('/withdraw-limit', auth, async (req, res) => {
  try {
    const { coinId } = req.query;

    // 获取用户KYC信息
    const kyc = await db.getOne(
      'SELECT * FROM kyc_verifications WHERE user_id = ? AND status = 2',
      [req.userId]
    );

    const dailyLimit = kyc ? parseFloat(kyc.daily_withdraw_limit) : 0;
    const level = kyc ? kyc.level : 0;

    // 计算今日已提现
    const today = new Date().toISOString().split('T')[0];
    const todayWithdraw = await db.getOne(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM withdrawals 
       WHERE user_id = ? AND status IN (1, 3) AND DATE(created_at) = ?`,
      [req.userId, today]
    );

    const used = parseFloat(todayWithdraw?.total || 0);
    const remaining = Math.max(0, dailyLimit - used);

    res.json(success({
      level,
      levelName: level === 0 ? '未认证' : level === 1 ? 'L1基础' : 'L2高级',
      dailyLimit,
      used,
      remaining,
      canWithdraw: remaining > 0
    }));
  } catch (err) {
    console.error('Get withdraw limit error:', err);
    res.json(error('获取额度失败'));
  }
});

module.exports = router;
