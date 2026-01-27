# Wordie 翻译扩展 - 项目架构与功能总结

本文档旨在总结 Wordie 翻译扩展的技术架构、代码结构以及目前已实现的功能，方便开发者快速理解和维护项目。

## 1. 技术栈

*   **核心框架**: React 18 + TypeScript
*   **构建工具**: Vite
*   **样式方案**: TailwindCSS + CSS Modules
*   **扩展标准**: Chrome Extension Manifest V3
*   **状态管理**: 自定义单例状态管理 (Singleton Pattern) + React Hooks
*   **通信协议**: Server-Sent Events (SSE) 实现流式传输
*   **AI 服务**: 
    *   **Proxy 模式**: Vercel Serverless Function (Node.js) + Alibaba Qwen
    *   **Direct 模式**: 浏览器端直接调用 (Gemini, OpenAI, DeepSeek, Alibaba)

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
├── popup/              # Action Popup：插件设置页面
│   ├── index.html      # HTML 模板
│   ├── index.tsx       # 设置页逻辑（功能开关、Key 配置）
│   └── index.css       # 样式
├── services/           # 服务层
│   └── ai.ts           # AI Service：核心业务层，包含双引擎路由、流式解析
├── utils/              # 工具库
│   ├── dom.ts          # DOM 操作：计算选区位置、坐标转换
│   ├── storage.ts      # 存储封装：Chrome Storage API 封装
│   └── text.ts         # 文本处理：输入类型检测、TTS 发音
├── types/              # 类型定义
│   └── index.ts        # 全局共用类型
└── config/             # 配置文件
    └── api.ts          # API 相关配置

api/
└── translate.ts        # Vercel Serverless Function (后端代理)
```

## 3. 核心架构设计

### 3.1 双引擎 AI 路由架构 (Dual-Engine Routing)
系统采用“默认代理 + 可选直连”的混合架构，兼顾开箱即用和灵活性：

1.  **Default (Proxy Mode)**:
    *   **场景**: 用户未配置 Key，使用默认“黑盒”服务。
    *   **流程**: `Frontend` -> `Vercel Function` -> `Alibaba Qwen API`。
    *   **优势**: 无需配置，开发者可控 Prompts 和模型参数。

2.  **Custom (Direct Mode)**:
    *   **场景**: 用户在设置页填入了自己的 API Key。
    *   **流程**: `Frontend` -> `AI Provider API` (Gemini/OpenAI/DeepSeek/Alibaba)。
    *   **优势**: 保护用户隐私（Key 不经过代理），用户掌控额度，支持更多模型。

### 3.2 流式响应与解析 (Streaming & Parsing)
为了解决“大段翻译等待时间过长”的问题，全链路实现了流式传输：

1.  **后端流式**: Vercel Function 使用 `text/event-stream` 响应头，将 AI 的 Chunk 实时转发给前端。
2.  **前端解析**: `services/ai.ts` 中的 `parsePartialResponse` 实现了**增量 JSON 解析**。
    *   AI 被 Prompt 要求返回 JSON 格式。
    *   在流式传输过程中，JSON 并不完整。
    *   前端使用正则表达式从不完整的字符串中提取已生成的字段 (`translation`, `coreLogic` 等)，实时更新 UI。

### 3.3 状态管理 (Observer Pattern)
项目在 `src/content/state.ts` 中实现了一个轻量级的单例状态管理器 `ContentState`。
*   **职责**: 维护当前的 `SelectionInfo`（文本、位置、上下文）、`isPopupVisible`、`isIndicatorVisible` 等状态。
*   **机制**: `App.tsx` 订阅该状态的变化，实现数据驱动视图。这避免了 Content Script 中复杂的 DOM 操作耦合。

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
*   **交互细节**: 小圆点带有呼吸脉冲动画，弹窗支持自由拖拽。
