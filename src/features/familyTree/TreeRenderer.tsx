import React from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '../../design-system/ThemeProvider';
import { Cluster } from './types';
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

const LINK_STROKE_WIDTH = 2;
const LINK_COLOR = '#B0B0B0'; // Gris moyen pour meilleure visibilité

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

  // Render links between nodes
  const renderLinks = () => {
    const links: JSX.Element[] = [];
    const processedLinks = new Set<string>(); // Track processed links to avoid duplicates

    clusters.forEach((cluster) => {
      cluster.nodes.forEach((node) => {
        const person = node.person;
        const nodeX = transformX(node.position.x);
        const nodeY = transformY(node.position.y);

        // Links to parents - vertical lines from child to parent
        person.parentIds.forEach((parentId) => {
          const linkKey = [node.person.id, parentId].sort().join('-');
          if (!processedLinks.has(linkKey)) {
            processedLinks.add(linkKey);
            const parentNode = cluster.nodes.find((n) => n.person.id === parentId);
            if (parentNode) {
              const parentX = transformX(parentNode.position.x);
              const parentY = transformY(parentNode.position.y);

              // Calculate connection points at card edges
              const childTopY = nodeY - CARD_HEIGHT / 2;
              const parentBottomY = parentY + CARD_HEIGHT / 2;
              
              // Vertical line from child top to parent level
              const midY = (childTopY + parentBottomY) / 2;

              // Vertical line from child top upward
              links.push(
                <Line
                  key={`link-parent-v-${linkKey}`}
                  x1={nodeX}
                  y1={childTopY}
                  x2={nodeX}
                  y2={midY}
                  stroke={LINK_COLOR}
                  strokeWidth={LINK_STROKE_WIDTH}
                  strokeOpacity={0.7}
                  strokeLinecap="round"
                />
              );

              // Horizontal line connecting to parent (if not aligned)
              if (Math.abs(nodeX - parentX) > 15) {
                links.push(
                  <Line
                    key={`link-parent-h-${linkKey}`}
                    x1={nodeX}
                    y1={midY}
                    x2={parentX}
                    y2={midY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                  />
                );
                
                // Vertical line from horizontal to parent bottom
                links.push(
                  <Line
                    key={`link-parent-v2-${linkKey}`}
                    x1={parentX}
                    y1={midY}
                    x2={parentX}
                    y2={parentBottomY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                  />
                );
              } else {
                // Direct vertical line if aligned (within 15px)
                links.push(
                  <Line
                    key={`link-parent-direct-${linkKey}`}
                    x1={nodeX}
                    y1={midY}
                    x2={nodeX}
                    y2={parentBottomY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.7}
                    strokeLinecap="round"
                  />
                );
              }
            }
          }
        });

        // Link to partner - horizontal line between partners
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
                // Connect at the middle height of the cards for better visual connection
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
