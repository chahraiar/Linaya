# Test avec Expo Go

## ✅ Compatibilité Expo Go

**Oui, vous pouvez tester l'application avec Expo Go !** 

Toutes les dépendances utilisées sont compatibles avec Expo Go :

- ✅ **expo-blur** - Effets de flou (glassmorphism)
- ✅ **expo-linear-gradient** - Dégradés
- ✅ **react-native-svg** - Rendu SVG de l'arbre
- ✅ **react-native-reanimated** - Animations (avec plugin Babel configuré)
- ✅ **react-native-gesture-handler** - Gestes tactiles
- ✅ **@react-navigation/native** - Navigation
- ✅ **@react-native-async-storage/async-storage** - Stockage local

## 🚀 Comment tester

### 1. Installer Expo Go sur votre téléphone

- **iOS** : [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- **Android** : [Google Play - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. Démarrer le serveur de développement

```bash
npm start
```

ou

```bash
npx expo start
```

**Important** : Utilisez `npx expo` au lieu de l'ancien `expo-cli` global (déprécié).

### 3. Scanner le QR code

- **iOS** : Ouvrez l'appareil photo et scannez le QR code, puis ouvrez dans Expo Go
- **Android** : Ouvrez Expo Go et utilisez l'option "Scan QR code"

### 4. Alternative : Tunnel

Si vous êtes sur le même réseau WiFi :

```bash
npx expo start --tunnel
```

## ⚠️ Notes importantes

- **Premier lancement** : Le chargement initial peut prendre quelques secondes
- **Hot Reload** : Les modifications de code se rechargent automatiquement
- **Performance** : Expo Go peut être légèrement plus lent qu'un build natif, mais toutes les fonctionnalités fonctionnent
- **Réseau** : Assurez-vous que votre téléphone et votre ordinateur sont sur le même réseau WiFi (ou utilisez le tunnel)

## 🔧 Dépannage

### L'application ne se charge pas

1. Vérifiez que vous êtes sur le même réseau WiFi
2. Essayez `npx expo start --tunnel`
3. Redémarrez Expo Go
4. Vérifiez les logs dans le terminal

### Les animations ne fonctionnent pas

1. Vérifiez que `babel.config.js` contient le plugin Reanimated
2. Redémarrez le serveur Expo (`npm start` ou `npx expo start`)
3. Rechargez l'application dans Expo Go (shake device → Reload)

### Erreurs de modules

Si vous voyez des erreurs de modules manquants :

```bash
# Réinstaller les dépendances
rm -rf node_modules
npm install

# Redémarrer
npm start
```

## 📱 Build de production

Pour un build de production (APK/IPA), vous devrez utiliser :

- **EAS Build** (Expo Application Services) - Recommandé
- **Expo Build** (déprécié, utilisez EAS)

Mais pour le développement et les tests, **Expo Go est parfait** ! 🎉

