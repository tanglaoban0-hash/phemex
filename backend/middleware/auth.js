const jwt = require('jsonwebtoken');
const { error } = require('../utils/helpers');

// 用户认证中间件
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(error('请先登录', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json(error('登录已过期，请重新登录', 401));
  }
};

// 管理员认证中间件
const adminAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(error('请先登录', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.isAdmin) {
      return res.status(403).json(error('无权限访问', 403));
    }

    req.adminId = decoded.adminId;
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json(error('登录已过期，请重新登录', 401));
  }
};

// 可选认证（不强制要求登录）
const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.user = decoded;
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = { auth, adminAuth, optionalAuth };
