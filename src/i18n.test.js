import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { reviewDueState } from './reviewSchedule.js'

const id = JSON.parse(readFileSync(new URL('./locales/id.json', import.meta.url), 'utf8'))
const en = JSON.parse(readFileSync(new URL('./locales/en.json', import.meta.url), 'utf8'))

const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, entry]) => (
  entry && typeof entry === 'object' && !Array.isArray(entry)
    ? flatten(entry, `${prefix}${key}.`)
    : [`${prefix}${key}`]
))

test('English and Indonesian locale resources expose the same keys', () => {
  assert.deepEqual(flatten(en).sort(), flatten(id).sort())
})

test('review due state is language-neutral for localized formatters', () => {
  assert.deepEqual(reviewDueState({ nextReviewAt: '2026-07-21' }, '2026-07-21'), { status: 'due', days: 0 })
  assert.deepEqual(reviewDueState({ nextReviewAt: '2026-07-24' }, '2026-07-21'), { status: 'scheduled', days: 3 })
})
