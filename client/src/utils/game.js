// client/src/utils/game.js
/**
 * 游戏工具类
 */

/**
 * 格式化牌面显示
 * @param {Array} cards 手牌
 * @returns {string} 格式化后的牌面
 */
export function formatCards(cards) {
  if (!cards || cards.length === 0) return '无牌';
  
  return cards.map(card => {
    const rankMap = {
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2'
    };
    const displayRank = rankMap[card.rank] || card.rank;
    return `${card.suit}${displayRank}`;
  }).join(' ');
}

/**
 * 获取牌型文本
 * @param {number} cardType 牌型代码
 * @returns {string} 牌型文本
 */
export function getCardTypeText(cardType) {
  const cardTypeMap = {
    1: '单张',
    2: '对子',
    3: '顺子',
    4: '同花',
    5: '同花顺',
    6: '豹子'
  };
  
  return cardTypeMap[cardType] || '未知';
}

/**
 * 格式化金币显示
 * @param {number} gold 金币数量
 * @returns {string} 格式化后的金币显示
 */
export function formatGold(gold) {
  if (gold >= 10000) {
    return `${(gold / 10000).toFixed(2)}万`;
  }
  return gold.toString();
}

/**
 * 计算倒计时
 * @param {number} endTime 结束时间戳
 * @returns {number} 剩余秒数
 */
export function calculateCountdown(endTime) {
  const now = Date.now();
  const diff = endTime - now;
  return Math.max(0, Math.ceil(diff / 1000));
}

/**
 * 随机生成房间号
 * @returns {string} 房间号
 */
export function generateRoomId() {
  return 'ROOM_' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

/**
 * 验证手机号
 * @param {string} phone 手机号
 * @returns {boolean} 是否有效
 */
export function validatePhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证密码强度
 * @param {string} password 密码
 * @returns {Object} 验证结果
 */
export function validatePassword(password) {
  const minLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  return {
    isValid: minLength && hasLetter && hasNumber,
    minLength,
    hasLetter,
    hasNumber
  };
}