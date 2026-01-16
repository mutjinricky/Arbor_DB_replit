# 드라이어드

드라이어드는 수목 재고 및 관련 프로젝트 관리를 위해 설계된 종합 웹 애플리케이션입니다. 최신 웹 기술로 구축되어 수목 데이터를 추적하고, 프로젝트를 관리하며, 요청을 처리할 수 있는 직관적인 인터페이스를 제공합니다.

## 주요 기능 (Features)

- **대시보드 (Dashboard)**: 시스템 상태 및 주요 지표에 대한 개요를 한눈에 확인할 수 있습니다.
- **수목 재고 (Tree Inventory)**: 상세한 수목 재고 기록을 관리하고 조회할 수 있습니다.
- **프로젝트 관리 (Project Management)**:
  - 전체 프로젝트 목록 조회
  - 전용 양식을 사용한 새 프로젝트 생성
  - 개별 프로젝트의 상세 정보 확인
- **요청 관리 (Request Management)**: 간소화된 양식을 통해 요청을 제출하고 처리합니다.
- **반응형 디자인 (Responsive Design)**: 다양한 화면 크기에 최적화된 완전한 반응형 인터페이스를 제공합니다.

## 기술 스택 (Tech Stack)

이 프로젝트는 다음의 기술을 사용하여 구축되었습니다:

- **프레임워크**: [React](https://react.dev/) 와 [Vite](https://vitejs.dev/)
- **언어**: [TypeScript](https://www.typescriptlang.org/)
- **스타일링**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 컴포넌트**: [shadcn/ui](https://ui.shadcn.com/)
- **상태 관리 및 데이터 페칭**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **라우팅**: [React Router](https://reactrouter.com/)
- **폼 (Forms)**: [React Hook Form](https://react-hook-form.com/) 과 [Zod](https://zod.dev/) (유효성 검사)
- **지도 (Maps)**: [Mapbox GL](https://docs.mapbox.com/mapbox-gl-js/) 과 [react-map-gl](https://visgl.github.io/react-map-gl/)
- **시각화**: [Recharts](https://recharts.org/) (데이터 시각화)
- **아이콘**: [Lucide React](https://lucide.dev/)

## 시작하기 (Getting Started)

### 필수 요구사항 (Prerequisites)

[Node.js](https://nodejs.org/) (버전 16 이상 권장)가 설치되어 있어야 합니다.

### 설치 (Installation)

1. 저장소를 복제(Clone)합니다:
   ```bash
   git clone <repository-url>
   cd arbor-aware
   ```

2. 의존성을 설치합니다:
   ```bash
   npm install
   ```

### 애플리케이션 실행 (Running the Application)

개발 서버를 시작하려면 다음 명령어를 실행하세요:

```bash
npm run dev
```

### 프로덕션 빌드 (Building for Production)

프로덕션 배포를 위해 애플리케이션을 빌드하려면 다음을 실행하세요:

```bash
npm run build
```

## 라이선스 (License)

이 프로젝트는 MIT 라이선스에 따라 배포됩니다.
