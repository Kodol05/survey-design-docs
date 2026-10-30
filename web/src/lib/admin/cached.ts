import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { loadPeople, loadPersonQuality, loadReliability } from "./analysis";

/**
 * 분석용 데이터를 **서버에서 잠시 기억해 둔다** (2026-10-30 사용자 결정).
 *
 * ## 왜
 *
 * DB가 미국 동부(us-east-1)에 있어, 로컬에서는 질문 하나가 0.2초씩 태평양을
 * 왕복한다. 분석 탭을 바꿀 때마다 응시 기록 · 문항 응답 전체 · 응답 품질을
 * 처음부터 다시 불러와 2~3초씩 걸렸다. 이 값들은 설문을 새로 제출하거나
 * 문항 · 사람을 고칠 때만 바뀐다.
 *
 * ## 어디에 · 언제 지우나
 *
 * 기억은 서버 쪽(로컬은 개발 서버, 배포는 Vercel 데이터 캐시)에 있다 —
 * 브라우저나 DB가 아니다. 계산이 끝난 숫자를 보관할 뿐이고, 로그인 확인은
 * 기억하지 않는다(늘 새로 한다).
 *
 *   - 바로 지움: 설문 제출, 문항 수정, 구성원 삭제 → `forgetAnalysis()`
 *   - 그래도 놓친 변경(스크립트로 바로 DB를 고친 경우 등)은 10분 뒤 저절로 새로 잰다
 *
 * Next 16 에서 `unstable_cache` 는 `'use cache'` 로 바뀌는 중이지만, 그쪽은
 * `cacheComponents` 설정을 켜야 하고 앱 전체의 그리기 방식이 바뀐다. 이 앱은
 * 그 설정을 쓰지 않으므로 문서(`caching-without-cache-components`)대로 이것을 쓴다.
 */

/** 분석 데이터에 붙이는 꼬리표 하나 — 지울 때 이것으로 한꺼번에 지운다 */
export const ANALYSIS_TAG = "analysis";

/** 놓친 변경을 그래도 따라잡는 시간(초) */
const FALLBACK_SECONDS = 600;

const opts = { tags: [ANALYSIS_TAG], revalidate: FALLBACK_SECONDS };

/** 분석에 쓰는 사람 목록 (응시를 끝낸 사원, 사람마다 가장 최근 것) */
export const cachedPeople = unstable_cache(() => loadPeople(), ["analysis-people"], opts);

/** 척도별 Cronbach's α */
export const cachedReliability = unstable_cache(
  () => loadReliability(),
  ["analysis-reliability"],
  opts,
);

/** 사람별 응답 품질 */
export const cachedPersonQuality = unstable_cache(
  () => loadPersonQuality(),
  ["analysis-person-quality"],
  opts,
);

/**
 * 기억해 둔 분석 데이터를 바로 버린다 — **서버 액션 안에서만** 부른다
 * (`updateTag` 규칙). 다음에 여는 화면이 새 값으로 다시 잰다.
 */
export function forgetAnalysis() {
  updateTag(ANALYSIS_TAG);
}
