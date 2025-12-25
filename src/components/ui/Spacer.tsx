import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../../design-system/ThemeProvider';

export interface SpacerProps extends ViewProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  horizontal?: boolean;
}

export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  horizontal = false,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  const getSize = () => {
    return theme.spacing[size];
  };

  return (
    <View
      style={[
        horizontal ? { width: getSize() } : { height: getSize() },
        style,
      ]}
      {...props}
    />
  );
};

