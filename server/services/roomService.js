// server/services/roomService.js
const Room = require("../models/Room");
const User = require("../models/User");
const { ROOM_STATUS, GAME_CONFIG } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");

class RoomService {
  /**
   * 创建房间
   * @param {Object} roomData 房间数据
   * @param {string} creatorId 创建者ID
   * @returns {Object} 房间信息
   */
  async createRoom(roomData, creatorId) {
    // 验证创建者
    const creator = await User.findById(creatorId);
    if (!creator) {
      throw new Error("创建者不存在");
    }

    // 验证单注倍数
    if (![1, 2, 5].includes(roomData.baseBet)) {
      throw new Error("单注倍数必须是1、2或5");
    }

    // 验证房间局数
    if (![10, 20, 50].includes(roomData.totalRounds)) {
      throw new Error("房间局数必须是10、20或50");
    }

    // 处理密码
    const password =
      roomData.password && roomData.password.trim() !== ""
        ? roomData.password.trim()
        : null;
    const hasPassword = password !== null;

    // 创建房间
    const room = new Room({
      roomId: uuidv4().substring(0, 8),
      creator: creatorId,
      baseBet: roomData.baseBet,
      totalRounds: roomData.totalRounds,
      password: password,
      hasPassword: hasPassword,
      currentRound: 0,
      status: ROOM_STATUS.WAITING,
    });

    // 创建者自动加入房间
    room.addPlayer(creator);

    await room.save();

    // 重新查询并填充用户信息
    const populatedRoom = await Room.findById(room._id)
      .populate("creator", "nickname avatar")
      .populate("players.userId", "nickname avatar");

    return this.formatRoom(populatedRoom);
  }

  /**
   * 搜索房间
   * @param {string} roomId 房间号
   * @returns {Object} 房间信息
   */
  async searchRoom(roomId) {
    const room = await Room.findOne({ roomId })
      .populate("creator", "nickname avatar")
      .populate("players.userId", "nickname avatar");

    if (!room) {
      // 房间不存在时返回null，而不是抛出错误
      return null;
    }

    // 只返回房间基本信息，不暴露其他玩家详细信息
    return {
      roomId: room.roomId,
      creator: room.creator,
      baseBet: room.baseBet,
      totalRounds: room.totalRounds,
      currentRound: room.currentRound,
      hasPassword: room.hasPassword,
      playersCount: room.players.length,
      status: room.status,
      createdAt: room.createdAt,
    };
  }

  /**
   * 加入房间
   * @param {string} roomId 房间号
   * @param {string} userId 用户ID
   * @returns {Object} 房间信息
   */
  async joinRoom(roomId, userId, password = null) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      throw new Error("房间不存在");
    }

    const isExistingPlayer = room.players.some((p) => {
      const playerId = p.userId._id
        ? p.userId._id.toString()
        : p.userId.toString();
      return playerId === userId.toString();
    });

    if (!isExistingPlayer && room.status !== ROOM_STATUS.WAITING) {
      throw new Error("房间不在等待状态，无法加入");
    }

    if (!room.verifyPassword(password)) {
      throw new Error("房间密码错误");
    }

    if (!isExistingPlayer) {
      room.addPlayer(user);
    }

    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate("creator", "nickname avatar")
      .populate("players.userId", "nickname avatar");

    return this.formatRoom(populatedRoom);
  }

  /**
   * 离开房间
   * @param {string} roomId 房间号
   * @param {string} userId 用户ID
   * @returns {Object} 房间信息
   */
  async leaveRoom(roomId, userId) {
    // 查找房间
    const room = await Room.findOne({ roomId });
    if (!room) {
      throw new Error("房间不存在");
    }

    // 移除玩家
    room.removePlayer(userId);

    // 如果是创建者离开且房间为空，则删除房间
    if (
      room.creator.toString() === userId.toString() &&
      room.players.length === 0
    ) {
      await room.remove();
      return { deleted: true };
    }

    await room.save();

    return this.formatRoom(room);
  }

  /**
   * 根据房间号获取房间信息
   * @param {string} roomId 房间号
   * @returns {Object} 房间信息
   */
  async getRoomByRoomId(roomId) {
    const room = await Room.findOne({ roomId })
      .populate("creator", "nickname avatar")
      .populate("players.userId", "nickname avatar");

    return room;
  }

  /**
   * 获取房间详情
   * @param {string} roomId 房间号
   * @param {string} userId 用户ID
   * @returns {Object} 房间详细信息
   */
  async getRoomDetail(roomId, userId) {
    const room = await Room.findOne({ roomId })
      .populate("creator", "nickname avatar")
      .populate("players.userId", "nickname avatar");

    if (!room) {
      throw new Error("房间不存在");
    }

    // 格式化房间信息
    const formattedRoom = this.formatRoom(room);

    // 如果是房间内的玩家，返回更多详细信息
    const isPlayer = room.players.some((p) => {
      // Handle both cases: populated user object and ObjectId
      const playerId = p.userId._id
        ? p.userId._id.toString()
        : p.userId.toString();
      return playerId === userId.toString();
    });
    if (isPlayer) {
      formattedRoom.players = room.players.map((player) => ({
        userId: player.userId._id || player.userId,
        nickname: player.userId.nickname || player.nickname,
        avatar: player.userId.avatar || player.avatar,
        seatNumber: player.seatNumber,
        roomGold: player.roomGold,
        isCreator: player.isCreator,
        isReady: player.isReady,
        isFolded: player.isFolded,
        hasSeenCards: player.hasSeenCards,
        status: player.status,
        isSelf: (() => {
          // Handle both cases: populated user object and ObjectId
          const playerId = player.userId._id
            ? player.userId._id.toString()
            : player.userId.toString();
          return playerId === userId.toString();
        })(),
      }));
    }

    return formattedRoom;
  }

  /**
   * 格式化房间信息
   * @param {Object} room 房间对象
   * @returns {Object} 格式化后的房间信息
   */
  formatRoom(room) {
    return {
      roomId: room.roomId,
      creator: room.creator,
      baseBet: room.baseBet,
      totalRounds: room.totalRounds,
      currentRound: room.currentRound,
      hasPassword: room.hasPassword,
      players: room.players.map((player) => ({
        userId: player.userId._id || player.userId,
        nickname:
          player.userId.nickname && player.userId.nickname.trim() !== ""
            ? player.userId.nickname
            : player.nickname || `玩家${room.players.indexOf(player) + 1}`,
        avatar: player.userId.avatar || player.avatar || "",
        seatNumber: player.seatNumber,
        roomGold: player.roomGold,
        isCreator: player.isCreator,
        isReady: player.isReady,
        isFolded: player.isFolded,
        hasSeenCards: player.hasSeenCards,
        status: player.status,
      })),
      observers: room.observers.map((observer) => ({
        userId: observer.userId._id || observer.userId,
        nickname:
          observer.userId.nickname && observer.userId.nickname.trim() !== ""
            ? observer.userId.nickname
            : observer.nickname ||
              `观察者${room.observers.indexOf(observer) + 1}`,
        avatar: observer.userId.avatar || observer.avatar || "",
        joinedAt: observer.joinedAt,
      })),
      status: room.status,
      totalPlayers: room.totalPlayers,
      isFull: room.isFull,
      canStartGame: room.canStartGame,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  /**
   * 获取用户创建的房间列表
   * @param {string} userId 用户ID
   * @returns {Array} 房间列表
   */
  async getUserRooms(userId) {
    const rooms = await Room.find({ creator: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    return rooms.map((room) => this.formatRoom(room));
  }

  /**
   * 切换玩家准备状态
   * @param {string} roomId 房间ID
   * @param {string} userId 用户ID
   * @returns {Object} 更新后的房间信息
   */
  async togglePlayerReadyStatus(roomId, userId) {
    // 查找房间并填充用户信息
    const room = await Room.findOne({ roomId })
      .populate("creator", "nickname avatar")
      .populate("players.userId", "nickname avatar");
    if (!room) {
      throw new Error("房间不存在");
    }

    // 查找并更新玩家准备状态
    const playerIndex = room.players.findIndex((p) => {
      // Handle both cases: populated user object and ObjectId
      const playerId = p.userId._id
        ? p.userId._id.toString()
        : p.userId.toString();
      return playerId === userId;
    });

    if (playerIndex === -1) {
      throw new Error("玩家不在房间内");
    }

    // 切换玩家准备状态
    const newReadyStatus = !room.players[playerIndex].isReady;
    room.players[playerIndex].isReady = newReadyStatus;
    room.players[playerIndex].status = newReadyStatus ? "ready" : "waiting";

    await room.save();

    return this.formatRoom(room);
  }

  /**
   * 更新玩家准备状态
   * @param {string} roomId 房间ID
   * @param {string} userId 用户ID
   * @param {boolean} isReady 是否准备
   * @returns {Object} 更新后的房间信息
   */
  async updatePlayerReadyStatus(roomId, userId, isReady) {
    // 查找房间并填充用户信息
    const room = await Room.findOne({ roomId })
      .populate("creator", "nickname avatar")
      .populate("players.userId", "nickname avatar");
    if (!room) {
      throw new Error("房间不存在");
    }

    // 查找并更新玩家准备状态
    const playerIndex = room.players.findIndex((p) => {
      // Handle both cases: populated user object and ObjectId
      const playerId = p.userId._id
        ? p.userId._id.toString()
        : p.userId.toString();
      return playerId === userId;
    });

    if (playerIndex === -1) {
      throw new Error("玩家不在房间内");
    }

    // 更新玩家准备状态
    room.players[playerIndex].isReady = isReady;
    room.players[playerIndex].status = isReady ? "ready" : "waiting";

    await room.save();

    return this.formatRoom(room);
  }

  /**
   * 从房间中移除玩家
   * @param {string} roomId 房间ID
   * @param {string} userId 用户ID
   * @returns {Object|null} 更新后的房间信息或null（如果房间被删除）
   */
  async removePlayerFromRoom(roomId, userId) {
    // 查找房间并填充用户信息
    const room = await Room.findOne({ roomId })
      .populate("creator", "nickname avatar")
      .populate("players.userId", "nickname avatar");
    if (!room) {
      throw new Error("房间不存在");
    }

    // 查找要移除的玩家
    const playerIndex = room.players.findIndex((p) => {
      // Handle both cases: populated user object and ObjectId
      const playerId = p.userId._id
        ? p.userId._id.toString()
        : p.userId.toString();
      return playerId === userId;
    });

    if (playerIndex === -1) {
      throw new Error("玩家不在房间内");
    }

    // 检查要移除的玩家是否是房主
    const isCreatorLeaving = (() => {
      // Handle both cases: populated user object and ObjectId
      const creatorId = room.creator._id
        ? room.creator._id.toString()
        : room.creator.toString();
      return creatorId === userId;
    })();

    // 移除玩家
    const removedPlayer = room.players.splice(playerIndex, 1)[0];

    // 如果房间没有玩家了，删除整个房间
    if (room.players.length === 0) {
      await Room.deleteOne({ _id: room._id });
      return null;
    }

    // 如果房主离开了，将房主转移给房间中的第一个玩家
    if (isCreatorLeaving) {
      // 将房主转移给第一个剩余的玩家
      const newCreator = room.players[0];
      room.creator = newCreator.userId._id || newCreator.userId;
    }

    await room.save();

    return this.formatRoom(room);
  }

  /**
   * 获取用户参与的活跃房间列表
   * @param {string} userId 用户ID
   * @returns {Array} 房间列表
   */
  async getUserActiveRooms(userId) {
    // 查找用户作为玩家参与的房间（包括观察者）
    const rooms = await Room.find({
      $or: [{ "players.userId": userId }, { "observers.userId": userId }],
      status: { $ne: "finished" }, // 排除已完成的房间
    }).sort({ updatedAt: -1 });

    return rooms.map((room) => this.formatRoom(room));
  }
}

module.exports = new RoomService();
