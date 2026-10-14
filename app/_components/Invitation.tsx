'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'

import { GUEST, PARTY, PARTY_DATES, formatPartyDate, type PartyDate } from '@/lib/party'
import { drawPassCard } from './passCard'

// 「不參加」按鈕每次逃走時換的文字
const NO_LABELS = ['不參加', '不要', '真的嗎？', '想清楚喔', '再考慮一下', '按不到吧', '我錯了']

// 逃走後出現在下方的碎念
const TEASES = [
  '欸？按不到嗎？😜',
  '再想想嘛～',
  '大寶不可以不來啦！',
  '「參加」按鈕在這邊喔 👈',
  '放棄吧，你逃不掉的 🎂',
  '蛋糕已經幫你留好了 🍰',
  '大家都在等你耶 🥺',
]

const CONFETTI_COLORS = ['#fde68a', '#fbbf24', '#f59e0b', '#e879f9', '#a78bfa', '#fef3c7']

// 逃走後至少要離滑鼠／手指多遠（px）
const SAFE_DISTANCE = 220

type Confetti = { id: number; left: number; color: string; duration: number; delay: number; size: number }

// invite：邀請函 → pickDate：選日期 → done：已儲存，慶祝
type Stage = 'invite' | 'pickDate' | 'done'

export default function Invitation() {
  const [stage, setStage] = useState<Stage>('invite')
  const [date, setDate] = useState<PartyDate | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // 闖關卡圖片：進到確認畫面時先畫好，按下儲存時才能馬上叫出手機的分享選單
  const [passCard, setPassCard] = useState<Blob | null>(null)
  const [passError, setPassError] = useState('')
  const [noPos, setNoPos] = useState<{ left: number; top: number } | null>(null)
  const [dodges, setDodges] = useState(0)
  const [confetti, setConfetti] = useState<Confetti[]>([])

  const noRef = useRef<HTMLButtonElement>(null)
  const yesRef = useRef<HTMLButtonElement>(null)

  // 讓「不參加」按鈕跳到畫面上一個隨機位置：要離滑鼠夠遠，也不能蓋住「參加」按鈕
  const flee = useCallback((pointerX?: number, pointerY?: number) => {
    const no = noRef.current
    if (!no) return

    const rect = no.getBoundingClientRect()
    const px = pointerX ?? rect.left + rect.width / 2
    const py = pointerY ?? rect.top + rect.height / 2
    const yes = yesRef.current?.getBoundingClientRect()
    const margin = 16
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin)
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin)

    let best = { left: margin, top: margin }
    let bestDistance = -1
    for (let i = 0; i < 40; i++) {
      const left = margin + Math.random() * (maxX - margin)
      const top = margin + Math.random() * (maxY - margin)
      const distance = Math.hypot(left + rect.width / 2 - px, top + rect.height / 2 - py)
      const overlapsYes =
        yes &&
        left < yes.right + 24 &&
        left + rect.width > yes.left - 24 &&
        top < yes.bottom + 24 &&
        top + rect.height > yes.top - 24
      if (overlapsYes) continue
      if (distance > bestDistance) {
        best = { left, top }
        bestDistance = distance
      }
      if (distance >= SAFE_DISTANCE) break
    }

    setNoPos(best)
    setDodges((d) => d + 1)
  }, [])

  // 視窗大小改變時，把按鈕放回原位，避免它跑到畫面外
  useEffect(() => {
    const reset = () => setNoPos(null)
    window.addEventListener('resize', reset)
    return () => window.removeEventListener('resize', reset)
  }, [])

  // 之前選過日期的話，先帶入（GET /api/rsvp）
  useEffect(() => {
    fetch('/api/rsvp')
      .then((res) => res.json())
      .then((res) => {
        if (res.ok && res.data) setDate((d) => d ?? res.data.date)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (stage !== 'done' || !date) return
    let cancelled = false
    drawPassCard(date)
      .then((blob) => {
        if (!cancelled) setPassCard(blob)
      })
      .catch(() => {
        if (!cancelled) setPassError('闖關卡產生失敗，請重新整理再試一次')
      })
    return () => {
      cancelled = true
    }
  }, [stage, date])

  // 儲存闖關卡：手機用分享選單（可以選「儲存影像」存到相簿），電腦直接下載 PNG
  async function savePassCard() {
    if (!passCard) return
    const file = new File([passCard], `闖關卡-${GUEST}.png`, { type: 'image/png' })
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    if (isTouch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `闖關者：${GUEST}` })
        return
      } catch (err) {
        // 使用者自己關掉分享選單，不用做任何事
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function accept() {
    setStage('pickDate')
    setSaveError('')
  }

  // 儲存選擇的日期（POST /api/rsvp），成功才放彩帶
  async function confirmDate() {
    if (!date) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      }).then((r) => r.json())
      if (!res.ok) {
        setSaveError(res.error ?? '儲存失敗，請再試一次')
        return
      }
    } catch {
      setSaveError('無法連線到伺服器，請再試一次')
      return
    } finally {
      setSaving(false)
    }
    setStage('done')
    setConfetti(
      Array.from({ length: 120 }, (_, id) => ({
        id,
        left: Math.random() * 100,
        color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
        duration: 2.5 + Math.random() * 2.5,
        delay: Math.random() * 1.2,
        size: 0.6 + Math.random() * 0.8,
      })),
    )
  }

  function restart() {
    setStage('invite')
    setPassCard(null)
    setPassError('')
    setNoPos(null)
    setDodges(0)
    setConfetti([])
  }

  // 「不參加」按鈕。開始逃跑後改用 portal 放到 <body>：
  // 卡片有 transform / backdrop-blur，在它裡面的 position: fixed 會以卡片為準，而不是整個畫面
  const noButton = (
    <button
      ref={noRef}
      // 一按下去（滑鼠或手指）就逃走，按鍵還沒放開按鈕就已經跑掉了，所以永遠點不成功；
      // 用鍵盤選到再按 Enter 也一樣會逃走
      onPointerDown={(e) => {
        e.preventDefault()
        flee(e.clientX, e.clientY)
      }}
      onClick={(e) => {
        e.preventDefault()
        flee()
      }}
      className="z-50 whitespace-nowrap rounded-full border-2 border-violet-400/40 bg-[#1e1035] px-6 py-3 text-violet-300/80 transition-[left,top] duration-300 ease-out"
      style={noPos ? { position: 'fixed', left: noPos.left, top: noPos.top } : undefined}
    >
      {NO_LABELS[Math.min(dodges, NO_LABELS.length - 1)]}
    </button>
  )

  // 每逃一次「參加」按鈕就變大一點
  const yesScale = Math.min(1 + dodges * 0.08, 1.6)

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#4c1d95_0%,#1e1035_45%,#0c0618_100%)] px-4 py-12 text-violet-50">
      {/* 星空 */}
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(1px_1px_at_12%_20%,white,transparent),radial-gradient(1px_1px_at_78%_14%,white,transparent),radial-gradient(1.5px_1.5px_at_36%_72%,white,transparent),radial-gradient(1px_1px_at_88%_58%,white,transparent),radial-gradient(1px_1px_at_8%_86%,white,transparent),radial-gradient(1.5px_1.5px_at_58%_8%,white,transparent),radial-gradient(1px_1px_at_66%_88%,white,transparent),radial-gradient(1px_1px_at_24%_48%,white,transparent)]" />

      {/* 背景裝飾 */}
      <span className="animate-float pointer-events-none absolute left-[8%] top-[10%] text-5xl opacity-80 sm:text-6xl">⚔️</span>
      <span
        className="animate-float pointer-events-none absolute right-[10%] top-[16%] text-4xl opacity-80 sm:text-5xl"
        style={{ animationDelay: '0.8s' }}
      >
        🛡️
      </span>
      <span
        className="animate-float pointer-events-none absolute bottom-[12%] left-[12%] text-4xl opacity-80 sm:text-5xl"
        style={{ animationDelay: '1.6s' }}
      >
        💰
      </span>
      <span
        className="animate-float pointer-events-none absolute bottom-[8%] right-[8%] text-5xl opacity-80 sm:text-6xl"
        style={{ animationDelay: '2.2s' }}
      >
        ✨
      </span>

      {/* 金色火花 */}
      {confetti.map((c) => (
        <span
          key={c.id}
          className="confetti-piece"
          style={{
            left: `${c.left}vw`,
            background: c.color,
            boxShadow: `0 0 8px ${c.color}`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            scale: c.size,
          }}
        />
      ))}

      {/* 任務面板：深色底＋金框，四個角有裝飾 */}
      <section className="animate-pop-in relative w-full max-w-md rounded-[1.75rem] border-2 border-amber-400/50 bg-gradient-to-b from-[#2a1650]/95 to-[#140a28]/95 px-7 py-10 text-center shadow-[0_0_60px_-10px_rgba(251,191,36,0.35)] backdrop-blur sm:px-10">
        <div className="pointer-events-none absolute inset-2 rounded-[1.4rem] border border-amber-300/15" />
        {['left-3 top-3', 'right-3 top-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos) => (
          <span key={pos} className={`pointer-events-none absolute ${pos} text-sm text-amber-300/70`}>
            ◆
          </span>
        ))}

        {stage === 'pickDate' ? (
          <div key="pick" className="animate-pop-in relative">
            <div className="mb-4 text-6xl">🗺️</div>
            <h1 className="font-display text-3xl font-black">
              <GoldText>太好了！</GoldText>
            </h1>
            <p className="mt-3 text-lg text-violet-100">{GUEST}，你哪一天方便呢？</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {PARTY_DATES.map((option) => {
                const selected = date === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setDate(option.value)}
                    aria-pressed={selected}
                    className={`rounded-2xl border-2 px-3 py-5 transition ${
                      selected
                        ? 'scale-105 border-amber-300 bg-gradient-to-b from-amber-300 to-amber-500 text-violet-950 shadow-[0_0_30px_-4px_rgba(251,191,36,0.7)]'
                        : 'border-amber-400/30 bg-black/20 text-violet-50 hover:border-amber-300/70'
                    }`}
                  >
                    <span className="block font-display text-xl font-black">{option.label}</span>
                    <span className={`mt-1 block text-sm ${selected ? 'text-violet-950/70' : 'text-violet-300/70'}`}>
                      {option.weekday}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-sm text-violet-300/80">⏰ {PARTY.time}・📍 {PARTY.place}</p>
            <p className="mt-4 h-5 text-sm text-rose-300">{saveError}</p>
            <button
              onClick={confirmDate}
              disabled={!date || saving}
              className="mt-2 w-full rounded-full bg-gradient-to-b from-amber-300 to-amber-500 py-3 text-lg font-bold text-violet-950 shadow-[0_0_30px_-6px_rgba(251,191,36,0.8)] transition hover:brightness-110 disabled:opacity-40"
            >
              {saving ? '儲存中…' : date ? '就決定是這天！' : '請先選一天'}
            </button>
          </div>
        ) : stage === 'done' && date ? (
          <div key="yes" className="animate-pop-in relative">
            <p className="mb-4 text-xs tracking-[0.4em] text-amber-300/80">QUEST ACCEPTED</p>
            <Image
              src="/dabao.jpg"
              alt={`闖關者 ${GUEST}`}
              width={1195}
              height={1215}
              sizes="176px"
              className="mx-auto mb-5 h-44 w-44 rounded-3xl object-cover shadow-[0_0_40px_-6px_rgba(251,191,36,0.6)] ring-4 ring-amber-300/80"
            />
            <h1 className="font-display text-3xl font-black">
              <GoldText>闖關者：{GUEST}</GoldText>
            </h1>
            <PartyDetails date={date} />
            <button
              onClick={savePassCard}
              disabled={!passCard}
              className="mt-6 w-full rounded-full border-2 border-amber-300/70 bg-black/20 py-3 font-bold text-amber-200 transition hover:bg-amber-300/10 disabled:opacity-50"
            >
              {passCard ? '📥 儲存闖關卡' : passError ? '無法產生闖關卡' : '闖關卡製作中…'}
            </button>
            {passError && <p className="mt-2 text-sm text-rose-300">{passError}</p>}
            <Link
              href="/quest"
              className="mt-6 block rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-violet-700 to-fuchsia-700 px-5 py-4 text-white shadow-[0_0_30px_-8px_rgba(192,38,211,0.8)] transition hover:brightness-110"
            >
              <span className="block text-xs tracking-[0.3em] text-amber-200">生日特別企劃</span>
              <span className="mt-1 block text-lg font-bold">👹 魔王封印戰：奪回生日購物金 →</span>
            </Link>
            <button
              onClick={restart}
              className="mt-6 text-xs text-violet-300/50 underline-offset-4 hover:underline"
            >
              重新看一次邀請函
            </button>
          </div>
        ) : (
          <div key="invite" className="relative">
            <div className="mb-3 text-6xl">⚔️</div>
            <p className="text-xs tracking-[0.4em] text-amber-300/80">BIRTHDAY QUEST</p>
            <h1 className="mt-3 font-display text-3xl font-black leading-relaxed sm:text-4xl">
              <GoldText>{GUEST}</GoldText>
            </h1>
            <p className="mt-3 leading-relaxed text-violet-100/90">邀請您來參加“生日購物金奪回大作戰”</p>

            <PartyDetails />

            <p className="mt-8 font-display font-bold text-amber-100">你會來嗎？</p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                ref={yesRef}
                onClick={accept}
                className="animate-wiggle rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-3 text-lg font-bold text-violet-950 shadow-[0_0_30px_-4px_rgba(251,191,36,0.8)] transition hover:brightness-110"
                style={{ '--yes-scale': yesScale } as CSSProperties}
              >
                參加 ⚔️
              </button>
              {noPos ? createPortal(noButton, document.body) : noButton}
            </div>
            <p className="mt-5 h-6 text-sm text-amber-200/80">{dodges > 0 && TEASES[(dodges - 1) % TEASES.length]}</p>
          </div>
        )}
      </section>
    </main>
  )
}

// 金色漸層文字
function GoldText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]">
      {children}
    </span>
  )
}

// date 有值時顯示選好的日期，否則顯示兩個可選的日期
function PartyDetails({ date }: { date?: PartyDate }) {
  const dateText = date
    ? formatPartyDate(date)
    : `${PARTY_DATES.map((d) => `${d.label}（${d.weekday.slice(-1)}）`).join(' 或 ')}，由你決定！`
  const rows = [
    ['📅', '日期', dateText],
    ['⏰', '時間', PARTY.time],
    ['📍', '地點', PARTY.place],
    ['👕', '服裝', PARTY.dressCode],
  ]
  return (
    <dl className="mt-7 space-y-3 rounded-2xl border border-amber-400/20 bg-black/25 px-5 py-5 text-left text-sm">
      {rows.map(([icon, label, value]) => (
        <div key={label} className="flex gap-3">
          <dt className="shrink-0">
            {icon} <span className="text-amber-200/60">{label}</span>
          </dt>
          <dd className="font-medium text-violet-50">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
