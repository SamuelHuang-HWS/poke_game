// server/controllers/gameController.js
const gameService = require('../services/gameService');

/**
 * 开始游戏
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function startGame(req, res) {
  try {
    const { roomId } = req.body;

    const game = await gameService.startNewGame(roomId);

    res.status(201).json({
      success: true,
      message: '游戏开始成功',
      data: game
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 看牌
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function seeCards(req, res) {
  try {
    const { gameId } = req.body;
    const userId = req.user.userId;

    const game = await gameService.seeCards(gameId, userId);

    res.status(200).json({
      success: true,
      message: '看牌成功',
      data: game
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 跟注
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function call(req, res) {
  try {
    const { gameId } = req.body;
    const userId = req.user.userId;

    const game = await gameService.call(gameId, userId);

    res.status(200).json({
      success: true,
      message: '跟注成功',
      data: game
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 加注
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function raise(req, res) {
  try {
    const { gameId, amount } = req.body;
    const userId = req.user.userId;

    const game = await gameService.raise(gameId, userId, amount);

    res.status(200).json({
      success: true,
      message: '加注成功',
      data: game
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 弃牌
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function fold(req, res) {
  try {
    const { gameId } = req.body;
    const userId = req.user.userId;

    const game = await gameService.fold(gameId, userId);

    res.status(200).json({
      success: true,
      message: '弃牌成功',
      data: game
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 比牌
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function compare(req, res) {
  try {
    const { gameId, targetUserId } = req.body;
    const userId = req.user.userId;

    const game = await gameService.compare(gameId, userId, targetUserId);

    res.status(200).json({
      success: true,
      message: '比牌成功',
      data: game
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * 获取游戏详情
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getGameDetail(req, res) {
  try {
    const { gameId } = req.params;
    const userId = req.user.userId;

    const game = await gameService.getGameDetail(gameId, userId);

    res.status(200).json({
      success: true,
      message: '获取游戏详情成功',
      data: game
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  startGame,
  seeCards,
  call,
  raise,
  fold,
  compare,
  getGameDetail
};