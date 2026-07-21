import assert from 'node:assert/strict'
import test from 'node:test'
import { validateModelProgress } from './log-progress.js'
import { QURAN_CATALOGUE } from '../src/quranCatalogue.js'

test('validates structured model output and preserves clarification fields', () => {
  const result = validateModelProgress({ entries: [{ type: 'new', surahId: '112', startAyah: 1, endAyah: 4 }], unrecognised: ['partial attempt'], clarification: 'Please clarify the partial attempt.' }, QURAN_CATALOGUE)
  assert.deepEqual(result.entries[0], { type: 'new', surahId: '112', startAyah: 1, endAyah: 4 })
  assert.equal(result.unrecognised[0], 'partial attempt')
})

test('rejects malformed output, unsupported actions, and invalid ayah bounds', () => {
  assert.throws(() => validateModelProgress(null, QURAN_CATALOGUE))
  assert.throws(() => validateModelProgress({ entries: [{ type: 'listen', surahId: '112', startAyah: 1, endAyah: 2 }], unrecognised: [], clarification: '' }, QURAN_CATALOGUE))
  assert.throws(() => validateModelProgress({ entries: [{ type: 'new', surahId: '112', startAyah: 1, endAyah: 9 }], unrecognised: [], clarification: '' }, QURAN_CATALOGUE))
})

test('turns unmatched reviews and already-saved new ranges into clarification', () => {
  const result = validateModelProgress({ entries: [{ type: 'review', surahId: '112', startAyah: 2, endAyah: 4 }, { type: 'new', surahId: '112', startAyah: 1, endAyah: 4 }], unrecognised: [], clarification: '' }, QURAN_CATALOGUE, [{ surahId: '112', startAyah: 1, endAyah: 4 }])
  assert.equal(result.entries.length, 0)
  assert.equal(result.unrecognised.length, 2)
  assert.ok(result.clarification)
})
