# 황산공원 예찰 수종 벚나무 일괄 변경 계획

작성일: 2026-04-30

## 목적

수목지도 페이지에서 `사업목록 > 황산공원 예찰`을 선택한 뒤 개별 수목 마커를 클릭했을 때 열리는 수목상세팝업의 `종류` 항목을 507개 수목 모두 `벚나무`로 표시한다.

이번 문서는 계획 정리만 수행한다. 코드와 데이터 파일은 수정하지 않는다.

## 현재 확인 내용

- 대상 경로: `C:\Users\shyun\Desktop\smart tree\smart tree`
- 대상 화면: `src/pages/TreeInventory.tsx`
- 대상 상세팝업: `src/components/TreeProfileModal.tsx`
- 대상 사업 ID: `BH-2024-004`
- 대상 사업명: `황산공원 예찰`
- 대상 데이터 파일: `public/data/project_maps/hwangsan-park-observation.json`
- 대상 수목 수: 507개
- 수목 ID 범위: `P001` ~ `P507`
- 현재 `species` 값:
  - `미지정 수목`: 507개

현재 상세팝업의 `종류` 표시 흐름:

1. `TreeInventory.tsx`에서 황산공원 예찰 JSON을 `loadProjectMapData("BH-2024-004")`로 불러온다.
2. 마커 클릭 시 선택된 수목이 `selectedProjectTree`로 계산된다.
3. `TreeProfileModal`에 `treeOverride={selectedProjectTree}`가 전달된다.
4. `TreeProfileModal`은 `treeOverride.species || "미지정 수목"` 값을 `treeData.species`로 사용한다.
5. 상세팝업의 `종류` 항목은 `tree.species`를 표시한다.

따라서 황산공원 예찰 수목만 `벚나무`로 보이게 하려면 해당 JSON의 507개 `trees[].species` 값을 모두 `벚나무`로 변경하면 된다.

## 적용 방식

대상 파일:

```text
public/data/project_maps/hwangsan-park-observation.json
```

각 수목 객체의 `species` 필드만 변경한다.

변경 전:

```json
{
  "id": "P001",
  "species": "미지정 수목"
}
```

변경 후:

```json
{
  "id": "P001",
  "species": "벚나무"
}
```

적용 범위:

- `public/data/project_maps/hwangsan-park-observation.json`의 `trees` 배열 507개 항목만 변경한다.
- 다른 사업 데이터, 전체 수목지도 기본 데이터, `public/data/trees.json`, `public/data/trees.geojson`는 변경하지 않는다.
- `TreeProfileModal.tsx` 화면 코드는 변경하지 않는다.
- 좌표, 고도, 관측시각, 수고, 흉고직경, 사진 URL, 사진탭 데이터는 변경하지 않는다.

## 구현 순서

1. `hwangsan-park-observation.json`을 JSON으로 파싱한다.
2. `projectId`가 `BH-2024-004`인지 확인한다.
3. `trees.length`가 507인지 확인한다.
4. 모든 `trees[].species` 값을 `벚나무`로 설정한다.
5. JSON을 다시 저장한다.
6. 저장 후 `species` 값 집계를 확인한다.

예상 저장 후 집계:

```json
{
  "벚나무": 507
}
```

## 검증 체크리스트

- 데이터 검증:
  - `hwangsan-park-observation.json`의 `projectId`가 `BH-2024-004`인지 확인한다.
  - `trees.length === 507`인지 확인한다.
  - `species` 집계가 `벚나무: 507`인지 확인한다.
  - `P001`, `P028`, `P250`, `P507`의 `species`가 모두 `벚나무`인지 확인한다.

- 화면 검증:
  - `수목지도 > 사업목록 > 황산공원 예찰`을 선택한다.
  - `P001`, `P028`, `P250`, `P507` 마커를 클릭한다.
  - 상세팝업 제목이 `벚나무 - 수목 ID: ...` 형태로 표시되는지 확인한다.
  - 상세팝업 왼쪽 정보 카드의 `종류` 항목이 `벚나무`로 표시되는지 확인한다.
  - 황산공원 예찰 외 다른 사업 또는 전체 수목지도 데이터의 수종 표시가 바뀌지 않았는지 확인한다.

## 완료 기준

- 황산공원 예찰 507개 수목의 상세팝업 `종류` 항목이 모두 `벚나무`로 표시된다.
- 변경 범위는 황산공원 예찰 JSON 데이터에만 한정된다.
- 기존 마커 클릭, 상세팝업 열기, 수목사진, 사진탭, 좌표/고도/관측시각 표시 기능은 유지된다.
