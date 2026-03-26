const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/db');
const { success, error } = require('../utils/helpers');

// 获取或创建会话
router.get('/session', auth, async (req, res) => {
  try {
    // 查找进行中的会话
    let session = await db.getOne(
      'SELECT * FROM chat_sessions WHERE user_id = ? AND status = 1 ORDER BY created_at DESC LIMIT 1',
      [req.userId]
    );
    
    // 如果没有，创建新会话
    if (!session) {
      const result = await db.insert(
        'INSERT INTO chat_sessions (user_id, status) VALUES (?, 1)',
        [req.userId]
      );
      session = await db.getOne('SELECT * FROM chat_sessions WHERE id = ?', [result]);
    }
    
    res.json(success(session));
  } catch (err) {
    console.error('Get session error:', err);
    res.json(error('获取会话失败'));
  }
});

// 获取消息历史
router.get('/messages/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // 验证会话归属
    const session = await db.getOne(
      'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, req.userId]
    );
    
    if (!session) {
      return res.json(error('会话不存在'));
    }
    
    const messages = await db.query(
      `SELECT * FROM chat_messages 
       WHERE session_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [sessionId, String(limit), String(offset)]
    );
    
    // 标记为已读
    await db.execute(
      'UPDATE chat_messages SET is_read = 1 WHERE session_id = ? AND sender_type = 2 AND is_read = 0',
      [sessionId]
    );
    
    res.json(success(messages.reverse()));
  } catch (err) {
    console.error('Get messages error:', err);
    res.json(error('获取消息失败'));
  }
});

// 发送消息
router.post('/send', auth, async (req, res) => {
  try {
    const { sessionId, message, msgType = 'text' } = req.body;
    
    if (!message || !message.trim()) {
      return res.json(error('消息不能为空'));
    }
    
    // 验证会话
    const session = await db.getOne(
      'SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, req.userId]
    );
    
    if (!session) {
      return res.json(error('会话不存在'));
    }
    
    // 保存消息
    const msgResult = await db.insert(
      `INSERT INTO chat_messages (session_id, sender_type, sender_id, message, msg_type) 
       VALUES (?, 1, ?, ?, ?)`,
      [sessionId, req.userId, message.trim(), msgType]
    );
    
    // 更新会话
    await db.execute(
      'UPDATE chat_sessions SET last_message = ?, last_time = NOW(), status = 2 WHERE id = ?',
      [message.trim(), sessionId]
    );
    
    const newMessage = await db.getOne('SELECT * FROM chat_messages WHERE id = ?', [msgResult]);
    
    // 推送消息给客服
    if (global.io) {
      global.io.emit('new_chat_message', {
        sessionId,
        message: newMessage,
        userId: req.userId
      });
    }
    
    res.json(success(newMessage, '发送成功'));
  } catch (err) {
    console.error('Send message error:', err);
    res.json(error('发送失败'));
  }
});

// 关闭会话
router.post('/close/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await db.execute(
      'UPDATE chat_sessions SET status = 0 WHERE id = ? AND user_id = ?',
      [sessionId, req.userId]
    );
    
    res.json(success(null, '会话已关闭'));
  } catch (err) {
    console.error('Close session error:', err);
    res.json(error('关闭失败'));
  }
});

// 获取未读消息数
router.get('/unread', auth, async (req, res) => {
  try {
    const [{ count }] = await db.query(
      `SELECT COUNT(*) as count FROM chat_messages cm
       JOIN chat_sessions cs ON cm.session_id = cs.id
       WHERE cs.user_id = ? AND cm.sender_type = 2 AND cm.is_read = 0`,
      [req.userId]
    );
    
    res.json(success({ count }));
  } catch (err) {
    console.error('Get unread error:', err);
    res.json(error('获取失败'));
  }
});

module.exports = router;
