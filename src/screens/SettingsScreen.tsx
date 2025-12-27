import React from 'react';
import { View, StyleSheet, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { ThemeName } from '../design-system/themes/types';
import { Screen, Text, Button, Card, Spacer } from '../components/ui';

export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    language,
    theme: currentTheme,
    reduceAnimations,
    setLanguage,
    setTheme,
    setReduceAnimations,
  } = useSettingsStore();

  const themes: ThemeName[] = ['Aurora', 'Graphite', 'Ivory'];

  return (
    <Screen style={{ backgroundColor: '#F5F5F0' }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text variant="heading" style={styles.title}>
          {t('settings.title')}
        </Text>

        <Spacer size="lg" />

        {/* Language Section */}
        <Card variant="elevated" padding="lg" style={styles.card}>
          <Text variant="subheading" style={styles.sectionTitle}>
            {t('settings.language')}
          </Text>
          <Text style={styles.sectionDescription}>
            {t('settings.languageDescription')}
          </Text>
          <Spacer size="md" />
          <View style={styles.optionsRow}>
            <Button
              variant={language === 'fr' ? 'primary' : 'ghost'}
              onPress={() => setLanguage('fr')}
              style={styles.optionButton}
            >
              <Text style={language === 'fr' ? undefined : styles.ghostButtonText}>
                Français
              </Text>
            </Button>
            <Button
              variant={language === 'en' ? 'primary' : 'ghost'}
              onPress={() => setLanguage('en')}
              style={styles.optionButton}
            >
              <Text style={language === 'en' ? undefined : styles.ghostButtonText}>
                English
              </Text>
            </Button>
          </View>
        </Card>

        <Spacer size="md" />

        {/* Theme Section */}
        <Card variant="elevated" padding="lg" style={styles.card}>
          <Text variant="subheading" style={styles.sectionTitle}>
            {t('settings.theme')}
          </Text>
          <Text style={styles.sectionDescription}>
            {t('settings.themeDescription')}
          </Text>
          <Spacer size="md" />
          <View style={styles.optionsRow}>
            {themes.map((themeName) => (
              <Button
                key={themeName}
                variant={currentTheme === themeName ? 'primary' : 'ghost'}
                onPress={() => setTheme(themeName)}
                style={styles.optionButton}
              >
                <Text style={currentTheme === themeName ? undefined : styles.ghostButtonText}>
                  {themeName}
                </Text>
              </Button>
            ))}
          </View>
        </Card>

        <Spacer size="md" />

        {/* Animations Section */}
        <Card variant="elevated" padding="lg" style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text variant="subheading" style={styles.sectionTitle}>
                {t('settings.reduceAnimations')}
              </Text>
            </View>
            <Switch
              value={reduceAnimations}
              onValueChange={setReduceAnimations}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surfaceElevated}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginTop: 8,
    color: '#1A1A1A', // ✅ Texte foncé
  },
  sectionTitle: {
    marginBottom: 4,
    color: '#1A1A1A', // ✅ Texte foncé
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666666', // ✅ Gris foncé pour la description
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    flex: 1,
    minWidth: 100,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF', // ✅ Fond blanc fixe pour les cards
  },
  ghostButtonText: {
    color: '#1A1A1A', // ✅ Texte sombre pour les boutons ghost
  },
});

