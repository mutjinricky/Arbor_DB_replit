import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, MapPin, TreeDeciduous, Filter, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import Map, { NavigationControl } from "react-map-gl";
import TreeLayer from "@/components/TreeLayer";
import "mapbox-gl/dist/mapbox-gl.css";

interface TreeData {
  id: string;
  diameter: number;
  height: number;
  lat: number;
  lng: number;
  district: string;
  damage_area: number;
  cavity_depth: number;
  ice_damage: boolean;
  need_nutrient: boolean;
  risk: string;
  age: number;
  inspection: string;
  species: string;
}

interface WorkItem {
  treeId: string;
  workTypes: string[];
  remarks: string;
}

interface TreeDetail {
  id: string;
  species: string;
  location: string;
  work: string;
  remarks: string;
  photos: number;
  position: { x: number; y: number };
}

export default function RequestForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const treeIdsParam = searchParams.get("treeIds");
  const selectedTreeIds = treeIdsParam ? treeIdsParam.split(",") : [];
  
  const [selectedTreeOnMap, setSelectedTreeOnMap] = useState<string | null>(null);
  const [workFilter, setWorkFilter] = useState<string>("all");
  const [treesData, setTreesData] = useState<Record<string, TreeData>>({});
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [finalBudget, setFinalBudget] = useState<any>(null);
  const [treeDetails, setTreeDetails] = useState<TreeDetail[]>([]);
  const [treesGeoJson, setTreesGeoJson] = useState<any>(null);
  const [hoveredTree, setHoveredTree] = useState<{
    id: string;
    species: string;
    risk: string;
    position: { x: number; y: number };
  } | null>(null);
  const [mapState, setMapState] = useState({
    longitude: 127.4704,
    latitude: 37.34111,
    zoom: 14
  });
  const [cursor, setCursor] = useState<string>('grab');
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  // Load trees.json and work order data
  useEffect(() => {
    // Load GeoJSON data for map
    fetch('/data/trees.geojson')
      .then(response => response.json())
      .then(data => {
        setTreesGeoJson(data);
      })
      .catch(error => {
        console.error('Error loading trees GeoJSON data:', error);
      });

    // Load trees data
    fetch('/data/trees.json')
      .then(response => response.json())
      .then((data: Record<string, TreeData>) => {
        setTreesData(data);
      })
      .catch(error => {
        console.error('Error loading trees data:', error);
      });

    // Load work order data from sessionStorage
    const storedData = sessionStorage.getItem('workOrderData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setWorkItems(parsed.workItems || []);
        setFinalBudget(parsed.finalBudget);
      } catch (error) {
        console.error('Error parsing work order data:', error);
      }
    }
  }, []);

  // Convert tree data to display format with work items
  useEffect(() => {
    if (Object.keys(treesData).length === 0 || workItems.length === 0) return;

    const details: TreeDetail[] = [];
    
    workItems.forEach((workItem) => {
      const tree = treesData[workItem.treeId];
      if (!tree) return;

      // Generate position based on tree ID for consistency
      const idNum = parseInt(tree.id) || 0;
      const x = 20 + ((idNum * 17) % 60);
      const y = 20 + ((idNum * 23) % 60);

      details.push({
        id: tree.id,
        species: tree.species,
        location: tree.district,
        work: workItem.workTypes.join(", "),
        remarks: workItem.remarks,
        photos: 1, // Default photos
        position: { x, y },
      });
    });

    setTreeDetails(details);
  }, [treesData, workItems]);

  // Calculate map center based on selected trees' GPS coordinates
  useEffect(() => {
    if (isMapInitialized || treeDetails.length === 0) return;

    // Calculate center of all selected trees
    const coords = treeDetails
      .map(detail => {
        const tree = treesData[detail.id];
        return tree ? { lat: tree.lat, lng: tree.lng } : null;
      })
      .filter((coord): coord is { lat: number; lng: number } => coord !== null);

    if (coords.length > 0) {
      const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;

      // Calculate zoom based on spread of trees
      const latRange = Math.max(...coords.map(c => c.lat)) - Math.min(...coords.map(c => c.lat));
      const lngRange = Math.max(...coords.map(c => c.lng)) - Math.min(...coords.map(c => c.lng));
      const maxRange = Math.max(latRange, lngRange);
      
      let zoom = 16;
      if (maxRange > 0.01) zoom = 14;
      else if (maxRange > 0.005) zoom = 15;
      else if (maxRange > 0.002) zoom = 16;
      else if (maxRange > 0.001) zoom = 17;
      else zoom = 18;

      setMapState({
        longitude: avgLng,
        latitude: avgLat,
        zoom: zoom
      });

      setIsMapInitialized(true);
    }
  }, [treeDetails, treesData, isMapInitialized]);

  const filteredTrees = treeDetails.filter(tree => {
    if (workFilter === "all") return true;
    if (workFilter === "pruning") return tree.work.includes("가지치기");
    if (workFilter === "surgery") return tree.work.includes("외과수술");
    if (workFilter === "nutrition") return tree.work.includes("영양공급");
    return tree.work.toLowerCase().includes(workFilter.toLowerCase());
  });

  const workCategories = {
    pruning: treeDetails.filter(t => t.work.includes("가지치기")).length,
    surgery: treeDetails.filter(t => t.work.includes("외과수술")).length,
    nutrition: treeDetails.filter(t => t.work.includes("영양공급")).length,
  };

  const handleTreeClick = (treeId: string) => {
    setSelectedTreeOnMap(selectedTreeOnMap === treeId ? null : treeId);
  };

  const onTreeLayerClick = useCallback((event: any) => {
    if (event.features && event.features.length > 0) {
      const clickedFeature = event.features[0];
      if (clickedFeature.properties && clickedFeature.properties.id) {
        const treeId = clickedFeature.properties.id;
        handleTreeClick(treeId);
      }
    }
  }, [selectedTreeOnMap]);

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
          species: species,
          risk: risk,
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

  // Generate request ID based on current date
  const requestId = `PRJ-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-001`;
  const issueDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/projects")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">의뢰서</h1>
              <p className="text-muted-foreground">상세 작업 지시서 및 견적 요청</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* SECTION 1: Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary">1부:</span> 기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">의뢰 번호</p>
                  <p className="font-mono font-semibold">{requestId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">프로젝트명</p>
                  <p className="font-semibold">자동 생성 의뢰서 - {treeDetails.length}그루</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">의뢰 기관</p>
                  <p className="text-sm">경기도 이천시 공원녹지과</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">담당자</p>
                  <p className="text-sm">김철수 주무관 (02-XXXX-XXXX)</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">발행일</p>
                  <p className="font-medium">{issueDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">견적 마감일</p>
                  <p className="font-medium text-destructive">{deadlineDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: Work Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary">2부:</span> 작업 개요
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">총 대상 수목</p>
                <p className="text-2xl font-bold">{treeDetails.length}그루</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-3">주요 작업 카테고리</p>
                <div className="space-y-2">
                  {workCategories.pruning > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">가지치기</span>
                      <Badge variant="secondary">{workCategories.pruning}그루</Badge>
                    </div>
                  )}
                  {workCategories.surgery > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">외과수술</span>
                      <Badge variant="secondary">{workCategories.surgery} 그루</Badge>
                    </div>
                  )}
                  {workCategories.nutrition > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">영양공급</span>
                      <Badge variant="secondary">{workCategories.nutrition} 그루</Badge>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: Work Target Map */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-primary">3부:</span> 작업 대상 지도
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={workFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWorkFilter("all")}
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    전체
                  </Button>
                  <Button
                    variant={workFilter === "pruning" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWorkFilter("pruning")}
                  >
                    가지치기
                  </Button>
                  <Button
                    variant={workFilter === "surgery" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWorkFilter("surgery")}
                  >
                    외과수술
                  </Button>
                  <Button
                    variant={workFilter === "nutrition" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWorkFilter("nutrition")}
                  >
                    영양공급
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-border">
                {MAPBOX_TOKEN && treesGeoJson ? (
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
                    <TreeLayer 
                      treesData={treesGeoJson} 
                      selectedTreeIds={filteredTrees.map(t => t.id)} 
                    />
                  </Map>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                    <div className="text-center p-4">
                      {!MAPBOX_TOKEN ? (
                        <>
                          <p className="text-lg font-semibold mb-2">Mapbox 토큰 필요</p>
                          <p className="text-sm text-muted-foreground">
                            .env 파일에 VITE_MAPBOX_TOKEN을 설정해주세요
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-semibold mb-2">지도 로딩 중...</p>
                          <p className="text-sm text-muted-foreground">
                            수목 데이터 시각화 준비 중
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Hovered Tree Tooltip */}
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
                      <p className="font-semibold text-sm">수목 ID: {hoveredTree.id}</p>
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

                {/* Selected Tree Info */}
                {selectedTreeOnMap && (
                  <div
                    className="absolute top-4 left-4 bg-card border-2 border-primary rounded-lg shadow-xl p-4 z-20"
                  >
                    <div className="space-y-2">
                      <p className="font-mono font-semibold text-primary">{selectedTreeOnMap}</p>
                      <p className="text-sm font-medium">{filteredTrees.find(t => t.id === selectedTreeOnMap)?.species}</p>
                      <p className="text-xs text-muted-foreground">{filteredTrees.find(t => t.id === selectedTreeOnMap)?.location}</p>
                      <Badge variant="outline" className="text-xs">
                        {filteredTrees.find(t => t.id === selectedTreeOnMap)?.work}
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
                    작업 대상: {filteredTrees.length}그루
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: Detailed Task List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary">4부:</span> 상세 작업 목록
              </CardTitle>
              <p className="text-sm text-muted-foreground">행을 클릭하면 지도에서 해당 수목이 강조됩니다</p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">수목 ID</TableHead>
                      <TableHead>수목 종류</TableHead>
                      <TableHead>상세 위치</TableHead>
                      <TableHead>요청 작업</TableHead>
                      <TableHead>비고</TableHead>
                      <TableHead className="text-center">사진</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrees.length > 0 ? (
                      filteredTrees.map((tree) => (
                        <TableRow 
                          key={tree.id}
                          className={cn(
                            "cursor-pointer hover:bg-accent/50 transition-colors",
                            selectedTreeOnMap === tree.id && "bg-accent"
                          )}
                          onClick={() => handleTreeClick(tree.id)}
                        >
                          <TableCell className="font-mono font-semibold">{tree.id}</TableCell>
                          <TableCell className="font-medium">{tree.species}</TableCell>
                          <TableCell className="text-sm">{tree.location}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {tree.work}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs whitespace-pre-line">
                            {tree.remarks}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Image className="h-4 w-4" />
                              {tree.photos}장
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          작업 항목이 없습니다
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Estimated Quote Range */}
          {finalBudget ? (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle>예산안 상세 내역</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">최종 총액</p>
                  <p className="text-3xl font-bold text-primary">₩{finalBudget.finalTotal.toLocaleString()}</p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">직접 공사비</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">재료비</p>
                        <p className="font-semibold">₩{finalBudget.directMaterials.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">노무비</p>
                        <p className="font-semibold">₩{finalBudget.directLabor.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">경비</p>
                        <p className="font-semibold">₩{finalBudget.directExpenses.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2">합계 (재비용 포함)</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">재료비</p>
                        <p className="font-semibold">₩{finalBudget.totalMaterials.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">노무비</p>
                        <p className="font-semibold">₩{finalBudget.totalLabor.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">경비</p>
                        <p className="font-semibold">₩{finalBudget.totalExpenses.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">소계 (재비용 포함)</span>
                      <span className="font-semibold">₩{finalBudget.subtotalBeforeOverheads.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">일반관리비 (6%)</span>
                      <span className="font-semibold">₩{finalBudget.generalAdmin.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">이윤 (15%)</span>
                      <span className="font-semibold">₩{finalBudget.profit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">부가세 (10%)</span>
                      <span className="font-semibold">₩{finalBudget.vat.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle>예상 견적 범위</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">예산 데이터가 없습니다</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Button variant="outline" size="lg" onClick={() => navigate("/projects")}>
              프로젝트로 돌아가기
            </Button>
            <Button size="lg" className="px-8">
              계약업체에 전송
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
