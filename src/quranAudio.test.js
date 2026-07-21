import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_QARI_ID, QARIS, audioUrlForAyah, audioUrlForSurah, qariFor } from './quranAudio.js'

test('uses Ayman Sowaid as the default qari', () => {
  assert.equal(DEFAULT_QARI_ID, 'ayman-sowaid')
  assert.equal(qariFor('missing').id, DEFAULT_QARI_ID)
})

test('exposes only verified qari sources', () => {
  assert.deepEqual(QARIS.map((qari) => qari.id), ['ayman-sowaid', 'alafasy', 'husary-muallim', 'minshawi-muallim'])
  assert.equal(audioUrlForAyah('ayman-sowaid', 6222), 'https://cdn.islamic.network/quran/audio/64/ar.aymanswoaid/6222.mp3')
  assert.equal(audioUrlForAyah('alafasy', 6222), 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/6222.mp3')
  assert.equal(audioUrlForSurah('husary-muallim', 112), 'https://download.quranicaudio.com/qdc/khalil_al_husary/muallim/112.mp3')
  assert.equal(audioUrlForSurah('minshawi-muallim', 112), 'https://server10.mp3quran.net/minsh/Almusshaf-Al-Mo-lim/112.mp3')
})
