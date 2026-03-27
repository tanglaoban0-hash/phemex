require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

global.io = io;

// 中间件
app.use(helmet());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 根路由
app.get('/', (req, res) => {
  res.json({ code: 200, message: 'Phemex API OK', version: '1.0.4', time: new Date().toISOString() });
});

// ===== API 路由（在限流之前）=====
app.get('/api/test', (req, res) => res.json({ code: 200, message: 'Test OK' }));

// 内联注册路由
app.post('/api/auth/register', (req, res) => {
  console.log('Register request:', req.body);
  res.json({ code: 200, message: 'Register OK', data: req.body });
});

// 加载完整路由
try {
  app.use('/api/auth', require('./routes/auth'));
  console.log('✅ Auth routes loaded');
} catch (err) {
  console.error('❌ Auth routes failed:', err.message);
}

app.use('/api/market', require('./routes/market'));

// 限流（放在路由之后）
// const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
// app.use('/api/', limiter);

// 404
app.use((req, res) => res.status(404).json({ code: 404, message: 'Not found' }));

const PORT = process.env.PORT || 3000;

// 简化启动
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// 后台初始化数据库
const useMySQL = process.env.USE_MYSQL === 'true';
const db = useMySQL ? require('./config/database-mysql') : require('./config/database');
db.initDatabase().then(() => {
  console.log('✅ Database ready');
}).catch(err => {
  console.error('⚠️ Database init error:', err.message);
});

module.exports = { app, io };
