export interface Settings {
  enableTranslation: boolean;
}

export const defaultSettings: Settings = {
  enableTranslation: true,
};

export const storage = {
  get: async (): Promise<Settings> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(defaultSettings, (items) => {
        resolve(items as Settings);
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
        if (changes.enableTranslation) {
          newSettings.enableTranslation = changes.enableTranslation.newValue;
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
