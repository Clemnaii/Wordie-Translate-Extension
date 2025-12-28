import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function Popup() {
  const [isPageTranslateEnabled, setIsPageTranslateEnabled] = useState(false)
  const [isSelectionTranslateEnabled, setIsSelectionTranslateEnabled] = useState(true)

  // 初始化时获取当前状态
  useEffect(() => {
    console.log("🚀 Wordie [Popup]: Popup opened, initializing...");
    
    // 获取页面翻译状态
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      console.log("🔍 Wordie [Popup]: Current tab found:", tab?.id, tab?.url);
      if (tab?.id) {
        console.log("📤 Wordie [Popup]: Sending getPageTranslationStatus to tab", tab.id);
        chrome.tabs.sendMessage(tab.id, { action: "getPageTranslationStatus" }, (response) => {
           if (chrome.runtime.lastError) {
             console.error("❌ Wordie [Popup]: Error communicating with content script:", chrome.runtime.lastError.message);
             return
           }
           console.log("📥 Wordie [Popup]: Received status response:", response);
           if (response && response.isEnabled !== undefined) {
             setIsPageTranslateEnabled(response.isEnabled)
           }
        })
      } else {
        console.warn("⚠️ Wordie [Popup]: No active tab found");
      }
    })

    // 获取划词翻译状态
    chrome.storage.local.get(['isSelectionTranslateEnabled'], (result) => {
      if (result.isSelectionTranslateEnabled !== undefined) {
        setIsSelectionTranslateEnabled(result.isSelectionTranslateEnabled)
      }
    })
  }, [])

  const togglePageTranslate = async () => {
    console.log("🖱️ Wordie [Popup]: Page toggle button clicked");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      console.log("📤 Wordie [Popup]: Sending togglePageTranslation to tab", tab.id);
      // 发送消息切换状态
      chrome.tabs.sendMessage(tab.id, { action: "togglePageTranslation" }, (response) => {
        // 忽略错误（例如 content script 未加载）
        if (chrome.runtime.lastError) {
          console.error("❌ Wordie [Popup]: Content script not ready or error:", chrome.runtime.lastError.message);
          return
        }
        console.log("📥 Wordie [Popup]: Received toggle response:", response);
        if (response && response.isEnabled !== undefined) {
           setIsPageTranslateEnabled(response.isEnabled)
        }
      })
    } else {
      console.warn("⚠️ Wordie [Popup]: No active tab found for toggle");
    }
  }

  const toggleSelectionTranslate = () => {
    const newValue = !isSelectionTranslateEnabled
    setIsSelectionTranslateEnabled(newValue)
    chrome.storage.local.set({ isSelectionTranslateEnabled: newValue })
    
    // 同时通知当前页面的 content script 立即生效（可选，因为 content script 会监听 storage 变化或重新加载时读取）
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { 
          action: "updateSelectionTranslateStatus", 
          isEnabled: newValue 
        }).catch(() => {/* 忽略错误 */})
      }
    })
  }

  return (
    <div className="w-80 p-4 bg-white text-gray-800">
      <header className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
        <h1 className="text-xl font-bold text-amber-600 flex items-center gap-2">
          Wordie
        </h1>
        <span className="text-xs text-gray-400">v1.0.0</span>
      </header>

      <div className="space-y-4">
        {/* 功能开关组 - 灰色阴影块 */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* 划词翻译开关 */}
          <div className="flex items-center justify-between p-3 hover:bg-gray-100 transition-colors border-b border-gray-100">
            <div className="flex flex-col">
              <span className="font-medium text-gray-800 text-sm">划词翻译</span>
              <span className="text-xs text-gray-500">选中文字显示解析图标</span>
            </div>
            <button
              onClick={toggleSelectionTranslate}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                isSelectionTranslateEnabled ? 'bg-amber-500' : 'bg-gray-200'
              }`}
              title={isSelectionTranslateEnabled ? "点击关闭" : "点击开启"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isSelectionTranslateEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 页面翻译开关 */}
          <div className="flex items-center justify-between p-3 hover:bg-gray-100 transition-colors">
            <div className="flex flex-col">
              <span className="font-medium text-gray-800 text-sm">页面翻译</span>
              <span className="text-xs text-gray-500">智能翻译视口内内容</span>
            </div>
            <button
              onClick={togglePageTranslate}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                isPageTranslateEnabled ? 'bg-amber-500' : 'bg-gray-200'
              }`}
              title={isPageTranslateEnabled ? "点击关闭" : "点击开启"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPageTranslateEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 说明区域 */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
           <h3 className="text-sm font-medium text-amber-800 mb-2">使用小贴士</h3>
           <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside">
             <li><span className="font-medium">划词解析：</span>选中单词查看深度逻辑</li>
             <li><span className="font-medium">页面翻译：</span>智能过滤代码，仅译正文</li>
             <li><span className="font-medium">快捷操作：</span>网页右键菜单也可控制</li>
           </ul>
        </div>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Popup />)
}
