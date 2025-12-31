import React from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../design-system/ThemeProvider';
import { Cluster, TreeNode } from './types';
import { PersonCard, CARD_WIDTH, CARD_HEIGHT } from './PersonCard';
import { useFamilyTreeStore } from '../../store/familyTreeStore';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
interface TreeRendererProps {
  clusters: Cluster[];
  scale: number;
  translateX: number;
  translateY: number;
  onNodePress: (personId: string) => void;
  renderLinksOnly?: boolean;
  renderCardsOnly?: boolean;
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
  renderLinksOnly = false,
  renderCardsOnly = false,
}) => {
  const { theme } = useTheme();
  const { selectedPersonId } = useFamilyTreeStore();
  // Use a large coordinate space for both SVG and cards
  // The parent Animated.View will apply zoom/pan transformations
  // So we work in a virtual coordinate space where (0,0) is the center
  const VIRTUAL_WIDTH = 2000;
  const VIRTUAL_HEIGHT = 2000;
  const centerX = VIRTUAL_WIDTH / 2;
  const centerY = VIRTUAL_HEIGHT / 2;
  // Transform layout coordinates (centered at 0,0) to virtual space (centered at centerX, centerY)
  const transformX = (x: number) => {
    if (isNaN(x) || !isFinite(x)) return centerX;
    return centerX + x;
  };
  const transformY = (y: number) => {
    if (isNaN(y) || !isFinite(y)) return centerY;
    return centerY + y;
  };
  // Render links between nodes with simple bus bundling (back to basics for reliability)
  const renderLinks = () => {
    const links: JSX.Element[] = [];
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
        const parentXs = group.parents.map((parent) => transformX(parent.position.x));
        const parentBottomYs = group.parents.map(
          (parent) => transformY(parent.position.y) + CARD_HEIGHT / 2
        );
        const childXs = group.children.map((child) => transformX(child.position.x));
        const childTopYs = group.children.map(
          (child) => transformY(child.position.y) - CARD_HEIGHT / 2
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
        const nodeX = transformX(node.position.x);
        const nodeY = transformY(node.position.y);
        
        if (person.partnerId) {
          const partnerLinkKey = [node.person.id, person.partnerId].sort().join('-');
          if (!processedLinks.has(`partner-${partnerLinkKey}`)) {
            processedLinks.add(`partner-${partnerLinkKey}`);
            const partnerNode = cluster.nodes.find((n) => n.person.id === person.partnerId);
            if (partnerNode) {
              const partnerX = transformX(partnerNode.position.x);
              const partnerY = transformY(partnerNode.position.y);
              
              // Only draw if partners are on the same level (within 10px)
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
          viewBox={`0 0 ${VIRTUAL_WIDTH} ${VIRTUAL_HEIGHT}`}
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
            const x = transformX(node.position.x);
            const y = transformY(node.position.y);
            const isSelected = selectedPersonId === node.person.id;
            if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
              console.warn(`Invalid coordinates for node ${node.person.id}: x=${x}, y=${y}`);
              return null;
            }
            return (
              <View
                key={`card-${clusterIndex}-${node.person.id}`}
                style={[
                  styles.cardContainer,
                  {
                    left: x - CARD_WIDTH / 2 - VIRTUAL_WIDTH / 2,
                    top: y - CARD_HEIGHT / 2 - VIRTUAL_HEIGHT / 2,
                  },
                ]}
              >
                <PersonCard
                  person={node.person}
                  onPress={onNodePress}
                  isSelected={isSelected}
                />
              </View>
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
        viewBox={`0 0 ${VIRTUAL_WIDTH} ${VIRTUAL_HEIGHT}`}
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
          const x = transformX(node.position.x);
          const y = transformY(node.position.y);
          const isSelected = selectedPersonId === node.person.id;
          if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
            console.warn(`Invalid coordinates for node ${node.person.id}: x=${x}, y=${y}`);
            return null;
          }
          return (
            <TouchableOpacity
              key={`card-${clusterIndex}-${node.person.id}`}
              style={[
                styles.cardContainer,
                {
                  left: x - CARD_WIDTH / 2 - VIRTUAL_WIDTH / 2,
                  top: y - CARD_HEIGHT / 2 - VIRTUAL_HEIGHT / 2,
                  zIndex: 100,
                },
              ]}
              activeOpacity={0.9}
              onPress={(e) => {
                console.log('🎯 Card TouchableOpacity pressed:', node.person.id);
                onNodePress(node.person.id);
              }}
            >
              <PersonCard
                person={node.person}
                onPress={() => {}}
                isSelected={isSelected}
              />
            </TouchableOpacity>
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
  },
  cardContainer: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
});
