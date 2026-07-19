import assert from 'node:assert/strict'
import test from 'node:test'
import { checkinReadiness, coachCheckinId, createCoachCheckin, isPersonalAdvice, readinessForCondition } from './coachCheckin.js'

test('daily coach check-ins are uniquely scoped to a child and local date', () => {
  assert.notEqual(coachCheckinId('child-a', '2026-07-18'), coachCheckinId('child-b', '2026-07-18'))
  assert.notEqual(coachCheckinId('child-a', '2026-07-18'), coachCheckinId('child-a', '2026-07-19'))
})

test('new check-ins only hold learning context and start as a suggestion', () => {
  const checkin = createCoachCheckin({ childId: 'child-a', date: '2026-07-18', now: '2026-07-18T08:00:00.000Z', conditions: ['lelah'] })
  assert.deepEqual(checkin.conditions, ['lelah'])
  assert.equal(checkin.readiness, 'unanswered')
  assert.equal(checkin.answeredAt, null)
  assert.equal(checkin.actionStatus, 'suggested')
  assert.equal(checkin.personalAdvice, null)
})

test('readiness records whether a child is ready without storing conversation text', () => {
  assert.equal(readinessForCondition('lelah'), 'not_ready')
  assert.equal(readinessForCondition('siap'), 'ready')
  assert.equal(readinessForCondition(''), 'unanswered')

  const checkin = createCoachCheckin({ childId: 'child-a', date: '2026-07-18', now: '2026-07-18T08:00:00.000Z', readiness: 'not_ready', answeredAt: '2026-07-18T08:02:00.000Z' })
  assert.equal(checkinReadiness(checkin), 'not_ready')
  assert.equal(checkin.answeredAt, '2026-07-18T08:02:00.000Z')
})

test('legacy check-ins without readiness prompt again', () => {
  assert.equal(checkinReadiness({ conditions: ['lelah'], actionStatus: 'paused' }), 'unanswered')
})

test('personal AI advice must have a safe action and supported tone', () => {
  assert.equal(isPersonalAdvice({ title: 'Pelan dulu', message: 'Kita istirahat sebentar.', tone: 'gentle', recommendedAction: { type: 'pause', label: 'Pilih jeda' } }), true)
  assert.equal(isPersonalAdvice({ title: 'Tidak valid', message: '...', tone: 'urgent', recommendedAction: { type: 'chat', label: 'Chat' } }), false)
})
