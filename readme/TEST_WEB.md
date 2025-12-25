# Tester l'application dans le navigateur

## Avantages du test web

- ✅ Pas de problème Worklets (spécifique au natif)
- ✅ Débogage plus facile avec les DevTools
- ✅ Hot reload rapide
- ✅ Pas besoin d'Expo Go

## Lancer l'application web

```bash
npx expo start --web
```

Ou avec cache vidé :

```bash
npx expo start --web --clear
```

L'application s'ouvrira automatiquement dans votre navigateur à `http://localhost:8081` (ou un autre port si 8081 est occupé).

## Limitations du web

Certaines fonctionnalités peuvent ne pas fonctionner exactement comme sur mobile :

- **Gestes tactiles** : Les gestes (pinch, pan) peuvent être simulés avec la souris/trackpad
- **Performance** : Peut être légèrement différente
- **SVG** : Devrait fonctionner normalement

## Fonctionnalités testables

✅ Design System (thèmes, composants UI)
✅ Navigation entre écrans
✅ Internationalisation (FR/EN)
✅ Settings (changement de thème, langue)
✅ Arbre généalogique (visualisation)
✅ Modals et interactions

## Résoudre le problème Worklets sur mobile

Le problème Worklets est spécifique au natif (Expo Go). Pour le résoudre :

1. **Vider le cache d'Expo Go** sur votre téléphone (recommandé)
2. Attendre une mise à jour d'Expo Go compatible
3. Utiliser un Development Build personnalisé

En attendant, le test web permet de développer et tester toutes les fonctionnalités sans ce problème.


# notes
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

cd D:\Dev\Linaya && npx expo start --web --clear

cd D:\Dev\Linaya && npx expo start --tunnel --clear
