import { ApiProvider } from '../types';

export interface ModelInfo {
  id: string;
  name: string;
}

export const PROVIDER_MODELS: Record<ApiProvider, ModelInfo[]> = {
  gemini: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Preview)' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)' },
  ],
  alibaba: [
    { id: 'qwen-turbo', name: 'Qwen Turbo' },
    { id: 'qwen-plus', name: 'Qwen Plus' },
    { id: 'qwen-max', name: 'Qwen Max' },
  ]
};

export const DEFAULT_MODELS: Record<ApiProvider, string> = {
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  alibaba: 'qwen-turbo',
};
