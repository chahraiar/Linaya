import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../design-system/ThemeProvider';
import { Text } from './Text';
import { BlurView } from 'expo-blur';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md };
      case 'md':
        return { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg };
      case 'lg':
        return { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xl };
    }
  };

  const getMinHeight = () => {
    // Ensure minimum 44px for accessibility
    switch (size) {
      case 'sm':
        return 44;
      case 'md':
        return 48;
      case 'lg':
        return 52;
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return theme.colors.surface;
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'ghost':
      case 'glass':
        return 'transparent';
      default:
        return theme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textTertiary;
    switch (variant) {
      case 'primary':
      case 'secondary':
        return theme.colors.textInverse;
      case 'ghost':
      case 'glass':
        return theme.colors.text;
      default:
        return theme.colors.textInverse;
    }
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={{ marginRight: theme.spacing.sm }}
        />
      ) : null}
      {typeof children === 'string' ? (
        <Text weight="medium" color={variant === 'ghost' || variant === 'glass' ? 'text' : 'textInverse'}>
          {children}
        </Text>
      ) : (
        children
      )}
    </>
  );

  const buttonStyle: ViewStyle = {
    minHeight: getMinHeight(),
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...getPadding(),
    backgroundColor: variant === 'glass' ? undefined : getBackgroundColor(),
    borderWidth: variant === 'ghost' ? 1 : 0,
    borderColor: variant === 'ghost' ? theme.colors.border : undefined,
    opacity: disabled ? 0.5 : 1,
    ...theme.shadows.soft,
    ...style,
  };

  if (variant === 'glass') {
    return (
      <TouchableOpacity
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={buttonStyle}
        {...props}
      >
        <BlurView
          intensity={20}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        {buttonContent}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={buttonStyle}
      {...props}
    >
      {buttonContent}
    </TouchableOpacity>
  );
};

