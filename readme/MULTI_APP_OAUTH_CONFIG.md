# Configuration OAuth pour plusieurs applications avec une seule instance Supabase

## Problème

Vous avez plusieurs applications (SuiviFinance, Linaya, etc.) qui partagent la même instance Supabase self-hosted, et vous voulez que chaque application puisse utiliser OAuth (Google, Facebook) avec ses propres URLs de redirection.

## Solution

### 1. Configuration dans `.env`

```env
# ============================================
# CONFIGURATION GLOBALE GOTRUE
# ============================================

# SITE_URL : URL principale par défaut (peut être n'importe quelle app)
# Cette URL est utilisée comme fallback si aucune redirection spécifique n'est fournie
SITE_URL=https://suivifinance.la-saint-quentinoise.fr

# ADDITIONAL_REDIRECT_URLS : Liste de TOUTES les URLs autorisées pour OAuth
# GoTrue valide que l'URL dans redirectTo est dans cette liste
# Format : URLs séparées par des virgules, sans espaces
ADDITIONAL_REDIRECT_URLS=https://suivifinance.la-saint-quentinoise.fr,https://suivifinance.la-saint-quentinoise.fr/auth/callback,https://test.la-saint-quentinoise.fr,https://test.la-saint-quentinoise.fr/auth/callback,https://dev.la-saint-quentinoise.fr,https://dev.la-saint-quentinoise.fr/auth/callback,http://localhost:3000,http://localhost:3000/auth/callback,http://127.0.0.1:3000/auth/callback,com.cccadamccc.SuiviFinance://auth/callback,com.cccadamccc.SuiviFinance://expo-auth-session,exp://192.168.11.154:8081/--/auth/callback,exp://192.168.5.8:8081/--/auth/callback,https://linaya.la-saint-quentinoise.fr,https://linaya.la-saint-quentinoise.fr/auth/callback,linaya://auth/callback

# ============================================
# GOOGLE OAUTH (pour SuiviFinance)
# ============================================

GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret
GOOGLE_REDIRECT_URI=https://api.la-saint-quentinoise.fr/auth/v1/callback

# ============================================
# FACEBOOK OAUTH (pour Linaya)
# ============================================

GOTRUE_EXTERNAL_FACEBOOK_ENABLED=true
GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID=1405852437807391
GOTRUE_EXTERNAL_FACEBOOK_SECRET=votre-facebook-secret
GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI=https://api.la-saint-quentinoise.fr/auth/v1/callback
```

### 2. Configuration dans `docker-compose.yml`

```yaml
services:
  supabase-auth:
    environment:
      # Variables globales (partagées)
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: ${ADDITIONAL_REDIRECT_URLS}
      API_EXTERNAL_URL: ${API_EXTERNAL_URL}

      # Google OAuth (pour SuiviFinance)
      GOTRUE_EXTERNAL_GOOGLE_ENABLED: "true"
      GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOTRUE_EXTERNAL_GOOGLE_SECRET: ${GOOGLE_CLIENT_SECRET}
      GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}

      # Facebook OAuth (pour Linaya)
      GOTRUE_EXTERNAL_FACEBOOK_ENABLED: ${GOTRUE_EXTERNAL_FACEBOOK_ENABLED}
      GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID: ${GOTRUE_EXTERNAL_FACEBOOK_CLIENT_ID}
      GOTRUE_EXTERNAL_FACEBOOK_SECRET: ${GOTRUE_EXTERNAL_FACEBOOK_SECRET}
      GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI: ${GOTRUE_EXTERNAL_FACEBOOK_REDIRECT_URI}
```

### 3. Configuration dans chaque application frontend

#### SuiviFinance (Google OAuth)

```typescript
// Dans votre code SuiviFinance
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://suivifinance.la-saint-quentinoise.fr/auth/callback',
  },
});
```

#### Linaya (Facebook OAuth)

```typescript
// Dans LoginScreen.tsx de Linaya
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'facebook',
  options: {
    redirectTo: 'https://linaya.la-saint-quentinoise.fr/auth/callback',
  },
});
```

## Comment ça fonctionne

1. **`SITE_URL`** : URL par défaut utilisée par GoTrue si aucune redirection spécifique n'est fournie. Peut être n'importe quelle application.

2. **`ADDITIONAL_REDIRECT_URLS`** : Liste blanche de toutes les URLs autorisées. GoTrue vérifie que l'URL dans `redirectTo` (passée depuis le frontend) est dans cette liste.

3. **`GOTRUE_EXTERNAL_*_REDIRECT_URI`** : URL de callback vers l'API Supabase (toujours `/auth/v1/callback`). C'est l'URL vers laquelle le provider OAuth (Google/Facebook) redirige après authentification.

4. **`redirectTo` dans le code frontend** : URL de l'application web vers laquelle Supabase redirige après avoir traité le callback OAuth.

## Flux OAuth

1. Utilisateur clique sur "Se connecter avec Facebook" dans Linaya
2. Redirection vers Facebook avec `redirect_uri=https://api.la-saint-quentinoise.fr/auth/v1/callback`
3. Facebook redirige vers `https://api.la-saint-quentinoise.fr/auth/v1/callback?code=...`
4. Supabase traite le callback et redirige vers `https://linaya.la-saint-quentinoise.fr/auth/callback` (vérifié dans `ADDITIONAL_REDIRECT_URLS`)
5. L'application Linaya détecte la session et redirige vers `/`

## Points importants

- ✅ `SITE_URL` peut être n'importe quelle application (généralement la principale)
- ✅ `ADDITIONAL_REDIRECT_URLS` doit contenir **toutes** les URLs de **toutes** les applications
- ✅ Chaque application spécifie son propre `redirectTo` dans le code
- ✅ `GOTRUE_EXTERNAL_*_REDIRECT_URI` pointe toujours vers l'API Supabase (`/auth/v1/callback`)
- ✅ `redirectTo` dans le code pointe vers l'application web (`/auth/callback`)

## Ajouter une nouvelle application

Pour ajouter une nouvelle application :

1. Ajoutez ses URLs à `ADDITIONAL_REDIRECT_URLS` dans `.env`
2. Redémarrez les conteneurs : `docker-compose down && docker-compose up -d`
3. Dans le code de la nouvelle application, utilisez `redirectTo: 'https://nouvelle-app.la-saint-quentinoise.fr/auth/callback'`

## Problème : Redirection vers la mauvaise application

Si `https://linaya.la-saint-quentinoise.fr/login` redirige vers `https://suivifinance.la-saint-quentinoise.fr/login`, vérifiez :

### ⚠️ Problème fréquent : docker-compose.override.yml

Si vous avez un fichier `docker-compose.override.yml`, il peut **écraser** la configuration `GOTRUE_URI_ALLOW_LIST` du `.env`.

**Vérifiez** si dans `docker-compose.override.yml`, la section `supabase-auth` redéfinit `GOTRUE_URI_ALLOW_LIST` :

```yaml
# ❌ MAUVAIS : Écrase la configuration du .env
supabase-auth:
  environment:
    GOTRUE_URI_ALLOW_LIST: >
      https://suivifinance.la-saint-quentinoise.fr,
      https://test.la-saint-quentinoise.fr
      # ⚠️ Linaya n'est pas dans cette liste !
```

**Solution** : Supprimez cette section de `docker-compose.override.yml` pour utiliser celle du `.env` :

```yaml
# ✅ BON : Laisse docker-compose.yml utiliser ${ADDITIONAL_REDIRECT_URLS}
supabase-auth:
  environment:
    API_EXTERNAL_URL: https://api.la-saint-quentinoise.fr
    # GOTRUE_URI_ALLOW_LIST est géré par docker-compose.yml via ${ADDITIONAL_REDIRECT_URLS}
```

### Autres causes possibles

### Vérification de la configuration Caddy

Vérifiez votre `Caddyfile` pour s'assurer que chaque domaine pointe vers le bon build :

```caddy
linaya.la-saint-quentinoise.fr {
    root * /srv/linaya-build
    file_server
    try_files {path} /index.html
}

suivifinance.la-saint-quentinoise.fr {
    root * /srv/suivifinance-build
    file_server
    try_files {path} /index.html
}
```

### Vérification des volumes Docker

Assurez-vous que les volumes dans `docker-compose.yml` pointent vers les bons répertoires :

```yaml
caddy:
  volumes:
    - /home/said/linaya/build:/srv/linaya-build
    - /home/said/suivifinance/build:/srv/suivifinance-build
```

### Vérification du build Linaya

Assurez-vous que le build de Linaya est à jour et dans le bon répertoire :

```bash
cd web
npm run build
# Vérifiez que les fichiers sont dans /home/said/linaya/build
```

### Redémarrage de Caddy

Après modification du Caddyfile :

```bash
docker-compose restart caddy
```

