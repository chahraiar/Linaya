import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Modal, Pressable, Platform, Animated as RNAnimated } from 'react-native';
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

const DEFAULT_SCALE = 1.0;

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
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  // Initialize with mock data
  useEffect(() => {
    if (Object.keys(persons).length === 0) {
      setPersons(mockPersons);
    }
  }, []);

  // Update clusters when persons change
  useEffect(() => {
    const allPersons = Object.values(persons);
    if (allPersons.length > 0) {
      const newClusters = createClusters(allPersons);
      setClusters(newClusters);
    }
  }, [persons]);

  const handleNodePress = (personId: string) => {
    setSelectedPerson(personId);
    setShowPersonModal(true);
  };

  const selectedPerson = selectedPersonId ? getPerson(selectedPersonId) : null;

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.glassBackground }]}>
        <Text variant="heading" style={styles.headerTitle}>
          {t('tree.title')}
        </Text>
        <IconButton
          variant="glass"
          onPress={() => navigation.navigate('Settings')}
        >
          <Text>⚙️</Text>
        </IconButton>
      </View>

      {/* Tree Canvas - Version simplifiée sans animations */}
      <View style={styles.canvasContainer}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <TreeRenderer
            clusters={clusters}
            scale={scale}
            translateX={translateX}
            translateY={translateY}
            onNodePress={handleNodePress}
          />
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
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

