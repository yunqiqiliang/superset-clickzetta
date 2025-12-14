# 🔍 AI Button 调试指南

## 问题：收不到消息

### 已修复的问题

**原因**：双层 iframe 结构导致消息无法到达最外层页面

```
Demo 页面 (ai-button-demo.html)
  └─ iframe: Superset Dashboard (http://localhost:8088)
       └─ iframe/component: AI Button Chart
```

**解决方案**：
- 使用 `window.top.postMessage()` 发送到顶层窗口
- 同时保留 `window.parent.postMessage()` 向上一层发送

### 测试步骤

1. **清除浏览器缓存**
   ```
   Cmd + Shift + R (Mac)
   Ctrl + Shift + R (Windows)
   ```

2. **打开开发者工具**
   ```
   Cmd + Option + I (Mac)
   F12 (Windows)
   ```

3. **访问 Demo 页面**
   ```
   http://localhost:3002/ai-button-demo.html
   ```

4. **查看 Console**
   你应该看到：
   ```
   ✅ Dashboard embedded successfully!
   📨 Received message from: http://localhost:8088
   📨 Message data: {...}
   ```

5. **点击 "Ask AI" 按钮**

6. **输入问题并提交**

7. **检查 Console 输出**
   正常情况下应该看到：
   ```
   AI Button: Sending question: 你的问题
   AI Button: Message sent to top window
   📨 Received message from: http://localhost:8088
   📨 Message data: {type: 'ai-question', payload: '你的问题'}
   ✅ AI Question detected!
   🤖 AI Question received: 你的问题
   ```

### 常见问题排查

#### 问题 1: 完全收不到消息

**检查项**：
1. 是否已重启 Superset 容器？
   ```bash
   docker ps | grep superset_app
   # Status 应该显示 (healthy)
   ```

2. 是否清除了浏览器缓存？
   - 按 `Cmd+Shift+R` 强制刷新
   - 或使用无痕模式测试

3. 检查 Console 是否有 JavaScript 错误

**解决方法**：
```bash
# 1. 确认构建成功
cd /Users/liangmo/Documents/GitHub/superset/superset-frontend
npm run build

# 2. 复制到容器
docker cp /Users/liangmo/Documents/GitHub/superset/superset/static/assets/. superset_app:/app/superset/static/assets/

# 3. 重启容器
docker restart superset_app

# 4. 等待启动
sleep 30
docker ps --filter name=superset_app
```

#### 问题 2: 收到消息但类型不对

**检查 Console 输出**：
```javascript
📨 Message data: {...}
ℹ️ Other message type: some-other-type
```

**原因**：可能是其他组件发送的消息

**解决**：这是正常的，只要看到 `ai-question` 类型的消息即可

#### 问题 3: 跨域问题

**错误信息**：
```
Blocked a frame with origin "http://localhost:3002"
from accessing a cross-origin frame.
```

**说明**：这是正常的安全限制

**我们的方案**：
- 使用 `postMessage` API（允许跨域通信）
- 已在代码中实现

#### 问题 4: Dashboard 中没有 AI Button Chart

**解决步骤**：

1. 访问 Superset: http://localhost:8088
2. 编辑你的 Dashboard
3. 点击 ➕ 添加图表
4. 选择 "AI Button Chart"
5. 保存 Dashboard

### 调试技巧

#### 技巧 1: 在 Console 中测试 postMessage

```javascript
// 在 AI Button Chart 中运行（打开 Dashboard，右键检查 AI Button 元素）
window.top.postMessage({
  type: 'ai-question',
  payload: 'test message'
}, '*');
```

#### 技巧 2: 监听所有消息

在 Demo 页面的 Console 中运行：
```javascript
window.addEventListener('message', (e) => {
  console.log('All messages:', e);
}, true);
```

#### 技巧 3: 检查 iframe 结构

在 Console 中运行：
```javascript
console.log('Window hierarchy:');
console.log('Current:', window.location.href);
console.log('Parent:', window.parent.location.href);
console.log('Top:', window.top.location.href);
```

### 文件更新清单

修复后需要更新的文件：

1. ✅ **AiButtonChart.tsx** - 添加 `window.top.postMessage()`
2. ✅ **ai-button-demo.html** - 增强 Console 日志
3. ✅ 重新构建前端
4. ✅ 复制到 Docker 容器
5. ✅ 重启容器

### 验证成功的标志

1. **Superset 容器健康**
   ```bash
   docker ps | grep superset_app
   # 应该显示 (healthy)
   ```

2. **Console 有正确的日志**
   ```
   ✅ AI Question detected!
   🤖 AI Question received: ...
   ```

3. **右侧面板显示消息**
   - 紫色气泡：用户问题
   - 蓝色气泡：AI 响应
   - 统计数字更新

### 如果还是不行

1. **完全清除浏览器数据**
   - Chrome: 设置 → 隐私和安全 → 清除浏览数据
   - 选择"缓存的图片和文件"
   - 时间范围：全部时间

2. **检查网络请求**
   - 开发者工具 → Network 标签
   - 确认 Dashboard 已加载
   - 确认 AI Button 相关的 JS 文件已加载

3. **尝试简化测试**
   创建一个最简单的测试页面：

   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <h1>Message Test</h1>
     <script>
       window.addEventListener('message', (e) => {
         console.log('Got message:', e.data);
         alert('Got: ' + JSON.stringify(e.data));
       });
     </script>
   </body>
   </html>
   ```

### 获取帮助

如果以上方法都不行：

1. 提供完整的 Console 日志截图
2. 提供 Network 标签截图
3. 说明具体的错误信息
4. 确认操作步骤

## 成功案例

正常工作时的完整日志示例：

```
// 页面加载
Dashboard embedded successfully!
系统提示: Dashboard 加载完成！

// 点击按钮后
AI Button: Sending question: 测试问题
AI Button: Message sent to top window

// Demo 页面收到
📨 Received message from: http://localhost:8088
📨 Message data: {type: 'ai-question', payload: '测试问题'}
📨 Message type: object
✅ AI Question detected!
🤖 AI Question received: 测试问题

// 统计更新
总消息数: 2
用户问题: 1
最后更新: 15:30:45
```

祝调试顺利！🎉
