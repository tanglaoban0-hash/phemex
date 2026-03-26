# Phemex 监控脚本

## 📁 脚本说明

### 1. start-all.sh - 一键启动所有服务
```bash
cd /Users/wahahaadn/.openclaw/workspace/okx-sim-pro
./scripts/start-all.sh
```
功能：
- 检查并启动 MySQL
- 检查并启动 Redis
- 启动后端 API
- 启动前端服务
- 启动管理后台

### 2. stop-all.sh - 一键停止所有服务
```bash
cd /Users/wahahaadn/.openclaw/workspace/okx-sim-pro
./scripts/stop-all.sh
```

### 3. health-check.sh - 健康检查与自动修复
```bash
cd /Users/wahahaadn/.openclaw/workspace/okx-sim-pro
./scripts/health-check.sh
```
功能：
- 检查所有服务状态
- 自动重启异常服务
- 测试 API 接口
- 生成状态报告

## 🚀 快速使用

### 启动项目
```bash
./scripts/start-all.sh
```

### 检查状态
```bash
./scripts/health-check.sh
```

### 停止项目
```bash
./scripts/stop-all.sh
```

## 📊 访问地址

启动后访问：
- 首页：http://localhost:8080
- 登录：http://localhost:8080/login
- 交易：http://localhost:8080/trade
- 后台：http://localhost:8081

## 📝 日志位置

- 后端日志：`backend/server.log`
- 前端日志：`frontend/frontend.log`
- 监控日志：`scripts/health-check.log`