# Phemex - 加密货币模拟交易平台

一款功能完整的加密货币模拟交易平台，纯虚拟环境，适用于教学演示和开发测试。

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd okx-sim-pro

# 启动所有服务
docker-compose up -d

# 等待 MySQL 初始化完成（约30秒）
# 访问以下地址：
# - 用户端: http://localhost:8080
# - 管理后台: http://localhost:8081
# - 后端API: http://localhost:3000

# 默认账号
# 管理员: admin / admin123
# 测试用户: user / user123
```

### 方式二：本地开发

#### 1. 启动 MySQL
确保本地已安装 MySQL，并创建数据库：
```bash
mysql -u root -p
CREATE DATABASE okx_sim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 2. 初始化数据库
```bash
mysql -u root -p okx_sim < sql/init.sql
```

#### 3. 启动后端服务
```bash
cd backend
cp .env.example .env
# 编辑 .env 配置数据库连接
npm install
npm start
```

#### 4. 启动前端（用户端）
```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:8080
```

#### 5. 启动前端（管理后台）
```bash
cd admin
npm install
npm run dev
# 访问 http://localhost:8081
```

## 📁 项目结构

```
okx-sim-pro/
├── backend/          # Node.js + Express 后端服务
│   ├── app.js              # 主入口
│   ├── routes/             # API路由
│   ├── services/           # 业务逻辑
│   │   ├── matchEngine.js      # 撮合引擎
│   │   └── marketSimulator.js  # 行情模拟器
│   ├── socket.js           # WebSocket 服务
│   └── ...
├── frontend/         # Vue3 用户端
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   │   ├── Trade.vue       # 交易页面
│   │   │   ├── Assets.vue      # 资产页面
│   │   │   ├── Orders.vue      # 订单页面
│   │   │   └── Profile.vue     # 个人中心
│   │   ├── stores/         # Pinia 状态管理
│   │   └── utils/          # 工具函数
│   └── ...
├── admin/            # Vue3 管理后台
│   ├── src/
│   │   ├── views/          # 管理页面
│   │   │   ├── Dashboard.vue   # 数据概览
│   │   │   ├── Users.vue       # 用户管理
│   │   │   ├── Coins.vue       # 币种管理
│   │   │   ├── Pairs.vue       # 交易对管理
│   │   │   ├── Orders.vue      # 订单管理
│   │   │   ├── Withdrawals.vue # 提现审核
│   │   │   └── Settings.vue    # 系统设置
│   │   └── ...
│   └── ...
├── sql/              # 数据库初始化脚本
│   └── init.sql
└── docker-compose.yml
```

## ✨ 功能特性

### 用户端功能
- ✅ 用户注册/登录
- ✅ 币币交易（限价/市价）
- ✅ 实时K线行情（WebSocket推送）
- ✅ 订单簿深度展示
- ✅ 资产管理（余额查询、充值、提现）
- ✅ 订单管理（当前委托、历史订单、成交记录）
- ✅ 邀请系统
- ✅ 个人中心（信息修改、密码修改）

### 管理后台功能
- ✅ 数据概览（Dashboard）
- ✅ 用户管理（禁用/启用）
- ✅ 币种管理（添加/编辑/禁用）
- ✅ 交易对管理
- ✅ 订单管理
- ✅ 提现审核
- ✅ 系统设置

### 技术特性
- 🚀 模拟撮合引擎（支持限价/市价单）
- 📈 实时行情模拟（WebSocket推送）
- 🔄 完整的订单生命周期管理
- 💰 虚拟资产系统（注册赠送、交易手续费）
- 🔐 JWT 认证 + 权限控制
- 🐳 Docker 一键部署

## 🛠 技术栈

### 后端
- Node.js 18
- Express.js
- MySQL 8.0
- Socket.io (WebSocket)
- JWT 认证
- bcrypt 密码加密

### 前端（用户端）
- Vue 3 + Vite
- Element Plus UI
- Pinia 状态管理
- ECharts K线图
- Socket.io-client

### 前端（管理后台）
- Vue 3 + Vite
- Element Plus UI
- Pinia 状态管理
- ECharts 数据可视化

## 🔌 API 接口

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 用户
- `GET /api/user/info` - 获取用户信息
- `PUT /api/user/profile` - 更新资料
- `POST /api/user/password` - 修改密码

### 行情
- `GET /api/market/pairs` - 获取交易对列表
- `GET /api/market/kline` - 获取K线数据
- `GET /api/market/depth` - 获取订单簿深度

### 交易
- `POST /api/trade/order` - 下单
- `POST /api/trade/cancel/:id` - 撤单
- `GET /api/trade/orders` - 获取订单列表
- `GET /api/trade/trades` - 获取成交记录

### 资产
- `GET /api/asset/balances` - 获取余额
- `GET /api/asset/total` - 获取总资产
- `POST /api/asset/withdraw` - 申请提现

### 管理后台
- `POST /api/admin/login` - 管理员登录
- `GET /api/admin/stats` - 统计数据
- `GET /api/admin/users` - 用户列表
- `GET /api/admin/orders` - 订单列表
- `GET /api/admin/withdrawals` - 提现列表
- `POST /api/admin/withdrawals/:id/audit` - 提现审核

## 📝 说明

⚠️ **注意**：这是一个纯模拟的交易系统，所有资产均为虚拟货币，仅用于演示和测试目的。

- 新用户注册自动赠送 10,000 USDT
- 交易手续费为 0.1%
- 提现需要管理员审核
- 行情价格由模拟器自动生成波动

## 🔧 开发计划

- [x] 基础后端 API
- [x] 撮合引擎
- [x] 行情模拟器
- [x] WebSocket 实时推送
- [x] 前端用户端
- [x] 管理后台
- [x] Docker 部署
- [ ] 更多交易对
- [ ] 永续合约模拟
- [ ] 更多 K线周期
- [ ] 深度图
- [ ] 多语言支持

## 📄 License

MIT License - 仅供学习和演示使用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ for crypto trading simulation**