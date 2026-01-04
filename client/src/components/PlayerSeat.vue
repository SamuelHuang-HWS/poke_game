// client/src/components/PlayerSeat.vue
<template>
  <div 
    class="player-seat-container" 
    :style="seatStyle"
    :key="player.userId"
    v-if="player"
  >
    <!-- 玩家信息区域（带边框） -->
    <div 
      class="player-seat" 
      :class="{ 'self': isSelf, 'active': isActive }"
    >
      <div class="player-info">
        <div class="player-left">
          <div class="player-avatar">
            <div class="avatar-placeholder">👤</div>
            <div v-if="player.hasSeenCards" class="seen-indicator" title="已看牌">👀</div>
          </div>
        </div>
        <div class="player-right">
          <!-- <div class="player-gold">💰 {{ player.roomGold || 0 }}</div> -->
          <div class="player-name">
            {{ player.nickname || '未知玩家' }}
            <span v-if="timeLeft > 0 && isActive" class="turn-timer">({{ timeLeft }}s)</span>
          </div>
          <div class="player-status" :class="player.status || 'waiting'">
            {{ getStatusText(player.status) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 玩家牌区域（不带边框） -->
    <div 
      v-if="player.cards && player.cards.length > 0" 
      class="player-cards"
      :class="{ 'clickable': isSelf && shouldShowCardFace }"
      @click.stop="handleCardClick"
    >
      <Card
        v-for="(card, index) in validCards"
        :key="`card-${index}-${card.suit}-${card.rank}`"
        :suit="card.suit || ''"
        :rank="card.rank || 0"
        :is-face-up="shouldShowCardFace"
        class="player-card"
      />
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';

export default {
  name: 'PlayerSeat',
  components: {
    Card
  },
  props: {
    player: {
      type: Object,
      required: true
    },
    isSelf: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: false
    },
    showCards: {
      type: Boolean,
      default: false
    },
    positionIndex: {
      type: Number,
      default: 0
    },
    totalPlayers: {
      type: Number,
      default: 2
    },
    currentPlayerId: {
      type: String,
      default: null
    },
    turnDeadline: {
      type: [String, Date],
      default: null
    }
  },
  computed: {
    validCards() {
      if (!this.player || !this.player.cards) return [];
      return this.player.cards.filter(card => card && card.suit && card.rank);
    },
    seatStyle() {
      if (!this.player) return {};
      
      // 计算所有玩家（包括当前玩家）在椭圆上的位置
      const total = this.totalPlayers || 2;
      const index = this.positionIndex || 0;
      
      // 计算玩家围绕椭圆桌的位置
      const centerX = 50;
      const centerY = 50;
      const radiusX = 35; // 水平半径 - 减小以避免超出边界
      const radiusY = 25; // 垂直半径 - 减小以避免超出边界
      
      let angle;
      if (total === 2) {
        // 两个玩家时，一个在底部，一个在顶部
        angle = index === 0 ? -Math.PI / 2 : Math.PI / 2; // 底部和顶部
      } else {
        // 多个玩家时，均匀分布在椭圆周围，从底部开始顺时针分布
        const anglePerPlayer = (2 * Math.PI) / total; // 每个玩家占据的角度
        angle = index * anglePerPlayer - Math.PI / 2; // 从底部开始（-π/2），顺时针分布
      }
      
      // 注意：CSS的top值与数学坐标系的y轴方向相反
      // 所以我们用centerY减去sin值，而不是加上
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY - radiusY * Math.sin(angle);
      
      return {
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)'
      };
    },
    shouldShowCardFace() {
      if (!this.player || !this.player.cards) return false;
      
      if (this.isSelf) {
        return this.player.hasSeenCards || false;
      }
      
      // 只有在游戏结算状态时，才显示其他玩家的牌
      if (this.$parent && this.$parent.game && this.$parent.game.status === 'settled') {
        return true;
      }
      
      return false;
    }
  },
  // watch: {
  //   positionIndex: {
  //     handler(newVal, oldVal) {
  //       console.log('positionIndex changed:', { newVal, oldVal, userId: this.player?.userId });
  //     },
  //     immediate: true
  //   },
  //   totalPlayers: {
  //     handler(newVal, oldVal) {
  //       console.log('totalPlayers changed:', { newVal, oldVal, userId: this.player?.userId });
  //     },
  //     immediate: true
  //   }
  // },
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
    isActive: {
      handler() {
        this.checkTimer();
      },
      immediate: true
    },
    turnDeadline: {
      handler() {
        this.checkTimer();
      },
      immediate: true
    }
  },
  methods: {
    checkTimer() {
      this.clearTimer();
      if (this.isActive && this.turnDeadline && new Date(this.turnDeadline) > new Date()) {
        this.startTimer();
      } else {
        this.timeLeft = 0;
      }
    },
    startTimer() {
      if (!this.turnDeadline) return;
      
      const deadline = new Date(this.turnDeadline).getTime();
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
    getStatusText(status) {
      // 如果玩家状态是playing，且是当前可操作玩家，则显示"下注中"
      if (status === 'playing' && this.currentPlayerId && 
          this.player.userId && this.player.userId.toString() === this.currentPlayerId.toString()) {
        return '下注中';
      }
      
      // 如果玩家状态是playing，但不是当前可操作玩家，则显示"待下注"
      if (status === 'playing') {
        return '待下注';
      }
      
      const statusMap = {
        'waiting': '等待',
        'ready': '准备',
        'folded': '已弃牌',
        'busted': '已出局'
      };
      return statusMap[status] || status;
    },
    handleCardClick() {
      console.log('PlayerSeat: Card clicked', { 
        isSelf: this.isSelf, 
        shouldShowCardFace: this.shouldShowCardFace,
        hasSeenCards: this.player?.hasSeenCards 
      });
      // 只有自己且已看牌（显示牌面）时，点击才触发
      if (this.isSelf && this.shouldShowCardFace) {
        console.log('PlayerSeat: Emitting card-click');
        this.$emit('card-click');
      }
    }
  }
};
</script>

<style scoped>
.player-seat-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row;
}

.player-seat {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  justify-content: space-between;
}

.player-seat.self {
  background: rgba(108, 92, 231, 0.2);
  border-color: #6c5ce7;
}

.player-seat.active {
  box-shadow: 0 0 0 3px #00d2d3, 0 0 20px rgba(0, 210, 211, 0.5);
  transform: scale(1.05);
  z-index: 10;
}

.player-seat.active::before {
  content: '🎯';
  position: absolute;
  top: -10px;
  right: -10px;
  font-size: 20px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.player-info {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  justify-content: space-between;
}

.player-left {
  display: flex;
  align-items: center;
  gap: 5px;
}

.player-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.player-avatar {
  margin-bottom: 0;
}

.avatar-placeholder {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #b2b2b2;
}

.player-name {
  font-size: 12px;
  font-weight: 600;
  color: #f0f0f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.player-gold {
  font-size: 10px;
  color: #ffd700;
}

.player-status {
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 6px;
  display: inline-block;
}

.player-status.playing {
  background: rgba(0, 210, 211, 0.2);
  color: #00d2d3;
}

.player-status.folded {
  background: rgba(255, 255, 255, 0.2);
  color: #b2b2b2;
}

.player-status.lost {
  background: rgba(255, 118, 117, 0.2);
  color: #ff7675;
}

.player-status.winner {
  background: rgba(0, 184, 148, 0.2);
  color: #00b894;
}

.player-cards {
  display: flex;
  gap: 3px;
  align-self: center;
  transition: transform 0.2s;
}

.player-cards.clickable {
  cursor: pointer;
}

.player-cards.clickable:hover {
  transform: scale(1.05);
}

.player-card {
  width: 30px;
  height: 45px;
}

.seen-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  z-index: 5;
}

.turn-timer {
  color: #ff9f43;
  font-weight: bold;
  margin-left: 5px;
  animation: pulse-red 1s infinite;
}

@keyframes pulse-red {
  0% { color: #ff9f43; }
  50% { color: #ff6b6b; }
  100% { color: #ff9f43; }
}
</style>
