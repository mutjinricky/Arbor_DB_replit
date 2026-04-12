import { useState, useEffect, useRef } from "react";
import {
  Search, Filter, X, ChevronRight, FileText, Download, FileSpreadsheet,
  BarChart3, Upload, MapPin, TreePine, Image, Building2, Calendar,
  Wallet, TrendingUp, CheckCircle2, Clock3, AlertCircle, Eye,
  ChevronLeft, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ── 타입 ──────────────────────────────────────────────────────────────────────
type ProjectStatus = "계획중" | "진행중" | "완료";

interface ConnectedTree {
  id: string;
  coord: string;
  photoUrl: string;
}

interface Contractor {
  name: string;
  email: string;
  initial: string;
}

interface CompletionPhoto {
  id: string;
  label: string;
  photoUrl: string;
  date: string;
}

interface BusinessProject {
  id: string;
  name: string;
  year: number;
  region: string;
  type: string;
  status: ProjectStatus;
  period: string;
  budget: number;
  spent: number;
  vendor: string;
  vendorEmail: string;
  department: string;
  summary: string;
  treeCount: number;
  mapCount: number;
  connectedTrees: ConnectedTree[];
  contractors: Contractor[];
  completionPhotos: CompletionPhoto[];
}

// ── 초기 더미 데이터 ──────────────────────────────────────────────────────────
const INITIAL_PROJECTS: BusinessProject[] = [
  {
    id: "BH-2024-001",
    name: "도로변 수목 일제 가지치기",
    year: 2024,
    region: "도로",
    type: "가지치기",
    status: "진행중",
    period: "2024-03-01 ~ 2024-06-30",
    budget: 45000000,
    spent: 32000000,
    vendor: "한국수목관리(주)",
    vendorEmail: "contact@kmtree.co.kr",
    department: "공원녹지과",
    summary: "이천시 도로변 수목 1,040주를 대상으로 봄철 가지치기 및 수형 관리를 실시하여 통행 안전 확보 및 미관 개선",
    treeCount: 180,
    mapCount: 3,
    connectedTrees: [
      { id: "T-0412", coord: "37.4323, 127.4392", photoUrl: "" },
      { id: "T-0413", coord: "37.4325, 127.4395", photoUrl: "" },
      { id: "T-0419", coord: "37.4330, 127.4401", photoUrl: "" },
    ],
    contractors: [
      { name: "한국수목관리(주)", email: "contact@kmtree.co.kr", initial: "한" },
      { name: "이천녹지개발", email: "icheon@green.co.kr", initial: "이" },
    ],
    completionPhotos: [],
  },
  {
    id: "BH-2024-002",
    name: "마을 노거수 토양 개량 사업",
    year: 2024,
    region: "마을",
    type: "토양개량",
    status: "계획중",
    period: "2024-07-01 ~ 2024-09-30",
    budget: 28000000,
    spent: 0,
    vendor: "녹색환경연구소",
    vendorEmail: "green@ecolab.co.kr",
    department: "공원녹지과",
    summary: "마을 내 노거수 60주를 대상으로 토양 물리성 개선, 유기물 투입, pH 조정 등 K-UTSI 기반 토양 개량 실시",
    treeCount: 60,
    mapCount: 2,
    connectedTrees: [
      { id: "T-0201", coord: "37.4290, 127.4350", photoUrl: "" },
      { id: "T-0205", coord: "37.4292, 127.4352", photoUrl: "" },
    ],
    contractors: [
      { name: "녹색환경연구소", email: "green@ecolab.co.kr", initial: "녹" },
    ],
    completionPhotos: [],
  },
  {
    id: "BH-2024-003",
    name: "축제장 수목 병해충 방제",
    year: 2024,
    region: "축제장",
    type: "병해충방제",
    status: "완료",
    period: "2024-02-01 ~ 2024-03-31",
    budget: 18000000,
    spent: 17500000,
    vendor: "(주)이천방제",
    vendorEmail: "icheon@pest.co.kr",
    department: "산림공원과",
    summary: "이천 쌀문화축제장 일원 수목 340주에 대해 솔잎혹파리 및 흰가루병 예방 방제 실시",
    treeCount: 340,
    mapCount: 1,
    connectedTrees: [
      { id: "T-0555", coord: "37.4400, 127.4450", photoUrl: "" },
      { id: "T-0560", coord: "37.4405, 127.4455", photoUrl: "" },
      { id: "T-0562", coord: "37.4408, 127.4458", photoUrl: "" },
    ],
    contractors: [
      { name: "(주)이천방제", email: "icheon@pest.co.kr", initial: "이" },
    ],
    completionPhotos: [
      { id: "CP-001", label: "방제 전 현장", photoUrl: "", date: "2024-02-01" },
      { id: "CP-002", label: "방제 작업 중", photoUrl: "", date: "2024-02-15" },
      { id: "CP-003", label: "방제 완료 현장", photoUrl: "", date: "2024-03-31" },
    ],
  },
  {
    id: "BH-2023-001",
    name: "전답 인접 수목 위험목 제거",
    year: 2023,
    region: "전답",
    type: "위험목제거",
    status: "완료",
    period: "2023-10-01 ~ 2023-11-30",
    budget: 12000000,
    spent: 11800000,
    vendor: "수목안전관리(주)",
    vendorEmail: "safe@treecare.co.kr",
    department: "산림공원과",
    summary: "농경지 인접 고위험 수목 35주에 대한 안전 진단 및 위험목 제거, 재해예방 조치",
    treeCount: 35,
    mapCount: 2,
    connectedTrees: [
      { id: "T-0721", coord: "37.4180, 127.4280", photoUrl: "" },
      { id: "T-0722", coord: "37.4182, 127.4282", photoUrl: "" },
    ],
    contractors: [
      { name: "수목안전관리(주)", email: "safe@treecare.co.kr", initial: "수" },
    ],
    completionPhotos: [
      { id: "CP-004", label: "작업 전 현장", photoUrl: "", date: "2023-10-01" },
      { id: "CP-005", label: "작업 완료", photoUrl: "", date: "2023-11-30" },
    ],
  },
  {
    id: "BH-2023-002",
    name: "도로변 수목 외과수술",
    year: 2023,
    region: "도로",
    type: "외과수술",
    status: "완료",
    period: "2023-05-01 ~ 2023-08-31",
    budget: 35000000,
    spent: 34200000,
    vendor: "한국수목관리(주)",
    vendorEmail: "contact@kmtree.co.kr",
    department: "공원녹지과",
    summary: "도로변 노거수 25주를 대상으로 공동 충전, 부후 제거, 지주 설치 등 외과수술 및 수목 보강 처리",
    treeCount: 25,
    mapCount: 2,
    connectedTrees: [
      { id: "T-0341", coord: "37.4360, 127.4420", photoUrl: "" },
      { id: "T-0345", coord: "37.4365, 127.4425", photoUrl: "" },
    ],
    contractors: [
      { name: "한국수목관리(주)", email: "contact@kmtree.co.kr", initial: "한" },
    ],
    completionPhotos: [
      { id: "CP-006", label: "외과수술 전", photoUrl: "", date: "2023-05-01" },
      { id: "CP-007", label: "공동 충전 완료", photoUrl: "", date: "2023-07-15" },
      { id: "CP-008", label: "최종 완료", photoUrl: "", date: "2023-08-31" },
    ],
  },
  {
    id: "BH-2023-003",
    name: "농가 주변 수목 일제 조사",
    year: 2023,
    region: "농가",
    type: "정밀진단",
    status: "완료",
    period: "2023-04-01 ~ 2023-05-31",
    budget: 8000000,
    spent: 7800000,
    vendor: "이천수목연구센터",
    vendorEmail: "research@ictree.kr",
    department: "공원녹지과",
    summary: "농가 주변 수목 520주 전수 정밀 조사, K-UTSI 등급 산정 및 관리 우선순위 도출",
    treeCount: 520,
    mapCount: 4,
    connectedTrees: [
      { id: "T-0801", coord: "37.4150, 127.4200", photoUrl: "" },
      { id: "T-0805", coord: "37.4155, 127.4205", photoUrl: "" },
    ],
    contractors: [
      { name: "이천수목연구센터", email: "research@ictree.kr", initial: "이" },
    ],
    completionPhotos: [
      { id: "CP-009", label: "현장 조사", photoUrl: "", date: "2023-04-15" },
      { id: "CP-010", label: "최종 보고서 제출", photoUrl: "", date: "2023-05-31" },
    ],
  },
];

// ── 상수 ──────────────────────────────────────────────────────────────────────
const STATUS_ORDER: Record<ProjectStatus, number> = { 계획중: 0, 진행중: 1, 완료: 2 };

const STATUS_STYLE: Record<ProjectStatus, { bg: string; text: string; icon: typeof Clock3 }> = {
  계획중: { bg: "bg-slate-100 text-slate-700", text: "계획중", icon: Clock3 },
  진행중: { bg: "bg-blue-100 text-blue-700", text: "진행중", icon: AlertCircle },
  완료:   { bg: "bg-green-100 text-green-700", text: "완료", icon: CheckCircle2 },
};

const ALL_YEARS   = [2024, 2023, 2022];
const ALL_REGIONS = ["도로", "마을", "축제장", "전답", "농가"];
const ALL_TYPES   = ["가지치기", "토양개량", "병해충방제", "위험목제거", "외과수술", "정밀진단", "시비관리"];
const ALL_STATUSES: ProjectStatus[] = ["계획중", "진행중", "완료"];

const STORAGE_KEY = "dryad_business_history_v1";

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 100_000_000
    ? `${(n / 100_000_000).toFixed(1)}억`
    : n >= 10_000
    ? `${Math.round(n / 10_000).toLocaleString()}만`
    : n.toLocaleString();

const fmtFull = (n: number) => `${n.toLocaleString()}원`;

function sortProjects(list: BusinessProject[]): BusinessProject[] {
  return [...list].sort((a, b) => {
    const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (sd !== 0) return sd;
    return b.year - a.year || b.id.localeCompare(a.id);
  });
}

function loadFromStorage(): BusinessProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BusinessProject[];
  } catch {}
  return INITIAL_PROJECTS;
}

function saveToStorage(data: BusinessProject[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ── 상태 배지 컴포넌트 ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS_STYLE[status];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", s.bg)}>
      <Icon className="h-3 w-3" />
      {s.text}
    </span>
  );
}

// ── 연결 수목 상세 팝업 ────────────────────────────────────────────────────────
function TreePopup({
  tree,
  onClose,
}: {
  tree: ConnectedTree | null;
  onClose: () => void;
}) {
  if (!tree) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <TreePine className="h-4 w-4 text-green-600" />
            수목 상세 — {tree.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{tree.coord}</span>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">수목 사진</p>
            {tree.photoUrl ? (
              <img src={tree.photoUrl} alt="수목사진" className="w-full rounded-lg object-cover h-48" />
            ) : (
              <div className="w-full h-40 rounded-lg bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Image className="h-8 w-8 opacity-40" />
                <p className="text-xs">사진 없음</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 사업 상세 팝업 ─────────────────────────────────────────────────────────────
function ProjectDetailModal({
  project,
  onClose,
}: {
  project: BusinessProject;
  onClose: () => void;
}) {
  const [detailTab, setDetailTab] = useState<"map" | "trees" | "photos" | "contractors">("map");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [selectedTree, setSelectedTree] = useState<ConnectedTree | null>(null);
  const spentRate = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* 헤더 */}
          <div className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-muted-foreground">{project.id}</span>
                  <StatusBadge status={project.status} />
                </div>
                <h2 className="text-lg font-bold leading-tight">{project.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">{project.summary}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* 요약 카드 3개 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> 공기
                </p>
                <p className="text-xs font-semibold">{project.period}</p>
              </div>
              <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Wallet className="h-3 w-3" /> 총 예산
                </p>
                <p className="text-xs font-semibold">{fmtFull(project.budget)}</p>
              </div>
              <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> 집행률
                </p>
                <p className="text-xs font-semibold">{spentRate}% ({fmt(project.spent)})</p>
              </div>
            </div>

            {/* 탭 */}
            <div className="flex gap-1 border-b">
              {(["map", "trees", "photos", "contractors"] as const).map((tab) => {
                const labels = { map: "사업 지도", trees: `연결 수목 (${project.connectedTrees.length})`, photos: `준공사진 (${project.completionPhotos.length})`, contractors: "계약업체" };
                return (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={cn(
                      "px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px",
                      detailTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* 탭 콘텐츠 */}
            {detailTab === "map" && (
              <div>
                <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/40 h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <MapPin className="h-10 w-10 opacity-30" />
                  <p className="text-sm">지도 표시 영역</p>
                  <p className="text-xs opacity-60">이천시 {project.region} 일대 · {project.treeCount}주 · 구역 {project.mapCount}개</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-muted-foreground text-[10px]">지역</p>
                    <p className="font-semibold">{project.region}</p>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-muted-foreground text-[10px]">수목 수</p>
                    <p className="font-semibold">{project.treeCount.toLocaleString()}주</p>
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <p className="text-muted-foreground text-[10px]">구역 수</p>
                    <p className="font-semibold">{project.mapCount}개</p>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "trees" && (
              <div className="space-y-2">
                {project.connectedTrees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">연결된 수목이 없습니다</div>
                ) : project.connectedTrees.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTree(t)}
                    className="flex items-center gap-3 p-3 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <TreePine className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold">{t.id}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{t.coord}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.photoUrl ? (
                        <span className="text-[10px] text-blue-600 flex items-center gap-0.5"><Image className="h-3 w-3" />사진있음</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">사진 없음</span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === "photos" && (
              <div>
                {project.completionPhotos.length === 0 ? (
                  <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/40 h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Image className="h-8 w-8 opacity-30" />
                    <p className="text-sm">준공사진 없음</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 탭 버튼 */}
                    <div className="flex gap-1 flex-wrap">
                      {project.completionPhotos.map((ph, i) => (
                        <button
                          key={ph.id}
                          onClick={() => setPhotoIdx(i)}
                          className={cn(
                            "text-xs px-3 py-1 rounded-full border transition-colors",
                            photoIdx === i ? "bg-indigo-600 text-white border-transparent" : "text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          {ph.label}
                        </button>
                      ))}
                    </div>
                    {/* 사진 표시 */}
                    <div className="rounded-xl border overflow-hidden">
                      {project.completionPhotos[photoIdx].photoUrl ? (
                        <img
                          src={project.completionPhotos[photoIdx].photoUrl}
                          alt={project.completionPhotos[photoIdx].label}
                          className="w-full h-56 object-cover"
                        />
                      ) : (
                        <div className="w-full h-56 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Image className="h-8 w-8 opacity-30" />
                          <p className="text-xs">사진 없음</p>
                        </div>
                      )}
                      <div className="p-3 border-t bg-white dark:bg-slate-900">
                        <p className="text-xs font-semibold">{project.completionPhotos[photoIdx].label}</p>
                        <p className="text-[10px] text-muted-foreground">{project.completionPhotos[photoIdx].date}</p>
                      </div>
                    </div>
                    {/* 이전/다음 */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))}
                        disabled={photoIdx === 0}
                        className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> 이전
                      </button>
                      <span className="text-[10px] text-muted-foreground">{photoIdx + 1} / {project.completionPhotos.length}</span>
                      <button
                        onClick={() => setPhotoIdx((i) => Math.min(project.completionPhotos.length - 1, i + 1))}
                        disabled={photoIdx === project.completionPhotos.length - 1}
                        className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        다음 <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {detailTab === "contractors" && (
              <div className="space-y-2">
                {project.contractors.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 text-sm font-bold">
                      {c.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <Building2 className="ml-auto h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}

            {/* 기본 정보 */}
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">사업유형</p>
                <p className="font-medium">{project.type}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">담당부서</p>
                <p className="font-medium">{project.department}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">시행사</p>
                <p className="font-medium">{project.vendor}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">집행액</p>
                <p className="font-medium">{fmtFull(project.spent)}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedTree && <TreePopup tree={selectedTree} onClose={() => setSelectedTree(null)} />}
    </>
  );
}

// ── 설계서 업로드 팝업 ─────────────────────────────────────────────────────────
function UploadModal({
  onClose,
  onRegister,
}: {
  onClose: () => void;
  onRegister: (p: BusinessProject) => void;
}) {
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Partial<BusinessProject> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function parseText(text: string): Partial<BusinessProject> {
    const find = (keys: string[]) => {
      for (const k of keys) {
        const m = text.match(new RegExp(`${k}[:\\s：]+([^\n\r]+)`, "i"));
        if (m) return m[1].trim();
      }
      return "";
    };
    const budgetRaw = find(["예산", "사업비", "총액", "금액"]);
    const budget = parseInt(budgetRaw.replace(/[^0-9]/g, "")) || 0;
    const treeRaw = find(["수목 수", "수목수", "대상 수목", "그루"]);
    const treeCount = parseInt(treeRaw.replace(/[^0-9]/g, "")) || 0;
    const yearRaw = find(["연도", "사업연도", "년도"]);
    const year = parseInt(yearRaw) || new Date().getFullYear();
    return {
      name:    find(["사업명", "공사명", "과업명"]) || "미상",
      year,
      region:  find(["지역", "위치", "구역"]) || "미상",
      type:    find(["사업유형", "공사종류", "유형"]) || "미상",
      status:  "계획중",
      period:  find(["공기", "기간", "공사기간"]) || "",
      budget:  budget > 0 ? budget : 0,
      spent:   0,
      vendor:  find(["시행사", "업체", "도급사", "수급인"]) || "미상",
      treeCount,
    };
  }

  async function handleFile(file: File) {
    setError("");
    setPreview(null);
    setFileName(file.name);
    setAnalyzing(true);
    try {
      let text = "";
      if (file.type === "application/pdf") {
        text = `사업명: ${file.name.replace(".pdf", "")}\n연도: ${new Date().getFullYear()}\n`;
      } else {
        text = await file.text();
      }
      await new Promise((r) => setTimeout(r, 800));
      const parsed = parseText(text);
      setPreview(parsed);
    } catch {
      setError("파일을 읽는 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleRegister() {
    if (!preview) return;
    const newProject: BusinessProject = {
      id: `BH-${preview.year ?? new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      name: preview.name ?? "신규 사업",
      year: preview.year ?? new Date().getFullYear(),
      region: preview.region ?? "미상",
      type: preview.type ?? "미상",
      status: "계획중",
      period: preview.period ?? "",
      budget: preview.budget ?? 0,
      spent: 0,
      vendor: preview.vendor ?? "미상",
      vendorEmail: "",
      department: "공원녹지과",
      summary: `${preview.name ?? "신규 사업"} — 설계서 기반 자동 등록`,
      treeCount: preview.treeCount ?? 0,
      mapCount: 0,
      connectedTrees: [],
      contractors: preview.vendor ? [{ name: preview.vendor, email: "", initial: preview.vendor.slice(0, 1) }] : [],
      completionPhotos: [],
    };
    onRegister(newProject);
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-indigo-600" />
            사업설계서 등록
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_1fr] gap-5 mt-2">
          {/* 좌측: 업로드 */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold mb-1">파일 업로드</p>
              <p className="text-[11px] text-muted-foreground">PDF, TXT, MD 파일을 업로드하면 사업 정보를 자동으로 추출합니다.</p>
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">클릭하여 파일 선택<br /><span className="text-[10px]">PDF · TXT · MD</span></p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            {fileName && (
              <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                <span className="truncate">{fileName}</span>
              </div>
            )}
            {analyzing && (
              <div className="text-xs text-indigo-600 flex items-center gap-2 animate-pulse">
                <div className="h-3 w-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                분석 중...
              </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          {/* 우측: 미리보기 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold">자동 추출 미리보기</p>
            {!preview ? (
              <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/40 h-48 flex items-center justify-center text-xs text-muted-foreground">
                파일 업로드 후 표시됩니다
              </div>
            ) : (
              <div className="rounded-xl border divide-y text-xs">
                {[
                  ["사업명", preview.name],
                  ["연도", preview.year],
                  ["지역", preview.region],
                  ["사업유형", preview.type],
                  ["사업상태", preview.status],
                  ["공기", preview.period],
                  ["총예산", preview.budget ? fmtFull(preview.budget as number) : "미상"],
                  ["집행액", "0원"],
                  ["수목 수", preview.treeCount ? `${preview.treeCount}주` : "미상"],
                  ["시행사", preview.vendor],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex gap-2 px-3 py-1.5">
                    <span className="text-muted-foreground w-16 shrink-0">{label}</span>
                    <span className="font-medium truncate">{String(value ?? "미상")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!preview}
            onClick={handleRegister}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            사업 등록
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
export default function BusinessHistory() {
  const [projects, setProjects] = useState<BusinessProject[]>(() => loadFromStorage());
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState<number[]>([]);
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus[]>([]);
  const [selectedProject, setSelectedProject] = useState<BusinessProject | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => { saveToStorage(projects); }, [projects]);

  // 필터 적용 + 정렬
  const filtered = sortProjects(
    projects.filter((p) => {
      if (search && !p.name.includes(search) && !p.vendor.includes(search) && !p.region.includes(search)) return false;
      if (yearFilter.length && !yearFilter.includes(p.year)) return false;
      if (regionFilter.length && !regionFilter.includes(p.region)) return false;
      if (typeFilter.length && !typeFilter.includes(p.type)) return false;
      if (statusFilter.length && !statusFilter.includes(p.status)) return false;
      return true;
    })
  );

  // 요약 통계
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent  = projects.reduce((s, p) => s + p.spent, 0);
  const spentRate   = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const inProgress  = projects.filter((p) => p.status === "진행중").length;
  const completed   = projects.filter((p) => p.status === "완료").length;

  function handleRegister(p: BusinessProject) {
    setProjects((prev) => {
      const next = [p, ...prev];
      saveToStorage(next);
      return next;
    });
  }

  function clearFilters() {
    setYearFilter([]);
    setRegionFilter([]);
    setTypeFilter([]);
    setStatusFilter([]);
  }

  const activeFilterCount = yearFilter.length + regionFilter.length + typeFilter.length + statusFilter.length;

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── 페이지 헤더 ── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
              사업이력
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">이천시 수목 관련 사업 이력 관리 및 조회</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="button-pdf-export">
              <FileText className="h-3.5 w-3.5" /> PDF 출력
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="button-excel-export">
              <FileSpreadsheet className="h-3.5 w-3.5" /> 엑셀 다운로드
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="button-report">
              <BarChart3 className="h-3.5 w-3.5" /> 보고서 생성
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setUploadOpen(true)}
              data-testid="button-upload-design"
            >
              <Upload className="h-3.5 w-3.5" /> 사업설계서 등록
            </Button>
          </div>
        </div>

        {/* ── 상단 요약 카드 ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground mb-1">전체 사업</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100" data-testid="stat-total">{projects.length}</p>
              <p className="text-[10px] text-muted-foreground">건</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground mb-1">진행 중</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="stat-inprogress">{inProgress}</p>
              <p className="text-[10px] text-muted-foreground">건</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground mb-1">완료</p>
              <p className="text-2xl font-bold text-green-600" data-testid="stat-completed">{completed}</p>
              <p className="text-[10px] text-muted-foreground">건</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground mb-1">총 사업 예산</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100" data-testid="stat-budget">{fmt(totalBudget)}</p>
              <p className="text-[10px] text-muted-foreground">원</p>
            </CardContent>
          </Card>
          {/* 집행률: 다른 카드보다 크게 표시 */}
          <Card className="border-0 shadow-sm bg-indigo-50 dark:bg-indigo-900/20 col-span-1">
            <CardContent className="p-4">
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mb-1">총 집행률</p>
              <p className="text-3xl font-black text-indigo-700 dark:text-indigo-300" data-testid="stat-spent-rate">{spentRate}%</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground mb-1">총 집행액</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100" data-testid="stat-spent">{fmt(totalSpent)}</p>
              <p className="text-[10px] text-muted-foreground">원</p>
            </CardContent>
          </Card>
        </div>

        {/* ── 목록 + 필터 통합 영역 ── */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-sm font-bold">사업이력 목록</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {/* 검색 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="사업명 · 시행사 · 지역 검색"
                    data-testid="input-search"
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-white dark:bg-slate-900 w-52 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                {/* 필터 토글 */}
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  data-testid="button-filter-toggle"
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
                    activeFilterCount > 0 ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  필터
                  {activeFilterCount > 0 && (
                    <span className="bg-indigo-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
                  )}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", filterOpen && "rotate-180")} />
                </button>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5" data-testid="button-filter-clear">
                    <X className="h-3 w-3" /> 초기화
                  </button>
                )}
              </div>
            </div>

            {/* 필터 패널 */}
            {filterOpen && (
              <div className="mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                {/* 연도 */}
                <div>
                  <p className="font-semibold mb-1.5 text-[11px] text-muted-foreground">연도</p>
                  <div className="space-y-1">
                    {ALL_YEARS.map((y) => (
                      <label key={y} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={yearFilter.includes(y)}
                          onChange={() => setYearFilter(toggleArr(yearFilter, y))}
                          data-testid={`filter-year-${y}`}
                          className="rounded"
                        />
                        {y}년
                      </label>
                    ))}
                  </div>
                </div>
                {/* 지역 */}
                <div>
                  <p className="font-semibold mb-1.5 text-[11px] text-muted-foreground">지역</p>
                  <div className="space-y-1">
                    {ALL_REGIONS.map((r) => (
                      <label key={r} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regionFilter.includes(r)}
                          onChange={() => setRegionFilter(toggleArr(regionFilter, r))}
                          data-testid={`filter-region-${r}`}
                          className="rounded"
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
                {/* 사업유형 */}
                <div>
                  <p className="font-semibold mb-1.5 text-[11px] text-muted-foreground">사업유형</p>
                  <div className="space-y-1">
                    {ALL_TYPES.map((t) => (
                      <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={typeFilter.includes(t)}
                          onChange={() => setTypeFilter(toggleArr(typeFilter, t))}
                          data-testid={`filter-type-${t}`}
                          className="rounded"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
                {/* 사업상태 */}
                <div>
                  <p className="font-semibold mb-1.5 text-[11px] text-muted-foreground">사업상태</p>
                  <div className="space-y-1">
                    {ALL_STATUSES.map((s) => (
                      <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(s)}
                          onChange={() => setStatusFilter(toggleArr(statusFilter, s))}
                          data-testid={`filter-status-${s}`}
                          className="rounded"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 활성 필터 칩 */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {yearFilter.map((y) => (
                  <span key={y} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {y}년 <button onClick={() => setYearFilter(toggleArr(yearFilter, y))}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
                {regionFilter.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {r} <button onClick={() => setRegionFilter(toggleArr(regionFilter, r))}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
                {typeFilter.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {t} <button onClick={() => setTypeFilter(toggleArr(typeFilter, t))}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
                {statusFilter.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {s} <button onClick={() => setStatusFilter(toggleArr(statusFilter, s))}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </CardHeader>

          {/* ── 목록 테이블 ── */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="max-h-[480px] overflow-y-auto select-none" style={{ cursor: "default" }}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b bg-slate-50 dark:bg-slate-800/80">
                      {["사업명", "지역", "유형", "시행사", "공기", "예산", "집행률", "상태", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">
                          검색 결과가 없습니다
                        </td>
                      </tr>
                    ) : filtered.map((p) => {
                      const rate = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
                      return (
                        <tr
                          key={p.id}
                          data-testid={`row-project-${p.id}`}
                          onClick={() => setSelectedProject(p)}
                          className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{p.id} · {p.year}년</p>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{p.region}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.type}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.vendor}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[10px]">{p.period}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{fmt(p.budget)}</td>
                          <td className="px-4 py-3 min-w-[90px]">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${Math.min(rate, 100)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground w-7 shrink-0">{rate}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-4 py-2 border-t text-[10px] text-muted-foreground">
              총 {projects.length}건 중 {filtered.length}건 표시
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 모달들 ── */}
      {selectedProject && (
        <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onRegister={handleRegister} />
      )}
    </div>
  );
}
