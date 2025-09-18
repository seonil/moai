import type { Metadata } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSans = Noto_Sans_KR({ subsets: ["latin"], variable: "--font-noto-sans-kr" });

export const metadata: Metadata = {
  title: {
    default: "MOAI Generative Lab",
    template: "%s · MOAI Generative Lab",
  },
  description:
    "MOAI 바이브코딩에서 만든 생성형 AI 실험도구 모음. 전생 탐험부터 이미지 보정까지 하나의 앱에서 탐색하세요.",
  metadataBase: new URL("https://moai.local"),
  openGraph: {
    title: "MOAI Generative Lab",
    description:
      "전생 탐험, 글로벌 변신, 헤어 스타일링 등 생성형 AI 실험을 하나의 대시보드에서 즐겨보세요.",
    type: "website",
  },
  keywords: [
    "MOAI",
    "생성형AI",
    "이미지 생성",
    "전생 테스트",
    "AI 시뮬레이터",
  ],
  authors: [{ name: "MOAI Vibe Coding" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${notoSans.variable}`}>
      <body className="antialiased" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1" style={{ backgroundColor: 'var(--bg-primary)' }}>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
