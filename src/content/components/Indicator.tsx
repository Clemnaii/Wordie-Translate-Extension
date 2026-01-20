import React from 'react';
import { contentState, SelectionInfo } from '../state';

interface IndicatorProps {
  selection: SelectionInfo;
}

export const Indicator: React.FC<IndicatorProps> = ({ selection }) => {
  const handleMouseEnter = (e: React.MouseEvent) => {
    // e.stopPropagation(); // 悬停触发通常不需要阻止冒泡，除非有特殊重叠
    contentState.showPopup();
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${selection.position.x + selection.position.width + 1}px`,
    top: `${selection.position.y + selection.position.height / 2 - 8}px`,
    zIndex: 999999,
    cursor: 'pointer',
    pointerEvents: 'auto',
  };

  return (
    <div 
      className="logic-lens-indicator" 
      style={style}
      onMouseEnter={handleMouseEnter}
      data-text={selection.text}
    />
  );
};
