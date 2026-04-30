# 황산공원 예찰 수목사진 매칭 계획

작성일: 2026-04-30

## 요청 범위

수목지도 페이지의 `사업목록 > 황산공원 예찰`에서 수목 마커를 눌렀을 때 열리는 개별수목상세정보에 사진을 연결한다.

사진 표시 위치는 개별수목상세정보 왼쪽 상단의 수목 사진 영역이며, 화면상 `수목 ID` 값 바로 위에 있는 사진칸이다.

이번 문서는 계획 정리만 수행한다. 코드 파일과 데이터 파일은 수정하지 않는다.

## 현재 확인 내용

- 대상 앱 경로: `C:\Users\shyun\Desktop\smart tree\smart tree`
- 대상 화면: `src/pages/TreeInventory.tsx`
- 대상 상세 팝업: `src/components/TreeProfileModal.tsx`
- 대상 사업 ID: `BH-2024-004`
- 대상 사업명: `황산공원 예찰`
- 대상 지도 데이터: `public/data/project_maps/hwangsan-park-observation.json`
- 현재 수목 데이터 수: 507개
- 현재 수목 ID 범위: `P001` ~ `P507`
- 현재 사진 연결 상태: 507개 모두 `photos` 비어 있음, `photoUrl` 없음
- 전달 ZIP: `C:\Users\shyun\Downloads\양산조사 (1).zip`
- ZIP 내부 폴더: `양산조사/`
- ZIP 내부 사진 수: 507개
- ZIP 내부 사진 번호 범위: `1번.jpg` ~ `507번.jpg`
- 수목 번호와 사진 번호가 1:1로 일치함

## 화면 연결 흐름

1. 수목지도 페이지에서 `사업목록` 버튼을 클릭한다.
2. `황산공원 예찰`을 선택한다.
3. `loadProjectMapData("BH-2024-004")`가 `hwangsan-park-observation.json`을 불러온다.
4. JSON의 `trees` 배열이 지도 마커로 표시된다.
5. 마커 클릭 시 해당 수목 ID가 `selectedTreeId`로 들어간다.
6. `TreeProfileModal`이 `treeOverride={selectedProjectTree}`를 받아 개별수목상세정보를 표시한다.
7. 모달의 상단 사진 영역은 `photoUrl`을 우선 사용하고, 없으면 `photos[0].url`을 사용한다.

따라서 황산공원 예찰 사진을 확실하게 표시하려면 각 수목 객체에 `photoUrl`을 넣고, 사진 탭과의 동기화를 위해 `photos[0]`에도 같은 이미지를 넣는 방식이 가장 안전하다.

## 매칭 규칙

수목 ID의 숫자 부분과 사진 파일명의 숫자를 동일하게 매칭한다.

| 수목 ID | 원본 ZIP 사진 | 앱 배치 후 권장 URL |
|---|---|---|
| `P001` | `양산조사/1번.jpg` | `/data/tree_images/hwangsan_park_observation/tree_001.jpg` |
| `P002` | `양산조사/2번.jpg` | `/data/tree_images/hwangsan_park_observation/tree_002.jpg` |
| `P010` | `양산조사/10번.jpg` | `/data/tree_images/hwangsan_park_observation/tree_010.jpg` |
| `P100` | `양산조사/100번.jpg` | `/data/tree_images/hwangsan_park_observation/tree_100.jpg` |
| `P507` | `양산조사/507번.jpg` | `/data/tree_images/hwangsan_park_observation/tree_507.jpg` |

전체 규칙:

- `P{번호 3자리}` = `{번호}번.jpg`
- 앱 내부 파일명은 `tree_{번호 3자리}.jpg`로 통일한다.
- 예: `P007` -> `7번.jpg` -> `tree_007.jpg`

## 권장 파일 배치

기존 `public/data/tree_images/tree_001.jpg` ~ `tree_117.jpg`는 다른 화면의 기본/샘플 이미지로 이미 쓰이고 있다.

황산공원 예찰 사진은 덮어쓰지 말고 별도 폴더에 둔다.

권장 폴더:

```text
public/data/tree_images/hwangsan_park_observation/
```

권장 파일명:

```text
tree_001.jpg
tree_002.jpg
...
tree_507.jpg
```

브라우저에서 사용할 URL:

```text
/data/tree_images/hwangsan_park_observation/tree_001.jpg
```

## 데이터 반영 방식

대상 파일:

```text
public/data/project_maps/hwangsan-park-observation.json
```

각 수목 객체에 아래 형식으로 사진 경로를 추가한다.

예시:

```json
{
  "id": "P001",
  "photoUrl": "/data/tree_images/hwangsan_park_observation/tree_001.jpg",
  "photos": [
    {
      "label": "수목사진",
      "url": "/data/tree_images/hwangsan_park_observation/tree_001.jpg"
    }
  ]
}
```

기존 좌표, 고도, 관측시각, 수고, 흉고직경, 수종, 구역 값은 변경하지 않는다.

## 실제 적용 순서

1. ZIP에서 `양산조사/*.jpg` 507장을 추출한다.
2. 추출한 사진을 `tree_001.jpg` ~ `tree_507.jpg` 형식으로 이름을 정리한다.
3. 정리한 사진을 `public/data/tree_images/hwangsan_park_observation/`에 배치한다.
4. `hwangsan-park-observation.json`의 각 `trees` 항목에 같은 번호의 `photoUrl`과 `photos[0].url`을 넣는다.
5. JSON 수목 ID와 사진 번호가 모두 1:1로 매칭됐는지 확인한다.
6. 지도에서 `황산공원 예찰`을 선택한 뒤 샘플 마커를 눌러 사진 표시를 확인한다.

## 검증 체크리스트

- `사업목록 > 황산공원 예찰` 선택 시 507개 마커가 유지되는지 확인한다.
- `P001`, `P002`, `P010`, `P100`, `P250`, `P507` 마커를 눌러 사진이 표시되는지 확인한다.
- 개별수목상세정보에서 `수목 ID` 바로 위 사진칸에 해당 번호 사진이 표시되는지 확인한다.
- 사진 탭에서도 같은 사진이 첫 번째 슬롯에 표시되는지 확인한다.
- 깨진 이미지 아이콘이나 `사진 없음` 상태가 남아있지 않은지 확인한다.
- `전체 사업`으로 돌아갔을 때 기존 전체 수목지도 이미지 동작이 바뀌지 않는지 확인한다.
- 검색창에서 `P001`, `P507` 입력 후 지도 이동과 마커 클릭이 정상인지 확인한다.
- 모바일 폭에서도 상세 팝업의 사진칸과 수목 ID 영역이 겹치지 않는지 확인한다.

## 리스크 및 주의사항

- 기존 `tree_001.jpg` 형식의 샘플 이미지 폴더에 바로 덮어쓰면 다른 화면 사진이 바뀔 수 있으므로 별도 폴더 사용이 필요하다.
- 현재 황산공원 예찰 JSON의 일부 한글 문자열은 기존 인코딩 상태 그대로 유지해야 한다.
- 이번 작업은 사진 매칭이 목적이므로 수종명, 위치 좌표, 수고, 흉고직경 값은 함께 보정하지 않는다.
- `photoUrl` 없이 `photos[0].url`만 넣어도 상단 사진칸은 표시되지만, 향후 유지보수를 위해 `photoUrl`과 `photos[0]`을 같이 넣는 방식이 명확하다.

## 완료 기준

- ZIP 사진 507장과 수목 ID `P001` ~ `P507`이 모두 번호 기준으로 매칭된다.
- `황산공원 예찰` 마커 클릭 시 개별수목상세정보의 `수목 ID` 위 사진칸에 해당 수목 사진이 표시된다.
- 기존 지도 필터, 마커 클릭, 상세 팝업 열기, 전체 사업 전환 동작은 유지된다.
