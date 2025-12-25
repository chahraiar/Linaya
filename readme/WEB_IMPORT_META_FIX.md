# Fix pour l'erreur import.meta sur le web

## Problème

L'erreur `Uncaught SyntaxError: import.meta may only appear in a module` survient avec Expo SDK 54 sur le web. Cette erreur vient généralement de dépendances qui utilisent la syntaxe `import.meta` (comme zustand 4.5.2+).

## Solution appliquée

**Downgrade de zustand** : Version 4.4.7 installée (au lieu de 4.5.2) qui n'utilise pas `import.meta`.

## Si le problème persiste

### Option 1 : Utiliser une version encore plus ancienne
```bash
npm install zustand@4.3.9 --save
```

### Option 2 : Se concentrer sur le mobile
Le problème `import.meta` est spécifique au web. Pour le mobile :
- Le problème Worklets peut être résolu en vidant le cache d'Expo Go
- L'application fonctionne parfaitement sur mobile

### Option 3 : Attendre une mise à jour
Expo SDK 54 est récent et certains problèmes de compatibilité web peuvent être résolus dans les prochaines versions.

## Vérification

Après le redémarrage, vérifiez :
1. La console du navigateur (F12)
2. Si l'erreur `import.meta` persiste
3. Si l'application se charge correctement

