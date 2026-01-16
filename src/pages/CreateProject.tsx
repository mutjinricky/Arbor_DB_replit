import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClipboardList, TreeDeciduous, ArrowLeft, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TreeSelector } from "@/components/TreeSelector";
import { cn, calculateDirectCosts, calculateFinalBudget, type PruningInput, type SurgeryInput, type NutritionInput } from "@/lib/utils";

// Tree data type from trees.json
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

// Extended tree type for display
interface DisplayTree {
  id: string;
  name: string;
  species: string;
  risk: string;
  health: string;
  location: string;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const treeIdsParam = searchParams.get("treeIds");
  const initialTreeIds = treeIdsParam ? treeIdsParam.split(",") : [];
  
  const [selectedTrees, setSelectedTrees] = useState<string[]>(initialTreeIds);
  const [showTreeSelector, setShowTreeSelector] = useState(initialTreeIds.length === 0);
  const [recentTreeId, setRecentTreeId] = useState<string | null>(initialTreeIds[0] || null);
  const [treesData, setTreesData] = useState<Record<string, TreeData>>({});
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();

  // Load trees.json
  useEffect(() => {
    fetch('/data/trees.json')
      .then(response => response.json())
      .then((data: Record<string, TreeData>) => {
        setTreesData(data);
      })
      .catch(error => {
        console.error('Error loading trees data:', error);
      });
  }, []);

  // Convert tree data to display format
  const getDisplayTree = (treeId: string): DisplayTree | null => {
    const tree = treesData[treeId];
    if (!tree) return null;

    // Derive health from risk level
    const getHealthFromRisk = (risk: string): string => {
      switch (risk.toLowerCase()) {
        case "high":
          return "Poor";
        case "medium":
          return "Fair";
        case "low":
          return "Good";
        default:
          return "Fair";
      }
    };

    return {
      id: tree.id,
      name: `${tree.district} ${tree.species}`,
      species: tree.species,
      risk: tree.risk,
      health: getHealthFromRisk(tree.risk),
      location: tree.district,
    };
  };

  const recentTree = recentTreeId ? getDisplayTree(recentTreeId) : null;

  // Get tree image based on tree id
  // Convert string id to int, calculate modulo 117, then add 1 to get 1-117 range
  const getTreeImagePath = (treeId: string) => {
    const treeIdInt = parseInt(treeId, 10) || 0;
    const imageIndex = (treeIdInt % 117) + 1; // Result is 1-117
    const paddedIndex = imageIndex.toString().padStart(3, '0'); // Format as 001, 002, etc.
    return `/data/tree_images/tree_${paddedIndex}.jpg`;
  };

  // Reset image error when recentTreeId changes
  useEffect(() => {
    setImageError(false);
  }, [recentTreeId]);

  // Update selected trees when URL params change
  useEffect(() => {
    if (initialTreeIds.length > 0) {
      setSelectedTrees(initialTreeIds);
      setShowTreeSelector(false);
    } else {
      setShowTreeSelector(true);
    }
  }, [treeIdsParam]);

  interface WorkItem {
    treeId: string;
    workTypes: string[];
    remarks: string;
  }

  const handleSubmit = () => {
    if (selectedTrees.length === 0) {
      toast({
        title: "수목이 선택되지 않음",
        description: "최소 1그루의 수목을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    // Analyze trees and create work items
    const workItems: WorkItem[] = [];
    const costItems: (PruningInput | SurgeryInput | NutritionInput)[] = [];

    selectedTrees.forEach((treeId) => {
      const tree = treesData[treeId];
      if (!tree) return;

      const treeWorks: string[] = [];
      const treeRemarks: string[] = [];

      // 1. 외과수술 (damage_area > 0)
      if (tree.damage_area > 0) {
        treeWorks.push("외과수술");
        const hasFilling = tree.cavity_depth > 0;
        const volume = hasFilling ? tree.cavity_depth * tree.damage_area : undefined;
        
        costItems.push({
          type: 'surgery',
          hasFilling,
          area: tree.damage_area,
          volume,
        } as SurgeryInput);

        treeRemarks.push(`손상면적: ${tree.damage_area}m²${hasFilling ? `, 공동깊이: ${tree.cavity_depth}m (충전 필요)` : ''}`);
      }

      // 2. 가지치기 (ice_damage === true)
      if (tree.ice_damage) {
        treeWorks.push("가지치기");
        const difficulty = tree.risk === "high" ? 30 : 20;
        
        costItems.push({
          type: 'pruning',
          diameter: tree.diameter,
          difficulty: difficulty as 20 | 30,
        } as PruningInput);

        treeRemarks.push(`얼음 피해로 인한 가지치기 필요 (난이도: ${difficulty}%)`);
      }

      // 3. 영양공급 (need_nutrient === true)
      if (tree.need_nutrient) {
        treeWorks.push("영양공급");
        
        costItems.push({
          type: 'nutrition',
          enhancerDiameter: tree.diameter,
          injectionCount: 1, // 기본값 1병
        } as NutritionInput);

        treeRemarks.push(`영양제 공급 필요`);
      }

      if (treeWorks.length > 0) {
        workItems.push({
          treeId,
          workTypes: treeWorks,
          remarks: treeRemarks.join("\n"),
        });
      }
    });

    // Calculate budget
    const directCosts = calculateDirectCosts(costItems);
    const estimatedDirectCost = directCosts.materials + directCosts.labor + directCosts.expenses;
    
    const projectDetails = {
      projectDurationMonths: 3, // 기본값 3개월
      isOver1Month: true,
      estimatedDirectCost,
    };

    const finalBudget = calculateFinalBudget(directCosts, projectDetails);

    // Store work items and budget in sessionStorage
    sessionStorage.setItem('workOrderData', JSON.stringify({
      workItems,
      finalBudget,
      directCosts,
      projectDetails,
      totalTrees: selectedTrees.length,
    }));

    toast({
      title: "의뢰서 생성 완료",
      description: `${selectedTrees.length}그루의 수목에 대한 ${workItems.length}개의 작업 항목이 포함된 의뢰서가 성공적으로 생성되었습니다.`,
    });
    
    navigate(`/projects/request?treeIds=${selectedTrees.join(",")}`);
  };

  const handleCancel = () => {
    navigate("/projects");
  };

  const removeTree = (treeId: string) => {
    setRecentTreeId(treeId);
    setSelectedTrees((prev) => prev.filter((id) => id !== treeId));
  };

  const handleTreesChange = (trees: string[]) => {
    // Find which tree was just added or removed
    const addedTree = trees.find(id => !selectedTrees.includes(id));
    const removedTree = selectedTrees.find(id => !trees.includes(id));
    const changedTree = addedTree || removedTree;
    
    if (changedTree) {
      setRecentTreeId(changedTree);
    }
    
    setSelectedTrees(trees);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">작업 지시서 생성</h1>
              <p className="text-muted-foreground">새로운 수목 관리 프로젝트 설정</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Selected Trees */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">선택된 수목 ({selectedTrees.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTreeSelector(!showTreeSelector)}
                >
                  {showTreeSelector ? "숨기기" : "추가"} 
                </Button>
              </div>
              
              {selectedTrees.length > 0 ? (
                <Card className="bg-accent/10 border-accent/30">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedTrees.map((id) => (
                        <Badge key={id} variant="secondary" className="text-sm py-1.5 px-3">
                          <TreeDeciduous className="h-3 w-3 mr-1" />
                          {id}
                          <button
                            onClick={() => removeTree(id)}
                            className="ml-2 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">선택된 수목이 없습니다. 작업 지시서를 생성하려면 수목을 추가하세요.</p>
              )}
            </CardContent>
          </Card>

          {/* Tree Selector with Details */}
          {showTreeSelector && (
            <div className="grid md:grid-cols-[380px,1fr] gap-6">
              {/* Tree Details Panel */}
              <div className="space-y-4 h-fit sticky top-6">
                {recentTree ? (
                  <>
                    {/* Tree Image */}
                    <Card className="overflow-hidden">
                      <div className="aspect-square relative overflow-hidden">
                        {imageError ? (
                          <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <TreeDeciduous className="h-24 w-24 text-primary/40" />
                          </div>
                        ) : (
                          <img
                            src={getTreeImagePath(recentTree.id)}
                            alt={`Tree ${recentTree.id}`}
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
                          <p className="font-mono font-semibold">{recentTree.id}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground">종류</p>
                          <p className="font-medium">{recentTree.species}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground">위치</p>
                          <p className="text-sm font-medium">{recentTree.location}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Status Block */}
                    <Card className={cn(recentTree.risk === "high" && "border-destructive/30 bg-destructive/5")}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">건강 상태</span>
                          <span className={cn("font-semibold", getRiskColor(recentTree.risk))}>{recentTree.health === "Good" ? "양호" : recentTree.health === "Fair" ? "보통" : "불량"}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">위험도</span>
                          <Badge variant={recentTree.risk === "high" ? "destructive" : recentTree.risk === "medium" ? "default" : "secondary"}>
                            {recentTree.risk === "high" ? "높음" : recentTree.risk === "medium" ? "보통" : "낮음"}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">선택 상태</span>
                          {selectedTrees.includes(recentTree.id) ? (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              ✓ 선택됨
                            </Badge>
                          ) : (
                            <Badge variant="outline">미선택</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="h-[600px] flex items-center justify-center">
                    <CardContent className="text-center space-y-4 p-8">
                      <div className="text-6xl">🌳</div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">선택된 수목 없음</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          목록이나 지도에서 수목을 선택하면 여기에 상세 정보가 표시됩니다
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tree Selector */}
              <TreeSelector
                selectedTrees={selectedTrees}
                onTreesChange={handleTreesChange}
              />
            </div>
          )}

          {/* Work Types Selection */}
          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <Button variant="outline" size="lg" onClick={handleCancel}>
              취소
            </Button>
            <Button 
              size="lg" 
              onClick={handleSubmit} 
              disabled={selectedTrees.length === 0}
              className="px-8"
            >
              의뢰서 자동 생성
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
