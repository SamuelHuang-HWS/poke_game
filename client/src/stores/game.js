// client/src/stores/game.js
import { defineStore } from "pinia";
import gameService from "@/services/gameService";
import socket from "@/utils/socket";

export const useGameStore = defineStore("game", {
  state: () => ({
    socket: null,
    currentGame: null,
    isConnected: false,
    isLoading: false,
    error: null,
  }),

  getters: {
    isInGame: (state) => !!state.currentGame,
  },

  actions: {
    /**
     * 初始化Socket连接
     */
    initSocket() {
      if (this.socket) return;

      this.socket = socket;
      this.isConnected = socket.getStatus().connected;
    },

    /**
     * 开始游戏
     */
    async startGame(roomId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await gameService.startGame({ roomId });

        this.currentGame = response.data.data;

        return response;
      } catch (error) {
        this.error = error.message || "开始游戏失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 看牌
     */
    async seeCards(gameId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await gameService.seeCards({ gameId });

        this.currentGame = response.data.data;

        return response;
      } catch (error) {
        this.error = error.message || "看牌失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 跟注
     */
    async call(gameId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await gameService.call({ gameId });

        this.currentGame = response.data.data;

        return response;
      } catch (error) {
        this.error = error.message || "跟注失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 加注
     */
    async raise(gameId, amount) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await gameService.raise({
          gameId,
          amount,
        });

        this.currentGame = response.data.data;

        return response;
      } catch (error) {
        this.error = error.message || "加注失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 弃牌
     */
    async fold(gameId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await gameService.fold({ gameId });

        this.currentGame = response.data.data;

        return response;
      } catch (error) {
        this.error = error.message || "弃牌失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 比牌
     */
    async compare(gameId, targetUserId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await gameService.compare({
          gameId,
          targetUserId,
        });

        this.currentGame = response.data.data;

        return response;
      } catch (error) {
        this.error = error.message || "比牌失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 获取游戏详情
     */
    async fetchGameDetail(gameId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await gameService.getGameDetail(gameId);

        this.currentGame = response.data.data;

        return response.data.data;
      } catch (error) {
        this.error = error.message || "获取游戏详情失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 断开Socket连接
     */
    disconnectSocket() {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
      }
    },
  },
});
