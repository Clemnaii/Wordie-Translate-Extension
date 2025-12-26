import { createRoot } from 'react-dom/client'
import './index.css'

function Popup() {
  return (
    <div className="w-80 p-4">
      <h1 className="text-xl font-bold mb-2">Wordie</h1>
      <p className="text-sm text-gray-600">
        在网页上选中英文单词或短语，查看其底层逻辑解释。
      </p>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<Popup />)
}

