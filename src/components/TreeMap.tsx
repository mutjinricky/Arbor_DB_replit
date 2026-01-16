import { useState, useCallback } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreeDeciduous, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { TreeProfileModal } from "./TreeProfileModal";
import { WorkOrderDialog } from "./WorkOrderDialog";
import "mapbox-gl/dist/mapbox-gl.css";

interface Tree {
  id: string;
  name: string;
  species: string;
  risk: "high" | "medium" | "low";
  health: string;
  position: { lat: number; lng: number };
}

// Seoul, Gangnam area coordinates
const mockTrees: Tree[] = [
  { id: "G-1023", name: "강남대로 느티나무", species: "느티나무", risk: "high", health: "Poor", position: { lat: 37.4946, lng: 127.0276 } },
  { id: "G-1045", name: "역삼동 벚나무", species: "벚나무", risk: "medium", health: "Fair", position: { lat: 37.5008, lng: 127.0372 } },
  { id: "G-1067", name: "선릉역 은행나무", species: "은행나무", risk: "low", health: "Good", position: { lat: 37.5043, lng: 127.0486 } },
  { id: "G-1089", name: "테헤란로 단풍나무", species: "단풍나무", risk: "high", health: "Poor", position: { lat: 37.5045, lng: 127.0489 } },
  { id: "G-1101", name: "삼성역 소나무", species: "소나무", risk: "low", health: "Good", position: { lat: 37.5080, lng: 127.0628 } },
  { id: "G-1123", name: "개포동 메타세쿼이아", species: "메타세쿼이아", risk: "medium", health: "Fair", position: { lat: 37.4783, lng: 127.0589 } },
  { id: "G-1145", name: "일원동 느티나무", species: "느티나무", risk: "low", health: "Good", position: { lat: 37.4809, lng: 127.0848 } },
  { id: "G-1167", name: "수서역 은행나무", species: "은행나무", risk: "medium", health: "Fair", position: { lat: 37.4838, lng: 127.1010 } },
];

interface TreeMapProps {
  onTreeSelect?: (tree: Tree) => void;
}

export function TreeMap({ onTreeSelect }: TreeMapProps) {
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [hoveredTree, setHoveredTree] = useState<Tree | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [workOrderDialogOpen, setWorkOrderDialogOpen] = useState(false);
  const [workOrderTreeId, setWorkOrderTreeId] = useState<string | undefined>();
  const [popupInfo, setPopupInfo] = useState<Tree | null>(null);

  // Default map center - Gangnam area, Seoul
  const [viewState, setViewState] = useState({
    longitude: 127.0486,
    latitude: 37.5043,
    zoom: 12,
  });

  const handleTreeClick = useCallback((tree: Tree) => {
    setSelectedTree(tree);
    setProfileModalOpen(true);
    setPopupInfo(null);
    onTreeSelect?.(tree);
  }, [onTreeSelect]);

  const handleMarkerClick = useCallback((tree: Tree, event: any) => {
    event.originalEvent.stopPropagation();
    setPopupInfo(tree);
    handleTreeClick(tree);
  }, [handleTreeClick]);

  const handleCreateWorkOrder = (treeId: string) => {
    setWorkOrderTreeId(treeId);
    setWorkOrderDialogOpen(true);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "bg-destructive hover:bg-destructive/90";
      case "medium":
        return "bg-warning hover:bg-warning/90";
      case "low":
        return "bg-success hover:bg-success/90";
      default:
        return "bg-muted";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-white" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-white" />;
      case "low":
        return <CheckCircle2 className="h-4 w-4 text-white" />;
      default:
        return <TreeDeciduous className="h-4 w-4 text-white" />;
    }
  };


  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TreeDeciduous className="h-5 w-5 text-primary" />
          Interactive Tree Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-border">
          {MAPBOX_TOKEN ? (
            <Map
              {...viewState}
              mapboxAccessToken={MAPBOX_TOKEN}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
            >
              {/* Tree Markers */}
              {mockTrees.map((tree) => (
                <Marker
                  key={tree.id}
                  longitude={tree.position.lng}
                  latitude={tree.position.lat}
                >
                  <button
                    onClick={(e) => handleMarkerClick(tree, e)}
                    onMouseEnter={() => setHoveredTree(tree)}
                    onMouseLeave={() => setHoveredTree(null)}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg",
                      getRiskColor(tree.risk),
                      selectedTree?.id === tree.id && "ring-4 ring-primary ring-offset-2 scale-125",
                      hoveredTree?.id === tree.id && "scale-110 z-10"
                    )}
                  >
                    {getRiskIcon(tree.risk)}
                  </button>
                </Marker>
              ))}

              {/* Popup for tree info */}
              {popupInfo && (
                <Popup
                  longitude={popupInfo.position.lng}
                  latitude={popupInfo.position.lat}
                  anchor="bottom"
                  onClose={() => setPopupInfo(null)}
                  closeOnClick={false}
                >
                  <div className="space-y-1 p-2">
                    <p className="font-semibold text-sm">{popupInfo.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {popupInfo.id}</p>
                    <p className="text-xs text-muted-foreground">Species: {popupInfo.species}</p>
                    <Badge
                      variant={popupInfo.risk === "high" ? "destructive" : popupInfo.risk === "medium" ? "warning" : "success"}
                      className="text-xs"
                    >
                      {popupInfo.risk.toUpperCase()} Risk
                    </Badge>
                  </div>
                </Popup>
              )}
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

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg z-10">
            <p className="text-xs font-semibold mb-2">Risk Levels</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-destructive" />
                <span className="text-xs">High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-warning" />
                <span className="text-xs">Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-success" />
                <span className="text-xs">Low Risk</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <TreeProfileModal
        treeId={selectedTree?.id || null}
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onCreateWorkOrder={handleCreateWorkOrder}
      />

      <WorkOrderDialog
        isOpen={workOrderDialogOpen}
        onClose={() => setWorkOrderDialogOpen(false)}
        treeIds={workOrderTreeId ? [workOrderTreeId] : []}
      />
    </Card>
  );
}