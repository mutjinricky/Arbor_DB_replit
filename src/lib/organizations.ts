import type { OrganizationType } from "@/lib/supabase";

export function normalizeOrganizationType(value: string | null | undefined): OrganizationType {
  switch (value) {
    case "public_agency":
    case "agency":
      return "public_agency";
    case "tree_hospital":
    case "contractor":
      return "tree_hospital";
    case "other_org":
    case "partner":
    default:
      return "other_org";
  }
}

export function getOrganizationTypeLabel(value: string | null | undefined) {
  switch (normalizeOrganizationType(value)) {
    case "public_agency":
      return "공공기관";
    case "tree_hospital":
      return "나무병원";
    case "other_org":
    default:
      return "기타 기관";
  }
}

export function getOrganizationTypeDescription(value: string | null | undefined) {
  switch (normalizeOrganizationType(value)) {
    case "public_agency":
      return "작업 요청과 발주를 주로 수행하는 기관";
    case "tree_hospital":
      return "조사, 견적, 시공을 주로 수행하는 수행 기관";
    case "other_org":
    default:
      return "협력사, 연구기관, 일반 단체 등 기타 유형";
  }
}
