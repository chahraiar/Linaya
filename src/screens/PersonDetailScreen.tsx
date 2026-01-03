import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../design-system/ThemeProvider';
import { Screen, Text, Button, Card, Spacer, Input } from '../components/ui'; // ✅ IconButton retiré
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { usePersonDetailStore } from '../store/personDetailStore';
import { RootStackParamList } from '../navigation/navigation';
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
  getPersonMedia,
  getPersonMediaUrl,
  uploadPersonMedia,
  deletePersonMedia,
  PersonMedia,
  setPersonVisibility,
  getUserTreeRole,
} from '../services/treeService';
import { AddRelativeModal } from '../components/AddRelativeModal';
import { LinkExistingPersonModal } from '../components/LinkExistingPersonModal';
import { supabase } from '../lib/supabase';

type PersonDetailRouteProp = RouteProp<RootStackParamList, 'PersonDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'data' | 'events' | 'media' | 'relatives';

export const PersonDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PersonDetailRouteProp>();
  const { personId } = route.params;

  const { getPerson, updatePerson: updatePersonInStore } = useFamilyTreeStore();
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

  const person = personId ? getPerson(personId) : null;
  const details = personId ? getPersonDetails(personId) : null;

  // Load contacts and photo when personId changes
  React.useEffect(() => {
    if (personId) {
      loadContacts();
      loadPhoto();
      checkIfSelf();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  // Check if this person is the current user's self person
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

  // Check user permissions
  React.useEffect(() => {
    const checkPermissions = async () => {
      if (!personId) return;
      try {
        const { data: treeId } = await supabase.rpc('get_person_tree_id', { p_person_id: personId });
        if (treeId) {
          const role = await getUserTreeRole(treeId);
          const canEditTree = role === 'owner' || role === 'editor';
          setCanEdit(canEditTree);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        setCanEdit(false);
      }
    };
    checkPermissions();
  }, [personId]);

  // Load person photo
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

      // Extract contact values for editing
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

  // Initialize edit fields when entering edit mode
  React.useEffect(() => {
    if (person && isEditing) {
      setEditedFirstName(person.firstName || '');
      setEditedLastName(person.lastName || '');
      setEditedBirthDate(person.birthYear ? `${person.birthYear}-01-01` : '');
      setEditedDeathDate(person.deathYear ? `${person.deathYear}-01-01` : '');
    }
  }, [person, isEditing]);

  // Initialize data edit fields
  React.useEffect(() => {
    if (person && isEditingData) {
      setEditedFirstName(person.firstName || '');
      setEditedLastName(person.lastName || '');
      setEditedBirthDate(person.birthYear ? `${person.birthYear}-01-01` : '');
      setEditedDeathDate(person.deathYear ? `${person.deathYear}-01-01` : '');
      setEditedGender('');
      setEditedNotes('');
    }
  }, [person, isEditingData]);

  if (!person) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text>{t('person.noPersonSelected')}</Text>
          <Spacer size="md" />
          <Button onPress={() => navigation.goBack()}>{t('common.close')}</Button>
        </View>
      </Screen>
    );
  }

  const fullName = `${person.firstName} ${person.lastName}`.trim() || 'Sans nom';

  const handleSave = async () => {
    if (!personId) return;

    setIsSaving(true);
    try {
      const updatedPerson = await updatePerson(personId, {
        firstName: editedFirstName.trim() || undefined,
        lastName: editedLastName.trim() || undefined,
        displayName: `${editedFirstName.trim()} ${editedLastName.trim()}`.trim() || undefined,
        birthDate: editedBirthDate || null,
        deathDate: editedDeathDate || null,
        gender: editedGender || undefined,
        notes: editedNotes || undefined,
      });

      if (updatedPerson) {
        updatePersonInStore(personId, {
          firstName: updatedPerson.firstName,
          lastName: updatedPerson.lastName,
          birthYear: updatedPerson.birthYear,
          deathYear: updatedPerson.deathYear,
        });

        setIsEditing(false);
        Alert.alert(t('common.save'), 'Modifications enregistrées');
      } else {
        Alert.alert(t('common.error'), 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving person:', error);
      Alert.alert(t('common.error'), 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveData = async () => {
    if (!personId) return;

    setIsSaving(true);
    try {
      const updatedPerson = await updatePerson(personId, {
        firstName: editedFirstName.trim() || undefined,
        lastName: editedLastName.trim() || undefined,
        displayName: `${editedFirstName.trim()} ${editedLastName.trim()}`.trim() || undefined,
        birthDate: editedBirthDate || null,
        deathDate: editedDeathDate || null,
        gender: editedGender || undefined,
        notes: editedNotes || undefined,
      });

      if (updatedPerson) {
        updatePersonInStore(personId, {
          firstName: updatedPerson.firstName,
          lastName: updatedPerson.lastName,
          birthYear: updatedPerson.birthYear,
          deathYear: updatedPerson.deathYear,
        });
      }

      // Save contacts
      if (editedEmail.trim()) {
        await upsertPersonContact(personId, 'email', editedEmail.trim(), 'Email principal', true);
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
      Alert.alert(t('common.save'), 'Modifications enregistrées');
    } catch (error) {
      console.error('Error saving data:', error);
      Alert.alert(t('common.error'), 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!personId || !person) return;

    Alert.alert(
      t('person.deletePerson') || 'Supprimer la personne',
      t('person.deletePersonConfirm') || `Êtes-vous sûr de vouloir supprimer ${person.firstName} ${person.lastName} ? Cette action est irréversible.`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deletePerson(personId);
              
              // Remove from store
              const { deletePerson: deletePersonFromStore } = useFamilyTreeStore.getState();
              deletePersonFromStore(personId);

              Alert.alert(
                t('common.success'),
                t('person.personDeleted') || 'Personne supprimée avec succès',
                [
                  {
                    text: t('common.ok'),
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error deleting person:', error);
              const errorMessage = error?.message || 'Erreur inconnue';
              
              // Check if error is about self person
              if (errorMessage.includes('own person') || errorMessage.includes('self person')) {
                Alert.alert(
                  t('common.error'),
                  t('person.cannotDeleteSelf') || 'Vous ne pouvez pas supprimer votre propre profil'
                );
              } else {
                Alert.alert(
                  t('common.error'),
                  t('person.deleteError') || `Erreur lors de la suppression: ${errorMessage}`
                );
              }
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('person.photoPermissionDenied') ||
            'Permission to access camera roll is required!'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleUploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('person.photoPickError') || 'Error selecting image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('person.cameraPermissionDenied') || 'Permission to access camera is required!'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleUploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), t('person.photoTakeError') || 'Error taking photo');
    }
  };

  const handleUploadPhoto = async (imageUri: string) => {
    if (!personId) return;

    setIsUploadingPhoto(true);
    try {
      const url = await uploadPersonPhoto(personId, imageUri);
      if (url) {
        setPhotoUrl(url);
        Alert.alert(t('common.success'), t('person.photoUploaded') || 'Photo uploaded successfully');
      } else {
        Alert.alert(t('common.error'), t('person.photoUploadError') || 'Error uploading photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert(t('common.error'), t('person.photoUploadError') || 'Error uploading photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(t('person.changePhoto') || 'Change Photo', '', [
      { text: t('person.takePhoto') || 'Take Photo', onPress: handleTakePhoto },
      { text: t('person.chooseFromLibrary') || 'Choose from Library', onPress: handlePickImage },
      { text: t('common.cancel') || 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Screen gradient={false} style={{ backgroundColor: '#F5F5F0' }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerIconBtn}
          hitSlop={8}
        >
          <Text style={styles.headerIconText}>←</Text>
        </Pressable>

        <Text variant="heading" style={styles.headerTitle}>
          {t('person.profile')}
        </Text>

        <View style={styles.headerRightButtons}>
          {!isSelf && (
            <Pressable
              onPress={handleDeletePerson}
              style={[styles.headerIconBtn, styles.deleteButton]}
              hitSlop={8}
              disabled={isDeleting}
            >
              <Text style={[styles.headerIconText, styles.deleteButtonText]}>
                🗑️
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setIsEditing(!isEditing)}
            style={styles.headerIconBtn}
            hitSlop={8}
          >
            <Text style={styles.headerIconText}>{isEditing ? '✕' : '✏️'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '15' }]}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cameraButton}
              onPress={showPhotoOptions}
              disabled={isUploadingPhoto}
              activeOpacity={0.7}
            >
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <>
              <Input
                label={t('person.firstName')}
                value={editedFirstName}
                onChangeText={setEditedFirstName}
                placeholder={t('person.firstName')}
                style={styles.editInput}
              />
              <Spacer size="sm" />
              <Input
                label={t('person.lastName')}
                value={editedLastName}
                onChangeText={setEditedLastName}
                placeholder={t('person.lastName')}
                style={styles.editInput}
              />
              <Spacer size="sm" />
              <Input
                label={t('person.birth') + ' (YYYY-MM-DD)'}
                value={editedBirthDate}
                onChangeText={setEditedBirthDate}
                placeholder="2000-01-01"
                style={styles.editInput}
              />
              <Spacer size="sm" />
              <Input
                label={t('person.death') + ' (YYYY-MM-DD)'}
                value={editedDeathDate}
                onChangeText={setEditedDeathDate}
                placeholder="2020-12-31"
                style={styles.editInput}
              />
              <Spacer size="md" />
              <View style={styles.editButtons}>
                <Button
                  variant="secondary"
                  onPress={() => setIsEditing(false)}
                  disabled={isSaving}
                  style={styles.editButton}
                >
                  {t('common.cancel')}
                </Button>
                <Spacer size="sm" horizontal />
                <Button
                  variant="primary"
                  onPress={handleSave}
                  loading={isSaving}
                  disabled={isSaving}
                  style={styles.editButton}
                >
                  {t('common.save')}
                </Button>
              </View>
            </>
          ) : (
            <>
              <Text variant="heading" style={styles.name}>
                {fullName}
              </Text>

              {person.birthYear && (
                <Text style={styles.birthInfo}>
                  {t('person.born')} : {person.birthYear}{' '}
                  {person.deathYear ? `• ${t('person.died')} : ${person.deathYear}` : ''}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'data' && styles.tabActive]}
            onPress={() => setActiveTab('data')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'data' ? theme.colors.primary || '#1976D2' : '#666666' },
                activeTab === 'data' && { fontWeight: '600' },
              ]}
            >
              {t('person.data')}
            </Text>
            {activeTab === 'data' && (
              <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
            )}
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'events' && styles.tabActive]}
            onPress={() => setActiveTab('events')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'events' ? theme.colors.primary || '#1976D2' : '#666666' },
                activeTab === 'events' && { fontWeight: '600' },
              ]}
            >
              {t('person.events')}
            </Text>
            {activeTab === 'events' && (
              <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
            )}
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'media' && styles.tabActive]}
            onPress={() => setActiveTab('media')}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'media' ? theme.colors.primary || '#1976D2' : '#666666' },
                activeTab === 'media' && { fontWeight: '600' },
              ]}
            >
              {t('person.media')}
            </Text>
            {activeTab === 'media' && (
              <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
            )}
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === 'relatives' && styles.tabActive]}
            onPress={() => setActiveTab('relatives')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'relatives' ? theme.colors.primary || '#1976D2' : '#666666',
                },
                activeTab === 'relatives' && { fontWeight: '600' },
              ]}
            >
              {t('person.relatives')}
            </Text>
            {activeTab === 'relatives' && (
              <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
            )}
          </Pressable>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'data' && (
            <DataTab
              person={person}
              details={details}
              contacts={contacts}
              isLoadingContacts={isLoadingContacts}
              isEditing={isEditingData}
              setIsEditing={setIsEditingData}
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
          {activeTab === 'relatives' && <RelativesTab person={person} canEdit={canEdit} />}
        </View>
      </ScrollView>
    </Screen>
  );
};

// Data Tab Component
interface DataTabProps {
  person: any;
  details: any;
  contacts: ContactDB[];
  isLoadingContacts: boolean;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
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
  const { theme } = useTheme();

  // Get contact values from database
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
      <View style={styles.emptyState}>
        <Text style={styles.emptyField}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContentInner}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="heading" style={styles.sectionTitle}>
              {t('person.profile') || 'Informations personnelles'}
            </Text>
            {!isEditing && (
              <Button variant="ghost" size="sm" onPress={() => setIsEditing(true)}>
                <Text>✏️</Text>
              </Button>
            )}
          </View>
          <Spacer size="sm" />

          {isEditing ? (
            <>
              <Input
                label={t('person.firstName')}
                value={editedFirstName}
                onChangeText={setEditedFirstName}
                placeholder={t('person.firstName')}
              />
              <Spacer size="sm" />
              <Input
                label={t('person.lastName')}
                value={editedLastName}
                onChangeText={setEditedLastName}
                placeholder={t('person.lastName')}
              />
              <Spacer size="sm" />
              <Input
                label={t('person.birth') + ' (YYYY-MM-DD)'}
                value={editedBirthDate}
                onChangeText={setEditedBirthDate}
                placeholder="2000-01-01"
              />
              <Spacer size="sm" />
              <Input
                label={t('person.death') + ' (YYYY-MM-DD)'}
                value={editedDeathDate}
                onChangeText={setEditedDeathDate}
                placeholder="2020-12-31"
              />
              <Spacer size="sm" />
              <View style={styles.genderContainer}>
                <Text variant="body" weight="medium" style={styles.genderLabel}>
                  {t('person.gender') || 'Genre'}
                </Text>
                <View style={styles.genderOptions}>
                  {['male', 'female', 'other', 'unknown'].map((gender) => (
                    <Button
                      key={gender}
                      variant={editedGender === gender ? 'primary' : 'secondary'}
                      size="sm"
                      onPress={() => setEditedGender(gender)}
                      style={styles.genderButton}
                    >
                      <Text>
                        {gender === 'male'
                          ? '👨'
                          : gender === 'female'
                          ? '👩'
                          : gender === 'other'
                          ? '⚧️'
                          : '❓'}
                      </Text>
                    </Button>
                  ))}
                </View>
              </View>
              <Spacer size="sm" />
              <Input
                label={t('person.notes') || 'Notes'}
                value={editedNotes}
                onChangeText={setEditedNotes}
                placeholder={t('person.notes') || 'Notes'}
                multiline
                numberOfLines={4}
                style={styles.notesInput}
              />
              <Spacer size="md" />
              <View style={styles.editButtons}>
                <Button
                  variant="secondary"
                  onPress={() => setIsEditing(false)}
                  disabled={isSaving}
                  style={styles.editButton}
                >
                  {t('common.cancel')}
                </Button>
                <Spacer size="sm" horizontal />
                <Button
                  variant="primary"
                  onPress={onSave}
                  loading={isSaving}
                  disabled={isSaving}
                  style={styles.editButton}
                >
                  {t('common.save')}
                </Button>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('person.firstName')}</Text>
                <Text style={styles.infoValue}>{person.firstName || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('person.lastName')}</Text>
                <Text style={styles.infoValue}>{person.lastName || '-'}</Text>
              </View>
              {person.birthYear && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('person.birth')}</Text>
                  <Text style={styles.infoValue}>{person.birthYear}</Text>
                </View>
              )}
              {person.deathYear && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('person.death')}</Text>
                  <Text style={styles.infoValue}>{person.deathYear}</Text>
                </View>
              )}
            </>
          )}
        </Card>

        <Spacer size="md" />

        {/* Contact Information */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <Text variant="heading" style={styles.sectionTitle}>
            {t('person.contact')}
          </Text>
          <Spacer size="sm" />

          {isEditing ? (
            <>
              <Input
                label={`📧 ${t('person.email')}`}
                value={editedEmail}
                onChangeText={setEditedEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
              />
              <Spacer size="sm" />
              <Input
                label={`📞 ${t('person.phone')}`}
                value={editedPhone}
                onChangeText={setEditedPhone}
                placeholder="+33 1 23 45 67 89"
                keyboardType="phone-pad"
              />
              <Spacer size="sm" />
              <Input
                label={`📱 ${t('person.mobile')}`}
                value={editedMobile}
                onChangeText={setEditedMobile}
                placeholder="+33 6 12 34 56 78"
                keyboardType="phone-pad"
              />
              <Spacer size="sm" />
              <Input
                label={`📍 ${t('person.address')}`}
                value={editedAddress}
                onChangeText={setEditedAddress}
                placeholder="123 Rue Example, 75001 Paris"
                multiline
              />
            </>
          ) : (
            <>
              {displayEmail ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>📧 {t('person.email')}</Text>
                  <Text style={styles.contactValue}>{displayEmail}</Text>
                </View>
              ) : null}

              {displayPhone ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>📞 {t('person.phone')}</Text>
                  <Text style={styles.contactValue}>{displayPhone}</Text>
                </View>
              ) : null}

              {displayMobile ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>📱 {t('person.mobile')}</Text>
                  <Text style={styles.contactValue}>{displayMobile}</Text>
                </View>
              ) : null}

              {displayAddress ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>📍 {t('person.address')}</Text>
                  <Text style={styles.contactValue}>{displayAddress}</Text>
                </View>
              ) : null}

              {!displayEmail && !displayPhone && !displayMobile && !displayAddress && (
                <Text style={styles.emptyField}>
                  {t('person.noContactInfo') || 'Aucune information de contact'}
                </Text>
              )}
            </>
          )}
        </Card>
      </ScrollView>
    </View>
  );
};

// Events Tab Component
const EventsTab: React.FC<{ person: any; details: any }> = ({ details }) => {
  const { t } = useTranslation();

  if (!details || !details.events || details.events.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyField}>{t('person.noPhotos')}</Text>
      </View>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birth':
        return '🎂';
      case 'death':
        return '🕯️';
      case 'marriage':
        return '💍';
      case 'divorce':
        return '💔';
      default:
        return '📅';
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'birth':
        return t('person.birth');
      case 'death':
        return t('person.death');
      case 'marriage':
        return t('person.marriage');
      case 'divorce':
        return t('person.divorce');
      default:
        return type;
    }
  };

  return (
    <View style={styles.tabContentInner}>
      {details.events.map((event: any) => (
        <Card key={event.id} variant="elevated" padding="md" style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventIcon}>{getEventIcon(event.type)}</Text>
            <View style={styles.eventInfo}>
              <Text style={styles.eventType}>{getEventLabel(event.type)}</Text>
              <Text style={styles.eventDate}>
                {new Date(event.date).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {event.place && <Text style={styles.eventPlace}>📍 {event.place}</Text>}
              {event.description && <Text style={styles.eventDescription}>{event.description}</Text>}
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
};

// Media Tab Component
const MediaTab: React.FC<{ person: any; details: any; canEdit: boolean }> = ({ person, details, canEdit }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [media, setMedia] = useState<PersonMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (person?.id) {
      loadMedia();
    }
  }, [person?.id]);

  const loadMedia = async () => {
    if (!person?.id) return;
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

  const handleFileSelect = async () => {
    if (!canEdit || !person?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie photo');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploading(true);
        const newMedia = await uploadPersonMedia(person.id, asset.uri);
        if (newMedia) {
          await loadMedia();
          Alert.alert('Succès', 'Photo ajoutée avec succès');
        } else {
          Alert.alert('Erreur', 'Erreur lors de l\'ajout de la photo');
        }
      }
    } catch (error: any) {
      console.error('Error uploading media:', error);
      Alert.alert('Erreur', `Erreur lors de l'ajout de la photo: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!canEdit) return;

    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deletePersonMedia(mediaId);
              if (success) {
                await loadMedia();
                Alert.alert('Succès', 'Photo supprimée avec succès');
              } else {
                Alert.alert('Erreur', 'Erreur lors de la suppression de la photo');
              }
            } catch (error: any) {
              console.error('Error deleting media:', error);
              Alert.alert('Erreur', `Erreur lors de la suppression de la photo: ${error.message || 'Erreur inconnue'}`);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Spacer size="md" />
        <Text>{t('common.loading') || 'Chargement...'}</Text>
      </View>
    );
  }

  if (media.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Card variant="elevated" padding="lg" style={styles.emptyMediaCard}>
          <Text style={styles.emptyMediaText}>
            {t('person.noPhotos')} {person?.firstName} {person?.lastName}
          </Text>
          <Spacer size="md" />
          <Text style={styles.emptyMediaSubtext}>{t('person.addPhotos')}</Text>
          {canEdit && (
            <>
              <Spacer size="md" />
              <Button variant="primary" onPress={handleFileSelect} disabled={uploading}>
                {uploading ? t('person.uploadingPhoto') || 'Upload en cours...' : t('person.addPhotos')}
              </Button>
            </>
          )}
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.tabContentInner}>
      {canEdit && (
        <View style={{ marginBottom: 16 }}>
          <Button variant="primary" onPress={handleFileSelect} disabled={uploading}>
            {uploading ? t('person.uploadingPhoto') || 'Upload en cours...' : t('person.addPhotos')}
          </Button>
        </View>
      )}
      <View style={styles.mediaGrid}>
        {media.map((item) => (
          <MediaItem
            key={item.id}
            media={item}
            onDelete={canEdit ? () => handleDeleteMedia(item.id) : undefined}
          />
        ))}
      </View>
    </View>
  );
};

interface MediaItemProps {
  media: PersonMedia;
  onDelete?: () => void;
}

const MediaItem: React.FC<MediaItemProps> = ({ media, onDelete }) => {
  const { t } = useTranslation();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
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
    <View style={styles.mediaItem}>
      {loading ? (
        <View style={styles.mediaItemPlaceholder}>
          <ActivityIndicator size="small" />
        </View>
      ) : imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.mediaItemImage} resizeMode="cover" />
      ) : (
        <View style={styles.mediaItemPlaceholder}>
          <Text>Erreur de chargement</Text>
        </View>
      )}
      {media.caption && (
        <Text style={styles.mediaItemCaption} numberOfLines={2}>
          {media.caption}
        </Text>
      )}
      {onDelete && (
        <TouchableOpacity style={styles.mediaItemDelete} onPress={onDelete}>
          <Text style={styles.mediaItemDeleteText}>×</Text>
        </TouchableOpacity>
      )}
      {media.is_primary && (
        <View style={styles.mediaItemPrimaryBadge}>
          <Text style={styles.mediaItemPrimaryBadgeText}>{t('person.primaryPhoto') || 'Photo principale'}</Text>
        </View>
      )}
    </View>
  );
};

// Relatives Tab Component
const RelativesTab: React.FC<{ person: any; canEdit: boolean }> = ({ person, canEdit }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { getPerson, getAllPersons, setPersons, updatePerson: updatePersonInStore } = useFamilyTreeStore();
  
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [showLinkParentModal, setShowLinkParentModal] = useState(false);
  const [showLinkChildModal, setShowLinkChildModal] = useState(false);
  const [showLinkPartnerModal, setShowLinkPartnerModal] = useState(false);

  const parents = person.parentIds.map((id: string) => getPerson(id)).filter(Boolean);
  const partner = person.partnerId ? getPerson(person.partnerId) : null;
  const children = person.childrenIds.map((id: string) => getPerson(id)).filter(Boolean);

  // Find siblings (persons who share at least one parent)
  const allPersons = getAllPersons();
  const siblings = allPersons.filter((p) => {
    if (p.id === person.id) return false;
    return p.parentIds.some((parentId: string) => person.parentIds.includes(parentId));
  });

  const handlePersonPress = (personId: string) => {
    navigation.push('PersonDetail', { personId });
  };

  const handleReloadData = async () => {
    // Get tree_id from person
    const personData = getPerson(person.id);
    if (!personData) return;

    // We need to get tree_id - for now, reload all persons from store
    // In a real scenario, we'd get tree_id from the person
    // For now, we'll just reload the store data
    // This is a simplified approach - ideally we'd have tree_id in the person object
    try {
      // Get all persons from store to find tree_id
      const allPersons = getAllPersons();
      if (allPersons.length === 0) return;

      // Get tree_id from first person (they should all be in same tree)
      // This is a workaround - ideally person should have tree_id
      const { data: treeIdData } = await supabase
        .rpc('get_person_tree_id', { p_person_id: person.id });
      
      if (treeIdData) {
        const { persons } = await getTreeData(treeIdData);
        setPersons(persons);
      }
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  const handleToggleVisibility = async (personId: string, isVisible: boolean) => {
    if (!canEdit) return;
    
    try {
      const success = await setPersonVisibility(personId, isVisible);
      if (success) {
        // Update person in store immediately (optimistic update)
        const personData = getPerson(personId);
        if (personData) {
          updatePersonInStore(personId, { isVisible });
        }
        Alert.alert('Succès', isVisible ? 'Carte rendue visible' : 'Carte masquée');
      } else {
        Alert.alert('Erreur', 'Erreur lors de la mise à jour de la visibilité');
      }
    } catch (error: any) {
      console.error('Error toggling visibility:', error);
      Alert.alert('Erreur', `Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const renderPersonCard = (p: any, relation: string, relationType: 'parent' | 'partner' | 'child') => (
    <Pressable key={p.id} onPress={() => handlePersonPress(p.id)}>
      <Card variant="elevated" padding="md" style={styles.relativeCard}>
        <View style={styles.relativeCardContent}>
          <View style={[styles.relativeAvatar, { backgroundColor: theme.colors.primary + '15' }]}>
            <Text style={styles.relativeAvatarText}>👤</Text>
          </View>
          <View style={styles.relativeInfo}>
            <Text style={styles.relativeName}>
              {p.firstName} {p.lastName}
            </Text>
            <Text style={styles.relativeRelation}>{relation}</Text>
            {p.birthYear && (
              <Text style={styles.relativeDates}>
                {p.birthYear}
                {p.deathYear ? ` - ${p.deathYear}` : ''}
              </Text>
            )}
          </View>
          {canEdit && (
            <View style={styles.relativeActions}>
              <View style={styles.visibilityToggle}>
                <Switch
                  value={p.isVisible !== false}
                  onValueChange={(value) => handleToggleVisibility(p.id, value)}
                />
                <Text style={styles.visibilityLabel}>
                  {p.isVisible !== false ? 'Visible' : 'Invisible'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View style={styles.tabContentInner}>
      {parents.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('person.parents')}</Text>
          <Spacer size="sm" />
          {parents.map((p: any) => renderPersonCard(p, t('person.parents'), 'parent'))}
          <Spacer size="md" />
        </>
      )}

      {partner && (
        <>
          <Text style={styles.sectionTitle}>{t('person.partner')}</Text>
          <Spacer size="sm" />
          {renderPersonCard(partner, t('person.partner'), 'partner')}
          <Spacer size="md" />
        </>
      )}

      {children.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('person.children')}</Text>
          <Spacer size="sm" />
          {children.map((p: any) => renderPersonCard(p, t('person.children'), 'child'))}
          <Spacer size="md" />
        </>
      )}

      {siblings.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('person.siblings')}</Text>
          <Spacer size="sm" />
          {siblings.map((p: any) => renderPersonCard(p, t('person.siblings')))}
        </>
      )}

      {parents.length === 0 && !partner && children.length === 0 && siblings.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyField}>{t('person.noRelatives') || 'Aucun proche'}</Text>
        </View>
      )}

      <Spacer size="lg" />

      {/* Add buttons */}
      <View style={styles.addButtonsContainer}>
        {parents.length < 2 && (
          <>
            <Button
              variant="secondary"
              onPress={() => setShowAddParentModal(true)}
              style={styles.addButton}
            >
              {`+ ${t('person.addParent')}`}
            </Button>
            <Button
              variant="ghost"
              onPress={() => setShowLinkParentModal(true)}
              style={styles.addButton}
            >
              {`🔗 Lier un parent existant`}
            </Button>
          </>
        )}
        {!partner && (
          <>
            <Button
              variant="secondary"
              onPress={() => setShowAddPartnerModal(true)}
              style={styles.addButton}
            >
              {`+ ${t('person.addPartner') || 'Ajouter un conjoint'}`}
            </Button>
            <Button
              variant="ghost"
              onPress={() => setShowLinkPartnerModal(true)}
              style={styles.addButton}
            >
              {`🔗 Lier un conjoint existant`}
            </Button>
          </>
        )}
        <Button
          variant="secondary"
          onPress={() => setShowAddChildModal(true)}
          style={styles.addButton}
        >
          {`+ ${t('person.addChild')}`}
        </Button>
        <Button
          variant="ghost"
          onPress={() => setShowLinkChildModal(true)}
          style={styles.addButton}
        >
          {`🔗 Lier un enfant existant`}
        </Button>
      </View>

      {/* Modals */}
      <AddRelativeModal
        visible={showAddParentModal}
        onClose={() => setShowAddParentModal(false)}
        personId={person.id}
        relationshipType="parent"
        onPersonAdded={handleReloadData}
      />
      <AddRelativeModal
        visible={showAddChildModal}
        onClose={() => setShowAddChildModal(false)}
        personId={person.id}
        relationshipType="child"
        onPersonAdded={handleReloadData}
      />
      <AddRelativeModal
        visible={showAddPartnerModal}
        onClose={() => setShowAddPartnerModal(false)}
        personId={person.id}
        relationshipType="partner"
        onPersonAdded={handleReloadData}
      />
      
      {/* Link existing person modals */}
      <LinkExistingPersonModal
        visible={showLinkParentModal}
        onClose={() => setShowLinkParentModal(false)}
        personId={person.id}
        relationshipType="parent"
        onRelationshipCreated={handleReloadData}
      />
      <LinkExistingPersonModal
        visible={showLinkChildModal}
        onClose={() => setShowLinkChildModal(false)}
        personId={person.id}
        relationshipType="child"
        onRelationshipCreated={handleReloadData}
      />
      <LinkExistingPersonModal
        visible={showLinkPartnerModal}
        onClose={() => setShowLinkPartnerModal(false)}
        personId={person.id}
        relationshipType="partner"
        onRelationshipCreated={handleReloadData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // ✅ Boutons header clean (plus de carré blanc, plus d'ombre)
  headerRightButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',

    borderWidth: 0,
    borderColor: 'transparent',

    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },

    overflow: 'hidden',
  },

  headerIconText: {
    fontSize: 18,
    color: '#1A1A1A',
  },

  deleteButton: {
    opacity: 0.8,
  },

  deleteButtonText: {
    fontSize: 18,
  },

  scrollView: {
    flex: 1,
  },

  profileHeader: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    // ✅ Force une vraie hauteur visible
    minHeight: 220, // Essaie 280 / 320 / 360
    justifyContent: 'center', // Optionnel : centre le contenu
  },

  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  avatarText: {
    fontSize: 40,
  },

  // ✅ Camera button clean (si tu veux garder le style “chip” blanc, ok, mais pas d’ombre)
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',

    // Important: si tu veux enlever le “carré” perçu → mets borderWidth: 0
    borderWidth: 0,
    borderColor: 'transparent',

    // pas d’ombre
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },

    overflow: 'hidden',
  },

  cameraIcon: {
    fontSize: 16,
  },

  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1A1A1A',
  },

  birthInfo: {
    fontSize: 14,
    marginBottom: 0, // ✅ Pas de marginBottom pour éviter le débordement
    marginTop: 4,
    color: '#666666',
    textAlign: 'center',
  },

  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },

  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },

  tabActive: {},

  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },

  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },

  tabContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F0',
  },

  tabContentInner: {
    flex: 1,
  },

  sectionCard: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1A1A1A',
  },

  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },

  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    color: '#1A1A1A',
  },

  contactValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
    color: '#1976D2',
  },

  eventCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  eventIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  eventInfo: {
    flex: 1,
  },

  eventType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1A1A1A',
  },

  eventDate: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666666',
  },

  eventPlace: {
    fontSize: 12,
    marginBottom: 4,
    color: '#666666',
  },

  eventDescription: {
    fontSize: 12,
    marginTop: 4,
    color: '#666666',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  emptyMediaCard: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  emptyMediaText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1A1A1A',
  },

  emptyMediaSubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666666',
  },

  relativeCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  relativeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  relativeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  relativeAvatarText: {
    fontSize: 20,
  },

  relativeInfo: {
    flex: 1,
  },

  relativeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1A1A1A',
  },

  relativeRelation: {
    fontSize: 12,
    marginBottom: 2,
    color: '#666666',
  },

  relativeDates: {
    fontSize: 12,
    color: '#666666',
  },

  addButtonsContainer: {
    gap: 12,
    marginTop: 16,
  },

  addButton: {
    marginBottom: 0,
  },

  editInput: {
    width: '100%',
  },

  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  editButton: {
    flex: 1,
  },

  emptyField: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
    color: '#999999',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    color: '#666666',
  },

  infoValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
    color: '#1A1A1A',
  },

  genderContainer: {
    marginBottom: 8,
  },

  genderLabel: {
    marginBottom: 8,
  },

  genderOptions: {
    flexDirection: 'row',
    gap: 8,
  },

  genderButton: {
    flex: 1,
  },

  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  mediaItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },

  mediaItemImage: {
    width: '100%',
    height: '100%',
  },

  mediaItemPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },

  mediaItemCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#FFFFFF',
    padding: 8,
    fontSize: 12,
  },

  mediaItemDelete: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mediaItemDeleteText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },

  mediaItemPrimaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  mediaItemPrimaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  relativeActions: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },

  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  visibilityLabel: {
    fontSize: 12,
    color: '#666666',
  },
});
