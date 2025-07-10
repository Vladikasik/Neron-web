export interface MCPEntity {
  name: string;
  type: string;
  observations: string[];
}

export interface MCPRelation {
  source: string;
  target: string;
  relationType: string;
}

export interface MCPGraphData {
  entities: MCPEntity[];
  relations: MCPRelation[];
}

export interface MCPToolResult {
  type: "mcp_tool_result";
  tool_use_id: string;
  is_error: boolean;
  content: Array<{
    type: "text";
    text: string;
  }>;
}

export interface MCPToolUse {
  type: "mcp_tool_use";
  id: string;
  name: "find_nodes" | "read_graph" | "create_entities" | "create_relations";
  input: Record<string, unknown>;
  server_name: string;
}

// Enhanced tag and layer interfaces
export interface NodeTag {
  name: string;
  category: 'hashtag' | 'keyword' | 'type' | 'custom';
  color?: string;
  weight?: number; // 1-10, influences layer positioning
}

export interface LayerInfo {
  id: string;
  name: string;
  zPosition: number;
  tags: string[];
  visible: boolean;
  opacity: number;
  color: string;
  nodeCount: number;
}

export interface NodeMetadata {
  createdAt?: Date;
  updatedAt?: Date;
  importance?: number; // 1-10 scale
  category?: string;
  keywords?: string[];
  connectionStrength?: number;
  clusterId?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  observations: string[];
  x?: number;
  y?: number;
  z?: number;
  color?: string;
  size?: number;
  
  // Enhanced fields for layering and tagging
  tags: NodeTag[];
  layer?: LayerInfo;
  metadata: NodeMetadata;
  tagString?: string; // Computed from tags for quick searching
  layerId?: string; // Reference to current layer
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relationType: string;
  color?: string;
  width?: number;
  
  // Enhanced fields for layer-aware connections
  isInterLayer?: boolean; // True if connects nodes from different layers
  strength?: number; // 1-10, visual emphasis
  tags?: string[]; // Tags associated with this relationship
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  layers: LayerInfo[]; // Available layers in the graph
  tagIndex: Map<string, string[]>; // Tag name -> node IDs with that tag
}

export interface NodeSelection {
  node: GraphNode;
  position: { x: number; y: number };
  persistent: boolean;
}

// Enhanced graph state with layer controls
export interface LayerControls {
  visibleLayers: Set<string>;
  isolatedLayer?: string; // If set, only show this layer
  layerOpacity: Map<string, number>;
  showInterLayerConnections: boolean;
  tagFilter: string[];
  layerSpacing: number; // Distance between layers
}

export interface GraphState {
  data: GraphData;
  selectedNodes: NodeSelection[];
  highlightedNodes: Set<string>;
  highlightedLinks: Set<string>;
  hoveredNode: GraphNode | null;
  isHoverMode: boolean;
  
  // Enhanced state for layers
  layerControls: LayerControls;
  activeFilters: {
    tags: string[];
    types: string[];
    layers: string[];
    searchQuery: string;
  };
} 