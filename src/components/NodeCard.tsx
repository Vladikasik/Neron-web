import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Eye, ArrowRight, ArrowLeft, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

  return (
    <Card
      ref={cardRef}
      className={cn(
        'fixed z-30 w-60 shadow-lg border bg-card/95 backdrop-blur-sm matrix-card',
        'transition-all duration-200',
        isDragging && 'cursor-grabbing select-none',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(0, 0)'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Minimal Header */}
      <CardHeader className="p-1">
        <div
          ref={dragRef}
          className="flex items-center justify-between cursor-move"
        >
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: node.color || 'hsl(var(--primary))' }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-[9px] truncate">{node.name}</h3>
              <div className="text-[7px] text-muted-foreground">
                {node.type} • Layer: {node.layer?.name || 'Default'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-3 w-3 p-0 hover:bg-destructive/20"
            >
              <X size={6} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-1 space-y-1">
        {/* Node Stats */}
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-card/30 rounded p-1">
            <div className="text-[8px] font-medium">{incoming.length}</div>
            <div className="text-[6px] text-muted-foreground">In</div>
          </div>
          <div className="bg-card/30 rounded p-1">
            <div className="text-[8px] font-medium">{outgoing.length}</div>
            <div className="text-[6px] text-muted-foreground">Out</div>
          </div>
          <div className="bg-card/30 rounded p-1">
            <div className="text-[8px] font-medium">{totalConnections}</div>
            <div className="text-[6px] text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Tags */}
        {(extractedTags.length > 0 || node.tags?.length > 0) && (
          <div>
            <h4 className="text-[8px] font-medium mb-0.5 flex items-center gap-1">
              Tags ({(node.tags?.length || 0) + extractedTags.length})
            </h4>
            <div className="flex flex-wrap gap-0.5">
              {node.tags?.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="default" className="text-[6px] px-1 py-0">
                  {tag.name}
                </Badge>
              )) || []}
              {extractedTags.slice(0, 2).map((tag, index) => (
                <Badge key={`extracted-${index}`} variant="outline" className="text-[6px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {((node.tags?.length || 0) + extractedTags.length) > 5 && (
                <Badge variant="secondary" className="text-[6px] px-1 py-0">
                  +{((node.tags?.length || 0) + extractedTags.length) - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        <Separator className="my-1" />

        {/* Outgoing Links */}
        {outgoing.length > 0 && (
          <div>
            <h4 className="text-[8px] font-medium mb-0.5 flex items-center gap-0.5">
              <ArrowRight size={6} />
              To ({outgoing.length})
            </h4>
            <div className="space-y-0.5">
              {outgoing.slice(0, 2).map((link, index) => (
                <Card
                  key={index}
                  className="p-1 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer border"
                  onClick={() => handleNodeLinkClick(link.targetNode.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: link.targetNode.color || 'hsl(var(--primary))' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[8px] font-medium truncate">{link.targetNode.name}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[6px] px-1 py-0">
                      {link.relationType}
                    </Badge>
                  </div>
                </Card>
              ))}
              {outgoing.length > 2 && (
                <div className="text-[7px] text-muted-foreground text-center">
                  +{outgoing.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Incoming Links */}
        {incoming.length > 0 && (
          <div>
            <h4 className="text-[8px] font-medium mb-0.5 flex items-center gap-0.5">
              <ArrowLeft size={6} />
              From ({incoming.length})
            </h4>
            <div className="space-y-0.5">
              {incoming.slice(0, 2).map((link, index) => (
                <Card
                  key={index}
                  className="p-1 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer border"
                  onClick={() => handleNodeLinkClick(link.targetNode.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5 min-w-0 flex-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: link.targetNode.color || 'hsl(var(--primary))' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[8px] font-medium truncate">{link.targetNode.name}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[6px] px-1 py-0">
                      {link.relationType}
                    </Badge>
                  </div>
                </Card>
              ))}
              {incoming.length > 2 && (
                <div className="text-[7px] text-muted-foreground text-center">
                  +{incoming.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Observations */}
        {node.observations.length > 0 && (
          <div>
            <h4 className="text-[8px] font-medium mb-0.5 flex items-center gap-0.5">
              <Eye size={6} />
              Notes ({node.observations.length})
            </h4>
            <div className="space-y-0.5">
              {node.observations.slice(0, 2).map((obs, index) => (
                <Card key={index} className="p-1 bg-card/30 border">
                  <div className="text-[7px] text-muted-foreground leading-tight">
                    {obs.length > 80 ? `${obs.substring(0, 80)}...` : obs}
                  </div>
                </Card>
              ))}
              {node.observations.length > 2 && (
                <div className="text-[7px] text-muted-foreground text-center">
                  +{node.observations.length - 2} more notes
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Metadata */}
        {node.metadata && (
          <>
            <Separator className="my-1" />
            <div>
              <h4 className="text-[8px] font-medium mb-0.5">Metadata</h4>
              <div className="grid grid-cols-2 gap-1 text-[7px]">
                <div>
                  <span className="text-muted-foreground">Importance:</span>
                  <span className="ml-1 font-medium">{node.metadata.importance || 5}/10</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Keywords:</span>
                  <span className="ml-1 font-medium">{node.metadata.keywords?.length || 0}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Connection Summary */}
        {totalConnections > 0 && (
          <>
            <Separator className="my-1" />
            <div>
              <h4 className="text-[8px] font-medium mb-0.5 flex items-center gap-0.5">
                <Link size={6} />
                Summary
              </h4>
              <Card className="p-1 bg-card/30 border">
                <div className="text-[7px] text-muted-foreground space-y-0">
                  <div>• {new Set([...incoming.map(l => l.targetNode.id), ...outgoing.map(l => l.targetNode.id)]).size} unique connections</div>
                  <div>• Types: {Array.from(new Set([...incoming.map(l => l.relationType), ...outgoing.map(l => l.relationType)])).slice(0, 2).join(', ')}</div>
                  {node.layer && <div>• Layer: {node.layer.name}</div>}
                </div>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NodeCard; 