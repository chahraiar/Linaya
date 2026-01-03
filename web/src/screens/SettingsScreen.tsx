import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { setStoredLanguage } from '../i18n';
import { getUserTrees, findPersonByEmailInTree, shareTreeByEmail } from '../services/treeService';
import { ShareIcon } from '@heroicons/react/24/outline';
import './SettingsScreen.css';

const SettingsScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [treeId, setTreeId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePersonId, setSharePersonId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTreeId();
  }, []);

  const loadTreeId = async () => {
    try {
      const trees = await getUserTrees();
      if (trees.length > 0) {
        setTreeId(trees[0].id);
      }
    } catch (error) {
      console.error('Error loading tree:', error);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setStoredLanguage(lang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleFindPerson = async () => {
    if (!treeId || !shareEmail.trim()) {
      setShareMessage({ type: 'error', text: t('settings.noPersonFound') });
      return;
    }

    try {
      const person = await findPersonByEmailInTree(treeId, shareEmail.trim());
      if (person) {
        setSharePersonId(person.personId);
        setShareMessage({ type: 'success', text: `Personne trouvée : ${person.displayName || `${person.firstName} ${person.lastName}`}` });
      } else {
        setSharePersonId(null);
        setShareMessage({ type: 'error', text: t('settings.noPersonFound') });
      }
    } catch (error: any) {
      console.error('Error finding person:', error);
      setShareMessage({ type: 'error', text: error.message || t('settings.shareError') });
    }
  };

  const handleShareTree = async () => {
    if (!treeId || !shareEmail.trim() || !sharePersonId) {
      setShareMessage({ type: 'error', text: 'Veuillez d\'abord trouver une personne' });
      return;
    }

    setIsSharing(true);
    setShareMessage(null);

    try {
      const result = await shareTreeByEmail(treeId, shareEmail.trim(), 'viewer');
      if (result && result.success) {
        // Generate share link
        const shareLink = `${window.location.origin}/?treeId=${treeId}`;
        const message = `${result.message || t('settings.shareSuccess')}\n\nLien de partage : ${shareLink}`;
        setShareMessage({ type: 'success', text: message });
        setShareEmail('');
        setSharePersonId(null);
        
        // Copy link to clipboard
        try {
          await navigator.clipboard.writeText(shareLink);
          setTimeout(() => {
            setShareMessage({ type: 'success', text: `${message}\n\n✅ Lien copié dans le presse-papier !` });
          }, 100);
        } catch (clipboardError) {
          // Clipboard not available, just show the link
        }
      } else {
        setShareMessage({ type: 'error', text: t('settings.shareError') });
      }
    } catch (error: any) {
      console.error('Error sharing tree:', error);
      setShareMessage({ type: 'error', text: error.message || t('settings.shareError') });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="settings-screen">
      <div className="settings-container">
        <header className="settings-header">
          <button onClick={() => navigate(-1)} className="btn-back">
            ← {t('common.back')}
          </button>
          <h1>{t('settings.title')}</h1>
        </header>

        <div className="settings-content">
          <div className="settings-section">
            <h2>{t('settings.shareTree')}</h2>
            <p className="settings-description">{t('settings.shareTreeDescription')}</p>
            
            <div className="share-tree-form">
              <div className="form-group">
                <label>{t('settings.selectPerson')}</label>
                <div className="input-with-button">
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@example.com"
                    value={shareEmail}
                    onChange={(e) => {
                      setShareEmail(e.target.value);
                      setSharePersonId(null);
                      setShareMessage(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFindPerson();
                      }
                    }}
                  />
                  <button
                    onClick={handleFindPerson}
                    className="btn btn-secondary"
                    disabled={!shareEmail.trim()}
                  >
                    {t('common.search')}
                  </button>
                </div>
              </div>

              {shareMessage && (
                <div className={`share-message ${shareMessage.type}`}>
                  {shareMessage.text}
                </div>
              )}

              {sharePersonId && (
                <button
                  onClick={handleShareTree}
                  className="btn btn-primary"
                  disabled={isSharing}
                >
                  <ShareIcon className="icon-inline" /> {isSharing ? t('common.loading') : t('settings.shareButton')}
                </button>
              )}
            </div>
          </div>

          <div className="settings-section">
            <h2>{t('settings.language')}</h2>
            <div className="settings-options">
              <button
                onClick={() => handleLanguageChange('fr')}
                className={`btn-option ${i18n.language === 'fr' ? 'active' : ''}`}
              >
                Français
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`btn-option ${i18n.language === 'en' ? 'active' : ''}`}
              >
                English
              </button>
            </div>
          </div>

          <div className="settings-section">
            <button onClick={handleLogout} className="btn btn-danger">
              {t('settings.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;

