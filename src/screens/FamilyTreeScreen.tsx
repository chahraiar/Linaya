import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Platform, Animated, PanResponder, Dimensions, GestureResponderEvent, Alert, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Screen, Text, Button, IconButton, Card, Spacer } from '../components/ui';
import { useFamilyTreeStore, Person } from '../store/familyTreeStore';
import { useSettingsStore } from '../store/settingsStore';
import { createClusters } from '../features/familyTree/layout';
import { Cluster } from '../features/familyTree/types';
import { TreeRenderer } from '../features/familyTree/TreeRenderer';
import { RootStackParamList } from '../navigation/navigation';
import { 
  getCurrentUserProfile, 
  getUserTrees, 
  getTreeData, 
  createTree, 
  createPersonFromProfile,
  createPerson,
  Profile,
  Tree 
} from '../services/treeService';
import { AddPersonModal } from '../components/AddPersonModal';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const DEFAULT_SCALE = 0.6; // Zoom initial à 0.6

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FamilyTreeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { persons, setPersons, getPerson, selectedPersonId, addPerson } = useFamilyTreeStore();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  
  // User and tree state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentTree, setCurrentTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingTree, setCreatingTree] = useState(false);
  
  // Animation values for zoom and pan - using absolute values (no offsets)
  const scaleAnim = useRef(new Animated.Value(DEFAULT_SCALE)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  
  // Base values at the start of each gesture (simplified approach)
  const baseScale = useRef(DEFAULT_SCALE);
  const basePanX = useRef(0);
  const basePanY = useRef(0);
  
  // State for current values
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  
  // Initialize scale on mount
  useEffect(() => {
    scaleAnim.setValue(DEFAULT_SCALE);
    setScale(DEFAULT_SCALE);
    baseScale.current = DEFAULT_SCALE;
    console.log('🎬 Initialized scaleAnim - value:', DEFAULT_SCALE);
  }, []);

  // Load user profile and tree on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Clean person data: remove invalid relationship IDs
  const cleanPersonData = (persons: Person[]): Person[] => {
    // Create a map of valid person IDs
    const validPersonIds = new Set(persons.map(p => p.id));
    
    // Clean each person's relationships
    const cleanedPersons = persons.map(person => {
      // Filter out invalid parent IDs
      const validParentIds = person.parentIds.filter(id => validPersonIds.has(id));
      
      // Filter out invalid children IDs
      const validChildrenIds = person.childrenIds.filter(id => validPersonIds.has(id));
      
      // Check if partner ID is valid
      const validPartnerId = person.partnerId && validPersonIds.has(person.partnerId) 
        ? person.partnerId 
        : undefined;
      
      // Log if we removed any invalid IDs
      if (person.parentIds.length !== validParentIds.length) {
        const removed = person.parentIds.filter(id => !validPersonIds.has(id));
        console.warn(`⚠️ Removed invalid parent IDs for ${person.firstName} ${person.lastName}:`, removed);
      }
      if (person.childrenIds.length !== validChildrenIds.length) {
        const removed = person.childrenIds.filter(id => !validPersonIds.has(id));
        console.warn(`⚠️ Removed invalid children IDs for ${person.firstName} ${person.lastName}:`, removed);
      }
      if (person.partnerId && !validPartnerId) {
        console.warn(`⚠️ Removed invalid partner ID for ${person.firstName} ${person.lastName}:`, person.partnerId);
      }
      
      return {
        ...person,
        parentIds: validParentIds,
        childrenIds: validChildrenIds,
        partnerId: validPartnerId,
      };
    });
    
    // Ensure bidirectional relationships are consistent
    // If A has B as parent, then B should have A as child
    const personMap = new Map(cleanedPersons.map(p => [p.id, p]));
    
    cleanedPersons.forEach(person => {
      // Verify parent-child relationships are bidirectional
      person.parentIds.forEach(parentId => {
        const parent = personMap.get(parentId);
        if (parent && !parent.childrenIds.includes(person.id)) {
          console.warn(`⚠️ Adding missing child relationship: ${parent.firstName} ${parent.lastName} -> ${person.firstName} ${person.lastName}`);
          parent.childrenIds.push(person.id);
        }
      });
      
      // Verify child-parent relationships are bidirectional
      person.childrenIds.forEach(childId => {
        const child = personMap.get(childId);
        if (child && !child.parentIds.includes(person.id)) {
          console.warn(`⚠️ Adding missing parent relationship: ${child.firstName} ${child.lastName} -> ${person.firstName} ${person.lastName}`);
          child.parentIds.push(person.id);
        }
      });
      
      // Verify partner relationships are bidirectional
      if (person.partnerId) {
        const partner = personMap.get(person.partnerId);
        if (partner && partner.partnerId !== person.id) {
          console.warn(`⚠️ Fixing bidirectional partner relationship: ${person.firstName} ${person.lastName} <-> ${partner.firstName} ${partner.lastName}`);
          partner.partnerId = person.id;
        }
      }
    });
    
    return cleanedPersons;
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting loadUserData...');
      
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ Error getting user:', userError);
        throw userError;
      }
      
      if (!user) {
        console.log('⚠️ No user, redirecting to login');
        navigation.replace('Login');
        setLoading(false);
        return;
      }

      console.log('✅ User authenticated:', user.id);

      // Load profile
      console.log('📋 Loading profile...');
      const userProfile = await getCurrentUserProfile();
      console.log('📋 Profile loaded:', userProfile ? 'OK' : 'NULL');
      setProfile(userProfile);

      // Load user's trees
      console.log('🌳 Loading trees...');
      const trees = await getUserTrees();
      console.log('🌳 Trees loaded:', trees.length, 'tree(s)');
      
      if (trees.length > 0) {
        // Use the first tree (or most recent)
        const tree = trees[0];
        console.log('🌳 Using tree:', tree.id, tree.name);
        setCurrentTree(tree);
        
        // Load tree data
        console.log('👥 Loading tree persons...');
        const { persons: treePersons } = await getTreeData(tree.id);
        console.log('👥 Persons loaded:', treePersons.length, 'person(s)');
        if (treePersons.length > 0) {
          // Clean person data to remove invalid relationship IDs
          console.log('🧹 Cleaning person data...');
          const cleanedPersons = cleanPersonData(treePersons);
          console.log('✅ Person data cleaned');
          setPersons(cleanedPersons);
        } else {
          setPersons([]);
        }
      } else {
        // No tree yet
        console.log('🌳 No trees found');
        setCurrentTree(null);
        setPersons([]);
      }
      
      console.log('✅ loadUserData completed');
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      Alert.alert(
        t('common.error'), 
        `Erreur lors du chargement des données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
      // Ensure loading is set to false even on error
      setCurrentTree(null);
      setPersons([]);
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  const handleCreateTree = async () => {
    // Get profile (reload if needed)
    let profileToUse = profile;
    if (!profileToUse) {
      console.log('⚠️ Profile is null, reloading...');
      profileToUse = await getCurrentUserProfile();
      if (profileToUse) {
        setProfile(profileToUse);
      }
    }

    if (!profileToUse) {
      console.error('❌ Cannot create tree: profile is null');
      Alert.alert(t('common.error'), 'Profil utilisateur non disponible. Veuillez vous reconnecter.');
      return;
    }

    try {
      setCreatingTree(true);
      console.log('🌳 Creating tree for profile:', profileToUse.display_name);

      // Create tree
      const treeName = profileToUse.display_name 
        ? `Arbre de ${profileToUse.display_name}`
        : 'Mon arbre généalogique';
      
      console.log('🌳 Creating tree with name:', treeName);
      const newTree = await createTree(treeName);
      
      if (!newTree) {
        console.error('❌ Tree creation returned null');
        Alert.alert(t('common.error'), 'Erreur lors de la création de l\'arbre');
        setCreatingTree(false);
        return;
      }

      console.log('✅ Tree created:', newTree.id);

      // Create person from profile
      console.log('👤 Creating person from profile...');
      const person = await createPersonFromProfile(newTree.id, profileToUse!);
      
      if (!person) {
        console.error('❌ Person creation returned null');
        Alert.alert(t('common.error'), 'Erreur lors de la création de la personne');
        setCreatingTree(false);
        // Tree was created, reload data to show it
        await loadUserData();
        return;
      }

      console.log('✅ Person created:', person.id);

      // Update state
      setCurrentTree(newTree);
      setPersons([person]);
      
      console.log('✅ Tree and person created successfully');
      
      Alert.alert(
        t('tree.treeCreated'),
        t('tree.treeCreatedMessage'),
        [{ 
          text: t('common.ok'),
          onPress: () => {
            // Reload data to ensure consistency
            loadUserData();
          }
        }]
      );
    } catch (error) {
      console.error('❌ Error creating tree:', error);
      Alert.alert(
        t('common.error'), 
        `Erreur lors de la création de l'arbre: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    } finally {
      setCreatingTree(false);
    }
  };

  const handleCreateFirstPerson = async () => {
    if (!currentTree || !profile) {
      console.error('❌ Cannot create person: tree or profile is null');
      Alert.alert(t('common.error'), 'Données manquantes');
      return;
    }

    // Get profile (reload if needed)
    let profileToUse: Profile | null = profile;
    if (!profileToUse) {
      console.log('⚠️ Profile is null, reloading...');
      profileToUse = await getCurrentUserProfile();
      if (profileToUse) {
        setProfile(profileToUse);
      }
    }

    if (!profileToUse) {
      console.error('❌ Cannot create person: profile is null');
      Alert.alert(t('common.error'), 'Profil utilisateur non disponible. Veuillez vous reconnecter.');
      return;
    }

    try {
      setCreatingTree(true);
      console.log('👤 Creating first person from profile for tree:', currentTree.id);

      // Create person from profile
      const person = await createPersonFromProfile(currentTree.id, profileToUse);
      
      if (!person) {
        console.error('❌ Person creation returned null');
        Alert.alert(t('common.error'), 'Erreur lors de la création de la personne');
        setCreatingTree(false);
        return;
      }

      console.log('✅ Person created:', person.id);

      // Update state
      setPersons([person]);
      
      console.log('✅ First person created successfully');
      
      // Reload data to ensure consistency
      await loadUserData();
    } catch (error) {
      console.error('❌ Error creating person:', error);
      Alert.alert(
        t('common.error'), 
        `Erreur lors de la création de la personne: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    } finally {
      setCreatingTree(false);
    }
  };

  const handleAddPerson = async (data: {
    firstName: string;
    lastName: string;
    displayName?: string;
    birthDate?: Date;
    gender?: string;
  }) => {
    if (!currentTree) {
      Alert.alert(t('common.error'), 'Aucun arbre sélectionné');
      return;
    }

    try {
      setAddingPerson(true);
      console.log('➕ Creating new person:', data);

      const newPerson = await createPerson(
        currentTree.id,
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

      console.log('✅ Person created:', newPerson.id);

      // Add person to store immediately
      addPerson(newPerson);

      // Reload tree data to include the new person and relationships
      const { persons: updatedPersons } = await getTreeData(currentTree.id);
      setPersons(updatedPersons);

      Alert.alert(
        t('common.success'),
        t('tree.personAdded') || 'Personne ajoutée avec succès',
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error('❌ Error adding person:', error);
      Alert.alert(
        t('common.error'),
        `Erreur lors de l'ajout de la personne: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    } finally {
      setAddingPerson(false);
    }
  };

  // Update clusters when persons change
  useEffect(() => {
    const allPersons = Object.values(persons);
    console.log('Updating clusters, persons count:', allPersons.length);
    if (allPersons.length > 0) {
      // Log persons with their relationships for debugging
      allPersons.forEach((p) => {
        const parentNames = p.parentIds.map(id => {
          const parent = allPersons.find(pp => pp.id === id);
          return parent ? `${parent.firstName} ${parent.lastName}` : id;
        });
        console.log(`Person: ${p.firstName} ${p.lastName} - Parents (${p.parentIds.length}): [${parentNames.join(', ')}], Children: ${p.childrenIds.length}, Partner: ${p.partnerId ? 'Yes' : 'No'}`);
      });
      const newClusters = createClusters(allPersons);
      console.log('Clusters created:', newClusters.length, 'clusters with', newClusters.reduce((sum, c) => sum + c.nodes.length, 0), 'nodes');
      // Log nodes in each cluster
      newClusters.forEach((cluster, idx) => {
        console.log(`Cluster ${idx}: ${cluster.nodes.length} nodes - ${cluster.nodes.map(n => `${n.person.firstName} ${n.person.lastName}`).join(', ')}`);
      });
      setClusters(newClusters);
    } else {
      console.log('No persons to create clusters from');
    }
  }, [persons]);

  // Sync animated values to state (simplified - no complex offset logic)
  useEffect(() => {
    const scaleListener = scaleAnim.addListener(({ value }) => {
      if (isFinite(value) && value > 0) {
        setScale(value);
        console.log('🔍 ZOOM CHANGED - scale:', value.toFixed(2));
      }
    });
    const xListener = translateXAnim.addListener(({ value }) => {
      setTranslateX(value);
    });
    const yListener = translateYAnim.addListener(({ value }) => {
      setTranslateY(value);
    });

    return () => {
      scaleAnim.removeListener(scaleListener);
      translateXAnim.removeListener(xListener);
      translateYAnim.removeListener(yListener);
    };
  }, []);

  // Track pinch and pan gestures
  const lastPinchDistance = useRef<number | null>(null);
  const isPinching = useRef(false);
  const isPanning = useRef(false);
  const hasMoved = useRef(false);
  
  // Pan responder for drag and pinch
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const touchCount = evt.nativeEvent.touches?.length || 0;
        hasMoved.current = false;
        // Always capture pinch (2 touches)
        if (touchCount === 2) {
          console.log('📌 Pinch detected in onStartShouldSetPanResponder');
          isPinching.current = true;
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          lastPinchDistance.current = distance;
          return true;
        }
        // Don't capture single touch on start - let cards handle taps
        return false;
      },
      onStartShouldSetPanResponderCapture: (evt) => {
        // Don't capture in capture phase - let onStartShouldSetPanResponder handle it
        // This allows the PanResponder to be properly granted
        return false;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const moved = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        if (moved && !isPinching.current) {
          isPanning.current = true;
          hasMoved.current = true;
        }
        return moved || isPinching.current;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        const moved = Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
        return moved || isPinching.current;
      },
      onPanResponderGrant: (evt) => {
        // Stop any ongoing animations first
        scaleAnim.stopAnimation();
        translateXAnim.stopAnimation();
        translateYAnim.stopAnimation();
        
        // Save current values as base for this gesture (simplified approach)
        baseScale.current = scale;
        basePanX.current = translateX;
        basePanY.current = translateY;
        
        // If not pinching and we have a single touch, it's a pan gesture
        if (!isPinching.current && evt.nativeEvent.touches?.length === 1) {
          isPanning.current = true;
          console.log('✅ Pan gesture started');
        }
        
        console.log('✅ PanResponder GRANTED - isPinching:', isPinching.current, 'isPanning:', isPanning.current, 'baseScale:', baseScale.current.toFixed(2), 'basePanX:', basePanX.current.toFixed(1), 'basePanY:', basePanY.current.toFixed(1));
      },
      onPanResponderMove: (evt, gestureState) => {
        // Handle pinch zoom
        if (evt.nativeEvent.touches?.length === 2 && isPinching.current) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          
          if (lastPinchDistance.current !== null && lastPinchDistance.current > 0 && baseScale.current > 0) {
            // Calculate scale multiplier from distance change
            const scaleMultiplier = distance / lastPinchDistance.current;
            // Apply multiplier to base scale (value at start of gesture)
            const newScale = baseScale.current * scaleMultiplier;
            const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
            
            if (isFinite(clampedScale) && clampedScale > 0) {
              // Set absolute value directly (no offsets)
              scaleAnim.setValue(clampedScale);
              console.log('📌 PINCH ZOOM - distance:', distance.toFixed(1), 'prevDistance:', lastPinchDistance.current.toFixed(1), 'multiplier:', scaleMultiplier.toFixed(3), 'newScale:', clampedScale.toFixed(2));
            }
          }
          lastPinchDistance.current = distance;
        } 
        // Handle pan (drag)
        else if (isPanning.current && !isPinching.current) {
          // Add gesture displacement to base position
          translateXAnim.setValue(basePanX.current + gestureState.dx);
          translateYAnim.setValue(basePanY.current + gestureState.dy);
          console.log('➡️ Pan - baseX:', basePanX.current.toFixed(1), 'baseY:', basePanY.current.toFixed(1), 'dx:', gestureState.dx.toFixed(1), 'dy:', gestureState.dy.toFixed(1));
        } else {
          console.log('⚠️ PanResponderMove but no action - touches:', evt.nativeEvent.touches?.length, 'isPinching:', isPinching.current, 'isPanning:', isPanning.current);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        console.log('🔴 PanResponder RELEASED - isPinching:', isPinching.current, 'isPanning:', isPanning.current, 'hasMoved:', hasMoved.current);
        
        // Update last scale if we pinched
        if (isPinching.current) {
          // Stop any ongoing animations first
          scaleAnim.stopAnimation();
          
          // Get current scale from state (simplified approach)
          const currentScaleBeforeFlatten = scale;
          const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScaleBeforeFlatten));
          if (isFinite(clampedScale) && clampedScale > 0) {
            // Don't reset the scale - it's already correct from the pinch gesture
            // Just save it as base for next gesture
            baseScale.current = clampedScale;
          }
        }

        // Only flatten if we actually did something
        if (isPanning.current) {
          // Stop any ongoing animations first
          translateXAnim.stopAnimation();
          translateYAnim.stopAnimation();
          
          // For pan, flatten offsets to preserve position
          translateXAnim.flattenOffset();
          translateYAnim.flattenOffset();
        } else if (!isPinching.current) {
          // Just reset offsets without flattening if we didn't do anything
          translateXAnim.setOffset(0);
          translateYAnim.setOffset(0);
          scaleAnim.setValue(baseScale.current);
          translateXAnim.setValue(0);
          translateYAnim.setValue(0);
          scaleAnim.setValue(1);
          console.log('🔄 Reset offsets without flattening (no action)');
        }

        // Save current values as new base for next gesture (simplified approach)
        if (isPinching.current || isPanning.current) {
          // Get final values from state (they already have the correct absolute values)
          const finalScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
          const finalPanX = translateX;
          const finalPanY = translateY;
          
          // Update base values for next gesture
          baseScale.current = finalScale;
          basePanX.current = finalPanX;
          basePanY.current = finalPanY;
          
          console.log('💾 Saved base values - scale:', baseScale.current.toFixed(2), 'panX:', basePanX.current.toFixed(1), 'panY:', basePanY.current.toFixed(1));
        }
        
        // Reset state
        isPinching.current = false;
        isPanning.current = false;
        lastPinchDistance.current = null;
        hasMoved.current = false;
      },
      onPanResponderTerminationRequest: () => {
        console.log('🛑 PanResponderTerminationRequest - ALLOWING termination');
        // Allow children (cards) to take over if they request it
        return true;
      },
    })
  ).current;

  // Handle double tap for zoom
  const lastTap = useRef<number | null>(null);
  const lastTapPosition = useRef<{ x: number; y: number } | null>(null);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const handleDoubleTap = (event: GestureResponderEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    const DOUBLE_TAP_DISTANCE = 50; // Max distance between taps
    
    const currentX = event.nativeEvent.pageX;
    const currentY = event.nativeEvent.pageY;

    // Clear any pending timeout
    if (tapTimeout.current) {
      clearTimeout(tapTimeout.current);
      tapTimeout.current = null;
    }

    if (
      lastTap.current && 
      now - lastTap.current < DOUBLE_TAP_DELAY &&
      lastTapPosition.current &&
      Math.abs(currentX - lastTapPosition.current.x) < DOUBLE_TAP_DISTANCE &&
      Math.abs(currentY - lastTapPosition.current.y) < DOUBLE_TAP_DISTANCE
    ) {
      // Double tap detected - toggle between DEFAULT_SCALE and 2.5x
      const currentScale = baseScale.current;
      const newScale = currentScale < 2.0 ? 2.5 : DEFAULT_SCALE;
      
      console.log('🔍 Double-tap zoom: from', currentScale.toFixed(2), 'to', newScale.toFixed(2));
      
      Animated.spring(scaleAnim, {
        toValue: newScale,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start(() => {
        baseScale.current = newScale;
      });
      
      if (newScale === DEFAULT_SCALE) {
        // Reset position when zooming out
        Animated.parallel([
          Animated.spring(translateXAnim, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }),
        ]).start();
        basePanX.current = 0;
        basePanY.current = 0;
      }
      lastTap.current = null;
      lastTapPosition.current = null;
    } else {
      lastTap.current = now;
      lastTapPosition.current = { x: currentX, y: currentY };
      // Clear after delay
      tapTimeout.current = setTimeout(() => {
        lastTap.current = null;
        lastTapPosition.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };
  
  // Handle pinch gesture for zoom (if available)
  const handlePinch = (scaleValue: number) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, baseScale.current * scaleValue));
    scaleAnim.setValue(newScale);
    baseScale.current = newScale;
  };

  // Handle zoom in button
  const handleZoomIn = () => {
    const currentScale = baseScale.current;
    const newScale = Math.min(MAX_SCALE, currentScale + 0.2);
    Animated.spring(scaleAnim, {
      toValue: newScale,
      useNativeDriver: false, // false car scale n'est pas une transformation native
      tension: 50,
      friction: 7,
    }).start(() => {
      baseScale.current = newScale;
      setScale(newScale);
    });
  };

  // Handle zoom out button
  const handleZoomOut = () => {
    const currentScale = baseScale.current;
    const newScale = Math.max(MIN_SCALE, currentScale - 0.2);
    Animated.spring(scaleAnim, {
      toValue: newScale,
      useNativeDriver: false, // false car scale n'est pas une transformation native
      tension: 50,
      friction: 7,
    }).start(() => {
      baseScale.current = newScale;
      setScale(newScale);
    });
  };

  const handleNodePress = (personId: string) => {
    console.log('🚀 Navigating to PersonDetail for:', personId);
    try {
      navigation.navigate('PersonDetail', { personId });
      console.log('✅ Navigation called successfully');
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  return (
    <Screen gradient={false} style={{ backgroundColor: '#FAF9F6' }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'rgba(255, 255, 255, 0.95)' }]}>
        <View style={styles.headerLeft}>
          <Text variant="heading" style={[styles.headerTitle, { color: '#1A1A1A' }]}>
            {t('tree.title')}
          </Text>
          {profile && (
            <>
              <Spacer size="xs" horizontal />
              <Text variant="body" style={styles.headerSubtitle}>
                • {profile.display_name || 'Utilisateur'}
              </Text>
            </>
          )}
        </View>
        <IconButton
          variant="glass"
          onPress={() => navigation.navigate('Settings')}
        >
          <Text>⚙️</Text>
        </IconButton>
      </View>

      {/* Loading or Empty State */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Spacer size="md" />
          <Text variant="body" color="textSecondary">
            {t('common.loading')}
          </Text>
        </View>
      ) : !currentTree ? (
        <View style={styles.centerContainer}>
          <Text variant="heading" weight="bold" color="text" style={styles.emptyTitle}>
            {t('tree.noTree')}
          </Text>
          <Spacer size="md" />
          <Text variant="body" color="textSecondary" style={styles.emptyDescription}>
            {t('tree.noTreeDescription')}
          </Text>
          <Spacer size="xl" />
          <Button
            variant="primary"
            size="lg"
            onPress={handleCreateTree}
            loading={creatingTree}
            disabled={creatingTree}
          >
            <Text variant="subheading" weight="semibold" color="textInverse">
              {t('tree.createTreeFromProfile')}
            </Text>
          </Button>
        </View>
      ) : Object.keys(persons).length === 0 ? (
        <View style={styles.centerContainer}>
          <Text variant="heading" weight="bold" color="text" style={styles.emptyTitle}>
            {t('tree.emptyTree')}
          </Text>
          <Spacer size="md" />
          <Text variant="body" color="textSecondary" style={styles.emptyDescription}>
            {t('tree.emptyTreeDescription')}
          </Text>
          <Spacer size="xl" />
          <Button
            variant="primary"
            size="lg"
            onPress={handleCreateFirstPerson}
            loading={creatingTree}
            disabled={creatingTree}
          >
            <Text variant="subheading" weight="semibold" color="textInverse">
              {t('tree.createFirstPerson')}
            </Text>
          </Button>
        </View>
      ) : (
        <>
          {/* Tree Canvas with zoom and pan */}
          <View style={styles.canvasContainer}>
        {/* Layer 1: Background PanResponder - ONLY for gestures, invisible */}
        <View
          style={StyleSheet.absoluteFill}
          {...panResponder.panHandlers}
          collapsable={false}
        />
        
        {/* Layer 2: Animated SVG layer (links) - no touch events */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateX: translateXAnim },
                { translateY: translateYAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
          pointerEvents="none"
        >
          {clusters.length > 0 ? (
            <TreeRenderer
              clusters={clusters}
              scale={1}
              translateX={0}
              translateY={0}
              onNodePress={handleNodePress}
              renderLinksOnly={true}
            />
          ) : null}
        </Animated.View>
        
        {/* Layer 3: Animated Cards layer - interactive, ABOVE PanResponder */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateX: translateXAnim },
                { translateY: translateYAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          {clusters.length > 0 && (
            <TreeRenderer
              clusters={clusters}
              scale={1}
              translateX={0}
              translateY={0}
              onNodePress={handleNodePress}
              renderCardsOnly={true}
            />
          )}
        </Animated.View>
        
      </View>

          {/* Bottom UI */}
          <View style={styles.bottomUI}>
        {/* Search pill */}
        <View style={[styles.searchPill, { backgroundColor: theme.colors.glassBackground, borderColor: theme.colors.glassBorder }]}>
          <Text>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={t('common.search')}
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Add button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowAddMenu(true)}
          activeOpacity={0.8}
        >
          <Text variant="heading" color="textInverse">+</Text>
        </TouchableOpacity>
      </View>


      {/* Add Menu Modal */}
      <Modal
        visible={showAddMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAddMenu(false)}
        >
          <Card variant="elevated" style={styles.addMenuContent} padding="md">
            <Button 
              variant="primary" 
              onPress={() => {
                setShowAddMenu(false);
                setShowAddPersonModal(true);
              }}
            >
              {t('tree.addPerson')}
            </Button>
            <Spacer size="sm" />
            <Button variant="ghost" onPress={() => setShowAddMenu(false)}>
              {t('common.cancel')}
            </Button>
          </Card>
        </Pressable>
      </Modal>

      {/* Add Person Modal */}
      <AddPersonModal
        visible={showAddPersonModal}
        onClose={() => setShowAddPersonModal(false)}
        onSubmit={handleAddPerson}
        loading={addingPerson}
      />

          {/* Zoom Controls */}
          <View style={styles.zoomControlsContainer}>
            <View style={styles.zoomControls}>
              <TouchableOpacity
                onPress={handleZoomIn}
                activeOpacity={0.6}
                style={styles.zoomButton}
              >
                <View style={styles.zoomButtonCircle}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx="12" cy="12" r="10" />
                    <Path d="M12 8v8M8 12h8" />
                  </Svg>
                </View>
              </TouchableOpacity>
              <View style={styles.zoomDivider} />
              <TouchableOpacity
                onPress={handleZoomOut}
                activeOpacity={0.6}
                style={styles.zoomButton}
              >
                <View style={styles.zoomButtonCircle}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx="12" cy="12" r="10" />
                    <Path d="M8 12h8" />
                  </Svg>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    maxWidth: 300,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666', // ✅ Gris foncé pour la visibilité
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent', // Will use Screen background
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  bottomUI: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  zoomControlsContainer: {
    position: 'absolute',
    right: 20,
    top: 100,
    zIndex: 1000,
  },
  zoomControls: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 20,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 44,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Fond sombre semi-transparent
  },
  zoomButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginVertical: 4,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  addMenuContent: {
    alignSelf: 'center',
    minWidth: 200,
    marginBottom: 100,
  },
});
