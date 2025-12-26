-- ============================================================================
-- FIX: Grant permissions on all RPC functions and reload PostgREST cache
-- SECURITY: Only grant to authenticated users, NOT to anon
-- ============================================================================

-- 1. REVOKE permissions from anon (security fix)
REVOKE EXECUTE ON FUNCTION public.get_user_trees(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_tree_persons(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_tree_relationships(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_user_tree(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_person_from_profile(uuid, text, text, text) FROM anon;

-- 2. Grant execute permissions ONLY to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_trees(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tree_persons(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tree_relationships(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_tree(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_person_from_profile(uuid, text, text, text) TO authenticated;

-- 2. Forcer PostgREST à recharger son cache
-- PostgREST écoute les notifications sur le canal 'pgrst' pour recharger le cache
NOTIFY pgrst, 'reload schema';

-- 3. Vérifier que toutes les fonctions ont les bonnes permissions
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

-- 4. Vérifier les ACL (permissions) sur les fonctions
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'get_user_trees'
LIMIT 1;
