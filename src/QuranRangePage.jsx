import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Headphones, Pause, Play, RotateCcw, Search, SkipBack, SkipForward, SlidersHorizontal, Volume2 } from 'lucide-react'
import { getQuranRange, getQuranRepeat, saveQuranRange, saveQuranRepeat } from './db'
import { audioUrlForAyah, DEFAULT_QARI_ID, qariFor } from './quranAudio'
import QariPicker from './QariPicker'

const surahs = [{ id: '112', name: 'Al-Ikhlas', arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', ayat: 4 }, { id: '113', name: 'Al-Falaq', arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ', ayat: 5 }, { id: '114', name: 'An-Nas', arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ', ayat: 6 }]
const audioSurahs = [
  { id: '1', name: 'Al-Fatihah', arabic: 'ٱلْفَاتِحَة', ayat: 7, group: 'fatihah' },
  { id: '78', name: 'An-Naba', arabic: 'ٱلنَّبَأ', ayat: 40, group: 'juz30' }, { id: '79', name: 'An-Naziat', arabic: 'ٱلنَّازِعَات', ayat: 46, group: 'juz30' },
  { id: '80', name: 'Abasa', arabic: 'عَبَسَ', ayat: 42, group: 'juz30' }, { id: '81', name: 'At-Takwir', arabic: 'ٱلتَّكْوِير', ayat: 29, group: 'juz30' },
  { id: '82', name: 'Al-Infitar', arabic: 'ٱلْإِنفِطَار', ayat: 19, group: 'juz30' }, { id: '83', name: 'Al-Mutaffifin', arabic: 'ٱلْمُطَفِّفِين', ayat: 36, group: 'juz30' },
  { id: '84', name: 'Al-Inshiqaq', arabic: 'ٱلْإِنشِقَاق', ayat: 25, group: 'juz30' }, { id: '85', name: 'Al-Buruj', arabic: 'ٱلْبُرُوج', ayat: 22, group: 'juz30' },
  { id: '86', name: 'At-Tariq', arabic: 'ٱلطَّارِق', ayat: 17, group: 'juz30' }, { id: '87', name: 'Al-Ala', arabic: 'ٱلْأَعْلَىٰ', ayat: 19, group: 'juz30' },
  { id: '88', name: 'Al-Ghashiyah', arabic: 'ٱلْغَاشِيَة', ayat: 26, group: 'juz30' }, { id: '89', name: 'Al-Fajr', arabic: 'ٱلْفَجْر', ayat: 30, group: 'juz30' },
  { id: '90', name: 'Al-Balad', arabic: 'ٱلْبَلَد', ayat: 20, group: 'juz30' }, { id: '91', name: 'Ash-Shams', arabic: 'ٱلشَّمْس', ayat: 15, group: 'juz30' },
  { id: '92', name: 'Al-Layl', arabic: 'ٱللَّيْل', ayat: 21, group: 'juz30' }, { id: '93', name: 'Ad-Duha', arabic: 'ٱلضُّحَىٰ', ayat: 11, group: 'juz30' },
  { id: '94', name: 'Ash-Sharh', arabic: 'ٱلشَّرْح', ayat: 8, group: 'juz30' }, { id: '95', name: 'At-Tin', arabic: 'ٱلتِّين', ayat: 8, group: 'juz30' },
  { id: '96', name: 'Al-Alaq', arabic: 'ٱلْعَلَق', ayat: 19, group: 'juz30' }, { id: '97', name: 'Al-Qadr', arabic: 'ٱلْقَدْر', ayat: 5, group: 'juz30' },
  { id: '98', name: 'Al-Bayyinah', arabic: 'ٱلْبَيِّنَة', ayat: 8, group: 'juz30' }, { id: '99', name: 'Az-Zalzalah', arabic: 'ٱلزَّلْزَلَة', ayat: 8, group: 'juz30' },
  { id: '100', name: 'Al-Adiyat', arabic: 'ٱلْعَادِيَات', ayat: 11, group: 'juz30' }, { id: '101', name: 'Al-Qariah', arabic: 'ٱلْقَارِعَة', ayat: 11, group: 'juz30' },
  { id: '102', name: 'At-Takathur', arabic: 'ٱلتَّكَاثُر', ayat: 8, group: 'juz30' }, { id: '103', name: 'Al-Asr', arabic: 'ٱلْعَصْر', ayat: 3, group: 'juz30' },
  { id: '104', name: 'Al-Humazah', arabic: 'ٱلْهُمَزَة', ayat: 9, group: 'juz30' }, { id: '105', name: 'Al-Fil', arabic: 'ٱلْفِيل', ayat: 5, group: 'juz30' },
  { id: '106', name: 'Quraysh', arabic: 'قُرَيْش', ayat: 4, group: 'juz30' }, { id: '107', name: 'Al-Maun', arabic: 'ٱلْمَاعُون', ayat: 7, group: 'juz30' },
  { id: '108', name: 'Al-Kawthar', arabic: 'ٱلْكَوْثَر', ayat: 3, group: 'juz30' }, { id: '109', name: 'Al-Kafirun', arabic: 'ٱلْكَافِرُون', ayat: 6, group: 'juz30' },
  { id: '110', name: 'An-Nasr', arabic: 'ٱلنَّصْر', ayat: 3, group: 'juz30' }, { id: '111', name: 'Al-Masad', arabic: 'ٱلْمَسَد', ayat: 5, group: 'juz30' },
  { id: '112', name: 'Al-Ikhlas', arabic: 'ٱلْإِخْلَاص', ayat: 4, group: 'juz30' }, { id: '113', name: 'Al-Falaq', arabic: 'ٱلْفَلَق', ayat: 5, group: 'juz30' },
  { id: '114', name: 'An-Nas', arabic: 'ٱلنَّاس', ayat: 6, group: 'juz30' },
]
const bismillahText = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
const surahFor = (id) => audioSurahs.find((surah) => surah.id === id) || surahs.find((surah) => surah.id === id)

const stripBismillah = (text, surahId, ayahNumber) => {
  if (String(surahId) === '1' || ayahNumber !== 1) return text || ''
  const source = (text || '').trim()
  const bismillah = /^ب[\u064B-\u065F\u0670\u0640]*س[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ه[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*[\u0670أا]?[\u064B-\u065F\u0670\u0640]*ن[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*[يیى][\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*/
  return source.replace(bismillah, '').trim() || source
}

function Field({ label, hint, children }) { return <div className="block"><span className="mb-2 block text-sm font-bold text-slate-600">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}</div> }


export default function QuranRangePage({ back, qariId = DEFAULT_QARI_ID, onQariChange }) {
  const audioRef = useRef(null)
  const ayahRepeatRef = useRef(0)
  const rangeRepeatRef = useRef(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('fatihah')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('1')
  const [verses, setVerses] = useState([])
  const [activeAyah, setActiveAyah] = useState(null)
  const [isBismillah, setIsBismillah] = useState(false)
  const [pendingStart, setPendingStart] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [ayahRepeatCount, setAyahRepeatCount] = useState(1)
  const [ayahRepeatProgress, setAyahRepeatProgress] = useState(0)
  const [rangeEnabled, setRangeEnabled] = useState(false)
  const [rangeStart, setRangeStart] = useState(1)
  const [rangeEnd, setRangeEnd] = useState(5)
  const [rangeRepeatCount, setRangeRepeatCount] = useState(1)
  const [rangeRepeatProgress, setRangeRepeatProgress] = useState(0)
  const [selectedQariId, setSelectedQariId] = useState(qariFor(qariId).id)
  const selected = surahFor(selectedId)
  const qari = qariFor(selectedQariId)
  const normalizedQuery = query.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
  const filteredSurahs = audioSurahs.filter((surah) => {
    const searchable = `${surah.id} ${surah.name} ${surah.arabic}`.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
    return (filter === 'all' || surah.group === filter) && searchable.includes(normalizedQuery)
  })
  const rangeLastAyah = rangeEnabled ? rangeEnd : selected?.ayat
  const activeVerse = verses.find((ayah) => ayah.number === activeAyah)
  const audioUrl = selected && (isBismillah || activeAyah) ? audioUrlForAyah(selectedQariId, isBismillah ? 1 : activeVerse?.globalNumber) : undefined

  useEffect(() => { setSelectedQariId(qariFor(qariId).id) }, [qariId])

  useEffect(() => {
    let mounted = true
    Promise.all([getQuranRepeat(), getQuranRange()]).then(([repeat, range]) => {
      if (!mounted) return
      if ([1, 2, 3, 5].includes(repeat?.value)) setAyahRepeatCount(repeat.value)
      if (range?.value) {
        const saved = range.value
        setRangeEnabled(Boolean(saved.enabled))
        setRangeRepeatCount([1, 2, 3, 5].includes(saved.repeatCount) ? saved.repeatCount : 1)
      }
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => { saveQuranRange({ enabled: rangeEnabled, repeatCount: rangeRepeatCount }) }, [rangeEnabled, rangeRepeatCount])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError('')
    setVerses([])
    setActiveAyah(null)
    setIsBismillah(false)
    ayahRepeatRef.current = 0
    rangeRepeatRef.current = 0
    setAyahRepeatProgress(0)
    setRangeRepeatProgress(0)
    audioRef.current?.pause()
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${selectedId}/quran-uthmani`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Teks Arab tidak dapat dimuat.'); return response.json() }),
      fetch(`https://api.alquran.cloud/v1/surah/${selectedId}/id.indonesian`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Terjemahan Indonesia tidak dapat dimuat.'); return response.json() }),
    ]).then(([arabicResponse, translationResponse]) => {
      if (controller.signal.aborted) return
      const arabicAyahs = arabicResponse?.data?.ayahs || []
      const translationAyahs = translationResponse?.data?.ayahs || []
      if (!arabicAyahs.length) throw new Error('Ayat tidak ditemukan.')
      setVerses(arabicAyahs.map((ayah, index) => ({ number: ayah.numberInSurah, globalNumber: ayah.number, arabic: stripBismillah(ayah.text, selectedId, ayah.numberInSurah), translation: translationAyahs.find((item) => item.numberInSurah === ayah.numberInSurah)?.text || translationAyahs[index]?.text || 'Terjemahan belum tersedia.' })))
      setRangeStart((value) => Math.min(Math.max(1, value), arabicAyahs.length))
      setRangeEnd((value) => Math.min(Math.max(1, value), arabicAyahs.length))
      if (pendingStart === 'bismillah') { setIsBismillah(true); setPendingStart(null) }
      if (typeof pendingStart === 'number') { setActiveAyah(pendingStart); setPendingStart(null) }
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message || 'Koneksi internet tidak stabil. Coba lagi.') }).finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [selectedId])

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return
    audioRef.current.load()
    audioRef.current.play().catch(() => setIsPlaying(false))
  }, [audioUrl])

  useEffect(() => {
    if (!activeAyah || isBismillah) return
    const timer = window.setTimeout(() => document.getElementById(`quran-ayah-${selectedId}-${activeAyah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
    return () => window.clearTimeout(timer)
  }, [activeAyah, isBismillah, selectedId])

  const resetProgress = () => {
    ayahRepeatRef.current = 0
    rangeRepeatRef.current = 0
    setAyahRepeatProgress(0)
    setRangeRepeatProgress(0)
  }
  const selectSurah = (surah) => {
    setCatalogOpen(false)
    setPendingStart(null)
    setRangeStart(1)
    setRangeEnd(Math.min(5, surah.ayat))
    setSelectedId(surah.id)
  }
  const playFromAyah = (ayah) => {
    resetProgress()
    setIsBismillah(false)
    if (activeAyah === ayah && !isBismillah && audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play().catch(() => setIsPlaying(false))
    } else setActiveAyah(ayah)
  }
  const playBismillah = () => {
    resetProgress()
    setActiveAyah(null)
    setIsBismillah(true)
  }
  const startRange = () => {
    resetProgress()
    if (selectedId !== '1' && rangeStart === 1) playBismillah()
    else playFromAyah(rangeEnabled ? rangeStart : 1)
  }
  const moveAyah = (direction) => {
    if (!selected || !activeAyah || isBismillah) return
    const next = activeAyah + direction
    if (next >= 1 && next <= selected.ayat) playFromAyah(next)
  }
  const handleEnded = () => {
    if (isBismillah) {
      setIsBismillah(false)
      setActiveAyah(rangeEnabled ? rangeStart : 1)
      return
    }
    if (!selected || !activeAyah) return
    const nextAyahRepeat = ayahRepeatRef.current + 1
    if (nextAyahRepeat < ayahRepeatCount) {
      ayahRepeatRef.current = nextAyahRepeat
      setAyahRepeatProgress(nextAyahRepeat)
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => setIsPlaying(false))
      return
    }
    ayahRepeatRef.current = 0
    setAyahRepeatProgress(0)
    if (activeAyah < rangeLastAyah) { setActiveAyah(activeAyah + 1); return }
    if (rangeEnabled) {
      const nextRangeRepeat = rangeRepeatRef.current + 1
      if (nextRangeRepeat < rangeRepeatCount) {
        rangeRepeatRef.current = nextRangeRepeat
        setRangeRepeatProgress(nextRangeRepeat)
        setActiveAyah(rangeStart)
      } else { resetProgress(); setIsPlaying(false) }
      return
    }
    const currentIndex = audioSurahs.findIndex((surah) => surah.id === selected.id)
    const nextSurah = selected.group === 'juz30' ? audioSurahs.slice(currentIndex + 1).find((surah) => surah.group === 'juz30') : null
    if (nextSurah) { setPendingStart('bismillah'); setSelectedId(nextSurah.id) } else setIsPlaying(false)
  }
  const togglePlayback = () => {
    if (!activeAyah && !isBismillah) return startRange()
    if (isPlaying) audioRef.current?.pause()
    else audioRef.current?.play().catch(() => setIsPlaying(false))
  }
  const setBound = (key, rawValue) => {
    const value = Math.min(selected?.ayat || 1, Math.max(1, Number(rawValue) || 1))
    if (key === 'start') { setRangeStart(value); if (value > rangeEnd) setRangeEnd(value) }
    else { setRangeEnd(Math.max(rangeStart, value)) }
  }
  const inRange = (ayah) => !rangeEnabled || (ayah >= rangeStart && ayah <= rangeEnd)
  const selectQari = (nextQariId) => {
    const normalized = qariFor(nextQariId).id
    audioRef.current?.pause()
    resetProgress()
    setIsBismillah(false)
    setActiveAyah(null)
    setSelectedQariId(normalized)
    onQariChange?.(normalized)
  }

  return <main className="min-h-screen bg-cream pb-12">
    <audio ref={audioRef} src={audioUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={handleEnded} onError={() => setError('Audio ayat ini belum dapat diputar. Coba lagi beberapa saat.')}/>
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <header className="mb-5 flex items-center gap-3"><button type="button" onClick={back} aria-label="Kembali ke beranda" className="icon-button"><ArrowLeft size={20}/></button><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.14em] text-forest/70">Wali Tahfiz</p><h1 className="font-display text-3xl">Dengar Qur’an</h1></div><button type="button" onClick={() => setCatalogOpen((open) => !open)} className="page-action-button"><Search size={17}/>{catalogOpen ? 'Tutup' : 'Cari surat'}</button></header>
      <section className="glass-card overflow-hidden"><div className="bg-forest px-5 py-5 text-white sm:px-6"><p className="step-label bg-white/15 text-white"><Headphones size={14}/> MUROTTAL BERSAMBUNG</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-2xl">{selected?.name || 'Juz 30'}</h2><p className="mt-1 text-sm text-white/75">{qari.name} · {qari.detail}</p></div><span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">PER AYAT</span></div></div>
      {catalogOpen && <div className="border-b border-sage/70 bg-[#fbfdf8] p-5"><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-forest" size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama atau nomor surat" className="input-field pl-11" aria-label="Cari surat"/></label><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{[['all', 'Semua'], ['fatihah', 'Al-Fatihah'], ['juz30', 'Juz 30']].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold transition-transform active:scale-[0.96] ${filter === value ? 'bg-forest text-white' : 'bg-white text-forest shadow-sm'}`}>{label}</button>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2">{filteredSurahs.map((surah) => <button type="button" key={surah.id} onClick={() => selectSurah(surah)} className={`flex min-h-12 items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-[0.96] ${selectedId === surah.id ? 'bg-[#eff6eb]' : 'bg-white shadow-sm'}`}><span className="font-bold tabular-nums text-terracotta">{surah.id}</span><span className="min-w-0 flex-1"><b className="block text-forest">{surah.name}</b><small className="text-slate-500">{surah.ayat} ayat</small></span><span className="font-serif text-lg text-terracotta" dir="rtl">{surah.arabic}</span></button>)}</div></div>}
      <div className="p-4 sm:p-5"><button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} className="range-settings-toggle"><span><SlidersHorizontal size={18}/><b>Pengaturan putar</b></span><small>{qari.name}</small></button>{settingsOpen && <div className="range-settings-panel"><div><span className="mb-2 block text-sm font-bold text-forest">Qari</span><QariPicker value={selectedQariId} onChange={selectQari}/></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-sage/70 pt-4"><span><b className="block text-forest">Ulang tiap ayat</b><small className="text-slate-500">Setiap ayat diulang sebelum lanjut</small></span><div className="flex gap-1.5">{[1, 2, 3, 5].map((count) => <button type="button" key={count} onClick={() => { resetProgress(); setAyahRepeatCount(count); saveQuranRepeat(count) }} aria-pressed={ayahRepeatCount === count} className={`range-choice ${ayahRepeatCount === count ? 'range-choice-active' : ''}`}>{count}×</button>)}</div></div><div className="mt-4 border-t border-sage/70 pt-4"><div className="flex items-center justify-between gap-3"><span><b className="block text-forest">Putar rentang ayat</b><small className="text-slate-500">Fokus pada bagian hafalan tertentu</small></span><button type="button" onClick={() => setRangeEnabled((value) => !value)} aria-pressed={rangeEnabled} className={`range-switch ${rangeEnabled ? 'range-switch-active' : ''}`}>{rangeEnabled ? 'Aktif' : 'Nonaktif'}</button></div>{rangeEnabled && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field label="Dari ayat"><input type="number" min="1" max={selected?.ayat} value={rangeStart} onChange={(event) => setBound('start', event.target.value)} className="range-input"/></Field><Field label="Sampai ayat"><input type="number" min={rangeStart} max={selected?.ayat} value={rangeEnd} onChange={(event) => setBound('end', event.target.value)} className="range-input"/></Field><Field label="Ulang rentang"><div className="flex h-[52px] gap-1">{[1, 2, 3, 5].map((count) => <button type="button" key={count} onClick={() => { resetProgress(); setRangeRepeatCount(count) }} aria-pressed={rangeRepeatCount === count} className={`range-choice flex-1 ${rangeRepeatCount === count ? 'range-choice-active' : ''}`}>{count}×</button>)}</div></Field></div>}</div><button type="button" onClick={startRange} className="primary-button mt-4"><Play size={19} fill="currentColor"/>{rangeEnabled ? `Mulai ayat ${rangeStart}–${rangeEnd}` : 'Mulai dari ayat pertama'}</button></div>}</div>
      {error && <div className="mx-4 mb-4 rounded-2xl bg-[#fff2df] p-4 text-sm text-terracotta" role="alert">{error}</div>}
      {isLoading ? <div className="m-4 flex min-h-72 items-center justify-center rounded-[26px] bg-[#f7faf4] text-center"><p className="text-sm font-semibold text-slate-500">Memuat ayat dan terjemahan…</p></div> : <div className="m-4 space-y-3" aria-live="polite">{selectedId !== '1' && <button type="button" onClick={playBismillah} aria-pressed={isBismillah} className={`bismillah-card ${isBismillah ? 'bismillah-card-active' : ''}`}><span className="step-label bg-peach text-terracotta"><Volume2 size={13}/> PEMBUKA</span><p className="mt-3 font-serif text-2xl leading-loose text-forest" dir="rtl">{bismillahText}</p><small>Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang</small></button>}{verses.map((ayah) => <button type="button" id={`quran-ayah-${selectedId}-${ayah.number}`} key={ayah.number} onClick={() => playFromAyah(ayah.number)} disabled={!inRange(ayah.number)} aria-pressed={activeAyah === ayah.number && !isBismillah} className={`ayah-card w-full text-left ${activeAyah === ayah.number && !isBismillah ? 'ayah-card-active' : ''} ${rangeEnabled && inRange(ayah.number) ? 'ayah-card-in-range' : ''} disabled:cursor-default disabled:opacity-100`}><div className="flex items-start justify-between gap-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${activeAyah === ayah.number && !isBismillah ? 'bg-white/20 text-white' : 'bg-peach text-terracotta'}`}>{ayah.number}</span><p className="font-serif text-right text-[27px] leading-[2.1] text-forest sm:text-3xl" dir="rtl">{ayah.arabic}</p></div><div className={`mt-3 border-t pt-3 text-sm leading-relaxed ${activeAyah === ayah.number && !isBismillah ? 'border-white/25 text-white/90' : 'border-sage text-slate-600'}`}>{ayah.translation}</div></button>)}</div>}
      </section>{activeAyah && <section className="sticky bottom-4 z-20 mt-4 rounded-[26px] bg-forest p-4 text-white shadow-[0_18px_40px_rgba(71,119,92,.28)]"><div className="flex items-center justify-between gap-3"><p className="min-w-0 text-sm font-bold">{selected?.name} · Ayat {activeAyah}</p><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => moveAyah(-1)} disabled={activeAyah === 1} aria-label="Ayat sebelumnya" className="audio-control bg-white/15 text-white disabled:opacity-35"><SkipBack size={18}/></button><button type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Jeda audio' : 'Putar audio'} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-forest transition-transform active:scale-[0.96]">{isPlaying ? <Pause size={21} fill="currentColor"/> : <Play className="ml-0.5" size={21} fill="currentColor"/>}</button><button type="button" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => setIsPlaying(false)) } }} aria-label="Ulangi audio aktif" className="audio-control bg-white/15 text-white"><RotateCcw size={18}/></button><button type="button" onClick={() => moveAyah(1)} disabled={activeAyah === selected?.ayat} aria-label="Ayat berikutnya" className="audio-control bg-white/15 text-white disabled:opacity-35"><SkipForward size={18}/></button></div></div></section>}
    </div>
  </main>
}
