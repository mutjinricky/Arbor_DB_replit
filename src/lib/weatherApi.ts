const KMA_API_KEY = import.meta.env.VITE_KMA_API_KEY as string | undefined;

const ICHEON_STATION_ID = "203";

export interface WeatherDayData {
  tm: string;
  avgTa: number;
}

const ICHEON_SIMULATION_TEMPS: WeatherDayData[] = [
  ...([
    -5.2, -4.8, -3.5, -2.8, -1.2, -0.5, -2.0, 0.5, 2.1, 4.3,
    -3.0, -4.0, -5.0, -3.5, -2.0, -1.0, 0.0, 1.0, 2.0, 1.5,
    -2.0, -3.5, -4.0, -2.0, 0.0, 1.0, -1.0, -2.0, -3.0, -2.0, -1.0,
  ] as number[]).map((t, i) => ({
    tm: `202601${String(i + 1).padStart(2, "0")}`,
    avgTa: t,
  })),

  ...([
    -0.5, 0.5, 1.0, 2.0, 3.0, 2.5, 4.0, 5.0, 6.0, 7.0,
    6.5, 5.0, 4.0, 5.5, 6.0, 7.0, 8.0, 7.5, 6.0, 5.0,
    4.5, 5.0, 6.0, 7.0, 7.5, 8.0, 7.0, 6.0,
  ] as number[]).map((t, i) => ({
    tm: `202602${String(i + 1).padStart(2, "0")}`,
    avgTa: t,
  })),

  ...([
    5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 11.0, 10.0,
    9.5, 9.0, 9.5, 10.0, 11.0, 12.0, 13.0, 12.0, 11.0, 10.0,
    9.0, 8.5, 9.0, 10.0, 11.0, 12.0, 13.0, 13.5,
  ] as number[]).map((t, i) => ({
    tm: `202603${String(i + 1).padStart(2, "0")}`,
    avgTa: t,
  })),
];

export function getSimulationTemps(): WeatherDayData[] {
  return ICHEON_SIMULATION_TEMPS;
}

export function accumulateDDFromTemps(
  temps: WeatherDayData[],
  baseTemp: number
): number {
  return temps.reduce((sum, day) => sum + Math.max(0, day.avgTa - baseTemp), 0);
}

export async function fetchKMADailyTemps(
  startDate: string,
  endDate: string
): Promise<WeatherDayData[]> {
  if (!KMA_API_KEY) {
    console.info("[WeatherAPI] VITE_KMA_API_KEY 미설정 — 평년 시뮬레이션 데이터 사용");
    return [];
  }

  const params = new URLSearchParams({
    serviceKey: KMA_API_KEY,
    pageNo: "1",
    numOfRows: "400",
    dataType: "JSON",
    dataCd: "ASOS",
    dateCd: "DAY",
    startDt: startDate,
    endDt: endDate,
    stnIds: ICHEON_STATION_ID,
  });

  try {
    const url = `/api/kma/1360000/AsosDalyInfoService/getWthrDataList?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const resultCode = data?.response?.header?.resultCode;
    if (resultCode !== "00") {
      throw new Error(
        `기상청 API 오류: ${data?.response?.header?.resultMsg ?? resultCode}`
      );
    }

    const items: any[] = data?.response?.body?.items?.item ?? [];
    if (items.length === 0) return [];

    return items.map((item) => ({
      tm: String(item.tm ?? "").trim(),
      avgTa: parseFloat(item.avgTa) || 0,
    }));
  } catch (err) {
    console.error("[WeatherAPI] 기상청 일자료 조회 실패:", err);
    return [];
  }
}
