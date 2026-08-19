import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Download, Headphones, Pause, Play, RotateCcw, Search, SkipBack, SkipForward, SlidersHorizontal, Volume2 } from 'lucide-react'
import { getQuranRange, getQuranRepeat, saveQuranRange, saveQuranRepeat } from './db'
import { audioUrlForAyah, DEFAULT_QARI_ID, qariFor } from './quranAudio'
import { downloadSurahAudio, fetchSurahArabic, fetchSurahEdition, isSurahAudioCached } from './quranText'
import { AUDIO_SURAHS, BISMILLAH_TEXT, stripBismillah, surahFor } from './surahData'
import QariPicker from './QariPicker'
import { useLocale } from './i18n'

function Field({ label, hint, children }) { return <div className="block"><span className="mb-2 block text-sm font-bold text-stone-600 dark:text-stone-300">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-stone-500 dark:text-stone-400">{hint}</span>}</div> }


export default function QuranRangePage({ back, qariId = DEFAULT_QARI_ID, onQariChange }) {
  const { locale, t } = useLocale()
  const audioRef = useRef(null)
  const ayahRepeatRef = useRef(0)
  const rangeRepeatRef = useRef(0)
  const [query, setQuery] = useState('')
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
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadTotal, setDownloadTotal] = useState(0)
  const [downloadError, setDownloadError] = useState('')
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
  const translationEdition = locale === 'en' ? 'en.sahih' : 'id.indonesian'
  const normalizedQuery = query.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
  const filteredSurahs = AUDIO_SURAHS.filter((surah) => {
    const searchable = `${surah.id} ${surah.name} ${surah.arabic}`.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
    return searchable.includes(normalizedQuery)
  })
  const rangeLastAyah = rangeEnabled ? rangeEnd : selected?.ayat
  const activeVerse = verses.find((ayah) => ayah.number === activeAyah)
  const audioUrl = selected && (isBismillah || activeAyah) ? audioUrlForAyah(selectedQariId, isBismillah ? 1 : activeVerse?.globalNumber) : undefined

  useEffect(() => { setSelectedQariId(qariFor(qariId).id) }, [qariId])

  useEffect(() => {
    let mounted = true
    isSurahAudioCached(selectedId, selectedQariId).then(({ cached, total }) => {
      if (mounted && total > 0) setIsDownloaded(cached === total)
    }).catch(() => {})
    return () => { mounted = false }
  }, [selectedId, selectedQariId])

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
      fetchSurahArabic(selectedId, controller.signal).then((response) => { if (!response.ok) throw new Error('Teks Arab tidak dapat dimuat.'); return response.json() }),
      fetchSurahEdition(selectedId, translationEdition, controller.signal).then((response) => { if (!response.ok) throw new Error('Terjemahan tidak dapat dimuat.'); return response.json() }),
    ]).then(([arabicResponse, translationResponse]) => {
      if (controller.signal.aborted) return
      const arabicAyahs = arabicResponse?.data?.ayahs || []
      const translationAyahs = translationResponse?.data?.ayahs || []
      if (!arabicAyahs.length) throw new Error('Ayat tidak ditemukan.')
      setVerses(arabicAyahs.map((ayah, index) => ({ number: ayah.numberInSurah, globalNumber: ayah.number, arabic: stripBismillah(ayah.text, selectedId, ayah.numberInSurah), translation: translationAyahs.find((item) => item.numberInSurah === ayah.numberInSurah)?.text || translationAyahs[index]?.text || (locale === 'en' ? 'Translation unavailable.' : 'Terjemahan belum tersedia.') })))
      setRangeStart((value) => Math.min(Math.max(1, value), arabicAyahs.length))
      setRangeEnd((value) => Math.min(Math.max(1, value), arabicAyahs.length))
      if (pendingStart === 'bismillah') { setIsBismillah(true); setPendingStart(null) }
      if (typeof pendingStart === 'number') { setActiveAyah(pendingStart); setPendingStart(null) }
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason.message || 'Koneksi internet tidak stabil. Coba lagi.') }).finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [locale, selectedId, translationEdition])

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
    const currentIndex = AUDIO_SURAHS.findIndex((surah) => surah.id === selected.id)
    const nextSurah = selected.group === 'juz30' ? AUDIO_SURAHS.slice(currentIndex + 1).find((surah) => surah.group === 'juz30') : null
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
  const startOfflineDownload = async () => {
    if (isDownloading || !selected) return
    setIsDownloading(true)
    setDownloadError('')
    setDownloadProgress(0)
    try {
      const result = await downloadSurahAudio(selectedId, selectedQariId, (done, total) => { setDownloadProgress(done); setDownloadTotal(total) })
      if (result.failed > 0 || result.cached !== result.total) throw new Error('partial')
      setIsDownloaded(result.total > 0)
    } catch {
      setDownloadError(t('audio.downloadError'))
    } finally {
      setIsDownloading(false)
    }
  }

  return <main className="page-root pb-28">
    <audio ref={audioRef} src={audioUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={handleEnded} onError={() => setError(t('practice.audioError'))}/>
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={back} aria-label={t('common.back')} className="icon-button shrink-0 shadow-sm transition-transform active:scale-95">
            <ArrowLeft size={20}/>
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-800 dark:text-emerald-400">Wali Tahfiz</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{t('audio.title')}</h1>
          </div>
        </div>
        <button type="button" onClick={() => setCatalogOpen((open) => !open)} className="page-action-button shrink-0 shadow-sm transition-transform active:scale-95">
          <Search size={17}/>
          <span>{catalogOpen ? t('common.close') : t('audio.search')}</span>
        </button>
      </header>

      <section className="glass-card overflow-hidden shadow-lg border border-emerald-900/10 dark:border-emerald-700/20">
        <div className="relative bg-gradient-to-br from-emerald-800 via-forest to-emerald-950 px-6 py-6 text-white overflow-hidden sm:px-7">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"/>
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md text-white/90">
                <Headphones size={13}/>
                <span>{t('audio.eyebrow')}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">{selected?.name || 'Juz 30'}</h2>
                {selected?.arabic && <span className="font-arabic text-2xl text-emerald-200/90" dir="rtl">{selected.arabic}</span>}
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-md leading-relaxed">{t('audio.body')}</p>
            </div>

            <div className="flex shrink-0 items-center sm:flex-col sm:items-end gap-2.5 pt-2 sm:pt-0 border-t border-white/10 sm:border-0">
              <span className="rounded-full bg-emerald-950/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200 border border-emerald-500/20 backdrop-blur-md">
                {t('quran.perVerse')}
              </span>
              <button type="button" onClick={startOfflineDownload} disabled={isDownloading || isDownloaded} className="flex min-h-10 items-center gap-2 rounded-xl bg-white/20 px-3.5 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/30 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-75 shadow-sm">
                {isDownloading ? <>{t('audio.downloading', { done: downloadProgress, total: downloadTotal })}</> : isDownloaded ? <><Check size={14} className="text-emerald-300"/> {t('audio.downloaded')}</> : <><Download size={14}/> {t('audio.download')}</>}
              </button>
            </div>
          </div>
          {downloadError && <p role="alert" className="mt-3 text-xs font-semibold text-amber-200">{downloadError}</p>}
        </div>
      {catalogOpen && <div className="border-b border-sage/70 bg-surface-raised p-5 dark:bg-surface dark:border-emerald-900/50"><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-forest" size={19}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('audio.searchPlaceholder')} className="input-field pl-11" aria-label={t('audio.search')}/></label><p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{query ? t('audio.surahFound', { count: filteredSurahs.length }) : t('audio.searchHint')}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{filteredSurahs.map((surah) => <button type="button" key={surah.id} onClick={() => selectSurah(surah)} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-[0.96] ${selectedId === surah.id ? 'bg-surface-muted dark:bg-emerald-950/60' : 'bg-white shadow-sm dark:bg-surface dark:shadow-none'}`}><span className="font-bold tabular-nums text-terracotta">{surah.id}</span><span className="min-w-0 flex-1"><b className="block text-forest">{surah.name}</b><small className="text-stone-500 dark:text-stone-400">{t('onboardingStep2.surahInfo', { count: surah.ayat, juz: '' })}</small></span><span className="font-serif text-lg text-terracotta" dir="rtl">{surah.arabic}</span></button>)}{query && filteredSurahs.length === 0 && <p className="rounded-2xl bg-surface-raised p-4 text-sm font-semibold text-stone-500 dark:text-stone-400 sm:col-span-2">{t('audio.surahNotFound')}</p>}</div></div>}
      <div className="p-4 sm:p-5"><button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} className="range-settings-toggle"><span><SlidersHorizontal size={18}/><b>{t('audio.repeat')}</b></span><small>{qari.name}</small></button>{settingsOpen && <div className="range-settings-panel"><div><span className="mb-2 block text-sm font-bold text-forest">{t('audio.qari')}</span><QariPicker value={selectedQariId} onChange={selectQari}/></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-sage/70 pt-4"><span><b className="block text-forest">{t('audio.repeat')}</b><small className="text-stone-500 dark:text-stone-400">{t('audio.repeatDescription')}</small></span><div className="flex gap-1.5">{[1, 2, 3, 5].map((count) => <button type="button" key={count} onClick={() => { resetProgress(); setAyahRepeatCount(count); saveQuranRepeat(count) }} aria-pressed={ayahRepeatCount === count} className={`range-choice ${ayahRepeatCount === count ? 'range-choice-active' : ''}`}>{count}×</button>)}</div></div><div className="mt-4 border-t border-sage/70 pt-4"><div className="flex items-center justify-between gap-3"><span><b className="block text-forest">{t('audio.rangePlay')}</b><small className="text-stone-500 dark:text-stone-400">{t('audio.rangeDescription')}</small></span><button type="button" onClick={() => setRangeEnabled((value) => !value)} aria-pressed={rangeEnabled} className={`range-switch ${rangeEnabled ? 'range-switch-active' : ''}`}>{rangeEnabled ? t('audio.active') : t('audio.inactive')}</button></div>{rangeEnabled && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field label={t('audio.fromAyah')}><input type="number" min="1" max={selected?.ayat} value={rangeStart} onChange={(event) => setBound('start', event.target.value)} className="range-input"/></Field><Field label={t('audio.toAyah')}><input type="number" min={rangeStart} max={selected?.ayat} value={rangeEnd} onChange={(event) => setBound('end', event.target.value)} className="range-input"/></Field><Field label={t('audio.repeat')}><div className="flex h-[52px] gap-1">{[1, 2, 3, 5].map((count) => <button type="button" key={count} onClick={() => { resetProgress(); setRangeRepeatCount(count) }} aria-pressed={rangeRepeatCount === count} className={`range-choice flex-1 ${rangeRepeatCount === count ? 'range-choice-active' : ''}`}>{count}×</button>)}</div></Field></div>}</div><button type="button" onClick={startRange} className="primary-button mt-4"><Play size={19} fill="currentColor"/>{t('audio.start')}</button></div>}</div>
      {error && <div className="mx-4 mb-4 rounded-2xl bg-surface-warning p-4 text-sm text-terracotta dark:bg-amber-950/40 dark:text-amber-200" role="alert">{error}</div>}
      {isLoading ? <div className="m-4 flex min-h-72 items-center justify-center rounded-[26px] bg-surface-raised text-center dark:bg-emerald-950/60"><p className="text-sm font-semibold text-slate-500 dark:text-stone-300">{t('audio.loading')}</p></div> : <div className="m-4 space-y-3" aria-live="polite">{selectedId !== '1' && <button type="button" onClick={playBismillah} aria-pressed={isBismillah} className={`bismillah-card ${isBismillah ? 'bismillah-card-active' : ''}`}><span className="step-label bg-emerald-100 text-emerald-800 dark:border dark:border-emerald-700/50 dark:bg-emerald-900 dark:text-emerald-200"><Volume2 size={13}/> {t('audio.bismillahTitle')}</span><p className="mt-3 font-arabic text-2xl md:text-3xl leading-[2.3] text-forest dark:text-emerald-100" dir="rtl">{BISMILLAH_TEXT}</p><small>{t('audio.bismillahTranslation')}</small></button>}{verses.map((ayah) => { const isActive = activeAyah === ayah.number && !isBismillah; return <button type="button" id={`quran-ayah-${selectedId}-${ayah.number}`} key={ayah.number} onClick={() => playFromAyah(ayah.number)} disabled={!inRange(ayah.number)} aria-pressed={isActive} className={`ayah-card w-full text-left ${isActive ? 'ayah-card-active' : 'bg-white dark:bg-stone-900/80 border border-stone-200/80 dark:border-emerald-900/30 rounded-2xl p-5 shadow-sm'} ${rangeEnabled && inRange(ayah.number) ? 'ayah-card-in-range' : ''} disabled:cursor-default disabled:opacity-100`}><div className="flex justify-between items-start gap-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm tabular-nums ${isActive ? 'ayah-number-active' : 'bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800/50'}`}>{ayah.number}</span><p className={`mb-4 text-right text-stone-900 dark:text-stone-100 font-arabic text-2xl md:text-3xl leading-[2.05] sm:leading-[2.15] md:leading-[2.2] pb-1 ${isActive ? 'text-emerald-700 dark:text-emerald-200 font-bold' : ''}`} dir="rtl">{ayah.arabic}</p></div><div className="pt-3 border-t border-stone-100 dark:border-emerald-950/40 text-stone-600 dark:text-stone-300 text-sm leading-relaxed">{ayah.translation}</div></button> })}</div>}
      </section>{activeAyah && <section className="sticky bottom-4 z-20 mt-4 rounded-[26px] bg-forest p-3 text-white shadow-[0_18px_40px_rgba(71,119,92,.28)]"><div className="flex items-center gap-3"><button type="button" onClick={togglePlayback} aria-label={isPlaying ? t('review.pauseAudio') : t('review.playQuestion')} className="player-main-button">{isPlaying ? <Pause size={22} fill="currentColor"/> : <Play className="ml-0.5" size={22} fill="currentColor"/>}</button><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">QS. {selected?.name} · {t('common.ayah')} {activeAyah}</p><p className="mt-0.5 text-xs font-semibold text-white/65">{isPlaying ? `${t('quran.nowPlaying')} · ${qari.name}` : `${t('audio.ready')} · ${qari.name}`}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => moveAyah(-1)} disabled={activeAyah === 1} aria-label={t('audio.previous')} className="player-control disabled:opacity-35"><SkipBack size={18}/></button><button type="button" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => setIsPlaying(false)) } }} aria-label={t('audio.repeatActive')} className="player-control"><RotateCcw size={18}/></button><button type="button" onClick={() => moveAyah(1)} disabled={activeAyah === selected?.ayat} aria-label={t('audio.next')} className="player-control disabled:opacity-35"><SkipForward size={18}/></button></div></div></section>}
    </div>
  </main>
}
