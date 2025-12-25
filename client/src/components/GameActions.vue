// client/src/components/GameActions.vue
<template>
  <div class="game-actions">
    <button
      v-if="canSeeCards"
      @click="$emit('see-cards')"
      class="action-button see-button"
    >
      看牌
    </button>
    
    <button
      v-if="canCall"
      @click="$emit('call')"
      class="action-button call-button"
    >
      跟注
    </button>
    
    <button
      v-if="canRaise"
      @click="$emit('raise')"
      class="action-button raise-button"
    >
      加注
    </button>
    
    <button
      v-if="canFold"
      @click="$emit('fold')"
      class="action-button fold-button"
    >
      弃牌
    </button>
    
    <button
      v-if="canCompare"
      @click="$emit('compare')"
      class="action-button compare-button"
    >
      比牌
    </button>
  </div>
</template>

<script>
export default {
  name: 'GameActions',
  props: {
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
    }
  },
  emits: ['see-cards', 'call', 'raise', 'fold', 'compare']
};
</script>

<style scoped>
.game-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 20px;
}

.action-button {
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 80px;
}

.see-button {
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  color: white;
}

.call-button {
  background: linear-gradient(135deg, #00d2d3, #81ecec);
  color: white;
}

.raise-button {
  background: linear-gradient(135deg, #fdcb6e, #ffeaa7);
  color: #2d3436;
}

.fold-button {
  background: linear-gradient(135deg, #ff7675, #fab1a0);
  color: white;
}

.compare-button {
  background: linear-gradient(135deg, #00b894, #81eacb);
  color: white;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .game-actions {
    gap: 10px;
  }
  
  .action-button {
    padding: 10px 15px;
    font-size: 14px;
    min-width: 70px;
  }
}
</style>