# Wordie 翻译扩展 - 项目架构与功能总结

本文档旨在总结 Wordie 翻译扩展的技术架构、代码结构以及目前已实现的功能，方便开发者快速理解和维护项目。

## 1. 技术栈

*   **核心框架**: React 18 + TypeScript
*   **构建工具**: Vite
*   **样式方案**: TailwindCSS + CSS Modules
*   **扩展标准**: Chrome Extension Manifest V3
*   **状态管理**: 自定义单例状态管理 (Singleton Pattern) + React Hooks
*   **AI 服务**: 封装的 AI 接口调用层 (目前适配 OpenAI 格式接口)

## 2. 目录结构

```
src/
├── background.ts       # Service Worker，负责后台任务和扩展生命周期管理
├── manifest.json       # 扩展配置文件 (V3)
├── content/            # Content Script：注入网页的核心逻辑
│   ├── index.tsx       # 入口文件：负责事件监听、React Root 初始化
│   ├── App.tsx         # 主组件：协调 Indicator 和 Popup 的显示
│   ├── index.css       # 全局样式：Tailwind 指令和自定义动画
│   ├── state.ts        # 状态管理：单例模式，管理选中内容和 UI 状态
│   └── components/     # UI 组件
│       ├── Indicator.tsx # 悬浮小圆点组件
│       └── Popup.tsx     # 翻译结果弹窗组件（含核心业务逻辑）
├── popup/              # Action Popup：点击浏览器插件图标显示的页面
│   ├── index.html      # Popup 页面 HTML 模板
│   ├── index.tsx       # Popup 页面 React 逻辑（功能开关）
│   └── index.css       # Popup 页面样式
├── services/           # 服务层
│   └── ai.ts           # AI Service：封装 Prompt 生成、API 请求和响应解析
├── utils/              # 工具库
│   ├── dom.ts          # DOM 操作：计算选区位置、坐标转换
│   ├── storage.ts      # 存储封装：Chrome Storage API 的 Promise 封装
│   └── text.ts         # 文本处理：输入类型检测、TTS 发音
├── types/              # 类型定义
│   └── index.ts        # 全局共用类型
└── config/             # 配置文件
    └── api.ts          # API 相关配置
```

## 3. 核心架构设计

### 3.1 状态管理 (Observer Pattern)
项目在 `src/content/state.ts` 中实现了一个轻量级的单例状态管理器 `ContentState`。
*   **职责**: 维护当前的 `SelectionInfo`（文本、位置、上下文）、`isPopupVisible`、`isIndicatorVisible` 等状态。
*   **机制**: `App.tsx` 订阅该状态的变化，实现数据驱动视图。这避免了 Content Script 中复杂的 DOM 操作耦合。

### 3.2 业务流程
1.  **用户交互**: 用户在网页选中文本 -> `content/index.tsx` 捕获 `mouseup`/`keyup` 事件。
2.  **状态更新**: 计算选区坐标 -> 更新 `ContentState` -> 显示 `Indicator`（小圆点）。
3.  **触发翻译**: 用户**悬停**在小圆点上 -> `Indicator` 触发 `showPopup` -> 隐藏圆点，显示 `Popup`。
4.  **AI 分析**: `Popup` 组件挂载 -> 调用 `aiService.analyzeText` -> 异步获取结果并渲染。

### 3.3 性能优化
*   **拖拽优化**: `Popup` 的拖拽逻辑使用了 `useRef` 和直接 DOM 操作 (`element.style.left/top`)，完全绕过 React 的 Render Cycle，确保 60fps 的流畅拖拽体验。
*   **按需渲染**: 通过 `inputType` 检测（单词 vs 句子），条件渲染不同的 UI 布局，减少无效 DOM 节点。

## 4. 目前已实现功能

### 4.1 划词交互
*   **智能识别**: 自动过滤输入框内的选中，支持 Shift+箭头键选词。
*   **悬停触发**: 选中文本后显示悬浮小圆点，鼠标悬停即可触发翻译，无需点击。
*   **功能开关**: 在插件弹出页提供全局开关，可随时开启/关闭划词功能（状态持久化）。

### 4.2 深度 AI 解析
*   **单词/短语模式**:
    *   **自动纠错**: 智能补全不完整的单词。
    *   **音标与发音**: 显示 IPA 音标，支持 TTS 发音朗读。
    *   **语境释义**: 结合上下文给出当前语境下的具体含义。
    *   **核心逻辑**: 提供单词的英文核心定义（Core Logic）及其中文解释，帮助深度记忆。
*   **句子模式**:
    *   **极简模式**: 自动隐藏原文、音标等冗余信息。
    *   **中文直译**: 直接展示句子的中文翻译结果。

### 4.3 现代化 UI
*   **视觉风格**: 采用极简白底设计，配合阴影和磨砂效果，呈现高级感。
*   **交互细节**:
    *   小圆点带有呼吸脉冲动画。
    *   弹窗支持自由拖拽。
    *   错误状态友好提示。

## 5. 待开发/扩展建议
*   **PDF 阅读支持**: 适配 PDF Viewer 的 DOM 结构。
*   **生词本**: 集成后端或本地存储，保存查询记录。
*   **多语言支持**: 目前专注于英译中，可扩展配置目标语言。
