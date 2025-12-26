# Migrations Supabase - Application Arbre Généalogique (Linaya)

Ce dossier contient les migrations SQL pour créer le schéma `family_tree` dédié à l'application d'arbre généalogique.

## 📋 Structure des migrations

Les migrations sont numérotées dans l'ordre d'exécution :

1. **`20240101000000_create_schema.sql`** - Création du schéma `family_tree`
2. **`20240101000001_create_profiles.sql`** - Table des profils utilisateurs
3. **`20240101000002_create_trees.sql`** - Tables des arbres et membres
4. **`20240101000003_create_persons.sql`** - Table des personnes et liens utilisateur
5. **`20240101000004_create_relationships.sql`** - Table des relations familiales
6. **`20240101000005_create_contacts.sql`** - Table des contacts
7. **`20240101000006_create_events.sql`** - Tables des événements et participants
8. **`20240101000007_create_media.sql`** - Table des médias
9. **`20240101000008_enable_rls.sql`** - Activation RLS et politiques de sécurité
10. **`20240101000009_create_storage.sql`** - Configuration Storage (documentation)
11. **`20240101000010_create_functions.sql`** - Fonctions utilitaires

## 🚀 Installation

### Prérequis

- Accès à votre instance Supabase
- CLI Supabase installé (optionnel, pour développement local)

### Méthode 1 : Via Supabase Dashboard

1. Connectez-vous à votre projet Supabase
2. Allez dans **SQL Editor**
3. Exécutez chaque fichier de migration dans l'ordre (de `00000` à `00010`)
4. Vérifiez qu'il n'y a pas d'erreurs

### Méthode 2 : Via Supabase CLI (recommandé)

```bash
# Si vous utilisez Supabase CLI localement
supabase db reset

# Ou appliquer les migrations une par une
supabase migration up
```

### Méthode 3 : Via API/psql

```bash
# Connectez-vous à votre base de données
psql -h <your-db-host> -U postgres -d postgres

# Exécutez les migrations dans l'ordre
\i supabase/migrations/20240101000000_create_schema.sql
\i supabase/migrations/20240101000001_create_profiles.sql
# ... etc
```

## 🔐 Configuration Storage

Le bucket `family-tree-media` doit être créé manuellement via le Dashboard Supabase :

1. Allez dans **Storage** > **Buckets**
2. Créez un nouveau bucket nommé `family-tree-media`
3. Configurez les politiques de sécurité (voir `20240101000009_create_storage.sql` pour les exemples)

## 📝 Génération des types TypeScript

Après avoir appliqué les migrations, générez les types TypeScript :

```bash
# Avec Supabase CLI
supabase gen types typescript --local > src/types/database.types.ts

# Ou avec l'API Supabase
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts
```

## 🧪 Tests

Après avoir appliqué les migrations, testez avec :

```sql
-- Vérifier que le schéma existe
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'family_tree';

-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'family_tree' 
ORDER BY table_name;

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'family_tree';
```

## 🔄 Rollback

Pour supprimer toutes les migrations (⚠️ **ATTENTION : supprime toutes les données**) :

```sql
-- Supprimer le schéma et tout son contenu
DROP SCHEMA IF EXISTS family_tree CASCADE;
```

## 📚 Documentation

### Schéma de base de données

- **`profiles`** : Profils utilisateurs avec préférences d'affichage
- **`trees`** : Arbres généalogiques
- **`tree_members`** : Membres des arbres (owner, editor, viewer)
- **`persons`** : Personnes dans les arbres
- **`tree_self_person`** : Lien entre profil utilisateur et personne
- **`person_relationships`** : Relations familiales (parent, partner)
- **`person_contacts`** : Contacts (email, téléphone, réseaux sociaux)
- **`person_events`** : Événements de vie (naissance, mariage, etc.)
- **`event_participants`** : Participants aux événements
- **`person_media`** : Photos et documents

### Rôles et permissions

- **Owner** : Contrôle total (créer, modifier, supprimer, gérer les membres)
- **Editor** : Peut modifier les personnes, événements, médias (mais pas les membres)
- **Viewer** : Lecture seule

### Fonctions utilitaires

- `family_tree.get_user_trees(user_id)` : Liste des arbres d'un utilisateur
- `family_tree.get_tree_members(tree_id)` : Liste des membres d'un arbre
- `family_tree.calculate_relationship(person_a, person_b)` : Calcule la relation entre deux personnes
- `family_tree.get_person_with_relationships(person_id)` : Retourne une personne avec ses relations en JSON

## ⚠️ Notes importantes

1. **Isolation** : Le schéma `family_tree` est isolé du schéma `public` pour éviter les conflits avec d'autres applications
2. **Auth** : Les profils référencent `auth.users` (schéma système Supabase)
3. **Soft Delete** : Les personnes utilisent `deleted_at` pour le soft delete
4. **RLS** : Toutes les tables ont RLS activé avec des politiques restrictives par défaut
5. **Storage** : Les fichiers sont stockés dans le bucket `family-tree-media` avec le format `{tree_id}/{person_id}/{media_id}.{ext}`

## 🐛 Dépannage

### Erreur : "schema family_tree does not exist"
→ Exécutez d'abord `20240101000000_create_schema.sql`

### Erreur : "relation already exists"
→ Les tables existent déjà. Vérifiez si vous avez déjà appliqué les migrations.

### Erreur : "permission denied"
→ Vérifiez que vous êtes connecté avec un utilisateur ayant les droits nécessaires (généralement `postgres` ou un superuser).

### RLS bloque toutes les requêtes
→ Vérifiez que les politiques RLS sont correctement créées dans `20240101000008_enable_rls.sql`

## 📞 Support

Pour toute question ou problème, consultez la documentation Supabase :
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

