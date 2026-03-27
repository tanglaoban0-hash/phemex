const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// SQLite 数据库路径 - 使用 /tmp 目录确保容器环境可写
const isRender = process.env.RENDER || process.env.PORT;
const dbPath = isRender 
  ? '/tmp/database.sqlite' 
  : path.join(__dirname, '../data/database.sqlite');

// 确保数据目录存在（非 Render 环境）
if (!isRender) {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const db = new sqlite3.Database(dbPath);

// Promise 封装
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const execute = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const getOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

// 插入数据，返回 lastID
const insert = async (sql, params = []) => {
  const result = await execute(sql, params);
  return result.lastID;
};

// 更新数据，返回 changes
const update = async (sql, params = []) => {
  const result = await execute(sql, params);
  return result.changes;
};

// 初始化数据库
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        phone TEXT,
        real_name TEXT,
        id_card TEXT,
        avatar TEXT,
        fund_password TEXT,
        status INTEGER DEFAULT 1,
        kyc_status INTEGER DEFAULT 0,
        invite_code TEXT UNIQUE,
        invited_by INTEGER,
        last_login_at DATETIME,
        last_login_ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        decimals INTEGER DEFAULT 8,
        is_base INTEGER DEFAULT 0,
        status INTEGER DEFAULT 1,
        min_withdraw REAL DEFAULT 0,
        withdraw_fee REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        coin_id INTEGER NOT NULL,
        available REAL DEFAULT 0,
        frozen REAL DEFAULT 0,
        total_recharge REAL DEFAULT 0,
        total_withdraw REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, coin_id)
      );

      CREATE TABLE IF NOT EXISTS trading_pairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        base_coin_id INTEGER NOT NULL,
        quote_coin_id INTEGER NOT NULL,
        price REAL DEFAULT 0,
        price_change_24h REAL DEFAULT 0,
        high_24h REAL DEFAULT 0,
        low_24h REAL DEFAULT 0,
        volume_24h REAL DEFAULT 0,
        min_amount REAL DEFAULT 0,
        price_precision INTEGER DEFAULT 2,
        amount_precision INTEGER DEFAULT 4,
        status INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        pair_id INTEGER NOT NULL,
        type INTEGER NOT NULL,
        side INTEGER NOT NULL,
        price REAL,
        amount REAL NOT NULL,
        filled_amount REAL DEFAULT 0,
        filled_total REAL DEFAULT 0,
        avg_price REAL DEFAULT 0,
        fee REAL DEFAULT 0,
        status INTEGER DEFAULT 0,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_no TEXT UNIQUE NOT NULL,
        buy_order_id INTEGER NOT NULL,
        sell_order_id INTEGER NOT NULL,
        buyer_id INTEGER NOT NULL,
        seller_id INTEGER NOT NULL,
        pair_id INTEGER NOT NULL,
        price REAL NOT NULL,
        amount REAL NOT NULL,
        total REAL NOT NULL,
        buy_fee REAL DEFAULT 0,
        sell_fee REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS balance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        coin_id INTEGER NOT NULL,
        type INTEGER NOT NULL,
        amount REAL NOT NULL,
        before_balance REAL NOT NULL,
        after_balance REAL NOT NULL,
        relation_id INTEGER,
        relation_type TEXT,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deposit_no TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        coin_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        tx_hash TEXT,
        from_address TEXT,
        status INTEGER DEFAULT 0,
        audit_by INTEGER,
        audit_at DATETIME,
        audit_remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        withdraw_no TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        coin_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        fee REAL DEFAULT 0,
        real_amount REAL NOT NULL,
        address TEXT NOT NULL,
        tx_hash TEXT,
        status INTEGER DEFAULT 0,
        audit_by INTEGER,
        audit_at DATETIME,
        audit_remark TEXT,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role INTEGER DEFAULT 1,
        status INTEGER DEFAULT 1,
        last_login_at DATETIME,
        last_login_ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        desc TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kline_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pair_id INTEGER NOT NULL,
        period TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pair_id, period, timestamp)
      );

      CREATE TABLE IF NOT EXISTS kyc_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        level INTEGER DEFAULT 1,
        real_name TEXT,
        id_card TEXT,
        id_type TEXT DEFAULT 'id_card',
        country TEXT DEFAULT 'CN',
        id_card_front TEXT,
        id_card_back TEXT,
        id_card_hand TEXT,
        selfie TEXT,
        status INTEGER DEFAULT 0,
        remark TEXT,
        daily_withdraw_limit REAL DEFAULT 0,
        submit_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status INTEGER DEFAULT 0,
        last_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        sender_type INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 秒合约类型表
      CREATE TABLE IF NOT EXISTS option_contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        duration INTEGER NOT NULL,
        profit_rate REAL DEFAULT 0.75,
        min_amount REAL DEFAULT 10,
        max_amount REAL DEFAULT 10000,
        status INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 秒合约订单表
      CREATE TABLE IF NOT EXISTS option_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        pair_id INTEGER NOT NULL,
        contract_id INTEGER NOT NULL,
        direction INTEGER NOT NULL,
        amount REAL NOT NULL,
        start_price REAL NOT NULL,
        end_price REAL DEFAULT NULL,
        profit_rate REAL NOT NULL,
        profit_amount REAL DEFAULT 0,
        status INTEGER DEFAULT 0,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        settled_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 系统盈亏控制配置
      CREATE TABLE IF NOT EXISTS option_control (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL UNIQUE,
        user_profit_rate INTEGER DEFAULT 50,
        total_profit REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 初始化数据
      INSERT OR IGNORE INTO coins (symbol, name, decimals, is_base, status, min_withdraw, withdraw_fee) VALUES
      ('USDT', 'Tether USD', 6, 1, 1, 10, 1),
      ('BTC', 'Bitcoin', 8, 0, 1, 0.001, 0.0005),
      ('ETH', 'Ethereum', 8, 0, 1, 0.01, 0.005),
      ('BNB', 'BNB', 8, 0, 1, 0.1, 0.05);

      INSERT OR IGNORE INTO trading_pairs (symbol, base_coin_id, quote_coin_id, price, price_change_24h, high_24h, low_24h, volume_24h, min_amount, price_precision, amount_precision, status, sort_order) VALUES
      ('BTC/USDT', 2, 1, 65000.00, 2.5, 68000.00, 63000.00, 1250.50, 0.0001, 2, 6, 1, 1),
      ('ETH/USDT', 3, 1, 3500.00, 1.8, 3700.00, 3400.00, 8500.25, 0.001, 2, 5, 1, 2),
      ('BNB/USDT', 4, 1, 580.00, -0.5, 600.00, 570.00, 5000.00, 0.01, 2, 4, 1, 3),
      ('ETH/BTC', 3, 2, 0.0538, 0.8, 0.0550, 0.0520, 120.30, 0.001, 6, 5, 1, 4);

      INSERT OR IGNORE INTO admins (username, password, email, role, status) VALUES
      ('admin', '$2b$10$YourHashedPasswordHere', 'admin@okxsim.com', 1, 1);

      INSERT OR IGNORE INTO system_config (key, value, desc) VALUES
      ('site_name', 'Phemex Pro', '网站名称'),
      ('trading_fee_buy', '0.001', '买入手续费率'),
      ('trading_fee_sell', '0.001', '卖出手续费率'),
      ('register_gift_usdt', '10000', '注册赠送USDT金额'),
      ('invite_reward_usdt', '100', '邀请奖励USDT金额'),
      ('min_withdraw_usdt', '10', '最小提现USDT'),
      ('withdraw_audit_threshold', '1000', '提现审核阈值USDT'),
      ('kyc_required_for_withdraw', '0', '提现是否需要实名认证');

      -- 初始化秒合约类型
      INSERT OR IGNORE INTO option_contracts (name, duration, profit_rate, min_amount, max_amount, status, sort_order) VALUES
      ('30秒', 30, 0.75, 10, 1000, 1, 1),
      ('1分钟', 60, 0.80, 10, 5000, 1, 2),
      ('3分钟', 180, 0.85, 10, 10000, 1, 3),
      ('5分钟', 300, 0.90, 10, 20000, 1, 4);

      -- 初始化当日盈亏控制（默认50%胜率）
      INSERT OR IGNORE INTO option_control (date, user_profit_rate, total_profit) VALUES
      (date('now'), 50, 0);

      -- 创建支付方式配置表
      CREATE TABLE IF NOT EXISTS payment_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT UNIQUE NOT NULL,
        method_type TEXT NOT NULL,
        name TEXT NOT NULL,
        network TEXT,
        min_amount REAL DEFAULT 0,
        max_amount REAL DEFAULT 0,
        fee_rate REAL DEFAULT 0,
        fee_fixed REAL DEFAULT 0,
        address TEXT,
        qr_code TEXT,
        bank_name TEXT,
        account_name TEXT,
        sort_order INTEGER DEFAULT 0,
        status INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 初始化默认支付方式
      INSERT OR IGNORE INTO payment_configs (method, method_type, name, network, min_amount, max_amount, address, sort_order, status) VALUES
      ('usdt_trc20', 'crypto', 'USDT', 'TRC20', 10, 100000, 'TY9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X', 1, 1),
      ('usdt_erc20', 'crypto', 'USDT', 'ERC20', 50, 100000, '0x1234567890abcdef1234567890abcdef12345678', 2, 1),
      ('btc', 'crypto', 'BTC', 'BTC', 0.001, 10, 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 3, 1),
      ('eth', 'crypto', 'ETH', 'ERC20', 0.01, 100, '0xabcdef1234567890abcdef1234567890abcdef12', 4, 1),
      ('bank_card', 'bank', '银行卡', 'CNY', 100, 50000, '6222000000000000000', 5, 1);
    `, async (err) => {
      if (err) reject(err);
      else {
        console.log('✅ SQLite 数据库初始化完成');
        // 执行数据库迁移
        try {
          await migrateDatabase();
          console.log('✅ 数据库迁移完成');
        } catch (migrateErr) {
          console.error('数据库迁移失败:', migrateErr);
        }
        resolve();
      }
    });
  });
};

// 数据库迁移
const migrateDatabase = async () => {
  // 检查并添加 fund_password 字段
  try {
    const columns = await query("PRAGMA table_info(users)");
    const hasFundPassword = columns.some(col => col.name === 'fund_password');
    if (!hasFundPassword) {
      await execute('ALTER TABLE users ADD COLUMN fund_password TEXT');
      console.log('✅ 已添加 fund_password 字段');
    }
  } catch (err) {
    console.error('迁移 fund_password 失败:', err);
  }

  // 创建 deposits 表
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deposit_no TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        coin_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        tx_hash TEXT,
        from_address TEXT,
        status INTEGER DEFAULT 0,
        audit_by INTEGER,
        audit_at DATETIME,
        audit_remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ deposits 表已创建');
  } catch (err) {
    console.error('创建 deposits 表失败:', err);
  }

  // 创建 kyc_verifications 表
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS kyc_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        level INTEGER DEFAULT 1,
        real_name TEXT,
        id_card TEXT,
        id_card_front TEXT,
        id_card_back TEXT,
        selfie TEXT,
        status INTEGER DEFAULT 0,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ kyc_verifications 表已创建');
  } catch (err) {
    console.error('创建 kyc_verifications 表失败:', err);
  }

  // 创建 chat_sessions 表
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status INTEGER DEFAULT 0,
        last_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ chat_sessions 表已创建');
  } catch (err) {
    console.error('创建 chat_sessions 表失败:', err);
  }

  // 创建 chat_messages 表
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        sender_type INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        msg_type TEXT DEFAULT 'text',
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ chat_messages 表已创建');
  } catch (err) {
    console.error('创建 chat_messages 表失败:', err);
  }

  // 修复 chat_messages 表字段
  try {
    const msgCols = await query("PRAGMA table_info(chat_messages)");
    // 如果存在 content 字段但没有 message 字段，需要迁移
    const hasContent = msgCols.some(col => col.name === 'content');
    const hasMessage = msgCols.some(col => col.name === 'message');
    
    if (hasContent && !hasMessage) {
      // 重命名 content 为 message
      await execute('ALTER TABLE chat_messages RENAME COLUMN content TO message');
      console.log('✅ chat_messages 表已重命名 content -> message');
    }
    if (!msgCols.some(col => col.name === 'msg_type')) {
      await execute('ALTER TABLE chat_messages ADD COLUMN msg_type TEXT DEFAULT "text"');
      console.log('✅ chat_messages 表已添加 msg_type 字段');
    }
    if (!msgCols.some(col => col.name === 'sender_id')) {
      await execute('ALTER TABLE chat_messages ADD COLUMN sender_id INTEGER');
      console.log('✅ chat_messages 表已添加 sender_id 字段');
    }
  } catch (err) {
    console.error('修复 chat_messages 字段失败:', err);
  }

  // 修复 chat_sessions 表字段
  try {
    const sessionCols = await query("PRAGMA table_info(chat_sessions)");
    if (!sessionCols.some(col => col.name === 'last_message')) {
      await execute('ALTER TABLE chat_sessions ADD COLUMN last_message TEXT');
      console.log('✅ chat_sessions 表已添加 last_message 字段');
    }
    if (!sessionCols.some(col => col.name === 'admin_id')) {
      await execute('ALTER TABLE chat_sessions ADD COLUMN admin_id INTEGER');
      console.log('✅ chat_sessions 表已添加 admin_id 字段');
    }
    if (!sessionCols.some(col => col.name === 'last_time')) {
      await execute('ALTER TABLE chat_sessions ADD COLUMN last_time DATETIME');
      console.log('✅ chat_sessions 表已添加 last_time 字段');
    }
  } catch (err) {
    console.error('修复 chat_sessions 字段失败:', err);
  }

  // 添加 deposits 表缺失字段
  try {
    const depositCols = await query("PRAGMA table_info(deposits)");
    if (!depositCols.some(col => col.name === 'audit_by')) {
      await execute('ALTER TABLE deposits ADD COLUMN audit_by INTEGER');
      console.log('✅ deposits 表已添加 audit_by 字段');
    }
    if (!depositCols.some(col => col.name === 'audit_at')) {
      await execute('ALTER TABLE deposits ADD COLUMN audit_at DATETIME');
      console.log('✅ deposits 表已添加 audit_at 字段');
    }
    if (!depositCols.some(col => col.name === 'audit_remark')) {
      await execute('ALTER TABLE deposits ADD COLUMN audit_remark TEXT');
      console.log('✅ deposits 表已添加 audit_remark 字段');
    }
  } catch (err) {
    console.error('迁移 deposits 字段失败:', err);
  }

  // 添加 withdrawals 表缺失字段
  try {
    const withdrawCols = await query("PRAGMA table_info(withdrawals)");
    if (!withdrawCols.some(col => col.name === 'audit_by')) {
      await execute('ALTER TABLE withdrawals ADD COLUMN audit_by INTEGER');
      console.log('✅ withdrawals 表已添加 audit_by 字段');
    }
    if (!withdrawCols.some(col => col.name === 'audit_at')) {
      await execute('ALTER TABLE withdrawals ADD COLUMN audit_at DATETIME');
      console.log('✅ withdrawals 表已添加 audit_at 字段');
    }
    if (!withdrawCols.some(col => col.name === 'audit_remark')) {
      await execute('ALTER TABLE withdrawals ADD COLUMN audit_remark TEXT');
      console.log('✅ withdrawals 表已添加 audit_remark 字段');
    }
  } catch (err) {
    console.error('迁移 withdrawals 字段失败:', err);
  }

  // 修复 kyc_verifications 表字段
  try {
    const kycCols = await query("PRAGMA table_info(kyc_verifications)");
    if (!kycCols.some(col => col.name === 'id_type')) {
      await execute('ALTER TABLE kyc_verifications ADD COLUMN id_type TEXT DEFAULT "id_card"');
      console.log('✅ kyc_verifications 表已添加 id_type 字段');
    }
    if (!kycCols.some(col => col.name === 'country')) {
      await execute('ALTER TABLE kyc_verifications ADD COLUMN country TEXT DEFAULT "CN"');
      console.log('✅ kyc_verifications 表已添加 country 字段');
    }
    if (!kycCols.some(col => col.name === 'id_card_hand')) {
      await execute('ALTER TABLE kyc_verifications ADD COLUMN id_card_hand TEXT');
      console.log('✅ kyc_verifications 表已添加 id_card_hand 字段');
    }
    if (!kycCols.some(col => col.name === 'daily_withdraw_limit')) {
      await execute('ALTER TABLE kyc_verifications ADD COLUMN daily_withdraw_limit REAL DEFAULT 0');
      console.log('✅ kyc_verifications 表已添加 daily_withdraw_limit 字段');
    }
    if (!kycCols.some(col => col.name === 'submit_count')) {
      await execute('ALTER TABLE kyc_verifications ADD COLUMN submit_count INTEGER DEFAULT 0');
      console.log('✅ kyc_verifications 表已添加 submit_count 字段');
    }
    if (!kycCols.some(col => col.name === 'verified_at')) {
      await execute('ALTER TABLE kyc_verifications ADD COLUMN verified_at DATETIME');
      console.log('✅ kyc_verifications 表已添加 verified_at 字段');
    }
    if (!kycCols.some(col => col.name === 'reject_reason')) {
      await execute('ALTER TABLE kyc_verifications ADD COLUMN reject_reason TEXT');
      console.log('✅ kyc_verifications 表已添加 reject_reason 字段');
    }
  } catch (err) {
    console.error('修复 kyc_verifications 字段失败:', err);
  }
};

module.exports = {
  db,
  query,
  execute,
  getOne,
  insert,
  update,
  initDatabase
};