/**
 * Cross-platform storage utility
 * Uses AsyncStorage on native, localStorage on web
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: async (key: string): Promise<string | null> => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string): Promise<void> => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      },
      removeItem: async (key: string): Promise<void> => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      },
    };
  }
  return AsyncStorage;
};

export const storage = getStorage();

