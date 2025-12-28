// client/src/stores/room.js
import { defineStore } from "pinia";
import roomService from "@/services/roomService";

export const useRoomStore = defineStore("room", {
  state: () => ({
    rooms: [],
    currentRoom: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    myRooms: (state) => state.rooms,
  },

  actions: {
    /**
     * 创建房间
     */
    async createRoom(roomData) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await roomService.createRoom(roomData);

        this.currentRoom = response.data.data;

        return response;
      } catch (error) {
        this.error = error.message || "创建房间失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 搜索房间
     */
    async searchRoom(roomId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await roomService.searchRoom(roomId);

        return response;
      } catch (error) {
        this.error = error.message || "搜索房间失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 加入房间
     */
    async joinRoom(roomId, password) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await roomService.joinRoom(roomId, password);

        if (response?.data?.data) {
          this.currentRoom = response?.data?.data || "";
          return response;
        } else {
          this.error = response.message || "加入房间失败";
          throw error;
        }
      } catch (error) {
        console.log(error);
        this.error = error.message || "加入房间失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 离开房间
     */
    async leaveRoom(roomId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await roomService.leaveRoom(roomId);

        this.currentRoom = null;

        return response;
      } catch (error) {
        this.error = error.message || "离开房间失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 获取房间详情
     */
    async fetchRoomDetail(roomId) {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await roomService.getRoomDetail(roomId);

        this.currentRoom = response.data.data;

        return response.data.data;
      } catch (error) {
        this.error = error.message || "获取房间详情失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 获取用户创建的房间列表
     */
    async fetchUserRooms() {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await roomService.getUserRooms();

        this.rooms = response.data.data;

        return response.data.data;
      } catch (error) {
        this.error = error.message || "获取房间列表失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 获取用户参与的活跃房间列表
     */
    async fetchUserActiveRooms() {
      try {
        this.isLoading = true;
        this.error = null;

        const response = await roomService.getUserActiveRooms();

        return response.data.data;
      } catch (error) {
        this.error = error.message || "获取活跃房间列表失败";
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
  },
});
