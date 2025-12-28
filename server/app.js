const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const logger = require("./utils/logger");

const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const gameRoutes = require("./routes/games");

const app = express();

app.use(helmet());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(express.static(path.join(__dirname, "../client/dist")));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/games", gameRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.use((err, req, res, next) => {
  logger.error(err.stack);

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "无效的访问令牌",
    });
  }

  res.status(500).json({
    success: false,
    message: "服务器内部错误",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "接口不存在",
  });
});

module.exports = app;
