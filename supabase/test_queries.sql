-- ============================================================================
-- REQUÊTES SQL DE TEST POUR VÉRIFIER LES FONCTIONS RPC
-- ============================================================================

-- 1. Vérifier que les fonctions existent dans le schéma public
SELECT 
    routine_name,
    routine_schema,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'get_user_trees',
        'get_current_user_profile',
        'get_tree_persons',
        'get_tree_relationships',
        'create_user_tree',
        'create_person_from_profile'
    )
ORDER BY routine_name;

-- 2. Vérifier les permissions sur les fonctions
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    CASE p.prosecdef 
        WHEN true THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_user_trees',
        'get_current_user_profile',
        'get_tree_persons',
        'get_tree_relationships',
        'create_user_tree',
        'create_person_from_profile'
    )
ORDER BY p.proname;

-- 3. Vérifier le search_path des fonctions
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) LIKE '%SET search_path%' AS has_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN (
        'get_user_trees',
        'get_current_user_profile',
        'get_tree_persons',
        'get_tree_relationships',
        'create_user_tree',
        'create_person_from_profile'
    );

-- 4. Tester get_current_user_profile (remplacer USER_ID par un UUID valide)
-- SELECT * FROM public.get_current_user_profile();

-- 5. Tester get_user_trees (remplacer USER_ID par un UUID valide)
-- SELECT * FROM public.get_user_trees('USER_ID_ICI'::uuid);

-- 6. Vérifier les utilisateurs et leurs profils
SELECT 
    u.id AS user_id,
    u.email,
    p.display_name,
    p.created_at AS profile_created_at
FROM auth.users u
LEFT JOIN family_tree.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. Vérifier les arbres existants
SELECT 
    t.id,
    t.name,
    t.owner_id,
    p.display_name AS owner_name,
    COUNT(tm.user_id) AS member_count
FROM family_tree.trees t
LEFT JOIN family_tree.profiles p ON p.id = t.owner_id
LEFT JOIN family_tree.tree_members tm ON tm.tree_id = t.id
GROUP BY t.id, t.name, t.owner_id, p.display_name
ORDER BY t.created_at DESC
LIMIT 10;

-- 8. Vérifier les permissions RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'family_tree'
ORDER BY tablename, policyname;

-- 9. Vérifier que RLS est activé
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'family_tree'
ORDER BY tablename;

-- 10. Tester la création d'un arbre (remplacer USER_ID et NAME)
-- SELECT * FROM public.create_user_tree('Mon arbre de test', 'Description de test');

-- ============================================================================
-- REQUÊTES DE RÉPARATION SI NÉCESSAIRE
-- ============================================================================

-- Si les fonctions n'existent pas, exécuter la migration :
-- \i /path/to/20240101000012_create_rpc_functions.sql

-- Ou créer manuellement get_user_trees si elle manque :
/*
CREATE OR REPLACE FUNCTION public.get_user_trees(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM family_tree.get_user_trees(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_user_trees(uuid) SET search_path = family_tree, public;
*/

