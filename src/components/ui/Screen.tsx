import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../design-system/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';

export interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
  gradient?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  safeArea = true,
  gradient = true,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // For Aurora theme, use gradient background
  // For others, use solid color
  const getBackgroundColor = () => {
    if (theme.name === 'Aurora' && gradient) {
      return undefined; // Will use LinearGradient
    }
    return theme.colors.background;
  };

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          paddingTop: safeArea ? insets.top : 0,
          paddingBottom: safeArea ? insets.bottom : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );

  // For family tree screen, use light warm background
  if (theme.name === 'Aurora' && gradient) {
    return (
      <LinearGradient
        colors={['#FAF9F6', '#F5F3F0']} // Off-white to light beige
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        {content}
      </LinearGradient>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

