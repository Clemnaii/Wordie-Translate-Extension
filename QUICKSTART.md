# 快速启动指南

## 第一步：安装依赖

```bash
npm install
```

## 第二步：开发模式运行

```bash
npm run dev
```

这将启动 Vite 开发服务器，并自动构建 Chrome 扩展。

## 第三步：在 Chrome 中加载扩展

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录（构建后会自动生成）

## 第四步：测试功能

1. 打开任意网页（例如：https://www.wikipedia.org）
2. 选中页面上的任意英文文本
3. 打开浏览器开发者工具（F12）
4. 查看控制台（Console）标签页
5. 你应该能看到类似以下的输出：

```
✅ Logic Lens Content Script loaded
🎯 Logic Lens - 选中文本: example
📍 光标位置: { x: 123, y: 456, width: 50, height: 20 }
📄 上下文: ...
```

## 当前功能

✅ **已完成**：
- 项目结构初始化（Vite + React + Tailwind + CRXJS）
- Manifest.json 配置
- Content Script 注入
- 文本选择监听
- 选中文本获取和位置信息打印

🚧 **待开发**：
- 悬浮图标显示
- AI API 集成
- 逻辑解释弹窗

## 注意事项

- 如果看到 TypeScript 错误关于 `@types/chrome`，运行 `npm install` 后会自动解决
- 图标文件需要手动添加到 `icons/` 目录，或暂时移除 manifest.json 中的 icons 配置
- 每次修改代码后，需要重新加载扩展（在 `chrome://extensions/` 页面点击刷新按钮）

