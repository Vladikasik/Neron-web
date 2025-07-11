import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Eye, ArrowRight, ArrowLeft, Link } from 'lucide-react';
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

  // Keep card within bounds
  const keepInBounds = useCallback((newPos: { x: number; y: number }) => {
    const maxX = window.innerWidth - 320;
    const maxY = window.innerHeight - 400;
    
    return {
      x: Math.max(16, Math.min(newPos.x, maxX)),
      y: Math.max(16, Math.min(newPos.y, maxY))
    };
  }, []);

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
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        ref={dragRef}
        className="tactical-node-card-header tactical-no-select"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 tactical-border-primary"
            style={{ backgroundColor: node.color || '#00FF66' }}
          />
          <span className="tactical-text tactical-text-primary">
            {node.name}
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="tactical-button tactical-text-xs px-2 py-1"
          title="Close"
        >
          <X size={10} />
        </button>
      </div>

      {/* Content */}
      <div className="tactical-node-card-content">
        {/* Type and Stats */}
        <div className="tactical-node-card-field">
          <div className="tactical-node-card-label">TYPE</div>
          <div className="tactical-node-card-value">{node.type}</div>
        </div>

        <div className="tactical-node-card-field">
          <div className="tactical-node-card-label">CONNECTIONS</div>
          <div className="tactical-node-card-value">
            IN: {incoming.length} // OUT: {outgoing.length} // TOTAL: {totalConnections}
          </div>
        </div>

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div className="tactical-node-card-field">
            <div className="tactical-node-card-label">TAGS</div>
            <div className="tactical-node-card-tags">
              {node.tags.map((tag, index) => (
                <span key={index} className="tactical-node-card-tag">
                  {tag.name}
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
              NETWORK
            </div>
            
            {outgoing.length > 0 && (
              <div className="mb-2">
                <div className="tactical-node-card-label mb-1">
                  <ArrowRight size={8} className="inline mr-1" />
                  OUTGOING ({outgoing.length})
                </div>
                <div className="space-y-1">
                  {outgoing.map((link, index) => (
                    <div
                      key={index}
                      className="tactical-bg-surface-alpha p-2 tactical-border cursor-pointer hover:tactical-border-primary"
                      onClick={() => handleNodeLinkClick(link.targetNode.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2"
                            style={{ backgroundColor: link.targetNode.color || '#00FF66' }}
                          />
                          <span className="tactical-text tactical-text-xs">
                            {link.targetNode.name}
                          </span>
                        </div>
                        <span className="tactical-text tactical-text-dim tactical-text-xs">
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
                <div className="tactical-node-card-label mb-1">
                  <ArrowLeft size={8} className="inline mr-1" />
                  INCOMING ({incoming.length})
                </div>
                <div className="space-y-1">
                  {incoming.map((link, index) => (
                    <div
                      key={index}
                      className="tactical-bg-surface-alpha p-2 tactical-border cursor-pointer hover:tactical-border-primary"
                      onClick={() => handleNodeLinkClick(link.targetNode.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2"
                            style={{ backgroundColor: link.targetNode.color || '#00FF66' }}
                          />
                          <span className="tactical-text tactical-text-xs">
                            {link.targetNode.name}
                          </span>
                        </div>
                        <span className="tactical-text tactical-text-dim tactical-text-xs">
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
                <div>IMPORTANCE: {node.metadata.importance || 5}/10</div>
                <div>KEYWORDS: {node.metadata.keywords?.length || 0}</div>
                <div>CONNECTION STRENGTH: {node.metadata.connectionStrength || 5}/10</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeCard; 