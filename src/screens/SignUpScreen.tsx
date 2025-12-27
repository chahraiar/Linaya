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

export const SignUpScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
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
    } else if (password.length < 6) {
      newErrors.password = t('auth.validation.passwordMinLength');
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = t('auth.validation.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.validation.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
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

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        Alert.alert(
          t('auth.signUpSuccess'),
          t('auth.signUpSuccessMessage'),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                navigation.navigate('Login');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      Alert.alert(
        t('auth.error'),
        error.message || t('auth.signUpError')
      );
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
                {t('auth.signUp')}
              </Text>
              <Spacer size="sm" />
              <Text variant="body" style={styles.subtitle}>
                {t('auth.signUpSubtitle')}
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
                    autoComplete="password-new"
                    textContentType="newPassword"
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text variant="body" weight="medium" style={styles.label}>
                  {t('auth.confirmPassword')}
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    placeholderTextColor="#999999"
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: undefined });
                      }
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoComplete="password-new"
                    textContentType="newPassword"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.eyeIcon}>
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text variant="caption" style={styles.error}>
                    {errors.confirmPassword}
                  </Text>
                )}
              </View>

              <Spacer size="lg" />

              <Button
                variant="primary"
                size="lg"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading}
                style={styles.signUpButton}
              >
                <Text variant="subheading" weight="semibold" style={{ color: '#FFFFFF' }}>
                  {t('auth.createAccount')}
                </Text>
              </Button>

              <Spacer size="md" />

              {/* ✅ Bouton secondaire sans carré blanc */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                disabled={loading}
                style={styles.secondaryButton}
                activeOpacity={0.7}
              >
                <Text variant="body" style={styles.secondaryButtonText}>
                  {t('auth.alreadyHaveAccount')}
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
    backgroundColor: '#F5F5F0',
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
    color: '#1a1a2e',
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666666',
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
    color: '#1a1a2e',
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
    color: '#1a1a2e',
    minHeight: 48,
    flex: 1,
  },
  passwordInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 48, // ✅ Espace pour le bouton œil
    fontSize: 16,
    color: '#1a1a2e',
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
    color: '#D32F2F',
    fontSize: 12,
  },
  signUpButton: {
    width: '100%',
    backgroundColor: '#1976D2',
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
});