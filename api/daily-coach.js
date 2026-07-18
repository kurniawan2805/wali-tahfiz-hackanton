const actionTypes = ['start', 'review', 'new', 'listen', 'pause']
const tones = ['gentle', 'calm', 'celebratory']

const adviceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'message', 'tone', 'recommendedAction'],
  properties: {
    title: { type: 'string', maxLength: 90 },
    message: { type: 'string', maxLength: 420 },
    tone: { type: 'string', enum: tones },
    recommendedAction: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'label'],
      properties: {
        type: { type: 'string', enum: actionTypes },
        label: { type: 'string', maxLength: 54 },
      },
    },
  },
}

function isAdvice(value, expectedAction) {
  return Boolean(
    value
    && typeof value.title === 'string'
    && typeof value.message === 'string'
    && tones.includes(value.tone)
    && value.recommendedAction
    && actionTypes.includes(value.recommendedAction.type)
    && typeof value.recommendedAction.label === 'string'
    && value.recommendedAction.type === expectedAction,
  )
}

const summarizeTargets = (targets) => (Array.isArray(targets) ? targets : []).slice(0, 12).map((target) => ({
  type: target.type,
  surahId: target.surahId,
  startAyah: target.startAyah,
  endAyah: target.endAyah,
  status: target.status,
}))

const summarizeMemories = (memories) => (Array.isArray(memories) ? memories : []).slice(0, 20).map((memory) => ({
  surahId: memory.surahId,
  startAyah: memory.startAyah,
  endAyah: memory.endAyah,
  nextReviewAt: memory.nextReviewAt || null,
  intervalIndex: memory.intervalIndex ?? 0,
}))

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: 'AI belum dikonfigurasi.' })

  const { profile = {}, targets = [], memories = [], conditions = [], listenRepeats = 3, today, checkin = {}, localRecommendation = {} } = request.body || {}
  const expectedAction = actionTypes.includes(localRecommendation.actionType) ? localRecommendation.actionType : 'pause'
  const childData = {
    profile: { name: String(profile.name || '').slice(0, 80), age: String(profile.age || '').slice(0, 16) },
    today,
    conditions: Array.isArray(conditions) ? conditions.slice(0, 5) : [],
    listenRepeats: [1, 3, 5].includes(listenRepeats) ? listenRepeats : 3,
    checkin: {
      actionStatus: String(checkin.actionStatus || 'suggested').slice(0, 24),
      previousAction: actionTypes.includes(checkin.previousAction) ? checkin.previousAction : null,
    },
    targets: summarizeTargets(targets),
    memories: summarizeMemories(memories),
    localRecommendation: { actionType: expectedAction, title: String(localRecommendation.title || '').slice(0, 90) },
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        store: false,
        instructions: `Anda adalah Teman Hafalan untuk wali anak Indonesia. Berikan satu saran hangat dan singkat dalam Bahasa Indonesia untuk sesi saat ini. Gunakan hanya data yang diberikan. Tindakan recommendedAction.type WAJIB sama persis dengan localRecommendation.actionType; jangan menciptakan aksi baru. Saat tindakan adalah pause, validasi jeda dengan lembut. Jangan membuat diagnosis, klaim medis, atau rasa bersalah. Tujuan utama ialah kedekatan dengan Al-Qur’an, bukan jumlah hafalan. Jangan menyebut bahwa Anda AI.`,
        input: JSON.stringify(childData),
        text: { format: { type: 'json_schema', name: 'daily_coach_advice', strict: true, schema: adviceSchema } },
      }),
    })
    const payload = await openaiResponse.json()
    if (!openaiResponse.ok) throw new Error(payload?.error?.message || 'OpenAI request failed')
    const advice = JSON.parse(payload.output_text || '')
    if (!isAdvice(advice, expectedAction)) throw new Error('Respons AI tidak sesuai konteks check-in')
    return response.status(200).json({ advice })
  } catch {
    return response.status(502).json({ error: 'Saran AI belum dapat dibuat.' })
  }
}
