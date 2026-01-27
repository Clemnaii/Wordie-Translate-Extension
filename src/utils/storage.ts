import { DEFAULT_MODELS } from '../config/models';

export type ApiProvider = 'gemini' | 'openai' | 'deepseek' | 'alibaba';

export interface Settings {
  enableTranslation: boolean;
  provider: ApiProvider;
  customKeys: {
    [key in ApiProvider]?: string;
  };
  providerModels: {
    [key in ApiProvider]?: string;
  };
  useCustomKey: boolean; // Global toggle: if true, try to use custom key for selected provider
}

export const defaultSettings: Settings = {
  enableTranslation: true,
  provider: 'gemini', // Default to Gemini as it's usually free/fast
  customKeys: {},
  providerModels: { ...DEFAULT_MODELS },
  useCustomKey: false,
};

export const storage = {
  get: async (): Promise<Settings> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(defaultSettings, (items) => {
        // Ensure nested objects are merged correctly
        const merged = { ...defaultSettings, ...items };
        merged.customKeys = { ...defaultSettings.customKeys, ...items.customKeys };
        merged.providerModels = { ...defaultSettings.providerModels, ...items.providerModels };
        resolve(merged as Settings);
      });
    });
  },

  set: async (settings: Partial<Settings>): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set(settings, () => {
        resolve();
      });
    });
  },

  onChanged: (callback: (changes: Partial<Settings>) => void) => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local') {
        const newSettings: Partial<Settings> = {};
        for (const [key, change] of Object.entries(changes)) {
          // @ts-ignore
          newSettings[key as keyof Settings] = change.newValue;
        }
        if (Object.keys(newSettings).length > 0) {
          callback(newSettings);
        }
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  },
};
