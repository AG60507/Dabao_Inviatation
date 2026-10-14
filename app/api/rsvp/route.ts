import { getDb } from '@/lib/mongodb'
import { GUEST, PARTY_DATES, isPartyDate } from '@/lib/party'

// rsvps 只會有一筆資料：壽星最後選的日期。重新選會直接覆蓋
type Rsvp = {
  guest: string
  date: string // YYYY-MM-DD
  updatedAt: Date
}

const COLLECTION = 'rsvps'

function error(status: number, message: string) {
  return Response.json({ ok: false, error: message }, { status })
}

// 資料庫錯誤只回傳簡短訊息，不把連線字串等細節傳給前端
function dbError(err: unknown) {
  console.error(err)
  if (err instanceof Error && err.message.includes('MONGODB_URI')) {
    return error(503, '資料庫尚未設定（請在 .env.local 設定 MONGODB_URI）')
  }
  return error(500, '資料庫連線失敗，請稍後再試')
}

function toJson(doc: Rsvp) {
  return { guest: doc.guest, date: doc.date, updatedAt: doc.updatedAt }
}

// GET /api/rsvp：查詢壽星選的日期，還沒選就回傳 data: null
export async function GET() {
  try {
    const db = await getDb()
    const rsvp = await db.collection<Rsvp>(COLLECTION).findOne({}, { sort: { updatedAt: -1 } })
    return Response.json({ ok: true, data: rsvp ? toJson(rsvp) : null, options: PARTY_DATES })
  } catch (err) {
    return dbError(err)
  }
}

// POST /api/rsvp：儲存壽星選的日期，body：{ "date": "2026-10-26" }
// 永遠只更新同一筆資料，不會新增第二筆
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return error(400, 'request body 必須是 JSON')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return error(400, 'request body 必須是 JSON 物件')
  }

  const { date } = body as Record<string, unknown>
  if (!isPartyDate(date)) {
    return error(400, `date 只能是 ${PARTY_DATES.map((d) => d.value).join(' 或 ')}`)
  }

  try {
    const db = await getDb()
    // 篩選條件是 {}：有資料就更新那一筆，沒有才新增
    const rsvp = await db.collection<Rsvp>(COLLECTION).findOneAndUpdate(
      {},
      { $set: { guest: GUEST, date, updatedAt: new Date() }, $unset: { createdAt: '' } },
      { upsert: true, returnDocument: 'after', sort: { updatedAt: -1 } },
    )
    return Response.json({ ok: true, data: rsvp ? toJson(rsvp) : null })
  } catch (err) {
    return dbError(err)
  }
}
