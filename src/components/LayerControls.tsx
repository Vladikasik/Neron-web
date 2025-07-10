import { useState, useCallback } from 'react';
import { Eye, EyeOff, Layers, Filter, Search, RotateCcw, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { LayerInfo, LayerControls as LayerControlsType, GraphData } from '../types/graph';

interface LayerControlsProps {
  graphData: GraphData;
  layerControls: LayerControlsType;
  onLayerControlsChange: (controls: LayerControlsType) => void;
  onCenterOnLayer: (layerId: string) => void;
  onIsolateLayer: (layerId: string) => void;
  onShowAllLayers: () => void;
  className?: string;
}

interface LayerStats {
  totalNodes: number;
  visibleNodes: number;
  connections: number;
  interLayerConnections: number;
}

const LayerControls: React.FC<LayerControlsProps> = ({
  graphData,
  layerControls,
  onLayerControlsChange,
  onCenterOnLayer,
  onIsolateLayer,
  onShowAllLayers,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate layer statistics
  const calculateLayerStats = useCallback((layer: LayerInfo): LayerStats => {
    const layerNodes = graphData.nodes.filter(node => node.layerId === layer.id);
    const visibleNodes = layerNodes.filter(() => 
      layerControls.visibleLayers.has(layer.id) && 
      (!layerControls.isolatedLayer || layerControls.isolatedLayer === layer.id)
    );

    const connections = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return layerNodes.some(node => node.id === sourceId) || layerNodes.some(node => node.id === targetId);
    });

    const interLayerConnections = connections.filter(link => link.isInterLayer);

    return {
      totalNodes: layerNodes.length,
      visibleNodes: visibleNodes.length,
      connections: connections.length,
      interLayerConnections: interLayerConnections.length
    };
  }, [graphData, layerControls]);

  // Filter layers based on search term
  const filteredLayers = graphData.layers?.filter(layer =>
    layer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    layer.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Get all unique tags for filtering
  const allTags = Array.from(
    new Set(graphData.nodes.flatMap(node => node.tags.map(tag => tag.name)))
  ).sort();

  // Handle layer visibility toggle
  const handleLayerVisibilityToggle = useCallback((layerId: string) => {
    const newVisibleLayers = new Set(layerControls.visibleLayers);
    if (newVisibleLayers.has(layerId)) {
      newVisibleLayers.delete(layerId);
    } else {
      newVisibleLayers.add(layerId);
    }

    onLayerControlsChange({
      ...layerControls,
      visibleLayers: newVisibleLayers,
      isolatedLayer: undefined // Clear isolation when toggling visibility
    });
  }, [layerControls, onLayerControlsChange]);

  // Handle layer opacity change
  const handleLayerOpacityChange = useCallback((layerId: string, opacity: number) => {
    const newOpacityMap = new Map(layerControls.layerOpacity);
    newOpacityMap.set(layerId, opacity / 100);

    onLayerControlsChange({
      ...layerControls,
      layerOpacity: newOpacityMap
    });
  }, [layerControls, onLayerControlsChange]);

  // Handle tag filter toggle
  const handleTagFilterToggle = useCallback((tagName: string) => {
    const newTagFilter = layerControls.tagFilter.includes(tagName)
      ? layerControls.tagFilter.filter(t => t !== tagName)
      : [...layerControls.tagFilter, tagName];

    onLayerControlsChange({
      ...layerControls,
      tagFilter: newTagFilter
    });
  }, [layerControls, onLayerControlsChange]);

  // Handle layer spacing change
  const handleLayerSpacingChange = useCallback((spacing: number) => {
    onLayerControlsChange({
      ...layerControls,
      layerSpacing: spacing
    });
  }, [layerControls, onLayerControlsChange]);

  // Handle inter-layer connections toggle
  const handleInterLayerConnectionsToggle = useCallback((show: boolean) => {
    onLayerControlsChange({
      ...layerControls,
      showInterLayerConnections: show
    });
  }, [layerControls, onLayerControlsChange]);

  // Handle layer isolation
  const handleLayerIsolation = useCallback((layerId: string) => {
    const newIsolatedLayer = layerControls.isolatedLayer === layerId ? undefined : layerId;
    
    onLayerControlsChange({
      ...layerControls,
      isolatedLayer: newIsolatedLayer
    });

    if (newIsolatedLayer) {
      onIsolateLayer(layerId);
    } else {
      onShowAllLayers();
    }
  }, [layerControls, onLayerControlsChange, onIsolateLayer, onShowAllLayers]);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    const allLayerIds = new Set(graphData.layers?.map(l => l.id) || []);
    const defaultOpacity = new Map(graphData.layers?.map(l => [l.id, 1.0]) || []);

    onLayerControlsChange({
      visibleLayers: allLayerIds,
      isolatedLayer: undefined,
      layerOpacity: defaultOpacity,
      showInterLayerConnections: true,
      tagFilter: [],
      layerSpacing: 200
    });

    setSearchTerm('');
    onShowAllLayers();
  }, [graphData.layers, onLayerControlsChange, onShowAllLayers]);

  return (
    <Card className={`layer-controls matrix-card matrix-glow ${className}`}>
      <CardHeader className="p-matrix-xs">
        <div className="flex items-center justify-between">
          <CardTitle className="text-matrix-lg font-matrix-bold flex items-center space-matrix-xs matrix-text-glow text-primary">
            <Layers size={12} />
            <span>LAYERS</span>
          </CardTitle>
          <div className="flex items-center space-matrix-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="btn-matrix h-6 w-6 p-0 matrix-glow"
              title="Reset All"
            >
              <RotateCcw size={8} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="btn-matrix h-6 w-6 p-0 matrix-glow"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <EyeOff size={8} /> : <Eye size={8} />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="space-matrix-sm p-matrix-sm">
            {/* Enhanced Matrix Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-primary/60" size={8} />
              <Input
                placeholder="SEARCH LAYERS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="matrix-terminal pl-6 h-6 text-matrix-sm focus-matrix"
              />
            </div>

            {/* Enhanced Quick Actions */}
            <div className="flex items-center space-matrix-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={onShowAllLayers}
                className="btn-matrix h-5 text-matrix-xs px-2 matrix-glow"
              >
                ALL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="btn-matrix h-5 text-matrix-xs px-2 matrix-glow"
              >
                <Settings size={6} className="mr-1" />
                ADV
              </Button>
            </div>

            {/* Enhanced Advanced Controls */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleContent>
                <div className="space-matrix-xs p-matrix-sm matrix-card bg-primary/5 border-primary/20">
                  {/* Enhanced Layer Spacing */}
                  <div className="space-matrix-xs">
                    <Label className="text-matrix-xs font-matrix-medium text-primary">
                      SPACING: {layerControls.layerSpacing}px
                    </Label>
                    <Slider
                      value={[layerControls.layerSpacing]}
                      onValueChange={([value]: number[]) => handleLayerSpacingChange(value)}
                      min={50}
                      max={500}
                      step={25}
                      className="w-full h-2 focus-matrix"
                    />
                  </div>

                  {/* Enhanced Inter-layer Connections */}
                  <div className="flex items-center justify-between">
                    <Label className="text-matrix-xs font-matrix-medium text-primary">INTER-LAYER</Label>
                    <Switch
                      checked={layerControls.showInterLayerConnections}
                      onCheckedChange={handleInterLayerConnectionsToggle}
                      className="matrix-glow"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-1" />

            {/* Enhanced Tag Filters */}
            {allTags.length > 0 && (
              <div className="space-matrix-xs">
                <div className="flex items-center space-matrix-xs">
                  <Filter size={8} className="text-primary" />
                  <Label className="text-matrix-xs font-matrix-bold text-primary">TAGS</Label>
                  {layerControls.tagFilter.length > 0 && (
                    <Badge variant="secondary" className="text-matrix-xs px-1 py-0 matrix-glow bg-primary/20 text-primary">
                      {layerControls.tagFilter.length}
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-8">
                  <div className="flex flex-wrap space-matrix-xs">
                    {allTags.slice(0, 15).map(tag => (
                      <Badge
                        key={tag}
                        variant={layerControls.tagFilter.includes(tag) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer text-matrix-xs px-2 py-0 transition-all duration-200",
                          "hover:matrix-glow-strong",
                          layerControls.tagFilter.includes(tag) 
                            ? "bg-primary text-primary-foreground matrix-glow" 
                            : "border-primary/30 text-primary/70 hover:bg-primary/10"
                        )}
                        onClick={() => handleTagFilterToggle(tag)}
                      >
                        {tag.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Separator className="my-1" />

            {/* Layer List */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Layers size={8} />
                <Label className="text-[8px] font-medium">({filteredLayers.length})</Label>
              </div>

              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {filteredLayers.map(layer => {
                    const stats = calculateLayerStats(layer);
                    const isVisible = layerControls.visibleLayers.has(layer.id);
                    const isIsolated = layerControls.isolatedLayer === layer.id;
                    const opacity = (layerControls.layerOpacity.get(layer.id) || 1.0) * 100;

                    return (
                      <Card key={layer.id} className={`p-1 transition-all duration-200 ${
                        isIsolated ? 'ring-1 ring-primary' : isVisible ? 'bg-card/50' : 'bg-card/20 opacity-60'
                      }`}>
                        <div className="space-y-1">
                          {/* Layer Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: layer.color }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-[9px] truncate">{layer.name}</div>
                                <div className="text-[7px] text-muted-foreground">
                                  {stats.totalNodes}n • {stats.connections}l
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCenterOnLayer(layer.id)}
                                className="h-3 w-3 p-0"
                                title="Center"
                              >
                                <Eye size={6} />
                              </Button>
                              <Button
                                variant={isIsolated ? "default" : "ghost"}
                                size="sm"
                                onClick={() => handleLayerIsolation(layer.id)}
                                className="h-3 w-3 p-0"
                                title={isIsolated ? "Exit" : "Isolate"}
                              >
                                <Filter size={6} />
                              </Button>
                              <Switch
                                checked={isVisible}
                                onCheckedChange={() => handleLayerVisibilityToggle(layer.id)}
                              />
                            </div>
                          </div>

                          {/* Layer Opacity */}
                          {isVisible && (
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-[7px]">Opacity</Label>
                                <span className="text-[7px] text-muted-foreground">{Math.round(opacity)}%</span>
                              </div>
                              <Slider
                                value={[opacity]}
                                onValueChange={([value]: number[]) => handleLayerOpacityChange(layer.id, value)}
                                min={10}
                                max={100}
                                step={10}
                                className="w-full h-1"
                              />
                            </div>
                          )}

                          {/* Layer Tags */}
                          {layer.tags.length > 0 && (
                            <div className="flex flex-wrap gap-0.5">
                              {layer.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-[6px] px-1 py-0">
                                  {tag}
                                </Badge>
                              ))}
                              {layer.tags.length > 3 && (
                                <Badge variant="outline" className="text-[6px] px-1 py-0">+{layer.tags.length - 3}</Badge>
                              )}
                            </div>
                          )}

                          {/* Layer Stats */}
                          {(stats.interLayerConnections > 0 || (isVisible && stats.visibleNodes !== stats.totalNodes)) && (
                            <div className="text-[7px] text-muted-foreground space-y-0">
                              {stats.interLayerConnections > 0 && (
                                <div>• {stats.interLayerConnections} inter-layer</div>
                              )}
                              {isVisible && stats.visibleNodes !== stats.totalNodes && (
                                <div>• {stats.visibleNodes}/{stats.totalNodes} visible</div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}

                  {filteredLayers.length === 0 && (
                    <div className="text-center text-muted-foreground text-[8px] py-2">
                      No layers found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default LayerControls; 