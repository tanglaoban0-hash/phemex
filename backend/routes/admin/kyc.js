const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/auth');
const db = require('../../config/db');
const { success, error, parsePagination } = require('../../utils/helpers');

// 获取KYC申请列表
router.get('/list', adminAuth, async (req, res) => {
  try {
    const { status, level, keyword } = req.query;
    const { page, pageSize, offset } = parsePagination(req.query);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status !== undefined) {
      whereClause += ' AND k.status = ?';
      params.push(status);
    }
    if (level !== undefined) {
      whereClause += ' AND k.level = ?';
      params.push(level);
    }
    if (keyword) {
      whereClause += ' AND (u.email LIKE ? OR u.username LIKE ? OR k.real_name LIKE ? OR k.id_card LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const list = await db.query(
      `SELECT k.*, u.email, u.username, u.phone
       FROM kyc_verifications k
       JOIN users u ON k.user_id = u.id
       ${whereClause}
       ORDER BY k.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(pageSize), String(offset)]
    );

    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM kyc_verifications k 
       JOIN users u ON k.user_id = u.id ${whereClause}`,
      params
    );

    const statusMap = { 0: '未提交', 1: '待审核', 2: '已通过', 3: '已拒绝' };
    const levelMap = { 0: '未认证', 1: 'L1基础', 2: 'L2高级' };

    res.json(success({
      list: list.map(item => ({
        ...item,
        statusName: statusMap[item.status] || '未知',
        levelName: levelMap[item.level] || '未知'
      })),
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) }
    }));
  } catch (err) {
    console.error('Get KYC list error:', err);
    res.json(error('获取列表失败'));
  }
});

// 获取KYC详情
router.get('/detail/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const kyc = await db.getOne(
      `SELECT k.*, u.email, u.username, u.phone, u.created_at as user_created_at
       FROM kyc_verifications k
       JOIN users u ON k.user_id = u.id
       WHERE k.id = ?`,
      [id]
    );

    if (!kyc) {
      return res.json(error('记录不存在'));
    }

    const statusMap = { 0: '未提交', 1: '待审核', 2: '已通过', 3: '已拒绝' };
    const levelMap = { 0: '未认证', 1: 'L1基础', 2: 'L2高级' };

    // 确保返回相对路径，让前端根据当前 host 拼接
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

    res.json(success({
      ...kyc,
      statusName: statusMap[kyc.status] || '未知',
      levelName: levelMap[kyc.level] || '未知'
    }));
  } catch (err) {
    console.error('Get KYC detail error:', err);
    res.json(error('获取详情失败'));
  }
});

// 审核KYC
router.post('/audit/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;

    if (![2, 3].includes(parseInt(status))) {
      return res.json(error('审核状态错误'));
    }

    const kyc = await db.getOne(
      'SELECT * FROM kyc_verifications WHERE id = ? AND status = 1',
      [id]
    );

    if (!kyc) {
      return res.json(error('申请不存在或已审核'));
    }

    const now = new Date();
    
    if (parseInt(status) === 2) {
      // 通过
      await db.update(
        `UPDATE kyc_verifications SET
          status = 2, verified_at = ?, reject_reason = NULL, updated_at = datetime('now')
         WHERE id = ?`,
        [now, id]
      );

      // 更新用户表KYC状态
      await db.update(
        'UPDATE users SET kyc_status = 2 WHERE id = ?',
        [kyc.user_id]
      );
    } else {
      // 拒绝
      await db.update(
        `UPDATE kyc_verifications SET
          status = 3, reject_reason = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [rejectReason || '认证信息不符合要求', id]
      );
      
      // 更新用户表KYC状态
      await db.update(
        'UPDATE users SET kyc_status = 3 WHERE id = ?',
        [kyc.user_id]
      );
    }

    res.json(success(null, parseInt(status) === 2 ? '审核通过' : '已拒绝'));
  } catch (err) {
    console.error('Audit KYC error:', err);
    res.json(error('审核失败'));
  }
});

// 获取KYC统计
router.get('/statistics', adminAuth, async (req, res) => {
  try {
    const stats = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as not_submitted,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN level = 1 AND status = 2 THEN 1 ELSE 0 END) as l1_count,
        SUM(CASE WHEN level = 2 AND status = 2 THEN 1 ELSE 0 END) as l2_count
       FROM kyc_verifications`
    );

    res.json(success(stats[0]));
  } catch (err) {
    console.error('Get KYC stats error:', err);
    res.json(error('获取统计失败'));
  }
});

module.exports = router;
