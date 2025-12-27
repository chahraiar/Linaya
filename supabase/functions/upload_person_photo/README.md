# Edge Function: upload_person_photo

Cette Edge Function gère l'upload de photos de profil pour les personnes dans l'arbre généalogique.

## 🎯 Pourquoi utiliser une Edge Function ?

- **Bypass RLS Storage** : Utilise `SERVICE_ROLE_KEY` pour contourner les politiques RLS
- **Sécurité** : Vérifie l'authentification et les permissions côté serveur
- **Standard Supabase** : Approche recommandée pour les uploads en production

## 📋 Prérequis

1. **Variables d'environnement** dans Supabase Dashboard :
   - `SUPABASE_URL` : URL de votre projet Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` : Clé service role (⚠️ SECRET, jamais côté client)
   - `SUPABASE_ANON_KEY` : Clé anon publique

## 🚀 Déploiement

### Via Supabase CLI (recommandé)

```bash
# Installer Supabase CLI si nécessaire
npm install -g supabase

# Se connecter à votre projet
supabase login

# Lier votre projet
supabase link --project-ref your-project-ref

# Déployer la fonction
supabase functions deploy upload_person_photo
```

### Via Dashboard Supabase

1. Allez dans **Edge Functions** > **Create Function**
2. Nom : `upload_person_photo`
3. Copiez le contenu de `index.ts`
4. Configurez les variables d'environnement :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

## 🔒 Sécurité

La fonction :
- ✅ Vérifie l'authentification via JWT
- ✅ Vérifie que l'utilisateur est membre du tree
- ✅ Vérifie que la personne appartient au tree
- ✅ Utilise SERVICE_ROLE_KEY uniquement pour l'upload (bypass RLS)

## 📝 Utilisation

Le client appelle cette fonction via `treeService.uploadPersonPhoto()` qui :
1. Envoie le fichier (base64) à l'Edge Function
2. Reçoit le `storage_path`
3. Appelle `upsert_person_photo` RPC pour créer l'enregistrement média

## 🧪 Test

```bash
# Tester localement
supabase functions serve upload_person_photo

# Tester avec curl
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_base64":"...","file_name":"photo.jpg","mime_type":"image/jpeg","tree_id":"...","person_id":"..."}' \
  http://localhost:54321/functions/v1/upload_person_photo
```

