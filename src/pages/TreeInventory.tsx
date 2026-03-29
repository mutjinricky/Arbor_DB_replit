import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { Map as MapIcon, List, TreeDeciduous, Search, X, SlidersHorizontal, Bug, Sprout, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TreeProfileModal } from "@/components/TreeProfileModal";
import { WorkOrderDialog } from "@/components/WorkOrderDialog";
import TreeLayer from "@/components/TreeLayer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Map, { NavigationControl } from "react-map-gl";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import {
  calculateIQTRI,
  calculatePestControl,
  calculateSoilScore,
  IQTRI_COLORS,
  IQTRI_LABELS,
  PEST_COLORS,
  PEST_LABELS,
  SOIL_COLORS,
  SOIL_LABELS,
  type RiskGrade,
  type PestGrade,
  type SoilGrade,
  type TreeFullData,
} from "@/lib/riskCalculations";
import { useWeatherData } from "@/hooks/useWeatherData";

type MapMode = "risk" | "pest" | "soil";

interface EnrichedTreeData {
  id: string;
  height: number;
  lat: number;
  lng: number;
  district: string;
  risk: string;
  inspection: string;
  species: string;
  iqtriScore: number;
  iqtriGrade: RiskGrade;
  pestGrade: PestGrade;
  pestName: string;
  pestDays: number;
  soilScore: number;
  soilGrade: SoilGrade;
}

const ALL_VALUE = "__all__";

export default function TreeInventory() {
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [workOrderDialogOpen, setWorkOrderDialogOpen] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("risk");
  const [mapState, setMapState] = useState({
    longitude: 127.4704,
    latitude: 37.34111,
    zoom: 14,
  });
  const [rawGeoJson, setRawGeoJson] = useState<any>(null);
  const [rawTreesJson, setRawTreesJson] = useState<Record<string, TreeFullData> | null>(null);
  const { pestDDs, isRealData: weatherIsReal, isLoading: weatherLoading } = useWeatherData();
  const [cursor, setCursor] = useState<string>("grab");
  const [hoveredTree, setHoveredTree] = useState<{
    id: string;
    species: string;
    iqtriScore: number;
    iqtriGrade: RiskGrade;
    pestGrade: PestGrade;
    pestName: string;
    soilGrade: SoilGrade;
    position: { x: number; y: number };
  } | null>(null);

  const [searchId, setSearchId] = useState("");
  const [filterSpecies, setFilterSpecies] = useState(ALL_VALUE);
  const [filterRiskGrade, setFilterRiskGrade] = useState(ALL_VALUE);
  const [filterPestGrade, setFilterPestGrade] = useState(ALL_VALUE);
  const [filterSoilGrade, setFilterSoilGrade] = useState(ALL_VALUE);
  const [showFilters, setShowFilters] = useState(false);

  const mapRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/trees.geojson").then((r) => r.json()),
      fetch("/data/trees.json").then((r) => r.json()),
    ])
      .then(([geojson, treesJson]: [any, Record<string, TreeFullData>]) => {
        setRawGeoJson(geojson);
        setRawTreesJson(treesJson);
      })
      .catch((err) => console.error("Error loading tree data:", err));
  }, []);

  const enrichedGeoJson = useMemo(() => {
    if (!rawGeoJson || !rawTreesJson) return null;
    const enrichedFeatures = rawGeoJson.features.map((feature: any) => {
      const props = feature.properties || {};
      const id = props.id || "";
      const fullData = rawTreesJson[id];

      const iqtri = fullData
        ? calculateIQTRI(fullData)
        : { score: 0, grade: "low" as RiskGrade };
      const pest = calculatePestControl(id, pestDDs as any);
      const soil = calculateSoilScore(id, fullData);

      return {
        ...feature,
        properties: {
          ...props,
          iqtriScore: iqtri.score,
          iqtriGrade: iqtri.grade,
          pestGrade: pest.grade,
          pestName: pest.pestName,
          pestDays: pest.daysUntilControl,
          soilScore: soil.score,
          soilGrade: soil.grade,
        },
      };
    });
    return { ...rawGeoJson, features: enrichedFeatures };
  }, [rawGeoJson, rawTreesJson, pestDDs]);

  const treesListData = useMemo<EnrichedTreeData[]>(() => {
    if (!enrichedGeoJson) return [];
    return enrichedGeoJson.features
      .filter((f: any) => f.properties && f.geometry)
      .map((f: any) => {
        const p = f.properties;
        const coords = f.geometry.coordinates || [0, 0];
        return {
          id: p.id || "",
          height: p.height || 0,
          lat: coords[1] || 0,
          lng: coords[0] || 0,
          district: p.district || "",
          risk: p.risk || "low",
          inspection: p.inspection || "",
          species: p.species || "",
          iqtriScore: p.iqtriScore,
          iqtriGrade: p.iqtriGrade,
          pestGrade: p.pestGrade,
          pestName: p.pestName,
          pestDays: p.pestDays,
          soilScore: p.soilScore,
          soilGrade: p.soilGrade,
        };
      });
  }, [enrichedGeoJson]);

  const allSpecies = useMemo(() => {
    const s = new Set(treesListData.map((t) => t.species).filter(Boolean));
    return Array.from(s).sort();
  }, [treesListData]);

  const filteredTrees = useMemo(() => {
    return treesListData.filter((t) => {
      if (searchId.trim() && t.id !== searchId.trim()) return false;
      if (filterSpecies !== ALL_VALUE && t.species !== filterSpecies) return false;
      if (filterRiskGrade !== ALL_VALUE && t.iqtriGrade !== filterRiskGrade) return false;
      if (filterPestGrade !== ALL_VALUE && t.pestGrade !== filterPestGrade) return false;
      if (filterSoilGrade !== ALL_VALUE && t.soilGrade !== filterSoilGrade) return false;
      return true;
    });
  }, [treesListData, searchId, filterSpecies, filterRiskGrade, filterPestGrade, filterSoilGrade]);

  const filteredIds = useMemo(() => {
    const hasFilter =
      searchId.trim() ||
      filterSpecies !== ALL_VALUE ||
      filterRiskGrade !== ALL_VALUE ||
      filterPestGrade !== ALL_VALUE ||
      filterSoilGrade !== ALL_VALUE;
    return hasFilter ? filteredTrees.map((t) => t.id) : null;
  }, [filteredTrees, searchId, filterSpecies, filterRiskGrade, filterPestGrade, filterSoilGrade]);

  const handleSearchAndZoom = useCallback(() => {
    const id = searchId.trim();
    if (!id || !enrichedGeoJson) return;
    const feature = enrichedGeoJson.features.find(
      (f: any) => f.properties?.id === id
    );
    if (feature && feature.geometry?.coordinates) {
      const [lng, lat] = feature.geometry.coordinates;
      setMapState({ longitude: lng, latitude: lat, zoom: 19 });
    }
  }, [searchId, enrichedGeoJson]);

  const handleTreeClick = useCallback((treeId: string) => {
    setSelectedTreeId(treeId);
    setProfileModalOpen(true);
  }, []);

  const handleAddToProject = useCallback(() => {
    setWorkOrderDialogOpen(true);
    setProfileModalOpen(false);
  }, []);

  const onTreeLayerClick = useCallback(
    (event: any) => {
      if (event.features && event.features.length > 0) {
        const feat = event.features[0];
        const id = feat.properties?.id;
        if (id) handleTreeClick(id);
      }
    },
    [handleTreeClick]
  );

  const onTreeLayerHover = useCallback(
    (event: any) => {
      if (event.features && event.features.length > 0) {
        const feat = event.features[0];
        const p = feat.properties || {};
        const x = event.point.x;
        const y = event.point.y;
        const rect = event.target.getContainer().getBoundingClientRect();
        setCursor("pointer");
        setHoveredTree({
          id: p.id || "",
          species: p.species || "",
          iqtriScore: p.iqtriScore || 0,
          iqtriGrade: (p.iqtriGrade || "low") as RiskGrade,
          pestGrade: (p.pestGrade || "safe") as PestGrade,
          pestName: p.pestName || "",
          soilGrade: (p.soilGrade || "C") as SoilGrade,
          position: { x: (x / rect.width) * 100, y: (y / rect.height) * 100 },
        });
      } else {
        setCursor("grab");
        setHoveredTree(null);
      }
    },
    []
  );

  const onTreeLayerLeave = useCallback(() => {
    setHoveredTree(null);
    setCursor("grab");
  }, []);

  const clearFilters = () => {
    setSearchId("");
    setFilterSpecies(ALL_VALUE);
    setFilterRiskGrade(ALL_VALUE);
    setFilterPestGrade(ALL_VALUE);
    setFilterSoilGrade(ALL_VALUE);
  };

  const hasActiveFilters =
    searchId.trim() ||
    filterSpecies !== ALL_VALUE ||
    filterRiskGrade !== ALL_VALUE ||
    filterPestGrade !== ALL_VALUE ||
    filterSoilGrade !== ALL_VALUE;

  const getRiskBadgeVariant = (risk: string): "default" | "secondary" | "destructive" | "warning" | "success" => {
    if (risk === "low") return "success";
    if (risk === "medium") return "warning";
    return "destructive";
  };

  const getLegend = () => {
    if (mapMode === "pest") {
      return Object.entries(PEST_LABELS).map(([grade, label]) => ({
        color: PEST_COLORS[grade as PestGrade],
        label,
      }));
    }
    if (mapMode === "soil") {
      return Object.entries(SOIL_LABELS).map(([grade, label]) => ({
        color: SOIL_COLORS[grade as SoilGrade],
        label,
      }));
    }
    return Object.entries(IQTRI_LABELS).map(([grade, label]) => ({
      color: IQTRI_COLORS[grade as RiskGrade],
      label,
    }));
  };

  const mapModeConfig = {
    risk: { icon: ShieldAlert, label: "수목 위험도" },
    pest: { icon: Bug, label: "해충 방제" },
    soil: { icon: Sprout, label: "토양" },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">수목 재고 관리</h1>
            <p className="text-muted-foreground">
              시스템의 모든 수목을 관리하고 조회합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("map")}
              className="gap-2"
              data-testid="button-map-view"
            >
              <MapIcon className="h-4 w-4" />
              지도 보기
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("list")}
              className="gap-2"
              data-testid="button-list-view"
            >
              <List className="h-4 w-4" />
              목록 보기
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Tree ID Search */}
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="수목 ID 검색 (예: 1349)"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchAndZoom()}
                    className="pl-9"
                    data-testid="input-tree-search"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSearchAndZoom}
                  data-testid="button-search-zoom"
                >
                  지도 이동
                </Button>
              </div>

              {/* Filter toggle */}
              <Button
                size="sm"
                variant={showFilters ? "default" : "outline"}
                className="gap-2"
                onClick={() => setShowFilters((v) => !v)}
                data-testid="button-toggle-filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                필터
                {hasActiveFilters && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    !
                  </Badge>
                )}
              </Button>

              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-muted-foreground"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-3 w-3" />
                  초기화
                </Button>
              )}

              <span className="text-sm text-muted-foreground ml-auto">
                {filteredIds !== null
                  ? `${filteredTrees.length}/${treesListData.length}그루`
                  : `총 ${treesListData.length}그루`}
              </span>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">수종</p>
                  <Select value={filterSpecies} onValueChange={setFilterSpecies}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-species">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>전체</SelectItem>
                      {allSpecies.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">위험 등급 (IQTRI)</p>
                  <Select value={filterRiskGrade} onValueChange={setFilterRiskGrade}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-risk-grade">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>전체</SelectItem>
                      <SelectItem value="extreme">극심</SelectItem>
                      <SelectItem value="high">고위험</SelectItem>
                      <SelectItem value="moderate">보통</SelectItem>
                      <SelectItem value="low">저위험</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">해충 방제</p>
                  <Select value={filterPestGrade} onValueChange={setFilterPestGrade}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-pest-grade">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>전체</SelectItem>
                      <SelectItem value="danger">위험 (60일 미만)</SelectItem>
                      <SelectItem value="warning">주의 (60~90일)</SelectItem>
                      <SelectItem value="safe">안전 (90일+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">토양 등급</p>
                  <Select value={filterSoilGrade} onValueChange={setFilterSoilGrade}>
                    <SelectTrigger className="h-8 text-sm" data-testid="select-soil-grade">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>전체</SelectItem>
                      {(["A", "B", "C", "D", "E"] as SoilGrade[]).map((g) => (
                        <SelectItem key={g} value={g}>{SOIL_LABELS[g]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {view === "map" ? (
          <Card className="col-span-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2">
                  <TreeDeciduous className="h-5 w-5 text-primary" />
                  인터랙티브 수목 지도
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* Map Mode Selector */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    {(Object.entries(mapModeConfig) as [MapMode, typeof mapModeConfig.risk][]).map(
                      ([mode, cfg]) => {
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={mode}
                            onClick={() => setMapMode(mode)}
                            data-testid={`button-map-mode-${mode}`}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                              mapMode === mode
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </button>
                        );
                      }
                    )}
                  </div>
                  {/* 기상 데이터 상태 */}
                  <span
                    data-testid="status-weather-source"
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      weatherLoading
                        ? "bg-muted text-muted-foreground"
                        : weatherIsReal
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                    }`}
                  >
                    {weatherLoading ? "기상 로딩 중…" : weatherIsReal ? "기상청 실측 ●" : "평년값 시뮬레이션"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-border">
                {MAPBOX_TOKEN ? (
                  <Map
                    {...mapState}
                    onMove={(evt) => setMapState(evt.viewState)}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    interactiveLayerIds={["trees-point"]}
                    onClick={onTreeLayerClick}
                    onMouseMove={onTreeLayerHover}
                    onMouseLeave={onTreeLayerLeave}
                    cursor={cursor}
                  >
                    <NavigationControl position="top-right" />
                    {enrichedGeoJson && (
                      <TreeLayer
                        treesData={enrichedGeoJson}
                        selectedTreeIds={selectedTreeId ? [selectedTreeId] : []}
                        mapMode={mapMode}
                        filteredIds={filteredIds}
                      />
                    )}
                  </Map>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30">
                    <MapIcon className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      .env 파일에 VITE_MAPBOX_TOKEN을 설정해주세요
                    </p>
                  </div>
                )}

                {/* Hover tooltip */}
                {hoveredTree && (
                  <div
                    className="absolute z-20 bg-card border border-border rounded-lg shadow-xl p-3 pointer-events-none min-w-[200px]"
                    style={{
                      left: `${hoveredTree.position.x}%`,
                      top: `${hoveredTree.position.y}%`,
                      transform: "translate(-50%, -120%)",
                    }}
                  >
                    <p className="font-semibold text-sm mb-1">
                      {hoveredTree.species} – Tree ID: {hoveredTree.id}
                    </p>
                    {mapMode === "risk" && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          IQTRI: {hoveredTree.iqtriScore}점
                        </p>
                        <Badge
                          className="mt-1 text-xs text-white"
                          style={{ backgroundColor: IQTRI_COLORS[hoveredTree.iqtriGrade] }}
                        >
                          {IQTRI_LABELS[hoveredTree.iqtriGrade]}
                        </Badge>
                      </>
                    )}
                    {mapMode === "pest" && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          방제 타겟: {hoveredTree.pestName}
                        </p>
                        <Badge
                          className="mt-1 text-xs text-white"
                          style={{ backgroundColor: PEST_COLORS[hoveredTree.pestGrade] }}
                        >
                          {PEST_LABELS[hoveredTree.pestGrade]}
                        </Badge>
                      </>
                    )}
                    {mapMode === "soil" && (
                      <Badge
                        className="mt-1 text-xs text-white"
                        style={{ backgroundColor: SOIL_COLORS[hoveredTree.soilGrade] }}
                      >
                        토양 {hoveredTree.soilGrade}등급 – {SOIL_LABELS[hoveredTree.soilGrade]}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg z-10">
                  <p className="text-xs font-semibold mb-2">
                    {mapModeConfig[mapMode].label} 등급
                  </p>
                  <div className="space-y-1.5">
                    {getLegend().map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {filteredIds !== null && filteredIds.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg text-center">
                      <p className="font-medium text-sm">조건에 맞는 나무 없음</p>
                      <p className="text-xs text-muted-foreground mt-1">필터 조건을 변경해보세요</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">수목 목록</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTrees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TreeDeciduous className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>조건에 맞는 나무가 없습니다.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>수목 ID</TableHead>
                      <TableHead>종류</TableHead>
                      <TableHead>지역</TableHead>
                      <TableHead>높이 (m)</TableHead>
                      <TableHead>IQTRI 위험도</TableHead>
                      <TableHead>해충 방제</TableHead>
                      <TableHead>토양</TableHead>
                      <TableHead>최근 점검일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrees.map((tree) => (
                      <TableRow
                        key={tree.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => handleTreeClick(tree.id)}
                        data-testid={`row-tree-${tree.id}`}
                      >
                        <TableCell className="font-mono">{tree.id}</TableCell>
                        <TableCell>{tree.species}</TableCell>
                        <TableCell>{tree.district}</TableCell>
                        <TableCell>{tree.height}</TableCell>
                        <TableCell>
                          <Badge
                            className="text-xs text-white"
                            style={{ backgroundColor: IQTRI_COLORS[tree.iqtriGrade] }}
                          >
                            {IQTRI_LABELS[tree.iqtriGrade]} ({tree.iqtriScore})
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className="text-xs text-white"
                            style={{ backgroundColor: PEST_COLORS[tree.pestGrade] }}
                          >
                            {tree.pestDays}일
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className="text-xs text-white"
                            style={{ backgroundColor: SOIL_COLORS[tree.soilGrade] }}
                          >
                            {tree.soilGrade}등급
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{tree.inspection}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
