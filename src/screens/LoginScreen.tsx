import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Button, Text, Screen } from '../components/ui';
import { Spacer } from '../components/ui/Spacer';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { RootStackParamList } from '../navigation/navigation';
import * as WebBrowser from 'expo-web-browser';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Complete auth session for OAuth
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const video = useRef<Video>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    // Start video playback
    video.current?.playAsync();
  }, []);

  const handleGoogleSignIn = async () => {
    if (!isSupabaseReady) {
      Alert.alert(
        t('auth.error'),
        'Supabase n\'est pas configuré. Veuillez créer un fichier .env avec vos identifiants Supabase.'
      );
      return;
    }

    try {
      setLoading('google');
      const redirectUrl = Platform.OS === 'web' 
        ? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:8081/auth/callback')
        : 'linaya://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // On web, the redirect happens automatically
      // On mobile, open the OAuth URL in browser
      if (Platform.OS !== 'web' && data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          // Supabase handles the session automatically via deep link
          // Check if user is authenticated
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            navigation.replace('FamilyTree');
          }
        }
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      Alert.alert(t('auth.error'), error.message || t('auth.googleError'));
    } finally {
      setLoading(null);
    }
  };

  const handleFacebookSignIn = async () => {
    if (!isSupabaseReady) {
      Alert.alert(
        t('auth.error'),
        'Supabase n\'est pas configuré. Veuillez créer un fichier .env avec vos identifiants Supabase.'
      );
      return;
    }

    try {
      setLoading('facebook');
      const redirectUrl = Platform.OS === 'web' 
        ? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:8081/auth/callback')
        : 'linaya://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // On web, the redirect happens automatically
      // On mobile, open the OAuth URL in browser
      if (Platform.OS !== 'web' && data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success') {
          // Supabase handles the session automatically via deep link
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            navigation.replace('FamilyTree');
          }
        }
      }
    } catch (error: any) {
      console.error('Facebook sign in error:', error);
      Alert.alert(t('auth.error'), error.message || t('auth.facebookError'));
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSignIn = () => {
    navigation.navigate('EmailLogin' as any);
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp' as any);
  };

  return (
    <Screen style={styles.container}>
      {/* Video Background */}
      <Video
        ref={video}
        source={require('../../assets/famille.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
          if (status.isLoaded && !status.isPlaying && !status.didJustFinish) {
            video.current?.playAsync();
          }
        }}
      />

      {/* Dark overlay for better text readability */}
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header - Top of screen */}
        <View style={styles.header}>
          <Text
            size="xxl"
            weight="bold"
            color="textInverse"
            style={styles.title}
          >
            {t('auth.welcome')}
          </Text>
          <Spacer size="sm" />
          <Text size="lg" color="textInverse" style={styles.subtitle}>
            {t('auth.subtitle')}
          </Text>
        </View>

        {/* Buttons - Bottom of screen */}
        <View style={styles.buttonsContainer}>
          {/* Google and Facebook on same row */}
          <View style={styles.socialButtonsRow}>
            {/* Google Sign In */}
            <Button
              variant="glass"
              size="lg"
              onPress={handleGoogleSignIn}
              loading={loading === 'google'}
              disabled={loading !== null}
              style={[styles.socialButton, styles.googleButton]}
            >
              <Image
                source={require('../../assets/logo-google-48.png')}
                style={styles.socialLogo}
                resizeMode="contain"
              />
            </Button>

            <Spacer size="md" horizontal />

            {/* Facebook Sign In */}
            <Button
              variant="glass"
              size="lg"
              onPress={handleFacebookSignIn}
              loading={loading === 'facebook'}
              disabled={loading !== null}
              style={[styles.socialButton, styles.facebookButton]}
            >
              <Image
                source={require('../../assets/logo-facebook-48.png')}
                style={styles.socialLogo}
                resizeMode="contain"
              />
            </Button>
          </View>

          <Spacer size="md" />

          {/* Email Sign In */}
          <Button
            variant="glass"
            size="lg"
            onPress={handleEmailSignIn}
            disabled={loading !== null}
            style={styles.button}
          >
            <View style={styles.buttonContent}>
              <Text size="lg" weight="medium" color="textInverse">
                ✉️ {t('auth.signInWithEmail')}
              </Text>
            </View>
          </Button>

          <Spacer size="md" />

          {/* Sign Up */}
          <Button
            variant="ghost"
            size="lg"
            onPress={handleSignUp}
            disabled={loading !== null}
            style={[styles.button, styles.signUpButton]}
          >
            <Text size="md" weight="medium" color="textInverse">
              {t('auth.signUp')}
            </Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80, // Top padding for header - push text higher
    paddingBottom: 60, // Bottom padding for buttons - push buttons lower
  },
  header: {
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 20, // Push buttons to bottom
  },
  socialButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  socialButton: {
    flex: 1,
    minHeight: 56,
    aspectRatio: 1, // Make buttons square
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    marginRight: 8,
  },
  facebookButton: {
    marginLeft: 8,
  },
  socialLogo: {
    width: 48,
    height: 48,
  },
  button: {
    width: '100%',
    minHeight: 56,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButton: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
  },
});

