import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Pause, RotateCcw, Shuffle, Volume2 } from 'lucide-react'
import { audioUrlForAyah, DEFAULT_QARI_ID } from './quranAudio'
import { fetchSurahArabic } from './quranText'
import { rangeLabel, stripBismillah, surahFor } from './surahData'
import { useLocale } from './i18n'


export default function ReviewPlayer({ memory, onClose, onReviewed, page = false, qariId = DEFAULT_QARI_ID }) {
  const { t } = useLocale()
  const audioRef = useRef(null)
  const [verses, setVerses] = useState([])
  const [questionAyah, setQuestionAyah] = useState(null)
  const [activeAyah, setActiveAyah] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const item = surahFor(memory.surahId)
  const activeVerse = verses.find((ayah) => ayah.number === activeAyah)
  const audioUrl = audioUrlForAyah(qariId, activeVerse?.globalNumber)

  const randomizeQuestion = () => {
    const latestQuestionAyah = memory.endAyah > memory.startAyah ? memory.endAyah - 1 : memory.startAyah
    const nextQuestion = memory.startAyah + Math.floor(Math.random() * (latestQuestionAyah - memory.startAyah + 1))
    audioRef.current?.pause()
    setIsPlaying(false)
    setActiveAyah(null)
    setQuestionAyah(nextQuestion)
  }

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError('')
    setVerses([])
    fetchSurahArabic(memory.surahId, controller.signal)
      .then((response) => { if (!response.ok) throw new Error(t('review.arabicLoadError')) ; return response.json() })
      .then((payload) => {
        if (controller.signal.aborted) return
        setVerses((payload?.data?.ayahs || [])
          .filter((ayah) => ayah.numberInSurah >= memory.startAyah && ayah.numberInSurah <= memory.endAyah)
          .map((ayah) => ({ number: ayah.numberInSurah, globalNumber: ayah.number, text: stripBismillah(ayah.text, memory.surahId, ayah.numberInSurah) })))
      })
      .catch((error) => { if (!controller.signal.aborted) setLoadError(error.message || t('review.arabicUnavailable')) })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [memory.endAyah, memory.startAyah, memory.surahId])

  useEffect(() => { randomizeQuestion() }, [memory.endAyah, memory.startAyah])

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return
    audioRef.current.load()
    audioRef.current.play().catch(() => setIsPlaying(false))
  }, [audioUrl])

  const playAyah = (ayah) => {
    if (activeAyah === ayah && audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play().catch(() => setIsPlaying(false))
      return
    }
    setActiveAyah(ayah)
  }
  const questionVerse = verses.find((ayah) => ayah.number === questionAyah)
  const answerVerse = verses.find((ayah) => ayah.number === questionAyah + 1)
  const hasAnswer = Boolean(answerVerse)

  useEffect(() => {
    const playCardAyah = (event) => {
      if (!(event.target instanceof Element) || event.target.closest('button')) return
      const card = event.target.closest('.review-ayah-card')
      if (!card) return
      if (card.classList.contains('review-question-card')) playAyah(questionAyah)
      else if (card.classList.contains('review-answer-card') && answerVerse) playAyah(answerVerse.number)
    }
    document.addEventListener('click', playCardAyah)
    return () => document.removeEventListener('click', playCardAyah)
  }, [activeAyah, answerVerse, isPlaying, questionAyah])

  const pageHeader = <header className="flex items-center justify-between"><button type="button" onClick={onClose} className="flex min-h-11 items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={18}/> {t('review.back')}</button><span className="badge-review rounded-full px-3 py-1.5 text-xs font-bold">{t('review.title').toUpperCase()}</span></header>
  const dialogHeader = <header className="flex items-center justify-between gap-3"><button type="button" onClick={onClose} aria-label={t('review.back')} className="icon-button"><ArrowLeft size={20}/></button><div className="min-w-0 flex-1 text-center"><p className="text-xs font-bold uppercase tracking-[.14em] text-forest/70">Wali Tahfiz</p><h1 id="review-title" className="font-display text-2xl text-forest">{t('review.title')}</h1></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage text-forest"><RotateCcw size={20}/></span></header>
  const content = <section className={`review-session ${page ? 'w-full' : 'sheet'}`} role={page ? undefined : 'dialog'} aria-modal={page || undefined} aria-labelledby="review-title"><audio ref={audioRef} src={audioUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)}/>{!page && dialogHeader}<div className={`review-hero ${page ? '' : 'mt-5'}`}><p className="step-label bg-white/15 text-white"><Shuffle size={14}/> {t('review.random')}</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 id={page ? 'review-title' : undefined} className="font-display text-3xl">QS. {item?.name}</h1><p className="mt-1 text-sm font-semibold text-white/70">{rangeLabel(memory.startAyah, memory.endAyah, t)} · {t('review.connect')}</p></div><span className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold tabular-nums">{questionAyah ? t('review.question', { number: questionAyah }) : t('review.choosing')}</span></div></div><div className="p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-amber-50 px-4 py-3 dark:bg-emerald-950/60"><p className="text-sm leading-relaxed text-forest dark:text-emerald-100"><b className="block">{t('review.how')}</b><span className="text-muted">{t('review.howBody')}</span></p><button type="button" onClick={randomizeQuestion} className="review-shuffle-button"><Shuffle size={18}/> {t('review.shuffle')}</button></div>{loadError ? <p role="alert" className="mt-5 rounded-2xl bg-amber-100 p-4 text-sm font-semibold text-terracotta dark:bg-amber-950/70">{loadError}</p> : isLoading ? <div className="mt-5 flex min-h-72 items-center justify-center rounded-[26px] bg-amber-50 text-center dark:bg-emerald-950/60"><p className="text-muted text-sm font-semibold">{t('review.loading')}</p></div> : <div className="mt-5 grid gap-4 lg:grid-cols-2"><section className="review-ayah-card review-question-card"><div className="flex items-start justify-between gap-3"><div><p className="review-card-label text-terracotta">{t('review.question', { number: questionAyah })}</p><h2 className="font-display mt-1 text-2xl text-forest">{t('review.read')}</h2></div><button type="button" onClick={() => playAyah(questionAyah)} aria-label={activeAyah === questionAyah && isPlaying ? t('review.pauseAudio') : t('review.playQuestion')} className={`review-audio-button ${activeAyah === questionAyah && isPlaying ? 'review-audio-button-playing' : ''}`}>{activeAyah === questionAyah && isPlaying ? <Pause size={20} fill="currentColor"/> : <Volume2 size={20}/>}</button></div><p className="review-arabic mt-4" dir="rtl">{questionVerse?.text || t('review.unavailable')}</p><div className="mt-6 flex items-center justify-between gap-3 border-t border-terracotta/15 pt-4"><span className="text-muted text-sm font-semibold">{t('review.listenAgain')}</span><button type="button" onClick={() => playAyah(questionAyah)} className="text-sm font-bold text-terracotta">{activeAyah === questionAyah && isPlaying ? t('review.pauseAudio') : t('review.playQuestion')}</button></div></section><section className="review-ayah-card review-answer-card"><div className="flex items-start justify-between gap-3"><div><p className="review-card-label text-forest">{t('review.answer', { number: hasAnswer ? questionAyah + 1 : questionAyah })}</p><h2 className="font-display mt-1 text-2xl text-forest">{t('review.correct')}</h2></div>{hasAnswer && <button type="button" onClick={() => playAyah(answerVerse.number)} aria-label={activeAyah === answerVerse.number && isPlaying ? t('review.pauseAudio') : t('review.playAnswer')} className={`review-audio-button ${activeAyah === answerVerse.number && isPlaying ? 'review-audio-button-playing' : ''}`}>{activeAyah === answerVerse.number && isPlaying ? <Pause size={20} fill="currentColor"/> : <Volume2 size={20}/>}</button>}</div><p className="review-arabic mt-4" dir="rtl">{answerVerse?.text || t('review.oneVerse')}</p><div className="mt-6 flex items-center justify-between gap-3 border-t border-sage pt-4"><span className="text-muted text-sm font-semibold">{t('review.compare')}</span>{hasAnswer && <button type="button" onClick={() => playAyah(answerVerse.number)} className="text-sm font-bold text-forest">{activeAyah === answerVerse.number && isPlaying ? t('review.pauseAudio') : t('review.playAnswer')}</button>}</div></section></div>}<div className="mt-6 rounded-[24px] bg-amber-50 p-4 text-center dark:bg-emerald-950/60"><p className="text-sm font-bold text-forest dark:text-emerald-100">{t('review.fluency')}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => onReviewed('repeat')} className="secondary-button !border-peach !text-terracotta"><RotateCcw size={18}/> {t('review.repeat')}</button><button type="button" onClick={() => onReviewed('pass')} className="primary-button"><Check size={19}/> {t('review.fluent')}</button></div></div></div></section>
  return page ? <main className="practice-page"><div className="practice-shell">{pageHeader}{content}</div></main> : <div className="sheet-backdrop" role="presentation">{content}</div>
}
