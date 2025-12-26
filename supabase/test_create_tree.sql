-- ============================================================================
-- TEST: Créer un arbre et vérifier que tout fonctionne
-- ============================================================================

-- 1. Créer un arbre pour l'utilisateur (remplacer USER_ID par l'UUID réel)
-- Note: Cette fonction doit être appelée via l'API avec un token JWT valide
-- En psql, on peut simuler avec SET LOCAL role

-- Simuler l'authentification (remplacer par l'UUID réel de l'utilisateur)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '24641e55-1f52-41d5-bb83-5dbdbbde06c1';

-- Tester la création d'un arbre
SELECT * FROM public.create_user_tree('Mon arbre de test', 'Description de test');

-- Vérifier que l'arbre a été créé
SELECT * FROM family_tree.trees;

-- Vérifier que l'utilisateur est bien membre
SELECT * FROM family_tree.tree_members;

-- Tester get_user_trees (devrait maintenant retourner 1 ligne)
SELECT * FROM public.get_user_trees('24641e55-1f52-41d5-bb83-5dbdbbde06c1'::uuid);

-- Nettoyer (optionnel)
-- DELETE FROM family_tree.tree_members WHERE tree_id IN (SELECT id FROM family_tree.trees WHERE name = 'Mon arbre de test');
-- DELETE FROM family_tree.trees WHERE name = 'Mon arbre de test';

