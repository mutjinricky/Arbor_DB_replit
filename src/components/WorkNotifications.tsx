import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlayCircle,
  StopCircle,
  CheckCircle2,
  Clock,
  Bell,
  User,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

export interface WorkEvent {
  id: string;
  type: "start" | "end" | "auto_end";
  timestamp: string;
  projectName: string;
  workerName: string;
  memo: string;
  confirmed: boolean;
  confirmedAt?: string;
}

interface ActiveWork {
  id: string;
  projectName: string;
  workerName: string;
  startTime: string;
  startMemo: string;
}

const STORAGE_KEY_EVENTS = "work_notifications";
const STORAGE_KEY_ACTIVE = "active_work";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAutoEndTime(startTime: string): Date {
  const d = new Date(startTime);
  d.setHours(17, 0, 0, 0);
  if (d <= new Date(startTime)) d.setDate(d.getDate() + 1);
  return d;
}

interface WorkNotificationsProps {
  role?: "worker" | "official";
}

export function WorkNotifications({ role = "official" }: WorkNotificationsProps) {
  const [events, setEvents] = useState<WorkEvent[]>(() =>
    loadFromStorage<WorkEvent[]>(STORAGE_KEY_EVENTS, [])
  );
  const [activeWork, setActiveWork] = useState<ActiveWork | null>(() =>
    loadFromStorage<ActiveWork | null>(STORAGE_KEY_ACTIVE, null)
  );

  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [startMemo, setStartMemo] = useState("");
  const [endMemo, setEndMemo] = useState("");

  useEffect(() => {
    saveToStorage(STORAGE_KEY_EVENTS, events);
  }, [events]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_ACTIVE, activeWork);
  }, [activeWork]);

  useEffect(() => {
    if (!activeWork) return;
    const autoEnd = getAutoEndTime(activeWork.startTime);
    const now = new Date();
    const msUntil = autoEnd.getTime() - now.getTime();
    if (msUntil <= 0) {
      handleAutoEnd();
      return;
    }
    const timer = setTimeout(() => handleAutoEnd(), msUntil);
    return () => clearTimeout(timer);
  }, [activeWork]);

  const handleAutoEnd = () => {
    setActiveWork((current) => {
      if (!current) return null;
      const newEvent: WorkEvent = {
        id: Date.now().toString(),
        type: "auto_end",
        timestamp: new Date().toISOString(),
        projectName: current.projectName,
        workerName: current.workerName,
        memo: "자동 종료 (17:00)",
        confirmed: false,
      };
      setEvents((prev) => [newEvent, ...prev]);
      return null;
    });
  };

  const handleStartWork = () => {
    const now = new Date().toISOString();
    const work: ActiveWork = {
      id: Date.now().toString(),
      projectName: "경사리 도로 가지치기",
      workerName: "이담당 작업자",
      startTime: now,
      startMemo: startMemo || "작업 시작",
    };
    setActiveWork(work);

    const event: WorkEvent = {
      id: Date.now().toString(),
      type: "start",
      timestamp: now,
      projectName: work.projectName,
      workerName: work.workerName,
      memo: work.startMemo,
      confirmed: false,
    };
    setEvents((prev) => [event, ...prev]);
    setStartMemo("");
    setStartDialogOpen(false);
  };

  const handleEndWork = () => {
    if (!activeWork) return;
    const event: WorkEvent = {
      id: Date.now().toString(),
      type: "end",
      timestamp: new Date().toISOString(),
      projectName: activeWork.projectName,
      workerName: activeWork.workerName,
      memo: endMemo || "작업 완료",
      confirmed: false,
    };
    setEvents((prev) => [event, ...prev]);
    setActiveWork(null);
    setEndMemo("");
    setEndDialogOpen(false);
  };

  const handleConfirm = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, confirmed: true, confirmedAt: new Date().toISOString() }
          : e
      )
    );
  };

  const unconfirmedCount = events.filter((e) => !e.confirmed).length;

  const eventIcon = (type: WorkEvent["type"]) => {
    if (type === "start") return <PlayCircle className="h-4 w-4 text-success" />;
    if (type === "end") return <StopCircle className="h-4 w-4 text-destructive" />;
    return <AlertCircle className="h-4 w-4 text-warning" />;
  };

  const eventLabel = (type: WorkEvent["type"]) => {
    if (type === "start") return "작업 시작";
    if (type === "end") return "작업 종료";
    return "자동 종료";
  };

  const eventBadge = (e: WorkEvent) => {
    if (e.confirmed) return <Badge variant="success" className="text-xs">확인완료</Badge>;
    if (e.type === "auto_end") return <Badge variant="warning" className="text-xs">자동종료</Badge>;
    if (e.type === "start") return <Badge className="text-xs bg-success text-white">시작알림</Badge>;
    return <Badge variant="destructive" className="text-xs">종료알림</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          작업 알림 및 타임 기록
          {unconfirmedCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              미확인 {unconfirmedCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Work Status */}
        {activeWork ? (
          <div className="rounded-lg border border-success/40 bg-success/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <span className="text-sm font-semibold text-success">작업 진행 중</span>
              </div>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                자동종료 17:00
              </Badge>
            </div>
            <p className="text-sm font-medium">{activeWork.projectName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{activeWork.workerName}</span>
              <span>·</span>
              <span>시작: {formatTime(activeWork.startTime)}</span>
            </div>
            {activeWork.startMemo && (
              <p className="text-xs text-muted-foreground italic">"{activeWork.startMemo}"</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
            현재 진행 중인 작업 없음
          </div>
        )}

        {/* Worker Buttons */}
        {role === "worker" && (
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2"
              variant="default"
              disabled={!!activeWork}
              onClick={() => setStartDialogOpen(true)}
              data-testid="button-work-start"
            >
              <PlayCircle className="h-4 w-4" />
              작업 시작
            </Button>
            <Button
              className="flex-1 gap-2"
              variant="destructive"
              disabled={!activeWork}
              onClick={() => setEndDialogOpen(true)}
              data-testid="button-work-end"
            >
              <StopCircle className="h-4 w-4" />
              작업 종료
            </Button>
          </div>
        )}

        <Separator />

        {/* Notification Feed */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            알림 이력 (최근 5건)
          </p>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">알림 없음</p>
          ) : (
            events.slice(0, 5).map((e) => (
              <div
                key={e.id}
                className={`rounded-lg border p-3 space-y-1 text-sm ${
                  !e.confirmed ? "border-primary/30 bg-primary/5" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {eventIcon(e.type)}
                    <span className="font-medium">{eventLabel(e.type)}</span>
                  </div>
                  {eventBadge(e)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {e.projectName} · {e.workerName}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatTime(e.timestamp)}</span>
                  {e.type === "auto_end" && (
                    <span className="text-xs text-warning">종료방식: 자동종료(17:00)</span>
                  )}
                </div>
                {e.memo && (
                  <p className="text-xs italic text-muted-foreground">"{e.memo}"</p>
                )}
                {!e.confirmed && role === "official" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-1 h-7 text-xs gap-1"
                    onClick={() => handleConfirm(e.id)}
                    data-testid={`button-confirm-${e.id}`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    확인
                  </Button>
                )}
                {e.confirmed && e.confirmedAt && (
                  <p className="text-xs text-muted-foreground">
                    확인: {formatTime(e.confirmedAt)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Start Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-success" />
              작업 시작
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">시작 메모 (선택)</p>
            <Textarea
              placeholder="예: 112번 나무 긴급 가지치기 시작"
              value={startMemo}
              onChange={(e) => setStartMemo(e.target.value)}
              rows={3}
              data-testid="textarea-start-memo"
            />
            <p className="text-xs text-muted-foreground">
              작업을 시작하면 공무원에게 알림이 전송됩니다. 당일 17:00에 자동 종료됩니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>취소</Button>
            <Button onClick={handleStartWork} className="gap-2">
              <PlayCircle className="h-4 w-4" />
              작업 시작
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Dialog */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-destructive" />
              작업 종료
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">종료 메모 (선택)</p>
            <Textarea
              placeholder="예: 1차 가지치기 완료"
              value={endMemo}
              onChange={(e) => setEndMemo(e.target.value)}
              rows={3}
              data-testid="textarea-end-memo"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleEndWork} className="gap-2">
              <StopCircle className="h-4 w-4" />
              작업 종료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
