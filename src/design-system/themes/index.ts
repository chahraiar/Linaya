/**
 * Themes export
 */

export * from './types';
export * from './aurora';
export * from './graphite';
export * from './ivory';

import { auroraTheme } from './aurora';
import { graphiteTheme } from './graphite';
import { ivoryTheme } from './ivory';
import { ThemeName, Theme } from './types';

export const themes: Record<ThemeName, Theme> = {
  Aurora: auroraTheme,
  Graphite: graphiteTheme,
  Ivory: ivoryTheme,
};

export const getTheme = (name: ThemeName): Theme => {
  return themes[name];
};

