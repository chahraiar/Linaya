# 🔧 Correction du fichier .env

## ❌ Erreur détectée

Vous avez utilisé **deux underscores** (`VITE__`) au lieu d'**un seul** (`VITE_`).

## ✅ Correction

Dans votre fichier `web/.env`, remplacez :

**❌ INCORRECT (avec deux underscores) :**
```env
VITE__SUPABASE_URL=https://api.la-saint-quentinoise.fr
VITE__SUPABASE_ANON_KEY=ey00000000000..........
```

**✅ CORRECT (avec un seul underscore) :**
```env
VITE_SUPABASE_URL=https://api.la-saint-quentinoise.fr
VITE_SUPABASE_ANON_KEY=ey00000000000..........
```

## 📝 Étapes

1. Ouvrez le fichier `web/.env`
2. Remplacez `VITE__` par `VITE_` (un seul underscore après VITE)
3. Sauvegardez le fichier
4. **Redémarrez le serveur** :
   ```bash
   # Arrêtez avec Ctrl+C
   npm run dev
   ```

## 🔍 Vérification

Après redémarrage, dans la console du navigateur (F12), vous devriez voir :
- ✅ `URL: ✅ Set`
- ✅ `KEY: ✅ Set`

Si vous voyez toujours ❌, vérifiez que :
- Il n'y a qu'**un seul underscore** après `VITE_`
- Pas d'espaces autour du `=`
- Le fichier est bien dans `web/.env` (pas ailleurs)

