# Linaya - Arbre Généalogique

Application mobile React Native moderne pour visualiser et gérer des arbres généalogiques avec un design premium (glassmorphism, gradients, animations fluides).

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- **Note** : Pas besoin d'installer Expo CLI globalement, utilisez `npx expo` (inclus dans le projet)
- Expo Go SDK 54 sur votre téléphone (iOS/Android)

### Installation des dépendances

```bash
npm install
```

### Démarrage

```bash
npm start
```

Puis :
- Scannez le QR code avec **Expo Go** sur votre téléphone
- Si erreur Worklets : Videz le cache d'Expo Go (voir [EXPO_GO.md](EXPO_GO.md))

⚠️ **Note** : Le support web a des limitations avec Expo SDK 54 (voir [WEB_NOT_WORKING.md](WEB_NOT_WORKING.md))

## 📦 Dépendances principales

- **React Native** + **Expo** - Framework mobile
- **TypeScript** - Typage statique
- **React Navigation** - Navigation entre écrans
- **React Native Gesture Handler** - Gestes tactiles
- **React Native Reanimated** - Animations performantes
- **React Native SVG** - Rendu de l'arbre généalogique
- **Zustand** - State management léger
- **i18next** - Internationalisation (FR/EN)
- **Expo Blur** - Effets de flou (glassmorphism)
- **Expo Linear Gradient** - Dégradés

## 🏗️ Architecture

```
src/
├── app/              # Navigation
├── components/       # Composants UI réutilisables
│   └── ui/          # Design System components
├── design-system/    # Tokens, thèmes, typographie
│   ├── tokens/      # Colors, spacing, radius, shadows, typography
│   └── themes/      # Aurora, Graphite, Ivory
├── features/         # Features métier
│   └── familyTree/  # Arbre généalogique (layout, renderer, types)
├── i18n/            # Internationalisation
│   └── locales/    # Traductions FR/EN
├── screens/         # Écrans de l'application
└── store/           # State management (Zustand)
```

## 🎨 Design System

L'application utilise un Design System complet avec :

- **3 thèmes** : Aurora (dégradé froid), Graphite (sombre), Ivory (clair)
- **Tokens** : Couleurs, espacements, rayons, ombres, typographie
- **Composants UI** : Button, Card, Text, IconButton, Screen, Spacer
- **Glassmorphism** : Effets de flou et transparence
- **Animations** : Configurables (peuvent être réduites dans les paramètres)

## 🌍 Internationalisation

L'application supporte le français et l'anglais. La langue est persistée dans AsyncStorage.

## ⚙️ Paramètres

Accessibles depuis l'icône en haut à droite de l'écran principal :

- **Langue** : FR/EN
- **Thème** : Aurora/Graphite/Ivory
- **Réduire les animations** : Toggle pour désactiver les animations

## 📱 Fonctionnalités

### Écran Arbre Généalogique

- **Visualisation** : Plusieurs clusters de familles avec nœuds et liens
- **Gestes** :
  - **Pinch to zoom** : Zoom avant/arrière
  - **Pan** : Déplacer l'arbre
  - **Double tap** : Zoom/dézoom rapide
  - **Long press** : Menu contextuel pour ajouter une personne
- **Interactions** :
  - Tap sur un nœud : Affiche les détails de la personne
  - Bouton "+" : Ajouter une nouvelle personne
  - Recherche : Champ de recherche (à implémenter)

### Dataset Mock

L'application inclut un dataset de test avec 15 personnes réparties en 3 familles :
- Famille Martin (6 personnes)
- Famille Bernard (6 personnes)
- Famille Petit (3 personnes)

## 🔧 Configuration

### Babel

Le fichier `babel.config.js` inclut le plugin Reanimated nécessaire pour les animations.

### TypeScript

Configuration stricte activée dans `tsconfig.json`.

## 📝 Notes de développement

- Les valeurs animées sont synchronisées avec le state React via `useAnimatedReaction`
- Le layout de l'arbre utilise un algorithme hiérarchique simple
- Les nœuds sont rendus avec SVG pour de meilleures performances
- Le glassmorphism est appliqué via `expo-blur`

## 🚧 Améliorations futures

- [ ] Recherche fonctionnelle
- [ ] Ajout/édition de personnes
- [ ] Export/import de données
- [ ] Photos de profil
- [ ] Partage de l'arbre
- [ ] Synchronisation cloud

## 📄 Licence

MIT

