// client/src/utils/auth.js
/**
 * 认证工具类
 */

class AuthManager {
  /**
   * 保存认证令牌
   * @param {string} token JWT令牌
   */
  setToken(token) {
    localStorage.setItem("token", token);
  }

  /**
   * 获取认证令牌
   * @returns {string|null} JWT令牌
   */
  getToken() {
    return localStorage.getItem("token");
  }

  /**
   * 移除认证令牌
   */
  removeToken() {
    localStorage.removeItem("token");
  }

  /**
   * 检查是否已认证（本地验证）
   * @returns {boolean} 是否已认证
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    try {
      // 解析JWT令牌
      const payload = JSON.parse(atob(token.split(".")[1]));
      // 检查是否过期
      return payload.exp * 1000 > Date.now();
    } catch (error) {
      // 令牌格式错误，移除它
      this.removeToken();
      return false;
    }
  }

  /**
   * 获取用户信息（从令牌中解析）
   * @returns {Object|null} 用户信息
   */
  getUserInfo() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        userId: payload.userId,
        phoneNumber: payload.phoneNumber,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 设置用户信息
   * @param {Object} user 用户信息
   */
  setUserInfo(user) {
    localStorage.setItem("userInfo", JSON.stringify(user));
  }

  /**
   * 获取用户信息（从localStorage）
   * @returns {Object|null} 用户信息
   */
  getUserInfoFromStorage() {
    try {
      const userInfo = localStorage.getItem("userInfo");
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 移除用户信息
   */
  removeUserInfo() {
    localStorage.removeItem("userInfo");
  }

  /**
   * 清除所有认证信息
   */
  clearAuth() {
    this.removeToken();
    this.removeUserInfo();
  }
}

// 导出单例实例
export default new AuthManager();
