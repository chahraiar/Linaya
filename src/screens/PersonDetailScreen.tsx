import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Pressable } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Screen, Text, Button, IconButton, Card, Spacer } from '../components/ui';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { usePersonDetailStore } from '../store/personDetailStore';
import { RootStackParamList } from '../navigation/navigation';

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
  
  const { getPerson } = useFamilyTreeStore();
  const { getPersonDetails } = usePersonDetailStore();
  const [activeTab, setActiveTab] = useState<TabType>('data');
  
  const person = personId ? getPerson(personId) : null;
  const details = personId ? getPersonDetails(personId) : null;
  
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
  
  const fullName = `${person.firstName} ${person.lastName}`;
  const birthDate = person.birthYear ? new Date(person.birthYear, 0, 1).toLocaleDateString('fr-FR', { year: 'numeric' }) : null;
  
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
        <IconButton variant="default" onPress={() => {}}>
          <Text>⋯</Text>
        </IconButton>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <Text style={styles.cameraIcon}>📷</Text>
            </TouchableOpacity>
          </View>
          
          <Text variant="heading" style={[styles.name, { color: theme.colors.text }]}>
            {fullName}
          </Text>
          
          {person.birthYear && (
            <Text style={[styles.birthInfo, { color: theme.colors.textSecondary }]}>
              {t('person.born')} : {person.birthYear} {person.deathYear ? `• ${t('person.died')} : ${person.deathYear}` : ''}
            </Text>
          )}
          
          <Spacer size="sm" />
          <Button variant="secondary" onPress={() => {}}>
            {t('common.search')}
          </Button>
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
          {activeTab === 'data' && <DataTab person={person} details={details} />}
          {activeTab === 'events' && <EventsTab person={person} details={details} />}
          {activeTab === 'media' && <MediaTab person={person} details={details} />}
          {activeTab === 'relatives' && <RelativesTab person={person} />}
        </View>
      </ScrollView>
    </Screen>
  );
};

// Data Tab Component
const DataTab: React.FC<{ person: any; details: any }> = ({ person, details }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  if (!details) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: theme.colors.textSecondary }}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }
  
  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };
  
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return '📘';
      case 'instagram': return '📷';
      case 'twitter': return '🐦';
      case 'linkedin': return '💼';
      case 'website': return '🌐';
      default: return '🔗';
    }
  };
  
  return (
    <View style={styles.tabContentInner}>
      {/* Contact Info */}
      <Card variant="elevated" padding="md" style={styles.sectionCard}>
        <Text variant="heading" style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('person.contact')}
        </Text>
        <Spacer size="sm" />
        
        {details.contactInfo.email && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>📧 {t('person.email')}</Text>
            <Text style={[styles.contactValue, { color: theme.colors.primary }]}>
              {details.contactInfo.email}
            </Text>
          </View>
        )}
        
        {details.contactInfo.phone && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>📞 {t('person.phone')}</Text>
            <Text style={[styles.contactValue, { color: theme.colors.text }]}>
              {details.contactInfo.phone}
            </Text>
          </View>
        )}
        
        {details.contactInfo.mobile && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>📱 {t('person.mobile')}</Text>
            <Text style={[styles.contactValue, { color: theme.colors.text }]}>
              {details.contactInfo.mobile}
            </Text>
          </View>
        )}
        
        {details.contactInfo.address && (
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>📍 {t('person.address')}</Text>
            <Text style={[styles.contactValue, { color: theme.colors.text }]}>
              {details.contactInfo.address}
            </Text>
          </View>
        )}
      </Card>
      
      {/* Social Links */}
      {details.socialLinks && details.socialLinks.length > 0 && (
        <>
          <Spacer size="md" />
          <Card variant="elevated" padding="md" style={styles.sectionCard}>
            <Text variant="heading" style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('person.socialNetworks')}
            </Text>
            <Spacer size="sm" />
            
            {details.socialLinks.map((link: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.socialLinkRow}
                onPress={() => handleLinkPress(link.url)}
              >
                <Text style={styles.socialIcon}>{getSocialIcon(link.platform)}</Text>
                <Text style={[styles.socialLabel, { color: theme.colors.text }]}>
                  {link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
                </Text>
                <Text style={[styles.socialUrl, { color: theme.colors.primary }]}>
                  {link.url}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>
        </>
      )}
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
});

