import { useState, useEffect, useRef } from "react";
import {
  Search, Filter, X, ChevronRight, FileText, Download, FileSpreadsheet,
  BarChart3, Upload, MapPin, TreePine, Image, Building2, Calendar,
  Wallet, TrendingUp, CheckCircle2, Clock3, AlertCircle,
  ChevronLeft, ChevronDown, FolderDown, Pencil, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  location?: string;
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
    name: "이천시 장호원읍 노거수 생육기반 개선사업",
    year: 2024,
    region: "마을",
    location: "경기도 이천시 장호원읍",
    type: "토양개량",
    status: "진행중",
    period: "2026-03-01 ~ 2026-06-30",
    budget: 45000000,
    spent: 32000000,
    vendor: "화산나무병원",
    vendorEmail: "hwasan@treehospital.co.kr",
    department: "공원녹지과",
    summary: "이천시 장호원읍 일원 노거수의 생육환경 개선을 위한 토양 개량 및 생육기반 조성 사업",
    treeCount: 180,
    mapCount: 3,
    connectedTrees: [
      { id: "T-0412", coord: "37.4323, 127.4392", photoUrl: "" },
      { id: "T-0413", coord: "37.4325, 127.4395", photoUrl: "" },
      { id: "T-0419", coord: "37.4330, 127.4401", photoUrl: "" },
    ],
    contractors: [
      { name: "화산나무병원", email: "hwasan@treehospital.co.kr", initial: "화" },
    ],
    completionPhotos: [],
  },
  {
    id: "BH-2024-002",
    name: "이천시 신둔면 가로수 전정 및 수형조절 사업",
    year: 2024,
    region: "도로",
    location: "경기도 이천시 신둔면",
    type: "가지치기",
    status: "계획중",
    period: "2026-07-01 ~ 2026-09-30",
    budget: 28000000,
    spent: 0,
    vendor: "강산나무병원",
    vendorEmail: "gangsan@treehospital.co.kr",
    department: "공원녹지과",
    summary: "이천시 신둔면 관내 가로수 전정 및 수형조절을 통한 미관 개선 및 통행 안전 확보",
    treeCount: 60,
    mapCount: 2,
    connectedTrees: [
      { id: "T-0201", coord: "37.4290, 127.4350", photoUrl: "" },
      { id: "T-0205", coord: "37.4292, 127.4352", photoUrl: "" },
    ],
    contractors: [
      { name: "강산나무병원", email: "gangsan@treehospital.co.kr", initial: "강" },
    ],
    completionPhotos: [],
  },
  {
    id: "BH-2024-003",
    name: "이천시 도립리 솔껍질깍지벌레 방제사업",
    year: 2024,
    region: "마을",
    location: "경기도 이천시 설성면 도립리",
    type: "병해충방제",
    status: "완료",
    period: "2026-02-01 ~ 2026-03-31",
    budget: 18000000,
    spent: 17500000,
    vendor: "한수나무병원",
    vendorEmail: "hansu@treehospital.co.kr",
    department: "산림공원과",
    summary: "이천시 도립리 일원 소나무류 솔껍질깍지벌레 방제를 통한 수목 피해 예방",
    treeCount: 340,
    mapCount: 1,
    connectedTrees: [
      { id: "T-0555", coord: "37.4400, 127.4450", photoUrl: "" },
      { id: "T-0560", coord: "37.4405, 127.4455", photoUrl: "" },
      { id: "T-0562", coord: "37.4408, 127.4458", photoUrl: "" },
    ],
    contractors: [
      { name: "한수나무병원", email: "hansu@treehospital.co.kr", initial: "한" },
    ],
    completionPhotos: [
      { id: "CP-001", label: "방제 전 현장", photoUrl: "", date: "2024-02-01" },
      { id: "CP-002", label: "방제 작업 중", photoUrl: "", date: "2024-02-15" },
      { id: "CP-003", label: "방제 완료 현장", photoUrl: "", date: "2024-03-31" },
    ],
  },
  {
    id: "BH-2023-001",
    name: "이천시 산수유마을 안전진단 사업",
    year: 2023,
    region: "마을",
    location: "경기도 이천시 백사면 도립리",
    type: "정밀진단",
    status: "완료",
    period: "2025-10-01 ~ 2025-11-30",
    budget: 12000000,
    spent: 11800000,
    vendor: "솔향나무병원",
    vendorEmail: "solhyang@treehospital.co.kr",
    department: "산림공원과",
    summary: "이천시 산수유마을 일원 노거수 및 관상수목 안전진단 실시, 위험도 등급 산정 및 처리 계획 수립",
    treeCount: 35,
    mapCount: 2,
    connectedTrees: [
      { id: "T-0721", coord: "37.4180, 127.4280", photoUrl: "" },
      { id: "T-0722", coord: "37.4182, 127.4282", photoUrl: "" },
    ],
    contractors: [
      { name: "솔향나무병원", email: "solhyang@treehospital.co.kr", initial: "솔" },
    ],
    completionPhotos: [
      { id: "CP-004", label: "진단 현장", photoUrl: "", date: "2023-10-01" },
      { id: "CP-005", label: "진단 완료", photoUrl: "", date: "2023-11-30" },
    ],
  },
  {
    id: "BH-2023-002",
    name: "이천시 백사면 수세회복 사업",
    year: 2023,
    region: "마을",
    location: "경기도 이천시 백사면",
    type: "시비관리",
    status: "완료",
    period: "2025-05-01 ~ 2025-08-31",
    budget: 35000000,
    spent: 34200000,
    vendor: "한산나무병원",
    vendorEmail: "hansan@treehospital.co.kr",
    department: "공원녹지과",
    summary: "이천시 백사면 관내 쇠약 수목 수세회복을 위한 영양 시비 및 토양 환경 개선 처리",
    treeCount: 25,
    mapCount: 2,
    connectedTrees: [
      { id: "T-0341", coord: "37.4360, 127.4420", photoUrl: "" },
      { id: "T-0345", coord: "37.4365, 127.4425", photoUrl: "" },
    ],
    contractors: [
      { name: "한산나무병원", email: "hansan@treehospital.co.kr", initial: "한" },
    ],
    completionPhotos: [
      { id: "CP-006", label: "시비 전", photoUrl: "", date: "2023-05-01" },
      { id: "CP-007", label: "시비 작업 중", photoUrl: "", date: "2023-07-15" },
      { id: "CP-008", label: "최종 완료", photoUrl: "", date: "2023-08-31" },
    ],
  },
  {
    id: "BH-2023-003",
    name: "이천시 관고동 위험수목 제거사업",
    year: 2023,
    region: "도로",
    location: "경기도 이천시 관고동",
    type: "위험목제거",
    status: "완료",
    period: "2025-04-01 ~ 2025-05-31",
    budget: 8000000,
    spent: 7800000,
    vendor: "나무잇나무병원",
    vendorEmail: "namuit@treehospital.co.kr",
    department: "공원녹지과",
    summary: "이천시 관고동 일원 도로변 위험수목 제거 및 안전조치, 시민 안전 확보",
    treeCount: 520,
    mapCount: 4,
    connectedTrees: [
      { id: "T-0801", coord: "37.4150, 127.4200", photoUrl: "" },
      { id: "T-0805", coord: "37.4155, 127.4205", photoUrl: "" },
    ],
    contractors: [
      { name: "나무잇나무병원", email: "namuit@treehospital.co.kr", initial: "나" },
    ],
    completionPhotos: [
      { id: "CP-009", label: "작업 전 현장", photoUrl: "", date: "2023-04-15" },
      { id: "CP-010", label: "작업 완료", photoUrl: "", date: "2023-05-31" },
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

const STORAGE_KEY = "dryad_business_history_v4";
const ACT_STATUS_KEY = "dryad_activity_status_v1";

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

// ── 활동상태 유틸 ──────────────────────────────────────────────────────────────
type ActivityStatus = "착공" | "작업중" | "작업완료" | "준공";
const ALL_ACTIVITY_STATUSES: ActivityStatus[] = ["착공", "작업중", "작업완료", "준공"];

function defaultActivityStatus(status: ProjectStatus): ActivityStatus {
  if (status === "진행중") return "작업중";
  if (status === "완료") return "준공";
  return "착공";
}

function loadActivityStatuses(): Record<string, ActivityStatus> {
  try {
    const raw = localStorage.getItem(ACT_STATUS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, ActivityStatus>;
  } catch {}
  return {};
}

function saveActivityStatuses(s: Record<string, ActivityStatus>) {
  try { localStorage.setItem(ACT_STATUS_KEY, JSON.stringify(s)); } catch {}
}

const ACT_STATUS_STYLE: Record<ActivityStatus, string> = {
  착공:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  작업중: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  작업완료: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  준공:   "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

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
  onUpdate,
}: {
  project: BusinessProject;
  onClose: () => void;
  onUpdate?: (updated: BusinessProject) => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [selectedTree, setSelectedTree] = useState<ConnectedTree | null>(null);
  const spentRate = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;

  // 활동상태 관리
  const [actStatus, setActStatus] = useState<ActivityStatus>(() => {
    const stored = loadActivityStatuses();
    return stored[project.id] ?? defaultActivityStatus(project.status);
  });

  function handleActStatusChange(s: ActivityStatus) {
    setActStatus(s);
    const stored = loadActivityStatuses();
    const updated = { ...stored, [project.id]: s };
    saveActivityStatuses(updated);
    // 준공 선택 시 사업 상태를 "완료"로 자동 전환
    if (s === "준공" && project.status !== "완료") {
      onUpdate?.({ ...project, status: "완료" });
    }
    // 착공/작업중/작업완료 선택 시 완료→진행중으로 복원
    if (s !== "준공" && project.status === "완료") {
      onUpdate?.({ ...project, status: "진행중" });
    }
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {/* 헤더 */}
          <div className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">상세이력</p>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[11px] font-mono text-muted-foreground">{project.id}</span>
                  <StatusBadge status={project.status} />
                  {project.location && (
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />{project.location}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold leading-tight">{project.name}</h2>
                <p className="text-xs text-muted-foreground mt-1">{project.summary}</p>
              </div>
            </div>

            {/* 활동상태 변경 바 */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground font-medium shrink-0">활동상태:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ALL_ACTIVITY_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleActStatusChange(s)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-semibold border transition-all",
                      actStatus === s
                        ? `${ACT_STATUS_STYLE[s]} border-transparent shadow-sm scale-105`
                        : "border-border text-muted-foreground hover:border-indigo-300 hover:text-foreground"
                    )}
                    data-testid={`button-act-status-detail-${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {actStatus === "준공" && project.status !== "완료" && (
                <span className="text-[10px] text-indigo-600 italic">준공 선택 시 사업 상태가 '완료'로 변경됩니다</span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
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

            {/* ① 사업 지도 */}
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" /> 사업 지도
              </p>
              <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/40 h-52 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-8 w-8 opacity-30" />
                <p className="text-sm">지도 표시 영역</p>
                <p className="text-xs opacity-60">이천시 {project.region} 일대 · {project.treeCount}주 · 구역 {project.mapCount}개</p>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
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

            <Separator />

            {/* ② 연결 수목 */}
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <TreePine className="h-3.5 w-3.5 text-green-600" /> 연결 수목
                <span className="text-[10px] text-muted-foreground font-normal">({project.connectedTrees.length}주)</span>
              </p>
              {project.connectedTrees.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border rounded-xl">연결된 수목이 없습니다</div>
              ) : (
                <div className="space-y-2">
                  {project.connectedTrees.map((t) => (
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
            </div>

            <Separator />

            {/* ③ 준공사진 */}
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-sky-500" /> 준공사진
                <span className="text-[10px] text-muted-foreground font-normal">({project.completionPhotos.length}장)</span>
              </p>
              {project.completionPhotos.length === 0 ? (
                <div className="rounded-xl border bg-slate-50 dark:bg-slate-800/40 h-36 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Image className="h-7 w-7 opacity-30" />
                  <p className="text-sm">준공사진 없음</p>
                </div>
              ) : (
                <div className="space-y-2">
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
                  <div className="rounded-xl border overflow-hidden">
                    {project.completionPhotos[photoIdx].photoUrl ? (
                      <img
                        src={project.completionPhotos[photoIdx].photoUrl}
                        alt={project.completionPhotos[photoIdx].label}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Image className="h-7 w-7 opacity-30" />
                        <p className="text-xs">사진 없음</p>
                      </div>
                    )}
                    <div className="p-3 border-t bg-white dark:bg-slate-900 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold">{project.completionPhotos[photoIdx].label}</p>
                        <p className="text-[10px] text-muted-foreground">{project.completionPhotos[photoIdx].date}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))} disabled={photoIdx === 0}
                          className="text-xs flex items-center gap-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronLeft className="h-3.5 w-3.5" /> 이전
                        </button>
                        <span className="text-[10px] text-muted-foreground">{photoIdx + 1} / {project.completionPhotos.length}</span>
                        <button onClick={() => setPhotoIdx((i) => Math.min(project.completionPhotos.length - 1, i + 1))}
                          disabled={photoIdx === project.completionPhotos.length - 1}
                          className="text-xs flex items-center gap-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                          다음 <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* ④ 계약업체 */}
            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" /> 지정된 계약업체
              </p>
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
            </div>

            <Separator />

            {/* 기본 정보 */}
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

// ── 사업이력 편집 팝업 ─────────────────────────────────────────────────────────
function EditProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: BusinessProject;
  onClose: () => void;
  onSave: (updated: BusinessProject) => void;
}) {
  const [form, setForm] = useState<BusinessProject>({ ...project });

  function set<K extends keyof BusinessProject>(key: K, value: BusinessProject[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(form);
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[560px] w-full rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">사업 정보 편집</DialogTitle>
          <p className="text-[11px] text-muted-foreground">수정 후 저장을 누르면 목록에 반영됩니다.</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-1">
          {/* 사업명 — 전체 너비 */}
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px]">사업명</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-8 text-xs"
              data-testid="input-edit-name"
            />
          </div>

          {/* 상세 위치 — 전체 너비 */}
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px]">상세 위치 (행정구역)</Label>
            <Input
              value={form.location ?? ""}
              onChange={(e) => set("location", e.target.value)}
              placeholder="예: 경기도 이천시 장호원읍"
              className="h-8 text-xs"
              data-testid="input-edit-location"
            />
          </div>

          {/* 연도 */}
          <div className="space-y-1">
            <Label className="text-[11px]">연도</Label>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => set("year", Number(e.target.value))}
              className="h-8 text-xs"
              data-testid="input-edit-year"
            />
          </div>

          {/* 지역 */}
          <div className="space-y-1">
            <Label className="text-[11px]">지역</Label>
            <Select value={form.region} onValueChange={(v) => set("region", v)}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-edit-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_REGIONS.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 사업유형 */}
          <div className="space-y-1">
            <Label className="text-[11px]">사업유형</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 사업상태 */}
          <div className="space-y-1">
            <Label className="text-[11px]">사업상태</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as ProjectStatus)}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* 공기 */}
          <div className="space-y-1">
            <Label className="text-[11px]">공기</Label>
            <Input
              value={form.period}
              onChange={(e) => set("period", e.target.value)}
              placeholder="예: 2024-03-01 ~ 2024-06-30"
              className="h-8 text-xs"
              data-testid="input-edit-period"
            />
          </div>

          {/* 총예산 (원) */}
          <div className="space-y-1">
            <Label className="text-[11px]">총예산 (원)</Label>
            <Input
              type="number"
              value={form.budget}
              onChange={(e) => set("budget", Number(e.target.value))}
              className="h-8 text-xs"
              data-testid="input-edit-budget"
            />
          </div>

          {/* 집행액 (원) */}
          <div className="space-y-1">
            <Label className="text-[11px]">집행액 (원)</Label>
            <Input
              type="number"
              value={form.spent}
              onChange={(e) => set("spent", Number(e.target.value))}
              className="h-8 text-xs"
              data-testid="input-edit-spent"
            />
          </div>

          {/* 시행사 */}
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px]">시행사</Label>
            <Input
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              className="h-8 text-xs"
              data-testid="input-edit-vendor"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-2">
          <Button variant="outline" size="sm" className="text-xs px-4" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            className="text-xs px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSave}
            data-testid="button-save-edit"
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

  const previewFields: [string, string][] = preview ? [
    ["사업명",   String(preview.name ?? "미상")],
    ["연도",     String(preview.year ?? "미상")],
    ["지역",     String(preview.region ?? "미상")],
    ["사업유형", String(preview.type ?? "미상")],
    ["사업상태", String(preview.status ?? "계획중")],
    ["공기",     String(preview.period || "미상")],
    ["총예산",   preview.budget ? fmtFull(preview.budget as number) : "₩0.0M"],
    ["집행액",   "₩0.0M"],
    ["수목 수",  preview.treeCount ? `${preview.treeCount}주` : "0주"],
  ] : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[660px] w-full p-0 gap-0 overflow-hidden rounded-2xl">
        {/* 헤더 */}
        <div className="px-6 pt-5 pb-4 border-b">
          <p className="text-[11px] text-muted-foreground mb-0.5">사업설계서 등록</p>
          <DialogTitle className="text-base font-semibold leading-tight">
            설계서 파일 업로드 기반 자동 등록
          </DialogTitle>
        </div>

        {/* 본문 2단 */}
        <div className="grid grid-cols-2 gap-4 p-5">
          {/* ── 좌측: 파일 업로드 카드 ── */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 flex flex-col gap-3">
            <div>
              <p className="text-[13px] font-semibold mb-0.5">파일 업로드</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                사업설계서 PDF 또는 TXT 파일을 업로드하면 시스템이 내용을 읽어 목록에 필요한 정보를 자동 추출합니다.
              </p>
            </div>

            {/* 드래그 업로드 박스 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors"
            >
              <Upload className="h-7 w-7 text-slate-400" />
              <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300 text-center">설계서 파일 선택</p>
              <p className="text-[10px] text-muted-foreground">PDF, TXT 지원</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />

            {/* 선택 파일명 */}
            {fileName ? (
              <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed break-all">
                <span className="text-muted-foreground">선택 파일: </span>{fileName}
              </div>
            ) : (
              <div className="h-[18px]" />
            )}

            {analyzing && (
              <div className="text-[11px] text-indigo-600 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                분석 중...
              </div>
            )}
            {error && <p className="text-[11px] text-red-600">{error}</p>}
          </div>

          {/* ── 우측: 자동 추출 미리보기 카드 ── */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 flex flex-col gap-3">
            <p className="text-[13px] font-semibold flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              자동 추출 미리보기
            </p>

            {/* 분석 상태 배지 */}
            <div className={`rounded-lg px-3 py-2 text-[11px] font-medium flex items-center gap-2 ${
              preview
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-slate-50 dark:bg-slate-800 text-muted-foreground"
            }`}>
              <div className={`h-2 w-2 rounded-full ${preview ? "bg-green-500" : "bg-slate-300"}`} />
              {preview ? "파일 분석 완료" : "파일을 업로드하면 항목이 추출됩니다"}
            </div>

            {/* 추출 항목 그리드 */}
            {preview ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1">
                {previewFields.map(([label, value]) => (
                  <div key={label} className={label === "사업명" ? "col-span-2" : ""}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-[13px] font-medium leading-snug break-words">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground py-8">
                추출 항목이 여기에 표시됩니다
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="outline" size="sm" className="text-xs px-4" onClick={onClose}>취소</Button>
          <Button
            size="sm"
            disabled={!preview}
            onClick={handleRegister}
            className="text-xs px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
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
  const [editingProject, setEditingProject] = useState<BusinessProject | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => { saveToStorage(projects); }, [projects]);

  // 대시보드 최근 활동 클릭 시 자동 오픈
  useEffect(() => {
    const pendingId = sessionStorage.getItem("open_project_id");
    if (pendingId) {
      sessionStorage.removeItem("open_project_id");
      const found = projects.find((p) => p.id === pendingId);
      if (found) setSelectedProject(found);
    }
  }, []);

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

  function handleSaveEdit(updated: BusinessProject) {
    setProjects((prev) => {
      const next = prev.map((p) => p.id === updated.id ? updated : p);
      saveToStorage(next);
      return next;
    });
  }

  function handleProjectUpdate(updated: BusinessProject) {
    setProjects((prev) => {
      const next = prev.map((p) => p.id === updated.id ? updated : p);
      saveToStorage(next);
      return next;
    });
    // selectedProject가 열려 있는 경우 동기화
    setSelectedProject((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  function handleConfirmDelete(id: string) {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveToStorage(next);
      return next;
    });
    setDeletingProjectId(null);
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
                      {["사업명", "지역", "유형", "시행사", "공기", "예산", "상태", "설계서", "관리"].map((h) => (
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
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.location || p.region}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.type}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.vendor}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-[10px]">{p.period}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{fmt(p.budget)}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); }}
                              data-testid={`button-download-${p.id}`}
                              title="설계서 다운로드"
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg border border-transparent hover:border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            >
                              <FolderDown className="h-3.5 w-3.5" />
                              설계서
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingProject(p); }}
                                data-testid={`button-edit-${p.id}`}
                                title="편집"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeletingProjectId(p.id); }}
                                data-testid={`button-delete-${p.id}`}
                                title="삭제"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
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
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={handleProjectUpdate}
        />
      )}
      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onRegister={handleRegister} />
      )}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSaveEdit}
        />
      )}
      <AlertDialog open={!!deletingProjectId} onOpenChange={(open) => { if (!open) setDeletingProjectId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사업 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 사업을 삭제하면 복구할 수 없습니다. 정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletingProjectId && handleConfirmDelete(deletingProjectId)}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
