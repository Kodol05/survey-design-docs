import type { Metadata } from "next";
import { THEME_SCRIPT } from "@/lib/theme";
import { ThemeOnRoute } from "@/components/ui/ThemeOnRoute";
import "./globals.css";

export const metadata: Metadata = {
  title: "7차원 성향 설문",
  description: "사내 성향·직무능력 설문",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      {/* 글꼴은 시스템 산세리프 하나만 쓴다 (11 §1.2).
          별도 웹폰트를 받지 않으므로 사내망에서도 즉시 뜬다. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/*
          화면 안에서 주소가 바뀔 때 밝기를 다시 건다. `<head>` 스크립트는
          문서를 새로 받을 때만 돌기 때문이다 (2026-08-26).
        */}
        <ThemeOnRoute />
        {children}
      </body>
    </html>
  );
}
