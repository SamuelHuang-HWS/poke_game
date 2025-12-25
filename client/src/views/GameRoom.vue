<template>
  <div class="game-room-container">
    <!-- 顶部导航栏 -->
    <nav class="navbar glass-effect">
      <div class="nav-left">
        <button @click="leaveRoom" class="back-button" :disabled="leavingRoom">
        <span v-if="leavingRoom">退出中...</span>
        <span v-else>← 退出房间</span>
      </button>
      </div>
      <div class="nav-center">
        <h1 class="title">{{ room?.name || '游戏房间' }}</h1>
      </div>
      <div class="nav-right">
        <div class="room-info">
          <span class="room-id">房间号: {{ room?.roomId }}</span>
        </div>
      </div>
    </nav>
    <!-- 房间信息区域 -->
    <div class="room-info-section glass-effect" v-if="!gameStarted">
      <div class="room-details">
        <div class="detail-item">
          <span class="label">入场金币:</span>
          <span class="value">{{ room?.entryGold }}</span>
        </div>
        <div class="detail-item">
          <span class="label">单注金额:</span>
          <span class="value">{{ room?.betAmount }}</span>
        </div>
        <div class="detail-item">
          <span class="label">总局数:</span>
          <span class="value">{{ room?.totalRounds }}</span>
        </div>
        <div class="detail-item">
          <span class="label">当前局数:</span>
          <span class="value">{{ room?.currentRound }}/{{ room?.totalRounds }}</span>
        </div>
      </div>
    </div>
    
    <!-- 玩家列表 -->
    <div class="players-section glass-effect" v-if="!gameStarted">
      <h2 class="section-title">房间玩家 ({{ room?.players?.length || 0 }}/5)</h2>
      <div class="players-grid">
        <div 
          v-for="player in room?.players" 
          :key="player.id"
          class="player-card"
          :class="{ 'is-self': player.isSelf, 'is-ready': player.isReady }"
        >
          <div class="player-avatar">
            <div class="avatar-placeholder">👤</div>
          </div>
          <div class="player-name">{{ player.nickname || player.phoneNumber }}</div>
          <div class="player-status">
            <span v-if="player.isReady" class="ready-tag">已准备</span>
            <span v-else class="not-ready-tag">未准备</span>
          </div>
          <div class="player-gold">💰 {{ player.roomGold }}</div>
        </div>
        
        <!-- 空位占位符 -->
        <div 
          v-for="index in (5 - (room?.players?.length || 0))" 
          :key="'empty-' + index"
          class="player-card empty-slot"
        >
          <div class="player-avatar">
            <div class="avatar-placeholder">➕</div>
          </div>
          <div class="player-name">空位</div>
          <div class="player-status">等待加入</div>
        </div>
      </div>
    </div>
    
    <!-- 准备区域 -->
    <div class="ready-section" v-if="!gameStarted">
      <button 
        @click="toggleReady" 
        class="ready-button"
        :class="{ 'ready': isReady }"
        :disabled="!room"
      >
        {{ isReady ? '取消准备' : '准备开始' }}
      </button>
      
      <button 
        @click="startGame" 
        class="start-button"
        :disabled="!canStartGame"
      >
        开始游戏
      </button>
    </div>
    
    <!-- 游戏区域 -->
    <div v-if="gameStarted" class="game-section">
      <GameBoard 
        :game="currentGame"
        :room="room"
        class="game-board-section"
      />
      <BetControls
        v-if="isCurrentPlayer && currentGame && authStore?.user?.id"
        :current-bet="currentPlayerBet"
        :min-bet="minBet"
        :player-gold="currentPlayerGold"
        :active-players="activePlayers"
        :can-see-cards="canSeeCards"
        :can-call="canCall"
        :can-raise="canRaise"
        :can-fold="canFold"
        :can-compare="canCompare"
        :is-current-player="isCurrentPlayer"
        :is-player-turn="isPlayerTurn"
        :game-id="currentGame._id || currentGame.id"
        :user-id="authStore?.user?.id"
        class="bet-controls-section"
      />
    </div>
    

  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, triggerRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GameBoard from '@/components/GameBoard.vue';
import BetControls from '@/components/BetControls.vue';
import socket from '@/utils/socket';
import { useRoomStore } from '@/stores/room';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'GameRoom',
  components: {
    GameBoard,
    BetControls
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const roomStore = useRoomStore();
    const gameStore = useGameStore();
    const authStore = useAuthStore();
    
    // 状态
    const room = ref(null);
    const currentGame = ref(null);
    const isReady = ref(false);
    const gameStarted = ref(false);
    const leavingRoom = ref(false);
    
    // 计算属性
    const minBet = computed(() => {
      return currentGame.value ? currentGame.value.minBet : 0;
    });
    
    const maxBet = computed(() => {
      if (!currentGame.value) return 0;
      const player = currentGame.value.players?.find(p => p.isSelf);
      return player ? player.roomGold : 0;
    });
    
    const quickRaiseOptions = computed(() => {
      if (!minBet.value) return [];
      return [minBet.value, minBet.value * 2, minBet.value * 5];
    });
    
    const currentPlayer = computed(() => {
      try {
        if (!currentGame.value || !currentGame.value.players) return null;
        
        const player = currentGame.value.players.find(p => p && p.isSelf);
        console.log('currentPlayer:', player);
        return player;
      } catch (error) {
        console.error('currentPlayer计算属性出错:', error);
        return null;
      }
    });
    
    const currentPlayerBet = computed(() => {
      try {
        const bet = currentPlayer.value ? currentPlayer.value.currentBet : 0;
        return bet;
      } catch (error) {
        console.error('currentPlayerBet计算属性出错:', error);
        return 0;
      }
    });
    
    const currentPlayerGold = computed(() => {
      try {
        const gold = currentPlayer.value ? currentPlayer.value.roomGold : 0;
        return gold;
      } catch (error) {
        console.error('currentPlayerGold计算属性出错:', error);
        return 0;
      }
    });
    
    const activePlayers = computed(() => {
      try {
        if (!currentGame.value || !currentGame.value.players) return [];
        
        const players = currentGame.value.players.filter(p => p && p.status === 'playing');
        return players;
      } catch (error) {
        console.error('activePlayers计算属性出错:', error);
        return [];
      }
    });
    
    const isCurrentPlayer = computed(() => {
      try {
        const isCurrent = !!currentPlayer.value;
        console.log('isCurrentPlayer:', isCurrent);
        return isCurrent;
      } catch (error) {
        console.error('isCurrentPlayer计算属性出错:', error);
        return false;
      }
    });
    
    const isPlayerTurn = computed(() => {
      try {
        if (!currentGame.value || !currentPlayer.value) return false;
        
        // 检查当前游戏状态是否为下注阶段
        if (currentGame.value.status !== 'betting') return false;
        
        // 检查当前玩家是否在活跃玩家列表中
        if (currentPlayer.value.status !== 'playing') return false;
        
        // 检查是否轮到当前玩家（根据游戏逻辑，通常是currentGame.currentPlayerId字段）
        // 比较当前玩家的userId与游戏中当前轮到的玩家ID
        const isTurn = currentGame.value.currentPlayerId?.toString() === currentPlayer.value.userId?.toString();
        
        return isTurn;
      } catch (error) {
        console.error('isPlayerTurn计算属性出错:', error);
        return false;
      }
    });
    
    // 检查玩家是否可以执行各种操作
    const canSeeCards = computed(() => {
      try {
        const can = currentPlayer.value && 
                   !currentPlayer.value.hasSeenCards &&
                   currentGame.value?.status === 'betting' &&
                   isCurrentPlayer.value; // 确保只有当前玩家可以操作
        return can;
      } catch (error) {
        console.error('canSeeCards计算属性出错:', error);
        return false;
      }
    });
    
    const canCall = computed(() => {
      try {
        const can = currentPlayer.value && 
                   currentPlayer.value.status === 'playing' &&
                   currentGame.value?.status === 'betting' &&
                   isCurrentPlayer.value; // 确保只有当前玩家可以操作
        return can;
      } catch (error) {
        console.error('canCall计算属性出错:', error);
        return false;
      }
    });
    
    const canRaise = computed(() => {
      try {
        const can = currentPlayer.value && 
                   currentPlayer.value.status === 'playing' &&
                   currentGame.value?.status === 'betting' &&
                   isCurrentPlayer.value; // 确保只有当前玩家可以操作
        return can;
      } catch (error) {
        console.error('canRaise计算属性出错:', error);
        return false;
      }
    });
    
    const canFold = computed(() => {
      try {
        const can = currentPlayer.value && 
                   currentPlayer.value.status === 'playing' &&
                   currentGame.value?.status === 'betting' &&
                   isCurrentPlayer.value; // 确保只有当前玩家可以操作
        return can;
      } catch (error) {
        console.error('canFold计算属性出错:', error);
        return false;
      }
    });
    
    const canCompare = computed(() => {
      try {
        const can = currentPlayer.value && 
                   currentPlayer.value.status === 'playing' && 
                   activePlayers.value.length > 1 &&
                   currentGame.value?.status === 'betting' &&
                   isCurrentPlayer.value; // 确保只有当前玩家可以操作
        return can;
      } catch (error) {
        console.error('canCompare计算属性出错:', error);
        return false;
      }
    });
    
    const canStartGame = computed(() => {
      // 检查房间是否存在且有足够玩家
      if (!room.value || !room.value.players || room.value.players.length < 2) {
        return false;
      }
      
      // 检查所有玩家是否已准备
      const allReady = room.value.players.every(p => p.isReady);
      if (!allReady) {
        return false;
      }
      
      // 检查当前用户是否是房主（房间创建者）
      const isCreator = room.value.creator && 
                       (room.value.creator._id?.toString() === authStore?.user?.id?.toString() || 
                        room.value.creator.toString() === authStore?.user?.id?.toString());
      
      return isCreator;
    });
    
    // 方法
    const toggleReady = () => {
      if (!room.value) return;
      
      socket.emit('player_ready', {
        roomId: room.value.roomId,
        userId: authStore?.user?.id,
        isReady: !isReady.value
      });
      
      // 不再直接更新本地状态，而是等待服务器响应后通过room_updated事件更新
      // isReady.value = !isReady.value;
    };
    
    // 包装socket请求为Promise的辅助函数
    const socketRequest = (event, data) => {
      return new Promise((resolve, reject) => {
        // 监听成功响应
        const successEvent = `${event}_success`;
        const errorEvent = 'error';
        
        const handleSuccess = (response) => {
          socket.off(successEvent, handleSuccess);
          socket.off(errorEvent, handleError);
          resolve(response);
        };
        
        const handleError = (error) => {
          socket.off(successEvent, handleSuccess);
          socket.off(errorEvent, handleError);
          reject(new Error(error.message || '请求失败'));
        };
        
        socket.on(successEvent, handleSuccess);
        socket.on(errorEvent, handleError);
        
        // 发送请求
        socket.emit(event, data);
      });
    };
    
    const startGame = () => {
      if (!room.value) {
        return;
      }
      
      socket.emit('start_game', {
        roomId: room.value.roomId,
        userId: authStore?.user?.id
      });
    };
    
    const leaveRoom = async () => {
      if (!room.value || leavingRoom.value) return;
      
      leavingRoom.value = true;
      
      try {
        // 发送离开房间请求并等待响应
        await socketRequest('leave_room', {
          roomId: room.value.roomId,
          userId: authStore?.user?.id
        });
        
        // 只有在服务器确认后才跳转
        router.push('/');
      } catch (error) {
        console.error('退出房间失败:', error.message);
        alert('退出房间失败: ' + error.message);
      } finally {
        leavingRoom.value = false;
      }
    };
    

    // 测试socket连接的方法
    const testSocketConnection = () => {

      socket.emit('test_event', { message: '这是一个测试消息', timestamp: new Date() });
    };
    
    // Socket事件监听
    const setupSocketListeners = () => {
      
      // 监听currentGame的变化
      // watch(currentGame, (newVal, oldVal) => {
      //   // 触发计算属性重新计算
      // }, { deep: true });
      
      // 监听测试响应
      socket.on('test_response', (data) => {
        console.log('GameRoom: Received test_response', data);
      });
      
      socket.on('test_event', (data) => {
        console.log('GameRoom: Received test_event', data);
        // 发送响应
        socket.emit('test_response', { response: '测试响应', originalData: data });
      });
      
      socket.on('room_updated', (updatedRoom) => {
        console.log('GameRoom: Received room_updated', updatedRoom);
        // 更新房间信息
        room.value = updatedRoom;
        
        // 检查房间状态
        if (updatedRoom.status === 'playing' && !gameStarted.value) {
          gameStarted.value = true;
          
          // 房间开始游戏后，主动获取游戏数据
          socket.emit('get_game_data', {
            roomId: route.params.roomId,
            userId: authStore?.user?.id
          });
        }
        
        // 更新准备状态
        const selfPlayer = updatedRoom.players?.find(p => p.isSelf);
        isReady.value = selfPlayer ? selfPlayer.isReady : false;
      });
      
      socket.on('player_left', (data) => {
        console.log('GameRoom: Received player_left', data);
        // 服务器会发送room_updated事件，所以这里可以不做特殊处理
        // 或者可以显示一个提示消息
        if (data.nickname) {
          // 显示玩家离开提示
        }
      });
      
      socket.on('game_started', (gameData) => {
        console.log('GameRoom: Received game_started', gameData);
        console.log('Before assignment:', currentGame.value);
        console.log('Game data ID:', gameData?._id || gameData?.id);
        gameStarted.value = true;
        currentGame.value = gameData;
        triggerRef(currentGame);
        
        // 更新room中的玩家金币信息，确保座位显示与操作栏一致
        if (room.value && gameData.players) {
          const updatedPlayers = room.value.players.map(roomPlayer => {
            const gamePlayer = gameData.players.find(gp => 
              gp.userId.toString() === roomPlayer.userId.toString()
            );
            return {
              ...roomPlayer,
              roomGold: gamePlayer ? gamePlayer.roomGold : roomPlayer.roomGold
            };
          });
          room.value = {
            ...room.value,
            players: updatedPlayers
          };
        }
      });
      
      socket.on('game_state_update', (gameData) => {
        console.log('GameRoom: Received game_state_update', gameData);
        console.log('Game state update ID:', gameData?._id || gameData?.id);
        console.log('Game state update currentPlayerId:', gameData?.currentPlayerId);
        console.log('Game state update players:', gameData?.players?.map(p => ({
          userId: p.userId,
          roomGold: p.roomGold,
          isSelf: p.isSelf
        })));
        
        // 确保gameData有id字段，如果没有则尝试从currentGame获取
        const updatedGameData = {
          ...gameData,
          id: gameData._id || gameData.id || currentGame.value?._id || currentGame.value?.id
        };
        
        currentGame.value = updatedGameData;
        
        // 更新room中的玩家金币信息，确保座位显示与操作栏一致
        if (room.value && updatedGameData.players) {
          const updatedPlayers = room.value.players.map(roomPlayer => {
            const gamePlayer = updatedGameData.players.find(gp => 
              gp.userId.toString() === roomPlayer.userId.toString()
            );
            return {
              ...roomPlayer,
              roomGold: gamePlayer ? gamePlayer.roomGold : roomPlayer.roomGold
            };
          });
          room.value = {
            ...room.value,
            players: updatedPlayers
          };
        }
        
        if (gameStore && typeof gameStore.setCurrentGame === 'function') {
          gameStore.setCurrentGame(updatedGameData);
        }
      });
      
      socket.on('game_action_result', (result) => {
        console.log('GameRoom: Received game_action_result', result);
        console.log('Game action result ID:', result?._id || result?.id);
        console.log('Game action result currentPlayerId:', result?.currentPlayerId);
        console.log('Game action result players:', result?.players?.map(p => ({
          userId: p.userId,
          roomGold: p.roomGold,
          isSelf: p.isSelf
        })));
        
        // 确保result有id字段，如果没有则尝试从currentGame获取
        const updatedResult = {
          ...result,
          id: result._id || result.id || currentGame.value?._id || currentGame.value?.id
        };
        
        // 处理游戏操作结果
        currentGame.value = updatedResult;
        
        // 更新room中的玩家金币信息，确保座位显示与操作栏一致
        if (room.value && updatedResult.players) {
          const updatedPlayers = room.value.players.map(roomPlayer => {
            const gamePlayer = updatedResult.players.find(gp => 
              gp.userId.toString() === roomPlayer.userId.toString()
            );
            return {
              ...roomPlayer,
              roomGold: gamePlayer ? gamePlayer.roomGold : roomPlayer.roomGold
            };
          });
          room.value = {
            ...room.value,
            players: updatedPlayers
          };
        }
        
        if (gameStore && typeof gameStore.setCurrentGame === 'function') {
          gameStore.setCurrentGame(updatedResult);
        }
        // 重置BetControls组件的加载状态
        // 注意：对话框状态由BetControls组件内部管理，这里不需要处理
      });
      
      socket.on('game_ended', (result) => {
        console.log('GameRoom: Received game_ended', result);
        gameStarted.value = false;
        currentGame.value = null;
        if (gameStore && typeof gameStore.clearCurrentGame === 'function') {
          gameStore.clearCurrentGame();
        }
        
        // 显示游戏结果
        if (result && result.winner) {
          alert(`游戏结束！${result.winner.nickname} 获胜，赢得 ${result.reward || 0} 金币`);
        }
      });
      
      socket.on('error', (error) => {
        console.log('GameRoom: Received error', error);
        alert(error.message || '发生未知错误');
      });
      
      // 监听房间解散事件
      socket.on('room_disbanded', (data) => {
        console.log('GameRoom: Received room_disbanded', data);
        // 显示房间解散消息
        alert(data.message);
        // 跳转到首页
        router.push('/');
      });
      
      // 监听离开房间成功事件
      socket.on('leave_room_success', () => {
        console.log('GameRoom: Received leave_room_success');
        // 跳转到首页
        router.push('/');
      });
    };

    // 等待Socket连接建立
    const waitForSocketConnection = () => {
      return new Promise((resolve) => {
        if (socket.getStatus().connected) {
          resolve();
          return;
        }
        
        const checkConnection = setInterval(() => {
          if (socket.getStatus().connected) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
        
        // 设置超时时间
        setTimeout(() => {
          clearInterval(checkConnection);
          resolve(); // 即使未连接也继续，避免无限等待
        }, 5000);
      });
    };
    
    const removeSocketListeners = () => {
      socket.off('room_updated');
      socket.off('player_left');
      socket.off('game_started');
      socket.off('game_state_update');
      socket.off('game_action_result');
      socket.off('game_ended');
      socket.off('error');
      socket.off('room_disbanded');
      socket.off('leave_room_success');
    };
    
    // 生命周期
    onMounted(async () => {
      try {
        // 获取房间详情
        const roomId = route.params.roomId;
        const roomDetail = await roomStore.fetchRoomDetail(roomId);
        room.value = roomDetail;
        
        // 检查用户是否已经在房间内
        const isPlayerInRoom = roomDetail.players && 
          roomDetail.players.some(player => player.userId === authStore?.user?.id);
        
        // 如果用户不在房间内，则加入房间
        if (!isPlayerInRoom) {
          // 加入房间（房间金币由房间设置决定）
          await roomStore.joinRoom(roomId);
          // 更新房间信息
          room.value = roomStore.currentRoom;
        }
        
        // 初始化Socket连接
        const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
        socket.connect(socketUrl);
        
        // 设置Socket监听器
        setupSocketListeners();
        
        // 等待Socket连接建立
        await waitForSocketConnection();
        
        // 设置Socket连接
        socket.emit('user_join', {
          userId: authStore?.user?.id,
          roomId: roomId
        });
      } catch (error) {
        console.error('加入房间失败:', error);
        alert(error.message || '加入房间失败');
        router.push('/');
      }
    });
    
    onUnmounted(() => {
      // 清理Socket监听器
      removeSocketListeners();
      
      // 离开房间
      if (room.value) {
        socket.emit('leave_room', {
          roomId: room.value.roomId,
          userId: authStore?.user?.id
        });
      }
      
      // 断开Socket连接
      socket.disconnect();
    });
    
    return {
      room,
      currentGame,
      isReady,
      gameStarted,
      minBet,
      maxBet,
      quickRaiseOptions,
      currentPlayer,
      isCurrentPlayer,
      currentPlayerBet,
      currentPlayerGold,
      canSeeCards,
      canCall,
      canRaise,
      canFold,
      canCompare,
      canStartGame,
      activePlayers,
      leavingRoom,
      toggleReady,
      startGame,
      leaveRoom,
      isPlayerTurn,
      authStore
    };
  }
};
</script>

<style scoped>
.game-room-container {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #f0f0f0;
  display: flex;
  flex-direction: column;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.back-button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 12px;
  color: #f0f0f0;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
}

.room-id {
  font-size: 14px;
  color: #b2b2b2;
}

.room-info-section {
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.room-details {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  font-size: 14px;
  color: #b2b2b2;
  margin-bottom: 5px;
}

.value {
  font-size: 18px;
  font-weight: 700;
  color: #6c5ce7;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 20px;
  color: #f0f0f0;
}

.players-section {
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.player-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.player-card.is-self {
  border-color: #6c5ce7;
  background: rgba(108, 92, 231, 0.1);
}

.player-card.is-ready {
  border-color: #00b894;
  background: rgba(0, 184, 148, 0.1);
}

.player-card.empty-slot {
  opacity: 0.5;
  cursor: default;
}

.player-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.avatar-placeholder {
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
  color: #f0f0f0;
  margin-bottom: 5px;
  text-align: center;
}

.player-status {
  font-size: 12px;
  color: #b2b2b2;
  margin-bottom: 5px;
}

.ready-tag {
  color: #00b894;
  font-weight: 600;
}

.not-ready-tag {
  color: #ff7675;
  font-weight: 600;
}

.player-gold {
  font-size: 14px;
  color: #ffd700;
  font-weight: 600;
}

.ready-section {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px;
}

.ready-button,
.start-button,
.test-button {
  padding: 15px 30px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ready-button {
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  color: white;
}

.ready-button.ready {
  background: linear-gradient(135deg, #00b894, #81eacb);
}

.start-button {
  background: linear-gradient(135deg, #00d2d3, #81ecec);
  color: white;
}

.ready-button:hover:not(:disabled),
.start-button:hover:not(:disabled),
.test-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.ready-button:disabled,
.start-button:disabled,
.test-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-button {
  background: linear-gradient(135deg, #fd79a8, #fdcb6e);
  color: white;
}

.game-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 允许flex项目收缩到内容高度以下 */
}

.game-board-section {
  flex: 1;
  min-height: 0; /* 允许flex项目收缩到内容高度以下 */
}

.bet-controls-section {
  flex-shrink: 0; /* 防止控制区域被压缩 */
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  min-width: 300px;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog h3 {
  margin-top: 0;
  color: #f0f0f0;
  text-align: center;
}

.dialog-content {
  margin: 20px 0;
}

.dialog-input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #666;
  background: #333;
  color: #f0f0f0;
  margin-bottom: 15px;
}

.raise-options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-raise-button {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: rgba(108, 92, 231, 0.3);
  color: #f0f0f0;
  cursor: pointer;
}

.quick-raise-button:hover {
  background: rgba(108, 92, 231, 0.5);
}

.player-option {
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  margin-bottom: 10px;
  cursor: pointer;
  text-align: center;
}

.player-option:hover:not(.disabled) {
  background: rgba(108, 92, 231, 0.3);
}

.player-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.cancel-button,
.confirm-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.cancel-button {
  background: #666;
  color: #f0f0f0;
}

.confirm-button {
  background: #6c5ce7;
  color: white;
}

.glass-effect {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
