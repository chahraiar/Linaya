import { Person } from '../../store/familyTreeStore';
import { TreeNode, Cluster, Position } from './types';

/**
 * Simple hierarchical layout algorithm
 * Groups persons by clusters and arranges them in a tree structure
 */

// Card dimensions (must match PersonCard.tsx)
const CARD_WIDTH = 150;
const CARD_HEIGHT = 130;

const NODE_SPACING_X = CARD_WIDTH + 30; // Espacement horizontal entre nœuds (carte + marge réduite)
const NODE_SPACING_Y = CARD_HEIGHT + 60; // Espacement vertical entre générations (carte + marge pour liens)
const PARTNER_SPACING = CARD_WIDTH + 20; // Espacement entre partenaires = largeur carte + petite marge
const CLUSTER_SPACING = 500;

/**
 * Catégorise les enfants par type de parenté
 */
function categorizeChildren(
  children: Person[],
  parentId: string,
  partnerId: string | undefined,
  personMap: Map<string, Person>
): {
  sharedChildren: Person[];
  parentOnlyChildren: Person[];
  partnerOnlyChildren: Person[];
} {
  const sharedChildren: Person[] = [];
  const parentOnlyChildren: Person[] = [];
  const partnerOnlyChildren: Person[] = [];

  children.forEach(child => {
    const hasParent = child.parentIds.includes(parentId);
    const hasPartner = partnerId ? child.parentIds.includes(partnerId) : false;

    if (hasParent && hasPartner) {
      sharedChildren.push(child);
    } else if (hasParent) {
      parentOnlyChildren.push(child);
    } else if (hasPartner) {
      partnerOnlyChildren.push(child);
    }
  });

  return { sharedChildren, parentOnlyChildren, partnerOnlyChildren };
}

/**
 * Find root nodes (persons without parents)
 */
function findRoots(persons: Person[]): Person[] {
  return persons.filter((person) => person.parentIds.length === 0);
}

/**
 * Find all descendants of a person
 */
function findDescendants(personId: string, persons: Person[]): Set<string> {
  const descendants = new Set<string>();
  const queue = [personId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const person = persons.find((p) => p.id === currentId);
    if (!person) continue;

    person.childrenIds.forEach((childId) => {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        queue.push(childId);
      }
    });
  }

  return descendants;
}

/**
 * Group persons into clusters based on family relationships
 * Fixed to handle persons with multiple parents correctly
 */
export function createClusters(persons: Person[]): Cluster[] {
  const clusters: Cluster[] = [];
  const processed = new Set<string>();
  
  // Build a map of all persons for quick lookup
  const personMap = new Map(persons.map((p) => [p.id, p]));
  
  // Find all connected components (families)
  // Use a global visited to track which persons have been assigned to a cluster
  const globalVisited = new Set<string>();
  
  function collectConnectedComponent(startId: string): Set<string> {
    const component = new Set<string>();
    const queue = [startId];
    const localVisited = new Set<string>(); // Local visited for this BFS traversal
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (localVisited.has(currentId) || component.has(currentId)) continue;
      
      const person = personMap.get(currentId);
      if (!person) continue;
      
      component.add(currentId);
      localVisited.add(currentId);
      
      // Add parents (CRITICAL: must include all parents to show them in tree)
      person.parentIds.forEach((parentId) => {
        if (!component.has(parentId) && !localVisited.has(parentId)) {
          const parent = personMap.get(parentId);
          console.log(`  Adding parent ${parent?.firstName} ${parent?.lastName} of ${person.firstName} ${person.lastName} to component`);
          queue.push(parentId);
        } else {
          const parent = personMap.get(parentId);
          console.log(`  Skipping parent ${parent?.firstName} ${parent?.lastName} of ${person.firstName} ${person.lastName} - already in component or visited`);
        }
      });
      
      // Add children
      person.childrenIds.forEach((childId) => {
        if (!component.has(childId) && !localVisited.has(childId)) {
          queue.push(childId);
        }
      });
      
      // Add partner
      if (person.partnerId && !component.has(person.partnerId) && !localVisited.has(person.partnerId)) {
        queue.push(person.partnerId);
      }
    }
    
    return component;
  }
  
  // Strategy: Find all connected components by starting from each unprocessed person
  // This ensures that all related persons (including parents of children) are in the same cluster
  // We need to process ALL persons, not just roots, to ensure parents are included
  const allStartPoints = persons.filter((p) => !processed.has(p.id));
  
  console.log(`Starting cluster creation with ${allStartPoints.length} unprocessed persons: ${allStartPoints.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`);
  
  // Process each unprocessed person and its connected component
  // IMPORTANT: We process ALL persons, not just roots, to ensure we don't miss any connections
  allStartPoints.forEach((startPerson) => {
    if (processed.has(startPerson.id) || globalVisited.has(startPerson.id)) {
      console.log(`Skipping ${startPerson.firstName} ${startPerson.lastName} - already processed`);
      return;
    }
    
    const clusterId = `cluster-${clusters.length}`;
    console.log(`Collecting component starting from: ${startPerson.firstName} ${startPerson.lastName} (parents: ${startPerson.parentIds.length}, children: ${startPerson.childrenIds.length})`);
    const component = collectConnectedComponent(startPerson.id);
    console.log(`Component collected: ${component.size} persons - ${Array.from(component).map(id => {
      const p = personMap.get(id);
      return p ? `${p.firstName} ${p.lastName}` : id;
    }).join(', ')}`);
    
    // Mark all persons in this component as processed and visited
    component.forEach((id) => {
      processed.add(id);
      globalVisited.add(id);
    });
    
    // Get all persons in this component
    const clusterPersons = Array.from(component)
      .map((id) => personMap.get(id))
      .filter(Boolean) as Person[];
    
    if (clusterPersons.length === 0) return;
    
    // Find the best root for layout (person with least parents, or first root)
    const bestRoot = clusterPersons.find((p) => p.parentIds.length === 0) || clusterPersons[0];
    
    console.log(`Creating cluster from root: ${bestRoot.firstName} ${bestRoot.lastName}, clusterPersons: ${clusterPersons.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`);
    
    // Create tree nodes for this cluster
    const nodes = layoutTree(clusterPersons, bestRoot.id, { x: 0, y: 0 }, clusterId);
    
    console.log(`Cluster created with ${nodes.length} nodes: ${nodes.map(n => `${n.person.firstName} ${n.person.lastName}`).join(', ')}`);
    
    // Remove duplicates based on person.id (safety check)
    const uniqueNodes = new Map<string, typeof nodes[0]>();
    nodes.forEach(node => {
      if (!uniqueNodes.has(node.person.id)) {
        uniqueNodes.set(node.person.id, node);
      }
    });
    const deduplicatedNodes = Array.from(uniqueNodes.values());
    
    const center = calculateClusterCenter(deduplicatedNodes);

    clusters.push({
      id: clusterId,
      nodes: deduplicatedNodes,
      center,
    });
  });

  // Handle remaining persons (orphans or separate families)
  persons.forEach((person) => {
    if (!processed.has(person.id)) {
      const clusterId = `cluster-${clusters.length}`;
      const nodes: TreeNode[] = [
        {
          person,
          position: { x: 0, y: 0 },
          clusterId,
        },
      ];
      clusters.push({
        id: clusterId,
        nodes,
        center: { x: 0, y: 0 },
      });
    }
  });

  // Position clusters - centrer le premier cluster (pour un seul arbre)
  if (clusters.length === 1) {
    // Centrer l'arbre à l'origine (0, 0)
    const cluster = clusters[0];
    if (cluster.nodes.length > 0) {
      const minX = Math.min(...cluster.nodes.map(n => n.position.x));
      const maxX = Math.max(...cluster.nodes.map(n => n.position.x));
      const minY = Math.min(...cluster.nodes.map(n => n.position.y));
      const maxY = Math.max(...cluster.nodes.map(n => n.position.y));
      
      // Centrer horizontalement et verticalement
      const centerOffsetX = -(minX + maxX) / 2;
      const centerOffsetY = -(minY + maxY) / 2;
      
      cluster.nodes.forEach((node) => {
        node.position.x += centerOffsetX;
        node.position.y += centerOffsetY;
      });
      cluster.center.x += centerOffsetX;
      cluster.center.y += centerOffsetY;
    }
  } else {
    // Position multiple clusters
    clusters.forEach((cluster, index) => {
      const offsetX = (index % 3) * CLUSTER_SPACING - CLUSTER_SPACING;
      const offsetY = Math.floor(index / 3) * CLUSTER_SPACING;
      cluster.nodes.forEach((node) => {
        node.position.x += offsetX;
        node.position.y += offsetY;
      });
      cluster.center.x += offsetX;
      cluster.center.y += offsetY;
    });
  }

  return clusters;
}

/**
 * Layout a tree starting from a root
 * Gère les couples (partenaires) et les générations
 * Remonte vers les parents et descend vers les enfants
 */
function layoutTree(
  persons: Person[],
  rootId: string,
  startPosition: Position,
  clusterId: string
): TreeNode[] {
  const nodes: TreeNode[] = [];
  const personMap = new Map(persons.map((p) => [p.id, p]));
  const processed = new Set<string>();

  // First, find the actual root (person with no parents) by traversing up
  // IMPORTANT: We need to find ALL roots (persons without parents) in the component
  // and start from the one that will allow us to include all persons
  function findActualRoot(startId: string): string {
    const visited = new Set<string>();
    let currentId = startId;
    
    while (currentId) {
      if (visited.has(currentId)) break; // Prevent infinite loops
      visited.add(currentId);
      
      const person = personMap.get(currentId);
      if (!person || person.parentIds.length === 0) {
        return currentId; // Found a root
      }
      
      // Go to first parent (or could go to all parents, but for simplicity use first)
      currentId = person.parentIds[0];
    }
    
    return startId; // Fallback to original start
  }

  // Find the best root: prefer a person without parents, but if all have parents,
  // use the one that's furthest up (has the most ancestors)
  function findBestRoot(): string {
    // First, try to find a person without parents
    const root = persons.find((p) => p.parentIds.length === 0);
    if (root) {
      console.log(`Found root without parents: ${root.firstName} ${root.lastName}`);
      return root.id;
    }
    
    // If all have parents, find the one with the most ancestors
    // by counting how many generations up we can go
    let maxAncestors = -1;
    let bestRootId = rootId;
    
    for (const person of persons) {
      let ancestorCount = 0;
      let currentId = person.id;
      const visited = new Set<string>();
      
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const p = personMap.get(currentId);
        if (!p || p.parentIds.length === 0) break;
        ancestorCount++;
        currentId = p.parentIds[0];
      }
      
      if (ancestorCount > maxAncestors) {
        maxAncestors = ancestorCount;
        bestRootId = person.id;
      }
    }
    
    const bestRoot = personMap.get(bestRootId);
    console.log(`Found best root (most ancestors): ${bestRoot?.firstName} ${bestRoot?.lastName} with ${maxAncestors} ancestors`);
    return bestRootId;
  }

  const actualRootId = findBestRoot();
  console.log(`LayoutTree: Starting from root ${actualRootId}, total persons: ${persons.length}`);

  function layoutNode(personId: string, position: Position, level: number, direction: 'up' | 'down' = 'down'): void {
    const person = personMap.get(personId);
    if (!person) {
      console.log(`  LayoutNode: Person ${personId} not found in personMap`);
      return;
    }
    
    // Check if already processed
    const isAlreadyProcessed = processed.has(personId);
    
    console.log(`  LayoutNode: Processing ${person.firstName} ${person.lastName} at level ${level}, direction: ${direction}, parents: ${person.parentIds.length}, children: ${person.childrenIds.length}, alreadyProcessed: ${isAlreadyProcessed}`);

    // Add person to nodes if not already processed
    if (!isAlreadyProcessed) {
      processed.add(personId);
      nodes.push({
        person,
        position: { ...position },
        clusterId,
      });
    }

    // Gérer le partenaire (couple) - placer à côté
    if (person.partnerId && !processed.has(person.partnerId)) {
      const partner = personMap.get(person.partnerId);
      if (partner) {
        const partnerX = position.x + PARTNER_SPACING;
        processed.add(partner.id);
        nodes.push({
          person: partner,
          position: { x: partnerX, y: position.y },
          clusterId,
        });
        // CRITICAL: After adding partner, immediately try to add their parents
        // This ensures that parents of partners are included in the layout
        // IMPORTANT: Position parents above the PARTNER, ensuring minimum gap from person's parents
        if (partner.parentIds.length > 0) {
          const partnerParentY = position.y - NODE_SPACING_Y;
          const totalWidth = partner.parentIds.length * NODE_SPACING_X;
          
          // Calculate minimum gap: CARD_WIDTH + 50% pour mieux séparer les groupes de parents et réduire les croisements
          const minGapBetweenParents = CARD_WIDTH * 1.5;
          
          let partnerCenterX = partnerX;
          
          // If person has parents, ensure minimum gap between parent groups
          if (person.parentIds.length > 0) {
            const personTotalWidth = person.parentIds.length * NODE_SPACING_X;
            // Calculer la position de la dernière carte du groupe de parents de la personne
            const personParentsStartX = position.x - personTotalWidth / 2 + NODE_SPACING_X / 2;
            const personLastParentX = personParentsStartX + (person.parentIds.length - 1) * NODE_SPACING_X;
            const personLastParentRightEdge = personLastParentX + CARD_WIDTH / 2;
            
            // Calculer la position de la première carte du groupe de parents du partenaire
            const partnerParentsStartX = partnerX - totalWidth / 2 + NODE_SPACING_X / 2;
            const partnerFirstParentLeftEdge = partnerParentsStartX - CARD_WIDTH / 2;
            
            // Check if we need to shift partner's parents to the right to maintain minimum gap
            // Le gap est entre le bord droit de la dernière carte du groupe gauche et le bord gauche de la première carte du groupe droit
            const currentGap = partnerFirstParentLeftEdge - personLastParentRightEdge;
            if (currentGap < minGapBetweenParents) {
              const neededShift = minGapBetweenParents - currentGap;
              partnerCenterX = partnerX + neededShift;
              console.log(`  Layout: Shifting partner's parents right by ${neededShift.toFixed(1)} to maintain gap of ${minGapBetweenParents.toFixed(1)} (current gap: ${currentGap.toFixed(1)})`);
            }
          }
          
          const startX = partnerCenterX - totalWidth / 2 + NODE_SPACING_X / 2;
          partner.parentIds.forEach((parentId, index) => {
            const parent = personMap.get(parentId);
            if (parent && !processed.has(parentId)) {
              const parentX = startX + index * NODE_SPACING_X;
              console.log(`  Layout: Adding parent ${parent.firstName} ${parent.lastName} above partner ${partner.firstName} ${partner.lastName} at x=${parentX}`);
              layoutNode(parentId, { x: parentX, y: partnerParentY }, level - 1, 'up');
            }
          });
        }
      }
    }

    // CRITICAL: TOUJOURS remonter vers les parents si ils existent, MÊME si la personne est déjà traitée
    // Cela garantit que tous les parents sont inclus dans le layout, même si on arrive à la personne depuis un enfant
    // IMPORTANT: Position parents above the person, ensuring minimum gap from partner's parents if they exist
    if (person.parentIds.length > 0) {
      const parentY = position.y - NODE_SPACING_Y;
      const totalWidth = person.parentIds.length * NODE_SPACING_X;
      
      // Calculate minimum gap: CARD_WIDTH + 50% pour mieux séparer les groupes de parents et réduire les croisements
      const minGapBetweenParents = CARD_WIDTH * 1.5;
      
      let centerX = position.x;
      
      // If person has a partner with parents, ensure minimum gap between parent groups
      if (person.partnerId) {
        const partner = personMap.get(person.partnerId);
        if (partner && partner.parentIds.length > 0) {
          // Find partner's position in nodes (if already added)
          const partnerNode = nodes.find(n => n.person.id === person.partnerId);
          if (partnerNode) {
            const partnerX = partnerNode.position.x;
            const partnerTotalWidth = partner.parentIds.length * NODE_SPACING_X;
            
            // Calculer la position de la dernière carte du groupe de parents de la personne
            const personParentsStartX = position.x - totalWidth / 2 + NODE_SPACING_X / 2;
            const personLastParentX = personParentsStartX + (person.parentIds.length - 1) * NODE_SPACING_X;
            const personLastParentRightEdge = personLastParentX + CARD_WIDTH / 2;
            
            // Calculer la position de la première carte du groupe de parents du partenaire
            const partnerParentsStartX = partnerX - partnerTotalWidth / 2 + NODE_SPACING_X / 2;
            const partnerFirstParentLeftEdge = partnerParentsStartX - CARD_WIDTH / 2;
            
            // Check if we need to shift person's parents to the left to maintain minimum gap
            // Le gap est entre le bord droit de la dernière carte du groupe gauche et le bord gauche de la première carte du groupe droit
            const currentGap = partnerFirstParentLeftEdge - personLastParentRightEdge;
            if (currentGap < minGapBetweenParents) {
              const neededShift = minGapBetweenParents - currentGap;
              centerX = position.x - neededShift;
              console.log(`  Layout: Shifting person's parents left by ${neededShift.toFixed(1)} to maintain gap of ${minGapBetweenParents.toFixed(1)} (current gap: ${currentGap.toFixed(1)})`);
            }
          }
        }
      }
      
      const startX = centerX - totalWidth / 2 + NODE_SPACING_X / 2;

      person.parentIds.forEach((parentId, index) => {
        // Check if parent exists in personMap (should be in clusterPersons)
        const parent = personMap.get(parentId);
        if (parent) {
          // CRITICAL: Always try to add parents, even if the current person is already processed
          // This ensures that parents are added even when we arrive at a person from a child
          if (!processed.has(parentId)) {
            const parentX = startX + index * NODE_SPACING_X;
            console.log(`  Layout: Adding parent ${parent.firstName} ${parent.lastName} above ${person.firstName} ${person.lastName} at x=${parentX}`);
            layoutNode(parentId, { x: parentX, y: parentY }, level - 1, 'up');
          } else {
            console.log(`  Layout: Parent ${parent.firstName} ${parent.lastName} already processed, skipping`);
          }
        } else {
          console.log(`  Layout: WARNING - Parent ${parentId} not found in personMap for ${person.firstName} ${person.lastName}`);
        }
      });
    }

    // Descendre vers les enfants avec layout intelligent
    if (direction === 'up' || level >= 0) {
      // Récupérer tous les enfants uniques (éviter les doublons)
      const allChildrenIds = new Set<string>();
      if (person.partnerId) {
        const partner = personMap.get(person.partnerId);
        if (partner) {
          partner.childrenIds.forEach(id => allChildrenIds.add(id));
        }
      }
      person.childrenIds.forEach(id => allChildrenIds.add(id));

      const allChildren = Array.from(allChildrenIds)
        .map((id) => personMap.get(id))
        .filter(Boolean) as Person[];

      if (allChildren.length > 0) {
        // Trouver le partenaire dans les nodes déjà créés
        const partnerNode = person.partnerId 
          ? nodes.find(n => n.person.id === person.partnerId)
          : undefined;
        
        // Catégoriser les enfants
        const { sharedChildren, parentOnlyChildren, partnerOnlyChildren } = 
          categorizeChildren(
            allChildren,
            person.id,
            person.partnerId,
            personMap
          );

        // Ordre intelligent: enfants du parent seul, enfants communs, enfants du partenaire seul
        const sortedChildren = [
          ...parentOnlyChildren,
          ...sharedChildren,
          ...partnerOnlyChildren
        ];

        console.log(`📊 Layout intelligent pour ${person.firstName} ${person.lastName}:`, {
          parentOnly: parentOnlyChildren.length,
          shared: sharedChildren.length,
          partnerOnly: partnerOnlyChildren.length,
        });

        // Calculer la position centrale du couple
        let coupleCenter: number;
        if (person.partnerId && partnerNode) {
          const parentCenter = position.x + CARD_WIDTH / 2;
          const partnerCenter = partnerNode.position.x + CARD_WIDTH / 2;
          coupleCenter = (parentCenter + partnerCenter) / 2;
        } else {
          coupleCenter = position.x + CARD_WIDTH / 2;
        }

        // Calculer la largeur totale des enfants
        const totalChildrenWidth = sortedChildren.length * NODE_SPACING_X - (NODE_SPACING_X - CARD_WIDTH);
        
        // Position de départ pour centrer sous le couple
        let childStartX = coupleCenter - (totalChildrenWidth / 2);

        // Placer chaque enfant
        sortedChildren.forEach((child, index) => {
          if (processed.has(child.id)) {
            console.log(`  ⏭️ Enfant ${child.firstName} ${child.lastName} déjà traité, skip`);
            return;
          }

          const childX = childStartX + index * NODE_SPACING_X;
          const childY = position.y + NODE_SPACING_Y;

          console.log(`  ➡️ Enfant positionné: ${child.firstName} ${child.lastName} at (${childX.toFixed(1)}, ${childY.toFixed(1)})`);
          layoutNode(child.id, { x: childX, y: childY }, level + 1, 'down');
        });
      }
    }
  }

  layoutNode(actualRootId, startPosition, 0, 'down');
  refineLayout(nodes);
  resolveRowOverlaps(nodes);
  return nodes;
}

function refineLayout(nodes: TreeNode[]): void {
  const nodeById = new Map(nodes.map((node) => [node.person.id, node]));

  for (let iteration = 0; iteration < 2; iteration += 1) {
    nodes.forEach((node) => {
      if (node.person.parentIds.length === 0) return;
      const parentNodes = node.person.parentIds
        .map((parentId) => nodeById.get(parentId))
        .filter(Boolean) as TreeNode[];
      if (parentNodes.length === 0) return;
      const targetX =
        parentNodes.reduce((sum, parent) => sum + parent.position.x, 0) / parentNodes.length;
      node.position.x = (node.position.x + targetX) / 2;
    });

    nodes.forEach((node) => {
      if (!node.person.partnerId) return;
      const partnerNode = nodeById.get(node.person.partnerId);
      if (!partnerNode) return;
      if (node.person.id > partnerNode.person.id) return;

      const nodeParents = node.person.parentIds
        .map((parentId) => nodeById.get(parentId))
        .filter(Boolean) as TreeNode[];
      const partnerParents = partnerNode.person.parentIds
        .map((parentId) => nodeById.get(parentId))
        .filter(Boolean) as TreeNode[];

      const nodeParentCenter =
        nodeParents.length > 0
          ? nodeParents.reduce((sum, parent) => sum + parent.position.x, 0) / nodeParents.length
          : null;
      const partnerParentCenter =
        partnerParents.length > 0
          ? partnerParents.reduce((sum, parent) => sum + parent.position.x, 0) /
            partnerParents.length
          : null;

      let leftNode = node;
      let rightNode = partnerNode;

      if (nodeParentCenter !== null && partnerParentCenter !== null) {
        if (nodeParentCenter > partnerParentCenter) {
          leftNode = partnerNode;
          rightNode = node;
        }
      } else if (nodeParentCenter === null && partnerParentCenter !== null) {
        leftNode = partnerNode;
        rightNode = node;
      }

      rightNode.position.x = leftNode.position.x + PARTNER_SPACING;
      rightNode.position.y = leftNode.position.y;
    });

    resolveRowOverlaps(nodes);
  }
}

function resolveRowOverlaps(nodes: TreeNode[]): void {
  const rows: { y: number; nodes: TreeNode[] }[] = [];
  const rowTolerance = NODE_SPACING_Y / 2;
  const nodeById = new Map(nodes.map((node) => [node.person.id, node]));

  nodes.forEach((node) => {
    const row = rows.find((r) => Math.abs(r.y - node.position.y) <= rowTolerance);
    if (row) {
      row.nodes.push(node);
    } else {
      rows.push({ y: node.position.y, nodes: [node] });
    }
  });

  rows.forEach((row) => {
    const rowNodeIds = new Set(row.nodes.map((node) => node.person.id));
    const used = new Set<string>();
    const blocks: { key: string; nodes: TreeNode[]; startX: number; width: number }[] = [];

    row.nodes.forEach((node) => {
      if (used.has(node.person.id)) return;

      if (node.person.partnerId && rowNodeIds.has(node.person.partnerId)) {
        const partner = nodeById.get(node.person.partnerId);
        if (partner) {
          const left = node.position.x <= partner.position.x ? node : partner;
          const right = left === node ? partner : node;
          used.add(left.person.id);
          used.add(right.person.id);
          blocks.push({
            key: `pair-${left.person.id}-${right.person.id}`,
            nodes: [left, right],
            startX: left.position.x,
            width: PARTNER_SPACING,
          });
          return;
        }
      }

      used.add(node.person.id);
      blocks.push({
        key: `single-${node.person.id}`,
        nodes: [node],
        startX: node.position.x,
        width: 0,
      });
    });

    blocks.sort((a, b) => a.startX - b.startX || a.key.localeCompare(b.key));

    let lastEnd = 0;
    blocks.forEach((block, index) => {
      const targetX = index === 0 ? block.startX : Math.max(block.startX, lastEnd + NODE_SPACING_X);
      if (block.nodes.length === 2) {
        const left = block.nodes[0];
        const right = block.nodes[1];
        left.position.x = targetX;
        right.position.x = targetX + PARTNER_SPACING;
        right.position.y = left.position.y;
        lastEnd = targetX + PARTNER_SPACING;
      } else {
        block.nodes[0].position.x = targetX;
        lastEnd = targetX;
      }
    });
  });
}

/**
 * Calculate the center of a cluster
 */
function calculateClusterCenter(nodes: TreeNode[]): Position {
  if (nodes.length === 0) return { x: 0, y: 0 };

  const sumX = nodes.reduce((sum, node) => sum + node.position.x, 0);
  const sumY = nodes.reduce((sum, node) => sum + node.position.y, 0);

  return {
    x: sumX / nodes.length,
    y: sumY / nodes.length,
  };
}

