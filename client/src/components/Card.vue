// client/src/components/Card.vue
<template>
  <div v-if="isValidCard" class="card" :class="{ 'face-up': isFaceUp, 'face-down': !isFaceUp }">
    <div v-if="isFaceUp" class="card-front">
      <div class="card-rank">{{ displayRank }}</div>
      <div class="card-suit">{{ suitSymbol }}</div>
    </div>
    <div v-else class="card-back"></div>
  </div>
</template>

<script>
export default {
  name: 'Card',
  props: {
    suit: {
      type: String,
      default: ''
    },
    rank: {
      type: Number,
      default: 0
    },
    isFaceUp: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    isValidCard() {
      return this.suit !== undefined && this.rank !== undefined && this.rank > 0;
    },
    suitSymbol() {
      const suitMap = {
        '♠': '♠',
        '♥': '♥',
        '♣': '♣',
        '♦': '♦'
      };
      return suitMap[this.suit] || '';
    },
    displayRank() {
      const rankMap = {
        3: '3',
        4: '4',
        5: '5',
        6: '6',
        7: '7',
        8: '8',
        9: '9',
        10: '10',
        11: 'J',
        12: 'Q',
        13: 'K',
        14: 'A',
        15: '2'
      };
      return rankMap[this.rank] || '';
    }
  }
};
</script>

<style scoped>
.card {
  width: 60px;
  height: 80px;
  border-radius: 8px;
  position: relative;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.card.face-up {
  background: white;
  border: 1px solid #ddd;
}

.card.face-down {
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  border: 1px solid #4a3aad;
}

.card-front {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #333;
}

.card-rank {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
}

.card-suit {
  font-size: 24px;
}

.card-back {
  height: 100%;
  background: linear-gradient(135deg, #6c5ce7, #00d2d3);
  border-radius: 8px;
}

.card:hover {
  transform: translateY(-5px);
}
</style>