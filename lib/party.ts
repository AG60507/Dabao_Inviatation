// 派對的共用設定：前端頁面和 API 都從這裡讀，改這裡就會全部一起改

export const GUEST = '周大寶'

// 讓大寶選擇的派對日期（value 是存進資料庫的格式 YYYY-MM-DD）
export const PARTY_DATES = [
  { value: '2026-10-26', label: '10 月 26 日', weekday: '星期一' },
  { value: '2026-10-27', label: '10 月 27 日', weekday: '星期二' },
] as const

export type PartyDate = (typeof PARTY_DATES)[number]['value']

export const PARTY = {
  time: '11:00 ~ 17:00',
  place: '中和環球',
  dressCode: '穿你最喜歡的顏色來！',
}

export function isPartyDate(value: unknown): value is PartyDate {
  return PARTY_DATES.some((d) => d.value === value)
}

// 例如 '2026-10-26' → '2026 年 10 月 26 日（星期一）'
export function formatPartyDate(value: PartyDate) {
  const d = PARTY_DATES.find((option) => option.value === value)!
  return `${value.slice(0, 4)} 年 ${d.label}（${d.weekday}）`
}
