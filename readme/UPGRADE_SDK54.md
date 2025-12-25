# Mise à jour vers Expo SDK 54

## Problème
Votre Expo Go est en version SDK 54, mais le projet utilise SDK 51.

## Solution : Mettre à jour le projet vers SDK 54

### Étape 1 : Mettre à jour Expo

```bash
npm install expo@~54.0.0
```

### Étape 2 : Mettre à jour toutes les dépendances

```bash
npx expo install --fix
```

Cette commande mettra automatiquement à jour toutes les dépendances Expo (expo-blur, expo-linear-gradient, etc.) vers les versions compatibles avec SDK 54.

### Étape 3 : Vérifier les problèmes

```bash
npx expo-doctor
```

### Étape 4 : Redémarrer le serveur

```bash
npm start
```

## Alternative : Utiliser Expo Go SDK 51

Si vous préférez ne pas mettre à jour le projet, vous pouvez installer Expo Go SDK 51 :

- **Android** : Téléchargez depuis https://expo.dev/go
- **iOS** : Seule la dernière version est disponible sur l'App Store (SDK 54)

⚠️ **Recommandation** : Il est préférable de mettre à jour le projet vers SDK 54 pour bénéficier des dernières fonctionnalités et corrections.

