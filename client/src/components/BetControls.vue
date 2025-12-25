// client/src/components/BetControls.vue
<template>
  <div class="bet-controls">
    <div class="bet-info">
      <span class="bet-info-item">
        <span class="bet-label">当前</span>
        <span class="bet-value">💰{{ currentBet }}</span>
      </span>
      <span class="bet-info-item">
        <span class="bet-label">最小</span>
        <span class="bet-value">💰{{ minBet }}</span>
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
        :title="canSeeCards && !isActionLoading && isPlayerTurn ? '查看您的手牌' : (isActionLoading ? '操作处理中...' : !isPlayerTurn ? '等待其他玩家操作' : '还无法看牌')"
      >
        👁️
      </button>
      
      <button
        @click="handleCall"
        class="action-btn call-btn"
        :disabled="!canCall || isActionLoading || !isPlayerTurn"
        :title="canCall && !isActionLoading && isPlayerTurn ? `跟注 ${callAmount}` : (isActionLoading ? '操作处理中...' : !isPlayerTurn ? '等待其他玩家操作' : '无法跟注')"
      >
        <span class="btn-icon">📞</span>
        <span class="btn-text">{{ callAmount }}</span>
      </button>
      
      <button
        @click="handleRaise"
        class="action-btn raise-btn"
        :disabled="!canRaise || isActionLoading || !isPlayerTurn"
        :title="canRaise && !isActionLoading && isPlayerTurn ? '加注' : (isActionLoading ? '操作处理中...' : !isPlayerTurn ? '等待其他玩家操作' : '无法加注')"
      >
        <span class="btn-icon">⬆️</span>
      </button>
      
      <button
        @click="handleFold"
        class="action-btn fold-btn"
        :disabled="!canFold || isActionLoading || !isPlayerTurn"
        :title="canFold && !isActionLoading && isPlayerTurn ? '弃牌' : (isActionLoading ? '操作处理中...' : !isPlayerTurn ? '等待其他玩家操作' : '无法弃牌')"
      >
        <span class="btn-icon">🏳️</span>
      </button>
      
      <button
        @click="handleCompare"
        class="action-btn compare-btn"
        :disabled="!canCompare || isActionLoading || !isPlayerTurn"
        :title="canCompare && !isActionLoading && isPlayerTurn ? '比牌' : (isActionLoading ? '操作处理中...' : !isPlayerTurn ? '等待其他玩家操作' : '无法比牌')"
      >
        <span class="btn-icon">⚔️</span>
      </button>
    </div>
    
    <Teleport to="body">
      <div v-if="showRaiseDialog" class="dialog-overlay" @click="showRaiseDialog = false">
        <div class="dialog" @click.stop>
          <h3>加注</h3>
          <div class="dialog-content">
            <div class="raise-info">
              <span>最小: {{ minRaiseAmount }}</span>
              <span>最大: {{ maxRaiseAmount }}</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import socket from '@/utils/socket';

export default {
  name: 'BetControls',
  props: {
    currentBet: {
      type: Number,
      default: 0
    },
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
      required: true
    },
    userId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const showRaiseDialog = ref(false);
    const showCompareDialog = ref(false);
    const raiseAmount = ref(0);
    const isActionLoading = ref(false);
    
    const callAmount = computed(() => {
      return props.minBet - props.currentBet;
    });
    
    const minRaiseAmount = computed(() => {
      return props.minBet + 50; // 最小加注额度
    });
    
    const maxRaiseAmount = computed(() => {
      return props.playerGold; // 最大可加注金额
    });
    
    // 操作函数 - 直接发送socket请求
    const handleSeeCards = async () => {
      if (!props.gameId || isActionLoading.value) return;
      
      isActionLoading.value = true;
      try {
        socket.emit('see_cards', {
          gameId: props.gameId,
          userId: props.userId
        });
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
      
      // 验证加注金额
      const minRaise = props.minBet + 50;
      const maxRaise = props.playerGold;
      
      if (raiseAmount.value < minRaise || raiseAmount.value > maxRaise) {
        alert(`加注金额必须在 ${minRaise} 到 ${maxRaise} 之间`);
        return;
      }
      
      isActionLoading.value = true;
      try {
        socket.emit('raise', {
          gameId: props.gameId,
          userId: props.userId,
          amount: raiseAmount.value
        });
        
        // 关闭对话框
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
        socket.emit('fold', {
          gameId: props.gameId,
          userId: props.userId
        });
        
        
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
    
    onMounted(() => {
      socket.on('game_state_update', (data) => {
        console.log('BetControls: Received game_state_update', data);
        resetLoadingState();
      });
      socket.on('game_action_result', (data) => {
        console.log('BetControls: Received game_action_result', data);
        resetLoadingState();
      });
      socket.on('error', (error) => {
        console.log('BetControls: Received error', error);
        resetLoadingState();
      });
    });
    
    // 在组件卸载时移除事件监听器
    onUnmounted(() => {
      // 需要传入相同的回调函数来正确移除监听器
      socket.off('game_state_update');
      socket.off('game_action_result');
      socket.off('error');
    });
    
    return {
      showRaiseDialog,
      showCompareDialog,
      raiseAmount,
      isActionLoading,
      callAmount,
      minRaiseAmount,
      maxRaiseAmount,
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
}

.bet-info {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.bet-info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
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
