import React, { useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, PanResponder, Animated } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../design-system/ThemeProvider';
import { Cluster, TreeNode } from './types';
import { PersonCard, CARD_WIDTH, CARD_HEIGHT } from './PersonCard';
import { useFamilyTreeStore } from '../../store/familyTreeStore';

// Use a large coordinate space for both SVG and cards
// The parent Animated.View will apply zoom/pan transformations
// So we work in a virtual coordinate space where (0,0) is the center
const VIRTUAL_WIDTH = 2000;
const VIRTUAL_HEIGHT = 2000;
// ViewBox must match the coordinate space used by transformX/transformY
// transformX returns centerX + x, where centerX = 1000
// Layout coordinates typically range from -1000 to +1000, transforming to 0-2000
// ViewBox: 0,0 to 2000,2000 matches the normal transformed coordinate range
// This ensures links are rendered correctly
const VIEWBOX_X = 0;
const VIEWBOX_Y = 0;
const VIEWBOX_WIDTH = VIRTUAL_WIDTH;
const VIEWBOX_HEIGHT = VIRTUAL_HEIGHT;

// Component for draggable card - separate component to allow proper hooks usage
const DraggableCard: React.FC<{
  node: TreeNode;
  x: number;
  y: number;
  isSelected: boolean;
  isEditMode: boolean;
  scale: number;
  onNodePress: (personId: string) => void;
  onPositionChange?: (personId: string, x: number, y: number) => void;
  onNodeHide?: (personId: string) => void;
  canEdit?: boolean;
  selfPersonId?: string;
  treeId?: string;
  draggingNodeId: React.MutableRefObject<string | null>;
  dragStartPosition: React.MutableRefObject<{ x: number; y: number } | null>;
  customPositions: Record<string, { x: number; y: number }>;
  updateCustomPosition: (personId: string, x: number, y: number) => void;
  onDragOffsetChange?: (personId: string, offset: { x: number; y: number } | null) => void;
}> = ({
  node,
  x,
  y,
  isSelected,
  isEditMode,
  scale,
  onNodePress,
  onPositionChange,
  onNodeHide,
  canEdit = false,
  selfPersonId,
  treeId,
  draggingNodeId,
  dragStartPosition,
  customPositions,
  updateCustomPosition,
  onDragOffsetChange,
}) => {
  // ⚠️ LOG DE RENDER - doit apparaître à chaque re-render
  // console.log('🔄 DraggableCard RENDER for:', node.person.id, 'isEditMode:', isEditMode);
  
  const baseX = customPositions[node.person.id]?.x ?? node.position.x;
  const baseY = customPositions[node.person.id]?.y ?? node.position.y;
  const basePositionRef = useRef({ x: baseX, y: baseY });
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  
  // Force re-render when isEditMode changes
  React.useEffect(() => {
    // console.log('🔄 DraggableCard effect - isEditMode:', isEditMode, 'for node:', node.person.id);
  }, [isEditMode, node.person.id]);

  React.useEffect(() => {
    if (!isDraggingRef.current) {
      basePositionRef.current = { x: baseX, y: baseY };
    }
  }, [baseX, baseY]);
  
  const panResponder = useMemo(() => {
    // console.log('🔧 useMemo called for:', node.person.id, 'isEditMode:', isEditMode);
    if (!isEditMode) {
      return null;
    }
    // console.log('✅ Creating PanResponder for node:', node.person.id);
    
    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // console.log('🎯 onStartShouldSetPanResponder - returning true for:', node.person.id);
        return true;
      },
      onStartShouldSetPanResponderCapture: () => {
        // console.log('🎯 onStartShouldSetPanResponderCapture - returning true for:', node.person.id);
        return true;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const shouldMove = Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
        // if (shouldMove) {
        //   console.log('🎯 onMoveShouldSetPanResponder - returning true for:', node.person.id, 'dx:', gestureState.dx, 'dy:', gestureState.dy);
        // }
        return shouldMove;
      },
      onPanResponderGrant: () => {
        draggingNodeId.current = node.person.id;
        dragStartPosition.current = { ...basePositionRef.current };
        isDraggingRef.current = true;
        dragOffset.setValue({ x: 0, y: 0 });
        dragOffsetRef.current = { x: 0, y: 0 };
        if (onDragOffsetChange) {
          onDragOffsetChange(node.person.id, { x: 0, y: 0 });
        }
        console.log('🟢 CARD DRAG START - Person:', node.person.id, 'Position initiale X:', basePositionRef.current.x.toFixed(1), 'Y:', basePositionRef.current.y.toFixed(1));
      },
      onPanResponderMove: (evt, gestureState) => {
        if (draggingNodeId.current === node.person.id && dragStartPosition.current) {
          const dx = gestureState.dx / scale;
          const dy = gestureState.dy / scale;
          dragOffset.setValue({ x: dx, y: dy });
          dragOffsetRef.current = { x: dx, y: dy };
          if (onDragOffsetChange) {
            onDragOffsetChange(node.person.id, { x: dx, y: dy });
          }
          const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
          console.log('➡️ CARD DRAG - Person:', node.person.id, 'Position X:', (basePositionRef.current.x + dx).toFixed(1), 'Y:', (basePositionRef.current.y + dy).toFixed(1), 'Distance:', distance.toFixed(1));
        }
      },
      onPanResponderRelease: () => {
        if (draggingNodeId.current === node.person.id) {
          const finalX = basePositionRef.current.x + dragOffsetRef.current.x;
          const finalY = basePositionRef.current.y + dragOffsetRef.current.y;
          const totalDistance = Math.sqrt(dragOffsetRef.current.x * dragOffsetRef.current.x + dragOffsetRef.current.y * dragOffsetRef.current.y);
          console.log('🔴 CARD DRAG END - Person:', node.person.id, 'Position finale X:', finalX.toFixed(1), 'Y:', finalY.toFixed(1), 'Distance totale:', totalDistance.toFixed(1));
          updateCustomPosition(node.person.id, finalX, finalY);
          if (treeId && onPositionChange) {
            // console.log('💾 Saving position for:', node.person.id, { x: finalX, y: finalY });
            onPositionChange(node.person.id, finalX, finalY);
          }
        }
        dragOffset.setValue({ x: 0, y: 0 });
        dragOffsetRef.current = { x: 0, y: 0 };
        isDraggingRef.current = false;
        if (onDragOffsetChange) {
          onDragOffsetChange(node.person.id, null);
        }
        draggingNodeId.current = null;
        dragStartPosition.current = null;
      },
      onPanResponderTerminate: () => {
        // console.log('🎯 Drag TERMINATED for:', node.person.id);
        dragOffset.setValue({ x: 0, y: 0 });
        dragOffsetRef.current = { x: 0, y: 0 };
        isDraggingRef.current = false;
        if (onDragOffsetChange) {
          onDragOffsetChange(node.person.id, null);
        }
        draggingNodeId.current = null;
        dragStartPosition.current = null;
      },
    });
  }, [isEditMode, node.person.id, scale, treeId, onPositionChange, updateCustomPosition, dragOffset]);
  
  const cardStyle = [
    styles.cardContainer,
    {
      left: x - CARD_WIDTH / 2 - VIRTUAL_WIDTH / 2,
      top: y - CARD_HEIGHT / 2 - VIRTUAL_HEIGHT / 2,
      zIndex: isEditMode && draggingNodeId.current === node.person.id ? 200 : 100,
      opacity: isEditMode && draggingNodeId.current === node.person.id ? 0.8 : 1,
    },
  ];
  
  // Debug: log render decision
  // console.log('🎨 DraggableCard render decision for:', node.person.id, {
  //   isEditMode,
  //   hasPanResponder: !!panResponder,
  //   willRenderView: isEditMode && panResponder,
  // });
  
  // In edit mode with PanResponder, use View with PanResponder
  if (isEditMode && panResponder) {
    // console.log('✅ Rendering draggable View for:', node.person.id);
    return (
      <Animated.View
        style={[...cardStyle, { transform: dragOffset.getTranslateTransform() }]}
        {...panResponder.panHandlers}
      >
        <PersonCard
          person={node.person}
          onPress={() => {}}
          isSelected={isSelected}
          disableTouch={true}
          isSelf={selfPersonId === node.person.id}
          onHide={onNodeHide}
          canEdit={canEdit}
        />
      </Animated.View>
    );
  }
  
  // Normal mode: use TouchableOpacity
  // console.log('📌 Rendering TouchableOpacity for:', node.person.id, 'isEditMode:', isEditMode, 'panResponder:', !!panResponder);
  return (
    <TouchableOpacity
      style={cardStyle}
      activeOpacity={0.9}
      onPress={() => {
        if (!isEditMode) {
          onNodePress(node.person.id);
        }
      }}
    >
      <PersonCard
        person={node.person}
        onPress={() => {}}
        isSelected={isSelected}
        disableTouch={true}
        isSelf={selfPersonId === node.person.id}
        onHide={onNodeHide}
        canEdit={canEdit}
      />
    </TouchableOpacity>
  );
};
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
interface TreeRendererProps {
  clusters: Cluster[];
  scale: number;
  translateX: number;
  translateY: number;
  onNodePress: (personId: string) => void;
  onNodePositionChange?: (personId: string, x: number, y: number) => void;
  onNodeHide?: (personId: string) => void;
  canEdit?: boolean;
  selfPersonId?: string;
  renderLinksOnly?: boolean;
  renderCardsOnly?: boolean;
  treeId?: string;
}
const LINK_STROKE_WIDTH = 2.5;
const LINK_COLOR = '#888888'; // Gris plus foncé pour meilleure visibilité
const LINK_PARENT_BAR_GAP = 20;
export const TreeRenderer: React.FC<TreeRendererProps> = ({
  clusters,
  scale,
  translateX,
  translateY,
  onNodePress,
  onNodePositionChange,
  onNodeHide,
  canEdit = false,
  selfPersonId,
  renderLinksOnly = false,
  renderCardsOnly = false,
  treeId,
}) => {
  const { theme } = useTheme();
  const { selectedPersonId, isEditMode, customPositions, updateCustomPosition } = useFamilyTreeStore();
  const draggingNodeId = useRef<string | null>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const draggingOffsetsRef = useRef(new Map<string, { x: number; y: number }>());
  const [dragVersion, setDragVersion] = React.useState(0);
  const dragFrameRef = useRef<number | null>(null);

  const scheduleDragRerender = useCallback(() => {
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;
      setDragVersion((value) => value + 1);
    });
  }, []);

  const handleDragOffsetChange = useCallback(
    (personId: string, offset: { x: number; y: number } | null) => {
      if (offset) {
        draggingOffsetsRef.current.set(personId, offset);
      } else {
        draggingOffsetsRef.current.delete(personId);
      }
      scheduleDragRerender();
    },
    [scheduleDragRerender]
  );
  
  // Debug: log edit mode changes
  React.useEffect(() => {
    // console.log('🔧 TreeRenderer - isEditMode changed to:', isEditMode);
  }, [isEditMode]);
  
  const centerX = VIRTUAL_WIDTH / 2;
  const centerY = VIRTUAL_HEIGHT / 2;
  // Transform layout coordinates (centered at 0,0) to virtual space (centered at centerX, centerY)
  // Allow negative values and values beyond VIRTUAL_WIDTH/HEIGHT to support panning
  const transformX = (x: number) => {
    if (isNaN(x) || !isFinite(x)) return centerX;
    return centerX + x;
  };
  const transformY = (y: number) => {
    if (isNaN(y) || !isFinite(y)) return centerY;
    return centerY + y;
  };
  const getNodeBasePosition = (node: TreeNode) => {
    const customPos = customPositions[node.person.id];
    const dragOffset = draggingOffsetsRef.current.get(node.person.id);
    return {
      x: (customPos ? customPos.x : node.position.x) + (dragOffset?.x ?? 0),
      y: (customPos ? customPos.y : node.position.y) + (dragOffset?.y ?? 0),
    };
  };
  // Render links between nodes with simple bus bundling (back to basics for reliability)
  const renderLinks = () => {
    const links: React.ReactElement[] = [];
    const processedLinks = new Set<string>();
    
    clusters.forEach((cluster) => {
      const nodeById = new Map(cluster.nodes.map((node) => [node.person.id, node]));
      const parentGroups = new Map<string, { parents: TreeNode[]; children: TreeNode[] }>();
      
      // Group children by their parents
      cluster.nodes.forEach((node) => {
        const parentNodes = node.person.parentIds
          .map((parentId) => nodeById.get(parentId))
          .filter(Boolean) as TreeNode[];
        if (parentNodes.length === 0) return;
        const parentKey = parentNodes.map((parent) => parent.person.id).sort().join('|');
        const group = parentGroups.get(parentKey);
        if (group) {
          group.children.push(node);
        } else {
          parentGroups.set(parentKey, { parents: parentNodes, children: [node] });
        }
      });
      
      // Render parent->children relationships with bus bundling
      parentGroups.forEach((group, groupKey) => {
        const parentXs = group.parents.map((parent) => transformX(getNodeBasePosition(parent).x));
        const parentBottomYs = group.parents.map(
          (parent) => transformY(getNodeBasePosition(parent).y) + CARD_HEIGHT / 2
        );
        const childXs = group.children.map((child) => transformX(getNodeBasePosition(child).x));
        const childTopYs = group.children.map(
          (child) => transformY(getNodeBasePosition(child).y) - CARD_HEIGHT / 2
        );
        
        const minParentX = Math.min(...parentXs);
        const maxParentX = Math.max(...parentXs);
        const minChildX = Math.min(...childXs);
        const maxChildX = Math.max(...childXs);
        const barStartX = Math.min(minParentX, minChildX);
        const barEndX = Math.max(maxParentX, maxChildX);
        const barY = Math.max(...parentBottomYs) + LINK_PARENT_BAR_GAP;
        
        // Parent trunks: vertical lines from each parent to bus
        group.parents.forEach((parent, index) => {
          const parentX = parentXs[index];
          const parentBottomY = parentBottomYs[index];
          links.push(
            <Line
              key={`link-parent-v-${groupKey}-${parent.person.id}-${barY}`}
              x1={parentX}
              y1={parentBottomY}
              x2={parentX}
              y2={barY}
              stroke={LINK_COLOR}
              strokeWidth={LINK_STROKE_WIDTH}
              strokeOpacity={0.8}
              strokeLinecap="round"
            />
          );
        });
        
        // Bus bar: horizontal line
        if (Math.abs(barEndX - barStartX) > 1) {
          links.push(
            <Line
              key={`link-parent-bar-${groupKey}-${barStartX}-${barEndX}-${barY}`}
              x1={barStartX}
              y1={barY}
              x2={barEndX}
              y2={barY}
              stroke={LINK_COLOR}
              strokeWidth={LINK_STROKE_WIDTH}
              strokeOpacity={0.8}
              strokeLinecap="round"
            />
          );
        }
        
        // Child branches: vertical lines from bus to each child
        group.children.forEach((child, index) => {
          const childX = childXs[index];
          const childTopY = childTopYs[index];
          links.push(
            <Line
              key={`link-child-v-${groupKey}-${child.person.id}-${barY}`}
              x1={childX}
              y1={barY}
              x2={childX}
              y2={childTopY}
              stroke={LINK_COLOR}
              strokeWidth={LINK_STROKE_WIDTH}
              strokeOpacity={0.8}
              strokeLinecap="round"
            />
          );
        });
      });
      
      // Partner links (horizontal between partners)
      cluster.nodes.forEach((node) => {
        const person = node.person;
        const nodeBase = getNodeBasePosition(node);
        const nodeX = transformX(nodeBase.x);
        const nodeY = transformY(nodeBase.y);
        
        if (person.partnerId) {
          const partnerLinkKey = [node.person.id, person.partnerId].sort().join('-');
          if (!processedLinks.has(`partner-${partnerLinkKey}`)) {
            processedLinks.add(`partner-${partnerLinkKey}`);
            const partnerNode = cluster.nodes.find((n) => n.person.id === person.partnerId);
            if (partnerNode) {
              const partnerBase = getNodeBasePosition(partnerNode);
              const partnerX = transformX(partnerBase.x);
              const partnerY = transformY(partnerBase.y);

              if (Math.abs(nodeY - partnerY) < 10) {
                const cardCenterY = nodeY;
                links.push(
                  <Line
                    key={`link-partner-${partnerLinkKey}`}
                    x1={nodeX}
                    y1={cardCenterY}
                    x2={partnerX}
                    y2={cardCenterY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                  />
                );
              } else {
                const midY = (nodeY + partnerY) / 2;
                links.push(
                  <Line
                    key={`link-partner-v1-${partnerLinkKey}`}
                    x1={nodeX}
                    y1={nodeY}
                    x2={nodeX}
                    y2={midY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                  />
                );
                links.push(
                  <Line
                    key={`link-partner-h-${partnerLinkKey}`}
                    x1={nodeX}
                    y1={midY}
                    x2={partnerX}
                    y2={midY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                  />
                );
                links.push(
                  <Line
                    key={`link-partner-v2-${partnerLinkKey}`}
                    x1={partnerX}
                    y1={midY}
                    x2={partnerX}
                    y2={partnerY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                  />
                );
              }
            }
          }
        }
      });
    });
    
    return links;
  };
  if (clusters.length === 0 || clusters.reduce((sum, c) => sum + c.nodes.length, 0) === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.text }}>Aucun nœud à afficher</Text>
      </View>
    );
  }
  // Render only links
  if (renderLinksOnly) {
    return (
      <View style={styles.container} pointerEvents="none">
        <Svg
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          viewBox={`${VIEWBOX_X} ${VIEWBOX_Y} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={[
            {
              position: 'absolute',
              left: -VIRTUAL_WIDTH / 2,
              top: -VIRTUAL_HEIGHT / 2,
            },
          ]}
          pointerEvents="none"
        >
          {renderLinks()}
        </Svg>
      </View>
    );
  }
  // Render only cards
  if (renderCardsOnly) {
    return (
      <View style={styles.container} pointerEvents="box-none">
        {clusters.map((cluster, clusterIndex) =>
          cluster.nodes.map((node) => {
            // Use custom position if available, otherwise use layout position
            const customPos = customPositions[node.person.id];
            const baseX = customPos ? customPos.x : node.position.x;
            const baseY = customPos ? customPos.y : node.position.y;

            const x = transformX(baseX);
            const y = transformY(baseY);
            const isSelected = selectedPersonId === node.person.id;
            if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
              console.warn(`Invalid coordinates for node ${node.person.id}: x=${x}, y=${y}`);
              return null;
            }
            return (
              <DraggableCard
                key={`card-${clusterIndex}-${node.person.id}-${isEditMode ? 'edit' : 'view'}`}
                node={node}
                x={x}
                y={y}
                isSelected={isSelected}
                isEditMode={isEditMode}
                scale={scale}
                onNodePress={onNodePress}
                onPositionChange={onNodePositionChange}
                onNodeHide={onNodeHide}
                canEdit={canEdit}
                selfPersonId={selfPersonId}
                treeId={treeId}
                draggingNodeId={draggingNodeId}
                dragStartPosition={dragStartPosition}
                customPositions={customPositions}
                updateCustomPosition={updateCustomPosition}
              onDragOffsetChange={handleDragOffsetChange}
              />
            );
          })
        )}
      </View>
    );
  }
  // Default: render both
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* SVG for links */}
      <Svg
        width={VIRTUAL_WIDTH}
        height={VIRTUAL_HEIGHT}
        viewBox={`${VIEWBOX_X} ${VIEWBOX_Y} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        style={[
          {
            position: 'absolute',
            left: -VIRTUAL_WIDTH / 2,
            top: -VIRTUAL_HEIGHT / 2,
            zIndex: 0,
          },
        ]}
        pointerEvents="none"
      >
        {renderLinks()}
      </Svg>
      {/* Person cards */}
      {clusters.map((cluster, clusterIndex) =>
        cluster.nodes.map((node) => {
          // Use custom position if available, otherwise use layout position
          const customPos = customPositions[node.person.id];
          const baseX = customPos ? customPos.x : node.position.x;
          const baseY = customPos ? customPos.y : node.position.y;
          
          const x = transformX(baseX);
          const y = transformY(baseY);
          const isSelected = selectedPersonId === node.person.id;
          
          if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            console.warn(`Invalid coordinates for node ${node.person.id}: x=${x}, y=${y}`);
            return null;
          }
          
          return (
            <DraggableCard
              key={`card-${clusterIndex}-${node.person.id}-${isEditMode ? 'edit' : 'view'}`}
              node={node}
              x={x}
              y={y}
              isSelected={isSelected}
              isEditMode={isEditMode}
              scale={scale}
              onNodePress={onNodePress}
              onPositionChange={onNodePositionChange}
              onNodeHide={onNodeHide}
              canEdit={canEdit}
              selfPersonId={selfPersonId}
              treeId={treeId}
              draggingNodeId={draggingNodeId}
              dragStartPosition={dragStartPosition}
              customPositions={customPositions}
              updateCustomPosition={updateCustomPosition}
              onDragOffsetChange={handleDragOffsetChange}
            />
          );
        })
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'visible',
  },
  cardContainer: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
});
