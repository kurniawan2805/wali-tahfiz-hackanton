import { createScheduledMemory, localDateKey, scheduleReviewResult } from './reviewSchedule.js'

const validTypes = new Set(['new', 'review'])
const isRange = (entry) => Number.isInteger(entry?.startAyah) && Number.isInteger(entry?.endAyah) && entry.startAyah <= entry.endAyah

export function validateProgressEntries(entries, catalogue, savedRanges = [], { requireMatching = true } = {}) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('No progress entries were returned.')
  const byId = new Map(catalogue.map((surah) => [String(surah.id), surah]))
  const memories = Array.isArray(savedRanges) ? savedRanges : []
  return entries.map((entry) => {
    if (!entry || !validTypes.has(entry.type) || !isRange(entry)) throw new Error('Unsupported or malformed progress entry.')
    const surah = byId.get(String(entry.surahId))
    if (!surah) throw new Error('Progress contains an unsupported surah.')
    if (entry.startAyah < 1 || entry.endAyah > Number(surah.ayat)) throw new Error('Progress contains an invalid ayah range.')
    const normalized = { type: entry.type, surahId: String(entry.surahId), startAyah: entry.startAyah, endAyah: entry.endAyah }
    if (entry.type === 'review') {
      const matches = memories.filter((memory) => String(memory.surahId) === normalized.surahId && Number(memory.startAyah) === normalized.startAyah && Number(memory.endAyah) === normalized.endAyah)
      if (matches.length !== 1 && requireMatching) throw new Error('Review must exactly match one saved memorised range.')
      if (matches.length === 1) normalized.memoryId = matches[0].id
    }
    if (entry.type === 'new' && requireMatching && memories.some((memory) => String(memory.surahId) === normalized.surahId && Number(memory.startAyah) === normalized.startAyah && Number(memory.endAyah) === normalized.endAyah)) {
      throw new Error('New memorisation is already saved.')
    }
    return normalized
  })
}

export function validateProgressResponse(payload, catalogue, savedRanges = [], options = {}) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.entries) || !Array.isArray(payload.unrecognised) || typeof payload.clarification !== 'string') throw new Error('Malformed progress response.')
  const entries = payload.entries.length ? validateProgressEntries(payload.entries, catalogue, savedRanges, options) : []
  return { entries, unrecognised: payload.unrecognised.map((item) => String(item).slice(0, 180)), clarification: payload.clarification.slice(0, 420) }
}

export async function applyValidatedProgress({ database, childId, entries, catalogue, memories, today = localDateKey(), makeId }) {
  const validEntries = validateProgressEntries(entries, catalogue, memories)
  const savedMemories = memories || []
  const createdTargets = []
  const updatedMemories = []
  await database.transaction('rw', database.targets, database.memories, async () => {
    for (const entry of validEntries) {
      const createdAt = new Date(`${today}T12:00:00`).toISOString()
      if (entry.type === 'new') {
        const target = { id: makeId('target'), childId, type: 'new', surahId: entry.surahId, startAyah: entry.startAyah, endAyah: entry.endAyah, status: 'done', createdAt, memoryId: null }
        const memory = createScheduledMemory({ id: makeId('memory'), childId, surahId: entry.surahId, startAyah: entry.startAyah, endAyah: entry.endAyah }, today)
        await database.targets.put(target)
        await database.memories.put(memory)
        createdTargets.push(target); updatedMemories.push(memory)
      } else {
        const memory = savedMemories.find((item) => item.id === entry.memoryId)
        if (!memory) throw new Error('Review memory no longer exists.')
        const target = { id: makeId('target'), childId, type: 'review', surahId: entry.surahId, startAyah: entry.startAyah, endAyah: entry.endAyah, status: 'done', createdAt, memoryId: memory.id }
        const updated = scheduleReviewResult(memory, 'pass', today)
        await database.targets.put(target)
        await database.memories.put(updated)
        createdTargets.push(target); updatedMemories.push(updated)
      }
    }
  })
  return { targets: createdTargets, memories: updatedMemories }
}
