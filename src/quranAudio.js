export const DEFAULT_QARI_ID = 'ayman-sowaid'

export const QARIS = [
  { id: 'ayman-sowaid', name: 'Ayman Sowaid', detail: 'Per ayat · 64 kbps', mode: 'ayah', edition: 'ar.aymanswoaid', bitrate: 64 },
  { id: 'alafasy', name: 'Mishari Alafasy', detail: 'Per ayat · 128 kbps', mode: 'ayah', edition: 'ar.alafasy', bitrate: 128 },
  { id: 'husary-muallim', name: 'Mahmoud Khalil Al-Husary', detail: 'Mushaf Muallim · per surat', mode: 'surah', baseUrl: 'https://download.quranicaudio.com/qdc/khalil_al_husary/muallim' },
  { id: 'minshawi-muallim', name: 'Mohamed Siddiq Al-Minshawi', detail: 'Mushaf Muallim · per surat', mode: 'surah', baseUrl: 'https://server10.mp3quran.net/minsh/Almusshaf-Al-Mo-lim' },
]

export const qariFor = (id) => QARIS.find((qari) => qari.id === id) || QARIS[0]

export const audioUrlForAyah = (qariId, globalAyahNumber) => {
  const qari = qariFor(qariId)
  if (qari.mode !== 'ayah' || !Number.isInteger(globalAyahNumber)) return undefined
  return `https://cdn.islamic.network/quran/audio/${qari.bitrate}/${qari.edition}/${globalAyahNumber}.mp3`
}

export const audioUrlForSurah = (qariId, surahId) => {
  const qari = qariFor(qariId)
  if (qari.mode !== 'surah' || !Number.isInteger(Number(surahId))) return undefined
  return `${qari.baseUrl}/${Number(surahId)}.mp3`
}
