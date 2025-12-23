// API 配置
// 你可以在这里配置你的 AI API Key 和端点

export const API_CONFIG = {
  // Gemini API 配置
  // 根据官方文档：https://ai.google.dev/gemini-api/docs/api-key
  GEMINI_API_KEY: 'AIzaSyDEUBX1YKw88OfgXckoEkSTASRo2XVEMbQ', // 在这里填入你的 Gemini API Key

  // 对应 Gemini 2.5 Flash 的 REST 接口地址
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',

  // 或者使用 OpenAI API
  OPENAI_API_KEY: '', // 在这里填入你的 OpenAI API Key
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  
  // DeepSeek API 配置
  DEEPSEEK_API_KEY: 'sk-b06adb9769cb4ddaadd7295043f579c0', // DeepSeek API Key
  DEEPSEEK_API_BASE: 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL: 'deepseek-chat',
  get DEEPSEEK_API_URL() {
    return `${this.DEEPSEEK_API_BASE}/chat/completions`
  },
  
  // 阿里云通义千问 API 配置
  ALIBABA_API_KEY: 'sk-82c9082fbab44e45b11f3998b01a8150', // 阿里云 API Key
  ALIBABA_API_BASE: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  ALIBABA_MODEL: 'qwen-flash',
  get ALIBABA_API_URL() {
    return `${this.ALIBABA_API_BASE}/chat/completions`
  },
  
  // 当前使用的 API 类型：'gemini' | 'openai' | 'deepseek' | 'alibaba' | 'custom'
  API_TYPE: 'alibaba' as 'gemini' | 'openai' | 'deepseek' | 'alibaba' | 'custom',
}

// AI 响应类型
export interface AIResponse {
  translation: string // 中文直译
  coreLogic: string | null // 底层逻辑解释（词语/短语时才有，完整句子时为 null）
  correctedText?: string // AI 修正后的完整正确文本（可选）
  phonetic?: string // 单词音标（仅词语/短语时有，可选）
  contextMeaning?: string // 上下文中的意思解释（可选）
}

