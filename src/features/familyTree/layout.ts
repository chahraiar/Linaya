import { Person } from '../../store/familyTreeStore';
import { TreeNode, Cluster, Position } from './types';

/**
 * Simple hierarchical layout algorithm
 * Groups persons by clusters and arranges them in a tree structure
 */

// Card dimensions (must match PersonCard.tsx)
const CARD_WIDTH = 140;
const CARD_HEIGHT = 120;

const NODE_SPACING_X = CARD_WIDTH + 40; // Espacement horizontal entre nœuds (carte + marge)
const NODE_SPACING_Y = CARD_HEIGHT + 60; // Espacement vertical entre générations (carte + marge)
const PARTNER_SPACING = 20; // Espacement entre partenaires (couple) - plus serré pour les cartes
const CLUSTER_SPACING = 400;

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
 */
export function createClusters(persons: Person[]): Cluster[] {
  const clusters: Cluster[] = [];
  const processed = new Set<string>();
  const roots = findRoots(persons);

  roots.forEach((root) => {
    if (processed.has(root.id)) return;

    const clusterId = `cluster-${clusters.length}`;
    const descendants = findDescendants(root.id, persons);
    
    // Inclure le partenaire du root s'il existe
    const clusterPersonsSet = new Set([root.id, ...descendants]);
    if (root.partnerId) {
      clusterPersonsSet.add(root.partnerId);
      const partnerDescendants = findDescendants(root.partnerId, persons);
      partnerDescendants.forEach(id => clusterPersonsSet.add(id));
    }
    
    const clusterPersons = Array.from(clusterPersonsSet)
      .map((id) => persons.find((p) => p.id === id))
      .filter(Boolean) as Person[];

    clusterPersons.forEach((p) => processed.add(p.id));

    // Create tree nodes for this cluster - utiliser le root qui a le moins de parents (ou le premier)
    const startRoot = root.id;
    const nodes = layoutTree(clusterPersons, startRoot, { x: 0, y: 0 }, clusterId);
    
    // Remove duplicates based on person.id
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

  function layoutNode(personId: string, position: Position, level: number): void {
    const person = personMap.get(personId);
    if (!person || processed.has(personId)) return;

    processed.add(personId);
    nodes.push({
      person,
      position: { ...position },
      clusterId,
    });

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
      }
    }

    // Récupérer tous les enfants uniques (éviter les doublons)
    const allChildrenIds = new Set<string>();
    if (person.partnerId) {
      const partner = personMap.get(person.partnerId);
      if (partner) {
        partner.childrenIds.forEach(id => allChildrenIds.add(id));
      }
    }
    person.childrenIds.forEach(id => allChildrenIds.add(id));

    const children = Array.from(allChildrenIds)
      .map((id) => personMap.get(id))
      .filter(Boolean) as Person[];

    if (children.length === 0) return;

    // Centrer les enfants sous le couple
    const childY = position.y + NODE_SPACING_Y;
    const totalWidth = children.length * NODE_SPACING_X;
    // Calculer le centre entre les deux partenaires si couple, sinon utiliser la position de la personne
    let centerX = position.x;
    if (person.partnerId) {
      const partnerX = position.x + PARTNER_SPACING;
      centerX = (position.x + partnerX) / 2;
    }
    const startX = centerX - totalWidth / 2 + NODE_SPACING_X / 2;

    children.forEach((child, index) => {
      const childX = startX + index * NODE_SPACING_X;
      layoutNode(child.id, { x: childX, y: childY }, level + 1);
    });
  }

  layoutNode(rootId, startPosition, 0);
  return nodes;
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

