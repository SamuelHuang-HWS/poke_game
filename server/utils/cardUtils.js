// server/utils/cardUtils.js
/**
 * 炸金花牌型工具类
 */

// 花色（0-3：黑桃、红桃、梅花、方块）
const SUITS = ['♠', '♥', '♣', '♦'];
// 点数 (2-14, 其中14代表A, 11=J, 12=Q, 13=K)
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
// 牌型常量
const CARD_TYPES = {
  SINGLE: 1,      // 单张
  PAIR: 2,        // 对子
  STRAIGHT: 3,    // 顺子
  FLUSH: 4,       // 同花
  FULL_HOUSE: 5,  // 同花顺
  THREE: 6        // 豹子
};

/**
 * 创建一副牌
 * @returns {Array} 52张牌的数组
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * 洗牌
 * @param {Array} deck 牌组
 * @returns {Array} 洗好的牌组
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 发牌
 * @param {Array} deck 牌组
 * @param {number} count 发牌数量
 * @returns {Array} 发出的牌
 */
function dealCards(deck, count) {
  return deck.splice(0, count);
}

/**
 * 比较两张牌的大小
 * @param {Object} card1 牌1
 * @param {Object} card2 牌2
 * @returns {number} 1: card1大, -1: card2大, 0: 相等
 */
function compareCards(card1, card2) {
  if (card1.rank !== card2.rank) {
    return card1.rank > card2.rank ? 1 : -1;
  }
  const suitOrder = { '♠': 4, '♥': 3, '♣': 2, '♦': 1 };
  return suitOrder[card1.suit] > suitOrder[card2.suit] ? 1 : 
         suitOrder[card1.suit] < suitOrder[card2.suit] ? -1 : 0;
}

/**
 * 排序手牌
 * @param {Array} cards 手牌
 * @returns {Array} 排序后的手牌
 */
function sortCards(cards) {
  return [...cards].sort((a, b) => {
    // 特殊排序规则：豹子 > 同花顺 > 同花 > 顺子 > 对子 > 单张
    // 同类型牌按点数排序，点数相同按花色排序
    return compareCards(b, a); // 降序排列
  });
}

/**
 * 判断牌型
 * @param {Array} cards 三张牌
 * @returns {Object} 牌型信息
 */
function getCardType(cards) {
  if (!cards || cards.length !== 3) {
    throw new Error('必须是三张牌');
  }

  const sortedCards = sortCards(cards);
  const ranks = sortedCards.map(c => c.rank);
  
  const isThree = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isFlush = sortedCards[0].suit === sortedCards[1].suit && 
                  sortedCards[1].suit === sortedCards[2].suit;
  
  let isStraight = false;
  if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) {
    isStraight = true;
  } else {
    isStraight = ranks[0] === ranks[1] + 1 && ranks[1] === ranks[2] + 1;
  }
  
  if (isThree) {
    return {
      type: CARD_TYPES.THREE,
      typeName: '豹子',
      value: 6000 + ranks[0]
    };
  }
  
  if (isFlush && isStraight) {
    const maxValue = (ranks[0] === 14 && ranks[1] === 3) ? 3 : ranks[0];
    return {
      type: CARD_TYPES.FULL_HOUSE,
      typeName: '同花顺',
      value: 5000 + maxValue
    };
  }
  
  if (isFlush) {
    return {
      type: CARD_TYPES.FLUSH,
      typeName: '同花',
      value: 4000 + ranks[0] * 100 + ranks[1] * 10 + ranks[2]
    };
  }
  
  if (isStraight) {
    const maxValue = (ranks[0] === 14 && ranks[1] === 3) ? 3 : ranks[0];
    return {
      type: CARD_TYPES.STRAIGHT,
      typeName: '顺子',
      value: 3000 + maxValue
    };
  }
  
  if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) {
    const pairRank = ranks[0] === ranks[1] ? ranks[0] : ranks[1];
    const singleRank = ranks[0] === ranks[1] ? ranks[2] : ranks[0];
    return {
      type: CARD_TYPES.PAIR,
      typeName: '对子',
      value: 2000 + pairRank * 100 + singleRank
    };
  }
  
  return {
    type: CARD_TYPES.SINGLE,
    typeName: '单张',
    value: ranks[0] * 100 + ranks[1] * 10 + ranks[2]
  };
}

/**
 * 比较两副手牌的大小
 * @param {Array} cards1 手牌1
 * @param {Array} cards2 手牌2
 * @returns {number} 1: cards1赢, -1: cards2赢, 0: 平局
 */
function compareHands(cards1, cards2) {
  const type1 = getCardType(cards1);
  const type2 = getCardType(cards2);
  
  if (type1.value !== type2.value) {
    return type1.value > type2.value ? 1 : -1;
  }
  
  const sorted1 = sortCards(cards1);
  const sorted2 = sortCards(cards2);
  
  for (let i = 0; i < 3; i++) {
    const result = compareCards(sorted1[i], sorted2[i]);
    if (result !== 0) {
      return result;
    }
  }
  
  return 0;
}

/**
 * 格式化牌面显示
 * @param {Array} cards 手牌
 * @returns {string} 格式化后的牌面
 */
function formatCards(cards) {
  if (!cards || cards.length === 0) return '无牌';
  
  return cards.map(card => {
    const rankMap = {
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
    };
    const displayRank = rankMap[card.rank] || card.rank;
    return `${card.suit}${displayRank}`;
  }).join(' ');
}

module.exports = {
  SUITS,
  RANKS,
  CARD_TYPES,
  createDeck,
  shuffleDeck,
  dealCards,
  compareCards,
  sortCards,
  getCardType,
  compareHands,
  formatCards
};