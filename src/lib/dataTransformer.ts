import type { MCPGraphData, MCPToolResult, GraphData, GraphNode, GraphLink } from '../types/graph';

const NODE_COLORS: Record<string, string> = {
  'Project': '#00ff41',
  'Development Phase': '#00cc33',
  'Historical Figure': '#33ff66',
  'Natural Phenomenon': '#66ff99',
  'Resource': '#99ffcc',
  'default': '#00ff41'
};

export function parseMCPResponse(toolResult: MCPToolResult): MCPGraphData | null {
  try {
    if (toolResult.is_error || !toolResult.content.length) {
      return null;
    }

    const textContent = toolResult.content[0].text;
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return null;
    }

    const parsedData = JSON.parse(jsonMatch[0]) as MCPGraphData;
    
    if (!parsedData.entities || !Array.isArray(parsedData.entities)) {
      return null;
    }

    if (!parsedData.relations) {
      parsedData.relations = [];
    }

    return parsedData;
  } catch (error) {
    console.error('Failed to parse MCP response:', error);
    return null;
  }
}

export function transformMCPToGraphData(mcpData: MCPGraphData): GraphData {
  const nodes: GraphNode[] = mcpData.entities.map(entity => ({
    id: entity.name,
    name: entity.name,
    type: entity.type,
    observations: entity.observations,
    color: NODE_COLORS[entity.type] || NODE_COLORS.default,
    size: Math.max(5, Math.min(15, entity.observations.length * 2))
  }));

  const links: GraphLink[] = mcpData.relations.map(relation => ({
    source: relation.source,
    target: relation.target,
    relationType: relation.relationType,
    color: '#00ff41',
    width: 2
  }));

  return { nodes, links };
}

export function mergeGraphData(existing: GraphData, newData: GraphData): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  
  existing.nodes.forEach(node => {
    nodeMap.set(node.id, { ...node });
  });

  newData.nodes.forEach(node => {
    if (nodeMap.has(node.id)) {
      const existingNode = nodeMap.get(node.id)!;
      const mergedObservations = Array.from(new Set([
        ...existingNode.observations,
        ...node.observations
      ]));
      
      nodeMap.set(node.id, {
        ...existingNode,
        observations: mergedObservations,
        size: Math.max(5, Math.min(15, mergedObservations.length * 2))
      });
    } else {
      nodeMap.set(node.id, node);
    }
  });

  const linkMap = new Map<string, GraphLink>();
  
  existing.links.forEach(link => {
    const key = `${typeof link.source === 'string' ? link.source : link.source.id}-${typeof link.target === 'string' ? link.target : link.target.id}-${link.relationType}`;
    linkMap.set(key, link);
  });

  newData.links.forEach(link => {
    const key = `${typeof link.source === 'string' ? link.source : link.source.id}-${typeof link.target === 'string' ? link.target : link.target.id}-${link.relationType}`;
    if (!linkMap.has(key)) {
      linkMap.set(key, link);
    }
  });

  return {
    nodes: Array.from(nodeMap.values()),
    links: Array.from(linkMap.values())
  };
}

export function validateGraphData(data: GraphData): boolean {
  if (!data.nodes || !Array.isArray(data.nodes)) {
    return false;
  }

  if (!data.links || !Array.isArray(data.links)) {
    return false;
  }

  const nodeIds = new Set(data.nodes.map(node => node.id));
  
  for (const link of data.links) {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
      return false;
    }
  }

  return true;
} 