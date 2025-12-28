/*
 * @Author: Wensong Huang wensong.huang@eeoa.com
 * @Date: 2025-12-19 18:29:07
 * @LastEditors: Wensong Huang wensong.huang@eeoa.com
 * @LastEditTime: 2025-12-26 13:20:32
 * @FilePath: /poke_game/server/routes/games.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
  getGameDetail,
  startNextRound,
  handlePlayerTimeout,
  forceCompare
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

/**
 * @route POST /api/games/next-round
 * @desc 开始下一局
 * @access Private
 */
router.post('/next-round', authenticate, startNextRound);

/**
 * @route POST /api/games/timeout
 * @desc 处理玩家超时
 * @access Private
 */
router.post('/timeout', authenticate, handlePlayerTimeout);

/**
 * @route POST /api/games/force-compare
 * @desc 强制比牌
 * @access Private
 */
router.post('/force-compare', authenticate, forceCompare);

module.exports = router;