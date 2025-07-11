import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Eye, ArrowRight, ArrowLeft, Link, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import type { GraphNode, GraphLink, NodeSelection } from '../types/graph';

interface NodeCardProps {
  selection: NodeSelection;
  allNodes: GraphNode[];
  allLinks: GraphLink[];
  onClose: () => void;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
}

interface LinkInfo {
  targetNode: GraphNode;
  relationType: string;
  direction: 'incoming' | 'outgoing';
}

const NodeCard: React.FC<NodeCardProps> = ({
  selection,
  allNodes,
  allLinks,
  onClose,
  onNodeClick,
  className = ''
}) => {
  const [position, setPosition] = useState({
    x: selection.position.x,
    y: selection.position.y
  });
  const [size, setSize] = useState({
    width: 320,
    height: 400
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const { node } = selection;

  // Calculate connections
  const connections = useCallback(() => {
    const incoming: LinkInfo[] = [];
    const outgoing: LinkInfo[] = [];

    allLinks.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;

      if (targetId === node.id) {
        const sourceNode = allNodes.find(n => n.id === sourceId);
        if (sourceNode) {
          incoming.push({
            targetNode: sourceNode,
            relationType: link.relationType,
            direction: 'incoming'
          });
        }
      } else if (sourceId === node.id) {
        const targetNode = allNodes.find(n => n.id === targetId);
        if (targetNode) {
          outgoing.push({
            targetNode: targetNode,
            relationType: link.relationType,
            direction: 'outgoing'
          });
        }
      }
    });

    return { incoming, outgoing };
  }, [node.id, allNodes, allLinks]);

  const { incoming, outgoing } = connections();
  const totalConnections = incoming.length + outgoing.length;

  // Keep card within bounds
  const keepInBounds = useCallback((newPos: { x: number; y: number }) => {
    const maxX = window.innerWidth - size.width;
    const maxY = window.innerHeight - size.height;
    
    return {
      x: Math.max(16, Math.min(newPos.x, maxX)),
      y: Math.max(16, Math.min(newPos.y, maxY))
    };
  }, [size]);

  // Drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === dragRef.current || dragRef.current?.contains(e.target as Node)) {
      setIsDragging(true);
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPos = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      setPosition(keepInBounds(newPos));
    }
  }, [isDragging, dragOffset, keepInBounds]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize functionality
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (e.target === resizeRef.current) {
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height
      });
      e.preventDefault();
    }
  }, [size]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.max(280, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(200, resizeStart.height + (e.clientY - resizeStart.y));
      
      setSize({
        width: Math.min(newWidth, window.innerWidth - position.x),
        height: Math.min(newHeight, window.innerHeight - position.y)
      });
    }
  }, [isResizing, resizeStart, position]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleNodeLinkClick = (nodeId: string) => {
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
  };

  const handleReset = () => {
    setSize({ width: 320, height: 400 });
    setPosition({ x: selection.position.x, y: selection.position.y });
    setIsExpanded(true);
  };

  return (
    <div
      ref={cardRef}
      className={`tactical-node-card ${isDragging ? 'tactical-dragging' : ''} ${className}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="tactical-node-card-header tactical-no-select"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 tactical-border-primary flex-shrink-0"
            style={{ backgroundColor: node.color || '#00FF66' }}
          />
          <span className="tactical-text tactical-text-primary truncate">
            {node.name}
          </span>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="tactical-button tactical-text-xs px-1 py-1"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
          </button>
          <button
            onClick={handleReset}
            className="tactical-button tactical-text-xs px-1 py-1"
            title="Reset Size & Position"
          >
            <RotateCcw size={10} />
          </button>
          <button
            onClick={onClose}
            className="tactical-button tactical-text-xs px-1 py-1"
            title="Close"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="tactical-node-card-content" style={{ height: isExpanded ? 'calc(100% - 32px - 16px)' : 'auto', overflow: isExpanded ? 'auto' : 'hidden' }}>
        {/* Compact Info Row */}
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="tactical-text-accent">{node.type}</span>
          <span className="tactical-text-dim">
            {totalConnections} CONN • {node.observations?.length || 0} OBS
          </span>
        </div>

        {isExpanded && (
          <>
            {/* Tags */}
            {node.tags && node.tags.length > 0 && (
              <div className="tactical-node-card-field">
                <div className="tactical-node-card-label">TAGS</div>
                <div className="tactical-node-card-tags">
                  {node.tags.map((tag, index) => (
                    <span key={index} className="tactical-node-card-tag">
                      {tag.name}
                      {tag.weight && <span className="text-tactical-text-dim ml-1">({tag.weight})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Connections */}
            {totalConnections > 0 && (
              <div className="tactical-node-card-field">
                <div className="tactical-node-card-label">
                  <Link size={10} className="inline mr-1" />
                  NETWORK ({totalConnections})
                </div>
                
                {outgoing.length > 0 && (
                  <div className="mb-2">
                    <div className="tactical-node-card-label mb-1 text-tactical-secondary">
                      <ArrowRight size={8} className="inline mr-1" />
                      OUTGOING ({outgoing.length})
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {outgoing.map((link, index) => (
                        <div
                          key={index}
                          className="tactical-bg-surface-alpha p-2 tactical-border cursor-pointer hover:tactical-border-primary transition-colors"
                          onClick={() => handleNodeLinkClick(link.targetNode.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2 h-2 flex-shrink-0"
                                style={{ backgroundColor: link.targetNode.color || '#00FF66' }}
                              />
                              <span className="tactical-text tactical-text-xs truncate">
                                {link.targetNode.name}
                              </span>
                            </div>
                            <span className="tactical-text tactical-text-dim tactical-text-xs flex-shrink-0 ml-2">
                              {link.relationType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {incoming.length > 0 && (
                  <div>
                    <div className="tactical-node-card-label mb-1 text-tactical-accent">
                      <ArrowLeft size={8} className="inline mr-1" />
                      INCOMING ({incoming.length})
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {incoming.map((link, index) => (
                        <div
                          key={index}
                          className="tactical-bg-surface-alpha p-2 tactical-border cursor-pointer hover:tactical-border-primary transition-colors"
                          onClick={() => handleNodeLinkClick(link.targetNode.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2 h-2 flex-shrink-0"
                                style={{ backgroundColor: link.targetNode.color || '#00FF66' }}
                              />
                              <span className="tactical-text tactical-text-xs truncate">
                                {link.targetNode.name}
                              </span>
                            </div>
                            <span className="tactical-text tactical-text-dim tactical-text-xs flex-shrink-0 ml-2">
                              {link.relationType}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Observations */}
            {node.observations && node.observations.length > 0 && (
              <div className="tactical-node-card-field">
                <div className="tactical-node-card-label">
                  <Eye size={10} className="inline mr-1" />
                  OBSERVATIONS ({node.observations.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {node.observations.map((obs, index) => (
                    <div key={index} className="tactical-bg-surface-alpha p-2 tactical-border">
                      <div className="tactical-text tactical-text-xs leading-relaxed">
                        {obs}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {node.metadata && (
              <div className="tactical-node-card-field">
                <div className="tactical-node-card-label">METADATA</div>
                <div className="tactical-bg-surface-alpha p-2 tactical-border">
                  <div className="tactical-text tactical-text-xs space-y-1">
                    {node.metadata.importance && (
                      <div className="flex justify-between">
                        <span>IMPORTANCE:</span>
                        <span className="tactical-text-primary">{node.metadata.importance}/10</span>
                      </div>
                    )}
                    {node.metadata.keywords && (
                      <div className="flex justify-between">
                        <span>KEYWORDS:</span>
                        <span className="tactical-text-secondary">{node.metadata.keywords.length}</span>
                      </div>
                    )}
                    {node.metadata.connectionStrength && (
                      <div className="flex justify-between">
                        <span>CONNECTION:</span>
                        <span className="tactical-text-accent">{node.metadata.connectionStrength}/10</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resize Handle */}
      {isExpanded && (
        <div
          ref={resizeRef}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize tactical-text-dim"
          onMouseDown={handleResizeStart}
          style={{
            background: 'linear-gradient(-45deg, transparent 0%, transparent 40%, hsl(var(--tactical-border)) 40%, hsl(var(--tactical-border)) 60%, transparent 60%)'
          }}
        />
      )}
    </div>
  );
};

export default NodeCard; 