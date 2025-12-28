import { API_CONFIG } from '../config/api'

export class PageTranslator {
  private observer: IntersectionObserver
  private translationQueue: Set<Text> = new Set()
  private isProcessing = false
  private processedNodes: WeakSet<Node> = new WeakSet()
  private BATCH_SIZE = 10
  private DEBOUNCE_MS = 500
  private timer: number | null = null
  private isEnabled = false

  constructor() {
    // 恢复之前的状态
    chrome.storage.local.get(['isPageTranslateEnabled'], (result) => {
      if (result.isPageTranslateEnabled) {
        console.log('📖 Wordie: 恢复页面翻译状态: 开启')
        this.isEnabled = true
        // 确保DOM加载完成后再扫描
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.scanPage())
        } else {
          this.scanPage()
        }
      }
    })

    // 使用 IntersectionObserver 监听元素是否进入视口
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target
          // 找到目标元素下的所有未翻译文本节点
          this.collectTextNodes(target)
          this.observer.unobserve(target)
        }
      })
    }, {
      rootMargin: '200px' // 提前 200px 加载，保证平滑体验
    })
  }

  /**
   * 切换页面翻译状态
   */
  public toggle() {
    this.isEnabled = !this.isEnabled
    
    // 保存状态到 storage
    chrome.storage.local.set({ isPageTranslateEnabled: this.isEnabled })

    if (this.isEnabled) {
      console.log('📖 Wordie: 页面翻译已开启')
      this.scanPage()
    } else {
      console.log('📖 Wordie: 页面翻译已关闭')
      this.clearTranslations()
    }
    return this.isEnabled
  }

  /**
   * 获取当前状态
   */
  public isPageTranslationEnabled() {
    return this.isEnabled
  }

  /**
   * 扫描页面主要内容
   */
  private scanPage() {
    // 简单的启发式算法：只关注 block 级元素
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const element = node as Element
          const tag = element.tagName
          
          // 1. 过滤技术性标签和非内容标签
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'NAV', 'HEADER', 'FOOTER', 'SVG', 'IMG', 'INPUT', 'TEXTAREA', 'BUTTON', 'IFRAME', 'CANVAS', 'VIDEO', 'AUDIO', 'MAP', 'OBJECT'].includes(tag)) {
            return NodeFilter.FILTER_REJECT
          }

          // 2. 过滤代码块和语法高亮区域 (常见的类名)
          if (element.classList.contains('hljs') || 
              element.classList.contains('prism') || 
              element.classList.contains('code-block') ||
              element.getAttribute('role') === 'code') {
            return NodeFilter.FILTER_REJECT
          }

          // 3. 过滤纯数字、符号或无意义内容的容器（初步）
          // 这里不做太激进的过滤，以免误伤，主要交给 textNode 检查

          // 4. 忽略已隐藏的元素
          const style = window.getComputedStyle(element)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return NodeFilter.FILTER_REJECT
          }
          
          // 5. 过滤特定属性：contenteditable（编辑器区域通常不翻译）
          if (element.getAttribute('contenteditable') === 'true') {
             return NodeFilter.FILTER_REJECT
          }

          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    let currentNode = walker.nextNode()
    while (currentNode) {
      // 检查该元素是否包含直接文本子节点，如果有，则纳入观察
      // 我们观察的是 Element，但最终处理的是 TextNode
      if (this.hasDirectText(currentNode as Element)) {
        this.observer.observe(currentNode as Element)
      }
      currentNode = walker.nextNode()
    }
  }

  /**
   * 检查元素是否包含直接的、有意义的文本节点
   */
  private hasDirectText(element: Element): boolean {
    for (let i = 0; i < element.childNodes.length; i++) {
      const node = element.childNodes[i]
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim() || ''
        if (this.isValidText(text)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * 收集元素下的文本节点
   */
  private collectTextNodes(element: Element) {
    if (!this.isEnabled) return

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (this.processedNodes.has(node)) return NodeFilter.FILTER_REJECT
          
          // 再次检查父元素，防止漏网之鱼（如嵌套在 p > b > text 中的情况）
          const parentTag = node.parentElement?.tagName
          if (parentTag && ['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parentTag)) {
            return NodeFilter.FILTER_REJECT
          }

          const text = node.textContent?.trim() || ''
          if (this.isValidText(text)) {
            return NodeFilter.FILTER_ACCEPT
          }
          return NodeFilter.FILTER_REJECT
        }
      }
    )

    let node = walker.nextNode()
    while (node) {
      this.translationQueue.add(node as Text)
      this.processedNodes.add(node)
      node = walker.nextNode()
    }

    this.scheduleBatch()
  }

  /**
   * 判断文本是否需要翻译
   * 规则：长度 > 5，包含英文字符，且不是纯数字/符号
   */
  private isValidText(text: string): boolean {
    return text.length > 5 && /[a-zA-Z]/.test(text) && !/^[\d\s\p{P}]+$/u.test(text)
  }

  /**
   * 调度批量处理
   */
  private scheduleBatch() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = window.setTimeout(() => this.processQueue(), this.DEBOUNCE_MS)
  }

  /**
   * 处理翻译队列
   */
  private async processQueue() {
    if (this.isProcessing || this.translationQueue.size === 0 || !this.isEnabled) return

    this.isProcessing = true
    
    try {
      // 取出一批节点
      const nodes = Array.from(this.translationQueue).slice(0, this.BATCH_SIZE)
      // 从队列中移除
      nodes.forEach(n => this.translationQueue.delete(n))
      
      if (nodes.length > 0) {
        await this.translateBatch(nodes)
      }
      
      // 如果还有剩余，且未被禁用，继续调度
      if (this.translationQueue.size > 0 && this.isEnabled) {
        this.scheduleBatch() // 使用 setTimeout 给浏览器喘息机会
      }
    } catch (e) {
      console.error('Wordie Page Translate Error:', e)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 批量翻译并渲染
   */
  private async translateBatch(nodes: Text[]) {
    const texts = nodes.map(n => n.textContent?.trim() || '')
    
    // 如果列表为空，跳过
    if (texts.length === 0) return

    try {
      const translations = await this.fetchBatchTranslations(texts)
      
      if (translations && translations.length === nodes.length) {
        nodes.forEach((node, index) => {
          // 再次检查节点是否还在文档中
          if (document.contains(node)) {
            this.renderTranslation(node, translations[index])
          }
        })
      }
    } catch (error) {
      console.error('Batch translation failed:', error)
    }
  }

  /**
   * 渲染翻译结果（影子嵌入）
   */
  private renderTranslation(textNode: Text, translation: string) {
    if (!translation || translation === textNode.textContent?.trim()) return

    // 创建翻译节点
    const transSpan = document.createElement('span')
    transSpan.className = 'wordie-translation'
    transSpan.textContent = ` ${translation}`
    
    // 插入到文本节点后面
    if (textNode.parentNode) {
      textNode.parentNode.insertBefore(transSpan, textNode.nextSibling)
    }
  }

  /**
   * 清除页面上的所有翻译
   */
  private clearTranslations() {
    const translations = document.querySelectorAll('.wordie-translation')
    translations.forEach(el => el.remove())
    // 重置状态，以便下次重新翻译
    this.processedNodes = new WeakSet()
    this.translationQueue.clear()
  }

  /**
   * 调用 API 获取批量翻译
   */
  private async fetchBatchTranslations(texts: string[]): Promise<string[]> {
    const prompt = `You are a professional translator helper.
Translate the following English text segments into Chinese.
Requirements:
1. Maintain the original meaning but be concise.
2. The output will be displayed as a suffix to the original text, so keep it short and natural.
3. Do NOT translate code, technical terms (like variable names), or numbers unless necessary.
4. If a segment is not suitable for translation (e.g., pure code, navigation item), return an empty string for that segment.
5. Return ONLY a JSON array of strings, strictly matching the order of input.

Input Segments:
${JSON.stringify(texts)}

Output JSON:`

    try {
      // 复用 API_CONFIG 中的配置
      // 这里简化处理，优先使用 Alibaba/DeepSeek/OpenAI 的兼容接口
      // 如果是 Gemini，接口格式不同，需要单独处理
      
      let apiUrl = ''
      let apiKey = ''
      let model = ''
      let requestBody: any = {}

      if (API_CONFIG.API_TYPE === 'gemini') {
        apiUrl = `${API_CONFIG.GEMINI_API_URL}?key=${API_CONFIG.GEMINI_API_KEY}`
        requestBody = {
          contents: [{ parts: [{ text: prompt }] }]
        }
      } else if (API_CONFIG.API_TYPE === 'alibaba') {
        apiUrl = API_CONFIG.ALIBABA_API_URL
        apiKey = API_CONFIG.ALIBABA_API_KEY
        model = API_CONFIG.ALIBABA_MODEL
        requestBody = {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3 // 低温度，保证稳定
        }
      } else if (API_CONFIG.API_TYPE === 'deepseek') {
        apiUrl = API_CONFIG.DEEPSEEK_API_URL
        apiKey = API_CONFIG.DEEPSEEK_API_KEY
        model = API_CONFIG.DEEPSEEK_MODEL
        requestBody = {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        }
      } else {
        // Default to OpenAI or similar
        apiUrl = API_CONFIG.OPENAI_API_URL
        apiKey = API_CONFIG.OPENAI_API_KEY
        requestBody = {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        }
      }

      if (!apiUrl || (API_CONFIG.API_TYPE !== 'gemini' && !apiKey)) {
        console.warn('API Key missing for batch translation')
        return []
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_CONFIG.API_TYPE !== 'gemini' ? { 'Authorization': `Bearer ${apiKey}` } : {})
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      let content = ''

      if (API_CONFIG.API_TYPE === 'gemini') {
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      } else {
        content = data.choices?.[0]?.message?.content || ''
      }

      // 解析 JSON
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      } else {
        console.warn('Failed to parse batch translation JSON', content)
        return []
      }

    } catch (error) {
      console.error('Batch API call error:', error)
      return []
    }
  }
}
