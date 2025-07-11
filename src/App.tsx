import { useState, useEffect, useRef, useCallback } from 'react';

import Graph3D from './components/Graph3D';
import type { Graph3DRef } from './components/Graph3D';
import NodeCard from './components/NodeCard';
import Console from './components/Console';
import type { ConsoleRef } from './components/Console';
import { createMCPClient } from './lib/mcpIntegration';
import { graphCache, CACHE_KEYS } from './lib/graphCache';
import { transformMCPToGraphData } from './lib/dataTransformer';
import type { GraphData, GraphNode, GraphLink, NodeSelection } from './types/graph';
import { useAuth } from './hooks/useAuth';
import './index.css';

interface AppState {
  graphData: GraphData;
  selectedNodes: NodeSelection[];
  highlightedNodes: Set<string>;
  highlightedLinks: Set<string>;
  hoveredNode: GraphNode | null;
  isHoverMode: boolean;
  isConsoleVisible: boolean;
  isLoading: boolean;
  error: string | null;
}

function App() {
  const { user, signOut } = useAuth();
  
  console.log('🔧 [AUTH] App rendering for user:', user?.email);
  
  // Simple sample data for testing
  const initialData: GraphData = {
    nodes: [
      {
        id: "NERON-CORE",
        name: "NERON-CORE",
        type: "SYSTEM",
        observations: [
          "PRIMARY TACTICAL GRAPH VISUALIZATION NODE",
          "COORDINATES ALL NEURAL NETWORK OPERATIONS",
          "MISSION STATUS: ACTIVE"
        ],
        color: "#00FF66",
        size: 10,
        x: 0,
        y: 0,
        z: 0,
        tags: [{ name: "CORE", weight: 10, category: "type" }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          importance: 10,
          keywords: ["core", "system", "primary"],
          connectionStrength: 10
        }
      },
      {
        id: "DATA-FLOW",
        name: "DATA-FLOW",
        type: "PROCESS",
        observations: [
          "HANDLES ALL DATA TRANSFORMATION PROCESSES",
          "CONNECTS MCP TOOLS TO GRAPH STRUCTURE",
          "REAL-TIME PROCESSING ENABLED"
        ],
        color: "#00CCFF",
        size: 8,
        x: 100,
        y: 50,
        z: 0,
        tags: [{ name: "DATA", weight: 8, category: "type" }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          importance: 8,
          keywords: ["data", "flow", "process"],
          connectionStrength: 8
        }
      },
      {
        id: "NEURAL-INTERFACE",
        name: "NEURAL-INTERFACE",
        type: "INTERFACE",
        observations: [
          "PROVIDES HUMAN-MACHINE INTERFACE",
          "HANDLES CONSOLE COMMUNICATIONS",
          "TACTICAL COMMAND PROCESSING"
        ],
        color: "#B2FF00",
        size: 8,
        x: -100,
        y: -50,
        z: 0,
        tags: [{ name: "INTERFACE", weight: 8, category: "type" }],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          importance: 8,
          keywords: ["neural", "interface", "command"],
          connectionStrength: 8
        }
      }
    ],
    links: [
      {
        source: "NERON-CORE",
        target: "DATA-FLOW",
        relationType: "CONTROLS",
        color: "#00FF66",
        width: 2,
        strength: 8
      },
      {
        source: "NERON-CORE",
        target: "NEURAL-INTERFACE",
        relationType: "INTERFACES",
        color: "#00FF66",
        width: 2,
        strength: 8
      }
    ],
    layers: [],
    tagIndex: new Map()
  };

  const [state, setState] = useState<AppState>({
    graphData: initialData,
    selectedNodes: [],
    highlightedNodes: new Set(),
    highlightedLinks: new Set(),
    hoveredNode: null,
    isHoverMode: true,
    isConsoleVisible: false,
    isLoading: false,
    error: null
  });

  // Refs
  const graphRef = useRef<Graph3DRef>(null);
  const consoleRef = useRef<ConsoleRef>(null);
  const mcpClientRef = useRef(createMCPClient());

  // Initialize with sample data
  useEffect(() => {
    graphCache.set(CACHE_KEYS.FULL_GRAPH, initialData);
    
    // Apply dark theme to html element
    document.documentElement.classList.add('dark');
    
    // Add welcome message
    setTimeout(() => {
      consoleRef.current?.addMessage({
        type: 'system',
        content: 'TACTICAL NEURAL INTERFACE ONLINE. GRAPH VISUALIZATION READY.'
      });
    }, 1000);
  }, []);

  // Enhanced MCP event handling
  useEffect(() => {
    const handleGraphReload = (event: CustomEvent) => {
      const rawGraphData = event.detail;
      console.log('🔥 [NERON] GRAPH RELOAD:', rawGraphData);
      
      let enhancedData: GraphData = rawGraphData;
      if (!rawGraphData.layers || !rawGraphData.tagIndex) {
        enhancedData = transformMCPToGraphData({
          entities: rawGraphData.nodes.map((n: GraphNode) => ({
            name: n.name,
            type: n.type,
            observations: n.observations
          })),
          relations: rawGraphData.links.map((l: GraphLink) => ({
            source: typeof l.source === 'string' ? l.source : l.source.id,
            target: typeof l.target === 'string' ? l.target : l.target.id,
            relationType: l.relationType
          }))
        });
      }
      
      setState(prev => ({
        ...prev,
        graphData: enhancedData,
        highlightedNodes: new Set(),
        highlightedLinks: new Set()
      }));
      
      consoleRef.current?.addMessage({
        type: 'system',
        content: `GRAPH UPDATED: ${enhancedData.nodes.length} NODES, ${enhancedData.links.length} LINKS`
      });
    };
    
    const handleNodeHighlight = (event: CustomEvent) => {
      const { nodeIds } = event.detail;
      console.log('🎯 [NERON] NODE HIGHLIGHT:', nodeIds);
      
      const connectedLinkIds = new Set<string>();
      state.graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (nodeIds.includes(sourceId) || nodeIds.includes(targetId)) {
          connectedLinkIds.add(`${sourceId}-${targetId}`);
        }
      });
      
      setState(prev => ({
        ...prev,
        highlightedNodes: new Set(nodeIds),
        highlightedLinks: connectedLinkIds
      }));
      
      // Center on highlighted nodes
      setTimeout(() => {
        graphRef.current?.centerOnNodes(nodeIds);
      }, 100);
      
      consoleRef.current?.addMessage({
        type: 'system',
        content: `NODES HIGHLIGHTED: ${nodeIds.join(', ')}`
      });
    };
    
    window.addEventListener('mcpGraphReload', handleGraphReload as EventListener);
    window.addEventListener('mcpNodeHighlight', handleNodeHighlight as EventListener);
    
    return () => {
      window.removeEventListener('mcpGraphReload', handleGraphReload as EventListener);
      window.removeEventListener('mcpNodeHighlight', handleNodeHighlight as EventListener);
    };
  }, [state.graphData.links]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          setState(prev => ({
            ...prev,
            isHoverMode: !prev.isHoverMode
          }));
          consoleRef.current?.addMessage({
            type: 'system',
            content: `HOVER MODE ${!state.isHoverMode ? 'ENABLED' : 'DISABLED'}`
          });
          break;
        
        case '/':
          e.preventDefault();
          setState(prev => ({
            ...prev,
            isConsoleVisible: !prev.isConsoleVisible
          }));
          if (!state.isConsoleVisible) {
            setTimeout(() => consoleRef.current?.focus(), 100);
          }
          break;
        
        case 'f':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isHoverMode, state.isConsoleVisible]);

  // Graph interaction handlers
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setState(prev => ({
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

    setState(prev => {
      // In hover mode, replace existing selections (original behavior)
      if (prev.isHoverMode) {
        return {
          ...prev,
          selectedNodes: [newSelection]
        };
      } else {
        // In no hover mode, allow multiple tabs without centering
        // Check if this node is already selected
        const existingIndex = prev.selectedNodes.findIndex(sel => sel.node.id === node.id);
        if (existingIndex >= 0) {
          // Node already selected, don't add duplicate
          return prev;
        } else {
          // Add new selection to existing ones
          return {
            ...prev,
            selectedNodes: [...prev.selectedNodes, newSelection]
          };
        }
      }
    });

    // Only center on clicked node if in hover mode
    if (state.isHoverMode) {
      setTimeout(() => {
        graphRef.current?.centerOnNode(node.id);
      }, 100);
    }

    consoleRef.current?.addMessage({
      type: 'system',
      content: `NODE SELECTED: ${node.name} (${node.type})`
    });
  }, [state.isHoverMode]);

  const handleNodeDoubleClick = useCallback((node: GraphNode, event: MouseEvent) => {
    const newSelection: NodeSelection = {
      node,
      position: { x: event.clientX + 20, y: event.clientY + 20 },
      persistent: true
    };

    // Find connected nodes
    const connectedNodeIds = new Set<string>();
    const connectedLinkIds = new Set<string>();

    state.graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (sourceId === node.id || targetId === node.id) {
        connectedNodeIds.add(sourceId);
        connectedNodeIds.add(targetId);
        connectedLinkIds.add(`${sourceId}-${targetId}`);
      }
    });

    setState(prev => ({
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
      content: `NODE LOCKED: ${node.name}. HIGHLIGHTED ${connectedNodeIds.size} CONNECTED NODES.`
    });
  }, [state.graphData.links]);

  const handleBackgroundClick = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedNodes: prev.selectedNodes.filter(sel => sel.persistent),
      highlightedNodes: new Set(),
      highlightedLinks: new Set()
    }));
  }, []);

  const handleCloseNodeCard = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedNodes: prev.selectedNodes.filter((_, i) => i !== index)
    }));
  }, []);

  // Console message handler
  const handleSendMessage = useCallback(async (message: string): Promise<string> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await mcpClientRef.current.sendMessage(message);
      return response;
    } catch (error) {
      return `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleToggleConsole = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConsoleVisible: !prev.isConsoleVisible
    }));
  }, []);



  return (
    <div className="tactical-bg w-full h-screen relative">
      
      {/* LAYER: GRAPH (Bottom) */}
      <div className="absolute inset-0 z-[1]">
        <Graph3D
          ref={graphRef}
          data={state.graphData}
          selectedNodes={state.selectedNodes}
          highlightedNodes={state.highlightedNodes}
          highlightedLinks={state.highlightedLinks}
          isHoverMode={state.isHoverMode}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onBackgroundClick={handleBackgroundClick}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      </div>

      {/* LAYER 0: UI CONTROLS (Above Graph) */}
      <div className="fixed inset-0 z-[10] pointer-events-none">
        
        {/* Console Toggle Button - Bottom Left Corner */}
        {!state.isConsoleVisible && (
          <button
            onClick={handleToggleConsole}
            className="console-toggle-button pointer-events-auto tactical-button px-3 py-2 tactical-text-xs"
            title="Toggle Console (Press /)"
          >
            /
          </button>
        )}

        {/* Logout Button - Top Right Corner */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <button
            onClick={signOut}
            className="tactical-button px-4 py-2 tactical-text-xs bg-red-900/30 border border-red-500/50 hover:bg-red-900/50 transition-colors"
            title="Sign Out"
          >
            LOGOUT [{user?.email?.split('@')[0]?.toUpperCase()}]
          </button>
        </div>

        {/* Keyboard Shortcuts - Bottom Right Corner */}
        <div className="keyboard-shortcuts pointer-events-none tactical-text tactical-text-dim tactical-text-xs opacity-60">
          <div className="text-right space-y-1">
            <div>H: Toggle Hover Mode</div>
            <div>/: Toggle Console</div>
            <div>F: Fullscreen</div>
          </div>
        </div>

      </div>

      {/* LAYER 1: WINDOWS (Above UI Controls) */}
      <div className="absolute inset-0 z-[20] pointer-events-none">
        
        {/* Console Window */}
        <Console
          ref={consoleRef}
          isVisible={state.isConsoleVisible}
          onToggle={handleToggleConsole}
          onSendMessage={handleSendMessage}
          className="pointer-events-auto"
        />

        {/* Node Information Cards */}
        {state.selectedNodes.map((selection, index) => (
          <div key={`${selection.node.id}-${index}`} className="pointer-events-auto">
            <NodeCard
              selection={selection}
              allNodes={state.graphData.nodes}
              allLinks={state.graphData.links}
              onClose={() => handleCloseNodeCard(index)}
              onNodeClick={(nodeId) => {
                const node = state.graphData.nodes.find(n => n.id === nodeId);
                if (node) {
                  const mockEvent = { clientX: 400, clientY: 300 } as MouseEvent;
                  handleNodeClick(node, mockEvent);
                }
              }}
            />
          </div>
        ))}

        {/* Hover Card */}
        {state.isHoverMode && state.hoveredNode && (
          <div className="pointer-events-none">
            <NodeCard
              selection={{
                node: state.hoveredNode,
                position: { x: 50, y: 50 },
                persistent: false
              }}
              allNodes={state.graphData.nodes}
              allLinks={state.graphData.links}
              onClose={() => {}}
              className="opacity-90"
            />
          </div>
        )}

      </div>

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="fixed inset-0 z-[50] bg-black/50 flex items-center justify-center">
          <div className="tactical-text tactical-text-primary">
            PROCESSING...
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
