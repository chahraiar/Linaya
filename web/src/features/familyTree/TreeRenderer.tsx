import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Cluster, TreeNode } from './types';
import { PersonCard, CARD_WIDTH, CARD_HEIGHT } from './PersonCard';
import { useFamilyTreeStore } from '../../store/familyTreeStore';
import './TreeRenderer.css';

interface TreeRendererProps {
  clusters: Cluster[];
  scale: number;
  translateX: number;
  translateY: number;
  onNodePress: (personId: string) => void;
  onNodePositionChange?: (personId: string, x: number, y: number) => void;
  onNodeHide?: (personId: string) => void;
  canEdit?: boolean;
  treeId?: string;
  selfPersonId?: string;
}

const VIRTUAL_WIDTH = 2000;
const VIRTUAL_HEIGHT = 2000;

const TreeRenderer: React.FC<TreeRendererProps> = ({
  clusters,
  scale,
  translateX,
  translateY,
  onNodePress,
  onNodePositionChange,
  onNodeHide,
  canEdit = false,
  treeId,
  selfPersonId,
}) => {
  const { selectedPersonId, isEditMode, customPositions, updateCustomPosition } = useFamilyTreeStore();
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const centerX = VIRTUAL_WIDTH / 2;
  const centerY = VIRTUAL_HEIGHT / 2;

  const transformX = (x: number) => {
    if (isNaN(x) || !isFinite(x)) return centerX;
    return centerX + x;
  };

  const transformY = (y: number) => {
    if (isNaN(y) || !isFinite(y)) return centerY;
    return centerY + y;
  };

  const dragStartMousePos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, node: TreeNode) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const customPos = customPositions[node.person.id];
    const baseX = customPos ? customPos.x : node.position.x;
    const baseY = customPos ? customPos.y : node.position.y;
    
    setDraggingNodeId(node.person.id);
    dragStartPosition.current = { x: baseX, y: baseY };
    dragStartMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isEditMode, customPositions]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingNodeId || !dragStartPosition.current || !dragStartMousePos.current) return;
    
    const node = clusters
      .flatMap((c) => c.nodes)
      .find((n) => n.person.id === draggingNodeId);
    
    if (!node) return;
    
    // Calculate mouse movement in screen coordinates
    const dx = e.clientX - dragStartMousePos.current.x;
    const dy = e.clientY - dragStartMousePos.current.y;
    
    // Convert screen movement to virtual space movement (accounting for scale)
    const virtualDx = dx / scale;
    const virtualDy = dy / scale;
    
    // Apply to the base position
    const newX = dragStartPosition.current.x + virtualDx;
    const newY = dragStartPosition.current.y + virtualDy;
    
    updateCustomPosition(draggingNodeId, newX, newY);
  }, [draggingNodeId, clusters, scale, updateCustomPosition]);

  const handleMouseUp = useCallback(() => {
    if (draggingNodeId && treeId && onNodePositionChange) {
      const finalPos = customPositions[draggingNodeId];
      if (finalPos) {
        onNodePositionChange(draggingNodeId, finalPos.x, finalPos.y);
      }
    }
    setDraggingNodeId(null);
    dragStartPosition.current = null;
    dragStartMousePos.current = null;
  }, [draggingNodeId, treeId, onNodePositionChange, customPositions]);

  useEffect(() => {
    if (draggingNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingNodeId, handleMouseMove, handleMouseUp]);

  const renderLinks = useMemo(() => {
    const links: JSX.Element[] = [];
    const processedLinks = new Set<string>();

    clusters.forEach((cluster) => {
      const nodeById = new Map(cluster.nodes.map((node) => [node.person.id, node]));

      cluster.nodes.forEach((node) => {
        // Parent-child links
        node.person.childrenIds.forEach((childId) => {
          const childNode = nodeById.get(childId);
          if (!childNode) return;

          const linkKey = `${node.person.id}-${childId}`;
          if (processedLinks.has(linkKey)) return;
          processedLinks.add(linkKey);

          const customPosParent = customPositions[node.person.id];
          const customPosChild = customPositions[childId];
          const parentX = customPosParent ? customPosParent.x : node.position.x;
          const parentY = customPosParent ? customPosParent.y : node.position.y;
          const childX = customPosChild ? customPosChild.x : childNode.position.x;
          const childY = customPosChild ? customPosChild.y : childNode.position.y;

          const x1 = centerX + parentX;
          const y1 = centerY + parentY + CARD_HEIGHT / 2;
          const x2 = centerX + childX;
          const y2 = centerY + childY - CARD_HEIGHT / 2;

          links.push(
            <line
              key={linkKey}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#888"
              strokeWidth="2"
              opacity="0.6"
            />
          );
        });

        // Partner links
        if (node.person.partnerId) {
          const partnerNode = nodeById.get(node.person.partnerId);
          if (!partnerNode) return;

          const linkKey = [node.person.id, partnerNode.person.id].sort().join('-');
          if (processedLinks.has(linkKey)) return;
          processedLinks.add(linkKey);

          const customPos1 = customPositions[node.person.id];
          const customPos2 = customPositions[partnerNode.person.id];
          const x1 = customPos1 ? customPos1.x : node.position.x;
          const y1 = customPos1 ? customPos1.y : node.position.y;
          const x2 = customPos2 ? customPos2.x : partnerNode.position.x;
          const y2 = customPos2 ? customPos2.y : partnerNode.position.y;

          links.push(
            <line
              key={linkKey}
              x1={centerX + x1 + CARD_WIDTH / 2}
              y1={centerY + y1}
              x2={centerX + x2 - CARD_WIDTH / 2}
              y2={centerY + y2}
              stroke="#888"
              strokeWidth="2"
              opacity="0.6"
            />
          );
        }
      });
    });

    return links;
  }, [clusters, customPositions, centerX, centerY]);

  return (
    <div ref={containerRef} className="tree-renderer">
      <div
        className="tree-svg-container"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: VIRTUAL_WIDTH,
          height: VIRTUAL_HEIGHT,
          marginLeft: -VIRTUAL_WIDTH / 2,
          marginTop: -VIRTUAL_HEIGHT / 2,
          zIndex: 0,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: 'center center',
          pointerEvents: 'none',
        }}
      >
        <svg
          className="tree-svg"
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          style={{
            display: 'block',
          }}
        >
          {renderLinks}
        </svg>
      </div>
      <div
        className="tree-nodes"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: VIRTUAL_WIDTH,
          height: VIRTUAL_HEIGHT,
          marginLeft: -VIRTUAL_WIDTH / 2,
          marginTop: -VIRTUAL_HEIGHT / 2,
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {clusters.map((cluster) =>
          cluster.nodes.map((node) => {
            const customPos = customPositions[node.person.id];
            const baseX = customPos ? customPos.x : node.position.x;
            const baseY = customPos ? customPos.y : node.position.y;

            const x = transformX(baseX);
            const y = transformY(baseY);
            const isSelected = selectedPersonId === node.person.id;
            const isSelf = selfPersonId === node.person.id;

            if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
              return null;
            }

            if (isSelf) {
              console.log('🎯 Rendering self person card:', node.person.firstName, node.person.lastName, 'isSelf:', isSelf);
            }

            return (
              <div
                key={`card-${cluster.id}-${node.person.id}`}
                className="tree-node"
                style={{
                  left: `${x - CARD_WIDTH / 2}px`,
                  top: `${y - CARD_HEIGHT / 2}px`,
                  position: 'absolute',
                  zIndex: isEditMode && draggingNodeId === node.person.id ? 200 : 100,
                  opacity: isEditMode && draggingNodeId === node.person.id ? 0.8 : 1,
                  cursor: isEditMode ? 'move' : 'pointer',
                }}
                onMouseDown={(e) => handleMouseDown(e, node)}
              >
                <PersonCard
                  person={node.person}
                  onPress={onNodePress}
                  isSelected={isSelected}
                  disableTouch={isEditMode}
                  isSelf={isSelf}
                  onHide={onNodeHide}
                  canEdit={canEdit}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TreeRenderer;

