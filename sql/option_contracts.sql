-- 秒合约相关表

-- 合约类型表
CREATE TABLE IF NOT EXISTS option_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '合约名称',
    duration INTEGER NOT NULL COMMENT '持续时间(秒)',
    profit_rate DECIMAL(5, 2) DEFAULT 0.75 COMMENT '收益率(0.75=75%)',
    min_amount DECIMAL(20, 8) DEFAULT 10 COMMENT '最小金额',
    max_amount DECIMAL(20, 8) DEFAULT 10000 COMMENT '最大金额',
    status INTEGER DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    sort_order INTEGER DEFAULT 0 COMMENT '排序',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 秒合约订单表
CREATE TABLE IF NOT EXISTS option_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',
    user_id INTEGER NOT NULL COMMENT '用户ID',
    pair_id INTEGER NOT NULL COMMENT '交易对ID',
    contract_id INTEGER NOT NULL COMMENT '合约类型ID',
    direction INTEGER NOT NULL COMMENT '方向: 1-涨 2-跌',
    amount DECIMAL(20, 8) NOT NULL COMMENT '金额',
    start_price DECIMAL(20, 8) NOT NULL COMMENT '开始价格',
    end_price DECIMAL(20, 8) DEFAULT NULL COMMENT '结束价格',
    profit_rate DECIMAL(5, 2) NOT NULL COMMENT '收益率',
    profit_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '盈亏金额(正为盈利,负为亏损)',
    status INTEGER DEFAULT 0 COMMENT '状态: 0-进行中 1-盈利 2-亏损 3-平局',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    end_time DATETIME NOT NULL COMMENT '结束时间',
    settled_at DATETIME DEFAULT NULL COMMENT '结算时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系统盈亏控制配置
CREATE TABLE IF NOT EXISTS option_control (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE COMMENT '日期',
    user_profit_rate INTEGER DEFAULT 50 COMMENT '用户胜率(%)',
    total_profit DECIMAL(20, 8) DEFAULT 0 COMMENT '当日总盈亏',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初始化合约类型
INSERT OR IGNORE INTO option_contracts (name, duration, profit_rate, min_amount, max_amount, status, sort_order) VALUES
('30秒', 30, 0.75, 10, 1000, 1, 1),
('1分钟', 60, 0.80, 10, 5000, 1, 2),
('3分钟', 180, 0.85, 10, 10000, 1, 3),
('5分钟', 300, 0.90, 10, 20000, 1, 4);