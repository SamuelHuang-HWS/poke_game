// server/README.md
# 炸金花游戏平台 - 后端服务

基于Node.js + Express的炸金花游戏后端服务，提供RESTful API和WebSocket实时通信。

## 技术栈

- **框架**: Node.js + Express
- **数据库**: MongoDB + Redis
- **实时通信**: Socket.IO
- **认证**: JWT + bcrypt
- **日志**: Winston
- **验证**: Joi
- **测试**: Jest

## 项目结构

```
server/
├── config/                 # 配置文件
├── controllers/            # 控制器
├── middleware/             # 中间件
├── models/                 # 数据模型
├── routes/                 # 路由
├── services/               # 业务逻辑
├── socket/                 # Socket.IO处理
├── utils/                  # 工具函数
├── index.js                # 服务器入口
└── package.json            # 项目依赖
```

## 环境要求

- Node.js >= 16.0.0
- MongoDB >= 4.0.0
- Redis >= 6.0.0

## 安装依赖

```bash
npm install
```

## 环境变量

创建 `.env` 文件配置环境变量:

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# JWT配置
JWT_SECRET=poke-game-jwt-secret
JWT_EXPIRES_IN=24h

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/pokegame
REDIS_URL=redis://localhost:6379

# 日志配置
LOG_LEVEL=info
```

## 启动服务

### 开发模式

```bash
npm run server:dev
```

### 生产模式

```bash
npm start
```

## API文档

### 认证API

#### 用户注册
```
POST /api/auth/register
Content-Type: application/json

{
  "phoneNumber": "13800138000",
  "password": "password123",
  "deviceId": "device123"
}
```

#### 用户登录
```
POST /api/auth/login
Content-Type: application/json

{
  "phoneNumber": "13800138000",
  "password": "password123",
  "deviceId": "device123"
}
```

#### 获取用户信息
```
GET /api/auth/profile
Authorization: Bearer <token>
```

#### 更新用户信息
```
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "玩家昵称"
}
```

### 房间API

#### 创建房间
```
POST /api/rooms/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "房间名称",
  "entryGold": 1000,
  "betAmount": 50,
  "totalRounds": 10
}
```

#### 搜索房间
```
GET /api/rooms/search/:roomId
```

#### 加入房间
```
POST /api/rooms/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "roomId": "ROOM_12345678",
  "roomGold": 1000
}
```

#### 离开房间
```
POST /api/rooms/leave/:roomId
Authorization: Bearer <token>
```

#### 获取房间详情
```
GET /api/rooms/:roomId
Authorization: Bearer <token>
```

#### 获取用户房间列表
```
GET /api/rooms/user/list
Authorization: Bearer <token>
```

### 游戏API

#### 开始游戏
```
POST /api/games/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "roomId": "ROOM_12345678"
}
```

#### 看牌
```
POST /api/games/see
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameId": "game123"
}
```

#### 跟注
```
POST /api/games/call
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameId": "game123"
}
```

#### 加注
```
POST /api/games/raise
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameId": "game123",
  "amount": 100
}
```

#### 弃牌
```
POST /api/games/fold
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameId": "game123"
}
```

#### 比牌
```
POST /api/games/compare
Authorization: Bearer <token>
Content-Type: application/json

{
  "gameId": "game123",
  "targetUserId": "user123"
}
```

#### 获取游戏详情
```
GET /api/games/:gameId
Authorization: Bearer <token>
```

## Socket.IO事件

### 客户端发送事件

#### 用户加入房间
```javascript
socket.emit('user_join', {
  userId: 'user123',
  roomId: 'ROOM_12345678'
});
```

#### 用户离开房间
```javascript
socket.emit('user_leave', {
  userId: 'user123',
  roomId: 'ROOM_12345678'
});
```

#### 游戏操作
```javascript
socket.emit('game_action', {
  action: 'see_cards', // see_cards, call, raise, fold, compare
  gameId: 'game123',
  userId: 'user123',
  payload: {} // 根据操作类型传递不同参数
});
```

#### 聊天消息
```javascript
socket.emit('chat_message', {
  roomId: 'ROOM_12345678',
  userId: 'user123',
  message: '聊天内容'
});
```

### 服务端广播事件

#### 房间更新
```javascript
socket.on('room_updated', (room) => {
  // 房间信息更新
});
```

#### 玩家加入
```javascript
socket.on('player_joined', (data) => {
  // 有玩家加入房间
});
```

#### 玩家离开
```javascript
socket.on('player_left', (data) => {
  // 有玩家离开房间
});
```

#### 游戏状态更新
```javascript
socket.on('game_state_update', (gameState) => {
  // 游戏状态发生变化
});
```

#### 游戏操作结果
```javascript
socket.on('game_action_result', (result) => {
  // 游戏操作执行结果
});
```

#### 聊天消息
```javascript
socket.on('chat_message', (data) => {
  // 收到聊天消息
});
```

#### 错误信息
```javascript
socket.on('error', (error) => {
  // 发生错误
});
```

## 数据模型

### 用户模型 (User)
```javascript
{
  phoneNumber: String,     // 手机号
  password: String,        // 密码（加密）
  nickname: String,        // 昵称
  avatar: String,          // 头像
  gold: Number,            // 金币余额
  deviceId: String,        // 设备ID
  lastLoginAt: Date,       // 最后登录时间
  createdAt: Date,         // 创建时间
  updatedAt: Date          // 更新时间
}
```

### 房间模型 (Room)
```javascript
{
  roomId: String,          // 房间号
  creator: ObjectId,       // 创建者
  name: String,            // 房间名称
  entryGold: Number,       // 入场金币
  betAmount: Number,       // 单注金额
  totalRounds: Number,     // 总局数
  currentRound: Number,    // 当前局数
  password: String,        // 房间密码（可选）
  players: Array,          // 玩家列表
  observers: Array,        // 观察者列表
  status: String,          // 房间状态
  gameHistory: Array,      // 游戏历史
  createdAt: Date,         // 创建时间
  updatedAt: Date          // 更新时间
}
```

### 游戏模型 (Game)
```javascript
{
  roomId: String,          // 房间ID
  round: Number,           // 局数
  status: String,          // 游戏状态
  pot: Number,             // 底池
  bettingRound: Number,    // 下注轮次
  currentPlayerIndex: Number, // 当前行动玩家索引
  minBet: Number,          // 最小下注额
  players: Array,          // 玩家列表
  winner: Object,          // 获胜者
  result: String,          // 游戏结果
  createdAt: Date,         // 创建时间
  updatedAt: Date,         // 更新时间
  finishedAt: Date         // 结束时间
}
```

## 安全措施

1. **JWT认证**: 所有API接口都需要有效的JWT Token
2. **输入验证**: 使用Joi对所有输入数据进行验证
3. **速率限制**: 使用express-rate-limit防止恶意请求
4. **密码加密**: 使用bcrypt对用户密码进行加密存储
5. **CORS配置**: 限制跨域请求来源
6. **Helmet安全头**: 添加安全相关的HTTP头

## 性能优化

1. **Redis缓存**: 缓存频繁访问的数据
2. **数据库索引**: 为常用查询字段添加索引
3. **连接池**: 使用数据库连接池提高性能
4. **gzip压缩**: 启用响应数据压缩
5. **静态资源缓存**: 设置合适的缓存头

## 日志记录

使用Winston记录应用日志:

- **错误日志**: `logs/error.log`
- **综合日志**: `logs/combined.log`

## 测试

### 单元测试
```bash
npm test
```

### 代码检查
```bash
npm run lint
```

## 部署

### Docker部署

创建Docker镜像:
```bash
docker build -t poke-game-server .
```

运行容器:
```bash
docker run -p 3000:3000 poke-game-server
```

### PM2部署

安装PM2:
```bash
npm install -g pm2
```

启动应用:
```bash
pm2 start server/index.js --name poke-game
```

## 监控与维护

1. **健康检查**: `/health` 端点监控服务状态
2. **日志监控**: 定期检查日志文件
3. **性能监控**: 使用APM工具监控应用性能
4. **备份策略**: 定期备份数据库

## 故障排除

### 常见问题

1. **数据库连接失败**: 检查MongoDB和Redis服务是否正常运行
2. **JWT认证失败**: 检查JWT_SECRET环境变量是否正确配置
3. **Socket.IO连接问题**: 检查CORS配置和网络连接
4. **性能问题**: 检查数据库索引和Redis缓存配置

### 调试技巧

1. 设置`LOG_LEVEL=debug`获取详细日志
2. 使用Postman测试API接口
3. 使用WebSocket客户端测试实时通信
4. 查看浏览器开发者工具中的网络请求