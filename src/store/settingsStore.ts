import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '../utils/storage';
import { ThemeName } from '../design-system/themes/types';
import { getStoredLanguage, setStoredLanguage } from '../i18n';
import i18n from '../i18n';

export type Language = 'fr' | 'en';

interface SettingsState {
  language: Language;
  theme: ThemeName;
  reduceAnimations: boolean;
  setLanguage: (language: Language) => Promise<void>;
  setTheme: (theme: ThemeName) => void;
  setReduceAnimations: (reduce: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'fr',
      theme: 'Aurora',
      reduceAnimations: false,
      setLanguage: async (language: Language) => {
        await setStoredLanguage(language);
        await i18n.changeLanguage(language);
        set({ language });
      },
      setTheme: (theme: ThemeName) => {
        set({ theme });
      },
      setReduceAnimations: (reduce: boolean) => {
        set({ reduceAnimations: reduce });
      },
    }),
    {
      name: 'linaya-settings',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        reduceAnimations: state.reduceAnimations,
      }),
    }
  )
);

