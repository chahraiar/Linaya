import { supabase } from '../lib/supabase';
import {
  getTreeData,
  getUserTrees,
  getPersonContacts,
  getPersonMedia,
  getPersonMediaUrl,
  getPersonPositions,
} from './treeService';

export interface ExportOptions {
  includeMedia?: boolean; // Télécharger les fichiers médias
  includePositions?: boolean; // Inclure les positions personnalisées
  includeContacts?: boolean; // Inclure les contacts
  anonymizeUsers?: boolean; // Anonymiser les références utilisateurs
}

export interface ExportPerson {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  gender?: string;
  birthDate?: string;
  deathDate?: string;
  isLiving: boolean;
  isVisible: boolean;
  notes?: string;
  contacts?: ExportContact[];
  media?: ExportMedia[];
}

export interface ExportContact {
  type: 'email' | 'mobile' | 'social' | 'website' | 'other';
  label?: string;
  value: string;
  isPrimary: boolean;
  visibility: 'private' | 'tree' | 'shared';
}

export interface ExportMedia {
  id: string;
  type: 'photo';
  storagePath: string;
  caption?: string;
  takenAt?: string;
  isPrimary: boolean;
  fileData?: string; // base64 encoded file data
}

export interface ExportRelationship {
  fromPersonId: string;
  toPersonId: string;
  type: 'parent' | 'partner';
  notes?: string;
}

export interface ExportPosition {
  personId: string;
  x: number;
  y: number;
}

export interface ExportData {
  version: string;
  exportDate: string;
  exportedBy?: string;
  tree: {
    name: string;
    description: string | null;
  };
  persons: ExportPerson[];
  relationships: ExportRelationship[];
  positions?: ExportPosition[];
}

/**
 * Export a tree with all its data
 */
export const exportTree = async (
  treeId: string,
  options: ExportOptions = {}
): Promise<ExportData> => {
  const {
    includeMedia = false,
    includePositions = true,
    includeContacts = true,
    anonymizeUsers = true,
  } = options;

  // Get current user email for export metadata
  const { data: { user } } = await supabase.auth.getUser();
  const exportedBy = anonymizeUsers ? undefined : user?.email;

  // Get tree info
  const trees = await getUserTrees();
  const tree = trees.find((t) => t.id === treeId);
  if (!tree) {
    throw new Error('Tree not found');
  }

  // Get tree data (persons and relationships)
  const { persons, relationships } = await getTreeData(treeId);

  // Get positions if requested
  let positions: ExportPosition[] | undefined;
  if (includePositions) {
    const personPositions = await getPersonPositions(treeId);
    positions = personPositions.map((pos) => ({
      personId: pos.personId,
      x: pos.x,
      y: pos.y,
    }));
  }

  // Build export persons with contacts and media
  const exportPersons: ExportPerson[] = await Promise.all(
    persons.map(async (person) => {
      const exportPerson: ExportPerson = {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        gender: person.gender,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        isLiving: true, // Default, we don't have this in Person interface
        isVisible: person.isVisible !== undefined ? person.isVisible : true,
        notes: person.notes,
      };

      // Add contacts if requested
      if (includeContacts) {
        try {
          const contacts = await getPersonContacts(person.id);
          exportPerson.contacts = contacts
            .filter((c) => {
              // Filter by visibility: exclude private contacts if anonymizing
              if (anonymizeUsers && c.visibility === 'private') {
                return false;
              }
              return true;
            })
            .map((c) => ({
              type: c.type,
              label: c.label || undefined,
              value: c.value,
              isPrimary: c.is_primary,
              visibility: c.visibility,
            }));
        } catch (error) {
          console.error(`Error fetching contacts for person ${person.id}:`, error);
        }
      }

      // Add media if requested
      if (includeMedia) {
        try {
          const media = await getPersonMedia(person.id);
          exportPerson.media = await Promise.all(
            media.map(async (m) => {
              const exportMedia: ExportMedia = {
                id: m.id,
                type: m.type as 'photo',
                storagePath: m.storage_path,
                caption: m.caption || undefined,
                takenAt: m.taken_at || undefined,
                isPrimary: m.is_primary,
              };

              // Download and encode media file
              try {
                const mediaUrl = await getPersonMediaUrl(m.storage_path);
                if (mediaUrl) {
                  const response = await fetch(mediaUrl);
                  const blob = await response.blob();
                  const reader = new FileReader();
                  const base64 = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => {
                      const result = reader.result as string;
                      const base64Data = result.split(',')[1];
                      resolve(base64Data);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                  exportMedia.fileData = base64;
                }
              } catch (error) {
                console.error(`Error downloading media ${m.id}:`, error);
                // Continue without fileData
              }

              return exportMedia;
            })
          );
        } catch (error) {
          console.error(`Error fetching media for person ${person.id}:`, error);
        }
      }

      return exportPerson;
    })
  );

  // Build export relationships
  const exportRelationships: ExportRelationship[] = relationships.map((rel) => ({
    fromPersonId: rel.from_person_id,
    toPersonId: rel.to_person_id,
    type: rel.type,
    notes: rel.notes || undefined,
  }));

  // Build export data
  const exportData: ExportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    exportedBy,
    tree: {
      name: tree.name,
      description: tree.description,
    },
    persons: exportPersons,
    relationships: exportRelationships,
  };

  if (positions && positions.length > 0) {
    exportData.positions = positions;
  }

  return exportData;
};

/**
 * Export tree to JSON string
 */
export const exportTreeToJSON = async (
  treeId: string,
  options: ExportOptions = {}
): Promise<string> => {
  const data = await exportTree(treeId, options);
  return JSON.stringify(data, null, 2);
};

/**
 * Download tree export as JSON file
 */
export const downloadTreeExport = async (
  treeId: string,
  filename: string,
  options: ExportOptions = {}
): Promise<void> => {
  const json = await exportTreeToJSON(treeId, options);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

