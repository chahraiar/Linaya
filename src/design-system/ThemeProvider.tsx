import React, { createContext, useContext, ReactNode } from 'react';
import { Theme, ThemeName, getTheme } from './themes';

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = 'Aurora',
  onThemeChange,
}) => {
  const [themeName, setThemeNameState] = React.useState<ThemeName>(initialTheme);
  const theme = getTheme(themeName);

  const setTheme = React.useCallback((name: ThemeName) => {
    setThemeNameState(name);
    onThemeChange?.(name);
  }, [onThemeChange]);

  const value = React.useMemo(
    () => ({ theme, themeName, setTheme }),
    [theme, themeName, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

