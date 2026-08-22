# Mermaid 작성 규칙 (사내 표준)

마크다운 보고 문서에 다이어그램을 넣을 때 지키는 규칙입니다.
목표는 **GitHub · VS Code 어디서 열어도 깨지지 않는 것** 하나입니다.

---

## 1. 쓸 수 있는 다이어그램 (이 5종만)

| 종류 | 언제 쓰나 |
|---|---|
| `flowchart` | 처리 흐름, 분기, 의존 관계 |
| `sequenceDiagram` | API 호출 순서, 역할 간 주고받는 메시지 |
| `stateDiagram-v2` | 화면·주문·승인 등의 상태 전이 |
| `erDiagram` | DB 스키마 |
| `classDiagram` | 도메인 모델, 인터페이스 구조 |

이 5종은 Mermaid **10.9 / 11.17 양쪽 파서에서 검증**되었습니다. 사내 GitHub 버전이 무엇이든 안전합니다.

### 쓰지 말 것

| 금지 | 이유 |
|---|---|
| `swimlane-beta` | Mermaid 11.16+ 필요. 좋지만 GitHub이 아직 못 따라올 가능성 높음 |
| `architecture-beta`, `radar-beta`, `wardley-beta`, `treemap-beta`, `venn-beta`, `ishikawa-beta`, `cynefin-beta`, `treeView-beta` | 전부 최신 beta. 구버전 렌더러에서 **블록 통째로 에러 박스**가 됨 |
| `usecase-beta` | 문서에는 있으나 11.17에도 **미출시** |
| `layout: elk` | 별도 패키지 필요 — GitHub에서 무시됨 |
| `icon:` / `img:` 셰이프 | 아이콘팩 등록·외부 URL 필요. GitHub 불가 |
| `C4Context` 등 C4 | 공식 문서가 **experimental**로 명시, 스타일 커스터마이징 불가. 꼭 필요하면 팀 합의 후 |

> 새 다이어그램 종류를 쓰고 싶으면, 먼저 `docs/02_다이어그램_샘플.md`의 `info` 블록으로 사내 GitHub 버전을 확인하세요.

---

## 2. 한글 작성 규칙

### 2-1. flowchart 라벨은 **전부 큰따옴표로 감싼다** (가장 중요)

```
나쁨   A[주문(결제 포함)]        → 파싱 실패. 괄호가 셰이프로 해석됨
나쁨   C[/login 리다이렉트]      → 파싱 실패. "[/" 가 평행사변형 셰이프
좋음   A["주문(결제 포함)"]
좋음   C["/login 리다이렉트"]
```

화살표 라벨도 마찬가지입니다: `-->|"미응답 있음"|`

이 규칙 하나로 괄호·슬래시·특수문자 문제가 전부 사라집니다. **예외 없이 적용하세요.**

### 2-2. 단, sequenceDiagram의 `as` 별칭에는 따옴표를 쓰지 않는다

```
나쁨   participant U as "응시자"    → 화면에 "응시자" 처럼 따옴표가 그대로 찍힘
좋음   participant U as 응시자
```

### 2-3. 줄바꿈

- `<br/>` 를 씁니다. (`<br>`, `<br />` 도 되지만 하나로 통일)
- 긴 한글을 자동 줄바꿈하려면 마크다운 문자열:
  ```
  A["`**주문 서비스**
  재고 확인 및 주문 생성`"]
  ```

### 2-4. 기타 지뢰

| 하지 말 것 | 대신 |
|---|---|
| flowchart 노드에 소문자 `end` | `"End"` 또는 `"END"` |
| 연결 노드 첫 글자가 `o` 나 `x` | 공백을 넣거나 대문자로 |
| `%%` 주석 안에 `{ }` | 중괄호 빼기 |
| sequenceDiagram `rect #ff0000` | `rect rgb(255,0,0)` — `#`은 주석으로 해석됨 |
| 라벨 안의 `#` | `#35;` 로 이스케이프 |

---

## 3. 스윔레인(역할별 레인)이 필요할 때

Mermaid v11.16+에 `swimlane-beta`가 정식으로 생겼지만 **사내 GitHub에서는 아직 못 씁니다.**

### 권장: `sequenceDiagram` 으로 대체

참여자(participant)가 곧 레인 역할을 하고, 정식 지원이라 어디서든 렌더됩니다.
`docs/02_다이어그램_샘플.md` 6번이 이 방식입니다.

### 비권장: `flowchart` + `subgraph` 로 흉내내기

동작은 하지만 **진짜 레인이 되지 않습니다.** 실제로 렌더해 확인한 결과:

- 레인 박스들의 크기와 위치가 제각각으로 어긋납니다. 나란한 레인이 아니라 흩어진 상자로 보입니다.
- 안에 넣은 `direction TB` 는 **무시됩니다.** 공식 문서에 명시된 한계입니다:
  > If any of a subgraph's nodes are linked to the outside, subgraph direction will be ignored.

  스윔레인은 레인 간 화살표가 필수이므로 이 조건에 항상 걸립니다.

역할 구분을 "대충 묶어 보여주는" 정도라면 써도 되지만, 정렬된 스윔레인을 기대하지 마세요.

---

## 4. Mermaid로 안 되는 것

| 안 되는 것 | 대안 |
|---|---|
| 노드 위치 수동 지정 / 자유 배치 | 원천 미지원 (공식 이슈 #270 closed). 방향·선언 순서·보이지 않는 링크 `~~~` 로 힌트만 줄 수 있음 |
| 정렬된 스윔레인 | 위 3번 참고 |
| 노드 안에 이미지 | GitHub에서는 불가 |
| 큰 다이어그램 | 노드 수십 개 넘으면 판독 불가. `maxEdges` 기본 500, `maxTextSize` 50,000자 하드 리밋 (호스팅 렌더러에서는 변경 불가) |

### 한계에 부딪히면

1. **표로 바꿔보세요.** 단순 매핑·목록·상태 표는 마크다운 표가 더 읽기 쉽고 diff도 깔끔합니다. 다이어그램은 "관계의 모양"이 정보일 때만 씁니다.
2. **다이어그램을 쪼개세요.** 한 장에 다 넣지 말고 관점별로 나눕니다.
3. **draw.io 로 그려서 이미지로 붙이세요.** `arch.drawio.svg` 로 저장하면 GitHub에서 그림으로 보이면서, 같은 파일을 draw.io에서 다시 편집할 수 있습니다 (XML이 SVG 안에 임베드됨). 자유 배치가 필요한 큰 아키텍처 그림 1~2장은 이 방식이 낫습니다.
4. ASCII 아트는 아주 단순한 구조에만. **한글은 글자 폭이 어긋나므로 피하세요.**

---

## 5. 올리기 전에 검증하기

문서를 커밋하기 전에 반드시 돌리세요. 깨진 블록을 미리 잡아줍니다.

```bash
cd tools && npm install      # 최초 1회
node tools/mermaid-lint.mjs docs
```

출력 예:

```
Mermaid 11.17.0 로 검사합니다.

docs\02_다이어그램_샘플.md  (8 blocks)
  ok    L33  flowchart TD
  WARN  L59  flowchart LR
            · 따옴표 없는 라벨 안의 괄호는 파싱 실패 → ["주문(결제)"] 처럼 감싸세요
  FAIL  L81  flowchart TD
            Parse error on line 2: ...

검사 완료 — 8개 블록, 파싱 실패 1건, 경고 1건
```

- **FAIL** = 실제로 렌더가 깨집니다. 반드시 고치세요. (종료코드 1 — CI에서 그대로 실패 처리 가능)
- **WARN** = 파싱은 되지만 사내 규칙 위반이거나 GitHub에서 깨질 수 있습니다.

린터가 잡아주는 것:
파싱 오류 · 금지된 beta 다이어그램 · `layout: elk` · icon/img 셰이프 ·
따옴표 없는 괄호 · `[/` 셰이프 오해석 · 소문자 `end` · `participant as "따옴표"` · sequenceDiagram hex 색상

---

## 부록 — 참고 출처

- [Mermaid 공식 문서](https://mermaid.js.org/)
- [Flowchart 문법 (subgraph direction 한계 포함)](https://mermaid.js.org/syntax/flowchart.html)
- [Swimlanes 문법 (v11.16.0+)](https://mermaid.js.org/syntax/swimlanes.html)
- [C4 다이어그램 — experimental 명시](https://mermaid.js.org/syntax/c4.html)
- [GitHub Docs — Creating diagrams](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)
- [VS Code 1.121 릴리스 노트 — Mermaid 내장](https://code.visualstudio.com/updates/v1_121)
