import type { MCPGraphData, MCPToolResult, GraphData, GraphNode, GraphLink, NodeTag, LayerInfo, NodeMetadata } from '../types/graph';

const NODE_COLORS: Record<string, string> = {
  'Project': '#00ff41',
  'Development Phase': '#00cc33',
  'Historical Figure': '#33ff66',
  'Natural Phenomenon': '#66ff99',
  'Resource': '#99ffcc',
  'default': '#00ff41'
};

// Layer colors for different tag categories
const LAYER_COLORS: Record<string, string> = {
  'project': '#00ff41',
  'development': '#00cc33', 
  'research': '#33ff66',
  'concept': '#66ff99',
  'tool': '#99ffcc',
  'framework': '#ccffcc',
  'default': '#00ff41'
};

// Keywords that suggest importance/weight
const IMPORTANCE_KEYWORDS = new Map([
  ['critical', 9], ['important', 8], ['essential', 8], ['key', 7], 
  ['main', 7], ['primary', 7], ['core', 8], ['fundamental', 8],
  ['basic', 5], ['minor', 3], ['optional', 4], ['experimental', 6]
]);

/**
 * Extract tags from text content (observations, names, etc.)
 */
export function extractTags(text: string, nodeType: string): NodeTag[] {
  const tags: NodeTag[] = [];
  const tagSet = new Set<string>();

  // 1. Extract hashtags (#word)
  const hashtagMatches = text.match(/#\w+/g) || [];
  hashtagMatches.forEach(tag => {
    const cleanTag = tag.toLowerCase().replace('#', '');
    if (!tagSet.has(cleanTag)) {
      tagSet.add(cleanTag);
      tags.push({
        name: cleanTag,
        category: 'hashtag',
        weight: 6,
        color: LAYER_COLORS[cleanTag] || LAYER_COLORS.default
      });
    }
  });

  // 2. Extract type-based tags
  if (nodeType && !tagSet.has(nodeType.toLowerCase())) {
    const typeTag = nodeType.toLowerCase().replace(/\s+/g, '-');
    tagSet.add(typeTag);
    tags.push({
      name: typeTag,
      category: 'type',
      weight: 8,
      color: NODE_COLORS[nodeType] || NODE_COLORS.default
    });
  }

  // 3. Extract keyword tags from content
  const keywords = extractKeywords(text);
  keywords.forEach(keyword => {
    if (!tagSet.has(keyword) && keyword.length > 2) {
      tagSet.add(keyword);
      tags.push({
        name: keyword,
        category: 'keyword',
        weight: calculateKeywordWeight(keyword, text),
        color: LAYER_COLORS[keyword] || LAYER_COLORS.default
      });
    }
  });

  return tags;
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'can', 'may', 'might', 'must', 'this', 'that', 'these', 'those'
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word));

  // Extract compound words and technical terms
  const technicalTerms = text.match(/\b[A-Z][a-z]*(?:[A-Z][a-z]*)*\b/g) || [];
  const compoundWords = text.match(/\b\w+[-_]\w+\b/g) || [];
  
  return [...new Set([
    ...words,
    ...technicalTerms.map(term => term.toLowerCase()),
    ...compoundWords.map(term => term.toLowerCase())
  ])];
}

/**
 * Calculate keyword importance weight
 */
function calculateKeywordWeight(keyword: string, context: string): number {
  let weight = 5; // Default weight

  // Check for importance indicators
  for (const [indicator, value] of IMPORTANCE_KEYWORDS) {
    if (context.toLowerCase().includes(indicator)) {
      weight = Math.max(weight, value);
    }
  }

  // Frequency-based weight adjustment
  const frequency = (context.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
  weight += Math.min(frequency - 1, 3); // +1-3 for repeated mentions

  // Technical term bonus
  if (keyword.includes('-') || keyword.includes('_') || /[A-Z]/.test(keyword)) {
    weight += 1;
  }

  return Math.min(Math.max(weight, 1), 10);
}

/**
 * Generate layers based on tags
 */
export function generateLayers(nodes: GraphNode[]): LayerInfo[] {
  const layerMap = new Map<string, LayerInfo>();
  
  // Collect all unique tags
  const allTags = new Set<string>();
  nodes.forEach(node => {
    node.tags.forEach(tag => allTags.add(tag.name));
  });

  // Create layers for major tag categories
  let zPosition = 0;
  const layerSpacing = 200;

  // Group tags by category and weight
  const tagsByCategory = new Map<string, { tag: string; weight: number; nodes: string[] }[]>();
  
  nodes.forEach(node => {
    node.tags.forEach(tag => {
      if (!tagsByCategory.has(tag.category)) {
        tagsByCategory.set(tag.category, []);
      }
      
      const categoryTags = tagsByCategory.get(tag.category)!;
      let existingTag = categoryTags.find(t => t.tag === tag.name);
      
      if (!existingTag) {
        existingTag = { tag: tag.name, weight: tag.weight || 5, nodes: [] };
        categoryTags.push(existingTag);
      }
      
      if (!existingTag.nodes.includes(node.id)) {
        existingTag.nodes.push(node.id);
      }
    });
  });

  // Create layers for high-weight tags (weight >= 7)
  const importantTags: string[] = [];
  tagsByCategory.forEach((tags) => {
    tags.forEach(tagInfo => {
      if (tagInfo.weight >= 7 && tagInfo.nodes.length >= 2) {
        importantTags.push(tagInfo.tag);
      }
    });
  });

  // Sort important tags by node count (descending)
  importantTags.sort((a, b) => {
    const aNodes = nodes.filter(n => n.tags.some(t => t.name === a)).length;
    const bNodes = nodes.filter(n => n.tags.some(t => t.name === b)).length;
    return bNodes - aNodes;
  });

  // Create layers for important tags
  importantTags.forEach((tagName) => {
    const nodeIdsWithTag = nodes.filter(n => n.tags.some(t => t.name === tagName)).map(n => n.id);
    const layerId = `layer-${tagName}`;
    
    layerMap.set(layerId, {
      id: layerId,
      name: tagName.charAt(0).toUpperCase() + tagName.slice(1),
      zPosition: zPosition,
      tags: [tagName],
      visible: true,
      opacity: 1.0,
      color: LAYER_COLORS[tagName] || LAYER_COLORS.default,
      nodeCount: nodeIdsWithTag.length
    });
    
    zPosition += layerSpacing;
  });

  // Create a default layer for untagged or low-weight nodes
  const defaultLayerId = 'layer-default';
  layerMap.set(defaultLayerId, {
    id: defaultLayerId,
    name: 'Default',
    zPosition: -layerSpacing,
    tags: ['default'],
    visible: true,
    opacity: 1.0,
    color: LAYER_COLORS.default,
    nodeCount: 0
  });

  return Array.from(layerMap.values());
}

/**
 * Assign nodes to layers based on their tags
 */
export function assignNodesToLayers(nodes: GraphNode[], layers: LayerInfo[]): GraphNode[] {
  return nodes.map(node => {
    // Find the best layer for this node based on tags
    let bestLayer = layers.find(layer => layer.id === 'layer-default');
    let highestWeight = 0;

    node.tags.forEach(tag => {
      const matchingLayer = layers.find(layer => layer.tags.includes(tag.name));
      if (matchingLayer && (tag.weight || 5) > highestWeight) {
        bestLayer = matchingLayer;
        highestWeight = tag.weight || 5;
      }
    });

    // Update node with layer assignment
    const updatedNode = {
      ...node,
      layer: bestLayer,
      layerId: bestLayer?.id,
      z: bestLayer?.zPosition || 0,
      tagString: node.tags.map(t => t.name).join(' ')
    };

    // Update layer node count
    if (bestLayer) {
      bestLayer.nodeCount++;
    }

    return updatedNode;
  });
}

/**
 * Create node metadata from observations and tags
 */
function createNodeMetadata(observations: string[], tags: NodeTag[]): NodeMetadata {
  // Calculate importance from tags and content
  const importance = Math.min(
    Math.max(
      Math.round(tags.reduce((sum, tag) => sum + (tag.weight || 5), 0) / Math.max(tags.length, 1)),
      1
    ),
    10
  );

  // Extract keywords for metadata
  const keywords = observations.flatMap(obs => extractKeywords(obs)).slice(0, 10);

  return {
    createdAt: new Date(),
    updatedAt: new Date(),
    importance,
    keywords,
    connectionStrength: 5 // Will be calculated later based on connections
  };
}

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
  // Transform entities to nodes with enhanced tagging
  const nodes: GraphNode[] = mcpData.entities.map(entity => {
    const allObservations = entity.observations.join(' ');
    const tags = extractTags(allObservations + ' ' + entity.name, entity.type);
    const metadata = createNodeMetadata(entity.observations, tags);

    return {
      id: entity.name,
      name: entity.name,
      type: entity.type,
      observations: entity.observations,
      color: NODE_COLORS[entity.type] || NODE_COLORS.default,
      size: Math.max(5, Math.min(15, entity.observations.length * 2)),
      tags,
      metadata,
      tagString: tags.map(t => t.name).join(' ')
    };
  });

  // Generate layers based on node tags
  const layers = generateLayers(nodes);
  
  // Assign nodes to layers
  const layeredNodes = assignNodesToLayers(nodes, layers);

  // Transform relations to links with enhanced properties
  const links: GraphLink[] = mcpData.relations.map(relation => {
    const sourceNode = layeredNodes.find(n => n.id === relation.source);
    const targetNode = layeredNodes.find(n => n.id === relation.target);
    
    // Check if this is an inter-layer connection
    const isInterLayer = sourceNode?.layerId !== targetNode?.layerId;
    
    // Calculate connection strength based on shared tags
    const sharedTags = sourceNode?.tags.filter(tag => 
      targetNode?.tags.some(tTag => tTag.name === tag.name)
    ) || [];
    
    const strength = Math.min(Math.max(sharedTags.length + 3, 1), 10);

    return {
      source: relation.source,
      target: relation.target,
      relationType: relation.relationType,
      color: isInterLayer ? '#ffffff' : '#00ff41',
      width: isInterLayer ? 3 : 2,
      isInterLayer,
      strength,
      tags: sharedTags.map(t => t.name)
    };
  });

  // Create tag index for quick lookups
  const tagIndex = new Map<string, string[]>();
  layeredNodes.forEach(node => {
    node.tags.forEach(tag => {
      if (!tagIndex.has(tag.name)) {
        tagIndex.set(tag.name, []);
      }
      tagIndex.get(tag.name)!.push(node.id);
    });
  });

  return { 
    nodes: layeredNodes, 
    links,
    layers,
    tagIndex
  };
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
      
      // Re-extract tags from merged observations
      const allText = mergedObservations.join(' ') + ' ' + node.name;
      const mergedTags = extractTags(allText, node.type);
      const mergedMetadata = createNodeMetadata(mergedObservations, mergedTags);
      
      nodeMap.set(node.id, {
        ...existingNode,
        observations: mergedObservations,
        size: Math.max(5, Math.min(15, mergedObservations.length * 2)),
        tags: mergedTags,
        metadata: { ...existingNode.metadata, ...mergedMetadata, updatedAt: new Date() },
        tagString: mergedTags.map(t => t.name).join(' ')
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

  const mergedNodes = Array.from(nodeMap.values());
  
  // Regenerate layers and reassign nodes
  const layers = generateLayers(mergedNodes);
  const layeredNodes = assignNodesToLayers(mergedNodes, layers);
  
  // Rebuild tag index
  const tagIndex = new Map<string, string[]>();
  layeredNodes.forEach(node => {
    node.tags.forEach(tag => {
      if (!tagIndex.has(tag.name)) {
        tagIndex.set(tag.name, []);
      }
      tagIndex.get(tag.name)!.push(node.id);
    });
  });

  return {
    nodes: layeredNodes,
    links: Array.from(linkMap.values()),
    layers,
    tagIndex
  };
}

export function validateGraphData(data: GraphData): boolean {
  if (!data.nodes || !Array.isArray(data.nodes)) {
    return false;
  }

  if (!data.links || !Array.isArray(data.links)) {
    return false;
  }

  if (!data.layers || !Array.isArray(data.layers)) {
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