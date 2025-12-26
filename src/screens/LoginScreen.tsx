import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
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

      {/* Gradient overlay - darker at top and bottom, lighter in middle */}
      <View style={styles.gradientOverlay} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header - Top of screen with semi-transparent background */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text
              variant="display"
              weight="bold"
              color="textInverse"
              style={styles.title}
            >
              {t('auth.welcome')}
            </Text>
            <Spacer size="xs" />
            <Text variant="subheading" color="textInverse" style={styles.subtitle}>
              {t('auth.subtitle')}
            </Text>
          </View>
        </View>

        {/* Buttons - Bottom of screen with elegant card */}
        <View style={styles.buttonsWrapper}>
          <View style={styles.buttonsCard}>
            {/* Social buttons row */}
            <View style={styles.socialButtonsRow}>
              {/* Google Sign In */}
              <Button
                variant="ghost"
                size="lg"
                onPress={handleGoogleSignIn}
                loading={loading === 'google'}
                disabled={loading !== null}
                style={styles.socialButton}
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
                variant="ghost"
                size="lg"
                onPress={handleFacebookSignIn}
                loading={loading === 'facebook'}
                disabled={loading !== null}
                style={styles.socialButton}
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
              variant="ghost"
              size="lg"
              onPress={handleEmailSignIn}
              disabled={loading !== null}
              style={styles.emailButton}
            >
              <View style={styles.buttonContent}>
                <Text variant="body" weight="medium" color="textInverse">
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
              style={styles.signUpButton}
            >
              <Text variant="body" weight="medium" color="textInverse">
                {t('auth.signUp')}
              </Text>
            </Button>
          </View>
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
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Simulating gradient with opacity layers
    // Dark at top (20% opacity)
    // Lighter in middle (visible faces)
    // Dark at bottom (40% opacity for button area)
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTextContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  title: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buttonsWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  buttonsCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    padding: 20,
    backdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButton: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  socialLogo: {
    width: 40,
    height: 40,
  },
  emailButton: {
    width: '100%',
    minHeight: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButton: {
    width: '100%',
    minHeight: 56,
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});