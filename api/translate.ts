
// Vercel Serverless Function - Proxy for AI APIs
// 此文件运行在 Vercel 服务器端，而非浏览器端

export const config = {
  runtime: 'edge', // 使用 Edge Runtime 获得更快的冷启动速度
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // 在生产环境建议修改为特定的 Extension ID 或域名
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(request: Request) {
  // 处理预检请求 (Preflight)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { prompt, apiType } = await request.json();

    if (!prompt) {
      return new Response('Missing prompt', { status: 400, headers: CORS_HEADERS });
    }

    // 从环境变量读取 API Key (这些变量需要在 Vercel 项目设置中配置)
    const env = process.env;
    let result = '';

    // 根据请求的 apiType 分发到不同的提供商
    // 默认使用 Gemini (因为它的 Free Tier 比较大方)
    const type = apiType || env.DEFAULT_API_TYPE || 'gemini';

    switch (type) {
      case 'gemini':
        result = await callGemini(prompt, env.GEMINI_API_KEY);
        break;
      case 'openai':
        result = await callOpenAI(prompt, env.OPENAI_API_KEY);
        break;
      case 'deepseek':
        result = await callDeepSeek(prompt, env.DEEPSEEK_API_KEY);
        break;
      case 'alibaba':
        result = await callAlibaba(prompt, env.ALIBABA_API_KEY);
        break;
      default:
        return new Response('Unsupported API Type', { status: 400, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ content: result }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });

  } catch (error: any) {
    console.error('Proxy Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

// --- AI Providers Implementation ---

async function callGemini(prompt: string, apiKey?: string) {
  if (!apiKey) throw new Error('Server Config Error: Gemini API Key missing');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAI(prompt: string, apiKey?: string) {
  if (!apiKey) throw new Error('Server Config Error: OpenAI API Key missing');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) throw new Error(`OpenAI API Error: ${response.statusText}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callDeepSeek(prompt: string, apiKey?: string) {
  if (!apiKey) throw new Error('Server Config Error: DeepSeek API Key missing');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
  });

  if (!response.ok) throw new Error(`DeepSeek API Error: ${response.statusText}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAlibaba(prompt: string, apiKey?: string) {
  if (!apiKey) throw new Error('Server Config Error: Alibaba API Key missing');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
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
  });

  if (!response.ok) throw new Error(`Alibaba API Error: ${response.statusText}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
