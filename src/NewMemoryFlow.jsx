import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Plus, RotateCcw, Volume2 } from 'lucide-react'
import { audioUrlForAyah, DEFAULT_QARI_ID } from './quranAudio'
import { useLocale } from './i18n'

const RABT_BLOCK_SIZE = 10
const defaults = { repeats: { talaqqi: 3, tikrar: 10, rabt: 1 } }
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

const rangeLabel = (start, end, t) => t ? t('practice.verseRange', { start, end }) : `Verse ${start}–${end}`
const surahFor = (id) => audioSurahs.find((surah) => surah.id === id) || surahs.find((surah) => surah.id === id)

const stripBismillah = (text, surahId, ayahNumber) => {
  if (String(surahId) === '1' || ayahNumber !== 1) return text || ''
  const source = (text || '').trim()
  const bismillah = /^ب[\u064B-\u065F\u0670\u0640]*س[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ه[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*[\u0670أا]?[\u064B-\u065F\u0670\u0640]*ن[\u064B-\u065F\u0670\u0640]*\s+[ٱا][\u064B-\u065F\u0670\u0640]*ل[\u064B-\u065F\u0670\u0640]*ر[\u064B-\u065F\u0670\u0640]*ح[\u064B-\u065F\u0670\u0640]*[يیى][\u064B-\u065F\u0670\u0640]*م[\u064B-\u065F\u0670\u0640]*/
  return source.replace(bismillah, '').trim() || source
}

const createRabtSteps = (startAyah, endAyah) => {
  const blocks = []
  for (let start = startAyah; start <= endAyah; start += RABT_BLOCK_SIZE) blocks.push({ startAyah: start, endAyah: Math.min(endAyah, start + RABT_BLOCK_SIZE - 1) })
  return blocks.flatMap((block, index) => index === 0
    ? [{ type: 'block', ...block, blockIndex: index }]
    : [{ type: 'bridge', startAyah: blocks[index - 1].endAyah, endAyah: block.startAyah, fromBlock: index - 1, toBlock: index }, { type: 'block', ...block, blockIndex: index }])
}

function TikrarFruitCounter({ count, target }) {
  const { t } = useLocale()
  const fruits = Array.from({ length: target })
  return <div className="tikrar-fruit-counter" role="status" aria-live="polite" aria-label={`${count} dari ${target} pengulangan selesai`}>
    <div className="tikrar-tree" aria-hidden="true">
      <div className="tikrar-tree-fruits">{fruits.map((_, index) => <span key={index} className={`tikrar-tree-fruit ${index < count ? 'tikrar-tree-fruit-picked' : ''}`}>🍎</span>)}</div>
      <span className="tikrar-tree-trunk">🌳</span>
    </div>
    <div className="tikrar-basket" aria-hidden="true"><span className="tikrar-basket-icon">🧺</span><div className="tikrar-basket-fruits">{fruits.slice(0, count).map((_, index) => <span key={index} className="tikrar-basket-fruit">🍎</span>)}</div></div>
    <p className="mt-4 text-sm font-semibold leading-relaxed text-forest dark:text-emerald-100">{t('practice.repeatBody')}</p>
  </div>
}

export default function NewMemoryFlow({ target, profile, phase, session, onCancel, onNavigate, onUpdateSession, onFinish, onEndSession, qariId = DEFAULT_QARI_ID }) {
  const { t } = useLocale()
  const audioRef = useRef(null)
  const talaqqiPlaybackRef = useRef(0)
  const [practice, setPractice] = useState(() => ({ ...session, phase }))
  const [verses, setVerses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [rangeAudioAyah, setRangeAudioAyah] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState('')
  const item = surahFor(target.surahId)
  const activeAyah = Math.min(target.endAyah, Math.max(target.startAyah, Number(practice.currentAyah) || target.startAyah))
  const talaqqiTarget = Math.max(1, Number(profile.repeats.talaqqi) || defaults.repeats.talaqqi)
  const talaqqiPlayCount = Math.min(talaqqiTarget, Number(practice.talaqqiPlayCount) || 0)
  const tikrarTarget = Math.max(1, Number(profile.repeats.tikrar) || defaults.repeats.tikrar)
  const tikrarCount = Math.min(tikrarTarget, Number(practice.tikrarCount) || 0)
  const rabtScope = practice.rabtScope || 'card'
  const defaultRabtStartAyah = rabtScope === 'surah' ? 1 : target.startAyah
  const defaultRabtEndAyah = rabtScope === 'surah' ? item?.ayat || target.endAyah : target.endAyah
  const rabtStartAyah = Math.max(1, Number(practice.rabtStartAyah) || defaultRabtStartAyah)
  const rabtEndAyah = Math.min(item?.ayat || target.endAyah, Number(practice.rabtEndAyah) || defaultRabtEndAyah)
  const rabtSteps = createRabtSteps(rabtStartAyah, rabtEndAyah)
  const rabtStepIndex = Math.min(rabtSteps.length - 1, Math.max(0, Number(practice.rabtStepIndex) || 0))
  const rabtStep = rabtSteps[rabtStepIndex] || rabtSteps[0]
  const rabtDisplayStart = rabtStep?.startAyah || rabtStartAyah
  const rabtDisplayEnd = rabtStep?.endAyah || rabtEndAyah
  const sourceAyah = phase === 'rabt' && rangeAudioAyah ? rangeAudioAyah : activeAyah
  const sourceVerse = verses.find((ayah) => ayah.number === sourceAyah)
  const audioUrl = audioUrlForAyah(qariId, sourceVerse?.globalNumber)
  const rangeVerses = verses.filter((ayah) => ayah.number >= rabtDisplayStart && ayah.number <= rabtDisplayEnd)
  const updatePractice = (changes) => {
    const next = { ...practice, ...changes, targetId: target.id }
    setPractice(next)
    onUpdateSession(next)
  }

  useEffect(() => {
    const next = { ...session, phase, targetId: target.id }
    setPractice(next)
    onUpdateSession(next)
  }, [phase, target.id])

  useEffect(() => {
    talaqqiPlaybackRef.current = phase === 'talaqqi' ? Math.min(talaqqiTarget, Number(session.talaqqiPlayCount) || 0) : 0
  }, [activeAyah, phase, talaqqiTarget])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError('')
    fetch(`https://api.alquran.cloud/v1/surah/${target.surahId}/quran-uthmani`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(t('practice.verseLoadError')) ; return response.json() })
      .then((payload) => {
        if (controller.signal.aborted) return
        const nextVerses = (payload?.data?.ayahs || []).map((ayah) => ({ number: ayah.numberInSurah, globalNumber: ayah.number, text: stripBismillah(ayah.text, target.surahId, ayah.numberInSurah) }))
        if (!nextVerses.length) throw new Error(t('practice.verseNotFound'))
        setVerses(nextVerses)
      })
      .catch((reason) => { if (!controller.signal.aborted) setLoadError(reason.message || t('practice.verseUnavailable')) })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [target.surahId])

  useEffect(() => {
    if (!isPlaying || !audioRef.current) return
    audioRef.current.load()
    audioRef.current.play().catch(() => {
      setIsPlaying(false)
      setAudioError(t('practice.audioError'))
    })
  }, [audioUrl, isPlaying])

  const handleAudioEnded = () => {
    if (phase === 'talaqqi') {
      if (talaqqiPlaybackRef.current < talaqqiTarget) {
        const nextCount = talaqqiPlaybackRef.current + 1
        talaqqiPlaybackRef.current = nextCount
        updatePractice({ talaqqiPlayCount: nextCount })
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {
          setIsPlaying(false)
          setAudioError(t('practice.audioError'))
        })
        return
      }
      talaqqiPlaybackRef.current = 0
      updatePractice({ phase: 'tikrar', tikrarCount: 0, talaqqiPlayCount: 0 })
      onNavigate('/tikrar')
      return
    }
    if (phase === 'rabt' && rangeAudioAyah && rangeAudioAyah < rabtDisplayEnd) {
      setRangeAudioAyah(rangeAudioAyah + 1)
      return
    }
    setIsPlaying(false)
    setRangeAudioAyah(null)
  }
  const playTalaqqi = () => { talaqqiPlaybackRef.current = 1; updatePractice({ talaqqiPlayCount: 1 }); setRangeAudioAyah(null); setAudioError(''); setIsPlaying(true) }
  const playRabtRange = () => { setRangeAudioAyah(rabtDisplayStart); setAudioError(''); setIsPlaying(true) }
  const addTikrar = () => updatePractice({ tikrarCount: Math.min(tikrarTarget, tikrarCount + 1) })
  const removeTikrar = () => updatePractice({ tikrarCount: Math.max(0, tikrarCount - 1) })
  const finishTalaqqi = () => {
    talaqqiPlaybackRef.current = 0
    updatePractice({ phase: 'tikrar', tikrarCount: 0, talaqqiPlayCount: 0 })
    onNavigate('/tikrar')
  }
  const beginRabt = (endAyah = activeAyah) => {
    updatePractice({ phase: 'rabt', tikrarCount: 0, rabtScope: 'card', rabtStartAyah: target.startAyah, rabtEndAyah: endAyah, rabtStepIndex: 0 })
    onNavigate('/rabt')
  }
  const finishTikrar = () => {
    // Ayat pertama belum memiliki ayat sebelumnya untuk disambungkan.
    if (activeAyah === target.startAyah) {
      if (activeAyah < target.endAyah) {
        updatePractice({ phase: 'talaqqi', currentAyah: activeAyah + 1, tikrarCount: 0, talaqqiPlayCount: 0 })
        onNavigate('/talaqqi')
        return
      }
      return onFinish({ rabtScope: 'none' })
    }
    beginRabt(activeAyah)
  }
  const continueAfterRabt = () => {
    if (rabtStepIndex < rabtSteps.length - 1) {
      updatePractice({ rabtStepIndex: rabtStepIndex + 1 })
      return
    }
    if (rabtScope === 'card' && rabtEndAyah < target.endAyah) {
      updatePractice({ phase: 'talaqqi', currentAyah: rabtEndAyah + 1, tikrarCount: 0, talaqqiPlayCount: 0 })
      onNavigate('/talaqqi')
      return
    }
    onFinish({ rabtScope })
  }
  const isFinalCardRabt = rabtScope === 'card' && rabtEndAyah === target.endAyah
  const rabtRangeLabel = rangeLabel(rabtStartAyah, rabtEndAyah, t)
  const rabtNextAyah = rabtEndAyah + 1
  const retryRabt = () => {
    audioRef.current?.pause()
    setRangeAudioAyah(rabtDisplayStart)
    setAudioError('')
    setIsPlaying(true)
  }
  const closeForToday = () => {
    audioRef.current?.pause()
    onEndSession()
  }
  const phaseLabel = phase === 'talaqqi' ? 'TALAQQI' : phase === 'tikrar' ? 'TIKRAR' : 'RABT'
  const currentVerse = verses.find((ayah) => ayah.number === activeAyah)
  const previousPhase = phase === 'tikrar' ? 'talaqqi' : phase === 'rabt' && rabtScope === 'card' ? 'tikrar' : null
  const nextDisabled = phase === 'talaqqi'
    ? talaqqiPlayCount < talaqqiTarget
    : phase === 'tikrar'
      ? tikrarCount < tikrarTarget
      : false
  const previousLabel = phase === 'rabt' && rabtStepIndex > 0 ? t('practice.previousRabt') : previousPhase ? t('practice.backTo', { phase: previousPhase === 'talaqqi' ? 'Talaqqi' : 'Tikrar' }) : t('practice.endToday')
  const nextLabel = phase === 'talaqqi'
    ? t('practice.nextTikrar')
    : phase === 'tikrar'
      ? activeAyah === target.startAyah && activeAyah < target.endAyah ? t('practice.nextVerse', { ayah: activeAyah + 1 }) : activeAyah === target.startAyah ? t('practice.saveMemory') : t('practice.connectRange', { range: rangeLabel(target.startAyah, activeAyah, t) })
      : rabtStepIndex < rabtSteps.length - 1
        ? rabtSteps[rabtStepIndex + 1]?.type === 'bridge' ? t('practice.nextBlock') : t('practice.continueConnection')
        : rabtScope === 'surah' ? t('practice.finishSurah') : isFinalCardRabt ? t('practice.saveMemory') : t('practice.nextVerse', { ayah: rabtNextAyah })
  const goPrevious = () => {
    audioRef.current?.pause()
    setIsPlaying(false)
    setRangeAudioAyah(null)
    if (phase === 'rabt' && rabtStepIndex > 0) return updatePractice({ rabtStepIndex: rabtStepIndex - 1 })
    if (!previousPhase) return closeForToday()
    updatePractice({ phase: previousPhase })
    onNavigate(`/${previousPhase}`)
  }
  const goNext = () => {
    if (nextDisabled) return
    if (phase === 'talaqqi') return finishTalaqqi()
    if (phase === 'tikrar') return finishTikrar()
    continueAfterRabt()
  }
  const advanceDemo = () => {
    audioRef.current?.pause()
    setIsPlaying(false)
    setRangeAudioAyah(null)
    if (phase === 'talaqqi') return finishTalaqqi()
    if (phase === 'tikrar') return finishTikrar()
    onFinish({ rabtScope })
  }

  const rabtTitle = rabtScope === 'surah' ? t('practice.surahConnectionTitle') : t('practice.cardConnectionTitle', { range: rabtRangeLabel })
  const rabtHelper = rabtStep?.type === 'bridge'
    ? t('practice.bridgeHelper', { start: rabtDisplayStart, end: rabtDisplayEnd })
    : rabtScope === 'surah'
      ? t('practice.surahHelper')
      : t('practice.cardHelper', { start: rabtStartAyah, end: rabtEndAyah })

  return <main className="practice-page"><audio ref={audioRef} src={audioUrl} preload="none" onPlay={() => { setAudioError(''); setIsPlaying(true) }} onPause={() => { if (!audioRef.current?.ended) setIsPlaying(false) }} onError={() => { setIsPlaying(false); setAudioError('Audio belum bisa diputar. Periksa koneksi, lalu coba lagi.') }} onEnded={handleAudioEnded}/><div className="practice-shell"><header className="flex items-center justify-between gap-3"><button type="button" onClick={closeForToday} className="flex min-h-11 items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={18}/> {t('practice.endToday')}</button><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={advanceDemo} className="flex min-h-11 items-center rounded-2xl bg-sage px-3 text-xs font-bold text-forest transition-[transform,background-color] hover:bg-[#c9dec9] active:scale-[0.96]">Demo: {phase === 'rabt' ? 'done' : 'next'}</button><span className="rounded-full bg-peach px-3 py-1.5 text-xs font-bold text-terracotta">{t('practice.fiveMinutes')}</span></div></header><section className="glass-card mt-5 w-full overflow-hidden lg:mt-8"><div className="bg-forest px-5 py-6 text-white lg:px-10 lg:py-8"><p className="text-sm font-semibold text-white/70">QS. {item?.name} · {rangeLabel(target.startAyah, target.endAyah)}</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><h1 className="font-display text-3xl lg:text-4xl">{phaseLabel}</h1><span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold tabular-nums">{phase === 'rabt' ? rabtStep?.type === 'bridge' ? `Sambungan ${rabtStep.fromBlock + 1} → ${rabtStep.toBlock + 1}` : `Blok ${(rabtStep?.blockIndex || 0) + 1}/${Math.ceil((rabtEndAyah - rabtStartAyah + 1) / RABT_BLOCK_SIZE)}` : `Ayat ${activeAyah}/${target.endAyah}`}</span></div><div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-bold"><span className={phase === 'talaqqi' ? 'text-peach' : 'text-white/60'}>1. {t('practice.listen')}</span><span className={phase === 'tikrar' ? 'text-peach' : 'text-white/60'}>2. {t('practice.follow')}</span><span className={phase === 'rabt' ? 'text-peach' : 'text-white/60'}>3. {t('practice.connect')}</span></div></div><div className="p-5 lg:p-10">{loadError ? <p role="alert" className="rounded-2xl bg-[#fff2df] p-4 text-sm text-terracotta">{loadError}</p> : <><div className={`practice-ayah-panel ${phase === 'rabt' ? 'practice-ayah-panel-scroll' : ''}`}><p className="font-serif text-right text-4xl leading-[2.1] text-terracotta lg:text-6xl" dir="rtl">{isLoading ? t('practice.loading') : phase === 'rabt' ? rangeVerses.map((ayah) => <span key={ayah.number} className="block">{ayah.text} <small className="mr-2 font-sans text-base font-bold text-slate-400">{ayah.number}</small></span>) : currentVerse?.text}</p></div><p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{phase === 'rabt' ? rangeLabel(rabtDisplayStart, rabtDisplayEnd) : `Ayat ${activeAyah}`}</p></>}{audioError && <p role="alert" className="mx-auto mt-5 max-w-2xl rounded-2xl bg-[#fff2df] p-4 text-sm font-semibold text-terracotta">{audioError}</p>}{phase === 'talaqqi' && <div className="mx-auto mt-8 max-w-2xl"><p className="step-label bg-sage text-forest">{t('practice.step1')}</p><h2 className="font-display mt-3 text-3xl text-forest">{t('practice.listenTitle', { count: talaqqiTarget })}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{t('practice.listenBody', { count: talaqqiTarget })}</p><button type="button" disabled={isLoading || isPlaying} onClick={playTalaqqi} className="primary-button mt-6 disabled:cursor-not-allowed disabled:opacity-50"><Volume2 size={20}/>{isPlaying ? t('practice.playing', { count: talaqqiPlayCount, target: talaqqiTarget }) : t('practice.play', { ayah: activeAyah, count: talaqqiTarget })}</button></div>}{phase === 'tikrar' && <div className="mx-auto mt-8 max-w-2xl"><p className="step-label bg-sage text-forest">{t('practice.step2')}</p><h2 className="font-display mt-3 text-3xl text-forest">{t('practice.repeatTitle', { count: tikrarTarget })}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{t('practice.repeatBody')}</p><TikrarFruitCounter count={tikrarCount} target={tikrarTarget}/><div className="tikrar-fruit-controls"><button type="button" disabled={tikrarCount === 0} onClick={removeTikrar} className="tikrar-fruit-control disabled:cursor-not-allowed disabled:opacity-45"><span aria-hidden="true">−</span></button><button type="button" disabled={tikrarCount >= tikrarTarget} onClick={addTikrar} className="tikrar-fruit-control tikrar-fruit-control-add disabled:cursor-not-allowed disabled:opacity-45"><Plus size={22}/></button></div></div>}{phase === 'rabt' && <div className="mx-auto mt-8 max-w-2xl"><p className="step-label bg-sage text-forest">{rabtScope === 'surah' ? 'RABT SURAT' : t('practice.step3')}</p><h2 className="font-display mt-3 text-3xl text-forest">{rabtTitle}</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">{rabtHelper}</p><button type="button" disabled={isLoading || isPlaying} onClick={playRabtRange} className="secondary-button mt-6 w-full disabled:cursor-not-allowed disabled:opacity-45"><Volume2 size={18}/>{isPlaying ? t('practice.playing', { count: rangeAudioAyah, target: '' }) : t('practice.playExample', { range: rangeLabel(rabtDisplayStart, rabtDisplayEnd) })}</button><div className="mt-5"><p className="rounded-2xl bg-[#eff6eb] p-4 text-center text-sm font-bold text-forest">{rabtStep?.type === 'bridge' ? t('practice.giveTime') : t('practice.fluency')}</p><button type="button" onClick={retryRabt} className="secondary-button mt-3 w-full !border-peach !text-terracotta"><RotateCcw size={18}/> {t('practice.repeatPart')}</button></div></div>}<nav className="practice-phase-navigation"><button type="button" onClick={goPrevious} className="secondary-button"><ArrowLeft size={18}/>{previousLabel}</button><button type="button" disabled={nextDisabled} onClick={goNext} className="primary-button disabled:cursor-not-allowed disabled:opacity-45">{nextLabel}<ArrowRight size={18}/></button></nav></div></section></div></main>
}
