import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { usePersonDetailStore } from '../store/personDetailStore';
import { useTranslation } from 'react-i18next';
import {
  updatePerson,
  getPersonContacts,
  upsertPersonContact,
  uploadPersonPhoto,
  getPersonPhotoUrl,
  ContactDB,
  getTreeData,
  isSelfPerson,
  deletePerson,
  getUserTreeRole,
  getPersonTreeId,
  deleteRelationship,
  setPersonVisibility,
  getPersonMedia,
  getPersonMediaUrl,
  uploadPersonMedia,
  deletePersonMedia,
  PersonMedia,
} from '../services/treeService';
import { supabase } from '../lib/supabase';
import { AddRelativeModal } from '../components/AddRelativeModal';
import { LinkExistingPersonModal } from '../components/LinkExistingPersonModal';
import {
  PencilIcon,
  XMarkIcon,
  TrashIcon,
  CameraIcon,
  UserIcon,
  LinkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import './PersonDetailScreen.css';

type TabType = 'data' | 'events' | 'media' | 'relatives';

const PersonDetailScreen = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { getPerson, updatePerson: updatePersonInStore, setPersons, deletePerson: deletePersonFromStore } = useFamilyTreeStore();
  const { getPersonDetails } = usePersonDetailStore();

  const [activeTab, setActiveTab] = useState<TabType>('data');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingData, setIsEditingData] = useState(false);

  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [editedBirthDate, setEditedBirthDate] = useState('');
  const [editedDeathDate, setEditedDeathDate] = useState('');
  const [editedGender, setEditedGender] = useState<string>('');
  const [editedNotes, setEditedNotes] = useState('');

  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedMobile, setEditedMobile] = useState('');
  const [editedAddress, setEditedAddress] = useState('');

  const [contacts, setContacts] = useState<ContactDB[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [showLinkParentModal, setShowLinkParentModal] = useState(false);
  const [showLinkChildModal, setShowLinkChildModal] = useState(false);
  const [showLinkPartnerModal, setShowLinkPartnerModal] = useState(false);

  const person = personId ? getPerson(personId) : null;
  const details = personId ? getPersonDetails(personId) : null;

  useEffect(() => {
    if (personId) {
      loadContacts();
      loadPhoto();
      checkIfSelf();
      loadUserTreeRole();
    }
  }, [personId]);

  const loadUserTreeRole = async () => {
    if (!personId) return;
    
    try {
      // Get tree_id from person
      const treeId = await getPersonTreeId(personId);
      if (treeId) {
        const role = await getUserTreeRole(treeId);
        setCanEdit(role === 'owner' || role === 'editor');
      }
    } catch (error) {
      console.error('Error loading user tree role:', error);
      setCanEdit(false);
    }
  };

  useEffect(() => {
    if (person && isEditing) {
      setEditedFirstName(person.firstName || '');
      setEditedLastName(person.lastName || '');
      // Use full date if available, otherwise construct from year
      setEditedBirthDate(person.birthDate || (person.birthYear ? `${person.birthYear}-01-01` : ''));
      setEditedDeathDate(person.deathDate || (person.deathYear ? `${person.deathYear}-01-01` : ''));
      setEditedGender(person.gender || '');
    }
  }, [person, isEditing]);

  useEffect(() => {
    if (person && isEditingData) {
      setEditedFirstName(person.firstName || '');
      setEditedLastName(person.lastName || '');
      // Use full date if available, otherwise construct from year
      setEditedBirthDate(person.birthDate || (person.birthYear ? `${person.birthYear}-01-01` : ''));
      setEditedDeathDate(person.deathDate || (person.deathYear ? `${person.deathYear}-01-01` : ''));
      setEditedGender(person.gender || '');
      setEditedNotes('');
    }
  }, [person, isEditingData]);

  const checkIfSelf = async () => {
    if (!personId) return;
    try {
      const self = await isSelfPerson(personId);
      setIsSelf(self);
    } catch (error) {
      console.error('Error checking if self person:', error);
      setIsSelf(false);
    }
  };

  const loadPhoto = async () => {
    if (!personId) return;
    try {
      const url = await getPersonPhotoUrl(personId);
      setPhotoUrl(url);
    } catch (error) {
      console.error('Error loading photo:', error);
    }
  };

  const loadContacts = async () => {
    if (!personId) return;
    setIsLoadingContacts(true);
    try {
      const loadedContacts = await getPersonContacts(personId);
      setContacts(loadedContacts);

      const emailContact = loadedContacts.find((c) => c.type === 'email' && c.is_primary);
      const phoneContact = loadedContacts.find(
        (c) => c.type === 'other' && c.label?.toLowerCase().includes('phone')
      );
      const mobileContact = loadedContacts.find((c) => c.type === 'mobile' && c.is_primary);
      const addressContact = loadedContacts.find(
        (c) => c.type === 'other' && c.label?.toLowerCase().includes('address')
      );

      if (emailContact) setEditedEmail(emailContact.value);
      if (phoneContact) setEditedPhone(phoneContact.value);
      if (mobileContact) setEditedMobile(mobileContact.value);
      if (addressContact) setEditedAddress(addressContact.value);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSave = async () => {
    if (!personId) return;

    // Validate gender is required
    if (!editedGender || (editedGender !== 'male' && editedGender !== 'female')) {
      alert('Le genre est obligatoire. Veuillez sélectionner Masculin ou Féminin.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedPerson = await updatePerson(personId, {
        firstName: editedFirstName.trim() || undefined,
        lastName: editedLastName.trim() || undefined,
        displayName: `${editedFirstName.trim()} ${editedLastName.trim()}`.trim() || undefined,
        birthDate: editedBirthDate || null,
        deathDate: editedDeathDate || null,
        gender: editedGender,
        notes: editedNotes || undefined,
      });

      if (updatedPerson) {
        updatePersonInStore(personId, {
          firstName: updatedPerson.firstName,
          lastName: updatedPerson.lastName,
          birthYear: updatedPerson.birthYear,
          deathYear: updatedPerson.deathYear,
          birthDate: updatedPerson.birthDate,
          deathDate: updatedPerson.deathDate,
          gender: updatedPerson.gender,
        });

        setIsEditing(false);
        alert('Modifications enregistrées');
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving person:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveData = async () => {
    if (!personId) return;

    // Validate gender is required
    if (!editedGender || (editedGender !== 'male' && editedGender !== 'female')) {
      alert('Le genre est obligatoire. Veuillez sélectionner Masculin ou Féminin.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedPerson = await updatePerson(personId, {
        firstName: editedFirstName.trim() || undefined,
        lastName: editedLastName.trim() || undefined,
        displayName: `${editedFirstName.trim()} ${editedLastName.trim()}`.trim() || undefined,
        birthDate: editedBirthDate || null,
        deathDate: editedDeathDate || null,
        gender: editedGender,
        notes: editedNotes || undefined,
      });

      if (updatedPerson) {
        updatePersonInStore(personId, {
          firstName: updatedPerson.firstName,
          lastName: updatedPerson.lastName,
          birthYear: updatedPerson.birthYear,
          deathYear: updatedPerson.deathYear,
          birthDate: updatedPerson.birthDate,
          deathDate: updatedPerson.deathDate,
          gender: updatedPerson.gender,
        });
      }

      if (editedEmail.trim()) {
        try {
          await upsertPersonContact(personId, 'email', editedEmail.trim(), 'Email principal', true);
        } catch (error: any) {
          alert(error.message || 'Erreur lors de l\'enregistrement de l\'email');
          setIsSaving(false);
          return;
        }
      }
      if (editedPhone.trim()) {
        await upsertPersonContact(personId, 'other', editedPhone.trim(), 'Téléphone', false);
      }
      if (editedMobile.trim()) {
        await upsertPersonContact(personId, 'mobile', editedMobile.trim(), 'Mobile', true);
      }
      if (editedAddress.trim()) {
        await upsertPersonContact(personId, 'other', editedAddress.trim(), 'Adresse', false);
      }

      await loadContacts();

      setIsEditingData(false);
      alert('Modifications enregistrées');
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!personId || !person) return;

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${person.firstName} ${person.lastName} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deletePerson(personId);
      
      deletePersonFromStore(personId);

      alert('Personne supprimée avec succès');
      navigate(-1);
    } catch (error: any) {
      console.error('Error deleting person:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      
      if (errorMessage.includes('own person') || errorMessage.includes('self person')) {
        alert('Vous ne pouvez pas supprimer votre propre profil');
      } else {
        alert(`Erreur lors de la suppression: ${errorMessage}`);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!personId || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsUploadingPhoto(true);
    try {
      const url = await uploadPersonPhoto(personId, file);
      if (url) {
        setPhotoUrl(url);
        alert('Photo uploadée avec succès');
      } else {
        alert('Erreur lors de l\'upload de la photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erreur lors de l\'upload de la photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleReloadData = async () => {
    if (!personId) return;
    try {
      const { data: treeIdData } = await supabase
        .rpc('get_person_tree_id', { p_person_id: personId });
      
      if (treeIdData) {
        const { persons } = await getTreeData(treeIdData);
        setPersons(persons);
      }
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  if (!person) {
    return (
      <div className="person-detail-screen">
        <div className="person-detail-container">
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const fullName = `${person.firstName} ${person.lastName}`.trim() || 'Sans nom';

  return (
    <div className="person-detail-screen">
      <div className="person-detail-container">
        <header className="person-detail-header">
          <button onClick={() => navigate(-1)} className="btn-back">
            <ArrowLeftIcon className="icon-inline" /> {t('common.back')}
          </button>
          <h1>{t('person.profile')}</h1>
          <div className="header-right-buttons">
            {canEdit && !isSelf && (
              <button
                onClick={handleDeletePerson}
                className="btn-icon delete-btn"
                disabled={isDeleting}
                title={t('person.deletePerson')}
              >
                <TrashIcon className="icon" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn-icon"
                title={isEditing ? t('common.cancel') : t('common.edit')}
              >
                {isEditing ? (
                  <XMarkIcon className="icon" />
                ) : (
                  <PencilIcon className="icon" />
                )}
              </button>
            )}
          </div>
        </header>

        <div className="person-detail-content">
          <div className="profile-header">
            <div className="avatar-container">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={fullName} 
                  className="avatar-image"
                  style={{
                    width: '100px',
                    height: '100px',
                    minWidth: '100px',
                    minHeight: '100px',
                    maxWidth: '100px',
                    maxHeight: '100px',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div className="avatar">
                  <UserIcon className="avatar-icon" />
                </div>
              )}
              {canEdit && (
                <label className="camera-button" title={t('person.changePhoto')}>
                  {isUploadingPhoto ? (
                    <span className="loading-spinner-small"></span>
                  ) : (
                    <CameraIcon className="camera-icon" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {isEditing ? (
              <>
                <input
                  type="text"
                  className="edit-input"
                  value={editedFirstName}
                  onChange={(e) => setEditedFirstName(e.target.value)}
                  placeholder={t('person.firstName')}
                />
                <input
                  type="text"
                  className="edit-input"
                  value={editedLastName}
                  onChange={(e) => setEditedLastName(e.target.value)}
                  placeholder={t('person.lastName')}
                />
                <input
                  type="date"
                  className="edit-input"
                  value={editedBirthDate}
                  onChange={(e) => setEditedBirthDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
                <input
                  type="date"
                  className="edit-input"
                  value={editedDeathDate}
                  onChange={(e) => setEditedDeathDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
                <div className="edit-buttons">
                  <button onClick={() => setIsEditing(false)} disabled={isSaving} className="btn btn-secondary">
                    {t('common.cancel')}
                  </button>
                  <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
                    {t('common.save')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="person-name">{fullName}</h2>
                {person.birthDate && (
                  <p className="birth-info">
                    {t('person.born')} : {new Date(person.birthDate).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    {person.deathDate ? `• ${t('person.died')} : ${new Date(person.deathDate).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}` : ''}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="tabs-container">
            <button
              className={`tab ${activeTab === 'data' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              {t('person.data')}
            </button>
            <button
              className={`tab ${activeTab === 'events' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('events')}
            >
              {t('person.events')}
            </button>
            <button
              className={`tab ${activeTab === 'media' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              {t('person.media')}
            </button>
            <button
              className={`tab ${activeTab === 'relatives' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('relatives')}
            >
              {t('person.relatives')}
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'data' && (
              <DataTab
                person={person}
                details={details}
                contacts={contacts}
                isLoadingContacts={isLoadingContacts}
                isEditing={isEditingData}
                setIsEditing={setIsEditingData}
                canEdit={canEdit}
                editedFirstName={editedFirstName}
                setEditedFirstName={setEditedFirstName}
                editedLastName={editedLastName}
                setEditedLastName={setEditedLastName}
                editedBirthDate={editedBirthDate}
                setEditedBirthDate={setEditedBirthDate}
                editedDeathDate={editedDeathDate}
                setEditedDeathDate={setEditedDeathDate}
                editedGender={editedGender}
                setEditedGender={setEditedGender}
                editedNotes={editedNotes}
                setEditedNotes={setEditedNotes}
                editedEmail={editedEmail}
                setEditedEmail={setEditedEmail}
                editedPhone={editedPhone}
                setEditedPhone={setEditedPhone}
                editedMobile={editedMobile}
                setEditedMobile={setEditedMobile}
                editedAddress={editedAddress}
                setEditedAddress={setEditedAddress}
                onSave={handleSaveData}
                isSaving={isSaving}
              />
            )}
            {activeTab === 'events' && <EventsTab person={person} details={details} />}
            {activeTab === 'media' && <MediaTab person={person} details={details} canEdit={canEdit} />}
            {activeTab === 'relatives' && (
              <RelativesTab 
                person={person}
                canEdit={canEdit}
                onShowAddParent={() => setShowAddParentModal(true)}
                onShowAddChild={() => setShowAddChildModal(true)}
                onShowAddPartner={() => setShowAddPartnerModal(true)}
                onShowLinkParent={() => setShowLinkParentModal(true)}
                onShowLinkChild={() => setShowLinkChildModal(true)}
                onShowLinkPartner={() => setShowLinkPartnerModal(true)}
              />
            )}
          </div>
        </div>

        {/* Modals */}
        <AddRelativeModal
          visible={showAddParentModal}
          onClose={() => setShowAddParentModal(false)}
          personId={person?.id || ''}
          relationshipType="parent"
          onPersonAdded={handleReloadData}
        />
        <AddRelativeModal
          visible={showAddChildModal}
          onClose={() => setShowAddChildModal(false)}
          personId={person?.id || ''}
          relationshipType="child"
          onPersonAdded={handleReloadData}
        />
        <AddRelativeModal
          visible={showAddPartnerModal}
          onClose={() => setShowAddPartnerModal(false)}
          personId={person?.id || ''}
          relationshipType="partner"
          onPersonAdded={handleReloadData}
        />
        
        <LinkExistingPersonModal
          visible={showLinkParentModal}
          onClose={() => setShowLinkParentModal(false)}
          personId={person?.id || ''}
          relationshipType="parent"
          onRelationshipCreated={handleReloadData}
        />
        <LinkExistingPersonModal
          visible={showLinkChildModal}
          onClose={() => setShowLinkChildModal(false)}
          personId={person?.id || ''}
          relationshipType="child"
          onRelationshipCreated={handleReloadData}
        />
        <LinkExistingPersonModal
          visible={showLinkPartnerModal}
          onClose={() => setShowLinkPartnerModal(false)}
          personId={person?.id || ''}
          relationshipType="partner"
          onRelationshipCreated={handleReloadData}
        />
      </div>
    </div>
  );
};

interface DataTabProps {
  person: any;
  details: any;
  contacts: ContactDB[];
  isLoadingContacts: boolean;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  canEdit: boolean;
  editedFirstName: string;
  setEditedFirstName: (value: string) => void;
  editedLastName: string;
  setEditedLastName: (value: string) => void;
  editedBirthDate: string;
  setEditedBirthDate: (value: string) => void;
  editedDeathDate: string;
  setEditedDeathDate: (value: string) => void;
  editedGender: string;
  setEditedGender: (value: string) => void;
  editedNotes: string;
  setEditedNotes: (value: string) => void;
  editedEmail: string;
  setEditedEmail: (value: string) => void;
  editedPhone: string;
  setEditedPhone: (value: string) => void;
  editedMobile: string;
  setEditedMobile: (value: string) => void;
  editedAddress: string;
  setEditedAddress: (value: string) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

const DataTab: React.FC<DataTabProps> = ({
  person,
  contacts,
  isLoadingContacts,
  isEditing,
  setIsEditing,
  canEdit,
  editedFirstName,
  setEditedFirstName,
  editedLastName,
  setEditedLastName,
  editedBirthDate,
  setEditedBirthDate,
  editedDeathDate,
  setEditedDeathDate,
  editedGender,
  setEditedGender,
  editedNotes,
  setEditedNotes,
  editedEmail,
  setEditedEmail,
  editedPhone,
  setEditedPhone,
  editedMobile,
  setEditedMobile,
  editedAddress,
  setEditedAddress,
  onSave,
  isSaving,
}) => {
  const { t } = useTranslation();

  const emailContact = contacts.find((c) => c.type === 'email' && c.is_primary);
  const phoneContact = contacts.find(
    (c) => c.type === 'other' && c.label?.toLowerCase().includes('téléphone')
  );
  const mobileContact = contacts.find((c) => c.type === 'mobile' && c.is_primary);
  const addressContact = contacts.find(
    (c) => c.type === 'other' && c.label?.toLowerCase().includes('adresse')
  );

  const displayEmail = isEditing ? editedEmail : emailContact?.value || '';
  const displayPhone = isEditing ? editedPhone : phoneContact?.value || '';
  const displayMobile = isEditing ? editedMobile : mobileContact?.value || '';
  const displayAddress = isEditing ? editedAddress : addressContact?.value || '';

  if (isLoadingContacts && !isEditing) {
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
          <h3 className="section-title">{t('person.profile') || 'Informations personnelles'}</h3>
          {canEdit && !isEditing && (
            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>
              ✏️
            </button>
          )}
        </div>

        {isEditing ? (
          <>
            <input
              type="text"
              className="form-input"
              value={editedFirstName}
              onChange={(e) => setEditedFirstName(e.target.value)}
              placeholder={t('person.firstName')}
            />
            <input
              type="text"
              className="form-input"
              value={editedLastName}
              onChange={(e) => setEditedLastName(e.target.value)}
              placeholder={t('person.lastName')}
            />
            <input
              type="date"
              className="form-input"
              value={editedBirthDate}
              onChange={(e) => setEditedBirthDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <input
              type="date"
              className="form-input"
              value={editedDeathDate}
              onChange={(e) => setEditedDeathDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
            <div className="gender-container">
              <label className="gender-label">
                {t('person.gender.label') || 'Genre'} <span className="required">*</span>
              </label>
              <div className="gender-options">
                {[
                  { value: 'male', label: 'Masculin', icon: '👨' },
                  { value: 'female', label: 'Féminin', icon: '👩' },
                ].map((gender) => (
                  <button
                    key={gender.value}
                    className={`btn ${editedGender === gender.value ? 'btn-primary' : 'btn-secondary'} btn-sm gender-btn`}
                    onClick={() => setEditedGender(gender.value)}
                  >
                    <span className="gender-icon">{gender.icon}</span>
                    <span className="gender-text">{gender.label}</span>
                  </button>
                ))}
              </div>
              {!editedGender && (
                <p className="gender-error">Le genre est obligatoire</p>
              )}
            </div>
            <textarea
              className="form-input notes-input"
              value={editedNotes}
              onChange={(e) => setEditedNotes(e.target.value)}
              placeholder={t('person.notes') || 'Notes'}
              rows={4}
            />
            <div className="edit-buttons">
              <button onClick={() => setIsEditing(false)} disabled={isSaving} className="btn btn-secondary">
                {t('common.cancel')}
              </button>
              <button onClick={onSave} disabled={isSaving} className="btn btn-primary">
                {t('common.save')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="info-row">
              <span className="info-label">{t('person.firstName')}</span>
              <span className="info-value">{person.firstName || '-'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">{t('person.lastName')}</span>
              <span className="info-value">{person.lastName || '-'}</span>
            </div>
            {person.birthDate && (
              <div className="info-row">
                <span className="info-label">{t('person.birth')}</span>
                <span className="info-value">
                  {new Date(person.birthDate).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            {person.deathDate && (
              <div className="info-row">
                <span className="info-label">{t('person.death')}</span>
                <span className="info-value">
                  {new Date(person.deathDate).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            {person.gender && (
              <div className="info-row">
                <span className="info-label">{t('person.gender.label') || 'Genre'}</span>
                <span className="info-value">
                  {person.gender === 'male' ? t('person.gender.male') : person.gender === 'female' ? t('person.gender.female') : person.gender}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="section-card">
        <h3 className="section-title">{t('person.contact')}</h3>

        {isEditing ? (
          <>
            <input
              type="email"
              className="form-input"
              value={editedEmail}
              onChange={(e) => setEditedEmail(e.target.value)}
              placeholder="email@example.com"
            />
            <input
              type="tel"
              className="form-input"
              value={editedPhone}
              onChange={(e) => setEditedPhone(e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
            <input
              type="tel"
              className="form-input"
              value={editedMobile}
              onChange={(e) => setEditedMobile(e.target.value)}
              placeholder="+33 6 12 34 56 78"
            />
            <input
              type="text"
              className="form-input"
              value={editedAddress}
              onChange={(e) => setEditedAddress(e.target.value)}
              placeholder="123 Rue Example, 75001 Paris"
            />
          </>
        ) : (
          <>
            {displayEmail && (
              <div className="contact-row">
                <span className="contact-label">📧 {t('person.email')}</span>
                <span className="contact-value">{displayEmail}</span>
              </div>
            )}
            {displayPhone && (
              <div className="contact-row">
                <span className="contact-label">📞 {t('person.phone')}</span>
                <span className="contact-value">{displayPhone}</span>
              </div>
            )}
            {displayMobile && (
              <div className="contact-row">
                <span className="contact-label">📱 {t('person.mobile')}</span>
                <span className="contact-value">{displayMobile}</span>
              </div>
            )}
            {displayAddress && (
              <div className="contact-row">
                <span className="contact-label">📍 {t('person.address')}</span>
                <span className="contact-value">{displayAddress}</span>
              </div>
            )}
            {!displayEmail && !displayPhone && !displayMobile && !displayAddress && (
              <p className="empty-field">{t('person.noContactInfo') || 'Aucune information de contact'}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const EventsTab: React.FC<{ person: any; details: any }> = ({ details }) => {
  const { t } = useTranslation();

  if (!details || !details.events || details.events.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('person.noEvents') || 'Aucun événement'}</p>
      </div>
    );
  }

  return (
    <div className="tab-content-inner">
      {details.events.map((event: any) => (
        <div key={event.id} className="event-card">
          <div className="event-header">
            <span className="event-icon">
              {event.type === 'birth' ? '🎂' : event.type === 'death' ? '🕯️' : event.type === 'marriage' ? '💍' : event.type === 'divorce' ? '💔' : '📅'}
            </span>
            <div className="event-info">
              <h4 className="event-type">
                {event.type === 'birth' ? t('person.birth') : event.type === 'death' ? t('person.death') : event.type === 'marriage' ? t('person.marriage') : event.type === 'divorce' ? t('person.divorce') : event.type}
              </h4>
              <p className="event-date">
                {new Date(event.date).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {event.place && <p className="event-place">📍 {event.place}</p>}
              {event.description && <p className="event-description">{event.description}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface MediaTabProps {
  person: any;
  details: any;
  canEdit: boolean;
}

const MediaTab: React.FC<MediaTabProps> = ({ person, canEdit }) => {
  const { t } = useTranslation();
  const [media, setMedia] = useState<PersonMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMedia();
  }, [person.id]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const mediaList = await getPersonMedia(person.id);
      setMedia(mediaList);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('La taille du fichier ne doit pas dépasser 10MB');
      return;
    }

    try {
      setUploading(true);
      const newMedia = await uploadPersonMedia(person.id, file);
      if (newMedia) {
        await loadMedia();
        alert('Photo ajoutée avec succès');
      } else {
        alert('Erreur lors de l\'ajout de la photo');
      }
    } catch (error: any) {
      console.error('Error uploading media:', error);
      alert(`Erreur lors de l'ajout de la photo: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!canEdit) return;

    const confirmMessage = 'Êtes-vous sûr de vouloir supprimer cette photo ?';
    if (!confirm(confirmMessage)) return;

    try {
      const success = await deletePersonMedia(mediaId);
      if (success) {
        await loadMedia();
        alert('Photo supprimée avec succès');
      } else {
        alert('Erreur lors de la suppression de la photo');
      }
    } catch (error: any) {
      console.error('Error deleting media:', error);
      alert(`Erreur lors de la suppression de la photo: ${error.message || 'Erreur inconnue'}`);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p className="empty-field">{t('common.loading') || 'Chargement...'}</p>
      </div>
    );
  }

  return (
    <div className="tab-content-inner">
      {canEdit && (
        <div className="media-upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <CameraIcon className="icon-inline" />
            {uploading ? 'Upload en cours...' : 'Ajouter une photo'}
          </button>
        </div>
      )}

      {media.length === 0 ? (
        <div className="empty-state">
          <div className="empty-media-card">
            <p className="empty-media-text">
              {t('person.noPhotos') || 'Aucune photo'} {person.firstName} {person.lastName}
            </p>
            <p className="empty-media-subtext">{t('person.addPhotos') || 'Ajoutez des photos'}</p>
          </div>
        </div>
      ) : (
        <div className="media-grid">
          {media.map((item) => (
            <MediaItem
              key={item.id}
              media={item}
              onDelete={canEdit ? () => handleDeleteMedia(item.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface MediaItemProps {
  media: PersonMedia;
  onDelete?: () => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ media, onDelete }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImageUrl();
  }, [media.storage_path]);

  const loadImageUrl = async () => {
    try {
      setLoading(true);
      const url = await getPersonMediaUrl(media.storage_path);
      setImageUrl(url);
    } catch (error) {
      console.error('Error loading media URL:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="media-item">
      {loading ? (
        <div className="media-item-placeholder">Chargement...</div>
      ) : imageUrl ? (
        <img src={imageUrl} alt={media.caption || 'Photo'} className="media-item-image" />
      ) : (
        <div className="media-item-placeholder">Erreur de chargement</div>
      )}
      {media.caption && <p className="media-item-caption">{media.caption}</p>}
      {onDelete && (
        <button className="media-item-delete" onClick={onDelete} title="Supprimer">
          <XMarkIcon className="icon-inline" />
        </button>
      )}
      {media.is_primary && (
        <span className="media-item-primary-badge">Photo principale</span>
      )}
    </div>
  );
};

interface RelativesTabProps {
  person: any;
  canEdit: boolean;
  onShowAddParent: () => void;
  onShowAddChild: () => void;
  onShowAddPartner: () => void;
  onShowLinkParent: () => void;
  onShowLinkChild: () => void;
  onShowLinkPartner: () => void;
}

const RelativesTab: React.FC<RelativesTabProps> = ({
  person,
  canEdit,
  onShowAddParent,
  onShowAddChild,
  onShowAddPartner,
  onShowLinkParent,
  onShowLinkChild,
  onShowLinkPartner,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getPerson, getAllPersons, setPersons, updatePerson: updatePersonInStore } = useFamilyTreeStore();

  // Safety check: if person is null or undefined, return empty state
  if (!person) {
    return (
      <div className="tab-content-inner">
        <div className="empty-state">
          <p className="empty-field">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const parents = (person.parentIds || []).map((id: string) => getPerson(id)).filter(Boolean);
  const partner = person.partnerId ? getPerson(person.partnerId) : null;
  const children = (person.childrenIds || []).map((id: string) => getPerson(id)).filter(Boolean);

  const allPersons = getAllPersons();
  const siblings = allPersons.filter((p) => {
    if (p.id === person.id) return false;
    const pParentIds = p.parentIds || [];
    const personParentIds = person.parentIds || [];
    return pParentIds.some((parentId: string) => personParentIds.includes(parentId));
  });

  const handlePersonPress = (personId: string) => {
    navigate(`/person/${personId}`);
  };

  const handleRemoveRelative = async (
    relativePersonId: string,
    relationType: 'parent' | 'partner' | 'child'
  ) => {
    if (!canEdit) return;
    
    const confirmMessage = `Êtes-vous sûr de vouloir retirer cette relation ?`;
    if (!confirm(confirmMessage)) return;

    try {
      let fromId: string;
      let toId: string;
      let type: 'parent' | 'partner';

      if (relationType === 'parent') {
        // Parent relationship: parent -> person
        fromId = relativePersonId;
        toId = person.id;
        type = 'parent';
      } else if (relationType === 'partner') {
        // Partner relationship: person <-> partner (direction doesn't matter)
        fromId = person.id;
        toId = relativePersonId;
        type = 'partner';
      } else if (relationType === 'child') {
        // Child relationship: person -> child
        fromId = person.id;
        toId = relativePersonId;
        type = 'parent';
      } else {
        return;
      }

      const success = await deleteRelationship(fromId, toId, type);
      
      if (success) {
        // Reload tree data to refresh relationships
        const treeId = await getPersonTreeId(person.id);
        if (treeId) {
          const { persons: updatedPersons } = await getTreeData(treeId);
          setPersons(updatedPersons);
          // Reload current person data
          const updatedPerson = updatedPersons.find(p => p.id === person.id);
          if (updatedPerson) {
            updatePersonInStore(updatedPerson.id, updatedPerson);
          }
        }
        alert('Relation retirée avec succès');
      } else {
        alert('Erreur lors de la suppression de la relation');
      }
    } catch (error) {
      console.error('Error removing relative:', error);
      alert('Erreur lors de la suppression de la relation');
    }
  };

  const RelativeCard: React.FC<{ 
    person: any; 
    relation: string;
    relationType: 'parent' | 'partner' | 'child';
  }> = ({ person, relation, relationType }) => {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(person.isVisible !== false);

    useEffect(() => {
      let cancelled = false;
      
      const loadPhoto = async () => {
        try {
          const url = await getPersonPhotoUrl(person.id);
          if (!cancelled && url) {
            setPhotoUrl(url);
          } else if (!cancelled) {
            setPhotoUrl(null);
          }
        } catch (error) {
          console.error('Error loading photo for', person.id, ':', error);
          if (!cancelled) {
            setPhotoUrl(null);
          }
        }
      };
      
      loadPhoto();
      
      return () => {
        cancelled = true;
      };
    }, [person.id]);

    const handleVisibilityToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (!canEdit) return;

      const newVisibility = !isVisible;
      try {
        const success = await setPersonVisibility(person.id, newVisibility);
        if (success) {
          setIsVisible(newVisibility);
          // Update person in store
          updatePersonInStore(person.id, { isVisible: newVisibility });
          alert(newVisibility ? 'Carte affichée dans l\'arbre' : 'Carte masquée dans l\'arbre');
        } else {
          alert('Erreur lors de la modification de la visibilité');
        }
      } catch (error: any) {
        console.error('Error toggling visibility:', error);
        alert(`Erreur lors de la modification de la visibilité: ${error.message || 'Erreur inconnue'}`);
      }
    };

    return (
      <div className="relative-card">
        <div className="relative-card-content" onClick={() => handlePersonPress(person.id)}>
          <div className="relative-avatar">
            {photoUrl ? (
              <img src={photoUrl} alt={`${person.firstName} ${person.lastName}`} className="relative-avatar-img" />
            ) : (
              <UserIcon className="relative-avatar-icon" />
            )}
          </div>
          <div className="relative-info">
            <h4 className="relative-name">
              {person.firstName} {person.lastName}
            </h4>
            <p className="relative-relation">{relation}</p>
            {person.birthYear && (
              <p className="relative-dates">
                {person.birthYear}
                {person.deathYear ? ` - ${person.deathYear}` : ''}
              </p>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="relative-actions">
            <label className="relative-visibility-toggle" title={isVisible ? 'Masquer dans l\'arbre' : 'Afficher dans l\'arbre'}>
              <input
                type="checkbox"
                checked={isVisible}
                onChange={handleVisibilityToggle}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="relative-visibility-label">{isVisible ? 'Visible' : 'Invisible'}</span>
            </label>
            <button
              className="relative-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveRelative(person.id, relationType);
              }}
              title="Retirer cette relation"
            >
              <XMarkIcon className="icon-inline" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderPersonCard = (p: any, relation: string, relationType: 'parent' | 'partner' | 'child') => (
    <RelativeCard key={p.id} person={p} relation={relation} relationType={relationType} />
  );

  return (
    <div className="tab-content-inner">
      {parents.length > 0 && (
        <>
          <h3 className="section-title">{t('person.parents')}</h3>
          {parents.map((p: any) => renderPersonCard(p, t('person.parents'), 'parent'))}
        </>
      )}

      {partner && (
        <>
          <h3 className="section-title">{t('person.partner')}</h3>
          {renderPersonCard(partner, t('person.partner'), 'partner')}
        </>
      )}

      {children.length > 0 && (
        <>
          <h3 className="section-title">{t('person.children')}</h3>
          {children.map((p: any) => renderPersonCard(p, t('person.children'), 'child'))}
        </>
      )}

      {siblings.length > 0 && (
        <>
          <h3 className="section-title">{t('person.siblings')}</h3>
          {siblings.map((p: any) => renderPersonCard(p, t('person.siblings'), 'parent'))}
        </>
      )}

      {parents.length === 0 && !partner && children.length === 0 && siblings.length === 0 && (
        <div className="empty-state">
          <p className="empty-field">{t('person.noRelatives') || 'Aucun proche'}</p>
        </div>
      )}

      {canEdit && (
        <div className="add-buttons-container">
          {parents.length < 2 && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={onShowAddParent}
              >
                {`+ ${t('person.addParent')}`}
              </button>
              <button 
                className="btn btn-ghost"
                onClick={onShowLinkParent}
              >
                <LinkIcon className="icon-inline" /> Lier un parent existant
              </button>
            </>
          )}
          {!partner && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={onShowAddPartner}
              >
                {`+ ${t('person.addPartner') || 'Ajouter un conjoint'}`}
              </button>
              <button 
                className="btn btn-ghost"
                onClick={onShowLinkPartner}
              >
                <LinkIcon className="icon-inline" /> Lier un conjoint existant
              </button>
            </>
          )}
          <button 
            className="btn btn-secondary"
            onClick={onShowAddChild}
          >
            {`+ ${t('person.addChild')}`}
          </button>
          <button 
            className="btn btn-ghost"
            onClick={onShowLinkChild}
          >
            <LinkIcon className="icon-inline" /> Lier un enfant existant
          </button>
        </div>
      )}
    </div>
  );
};

export default PersonDetailScreen;
