import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, Text, Screen } from '../components/ui';
import { Spacer } from '../components/ui/Spacer';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { RootStackParamList } from '../navigation/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const EmailLoginScreen: React.FC = () => {
  // Use neutral colors for login screen - independent of theme
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <Screen style={styles.container} noThemeBackground={true}>
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
              <Text variant="display" weight="bold" style={styles.title}>
                {t('auth.signIn')}
              </Text>
              <Spacer size="sm" />
              <Text variant="body" style={styles.subtitle}>
                {t('auth.signInSubtitle')}
              </Text>
            </View>

            <Spacer size="xl" />

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text variant="body" weight="medium" style={styles.label}>
                  {t('auth.email')}
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor="#999999"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
                {errors.email && (
                  <Text variant="caption" style={styles.error}>
                    {errors.email}
                  </Text>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text variant="body" weight="medium" style={styles.label}>
                  {t('auth.password')}
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor="#999999"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) {
                        setErrors({ ...errors, password: undefined });
                      }
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.eyeIcon}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text variant="caption" style={styles.error}>
                    {errors.password}
                  </Text>
                )}
              </View>

              <Spacer size="md" />

              <Button
                variant="primary"
                size="lg"
                onPress={handleSignIn}
                loading={loading}
                disabled={loading}
                style={styles.signInButton}
              >
                <Text variant="subheading" weight="semibold" style={{ color: '#FFFFFF' }}>
                  {t('auth.signInButton')}
                </Text>
              </Button>

              <Spacer size="md" />

              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                disabled={loading}
                style={styles.secondaryButton}
                activeOpacity={0.7}
              >
                <Text variant="body" style={styles.secondaryButtonText}>
                  {t('auth.dontHaveAccount')}
                </Text>
              </TouchableOpacity>

              <Spacer size="sm" />

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                disabled={loading}
                style={styles.cancelButton}
                activeOpacity={0.7}
              >
                <Text variant="caption" style={styles.cancelButtonText}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#F5F5F0', // Neutral light background
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
    color: '#1a1a2e', // Dark text for light background
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666666', // Medium gray for subtitle
    fontSize: 16,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    color: '#1a1a2e', // Dark text
    fontSize: 16,
    fontWeight: '500',
  },
  inputWrapper: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a2e', // Dark text
    minHeight: 48,
    flex: 1,
  },
  passwordInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 48, // ✅ Espace pour le bouton œil
    fontSize: 16,
    color: '#1a1a2e', // Dark text
    minHeight: 48,
    flex: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  eyeIcon: {
    fontSize: 20,
  },
  error: {
    marginTop: 6,
    color: '#D32F2F', // Red for errors
    fontSize: 12,
  },
  signInButton: {
    width: '100%',
    backgroundColor: '#1976D2', // Primary blue
  },
  // ✅ Bouton secondaire corrigé - pas de fond blanc
  secondaryButton: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // Pas de backgroundColor (transparent par défaut)
    // Pas de borderWidth (pas de bordure)
    // Pas de shadow
  },
  secondaryButtonText: {
    color: '#666666',
    fontSize: 16,
  },
  cancelButton: {
    width: '100%',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // Pas de backgroundColor (transparent par défaut)
    // Pas de borderWidth (pas de bordure)
    // Pas de shadow
  },
  cancelButtonText: {
    color: '#999999',
    fontSize: 14,
  },
});

