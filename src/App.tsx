import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Code } from 'lucide-react';
import Graph3D from './components/Graph3D';
import type { Graph3DRef } from './components/Graph3D';
import NodeCard from './components/NodeCard';
import Console from './components/Console';
import type { ConsoleRef } from './components/Console';
import { createMCPClient } from './lib/mcpIntegration';
import { graphCache, CACHE_KEYS } from './lib/graphCache';
import type { GraphData, GraphNode, GraphState, NodeSelection } from './types/graph';
import './index.css';

function App() {
  // Core state
  const [graphState, setGraphState] = useState<GraphState>({
    data: { nodes: [], links: [] },
    selectedNodes: [],
    highlightedNodes: new Set(),
    highlightedLinks: new Set(),
    hoveredNode: null,
    isHoverMode: true
  });

  // UI state
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const graphRef = useRef<Graph3DRef>(null);
  const consoleRef = useRef<ConsoleRef>(null);
  const mcpClientRef = useRef(createMCPClient());

  // Initialize with sample data from our Neo4j graph
  const sampleData: GraphData = useMemo(() => ({
    nodes: [
      {
        id: "Neron Graph Visualization Project",
        name: "Neron Graph Visualization Project", 
        type: "Project",
        observations: [
          "React-based 3D graph visualization with AI-powered MCP integration",
          "Features interactive node exploration and AI-driven second brain functionality",
          "Uses react-force-graph-3d for 3D visualization with Shadcn UI and Mono theme",
          "Integrates Claude API with MCP servers for dynamic graph data management",
          "Includes draggable console for debugging and real-time AI interaction"
        ],
        color: "#00ff41",
        size: 10
      },
      {
        id: "Project Setup Phase",
        name: "Project Setup Phase",
        type: "Development Phase", 
        observations: [
          "Initialize React project with required dependencies",
          "Configure Shadcn UI with Mono theme and Matrix-style effects",
          "Set up Vercel deployment configuration",
          "Create environment configuration for Claude API and MCP server"
        ],
        color: "#00cc33",
        size: 8
      },
      {
        id: "Graph Data Flow System",
        name: "Graph Data Flow System",
        type: "Development Phase",
        observations: [
          "Implement data transformer for AI MCP tool output to graph format",
          "Create caching mechanism for graph data persistence", 
          "Build read_graph method for full graph updates",
          "Develop find_nodes method for selective highlighting and centering"
        ],
        color: "#00cc33",
        size: 8
      },
      {
        id: "3D Graph Visualization",
        name: "3D Graph Visualization", 
        type: "Development Phase",
        observations: [
          "Integrate react-force-graph-3d for 3D node visualization",
          "Implement hover functionality with window-in-window cards",
          "Create click/double-click interactions for node selection and highlighting",
          "Build draggable information cards for selected nodes"
        ],
        color: "#00cc33",
        size: 8
      }
    ],
    links: [
      {
        source: "Neron Graph Visualization Project",
        target: "Project Setup Phase",
        relationType: "includes",
        color: "#00ff41",
        width: 2
      },
      {
        source: "Neron Graph Visualization Project", 
        target: "Graph Data Flow System",
        relationType: "includes",
        color: "#00ff41",
        width: 2
      },
      {
        source: "Neron Graph Visualization Project",
        target: "3D Graph Visualization", 
        relationType: "includes",
        color: "#00ff41",
        width: 2
      },
      {
        source: "Project Setup Phase",
        target: "Graph Data Flow System",
        relationType: "precedes",
        color: "#00ff41", 
        width: 2
      }
    ]
  }), []);

  // Initialize graph data
  useEffect(() => {
    setGraphState(prev => ({
      ...prev,
      data: sampleData
    }));
    
    // Cache the sample data
    graphCache.set(CACHE_KEYS.FULL_GRAPH, sampleData);
  }, [sampleData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          setGraphState(prev => ({
            ...prev,
            isHoverMode: !prev.isHoverMode
          }));
          consoleRef.current?.addMessage({
            type: 'system',
            content: `Hover mode ${graphState.isHoverMode ? 'disabled' : 'enabled'}`
          });
          break;
        
        case '/':
          e.preventDefault();
          setIsConsoleVisible(prev => !prev);
          if (!isConsoleVisible) {
            setTimeout(() => consoleRef.current?.focus(), 100);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [graphState.isHoverMode, isConsoleVisible]);

  // Graph interaction handlers
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setGraphState(prev => ({
      ...prev,
      hoveredNode: node
    }));
  }, []);

  const handleNodeClick = useCallback((node: GraphNode, event: MouseEvent) => {
    const newSelection: NodeSelection = {
      node,
      position: { x: event.clientX + 20, y: event.clientY + 20 },
      persistent: false
    };

    setGraphState(prev => {
      // Remove existing non-persistent selections
      const persistentSelections = prev.selectedNodes.filter(sel => sel.persistent);
      
      // Center the graph on the clicked node
      setTimeout(() => {
        graphRef.current?.centerOnNode(node.id);
      }, 100);

      return {
        ...prev,
        selectedNodes: [...persistentSelections, newSelection]
      };
    });

    consoleRef.current?.addMessage({
      type: 'system',
      content: `Selected node: ${node.name} (${node.type})`
    });
  }, []);

  const handleNodeDoubleClick = useCallback((node: GraphNode, event: MouseEvent) => {
    const newSelection: NodeSelection = {
      node,
      position: { x: event.clientX + 20, y: event.clientY + 20 },
      persistent: true
    };

    // Find connected nodes for highlighting
    const connectedNodeIds = new Set<string>();
    const connectedLinkIds = new Set<string>();

    graphState.data.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (sourceId === node.id || targetId === node.id) {
        connectedNodeIds.add(sourceId);
        connectedNodeIds.add(targetId);
        connectedLinkIds.add(`${sourceId}-${targetId}`);
      }
    });

    setGraphState(prev => ({
      ...prev,
      selectedNodes: [newSelection],
      highlightedNodes: connectedNodeIds,
      highlightedLinks: connectedLinkIds
    }));

    // Center on connected nodes
    setTimeout(() => {
      graphRef.current?.centerOnNodes(Array.from(connectedNodeIds));
    }, 100);

    consoleRef.current?.addMessage({
      type: 'system',
      content: `Persistent selection: ${node.name}. Highlighted ${connectedNodeIds.size} connected nodes.`
    });
  }, [graphState.data.links]);

  const handleBackgroundClick = useCallback(() => {
    setGraphState(prev => ({
      ...prev,
      selectedNodes: prev.selectedNodes.filter(sel => sel.persistent),
      highlightedNodes: new Set(),
      highlightedLinks: new Set()
    }));
  }, []);

  const handleCloseNodeCard = useCallback((index: number) => {
    setGraphState(prev => ({
      ...prev,
      selectedNodes: prev.selectedNodes.filter((_, i) => i !== index)
    }));
  }, []);

  const handleNodeCardClick = useCallback((nodeId: string) => {
    const node = graphState.data.nodes.find(n => n.id === nodeId);
    if (node) {
      // Simulate a double-click to select and highlight
      handleNodeDoubleClick(node, { clientX: 400, clientY: 300 } as MouseEvent);
    }
  }, [graphState.data.nodes, handleNodeDoubleClick]);

  // Console message handler
  const handleSendMessage = useCallback(async (message: string): Promise<string> => {
    setIsLoading(true);
    consoleRef.current?.addMessage({
      type: 'system',
      content: `Processing command: "${message}"`
    });

    try {
      // Handle graph-specific commands directly
      if (message.toLowerCase().includes('read graph')) {
        consoleRef.current?.addMessage({
          type: 'system',
          content: '🔄 Starting read_graph command...'
        });
        
        consoleRef.current?.addMessage({
          type: 'system',
          content: '📡 Calling Claude API with MCP read_graph tool...'
        });
        
        const startTime = Date.now();
        const newGraphData = await mcpClientRef.current.readGraph();
        const requestTime = Date.now() - startTime;
        
        consoleRef.current?.addMessage({
          type: 'system',
          content: `⏱️ MCP request completed in ${requestTime}ms`
        });
        
        if (newGraphData.nodes.length > 0) {
          consoleRef.current?.addMessage({
            type: 'system',
            content: `📊 Received: ${newGraphData.nodes.length} nodes, ${newGraphData.links.length} links`
          });
          
          consoleRef.current?.addMessage({
            type: 'system',
            content: `🏷️ Node types: ${[...new Set(newGraphData.nodes.map(n => n.type))].join(', ')}`
          });
          
          consoleRef.current?.addMessage({
            type: 'system',
            content: `📝 Sample nodes: ${newGraphData.nodes.slice(0, 3).map(n => n.name).join(', ')}${newGraphData.nodes.length > 3 ? '...' : ''}`
          });
          
          setGraphState(prev => ({
            ...prev,
            data: newGraphData
          }));
          graphCache.set(CACHE_KEYS.FULL_GRAPH, newGraphData);
          
          consoleRef.current?.addMessage({
            type: 'mcp_tool',
            content: `✅ Graph updated: ${newGraphData.nodes.length} nodes, ${newGraphData.links.length} links`,
            toolName: 'read_graph'
          });
          
          consoleRef.current?.addMessage({
            type: 'system',
            content: `💾 Graph data cached and UI updated`
          });
          
          return `✅ Successfully loaded graph with ${newGraphData.nodes.length} nodes and ${newGraphData.links.length} relationships.\n\n📋 Node Details:\n${newGraphData.nodes.map(n => `• ${n.name} (${n.type}) - ${n.observations.length} observations`).join('\n')}`;
        } else {
          consoleRef.current?.addMessage({
            type: 'error',
            content: '❌ No graph data received from MCP server'
          });
          return '❌ Graph loaded but no data was returned. Check MCP server connection and data.';
        }
      }
      
      // Handle find nodes commands
      if (message.toLowerCase().includes('find nodes') || message.toLowerCase().includes('find_nodes')) {
        const nodeNames = message.split(/find[_ ]nodes/i)[1]?.trim()
          .split(/[,\s]+/)
          .filter(name => name.length > 0) || [];
          
        if (nodeNames.length === 0) {
          return 'Please specify node names to find. Example: "find nodes Tesla, Aurora"';
        }
        
        consoleRef.current?.addMessage({
          type: 'system', 
          content: `Using find_nodes MCP tool to search for: ${nodeNames.join(', ')}`
        });
        
        const result = await mcpClientRef.current.findNodes(nodeNames);
        if (result.nodes.length > 0) {
          // Highlight found nodes
          const foundNodeIds = new Set(result.nodes.map(n => n.id));
          const highlightedLinkIds = new Set(result.highlightedLinks);
          
          setGraphState(prev => ({
            ...prev,
            highlightedNodes: foundNodeIds,
            highlightedLinks: highlightedLinkIds
          }));
          
          consoleRef.current?.addMessage({
            type: 'mcp_tool',
            content: `Found ${result.nodes.length} nodes, highlighted ${result.highlightedLinks.length} connections`,
            toolName: 'find_nodes'
          });
          
          return `Found ${result.nodes.length} nodes: ${result.nodes.map(n => n.name).join(', ')}`;
        } else {
          return `No nodes found matching: ${nodeNames.join(', ')}`;
        }
      }
      
      // For all other messages, use regular AI chat
      const response = await mcpClientRef.current.sendMessage(message);
      return response;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Error handling
  useEffect(() => {
    if (error) {
      consoleRef.current?.addMessage({
        type: 'error',
        content: error,
        isError: true
      });
    }
  }, [error]);

  return (
    <div className="w-screen h-screen bg-background matrix-bg overflow-hidden relative">
      {/* Main Graph Container */}
      <div className="w-full h-full">
        <Graph3D
          ref={graphRef}
          data={graphState.data}
          selectedNodes={graphState.selectedNodes}
          highlightedNodes={graphState.highlightedNodes}
          highlightedLinks={graphState.highlightedLinks}
          isHoverMode={graphState.isHoverMode}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onBackgroundClick={handleBackgroundClick}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      </div>

      {/* Console Toggle Button */}
      <button
        onClick={() => setIsConsoleVisible(prev => !prev)}
        className={`fixed bottom-4 left-4 z-30 p-3 bg-card border border-green-500 rounded-lg shadow-lg hover:bg-accent transition-colors ${
          isConsoleVisible ? 'bg-green-500 text-black' : 'bg-black text-green-500'
        }`}
        title="Toggle Console (Press /)"
        style={{ 
          backgroundColor: isConsoleVisible ? '#00ff41' : '#000',
          borderColor: '#00ff41',
          color: isConsoleVisible ? '#000' : '#00ff41'
        }}
      >
        <Code size={20} />
      </button>

      {/* Console */}
      <Console
        ref={consoleRef}
        isVisible={isConsoleVisible}
        onToggle={() => setIsConsoleVisible(false)}
        onSendMessage={handleSendMessage}
      />

      {/* Node Cards */}
      {graphState.selectedNodes.map((selection, index) => (
        <NodeCard
          key={`${selection.node.id}-${index}`}
          selection={selection}
          allNodes={graphState.data.nodes}
          allLinks={graphState.data.links}
          onClose={() => handleCloseNodeCard(index)}
          onNodeClick={handleNodeCardClick}
        />
      ))}

      {/* Hover Info Card */}
      {graphState.hoveredNode && graphState.isHoverMode && (
        <div 
          className="fixed z-30 bg-black border border-green-500 rounded-lg shadow-lg p-3 max-w-xs pointer-events-none"
          style={{ 
            left: window.innerWidth / 2 + 50, 
            top: 50,
            backgroundColor: '#000',
            borderColor: '#00ff41',
            color: '#00ff41'
          }}
        >
          <h4 className="font-semibold text-green-500">{graphState.hoveredNode.name}</h4>
          <p className="text-sm text-green-400 mb-2">{graphState.hoveredNode.type}</p>
          <div className="text-xs text-green-400 space-y-1">
            <div>• {graphState.hoveredNode.observations.length} observations</div>
            <div>• Size: {graphState.hoveredNode.size || 5}</div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div 
          className="fixed top-4 right-4 z-30 bg-black border border-green-500 rounded-lg shadow-lg p-3"
          style={{
            backgroundColor: '#000',
            borderColor: '#00ff41',
            color: '#00ff41'
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-green-500">Processing...</span>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div 
        className="fixed bottom-4 right-4 z-30 bg-black border border-green-500 rounded-lg shadow-lg p-3 text-xs text-green-400"
        style={{
          backgroundColor: '#000',
          borderColor: '#00ff41',
          color: '#00ff41'
        }}
      >
        <div className="font-medium text-green-500 mb-1">Shortcuts:</div>
        <div>H - Toggle hover mode</div>
        <div>/ - Toggle console</div>
        <div>Click - Select node</div>
        <div>Double-click - Highlight connections</div>
      </div>
    </div>
  );
}

export default App;
