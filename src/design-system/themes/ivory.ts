import { Theme } from './types';
import { spacing, radius, shadows, typography } from '../tokens';
import { baseColors } from '../tokens/colors';

/**
 * Ivory theme - Light, warm tones
 */
export const ivoryTheme: Theme = {
  name: 'Ivory',
  colors: {
    // Backgrounds - light warm gradient
    background: '#F5F5F0',
    backgroundSecondary: '#FAFAF5',
    backgroundTertiary: '#FFFFFF',
    
    // Surfaces
    surface: 'rgba(255, 255, 255, 0.7)',
    surfaceElevated: 'rgba(255, 255, 255, 0.9)',
    
    // Text
    text: '#1a1a2e',
    textSecondary: 'rgba(26, 26, 46, 0.7)',
    textTertiary: 'rgba(26, 26, 46, 0.5)',
    textInverse: '#FFFFFF',
    
    // Borders
    border: 'rgba(26, 26, 46, 0.15)',
    borderLight: 'rgba(26, 26, 46, 0.08)',
    
    // Accents
    primary: '#1976D2',
    primaryLight: '#42A5F5',
    primaryDark: '#1565C0',
    secondary: '#7B1FA2',
    
    // Status
    success: baseColors.success,
    warning: baseColors.warning,
    error: baseColors.error,
    info: baseColors.info,
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.2)',
    overlayDark: 'rgba(0, 0, 0, 0.5)',
    
    // Glassmorphism
    glassBackground: 'rgba(255, 255, 255, 0.6)',
    glassBorder: 'rgba(26, 26, 46, 0.1)',
  },
  spacing,
  radius,
  shadows,
  typography,
};

