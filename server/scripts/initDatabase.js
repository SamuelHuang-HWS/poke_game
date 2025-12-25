// server/scripts/initDatabase.js
/**
 * 数据库初始化脚本
 * 用于创建必要的数据库索引和初始数据
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Room = require("../models/Room");
const Game = require("../models/Game");

/**
 * 初始化MongoDB数据库
 */
async function initMongoDB() {
  console.log("开始初始化MongoDB数据库...");

  try {
    // 创建用户模型索引
    await User.collection.createIndex({ phoneNumber: 1 }, { unique: true });
    await User.collection.createIndex({ deviceId: 1 });
    console.log("✓ 用户模型索引创建完成");

    // 创建房间模型索引
    await Room.collection.createIndex({ roomId: 1 }, { unique: true });
    await Room.collection.createIndex({ creator: 1 });
    await Room.collection.createIndex({ status: 1 });
    console.log("✓ 房间模型索引创建完成");

    // 创建游戏模型索引
    await Game.collection.createIndex({ roomId: 1, round: 1 });
    console.log("✓ 游戏模型索引创建完成");

    console.log("MongoDB数据库初始化完成");
  } catch (error) {
    console.error("MongoDB数据库初始化失败:", error);
    throw error;
  }
}

/**
 * 创建初始管理员用户
 */
async function createAdminUser() {
  try {
    const adminExists = await User.findOne({ phoneNumber: "13800138000" });
    if (adminExists) {
      console.log("✓ 管理员用户已存在");
      return;
    }

    const adminUser = new User({
      phoneNumber: "13800138000",
      password: "admin123",
      nickname: "管理员",
      gold: 100000,
    });

    await adminUser.save();
    console.log("✓ 管理员用户创建完成");
  } catch (error) {
    console.error("管理员用户创建失败:", error);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 连接数据库
    const { MONGODB_URI } = require("../config/constants");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✓ 数据库连接成功");

    // 初始化数据库
    await initMongoDB();

    // 创建管理员用户
    await createAdminUser();

    // 断开连接
    await mongoose.disconnect();
    console.log("✓ 数据库连接已断开");

    console.log("数据库初始化完成！");
  } catch (error) {
    console.error("数据库初始化失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  initMongoDB,
  createAdminUser,
};
