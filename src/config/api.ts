import { ApiType } from '../types';

// API Key 现在从环境变量中读取，请在 .env 文件中配置

export const API_CONFIG = {
  // Gemini API
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',

  // OpenAI API
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',

  // DeepSeek API
  DEEPSEEK_API_KEY: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  DEEPSEEK_API_BASE: 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL: 'deepseek-chat',
  get DEEPSEEK_API_URL() {
    return `${this.DEEPSEEK_API_BASE}/chat/completions`;
  },

  // Alibaba Qwen API
  ALIBABA_API_KEY: import.meta.env.VITE_ALIBABA_API_KEY || '',
  ALIBABA_API_BASE: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  ALIBABA_MODEL: 'qwen-flash',
  get ALIBABA_API_URL() {
    return `${this.ALIBABA_API_BASE}/chat/completions`;
  },

  // Current API Type
  API_TYPE: (import.meta.env.VITE_API_TYPE as ApiType) || 'alibaba',
};

// Re-export types for backward compatibility if needed, but better to import from types
export type { AIResponse } from '../types';
