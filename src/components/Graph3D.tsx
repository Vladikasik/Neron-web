import { useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
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
}

export interface Graph3DRef {
  centerOnNode: (nodeId: string) => void;
  centerOnNodes: (nodeIds: string[]) => void;
  refresh: () => void;
  getCamera: () => THREE.Camera;
}

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
  height = 600
}, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    centerOnNode: (nodeId: string) => {
      const node = data.nodes.find(n => n.id === nodeId);
      if (node && graphRef.current) {
        const x = node.x || 0;
        const y = node.y || 0;
        const z = node.z || 0;
        graphRef.current.cameraPosition(
          { x: x, y: y, z: z + 250 },
          { x: x, y: y, z: z },
          1000
        );
      }
    },
    centerOnNodes: (nodeIds: string[]) => {
      const nodes = data.nodes.filter(n => nodeIds.includes(n.id));
      if (nodes.length === 0 || !graphRef.current) return;

      // Calculate center point
      let centerX = 0, centerY = 0, centerZ = 0;
      nodes.forEach(node => {
        centerX += node.x || 0;
        centerY += node.y || 0;
        centerZ += node.z || 0;
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
    
    const size = node.size || 5;
    const geometry = new THREE.SphereGeometry(size);
    
    let nodeColor = '#00FF66'; // Default tactical green
    if (node.color) {
      nodeColor = node.color;
    }
    
    const material = new THREE.MeshLambertMaterial({
      color: nodeColor,
      transparent: true,
      opacity: isSelected ? 1.0 : isHighlighted ? 0.9 : 0.8
    });

    const sphere = new THREE.Mesh(geometry, material);

    // Add glow effect for highlighted/selected nodes
    if (isHighlighted || isSelected) {
      const glowGeometry = new THREE.SphereGeometry(size * 1.5);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: isSelected ? '#FFFFFF' : nodeColor,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      sphere.add(glow);
    }

    return sphere;
  }, [highlightedNodes, selectedNodes]);

  const linkThreeObject = useCallback((link: GraphLink) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const linkId = `${sourceId}-${targetId}`;
    const isHighlighted = highlightedLinks.has(linkId);

    const width = link.width || 2;
    let linkColor = '#00FF66'; // Default tactical green
    if (link.color) {
      linkColor = link.color;
    }

    const material = new THREE.LineBasicMaterial({
      color: isHighlighted ? '#FFFFFF' : linkColor,
      transparent: true,
      opacity: isHighlighted ? 0.9 : 0.6,
      linewidth: isHighlighted ? width * 1.5 : width
    });

    const geometry = new THREE.BufferGeometry();
    return new THREE.Line(geometry, material);
  }, [highlightedLinks]);

  const nodeLabel = useCallback((node: GraphNode) => {
    if (!isHoverMode) return '';
    return `${node.name} (${node.type})`;
  }, [isHoverMode]);

  const nodeColor = useCallback((node: GraphNode) => {
    const isHighlighted = highlightedNodes.has(node.id);
    const isSelected = selectedNodes.some(sel => sel.node.id === node.id);
    
    if (isSelected) return '#FFFFFF';
    if (isHighlighted) return node.color || '#00FF66';
    return node.color || '#00FF66';
  }, [highlightedNodes, selectedNodes]);

  const linkColor = useCallback((link: GraphLink) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const linkId = `${sourceId}-${targetId}`;
    const isHighlighted = highlightedLinks.has(linkId);
    
    if (isHighlighted) return '#FFFFFF';
    return link.color || '#00FF66';
  }, [highlightedLinks]);

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
        graphData={data}
        width={width}
        height={height}
        backgroundColor="#0A0A0A"
        nodeLabel={nodeLabel}
        nodeColor={nodeColor}
        nodeThreeObject={nodeThreeObject}
        linkColor={linkColor}
        linkThreeObject={linkThreeObject}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => '#00FF66'}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
                 onNodeRightClick={handleNodeDoubleClick}
        onBackgroundClick={onBackgroundClick}
        showNavInfo={false}
        {...forceEngineConfig}
      />
    </div>
  );
});

Graph3D.displayName = 'Graph3D';

export default Graph3D; 