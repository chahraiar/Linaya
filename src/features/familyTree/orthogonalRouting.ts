/**
 * Orthogonal routing utilities for family tree links
 * Implements Manhattan routing with line jumps and edge bundling
 */

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  type: 'horizontal' | 'vertical';
  start: Point;
  end: Point;
  edgeId: string;
  laneIndex: number;
}

export interface Edge {
  id: string;
  from: Point;
  to: Point;
  laneIndex: number;
  path: string; // SVG path string
  segments: Segment[];
}

const LANE_SPACING = 6; // Spacing between lanes in pixels
const JUMP_RADIUS = 4; // Radius of jump arc

/**
 * Route an edge orthogonally (Manhattan routing)
 * Returns a path with 2-3 segments: vertical -> horizontal -> vertical (or similar)
 */
export function routeEdgeOrthogonal(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  laneIndex: number = 0
): { path: string; segments: Segment[] } {
  const segments: Segment[] = [];
  let path = `M ${fromX} ${fromY}`;
  
  // Calculate lane offset (only for horizontal segments to avoid vertical overlap)
  const laneOffset = laneIndex * LANE_SPACING;
  
  // If mostly vertical, use simple vertical line
  if (Math.abs(toX - fromX) < 10) {
    segments.push({
      type: 'vertical',
      start: { x: fromX, y: fromY },
      end: { x: toX, y: toY },
      edgeId: '',
      laneIndex,
    });
    path += ` L ${toX} ${toY}`;
  }
  // If mostly horizontal, use simple horizontal line
  else if (Math.abs(toY - fromY) < 10) {
    segments.push({
      type: 'horizontal',
      start: { x: fromX, y: fromY },
      end: { x: toX, y: toY },
      edgeId: '',
      laneIndex,
    });
    path += ` L ${toX} ${toY}`;
  }
  // Otherwise, use L-shaped routing (vertical first, then horizontal)
  else {
    // Determine which direction to go first based on distance
    const verticalDistance = Math.abs(toY - fromY);
    const horizontalDistance = Math.abs(toX - fromX);
    
    if (verticalDistance > horizontalDistance) {
      // Go vertical first, then horizontal
      const midY = fromY + (toY - fromY) / 2;
      segments.push({
        type: 'vertical',
        start: { x: fromX, y: fromY },
        end: { x: fromX, y: midY },
        edgeId: '',
        laneIndex,
      });
      path += ` L ${fromX} ${midY}`;
      
      // Horizontal segment with lane offset
      const hX = toX + (toX > fromX ? laneOffset : -laneOffset);
      segments.push({
        type: 'horizontal',
        start: { x: fromX, y: midY },
        end: { x: hX, y: midY },
        edgeId: '',
        laneIndex,
      });
      path += ` L ${hX} ${midY}`;
      
      // Final vertical segment
      segments.push({
        type: 'vertical',
        start: { x: hX, y: midY },
        end: { x: toX, y: toY },
        edgeId: '',
        laneIndex,
      });
      path += ` L ${toX} ${toY}`;
    } else {
      // Go horizontal first, then vertical
      const midX = fromX + (toX - fromX) / 2;
      const hX = midX + (toX > fromX ? laneOffset : -laneOffset);
      
      segments.push({
        type: 'horizontal',
        start: { x: fromX, y: fromY },
        end: { x: hX, y: fromY },
        edgeId: '',
        laneIndex,
      });
      path += ` L ${hX} ${fromY}`;
      
      // Vertical segment
      segments.push({
        type: 'vertical',
        start: { x: hX, y: fromY },
        end: { x: toX, y: toY },
        edgeId: '',
        laneIndex,
      });
      path += ` L ${toX} ${toY}`;
    }
  }
  
  return { path, segments };
}

/**
 * Check if two segments intersect
 */
export function segmentsIntersect(seg1: Segment, seg2: Segment): Point | null {
  // Only check horizontal vs vertical intersections
  if (seg1.type === seg2.type) return null;
  
  const hSeg = seg1.type === 'horizontal' ? seg1 : seg2;
  const vSeg = seg1.type === 'vertical' ? seg1 : seg2;
  
  // Check if horizontal segment's Y is within vertical segment's Y range
  const hMinX = Math.min(hSeg.start.x, hSeg.end.x);
  const hMaxX = Math.max(hSeg.start.x, hSeg.end.x);
  const vMinY = Math.min(vSeg.start.y, vSeg.end.y);
  const vMaxY = Math.max(vSeg.start.y, vSeg.end.y);
  
  // Check if vertical segment's X is within horizontal segment's X range
  if (
    vSeg.start.x >= hMinX &&
    vSeg.start.x <= hMaxX &&
    hSeg.start.y >= vMinY &&
    hSeg.start.y <= vMaxY
  ) {
    return { x: vSeg.start.x, y: hSeg.start.y };
  }
  
  return null;
}

/**
 * Add a jump (bridge) to a path at the intersection point
 * Creates a small arc that goes over/under the intersecting line
 */
export function addJumpToPath(
  path: string,
  intersection: Point,
  isHorizontal: boolean
): string {
  const jumpRadius = JUMP_RADIUS;
  
  if (isHorizontal) {
    // Jump goes up (arc above the horizontal line)
    const beforeX = intersection.x - jumpRadius * 1.5;
    const afterX = intersection.x + jumpRadius * 1.5;
    const jumpY = intersection.y - jumpRadius;
    
    // Create a smooth arc using quadratic curves
    // Path: go to beforeX, then arc up and over, then continue
    const arcPath = `L ${beforeX} ${intersection.y} Q ${intersection.x} ${intersection.y} ${intersection.x} ${jumpY} Q ${intersection.x} ${intersection.y} ${afterX} ${intersection.y}`;
    
    // Try to insert the jump by finding the segment that contains the intersection
    // This is a simplified approach - for production, we'd parse and rebuild the path
    const parts = path.split(' ');
    let newPath = path;
    
    // Find and replace the segment containing the intersection
    for (let i = 0; i < parts.length - 2; i++) {
      if (parts[i] === 'L' && i + 2 < parts.length) {
        const x = parseFloat(parts[i + 1]);
        const y = parseFloat(parts[i + 2]);
        
        // Check if this segment is close to intersection
        if (Math.abs(x - intersection.x) < 1 && Math.abs(y - intersection.y) < 1) {
          // Replace this L command with the arc
          parts[i] = arcPath;
          parts.splice(i + 1, 2);
          newPath = parts.join(' ');
          break;
        }
      }
    }
    
    return newPath;
  } else {
    // Jump goes right (arc to the right of the vertical line)
    const beforeY = intersection.y - jumpRadius * 1.5;
    const afterY = intersection.y + jumpRadius * 1.5;
    const jumpX = intersection.x + jumpRadius;
    
    const arcPath = `L ${intersection.x} ${beforeY} Q ${intersection.x} ${intersection.y} ${jumpX} ${intersection.y} Q ${intersection.x} ${intersection.y} ${intersection.x} ${afterY}`;
    
    const parts = path.split(' ');
    let newPath = path;
    
    for (let i = 0; i < parts.length - 2; i++) {
      if (parts[i] === 'L' && i + 2 < parts.length) {
        const x = parseFloat(parts[i + 1]);
        const y = parseFloat(parts[i + 2]);
        
        if (Math.abs(x - intersection.x) < 1 && Math.abs(y - intersection.y) < 1) {
          parts[i] = arcPath;
          parts.splice(i + 1, 2);
          newPath = parts.join(' ');
          break;
        }
      }
    }
    
    return newPath;
  }
}

/**
 * Build a bus path for parent->children relationship
 * Returns paths for: parent trunks, bus bar, child branches
 */
export function buildBusPath(
  parentPoints: Point[],
  childPoints: Point[],
  busY: number,
  laneIndex: number = 0
): {
  parentTrunks: Array<{ path: string; segments: Segment[] }>;
  busBar: { path: string; segments: Segment[] };
  childBranches: Array<{ path: string; segments: Segment[] }>;
} {
  const laneOffset = laneIndex * LANE_SPACING;
  
  // Parent trunks: vertical lines from each parent to bus
  const parentTrunks = parentPoints.map((parent, idx) => {
    const trunkY = busY + laneOffset;
    const segments: Segment[] = [
      {
        type: 'vertical',
        start: parent,
        end: { x: parent.x, y: trunkY },
        edgeId: `parent-trunk-${idx}`,
        laneIndex,
      },
    ];
    return {
      path: `M ${parent.x} ${parent.y} L ${parent.x} ${trunkY}`,
      segments,
    };
  });
  
  // Bus bar: horizontal line spanning all parents and children
  const allX = [...parentPoints.map(p => p.x), ...childPoints.map(p => p.x)];
  const busStartX = Math.min(...allX) - 10;
  const busEndX = Math.max(...allX) + 10;
  const busBarY = busY + laneOffset;
  
  const busBar = {
    path: `M ${busStartX} ${busBarY} L ${busEndX} ${busBarY}`,
    segments: [
      {
        type: 'horizontal',
        start: { x: busStartX, y: busBarY },
        end: { x: busEndX, y: busBarY },
        edgeId: 'bus-bar',
        laneIndex,
      },
    ],
  };
  
  // Child branches: vertical lines from bus to each child
  const childBranches = childPoints.map((child, idx) => {
    const branchY = busBarY;
    const segments: Segment[] = [
      {
        type: 'vertical',
        start: { x: child.x, y: branchY },
        end: child,
        edgeId: `child-branch-${idx}`,
        laneIndex,
      },
    ];
    return {
      path: `M ${child.x} ${branchY} L ${child.x} ${child.y}`,
      segments,
    };
  });
  
  return { parentTrunks, busBar, childBranches };
}

/**
 * Get couple center point (port for children)
 */
export function getCoupleCenter(
  person1X: number,
  person1Y: number,
  person2X: number,
  person2Y: number
): Point {
  return {
    x: (person1X + person2X) / 2,
    y: Math.max(person1Y, person2Y),
  };
}

/**
 * Detect all intersections between edges and add jumps
 * For now, we'll mark intersections but not modify paths (to avoid complexity)
 * In production, you'd rebuild paths with proper arc insertion
 */
export function addJumpsToEdges(edges: Edge[]): Edge[] {
  // For simplicity, return edges as-is
  // In a full implementation, we'd:
  // 1. Detect intersections
  // 2. Determine which edge should jump (usually the one with lower priority)
  // 3. Rebuild the path with arc segments around intersection points
  // 4. Use proper SVG path commands (M, L, Q) to create smooth jumps
  
  // For now, we rely on lane spacing to minimize intersections
  // and the visual clarity of orthogonal routing
  return edges;
}

