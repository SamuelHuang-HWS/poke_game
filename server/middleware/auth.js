// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const authService = require('../services/authService');
const { JWT_SECRET } = require('../config/constants');

/**
 * 认证中间件
 * 验证JWT token并设置用户信息
 */
function authenticate(req, res, next) {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '访问令牌缺失' 
      });
    }

    // 验证token
    const decoded = authService.verifyToken(token);
    
    // 设置用户信息到请求对象
    req.user = {
      userId: decoded.userId,
      phoneNumber: decoded.phoneNumber
    };

    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: '无效的访问令牌' 
    });
  }
}

/**
 * 可选认证中间件
 * 如果有token则验证，没有则继续
 */
function optionalAuth(req, res, next) {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token) {
      // 验证token
      const decoded = authService.verifyToken(token);
      
      // 设置用户信息到请求对象
      req.user = {
        userId: decoded.userId,
        phoneNumber: decoded.phoneNumber
      };
    }

    next();
  } catch (error) {
    // token无效，但不影响继续执行
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuth
};