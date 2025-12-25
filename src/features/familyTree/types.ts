import { Person } from '../../store/familyTreeStore';

/**
 * Position on canvas
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Node in the tree visualization
 */
export interface TreeNode {
  person: Person;
  position: Position;
  clusterId: string; // ID of the cluster this node belongs to
}

/**
 * Cluster of related nodes
 */
export interface Cluster {
  id: string;
  nodes: TreeNode[];
  center: Position;
}

