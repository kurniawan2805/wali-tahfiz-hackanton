import test from 'node:test'
import assert from 'node:assert/strict'
import { createRabtSteps, RABT_BLOCK_SIZE, stripBismillah } from './surahData.js'

const BISMILLAH_UTHMANI = '\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064E\u0647\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650'

test('stripBismillah keeps Al-Fatihah and non-first ayahs untouched', () => {
  const ayahText = '\u0642\u064F\u0644\u0652 \u0647\u064F\u0648\u064E \u0671\u0644\u0644\u0651\u064E\u0647\u064F \u0623\u064E\u062D\u064E\u062F\u064C'
  assert.equal(stripBismillah(ayahText, '1', 1), ayahText)
  assert.equal(stripBismillah(ayahText, '112', 2), ayahText)
})

test('stripBismillah removes Uthmani Bismillah from ayah 1', () => {
  const ayahText = '\u0642\u064F\u0644\u0652 \u0647\u064F\u0648\u064E \u0671\u0644\u0644\u0651\u064E\u0647\u064F \u0623\u064E\u062D\u064E\u062F\u064C'
  assert.equal(stripBismillah(`${BISMILLAH_UTHMANI} ${ayahText}`, '112', 1), ayahText)
})

test('stripBismillah tolerates simplified diacritic variations', () => {
  const ayahText = '\u0642\u064F\u0644\u0652 \u0647\u064F\u0648\u064E \u0671\u0644\u0644\u0651\u064E\u0647\u064F \u0623\u064E\u062D\u064E\u062F\u064C'
  assert.equal(stripBismillah('\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645 ' + ayahText, '112', 1), ayahText)
})

test('stripBismillah leaves non-Bismillah text unchanged', () => {
  const ayahText = '\u0625\u0650\u0646\u0651\u064E\u0627 \u0623\u064E\u0639\u0652\u0637\u064E\u064A\u0652\u0646\u064E\u0627\u0643\u064E \u0671\u0644\u0652\u0643\u064E\u0648\u0652\u062B\u064E\u0631\u064E'
  assert.equal(stripBismillah(ayahText, '108', 1), ayahText)
})

test('stripBismillah never returns an empty string', () => {
  assert.equal(stripBismillah(BISMILLAH_UTHMANI, '112', 1), BISMILLAH_UTHMANI)
})

test('createRabtSteps emits block then bridge pairs in RABT_BLOCK_SIZE chunks', () => {
  const steps = createRabtSteps(1, 25)
  assert.equal(steps[0].type, 'block')
  assert.equal(steps[0].startAyah, 1)
  assert.equal(steps[0].endAyah, RABT_BLOCK_SIZE)
  assert.equal(steps[1].type, 'bridge')
  assert.equal(steps[1].startAyah, RABT_BLOCK_SIZE)
  assert.equal(steps[1].endAyah, RABT_BLOCK_SIZE + 1)
  assert.equal(steps[2].type, 'block')
  assert.equal(steps[2].endAyah, RABT_BLOCK_SIZE * 2)
  assert.equal(steps.at(-1).endAyah, 25)
})
