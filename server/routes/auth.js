/*
 * @Author: Wensong Huang wensong.huang@eeoa.com
 * @Date: 2025-12-19 18:28:48
 * @LastEditors: Wensong Huang wensong.huang@eeoa.com
 * @LastEditTime: 2025-12-22 13:55:26
 * @FilePath: /poke_game/server/routes/auth.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// server/routes/auth.js
const express = require("express");
const { authenticate } = require("../middleware/auth");
const { validateRegister, validateLogin } = require("../middleware/validation");
const {
  register,
  login,
  getProfile,
  updateProfile,
  checkAuth,
} = require("../controllers/authController");

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post("/register", validateRegister, register);

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post("/login", validateLogin, login);

/**
 * @route GET /api/auth/profile
 * @desc 获取用户信息
 * @access Private
 */
router.get("/profile", authenticate, getProfile);

/**
 * @route PUT /api/auth/profile
 * @desc 更新用户信息
 * @access Private
 */
router.put("/profile", authenticate, updateProfile);

/**
 * @route GET /api/auth/check
 * @desc 检查用户认证状态
 * @access Private
 */
router.get("/check", authenticate, checkAuth);

module.exports = router;
