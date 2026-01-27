# Wordie - Your English Learning Companion

Wordie 是一款基于 AI 的深度英语学习与翻译扩展。它不仅仅是简单的翻译工具，更致力于通过解析单词的“底层逻辑”和“上下文含义”，帮助用户真正掌握英语。

## ✨ 主要特性

*   **🖱️ 极简交互**: 选中网页文本 -> 出现小圆点 -> **鼠标悬停**即可查看解析。
*   **⚡ 流式极速响应**: 采用 Server-Sent Events (SSE) 技术，实现“打字机”式的逐字输出，告别漫长的加载等待，首字响应毫秒级触达。
*   **🧠 深度解析 (单词模式)**:
    *   **语境释义**: 拒绝死板的词典定义，AI 会根据上下文告诉你该词在当前语境下的确切意思。
    *   **核心逻辑**: 揭示单词最本源的英文定义，助你理解词源。
    *   **听力辅助**: 标准 IPA 音标 + 真人级 TTS 发音。
*   **📝 句子翻译 (句子模式)**:
    *   智能识别句子，自动切换为简洁模式。
    *   直接展示流畅的中文直译，无干扰。
*   **⚙️ 随心控制**: 
    *   **黑盒模式**: 默认使用开发者提供的 AI 服务（基于 Alibaba Qwen），无需配置，开箱即用。
    *   **自定义 Key**: 支持用户填写自己的 Gemini、OpenAI、DeepSeek 或 Alibaba API Key，插件将绕过代理直接从浏览器请求 AI 服务。
*   **🎨 现代设计**: 极简风格，丝滑的拖拽体验，完美融入现代网页。

## 🚀 部署与使用指南

本项目提供两种使用模式，请根据您的需求选择：

### 方案 A：纯前端模式 (简单，推荐个人使用)
**特点**：无需部署服务器，直接在插件设置中填入您的 API Key 即可使用。
**适用人群**：个人开发者、有 API Key 的用户。

1.  **下载/克隆代码**:
    ```bash
    git clone <repository-url>
    cd Wordie-Translate-Extension
    ```
2.  **安装依赖与构建**:
    ```bash
    npm install
    npm run build
    ```
3.  **加载插件**:
    - 打开 Chrome 浏览器，访问 `chrome://extensions/`。
    - 开启右上角的 **"开发者模式" (Developer mode)**。
    - 点击 **"加载已解压的扩展程序" (Load unpacked)**。
    - 选择项目目录下的 `dist` 文件夹。
4.  **配置 Key**:
    - 确保插件已启用，点击浏览器插件栏的 Wordie 图标打开设置页。
    - 勾选 **"自定义 API Key"**。
    - 选择您的 AI 服务商（如 Gemini, OpenAI, DeepSeek, Alibaba）。
    - 选择您想使用的具体模型（如 GPT-4o, Claude 3.5, Gemini Pro 等）。
    - 填入您的 API Key。
    - 🎉 **开始使用！** 在任意网页选词即可体验。

### 方案 B：全栈模式 (较为复杂，需搭建后端)
**特点**：需额外部署一个后端代理服务，适合希望“免 Key”分发给他人使用的场景。
**适用人群**：团队内部使用、为朋友提供服务、或保护 Key 不泄露。

#### 1. 部署后端 (Vercel)
1.  **Fork 本仓库**: 将代码 Fork 到您的 GitHub 账户。
2.  **导入 Vercel**: 在 Vercel Dashboard 中创建一个新项目，导入您 Fork 的仓库。
3.  **配置环境变量** (在 Vercel 的 Project Settings -> Environment Variables 中):
    您需要配置以下环境变量来决定后端代理使用哪个模型。
    > **提示**: 您可以参考项目根目录下的 `.env.backend.example` 文件。

    *   **必需 (至少选一个)**:
        *   `OPENAI_API_KEY`: OpenAI API Key
        *   `GEMINI_API_KEY`: Google Gemini API Key
        *   `DEEPSEEK_API_KEY`: DeepSeek API Key
        *   `ALIBABA_API_KEY`: Alibaba Qwen API Key
    *   **可选 (控制默认行为)**:
        *   `DEFAULT_PROVIDER`: 默认使用的服务商 (可选值: `openai`, `gemini`, `deepseek`, `alibaba`。默认为 `alibaba`)
        *   `DEFAULT_MODEL`: 默认使用的模型名称 (例如 `gpt-4o`, `gemini-1.5-pro`。默认为该服务商的推荐模型)
4.  **获得后端地址**: 部署成功后，Vercel 会提供一个域名（例如 `https://your-project.vercel.app`）。您的 API 地址将是 `https://your-project.vercel.app/api/translate`。

#### 2. 配置并构建前端
1.  **本地配置**:
    在项目根目录下，复制 `.env.frontend.example` 为 `.env`。
    ```bash
    cp .env.frontend.example .env
    ```
    编辑 `.env` 文件，填入刚才获得的后端地址：
    ```env
    VITE_API_PROXY_URL=https://your-project.vercel.app/api/translate
    ```
2.  **构建与加载**:
    ```bash
    npm run build
    ```
    按照方案 A 的步骤加载 `dist` 到 Chrome。
3.  **使用**:
    - 插件设置中**不要**勾选 "自定义 API Key"。
    - 插件会自动通过您的 Vercel 后端请求服务。

---

## 📖 如何使用 (通用)

1.  **开启插件**: 确保插件已启用（点击插件图标可以看到开关状态）。
2.  **划词**: 在任意网页上，用鼠标选中一段英文（单词、短语或句子）。
3.  **触发**: 选中文本末尾会出现一个黄色的**小圆点**。
4.  **查看**: 将鼠标**悬停**在小圆点上，翻译弹窗即会自动浮现。
5.  **互动**:
    *   点击 🔉 图标播放发音。
    *   按住弹窗顶部标题栏可自由拖拽位置。
    *   点击右上角 `×` 关闭弹窗。

## 📄 License
