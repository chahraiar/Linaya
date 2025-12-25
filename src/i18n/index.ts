import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '../utils/storage';

import fr from './locales/fr.json';
import en from './locales/en.json';

const LANGUAGE_KEY = '@linaya:language';

export const getStoredLanguage = async (): Promise<string> => {
  try {
    const language = await storage.getItem(LANGUAGE_KEY);
    return language || 'fr';
  } catch {
    return 'fr';
  }
};

export const setStoredLanguage = async (language: string): Promise<void> => {
  try {
    await storage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

