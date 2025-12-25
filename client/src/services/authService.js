// client/src/services/authService.js
import request from "@/utils/request";

class AuthService {
  /**
   * 用户注册
   * @param {string} username 用户名
   * @param {string} phoneNumber 手机号
   * @param {string} password 密码
   * @returns {Promise} 注册结果
   */
  async register(username, phoneNumber, password) {
    return request.post("/auth/register", { username, phoneNumber, password });
  }

  /**
   * 用户登录
   * @param {Object} data 登录数据
   * @returns {Promise} 登录结果
   */
  async login(data) {
    return request.post("/auth/login", data);
  }

  /**
   * 获取用户信息
   * @returns {Promise} 用户信息
   */
  async getProfile() {
    return request.get("/auth/profile");
  }

  /**
   * 检查用户认证状态
   * @returns {Promise} 认证状态和用户信息
   */
  async checkAuth() {
    return request.get("/auth/check");
  }

  /**
   * 更新用户信息
   * @param {Object} data 更新数据
   * @returns {Promise} 更新结果
   */
  async updateProfile(data) {
    return request.put("/auth/profile", data);
  }
}

// 导出单例实例
export default new AuthService();
