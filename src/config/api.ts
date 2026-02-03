import { ApiType } from '../types';

export const API_CONFIG = {
  // Gemini API
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',

  // OpenAI API
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',

  // DeepSeek API
  DEEPSEEK_API_BASE: 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL: 'deepseek-chat',
  get DEEPSEEK_API_URL() {
    return `${this.DEEPSEEK_API_BASE}/chat/completions`;
  },

  // Alibaba Qwen API
  ALIBABA_API_BASE: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  ALIBABA_MODEL: 'qwen-flash',
  get ALIBABA_API_URL() {
    return `${this.ALIBABA_API_BASE}/chat/completions`;
  },

  // Backend Proxy URL (Prioritize environment variable, otherwise default to Vercel server)
  // Use 127.0.0.1 instead of localhost to avoid DNS resolution latency
  API_PROXY_URL: import.meta.env.VITE_API_PROXY_URL,
};

// Re-export types for backward compatibility
export type { AIResponse } from '../types';
