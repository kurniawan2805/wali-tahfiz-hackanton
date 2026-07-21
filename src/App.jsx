import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Baby, Bot, CalendarDays, Check, ChevronDown, CircleCheck, Clock3, Download, Headphones, Leaf, Moon, Pause, Play, Plus, RotateCcw, Search, Send, Settings, Share, Shuffle, SkipBack, SkipForward, SlidersHorizontal, Sparkles, Sun, Trash2, Upload, UserRound, Volume2, X } from 'lucide-react'
import { clearAllData, createBackup, db, getAppLocale, getProfile, getQuranQari, getQuranRange, getQuranRepeat, getTargetsForDay, getTargetsForMemory, hasLegacyStorage, migrateLegacyStorage, normalizeFamilyProfile, restoreBackup, saveAppLocale, saveProfile, saveQuranQari, saveQuranRange, saveQuranRepeat } from './db'
import { DEFAULT_QARI_ID, qariFor } from './quranAudio'
import { DEFAULT_LOCALE, LocaleProvider, SUPPORTED_LOCALES, useLocale } from './i18n'
import { applyTheme, THEME_STORAGE_KEY } from './theme'
import { createCoachCheckin, isPersonalAdvice, readinessForCondition } from './coachCheckin'
import { createScheduledMemory, getReviewRecommendations, hasReviewTargetForToday, isCreatedToday, localDateKey, reviewDueState, scheduleReviewResult } from './reviewSchedule'
import { QURAN_CATALOGUE } from './quranCatalogue'
import { applyValidatedProgress, validateProgressEntries, validateProgressResponse } from './progress'

const LazySettingsPage = lazy(() => import('./SettingsPage'))
const LazyQuranRangePage = lazy(() => import('./QuranRangePage'))
const LazyReviewPlayer = lazy(() => import('./ReviewPlayer'))
const LazyNewMemoryFlow = lazy(() => import('./NewMemoryFlow'))
const RouteFallback = () => <main className="page-root flex items-center justify-center"><p className="font-display text-xl text-forest">Menyiapkan halaman…</p></main>

const RABT_BLOCK_SIZE = 10
const defaults = { role: 'Bunda', name: '', age: '', icon: '🌙', memorized: [], repeats: { talaqqi: 3, tikrar: 10, rabt: 1 } }
const childDefaults = { name: '', age: '', icon: '🌙', memorized: [], repeats: { talaqqi: 3, tikrar: 10, rabt: 1 } }
const icons = ['🌙', '⭐', '🕌', '🌿', '🕊️', '🌸']
const surahs = [{ id: '112', name: 'Al-Ikhlas', arabic: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', ayat: 4 }, { id: '113', name: 'Al-Falaq', arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ', ayat: 5 }, { id: '114', name: 'An-Nas', arabic: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ', ayat: 6 }]
const audio = { 112: 'https://verses.quran.foundation/Alafasy/mp3/112001.mp3', 113: 'https://verses.quran.foundation/Alafasy/mp3/113001.mp3', 114: 'https://verses.quran.foundation/Alafasy/mp3/114001.mp3' }
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
const onboardingSurahs = [audioSurahs.find((surah) => surah.id === '1'), ...audioSurahs.filter((surah) => surah.group === 'juz30').reverse()]
const todayKey = () => localDateKey()
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const createChild = () => ({ id: makeId('child'), ...childDefaults, memorized: [], repeats: { ...childDefaults.repeats } })
const rangeLabel = (start, end) => `Verse ${start}–${end}`
const surahFor = (id) => audioSurahs.find((surah) => surah.id === id) || surahs.find((surah) => surah.id === id)
const dueLabel = (memory, t) => {
  const due = reviewDueState(memory, todayKey())
  return due.status === 'due' ? t('home.due') : t('home.dueIn', { days: due.days })
}
const bismillahText = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
const ACTIVE_TARGET_KEY = 'wali-tahfiz:active-target'
const ACTIVE_MEMORY_KEY = 'wali-tahfiz:active-memory'
const ACTIVE_PRACTICE_SESSION_KEY = 'wali-tahfiz:active-practice-session'
const childConditions = [['tantrum', 'Tantrum'], ['tidak-mood', 'Tidak mood'], ['ingin-main', 'Mau main'], ['lelah', 'Lelah'], ['siap', 'Siap belajar']]
const completeTodayCoachAction = async (childId) => {
  const checkin = await db.coachCheckins.where('[childId+date]').equals([childId, todayKey()]).first()
  if (!checkin || checkin.actionStatus !== 'acted' || !['start', 'review', 'new'].includes(checkin.actionTaken)) return
  await db.coachCheckins.put({ ...checkin, actionStatus: 'completed', updatedAt: new Date().toISOString() })
}
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
const coversWholeSurah = (memories, ayahCount) => {
  let coveredUntil = 0
  const ranges = memories
    .map(({ startAyah, endAyah }) => ({ startAyah: Number(startAyah), endAyah: Number(endAyah) }))
    .filter(({ startAyah, endAyah }) => Number.isFinite(startAyah) && Number.isFinite(endAyah))
    .sort((left, right) => left.startAyah - right.startAyah || right.endAyah - left.endAyah)
  for (const range of ranges) {
    if (range.startAyah > coveredUntil + 1) break
    coveredUntil = Math.max(coveredUntil, range.endAyah)
    if (coveredUntil >= ayahCount) return true
  }
  return false
}

function Field({ label, hint, children }) { return <div className="block"><span className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>{children}{hint && <span className="mt-1.5 block text-xs text-slate-500 dark:text-stone-400">{hint}</span>}</div> }
function ConditionPicker({ conditions, onChange, compact = false }) {
  const selected = conditions[0] || ''
  return <div className={`condition-picker ${compact ? 'condition-picker-compact' : ''}`} role="group" aria-label="Choose your child’s mood">
    {childConditions.map(([value, label]) => <button type="button" key={value} aria-pressed={selected === value} onClick={() => onChange(selected === value ? [] : [value])} className={`condition-chip ${selected === value ? 'condition-chip-active' : ''}`}>
      <span>{label}</span>
    </button>)}
  </div>
}
function Select({ label, value, onChange, options }) { return <Field label={label}><div className="memory-picker" role="listbox" aria-label={label}>{options.map((option, index) => { const active = option.value === value; return <button type="button" role="option" aria-selected={active} key={option.value} onClick={() => onChange({ target: { value: option.value } })} className={'memory-picker-option ' + (active ? 'memory-picker-option-active' : '')}><span className={'memory-picker-number ' + (active ? 'memory-picker-number-active' : '')}>{String(index + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 text-left"><b className="block text-forest">{option.label}</b><small className="mt-0.5 block text-slate-500">Tap to select this memorisation</small></span><span className={'memory-picker-check ' + (active ? 'memory-picker-check-active' : '')} aria-hidden="true">{active && <Check size={15}/>}</span></button> })}</div></Field> }
function MemoryPicker({ memories, value, onChange }) {
  return <Field label="Choose memorisation to review" hint="Choose a memorisation card to view its verse range.">
    <div className="memory-picker" role="listbox" aria-label="Choose saved memorisation">
      {memories.map((memory) => {
        const item = surahFor(memory.surahId)
        const active = memory.id === value
        return <button type="button" role="option" aria-selected={active} key={memory.id} onClick={() => onChange(memory.id)} className={`memory-picker-option ${active ? 'memory-picker-option-active' : ''}`}>
          <span className={`memory-picker-number ${active ? 'memory-picker-number-active' : ''}`}>{item?.id}</span>
          <span className="min-w-0 flex-1 text-left"><b className="block truncate text-forest">QS. {item?.name || 'Surat'}</b><small className="mt-0.5 block text-slate-500">{rangeLabel(memory.startAyah, memory.endAyah)} · {memory.endAyah - memory.startAyah + 1} ayat</small></span>
          <span className={`memory-picker-check ${active ? 'memory-picker-check-active' : ''}`} aria-hidden="true">{active && <Check size={15}/>}</span>
        </button>
      })}
    </div>
  </Field>
}
function TikrarFruitCounter({ count, target }) {
  const fruits = Array.from({ length: target })
  return <div className="tikrar-fruit-counter" role="status" aria-live="polite" aria-label={`${count} of ${target} repetitions complete`}>
    <div className="tikrar-tree" aria-hidden="true">
      <div className="tikrar-tree-fruits">{fruits.map((_, index) => <span key={index} className={`tikrar-tree-fruit ${index < count ? 'tikrar-tree-fruit-picked' : ''}`}>🍎</span>)}</div>
      <span className="tikrar-tree-trunk">🌳</span>
    </div>
    <div className="tikrar-basket" aria-hidden="true"><span className="tikrar-basket-icon">🧺</span><div className="tikrar-basket-fruits">{fruits.slice(0, count).map((_, index) => <span key={index} className="tikrar-basket-fruit">🍎</span>)}</div></div>
    <p className="mt-4 text-sm font-semibold leading-relaxed text-forest">Each completed listening round adds one fruit to the basket.</p>
  </div>
}
function parseSurahRange(value, availableSurahs) {
  const match = value.trim().match(/^(\d{1,3})\s*:\s*(\d+)\s*-\s*(\d+)$/)
  if (!match) return { error: 'Gunakan format nomor surat:ayat-awal-akhir, misalnya 78:1-5.' }
  const [, surahId, startValue, endValue] = match
  const surah = availableSurahs.find((item) => item.id === surahId)
  const startAyah = Number(startValue)
  const endAyah = Number(endValue)
  if (!surah) return { error: 'That surah is not available in the Juz 30 list.' }
  if (startAyah < 1 || endAyah > surah.ayat || startAyah > endAyah) return { error: `Rentang ayat untuk QS. ${surah.name} harus antara 1–${surah.ayat}.` }
  return { surah, startAyah, endAyah }
}
function ParentSilhouette({ role }) {
  const isFather = role === 'Ayah'
  return <svg className={`role-silhouette ${isFather ? 'role-silhouette-father' : 'role-silhouette-mother'}`} viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="21" r="11" fill="currentColor" />
    {isFather ? <path d="M18 58c1.5-12 7.5-19 14-19s12.5 7 14 19H18Z" fill="currentColor" /> : <path fill="currentColor" fillRule="evenodd" d="M10 58 18 17C19.5 8.5 24.5 4 32 4s12.5 4.5 14 13l8 41-11-5H21l-11 5Zm22-44c-7.5 0-12 5.1-12 13s4.5 13 12 13 12-5.1 12-13-4.5-13-12-13Z" />}
  </svg>
}
function RolePicker({ value, onChange }) {
  const { t } = useLocale()
  const presets = ['Ayah', 'Bunda', 'Abi', 'Ummi', 'Papa', 'Mama']
  const isCustom = !presets.includes(value)
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2.5" role="group" aria-label={t('onboarding.greetingQuestion')}>
      {presets.map((role) => <button type="button" key={role} onClick={() => onChange(role)} aria-pressed={!isCustom && value === role} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow] active:scale-[0.96] ${!isCustom && value === role ? 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-md dark:bg-emerald-900/80 dark:text-emerald-100' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400'}`}>{role === 'Ayah' ? t('onboarding.roles.Ayah') : role === 'Bunda' ? t('onboarding.roles.Bunda') : role}</button>)}
      <button type="button" onClick={() => onChange(isCustom ? value : '')} aria-pressed={isCustom} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow] active:scale-[0.96] ${isCustom ? 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-md dark:bg-emerald-900/80 dark:text-emerald-100' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-200 dark:bg-stone-900/60 dark:text-stone-400'}`}>Custom...</button>
    </div>
    {isCustom && <input autoFocus type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Type your preferred title..." aria-label="Panggilan custom" className="input-field"/>}
  </div>
}
function IconPicker({ value, onChange }) { return <div className="mt-2 flex flex-wrap gap-2.5">{icons.map((icon) => <button type="button" key={icon} onClick={() => onChange(icon)} className={`icon-choice ${value === icon ? 'icon-choice-active' : ''}`}>{icon}</button>)}</div> }
function PageHeader({ title, eyebrow = 'Wali Tahfiz', back, action, className = '' }) {
  return <header className={`page-header ${className}`}>
    <div className="flex min-w-0 items-center gap-3">
      {back ? <button type="button" onClick={back} aria-label="Back" className="page-back-button"><ArrowLeft size={20}/></button> : <span className="brand-mark" aria-hidden="true"><img src="/icons/app-icon.svg" alt=""/></span>}
      <div className="min-w-0"><p className="page-eyebrow">{eyebrow}</p><h1 className="page-title">{title}</h1></div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
}

function LegacyOnboarding({ save }) {
  const [step, setStep] = useState(1); const [profile, setProfile] = useState(defaults)
  const set = (key, value) => setProfile((p) => ({ ...p, [key]: value }))
  const toggle = (id) => setProfile((p) => ({ ...p, memorized: p.memorized.includes(id) ? p.memorized.filter((item) => item !== id) : [...p.memorized, id] }))
  return <main className="min-h-screen bg-cream px-4 py-7 sm:py-12"><div className="mx-auto max-w-md"><header className="mb-7 flex gap-3"><span className="rounded-2xl bg-forest p-3 text-white"><Leaf size={22}/></span><div><p className="text-xs font-bold uppercase tracking-[.14em] text-forest/70">Wali Tahfiz</p><h1 className="font-display text-2xl text-forest">Start perjalanan hafalan</h1></div></header><section className="glass-card overflow-hidden"><div className="bg-forest px-6 py-5 text-white"><p className="text-sm font-semibold text-white/80">Langkah {step} dari 2</p><div className="mt-3 flex gap-2"><i className="h-1.5 flex-1 rounded-full bg-peach"/><i className={`h-1.5 flex-1 rounded-full ${step === 2 ? 'bg-peach' : 'bg-white/25'}`}/></div></div><div className="p-6">{step === 1 ? <><p className="step-label bg-peach text-terracotta"><UserRound size={13}/> SAPAAN KELUARGA</p><h2 className="font-display mt-3 text-2xl text-slate-700">Siapa yang menemani?</h2><p className="mt-1 text-sm text-slate-500">Pilihan ini akan dipakai untuk sapaan di aplikasi.</p><div className="mt-6"><RolePicker value={profile.role} onChange={(v) => set('role', v)}/></div><button onClick={() => setStep(2)} className="primary-button mt-7">Lanjutkan →</button></> : <><p className="step-label bg-sage text-forest"><Baby size={13}/> PROFIL ANAK</p><h2 className="font-display mt-3 text-2xl text-slate-700">Kenalan dengan si kecil</h2><div className="mt-6 space-y-4"><Field label="Nama anak"><input autoFocus value={profile.name} onChange={(e) => set('name', e.target.value)} placeholder="Contoh: Aisyah" className="input-field"/></Field><Field label="Usia anak"><input type="number" min="1" max="18" value={profile.age} onChange={(e) => set('age', e.target.value)} placeholder="Contoh: 5 tahun" className="input-field"/></Field><Field label="Pilih ikon anak"><IconPicker value={profile.icon} onChange={(v) => set('icon', v)}/></Field><Field label="Surat yang already dihafal" hint="Centang satu per satu. Juz 30 dimulai dari An-Nas."><div className="max-h-80 space-y-2 overflow-y-auto pr-1">{onboardingSurahs.map((surah) => <label key={surah.id} className={`memorized-choice cursor-pointer ${profile.memorized.includes(surah.id) ? 'memorized-choice-active' : ''}`}><input type="checkbox" checked={profile.memorized.includes(surah.id)} onChange={() => toggle(surah.id)} className="sr-only"/><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-current">{profile.memorized.includes(surah.id) && <Check size={15}/>}</span><span className="min-w-0 text-left"><b className="block">{surah.id === '1' ? 'Al-Fatihah' : `${surah.id}. ${surah.name}`}</b><small className="block opacity-70">{surah.ayat} ayat{surah.group === 'juz30' ? ' · Juz 30' : ''}</small></span></label>)}</div></Field></div><div className="mt-7 flex gap-3"><button onClick={() => setStep(1)} className="secondary-button !flex-none"><ArrowLeft size={18}/></button><button disabled={!profile.name.trim()} onClick={() => save(profile)} className="primary-button disabled:opacity-50">Start bersama {profile.role}</button></div></>}</div></section></div></main>
}

function LegacySettingsPage({ profile, save, back }) {
  const [draft, setDraft] = useState(profile); const set = (key, value) => setDraft((p) => ({ ...p, [key]: value })); const repeat = (key, value) => setDraft((p) => ({ ...p, repeats: { ...p.repeats, [key]: Math.max(1, Number(value) || 1) } }))
  return <main className="min-h-screen bg-cream pb-10"><div className="mx-auto max-w-lg px-4 pt-6"><header className="mb-6 flex items-center gap-3"><button onClick={back} aria-label="Back" className="icon-button"><ArrowLeft size={20}/></button><div><p className="text-xs font-bold uppercase tracking-[.14em] text-forest/70">Wali Tahfiz</p><h1 className="font-display text-3xl text-forest">Pengaturan</h1></div></header><section className="glass-card p-5"><h2 className="font-display text-xl text-slate-700">Profil keluarga</h2><p className="text-sm text-slate-500">Atur sapaan dan data anak.</p><div className="mt-5 space-y-5"><Field label="Sapaan wali"><RolePicker value={draft.role} onChange={(v) => set('role', v)}/></Field><Field label="Nama anak"><input value={draft.name} onChange={(e) => set('name', e.target.value)} className="input-field"/></Field><div className="grid grid-cols-2 gap-4"><Field label="Usia"><input type="number" min="1" max="18" value={draft.age} onChange={(e) => set('age', e.target.value)} className="input-field"/></Field><Field label="Ikon"><IconPicker value={draft.icon} onChange={(v) => set('icon', v)}/></Field></div></div></section><section className="glass-card mt-5 p-5"><p className="step-label bg-sage text-forest">NEW MEMORY REPETITION</p><h2 className="font-display mt-3 text-xl text-slate-700">Targets for each step</h2><p className="mt-1 text-sm text-slate-500">Atur berapa kali Ayah/Bunda ingin mengulang setiap aktivitas.</p><div className="mt-5 space-y-3">{[['talaqqi', 'Listen', 'Play the qari recitation together'], ['tikrar', 'Follow', 'Child repeats the guardian’s recitation'], ['rabt', 'Connect', 'Connect the start and end of the verse']].map(([key, title, helper]) => <div key={key} className="flex items-center justify-between rounded-2xl bg-[#f7faf4] p-4"><span><b className="block text-forest">{title}</b><small className="text-slate-500">{helper}</small></span><label className="flex items-center gap-2"><input aria-label={`Target ${title}`} type="number" min="1" value={draft.repeats[key]} onChange={(e) => repeat(key, e.target.value)} className="w-14 rounded-xl border border-sage bg-white py-2 text-center font-bold tabular-nums text-forest"/><b className="text-slate-500">x</b></label></div>)}</div></section><button disabled={!draft.name.trim()} onClick={() => { save(draft); back() }} className="primary-button mt-6 disabled:opacity-50"><Check size={19}/> Save settings</button></div></main>
}

function ChildEditor({ child, onChange, includeMemorized = false, autoFocus = false }) {
  const { t } = useLocale()
  const set = (key, value) => onChange({ ...child, [key]: value })
  const toggle = (id) => set('memorized', child.memorized.includes(id) ? child.memorized.filter((item) => item !== id) : [...child.memorized, id])
  return <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
      <Field label={t('onboardingStep2.nameLabel')}><input autoFocus={autoFocus} value={child.name} onChange={(event) => set('name', event.target.value)} placeholder={t('onboardingStep2.namePlaceholder')} className="input-field"/></Field>
      <Field label={t('onboardingStep2.ageLabel')}><input type="number" min="1" max="18" value={child.age} onChange={(event) => set('age', event.target.value)} placeholder={t('onboardingStep2.agePlaceholder')} className="input-field"/></Field>
    </div>
    <Field label={t('onboardingStep2.iconLabel')}><IconPicker value={child.icon} onChange={(value) => set('icon', value)}/></Field>
    {includeMemorized && <Field label={t('onboardingStep2.memorizedLabel')} hint={t('onboardingStep2.memorizedHint')}><div className="memorized-list">{onboardingSurahs.map((surah) => <label key={surah.id} className={`memorized-choice cursor-pointer ${child.memorized.includes(surah.id) ? 'memorized-choice-active' : ''}`}><input type="checkbox" checked={child.memorized.includes(surah.id)} onChange={() => toggle(surah.id)} className="sr-only"/><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-current">{child.memorized.includes(surah.id) && <Check size={15}/>}</span><span className="min-w-0 text-left"><b className="block">{surah.id === '1' ? 'Al-Fatihah' : `${surah.id}. ${surah.name}`}</b><small className="block">{t('onboardingStep2.surahInfo', { count: surah.ayat, juz: surah.group === 'juz30' ? t('onboardingStep2.juz30') : '' })}</small></span></label>)}</div></Field>}
  </div>
}

function ChildList({ children, activeChildId, onSelect, onEdit, onRemove }) {
  const { t } = useLocale()
  return <div className="space-y-2" aria-label={t('settings.children.listLabel')}>{children.map((child) => {
    const active = child.id === activeChildId
    return <article key={child.id} className="flex items-center gap-3 rounded-[22px] border border-stone-200 bg-white p-3 text-stone-800 shadow-sm transition-[transform,background-color,border-color,box-shadow] duration-200 dark:border-emerald-900/40 dark:bg-stone-900/80 dark:text-stone-100 dark:shadow-md">
      <button type="button" onClick={() => onSelect?.(child.id)} disabled={!onSelect} aria-current={active ? 'true' : undefined} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-xl shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:shadow-none">{child.icon}</span><span className="min-w-0 flex-1"><b className="block truncate text-forest dark:text-stone-100">{child.name || t('settings.children.nameMissing')}</b><small className="block text-slate-500 dark:text-stone-300">{child.age ? active ? t('settings.children.ageSelected', { age: child.age }) : t('settings.children.age', { age: child.age }) : t('settings.children.ageMissing')}</small></span></button>
      <div className="flex shrink-0 items-center gap-1">{onEdit && <button type="button" onClick={() => onEdit(child.id)} aria-label={t('onboardingStep2.editProfile', { name: child.name || t('onboardingStep2.childFallback') })} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xs font-bold text-forest transition-[transform,background-color] hover:bg-white active:scale-[0.96]">{t('onboardingStep2.edit')}</button>}{onRemove && <button type="button" onClick={() => onRemove(child.id)} aria-label={t('onboardingStep2.deleteProfile', { name: child.name || t('onboardingStep2.childFallback') })} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-terracotta transition-[transform,background-color] hover:bg-[#fffaf2] active:scale-[0.96]"><Trash2 size={18}/></button>}</div>
    </article>
  })}</div>
}

function OnboardingShell({ step, children, footer, locale, saveLocale, theme, setTheme }) {
  const { t } = useLocale()
  const progress = [1, 2]
  return <main className="app-page onboarding-page">
    <div className="page-shell page-shell-onboarding">
      <PageHeader title={t('onboarding.headerTitle')} action={<div className="flex items-center gap-2"><div className="flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900/80" role="group" aria-label={t('language.label')}>{SUPPORTED_LOCALES.map((option) => <button key={option.id} type="button" onClick={() => saveLocale?.(option.id)} aria-pressed={locale === option.id} className={`min-h-9 rounded-lg px-2.5 text-xs font-bold transition-[background-color,color] ${locale === option.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'}`}>{option.shortLabel}</button>)}</div><button type="button" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t('onboarding.switchToLight') : t('onboarding.switchToDark')} title={theme === 'dark' ? t('onboarding.switchToLight') : t('onboarding.switchToDark')} className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-emerald-700 transition-[transform,background-color,color] hover:bg-stone-100 hover:text-emerald-800 active:scale-[0.96] dark:border-stone-800 dark:bg-stone-900/80 dark:text-emerald-300 dark:hover:bg-stone-800 dark:hover:text-emerald-100">{theme === 'dark' ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}</button></div>}/>
      <section className="glass-card onboarding-card">
        <div className="onboarding-hero">
          <div className="onboarding-hero-copy">
            <span className="onboarding-hero-mark" aria-hidden="true"><img src="/icons/app-icon.svg" alt=""/></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-white/70">{t('onboarding.stepBadge')}</p>
              <p className="mt-1 text-sm font-semibold text-white">{t('onboarding.stepCount', { current: step, total: 2 })}</p>
            </div>
          </div>
          <ol className="onboarding-progress" aria-label={t('onboarding.progressLabel', { current: step, total: 2 })}>
            {progress.map((item) => <li key={item} className={item === step ? 'onboarding-progress-item-active' : ''} aria-current={item === step ? 'step' : undefined}><span>{item}</span><b className="sr-only">{t('onboarding.progressStep', { step: item, state: item === step ? t('onboarding.current') : item < step ? t('onboarding.complete') : '' })}</b></li>)}
          </ol>
        </div>
        <div className="onboarding-content">{children}</div>
        {footer && <footer className="onboarding-footer">{footer}</footer>}
      </section>
    </div>
  </main>
}

function Onboarding({ save, onImport, locale, saveLocale, theme, setTheme }) {
  const { t } = useLocale()
  const [step, setStep] = useState(1)
  const [family, setFamily] = useState({ role: 'Bunda', children: [], activeChildId: null })
  const [child, setChild] = useState(createChild)
  const [editingChildId, setEditingChildId] = useState(null)
  const [importStatus, setImportStatus] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef(null)
  const saveChild = () => {
    if (!child.name.trim()) return
    const nextChild = { ...child, name: child.name.trim() }
    setFamily((current) => {
      const children = editingChildId ? current.children.map((item) => item.id === editingChildId ? nextChild : item) : [...current.children, nextChild]
      return { ...current, children, activeChildId: current.activeChildId || nextChild.id }
    })
    setChild(createChild())
    setEditingChildId(null)
  }
  const editChild = (id) => {
    const selected = family.children.find((item) => item.id === id)
    if (!selected) return
    setChild({ ...selected, memorized: [...selected.memorized], repeats: { ...selected.repeats } })
    setEditingChildId(id)
  }
  const removeChild = (id) => setFamily((current) => {
    const children = current.children.filter((item) => item.id !== id)
    return { ...current, children, activeChildId: children.some((item) => item.id === current.activeChildId) ? current.activeChildId : children[0]?.id || null }
  })
  const finish = () => save({ id: 'family', role: family.role, children: family.children, activeChildId: family.children[0]?.id || null })
  const importBackup = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setIsImporting(true); setImportStatus('')
    try { await onImport(JSON.parse(await file.text())) }
    catch (error) { setImportStatus(error instanceof Error ? error.message : t('onboarding.importFailed')) }
    finally { setIsImporting(false) }
  }
  const guardianGreeting = t(`onboarding.roles.${family.role}`)
  if (step === 1) return <OnboardingShell step={step} locale={locale} saveLocale={saveLocale} theme={theme} setTheme={setTheme} footer={<button type="button" onClick={() => setStep(2)} className="primary-button">{t('common.continue')} <ArrowRight size={18} aria-hidden="true"/></button>}>
    <p className="step-label bg-emerald-950/60 text-emerald-300"><UserRound size={13}/> {t('onboarding.greetingBadge')}</p>
    <h2 className="onboarding-heading">{t('onboarding.greetingQuestion')}</h2>
    <p className="onboarding-description">{t('onboarding.greetingDesc')}</p>
    <div className="onboarding-choice-group"><RolePicker value={family.role} onChange={(role) => setFamily((current) => ({ ...current, role }))}/></div>
    <section className="onboarding-restore" aria-labelledby="restore-backup-title"><span className="onboarding-restore-icon" aria-hidden="true"><Upload size={17}/></span><div className="min-w-0 flex-1"><h3 id="restore-backup-title">{t('onboarding.hasBackup')}</h3><p>{t('onboarding.hasBackupDesc')}</p></div><button type="button" disabled={isImporting} onClick={() => importInputRef.current?.click()} className="onboarding-restore-button disabled:cursor-wait disabled:opacity-60">{isImporting ? t('onboarding.restoring') : t('common.import')}</button><input ref={importInputRef} onChange={importBackup} type="file" accept="application/json,.json" className="sr-only"/>{importStatus && <p role="status" className="onboarding-restore-status">{importStatus}</p>}</section>
  </OnboardingShell>

  return <OnboardingShell step={step} locale={locale} saveLocale={saveLocale} theme={theme} setTheme={setTheme} footer={<div className="onboarding-actions"><button type="button" onClick={() => setStep(1)} className="onboarding-back-button"><ArrowLeft size={18}/><span className="sr-only">{t('common.back')}</span></button><button type="button" disabled={!family.children.length} onClick={finish} className="onboarding-start-button disabled:cursor-not-allowed disabled:opacity-45">{t('onboardingStep2.startJourney', { role: guardianGreeting })}<ArrowRight size={18} aria-hidden="true"/></button></div>}>
    <p className="step-label bg-emerald-950/60 text-emerald-300"><Baby size={13}/> {t('onboardingStep2.badge')}</p>
    <h2 className="onboarding-heading">{t('onboardingStep2.title')}</h2>
    <p className="onboarding-description">{t('onboardingStep2.description')}</p>
    {family.children.length > 0 && <section className="onboarding-saved-children" aria-labelledby="saved-children-title"><p id="saved-children-title" className="onboarding-section-label">{t('onboardingStep2.savedChildren')}</p><ChildList children={family.children} activeChildId={family.activeChildId} onEdit={editChild} onRemove={removeChild}/></section>}
    <section className="onboarding-child-form" aria-labelledby="child-profile-title"><p id="child-profile-title" className="onboarding-form-title">{editingChildId ? t('onboardingStep2.editChild') : family.children.length ? t('onboardingStep2.addNextChild') : t('onboardingStep2.firstChildProfile')}</p><ChildEditor child={child} onChange={setChild} includeMemorized autoFocus={!editingChildId && family.children.length === 0}/><button type="button" disabled={!child.name.trim()} onClick={saveChild} className="onboarding-save-child-button disabled:cursor-not-allowed disabled:opacity-45"><Plus size={18}/>{editingChildId ? t('onboardingStep2.saveChanges') : t('onboardingStep2.saveAndAdd')}</button></section>
  </OnboardingShell>
}

function SettingsPage({ family, save, back }) {
  const [draft, setDraft] = useState(() => normalizeFamilyProfile(family))
  const [removedChildIds, setRemovedChildIds] = useState([])
  const [pendingDeletion, setPendingDeletion] = useState(null)
  const activeChild = draft.children.find((child) => child.id === draft.activeChildId) || null
  const updateChild = (nextChild) => setDraft((current) => ({ ...current, children: current.children.map((child) => child.id === nextChild.id ? nextChild : child) }))
  const addChild = () => {
    const child = createChild()
    setDraft((current) => ({ ...current, children: [...current.children, child], activeChildId: child.id }))
  }
  const confirmDelete = () => {
    if (!pendingDeletion) return
    setDraft((current) => {
      const children = current.children.filter((child) => child.id !== pendingDeletion.id)
      return { ...current, children, activeChildId: children.some((child) => child.id === current.activeChildId) ? current.activeChildId : children[0]?.id || null }
    })
    setRemovedChildIds((ids) => [...ids, pendingDeletion.id])
    setPendingDeletion(null)
  }
  const canSave = !draft.children.length || draft.children.every((child) => child.name.trim())
  const submit = async () => { if (!canSave) return; await save(draft, removedChildIds); back() }
  return <main className="app-page pb-32"><div className="page-shell page-shell-settings">
    <PageHeader title="Pengaturan" back={back}/>
    <section className="settings-overview"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-white/65">Keluarga Anda</p><h2 className="font-display mt-1 text-2xl text-white">{draft.role} menemani <span className="text-peach">{draft.children.length}</span> anak</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">Atur profil dan ritme belajar setiap anak dari satu tempat.</p></div><span className="settings-overview-icon" aria-hidden="true"><Settings size={25}/></span></section>
    <section className="settings-section glass-card"><div className="settings-section-heading"><div><p className="step-label bg-[#eff6eb] text-forest"><UserRound size={13}/> PROFIL KELUARGA</p><h2 className="font-display mt-3 text-xl text-slate-700">Sapaan wali</h2><p>Digunakan di seluruh perjalanan hafalan keluarga.</p></div></div><div className="mt-5"><RolePicker value={draft.role} onChange={(role) => setDraft((current) => ({ ...current, role }))}/></div></section>
    <section className="settings-section glass-card"><div className="flex items-start justify-between gap-4"><div className="settings-section-heading"><p className="step-label bg-peach text-terracotta"><Baby size={13}/> ANAK YANG DITEMANI</p><h2 className="font-display mt-3 text-xl text-slate-700">Profiles & memorisation</h2><p>Choose a profile to view or update its details.</p></div><button type="button" onClick={addChild} className="settings-add-button"><Plus size={17}/><span>Add</span></button></div>{draft.children.length ? <><div className="mt-5"><ChildList children={draft.children} activeChildId={draft.activeChildId} onSelect={(id) => setDraft((current) => ({ ...current, activeChildId: id }))} onRemove={(id) => setPendingDeletion(draft.children.find((child) => child.id === id) || null)}/></div>{activeChild && <div className="settings-editor"><div className="settings-editor-title"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-peach text-xl">{activeChild.icon}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-terracotta">EDITING</p><h3 className="font-display text-lg text-forest">{activeChild.name || 'New child profile'}</h3></div></div><ChildEditor child={activeChild} onChange={updateChild} autoFocus={!activeChild.name}/></div>}</> : <p className="mt-5 rounded-[22px] bg-[#fffaf2] p-4 text-sm leading-relaxed text-terracotta">No child profile yet. Add the first profile, then save settings.</p>}</section>
    {activeChild && <section className="settings-section glass-card"><div className="settings-section-heading"><p className="step-label bg-sage text-forest">NEW MEMORY REPETITION</p><h2 className="font-display mt-3 text-xl text-slate-700">Targets for each step</h2><p>Applies only to <b className="font-semibold text-forest">{activeChild.name || 'selected child'}</b>.</p></div><div className="mt-5 space-y-2">{[['talaqqi', 'Listen', 'Play the qari recitation together'], ['tikrar', 'Follow', 'Child repeats the guardian’s recitation'], ['rabt', 'Connect', 'Connect the start and end of the verse']].map(([key, title, helper], index) => <div key={key} className="settings-repeat-row"><span className="settings-repeat-index">0{index + 1}</span><span className="min-w-0 flex-1"><b className="block text-forest">{title}</b><small>{helper}</small></span><label className="flex shrink-0 items-center gap-2"><span className="sr-only">Target {title}</span><input aria-label={`Target ${title}`} type="number" min="1" value={activeChild.repeats[key]} onChange={(event) => updateChild({ ...activeChild, repeats: { ...activeChild.repeats, [key]: Math.max(1, Number(event.target.value) || 1) } })} className="settings-repeat-input"/><b className="text-slate-400">×</b></label></div>)}</div></section>}
    <div className="settings-save-bar"><button type="button" disabled={!canSave} onClick={submit} className="primary-button disabled:cursor-not-allowed disabled:opacity-50"><Check size={19}/>{draft.children.length ? 'Save settings' : 'Delete profile & restart'}</button></div>
  </div>{pendingDeletion && <div className="sheet-backdrop" role="presentation"><section className="sheet sm:max-w-md" role="dialog" aria-modal="true" aria-labelledby="delete-child-title"><p className="step-label bg-peach text-terracotta">DELETE CONFIRMATION</p><h2 id="delete-child-title" className="font-display mt-3 text-2xl text-forest">Delete {pendingDeletion.name || 'child profile'}?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Today’s targets and saved memorisation for {pendingDeletion.name || 'this child'} will also be deleted when settings are saved. This action cannot be undone.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setPendingDeletion(null)} className="secondary-button">Cancel</button><button type="button" onClick={confirmDelete} className="primary-button !bg-terracotta">Delete child</button></div></section></div>}</main>
}

function ChildSwitcher({ family, onSelect, onManage }) {
  const [open, setOpen] = useState(false)
  const activeChild = family.children.find((child) => child.id === family.activeChildId)
  if (!activeChild) return null
  return <div className="child-switcher relative"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox" className="child-switcher-trigger"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-base text-forest">{activeChild.icon}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-white/65">Anak aktif</span><span className="block max-w-28 truncate text-sm font-bold">{activeChild.name}</span></span><ChevronDown size={17} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}/></button>{open && <section className="absolute right-0 z-30 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-[24px] bg-white p-2 text-slate-700 shadow-[0_18px_42px_rgba(30,55,40,.28)]" role="listbox" aria-label="Pilih anak yang ditemani">{family.children.map((child) => <button type="button" key={child.id} role="option" aria-selected={child.id === activeChild.id} onClick={() => { onSelect(child.id); setOpen(false) }} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left transition-[transform,background-color] active:scale-[0.96] ${child.id === activeChild.id ? 'bg-[#eff6eb] text-forest' : 'hover:bg-[#f7faf4]'}`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-sm">{child.icon}</span><span className="min-w-0 flex-1"><b className="block truncate">{child.name}</b><small className="block text-slate-500">{child.age ? `${child.age} tahun` : 'Usia belum diisi'}</small></span>{child.id === activeChild.id && <Check size={17} className="text-forest"/>}</button>)}<div className="mt-1 border-t border-sage/70 pt-1"><button type="button" onClick={() => { setOpen(false); onManage() }} className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-bold text-terracotta transition-[transform,background-color] hover:bg-[#fffaf2] active:scale-[0.96]"><Settings size={16}/> Kelola anak</button></div></section>}</div>
}

function AudioQuranPage({ back }) {
  const audioRef = useRef(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [activeAyah, setActiveAyah] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const selected = audioSurahs.find((surah) => surah.id === selectedId)
  const normalizedQuery = query.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
  const filteredSurahs = audioSurahs.filter((surah) => {
    const searchable = `${surah.id} ${surah.name} ${surah.arabic}`.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
    return (filter === 'all' || surah.group === filter) && searchable.includes(normalizedQuery)
  })
  const audioUrl = selected && activeAyah ? `https://verses.quran.foundation/Alafasy/mp3/${selected.id.padStart(3, '0')}${String(activeAyah).padStart(3, '0')}.mp3` : null

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return
    audioRef.current.load()
    audioRef.current.play().catch(() => setIsPlaying(false))
  }, [audioUrl])

  const chooseSurah = (surah) => {
    audioRef.current?.pause()
    setIsPlaying(false)
    setActiveAyah(null)
    setSelectedId(surah.id)
  }
  const playAyah = (ayah) => {
    if (activeAyah === ayah && audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play().catch(() => setIsPlaying(false))
      return
    }
    setActiveAyah(ayah)
  }
  const moveAyah = (direction) => {
    if (!selected) return
    setActiveAyah((current) => Math.min(selected.ayat, Math.max(1, (current || (direction > 0 ? 0 : 2)) + direction)))
  }
  const handleEnded = () => {
    if (!selected || !activeAyah) return
    if (activeAyah < selected.ayat) setActiveAyah(activeAyah + 1)
    else setIsPlaying(false)
  }
  const togglePlayback = () => {
    if (!selected) return
    if (!activeAyah) setActiveAyah(1)
    else playAyah(activeAyah)
  }

  return <main className="min-h-screen bg-cream pb-10"><audio ref={audioRef} src={audioUrl || undefined} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={handleEnded}/><div className="mx-auto max-w-lg px-4 pt-6"><header className="mb-6 flex items-center gap-3"><button onClick={back} aria-label="Back to home" className="icon-button"><ArrowLeft size={20}/></button><div><p className="text-xs font-bold uppercase tracking-[.14em] text-forest/70">Wali Tahfiz</p><h1 className="font-display text-3xl text-forest">Audio Qur’an</h1></div></header><section className="glass-card overflow-hidden"><div className="bg-forest px-5 py-5 text-white"><p className="step-label bg-white/15 text-white"><Headphones size={14}/> TEMANI DENGAR AYAT</p><h2 className="font-display mt-3 text-2xl">Al-Fatihah & Juz 30</h2><p className="mt-1 text-sm leading-relaxed text-white/75">Choose a surah, lalu dengarkan ayatnya satu per satu bersama si kecil.</p></div><div className="p-5"><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-forest" size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by surah name or number" className="input-field pl-11" aria-label="Search surah"/></label><div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter surat">{[['all', 'Semua'], ['fatihah', 'Al-Fatihah'], ['juz30', 'Juz 30']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold transition-[transform,background-color,color] active:scale-[0.96] ${filter === value ? 'bg-forest text-white shadow-sm' : 'bg-[#f7faf4] text-forest'}`}>{label}</button>)}</div><p className="mt-4 text-sm font-semibold text-slate-500"><span className="tabular-nums">{filteredSurahs.length}</span> surat tersedia</p><div className="mt-3 space-y-2">{filteredSurahs.length ? filteredSurahs.map((surah) => <button key={surah.id} onClick={() => chooseSurah(surah)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-[transform,background-color,box-shadow] active:scale-[0.96] ${selectedId === surah.id ? 'bg-[#eff6eb] shadow-sm' : 'bg-[#f7faf4]'}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white font-bold tabular-nums text-terracotta">{surah.id}</span><span className="min-w-0 flex-1"><b className="block text-forest">{surah.name}</b><small className="block text-slate-500">{surah.ayat} ayat · {surah.group === 'fatihah' ? 'Al-Fatihah' : 'Juz 30'}</small></span><span className="font-serif text-xl text-terracotta" dir="rtl">{surah.arabic}</span></button>) : <div className="rounded-2xl bg-[#f7faf4] px-5 py-8 text-center"><p className="font-display text-xl text-forest">Surat belum ditemukan</p><p className="mt-1 text-sm text-slate-500">Coba nama atau nomor surat yang lain.</p></div>}</div></div></section>{selected && <section className="glass-card mt-5 overflow-hidden"><div className="flex items-center justify-between bg-[#eff6eb] px-5 py-4"><span><p className="font-display text-xl text-forest">QS. {selected.name}</p><small className="text-slate-500">Pilih ayat untuk mulai mendengar</small></span><span className="font-serif text-2xl text-terracotta" dir="rtl">{selected.arabic}</span></div><div className="grid grid-cols-5 gap-2 p-4 sm:grid-cols-6">{Array.from({ length: selected.ayat }, (_, index) => index + 1).map((ayah) => <button key={ayah} onClick={() => playAyah(ayah)} aria-label={`Play ayat ${ayah}`} aria-pressed={activeAyah === ayah} className={`flex min-h-11 items-center justify-center rounded-xl text-sm font-bold tabular-nums transition-[transform,background-color,color] active:scale-[0.96] ${activeAyah === ayah ? 'bg-terracotta text-white shadow-sm' : 'bg-[#f7faf4] text-forest'}`}>{ayah}</button>)}</div>{activeAyah && <div className="border-t border-sage/70 bg-white px-4 py-4"><p className="mb-3 text-center text-sm font-bold text-forest">Sedang memutar · Verse <span className="tabular-nums">{activeAyah}</span> dari <span className="tabular-nums">{selected.ayat}</span></p><div className="flex items-center justify-center gap-2"><button onClick={() => moveAyah(-1)} disabled={activeAyah === 1} aria-label="Verse sebelumnya" className="audio-control disabled:cursor-not-allowed disabled:opacity-35"><SkipBack size={19}/></button><button onClick={togglePlayback} aria-label={isPlaying ? 'Pause audio' : 'Play audio'} className="flex h-14 w-14 items-center justify-center rounded-full bg-forest text-white shadow-lg shadow-forest/20 transition-transform active:scale-[0.96]">{isPlaying ? <Pause size={23} fill="currentColor"/> : <Play className="ml-0.5" size={23} fill="currentColor"/>}</button><button onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => setIsPlaying(false)) } }} aria-label="Repeat ayat" className="audio-control"><RotateCcw size={19}/></button><button onClick={() => moveAyah(1)} disabled={activeAyah === selected.ayat} aria-label="Verse berikutnya" className="audio-control disabled:cursor-not-allowed disabled:opacity-35"><SkipForward size={19}/></button></div></div>}</section>}</div></main>
}

function QuranCardsPage({ back }) {
  const audioRef = useRef(null)
  const repeatProgressRef = useRef(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('juz30')
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('78')
  const [verses, setVerses] = useState([])
  const [activeAyah, setActiveAyah] = useState(null)
  const [pendingAyah, setPendingAyah] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [repeatCount, setRepeatCount] = useState(1)
  const [repeatProgress, setRepeatProgress] = useState(0)
  const selected = surahFor(selectedId)
  const normalizedQuery = query.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
  const filteredSurahs = audioSurahs.filter((surah) => {
    const searchable = `${surah.id} ${surah.name} ${surah.arabic}`.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
    return (filter === 'all' || surah.group === filter) && searchable.includes(normalizedQuery)
  })
  const audioUrl = selected && activeAyah ? `https://verses.quran.foundation/Alafasy/mp3/${selected.id.padStart(3, '0')}${String(activeAyah).padStart(3, '0')}.mp3` : undefined

  useEffect(() => {
    let active = true
    getQuranRepeat().then((preference) => {
      if (active && [1, 2, 3, 5].includes(preference?.value)) setRepeatCount(preference.value)
    })
    return () => { active = false }
  }, [])

  const changeRepeatCount = (count) => {
    repeatProgressRef.current = 0
    setRepeatProgress(0)
    setRepeatCount(count)
    saveQuranRepeat(count)
  }

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setError('')
    setVerses([])
    setActiveAyah(null)
    repeatProgressRef.current = 0
    setRepeatProgress(0)
    audioRef.current?.pause()
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${selectedId}/quran-uthmani`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Teks Arab could not dimuat.'); return response.json() }),
      fetch(`https://api.alquran.cloud/v1/surah/${selectedId}/id.indonesian`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Terjemahan Indonesia could not dimuat.'); return response.json() }),
    ]).then(([arabicResponse, translationResponse]) => {
      if (controller.signal.aborted) return
      const arabicAyahs = arabicResponse?.data?.ayahs || []
      const translationAyahs = translationResponse?.data?.ayahs || []
      if (!arabicAyahs.length) throw new Error('Verse tidak ditemukan.')
      setVerses(arabicAyahs.map((ayah, index) => ({ number: ayah.numberInSurah, arabic: ayah.text, translation: translationAyahs.find((item) => item.numberInSurah === ayah.numberInSurah)?.text || translationAyahs[index]?.text || 'Terjemahan belum tersedia.' })))
      if (pendingAyah) {
        setActiveAyah(pendingAyah)
        setPendingAyah(null)
      }
    }).catch((reason) => {
      if (!controller.signal.aborted) setError(reason.message || 'Koneksi internet tidak stabil. Coba lagi.')
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [selectedId])

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return
    audioRef.current.load()
    audioRef.current.play().catch(() => setIsPlaying(false))
  }, [audioUrl])

  useEffect(() => {
    if (!activeAyah) return
    const timer = window.setTimeout(() => document.getElementById(`quran-ayah-${selectedId}-${activeAyah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
    return () => window.clearTimeout(timer)
  }, [activeAyah, selectedId])

  const selectSurah = (surah) => {
    setCatalogOpen(false)
    setPendingAyah(null)
    setSelectedId(surah.id)
  }
  const playFromAyah = (ayah) => {
    repeatProgressRef.current = 0
    setRepeatProgress(0)
    if (activeAyah === ayah && audioRef.current) {
      if (isPlaying) audioRef.current.pause()
      else audioRef.current.play().catch(() => setIsPlaying(false))
    } else setActiveAyah(ayah)
  }
  const moveAyah = (direction) => {
    if (!selected || !activeAyah) return
    const next = activeAyah + direction
    if (next >= 1 && next <= selected.ayat) playFromAyah(next)
  }
  const handleEnded = () => {
    if (!selected || !activeAyah) return
    const nextRepeat = repeatProgressRef.current + 1
    if (nextRepeat < repeatCount) {
      repeatProgressRef.current = nextRepeat
      setRepeatProgress(nextRepeat)
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => setIsPlaying(false))
      return
    }
    repeatProgressRef.current = 0
    setRepeatProgress(0)
    if (activeAyah < selected.ayat) {
      setActiveAyah(activeAyah + 1)
      return
    }
    const currentIndex = audioSurahs.findIndex((surah) => surah.id === selected.id)
    const nextSurah = selected.group === 'juz30' ? audioSurahs.slice(currentIndex + 1).find((surah) => surah.group === 'juz30') : null
    if (nextSurah) {
      setPendingAyah(1)
      setSelectedId(nextSurah.id)
    } else setIsPlaying(false)
  }
  const togglePlayback = () => {
    if (!activeAyah) return playFromAyah(1)
    if (isPlaying) audioRef.current?.pause()
    else audioRef.current?.play().catch(() => setIsPlaying(false))
  }

  return <main className="min-h-screen bg-cream pb-12"><audio ref={audioRef} src={audioUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={handleEnded} onError={() => setError('Audio ayat ini not available yet diputar. Coba lagi beberapa saat.')}/><div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6"><header className="mb-5 flex items-center gap-3"><button type="button" onClick={back} aria-label="Back to home" className="icon-button"><ArrowLeft size={20}/></button><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.14em] text-forest/70">Wali Tahfiz</p><h1 className="font-display text-3xl text-forest">Dengar Qur’an</h1></div><button type="button" onClick={() => setCatalogOpen((open) => !open)} className="flex min-h-11 items-center gap-2 rounded-2xl bg-forest px-4 text-sm font-bold text-white transition-transform active:scale-[0.96]"><Search size={17}/>{catalogOpen ? 'Close' : 'Search surah'}</button></header><section className="glass-card overflow-hidden"><div className="bg-forest px-5 py-5 text-white sm:px-6"><p className="step-label bg-white/15 text-white"><Headphones size={14}/> MUROTTAL BERSAMBUNG</p><h2 className="font-display mt-3 text-2xl">{selected?.name || 'Juz 30'}</h2><p className="mt-1 text-sm leading-relaxed text-white/75">Ketuk satu kartu ayat. Bacaan akan lanjut sampai akhir Juz 30.</p></div>{catalogOpen && <div className="border-b border-sage/70 bg-[#fbfdf8] p-5"><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-forest" size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by surah name or number" className="input-field pl-11" aria-label="Search surah"/></label><div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter surat">{[['all', 'Semua'], ['fatihah', 'Al-Fatihah'], ['juz30', 'Juz 30']].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold transition-[transform,background-color,color] active:scale-[0.96] ${filter === value ? 'bg-forest text-white shadow-sm' : 'bg-white text-forest shadow-sm'}`}>{label}</button>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2">{filteredSurahs.length ? filteredSurahs.map((surah) => <button type="button" key={surah.id} onClick={() => selectSurah(surah)} className={`flex min-h-12 items-center gap-3 rounded-2xl p-3 text-left transition-[transform,background-color,box-shadow] active:scale-[0.96] ${selectedId === surah.id ? 'bg-[#eff6eb] shadow-sm' : 'bg-white shadow-sm'}`}><span className="font-bold tabular-nums text-terracotta">{surah.id}</span><span className="min-w-0 flex-1"><b className="block text-forest">{surah.name}</b><small className="text-slate-500">{surah.ayat} ayat</small></span><span className="font-serif text-lg text-terracotta" dir="rtl">{surah.arabic}</span></button>) : <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500">Surah not found yet.</p>}</div></div>}<div className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#eff6eb] px-4 py-3"><span><b className="block text-forest">Ulang tiap ayat</b><small className="text-slate-500">Atur ritme dengar bersama</small></span><div className="flex gap-1.5">{[1, 2, 3, 5].map((count) => <button type="button" key={count} onClick={() => changeRepeatCount(count)} aria-pressed={repeatCount === count} className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-bold tabular-nums transition-[transform,background-color,color] active:scale-[0.96] ${repeatCount === count ? 'bg-forest text-white shadow-sm' : 'bg-white text-forest'}`}>{count}×</button>)}</div></div>{error && <div className="mt-4 rounded-2xl bg-[#fff2df] p-4 text-sm text-terracotta" role="alert">{error}</div>}{isLoading ? <div className="flex min-h-72 items-center justify-center rounded-[26px] bg-[#f7faf4] text-center"><p className="text-sm font-semibold text-slate-500">Loading ayat dan terjemahan…</p></div> : <div className="mt-4 space-y-3" aria-live="polite">{verses.map((ayah) => <button type="button" id={`quran-ayah-${selectedId}-${ayah.number}`} key={ayah.number} onClick={() => playFromAyah(ayah.number)} aria-pressed={activeAyah === ayah.number} className={`ayah-card w-full text-left ${activeAyah === ayah.number ? 'ayah-card-active' : ''}`}><div className="flex items-start justify-between gap-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${activeAyah === ayah.number ? 'bg-white/20 text-white' : 'bg-peach text-terracotta'}`}>{ayah.number}</span><p className="mb-4 font-serif text-right text-[27px] leading-[2.1] text-forest sm:text-3xl" dir="rtl">{ayah.arabic}</p></div><div className="text-stone-300 dark:text-stone-300 text-sm leading-relaxed md:text-base">{ayah.translation}</div></button>)}</div>}</div></section>{activeAyah && <section className="sticky bottom-4 z-20 mt-4 rounded-[26px] bg-forest p-4 text-white shadow-[0_18px_40px_rgba(71,119,92,.28)]"><div className="flex items-center justify-between gap-3"><p className="min-w-0 text-sm font-bold">{selected?.name} · Verse <span className="tabular-nums">{activeAyah}</span>{repeatCount > 1 && <span className="font-normal text-white/70"> · ulang <span className="tabular-nums">{repeatProgress + 1}/{repeatCount}</span></span>}</p><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => moveAyah(-1)} disabled={activeAyah === 1} aria-label="Verse sebelumnya" className="audio-control bg-white/15 text-white disabled:cursor-not-allowed disabled:opacity-35"><SkipBack size={18}/></button><button type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause audio' : 'Play audio'} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-forest transition-transform active:scale-[0.96]">{isPlaying ? <Pause size={21} fill="currentColor"/> : <Play className="ml-0.5" size={21} fill="currentColor"/>}</button><button type="button" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => setIsPlaying(false)) } }} aria-label="Repeat ayat" className="audio-control bg-white/15 text-white"><RotateCcw size={18}/></button><button type="button" onClick={() => moveAyah(1)} disabled={activeAyah === selected?.ayat} aria-label="Verse berikutnya" className="audio-control bg-white/15 text-white disabled:cursor-not-allowed disabled:opacity-35"><SkipForward size={18}/></button></div></div></section>}</div></main>
}

function QuranRangePage({ back }) {
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
  const selected = surahFor(selectedId)
  const normalizedQuery = query.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
  const filteredSurahs = audioSurahs.filter((surah) => {
    const searchable = `${surah.id} ${surah.name} ${surah.arabic}`.toLocaleLowerCase('id-ID').replace(/[^a-z0-9\u0600-\u06ff]/g, '')
    return (filter === 'all' || surah.group === filter) && searchable.includes(normalizedQuery)
  })
  const rangeLastAyah = rangeEnabled ? rangeEnd : selected?.ayat
  const audioUrl = isBismillah ? 'https://verses.quran.foundation/Alafasy/mp3/001001.mp3' : selected && activeAyah ? `https://verses.quran.foundation/Alafasy/mp3/${selected.id.padStart(3, '0')}${String(activeAyah).padStart(3, '0')}.mp3` : undefined

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
      fetch(`https://api.alquran.cloud/v1/surah/${selectedId}/quran-uthmani`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Teks Arab could not dimuat.'); return response.json() }),
      fetch(`https://api.alquran.cloud/v1/surah/${selectedId}/id.indonesian`, { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error('Terjemahan Indonesia could not dimuat.'); return response.json() }),
    ]).then(([arabicResponse, translationResponse]) => {
      if (controller.signal.aborted) return
      const arabicAyahs = arabicResponse?.data?.ayahs || []
      const translationAyahs = translationResponse?.data?.ayahs || []
      if (!arabicAyahs.length) throw new Error('Verse tidak ditemukan.')
      setVerses(arabicAyahs.map((ayah, index) => ({ number: ayah.numberInSurah, arabic: stripBismillah(ayah.text, selectedId, ayah.numberInSurah), translation: translationAyahs.find((item) => item.numberInSurah === ayah.numberInSurah)?.text || translationAyahs[index]?.text || 'Terjemahan belum tersedia.' })))
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

  return <main className="min-h-screen bg-cream pb-12"><audio ref={audioRef} src={audioUrl} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={handleEnded} onError={() => setError('Audio ayat ini not available yet diputar. Coba lagi beberapa saat.')}/><div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6"><header className="mb-5 flex items-center gap-3"><button type="button" onClick={back} aria-label="Back to home" className="icon-button"><ArrowLeft size={20}/></button><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.14em] text-forest/70">Wali Tahfiz</p><h1 className="font-display text-3xl text-forest">Dengar Qur’an</h1></div><button type="button" onClick={() => setCatalogOpen((open) => !open)} className="flex min-h-11 items-center gap-2 rounded-2xl bg-forest px-4 text-sm font-bold text-white transition-transform active:scale-[0.96]"><Search size={17}/>{catalogOpen ? 'Close' : 'Search surah'}</button></header><section className="glass-card overflow-hidden"><div className="bg-forest px-5 py-5 text-white sm:px-6"><p className="step-label bg-white/15 text-white"><Headphones size={14}/> MUROTTAL BERSAMBUNG</p><h2 className="font-display mt-3 text-2xl">{selected?.name || 'Juz 30'}</h2><p className="mt-1 text-sm leading-relaxed text-white/75">Listen per ayat, atau atur rentang pendek untuk menguatkan hafalan.</p></div>{catalogOpen && <div className="border-b border-sage/70 bg-[#fbfdf8] p-5"><label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-forest" size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by surah name or number" className="input-field pl-11" aria-label="Search surah"/></label><div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter surat">{[['all', 'Semua'], ['fatihah', 'Al-Fatihah'], ['juz30', 'Juz 30']].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold transition-[transform,background-color,color] active:scale-[0.96] ${filter === value ? 'bg-forest text-white shadow-sm' : 'bg-white text-forest shadow-sm'}`}>{label}</button>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2">{filteredSurahs.map((surah) => <button type="button" key={surah.id} onClick={() => selectSurah(surah)} className={`flex min-h-12 items-center gap-3 rounded-2xl p-3 text-left transition-[transform,background-color,box-shadow] active:scale-[0.96] ${selectedId === surah.id ? 'bg-[#eff6eb] shadow-sm' : 'bg-white shadow-sm'}`}><span className="font-bold tabular-nums text-terracotta">{surah.id}</span><span className="min-w-0 flex-1"><b className="block text-forest">{surah.name}</b><small className="text-slate-500">{surah.ayat} ayat</small></span><span className="font-serif text-lg text-terracotta" dir="rtl">{surah.arabic}</span></button>)}</div></div>}<div className="p-4 sm:p-5"><button type="button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen} className="range-settings-toggle"><span><SlidersHorizontal size={18}/><b>Pengaturan putar</b></span><small>{rangeEnabled ? `Rentang ayat ${rangeStart}–${rangeEnd}` : `Ulang ayat ${ayahRepeatCount}×`}</small></button>{settingsOpen && <div className="range-settings-panel"><div className="flex items-center justify-between gap-3"><span><b className="block text-forest">Ulang tiap ayat</b><small className="text-slate-500">Setiap ayat diulang sebelum lanjut</small></span><div className="flex gap-1.5">{[1, 2, 3, 5].map((count) => <button type="button" key={count} onClick={() => { resetProgress(); setAyahRepeatCount(count); saveQuranRepeat(count) }} aria-pressed={ayahRepeatCount === count} className={`range-choice ${ayahRepeatCount === count ? 'range-choice-active' : ''}`}>{count}×</button>)}</div></div><div className="mt-4 border-t border-sage/70 pt-4"><div className="flex items-center justify-between gap-3"><span><b className="block text-forest">Play rentang ayat</b><small className="text-slate-500">Fokus pada bagian hafalan tertentu</small></span><button type="button" onClick={() => setRangeEnabled((value) => !value)} aria-pressed={rangeEnabled} className={`range-switch ${rangeEnabled ? 'range-switch-active' : ''}`}>{rangeEnabled ? 'Aktif' : 'Nonaktif'}</button></div>{rangeEnabled && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field label="Dari ayat"><input type="number" min="1" max={selected?.ayat} value={rangeStart} onChange={(event) => setBound('start', event.target.value)} className="range-input"/></Field><Field label="End verse"><input type="number" min={rangeStart} max={selected?.ayat} value={rangeEnd} onChange={(event) => setBound('end', event.target.value)} className="range-input"/></Field><Field label="Ulang rentang"><div className="flex h-[52px] gap-1">{[1, 2, 3, 5].map((count) => <button type="button" key={count} onClick={() => { resetProgress(); setRangeRepeatCount(count) }} aria-pressed={rangeRepeatCount === count} className={`range-choice flex-1 ${rangeRepeatCount === count ? 'range-choice-active' : ''}`}>{count}×</button>)}</div></Field></div>}<button type="button" onClick={startRange} className="primary-button mt-4"><Play size={19} fill="currentColor"/>{rangeEnabled ? `Start verse ${rangeStart}–${rangeEnd}` : 'Start dari ayat pertama'}</button></div></div>}{error && <div className="mt-4 rounded-2xl bg-[#fff2df] p-4 text-sm text-terracotta" role="alert">{error}</div>}{isLoading ? <div className="mt-4 flex min-h-72 items-center justify-center rounded-[26px] bg-[#f7faf4] text-center"><p className="text-sm font-semibold text-slate-500">Loading ayat dan terjemahan…</p></div> : <div className="mt-4 space-y-3" aria-live="polite">{selectedId !== '1' && <button type="button" onClick={playBismillah} aria-pressed={isBismillah} className={`bismillah-card ${isBismillah ? 'bismillah-card-active' : ''}`}><span className="step-label bg-peach text-terracotta"><Volume2 size={13}/> PEMBUKA</span><p className="mt-3 font-serif text-2xl leading-loose text-forest" dir="rtl">{bismillahText}</p><small>Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang</small></button>}{verses.map((ayah) => <button type="button" id={`quran-ayah-${selectedId}-${ayah.number}`} key={ayah.number} onClick={() => playFromAyah(ayah.number)} disabled={!inRange(ayah.number)} aria-pressed={activeAyah === ayah.number && !isBismillah} className={`ayah-card w-full text-left ${activeAyah === ayah.number && !isBismillah ? 'ayah-card-active' : ''} ${rangeEnabled && inRange(ayah.number) ? 'ayah-card-in-range' : ''}`}><div className="flex items-start justify-between gap-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${activeAyah === ayah.number && !isBismillah ? 'bg-white/20 text-white' : 'bg-peach text-terracotta'}`}>{ayah.number}</span><p className="mb-4 font-serif text-right text-[27px] leading-[2.1] text-forest sm:text-3xl" dir="rtl">{ayah.arabic}</p></div><div className="text-stone-300 dark:text-stone-300 text-sm leading-relaxed md:text-base">{ayah.translation}</div></button>)}</div>}</div></section>{(activeAyah || isBismillah) && <section className="sticky bottom-4 z-20 mt-4 rounded-[26px] bg-forest p-4 text-white shadow-[0_18px_40px_rgba(71,119,92,.28)]"><div className="flex items-center justify-between gap-3"><p className="min-w-0 text-sm font-bold">{isBismillah ? 'Bismillah' : `${selected?.name} · Verse ${activeAyah}`}{!isBismillah && ayahRepeatCount > 1 && <span className="font-normal text-white/70"> · ulang <span className="tabular-nums">{ayahRepeatProgress + 1}/{ayahRepeatCount}</span></span>}{rangeEnabled && <span className="font-normal text-white/70"> · rentang <span className="tabular-nums">{rangeRepeatProgress + 1}/{rangeRepeatCount}</span></span>}</p><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => moveAyah(-1)} disabled={!activeAyah || activeAyah === 1 || isBismillah} aria-label="Verse sebelumnya" className="audio-control bg-white/15 text-white disabled:cursor-not-allowed disabled:opacity-35"><SkipBack size={18}/></button><button type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause audio' : 'Play audio'} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-forest transition-transform active:scale-[0.96]">{isPlaying ? <Pause size={21} fill="currentColor"/> : <Play className="ml-0.5" size={21} fill="currentColor"/>}</button><button type="button" onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => setIsPlaying(false)) } }} aria-label="Repeat audio aktif" className="audio-control bg-white/15 text-white"><RotateCcw size={18}/></button><button type="button" onClick={() => moveAyah(1)} disabled={!activeAyah || activeAyah === selected?.ayat || isBismillah} aria-label="Verse berikutnya" className="audio-control bg-white/15 text-white disabled:cursor-not-allowed disabled:opacity-35"><SkipForward size={18}/></button></div></div></section>}</div></main>
}

function AddTargetSheet({ memories, initialSurahId = '1', onSave, onClose }) {
  const newSurahs = onboardingSurahs
  const [type, setType] = useState('new')
  const [surahId, setSurahId] = useState(() => newSurahs.some((surah) => surah.id === initialSurahId) ? initialSurahId : '1')
  const [memoryId, setMemoryId] = useState(memories[0]?.id || '')
  const [startAyah, setStartAyah] = useState(1)
  const [endAyah, setEndAyah] = useState(4)
  const [isSurahPickerOpen, setIsSurahPickerOpen] = useState(false)
  const [surahQuery, setSurahQuery] = useState('')
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState('')
  const selectedMemory = memories.find((memory) => memory.id === memoryId)
  const selectedSurah = surahFor(type === 'review' && selectedMemory ? selectedMemory.surahId : surahId)
  const visibleSurahs = newSurahs.filter((surah) => `${surah.id} ${surah.name}`.toLocaleLowerCase('id-ID').includes(surahQuery.toLocaleLowerCase('id-ID').trim()))
  const start = type === 'review' && selectedMemory ? selectedMemory.startAyah : startAyah
  const end = type === 'review' && selectedMemory ? selectedMemory.endAyah : endAyah
  const canSave = type === 'new' ? selectedSurah && startAyah >= 1 && endAyah <= selectedSurah.ayat && startAyah <= endAyah : Boolean(selectedMemory)
  const chooseSurah = (id) => {
    const nextSurah = surahFor(id)
    setSurahId(id)
    setStartAyah(1)
    setEndAyah(Math.min(2, nextSurah.ayat))
    setSurahQuery('')
    setIsSurahPickerOpen(false)
  }
  const applyRange = () => {
    const parsed = parseSurahRange(rangeInput, newSurahs)
    if (parsed.error) return setRangeError(parsed.error)
    setSurahId(parsed.surah.id)
    setStartAyah(parsed.startAyah)
    setEndAyah(parsed.endAyah)
    setRangeError('')
    setIsSurahPickerOpen(false)
  }
  const save = () => {
    if (!canSave) return
    onSave({ id: makeId('target'), type, surahId: type === 'review' ? selectedMemory.surahId : surahId, startAyah: start, endAyah: end, status: 'todo', createdAt: new Date().toISOString(), memoryId: type === 'review' ? memoryId : null })
  }
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="target-sheet-title"><div className="flex items-start justify-between"><div><p className="step-label bg-peach text-terracotta">TODAY’S TARGET</p><h2 id="target-sheet-title" className="font-display mt-2 text-2xl text-forest">Add activity</h2><p className="mt-1 text-sm text-slate-500">Choose one small step to share today.</p></div><button type="button" onClick={onClose} aria-label="Close" className="icon-button"><X size={19}/></button></div><div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-[#f7faf4] p-1"><button type="button" onClick={() => setType('new')} className={`rounded-xl px-3 py-3 text-sm font-bold ${type === 'new' ? 'bg-white text-forest shadow-sm' : 'text-slate-500'}`}>New memorisation</button><button type="button" onClick={() => setType('review')} className={`rounded-xl px-3 py-3 text-sm font-bold ${type === 'review' ? 'bg-white text-forest shadow-sm' : 'text-slate-500'}`}>Review</button></div>{type === 'new' ? <div className="mt-5 space-y-4"><Field label="Choose a surah"><button type="button" onClick={() => setIsSurahPickerOpen((open) => !open)} aria-expanded={isSurahPickerOpen} aria-controls="surah-picker" className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left text-forest shadow-sm transition-[transform,box-shadow] active:scale-[0.96]"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-peach font-bold tabular-nums text-terracotta">{selectedSurah?.id}</span><span className="min-w-0 flex-1"><b className="block">QS. {selectedSurah?.name}</b><small className="block text-slate-500">{selectedSurah?.ayat} ayat</small></span><Search size={18} className="text-terracotta"/><ChevronDown size={18} className={`text-forest transition-transform ${isSurahPickerOpen ? 'rotate-180' : ''}`}/></button>{isSurahPickerOpen && <div id="surah-picker" className="mt-2 rounded-[20px] bg-[#f7faf4] p-2 shadow-[0_12px_28px_rgba(71,119,92,.13)]"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest" size={18}/><input autoFocus value={surahQuery} onChange={(event) => setSurahQuery(event.target.value)} placeholder="Search by surah number or name" className="input-field pl-10" aria-label="Search surah for new memorisation"/></label><div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1" role="listbox" aria-label="Surah search results">{visibleSurahs.length ? visibleSurahs.map((surah) => <button type="button" role="option" aria-selected={surah.id === surahId} key={surah.id} onClick={() => chooseSurah(surah.id)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-[transform,background-color] active:scale-[0.96] ${surah.id === surahId ? 'bg-white text-forest shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}><span className="w-7 font-bold tabular-nums text-terracotta">{surah.id}</span><span className="min-w-0 flex-1 font-semibold">{surah.name}</span><small className="text-slate-500">{surah.ayat} ayat</small></button>) : <p className="p-3 text-center text-sm text-slate-500">Surah not found.</p>}</div></div>}</Field><Field label="Quick entry" hint="Enter a surah number and verse range, for example 78:1-5 or 114:1-1."><div className="flex gap-2"><input value={rangeInput} onChange={(event) => { setRangeInput(event.target.value); setRangeError('') }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyRange() } }} placeholder="78:1-5" inputMode="text" className="input-field min-w-0 font-mono" aria-describedby={rangeError ? 'range-error' : undefined}/><button type="button" onClick={applyRange} className="shrink-0 rounded-2xl bg-forest px-4 text-sm font-bold text-white transition-transform active:scale-[0.96]">Use</button></div>{rangeError && <p id="range-error" role="alert" className="mt-2 text-xs font-semibold leading-relaxed text-terracotta">{rangeError}</p>}</Field><div className="grid grid-cols-2 gap-3"><Field label="Start verse"><input type="number" min="1" max={selectedSurah?.ayat} value={startAyah} onChange={(event) => { const next = Math.max(1, Math.min(selectedSurah?.ayat || 1, Number(event.target.value) || 1)); setStartAyah(next); if (next > endAyah) setEndAyah(next) }} className="input-field"/></Field><Field label="End verse"><input type="number" min={startAyah} max={selectedSurah?.ayat} value={endAyah} onChange={(event) => setEndAyah(Math.max(startAyah, Math.min(selectedSurah?.ayat || 1, Number(event.target.value) || startAyah)))} className="input-field"/></Field></div></div> : memories.length ? <div className="mt-5 space-y-4"><Select label="Saved memorisation" value={memoryId} onChange={(event) => setMemoryId(event.target.value)} options={memories.map((memory) => { const item = surahFor(memory.surahId); return { value: memory.id, label: `${item?.name || 'Surat'} · ${rangeLabel(memory.startAyah, memory.endAyah)}` } })}/><p className="rounded-2xl bg-[#eff6eb] p-4 text-sm leading-relaxed text-forest">Review will use the saved memorisation range.</p></div> : <div className="mt-5 rounded-2xl bg-[#fff2df] p-5 text-sm leading-relaxed text-terracotta">No saved memorisation yet. Complete new memorisation first, then add a review.</div>}<div className="mt-6 rounded-2xl bg-[#fffaf2] p-4 text-center"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Preview</p><p className="mt-1 font-display text-lg text-forest">{selectedSurah?.name || 'Choose a surah'} · {rangeLabel(start, end)}</p></div><button type="button" disabled={!canSave} onClick={save} className="primary-button mt-6 disabled:cursor-not-allowed disabled:opacity-45"><Plus size={19}/> Save target</button></section></div>
}


function LegacyTargetCard({ target, onStart, onComplete, onDelete }) {
  const item = surahFor(target.surahId)
  const isNew = target.type === 'new'
  return <article className={`target-card ${target.status === 'done' ? 'target-card-done' : ''}`}><div className="flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isNew ? 'bg-peach text-terracotta' : 'bg-sage text-forest'}`}>{isNew ? <Sparkles size={20}/> : <RotateCcw size={20}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{isNew ? 'New memorisation' : 'Review'}</span>{target.status === 'done' && <span className="status-pill"><CircleCheck size={13}/> Complete</span>}</div><h3 className="mt-1 font-display text-xl text-forest">{item?.name || 'Surat'} <span className="font-sans text-sm font-semibold text-slate-400">· {rangeLabel(target.startAyah, target.endAyah)}</span></h3><p className="mt-1 text-sm text-slate-500">{isNew ? 'Ayo kenalkan ayat baru dengan suasana hangat.' : 'Ajak anak menyambungkan ayat dengan pelan-pelan.'}</p></div><button type="button" onClick={() => onDelete(target.id)} aria-label="Delete target" className="text-slate-300 transition-colors hover:text-terracotta"><Trash2 size={17}/></button></div><div className="mt-4 flex gap-2">{target.status !== 'done' && <><button type="button" onClick={() => onStart(target)} className="secondary-button">Start <Play size={16} fill="currentColor"/></button><button type="button" onClick={() => onComplete(target)} className="primary-button">Mark complete <Check size={16}/></button></>}{target.status === 'done' && <div className="flex w-full items-center gap-2 rounded-2xl bg-[#eff6eb] px-4 py-3 text-sm font-bold text-forest"><Check size={17}/> Today’s target is complete. Thank you for showing up.</div>}</div></article>
}

function TargetCard({ target, onStart, onComplete, onDelete }) {
  const { t } = useLocale()
  const item = surahFor(target.surahId)
  const isNew = target.type === 'new'
  const isDone = target.status === 'done'
  const typeLabel = isNew ? t('targets.new') : t('targets.review')
  return <article className={`target-card ${isDone ? 'target-card-done' : ''}`}>
    <div className="flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isNew ? 'badge-new' : 'badge-review'}`}>{isNew ? <Sparkles size={20}/> : <RotateCcw size={20}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${isNew ? 'badge-new' : 'badge-review'}`}>{isNew ? <Sparkles aria-hidden="true" size={12}/> : <RotateCcw aria-hidden="true" size={12}/>} {typeLabel}</span>{isDone && <span className="status-pill"><CircleCheck size={13}/> {t('targets.done')}</span>}</div><h3 className="mt-2 font-display text-xl text-forest">{item?.name || t('common.surah')} <span className="font-sans text-sm font-semibold text-slate-400 dark:text-stone-400">· {rangeLabel(target.startAyah, target.endAyah)}</span></h3><p className="text-muted mt-1 text-sm">{isNew ? t('targets.newStory') : t('targets.reviewStory')}</p></div><button type="button" onClick={() => onDelete(target.id)} aria-label={t('common.delete')} className="text-slate-300 transition-colors hover:text-terracotta dark:text-stone-500"><Trash2 size={17}/></button></div>
    {!isDone && <div className="mt-4 flex gap-2">{isNew ? <button type="button" onClick={() => onStart(target)} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition-[transform,background-color] hover:bg-emerald-500 active:scale-[0.96]">{t('targets.startMemory')} <Play size={16} fill="currentColor"/></button> : <><button type="button" onClick={() => onStart(target)} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition-[transform,background-color] hover:bg-emerald-500 active:scale-[0.96]">{t('common.play')} <Play size={16} fill="currentColor"/></button><button type="button" onClick={() => onComplete(target)} className="primary-button">{t('common.complete')} <Check size={16}/></button></>}</div>}
    {isDone && <div className="mt-4 flex w-full items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-100"><Check size={17}/> {t('targets.completeStory')}</div>}
  </article>
}

function TargetGroup({ type, targets, onStart, onComplete, onDelete }) {
  const { t } = useLocale()
  const isNew = type === 'new'
  const title = isNew ? t('targets.new') : t('targets.review')
  const groupId = `target-group-${type}`
  return <section aria-labelledby={groupId}>
    <div className="flex items-center justify-between gap-3">
      <h3 id={groupId} className={`inline-flex items-center gap-2 text-sm font-bold ${isNew ? 'text-terracotta' : 'text-forest'}`}>{isNew ? <Sparkles size={16}/> : <RotateCcw size={16}/>} {title}</h3>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${isNew ? 'badge-new' : 'badge-review'}`}>{t('targets.count', { count: targets.length })}</span>
    </div>
    <div className="mt-3 space-y-3">{targets.map((target) => <TargetCard key={target.id} target={target} onStart={onStart} onComplete={onComplete} onDelete={onDelete}/>)}</div>
  </section>
}

function ReviewRecommendations({ memories, onStart, onAdd }) {
  const { t } = useLocale()
  return <section aria-labelledby="review-recommendations-title" className="rounded-[24px] bg-amber-50 p-4 dark:bg-emerald-950/60 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><p className="step-label bg-white text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-100">{t('recommendations.eyebrow')}</p><h3 id="review-recommendations-title" className="font-display mt-2 text-xl text-stone-900 dark:text-stone-100">{t('recommendations.title')}</h3><p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-200">{t('recommendations.body')}</p></div><RotateCcw className="mt-1 shrink-0 text-forest" size={22}/></div>
    <div className="mt-4 space-y-3">{memories.map((memory) => {
      const item = surahFor(memory.surahId)
      return <article key={memory.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#16211E] dark:shadow-none"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-forest">{item?.name || t('common.surah')} <span className="text-sm font-semibold text-slate-400 dark:text-stone-400">· {rangeLabel(memory.startAyah, memory.endAyah)}</span></h4><p className="mt-1 text-xs font-bold text-terracotta">{dueLabel(memory, t)}</p></div><Sparkles className="shrink-0 text-terracotta" size={17}/></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => onStart(memory)} className="secondary-button min-h-10 text-sm">{t('common.play')} <Play size={15} fill="currentColor"/></button><button type="button" onClick={() => onAdd(memory)} className="min-h-10 rounded-xl bg-forest px-3 text-sm font-bold text-white transition-transform active:scale-[0.96]">{t('recommendations.add')}</button></div></article>
    })}</div>
  </section>
}

const sortLearningQueue = (first, second) => {
  if (String(first.surahId) === String(second.surahId)) return Number(first.startAyah) - Number(second.startAyah) || Number(first.endAyah) - Number(second.endAyah)
  return String(first.createdAt || '').localeCompare(String(second.createdAt || ''))
}

function localCoachAdvice({ profile, targets, memories, conditions, listenRepeats }, t) {
  const todayTargets = targets.filter((target) => isCreatedToday(target.createdAt, todayKey()))
  const remaining = todayTargets.filter((target) => target.status !== 'done').sort(sortLearningQueue)
  const due = getReviewRecommendations(memories, { today: todayKey(), limit: memories.length })
  const child = profile.name || t('coach.childFallback')
  const lowEnergy = conditions.includes('tidak-mood') || conditions.includes('lelah')
  if (conditions.includes('tantrum')) return { title: t('coach.advice.tantrumTitle'), body: t('coach.advice.tantrumBody', { child }), action: t('coach.advice.pause'), kind: 'pause' }
  if (conditions.includes('ingin-main')) return { title: t('coach.advice.playTitle'), body: t('coach.advice.playBody', { child }), action: t('coach.advice.listen'), kind: 'listen' }
  if (conditions.includes('lelah')) return { title: t('coach.advice.restTitle'), body: t('coach.advice.restBody', { child }), action: t('coach.advice.listen'), kind: 'listen' }
  if (lowEnergy) return { title: t('coach.advice.restTitle'), body: t('coach.advice.restBody', { child }), action: t('coach.advice.pause'), kind: 'pause' }
  if (!todayTargets.length && due.length) {
    const item = surahFor(due[0].surahId)
    return { title: t('coach.advice.reviewTitle', { surah: item?.name || t('common.surah') }), body: t('coach.advice.reviewBody', { child, count: due.length }), action: t('coach.advice.addReview'), kind: 'review', memory: due[0] }
  }
  if (!todayTargets.length) {
    const known = new Set([...(profile.memorized || []), ...memories.map((memory) => memory.surahId)])
    const nextSurah = onboardingSurahs.find((surah) => !known.has(surah.id)) || onboardingSurahs[0]
    const isFirstStep = known.size === 0
    return {
      title: isFirstStep ? t('coach.advice.firstTitle') : t('coach.advice.nextTitle', { surah: nextSurah.name }),
      body: isFirstStep ? t('coach.advice.firstBody', { child }) : t('coach.advice.nextBody', { child }),
      action: t('coach.advice.newTarget', { surah: nextSurah.name }),
      kind: 'new',
      surahId: nextSurah.id,
    }
  }
  if (!remaining.length) {
    const known = new Set([...(profile.memorized || []), ...memories.map((memory) => memory.surahId)])
    const nextSurah = onboardingSurahs.find((surah) => !known.has(surah.id)) || onboardingSurahs[0]
    const reviewMemory = due[0] || memories.slice().sort(sortLearningQueue)[0]
    if (conditions.includes('siap')) {
      if (reviewMemory) return { title: t('coach.advice.celebrateTitle'), body: t('coach.advice.celebrateBody', { child }), action: t('coach.advice.addReview'), kind: 'review', memory: reviewMemory }
      return { title: t('coach.advice.celebrateTitle'), body: t('coach.advice.celebrateBody', { child }), action: t('coach.advice.newTarget', { surah: nextSurah.name }), kind: 'new', surahId: nextSurah.id }
    }
    return { title: t('coach.advice.closeTitle'), body: t('coach.advice.closeBody'), action: t('coach.advice.pause'), kind: 'pause' }
  }
  const next = remaining[0]
  const item = surahFor(next.surahId)
  return { title: t('coach.advice.focusTitle', { surah: item?.name || t('common.target') }), body: t('coach.advice.focusBody', { count: remaining.length, range: rangeLabel(next.startAyah, next.endAyah), repeat: listenRepeats }), action: t('coach.advice.start', { repeat: listenRepeats }), kind: 'start', target: next, repeat: listenRepeats }
}

function checkinFollowUp(checkin, profile) {
  if (!checkin || checkin.actionStatus === 'suggested') return null
  const child = profile.name || 'si kecil'
  if (checkin.actionStatus === 'completed') return `MasyaAllah, ${child} already menutup langkah kecil today. Simpan rasa senangnya, besok kita lanjut pelan-pelan lagi.`
  if (checkin.actionStatus === 'paused') return `Tadi kita memilih jeda untuk ${child}. Tidak apa-apa—rasa aman selalu lebih dulu daripada target.`
  return `Langkah kecil untuk ${child} already dipilih. Saat kembali, lanjutkan saja dari satu ayat dan satu pujian.`
}

function CoachConversation({ profile, targets, memories, checkin, locale: requestedLocale, onSave, onAdd, onStart, onApplyProgress, autoOpen = false, onAutoOpen }) {
  const { t, locale: contextLocale } = useLocale()
  const locale = requestedLocale || contextLocale
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState('')
  const [messages, setMessages] = useState([])
  const [conditions, setConditions] = useState([])
  const [listenRepeats, setListenRepeats] = useState(checkin?.listenRepeats || 3)
  const [readiness, setReadiness] = useState('unanswered')
  const [progressText, setProgressText] = useState('')
  const [progressState, setProgressState] = useState(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [progressError, setProgressError] = useState('')
  const closeButtonRef = useRef(null)
  const messagesEndRef = useRef(null)
  const advice = localCoachAdvice({ profile, targets, memories, conditions, listenRepeats }, t)
  const recommendation = { title: advice.title, actionType: advice.kind }
  const child = profile.name || t('coach.childFallback')
  const moodKeys = { tantrum: 'tantrum', 'tidak-mood': 'noMood', 'ingin-main': 'wantsToPlay', lelah: 'tired', siap: 'ready' }
  const moodLabel = (condition) => t(`agent.moods.${moodKeys[condition]}`)
  const pushMessage = (message) => setMessages((items) => [...items, { id: `${Date.now()}-${items.length}`, ...message }])
  const resetConversation = () => {
    setMessages([{ id: 'welcome', role: 'agent', text: t('agent.greeting', { role: profile.role || '', childName: child }) }])
    setConditions([])
    setListenRepeats(checkin?.listenRepeats || 3)
    setReadiness('unanswered')
    setAiStatus('')
    setIsLoading(false)
    setProgressText('')
    setProgressState(null)
    setProgressError('')
  }
  const openConversation = () => { resetConversation(); setOpen(true) }
  const closeConversation = () => setOpen(false)
  useEffect(() => {
    if (window.localStorage.getItem('hasSeenAgentWelcome')) return undefined
    const timer = window.setTimeout(() => {
      openConversation()
      window.localStorage.setItem('hasSeenAgentWelcome', 'true')
    }, 800)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!open) return undefined
    closeButtonRef.current?.focus()
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeConversation() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])
  useEffect(() => { if (autoOpen) { openConversation(); onAutoOpen?.() } }, [autoOpen])
  useEffect(() => {
    if (!open) return undefined
    const motionReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const frame = window.requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: motionReduced ? 'auto' : 'smooth', block: 'end' }))
    return () => window.cancelAnimationFrame(frame)
  }, [open, messages, isLoading, aiStatus])
  const saveContext = (patch, actionStatus = 'suggested') => onSave?.({ ...patch, recommendation, actionStatus, personalAdvice: null })
  const chooseCondition = (condition) => {
    const nextConditions = [condition]
    const nextAdvice = localCoachAdvice({ profile, targets, memories, conditions: nextConditions, listenRepeats }, t)
    const nextReadiness = readinessForCondition(condition)
    const answeredAt = new Date().toISOString()
    setAiStatus('')
    setConditions(nextConditions)
    setReadiness(nextReadiness)
    setMessages((items) => [...items, { id: `${Date.now()}-user`, role: 'user', text: moodLabel(condition) }, { id: `${Date.now()}-agent`, role: 'agent', text: `${nextAdvice.title}. ${nextAdvice.body}` }])
    onSave?.({ conditions: nextConditions, readiness: nextReadiness, answeredAt, recommendation: { title: nextAdvice.title, actionType: nextAdvice.kind }, actionStatus: nextReadiness === 'not_ready' ? 'paused' : 'suggested', personalAdvice: null })
  }
  const chooseRepeat = (count) => { setListenRepeats(count); saveContext({ listenRepeats: count }); pushMessage({ role: 'user', text: t('agent.playReciterCount', { count }) }) }
  const getPersonalAdvice = async () => {
    setIsLoading(true)
    setAiStatus('')
    try {
      const response = await fetch('/api/daily-coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale, profile: { name: profile.name, age: profile.age }, targets, memories, conditions, listenRepeats, today: todayKey(), checkin: { actionStatus: checkin?.actionStatus, previousAction: checkin?.recommendation?.actionType }, localRecommendation: recommendation }) })
      const rawPayload = await response.text()
      let payload = {}
      try { payload = rawPayload ? JSON.parse(rawPayload) : {} } catch { throw new Error(t('agent.invalidResponse', { status: response.status })) }
      if (!response.ok) throw new Error(payload.error || t('agent.endpointResponse', { status: response.status }))
      if (!isPersonalAdvice(payload.advice) || payload.advice.recommendedAction.type !== advice.kind) throw new Error(t('agent.unsupportedResponse'))
      onSave?.({ recommendation, personalAdvice: payload.advice, actionStatus: checkin?.actionStatus || 'suggested' })
      setAiStatus(t('agent.adviceUpdated'))
      pushMessage({ role: 'agent', text: payload.advice.message })
    } catch (error) {
      onSave?.({ recommendation, actionStatus: checkin?.actionStatus || 'suggested', personalAdvice: null })
      const message = error instanceof Error ? error.message : ''
      const isConnectionError = message === 'Failed to fetch' || message === 'Load failed' || message.includes('NetworkError')
      setAiStatus(isConnectionError ? t('agent.connectionError') : t('agent.adviceUnavailable', { message: message || t('agent.aiAdvice') }))
      pushMessage({ role: 'agent', text: t('agent.fallbackAdvice') })
    } finally { setIsLoading(false) }
  }
  const interpretProgress = async (event) => {
    event.preventDefault()
    if (!progressText.trim()) return
    setProgressLoading(true); setProgressError(''); setProgressState(null)
    try {
      const response = await fetch('/api/log-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale, text: progressText, today: todayKey(), profile: { name: profile.name, age: profile.age }, catalogue: QURAN_CATALOGUE, memories: memories.map(({ surahId, startAyah, endAyah }) => ({ surahId, startAyah, endAyah })) }) })
      const raw = await response.text(); let payload = {}
      try { payload = raw ? JSON.parse(raw) : {} } catch { throw new Error(t('agent.progressInvalid')) }
      if (!response.ok) throw new Error(payload.error || t('agent.progressUnavailable'))
      const parsed = validateProgressResponse(payload, QURAN_CATALOGUE, memories, { requireMatching: false })
      const checked = validateProgressEntries(parsed.entries, QURAN_CATALOGUE, memories, { requireMatching: false })
      const problems = checked.filter((entry) => (entry.type === 'review' && !entry.memoryId) || (entry.type === 'new' && memories.some((memory) => String(memory.surahId) === entry.surahId && Number(memory.startAyah) === entry.startAyah && Number(memory.endAyah) === entry.endAyah)))
      setProgressState({ ...parsed, entries: checked, clarification: problems.length ? t('agent.progressClarification') : (parsed.unrecognised.length ? parsed.clarification : '') })
    } catch (error) { setProgressError(error instanceof Error ? error.message : t('agent.progressUnavailable')) }
    finally { setProgressLoading(false) }
  }
  const confirmProgress = async () => {
    if (!progressState?.entries?.length || progressState.clarification) return
    setProgressLoading(true); setProgressError('')
    try { await onApplyProgress?.(validateProgressEntries(progressState.entries, QURAN_CATALOGUE, memories)); setProgressState(null); setProgressText(''); pushMessage({ role: 'agent', text: t('agent.progressSaved') }) }
    catch (error) { setProgressError(error instanceof Error ? error.message : t('agent.progressUnavailable')) }
    finally { setProgressLoading(false) }
  }
  const takeAction = () => {
    if (readiness !== 'ready') return
    const nextStatus = advice.kind === 'pause' ? 'paused' : 'acted'
    saveContext({ actionTaken: advice.kind }, nextStatus)
    if (advice.kind === 'new') onAdd({ surahId: advice.surahId })
    if (advice.kind === 'review' && advice.memory) onAdd({ memory: advice.memory })
    if (advice.kind === 'start' && advice.target) {
      sessionStorage.setItem('wali-tahfiz-coach-repeat', String(advice.repeat || listenRepeats))
      onStart(advice.target)
    }
    if (advice.kind === 'listen') window.dispatchEvent(new Event('wali-tahfiz-open-audio'))
    pushMessage({ role: 'agent', text: advice.kind === 'pause' ? t('agent.pauseChosen', { childName: child }) : t('agent.actionChosen', { childName: child }) })
  }
  return <>
    {open && <div className="coach-dialog-layer">
      <button type="button" className="coach-dialog-backdrop" onClick={closeConversation} aria-label={t('agent.closeConversation')}/>
      <section className="coach-panel coach-conversation-panel" role="dialog" aria-modal="true" aria-labelledby="coach-conversation-title">
        <div className="coach-panel-header"><span className="coach-avatar"><Bot size={22}/></span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.13em] text-emerald-700 dark:text-emerald-300">{t('agent.badge')}</p><h2 id="coach-conversation-title" className="font-display mt-1 text-xl font-bold text-forest dark:text-emerald-300">{t('agent.title', { name: child })}</h2></div><button ref={closeButtonRef} type="button" className="coach-close" onClick={closeConversation} aria-label={t('agent.closeConversation')}><X size={19}/></button></div>
        <div className="coach-messages" aria-live="polite">
          {messages.map((message) => <p key={message.id} className={`coach-message coach-message-${message.role}`}>{message.text}</p>)}
          {isLoading && <p className="coach-message coach-message-agent coach-message-typing" role="status">{t('agent.thinking')}</p>}
          <span ref={messagesEndRef} aria-hidden="true"/>
        </div>
        <div className="coach-footer">
          <div className="coach-quick-replies" role="group" aria-label={t('agent.chooseMood')}>{childConditions.map(([value]) => <button type="button" key={value} aria-pressed={conditions[0] === value} onClick={() => chooseCondition(value)} className={`condition-chip ${conditions[0] === value ? 'condition-chip-active' : ''}`}>{moodLabel(value)}</button>)}</div>
          {readiness === 'ready' && advice.kind === 'start' && <div className="coach-repeat-picker"><p className="coach-section-label">{t('agent.playReciter')}</p><div className="grid grid-cols-3 gap-2">{[1, 3, 5].map((count) => <button type="button" key={count} aria-pressed={listenRepeats === count} onClick={() => chooseRepeat(count)} className={`min-h-11 rounded-xl text-sm font-bold tabular-nums transition-[transform,background-color,color] active:scale-[0.96] ${listenRepeats === count ? 'bg-forest text-white' : 'bg-[#eff6eb] text-forest'}`}>{count}×</button>)}</div></div>}
          {readiness === 'ready' && <div className="coach-actions"><button type="button" onClick={takeAction} className="coach-primary-action">{advice.action}{advice.kind !== 'pause' && <Play size={15} fill="currentColor"/>}</button><button type="button" disabled={isLoading} onClick={getPersonalAdvice} className="coach-ai-action disabled:opacity-60">{isLoading ? t('agent.composing') : <><Sparkles size={16}/>{t('agent.aiAdvice')}</>}</button></div>}
          <form className="mt-5 border-t border-emerald-900/10 pt-5" onSubmit={interpretProgress}>
            <label htmlFor="progress-today" className="coach-section-label">{t('agent.progressLabel')}</label>
            <textarea id="progress-today" value={progressText} onChange={(event) => setProgressText(event.target.value)} rows="3" maxLength="2000" placeholder={t('agent.progressPlaceholder')} className="input-field mt-2 resize-y" disabled={progressLoading}/>
            <button type="submit" disabled={progressLoading || !progressText.trim()} className="primary-button mt-3 w-full disabled:opacity-50">{progressLoading ? t('agent.progressThinking') : <><Send size={16}/>{t('agent.progressSubmit')}</>}</button>
          </form>
          {progressError && <p role="alert" className="mt-3 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-terracotta">{progressError}</p>}
          {progressState && <div className="mt-3 rounded-2xl bg-[#eff6eb] p-4 text-sm text-forest"><p className="font-bold">{t('agent.progressSummary')}</p><ul className="mt-2 list-disc pl-5">{progressState.entries.map((entry, index) => <li key={`${entry.surahId}-${entry.startAyah}-${index}`}>{entry.type === 'new' ? t('agent.progressNew') : t('agent.progressReview')} · QS. {entry.surahId} · {rangeLabel(entry.startAyah, entry.endAyah)}</li>)}</ul>{progressState.unrecognised.length > 0 && <p className="mt-2 text-terracotta">{t('agent.progressUnrecognised', { items: progressState.unrecognised.join(', ') })}</p>}{progressState.clarification && <p className="mt-2 font-semibold text-terracotta">{progressState.clarification}</p>}{!progressState.clarification && progressState.entries.length > 0 && <div className="mt-3 flex gap-2"><button type="button" onClick={confirmProgress} disabled={progressLoading} className="primary-button flex-1">{t('agent.progressConfirm')}</button><button type="button" onClick={() => setProgressState(null)} className="secondary-button flex-1">{t('agent.progressEdit')}</button></div>}</div>}
          {aiStatus && <p className="coach-ai-status" role="status">{aiStatus}</p>}
          <p className="coach-note">{t('agent.advice')}</p>
        </div>
      </section>
    </div>}
    <button type="button" onClick={open ? closeConversation : openConversation} aria-expanded={open} aria-label={open ? t('agent.close') : t('agent.open')} className="pointer-events-auto h-12 w-12 sm:w-auto sm:px-4 bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-sm rounded-full sm:rounded-2xl px-4 flex items-center justify-center sm:justify-start gap-2.5 shadow-xl transition-all duration-200 active:scale-95"><span className="relative shrink-0"><Bot size={20}/><i className="coach-pulse"/></span><span className="hidden sm:inline">{t('agent.button')}</span></button>
  </>
}

function FloatingCoach({ profile, targets, memories, locale, checkin, onSave, autoOpen, onAutoOpen, onApplyProgress, onAdd, onStart, onOpen = () => window.dispatchEvent(new Event('wali-tahfiz-open-audio')) }) {
  return <>
    <div className="fixed bottom-4 inset-x-0 mx-auto max-w-md px-4 z-50 pointer-events-none flex items-center justify-between gap-3">
      <AudioLibraryShortcut onOpen={onOpen}/>
      <CoachConversation profile={profile} targets={targets} memories={memories} locale={locale} checkin={checkin} onSave={onSave} autoOpen={autoOpen} onAutoOpen={onAutoOpen} onApplyProgress={onApplyProgress} onAdd={onAdd} onStart={onStart}/>
    </div>
  </>
}


function Home({ profile, family, locale = DEFAULT_LOCALE, onSelectChild, settings, audioLibrary, openPractice, openReview, autoOpenCoach = false, onAutoCoachOpened }) {
  const { t } = useLocale()
  const [targets, setTargets] = useState([])
  const [memories, setMemories] = useState([])
  const [checkin, setCheckin] = useState(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [suggestedSurahId, setSuggestedSurahId] = useState('1')
  useEffect(() => { const openAudio = () => audioLibrary(); window.addEventListener('wali-tahfiz-open-audio', openAudio); return () => window.removeEventListener('wali-tahfiz-open-audio', openAudio) }, [audioLibrary])
  useEffect(() => {
    let active = true
    setIsHydrated(false)
    Promise.all([getTargetsForDay(profile.id, todayKey()), db.memories.where('childId').equals(profile.id).toArray(), db.coachCheckins.where('[childId+date]').equals([profile.id, todayKey()]).first()]).then(([savedTargets, savedMemories, savedCheckin]) => {
      if (!active) return
      const orderedTargets = savedTargets.sort((first, second) => String(second.createdAt || '').localeCompare(String(first.createdAt || '')))
      setTargets(orderedTargets)
      if (savedMemories.length || !profile.memorized?.length) setMemories(savedMemories)
      else {
        const initialMemories = profile.memorized.map((surahId) => {
          const surah = surahFor(surahId)
          return { id: makeId('memory'), childId: profile.id, surahId, startAyah: 1, endAyah: surah?.ayat || 1, intervalIndex: 0, lastReviewedAt: null, nextReviewAt: null }
        })
        setMemories(initialMemories)
        // The initial cards are visible immediately; persistence can safely wait
        // until the browser has painted the home screen.
        const persist = () => { if (active) db.memories.bulkPut(initialMemories).catch(() => {}) }
        if ('requestIdleCallback' in window) window.requestIdleCallback(persist, { timeout: 1200 })
        else window.setTimeout(persist, 0)
      }
      setCheckin(savedCheckin || null)
      setIsHydrated(true)
    })
    return () => { active = false }
  }, [profile.id])
  const todayTargets = targets.filter((target) => isCreatedToday(target.createdAt, todayKey()))
  const done = todayTargets.filter((target) => target.status === 'done').length
  const newTargets = todayTargets.filter((target) => target.type === 'new')
  const reviewTargets = todayTargets.filter((target) => target.type === 'review')
  const reviewRecommendations = getReviewRecommendations(memories, {
    today: todayKey(),
    excludedMemoryIds: reviewTargets.map((target) => target.memoryId),
  })
  const saveCheckin = (patch) => {
    const now = new Date().toISOString()
    setCheckin((current) => {
      const base = current || createCoachCheckin({ childId: profile.id, date: todayKey(), now, recommendation: patch.recommendation || null })
      const next = { ...base, ...patch, childId: profile.id, date: todayKey(), updatedAt: now }
      db.coachCheckins.put(next)
      return next
    })
  }
  const updateMemory = (memoryId, result) => setMemories((items) => items.map((memory) => {
    if (memory.id !== memoryId) return memory
    const updated = scheduleReviewResult(memory, result, todayKey())
    db.memories.put(updated)
    return updated
  }))
  const completeTarget = (target) => {
    const completed = { ...target, status: 'done' }
    setTargets((items) => items.map((item) => item.id === target.id ? completed : item))
    db.targets.put(completed)
    if (target.type === 'new') setMemories((items) => {
      if (items.some((memory) => memory.surahId === target.surahId && memory.startAyah === target.startAyah && memory.endAyah === target.endAyah)) return items
      const memory = createScheduledMemory({ id: makeId('memory'), childId: profile.id, surahId: target.surahId, startAyah: target.startAyah, endAyah: target.endAyah }, todayKey())
      db.memories.put(memory)
      return [...items, memory]
    })
    else if (target.memoryId) updateMemory(target.memoryId, 'pass')
    completeTodayCoachAction(profile.id)
  }
  const saveTarget = (target) => {
    const scopedTarget = { ...target, childId: profile.id }
    setTargets((items) => [scopedTarget, ...items])
    db.targets.put(scopedTarget)
    setShowAdd(false)
    setSuggestedSurahId('1')
  }
  const deleteTarget = (id) => { setTargets((items) => items.filter((target) => target.id !== id)); db.targets.delete(id) }
  const setStartedTarget = (id, coachRepeat) => {
    const target = targets.find((item) => item.id === id)
    const savedRepeat = Number(sessionStorage.getItem('wali-tahfiz-coach-repeat'))
    sessionStorage.removeItem('wali-tahfiz-coach-repeat')
    if (target) openPractice({ ...target, coachRepeat: coachRepeat || savedRepeat || undefined })
  }
  const addReviewTarget = (memory) => {
    if (hasReviewTargetForToday(targets, memory.id, todayKey())) return
    saveTarget({ id: makeId('target'), type: 'review', surahId: memory.surahId, startAyah: memory.startAyah, endAyah: memory.endAyah, status: 'todo', createdAt: new Date().toISOString(), memoryId: memory.id })
  }
  const applyProgress = async (entries) => {
    await applyValidatedProgress({ database: db, childId: profile.id, entries, catalogue: QURAN_CATALOGUE, memories, today: todayKey(), makeId })
    const [nextTargets, nextMemories] = await Promise.all([getTargetsForDay(profile.id, todayKey()), db.memories.where('childId').equals(profile.id).toArray()])
    setTargets(nextTargets.sort((first, second) => String(second.createdAt || '').localeCompare(String(first.createdAt || ''))))
    setMemories(nextMemories)
    await completeTodayCoachAction(profile.id)
  }
  if (!isHydrated) return <main className="page-root pb-12"><div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-10" aria-busy="true"><div className="h-36 animate-pulse rounded-[32px] bg-forest/90"/><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><section className="h-80 animate-pulse rounded-[32px] bg-white/90 dark:bg-[#16211E]"/><aside className="h-80 animate-pulse rounded-[32px] bg-white/90 dark:bg-[#16211E]"/></div><p className="sr-only">Loading data hafalan {profile.name}…</p></div></main>
  return <main className="page-root pb-12"><div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-10">
    <header className="home-hero"><div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10"/><div className="home-hero-top"><p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white/75"><img src="/icons/app-icon.svg" alt="" className="home-hero-brand-mark"/><span>Wali Tahfiz</span><span className="text-white/35">·</span><Sparkles size={15} className="shrink-0"/> {t('home.greeting', { role: profile.role })}</p><button type="button" onClick={settings} aria-label={t('common.settings')} className="home-hero-settings"><Settings size={21}/></button></div><div className="home-hero-copy"><span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[.12em] text-white/90">🌚 Education · AI untuk belajar</span><h1 className="font-display">{t('home.title', { name: profile.name })}</h1><p>{t('home.subtitle')}</p></div><div className="home-hero-child"><ChildSwitcher family={family} onSelect={onSelectChild} onManage={settings}/></div></header>
    <div className="dashboard-status-grid mt-6">
      <div className="stat-card stat-card-target"><span className="stat-card-icon"><CalendarDays size={19}/></span><span><b>{todayTargets.length}</b><small>{t('home.todayTargets')}</small></span></div>
      <div className="stat-card stat-card-complete"><span className="stat-card-icon"><CircleCheck size={19}/></span><span><b>{done}</b><small>{todayTargets.length ? t('home.complete', { done, total: todayTargets.length }) : t('home.ready')}</small></span></div>
      <div className="stat-card stat-card-new"><span className="stat-card-icon"><Sparkles size={19}/></span><span><b>{newTargets.length}</b><small>{t('home.newMemory')}</small></span></div>
      <div className="stat-card stat-card-review"><span className="stat-card-icon"><RotateCcw size={19}/></span><span><b>{reviewTargets.length}</b><small>{t('home.review')}</small></span></div>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"><section className="glass-card p-5 lg:p-7"><div className="flex items-end justify-between gap-4"><div><p className="step-label badge-review">{t('home.agenda')}</p><h2 className="font-display mt-2 text-2xl text-forest">{t('home.childTargets', { name: profile.name })}</h2><p className="text-muted mt-1 text-sm">{t('home.chooseOne')}</p></div><button type="button" onClick={() => setShowAdd(true)} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-terracotta px-3 py-2 text-sm font-bold text-white transition-transform active:scale-[0.96]"><Plus size={17}/> {t('common.add')}</button></div>
      <div className="mt-5 space-y-6">
        {reviewRecommendations.length > 0 && (
          <ReviewRecommendations memories={reviewRecommendations} onStart={openReview} onAdd={addReviewTarget}/>
        )}
        {todayTargets.length ? <>{newTargets.length > 0 && <TargetGroup type="new" targets={newTargets} onStart={(item) => item.type === 'review' ? openReview(memories.find((memory) => memory.id === item.memoryId)) : setStartedTarget(item.id)} onComplete={completeTarget} onDelete={deleteTarget}/>} {reviewTargets.length > 0 && <TargetGroup type="review" targets={reviewTargets} onStart={(item) => item.type === 'review' ? openReview(memories.find((memory) => memory.id === item.memoryId)) : setStartedTarget(item.id)} onComplete={completeTarget} onDelete={deleteTarget}/>}</> : reviewRecommendations.length === 0 && <div className="rounded-[24px] bg-amber-50 px-5 py-10 text-center dark:bg-emerald-950/60"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-forest dark:bg-[#16211E]"><Plus size={22}/></span><h3 className="mt-3 font-display text-xl text-forest">{t('home.noTargets')}</h3><p className="text-muted mt-1 text-sm">{t('home.noTargetsBody')}</p><button type="button" onClick={() => setShowAdd(true)} className="mt-4 min-h-11 font-bold text-terracotta">{t('home.firstTarget')}</button></div>}
      </div></section>
      <aside className="glass-card p-5 lg:p-6"><div className="flex items-start justify-between"><div><p className="step-label border border-emerald-800/50 bg-emerald-950/80 text-emerald-300">{t('home.memories')}</p><h2 className="font-display mt-2 text-2xl font-semibold text-stone-100 dark:text-stone-100">{t('home.childMemories', { name: profile.name })}</h2></div><Clock3 className="text-terracotta" size={22}/></div><p className="mt-1 text-sm leading-relaxed text-stone-400 dark:text-stone-400">{t('home.memoriesBody')}</p><div className="mt-5 space-y-3">{memories.length ? memories.map((memory) => { const item = surahFor(memory.surahId); const due = reviewDueState(memory, todayKey()); return <div key={memory.id} className="memory-card"><div className="flex items-start justify-between gap-2"><div><b className="block text-forest">{item?.name || t('common.surah')} · {rangeLabel(memory.startAyah, memory.endAyah)}</b><span className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${due.status === 'due' ? 'text-terracotta' : 'text-slate-500'}`}>{due.status === 'due' && <Sparkles size={12}/>} {dueLabel(memory, t)}</span></div><button type="button" onClick={() => openReview(memory)} aria-label={t('home.playRandom', { surah: item?.name || t('common.surah') })} className="icon-button h-10 w-10 bg-white"><Shuffle size={17}/></button></div><button type="button" onClick={() => addReviewTarget(memory)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white transition-[transform,background-color] hover:bg-emerald-500 active:scale-[0.96]"><Plus size={15}/> {t('home.addToday')}</button></div> }) : <p className="rounded-2xl border border-stone-200/80 bg-stone-100/80 p-6 text-center dark:border-stone-800/80 dark:bg-stone-900/60">{t('home.noMemories', { name: profile.name })}</p>}</div></aside></div></div><FloatingCoach key={profile.id} profile={profile} targets={targets} memories={memories} checkin={checkin} autoOpen={autoOpenCoach} onAutoOpen={onAutoCoachOpened} onSave={saveCheckin} onApplyProgress={applyProgress} onOpen={() => window.dispatchEvent(new Event('wali-tahfiz-open-audio'))} onAdd={({ memory, surahId } = {}) => { if (memory) addReviewTarget(memory); else { setSuggestedSurahId(surahId || '1'); setShowAdd(true) } }} onStart={(target) => target.type === 'review' ? openReview(memories.find((memory) => memory.id === target.memoryId)) : setStartedTarget(target.id)}/>{showAdd && <AddTargetSheet memories={memories} initialSurahId={suggestedSurahId} onSave={saveTarget} onClose={() => { setShowAdd(false); setSuggestedSurahId('1') }}/>}</main>
}

function AudioLibraryShortcut({ onOpen }) {
  const { t } = useLocale()
  return <button type="button" onClick={onOpen} aria-label={t('home.listen')} className="pointer-events-auto h-12 w-12 sm:w-auto sm:px-4 bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-sm rounded-full sm:rounded-2xl px-4 flex items-center justify-center sm:justify-start gap-2.5 shadow-xl transition-all duration-200 active:scale-95"><Headphones className="w-5 h-5 shrink-0"/><span className="hidden sm:inline">{t('home.listen')}</span></button>
}

function isInstalledPwa() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
}

function PwaInstallPrompt() {
  const { t } = useLocale()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    if (isInstalledPwa()) return undefined
    const captureInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    window.addEventListener('beforeinstallprompt', captureInstallPrompt)
    if (isIosSafari()) setShowIosHelp(true)
    return () => window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
  }

  if (!deferredPrompt && !showIosHelp) return null
  return <aside className="pwa-install-prompt" aria-label={t('pwa.label')}>
    <span className="pwa-install-icon" aria-hidden="true"><Download size={19}/></span>
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-stone-100">{t('pwa.title')}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-stone-400">{deferredPrompt ? t('pwa.description') : <>{t('pwa.iosInstructionBefore')} <Share size={13} className="inline -translate-y-px" aria-label={t('pwa.share')}/> {t('pwa.iosInstructionAfter')} <b>{t('pwa.addToHomeScreen')}</b>.</>}</p>
    </div>
    {deferredPrompt ? <button type="button" onClick={install} className="pwa-install-button">{t('pwa.install')}</button> : <button type="button" onClick={() => setShowIosHelp(false)} aria-label={t('pwa.close')} className="pwa-install-close"><X size={18}/></button>}
  </aside>
}

function usePageRouter() {
  const [pathname, setPathname] = useState(() => window.location.pathname || '/')
  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname || '/')
    window.addEventListener('popstate', updatePathname)
    return () => window.removeEventListener('popstate', updatePathname)
  }, [])
  const navigate = (to) => {
    if (window.location.pathname !== to) window.history.pushState({}, '', to)
    setPathname(to)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  return { pathname, navigate }
}

function readRouteData(key) {
  try { return JSON.parse(window.sessionStorage.getItem(key) || 'null') } catch { return null }
}

function writeRouteData(key, value) {
  if (value) window.sessionStorage.setItem(key, JSON.stringify(value))
  else window.sessionStorage.removeItem(key)
}

function AppWorkspace({ locale, setLocale, theme, setTheme }) {
  const [family, setFamily] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [qariId, setQariId] = useState(DEFAULT_QARI_ID)
  const { pathname, navigate } = usePageRouter()
  useEffect(() => {
    let active = true
    const profileLoad = hasLegacyStorage() ? migrateLegacyStorage().then(getProfile) : getProfile()
    Promise.all([profileLoad, getQuranQari()]).then(([saved, savedQari]) => {
      if (!active || !saved) return
      setFamily(normalizeFamilyProfile(saved))
      setQariId(qariFor(savedQari?.value).id)
    }).catch(() => {}).finally(() => { if (active) setIsReady(true) })
    return () => { active = false }
  }, [])
  const clearRouteDataForChildren = (childIds) => {
    const target = readRouteData(ACTIVE_TARGET_KEY)
    const memory = readRouteData(ACTIVE_MEMORY_KEY)
    if (target && childIds.includes(target.childId)) {
      writeRouteData(ACTIVE_TARGET_KEY, null)
      writeRouteData(ACTIVE_PRACTICE_SESSION_KEY, null)
    }
    if (memory && childIds.includes(memory.childId)) writeRouteData(ACTIVE_MEMORY_KEY, null)
  }
  const saveFamily = async (next, removedChildIds = []) => {
    const normalized = normalizeFamilyProfile(next)
    const deleted = [...new Set(removedChildIds)]
    await db.transaction('rw', db.profiles, db.targets, db.memories, db.coachCheckins, async () => {
      await Promise.all(deleted.flatMap((childId) => [db.targets.where('childId').equals(childId).delete(), db.memories.where('childId').equals(childId).delete(), db.coachCheckins.where('childId').equals(childId).delete()]))
      if (normalized.children.length) await db.profiles.put({ ...normalized, updatedAt: new Date().toISOString() })
      else await db.profiles.delete('family')
    })
    clearRouteDataForChildren(deleted)
    setFamily(normalized.children.length ? normalized : null)
  }
  const clearActiveRouteData = () => {
    writeRouteData(ACTIVE_TARGET_KEY, null)
    writeRouteData(ACTIVE_MEMORY_KEY, null)
    writeRouteData(ACTIVE_PRACTICE_SESSION_KEY, null)
  }
  const exportData = async () => {
    const backup = await createBackup()
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const href = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = href
    link.download = `wali-tahfiz-cadangan-${todayKey()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(href)
  }
  const importData = async (backup) => {
    const restored = await restoreBackup(backup)
    clearActiveRouteData()
    setFamily(restored)
  }
  const resetData = async () => {
    await clearAllData()
    clearActiveRouteData()
    setFamily(null)
    navigate('/')
  }
  const selectChild = (childId) => {
    if (!family?.children.some((child) => child.id === childId) || family.activeChildId === childId) return
    const next = { ...family, activeChildId: childId }
    setFamily(next)
    saveProfile(next)
  }
  const activeChild = family?.children.find((child) => child.id === family.activeChildId) || family?.children[0]
  const profile = activeChild ? { ...activeChild, role: family.role } : null
  const openPractice = (target) => {
    if (!profile || target.childId !== profile.id) return
    writeRouteData(ACTIVE_TARGET_KEY, target)
    writeRouteData(ACTIVE_PRACTICE_SESSION_KEY, { targetId: target.id, phase: 'talaqqi', currentAyah: target.startAyah, tikrarCount: 0 })
    navigate('/talaqqi')
  }
  const openReview = (memory) => {
    if (!profile || !memory || memory.childId !== profile.id) return
    writeRouteData(ACTIVE_MEMORY_KEY, memory)
    navigate('/murojaah')
  }
  const endPracticeForToday = () => {
    writeRouteData(ACTIVE_PRACTICE_SESSION_KEY, null)
    writeRouteData(ACTIVE_TARGET_KEY, null)
    navigate('/')
  }
  const finishNewTarget = async (target, { rabtScope = 'none' } = {}) => {
    if (!profile || target.childId !== profile.id) return endPracticeForToday()
    const completed = { ...target, status: 'done' }
    await db.targets.put(completed)
    await completeTodayCoachAction(profile.id)
    const existing = await db.memories.where('childId').equals(profile.id).filter((memory) => memory.surahId === target.surahId && memory.startAyah === target.startAyah && memory.endAyah === target.endAyah).first()
    if (!existing) await db.memories.put(createScheduledMemory({ id: makeId('memory'), childId: profile.id, surahId: target.surahId, startAyah: target.startAyah, endAyah: target.endAyah }, todayKey()))
    const surah = surahFor(target.surahId)
    const memories = await db.memories.where('childId').equals(profile.id).filter((memory) => memory.surahId === target.surahId).toArray()
    const cardAlreadyCoversSurah = target.startAyah === 1 && target.endAyah === surah?.ayat
    if (rabtScope !== 'surah' && !cardAlreadyCoversSurah && surah && coversWholeSurah(memories, surah.ayat)) {
      writeRouteData(ACTIVE_PRACTICE_SESSION_KEY, { targetId: target.id, phase: 'rabt', currentAyah: target.endAyah, rabtScope: 'surah', rabtStartAyah: 1, rabtEndAyah: surah.ayat, rabtStepIndex: 0 })
      navigate('/rabt')
      return
    }
    endPracticeForToday()
  }
  const finishReview = async (memory, result) => {
    if (!profile || memory.childId !== profile.id) { writeRouteData(ACTIVE_MEMORY_KEY, null); navigate('/'); return }
    await db.memories.put(scheduleReviewResult(memory, result, todayKey()))
    await completeTodayCoachAction(profile.id)
    const targets = await getTargetsForMemory(profile.id, memory.id)
    await Promise.all(targets.filter((target) => target.status !== 'done').map((target) => db.targets.put({ ...target, status: 'done' })))
    writeRouteData(ACTIVE_MEMORY_KEY, null)
    navigate('/')
  }
  const home = profile ? <Home profile={profile} family={family} onSelectChild={selectChild} settings={() => navigate('/settings')} audioLibrary={() => navigate('/audio')} openPractice={openPractice} openReview={openReview}/> : null
  if (!isReady) return <main className="flex min-h-screen items-center justify-center bg-cream"><p className="font-display text-xl text-forest">Menyiapkan data keluarga…</p></main>
  if (!family || !profile) return <Onboarding save={saveFamily} onImport={importData} locale={locale} saveLocale={setLocale} theme={theme} setTheme={setTheme}/>
  if (pathname === '/settings') return <Suspense fallback={<RouteFallback/>}><LazySettingsPage family={family} save={saveFamily} back={() => navigate('/')} onExport={exportData} onImport={importData} onReset={resetData} qariId={qariId} saveQari={async (nextQariId) => { const normalized = qariFor(nextQariId).id; await saveQuranQari(normalized); setQariId(normalized) }} locale={locale} saveLocale={setLocale} theme={theme} setTheme={setTheme} ui={{ ChildEditor, ChildList, PageHeader, RolePicker }}/></Suspense>
  if (pathname === '/audio') return <Suspense fallback={<RouteFallback/>}><LazyQuranRangePage back={() => navigate('/')} qariId={qariId} onQariChange={async (nextQariId) => { const normalized = qariFor(nextQariId).id; await saveQuranQari(normalized); setQariId(normalized) }}/></Suspense>
  if (['/talaqqi', '/tikrar', '/rabt'].includes(pathname)) {
    const target = readRouteData(ACTIVE_TARGET_KEY)
    if (!target || target.childId !== profile.id) {
      writeRouteData(ACTIVE_TARGET_KEY, null)
      writeRouteData(ACTIVE_PRACTICE_SESSION_KEY, null)
      return home
    }
    const phase = pathname.slice(1)
    const storedSession = readRouteData(ACTIVE_PRACTICE_SESSION_KEY)
    const session = storedSession?.targetId === target.id ? storedSession : { targetId: target.id, phase, currentAyah: target.startAyah, tikrarCount: 0 }
    return <Suspense fallback={<RouteFallback/>}><LazyNewMemoryFlow target={target} profile={profile} phase={phase} session={session} qariId={qariId} onCancel={endPracticeForToday} onNavigate={navigate} onUpdateSession={(next) => writeRouteData(ACTIVE_PRACTICE_SESSION_KEY, next)} onFinish={(details) => finishNewTarget(target, details)} onEndSession={endPracticeForToday}/></Suspense>
  }
  if (pathname === '/murojaah') {
    const memory = readRouteData(ACTIVE_MEMORY_KEY)
    if (!memory || memory.childId !== profile.id) {
      writeRouteData(ACTIVE_MEMORY_KEY, null)
      return home
    }
    return <Suspense fallback={<RouteFallback/>}><LazyReviewPlayer memory={memory} page qariId={qariId} onClose={() => navigate('/')} onReviewed={(result) => finishReview(memory, result)}/></Suspense>
  }
  return <>{home}<PwaInstallPrompt/></>
}

export default function App() {
  const [locale, setLocale] = useState(DEFAULT_LOCALE)
  const [theme, setTheme] = useState(() => window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light')
  const updateTheme = (nextTheme) => {
    const resolvedTheme = applyTheme(nextTheme)
    setTheme(resolvedTheme)
  }
  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  useEffect(() => {
    let active = true
    getAppLocale().then((preference) => {
      const savedLocale = preference?.value
      if (active && SUPPORTED_LOCALES.some((option) => option.id === savedLocale)) setLocale(savedLocale)
    }).catch(() => {})
    return () => { active = false }
  }, [])
  const updateLocale = (nextLocale) => {
    if (!SUPPORTED_LOCALES.some((option) => option.id === nextLocale)) return
    setLocale(nextLocale)
    saveAppLocale(nextLocale).catch(() => {})
  }
  return <LocaleProvider locale={locale}><AppWorkspace locale={locale} setLocale={updateLocale} theme={theme} setTheme={updateTheme}/></LocaleProvider>
}
