// Vercel Serverless Function - Proxy for AI APIs
// 此文件运行在 Vercel 服务器端 (Node.js Runtime)

// export const config = {
//   runtime: 'edge', // 移除 Edge Runtime 声明，回退到标准 Node.js Serverless Function 以避免本地模拟器的冷启动延迟
// };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // 在生产环境建议修改为特定的 Extension ID 或域名
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type', // 移除不必要的 Header，只保留最基本的 Content-Type
  'Access-Control-Expose-Headers': 'X-Time-Server-Start, X-Time-Json-Parsed, X-Time-Dispatch-End, X-Time-AI-Start, X-Time-AI-End, X-Time-Server-End',
  'Access-Control-Max-Age': '86400', // 缓存预检请求结果 24 小时
};

// 使用 Node.js Runtime 的签名 (req, res)
export default async function handler(request: any, response: any) {
  const t1_serverStart = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 Server received request`);

  // 1. 设置 CORS Headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  // 2. 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  // 3. 环境变量加载优化
  const { 
    GEMINI_API_KEY, 
    OPENAI_API_KEY, 
    DEEPSEEK_API_KEY, 
    ALIBABA_API_KEY, 
    DEFAULT_API_TYPE 
  } = process.env;

  try {
    // 4. 处理请求体 (Node.js Runtime 中 request.body 已由 Vercel 自动解析)
    const body = request.body; 
    const t_jsonParsed = Date.now(); // 记录 JSON 解析时间 (在 Node.js 中这几乎是瞬时的，因为已经解析过了)
    console.log(`[${new Date().toISOString()}] ✅ JSON parsed (Node.js runtime)`);

    const { text, context, apiType } = body || {};

    if (!text) {
      return response.status(400).send('Missing text');
    }

    // 上下文长度限制
    const truncatedContext = context ? context.substring(0, 500) : '';

    // Generate Prompt
    const prompt = generatePrompt(text, truncatedContext);
    
    // 决定 API 提供商
    const type = apiType || DEFAULT_API_TYPE || 'gemini';
    
    const t_dispatchEnd = Date.now();
    console.log(`[${new Date().toISOString()}] 🤖 Dispatching to ${type} (Pre-process: ${t_dispatchEnd - t_jsonParsed}ms)`);

    // 5. 调用 AI Provider
    let result = '';
    const t2_aiStart = Date.now();
    
    // 统一超时设置 (15秒)
    const TIMEOUT_MS = 15000;

    switch (type) {
      case 'gemini':
        result = await callGemini(prompt, GEMINI_API_KEY, TIMEOUT_MS);
        break;
      case 'openai':
        result = await callOpenAI(prompt, OPENAI_API_KEY, TIMEOUT_MS);
        break;
      case 'deepseek':
        result = await callDeepSeek(prompt, DEEPSEEK_API_KEY, TIMEOUT_MS);
        break;
      case 'alibaba':
        result = await callAlibaba(prompt, ALIBABA_API_KEY, TIMEOUT_MS);
        break;
      default:
        return response.status(400).send('Unsupported API Type');
    }
    const t3_aiEnd = Date.now();
    console.log(`[${new Date().toISOString()}] ✨ AI response received in ${t3_aiEnd - t2_aiStart}ms`);

    const t4_serverEnd = Date.now();
    console.log(`[${new Date().toISOString()}] 📤 Sending response. Total server time: ${t4_serverEnd - t1_serverStart}ms`);
    
    // 6. 设置性能 Headers 并返回结果
    response.setHeader('X-Time-Server-Start', t1_serverStart.toString());
    response.setHeader('X-Time-Json-Parsed', t_jsonParsed.toString());
    response.setHeader('X-Time-Dispatch-End', t_dispatchEnd.toString());
    response.setHeader('X-Time-AI-Start', t2_aiStart.toString());
    response.setHeader('X-Time-AI-End', t3_aiEnd.toString());
    response.setHeader('X-Time-Server-End', t4_serverEnd.toString());

    return response.status(200).json({ content: result });

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Proxy Error:`, error);
    
    const statusCode = error.name === 'AbortError' ? 504 : 500;
    return response.status(statusCode).json({ 
      error: error.message || 'Internal Server Error',
      type: error.name 
    });
  }
}

// --- Helper: Fetch with Timeout ---
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
  // IP 强制化：确保所有请求通过 127.0.0.1 发起，避免 Windows localhost DNS 解析延迟
  const safeUrl = url.replace('localhost', '127.0.0.1');

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(safeUrl, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// --- AI Providers Implementation ---

async function callGemini(prompt: string, apiKey?: string, timeout = 10000) {
  if (!apiKey) throw new Error('Server Config Error: Gemini API Key missing');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  }, timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAI(prompt: string, apiKey?: string, timeout = 10000) {
  if (!apiKey) throw new Error('Server Config Error: OpenAI API Key missing');

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  }, timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callDeepSeek(prompt: string, apiKey?: string, timeout = 10000) {
  if (!apiKey) throw new Error('Server Config Error: DeepSeek API Key missing');

  const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  }, timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAlibaba(prompt: string, apiKey?: string, timeout = 10000) {
  if (!apiKey) throw new Error('Server Config Error: Alibaba API Key missing');

  const response = await fetchWithTimeout('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  }, timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Alibaba API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// --- Prompt Generation Logic ---

function generatePrompt(text: string, context: string = ''): string {
  // 使用模板字符串拼接，避免复杂的逻辑运算，保持高效
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
