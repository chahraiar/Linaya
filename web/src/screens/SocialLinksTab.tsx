import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SocialLink, SocialPlatform } from '../store/personDetailStore';
import { getPersonContacts, upsertPersonContact, deletePersonContact } from '../services/treeService';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_CONFIGS, getSocialPlatformConfig } from '../config/socialPlatforms';
import { XMarkIcon, PlusIcon, LinkIcon } from '@heroicons/react/24/outline';
import { showError } from '../utils/notifications';
import './PersonDetailScreen.css';

interface SocialLinksTabProps {
  personId: string;
  canEdit: boolean;
}

const SocialLinksTab: React.FC<SocialLinksTabProps> = ({ personId, canEdit }) => {
  const { t } = useTranslation();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newLink, setNewLink] = useState<{ platform: SocialPlatform; url: string }>({
    platform: 'facebook',
    url: '',
  });

  const loadSocialLinks = useCallback(async () => {
    if (!personId) {
      setLoading(false);
      setSocialLinks([]);
      return;
    }
    
    try {
      setLoading(true);
      const contacts = await getPersonContacts(personId);
      
      // Filter social contacts and convert to SocialLink format
      const socialContacts = contacts.filter(c => c.type === 'social');
      const links: SocialLink[] = socialContacts.map(contact => {
        // Extract platform from label or default to 'autre'
        const platform = (contact.label?.toLowerCase() || 'autre') as SocialPlatform;
        return {
          id: contact.id,
          platform: SOCIAL_PLATFORMS.includes(platform) ? platform : 'autre',
          url: contact.value,
          label: contact.label || undefined,
        };
      });
      
      setSocialLinks(links);
    } catch (error) {
      console.error('Error loading social links:', error);
      setSocialLinks([]);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    loadSocialLinks();
  }, [loadSocialLinks]);


  const validateUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      // Allow URLs without protocol (will add https://)
      return url.includes('.') || url.startsWith('/');
    }
  };

  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    
    // If already has protocol, return as is
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    
    // Add https:// if it looks like a URL
    if (trimmed.includes('.')) {
      return `https://${trimmed}`;
    }
    
    return trimmed;
  };

  const handleAddLink = async () => {
    if (!validateUrl(newLink.url)) {
      showError(t('person.social.invalidUrl') || 'URL invalide');
      return;
    }

    try {
      const normalizedUrl = normalizeUrl(newLink.url);
      const platformConfig = getSocialPlatformConfig(newLink.platform);
      
      await upsertPersonContact(
        personId,
        'social',
        normalizedUrl,
        platformConfig.label,
        false,
        'tree'
      );

      // Reload links
      await loadSocialLinks();
      
      // Reset form
      setNewLink({ platform: 'facebook', url: '' });
      setIsAdding(false);
    } catch (error: any) {
      console.error('Error adding social link:', error);
      showError(error.message || t('person.social.addError') || 'Erreur lors de l\'ajout du lien');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm(t('person.social.confirmDelete') || 'Êtes-vous sûr de vouloir supprimer ce lien ?')) {
      return;
    }

    try {
      const success = await deletePersonContact(linkId);
      if (success) {
        await loadSocialLinks();
      } else {
        showError(t('person.social.deleteError') || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting social link:', error);
      showError(t('person.social.deleteError') || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="tab-content-inner">
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title">{t('person.socialNetworks')}</h3>
          {canEdit && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIsAdding(!isAdding)}
              disabled={isAdding}
            >
              <PlusIcon className="icon-inline" />
              {t('person.social.addLink') || 'Ajouter un lien'}
            </button>
          )}
        </div>

        {isAdding && canEdit && (
          <div className="social-link-form">
            <div className="form-group">
              <label>{t('person.social.platform') || 'Réseau social'}</label>
              <select
                className="form-input"
                value={newLink.platform}
                onChange={(e) => setNewLink({ ...newLink, platform: e.target.value as SocialPlatform })}
              >
                {SOCIAL_PLATFORMS.map((platform) => {
                  const config = SOCIAL_PLATFORM_CONFIGS[platform];
                  return (
                    <option key={platform} value={platform}>
                      {config.label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-group">
              <label>{t('person.social.url') || 'URL'}</label>
              <input
                type="text"
                className="form-input"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder={getSocialPlatformConfig(newLink.platform).placeholder}
              />
            </div>
            <div className="edit-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsAdding(false);
                  setNewLink({ platform: 'facebook', url: '' });
                }}
              >
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleAddLink}>
                {t('common.add')}
              </button>
            </div>
          </div>
        )}

        {socialLinks.length === 0 && !isAdding ? (
          <div className="empty-state">
            <p className="empty-field">
              {t('person.social.noLinks') || 'Aucun lien de réseau social'}
            </p>
            {canEdit && (
              <button
                className="btn btn-primary"
                onClick={() => setIsAdding(true)}
              >
                <PlusIcon className="icon-inline" />
                {t('person.social.addFirstLink') || 'Ajouter le premier lien'}
              </button>
            )}
          </div>
        ) : (
          <div className="social-links-list">
            {socialLinks.map((link) => {
              const config = getSocialPlatformConfig(link.platform);
              return (
                <div key={link.id || link.url} className="social-link-item">
                  <div className="social-link-content">
                    <div className="social-link-icon">
                      <img
                        src={config.iconPath}
                        alt={config.label}
                        onError={(e) => {
                          // Fallback to link icon if image not found
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent && !parent.querySelector('.icon-fallback')) {
                            const icon = document.createElement('div');
                            icon.className = 'icon-fallback';
                            icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
                            parent.appendChild(icon);
                          }
                        }}
                      />
                    </div>
                    <div className="social-link-info">
                      <h4 className="social-link-platform">{config.label}</h4>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-link-url"
                      >
                        <LinkIcon className="icon-inline" />
                        {link.url}
                      </a>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      className="btn-icon delete-btn"
                      onClick={() => link.id && handleDeleteLink(link.id)}
                      title={t('common.delete')}
                    >
                      <XMarkIcon className="icon" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialLinksTab;

