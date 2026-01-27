import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import './index.css'
import { storage, Settings, ApiProvider } from '../utils/storage'
import { PROVIDER_MODELS, DEFAULT_MODELS } from '../config/models'

function Popup() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    storage.get().then(setSettings)
  }, [])

  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings)
    storage.set(newSettings)
  }

  if (!settings) return null

  return (
    <div className="w-80 p-4 bg-white font-sans">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight flex items-center gap-2">
          Wordie
        </h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md transition-colors ${showSettings ? 'bg-gray-100 text-gray-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            title="设置"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.047 7.047 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">v1.0.0</span>
        </div>
      </div>
      
      {!showSettings ? (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* 划词翻译功能块 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">划词翻译</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  settings.enableTranslation 
                    ? 'bg-green-50 text-green-600 border-green-100' 
                    : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}>
                  {settings.enableTranslation ? '已开启' : '已关闭'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settings.enableTranslation}
                  onChange={(e) => updateSettings({...settings, enableTranslation: e.target.checked})}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 transition-colors duration-200"></div>
              </label>
            </div>
            
            <p className="text-xs text-gray-500 leading-normal">
              {settings.enableTranslation 
                ? '在网页上选中英文，悬停出现的小圆点即可查看翻译解析。' 
                : '功能已关闭，选中文字将不会触发任何动作。'}
            </p>
          </div>

          {/* 底部装饰 */}
          <div className="pt-4 mt-2 border-t border-gray-50">
            <p className="text-[10px] text-gray-300 text-center tracking-wide">
              您的语言学习助手
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-in slide-in-from-right-4 duration-200">
          <div className="flex items-center gap-2 mb-3 text-gray-800 pb-2 border-b border-gray-100">
            <button 
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-sm font-semibold">设置</span>
          </div>

          {/* Custom Key Toggle */}
          <div className="flex items-center justify-between group">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">自定义 API Key</span>
              <span className="text-[10px] text-gray-400">使用您自己的 API 密钥</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.useCustomKey}
                onChange={(e) => updateSettings({...settings, useCustomKey: e.target.checked})}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {settings.useCustomKey && (
            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-2.5">
              {/* Provider Select */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 ml-0.5">AI 服务商</label>
                <div className="relative">
                  <select 
                    value={settings.provider}
                    onChange={(e) => {
                      const newProvider = e.target.value as ApiProvider;
                      // Ensure model defaults correctly if not set
                      const currentModels = settings.providerModels || {};
                      if (!currentModels[newProvider]) {
                        currentModels[newProvider] = DEFAULT_MODELS[newProvider];
                      }
                      updateSettings({...settings, provider: newProvider, providerModels: currentModels})
                    }}
                    className="w-full text-sm border-gray-200 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-white py-1.5 px-2 appearance-none cursor-pointer hover:border-amber-300 transition-colors"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="alibaba">Alibaba Qwen</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>
              </div>

              {/* Model Select */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 ml-0.5">模型选择</label>
                <div className="relative">
                  <select 
                    value={settings.providerModels?.[settings.provider] || DEFAULT_MODELS[settings.provider]}
                    onChange={(e) => {
                      const newModels = { ...settings.providerModels, [settings.provider]: e.target.value };
                      updateSettings({...settings, providerModels: newModels});
                    }}
                    className="w-full text-sm border-gray-200 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 bg-white py-1.5 px-2 appearance-none cursor-pointer hover:border-amber-300 transition-colors"
                  >
                    {PROVIDER_MODELS[settings.provider].map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 ml-0.5">API 密钥</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={settings.customKeys[settings.provider] || ''}
                    onChange={(e) => {
                      const newKeys = { ...settings.customKeys, [settings.provider]: e.target.value };
                      updateSettings({...settings, customKeys: newKeys});
                    }}
                    placeholder={`sk-...`}
                    className="w-full text-sm border-gray-200 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500 py-1.5 px-2 pr-8 placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                         <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745A10.096 10.096 0 0010 17.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.48.275-2.888.781-4.18L3.28 2.22zm6.72 6.72l-1.92-1.92A4.25 4.25 0 0110 5.5a4.25 4.25 0 014.25 4.25 4.25 4.25 0 01-1.503 3.063l-1.92-1.92a2.75 2.75 0 00-2.827-2.827z" clipRule="evenodd" />
                       </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Popup />)
}

