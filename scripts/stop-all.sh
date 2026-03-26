#!/bin/bash

# OKX-Sim Pro 一键停止脚本
# 使用方法: ./scripts/stop-all.sh

echo "🛑 OKX-Sim Pro 一键停止"
echo "========================"

# 停止前端
echo "1️⃣  停止前端服务..."
pkill -f "vite.*port 8080" 2>/dev/null && echo "   ✅ 前端已停止" || echo "   ℹ️  前端未运行"

# 停止管理后台
echo "2️⃣  停止管理后台..."
pkill -f "vite.*port 8081" 2>/dev/null && echo "   ✅ 管理后台已停止" || echo "   ℹ️  管理后台未运行"

# 停止后端
echo "3️⃣  停止后端服务..."
pkill -f "node app.js" 2>/dev/null && echo "   ✅ 后端已停止" || echo "   ℹ️  后端未运行"

# 停止 Redis（可选）
echo "4️⃣  停止 Redis..."
redis-cli shutdown 2>/dev/null && echo "   ✅ Redis已停止" || echo "   ℹ️  Redis未运行"

echo ""
echo "========================"
echo "✅ 所有服务已停止"