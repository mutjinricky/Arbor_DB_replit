// scripts/generate-zones.js
// 나무 좌표 → 구역 폴리곤(Convex Hull + Buffer) GeoJSON 생성
// 실행: node scripts/generate-zones.js

const fs = require("fs");
const path = require("path");
const turf = require("@turf/turf");

// ─── 유형별 색상 ─────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  "도로":   "#64748B",  // slate
  "마을":   "#22C55E",  // green
  "축제장": "#A855F7",  // purple
  "전답":   "#EAB308",  // amber
  "농가":   "#F97316",  // orange
};

const FILL_OPACITY = 0.18;
const BUFFER_METERS = 30;

// ─── 데이터 로드 ─────────────────────────────────────────────────────────────
const treesPath = path.join(__dirname, "../public/data/trees.json");
const outPath   = path.join(__dirname, "../public/data/zones.geojson");

const trees = JSON.parse(fs.readFileSync(treesPath, "utf-8"));
const treeList = Object.values(trees);

console.log(`총 수목 수: ${treeList.length}`);

// ─── district 별로 그룹화 ────────────────────────────────────────────────────
const groups = {};
for (const t of treeList) {
  const d = t.district || "기타";
  if (!groups[d]) groups[d] = [];
  groups[d].push(t);
}

console.log(`district 그룹 수: ${Object.keys(groups).length}`);
Object.entries(groups).forEach(([d, ts]) => console.log(`  ${d}: ${ts.length}주`));

// ─── 폴리곤 생성 ─────────────────────────────────────────────────────────────
const features = [];

for (const [district, ts] of Object.entries(groups)) {
  // location_type 추출: "경사리 도로" → "도로"
  const parts = district.trim().split(/\s+/);
  const locationType = parts[parts.length - 1];
  const village      = parts.slice(0, -1).join(" ");
  const color        = TYPE_COLORS[locationType] ?? "#94A3B8";

  // 점 FeatureCollection
  const points = turf.featureCollection(
    ts.map((t) => turf.point([t.lng, t.lat]))
  );

  let polygon;

  if (ts.length < 3) {
    // 점이 2개 이하: buffer of points union
    const buffered = ts.map((t) =>
      turf.buffer(turf.point([t.lng, t.lat]), BUFFER_METERS, { units: "meters" })
    );
    polygon = buffered[0];
    for (let i = 1; i < buffered.length; i++) {
      const u = turf.union(turf.featureCollection([polygon, buffered[i]]));
      if (u) polygon = u;
    }
  } else {
    // 3개 이상: Convex Hull + Buffer
    const hull = turf.convex(points);
    if (!hull) {
      // 모든 점이 일직선인 경우 — 각 점을 버퍼 후 병합
      const buffered = ts.map((t) =>
        turf.buffer(turf.point([t.lng, t.lat]), BUFFER_METERS, { units: "meters" })
      );
      polygon = buffered[0];
      for (let i = 1; i < buffered.length; i++) {
        const u = turf.union(turf.featureCollection([polygon, buffered[i]]));
        if (u) polygon = u;
      }
    } else {
      polygon = turf.buffer(hull, BUFFER_METERS, { units: "meters" });
    }
  }

  if (!polygon) {
    console.warn(`  ⚠ ${district}: 폴리곤 생성 실패 — 건너뜀`);
    continue;
  }

  features.push({
    type: "Feature",
    geometry: polygon.geometry,
    properties: {
      district,
      village,
      location_type: locationType,
      color,
      fill_opacity: FILL_OPACITY,
      count: ts.length,
    },
  });

  console.log(`  ✔ ${district} (${locationType}) → ${ts.length}주, 색: ${color}`);
}

// ─── GeoJSON 출력 ─────────────────────────────────────────────────────────────
const geojson = {
  type: "FeatureCollection",
  features,
};

fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), "utf-8");
console.log(`\n✅ 저장 완료: ${outPath}`);
console.log(`   features: ${features.length}개`);
