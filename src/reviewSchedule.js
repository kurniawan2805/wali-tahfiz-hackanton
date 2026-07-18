export const SPACED_INTERVALS = [1, 3, 7, 14, 30]

const dateFromKey = (value) => {
  const [year, month, day] = String(value).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function localDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(value.getTime())) return ''
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addLocalDays(date = localDateKey(), days = 0) {
  const next = typeof date === 'string' ? dateFromKey(date) : new Date(date)
  next.setDate(next.getDate() + days)
  return localDateKey(next)
}

export function isDueForReview(memory, today = localDateKey()) {
  return !memory.nextReviewAt || memory.nextReviewAt <= today
}

export function createScheduledMemory(memory, today = localDateKey()) {
  return {
    ...memory,
    intervalIndex: 0,
    lastReviewedAt: null,
    nextReviewAt: addLocalDays(today, SPACED_INTERVALS[0]),
  }
}

export function scheduleReviewResult(memory, result, today = localDateKey()) {
  const currentIndex = Number.isInteger(memory.intervalIndex) ? memory.intervalIndex : 0
  const intervalIndex = result === 'pass'
    ? Math.min(currentIndex + 1, SPACED_INTERVALS.length - 1)
    : 0

  return {
    ...memory,
    intervalIndex,
    lastReviewedAt: today,
    nextReviewAt: addLocalDays(today, SPACED_INTERVALS[intervalIndex]),
  }
}

const scheduledDate = (memory) => memory.nextReviewAt || ''

export function getReviewRecommendations(memories, { today = localDateKey(), limit = 2, excludedMemoryIds = [] } = {}) {
  const excluded = new Set(excludedMemoryIds)
  return memories
    .filter((memory) => !excluded.has(memory.id) && isDueForReview(memory, today))
    .sort((first, second) => (
      scheduledDate(first).localeCompare(scheduledDate(second))
      || String(first.lastReviewedAt || '').localeCompare(String(second.lastReviewedAt || ''))
      || String(first.surahId).localeCompare(String(second.surahId))
      || Number(first.startAyah) - Number(second.startAyah)
      || String(first.id).localeCompare(String(second.id))
    ))
    .slice(0, limit)
}

export function reviewDueLabel(memory, today = localDateKey()) {
  if (isDueForReview(memory, today)) return 'Siap diulang'
  const days = Math.ceil((dateFromKey(memory.nextReviewAt) - dateFromKey(today)) / 86400000)
  return `Dalam ${days} hari`
}

export function isCreatedToday(value, today = localDateKey()) {
  if (!value) return false
  return localDateKey(value) === today
}

export function hasReviewTargetForToday(targets, memoryId, today = localDateKey()) {
  return targets.some((target) => (
    target.type === 'review'
    && target.memoryId === memoryId
    && isCreatedToday(target.createdAt, today)
  ))
}
