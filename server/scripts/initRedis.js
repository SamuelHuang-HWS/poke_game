// server/scripts/initRedis.js
/**
 * Redis初始化脚本
 * 用于初始化Redis缓存配置和初始数据
 */

const redisClient = require('../config/redis');

/**
 * 初始化Redis配置
 */
async function initRedis() {
  console.log('开始初始化Redis缓存...');
  
  try {
    // 连接Redis
    await redisClient.connect();
    
    // 设置系统配置
    await redisClient.set('system:status', 'online');
    await redisClient.set('system:version', '1.0.0');
    
    console.log('✓ Redis缓存初始化完成');
    
    // 断开连接
    await redisClient.disconnect();
    console.log('✓ Redis连接已断开');
    
    console.log('Redis初始化完成！');
  } catch (error) {
    console.error('Redis初始化失败:', error);
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  await initRedis();
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  initRedis
};