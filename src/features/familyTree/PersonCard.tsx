import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../design-system/ThemeProvider';
import { Person } from '../../store/familyTreeStore';
import { getPersonPhotoUrl } from '../../services/treeService';

interface PersonCardProps {
  person: Person;
  onPress: (personId: string) => void;
  isSelected?: boolean;
  disableTouch?: boolean; // Disable TouchableOpacity for drag operations
}

const AVATAR_SIZE = 60;
const CARD_WIDTH = 150;
const CARD_HEIGHT = 160; // ✅ Augmenté pour que la date soit visible

/**
 * Generate a simple avatar placeholder based on person's name
 */
const getAvatarPlaceholder = (person: Person): string => {
  // For now, return a placeholder. Later, this could use initials or a generated avatar
  return '👤';
};

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onPress,
  isSelected = false,
  disableTouch = false,
}) => {
  const { theme } = useTheme();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Load photo when person changes
  useEffect(() => {
    const loadPhoto = async () => {
      try {
        const url = await getPersonPhotoUrl(person.id);
        setPhotoUrl(url);
      } catch (error) {
        console.error('Error loading photo for PersonCard:', error);
        setPhotoUrl(null);
      }
    };
    loadPhoto();
  }, [person.id]);

  // Build full name, handling empty firstName/lastName or email in firstName
  const firstName = person.firstName?.trim() || '';
  const lastName = person.lastName?.trim() || '';
  // If firstName looks like an email, don't use it
  const isEmail = firstName.includes('@');
  const fullName = isEmail 
    ? (lastName || 'Sans nom')
    : `${firstName} ${lastName}`.trim() || 'Sans nom';
  const dates = person.birthYear
    ? `${person.birthYear}${person.deathYear ? `-${person.deathYear}` : '-'}`
    : '';

  const cardContent = (
    <>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.primary + '15',
                borderColor: theme.colors.primary + '30',
              },
            ]}
          >
            <Text style={styles.avatarText}>{getAvatarPlaceholder(person)}</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text
        variant="body"
        weight="semibold"
        style={[styles.name, { color: '#1A1A1A' }]}
        numberOfLines={2}
      >
        {fullName}
      </Text>

      {/* Dates */}
      {dates && (
        <Text
          variant="caption"
          color="textSecondary"
          style={[styles.dates, { color: '#666666' }]}
        >
          {dates}
        </Text>
      )}
    </>
  );

  const cardStyle = [
    styles.card,
    {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isSelected ? 0.2 : 0.1,
      shadowRadius: isSelected ? 10 : 8,
      elevation: isSelected ? 6 : 3,
      borderWidth: isSelected ? 2.5 : 0,
      borderColor: isSelected ? theme.colors.primary : 'transparent',
      transform: [{ scale: isSelected ? 1.03 : 1 }],
    },
  ];

  // If disableTouch is true, render as View instead of TouchableOpacity (for drag operations)
  if (disableTouch) {
    return <View style={cardStyle}>{cardContent}</View>;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={cardStyle}
      onPress={() => {
        console.log('🎯 PersonCard pressed:', person.id, person.firstName, person.lastName);
        onPress(person.id);
      }}
      onPressIn={() => {
        console.log('👆 Card TouchableOpacity press IN:', person.firstName, person.lastName);
      }}
      onPressOut={() => {
        console.log('👋 Card TouchableOpacity press OUT:', person.firstName, person.lastName);
      }}
    >
      {cardContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT, // ✅ Utilise minHeight pour flexibilité
    paddingTop: 12,
    paddingBottom: 20, // ✅ Plus d'espace en bas pour la date
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  avatarText: {
    fontSize: 24,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 5,
    lineHeight: 18,
  },
  dates: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 2, // ✅ Espacement supplémentaire
    marginBottom: 0, // ✅ Pas de marginBottom pour éviter le débordement
  },
});

export { CARD_WIDTH, CARD_HEIGHT, AVATAR_SIZE };

