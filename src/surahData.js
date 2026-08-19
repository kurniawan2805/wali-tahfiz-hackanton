export const RABT_BLOCK_SIZE = 10

export const DEFAULT_REPEATS = { talaqqi: 3, tikrar: 10, rabt: 1 }

export const SURAHS = [
  { id: '112', name: 'Al-Ikhlas', arabic: '\u0642\u064F\u0644\u0652 \u0647\u064F\u0648\u064E \u0671\u0644\u0644\u0651\u064E\u0647\u064F \u0623\u064E\u062D\u064E\u062F\u064C', ayat: 4 },
  { id: '113', name: 'Al-Falaq', arabic: '\u0642\u064F\u0644\u0652 \u0623\u064E\u0639\u064F\u0648\u0630\u064F \u0628\u0650\u0631\u064E\u0628\u0651\u0650 \u0671\u0644\u0652\u0641\u064E\u0644\u064E\u0642\u0650', ayat: 5 },
  { id: '114', name: 'An-Nas', arabic: '\u0642\u064F\u0644\u0652 \u0623\u064E\u0639\u064F\u0648\u0630\u064F \u0628\u0650\u0631\u064E\u0628\u0651\u0650 \u0671\u0644\u0646\u0651\u064E\u0627\u0633\u0650', ayat: 6 },
]

export const AUDIO_SURAHS = [
  { id: '1', name: 'Al-Fatihah', arabic: '\u0671\u0644\u0652\u0641\u064E\u0627\u062A\u0650\u062D\u064E\u0629', ayat: 7, group: 'fatihah' },
  { id: '78', name: 'An-Naba', arabic: '\u0671\u0644\u0646\u0651\u064E\u0628\u064E\u0623', ayat: 40, group: 'juz30' }, { id: '79', name: 'An-Naziat', arabic: '\u0671\u0644\u0646\u0651\u064E\u0627\u0632\u0650\u0639\u064E\u0627\u062A', ayat: 46, group: 'juz30' },
  { id: '80', name: 'Abasa', arabic: '\u0639\u064E\u0628\u064E\u0633\u064E', ayat: 42, group: 'juz30' }, { id: '81', name: 'At-Takwir', arabic: '\u0671\u0644\u062A\u0651\u064E\u0643\u0652\u0648\u0650\u064A\u0631', ayat: 29, group: 'juz30' },
  { id: '82', name: 'Al-Infitar', arabic: '\u0671\u0644\u0652\u0625\u0650\u0646\u0641\u0650\u0637\u064E\u0627\u0631', ayat: 19, group: 'juz30' }, { id: '83', name: 'Al-Mutaffifin', arabic: '\u0671\u0644\u0652\u0645\u064F\u0637\u064E\u0641\u0651\u0650\u0641\u0650\u064A\u0646', ayat: 36, group: 'juz30' },
  { id: '84', name: 'Al-Inshiqaq', arabic: '\u0671\u0644\u0652\u0625\u0650\u0646\u0634\u0650\u0642\u064E\u0627\u0642', ayat: 25, group: 'juz30' }, { id: '85', name: 'Al-Buruj', arabic: '\u0671\u0644\u0652\u0628\u064F\u0631\u064F\u0648\u062C', ayat: 22, group: 'juz30' },
  { id: '86', name: 'At-Tariq', arabic: '\u0671\u0644\u0637\u0651\u064E\u0627\u0631\u0650\u0642', ayat: 17, group: 'juz30' }, { id: '87', name: 'Al-Ala', arabic: '\u0671\u0644\u0652\u0623\u064E\u0639\u0652\u0644\u064E\u0649\u0670', ayat: 19, group: 'juz30' },
  { id: '88', name: 'Al-Ghashiyah', arabic: '\u0671\u0644\u0652\u063A\u064E\u0627\u0634\u0650\u064A\u064E\u0629', ayat: 26, group: 'juz30' }, { id: '89', name: 'Al-Fajr', arabic: '\u0671\u0644\u0652\u0641\u064E\u062C\u0652\u0631', ayat: 30, group: 'juz30' },
  { id: '90', name: 'Al-Balad', arabic: '\u0671\u0644\u0652\u0628\u064E\u0644\u064E\u062F', ayat: 20, group: 'juz30' }, { id: '91', name: 'Ash-Shams', arabic: '\u0671\u0644\u0634\u0651\u064E\u0645\u0652\u0633', ayat: 15, group: 'juz30' },
  { id: '92', name: 'Al-Layl', arabic: '\u0671\u0644\u0644\u0651\u064E\u064A\u0652\u0644', ayat: 21, group: 'juz30' }, { id: '93', name: 'Ad-Duha', arabic: '\u0671\u0644\u0636\u0651\u064F\u062D\u064E\u0649\u0670', ayat: 11, group: 'juz30' },
  { id: '94', name: 'Ash-Sharh', arabic: '\u0671\u0644\u0634\u0651\u064E\u0631\u0652\u062D', ayat: 8, group: 'juz30' }, { id: '95', name: 'At-Tin', arabic: '\u0671\u0644\u062A\u0651\u0650\u064A\u0646', ayat: 8, group: 'juz30' },
  { id: '96', name: 'Al-Alaq', arabic: '\u0671\u0644\u0652\u0639\u064E\u0644\u064E\u0642', ayat: 19, group: 'juz30' }, { id: '97', name: 'Al-Qadr', arabic: '\u0671\u0644\u0652\u0642\u064E\u062F\u0652\u0631', ayat: 5, group: 'juz30' },
  { id: '98', name: 'Al-Bayyinah', arabic: '\u0671\u0644\u0652\u0628\u064E\u064A\u0651\u0650\u0646\u064E\u0629', ayat: 8, group: 'juz30' }, { id: '99', name: 'Az-Zalzalah', arabic: '\u0671\u0644\u0632\u0651\u064E\u0644\u0652\u0632\u064E\u0644\u064E\u0629', ayat: 8, group: 'juz30' },
  { id: '100', name: 'Al-Adiyat', arabic: '\u0671\u0644\u0652\u0639\u064E\u0627\u062F\u0650\u064A\u064E\u0627\u062A', ayat: 11, group: 'juz30' }, { id: '101', name: 'Al-Qariah', arabic: '\u0671\u0644\u0652\u0642\u064E\u0627\u0631\u0650\u0639\u064E\u0629', ayat: 11, group: 'juz30' },
  { id: '102', name: 'At-Takathur', arabic: '\u0671\u0644\u062A\u0651\u064E\u0643\u064E\u0627\u062B\u064F\u0631', ayat: 8, group: 'juz30' }, { id: '103', name: 'Al-Asr', arabic: '\u0671\u0644\u0652\u0639\u064E\u0635\u0652\u0631', ayat: 3, group: 'juz30' },
  { id: '104', name: 'Al-Humazah', arabic: '\u0671\u0644\u0652\u0647\u064F\u0645\u064E\u0632\u064E\u0629', ayat: 9, group: 'juz30' }, { id: '105', name: 'Al-Fil', arabic: '\u0671\u0644\u0652\u0641\u0650\u064A\u0644', ayat: 5, group: 'juz30' },
  { id: '106', name: 'Quraysh', arabic: '\u0642\u064F\u0631\u064E\u064A\u0652\u0634', ayat: 4, group: 'juz30' }, { id: '107', name: 'Al-Maun', arabic: '\u0671\u0644\u0652\u0645\u064E\u0627\u0639\u064F\u0648\u0646', ayat: 7, group: 'juz30' },
  { id: '108', name: 'Al-Kawthar', arabic: '\u0671\u0644\u0652\u0643\u064E\u0648\u0652\u062B\u064E\u0631', ayat: 3, group: 'juz30' }, { id: '109', name: 'Al-Kafirun', arabic: '\u0671\u0644\u0652\u0643\u064E\u0627\u0641\u0650\u0631\u064F\u0648\u0646', ayat: 6, group: 'juz30' },
  { id: '110', name: 'An-Nasr', arabic: '\u0671\u0644\u0646\u0651\u064E\u0635\u0652\u0631', ayat: 3, group: 'juz30' }, { id: '111', name: 'Al-Masad', arabic: '\u0671\u0644\u0652\u0645\u064E\u0633\u064E\u062F', ayat: 5, group: 'juz30' },
  { id: '112', name: 'Al-Ikhlas', arabic: '\u0671\u0644\u0652\u0625\u0650\u062E\u0652\u0644\u064E\u0627\u0635', ayat: 4, group: 'juz30' }, { id: '113', name: 'Al-Falaq', arabic: '\u0671\u0644\u0652\u0641\u064E\u0644\u064E\u0642', ayat: 5, group: 'juz30' },
  { id: '114', name: 'An-Nas', arabic: '\u0671\u0644\u0646\u0651\u064E\u0627\u0633', ayat: 6, group: 'juz30' },
]

export const BISMILLAH_TEXT = '\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064E\u0647\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650'

export const rangeLabel = (start, end, t) => t ? t('practice.verseRange', { start, end }) : `Verse ${start}\u2013${end}`

export const surahFor = (id) => AUDIO_SURAHS.find((surah) => surah.id === id) || SURAHS.find((surah) => surah.id === id)

export const stripBismillah = (text, surahId, ayahNumber) => {
  if (String(surahId) === '1' || ayahNumber !== 1) return text || ''
  const source = (text || '').trim()
  const MARK_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0640]/g
  const normalizeAlef = (value) => value.replace(/[\u0671\u0623\u0625\u0622]/g, '\u0627')
  const bare = normalizeAlef(source.replace(MARK_RE, ''))
  const BARE_BISMILLAH = '\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0644\u0631\u062D\u064A\u0645'
  if (!bare.startsWith(BARE_BISMILLAH)) return source
  let consumed = 0
  let matched = 0
  const MARK_SINGLE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0640]/
  while (consumed < source.length && matched < BARE_BISMILLAH.length) {
    const ch = source[consumed]
    if (MARK_SINGLE.test(ch)) { consumed++; continue }
    if (normalizeAlef(ch) === BARE_BISMILLAH[matched]) { consumed++; matched++; continue }
    break
  }
  while (consumed < source.length && /[\s\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0640]/.test(source[consumed])) consumed++
  return source.slice(consumed).trim() || source
}

export const createRabtSteps = (startAyah, endAyah) => {
  const blocks = []
  for (let start = startAyah; start <= endAyah; start += RABT_BLOCK_SIZE) blocks.push({ startAyah: start, endAyah: Math.min(endAyah, start + RABT_BLOCK_SIZE - 1) })
  return blocks.flatMap((block, index) => index === 0
    ? [{ type: 'block', ...block, blockIndex: index }]
    : [{ type: 'bridge', startAyah: blocks[index - 1].endAyah, endAyah: block.startAyah, fromBlock: index - 1, toBlock: index }, { type: 'block', ...block, blockIndex: index }])
}
