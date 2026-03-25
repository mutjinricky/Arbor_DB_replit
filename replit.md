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
  App.tsx          — Root app with routing
  main.tsx         — Entry point
  pages/           — Route-level page components
  components/      — Shared UI components
  hooks/           — Custom React hooks
  lib/             — Utility functions
```

## Pages
- `/` — Dashboard (대시보드)
- `/tree-inventory` — Tree inventory (수목 재고)
- `/projects` — Projects list (프로젝트)
- `/projects/:id` — Project detail
- `/projects/create` — Create project
- `/projects/request` — Request form

## Running
- Dev server: `npm run dev` (port 5000)
- Build: `npm run build`

## Key Configuration
- `vite.config.ts` — Vite config with host `0.0.0.0`, port `5000`, `allowedHosts: true` for Replit compatibility
- `lovable-tagger` removed from vite config (Lovable-specific plugin)
