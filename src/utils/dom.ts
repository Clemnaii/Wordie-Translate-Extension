/**
 * 计算选中文本的位置信息
 */
export function calculateTextPosition(range: Range): { x: number; y: number; width: number; height: number } {
  const rect = range.getBoundingClientRect();
  let finalRect = rect;

  // 尝试获取跨行文本的最后一行位置
  try {
    const endContainer = range.endContainer;
    const endOffset = range.endOffset;

    if (endOffset > 0) {
      const tempRange = document.createRange();
      tempRange.setStart(endContainer, endOffset - 1);
      tempRange.setEnd(endContainer, endOffset);
      const lastCharRect = tempRange.getBoundingClientRect();

      if (lastCharRect && lastCharRect.width > 0 && lastCharRect.height > 0) {
        finalRect = lastCharRect;
      }
    }
  } catch (e) {
    // 忽略错误，回退到原始 rect
    console.warn('Failed to calculate precise text position, falling back to bounding rect', e);
  }

  // 转换为绝对坐标
  const x = finalRect.right + window.scrollX;
  const y = finalRect.bottom + window.scrollY;

  return { 
    x, 
    y, 
    width: finalRect.width, 
    height: finalRect.height 
  };
}

/**
 * 智能计算弹窗位置，确保不超出视口
 */
export function calculatePopupPosition(
  textPosition: { x: number; y: number; width: number; height: number },
  popupWidth: number = 320,
  popupHeight: number = 200
): { x: number; y: number; strategy: string } {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };

  // 计算文本在视口中的位置
  const textViewportY = textPosition.y - viewport.scrollY;
  const textCenterY = textViewportY + textPosition.height / 2;
  const isTextInLowerHalf = textCenterY > viewport.height / 2;

  // 首选策略：放在文本右侧
  let popupX = textPosition.x + 12; // 稍微靠近一点，原逻辑是 + textPosition.width + 12，但 textPosition.x 已经是 right 了
  let popupY: number;
  let strategy = 'right';

  // 根据文本位置决定垂直方向
  if (isTextInLowerHalf) {
    // 文本在下半部分，弹窗放在上方
    popupY = textPosition.y - popupHeight - 8;
    strategy = 'right-above';
  } else {
    // 文本在上半部分，弹窗放在下方
    popupY = textPosition.y + 8; // textPosition.y 已经是 bottom 了
    strategy = 'right-below';
  }

  // 检查右侧空间
  const rightSpace = viewport.scrollX + viewport.width - popupX;
  if (rightSpace < popupWidth) {
    // 右侧空间不足，尝试左侧
    const leftX = textPosition.x - textPosition.width - popupWidth - 12;
    if (leftX >= viewport.scrollX) {
      popupX = leftX;
      strategy = isTextInLowerHalf ? 'left-above' : 'left-below';
    } else {
      // 左右都不够，使用约束位置
      popupX = Math.max(viewport.scrollX + 10, textPosition.x + 12);
      strategy = 'constrained-right';
    }
  }

  // 检查垂直空间并调整
  const topSpace = popupY - viewport.scrollY;
  const bottomSpace = viewport.scrollY + viewport.height - (popupY + popupHeight);

  if (topSpace < 0) {
    // 上方空间不足，强制放在下方
    popupY = textPosition.y + 8;
    strategy = strategy.replace('-above', '-below-forced');
  } else if (bottomSpace < 0) {
    // 下方空间不足，强制放在上方
    popupY = textPosition.y - popupHeight - 8;
    strategy = strategy.replace('-below', '-above-forced');
  }

  // 最终边界约束
  popupX = Math.max(
    viewport.scrollX + 10,
    Math.min(popupX, viewport.scrollX + viewport.width - popupWidth - 10)
  );
  popupY = Math.max(
    viewport.scrollY + 10,
    Math.min(popupY, viewport.scrollY + viewport.height - popupHeight - 10)
  );

  return { x: popupX, y: popupY, strategy };
}
