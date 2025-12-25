// server/models/Room.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { ROOM_STATUS, GAME_CONFIG } = require("../config/constants");

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      unique: true,
      default: () => `ROOM_${uuidv4().substring(0, 8).toUpperCase()}`,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // 单注金额
    betAmount: {
      type: Number,
      required: true,
      min: 50,
    },
    // 房间默认金币（所有玩家初始金币）
    defaultRoomGold: {
      type: Number,
      required: true,
      min: 1000,
      default: 10000,
    },
    // 房间局数
    totalRounds: {
      type: Number,
      required: true,
      min: GAME_CONFIG.MIN_ROOM_ROUNDS,
      max: GAME_CONFIG.MAX_ROOM_ROUNDS,
      default: GAME_CONFIG.DEFAULT_ROOM_ROUNDS,
    },
    // 当前局数
    currentRound: {
      type: Number,
      default: 0,
    },
    // 房间密码（可选）
    password: {
      type: String,
      trim: true,
    },
    // 玩家列表
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
        // 是否准备
        isReady: {
          type: Boolean,
          default: false,
        },
        // 状态
        status: {
          type: String,
          enum: ["waiting", "ready", "playing", "folded", "lost", "winner"],
          default: "waiting",
        },
        // 手牌
        cards: [
          {
            suit: String, // 花色
            rank: Number, // 点数
          },
        ],
        // 是否看牌
        hasSeenCards: {
          type: Boolean,
          default: false,
        },
        // 最后操作时间
        lastActionAt: Date,
      },
    ],
    // 观察者列表
    observers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        nickname: String,
        avatar: String,
        joinedAt: Date,
      },
    ],
    // 房间状态
    status: {
      type: String,
      enum: Object.values(ROOM_STATUS),
      default: ROOM_STATUS.WAITING,
    },
    // 游戏记录
    gameHistory: [
      {
        round: Number,
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
        players: [
          {
            userId: mongoose.Schema.Types.ObjectId,
            nickname: String,
            cards: [
              {
                suit: String,
                rank: Number,
              },
            ],
            cardType: String,
            result: String,
            goldChange: Number,
          },
        ],
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 索引
roomSchema.index({ roomId: 1 });
roomSchema.index({ creator: 1 });
roomSchema.index({ status: 1 });

// 计算房间内总人数
roomSchema.virtual("totalPlayers").get(function () {
  return this.players.length + this.observers.length;
});

// 检查房间是否已满
roomSchema.virtual("isFull").get(function () {
  return this.players.length >= GAME_CONFIG.MAX_ROOM_PLAYERS;
});

// 检查房间是否可以开始游戏
roomSchema.virtual("canStartGame").get(function () {
  return (
    this.players.length >= GAME_CONFIG.MIN_ROOM_PLAYERS &&
    this.status === ROOM_STATUS.WAITING
  );
});

// 添加玩家
roomSchema.methods.addPlayer = function (user, roomGold) {
  // 检查是否已在房间内
  const existingPlayer = this.players.find(
    (p) => p.userId.toString() === user._id.toString()
  );
  if (existingPlayer) {
    throw new Error("玩家已在房间内");
  }

  // 检查房间是否已满
  if (this.isFull) {
    throw new Error("房间已满");
  }

  this.players.push({
    userId: user._id,
    nickname:
      user.nickname && user.nickname.trim() !== ""
        ? user.nickname
        : `玩家${this.players.length + 1}`,
    avatar: user.avatar || "",
    roomGold: roomGold,
    status: "waiting",
  });

  this.updatedAt = new Date();
  return this;
};

// 移除玩家
roomSchema.methods.removePlayer = function (userId) {
  this.players = this.players.filter(
    (p) => p.userId.toString() !== userId.toString()
  );
  this.observers = this.observers.filter(
    (o) => o.userId.toString() !== userId.toString()
  );
  this.updatedAt = new Date();
  return this;
};

// 开始游戏
roomSchema.methods.startGame = function () {
  if (!this.canStartGame) {
    throw new Error("房间无法开始游戏");
  }

  this.status = ROOM_STATUS.PLAYING;
  this.currentRound = 1;
  this.updatedAt = new Date();
  return this;
};

// 结束房间
roomSchema.methods.finishRoom = function () {
  this.status = ROOM_STATUS.FINISHED;
  this.updatedAt = new Date();
  return this;
};

module.exports = mongoose.model("Room", roomSchema);
