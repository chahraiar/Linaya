# Assets

Ce dossier contient les assets de l'application web Linaya.

## Structure

Les assets sont organisés dans `web/assets/` et peuvent être importés directement dans le code TypeScript/React via Vite.

## Fichiers disponibles

### Vidéos
- **famille.mp4** - Vidéo de fond pour l'écran de connexion

### Images
- **favicon.png** (48x48) - Favicon pour la version web
- **icon.png** (1024x1024) - Icône principale de l'application
- **adaptive-icon.png** - Icône adaptative pour Android
- **splash.png** - Image de splash screen
- **logo-google-48.png** (48x48) - Logo Google pour les boutons OAuth
- **logo-facebook-48.png** (48x48) - Logo Facebook pour les boutons OAuth
- **Linaya.jpg** - Image de marque Linaya
- **Linaya2.png** - Image de marque Linaya (variante)

## Utilisation dans le code

### Import d'assets

```typescript
// Import d'une image
import logoGoogle from '../../assets/logo-google-48.png';
import logoFacebook from '../../assets/logo-facebook-48.png';

// Import d'une vidéo
import familleVideo from '../../assets/famille.mp4';

// Utilisation dans le JSX
<img src={logoGoogle} alt="Google" />
<video src={familleVideo} autoPlay loop muted />
```

### Favicon

Le favicon doit être copié dans `web/public/` pour être accessible à la racine du site. Il est référencé dans `web/index.html` :

```html
<link rel="icon" type="image/png" href="/favicon.png" />
```

**Note** : Le fichier source reste dans `web/assets/favicon.png`, mais une copie doit être dans `web/public/favicon.png` pour que Vite le serve correctement.

## Configuration Vite

Avec Vite, les assets dans `web/assets/` sont automatiquement traités :
- Les imports sont résolus et les fichiers sont copiés dans le build
- Les noms de fichiers sont hashés en production pour le cache busting
- Les images sont optimisées automatiquement

## Formats recommandés

- **Images** : PNG pour les logos avec transparence, JPG pour les photos
- **Vidéos** : MP4 (H.264) pour la compatibilité maximale
- **Icônes** : PNG 48x48 minimum pour le favicon, 1024x1024 pour l'icône principale

## Notes

- Les assets sont servis depuis `/assets/` en production
- En développement, Vite sert les assets directement depuis le dossier source
- Les imports d'assets retournent l'URL publique du fichier
