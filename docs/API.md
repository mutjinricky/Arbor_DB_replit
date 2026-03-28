# 드라이어드(Dryad) 외부 API 명세

> 이 문서는 프로젝트에서 사용하거나 연동 예정인 외부 API를 기록합니다.  
> **마지막 업데이트**: 2026-03-28

---

## 1. 기상청 공공데이터포털 (KMA ASOS 일자료)

| 항목 | 내용 |
|---|---|
| **출처** | 기상자료개방포털 (data.kma.go.kr) / 공공데이터포털 (data.go.kr) |
| **서비스명** | 지상(종관, ASOS) 일자료 조회서비스 |
| **목적** | 이천시 일별 평균기온 조회 → 해충 유효적산온도(DD) 산출 |
| **인증** | `VITE_KMA_API_KEY` 환경 변수 (공공데이터포털 발급 인증키) |
| **형식** | HTTPS REST · JSON |

### 1.1 엔드포인트

```
GET https://apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList
```

> **개발 환경**: Vite 프록시 `/api/kma/` → `https://apis.data.go.kr/` (vite.config.ts에 설정)  
> **요청 URL 예시** (개발): `/api/kma/1360000/AsosDalyInfoService/getWthrDataList?...`

### 1.2 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `serviceKey` | string | ✅ | 공공데이터포털 인증키 (`VITE_KMA_API_KEY`) |
| `pageNo` | number | ✅ | 페이지 번호 (기본값: 1) |
| `numOfRows` | number | ✅ | 한 페이지 행 수 (최대 400 권장) |
| `dataType` | string | ✅ | 응답 형식 (`JSON` 고정) |
| `dataCd` | string | ✅ | 자료 코드 (`ASOS` 고정) |
| `dateCd` | string | ✅ | 날짜 코드 (`DAY` 고정) |
| `startDt` | string | ✅ | 조회 시작일 (`YYYYMMDD`, 예: `20260101`) |
| `endDt` | string | ✅ | 조회 종료일 (`YYYYMMDD`, 예: `20260328`) |
| `stnIds` | string | ✅ | 기상관측소 ID (`203` = 이천) |

### 1.3 응답 구조 (JSON)

```json
{
  "response": {
    "header": {
      "resultCode": "00",
      "resultMsg": "NORMAL_SERVICE"
    },
    "body": {
      "dataType": "JSON",
      "items": {
        "item": [
          {
            "stnId": "203",
            "stnNm": "이천",
            "tm": "20260101",
            "avgTa": "-5.2",
            "minTa": "-9.1",
            "maxTa": "-2.3",
            "sumRn": "0.0",
            "avgWs": "1.4",
            "avgRhm": "68.5"
          }
        ]
      },
      "totalCount": 87,
      "pageNo": 1,
      "numOfRows": 400
    }
  }
}
```

### 1.4 사용 필드

| 필드 | 설명 | 사용 위치 |
|---|---|---|
| `tm` | 날짜 (YYYYMMDD) | 날짜 범위 확인 |
| `avgTa` | 일평균기온 (°C) | 해충 유효적산온도(DD) 계산 |

### 1.5 오류 코드

| resultCode | 설명 |
|---|---|
| `00` | 정상 |
| `01` | 애플리케이션 오류 |
| `04` | HTTP 오류 |
| `12` | 미등록된 인증키 |
| `20` | 서비스 접근 거부 |
| `22` | 서비스 요청 횟수 초과 |
| `30` | 등록되지 않은 서비스 |
| `31` | 서비스 기간 만료 |

### 1.6 구현 파일

| 파일 | 역할 |
|---|---|
| `src/lib/weatherApi.ts` | API 호출 함수 (`fetchKMADailyTemps`), 시뮬레이션 대체값 (`getSimulationTemps`) |
| `src/hooks/useWeatherData.ts` | React Query 훅 — 캐시 1시간, 실패 시 평년값 fallback |
| `vite.config.ts` | 개발 서버 프록시 (`/api/kma/` → `https://apis.data.go.kr/`) |

### 1.7 이천 기상관측소 정보

| 항목 | 값 |
|---|---|
| 관측소 ID | `203` |
| 관측소명 | 이천 |
| 위도/경도 | 37.26°N / 127.48°E |
| 연평균 강수량 | 약 1,200 mm |
| 기상청 관측소 목록 | https://data.kma.go.kr/cmmn/static/staticPage.do?page=stn |

---

## 2. Mapbox GL JS

| 항목 | 내용 |
|---|---|
| **목적** | 이천시 수목 위치 지도 시각화 |
| **인증** | `VITE_MAPBOX_TOKEN` 환경 변수 |
| **SDK** | `mapbox-gl`, `react-map-gl` |
| **지도 스타일** | `mapbox://styles/mapbox/streets-v12` |

### 2.1 사용 기능

| 기능 | 설명 |
|---|---|
| 레이어 (circle) | 수목 마커 — 위험도/해충/토양 모드에 따라 색상 변경 |
| 팝업 (Popup) | hover 시 수목 요약 정보 표시 |
| NavigationControl | 줌/회전 컨트롤 |
| GeoJSON Source | `/data/trees.geojson` — 2,985개 수목 위치 + 속성 |

### 2.2 구현 파일

| 파일 | 역할 |
|---|---|
| `src/lib/mapbox.ts` | 토큰 export |
| `src/components/TreeLayer.jsx` | Mapbox Layer/Source 컴포넌트 — risk/pest/soil 색상 매핑 |
| `src/pages/TreeInventory.tsx` | Map 컴포넌트 렌더링, 이벤트 핸들러 |

---

## 3. 내부 정적 데이터 API

실제 REST API는 아니지만, 프론트엔드가 사용하는 정적 파일 경로입니다.

| 경로 | 형식 | 크기 | 용도 |
|---|---|---|---|
| `/data/trees.geojson` | GeoJSON | 2,985 features | Mapbox 지도 레이어 |
| `/data/trees.json` | JSON | 2,985 records | 수목 상세 정보 (직경/수령/피해 등) |
| `/data/tree_images/` | JPG/PNG | — | 수목 사진 (TreeProfileModal) |

### trees.json 스키마

```typescript
interface TreeFullData {
  id: string;          // 수목 ID (예: "1349")
  diameter: number;    // 흉고직경 (cm)
  height: number;      // 수고 (m)
  lat: number;         // 위도
  lng: number;         // 경도
  district: string;    // 소재지 (예: "경사리 도로")
  damage_area: number; // 피해 면적 (m²)
  cavity_depth: number;// 수간 공동 깊이 (cm)
  ice_damage: boolean; // 설해 피해 여부
  need_nutrient: boolean; // 영양 공급 필요 여부
  risk: string;        // 기존 위험 등급 ("high" | "medium" | "low")
  age: number;         // 수령 (년)
  inspection: string;  // 최근 점검일 (YYYY-MM-DD)
  species: string;     // 수종 (예: "산수유 나무")
}
```

---

## 4. 위험도 계산 알고리즘 (내부 함수)

외부 API가 아닌 `src/lib/riskCalculations.ts`의 내부 로직입니다.

### 4.1 IQTRI (수목 위험도 지수)

```
IQTRI = D × T × I
```

| 변수 | 의미 | 값 범위 |
|---|---|---|
| D | 결함 등급 (Defect) | 0.1 ~ 10.0 |
| T | 표적 점수 (Target) | 15 ~ 40 |
| I | 영향 계수 (Impact) | 1 ~ 10 (흉고직경 기반) |

**등급 기준:**
| 등급 | 점수 |
|---|---|
| 극심 (extreme) | ≥ 400 |
| 고위험 (high) | 100 ~ 399 |
| 보통 (moderate) | 40 ~ 99 |
| 저위험 (low) | < 40 |

### 4.2 해충 유효적산온도 (Degree-Day)

```
DD = Σ max(0, 일평균기온 - 발육영점온도)
```

| 해충 | 발육영점온도 | 방제 목표 DD |
|---|---|---|
| 복숭아순나방 | 7.2°C | 260 DD |
| 꽃매미 | 8.14°C | 355 DD |
| 갈색날개매미충 | 12.1°C | 202 DD |

- **데이터 소스**: 기상청 이천 관측소(#203) 일자료 (API 키 있을 때)
- **Fallback**: 이천 평년값 시뮬레이션 (Jan 1 ~ Mar 28, VITE_KMA_API_KEY 미설정 시)
- **수목별 편차**: 도심 소구역 미기후 ±5 DD 반영

### 4.3 K-UTSI (도시수목 토양 건전성 지수)

15개 지표를 4개 범주, 2단계 가중치로 산출합니다.

| 범주 | 가중치 | 지표 수 | 최대점 |
|---|---|---|---|
| 물리·공간 (ERA, H, PER, POR, TEX) | 1.5 | 5 | 37.5 |
| 화학·비옥도 (SOM, pH, EC) | 1.0 | 3 | 15.0 |
| 입지·환경 (INF, SUR, TRA, PPT) | 1.0 | 4 | 20.0 |
| 생물·안정성 (WAS, HOR, STR) | 0.5 | 3 | 7.5 |
| **합계** | — | **15** | **80** |

```
K-UTSI = (총합 / 80) × 100
```

**등급 기준:**
| 등급 | 점수 | 의미 |
|---|---|---|
| A | ≥ 80 | 최상급 |
| B | 65 ~ 79 | 양호 |
| C | 50 ~ 64 | 경계 |
| D | 35 ~ 49 | 불량 |
| E | < 35 | 생육 불능 |

**trees.json 필드 → K-UTSI 지표 매핑:**
| 지표 | 사용 필드 | 매핑 방식 |
|---|---|---|
| ERA (유효뿌리공간) | `diameter` | 흉고직경 기반 root zone 추정 |
| H (토양 경도) | `damage_area`, `cavity_depth` | 피해 없음 → 경도 낮음 (건강) |
| PER (투수계수) | `district` | 도로변 → 불투수, 공원 → 투수 |
| SOM (유기물) | `need_nutrient` | 영양 부족 → 유기물 결핍 |
| pH | `need_nutrient` | 영양 부족 → pH 불량 |
| EC (전기전도도) | `district` | 도로 → 제설 염화물 영향 |
| INF (기반시설 간섭) | `damage_area`, `cavity_depth` | 피해 면적/공동 깊이 직접 반영 |
| SUR (피복률) | `district` | 도로 → 저투수 포장 |
| TRA (교통량) | `district` | 대로/도로/기타 분류 |
| PPT (강수 패턴) | `ice_damage` | 설해 피해 = 이상기후 경험 |
| WAS (응집체 안정성) | `ice_damage`, `damage_area` | 설해+피해 → 토양 불안정 |
| HOR (A층 깊이) | `age` | 수령 기반 뿌리층 깊이 추정 |
| STR (토양 구조) | `need_nutrient` | 영양 부족 → 토양 구조 불량 |

---

## 5. 향후 연동 예정 API

| API | 목적 | 상태 |
|---|---|---|
| 기상청 API 실시간 연동 | 해충 방제 알림 자동화 | VITE_KMA_API_KEY 발급 후 즉시 연동 가능 |
| 이천시 민원 시스템 | 실시간 민원 수신 | 미연동 (시 시스템 연계 필요) |
| 공공 행정시스템 | 수목 DB 실시간 동기화 | 미연동 (수작업 CSV 갱신 중) |

---

*이 문서는 기능 추가/변경 시 함께 업데이트됩니다.*
