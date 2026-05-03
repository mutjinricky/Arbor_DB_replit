export interface BusinessProjectOption {
  id: string;
  name: string;
}

export interface ProjectTreePhoto {
  label: string;
  url: string;
}

export interface ProjectMapTree {
  id: string;
  lat: number;
  lng: number;
  height?: number;
  diameter?: number;
  species?: string;
  district?: string;
  altitude?: number;
  observedAtUtc?: string;
  observedAtLocal?: string;
  damage_area?: number;
  cavity_depth?: number;
  ice_damage?: boolean;
  need_nutrient?: boolean;
  risk?: string;
  age?: number;
  inspection?: string;
  photoUrl?: string;
  photos?: ProjectTreePhoto[];
}

export interface ProjectMapData {
  projectId: string;
  source?: string;
  coordinateType?: string;
  center?: {
    lat: number;
    lng: number;
    zoom?: number;
  };
  trees: ProjectMapTree[];
}

export const BUSINESS_HISTORY_STORAGE_KEY = "dryad_business_history_v4";
export const PROJECT_MAP_STORAGE_KEY = "dryad_project_map_data_v1";

const FALLBACK_BUSINESS_PROJECTS: BusinessProjectOption[] = [
  { id: "BH-2024-001", name: "이천시 장호원읍 노거수 생육기반 개선사업" },
  { id: "BH-2024-002", name: "이천시 신둔면 가로수 전정 및 수형조절 사업" },
  { id: "BH-2024-003", name: "이천시 도립리 솔껍질깍지벌레 방제사업" },
  { id: "BH-2024-004", name: "황산공원 예찰" },
  { id: "BH-2024-005", name: "원동마을 예찰" },
  { id: "BH-2024-006", name: "군항마을 예찰" },
  { id: "BH-2023-001", name: "이천시 산수유마을 안전진단 사업" },
  { id: "BH-2023-002", name: "이천시 백사면 수세회복 사업" },
  { id: "BH-2023-003", name: "이천시 관고동 위험수목 제거사업" },
];

const PROJECT_MAP_DATA_URLS: Record<string, string> = {
  "BH-2024-004": "/data/project_maps/hwangsan-park-observation.json",
  "BH-2024-005": "/data/project_maps/wondong-village-observation.json",
  "BH-2024-006": "/data/project_maps/gunhang-village-observation.json",
};

const STATIC_PROJECT_MAP_DATA: Record<string, ProjectMapData> = {
  "BH-2023-001": {
    projectId: "BH-2023-001",
    center: { lat: 37.33113, lng: 127.45322, zoom: 18 },
    trees: [
      {
        id: "1",
        lat: 37.33098,
        lng: 127.45325,
        height: 4,
        diameter: 22,
        species: "산수유 나무",
        district: "이천시 산수유마을",
        damage_area: 0,
        cavity_depth: 0,
        risk: "low",
        age: 18,
        inspection: "2025-09-27",
        photoUrl: "/data/tree_images/tree_001.jpg",
        photos: [
          { label: "가지치기 미흡", url: "/data/tree_images/tree_001.jpg" },
          { label: "해충피해", url: "/data/tree_images/tree_002.jpg" },
          { label: "뿌리 융기", url: "/data/tree_images/tree_003.jpg" },
          { label: "부후/고사지", url: "/data/tree_images/tree_004.jpg" },
        ],
      },
      {
        id: "3",
        lat: 37.33111,
        lng: 127.45322,
        height: 2,
        diameter: 10,
        species: "산수유 나무",
        district: "이천시 산수유마을",
        damage_area: 2,
        cavity_depth: 0,
        risk: "low",
        age: 15,
        inspection: "2025-09-27",
        photoUrl: "/data/tree_images/tree_003.jpg",
        photos: [
          { label: "가지치기 미흡", url: "/data/tree_images/tree_003.jpg" },
          { label: "해충피해", url: "/data/tree_images/tree_004.jpg" },
        ],
      },
      {
        id: "4",
        lat: 37.33116,
        lng: 127.45322,
        height: 3,
        diameter: 20,
        species: "산수유 나무",
        district: "이천시 산수유마을",
        damage_area: 0,
        cavity_depth: 1,
        risk: "low",
        age: 18,
        inspection: "2025-09-27",
        photoUrl: "/data/tree_images/tree_004.jpg",
        photos: [
          { label: "뿌리 융기", url: "/data/tree_images/tree_005.jpg" },
          { label: "부후/고사지", url: "/data/tree_images/tree_006.jpg" },
        ],
      },
      {
        id: "5",
        lat: 37.33118,
        lng: 127.4532,
        height: 3,
        diameter: 14,
        species: "산수유 나무",
        district: "이천시 산수유마을",
        damage_area: 4,
        cavity_depth: 2,
        need_nutrient: true,
        risk: "medium",
        age: 23,
        inspection: "2025-09-27",
        photoUrl: "/data/tree_images/tree_005.jpg",
        photos: [
          { label: "가지치기 미흡", url: "/data/tree_images/tree_007.jpg" },
          { label: "해충피해", url: "/data/tree_images/tree_008.jpg" },
          { label: "부후/고사지", url: "/data/tree_images/tree_009.jpg" },
        ],
      },
    ],
  },
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadBusinessProjectOptions(): BusinessProjectOption[] {
  if (!isBrowser()) return FALLBACK_BUSINESS_PROJECTS;

  try {
    const raw = window.localStorage.getItem(BUSINESS_HISTORY_STORAGE_KEY);
    if (!raw) return FALLBACK_BUSINESS_PROJECTS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return FALLBACK_BUSINESS_PROJECTS;

    const projects = parsed
      .map((project: any) => ({
        id: String(project?.id || "").trim(),
        name: String(project?.name || "").trim(),
      }))
      .filter((project: BusinessProjectOption) => project.id && project.name);

    if (projects.length === 0) return FALLBACK_BUSINESS_PROJECTS;

    const missingDefaults = FALLBACK_BUSINESS_PROJECTS.filter(
      (project) => !projects.some((item: BusinessProjectOption) => item.id === project.id)
    );
    return missingDefaults.length > 0 ? [...missingDefaults, ...projects] : projects;
  } catch {
    return FALLBACK_BUSINESS_PROJECTS;
  }
}

export async function loadProjectMapData(projectId: string): Promise<ProjectMapData | null> {
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(PROJECT_MAP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const storedData = parsed?.[projectId];
        if (storedData?.projectId && Array.isArray(storedData.trees)) {
          return storedData as ProjectMapData;
        }
      }
    } catch {
      // Fallback to URL/static demo data below.
    }
  }

  const url = PROJECT_MAP_DATA_URLS[projectId];
  if (url && typeof fetch !== "undefined") {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = (await response.json()) as ProjectMapData;
        if (data?.projectId && Array.isArray(data.trees)) {
          return data;
        }
      }
    } catch {
      // Fallback to static demo data below.
    }
  }

  return STATIC_PROJECT_MAP_DATA[projectId] ?? null;
}
