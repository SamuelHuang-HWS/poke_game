/*
 * @Author: Wensong Huang wensong.huang@eeoa.com
 * @Date: 2025-12-22 13:53:46
 * @LastEditors: Wensong Huang wensong.huang@eeoa.com
 * @LastEditTime: 2025-12-22 13:59:12
 * @FilePath: /poke_game/scripts/updateAdminUser.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// scripts/updateAdminUser.js
require("dotenv").config();
const mongoose = require("mongoose");

// 使用项目中的配置（修正路径）
const { MONGODB_URI } = require("../server/config/constants");

// 使用项目中的用户模型（修正路径）
const User = require("../server/models/User");

async function updateAdminUser() {
  try {
    // 连接到MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✓ 数据库连接成功");

    // 查找现有管理员用户（手机号为13800138000的用户）
    const adminUser = await User.findOne({ phoneNumber: "13800138000" });

    if (adminUser) {
      console.log("找到现有管理员用户，正在更新...");

      // 更新用户名和密码
      adminUser.phoneNumber = "adminhws";

      // 设置新密码（User模型会自动加密）
      adminUser.password = "hws123456";

      // 更新其他信息
      adminUser.nickname = "管理员hws";

      // 保存更新（User模型的pre-save钩子会自动加密密码）
      await adminUser.save();

      console.log("管理员账户已成功更新:");
      console.log("- 手机号/用户名: adminhws");
      console.log("- 密码: hws123456 (已自动加密存储)");
    } else {
      // 检查是否已经存在adminhws用户
      const existingAdmin = await User.findOne({ phoneNumber: "adminhws" });

      if (existingAdmin) {
        console.log("管理员账户已存在，正在更新密码...");

        // 更新密码
        existingAdmin.password = "hws123456";
        await existingAdmin.save();

        console.log("管理员账户密码已更新:");
        console.log("- 手机号/用户名: adminhws");
        console.log("- 密码: hws123456 (已自动加密存储)");
      } else {
        // 创建新的管理员用户
        console.log("未找到现有管理员用户，正在创建新用户...");

        const newUser = new User({
          phoneNumber: "adminhws",
          password: "hws123456",
          nickname: "管理员hws",
          gold: 100000,
        });

        await newUser.save();
        console.log("新的管理员账户已创建:");
        console.log("- 手机号/用户名: adminhws");
        console.log("- 密码: hws123456 (已自动加密存储)");
      }
    }

    // 断开数据库连接
    await mongoose.disconnect();
    console.log("✓ 数据库连接已断开");
  } catch (error) {
    console.error("更新管理员账户时出错:", error);

    // 确保断开数据库连接
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error("断开数据库连接时出错:", disconnectError);
    }

    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  updateAdminUser();
}

module.exports = updateAdminUser;
