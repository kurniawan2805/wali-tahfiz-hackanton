export const DEFAULT_QARI_ID = 'ayman-sowaid'

export const QARIS = [
  { id: 'ayman-sowaid', name: 'Ayman Sowaid', detail: 'Per ayat · 64 kbps', edition: 'ar.aymanswoaid', bitrate: 64 },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', detail: 'Per ayat · 64 kbps', edition: 'ar.husary', bitrate: 64 },
  { id: 'mishary', name: 'Mishary Rashid Alafasy', detail: 'Per ayat · 64 kbps', edition: 'ar.alafasy', bitrate: 64 },
  { id: 'minshawi', name: 'Mohamed Siddiq Al-Minshawi', detail: 'Per ayat · 128 kbps', edition: 'ar.minshawi', bitrate: 128 },
  { id: 'abdullah-basfar', name: 'Abdullah Basfar', detail: 'Per ayat · 64 kbps', edition: 'ar.abdullahbasfar', bitrate: 64 },
]

export const qariFor = (id) => QARIS.find((qari) => qari.id === id) || QARIS[0]

export const audioUrlForAyah = (qariId, globalAyahNumber) => {
  const qari = qariFor(qariId)
  if (!Number.isInteger(globalAyahNumber) || globalAyahNumber < 1 || globalAyahNumber > 6236) return undefined
  return `https://cdn.islamic.network/quran/audio/${qari.bitrate}/${qari.edition}/${globalAyahNumber}.mp3`
}
