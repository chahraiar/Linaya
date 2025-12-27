import React from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../design-system/ThemeProvider';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="body" weight="medium" style={[styles.label, { color: '#1A1A1A' }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: '#FFFFFF', // Fond blanc fixe pour visibilité
            borderColor: error ? theme.colors.error : '#E0E0E0', // Bordure grise fixe
            color: '#1A1A1A', // Texte sombre fixe pour visibilité
          },
          style,
        ]}
        placeholderTextColor="#999999" // Placeholder gris fixe
        {...props}
      />
      {error && (
        <Text variant="caption" color="error" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48, // Accessibility: minimum 44px
  },
  error: {
    marginTop: 4,
    fontSize: 12,
  },
});

