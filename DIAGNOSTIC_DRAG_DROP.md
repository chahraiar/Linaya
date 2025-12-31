# 🔍 Diagnostic et Correction du Drag & Drop

## 📊 Problème Identifié

Les logs montrent :
- ✅ `isEditMode` change bien dans `TreeRenderer` (ligne 390: `🔧 TreeRenderer - isEditMode changed to: true`)
- ❌ Mais `DraggableCard` utilise toujours `TouchableOpacity` (lignes 392-401)
- ❌ Aucun log de `DraggableCard` n'apparaît (`🔄 DraggableCard effect`, `🎨 DraggableCard render decision`)

**Conclusion** : Le composant `DraggableCard` ne se re-rend pas quand `isEditMode` change.

---

## 🔎 Vérifications à Faire

### 1. Vérifier que `DraggableCard` se re-rend

**Fichier** : `src/features/familyTree/TreeRenderer.tsx`

**Ligne ~114** : Ajoutez un log au début du render de `DraggableCard` :

```typescript
const DraggableCard: React.FC<{...}> = ({ isEditMode, ... }) => {
  // ⚠️ AJOUTEZ CETTE LIGNE AU DÉBUT DU COMPOSANT
  console.log('🔄 DraggableCard RENDER for:', node.person.id, 'isEditMode:', isEditMode);
  
  const baseX = customPositions[node.person.id]?.x ?? node.position.x;
  // ... reste du code
```

**Test** : Activez le mode édition. Si vous ne voyez **PAS** ce log, le composant ne se re-rend pas.

---

### 2. Vérifier que la clé du composant force le re-render

**Fichier** : `src/features/familyTree/TreeRenderer.tsx`

**Ligne ~451** : La clé actuelle est :
```typescript
key={`card-${clusterIndex}-${node.person.id}`}
```

**Problème** : Cette clé ne change pas quand `isEditMode` change, donc React peut ne pas re-rendre.

**Solution** : Ajoutez `isEditMode` à la clé :
```typescript
key={`card-${clusterIndex}-${node.person.id}-${isEditMode ? 'edit' : 'view'}`}
```

---

### 3. Vérifier que `useMemo` se recalcule

**Fichier** : `src/features/familyTree/TreeRenderer.tsx`

**Ligne ~47** : Le `useMemo` pour `panResponder` doit avoir `isEditMode` dans ses dépendances :

```typescript
const panResponder = useMemo(() => {
  // ... code
}, [isEditMode, node.person.id, baseX, baseY, scale, treeId, customPositions, onPositionChange, updateCustomPosition]);
```

**Vérification** : Le log `🔧 useMemo called for:` doit apparaître quand `isEditMode` change.

---

### 4. Vérifier que `PersonCard` n'intercepte pas les événements

**Fichier** : `src/features/familyTree/PersonCard.tsx`

**Ligne ~27** : Vérifiez que `disableTouch={true}` rend bien un `View` au lieu de `TouchableOpacity` :

```typescript
if (disableTouch) {
  return (
    <View style={styles.card}>
      {/* contenu */}
    </View>
  );
}
return (
  <TouchableOpacity onPress={...}>
    {/* contenu */}
  </TouchableOpacity>
);
```

---

## 🛠️ Corrections à Appliquer

### Correction 1 : Forcer le re-render avec la clé

**Fichier** : `src/features/familyTree/TreeRenderer.tsx`  
**Ligne ~451**

**AVANT** :
```typescript
<DraggableCard
  key={`card-${clusterIndex}-${node.person.id}`}
  ...
/>
```

**APRÈS** :
```typescript
<DraggableCard
  key={`card-${clusterIndex}-${node.person.id}-${isEditMode ? 'edit' : 'view'}`}
  ...
/>
```

---

### Correction 2 : Ajouter un log de render au début de DraggableCard

**Fichier** : `src/features/familyTree/TreeRenderer.tsx`  
**Ligne ~38** (début du composant `DraggableCard`)

**AJOUTEZ** :
```typescript
const DraggableCard: React.FC<{...}> = ({ isEditMode, ... }) => {
  console.log('🔄 DraggableCard RENDER for:', node.person.id, 'isEditMode:', isEditMode);
  
  const baseX = customPositions[node.person.id]?.x ?? node.position.x;
  // ... reste
```

---

### Correction 3 : Vérifier que `PersonCard` respecte `disableTouch`

**Fichier** : `src/features/familyTree/PersonCard.tsx`  
**Ligne ~27**

**VÉRIFIEZ** que le code ressemble à ça :

```typescript
export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onPress,
  isSelected = false,
  disableTouch = false,
}) => {
  // ... code ...
  
  if (disableTouch) {
    return (
      <View style={[styles.card, isSelected && styles.selectedCard]}>
        {/* contenu de la carte */}
      </View>
    );
  }
  
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selectedCard]}
      activeOpacity={0.7}
      onPress={() => onPress(person.id)}
    >
      {/* contenu de la carte */}
    </TouchableOpacity>
  );
};
```

---

## 🧪 Tests à Effectuer

1. **Activez le mode édition**
   - Vous devriez voir : `🔄 DraggableCard RENDER for: [id] isEditMode: true`
   - Vous devriez voir : `🔧 useMemo called for: [id] isEditMode: true`
   - Vous devriez voir : `✅ Creating PanResponder for node: [id]`
   - Vous devriez voir : `✅ Rendering draggable View for: [id]`

2. **Tentez de déplacer une carte**
   - Vous devriez voir : `🎯 onStartShouldSetPanResponder - returning true`
   - Vous devriez voir : `🎯 Drag GRANTED for: [id]`
   - Vous devriez voir : `🎯 Drag MOVE: [id] dx: ... dy: ...`

3. **Si vous voyez toujours `TouchableOpacity press IN/OUT`**
   - Le composant ne se re-rend pas → Vérifiez la clé (Correction 1)
   - `PersonCard` intercepte les événements → Vérifiez `disableTouch` (Correction 3)

---

## 🎯 Ordre de Correction Recommandé

1. **Correction 1** (clé) → Force le re-render
2. **Correction 2** (log) → Confirme que le re-render fonctionne
3. **Correction 3** (PersonCard) → S'assure que les événements ne sont pas interceptés

---

## 📝 Notes Importantes

- React peut ne pas re-rendre un composant si sa clé ne change pas
- `useMemo` ne se recalcule que si ses dépendances changent
- `TouchableOpacity` capture les événements avant `PanResponder` si elle est active
- Les logs sont essentiels pour comprendre le flux d'exécution

