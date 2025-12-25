// server/scripts/setup.js
/**
 * 项目初始化脚本
 * 用于一次性设置项目所需的所有数据库和缓存
 */

const { initMongoDB, createAdminUser } = require('./initDatabase');
const { initRedis } = require('./initRedis');
const mongoose = require('mongoose');

/**
 * 完整的项目初始化
 */
async function setupProject() {
  console.log('开始初始化炸金花游戏平台...');
  
  try {
    // 连接MongoDB
    await mongoose.connect('mongodb://localhost:27017/pokegame', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ MongoDB连接成功');
    
    // 初始化MongoDB数据库
    await initMongoDB();
    
    // 创建管理员用户
    await createAdminUser();
    
    // 断开MongoDB连接
    await mongoose.disconnect();
    console.log('✓ MongoDB连接已断开');
    
    // 初始化Redis
    await initRedis();
    
    console.log('\n🎉 项目初始化完成！');
    console.log('\n默认管理员账户:');
    console.log('手机号: 13800138000');
    console.log('密码: admin123');
    console.log('\n请记得在生产环境中修改默认密码！');
    
  } catch (error) {
    console.error('项目初始化失败:', error);
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  // 检查是否确认执行
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('⚠️  此操作将会初始化数据库，确定继续吗？(y/N): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await setupProject();
    } else {
      console.log('操作已取消');
    }
    rl.close();
  });
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  setupProject
};