import { useState, useCallback } from 'react';
import { Layers, Search, RotateCcw, Settings, Target, Focus } from 'lucide-react';
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
    <Card className={cn("dashboard-card", className)}>
      <CardHeader className="p-matrix-sm border-b border-primary/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-matrix-sm font-matrix-semibold flex items-center space-matrix-xs matrix-text-glow text-primary">
            <Layers size={10} className="text-primary" />
            <span>LAYER CONTROLS</span>
            {filteredLayers.length > 0 && (
              <Badge variant="outline" className="text-matrix-2xs px-1 py-0 ml-matrix-xs">
                {filteredLayers.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-matrix-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="btn-matrix h-5 w-5 p-0 text-warning hover:bg-warning/20 hover:text-warning"
              title="Reset All Filters"
            >
              <RotateCcw size={8} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-matrix-sm p-matrix-sm">
        {/* Matrix Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-primary/60" size={8} />
          <Input
            placeholder="SEARCH LAYERS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-primary/30 text-primary placeholder-primary/40 pl-6 h-6 text-matrix-xs focus:border-primary/60 focus:ring-0"
          />
        </div>

        {/* Quick Actions */}
                 <div className="flex items-center justify-between">
           <Button
             variant="outline"
             size="sm"
             onClick={onShowAllLayers}
             className="btn-matrix h-5 text-matrix-xs px-matrix-sm"
           >
             SHOW ALL
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={() => setShowAdvanced(!showAdvanced)}
             className={cn(
               "btn-matrix h-5 text-matrix-xs px-matrix-sm",
               showAdvanced && "matrix-glow-strong"
             )}
           >
             <Settings size={6} className="mr-1" />
             CONFIG
           </Button>
         </div>

        {/* Advanced Controls */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleContent>
            <div className="space-y-matrix-xs p-matrix-sm bg-primary/5 border border-primary/20 rounded">
              {/* Layer Spacing */}
              <div className="space-y-matrix-xs">
                <Label className="text-matrix-xs font-matrix-medium text-primary">
                  SPACING: {layerControls.layerSpacing}px
                </Label>
                <Slider
                  value={[layerControls.layerSpacing]}
                  onValueChange={([value]: number[]) => handleLayerSpacingChange(value)}
                  min={50}
                  max={500}
                  step={25}
                  className="w-full"
                />
              </div>

              {/* Inter-layer Connections */}
              <div className="flex items-center justify-between">
                <Label className="text-matrix-xs font-matrix-medium text-primary">INTER-LAYER LINKS</Label>
                <Switch
                  checked={layerControls.showInterLayerConnections}
                  onCheckedChange={handleInterLayerConnectionsToggle}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator className="border-primary/20" />

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="space-y-matrix-xs">
            <div className="flex items-center space-matrix-xs">
              <span className="text-matrix-xs font-matrix-semibold text-primary">TAGS</span>
              {layerControls.tagFilter.length > 0 && (
                <Badge variant="outline" className="text-matrix-2xs px-1 py-0 bg-primary/20 text-primary border-primary/30">
                  {layerControls.tagFilter.length}
                </Badge>
              )}
            </div>
            <ScrollArea className="max-h-16">
              <div className="flex flex-wrap gap-matrix-xs">
                {allTags.slice(0, 12).map(tag => (
                  <Badge
                    key={tag}
                    variant={layerControls.tagFilter.includes(tag) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-matrix-2xs px-2 py-0 transition-all duration-200",
                      layerControls.tagFilter.includes(tag) 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "border-primary/30 text-primary/70 hover:bg-primary/10 hover:border-primary/50"
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

        <Separator className="border-primary/20" />

        {/* Layer List */}
        <div className="space-y-matrix-xs">
          <div className="flex items-center gap-matrix-xs">
            <span className="text-matrix-xs font-matrix-semibold text-primary">LAYERS</span>
            <Badge variant="outline" className="text-matrix-2xs px-1 py-0 border-primary/30">
              {filteredLayers.length}
            </Badge>
          </div>

          <ScrollArea className="max-h-40">
            <div className="space-y-matrix-xs">
              {filteredLayers.map(layer => {
                const stats = calculateLayerStats(layer);
                const isVisible = layerControls.visibleLayers.has(layer.id);
                const isIsolated = layerControls.isolatedLayer === layer.id;
                const opacity = (layerControls.layerOpacity.get(layer.id) || 1.0) * 100;

                return (
                  <Card key={layer.id} className={cn(
                    "p-matrix-xs transition-all duration-200 border",
                    isIsolated ? 'border-primary bg-primary/10' : 
                    isVisible ? 'border-primary/30 bg-card/50' : 
                    'border-primary/20 bg-card/20 opacity-60'
                  )}>
                    <div className="space-y-matrix-xs">
                      {/* Layer Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-matrix-xs min-w-0 flex-1">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: layer.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-matrix-semibold text-matrix-xs truncate text-primary">
                              {layer.name.toUpperCase()}
                            </div>
                            <div className="text-matrix-2xs text-muted-foreground">
                              {stats.totalNodes} nodes • {stats.connections} links
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-matrix-xs">
                                                     {/* Center Button */}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => onCenterOnLayer(layer.id)}
                             className="btn-matrix h-4 w-4 p-0 text-info hover:bg-info/20"
                             title="Center on Layer"
                           >
                             <Target size={6} />
                           </Button>
                           
                           {/* Isolate Button */}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleLayerIsolation(layer.id)}
                             className={cn(
                               "btn-matrix h-4 w-4 p-0",
                               isIsolated 
                                 ? "text-primary bg-primary/20 matrix-glow-strong" 
                                 : "text-warning hover:bg-warning/20"
                             )}
                             title={isIsolated ? "Exit Isolation" : "Isolate Layer"}
                           >
                             <Focus size={6} />
                           </Button>
                          
                          {/* Visibility Switch */}
                          <Switch
                            checked={isVisible}
                            onCheckedChange={() => handleLayerVisibilityToggle(layer.id)}
                            className="scale-75"
                          />
                        </div>
                      </div>

                      {/* Layer Opacity */}
                      {isVisible && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-matrix-2xs text-primary">OPACITY</Label>
                            <span className="text-matrix-2xs text-primary font-matrix-medium">
                              {Math.round(opacity)}%
                            </span>
                          </div>
                          <Slider
                            value={[opacity]}
                            onValueChange={([value]: number[]) => handleLayerOpacityChange(layer.id, value)}
                            min={10}
                            max={100}
                            step={10}
                            className="w-full"
                          />
                        </div>
                      )}

                      {/* Layer Tags */}
                      {layer.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {layer.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-matrix-2xs px-1 py-0 border-primary/30 text-primary/70">
                              {tag.toUpperCase()}
                            </Badge>
                          ))}
                          {layer.tags.length > 3 && (
                            <Badge variant="outline" className="text-matrix-2xs px-1 py-0 border-primary/30 text-primary/70">
                              +{layer.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Layer Stats */}
                      {(stats.interLayerConnections > 0 || (isVisible && stats.visibleNodes !== stats.totalNodes)) && (
                        <div className="text-matrix-2xs text-primary/60 space-y-0">
                          {stats.interLayerConnections > 0 && (
                            <div>• {stats.interLayerConnections} inter-layer connections</div>
                          )}
                          {isVisible && stats.visibleNodes !== stats.totalNodes && (
                            <div>• {stats.visibleNodes}/{stats.totalNodes} visible nodes</div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}

              {filteredLayers.length === 0 && (
                <div className="text-center text-primary/40 text-matrix-xs py-matrix-md">
                  <Layers size={16} className="mx-auto mb-matrix-xs opacity-50" />
                  <div>No layers found</div>
                  {searchTerm && (
                    <div className="text-matrix-2xs">Try a different search term</div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default LayerControls; 