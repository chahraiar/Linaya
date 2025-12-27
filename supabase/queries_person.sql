-- ============================================================================
-- REQUÊTES SQL UTILES POUR GÉRER LES PERSONNES
-- ============================================================================

-- ============================================================================
-- 1. SELECT : Voir une personne par ID
-- ============================================================================
SELECT 
    p.id,
    p.tree_id,
    p.created_by,
    p.first_name,
    p.last_name,
    p.display_name,
    p.gender,
    p.is_living,
    p.birth_date,
    p.death_date,
    p.notes,
    p.main_photo_id,
    p.created_at,
    p.updated_at,
    p.deleted_at
FROM family_tree.persons p
WHERE p.id = 'VOTRE_PERSON_ID_ICI'::uuid
    AND p.deleted_at IS NULL;

-- ============================================================================
-- 2. SELECT : Voir toutes les personnes d'un arbre (non supprimées)
-- ============================================================================
SELECT 
    p.id,
    p.tree_id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.birth_date,
    p.death_date,
    p.gender,
    p.is_living,
    p.deleted_at
FROM family_tree.persons p
WHERE p.tree_id = 'VOTRE_TREE_ID_ICI'::uuid
    AND p.deleted_at IS NULL
ORDER BY p.created_at ASC;

-- ============================================================================
-- 3. SELECT : Vérifier si une personne est le profil de l'utilisateur
-- ============================================================================
SELECT 
    p.id AS person_id,
    p.first_name,
    p.last_name,
    tsp.user_id,
    tsp.tree_id,
    CASE 
        WHEN tsp.user_id = auth.uid() THEN true
        ELSE false
    END AS is_self_person
FROM family_tree.persons p
LEFT JOIN family_tree.tree_self_person tsp 
    ON tsp.person_id = p.id 
    AND tsp.tree_id = p.tree_id
WHERE p.id = 'VOTRE_PERSON_ID_ICI'::uuid
    AND p.deleted_at IS NULL;

-- ============================================================================
-- 4. DELETE (Soft Delete) : Supprimer une personne par ID
-- ============================================================================
-- ⚠️ ATTENTION : Cette requête fait un soft delete (met deleted_at = now())
-- ⚠️ Pour un hard delete, utilisez DELETE FROM au lieu de UPDATE
-- ⚠️ Vérifiez d'abord que ce n'est pas votre propre profil !

-- Vérification avant suppression (optionnel mais recommandé)
DO $$
DECLARE
    v_person_id uuid := '3e27e20e-4dbf-4195-bf41-e7c15a092d53'::uuid;
    v_user_id uuid := auth.uid();
    v_tree_id uuid;
    v_is_self_person boolean;
BEGIN
    -- Récupérer le tree_id
    SELECT p.tree_id INTO v_tree_id
    FROM family_tree.persons p
    WHERE p.id = v_person_id AND p.deleted_at IS NULL;
    
    IF v_tree_id IS NULL THEN
        RAISE EXCEPTION 'Personne non trouvée';
    END IF;
    
    -- Vérifier si c'est le profil de l'utilisateur
    SELECT EXISTS (
        SELECT 1
        FROM family_tree.tree_self_person tsp
        WHERE tsp.tree_id = v_tree_id
            AND tsp.user_id = v_user_id
            AND tsp.person_id = v_person_id
    ) INTO v_is_self_person;
    
    IF v_is_self_person THEN
        RAISE EXCEPTION 'Vous ne pouvez pas supprimer votre propre profil';
    END IF;
    
    -- Soft delete
    UPDATE family_tree.persons
    SET deleted_at = now()
    WHERE id = v_person_id
        AND deleted_at IS NULL;
    
    RAISE NOTICE 'Personne supprimée avec succès (soft delete)';
END $$;

-- ============================================================================
-- 5. DELETE (Soft Delete) : Version simple (sans vérification)
-- ============================================================================
UPDATE family_tree.persons
SET deleted_at = now()
WHERE id = 'VOTRE_PERSON_ID_ICI'::uuid
    AND deleted_at IS NULL;

-- ============================================================================
-- 6. RESTORE : Restaurer une personne supprimée (annuler le soft delete)
-- ============================================================================
UPDATE family_tree.persons
SET deleted_at = NULL
WHERE id = 'VOTRE_PERSON_ID_ICI'::uuid
    AND deleted_at IS NOT NULL;

-- ============================================================================
-- 7. DELETE (Hard Delete) : Supprimer définitivement une personne
-- ⚠️ DANGER : Cette opération est irréversible !
-- ⚠️ Supprime aussi toutes les relations, contacts, médias associés (CASCADE)
-- ============================================================================
-- DELETE FROM family_tree.persons
-- WHERE id = 'VOTRE_PERSON_ID_ICI'::uuid;

-- ============================================================================
-- 8. SELECT : Voir les personnes supprimées (soft delete)
-- ============================================================================
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.deleted_at,
    p.created_at
FROM family_tree.persons p
WHERE p.tree_id = 'VOTRE_TREE_ID_ICI'::uuid
    AND p.deleted_at IS NOT NULL
ORDER BY p.deleted_at DESC;

-- ============================================================================
-- 9. SELECT : Compter les personnes d'un arbre (actives et supprimées)
-- ============================================================================
SELECT 
    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_count,
    COUNT(*) AS total_count
FROM family_tree.persons
WHERE tree_id = 'VOTRE_TREE_ID_ICI'::uuid;

-- ============================================================================
-- 10. Utiliser la fonction RPC pour supprimer (recommandé)
-- ============================================================================
-- Cette fonction vérifie automatiquement les permissions et si c'est le profil de l'utilisateur
SELECT public.delete_person('VOTRE_PERSON_ID_ICI'::uuid);

-- ============================================================================
-- 11. Utiliser la fonction RPC pour vérifier si c'est le profil de l'utilisateur
-- ============================================================================
SELECT public.is_self_person('VOTRE_PERSON_ID_ICI'::uuid);

-- ============================================================================
-- 12. DIAGNOSTIC : Voir toutes les personnes d'un arbre et leur statut "self_person"
-- ============================================================================
-- Cette requête montre toutes les personnes de l'arbre et indique laquelle est
-- liée à l'utilisateur connecté dans tree_self_person
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.created_at,
    p.created_by,
    CASE 
        WHEN tsp.user_id = auth.uid() THEN true
        ELSE false
    END AS is_self_person,
    tsp.user_id AS linked_user_id,
    CASE 
        WHEN p.created_by = auth.uid() THEN 'Créée par vous'
        ELSE 'Créée par un autre'
    END AS created_by_status
FROM family_tree.persons p
LEFT JOIN family_tree.tree_self_person tsp 
    ON tsp.person_id = p.id 
    AND tsp.tree_id = p.tree_id
WHERE p.tree_id = 'VOTRE_TREE_ID_ICI'::uuid
    AND p.deleted_at IS NULL
ORDER BY p.created_at ASC;

-- ============================================================================
-- 13. DIAGNOSTIC : Voir quelle personne est actuellement liée à l'utilisateur
-- ============================================================================
-- Cette requête montre quelle personne est actuellement liée à l'utilisateur
-- connecté dans tree_self_person (il ne peut y en avoir qu'une par arbre)
SELECT 
    p.id AS person_id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.created_at,
    tsp.tree_id,
    tsp.user_id,
    tsp.person_id AS linked_person_id
FROM family_tree.tree_self_person tsp
JOIN family_tree.persons p ON p.id = tsp.person_id
WHERE tsp.user_id = auth.uid()
    AND tsp.tree_id = 'VOTRE_TREE_ID_ICI'::uuid
    AND p.deleted_at IS NULL;

-- ============================================================================
-- 14. RÉPARATION : Lier une personne existante à l'utilisateur (remplace l'ancienne)
-- ============================================================================
-- ⚠️ ATTENTION : Cette opération remplace la personne actuellement liée à l'utilisateur
-- ⚠️ Utilisez avec précaution !
INSERT INTO family_tree.tree_self_person (tree_id, user_id, person_id)
VALUES (
    'VOTRE_TREE_ID_ICI'::uuid,
    auth.uid(),
    'VOTRE_PERSON_ID_ICI'::uuid
)
ON CONFLICT (tree_id, user_id) DO UPDATE
SET person_id = EXCLUDED.person_id;

-- ============================================================================
-- 15. RÉPARATION : Lier la première personne créée par l'utilisateur à son compte
-- ============================================================================
-- Cette requête lie automatiquement la première personne créée par l'utilisateur
-- dans l'arbre à son compte (utile si tree_self_person est vide)
INSERT INTO family_tree.tree_self_person (tree_id, user_id, person_id)
SELECT 
    p.tree_id,
    auth.uid(),
    p.id
FROM family_tree.persons p
WHERE p.tree_id = 'VOTRE_TREE_ID_ICI'::uuid
    AND p.created_by = auth.uid()
    AND p.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM family_tree.tree_self_person tsp 
        WHERE tsp.tree_id = p.tree_id 
        AND tsp.user_id = auth.uid()
    )
ORDER BY p.created_at ASC
LIMIT 1
ON CONFLICT (tree_id, user_id) DO UPDATE
SET person_id = EXCLUDED.person_id;

