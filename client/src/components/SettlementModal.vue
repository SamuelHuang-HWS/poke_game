<template>
  <div v-if="visible" class="settlement-modal-overlay" @click.self="handleOverlayClick">
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
        
        <!-- 最终结算 - 显示所有玩家结果 -->
        <div v-else-if="isFinalSettlement" class="final-results">
          <div class="results-title">最终结算</div>
          <div class="players-results">
            <div 
              v-for="(player, index) in playersResults" 
              :key="player.userId"
              class="player-result-item"
              :class="{ 'is-winner': index === 0 }"
            >
              <div class="player-rank">{{ index + 1 }}</div>
              <div class="player-info">
                <div class="player-name">{{ player.nickname }}</div>
                <div class="player-gold-change" :class="player.goldChange >= 0 ? 'positive' : 'negative'">
                  {{ player.goldChange >= 0 ? '+' : '' }}{{ player.goldChange }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          v-if="!isFinalSettlement" 
          @click="handleContinue" 
          class="action-button continue-button"
        >
          继续游戏
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
export default {
  name: 'SettlementModal',
  props: {
    visible: {
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
    }
  },
  computed: {
    title() {
      if (this.isFinalSettlement) {
        return '游戏结束';
      }
      return `第 ${this.currentRound} 局结算`;
    }
  },
  methods: {
    handleOverlayClick() {
      // 点击遮罩层不关闭，强制用户点击按钮
    },
    handleClose() {
      // 关闭按钮不直接关闭，强制用户点击继续或退出
    },
    handleContinue() {
      this.$emit('continue');
    },
    handleExit() {
      this.$emit('exit');
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
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
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
  align-items: center;
  justify-content: center;
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
</style>
