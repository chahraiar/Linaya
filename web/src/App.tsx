import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase, isSupabaseReady } from './lib/supabase';
import LoginScreen from './screens/LoginScreen';
import FamilyTreeScreen from './screens/FamilyTreeScreen';
import PersonDetailScreen from './screens/PersonDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import AuthCallbackScreen from './screens/AuthCallbackScreen';
import './App.css';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    // Check for common .env mistakes
    const envVars = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'));
    const hasDoubleUnderscore = envVars.some(k => k.includes('VITE__'));
    
    if (hasDoubleUnderscore) {
      setConfigError(
        '❌ ERROR: You used VITE__ (double underscore) instead of VITE_ (single underscore) in your .env file.\n\n' +
        'Please change:\n' +
        '  VITE__SUPABASE_URL → VITE_SUPABASE_URL\n' +
        '  VITE__SUPABASE_ANON_KEY → VITE_SUPABASE_ANON_KEY\n\n' +
        'Then restart the server (npm run dev).'
      );
      setLoading(false);
      return;
    }

    if (!isSupabaseReady) {
      setConfigError(
        'Supabase is not configured. Please check your .env file.\n\n' +
        'Make sure you use VITE_ prefix (single underscore, not double).'
      );
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setConfigError('Failed to connect to Supabase. Please check your configuration.');
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (configError) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        padding: '24px',
        fontSize: '1rem',
        color: 'var(--error-color)',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h1 style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>Configuration Error</h1>
        <p style={{ marginBottom: '16px', whiteSpace: 'pre-line' }}>{configError}</p>
        <div style={{ 
          background: 'var(--bg-light)', 
          padding: '16px', 
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          textAlign: 'left',
          width: '100%'
        }}>
          <p style={{ marginBottom: '8px' }}>Create a <code>.env</code> file in the <code>web/</code> directory:</p>
          <pre style={{ margin: 0 }}>
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
          </pre>
          <p style={{ marginTop: '16px', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-gray)' }}>
            ⚠️ Note: Vite uses <code>VITE_</code> prefix (not <code>EXPO_PUBLIC_</code>)
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: 'var(--text-gray)'
      }}>
        Chargement...
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route 
          path="/login" 
          element={session ? <Navigate to="/" /> : <LoginScreen />} 
        />
        <Route 
          path="/" 
          element={session ? <FamilyTreeScreen /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/person/:personId" 
          element={session ? <PersonDetailScreen /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={session ? <SettingsScreen /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/privacy" 
          element={<PrivacyPolicyScreen />} 
        />
        <Route 
          path="/auth/callback" 
          element={<AuthCallbackScreen />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

