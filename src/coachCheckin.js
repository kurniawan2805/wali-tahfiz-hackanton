export const COACH_ACTIONS = ['start', 'review', 'new', 'listen', 'pause']
export const COACH_TONES = ['gentle', 'calm', 'celebratory']
export const COACH_READINESS = ['unanswered', 'not_ready', 'ready']

export function coachCheckinId(childId, date) {
  return `coach-${childId}-${date}`
}

export function createCoachCheckin({ childId, date, now, conditions = [], listenRepeats = 3, recommendation = null, readiness = 'unanswered', answeredAt = null }) {
  return {
    id: coachCheckinId(childId, date),
    childId,
    date,
    conditions,
    listenRepeats,
    recommendation,
    readiness: COACH_READINESS.includes(readiness) ? readiness : 'unanswered',
    answeredAt,
    actionStatus: 'suggested',
    personalAdvice: null,
    createdAt: now,
    updatedAt: now,
  }
}

// Existing records predate readiness; treat them as a fresh prompt rather than
// inferring a response from an older condition selection.
export function checkinReadiness(checkin) {
  return COACH_READINESS.includes(checkin?.readiness) ? checkin.readiness : 'unanswered'
}

export function readinessForCondition(condition) {
  if (condition === 'siap') return 'ready'
  return condition ? 'not_ready' : 'unanswered'
}

export function isPersonalAdvice(value) {
  return Boolean(
    value
    && typeof value.title === 'string'
    && typeof value.message === 'string'
    && COACH_TONES.includes(value.tone)
    && value.recommendedAction
    && COACH_ACTIONS.includes(value.recommendedAction.type)
    && typeof value.recommendedAction.label === 'string',
  )
}
