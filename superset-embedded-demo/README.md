# Superset Embedded Dashboard SDK - 集成演示项目

这是一个完整的 Apache Superset Dashboard 嵌入式集成演示项目，展示如何将 Superset Dashboard 嵌入到你的应用中。

## 📖 项目概述

本项目提供了一套完整的解决方案，用于在第三方应用中嵌入 Superset Dashboard，包括：

- ✅ **后端 API**：生成 Guest Token 的 Node.js 服务
- ✅ **前端示例**：多个不同场景的嵌入示例页面
- ✅ **配置文件**：开发和生产环境的完整配置
- ✅ **工具脚本**：自动化 Dashboard Embedded 模式启用
- ✅ **完整文档**：从开发到生产的详细指南

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Python 3.8+
- Superset 实例运行中（开发环境：http://localhost:8088）
- Redis（生产环境需要）

### 1. 安装后端依赖

```bash
cd backend
npm install
```

### 2. 启动后端 API

```bash
cd backend
npm start
```

后端 API 将运行在 http://localhost:3001

### 3. 启动前端服务

```bash
cd frontend
python3 -m http.server 3002
```

前端页面将运行在 http://localhost:3002

### 4. 访问演示页面

**推荐使用**（已验证可用）：
- 简单测试：http://localhost:3002/simple-test.html
- 完整演示：http://localhost:3002/test.html
- 配置界面：http://localhost:3002/index.html

## 📁 项目结构

```
superset-embedded-demo/
├── backend/                    # 后端 API
│   ├── server.js              # 开发环境服务器
│   ├── server-production.js   # 生产环境服务器
│   ├── package.json           # 依赖配置
│   └── .env.example           # 环境变量示例
│
├── frontend/                   # 前端示例
│   ├── simple-test.html       # 简单测试页面 ⭐
│   ├── test.html              # 完整演示页面 ⭐
│   ├── index.html             # 配置界面（可自动启用 embedded）
│   ├── production-preview.html # 生产预览（带错误处理）
│   └── production.html        # 生产环境页面
│
├── config/                     # 配置文件
│   └── superset_config_production.py  # Superset 生产配置
│
├── scripts/                    # 工具脚本
│   └── enable-dashboard-embedded.sh   # 启用 Dashboard embedded 脚本
│
├── README.md                   # 本文件
├── FRONTEND-PAGES-GUIDE.md    # 前端页面使用指南
├── PRODUCTION-DEPLOYMENT.md   # 生产环境部署指南
├── PROJECT-SUMMARY.md         # 项目技术细节
├── README-COMPLETE.md         # 完整使用指南
└── FINAL-SUMMARY.md           # 项目总结
```

## 🎯 核心功能

### 后端 API

**可用端点**：

```
POST /api/guest-token          # 生成 Guest Token
GET  /api/dashboards           # 获取 Dashboard 列表
POST /api/enable-embedded      # 启用 Dashboard Embedded 模式
GET  /health                   # 健康检查
```

**示例**：

```bash
# 生成 Guest Token
curl -X POST http://localhost:3001/api/guest-token \
  -H "Content-Type: application/json" \
  -d '{"dashboardId":"your-dashboard-uuid","username":"demo_user"}'

# 启用 Embedded 模式
curl -X POST http://localhost:3001/api/enable-embedded \
  -H "Content-Type: application/json" \
  -d '{"dashboardUuid":"your-dashboard-uuid"}'
```

### 前端集成

**基础示例**：

```html
<!-- 加载 Superset Embedded SDK -->
<script src="https://unpkg.com/@superset-ui/embedded-sdk@latest/bundle/index.js"></script>

<script>
const { embedDashboard } = supersetEmbeddedSdk;

embedDashboard({
    id: 'embedded-uuid-here',  // Embedded UUID
    supersetDomain: 'http://localhost:8088',
    mountPoint: document.getElementById('container'),
    fetchGuestToken: async () => {
        const response = await fetch('http://localhost:3001/api/guest-token', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                dashboardId: 'dashboard-uuid-here',  // Dashboard UUID
                username: 'your_user'
            })
        });
        return (await response.json()).token;
    }
});
</script>
```

## 🔑 重要概念

### Dashboard UUID vs Embedded UUID

这是最容易混淆的概念！

| 类型 | 用途 | 在哪里使用 |
|------|------|-----------|
| **Dashboard UUID** | 识别 Dashboard | 后端 API（生成 Guest Token）|
| **Embedded UUID** | 嵌入页面 | 前端 SDK（embedDashboard）|

**如何获取**：

```bash
# 1. 获取 Dashboard UUID（从 Dashboard 列表）
curl http://localhost:3001/api/dashboards

# 2. 启用 Embedded 模式，获取 Embedded UUID
./scripts/enable-dashboard-embedded.sh <DASHBOARD_UUID>

# 或通过前端界面自动启用
# 访问 http://localhost:3002/index.html
```

## 📚 文档导航

### 快速入门
- **README.md**（本文件）- 项目概述和快速开始
- **FRONTEND-PAGES-GUIDE.md** - 前端页面使用指南

### 深入了解
- **README-COMPLETE.md** - 完整使用指南
- **PROJECT-SUMMARY.md** - 技术细节和架构

### 部署指南
- **PRODUCTION-DEPLOYMENT.md** - 生产环境部署
- **FINAL-SUMMARY.md** - 项目总结

## ⚠️ 开发环境 vs 生产环境

### 当前配置（开发环境）

**特点**：
- ✅ 快速开发，无需 HTTPS
- ⚠️ CSRF 保护已禁用
- ⚠️ CORS 完全开放
- ⚠️ 无速率限制

**适用**：本地开发和测试

### 生产环境

**必须配置**：
- ✅ HTTPS（强制）
- ✅ CSRF 保护
- ✅ 严格的 CORS
- ✅ 速率限制
- ✅ Redis 缓存
- ✅ 日志和监控

**详见**：`PRODUCTION-DEPLOYMENT.md`

## 🛠️ 常见任务

### 添加新的 Dashboard

**方法 1：使用脚本**

```bash
# 1. 获取 Dashboard UUID
curl http://localhost:3001/api/dashboards | python3 -m json.tool

# 2. 启用 Embedded 模式
./scripts/enable-dashboard-embedded.sh <DASHBOARD_UUID>

# 3. 记录返回的 Embedded UUID
```

**方法 2：使用前端界面**

```bash
# 1. 访问配置页面
open http://localhost:3002/index.html

# 2. 从下拉列表选择 Dashboard
# 3. 点击"启用 Embedded"按钮
# 4. 点击"加载 Dashboard"
```

### 修改后端配置

编辑 `backend/.env` 文件：

```bash
SUPERSET_URL=http://localhost:8088
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
PORT=3001
```

### 自定义前端样式

编辑 HTML 文件中的 `dashboardUiConfig`：

```javascript
dashboardUiConfig: {
    hideTitle: false,        // 显示标题
    hideTab: false,          // 显示标签页
    hideChartControls: false, // 显示图表控制
    hideFilters: false,      // 显示筛选器
}
```

## 🐛 故障排查

### Dashboard 显示 404

**原因**：Dashboard 未启用 Embedded 模式

**解决**：
```bash
./scripts/enable-dashboard-embedded.sh <DASHBOARD_UUID>
```

### Guest Token 生成失败

**原因**：Superset 配置问题或网络问题

**检查**：
1. Superset 是否运行：`curl http://localhost:8088/health`
2. 后端 API 是否运行：`curl http://localhost:3001/health`
3. 查看后端日志

### 编辑按钮仍然可见

**这不是问题**！

- Guest 用户没有编辑权限
- 点击会收到 403 错误（正常的安全行为）
- 这是 Superset 的预期设计

## 📞 获取帮助

### 文档资源

- 📖 查看项目文档（`*.md` 文件）
- 🔍 检查浏览器控制台错误
- 📋 查看后端日志

### 外部资源

- [Superset 官方文档](https://superset.apache.org/docs/embedding-superset)
- [Superset GitHub](https://github.com/apache/superset)
- [Embedded SDK NPM](https://www.npmjs.com/package/@superset-ui/embedded-sdk)

## 🎉 功能特性

### ✅ 已实现

- [x] Guest Token 认证
- [x] Dashboard 嵌入
- [x] 自动启用 Embedded 模式
- [x] 多个示例页面
- [x] 错误处理和重试
- [x] 完整文档
- [x] 生产环境配置
- [x] 工具脚本

### 🚧 可扩展

- [ ] 用户认证集成
- [ ] 行级安全（RLS）规则
- [ ] 自定义主题
- [ ] 多语言支持
- [ ] 性能监控
- [ ] A/B 测试

## 📝 许可证

本演示项目遵循 Apache Superset 的许可证。

## 🙏 致谢

本项目基于 [Apache Superset](https://github.com/apache/superset) 和 [@superset-ui/embedded-sdk](https://www.npmjs.com/package/@superset-ui/embedded-sdk)。

---

**准备开始？**

```bash
# 1. 启动后端
cd backend && npm install && npm start

# 2. 启动前端（新终端）
cd frontend && python3 -m http.server 3002

# 3. 打开浏览器
open http://localhost:3002/test.html
```

🎊 **祝你使用愉快！**
