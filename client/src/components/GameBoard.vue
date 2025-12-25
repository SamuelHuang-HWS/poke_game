// client/src/components/GameBoard.vue
<template>
  <div class="game-board glass-effect">
    <!-- 顶部信息栏 -->
    <div class="board-header">
      <div class="room-info">
        <span class="room-id">房间号: {{ room?.roomId || '' }}</span>
        <span class="room-round">第 {{ room?.currentRound || 0 }}/{{ room?.totalRounds || 0 }} 局</span>
      </div>
      <div class="pot-info">
        <span class="pot-label">底池:</span>
        <span class="pot-amount">💰 {{ game?.pot || 0 }}</span>
      </div>
    </div>

    <!-- 游戏桌面 -->
    <div class="game-table">
      <!-- 椭圆形桌布 -->
      <div class="poker-table">
        <!-- 中央区域 -->
      <div class="center-area">
        <!-- 游戏状态 -->
        <div v-if="game?.status" class="game-status">
          {{ getStatusText(game.status) }}
        </div>

        <!-- 下注阶段的筹码显示 -->
         <div v-if="game?.status === 'betting'" class="betting-chips">
           <div class="pot-amount">当前底池: 💰 {{ game?.pot || 0 }}</div>
           <div class="chips-display">
             <div 
               v-for="(player, index) in bettingPlayers" 
               :key="`chip-${player.userId}`"
               class="player-chip"
               :style="{ transform: `rotate(${index * 30 - (bettingPlayers.length * 15)}deg)` }"
             >
               <div class="chip">
                 <!-- <span class="chip-icon">🪙</span> -->
                 <span class="chip-amount">{{ player.currentBet }}</span>
               </div>
               <!-- <div class="player-name">{{ player.nickname?.substring(0, 4) || '玩家' }}</div> -->
             </div>
           </div>
         </div>

        <!-- 获胜者信息 -->
        <div v-if="game?.winner" class="winner-info">
          <div class="winner-text">🏆 {{ game.winner.nickname }} 获胜!</div>
          <div class="winner-cards">
            {{ formatCards(game.winner.cards) }} ({{ getCardTypeText(game.winner.cardType) }})
          </div>
          <div class="winnings">获得: 💰 {{ game.winner.winnings }}</div>
        </div>
      </div>
      </div>

      <!-- 玩家座位 -->
      <div class="players-seats">
        <PlayerSeat
          v-for="(player, index) in validDisplayPlayers"
          :key="`player-${player.userId}-${index}`"
          :player="player"
          :is-self="player.isSelf"
          :is-active="isActivePlayer(player)"
          :show-cards="shouldShowCards(player)"
          :position-index="player.positionIndex"
          :total-players="player.totalPlayers"
          :current-player-id="currentPlayerId"
          class="player-seat"
        />
      </div>
    </div>
  </div>
</template>

<script>
import PlayerSeat from './PlayerSeat.vue';
import { formatCards, getCardTypeText } from '@/utils/game';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'GameBoard',
  components: {
    PlayerSeat
  },
  props: {
    room: {
      type: Object,
      default: null
    },
    game: {
      type: Object,
      default: null
    }
  },
  computed: {
    displayPlayers() {
      try {
        if (!this.game?.players) return [];
        
        const gamePlayers = this.game.players;
        const authStore = useAuthStore();
        const currentUserId = authStore.user?.id?.toString();
        
        if (!currentUserId) return gamePlayers.map(p => ({ ...p, isSelf: false }));
        
        // 重新排列玩家，确保当前用户在第一位（位置索引为0，对应桌子下方）
        const reorderedPlayers = [...gamePlayers];
        
        // 找到当前用户并移到数组开头
        const currentUserIndex = reorderedPlayers.findIndex(player => 
          player.userId.toString() === currentUserId
        );
        if (currentUserIndex > -1) {
          const currentUser = reorderedPlayers.splice(currentUserIndex, 1)[0];
          reorderedPlayers.unshift(currentUser);
        }
        
        // 为重新排列的玩家分配位置索引，确保当前用户在索引0（桌子下方）
        const result = reorderedPlayers.map((player, index) => {
          const playerWithPosition = {
            ...player,
            positionIndex: index,
            totalPlayers: reorderedPlayers.length,
            isSelf: player.userId.toString() === currentUserId
          };
          
          return playerWithPosition;
        });
        
        return result;
      } catch (error) {
        console.error('displayPlayers计算属性出错:', error);
        return [];
      }
    },
    currentPlayerId() {
      // 获取当前可操作玩家的ID
      if (!this.game || !this.game.currentPlayerId) return null;
      
      return this.game.currentPlayerId.toString();
    },
    
    bettingPlayers() {
      // 获取有下注的玩家
      if (!this.validDisplayPlayers) return [];
      return this.validDisplayPlayers.filter(player => player.currentBet > 0);
    },
    
    validDisplayPlayers() {
      try {
        const players = this.displayPlayers;
        
        const validPlayers = players.filter(player => player && player.userId);
        
        return validPlayers;
      } catch (error) {
        console.error('validDisplayPlayers计算属性出错:', error);
        return [];
      }
    }
  },
  methods: {
    getStatusText(status) {
      const statusMap = {
        'waiting': '等待开始',
        'betting': '下注阶段',
        'comparing': '比牌阶段',
        'settled': '已结算'
      };
      return statusMap[status] || status;
    },
    getCardTypeText,
    formatCards,
    isActivePlayer(player) {
      if (!this.game || !this.game.currentPlayerId) return false;
      
      return this.game.currentPlayerId.toString() === player.userId.toString();
    },
    shouldShowCards(player) {
      if (!this.game) return false;
      
      if (player.isSelf) {
        return true;
      }
      
      // 只在游戏结算状态时显示其他玩家的牌
      if (this.game.status === 'settled') {
        return true;
      }
      
      return false;
    }
  }
};
</script>

<style scoped>
.game-board {
  position: relative;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 允许flex项目收缩到内容高度以下 */
  overflow: hidden;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0; /* 防止头部在空间不足时被压缩 */
}

.room-info {
  display: flex;
  gap: 20px;
  color: #f0f0f0;
  font-size: 16px;
}

.pot-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f0f0f0;
  font-size: 16px;
}

.pot-label {
  color: #b2b2b2;
}

.pot-amount {
  font-weight: 700;
  color: #ffd700;
}

.game-table {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center; /* 改回center，使桌布居中 */
  justify-content: center;
  min-height: 0; /* 允许flex项目收缩到内容高度以下 */
  padding: 20px; /* 添加一些内边距 */
}

.poker-table {
  position: relative;
  width: 80%;
  height: 60%;
  /* max-width: 800px; */
  max-height: 500px;
  min-height: 300px; /* 设置最小高度 */
  border-radius: 50%;
  background: linear-gradient(135deg, #0d5d0d, #0a4a0a);
  border: 8px solid #8B4513;
  box-shadow: 
    inset 0 0 20px rgba(0, 0, 0, 0.5),
    0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.center-area {
  text-align: center;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-status {
  font-size: 20px;
  color: #6c5ce7;
  margin-bottom: 20px;
}

.betting-chips {
  position: relative;
  margin-bottom: 20px;
}

.pot-amount {
  font-size: 18px;
  color: #ffd700;
  margin-bottom: 15px;
  font-weight: bold;
}

.chips-display {
  position: relative;
  margin: 0 auto;
}

.player-chip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center;
  width: 60px;
  height: 60px;
  margin-top: -30px;
  margin-left: -30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  background: radial-gradient(circle, #f1c40f, #e67e22);
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  margin-bottom: 5px;
}

.chip-icon {
  font-size: 16px;
  margin-bottom: 2px;
}

.chip-amount {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
}

.player-name {
  font-size: 10px;
  color: #fff;
  text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.winner-info {
  background: rgba(0, 184, 148, 0.2);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(0, 184, 148, 0.4);
}

.winner-text {
  font-size: 24px;
  font-weight: 700;
  color: #00b894;
  margin-bottom: 10px;
}

.winner-cards {
  font-size: 18px;
  color: #f0f0f0;
  margin-bottom: 10px;
}

.winnings {
  font-size: 20px;
  font-weight: 700;
  color: #ffd700;
}

.players-seats {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2; /* 提高层级，显示在桌布之上 */
}

.player-seat {
  position: absolute;
  pointer-events: auto;
}
</style>
