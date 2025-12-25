# Support Web - Problème connu

## ❌ État actuel : Web ne fonctionne pas

L'application **ne peut pas fonctionner sur le web** avec Expo SDK 54 à cause d'une erreur `import.meta` qui ne peut pas être résolue avec les outils actuels.

## 🔍 Cause du problème

- Expo SDK 54 utilise un nouveau système de bundling pour le web
- Certaines dépendances (ou Expo lui-même) utilisent `import.meta`
- Metro/Babel ne transforme pas correctement `import.meta` pour le web
- C'est un problème connu d'Expo SDK 54

## ✅ Solution : Utiliser le mobile

**L'application fonctionne parfaitement sur mobile** après avoir vidé le cache d'Expo Go.

### Pour tester sur mobile

1. **Démarrer le serveur** :
   ```bash
   npm start
   ```

2. **Vider le cache d'Expo Go** sur votre téléphone :
   - **Android** : Paramètres → Apps → Expo Go → Stockage → Effacer les données
   - **iOS** : Désinstaller et réinstaller Expo Go depuis l'App Store

3. **Scanner le QR code** avec Expo Go

4. **L'application devrait fonctionner** ! 🎉

## 🔄 Alternatives pour le web (futur)

### Option 1 : Attendre une mise à jour Expo
Expo SDK 54 est récent et ce problème sera probablement corrigé dans une future version.

### Option 2 : Development Build
Créer un Development Build personnalisé, mais cela nécessite plus de configuration.

### Option 3 : Revenir à Expo SDK 51
Possible mais créerait une incompatibilité avec Expo Go SDK 54 (nécessiterait d'installer Expo Go SDK 51).

## 📱 Recommandation finale

**Se concentrer sur le mobile** :
- ✅ L'application fonctionne parfaitement
- ✅ Meilleure expérience utilisateur (gestes tactiles, etc.)
- ✅ Pas de problèmes de compatibilité
- ✅ L'app a été conçue pour mobile de toute façon

Le support web peut être ajouté plus tard quand Expo SDK 54 sera plus stable.

