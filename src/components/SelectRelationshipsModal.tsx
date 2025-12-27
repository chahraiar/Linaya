import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, Button, Spacer } from './ui';
import { createRelationship } from '../services/treeService';
import { supabase } from '../lib/supabase';

interface PersonInfo {
  id: string;
  first_name: string;
  last_name: string;
  display_name?: string;
}

interface SelectRelationshipsModalProps {
  visible: boolean;
  onClose: () => void;
  newPersonId: string;
  newPersonName: string;
  currentPersonId: string;
  relationshipType: 'parent' | 'child' | 'partner';
  existingParents: string[];
  existingChildren: string[];
  existingPartnerId: string | null;
  onRelationshipsCreated?: () => Promise<void>;
}

export const SelectRelationshipsModal: React.FC<SelectRelationshipsModalProps> = ({
  visible,
  onClose,
  newPersonId,
  newPersonName,
  currentPersonId,
  relationshipType,
  existingParents,
  existingChildren,
  existingPartnerId,
  onRelationshipsCreated,
}) => {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRelationships, setSelectedRelationships] = useState<{
    partnerWithParent?: boolean;
    parentWithPartner?: boolean;
    parentWithChildren?: string[];
  }>({});

  // Get person names for display
  const [personNames, setPersonNames] = useState<Record<string, PersonInfo>>({});

  React.useEffect(() => {
    const fetchPersonNames = async () => {
      if (!visible) return;
      
      const allPersonIds = [
        ...existingParents,
        ...existingChildren,
        ...(existingPartnerId ? [existingPartnerId] : []),
      ];

      if (allPersonIds.length === 0) return;

      try {
        // Get tree_id from current person
        const { data: treeId } = await supabase.rpc('get_person_tree_id', { 
          p_person_id: currentPersonId 
        });

        if (!treeId) return;

        // Get all persons in the tree
        const { data: persons } = await supabase
          .rpc('get_tree_persons', { p_tree_id: treeId });

        const namesMap: Record<string, PersonInfo> = {};
        (persons || []).forEach((p: PersonInfo) => {
          if (allPersonIds.includes(p.id)) {
            namesMap[p.id] = p;
          }
        });
        setPersonNames(namesMap);
      } catch (error) {
        console.error('Error fetching person names:', error);
      }
    };

    fetchPersonNames();
  }, [visible, existingParents, existingChildren, existingPartnerId, currentPersonId]);

  const getPersonDisplayName = (personId: string): string => {
    const person = personNames[personId];
    if (!person) return '...';
    return person.display_name || `${person.first_name} ${person.last_name}`.trim() || 'Personne';
  };

  const handleCreateRelationships = async () => {
    try {
      setIsCreating(true);
      const relationshipsToCreate: Array<{ from: string; to: string; type: 'parent' | 'partner' }> = [];

      // 1. If adding a parent and user selected to create partner with other parent
      if (relationshipType === 'parent' && existingParents.length > 0 && selectedRelationships.partnerWithParent) {
        const otherParentId = existingParents[0];
        relationshipsToCreate.push({
          from: newPersonId,
          to: otherParentId,
          type: 'partner',
        });
      }

      // 2. If adding a child and user selected to create parent with partner
      if (relationshipType === 'child' && existingPartnerId && selectedRelationships.parentWithPartner) {
        relationshipsToCreate.push({
          from: existingPartnerId,
          to: newPersonId,
          type: 'parent',
        });
      }

      // 3. If adding a partner and user selected children to link
      if (relationshipType === 'partner' && selectedRelationships.parentWithChildren) {
        for (const childId of selectedRelationships.parentWithChildren) {
          relationshipsToCreate.push({
            from: newPersonId,
            to: childId,
            type: 'parent',
          });
        }
      }

      // Create all selected relationships
      for (const rel of relationshipsToCreate) {
        await createRelationship(rel.from, rel.to, rel.type);
      }

      if (onRelationshipsCreated) {
        await onRelationshipsCreated();
      }

      onClose();
    } catch (error) {
      console.error('Error creating relationships:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  // Determine what options to show
  const showPartnerWithParent = relationshipType === 'parent' && existingParents.length > 0;
  const showParentWithPartner = relationshipType === 'child' && existingPartnerId !== null;
  const showParentWithChildren = relationshipType === 'partner' && existingChildren.length > 0;

  // If no additional relationships are possible, skip this modal
  if (!showPartnerWithParent && !showParentWithPartner && !showParentWithChildren) {
    if (visible) {
      // Close immediately if no options
      setTimeout(() => onClose(), 0);
    }
    return null;
  }

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
              {t('person.selectRelationships') || 'Relations supplémentaires'}
            </Text>
            
            <Spacer size="md" />

            <Text style={styles.description}>
              {t('person.selectRelationshipsDescription') || 
                `Souhaitez-vous créer des relations supplémentaires pour ${newPersonName} ?`}
            </Text>

            <Spacer size="lg" />

            <ScrollView style={styles.optionsContainer}>
              {/* Option 1: Partner with existing parent */}
              {showPartnerWithParent && (
                <View style={styles.option}>
                  <Pressable
                    style={[
                      styles.checkbox,
                      selectedRelationships.partnerWithParent && styles.checkboxChecked,
                    ]}
                    onPress={() =>
                      setSelectedRelationships((prev) => ({
                        ...prev,
                        partnerWithParent: !prev.partnerWithParent,
                      }))
                    }
                  >
                    {selectedRelationships.partnerWithParent && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>
                  <Text style={styles.optionText}>
                    {t('person.partnerWithParent') || 
                      `Créer un lien de couple avec ${getPersonDisplayName(existingParents[0])}`}
                  </Text>
                </View>
              )}

              {/* Option 2: Parent with existing partner */}
              {showParentWithPartner && (
                <View style={styles.option}>
                  <Pressable
                    style={[
                      styles.checkbox,
                      selectedRelationships.parentWithPartner && styles.checkboxChecked,
                    ]}
                    onPress={() =>
                      setSelectedRelationships((prev) => ({
                        ...prev,
                        parentWithPartner: !prev.parentWithPartner,
                      }))
                    }
                  >
                    {selectedRelationships.parentWithPartner && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>
                  <Text style={styles.optionText}>
                    {t('person.parentWithPartner') || 
                      `Créer un lien parent avec ${getPersonDisplayName(existingPartnerId!)}`}
                  </Text>
                </View>
              )}

              {/* Option 3: Parent with existing children */}
              {showParentWithChildren && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.sectionTitle}>
                    {t('person.parentWithChildren') || 'Créer un lien parent avec :'}
                  </Text>
                  {existingChildren.map((childId) => (
                    <View key={childId} style={styles.option}>
                      <Pressable
                        style={[
                          styles.checkbox,
                          selectedRelationships.parentWithChildren?.includes(childId) && styles.checkboxChecked,
                        ]}
                        onPress={() => {
                          setSelectedRelationships((prev) => {
                            const current = prev.parentWithChildren || [];
                            const newList = current.includes(childId)
                              ? current.filter((id) => id !== childId)
                              : [...current, childId];
                            return { ...prev, parentWithChildren: newList };
                          });
                        }}
                      >
                        {selectedRelationships.parentWithChildren?.includes(childId) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </Pressable>
                      <Text style={styles.optionText}>
                        {getPersonDisplayName(childId)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <Spacer size="lg" />

            <Button
              variant="primary"
              onPress={handleCreateRelationships}
              disabled={isCreating}
            >
              {t('common.create') || 'Créer les relations'}
            </Button>

            <Spacer size="sm" />

            <Button variant="ghost" onPress={handleSkip} disabled={isCreating}>
              {t('common.skip') || 'Passer'}
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
    maxHeight: '90%',
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
  optionsContainer: {
    maxHeight: 300,
  },
  sectionTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666666',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionText: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 20,
  },
});

