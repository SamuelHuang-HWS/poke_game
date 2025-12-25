// server/models/Game.js
const mongoose = require("mongoose");
const { CARD_TYPES, GAME_STATUS } = require("../config/constants");

const gameSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    round: {
      type: Number,
      required: true,
    },
    // 游戏状态
    status: {
      type: String,
      enum: Object.values(GAME_STATUS),
      default: GAME_STATUS.WAITING,
    },
    // 底池
    pot: {
      type: Number,
      default: 0,
    },
    // 当前下注轮次
    bettingRound: {
      type: Number,
      default: 1,
    },
    // 当前行动玩家索引
    currentPlayerIndex: {
      type: Number,
      default: 0,
    },
    // 庄家玩家索引
    dealerIndex: {
      type: Number,
      default: 0,
    },
    // 最小下注额
    minBet: {
      type: Number,
      default: 0,
    },
    // 玩家列表（游戏快照）
    players: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        nickname: String,
        avatar: String,
        // 房间内游戏币
        roomGold: {
          type: Number,
          default: 0,
        },
        // 手牌
        cards: [
          {
            suit: String,
            rank: Number,
          },
        ],
        // 是否看牌
        hasSeenCards: {
          type: Boolean,
          default: false,
        },
        // 当前下注额
        currentBet: {
          type: Number,
          default: 0,
        },
        // 总下注额
        totalBet: {
          type: Number,
          default: 0,
        },
        // 状态
        status: {
          type: String,
          enum: ["waiting", "playing", "folded", "lost", "winner"],
          default: "waiting",
        },
      },
    ],
    // 赢家
    winner: {
      userId: mongoose.Schema.Types.ObjectId,
      nickname: String,
      cards: [
        {
          suit: String,
          rank: Number,
        },
      ],
      cardType: String,
      winnings: Number,
    },
    // 游戏结果
    result: {
      type: String,
      enum: ["normal", "all_fold", "timeout"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: Date,
  },
  {
    timestamps: true,
  }
);

// 索引
gameSchema.index({ roomId: 1, round: 1 });

// 开始游戏
gameSchema.methods.startGame = function () {
  this.status = GAME_STATUS.BETTING;
  this.updatedAt = new Date();
  return this;
};

// 结束游戏
gameSchema.methods.endGame = function (winnerData) {
  this.status = GAME_STATUS.SETTLED;
  this.winner = winnerData;
  this.finishedAt = new Date();
  this.updatedAt = new Date();
  return this;
};

// 更新底池
gameSchema.methods.updatePot = function (amount) {
  this.pot += amount;
  this.updatedAt = new Date();
  return this;
};

module.exports = mongoose.model("Game", gameSchema);
