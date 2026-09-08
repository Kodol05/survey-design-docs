import type { MetadataRoute } from "next";

/**
 * 검색에 걸리지 않게 한다 (2026-08-27).
 *
 * 사내 사람만 쓰는 곳이라 검색 결과에 뜰 이유가 없다. 주소를 아는 사람만
 * 들어오면 된다.
 *
 * ⚠️ **이것만으로 막히는 것은 아니다.** robots.txt 는 「긁지 말아 달라」는
 * 부탁이지 자물쇠가 아니다. 실제 방어는 그대로 로그인이다 — 로그인 없이는
 * 첫 화면 말고 아무것도 안 보인다.
 *
 * 사내 서버로 옮겨도 그대로 두면 된다. 사내망이라 검색엔진이 못 오지만,
 * 있어서 나쁠 것이 없다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
