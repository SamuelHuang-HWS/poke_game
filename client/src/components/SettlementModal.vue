<template>
  <div v-if="modelValue" class="settlement-modal-overlay" @click.self="handleOverlayClick">
    <div class="settlement-modal glass-effect">
      <div class="modal-header">
        <h2 class="modal-title">{{ title }}</h2>
        <button @click="handleClose" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- 单局结算 - 只显示获胜者信息 -->
        <div v-if="!isFinalSettlement && winner" class="winner-section">
          <div class="winner-icon">🏆</div>
          <div class="winner-name">{{ winner.nickname }}</div>
          <div class="winner-label">本局获胜</div>
          <div class="winner-reward">
            <span class="reward-label">获得收益</span>
            <span class="reward-amount">💰 {{ winner.winnings || 0 }}</span>
          </div>
        </div>
        
        <!-- 本局玩家牌面列表 -->
        <div v-if="!isFinalSettlement && roundPlayers && roundPlayers.length > 0" class="round-players-section">
          <div class="round-players-title">本局玩家</div>
          <div class="round-players-list">
            <div 
              v-for="player in roundPlayers" 
              :key="player.userId"
              class="round-player-item"
              :class="{ 'is-winner': player.result === 'winner' }"
            >
              <div class="player-name">{{ player.nickname }}</div>
              <div class="player-cards">
                <span v-for="(card, idx) in player.cards" :key="idx" class="card-item" :class="getCardColorClass(card)">
                  {{ card.suit }}{{ formatCardRank(card.rank) }}
                </span>
              </div>
              <div class="player-card-type">{{ player.cardType }}</div>
            </div>
          </div>
        </div>
        
        <!-- 最终结算 - 显示所有玩家结果 -->
        <div v-else-if="isFinalSettlement" class="final-results">
          <div class="results-title">最终结算</div>
          <div class="players-results">
            <div 
              v-for="(player, index) in sortedPlayersResults" 
              :key="player.userId"
              class="player-result-item"
              :class="{ 'is-winner': index === 0 }"
            >
              <div class="player-rank">{{ index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.nickname }}</div>
                <div class="player-final-gold">💰 {{ player.roomGold }}</div>
                <div class="player-gold-change" :class="player.goldChange >= 0 ? 'positive' : 'negative'">
                  {{ player.goldChange >= 0 ? '+' : '' }}{{ player.goldChange }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <div v-if="timeLeft > 0 && !isFinalSettlement" class="auto-start-timer">
          {{ timeLeft }}秒后自动开始下一局
        </div>
        <div v-if="!isFinalSettlement && confirmations" class="confirmations-info">
          <div class="confirmations-progress">
            <span class="confirmations-text">等待玩家确认: {{ confirmedCount }}/{{ totalCount }}</span>
          </div>
          <div class="confirmations-list">
            <div 
              v-for="(confirmed, userId) in confirmations" 
              :key="userId"
              class="confirmation-item"
              :class="{ confirmed: confirmed }"
            >
              <span class="confirmation-status">{{ confirmed ? '✓' : '○' }}</span>
              <span class="confirmation-name">{{ getPlayerName(userId) }}</span>
            </div>
          </div>
        </div>
        <button 
          v-if="!isFinalSettlement" 
          @click="handleContinue" 
          class="action-button continue-button"
          :disabled="hasConfirmed"
        >
          {{ hasConfirmed ? '已确认' : '继续游戏' }}
        </button>
        <button 
          v-else 
          @click="handleExit" 
          class="action-button exit-button"
        >
          退出房间
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'SettlementModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    winner: {
      type: Object,
      default: null
    },
    playersResults: {
      type: Array,
      default: () => []
    },
    isFinalSettlement: {
      type: Boolean,
      default: false
    },
    currentRound: {
      type: Number,
      default: 0
    },
    totalRounds: {
      type: Number,
      default: 0
    },
    confirmations: {
      type: Object,
      default: null
    },
    players: {
      type: Array,
      default: () => []
    },
    roundPlayers: {
      type: Array,
      default: () => []
    },
    settlementDeadline: {
      type: [String, Date],
      default: null
    }
  },
  emits: ['update:modelValue', 'continue', 'exit'],
  setup(props) {
    const authStore = useAuthStore();
    
    // ... existing setup ...
    const confirmedCount = computed(() => {
      if (!props.confirmations) return 0;
      return Object.values(props.confirmations).filter(Boolean).length;
    });
    
    const totalCount = computed(() => {
      if (!props.confirmations) return 0;
      return Object.keys(props.confirmations).length;
    });
    
    const hasConfirmed = computed(() => {
      if (!props.confirmations || !authStore.user) return false;
      const userId = authStore.user.id?.toString ? authStore.user.id.toString() : authStore.user.id;
      return props.confirmations[userId] === true;
    });
    
    return {
      confirmedCount,
      totalCount,
      hasConfirmed
    };
  },
  data() {
    return {
      timerInterval: null,
      timeLeft: 0
    };
  },
  mounted() {
    this.checkTimer();
  },
  beforeUnmount() {
    this.clearTimer();
  },
  watch: {
    settlementDeadline: {
      handler() {
        this.checkTimer();
      },
      immediate: true
    }
  },
  methods: {
    checkTimer() {
      this.clearTimer();
      if (this.settlementDeadline && new Date(this.settlementDeadline) > new Date()) {
        this.startTimer();
      } else {
        this.timeLeft = 0;
      }
    },
    startTimer() {
      if (!this.settlementDeadline) return;
      
      const deadline = new Date(this.settlementDeadline).getTime();
      const update = () => {
        const now = Date.now();
        const diff = Math.ceil((deadline - now) / 1000);
        this.timeLeft = diff > 0 ? diff : 0;
        
        if (this.timeLeft <= 0) {
          this.clearTimer();
        }
      };
      
      update();
      this.timerInterval = setInterval(update, 1000);
    },
    clearTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },
    handleOverlayClick() {
    },
    handleClose() {
    },
    handleContinue() {
      this.$emit('continue');
    },
    handleExit() {
      this.$emit('exit');
    },
    getPlayerName(userId) {
      const player = this.players.find(p => p.userId === userId);
      return player ? player.nickname : userId;
    },
    formatCardRank(rank) {
      const rankMap = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
      return rankMap[rank] || rank;
    },
    getCardColorClass(card) {
      return (card.suit === '♥' || card.suit === '♦') ? 'red-card' : 'black-card';
    }
  }
};
</script>

<style scoped>
.settlement-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.settlement-modal {
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
  display: flex;
  flex-direction: column;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.close-button {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 24px;
  border-radius: 50%;
  cursor: not-allowed;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}

.modal-body {
  padding: 30px 25px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  flex: 1;
}

.winner-section {
  text-align: center;
  animation: winnerAppear 0.5s ease-out;
}

@keyframes winnerAppear {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.winner-icon {
  font-size: 64px;
  margin-bottom: 15px;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.winner-name {
  font-size: 28px;
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 8px;
}

.winner-label {
  font-size: 16px;
  color: #b2b2b2;
  margin-bottom: 20px;
}

.winner-reward {
  background: rgba(0, 184, 148, 0.2);
  padding: 15px 25px;
  border-radius: 12px;
  border: 1px solid rgba(0, 184, 148, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reward-label {
  font-size: 14px;
  color: #00b894;
}

.reward-amount {
  font-size: 24px;
  font-weight: 700;
  color: #ffd700;
}

.final-results {
  width: 100%;
}

.results-title {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20px;
}

.players-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.player-result-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.player-result-item.is-winner {
  background: rgba(255, 215, 0, 0.15);
  border-color: rgba(255, 215, 0, 0.3);
}

.player-rank {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.player-result-item.is-winner .player-rank {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #000;
}

.player-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.player-gold-change {
  font-size: 18px;
  font-weight: 700;
}

.player-gold-change.positive {
  color: #00b894;
}

.player-gold-change.negative {
  color: #e74c3c;
}

.modal-footer {
  padding: 20px 25px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.confirmations-info {
  margin-bottom: 15px;
}

.confirmations-progress {
  text-align: center;
  margin-bottom: 12px;
}

.confirmations-text {
  font-size: 14px;
  color: #b2b2b2;
}

.confirmations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.confirmation-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.confirmation-item.confirmed {
  background: rgba(0, 184, 148, 0.15);
  border-color: rgba(0, 184, 148, 0.3);
}

.confirmation-status {
  font-size: 16px;
  font-weight: 700;
}

.confirmation-item.confirmed .confirmation-status {
  color: #00b894;
}

.confirmation-name {
  font-size: 13px;
  color: #fff;
}

.action-button {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.continue-button {
  background: linear-gradient(135deg, #00b894, #00a884);
  color: #fff;
}

.continue-button:hover {
  background: linear-gradient(135deg, #00a884, #009678);
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0, 184, 148, 0.4);
}

.exit-button {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: #fff;
}

.exit-button:hover {
  background: linear-gradient(135deg, #c0392b, #a93226);
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(231, 76, 60, 0.4);
}

/* 新增样式 */
.round-players-section {
  width: 100%;
  margin-top: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 15px;
}

.round-players-title {
  color: #a0a0a0;
  font-size: 14px;
  margin-bottom: 10px;
  text-align: left;
}

.round-players-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.round-player-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.round-player-item.is-winner {
  background: rgba(0, 184, 148, 0.15);
  border: 1px solid rgba(0, 184, 148, 0.3);
}

.player-cards {
  display: flex;
  gap: 4px;
}

.card-item {
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  min-width: 24px;
  text-align: center;
}

.card-item.red-card {
  color: #ff4757;
}

.card-item.black-card {
  color: #2f3542;
}

.player-card-type {
  font-size: 12px;
  color: #ffd700;
  width: 60px;
  text-align: right;
}

.player-final-gold {
  color: #ffd700;
  font-weight: bold;
  margin-right: 15px;
}

/* 即使在非最终结算页面，也需要调整 modal-body 布局 */
.modal-body {
  flex: 1;
  overflow-y: auto;
}

.auto-start-timer {
  width: 100%;
  text-align: center;
  color: #a0a0a0;
  font-size: 13px;
  margin-bottom: 10px;
}
</style>
