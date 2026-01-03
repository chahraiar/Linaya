# Configuration des variables d'environnement

## ⚠️ Important : Format des variables

**Vite utilise le préfixe `VITE_` et non `EXPO_PUBLIC_`**

Si vous avez copié le fichier `.env` de l'application mobile, vous devez le convertir :

### Format pour l'app mobile (Expo)
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Format pour l'app web (Vite)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 📝 Création du fichier .env

1. Créez un fichier `.env` dans le dossier `web/`
2. Ajoutez les variables avec le préfixe `VITE_` :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Redémarrez le serveur de développement :
```bash
npm run dev
```

## 🔍 Vérification

Ouvrez la console du navigateur (F12) et vérifiez les logs :
- ✅ `URL: ✅ Set` et `KEY: ✅ Set` = Configuration correcte
- ❌ `URL: ❌ Missing` ou `KEY: ❌ Missing` = Problème de configuration

## 🚨 Erreur "NetworkError"

Si vous voyez "NetworkError when attempting to fetch resource", cela signifie généralement :
1. Les variables d'environnement ne sont pas chargées (mauvais préfixe)
2. Le fichier `.env` n'est pas au bon endroit (doit être dans `web/`)
3. Le serveur de développement n'a pas été redémarré après la création/modification du `.env`

**Solution** : Vérifiez le format des variables et redémarrez `npm run dev`

