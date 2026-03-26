#!/bin/bash

# OKX-Sim Pro 项目健康检查脚本
# 使用方法: ./scripts/health-check.sh

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/Users/wahahaadn/.openclaw/workspace/okx-sim-pro"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
ADMIN_DIR="$PROJECT_DIR/admin"

# 日志文件
LOG_FILE="$PROJECT_DIR/scripts/health-check.log"

# 写入日志
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查 MySQL
check_mysql() {
    log "检查 MySQL..."
    if mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
        log "${GREEN}✓ MySQL 运行正常${NC}"
        return 0
    else
        log "${RED}✗ MySQL 未运行，正在启动...${NC}"
        mysql.server start
        sleep 3
        if mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
            log "${GREEN}✓ MySQL 启动成功${NC}"
            return 0
        else
            log "${RED}✗ MySQL 启动失败${NC}"
            return 1
        fi
    fi
}

# 检查 Redis
check_redis() {
    log "检查 Redis..."
    if redis-cli ping >/dev/null 2>&1; then
        log "${GREEN}✓ Redis 运行正常${NC}"
        return 0
    else
        log "${RED}✗ Redis 未运行，正在启动...${NC}"
        redis-server --daemonize yes
        sleep 2
        if redis-cli ping >/dev/null 2>&1; then
            log "${GREEN}✓ Redis 启动成功${NC}"
            return 0
        else
            log "${RED}✗ Redis 启动失败${NC}"
            return 1
        fi
    fi
}

# 检查后端 API
check_backend() {
    log "检查后端 API..."
    
    # 测试 API
    response=$(curl -s http://localhost:3000/api/market/pairs)
    code=$(echo "$response" | grep -o '"code":[0-9]*' | cut -d: -f2)
    
    if [ "$code" = "200" ]; then
        log "${GREEN}✓ 后端 API 运行正常${NC}"
        return 0
    else
        log "${RED}✗ 后端 API 异常 (code: $code)，正在重启...${NC}"
        
        # 杀死旧进程
        pkill -f "node $BACKEND_DIR/app.js" 2>/dev/null
        sleep 2
        
        # 启动新进程
        cd "$BACKEND_DIR"
        export USE_MYSQL=true
        export DB_HOST=localhost
        export DB_USER=okx_user
        export DB_PASSWORD=okx_pass123
        export DB_NAME=okx_sim
        export REDIS_HOST=localhost
        export JWT_SECRET=okx-sim-pro-secret-key-for-jwt-signing
        
        nohup node app.js > server.log 2>&1 &
        sleep 5
        
        # 验证
        response=$(curl -s http://localhost:3000/api/market/pairs)
        code=$(echo "$response" | grep -o '"code":[0-9]*' | cut -d: -f2)
        
        if [ "$code" = "200" ]; then
            log "${GREEN}✓ 后端 API 重启成功${NC}"
            return 0
        else
            log "${RED}✗ 后端 API 重启失败${NC}"
            return 1
        fi
    fi
}

# 检查前端
check_frontend() {
    log "检查前端服务..."
    
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
    
    if [ "$code" = "200" ]; then
        log "${GREEN}✓ 前端服务运行正常${NC}"
        return 0
    else
        log "${RED}✗ 前端服务异常 (code: $code)，正在重启...${NC}"
        
        # 杀死旧进程
        pkill -f "vite.*port 8080" 2>/dev/null
        sleep 2
        
        # 启动新进程
        cd "$FRONTEND_DIR"
        nohup npx vite --port 8080 > frontend.log 2>&1 &
        sleep 5
        
        # 验证
        code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
        if [ "$code" = "200" ]; then
            log "${GREEN}✓ 前端服务重启成功${NC}"
            return 0
        else
            log "${RED}✗ 前端服务重启失败${NC}"
            return 1
        fi
    fi
}

# 检查管理后台
check_admin() {
    log "检查管理后台..."
    
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081)
    
    if [ "$code" = "200" ]; then
        log "${GREEN}✓ 管理后台运行正常${NC}"
        return 0
    else
        log "${RED}✗ 管理后台异常 (code: $code)，正在重启...${NC}"
        
        # 杀死旧进程
        pkill -f "vite.*port 8081" 2>/dev/null
        sleep 2
        
        # 启动新进程
        cd "$ADMIN_DIR"
        nohup npx vite --port 8081 > admin.log 2>&1 &
        sleep 5
        
        # 验证
        code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081)
        if [ "$code" = "200" ]; then
            log "${GREEN}✓ 管理后台重启成功${NC}"
            return 0
        else
            log "${RED}✗ 管理后台重启失败${NC}"
            return 1
        fi
    fi
}

# 测试 API 接口
test_apis() {
    log "测试 API 接口..."
    
    # 测试交易对
    response=$(curl -s http://localhost:3000/api/market/pairs)
    code=$(echo "$response" | grep -o '"code":[0-9]*' | cut -d: -f2)
    if [ "$code" = "200" ]; then
        log "${GREEN}✓ /api/market/pairs 正常${NC}"
    else
        log "${RED}✗ /api/market/pairs 异常 (code: $code)${NC}"
    fi
    
    # 测试K线
    response=$(curl -s "http://localhost:3000/api/market/kline?pairId=1&period=1m&limit=5")
    code=$(echo "$response" | grep -o '"code":[0-9]*' | cut -d: -f2)
    if [ "$code" = "200" ]; then
        log "${GREEN}✓ /api/market/kline 正常${NC}"
    else
        log "${RED}✗ /api/market/kline 异常 (code: $code)${NC}"
    fi
    
    # 测试秒合约
    response=$(curl -s http://localhost:3000/api/option/contracts)
    code=$(echo "$response" | grep -o '"code":[0-9]*' | cut -d: -f2)
    if [ "$code" = "200" ]; then
        log "${GREEN}✓ /api/option/contracts 正常${NC}"
    else
        log "${RED}✗ /api/option/contracts 异常 (code: $code)${NC}"
    fi
}

# 显示状态摘要
show_summary() {
    log ""
    log "========== 状态摘要 =========="
    log "MySQL: $(mysql -u root -e "SELECT 1" >/dev/null 2>&1 && echo "${GREEN}运行中${NC}" || echo "${RED}异常${NC}")"
    log "Redis: $(redis-cli ping >/dev/null 2>&1 && echo "${GREEN}运行中${NC}" || echo "${RED}异常${NC}")"
    log "后端API: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/market/pairs | grep -q 200 && echo "${GREEN}运行中${NC}" || echo "${RED}异常${NC}")"
    log "前端: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q 200 && echo "${GREEN}运行中${NC}" || echo "${RED}异常${NC}")"
    log "管理后台: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 | grep -q 200 && echo "${GREEN}运行中${NC}" || echo "${RED}异常${NC}")"
    log "=============================="
    log ""
    log "访问地址:"
    log "  首页: http://localhost:8080"
    log "  登录: http://localhost:8080/login"
    log "  交易: http://localhost:8080/trade"
    log "  后台: http://localhost:8081"
}

# 主函数
main() {
    log "========== OKX-Sim Pro 健康检查 =========="
    
    # 检查各项服务
    check_mysql
    check_redis
    check_backend
    check_frontend
    check_admin
    
    # 测试 API
    test_apis
    
    # 显示摘要
    show_summary
    
    log "检查完成！日志保存在: $LOG_FILE"
}

# 运行主函数
main