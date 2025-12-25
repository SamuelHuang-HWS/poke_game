// server/utils/cardUtils.js
/**
 * 炸金花牌型工具类
 */

// 花色
const SUITS = ['♠', '♥', '♣', '♦'];
// 点数 (3-15, 其中14代表A, 15代表2)
const RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
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
  // 先比较点数
  if (card1.rank !== card2.rank) {
    // 特殊处理A和2
    const rank1 = card1.rank === 14 ? 14 : (card1.rank === 15 ? 1 : card1.rank);
    const rank2 = card2.rank === 14 ? 14 : (card2.rank === 15 ? 1 : card2.rank);
    return rank1 > rank2 ? 1 : -1;
  }
  // 点数相同时比较花色
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

  // 排序
  const sortedCards = sortCards(cards);
  
  // 判断是否为豹子（三张相同点数）
  if (sortedCards[0].rank === sortedCards[1].rank && 
      sortedCards[1].rank === sortedCards[2].rank) {
    return {
      type: CARD_TYPES.THREE,
      typeName: '豹子',
      value: sortedCards[0].rank
    };
  }
  
  // 判断是否为同花
  const isFlush = sortedCards[0].suit === sortedCards[1].suit && 
                  sortedCards[1].suit === sortedCards[2].suit;
  
  // 判断是否为顺子
  // 特殊处理A,2,3顺子
  let isStraight = false;
  if (sortedCards[0].rank === 15 && sortedCards[1].rank === 14 && sortedCards[2].rank === 3) {
    // 2,A,3 是顺子
    isStraight = true;
  } else {
    // 普通顺子
    isStraight = (sortedCards[0].rank === sortedCards[1].rank + 1) &&
                 (sortedCards[1].rank === sortedCards[2].rank + 1);
  }
  
  // 同花顺
  if (isFlush && isStraight) {
    return {
      type: CARD_TYPES.FULL_HOUSE,
      typeName: '同花顺',
      value: sortedCards[0].rank
    };
  }
  
  // 同花
  if (isFlush) {
    return {
      type: CARD_TYPES.FLUSH,
      typeName: '同花',
      value: sortedCards[0].rank
    };
  }
  
  // 顺子
  if (isStraight) {
    return {
      type: CARD_TYPES.STRAIGHT,
      typeName: '顺子',
      value: sortedCards[0].rank
    };
  }
  
  // 对子
  if (sortedCards[0].rank === sortedCards[1].rank || 
      sortedCards[1].rank === sortedCards[2].rank) {
    const pairRank = sortedCards[0].rank === sortedCards[1].rank ? 
                     sortedCards[0].rank : sortedCards[1].rank;
    return {
      type: CARD_TYPES.PAIR,
      typeName: '对子',
      value: pairRank
    };
  }
  
  // 单张
  return {
    type: CARD_TYPES.SINGLE,
    typeName: '单张',
    value: sortedCards[0].rank
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
  
  // 先比较牌型
  if (type1.type !== type2.type) {
    return type1.type > type2.type ? 1 : -1;
  }
  
  // 牌型相同，比较牌型值
  if (type1.value !== type2.value) {
    // 特殊处理A和2的大小关系
    const getValue = (rank) => rank === 14 ? 14 : (rank === 15 ? 1 : rank);
    const val1 = getValue(type1.value);
    const val2 = getValue(type2.value);
    return val1 > val2 ? 1 : -1;
  }
  
  // 牌型和值都相同，比较最大单牌
  const sorted1 = sortCards(cards1);
  const sorted2 = sortCards(cards2);
  
  for (let i = 0; i < 3; i++) {
    const result = compareCards(sorted1[i], sorted2[i]);
    if (result !== 0) {
      return result;
    }
  }
  
  return 0; // 平局
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