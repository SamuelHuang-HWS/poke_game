// server/models/Room.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { ROOM_STATUS, GAME_CONFIG } = require("../config/constants");

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      unique: true,
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 单注倍数（1倍/2倍/5倍）
    baseBet: {
      type: Number,
      required: true,
      enum: [1, 2, 5],
      default: 1,
    },
    // 房间局数（10局/20局/50局）
    totalRounds: {
      type: Number,
      required: true,
      enum: [10, 20, 50],
      default: 10,
    },
    // 房间密码（可选）
    password: {
      type: String,
      default: null,
    },
    // 是否有密码
    hasPassword: {
      type: Boolean,
      default: false,
    },
    // 当前局数
    currentRound: {
      type: Number,
      default: 0,
    },
    // 当前游戏ID
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Game",
      default: null,
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
        // 座位号
        seatNumber: {
          type: Number,
          required: true,
        },
        // 房间内游戏币
        roomGold: {
          type: Number,
          default: 0,
        },
        // 是否是房主
        isCreator: {
          type: Boolean,
          default: false,
        },
        // 是否已准备
        isReady: {
          type: Boolean,
          default: false,
        },
        // 是否已弃牌
        isFolded: {
          type: Boolean,
          default: false,
        },
        // 是否看牌
        hasSeenCards: {
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
roomSchema.methods.addPlayer = function (user) {
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

  // 分配座位号（按加入顺序）
  const seatNumber = this.players.length + 1;

  this.players.push({
    userId: user._id,
    nickname:
      user.nickname && user.nickname.trim() !== ""
        ? user.nickname
        : `玩家${this.players.length + 1}`,
    avatar: user.avatar || "",
    seatNumber: seatNumber,
    roomGold: 0,
    isCreator: seatNumber === 1,
    isFolded: false,
    hasSeenCards: false,
    status: "waiting",
  });

  this.updatedAt = new Date();
  return this;
};

// 验证房间密码
roomSchema.methods.verifyPassword = function (password) {
  if (!this.hasPassword) {
    return true;
  }
  return this.password === password;
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
