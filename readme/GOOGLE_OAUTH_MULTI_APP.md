# Configuration Google OAuth pour plusieurs applications

## Vue d'ensemble

Vous pouvez utiliser la **même configuration Google OAuth** pour plusieurs applications (SuiviFinance, Linaya, etc.) qui partagent la même instance Supabase.

## Configuration actuelle

### Backend (Supabase) - ✅ Déjà configuré

Dans votre `.env` :
```env
GOOGLE_CLIENT_ID=votre-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=votre-google-client-secret
GOOGLE_REDIRECT_URI=https://api.la-saint-quentinoise.fr/auth/v1/callback
```

Cette configuration est **partagée** entre toutes les applications car elles utilisent la même instance Supabase.

### Frontend (Code) - ✅ Déjà configuré

Le code utilise `window.location.origin` pour s'adapter automatiquement au domaine :

```typescript
// Dans LoginScreen.tsx
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

- Sur `suivifinance.la-saint-quentinoise.fr` → `redirectTo: 'https://suivifinance.la-saint-quentinoise.fr/auth/callback'`
- Sur `linaya.la-saint-quentinoise.fr` → `redirectTo: 'https://linaya.la-saint-quentinoise.fr/auth/callback'`

## ⚠️ Action requise : Google Cloud Console

Vous devez ajouter les URLs de Linaya dans la configuration Google OAuth de votre projet Google Cloud.

### 1. Accéder à Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID** (celui utilisé par SuiviFinance)

### 2. Ajouter les Origines JavaScript autorisées

Dans la section **"Origines JavaScript autorisées"**, ajoutez :

```
https://linaya.la-saint-quentinoise.fr
```

**Liste complète après ajout :**
```
URI 1: https://suivifinance.la-saint-quentinoise.fr
URI 2: https://test.la-saint-quentinoise.fr
URI 3: http://localhost:3000
URI 4: http://dev.suivifinance.local.fr:3000
URI 5: https://api.la-saint-quentinoise.fr
URI 6: https://linaya.la-saint-quentinoise.fr  ← NOUVEAU
```

### 3. Ajouter les URI de redirection autorisés

Dans la section **"URI de redirection autorisés"**, ajoutez :

```
https://linaya.la-saint-quentinoise.fr/auth/callback
```

**Liste complète après ajout :**
```
URI 1: https://auth.expo.io/@cccadamccc/suivifinance/--/oauth2redirect/google
URI 2: https://suivifinance.la-saint-quentinoise.fr/auth/callback
URI 3: http://dev.suivifinance.local.fr:3000/auth/callback
URI 4: https://test.la-saint-quentinoise.fr/auth/callback
URI 5: https://api.la-saint-quentinoise.fr/auth/v1/callback
URI 6: https://wagpdjkansavtejovjrq.supabase.co/auth/v1/callback
URI 7: https://linaya.la-saint-quentinoise.fr/auth/callback  ← NOUVEAU
```

### 4. Sauvegarder

Cliquez sur **"Enregistrer"** en bas de la page.

## Vérification de la configuration

### Backend (Supabase)

Vérifiez que dans votre `.env` :
- ✅ `GOOGLE_CLIENT_ID` est défini
- ✅ `GOOGLE_CLIENT_SECRET` est défini
- ✅ `GOOGLE_REDIRECT_URI=https://api.la-saint-quentinoise.fr/auth/v1/callback`
- ✅ `ADDITIONAL_REDIRECT_URLS` contient `https://linaya.la-saint-quentinoise.fr/auth/callback`

### Frontend (Code)

Le code est déjà correct, il utilise `window.location.origin` automatiquement.

### Google Cloud Console

- ✅ `https://linaya.la-saint-quentinoise.fr` est dans les **Origines JavaScript autorisées**
- ✅ `https://linaya.la-saint-quentinoise.fr/auth/callback` est dans les **URI de redirection autorisés**

## Flux OAuth pour Linaya

1. Utilisateur clique sur "Se connecter avec Google" sur `linaya.la-saint-quentinoise.fr`
2. Redirection vers Google avec `redirect_uri=https://api.la-saint-quentinoise.fr/auth/v1/callback`
3. Google redirige vers `https://api.la-saint-quentinoise.fr/auth/v1/callback?code=...`
4. Supabase traite le callback et redirige vers `https://linaya.la-saint-quentinoise.fr/auth/callback` (vérifié dans `ADDITIONAL_REDIRECT_URLS`)
5. L'application Linaya détecte la session et redirige vers `/`

## Avantages de cette configuration

✅ **Une seule configuration Google OAuth** pour toutes les applications
✅ **Pas de duplication** de `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`
✅ **Code frontend identique** pour toutes les applications (utilise `window.location.origin`)
✅ **Facile à maintenir** : ajouter une nouvelle app = ajouter ses URLs dans Google Cloud Console

## Ajouter une nouvelle application

Pour ajouter une nouvelle application (ex: `nouvelle-app.la-saint-quentinoise.fr`) :

1. **Google Cloud Console** :
   - Ajouter `https://nouvelle-app.la-saint-quentinoise.fr` dans **Origines JavaScript autorisées**
   - Ajouter `https://nouvelle-app.la-saint-quentinoise.fr/auth/callback` dans **URI de redirection autorisés**

2. **Backend (.env)** :
   - Ajouter `https://nouvelle-app.la-saint-quentinoise.fr/auth/callback` dans `ADDITIONAL_REDIRECT_URLS`

3. **Frontend** :
   - Aucune modification nécessaire si le code utilise `window.location.origin`

4. **Redémarrer** :
   ```bash
   docker-compose restart supabase-auth
   ```

## Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection n'est pas dans la liste Google Cloud Console.

**Solution** : Vérifiez que `https://linaya.la-saint-quentinoise.fr/auth/callback` est bien dans les **URI de redirection autorisés**.

### Erreur : "origin_mismatch"

**Cause** : L'origine JavaScript n'est pas autorisée.

**Solution** : Vérifiez que `https://linaya.la-saint-quentinoise.fr` est bien dans les **Origines JavaScript autorisées**.

### Redirection vers SuiviFinance au lieu de Linaya

**Cause** : `ADDITIONAL_REDIRECT_URLS` ne contient pas l'URL de Linaya, ou `docker-compose.override.yml` écrase la configuration.

**Solution** : 
1. Vérifiez que `ADDITIONAL_REDIRECT_URLS` contient `https://linaya.la-saint-quentinoise.fr/auth/callback`
2. Vérifiez que `docker-compose.override.yml` ne redéfinit pas `GOTRUE_URI_ALLOW_LIST`
3. Redémarrez : `docker-compose restart supabase-auth`

