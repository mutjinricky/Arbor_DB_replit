# 수목상세팝업 사진탭 기본 수목사진 제외 계획

작성일: 2026-04-30

## 목적

수목지도 페이지에서 수목 마커를 눌렀을 때 열리는 개별 수목상세팝업에서, 왼쪽 상단의 기본 수목사진은 유지하되 `사진` 탭의 4개 사진칸에는 기본 수목사진이 반복 표시되지 않도록 한다.

현재 예시처럼 `P028` 상세팝업에서 왼쪽 기본 수목사진은 보여야 하지만, `사진` 탭의 4개 슬롯은 별도 현장/피해/관리 사진이 없으면 모두 `사진 없음` 상태로 보여야 한다.

이번 문서는 계획 정리만 수행한다. 코드와 데이터 파일은 수정하지 않는다.

## 현재 원인

대상 컴포넌트:

```text
src/components/TreeProfileModal.tsx
```

현재 상단 기본 수목사진 표시 우선순위:

```ts
if (treeData.photoUrl) return treeData.photoUrl;
if (treeData.photos?.[0]?.url) return treeData.photos[0].url;
```

현재 사진 탭 표시 방식:

```ts
[0, 1, 2, 3].map((i) => {
  const photo = treeData.photos?.[i];
  ...
})
```

즉, `photoUrl`은 기본 수목사진으로 쓰이고 `photos` 배열은 사진 탭 4개 슬롯으로 그대로 쓰인다.

황산공원 예찰 데이터는 현재 각 수목에 아래처럼 같은 이미지가 중복 저장되어 있다.

```json
{
  "photoUrl": "/data/tree_images/hwangsan_park_observation/tree_028.jpg",
  "photos": [
    {
      "label": "수목사진",
      "url": "/data/tree_images/hwangsan_park_observation/tree_028.jpg"
    }
  ]
}
```

그래서 상단 기본 사진과 사진 탭 첫 번째 슬롯에 같은 기본 수목사진이 동시에 표시된다.

## 적용 원칙

- `photoUrl`은 개별 수목의 대표/기본 수목사진 전용 필드로 사용한다.
- `photos`는 사진 탭에 들어갈 별도 갤러리 사진 전용 필드로 사용한다.
- 기본 수목사진은 사진 탭 4개 슬롯에 표시하지 않는다.
- 사진 탭에 별도 사진 데이터가 없으면 4개 슬롯 모두 기존 `사진 없음` UI를 표시한다.
- 왼쪽 상단 기본 수목사진, 수목 ID, GPS, 고도, 관측시각 등 기존 상세정보는 유지한다.

## 권장 구현 방식

### 1. 황산공원 예찰 데이터 정리

대상 파일:

```text
public/data/project_maps/hwangsan-park-observation.json
```

507개 수목 모두 `photoUrl`은 유지하고, `photos`는 빈 배열로 정리한다.

변경 전:

```json
{
  "id": "P028",
  "photoUrl": "/data/tree_images/hwangsan_park_observation/tree_028.jpg",
  "photos": [
    {
      "label": "수목사진",
      "url": "/data/tree_images/hwangsan_park_observation/tree_028.jpg"
    }
  ]
}
```

변경 후:

```json
{
  "id": "P028",
  "photoUrl": "/data/tree_images/hwangsan_park_observation/tree_028.jpg",
  "photos": []
}
```

이 방식이면 현재 `TreeProfileModal` 코드를 바꾸지 않아도:

- 상단 기본 사진: `photoUrl`로 계속 표시됨
- 사진 탭 4개 슬롯: `photos`가 비어 있으므로 모두 `사진 없음` 표시됨

### 2. 향후 별도 사진 추가 기준

나중에 병해충, 피해, 작업 전/후 사진처럼 사진 탭에 보여야 하는 별도 사진이 생기면 `photos`에만 넣는다.

예시:

```json
{
  "photoUrl": "/data/tree_images/hwangsan_park_observation/tree_028.jpg",
  "photos": [
    {
      "label": "피해 부위",
      "url": "/data/tree_images/hwangsan_park_observation/gallery/tree_028_damage_01.jpg"
    }
  ]
}
```

기본 수목사진과 같은 URL은 `photos`에 넣지 않는다.

### 3. 선택적 방어 로직

데이터 실수로 `photos`에 `photoUrl`과 같은 URL이 들어가더라도 사진 탭에서 숨기고 싶다면, 추후 `TreeProfileModal.tsx`에 아래 정책을 추가할 수 있다.

- 사진 탭 렌더링 전에 `treeData.photos`에서 `photo.url !== treeData.photoUrl`인 항목만 사용한다.
- 필터링 후 남은 사진을 최대 4개 슬롯에 표시한다.
- 빈 슬롯은 기존처럼 `사진 없음`으로 표시한다.

다만 현재 요청 범위에서는 황산공원 데이터 정리만으로 목표 동작을 달성할 수 있으므로, 1차 구현은 데이터 수정 방식이 가장 작고 안전하다.

## 검증 체크리스트

- `수목지도 > 사업목록 > 황산공원 예찰`을 선택한다.
- `P001`, `P028`, `P250`, `P507` 마커를 눌러 상세팝업을 연다.
- 왼쪽 상단 기본 수목사진이 계속 표시되는지 확인한다.
- `사진` 탭을 눌렀을 때 4개 슬롯 모두 기본 수목사진을 표시하지 않는지 확인한다.
- 별도 사진이 없는 수목은 4개 슬롯 모두 `사진 없음`으로 표시되는지 확인한다.
- `개요`, `위험성`, `이력`, `민원`, `비용`, `편집` 탭 동작이 기존과 동일한지 확인한다.
- `전체 사업`으로 돌아갔을 때 기존 전체 수목지도 상세팝업 동작이 깨지지 않는지 확인한다.

## 완료 기준

- 황산공원 예찰 수목 상세팝업의 왼쪽 기본 사진은 유지된다.
- 사진 탭 4개 칸에는 기본 수목사진이 반복 표시되지 않는다.
- 별도 갤러리 사진이 없는 경우 사진 탭은 `사진 없음` 상태만 보여준다.
- 기존 마커 클릭, 상세팝업 열기, 탭 전환, 기본 수목정보 표시 기능은 유지된다.
