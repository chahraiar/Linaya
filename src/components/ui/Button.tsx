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
        return theme.colors.surfaceElevated;
      case 'ghost':
        return theme.colors.backgroundSecondary;
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
        return theme.colors.textInverse;
      case 'secondary':
      case 'glass':
      case 'ghost':
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
        <Text
          weight="medium"
          color={variant === 'primary' ? 'textInverse' : 'text'}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </>
  );

  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';

  const buttonStyle: ViewStyle = {
    minHeight: getMinHeight(),
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...getPadding(),
    backgroundColor: variant === 'glass' ? undefined : getBackgroundColor(),
    borderWidth: isGhost || isSecondary ? 1 : 0,
    borderColor: isGhost || isSecondary ? theme.colors.border : undefined,
    opacity: disabled ? 0.5 : 1,
    ...(isGhost ? theme.shadows.none : theme.shadows.soft),
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

