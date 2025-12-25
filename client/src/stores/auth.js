// client/src/stores/auth.js
import { defineStore } from "pinia";
import authService from "@/services/authService";
import authUtils from "@/utils/auth";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    token: authUtils.getToken() || null,
    isAuthenticated: false,
    lastCheckTime: 0, // 上次检查时间
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
  },

  actions: {
    /**
     * 用户注册
     */
    async register(username, phoneNumber, password, deviceId) {
      try {
        const response = await authService.register(
          username,
          phoneNumber,
          password
        );

        const { user, token } = response.data;

        this.user = user;
        this.token = token;
        this.isAuthenticated = true;
        this.lastCheckTime = Date.now();

        // 保存token到localStorage
        authUtils.setToken(token);

        return response;
      } catch (error) {
        throw error;
      }
    },

    /**
     * 用户登录
     */
    async login(phoneNumber, password, deviceId) {
      try {
        const response = await authService.login({
          phoneNumber,
          password,
          deviceId,
        });

        // 从response.data.data中获取user和token
        const { user, token } = response.data.data;

        this.user = user;
        this.token = token;
        this.isAuthenticated = true;
        this.lastCheckTime = Date.now();

        // 保存token到localStorage
        authUtils.setToken(token);

        return response;
      } catch (error) {
        throw error;
      }
    },

    /**
     * 获取用户信息
     */
    async fetchUser() {
      if (!this.token) return;

      try {
        const response = await authService.getProfile();

        // 从response.data.data中获取用户信息
        this.user = response.data.data;
        this.isAuthenticated = true;
        this.lastCheckTime = Date.now();

        // 保存用户信息到localStorage
        authUtils.setUserInfo(response.data.data);

        return response;
      } catch (error) {
        // Token无效，清除认证信息
        this.logout();
        throw error;
      }
    },

    /**
     * 更新用户信息
     */
    async updateUser(userData) {
      try {
        const response = await authService.updateProfile(userData);

        // 从response.data.data中获取用户信息
        this.user = response.data.data;
        this.lastCheckTime = Date.now();

        // 更新localStorage中的用户信息
        authUtils.setUserInfo(response.data.data);

        return response;
      } catch (error) {
        throw error;
      }
    },

    /**
     * 用户登出
     */
    logout() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.lastCheckTime = 0;

      // 清除localStorage中的认证信息
      authUtils.clearAuth();
    },

    /**
     * 检查用户认证状态（智能验证）
     */
    async checkAuth(force = false) {
      // 如果没有token，直接返回
      if (!this.token) {
        this.logout();
        return false;
      }

      // 如果不是强制检查，且上次检查时间在5分钟内，且本地验证通过，则认为已认证
      const fiveMinutes = 5 * 60 * 1000;
      if (
        !force &&
        Date.now() - this.lastCheckTime < fiveMinutes &&
        authUtils.isAuthenticated()
      ) {
        return true;
      }

      try {
        // 进行服务器验证
        const response = await authService.checkAuth();

        // 从response.data.data中获取用户信息
        this.user = response.data.data;
        this.isAuthenticated = true;
        this.lastCheckTime = Date.now();

        // 保存用户信息到localStorage
        authUtils.setUserInfo(response.data.data);

        return true;
      } catch (error) {
        // Token无效，清除认证信息
        this.logout();
        return false;
      }
    },
  },
});
