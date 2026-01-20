import React, { useEffect, useState } from 'react';
import { contentState } from './state';
import { Indicator } from './components/Indicator';
import { Popup } from './components/Popup';
import { storage } from '../utils/storage';

export const App: React.FC = () => {
  const [state, setState] = useState({
    selection: contentState.selection,
    isIndicatorVisible: contentState.isIndicatorVisible,
    isPopupVisible: contentState.isPopupVisible
  });
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // 订阅内部状态
    const unsubscribeState = contentState.subscribe(() => {
      setState({
        selection: contentState.selection,
        isIndicatorVisible: contentState.isIndicatorVisible,
        isPopupVisible: contentState.isPopupVisible
      });
    });

    // 获取并订阅设置
    storage.get().then((settings) => {
      setEnabled(settings.enableTranslation);
    });

    const unsubscribeStorage = storage.onChanged((changes) => {
      if (changes.enableTranslation !== undefined) {
        setEnabled(changes.enableTranslation);
      }
    });

    return () => {
      unsubscribeState();
      unsubscribeStorage();
    };
  }, []);

  if (!state.selection) return null;

  return (
    <>
      {state.isIndicatorVisible && enabled && (
        <Indicator selection={state.selection} />
      )}
      {state.isPopupVisible && (
        <Popup selection={state.selection} />
      )}
    </>
  );
};
