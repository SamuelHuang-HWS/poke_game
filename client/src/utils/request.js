// client/src/utils/request.js
import axios from "axios";
import authUtils from "./auth";
import { useAuthStore } from "@/stores/auth";

// 创建axios实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api",
  timeout: 10000,
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 添加认证token
    const token = authUtils.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { response } = error;

    // 如果是401错误，说明认证失败
    if (response && response.status === 401) {
      // 获取认证存储实例
      const authStore = useAuthStore();

      // 清除认证信息
      authStore.logout();

      // 重定向到登录页
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default service;
