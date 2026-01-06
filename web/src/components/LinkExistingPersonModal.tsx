import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createRelationship } from '../services/treeService';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { supabase } from '../lib/supabase';
import { UserIcon } from '@heroicons/react/24/outline';
import { showSuccess, showError } from '../utils/notifications';
import './LinkExistingPersonModal.css';

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
      showError('Erreur lors du chargement des personnes');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPerson = async (targetPersonId: string) => {
    if (!currentPerson) return;

    try {
      setIsLinking(true);

      // Get tree_id
      const { data: treeIdData, error: treeIdError } = await supabase
        .rpc('get_person_tree_id', { p_person_id: personId });
      
      if (treeIdError || !treeIdData) {
        showError('Impossible de trouver l\'arbre');
        return;
      }

      const treeId = treeIdData;

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

      const success = await createRelationship(treeId, fromId, toId, relType);

      if (success) {
        showSuccess(t('tree.personAdded') || 'Relation créée avec succès');
        
        if (onRelationshipCreated) {
          await onRelationshipCreated();
        }
        
        onClose();
      } else {
        showError('Erreur lors de la création de la relation');
      }
    } catch (error) {
      console.error('Error linking person:', error);
      showError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

  const getDescription = () => {
    switch (relationshipType) {
      case 'parent':
        return 'Sélectionnez un parent existant à lier';
      case 'child':
        return 'Sélectionnez un enfant existant à lier';
      case 'partner':
        return 'Sélectionnez un conjoint existant à lier';
      default:
        return '';
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{getRelationshipLabel()}</h2>
        
        <p className="modal-description">{getDescription()}</p>

        <input
          type="text"
          className="search-input"
          placeholder={t('common.search') || 'Rechercher...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="persons-list-container">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : filteredPersons.length === 0 ? (
            <div className="empty-container">
              <p className="empty-text">
                {searchQuery ? 'Aucune personne trouvée' : 'Aucune personne disponible'}
              </p>
            </div>
          ) : (
            <div className="persons-list">
              {filteredPersons.map((person) => (
                <div
                  key={person.id}
                  className="person-card"
                  onClick={() => handleLinkPerson(person.id)}
                >
                  <div className="person-card-content">
                    <div className="person-avatar">
                      <UserIcon className="person-avatar-icon" />
                    </div>
                    <div className="person-info">
                      <h4 className="person-name">
                        {person.firstName} {person.lastName}
                      </h4>
                      {person.birthYear && (
                        <p className="person-dates">
                          {person.birthYear}
                          {person.deathYear ? ` - ${person.deathYear}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={isLinking}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

