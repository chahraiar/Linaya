# Analyse : Fonctionnalité d'Export/Import d'Arbre Généalogique

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [État actuel de l'application](#état-actuel-de-lapplication)
3. [Structure des données](#structure-des-données)
4. [Formats d'export/import proposés](#formats-dexportimport-proposés)
5. [Architecture proposée](#architecture-proposée)
6. [Cas d'usage](#cas-dusage)
7. [Considérations de sécurité](#considérations-de-sécurité)
8. [Plan d'implémentation](#plan-dimplémentation)
9. [Risques et limitations](#risques-et-limitations)

---

## 1. Vue d'ensemble

### Objectif
Permettre aux utilisateurs d'exporter un arbre généalogique complet depuis Linaya et de l'importer dans une autre instance (ou la même instance) pour :
- **Sauvegarde** : Créer une copie de sauvegarde locale
- **Migration** : Transférer un arbre vers un autre compte/utilisateur
- **Partage** : Partager un arbre avec d'autres utilisateurs (hors plateforme)
- **Interopérabilité** : Échanger des données avec d'autres logiciels de généalogie

### Portée
Cette fonctionnalité doit gérer :
- ✅ Toutes les données de l'arbre (personnes, relations, contacts, médias, positions)
- ✅ Les métadonnées (nom, description, dates de création/modification)
- ✅ La préservation de l'intégrité référentielle
- ✅ La gestion des conflits lors de l'import

---

## 2. État actuel de l'application

### 2.1 Structure de la base de données

#### Tables principales

**`family_tree.trees`**
- `id` (uuid) - Identifiant unique
- `owner_id` (uuid) - Propriétaire de l'arbre
- `name` (text) - Nom de l'arbre
- `description` (text, nullable) - Description
- `created_at`, `updated_at` (timestamptz)

**`family_tree.persons`**
- `id` (uuid) - Identifiant unique
- `tree_id` (uuid) - Référence à l'arbre
- `created_by` (uuid, nullable) - Créateur
- `first_name`, `last_name`, `display_name` (text, nullable)
- `gender` (text) - 'male' ou 'female'
- `is_living` (boolean)
- `is_visible` (boolean) - Visibilité dans l'arbre
- `birth_date`, `death_date` (date, nullable)
- `notes` (text, nullable)
- `main_photo_id` (uuid, nullable)
- `created_at`, `updated_at`, `deleted_at` (timestamptz)

**`family_tree.person_relationships`**
- `id` (uuid)
- `tree_id` (uuid)
- `from_person_id` (uuid)
- `to_person_id` (uuid)
- `type` (text) - 'parent' ou 'partner'
- `notes` (text, nullable)
- `created_at` (timestamptz)

**`family_tree.person_contacts`**
- `id` (uuid)
- `person_id` (uuid)
- `type` (text) - 'email', 'mobile', 'social', 'website', 'other'
- `label` (text, nullable)
- `value` (text)
- `is_primary` (boolean)
- `visibility` (text) - 'private', 'tree', 'shared'
- `created_at` (timestamptz)

**`family_tree.person_positions`**
- `id` (uuid)
- `tree_id` (uuid)
- `person_id` (uuid)
- `position_x`, `position_y` (numeric)
- `created_by` (uuid, nullable)
- `created_at`, `updated_at` (timestamptz)

**`family_tree.person_media`**
- `id` (uuid)
- `person_id` (uuid)
- `type` (text) - 'photo'
- `storage_path` (text) - Chemin dans Supabase Storage
- `caption` (text, nullable)
- `taken_at` (date, nullable)
- `is_primary` (boolean)
- `created_at` (timestamptz)

**`family_tree.tree_members`**
- `tree_id` (uuid)
- `user_id` (uuid)
- `role` (text) - 'owner', 'editor', 'viewer'
- `status` (text) - 'active', 'pending', 'inactive'
- `created_at` (timestamptz)

### 2.2 Structure frontend (TypeScript)

#### Interface `Person` (store)
```typescript
interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number;
  deathYear?: number;
  birthDate?: string; // YYYY-MM-DD
  deathDate?: string; // YYYY-MM-DD
  gender?: string; // 'male' | 'female'
  isVisible?: boolean;
  notes?: string;
  parentIds: string[];
  partnerId?: string;
  childrenIds: string[];
}
```

#### Interface `Tree` (service)
```typescript
interface Tree {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}
```

### 2.3 Services existants

**`treeService.ts`** contient :
- `getTreeData(treeId)` - Récupère toutes les données d'un arbre
- `getUserTrees()` - Liste les arbres de l'utilisateur
- `getPersonContacts(personId)` - Récupère les contacts d'une personne
- `getPersonMedia(personId)` - Récupère les médias d'une personne
- `getPersonPositions(treeId)` - Récupère les positions personnalisées

---

## 3. Structure des données

### 3.1 Données à exporter

#### Données principales (obligatoires)
1. **Métadonnées de l'arbre**
   - Nom, description
   - Dates de création/modification
   - Version du format d'export

2. **Personnes**
   - Toutes les informations de base (nom, dates, genre, notes)
   - Statut (vivant, visible)

3. **Relations**
   - Relations parent-enfant
   - Relations partenaires (conjoints)

#### Données secondaires (optionnelles)
4. **Contacts**
   - Emails, téléphones, adresses
   - Réseaux sociaux
   - Visibilité des contacts

5. **Positions personnalisées**
   - Coordonnées X/Y pour le rendu de l'arbre

6. **Médias**
   - Photos (avec métadonnées)
   - ⚠️ **Problème** : Les fichiers doivent être téléchargés depuis Supabase Storage

7. **Membres de l'arbre** (optionnel)
   - Liste des utilisateurs ayant accès
   - Rôles et permissions
   - ⚠️ **Sécurité** : Ne pas exporter les emails/identifiants utilisateurs

### 3.2 Données à exclure

- **Identifiants utilisateurs** (`owner_id`, `created_by`) - Remplacés par des références anonymes
- **UUIDs de base de données** - Régénérés lors de l'import
- **Données de session** - Non pertinentes
- **Historique d'audit** - Trop volumineux

---

## 4. Formats d'export/import proposés

### 4.1 Format JSON (recommandé - Phase 1)

#### Avantages
- ✅ Facile à implémenter
- ✅ Lisible par l'humain
- ✅ Compatible avec TypeScript
- ✅ Supporte toutes les structures de données
- ✅ Facile à valider

#### Inconvénients
- ❌ Pas de standard généalogique
- ❌ Pas d'interopérabilité avec d'autres logiciels

#### Structure proposée
```json
{
  "version": "1.0.0",
  "exportDate": "2024-01-15T10:30:00Z",
  "exportedBy": "user@example.com",
  "tree": {
    "name": "Arbre de la famille Dupont",
    "description": "Arbre généalogique principal"
  },
  "persons": [
    {
      "id": "person-1",
      "firstName": "Jean",
      "lastName": "Dupont",
      "gender": "male",
      "birthDate": "1950-05-15",
      "deathDate": null,
      "isLiving": true,
      "isVisible": true,
      "notes": "Notes sur Jean",
      "contacts": [
        {
          "type": "email",
          "value": "jean.dupont@example.com",
          "isPrimary": true,
          "visibility": "tree"
        }
      ],
      "media": [
        {
          "id": "media-1",
          "type": "photo",
          "storagePath": "persons/person-1/photo.jpg",
          "caption": "Photo de profil",
          "takenAt": "2020-01-01",
          "isPrimary": true,
          "fileData": "base64..." // Optionnel
        }
      ]
    }
  ],
  "relationships": [
    {
      "fromPersonId": "person-1",
      "toPersonId": "person-2",
      "type": "parent",
      "notes": null
    },
    {
      "fromPersonId": "person-1",
      "toPersonId": "person-3",
      "type": "partner",
      "notes": "Mariage en 1975"
    }
  ],
  "positions": [
    {
      "personId": "person-1",
      "x": 100,
      "y": 200
    }
  ]
}
```

### 4.2 Format GEDCOM (Phase 2 - Optionnel)

#### Avantages
- ✅ Standard généalogique international (GEDCOM 5.5.1 ou 7.0)
- ✅ Interopérabilité avec la plupart des logiciels (Ancestry, FamilySearch, etc.)
- ✅ Supporté par de nombreux outils

#### Inconvénients
- ❌ Format texte complexe à parser
- ❌ Limité dans la représentation de certaines données (réseaux sociaux, positions)
- ❌ Nécessite une bibliothèque de conversion

#### Exemple GEDCOM
```
0 HEAD
1 SOUR LINAYA
1 VERS 1.0.0
1 DATE 15 JAN 2024
0 @I1@ INDI
1 NAME Jean /Dupont/
2 GIVN Jean
2 SURN Dupont
1 SEX M
1 BIRT
2 DATE 15 MAY 1950
1 EMAIL jean.dupont@example.com
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 1975
```

### 4.3 Format CSV (Phase 3 - Optionnel)

#### Avantages
- ✅ Facile à ouvrir dans Excel/Google Sheets
- ✅ Utile pour des exports partiels (liste de personnes)

#### Inconvénients
- ❌ Ne supporte pas les relations complexes
- ❌ Limité pour les données structurées

---

## 5. Architecture proposée

### 5.1 Service d'export (`exportService.ts`)

```typescript
// web/src/services/exportService.ts

interface ExportOptions {
  includeMedia?: boolean; // Télécharger les fichiers médias
  includePositions?: boolean; // Inclure les positions personnalisées
  includeContacts?: boolean; // Inclure les contacts
  anonymizeUsers?: boolean; // Anonymiser les références utilisateurs
}

export const exportTree = async (
  treeId: string,
  options: ExportOptions = {}
): Promise<ExportData> => {
  // 1. Récupérer les données de l'arbre
  // 2. Récupérer toutes les personnes
  // 3. Récupérer toutes les relations
  // 4. Récupérer les contacts (si option activée)
  // 5. Récupérer les positions (si option activée)
  // 6. Récupérer les médias (si option activée)
  // 7. Télécharger les fichiers médias depuis Storage (si option activée)
  // 8. Construire l'objet d'export
  // 9. Retourner les données
};

export const exportTreeToJSON = async (
  treeId: string,
  options: ExportOptions = {}
): Promise<string> => {
  const data = await exportTree(treeId, options);
  return JSON.stringify(data, null, 2);
};

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
  a.click();
  URL.revokeObjectURL(url);
};
```

### 5.2 Service d'import (`importService.ts`)

```typescript
// web/src/services/importService.ts

interface ImportOptions {
  mergeMode?: 'replace' | 'merge' | 'append'; // Mode de fusion
  skipDuplicates?: boolean; // Ignorer les doublons
  preservePositions?: boolean; // Préserver les positions
  importMedia?: boolean; // Importer les médias
}

interface ImportResult {
  success: boolean;
  treeId?: string;
  importedPersons: number;
  importedRelationships: number;
  importedContacts: number;
  importedMedia: number;
  errors: string[];
  warnings: string[];
}

export const importTreeFromJSON = async (
  jsonData: string,
  targetTreeId: string | null, // null = créer un nouvel arbre
  options: ImportOptions = {}
): Promise<ImportResult> => {
  // 1. Parser et valider le JSON
  // 2. Vérifier la version du format
  // 3. Créer ou utiliser l'arbre cible
  // 4. Mapper les anciens IDs vers les nouveaux IDs
  // 5. Créer les personnes (en respectant l'ordre des dépendances)
  // 6. Créer les relations
  // 7. Créer les contacts
  // 8. Créer les positions
  // 9. Importer les médias (upload vers Storage)
  // 10. Retourner le résultat
};

export const importTreeFromFile = async (
  file: File,
  targetTreeId: string | null,
  options: ImportOptions = {}
): Promise<ImportResult> => {
  const text = await file.text();
  return importTreeFromJSON(text, targetTreeId, options);
};
```

### 5.3 Validation et schéma

**Utilisation de Zod pour la validation** :
```typescript
import { z } from 'zod';

const PersonSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  gender: z.enum(['male', 'female']).optional(),
  birthDate: z.string().optional(),
  // ...
});

const ExportDataSchema = z.object({
  version: z.string(),
  exportDate: z.string(),
  tree: z.object({
    name: z.string(),
    description: z.string().nullable(),
  }),
  persons: z.array(PersonSchema),
  relationships: z.array(RelationshipSchema),
  // ...
});
```

### 5.4 Interface utilisateur

#### Bouton d'export (SettingsScreen ou TreeScreen)
```typescript
// Dans SettingsScreen.tsx ou TreeScreen.tsx
const handleExport = async () => {
  try {
    setExporting(true);
    await downloadTreeExport(
      currentTreeId,
      `arbre-${treeName}-${new Date().toISOString().split('T')[0]}.json`,
      {
        includeMedia: true,
        includePositions: true,
        includeContacts: true,
      }
    );
    alert('Export réussi !');
  } catch (error) {
    alert('Erreur lors de l\'export');
  } finally {
    setExporting(false);
  }
};
```

#### Modal d'import
```typescript
// ImportTreeModal.tsx
const ImportTreeModal = ({ visible, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ImportOptions>({});
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    try {
      setImporting(true);
      const result = await importTreeFromFile(file, null, options);
      if (result.success) {
        onImport(result.treeId);
        onClose();
      } else {
        alert(`Erreurs: ${result.errors.join(', ')}`);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <h2>Importer un arbre</h2>
      <input
        type="file"
        accept=".json"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <label>
        <input
          type="checkbox"
          checked={options.importMedia}
          onChange={(e) => setOptions({ ...options, importMedia: e.target.checked })}
        />
        Importer les photos
      </label>
      <button onClick={handleImport} disabled={!file || importing}>
        {importing ? 'Import en cours...' : 'Importer'}
      </button>
    </Modal>
  );
};
```

---

## 6. Cas d'usage

### 6.1 Export complet avec médias
**Scénario** : Utilisateur veut sauvegarder son arbre avec toutes les photos.

**Processus** :
1. Clic sur "Exporter l'arbre"
2. Sélection des options (médias activés)
3. Téléchargement des fichiers médias depuis Supabase Storage
4. Encodage en base64 (ou conservation des URLs)
5. Génération du fichier JSON
6. Téléchargement automatique

**Taille estimée** : 
- 100 personnes × 2 photos × 500KB = ~100MB
- ⚠️ **Limitation** : Fichiers volumineux

### 6.2 Import dans un nouvel arbre
**Scénario** : Utilisateur importe un arbre exporté.

**Processus** :
1. Sélection du fichier JSON
2. Validation du format
3. Création d'un nouvel arbre
4. Import des personnes (avec mapping d'IDs)
5. Import des relations
6. Upload des médias vers Storage
7. Affichage du résultat

### 6.3 Import avec fusion
**Scénario** : Utilisateur veut fusionner deux arbres.

**Processus** :
1. Import dans un arbre existant
2. Détection des doublons (par nom + dates)
3. Proposition de fusion ou ajout
4. Import des nouvelles données
5. Mise à jour des relations

### 6.4 Export partiel (sans médias)
**Scénario** : Utilisateur veut partager uniquement les données textuelles.

**Processus** :
1. Export avec option `includeMedia: false`
2. Fichier JSON léger (~100KB pour 100 personnes)
3. Partage facile par email

---

## 7. Considérations de sécurité

### 7.1 Données sensibles

#### À exclure de l'export
- **Emails des utilisateurs** : Ne pas exporter les emails des membres de l'arbre
- **UUIDs utilisateurs** : Remplacer par des références anonymes
- **Tokens d'authentification** : Jamais dans l'export
- **Données de paiement** : Non pertinentes

#### Visibilité des contacts
- Respecter le champ `visibility` des contacts :
  - `private` : Exclure de l'export
  - `tree` : Inclure uniquement si l'utilisateur est membre
  - `shared` : Toujours inclure

### 7.2 Validation à l'import

#### Vérifications obligatoires
1. **Version du format** : Vérifier la compatibilité
2. **Intégrité des données** : Valider avec Zod
3. **Relations valides** : Vérifier que toutes les références existent
4. **Permissions** : Vérifier que l'utilisateur peut créer/modifier l'arbre
5. **Taille des fichiers** : Limiter la taille des médias uploadés

#### Protection contre les attaques
- **Limite de taille** : Max 50MB par fichier d'import
- **Rate limiting** : Limiter le nombre d'imports par utilisateur
- **Sanitization** : Nettoyer les données avant insertion
- **Validation stricte** : Rejeter les données invalides

### 7.3 Gestion des erreurs

#### Erreurs récupérables
- Personne manquante dans une relation → Avertissement
- Contact invalide → Ignorer et continuer
- Média corrompu → Ignorer et continuer

#### Erreurs bloquantes
- Format invalide → Arrêter l'import
- Permissions insuffisantes → Arrêter l'import
- Arbre cible introuvable → Arrêter l'import

---

## 8. Plan d'implémentation

### Phase 1 : Export JSON de base (2-3 jours)
- [ ] Créer `exportService.ts`
- [ ] Implémenter `exportTree()` (sans médias)
- [ ] Ajouter bouton d'export dans l'UI
- [ ] Tester avec un arbre simple

### Phase 2 : Import JSON de base (3-4 jours)
- [ ] Créer `importService.ts`
- [ ] Implémenter `importTreeFromJSON()`
- [ ] Gérer le mapping d'IDs
- [ ] Créer modal d'import
- [ ] Tester avec un fichier exporté

### Phase 3 : Support des médias (2-3 jours)
- [ ] Téléchargement des médias lors de l'export
- [ ] Encodage base64 ou URLs
- [ ] Upload des médias lors de l'import
- [ ] Gestion des erreurs de fichiers

### Phase 4 : Fonctionnalités avancées (3-4 jours)
- [ ] Détection de doublons
- [ ] Mode fusion
- [ ] Validation avec Zod
- [ ] Gestion des erreurs complète
- [ ] Tests unitaires

### Phase 5 : Optimisations (1-2 jours)
- [ ] Compression des exports volumineux
- [ ] Export asynchrone pour gros arbres
- [ ] Barre de progression
- [ ] Logs détaillés

**Total estimé** : 11-16 jours de développement

---

## 9. Risques et limitations

### 9.1 Limitations techniques

#### Taille des fichiers
- **Problème** : Les exports avec médias peuvent être très volumineux (>100MB)
- **Solution** : 
  - Option d'exporter sans médias
  - Compression ZIP
  - Export asynchrone avec notification

#### Performance
- **Problème** : Import de gros arbres peut être lent
- **Solution** :
  - Import par lots (batch)
  - Barre de progression
  - Traitement asynchrone

#### Médias
- **Problème** : Les URLs Supabase Storage ne sont pas accessibles après export
- **Solution** :
  - Télécharger et encoder en base64 (volumineux)
  - Ou exporter uniquement les métadonnées (pas les fichiers)

### 9.2 Risques fonctionnels

#### Perte de données
- **Risque** : Erreur lors de l'import partiel
- **Mitigation** : Transaction atomique ou rollback

#### Conflits de données
- **Risque** : Doublons lors de la fusion
- **Mitigation** : Détection et résolution manuelle

#### Intégrité référentielle
- **Risque** : Relations vers des personnes inexistantes
- **Mitigation** : Validation stricte avant import

### 9.3 Limitations futures

#### Formats non supportés (Phase 1)
- GEDCOM (nécessite bibliothèque externe)
- CSV (limité pour les relations)
- XML (complexe à parser)

#### Fonctionnalités non incluses
- Export/import des événements (si table existe)
- Export/import des notes détaillées (si structure complexe)
- Historique des modifications

---

## 10. Recommandations

### Priorités
1. **Phase 1** : Export/import JSON de base (sans médias) - **Priorité haute**
2. **Phase 2** : Support des médias - **Priorité moyenne**
3. **Phase 3** : Fonctionnalités avancées - **Priorité basse**

### Améliorations futures
- Support GEDCOM pour interopérabilité
- Export/import incrémental (seulement les modifications)
- API REST pour export/import programmatique
- Export vers PDF/Image de l'arbre visuel

---

## 11. Références

### Standards
- [GEDCOM 5.5.1 Specification](https://www.gedcom.org/)
- [GEDCOM 7.0 Specification](https://gedcom.io/)

### Bibliothèques utiles
- `zod` - Validation de schémas TypeScript
- `jszip` - Compression ZIP côté client
- `gedcom.js` - Parser GEDCOM (si Phase 2)

---

**Document créé le** : 2024-01-15  
**Version** : 1.0.0  
**Auteur** : Analyse technique Linaya



