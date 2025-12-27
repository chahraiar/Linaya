import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Card, Text, Button, Input, Spacer } from './ui';
import { AddPersonModal } from './AddPersonModal';
import { SelectRelationshipsModal } from './SelectRelationshipsModal';
import { createPerson, createRelationship } from '../services/treeService';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { supabase } from '../lib/supabase';

interface AddRelativeModalProps {
  visible: boolean;
  onClose: () => void;
  personId: string;
  relationshipType: 'parent' | 'child' | 'partner';
  onPersonAdded?: () => Promise<void>;
  loading?: boolean;
}

export const AddRelativeModal: React.FC<AddRelativeModalProps> = ({
  visible,
  onClose,
  personId,
  relationshipType,
  onPersonAdded,
  loading = false,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { addPerson } = useFamilyTreeStore();
  
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const [newPersonData, setNewPersonData] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [existingRelationships, setExistingRelationships] = useState<{
    parents: string[];
    children: string[];
    partnerId: string | null;
  }>({
    parents: [],
    children: [],
    partnerId: null,
  });

  const handlePersonSubmit = async (data: {
    firstName: string;
    lastName: string;
    displayName?: string;
    birthDate?: Date;
    gender?: string;
  }) => {
    try {
      setIsCreatingPerson(true);

      // Get tree_id from current person using RPC
      const { data: treeIdData, error: treeIdError } = await supabase
        .rpc('get_person_tree_id', { p_person_id: personId });
      
      if (treeIdError || !treeIdData) {
        Alert.alert(t('common.error'), 'Impossible de trouver l\'arbre');
        return;
      }
      
      const treeId = treeIdData;

      // Create the new person
      const newPerson = await createPerson(
        treeId,
        data.firstName,
        data.lastName,
        data.displayName,
        data.birthDate,
        data.gender
      );

      if (!newPerson) {
        Alert.alert(t('common.error'), 'Erreur lors de la création de la personne');
        return;
      }

      // Add person to store
      addPerson(newPerson);

      // Get current person's relationships to detect existing parents/children/partners
      const { data: treeRelationships } = await supabase
        .rpc('get_tree_relationships', { p_tree_id: treeId });

      const relationships = treeRelationships || [];
      
      // Find existing relationships for the current person
      const existingParents = relationships.filter(
        (r: any) => r.to_person_id === personId && r.type === 'parent'
      ).map((r: any) => r.from_person_id);
      
      const existingChildren = relationships.filter(
        (r: any) => r.from_person_id === personId && r.type === 'parent'
      ).map((r: any) => r.to_person_id);
      
      const existingPartner = relationships.find(
        (r: any) => (r.from_person_id === personId || r.to_person_id === personId) && r.type === 'partner'
      );
      const existingPartnerId = existingPartner
        ? (existingPartner.from_person_id === personId ? existingPartner.to_person_id : existingPartner.from_person_id)
        : null;

      // Create the primary relationship
      // For parent: newPerson is parent of personId (from=newPerson, to=personId, type=parent)
      // For child: personId is parent of newPerson (from=personId, to=newPerson, type=parent)
      // For partner: bidirectional (from=personId, to=newPerson, type=partner)
      let fromId: string;
      let toId: string;
      let relType: 'parent' | 'partner';

      if (relationshipType === 'parent') {
        fromId = newPerson.id;
        toId = personId;
        relType = 'parent';
      } else if (relationshipType === 'child') {
        fromId = personId;
        toId = newPerson.id;
        relType = 'parent';
      } else {
        // partner
        fromId = personId;
        toId = newPerson.id;
        relType = 'partner';
      }

      // Create primary relationship
      const relationshipCreated = await createRelationship(fromId, toId, relType);
      
      if (!relationshipCreated) {
        Alert.alert(t('common.error'), 'Erreur lors de la création de la relation');
        return;
      }

      // Check if there are additional relationships to propose
      const showPartnerWithParent = relationshipType === 'parent' && existingParents.length > 0;
      const showParentWithPartner = relationshipType === 'child' && existingPartnerId !== null;
      const showParentWithChildren = relationshipType === 'partner' && existingChildren.length > 0;

      if (showPartnerWithParent || showParentWithPartner || showParentWithChildren) {
        // Show modal to select additional relationships
        setNewPersonData({
          id: newPerson.id,
          name: newPerson.display_name || `${newPerson.first_name} ${newPerson.last_name}`.trim() || 'Personne',
        });
        setExistingRelationships({
          parents: existingParents,
          children: existingChildren,
          partnerId: existingPartnerId,
        });
        setShowPersonForm(false);
        setShowRelationshipsModal(true);
      } else {
        // No additional relationships, just close and reload
        if (onPersonAdded) {
          await onPersonAdded();
        }

        setShowPersonForm(false);
        onClose();

        Alert.alert(
          t('common.success'),
          t('tree.personAdded') || 'Personne ajoutée avec succès'
        );
      }
    } catch (error) {
      console.error('Error in handlePersonSubmit:', error);
      Alert.alert(
        t('common.error'),
        `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    } finally {
      setIsCreatingPerson(false);
    }
  };

  const getRelationshipLabel = () => {
    switch (relationshipType) {
      case 'parent':
        return t('person.addParent');
      case 'child':
        return t('person.addChild');
      case 'partner':
        return t('person.addPartner') || 'Ajouter un conjoint';
      default:
        return t('tree.addPerson');
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showPersonForm}
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
                {relationshipType === 'parent' && (t('person.addParentDescription') || 'Ajouter un parent de cette personne')}
                {relationshipType === 'child' && (t('person.addChildDescription') || 'Ajouter un enfant de cette personne')}
                {relationshipType === 'partner' && (t('person.addPartnerDescription') || 'Ajouter un conjoint à cette personne')}
              </Text>

              <Spacer size="lg" />

              <Button
                variant="primary"
                onPress={() => setShowPersonForm(true)}
                disabled={loading || isCreatingPerson}
              >
                {t('tree.addPerson')}
              </Button>

              <Spacer size="sm" />

              <Button variant="ghost" onPress={onClose}>
                {t('common.cancel')}
              </Button>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      <AddPersonModal
        visible={showPersonForm}
        onClose={() => setShowPersonForm(false)}
        onSubmit={handlePersonSubmit}
        loading={isCreatingPerson}
      />

      {newPersonData && (
        <SelectRelationshipsModal
          visible={showRelationshipsModal}
          onClose={async () => {
            setShowRelationshipsModal(false);
            setNewPersonData(null);
            if (onPersonAdded) {
              await onPersonAdded();
            }
            onClose();
            Alert.alert(
              t('common.success'),
              t('tree.personAdded') || 'Personne ajoutée avec succès'
            );
          }}
          newPersonId={newPersonData.id}
          newPersonName={newPersonData.name}
          currentPersonId={personId}
          relationshipType={relationshipType}
          existingParents={existingRelationships.parents}
          existingChildren={existingRelationships.children}
          existingPartnerId={existingRelationships.partnerId}
          onRelationshipsCreated={async () => {
            if (onPersonAdded) {
              await onPersonAdded();
            }
          }}
        />
      )}
    </>
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
});

