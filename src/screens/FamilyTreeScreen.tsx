import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Platform, Animated, PanResponder, Dimensions, GestureResponderEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Screen, Text, Button, IconButton, Card, Spacer } from '../components/ui';
import { useFamilyTreeStore } from '../store/familyTreeStore';
import { useSettingsStore } from '../store/settingsStore';
import { createClusters, Cluster } from '../features/familyTree/layout';
import { TreeRenderer } from '../features/familyTree/TreeRenderer';
import { mockPersons } from '../features/familyTree/mockData';
import { RootStackParamList } from '../navigation/navigation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const DEFAULT_SCALE = 1.5; // Augmenté pour que l'arbre soit plus visible au démarrage

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FamilyTreeScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { persons, setPersons, selectedPersonId, setSelectedPerson, getPerson } = useFamilyTreeStore();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Animation values for zoom and pan
  const scaleAnim = useRef(new Animated.Value(DEFAULT_SCALE)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  
  // State for current values (for TreeRenderer - not used anymore, transformations are in Animated.View)
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  
  // Track last pan position
  const lastPanX = useRef(0);
  const lastPanY = useRef(0);
  const lastScale = useRef(DEFAULT_SCALE);

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

  // Sync animated values to state
  useEffect(() => {
    const scaleListener = scaleAnim.addListener(({ value }) => {
      setScale(value);
      lastScale.current = value;
    });
    const xListener = translateXAnim.addListener(({ value }) => {
      setTranslateX(value);
      lastPanX.current = value;
    });
    const yListener = translateYAnim.addListener(({ value }) => {
      setTranslateY(value);
      lastPanY.current = value;
    });

    return () => {
      scaleAnim.removeListener(scaleListener);
      translateXAnim.removeListener(xListener);
      translateYAnim.removeListener(yListener);
    };
  }, []);

  // Track touches for pinch gesture
  const touches = useRef<{ [key: string]: { x: number; y: number } }>({});
  const lastPinchDistance = useRef<number | null>(null);
  const isPinching = useRef(false);
  const hasMoved = useRef(false);

  // Pan responder for drag and pinch
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        hasMoved.current = false;
        // Check if we have 2 touches (pinch gesture)
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
          isPinching.current = true;
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          lastPinchDistance.current = distance;
          return true; // Always capture pinch gestures
        }
        // For single touch, don't capture immediately - wait for movement
        return false;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond if there's significant movement (not just a tap)
        const moved = Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
        hasMoved.current = moved;
        return moved || isPinching.current;
      },
      onPanResponderGrant: () => {
        translateXAnim.setOffset(lastPanX.current);
        translateYAnim.setOffset(lastPanY.current);
        translateXAnim.setValue(0);
        translateYAnim.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Check if we have 2 touches (pinch gesture)
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
          isPinching.current = true;
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          
          if (lastPinchDistance.current !== null && lastPinchDistance.current > 0) {
            const scaleChange = distance / lastPinchDistance.current;
            const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, lastScale.current * scaleChange));
            scaleAnim.setValue(newScale);
            lastScale.current = newScale;
            console.log('📌 Pinch zoom:', newScale.toFixed(2));
          }
          lastPinchDistance.current = distance;
        } else if (!isPinching.current && hasMoved.current) {
          // Single touch with movement - pan gesture
          translateXAnim.setValue(gestureState.dx);
          translateYAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateXAnim.flattenOffset();
        translateYAnim.flattenOffset();
        // Update last position only if we actually moved (not just a tap)
        if (hasMoved.current && !isPinching.current) {
          lastPanX.current = lastPanX.current + gestureState.dx;
          lastPanY.current = lastPanY.current + gestureState.dy;
        }
        // Reset pinch state
        isPinching.current = false;
        lastPinchDistance.current = null;
        touches.current = {};
        hasMoved.current = false;
      },
      onPanResponderTerminationRequest: () => {
        // Allow other responders to take over if needed
        return false;
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
      const currentScale = lastScale.current;
      const newScale = currentScale < 2.0 ? 2.5 : DEFAULT_SCALE;
      
      console.log('🔍 Double-tap zoom: from', currentScale.toFixed(2), 'to', newScale.toFixed(2));
      
      Animated.spring(scaleAnim, {
        toValue: newScale,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }).start(() => {
        lastScale.current = newScale;
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
        lastPanX.current = 0;
        lastPanY.current = 0;
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
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, lastScale.current * scaleValue));
    scaleAnim.setValue(newScale);
    lastScale.current = newScale;
  };

  const handleNodePress = (personId: string) => {
    setSelectedPerson(personId);
    setShowPersonModal(true);
  };

  const selectedPerson = selectedPersonId ? getPerson(selectedPersonId) : null;

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
      <View 
        style={styles.canvasContainer}
        {...panResponder.panHandlers}
      >
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
        >
          {clusters.length > 0 ? (
            <TreeRenderer
              clusters={clusters}
              scale={1} // Don't apply scale twice - it's already in the Animated.View
              translateX={0} // Don't apply translate twice - it's already in the Animated.View
              translateY={0} // Don't apply translate twice - it's already in the Animated.View
              onNodePress={handleNodePress}
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text }}>Chargement de l'arbre...</Text>
            </View>
          )}
        </Animated.View>
        
        {/* Double tap handler - captures taps on empty space */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleDoubleTap}
          delayPressIn={0}
          pointerEvents="box-none"
        />
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

      {/* Person Details Modal */}
      <Modal
        visible={showPersonModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPersonModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPersonModal(false)}
        >
          <Card variant="elevated" style={styles.modalContent} padding="lg">
            {selectedPerson && (
              <>
                <Text variant="heading">{t('tree.personDetails')}</Text>
                <Spacer size="md" />
                <Text variant="subheading">
                  {selectedPerson.firstName} {selectedPerson.lastName}
                </Text>
                {selectedPerson.birthYear && (
                  <Text color="textSecondary">
                    {t('person.birthYear')}: {selectedPerson.birthYear}
                  </Text>
                )}
                {selectedPerson.deathYear && (
                  <Text color="textSecondary">
                    {t('person.deathYear')}: {selectedPerson.deathYear}
                  </Text>
                )}
                <Spacer size="lg" />
                <Button variant="primary" onPress={() => {}}>
                  {t('common.view')}
                </Button>
                <Spacer size="sm" />
                <Button variant="secondary" onPress={() => {}}>
                  {t('tree.addParent')}
                </Button>
                <Spacer size="sm" />
                <Button variant="secondary" onPress={() => {}}>
                  {t('tree.addChild')}
                </Button>
                <Spacer size="sm" />
                <Button variant="ghost" onPress={() => setShowPersonModal(false)}>
                  {t('common.close')}
                </Button>
              </>
            )}
          </Card>
        </Pressable>
      </Modal>

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

