import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Terminal } from 'lucide-react';
import Graph3D from './components/Graph3D';
import type { Graph3DRef } from './components/Graph3D';
import NodeCard from './components/NodeCard';
import Console from './components/Console';
import type { ConsoleRef } from './components/Console';
import LayerControls from './components/LayerControls';
import { createMCPClient } from './lib/mcpIntegration';
import { graphCache, CACHE_KEYS } from './lib/graphCache';
import { transformMCPToGraphData, extractTags, generateLayers, assignNodesToLayers } from './lib/dataTransformer';
import type { GraphData, GraphNode, GraphLink, GraphState, NodeSelection, NodeTag, NodeMetadata } from './types/graph';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import './index.css';

function App() {
  // Enhanced sample data with tags and layers
  const sampleData: GraphData = useMemo(() => {
    const baseNodes = [
      {
        id: "Neron Graph Visualization Project",
        name: "Neron Graph Visualization Project", 
        type: "Project",
        observations: [
          "React-based 3D graph visualization with AI-powered MCP integration #project #react #ai",
          "Features interactive node exploration and AI-driven second brain functionality #interactive #ai #brainstorming",
          "Uses react-force-graph-3d for 3D visualization with Shadcn UI and Mono theme #3d #visualization #ui",
          "Integrates Claude API with MCP servers for dynamic graph data management #api #integration #dynamic",
          "Includes draggable console for debugging and real-time AI interaction #console #debugging #realtime"
        ],
        color: "hsl(var(--primary))",
        size: 10,
        tags: [] as NodeTag[],
        metadata: {} as NodeMetadata
      },
      {
        id: "Project Setup Phase",
        name: "Project Setup Phase",
        type: "Development Phase", 
        observations: [
          "Initialize React project with required dependencies #setup #react #dependencies",
          "Configure Shadcn UI with Mono theme and Matrix-style effects #ui #theme #styling",
          "Set up Vercel deployment configuration #deployment #vercel #config",
          "Create environment configuration for Claude API and MCP server #environment #api #configuration"
        ],
        color: "hsl(var(--secondary))",
        size: 8,
        tags: [] as NodeTag[],
        metadata: {} as NodeMetadata
      },
      {
        id: "Graph Data Flow System",
        name: "Graph Data Flow System",
        type: "Development Phase",
        observations: [
          "Implement data transformer for AI MCP tool output to graph format #data #transformation #ai",
          "Create caching mechanism for graph data persistence #caching #persistence #performance", 
          "Build read_graph method for full graph updates #methods #api #updates",
          "Develop find_nodes method for selective highlighting and centering #search #highlighting #navigation"
        ],
        color: "hsl(var(--secondary))",
        size: 8,
        tags: [] as NodeTag[],
        metadata: {} as NodeMetadata
      },
      {
        id: "3D Graph Visualization",
        name: "3D Graph Visualization", 
        type: "Development Phase",
        observations: [
          "Integrate react-force-graph-3d for 3D node visualization #3d #visualization #library",
          "Implement hover functionality with window-in-window cards #hover #ui #interaction",
          "Create click/double-click interactions for node selection and highlighting #interaction #selection #events",
          "Build draggable information cards for selected nodes #draggable #cards #information"
        ],
        color: "hsl(var(--secondary))",
        size: 8,
        tags: [] as NodeTag[],
        metadata: {} as NodeMetadata
      }
    ];

    // Extract tags and create metadata for each node
    const enhancedNodes = baseNodes.map(node => {
      const allText = node.observations.join(' ') + ' ' + node.name;
      const tags = extractTags(allText, node.type);
      const metadata: NodeMetadata = {
        createdAt: new Date(),
        updatedAt: new Date(),
        importance: Math.round(tags.reduce((sum, tag) => sum + (tag.weight || 5), 0) / Math.max(tags.length, 1)),
        keywords: allText.split(' ').filter(word => word.length > 3).slice(0, 10),
        connectionStrength: 5
      };

      return {
        ...node,
        tags,
        metadata,
        tagString: tags.map(t => t.name).join(' ')
      };
    });

    // Generate layers and assign nodes
    const layers = generateLayers(enhancedNodes);
    const layeredNodes = assignNodesToLayers(enhancedNodes, layers);

    // Create enhanced links with layer awareness
    const links = [
      {
        source: "Neron Graph Visualization Project",
        target: "Project Setup Phase",
        relationType: "includes",
        color: "hsl(var(--primary))",
        width: 2,
        isInterLayer: false,
        strength: 7,
        tags: ['project', 'setup']
      },
      {
        source: "Neron Graph Visualization Project", 
        target: "Graph Data Flow System",
        relationType: "includes",
        color: "hsl(var(--primary))",
        width: 2,
        isInterLayer: false,
        strength: 8,
        tags: ['project', 'data']
      },
      {
        source: "Neron Graph Visualization Project",
        target: "3D Graph Visualization", 
        relationType: "includes",
        color: "hsl(var(--primary))",
        width: 2,
        isInterLayer: false,
        strength: 8,
        tags: ['project', 'visualization']
      },
      {
        source: "Project Setup Phase",
        target: "Graph Data Flow System",
        relationType: "precedes",
        color: "hsl(var(--primary))", 
        width: 2,
        isInterLayer: true,
        strength: 6,
        tags: ['development', 'workflow']
      }
    ];

    // Create tag index
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
  }, []);

  // Initialize enhanced graph state with layer controls
  const [graphState, setGraphState] = useState<GraphState>({
    data: { nodes: [], links: [], layers: [], tagIndex: new Map() },
    selectedNodes: [],
    highlightedNodes: new Set(),
    highlightedLinks: new Set(),
    hoveredNode: null,
    isHoverMode: true,
    layerControls: {
      visibleLayers: new Set(),
      layerOpacity: new Map(),
      showInterLayerConnections: true,
      tagFilter: [],
      layerSpacing: 200
    },
    activeFilters: {
      tags: [],
      types: [],
      layers: [],
      searchQuery: ''
    }
  });

  // UI state
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const graphRef = useRef<Graph3DRef>(null);
  const consoleRef = useRef<ConsoleRef>(null);
  const mcpClientRef = useRef(createMCPClient());

  // Initialize graph data with enhanced layer controls
  useEffect(() => {
    const allLayerIds = new Set(sampleData.layers?.map(l => l.id) || []);
    const defaultOpacity = new Map(sampleData.layers?.map(l => [l.id, 1.0]) || []);

    setGraphState(prev => ({
      ...prev,
      data: sampleData,
      layerControls: {
        visibleLayers: allLayerIds,
        isolatedLayer: undefined,
        layerOpacity: defaultOpacity,
        showInterLayerConnections: true,
        tagFilter: [],
        layerSpacing: 200
      }
    }));
    
    // Cache the enhanced sample data
    graphCache.set(CACHE_KEYS.FULL_GRAPH, sampleData);
  }, [sampleData]);

  // Enhanced MCP event handling for layer-aware graph updates
  useEffect(() => {
    console.log('🎯 [App] Setting up enhanced MCP event listeners...');
    
    const handleGraphReload = (event: CustomEvent) => {
      const rawGraphData = event.detail;
      console.log('🔥 [App] ENHANCED GRAPH RELOAD EVENT RECEIVED:', {
        eventType: 'mcpGraphReload',
        timestamp: new Date().toISOString(),
        nodes: rawGraphData.nodes.length,
        links: rawGraphData.links.length,
        hasLayers: Boolean(rawGraphData.layers),
        eventDetail: rawGraphData
      });
      
             // Transform raw data to enhanced format if needed
       let enhancedData: GraphData = rawGraphData;
       if (!rawGraphData.layers || !rawGraphData.tagIndex) {
         console.log('🔧 [App] Converting to enhanced format...');
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
      
      consoleRef.current?.addMessage({
        type: 'system',
        content: `🔄 Enhanced graph updated: ${enhancedData.nodes.length} nodes, ${enhancedData.links.length} links, ${enhancedData.layers?.length || 0} layers`
      });
      
             console.log('💾 [App] Updating enhanced graph state...');
       setGraphState(prev => {
         const allLayerIds = new Set<string>(enhancedData.layers?.map((layer) => layer.id) || []);
         const defaultOpacity = new Map<string, number>(enhancedData.layers?.map((layer) => [layer.id, 1.0]) || []);
         
         return {
           ...prev,
           data: enhancedData,
           highlightedNodes: new Set<string>(),
           highlightedLinks: new Set<string>(),
           layerControls: {
             ...prev.layerControls,
             visibleLayers: allLayerIds,
             layerOpacity: defaultOpacity
           }
         };
       });
      
      console.log('✅ [App] Enhanced graph reload event processing COMPLETED');
    };
    
    const handleNodeHighlight = (event: CustomEvent) => {
      const { nodeIds } = event.detail;
      console.log('🎯 [App] NODE HIGHLIGHT EVENT RECEIVED:', {
        eventType: 'mcpNodeHighlight',
        timestamp: new Date().toISOString(),
        nodeIds,
        nodeCount: nodeIds.length,
        eventDetail: event.detail
      });
      
      consoleRef.current?.addMessage({
        type: 'system',
        content: `🎯 Nodes automatically highlighted from MCP tool result: ${nodeIds.join(', ')}`
      });
      
      // Find connected links for highlighting
      console.log('🔍 [App] Finding connected links for highlighting...');
      const connectedLinkIds = new Set<string>();
      graphState.data.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        if (nodeIds.includes(sourceId) || nodeIds.includes(targetId)) {
          connectedLinkIds.add(`${sourceId}-${targetId}`);
        }
      });
      
      console.log('🔗 [App] Connected links found:', {
        linkCount: connectedLinkIds.size,
        linkIds: Array.from(connectedLinkIds)
      });
      
      setGraphState(prev => ({
        ...prev,
        highlightedNodes: new Set(nodeIds),
        highlightedLinks: connectedLinkIds
      }));
      
      // Center on highlighted nodes
      console.log('📍 [App] Centering graph on highlighted nodes...');
      setTimeout(() => {
        graphRef.current?.centerOnNodes(nodeIds);
        console.log('✅ [App] Graph centered on nodes:', nodeIds);
      }, 100);
      
      console.log('✅ [App] Node highlight event processing COMPLETED');
    };
    
    // Register enhanced event listeners
    window.addEventListener('mcpGraphReload', handleGraphReload as EventListener);
    window.addEventListener('mcpNodeHighlight', handleNodeHighlight as EventListener);
    console.log('✅ [App] MCP event listeners registered successfully');
    
    return () => {
      console.log('🧹 [App] Cleaning up MCP event listeners...');
      window.removeEventListener('mcpGraphReload', handleGraphReload as EventListener);
      window.removeEventListener('mcpNodeHighlight', handleNodeHighlight as EventListener);
      console.log('✅ [App] MCP event listeners cleaned up');
    };
  }, [graphState.data.links]);

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
      let updatedSelections: NodeSelection[];
      
      if (prev.isHoverMode) {
        // In hover mode, replace existing non-persistent selections (original behavior)
        const persistentSelections = prev.selectedNodes.filter(sel => sel.persistent);
        updatedSelections = [...persistentSelections, newSelection];
      } else {
        // When hover mode is off, allow multiple node cards
        // Check if this node is already selected
        const existingIndex = prev.selectedNodes.findIndex(sel => sel.node.id === node.id);
        if (existingIndex >= 0) {
          // Node already selected, don't add duplicate
          updatedSelections = prev.selectedNodes;
        } else {
          // Add new selection to existing ones
          updatedSelections = [...prev.selectedNodes, newSelection];
        }
      }
      
      // Center the graph on the clicked node
      setTimeout(() => {
        graphRef.current?.centerOnNode(node.id);
      }, 100);

      return {
        ...prev,
        selectedNodes: updatedSelections
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
      // Simulate a click to open the node card
      handleNodeClick(node, { clientX: 400, clientY: 300 } as MouseEvent);
    }
  }, [graphState.data.nodes, handleNodeClick]);

  // Console message handler
  const handleSendMessage = useCallback(async (message: string): Promise<string> => {
    console.log('📨 [App] Console message handler started:', { message });
    
    consoleRef.current?.addMessage({
      type: 'system',
      content: `🤖 Processing: "${message}"`
    });

    try {
      const startTime = Date.now();
      console.log('🚀 [App] Sending message to MCP client...');
      
      // Send message to MCP client (automatic processing will handle graph updates)
      const response = await mcpClientRef.current.sendMessage(message);
      
      const requestTime = Date.now() - startTime;
      console.log('⏱️ [App] MCP client response received:', {
        requestTime,
        responseLength: response.length,
        responsePreview: response.substring(0, 100) + '...'
      });
      
      consoleRef.current?.addMessage({
        type: 'system',
        content: `⏱️ Request completed in ${requestTime}ms`
      });
      
      console.log('✅ [App] Message processing completed successfully');
      return response;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [App] Message processing failed:', error);
      
      setError(errorMessage);
      consoleRef.current?.addMessage({
        type: 'error',
        content: `❌ Error: ${errorMessage}`
      });
      throw error;
    } finally {
      console.log('🏁 [App] Message handler cleanup completed');
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

  // Layer controls handlers

  const handleCenterOnLayer = useCallback((layerId: string) => {
    graphRef.current?.centerOnLayer(layerId);
  }, []);

  const handleIsolateLayer = useCallback((layerId: string) => {
    graphRef.current?.isolateLayer(layerId);
  }, []);

  const handleShowAllLayers = useCallback(() => {
    graphRef.current?.showAllLayers();
  }, []);

  return (
    <div className="h-screen w-screen bg-background matrix-bg no-scrollbar-x overflow-hidden">
      {/* Main Content Area */}
      <div className="flex h-full">
        {/* 3D Graph Visualization */}
        <div className="flex-1 relative">
          <Graph3D
            ref={graphRef}
            data={graphState.data}
            selectedNodes={graphState.selectedNodes}
            highlightedNodes={graphState.highlightedNodes}
            highlightedLinks={graphState.highlightedLinks}
            isHoverMode={graphState.isHoverMode}
            layerControls={graphState.layerControls}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onBackgroundClick={handleBackgroundClick}
          />
          
          {/* Error Display */}
          {error && (
            <Card className="absolute top-4 left-4 p-matrix-md bg-destructive/10 border-destructive/30 max-w-md">
              <div className="text-matrix-sm text-destructive">
                {error}
              </div>
            </Card>
          )}
        </div>

        {/* Enhanced Right Sidebar */}
        <div className="w-80 h-full matrix-card border-l border-border bg-card/95 backdrop-blur-md">
          <div className="h-full overflow-y-auto no-scrollbar-x p-matrix-md space-y-matrix-md">
            {/* Project Overview Dashboard Card */}
            <Card className="dashboard-card">
              <div className="p-matrix-lg">
                <div className="flex items-center justify-between mb-matrix-md">
                  <h2 className="text-matrix-lg font-matrix-bold matrix-text-glow uppercase tracking-wide">
                    .NERON GRAPH VISUALIZATION PROJECT
                  </h2>
                  <div className="w-2 h-2 bg-primary rounded-full matrix-pulse"></div>
                </div>
                
                {/* Project Status Metrics */}
                <div className="grid grid-cols-3 gap-matrix-sm mb-matrix-md">
                  <div className="metric-card">
                    <div className="metric-value">{graphState.data.nodes.length}</div>
                    <div className="metric-label">NODES</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{graphState.data.links.length}</div>
                    <div className="metric-label">LINKS</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{graphState.data.layers?.length || 0}</div>
                    <div className="metric-label">LAYERS</div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-matrix-xs text-matrix-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PROJECT • LAYER:</span>
                    <span className="matrix-text-glow">GRAPH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">STATUS:</span>
                    <Badge variant="default" className="text-matrix-2xs px-1 py-0">ACTIVE</Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Layer Controls */}
            <LayerControls
              graphData={graphState.data}
              layerControls={graphState.layerControls}
              onLayerControlsChange={(controls) =>
                setGraphState(prev => ({ ...prev, layerControls: controls }))
              }
              onCenterOnLayer={handleCenterOnLayer}
              onIsolateLayer={handleIsolateLayer}
              onShowAllLayers={handleShowAllLayers}
            />

            {/* Enhanced Node Information */}
            <Card className="dashboard-card">
              <div className="p-matrix-lg">
                <h3 className="text-matrix-sm font-matrix-semibold matrix-text-glow mb-matrix-md uppercase tracking-wide">
                  GRAPH INTELLIGENCE
                </h3>
                
                {/* All Nodes List - Enhanced */}
                <div className="space-y-matrix-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-matrix-xs text-muted-foreground">ENTITY NETWORK</span>
                    <Badge variant="outline" className="text-matrix-2xs px-1 py-0">
                      {graphState.data.nodes.length} TOTAL
                    </Badge>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-matrix-xs">
                    {graphState.data.nodes.map((node) => (
                      <Card 
                        key={node.id} 
                        className="p-matrix-sm cursor-pointer hover:bg-accent/50 transition-colors border border-border/50"
                        onClick={() => handleNodeCardClick(node.id)}
                      >
                        <div className="flex items-center gap-matrix-xs">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 matrix-glow"
                            style={{ backgroundColor: node.color || 'hsl(var(--primary))' }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-matrix-xs font-matrix-medium truncate">
                              {node.name}
                            </div>
                            <div className="text-matrix-2xs text-muted-foreground">
                              {node.type} • {node.observations.length} notes
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-matrix-2xs px-1 py-0">
                            {/* Connection count */}
                            {graphState.data.links.filter(link => 
                              (typeof link.source === 'string' ? link.source : link.source.id) === node.id ||
                              (typeof link.target === 'string' ? link.target : link.target.id) === node.id
                            ).length}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Activity Feed */}
            <Card className="dashboard-card">
              <div className="p-matrix-lg">
                <h3 className="text-matrix-sm font-matrix-semibold matrix-text-glow mb-matrix-md uppercase tracking-wide">
                  SYSTEM ACTIVITY
                </h3>
                <div className="space-y-matrix-xs text-matrix-xs">
                  <div className="flex items-center gap-matrix-xs">
                    <div className="w-1 h-1 bg-success rounded-full"></div>
                    <span className="text-muted-foreground">MCP connection established</span>
                  </div>
                  <div className="flex items-center gap-matrix-xs">
                    <div className="w-1 h-1 bg-info rounded-full"></div>
                    <span className="text-muted-foreground">Graph data loaded successfully</span>
                  </div>
                  <div className="flex items-center gap-matrix-xs">
                    <div className="w-1 h-1 bg-warning rounded-full"></div>
                    <span className="text-muted-foreground">Awaiting AI interaction...</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating Console Toggle Button */}
      <Button
        onClick={() => setIsConsoleVisible(!isConsoleVisible)}
        className={cn(
          "btn-floating",
          isConsoleVisible && "matrix-glow-strong"
        )}
        title="Toggle Console (Press / key)"
      >
        <Terminal size={20} className="matrix-text-glow" />
      </Button>

      {/* Enhanced Console */}
      <Console
        ref={consoleRef}
        isVisible={isConsoleVisible}
        onToggle={() => setIsConsoleVisible(!isConsoleVisible)}
        onSendMessage={handleSendMessage}
        className="matrix-terminal"
      />

      {/* Draggable Node Cards */}
      {graphState.selectedNodes.map((selection, index) => (
        <NodeCard
          key={`${selection.node.id}-${index}`}
          selection={selection}
          allNodes={graphState.data.nodes}
          allLinks={graphState.data.links}
          onClose={() => handleCloseNodeCard(index)}
          onNodeClick={handleNodeCardClick}
          className="matrix-card"
        />
      ))}
    </div>
  );
}

export default App;
