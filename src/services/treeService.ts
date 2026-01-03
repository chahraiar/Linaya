import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { Person, PersonPosition } from '../store/familyTreeStore';

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
  is_visible: boolean;
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
      
      // Extract date in YYYY-MM-DD format (keep full date, not just year)
      const birthDate = p.birth_date ? p.birth_date.split('T')[0] : undefined;
      const deathDate = p.death_date ? p.death_date.split('T')[0] : undefined;

      return {
        id: p.id,
        firstName: p.first_name || p.display_name || '',
        lastName: p.last_name || '',
        birthYear,
        deathYear,
        birthDate,
        deathDate,
        gender: p.gender || undefined,
        isVisible: p.is_visible !== undefined ? p.is_visible : true,
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
 * Create a new person in a tree (manual creation)
 */
export const createPerson = async (
  treeId: string,
  firstName: string,
  lastName: string,
  displayName?: string,
  birthDate?: Date,
  gender?: string
): Promise<Person | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate display name if not provided
    const finalDisplayName = displayName || `${firstName} ${lastName}`.trim() || 'Nouvelle personne';

    // Use RPC function (SECURITY DEFINER bypasses RLS and handles linking)
    const { data: personDataArray, error: personError } = await supabase
      .rpc('create_person_from_profile', {
        p_tree_id: treeId,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_display_name: finalDisplayName,
      });

    if (personError) {
      console.error('Error creating person:', personError);
      return null;
    }

    if (!personDataArray || personDataArray.length === 0) {
      return null;
    }

    const personData = personDataArray[0];
    const personId = personData.person_id || personData.id;

    // If birth date or gender provided, update the person
    if (birthDate || gender) {
      const updateData: any = {};
      if (birthDate) {
        updateData.p_birth_date = birthDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
      }
      if (gender) {
        updateData.p_gender = gender;
      }

      const { error: updateError } = await supabase
        .rpc('update_person', {
          p_person_id: personId,
          ...updateData,
        });

      if (updateError) {
        console.error('Error updating person after creation:', updateError);
        // Continue anyway, person was created
      }
    }

    // Convert to app format
    const person: Person = {
      id: personId,
      firstName: personData.first_name || firstName.trim(),
      lastName: personData.last_name || lastName.trim(),
      birthYear: birthDate ? birthDate.getFullYear() : undefined,
      deathYear: undefined,
      parentIds: [],
      partnerId: undefined,
      childrenIds: [],
    };

    return person;
  } catch (error) {
    console.error('Error in createPerson:', error);
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
    isVisible?: boolean;
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
        p_is_visible: updates.isVisible !== undefined ? updates.isVisible : null,
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
    const birthYear = personData.birth_date ? new Date(personData.birth_date).getFullYear() : undefined;
    const deathYear = personData.death_date ? new Date(personData.death_date).getFullYear() : undefined;
    const birthDate = personData.birth_date ? personData.birth_date.split('T')[0] : undefined;
    const deathDate = personData.death_date ? personData.death_date.split('T')[0] : undefined;

    const person: Person = {
      id: personData.person_id || personData.id,
      firstName: personData.first_name || '',
      lastName: personData.last_name || '',
      birthYear,
      deathYear,
      birthDate,
      deathDate,
      gender: personData.gender || undefined,
      isVisible: personData.is_visible !== undefined ? personData.is_visible : true,
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

/**
 * Contact from database
 */
export interface ContactDB {
  id: string;
  person_id: string;
  type: 'email' | 'mobile' | 'social' | 'website' | 'other';
  label: string | null;
  value: string;
  is_primary: boolean;
  visibility: 'private' | 'tree' | 'shared';
  created_at: string;
}

/**
 * Get person contacts
 */
export const getPersonContacts = async (personId: string): Promise<ContactDB[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use RPC function
    const { data, error } = await supabase
      .rpc('get_person_contacts', { p_person_id: personId });

    if (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }

    return (data || []) as ContactDB[];
  } catch (error) {
    console.error('Error in getPersonContacts:', error);
    return [];
  }
};

/**
 * Upsert a person contact
 */
export const upsertPersonContact = async (
  personId: string,
  type: 'email' | 'mobile' | 'social' | 'website' | 'other',
  value: string,
  label?: string,
  isPrimary: boolean = false,
  visibility: 'private' | 'tree' | 'shared' = 'tree'
): Promise<ContactDB | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use RPC function
    const { data, error } = await supabase
      .rpc('upsert_person_contact', {
        p_person_id: personId,
        p_type: type,
        p_value: value,
        p_label: label || null,
        p_is_primary: isPrimary,
        p_visibility: visibility,
      });

    if (error) {
      console.error('Error upserting contact:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Map to ContactDB format
    // The RPC function now returns columns with contact_ prefix to avoid ambiguity
    const contact = data[0];
    return {
      id: contact.contact_id,
      person_id: contact.contact_person_id,
      type: contact.contact_type,
      label: contact.contact_label,
      value: contact.contact_value,
      is_primary: contact.contact_is_primary,
      visibility: contact.contact_visibility,
      created_at: contact.created_at,
    } as ContactDB;
  } catch (error) {
    console.error('Error in upsertPersonContact:', error);
    return null;
  }
};

/**
 * Delete a person contact
 */
export const deletePersonContact = async (contactId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use RPC function
    const { data, error } = await supabase
      .rpc('delete_person_contact', { p_contact_id: contactId });

    if (error) {
      console.error('Error deleting contact:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in deletePersonContact:', error);
    return false;
  }
};

/**
 * Upload or update person profile photo
 * Uses Edge Function with SERVICE_ROLE_KEY to bypass RLS Storage policies
 */
export const uploadPersonPhoto = async (
  personId: string,
  imageUri: string,
  caption?: string,
  takenAt?: Date
): Promise<string | null> => {
  try {
    // Verify user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('❌ Session error:', sessionError);
      throw new Error('User not authenticated - no active session. Please log in again.');
    }

    console.log('✅ User authenticated - userId:', session.user.id);

    // Get tree_id directly from person using RPC function
    const { data: treeId, error: treeIdError } = await supabase
      .rpc('get_person_tree_id', { p_person_id: personId });

    if (treeIdError) {
      console.error('Error getting tree_id:', treeIdError);
      throw new Error(`Could not find tree_id for person: ${treeIdError.message}`);
    }

    if (!treeId) {
      console.error('treeId is null or undefined');
      throw new Error('Could not find tree_id for person (null result)');
    }

    console.log('📸 Upload photo - treeId:', treeId, 'personId:', personId);

    // Read file using expo-file-system as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Determine file extension and MIME type
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : 
                     fileExt === 'gif' ? 'image/gif' : 
                     fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

    // Get Supabase URL and construct Edge Function URL
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured');
    }

    // Edge Functions are at: {SUPABASE_URL}/functions/v1/{function_name}
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/upload_person_photo`;

    console.log('📸 Uploading via Edge Function:', edgeFunctionUrl, 'base64 length:', base64.length);

    // Get access token from session
    const accessToken = session.access_token;

    // Send base64 as JSON (React Native doesn't support Blob from Uint8Array)
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_base64: base64,
        file_name: `photo.${fileExt}`,
        mime_type: mimeType,
        tree_id: treeId,
        person_id: personId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Edge Function error:', response.status, errorData);
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    const storagePath = result.storage_path;

    if (!storagePath) {
      throw new Error('Edge Function did not return storage_path');
    }

    console.log('✅ Photo uploaded successfully via Edge Function:', storagePath);

    // Create/update media record via RPC
    const { data: mediaData, error: mediaError } = await supabase
      .rpc('upsert_person_photo', {
        p_person_id: personId,
        p_storage_path: storagePath,
        p_caption: caption || null,
        p_taken_at: takenAt ? takenAt.toISOString().split('T')[0] : null,
      });

    if (mediaError) {
      console.error('Error creating media record:', mediaError);
      // Note: We can't delete the file from client (RLS), but Edge Function could handle cleanup
      // For now, we'll just throw the error - the orphaned file can be cleaned up manually
      throw mediaError;
    }

    if (!mediaData || mediaData.length === 0) {
      throw new Error('Failed to create media record');
    }

    // Return the public URL (we'll need to get signed URL for private bucket)
    const { data: urlData } = await supabase.storage
      .from('family-tree-media')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    return urlData?.signedUrl || null;
  } catch (error) {
    console.error('Error in uploadPersonPhoto:', error);
    return null;
  }
};

/**
 * Get person photo URL
 */
export const getPersonPhotoUrl = async (personId: string): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Get storage path via RPC
    const { data: storagePath, error: pathError } = await supabase
      .rpc('get_person_photo_url', { p_person_id: personId });

    if (pathError || !storagePath) {
      return null;
    }

    // Create signed URL for private bucket
    const { data: urlData, error: urlError } = await supabase.storage
      .from('family-tree-media')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (urlError || !urlData) {
      return null;
    }

    return urlData.signedUrl;
  } catch (error) {
    console.error('Error in getPersonPhotoUrl:', error);
    return null;
  }
};

/**
 * Create a relationship between two persons
 */
export const createRelationship = async (
  fromPersonId: string,
  toPersonId: string,
  relationshipType: 'parent' | 'partner',
  notes?: string
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .rpc('create_person_relationship', {
        p_from_person_id: fromPersonId,
        p_to_person_id: toPersonId,
        p_relationship_type: relationshipType,
        p_notes: notes || null,
      });

    if (error) {
      console.error('Error creating relationship:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error in createRelationship:', error);
    return false;
  }
};

/**
 * Check if a person is the current user's self person
 */
export const isSelfPerson = async (personId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .rpc('is_self_person', { p_person_id: personId });

    if (error) {
      console.error('Error checking if self person:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in isSelfPerson:', error);
    return false;
  }
};

/**
 * Delete a person (soft delete)
 */
export const deletePerson = async (personId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .rpc('delete_person', { p_person_id: personId });

    if (error) {
      console.error('Error deleting person:', error);
      throw error;
    }

    return data === true;
  } catch (error) {
    console.error('Error in deletePerson:', error);
    throw error;
  }
};

/**
 * Save person position (custom layout)
 */
export const savePersonPosition = async (
  treeId: string,
  personId: string,
  x: number,
  y: number
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('save_person_position', {
      p_tree_id: treeId,
      p_person_id: personId,
      p_position_x: x,
      p_position_y: y,
    });

    if (error) {
      console.error('Error saving person position:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in savePersonPosition:', error);
    throw error;
  }
};

/**
 * Get all person positions for a tree
 */
export const getPersonPositions = async (treeId: string): Promise<PersonPosition[]> => {
  try {
    const { data, error } = await supabase.rpc('get_person_positions', {
      p_tree_id: treeId,
    });

    if (error) {
      console.error('Error getting person positions:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      personId: row.person_id,
      x: parseFloat(row.position_x),
      y: parseFloat(row.position_y),
    }));
  } catch (error) {
    console.error('Error in getPersonPositions:', error);
    throw error;
  }
};

/**
 * Delete person position (reset to auto layout)
 */
export const deletePersonPosition = async (
  treeId: string,
  personId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('delete_person_position', {
      p_tree_id: treeId,
      p_person_id: personId,
    });

    if (error) {
      console.error('Error deleting person position:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePersonPosition:', error);
    throw error;
  }
};

/**
 * Person Media interface
 */
export interface PersonMedia {
  id: string;
  person_id: string;
  type: 'photo' | 'document';
  storage_path: string;
  caption: string | null;
  taken_at: string | null;
  is_primary: boolean;
  created_at: string;
}

/**
 * Set person visibility
 */
export const setPersonVisibility = async (
  personId: string,
  isVisible: boolean
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .rpc('set_person_visibility', {
        p_person_id: personId,
        p_is_visible: isVisible,
      });

    if (error) {
      console.error('Error setting person visibility:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in setPersonVisibility:', error);
    return false;
  }
};

/**
 * Get all media for a person
 */
export const getPersonMedia = async (personId: string): Promise<PersonMedia[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .rpc('get_person_media', { p_person_id: personId });

    if (error) {
      console.error('Error fetching person media:', error);
      return [];
    }

    return (data || []) as PersonMedia[];
  } catch (error) {
    console.error('Error in getPersonMedia:', error);
    return [];
  }
};

/**
 * Get signed URL for a media item
 */
export const getPersonMediaUrl = async (storagePath: string): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from('family-tree-media')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (urlError || !urlData) {
      console.error('Error creating signed URL for media:', urlError);
      return null;
    }

    return urlData.signedUrl;
  } catch (error) {
    console.error('Error in getPersonMediaUrl:', error);
    return null;
  }
};

/**
 * Upload a media file for a person
 */
export const uploadPersonMedia = async (
  personId: string,
  fileUri: string,
  caption?: string,
  takenAt?: string
): Promise<PersonMedia | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: treeId, error: treeIdError } = await supabase
      .rpc('get_person_tree_id', { p_person_id: personId });

    if (treeIdError || !treeId) {
      throw new Error('Could not find tree_id for person');
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Get file extension from URI
    const fileExt = fileUri.split('.').pop() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL is not configured');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session');
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/upload_person_photo`;
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_base64: base64,
        file_name: `photo_${Date.now()}.${fileExt}`,
        mime_type: mimeType,
        tree_id: treeId,
        person_id: personId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }

    const result = await response.json();
    const storagePath = result.storage_path;

    if (!storagePath) {
      throw new Error('Edge Function did not return storage_path');
    }

    // Add media record (non-primary)
    const { data: mediaData, error: mediaError } = await supabase
      .rpc('add_person_media', {
        p_person_id: personId,
        p_storage_path: storagePath,
        p_caption: caption || null,
        p_taken_at: takenAt || null,
      });

    if (mediaError) {
      throw mediaError;
    }

    if (!mediaData || mediaData.length === 0) {
      throw new Error('Failed to create media record');
    }

    return mediaData[0] as PersonMedia;
  } catch (error) {
    console.error('Error uploading media:', error);
    return null;
  }
};

/**
 * Delete a media item
 */
export const deletePersonMedia = async (mediaId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .rpc('delete_person_media', { p_media_id: mediaId });

    if (error) {
      console.error('Error deleting media:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in deletePersonMedia:', error);
    return false;
  }
};

/**
 * Get user's role in a tree
 */
export const getUserTreeRole = async (treeId: string): Promise<'owner' | 'editor' | 'viewer' | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const trees = await getUserTrees();
    const tree = trees.find(t => t.id === treeId);
    
    if (!tree) return null;
    
    return tree.role as 'owner' | 'editor' | 'viewer';
  } catch (error) {
    console.error('Error in getUserTreeRole:', error);
    return null;
  }
};

/**
 * Get self person ID by matching user email with person contacts
 */
export const getSelfPersonId = async (_treeId: string, personIds: string[]): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      console.log('🔍 getSelfPersonId: No user authenticated or no email');
      return null;
    }

    const userEmail = user.email.toLowerCase().trim();
    console.log('🔍 getSelfPersonId: Looking for person with email:', userEmail, 'in', personIds.length, 'persons');

    // Check each person's contacts to find matching email
    for (const personId of personIds) {
      try {
        const contacts = await getPersonContacts(personId);
        const emailContacts = contacts.filter(c => c.type === 'email');
        
        for (const contact of emailContacts) {
          const contactEmail = contact.value.toLowerCase().trim();
          if (contactEmail === userEmail) {
            console.log('✅ getSelfPersonId: Found self person by email:', personId, 'Email:', contactEmail);
            return personId;
          }
        }
      } catch (error) {
        console.error('Error checking contacts for person', personId, ':', error);
      }
    }

    console.log('⚠️ getSelfPersonId: No person found with email:', userEmail);
    return null;
  } catch (error) {
    console.error('Error in getSelfPersonId:', error);
    return null;
  }
};

