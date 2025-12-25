// client/src/components/PlayerHand.vue
<template>
  <div class="player-hand">
    <div class="hand-cards">
      <Card
        v-for="(card, index) in cards"
        :key="index"
        :suit="card.suit"
        :rank="card.rank"
        :is-face-up="isFaceUp"
        class="hand-card"
      />
    </div>
    <div v-if="showCardType" class="card-type">
      {{ cardTypeText }}
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';
import { getCardTypeText } from '@/utils/game';

export default {
  name: 'PlayerHand',
  components: {
    Card
  },
  props: {
    cards: {
      type: Array,
      default: () => []
    },
    isFaceUp: {
      type: Boolean,
      default: false
    },
    cardType: {
      type: Number,
      default: 0
    },
    showCardType: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    cardTypeText() {
      return getCardTypeText(this.cardType);
    }
  }
};
</script>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.hand-cards {
  display: flex;
  gap: 5px;
}

.hand-card {
  width: 50px;
  height: 70px;
}

.card-type {
  font-size: 14px;
  font-weight: 600;
  color: #6c5ce7;
  background: rgba(108, 92, 231, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
}
</style>