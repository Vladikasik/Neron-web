import type { GraphData, GraphNode, GraphLink, MCPGraphData } from '../types/graph';
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
const debugLog = (category: string, message: string, data?: unknown) => {
  console.log(`[MCP ${category}] ${message}`, data || '');
};

export class MCPClient {
  private lastConnectionTest: Date | null = null;
  private serverStatus: MCPConnectionStatus = {
    connected: false,
    lastPing: null,
    serverName: 'memory',
    url: 'https://memory.aynshteyn.dev/sse',
    toolsAvailable: [],
    errors: []
  };

  private systemPrompt = `You are a helpful AI assistant that can work with graph data through MCP tools when appropriate.

# Available MCP Tools:
- read_graph() - Get complete graph structure 
- find_nodes(names) - Find specific nodes by name
- create_entities(entities) - Create new entities
- create_relations(relations) - Create relationships
- add_observations(observations) - Add observations

# When to Use MCP Tools:
- Use read_graph() when user asks to see/load/refresh the complete graph
- Use find_nodes() when user wants to find/search specific nodes  
- Use create_entities() when user wants to add new concepts/nodes
- Use create_relations() when user wants to connect entities

# Guidelines:
- You can answer questions without using tools when appropriate
- Use tools when the user explicitly requests graph operations
- When you use read_graph() or find_nodes(), the user's graph will update automatically
- Provide helpful responses whether you use tools or not

Feel free to have normal conversations and only use MCP tools when they're actually needed for graph operations.`;

  async connect(): Promise<boolean> {
    debugLog('Connection', 'Testing MCP connection...');
    
    try {
      const startTime = Date.now();
      
      const isConnected = await this.testConnection();
      
      const responseTime = Date.now() - startTime;
      this.lastConnectionTest = new Date();
      
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
      this.serverStatus.connected = false;
      this.serverStatus.errors = [error instanceof Error ? error.message : 'Unknown error'];
      return false;
    }
  }

  private async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendRawMessage('Use read_graph tool to test connection');
      
      // Check if MCP tools were used in the response
      const mcpToolUses = response.content?.filter((c): c is MCPToolUse => c.type === 'mcp_tool_use') || [];
      const hasDebugInfo = response.debug?.mcpServers && response.debug.mcpServers.length > 0;
      
      if (mcpToolUses.length > 0) {
        this.serverStatus.toolsAvailable = mcpToolUses.map((t) => t.name);
      }
      
      return mcpToolUses.length > 0 || Boolean(hasDebugInfo);
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
              allowed_tools: [
                "read_graph", 
                "find_nodes", 
                "create_entities", 
                "create_relations", 
                "add_observations",
                "delete_entities",
                "delete_observations", 
                "delete_relations",
                "search_nodes",
                "open_nodes"
              ]
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
      
      // Enhanced debugging for tool use detection
      debugLog('Tool Detection', 'Starting MCP tool detection analysis...');
      debugLog('Tool Detection', 'Raw response content:', data.content);
      debugLog('Tool Detection', 'Content array length:', data.content?.length || 0);
      
             // Detailed content analysis
       if (data.content) {
         data.content.forEach((item: MCPContent, index: number) => {
           debugLog('Tool Detection', `Content block ${index}:`, {
             type: item.type,
             hasText: 'text' in item && !!(item as MCPContentBlock).text,
             hasName: 'name' in item,
             hasServername: 'server_name' in item,
             hasInput: 'input' in item,
             hasToolUseId: 'tool_use_id' in item,
             hasIsError: 'is_error' in item,
             hasContent: 'content' in item,
             fullObject: item
           });
         });
       }

      // Log MCP tool usage with proper type guards and detailed debugging
      const mcpToolUses = data.content?.filter((c: MCPContent): c is MCPToolUse => {
        const isMcpToolUse = c.type === 'mcp_tool_use';
        debugLog('Tool Detection', `Checking if content is mcp_tool_use:`, {
          type: c.type,
          isMcpToolUse,
          content: c
        });
        return isMcpToolUse;
      }) || [];

      const mcpToolResults = data.content?.filter((c: MCPContent): c is MCPToolResult => {
        const isMcpToolResult = c.type === 'mcp_tool_result';
        debugLog('Tool Detection', `Checking if content is mcp_tool_result:`, {
          type: c.type,
          isMcpToolResult,
          content: c
        });
        return isMcpToolResult;
      }) || [];
      
      debugLog('Tool Detection', 'Filter results:', {
        totalContentBlocks: data.content?.length || 0,
        mcpToolUsesFound: mcpToolUses.length,
        mcpToolResultsFound: mcpToolResults.length,
        contentTypes: data.content?.map((c: MCPContent) => c.type) || []
      });
      
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
        debugLog('MCP Tools', 'Full tool use objects:', mcpToolUses);
      } else {
        debugLog('MCP Tools', 'No MCP tool uses detected - checking why...');
        const toolUseLikeItems = data.content?.filter((c: MCPContent) => c.type && c.type.includes('tool')) || [];
        debugLog('MCP Tools', 'Tool-like content blocks found:', toolUseLikeItems);
      }

      if (mcpToolResults.length > 0) {
        const results = mcpToolResults.map((r: MCPToolResult) => ({
          id: r.tool_use_id,
          is_error: r.is_error,
          content_length: r.content?.length || 0,
          content_types: r.content?.map((c: { type: string }) => c.type) || [],
          full_result: r
        }));
        debugLog('MCP Results', 'Tool results received:', results);
        debugLog('MCP Results', 'Full tool result objects:', mcpToolResults);
      } else {
        debugLog('MCP Results', 'No MCP tool results detected - checking why...');
        const resultLikeItems = data.content?.filter((c: MCPContent) => c.type && (c.type.includes('result') || c.type.includes('tool'))) || [];
        debugLog('MCP Results', 'Result-like content blocks found:', resultLikeItems);
      }

      return data;
    } catch (error) {
      debugLog('Error', 'Request failed:', error);
      throw error;
    }
  }

  async readGraph(strategy: CacheStrategyType = CacheStrategy.NETWORK_FIRST): Promise<GraphData> {
    debugLog('Graph', 'Reading graph with strategy:', strategy);
    
    // Always fetch fresh data for explicit read_graph commands
    debugLog('Graph', 'Fetching fresh data from MCP server...');
    const data = await this.readGraphFromMCP();
    
    debugLog('Graph', 'Fresh data received:', {
      nodeCount: data.nodes.length,
      linkCount: data.links.length,
      nodeNames: data.nodes.map(n => n.name).slice(0, 5),
      updating_cache: true
    });
    
    graphCache.set(CACHE_KEYS.FULL_GRAPH, data);
    debugLog('Graph', 'Cache updated with fresh data');
    
    return data;
  }

  private async readGraphFromMCP(): Promise<GraphData> {
    debugLog('Graph', 'Fetching graph from MCP...');
    
    try {
      const response = await this.sendRawMessage(
        'Use the read_graph MCP tool to get the complete graph structure with all nodes and relationships.'
      );
      
      debugLog('Graph', 'MCP response received, extracting graph data...');
      const graphData = this.extractGraphDataFromResponse(response);
      
      debugLog('Graph', 'Graph data extraction completed:', {
        nodes: graphData.nodes.length,
        links: graphData.links.length,
        nodeTypes: [...new Set(graphData.nodes.map(n => n.type))],
        sampleNodeNames: graphData.nodes.slice(0, 3).map(n => n.name),
        linkTypes: [...new Set(graphData.links.map(l => l.relationType))]
      });
      
      if (graphData.nodes.length === 0) {
        debugLog('Graph', 'WARNING: No nodes extracted from MCP response');
      }
      
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
        `Use the find_nodes MCP tool to find these specific nodes: ${nodeNames.join(', ')}`
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
      
      // Check for successful MCP tool usage
      const mcpToolUses = response.content?.filter((c): c is MCPToolUse => c.type === 'mcp_tool_use') || [];
      const mcpToolResults = response.content?.filter((c): c is MCPToolResult => c.type === 'mcp_tool_result') || [];
      
      debugLog('Message', 'MCP tool analysis:', {
        toolUses: mcpToolUses.length,
        toolResults: mcpToolResults.length,
        toolNames: mcpToolUses.map(t => t.name)
      });
      
      // Process successful tool results
      if (mcpToolResults.length > 0) {
        await this.processToolResults(mcpToolResults, mcpToolUses);
      }
      
      // Extract text content from response
      const textContent = response.content
        ?.filter((c): c is MCPContentBlock => c.type === 'text')
        .map((c: MCPContentBlock) => c.text)
        .join('\n') || 'No response received';

      debugLog('Message', 'Response extracted:', textContent.substring(0, 100) + '...');
      
      return textContent;
    } catch (error) {
      debugLog('Error', 'Failed to send message:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async processToolResults(results: MCPToolResult[], toolUses: MCPToolUse[]): Promise<void> {
    debugLog('Process', 'Processing tool results:', { results: results.length, toolUses: toolUses.length });
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const toolUse = toolUses.find(tu => tu.id === result.tool_use_id);
      
      if (!toolUse || result.is_error) {
        debugLog('Process', 'Skipping failed/error tool result:', { toolName: toolUse?.name, isError: result.is_error });
        continue;
      }
      
      debugLog('Process', 'Processing successful tool result:', { toolName: toolUse.name, toolId: toolUse.id });
      
      // Handle read_graph tool results
      if (toolUse.name === 'read_graph') {
        debugLog('Process', 'Processing read_graph result - updating cache...');
        try {
          const graphData = this.extractGraphDataFromToolResult(result);
          if (graphData.nodes.length > 0) {
            graphCache.set(CACHE_KEYS.FULL_GRAPH, graphData);
            debugLog('Process', 'Graph cache updated from read_graph result:', {
              nodes: graphData.nodes.length,
              links: graphData.links.length
            });
            
            // Trigger graph reload event
            this.triggerGraphReload(graphData);
          }
        } catch (error) {
          debugLog('Process', 'Error processing read_graph result:', error);
        }
      }
      
      // Handle find_nodes tool results
      else if (toolUse.name === 'find_nodes') {
        debugLog('Process', 'Processing find_nodes result - extracting nodes...');
        try {
          const graphData = this.extractGraphDataFromToolResult(result);
          if (graphData.nodes.length > 0) {
            debugLog('Process', 'Found nodes from find_nodes result:', {
              nodes: graphData.nodes.length,
              nodeNames: graphData.nodes.map(n => n.name)
            });
            
            // Trigger node highlighting event
            this.triggerNodeHighlighting(graphData);
          }
        } catch (error) {
          debugLog('Process', 'Error processing find_nodes result:', error);
        }
      }
      
      // Handle other tool results
      else {
        debugLog('Process', 'Processing other tool result:', { toolName: toolUse.name });
      }
    }
  }
  
  private extractGraphDataFromToolResult(result: MCPToolResult): GraphData {
    let combinedText = '';
    
    if (result.content) {
      for (const content of result.content) {
        if (content.type === 'text' && content.text) {
          combinedText += content.text + '\n';
        }
      }
    }
    
    if (!combinedText) {
      return { nodes: [], links: [] };
    }
    
    try {
      const mcpData: MCPGraphData = JSON.parse(combinedText);
      return this.transformMCPToGraphData(mcpData);
    } catch (error) {
      debugLog('Extract', 'Failed to parse tool result JSON:', error);
      return { nodes: [], links: [] };
    }
  }
  
  private triggerGraphReload(graphData: GraphData): void {
    debugLog('Event', 'Triggering graph reload event');
    window.dispatchEvent(new CustomEvent('mcpGraphReload', { detail: graphData }));
  }
  
  private triggerNodeHighlighting(graphData: GraphData): void {
    debugLog('Event', 'Triggering node highlighting event');
    const nodeIds = graphData.nodes.map(n => n.id);
    window.dispatchEvent(new CustomEvent('mcpNodeHighlight', { detail: { nodeIds } }));
  }

  private extractGraphDataFromResponse(response: MCPResponse): GraphData {
    try {
      debugLog('Extract', 'Full response content for debugging:', response.content);
      
      // Look for MCP tool results that contain graph data
      const mcpToolResults = response.content?.filter((c): c is MCPToolResult => c.type === 'mcp_tool_result') || [];
      
      debugLog('Extract', 'Found MCP tool results:', mcpToolResults);
      
      if (mcpToolResults.length === 0) {
        debugLog('Extract', 'No MCP tool results found in response');
        return { nodes: [], links: [] };
      }

      // Extract text content from tool results - based on .docs example format
      let combinedText = '';
      for (const result of mcpToolResults) {
        debugLog('Extract', 'Processing tool result:', result);
        
        if (!result.is_error && result.content) {
          for (const content of result.content) {
            debugLog('Extract', 'Processing content block:', content);
            if (content.type === 'text' && content.text) {
              debugLog('Extract', 'Adding text to combinedText:', content.text.substring(0, 200) + '...');
              combinedText += content.text + '\n';
            }
          }
        }
      }

      debugLog('Extract', 'Combined text from MCP results:', combinedText);

      if (!combinedText) {
        debugLog('Extract', 'No text content found in tool results');
        return { nodes: [], links: [] };
      }

      // Parse JSON data (format: {entities: [...], relations: [...]})
      try {
        const mcpData: MCPGraphData = JSON.parse(combinedText);
        debugLog('Extract', 'Parsed MCP data:', mcpData);
        return this.transformMCPToGraphData(mcpData);
      } catch (parseError) {
        debugLog('Extract', 'Failed to parse JSON from MCP result:', parseError);
        debugLog('Extract', 'Raw text that failed to parse:', combinedText);
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