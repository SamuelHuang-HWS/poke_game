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
          <span 
            class="room-id clickable" 
            @click="copyRoomId" 
            title="点击复制房间号"
          >
            房间号: {{ room?.roomId }} 📋
          </span>
        </div>
      </div>
    </nav>
    
    <!-- 游戏恢复加载中 -->
    <div v-if="isRestoring" class="restoring-overlay glass-effect">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在恢复游戏...</div>
    </div>

    <!-- 房间信息区域 -->
    <div class="room-info-section glass-effect" v-if="!gameStarted && !settlementInProgress && !isRestoring">
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
    <div class="players-section glass-effect" v-if="!gameStarted && !settlementInProgress && !isRestoring">
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
    <div class="ready-section" v-if="!gameStarted && !settlementInProgress && !isRestoring">
      <button 
        @click="toggleReady" 
        class="ready-button"
        :class="{ 'ready': isReady }"
        :disabled="!room"
      >
        {{ isReady ? '取消准备' : '准备' }}
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
        @view-hand="openBigCards"
      />
      <BetControls
        v-if="isCurrentPlayer && currentGame && authStore?.user?.id"
        v-model="showCardsExpanded"
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
        :has-seen-cards="currentPlayer?.hasSeenCards"
        :betting-round="currentGame?.bettingRound || 1"
        :cards="currentPlayer?.cards"
        class="bet-controls-section"
      />
    </div>
    
    <!-- 结算模态框 -->
    <SettlementModal
      v-model="settlementModalVisible"
      :winner="settlementData.winner"
      :players-results="settlementData.playersResults"
      :is-final-settlement="settlementData.isFinalSettlement"
      :current-round="settlementData.currentRound"
      :total-rounds="settlementData.totalRounds"
      :confirmations="settlementData.confirmations"
      :players="settlementData.players"
      :round-players="settlementData.roundPlayers"
      :settlement-deadline="settlementData.settlementDeadline"
      @continue="handleSettlementContinue"
      @exit="handleSettlementExit"
    />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, triggerRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import GameBoard from '@/components/GameBoard.vue';
import BetControls from '@/components/BetControls.vue';
import SettlementModal from '@/components/SettlementModal.vue';
import Card from '@/components/Card.vue';
import socket from '@/utils/socket';
import { useRoomStore } from '@/stores/room';
import { useGameStore } from '@/stores/game';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'GameRoom',
  components: {
    GameBoard,
    BetControls,
    SettlementModal,
    Card
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const roomStore = useRoomStore();
    const gameStore = useGameStore();
    const authStore = useAuthStore();
    const toast = useToast();
    
    // 状态
    const room = ref(null);
    const currentGame = ref(null);
    const isReady = ref(false);
    const gameStarted = ref(false);
    const leavingRoom = ref(false);
    const settlementModalVisible = ref(false);
    const settlementInProgress = ref(false);
    const currentGameId = ref(null);
    const settlementData = ref({
      winner: null,
      playersResults: [],
      isFinalSettlement: false,
      currentRound: 0,
      totalRounds: 0,
      confirmations: null,
      players: []
    });
    const showCardsExpanded = ref(true);  // 默认展开
    const isRestoring = ref(false); // 是否主要恢复游戏状态
    
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
        const bet = currentPlayer.value ? currentPlayer.value.totalBet : 0;
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
                   currentGame.value?.bettingRound > 3 &&
                   isCurrentPlayer.value;
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
    
    // 监听当前玩家是否已看牌，自动展开大牌
    watch(() => currentPlayer.value?.hasSeenCards, (newVal) => {
      if (newVal) {
        //稍微延迟一点，确保动画或数据已到位
        setTimeout(() => {
          showCardsExpanded.value = true;
        }, 300);
      }
    });

    const openBigCards = () => {
      console.log('GameRoom: openBigCards triggered, setting showCardsExpanded to true');
      showCardsExpanded.value = true;
    };
    
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
    
    const copyRoomId = async () => {
      if (!room.value?.roomId) return;
      
      const text = room.value.roomId;
      
      try {
        // 优先使用 Clipboard API (需要安全上下文 HTTPS/Localhost)
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback: 使用 textarea + execCommand
            const textArea = document.createElement("textarea");
            textArea.value = text;
            
            // 避免滚动到底部
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (!successful) throw new Error('execCommand copy failed');
        }
        toast.success('房间号已复制到剪贴板');
      } catch (err) {
        console.error('复制失败', err);
        toast.error(`复制失败: ${err.message || '未知错误'}`);
      }
    };

    const leaveRoom = async () => {
      if (!room.value || leavingRoom.value) return;
      
      leavingRoom.value = true;
      
      try {
        const data = {
          roomId: room.value.roomId,
          userId: authStore?.user?.id
        };
        console.log('GameRoom: Emit leave_room', data);
        // 发送离开房间请求并等待响应
        await socketRequest('leave_room', data);
        
        // 清除Socket中的房间信息
        socket.clearCurrentRoom();
        
        // 只有在服务器确认后才跳转
        router.push('/');
      } catch (error) {
        console.error('退出房间失败:', error.message);
        toast.error('退出房间失败: ' + error.message);
      } finally {
        leavingRoom.value = false;
      }
    };
    
    const handleSettlementContinue = () => {
      const gameId = currentGameId.value;
      const userId = authStore.user?.id;
      
      console.log('handleSettlementContinue called with gameId:', gameId, 'userId:', userId);
      
      if (gameId && userId) {
        socket.emit('confirm_continue', { gameId, userId });
      } else {
        console.error('Missing gameId or userId:', { gameId, userId });
      }
    };
    
    const handleSettlementExit = () => {
      settlementInProgress.value = false;
      settlementModalVisible.value = false;
      settlementData.value = {
        winner: null,
        playersResults: [],
        isFinalSettlement: false,
        currentRound: 0,
        totalRounds: 0
      };
      leaveRoom();
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
        const responseData = { response: '测试响应', originalData: data };
        console.log('GameRoom: Emit test_response', responseData);
        // 发送响应
        socket.emit('test_response', responseData);
      });
      
      socket.on('room_updated', (updatedRoom) => {
        console.log('GameRoom: Received room_updated', updatedRoom);
        console.log('Room status:', updatedRoom.status, 'gameStarted:', gameStarted.value);
        
        // 更新房间信息
        room.value = updatedRoom;
        
        // 检查房间状态
        if (updatedRoom.status === 'playing' && !gameStarted.value) {
          gameStarted.value = true;
          
          // 房间开始游戏后，主动获取游戏数据
          const data = {
            roomId: route.params.roomId,
            userId: authStore?.user?.id
          };
          console.log('GameRoom: Emit get_game_data', data);
          socket.emit('get_game_data', data);
        } else if (updatedRoom.status === 'waiting' && gameStarted.value) {
          // 房间状态变为等待，但不立即设置gameStarted为false
          // 让round_ended或game_ended事件来控制结算弹窗的显示
          console.log('Room status changed to waiting, waiting for round_ended event');
        }
        
        // 更新准备状态
        const selfPlayer = updatedRoom.players?.find(p => p.userId === authStore?.user?.id);
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
      
      socket.on('player_folded', (data) => {
        console.log('GameRoom: Received player_folded', data);
        if (data.userId === authStore?.user?.id) {
          toast.info('您已弃牌');
        } else {
          toast.info(`玩家 ${data.nickname || data.userId} 弃牌`);
        }
      });
      
      // 全局错误处理
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error(error.message || '服务器发生错误');
      });
      
      // 游戏错误处理
      socket.on('game_error', (data) => {
        console.error('Game error:', data);
        toast.error(data.message || '游戏发生错误');
      });
      
      socket.on('player_offline_folded', (data) => {
        console.log('GameRoom: Received player_offline_folded', data);
        // 玩家断线超时自动弃牌通知
        if (data.message) {
          // 可以在这里显示断线弃牌提示
        }
      });
      
      socket.on('game_started', (gameData) => {
        console.log('GameRoom: Received game_started', gameData);
        console.log('Before assignment:', currentGame.value);
        console.log('Game data ID:', gameData?._id || gameData?.id);
        console.log('Game data ID:', gameData?._id || gameData?.id);
        gameStarted.value = true;
        isRestoring.value = false; // 恢复完成
        currentGame.value = gameData;
        currentGameId.value = gameData?._id || gameData?.id;
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
      
      socket.on('round_ended', (result) => {
        console.log('GameRoom: Received round_ended', result);
        settlementInProgress.value = true;
        gameStarted.value = false;
        currentGame.value = null;
        if (gameStore && typeof gameStore.clearCurrentGame === 'function') {
          gameStore.clearCurrentGame();
        }
        
        settlementData.value = {
          winner: result.winner,
          playersResults: [],
          isFinalSettlement: false,
          currentRound: result.currentRound,
          totalRounds: result.totalRounds,
          confirmations: result.confirmations || {},
          players: result.players || [],
          roundPlayers: result.roundPlayers || []
        };
        settlementModalVisible.value = true;
      });
      
      socket.on('game_ended', (result) => {
        console.log('GameRoom: Received game_ended', result);
        settlementInProgress.value = true;
        gameStarted.value = false;
        currentGame.value = null;
        if (gameStore && typeof gameStore.clearCurrentGame === 'function') {
          gameStore.clearCurrentGame();
        }
        
        // 显示最终结算
        settlementData.value = {
          winner: result.winner,
          playersResults: result.playersResults || [],
          isFinalSettlement: true,
          currentRound: result.totalRounds,
          totalRounds: result.totalRounds,
          roundPlayers: result.roundPlayers || []
        };
        settlementModalVisible.value = true;
      });
      
      socket.on('error', (error) => {
        console.log('GameRoom: Received error', error);
        toast.error(error.message || '发生未知错误');
      });
      
      socket.on('player_confirmed', (data) => {
        console.log('GameRoom: Received player_confirmed', data);
        const confirmedCount = Object.values(data.confirmations).filter(Boolean).length;
        const totalCount = Object.keys(data.confirmations).length;
        console.log(`玩家确认进度: ${confirmedCount}/${totalCount}`);
        
        if (settlementData.value) {
          settlementData.value.confirmations = data.confirmations;
        }
      });
      
      socket.on('next_round_started', (gameData) => {
        console.log('GameRoom: Received next_round_started', gameData);
        try {
          settlementInProgress.value = false;
          settlementModalVisible.value = false;
          settlementData.value = {
            winner: null,
            playersResults: [],
            isFinalSettlement: false,
            currentRound: 0,
            totalRounds: 0
          };
          currentGame.value = gameData;
          currentGameId.value = gameData?._id || gameData?.id;
          gameStarted.value = true;
        } catch (error) {
          console.error('处理 next_round_started 事件时出错:', error);
          // 即使有错误，也要确保弹窗被关闭
          settlementInProgress.value = false;
          settlementModalVisible.value = false;
          gameStarted.value = true;
        }
      });
      
      // 监听房间解散事件
      socket.on('room_disbanded', (data) => {
        console.log('GameRoom: Received room_disbanded', data);
        // 显示房间解散消息
        toast.info(data.message);
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
      return new Promise((resolve, reject) => {
        if (socket.getStatus().connected) {
          resolve();
          return;
        }
        
        let checkCount = 0;
        const maxChecks = 100; // 最多检查 100 次，每次 100ms，总共 10 秒
        
        const checkConnection = setInterval(() => {
          checkCount++;
          
          if (socket.getStatus().connected) {
            clearInterval(checkConnection);
            resolve();
          } else if (checkCount >= maxChecks) {
            clearInterval(checkConnection);
            reject(new Error('Socket连接超时'));
          }
        }, 100);
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
        console.log('Fetched room detail:', roomDetail);
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
        const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
        socket.connect(socketUrl);
        
        // 设置Socket监听器
        setupSocketListeners();
        
        // 等待Socket连接建立
        await waitForSocketConnection();
        console.log('Socket connected, verifying game state...');
        
        // 设置当前房间信息，用于重连时自动重新加入
        socket.setCurrentRoom(roomId, authStore?.user?.id);
        
        // 加入房间
        socket.emit('user_join', {
          userId: authStore?.user?.id,
          roomId: roomId
        });

        // 如果房间状态是playing，且当前没在游戏中，尝试恢复游戏状态
        // 强制检查：只要房间是playing，就去拉取游戏数据
        if (roomDetail.status === 'playing') {
          console.log('Room is playing, attempting to restore game state via get_game_data...');
          isRestoring.value = true; // 标记正在恢复，避免显示大厅
          console.log('Request payload:', { roomId, userId: authStore?.user?.id });
          socket.emit('get_game_data', {
            roomId: roomId,
            userId: authStore?.user?.id
          });
        } else {
             console.log('Room is not playing. Status:', roomDetail.status);
             isRestoring.value = false;
        }
      } catch (error) {
        console.error('加入房间失败:', error);
        
        let errorMessage = '加入房间失败';
        if (error.message && error.message.includes('Socket连接超时')) {
          errorMessage = 'Socket连接超时，请检查网络连接或刷新页面重试';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage);
        router.push('/');
      }
    });
    
    onUnmounted(() => {
      // 清理Socket监听器
      removeSocketListeners();
      
      // 离开房间 -注释掉，防止刷新页面时触发离开房间导致游戏状态丢失
      // if (room.value) {
      //   socket.emit('leave_room', {
      //     roomId: room.value.roomId,
      //     userId: authStore?.user?.id
      //   });
      // }
      
      // 清除Socket中的房间信息
      socket.clearCurrentRoom();
      
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
      copyRoomId,
      isPlayerTurn,
      authStore,
      settlementModalVisible,
      settlementInProgress,
      settlementData,
      handleSettlementContinue,
      handleSettlementExit,
      showCardsExpanded,
      openBigCards
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

.room-info {
  display: flex;
  align-items: center;
}

.room-id {
  font-size: 16px;
  color: #f0f0f0;
}

.room-id.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
}

.room-id.clickable:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #00d2d3;
}

.room-id.clickable:active {
  transform: scale(0.95);
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
/* 移动端横屏适配 */
@media screen and (orientation: landscape) and (max-height: 600px) {
  .game-room-container {
    padding: 8px;
    height: 100vh;
    overflow: hidden;
  }

  .navbar {
    padding: 4px 10px;
    margin-bottom: 4px;
    min-height: 40px;
  }

  .title {
    font-size: 16px;
  }

  .back-button {
    padding: 4px 10px;
    font-size: 14px;
  }

  .game-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* 允许 flex 子项收缩 */
    gap: 4px;
  }

  :deep(.game-board) {
    flex: 1;
    min-height: 0;
    /* 确保棋盘内容缩放 */
    transform-origin: center top;
  }

  /* 调整 BetControls 的空间 */
  :deep(.bet-controls) {
    padding: 5px 10px;
    margin-top: auto; /* 推到底部 */
  }

/* 恢复游戏加载遮罩 */
.restoring-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: #ffd700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  color: #fff;
  font-size: 18px;
  font-weight: 500;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
  
  /* 待开始状态的布局优化 */
  .room-info-section {
    display: flex;
    padding: 5px 10px;
    margin-bottom: 5px;
    align-items: center;
  }

  .room-details {
    width: 100%;
    justify-content: space-between;
    gap: 10px;
  }

  .detail-item {
    flex-direction: row;
    gap: 5px;
    margin-bottom: 0;
  }

  .label, .value {
    font-size: 12px;
    margin-bottom: 0;
  }

  .section-title {
    font-size: 14px;
    margin-bottom: 5px;
  }

  .players-section {
    display: block;   /* 恢复显示 */
    flex: 1;          /* 占据剩余空间 */
    overflow-y: auto; /* 允许滚动 */
    padding: 5px 10px;
    margin-bottom: 5px;
    min-height: 0;
  }
   
  .players-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }

  .player-card {
    padding: 8px;
  }
  
  .player-avatar {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }
  
  .player-name {
    font-size: 12px;
  }

  /* 准备按钮区域 */
  .ready-section {
    padding: 5px;
    margin-top: 0;
  }

  .ready-button, .start-button {
    padding: 8px 20px;
    font-size: 14px;
  }
}
</style>
