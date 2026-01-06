import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import familleVideo from '../../assets/famille.mp4';
import googleLogo from '../../assets/logo-google-48.png';
import facebookLogo from '../../assets/logo-facebook-48.png';
import linayaLogo from '../../assets/Linaya2.png';
import { showSuccess } from '../utils/notifications';
import './LoginScreen.css';

const LoginScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Start video playback
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        showSuccess(t('auth.signUpSuccess'));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || t('auth.loginError'));
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || t('auth.facebookError'));
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Video Background */}
      <video
        ref={videoRef}
        className="login-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={familleVideo} type="video/mp4" />
      </video>
      
      {/* Dark overlay for better text contrast */}
      <div className="login-overlay" />

      <div className="login-container">
        <div className="login-header">
          <img src={linayaLogo} alt="Linaya" className="login-logo" />
          <h1 className="login-title">{t('auth.welcome')}</h1>
          <p className="login-subtitle">{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleEmailLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required
                disabled={loading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            {!isSignUp && (
              <Link to="/forgot-password" className="forgot-password-link">
                {t('auth.forgotPassword')}
              </Link>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? t('common.loading') : (isSignUp ? t('auth.signUp') : t('auth.signInButton'))}
          </button>
        </form>

        <div className="login-divider">
          <span>{t('auth.or')}</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="btn btn-google"
          disabled={loading}
        >
          <img src={googleLogo} alt="Google" className="btn-icon" />
          {t('auth.signInWithGoogle')}
        </button>

        <button 
          onClick={handleFacebookLogin}
          className="btn btn-facebook"
          disabled={loading}
        >
          <img src={facebookLogo} alt="Facebook" className="btn-icon" />
          {t('auth.signInWithFacebook')}
        </button>

        <div className="login-footer">
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="link-button"
          >
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
          </button>
          <div className="login-footer-links">
            <Link to="/privacy" className="link-button">
              {t('privacy.link')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

