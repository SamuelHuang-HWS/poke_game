// server/index.js
require("dotenv").config(); // 加载环境变量
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

// 配置和工具
const { connectDatabase } = require("./config/database");
const logger = require("./utils/logger");
const { initializeSocket } = require("./socket");

// 路由
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const gameRoutes = require("./routes/games");

// 创建Express应用
const app = express();

// 创建HTTP服务器
const server = http.createServer(app);

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
});
app.use(limiter);

// 解析JSON和URL编码数据
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 静态文件服务
app.use(express.static(path.join(__dirname, "../client/dist")));

// 日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// API路由
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/games", gameRoutes);

// 健康检查端点
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 处理SPA路由回退
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  logger.error(err.stack);

  // JWT错误处理
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "无效的访问令牌",
    });
  }

  // 默认错误处理
  res.status(500).json({
    success: false,
    message: "服务器内部错误",
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "接口不存在",
  });
});

// 优雅关闭
process.on("SIGTERM", async () => {
  logger.info("收到SIGTERM信号，开始优雅关闭...");

  try {
    // 关闭服务器
    server.close(() => {
      logger.info("HTTP服务器已关闭");
    });

    // 关闭数据库连接
    // await disconnectDatabase();

    process.exit(0);
  } catch (error) {
    logger.error("关闭过程中发生错误:", error);
    process.exit(1);
  }
});

// 连接数据库并启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();

    // 初始化Socket.IO
    const io = initializeSocket(server);

    // 启动服务器
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      logger.info(`服务器运行在端口 ${PORT}`);
      console.log(`🚀 服务器启动成功: http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error("服务器启动失败:", error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

module.exports = app;
