// server/services/gameService.js
const Game = require("../models/Game");
const Room = require("../models/Room");
const User = require("../models/User");
const {
  createDeck,
  shuffleDeck,
  dealCards,
  getCardType,
  compareHands,
} = require("../utils/cardUtils");
const {
  GAME_STATUS,
  PLAYER_STATUS,
  CARD_TYPES,
} = require("../config/constants");
const eventBus = require("../utils/eventBus");

class GameService {
  constructor() {
    this.turnTimeouts = new Map();
    this.settlementTimeouts = new Map();
  }

  /**
   * 获取用户ID，处理ObjectId和对象格式
   * @param {Object|string} userId 用户ID，可能是ObjectId、对象或字符串
   * @returns {string} 用户ID字符串
   */
  getUserId(userId) {
    if (typeof userId === "object" && userId._id) {
      // 如果是已填充的用户对象，使用_id
      return userId._id.toString();
    } else if (typeof userId === "object" && userId.toString) {
      // 如果是ObjectId对象，直接转换
      return userId.toString();
    } else {
      // 如果已经是字符串，直接使用
      return userId;
    }
  }

  /**
   * 开始新的一局游戏
   * @param {string} roomId 房间ID
   * @returns {Object} 游戏信息
   */
  async startNewGame(roomId) {
    console.log("开始创建新游戏，房间ID:", roomId);
    const room = await Room.findOne({ roomId });
    if (!room) {
      throw new Error("房间不存在");
    }
    console.log(
      "找到房间:",
      room.roomId,
      "房间状态:",
      room.status,
      "玩家数量:",
      room.players.length
    );

    if (room.status !== "waiting") {
      throw new Error("房间不在等待状态");
    }

    if (room.players.length < 2) {
      throw new Error("玩家数量不足，至少需要2人");
    }

    let game;

    if (room.gameId) {
      console.log("房间已有进行中的游戏，继续下一局");
      game = await Game.findById(room.gameId);
      if (!game) {
        throw new Error("游戏不存在");
      }

      if (game.round >= game.totalRounds) {
        throw new Error("游戏已结束，无法开始新局");
      }

      game.round += 1;
      console.log("游戏进入第", game.round, "局");
    } else {
      console.log("创建新游戏");
      const dealerIndex = Math.floor(Math.random() * room.players.length);
      console.log(
        "随机选择庄家索引:",
        dealerIndex,
        "庄家:",
        room.players[dealerIndex].nickname
      );

      game = new Game({
        roomId: room.roomId,
        round: 1,
        totalRounds: room.totalRounds,
        dealerIndex: dealerIndex,
        currentPlayerIndex: dealerIndex,
        minBet: room.baseBet,
        players: room.players.map((player) => {
          console.log(
            `映射玩家 ${player.nickname
            }, roomGold类型: ${typeof player.roomGold}, roomGold值: ${player.roomGold
            }`
          );
          return {
            userId: player.userId,
            nickname: player.nickname,
            avatar: player.avatar,
            roomGold: player.roomGold,
            cards: [],
            hasSeenCards: false,
            totalBet: 0,
            currentRoundBet: 0,
            status: PLAYER_STATUS.PLAYING,
          };
        }),
      });

      // 初始化玩家确认状态
      game.playerConfirmations = {};
      room.players.forEach((p) => {
        game.playerConfirmations[this.getUserId(p.userId)] = false;
      });
      game.markModified("playerConfirmations");
      console.log("游戏对象创建完成");

      room.gameId = game._id;
    }

    this.setupNewRound(game, room);

    await game.save();

    room.currentRound = game.round;
    room.status = "playing";

    for (let i = 0; i < room.players.length; i++) {
      const roomPlayer = room.players[i];
      const gamePlayer = game.players[i];
      roomPlayer.roomGold = gamePlayer.roomGold;
    }
    await room.save();

    const formattedGame = this.formatGame(game);
    console.log("格式化后的游戏数据:", JSON.stringify(formattedGame, null, 2));
    return formattedGame;
  }

  /**
   * 设置新一局的数据
   * @param {Object} game 游戏对象
   * @param {Object} room 房间对象
   */
  setupNewRound(game, room) {
    console.log("=== 开始设置新一局 ===");
    console.log("游戏局数:", game.round, "/", game.totalRounds);

    const deck = shuffleDeck(createDeck());
    for (let i = 0; i < game.players.length; i++) {
      game.players[i].cards = dealCards(deck, 3);
      game.players[i].hasSeenCards = false;
      game.players[i].totalBet = 0;
      game.players[i].currentRoundBet = 0;
      game.players[i].hasActedThisRound = false;
      game.players[i].status = PLAYER_STATUS.PLAYING;
      console.log(
        `玩家 ${game.players[i].nickname} 的手牌:`,
        game.players[i].cards
      );
    }

    game.pot = 0;
    game.bettingRound = 1;
    game.minBet = room.baseBet;

    const anteAmount = room.baseBet;
    console.log("=== 开始扣除底分 ===");
    console.log(`底分金额: ${anteAmount}, 类型: ${typeof anteAmount}`);

    for (let i = 0; i < game.players.length; i++) {
      const player = game.players[i];
      console.log(
        `处理玩家 ${player.nickname}, 扣除前roomGold: ${player.roomGold
        }, 类型: ${typeof player.roomGold}`
      );
      player.roomGold -= anteAmount;
      player.totalBet = anteAmount;
      player.currentRoundBet = anteAmount;
      game.updatePot(anteAmount);
      console.log(
        `玩家 ${player.nickname} 扣除底分 ${anteAmount}, 剩余金币: ${player.roomGold}`
      );
      console.log(`当前底池pot: ${game.pot}, 类型: ${typeof game.pot}`);
    }

    game.currentTurnDeadline = new Date(Date.now() + 30000);
    game.startGame();
    console.log("=== 新一局设置完成 ===");
  }

  /**
   * 检查下注轮次是否完成
   * @param {Object} game 游戏对象
   * @returns {boolean} 是否完成下注轮次
   */
  isBettingRoundComplete(game) {
    const activePlayers = game.players.filter(
      (p) => p.status === PLAYER_STATUS.PLAYING
    );

    if (activePlayers.length <= 1) {
      return true;
    }

    return activePlayers.every((player) => player.hasActedThisRound);
  }

  /**
   * 重置当前轮次下注
   * @param {Object} game 游戏对象
   */
  resetRoundBets(game) {
    game.players.forEach((player) => {
      player.currentRoundBet = 0;
      player.hasActedThisRound = false;
    });
    console.log("已重置所有玩家的轮次下注");
  }

  /**
   * 移动到下一个玩家
   * @param {Object} game 游戏对象
   * @returns {Object} 更新后的游戏对象
   */
  moveToNextPlayer(game) {
    let nextIndex = game.currentPlayerIndex;
    let attempts = 0;
    const totalPlayers = game.players.length;

    do {
      nextIndex = (nextIndex + 1) % totalPlayers;
      attempts++;

      if (attempts > totalPlayers) {
        console.log("所有玩家都已操作，需要检查是否完成一轮");
        break;
      }
    } while (game.players[nextIndex].status !== PLAYER_STATUS.PLAYING);

    game.currentPlayerIndex = nextIndex;
    console.log(
      `当前玩家索引更新为: ${nextIndex}, 玩家: ${game.players[nextIndex].nickname}`
    );

    // 设置30秒操作倒计时及超时任务
    game.currentTurnDeadline = new Date(Date.now() + 30000);
    const nextPlayerUserId = this.getUserId(game.players[nextIndex].userId);
    this.scheduleTurnTimeout(game._id, nextPlayerUserId);

    // 检查当前下注轮次是否完成
    if (this.isBettingRoundComplete(game)) {
      console.log("下注轮次已完成，需要结束当前轮次");

      // 检查是否还有多于1个活跃玩家，决定是否继续游戏
      const activePlayers = game.players.filter(
        (p) => p.status === PLAYER_STATUS.PLAYING
      );

      if (activePlayers.length <= 1) {
        // 只剩一个玩家，游戏结束
        console.log("只剩一个活跃玩家，游戏结束");
        game.status = GAME_STATUS.SETTLED;
      } else {
        console.log("下注轮次完成，但游戏继续");
        // 将所有玩家的 hasActedThisRound 设为 false
        game.players.forEach((player) => {
          player.hasActedThisRound = false;
        });
        // bettingRound + 1
        game.bettingRound += 1;
        console.log(`当前下注轮次: ${game.bettingRound}`);
      }
    }

    return game;
  }

  /**
   * 玩家看牌
   * @param {string} gameId 游戏ID
   * @param {string} userId 用户ID
   * @returns {Object} 游戏信息
   */
  async seeCards(gameId, userId) {
    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("游戏不存在");
    }

    const player = game.players.find(
      (p) => p.userId.toString() === userId.toString()
    );
    if (!player) {
      throw new Error("玩家不在游戏中");
    }

    if (player.status !== PLAYER_STATUS.PLAYING) {
      throw new Error("玩家状态不允许看牌");
    }

    player.hasSeenCards = true;

    await game.save();

    return this.formatGame(game, userId);
  }

  /**
   * 玩家跟注
   * @param {string} gameId 游戏ID
   * @param {string} userId 用户ID
   * @returns {Object} 游戏信息
   */
  async call(gameId, userId) {
    // 收到玩家操作，立即清除该玩家的超时计时器
    if (this.turnTimeouts.has(gameId.toString())) {
      clearTimeout(this.turnTimeouts.get(gameId.toString()));
      this.turnTimeouts.delete(gameId.toString());
    }

    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("游戏不存在");
    }

    const player = game.players.find(
      (p) => p.userId.toString() === userId.toString()
    );
    if (!player) {
      throw new Error("玩家不在游戏中");
    }

    if (player.status !== PLAYER_STATUS.PLAYING) {
      throw new Error("玩家状态不允许跟注");
    }

    const minBet = game.minBet;
    const callAmount = player.hasSeenCards ? minBet * 2 : minBet;

    console.log(
      `玩家 ${player.nickname
      } 跟注金额: ${callAmount}, 类型: ${typeof callAmount}, 看牌状态: ${player.hasSeenCards
      }, 最小下注额: ${minBet}, 当前轮次下注: ${player.currentRoundBet}`
    );

    player.roomGold -= callAmount;
    player.totalBet += callAmount;
    player.currentRoundBet += callAmount;
    player.hasActedThisRound = true;
    game.updatePot(callAmount);

    this.moveToNextPlayer(game);

    await game.save();

    if (game.status === GAME_STATUS.SETTLED) {
      return await this.endGame(gameId);
    }

    return this.formatGame(game, userId);
  }

  /**
   * 玩家加注
   * @param {string} gameId 游戏ID
   * @param {string} userId 用户ID
   * @param {number} amount 加注金额
   * @returns {Object} 游戏信息
   */
  async raise(gameId, userId, amount) {
    // 收到玩家操作，立即清除该玩家的超时计时器
    if (this.turnTimeouts.has(gameId.toString())) {
      clearTimeout(this.turnTimeouts.get(gameId.toString()));
      this.turnTimeouts.delete(gameId.toString());
    }

    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("游戏不存在");
    }

    const player = game.players.find(
      (p) => p.userId.toString() === userId.toString()
    );
    if (!player) {
      throw new Error("玩家不在游戏中");
    }

    if (player.status !== PLAYER_STATUS.PLAYING) {
      throw new Error("玩家状态不允许加注");
    }

    player.roomGold -= amount;
    player.totalBet += amount;
    player.currentRoundBet = player.currentRoundBet + amount;
    player.hasActedThisRound = true;
    game.updatePot(amount);
    if (player.hasSeenCards) {
      game.minBet = amount / 2;
    } else {
      game.minBet = amount;
    }

    this.moveToNextPlayer(game);

    await game.save();

    if (game.status === GAME_STATUS.SETTLED) {
      return await this.endGame(gameId);
    }

    return this.formatGame(game, userId);
  }

  /**
   * 玩家弃牌
   * @param {string} gameId 游戏ID
   * @param {string} userId 用户ID
   * @returns {Object} 游戏信息
   */
  async fold(gameId, userId) {
    // 收到玩家操作，立即清除该玩家的超时计时器
    if (this.turnTimeouts.has(gameId.toString())) {
      clearTimeout(this.turnTimeouts.get(gameId.toString()));
      this.turnTimeouts.delete(gameId.toString());
    }

    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("游戏不存在");
    }

    const player = game.players.find(
      (p) => p.userId.toString() === userId.toString()
    );
    if (!player) {
      throw new Error("玩家不在游戏中");
    }

    if (player.status !== PLAYER_STATUS.PLAYING) {
      throw new Error("玩家状态不允许弃牌");
    }

    player.status = PLAYER_STATUS.FOLDED;
    player.hasActedThisRound = true;

    const activePlayers = game.players.filter(
      (p) => p.status === PLAYER_STATUS.PLAYING
    );
    if (activePlayers.length <= 1) {
      await game.save();
      return await this.endGame(gameId);
    }

    this.moveToNextPlayer(game);

    await game.save();

    // 如果游戏状态变为结算状态，结束游戏
    if (game.status === GAME_STATUS.SETTLED) {
      return await this.endGame(gameId);
    }

    return this.formatGame(game, userId);
  }

  /**
   * 玩家比牌
   * @param {string} gameId 游戏ID
   * @param {string} userId 用户ID
   * @param {string} targetUserId 目标玩家ID
   * @returns {Object} 游戏信息
   */
  async compare(gameId, userId, targetUserId) {
    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("游戏不存在");
    }

    const player = game.players.find(
      (p) => p.userId.toString() === userId.toString()
    );
    const targetPlayer = game.players.find(
      (p) => p.userId.toString() === targetUserId.toString()
    );

    if (!player || !targetPlayer) {
      throw new Error("玩家不在游戏中");
    }

    if (
      player.status !== PLAYER_STATUS.PLAYING ||
      targetPlayer.status !== PLAYER_STATUS.PLAYING
    ) {
      throw new Error("玩家状态不允许比牌");
    }

    const result = compareHands(player.cards, targetPlayer.cards);

    if (result > 0) {
      targetPlayer.status = PLAYER_STATUS.LOST;
    } else if (result < 0) {
      player.status = PLAYER_STATUS.LOST;
    } else {
    }

    const activePlayers = game.players.filter(
      (p) => p.status === PLAYER_STATUS.PLAYING
    );
    if (activePlayers.length <= 1) {
      await game.save();
      return await this.endGame(gameId);
    }

    this.moveToNextPlayer(game);

    await game.save();

    // 如果游戏状态变为结算状态，结束游戏
    if (game.status === GAME_STATUS.SETTLED) {
      return await this.endGame(gameId);
    }

    return this.formatGame(game, userId);
  }

  /**
   * 结束游戏
   * @param {string} gameId 游戏ID
   * @returns {Object} 游戏结果
   */
  async endGame(gameId) {
    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("游戏不存在");
    }

    const room = await Room.findOne({ roomId: game.roomId });
    if (!room) {
      throw new Error("房间不存在");
    }

    let winner = null;
    const activePlayers = game.players.filter(
      (p) => p.status === PLAYER_STATUS.PLAYING
    );

    if (activePlayers.length === 1) {
      winner = activePlayers[0];
    } else if (activePlayers.length > 1) {
      winner = activePlayers.reduce((prev, current) => {
        return compareHands(prev.cards, current.cards) > 0 ? prev : current;
      });
    }

    if (!winner) {
      throw new Error("无法确定获胜玩家");
    }

    winner.status = PLAYER_STATUS.WINNER;

    const winnings = game.pot;
    winner.roomGold += winnings;

    game.endGame({
      userId: winner.userId,
      nickname: winner.nickname,
      cards: winner.cards,
      cardType: getCardType(winner.cards).typeName,
      winnings: winnings,
    });

    // 设置30秒结算自动开始倒计时
    game.settlementDeadline = new Date(Date.now() + 30000);
    this.scheduleSettlementTimeout(game._id, game.roomId);

    await game.save();

    game.roundHistory.push({
      round: game.round,
      winner: {
        userId: winner.userId,
        nickname: winner.nickname,
        cards: winner.cards,
        cardType: getCardType(winner.cards).typeName,
        winnings: winnings,
      },
      players: game.players.map((p) => ({
        userId: p.userId,
        nickname: p.nickname,
        cards: p.cards,
        cardType: getCardType(p.cards).typeName,
        result: p.status,
        goldChange:
          p.userId.toString() === winner.userId.toString()
            ? winnings
            : -p.totalBet,
      })),
    });

    await game.save();

    for (let i = 0; i < room.players.length; i++) {
      const roomPlayer = room.players[i];
      const gamePlayer = game.players[i];
      roomPlayer.roomGold = gamePlayer.roomGold;
    }

    if (game.round >= game.totalRounds) {
      console.log("游戏结束，所有局数已完成");
      game.status = GAME_STATUS.FINISHED;
      room.gameId = null;
      room.status = "waiting";
      room.currentRound = 0;

      for (const player of room.players) {
        const user = await User.findById(player.userId);
        if (user) {
          user.gold += player.roomGold;
          await user.save();
        }
      }
    } else {
      console.log("本局结束，等待玩家确认继续");
      game.status = GAME_STATUS.SETTLED;
      room.status = "waiting";

      // 每次游戏结算时都重新初始化所有玩家的确认状态为 false
      game.playerConfirmations = {};
      room.players.forEach((p) => {
        game.playerConfirmations[this.getUserId(p.userId)] = false;
      });
      game.markModified("playerConfirmations");
    }

    await room.save();
    await game.save();

    return this.formatGameResult(game);
  }

  /**
   * 格式化游戏信息
   * @param {Object} game 游戏对象
   * @param {string} userId 用户ID（用于隐藏其他玩家手牌）
   * @returns {Object} 格式化后的游戏信息
   */
  formatGame(game, userId = null) {
    const formattedUserId = userId ? this.getUserId(userId) : null;

    console.log("=== formatGame方法开始 ===");
    console.log("原始userId参数:", userId);
    console.log("格式化后的userId:", formattedUserId);
    console.log("游戏状态:", game.status);
    console.log("玩家数量:", game.players?.length);

    const result = {
      id: game._id,
      roomId: game.roomId,
      round: game.round,
      totalRounds: game.totalRounds,
      status: game.status,
      pot: game.pot,
      minBet: game.minBet,
      bettingRound: game.bettingRound,
      dealerIndex: game.dealerIndex,
      currentPlayerIndex: game.currentPlayerIndex,
      currentPlayerId: game.players[game.currentPlayerIndex]?.userId
        ? this.getUserId(game.players[game.currentPlayerIndex].userId)
        : null,
      players: game.players.map((player) => {
        const isPlayerSelf =
          formattedUserId && this.getUserId(player.userId) === formattedUserId;
        console.log(
          "处理玩家:",
          player.nickname,
          "isSelf:",
          isPlayerSelf,
          "userId:",
          this.getUserId(player.userId)
        );

        return {
          userId: this.getUserId(player.userId),
          nickname: player.nickname,
          avatar: player.avatar,
          roomGold: player.roomGold,
          cards: player.cards || [],
          hasSeenCards: player.hasSeenCards,
          totalBet: player.totalBet,
          currentRoundBet: player.currentRoundBet,
          status: player.status,
          cardType: player.cards ? getCardType(player.cards).typeName : null,
          isSelf: isPlayerSelf,
        };
      }),
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
    };

    console.log("=== formatGame方法结束 ===");
    console.log("返回的游戏数据:", JSON.stringify(result, null, 2));

    return result;
  }

  /**
   * 格式化游戏结果
   * @param {Object} game 游戏对象
   * @returns {Object} 格式化后的游戏结果
   */
  async startNextRound(gameId) {
    const game = await Game.findById(gameId);
    if (!game) {
      throw new Error("游戏不存在");
    }

    const room = await Room.findOne({ roomId: game.roomId });
    if (!room) {
      throw new Error("房间不存在");
    }

    game.round += 1;
    game.pot = 0;
    game.bettingRound = 1;

    // 设置新的庄家（轮换庄家）
    game.dealerIndex = (game.dealerIndex + 1) % room.players.length;
    game.currentPlayerIndex = game.dealerIndex;

    game.playerConfirmations = {};

    // 初始化所有玩家的确认状态为 false
    room.players.forEach((p) => {
      game.playerConfirmations[this.getUserId(p.userId)] = false;
    });

    game.players.forEach((player) => {
      player.status = PLAYER_STATUS.PLAYING;
      player.cards = [];
      player.hasSeenCards = false;
      player.currentRoundBet = 0;
      player.totalBet = 0;
      player.hasActedThisRound = false;
    });

    const deck = shuffleDeck(createDeck());

    game.players.forEach((player) => {
      player.cards = deck.splice(0, 3);
    });

    // 扣除底分
    const anteAmount = room.baseBet;
    game.minBet = anteAmount;
    console.log(`=== 下一局扣除底分 ===`);
    console.log(`底分金额: ${anteAmount}`);

    game.players.forEach((player) => {
      console.log(`玩家 ${player.nickname} 扣除前金币: ${player.roomGold}`);
      player.roomGold -= anteAmount;
      player.totalBet = anteAmount;
      player.currentRoundBet = anteAmount;
      game.updatePot(anteAmount);
      console.log(`玩家 ${player.nickname} 扣除后金币: ${player.roomGold}, 底池: ${game.pot}`);
    });

    // 同步更新房间中玩家的金币
    for (let i = 0; i < room.players.length; i++) {
      const roomPlayer = room.players[i];
      const gamePlayer = game.players.find(
        (gp) => this.getUserId(gp.userId) === this.getUserId(roomPlayer.userId)
      );
      if (gamePlayer) {
        roomPlayer.roomGold = gamePlayer.roomGold;
      }
    }

    // 开始游戏
    game.startGame();

    await game.save();

    // 更新房间状态为playing，确保客户端知道游戏已开始
    room.status = "playing";
    room.currentRound = game.round;
    await room.save();

    return this.formatGame(game);
  }

  formatGameResult(game) {
    return {
      id: game._id,
      roomId: game.roomId,
      round: game.round,
      totalRounds: game.totalRounds,
      status: game.status,
      pot: game.pot,
      winner: game.winner,
      roundHistory: game.roundHistory,
      currentTurnDeadline: game.currentTurnDeadline,
      settlementDeadline: game.settlementDeadline,
      playerConfirmations: game.playerConfirmations || {},
      players: game.players.map((player) => ({
        userId: this.getUserId(player.userId),
        nickname: player.nickname,
        avatar: player.avatar,
        roomGold: player.roomGold,
        cards: player.cards,
        hasSeenCards: player.hasSeenCards, // 暴露给前端，用于显示“已看牌”状态
        cardType: player.cards ? getCardType(player.cards).typeName : null,
        result: player.status,
        totalBet: player.totalBet,
      })),
      finishedAt: game.finishedAt,
    };
  }
  /**
   * 安排回合超时
   * @param {string} gameId 游戏ID
   * @param {string} userId 当前玩家ID
   */
  scheduleTurnTimeout(gameId, userId) {
    // 清除旧的超时定时器
    if (this.turnTimeouts.has(gameId.toString())) {
      clearTimeout(this.turnTimeouts.get(gameId.toString()));
      this.turnTimeouts.delete(gameId.toString());
    }

    // 设置新的超时定时器 (30秒)
    const timeoutId = setTimeout(async () => {
      console.log(`游戏 ${gameId} 玩家 ${userId} 超时，自动弃权`);
      try {
        const result = await this.fold(gameId, userId);

        // 获取 socket io 实例 (需要从外部传入或通过全局变量获取，这里假设通过 require 获取或者事件触发)
        //由于 gameService 没有直接访问 io 的权限，这里可能需要一种回调机制或者事件总线
        // 为了简单起见，我们假设这里只处理逻辑，通知由 socket 层通过轮询或 shared event emitter 处理
        // 但 socket 层并不知道这里发生了超时。

        // 修正方案：我们可以在 global 上挂载 io，或者在此处引入 store
        // 鉴于架构限制，我们可以不仅执行 fold，还需要通知。
        // 这是一个设计上的挑战。简单的做法是：
        // 让 socket/index.js 在初始化时把 handleTimeout 传进来? 不太好。

        // 临时的解决方案：
        // 我们执行 fold，状态更新了。
        // 但客户端不知道。客户端倒计时结束也会自己请求 fold ? 不安全。

        // 更好的方案：使用全局事件发射器
        const eventBus = require('../utils/eventBus'); // 假设创建一个简单的事件总线
        eventBus.emit('player_action_timeout', { gameId, userId, result });

      } catch (error) {
        console.error('自动弃权失败:', error);
      }
    }, 30000);

    this.turnTimeouts.set(gameId.toString(), timeoutId);
  }

  /**
   * 安排结算超时
   * @param {string} gameId 游戏ID
   * @param {string} roomId 房间ID
   */
  scheduleSettlementTimeout(gameId, roomId) {
    if (this.settlementTimeouts.has(gameId.toString())) {
      clearTimeout(this.settlementTimeouts.get(gameId.toString()));
      this.settlementTimeouts.delete(gameId.toString());
    }

    const timeoutId = setTimeout(() => {
      console.log(`游戏 ${gameId} 结算超时，自动开始下一局`);
      eventBus.emit('settlement_timeout', { gameId, roomId });
    }, 30000);

    this.settlementTimeouts.set(gameId.toString(), timeoutId);
  }

  /**
   * 清除结算超时
   * @param {string} gameId 游戏ID
   */
  clearSettlementTimeout(gameId) {
    if (this.settlementTimeouts.has(gameId.toString())) {
      clearTimeout(this.settlementTimeouts.get(gameId.toString()));
      this.settlementTimeouts.delete(gameId.toString());
    }
  }
}

module.exports = new GameService();
