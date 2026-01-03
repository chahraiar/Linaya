import { Person } from '../../store/familyTreeStore';
import { TreeNode, Cluster, Position } from './types';

export type { Cluster, TreeNode, Position };

const CARD_WIDTH = 150;
const CARD_HEIGHT = 130;
const NODE_SPACING_X = CARD_WIDTH + 30;
const NODE_SPACING_Y = CARD_HEIGHT + 60;
const PARTNER_SPACING = CARD_WIDTH + 20;

function categorizeChildren(
  children: Person[],
  parentId: string,
  partnerId: string | undefined
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


export async function createClusters(
  persons: Person[],
  customPositions?: Record<string, { x: number; y: number }>
): Promise<Cluster[]> {
  const clusters: Cluster[] = [];
  const processed = new Set<string>();
  const personMap = new Map(persons.map((p) => [p.id, p]));

  function collectConnectedComponent(startPerson: Person): Person[] {
    const component: Person[] = [];
    const queue: Person[] = [startPerson];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      component.push(current);

      // Add parents
      current.parentIds.forEach((parentId) => {
        const parent = personMap.get(parentId);
        if (parent && !visited.has(parentId)) {
          queue.push(parent);
        }
      });

      // Add children
      current.childrenIds.forEach((childId) => {
        const child = personMap.get(childId);
        if (child && !visited.has(childId)) {
          queue.push(child);
        }
      });

      // Add partner
      if (current.partnerId) {
        const partner = personMap.get(current.partnerId);
        if (partner && !visited.has(current.partnerId)) {
          queue.push(partner);
        }
      }
    }

    return component;
  }

  function findActualRoot(component: Person[]): Person {
    const roots = component.filter((p) => p.parentIds.length === 0);
    if (roots.length > 0) {
      return roots[0];
    }
    return component[0];
  }

  function layoutTree(root: Person, component: Person[]): TreeNode[] {
    const nodes: TreeNode[] = [];
    const processed = new Set<string>();
    const personMap = new Map(component.map((p) => [p.id, p]));

    function layoutNode(
      person: Person,
      x: number,
      y: number,
      direction: 'up' | 'down' = 'down'
    ): void {
      if (processed.has(person.id)) return;

      const customPos = customPositions?.[person.id];
      const finalX = customPos ? customPos.x : x;
      const finalY = customPos ? customPos.y : y;

      nodes.push({
        person,
        position: { x: finalX, y: finalY },
        clusterId: root.id,
      });
      processed.add(person.id);

      if (direction === 'down') {
        const children = person.childrenIds
          .map((id) => personMap.get(id))
          .filter((p): p is Person => p !== undefined);

        if (children.length > 0) {
          const { sharedChildren, parentOnlyChildren, partnerOnlyChildren } = categorizeChildren(
            children,
            person.id,
            person.partnerId
          );

          const allChildren = [...sharedChildren, ...parentOnlyChildren, ...partnerOnlyChildren];
          const startX = x - ((allChildren.length - 1) * NODE_SPACING_X) / 2;

          allChildren.forEach((child, index) => {
            layoutNode(child, startX + index * NODE_SPACING_X, y + NODE_SPACING_Y, 'down');
          });
        }

        if (person.partnerId) {
          const partner = personMap.get(person.partnerId);
          if (partner && !processed.has(partner.id)) {
            const customPosPartner = customPositions?.[partner.id];
            const partnerX = customPosPartner ? customPosPartner.x : x + PARTNER_SPACING;
            const partnerY = customPosPartner ? customPosPartner.y : y;
            nodes.push({
              person: partner,
              position: { x: partnerX, y: partnerY },
              clusterId: root.id,
            });
            processed.add(partner.id);
          }
        }
      }

      if (direction === 'up' || direction === 'down') {
        person.parentIds.forEach((parentId) => {
          const parent = personMap.get(parentId);
          if (parent && !processed.has(parentId)) {
            layoutNode(parent, x, y - NODE_SPACING_Y, 'up');
          }
        });
      }
    }

    layoutNode(root, 0, 0, 'down');
    
    // Ensure all component persons are included (for isolated persons or missed connections)
    component.forEach((person) => {
      if (!processed.has(person.id)) {
        const customPos = customPositions?.[person.id];
        const finalX = customPos ? customPos.x : 0;
        const finalY = customPos ? customPos.y : 0;
        nodes.push({
          person,
          position: { x: finalX, y: finalY },
          clusterId: root.id,
        });
        processed.add(person.id);
      }
    });
    
    return nodes;
  }

  // Process all persons to ensure none are missed
  for (const person of persons) {
    if (processed.has(person.id)) continue;

    const component = collectConnectedComponent(person);
    const root = findActualRoot(component);
    const nodes = layoutTree(root, component);

    // Verify all component persons are in nodes
    const nodePersonIds = new Set(nodes.map(n => n.person.id));
    const missingInNodes = component.filter(p => !nodePersonIds.has(p.id));
    if (missingInNodes.length > 0) {
      console.warn('⚠️ Some persons in component are missing in nodes:', 
        missingInNodes.map(p => `${p.firstName} ${p.lastName}`));
    }

    component.forEach((p) => processed.add(p.id));

    const cluster: Cluster = {
      id: root.id,
      nodes,
      center: { x: 0, y: 0 },
    };

    clusters.push(cluster);
  }

  // Verify all persons are processed
  const unprocessed = persons.filter(p => !processed.has(p.id));
  if (unprocessed.length > 0) {
    console.warn('⚠️ Some persons were not processed:', 
      unprocessed.map(p => `${p.firstName} ${p.lastName} (${p.id})`));
    
    // Create clusters for isolated persons
    unprocessed.forEach(person => {
      const nodes = layoutTree(person, [person]);
      clusters.push({
        id: person.id,
        nodes,
        center: { x: 0, y: 0 },
      });
    });
  }

  return clusters;
}

