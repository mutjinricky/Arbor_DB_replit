import { useCallback, useState, useEffect } from "react";
import { Map as MapIcon, List, TreeDeciduous } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreeProfileModal } from "@/components/TreeProfileModal";
import { WorkOrderDialog } from "@/components/WorkOrderDialog";
import TreeLayer from "@/components/TreeLayer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Map, { NavigationControl } from "react-map-gl";

// Tree data type definition
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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export default function TreeInventory() {
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [workOrderDialogOpen, setWorkOrderDialogOpen] = useState(false);
  const [mapState, setMapState] = useState({
    longitude: 127.4704,
    latitude: 37.34111,
    zoom: 14
  });
  const [treesData, setTreesData] = useState<any>(null);
  const [treesListData, setTreesListData] = useState<TreeData[]>([]);
  const [cursor, setCursor] = useState<string>('grab');
  const [hoveredTree, setHoveredTree] = useState<{
    id: string;
    name: string;
    species: string;
    risk: 'high' | 'medium' | 'low';
    position: { x: number; y: number };
  } | null>(null);

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

  const handleTreeClick = useCallback((treeId: string) => {
    setSelectedTreeId(treeId);
    setProfileModalOpen(true);
  }, []);

  const handleAddToProject = useCallback((treeId: string) => {
    setWorkOrderDialogOpen(true);
    setProfileModalOpen(false);
  }, []);

  const onTreeLayerClick = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      const clickedFeature = event.features[0];
      if (clickedFeature.properties && clickedFeature.properties.id) {
        const treeId = clickedFeature.properties.id;
        console.log("Tree ID:", treeId);
        handleTreeClick(treeId);
      } else {
        console.log("No tree ID found in properties:", clickedFeature.properties);
      }
    } else {
      console.log("No features found in click event");
    }
  }, [handleTreeClick]);

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

  // Ensure treesListData is always an array
  const treesToDisplay = Array.isArray(treesListData) ? treesListData : [];

  const getRiskBadgeVariant = (risk: string): "default" | "secondary" | "destructive" | "warning" | "success" => {
    if (risk === "low") return "success";
    if (risk === "medium") return "warning";
    return "destructive";
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">수목 재고 관리</h1>
            <p className="text-muted-foreground">시스템의 모든 수목을 관리하고 조회합니다</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("map")}
              className="gap-2"
            >
              <MapIcon className="h-4 w-4" />
              지도 보기
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("list")}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              목록 보기
            </Button>
          </div>
        </div>

        {view === "map" ? (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TreeDeciduous className="h-5 w-5 text-primary" />
                인터랙티브 수목 지도
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    {treesData && <TreeLayer treesData={treesData} />}
                  </Map>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <div className="text-center p-4">
                      <p className="text-lg font-semibold mb-2">Mapbox 토큰 필요</p>
                      <p className="text-sm text-muted-foreground">
                        .env 파일에 VITE_MAPBOX_TOKEN을 설정해주세요
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        토큰은{" "}
                        <a
                          href="https://account.mapbox.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          mapbox.com
                        </a>
                        에서 받으실 수 있습니다
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
                      <p className="text-xs text-muted-foreground">종류: {hoveredTree.species}</p>
                      <Badge
                        variant={hoveredTree.risk === "high" ? "destructive" : hoveredTree.risk === "medium" ? "warning" : "success"}
                        className="text-xs"
                      >
                        {hoveredTree.risk === "high" ? "높음" : hoveredTree.risk === "medium" ? "보통" : "낮음"} 위험도
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">수목 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>수목 ID</TableHead>
                    <TableHead>종류</TableHead>
                    <TableHead>지역</TableHead>
                    <TableHead>높이 (m)</TableHead>
                    <TableHead>위험 상태</TableHead>
                    <TableHead>최근 점검일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treesToDisplay.map((tree) => (
                    <TableRow 
                      key={tree.id} 
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => handleTreeClick(tree.id)}
                    >
                      <TableCell className="font-mono">{tree.id}</TableCell>
                      <TableCell>{tree.species}</TableCell>
                      <TableCell>{tree.district}</TableCell>
                      <TableCell>{tree.height}</TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(tree.risk)}>{tree.risk.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{tree.inspection}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <TreeProfileModal
        treeId={selectedTreeId}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onCreateWorkOrder={handleAddToProject}
      />

      <WorkOrderDialog
        isOpen={workOrderDialogOpen}
        onClose={() => setWorkOrderDialogOpen(false)}
        treeIds={selectedTreeId ? [selectedTreeId] : []}
      />
    </div>
  );
}
