/*
 * @Author: Wensong Huang wensong.huang@eeoa.com
 * @Date: 2025-12-19 18:48:38
 * @LastEditors: Wensong Huang wensong.huang@eeoa.com
 * @LastEditTime: 2025-12-23 10:24:20
 * @FilePath: /poke_game/client/src/services/roomService.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// client/src/services/roomService.js
import request from "@/utils/request";

class RoomService {
  /**
   * 创建房间
   * @param {Object} data 房间数据
   * @returns {Promise} 创建结果
   */
  async createRoom(data) {
    return request.post("/rooms/create", data);
  }

  /**
   * 搜索房间
   * @param {string} roomId 房间号
   * @returns {Promise} 房间信息
   */
  async searchRoom(roomId) {
    return request.get(`/rooms/search/${roomId}`);
  }

  /**
   * 加入房间
   * @param {string} roomId 房间号
   * @param {string} password 房间密码（可选）
   * @returns {Promise} 加入结果
   */
  async joinRoom(roomId, password) {
    return request.post("/rooms/join", { roomId, password });
  }

  /**
   * 离开房间
   * @param {string} roomId 房间号
   * @returns {Promise} 离开结果
   */
  async leaveRoom(roomId) {
    return request.post(`/rooms/leave/${roomId}`);
  }

  /**
   * 获取房间详情
   * @param {string} roomId 房间号
   * @returns {Promise} 房间详情
   */
  async getRoomDetail(roomId) {
    return request.get(`/rooms/${roomId}`);
  }

  /**
   * 获取用户创建的房间列表
   * @returns {Promise} 房间列表
   */
  async getUserRooms() {
    return request.get("/rooms/user/list");
  }

  /**
   * 获取用户参与的活跃房间列表
   * @returns {Promise} 房间列表
   */
  async getUserActiveRooms() {
    return request.get("/rooms/user/active");
  }
}

// 导出单例实例
export default new RoomService();
