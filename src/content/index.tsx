import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { contentState } from './state';
import { calculateTextPosition } from '../utils/dom';
import { aiService } from '../services/ai';
import { storage } from '../utils/storage';

// ==================== 初始化 React 应用 ====================

const container = document.createElement('div');
container.id = 'wordie-translate-root';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<App />);

// ==================== 事件处理 ====================

let selectionTimeout: number | null = null;

function handleSelection() {
  const selection = window.getSelection();
  
  if (!selection || selection.rangeCount === 0) {
    contentState.clear();
    return;
  }

  const selectedText = selection.toString().trim();
  
  if (!selectedText) {
    contentState.clear();
    return;
  }

  // 忽略输入框内的选择
  if (
    document.activeElement && 
    (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
  ) {
    return;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const context = container.textContent || '';
  const position = calculateTextPosition(range);

  contentState.setSelection({
    text: selectedText,
    position,
    context: context.substring(0, 200)
  });
}

// 监听鼠标抬起
document.addEventListener('mouseup', (e) => {
  // 延迟以确保 selection 更新
  setTimeout(() => {
    // 如果点击的是我们的组件，不要清除选择
    if ((e.target as HTMLElement).closest('.logic-lens-indicator') || 
        (e.target as HTMLElement).closest('.logic-lens-popup')) {
      return;
    }
    handleSelection();
  }, 10);
});

// 监听键盘抬起 (Shift + Arrow keys selection)
document.addEventListener('keyup', (e) => {
  if (e.shiftKey) {
    setTimeout(handleSelection, 10);
  }
});

// 点击空白处清除 (通过 handleSelection 的空检查处理，或者单独处理)
document.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.logic-lens-indicator') && !target.closest('.logic-lens-popup')) {
    // 只有当没有选中文本时才清除（由 mouseup 处理），这里主要处理点击空白
    // 但 mouseup 会重新检查 selection。
    // 如果用户点击空白，selection 会变空。
  }
});

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'translateSelection' && request.text) {
    // 模拟选择
    const position = {
      x: window.innerWidth / 2 - 150,
      y: window.innerHeight / 2 - 100,
      width: 0,
      height: 0
    };
    
    contentState.setSelection({
      text: request.text,
      position,
      context: ''
    });
    contentState.showPopup();
    
    sendResponse({ success: true });
  }
});

// ==================== 初始化与预热 ====================

// 1. 页面加载时，如果功能开启，则预热连接
storage.get().then((settings) => {
  if (settings.enableTranslation) {
    aiService.preheat();
  }
});

// 2. 监听设置变化，如果用户刚刚开启了功能，则预热连接
storage.onChanged((changes) => {
  if (changes.enableTranslation === true) {
    aiService.preheat();
  }
});

console.log('✅ Wordie Content Script Initialized');
