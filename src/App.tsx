import { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'lucide-react';
import Graph3D from './components/Graph3D';
import type { Graph3DRef } from './components/Graph3D';
import NodeCard from './components/NodeCard';
import Console from './components/Console';
import type { ConsoleRef } from './components/Console';
import { createMCPClient } from './lib/mcpIntegration';
import { graphCache, CACHE_KEYS } from './lib/graphCache';
import { transformMCPToGraphData } from './lib/dataTransformer';
import type { GraphData, GraphNode, GraphLink, NodeSelection } from './types/graph';
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

    setState(prev => ({
      ...prev,
      selectedNodes: [newSelection]
    }));

    // Center on clicked node
    setTimeout(() => {
      graphRef.current?.centerOnNode(node.id);
    }, 100);

    consoleRef.current?.addMessage({
      type: 'system',
      content: `NODE SELECTED: ${node.name} (${node.type})`
    });
  }, []);

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

  const handleReset = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedNodes: [],
      highlightedNodes: new Set(),
      highlightedLinks: new Set(),
      hoveredNode: null
    }));
    
    graphRef.current?.refresh();
    
    consoleRef.current?.addMessage({
      type: 'system',
      content: 'GRAPH RESET COMPLETE'
    });
  }, []);

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(state.graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'neron-graph-export.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    consoleRef.current?.addMessage({
      type: 'system',
      content: 'GRAPH DATA EXPORTED'
    });
  }, [state.graphData]);

  return (
    <div className="tactical-bg w-full h-screen relative">
      
      {/* 3D Graph */}
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

      {/* Tactical HUD */}
      <div className="tactical-hud">
        {/* Status Bar */}
        <div className="tactical-status-bar">
          <div className="tactical-text tactical-text-primary">
            NERON TACTICAL INTERFACE // SYSTEM ONLINE
          </div>
          <div className="tactical-text tactical-text-dim">
            NODES: {state.graphData.nodes.length} // LINKS: {state.graphData.links.length}
          </div>
        </div>

        {/* Controls Panel */}
        <div className="tactical-controls">
          <div className="tactical-panel-header">
            GRAPH CONTROLS
          </div>
          <div className="tactical-panel-content space-y-2">
            <button 
              onClick={handleReset}
              className="tactical-button w-full tactical-text-xs"
            >
              RESET GRAPH
            </button>
            <button 
              onClick={handleExport}
              className="tactical-button w-full tactical-text-xs"
            >
              EXPORT DATA
            </button>
            <button 
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  document.documentElement.requestFullscreen();
                }
              }}
              className="tactical-button w-full tactical-text-xs"
            >
              FULLSCREEN
            </button>
          </div>
        </div>

        {/* Minimap */}
        <div className="tactical-minimap">
          <div className="tactical-panel-header">
            TACTICAL OVERVIEW
          </div>
          <div className="tactical-panel-content h-full">
            <svg width="100%" height="100%" viewBox="-150 -150 300 300">
              {/* Grid */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--tactical-grid))" strokeWidth="0.5" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Links */}
              {state.graphData.links.map((link, index) => {
                const sourceNode = state.graphData.nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
                const targetNode = state.graphData.nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
                if (!sourceNode || !targetNode) return null;
                
                return (
                  <line
                    key={index}
                    x1={sourceNode.x || 0}
                    y1={sourceNode.y || 0}
                    x2={targetNode.x || 0}
                    y2={targetNode.y || 0}
                    stroke="hsl(var(--tactical-primary))"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                );
              })}
              
              {/* Nodes */}
              {state.graphData.nodes.map((node) => (
                <circle
                  key={node.id}
                  cx={node.x || 0}
                  cy={node.y || 0}
                  r={Math.max(2, (node.size || 5) / 2)}
                  fill={state.highlightedNodes.has(node.id) ? "hsl(var(--tactical-accent))" : "hsl(var(--tactical-primary))"}
                  opacity={state.highlightedNodes.has(node.id) ? 1 : 0.8}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Shortcuts Panel */}
        <div className="tactical-shortcuts">
          <div className="tactical-panel-header">
            SHORTCUTS
          </div>
          <div className="tactical-panel-content">
            <div className="space-y-1 tactical-text-xs">
              <div className="flex justify-between">
                <span className="tactical-text-dim">HOVER:</span>
                <span className="tactical-text-primary">H</span>
              </div>
              <div className="flex justify-between">
                <span className="tactical-text-dim">CONSOLE:</span>
                <span className="tactical-text-primary">/</span>
              </div>
              <div className="flex justify-between">
                <span className="tactical-text-dim">FULLSCREEN:</span>
                <span className="tactical-text-primary">F</span>
              </div>
              <div className="flex justify-between">
                <span className="tactical-text-dim">CLICK:</span>
                <span className="tactical-text-primary">SELECT</span>
              </div>
              <div className="flex justify-between">
                <span className="tactical-text-dim">DBLCLICK:</span>
                <span className="tactical-text-primary">LOCK</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Console Toggle Button */}
      {!state.isConsoleVisible && (
        <button
          onClick={handleToggleConsole}
          className="tactical-toggle"
          title="Open Console"
        >
          <Terminal size={14} />
        </button>
      )}

      {/* Console */}
      {state.isConsoleVisible && (
        <Console
          ref={consoleRef}
          isVisible={state.isConsoleVisible}
          onToggle={handleToggleConsole}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* Node Cards */}
      {state.selectedNodes.map((selection, index) => (
        <NodeCard
          key={selection.node.id}
          selection={selection}
          allNodes={state.graphData.nodes}
          allLinks={state.graphData.links}
          onClose={() => handleCloseNodeCard(index)}
        />
      ))}
    </div>
  );
}

export default App;
