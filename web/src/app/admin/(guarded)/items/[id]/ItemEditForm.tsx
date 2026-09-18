"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateItemAction } from "@/lib/admin/actions";
import {
  ITEM_STATUSES,
  SECTION_MAX,
  SECTION_MIN,
  validateItemPatch,
  type ItemPatch,
} from "@/lib/items/edit";
import { ABILITY_AXIS_DB, TRAIT_SCALES } from "@/lib/items/types";

/** DB enum 이름 → 화면에 보일 한글 */
const AXIS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(ABILITY_AXIS_DB).map(([ko, db]) => [db, ko]),
);
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안",
  REVIEW: "검토",
  ACTIVE: "활성",
  RETIRED: "폐기",
};

const field = "h-11 rounded-lg border border-[--border] bg-surface px-3";
const label = "text-table font-medium";

/**
 * 문항 한 개를 고치는 폼.
 *
 * 저장 직전 `validateItemPatch` 로 화면에서 먼저 걸러 사람에게 바로 알려주고,
 * 서버 액션이 같은 검사를 한 번 더 한다 (우회 방지). 성공하면 액션이 목록으로
 * 돌려보내므로 여기서는 따로 성공 화면을 그리지 않는다.
 */
export function ItemEditForm({
  id,
  kind,
  code,
  orderNo,
  content: content0,
  section: section0,
  isReverse: isReverse0,
  status: status0,
  scale: scale0,
  subscale: subscale0,
  abilityAxis: abilityAxis0,
  isDirect: isDirect0,
  subscaleOptions,
}: {
  id: string;
  kind: "TRAIT" | "ABILITY";
  code: string;
  orderNo: number;
  content: string;
  section: number;
  isReverse: boolean;
  status: string;
  scale: string | null;
  subscale: string | null;
  abilityAxis: string | null;
  isDirect: boolean | null;
  subscaleOptions: string[];
}) {
  const [content, setContent] = useState(content0);
  const [section, setSection] = useState(section0);
  const [isReverse, setIsReverse] = useState(isReverse0);
  const [status, setStatus] = useState(status0);
  const [scale, setScale] = useState(scale0 ?? "");
  const [subscale, setSubscale] = useState(subscale0 ?? "");
  const [abilityAxis, setAbilityAxis] = useState(abilityAxis0 ?? "");
  const [isDirect, setIsDirect] = useState(Boolean(isDirect0));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    const patch: ItemPatch = {
      content,
      section,
      isReverse,
      status,
      ...(kind === "TRAIT"
        ? { scale, subscale }
        : { abilityAxis, isDirect }),
    };
    const bad = validateItemPatch(kind, patch);
    if (bad) {
      setError(bad);
      return;
    }
    setError(null);
    start(async () => {
      const r = await updateItemAction(id, kind, patch);
      // 성공하면 서버가 목록으로 보낸다. 오류일 때만 문장이 돌아온다
      if (r?.error) setError(r.error);
    });
  };

  return (
    <div className="flex max-w-[48rem] flex-col gap-6">
      {/* 문항 */}
      <label className="flex flex-col gap-1.5">
        <span className={label}>문항 내용</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="rounded-lg border border-[--border] bg-surface px-3 py-2 leading-relaxed"
        />
      </label>

      {/* 축 · 세부 / 직무능력 축 · 직접여부 */}
      {kind === "TRAIT" ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={label}>성향 축</span>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className={field}
            >
              {TRAIT_SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>세부 항목</span>
            <input
              value={subscale}
              onChange={(e) => setSubscale(e.target.value)}
              list="subscale-options"
              className={field}
              placeholder="예: 탐색적 흥분"
            />
            <datalist id="subscale-options">
              {subscaleOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={label}>직무능력 축</span>
            <select
              value={abilityAxis}
              onChange={(e) => setAbilityAxis(e.target.value)}
              className={field}
            >
              {Object.values(ABILITY_AXIS_DB).map((db) => (
                <option key={db} value={db}>
                  {AXIS_LABEL[db]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>묻는 방식</span>
            <select
              value={isDirect ? "direct" : "indirect"}
              onChange={(e) => setIsDirect(e.target.value === "direct")}
              className={field}
            >
              <option value="direct">직접 — 능력을 바로 묻는다</option>
              <option value="indirect">간접 — 행동을 묻는다</option>
            </select>
          </label>
        </div>
      )}

      {/* 묶음 · 상태 */}
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={label}>묶음</span>
          <select
            value={section}
            onChange={(e) => setSection(Number(e.target.value))}
            className={field}
          >
            {Array.from(
              { length: SECTION_MAX - SECTION_MIN + 1 },
              (_, i) => SECTION_MIN + i,
            ).map((n) => (
              <option key={n} value={n}>
                {n}묶음
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>상태</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={field}
          >
            {ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 역채점 */}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isReverse}
          onChange={(e) => setIsReverse(e.target.checked)}
          className="mt-1 size-5"
        />
        <span>
          <span className={label}>역채점 문항</span>
          <span className="text-axis text-ink-muted block">
            답을 뒤집어 계산합니다. 반대 방향으로 물어 대충 찍는 응답을
            걸러내는 데 씁니다.
          </span>
        </span>
      </label>

      <div className="mt-2 flex items-center gap-4">
        <Button onClick={save} disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
        <span className="text-axis text-ink-muted tabular">
          {code} · {orderNo}번
        </span>
        {error && (
          <p
            role="alert"
            className="text-table"
            style={{ color: "var(--status-critical)" }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
