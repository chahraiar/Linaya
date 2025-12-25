# Dépannage - Erreurs courantes

## Erreur : "Failed to download remote update"

Cette erreur se produit généralement lors du chargement de l'application dans Expo Go.

### Solutions à essayer (dans l'ordre) :

#### 1. Vérifier la connexion réseau

- Assurez-vous que votre téléphone et votre ordinateur sont sur le **même réseau WiFi**
- Vérifiez que le pare-feu ne bloque pas la connexion
- Essayez de désactiver temporairement le VPN si vous en utilisez un

#### 2. Utiliser le mode Tunnel

Si vous êtes sur des réseaux différents ou si le WiFi pose problème :

```bash
npx expo start --tunnel
```

Le mode tunnel utilise les serveurs Expo pour router la connexion, ce qui peut résoudre les problèmes de réseau.

#### 3. Nettoyer les caches

```bash
# Nettoyer le cache Metro
npx expo start --clear

# Nettoyer complètement (cache + reset)
npx expo start --clear --reset-cache

# Supprimer manuellement le cache
rm -rf node_modules/.cache
rm -rf .expo
```

#### 4. Redémarrer Expo Go

- Fermez complètement l'application Expo Go
- Rouvrez Expo Go
- Scannez à nouveau le QR code

#### 5. Vérifier l'adresse IP

Assurez-vous que l'adresse IP affichée dans le terminal correspond à votre réseau local.

#### 6. Utiliser l'URL manuellement

Dans Expo Go :
1. Appuyez sur "Enter URL manually"
2. Entrez : `exp://[VOTRE_IP]:8081` (remplacez [VOTRE_IP] par l'IP affichée dans le terminal)

#### 7. Vérifier les ports

Assurez-vous que le port 8081 n'est pas bloqué par un autre processus.

#### 8. Réinstaller les dépendances

```bash
rm -rf node_modules
npm install
npx expo start --clear
```

### Si rien ne fonctionne

1. Vérifiez les logs dans le terminal pour plus de détails
2. Essayez avec un autre appareil pour isoler le problème
3. Vérifiez que votre version d'Expo Go est bien SDK 54

