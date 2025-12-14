# AI Button Demo 测试页面总览

所有 demo 页面现在都已修复，可以正常接收来自 AI Button Chart 的消息。

## 📁 Demo 页面列表

### 1. 🎯 Simple iframe Test (推荐)
**文件**: `frontend/simple-iframe-test.html`
**URL**: http://localhost:3002/simple-iframe-test.html

**特点**:
- 最简单的实现
- 左右分屏布局
- 实时日志显示
- 统计面板显示消息数量
- 不依赖任何外部库

**适用场景**: 快速测试 AI Button 消息功能

---

### 2. 🤖 AI Button Demo (完整功能)
**文件**: `frontend/ai-button-demo.html`
**URL**: http://localhost:3002/ai-button-demo.html

**特点**:
- 精美的 UI 设计
- 左右分屏布局（Dashboard + AI 面板）
- 自动生成 AI 模拟响应
- 消息历史记录
- 统计信息面板
- 清空消息功能

**适用场景**: 展示完整的 AI 交互体验，可作为产品 demo

---

### 3. 🔬 Direct Test (调试专用)
**文件**: `frontend/direct-test.html`
**URL**: http://localhost:3002/direct-test.html

**特点**:
- 详细的日志面板
- 显示所有 postMessage 细节
- 包含重新加载和新窗口打开按钮
- 测试消息发送功能
- 控制台风格的日志显示

**适用场景**: 调试 postMessage 通信问题

---

### 4. 🧪 Super Simple Test (最小化测试)
**文件**: `frontend/super-simple-test.html`
**URL**: http://localhost:3002/super-simple-test.html

**特点**:
- 极简设计
- 只显示核心消息
- 黑客风格界面
- 最小依赖

**适用场景**: 最基础的消息接收验证

---

## 🚀 使用步骤

对于所有页面，使用步骤都相同：

1. **启动服务**
   ```bash
   # 确保 Superset 正在运行
   docker ps | grep superset_app

   # 确保前端服务器正在运行
   cd superset-embedded-demo/frontend
   python3 -m http.server 3002
   ```

2. **登录 Superset**
   - 访问 http://localhost:8088
   - 使用你的凭据登录

3. **打开测试页面**
   - 选择上面任意一个页面
   - 等待 Dashboard iframe 加载完成

4. **测试 AI Button**
   - 在 Dashboard 中找到 "AI Button Chart"
   - 点击 "Ask AI" 按钮
   - 输入测试问题（例如："分析销售趋势"）
   - 查看右侧面板或日志区域的消息

## 🔧 技术实现要点

### 关键修复
所有页面都进行了以下修复：

1. **移除 sandbox 属性**
   ```html
   <!-- 之前 -->
   <iframe sandbox="allow-same-origin allow-scripts ..."></iframe>

   <!-- 修复后 -->
   <iframe src="..."></iframe>
   ```

2. **使用捕获阶段监听**
   ```javascript
   window.addEventListener('message', handler, true);  // true = 捕获阶段
   ```

3. **简化 iframe 加载**
   - 不使用复杂的 Embedded SDK
   - 直接使用 iframe 加载 Dashboard
   - URL 添加 `?standalone=3` 参数

### 消息格式

AI Button 发送的消息格式：
```javascript
{
  type: 'ai-question',
  payload: '用户输入的问题'
}
```

### 接收消息代码示例

```javascript
window.addEventListener('message', (event) => {
    console.log('收到消息:', event.data);

    if (event.data?.type === 'ai-question') {
        const question = event.data.payload;
        console.log('AI 问题:', question);

        // 在这里处理问题
        // 例如: 调用 AI API, 更新 UI 等
    }
}, true);
```

## 🐛 常见问题

### Dashboard 无法加载
**解决方案**:
- 确保已登录 Superset
- 检查 Dashboard UUID 是否正确
- 在新窗口打开 Dashboard 测试

### 收不到消息
**解决方案**:
- 打开浏览器 Console (F12) 检查错误
- 确认 AI Button Chart 已添加到 Dashboard
- 检查按钮点击是否正常（应该会弹出 prompt）

### 跨域 Cookie 警告
**说明**: 这是正常的浏览器安全警告，不影响功能
**原因**: 开发环境使用 HTTP 而非 HTTPS

## 📊 页面对比

| 特性 | Simple iframe | AI Button Demo | Direct Test | Super Simple |
|------|--------------|----------------|-------------|--------------|
| UI 美观度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 调试信息 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 易用性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 功能完整 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 代码复杂度 | 低 | 中 | 中 | 极低 |

## 🎯 推荐使用场景

- **快速测试**: Simple iframe Test
- **产品演示**: AI Button Demo
- **问题调试**: Direct Test
- **概念验证**: Super Simple Test

## 📝 下一步

现在消息接收已经完全工作，你可以：

1. **集成真实 AI 服务**
   - OpenAI API
   - Anthropic Claude API
   - 自定义 AI 模型

2. **改进 UI/UX**
   - 添加加载动画
   - 显示 AI 思考状态
   - 美化消息展示

3. **增强功能**
   - 消息历史持久化
   - 支持上下文对话
   - 数据可视化建议

4. **生产部署**
   - 配置 HTTPS
   - 设置正确的 CORS
   - 安全验证

## 🔗 相关文档

- [AI-BUTTON-GUIDE.md](AI-BUTTON-GUIDE.md) - 完整使用指南
- [AI-BUTTON-DEBUG.md](AI-BUTTON-DEBUG.md) - 调试指南
- [DIAGNOSIS.md](DIAGNOSIS.md) - 诊断方案
