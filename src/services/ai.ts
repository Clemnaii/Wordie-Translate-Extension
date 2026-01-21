import { API_CONFIG, AIResponse } from '../config/api';

export interface AIAnalysisResult extends AIResponse {
  // 扩展接口以备将来需要
}

class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private generatePrompt(text: string, context: string): string {
        return `你是一个精通英语语义学和认知语言学的专家。你的任务是分析用户输入的文本（词语、短语或句子），并按以下逻辑返回 JSON 格式的数据。

    Processing Logic:

    判定类型：判断输入是"词语/短语"还是"完整句子"。

    通用要求：
    - 分析用户选中的文本在上下文中的具体意思，考虑语境、修辞等因素

    如果是词语/短语：
    - correctedText: 【重要】分析用户选中的文本"${text}"，如果它是不完整的单词（如"messag"应为"message"）或有拼写错误，请提供完整的正确单词；如果已经是正确的完整单词，则与输入保持一致
    - phonetic: 提供该单词的标准音标（如 /ˈæpəl/），使用国际音标IPA格式
    - contextMeaning: 基于上下文"${context ? context.substring(0, 200) : ''}"，分析该词在此处的具体意思，用"[文中意思] 词性.具体含义"的格式描述
    - translation: 分词性输出主要中文意思（例如：n. 苹果; adj. 苹果似的）
    - coreLogic: 引用权威英语词典Oxford中关于该词最本源、最核心的英文定义，然后换行两次，再输出该定义的中文翻译（注意：coreLogic 不包含词性信息）

    如果是完整句子：
    - correctedText: 【重要】如果句子有语法错误或不完整，请提供修正后的完整句子；如果已经是正确的完整句子，则与输入保持一致
    - phonetic: 设为 null 或空字符串
    - contextMeaning: 设为 null 或空字符串（句子本身就是上下文）
    - translation: 直接提供整句的中文直译
    - coreLogic: 设为 null

    请分析文本："${text}"

    ${context ? `上下文：${context.substring(0, 200)}` : ''}

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

  private parseResponse(content: string, originalText: string): AIAnalysisResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        const coreLogic = result.coreLogic ?? result.core_logic ?? null;
        const normalizedCoreLogic = (coreLogic === '' || coreLogic === 'null') ? null : coreLogic;
        
        return {
          correctedText: result.correctedText || originalText,
          phonetic: result.phonetic || undefined,
          contextMeaning: result.contextMeaning || undefined,
          translation: result.translation || '翻译获取失败',
          coreLogic: normalizedCoreLogic
        };
      }
    } catch (e) {
      console.warn('Failed to parse JSON from AI response', e);
    }

    // Fallback if parsing fails
    return {
      correctedText: originalText,
      phonetic: undefined,
      contextMeaning: undefined,
      translation: content.split('\n')[0] || '翻译获取失败',
      coreLogic: null
    };
  }

  public async analyzeText(text: string, context: string = ''): Promise<AIAnalysisResult | null> {
    const { API_TYPE } = API_CONFIG;

    try {
      // 使用后端代理调用 AI
      const content = await this.callProxy(text, context, API_TYPE);
      
      if (!content) return null;
      
      return this.parseResponse(content, text);
    } catch (error) {
      console.error('AI Analysis Failed:', error);
      return null;
    }
  }

  private async callProxy(text: string, context: string, apiType: string): Promise<string> {
    try {
      const t0_requestStart = Date.now();
      const response = await fetch(API_CONFIG.API_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          context,
          apiType
        })
      });
      const t5_requestEnd = Date.now();

      // Performance Analysis Logging
      const serverStart = parseInt(response.headers.get('X-Time-Server-Start') || '0');
      const jsonParsed = parseInt(response.headers.get('X-Time-Json-Parsed') || '0');
      const dispatchEnd = parseInt(response.headers.get('X-Time-Dispatch-End') || '0');
      const aiStart = parseInt(response.headers.get('X-Time-AI-Start') || '0');
      const aiEnd = parseInt(response.headers.get('X-Time-AI-End') || '0');
      const serverEnd = parseInt(response.headers.get('X-Time-Server-End') || '0');

      console.group('🚀 Translation Timeline Analysis (Timestamps)');
      
      const formatTime = (ts: number) => new Date(ts).toISOString().split('T')[1].replace('Z', '');

      console.log(`[${formatTime(t0_requestStart)}] 1. Client Start Request`);
      
      if (serverStart > 0) {
        console.log(`[${formatTime(serverStart)}] 2. Server Received Request`);
        console.log(`[${formatTime(jsonParsed)}] 3. Server JSON Parsed`);
        console.log(`[${formatTime(dispatchEnd)}] 4. Server Dispatch Ready`);
        console.log(`[${formatTime(aiStart)}] 5. Server AI Call Start`);
        console.log(`[${formatTime(aiEnd)}] 6. Server AI Call End`);
        console.log(`[${formatTime(serverEnd)}] 7. Server Response Ready`);
      } else {
        console.log('  Server timing headers missing (CORS or old version)');
      }
      
      console.log(`[${formatTime(t5_requestEnd)}] 8. Client Received Response`);
      console.log(`Total Duration: ${t5_requestEnd - t0_requestStart}ms`);
      console.groupEnd();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Proxy API Error: ${response.statusText} ${errorData.error ? `- ${errorData.error}` : ''}`);
      }

      const data = await response.json();
      return data.content || '';
    } catch (error) {
      console.error('Call Proxy Failed:', error);
      throw error;
    }
  }


  private async callOpenAI(prompt: string): Promise<string> {
    if (!API_CONFIG.OPENAI_API_KEY) throw new Error('OpenAI API Key missing');

    const response = await fetch(API_CONFIG.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`
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

  private async callDeepSeek(prompt: string): Promise<string> {
    if (!API_CONFIG.DEEPSEEK_API_KEY) throw new Error('DeepSeek API Key missing');

    const response = await fetch(API_CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: API_CONFIG.DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`DeepSeek API Error: ${response.statusText}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callAlibaba(prompt: string): Promise<string> {
    if (!API_CONFIG.ALIBABA_API_KEY) throw new Error('Alibaba API Key missing');

    const response = await fetch(API_CONFIG.ALIBABA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.ALIBABA_API_KEY}`
      },
      body: JSON.stringify({
        model: API_CONFIG.ALIBABA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error(`Alibaba API Error: ${response.statusText}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

export const aiService = AIService.getInstance();
