import { baseColors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';
import { shadows } from '../tokens/shadows';
import { typography } from '../tokens/typography';

/**
 * Theme type definition
 */
export interface Theme {
  name: string;
  colors: {
    // Backgrounds
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    
    // Surfaces (for cards, modals, etc.)
    surface: string;
    surfaceElevated: string;
    
    // Text
    text: string;
    textSecondary: string;
    textTertiary: string;
    textInverse: string;
    
    // Borders
    border: string;
    borderLight: string;
    
    // Accents
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    
    // Status
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Overlays
    overlay: string;
    overlayDark: string;
    
    // Glassmorphism
    glassBackground: string;
    glassBorder: string;
  };
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  typography: typeof typography;
}

export type ThemeName = 'Aurora' | 'Graphite' | 'Ivory';

