import { useQuery } from "@tanstack/react-query";
import {
  fetchKMADailyTemps,
  getSimulationTemps,
  accumulateDDFromTemps,
} from "@/lib/weatherApi";

export const PEST_TARGETS = [
  { name: "복숭아순나방", baseTemp: 7.2, targetDD: 260 },
  { name: "꽃매미", baseTemp: 8.14, targetDD: 355 },
  { name: "갈색날개매미충", baseTemp: 12.1, targetDD: 202 },
] as const;

export type PestName = (typeof PEST_TARGETS)[number]["name"];

export interface PestDDInfo {
  currentDD: number;
  targetDD: number;
  baseTemp: number;
}

export interface WeatherDataResult {
  pestDDs: Record<PestName, PestDDInfo>;
  isRealData: boolean;
  isLoading: boolean;
  error: Error | null;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function yearStartStr(): string {
  return `${new Date().getFullYear()}0101`;
}

export function useWeatherData(): WeatherDataResult {
  const start = yearStartStr();
  const end = todayStr();

  const { data, isLoading, error } = useQuery<
    import("@/lib/weatherApi").WeatherDayData[]
  >({
    queryKey: ["/weather/kma/icheon", start, end],
    queryFn: () => fetchKMADailyTemps(start, end),
    staleTime: 1000 * 60 * 60,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const temps =
    data && data.length > 0 ? data : getSimulationTemps();
  const isRealData = !!(data && data.length > 0);

  const pestDDs: Record<string, PestDDInfo> = {};
  for (const pest of PEST_TARGETS) {
    pestDDs[pest.name] = {
      currentDD: accumulateDDFromTemps(temps, pest.baseTemp),
      targetDD: pest.targetDD,
      baseTemp: pest.baseTemp,
    };
  }

  return {
    pestDDs: pestDDs as Record<PestName, PestDDInfo>,
    isRealData,
    isLoading,
    error: error as Error | null,
  };
}
