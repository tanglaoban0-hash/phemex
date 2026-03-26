#!/bin/bash

# OKX-Sim Pro 一键启动脚本
# 使用方法: ./scripts/start-all.sh

PROJECT_DIR="/Users/wahahaadn/.openclaw/workspace/okx-sim-pro"

echo "🚀 OKX-Sim Pro 一键启动"
echo "========================"

# 1. 检查并启动 MySQL
echo "1️⃣  启动 MySQL..."
if mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
    echo "   ✅ MySQL 已运行"
else
    mysql.server start
    sleep 3
    echo "   ✅ MySQL 启动完成"
fi

# 2. 检查并启动 Redis
echo "2️⃣  启动 Redis..."
if redis-cli ping >/dev/null 2>&1; then
    echo "   ✅ Redis 已运行"
else
    redis-server --daemonize yes
    echo "   ✅ Redis 启动完成"
fi

# 3. 启动后端
echo "3️⃣  启动后端服务..."
cd "$PROJECT_DIR/backend"
export USE_MYSQL=true
export DB_HOST=localhost
export DB_USER=okx_user
export DB_PASSWORD=okx_pass123
export DB_NAME=okx_sim
export REDIS_HOST=localhost
export JWT_SECRET=okx-sim-pro-secret-key-for-jwt-signing

# 检查是否已运行
if curl -s http://localhost:3000/api/market/pairs >/dev/null 2>&1; then
    echo "   ✅ 后端已运行"
else
    nohup node app.js > server.log 2>&1 &
    sleep 5
    echo "   ✅ 后端启动完成 (PID: $!)"
fi

# 4. 启动前端
echo "4️⃣  启动前端服务..."
cd "$PROJECT_DIR/frontend"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q 200; then
    echo "   ✅ 前端已运行"
else
    nohup npx vite --port 8080 > frontend.log 2>&1 &
    sleep 3
    echo "   ✅ 前端启动完成 (PID: $!)"
fi

# 5. 启动管理后台
echo "5️⃣  启动管理后台..."
cd "$PROJECT_DIR/admin"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 | grep -q 200; then
    echo "   ✅ 管理后台已运行"
else
    nohup npx vite --port 8081 > admin.log 2>&1 &
    sleep 3
    echo "   ✅ 管理后台启动完成 (PID: $!)"
fi

echo ""
echo "========================"
echo "✅ 所有服务启动完成！"
echo ""
echo "访问地址:"
echo "  🌐 首页:    http://localhost:8080"
echo "  🔐 登录:    http://localhost:8080/login"
echo "  📈 交易:    http://localhost:8080/trade"
echo "  ⚙️  后台:    http://localhost:8081"
echo ""
echo "管理账号: admin / admin123"
echo "========================"