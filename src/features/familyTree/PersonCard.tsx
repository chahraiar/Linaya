import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../../components/ui/Text';
import { useTheme } from '../../design-system/ThemeProvider';
import { Person } from '../../store/familyTreeStore';

interface PersonCardProps {
  person: Person;
  onPress: () => void;
  isSelected?: boolean;
}

const AVATAR_SIZE = 56;
const CARD_WIDTH = 140;
const CARD_HEIGHT = 120;

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
  const fullName = `${person.firstName} ${person.lastName}`;
  const dates = person.birthYear
    ? `${person.birthYear}${person.deathYear ? `-${person.deathYear}` : '-'}`
    : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isSelected ? 0.15 : pressed ? 0.12 : 0.08,
          shadowRadius: isSelected ? 8 : 6,
          elevation: isSelected ? 4 : 2,
          borderWidth: isSelected ? 2 : 0,
          borderColor: isSelected ? theme.colors.primary : 'transparent',
          transform: [{ scale: isSelected ? 1.02 : pressed ? 0.98 : 1 }],
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
    </Pressable>
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
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  dates: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
});

export { CARD_WIDTH, CARD_HEIGHT, AVATAR_SIZE };

