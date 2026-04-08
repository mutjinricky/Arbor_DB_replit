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
  MessageSquareWarning,
  Pencil,
  Save,
  RotateCcw,
  ShieldAlert,
  Leaf,
  Target,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Plus,
  X,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getComplaintCount,
  calculateIQTRI,
  calculateSoilScore,
  calculateSoilCauses,
  IQTRI_COLORS,
  IQTRI_LABELS,
  SOIL_COLORS,
  SOIL_LABELS,
} from "@/lib/riskCalculations";
import { CauseChips } from "@/components/CauseChips";

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

interface EditOverride {
  height?: number;
  diameter?: number;
  damage_area?: number;
  cavity_depth?: number;
  ice_damage?: boolean;
  need_nutrient?: boolean;
}

const OVERRIDE_KEY = (id: string) => `tree_override_${id}`;
const TAGS_KEY     = (id: string) => `tree_tags_${id}`;

export function TreeProfileModal({ treeId, isOpen, onClose, onCreateWorkOrder }: TreeProfileModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [historyFilter, setHistoryFilter] = useState<"all" | "management" | "observation">("all");
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Edit form state
  const [editValues, setEditValues] = useState<EditOverride>({});
  const [editSaved, setEditSaved] = useState(false);

  // Custom tag state
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);
  const [editingTagText, setEditingTagText] = useState("");

  // Fetch tree data when treeId changes
  useEffect(() => {
    if (treeId && isOpen) {
      setLoading(true);
      setImageError(false);
      setEditSaved(false);
      setTagInput("");
      setEditingTagIdx(null);
      setEditingTagText("");
      fetch('/data/trees.json')
        .then(response => response.json())
        .then((data: Record<string, TreeData>) => {
          const tree = data[treeId];
          setTreeData(tree || null);
          // Load existing overrides from localStorage
          try {
            const stored = localStorage.getItem(OVERRIDE_KEY(treeId));
            setEditValues(stored ? JSON.parse(stored) : {});
          } catch {
            setEditValues({});
          }
          // Load custom tags — auto-convert ice_damage / need_nutrient if no tags stored yet
          try {
            const storedTags = localStorage.getItem(TAGS_KEY(treeId));
            if (storedTags) {
              setCustomTags(JSON.parse(storedTags));
            } else {
              const autoTags: string[] = [];
              if (tree?.ice_damage)    autoTags.push("설해 피해");
              if (tree?.need_nutrient) autoTags.push("영양공급 필요");
              setCustomTags(autoTags);
              if (autoTags.length > 0) {
                localStorage.setItem(TAGS_KEY(treeId), JSON.stringify(autoTags));
              }
            }
          } catch {
            setCustomTags([]);
          }
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

  // Merge edit overrides into tree data for risk calculations
  const treeFullData = {
    ...treeData,
    height:       editValues.height       ?? treeData.height,
    diameter:     editValues.diameter     ?? treeData.diameter,
    damage_area:  editValues.damage_area  ?? treeData.damage_area,
    cavity_depth: editValues.cavity_depth ?? treeData.cavity_depth,
    ice_damage:   editValues.ice_damage   ?? treeData.ice_damage,
    need_nutrient: editValues.need_nutrient ?? treeData.need_nutrient,
  };
  const iqtri = calculateIQTRI(treeFullData);
  const soil  = calculateSoilScore(treeId, treeFullData);

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
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="overview">개요</TabsTrigger>
                <TabsTrigger value="risk" data-testid="tab-risk" className="flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />위험성
                </TabsTrigger>
                <TabsTrigger value="history">이력</TabsTrigger>
                <TabsTrigger value="complaints" className="relative">
                  민원
                  {getComplaintCount(treeId) > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {getComplaintCount(treeId)}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="costs">비용</TabsTrigger>
                <TabsTrigger value="photos">사진</TabsTrigger>
                <TabsTrigger value="edit" data-testid="tab-edit">
                  <Pencil className="h-3.5 w-3.5 mr-1" />편집
                </TabsTrigger>
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

              {/* ─── 위험성 기준 탭 ─────────────────────────────────── */}
              <TabsContent value="risk" className="space-y-4 mt-4">

                {/* IQTRI 총점 헤더 */}
                <div
                  className="rounded-xl px-5 py-4 flex items-center justify-between"
                  style={{ backgroundColor: IQTRI_COLORS[iqtri.grade] + "18", border: `1.5px solid ${IQTRI_COLORS[iqtri.grade]}40` }}
                >
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">IQTRI 위험성 지수 (D × T × I)</p>
                    <p className="text-3xl font-bold" style={{ color: IQTRI_COLORS[iqtri.grade] }}>{iqtri.score}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: IQTRI_COLORS[iqtri.grade] }}
                    >
                      {IQTRI_LABELS[iqtri.grade]}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {iqtri.grade === "extreme" ? "즉시 조치 필요" :
                       iqtri.grade === "high"    ? "우선 점검 대상" :
                       iqtri.grade === "moderate"? "정기 모니터링" : "정상 관리"}
                    </p>
                  </div>
                </div>

                {/* D × T × I 세부 카드 */}
                <div className="grid grid-cols-3 gap-3">
                  {/* D — 결함 지수 */}
                  <Card className="border-amber-200 dark:border-amber-900">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">D — 결함</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-600">{iqtri.D.toFixed(1)}</p>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">기본 위험등급</span>
                          <span className="font-medium">
                            {treeFullData.risk === "high" ? "HIGH (5.0)" : treeFullData.risk === "medium" ? "MEDIUM (1.0)" : "LOW (0.1)"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          {treeFullData.damage_area > 0
                            ? <CheckCircle2 className="h-3 w-3 text-orange-500 flex-shrink-0" />
                            : <XCircle      className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
                          <span className={cn("flex-1 ml-1", treeFullData.damage_area > 0 ? "text-orange-600" : "text-muted-foreground/60")}>
                            상처면적 ×1.5
                          </span>
                          <span className="text-muted-foreground">{treeFullData.damage_area} cm²</span>
                        </div>
                        <div className="flex items-center justify-between">
                          {treeFullData.ice_damage
                            ? <CheckCircle2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            : <XCircle      className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
                          <span className={cn("flex-1 ml-1", treeFullData.ice_damage ? "text-blue-600" : "text-muted-foreground/60")}>
                            설해피해 ×1.2
                          </span>
                          <span className="text-muted-foreground">{treeFullData.ice_damage ? "있음" : "없음"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          {treeFullData.cavity_depth > 5
                            ? <CheckCircle2 className="h-3 w-3 text-red-500 flex-shrink-0" />
                            : <XCircle      className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
                          <span className={cn("flex-1 ml-1", treeFullData.cavity_depth > 5 ? "text-red-600" : "text-muted-foreground/60")}>
                            공동깊이 ×1.3
                          </span>
                          <span className="text-muted-foreground">{treeFullData.cavity_depth} cm</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* T — 대상 지수 */}
                  <Card className="border-blue-200 dark:border-blue-900">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">T — 대상</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{iqtri.T}</p>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">위치 유형</span>
                        </div>
                        <p className="font-medium text-blue-800 dark:text-blue-300 truncate">{treeFullData.district || "공원·산책로"}</p>
                        <Separator className="my-1" />
                        {[
                          { label: "주거·아파트", val: 40 },
                          { label: "간선·대로·학교", val: 25 },
                          { label: "공원·산책로", val: 15 },
                        ].map(row => (
                          <div key={row.label} className="flex items-center justify-between">
                            <span className={cn(iqtri.T === row.val ? "font-semibold text-blue-700 dark:text-blue-300" : "text-muted-foreground/60")}>
                              {iqtri.T === row.val && <ChevronRight className="inline h-3 w-3 mr-0.5" />}
                              {row.label}
                            </span>
                            <span className={cn("font-mono", iqtri.T === row.val ? "font-bold text-blue-600" : "text-muted-foreground/50")}>{row.val}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* I — 충격 지수 */}
                  <Card className="border-purple-200 dark:border-purple-900">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-purple-500" />
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">I — 충격</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{iqtri.I}</p>
                      <div className="space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">흉고직경</span>
                          <span className="font-medium">{treeFullData.diameter} cm ({treeFullData.diameter * 10} mm)</span>
                        </div>
                        <Separator className="my-1" />
                        {[
                          { label: ">750 mm", val: 10 },
                          { label: "350~750 mm", val: 6 },
                          { label: "100~350 mm", val: 4 },
                          { label: "<100 mm", val: 1 },
                        ].map(row => (
                          <div key={row.label} className="flex items-center justify-between">
                            <span className={cn(iqtri.I === row.val ? "font-semibold text-purple-700 dark:text-purple-300" : "text-muted-foreground/60")}>
                              {iqtri.I === row.val && <ChevronRight className="inline h-3 w-3 mr-0.5" />}
                              {row.label}
                            </span>
                            <span className={cn("font-mono", iqtri.I === row.val ? "font-bold text-purple-600" : "text-muted-foreground/50")}>{row.val}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 수식 시각화 */}
                <div className="flex items-center justify-center gap-3 py-2 bg-muted/40 rounded-lg text-sm font-mono">
                  <span className="text-amber-600 font-bold">D {iqtri.D.toFixed(1)}</span>
                  <span className="text-muted-foreground">×</span>
                  <span className="text-blue-600 font-bold">T {iqtri.T}</span>
                  <span className="text-muted-foreground">×</span>
                  <span className="text-purple-600 font-bold">I {iqtri.I}</span>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-bold text-base" style={{ color: IQTRI_COLORS[iqtri.grade] }}>
                    {iqtri.score}점
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-white text-xs font-bold"
                    style={{ backgroundColor: IQTRI_COLORS[iqtri.grade] }}
                  >
                    {IQTRI_LABELS[iqtri.grade]}
                  </span>
                </div>

                {/* 등급 기준표 */}
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">IQTRI 등급 기준</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { grade: "low",      label: "저위험",  range: "0~39",  color: "#22c55e" },
                        { grade: "moderate", label: "보통",    range: "40~99", color: "#eab308" },
                        { grade: "high",     label: "고위험",  range: "100~399", color: "#f97316" },
                        { grade: "extreme",  label: "극심",    range: "400+",  color: "#dc2626" },
                      ].map(g => (
                        <div
                          key={g.grade}
                          className={cn(
                            "rounded-lg px-2 py-1.5 text-center text-[11px]",
                            iqtri.grade === g.grade ? "ring-2 ring-offset-1" : "opacity-50"
                          )}
                          style={{
                            backgroundColor: g.color + "18",
                            border: `1px solid ${g.color}50`,
                            ringColor: g.color,
                          }}
                        >
                          <p className="font-bold" style={{ color: g.color }}>{g.label}</p>
                          <p className="text-muted-foreground mt-0.5">{g.range}점</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* K-UTSI 토양 건전성 */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2 text-sm">
                        <Leaf className="h-4 w-4 text-green-600" />
                        K-UTSI 토양 건전성 지수
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold" style={{ color: SOIL_COLORS[soil.grade] }}>{soil.score}점</span>
                        <span
                          className="px-2 py-0.5 rounded text-white text-xs font-bold"
                          style={{ backgroundColor: SOIL_COLORS[soil.grade] }}
                        >
                          {soil.grade}등급
                        </span>
                      </div>
                    </div>

                    {/* 6개 항목 개별 바 — 30점 만점 */}
                    <div className="space-y-2">
                      {(
                        [
                          { key: "h",   label: "토양 경도",       desc: "21mm 미만=5 / 24-27mm=3 / 27-30mm=1 / ≥30mm=0", color: "#3b82f6" },
                          { key: "tex", label: "토성",             desc: "양토=5 / 사양토=3 / 사토·식토=1 / 자갈=0",       color: "#06b6d4" },
                          { key: "som", label: "유기물 함량",      desc: "≥5%=5 / 3-4%=3 / 1-2%=1 / <1%=0",              color: "#22c55e" },
                          { key: "ph",  label: "토양 산도 (pH)",   desc: "6.0-6.5=5 / 5.0-7.5=3 / 4.5-8.0=1 / 극단=0",   color: "#a3e635" },
                          { key: "ec",  label: "전기전도도 (EC)",  desc: "<0.2 dS/m=5 / 0.6-1.0=3 / 1.3-1.5=1 / ≥1.5=0", color: "#f59e0b" },
                          { key: "cec", label: "양이온치환용량",   desc: "≥10 me/100g=5 / 6-10=3 / 3-6=1 / <3=0",         color: "#8b5cf6" },
                        ] as const
                      ).map((cat) => {
                        const val = soil.breakdown[cat.key];
                        const pct = Math.round((val / 5) * 100);
                        return (
                          <div key={cat.key}>
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="font-medium">{cat.label}</span>
                              <span className="text-muted-foreground">{val} / 5점 ({pct}%)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: cat.color }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{cat.desc}</p>
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-muted-foreground border-t pt-1.5">
                        K-UTSI = (합계 / 30점) × 100 = {soil.score}점
                      </p>
                    </div>

                    {/* 6개 항목 개별 플래그 */}
                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground">세부 항목 점수</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {(() => {
                        const bd = soil.breakdown;
                        const d  = treeFullData.district || "";
                        const isRoad   = d.includes("도로") || d.includes("대로");
                        const isArtery = d.includes("대로");
                        return [
                          { label: "토양 경도",      score: bd.h,
                            note: bd.h === 5 ? "21mm 미만 (양호)" : bd.h === 3 ? "24~27mm" : bd.h === 1 ? "27~30mm" : "30mm 이상 (불량)" },
                          { label: "토성",           score: bd.tex,
                            note: bd.tex === 5 ? "양토" : bd.tex === 3 ? "사양토" : bd.tex === 1 ? "사토·식토" : "자갈·폐기물" },
                          { label: "유기물 함량",    score: bd.som,
                            note: bd.som === 5 ? "≥5% (풍부)" : bd.som === 3 ? "3~4%" : bd.som === 1 ? "1~2%" : "<1% (부족)" },
                          { label: "토양 산도 (pH)", score: bd.ph,
                            note: bd.ph === 5 ? "6.0~6.5 (적정)" : bd.ph === 3 ? "5.0~7.5" : bd.ph === 1 ? "4.5~8.0" : "극단 pH" },
                          { label: "전기전도도 (EC)", score: bd.ec,
                            note: isArtery ? "≥1.3 dS/m (염류 과다)" : isRoad ? "0.6~1.0 dS/m" : "<0.2 dS/m (양호)" },
                          { label: "양이온치환용량",  score: bd.cec,
                            note: bd.cec === 5 ? "≥10 me/100g" : bd.cec === 3 ? "6~10 me/100g" : bd.cec === 1 ? "3~6 me/100g" : "<3 me/100g" },
                        ];
                      })().map((item) => (
                        <div key={item.label} className="flex items-start gap-1.5 py-1 px-2 rounded bg-muted/30">
                          {item.score >= 5
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            : item.score >= 3
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              : <XCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-medium leading-tight truncate">{item.label}</p>
                            <p className={cn("leading-tight", item.score >= 5 ? "text-muted-foreground" : item.score >= 3 ? "text-yellow-600" : "text-orange-600")}>
                              {item.note} <span className="font-semibold">({item.score}점)</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 원인 칩 */}
                    {(() => {
                      const chips = calculateSoilCauses(treeFullData);
                      return chips.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">원인 분류</p>
                          <CauseChips chips={chips} size="md" />
                        </div>
                      ) : null;
                    })()}

                    {/* K-UTSI 등급 기준 */}
                    <Separator />
                    <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                      {(["A","B","C","D","E"] as const).map(g => (
                        <div
                          key={g}
                          className={cn("rounded py-1", soil.grade === g ? "ring-2" : "opacity-50")}
                          style={{ backgroundColor: SOIL_COLORS[g] + "20", border: `1px solid ${SOIL_COLORS[g]}50`, ringColor: SOIL_COLORS[g] }}
                        >
                          <p className="font-bold" style={{ color: SOIL_COLORS[g] }}>{g}</p>
                          <p className="text-muted-foreground">{g === "A" ? "≥90" : g === "B" ? "75~89" : g === "C" ? "60~74" : g === "D" ? "40~59" : "<40"}</p>
                        </div>
                      ))}
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

              <TabsContent value="complaints" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {(() => {
                      const count = getComplaintCount(treeId);
                      const mockComplaints = Array.from({ length: count }, (_, i) => {
                        const days = i * 18 + 5;
                        const date = new Date(2025, 8, 27);
                        date.setDate(date.getDate() - days);
                        const types = ["나뭇가지 낙하 위험", "병해충 발생", "보행 방해", "뿌리 도로 파손", "가로등 차단", "낙엽 민원", "나무 기울어짐"];
                        return {
                          date: date.toISOString().slice(0, 10),
                          type: types[i % types.length],
                          status: i < 2 ? "처리중" : "완료",
                        };
                      });

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <MessageSquareWarning className="h-6 w-6 text-destructive shrink-0" />
                            <div>
                              <p className="font-semibold text-sm">민원 {count}건</p>
                              <p className="text-xs text-muted-foreground">이 수목에 접수된 시민 민원 내역입니다</p>
                            </div>
                          </div>

                          {count === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">접수된 민원이 없습니다.</p>
                          ) : (
                            <div className="space-y-3">
                              {mockComplaints.map((c, i) => (
                                <div key={i} className="flex items-center justify-between border rounded-lg p-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">{c.date}</span>
                                    <span className="font-medium">{c.type}</span>
                                  </div>
                                  <Badge variant={c.status === "처리중" ? "warning" : "success"} className="text-xs shrink-0">
                                    {c.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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

              {/* Edit Tab */}
              <TabsContent value="edit" className="mt-4 space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Pencil className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">현장 데이터 편집</h3>
                      <span className="text-xs text-muted-foreground ml-auto">로컬 저장 (덮어쓰기)</span>
                    </div>

                    {/* Numeric fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-height" className="text-xs">수고 (m)</Label>
                        <Input
                          id="edit-height"
                          type="number"
                          min={0}
                          step={0.1}
                          placeholder={String(treeData.height ?? "")}
                          value={editValues.height ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, height: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
                          className="h-8 text-sm"
                          data-testid="input-edit-height"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-diameter" className="text-xs">흉고 직경 (cm)</Label>
                        <Input
                          id="edit-diameter"
                          type="number"
                          min={0}
                          step={0.1}
                          placeholder={String(treeData.diameter ?? "")}
                          value={editValues.diameter ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, diameter: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
                          className="h-8 text-sm"
                          data-testid="input-edit-diameter"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-damage" className="text-xs">상처 면적 (cm²)</Label>
                        <Input
                          id="edit-damage"
                          type="number"
                          min={0}
                          step={1}
                          placeholder={String(treeData.damage_area ?? "")}
                          value={editValues.damage_area ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, damage_area: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
                          className="h-8 text-sm"
                          data-testid="input-edit-damage-area"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-cavity" className="text-xs">공동 깊이 (cm)</Label>
                        <Input
                          id="edit-cavity"
                          type="number"
                          min={0}
                          step={0.5}
                          placeholder={String(treeData.cavity_depth ?? "")}
                          value={editValues.cavity_depth ?? ""}
                          onChange={(e) => setEditValues((v) => ({ ...v, cavity_depth: e.target.value === "" ? undefined : parseFloat(e.target.value) }))}
                          className="h-8 text-sm"
                          data-testid="input-edit-cavity-depth"
                        />
                      </div>
                    </div>

                    {/* Custom tag management */}
                    {(() => {
                      const persistTags = (updated: string[]) => {
                        setCustomTags(updated);
                        try { localStorage.setItem(TAGS_KEY(treeId), JSON.stringify(updated)); } catch { /* ignore */ }
                      };
                      const addTag = () => {
                        const val = tagInput.trim();
                        if (!val || customTags.includes(val)) return;
                        persistTags([...customTags, val]);
                        setTagInput("");
                      };
                      const deleteTag = (idx: number) => {
                        persistTags(customTags.filter((_, i) => i !== idx));
                        if (editingTagIdx === idx) { setEditingTagIdx(null); setEditingTagText(""); }
                      };
                      const startEdit = (idx: number) => {
                        setEditingTagIdx(idx);
                        setEditingTagText(customTags[idx]);
                      };
                      const saveEdit = () => {
                        if (editingTagIdx === null) return;
                        const val = editingTagText.trim();
                        if (!val) return;
                        if (customTags.includes(val) && customTags[editingTagIdx] !== val) return;
                        persistTags(customTags.map((t, i) => (i === editingTagIdx ? val : t)));
                        setEditingTagIdx(null);
                        setEditingTagText("");
                      };
                      return (
                        <div className="space-y-3 pt-1">
                          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">특이사항 태그</Label>
                          {/* Existing tags */}
                          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                            {customTags.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">등록된 항목이 없습니다</span>
                            )}
                            {customTags.map((tag, idx) => (
                              <div key={idx} className="flex items-center gap-0.5">
                                {editingTagIdx === idx ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      autoFocus
                                      value={editingTagText}
                                      onChange={(e) => setEditingTagText(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") { setEditingTagIdx(null); setEditingTagText(""); } }}
                                      className="h-6 text-xs w-28 px-2"
                                      data-testid={`input-edit-tag-${idx}`}
                                    />
                                    <button
                                      onClick={saveEdit}
                                      className="h-5 w-5 flex items-center justify-center rounded text-green-600 hover:bg-green-50"
                                      data-testid={`button-confirm-edit-tag-${idx}`}
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => { setEditingTagIdx(null); setEditingTagText(""); }}
                                      className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 group"
                                    data-testid={`chip-tag-${idx}`}
                                  >
                                    {tag}
                                    <button
                                      onClick={() => startEdit(idx)}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-opacity"
                                      data-testid={`button-edit-tag-${idx}`}
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      onClick={() => deleteTag(idx)}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 hover:text-red-600 transition-opacity"
                                      data-testid={`button-delete-tag-${idx}`}
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* Add new tag */}
                          <div className="flex gap-2">
                            <Input
                              placeholder="새 항목 입력..."
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
                              className="h-8 text-sm flex-1"
                              data-testid="input-new-tag"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={addTag}
                              disabled={!tagInput.trim() || customTags.includes(tagInput.trim())}
                              className="h-8 px-3 gap-1"
                              data-testid="button-add-tag"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              추가
                            </Button>
                          </div>
                          {tagInput.trim() && customTags.includes(tagInput.trim()) && (
                            <p className="text-xs text-destructive">이미 동일한 항목이 있습니다</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Save / Reset */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => {
                          try {
                            localStorage.setItem(OVERRIDE_KEY(treeId), JSON.stringify(editValues));
                            setEditSaved(true);
                            setTimeout(() => setEditSaved(false), 2000);
                          } catch { /* ignore */ }
                        }}
                        data-testid="button-save-edit"
                      >
                        <Save className="h-4 w-4" />
                        {editSaved ? "저장 완료 ✓" : "저장"}
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          localStorage.removeItem(OVERRIDE_KEY(treeId));
                          setEditValues({});
                        }}
                        data-testid="button-reset-edit"
                      >
                        <RotateCcw className="h-4 w-4" />
                        초기화
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      편집 내용은 이 기기의 브라우저에 저장됩니다. K-UTSI 재계산에 반영되지 않습니다.
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
