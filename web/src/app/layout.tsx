import type { Metadata } from "next";
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
    <html lang="ko" className="h-full antialiased">
      {/* 글꼴은 시스템 산세리프 하나만 쓴다 (11 §1.2).
          별도 웹폰트를 받지 않으므로 사내망에서도 즉시 뜬다. */}
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
