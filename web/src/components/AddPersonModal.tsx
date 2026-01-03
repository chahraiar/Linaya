import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './AddPersonModal.css';

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
      newErrors.firstName = `${t('person.firstName')} ${t('common.required')}`;
    }
    if (!lastName.trim()) {
      newErrors.lastName = `${t('person.lastName')} ${t('common.required')}`;
    }
    if (!gender || (gender !== 'male' && gender !== 'female')) {
      newErrors.gender = 'Le genre est obligatoire';
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

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{t('tree.addPerson')}</h2>
        
        <div className="form-group">
          <label className="form-label">
            {t('person.firstName')} <span className="required">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.firstName ? 'form-input-error' : ''}`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('person.firstName')}
          />
          {errors.firstName && <span className="error-text">{errors.firstName}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">
            {t('person.lastName')} <span className="required">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.lastName ? 'form-input-error' : ''}`}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('person.lastName')}
          />
          {errors.lastName && <span className="error-text">{errors.lastName}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">{t('person.displayName')}</label>
          <input
            type="text"
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('person.displayName')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('person.birthDate')}</label>
          <input
            type="date"
            className="form-input"
            value={birthDateText}
            onChange={(e) => setBirthDateText(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            {t('person.gender.label')} <span className="required">*</span>
          </label>
          <div className="gender-options">
            {[
              { value: 'male', label: t('person.gender.male'), icon: '👨' },
              { value: 'female', label: t('person.gender.female'), icon: '👩' },
            ].map((g) => (
              <button
                key={g.value}
                className={`btn ${gender === g.value ? 'btn-primary' : 'btn-secondary'} gender-btn`}
                onClick={() => setGender(g.value)}
                type="button"
              >
                <span className="gender-icon">{g.icon}</span>
                <span className="gender-text">{g.label}</span>
              </button>
            ))}
          </div>
          {errors.gender && <span className="error-text">{errors.gender}</span>}
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '...' : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
};

