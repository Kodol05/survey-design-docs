import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { smoothScrollIntoView, smoothScrollTo } from "./smoothScroll";

/*
  윈도우 「애니메이션 끄기」에서도 **여러 프레임에 걸쳐** 움직이는지 본다
  (2026-10-30). 브라우저의 smooth는 그 설정에서 한 번에 점프했다.

  창은 가짜로 만든다 — scrollTo가 받은 자리를 기록하고, 프레임은 손으로 넘긴다.
*/
let y = 0;
let now = 0;
let frames: FrameRequestCallback[] = [];
const scrolls: number[] = [];

beforeEach(() => {
  y = 0;
  now = 0;
  frames = [];
  scrolls.length = 0;
  vi.stubGlobal("window", {
    get scrollY() {
      return y;
    },
    scrollTo: ({ top }: { top: number }) => {
      y = top;
      scrolls.push(top);
    },
  });
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frames = [];
  });
});

afterEach(() => vi.unstubAllGlobals());

/** 16ms씩 프레임을 넘기며 끝까지 돌린다 */
function runFrames() {
  let guard = 0;
  while (frames.length && guard++ < 200) {
    now += 16;
    const cb = frames.shift()!;
    cb(now);
  }
}

describe("smoothScrollTo", () => {
  it("한 번에 뛰지 않고 여러 프레임에 걸쳐 도착한다", () => {
    smoothScrollTo(600);
    runFrames();
    expect(scrolls.length).toBeGreaterThan(10);
    expect(scrolls.at(-1)).toBe(600);
    // 가는 길은 앞으로만 간다
    for (let i = 1; i < scrolls.length; i++) {
      expect(scrolls[i]).toBeGreaterThanOrEqual(scrolls[i - 1]);
    }
    // 중간 프레임은 출발점과 도착점 사이에 있다
    expect(scrolls[Math.floor(scrolls.length / 2)]).toBeGreaterThan(0);
    expect(scrolls[Math.floor(scrolls.length / 2)]).toBeLessThan(600);
  });

  it("이미 그 자리면 움직이지 않는다", () => {
    smoothScrollTo(0);
    runFrames();
    expect(scrolls).toEqual([]);
  });
});

describe("smoothScrollIntoView", () => {
  it("도착점은 브라우저에게 묻고, 제자리로 돌린 뒤 그 사이를 움직인다", () => {
    y = 100;
    const el = {
      scrollIntoView: () => {
        y = 900;
      },
    } as unknown as Element;
    smoothScrollIntoView(el, "center");
    // 도착점을 읽은 직후 출발점으로 돌려놓았다
    expect(y).toBe(100);
    runFrames();
    expect(scrolls.at(-1)).toBe(900);
    expect(scrolls.length).toBeGreaterThan(10);
  });
});
