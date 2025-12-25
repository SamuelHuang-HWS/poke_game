// client/README.md
# 炸金花游戏平台 - 前端

基于Vue 3 + Vite的现代化炸金花游戏前端应用。

## 技术栈

- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **网络请求**: Axios
- **实时通信**: Socket.IO Client
- **UI框架**: 原生CSS + 玻璃拟态设计
- **游戏引擎**: Phaser.js (用于复杂动画)

## 项目结构

```
client/
├── public/                 # 静态资源
├── src/
│   ├── assets/            # 静态资源
│   ├── components/        # 公共组件
│   ├── views/             # 页面视图
│   ├── stores/            # 状态管理
│   ├── router/            # 路由配置
│   ├── services/          # 服务层
│   ├── styles/            # 样式文件
│   ├── utils/             # 工具函数
│   ├── App.vue            # 根组件
│   └── main.js            # 入口文件
├── vite.config.js         # Vite配置
└── package.json           # 项目依赖
```

## 开发环境

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

默认访问地址: http://localhost:8080

### 构建生产版本

```bash
npm run build
```

### 本地预览生产构建

```bash
npm run serve
```

## 功能模块

### 1. 用户系统
- 手机号注册/登录
- JWT Token认证
- 个人信息管理

### 2. 房间系统
- 创建房间
- 搜索房间
- 加入/离开房间
- 房间列表展示

### 3. 游戏系统
- 炸金花核心玩法
- 实时游戏状态同步
- 聊天系统
- 游戏结果展示

### 4. 界面设计
- 响应式设计
- 玻璃拟态视觉效果
- 流畅的动画交互
- 深色主题

## 环境变量

创建 `.env` 文件配置环境变量:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## 代码规范

- 使用ESLint进行代码检查
- 遵循Vue 3 Composition API风格
- 组件化开发
- 状态管理规范化

## 部署

构建后的文件位于 `dist/` 目录，可部署到任何静态文件服务器。

## 开发指南

### 添加新页面

1. 在 `src/views/` 目录创建页面组件
2. 在 `src/router/index.js` 添加路由配置
3. 在需要的地方添加导航链接

### 添加新组件

1. 在 `src/components/` 目录创建组件
2. 在需要使用的页面或组件中导入并使用

### 状态管理

使用Pinia进行状态管理:

1. 在 `src/stores/` 目录创建store
2. 在组件中通过 `useStore()` 钩子使用

### API调用

通过 `src/services/api.js` 统一管理API调用。

## 注意事项

1. 确保后端服务已启动
2. 开发环境下默认代理到 `http://localhost:3000`
3. 生产环境需配置正确的API地址