// scripts/generate-zones.cjs
// 나무 좌표 → district × DBSCAN 클러스터별 폴리곤 GeoJSON 생성
// 실행: node scripts/generate-zones.cjs

const fs   = require("fs");
const path = require("path");
const turf = require("@turf/turf");

// ─── 파라미터 ──────────────────────────────────────────────────────────────────
// 이천시 위도 37.33° 기준
// 1° lat ≈ 111,000 m  /  1° lng ≈ cos(37.33°)*111000 ≈ 88,300 m
const LAT_SCALE = 111000;
const LNG_SCALE = 88300;

const EPS_METERS   = 40;   // 이 거리(m) 이내 나무는 같은 클러스터로 묶음
const MIN_PTS      = 1;    // 1 → 고립 나무도 단독 클러스터(소형 원형 폴리곤)
const BUFFER_M     = 20;   // Convex Hull 바깥쪽 버퍼(m)
const SOLO_BUFFER  = 14;   // 단독 나무 원형 버퍼(m)

// ─── 유형별 색상 ──────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  "도로":   "#64748B",
  "마을":   "#22C55E",
  "축제장": "#A855F7",
  "전답":   "#EAB308",
  "농가":   "#F97316",
};

// ─── 헬퍼: 두 점 사이 유클리드 거리(m) ────────────────────────────────────────
function distM(a, b) {
  const dy = (a.lat - b.lat) * LAT_SCALE;
  const dx = (a.lng - b.lng) * LNG_SCALE;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── DBSCAN (minPts=1 → 고립점 = 단독 클러스터) ────────────────────────────
function dbscan(trees, eps) {
  const n      = trees.length;
  const labels = new Int32Array(n).fill(-1); // -1 = 미방문
  let   cid    = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;

    // eps 반경 이웃 탐색
    const neighbors = [];
    for (let j = 0; j < n; j++) {
      if (distM(trees[i], trees[j]) <= eps) neighbors.push(j);
    }

    if (neighbors.length < MIN_PTS) {
      // 고립점 → 단독 클러스터
      labels[i] = ++cid;
      continue;
    }

    labels[i] = ++cid;
    const queue = neighbors.filter((j) => j !== i);

    while (queue.length > 0) {
      const j = queue.shift();
      if (labels[j] !== -1) continue; // 이미 처리됨
      labels[j] = cid;

      const nb2 = [];
      for (let k = 0; k < n; k++) {
        if (distM(trees[j], trees[k]) <= eps) nb2.push(k);
      }
      if (nb2.length >= MIN_PTS) {
        for (const k of nb2) {
          if (labels[k] === -1) queue.push(k);
        }
      }
    }
  }

  // labels 를 { clusterId → tree[] } 맵으로 변환
  const clusters = {};
  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (!clusters[c]) clusters[c] = [];
    clusters[c].push(trees[i]);
  }
  return Object.values(clusters);
}

// ─── 클러스터 → 폴리곤 feature ────────────────────────────────────────────────
function clusterToFeature(cluster, properties) {
  let polygon;

  if (cluster.length === 1) {
    // 단독 나무 → 소형 원
    polygon = turf.buffer(
      turf.point([cluster[0].lng, cluster[0].lat]),
      SOLO_BUFFER,
      { units: "meters" }
    );
  } else if (cluster.length === 2) {
    // 2그루 → 두 점 각각 버퍼 후 union
    const b0 = turf.buffer(turf.point([cluster[0].lng, cluster[0].lat]), BUFFER_M, { units: "meters" });
    const b1 = turf.buffer(turf.point([cluster[1].lng, cluster[1].lat]), BUFFER_M, { units: "meters" });
    const u  = turf.union(turf.featureCollection([b0, b1]));
    polygon  = u ?? b0;
  } else {
    // 3그루 이상 → Convex Hull + Buffer
    const pts  = turf.featureCollection(cluster.map((t) => turf.point([t.lng, t.lat])));
    const hull = turf.convex(pts);
    if (hull) {
      polygon = turf.buffer(hull, BUFFER_M, { units: "meters" });
    } else {
      // 일직선 → 각 점 버퍼 병합
      let acc = turf.buffer(turf.point([cluster[0].lng, cluster[0].lat]), BUFFER_M, { units: "meters" });
      for (let i = 1; i < cluster.length; i++) {
        const bi = turf.buffer(turf.point([cluster[i].lng, cluster[i].lat]), BUFFER_M, { units: "meters" });
        const u  = turf.union(turf.featureCollection([acc, bi]));
        if (u) acc = u;
      }
      polygon = acc;
    }
  }

  if (!polygon) return null;

  return {
    type: "Feature",
    geometry: polygon.geometry,
    properties: { ...properties, count: cluster.length },
  };
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
const treesPath = path.join(__dirname, "../public/data/trees.json");
const outPath   = path.join(__dirname, "../public/data/zones.geojson");

const trees    = JSON.parse(fs.readFileSync(treesPath, "utf-8"));
const treeList = Object.values(trees);
console.log(`총 수목 수: ${treeList.length}`);

// district 별 그룹화
const groups = {};
for (const t of treeList) {
  const d = t.district || "기타";
  if (!groups[d]) groups[d] = [];
  groups[d].push(t);
}
console.log(`district 그룹 수: ${Object.keys(groups).length}\n`);

const features = [];
let totalClusters = 0;

for (const [district, ts] of Object.entries(groups)) {
  const parts       = district.trim().split(/\s+/);
  const locationType = parts[parts.length - 1];
  const village      = parts.slice(0, -1).join(" ");
  const color        = TYPE_COLORS[locationType] ?? "#94A3B8";

  // DBSCAN 클러스터링
  const clusters = dbscan(ts, EPS_METERS);
  console.log(`${district} (${ts.length}주) → ${clusters.length}개 클러스터`);

  for (const cluster of clusters) {
    const feat = clusterToFeature(cluster, {
      district,
      village,
      location_type: locationType,
      color,
    });
    if (feat) features.push(feat);
  }
  totalClusters += clusters.length;
}

const geojson = { type: "FeatureCollection", features };
fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2), "utf-8");

console.log(`\n✅ 저장 완료: ${outPath}`);
console.log(`   district: ${Object.keys(groups).length}개`);
console.log(`   클러스터: ${totalClusters}개`);
console.log(`   features: ${features.length}개`);
