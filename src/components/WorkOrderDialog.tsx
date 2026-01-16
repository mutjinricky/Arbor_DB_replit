import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClipboardList, TreeDeciduous, Scissors, Bug, Leaf, Stethoscope, Trash2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TreeSelector } from "./TreeSelector";

interface WorkOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  treeIds?: string[];
}

const workTypes = [
  { id: "pruning", label: "가지치기", icon: Scissors, estimatedCost: "₩400,000 - ₩600,000", recommended: true },
  { id: "pest", label: "병해충 방제", icon: Bug, estimatedCost: "₩250,000 - ₩350,000", recommended: false },
  { id: "nutrition", label: "영양제 처방", icon: Leaf, estimatedCost: "₩150,000 - ₩250,000", recommended: false },
  { id: "surgery", label: "외과수술", icon: Stethoscope, estimatedCost: "₩800,000 - ₩1,200,000", recommended: true },
  { id: "removal", label: "수목 제거", icon: Trash2, estimatedCost: "₩1,000,000 - ₩1,500,000", recommended: false },
];

export function WorkOrderDialog({ isOpen, onClose, treeIds = [] }: WorkOrderDialogProps) {
  const [selectedTrees, setSelectedTrees] = useState<string[]>(treeIds);
  const [selectedWorks, setSelectedWorks] = useState<string[]>(
    workTypes.filter((w) => w.recommended).map((w) => w.id)
  );
  const [notes, setNotes] = useState("");
  const [projectName, setProjectName] = useState("");
  const [showTreeSelector, setShowTreeSelector] = useState(treeIds.length === 0);
  const { toast } = useToast();

  // Update selected trees when treeIds prop changes
  useEffect(() => {
    if (treeIds.length > 0) {
      setSelectedTrees(treeIds);
      setShowTreeSelector(false);
    } else {
      setShowTreeSelector(true);
    }
  }, [treeIds]);

  const toggleWork = (workId: string) => {
    setSelectedWorks((prev) =>
      prev.includes(workId) ? prev.filter((id) => id !== workId) : [...prev, workId]
    );
  };

  const handleSubmit = () => {
    toast({
      title: "작업 지시서 생성 완료",
      description: `${selectedTrees.length}그루의 수목에 대한 작업 지시서가 성공적으로 생성되었습니다. RFQ가 계약업체에 전송됩니다.`,
    });
    onClose();
    // Reset form
    setSelectedTrees([]);
    setSelectedWorks(workTypes.filter((w) => w.recommended).map((w) => w.id));
    setNotes("");
    setProjectName("");
  };

  const removeTree = (treeId: string) => {
    setSelectedTrees((prev) => prev.filter((id) => id !== treeId));
  };

  const estimatedTotalMin = selectedWorks.reduce((sum, id) => {
    const work = workTypes.find((w) => w.id === id);
    if (!work) return sum;
    const min = parseInt(work.estimatedCost.match(/₩([\d,]+)/)?.[1].replace(/,/g, "") || "0");
    return sum + min;
  }, 0);

  const estimatedTotalMax = selectedWorks.reduce((sum, id) => {
    const work = workTypes.find((w) => w.id === id);
    if (!work) return sum;
    const max = parseInt(work.estimatedCost.match(/- ₩([\d,]+)/)?.[1].replace(/,/g, "") || "0");
    return sum + max;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardList className="h-5 w-5 text-primary" />
            작업 지시서 생성
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Trees */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">선택된 수목 ({selectedTrees.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTreeSelector(!showTreeSelector)}
              >
                {showTreeSelector ? "숨기기" : "추가"} 수목
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
          </div>

          {/* Tree Selector */}
          {showTreeSelector && (
            <TreeSelector
              selectedTrees={selectedTrees}
              onTreesChange={setSelectedTrees}
            />
          )}

          {/* Work Types Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">작업 유형 선택</Label>
            <div className="space-y-3">
              {workTypes.map((work) => {
                const Icon = work.icon;
                const isSelected = selectedWorks.includes(work.id);

                return (
                  <Card
                    key={work.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => toggleWork(work.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleWork(work.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{work.label}</span>
                            {work.recommended && (
                              <Badge variant="secondary" className="text-xs">
                                추천
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            예상 비용: <span className="font-medium">{work.estimatedCost}</span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Estimated Total */}
          {selectedWorks.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-semibold">예상 총 비용</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    ₩{estimatedTotalMin.toLocaleString()} - ₩{estimatedTotalMax.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Assignment */}
          <div>
            <Label htmlFor="project" className="text-base font-semibold">
              프로젝트 지정 (선택사항)
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              기존 프로젝트나 새 프로젝트에 이 작업 지시서를 그룹화
            </p>
            <input
              id="project"
              type="text"
              placeholder="예: 2024년 3분기 고위험 수목 완화"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-base font-semibold">
              추가 메모
            </Label>
            <Textarea
              id="notes"
              placeholder="특정 지시사항이나 관찰 내용을 추가하세요..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={selectedWorks.length === 0 || selectedTrees.length === 0}>
            작업 지시서 생성 및 RFQ 전송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
