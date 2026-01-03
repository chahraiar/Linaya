import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

const AuthCallbackScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase détecte automatiquement les paramètres dans l'URL
        // et échange le code contre une session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          navigate('/login?error=auth_failed');
          return;
        }

        if (session) {
          // Authentification réussie, rediriger vers la page d'accueil
          navigate('/');
        } else {
          // Pas de session, rediriger vers la page de connexion
          navigate('/login?error=no_session');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        navigate('/login?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.2rem',
      color: 'var(--text-gray)'
    }}>
      {t('common.loading')}
    </div>
  );
};

export default AuthCallbackScreen;

