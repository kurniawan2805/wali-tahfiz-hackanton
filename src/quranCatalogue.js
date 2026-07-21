// This is the catalogue currently supported by onboarding and the audio UI.
// Keep the server and client on the same small, child-friendly v1 catalogue.
export const QURAN_CATALOGUE = [
  { id: '1', name: 'Al-Fatihah', ayat: 7 },
  { id: '78', name: 'An-Naba', ayat: 40 }, { id: '79', name: 'An-Naziat', ayat: 46 },
  { id: '80', name: 'Abasa', ayat: 42 }, { id: '81', name: 'At-Takwir', ayat: 29 },
  { id: '82', name: 'Al-Infitar', ayat: 19 }, { id: '83', name: 'Al-Mutaffifin', ayat: 36 },
  { id: '84', name: 'Al-Inshiqaq', ayat: 25 }, { id: '85', name: 'Al-Buruj', ayat: 22 },
  { id: '86', name: 'At-Tariq', ayat: 17 }, { id: '87', name: 'Al-Ala', ayat: 19 },
  { id: '88', name: 'Al-Ghashiyah', ayat: 26 }, { id: '89', name: 'Al-Fajr', ayat: 30 },
  { id: '90', name: 'Al-Balad', ayat: 20 }, { id: '91', name: 'Ash-Shams', ayat: 15 },
  { id: '92', name: 'Al-Layl', ayat: 21 }, { id: '93', name: 'Ad-Duha', ayat: 11 },
  { id: '94', name: 'Ash-Sharh', ayat: 8 }, { id: '95', name: 'At-Tin', ayat: 8 },
  { id: '96', name: 'Al-Alaq', ayat: 19 }, { id: '97', name: 'Al-Qadr', ayat: 5 },
  { id: '98', name: 'Al-Bayyinah', ayat: 8 }, { id: '99', name: 'Az-Zalzalah', ayat: 8 },
  { id: '100', name: 'Al-Adiyat', ayat: 11 }, { id: '101', name: 'Al-Qariah', ayat: 11 },
  { id: '102', name: 'At-Takathur', ayat: 8 }, { id: '103', name: 'Al-Asr', ayat: 3 },
  { id: '104', name: 'Al-Humazah', ayat: 9 }, { id: '105', name: 'Al-Fil', ayat: 5 },
  { id: '106', name: 'Quraysh', ayat: 4 }, { id: '107', name: 'Al-Maun', ayat: 7 },
  { id: '108', name: 'Al-Kawthar', ayat: 3 }, { id: '109', name: 'Al-Kafirun', ayat: 6 },
  { id: '110', name: 'An-Nasr', ayat: 3 }, { id: '111', name: 'Al-Masad', ayat: 5 },
  { id: '112', name: 'Al-Ikhlas', ayat: 4 }, { id: '113', name: 'Al-Falaq', ayat: 5 },
  { id: '114', name: 'An-Nas', ayat: 6 },
]

export const catalogueById = (catalogue = QURAN_CATALOGUE) => new Map(catalogue.map((surah) => [String(surah.id), surah]))
