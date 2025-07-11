
import { useState, useRef, useEffect, useCallback, createRef } from 'react';
import { X } from 'lucide-react';
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

interface ScrollableElement {
  id: string;
  type: 'observation' | 'outgoing' | 'incoming' | 'tag' | 'metadata';
  content: string;
  ref: React.RefObject<HTMLDivElement | null>;
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
    width: 400,
    height: 400
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Element highlighting for custom scroll
  const [highlightedElementIndex, setHighlightedElementIndex] = useState(-1);
  const [scrollableElements, setScrollableElements] = useState<ScrollableElement[]>([]);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

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

  // Build scrollable elements list
  useEffect(() => {
    const elements: ScrollableElement[] = [];
    
    // Add observations
    node.observations?.forEach((obs, index) => {
      elements.push({
        id: `obs-${index}`,
        type: 'observation',
        content: obs,
        ref: createRef()
      });
    });
    
    // Add outgoing connections
    outgoing.forEach((link, index) => {
      elements.push({
        id: `out-${index}`,
        type: 'outgoing',
        content: link.targetNode.name,
        ref: createRef()
      });
    });
    
    // Add incoming connections
    incoming.forEach((link, index) => {
      elements.push({
        id: `in-${index}`,
        type: 'incoming',
        content: link.targetNode.name,
        ref: createRef()
      });
    });

    setScrollableElements(elements);
  }, [node.observations, outgoing, incoming]);

  // Custom scroll handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (scrollableElements.length === 0) return;
    
    const direction = e.deltaY > 0 ? 1 : -1;
    const newIndex = Math.max(-1, Math.min(scrollableElements.length - 1, highlightedElementIndex + direction));
    
    setHighlightedElementIndex(newIndex);
    
    // Scroll to highlighted element
    if (newIndex >= 0 && scrollableElements[newIndex].ref.current) {
      scrollableElements[newIndex].ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [highlightedElementIndex, scrollableElements]);

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
    if (e.target instanceof HTMLElement) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
      }
      
      if (e.target.classList.contains('resize-handle')) {
        return;
      }
      
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
        e.stopPropagation();
      }
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

  // Resize functionality - Complete rewrite using proper window resizing method
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'se' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    const startX = position.x;
    const startY = position.y;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startX;
      let newY = startY;
      
      switch (direction) {
        case 'se': // Bottom-right: expand both, no position change
          newWidth = Math.max(400, startWidth + deltaX);
          newHeight = Math.max(400, startHeight + deltaY);
          break;
          
        case 'sw': // Bottom-left: expand height, resize width left
          newWidth = Math.max(400, startWidth - deltaX);
          newHeight = Math.max(400, startHeight + deltaY);
          newX = startX - (newWidth - startWidth);
          break;
      }
      
      // Only constrain to stay within screen bounds, no size limits
      // Adjust position if it would go off screen
      if (newX < 0) {
        newWidth = newWidth + newX; // reduce width by the amount we're off screen
        newX = 0;
      }
      if (newY < 0) {
        newHeight = newHeight + newY; // reduce height by the amount we're off screen  
        newY = 0;
      }
      
      // Ensure we don't expand beyond screen boundaries
      if (newX + newWidth > window.innerWidth) {
        newWidth = window.innerWidth - newX;
      }
      if (newY + newHeight > window.innerHeight) {
        newHeight = window.innerHeight - newY;
      }
      
      // Apply final minimum constraints
      newWidth = Math.max(400, newWidth);
      newHeight = Math.max(400, newHeight);
      
      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [size, position]);

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

  const handleNodeLinkClick = (nodeId: string) => {
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
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
      onWheel={handleWheel}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="tactical-node-card-header tactical-no-select"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="tactical-text tactical-text-primary truncate">
            {node.name}
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="tactical-button tactical-text-xs px-1 py-1"
          title="Close"
        >
          <X size={10} />
        </button>
      </div>

      {/* Content - No scrollbars, custom wheel scrolling */}
      <div 
        className="tactical-node-card-content" 
        style={{ 
          height: 'calc(100% - 32px - 16px)', 
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        
        {/* Scrollable Content Container */}
        <div 
          className="w-full h-full"
          style={{ 
            overflowY: 'hidden',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          
          {/* Compact Info Row */}
          <div className="flex justify-between items-center mb-2 text-xs">
            <span className="tactical-text-accent">{node.type}</span>
            <span className="tactical-text-dim">
              {totalConnections} CONN • {node.observations?.length || 0} OBS
            </span>
          </div>

          {/* Tags */}
          {node.tags && node.tags.length > 0 && (
            <div className="tactical-node-card-field mb-2">
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

          {/* Observations */}
          {node.observations && node.observations.length > 0 && (
            <div className="tactical-node-card-field mb-2">
              <div className="tactical-node-card-label">
                OBSERVATIONS ({node.observations.length})
              </div>
              <div className="space-y-1">
                {node.observations.map((obs, index) => {
                  const elementIndex = scrollableElements.findIndex(el => el.id === `obs-${index}`);
                  const isHighlighted = elementIndex === highlightedElementIndex;
                  
                  return (
                    <div 
                      key={index} 
                      ref={scrollableElements[elementIndex]?.ref}
                      className={`tactical-bg-surface-alpha p-2 tactical-border transition-all duration-200 ${
                        isHighlighted ? 'tactical-border-primary bg-tactical-primary/10' : ''
                      }`}
                    >
                      <div className="tactical-text tactical-text-xs leading-relaxed">
                        {obs}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connections */}
          {totalConnections > 0 && (
            <div className="tactical-node-card-field mb-2">
              <div className="tactical-node-card-label">
                NETWORK ({totalConnections})
              </div>
              
              {/* Outgoing Connections */}
              {outgoing.length > 0 && (
                <div className="mb-2">
                  <div className="tactical-node-card-label mb-1 text-tactical-secondary">
                    OUTGOING ({outgoing.length})
                  </div>
                  <div className="space-y-1">
                    {outgoing.map((link, index) => {
                      const elementIndex = scrollableElements.findIndex(el => el.id === `out-${index}`);
                      const isHighlighted = elementIndex === highlightedElementIndex;
                      
                      return (
                        <div
                          key={index}
                          ref={scrollableElements[elementIndex]?.ref}
                          className={`tactical-bg-surface-alpha p-2 tactical-border cursor-pointer transition-all duration-200 ${
                            isHighlighted ? 'tactical-border-primary bg-tactical-primary/10' : 'hover:tactical-border-primary'
                          }`}
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Incoming Connections */}
              {incoming.length > 0 && (
                <div>
                  <div className="tactical-node-card-label mb-1 text-tactical-accent">
                    INCOMING ({incoming.length})
                  </div>
                  <div className="space-y-1">
                    {incoming.map((link, index) => {
                      const elementIndex = scrollableElements.findIndex(el => el.id === `in-${index}`);
                      const isHighlighted = elementIndex === highlightedElementIndex;
                      
                      return (
                        <div
                          key={index}
                          ref={scrollableElements[elementIndex]?.ref}
                          className={`tactical-bg-surface-alpha p-2 tactical-border cursor-pointer transition-all duration-200 ${
                            isHighlighted ? 'tactical-border-primary bg-tactical-primary/10' : 'hover:tactical-border-primary'
                          }`}
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
                      );
                    })}
                  </div>
                </div>
              )}
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
        </div>
      </div>

      {/* Bottom Corner Resize Handles Only */}
      <div 
        className="resize-handle resize-handle-sw" 
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleResizeStart(e, 'sw');
        }} 
      />
      <div 
        className="resize-handle resize-handle-se" 
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleResizeStart(e, 'se');
        }} 
      />
    </div>
  );
};

export default NodeCard; 