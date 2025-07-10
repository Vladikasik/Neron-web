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
        graphRef.current.cameraPosition(
          { x: node.x || 0, y: node.y || 0, z: (node.z || 0) + 250 },
          { x: node.x || 0, y: node.y || 0, z: node.z || 0 },
          1000
        );
      }
    },
    centerOnNodes: (nodeIds: string[]) => {
      const nodes = data.nodes.filter(n => nodeIds.includes(n.id));
      if (nodes.length === 0 || !graphRef.current) return;

      // Calculate center point
      const centerX = nodes.reduce((sum, n) => sum + (n.x || 0), 0) / nodes.length;
      const centerY = nodes.reduce((sum, n) => sum + (n.y || 0), 0) / nodes.length;
      const centerZ = nodes.reduce((sum, n) => sum + (n.z || 0), 0) / nodes.length;

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
    
    const geometry = new THREE.SphereGeometry(node.size || 5);
    const material = new THREE.MeshLambertMaterial({
      color: node.color || '#00ff41',
      transparent: true,
      opacity: isSelected ? 1.0 : isHighlighted ? 0.9 : 0.7
    });

    const sphere = new THREE.Mesh(geometry, material);

    if (isHighlighted || isSelected) {
      // Add glow effect for highlighted/selected nodes
      const glowGeometry = new THREE.SphereGeometry((node.size || 5) * 1.2);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: node.color || '#00ff41',
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

    const material = new THREE.LineBasicMaterial({
      color: link.color || '#00ff41',
      transparent: true,
      opacity: isHighlighted ? 0.8 : 0.4,
      linewidth: isHighlighted ? (link.width || 2) * 1.5 : (link.width || 2)
    });

    const geometry = new THREE.BufferGeometry();
    const sourceNode = typeof link.source === 'string' 
      ? data.nodes.find(n => n.id === link.source) 
      : link.source;
    const targetNode = typeof link.target === 'string' 
      ? data.nodes.find(n => n.id === link.target) 
      : link.target;

    if (sourceNode && targetNode) {
      const points = [
        new THREE.Vector3(sourceNode.x || 0, sourceNode.y || 0, sourceNode.z || 0),
        new THREE.Vector3(targetNode.x || 0, targetNode.y || 0, targetNode.z || 0)
      ];
      geometry.setFromPoints(points);
    }

    return new THREE.Line(geometry, material);
  }, [highlightedLinks, data.nodes]);

  const nodeLabel = useCallback((node: GraphNode) => {
    if (!isHoverMode) return '';
    return `${node.name} (${node.type})`;
  }, [isHoverMode]);

  const nodeColor = useCallback((node: GraphNode) => {
    const isHighlighted = highlightedNodes.has(node.id);
    const isSelected = selectedNodes.some(sel => sel.node.id === node.id);
    
    if (isSelected) return '#ffffff';
    if (isHighlighted) return node.color || '#00ff41';
    return node.color || '#00ff41';
  }, [highlightedNodes, selectedNodes]);

  const linkColor = useCallback((link: GraphLink) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const linkId = `${sourceId}-${targetId}`;
    const isHighlighted = highlightedLinks.has(linkId);
    
    return isHighlighted ? '#ffffff' : (link.color || '#00ff41');
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