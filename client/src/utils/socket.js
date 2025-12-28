// client/src/utils/socket.js
import { io } from "socket.io-client";

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.isReconnecting = false;
    this.currentRoomId = null;
    this.currentUserId = null;
    this.eventListeners = new Map();
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

    this.socket = io(url, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      forceNew: true,
      ...options,
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      if (this.currentRoomId && this.currentUserId) {
        console.log("重连成功，重新加入房间");
        this.emit("user_join", {
          userId: this.currentUserId,
          roomId: this.currentRoomId,
        });
      }
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      console.log("Socket断开连接:", reason);
      if (reason === "io server disconnect") {
        this.reconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket.IO连接错误:", error);
      this.isConnected = false;
    });

    this.socket.on("player_offline", (data) => {
      console.log("玩家离线:", data);
    });

    this.socket.on("player_reconnected", (data) => {
      console.log("玩家重连:", data);
    });

    this.socket.on("creator_changed", (data) => {
      console.log("房主已转移:", data);
    });

    this.socket.on("room_disbanded", (data) => {
      console.log("房间已解散:", data);
      this.currentRoomId = null;
      this.currentUserId = null;
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
      this.currentRoomId = null;
      this.currentUserId = null;
      this.eventListeners.clear();
    }
  }

  setCurrentRoom(roomId, userId) {
    this.currentRoomId = roomId;
    this.currentUserId = userId;
  }

  clearCurrentRoom() {
    this.currentRoomId = null;
    this.currentUserId = null;
  }

  /**
   * 发送事件
   * @param {string} event 事件名称
   * @param {any} data 数据
   */
  emit(event, data) {
    if (!this.isConnected) {
      console.warn("Socket: Not connected, cannot emit event", { event, data });
      return;
    }

    console.log("Socket: Emit", { event, data });
    this.socket.emit(event, data);
  }

  /**
   * 监听事件
   * @param {string} event 事件名称
   * @param {Function} callback 回调函数
   */
  on(event, callback) {
    if (!this.socket) {
      console.warn("Socket: Not initialized, cannot listen to event", {
        event,
      });
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
