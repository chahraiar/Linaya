import { create } from 'zustand';

/**
 * Person model
 */
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  deathYear?: number;
  parentIds: string[];
  partnerId?: string;
  childrenIds: string[];
}

/**
 * Custom position for a person (manual layout)
 */
export interface PersonPosition {
  personId: string;
  x: number;
  y: number;
}

interface FamilyTreeState {
  persons: Record<string, Person>;
  selectedPersonId: string | null;
  customPositions: Record<string, { x: number; y: number }>;
  isEditMode: boolean;
  setPersons: (persons: Person[]) => void;
  addPerson: (person: Person) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  setSelectedPerson: (id: string | null) => void;
  getPerson: (id: string) => Person | undefined;
  getAllPersons: () => Person[];
  setCustomPositions: (positions: PersonPosition[]) => void;
  updateCustomPosition: (personId: string, x: number, y: number) => void;
  clearCustomPosition: (personId: string) => void;
  setEditMode: (enabled: boolean) => void;
}

export const useFamilyTreeStore = create<FamilyTreeState>((set, get) => ({
  persons: {},
  selectedPersonId: null,
  customPositions: {},
  isEditMode: false,
  setPersons: (persons: Person[]) => {
    const personsMap = persons.reduce((acc, person) => {
      acc[person.id] = person;
      return acc;
    }, {} as Record<string, Person>);
    set({ persons: personsMap });
  },
  addPerson: (person: Person) => {
    set((state) => ({
      persons: { ...state.persons, [person.id]: person },
    }));
  },
  updatePerson: (id: string, updates: Partial<Person>) => {
    set((state) => {
      const person = state.persons[id];
      if (!person) return state;
      return {
        persons: {
          ...state.persons,
          [id]: { ...person, ...updates },
        },
      };
    });
  },
  deletePerson: (id: string) => {
    set((state) => {
      const { [id]: deleted, ...rest } = state.persons;
      const { [id]: deletedPosition, ...restPositions } = state.customPositions;
      return { 
        persons: rest,
        customPositions: restPositions,
      };
    });
  },
  setSelectedPerson: (id: string | null) => {
    set({ selectedPersonId: id });
  },
  getPerson: (id: string) => {
    return get().persons[id];
  },
  getAllPersons: () => {
    return Object.values(get().persons);
  },
  setCustomPositions: (positions: PersonPosition[]) => {
    const positionsMap = positions.reduce((acc, pos) => {
      acc[pos.personId] = { x: pos.x, y: pos.y };
      return acc;
    }, {} as Record<string, { x: number; y: number }>);
    set({ customPositions: positionsMap });
  },
  updateCustomPosition: (personId: string, x: number, y: number) => {
    set((state) => ({
      customPositions: {
        ...state.customPositions,
        [personId]: { x, y },
      },
    }));
  },
  clearCustomPosition: (personId: string) => {
    set((state) => {
      const { [personId]: deleted, ...rest } = state.customPositions;
      return { customPositions: rest };
    });
  },
  setEditMode: (enabled: boolean) => {
    set({ isEditMode: enabled });
  },
}));

