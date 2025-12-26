# Configuration Supabase

## Variables d'environnement

Créez un fichier `.env` à la racine du projet avec vos identifiants Supabase :

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Où trouver ces valeurs ?

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez :
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Configuration OAuth

Pour activer Google et Facebook OAuth :

1. Allez dans **Authentication** > **Providers**
2. Activez **Google** et/ou **Facebook**
3. Configurez les credentials OAuth (Client ID, Secret)
4. Ajoutez les URLs de redirection :
   - Web : `https://your-domain.com/auth/callback`
   - Mobile : `linaya://auth/callback`

## Deep Links (Mobile)

Pour que les redirections OAuth fonctionnent sur mobile, configurez le scheme `linaya` dans `app.json` :

```json
{
  "expo": {
    "scheme": "linaya"
  }
}
```

## Test de l'authentification

Après configuration :
1. Lancez l'app : `npx expo start`
2. L'écran de connexion devrait s'afficher avec la vidéo en fond
3. Testez les boutons de connexion

