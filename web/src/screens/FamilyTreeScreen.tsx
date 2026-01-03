import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { getTreeData, getUserTrees, getPersonPositions, savePersonPosition, createTree, getSelfPersonId, createPerson, deleteTree, Tree, setPersonVisibility } from '../services/treeService';
import { createClusters } from '../features/familyTree/layout';
import TreeRenderer from '../features/familyTree/TreeRenderer';
import { useTranslation } from 'react-i18next';
import { 
  PencilSquareIcon, 
  CheckIcon, 
  Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon,
  PlusIcon,
  MinusIcon,
  ChevronDownIcon,
  UserPlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { AddPersonModal } from '../components/AddPersonModal';
import './FamilyTreeScreen.css';

const FamilyTreeScreen = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    persons,
    setPersons, 
    customPositions, 
    setCustomPositions, 
    isEditMode, 
    setEditMode,
    getPerson,
    addPerson
  } = useFamilyTreeStore();
  
  const [loading, setLoading] = useState(true);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [treeId, setTreeId] = useState<string | null>(null);
  const [currentTree, setCurrentTree] = useState<Tree | null>(null);
  const [showTreeSelector, setShowTreeSelector] = useState(false);
  const [clusters, setClusters] = useState<any[]>([]);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selfPersonId, setSelfPersonId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [showAddFirstPersonModal, setShowAddFirstPersonModal] = useState(false);
  const [isCreatingFirstPerson, setIsCreatingFirstPerson] = useState(false);

  // Get all persons as array (memoized)
  const allPersons = useMemo(() => Object.values(persons), [persons]);
  
  // Check if tree is empty and user can edit
  const isEmptyTree = allPersons.length === 0;
  const canEditTree = currentTree?.role === 'owner' || currentTree?.role === 'editor';

  // Get URL treeId parameter
  const urlTreeId = searchParams.get('treeId');

  useEffect(() => {
    loadUserData();
  }, []);

  // Close tree selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showTreeSelector && !target.closest('.tree-selector-container')) {
        setShowTreeSelector(false);
      }
    };

    if (showTreeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTreeSelector]);

  // Update tree when URL parameter changes
  useEffect(() => {
    if (urlTreeId && trees.length > 0) {
      const tree = trees.find(t => t.id === urlTreeId);
      if (tree) {
        setTreeId(urlTreeId);
        setCurrentTree(tree);
        // Disable edit mode if user is only a viewer
        if (tree.role === 'viewer' && isEditMode) {
          setEditMode(false);
        }
        loadTreeData(urlTreeId);
      }
    }
  }, [urlTreeId, trees]);

  // Update display name when self person is found
  useEffect(() => {
    if (selfPersonId) {
      const selfPerson = getPerson(selfPersonId);
      if (selfPerson) {
        const fullName = `${selfPerson.firstName} ${selfPerson.lastName}`.trim();
        if (fullName) {
          setUserDisplayName(fullName);
        }
      }
    }
  }, [selfPersonId, persons, getPerson]);

  // Update clusters when persons or customPositions change
  // Filter out hidden persons (isVisible === false)
  useEffect(() => {
    const visiblePersons = allPersons.filter(p => p.isVisible !== false);
    if (visiblePersons.length > 0) {
      console.log('🔄 Creating clusters from', visiblePersons.length, 'visible persons (total:', allPersons.length, ')');
      createClusters(visiblePersons, customPositions).then((clusters) => {
        const totalNodes = clusters.reduce((sum, c) => sum + c.nodes.length, 0);
        console.log('✅ Clusters created:', {
          clustersCount: clusters.length,
          totalNodes,
          expectedNodes: allPersons.length,
          missing: allPersons.length - totalNodes,
          clusterDetails: clusters.map(c => ({
            id: c.id,
            nodeCount: c.nodes.length,
            personNames: c.nodes.map(n => `${n.person.firstName} ${n.person.lastName}`),
          })),
        });
        if (totalNodes !== allPersons.length) {
          const allNodeIds = new Set(clusters.flatMap(c => c.nodes.map(n => n.person.id)));
          const missingPersons = allPersons.filter(p => !allNodeIds.has(p.id));
          console.warn('⚠️ Missing persons in clusters:', missingPersons.map(p => `${p.firstName} ${p.lastName} (${p.id})`));
        }
        setClusters(clusters);
      }).catch((error) => {
        console.error('Error creating clusters:', error);
      });
    } else {
      setClusters([]);
    }
  }, [allPersons, customPositions]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // getUserTrees now automatically joins trees where user's email appears
      const loadedTrees = await getUserTrees();
      setTrees(loadedTrees);
      
      if (loadedTrees.length === 0) {
        // Create default tree
        const newTree = await createTree('Mon arbre généalogique');
        if (newTree) {
          const updatedTrees = await getUserTrees();
          setTrees(updatedTrees);
          const tree = updatedTrees.find(t => t.id === newTree.id);
          if (tree) {
            setTreeId(newTree.id);
            setCurrentTree(tree);
            setSearchParams({ treeId: newTree.id });
            await loadTreeData(newTree.id);
          }
        }
      } else {
        // Determine which tree to show
        let selectedTree: Tree | null = null;
        
        // If URL has treeId, use it
        if (urlTreeId) {
          selectedTree = loadedTrees.find(t => t.id === urlTreeId) || null;
        }
        
        // Otherwise, prefer user's own tree (owner role)
        if (!selectedTree) {
          selectedTree = loadedTrees.find(t => t.role === 'owner') || loadedTrees[0];
        }
        
        if (selectedTree) {
          setTreeId(selectedTree.id);
          setCurrentTree(selectedTree);
          if (!urlTreeId) {
            setSearchParams({ treeId: selectedTree.id });
          }
          await loadTreeData(selectedTree.id);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTreeChange = (newTreeId: string) => {
    setSearchParams({ treeId: newTreeId });
    setShowTreeSelector(false);
  };

  const handleCreateNewTree = async () => {
    const treeName = prompt('Nom de l\'arbre :', 'Mon arbre généalogique');
    if (!treeName) return;
    
    try {
      const newTree = await createTree(treeName);
      if (newTree) {
        const updatedTrees = await getUserTrees();
        setTrees(updatedTrees);
        const tree = updatedTrees.find(t => t.id === newTree.id);
        if (tree) {
          handleTreeChange(newTree.id);
        }
      }
    } catch (error) {
      console.error('Error creating tree:', error);
      alert('Erreur lors de la création de l\'arbre');
    }
  };

  const handleDeleteTree = async (treeToDelete: Tree) => {
    // First confirmation
    const firstConfirm = confirm(
      `⚠️ ATTENTION : Vous êtes sur le point de supprimer l'arbre "${treeToDelete.name}".\n\n` +
      `Cette action est IRREVERSIBLE et supprimera :\n` +
      `- Toutes les personnes de l'arbre\n` +
      `- Toutes les relations\n` +
      `- Toutes les photos et médias\n` +
      `- Toutes les positions personnalisées\n\n` +
      `Êtes-vous ABSOLUMENT SÛR de vouloir continuer ?`
    );
    
    if (!firstConfirm) return;
    
    // Second confirmation
    const secondConfirm = confirm(
      `🚨 DERNIÈRE CONFIRMATION 🚨\n\n` +
      `Vous allez DÉFINITIVEMENT supprimer l'arbre "${treeToDelete.name}".\n\n` +
      `Cette action ne peut PAS être annulée.\n\n` +
      `Tapez OK pour confirmer la suppression.`
    );
    
    if (!secondConfirm) return;
    
    try {
      const success = await deleteTree(treeToDelete.id);
      
      if (success) {
        // Remove tree from local state
        const updatedTrees = trees.filter(t => t.id !== treeToDelete.id);
        setTrees(updatedTrees);
        
        // If deleted tree was current, switch to another tree
        if (treeToDelete.id === treeId) {
          if (updatedTrees.length > 0) {
            const nextTree = updatedTrees.find(t => t.role === 'owner') || updatedTrees[0];
            if (nextTree) {
              handleTreeChange(nextTree.id);
            } else {
              // No trees left, reload to create default tree
              await loadUserData();
            }
          } else {
            // No trees left, reload to create default tree
            await loadUserData();
          }
        }
        
        alert('Arbre supprimé avec succès');
      } else {
        alert('Erreur lors de la suppression de l\'arbre');
      }
    } catch (error: any) {
      console.error('Error deleting tree:', error);
      alert(error.message || 'Erreur lors de la suppression de l\'arbre');
    }
  };

  const loadTreeData = async (id: string) => {
    try {
      const { persons, relationships } = await getTreeData(id);
      console.log('📊 Loaded tree data:', {
        personsCount: persons.length,
        relationshipsCount: relationships.length,
        personIds: persons.map(p => `${p.firstName} ${p.lastName} (${p.id})`),
      });
      setPersons(persons);
      
      const positions = await getPersonPositions(id);
      setCustomPositions(positions);

      // Get self person ID by checking all persons
      const personIds = persons.map(p => p.id);
      const selfId = await getSelfPersonId(id, personIds);
      setSelfPersonId(selfId);
      if (selfId) {
        const selfPerson = persons.find(p => p.id === selfId);
        console.log('👤 Self person ID:', selfId, 'Name:', selfPerson ? `${selfPerson.firstName} ${selfPerson.lastName}` : 'Unknown');
      } else {
        console.log('⚠️ No self person found in tree');
      }
    } catch (error) {
      console.error('Error loading tree data:', error);
    }
  };

  const handleNodePress = useCallback((personId: string) => {
    navigate(`/person/${personId}`);
  }, [navigate]);

  const handleHidePerson = async (personId: string) => {
    if (!canEditTree) return;
    
    try {
      const success = await setPersonVisibility(personId, false);
      if (success) {
        // Update person in store immediately (optimistic update)
        const person = getPerson(personId);
        if (person) {
          const { updatePerson } = useFamilyTreeStore.getState();
          updatePerson(personId, { isVisible: false });
        }
        // No need to reload all data - the filter in useEffect will handle it
        // The card will disappear immediately from the tree view
      } else {
        alert('Erreur lors du masquage de la carte');
      }
    } catch (error: any) {
      console.error('Error hiding person:', error);
      // Revert optimistic update on error
      const person = getPerson(personId);
      if (person) {
        const { updatePerson } = useFamilyTreeStore.getState();
        updatePerson(personId, { isVisible: true });
      }
      alert(`Erreur lors du masquage de la carte: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleNodePositionChange = useCallback(async (personId: string, x: number, y: number) => {
    if (treeId) {
      await savePersonPosition(treeId, personId, x, y);
    }
  }, [treeId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleCreateFirstPerson = async (data: {
    firstName: string;
    lastName: string;
    displayName?: string;
    birthDate?: Date;
    gender?: string;
  }) => {
    if (!treeId) return;

    setIsCreatingFirstPerson(true);
    try {
      const newPerson = await createPerson(
        treeId,
        data.firstName,
        data.lastName,
        data.displayName,
        data.birthDate,
        data.gender
      );

      if (newPerson) {
        // Add person to store
        addPerson(newPerson);
        
        // Reload tree data to show the new person
        await loadTreeData(treeId);
        setShowAddFirstPersonModal(false);
        alert('Votre profil a été créé avec succès !');
      } else {
        alert('Erreur lors de la création de votre profil');
      }
    } catch (error) {
      console.error('Error creating first person:', error);
      alert('Erreur lors de la création de votre profil');
    } finally {
      setIsCreatingFirstPerson(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Separate trees by ownership
  const ownedTrees = trees.filter(t => t.role === 'owner');
  const sharedTrees = trees.filter(t => t.role !== 'owner');

  return (
    <div className="family-tree-screen">
      <header className="tree-header">
        <div className="tree-header-left">
          <div className="tree-selector-container">
            <button
              onClick={() => setShowTreeSelector(!showTreeSelector)}
              className="tree-selector-btn"
            >
              <span className="tree-selector-label">
                {currentTree ? (
                  <>
                    <span className="tree-name">{currentTree.name}</span>
                    <span className="tree-role-badge">{currentTree.role === 'owner' ? 'Mon arbre' : 'Partagé'}</span>
                  </>
                ) : (
                  t('tree.title')
                )}
              </span>
              <ChevronDownIcon className="icon-inline" />
            </button>
            
            {showTreeSelector && (
              <div className="tree-selector-dropdown">
                {ownedTrees.length > 0 && (
                  <div className="tree-selector-section">
                    <div className="tree-selector-section-title">Mes arbres</div>
                    {ownedTrees.map(tree => (
                      <div key={tree.id} className="tree-selector-item-wrapper">
                        <button
                          onClick={() => handleTreeChange(tree.id)}
                          className={`tree-selector-item ${tree.id === treeId ? 'active' : ''}`}
                        >
                          <span>{tree.name}</span>
                          {tree.id === treeId && <CheckIcon className="icon-inline" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTree(tree);
                          }}
                          className="tree-selector-delete-btn"
                          title="Supprimer l'arbre"
                        >
                          <TrashIcon className="icon-inline" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {sharedTrees.length > 0 && (
                  <div className="tree-selector-section">
                    <div className="tree-selector-section-title">Arbres partagés</div>
                    {sharedTrees.map(tree => (
                      <button
                        key={tree.id}
                        onClick={() => handleTreeChange(tree.id)}
                        className={`tree-selector-item ${tree.id === treeId ? 'active' : ''}`}
                      >
                        <span>{tree.name}</span>
                        <span className="tree-role-badge-small">{tree.role}</span>
                        {tree.id === treeId && <CheckIcon className="icon-inline" />}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="tree-selector-divider"></div>
                <button
                  onClick={handleCreateNewTree}
                  className="tree-selector-item tree-selector-create"
                >
                  <PlusIcon className="icon-inline" />
                  <span>Créer un nouvel arbre</span>
                </button>
              </div>
            )}
          </div>
          
          {currentTree && userDisplayName && currentTree.role === 'owner' && (
            <span className="tree-subtitle">: {userDisplayName}</span>
          )}
        </div>
        
        <div className="tree-actions">
          <button 
            onClick={() => setEditMode(!isEditMode)}
            className={`tree-btn-icon ${isEditMode ? 'active' : ''}`}
            title={isEditMode ? t('tree.exitEditMode') : t('tree.editMode')}
            disabled={currentTree?.role !== 'owner' && currentTree?.role !== 'editor'}
          >
            {isEditMode ? (
              <CheckIcon className="icon" />
            ) : (
              <PencilSquareIcon className="icon" />
            )}
          </button>
          <button onClick={() => navigate('/settings')} className="tree-btn-icon" title={t('settings.title')}>
            <Cog6ToothIcon className="icon" />
          </button>
          <button onClick={handleLogout} className="tree-btn-icon" title={t('common.logout')}>
            <ArrowLeftOnRectangleIcon className="icon" />
          </button>
        </div>
      </header>

      {isEmptyTree && canEditTree ? (
        <div className="empty-tree-container">
          <div className="empty-tree-content">
            <UserPlusIcon className="empty-tree-icon" />
            <h2 className="empty-tree-title">{t('tree.emptyTree')}</h2>
            <p className="empty-tree-description">{t('tree.emptyTreeDescription')}</p>
            <button
              onClick={() => setShowAddFirstPersonModal(true)}
              className="btn btn-primary btn-large"
            >
              <UserPlusIcon className="icon-inline" />
              {t('tree.createFirstPerson')}
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="tree-container"
          onMouseDown={(e) => {
            if (!isEditMode && e.button === 0) {
              setIsPanning(true);
              setPanStart({ x: e.clientX - translateX, y: e.clientY - translateY });
            }
          }}
          onMouseMove={(e) => {
            if (isPanning && !isEditMode) {
              setTranslateX(e.clientX - panStart.x);
              setTranslateY(e.clientY - panStart.y);
            }
          }}
          onMouseUp={() => setIsPanning(false)}
          onMouseLeave={() => setIsPanning(false)}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale(prev => Math.max(0.3, Math.min(3, prev * delta)));
          }}
          style={{ cursor: isPanning ? 'grabbing' : isEditMode ? 'default' : 'grab' }}
        >
          <TreeRenderer
            clusters={clusters}
            scale={scale}
            translateX={translateX}
            translateY={translateY}
            onNodePress={handleNodePress}
            onNodePositionChange={handleNodePositionChange}
            onNodeHide={handleHidePerson}
            canEdit={canEditTree}
            treeId={treeId || undefined}
            selfPersonId={selfPersonId || undefined}
          />
        </div>
      )}

      <AddPersonModal
        visible={showAddFirstPersonModal}
        onClose={() => setShowAddFirstPersonModal(false)}
        onSubmit={handleCreateFirstPerson}
        loading={isCreatingFirstPerson}
      />

      <div className="tree-controls">
        <button 
          onClick={() => setScale(prev => prev * 1.2)} 
          className="tree-btn-control"
          disabled={scale >= 3}
          title={t('tree.zoomIn')}
        >
          <PlusIcon className="icon" />
        </button>
        <button 
          onClick={() => setScale(prev => prev / 1.2)} 
          className="tree-btn-control"
          disabled={scale <= 0.3}
          title={t('tree.zoomOut')}
        >
          <MinusIcon className="icon" />
        </button>
      </div>
    </div>
  );
};

export default FamilyTreeScreen;

