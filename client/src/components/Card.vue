<template>
  <div class="card-container">
    <div v-if="isValidCard" class="card" :class="{ 'face-up': isFaceUp, 'face-down': !isFaceUp }">
      <div class="card-face card-front">
        <img :src="cardImageSrc" alt="front" class="card-img" />
      </div>
      <div class="card-face card-back">
        <img :src="backImageSrc" alt="back" class="card-img" />
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

// Pre-load card back
const cardBackUrl = new URL('@/assets/cards/card_back.png', import.meta.url).href;

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
  setup(props) {
    const isValidCard = computed(() => {
      // Basic validation
      return props.suit !== undefined && props.rank !== undefined && props.rank > 0;
    });

    const cardImageSrc = computed(() => {
      // Suit Map (Symbol -> Filename)
      const suitMap = {
        '♠': 'spades',
        '♥': 'hearts',
        '♣': 'clubs',
        '♦': 'diamonds'
      };
      
      const suitName = suitMap[props.suit];
      if (!suitName) return ''; 

      // Rank Map (Number -> Filename)
      let rankName = '';
      if (props.rank === 15) {
        rankName = '2';
      } else if (props.rank === 14) {
        rankName = 'a';
      } else if (props.rank === 11) {
        rankName = 'j';
      } else if (props.rank === 12) {
        rankName = 'q';
      } else if (props.rank === 13) {
        rankName = 'k';
      } else {
        rankName = props.rank.toString();
      }

      // Vite dynamic URL
      return new URL(`../assets/cards/${suitName}_${rankName}.png`, import.meta.url).href;
    });

    const backImageSrc = computed(() => {
      return cardBackUrl;
    });

    return {
      isValidCard,
      cardImageSrc,
      backImageSrc
    };
  }
};
</script>

<style scoped>
.card-container {
  perspective: 1000px;
  width: 120px;
  height: 168px;
}

.card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s;
  /* Use transparent background to avoid white corners if image has transparency */
  background-color: transparent; 
  border-radius: 6px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.card.face-down {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 6px;
}

.card-front {
  transform: rotateY(0deg);
}

.card-back {
  transform: rotateY(180deg);
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: fill; /* Fill the container exactly */
  display: block;
  border-radius: 6px;
}
</style>