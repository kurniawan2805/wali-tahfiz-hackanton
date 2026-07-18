import assert from 'node:assert/strict'
import test from 'node:test'
import { addLocalDays, createScheduledMemory, getReviewRecommendations, hasReviewTargetForToday, isCreatedToday, isDueForReview, localDateKey, scheduleReviewResult } from './reviewSchedule.js'

const today = '2026-07-18'
const memory = { id: 'memory-1', childId: 'child-1', surahId: '112', startAyah: 1, endAyah: 4 }

test('new memories are first due tomorrow and pass through every review interval', () => {
  let scheduled = createScheduledMemory(memory, today)
  assert.equal(scheduled.nextReviewAt, '2026-07-19')

  for (const expected of ['2026-07-21', '2026-07-25', '2026-08-01', '2026-08-17', '2026-08-17']) {
    scheduled = scheduleReviewResult(scheduled, 'pass', today)
    assert.equal(scheduled.nextReviewAt, expected)
  }
})

test('a review that needs repetition returns to the one-day interval', () => {
  const advanced = { ...memory, intervalIndex: 3, nextReviewAt: '2026-08-01' }
  const scheduled = scheduleReviewResult(advanced, 'retry', today)
  assert.equal(scheduled.intervalIndex, 0)
  assert.equal(scheduled.lastReviewedAt, today)
  assert.equal(scheduled.nextReviewAt, '2026-07-19')
})

test('recommendations prefer the longest overdue memories, include legacy records, and stop at two', () => {
  const recommendations = getReviewRecommendations([
    { ...memory, id: 'today', nextReviewAt: today },
    { ...memory, id: 'future', nextReviewAt: '2026-07-19' },
    { ...memory, id: 'oldest', nextReviewAt: '2026-07-02' },
    { ...memory, id: 'legacy', nextReviewAt: null },
    { ...memory, id: 'overdue', nextReviewAt: '2026-07-10' },
  ], { today })

  assert.deepEqual(recommendations.map((item) => item.id), ['legacy', 'oldest'])
  assert.equal(isDueForReview({ ...memory, nextReviewAt: null }, today), true)
})

test('excluded review targets are not recommended again', () => {
  const recommendations = getReviewRecommendations([
    { ...memory, id: 'one', nextReviewAt: '2026-07-10' },
    { ...memory, id: 'two', nextReviewAt: '2026-07-11' },
  ], { today, excludedMemoryIds: ['one'] })
  assert.deepEqual(recommendations.map((item) => item.id), ['two'])
})

test('a memory can only be added once as a review target on the same local day', () => {
  const targets = [{ id: 'target-1', type: 'review', memoryId: 'memory-1', createdAt: new Date(2026, 6, 18, 9, 0).toISOString() }]
  assert.equal(hasReviewTargetForToday(targets, 'memory-1', today), true)
  assert.equal(hasReviewTargetForToday(targets, 'memory-2', today), false)
})

test('local calendar helpers do not rely on UTC date slices', () => {
  const justAfterMidnight = new Date(2026, 6, 18, 0, 5)
  assert.equal(localDateKey(justAfterMidnight), '2026-07-18')
  assert.equal(addLocalDays('2026-07-18', 1), '2026-07-19')
  assert.equal(isCreatedToday(justAfterMidnight, '2026-07-18'), true)
})
