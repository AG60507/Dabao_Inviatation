// 只能在伺服器端使用（API Route、Server Component），不可以被 'use client' 的檔案匯入，
// 否則連線字串會被打包進瀏覽器的程式碼裡
import { MongoClient, type Db } from 'mongodb'

// 幫 globalThis 補上型別：記住「連線」和「建立這條連線時用的連線字串」
const globalForMongo = globalThis as typeof globalThis & {
  _mongo?: { uri: string; clientPromise: Promise<MongoClient> }
}

// 取得共用的 MongoClient。第一次呼叫時才真正連線，之後都沿用同一條連線。
//
// 為什麼要放在 globalThis：開發模式下每次存檔，熱重載（HMR）都會重新執行這個檔案，
// 如果不快取，每改一次程式就會多開一組連線，最後把 Atlas 的連線數用完。
// 正式環境同樣共用同一條連線，避免每個請求都重新連線。
export function getClient(): Promise<MongoClient> {
  // 在函式裡才讀取環境變數：沒設定時只有真的要用資料庫的地方會報錯，
  // 不會讓整個網站（例如不需要資料庫的頁面或 build）跟著壞掉
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Missing environment variable: MONGODB_URI (set it in .env.local)')
  }

  const cached = globalForMongo._mongo
  if (cached?.uri === uri) {
    return cached.clientPromise
  }

  // 連線字串改了（例如修改 .env.local）：關掉舊連線，改用新的連線字串
  if (cached) {
    cached.clientPromise.then((client) => client.close()).catch(() => {})
  }

  const clientPromise = new MongoClient(uri).connect()
  globalForMongo._mongo = { uri, clientPromise }

  // 連線失敗就清掉快取，下次呼叫才會重新嘗試，而不是一直拿到同一個失敗結果
  clientPromise.catch(() => {
    if (globalForMongo._mongo?.clientPromise === clientPromise) {
      globalForMongo._mongo = undefined
    }
  })

  return clientPromise
}

// 取得資料庫物件，給 API Route 使用，例如：
//   const db = await getDb()
//   const guests = await db.collection('guests').find().toArray()
// 不傳 dbName 時，使用連線字串裡指定的資料庫；連線字串也沒指定的話，driver 會使用 "test"
export async function getDb(dbName?: string): Promise<Db> {
  const client = await getClient()
  return client.db(dbName)
}
