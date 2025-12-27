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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
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
  // Don't use theme on login screen - keep it neutral with fixed colors
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
    <Screen style={styles.container} noThemeBackground={true}>
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

      {/* Dark gradient overlay for better text contrast */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.8)']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Header - Top of screen with glassmorphism card */}
        <View style={styles.header}>
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerTextContainer}>
              <Text
                variant="display"
                weight="bold"
                style={styles.title}
              >
                {t('auth.welcome')}
              </Text>
              <Spacer size="xs" />
              <Text variant="subheading" style={styles.subtitle}>
                {t('auth.subtitle')}
              </Text>
            </View>
          </BlurView>
        </View>

        {/* Buttons - Bottom of screen with elegant glassmorphism card */}
        <View style={styles.buttonsWrapper}>
          <BlurView intensity={30} tint="dark" style={styles.buttonsBlur}>
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
                <Text variant="body" weight="medium" style={{ color: '#FFFFFF' }}>
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
              <Text variant="body" weight="medium" style={{ color: '#FFFFFF' }}>
                {t('auth.signUp')}
              </Text>
            </Button>
            </View>
          </BlurView>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTextContainer: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  title: {
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buttonsWrapper: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  buttonsBlur: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonsCard: {
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButton: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  socialLogo: {
    width: 40,
    height: 40,
  },
  emailButton: {
    width: '100%',
    minHeight: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
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
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
});