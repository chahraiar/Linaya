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

interface FamilyTreeState {
  persons: Record<string, Person>;
  selectedPersonId: string | null;
  setPersons: (persons: Person[]) => void;
  addPerson: (person: Person) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  setSelectedPerson: (id: string | null) => void;
  getPerson: (id: string) => Person | undefined;
  getAllPersons: () => Person[];
}

export const useFamilyTreeStore = create<FamilyTreeState>((set, get) => ({
  persons: {},
  selectedPersonId: null,
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
      return { persons: rest };
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
}));

