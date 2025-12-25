// server/config/db.js
const mongoose = require('mongoose');
const redisClient = require('./redis');
const { MONGODB_URI } = require('./constants');

class DatabaseManager {
  /**
   * 连接所有数据库
   */
  async connectAll() {
    try {
      // 连接MongoDB
      await this.connectMongoDB();
      
      // 连接Redis
      await this.connectRedis();
      
      console.log('所有数据库连接成功');
    } catch (error) {
      console.error('数据库连接失败:', error);
      process.exit(1);
    }
  }

  /**
   * 连接MongoDB
   */
  async connectMongoDB() {
    try {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB数据库连接成功');
      
      // 连接事件监听
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB连接错误:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB连接断开');
      });
    } catch (error) {
      console.error('MongoDB数据库连接失败:', error);
      throw error;
    }
  }

  /**
   * 连接Redis
   */
  async connectRedis() {
    try {
      await redisClient.connect();
    } catch (error) {
      console.error('Redis连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开所有数据库连接
   */
  async disconnectAll() {
    try {
      // 断开MongoDB连接
      await mongoose.disconnect();
      console.log('MongoDB数据库连接已断开');
      
      // 断开Redis连接
      await redisClient.disconnect();
    } catch (error) {
      console.error('数据库断开连接失败:', error);
    }
  }

  /**
   * 获取MongoDB连接状态
   */
  getMongoDBStatus() {
    return mongoose.connection.readyState;
  }

  /**
   * 获取Redis连接状态
   */
  getRedisStatus() {
    return redisClient.isConnected;
  }
}

// 导出单例实例
module.exports = new DatabaseManager();