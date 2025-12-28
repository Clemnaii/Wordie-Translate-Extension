import './index.css'
import { API_CONFIG, AIResponse } from '../config/api'
import { PageTranslator } from './pageTranslator'

// ==================== 全局状态管理 ====================
const pageTranslator = new PageTranslator()
let isSelectionTranslateEnabled = true

// 初始化时读取划词翻译开关状态
chrome.storage.local.get(['isSelectionTranslateEnabled'], (result) => {
  if (result.isSelectionTranslateEnabled !== undefined) {
    isSelectionTranslateEnabled = result.isSelectionTranslateEnabled
  }
})

interface SelectionInfo {

  text: string
  position: { x: number; y: number; width: number; height: number }
  context: string
}

let currentIndicator: HTMLElement | null = null
let currentPopup: HTMLElement | null = null
let currentSelection: SelectionInfo | null = null
let isDraggingPopup = false
let dragStartPos = { x: 0, y: 0 }
let popupStartPos = { x: 0, y: 0 }
let dragEventCleanup: (() => void) | null = null

// ==================== 工具函数 ====================

/**
 * 计算选中文本的位置信息
 */
function calculateTextPosition(range: Range): { x: number; y: number; width: number; height: number } {
  const rect = range.getBoundingClientRect()

  // 检查是否在输入框内（预留功能）
  const startContainer = range.startContainer

  if (startContainer.nodeType === Node.TEXT_NODE) {
    let parent = startContainer.parentElement
    while (parent) {
      if (parent.tagName === 'INPUT' || parent.tagName === 'TEXTAREA') {
        // inputElement = parent as HTMLInputElement | HTMLTextAreaElement
        break
      }
      parent = parent.parentElement
    }
  }

  // 对于跨行文本，使用最后一个字符的位置
    let finalRect = rect
    try {
      const tempRange = document.createRange()
      const endContainer = range.endContainer
      const endOffset = range.endOffset

      if (endOffset > 0) {
        tempRange.setStart(endContainer, endOffset - 1)
        tempRange.setEnd(endContainer, endOffset)
      const lastCharRect = tempRange.getBoundingClientRect()

        if (lastCharRect && lastCharRect.width > 0 && lastCharRect.height > 0) {
          finalRect = lastCharRect
        }
      }
    } catch (e) {
    // 如果获取失败，使用原始rect
  }

  // 转换为绝对坐标
  const x = finalRect.right + window.scrollX
  const y = finalRect.bottom + window.scrollY
  const width = finalRect.width
  const height = finalRect.height

  return { x, y, width, height }
}

/**
 * 智能计算弹窗位置，确保不超出视口
 */
function calculatePopupPosition(
  textPosition: { x: number; y: number; width: number; height: number },
  popupWidth: number = 320,
  popupHeight: number = 200
): { x: number; y: number; strategy: string } {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  }

  // 计算文本在视口中的位置
  const textViewportY = textPosition.y - viewport.scrollY
  const textCenterY = textViewportY + textPosition.height / 2
  const isTextInLowerHalf = textCenterY > viewport.height / 2

  // 首选策略：放在文本右侧
  let popupX = textPosition.x + textPosition.width + 12
  let popupY: number
  let strategy = 'right'

  // 根据文本位置决定垂直方向
  if (isTextInLowerHalf) {
    // 文本在下半部分，弹窗放在上方
    popupY = textPosition.y - popupHeight - 8
    strategy = 'right-above'
  } else {
    // 文本在上半部分，弹窗放在下方
    popupY = textPosition.y + textPosition.height + 8
    strategy = 'right-below'
  }

  // 检查右侧空间
  const rightSpace = viewport.scrollX + viewport.width - popupX
  if (rightSpace < popupWidth) {
    // 右侧空间不足，尝试左侧
    const leftX = textPosition.x - popupWidth - 12
    if (leftX >= viewport.scrollX) {
      popupX = leftX
      strategy = isTextInLowerHalf ? 'left-above' : 'left-below'
      } else {
      // 左右都不够，使用约束位置
      popupX = Math.max(viewport.scrollX + 10, textPosition.x + textPosition.width + 12)
      strategy = 'constrained-right'
    }
  }

  // 检查垂直空间并调整
  const topSpace = popupY - viewport.scrollY
  const bottomSpace = viewport.scrollY + viewport.height - (popupY + popupHeight)

  if (topSpace < 0) {
    // 上方空间不足，强制放在下方
    popupY = textPosition.y + textPosition.height + 8
    strategy = strategy.replace('-above', '-below-forced')
  } else if (bottomSpace < 0) {
    // 下方空间不足，强制放在上方
    popupY = textPosition.y - popupHeight - 8
    strategy = strategy.replace('-below', '-above-forced')
  }

  // 最终边界约束
  popupX = Math.max(
    viewport.scrollX + 10,
    Math.min(popupX, viewport.scrollX + viewport.width - popupWidth - 10)
  )
  popupY = Math.max(
    viewport.scrollY + 10,
    Math.min(popupY, viewport.scrollY + viewport.height - popupHeight - 10)
  )

  return { x: popupX, y: popupY, strategy }
}

/**
 * 检测输入类型：词语/短语 vs 句子
 */
function detectInputType(text: string): 'word' | 'sentence' {
  const trimmed = text.trim()
  const words = trimmed.split(/\s+/)

  if (words.length === 1) {
    return 'word'
  }

  if (/^[A-Z]/.test(trimmed) && /\./.test(trimmed)) {
    return 'sentence'
  }

  if (words.length > 1 && trimmed.length > 15) {
    return 'sentence'
  }

  return 'word'
}

/**
 * 播放单词发音
 */
function playWordPronunciation(word: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.8
    utterance.pitch = 1

    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(voice =>
      voice.lang.startsWith('en') &&
      (voice.name.includes('Female') || voice.name.includes('Male'))
    )

    if (englishVoice) {
      utterance.voice = englishVoice
    }

    window.speechSynthesis.speak(utterance)
  }
}

// ==================== UI 组件管理 ====================

/**
 * 移除小圆点指示器
 */
function removeIndicator() {
  if (currentIndicator) {
    currentIndicator.remove()
    currentIndicator = null
  }
}

/**
 * 移除弹窗
 */
function removePopup() {
  if (currentPopup) {
    if (dragEventCleanup) {
      dragEventCleanup()
      dragEventCleanup = null
    }
      isDraggingPopup = false
    currentPopup.remove()
    currentPopup = null
  }
}

/**
 * 显示小圆点指示器
 */
function showIndicator(text: string, position: { x: number; y: number; width: number; height: number }) {
  removeIndicator()

  const indicator = document.createElement('div')
  indicator.className = 'logic-lens-indicator'
  indicator.setAttribute('data-text', text)

  // 计算位置：放在选中文本的右侧，紧贴文本
  const indicatorX = position.x + position.width + 1
  const indicatorY = position.y + position.height / 2 - 8

  indicator.style.position = 'absolute'
  indicator.style.left = `${indicatorX}px`
  indicator.style.top = `${indicatorY}px`
  indicator.style.zIndex = '999999'
  indicator.style.cursor = 'pointer'
  indicator.style.pointerEvents = 'auto'

  // 鼠标移入事件：显示弹窗
  indicator.addEventListener('mouseenter', (e) => {
    e.stopPropagation()
    if (currentSelection) {
      removeIndicator()
      showPopup(currentSelection.text, currentSelection.position, currentSelection.context)
    }
  })

  document.body.appendChild(indicator)
  currentIndicator = indicator
}

/**
 * 显示弹窗
 */
function showPopup(text: string, position: { x: number; y: number; width: number; height: number }, context: string = '') {
  removePopup()

  const popup = document.createElement('div')
  popup.className = 'logic-lens-popup'
  popup.setAttribute('data-text', text)

  // 计算弹窗位置
  const { x: popupX, y: popupY } = calculatePopupPosition(position)

  popup.style.position = 'absolute'
  popup.style.left = `${popupX}px`
  popup.style.top = `${popupY}px`
  popup.style.zIndex = '999999'
  popup.style.pointerEvents = 'auto'

  // 弹窗内容
  popup.innerHTML = `
    <div class="logic-lens-popup-header" id="popup-drag-handle">
      <span class="logic-lens-popup-label">Wordie <span class="logic-lens-popup-label-translation">小词苗</span></span>
      <button class="logic-lens-popup-close" id="popup-close-btn" title="关闭">×</button>
    </div>
    <div class="logic-lens-popup-content">
      <div class="logic-lens-popup-loading" id="popup-loading">
        <div class="logic-lens-spinner"></div>
        <span>正在分析...</span>
      </div>
      <div class="logic-lens-popup-result" id="popup-result" style="display: none;">
        <div class="logic-lens-popup-text">
          <div class="logic-lens-popup-word-info">
            <strong id="popup-selected-text">${text}</strong>
            <span id="popup-phonetic" class="logic-lens-popup-phonetic"></span>
            <button id="popup-pronunciation-btn" class="logic-lens-popup-pronounce-btn" title="播放发音">🔉</button>
          </div>
          <div id="popup-context-meaning" class="logic-lens-popup-context-meaning"></div>
        </div>
        <div class="logic-lens-popup-section">
          <div class="logic-lens-popup-section-title">中文直译</div>
          <div class="logic-lens-popup-section-content" id="popup-translation"></div>
        </div>
        <div class="logic-lens-popup-section">
          <div class="logic-lens-popup-section-title">核心逻辑</div>
          <div class="logic-lens-popup-section-content" id="popup-core-logic"></div>
        </div>
      </div>
    </div>
  `

  // 关闭按钮事件
  const closeBtn = popup.querySelector('#popup-close-btn') as HTMLElement
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    removePopup()
    if (currentSelection) {
      showIndicator(currentSelection.text, currentSelection.position)
    }
  })

  // 拖拽功能
  setupDragHandling(popup)

  // 阻止弹窗内点击事件冒泡
  popup.addEventListener('click', (e) => {
    e.stopPropagation()
  })

  document.body.appendChild(popup)
  currentPopup = popup

  // 异步获取翻译和逻辑解释
  const inputType = detectInputType(text)
  fetchTranslationAndLogic(text, context).then((result) => {
    if (!currentPopup || !document.body.contains(currentPopup)) {
      return
    }

    updatePopupContent(result, inputType, text)
  })
}

/**
 * 设置弹窗拖拽功能
 */
function setupDragHandling(popup: HTMLElement) {
  const dragHandle = popup.querySelector('#popup-drag-handle') as HTMLElement

  dragHandle.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    isDraggingPopup = true

    // 获取当前弹窗位置（考虑滚动）
    const rect = popup.getBoundingClientRect()
    popupStartPos.x = rect.left + window.scrollX
    popupStartPos.y = rect.top + window.scrollY

    dragStartPos.x = e.clientX
    dragStartPos.y = e.clientY

    popup.style.cursor = 'grabbing'
    dragHandle.style.cursor = 'grabbing'
  })

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingPopup || !currentPopup) return

    e.preventDefault()

    const deltaX = e.clientX - dragStartPos.x
    const deltaY = e.clientY - dragStartPos.y

    const newX = popupStartPos.x + deltaX
    const newY = popupStartPos.y + deltaY

    // 约束在视口内
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const popupWidth = popup.offsetWidth || 320
    const popupHeight = popup.offsetHeight || 200

    const constrainedX = Math.max(window.scrollX, Math.min(newX, window.scrollX + viewportWidth - popupWidth))
    const constrainedY = Math.max(window.scrollY, Math.min(newY, window.scrollY + viewportHeight - popupHeight))

    popup.style.left = `${constrainedX}px`
    popup.style.top = `${constrainedY}px`
  }

  const handleMouseUp = () => {
    if (isDraggingPopup) {
      isDraggingPopup = false
      if (currentPopup) {
        currentPopup.style.cursor = ''
        const dragHandle = currentPopup.querySelector('#popup-drag-handle') as HTMLElement
        if (dragHandle) {
          dragHandle.style.cursor = 'grab'
        }
      }
    }
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  dragEventCleanup = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    isDraggingPopup = false
  }
}

/**
 * 更新弹窗内容
 */
function updatePopupContent(result: AIResponse | null, inputType: 'word' | 'sentence', originalText: string) {
  if (!currentPopup) return

  const loadingEl = currentPopup.querySelector('#popup-loading') as HTMLElement
  const resultEl = currentPopup.querySelector('#popup-result') as HTMLElement
  const translationEl = currentPopup.querySelector('#popup-translation') as HTMLElement
  const coreLogicEl = currentPopup.querySelector('#popup-core-logic') as HTMLElement
  const coreLogicSection = currentPopup.querySelector('.logic-lens-popup-section:last-child') as HTMLElement

  if (loadingEl) loadingEl.style.display = 'none'

  if (result && resultEl && translationEl && coreLogicEl) {
    // 显示修正后的文本
    const selectedTextEl = currentPopup.querySelector('#popup-selected-text') as HTMLElement
    if (selectedTextEl && result.correctedText) {
      selectedTextEl.textContent = result.correctedText
    }

    // 处理词语/短语的特殊显示
    const phoneticEl = currentPopup.querySelector('#popup-phonetic') as HTMLElement
    const pronounceBtn = currentPopup.querySelector('#popup-pronunciation-btn') as HTMLButtonElement
    const contextMeaningEl = currentPopup.querySelector('#popup-context-meaning') as HTMLElement

    if (inputType === 'word') {
      // 显示音标和发音按钮
      if (result.phonetic && phoneticEl) {
        phoneticEl.textContent = result.phonetic
        phoneticEl.style.display = 'inline'
      }
      if (pronounceBtn) {
        pronounceBtn.style.display = 'inline'
        pronounceBtn.onclick = (e) => {
          e.stopPropagation()
          playWordPronunciation(result.correctedText || originalText)
        }
      }

      // 显示上下文意思
      if (result.contextMeaning && contextMeaningEl) {
        contextMeaningEl.textContent = result.contextMeaning
        contextMeaningEl.style.display = 'block'
      } else if (contextMeaningEl) {
        contextMeaningEl.style.display = 'none'
      }
    } else {
      // 句子时隐藏音标、发音按钮和上下文意思
      if (phoneticEl) phoneticEl.style.display = 'none'
      if (pronounceBtn) pronounceBtn.style.display = 'none'
      if (contextMeaningEl) contextMeaningEl.style.display = 'none'
    }

    // 显示翻译
    translationEl.textContent = result.translation

    // 处理核心逻辑
    if (inputType === 'sentence') {
      if (coreLogicSection) {
        coreLogicSection.style.display = 'none'
      }
    } else {
      if (!result.coreLogic || result.coreLogic.trim() === '' || result.coreLogic === 'null') {
        if (coreLogicSection) {
          coreLogicSection.style.display = 'none'
        }
      } else {
        if (coreLogicSection) {
          coreLogicSection.style.display = 'block'
        }

        const coreLogicText = result.coreLogic.trim()
        if (coreLogicText.includes('\n\n')) {
          const cleanedText = coreLogicText.replace(/\n\s*\n\s*\n+/g, '\n\n').trim()
          const parts = cleanedText.split('\n\n').map(s => s.trim()).filter(s => s)

          if (parts.length >= 2) {
            const englishDef = parts[0]
            const chineseTrans = parts.slice(1).join('\n\n')
            coreLogicEl.innerHTML = `<div class="english-definition">${englishDef}</div><div class="chinese-translation">${chineseTrans}</div>`
          } else {
            coreLogicEl.textContent = cleanedText
          }
        } else {
          coreLogicEl.textContent = coreLogicText
        }
      }
    }

    resultEl.style.display = 'block'
  } else {
    // 显示错误信息
    if (resultEl && translationEl && coreLogicEl) {
      translationEl.textContent = 'API 调用失败，请检查配置和网络连接'

      if (inputType === 'sentence') {
        if (coreLogicSection) {
          coreLogicSection.style.display = 'none'
        }
      } else {
        if (coreLogicSection) {
          coreLogicSection.style.display = 'block'
        }
        coreLogicEl.innerHTML = `
          <div style="color: #ef4444; font-size: 13px;">
            <p>请检查：</p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>API Key 是否正确配置</li>
              <li>API Key 是否有权限访问 API</li>
              <li>网络连接是否正常</li>
              <li>查看浏览器控制台获取详细错误信息</li>
            </ul>
          </div>
        `
      }

      resultEl.style.display = 'block'
    }
    if (loadingEl) loadingEl.style.display = 'none'
  }
}

// ==================== API 调用 ====================

/**
 * 调用 AI API 获取翻译和逻辑解释
 */
async function fetchTranslationAndLogic(text: string, context: string = ''): Promise<AIResponse | null> {
  try {
    const prompt = `你是一个精通英语语义学和认知语言学的专家。你的任务是分析用户输入的文本（词语、短语或句子），并按以下逻辑返回 JSON 格式的数据。

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
}`

    if (API_CONFIG.API_TYPE === 'gemini') {
      if (!API_CONFIG.GEMINI_API_KEY) {
        console.warn('⚠️ Gemini API Key 未配置')
        return null
      }
      
      const apiUrl = `${API_CONFIG.GEMINI_API_URL}?key=${API_CONFIG.GEMINI_API_KEY}`
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      })
      
      if (!response.ok) {
        throw new Error(`Gemini API 错误 (${response.status}): ${response.statusText}`)
      }
      
      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      if (!content) {
        throw new Error('API 响应中没有内容')
      }
      
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          const coreLogic = result.coreLogic ?? result.core_logic ?? null
          const normalizedCoreLogic = (coreLogic === '' || coreLogic === 'null') ? null : coreLogic
          return {
          correctedText: result.correctedText || text,
            phonetic: result.phonetic || undefined,
            contextMeaning: result.contextMeaning || undefined,
            translation: result.translation || '翻译获取失败',
            coreLogic: normalizedCoreLogic
          }
      }

      return {
        correctedText: text,
        phonetic: undefined,
        contextMeaning: undefined,
        translation: content.split('\n')[0] || '翻译获取失败',
        coreLogic: null
      }
      
    } else if (API_CONFIG.API_TYPE === 'openai') {
      if (!API_CONFIG.OPENAI_API_KEY) {
        console.warn('⚠️ OpenAI API Key 未配置')
        return null
      }
      
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
      })
      
      if (!response.ok) {
        throw new Error(`OpenAI API 错误: ${response.statusText}`)
      }
      
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          return {
            correctedText: result.correctedText || text,
            phonetic: result.phonetic || undefined,
            contextMeaning: result.contextMeaning || undefined,
            translation: result.translation || '翻译获取失败',
            coreLogic: result.coreLogic || '逻辑解释获取失败'
          }
      }

      return {
        correctedText: text,
        phonetic: undefined,
        translation: content.split('\n')[0] || '翻译获取失败',
        coreLogic: content || '逻辑解释获取失败'
      }
      
    } else if (API_CONFIG.API_TYPE === 'deepseek') {
      if (!API_CONFIG.DEEPSEEK_API_KEY) {
        console.warn('⚠️ DeepSeek API Key 未配置')
        return null
      }
      
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
      })
      
      if (!response.ok) {
        throw new Error(`DeepSeek API 错误 (${response.status}): ${response.statusText}`)
      }
      
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      
      if (!content) {
        throw new Error('API 响应中没有内容')
      }
      
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          return {
            correctedText: result.correctedText || text,
            phonetic: result.phonetic || undefined,
            contextMeaning: result.contextMeaning || undefined,
            translation: result.translation || '翻译获取失败',
            coreLogic: result.coreLogic || '逻辑解释获取失败'
          }
      }

      return {
        correctedText: text,
        phonetic: undefined,
        translation: content.split('\n')[0] || '翻译获取失败',
        coreLogic: content || '逻辑解释获取失败'
      }
      
    } else if (API_CONFIG.API_TYPE === 'alibaba') {
      if (!API_CONFIG.ALIBABA_API_KEY) {
        console.warn('⚠️ 阿里云 API Key 未配置')
        return null
      }
      
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
      })
      
      if (!response.ok) {
        throw new Error(`阿里云 API 错误 (${response.status}): ${response.statusText}`)
      }
      
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      
      if (!content) {
        throw new Error('API 响应中没有内容')
      }
      
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0])
          return {
            correctedText: result.correctedText || text,
            phonetic: result.phonetic || undefined,
            contextMeaning: result.contextMeaning || undefined,
            translation: result.translation || '翻译获取失败',
            coreLogic: result.coreLogic || '逻辑解释获取失败'
          }
      }

      return {
        correctedText: text,
        phonetic: undefined,
        translation: content.split('\n')[0] || '翻译获取失败',
        coreLogic: content || '逻辑解释获取失败'
      }
    }
    
    return null
  } catch (error) {
    console.error('❌ AI API 调用失败:', error)
    return null
  }
}

// ==================== 事件处理 ====================

/**
 * 处理文本选择事件
 */
function handleTextSelection() {
  const selection = window.getSelection()
  
  if (!selection || selection.rangeCount === 0) {
    removeIndicator()
    return
  }

  const selectedText = selection.toString().trim()
  
  if (!selectedText) {
    removeIndicator()
    return
  }

  // 如果划词翻译已禁用，则不显示小圆点
  if (!isSelectionTranslateEnabled) {
    return
  }

  const range = selection.getRangeAt(0)
  const container = range.commonAncestorContainer
  const context = container.textContent || ''

  const position = calculateTextPosition(range)

  currentSelection = {
    text: selectedText,
    position,
    context: context.substring(0, 200)
  }

  showIndicator(selectedText, position)
}

/**
 * 处理右键菜单翻译
 */
function handleContextMenuTranslation(text: string) {
  const mockSelection: SelectionInfo = {
    text: text,
    position: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      width: text.length * 8,
      height: 16
    },
    context: document.body.textContent?.substring(0, 200) || ''
  }

  currentSelection = mockSelection
  // 右键翻译时直接显示弹窗，而不是小圆点
  showPopup(text, mockSelection.position, mockSelection.context)
}

// ==================== 初始化 ====================

function init() {
  console.log('✅ Wordie Content Script 已加载')
  
  // 监听鼠标抬起事件（文本选择完成）
  document.addEventListener('mouseup', () => {
    setTimeout(() => {
      handleTextSelection()
    }, 50)
  })
  
  // 点击其他地方时移除图标和弹窗
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement

    if (isDraggingPopup) {
      return
    }

    // 如果点击的是弹窗外部，关闭弹窗并恢复图标
    if (!target.closest('.logic-lens-popup') && currentPopup) {
      removePopup()
      if (currentSelection) {
        showIndicator(currentSelection.text, currentSelection.position)
      }
    }
    
    // 如果点击的不是图标和弹窗，则关闭图标
    if (!target.closest('.logic-lens-indicator') && !target.closest('.logic-lens-popup')) {
      removeIndicator()
    }
  })
  
  // 监听键盘选择
  document.addEventListener('keyup', (e) => {
    if (e.shiftKey) {
      setTimeout(() => {
        handleTextSelection()
      }, 50)
    }
  })
  
  // 监听选择变化事件（键盘选择）
  let selectionChangeTimeout: number | null = null
  document.addEventListener('selectionchange', () => {
    if (selectionChangeTimeout) {
      clearTimeout(selectionChangeTimeout)
    }
    
    selectionChangeTimeout = window.setTimeout(() => {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        handleTextSelection()
      } else {
        removeIndicator()
      }
    }, 200)
  })
}

// 监听来自background script的消息（右键菜单翻译）
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log("📨 Wordie [Content]: Received message:", request.action);
  
  if (request.action === "translateSelection" && request.text) {
    handleContextMenuTranslation(request.text)
    sendResponse({ success: true })
  } else if (request.action === "togglePageTranslation") {
    const isEnabled = pageTranslator.toggle()
    console.log("🔄 Wordie [Content]: Toggled page translation to:", isEnabled);
    sendResponse({ success: true, isEnabled })
  } else if (request.action === "getPageTranslationStatus") {
    const isEnabled = pageTranslator.isPageTranslationEnabled()
    console.log("ℹ️ Wordie [Content]: Reporting page translation status:", isEnabled);
    sendResponse({ success: true, isEnabled })
  } else if (request.action === "updateSelectionTranslateStatus") {
    isSelectionTranslateEnabled = request.isEnabled
    console.log("🔄 Wordie [Content]: Updated selection translate status to:", isSelectionTranslateEnabled);
    if (!isSelectionTranslateEnabled) {
      removeIndicator()
    }
    sendResponse({ success: true })
  }
})


// 确保脚本在页面加载完成后运行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
