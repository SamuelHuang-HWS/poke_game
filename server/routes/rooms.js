// server/routes/rooms.js
const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  validateCreateRoom,
  validateSearchRoom,
  validateJoinRoom,
} = require("../middleware/validation");
const {
  createRoom,
  searchRoom,
  joinRoom,
  leaveRoom,
  getRoomDetail,
  getUserRooms,
  getUserActiveRooms,
} = require("../controllers/roomController");

const router = express.Router();

/**
 * @route POST /api/rooms/create
 * @desc 创建房间
 * @access Private
 */
router.post("/create", authenticate, validateCreateRoom, createRoom);

/**
 * @route GET /api/rooms/search/:roomId
 * @desc 搜索房间
 * @access Public
 */
router.get("/search/:roomId", validateSearchRoom, searchRoom);

/**
 * @route POST /api/rooms/join
 * @desc 加入房间
 * @access Private
 */
router.post("/join", authenticate, validateJoinRoom, joinRoom);

/**
 * @route POST /api/rooms/leave/:roomId
 * @desc 离开房间
 * @access Private
 */
router.post("/leave/:roomId", authenticate, leaveRoom);

/**
 * @route GET /api/rooms/:roomId
 * @desc 获取房间详情
 * @access Private
 */
router.get("/:roomId", authenticate, getRoomDetail);

/**
 * @route GET /api/rooms/user/list
 * @desc 获取用户创建的房间列表
 * @access Private
 */
router.get("/user/list", authenticate, getUserRooms);

/**
 * @route GET /api/rooms/user/active
 * @desc 获取用户参与的活跃房间列表
 * @access Private
 */
router.get("/user/active", authenticate, getUserActiveRooms);

module.exports = router;
