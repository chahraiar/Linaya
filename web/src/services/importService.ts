import { supabase } from '../lib/supabase';
import {
  createTree,
  createPerson,
  createRelationship,
  savePersonPosition,
  upsertPersonContact,
  uploadPersonMedia,
  uploadPersonPhoto,
  setPrimaryPhoto,
  updatePerson,
  getUserTrees,
  Tree,
} from './treeService';
import {
  ExportData,
} from './exportService';

export interface ImportOptions {
  skipDuplicates?: boolean; // Ignorer les doublons
  preservePositions?: boolean; // Préserver les positions
  importMedia?: boolean; // Importer les médias
}

export interface ImportResult {
  success: boolean;
  treeId?: string;
  importedPersons: number;
  importedRelationships: number;
  importedContacts: number;
  importedMedia: number;
  importedPositions: number;
  errors: string[];
  warnings: string[];
}

/**
 * Validate export data structure
 */
const validateExportData = (data: any): data is ExportData => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  if (!data.version || !data.exportDate || !data.tree || !data.persons || !data.relationships) {
    return false;
  }
  if (!Array.isArray(data.persons) || !Array.isArray(data.relationships)) {
    return false;
  }
  return true;
};

/**
 * Import tree from JSON data
 */
export const importTreeFromJSON = async (
  jsonData: string,
  targetTreeId: string | null, // null = créer un nouvel arbre
  options: ImportOptions = {}
): Promise<ImportResult> => {
  const {
    skipDuplicates = false,
    preservePositions = true,
    importMedia = false,
  } = options;

  const result: ImportResult = {
    success: false,
    importedPersons: 0,
    importedRelationships: 0,
    importedContacts: 0,
    importedMedia: 0,
    importedPositions: 0,
    errors: [],
    warnings: [],
  };

  try {
    // Parse and validate JSON
    let exportData: ExportData;
    try {
      const parsed = JSON.parse(jsonData);
      if (!validateExportData(parsed)) {
        result.errors.push('Format de fichier invalide');
        return result;
      }
      exportData = parsed;
    } catch (error: any) {
      result.errors.push(`Erreur de parsing JSON: ${error.message}`);
      return result;
    }

    // Check version compatibility
    if (exportData.version !== '1.0.0') {
      result.warnings.push(
        `Version du format d'export (${exportData.version}) peut ne pas être compatible`
      );
    }

    // Get or create target tree
    let treeId: string;
    if (targetTreeId) {
      // Verify tree exists and user has access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        result.errors.push('Utilisateur non authentifié');
        return result;
      }

      // Check if tree exists (we'll use getUserTrees to verify access)
      const trees = await getUserTrees();
      const tree = trees.find((t: Tree) => t.id === targetTreeId);
      if (!tree) {
        result.errors.push("L'arbre cible n'existe pas ou vous n'y avez pas accès");
        return result;
      }
      treeId = targetTreeId;
    } else {
      // Create new tree
      const newTree = await createTree(exportData.tree.name, exportData.tree.description || undefined);
      if (!newTree) {
        result.errors.push("Erreur lors de la création de l'arbre");
        return result;
      }
      treeId = newTree.id;
      result.treeId = treeId;
    }

    // Map old person IDs to new person IDs
    const personIdMap = new Map<string, string>();
    const failedPersonIds = new Set<string>();

    // Import persons
    for (const exportPerson of exportData.persons) {
      try {
        // Check for duplicates if skipDuplicates is enabled
        if (skipDuplicates) {
          // This is a simple check - in a real implementation, you might want to check by name + dates
          result.warnings.push('La détection de doublons n\'est pas encore implémentée');
        }

        // Create person
        const birthDate = exportPerson.birthDate
          ? new Date(exportPerson.birthDate)
          : undefined;
        const newPerson = await createPerson(
          treeId,
          exportPerson.firstName,
          exportPerson.lastName,
          exportPerson.displayName,
          birthDate,
          exportPerson.gender
        );

        if (!newPerson) {
          const errorMsg = `Erreur lors de la création de la personne: ${exportPerson.firstName} ${exportPerson.lastName} (ID: ${exportPerson.id})`;
          result.errors.push(errorMsg);
          failedPersonIds.add(exportPerson.id);
          continue;
        }

        // Map old ID to new ID
        personIdMap.set(exportPerson.id, newPerson.id);
        result.importedPersons++;

        // Update person with additional data
        if (exportPerson.deathDate || exportPerson.notes !== undefined || exportPerson.isVisible !== undefined) {
          await updatePerson(newPerson.id, {
            deathDate: exportPerson.deathDate || null,
            notes: exportPerson.notes,
            isVisible: exportPerson.isVisible,
          });
        }

        // Import contacts
        if (exportPerson.contacts) {
          for (const contact of exportPerson.contacts) {
            try {
              await upsertPersonContact(
                newPerson.id,
                contact.type,
                contact.value,
                contact.label,
                contact.isPrimary,
                contact.visibility
              );
              result.importedContacts++;
            } catch (error: any) {
              result.warnings.push(`Erreur lors de l'import du contact pour ${exportPerson.firstName}: ${error.message}`);
            }
          }
        }

        // Import media
        if (importMedia && exportPerson.media) {
          // Filter only photos
          const photos = exportPerson.media.filter(m => m.type === 'photo' && m.fileData);
          
          if (photos.length > 0) {
            // Sort media to import primary photos first
            const sortedMedia = [...photos].sort((a, b) => {
              if (a.isPrimary && !b.isPrimary) return -1;
              if (!a.isPrimary && b.isPrimary) return 1;
              return 0;
            });

            // Check if any photo is marked as primary
            const hasPrimaryPhoto = sortedMedia.some(m => m.isPrimary);
            
            let primaryPhotoImported = false;
            for (let i = 0; i < sortedMedia.length; i++) {
              const media = sortedMedia[i];
              try {
                // Convert base64 to File
                const base64Data = media.fileData!;
                const mimeType = 'image/jpeg';
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let j = 0; j < byteCharacters.length; j++) {
                  byteNumbers[j] = byteCharacters.charCodeAt(j);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });
                const file = new File([blob], `photo_${media.id}.jpg`, { type: mimeType });

                // Determine if this should be the primary photo:
                // 1. If it's marked as primary in export, use it
                // 2. If no photo is marked as primary, use the first one
                const shouldBePrimary = (media.isPrimary || (!hasPrimaryPhoto && i === 0)) && !primaryPhotoImported;

                if (shouldBePrimary) {
                  // Use uploadPersonPhoto for primary photos to set main_photo_id
                  console.log(`Import: Setting primary photo for ${exportPerson.firstName} ${exportPerson.lastName}`);
                  const photoUrl = await uploadPersonPhoto(newPerson.id, file);
                  if (photoUrl) {
                    primaryPhotoImported = true;
                    result.importedMedia++;
                    console.log(`Import: Primary photo set successfully for ${exportPerson.firstName}`);
                  } else {
                    // Fallback: upload as regular media and then set as primary
                    console.log(`Import: Primary photo upload failed, trying fallback for ${exportPerson.firstName}`);
                    const uploadedMedia = await uploadPersonMedia(
                      newPerson.id,
                      file,
                      media.caption,
                      media.takenAt
                    );
                    if (uploadedMedia) {
                      // Set it as primary using setPrimaryPhoto
                      const setPrimary = await setPrimaryPhoto(newPerson.id, uploadedMedia.id);
                      if (setPrimary) {
                        primaryPhotoImported = true;
                        console.log(`Import: Primary photo set via fallback for ${exportPerson.firstName}`);
                      }
                      result.importedMedia++;
                    }
                  }
                } else {
                  // Use uploadPersonMedia for non-primary or additional photos
                  await uploadPersonMedia(
                    newPerson.id,
                    file,
                    media.caption,
                    media.takenAt
                  );
                  result.importedMedia++;
                }
              } catch (error: any) {
                result.warnings.push(`Erreur lors de l'import du média pour ${exportPerson.firstName}: ${error.message}`);
                console.error(`Import: Error importing media for ${exportPerson.firstName}:`, error);
              }
            }
          }
        }
      } catch (error: any) {
        result.errors.push(`Erreur lors de l'import de la personne ${exportPerson.firstName} ${exportPerson.lastName}: ${error.message}`);
      }
    }

    // Import relationships
    for (const relationship of exportData.relationships) {
      try {
        const fromPersonId = personIdMap.get(relationship.fromPersonId);
        const toPersonId = personIdMap.get(relationship.toPersonId);

        if (!fromPersonId || !toPersonId) {
          // Find person names for better error message
          const fromPerson = exportData.persons.find(p => p.id === relationship.fromPersonId);
          const toPerson = exportData.persons.find(p => p.id === relationship.toPersonId);
          const fromName = fromPerson ? `${fromPerson.firstName} ${fromPerson.lastName}` : relationship.fromPersonId;
          const toName = toPerson ? `${toPerson.firstName} ${toPerson.lastName}` : relationship.toPersonId;
          
          // Check if persons failed to import
          const fromFailed = failedPersonIds.has(relationship.fromPersonId);
          const toFailed = failedPersonIds.has(relationship.toPersonId);
          
          let reason = '';
          if (fromFailed || toFailed) {
            reason = ' (personne(s) non créée(s) à cause d\'erreurs)';
          } else if (!fromPerson && !toPerson) {
            reason = ' (personnes absentes de l\'export)';
          } else {
            reason = ' (personne(s) non trouvée(s) dans le mapping)';
          }
          
          result.warnings.push(
            `Relation ignorée: ${fromName} -> ${toName}${reason}`
          );
          continue;
        }

        const success = await createRelationship(treeId, fromPersonId, toPersonId, relationship.type);
        if (success) {
          result.importedRelationships++;
        } else {
          result.warnings.push(`Erreur lors de la création de la relation entre ${fromPersonId} et ${toPersonId}`);
        }
      } catch (error: any) {
        result.warnings.push(`Erreur lors de l'import de la relation: ${error.message}`);
      }
    }

    // Import positions
    if (preservePositions && exportData.positions) {
      for (const position of exportData.positions) {
        try {
          const newPersonId = personIdMap.get(position.personId);
          if (newPersonId) {
            await savePersonPosition(treeId, newPersonId, position.x, position.y);
            result.importedPositions++;
          }
        } catch (error: any) {
          result.warnings.push(`Erreur lors de l'import de la position: ${error.message}`);
        }
      }
    }

    result.success = result.errors.length === 0;
  } catch (error: any) {
    result.errors.push(`Erreur générale lors de l'import: ${error.message}`);
  }

  return result;
};

/**
 * Import tree from file
 */
export const importTreeFromFile = async (
  file: File,
  targetTreeId: string | null,
  options: ImportOptions = {}
): Promise<ImportResult> => {
  // Validate file type
  if (!file.name.endsWith('.json')) {
    return {
      success: false,
      importedPersons: 0,
      importedRelationships: 0,
      importedContacts: 0,
      importedMedia: 0,
      importedPositions: 0,
      errors: ['Le fichier doit être au format JSON (.json)'],
      warnings: [],
    };
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      success: false,
      importedPersons: 0,
      importedRelationships: 0,
      importedContacts: 0,
      importedMedia: 0,
      importedPositions: 0,
      errors: ['Le fichier est trop volumineux (max 50MB)'],
      warnings: [],
    };
  }

  try {
    const text = await file.text();
    return await importTreeFromJSON(text, targetTreeId, options);
  } catch (error: any) {
    return {
      success: false,
      importedPersons: 0,
      importedRelationships: 0,
      importedContacts: 0,
      importedMedia: 0,
      importedPositions: 0,
      errors: [`Erreur lors de la lecture du fichier: ${error.message}`],
      warnings: [],
    };
  }
};

