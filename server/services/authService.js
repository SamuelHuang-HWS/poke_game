// server/services/authService.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/constants");

class AuthService {
  /**
   * 用户注册
   * @param {string} username 用户名
   * @param {string} phoneNumber 手机号
   * @param {string} password 密码
   * @param {string} deviceId 设备ID
   * @returns {Object} 用户信息和token
   */
  async register(username, phoneNumber, password, deviceId) {
    // 检查手机号是否已注册
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      throw new Error("该手机号已被注册");
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ nickname: username });
    if (existingUsername) {
      throw new Error("该用户名已被使用");
    }

    // 创建新用户
    const user = new User({
      nickname: username,
      phoneNumber,
      password,
      deviceId,
    });

    await user.save();

    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        nickname: user.nickname,
        avatar: user.avatar,
        gold: user.gold,
      },
      token,
    };
  }

  /**
   * 用户登录
   * @param {string} phoneNumber 手机号或用户名
   * @param {string} password 密码
   * @param {string} deviceId 设备ID
   * @returns {Object} 用户信息和token
   */
  async login(phoneNumber, password, deviceId) {
    // 查找用户（支持手机号或用户名）
    let user = await User.findOne({ phoneNumber });

    // 如果没找到且是管理员账户，尝试通过特殊用户名查找
    if (!user && phoneNumber === "adminhws") {
      user = await User.findOne({ phoneNumber: "adminhws" });
    }

    if (!user) {
      throw new Error("用户不存在");
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("密码错误");
    }

    // 检查同设备防多开
    if (deviceId && user.deviceId && user.deviceId !== deviceId) {
      throw new Error("该账号已在其他设备登录");
    }

    // 更新设备ID
    if (deviceId && user.deviceId !== deviceId) {
      user.deviceId = deviceId;
      await user.save();
    }

    // 更新最后登录时间
    await user.updateLastLogin();

    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id, phoneNumber: user.phoneNumber },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        nickname: user.nickname,
        avatar: user.avatar,
        gold: user.gold,
      },
      token,
    };
  }

  /**
   * 验证JWT token
   * @param {string} token JWT token
   * @returns {Object} 解码后的用户信息
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error("无效的token");
    }
  }

  /**
   * 根据ID获取用户信息
   * @param {string} userId 用户ID
   * @returns {Object} 用户信息
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    return {
      id: user._id,
      phoneNumber: user.phoneNumber,
      nickname: user.nickname,
      avatar: user.avatar,
      gold: user.gold,
    };
  }

  /**
   * 更新用户信息
   * @param {string} userId 用户ID
   * @param {Object} updateData 更新数据
   * @returns {Object} 更新后的用户信息
   */
  async updateUser(userId, updateData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error("用户不存在");
    }

    return {
      id: user._id,
      phoneNumber: user.phoneNumber,
      nickname: user.nickname,
      avatar: user.avatar,
      gold: user.gold,
    };
  }
}

module.exports = new AuthService();
