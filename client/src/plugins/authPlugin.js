/*
 * @Author: Wensong Huang wensong.huang@eeoa.com
 * @Date: 2025-12-22 20:38:55
 * @LastEditors: Wensong Huang wensong.huang@eeoa.com
 * @LastEditTime: 2025-12-22 20:45:50
 * @FilePath: /poke_game/client/src/plugins/authPlugin.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// client/src/plugins/authPlugin.js
import authUtils from "@/utils/auth";

// 认证插件
export const authPlugin = {
  // 插件安装方法
  install(app, options) {
    // 添加全局属性
    app.config.globalProperties.$auth = {
      // 检查是否已认证
      isAuthenticated() {
        return authUtils.isAuthenticated();
      },

      // 获取用户信息
      getUserInfo() {
        return authUtils.getUserInfo();
      },

      // 登出
      logout() {
        authUtils.clearAuth();
        // 重定向到登录页
        window.location.href = "/login";
      },
    };

    // 提供组合式API钩子
    app.provide("$auth", app.config.globalProperties.$auth);
  },
};

// 组合式API钩子
export function useAuth() {
  const isAuthenticated = () => authUtils.isAuthenticated();
  const getUserInfo = () => authUtils.getUserInfo();
  const logout = () => {
    authUtils.clearAuth();
    window.location.href = "/login";
  };

  return {
    isAuthenticated,
    getUserInfo,
    logout,
  };
}
