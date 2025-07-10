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
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  relationType: string;
  color?: string;
  width?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface NodeSelection {
  node: GraphNode;
  position: { x: number; y: number };
  persistent: boolean;
}

export interface GraphState {
  data: GraphData;
  selectedNodes: NodeSelection[];
  highlightedNodes: Set<string>;
  highlightedLinks: Set<string>;
  hoveredNode: GraphNode | null;
  isHoverMode: boolean;
} 