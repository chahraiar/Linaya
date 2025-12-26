import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Platform, Animated, PanResponder, Dimensions, GestureResponderEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Screen, Text, Button, IconButton, Card, Spacer } from '../components/ui';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { useSettingsStore } from '../store/settingsStore';
import { createClusters } from '../features/familyTree/layout';
import { Cluster } from '../features/familyTree/types';
import { TreeRenderer } from '../features/familyTree/TreeRenderer';
import { mockPersons } from '../features/familyTree/mockData';
import { RootStackParamList } from '../navigation/navigation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const DEFAULT_SCALE = 0.6; // Zoom initial à 0.6

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FamilyTreeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { persons, setPersons, getPerson, selectedPersonId } = useFamilyTreeStore();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  
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

  // Initialize with mock data
  useEffect(() => {
    if (Object.keys(persons).length === 0) {
      console.log('Initializing with mock data:', mockPersons.length, 'persons');
      setPersons(mockPersons);
    }
  }, []);

  // Update clusters when persons change
  useEffect(() => {
    const allPersons = Object.values(persons);
    console.log('Updating clusters, persons count:', allPersons.length);
    if (allPersons.length > 0) {
      const newClusters = createClusters(allPersons);
      console.log('Clusters created:', newClusters.length, 'clusters with', newClusters.reduce((sum, c) => sum + c.nodes.length, 0), 'nodes');
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
        <Text variant="heading" style={[styles.headerTitle, { color: '#1A1A1A' }]}>
          {t('tree.title')}
        </Text>
        <IconButton
          variant="glass"
          onPress={() => navigation.navigate('Settings')}
        >
          <Text>⚙️</Text>
        </IconButton>
      </View>

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
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
              <Text style={{ color: theme.colors.text }}>Chargement de l'arbre...</Text>
            </View>
          )}
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
            <Button variant="primary" onPress={() => {}}>
              {t('tree.addPerson')}
            </Button>
            <Spacer size="sm" />
            <Button variant="ghost" onPress={() => setShowAddMenu(false)}>
              {t('common.cancel')}
            </Button>
          </Card>
        </Pressable>
      </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
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

