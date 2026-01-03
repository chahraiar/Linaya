import { Person } from '../../store/familyTreeStore';

export interface Position {
  x: number;
  y: number;
}

export interface TreeNode {
  person: Person;
  position: Position;
  clusterId: string;
}

export interface Cluster {
  id: string;
  nodes: TreeNode[];
  center: Position;
}

