export interface AIResponse {
  translation: string;
  coreLogic: string | null;
  correctedText?: string;
  phonetic?: string;
  contextMeaning?: string;
}

export type ApiType = 'gemini' | 'openai' | 'deepseek' | 'alibaba' | 'custom';
