# 炸金花游戏平台 - 项目架构

## 技术栈
- **后端**: Node.js + Express + Socket.IO
- **数据库**: Redis (缓存) + MongoDB (持久化)
- **前端**: Vue.js 3 + TypeScript + Phaser.js (游戏渲染)
- **实时通信**: WebSocket (Socket.IO)
- **认证**: JWT + bcrypt
- **部署**: Docker + Nginx

## 项目结构
```
poke_game/
├── server/                    # 后端服务
│   ├── index.js              # 服务器入口
│   ├── config/               # 配置文件
│   │   ├── database.js       # 数据库配置
│   │   ├── redis.js          # Redis配置
│   │   └── constants.js      # 常量定义
│   ├── models/               # 数据模型
│   │   ├── User.js           # 用户模型
│   │   ├── Room.js           # 房间模型
│   │   └── Game.js           # 游戏模型
│   ├── controllers/          # 控制器
│   │   ├── authController.js # 认证控制器
│   │   ├── roomController.js # 房间控制器
│   │   └── gameController.js # 游戏控制器
│   ├── services/            # 业务逻辑
│   │   ├── authService.js    # 认证服务
│   │   ├── roomService.js    # 房间服务
│   │   ├── gameService.js    # 游戏服务
│   │   └── cardService.js    # 牌型服务
│   ├── middleware/           # 中间件
│   │   ├── auth.js           # 认证中间件
│   │   ├── validation.js     # 验证中间件
│   │   └── errorHandler.js   # 错误处理
│   ├── routes/               # 路由
│   │   ├── auth.js           # 认证路由
│   │   ├── rooms.js          # 房间路由
│   │   └── games.js          # 游戏路由
│   ├── socket/               # Socket.IO处理
│   │   ├── index.js          # Socket主文件
│   │   ├── handlers/         # Socket处理器
│   │   └── events.js         # Socket事件定义
│   └── utils/                # 工具函数
│       ├── logger.js         # 日志工具
│       ├── validator.js      # 验证工具
│       └── helpers.js        # 辅助函数
├── client/                    # 前端应用
│   ├── public/               # 静态资源
│   ├── src/
│   │   ├── main.js           # 应用入口
│   │   ├── App.vue           # 根组件
│   │   ├── router/           # 路由配置
│   │   ├── store/            # 状态管理
│   │   ├── components/       # 组件
│   │   ├── views/            # 页面
│   │   ├── services/         # API服务
│   │   ├── game/             # 游戏相关
│   │   └── utils/            # 工具函数
│   └── package.json
├── shared/                    # 共享代码
│   ├── constants.js          # 共享常量
│   ├── types.js              # 共享类型
│   └── utils.js              # 共享工具
├── docs/                      # 文档
├── docker-compose.yml         # Docker配置
├── Dockerfile                  # Docker镜像
├── .env.example               # 环境变量示例
├── .gitignore                 # Git忽略文件
└── package.json               # 项目依赖
```

## 核心功能模块

### 1. 用户系统
- 手机号注册/登录
- JWT令牌认证
- 用户信息管理
- 同设备防多开

### 2. 房间系统
- 独立创建房间
- 房间参数设置（入场金币、单注、局数）
- 房间号生成与管理
- 房间搜索与加入
- 房间状态管理

### 3. 游戏系统
- 炸金花核心玩法
- 发牌与牌型判断
- 游戏流程控制
- 操作同步
- 结算系统

### 4. 经济系统
- 房间独立游戏币
- 局数限制与自动结算
- 金币记录与统计

### 5. 实时通信
- WebSocket连接管理
- 事件广播与同步
- 断线重连机制

## 数据库设计

### MongoDB集合
- users: 用户信息
- rooms: 房间信息
- games: 游戏记录
- transactions: 金币流水

### Redis键结构
- user:{userId}: 用户缓存
- room:{roomId}: 房间缓存
- game:{gameId}: 游戏缓存
- online_users: 在线用户

## API设计

### 认证API
- POST /api/auth/register: 用户注册
- POST /api/auth/login: 用户登录
- POST /api/auth/logout: 用户登出
- GET /api/auth/profile: 获取用户信息

### 房间API
- POST /api/rooms/create: 创建房间
- GET /api/rooms/search: 搜索房间
- POST /api/rooms/join: 加入房间
- POST /api/rooms/leave: 离开房间
- GET /api/rooms/{roomId}: 获取房间信息

### 游戏API
- WebSocket事件: 游戏操作
- GET /api/games/rules: 游戏规则
- GET /api/games/history: 游戏历史

## Socket.IO事件

### 客户端发送事件
- join_room: 加入房间
- leave_room: 离开房间
- game_action: 游戏操作
- chat_message: 聊天消息

### 服务端广播事件
- room_updated: 房间状态更新
- game_started: 游戏开始
- game_action_result: 游戏操作结果
- game_ended: 游戏结束
- player_joined: 玩家加入
- player_left: 玩家离开

## 安全机制
- JWT认证
- 输入验证
- 频率限制
- SQL注入防护
- XSS防护

## 性能优化
- Redis缓存
- 数据库索引
- 连接池
- 分页查询
- 静态资源CDN

## 监控与日志
- Winston日志系统
- 性能监控
- 错误追踪
- 用户行为分析

## 部署方案
- Docker容器化
- Nginx反向代理
- PM2进程管理
- MongoDB集群
- Redis集群

这个架构设计确保了一期核心功能的完整实现，同时具备良好的扩展性和维护性。