# Linaya Web - Application Web d'Arbre Généalogique

Application web React pour visualiser et gérer des arbres généalogiques, version web de l'application mobile Linaya.

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation des dépendances

```bash
cd web
npm install
```

### Configuration

Créez un fichier `.env` à la racine du dossier `web` avec :

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Démarrage

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Build pour production

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`.

## 📦 Dépendances principales

- **React 18** - Framework UI
- **TypeScript** - Typage statique
- **Vite** - Build tool et dev server
- **React Router** - Navigation
- **Zustand** - State management
- **i18next** - Internationalisation (FR/EN)
- **Supabase** - Backend et authentification

## 🏗️ Structure

```
web/
├── src/
│   ├── features/
│   │   └── familyTree/    # Arbre généalogique (layout, renderer)
│   ├── screens/            # Écrans de l'application
│   ├── services/           # Services API (Supabase)
│   ├── store/              # State management (Zustand)
│   ├── lib/                # Configuration (Supabase)
│   └── i18n/               # Internationalisation
├── public/                 # Assets statiques
└── dist/                   # Build de production
```

## 🎨 Design

Le design s'inspire du site la-saint-quentinoise.fr avec :
- Couleurs modernes (noir/blanc avec accent indigo)
- Typographie claire
- Animations fluides
- Responsive design

## 🌍 Internationalisation

L'application supporte le français et l'anglais. La langue est persistée dans localStorage.

## ⚙️ Fonctionnalités

- **Authentification** : Connexion avec email/password ou Google OAuth
- **Visualisation de l'arbre** : Affichage interactif avec zoom et pan
- **Gestion des personnes** : Ajout, modification, suppression
- **Relations** : Gestion des relations parent/enfant/partenaire
- **Mode édition** : Déplacement manuel des cartes avec sauvegarde
- **Paramètres** : Langue, thème, etc.

## 🔧 Développement

### Linter

```bash
npm run lint
```

### Prévisualisation du build

```bash
npm run build
npm run preview
```

