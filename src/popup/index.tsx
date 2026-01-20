import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import './index.css'
import { storage } from '../utils/storage'

function Popup() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    storage.get().then((settings) => {
      setEnabled(settings.enableTranslation)
    })
  }, [])

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    storage.set({ enableTranslation: checked })
  }

  return (
    <div className="w-80 p-5 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">Wordie</h1>
        <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">v1.0.0</span>
      </div>
      
      <div className="space-y-4">
        {/* 划词翻译功能块 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-800">划词翻译</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                enabled 
                  ? 'bg-green-50 text-green-600 border-green-100' 
                  : 'bg-gray-50 text-gray-400 border-gray-100'
              }`}>
                {enabled ? '已开启' : '已关闭'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={enabled}
                onChange={(e) => handleToggle(e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 transition-colors duration-200"></div>
            </label>
          </div>
          
          <p className="text-xs text-gray-500 leading-relaxed">
            {enabled 
              ? '在网页上选中英文，悬停出现的小圆点即可查看翻译解析。' 
              : '功能已关闭，选中文字将不会触发任何动作。'}
          </p>
        </div>

        {/* 底部装饰 */}
        <div className="pt-6 mt-2 border-t border-gray-50">
          <p className="text-[10px] text-gray-300 text-center tracking-wide">
            Your Language Learning Companion
          </p>
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

