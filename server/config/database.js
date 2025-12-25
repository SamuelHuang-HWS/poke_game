// server/config/database.js
const mongoose = require('mongoose');
const { MONGODB_URI } = require('./constants');

/**
 * 连接MongoDB数据库
 */
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB数据库连接成功');
  } catch (error) {
    console.error('MongoDB数据库连接失败:', error);
    process.exit(1);
  }
}

/**
 * 断开MongoDB数据库连接
 */
async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('MongoDB数据库连接已断开');
  } catch (error) {
    console.error('MongoDB数据库断开连接失败:', error);
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};