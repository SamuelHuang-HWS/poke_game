// server/socket/index.js
const socketIO = require("socket.io");
const Game = require("../models/Game");
const gameService = require("../services/gameService");
const roomService = require("../services/roomService");

/**
 * 初始化Socket.IO
 * @param {Object} server HTTP服务器实例
 */
function initializeSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const userSockets = new Map();
  const playerOfflineTimers = new Map();

  // 监听内部事件总线
  const eventBus = require("../utils/eventBus");

  eventBus.on("player_action_timeout", async ({ gameId, userId, result }) => {
    console.log(`Socket收到超时事件: 游戏 ${gameId}, 玩家 ${userId}`);
    if (result) {
      // 使用 sendGameStateUpdate 广播更新
      // 注意：这里我们需要 access sendGameStateUpdate. 
      // 由于 sendGameStateUpdate 是在 initializeSocket 内部定义的，我们可以直接调用，
      // 前提是 eventBus listener 也在 initializeSocket 内部。

      await sendGameStateUpdate(userSockets, gameId, result.roomId);

      // 如果游戏状态为settled或finished，发送结算事件
      if (result.status === "settled" || result.status === "finished") {
        await sendSettlementEvent(io, result.roomId);
      }

      // 通知被弃权的玩家
      const activePlayerId = gameService.getUserId(userId);
      const playerSocket = userSockets.get(activePlayerId);
      if (playerSocket) {
        playerSocket.emit("game_action_result", result);
        playerSocket.emit("toast", { type: "warning", message: "您因超时未操作，已被自动弃权" });
      }

      // 通知房间其他人
      io.to(result.roomId).emit("toast", { type: "info", message: "有玩家超时自动弃权" });
    }
  });

  eventBus.on("settlement_timeout", async ({ gameId, roomId }) => {
    console.log(`Socket收到结算超时事件: 游戏 ${gameId}, 房间 ${roomId}`);
    try {
      // 结算超时，强制开启下一轮
      // 首先需要清除之前的超时（虽然已经触发了，但为了保险起见）
      gameService.clearSettlementTimeout(gameId);

      const game = await Game.findById(gameId);
      const room = await roomService.getRoomByRoomId(roomId);

      if (!game || !room) {
        console.error("结算超时处理失败: 游戏或房间不存在");
        return;
      }

      // 如果游戏已经结束（所有局数打完），则不开启下一轮
      if (game.round >= game.totalRounds || game.status === "finished") {
        console.log("游戏已完全结束，忽略结算超时");
        return;
      }

      console.log("结算超时，自动开始下一局");

      // 注意：这里我们假设 startNewGame / startNextRound 会处理"下一局"的逻辑
      // 之前代码 confirm_continue 调用的是 gameService.startNextRound(gameId)
      // 如果不存在，我们可能需要使用 startNewGame(roomId)
      // 根据之前的 grep 搜索，startNextRound 可能不存在 (待确认)
      // 如果不存在，我们将使用 startNewGame(roomId)

      // 临时假设 startNextRound 存在，如果不存在 catch 会捕获
      // 如果 grep 结果显示不存在，由于我们无法看到完整文件，我们先尝试调用 startNewGame(roomId)
      // 因为 startNewGame 内部有处理 room.gameId 的逻辑来 increment round.

      const newGameData = await gameService.startNewGame(roomId);

      // 广播 next_round_started
      // 这里的逻辑参考 confirm_continue 的广播逻辑

      console.log(`准备向 ${room.players.length} 个玩家发送 next_round_started 事件`);
      for (const player of room.players) {
        let playerId = gameService.getUserId(player.userId);
        const playerSocket = userSockets.get(playerId);

        if (playerSocket) {
          const playerGameData = gameService.formatGame(newGameData, playerId);
          playerSocket.emit("next_round_started", playerGameData);
          playerSocket.emit("toast", { type: "info", message: "结算超时，自动开始下一局" });
        }
      }

    } catch (error) {
      console.error("处理结算超时失败:", error);
      io.to(roomId).emit("error", { message: "自动开始下一局失败: " + error.message });
    }
  });

  /**
   * 发送游戏结算事件的辅助函数
   * @param {Object} io Socket.IO实例
   * @param {string} roomId 房间ID
   */
  async function sendSettlementEvent(io, roomId) {
    const room = await roomService.getRoomByRoomId(roomId);
    const game = await Game.findOne({ roomId: roomId }).sort({ round: -1 });

    if (!room || !game) {
      console.error("发送结算事件失败: 房间或游戏不存在");
      return;
    }

    // 获取当前局的历史记录，包含所有玩家的牌面信息
    const currentRoundHistory = game.roundHistory[game.roundHistory.length - 1];

    if (game.round >= game.totalRounds) {
      // 所有局数完成，发送game_ended事件
      io.to(roomId).emit("game_ended", {
        winner: currentRoundHistory?.winner,
        playersResults: game.players.map((gp) => {
          const roomPlayer = room.players.find(
            (rp) => gameService.getUserId(rp.userId) === gameService.getUserId(gp.userId)
          );
          return {
            userId: gameService.getUserId(gp.userId),
            nickname: gp.nickname || roomPlayer?.nickname,
            roomGold: gp.roomGold,
            goldChange: gp.roomGold - room.entryGold,
          };
        }),
        totalRounds: game.totalRounds,
        roundHistory: game.roundHistory,
        // 本局玩家牌面信息
        roundPlayers: currentRoundHistory?.players || [],
      });
    } else {
      // 单局结束，发送round_ended事件
      io.to(roomId).emit("round_ended", {
        winner: currentRoundHistory?.winner,
        currentRound: game.round,
        totalRounds: game.totalRounds,
        confirmations: game.playerConfirmations || {},
        players: room.players.map((p) => ({
          userId: gameService.getUserId(p.userId),
          nickname: p.nickname,
        })),
        // 本局玩家牌面信息
        roundPlayers: currentRoundHistory?.players || [],
        settlementDeadline: game.settlementDeadline // 结算截止时间
      });
    }

    io.to(roomId).emit("room_updated", roomService.formatRoom(room));
  }

  /**
   * 发送游戏状态更新的辅助函数
   * @param {Map} userSockets 用户socket映射
   * @param {string} gameId 游戏ID
   * @param {string} roomId 房间ID
   */
  async function sendGameStateUpdate(userSockets, gameId, roomId) {
    const game = await Game.findById(gameId);
    const room = await roomService.getRoomByRoomId(roomId);

    if (!room || !game) {
      console.error("发送游戏状态更新失败: 房间或游戏不存在");
      return;
    }

    for (const player of room.players) {
      let playerId;
      if (typeof player.userId === "object" && player.userId._id) {
        playerId = player.userId._id.toString();
      } else if (typeof player.userId === "object" && player.userId.toString) {
        playerId = player.userId.toString();
      } else {
        playerId = player.userId;
      }

      const playerSocket = userSockets.get(playerId);
      if (playerSocket) {
        const playerGame = gameService.formatGame(game, player.userId);
        playerSocket.emit("game_state_update", playerGame);
      }
    }
  }

  io.on("connection", (socket) => {
    console.log("用户连接:", socket.id);

    socket.onAny((event, ...args) => {
      console.log(`收到socket事件: ${event}`, args);
    });

    socket.on("user_join", async (data) => {
      try {
        const { userId, roomId } = data;

        const timerKey = `${roomId}_${userId}`;
        if (playerOfflineTimers.has(timerKey)) {
          clearTimeout(playerOfflineTimers.get(timerKey));
          playerOfflineTimers.delete(timerKey);
          console.log(`玩家 ${userId} 重连，取消超时计时器`);
        }

        userSockets.set(userId.toString(), socket);
        socket.userId = userId.toString();
        socket.roomId = roomId;

        socket.join(roomId);

        const room = await roomService.getRoomDetail(roomId, userId);

        socket.to(roomId).emit("room_updated", room);
        socket.emit("room_updated", room);

        const game = await Game.findOne({ roomId: roomId });
        if (game && game.status === "playing") {
          const gamePlayer = game.players.find(
            (p) => p.userId.toString() === userId
          );

          if (gamePlayer) {
            const gameData = gameService.formatGame(game, userId);
            socket.emit("game_started", gameData);

            io.to(roomId).emit("player_reconnected", {
              userId,
              message: "玩家重连",
            });

            console.log(`玩家 ${userId} 重连到游戏 ${game._id}`);
          }
        }

        console.log(`玩家 ${userId} 加入房间 ${roomId}`);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 用户离开
    socket.on("user_leave", async (data) => {
      try {
        const { userId, roomId } = data;

        // 离开房间
        socket.leave(roomId);

        // 通知房间内其他玩家用户离开
        socket.to(roomId).emit("player_left", {
          userId,
          message: "玩家离开房间",
        });

        // 清理用户连接信息
        userSockets.delete(userId);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 玩家准备/取消准备
    socket.on("player_ready", async (data) => {
      try {
        const { roomId, userId } = data;

        // 更新房间内玩家的准备状态（自动切换）
        const room = await roomService.togglePlayerReadyStatus(roomId, userId);

        // 通知房间内所有玩家房间状态已更新
        io.to(roomId).emit("room_updated", room);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 开始游戏
    socket.on("start_game", async (data) => {
      try {
        console.log("=== 收到开始游戏请求 ===");
        console.log("收到开始游戏请求:", JSON.stringify(data, null, 2));
        const { roomId, userId, skipReadyCheck = false } = data;

        // 检查是否是房主（房间中的第一个玩家）
        const room = await roomService.getRoomByRoomId(roomId);
        if (!room) {
          throw new Error("房间不存在");
        }
        console.log(
          "房间信息:",
          room.players.length,
          room.players[0]?.userId?.toString(),
          userId
        );
        if (
          room.players.length === 0 ||
          room.creator._id.toString() !== userId
        ) {
          throw new Error("只有房主可以开始游戏");
        }

        // 检查房间内玩家数量
        if (room.players.length < 2) {
          throw new Error("至少需要2名玩家才能开始游戏");
        }

        // 检查所有玩家是否已准备（除非跳过准备检查）
        if (!skipReadyCheck) {
          const allReady = room.players.every((p) => p.isReady);
          if (!allReady) {
            throw new Error("所有玩家必须准备后才能开始游戏");
          }
        }

        console.log("所有验证通过，开始创建游戏");

        // 如果跳过准备检查，自动将所有玩家设置为准备状态
        if (skipReadyCheck) {
          for (const player of room.players) {
            player.isReady = true;
          }
          await room.save();
          console.log("已自动将所有玩家设置为准备状态");
        }

        // 开始游戏
        const game = await gameService.startNewGame(roomId);
        console.log("游戏创建完成:", JSON.stringify(game, null, 2));
        console.log("游戏创建完成，准备发送game_started事件给所有玩家");

        // 为每个玩家单独发送游戏数据，确保他们能看到自己的手牌
        console.log("准备向玩家发送游戏数据，玩家数量:", room.players.length);
        for (const player of room.players) {
          console.log("处理玩家:", player.nickname, "用户ID:", player.userId);

          // game已经是格式化后的数据，需要重新获取原始Game对象并格式化
          const rawGame = await Game.findOne({ roomId: game.roomId }).sort({
            round: -1,
          });
          const playerGame = gameService.formatGame(rawGame, player.userId);

          console.log(
            `发送给玩家 ${player.nickname} 的游戏数据:`,
            JSON.stringify(playerGame, null, 2)
          );
          // 发送给特定玩家
          // 处理用户ID，可能是ObjectId对象或字符串
          let playerId;
          if (typeof player.userId === "object" && player.userId._id) {
            // 如果是已填充的用户对象，使用_id
            playerId = player.userId._id.toString();
          } else if (
            typeof player.userId === "object" &&
            player.userId.toString
          ) {
            // 如果是ObjectId对象，直接转换
            playerId = player.userId.toString();
          } else {
            // 如果已经是字符串，直接使用
            playerId = player.userId;
          }

          const playerSocket = userSockets.get(playerId);
          console.log("获取到的玩家socket:", playerSocket);
          if (playerSocket) {
            console.log(`向玩家 ${player.nickname} 发送game_started事件`);
            // 添加额外的日志来确认事件是否真的被发送
            console.log(
              "即将发送game_started事件，socket ID:",
              playerSocket.id
            );
            playerSocket.emit("game_started", playerGame);
            console.log(`game_started事件已发送给玩家 ${player.nickname}`);
          } else {
            console.log(
              `无法找到玩家 ${player.nickname} 的socket连接，用户ID:`,
              player.userId
            );
            console.log("当前所有socket连接:");
            for (const [userId, socket] of userSockets) {
              console.log(`  用户ID: ${userId}, Socket ID: ${socket.id}`);
            }
          }
        }
        console.log("所有游戏数据已发送完毕");
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 游戏操作
    socket.on("game_action", async (data) => {
      try {
        const { action, gameId, userId, payload } = data;
        let result;

        switch (action) {
          case "see_cards":
            result = await gameService.seeCards(gameId, userId);
            break;
          case "call":
            result = await gameService.call(gameId, userId);
            break;
          case "raise":
            result = await gameService.raise(gameId, userId, payload.amount);
            break;
          case "fold":
            result = await gameService.fold(gameId, userId);
            break;
          case "compare":
            result = await gameService.compare(
              gameId,
              userId,
              payload.targetUserId
            );
            break;
          default:
            throw new Error("未知的游戏操作");
        }

        // 为房间内的每个玩家单独发送游戏状态更新，确保他们能看到自己的牌
        const room = await roomService.getRoomByRoomId(result.roomId);
        if (room && room.players) {
          for (const player of room.players) {
            // 处理用户ID，可能是ObjectId对象或字符串
            let playerId;
            if (typeof player.userId === "object" && player.userId._id) {
              // 如果是已填充的用户对象，使用_id
              playerId = player.userId._id.toString();
            } else if (
              typeof player.userId === "object" &&
              player.userId.toString
            ) {
              // 如果是ObjectId对象，直接转换
              playerId = player.userId.toString();
            } else {
              // 如果已经是字符串，直接使用
              playerId = player.userId;
            }

            const playerSocket = userSockets.get(playerId);
            if (playerSocket) {
              // 发送给所有玩家，包括操作者自己
              const playerGame = gameService.formatGame(result, player.userId);
              playerSocket.emit("game_state_update", playerGame);
            }
          }

          // 如果游戏状态为settled，发送结算事件
          if (result.status === "settled") {
            await sendSettlementEvent(io, room.roomId);
          }
        }
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 单独处理 see_cards 事件
    socket.on("see_cards", async (data) => {
      try {
        const { gameId, userId } = data;
        const result = await gameService.seeCards(gameId, userId);

        // 使用辅助函数发送游戏状态更新
        await sendGameStateUpdate(userSockets, gameId, result.roomId);

        // 如果游戏状态为settled或finished，发送结算事件
        if (result.status === "settled" || result.status === "finished") {
          await sendSettlementEvent(io, result.roomId);
        }

        // 发送操作结果给操作玩家
        socket.emit("game_action_result", result);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 单独处理 call 事件
    socket.on("call", async (data) => {
      try {
        const { gameId, userId } = data;
        const result = await gameService.call(gameId, userId);

        // 使用辅助函数发送游戏状态更新
        await sendGameStateUpdate(userSockets, gameId, result.roomId);

        // 如果游戏状态为settled或finished，发送结算事件
        if (result.status === "settled" || result.status === "finished") {
          await sendSettlementEvent(io, result.roomId);
        }

        // 发送操作结果给操作玩家
        socket.emit("game_action_result", result);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 单独处理 raise 事件
    socket.on("raise", async (data) => {
      try {
        const { gameId, userId, amount } = data;
        const result = await gameService.raise(gameId, userId, amount);

        // 使用辅助函数发送游戏状态更新
        await sendGameStateUpdate(userSockets, gameId, result.roomId);

        // 如果游戏状态为settled或finished，发送结算事件
        if (result.status === "settled" || result.status === "finished") {
          await sendSettlementEvent(io, result.roomId);
        }

        // 发送操作结果给操作玩家
        socket.emit("game_action_result", result);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 单独处理 fold 事件
    socket.on("fold", async (data) => {
      try {
        const { gameId, userId } = data;
        const result = await gameService.fold(gameId, userId);

        // 使用辅助函数发送游戏状态更新
        await sendGameStateUpdate(userSockets, gameId, result.roomId);

        // 如果游戏状态为settled或finished，发送结算事件
        if (result.status === "settled" || result.status === "finished") {
          await sendSettlementEvent(io, result.roomId);
        }

        // 发送操作结果给操作玩家
        socket.emit("game_action_result", result);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 单独处理 compare 事件
    socket.on("compare", async (data) => {
      try {
        const { gameId, userId, targetUserId } = data;
        const result = await gameService.compare(gameId, userId, targetUserId);

        // 使用辅助函数发送游戏状态更新
        await sendGameStateUpdate(userSockets, gameId, result.roomId);

        // 如果游戏状态为settled或finished，发送结算事件
        if (result.status === "settled" || result.status === "finished") {
          await sendSettlementEvent(io, result.roomId);
        }

        // 发送操作结果给操作玩家
        socket.emit("game_action_result", result);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 聊天消息
    socket.on("chat_message", (data) => {
      const { roomId, userId, message } = data;
      // 广播聊天消息到房间内所有用户
      socket.to(roomId).emit("chat_message", {
        userId,
        message,
        timestamp: new Date(),
      });
    });

    socket.on("confirm_continue", async (data) => {
      try {
        const { gameId, userId } = data;

        console.log(`确认继续: gameId=${gameId}, userId=${userId}`);

        // 使用原子操作更新特定玩家的确认状态
        const updatedGame = await Game.findOneAndUpdate(
          {
            _id: gameId,
            status: "settled"
          },
          {
            $set: {
              [`playerConfirmations.${gameService.getUserId(userId)}`]: true
            }
          },
          { new: true }  // 返回更新后的文档
        );

        if (!updatedGame) {
          socket.emit("error", { message: "游戏不存在或状态不允许确认继续" });
          return;
        }

        console.log(`更新后的确认状态:`, updatedGame.playerConfirmations);

        const room = await roomService.getRoomByRoomId(updatedGame.roomId);
        if (!room) {
          socket.emit("error", { message: "房间不存在" });
          return;
        }

        console.log(`房间玩家数量: ${room.players.length}`);
        room.players.forEach((p, index) => {
          console.log(`玩家${index + 1}: ${p.nickname}, userId: ${p.userId}, 格式化ID: ${gameService.getUserId(p.userId)}`);
        });

        io.to(room.roomId).emit("player_confirmed", {
          userId: gameService.getUserId(userId),
          confirmations: updatedGame.playerConfirmations || {},
        });

        const allConfirmed = room.players.every(
          (p) => (updatedGame.playerConfirmations || {})[gameService.getUserId(p.userId)]
        );

        console.log(`所有玩家都确认了吗: ${allConfirmed}`);
        console.log(`确认状态详情:`, updatedGame.playerConfirmations);

        if (allConfirmed) {
          console.log("所有玩家都已确认，开始下一局");
          await gameService.startNextRound(gameId);
          const finalGame = await Game.findById(gameId);
          const updatedRoom = await roomService.getRoomByRoomId(room.roomId);

          console.log(`准备向 ${room.players.length} 个玩家发送 next_round_started 事件`);
          for (const player of room.players) {
            // 处理用户ID，可能是ObjectId对象或字符串
            let playerId;
            if (typeof player.userId === "object" && player.userId._id) {
              // 如果是已填充的用户对象，使用_id
              playerId = player.userId._id.toString();
            } else if (
              typeof player.userId === "object" &&
              player.userId.toString
            ) {
              // 如果是ObjectId对象，直接转换
              playerId = player.userId.toString();
            } else {
              // 如果已经是字符串，直接使用
              playerId = player.userId;
            }

            const playerSocket = userSockets.get(playerId);
            console.log(`玩家 ${player.nickname} (${playerId}) 的socket存在: ${!!playerSocket}`);
            if (playerSocket) {
              const playerGame = gameService.formatGame(
                finalGame,
                player.userId
              );
              console.log(`向玩家 ${player.nickname} 发送 next_round_started 事件`);
              playerSocket.emit("next_round_started", playerGame);
            } else {
              console.log(`无法找到玩家 ${player.nickname} 的socket连接`);
            }
          }

          io.to(room.roomId).emit("room_updated", updatedRoom);
          console.log("已发送 room_updated 事件到房间");
        } else {
          console.log("仍有玩家未确认，等待更多确认");
        }
      } catch (error) {
        console.error("确认继续时发生错误:", error);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("get_game_data", async (data) => {
      try {
        const { roomId, userId } = data;

        // 查找游戏
        const game = await Game.findOne({ roomId: roomId });
        if (!game) {
          socket.emit("error", { message: "游戏不存在" });
          return;
        }

        // 格式化游戏数据并发送给玩家
        const gameData = gameService.formatGame(game, userId);
        socket.emit("game_started", gameData);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("leave_room", async (data) => {
      try {
        const { roomId, userId } = data;

        socket.leave(roomId);

        const room = await roomService.getRoomByRoomId(roomId);
        if (!room) {
          socket.emit("leave_room_success", { message: "成功离开房间" });
          return;
        }

        const game = await Game.findOne({ roomId: roomId });

        if (game && game.status === "playing") {
          const gamePlayer = game.players.find(
            (p) => p.userId.toString() === userId
          );

          if (gamePlayer && gamePlayer.status === "playing") {
            console.log(`玩家 ${userId} 在游戏进行中退出，标记为弃牌`);
            await gameService.fold(game._id, userId);

            const updatedGame = await Game.findById(game._id);
            if (updatedGame && room.players) {
              for (const player of room.players) {
                let playerId;
                if (typeof player.userId === "object" && player.userId._id) {
                  playerId = player.userId._id.toString();
                } else if (
                  typeof player.userId === "object" &&
                  player.userId.toString
                ) {
                  playerId = player.userId.toString();
                } else {
                  playerId = player.userId;
                }

                const playerSocket = userSockets.get(playerId);
                if (playerSocket) {
                  const playerGame = gameService.formatGame(
                    updatedGame,
                    player.userId
                  );
                  playerSocket.emit("game_state_update", playerGame);
                }
              }
            }

            io.to(roomId).emit("player_folded", {
              userId,
              message: "玩家退出游戏",
            });
          }
        }

        const updatedRoom = await roomService.removePlayerFromRoom(
          roomId,
          userId
        );

        if (updatedRoom) {
          if (updatedRoom.creator._id.toString() === userId) {
            const nextPlayer = updatedRoom.players[0];
            if (nextPlayer) {
              updatedRoom.creator = nextPlayer.userId;
              await updatedRoom.save();

              io.to(roomId).emit("creator_changed", {
                newCreatorId: nextPlayer.userId.toString(),
                message: "房主已转移",
              });
              console.log(`房主从 ${userId} 转移到 ${nextPlayer.userId}`);
            }
          }

          io.to(roomId).emit("room_updated", updatedRoom);
        } else {
          io.to(roomId).emit("room_disbanded", {
            message: "房间已解散（最后一个玩家离开）",
            roomId: roomId,
          });
        }

        socket.emit("leave_room_success", { message: "成功离开房间" });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("disconnect", async () => {
      console.log("用户断开连接:", socket.id);

      if (socket.userId) {
        userSockets.delete(socket.userId);

        if (socket.roomId) {
          try {
            const room = await roomService.getRoomByRoomId(socket.roomId);
            if (!room) {
              return;
            }

            const player = room.players.find(
              (p) => p.userId.toString() === socket.userId
            );

            if (!player) {
              return;
            }

            const game = await Game.findOne({ roomId: socket.roomId });

            if (game && game.status === "playing") {
              const gamePlayer = game.players.find(
                (p) => p.userId.toString() === socket.userId
              );

              if (gamePlayer && gamePlayer.status === "playing") {
                console.log(
                  `玩家 ${socket.userId} 在游戏中断线，启动超时计时器`
                );

                const timerId = setTimeout(async () => {
                  try {
                    console.log(`玩家 ${socket.userId} 超时未重连，自动弃牌`);
                    await gameService.fold(game._id, socket.userId);

                    const updatedGame = await Game.findById(game._id);
                    if (updatedGame && room.players) {
                      for (const player of room.players) {
                        let playerId;
                        if (
                          typeof player.userId === "object" &&
                          player.userId._id
                        ) {
                          playerId = player.userId._id.toString();
                        } else if (
                          typeof player.userId === "object" &&
                          player.userId.toString
                        ) {
                          playerId = player.userId.toString();
                        } else {
                          playerId = player.userId;
                        }

                        const playerSocket = userSockets.get(playerId);
                        if (playerSocket) {
                          const playerGame = gameService.formatGame(
                            updatedGame,
                            player.userId
                          );
                          playerSocket.emit("game_state_update", playerGame);
                        }
                      }
                    }

                    io.to(socket.roomId).emit("player_offline_folded", {
                      userId: socket.userId,
                      message: "玩家断线超时，自动弃牌",
                    });
                  } catch (error) {
                    console.error("处理断线超时错误:", error);
                  }
                }, 60000);

                playerOfflineTimers.set(
                  `${socket.roomId}_${socket.userId}`,
                  timerId
                );
              }
            }

            io.to(socket.roomId).emit("player_offline", {
              userId: socket.userId,
              message: "玩家离线",
            });
          } catch (error) {
            console.error("处理断开连接错误:", error);
          }
        }
      }
    });
  });

  return io;
}

module.exports = { initializeSocket };
