export const COACH_ACTIONS = ['start', 'review', 'new', 'listen', 'pause']
export const COACH_TONES = ['gentle', 'calm', 'celebratory']

export function coachCheckinId(childId, date) {
  return `coach-${childId}-${date}`
}

export function createCoachCheckin({ childId, date, now, conditions = [], listenRepeats = 3, recommendation = null }) {
  return {
    id: coachCheckinId(childId, date),
    childId,
    date,
    conditions,
    listenRepeats,
    recommendation,
    actionStatus: 'suggested',
    personalAdvice: null,
    createdAt: now,
    updatedAt: now,
  }
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
