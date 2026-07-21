import { QURAN_CATALOGUE, catalogueById } from '../src/quranCatalogue.js'
import { extractOutputText } from './daily-coach.js'

const types = ['new', 'review']
const schema = {
  type: 'object', additionalProperties: false, required: ['entries', 'unrecognised', 'clarification'],
  properties: {
    entries: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type', 'surahId', 'startAyah', 'endAyah'], properties: {
      type: { type: 'string', enum: types }, surahId: { type: 'string', pattern: '^[0-9]{1,3}$' }, startAyah: { type: 'integer', minimum: 1 }, endAyah: { type: 'integer', minimum: 1 },
    } } },
    unrecognised: { type: 'array', items: { type: 'string', maxLength: 180 } },
    clarification: { type: 'string', maxLength: 420 },
  },
}

export function validateModelProgress(value, catalogue = QURAN_CATALOGUE, savedRanges = []) {
  if (!value || !Array.isArray(value.entries) || !Array.isArray(value.unrecognised) || typeof value.clarification !== 'string') throw new Error('Malformed progress response')
  const byId = catalogueById(catalogue)
  const unrecognised = value.unrecognised.map((item) => String(item).slice(0, 180))
  let needsClarification = false
  const entries = value.entries.map((entry) => {
    if (!entry || !types.includes(entry.type) || !/^\d{1,3}$/.test(String(entry.surahId)) || !Number.isInteger(entry.startAyah) || !Number.isInteger(entry.endAyah)) throw new Error('Malformed progress entry')
    const surah = byId.get(String(entry.surahId))
    if (!surah || entry.startAyah < 1 || entry.endAyah < entry.startAyah || entry.endAyah > surah.ayat) throw new Error('Invalid surah or ayah range')
    const normalized = { type: entry.type, surahId: String(entry.surahId), startAyah: entry.startAyah, endAyah: entry.endAyah }
    const exact = savedRanges.some((range) => String(range.surahId) === normalized.surahId && Number(range.startAyah) === normalized.startAyah && Number(range.endAyah) === normalized.endAyah)
    if ((entry.type === 'review' && !exact) || (entry.type === 'new' && exact)) {
      needsClarification = true
      unrecognised.push(`${entry.type}:${normalized.surahId}:${normalized.startAyah}-${normalized.endAyah}`)
      return null
    }
    return normalized
  }).filter(Boolean)
  return { entries, unrecognised, clarification: needsClarification ? (value.clarification || 'Clarify the exact saved memorised range before recording this review.') : value.clarification.slice(0, 420) }
}

const savedRange = (memory) => ({ surahId: String(memory.surahId), startAyah: Number(memory.startAyah), endAyah: Number(memory.endAyah) })

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: 'AI belum dikonfigurasi.' })
  const body = request.body || {}
  const locale = body.locale === 'en' ? 'en' : 'id'
  const catalogue = Array.isArray(body.catalogue) && body.catalogue.length ? body.catalogue.slice(0, 50) : QURAN_CATALOGUE
  const input = {
    locale, today: String(body.today || '').slice(0, 10),
    guardianText: String(body.text || '').trim().slice(0, 2000),
    child: { name: String(body.profile?.name || '').slice(0, 80), age: String(body.profile?.age || '').slice(0, 16) },
    supportedQuran: catalogue,
    savedMemorisedRanges: Array.isArray(body.memories) ? body.memories.slice(0, 100).map(savedRange) : [],
  }
  if (!input.guardianText) return response.status(400).json({ error: 'Progress text is required.' })
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5.2', store: false,
        instructions: locale === 'en'
          ? 'Interpret the guardian text as completed new memorisation or completed murojaah only. Return exact surah IDs and ayah ranges from the supplied catalogue. Never infer unsupported actions, partial attempts, notes, or unknown ranges. Put uncertain or unrecognised phrases in unrecognised and explain what the guardian should clarify in clarification. Do not mention that you are AI.'
          : 'Tafsirkan teks wali hanya sebagai hafalan baru yang selesai atau murojaah yang selesai. Kembalikan ID surat dan rentang ayat yang tepat dari katalog. Jangan mengarang tindakan lain, percobaan sebagian, catatan, atau rentang yang tidak jelas. Masukkan frasa yang tidak dikenali ke unrecognised dan jelaskan yang perlu diklarifikasi di clarification. Jangan menyebut bahwa Anda adalah AI.',
        input: JSON.stringify(input), text: { format: { type: 'json_schema', name: 'logged_progress', strict: true, schema } },
      }),
    })
    const payload = await openaiResponse.json()
    if (!openaiResponse.ok) throw new Error(payload?.error?.message || 'OpenAI request failed')
    return response.status(200).json(validateModelProgress(JSON.parse(extractOutputText(payload)), catalogue, input.savedMemorisedRanges))
  } catch (error) {
    console.error('[log-progress] request failed:', error instanceof Error ? error.message : error)
    return response.status(502).json({ error: 'Progress belum dapat dipahami. Coba jelaskan surat dan rentang ayatnya.' })
  }
}
