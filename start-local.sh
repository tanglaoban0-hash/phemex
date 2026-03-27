#!/bin/bash

echo "🚀 启动 Phemex 后端..."

# 杀掉旧进程
pkill -f "node app.js" 2>/dev/null
pkill -f "cloudflared" 2>/dev/null
sleep 1

# 启动后端
cd ~/okx-sim-pro/backend 2>/dev/null || cd ~/.openclaw/workspace/okx-sim-pro/backend
PORT=3000 npm start > /tmp/backend.log 2>&1 &
echo "✅ 后端启动中..."
sleep 3

# 检查后端是否启动
if curl -s http://localhost:3000/ > /dev/null; then
    echo "✅ 后端运行正常: http://localhost:3000"
else
    echo "⚠️ 后端启动失败，查看日志: cat /tmp/backend.log"
    exit 1
fi

# 启动 Cloudflare Tunnel
echo "🌐 启动 Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:3000 > /tmp/tunnel.log 2>&1 &
sleep 5

# 获取 Tunnel URL
TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/tunnel.log | head -1)

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "========================================"
    echo "🎉 后端已暴露到公网！"
    echo ""
    echo "🔗 公网地址: $TUNNEL_URL"
    echo ""
    echo "📋 更新前端 API 地址为:"
    echo "   $TUNNEL_URL/api"
    echo "========================================"
    echo ""
    echo "⚠️  保持此窗口运行！关闭后公网地址失效"
    echo ""
    read -p "按回车键停止服务..."
    pkill -f "node app.js"
    pkill -f "cloudflared"
else
    echo "⚠️ Tunnel 启动失败，查看日志: cat /tmp/tunnel.log"
fi
