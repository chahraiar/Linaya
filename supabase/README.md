# Supabase Configuration - Linaya

Configuration Supabase pour l'application d'arbre généalogique Linaya.

## 📁 Structure

```
supabase/
├── migrations/          # Migrations SQL
│   ├── README.md        # Documentation des migrations
│   └── *.sql            # Fichiers de migration
└── README.md            # Ce fichier
```

## 🎯 Objectif

Ce dossier contient toutes les migrations nécessaires pour créer le schéma `family_tree` dédié à l'application, isolé du schéma `public` pour éviter les conflits avec d'autres applications utilisant le même serveur Supabase.

## 🚀 Démarrage rapide

1. **Appliquer les migrations** (voir `migrations/README.md`)
2. **Créer le bucket Storage** `family-tree-media` via le Dashboard
3. **Générer les types TypeScript** pour votre application React Native

## 📚 Documentation

- [Documentation des migrations](./migrations/README.md)
- [Documentation Supabase](https://supabase.com/docs)

