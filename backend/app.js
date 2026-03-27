require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

global.io = io;

// 中间件
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

// ===== 所有路由 =====
app.get('/', (req, res) => {
  res.json({ code: 200, message: 'Phemex API v1.0.8 - CLEAN BUILD', time: new Date().toISOString(), auth: true });
});

// 内联 auth 路由
app.post('/api/auth/register', (req, res) => {
  console.log('REGISTER:', req.body);
  res.json({ code: 200, message: '注册成功', data: req.body });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  // 简化版本 - 实际应该验证密码
  res.json({ 
    code: 200, 
    message: '登录成功',
    data: {
      token: 'demo_token_' + Date.now(),
      user: {
        id: 1,
        email: email,
        username: email.split('@')[0],
        status: 1
      }
    }
  });
});

// Market 路由
app.get('/api/market/pairs', async (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: [
      { id: 1, symbol: 'BTC/USDT', price: 65000, price_change_24h: 2.5, volume_24h: 1250 },
      { id: 2, symbol: 'ETH/USDT', price: 3500, price_change_24h: 1.8, volume_24h: 8500 },
      { id: 3, symbol: 'BNB/USDT', price: 580, price_change_24h: -0.5, volume_24h: 5000 }
    ]
  });
});

app.get('/api/market/ticker/:id', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: { price: 65000, change: 2.5 }
  });
});

// User 路由
app.get('/api/user/info', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: {
      id: 1,
      email: 'test@test.com',
      username: 'test',
      avatar: '',
      status: 1,
      kyc_status: 0
    }
  });
});

// Asset 路由
app.get('/api/asset/balances', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: [
      { coin_id: 1, symbol: 'USDT', available: 10000, frozen: 0 },
      { coin_id: 2, symbol: 'BTC', available: 0.5, frozen: 0 },
      { coin_id: 3, symbol: 'ETH', available: 2, frozen: 0 }
    ]
  });
});

// Trade 路由
app.get('/api/trade/orders', (req, res) => {
  res.json({ code: 200, message: 'success', data: [] });
});

app.post('/api/trade/order', (req, res) => {
  res.json({ code: 200, message: '下单成功', data: { order_id: Date.now() } });
});

// Fund 路由
app.get('/api/fund/deposits', (req, res) => {
  res.json({ code: 200, message: 'success', data: [] });
});

app.get('/api/fund/withdrawals', (req, res) => {
  res.json({ code: 200, message: 'success', data: [] });
});

// Security 路由
app.get('/api/security/settings', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: { google_2fa: false, email_2fa: false }
  });
});

// KYC 路由
app.get('/api/kyc/status', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: { status: 0, level: 0 }
  });
});

// Option 路由
app.get('/api/option/contracts', (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: [
      { id: 1, name: '30秒', duration: 30, profit_rate: 0.75 },
      { id: 2, name: '1分钟', duration: 60, profit_rate: 0.80 }
    ]
  });
});

// Admin 路由
app.post('/api/admin/login', (req, res) => {
  res.json({
    code: 200,
    message: '登录成功',
    data: { token: 'admin_token_' + Date.now() }
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ code: 404, message: 'Not found: ' + req.path });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server v1.0.6 on port ${PORT}`);
});

module.exports = { app, io };
