const mysql = require('mysql2/promise');
const redis = require('redis');

// MySQL连接池
let pool = null;

// Redis客户端
let redisClient = null;

// 初始化MySQL
const initMySQL = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root123456',
      database: process.env.DB_NAME || 'okx_sim',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // 测试连接
    const connection = await pool.getConnection();
    console.log('✅ MySQL连接成功');
    connection.release();
    
    return pool;
  } catch (err) {
    console.error('❌ MySQL连接失败:', err.message);
    throw err;
  }
};

// 初始化Redis
const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis错误:', err);
    });

    await redisClient.connect();
    console.log('✅ Redis连接成功');
    
    return redisClient;
  } catch (err) {
    console.error('❌ Redis连接失败:', err.message);
    // Redis非必需，失败不阻塞
    return null;
  }
};

// MySQL查询
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('MySQL查询错误:', err);
    throw err;
  }
};

// 获取单行
const getOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

// 执行SQL（插入/更新/删除）
const execute = async (sql, params = []) => {
  try {
    const [result] = await pool.execute(sql, params);
    return {
      lastID: result.insertId,
      changes: result.affectedRows
    };
  } catch (err) {
    console.error('MySQL执行错误:', err);
    throw err;
  }
};

// 插入数据
const insert = async (sql, params = []) => {
  const result = await execute(sql, params);
  return result.lastID;
};

// 更新数据
const update = async (sql, params = []) => {
  const result = await execute(sql, params);
  return result.changes;
};

// ========== Redis缓存方法 ==========

// 设置缓存
const setCache = async (key, value, expireSeconds = 300) => {
  if (!redisClient) return;
  try {
    await redisClient.setEx(key, expireSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('Redis设置缓存失败:', err);
  }
};

// 获取缓存
const getCache = async (key) => {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error('Redis获取缓存失败:', err);
    return null;
  }
};

// 删除缓存
const delCache = async (key) => {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error('Redis删除缓存失败:', err);
  }
};

// 初始化数据库
const initDatabase = async () => {
  await initMySQL();
  await initRedis();
};

module.exports = {
  pool,
  get pool() { return pool; },
  query,
  getOne,
  execute,
  insert,
  update,
  setCache,
  getCache,
  delCache,
  initDatabase,
  getRedisClient: () => redisClient
};