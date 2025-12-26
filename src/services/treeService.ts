import { supabase } from '../lib/supabase';
import { Person } from '../store/familyTreeStore';

/**
 * Profile from database
 */
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  theme: string;
}

/**
 * Tree from database
 */
export interface Tree {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

/**
 * Person from database
 */
export interface PersonDB {
  id: string;
  tree_id: string;
  created_by: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  gender: string | null;
  is_living: boolean;
  birth_date: string | null;
  death_date: string | null;
  notes: string | null;
  main_photo_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Relationship from database
 */
export interface RelationshipDB {
  id: string;
  tree_id: string;
  from_person_id: string;
  to_person_id: string;
  type: 'parent' | 'partner';
  notes: string | null;
  created_at: string;
}

/**
 * Get current user profile
 */
export const getCurrentUserProfile = async (): Promise<Profile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Use RPC function (SECURITY DEFINER bypasses RLS)
    const { data, error } = await supabase
      .rpc('get_current_user_profile');

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0] as Profile;
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
};

/**
 * Get user's trees
 */
export const getUserTrees = async (): Promise<Tree[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Use RPC function (SECURITY DEFINER bypasses RLS)
    // Note: If p_user_id is not provided, the function uses auth.uid() as default
    const { data, error } = await supabase
      .rpc('get_user_trees', { p_user_id: user.id });

    if (error) {
      console.error('Error fetching trees:', error);
      return [];
    }

    return (data || []) as Tree[];
  } catch (error) {
    console.error('Error in getUserTrees:', error);
    return [];
  }
};

/**
 * Get tree persons and relationships
 */
export const getTreeData = async (treeId: string): Promise<{
  persons: Person[];
  relationships: RelationshipDB[];
}> => {
  try {
    // Use RPC functions (SECURITY DEFINER bypasses RLS)
    const { data: personsData, error: personsError } = await supabase
      .rpc('get_tree_persons', { p_tree_id: treeId });

    if (personsError) {
      console.error('Error fetching persons:', personsError);
      return { persons: [], relationships: [] };
    }

    const { data: relationshipsData, error: relationshipsError } = await supabase
      .rpc('get_tree_relationships', { p_tree_id: treeId });

    if (relationshipsError) {
      console.error('Error fetching relationships:', relationshipsError);
      return { persons: [], relationships: [] };
    }

    const personsDB = (personsData || []) as PersonDB[];
    const relationships = (relationshipsData || []) as RelationshipDB[];

    // Convert DB format to app format
    const persons: Person[] = personsDB.map((p) => {
      // Find parent relationships (where this person is the child)
      const parentRels = relationships.filter(
        (r) => r.to_person_id === p.id && r.type === 'parent'
      );
      const parentIds = parentRels.map((r) => r.from_person_id);

      // Find child relationships (where this person is the parent)
      const childRels = relationships.filter(
        (r) => r.from_person_id === p.id && r.type === 'parent'
      );
      const childrenIds = childRels.map((r) => r.to_person_id);

      // Find partner relationship
      const partnerRel = relationships.find(
        (r) => (r.from_person_id === p.id || r.to_person_id === p.id) && r.type === 'partner'
      );
      const partnerId = partnerRel
        ? (partnerRel.from_person_id === p.id ? partnerRel.to_person_id : partnerRel.from_person_id)
        : undefined;

      // Extract year from date
      const birthYear = p.birth_date ? new Date(p.birth_date).getFullYear() : undefined;
      const deathYear = p.death_date ? new Date(p.death_date).getFullYear() : undefined;

      return {
        id: p.id,
        firstName: p.first_name || p.display_name || '',
        lastName: p.last_name || '',
        birthYear,
        deathYear,
        parentIds,
        partnerId,
        childrenIds,
      };
    });

    return { persons, relationships };
  } catch (error) {
    console.error('Error in getTreeData:', error);
    return { persons: [], relationships: [] };
  }
};

/**
 * Create a new tree for the current user
 */
export const createTree = async (name: string, description?: string): Promise<Tree | null> => {
  try {
    // Use RPC function (SECURITY DEFINER bypasses RLS)
    const { data, error } = await supabase
      .rpc('create_user_tree', {
        p_name: name,
        p_description: description || null,
      });

    if (error) {
      console.error('Error creating tree:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // The RPC returns a tree, but we need to add the role
    const treeData = data[0];
    return {
      ...treeData,
      role: 'owner', // User is always owner of trees they create
    } as Tree;
  } catch (error) {
    console.error('Error in createTree:', error);
    return null;
  }
};

/**
 * Create a person from user profile
 */
export const createPersonFromProfile = async (
  treeId: string,
  profile: Profile
): Promise<Person | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Extract first and last name from display_name or email
    const displayName = profile.display_name || user.email || 'Utilisateur';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Use RPC function (SECURITY DEFINER bypasses RLS and handles linking)
    const { data: personDataArray, error: personError } = await supabase
      .rpc('create_person_from_profile', {
        p_tree_id: treeId,
        p_first_name: firstName,
        p_last_name: lastName,
        p_display_name: displayName,
      });

    if (personError) {
      console.error('Error creating person:', personError);
      return null;
    }

    if (!personDataArray || personDataArray.length === 0) {
      return null;
    }

    const personData = personDataArray[0];

    // Convert to app format
    // Note: The RPC function returns columns with aliases (person_id, person_tree_id, etc.)
    const person: Person = {
      id: personData.person_id || personData.id,
      firstName: personData.first_name || '',
      lastName: personData.last_name || '',
      birthYear: personData.birth_date ? new Date(personData.birth_date).getFullYear() : undefined,
      deathYear: personData.death_date ? new Date(personData.death_date).getFullYear() : undefined,
      parentIds: [],
      partnerId: undefined,
      childrenIds: [],
    };

    return person;
  } catch (error) {
    console.error('Error in createPersonFromProfile:', error);
    return null;
  }
};

/**
 * Update a person
 */
export const updatePerson = async (
  personId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    birthDate?: string | null;
    deathDate?: string | null;
    gender?: string;
    isLiving?: boolean;
    notes?: string;
  }
): Promise<Person | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use RPC function (SECURITY DEFINER bypasses RLS)
    const { data: personDataArray, error: personError } = await supabase
      .rpc('update_person', {
        p_person_id: personId,
        p_first_name: updates.firstName,
        p_last_name: updates.lastName,
        p_display_name: updates.displayName,
        p_birth_date: updates.birthDate || null,
        p_death_date: updates.deathDate || null,
        p_gender: updates.gender,
        p_is_living: updates.isLiving,
        p_notes: updates.notes,
      });

    if (personError) {
      console.error('Error updating person:', personError);
      return null;
    }

    if (!personDataArray || personDataArray.length === 0) {
      return null;
    }

    const personData = personDataArray[0];

    // Convert to app format
    const person: Person = {
      id: personData.person_id || personData.id,
      firstName: personData.first_name || '',
      lastName: personData.last_name || '',
      birthYear: personData.birth_date ? new Date(personData.birth_date).getFullYear() : undefined,
      deathYear: personData.death_date ? new Date(personData.death_date).getFullYear() : undefined,
      parentIds: [],
      partnerId: undefined,
      childrenIds: [],
    };

    return person;
  } catch (error) {
    console.error('Error in updatePerson:', error);
    return null;
  }
};

