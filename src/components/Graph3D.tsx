import { useCallback, useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import type { GraphData, GraphNode, GraphLink, NodeSelection } from '../types/graph';

interface Graph3DProps {
  data: GraphData;
  selectedNodes: NodeSelection[];
  highlightedNodes: Set<string>;
  highlightedLinks: Set<string>;
  isHoverMode: boolean;
  onNodeHover: (node: GraphNode | null) => void;
  onNodeClick: (node: GraphNode, event: MouseEvent) => void;
  onNodeDoubleClick: (node: GraphNode, event: MouseEvent) => void;
  onBackgroundClick: () => void;
  width?: number;
  height?: number;
  
  // Enhanced props for layer system
  layerControls?: {
    visibleLayers: Set<string>;
    isolatedLayer?: string;
    layerOpacity: Map<string, number>;
    showInterLayerConnections: boolean;
    tagFilter: string[];
    layerSpacing: number;
  };
}

export interface Graph3DRef {
  centerOnNode: (nodeId: string) => void;
  centerOnNodes: (nodeIds: string[]) => void;
  centerOnLayer: (layerId: string) => void;
  refresh: () => void;
  getCamera: () => THREE.Camera;
  animateToLayer: (layerId: string, duration?: number) => void;
  showAllLayers: () => void;
  isolateLayer: (layerId: string) => void;
}

// Helper function to convert CSS color variables to hex values
const getCSSVariable = (variable: string): string => {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const value = style.getPropertyValue(variable).trim();
  
  // If it's already a hex value, return it
  if (value.startsWith('#')) {
    return value;
  }
  
  // If it's an oklch value, convert to a usable color
  if (value.includes('oklch')) {
    // For now, use a fallback matrix green color
    return '#00ff41';
  }
  
  // If it's an hsl value, we'll use a fallback
  if (value.includes('hsl')) {
    return '#00ff41';
  }
  
  // Default fallback
  return '#00ff41';
};

// Layer-aware node positioning
const calculateLayerPosition = (node: GraphNode, _layerSpacing?: number): { x: number; y: number; z: number } => {
  const baseZ = node.layer?.zPosition || 0;
  
  // Add some randomization within the layer to prevent overlap
  const layerRadius = 150;
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * layerRadius;
  
  return {
    x: (node.x || 0) + Math.cos(angle) * radius,
    y: (node.y || 0) + Math.sin(angle) * radius,
    z: baseZ
  };
};

// Check if a node should be visible based on layer controls
const isNodeVisible = (node: GraphNode, layerControls?: Graph3DProps['layerControls']): boolean => {
  if (!layerControls) return true;
  
  // If isolated layer is set, only show nodes from that layer
  if (layerControls.isolatedLayer) {
    return node.layerId === layerControls.isolatedLayer;
  }
  
  // Check if node's layer is visible
  if (node.layerId && !layerControls.visibleLayers.has(node.layerId)) {
    return false;
  }
  
  // Check tag filters
  if (layerControls.tagFilter.length > 0) {
    return node.tags.some(tag => layerControls.tagFilter.includes(tag.name));
  }
  
  return true;
};

// Check if a link should be visible
const isLinkVisible = (link: GraphLink, data: GraphData, layerControls?: Graph3DProps['layerControls']): boolean => {
  if (!layerControls) return true;
  
  const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
  const targetId = typeof link.target === 'string' ? link.target : link.target.id;
  
  const sourceNode = data.nodes.find(n => n.id === sourceId);
  const targetNode = data.nodes.find(n => n.id === targetId);
  
  if (!sourceNode || !targetNode) return false;
  
  // Both nodes must be visible
  if (!isNodeVisible(sourceNode, layerControls) || !isNodeVisible(targetNode, layerControls)) {
    return false;
  }
  
  // Check inter-layer connection setting
  if (link.isInterLayer && !layerControls.showInterLayerConnections) {
    return false;
  }
  
  return true;
};

const Graph3D = forwardRef<Graph3DRef, Graph3DProps>(({
  data,
  selectedNodes,
  highlightedNodes,
  highlightedLinks,
  isHoverMode,
  onNodeHover,
  onNodeClick,
  onNodeDoubleClick,
  onBackgroundClick,
  width = 800,
  height = 600,
  layerControls
}, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  // Get theme colors
  const primaryColor = getCSSVariable('--primary');

  // Filter data based on layer controls
  const filteredData = useMemo(() => {
    const visibleNodes = data.nodes.filter(node => isNodeVisible(node, layerControls));
    const visibleLinks = data.links.filter(link => isLinkVisible(link, data, layerControls));
    
    return {
      ...data,
      nodes: visibleNodes,
      links: visibleLinks
    };
  }, [data, layerControls]);

  // Update node positions when layer spacing changes
  useEffect(() => {
    if (layerControls?.layerSpacing && graphRef.current) {
      data.nodes.forEach(node => {
        const newPos = calculateLayerPosition(node, layerControls.layerSpacing);
        node.z = newPos.z;
      });
      graphRef.current.refresh();
    }
  }, [layerControls?.layerSpacing, data.nodes]);

  useImperativeHandle(ref, () => ({
    centerOnNode: (nodeId: string) => {
      const node = data.nodes.find(n => n.id === nodeId);
      if (node && graphRef.current) {
        const pos = calculateLayerPosition(node, layerControls?.layerSpacing);
        graphRef.current.cameraPosition(
          { x: pos.x, y: pos.y, z: pos.z + 250 },
          { x: pos.x, y: pos.y, z: pos.z },
          1000
        );
      }
    },
    centerOnNodes: (nodeIds: string[]) => {
      const nodes = data.nodes.filter(n => nodeIds.includes(n.id));
      if (nodes.length === 0 || !graphRef.current) return;

      // Calculate center point considering layer positions
      let centerX = 0, centerY = 0, centerZ = 0;
      nodes.forEach(node => {
        const pos = calculateLayerPosition(node, layerControls?.layerSpacing);
        centerX += pos.x;
        centerY += pos.y;
        centerZ += pos.z;
      });
      centerX /= nodes.length;
      centerY /= nodes.length;
      centerZ /= nodes.length;

      graphRef.current.cameraPosition(
        { x: centerX, y: centerY, z: centerZ + 300 },
        { x: centerX, y: centerY, z: centerZ },
        1000
      );
    },
    centerOnLayer: (layerId: string) => {
      const layer = data.layers?.find(l => l.id === layerId);
      const layerNodes = data.nodes.filter(n => n.layerId === layerId);
      
      if (layer && layerNodes.length > 0 && graphRef.current) {
        // Calculate layer center
        let centerX = 0, centerY = 0;
        layerNodes.forEach(node => {
          centerX += node.x || 0;
          centerY += node.y || 0;
        });
        centerX /= layerNodes.length;
        centerY /= layerNodes.length;

        graphRef.current.cameraPosition(
          { x: centerX, y: centerY, z: layer.zPosition + 400 },
          { x: centerX, y: centerY, z: layer.zPosition },
          1200
        );
      }
    },
    animateToLayer: (layerId: string, duration = 1500) => {
      const layer = data.layers?.find(l => l.id === layerId);
      if (layer && graphRef.current) {
        const layerNodes = data.nodes.filter(n => n.layerId === layerId);
        if (layerNodes.length > 0) {
          let centerX = 0, centerY = 0;
          layerNodes.forEach(node => {
            centerX += node.x || 0;
            centerY += node.y || 0;
          });
          centerX /= layerNodes.length;
          centerY /= layerNodes.length;

          graphRef.current.cameraPosition(
            { x: centerX, y: centerY, z: layer.zPosition + 350 },
            { x: centerX, y: centerY, z: layer.zPosition },
            duration
          );
        }
      }
    },
    showAllLayers: () => {
      if (data.layers && data.layers.length > 0 && graphRef.current) {
        // Calculate center of all layers
        const allZ = data.layers.map(l => l.zPosition);
        const centerZ = allZ.reduce((sum, z) => sum + z, 0) / allZ.length;
        
        graphRef.current.cameraPosition(
          { x: 0, y: 0, z: centerZ + 500 },
          { x: 0, y: 0, z: centerZ },
          1500
        );
      }
    },
    isolateLayer: (layerId: string) => {
      // This will be handled by the parent component updating layerControls
      if (layerControls?.isolatedLayer !== layerId) {
        // Trigger animation to the isolated layer
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.refresh();
          }
        }, 100);
      }
    },
    refresh: () => {
      if (graphRef.current) {
        graphRef.current.refresh();
      }
    },
    getCamera: () => {
      return graphRef.current?.camera() || new THREE.PerspectiveCamera();
    }
  }));

  const nodeThreeObject = useCallback((node: GraphNode) => {
    const isHighlighted = highlightedNodes.has(node.id);
    const isSelected = selectedNodes.some(sel => sel.node.id === node.id);
    
    // Apply layer opacity
    const layerOpacity = layerControls?.layerOpacity.get(node.layerId || '') || 1.0;
    const baseOpacity = isSelected ? 1.0 : isHighlighted ? 0.9 : 0.7;
    const finalOpacity = baseOpacity * layerOpacity;
    
    // Size based on importance and layer membership
    const importanceBonus = (node.metadata?.importance || 5) / 10;
    const baseSize = node.size || 5;
    const finalSize = baseSize * (0.8 + 0.4 * importanceBonus);
    
    const geometry = new THREE.SphereGeometry(finalSize);
    
    // Use layer-aware colors
    let nodeColor = primaryColor;
    if (node.layer?.color) {
      nodeColor = node.layer.color;
    } else if (node.color && node.color.includes('var(--')) {
      // Extract CSS variable and get computed value
      const variable = node.color.match(/var\((.*?)\)/)?.[1];
      if (variable) {
        nodeColor = getCSSVariable(variable);
      }
    } else if (node.color) {
      nodeColor = node.color;
    }
    
    const material = new THREE.MeshLambertMaterial({
      color: nodeColor,
      transparent: true,
      opacity: finalOpacity
    });

    const sphere = new THREE.Mesh(geometry, material);

    // Add layer-specific effects
    if (isHighlighted || isSelected) {
      // Add glow effect for highlighted/selected nodes using layer colors
      const glowGeometry = new THREE.SphereGeometry(finalSize * 1.3);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: isSelected ? '#ffffff' : nodeColor,
        transparent: true,
        opacity: 0.2 * layerOpacity
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      sphere.add(glow);
    }

    // Add tag indicators for important nodes
    if (node.tags.length > 3) {
      const ringGeometry = new THREE.RingGeometry(finalSize * 1.1, finalSize * 1.2);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.3 * layerOpacity,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      sphere.add(ring);
    }

    return sphere;
  }, [highlightedNodes, selectedNodes, primaryColor, layerControls]);

  const linkThreeObject = useCallback((link: GraphLink) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const linkId = `${sourceId}-${targetId}`;
    const isHighlighted = highlightedLinks.has(linkId);

    // Get source and target nodes for layer information
    const sourceNode = data.nodes.find(n => n.id === sourceId);
    const targetNode = data.nodes.find(n => n.id === targetId);
    
    // Apply layer opacity
    const sourceOpacity = layerControls?.layerOpacity.get(sourceNode?.layerId || '') || 1.0;
    const targetOpacity = layerControls?.layerOpacity.get(targetNode?.layerId || '') || 1.0;
    const layerOpacity = Math.min(sourceOpacity, targetOpacity);

    // Enhanced styling for inter-layer connections
    const isInterLayer = link.isInterLayer || (sourceNode?.layerId !== targetNode?.layerId);
    const baseWidth = link.width || 2;
    const finalWidth = isInterLayer ? baseWidth * 1.5 : baseWidth;

    // Use theme-aware colors for links
    let linkColor = primaryColor;
    if (isInterLayer) {
      linkColor = '#ffffff'; // Inter-layer connections are white
    } else if (link.color && link.color.includes('var(--')) {
      const variable = link.color.match(/var\((.*?)\)/)?.[1];
      if (variable) {
        linkColor = getCSSVariable(variable);
      }
    } else if (link.color) {
      linkColor = link.color;
    }

    const material = new THREE.LineBasicMaterial({
      color: isHighlighted ? '#ffffff' : linkColor,
      transparent: true,
      opacity: (isHighlighted ? 0.9 : (isInterLayer ? 0.6 : 0.4)) * layerOpacity,
      linewidth: isHighlighted ? finalWidth * 1.5 : finalWidth
    });

    const geometry = new THREE.BufferGeometry();
    
    if (sourceNode && targetNode) {
      const sourcePos = calculateLayerPosition(sourceNode, layerControls?.layerSpacing);
      const targetPos = calculateLayerPosition(targetNode, layerControls?.layerSpacing);
      
      const points = [
        new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z),
        new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z)
      ];
      geometry.setFromPoints(points);
      
      // Add curve for inter-layer connections
      if (isInterLayer && Math.abs(sourcePos.z - targetPos.z) > 50) {
        const midZ = (sourcePos.z + targetPos.z) / 2;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(sourcePos.x, sourcePos.y, sourcePos.z),
          new THREE.Vector3((sourcePos.x + targetPos.x) / 2, (sourcePos.y + targetPos.y) / 2, midZ + 50),
          new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z)
        );
        const curvePoints = curve.getPoints(20);
        geometry.setFromPoints(curvePoints);
      }
    }

    return new THREE.Line(geometry, material);
  }, [highlightedLinks, data.nodes, primaryColor, layerControls]);

  const nodeLabel = useCallback((node: GraphNode) => {
    if (!isHoverMode) return '';
    
    const layerName = node.layer?.name || 'Default';
    const tagCount = node.tags.length;
    const importance = node.metadata?.importance || 5;
    
    return `${node.name} (${node.type})\nLayer: ${layerName} | Tags: ${tagCount} | Importance: ${importance}/10`;
  }, [isHoverMode]);

  const nodeColor = useCallback((node: GraphNode) => {
    const isHighlighted = highlightedNodes.has(node.id);
    const isSelected = selectedNodes.some(sel => sel.node.id === node.id);
    
    if (isSelected) return '#ffffff';
    
    // Use layer colors first, then node colors
    if (node.layer?.color) {
      return node.layer.color;
    }
    
    // Use theme-aware colors
    if (node.color && node.color.includes('var(--')) {
      const variable = node.color.match(/var\((.*?)\)/)?.[1];
      if (variable) {
        return getCSSVariable(variable);
      }
    }
    
    if (isHighlighted) return node.color || primaryColor;
    return node.color || primaryColor;
  }, [highlightedNodes, selectedNodes, primaryColor]);

  const linkColor = useCallback((link: GraphLink) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const linkId = `${sourceId}-${targetId}`;
    const isHighlighted = highlightedLinks.has(linkId);
    
    if (isHighlighted) return '#ffffff';
    
    // Inter-layer connections get special treatment
    if (link.isInterLayer) return '#cccccc';
    
    // Use theme-aware colors
    if (link.color && link.color.includes('var(--')) {
      const variable = link.color.match(/var\((.*?)\)/)?.[1];
      if (variable) {
        return getCSSVariable(variable);
      }
    }
    
    return link.color || primaryColor;
  }, [highlightedLinks, primaryColor]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    if (isHoverMode) {
      onNodeHover(node);
    }
  }, [isHoverMode, onNodeHover]);

  const handleNodeClick = useCallback((node: GraphNode, event: MouseEvent) => {
    event.stopPropagation();
    onNodeClick(node, event);
  }, [onNodeClick]);

  const handleNodeDoubleClick = useCallback((node: GraphNode, event: MouseEvent) => {
    event.stopPropagation();
    onNodeDoubleClick(node, event);
  }, [onNodeDoubleClick]);

  const forceEngineConfig = useMemo(() => ({
    d3AlphaDecay: 0.02,
    d3VelocityDecay: 0.3,
    warmupTicks: 100,
    cooldownTicks: 1000
  }), []);

  return (
    <div className="w-full h-full relative">
      <ForceGraph3D
        ref={graphRef}
        graphData={filteredData}
        width={width}
        height={height}
        nodeThreeObject={nodeThreeObject}
        linkThreeObject={linkThreeObject}
        nodeLabel={nodeLabel}
        nodeColor={nodeColor}
        linkColor={linkColor}
        nodeRelSize={4}
        linkWidth={2}
        linkOpacity={0.4}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeDoubleClick}
        onBackgroundClick={onBackgroundClick}
        showNavInfo={false}
        enableNodeDrag={true}
        enableNavigationControls={true}
        controlType="orbit"
        backgroundColor="rgba(0, 0, 0, 0)"
        {...forceEngineConfig}
      />
    </div>
  );
});

Graph3D.displayName = 'Graph3D';

export default Graph3D; 