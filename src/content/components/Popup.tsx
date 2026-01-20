import React, { useEffect, useState, useRef } from 'react';
import { contentState, SelectionInfo } from '../state';
import { aiService, AIAnalysisResult } from '../../services/ai';
import { calculatePopupPosition } from '../../utils/dom';
import { detectInputType, playWordPronunciation } from '../../utils/text';

interface PopupProps {
  selection: SelectionInfo;
}

export const Popup: React.FC<PopupProps> = ({ selection }) => {
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Dragging state
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Initial positioning
    const { x, y } = calculatePopupPosition(selection.position);
    if (popupRef.current) {
      popupRef.current.style.left = `${x}px`;
      popupRef.current.style.top = `${y}px`;
    }

    // Fetch data
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await aiService.analyzeText(selection.text, selection.context);
        if (data) {
          setResult(data);
        } else {
          setError('API returned no data');
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selection]);

  // Dragging logic - using direct DOM manipulation for performance
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !popupRef.current) return;
      
      e.preventDefault(); // Prevent text selection while dragging
      
      // Calculate new position in absolute coordinates (including scroll)
      const newX = e.clientX + window.scrollX - dragOffset.current.x;
      const newY = e.clientY + window.scrollY - dragOffset.current.y;
      
      popupRef.current.style.left = `${newX}px`;
      popupRef.current.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      if (popupRef.current) {
        popupRef.current.style.cursor = 'default';
        const handle = popupRef.current.querySelector('#popup-drag-handle') as HTMLElement;
        if (handle) handle.style.cursor = 'grab';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      isDragging.current = true;
      
      popupRef.current.style.cursor = 'grabbing';
      const handle = popupRef.current.querySelector('#popup-drag-handle') as HTMLElement;
      if (handle) handle.style.cursor = 'grabbing';
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    contentState.hidePopup();
  };

  const inputType = detectInputType(selection.text);

  return (
    <div 
      ref={popupRef}
      className="logic-lens-popup"
      style={{
        position: 'absolute', 
        zIndex: 999999,
        pointerEvents: 'auto'
        // Initial left/top set via ref in useEffect
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="logic-lens-popup-header" 
        id="popup-drag-handle"
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab' }}
      >
        <span className="logic-lens-popup-label">Wordie <span className="logic-lens-popup-label-translation">小词苗</span></span>
        <button className="logic-lens-popup-close" onClick={handleClose} title="关闭">×</button>
      </div>

      <div className="logic-lens-popup-content">
        {loading && (
          <div className="logic-lens-popup-loading">
            <div className="logic-lens-spinner"></div>
            <span>正在分析...</span>
          </div>
        )}

        {error && !loading && (
          <div className="logic-lens-popup-result">
             <div className="logic-lens-popup-section-content" style={{ color: '#ef4444', padding: '16px' }}>
                {error}
                <div style={{ fontSize: '12px', marginTop: '8px' }}>请检查 API 配置和网络连接。</div>
             </div>
          </div>
        )}

        {result && !loading && (
          <div className="logic-lens-popup-result">
            {/* 仅在非句子模式下显示原文信息区块 */}
            {inputType !== 'sentence' && (
              <div className="logic-lens-popup-text">
                <div className="logic-lens-popup-word-info">
                  <strong id="popup-selected-text">{result.correctedText || selection.text}</strong>
                  {inputType === 'word' && result.phonetic && (
                    <span className="logic-lens-popup-phonetic">{result.phonetic}</span>
                  )}
                  {inputType === 'word' && (
                    <button 
                      className="logic-lens-popup-pronounce-btn" 
                      title="播放发音"
                      onClick={() => playWordPronunciation(result.correctedText || selection.text)}
                    >
                      🔉
                    </button>
                  )}
                </div>
                {inputType === 'word' && result.contextMeaning && (
                  <div className="logic-lens-popup-context-meaning">{result.contextMeaning}</div>
                )}
              </div>
            )}

            <div className="logic-lens-popup-section">
              <div className="logic-lens-popup-section-title">中文直译</div>
              <div className="logic-lens-popup-section-content">{result.translation}</div>
            </div>

            {inputType === 'word' && result.coreLogic && (
              <div className="logic-lens-popup-section">
                <div className="logic-lens-popup-section-title">核心逻辑</div>
                <div className="logic-lens-popup-section-content" style={{ whiteSpace: 'pre-wrap' }}>
                  {result.coreLogic}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
