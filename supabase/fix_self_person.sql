-- ============================================================================
-- RÉPARATION : Lier "Yassine CHAHRAIAR" à votre compte
-- ============================================================================
-- Cette requête lie "Yassine CHAHRAIAR" (la première personne créée) à votre compte
-- et remplace "Chaima Sœur" qui est actuellement liée
--
-- ⚠️ IMPORTANT : Cette requête doit être exécutée via l'API Supabase (RPC) ou
-- avec un utilisateur authentifié. Si vous êtes en session PostgreSQL directe,
-- utilisez plutôt la fonction RPC ou remplacez auth.uid() par votre user_id.
--
-- Option 1 : Via l'application (recommandé)
-- L'application utilisera automatiquement create_person_from_profile qui crée
-- le lien tree_self_person correctement.
--
-- Option 2 : Via RPC (si vous créez une fonction pour ça)
-- SELECT public.link_self_person('a1ab36c9-8e2a-4839-a9b7-046fbb8e9be4'::uuid, 'ec7ed186-b09a-440c-8a80-dd91d33a159f'::uuid);
--
-- Option 3 : En session PostgreSQL directe (remplacer YOUR_USER_ID)
-- INSERT INTO family_tree.tree_self_person (tree_id, user_id, person_id)
-- VALUES (
--     'a1ab36c9-8e2a-4839-a9b7-046fbb8e9be4'::uuid,
--     'YOUR_USER_ID'::uuid,  -- Remplacez par votre user_id (2e49c1c8-41be-4f0f-b892-a0c2399258bf)
--     'ec7ed186-b09a-440c-8a80-dd91d33a159f'::uuid  -- ID de Yassine CHAHRAIAR
-- )
-- ON CONFLICT (tree_id, user_id) DO UPDATE
-- SET person_id = EXCLUDED.person_id;

-- ============================================================================
-- ALTERNATIVE : Lier manuellement "Yassine CHAHRAIAR" à votre compte
-- ============================================================================
-- Si vous préférez lier manuellement la personne "Yassine CHAHRAIAR" :
-- INSERT INTO family_tree.tree_self_person (tree_id, user_id, person_id)
-- VALUES (
--     'a1ab36c9-8e2a-4839-a9b7-046fbb8e9be4'::uuid,
--     auth.uid(),
--     'ec7ed186-b09a-440c-8a80-dd91d33a159f'::uuid  -- ID de Yassine CHAHRAIAR
-- )
-- ON CONFLICT (tree_id, user_id) DO UPDATE
-- SET person_id = EXCLUDED.person_id;

-- ============================================================================
-- VÉRIFICATION : Vérifier que la correction a fonctionné
-- ============================================================================
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.display_name,
    p.created_at,
    CASE 
        WHEN tsp.user_id = auth.uid() THEN true
        ELSE false
    END AS is_self_person,
    tsp.user_id AS linked_user_id
FROM family_tree.persons p
LEFT JOIN family_tree.tree_self_person tsp 
    ON tsp.person_id = p.id 
    AND tsp.tree_id = p.tree_id
WHERE p.tree_id = 'a1ab36c9-8e2a-4839-a9b7-046fbb8e9be4'::uuid
    AND p.deleted_at IS NULL
ORDER BY p.created_at ASC;

