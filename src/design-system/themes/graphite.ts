import { Theme } from './types';
import { spacing, radius, shadows, typography } from '../tokens';
import { baseColors } from '../tokens/colors';

/**
 * Graphite theme - Dark gray/charcoal tones
 */
export const graphiteTheme: Theme = {
  name: 'Graphite',
  colors: {
    // Backgrounds - dark gray gradient
    background: '#1a1a2e',
    backgroundSecondary: '#16213e',
    backgroundTertiary: '#0f1419',
    
    // Surfaces
    surface: 'rgba(255, 255, 255, 0.05)',
    surfaceElevated: 'rgba(255, 255, 255, 0.08)',
    
    // Text
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.75)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    textInverse: '#FFFFFF',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.15)',
    borderLight: 'rgba(255, 255, 255, 0.08)',
    
    // Accents
    primary: '#90CAF9',
    primaryLight: '#BBDEFB',
    primaryDark: '#64B5F6',
    secondary: '#A1887F',
    
    // Status
    success: baseColors.success,
    warning: baseColors.warning,
    error: baseColors.error,
    info: baseColors.info,
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayDark: 'rgba(0, 0, 0, 0.7)',
    
    // Glassmorphism
    glassBackground: 'rgba(255, 255, 255, 0.06)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
  },
  spacing,
  radius,
  shadows,
  typography,
};

