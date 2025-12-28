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

class GameService {
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

    const dealerIndex = Math.floor(Math.random() * room.players.length);
    console.log(
      "随机选择庄家索引:",
      dealerIndex,
      "庄家:",
      room.players[dealerIndex].nickname
    );

    console.log("=== 开始创建游戏对象 ===");
    console.log("房间玩家数据:", JSON.stringify(room.players, null, 2));

    const game = new Game({
      roomId: room.roomId,
      round: room.currentRound + 1,
      dealerIndex: dealerIndex,
      currentPlayerIndex: dealerIndex,
      minBet: room.baseBet,
      players: room.players.map((player) => {
        console.log(
          `映射玩家 ${
            player.nickname
          }, roomGold类型: ${typeof player.roomGold}, roomGold值: ${
            player.roomGold
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
    console.log("游戏对象创建完成");

    const deck = shuffleDeck(createDeck());
    for (let i = 0; i < game.players.length; i++) {
      game.players[i].cards = dealCards(deck, 3);
      console.log(
        `玩家 ${game.players[i].nickname} 的手牌:`,
        game.players[i].cards
      );
    }

    game.pot = 0;
    const anteAmount = room.baseBet;
    console.log("=== 开始扣除底分 ===");
    console.log(`底分金额: ${anteAmount}, 类型: ${typeof anteAmount}`);

    for (let i = 0; i < game.players.length; i++) {
      const player = game.players[i];
      console.log(
        `处理玩家 ${player.nickname}, 扣除前roomGold: ${
          player.roomGold
        }, 类型: ${typeof player.roomGold}`
      );
      // 允许负数积分，不进行金币验证
      player.roomGold -= anteAmount;
      player.totalBet = anteAmount;
      player.currentRoundBet = anteAmount;
      game.updatePot(anteAmount);
      console.log(
        `玩家 ${player.nickname} 扣除底分 ${anteAmount}, 剩余金币: ${player.roomGold}`
      );
      console.log(`当前底池pot: ${game.pot}, 类型: ${typeof game.pot}`);
    }

    game.startGame();

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
      `玩家 ${
        player.nickname
      } 跟注金额: ${callAmount}, 类型: ${typeof callAmount}, 看牌状态: ${
        player.hasSeenCards
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

    // 查找获胜玩家
    let winner = null;
    const activePlayers = game.players.filter(
      (p) => p.status === PLAYER_STATUS.PLAYING
    );

    if (activePlayers.length === 1) {
      // 只剩一个玩家，该玩家获胜
      winner = activePlayers[0];
    } else if (activePlayers.length > 1) {
      // 多个玩家，需要比牌
      winner = activePlayers.reduce((prev, current) => {
        return compareHands(prev.cards, current.cards) > 0 ? prev : current;
      });
    }

    if (!winner) {
      throw new Error("无法确定获胜玩家");
    }

    // 设置获胜者
    winner.status = PLAYER_STATUS.WINNER;

    // 计算奖金
    const winnings = game.pot;
    winner.roomGold += winnings;

    // 更新游戏状态
    game.endGame({
      userId: winner.userId,
      nickname: winner.nickname,
      cards: winner.cards,
      cardType: getCardType(winner.cards).typeName,
      winnings: winnings,
    });

    await game.save();

    // 更新房间
    const room = await Room.findOne({ roomId: game.roomId });
    if (room) {
      // 记录游戏历史
      room.gameHistory.push({
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

      // 检查是否达到总局数
      if (room.currentRound >= room.totalRounds) {
        // 房间结束
        room.finishRoom();

        // 归还剩余金币给用户
        for (const player of room.players) {
          const user = await User.findById(player.userId);
          if (user) {
            user.gold += player.roomGold;
            await user.save();
          }
        }
      } else {
        // 重置房间状态为等待
        room.status = "waiting";
      }

      await room.save();
    }

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
      status: game.status,
      pot: game.pot,
      minBet: game.minBet,
      bettingRound: game.bettingRound,
      dealerIndex: game.dealerIndex,
      currentPlayerIndex: game.currentPlayerIndex,
      currentPlayerId: game.players[game.currentPlayerIndex]?.userId,
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
          userId: player.userId,
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
  formatGameResult(game) {
    return {
      id: game._id,
      roomId: game.roomId,
      round: game.round,
      status: game.status,
      pot: game.pot,
      winner: game.winner,
      players: game.players.map((player) => ({
        userId: player.userId,
        nickname: player.nickname,
        avatar: player.avatar,
        roomGold: player.roomGold,
        cards: player.cards,
        cardType: player.cards ? getCardType(player.cards).typeName : null,
        result: player.status,
        totalBet: player.totalBet,
      })),
      finishedAt: game.finishedAt,
    };
  }
}

module.exports = new GameService();
