const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/auth');
const db = require('../../config/db');
const { success, error } = require('../../utils/helpers');

// 获取会话列表
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const { status, keyword } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status !== undefined) {
      whereClause += ' AND cs.status = ?';
      params.push(status);
    }
    
    if (keyword) {
      whereClause += ' AND (u.username LIKE ? OR u.email LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    const sessions = await db.query(
      `SELECT cs.*, u.username, u.email, u.avatar,
              (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id AND sender_type = 1 AND is_read = 0) as unread_count
       FROM chat_sessions cs
       JOIN users u ON cs.user_id = u.id
       ${whereClause}
       ORDER BY cs.last_time DESC`,
      params
    );
    
    res.json(success(sessions));
  } catch (err) {
    console.error('Get sessions error:', err);
    res.json(error('获取会话列表失败'));
  }
});

// 获取会话消息
router.get('/messages/:sessionId', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const messages = await db.query(
      `SELECT cm.*, 
              CASE WHEN cm.sender_type = 1 THEN u.username ELSE a.username END as sender_name
       FROM chat_messages cm
       LEFT JOIN users u ON cm.sender_type = 1 AND cm.sender_id = u.id
       LEFT JOIN admins a ON cm.sender_type = 2 AND cm.sender_id = a.id
       WHERE cm.session_id = ?
       ORDER BY cm.created_at ASC`,
      [sessionId]
    );
    
    // 标记用户消息为已读
    await db.execute(
      'UPDATE chat_messages SET is_read = 1 WHERE session_id = ? AND sender_type = 1 AND is_read = 0',
      [sessionId]
    );
    
    res.json(success(messages));
  } catch (err) {
    console.error('Get messages error:', err);
    res.json(error('获取消息失败'));
  }
});

// 发送消息（客服回复）
router.post('/send', adminAuth, async (req, res) => {
  try {
    const { sessionId, message, msgType = 'text' } = req.body;
    
    if (!message || !message.trim()) {
      return res.json(error('消息不能为空'));
    }
    
    // 保存消息
    const msgResult = await db.insert(
      `INSERT INTO chat_messages (session_id, sender_type, sender_id, message, msg_type) 
       VALUES (?, 2, ?, ?, ?)`,
      [sessionId, req.adminId, message.trim(), msgType]
    );
    
    // 更新会话
    await db.execute(
      'UPDATE chat_sessions SET last_message = ?, last_time = NOW(), admin_id = ?, status = 1 WHERE id = ?',
      [message.trim(), req.adminId, sessionId]
    );
    
    const newMessage = await db.getOne('SELECT * FROM chat_messages WHERE id = ?', [msgResult]);
    
    // 推送消息给用户
    if (global.io) {
      global.io.emit('admin_chat_message', {
        sessionId,
        message: newMessage
      });
    }
    
    res.json(success(newMessage, '发送成功'));
  } catch (err) {
    console.error('Send message error:', err);
    res.json(error('发送失败'));
  }
});

// 关闭会话
router.post('/close/:sessionId', adminAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await db.execute(
      'UPDATE chat_sessions SET status = 0 WHERE id = ?',
      [sessionId]
    );
    
    res.json(success(null, '会话已关闭'));
  } catch (err) {
    console.error('Close session error:', err);
    res.json(error('关闭失败'));
  }
});

// 获取统计
router.get('/statistics', adminAuth, async (req, res) => {
  try {
    const [{ total }] = await db.query('SELECT COUNT(*) as total FROM chat_sessions');
    const [{ active }] = await db.query('SELECT COUNT(*) as active FROM chat_sessions WHERE status = 1');
    const [{ waiting }] = await db.query('SELECT COUNT(*) as waiting FROM chat_sessions WHERE status = 2');
    const [{ unread }] = await db.query(
      'SELECT COUNT(*) as unread FROM chat_messages WHERE sender_type = 1 AND is_read = 0'
    );
    
    res.json(success({ total, active, waiting, unread }));
  } catch (err) {
    console.error('Get stats error:', err);
    res.json(error('获取统计失败'));
  }
});

module.exports = router;
