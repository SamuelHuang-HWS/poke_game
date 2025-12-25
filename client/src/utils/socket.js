// client/src/utils/socket.js
import { io } from "socket.io-client";

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1秒
    this.isReconnecting = false;
  }

  /**
   * 连接Socket.IO服务器
   * @param {string} url 服务器地址
   * @param {Object} options 连接选项
   */
  connect(url, options = {}) {
    // 如果已经连接，则先断开
    if (this.socket) {
      this.disconnect();
    }

    // 创建Socket连接
    this.socket = io(url, {
      transports: ["websocket"],
      ...options,
    });

    // 连接事件监听
    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0; // 重置重连次数
      this.isReconnecting = false;
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      if (reason === "io server disconnect") {
        // 服务器断开连接，需要手动重连
        this.reconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket.IO连接错误:", error);
      this.isConnected = false;
    });

    // 添加更多调试事件监听
    this.socket.on("connect_timeout", (timeout) => {});

    this.socket.on("error", (error) => {
      console.error("Socket.IO错误:", error);
    });

    this.socket.on("reconnect", (attempt) => {});

    this.socket.on("reconnect_attempt", (attempt) => {});

    this.socket.on("reconnecting", (delay, attempt) => {});

    this.socket.on("reconnect_error", (error) => {
      console.error("Socket.IO重新连接错误:", error);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("Socket.IO重新连接失败");
    });

    return this.socket;
  }

  /**
   * 断开Socket连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * 发送事件
   * @param {string} event 事件名称
   * @param {any} data 数据
   */
  emit(event, data) {
    if (!this.isConnected) {
      console.warn("Socket未连接，无法发送事件:", event);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * 监听事件
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn("Socket未初始化，无法监听事件:", event);
      return;
    }

    this.socket.on(event, callback);
  }

  /**
   * 移除事件监听
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  off(event, callback) {
    if (!this.socket) {
      return;
    }

    this.socket.off(event, callback);
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return {
      connected: this.isConnected,
      id: this.socket ? this.socket.id : null,
    };
  }

  /**
   * 延迟函数
   * @param {number} ms 延迟毫秒数
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 重连
   */
  async reconnect() {
    if (this.isReconnecting) return;

    this.isReconnecting = true;

    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.delay(this.reconnectDelay);

        // 尝试重新连接
        if (this.socket.disconnected) {
          this.socket.connect();
        }

        // 等待连接成功
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Reconnect timeout"));
          }, 5000);

          this.socket.once("connect", () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        this.isReconnecting = false;
        return;
      } catch (error) {
        this.reconnectAttempts++;
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // 最大延迟30秒
      }
    }

    this.isReconnecting = false;
  }
}

// 导出单例实例
export default new SocketManager();
