import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Eye, ArrowRight, ArrowLeft, Link, ChevronDown, ChevronUp, CornerDownRight } from 'lucide-react';
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
  const [size, setSize] = useState({ width: 320, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [expandedSections, setExpandedSections] = useState({
    tags: true,
    connections: true,
    notes: false,
    metadata: false
  });
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
    if (isDragging && !isResizing) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      setSize({
        width: Math.max(280, resizeStart.width + deltaX),
        height: Math.max(200, resizeStart.height + deltaY)
      });
    }
  }, [isDragging, isResizing, dragOffset, resizeStart]);

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

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

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
      <CardHeader className="p-matrix-xs">
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
              <h3 className="font-matrix-bold text-matrix-lg text-primary matrix-text-glow truncate">
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

      <CardContent className="p-matrix-sm space-matrix-sm">
        {/* Enhanced Matrix Stats */}
        <div className="grid grid-cols-3 space-matrix-xs text-center">
          <div className="matrix-card bg-primary/10 border-primary/20 p-matrix-xs">
            <div className="text-matrix-sm font-matrix-bold text-primary matrix-text-glow">{incoming.length}</div>
            <div className="text-matrix-xs text-muted-foreground">IN</div>
          </div>
          <div className="matrix-card bg-primary/10 border-primary/20 p-matrix-xs">
            <div className="text-matrix-sm font-matrix-bold text-primary matrix-text-glow">{outgoing.length}</div>
            <div className="text-matrix-xs text-muted-foreground">OUT</div>
          </div>
          <div className="matrix-card bg-primary/10 border-primary/20 p-matrix-xs">
            <div className="text-matrix-sm font-matrix-bold text-primary matrix-text-glow">{totalConnections}</div>
            <div className="text-matrix-xs text-muted-foreground">TOTAL</div>
          </div>
        </div>

        {/* Expandable Tags */}
        {(extractedTags.length > 0 || node.tags?.length > 0) && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('tags')}
              className="h-4 w-full justify-between p-1 text-matrix-xs"
            >
              Tags ({(node.tags?.length || 0) + extractedTags.length})
              {expandedSections.tags ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
            </Button>
            {expandedSections.tags && (
              <div className="p-1">
                <div className="flex flex-wrap gap-1">
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
          </div>
        )}

        {/* Expandable Connections */}
        {(outgoing.length > 0 || incoming.length > 0) && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('connections')}
              className="h-4 w-full justify-between p-1 text-matrix-xs"
            >
              Connections ({totalConnections})
              {expandedSections.connections ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
            </Button>
            {expandedSections.connections && (
              <div className="p-1 space-y-2">
                {/* Outgoing Links */}
                {outgoing.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowRight size={8} className="text-primary" />
                      <span className="text-matrix-xs font-medium">To ({outgoing.length})</span>
                    </div>
                    <div className="space-y-1">
                      {outgoing.map((link, index) => (
                        <Card
                          key={index}
                          className="p-2 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer border"
                          onClick={() => handleNodeLinkClick(link.targetNode.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: link.targetNode.color || 'hsl(var(--primary))' }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-matrix-sm font-medium truncate">{link.targetNode.name}</div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-matrix-xs px-1 py-0">
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
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <ArrowLeft size={8} className="text-primary" />
                      <span className="text-matrix-xs font-medium">From ({incoming.length})</span>
                    </div>
                    <div className="space-y-1">
                      {incoming.map((link, index) => (
                        <Card
                          key={index}
                          className="p-2 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer border"
                          onClick={() => handleNodeLinkClick(link.targetNode.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: link.targetNode.color || 'hsl(var(--primary))' }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-matrix-sm font-medium truncate">{link.targetNode.name}</div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-matrix-xs px-1 py-0">
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
          </div>
        )}

        {/* Observations */}
        {node.observations.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('notes')}
              className="h-4 w-full justify-between p-1 text-matrix-xs"
            >
              <div className="flex items-center gap-1">
                <Eye size={6} />
                Notes ({node.observations.length})
              </div>
              {expandedSections.notes ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
            </Button>
            {expandedSections.notes && (
              <div className="p-1">
                <ScrollArea className="max-h-32">
                  <div className="space-y-0.5">
                    {node.observations.map((obs, index) => (
                      <Card key={index} className="p-1 bg-card/30 border">
                        <div className="text-[7px] text-muted-foreground leading-tight">
                          {obs}
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Expandable Metadata */}
        {node.metadata && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('metadata')}
              className="h-4 w-full justify-between p-1 text-matrix-xs"
            >
              Metadata
              {expandedSections.metadata ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
            </Button>
            {expandedSections.metadata && (
              <div className="p-1 space-y-1">
                <div className="grid grid-cols-2 gap-1 text-matrix-xs">
                  <div>
                    <span className="text-muted-foreground">Importance:</span>
                    <span className="ml-1 font-medium">{node.metadata.importance || 5}/10</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Keywords:</span>
                    <span className="ml-1 font-medium">{node.metadata.keywords?.length || 0}</span>
                  </div>
                </div>
                {node.metadata.keywords && (
                  <div className="flex flex-wrap gap-1">
                    {node.metadata.keywords.slice(0, 8).map((keyword, i) => (
                      <Badge key={i} variant="outline" className="text-matrix-xs px-1 py-0">
                        {keyword}
                      </Badge>
                    ))}
                    {node.metadata.keywords.length > 8 && (
                      <Badge variant="outline" className="text-matrix-xs px-1 py-0">
                        +{node.metadata.keywords.length - 8}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Connection Summary */}
        {totalConnections > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('notes')}
              className="h-4 w-full justify-between p-1 text-matrix-xs"
            >
              <div className="flex items-center gap-1">
                <Link size={6} />
                Summary
              </div>
              {expandedSections.notes ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
            </Button>
            {expandedSections.notes && (
              <Card className="p-1 bg-card/30 border">
                <div className="text-matrix-xs text-muted-foreground space-y-0">
                  <div>• {new Set([...incoming.map(l => l.targetNode.id), ...outgoing.map(l => l.targetNode.id)]).size} unique connections</div>
                  <div>• Types: {Array.from(new Set([...incoming.map(l => l.relationType), ...outgoing.map(l => l.relationType)])).slice(0, 2).join(', ')}</div>
                  {node.layer && <div>• Layer: {node.layer.name}</div>}
                </div>
              </Card>
            )}
          </div>
        )}
      </CardContent>

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