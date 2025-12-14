# Superset 嵌入式 Dashboard 完整配置指南

## ✅ 已完成的配置

### 1. Superset 配置

**文件位置**: `~/Documents/GitHub/superset/docker/pythonpath_dev/superset_config.py`

```python
# 启用嵌入式功能
FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
}

# 允许嵌入的域名
EMBEDDED_DOMAINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    # ... 其他域名
]

# 开发环境配置（生产环境需要修改）
WTF_CSRF_ENABLED = False  # ⚠️ 仅开发环境
TALISMAN_ENABLED = False  # ⚠️ 仅开发环境
PUBLIC_ROLE_LIKE = "Admin"  # 开发环境使用 Admin，生产建议用 Gamma
```

### 2. 启用 Dashboard 的 Embedded 模式

**重要概念**：每个 Dashboard 需要单独启用 embedded 模式，会生成一个新的 **Embedded UUID**。

**启用方法**：
```bash
cd ~/Documents/superset-embed-demo
./scripts/enable-dashboard-embedded.sh <DASHBOARD_UUID>
```

**示例**：
```bash
# Dashboard UUID: 6d106529-9f27-4df9-9c9e-50e036a67559
# 启用后获得 Embedded UUID: 51c5173a-ae1d-4038-b417-22a72c15bb48
```

### 3. 后端 API 服务器

**位置**: `~/Documents/superset-embed-demo/backend/`

**功能**：
- 生成 guest token
- 提供 Dashboard 列表
- 代理认证请求

**启动**：
```bash
cd ~/Documents/superset-embed-demo/backend
npm install
npm start
```

运行在 `http://localhost:3001`

### 4. 前端示例页面

**位置**: `~/Documents/superset-embed-demo/frontend/`

**启动 HTTP 服务器**：
```bash
cd ~/Documents/superset-embed-demo/frontend
python3 -m http.server 3002
```

**访问**: `http://localhost:3002/test.html`

## 🔑 重要概念

### Dashboard UUID vs Embedded UUID

| 类型 | 用途 | 示例 |
|------|------|------|
| **Dashboard UUID** | 后端 API 生成 guest token | `6d106529-9f27-4df9-9c9e-50e036a67559` |
| **Embedded UUID** | 前端 SDK 加载页面 | `51c5173a-ae1d-4038-b417-22a72c15bb48` |

**前端代码示例**：
```javascript
embedDashboard({
    id: '51c5173a-ae1d-4038-b417-22a72c15bb48',  // ✅ 使用 Embedded UUID
    fetchGuestToken: async () => {
        const response = await fetch('http://localhost:3001/api/guest-token', {
            method: 'POST',
            body: JSON.stringify({
                dashboardId: '6d106529-9f27-4df9-9c9e-50e036a67559'  // ✅ 使用 Dashboard UUID
            })
        });
        return (await response.json()).token;
    }
});
```

## ⚠️ 已知限制

### 1. 编辑按钮仍然可见

**原因**：
- Superset Embedded SDK 的某些版本不支持 `hideEdit` 配置
- 由于跨域限制，无法通过 JavaScript 修改 iframe 内容

**影响**：
- 编辑按钮可见但不可用
- 点击编辑会返回 403 Forbidden（这是正常的安全行为）
- Guest 用户本就不应该有编辑权限

**解决方案**：
1. **推荐**：在用户界面添加说明，告知用户此为只读模式
2. **可选**：联系 Superset 维护者，请求支持 `hideEdit` 配置
3. **高级**：修改 Superset 源码，在 embedded 视图中隐藏编辑按钮

### 2. 需要为每个 Dashboard 启用 Embedded

每个要嵌入的 Dashboard 都需要：
1. 调用 API 启用 embedded 模式
2. 记录返回的 Embedded UUID
3. 在前端使用 Embedded UUID

## 📋 添加新 Dashboard 的步骤

### 步骤 1: 获取 Dashboard UUID

```bash
curl -s http://localhost:3001/api/dashboards | python3 -m json.tool
```

### 步骤 2: 启用 Embedded 模式

```bash
./scripts/enable-dashboard-embedded.sh <DASHBOARD_UUID>
```

记录返回的 **Embedded UUID**。

### 步骤 3: 更新前端代码

在前端使用 Embedded UUID：
```javascript
embedDashboard({
    id: '<EMBEDDED_UUID>',  // 来自步骤 2
    fetchGuestToken: async () => {
        // dashboardId 使用原始的 Dashboard UUID
        const response = await fetch('http://localhost:3001/api/guest-token', {
            method: 'POST',
            body: JSON.stringify({ dashboardId: '<DASHBOARD_UUID>' })
        });
        return (await response.json()).token;
    }
});
```

## 🚀 生产环境部署注意事项

### 必须修改的配置

1. **启用 CSRF 保护**:
```python
WTF_CSRF_ENABLED = True
```

2. **启用 Talisman**:
```python
TALISMAN_ENABLED = True
TALISMAN_CONFIG = {
    "content_security_policy": {
        "frame-ancestors": ["https://your-domain.com"]
    },
    "force_https": True,
}
```

3. **使用 HTTPS**:
```python
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "None"
```

4. **限制 Guest 权限**:
```python
PUBLIC_ROLE_LIKE = "Gamma"  # 或创建专门的 Guest 角色
```

5. **配置允许的域名**:
```python
EMBEDDED_DOMAINS = [
    "https://your-app.com",
    # 只添加实际需要的域名
]
```

### 后端 API 安全

1. 添加速率限制
2. 实现 token 缓存（Redis）
3. 验证用户身份
4. 实现行级安全（RLS）规则

### 前端安全

1. 使用 HTTPS
2. 验证 guest token 有效期
3. 实现错误处理和重试逻辑
4. 添加加载状态和超时处理

## 🔧 故障排查

### Dashboard 显示 404

**原因**: Dashboard 未启用 embedded 模式

**解决**: 运行 `./scripts/enable-dashboard-embedded.sh <DASHBOARD_UUID>`

### Guest Token 失败 (CSRF)

**原因**: CSRF 保护已启用但未提供 token

**解决**: 在开发环境设置 `WTF_CSRF_ENABLED = False`

### iframe 被拒绝连接

**原因**: Talisman 阻止了嵌入

**解决**: 设置 `TALISMAN_ENABLED = False` 或正确配置 CSP

### 403 Forbidden

**原因**: Guest 用户权限不足

**解决**:
- 检查 `PUBLIC_ROLE_LIKE` 配置
- 确保 Gamma/Admin 角色有权限访问该 Dashboard

## 📞 技术支持

- **Superset 文档**: https://superset.apache.org/docs/embedding-superset
- **问题反馈**: https://github.com/apache/superset/issues

## 📁 文件结构

```
superset-embed-demo/
├── backend/
│   ├── server.js          # Express API 服务器
│   ├── package.json       # 依赖配置
│   └── .env              # 环境变量
├── frontend/
│   ├── index.html        # 主页面（带配置界面）
│   └── test.html         # 测试页面（单一 Dashboard）
├── scripts/
│   └── enable-dashboard-embedded.sh  # 启用 Dashboard 脚本
└── README-COMPLETE.md    # 本文件
```

## 🎯 快速启动

```bash
# 1. 启动后端 API
cd ~/Documents/superset-embed-demo/backend
npm start

# 2. 启动前端服务器
cd ~/Documents/superset-embed-demo/frontend
python3 -m http.server 3002

# 3. 访问
open http://localhost:3002/test.html
```

确保 Superset 运行在 `http://localhost:8088`。
