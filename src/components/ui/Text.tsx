import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../design-system/ThemeProvider';

export interface TextProps extends RNTextProps {
  variant?: 'body' | 'caption' | 'heading' | 'subheading' | 'display';
  color?: 'text' | 'textSecondary' | 'textTertiary' | 'textInverse' | 'primary' | 'error';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'text',
  weight = 'regular',
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getFontSize = () => {
    switch (variant) {
      case 'display':
        return theme.typography.fontSize.display;
      case 'heading':
        return theme.typography.fontSize.xxxl;
      case 'subheading':
        return theme.typography.fontSize.xl;
      case 'body':
        return theme.typography.fontSize.md;
      case 'caption':
        return theme.typography.fontSize.sm;
      default:
        return theme.typography.fontSize.md;
    }
  };

  const getLineHeight = () => {
    switch (variant) {
      case 'display':
        return theme.typography.lineHeight.display;
      case 'heading':
        return theme.typography.lineHeight.xxxl;
      case 'subheading':
        return theme.typography.lineHeight.xl;
      case 'body':
        return theme.typography.lineHeight.md;
      case 'caption':
        return theme.typography.lineHeight.sm;
      default:
        return theme.typography.lineHeight.md;
    }
  };

  const getColor = () => {
    switch (color) {
      case 'text':
        return theme.colors.text;
      case 'textSecondary':
        return theme.colors.textSecondary;
      case 'textTertiary':
        return theme.colors.textTertiary;
      case 'textInverse':
        return theme.colors.textInverse;
      case 'primary':
        return theme.colors.primary;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.text;
    }
  };

  const getFontWeight = () => {
    switch (variant) {
      case 'display':
      case 'heading':
        return theme.typography.fontWeight.bold;
      case 'subheading':
        return theme.typography.fontWeight.semibold;
      default:
        return theme.typography.fontWeight[weight];
    }
  };

  return (
    <RNText
      style={[
        {
          fontSize: getFontSize(),
          lineHeight: getLineHeight(),
          color: getColor(),
          fontWeight: getFontWeight(),
        },
        style,
      ]}
      {...props}
    />
  );
};

