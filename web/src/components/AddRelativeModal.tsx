import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPerson, createRelationship } from '../services/treeService';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { supabase } from '../lib/supabase';
import { AddPersonModal } from './AddPersonModal';
import { showSuccess, showError } from '../utils/notifications';
import './AddRelativeModal.css';

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
  const { addPerson } = useFamilyTreeStore();
  
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);

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
        showError('Impossible de trouver l\'arbre');
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
        showError('Erreur lors de la création de la personne');
        return;
      }

      // Add person to store
      addPerson(newPerson);

      // Create the primary relationship
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
      const relationshipCreated = await createRelationship(treeId, fromId, toId, relType);
      
      if (!relationshipCreated) {
        showError('Erreur lors de la création de la relation');
        return;
      }

      // Reload data
      if (onPersonAdded) {
        await onPersonAdded();
      }

      setShowPersonForm(false);
      onClose();

      showSuccess(t('tree.personAdded') || 'Personne ajoutée avec succès');
    } catch (error) {
      console.error('Error in handlePersonSubmit:', error);
      showError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

  const getDescription = () => {
    switch (relationshipType) {
      case 'parent':
        return t('person.addParentDescription') || 'Ajouter un parent de cette personne';
      case 'child':
        return t('person.addChildDescription') || 'Ajouter un enfant de cette personne';
      case 'partner':
        return t('person.addPartnerDescription') || 'Ajouter un conjoint à cette personne';
      default:
        return '';
    }
  };

  if (!visible) return null;

  return (
    <>
      {!showPersonForm ? (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{getRelationshipLabel()}</h2>
            
            <p className="modal-description">{getDescription()}</p>

            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowPersonForm(true)}
                disabled={loading || isCreatingPerson}
              >
                {t('tree.addPerson')}
              </button>

              <button className="btn btn-secondary" onClick={onClose}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AddPersonModal
          visible={showPersonForm}
          onClose={() => setShowPersonForm(false)}
          onSubmit={handlePersonSubmit}
          loading={isCreatingPerson}
        />
      )}
    </>
  );
};

