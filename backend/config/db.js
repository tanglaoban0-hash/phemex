// 数据库代理 - 自动选择 SQLite 或 MySQL
const useMySQL = process.env.USE_MYSQL === 'true';

if (useMySQL) {
  console.log('📊 使用 MySQL + Redis 数据库');
  module.exports = require('./database-mysql');
} else {
  console.log('📊 使用 SQLite 数据库');
  module.exports = require('./database');
}