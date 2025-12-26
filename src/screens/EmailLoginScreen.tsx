import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Button, Text, Screen, Input } from '../components/ui';
import { Spacer } from '../components/ui/Spacer';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { RootStackParamList } from '../navigation/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const EmailLoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = t('auth.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('auth.validation.emailInvalid');
    }

    // Password validation
    if (!password) {
      newErrors.password = t('auth.validation.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) {
      return;
    }

    if (!isSupabaseReady) {
      Alert.alert(
        t('auth.error'),
        'Supabase n\'est pas configuré. Veuillez créer un fichier .env avec vos identifiants Supabase.'
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.user && data.session) {
        // Successfully signed in, navigate to FamilyTree
        navigation.replace('FamilyTree');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Handle specific error cases
      let errorMessage = error.message || t('auth.emailError');
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = t('auth.invalidCredentials');
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = t('auth.emailNotConfirmed');
      }

      Alert.alert(t('auth.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text variant="display" weight="bold" color="text" style={styles.title}>
                {t('auth.signIn')}
              </Text>
              <Spacer size="sm" />
              <Text variant="body" color="textSecondary" style={styles.subtitle}>
                {t('auth.signInSubtitle')}
              </Text>
            </View>

            <Spacer size="xl" />

            {/* Form */}
            <View style={styles.form}>
              <Input
                label={t('auth.email')}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                error={errors.email}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />

              <Input
                label={t('auth.password')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
                error={errors.password}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
              />

              <Spacer size="md" />

              <Button
                variant="primary"
                size="lg"
                onPress={handleSignIn}
                loading={loading}
                disabled={loading}
                style={styles.signInButton}
              >
                <Text variant="subheading" weight="semibold" color="textInverse">
                  {t('auth.signInButton')}
                </Text>
              </Button>

              <Spacer size="md" />

              <Button
                variant="ghost"
                size="md"
                onPress={() => navigation.navigate('SignUp')}
                disabled={loading}
              >
                <Text variant="body" color="textSecondary">
                  {t('auth.dontHaveAccount')}
                </Text>
              </Button>

              <Spacer size="sm" />

              <Button
                variant="ghost"
                size="sm"
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Text variant="caption" color="textTertiary">
                  {t('common.cancel')}
                </Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  signInButton: {
    width: '100%',
  },
});

