import assert from 'node:assert/strict'
import test from 'node:test'
import { applyValidatedProgress, validateProgressEntries, validateProgressResponse } from './progress.js'
import { QURAN_CATALOGUE } from './quranCatalogue.js'

const makeId = (() => { let count = 0; return (prefix) => `${prefix}-${++count}` })()
const memory = { id: 'memory-1', childId: 'child-1', surahId: '112', startAyah: 1, endAyah: 4, intervalIndex: 1, nextReviewAt: '2026-07-21', lastReviewedAt: '2026-07-18' }

function fakeDatabase() {
  const targets = []; const memories = []
  return { targets: { put: async (value) => targets.push(value) }, memories: { put: async (value) => memories.push(value) }, transaction: async (_mode, _targets, _memories, work) => work(), targetRows: targets, memoryRows: memories }
}

test('validates new and exact review entries against the catalogue and saved ranges', () => {
  const entries = validateProgressEntries([{ type: 'new', surahId: '113', startAyah: 1, endAyah: 5 }, { type: 'review', surahId: '112', startAyah: 1, endAyah: 4 }], QURAN_CATALOGUE, [memory])
  assert.equal(entries[1].memoryId, 'memory-1')
})

test('rejects malformed, unsupported, and out-of-range progress', () => {
  assert.throws(() => validateProgressEntries([{ type: 'pause', surahId: '112', startAyah: 1, endAyah: 2 }], QURAN_CATALOGUE))
  assert.throws(() => validateProgressEntries([{ type: 'new', surahId: '112', startAyah: 1, endAyah: 5 }], QURAN_CATALOGUE))
  assert.throws(() => validateProgressEntries([{ type: 'review', surahId: '112', startAyah: 1, endAyah: 2 }], QURAN_CATALOGUE, [memory]))
  assert.throws(() => validateProgressResponse({ entries: [], unrecognised: 'bad', clarification: '' }, QURAN_CATALOGUE))
})

test('applies multiple confirmed entries atomically using new and successful-review scheduling', async () => {
  const database = fakeDatabase()
  const result = await applyValidatedProgress({ database, childId: 'child-1', catalogue: QURAN_CATALOGUE, memories: [memory], today: '2026-07-21', makeId, entries: [
    { type: 'new', surahId: '113', startAyah: 1, endAyah: 5 },
    { type: 'review', surahId: '112', startAyah: 1, endAyah: 4 },
  ] })
  assert.equal(database.targetRows.length, 2)
  assert.equal(database.memoryRows.length, 2)
  assert.equal(result.targets.every((target) => target.status === 'done'), true)
  assert.equal(result.memories[0].nextReviewAt, '2026-07-22')
  assert.equal(result.memories[1].intervalIndex, 2)
  assert.equal(result.memories[1].nextReviewAt, '2026-07-28')
})

test('unmatched review and already-saved new ranges remain clarification-only', () => {
  const alreadySaved = [memory]
  const review = validateProgressEntries([{ type: 'review', surahId: '112', startAyah: 2, endAyah: 4 }], QURAN_CATALOGUE, alreadySaved, { requireMatching: false })
  const newRange = validateProgressEntries([{ type: 'new', surahId: '112', startAyah: 1, endAyah: 4 }], QURAN_CATALOGUE, alreadySaved, { requireMatching: false })
  assert.equal(review[0].memoryId, undefined)
  assert.equal(newRange[0].type, 'new')
})
