# 🔧 Création du fichier .env

## Problème
Le fichier `.env` n'existe pas dans le dossier `web/`, ce qui cause l'erreur "NetworkError".

## Solution

### Étape 1 : Créer le fichier .env

Créez un fichier nommé `.env` dans le dossier `web/` (à la racine du projet web, pas à la racine du projet principal).

### Étape 2 : Ajouter les variables

Ouvrez le fichier `.env` et ajoutez ces lignes (remplacez par vos vraies valeurs) :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Étape 3 : Si vous avez un .env de l'app mobile

Si vous avez un fichier `.env` à la racine du projet (pour l'app mobile), vous pouvez copier les valeurs mais **changez les préfixes** :

**Format mobile (Expo) :**
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

**Format web (Vite) - à mettre dans web/.env :**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### Étape 4 : Redémarrer le serveur

**IMPORTANT** : Après avoir créé ou modifié le fichier `.env`, vous devez **redémarrer** le serveur de développement :

1. Arrêtez le serveur (Ctrl+C)
2. Redémarrez : `npm run dev`

Vite ne charge les variables d'environnement qu'au démarrage !

## Vérification

Après redémarrage, ouvrez la console du navigateur (F12) et vous devriez voir :
- ✅ `URL: ✅ Set`
- ✅ `KEY: ✅ Set`

Si vous voyez toujours ❌, vérifiez :
1. Le fichier est bien dans `web/.env` (pas `web/web/.env`)
2. Les variables commencent par `VITE_` (pas `EXPO_PUBLIC_`)
3. Pas d'espaces autour du `=`
4. Le serveur a été redémarré

