import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ViewStyle, View } from 'react-native';
import { useTheme } from '../../design-system/ThemeProvider';

export interface IconButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'glass';
  style?: ViewStyle;
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  size = 'md',
  variant = 'default',
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const getSize = () => {
    // Minimum 44px for accessibility
    switch (size) {
      case 'sm':
        return 40;
      case 'md':
        return 44;
      case 'lg':
        return 52;
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'default':
        return theme.colors.surface;
      case 'ghost':
      case 'glass':
        return 'transparent';
      default:
        return theme.colors.surface;
    }
  };

  const buttonStyle: ViewStyle = {
    width: getSize(),
    height: getSize(),
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: variant === 'glass' ? undefined : getBackgroundColor(),
    borderWidth: variant === 'ghost' ? 1 : 0,
    borderColor: variant === 'ghost' ? theme.colors.border : undefined,
    ...theme.shadows.soft,
    ...style,
  };

  if (variant === 'glass') {
    const { BlurView } = require('expo-blur');
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={buttonStyle}
        {...props}
      >
        <BlurView intensity={15} tint="light" style={StyleSheet.absoluteFill} />
        <View style={{ zIndex: 1 }}>{children}</View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.7} style={buttonStyle} {...props}>
      {children}
    </TouchableOpacity>
  );
};

