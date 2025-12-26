/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_DEEPSEEK_API_KEY: string
  readonly VITE_ALIBABA_API_KEY: string
  readonly VITE_API_TYPE: 'gemini' | 'openai' | 'deepseek' | 'alibaba' | 'custom'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
