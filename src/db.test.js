import assert from 'node:assert/strict'
import test from 'node:test'
import { localDayBounds } from './db.js'

test('day-scoped target bounds cover the local calendar day only', () => {
  const { start, end } = localDayBounds('2026-07-19')
  assert.ok(new Date(start) < new Date(end))
  assert.equal(new Date(end).getTime() - new Date(start).getTime(), 24 * 60 * 60 * 1000)
})
