import assert from 'node:assert/strict'
import test from 'node:test'
import { coachCheckinId, createCoachCheckin, isPersonalAdvice } from './coachCheckin.js'

test('daily coach check-ins are uniquely scoped to a child and local date', () => {
  assert.notEqual(coachCheckinId('child-a', '2026-07-18'), coachCheckinId('child-b', '2026-07-18'))
  assert.notEqual(coachCheckinId('child-a', '2026-07-18'), coachCheckinId('child-a', '2026-07-19'))
})

test('new check-ins only hold learning context and start as a suggestion', () => {
  const checkin = createCoachCheckin({ childId: 'child-a', date: '2026-07-18', now: '2026-07-18T08:00:00.000Z', conditions: ['lelah'] })
  assert.deepEqual(checkin.conditions, ['lelah'])
  assert.equal(checkin.actionStatus, 'suggested')
  assert.equal(checkin.personalAdvice, null)
})

test('personal AI advice must have a safe action and supported tone', () => {
  assert.equal(isPersonalAdvice({ title: 'Pelan dulu', message: 'Kita istirahat sebentar.', tone: 'gentle', recommendedAction: { type: 'pause', label: 'Pilih jeda' } }), true)
  assert.equal(isPersonalAdvice({ title: 'Tidak valid', message: '...', tone: 'urgent', recommendedAction: { type: 'chat', label: 'Chat' } }), false)
})
