import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minimize2, Maximize2, Move, Eye, ArrowRight, ArrowLeft, Tag, Link } from 'lucide-react';
import { cn } from '../lib/utils';
import type { GraphNode, GraphLink, NodeSelection } from '../types/graph';

interface NodeCardProps {
  selection: NodeSelection;
  allNodes: GraphNode[];
  allLinks: GraphLink[];
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onNodeClick?: (nodeId: string) => void;
  isMinimized?: boolean;
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
  onMinimize,
  onMaximize,
  onNodeClick,
  isMinimized = false,
  className
}) => {
  const [position, setPosition] = useState({
    x: selection.position.x,
    y: selection.position.y
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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

  // Extract tags from observations (assuming tags are marked with #)
  const tags = useCallback(() => {
    const tagSet = new Set<string>();
    node.observations.forEach(obs => {
      const matches = obs.match(/#\w+/g);
      if (matches) {
        matches.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  }, [node.observations]);

  const extractedTags = tags();

  // Mouse handlers for dragging
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
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
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

  const handleNodeLinkClick = (nodeId: string) => {
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
  };

  if (isMinimized) {
    return (
      <div
        ref={cardRef}
        className={cn(
          "fixed z-50 rounded-lg shadow-lg",
          "w-48 p-2 cursor-move",
          className
        )}
        style={{ 
          left: position.x, 
          top: position.y,
          backgroundColor: '#000',
          borderColor: '#00ff41',
          border: '1px solid #00ff41',
          color: '#00ff41'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium matrix-text truncate">{node.name}</span>
          <div className="flex gap-1">
            {onMaximize && (
              <button
                onClick={onMaximize}
                className="p-1 hover:bg-accent rounded matrix-text"
              >
                <Maximize2 size={12} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded matrix-text"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        "fixed z-50 rounded-lg shadow-xl",
        "w-96 max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col",
        isDragging && "select-none",
        className
      )}
      style={{ 
        left: position.x, 
        top: position.y,
        backgroundColor: '#000',
        borderColor: '#00ff41',
        border: '1px solid #00ff41',
        color: '#00ff41'
      }}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="flex items-center justify-between p-4 border-b matrix-border cursor-move bg-accent/5"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Move size={16} className="matrix-text flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold matrix-text truncate">{node.name}</h3>
            <p className="text-sm text-muted-foreground">{node.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-accent rounded matrix-text"
            >
              <Minimize2 size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded matrix-text"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-2 bg-accent/10 rounded matrix-border">
            <div className="text-lg font-bold matrix-text">{incoming.length}</div>
            <div className="text-xs text-muted-foreground">Incoming</div>
          </div>
          <div className="p-2 bg-accent/10 rounded matrix-border">
            <div className="text-lg font-bold matrix-text">{outgoing.length}</div>
            <div className="text-xs text-muted-foreground">Outgoing</div>
          </div>
          <div className="p-2 bg-accent/10 rounded matrix-border">
            <div className="text-lg font-bold matrix-text">{totalConnections}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Tags */}
        {extractedTags.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag size={16} className="matrix-text" />
              <h4 className="font-medium matrix-text">Tags</h4>
            </div>
            <div className="flex flex-wrap gap-1">
              {extractedTags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs matrix-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Links */}
        {incoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeft size={16} className="matrix-text" />
              <h4 className="font-medium matrix-text">Incoming Links ({incoming.length})</h4>
            </div>
            <div className="space-y-2">
              {incoming.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-accent/5 rounded matrix-border hover:bg-accent/10 transition-colors cursor-pointer"
                  onClick={() => handleNodeLinkClick(link.targetNode.id)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: link.targetNode.color || '#00ff41' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium matrix-text truncate">{link.targetNode.name}</div>
                      <div className="text-xs text-muted-foreground">{link.targetNode.type}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground px-2 py-1 bg-accent/10 rounded">
                    {link.relationType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Links */}
        {outgoing.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight size={16} className="matrix-text" />
              <h4 className="font-medium matrix-text">Outgoing Links ({outgoing.length})</h4>
            </div>
            <div className="space-y-2">
              {outgoing.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-accent/5 rounded matrix-border hover:bg-accent/10 transition-colors cursor-pointer"
                  onClick={() => handleNodeLinkClick(link.targetNode.id)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: link.targetNode.color || '#00ff41' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium matrix-text truncate">{link.targetNode.name}</div>
                      <div className="text-xs text-muted-foreground">{link.targetNode.type}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground px-2 py-1 bg-accent/10 rounded">
                    {link.relationType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="matrix-text" />
            <h4 className="font-medium matrix-text">Observations ({node.observations.length})</h4>
          </div>
          <div className="space-y-2">
            {node.observations.map((observation, index) => (
              <div
                key={index}
                className="p-3 bg-accent/5 rounded matrix-border text-sm leading-relaxed"
              >
                {observation}
              </div>
            ))}
          </div>
        </div>

        {/* Connection Details */}
        {totalConnections > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link size={16} className="matrix-text" />
              <h4 className="font-medium matrix-text">Connection Summary</h4>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• Connected to {new Set([...incoming.map(l => l.targetNode.id), ...outgoing.map(l => l.targetNode.id)]).size} unique nodes</div>
              <div>• Relationship types: {Array.from(new Set([...incoming.map(l => l.relationType), ...outgoing.map(l => l.relationType)])).join(', ')}</div>
              {incoming.length > 0 && <div>• Receives connections from: {incoming.map(l => l.targetNode.name).join(', ')}</div>}
              {outgoing.length > 0 && <div>• Connects to: {outgoing.map(l => l.targetNode.name).join(', ')}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeCard; 