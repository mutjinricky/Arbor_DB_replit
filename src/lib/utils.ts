import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --------------------------------------------------------------------------------
// 1. 타입 및 인터페이스 정의 (Types and Interfaces)
// --------------------------------------------------------------------------------

/**
 * 비용 구성 항목 (재료비, 노무비, 경비)
 */
export interface CostBreakdown {
  materials: number;
  labor: number;
  expenses: number;
}

/**
 * 가지치기(Pruning) 항목
 * @param diameter - 흉고직경 (cm)
 * @param difficulty - 난이도 (20% 또는 30%)
 */
export interface PruningInput {
  type: 'pruning';
  diameter: number;
  difficulty: 20 | 30;
}

/**
 * 외과수술(Surgery) 항목
 * @param hasFilling - 공동 충전 여부
 * @param area - 면적 (m²)
 * @param volume - 부피 (m³) (hasFilling이 true일 때만 필요)
 */
export interface SurgeryInput {
  type: 'surgery';
  hasFilling: boolean;
  area: number;
  volume?: number;
}

/**
 * 영양공급(Nutrition) 항목
 * @param enhancerDiameter - 생리증진제 주입 대상목의 흉고직경 (cm)
 * @param injectionCount - 수간주사 병 수
 */
export interface NutritionInput {
  type: 'nutrition';
  enhancerDiameter?: number;
  injectionCount?: number;
}

/**
 * 최종 예산 계산을 위한 프로젝트 정보
 * @param projectDurationMonths - 총 공사 기간 (개월)
 * @param isOver1Month - 1개월 이상 근무 여부 (건강/연금보험료 적용)
 * @param estimatedDirectCost - 추정 총 공사비 (안전/퇴직공제비 적용 기준)
 */
export interface ProjectDetails {
  projectDurationMonths: number;
  isOver1Month: boolean;
  estimatedDirectCost: number;
}

/**
 * 최종 예산안 상세 내역
 */
export interface FinalBudget {
  // --- 직접 공사비 ---
  directMaterials: number;
  directLabor: number;
  directExpenses: number;
  directCostTotal: number;

  // --- 간접 공사비 (노무비/경비의 재비용) ---
  indirectLabor: number;
  otherExpenses: number;
  industrialAccidentInsurance: number;
  employmentInsurance: number;
  healthInsurance: number;
  pensionInsurance: number;
  longTermCareInsurance: number;
  safetyManagement: number;
  retirementMutualAid: number;
  
  // --- 합계 ---
  totalMaterials: number;
  totalLabor: number;
  totalExpenses: number;
  subtotalBeforeOverheads: number;

  // --- 일반관리비, 이윤, 부가세 ---
  generalAdmin: number;
  profit: number;
  subtotalBeforeVAT: number;
  vat: number;

  // --- 최종 합계 ---
  finalTotal: number;
}


// --------------------------------------------------------------------------------
// 2. 비용 상수 정의 (Cost Constants)
// (image_41185d.png, image_411b06.png, image_411b21.png, image_411b3e.png, image_411b46.png)
// --------------------------------------------------------------------------------

// image_41185d.png: 가지치기 20% 난이도
const PRUNING_COSTS_20: Record<string, CostBreakdown> = {
  '21-25': { materials: 0, labor: 28292, expenses: 3678 },
  '26-30': { materials: 0, labor: 34526, expenses: 4488 },
  '31-35': { materials: 0, labor: 45721, expenses: 5944 },
  '36-40': { materials: 0, labor: 48906, expenses: 6358 },
  '41-45': { materials: 0, labor: 51994, expenses: 6759 },
  '46-50': { materials: 0, labor: 59048, expenses: 7676 },
  '51-55': { materials: 0, labor: 67972, expenses: 8836 },
  '56-60': { materials: 0, labor: 75212, expenses: 9777 },
  '61-65': { materials: 0, labor: 81812, expenses: 10635 },
  '66-70': { materials: 0, labor: 89243, expenses: 11601 },
  '71-75': { materials: 0, labor: 97185, expenses: 12634 },
  '76-80': { materials: 0, labor: 105820, expenses: 13757 },
  '81-90': { materials: 0, labor: 119458, expenses: 15529 },
};

// image_411b06.png: 가지치기 30% 난이도
const PRUNING_COSTS_30: Record<string, CostBreakdown> = {
  '21-25': { materials: 0, labor: 42438, expenses: 5517 },
  '26-30': { materials: 0, labor: 51789, expenses: 6732 },
  '31-35': { materials: 0, labor: 68582, expenses: 8915 },
  '36-40': { materials: 0, labor: 73359, expenses: 9536 },
  '41-45': { materials: 0, labor: 77990, expenses: 10139 },
  '46-50': { materials: 0, labor: 88572, expenses: 11514 },
  '51-55': { materials: 0, labor: 101959, expenses: 13254 },
  '56-60': { materials: 0, labor: 112817, expenses: 14666 },
  '61-65': { materials: 0, labor: 122717, expenses: 15953 },
  '66-70': { materials: 0, labor: 133864, expenses: 17402 },
  '71-75': { materials: 0, labor: 145778, expenses: 18951 },
  '76-80': { materials: 0, labor: 158730, expenses: 20635 },
  '81-90': { materials: 0, labor: 179186, expenses: 23294 },
};

// image_411b21.png: 외과수술 (공동 충전 없음) - m²당 단가
const SURGERY_COSTS_NO_FILLING: Record<string, CostBreakdown> = {
  decayRemoval: { materials: 3978, labor: 288773, expenses: 8663 },
  sterilization: { materials: 3712, labor: 30850, expenses: 925 },
  pestControl: { materials: 4222, labor: 31784, expenses: 953 },
  preservation: { materials: 38182, labor: 62889, expenses: 1886 },
  waterproofing: { materials: 88398, labor: 52847, expenses: 1585 },
  artificialBark: { materials: 222408, labor: 344160, expenses: 10324 },
};

// image_411b3e.png: 외과수술 (공동 충전 있음) - m²당 단가 (충전은 m³당)
const SURGERY_COSTS_WITH_FILLING: Record<string, CostBreakdown> = {
  ...SURGERY_COSTS_NO_FILLING,
  cavityFilling: { materials: 553860, labor: 90567, expenses: 2717 }, // m³당
  matting: { materials: 38290, labor: 38422, expenses: 1152 }, // m²당
};

// image_411b46.png: 영양공급
const NUTRITION_ENHANCER_PER_KG: CostBreakdown = { materials: 21801, labor: 27094, expenses: 812 };
const NUTRITION_INJECTION_PER_BOTTLE: CostBreakdown = { materials: 6557, labor: 18662, expenses: 559 };
// 참고: '유기물처리'는 image_411b46.png에서 단가표가 누락되어(생리증진제 표가 중복됨) 계산에서 제외합니다.


// --------------------------------------------------------------------------------
// 3. 헬퍼 함수 (Helper Functions)
// --------------------------------------------------------------------------------

/**
 * 여러 비용 항목을 합산합니다.
 */
function sumCosts(costs: CostBreakdown[]): CostBreakdown {
  return costs.reduce(
    (acc, cost) => {
      acc.materials += cost.materials;
      acc.labor += cost.labor;
      acc.expenses += cost.expenses;
      return acc;
    },
    { materials: 0, labor: 0, expenses: 0 }
  );
}

/**
 * 직경(cm)을 가지치기 비용 테이블의 범위 문자열로 변환합니다.
 */
function getPruningDiameterRange(diameter: number): string {
  if (diameter <= 25) return '21-25';
  if (diameter <= 30) return '26-30';
  if (diameter <= 35) return '31-35';
  if (diameter <= 40) return '36-40';
  if (diameter <= 45) return '41-45';
  if (diameter <= 50) return '46-50';
  if (diameter <= 55) return '51-55';
  if (diameter <= 60) return '56-60';
  if (diameter <= 65) return '61-65';
  if (diameter <= 70) return '66-70';
  if (diameter <= 75) return '71-75';
  if (diameter <= 80) return '76-80';
  if (diameter <= 90) return '81-90';
  console.warn(`Diameter ${diameter}cm is out of range (90cm+). Using highest range '81-90'.`);
  return '81-90';
}

/**
 * 비용 항목에 스케일(수량, 면적 등)을 적용합니다.
 */
function scaleCost(cost: CostBreakdown, scale: number): CostBreakdown {
  return {
    materials: cost.materials * scale,
    labor: cost.labor * scale,
    expenses: cost.expenses * scale,
  };
}


// --------------------------------------------------------------------------------
// 4. 개별 항목 계산 함수 (Individual Cost Calculation Functions)
// --------------------------------------------------------------------------------

/**
 * 가지치기 비용을 계산합니다.
 * @param input - PruningInput
 * @returns CostBreakdown
 */
function calculatePruningCost(input: PruningInput): CostBreakdown {
  const range = getPruningDiameterRange(input.diameter);
  const costMap = input.difficulty === 20 ? PRUNING_COSTS_20 : PRUNING_COSTS_30;
  
  if (!costMap[range]) {
    console.error(`No pruning cost found for range: ${range}`);
    return { materials: 0, labor: 0, expenses: 0 };
  }
  return costMap[range];
}

/**
 * 외과수술 비용을 계산합니다.
 * @param input - SurgeryInput
 * @returns CostBreakdown
 */
function calculateSurgeryCost(input: SurgeryInput): CostBreakdown {
  const costsToSum: CostBreakdown[] = [];

  if (input.hasFilling) {
    if (typeof input.volume !== 'number' || input.volume <= 0) {
      console.error("Surgery with filling requires a 'volume' > 0.");
      return { materials: 0, labor: 0, expenses: 0 };
    }
    // 8개 공정
    for (const key in SURGERY_COSTS_WITH_FILLING) {
      const unitCost = SURGERY_COSTS_WITH_FILLING[key];
      if (key === 'cavityFilling') {
        // 공동 충전만 부피(volume) 기준
        costsToSum.push(scaleCost(unitCost, input.volume));
      } else {
        // 나머지는 면적(area) 기준
        costsToSum.push(scaleCost(unitCost, input.area));
      }
    }
  } else {
    // 6개 공정 (충전 없음)
    for (const key in SURGERY_COSTS_NO_FILLING) {
      const unitCost = SURGERY_COSTS_NO_FILLING[key];
      // 모두 면적(area) 기준
      costsToSum.push(scaleCost(unitCost, input.area));
    }
  }

  return sumCosts(costsToSum);
}

/**
 * 영양공급 비용을 계산합니다.
 * @param input - NutritionInput
 * @returns CostBreakdown
 */
function calculateNutritionCost(input: NutritionInput): CostBreakdown {
  const costsToSum: CostBreakdown[] = [];

  // 1. 생리증진제 처리 (image_411b46.png)
  if (input.enhancerDiameter && input.enhancerDiameter > 0) {
    // 수목 직경 30 이하 1kg, 30 초과 2kg
    const kg = input.enhancerDiameter <= 30 ? 1 : 2;
    costsToSum.push(scaleCost(NUTRITION_ENHANCER_PER_KG, kg));
  }

  // 2. 영양제 수간주사 (image_411b46.png)
  if (input.injectionCount && input.injectionCount > 0) {
    costsToSum.push(scaleCost(NUTRITION_INJECTION_PER_BOTTLE, input.injectionCount));
  }

  // 3. 유기물처리 (image_411b46.png)
  // 데이터 누락으로 계산에서 제외
  if (Object.keys(input).includes('organicMatter')) { // 임시 체크
     console.warn("유기물처리(Organic Matter)는 원본 이미지에 단가 데이터가 누락되어 계산에서 제외되었습니다.");
  }

  return sumCosts(costsToSum);
}


// --------------------------------------------------------------------------------
// 5. 메인 계산 함수 (Main Calculation Functions)
// --------------------------------------------------------------------------------

/**
 * 모든 입력 항목을 기반으로 총 직접 공사비를 계산합니다.
 * @param items - (PruningInput | SurgeryInput | NutritionInput)[]
 * @returns 총 직접 공사비 (CostBreakdown)
 */
export function calculateDirectCosts(items: (PruningInput | SurgeryInput | NutritionInput)[]): CostBreakdown {
  const allCosts: CostBreakdown[] = items.map(item => {
    switch (item.type) {
      case 'pruning':
        return calculatePruningCost(item);
      case 'surgery':
        return calculateSurgeryCost(item);
      case 'nutrition':
        return calculateNutritionCost(item);
      default:
        return { materials: 0, labor: 0, expenses: 0 };
    }
  });

  return sumCosts(allCosts);
}

/**
 * 직접 공사비와 프로젝트 정보를 바탕으로 최종 예산안을 계산합니다.
 * (image_411b60.png 재비용 계산법 적용)
 * * @param directCosts - calculateDirectCosts()의 결과
 * @param details - ProjectDetails (프로젝트 기간, 근무 조건 등)
 * @returns FinalBudget (최종 예산안 상세 내역)
 */
export function calculateFinalBudget(directCosts: CostBreakdown, details: ProjectDetails): FinalBudget {
  
  const { materials: directMaterials, labor: directLabor, expenses: directExpenses } = directCosts;
  const directCostTotal = directMaterials + directLabor + directExpenses;

  // --- 재비용 계산 (image_411b60.png) ---

  // A. 노무비 포함 항목
  const indirectLaborRate = details.projectDurationMonths <= 6 ? 0.143 : 0.145;
  const indirectLabor = directLabor * indirectLaborRate;

  // B. 경비 포함 항목
  const otherExpensesRate = details.projectDurationMonths <= 6 ? 0.055 : 0.058;
  const otherExpenses = (directMaterials + directLabor) * otherExpensesRate;

  const industrialAccidentInsurance = (directLabor + indirectLabor) * 0.0356;
  const employmentInsurance = (directLabor + indirectLabor) * 0.0101;

  // 1개월 이상 근무 시
  const healthInsurance = details.isOver1Month ? (directLabor * 0.03545) : 0;
  const pensionInsurance = details.isOver1Month ? (directLabor * 0.0450) : 0;
  const longTermCareInsurance = details.isOver1Month ? (healthInsurance * 0.1295) : 0;

  // 총 공사비 기준
  const safetyManagement = details.estimatedDirectCost > 20_000_000 ? (directMaterials + directLabor) * 0.0207 : 0;
  const retirementMutualAid = details.estimatedDirectCost > 100_000_000 ? (directLabor * 0.023) : 0;


  // --- 합계 계산 ---
  const totalMaterials = directMaterials;
  const totalLabor = directLabor + indirectLabor;
  const totalExpenses = directExpenses + 
                        otherExpenses + 
                        industrialAccidentInsurance + 
                        employmentInsurance + 
                        healthInsurance + 
                        pensionInsurance + 
                        longTermCareInsurance + 
                        safetyManagement + 
                        retirementMutualAid;

  const subtotalBeforeOverheads = totalMaterials + totalLabor + totalExpenses;

  // C. 순수외 재비율
  const generalAdmin = (totalMaterials + totalLabor + totalExpenses) * 0.06; // 6%
  const profit = (totalLabor + totalExpenses + generalAdmin) * 0.15; // 15%

  const subtotalBeforeVAT = subtotalBeforeOverheads + generalAdmin + profit;
  const vat = subtotalBeforeVAT * 0.10; // 10%
  const finalTotal = subtotalBeforeVAT + vat;

  // 모든 값을 정수로 반올림 (금액이므로)
  return {
    directMaterials: Math.round(directMaterials),
    directLabor: Math.round(directLabor),
    directExpenses: Math.round(directExpenses),
    directCostTotal: Math.round(directCostTotal),
    indirectLabor: Math.round(indirectLabor),
    otherExpenses: Math.round(otherExpenses),
    industrialAccidentInsurance: Math.round(industrialAccidentInsurance),
    employmentInsurance: Math.round(employmentInsurance),
    healthInsurance: Math.round(healthInsurance),
    pensionInsurance: Math.round(pensionInsurance),
    longTermCareInsurance: Math.round(longTermCareInsurance),
    safetyManagement: Math.round(safetyManagement),
    retirementMutualAid: Math.round(retirementMutualAid),
    totalMaterials: Math.round(totalMaterials),
    totalLabor: Math.round(totalLabor),
    totalExpenses: Math.round(totalExpenses),
    subtotalBeforeOverheads: Math.round(subtotalBeforeOverheads),
    generalAdmin: Math.round(generalAdmin),
    profit: Math.round(profit),
    subtotalBeforeVAT: Math.round(subtotalBeforeVAT),
    vat: Math.round(vat),
    finalTotal: Math.round(finalTotal),
  };
}


// --------------------------------------------------------------------------------
// 6. 사용 예시 (Example Usage)
// --------------------------------------------------------------------------------

console.log("--- 예산 계산기 사용 예시 ---");

// 1. 계산할 작업 항목들을 정의합니다.
const projectItems: (PruningInput | SurgeryInput | NutritionInput)[] = [
  // 예시 1: 가지치기 (30% 난이도, 43cm) 10그루
  ...Array(10).fill({ type: 'pruning', diameter: 43, difficulty: 30 } as PruningInput),

  // 예시 2: 외과수술 (충전 없음, 1.5 m²) 1건
  { type: 'surgery', hasFilling: false, area: 1.5 },

  // 예시 3: 외과수술 (충전 있음, 면적 0.5 m², 부피 0.1 m³) 1건
  { type: 'surgery', hasFilling: true, area: 0.5, volume: 0.1 },

  // 예시 4: 영양공급 (생리증진제 D25cm 5그루, 수간주사 20병)
  ...Array(5).fill({ type: 'nutrition', enhancerDiameter: 25 } as NutritionInput),
  { type: 'nutrition', injectionCount: 20 },
];

// 2. 총 직접 공사비를 계산합니다.
const totalDirectCosts = calculateDirectCosts(projectItems);
console.log("총 직접 공사비:", totalDirectCosts);

// 3. 프로젝트 상세 정보를 정의합니다.
const projectDetails: ProjectDetails = {
  projectDurationMonths: 4, // 4개월 프로젝트
  isOver1Month: true,       // 1개월 이상 근무
  estimatedDirectCost: totalDirectCosts.materials + totalDirectCosts.labor + totalDirectCosts.expenses // 추정 공사비 (안전/퇴직 적용용)
};

// 4. 최종 예산안을 계산합니다.
const finalBudget = calculateFinalBudget(totalDirectCosts, projectDetails);

console.log("\n--- 최종 예산안 상세 내역 ---");
console.log(JSON.stringify(finalBudget, null, 2));
