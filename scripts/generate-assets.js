/**
 * Script pour générer des assets placeholder pour le développement
 * Ces assets peuvent être remplacés plus tard par de vrais designs
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Créer le dossier assets s'il n'existe pas
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Pour le développement, on va créer des fichiers texte qui indiquent qu'il faut les remplacer
// En production, vous devrez créer de vrais fichiers PNG

const assets = [
  { name: 'icon.png', note: '1024x1024 PNG - Icône de l\'application' },
  { name: 'splash.png', note: '1284x2778 PNG - Écran de démarrage' },
  { name: 'adaptive-icon.png', note: '1024x1024 PNG - Icône adaptative Android' },
  { name: 'favicon.png', note: '48x48 PNG - Favicon web' },
];

console.log('📦 Génération des placeholders pour les assets...\n');

assets.forEach((asset) => {
  const filePath = path.join(assetsDir, asset.name);
  if (!fs.existsSync(filePath)) {
    // Créer un fichier README dans assets pour indiquer ce qu'il faut
    console.log(`⚠️  ${asset.name} manquant - ${asset.note}`);
  }
});

// Créer un README dans assets
const readmePath = path.join(assetsDir, 'README.md');
const readmeContent = `# Assets

Ce dossier contient les assets de l'application.

## Fichiers requis

- **icon.png** (1024x1024) - Icône principale de l'application
- **splash.png** (1284x2778) - Écran de démarrage
- **adaptive-icon.png** (1024x1024) - Icône adaptative pour Android
- **favicon.png** (48x48) - Favicon pour la version web

## Pour le développement

Pour le développement avec Expo Go, ces fichiers peuvent être des placeholders.
Pour un build de production, vous devrez créer de vrais assets.

## Génération d'assets

Vous pouvez utiliser des outils comme :
- [App Icon Generator](https://www.appicon.co/)
- [Expo Asset Generator](https://github.com/expo/expo-cli)
- Design tools (Figma, Sketch, etc.)
`;

fs.writeFileSync(readmePath, readmeContent);
console.log('\n✅ README créé dans assets/');
console.log('\n💡 Pour le développement, vous pouvez créer des fichiers PNG simples (même 1x1 pixel)');
console.log('   ou utiliser des outils en ligne pour générer les assets.\n');

