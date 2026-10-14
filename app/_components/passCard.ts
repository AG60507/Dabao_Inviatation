// 用 Canvas 畫出「闖關卡」圖片，讓壽星可以存到手機相簿。只能在瀏覽器裡執行
import { GUEST, PARTY, formatPartyDate, type PartyDate } from '@/lib/party'

const W = 1080
const H = 1500
const PHOTO_SRC = '/dabao.jpg'

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`無法載入圖片 ${src}`))
    img.src = src
  })
}

// 把文字畫在水平置中的位置
function centerText(ctx: CanvasRenderingContext2D, text: string, y: number) {
  ctx.textAlign = 'center'
  ctx.fillText(text, W / 2, y)
  ctx.textAlign = 'left'
}

export async function drawPassCard(date: PartyDate): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('瀏覽器不支援 Canvas')

  // 使用網頁上同一套字型：內文圓體、標題明體
  const font = getComputedStyle(document.body).fontFamily
  const serif = getComputedStyle(document.documentElement).getPropertyValue('--font-serif-tc').trim() || 'serif'
  const details: [string, string, string][] = [
    ['📅', '日期', formatPartyDate(date)],
    ['⏰', '時間', PARTY.time],
    ['📍', '地點', PARTY.place],
    ['👕', '服裝', PARTY.dressCode],
  ]
  const title = `闖關者：${GUEST}`
  const texts = [
    'BIRTHDAY QUEST PASS',
    title,
    '生日購物金奪回大作戰',
    '魔王封印戰：奪回生日購物金',
    ...details.flatMap(([, label, value]) => [label, value]),
  ].join('')

  // 中文字型是用到哪些字才下載哪些字，畫之前先確保這些字都載好了
  const [photo] = await Promise.all([
    loadImage(PHOTO_SRC),
    document.fonts.load(`700 40px ${font}`, texts),
    document.fonts.load(`400 40px ${font}`, texts),
    document.fonts.load(`900 80px ${serif}`, title),
  ])

  // 背景：深紫色夜空
  const bg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H)
  bg.addColorStop(0, '#4c1d95')
  bg.addColorStop(0.45, '#1e1035')
  bg.addColorStop(1, '#0c0618')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 星星（固定位置，每次畫出來都一樣）
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  for (let i = 0; i < 70; i++) {
    const x = (i * 397) % W
    const y = (i * 631) % H
    ctx.beginPath()
    ctx.arc(x, y, i % 5 === 0 ? 2 : 1.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // 四個角落的裝飾
  ctx.font = `80px ${font}`
  ctx.fillText('⚔️', 30, 130)
  ctx.fillText('🛡️', W - 120, 160)
  ctx.fillText('💰', 40, H - 50)
  ctx.fillText('✨', W - 120, H - 40)

  // 任務面板：深色底＋金框
  ctx.save()
  ctx.shadowColor = 'rgba(251, 191, 36, 0.35)'
  ctx.shadowBlur = 70
  const panel = ctx.createLinearGradient(0, 90, 0, H - 90)
  panel.addColorStop(0, '#2a1650')
  panel.addColorStop(1, '#140a28')
  ctx.fillStyle = panel
  ctx.beginPath()
  ctx.roundRect(90, 90, W - 180, H - 180, 56)
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(90, 90, W - 180, H - 180, 56)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(252, 211, 77, 0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(108, 108, W - 216, H - 216, 44)
  ctx.stroke()
  ctx.fillStyle = 'rgba(252, 211, 77, 0.75)'
  ctx.font = `28px ${font}`
  for (const [x, y] of [
    [118, 140],
    [W - 140, 140],
    [118, H - 118],
    [W - 140, H - 118],
  ]) {
    ctx.fillText('◆', x, y)
  }

  // 標籤
  ctx.fillStyle = 'rgba(252, 211, 77, 0.85)'
  ctx.font = `400 30px ${font}`
  ctx.letterSpacing = '10px'
  centerText(ctx, 'BIRTHDAY QUEST PASS', 190)
  ctx.letterSpacing = '0px'

  // 照片：裁成正方形，圓角＋金框
  const size = 420
  const px = (W - size) / 2
  const py = 230
  const side = Math.min(photo.width, photo.height)
  ctx.save()
  ctx.shadowColor = 'rgba(251, 191, 36, 0.6)'
  ctx.shadowBlur = 50
  ctx.fillStyle = '#fcd34d'
  ctx.beginPath()
  ctx.roundRect(px - 10, py - 10, size + 20, size + 20, 58)
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(px, py, size, size, 48)
  ctx.clip()
  ctx.drawImage(photo, (photo.width - side) / 2, (photo.height - side) / 2, side, side, px, py, size, size)
  ctx.restore()

  // 闖關者名字：金色漸層明體
  ctx.font = `900 80px ${serif}`
  const gold = ctx.createLinearGradient(0, 720, 0, 800)
  gold.addColorStop(0, '#fef3c7')
  gold.addColorStop(0.5, '#fcd34d')
  gold.addColorStop(1, '#f59e0b')
  ctx.save()
  ctx.shadowColor = 'rgba(251, 191, 36, 0.45)'
  ctx.shadowBlur = 24
  ctx.fillStyle = gold
  centerText(ctx, title, 790)
  ctx.restore()
  ctx.fillStyle = 'rgba(237, 233, 254, 0.9)'
  ctx.font = `400 40px ${font}`
  centerText(ctx, '“生日購物金奪回大作戰”', 860)

  // 活動資訊
  const boxX = 160
  const boxY = 920
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, W - boxX * 2, 320, 40)
  ctx.fill()
  ctx.stroke()
  details.forEach(([icon, label, value], i) => {
    const y = boxY + 82 + i * 68
    ctx.font = `400 36px ${font}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(icon, boxX + 40, y)
    ctx.fillStyle = 'rgba(253, 230, 138, 0.65)'
    ctx.fillText(label, boxX + 92, y)
    ctx.fillStyle = '#f5f3ff'
    // 內容太長時把字縮小，避免超出框框
    const valueX = boxX + 200
    const maxWidth = W - boxX - 40 - valueX
    let fontSize = 36
    ctx.font = `700 ${fontSize}px ${font}`
    while (ctx.measureText(value).width > maxWidth && fontSize > 24) {
      fontSize -= 2
      ctx.font = `700 ${fontSize}px ${font}`
    }
    ctx.fillText(value, valueX, y)
  })

  // 底部的特別企劃橫幅
  const bannerY = 1280
  const banner = ctx.createLinearGradient(boxX, 0, W - boxX, 0)
  banner.addColorStop(0, '#6d28d9')
  banner.addColorStop(1, '#a21caf')
  ctx.fillStyle = banner
  ctx.beginPath()
  ctx.roundRect(boxX, bannerY, W - boxX * 2, 110, 36)
  ctx.fill()
  ctx.strokeStyle = 'rgba(232, 121, 249, 0.5)'
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 38px ${font}`
  centerText(ctx, '👹 魔王封印戰：奪回生日購物金', bannerY + 70)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('圖片產生失敗'))), 'image/png')
  })
}
