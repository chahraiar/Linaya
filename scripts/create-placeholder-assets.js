/**
 * Crée des fichiers PNG placeholder basiques pour le développement
 * Utilise un PNG minimal valide (1x1 pixel transparent)
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// PNG minimal valide (1x1 pixel transparent) en base64
// Ce PNG est valide et peut être lu par tous les outils
const minimalPNGBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const createMinimalPNG = () => {
  return Buffer.from(minimalPNGBase64, 'base64');
};

const assets = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'];

console.log('📦 Création des fichiers PNG placeholder...\n');

assets.forEach((asset) => {
  const filePath = path.join(assetsDir, asset);
  try {
    const png = createMinimalPNG();
    fs.writeFileSync(filePath, png);
    console.log(`✅ Créé: ${asset}`);
  } catch (error) {
    console.error(`❌ Erreur pour ${asset}:`, error.message);
  }
});

console.log('\n✨ Assets placeholder créés !');
console.log('💡 Remplacez ces fichiers par de vrais assets pour la production.\n');
