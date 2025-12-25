# Résoudre "Failed to download remote update"

## 🔴 Erreur
```
Uncaught Error: java.io.IOException: Failed to download remote update
```

Cette erreur indique que votre téléphone ne peut pas télécharger le bundle depuis votre ordinateur.

## ✅ Solutions (essayer dans l'ordre)

### Solution 1 : Mode Tunnel (RECOMMANDÉ)

Le mode tunnel utilise les serveurs Expo pour router la connexion, ce qui résout la plupart des problèmes de réseau.

```bash
npx expo start --tunnel
```

Puis scannez le **nouveau QR code** qui apparaît.

### Solution 2 : Vérifier le réseau WiFi

1. **Assurez-vous** que votre téléphone et votre ordinateur sont sur le **même réseau WiFi**
2. **Désactivez le VPN** si vous en utilisez un
3. **Vérifiez le pare-feu** Windows qui pourrait bloquer le port 8081

### Solution 3 : Entrer l'URL manuellement

Dans Expo Go :
1. Appuyez sur **"Enter URL manually"**
2. Entrez : `exp://[IP_DE_VOTRE_ORDINATEUR]:8081`
   - Remplacez `[IP_DE_VOTRE_ORDINATEUR]` par l'adresse IP affichée dans le terminal Expo
   - Exemple : `exp://192.168.1.100:8081`

### Solution 4 : Redémarrer Expo Go

1. **Fermez complètement** Expo Go (pas seulement en arrière-plan)
2. **Rouvrez** Expo Go
3. **Scannez le QR code** à nouveau

### Solution 5 : Nettoyer et redémarrer

```bash
# Arrêter le serveur (Ctrl+C)
# Puis :
npx expo start --clear --tunnel
```

## 🎯 Solution la plus efficace

**Le mode tunnel** (`--tunnel`) résout généralement le problème immédiatement car il ne dépend pas de votre réseau local.

## 📱 Après avoir résolu la connexion

Si vous voyez ensuite l'erreur **Worklets**, suivez les instructions dans [FIX_WORKLETS_ERROR.md](FIX_WORKLETS_ERROR.md) pour vider le cache d'Expo Go.

