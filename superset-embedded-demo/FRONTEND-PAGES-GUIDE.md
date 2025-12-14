# Superset Embedded Dashboard - 前端页面使用指南

## 📄 可用页面总览

| 文件名 | 用途 | 状态 | 推荐使用场景 |
|--------|------|------|--------------|
| `simple-test.html` | 简单测试 | ✅ 可用 | 快速测试、调试 |
| `test.html` | 开发测试（完整） | ✅ 可用 | 开发环境测试 |
| `ai-button-demo.html` | AI Button 交互演示 | ✅ 可用 | AI 功能测试、演示 |
| `index.html` | 配置界面 | ✅ 可用 | 需要配置 Dashboard |
| `production-preview.html` | 生产预览 | ✅ 可用 | 测试生产级功能 |
| `production.html` | 真实生产 | ⚠️ 需配置 | 实际生产部署 |

## ✅ 推荐使用方案

### 场景 1: 快速测试和演示
**使用**: `simple-test.html`

**访问**: http://localhost:3002/simple-test.html

**特点**:
- ✅ 代码最简单
- ✅ 配置清晰可见
- ✅ 调试信息丰富
- ✅ 已验证可用

**适合**:
- 快速验证 Dashboard 是否可以嵌入
- 调试连接问题
- 向他人演示功能

---

### 场景 2: 开发环境完整测试
**使用**: `test.html`

**访问**: http://localhost:3002/test.html

**特点**:
- ✅ 界面美观
- ✅ 大小自适应
- ✅ 用户友好提示
- ✅ 已验证可用

**适合**:
- 日常开发测试
- 需要美观界面
- 演示给产品经理/客户

---

### 场景 3: AI Button 交互功能演示
**使用**: `ai-button-demo.html`

**访问**: http://localhost:3002/ai-button-demo.html

**特点**:
- ✅ 专门展示 AI Button Chart 插件
- ✅ 实时显示接收到的 AI 问题
- ✅ 模拟 AI 响应功能
- ✅ 统计消息数量和时间
- ✅ 美观的双栏布局

**适合**:
- 演示 AI Button 功能
- 测试 postMessage 通信
- 开发 AI 集成功能
- 向客户展示 AI 交互能力

**如何使用**:
1. 在 Dashboard 中添加 "AI Button Chart"
2. 点击 "Ask AI" 按钮
3. 输入问题（如："分析销售趋势"）
4. 右侧面板实时显示问题和响应

---

### 场景 4: 测试生产级功能（带错误处理）
**使用**: `production-preview.html`

**访问**: http://localhost:3002/production-preview.html

**特点**:
- ✅ 重试逻辑（3次指数退避）
- ✅ 请求超时控制（10秒）
- ✅ 用户友好错误消息
- ✅ 网络状态监听
- ✅ 性能监控

**适合**:
- 测试错误处理逻辑
- 测试网络问题场景
- 准备生产部署前的验证

**注意**: 如果看到缓存问题，请：
1. 按 `Cmd+Shift+R` 强制刷新
2. 或清除浏览器缓存后访问

---

### 场景 4: 需要配置不同的 Dashboard
**使用**: `index.html`

**访问**: http://localhost:3002/index.html

**特点**:
- ✅ 可视化配置界面
- ✅ 自动加载 Dashboard 列表
- ✅ 可选择不同 Dashboard
- ✅ 配置后端 URL

**适合**:
- 需要频繁切换 Dashboard
- 需要修改配置参数
- 测试多个 Dashboard

---

### 场景 5: 真实生产环境
**使用**: `production.html`

**访问**: 需要部署到生产服务器

**特点**:
- 需要配置真实域名
- 需要 HTTPS
- 需要修改配置变量

**配置方法**:
```html
<script>
window.BACKEND_URL = 'https://your-api-domain.com';
window.SUPERSET_URL = 'https://your-superset-domain.com';
window.EMBEDDED_UUID = 'your-embedded-uuid';
window.DASHBOARD_UUID = 'your-dashboard-uuid';
</script>
```

**适合**:
- 实际生产部署
- 需要 HTTPS 安全连接
- 对外提供服务

---

## 🎯 根据你的需求选择

### 现在使用什么？

**推荐**: 使用 `simple-test.html` 或 `test.html`

**原因**:
1. 两者都已验证可用 ✅
2. 配置简单，无需修改
3. 界面友好，调试方便

**对比**:
- `simple-test.html`: 代码极简，适合调试
- `test.html`: 界面完整，适合演示

### 未来部署生产时使用什么？

**推荐**: 使用 `production.html`（需要配置）

**步骤**:
1. 参考 `PRODUCTION-DEPLOYMENT.md`
2. 准备域名和 SSL 证书
3. 修改 `production.html` 中的配置
4. 部署到生产服务器

---

## 🔧 页面对比详情

### 代码复杂度
```
simple-test.html    ⭐ (最简单)
test.html          ⭐⭐
index.html         ⭐⭐⭐
production-preview ⭐⭐⭐⭐
production.html    ⭐⭐⭐⭐
```

### 功能完整度
```
simple-test.html    ⭐⭐
test.html          ⭐⭐⭐⭐
index.html         ⭐⭐⭐⭐⭐
production-preview ⭐⭐⭐⭐⭐
production.html    ⭐⭐⭐⭐⭐
```

### 错误处理
```
simple-test.html    ⭐
test.html          ⭐⭐
index.html         ⭐⭐
production-preview ⭐⭐⭐⭐⭐
production.html    ⭐⭐⭐⭐⭐
```

---

## 📝 快速访问链接

当前可用（本地开发环境）:
- http://localhost:3002/simple-test.html ⭐ 推荐
- http://localhost:3002/test.html ⭐ 推荐
- http://localhost:3002/ai-button-demo.html 🤖 AI 功能演示
- http://localhost:3002/index.html
- http://localhost:3002/production-preview.html

---

## 💡 小贴士

1. **优先使用 simple-test.html 或 test.html**
   - 这两个已经验证可用
   - 配置正确，无需修改

2. **如果遇到缓存问题**
   - 按 `Cmd+Shift+R` (Mac) 或 `Ctrl+Shift+R` (Windows)
   - 或使用浏览器隐私/无痕模式

3. **查看调试信息**
   - 按 `Cmd+Option+I` 打开开发者工具
   - 查看 Console 标签页的日志

4. **准备部署生产时**
   - 阅读 `PRODUCTION-DEPLOYMENT.md`
   - 参考 `production.html` 的配置
   - 按步骤配置域名和 HTTPS

---

## ✅ 总结

**当前状态**:
- ✅ `simple-test.html` 可用（已验证）
- ✅ `test.html` 可用
- ✅ 所有核心功能正常工作

**推荐使用**:
- 日常使用: `test.html` (界面美观)
- 快速调试: `simple-test.html` (代码简单)
- 准备生产: 参考 `PRODUCTION-DEPLOYMENT.md`

🎉 恭喜！你的 Superset Embedded Dashboard 已经可以正常使用了！
