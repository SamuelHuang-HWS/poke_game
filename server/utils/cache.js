// server/utils/cache.js
/**
 * 缓存工具类
 * 提供统一的缓存操作接口
 */

const redisClient = require('../config/redis');

class CacheManager {
  /**
   * 设置用户缓存
   * @param {string} userId 用户ID
   * @param {Object} userData 用户数据
   * @param {number} expire 过期时间（秒）
   */
  async setUserCache(userId, userData, expire = 3600) {
    try {
      const key = `user:${userId}`;
      const value = JSON.stringify(userData);
      await redisClient.set(key, value, expire);
      return true;
    } catch (error) {
      console.error('设置用户缓存失败:', error);
      return false;
    }
  }

  /**
   * 获取用户缓存
   * @param {string} userId 用户ID
   * @returns {Object|null} 用户数据
   */
  async getUserCache(userId) {
    try {
      const key = `user:${userId}`;
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('获取用户缓存失败:', error);
      return null;
    }
  }

  /**
   * 删除用户缓存
   * @param {string} userId 用户ID
   */
  async deleteUserCache(userId) {
    try {
      const key = `user:${userId}`;
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('删除用户缓存失败:', error);
      return false;
    }
  }

  /**
   * 设置房间缓存
   * @param {string} roomId 房间ID
   * @param {Object} roomData 房间数据
   * @param {number} expire 过期时间（秒）
   */
  async setRoomCache(roomId, roomData, expire = 7200) {
    try {
      const key = `room:${roomId}`;
      const value = JSON.stringify(roomData);
      await redisClient.set(key, value, expire);
      return true;
    } catch (error) {
      console.error('设置房间缓存失败:', error);
      return false;
    }
  }

  /**
   * 获取房间缓存
   * @param {string} roomId 房间ID
   * @returns {Object|null} 房间数据
   */
  async getRoomCache(roomId) {
    try {
      const key = `room:${roomId}`;
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('获取房间缓存失败:', error);
      return null;
    }
  }

  /**
   * 删除房间缓存
   * @param {string} roomId 房间ID
   */
  async deleteRoomCache(roomId) {
    try {
      const key = `room:${roomId}`;
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('删除房间缓存失败:', error);
      return false;
    }
  }

  /**
   * 设置在线用户列表
   * @param {Array} userIds 用户ID列表
   */
  async setOnlineUsers(userIds) {
    try {
      const key = 'online_users';
      const value = JSON.stringify(userIds);
      await redisClient.set(key, value, 300); // 5分钟过期
      return true;
    } catch (error) {
      console.error('设置在线用户列表失败:', error);
      return false;
    }
  }

  /**
   * 获取在线用户列表
   * @returns {Array} 用户ID列表
   */
  async getOnlineUsers() {
    try {
      const key = 'online_users';
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('获取在线用户列表失败:', error);
      return [];
    }
  }

  /**
   * 添加在线用户
   * @param {string} userId 用户ID
   */
  async addUserToOnlineList(userId) {
    try {
      const onlineUsers = await this.getOnlineUsers();
      if (!onlineUsers.includes(userId)) {
        onlineUsers.push(userId);
        await this.setOnlineUsers(onlineUsers);
      }
      return true;
    } catch (error) {
      console.error('添加在线用户失败:', error);
      return false;
    }
  }

  /**
   * 从在线用户列表移除用户
   * @param {string} userId 用户ID
   */
  async removeUserFromOnlineList(userId) {
    try {
      const onlineUsers = await this.getOnlineUsers();
      const index = onlineUsers.indexOf(userId);
      if (index > -1) {
        onlineUsers.splice(index, 1);
        await this.setOnlineUsers(onlineUsers);
      }
      return true;
    } catch (error) {
      console.error('移除在线用户失败:', error);
      return false;
    }
  }
}

// 导出单例实例
module.exports = new CacheManager();