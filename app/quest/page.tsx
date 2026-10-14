import type { Metadata } from 'next'
import Link from 'next/link'
import { GUEST } from '@/lib/party'

const MONSTER = '貪慾獸'

export const metadata: Metadata = {
  title: '魔王封印戰・奪回生日購物金',
  description: `${GUEST}的生日特別企劃：破解${MONSTER}的六道封印，奪回生日購物金！`,
}

// 生日特別企劃的活動簡介（遊戲內容之後再加上）
export default function QuestPage() {
  return (
    <main className="relative flex flex-1 items-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#4c1d95_0%,#1e1035_45%,#0c0618_100%)] px-4 py-16 text-violet-50">
      {/* 星星背景 */}
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(1px_1px_at_20%_30%,white,transparent),radial-gradient(1px_1px_at_70%_20%,white,transparent),radial-gradient(1.5px_1.5px_at_40%_70%,white,transparent),radial-gradient(1px_1px_at_85%_60%,white,transparent),radial-gradient(1px_1px_at_10%_85%,white,transparent),radial-gradient(1.5px_1.5px_at_55%_10%,white,transparent)]" />

      <div className="relative mx-auto w-full max-w-2xl">
        <header className="text-center">
          <p className="text-xs tracking-[0.4em] text-amber-300/80">BIRTHDAY SPECIAL QUEST</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              魔王封印戰
            </span>
          </h1>
          <p className="mt-2 text-violet-200/80">奪回 {GUEST} 的生日購物金</p>
        </header>

        <section className="mt-8 rounded-2xl border border-violet-400/20 bg-violet-950/40 p-5 text-sm leading-7 text-violet-100/85 backdrop-blur">
          <p className="mb-1 font-semibold text-amber-300">📜 故事背景</p>
          傳說有一隻名叫「{MONSTER}」的怪物，偷走了壽星原本應得的生日購物金，並將金錢封印在自己的六個部位。
          壽星必須在<strong className="text-orange-300">日落前</strong>
          ，找到六道封印，破解怪物設下的任務，才能逐步奪回購物金。
        </section>

        <footer className="mt-10 text-center text-xs text-violet-300/50">
          <Link href="/" className="hover:text-violet-200">
            ← 回到邀請函
          </Link>
        </footer>
      </div>
    </main>
  )
}
