require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// 根据环境变量选择数据库
const useMySQL = process.env.USE_MYSQL === 'true';
const db = useMySQL ? require('./config/database-mysql') : require('./config/database');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 全局存储 io 实例
global.io = io;

// 中间件
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 根路由 - 健康检查
app.get('/', (req, res) => {
  res.json({ 
    code: 200, 
    message: 'Phemex Backend API 运行正常',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 限流配置 - 开发环境放宽限制
const isDev = process.env.NODE_ENV !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 1000, // 开发环境10000，生产1000
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
});
app.use('/api/', limiter);

// 更严格的登录/注册限流
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { code: 429, message: '登录尝试次数过多，请1小时后再试' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/market', require('./routes/market'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/asset', require('./routes/asset'));
app.use('/api/option', require('./routes/option'));
app.use('/api/fund', require('./routes/fund'));
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/security', require('./routes/security'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin/chat', require('./routes/admin/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/fund', require('./routes/admin/fund'));
app.use('/api/admin/kyc', require('./routes/admin/kyc'));

// 静态文件 - 添加CORS头和缓存控制
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cache-Control', 'no-cache');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Socket.io 连接处理
require('./socket')(io);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

const PORT = process.env.PORT || 3000;

// 初始化数据库并启动服务器
db.initDatabase().then(async () => {
  console.log(`📊 使用数据库: ${useMySQL ? 'MySQL + Redis' : 'SQLite'}`);
  
  // 如果使用MySQL，启动Binance真实行情
  if (useMySQL) {
    const binanceMarket = require('./services/binanceMarket');
    await binanceMarket.start();
    console.log('📈 Binance真实行情服务已启动');
  } else {
    // 使用模拟行情
    const marketSimulator = require('./services/marketSimulator');
    marketSimulator.start();
  }

  // 启动撮合引擎
  const matchEngine = require('./services/matchEngine');
  matchEngine.start();

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});

module.exports = { app, io };