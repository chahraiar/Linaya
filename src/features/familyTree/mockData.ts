import { Person } from '../../store/familyTreeStore';

/**
 * Mock dataset - Arbre sur 3 générations pour validation du design
 * Génération 1 : Grands-parents
 * Génération 2 : Parents
 * Génération 3 : Enfants
 */
export const mockPersons: Person[] = [
  // GÉNÉRATION 1 - Grands-parents
  {
    id: 'gp1',
    firstName: 'Henri',
    lastName: 'Martin',
    birthYear: 1940,
    deathYear: 2015,
    parentIds: [],
    partnerId: 'gp2',
    childrenIds: ['p1'],
  },
  {
    id: 'gp2',
    firstName: 'Marie',
    lastName: 'Martin',
    birthYear: 1942,
    parentIds: [],
    partnerId: 'gp1',
    childrenIds: ['p1'],
  },
  
  // GÉNÉRATION 2 - Parents
  {
    id: 'p1',
    firstName: 'Jean',
    lastName: 'Martin',
    birthYear: 1970,
    parentIds: ['gp1', 'gp2'],
    partnerId: 'p2',
    childrenIds: ['e1', 'e2', 'e3'],
  },
  {
    id: 'p2',
    firstName: 'Sophie',
    lastName: 'Dubois',
    birthYear: 1972,
    parentIds: [],
    partnerId: 'p1',
    childrenIds: ['e1', 'e2', 'e3'],
  },
  
  // GÉNÉRATION 3 - Enfants
  {
    id: 'e1',
    firstName: 'Lucas',
    lastName: 'Martin',
    birthYear: 2000,
    parentIds: ['p1', 'p2'],
    childrenIds: [],
  },
  {
    id: 'e2',
    firstName: 'Emma',
    lastName: 'Martin',
    birthYear: 2003,
    parentIds: ['p1', 'p2'],
    childrenIds: [],
  },
  {
    id: 'e3',
    firstName: 'Noah',
    lastName: 'Martin',
    birthYear: 2005,
    parentIds: ['p1', 'p2'],
    childrenIds: [],
  },
];
