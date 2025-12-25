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
      origin: "*", // 生产环境中应该设置具体的域名
      methods: ["GET", "POST"],
    },
  });

  // 存储用户连接信息
  const userSockets = new Map();

  io.on("connection", (socket) => {
    console.log("用户连接:", socket.id);

    // 添加一个简单的测试事件
    socket.on("test_event", (data) => {
      console.log("收到测试事件:", data);
      socket.emit("test_response", {
        message: "测试响应成功",
        timestamp: new Date(),
      });
    });

    // 添加调试日志来跟踪所有事件
    socket.onAny((event, ...args) => {
      console.log(`收到socket事件: ${event}`, args);
    });

    // 用户加入
    socket.on("user_join", async (data) => {
      try {
        const { userId, roomId } = data;

        // 存储用户连接信息
        userSockets.set(userId.toString(), socket);
        socket.userId = userId.toString();
        socket.roomId = roomId;

        // 加入房间
        socket.join(roomId);

        // 获取房间详情
        const room = await roomService.getRoomDetail(roomId, userId);

        // 通知房间内其他玩家有新用户加入并更新房间信息
        socket.to(roomId).emit("room_updated", room);

        // 发送房间详情给当前用户
        socket.emit("room_updated", room);
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
        const { roomId, userId, isReady } = data;

        // 更新房间内玩家的准备状态
        const room = await roomService.updatePlayerReadyStatus(
          roomId,
          userId,
          isReady
        );

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
        const { roomId, userId } = data;

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

        // 检查所有玩家是否已准备
        const allReady = room.players.every((p) => p.isReady);
        if (!allReady) {
          throw new Error("所有玩家必须准备后才能开始游戏");
        }

        console.log("所有验证通过，开始创建游戏");

        // 开始游戏
        const game = await gameService.startNewGame(roomId);
        console.log("游戏创建完成:", JSON.stringify(game, null, 2));
        console.log("游戏创建完成，准备发送game_started事件给所有玩家");

        // 为每个玩家单独发送游戏数据，确保他们能看到自己的手牌
        console.log("准备向玩家发送游戏数据，玩家数量:", room.players.length);
        for (const player of room.players) {
          console.log("处理玩家:", player.nickname, "用户ID:", player.userId);
          const playerGame = gameService.formatGame(game, player.userId);
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

    // 离开房间
    socket.on("leave_room", async (data) => {
      try {
        const { roomId, userId } = data;

        // 离开房间
        socket.leave(roomId);

        // 通知房间内其他玩家用户离开
        socket.to(roomId).emit("player_left", {
          userId,
          message: "玩家离开房间",
        });

        // 从房间中移除玩家
        const room = await roomService.removePlayerFromRoom(roomId, userId);

        // 如果房间仍然存在，通知所有玩家房间状态已更新
        if (room) {
          io.to(roomId).emit("room_updated", room);
        } else {
          // 如果房间已被删除（最后一个玩家离开），通知所有玩家房间已解散
          io.to(roomId).emit("room_disbanded", {
            message: "房间已解散（最后一个玩家离开）",
            roomId: roomId,
          });
        }

        // 发送离开成功的响应
        socket.emit("leave_room_success", { message: "成功离开房间" });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // 断开连接
    socket.on("disconnect", () => {
      console.log("用户断开连接:", socket.id);

      // 清理用户连接信息
      if (socket.userId) {
        userSockets.delete(socket.userId);
      }
    });
  });

  return io;
}

module.exports = { initializeSocket };
