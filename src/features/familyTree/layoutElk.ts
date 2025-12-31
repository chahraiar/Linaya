import { Person } from '../../store/familyTreeStore';
import { TreeNode, Cluster, Position } from './types';
import ELK from 'elkjs';

// Card dimensions (must match PersonCard.tsx)
const CARD_WIDTH = 150;
const CARD_HEIGHT = 130;

const NODE_SPACING_X = CARD_WIDTH + 30;
const NODE_SPACING_Y = CARD_HEIGHT + 60;
const PARTNER_SPACING = CARD_WIDTH + 20;

// Types pour ELK
type ElkNode = {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  children?: ElkNode[];
  layoutOptions?: Record<string, string>;
};

type ElkEdge = {
  id: string;
  sources: string[];
  targets: string[];
  sections?: Array<{
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
    bendPoints?: Array<{ x: number; y: number }>;
  }>;
};

/**
 * Construit le graphe ELK avec nœuds union pour les couples
 */
function buildElkGraph(persons: Person[]): { id: string; children: ElkNode[]; edges: ElkEdge[]; layoutOptions: Record<string, string> } {
  const nodes: ElkNode[] = [];
  const edges: ElkEdge[] = [];
  const personById = new Map(persons.map(p => [p.id, p]));

  // 1) Ajouter les nœuds personnes
  for (const p of persons) {
    nodes.push({
      id: `P:${p.id}`,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      layoutOptions: {
        'elk.padding': '[top=0,left=0,bottom=0,right=0]',
      },
    });
  }

  // 2) Créer les nœuds union pour les couples (parents d'enfants)
  const unionIdByParents = new Map<string, string>();
  
  function getUnionId(parentA: string, parentB: string): string {
    const key = [parentA, parentB].sort().join('|');
    let uid = unionIdByParents.get(key);
    if (!uid) {
      uid = `U:${key}`;
      unionIdByParents.set(key, uid);
      // Nœud union très petit (invisible ou petit point)
      nodes.push({
        id: uid,
        width: 10,
        height: 10,
        layoutOptions: {
          'elk.padding': '[top=0,left=0,bottom=0,right=0]',
        },
      });
      // Edges: Parents -> Union
      edges.push({
        id: `E:${parentA}->${uid}`,
        sources: [`P:${parentA}`],
        targets: [uid],
      });
      edges.push({
        id: `E:${parentB}->${uid}`,
        sources: [`P:${parentB}`],
        targets: [uid],
      });
    }
    return uid;
  }

  // 3) Gérer les unions mono-parent (enfant avec un seul parent)
  function getMonoParentUnionId(parentId: string): string {
    const key = `MONO:${parentId}`;
    let uid = unionIdByParents.get(key);
    if (!uid) {
      uid = `U:${key}`;
      unionIdByParents.set(key, uid);
      nodes.push({
        id: uid,
        width: 10,
        height: 10,
        layoutOptions: {
          'elk.padding': '[top=0,left=0,bottom=0,right=0]',
        },
      });
      edges.push({
        id: `E:${parentId}->${uid}`,
        sources: [`P:${parentId}`],
        targets: [uid],
      });
    }
    return uid;
  }

  // 4) Créer les edges Union -> Enfant
  for (const child of persons) {
    if (child.parentIds.length >= 2) {
      // Enfant avec 2 parents ou plus
      const [a, b] = child.parentIds.slice(0, 2);
      if (personById.has(a) && personById.has(b)) {
        const uid = getUnionId(a, b);
        edges.push({
          id: `E:${uid}->${child.id}`,
          sources: [uid],
          targets: [`P:${child.id}`],
        });
      }
    } else if (child.parentIds.length === 1) {
      // Enfant avec un seul parent
      const parentId = child.parentIds[0];
      if (personById.has(parentId)) {
        const uid = getMonoParentUnionId(parentId);
        edges.push({
          id: `E:${uid}->${child.id}`,
          sources: [uid],
          targets: [`P:${child.id}`],
        });
      }
    }
  }

  // 5) Ajouter les edges pour les couples (partenaires)
  const processedPartners = new Set<string>();
  for (const p of persons) {
    if (p.partnerId && !processedPartners.has(p.id) && !processedPartners.has(p.partnerId)) {
      const partner = personById.get(p.partnerId);
      if (partner) {
        // Créer un edge invisible pour forcer ELK à placer les partenaires côte à côte
        // On utilise un edge bidirectionnel avec un poids faible
        const edgeId = [p.id, p.partnerId].sort().join('-');
        edges.push({
          id: `PARTNER:${edgeId}`,
          sources: [`P:${p.id}`],
          targets: [`P:${p.partnerId}`],
        });
        processedPartners.add(p.id);
        processedPartners.add(p.partnerId);
      }
    }
  }

  return {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.edgeNode': '20',
      'elk.spacing.edgeEdge': '10',
    },
    children: nodes,
    edges,
  };
}

/**
 * Calcule la profondeur (génération) de chaque personne
 */
function calculateDepths(persons: Person[]): Map<string, number> {
  const depths = new Map<string, number>();
  const personById = new Map(persons.map(p => [p.id, p]));
  
  // Trouver les racines (personnes sans parents)
  const roots = persons.filter(p => p.parentIds.length === 0);
  
  function setDepth(personId: string, depth: number) {
    const currentDepth = depths.get(personId);
    if (currentDepth === undefined || depth > currentDepth) {
      depths.set(personId, depth);
      const person = personById.get(personId);
      if (person) {
        person.childrenIds.forEach(childId => {
          setDepth(childId, depth + 1);
        });
      }
    }
  }
  
  roots.forEach(root => setDepth(root.id, 0));
  
  return depths;
}

/**
 * Layout utilisant ELK avec nœuds union
 */
export async function layoutTreeWithElk(
  persons: Person[],
  rootId: string,
  startPosition: Position,
  clusterId: string
): Promise<TreeNode[]> {
  if (persons.length === 0) return [];

  const personMap = new Map(persons.map(p => [p.id, p]));
  const depths = calculateDepths(persons);

  // Construire le graphe ELK
  const elkGraph = buildElkGraph(persons);

  // Ajouter les contraintes de profondeur (layers)
  elkGraph.children.forEach(node => {
    if (node.id.startsWith('P:')) {
      const personId = node.id.substring(2);
      const depth = depths.get(personId) ?? 0;
      node.layoutOptions = {
        ...node.layoutOptions,
        'elk.layered.layerConstraint': depth.toString(),
      };
    }
  });

  // Exécuter ELK
  let layoutedGraph;
  try {
    const elk = new ELK();
    layoutedGraph = await elk.layout(elkGraph);
  } catch (error) {
    console.error('ELK layout error:', error);
    // Fallback: retourner un layout simple si ELK échoue
    throw new Error('ELK layout failed, falling back to simple layout');
  }

  // Convertir les résultats ELK en TreeNode[]
  const nodes: TreeNode[] = [];
  const processed = new Set<string>();

  function processElkNode(elkNode: ElkNode, offsetX: number = 0, offsetY: number = 0) {
    if (elkNode.id.startsWith('P:')) {
      const personId = elkNode.id.substring(2);
      const person = personMap.get(personId);
      if (person && !processed.has(personId)) {
        processed.add(personId);
        nodes.push({
          person,
          position: {
            x: (elkNode.x ?? 0) + offsetX - startPosition.x,
            y: (elkNode.y ?? 0) + offsetY - startPosition.y,
          },
          clusterId,
        });
      }
    }
    
    // Traiter les enfants récursivement
    if (elkNode.children) {
      elkNode.children.forEach(child => {
        processElkNode(child, offsetX + (elkNode.x ?? 0), offsetY + (elkNode.y ?? 0));
      });
    }
  }

  if (layoutedGraph.children) {
    layoutedGraph.children.forEach(child => {
      processElkNode(child);
    });
  }

  return nodes;
}

/**
 * Récupère les chemins de routage des edges depuis ELK
 */
export function getElkEdgePaths(
  persons: Person[]
): Map<string, Array<{ x: number; y: number }>> {
  const paths = new Map<string, Array<{ x: number; y: number }>>();
  
  // Cette fonction sera appelée après le layout ELK
  // pour récupérer les chemins des edges
  
  return paths;
}

