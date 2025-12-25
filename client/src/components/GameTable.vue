// client/src/components/GameTable.vue
<template>
  <div class="game-table glass-effect">
    <div class="table-content">
      <!-- 底池信息 -->
      <div class="pot-info">
        <div class="pot-label">底池</div>
        <div class="pot-amount">💰 {{ potAmount }}</div>
      </div>

      <!-- 中央区域 -->
      <div class="center-area">
        <!-- 游戏状态 -->
        <div v-if="gameStatus" class="game-status">
          {{ getStatusText(gameStatus) }}
        </div>

        <!-- 获胜者信息 -->
        <div v-if="winner" class="winner-info">
          <div class="winner-text">🏆 {{ winner.nickname }} 获胜!</div>
          <div class="winner-cards">
            {{ formatCards(winner.cards) }} ({{ winner.cardType }})
          </div>
          <div class="winnings">获得: 💰 {{ winner.winnings }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GameTable',
  props: {
    potAmount: {
      type: Number,
      default: 0
    },
    gameStatus: {
      type: String,
      default: ''
    },
    winner: {
      type: Object,
      default: null
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
    formatCards(cards) {
      if (!cards || cards.length === 0) return '无牌';
      
      return cards.map(card => {
        const rankMap = {
          11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
        };
        const displayRank = rankMap[card.rank] || card.rank;
        return `${card.suit}${displayRank}`;
      }).join(' ');
    }
  }
};
</script>

<style scoped>
.game-table {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  min-height: 300px;
}

.table-content {
  text-align: center;
  padding: 30px;
  width: 100%;
}

.pot-info {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pot-label {
  font-size: 18px;
  color: #b2b2b2;
  margin-bottom: 10px;
}

.pot-amount {
  font-size: 24px;
  font-weight: 700;
  color: #ffd700;
}

.center-area {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.game-status {
  font-size: 20px;
  color: #6c5ce7;
  margin-bottom: 20px;
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
</style>