import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'linaya:language';

export const getStoredLanguage = (): string => {
  try {
    const language = localStorage.getItem(LANGUAGE_KEY);
    return language || 'fr';
  } catch {
    return 'fr';
  }
};

export const setStoredLanguage = (language: string): void => {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
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
    lng: getStoredLanguage(),
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

