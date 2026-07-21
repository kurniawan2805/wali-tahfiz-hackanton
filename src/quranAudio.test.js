import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_QARI_ID, QARIS, audioUrlForAyah, qariFor } from './quranAudio.js'

test('uses Ayman Sowaid as the default qari', () => {
  assert.equal(DEFAULT_QARI_ID, 'ayman-sowaid')
  assert.equal(qariFor('missing').id, DEFAULT_QARI_ID)
})

test('uses the requested Quran CDN editions and bitrates', () => {
  assert.deepEqual(QARIS.map((qari) => qari.id), ['ayman-sowaid', 'husary', 'mishary', 'minshawi', 'abdullah-basfar'])
  assert.equal(audioUrlForAyah('ayman-sowaid', 6222), 'https://cdn.islamic.network/quran/audio/64/ar.aymanswoaid/6222.mp3')
  assert.equal(audioUrlForAyah('husary', 6222), 'https://cdn.islamic.network/quran/audio/64/ar.husary/6222.mp3')
  assert.equal(audioUrlForAyah('mishary', 6222), 'https://cdn.islamic.network/quran/audio/64/ar.alafasy/6222.mp3')
  assert.equal(audioUrlForAyah('minshawi', 6222), 'https://cdn.islamic.network/quran/audio/128/ar.minshawi/6222.mp3')
  assert.equal(audioUrlForAyah('abdullah-basfar', 6222), 'https://cdn.islamic.network/quran/audio/64/ar.abdullahbasfar/6222.mp3')
  assert.equal(audioUrlForAyah('mishary', 0), undefined)
})
