-- ============================================================================
-- VÉRIFICATION : Nom de la contrainte PRIMARY KEY de family_tree.profiles
-- ============================================================================
-- Exécutez cette requête pour vérifier le nom exact de la contrainte
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'family_tree.profiles'::regclass
  AND contype = 'p';  -- 'p' = PRIMARY KEY

-- ============================================================================
-- Si le nom n'est pas "profiles_pkey", utilisez le nom retourné dans :
-- ON CONFLICT ON CONSTRAINT {nom_retourné} DO NOTHING;
-- ============================================================================

