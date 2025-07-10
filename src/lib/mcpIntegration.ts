import type { MCPToolResult, GraphData, GraphNode } from '../types/graph';
import { parseMCPResponse, transformMCPToGraphData, mergeGraphData } from './dataTransformer';
import { graphCache, CACHE_KEYS, CacheStrategy } from './graphCache';
import type { CacheStrategyType } from './graphCache';

interface MCPConfig {
  apiKey: string;
  mcpUrl: string;
  model: string;
}

export class MCPClient {
  private config: MCPConfig;
  private isConnected = false;

  constructor(config: MCPConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      // Test connection with a simple request
      const response = await fetch('/api/health');
      this.isConnected = response.ok;
      return this.isConnected;
    } catch (error) {
      console.error('Failed to connect to MCP:', error);
      this.isConnected = false;
      return false;
    }
  }

  private async makeClaudeRequest(
    messages: Array<{ role: string; content: string }>,
    systemPrompt?: string
  ): Promise<MCPToolResult[]> {
    const payload = {
      model: this.config.model,
      max_tokens: 4000,
      messages,
      system: systemPrompt,
      mcp_servers: [{
        type: "url",
        url: this.config.mcpUrl,
        name: "memory"
      }]
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract MCP tool results from Claude response
    const mcpResults: MCPToolResult[] = [];
    if (result.content) {
      // Look for MCP tool results in the response
      result.content.forEach((item: unknown) => {
        if (typeof item === 'object' && item !== null && 'type' in item && 'name' in item) {
          const typedItem = item as { type: string; name: string };
          if (typedItem.type === 'tool_use' && typedItem.name.startsWith('mcp_')) {
            // This would be processed by Claude and returned as tool results
            // For now, we'll simulate the expected structure
          }
        }
      });
    }

    return mcpResults;
  }

  async readGraph(strategy: CacheStrategyType = CacheStrategy.CACHE_FIRST): Promise<GraphData> {
    // Check cache first if strategy allows
    if (strategy === CacheStrategy.CACHE_FIRST || strategy === CacheStrategy.STALE_WHILE_REVALIDATE) {
      const cachedData = graphCache.get(CACHE_KEYS.FULL_GRAPH);
      if (cachedData) {
        if (strategy === CacheStrategy.STALE_WHILE_REVALIDATE) {
          // Refresh in background
          this.readGraphFromMCP().then(data => {
            graphCache.set(CACHE_KEYS.FULL_GRAPH, data);
          }).catch(console.error);
        }
        return cachedData;
      }
    }

    // Fetch from MCP
    const data = await this.readGraphFromMCP();
    graphCache.set(CACHE_KEYS.FULL_GRAPH, data);
    return data;
  }

  private async readGraphFromMCP(): Promise<GraphData> {
    try {
      const systemPrompt = `You are a helpful assistant that can create nodes and relations between them. Through this ability you help people to structuralise their thoughts processes and memories in a fluent ai-graph-based second brain. Help user with whatever is their request and adaptise and conceptually understand which parts of talk you need to write on the graph database depending on context. You can use the mcp tool find_nodes to retrieve nodes and relations between them - notice this would show user the result of this mcp tool immediately so better to use it when you want to highlight contextual step and/or change in the data. You can use tool read_graph to read every node all at once - notice it would reload the whole graph on user device (its not a bad thing just to know the user is up to date after this command). You can write multiple tags for each node and even more observations since the display of them is flexible and can include the whole page of information if needed + interactive information.`;

      const messages = [{
        role: 'user',
        content: 'Please read the entire graph using the read_graph MCP tool and return all nodes and relations.'
      }];

      const results = await this.makeClaudeRequest(messages, systemPrompt);
      
      if (results.length === 0) {
        return { nodes: [], links: [] };
      }

      let mergedData: GraphData = { nodes: [], links: [] };
      
      for (const result of results) {
        const mcpData = parseMCPResponse(result);
        if (mcpData) {
          const graphData = transformMCPToGraphData(mcpData);
          mergedData = mergeGraphData(mergedData, graphData);
        }
      }

      return mergedData;
    } catch (error) {
      console.error('Failed to read graph from MCP:', error);
      return { nodes: [], links: [] };
    }
  }

  async findNodes(nodeNames: string[]): Promise<{ nodes: GraphNode[]; highlightedLinks: string[] }> {
    try {
      const systemPrompt = `You are a helpful assistant that can create nodes and relations between them. Through this ability you help people to structuralise their thoughts processes and memories in a fluent ai-graph-based second brain. Help user with whatever is their request and adaptise and conceptually understand which parts of talk you need to write on the graph database depending on context. You can use the mcp tool find_nodes to retrieve nodes and relations between them - notice this would show user the result of this mcp tool immediately so better to use it when you want to highlight contextual step and/or change in the data. You can use tool read_graph to read every node all at once - notice it would reload the whole graph on user device (its not a bad thing just to know the user is up to date after this command). You can write multiple tags for each node and even more observations since the display of them is flexible and can include the whole page of information if needed + interactive information.`;

      const messages = [{
        role: 'user',
        content: `Please find these specific nodes using the find_nodes MCP tool: ${nodeNames.join(', ')}`
      }];

      const results = await this.makeClaudeRequest(messages, systemPrompt);
      
      const foundNodes: GraphNode[] = [];
      const highlightedLinks: string[] = [];

      for (const result of results) {
        const mcpData = parseMCPResponse(result);
        if (mcpData) {
          const graphData = transformMCPToGraphData(mcpData);
          foundNodes.push(...graphData.nodes);
          
          // Create highlighted link IDs
          graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            highlightedLinks.push(`${sourceId}-${targetId}`);
          });
        }
      }

      return { nodes: foundNodes, highlightedLinks };
    } catch (error) {
      console.error('Failed to find nodes via MCP:', error);
      return { nodes: [], highlightedLinks: [] };
    }
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const systemPrompt = `You are a helpful assistant that can create nodes and relations between them. Through this ability you help people to structuralise their thoughts processes and memories in a fluent ai-graph-based second brain. Help user with whatever is their request and adaptise and conceptually understand which parts of talk you need to write on the graph database depending on context. You can use the mcp tool find_nodes to retrieve nodes and relations between them - notice this would show user the result of this mcp tool immediately so better to use it when you want to highlight contextual step and/or change in the data. You can use tool read_graph to read every node all at once - notice it would reload the whole graph on user device (its not a bad thing just to know the user is up to date after this command). You can write multiple tags for each node and even more observations since the display of them is flexible and can include the whole page of information if needed + interactive information.`;

      const messages = [{
        role: 'user',
        content: message
      }];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'mcp-client-2025-04-04'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 4000,
          messages,
          system: systemPrompt,
          mcp_servers: [{
            type: "url",
            url: this.config.mcpUrl,
            name: "memory"
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API request failed: ${response.status}`);
      }

      const result = await response.json();
      return result.content?.[0]?.text || 'No response received';
    } catch (error) {
      console.error('Failed to send message to Claude:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Default configuration from environment variables
export function createMCPClient(): MCPClient {
  const config: MCPConfig = {
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
    mcpUrl: import.meta.env.VITE_MCP_URL || 'https://memory.aynshteyn.dev/sse',
    model: 'claude-sonnet-4-20250514'
  };

  if (!config.apiKey) {
    console.warn('VITE_ANTHROPIC_API_KEY not set. MCP functionality will be limited.');
  }

  return new MCPClient(config);
} 