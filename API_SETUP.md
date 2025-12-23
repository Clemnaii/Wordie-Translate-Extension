# AI API 配置指南

## Gemini API 配置

根据 [Gemini API 官方文档](https://ai.google.dev/gemini-api/docs/api-key)，配置步骤如下：

### 1. 获取 API Key

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建新的 API Key
3. 复制 API Key

### 2. 配置 API Key

编辑 `src/config/api.ts` 文件：

```typescript
export const API_CONFIG = {
  GEMINI_API_KEY: 'YOUR_API_KEY_HERE', // 填入你的 API Key
  GEMINI_MODEL: 'gemini-pro', // 选择模型
  // ...
}
```

### 3. 选择模型

根据官方文档，可用的模型包括：

- **gemini-pro** - 稳定版本（推荐用于生产环境）
- **gemini-1.5-pro** - 最新版本，功能更强
- **gemini-2.5-flash** - 最新快速版本（如果可用）

在 `src/config/api.ts` 中修改 `GEMINI_MODEL` 来切换模型：

```typescript
GEMINI_MODEL: 'gemini-pro', // 改为你想要的模型
```

### 4. 安全注意事项

⚠️ **重要安全提示**（来自官方文档）：

1. **不要将 API Key 提交到 Git**
   - 将 `src/config/api.ts` 添加到 `.gitignore`
   - 或使用环境变量

2. **限制 API Key 权限**
   - 在 Google Cloud Console 中设置 API Key 限制
   - 限制 IP 地址、HTTP 引用来源等

3. **定期审核和轮替**
   - 定期检查 API Key 使用情况
   - 定期更换 API Key

4. **Chrome 扩展的特殊考虑**
   - Chrome 扩展中的代码会被打包，API Key 会暴露
   - 建议：使用服务器端代理 API 调用（更安全）
   - 或者：限制 API Key 的权限和使用量

### 5. 测试配置

配置完成后：

1. 重新构建项目：
   ```bash
   npm run dev
   ```

2. 刷新扩展

3. 测试：
   - 选中英文文本
   - 悬停图标查看弹窗
   - 应该能看到翻译和逻辑解释

### 6. 故障排查

如果遇到问题：

1. **404 错误**：检查模型名称是否正确
   - 尝试使用 `gemini-pro`（最稳定）
   - 检查 Google Cloud Console 中启用的 API

2. **403 错误**：检查 API Key 权限
   - 确保已启用 "Generative Language API"
   - 检查 API Key 的限制设置

3. **查看详细错误**：
   - 打开浏览器控制台（F12）
   - 查看 Network 标签页的请求详情
   - 查看 Console 标签页的错误信息

## 参考文档

- [Gemini API 官方文档](https://ai.google.dev/gemini-api/docs/api-key)
- [Google AI Studio](https://makersuite.google.com/app/apikey)
- [Google Cloud Console](https://console.cloud.google.com/)
