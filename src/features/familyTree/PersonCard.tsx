import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../design-system/ThemeProvider';
import { Person } from '../../store/familyTreeStore';

interface PersonCardProps {
  person: Person;
  onPress: (personId: string) => void;
  isSelected?: boolean;
}

const AVATAR_SIZE = 60;
const CARD_WIDTH = 150;
const CARD_HEIGHT = 130;

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
}) => {
  const { theme } = useTheme();
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

  return (
    <TouchableOpacity
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
      activeOpacity={0.7}
      style={[
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
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    paddingVertical: 12,
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
  },
});

export { CARD_WIDTH, CARD_HEIGHT, AVATAR_SIZE };

