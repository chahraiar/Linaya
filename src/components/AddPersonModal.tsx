import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../design-system/ThemeProvider';
import { Card, Text, Button, Input, Spacer } from './ui';

interface AddPersonModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    firstName: string;
    lastName: string;
    displayName?: string;
    birthDate?: Date;
    gender?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export const AddPersonModal: React.FC<AddPersonModalProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthDateText, setBirthDateText] = useState('');
  const [gender, setGender] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async () => {
    // Validation
    const newErrors: { [key: string]: string } = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = t('person.firstName') + ' ' + t('common.required');
    }
    if (!lastName.trim()) {
      newErrors.lastName = t('person.lastName') + ' ' + t('common.required');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Parse birth date if provided
      let birthDate: Date | undefined = undefined;
      if (birthDateText.trim()) {
        const parsedDate = new Date(birthDateText);
        if (!isNaN(parsedDate.getTime())) {
          birthDate = parsedDate;
        }
      }

      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || undefined,
        birthDate,
        gender: gender || undefined,
      });
      
      // Reset form
      setFirstName('');
      setLastName('');
      setDisplayName('');
      setBirthDateText('');
      setGender('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error submitting person:', error);
    }
  };

  const handleClose = () => {
    setFirstName('');
    setLastName('');
    setDisplayName('');
    setBirthDateText('');
    setGender('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Card variant="elevated" style={styles.modalContent} padding="lg">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text variant="heading" style={styles.title}>
                {t('tree.addPerson')}
              </Text>
              
              <Spacer size="md" />

              <Input
                label={t('person.firstName')}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  if (errors.firstName) {
                    setErrors({ ...errors, firstName: '' });
                  }
                }}
                placeholder={t('person.firstName')}
                error={errors.firstName}
                autoCapitalize="words"
              />

              <Spacer size="sm" />

              <Input
                label={t('person.lastName')}
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  if (errors.lastName) {
                    setErrors({ ...errors, lastName: '' });
                  }
                }}
                placeholder={t('person.lastName')}
                error={errors.lastName}
                autoCapitalize="words"
              />

              <Spacer size="sm" />

              <Input
                label={t('person.displayName') || 'Nom d\'affichage'}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('person.displayName') || 'Nom d\'affichage (optionnel)'}
                autoCapitalize="words"
              />

              <Spacer size="sm" />

              {/* Date de naissance */}
              <Input
                label={t('person.birthDate') || 'Date de naissance'}
                value={birthDateText}
                onChangeText={setBirthDateText}
                placeholder="YYYY-MM-DD (ex: 1990-01-15)"
                keyboardType="default"
              />

              <Spacer size="sm" />

              {/* Genre */}
              <View>
                <Text style={[styles.label, { color: '#1A1A1A' }]}>
                  {t('person.gender.label') || 'Genre'}
                </Text>
                <Spacer size="xs" />
                <View style={styles.genderContainer}>
                  {['male', 'female', 'other'].map((g) => (
                    <Pressable
                      key={g}
                      onPress={() => setGender(g)}
                      style={[
                        styles.genderButton,
                        {
                          backgroundColor: gender === g ? theme.colors.primary : '#FFFFFF',
                          borderColor: gender === g ? theme.colors.primary : '#E0E0E0',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: gender === g ? '#FFFFFF' : '#1A1A1A',
                        }}
                      >
                        {t(`person.gender.${g}`) || g}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Spacer size="lg" />

              <Button
                variant="primary"
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? t('common.loading') : t('common.add')}
              </Button>

              <Spacer size="sm" />

              <Button variant="ghost" onPress={handleClose}>
                {t('common.cancel')}
              </Button>
            </ScrollView>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#F5F5F0',
  },
  title: {
    color: '#1A1A1A',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

