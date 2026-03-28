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
    riskCalculations.ts      — IQTRI, pest DD, K-UTSI score calculators
    mapbox.ts                — Mapbox token
    utils.ts                 — Utility functions
  pages/
    Dashboard.tsx            — Main dashboard with KPIs, alerts, work notifications
    TreeInventory.tsx        — Tree map with filters, search, multi-mode view
    Projects.tsx             — Projects list
    ProjectDetail.tsx        — Project detail
    CreateProject.tsx        — Create project form
    RequestForm.tsx          — Work request form
  components/
    TreeLayer.jsx            — Mapbox GL layer with risk/pest/soil color modes
    TreeProfileModal.tsx     — Tree detail modal with complaint log tab
    WorkNotifications.tsx    — Work start/end notification system (C-03)
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
- `/projects` — Projects list (프로젝트)
- `/projects/:id` — Project detail
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
- `calculateSoilScore()` — K-UTSI simulation
- TreeLayer colors driven by calculated grades

## Running
- Dev server: `npm run dev` (port 5000)
- Build: `npm run build`

## Key Configuration
- `vite.config.ts` — host `0.0.0.0`, port `5000`, `allowedHosts: true`
- Mapbox token: `VITE_MAPBOX_TOKEN` env variable
