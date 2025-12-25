// Import polyfill for web first
import './src/polyfills/import-meta';

import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/design-system/ThemeProvider';
import { useSettingsStore } from './src/store/settingsStore';
import { getStoredLanguage } from './src/i18n';
import i18n from './src/i18n';
import { AppNavigation } from './src/navigation/navigation';

/**
 * Main App Component
 * Sets up all providers and initializes the app
 */
const AppContent: React.FC = () => {
  const { theme, setTheme, language } = useSettingsStore();

  // Initialize language on mount
  useEffect(() => {
    const initLanguage = async () => {
      const storedLanguage = await getStoredLanguage();
      if (storedLanguage !== language) {
        await i18n.changeLanguage(storedLanguage);
      } else {
        await i18n.changeLanguage(language);
      }
    };
    initLanguage();
  }, []);

  return (
    <ThemeProvider initialTheme={theme} onThemeChange={setTheme}>
      <AppNavigation />
      <StatusBar style="light" />
    </ThemeProvider>
  );
};

export default function App() {
  // Use View on web, GestureHandlerRootView on native
  const RootView = Platform.OS === 'web' ? View : GestureHandlerRootView;
  
  return (
    <RootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </RootView>
  );
}

