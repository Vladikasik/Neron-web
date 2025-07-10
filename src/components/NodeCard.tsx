import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Eye, ArrowRight, ArrowLeft, Link, CornerDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GraphNode, GraphLink, NodeSelection } from '../types/graph';

interface NodeCardProps {
  selection: NodeSelection;
  allNodes: GraphNode[];
  allLinks: GraphLink[];
  onClose: () => void;
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
  onNodeClick,
  className
}) => {
  const [position, setPosition] = useState({
    x: selection.position.x,
    y: selection.position.y
  });
  const [size, setSize] = useState({ width: 340, height: 450 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
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

  // Keep card within bounds
  const keepInBounds = useCallback((newPos: { x: number; y: number }, newSize: { width: number; height: number }) => {
    const maxX = window.innerWidth - newSize.width;
    const maxY = window.innerHeight - newSize.height;
    
    return {
      x: Math.max(8, Math.min(newPos.x, maxX)),
      y: Math.max(8, Math.min(newPos.y, maxY))
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
    if (isDragging && !isResizing) {
      const newPos = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      setPosition(keepInBounds(newPos, size));
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newSize = {
        width: Math.max(280, resizeStart.width + deltaX),
        height: Math.max(300, resizeStart.height + deltaY)
      };
      
      setSize(newSize);
      setPosition(prev => keepInBounds(prev, newSize));
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, keepInBounds, size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    e.preventDefault();
    e.stopPropagation();
  }, [size]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleNodeLinkClick = (nodeId: string) => {
    if (onNodeClick) {
      onNodeClick(nodeId);
    }
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        'fixed z-30 matrix-card border-primary/30 overflow-hidden',
        'transition-all duration-300',
        isDragging && 'cursor-grabbing select-none',
        isResizing && 'select-none',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        transform: 'translate(0, 0)'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Enhanced Matrix Header */}
      <CardHeader className="p-matrix-sm border-b border-primary/20">
        <div
          ref={dragRef}
          className="flex items-center justify-between cursor-move"
        >
          <div className="flex items-center space-matrix-xs min-w-0 flex-1">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 matrix-glow"
              style={{ backgroundColor: node.color || 'hsl(var(--primary))' }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-matrix-bold text-matrix-md text-primary matrix-text-glow truncate">
                {node.name.toUpperCase()}
              </h3>
              <div className="text-matrix-xs text-muted-foreground">
                {node.type.toUpperCase()} • LAYER: {node.layer?.name?.toUpperCase() || 'DEFAULT'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-matrix-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="btn-matrix h-6 w-6 p-0 hover:bg-destructive/30 hover:matrix-glow-strong"
            >
              <X size={8} className="text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Scrollable Content Area */}
      <ScrollArea style={{ height: size.height - 90 }}>
        <CardContent className="p-matrix-sm space-y-matrix-sm">
          {/* Enhanced Matrix Stats */}
          <div className="grid grid-cols-3 gap-matrix-xs text-center">
            <div className="metric-card">
              <div className="metric-value">{incoming.length}</div>
              <div className="metric-label">IN</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{outgoing.length}</div>
              <div className="metric-label">OUT</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{totalConnections}</div>
              <div className="metric-label">TOTAL</div>
            </div>
          </div>

          {/* Tags Section */}
          {(extractedTags.length > 0 || node.tags?.length > 0) && (
            <div className="space-y-matrix-xs">
              <div className="flex items-center gap-matrix-xs">
                <span className="text-matrix-sm font-matrix-semibold text-primary matrix-text-glow">TAGS</span>
                <Badge variant="outline" className="text-matrix-2xs px-1 py-0">
                  {(node.tags?.length || 0) + extractedTags.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-matrix-xs">
                {node.tags?.map((tag, index) => (
                  <Badge key={index} variant="default" className="text-matrix-xs px-2 py-0">
                    {tag.name}
                  </Badge>
                )) || []}
                {extractedTags.map((tag, index) => (
                  <Badge key={`extracted-${index}`} variant="outline" className="text-matrix-xs px-2 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Connections Section */}
          {(outgoing.length > 0 || incoming.length > 0) && (
            <div className="space-y-matrix-xs">
              <div className="flex items-center gap-matrix-xs">
                <Link size={10} className="text-primary" />
                <span className="text-matrix-sm font-matrix-semibold text-primary matrix-text-glow">CONNECTIONS</span>
                <Badge variant="outline" className="text-matrix-2xs px-1 py-0">
                  {totalConnections}
                </Badge>
              </div>
              
              {/* Outgoing Links */}
              {outgoing.length > 0 && (
                <div className="space-y-matrix-xs">
                  <div className="flex items-center gap-matrix-xs">
                    <ArrowRight size={8} className="text-primary" />
                    <span className="text-matrix-xs font-medium text-primary">TO ({outgoing.length})</span>
                  </div>
                  <div className="space-y-matrix-xs max-h-32 overflow-y-auto">
                    {outgoing.map((link, index) => (
                      <Card
                        key={index}
                        className="p-matrix-xs bg-card/30 hover:bg-card/50 transition-colors cursor-pointer border-primary/20"
                        onClick={() => handleNodeLinkClick(link.targetNode.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-matrix-xs min-w-0 flex-1">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: link.targetNode.color || 'hsl(var(--primary))' }}
                            />
                            <div className="text-matrix-xs font-medium truncate">{link.targetNode.name}</div>
                          </div>
                          <Badge variant="secondary" className="text-matrix-2xs px-1 py-0">
                            {link.relationType}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Incoming Links */}
              {incoming.length > 0 && (
                <div className="space-y-matrix-xs">
                  <div className="flex items-center gap-matrix-xs">
                    <ArrowLeft size={8} className="text-primary" />
                    <span className="text-matrix-xs font-medium text-primary">FROM ({incoming.length})</span>
                  </div>
                  <div className="space-y-matrix-xs max-h-32 overflow-y-auto">
                    {incoming.map((link, index) => (
                      <Card
                        key={index}
                        className="p-matrix-xs bg-card/30 hover:bg-card/50 transition-colors cursor-pointer border-primary/20"
                        onClick={() => handleNodeLinkClick(link.targetNode.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-matrix-xs min-w-0 flex-1">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: link.targetNode.color || 'hsl(var(--primary))' }}
                            />
                            <div className="text-matrix-xs font-medium truncate">{link.targetNode.name}</div>
                          </div>
                          <Badge variant="secondary" className="text-matrix-2xs px-1 py-0">
                            {link.relationType}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes Section */}
          {node.observations.length > 0 && (
            <div className="space-y-matrix-xs">
              <div className="flex items-center gap-matrix-xs">
                <Eye size={10} className="text-primary" />
                <span className="text-matrix-sm font-matrix-semibold text-primary matrix-text-glow">NOTES</span>
                <Badge variant="outline" className="text-matrix-2xs px-1 py-0">
                  {node.observations.length}
                </Badge>
              </div>
              <div className="space-y-matrix-xs max-h-40 overflow-y-auto">
                {node.observations.map((obs, index) => (
                  <Card key={index} className="p-matrix-xs bg-card/30 border-primary/20">
                    <div className="text-matrix-xs text-muted-foreground leading-relaxed">
                      {obs}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Section */}
          {node.metadata && (
            <div className="space-y-matrix-xs">
              <span className="text-matrix-sm font-matrix-semibold text-primary matrix-text-glow">METADATA</span>
              <div className="space-y-matrix-xs">
                <div className="grid grid-cols-2 gap-matrix-xs text-matrix-xs">
                  <div className="bg-card/30 p-matrix-xs rounded border-primary/20">
                    <span className="text-muted-foreground">Importance:</span>
                    <div className="text-primary font-medium">{node.metadata.importance || 5}/10</div>
                  </div>
                  <div className="bg-card/30 p-matrix-xs rounded border-primary/20">
                    <span className="text-muted-foreground">Keywords:</span>
                    <div className="text-primary font-medium">{node.metadata.keywords?.length || 0}</div>
                  </div>
                </div>
                {node.metadata.keywords && node.metadata.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-matrix-xs">
                    {node.metadata.keywords.slice(0, 12).map((keyword, i) => (
                      <Badge key={i} variant="outline" className="text-matrix-2xs px-1 py-0">
                        {keyword}
                      </Badge>
                    ))}
                    {node.metadata.keywords.length > 12 && (
                      <Badge variant="outline" className="text-matrix-2xs px-1 py-0">
                        +{node.metadata.keywords.length - 12} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Network Summary */}
          {totalConnections > 0 && (
            <div className="space-y-matrix-xs">
              <span className="text-matrix-sm font-matrix-semibold text-primary matrix-text-glow">NETWORK SUMMARY</span>
              <Card className="p-matrix-xs bg-primary/10 border-primary/30">
                <div className="text-matrix-xs text-primary space-y-1">
                  <div>• {new Set([...incoming.map(l => l.targetNode.id), ...outgoing.map(l => l.targetNode.id)]).size} unique connections</div>
                  <div>• Types: {Array.from(new Set([...incoming.map(l => l.relationType), ...outgoing.map(l => l.relationType)])).slice(0, 3).join(', ')}</div>
                  {node.layer && <div>• Layer: {node.layer.name}</div>}
                  <div>• Centrality: {totalConnections > 5 ? 'High' : totalConnections > 2 ? 'Medium' : 'Low'}</div>
                </div>
              </Card>
            </div>
          )}
        </CardContent>
      </ScrollArea>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity flex items-end justify-end p-1"
        onMouseDown={handleResizeStart}
      >
        <CornerDownRight size={8} className="text-primary/60" />
      </div>
    </Card>
  );
};

export default NodeCard; 