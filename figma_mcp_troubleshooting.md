# Figma MCP 配置说明

## 🔧 MCP配置问题排查

### 1. 检查Trae IDE版本
确保您的Trae IDE版本支持MCP功能：
```
版本要求：Trae IDE v2.0+
MCP支持：需要开启实验性功能
```

### 2. Figma API配置

#### 获取Figma访问令牌
1. 登录 [Figma](https://www.figma.com)
2. 进入 Settings → Account → Personal access tokens
3. 创建新的访问令牌
4. 复制令牌到 `mcp.config.json` 文件

#### 获取文件密钥
1. 在Figma中打开您的设计文件
2. 从URL中提取文件密钥：`https://www.figma.com/file/[FILE_KEY]/...`
3. 将FILE_KEY填入配置文件

### 3. 安装MCP依赖
```bash
# 在项目根目录执行
npm install @figma/rest-api

# 或者使用yarn
yarn add @figma/rest-api
```

### 4. 启动MCP服务
```bash
# 启动MCP服务器
npm run mcp:start

# 或者手动启动
node mcp-server.js
```

### 5. 常见错误及解决方案

#### 错误："MCP server not found"
**解决方案：**
```bash
# 1. 检查MCP服务器文件是否存在
ls -la mcp-server.js

# 2. 创建MCP服务器文件（如果需要）
# 3. 检查端口是否被占用
netstat -an | grep 3000
```

#### 错误："Figma API authentication failed"
**解决方案：**
```json
// 更新 mcp.config.json
{
  "access_token": "您的实际Figma令牌",
  "file_key": "您的实际文件密钥",
  "timeout": 30000
}
```

#### 错误："Connection timeout"
**解决方案：**
```bash
# 1. 检查网络连接
ping api.figma.com

# 2. 增加超时时间
# 在配置文件中添加："timeout": 60000

# 3. 检查防火墙设置
```

### 6. 手动测试MCP连接
```bash
# 测试Figma API连接
curl -H "X-Figma-Token: YOUR_TOKEN" \
     "https://api.figma.com/v1/me"

# 测试文件访问
curl -H "X-Figma-Token: YOUR_TOKEN" \
     "https://api.figma.com/v1/files/YOUR_FILE_KEY"
```

### 7. 替代方案

如果MCP无法正常工作，您可以：

#### A. 手动创建Figma文件
1. 访问 [Figma](https://www.figma.com)
2. 创建新文件
3. 使用我提供的设计规范手动创建界面

#### B. 使用Figma插件
```
推荐插件：
├── UI Faces - 头像生成
├── Lorem Ipsum - 文本生成
├── Unsplash - 图片素材
├── Iconify - 图标库
└── Figmotion - 动画制作
```

#### C. 使用其他设计工具
```
替代工具：
├── Adobe XD
├── Sketch (Mac)
├── Figma (Web版)
└── Penpot (开源)
```

### 8. 联系支持

如果问题仍然存在：

1. **Trae IDE支持**: 检查官方文档或社区论坛
2. **Figma API支持**: 查看 [Figma开发者文档](https://www.figma.com/developers/api)
3. **MCP社区**: 寻求MCP相关技术支持

### 9. 临时解决方案

在MCP修复之前，我已经为您准备了完整的设计规范：

```
可用资源：
├── figma_design_guide.md - 设计指南
├── figma_design_specifications.md - 详细规范
└── mcp.config.json - 配置文件模板
```

您可以直接使用这些规范在Figma网页版中手动创建设计，所有参数都已经详细标注。