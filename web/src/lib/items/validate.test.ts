import { describe, expect, it } from "vitest";
import { loadItemFile } from "./load";
import { validateItemFile } from "./validate";
import type { ItemFile } from "./types";

const base = (): ItemFile => ({
  version: 1,
  title: "t",
  items: [
    { kind: "trait", code: "T1", scale: "자극추구", subscale: "흥분", content: "가", sourceRef: "s" },
    { kind: "ability", code: "A1", axis: "협력", direct: true, content: "나", sourceRef: "s" },
    { kind: "ability", code: "A2", axis: "협력", direct: false, content: "다", sourceRef: "s" },
  ],
});

const codes = (f: ItemFile) => validateItemFile(f).map((p) => p.message);

describe("문항 파일 검사", () => {
  it("정상 파일은 통과한다", () => {
    expect(validateItemFile(base())).toEqual([]);
  });

  it("근거 출처가 비면 걸린다 — 저작권 대응이 말로만 끝나지 않게", () => {
    const f = base();
    f.items[0].sourceRef = "";
    expect(codes(f).join()).toContain("근거 출처");
  });

  it("문항 코드가 중복되면 걸린다", () => {
    const f = base();
    f.items[1].code = "T1";
    expect(codes(f).join()).toContain("중복");
  });

  it("알 수 없는 성향 축은 걸린다", () => {
    const f = base();
    (f.items[0] as { scale: string }).scale = "없는축";
    expect(codes(f).join()).toContain("알 수 없는 성향 축");
  });

  it("능력당 직접형이 1개가 아니면 걸린다", () => {
    const f = base();
    (f.items[2] as { direct: boolean }).direct = true;
    expect(codes(f).join()).toContain("직접형");
  });

  it("직접형이 하나도 없어도 걸린다", () => {
    const f = base();
    (f.items[1] as { direct: boolean }).direct = false;
    expect(codes(f).join()).toContain("직접형");
  });

  it("역방향 짝이 서로를 안 가리키면 걸린다", () => {
    const f = base();
    f.items[0].antonymOf = "A1";
    expect(codes(f).join()).toContain("가리키지 않습니다");
  });

  it("짝인데 역방향 여부가 같으면 걸린다", () => {
    const f = base();
    f.items[0].antonymOf = "A1";
    f.items[1].antonymOf = "T1";
    expect(codes(f).join()).toContain("역방향 여부가 같습니다");
  });

  it("없는 짝을 가리키면 걸린다", () => {
    const f = base();
    f.items[0].antonymOf = "ZZZ";
    expect(codes(f).join()).toContain("없습니다");
  });

  it("strictCount에서 문항 수가 틀리면 걸린다", () => {
    const p = validateItemFile(base(), { strictCount: true }).map((x) => x.message).join();
    expect(p).toContain("120개여야 합니다");
  });
});

describe("문항 파일 로더", () => {
  it("v1.yaml이 파싱되고 형식 검사를 통과한다", () => {
    const f = loadItemFile("data/items/v1.yaml");
    expect(f.version).toBe(1);
    expect(f.items.length).toBeGreaterThan(0);
  });
});
