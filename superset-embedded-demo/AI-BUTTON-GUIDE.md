# 🤖 AI Button 功能使用指南

## 快速开始

### 1️⃣ 确保服务运行

✅ Superset: http://localhost:8088
✅ 后端 API: http://localhost:3001
✅ 前端 Demo: http://localhost:3002

### 2️⃣ 在 Superset 中创建 AI Button Chart

1. 访问 http://localhost:8088
2. 登录 Superset
3. 打开或创建一个 Dashboard
4. 点击 "Edit dashboard" 进入编辑模式
5. 点击 "➕" 添加新图表
6. 选择任意数据源
7. 在可视化类型列表中选择 **"AI Button Chart"**
8. 点击 "Create new chart"
9. 保存并添加到 Dashboard

### 3️⃣ 访问 AI Button Demo 页面

打开浏览器访问：
```
http://localhost:3002/ai-button-demo.html
```

### 4️⃣ 测试交互

1. 在左侧 Dashboard 中找到 AI Button Chart
2. 点击 **"Ask AI"** 按钮
3. 输入你的问题，例如：
   - "分析一下销售趋势"
   - "本月业绩如何？"
   - "推荐一些优化建议"
4. 右侧面板会实时显示：
   - 你的问题
   - AI 的模拟响应
   - 消息统计信息

## 📸 页面功能说明

### 左侧：Superset Dashboard
- 显示你创建的 Dashboard
- 包含 AI Button Chart 插件
- 点击按钮触发 AI 交互

### 右侧：AI 消息接收器
- **消息列表**: 实时显示所有问题和响应
- **统计信息**:
  - 总消息数
  - 用户问题数
  - 最后更新时间
- **清空按钮**: 清除所有消息历史

## 🔧 技术原理

### 消息流程

```
用户点击 "Ask AI"
    ↓
输入问题
    ↓
AI Button Chart (iframe)
    ↓
window.parent.postMessage({
    type: 'ai-question',
    payload: question
})
    ↓
父页面接收消息
    ↓
调用 AI 服务 (模拟/真实)
    ↓
显示响应
```

### 关键代码

**AI Button Chart (发送消息)**:
```javascript
window.parent.postMessage({
  type: 'ai-question',
  payload: question,
}, '*');
```

**Demo 页面 (接收消息)**:
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'ai-question') {
    handleAiQuestion(event.data.payload);
  }
});
```

## 🚀 集成真实 AI 服务

当前 Demo 使用模拟响应。要集成真实 AI：

### 方案 1: 前端直接调用

```javascript
async function handleAiQuestion(question) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: question }]
    })
  });

  const data = await response.json();
  const aiAnswer = data.choices[0].message.content;

  addMessage('system', 'AI 响应', aiAnswer);
}
```

### 方案 2: 通过后端 API

```javascript
async function handleAiQuestion(question) {
  const response = await fetch('http://localhost:3001/api/ai-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });

  const data = await response.json();
  addMessage('system', 'AI 响应', data.answer);
}
```

## 📝 自定义配置

### 修改 Dashboard UUID

编辑 `ai-button-demo.html`，找到这些配置：

```javascript
embedDashboard({
  id: '51c5173a-ae1d-4038-b417-22a72c15bb48',  // Embedded UUID
  // ...
  fetchGuestToken: async () => {
    // ...
    body: JSON.stringify({
      dashboardId: '6d106529-9f27-4df9-9c9e-50e036a67559',  // Dashboard UUID
      username: 'ai_demo_user'
    })
  }
})
```

### 修改 AI 响应逻辑

在 `generateAiResponse()` 函数中自定义响应：

```javascript
function generateAiResponse(question) {
  // 这里添加你的 AI 逻辑
  return `针对 "${question}" 的智能分析...`;
}
```

## 🎨 界面自定义

### 修改颜色主题

在 `<style>` 中修改：

```css
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### 调整布局比例

修改网格布局：

```css
.layout {
  grid-template-columns: 2fr 1fr;  /* 左:右 = 2:1 */
}
```

## 🐛 常见问题

### Q1: 点击按钮没反应？
- 确保 Dashboard 中已添加 AI Button Chart
- 检查浏览器控制台是否有错误
- 确认 Superset 容器已重启并加载新资源

### Q2: 右侧面板没有显示消息？
- 打开浏览器开发者工具 (F12)
- 查看 Console 是否收到消息
- 检查 `window.addEventListener('message')` 是否正常工作

### Q3: 如何获取 Dashboard 数据？
在实际应用中，你可以：
1. 通过 Superset API 获取 Dashboard 数据
2. 将数据传递给 AI 服务进行分析
3. 基于数据内容生成智能回答

## 📚 相关文档

- [FRONTEND-PAGES-GUIDE.md](./FRONTEND-PAGES-GUIDE.md) - 所有页面使用指南
- [README.md](./README.md) - 项目总览
- [QUICK-START.md](./QUICK-START.md) - 快速启动指南

## 🎉 完成！

现在你已经了解如何使用 AI Button 功能了！

如果有问题或需要帮助，请查看相关文档或提交 Issue。
