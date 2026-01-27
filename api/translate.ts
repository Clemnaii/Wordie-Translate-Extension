// Vercel Serverless Function - Proxy for AI APIs
// 此文件运行在 Vercel 服务器端 (Node.js Runtime)

import { GoogleGenerativeAI } from '@google/generative-ai';

// export const config = {
//   runtime: 'edge', // 移除 Edge Runtime 声明，回退到标准 Node.js Serverless Function 以避免本地模拟器的冷启动延迟
// };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Expose-Headers': 'X-Time-Server-Start', // 仅保留关键 Header
  'Access-Control-Max-Age': '86400',
};

export default async function handler(request: any, response: any) {
  const t_serverStart = Date.now();
  
  // 1. 设置 CORS Headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    if (request.method === 'GET') {
      return response.status(200).json({ status: 'ok', message: 'Service is ready' });
    }
    return response.status(405).send('Method Not Allowed');
  }

  // 2. 初始化 SSE Headers
  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Time-Server-Start', t_serverStart.toString());

  // 3. 解析请求
  const { 
    ALIBABA_API_KEY, 
    OPENAI_API_KEY,
    DEEPSEEK_API_KEY,
    GEMINI_API_KEY,
    DEFAULT_PROVIDER,
    DEFAULT_MODEL
  } = process.env;

  const body = request.body || {};
  const { text, context, apiType } = body;

  if (!text) {
    response.write(`event: error\ndata: Missing text\n\n`);
    return response.end();
  }

  const truncatedContext = context ? context.substring(0, 500) : '';
  const prompt = generatePrompt(text, truncatedContext);
  
  // 逻辑：
  // 1. 如果 apiType (provider) 明确指定且不是 'proxy'，尝试使用该 provider
  // 2. 否则使用环境变量中的 DEFAULT_PROVIDER
  // 3. 最后回退到 'alibaba'
  const type = (apiType && apiType !== 'proxy') ? apiType : (DEFAULT_PROVIDER || 'alibaba');
  const targetModel = DEFAULT_MODEL; // 可选：如果请求体也传了 model 也可以优先使用，但目前为了安全/简化，主要依赖 env

  console.log(`[${new Date().toISOString()}] 🤖 Streaming via ${type} (Model: ${targetModel || 'default'})`);

  try {
    let streamGenerator: AsyncGenerator<string>;

    switch (type) {
      case 'openai':
        streamGenerator = streamOpenAICompatible(prompt, OPENAI_API_KEY, 'https://api.openai.com/v1/chat/completions', targetModel || 'gpt-4o-mini');
        break;
      case 'deepseek':
        streamGenerator = streamOpenAICompatible(prompt, DEEPSEEK_API_KEY, 'https://api.deepseek.com/chat/completions', targetModel || 'deepseek-chat');
        break;
      case 'gemini':
         streamGenerator = streamGemini(prompt, GEMINI_API_KEY, targetModel || 'gemini-1.5-flash');
         break;
      case 'alibaba':
      default: // 默认回退到 Alibaba
        streamGenerator = streamOpenAICompatible(prompt, ALIBABA_API_KEY, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', targetModel || 'qwen-turbo');
        break;
    }

    // 4. 执行流式传输
    for await (const chunk of streamGenerator) {
      // 移除可能破坏 JSON 结构的换行符（可选，视情况而定）
      // 这里直接透传原始字符流
      const safeChunk = chunk.replace(/\n/g, '\\n').replace(/\r/g, ''); 
      // 注意：为了让前端能正确解析 JSON，我们其实应该尽量透传原始文本。
      // SSE 协议要求 data: 后面的内容如果是多行，每一行都要加 data: 。
      // 简单起见，我们假设 chunk 是片段，可以包含换行。
      // 为了安全传输，我们使用 JSON.stringify 包裹 content
      response.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    response.write('data: [DONE]\n\n');
    response.end();

  } catch (error: any) {
    console.error('Stream Error:', error);
    response.write(`event: error\ndata: ${JSON.stringify(error.message)}\n\n`);
    response.end();
  }
}

// --- Streaming Providers ---

async function* streamGemini(prompt: string, apiKey?: string, modelName: string = "gemini-1.5-flash"): AsyncGenerator<string> {
  if (!apiKey) throw new Error('Gemini API Key missing');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContentStream(prompt);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

async function* streamOpenAICompatible(prompt: string, apiKey: string | undefined, url: string, model: string): AsyncGenerator<string> {
  if (!apiKey) throw new Error(`${model} API Key missing`);

  const response = await fetch(url.replace('localhost', '127.0.0.1'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      stream: true // 开启流式
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error ${response.status}: ${err}`);
  }

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // 保留最后一个可能不完整的行

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }
}

// --- Prompt Logic (Unchanged) ---
function generatePrompt(text: string, context: string = ''): string {
  return `你是一个精通英语语义学和认知语言学的专家。你的任务是分析用户输入的文本（词语、短语或句子），并按以下逻辑返回 JSON 格式的数据。

Processing Logic:

判定类型：判断输入是"词语/短语"还是"完整句子"。

通用要求：
- 分析用户选中的文本在上下文中的具体意思，考虑语境、修辞等因素

如果是词语/短语：
- correctedText: 【重要】分析用户选中的文本"${text}"，如果它是不完整的单词（如"messag"应为"message"）或有拼写错误，请提供完整的正确单词；如果已经是正确的完整单词，则与输入保持一致
- phonetic: 提供该单词的标准音标（如 /ˈæpəl/），使用国际音标IPA格式
- contextMeaning: 基于上下文"${context}"，分析该词在此处的具体意思，用"[文中意思] 词性.具体含义"的格式描述
- translation: 分词性输出主要中文意思（例如：n. 苹果; adj. 苹果似的）
- coreLogic: 引用权威英语词典Oxford中关于该词最本源、最核心的英文定义，然后换行两次，再输出该定义的中文翻译（注意：coreLogic 不包含词性信息）

如果是完整句子：
- correctedText: 【重要】如果句子有语法错误或不完整，请提供修正后的完整句子；如果已经是正确的完整句子，则与输入保持一致
- phonetic: 设为 null 或空字符串
- contextMeaning: 设为 null 或空字符串（句子本身就是上下文）
- translation: 直接提供整句的中文直译
- coreLogic: 设为 null

请分析文本："${text}"

${context ? `上下文：${context}` : ''}

请用 JSON 格式返回（确保是有效的 JSON）：
{
  "correctedText": "修正后的完整正确文本",
  "phonetic": "/ˈæpəl/",
  "contextMeaning": "[文中意思] n.苹果（此处指水果）",
  "translation": "中文翻译（词语需包含词性）",
  "coreLogic": "英文定义\n\n中文解释"
}
或
{
  "correctedText": "修正后的完整正确句子",
  "phonetic": null,
  "contextMeaning": null,
  "translation": "中文翻译",
  "coreLogic": null
}`;
}
