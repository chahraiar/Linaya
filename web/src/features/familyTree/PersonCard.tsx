import React, { useState, useEffect, memo } from 'react';
import { Person } from '../../store/familyTreeStore';
import { getPersonPhotoUrl } from '../../services/treeService';
import { UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import './PersonCard.css';

export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 130;

interface PersonCardProps {
  person: Person;
  onPress: (personId: string) => void;
  isSelected?: boolean;
  disableTouch?: boolean;
  isSelf?: boolean;
  onHide?: (personId: string) => void;
  canEdit?: boolean;
}

const PersonCardComponent: React.FC<PersonCardProps> = ({
  person,
  onPress,
  isSelected = false,
  disableTouch = false,
  isSelf = false,
  onHide,
  canEdit = false,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const loadPhoto = async () => {
      try {
        const url = await getPersonPhotoUrl(person.id);
        if (!cancelled && url) {
          setPhotoUrl(url);
        } else if (!cancelled) {
          setPhotoUrl(null);
        }
      } catch (error) {
        console.error('Error loading photo for', person.id, ':', error);
        if (!cancelled) {
          setPhotoUrl(null);
        }
      }
    };
    
    loadPhoto();
    
    return () => {
      cancelled = true;
    };
  }, [person.id]);

  const fullName = `${person.firstName} ${person.lastName}`.trim() || 'Sans nom';
  const dates = person.birthYear
    ? person.deathYear 
      ? `${person.birthYear}-${person.deathYear}`
      : `${person.birthYear}`
    : '';

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onHide) {
      onHide(person.id);
    }
  };

  const cardContent = (
    <>
      {canEdit && onHide && (
        <button
          className="person-card-hide-btn"
          onClick={handleHideClick}
          title="Masquer cette carte"
          aria-label="Masquer cette carte"
        >
          <XMarkIcon className="person-card-hide-icon" />
        </button>
      )}
      <div className="person-card-avatar">
        {photoUrl ? (
          <img src={photoUrl} alt={fullName} className="person-card-avatar-img" />
        ) : (
          <UserIcon className="person-card-avatar-icon" />
        )}
      </div>
      <div 
        className={`person-card-name ${isSelf ? 'person-card-name-self' : ''}`}
        data-is-self={isSelf}
      >
        {fullName}
      </div>
      {dates && <div className="person-card-dates">{dates}</div>}
    </>
  );

  // Determine gender-based class
  const genderClass = person.gender === 'male' 
    ? 'person-card-male' 
    : person.gender === 'female' 
    ? 'person-card-female' 
    : '';

  // Debug: log gender for troubleshooting (remove after testing)
  if (process.env.NODE_ENV === 'development') {
    console.log(`Person ${person.firstName} ${person.lastName}: gender=${person.gender}, class=${genderClass}`);
  }

  const cardClassName = `person-card ${genderClass} ${isSelected ? 'person-card-selected' : ''}`;

  if (disableTouch) {
    return <div className={cardClassName}>{cardContent}</div>;
  }

  return (
    <div
      className={`${cardClassName} person-card-container`}
      onClick={() => onPress(person.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onPress(person.id);
        }
      }}
    >
      {cardContent}
    </div>
  );
};

// Memoize PersonCard to prevent unnecessary re-renders
export const PersonCard = memo(PersonCardComponent);

