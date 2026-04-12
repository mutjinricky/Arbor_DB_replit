# 스마트 수목 관리 (Smart Tree Management)

## Overview
A Korean-language smart tree management dashboard application for Icheon city (이천시). Built with React + TypeScript + Vite, using Tailwind CSS and shadcn/ui components.

## Architecture
- **Frontend only** — pure React SPA (no backend server)
- **Framework**: React 18 with TypeScript
- **Bundler**: Vite 5
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI)
- **Routing**: React Router DOM v6
- **State/Data**: TanStack React Query
- **Maps**: Mapbox GL / react-map-gl
- **Charts**: Recharts

## Project Structure
```
src/
  App.tsx                    — Root app with routing
  main.tsx                   — Entry point
  lib/
    riskCalculations.ts      — Tree risk (3-indicator MAX), pest DD, K-UTSI score calculators
    mapbox.ts                — Mapbox token
    utils.ts                 — Utility functions
  pages/
    Dashboard.tsx            — Main dashboard with KPIs, alerts, work notifications
    TreeInventory.tsx        — Tree map with filters, search, multi-mode view
    BusinessHistory.tsx      — 사업이력 page: admin table, summary cards, detail modal, file upload (replaces Projects)
    RequestForm.tsx          — Work request form
    PestCalendar.tsx         — 방제 달력 (degree-day pest calendar)
  components/
    TreeLayer.jsx            — Mapbox GL layer with risk/pest/soil color modes
    TreeProfileModal.tsx     — Tree detail modal with 6 tabs incl. 편집
    WorkNotifications.tsx    — Work start/end notification system + CSV export
    SoilSummaryCard.tsx      — K-UTSI grade distribution summary
    PestAlertBanner.tsx      — D-30/D-7 pest control countdown alerts
    AlertsList.tsx           — High-risk tree alerts
    ...ui/                   — shadcn/ui components
public/
  data/
    trees.geojson            — GeoJSON for map rendering
    trees.json               — Full tree data (2985 trees)
    tree_images/             — Tree photos
```

## Pages
- `/` — Dashboard (대시보드)
- `/tree-inventory` — Tree inventory with map filters (수목 재고)
- `/pest-calendar` — 방제 달력 (degree-day pest scheduling)
- `/projects` — Projects list (프로젝트)
- `/projects/:id` — Project detail with connected trees
- `/projects/create` — Create project
- `/projects/request` — Request form

## Key Features Implemented
### C-01: Map Filter
- Map mode tabs: 수목 위험도 / 해충 방제 / 토양
- Filter panel: species, IQTRI risk grade, pest grade, soil grade
- Tree ID search with map zoom-to functionality
- Map and list stay in sync with filters

### C-02: Complaint Log
- New "민원" tab in TreeProfileModal
- Shows complaint count badge in tab header
- Displays dated complaint list with status (처리중/완료)

### C-03: Work Start/End Notifications
- WorkNotifications component with "official" and "worker" roles
- Worker can start/end work with memo
- Official sees notification feed and can confirm alerts
- Auto-end at 17:00 via setTimeout
- State persisted in localStorage

### C-04: IQTRI Risk Score Auto-calculation
- `calculateIQTRI()` in riskCalculations.ts (D × T × I formula)
- `calculatePestControl()` — degree-day model for pest control timing
- `calculateSoilScore()` — K-UTSI: 6항목(H·TEX·SOM·pH·EC·CEC) 동일가중치 30점→100점 환산; A≥90/B≥75/C≥60/D≥40/E<40
- TreeLayer colors driven by calculated grades

### C-05: 방제 달력 (Pest Calendar)
- `/pest-calendar` route — 4-stage status system (정상/예찰/준비/실행) based on DD %
- 5-milestone date cards: 예찰 시작(70%), 집중예찰(85~90%), 방제 시작(90%), 최적(100%), 종료(107.5%)
- **복숭아순나방 다세대 카드**: 1~4세대, 화살표로 세대 전환, 가장 근접한 세대 우선 표시
- **방제기간 막대바** (collapsible, 맨 아래): 해충 탭 + 세대 체크박스 + 가로 Gantt 바
  - 연노랑(예찰) / 진노랑(집중예찰) / 주황→빨강 그라디언트(방제시기) / 연빨강(종료구간)
  - 월 눈금 + 5개 마일스톤 상세 날짜 레이블 + 오늘 날짜 파란선
- 월별 방제 시기표 (PDF 8항 기준: ● ◎ ○ 표시)
- TreeLayer: circle-sort-key로 위험도 높은 수목이 지도 위쪽 렌더링

### C-06: 대시보드 K-UTSI 토양 요약
- `SoilSummaryCard` loads all 2985 trees, computes grade distribution (A–E)
- Bar chart + worst-5 table in Dashboard Row 3

### C-07: 방제 D-30/D-7 알림 배너
- `PestAlertBanner` shows dismissable banners on dashboard
- 3 severity levels: 🚨 긴급 (≤7d), ⚠️ 주의 (≤30d), ℹ️ 안내 (≤60d)

### C-08: 작업 이력 CSV 내보내기
- CSV Download button in WorkNotifications official role card header
- UTF-8 BOM for Korean Excel compatibility

### C-09: 수목 데이터 현장 편집 UI
- New "편집" tab in TreeProfileModal (6 tabs total)
- Fields: 수고, 흉고직경, 상처면적, 공동깊이, 설해피해, 영양공급필요
- Override persisted to localStorage keyed by treeId

### C-10: 프로젝트 수목 연결
- ProjectDetail shows "연결 수목" card with tree IDs + coords
- Add/remove extra trees by ID; "프로필" button opens TreeProfileModal

## Running
- Dev server: `npm run dev` (port 5000)
- Build: `npm run build`

## Key Configuration
- `vite.config.ts` — host `0.0.0.0`, port `5000`, `allowedHosts: true`
- Mapbox token: `VITE_MAPBOX_TOKEN` env variable
