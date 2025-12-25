// server/controllers/roomController.js
const roomService = require("../services/roomService");

/**
 * 创建房间
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function createRoom(req, res) {
  try {
    const roomData = req.body;
    const creatorId = req.user.userId;

    const room = await roomService.createRoom(roomData, creatorId);

    res.status(201).json({
      success: true,
      message: "创建房间成功",
      data: room,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 搜索房间
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function searchRoom(req, res) {
  try {
    const { roomId } = req.params;

    const room = await roomService.searchRoom(roomId);

    res.status(200).json({
      success: true,
      message: "搜索房间成功",
      data: room,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "搜索房间失败",
    });
  }
}

/**
 * 加入房间
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function joinRoom(req, res) {
  try {
    const { roomId } = req.body;
    const userId = req.user.userId;

    const room = await roomService.joinRoom(roomId, userId);

    res.status(200).json({
      success: true,
      message: "加入房间成功",
      data: room,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 离开房间
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function leaveRoom(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const result = await roomService.leaveRoom(roomId, userId);

    if (result.deleted) {
      res.status(200).json({
        success: true,
        message: "房间已解散",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "离开房间成功",
        data: result,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 获取房间详情
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getRoomDetail(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const room = await roomService.getRoomDetail(roomId, userId);

    res.status(200).json({
      success: true,
      message: "获取房间详情成功",
      data: room,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 获取用户创建的房间列表
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getUserRooms(req, res) {
  try {
    const userId = req.user.userId;

    const rooms = await roomService.getUserRooms(userId);

    res.status(200).json({
      success: true,
      message: "获取房间列表成功",
      data: rooms,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * 获取用户参与的活跃房间列表
 * @param {Object} req 请求对象
 * @param {Object} res 响应对象
 */
async function getUserActiveRooms(req, res) {
  try {
    const userId = req.user.userId;

    const rooms = await roomService.getUserActiveRooms(userId);

    res.status(200).json({
      success: true,
      message: "获取活跃房间列表成功",
      data: rooms,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  createRoom,
  searchRoom,
  joinRoom,
  leaveRoom,
  getRoomDetail,
  getUserRooms,
  getUserActiveRooms,
};
