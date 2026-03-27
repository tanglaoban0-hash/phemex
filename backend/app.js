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
  res.json({ code: 200, message: '登录成功' });
});

// Market 路由
app.get('/api/market/pairs', async (req, res) => {
  res.json({
    code: 200,
    message: 'success',
    data: [
      { id: 1, symbol: 'BTC/USDT', price: 65000 },
      { id: 2, symbol: 'ETH/USDT', price: 3500 }
    ]
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
