const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

// 生成JWT Token
const generateToken = (payload, isAdmin = false) => {
  const expiresIn = isAdmin 
    ? process.env.JWT_ADMIN_EXPIRES_IN || '1d'
    : process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// 验证JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// 生成订单号
const generateOrderNo = () => {
  return 'ORD' + dayjs().format('YYYYMMDD') + uuidv4().substr(0, 8).toUpperCase();
};

// 生成成交号
const generateTradeNo = () => {
  return 'TRD' + dayjs().format('YYYYMMDD') + uuidv4().substr(0, 8).toUpperCase();
};

// 生成提现单号
const generateWithdrawNo = () => {
  return 'WDR' + dayjs().format('YYYYMMDD') + uuidv4().substr(0, 8).toUpperCase();
};

// 生成邀请码
const generateInviteCode = () => {
  return uuidv4().substr(0, 8).toUpperCase();
};

// 格式化金额
const formatAmount = (amount, decimals = 8) => {
  return parseFloat(parseFloat(amount).toFixed(decimals));
};

// 响应封装
const success = (data = null, message = '操作成功') => {
  return { code: 200, message, data };
};

const error = (message = '操作失败', code = 400) => {
  return { code, message, data: null };
};

// 分页参数处理
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const pageSize = Math.min(parseInt(query.pageSize) || 20, 100);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
};

module.exports = {
  generateToken,
  verifyToken,
  generateOrderNo,
  generateTradeNo,
  generateWithdrawNo,
  generateInviteCode,
  formatAmount,
  success,
  error,
  parsePagination
};
