# Logic Lens - 逻辑透镜

一个 Chrome 浏览器插件，通过揭示英文单词的底层逻辑来帮助用户真正理解单词的含义。

## 核心理念

打破"翻译固化"。传统的翻译软件只给出一个死板的中文对应词，但这让学习者失去了对单词底层逻辑的理解。

### 核心案例

**单词**: `across`

- **传统翻译**: 横跨、穿过
- **底层逻辑**: "From one side to the other of (a place/area)" —— 即从一边到另一边
- **价值体现**: 当用户理解了"从一边到另一边"这个空间逻辑，他们就能秒懂为什么 "get the message across" 是"传达成功"，为什么 "across the country" 是"遍及全国"。

## 技术栈

- **框架**: React + Vite + CRXJS
- **样式**: Tailwind CSS
- **AI**: Gemini API (或其他 LLM API)

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

构建完成后，在 Chrome 浏览器中：
1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目的 `dist` 目录

## 功能

- ✅ 文本选择监听
- ✅ 选中文本获取和位置信息
- 🚧 悬浮图标显示（开发中）
- 🚧 AI 逻辑解释（开发中）

