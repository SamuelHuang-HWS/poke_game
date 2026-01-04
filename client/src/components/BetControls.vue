// client/src/components/BetControls.vue
<template>
  <div class="bet-controls">
    <!-- Hand Cards View with inline hide button -->
    <!-- Hand Cards Expanded View (Fullscreen Overlay) -->
    <Teleport to="body">
      <div 
        v-if="hasSeenCards && cards && cards.length > 0 && modelValue" 
        class="cards-overlay"
        @click="$emit('update:modelValue', false)"
      >
        <div class="cards-centered-container" @click.stop>
          <div v-for="(card, index) in cards" :key="index" class="expanded-card-wrapper">
            <Card 
              :suit="card.suit" 
              :rank="card.rank" 
              :is-face-up="true"
            />
          </div>
        </div>
        <div class="overlay-hint">点击任意区域关闭</div>
      </div>
    </Teleport>
    
    <!-- Main action row: info left, buttons right -->
    <div class="action-row">
      <div class="bet-info">
        <span class="bet-info-item">
          <span class="bet-label">最小</span>
          <span class="bet-value">💰{{ minRaiseAmount }}</span>
        </span>
        <span class="bet-info-item">
          <span class="bet-label">金币</span>
          <span class="bet-value">💰{{ playerGold }}</span>
        </span>
      </div>
      
      <div class="bet-actions">
        <button
          @click="handleSeeCards"
          class="action-btn see-btn"
          :disabled="!canSeeCards || isActionLoading || !isPlayerTurn"
          title="查看手牌"
        >👁️</button>
        
        <button
          @click="handleCall"
          class="action-btn call-btn"
          :disabled="!canCall || isActionLoading || !isPlayerTurn"
          title="跟注"
        >
          <span class="btn-icon">📞</span>
          <span class="btn-text">{{ minRaiseAmount }}</span>
        </button>
        
        <button
          @click="handleRaise"
          class="action-btn raise-btn"
          :disabled="!canRaise || isActionLoading || !isPlayerTurn"
          title="加注"
        ><span class="btn-icon">⬆️</span></button>
        
        <button
          @click="handleFold"
          class="action-btn fold-btn"
          :disabled="!canFold || isActionLoading || !isPlayerTurn"
          title="弃牌"
        ><span class="btn-icon">🏳️</span></button>
        
        <button
          @click="handleCompare"
          class="action-btn compare-btn"
          :disabled="!canCompare || isActionLoading || !isPlayerTurn || !canCompareByRound"
          title="比牌"
        ><span class="btn-icon">⚔️</span></button>
      </div>
    </div>
    


    <Teleport to="body">
      <div v-if="showRaiseDialog" class="dialog-overlay" @click="showRaiseDialog = false">
        <div class="dialog" @click.stop>
          <h3>加注</h3>
          <div class="dialog-content">
            <div class="raise-info">
              <span>最小: {{ minRaiseAmount + 1 }}</span>
              <span>最大: {{ maxRaiseAmount }}</span>
            </div>
            <div v-if="hasSeenCards" class="raise-notice">
              看牌后加注金额将翻倍
            </div>
            <input
              v-model.number="raiseAmount"
              type="number"
              placeholder="输入加注金额"
              class="dialog-input"
              :min="minRaiseAmount"
              :max="maxRaiseAmount"
            />
          </div>
          <div class="dialog-actions">
            <button @click="showRaiseDialog = false" class="cancel-btn">取消</button>
            <button @click="confirmRaise" class="confirm-btn">确定</button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div v-if="showCompareDialog" class="dialog-overlay" @click="showCompareDialog = false">
        <div class="dialog" @click.stop>
          <h3>选择比牌对手</h3>
          <div class="dialog-content">
            <div
              v-for="player in activePlayers"
              :key="player.userId"
              @click="selectCompareTarget(player.userId)"
              class="player-option"
              :class="{ 'disabled': player.isSelf }"
            >
              {{ player.nickname }}
            </div>
          </div>
          <div class="dialog-actions">
            <button @click="showCompareDialog = false" class="cancel-btn">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import socket from '@/utils/socket';
import Card from '@/components/Card.vue';
import { useToast } from '@/composables/useToast';

export default {
  name: 'BetControls',
  components: { Card },
  props: {
    minBet: {
      type: Number,
      default: 0
    },
    playerGold: {
      type: Number,
      default: 0
    },
    activePlayers: {
      type: Array,
      default: () => []
    },
    hasSeenCards: {
      type: Boolean,
      default: false
    },
    canSeeCards: {
      type: Boolean,
      default: false
    },
    canCall: {
      type: Boolean,
      default: false
    },
    canRaise: {
      type: Boolean,
      default: false
    },
    canFold: {
      type: Boolean,
      default: false
    },
    canCompare: {
      type: Boolean,
      default: false
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    isCurrentPlayer: {
      type: Boolean,
      default: false
    },
    isPlayerTurn: {
      type: Boolean,
      default: false
    },
    gameId: {
      type: String,
      default: ''
    },
    userId: {
      type: String,
      required: true
    },
    bettingRound: {
      type: Number,
      default: 1
    },
    cards: {
      type: Array,
      default: () => []
    },
    modelValue: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue'],
  setup(props) {
    const showRaiseDialog = ref(false);
    const showCompareDialog = ref(false);
    const raiseAmount = ref(0);
    const isActionLoading = ref(false);
    const toast = useToast();
    


    // const callAmount = computed(() => {
    //   if (props.hasSeenCards) {
    //     return props.minBet * 2 - props.currentBet;
    //   }
    //   console.log(props.minBet, props.currentBet);
    //   return props.minBet - props.currentBet;
    // });
    
    const minRaiseAmount = computed(() => {
      const multiplier = props.hasSeenCards ? 2 : 1;
      console.log(props.minBet, multiplier);
      return props.minBet * multiplier;
    });
    
    const maxRaiseAmount = computed(() => {
      const multiplier = props.hasSeenCards ? 2 : 1;
      const maxByRule = props.minBet * multiplier * 5;
      const maxByGold = props.hasSeenCards ? Math.floor(props.playerGold / 2) : props.playerGold;
      return Math.max(maxByRule, maxByGold);
    });
    
    const canCompareByRound = computed(() => {
      return props.bettingRound > 3;
    });
    

    
    // 操作函数 - 直接发送socket请求
    const handleSeeCards = async () => {
      if (!props.gameId || isActionLoading.value) return;
      
      isActionLoading.value = true;
      try {
        const data = {
          gameId: props.gameId,
          userId: props.userId
        };
        console.log('BetControls: Emit see_cards', data);
        socket.emit('see_cards', data);
      } catch (error) {
        console.error('看牌失败:', error);
      }
    };
    
    const handleCall = async () => {
      if (!props.gameId || isActionLoading.value) return;
      
      isActionLoading.value = true;
      try {
        socket.emit('call', {
          gameId: props.gameId,
          userId: props.userId
        });
        
        
      } catch (error) {
        console.error('跟注失败:', error);
        isActionLoading.value = false;
      }
    };
    
    const handleRaise = () => {
      console.log(props.gameId, isActionLoading.value);
      if (!props.gameId || isActionLoading.value) return;
      showRaiseDialog.value = true;
    };
    
    const confirmRaise = async () => {
      if (!props.gameId || isActionLoading.value) return;
      
      const multiplier = props.hasSeenCards ? 2 : 1;
      const minRaise = props.minBet * multiplier;
      const maxByRule = props.minBet * multiplier * 5;
      const maxByGold = props.hasSeenCards ? Math.floor(props.playerGold / 2) : props.playerGold;
      const maxRaise = Math.max(maxByRule, maxByGold);
      
      if (raiseAmount.value < minRaise || raiseAmount.value > maxRaise) {
        toast.error(`加注金额必须在 ${minRaise} 到 ${maxRaise} 之间`);
        return;
      }
      
      isActionLoading.value = true;
      try {
        socket.emit('raise', {
          gameId: props.gameId,
          userId: props.userId,
          amount: raiseAmount.value
        });
        
        showRaiseDialog.value = false;

      } catch (error) {
        console.error('加注失败:', error);
        isActionLoading.value = false;
      }
    };
    
    const handleFold = async () => {
      if (!props.gameId || isActionLoading.value) return;
      
      isActionLoading.value = true;
      try {
        const data = {
          gameId: props.gameId,
          userId: props.userId
        };
        console.log('BetControls: Emit fold', data);
        socket.emit('fold', data);
        
        
      } catch (error) {
        console.error('弃牌失败:', error);
        isActionLoading.value = false;
      }
    };
    
    const handleCompare = () => {
      if (!props.gameId || isActionLoading.value) return;
      showCompareDialog.value = true;
    };
    
    const selectCompareTarget = async (targetUserId) => {
      if (!props.gameId || isActionLoading.value) return;
      
      isActionLoading.value = true;
      try {
        socket.emit('compare', {
          gameId: props.gameId,
          userId: props.userId,
          targetUserId: targetUserId
        });
        
        showCompareDialog.value = false;
        
        
      } catch (error) {
        console.error('比牌失败:', error);
        isActionLoading.value = false;
      }
    };
    
    // 监听游戏状态更新事件，重置加载状态
    const resetLoadingState = () => {
      isActionLoading.value = false;
      console.log('BetControls: Loading state reset');
    };
    
    // 保存监听器引用，以便正确移除
    const handleGameStateUpdate = (data) => {
      console.log('BetControls: Received game_state_update', data);
      resetLoadingState();
    };
    
    const handleGameActionResult = (data) => {
      console.log('BetControls: Received game_action_result', data);
      resetLoadingState();
    };
    
    const handleError = (error) => {
      console.log('BetControls: Received error', error);
      resetLoadingState();
    };
    
    onMounted(() => {
      socket.on('game_state_update', handleGameStateUpdate);
      socket.on('game_action_result', handleGameActionResult);
      socket.on('error', handleError);
    });
    
    // 在组件卸载时移除事件监听器 - 只移除BetControls自己的监听器
    onUnmounted(() => {
      socket.off('game_state_update', handleGameStateUpdate);
      socket.off('game_action_result', handleGameActionResult);
      socket.off('error', handleError);
    });
    
    return {
      showRaiseDialog,
      showCompareDialog,
      raiseAmount,
      isActionLoading,
      // callAmount,
      minRaiseAmount,
      maxRaiseAmount,
      canCompareByRound,
      handleSeeCards,
      handleCall,
      handleRaise,
      confirmRaise,
      handleFold,
      handleCompare,
      selectCompareTarget
    };
  }
};
</script>

<style scoped>
.bet-controls {
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(30, 30, 50, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  position: relative; /* For absolute pos of cards if needed, current flow is flex vertical */
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Fullscreen Cards Overlay */
.cards-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.cards-centered-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 20px;
}

.expanded-card-wrapper {
  /* Scale up for "Big" effect. User requested 2x. 
     Base size is 120px*168px. 2x is HUGE (240px wide). 
     Previous scale was 0.85. 2x of that is 1.7. 
     Let's use 1.7 to be consistent with "double the current 0.85 size" */
  transform: scale(1.7);
  margin: 30px 40px; /* Increased horizontal margin to 40px to prevent overlap */
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.expanded-card-wrapper:hover {
  transform: scale(1.8) translateY(-10px);
  z-index: 10;
}

.overlay-hint {
  color: rgba(255, 255, 255, 0.6);
  margin-top: 80px;
  font-size: 14px;
  pointer-events: none;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.my-card-wrapper:hover {
  transform: scale(0.9);
}

/* Main action row: info left, buttons right */
.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.bet-info {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.bet-info-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.bet-label {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
}

.bet-value {
  font-weight: 600;
  color: #ffd700;
}

.bet-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-right: 80px;  /* 80px right margin as requested */
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 44px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.see-btn:not(:disabled) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.call-btn:not(:disabled) {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.raise-btn:not(:disabled) {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.fold-btn:not(:disabled) {
  background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
}

.compare-btn:not(:disabled) {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-size: 12px;
  font-weight: 600;
}

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
  min-width: 280px;
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
  font-size: 18px;
  color: #fff;
  margin-bottom: 16px;
  text-align: center;
  font-weight: 600;
}

.dialog-content {
  margin-bottom: 16px;
}

.raise-info {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.raise-notice {
  padding: 8px 12px;
  background: rgba(245, 87, 108, 0.15);
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #f5576c;
  text-align: center;
  font-weight: 500;
}

.dialog-input {
  width: 100%;
  padding: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 14px;
  transition: all 0.2s ease;
}

.dialog-input:focus {
  outline: none;
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.player-option {
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  border: 1px solid transparent;
}

.player-option:hover:not(.disabled) {
  background: rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.3);
  transform: translateX(4px);
}

.player-option.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.cancel-btn,
.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.confirm-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

@media (max-width: 768px) {
  .bet-controls {
    padding: 6px 10px;
  }
  
  .bet-info {
    gap: 12px;
  }
  
  .bet-info-item {
    font-size: 11px;
  }
  
  .action-btn {
    padding: 6px 10px;
    min-width: 40px;
    height: 36px;
    font-size: 13px;
  }
  
  .btn-icon {
    font-size: 14px;
  }
  
  .btn-text {
    font-size: 11px;
  }
}
</style>
