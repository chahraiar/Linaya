# Configuration Facebook OAuth pour Supabase Self-Hosted

## Prérequis

1. Avoir une instance Supabase self-hosted fonctionnelle via Docker
2. Avoir créé une application Facebook sur [Facebook Developers](https://developers.facebook.com/)

## 1. Configuration de l'application Facebook

1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Créez une nouvelle application ou sélectionnez une application existante
3. Allez dans **Settings** > **Basic**
4. Notez votre **App ID** et **App Secret**
5. Allez dans **Products** > **Facebook Login** > **Settings**
6. Ajoutez les **Valid OAuth Redirect URIs** :
   - Pour la production : `https://api.la-saint-quentinoise.fr/auth/v1/callback`
   - Pour le développement local : `http://localhost:8000/auth/v1/callback` (si nécessaire)
   - **Important :** L'URL doit pointer vers l'endpoint `/auth/v1/callback` de votre **API Supabase** (pas l'application web)
   - Dans votre cas : `https://api.la-saint-quentinoise.fr/auth/v1/callback`

Identifiant de l’application : 1405852437807391
Clé secrète : 9f989a5b79ed7536e34dae4f2773e4xxxxxxxxxxa3

## 2. Configuration Supabase Self-Hosted

### Option A : Via fichier .env et docker-compose.yml (Recommandé)

**Étape 1 :** Ajoutez les variables dans votre fichier `.env` :

```env
# ============================================
# FACEBOOK OAUTH
# ============================================

GOTRUE_EXTERNAL_FACEBOOK_ENABLED=true
GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID=votre-app-id-facebook
GOTRUE_EXTERNAL_FACEBOOK_SECRET=votre-app-secret-facebook
GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI=https://api.la-saint-quentinoise.fr/auth/v1/callback
```

**Important :** `GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI` doit pointer vers l'endpoint `/auth/v1/callback` de votre **API Supabase** (comme pour Google).

**Important :** Si vous partagez la même instance Supabase pour plusieurs applications, configurez comme suit :

```env
# Variables globales GoTrue (partagées entre toutes les applications)
# SITE_URL : URL principale par défaut (utilisée si aucune redirection spécifique n'est fournie)
SITE_URL=https://suivifinance.la-saint-quentinoise.fr  # Votre application principale

# ADDITIONAL_REDIRECT_URLS : liste de TOUTES les URLs autorisées pour la redirection OAuth
# Cette liste permet à GoTrue d'accepter les redirections vers n'importe quelle application
ADDITIONAL_REDIRECT_URLS=https://suivifinance.la-saint-quentinoise.fr,https://suivifinance.la-saint-quentinoise.fr/auth/callback,https://test.la-saint-quentinoise.fr,https://test.la-saint-quentinoise.fr/auth/callback,https://dev.la-saint-quentinoise.fr,https://dev.la-saint-quentinoise.fr/auth/callback,http://localhost:3000,http://localhost:3000/auth/callback,http://127.0.0.1:3000/auth/callback,com.cccadamccc.SuiviFinance://auth/callback,com.cccadamccc.SuiviFinance://expo-auth-session,exp://192.168.11.154:8081/--/auth/callback,exp://192.168.5.8:8081/--/auth/callback,https://linaya.la-saint-quentinoise.fr,https://linaya.la-saint-quentinoise.fr/auth/callback
```

**Note importante :** 
- `SITE_URL` peut rester sur votre application principale (SuiviFinance)
- `ADDITIONAL_REDIRECT_URLS` doit contenir **toutes** les URLs de toutes vos applications
- Chaque application spécifie son propre `redirectTo` dans le code frontend
- GoTrue valide que l'URL dans `redirectTo` est dans `ADDITIONAL_REDIRECT_URLS`

**Étape 2 :** Dans votre `docker-compose.yml`, ajoutez les variables au service `auth` en référençant le fichier `.env` :

```yaml
services:
  auth:
    environment:
      # ... autres variables ...
      # Facebook OAuth
      GOTRUE_EXTERNAL_FACEBOOK_ENABLED: ${GOTRUE_EXTERNAL_FACEBOOK_ENABLED}
      GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID: ${GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID}
      GOTRUE_EXTERNAL_FACEBOOK_SECRET: ${GOTRUE_EXTERNAL_FACEBOOK_SECRET}
      GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI: ${GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI}
      # Note: GOTRUE_SITE_URL et GOTRUE_URI_ALLOW_LIST définis ci-dessus s'appliquent aussi à Facebook
```

**Note :** Assurez-vous que votre `docker-compose.yml` charge le fichier `.env` (c'est généralement le cas par défaut si le fichier `.env` est dans le même répertoire que `docker-compose.yml`).

### Option B : Via variables d'environnement directes dans docker-compose.yml

Si vous préférez mettre les valeurs directement dans `docker-compose.yml` (non recommandé pour les secrets) :

```yaml
services:
  auth:
    environment:
      # ... autres variables ...
      GOTRUE_EXTERNAL_FACEBOOK_ENABLED: "true"
      GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID: "votre-app-id-facebook"
      GOTRUE_EXTERNAL_FACEBOOK_SECRET: "votre-app-secret-facebook"
      GOTRUE_SITE_URL: "https://linaya.la-saint-quentinoise.fr"
      GOTRUE_URI_ALLOW_LIST: "http://localhost:3000/*,https://linaya.la-saint-quentinoise.fr/*"
```

### Option C : Via config.toml (si vous utilisez Supabase CLI)

Si vous utilisez `supabase init` et un fichier `config.toml`, modifiez la section `[auth.external.facebook]` :

```toml
[auth.external.facebook]
enabled = true
client_id = "votre-app-id-facebook"
secret = "votre-app-secret-facebook"
```

Et dans `[auth]` :

```toml
[auth]
site_url = "https://linaya.la-saint-quentinoise.fr"
uri_allow_list = ["http://localhost:3000/*", "https://linaya.la-saint-quentinoise.fr/*"]
```

## 3. Redémarrage des conteneurs

Après avoir modifié la configuration :

```bash
docker-compose down
docker-compose up -d
```

Ou si vous utilisez Supabase CLI :

```bash
supabase stop
supabase start
```

## 5. Vérification après redémarrage

1. Vérifiez que le service `auth` démarre correctement :
   ```bash
   docker-compose logs auth
   ```

2. Vérifiez que Facebook OAuth est activé :
   - Les logs ne doivent pas contenir d'erreurs liées à Facebook
   - Vous devriez voir des messages indiquant que Facebook est configuré
   - Recherchez dans les logs : `Facebook OAuth enabled` ou similaire

3. Vérifiez que les variables d'environnement sont bien chargées :
   ```bash
   docker-compose exec auth env | grep GOTRUE_EXTERNAL_FACEBOOK
   ```

## 6. Configuration de l'application web

L'application web est déjà configurée pour utiliser Facebook OAuth via Supabase. Assurez-vous que :

1. Le fichier `.env` dans `web/` contient :
   ```env
   # Pour la production
   VITE_SUPABASE_URL=https://api.la-saint-quentinoise.fr  # URL de votre instance Supabase (ajustez selon votre configuration)
   VITE_SUPABASE_ANON_KEY=votre-anon-key
   
   # Pour le développement local
   # VITE_SUPABASE_URL=http://localhost:8000
   ```

2. L'URL de redirection dans `LoginScreen.tsx` pointe vers la route de callback :
   ```typescript
   redirectTo: `${window.location.origin}/auth/callback`
   ```
   **Important :** Utilisez `/auth/callback` (pas `/`) pour que Supabase puisse correctement gérer le callback OAuth. La route `/auth/callback` doit être définie dans votre `App.tsx`.

## 7. Test

1. Démarrez votre application web
2. Cliquez sur le bouton "Se connecter avec Facebook"
3. Vous devriez être redirigé vers Facebook pour l'authentification
4. Après autorisation, vous devriez être redirigé vers votre application

## 8. Dépannage

### Erreur : "redirect_uri_mismatch"
- Vérifiez que l'URL de redirection dans Facebook Developers correspond exactement à `https://api.la-saint-quentinoise.fr/auth/v1/callback` (l'API Supabase, pas l'app web)
- Vérifiez que `ADDITIONAL_REDIRECT_URLS` (ou `GOTRUE_URI_ALLOW_LIST`) contient `https://linaya.la-saint-quentinoise.fr/auth/callback`

### Erreur : "missing redirect URI" (400)
- Vérifiez que dans `LoginScreen.tsx`, vous utilisez `redirectTo: ${window.location.origin}/auth/callback` (avec `/auth/callback`, pas `/`)
- Vérifiez que la route `/auth/callback` existe dans votre `App.tsx` et pointe vers `AuthCallbackScreen`
- Vérifiez que `ADDITIONAL_REDIRECT_URLS` contient l'URL complète de votre application web avec `/auth/callback`

### Erreur : "Invalid OAuth credentials"
- Vérifiez que `GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID` et `GOTRUE_EXTERNAL_FACEBOOK_SECRET` sont corrects
- Vérifiez que les variables d'environnement sont bien chargées dans le conteneur

### Erreur : "Site URL mismatch"
- Vérifiez que `GOTRUE_SITE_URL` correspond à l'URL de votre application web
- Vérifiez que `GOTRUE_URI_ALLOW_LIST` contient toutes les URLs autorisées

## Notes importantes

- Pour la production, utilisez HTTPS pour toutes les URLs
- Les URLs de redirection Facebook doivent correspondre exactement (pas de trailing slash, etc.)
- Le `GOTRUE_SITE_URL` doit être l'URL publique de votre application web, pas l'URL de l'API Supabase
- L'URL de callback Supabase est toujours `/auth/v1/callback` (ajoutée automatiquement par Supabase)

