import { Theme } from './types';
import { spacing, radius, shadows, typography } from '../tokens';
import { baseColors } from '../tokens/colors';

/**
 * Aurora theme - Cold gradient with blue/purple tones
 */
export const auroraTheme: Theme = {
  name: 'Aurora',
  colors: {
    // Backgrounds - cold gradient base
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Will be handled as solid in RN
    backgroundSecondary: '#1a1a2e',
    backgroundTertiary: '#16213e',
    
    // Surfaces with glassmorphism
    surface: 'rgba(255, 255, 255, 0.1)',
    surfaceElevated: 'rgba(255, 255, 255, 0.15)',
    
    // Text
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)',
    textTertiary: 'rgba(255, 255, 255, 0.6)',
    textInverse: '#1a1a2e',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.2)',
    borderLight: 'rgba(255, 255, 255, 0.1)',
    
    // Accents
    primary: '#64B5F6',
    primaryLight: '#90CAF9',
    primaryDark: '#42A5F5',
    secondary: '#BA68C8',
    
    // Status
    success: baseColors.success,
    warning: baseColors.warning,
    error: baseColors.error,
    info: baseColors.info,
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.3)',
    overlayDark: 'rgba(0, 0, 0, 0.6)',
    
    // Glassmorphism
    glassBackground: 'rgba(255, 255, 255, 0.08)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',
  },
  spacing,
  radius,
  shadows,
  typography,
};

