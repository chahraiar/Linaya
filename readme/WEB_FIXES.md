# Corrections pour la compatibilité Web

## Problèmes résolus

### 1. GestureHandlerRootView
- **Problème** : `GestureHandlerRootView` n'est pas compatible web
- **Solution** : Utilisation conditionnelle de `View` sur web, `GestureHandlerRootView` sur natif

### 2. Gestes tactiles
- **Problème** : `GestureDetector` et les gestes ne fonctionnent pas bien sur web
- **Solution** : Désactivation des gestes sur web (le canvas reste visible mais sans interactions de zoom/pan)

### 3. AsyncStorage
- **Problème** : AsyncStorage peut avoir des problèmes sur web
- **Solution** : Utilitaire de stockage cross-platform qui utilise `localStorage` sur web

## Fichiers modifiés

- `App.tsx` : Utilisation conditionnelle de View/GestureHandlerRootView
- `src/screens/FamilyTreeScreen.tsx` : Gestes désactivés sur web
- `src/utils/storage.ts` : Nouveau utilitaire de stockage cross-platform
- `src/i18n/index.ts` : Utilisation du nouveau storage
- `src/store/settingsStore.ts` : Utilisation du nouveau storage

## Limitations sur Web

- **Gestes** : Zoom/pan/double-tap ne fonctionnent pas (mais l'arbre est visible)
- **Performance** : Peut être légèrement différente
- **Certaines animations** : Peuvent différer

## Test

L'application devrait maintenant fonctionner dans le navigateur. Ouvrez la console du navigateur (F12) pour voir d'éventuelles erreurs restantes.

