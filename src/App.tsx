import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Code } from 'lucide-react';
import Graph3D from './components/Graph3D';
import type { Graph3DRef } from './components/Graph3D';
import NodeCard from './components/NodeCard';
import Console from './components/Console';
import type { ConsoleRef } from './components/Console';
import LayerControls from './components/LayerControls';
import { createMCPClient } from './lib/mcpIntegration';
import { graphCache, CACHE_KEYS } from './lib/graphCache';
import { transformMCPToGraphData, extractTags, generateLayers, assignNodesToLayers } from './lib/dataTransformer';
import type { GraphData, GraphNode, GraphLink, GraphState, NodeSelection, LayerControls as LayerControlsType, NodeTag, NodeMetadata } from './types/graph';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const handleLayerControlsChange = useCallback((controls: LayerControlsType) => {
    setGraphState(prev => ({
      ...prev,
      layerControls: controls
    }));
  }, []);

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
          layerControls={graphState.layerControls}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onBackgroundClick={handleBackgroundClick}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      </div>

      {/* Layer Controls Panel */}
      <LayerControls
        graphData={graphState.data}
        layerControls={graphState.layerControls}
        onLayerControlsChange={handleLayerControlsChange}
        onCenterOnLayer={handleCenterOnLayer}
        onIsolateLayer={handleIsolateLayer}
        onShowAllLayers={handleShowAllLayers}
        className="fixed top-2 right-2 w-64 max-h-[70vh] z-20"
      />

      {/* Console Toggle Button */}
      <Button
        onClick={() => setIsConsoleVisible(prev => !prev)}
        className={cn(
          "fixed bottom-1 left-1 z-30 shadow-lg transition-all duration-200 h-6 w-6 p-0",
          isConsoleVisible 
            ? "bg-primary text-primary-foreground hover:bg-primary/90" 
            : "bg-card border hover:bg-accent"
        )}
        title="Toggle Console (Press /)"
      >
        <Code size={10} />
      </Button>

      {/* Console */}
      <Console
        ref={consoleRef}
        isVisible={isConsoleVisible}
        onToggle={() => setIsConsoleVisible(false)}
        onSendMessage={handleSendMessage}
      />

      {/* Enhanced Node Cards with Layer Information */}
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

      {/* Layer Status Indicator */}
      {graphState.layerControls.isolatedLayer && (
        <div className="fixed top-1 left-1/2 transform -translate-x-1/2 z-20">
          <Card className="px-2 py-0.5 bg-primary text-primary-foreground">
            <div className="text-[8px] font-medium">
              Isolated: {graphState.data.layers?.find(l => l.id === graphState.layerControls.isolatedLayer)?.name || 'Unknown'}
            </div>
          </Card>
        </div>
      )}

      {/* Hover Info Card */}
      {graphState.hoveredNode && graphState.isHoverMode && (
        <Card 
          className={cn(
            "fixed z-30 max-w-xs pointer-events-none shadow-lg border bg-card/95 backdrop-blur-sm",
            "matrix-glow"
          )}
          style={{ 
            left: Math.min(window.innerWidth / 2 + 50, window.innerWidth - 200),
            top: 50
          }}
        >
          <div className="p-2">
            <h4 className="font-semibold text-foreground text-sm">{graphState.hoveredNode.name}</h4>
            <p className="text-xs text-muted-foreground">{graphState.hoveredNode.type}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {graphState.hoveredNode.observations.length} observations
            </p>
          </div>
        </Card>
      )}

      {/* Keyboard Shortcuts Help */}
      <Card className="fixed bottom-2 right-2 z-20 bg-card/80 backdrop-blur-sm border hidden sm:block">
        <div className="p-2 text-xs text-muted-foreground space-y-1">
          <div>Press <code className="bg-muted px-1 rounded">H</code> to toggle hover mode</div>
          <div>Press <code className="bg-muted px-1 rounded">/</code> to toggle console</div>
          <div>Click to select{!graphState.isHoverMode && ", multiple when hover off"}</div>
          <div>Double-click to highlight connections</div>
        </div>
      </Card>

      {/* Mobile Help Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-2 right-2 z-20 sm:hidden bg-card/80 backdrop-blur-sm border h-8 w-8 p-0 text-xs"
        title="Help: H=hover mode, /=console, click=select"
      >
        ?
      </Button>
    </div>
  );
}

export default App;
