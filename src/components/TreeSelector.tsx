import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { TreeDeciduous, Map as MapIcon, List, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { TreeProfileModal } from "./TreeProfileModal";
import TreeLayer from "./TreeLayer";
import Map, { NavigationControl } from "react-map-gl";

// Tree data type definition (matching TreeInventory)
interface TreeData {
  id: string;
  // diameter: number;
  height: number;
  lat: number;
  lng: number;
  district: string;
  // damage_area: number;
  // ice_damage: boolean;
  // need_nutrient: boolean;
  risk: string;
  // age: number;
  inspection: string;
  species: string;
}



interface TreeSelectorProps {
  selectedTrees: string[];
  onTreesChange: (trees: string[]) => void;
}

export function TreeSelector({ selectedTrees, onTreesChange }: TreeSelectorProps) {
  const [selectedRisks, setSelectedRisks] = useState<string[]>(['high']);
  const [hoveredTree, setHoveredTree] = useState<{
    id: string;
    name: string;
    species: string;
    risk: 'high' | 'medium' | 'low';
    position: { x: number; y: number };
  } | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [treesData, setTreesData] = useState<any>(null);
  const [treesListData, setTreesListData] = useState<TreeData[]>([]);
  const [mapState, setMapState] = useState({
    longitude: 127.4704,
    latitude: 37.34111,
    zoom: 14
  });
  const [cursor, setCursor] = useState<string>('grab');

  // Load GeoJSON data from public folder for both map and list
  useEffect(() => {
    fetch('/data/trees.geojson')
      .then(response => response.json())
      .then(data => {
        setTreesData(data);
        
        // Convert GeoJSON features to TreeData format for list view
        if (data && data.features && Array.isArray(data.features)) {
          try {
            const treeList: TreeData[] = data.features
              .filter((feature: any) => feature && feature.properties && feature.geometry)
              .map((feature: any) => {
                const props = feature.properties || {};
                const coordinates = feature.geometry?.coordinates || [0, 0]; // [lng, lat]
                
                return {
                  id: props.id || '',
                  // diameter: props.diameter || 0,
                  height: props.height || 0,
                  lat: coordinates[1] || 0,
                  lng: coordinates[0] || 0,
                  district: props.district || '',
                  // damage_area: props.damage_area || 0,
                  // ice_damage: props.ice_damage || false,
                  // need_nutrient: props.need_nutrient || false,
                  risk: props.risk || 'low',
                  // age: props.age || 0,
                  inspection: props.inspection || '',
                  species: props.species || '',
                };
              });
            
            // Ensure treeList is always an array before setting state
            if (Array.isArray(treeList)) {
              setTreesListData(treeList);
            } else {
              console.warn('treeList is not an array:', treeList);
              setTreesListData([]);
            }
          } catch (error) {
            console.error('Error processing tree features:', error);
            setTreesListData([]);
          }
        } else {
          console.warn('Invalid GeoJSON structure or missing features:', data);
          setTreesListData([]);
        }
      })
      .catch(error => {
        console.error('Error loading trees data:', error);
        setTreesListData([]);
      });
  }, []);

  const filteredTrees = treesListData.filter(
    (tree) => selectedRisks.includes(tree.risk.toLowerCase())
  );

  const onTreeLayerClick = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      const clickedFeature = event.features[0];
      if (clickedFeature.properties && clickedFeature.properties.id) {
        const treeId = clickedFeature.properties.id;
        toggleTree(treeId);
      }
    }
  }, [selectedTrees, onTreesChange]);

  const onTreeLayerHover = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      const hoveredFeature = event.features[0];
      if (hoveredFeature.properties) {
        const properties = hoveredFeature.properties;
        const treeId = properties.id || 'unknown';
        const risk = properties.risk || 'low';
        
        // Convert map coordinates to screen position
        const x = event.point.x;
        const y = event.point.y;
        const mapContainer = event.target.getContainer();
        const rect = mapContainer.getBoundingClientRect();
        const position = {
          x: (x / rect.width) * 100,
          y: (y / rect.height) * 100
        };

        const species = properties.species || 'Unknown';
        setCursor('pointer');
        setHoveredTree({
          id: treeId,
          name: `${species} - Tree ID: ${treeId}`,
          species: species,
          risk: risk as 'high' | 'medium' | 'low',
          position: position
        });
      }
    } else {
      setCursor('grab');
    }
  }, []);

  const onTreeLayerLeave = useCallback(() => {
    setHoveredTree(null);
    setCursor('grab');
  }, []);

  const onMapMouseEnter = useCallback(() => {
    setCursor('grab');
  }, []);

  const toggleTree = (treeId: string) => {
    if (selectedTrees.includes(treeId)) {
      onTreesChange(selectedTrees.filter((id) => id !== treeId));
    } else {
      onTreesChange([...selectedTrees, treeId]);
    }
  };

  const handleViewTree = (treeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTreeId(treeId);
    setProfileModalOpen(true);
  };

  const handleAddToProject = (treeId: string) => {
    if (!selectedTrees.includes(treeId)) {
      onTreesChange([...selectedTrees, treeId]);
    }
    setProfileModalOpen(false);
  };

  const getRiskBadgeVariant = (risk: string): "default" | "secondary" | "destructive" | "warning" | "success" => {
    if (risk === "low") return "success";
    if (risk === "medium") return "warning";
    return "destructive";
  };

  const handleRiskFilterChange = (risk: string, checked: boolean) => {
    if (checked) {
      setSelectedRisks([...selectedRisks, risk]);
    } else {
      setSelectedRisks(selectedRisks.filter(r => r !== risk));
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-4">
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              목록 보기
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapIcon className="h-4 w-4 mr-2" />
              지도 보기
            </TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list" className="mt-0">
            {/* Risk Filter */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-3">위험도로 필터링</p>
              <div className="flex gap-4">
                {[
                  { value: 'high', label: '높음', variant: 'destructive' as const },
                  { value: 'medium', label: '보통', variant: 'warning' as const },
                  { value: 'low', label: '낮음', variant: 'success' as const }
                ].map((risk) => (
                  <div key={risk.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`risk-${risk.value}`}
                      checked={selectedRisks.includes(risk.value)}
                      onCheckedChange={(checked) => handleRiskFilterChange(risk.value, checked as boolean)}
                    />
                    <label
                      htmlFor={`risk-${risk.value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Badge variant={risk.variant} className="text-xs">
                        {risk.label}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2">
              {filteredTrees.map((tree) => {
                const isSelected = selectedTrees.includes(tree.id);
                return (
                  <Card
                    key={tree.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSelected && "border-primary bg-primary/5"
                    )}
                    onClick={() => toggleTree(tree.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleTree(tree.id)} />
                        <TreeDeciduous className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{tree.id}</span>
                            <Badge
                              variant={getRiskBadgeVariant(tree.risk)}
                              className="text-xs"
                            >
                              {tree.risk.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{tree.species}</p>
                          <p className="text-xs text-muted-foreground">{tree.district} • 높이: {tree.height}m</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => handleViewTree(tree.id, e)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Map View */}
          <TabsContent value="map" className="mt-0">
            <div className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-border">
              {MAPBOX_TOKEN ? (
                <Map
                  {...mapState}
                  onMove={evt => setMapState(evt.viewState)}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  mapboxAccessToken={MAPBOX_TOKEN}
                  interactiveLayerIds={['trees-point']}
                  onClick={onTreeLayerClick}
                  onMouseMove={onTreeLayerHover}
                  onMouseLeave={onTreeLayerLeave}
                  onMouseEnter={onMapMouseEnter}
                  cursor={cursor}
                >
                  <NavigationControl position="top-right" />
                  {treesData && <TreeLayer treesData={treesData} selectedTreeIds={selectedTrees} />}
                </Map>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                  <div className="text-center p-4">
                    <p className="text-lg font-semibold mb-2">Mapbox Token Required</p>
                    <p className="text-sm text-muted-foreground">
                      Please set VITE_MAPBOX_TOKEN in your .env file
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Get your token from{" "}
                      <a
                        href="https://account.mapbox.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        mapbox.com
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* Floating tooltip for hovered tree */}
              {hoveredTree && (
                <div
                  className="absolute z-20 bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none"
                  style={{
                    left: `${hoveredTree.position.x}%`,
                    top: `${hoveredTree.position.y}%`,
                    transform: "translate(-50%, -120%)",
                  }}
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{hoveredTree.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {hoveredTree.id}</p>
                    <p className="text-xs text-muted-foreground">Species: {hoveredTree.species}</p>
                    <Badge
                      variant={hoveredTree.risk === "high" ? "destructive" : hoveredTree.risk === "medium" ? "warning" : "success"}
                      className="text-xs"
                    >
                      {hoveredTree.risk.toUpperCase()} Risk
                    </Badge>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg z-10">
                <p className="text-xs font-semibold mb-2">위험도 등급</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-destructive" />
                    <span className="text-xs">높음</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-warning" />
                      <span className="text-xs">보통</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-success" />
                      <span className="text-xs">낮음</span>
                  </div>
                </div>
              </div>

              {/* Selection Info */}
              <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                <p className="text-xs font-semibold">
                  {selectedTrees.length}그루 선택됨
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <TreeProfileModal
        treeId={selectedTreeId}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onCreateWorkOrder={handleAddToProject}
      />
    </Card>
  );
}
