/**
 * 检测输入类型：词语/短语 vs 句子
 */
export function detectInputType(text: string): 'word' | 'sentence' {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);

  // 单个单词
  if (words.length === 1) {
    return 'word';
  }

  // 看起来像句子（大写开头，有句号）
  if (/^[A-Z]/.test(trimmed) && /[.!?]$/.test(trimmed)) {
    return 'sentence';
  }

  // 长度超过一定限制且有多个单词
  if (words.length > 3 && trimmed.length > 20) {
    return 'sentence';
  }

  return 'word';
}

/**
 * 播放单词发音
 */
export function playWordPronunciation(word: string) {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.8;
  utterance.pitch = 1;

  // 尝试获取更自然的声音
  const voices = window.speechSynthesis.getVoices();
  // 优先选择 Google 或 Microsoft 的英语声音
  const englishVoice = voices.find(voice => 
    voice.lang.startsWith('en') && 
    (voice.name.includes('Google') || voice.name.includes('Natural') || voice.name.includes('Premium'))
  ) || voices.find(voice => voice.lang.startsWith('en'));

  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
}
