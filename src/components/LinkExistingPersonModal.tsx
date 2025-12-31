import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Card, Text, Button, Input, Spacer } from './ui';
import { createRelationship } from '../services/treeService';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { supabase } from '../lib/supabase';

interface LinkExistingPersonModalProps {
  visible: boolean;
  onClose: () => void;
  personId: string;
  relationshipType: 'parent' | 'child' | 'partner';
  onRelationshipCreated?: () => Promise<void>;
}

export const LinkExistingPersonModal: React.FC<LinkExistingPersonModalProps> = ({
  visible,
  onClose,
  personId,
  relationshipType,
  onRelationshipCreated,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { getAllPersons, getPerson } = useFamilyTreeStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [availablePersons, setAvailablePersons] = useState<any[]>([]);
  const [filteredPersons, setFilteredPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const currentPerson = getPerson(personId);

  // Load available persons (excluding current person and existing relationships)
  useEffect(() => {
    if (visible) {
      loadAvailablePersons();
    } else {
      setSearchQuery('');
    }
  }, [visible, personId, relationshipType]);

  // Filter persons based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPersons(availablePersons);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPersons(
        availablePersons.filter(
          (p) =>
            p.firstName?.toLowerCase().includes(query) ||
            p.lastName?.toLowerCase().includes(query) ||
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, availablePersons]);

  const loadAvailablePersons = async () => {
    setLoading(true);
    try {
      // Get all persons from store
      const allPersons = getAllPersons();
      
      // Get current person's relationships
      const currentPersonData = getPerson(personId);
      if (!currentPersonData) {
        setAvailablePersons([]);
        return;
      }

      // Filter out:
      // 1. Current person
      // 2. Existing parents (if relationshipType is 'parent')
      // 3. Existing children (if relationshipType is 'child')
      // 4. Existing partner (if relationshipType is 'partner')
      const excludedIds = new Set([personId]);
      
      if (relationshipType === 'parent') {
        currentPersonData.parentIds.forEach((id: string) => excludedIds.add(id));
      } else if (relationshipType === 'child') {
        currentPersonData.childrenIds.forEach((id: string) => excludedIds.add(id));
      } else if (relationshipType === 'partner') {
        if (currentPersonData.partnerId) {
          excludedIds.add(currentPersonData.partnerId);
        }
      }

      const available = allPersons.filter((p) => !excludedIds.has(p.id));
      setAvailablePersons(available);
      setFilteredPersons(available);
    } catch (error) {
      console.error('Error loading available persons:', error);
      Alert.alert(t('common.error'), 'Erreur lors du chargement des personnes');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPerson = async (targetPersonId: string) => {
    if (!currentPerson) return;

    try {
      setIsLinking(true);

      let fromId: string;
      let toId: string;
      let relType: 'parent' | 'partner';

      if (relationshipType === 'parent') {
        // targetPerson is parent of currentPerson
        fromId = targetPersonId;
        toId = personId;
        relType = 'parent';
      } else if (relationshipType === 'child') {
        // currentPerson is parent of targetPerson
        fromId = personId;
        toId = targetPersonId;
        relType = 'parent';
      } else {
        // partner relationship
        fromId = personId;
        toId = targetPersonId;
        relType = 'partner';
      }

      const success = await createRelationship(fromId, toId, relType);

      if (success) {
        Alert.alert(
          t('common.success'),
          t('tree.personAdded') || 'Relation créée avec succès'
        );
        
        if (onRelationshipCreated) {
          await onRelationshipCreated();
        }
        
        onClose();
      } else {
        Alert.alert(t('common.error'), 'Erreur lors de la création de la relation');
      }
    } catch (error) {
      console.error('Error linking person:', error);
      Alert.alert(
        t('common.error'),
        `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    } finally {
      setIsLinking(false);
    }
  };

  const getRelationshipLabel = () => {
    switch (relationshipType) {
      case 'parent':
        return t('person.addParent') || 'Lier un parent existant';
      case 'child':
        return t('person.addChild') || 'Lier un enfant existant';
      case 'partner':
        return t('person.addPartner') || 'Lier un conjoint existant';
      default:
        return 'Lier une personne';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Card variant="elevated" style={styles.modalContent} padding="lg">
            <Text variant="heading" style={styles.title}>
              {getRelationshipLabel()}
            </Text>
            
            <Spacer size="md" />

            <Text style={styles.description}>
              {relationshipType === 'parent' && 'Sélectionnez un parent existant à lier'}
              {relationshipType === 'child' && 'Sélectionnez un enfant existant à lier'}
              {relationshipType === 'partner' && 'Sélectionnez un conjoint existant à lier'}
            </Text>

            <Spacer size="md" />

            <Input
              placeholder={t('common.search') || 'Rechercher...'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />

            <Spacer size="md" />

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : filteredPersons.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Aucune personne trouvée' : 'Aucune personne disponible'}
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.personsList} showsVerticalScrollIndicator={false}>
                {filteredPersons.map((person) => (
                  <Pressable
                    key={person.id}
                    onPress={() => handleLinkPerson(person.id)}
                    disabled={isLinking}
                  >
                    <Card variant="elevated" padding="md" style={styles.personCard}>
                      <View style={styles.personCardContent}>
                        <View style={[styles.personAvatar, { backgroundColor: theme.colors.primary + '15' }]}>
                          <Text style={styles.personAvatarText}>👤</Text>
                        </View>
                        <View style={styles.personInfo}>
                          <Text style={styles.personName}>
                            {person.firstName} {person.lastName}
                          </Text>
                          {person.birthYear && (
                            <Text style={styles.personDates}>
                              {person.birthYear}
                              {person.deathYear ? ` - ${person.deathYear}` : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <Spacer size="md" />

            <Button variant="ghost" onPress={onClose} disabled={isLinking}>
              {t('common.cancel')}
            </Button>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F5F5F0',
  },
  title: {
    color: '#1A1A1A',
    marginBottom: 8,
  },
  description: {
    color: '#666666',
    fontSize: 14,
    lineHeight: 20,
  },
  searchInput: {
    marginBottom: 0,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999999',
    fontSize: 14,
  },
  personsList: {
    maxHeight: 400,
  },
  personCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  personCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  personAvatarText: {
    fontSize: 20,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1A1A1A',
  },
  personDates: {
    fontSize: 12,
    color: '#666666',
  },
});

