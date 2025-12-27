-- ============================================================================
-- SCRIPT DE RÉINITIALISATION DES DONNÉES DE TEST
-- ============================================================================
-- ⚠️ ATTENTION : Ce script supprime TOUTES les données de test
-- ⚠️ Utilisez uniquement en développement/test
-- ⚠️ Ne pas exécuter en production !

-- ============================================================================
-- 1. Supprimer toutes les relations entre personnes
-- ============================================================================
DELETE FROM family_tree.person_relationships;

-- ============================================================================
-- 2. Supprimer tous les contacts des personnes
-- ============================================================================
DELETE FROM family_tree.person_contacts;

-- ============================================================================
-- 3. Supprimer tous les médias des personnes
-- ============================================================================
DELETE FROM family_tree.person_media;

-- ============================================================================
-- 4. Supprimer tous les événements des personnes
-- ============================================================================
DELETE FROM family_tree.person_events;

-- ============================================================================
-- 5. Supprimer tous les liens tree_self_person
-- ============================================================================
DELETE FROM family_tree.tree_self_person;

-- ============================================================================
-- 6. Supprimer toutes les personnes (soft delete d'abord, puis hard delete)
-- ============================================================================
-- Soft delete toutes les personnes
UPDATE family_tree.persons SET deleted_at = now() WHERE deleted_at IS NULL;

-- Hard delete toutes les personnes (y compris celles soft-deleted)
DELETE FROM family_tree.persons;

-- ============================================================================
-- 7. Supprimer tous les membres des arbres
-- ============================================================================
DELETE FROM family_tree.tree_members;

-- ============================================================================
-- 8. Supprimer tous les arbres
-- ============================================================================
DELETE FROM family_tree.trees;

-- ============================================================================
-- 9. Supprimer tous les profils utilisateurs (optionnel - seulement si vous voulez tout supprimer)
-- ============================================================================
-- ⚠️ DÉCOMMENTEZ UNIQUEMENT SI VOUS VOULEZ SUPPRIMER TOUS LES UTILISATEURS
-- DELETE FROM family_tree.profiles;

-- ============================================================================
-- 10. Vérification : Compter les enregistrements restants
-- ============================================================================
SELECT 
    'trees' AS table_name,
    COUNT(*) AS count
FROM family_tree.trees
UNION ALL
SELECT 
    'persons' AS table_name,
    COUNT(*) AS count
FROM family_tree.persons
UNION ALL
SELECT 
    'tree_members' AS table_name,
    COUNT(*) AS count
FROM family_tree.tree_members
UNION ALL
SELECT 
    'tree_self_person' AS table_name,
    COUNT(*) AS count
FROM family_tree.tree_self_person
UNION ALL
SELECT 
    'person_relationships' AS table_name,
    COUNT(*) AS count
FROM family_tree.person_relationships
UNION ALL
SELECT 
    'person_contacts' AS table_name,
    COUNT(*) AS count
FROM family_tree.person_contacts
UNION ALL
SELECT 
    'person_media' AS table_name,
    COUNT(*) AS count
FROM family_tree.person_media
UNION ALL
SELECT 
    'person_events' AS table_name,
    COUNT(*) AS count
FROM family_tree.person_events
ORDER BY table_name;

-- ============================================================================
-- NOTE : Pour supprimer les utilisateurs Supabase Auth, utilisez l'interface
-- Supabase Dashboard > Authentication > Users, ou l'API Supabase
-- ============================================================================

