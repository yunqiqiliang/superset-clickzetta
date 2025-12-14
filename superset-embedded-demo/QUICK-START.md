# 快速参考指南

## 📂 项目位置

```
/Users/liangmo/Documents/GitHub/superset/superset-embedded-demo/
```

## ⚡ 快速启动

### 启动后端

```bash
cd /Users/liangmo/Documents/GitHub/superset/superset-embedded-demo/backend
npm start
```

### 启动前端

```bash
cd /Users/liangmo/Documents/GitHub/superset/superset-embedded-demo/frontend
python3 -m http.server 3002
```

### 访问页面

- 简单测试：http://localhost:3002/simple-test.html ⭐
- 完整演示：http://localhost:3002/test.html ⭐
- 配置界面：http://localhost:3002/index.html
- 生产示例：http://localhost:3002/production.html 🚀

## 📖 文档阅读顺序

1. **README.md** - 项目概述（从这里开始）
2. **FRONTEND-PAGES-GUIDE.md** - 前端页面选择
3. **README-COMPLETE.md** - 详细使用
4. **PRODUCTION-DEPLOYMENT.md** - 生产部署
5. **PROJECT-SUMMARY.md** - 技术细节
6. **FINAL-SUMMARY.md** - 项目总结

## 🚀 生产环境示例 (production.html)

`production.html` 是一个为真实世界应用设计的健壮示例。它包含以下特性：

- **动态配置**: 可通过 `window` 对象动态传入后端和 Superset 的 URL。
- **错误处理**: 包含重试逻辑和用户友好的错误提示。
- **加载状态**: 显示加载动画，提升用户体验。
- **网络监听**: 能感知网络断开和重连。

这个文件是集成到您自己项目中的绝佳起点。

## 🔑 关键命令

### 获取 Dashboard 列表
```bash
curl http://localhost:3001/api/dashboards | python3 -m json.tool
```

### 启用 Embedded 模式
```bash
cd /Users/liangmo/Documents/GitHub/superset/superset-embedded-demo
./scripts/enable-dashboard-embedded.sh <DASHBOARD_UUID>
```

### 生成 Guest Token
```bash
curl -X POST http://localhost:3001/api/guest-token \
  -H "Content-Type: application/json" \
  -d '{"dashboardId":"YOUR-DASHBOARD-UUID","username":"test_user"}'
```

## ✅ 已验证可用

- ✅ 后端 API（http://localhost:3001）
- ✅ 前端页面（http://localhost:3002）
- ✅ Dashboard 嵌入功能
- ✅ 自动启用 Embedded 模式
- ✅ Guest Token 生成

## 🎯 下一步

**如果是第一次使用**：
1. 阅读 `README.md`
2. 启动后端和前端
3. 访问 http://localhost:3002/test.html

**如果要添加新 Dashboard**：
1. 访问 http://localhost:3002/index.html
2. 选择 Dashboard
3. 点击"启用 Embedded"
4. 点击"加载 Dashboard"

**如果要部署生产**：
1. 阅读 `PRODUCTION-DEPLOYMENT.md`
2. 配置 HTTPS 和安全设置
3. 部署到生产服务器

---

**需要帮助？** 查看文档或检查浏览器控制台错误信息。
