# Instructions d'installation

## Commandes à exécuter

```bash
# Installer les dépendances
npm install

# OU avec yarn
yarn install

# Démarrer l'application
npm start

# OU (utilise le CLI local Expo)
npx expo start
```

## Dépendances spécifiques Expo

Si certaines dépendances nécessitent une configuration Expo spécifique, exécutez :

```bash
npx expo install expo-blur expo-linear-gradient
```

## Configuration Reanimated

Le plugin Reanimated est déjà configuré dans `babel.config.js`. Si vous rencontrez des problèmes avec les animations, vérifiez que le plugin est bien présent.

## Premier lancement

1. Installez Expo Go sur votre téléphone (iOS ou Android)
2. Lancez `npm start`
3. Scannez le QR code avec Expo Go
4. L'application devrait se charger avec le dataset mock

## Notes

- Les paramètres (langue, thème) sont persistés dans AsyncStorage
- Le dataset mock est chargé automatiquement au premier lancement
- Les animations peuvent être réduites dans les paramètres

