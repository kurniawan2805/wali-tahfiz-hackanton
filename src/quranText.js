import { audioUrlForAyah } from './quranAudio'

export const TEXT_CACHE_NAME = 'wali-tahfiz-text-v1'
export const AUDIO_CACHE_NAME = 'wali-tahfiz-audio-v1'

export const surahArabicUrl = (surahId) => `https://api.alquran.cloud/v1/surah/${surahId}/quran-uthmani`
export const surahEditionUrl = (surahId, edition) => `https://api.alquran.cloud/v1/surah/${surahId}/${edition}`

async function cachedFetch(url, signal) {
  if (!('caches' in window)) return fetch(url, { signal })
  const cache = await caches.open(TEXT_CACHE_NAME)
  const cached = await cache.match(url)
  if (cached) return cached
  const response = await fetch(url, { signal })
  if (response.ok) cache.put(url, response.clone())
  return response
}

export const fetchSurahArabic = (surahId, signal) => cachedFetch(surahArabicUrl(surahId), signal)
export const fetchSurahEdition = (surahId, edition, signal) => cachedFetch(surahEditionUrl(surahId, edition), signal)

async function surahGlobalNumbers(surahId) {
  const response = await fetchSurahArabic(surahId)
  const payload = await response.json()
  const ayahs = payload?.data?.ayahs || []
  if (!ayahs.length) throw new Error('Surah text unavailable')
  return ayahs.map((ayah) => Number(ayah.number))
}

export const isSurahAudioCached = async (surahId, qariId) => {
  if (!('caches' in window)) return { cached: 0, total: 0 }
  const numbers = await surahGlobalNumbers(surahId)
  const urls = numbers.map((number) => audioUrlForAyah(qariId, number)).filter(Boolean)
  if (surahId !== '1') urls.push(audioUrlForAyah(qariId, 1))
  const cache = await caches.open(AUDIO_CACHE_NAME)
  const results = await Promise.all(urls.map(async (url) => Boolean(await cache.match(url))))
  return { cached: results.filter(Boolean).length, total: urls.length }
}

export const downloadSurahAudio = async (surahId, qariId, onProgress) => {
  if (!('caches' in window)) throw new Error('Offline download is not supported by this browser')
  const numbers = await surahGlobalNumbers(surahId)
  const urls = numbers.map((number) => audioUrlForAyah(qariId, number)).filter(Boolean)
  if (surahId !== '1') urls.push(audioUrlForAyah(qariId, 1))
  const cache = await caches.open(AUDIO_CACHE_NAME)
  let done = 0
  let failed = 0
  for (const url of urls) {
    const existing = await cache.match(url)
    if (!existing) {
      try {
        const response = await fetch(url, { mode: 'no-cors' })
        await cache.put(url, response)
      } catch {
        failed += 1
      }
    }
    done += 1
    onProgress?.(done, urls.length)
  }
  return { cached: done - failed, failed, total: urls.length }
}
