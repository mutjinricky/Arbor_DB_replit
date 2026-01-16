import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  TreeDeciduous,
  MapPin,
  Ruler,
  Calendar,
  FileText,
  DollarSign,
  AlertTriangle,
  Image as ImageIcon,
  Wrench,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface TreeProfileModalProps {
  treeId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateWorkOrder?: (treeId: string) => void;
}

export function TreeProfileModal({ treeId, isOpen, onClose, onCreateWorkOrder }: TreeProfileModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [historyFilter, setHistoryFilter] = useState<"all" | "management" | "observation">("all");
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Fetch tree data when treeId changes
  useEffect(() => {
    if (treeId && isOpen) {
      setLoading(true);
      setImageError(false); // Reset image error state when tree changes
      fetch('/data/trees.json')
        .then(response => response.json())
        .then((data: Record<string, TreeData>) => {
          // trees.json is an object with tree IDs as keys, not an array
          const tree = data[treeId];
          setTreeData(tree || null);
        })
        .catch(error => {
          console.error('Error loading tree data:', error);
          setTreeData(null);
        })
        .finally(() => setLoading(false));
    } else {
      setTreeData(null);
    }
  }, [treeId, isOpen]);

  if (!treeData || !treeId) return null;

  // Get tree image based on tree id
  // Convert string id to int, calculate modulo 117, then add 1 to get 1-117 range
  const getTreeImagePath = () => {
    const treeIdInt = parseInt(treeId, 10) || 0;
    const imageIndex = (treeIdInt % 117) + 1; // Result is 1-117
    const paddedIndex = imageIndex.toString().padStart(3, '0'); // Format as 001, 002, etc.
    return `/data/tree_images/tree_${paddedIndex}.jpg`;
  };

  // Generate risk reasons based on multiple conditions
  const getRiskReasons = () => {
    const reasons = [];
    if (treeData.ice_damage) {
      reasons.push("설해피해 확인됨");
    }
    if (treeData.damage_area > 0) {
      reasons.push("상처면적 존재");
    }
    if (treeData.need_nutrient) {
      reasons.push("영양공급 필요");
    }
    return reasons.length > 0 ? reasons : undefined;
  };

  // Transform tree data for display
  const tree = {
    id: treeData.id,
    name: `${treeData.species} - 수목 ID: ${treeData.id}`,
    species: treeData.species,
    risk: treeData.risk as "high" | "medium" | "low",
    health: treeData.ice_damage ? "Poor" : treeData.damage_area > 0 ? "Fair" : "Good",
    position: { x: 25, y: 35 },
    height: treeData.height,
    dbh: treeData.diameter,
    gpsCoordinates: `${treeData.lat}, ${treeData.lng}`,
    riskReason: getRiskReasons() as string[] | undefined,
    age: treeData.age,
    lastInspection: treeData.inspection,
  };

  const mockHistory = [
    { date: "2025-07-23", type: "점검", contractor: "GreenScape Ltd.", cost: 150000, notes: "설해 피해 확인", category: "observation" as const },
    { date: "2024-09-15", type: "가지치기", contractor: "Urban Forest Co.", cost: 450000, notes: "정기 유지보수", category: "management" as const },
    { date: "2024-06-20", type: "병해충 탐지", contractor: "Urban Forest Co.", cost: 0, notes: "정기 점검 중 나무좀 증거 발견", category: "observation" as const },
    { date: "2024-03-10", type: "병해충 방제", contractor: "EcoTree Services", cost: 280000, notes: "예방 처리", category: "management" as const },
    { date: "2023-11-05", type: "영양공급", contractor: "GreenScape Ltd.", cost: 180000, notes: "토양 개선", category: "management" as const },
  ];

  const totalCost = mockHistory.reduce((sum, item) => sum + item.cost, 0);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  const getHealthColor = (health: string) => {
    if (health === "Good") return "text-success";
    if (health === "Fair") return "text-warning";
    return "text-destructive";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <TreeDeciduous className="h-6 w-6 text-primary" />
            {tree.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - At-a-Glance */}
          <div className="space-y-4">
            {/* Tree Image */}
            <Card className="overflow-hidden">
              <div className="aspect-square relative overflow-hidden">
                {imageError ? (
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <TreeDeciduous className="h-24 w-24 text-primary/40" />
                  </div>
                ) : (
                  <img
                    src={getTreeImagePath()}
                    alt={`Tree ${tree.id}`}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                )}
              </div>
            </Card>

            {/* Core Data */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">수목 ID</p>
                  <p className="font-mono font-semibold">{tree.id}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">종류</p>
                  <p className="font-medium">{tree.species}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">GPS 좌표</p>
                  <p className="text-sm font-mono">{tree.gpsCoordinates || "37.5172, 127.0473"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Status Block */}
            <Card className={cn(tree.risk === "high" && "border-destructive/30 bg-destructive/5")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">위험도</span>
                  <Badge variant={getRiskColor(tree.risk)}>{tree.risk.toUpperCase()}</Badge>
                </div>
                {(tree.risk === "high" || tree.risk === "medium") && tree.riskReason && (
                  <>
                    <Separator />
                    <div className={cn(
                      "rounded-lg p-3",
                      tree.risk === "high" 
                        ? "bg-destructive/10 border border-destructive/30" 
                        : "bg-warning/10 border border-warning/30"
                    )}>
                      <div className="flex gap-2">
                        <AlertTriangle className={cn(
                          "h-4 w-4 shrink-0 mt-0.5",
                          tree.risk === "high" ? "text-destructive" : "text-warning"
                        )} />
                        <div>
                          <p className={cn(
                            "text-xs font-semibold mb-1",
                            tree.risk === "high" ? "text-destructive" : "text-warning"
                          )}>
                            {tree.risk === "high" ? "높은" : "보통"} 위험도 사유:
                          </p>
                          <div className="text-xs space-y-1">
                            {tree.riskReason.map((reason, index) => (
                              <p key={index} className="flex items-center gap-1">
                                <span className={cn(
                                  "w-1 h-1 rounded-full flex-shrink-0 mt-1.5",
                                  tree.risk === "high" ? "bg-destructive" : "bg-warning"
                                )}></span>
                                {reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Detailed Information */}
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">개요</TabsTrigger>
                <TabsTrigger value="history">이력</TabsTrigger>
                <TabsTrigger value="costs">비용</TabsTrigger>
                <TabsTrigger value="photos">사진</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-primary" />
                      물리적 측정값
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">높이</p>
                        <p className="text-lg font-semibold">{tree.height || 12.5} m</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">가슴높이 직경</p>
                        <p className="text-lg font-semibold">{tree.dbh || 45} cm</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">추가 정보</h3>
                    <div className="space-y-2 text-sm">
                      {tree.age && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">나이:</span>
                          <span className="font-medium">{tree.age}년</span>
                        </div>
                      )}
                      {tree.lastInspection && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">최근 점검:</span>
                          <span className="font-medium">{tree.lastInspection}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        이력
                      </h3>
                    </div>
                    
                    <ToggleGroup
                      type="single"
                      value={historyFilter}
                      onValueChange={(value) => value && setHistoryFilter(value as typeof historyFilter)}
                      className="justify-start mb-4"
                    >
                      <ToggleGroupItem value="all" aria-label="모든 이력 보기">
                        전체
                      </ToggleGroupItem>
                      <ToggleGroupItem value="management" aria-label="관리 이력 보기">
                        관리 이력
                      </ToggleGroupItem>
                      <ToggleGroupItem value="observation" aria-label="관찰 이력 보기">
                        관찰 이력
                      </ToggleGroupItem>
                    </ToggleGroup>

                    <div className="space-y-4">
                      {mockHistory
                        .filter((entry) => {
                          if (historyFilter === "all") return true;
                          return entry.category === historyFilter;
                        })
                        .map((entry, index) => (
                          <div
                            key={index}
                            className="border-l-2 border-primary pl-4 pb-4 last:pb-0 hover:bg-muted/50 -ml-4 pl-6 rounded-r transition-colors"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  {historyFilter === "all" && (
                                    <Badge variant={entry.category === "management" ? "default" : "secondary"} className="text-xs">
                                      {entry.category === "management" ? "관리" : "관찰"}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    {entry.category === "management" ? (
                                      <Wrench className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                    {entry.type}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium">{entry.contractor}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {entry.date}
                                </p>
                                {entry.cost > 0 && (
                                  <p className="text-sm font-semibold mt-1">₩{entry.cost.toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{entry.notes}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="costs" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-primary" />
                          <span className="font-semibold">총 생애 비용</span>
                        </div>
                        <span className="text-2xl font-bold text-primary">₩{totalCost.toLocaleString()}</span>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">유형별 비용 분석</h3>
                        <div className="space-y-3">
                          {["가지치기", "병해충 방제", "영양공급", "점검"].map((type) => {
                            const typeMap: Record<string, string[]> = {
                              "가지치기": ["가지치기", "Pruning"],
                              "병해충 방제": ["병해충 방제", "Pest Control"],
                              "영양공급": ["영양공급", "Nutrition"],
                              "점검": ["점검", "Inspection", "Pest Detection"],
                            };
                            const matchingTypes = typeMap[type] || [type];
                            const typeCost = mockHistory
                              .filter((h) => matchingTypes.includes(h.type))
                              .reduce((sum, h) => sum + h.cost, 0);
                            const percentage = totalCost > 0 ? (typeCost / totalCost) * 100 : 0;

                            return (
                              <div key={type}>
                                <div className="flex items-center justify-between mb-1 text-sm">
                                  <span className="font-medium">{type}</span>
                                  <span className="text-muted-foreground">
                                    ₩{typeCost.toLocaleString()} ({percentage.toFixed(0)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">연평균 비용</p>
                          <p className="text-lg font-semibold">₩{Math.round(totalCost / 15).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">총 개입 횟수</p>
                          <p className="text-lg font-semibold">{mockHistory.length}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="aspect-square bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center hover:opacity-75 transition-opacity cursor-pointer"
                        >
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      점검 및 유지보수 작업 사진
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
