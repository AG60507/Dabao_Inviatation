import type { Metadata } from "next";
import { Chiron_GoRound_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";

// 圓體中文字型；中文字太多無法預先載入，所以 preload 設為 false。
// Next.js 沒有這個字型的備用字型資料，關掉 adjustFontFallback 避免每次編譯都跳警告
const goRound = Chiron_GoRound_TC({
  variable: "--font-goround",
  preload: false,
  adjustFontFallback: false,
});

// 標題用的明體：冒險遊戲、任務卷軸的感覺
const serif = Noto_Serif_TC({
  variable: "--font-serif-tc",
  weight: ["700", "900"],
  preload: false,
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "周大寶，生日派對邀請你！",
  description: "誠摯邀請周大寶來參加生日派對 🎂",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${goRound.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
