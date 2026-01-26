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
    // Legacy method wrapper (waits for completion)
    return new Promise((resolve) => {
      let finalResult: AIAnalysisResult | null = null;
      this.analyzeTextStream(text, context, (result) => {
        finalResult = result as AIAnalysisResult;
      }).then(() => resolve(finalResult));
    });
  }

  public async analyzeTextStream(
    text: string, 
    context: string = '', 
    onUpdate: (result: Partial<AIAnalysisResult>) => void
  ): Promise<void> {
    const { API_TYPE } = API_CONFIG;
    let accumulatedText = '';

    try {
      await this.callProxyStream(text, context, API_TYPE, (chunk) => {
        accumulatedText += chunk;
        
        // 尝试解析部分结果
        const partialResult = this.parsePartialResponse(accumulatedText, text);
        onUpdate(partialResult);
      });
    } catch (error) {
      console.error('AI Stream Analysis Failed:', error);
      // Still return what we have? Or let the UI handle the error state via promise rejection?
      // For now, just log.
    }
  }

  private parsePartialResponse(content: string, originalText: string): Partial<AIAnalysisResult> {
    // 1. 尝试完整解析 (如果是合法的 JSON)
    try {
      // 查找第一个 { 和 最后一个 } 之间的内容
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = content.substring(firstBrace, lastBrace + 1);
        const result = JSON.parse(jsonStr);
        return this.normalizeResult(result, originalText);
      }
    } catch (e) {
      // JSON 不完整，忽略错误，继续下面的正则提取
    }

    // 2. 正则提取字段 (用于流式显示)
    // 注意：这里的正则比较简单，处理不了复杂的嵌套或转义，但对于流式展示足够了
    const extract = (key: string) => {
      // 匹配 "key": "value... (直到遇到下一个引号或字符串结尾)
      // 注意：这里假设 value 中没有未转义的引号。如果 AI 输出包含转义引号，这个正则可能会截断。
      // 但为了简单起见，且通常 key 顺序固定，我们尽量匹配到下一个字段的 key 前
      
      // 更加鲁棒的策略：
      // 找到 "key": 
      // 然后找到其后的第一个 "
      // 然后读取直到下一个 " (忽略 \")
      
      const keyPattern = `"${key}"\\s*:\\s*"`;
      const keyMatch = content.match(new RegExp(keyPattern));
      
      if (!keyMatch || keyMatch.index === undefined) return undefined;
      
      const valueStartIndex = keyMatch.index + keyMatch[0].length;
      let valueEndIndex = valueStartIndex;
      let isEscaped = false;
      
      // 手动扫描字符串直到结束引号
      for (let i = valueStartIndex; i < content.length; i++) {
        const char = content[i];
        if (isEscaped) {
          isEscaped = false;
          continue;
        }
        if (char === '\\') {
          isEscaped = true;
          continue;
        }
        if (char === '"') {
          valueEndIndex = i;
          break; // Found the end quote
        }
        // If we reach the end of content without a quote, it means the value is still streaming
        if (i === content.length - 1) {
          valueEndIndex = content.length;
        }
      }
      
      return content.substring(valueStartIndex, valueEndIndex);
    };

    return {
      correctedText: extract('correctedText') || originalText,
      phonetic: extract('phonetic'),
      contextMeaning: extract('contextMeaning'),
      translation: extract('translation'),
      coreLogic: extract('coreLogic') // coreLogic 通常在最后，可能还未开始
    };
  }

  private normalizeResult(result: any, originalText: string): AIAnalysisResult {
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

  // Old parseResponse is deprecated but kept/refactored inside normalizeResult if needed
  // private parseResponse... (Removed)

  /**
   * 预热连接 (Warm-up)
   * 在功能开启或页面加载时调用，建立 TCP/TLS 连接池
   */
  public async preheat(): Promise<void> {
    try {
      // 发送一个轻量级的 GET 请求到后端
      // 浏览器的连接池机制会自动复用这个连接用于后续的 POST 请求
      await fetch(API_CONFIG.API_PROXY_URL, {
        method: 'GET',
        // 不发送 body，且通常不发送复杂 Header 以避免 Preflight (如果后端允许简单请求)
        // 但这里我们的后端配置了 CORS，且是同源/代理，主要目的是建立连接
      });
      console.log('🔥 Connection preheated');
    } catch (e) {
      // 预热失败不影响主流程，仅记录日志
      console.debug('Connection preheat failed (non-critical):', e);
    }
  }

  private async callProxyStream(text: string, context: string, apiType: string, onChunk: (chunk: string) => void): Promise<void> {
    try {
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

      if (!response.ok) {
        // Try to read error body
        const errorText = await response.text().catch(() => '');
        throw new Error(`Proxy API Error: ${response.statusText} ${errorText}`);
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
        buffer = lines.pop() || ''; 
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          
          if (trimmed.startsWith('data: ')) {
            try {
              // Server sends data: "chunk" (JSON stringified string)
              // We need to JSON.parse the data payload to get the actual string
              const dataStr = trimmed.slice(6);
              if (dataStr === '[DONE]') return;
              
              const textChunk = JSON.parse(dataStr);
              onChunk(textChunk);
            } catch (e) {
              console.warn('SSE Parse Error', e, trimmed);
            }
          } else if (trimmed.startsWith('event: error')) {
             // Handle error event if needed, usually followed by data: error msg
          }
        }
      }
    } catch (error) {
      console.error('Call Proxy Stream Failed:', error);
      throw error;
    }
  }

  // Deprecated direct calls (callOpenAI etc) have been removed as we only use Proxy now.
}

export const aiService = AIService.getInstance();
