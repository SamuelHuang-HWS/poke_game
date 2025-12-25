// client/src/services/gameService.js
import request from '@/utils/request';

class GameService {
  /**
   * 开始游戏
   * @param {Object} data 游戏数据
   * @returns {Promise} 开始结果
   */
  async startGame(data) {
    return request.post('/games/start', data);
  }

  /**
   * 看牌
   * @param {Object} data 看牌数据
   * @returns {Promise} 看牌结果
   */
  async seeCards(data) {
    return request.post('/games/see', data);
  }

  /**
   * 跟注
   * @param {Object} data 跟注数据
   * @returns {Promise} 跟注结果
   */
  async call(data) {
    return request.post('/games/call', data);
  }

  /**
   * 加注
   * @param {Object} data 加注数据
   * @returns {Promise} 加注结果
   */
  async raise(data) {
    return request.post('/games/raise', data);
  }

  /**
   * 弃牌
   * @param {Object} data 弃牌数据
   * @returns {Promise} 弃牌结果
   */
  async fold(data) {
    return request.post('/games/fold', data);
  }

  /**
   * 比牌
   * @param {Object} data 比牌数据
   * @returns {Promise} 比牌结果
   */
  async compare(data) {
    return request.post('/games/compare', data);
  }

  /**
   * 获取游戏详情
   * @param {string} gameId 游戏ID
   * @returns {Promise} 游戏详情
   */
  async getGameDetail(gameId) {
    return request.get(`/games/${gameId}`);
  }
}

// 导出单例实例
export default new GameService();