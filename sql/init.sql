-- OKX-Sim Pro 数据库初始化脚本 (MySQL)
-- 创建数据库
CREATE DATABASE IF NOT EXISTS okx_sim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE okx_sim;

-- 1. 用户表
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱',
    password VARCHAR(255) NOT NULL COMMENT '加密密码',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
    real_name VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
    id_card VARCHAR(18) DEFAULT NULL COMMENT '身份证号',
    avatar VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-正常 2-待验证',
    kyc_status TINYINT DEFAULT 0 COMMENT '实名认证: 0-未认证 1-待审核 2-已通过 3-已拒绝',
    invite_code VARCHAR(20) DEFAULT NULL COMMENT '邀请码',
    invited_by BIGINT UNSIGNED DEFAULT NULL COMMENT '邀请人ID',
    last_login_at TIMESTAMP DEFAULT NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_invite_code (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 2. 币种表
CREATE TABLE coins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE COMMENT '币种符号: BTC, ETH, USDT',
    name VARCHAR(50) NOT NULL COMMENT '币种名称',
    icon VARCHAR(255) DEFAULT NULL COMMENT '图标URL',
    decimals INT DEFAULT 8 COMMENT '精度',
    is_base TINYINT DEFAULT 0 COMMENT '是否是基准货币: 0-否 1-是',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    min_withdraw DECIMAL(20, 8) DEFAULT 0 COMMENT '最小提现数量',
    withdraw_fee DECIMAL(20, 8) DEFAULT 0 COMMENT '提现手续费',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='币种表';

-- 3. 用户余额表
CREATE TABLE user_balances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    coin_id INT UNSIGNED NOT NULL COMMENT '币种ID',
    available DECIMAL(20, 8) DEFAULT 0 COMMENT '可用余额',
    frozen DECIMAL(20, 8) DEFAULT 0 COMMENT '冻结余额',
    total_recharge DECIMAL(20, 8) DEFAULT 0 COMMENT '累计充值',
    total_withdraw DECIMAL(20, 8) DEFAULT 0 COMMENT '累计提现',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_coin (user_id, coin_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户余额表';

-- 4. 交易对表
CREATE TABLE trading_pairs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE COMMENT '交易对符号: BTC/USDT',
    base_coin_id INT UNSIGNED NOT NULL COMMENT '基础币种ID',
    quote_coin_id INT UNSIGNED NOT NULL COMMENT '计价币种ID',
    price DECIMAL(20, 8) DEFAULT 0 COMMENT '当前价格',
    price_change_24h DECIMAL(10, 4) DEFAULT 0 COMMENT '24小时涨跌幅%',
    high_24h DECIMAL(20, 8) DEFAULT 0 COMMENT '24小时最高价',
    low_24h DECIMAL(20, 8) DEFAULT 0 COMMENT '24小时最低价',
    volume_24h DECIMAL(20, 8) DEFAULT 0 COMMENT '24小时成交量',
    min_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '最小交易数量',
    price_precision INT DEFAULT 2 COMMENT '价格精度',
    amount_precision INT DEFAULT 4 COMMENT '数量精度',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易对表';

-- 5. 订单表
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    pair_id INT UNSIGNED NOT NULL COMMENT '交易对ID',
    type TINYINT NOT NULL COMMENT '类型: 1-限价 2-市价',
    side TINYINT NOT NULL COMMENT '方向: 1-买入 2-卖出',
    price DECIMAL(20, 8) DEFAULT NULL COMMENT '委托价格(市价单为空)',
    amount DECIMAL(20, 8) NOT NULL COMMENT '委托数量',
    filled_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '已成交数量',
    filled_total DECIMAL(20, 8) DEFAULT 0 COMMENT '已成交金额',
    avg_price DECIMAL(20, 8) DEFAULT 0 COMMENT '成交均价',
    fee DECIMAL(20, 8) DEFAULT 0 COMMENT '手续费',
    status TINYINT DEFAULT 0 COMMENT '状态: 0-待成交 1-部分成交 2-完全成交 3-已撤销',
    ip_address VARCHAR(50) DEFAULT NULL COMMENT '下单IP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_pair_id (pair_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 6. 成交记录表
CREATE TABLE trades (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trade_no VARCHAR(32) NOT NULL UNIQUE COMMENT '成交号',
    buy_order_id BIGINT UNSIGNED NOT NULL COMMENT '买单ID',
    sell_order_id BIGINT UNSIGNED NOT NULL COMMENT '卖单ID',
    buyer_id BIGINT UNSIGNED NOT NULL COMMENT '买方用户ID',
    seller_id BIGINT UNSIGNED NOT NULL COMMENT '卖方用户ID',
    pair_id INT UNSIGNED NOT NULL COMMENT '交易对ID',
    price DECIMAL(20, 8) NOT NULL COMMENT '成交价格',
    amount DECIMAL(20, 8) NOT NULL COMMENT '成交数量',
    total DECIMAL(20, 8) NOT NULL COMMENT '成交金额',
    buy_fee DECIMAL(20, 8) DEFAULT 0 COMMENT '买方手续费',
    sell_fee DECIMAL(20, 8) DEFAULT 0 COMMENT '卖方手续费',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_buy_order_id (buy_order_id),
    INDEX idx_sell_order_id (sell_order_id),
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_seller_id (seller_id),
    INDEX idx_pair_id (pair_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成交记录表';

-- 7. 余额变动记录表
CREATE TABLE balance_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    coin_id INT UNSIGNED NOT NULL COMMENT '币种ID',
    type TINYINT NOT NULL COMMENT '类型: 1-充值 2-提现 3-下单冻结 4-成交解冻 5-手续费 6-系统赠送 7-邀请奖励',
    amount DECIMAL(20, 8) NOT NULL COMMENT '变动金额(正为增加,负为减少)',
    before_balance DECIMAL(20, 8) NOT NULL COMMENT '变动前余额',
    after_balance DECIMAL(20, 8) NOT NULL COMMENT '变动后余额',
    relation_id BIGINT UNSIGNED DEFAULT NULL COMMENT '关联ID(订单ID/提现ID等)',
    relation_type VARCHAR(50) DEFAULT NULL COMMENT '关联类型',
    remark VARCHAR(255) DEFAULT NULL COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_coin_id (coin_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='余额变动记录表';

-- 8. 提现记录表
CREATE TABLE withdrawals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    withdraw_no VARCHAR(32) NOT NULL UNIQUE COMMENT '提现单号',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    coin_id INT UNSIGNED NOT NULL COMMENT '币种ID',
    amount DECIMAL(20, 8) NOT NULL COMMENT '提现数量',
    fee DECIMAL(20, 8) DEFAULT 0 COMMENT '手续费',
    real_amount DECIMAL(20, 8) NOT NULL COMMENT '实际到账',
    address VARCHAR(255) NOT NULL COMMENT '提现地址',
    tx_hash VARCHAR(255) DEFAULT NULL COMMENT '交易哈希(模拟)',
    status TINYINT DEFAULT 0 COMMENT '状态: 0-待审核 1-审核通过 2-已驳回 3-已到账',
    audit_by BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人ID',
    audit_at TIMESTAMP DEFAULT NULL COMMENT '审核时间',
    audit_remark VARCHAR(255) DEFAULT NULL COMMENT '审核备注',
    completed_at TIMESTAMP DEFAULT NULL COMMENT '完成时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现记录表';

-- 充值申请表 (新增)
CREATE TABLE deposits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    deposit_no VARCHAR(32) NOT NULL UNIQUE COMMENT '充值单号',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    coin_id INT UNSIGNED NOT NULL COMMENT '币种ID',
    amount DECIMAL(20, 8) NOT NULL COMMENT '充值金额',
    payment_method VARCHAR(20) NOT NULL COMMENT '支付方式: crypto-数字货币 bank-银行转账 hkb-港卡',
    payment_proof VARCHAR(500) DEFAULT NULL COMMENT '支付凭证(截图/TXID等)',
    from_address VARCHAR(255) DEFAULT NULL COMMENT '付款地址/卡号',
    to_address VARCHAR(255) DEFAULT NULL COMMENT '收款地址/卡号',
    status TINYINT DEFAULT 0 COMMENT '状态: 0-待审核 1-已通过 2-已驳回',
    audit_by BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人ID',
    audit_at TIMESTAMP DEFAULT NULL COMMENT '审核时间',
    audit_remark VARCHAR(255) DEFAULT NULL COMMENT '审核备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值申请表';

-- 支付方式配置表 (新增)
CREATE TABLE payment_configs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    method VARCHAR(20) NOT NULL COMMENT '支付方式: USDT/BTC/ETH/USDC/hkb/usd',
    method_type VARCHAR(20) NOT NULL COMMENT '类型: crypto-数字货币 bank-银行 hkb-港卡',
    name VARCHAR(50) NOT NULL COMMENT '显示名称',
    address VARCHAR(255) DEFAULT NULL COMMENT '收款地址/卡号',
    bank_name VARCHAR(100) DEFAULT NULL COMMENT '银行名称',
    account_name VARCHAR(100) DEFAULT NULL COMMENT '账户名',
    network VARCHAR(50) DEFAULT NULL COMMENT '网络(如ERC20/TRC20)',
    qr_code VARCHAR(255) DEFAULT NULL COMMENT '二维码图片',
    min_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '最小金额',
    max_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '最大金额(0为不限制)',
    fee_rate DECIMAL(10, 4) DEFAULT 0 COMMENT '手续费率',
    fee_fixed DECIMAL(20, 8) DEFAULT 0 COMMENT '固定手续费',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_method (method),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付方式配置表';

-- 9. 管理员表
CREATE TABLE admins (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '加密密码',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱',
    role TINYINT DEFAULT 1 COMMENT '角色: 1-超级管理员 2-运营 3-客服',
    status TINYINT DEFAULT 1 COMMENT '状态: 0-禁用 1-启用',
    last_login_at TIMESTAMP DEFAULT NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 10. 系统配置表
CREATE TABLE system_config (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    `value` TEXT COMMENT '配置值',
    `desc` VARCHAR(255) DEFAULT NULL COMMENT '描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 11. K线数据表
CREATE TABLE kline_data (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pair_id INT UNSIGNED NOT NULL COMMENT '交易对ID',
    period VARCHAR(10) NOT NULL COMMENT '周期: 1m, 5m, 15m, 1h, 4h, 1d',
    timestamp BIGINT NOT NULL COMMENT '时间戳',
    open DECIMAL(20, 8) NOT NULL COMMENT '开盘价',
    high DECIMAL(20, 8) NOT NULL COMMENT '最高价',
    low DECIMAL(20, 8) NOT NULL COMMENT '最低价',
    close DECIMAL(20, 8) NOT NULL COMMENT '收盘价',
    volume DECIMAL(20, 8) NOT NULL COMMENT '成交量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_pair_period_time (pair_id, period, timestamp),
    INDEX idx_pair_id (pair_id),
    INDEX idx_period (period),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='K线数据表';

-- 初始化币种数据
INSERT INTO coins (symbol, name, icon, decimals, is_base, status, min_withdraw, withdraw_fee) VALUES
('USDT', 'Tether USD', '/coins/usdt.png', 6, 1, 1, 10, 1),
('BTC', 'Bitcoin', '/coins/btc.png', 8, 0, 1, 0.001, 0.0005),
('ETH', 'Ethereum', '/coins/eth.png', 8, 0, 1, 0.01, 0.005),
('BNB', 'BNB', '/coins/bnb.png', 8, 0, 1, 0.1, 0.05);

-- 初始化交易对
INSERT INTO trading_pairs (symbol, base_coin_id, quote_coin_id, price, price_change_24h, high_24h, low_24h, volume_24h, min_amount, price_precision, amount_precision, status, sort_order) VALUES
('BTC/USDT', 2, 1, 65000.00, 2.5, 68000.00, 63000.00, 1250.50, 0.0001, 2, 6, 1, 1),
('ETH/USDT', 3, 1, 3500.00, 1.8, 3700.00, 3400.00, 8500.25, 0.001, 2, 5, 1, 2),
('BNB/USDT', 4, 1, 580.00, -0.5, 600.00, 570.00, 5000.00, 0.01, 2, 4, 1, 3),
('ETH/BTC', 3, 2, 0.0538, 0.8, 0.0550, 0.0520, 120.30, 0.001, 6, 5, 1, 4);

-- 初始化管理员
INSERT INTO admins (username, password, email, role, status) VALUES
('admin', '$2b$10$YourHashedPasswordHere', 'admin@okxsim.com', 1, 1);

-- 初始化系统配置
INSERT INTO system_config (`key`, `value`, `desc`) VALUES
('site_name', 'OKX-Sim Pro', '网站名称'),
('trading_fee_buy', '0.001', '买入手续费率(0.001=0.1%)'),
('trading_fee_sell', '0.001', '卖出手续费率(0.001=0.1%)'),
('register_gift_usdt', '10000', '注册赠送USDT金额'),
('invite_reward_usdt', '100', '邀请奖励USDT金额'),
('min_withdraw_usdt', '10', '最小提现USDT'),
('withdraw_audit_threshold', '1000', '提现审核阈值USDT'),
('kyc_required_for_withdraw', '0', '提现是否需要实名认证: 0-否 1-是');

-- 初始化支付方式配置
INSERT INTO payment_configs (method, method_type, name, address, network, min_amount, max_amount, fee_rate, fee_fixed, status, sort_order) VALUES
('USDT', 'crypto', 'USDT (TRC20)', 'TYMq8Z9bQZ9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9Z9', 'TRC20', 10, 100000, 0, 1, 1, 1),
('USDT', 'crypto', 'USDT (ERC20)', '0x1234567890abcdef1234567890abcdef12345678', 'ERC20', 10, 100000, 0, 5, 1, 2),
('BTC', 'crypto', 'Bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', NULL, 0.001, 100, 0, 0.0005, 1, 3),
('ETH', 'crypto', 'Ethereum', '0xabcdef1234567890abcdef1234567890abcdef12', NULL, 0.01, 1000, 0, 0.005, 1, 4),
('USDC', 'crypto', 'USDC (ERC20)', '0xabcdef1234567890abcdef1234567890abcdef13', 'ERC20', 10, 100000, 0, 3, 1, 5),
('hkb', 'hkb', '香港银行卡', '012-1234567-890', NULL, 100, 1000000, 0, 0, 1, 6),
('usd', 'bank', '美元电汇', 'SWIFT: CHASUS33
Account: 1234567890', NULL, 500, 500000, 0.001, 25, 1, 7);
