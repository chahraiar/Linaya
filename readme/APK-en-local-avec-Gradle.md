# Génération d'un APK Android en local avec Gradle

## Se placer à la racine du projet
cd d:\Dev\Linaya

## Vérifier la configuration NDK
Assurez-vous que la version NDK dans `android/local.properties` correspond à celle définie dans le projet (27.1.12297006).

## Nettoyer le cache Gradle (si problèmes de compilation)
```powershell
# Arrêter les démons Gradle en cours d'exécution
.\android\gradlew.bat --stop

# Supprimer le cache des transformations Gradle (si erreurs de metadata.bin)
Remove-Item -Path "C:\Users\chahr\.gradle\caches\8.10.2\transforms" -Recurse -Force -ErrorAction SilentlyContinue
```
----------------------------------------------
## Nettoyer le projet 
----------------------------------------------
```powershell
.\android\gradlew.bat --stop
.\android\gradlew.bat clean -p android --no-daemon

```

## Générer un APK de debug
```powershell
.\android\gradlew.bat assembleDebug -p android --no-daemon
```

## Localiser l'APK généré
L'APK de debug se trouve dans le dossier :
`android/app/build/outputs/apk/debug/app-debug.apk`

----------------------------------------------
## OU pour générer un APK de release (nécessite une configuration de signature) 
----------------------------------------------
.\android\gradlew.bat assembleRelease -p android

## Une fois la commande exécutée, les APK générés sont dans les dossiers suivants :

Version debug : android\app\build\outputs\apk\debug\app-debug.apk
Version release : android\app\build\outputs\apk\release\app-release.apk

Version release : d:\Dev\Linaya\android\app\build\outputs\apk\release\app-release.apk

----------------------------------------------
# Pour créer un bundle Android (AAB) pour le Google Play Store plutôt qu'un APK :
----------------------------------------------
.\android\gradlew.bat bundleRelease -p android


----------------------------------------------
# C'est quoi cette façon de créer l'APK
----------------------------------------------
pwsh -c "cd D:\Dev\Linaya\android; .\gradlew.bat :app:clean :app:assembleRelease | Out-Host"
NOK

# sionon
.\android\gradlew.bat clean -p android --no-daemon
.\android\gradlew.bat :app:assembleRelease -p android --no-daemon


# Scanner l’APK dézippé pour ALIGN 0x4000:
pwsh -File .\scripts\verify-so-align.ps1 -ApkUnzippedPath "D:\Dev\Linaya\android\app\build\outputs\apk\release\app-release" -NdkRoot "C:\Users\chahr\AppData\Local\Android\Sdk\ndk\28.0.12674087"

----------------------------------------------
----------------------------------------------
## Mobile: relancer l'application avec le cache vidé 
npx expo start --clear --reset-cache

## Web : relancer l'application
npm start --clear-cache


----------------------------------------------
----------------------------------------------
git add . && git commit -m "Le message" && git push
v11 (1.0.11) :
git add . && git commit -m "fix: corriger l'affichage des catégories dans EditTransactionPeriodiqueScreen" && git push
v12 (1.0.12) :
git add . && git commit -m "fix: Amélioration de la gestion des rappels - Correction de l’affichage des Conditions d’utilisation" && git push
v13 (1.0.13) :
git add . && git commit -m "fix: corriger l'affichage de la date  dans EditTransactionScreen" && git push  
v13 (1.0.14) :
git add . && git commit -m "Ajout ecran graphiques annuels" && git push  
v mode web 1 :
git add . && git commit -m "Ajout de l'application pour le web" && git push  
v mode web 2 :
git add . && git commit -m "Resoudre pb connexion google + Dépenses partagées" && git push
v13 (1.0.15) :
git add . && git commit -m "Ajout Ecran Carte de fidelité et recalcule des dépenses partagées" && git push  
v13 (1.0.16) :
git add . && git commit -m "Modification incomplète pour la conformité 16 KB" && git push  

git add . && git commit -m "version web stable" && git push  

----------------------------------------------
----------------------------------------------
# verifier les erreurs
 npx tsc --noEmit
 npx eslint src/pages/AnnualCharts.tsx


----------------------------------------------
----------------------------------------------
# modifier la version :
 app.json
 android/app/build.gradle


----------------------------------------------
# Crée un dossier build/
----------------------------------------------
npm run build

# puis dans le vps
docker compose down caddy
sleep 3
docker compose up -d caddy
# verifier
docker exec -it caddy ls -l /srv/endev-build

ssh said@51.77.148.83