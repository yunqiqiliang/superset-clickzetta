# 🔍 AI Button 消息问题 - 完整诊断方案

## 问题现状
AI 消息接收器收不到消息

## 诊断步骤

### 第一步：验证 AI Button Chart 是否真的在 Dashboard 中

**操作**：
1. 访问 http://localhost:8088
2. 打开你的 Dashboard
3. 检查是否有 "AI Button Chart"
4. 如果没有，需要先添加这个图表

**添加步骤**：
1. 进入 Dashboard 编辑模式
2. 点击 ➕ 添加图表
3. 选择任意数据源
4. 在可视化类型中找到 "AI Button Chart"
5. 保存并添加到 Dashboard

### 第二步：使用调试页面测试

**测试页面 1: 消息调试器**
```
http://localhost:3002/message-debug.html
```
- 这个页面只监听消息，不嵌入 Dashboard
- 在浏览器打开两个标签页：
  - 标签页 1: message-debug.html
  - 标签页 2: 打开 Superset Dashboard 并点击 AI Button
  - 查看标签页 1 是否收到消息

**测试页面 2: 直接测试**
```
http://localhost:3002/direct-test.html
```
- 直接在 iframe 中加载 Dashboard
- 点击 AI Button
- 查看下方日志

### 第三步：在 Superset 中直接测试

**不使用 embedded demo，直接在 Superset 测试**：

1. 打开 http://localhost:8088/superset/dashboard/YOUR_DASHBOARD_ID/

2. 打开浏览器开发者工具 (F12)

3. 在 Console 中运行：
```javascript
// 监听消息
window.addEventListener('message', (e) => {
    console.log('收到消息:', e);
    if (e.data.type === 'ai-question') {
        console.log('✅ AI 问题:', e.data.payload);
    }
});
```

4. 点击 Dashboard 中的 "Ask AI" 按钮

5. 查看 Console 输出

### 第四步：检查 AI Button 代码是否正确部署

**验证方法 1 - 检查源代码**：

1. 在 Dashboard 中右键点击 AI Button Chart
2. 选择"检查"或"Inspect"
3. 在 Elements 标签找到按钮元素
4. 右键选择 "Edit as HTML"
5. 查找 `onClick` 或 `onclick` 属性

**验证方法 2 - 检查 Network**：

1. 打开开发者工具 Network 标签
2. 刷新 Dashboard
3. 搜索包含 "AiButton" 或 "ai-button" 的 JS 文件
4. 检查文件内容是否包含我们的代码

**验证方法 3 - 手动触发**：

在 Console 中运行：
```javascript
// 模拟点击 AI Button
document.querySelector('button').onclick = function() {
    console.log('Button clicked manually');
    window.top.postMessage({
        type: 'ai-question',
        payload: 'Manual test message'
    }, '*');
};
```

### 第五步：检查构建和部署

**确认文件是否最新**：

```bash
# 检查本地构建时间
ls -lt /Users/liangmo/Documents/GitHub/superset/superset/static/assets/*.js | head -5

# 检查容器内文件时间
docker exec superset_app sh -c "ls -lt /app/superset/static/assets/*.js | head -5"

# 时间应该一致
```

**重新部署**：

```bash
# 1. 清理缓存
cd /Users/liangmo/Documents/GitHub/superset/superset-frontend
rm -rf node_modules/.cache

# 2. 重新构建
npm run build

# 3. 确认构建包含 AI Button
grep -r "ai-question" superset/static/assets/*.js

# 4. 复制到容器
docker cp /Users/liangmo/Documents/GitHub/superset/superset/static/assets/. superset_app:/app/superset/static/assets/

# 5. 重启容器
docker restart superset_app

# 6. 等待启动
sleep 30
docker ps --filter name=superset_app
```

### 第六步：排查 iframe 安全策略

**检查是否被 CSP 阻止**：

1. 打开开发者工具 Console
2. 查找类似这样的错误：
```
Refused to frame 'http://localhost:8088' because it violates the following
Content Security Policy directive: "frame-ancestors 'none'"
```

3. 如果有此错误，需要修改 Superset 配置

**检查 X-Frame-Options**：

在 Console 运行：
```javascript
fetch('http://localhost:8088')
  .then(r => r.headers.get('X-Frame-Options'))
  .then(console.log);
```

### 第七步：简化测试 - 最小可复现案例

**创建最简单的测试**：

```html
<!DOCTYPE html>
<html>
<body>
<script>
window.addEventListener('message', e => {
    alert('Got: ' + JSON.stringify(e.data));
});
</script>
<iframe src="http://localhost:8088/superset/dashboard/YOUR_ID/" width="800" height="600"></iframe>
</body>
</html>
```

保存为 `simple-test.html`，用浏览器打开，点击 AI Button。

## 常见问题和解决方案

### 问题 1: Dashboard 中根本没有 AI Button Chart
**解决**: 在 Dashboard 编辑模式中添加

### 问题 2: 有 AI Button 但点击没反应
**检查**:
- Console 是否有 JS 错误
- 按钮的 onClick 事件是否绑定

### 问题 3: Console 显示"Cannot read property 'postMessage' of null"
**原因**: `window.top` 可能为 null
**解决**: 检查 iframe 的 sandbox 属性

### 问题 4: 跨域问题
**错误**: "Blocked a frame from accessing a cross-origin frame"
**这是正常的**，postMessage 应该可以工作

### 问题 5: 消息发送了但 Demo 页面没收到
**可能原因**:
1. Demo 页面的监听器没启动
2. 消息被其他监听器捕获了
3. iframe 嵌套层级问题

## 终极测试方案

如果以上都不行，使用这个方法：

**在 AI Button Chart 中添加明显的视觉反馈**：

修改 `AiButtonChart.tsx`:
```typescript
const handleButtonClick = () => {
    // 1. 弹窗确认点击生效
    alert('AI Button Clicked!');

    const question = prompt('请输入您的问题：');
    if (question) {
        // 2. 显示正在发送
        console.log('[AI Button] Sending:', question);

        // 3. 尝试所有方式
        try {
            window.postMessage({ type: 'ai-question', payload: question }, '*');
            console.log('[AI Button] ✅ Sent to window');
        } catch(e) {
            console.error('[AI Button] ❌ window failed:', e);
        }

        try {
            window.parent.postMessage({ type: 'ai-question', payload: question }, '*');
            console.log('[AI Button] ✅ Sent to parent');
        } catch(e) {
            console.error('[AI Button] ❌ parent failed:', e);
        }

        try {
            window.top.postMessage({ type: 'ai-question', payload: question }, '*');
            console.log('[AI Button] ✅ Sent to top');
        } catch(e) {
            console.error('[AI Button] ❌ top failed:', e);
        }

        // 4. 确认完成
        alert('Message sent! Check console.');
    }
};
```

## 下一步操作

请按顺序执行：

1. ✅ 确认 AI Button Chart 在 Dashboard 中
2. ✅ 使用 direct-test.html 测试
3. ✅ 查看浏览器 Console
4. ✅ 检查 Network 标签
5. ✅ 如需要，重新构建和部署

**报告问题时请提供**：
- Console 的完整日志截图
- Network 标签截图
- Dashboard 的截图（显示 AI Button Chart）
- 具体的操作步骤

我们会根据这些信息进一步调试！
