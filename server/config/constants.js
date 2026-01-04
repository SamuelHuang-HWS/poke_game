/*
 * @Author: Wensong Huang wensong.huang@eeoa.com
 * @Date: 2025-12-19 18:24:48
 * @LastEditors: Wensong Huang wensong.huang@eeoa.com
 * @LastEditTime: 2025-12-26 13:13:27
 * @FilePath: /poke_game/server/config/constants.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// server/config/constants.js
module.exports = {
  // JWT配置
  JWT_SECRET: process.env.JWT_SECRET || "poke-game-jwt-secret",
  JWT_EXPIRES_IN: "24h",

  // 数据库配置
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/pokegame",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",

  // 游戏配置
  GAME_CONFIG: {
    MIN_ROOM_PLAYERS: 2,
    MAX_ROOM_PLAYERS: 5,
    DEFAULT_ROOM_ROUNDS: 10,
    MIN_ROOM_ROUNDS: 5,
    MAX_ROOM_ROUNDS: 30,
    MAX_BETTING_ROUNDS: 15,
    PLAYER_ACTION_TIMEOUT: 30,
  },

  // 房间状态
  ROOM_STATUS: {
    WAITING: "waiting", // 等待玩家
    PLAYING: "playing", // 游戏中
    FINISHED: "finished", // 已结束
  },

  // 游戏状态
  GAME_STATUS: {
    WAITING: "waiting", // 等待开始
    BETTING: "betting", // 下注阶段
    COMPARING: "comparing", // 比牌阶段
    SETTLED: "settled", // 已结算
    FINISHED: "finished", // 游戏结束
  },

  // 玩家状态
  PLAYER_STATUS: {
    WAITING: "waiting", // 等待
    PLAYING: "playing", // 游戏中
    FOLDED: "folded", // 已弃牌
    LOST: "lost", // 输了
    WINNER: "winner", // 赢家
  },

  // 牌型
  CARD_TYPES: {
    SINGLE: 1, // 单张
    PAIR: 2, // 对子
    STRAIGHT: 3, // 顺子
    FLUSH: 4, // 同花
    FULL_HOUSE: 5, // 同花顺
    THREE: 6, // 豹子
  },
};
