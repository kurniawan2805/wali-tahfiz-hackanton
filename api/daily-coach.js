const actionTypes = ['start', 'review', 'new', 'listen', 'pause']
const tones = ['gentle', 'calm', 'celebratory']

export const extractOutputText = (payload) => {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim()
  const message = payload?.output?.find((item) => item.type === 'message')
  const text = message?.content?.find((item) => item.type === 'output_text')?.text
  return typeof text === 'string' ? text.trim() : ''
}

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
  const { locale = 'id', profile = {}, targets = [], memories = [], conditions = [], listenRepeats = 3, today, checkin = {}, localRecommendation = {} } = request.body || {}
  if (!process.env.OPENAI_API_KEY) return response.status(503).json({ error: locale === 'en' ? 'AI is not configured.' : 'AI belum dikonfigurasi.' })
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
        model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
        store: false,
        instructions: `${locale === 'en' ? 'You are a warm Quran memorisation companion for a child’s guardian. Give one brief, gentle suggestion in English for the current session. If the child has few memorised surahs (memories), suggest reviewing whole surahs or multiple surahs together. If they have a large amount of memorised surahs, suggest reviewing in smaller, specific ayah ranges (partial surah) to prevent overwhelm.' : 'Anda adalah Teman Hafalan untuk wali anak Indonesia. Berikan satu saran hangat dan singkat dalam Bahasa Indonesia untuk sesi saat ini. Jika jumlah hafalan (memories) sedikit, sarankan murojaah satu surat penuh atau beberapa surat sekaligus. Jika hafalan sudah banyak, sarankan murojaah secara bertahap dalam rentang ayat pendek (sebagian surat) agar tidak melelahkan.'} Use only the provided data. recommendedAction.type MUST exactly match localRecommendation.actionType; do not invent a new action. When the action is listen, clearly suggest playing a gentle Qur’an recitation now. When the action is pause, validate the pause gently. Do not make diagnoses, medical claims, or induce guilt. The goal is closeness to the Qur’an, not the amount memorised. Do not mention that you are AI.`,
        input: JSON.stringify(childData),
        text: { format: { type: 'json_schema', name: 'daily_coach_advice', strict: true, schema: adviceSchema } },
      }),
    })
    const payload = await openaiResponse.json()
    if (!openaiResponse.ok) throw new Error(payload?.error?.message || 'OpenAI request failed')
    const advice = JSON.parse(extractOutputText(payload))
    if (!isAdvice(advice, expectedAction)) throw new Error('Respons AI tidak sesuai konteks check-in')
    return response.status(200).json({ advice })
  } catch (error) {
    console.error('[daily-coach] request failed:', error instanceof Error ? error.message : error)
    return response.status(502).json({ error: locale === 'en' ? 'AI advice could not be generated.' : 'Saran AI belum dapat dibuat.' })
  }
}
