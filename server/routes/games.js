// server/routes/games.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { 
  startGame, 
  seeCards, 
  call, 
  raise, 
  fold, 
  compare, 
  getGameDetail 
} = require('../controllers/gameController');

const router = express.Router();

/**
 * @route POST /api/games/start
 * @desc 开始游戏
 * @access Private
 */
router.post('/start', authenticate, startGame);

/**
 * @route POST /api/games/see
 * @desc 看牌
 * @access Private
 */
router.post('/see', authenticate, seeCards);

/**
 * @route POST /api/games/call
 * @desc 跟注
 * @access Private
 */
router.post('/call', authenticate, call);

/**
 * @route POST /api/games/raise
 * @desc 加注
 * @access Private
 */
router.post('/raise', authenticate, raise);

/**
 * @route POST /api/games/fold
 * @desc 弃牌
 * @access Private
 */
router.post('/fold', authenticate, fold);

/**
 * @route POST /api/games/compare
 * @desc 比牌
 * @access Private
 */
router.post('/compare', authenticate, compare);

/**
 * @route GET /api/games/:gameId
 * @desc 获取游戏详情
 * @access Private
 */
router.get('/:gameId', authenticate, getGameDetail);

module.exports = router;