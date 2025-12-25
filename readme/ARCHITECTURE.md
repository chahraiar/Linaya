# Architecture de l'application Linaya

## Structure des fichiers

```
Linaya/
├── App.tsx                          # Point d'entrée principal
├── package.json                     # Dépendances
├── tsconfig.json                    # Configuration TypeScript
├── babel.config.js                  # Configuration Babel (Reanimated)
├── app.json                         # Configuration Expo
│
└── src/
    ├── app/
    │   └── navigation.tsx           # Configuration React Navigation
    │
    ├── components/
    │   └── ui/                      # Composants Design System
    │       ├── Button.tsx
    │       ├── Card.tsx
    │       ├── IconButton.tsx
    │       ├── Screen.tsx
    │       ├── Spacer.tsx
    │       ├── Text.tsx
    │       └── index.ts
    │
    ├── design-system/
    │   ├── ThemeProvider.tsx        # Provider de thème
    │   ├── tokens/                   # Tokens de design
    │   │   ├── colors.ts
    │   │   ├── radius.ts
    │   │   ├── shadows.ts
    │   │   ├── spacing.ts
    │   │   ├── typography.ts
    │   │   └── index.ts
    │   └── themes/                   # Thèmes (Aurora, Graphite, Ivory)
    │       ├── types.ts
    │       ├── aurora.ts
    │       ├── graphite.ts
    │       ├── ivory.ts
    │       └── index.ts
    │
    ├── features/
    │   └── familyTree/              # Feature Arbre généalogique
    │       ├── types.ts              # Types TypeScript
    │       ├── layout.ts             # Algorithme de layout
    │       ├── TreeRenderer.tsx      # Composant de rendu SVG
    │       └── mockData.ts           # Données de test
    │
    ├── i18n/                        # Internationalisation
    │   ├── index.ts                 # Configuration i18next
    │   └── locales/
    │       ├── fr.json
    │       └── en.json
    │
    ├── screens/                     # Écrans de l'application
    │   ├── FamilyTreeScreen.tsx     # Écran principal
    │   ├── SettingsScreen.tsx        # Écran paramètres
    │   └── index.ts
    │
    └── store/                       # State management (Zustand)
        ├── settingsStore.ts         # Store des paramètres
        ├── familyTreeStore.ts       # Store de l'arbre
        └── index.ts
```

## Flux de données

### Initialisation
1. `App.tsx` charge les providers (GestureHandler, SafeArea, Theme)
2. `AppContent` initialise la langue depuis AsyncStorage
3. `ThemeProvider` charge le thème depuis le store Zustand
4. `AppNavigation` configure la navigation

### Écran Arbre Généalogique
1. `FamilyTreeScreen` charge les données depuis le store
2. `createClusters` organise les personnes en clusters
3. `TreeRenderer` rend l'arbre avec SVG
4. Gestes (pan, pinch, tap) gérés par Reanimated
5. Interactions (tap sur nœud) ouvrent une modal

### Paramètres
1. `SettingsScreen` lit/écrit dans `settingsStore`
2. Changements de thème → `ThemeProvider` se met à jour
3. Changements de langue → `i18n` se met à jour + AsyncStorage

## Design System

### Tokens
- **Colors** : Palette de base + couleurs par thème
- **Spacing** : xs, sm, md, lg, xl, xxl, xxxl
- **Radius** : none, xs, sm, md, lg, xl, full
- **Shadows** : none, sm, md, lg, xl, soft, floating
- **Typography** : Tailles, poids, hauteurs de ligne

### Thèmes
- **Aurora** : Dégradé froid (bleu/violet), glassmorphism prononcé
- **Graphite** : Sombre, minimaliste
- **Ivory** : Clair, chaleureux

### Composants UI
Tous les composants utilisent uniquement les tokens du Design System, garantissant la cohérence visuelle.

## State Management

### Zustand Stores
- **settingsStore** : Langue, thème, animations (persisté)
- **familyTreeStore** : Personnes, sélection (en mémoire)

## Internationalisation

- **i18next** avec **react-i18next**
- Langues : FR (par défaut), EN
- Tous les libellés dans les fichiers JSON
- Persistance dans AsyncStorage

## Animations

- **React Native Reanimated** pour les animations performantes
- Gestes gérés par **React Native Gesture Handler**
- Paramètre "Réduire animations" pour ajuster les performances

## Rendu de l'arbre

- **React Native SVG** pour le rendu
- Layout hiérarchique simple (pas de force-directed)
- Clusters séparés pour différentes familles
- Zoom/pan fluides avec transformations SVG

