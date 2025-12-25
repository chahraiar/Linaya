import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../../design-system/ThemeProvider';
import { BlurView } from 'expo-blur';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return theme.spacing.sm;
      case 'md':
        return theme.spacing.md;
      case 'lg':
        return theme.spacing.lg;
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'default':
        return theme.colors.surface;
      case 'elevated':
        return theme.colors.surfaceElevated;
      case 'glass':
        return 'transparent';
      default:
        return theme.colors.surface;
    }
  };

  const cardStyle: ViewProps['style'] = {
    borderRadius: theme.radius.lg,
    backgroundColor: variant === 'glass' ? undefined : getBackgroundColor(),
    padding: getPadding(),
    borderWidth: variant === 'glass' ? 1 : 0,
    borderColor: variant === 'glass' ? theme.colors.glassBorder : undefined,
    ...(variant === 'elevated' ? theme.shadows.floating : theme.shadows.soft),
    ...style,
  };

  if (variant === 'glass') {
    return (
      <View style={cardStyle} {...props}>
        <BlurView intensity={15} tint="light" style={StyleSheet.absoluteFill} />
        <View style={{ zIndex: 1 }}>{children}</View>
      </View>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

