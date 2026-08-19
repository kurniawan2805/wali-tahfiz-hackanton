import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Pause, RotateCcw, Volume2 } from 'lucide-react'
import { audioUrlForAyah, DEFAULT_QARI_ID } from './quranAudio'
import { fetchSurahArabic } from './quranText'
import { useLocale } from './i18n'
import { DEFAULT_REPEATS, RABT_BLOCK_SIZE, createRabtSteps, rangeLabel, stripBismillah, surahFor } from './surahData'

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
  const talaqqiTarget = Math.max(1, Number(profile.repeats.talaqqi) || DEFAULT_REPEATS.talaqqi)
  const talaqqiPlayCount = Math.min(talaqqiTarget, Number(practice.talaqqiPlayCount) || 0)
  const tikrarTarget = Math.max(1, Number(profile.repeats.tikrar) || DEFAULT_REPEATS.tikrar)
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
    fetchSurahArabic(target.surahId, controller.signal)
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
  const stopPlayback = () => { audioRef.current?.pause(); setRangeAudioAyah(null); setIsPlaying(false) }
  const helpTikrar = () => { setRangeAudioAyah(null); setAudioError(''); setIsPlaying(true) }
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
    // Verse pertama belum memiliki ayat sebelumnya untuk disambungkan.
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
  const phaseLabel = phase === 'talaqqi' ? t('practice.phaseListen') : phase === 'tikrar' ? t('practice.phaseRepeat') : t('practice.phaseConnect')
  const currentVerse = verses.find((ayah) => ayah.number === activeAyah)
  const previousPhase = phase === 'tikrar' ? 'talaqqi' : phase === 'rabt' && rabtScope === 'card' ? 'tikrar' : null
  const previousPhaseName = previousPhase === 'talaqqi' ? t('practice.phaseListen') : previousPhase === 'tikrar' ? t('practice.phaseRepeat') : ''
  const nextDisabled = phase === 'talaqqi'
    ? talaqqiPlayCount < talaqqiTarget
    : phase === 'tikrar'
      ? tikrarCount < tikrarTarget
      : false
  const previousLabel = phase === 'rabt' && rabtStepIndex > 0 ? t('practice.previousRabt') : previousPhase ? t('practice.backTo', { phase: previousPhaseName }) : t('practice.endToday')
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
  const rabtTitle = rabtScope === 'surah' ? t('practice.surahConnectionTitle') : t('practice.cardConnectionTitle', { range: rabtRangeLabel })
  const rabtHelper = rabtStep?.type === 'bridge'
    ? t('practice.bridgeHelper', { start: rabtDisplayStart, end: rabtDisplayEnd })
    : rabtScope === 'surah'
      ? t('practice.surahHelper')
      : t('practice.cardHelper', { start: rabtStartAyah, end: rabtEndAyah })

  return <main className="practice-page"><audio ref={audioRef} src={audioUrl} preload="none" onPlay={() => { setAudioError(''); setIsPlaying(true) }} onPause={() => { if (!audioRef.current?.ended) setIsPlaying(false) }} onError={() => { setIsPlaying(false); setAudioError(t('practice.audioError')) }} onEnded={handleAudioEnded}/><div className="practice-shell"><header className="flex items-center justify-between gap-3"><button type="button" onClick={closeForToday} className="flex min-h-11 items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={18}/> {t('practice.endToday')}</button><span className="rounded-full bg-peach px-3 py-1.5 text-xs font-bold text-terracotta">{t('practice.fiveMinutes')}</span></header><section className="glass-card mt-5 w-full overflow-hidden lg:mt-8"><div className="bg-forest px-5 py-6 text-white lg:px-10 lg:py-8"><p className="text-sm font-semibold text-white/70">QS. {item?.name} · {rangeLabel(target.startAyah, target.endAyah, t)}</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><h1 className="font-display text-3xl lg:text-4xl">{phaseLabel}</h1><span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold tabular-nums">{phase === 'rabt' ? rabtStep?.type === 'bridge' ? `${t('practice.connection')} ${rabtStep.fromBlock + 1} → ${rabtStep.toBlock + 1}` : `${t('practice.block')} ${(rabtStep?.blockIndex || 0) + 1}/${Math.ceil((rabtEndAyah - rabtStartAyah + 1) / RABT_BLOCK_SIZE)}` : `${t('practice.rangeUnit')} ${activeAyah}/${target.endAyah}`}</span></div><div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-bold"><span className={phase === 'talaqqi' ? 'text-peach' : 'text-white/60'}>1. {t('practice.listen')}</span><span className={phase === 'tikrar' ? 'text-peach' : 'text-white/60'}>2. {t('practice.follow')}</span><span className={phase === 'rabt' ? 'text-peach' : 'text-white/60'}>3. {t('practice.connect')}</span></div></div><div className="p-5 lg:p-10">{loadError ? <p role="alert" className="rounded-2xl bg-surface-warning p-4 text-sm text-terracotta dark:bg-amber-950/40 dark:text-amber-200">{loadError}</p> : <><div className={`practice-ayah-panel ${phase === 'rabt' ? 'practice-ayah-panel-scroll' : ''}`}><p className="font-serif text-right text-4xl leading-[2.2] text-terracotta lg:text-6xl" dir="rtl" data-ayah={!isLoading && phase !== 'rabt' ? activeAyah : undefined}>{isLoading ? t('practice.loading') : phase === 'rabt' ? rangeVerses.map((ayah) => <span key={ayah.number} className="inline">{ayah.text} <span className="practice-ayah-rosette">{ayah.number}</span> </span>) : currentVerse?.text}</p></div><p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.16em] text-stone-400 dark:text-stone-500">{phase === 'rabt' ? rangeLabel(rabtDisplayStart, rabtDisplayEnd, t) : `${t('practice.rangeUnit')} ${activeAyah}`}</p></>}{audioError && <p role="alert" className="mx-auto mt-5 max-w-2xl rounded-2xl bg-surface-warning p-4 text-sm font-semibold text-terracotta dark:bg-amber-950/40 dark:text-amber-200">{audioError}</p>}{phase === 'talaqqi' && <div className="mx-auto mt-8 max-w-2xl"><p className="step-label bg-sage text-forest">{t('practice.step1')}</p><h2 className="font-display mt-3 text-3xl text-forest">{t('practice.listenTitle', { count: talaqqiTarget })}</h2><p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{t('practice.listenBody', { count: talaqqiTarget })}</p><button type="button" disabled={isLoading} onClick={isPlaying ? stopPlayback : playTalaqqi} className="primary-button audio-primary-button mt-6 disabled:cursor-not-allowed disabled:opacity-50">{isPlaying ? <Pause size={22} fill="currentColor"/> : <Volume2 size={22}/>}{isPlaying ? t('practice.pause') : t('practice.play', { ayah: activeAyah, count: talaqqiTarget })}</button></div>}{phase === 'tikrar' && <div className="mx-auto mt-8 w-full max-w-2xl"><p className="step-label bg-sage text-forest">{t('practice.step2')}</p><h2 className="font-display mt-3 text-3xl text-forest">{t('practice.repeatTitle', { count: tikrarTarget })}</h2><p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{t('practice.repeatBody')}</p><div className="parent-record-card" role="status" aria-live="polite" aria-label={t('practice.repetitionsComplete', { count: tikrarCount, target: tikrarTarget })}><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-forest dark:text-emerald-100">{t('practice.repetitionsComplete', { count: tikrarCount, target: tikrarTarget })}</p><button type="button" disabled={tikrarCount === 0} onClick={removeTikrar} aria-label={t('practice.undoRound')} className="parent-record-undo disabled:cursor-not-allowed disabled:opacity-45"><RotateCcw size={14}/> {t('practice.undoRound')}</button></div><div className="parent-record-track" aria-hidden="true"><span className="parent-record-fill" style={{ width: `${(tikrarCount / tikrarTarget) * 100}%` }}/></div></div><div className="parent-record-grid"><button type="button" disabled={isLoading} onClick={helpTikrar} className="secondary-button audio-primary-button !border-peach !text-terracotta disabled:cursor-not-allowed disabled:opacity-45"><RotateCcw size={20}/> {t('practice.needsGuidance')}</button><button type="button" disabled={isLoading || tikrarCount >= tikrarTarget} onClick={addTikrar} className="primary-button audio-primary-button disabled:cursor-not-allowed disabled:opacity-45"><Check size={22}/> {t('practice.smooth')}</button></div></div>}{phase === 'rabt' && <div className="mx-auto mt-8 w-full max-w-2xl"><p className="step-label bg-sage text-forest">{rabtScope === 'surah' ? t('practice.surahConnectionTitle').toUpperCase() : t('practice.step3')}</p><h2 className="font-display mt-3 text-3xl text-forest">{rabtTitle}</h2><p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{rabtHelper}</p><button type="button" disabled={isLoading} onClick={isPlaying ? stopPlayback : playRabtRange} className="secondary-button audio-primary-button mt-6 disabled:cursor-not-allowed disabled:opacity-45">{isPlaying ? <Pause size={20} fill="currentColor"/> : <Volume2 size={20}/>}{isPlaying ? t('practice.pause') : t('practice.playExample', { range: rangeLabel(rabtDisplayStart, rabtDisplayEnd, t) })}</button><div className="mt-5"><p className="rounded-2xl bg-surface-muted p-4 text-center text-sm font-bold text-forest dark:bg-emerald-950/60">{rabtStep?.type === 'bridge' ? t('practice.giveTime') : t('practice.fluency')}</p><button type="button" onClick={retryRabt} className="secondary-button mt-3 w-full !border-peach !text-terracotta"><RotateCcw size={18}/> {t('practice.repeatPart')}</button></div></div>}<nav className="practice-phase-navigation"><button type="button" onClick={goPrevious} className="secondary-button"><ArrowLeft size={18}/>{previousLabel}</button><button type="button" disabled={nextDisabled} onClick={goNext} className="primary-button audio-primary-button disabled:cursor-not-allowed disabled:opacity-45">{nextLabel}<ArrowRight size={20}/></button></nav></div></section></div></main>
}
