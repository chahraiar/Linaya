import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
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
}

const LINK_STROKE_WIDTH = 2;
const LINK_COLOR = '#B0B0B0'; // Gris moyen pour meilleure visibilité

export const TreeRenderer: React.FC<TreeRendererProps> = ({
  clusters,
  scale,
  translateX,
  translateY,
  onNodePress,
}) => {
  const { theme } = useTheme();
  const { selectedPersonId } = useFamilyTreeStore();

  // Calculate SVG viewBox dimensions
  const svgWidth = SCREEN_WIDTH * 3;
  const svgHeight = SCREEN_HEIGHT * 3;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Transform coordinates - center the tree (scale/translate handled by parent Animated.View)
  const transformX = (x: number) => centerX + x;
  const transformY = (y: number) => centerY + y;

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

              links.push(
                <Line
                  key={`link-parent-v-${linkKey}`}
                  x1={nodeX}
                  y1={childTopY}
                  x2={nodeX}
                  y2={midY}
                  stroke={LINK_COLOR}
                  strokeWidth={LINK_STROKE_WIDTH}
                  strokeOpacity={0.5}
                  strokeLinecap="round"
                />
              );

              // Horizontal line connecting to parent
              if (Math.abs(nodeX - parentX) > 10) {
                links.push(
                  <Line
                    key={`link-parent-h-${linkKey}`}
                    x1={nodeX}
                    y1={midY}
                    x2={parentX}
                    y2={midY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.5}
                    strokeLinecap="round"
                  />
                );
                
                // Vertical line from horizontal to parent
                links.push(
                  <Line
                    key={`link-parent-v2-${linkKey}`}
                    x1={parentX}
                    y1={midY}
                    x2={parentX}
                    y2={parentBottomY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.5}
                    strokeLinecap="round"
                  />
                );
              } else {
                // Direct vertical line if aligned
                links.push(
                  <Line
                    key={`link-parent-direct-${linkKey}`}
                    x1={nodeX}
                    y1={midY}
                    x2={nodeX}
                    y2={parentBottomY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.5}
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
                // Connect at the middle of the cards
                links.push(
                  <Line
                    key={`link-partner-${partnerLinkKey}`}
                    x1={nodeX}
                    y1={nodeY}
                    x2={partnerX}
                    y2={partnerY}
                    stroke={LINK_COLOR}
                    strokeWidth={LINK_STROKE_WIDTH}
                    strokeOpacity={0.6}
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

  return (
    <View style={styles.container}>
      {/* SVG for links - rendered behind cards */}
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
        preserveAspectRatio="xMidYMid meet"
      >
        {renderLinks()}
      </Svg>

      {/* Person cards - rendered on top */}
      {clusters.map((cluster, clusterIndex) =>
        cluster.nodes.map((node) => {
          const x = transformX(node.position.x);
          const y = transformY(node.position.y);
          const isSelected = selectedPersonId === node.person.id;

          return (
            <View
              key={`card-${clusterIndex}-${node.person.id}`}
              style={[
                styles.cardContainer,
                {
                  left: x - CARD_WIDTH / 2,
                  top: y - CARD_HEIGHT / 2,
                  zIndex: 1,
                },
              ]}
            >
              <PersonCard
                person={node.person}
                onPress={() => onNodePress(node.person.id)}
                isSelected={isSelected}
              />
            </View>
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
