import type { GraphData, GraphNode, GraphLink, MCPGraphData, MCPEntity, MCPRelation } from '../types/graph';
import { transformMCPToGraphData } from './dataTransformer';
import { graphCache, CACHE_KEYS, CacheStrategy } from './graphCache';
import type { CacheStrategyType } from './graphCache';

// Official MCP Connector Types according to Anthropic documentation
export interface MCPToolUse {
  type: 'mcp_tool_use';
  id: string;
  name: string;
  server_name: string;
  input: Record<string, unknown>;
}

export interface MCPToolResult {
  type: 'mcp_tool_result';
  tool_use_id: string;
  is_error: boolean;
  content: Array<{
    type: string;
    text?: string;
  }>;
}

interface MCPContentBlock {
  type: string;
  text?: string;
}

// Union type for all possible content blocks in MCP response
type MCPContent = MCPContentBlock | MCPToolUse | MCPToolResult;

export interface MCPResponse {
  content: Array<MCPContent>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  debug?: {
    mcpToolsUsed: number;
    mcpToolResults: number;
    mcpServers: string[];
    timestamp: string;
  };
}

export interface MCPConnectionStatus {
  connected: boolean;
  lastPing: Date | null;
  serverName: string;
  url: string;
  toolsAvailable: string[];
  errors: string[];
  responseTime?: number;
}

// Debug logging utility
const debugLog = (category: string, message: string, data?: any) => {
  console.log(`[MCP ${category}] ${message}`, data || '');
};

export class MCPClient {
  private isConnected = false;
  private lastConnectionTest: Date | null = null;
  private serverStatus: MCPConnectionStatus = {
    connected: false,
    lastPing: null,
    serverName: 'memory',
    url: 'https://memory.aynshteyn.dev/sse',
    toolsAvailable: [],
    errors: []
  };

  private systemPrompt = `You are an AI assistant specialized in working with graph data through MCP (Model Context Protocol). You have access to a Neo4j knowledge graph containing entities, relationships, and observations.

Available MCP Tools:
- read_graph(): Get the complete graph structure with all nodes and relationships
- find_nodes(names): Find specific nodes by name and return their details
- create_entities(entities): Create new entities in the graph
- create_relations(relations): Create new relationships between entities
- add_observations(observations): Add observations to existing entities

When using MCP tools:
1. Always use the appropriate tool for the requested action
2. Provide clear feedback about what data was retrieved or modified
3. Include relevant entity details, relationships, and observations
4. Format responses in a structured way for the graph visualization

The graph represents a knowledge base with interconnected concepts, entities, and their relationships.`;

  async connect(): Promise<boolean> {
    debugLog('Connection', 'Testing MCP connection...');
    
    try {
      const startTime = Date.now();
      
      const isConnected = await this.testConnection();
      
      const responseTime = Date.now() - startTime;
      this.lastConnectionTest = new Date();
      this.isConnected = isConnected;
      
      this.serverStatus = {
        ...this.serverStatus,
        connected: isConnected,
        lastPing: this.lastConnectionTest,
        responseTime,
        errors: isConnected ? [] : ['Connection test failed']
      };

      debugLog('Connection', `Connection ${isConnected ? 'successful' : 'failed'}`, {
        responseTime,
        serverStatus: this.serverStatus
      });

      return isConnected;
    } catch (error) {
      debugLog('Connection', 'Connection error:', error);
      this.isConnected = false;
      this.serverStatus.connected = false;
      this.serverStatus.errors = [error instanceof Error ? error.message : 'Unknown error'];
      return false;
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendRawMessage('What tools do you have available?');
      
      // Check if MCP tools were used in the response
      const mcpToolUses = response.content?.filter((c): c is MCPToolUse => c.type === 'mcp_tool_use') || [];
      const hasDebugInfo = response.debug?.mcpServers && response.debug.mcpServers.length > 0;
      
      if (mcpToolUses.length > 0) {
        this.serverStatus.toolsAvailable = mcpToolUses.map((t) => t.name);
      }
      
      return mcpToolUses.length > 0 || hasDebugInfo;
    } catch (error) {
      debugLog('Test', 'Connection test failed:', error);
      return false;
    }
  }

  private async sendRawMessage(message: string, customSystemPrompt?: string): Promise<MCPResponse> {
    debugLog('Request', 'Sending message to API', { message: message.substring(0, 100) + '...' });
    
    try {
      const startTime = Date.now();
      const isDevelopment = import.meta.env.DEV;
      
      let response: Response;
      
      if (isDevelopment) {
        // Local development - call Claude API directly
        debugLog('Request', 'Using direct Claude API for development');
        
        const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
        const mcpUrl = import.meta.env.VITE_MCP_URL || 'https://memory.aynshteyn.dev/sse';
        
        if (!apiKey) {
          throw new Error('VITE_ANTHROPIC_API_KEY is required for local development');
        }
        
        const requestPayload = {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: message }],
          system: customSystemPrompt || this.systemPrompt,
          mcp_servers: [{
            type: "url",
            url: mcpUrl,
            name: "memory",
            tool_configuration: {
              enabled: true,
              allowed_tools: ["find_nodes", "read_graph", "create_entities", "create_relations", "add_observations"]
            }
          }]
        };

        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'mcp-client-2025-04-04'
          },
          body: JSON.stringify(requestPayload)
        });
      } else {
        // Production - use Vercel serverless function
        debugLog('Request', 'Using Vercel serverless function for production');
        
        response = await fetch('/api/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            systemPrompt: customSystemPrompt || this.systemPrompt,
          }),
        });
      }

      const responseTime = Date.now() - startTime;
      debugLog('Request', `API response received (${responseTime}ms)`, { 
        status: response.status,
        environment: isDevelopment ? 'development' : 'production'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        debugLog('Error', 'API error response:', errorData);
        throw new Error(`API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      // Log MCP tool usage with proper type guards
      const mcpToolUses = data.content?.filter((c: MCPContent): c is MCPToolUse => c.type === 'mcp_tool_use') || [];
      const mcpToolResults = data.content?.filter((c: MCPContent): c is MCPToolResult => c.type === 'mcp_tool_result') || [];
      
      debugLog('Response', 'API success', {
        contentTypes: data.content?.map((c: MCPContent) => c.type) || [],
        mcpToolsUsed: mcpToolUses.length,
        mcpToolResults: mcpToolResults.length,
        debug: data.debug,
        usage: data.usage
      });

      if (mcpToolUses.length > 0) {
        debugLog('MCP Tools', 'Tools used in response:', 
          mcpToolUses.map((t: MCPToolUse) => `${t.name} (${t.server_name})`)
        );
      }

      if (mcpToolResults.length > 0) {
        const results = mcpToolResults.map((r: MCPToolResult) => ({
          id: r.tool_use_id,
          is_error: r.is_error,
          content_length: r.content?.length || 0
        }));
        debugLog('MCP Results', 'Tool results received:', results);
      }

      return data;
    } catch (error) {
      debugLog('Error', 'Request failed:', error);
      throw error;
    }
  }

  async readGraph(strategy: CacheStrategyType = CacheStrategy.CACHE_FIRST): Promise<GraphData> {
    debugLog('Graph', 'Reading graph with strategy:', strategy);
    
    // Check cache first if strategy allows
    if (strategy === CacheStrategy.CACHE_FIRST || strategy === CacheStrategy.STALE_WHILE_REVALIDATE) {
      const cachedData = graphCache.get(CACHE_KEYS.FULL_GRAPH);
      if (cachedData) {
        debugLog('Graph', 'Returning cached data');
        if (strategy === CacheStrategy.STALE_WHILE_REVALIDATE) {
          // Refresh in background
          debugLog('Graph', 'Refreshing cache in background');
          this.readGraphFromMCP().then(data => {
            graphCache.set(CACHE_KEYS.FULL_GRAPH, data);
            debugLog('Graph', 'Background cache refresh completed');
          }).catch(error => {
            debugLog('Error', 'Background cache refresh failed:', error);
          });
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
    debugLog('Graph', 'Fetching graph from MCP...');
    
    try {
      const response = await this.sendRawMessage(
        'Please use the read_graph MCP tool to get the complete graph structure with all nodes and relationships.'
      );
      
      const graphData = this.extractGraphDataFromResponse(response);
      debugLog('Graph', 'Graph data extracted:', {
        nodes: graphData.nodes.length,
        links: graphData.links.length
      });
      
      return graphData;
    } catch (error) {
      debugLog('Error', 'Failed to read graph from MCP:', error);
      return { nodes: [], links: [] };
    }
  }

  async findNodes(nodeNames: string[]): Promise<{ nodes: GraphNode[]; highlightedLinks: string[] }> {
    debugLog('Nodes', 'Finding nodes:', nodeNames);
    
    try {
      const response = await this.sendRawMessage(
        `Please use the find_nodes MCP tool to find these specific nodes: ${nodeNames.join(', ')}`
      );
      
      const graphData = this.extractGraphDataFromResponse(response);
      
      // Create highlighted link IDs from the found data
      const highlightedLinks: string[] = [];
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        highlightedLinks.push(`${sourceId}-${targetId}`);
      });

      debugLog('Nodes', 'Nodes found:', {
        nodes: graphData.nodes.length,
        links: highlightedLinks.length
      });

      return { 
        nodes: graphData.nodes, 
        highlightedLinks 
      };
    } catch (error) {
      debugLog('Error', 'Failed to find nodes via MCP:', error);
      return { nodes: [], highlightedLinks: [] };
    }
  }

  async sendMessage(message: string): Promise<string> {
    debugLog('Message', 'Sending user message:', message.substring(0, 100) + '...');
    
    try {
      const response = await this.sendRawMessage(message);
      
      // Extract text content from response
      const textContent = response.content
        ?.filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n') || 'No response received';

      debugLog('Message', 'Response extracted:', textContent.substring(0, 100) + '...');
      
      return textContent;
    } catch (error) {
      debugLog('Error', 'Failed to send message:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private extractGraphDataFromResponse(response: MCPResponse): GraphData {
    try {
      // Look for MCP tool results that contain graph data
      const mcpToolResults = response.content?.filter((c): c is MCPToolResult => c.type === 'mcp_tool_result') || [];
      
      if (mcpToolResults.length === 0) {
        debugLog('Extract', 'No MCP tool results found in response');
        return { nodes: [], links: [] };
      }

      // Extract text content from tool results - based on .docs example format
      let combinedText = '';
      for (const result of mcpToolResults) {
        if (!result.is_error && result.content) {
          for (const content of result.content) {
            if (content.type === 'text' && content.text) {
              combinedText += content.text + '\n';
            }
          }
        }
      }

      if (!combinedText) {
        debugLog('Extract', 'No text content found in tool results');
        return { nodes: [], links: [] };
      }

      // Parse JSON data (format: {entities: [...], relations: [...]})
      try {
        const mcpData: MCPGraphData = JSON.parse(combinedText);
        return this.transformMCPToGraphData(mcpData);
      } catch (parseError) {
        debugLog('Extract', 'Failed to parse JSON from MCP result:', parseError);
        return { nodes: [], links: [] };
      }
    } catch (error) {
      debugLog('Error', 'Failed to extract graph data:', error);
      return { nodes: [], links: [] };
    }
  }

  // Transform MCP data format to GraphData format
  private transformMCPToGraphData(mcpData: MCPGraphData): GraphData {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Transform entities to nodes
    if (mcpData.entities) {
      for (const entity of mcpData.entities) {
        nodes.push({
          id: entity.name,
          name: entity.name,
          type: entity.type,
          observations: entity.observations || [],
          color: '#00ff41', // Matrix green
          size: 8
        });
      }
    }

    // Transform relations to links
    if (mcpData.relations) {
      for (const relation of mcpData.relations) {
        links.push({
          source: relation.source,
          target: relation.target,
          relationType: relation.relationType,
          color: '#00ff41', // Matrix green
          width: 2
        });
      }
    }

    debugLog('Transform', 'Transformed MCP data:', { 
      entities: mcpData.entities?.length || 0,
      relations: mcpData.relations?.length || 0,
      nodes: nodes.length,
      links: links.length
    });

    return { nodes, links };
  }

  getConnectionStatus(): MCPConnectionStatus {
    return this.serverStatus;
  }

  async refreshConnectionStatus(): Promise<MCPConnectionStatus> {
    await this.connect();
    return this.serverStatus;
  }
}

// Create MCP client factory
export function createMCPClient(): MCPClient {
  return new MCPClient();
} 