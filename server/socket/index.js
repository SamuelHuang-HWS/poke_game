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

          // 如果游戏状态为settled，发送room_updated事件以显示结算页面
          if (result.status === "settled") {
            const updatedRoom = await roomService.getRoomByRoomId(room.roomId);
            io.to(room.roomId).emit("room_updated", updatedRoom);
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

          // 如果游戏状态为settled，发送room_updated事件以显示结算页面
          if (result.status === "settled") {
            const updatedRoom = await roomService.getRoomByRoomId(room.roomId);
            io.to(room.roomId).emit("room_updated", updatedRoom);
          }
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

          // 如果游戏状态为settled，发送room_updated事件以显示结算页面
          if (result.status === "settled") {
            const updatedRoom = await roomService.getRoomByRoomId(room.roomId);
            io.to(room.roomId).emit("room_updated", updatedRoom);
          }
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

          // 如果游戏状态为settled，发送room_updated事件以显示结算页面
          if (result.status === "settled") {
            const updatedRoom = await roomService.getRoomByRoomId(room.roomId);
            io.to(room.roomId).emit("room_updated", updatedRoom);
          }
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

          // 如果游戏状态为settled，发送room_updated事件以显示结算页面
          if (result.status === "settled") {
            const updatedRoom = await roomService.getRoomByRoomId(room.roomId);
            io.to(room.roomId).emit("room_updated", updatedRoom);
          }
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

          // 如果游戏状态为settled，发送room_updated事件以显示结算页面
          if (result.status === "settled") {
            const updatedRoom = await roomService.getRoomByRoomId(room.roomId);
            io.to(room.roomId).emit("room_updated", updatedRoom);
          }
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

    // 获取游戏数据
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
