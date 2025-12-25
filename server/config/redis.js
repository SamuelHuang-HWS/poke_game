// server/config/redis.js
const redis = require('redis');
const { REDIS_URL } = require('./constants');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * 连接Redis
   */
  async connect() {
    try {
      this.client = redis.createClient({
        url: REDIS_URL
      });

      this.client.on('error', (err) => {
        console.error('Redis连接错误:', err);
      });

      this.client.on('connect', () => {
        console.log('Redis连接成功');
      });

      this.client.on('ready', () => {
        console.log('Redis准备就绪');
        this.isConnected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Redis连接已断开');
    }
  }

  /**
   * 设置键值对
   * @param {string} key 键
   * @param {string} value 值
   * @param {number} expire 过期时间（秒）
   */
  async set(key, value, expire = 0) {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      if (expire > 0) {
        await this.client.setEx(key, expire, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Redis设置失败:', error);
      throw error;
    }
  }

  /**
   * 获取值
   * @param {string} key 键
   * @returns {string} 值
   */
  async get(key) {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis获取失败:', error);
      throw error;
    }
  }

  /**
   * 删除键
   * @param {string} key 键
   */
  async del(key) {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis删除失败:', error);
      throw error;
    }
  }

  /**
   * 检查键是否存在
   * @param {string} key 键
   * @returns {boolean} 是否存在
   */
  async exists(key) {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis检查失败:', error);
      throw error;
    }
  }

  /**
   * 设置哈希字段
   * @param {string} key 键
   * @param {string} field 字段
   * @param {string} value 值
   */
  async hset(key, field, value) {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      await this.client.hSet(key, field, value);
    } catch (error) {
      console.error('Redis HSET失败:', error);
      throw error;
    }
  }

  /**
   * 获取哈希字段值
   * @param {string} key 键
   * @param {string} field 字段
   * @returns {string} 值
   */
  async hget(key, field) {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      console.error('Redis HGET失败:', error);
      throw error;
    }
  }

  /**
   * 删除哈希字段
   * @param {string} key 键
   * @param {string} field 字段
   */
  async hdel(key, field) {
    if (!this.isConnected) {
      throw new Error('Redis未连接');
    }

    try {
      await this.client.hDel(key, field);
    } catch (error) {
      console.error('Redis HDEL失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
module.exports = new RedisClient();