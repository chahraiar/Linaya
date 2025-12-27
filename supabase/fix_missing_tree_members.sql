-- Script de réparation : Ajouter les owners manquants dans tree_members
-- Description: Ce script ajoute les owners d'arbres qui ne sont pas dans tree_members
-- Cela peut arriver si l'arbre a été créé avant que create_user_tree soit corrigé

-- Ajouter les owners manquants
INSERT INTO family_tree.tree_members (tree_id, user_id, role, status)
SELECT 
  t.id AS tree_id,
  t.owner_id AS user_id,
  'owner' AS role,
  'active' AS status
FROM family_tree.trees t
WHERE NOT EXISTS (
  SELECT 1
  FROM family_tree.tree_members tm
  WHERE tm.tree_id = t.id
    AND tm.user_id = t.owner_id
)
ON CONFLICT (tree_id, user_id) DO NOTHING;

-- Afficher les résultats
SELECT 
  t.id AS tree_id,
  t.name AS tree_name,
  t.owner_id,
  p.display_name AS owner_name,
  CASE 
    WHEN tm.user_id IS NOT NULL THEN '✅ Membre ajouté'
    ELSE '❌ Erreur'
  END AS status
FROM family_tree.trees t
LEFT JOIN family_tree.profiles p ON p.id = t.owner_id
LEFT JOIN family_tree.tree_members tm ON tm.tree_id = t.id AND tm.user_id = t.owner_id
ORDER BY t.created_at DESC;

