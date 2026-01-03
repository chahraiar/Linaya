import { create } from 'zustand';

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
  date: string;
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

interface PersonDetailStore {
  details: Record<string, PersonDetails>;
  getPersonDetails: (personId: string) => PersonDetails | null;
  updatePersonDetails: (personId: string, details: Partial<PersonDetails>) => void;
}

export const usePersonDetailStore = create<PersonDetailStore>((set, get) => ({
  details: {},
  
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

