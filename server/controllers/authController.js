// server/controllers/authController.js
const authService = require("../services/authService");

/**
 * 用户注册
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function register(req, res) {
  try {
    const { username, phoneNumber, password, deviceId } = req.body;

    const result = await authService.register(
      username,
      phoneNumber,
      password,
      deviceId
    );

    res.status(201).json({
      success: true,
      message: "注册成功",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 用户登录
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function login(req, res) {
  try {
    const { phoneNumber, password, deviceId } = req.body;

    const result = await authService.login(phoneNumber, password, deviceId);

    res.status(200).json({
      success: true,
      message: "登录成功",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 获取用户信息
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getProfile(req, res) {
  try {
    const user = await authService.getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      message: "获取用户信息成功",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 更新用户信息
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function updateProfile(req, res) {
  try {
    const { nickname, avatar } = req.body;
    const updateData = {};

    if (nickname) updateData.nickname = nickname;
    if (avatar) updateData.avatar = avatar;

    const user = await authService.updateUser(req.user.userId, updateData);

    res.status(200).json({
      success: true,
      message: "更新用户信息成功",
      data: user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 检查用户认证状态
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function checkAuth(req, res) {
  try {
    // 如果中间件验证通过，说明用户已认证
    const user = await authService.getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      message: "用户已认证",
      data: user,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "用户未认证",
    });
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  checkAuth,
};
