import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
    ⚠️ 연구 관련도 YAML 을 서버 꾸러미에 같이 넣는다 (2026-08-27).

    `correlations.ts` 가 이 파일을 **문자열 경로로** 읽는다. Next 는 `import`
    로 이어진 것만 따라가며 챙기므로, 문자열로만 불리는 파일은 배포 꾸러미에
    안 들어간다. 실제로 구성원 상세 화면이 필요로 하는 194개 파일을 챙기면서
    이 YAML 은 빼고 있었다.

    지금처럼 프로젝트 폴더에서 `next start` 로 켜면 파일이 그 자리에 있어서
    안 드러난다. **`output: standalone` 으로 이미지를 줄이거나 서버리스에
    올리는 순간** 세 화면이 ENOENT 로 죽는다 — 구성원 상세, 예측 대 실제,
    논문값 비교.

    `/*` 는 모든 서버 라우트를 뜻한다. 값은 프로젝트 뿌리 기준이다.
  */
  outputFileTracingIncludes: {
    "/*": ["./data/research-correlations.yaml"],
  },

  /*
    검색에 안 걸리게 한다 (2026-08-27).

    `robots.ts` 는 「긁지 말아 달라」는 **부탁**이라 지키지 않는 크롤러가
    있다. 이 헤더는 색인 자체를 막는 지시라 한 겹 더 두껍다. 둘 다 둔다.

    ⚠️ 어느 쪽도 자물쇠는 아니다. **실제 방어는 로그인이다** — 로그인 없이는
    첫 화면 말고 아무것도 안 보인다.
  */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          /*
            기본 보호 헤더 (2026-09-18 점검). 다른 사이트 안에 iframe 으로 끼워
            관리자 버튼을 누르게 하는 것(clickjacking)을 막고, 파일 형식 추측과
            referer 새는 것을 막는다. HTTPS 가 아닌 사내 서버에서는 HSTS 가
            무시되므로 두어도 해가 없다.
          */
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
};

export default nextConfig;
