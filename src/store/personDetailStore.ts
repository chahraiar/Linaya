import { create } from 'zustand';
import { Person } from './familyTreeStore';

/**
 * Types for person details
 */
export interface SocialLink {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'website';
  url: string;
  label?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
}

export interface Event {
  id: string;
  type: 'birth' | 'death' | 'marriage' | 'divorce' | 'other';
  date: string; // ISO date string
  place?: string;
  description?: string;
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video' | 'document';
  url: string;
  thumbnail?: string;
  title?: string;
  date?: string;
}

export interface PersonDetails {
  personId: string;
  contactInfo: ContactInfo;
  socialLinks: SocialLink[];
  events: Event[];
  media: MediaItem[];
  profilePhoto?: string;
  notes?: string;
}

/**
 * Mock data for person details
 */
const mockPersonDetails: Record<string, PersonDetails> = {
  'gp1': {
    personId: 'gp1',
    contactInfo: {
      email: 'henri.martin@example.com',
      phone: '+33 1 23 45 67 89',
      address: 'Paris, France',
    },
    socialLinks: [
      { platform: 'facebook', url: 'https://facebook.com/henri.martin' },
    ],
    events: [
      { id: 'e1', type: 'birth', date: '1940-05-15', place: 'Paris, France' },
      { id: 'e2', type: 'marriage', date: '1965-06-20', place: 'Paris, France' },
      { id: 'e3', type: 'death', date: '2015-03-10', place: 'Paris, France' },
    ],
    media: [],
    notes: 'Grand-père paternel',
  },
  'gp2': {
    personId: 'gp2',
    contactInfo: {
      email: 'marie.martin@example.com',
      phone: '+33 1 23 45 67 90',
      address: 'Paris, France',
    },
    socialLinks: [],
    events: [
      { id: 'e1', type: 'birth', date: '1942-08-22', place: 'Lyon, France' },
      { id: 'e2', type: 'marriage', date: '1965-06-20', place: 'Paris, France' },
    ],
    media: [],
  },
  'p1': {
    personId: 'p1',
    contactInfo: {
      email: 'jean.martin@example.com',
      mobile: '+33 6 12 34 56 78',
      address: 'Lyon, France',
    },
    socialLinks: [
      { platform: 'linkedin', url: 'https://linkedin.com/in/jean-martin' },
      { platform: 'facebook', url: 'https://facebook.com/jean.martin' },
    ],
    events: [
      { id: 'e1', type: 'birth', date: '1970-01-10', place: 'Paris, France' },
      { id: 'e2', type: 'marriage', date: '1995-09-15', place: 'Lyon, France' },
    ],
    media: [],
  },
  'p2': {
    personId: 'p2',
    contactInfo: {
      email: 'sophie.dubois@example.com',
      mobile: '+33 6 12 34 56 79',
      address: 'Lyon, France',
    },
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/sophie.dubois' },
    ],
    events: [
      { id: 'e1', type: 'birth', date: '1972-03-25', place: 'Marseille, France' },
      { id: 'e2', type: 'marriage', date: '1995-09-15', place: 'Lyon, France' },
    ],
    media: [],
  },
  'e1': {
    personId: 'e1',
    contactInfo: {
      email: 'lucas.martin@example.com',
      mobile: '+33 6 12 34 56 80',
    },
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/lucas.martin' },
      { platform: 'twitter', url: 'https://twitter.com/lucas_martin' },
    ],
    events: [
      { id: 'e1', type: 'birth', date: '2000-07-05', place: 'Lyon, France' },
    ],
    media: [],
  },
  'e2': {
    personId: 'e2',
    contactInfo: {
      email: 'emma.martin@example.com',
      mobile: '+33 6 12 34 56 81',
    },
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/emma.martin' },
    ],
    events: [
      { id: 'e1', type: 'birth', date: '2003-11-18', place: 'Lyon, France' },
    ],
    media: [],
  },
  'e3': {
    personId: 'e3',
    contactInfo: {
      email: 'noah.martin@example.com',
      mobile: '+33 6 12 34 56 82',
    },
    socialLinks: [],
    events: [
      { id: 'e1', type: 'birth', date: '2005-02-14', place: 'Lyon, France' },
    ],
    media: [],
  },
};

interface PersonDetailStore {
  details: Record<string, PersonDetails>;
  getPersonDetails: (personId: string) => PersonDetails | null;
  updatePersonDetails: (personId: string, details: Partial<PersonDetails>) => void;
}

export const usePersonDetailStore = create<PersonDetailStore>((set, get) => ({
  details: mockPersonDetails,
  
  getPersonDetails: (personId: string) => {
    const { details } = get();
    return details[personId] || null;
  },
  
  updatePersonDetails: (personId: string, newDetails: Partial<PersonDetails>) => {
    set((state) => {
      const existing = state.details[personId];
      return {
        details: {
          ...state.details,
          [personId]: {
            ...existing,
            ...newDetails,
            personId,
          } as PersonDetails,
        },
      };
    });
  },
}));

