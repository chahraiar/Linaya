import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Pressable, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../design-system/ThemeProvider';
import { Screen, Text, Button, IconButton, Card, Spacer, Input } from '../components/ui';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { usePersonDetailStore } from '../store/personDetailStore';
import { RootStackParamList } from '../navigation/navigation';
import { 
  updatePerson, 
  getPersonContacts, 
  upsertPersonContact, 
  deletePersonContact,
  uploadPersonPhoto,
  getPersonPhotoUrl,
  ContactDB 
} from '../services/treeService';

type PersonDetailRouteProp = RouteProp<RootStackParamList, 'PersonDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'data' | 'events' | 'media' | 'relatives';

export const PersonDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PersonDetailRouteProp>();
  const { personId } = route.params;
  
  console.log('📱 PersonDetailScreen mounted with personId:', personId);
  
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
  
  const person = personId ? getPerson(personId) : null;
  const details = personId ? getPersonDetails(personId) : null;

  // Load contacts and photo when personId changes
  React.useEffect(() => {
    if (personId) {
      loadContacts();
      loadPhoto();
    }
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
      const emailContact = loadedContacts.find(c => c.type === 'email' && c.is_primary);
      const phoneContact = loadedContacts.find(c => c.type === 'other' && c.label?.toLowerCase().includes('phone'));
      const mobileContact = loadedContacts.find(c => c.type === 'mobile' && c.is_primary);
      const addressContact = loadedContacts.find(c => c.type === 'other' && c.label?.toLowerCase().includes('address'));
      
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
  
  console.log('📱 PersonDetailScreen - person:', person ? `${person.firstName} ${person.lastName}` : 'null');
  
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
  const birthDate = person.birthYear ? new Date(person.birthYear, 0, 1).toLocaleDateString('fr-FR', { year: 'numeric' }) : null;

  const handleSave = async () => {
    if (!person || !personId) return;

    setIsSaving(true);
    try {
      const birthDateStr = editedBirthDate || null;
      const deathDateStr = editedDeathDate || null;

      const updatedPerson = await updatePerson(personId, {
        firstName: editedFirstName.trim() || undefined,
        lastName: editedLastName.trim() || undefined,
        displayName: `${editedFirstName.trim()} ${editedLastName.trim()}`.trim() || undefined,
        birthDate: birthDateStr,
        deathDate: deathDateStr,
        gender: editedGender || undefined,
        notes: editedNotes || undefined,
      });

      if (updatedPerson) {
        // Update in store
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
    if (!person || !personId) return;

    setIsSaving(true);
    try {
      // Save person basic info
      const birthDateStr = editedBirthDate || null;
      const deathDateStr = editedDeathDate || null;

      const updatedPerson = await updatePerson(personId, {
        firstName: editedFirstName.trim() || undefined,
        lastName: editedLastName.trim() || undefined,
        displayName: `${editedFirstName.trim()} ${editedLastName.trim()}`.trim() || undefined,
        birthDate: birthDateStr,
        deathDate: deathDateStr,
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

      // Reload contacts
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

  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('person.photoPermissionDenied') || 'Permission to access camera roll is required!'
        );
        return;
      }

      // Launch image picker
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
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('person.cameraPermissionDenied') || 'Permission to access camera is required!'
        );
        return;
      }

      // Launch camera
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
        // Reload person data to get updated main_photo_id
        // You might want to refresh the person from store here
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
    Alert.alert(
      t('person.changePhoto') || 'Change Photo',
      '',
      [
        {
          text: t('person.takePhoto') || 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: t('person.chooseFromLibrary') || 'Choose from Library',
          onPress: handlePickImage,
        },
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };
  
  return (
    <Screen gradient={false} style={{ backgroundColor: '#FAF9F6' }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <IconButton variant="default" onPress={() => navigation.goBack()}>
          <Text>←</Text>
        </IconButton>
        <Text variant="heading" style={styles.headerTitle}>
          {t('person.profile')}
        </Text>
        <IconButton variant="default" onPress={() => setIsEditing(!isEditing)}>
          <Text>{isEditing ? '✕' : '✏️'}</Text>
        </IconButton>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
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
              <Text variant="heading" style={[styles.name, { color: theme.colors.text }]}>
                {fullName}
              </Text>
              
              {person.birthYear && (
                <Text style={[styles.birthInfo, { color: theme.colors.textSecondary }]}>
                  {t('person.born')} : {person.birthYear} {person.deathYear ? `• ${t('person.died')} : ${person.deathYear}` : ''}
                </Text>
              )}
            </>
          )}
        </View>
        
        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface }]}>
          <Pressable
            style={[styles.tab, activeTab === 'data' && styles.tabActive]}
            onPress={() => setActiveTab('data')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'data' && { color: theme.colors.primary, fontWeight: '600' },
              ]}
            >
              {t('person.data')}
            </Text>
            {activeTab === 'data' && <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />}
          </Pressable>
          
          <Pressable
            style={[styles.tab, activeTab === 'events' && styles.tabActive]}
            onPress={() => setActiveTab('events')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'events' && { color: theme.colors.primary, fontWeight: '600' },
              ]}
            >
              {t('person.events')}
            </Text>
            {activeTab === 'events' && <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />}
          </Pressable>
          
          <Pressable
            style={[styles.tab, activeTab === 'media' && styles.tabActive]}
            onPress={() => setActiveTab('media')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'media' && { color: theme.colors.primary, fontWeight: '600' },
              ]}
            >
              {t('person.media')}
            </Text>
            {activeTab === 'media' && <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />}
          </Pressable>
          
          <Pressable
            style={[styles.tab, activeTab === 'relatives' && styles.tabActive]}
            onPress={() => setActiveTab('relatives')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'relatives' && { color: theme.colors.primary, fontWeight: '600' },
              ]}
            >
              {t('person.relatives')}
            </Text>
            {activeTab === 'relatives' && <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />}
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
          {activeTab === 'media' && <MediaTab person={person} details={details} />}
          {activeTab === 'relatives' && <RelativesTab person={person} />}
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
  details,
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
  const emailContact = contacts.find(c => c.type === 'email' && c.is_primary);
  const phoneContact = contacts.find(c => c.type === 'other' && c.label?.toLowerCase().includes('téléphone'));
  const mobileContact = contacts.find(c => c.type === 'mobile' && c.is_primary);
  const addressContact = contacts.find(c => c.type === 'other' && c.label?.toLowerCase().includes('adresse'));

  const displayEmail = isEditing ? editedEmail : (emailContact?.value || '');
  const displayPhone = isEditing ? editedPhone : (phoneContact?.value || '');
  const displayMobile = isEditing ? editedMobile : (mobileContact?.value || '');
  const displayAddress = isEditing ? editedAddress : (addressContact?.value || '');

  if (isLoadingContacts && !isEditing) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: theme.colors.textSecondary }}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContentInner}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="heading" style={[styles.sectionTitle, { color: theme.colors.text }]}>
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
                      <Text>{gender === 'male' ? '👨' : gender === 'female' ? '👩' : gender === 'other' ? '⚧️' : '❓'}</Text>
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
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {person.firstName || '-'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('person.lastName')}</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                  {person.lastName || '-'}
                </Text>
              </View>
              {person.birthYear && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('person.birth')}</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {person.birthYear}
                  </Text>
                </View>
              )}
              {person.deathYear && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('person.death')}</Text>
                  <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                    {person.deathYear}
                  </Text>
                </View>
              )}
            </>
          )}
        </Card>

        <Spacer size="md" />

        {/* Contact Information */}
        <Card variant="elevated" padding="md" style={styles.sectionCard}>
          <Text variant="heading" style={[styles.sectionTitle, { color: theme.colors.text }]}>
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
                  <Text style={[styles.contactValue, { color: theme.colors.primary }]}>
                    {displayEmail}
                  </Text>
                </View>
              ) : null}
              
              {displayPhone ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>📞 {t('person.phone')}</Text>
                  <Text style={[styles.contactValue, { color: theme.colors.text }]}>
                    {displayPhone}
                  </Text>
                </View>
              ) : null}
              
              {displayMobile ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>📱 {t('person.mobile')}</Text>
                  <Text style={[styles.contactValue, { color: theme.colors.text }]}>
                    {displayMobile}
                  </Text>
                </View>
              ) : null}
              
              {displayAddress ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>📍 {t('person.address')}</Text>
                  <Text style={[styles.contactValue, { color: theme.colors.text }]}>
                    {displayAddress}
                  </Text>
                </View>
              ) : null}
              
              {!displayEmail && !displayPhone && !displayMobile && !displayAddress && (
                <Text style={[styles.emptyField, { color: theme.colors.textSecondary }]}>
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
const EventsTab: React.FC<{ person: any; details: any }> = ({ person, details }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  if (!details || !details.events || details.events.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: theme.colors.textSecondary }}>
          {t('person.noPhotos')}
        </Text>
      </View>
    );
  }
  
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birth': return '🎂';
      case 'death': return '🕯️';
      case 'marriage': return '💍';
      case 'divorce': return '💔';
      default: return '📅';
    }
  };
  
  const getEventLabel = (type: string) => {
    switch (type) {
      case 'birth': return t('person.birth');
      case 'death': return t('person.death');
      case 'marriage': return t('person.marriage');
      case 'divorce': return t('person.divorce');
      default: return type;
    }
  };
  
  return (
    <View style={styles.tabContentInner}>
      {details.events.map((event: any) => (
        <Card key={event.id} variant="elevated" padding="md" style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventIcon}>{getEventIcon(event.type)}</Text>
            <View style={styles.eventInfo}>
              <Text style={[styles.eventType, { color: theme.colors.text }]}>
                {getEventLabel(event.type)}
              </Text>
              <Text style={[styles.eventDate, { color: theme.colors.textSecondary }]}>
                {new Date(event.date).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {event.place && (
                <Text style={[styles.eventPlace, { color: theme.colors.textSecondary }]}>
                  📍 {event.place}
                </Text>
              )}
              {event.description && (
                <Text style={[styles.eventDescription, { color: theme.colors.textSecondary }]}>
                  {event.description}
                </Text>
              )}
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
};

// Media Tab Component
const MediaTab: React.FC<{ person: any; details: any }> = ({ person, details }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  if (!details || !details.media || details.media.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Card variant="elevated" padding="lg" style={styles.emptyMediaCard}>
          <Text style={[styles.emptyMediaText, { color: theme.colors.text }]}>
            {t('person.noPhotos')} {person.firstName} {person.lastName}
          </Text>
          <Spacer size="md" />
          <Text style={[styles.emptyMediaSubtext, { color: theme.colors.textSecondary }]}>
            {t('person.addPhotos')}
          </Text>
          <Spacer size="md" />
          <Button variant="primary" onPress={() => {}}>
            {t('person.addPhotos')}
          </Button>
        </Card>
      </View>
    );
  }
  
  return (
    <View style={styles.tabContentInner}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {details.media.length} {t('person.media')}
      </Text>
      {/* Media grid would go here */}
    </View>
  );
};

// Relatives Tab Component
const RelativesTab: React.FC<{ person: any }> = ({ person }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { getPerson, getAllPersons } = useFamilyTreeStore();
  
  const parents = person.parentIds.map((id: string) => getPerson(id)).filter(Boolean);
  const partner = person.partnerId ? getPerson(person.partnerId) : null;
  const children = person.childrenIds.map((id: string) => getPerson(id)).filter(Boolean);
  
  // Find siblings (persons who share at least one parent)
  const allPersons = getAllPersons();
  const siblings = allPersons.filter((p) => {
    if (p.id === person.id) return false;
    return p.parentIds.some((parentId) => person.parentIds.includes(parentId));
  });
  
  const handlePersonPress = (personId: string) => {
    navigation.push('PersonDetail', { personId });
  };
  
  const renderPersonCard = (p: any, relation: string) => (
    <Pressable
      key={p.id}
      onPress={() => handlePersonPress(p.id)}
    >
      <Card
        variant="elevated"
        padding="md"
        style={styles.relativeCard}
      >
      <View style={styles.relativeCardContent}>
        <View style={[styles.relativeAvatar, { backgroundColor: theme.colors.primary + '15' }]}>
          <Text style={styles.relativeAvatarText}>👤</Text>
        </View>
        <View style={styles.relativeInfo}>
          <Text style={[styles.relativeName, { color: theme.colors.text }]}>
            {p.firstName} {p.lastName}
          </Text>
          <Text style={[styles.relativeRelation, { color: theme.colors.textSecondary }]}>
            {relation}
          </Text>
          {p.birthYear && (
            <Text style={[styles.relativeDates, { color: theme.colors.textSecondary }]}>
              {p.birthYear}{p.deathYear ? ` - ${p.deathYear}` : ''}
            </Text>
          )}
        </View>
      </View>
    </Card>
    </Pressable>
  );
  
  return (
    <View style={styles.tabContentInner}>
      {parents.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('person.parents')}
          </Text>
          <Spacer size="sm" />
          {parents.map((p) => renderPersonCard(p, t('person.parents')))}
          <Spacer size="md" />
        </>
      )}
      
      {partner && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('person.partner')}
          </Text>
          <Spacer size="sm" />
          {renderPersonCard(partner, t('person.partner'))}
          <Spacer size="md" />
        </>
      )}
      
      {children.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('person.children')}
          </Text>
          <Spacer size="sm" />
          {children.map((p) => renderPersonCard(p, t('person.children')))}
          <Spacer size="md" />
        </>
      )}
      
      {siblings.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('person.siblings')}
          </Text>
          <Spacer size="sm" />
          {siblings.map((p) => renderPersonCard(p, t('person.siblings')))}
        </>
      )}
      
      {parents.length === 0 && !partner && children.length === 0 && siblings.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ color: theme.colors.textSecondary }}>
            {t('person.noPersonSelected')}
          </Text>
        </View>
      )}
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  cameraIcon: {
    fontSize: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  birthInfo: {
    fontSize: 14,
    marginBottom: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    // Active state styling
  },
  tabText: {
    fontSize: 14,
    color: '#666',
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
  },
  tabContentInner: {
    flex: 1,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  contactValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  socialIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  socialLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  socialUrl: {
    fontSize: 12,
    flex: 2,
    textAlign: 'right',
  },
  eventCard: {
    marginBottom: 12,
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
  },
  eventDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  eventPlace: {
    fontSize: 12,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    marginTop: 4,
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
  },
  emptyMediaText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyMediaSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  relativeCard: {
    marginBottom: 12,
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
  },
  relativeRelation: {
    fontSize: 12,
    marginBottom: 2,
  },
  relativeDates: {
    fontSize: 12,
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
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    flex: 2,
    textAlign: 'right',
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
});

