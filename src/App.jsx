import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Baby, Bot, CalendarDays, Check, ChevronDown, CircleCheck, Download, FileText, Headphones, House, Moon, Play, Plus, RotateCcw, Search, Settings, Share, Sparkles, Sun, Trash2, Upload, UserRound, X } from 'lucide-react'
import { clearAllData, createBackup, db, getAppLocale, getProfile, getQuranQari, getTargetsForDay, getTargetsForMemory, hasLegacyStorage, migrateLegacyStorage, normalizeFamilyProfile, restoreBackup, saveAppLocale, saveProfile, saveQuranQari } from './db'
import { DEFAULT_QARI_ID, qariFor } from './quranAudio'
   import { DEFAULT_LOCALE, LocaleProvider, SUPPORTED_LOCALES, useLocale } from './i18n'
   import { applyTheme, getInitialTheme, THEME_STORAGE_KEY } from './theme'
   import { createCoachCheckin, isPersonalAdvice, readinessForCondition } from './coachCheckin'
import { createScheduledMemory, getReviewRecommendations, hasReviewTargetForToday, isCreatedToday, localDateKey, reviewDueState, scheduleReviewResult } from './reviewSchedule'
import { QURAN_CATALOGUE } from './quranCatalogue'
import { applyValidatedProgress, validateProgressEntries, validateProgressResponse } from './progress'
import { AUDIO_SURAHS, rangeLabel, surahFor } from './surahData'

const LazySettingsPage = lazy(() => import('./SettingsPage'))
const LazyQuranRangePage = lazy(() => import('./QuranRangePage'))
const LazyReviewPlayer = lazy(() => import('./ReviewPlayer'))
const LazyNewMemoryFlow = lazy(() => import('./NewMemoryFlow'))
const LazyReportPage = lazy(() => import('./ReportPage'))
const RouteFallback = () => <main className="page-root flex items-center justify-center"><p className="font-display text-xl text-forest">Menyiapkan halaman…</p></main>

const childDefaults = { name: '', age: '', icon: '🌙', memorized: [], repeats: { talaqqi: 3, tikrar: 10, rabt: 1 } }
const icons = ['🌙', '⭐', '🕌', '🌿', '🕊️', '🌸']
const onboardingSurahs = [AUDIO_SURAHS.find((surah) => surah.id === '1'), ...AUDIO_SURAHS.filter((surah) => surah.group === 'juz30').reverse()]
const todayKey = () => localDateKey()
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const createChild = () => ({ id: makeId('child'), ...childDefaults, memorized: [], repeats: { ...childDefaults.repeats } })
const dueLabel = (memory, t) => {
  const due = reviewDueState(memory, todayKey())
  return due.status === 'due' ? t('home.due') : t('home.dueIn', { days: due.days })
}
const ACTIVE_TARGET_KEY = 'wali-tahfiz:active-target'
const ACTIVE_MEMORY_KEY = 'wali-tahfiz:active-memory'
const ACTIVE_PRACTICE_SESSION_KEY = 'wali-tahfiz:active-practice-session'
const childConditions = [['tantrum', '😭', 'Tantrum'], ['tidak-mood', '😒', 'Tidak mood'], ['ingin-main', '⚽', 'Mau main'], ['lelah', '😴', 'Lelah'], ['siap', '✨', 'Siap belajar']]
const completeTodayCoachAction = async (childId) => {
  const checkin = await db.coachCheckins.where('[childId+date]').equals([childId, todayKey()]).first()
  if (!checkin || checkin.actionStatus !== 'acted' || !['start', 'review', 'new'].includes(checkin.actionTaken)) return
  await db.coachCheckins.put({ ...checkin, actionStatus: 'completed', updatedAt: new Date().toISOString() })
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
    {childConditions.map(([value, emoji, label]) => <button type="button" key={value} aria-pressed={selected === value} onClick={() => onChange(selected === value ? [] : [value])} className={`condition-chip ${selected === value ? 'condition-chip-active' : ''}`}>
      <span>{emoji} {label}</span>
    </button>)}
  </div>
}
function Select({ label, value, onChange, options }) {
  const { t } = useLocale()
  return <Field label={label}><div className="memory-picker" role="group" aria-label={label}>{options.map((option, index) => { const active = option.value === value; return <button type="button" aria-pressed={active} key={option.value} onClick={() => onChange({ target: { value: option.value } })} className={'memory-picker-option ' + (active ? 'memory-picker-option-active' : '')}><span className={'memory-picker-number ' + (active ? 'memory-picker-number-active' : '')}>{String(index + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1 text-left"><b className="block text-forest">{option.label}</b><small className="mt-0.5 block text-stone-500 dark:text-stone-400">{t('addTarget.tapToSelect')}</small></span><span className={'memory-picker-check ' + (active ? 'memory-picker-check-active' : '')} aria-hidden="true">{active && <Check size={15}/>}</span></button> })}</div></Field>
}
function MemoryPicker({ memories, value, onChange }) {
  const { t } = useLocale()
  return <Field label={t('addTarget.selectMemoryLabel')} hint={t('addTarget.selectMemoryHint')}>
    <div className="memory-picker" role="group" aria-label={t('addTarget.selectMemory')}>
      {memories.map((memory) => {
        const item = surahFor(memory.surahId)
        const active = memory.id === value
        return <button type="button" aria-pressed={active} key={memory.id} onClick={() => onChange(memory.id)} className={`memory-picker-option ${active ? 'memory-picker-option-active' : ''}`}>
          <span className={`memory-picker-number ${active ? 'memory-picker-number-active' : ''}`}>{item?.id}</span>
          <span className="min-w-0 flex-1 text-left"><b className="block truncate text-forest">QS. {item?.name || t('common.surah')}</b><small className="mt-0.5 block text-stone-500 dark:text-stone-400">{rangeLabel(memory.startAyah, memory.endAyah, t)} · {memory.endAyah - memory.startAyah + 1} {t('practice.rangeUnit').toLowerCase()}</small></span>
          <span className={`memory-picker-check ${active ? 'memory-picker-check-active' : ''}`} aria-hidden="true">{active && <Check size={15}/>}</span>
        </button>
      })}
    </div>
  </Field>
}
function parseSurahRange(value, availableSurahs, t) {
  const match = value.trim().match(/^(\d{1,3})\s*:\s*(\d+)\s*-\s*(\d+)$/)
  if (!match) return { error: t('addTarget.formatError') }
  const [, surahId, startValue, endValue] = match
  const surah = availableSurahs.find((item) => item.id === surahId)
  const startAyah = Number(startValue)
  const endAyah = Number(endValue)
  if (!surah) return { error: t('addTarget.surahUnavailableError') }
  if (startAyah < 1 || endAyah > surah.ayat || startAyah > endAyah) return { error: t('addTarget.rangeError', { name: surah.name, max: surah.ayat }) }
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
      <button type="button" onClick={() => onChange(isCustom ? value : '')} aria-pressed={isCustom} className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow] active:scale-[0.96] ${isCustom ? 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-md dark:bg-emerald-900/80 dark:text-emerald-100' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400'}`}>Custom...</button>
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
      <div className="flex shrink-0 items-center gap-1">{onEdit && <button type="button" onClick={() => onEdit(child.id)} aria-label={t('onboardingStep2.editProfile', { name: child.name || t('onboardingStep2.childFallback') })} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xs font-bold text-forest transition-[transform,background-color] hover:bg-white active:scale-[0.96]">{t('onboardingStep2.edit')}</button>}{onRemove && <button type="button" onClick={() => onRemove(child.id)} aria-label={t('onboardingStep2.deleteProfile', { name: child.name || t('onboardingStep2.childFallback') })} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-terracotta transition-[transform,background-color] hover:bg-surface-warm active:scale-[0.96]"><Trash2 size={18}/></button>}</div>
    </article>
  })}</div>
}

function OnboardingShell({ step, children, footer, locale, saveLocale, theme, setTheme }) {
  const { t } = useLocale()
  const progress = [1, 2]
  return <main className="app-page onboarding-page">
    <div className="page-shell page-shell-onboarding">
      <h1 className="sr-only">Wali Tahfiz Corner</h1>
      <PageHeader title={t('onboarding.headerTitle')} action={<div className="flex items-center gap-2"><div className="flex rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900/80" role="group" aria-label={t('language.label')}>{SUPPORTED_LOCALES.map((option) => <button key={option.id} type="button" onClick={() => saveLocale?.(option.id)} aria-pressed={locale === option.id} className={`min-h-9 rounded-lg px-2.5 text-xs font-bold transition-[background-color,color] ${locale === option.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100'}`}>{option.shortLabel}</button>)}</div><button type="button" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? t('onboarding.switchToLight') : t('onboarding.switchToDark')} title={theme === 'dark' ? t('onboarding.switchToLight') : t('onboarding.switchToDark')} className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-emerald-700 transition-[transform,background-color,color] hover:bg-stone-100 hover:text-emerald-800 active:scale-[0.96] dark:border-stone-800 dark:bg-stone-900/80 dark:text-emerald-300 dark:hover:bg-stone-800 dark:hover:text-emerald-100">{theme === 'dark' ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}</button></div>}/>
      <section className="glass-card onboarding-card">
        <div className="onboarding-hero">
          <div className="onboarding-hero-copy">
            <span className="onboarding-hero-mark" aria-hidden="true"><img src="/icons/app-icon.svg" alt="Logo Wali Tahfiz" width="40" height="40"/></span>
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

function ChildSwitcher({ family, onSelect, onManage }) {
  const [open, setOpen] = useState(false)
  const activeChild = family.children.find((child) => child.id === family.activeChildId)
  if (!activeChild) return null
  return <div className="child-switcher relative"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox" aria-label="Pilih anak aktif" className="child-switcher-trigger"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-base text-forest dark:bg-surface">{activeChild.icon}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-white/65">Anak aktif</span><span className="block max-w-28 truncate text-sm font-bold">{activeChild.name}</span></span><ChevronDown size={17} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}/></button>{open && <section className="absolute right-0 z-30 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-[24px] bg-white p-2 text-stone-700 shadow-[0_18px_42px_rgba(30,55,40,.28)] dark:bg-surface dark:text-stone-200 dark:shadow-2xl" role="listbox" aria-label="Pilih anak yang ditemani">{family.children.map((child) => <button type="button" key={child.id} role="option" aria-selected={child.id === activeChild.id} onClick={() => { onSelect(child.id); setOpen(false) }} className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left transition-[transform,background-color] active:scale-[0.96] ${child.id === activeChild.id ? 'bg-surface-muted text-forest dark:bg-emerald-950/60' : 'hover:bg-surface-raised dark:hover:bg-emerald-950/40'}`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg shadow-sm dark:bg-stone-900 dark:shadow-none">{child.icon}</span><span className="min-w-0 flex-1"><b className="block truncate">{child.name}</b><small className="block text-stone-500 dark:text-stone-400">{child.age ? `${child.age} tahun` : 'Usia belum diisi'}</small></span>{child.id === activeChild.id && <Check size={17} className="text-forest"/>}</button>)}<div className="mt-1 border-t border-sage/70 pt-1 dark:border-emerald-900/50"><button type="button" onClick={() => { setOpen(false); onManage() }} className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-sm font-bold text-terracotta transition-[transform,background-color] hover:bg-surface-warm active:scale-[0.96] dark:hover:bg-emerald-950/40"><Settings size={16}/> Kelola anak</button></div></section>}</div>
}




function AddTargetSheet({ memories, targets = [], initialSurahId = '1', onSave, onClose }) {
  const { t } = useLocale()
  const newSurahs = onboardingSurahs
  const [type, setType] = useState('new')
  const [reviewMode, setReviewMode] = useState('saved')
  const [surahId, setSurahId] = useState(() => newSurahs.some((surah) => surah.id === initialSurahId) ? initialSurahId : '1')
  const [memoryId, setMemoryId] = useState(memories[0]?.id || '')
  const [startAyah, setStartAyah] = useState(1)
  const [endAyah, setEndAyah] = useState(4)
  const [isSurahPickerOpen, setIsSurahPickerOpen] = useState(false)
  const [surahQuery, setSurahQuery] = useState('')
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState('')
  const useCustomPicker = type === 'new' || (type === 'review' && reviewMode === 'custom')
  const selectedMemory = memories.find((memory) => memory.id === memoryId)
  const selectedSurah = surahFor((!useCustomPicker && selectedMemory) ? selectedMemory.surahId : surahId)
  const visibleSurahs = newSurahs.filter((surah) => `${surah.id} ${surah.name}`.toLocaleLowerCase('id-ID').includes(surahQuery.toLocaleLowerCase('id-ID').trim()))
  const start = (!useCustomPicker && selectedMemory) ? selectedMemory.startAyah : startAyah
  const end = (!useCustomPicker && selectedMemory) ? selectedMemory.endAyah : endAyah
  const targetSurahId = (!useCustomPicker && selectedMemory) ? selectedMemory.surahId : surahId
  const safeTargets = Array.isArray(targets) ? targets : []
  const isOverlapping = (type === 'new' && memories.some((memory) =>
    String(memory.surahId) === String(targetSurahId) &&
    Math.max(start, Number(memory.startAyah)) <= Math.min(end, Number(memory.endAyah))
  )) || safeTargets.some((tgt) =>
    String(tgt.surahId) === String(targetSurahId) &&
    tgt.type === type &&
    Math.max(start, Number(tgt.startAyah)) <= Math.min(end, Number(tgt.endAyah))
  )
  const getUnmemorizedRanges = () => {
    if (!selectedSurah) return []
    const totalAyah = selectedSurah.ayat
    const covered = new Array(totalAyah + 1).fill(false)
    memories
      .filter((m) => String(m.surahId) === String(surahId))
      .forEach((m) => {
        const s = Math.max(1, Number(m.startAyah))
        const e = Math.min(totalAyah, Number(m.endAyah))
        for (let i = s; i <= e; i++) {
          covered[i] = true
        }
      })
    const ranges = []
    let currentStart = null
    for (let i = 1; i <= totalAyah; i++) {
      if (!covered[i]) {
        if (currentStart === null) currentStart = i
      } else {
        if (currentStart !== null) {
          ranges.push({ startAyah: currentStart, endAyah: i - 1 })
          currentStart = null
        }
      }
    }
    if (currentStart !== null) {
      ranges.push({ startAyah: currentStart, endAyah: totalAyah })
    }
    return ranges
  }
  const unmemorizedRanges = getUnmemorizedRanges()
  const activeTargetsCount = safeTargets.filter(tgt => tgt.status !== 'done').length
  const canSave = (useCustomPicker
    ? selectedSurah && startAyah >= 1 && endAyah <= selectedSurah.ayat && startAyah <= endAyah
    : Boolean(selectedMemory)) && !isOverlapping && activeTargetsCount < 3
  const chooseSurah = (id) => {
    const nextSurah = surahFor(id)
    setSurahId(id)
    setStartAyah(1)
    setEndAyah(Math.min(2, nextSurah.ayat))
    setSurahQuery('')
    setIsSurahPickerOpen(false)
  }
  const applyRange = () => {
    const parsed = parseSurahRange(rangeInput, newSurahs, t)
    if (parsed.error) return setRangeError(parsed.error)
    setSurahId(parsed.surah.id)
    setStartAyah(parsed.startAyah)
    setEndAyah(parsed.endAyah)
    setRangeError('')
    setIsSurahPickerOpen(false)
  }
  const save = () => {
    if (!canSave) return
    const matchingMemory = type === 'review' && reviewMode === 'custom'
      ? memories.find((m) => String(m.surahId) === String(surahId) && Number(m.startAyah) === startAyah && Number(m.endAyah) === endAyah)
      : null
    const targetMemoryId = type === 'review'
      ? (reviewMode === 'saved' ? memoryId : (matchingMemory?.id || null))
      : null
    onSave({ id: makeId('target'), type, surahId: targetSurahId, startAyah: start, endAyah: end, status: 'todo', createdAt: new Date().toISOString(), memoryId: targetMemoryId })
  }
  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="sheet" role="dialog" aria-modal="true" aria-labelledby="target-sheet-title"><div className="flex items-start justify-between"><div><p className="step-label bg-peach text-terracotta">{t('home.todayTargets').toUpperCase()}</p><h2 id="target-sheet-title" className="font-display mt-2 text-2xl text-forest">{t('addTarget.title')}</h2><p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('addTarget.desc')}</p></div><button type="button" onClick={onClose} aria-label={t('common.close')} className="icon-button"><X size={19}/></button></div><div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-surface-raised p-1 dark:bg-emerald-950/60"><button type="button" onClick={() => setType('new')} className={`rounded-xl px-3 py-3 text-sm font-bold ${type === 'new' ? 'bg-white text-forest shadow-sm dark:bg-surface' : 'text-stone-500 dark:text-stone-400'}`}>{t('addTarget.new')}</button><button type="button" onClick={() => { setType('review'); setReviewMode('saved') }} className={`rounded-xl px-3 py-3 text-sm font-bold ${type === 'review' ? 'bg-white text-forest shadow-sm dark:bg-surface' : 'text-stone-500 dark:text-stone-400'}`}>{t('addTarget.review')}</button></div>{useCustomPicker ? <div className="mt-5 space-y-4">{type === 'review' && <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-surface-raised p-1 dark:bg-emerald-950/60"><button type="button" onClick={() => setReviewMode('saved')} className={`rounded-xl px-3 py-2 text-xs font-bold ${reviewMode === 'saved' ? 'bg-white text-forest shadow-sm dark:bg-surface' : 'text-stone-500 dark:text-stone-400'}`}>{t('addTarget.savedMemory')}</button><button type="button" onClick={() => setReviewMode('custom')} className={`rounded-xl px-3 py-2 text-xs font-bold ${reviewMode === 'custom' ? 'bg-white text-forest shadow-sm dark:bg-surface' : 'text-stone-500 dark:text-stone-400'}`}>{t('addTarget.customRange')}</button></div>}<Field label={t('addTarget.chooseSurah')}><button type="button" onClick={() => setIsSurahPickerOpen((open) => !open)} aria-expanded={isSurahPickerOpen} aria-controls="surah-picker" className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white px-4 text-left text-forest shadow-sm transition-[transform,box-shadow] active:scale-[0.96] dark:bg-surface dark:shadow-none"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-peach font-bold tabular-nums text-terracotta">{selectedSurah?.id}</span><span className="min-w-0 flex-1"><b className="block">QS. {selectedSurah?.name}</b><small className="block text-stone-500 dark:text-stone-400">{selectedSurah?.ayat} {t('practice.rangeUnit').toLowerCase()}</small></span><Search size={18} className="text-terracotta"/><ChevronDown size={18} className={`text-forest transition-transform ${isSurahPickerOpen ? 'rotate-180' : ''}`}/></button>{isSurahPickerOpen && <div id="surah-picker" className="mt-2 rounded-[20px] bg-surface-raised p-2 shadow-[0_12px_28px_rgba(71,119,92,.13)] dark:bg-emerald-950/60 dark:shadow-none"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest" size={18}/><input autoFocus value={surahQuery} onChange={(event) => setSurahQuery(event.target.value)} placeholder={t('addTarget.searchSurah')} className="input-field pl-10" aria-label={t('addTarget.searchSurahLabel')}/></label><div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1" role="group" aria-label="Surah search results">{visibleSurahs.length ? visibleSurahs.map((surah) => <button type="button" aria-pressed={surah.id === surahId} key={surah.id} onClick={() => chooseSurah(surah.id)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-[transform,background-color] active:scale-[0.96] ${surah.id === surahId ? 'bg-white text-forest shadow-sm dark:bg-surface' : 'text-stone-600 hover:bg-white/70 dark:text-stone-300 dark:hover:bg-white/10'}`}><span className="w-7 font-bold tabular-nums text-terracotta">{surah.id}</span><span className="min-w-0 flex-1 font-semibold">{surah.name}</span><small className="text-stone-500 dark:text-stone-400">{surah.ayat} {t('practice.rangeUnit').toLowerCase()}</small></button>) : <p className="p-3 text-center text-sm text-stone-500 dark:text-stone-400">{t('addTarget.surahNotFound')}</p>}</div></div>}</Field><div className="grid grid-cols-2 gap-3"><Field label={t('addTarget.startVerse')}><input type="number" min="1" max={selectedSurah?.ayat} value={startAyah} onChange={(event) => { const next = Math.max(1, Math.min(selectedSurah?.ayat || 1, Number(event.target.value) || 1)); setStartAyah(next); if (next > endAyah) setEndAyah(next) }} className="input-field"/></Field><Field label={t('addTarget.endVerse')}><input type="number" min={startAyah} max={selectedSurah?.ayat} value={endAyah} onChange={(event) => setEndAyah(Math.max(startAyah, Math.min(selectedSurah?.ayat || 1, Number(event.target.value) || startAyah)))} className="input-field"/></Field></div><Field label={t('addTarget.quickEntry')} hint={t('addTarget.quickEntryHint')}><div className="flex gap-2"><input value={rangeInput} onChange={(event) => { setRangeInput(event.target.value); setRangeError('') }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyRange() } }} placeholder="78:1-5" inputMode="text" className="input-field min-w-0 font-mono" aria-describedby={rangeError ? 'range-error' : undefined}/><button type="button" onClick={applyRange} className="shrink-0 rounded-2xl bg-forest px-4 text-sm font-bold text-white transition-transform active:scale-[0.96]">{t('addTarget.use')}</button></div>{rangeError && <p id="range-error" role="alert" className="mt-2 text-xs font-semibold leading-relaxed text-terracotta">{rangeError}</p>}</Field>{isOverlapping && (
        <div className="rounded-xl bg-surface-warning p-3 text-xs font-semibold leading-relaxed text-terracotta dark:bg-amber-950/40 dark:text-amber-200" role="alert">
          <div>{t('addTarget.overlapWarning')}</div>
          {unmemorizedRanges.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-terracotta/10">
              <p className="font-bold text-terracotta/90 mb-1.5">{t('addTarget.suggestedRange')}</p>
              <div className="flex flex-wrap gap-1.5">
                {unmemorizedRanges.map((range, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setStartAyah(range.startAyah)
                      setEndAyah(range.endAyah)
                    }}
                    className="rounded-lg bg-white border border-terracotta/20 px-2.5 py-1 text-[11px] font-bold text-terracotta hover:bg-surface-warm active:scale-[0.96] transition-transform shadow-xs dark:bg-stone-900 dark:border-stone-800"
                  >
                    Ayat {range.startAyah}–{range.endAyah}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}{activeTargetsCount >= 3 && (
        <div className="rounded-xl bg-surface-warning p-3 text-xs font-semibold leading-relaxed text-terracotta dark:bg-amber-950/40 dark:text-amber-200" role="alert">
          <div>{t('agent.maxTargetsReached')}</div>
        </div>
      )}{type === 'review' && <p className="rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed text-forest dark:bg-emerald-950/60">{t('addTarget.reviewCustomNotice')}</p>}</div> : <div className="mt-5 space-y-4"><div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-surface-raised p-1 dark:bg-emerald-950/60"><button type="button" onClick={() => setReviewMode('saved')} className={`rounded-xl px-3 py-2 text-xs font-bold ${reviewMode === 'saved' ? 'bg-white text-forest shadow-sm dark:bg-surface' : 'text-stone-500 dark:text-stone-400'}`}>{t('addTarget.savedMemory')}</button><button type="button" onClick={() => setReviewMode('custom')} className={`rounded-xl px-3 py-2 text-xs font-bold ${reviewMode === 'custom' ? 'bg-white text-forest shadow-sm dark:bg-surface' : 'text-stone-500 dark:text-stone-400'}`}>{t('addTarget.customRange')}</button></div>{memories.length ? <><Select label={t('addTarget.savedMemory')} value={memoryId} onChange={(event) => setMemoryId(event.target.value)} options={memories.map((memory) => { const item = surahFor(memory.surahId); return { value: memory.id, label: `${item?.name || t('common.surah')} · ${rangeLabel(memory.startAyah, memory.endAyah, t)}` } })}/><p className="rounded-2xl bg-surface-muted p-4 text-sm leading-relaxed text-forest dark:bg-emerald-950/60">{t('addTarget.reviewNotice')}</p></> : <div className="rounded-2xl bg-surface-warning p-5 text-sm leading-relaxed text-terracotta dark:bg-amber-950/40 dark:text-amber-200">{t('addTarget.noMemory')}</div>}</div>}<div className="mt-6 rounded-2xl bg-surface-warm p-4 text-center dark:bg-emerald-950/40"><p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400 dark:text-stone-500">{t('addTarget.preview')}</p><p className="mt-1 font-display text-lg text-forest">{selectedSurah?.name || t('addTarget.chooseSurah')} · {rangeLabel(start, end, t)}</p></div><button type="button" disabled={!canSave} onClick={save} className="primary-button mt-6 disabled:cursor-not-allowed disabled:opacity-45"><Plus size={19}/> {t('addTarget.save')}</button></section></div>
}


function TargetCard({ target, onStart, onComplete, onDelete }) {
  const { t } = useLocale()
  const item = surahFor(target.surahId)
  const isNew = target.type === 'new'
  const isDone = target.status === 'done'
  const typeLabel = isNew ? t('targets.new') : t('targets.review')
  return <article className={`target-card ${isDone ? 'target-card-done' : ''}`}>
    <div className="flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isNew ? 'badge-new' : 'badge-review'}`}>{isNew ? <Sparkles size={20}/> : <RotateCcw size={20}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${isNew ? 'badge-new' : 'badge-review'}`}>{isNew ? <Sparkles aria-hidden="true" size={12}/> : <RotateCcw aria-hidden="true" size={12}/>} {typeLabel}</span>{isDone && <span className="status-pill"><CircleCheck size={13}/> {t('targets.done')}</span>}</div><h3 className="mt-2 font-display text-xl text-forest">{item?.name || t('common.surah')} <span className="font-sans text-sm font-semibold text-slate-400 dark:text-stone-400">· {rangeLabel(target.startAyah, target.endAyah, t)}</span></h3><p className="text-muted mt-1 text-sm">{isNew ? t('targets.newStory') : t('targets.reviewStory')}</p></div><button type="button" onClick={() => onDelete(target.id)} aria-label={t('common.delete')} className="text-slate-300 transition-colors hover:text-terracotta dark:text-stone-500"><Trash2 size={17}/></button></div>
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
      return <article key={memory.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-surface dark:shadow-none"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-forest">{item?.name || t('common.surah')} <span className="text-sm font-semibold text-slate-400 dark:text-stone-400">· {rangeLabel(memory.startAyah, memory.endAyah, t)}</span></h4><p className="mt-1 text-xs font-bold text-terracotta">{dueLabel(memory, t)}</p></div><Sparkles className="shrink-0 text-terracotta" size={17}/></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => onStart(memory)} className="secondary-button min-h-10 text-sm">{t('common.play')} <Play size={15} fill="currentColor"/></button><button type="button" onClick={() => onAdd(memory)} className="min-h-10 rounded-xl bg-forest px-3 text-sm font-bold text-white transition-transform active:scale-[0.96]">{t('recommendations.add')}</button></div></article>
    })}</div>
  </section>
}

const sortLearningQueue = (first, second) => {
  if (String(first.surahId) === String(second.surahId)) return Number(first.startAyah) - Number(second.startAyah) || Number(first.endAyah) - Number(second.endAyah)
  return String(first.createdAt || '').localeCompare(String(second.createdAt || ''))
}

function localCoachAdvice({ profile, targets, memories, conditions, listenRepeats, checkin }, t) {
  const todayTargets = targets.filter((target) => isCreatedToday(target.createdAt, todayKey()))
  const done = todayTargets.filter((target) => target.status === 'done').length
  const activeCount = todayTargets.length - done
  const isExtra = (target) => {
    if (done === 0) return false
    if (!checkin?.answeredAt) return false
    return target.createdAt > checkin.answeredAt
  }
  const remaining = todayTargets.filter((target) => target.status !== 'done' && !isExtra(target)).sort(sortLearningQueue)
  const due = getReviewRecommendations(memories, { today: todayKey(), limit: memories.length, excludedMemoryIds: todayTargets.filter((target) => target.type === 'review').map((target) => target.memoryId).filter(Boolean) })
  const child = profile.name || t('coach.childFallback')
  const lowEnergy = conditions.includes('tidak-mood') || conditions.includes('lelah')

  if (activeCount >= 3) {
    const firstActive = todayTargets.find((target) => target.status !== 'done')
    return {
      title: t('coach.advice.maxTargetsReachedTitle'),
      body: t('coach.advice.maxTargetsReachedBody', { child, count: activeCount }),
      action: t('coach.advice.startActiveTarget'),
      kind: 'start',
      target: firstActive,
      repeat: listenRepeats
    }
  }

  if (conditions.includes('tantrum')) return { title: t('coach.advice.tantrumTitle'), body: t('coach.advice.tantrumBody', { child }), action: t('coach.advice.pause'), kind: 'pause' }
  if (conditions.includes('ingin-main')) return { title: t('coach.advice.playTitle'), body: t('coach.advice.playBody', { child }), action: t('coach.advice.listen'), kind: 'listen' }
  if (conditions.includes('lelah')) return { title: t('coach.advice.restTitle'), body: t('coach.advice.restBody', { child }), action: t('coach.advice.listen'), kind: 'listen' }
  if (lowEnergy) return { title: t('coach.advice.restTitle'), body: t('coach.advice.restBody', { child }), action: t('coach.advice.pause'), kind: 'pause' }
  if (!todayTargets.length && due.length) {
    const item = surahFor(due[0].surahId)
    const range = rangeLabel(due[0].startAyah, due[0].endAyah, t)
    return { title: t('coach.advice.reviewTitle', { surah: item?.name || t('common.surah') }), body: t('coach.advice.reviewBody', { child, count: due.length }), action: t('coach.advice.addReviewRange', { surah: item?.name || t('common.surah'), range }), kind: 'review', memory: due[0] }
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
    const excludedIds = new Set(reviewTargets.map((target) => target.memoryId).filter(Boolean))
    const reviewMemory = due[0] || memories.filter((m) => !excludedIds.has(m.id)).sort(sortLearningQueue)[0]
    if (conditions.includes('siap')) {
      if (reviewMemory) {
        const item = surahFor(reviewMemory.surahId)
        const range = rangeLabel(reviewMemory.startAyah, reviewMemory.endAyah, t)
        return { title: t('coach.advice.celebrateTitle'), body: t('coach.advice.celebrateBody', { child }), action: t('coach.advice.addReviewRange', { surah: item?.name || t('common.surah'), range }), kind: 'review', memory: reviewMemory }
      }
      return { title: t('coach.advice.celebrateTitle'), body: t('coach.advice.celebrateBody', { child }), action: t('coach.advice.newTarget', { surah: nextSurah.name }), kind: 'new', surahId: nextSurah.id }
    }
    return { title: t('coach.advice.closeTitle'), body: t('coach.advice.closeBody'), action: t('coach.advice.pause'), kind: 'pause' }
  }
  const next = remaining[0]
  const item = surahFor(next.surahId)
  return { title: t('coach.advice.focusTitle', { surah: item?.name || t('common.target') }), body: t('coach.advice.focusBody', { count: remaining.length, range: rangeLabel(next.startAyah, next.endAyah, t), repeat: listenRepeats }), action: t('coach.advice.start', { repeat: listenRepeats }), kind: 'start', target: next, repeat: listenRepeats }
}

function checkinFollowUp(checkin, profile, t) {
  if (!checkin || checkin.actionStatus === 'suggested' || !t) return null
  const child = profile.name || t('coach.childFallback')
  if (checkin.actionStatus === 'completed') return t('agent.progressSaved')
  if (checkin.actionStatus === 'paused') return t('agent.pauseChosen', { childName: child })
  return t('agent.actionChosen', { childName: child })
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
  const [progressExpanded, setProgressExpanded] = useState(false)
  const closeButtonRef = useRef(null)
  const messagesEndRef = useRef(null)
  const advice = localCoachAdvice({ profile, targets, memories, conditions, listenRepeats, checkin }, t)
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
    const today = todayKey()
    const lastOpened = window.localStorage.getItem(`last_opened_coach_${profile.id}`)
    if (lastOpened === today) return undefined
    const timer = window.setTimeout(() => {
      openConversation()
      window.localStorage.setItem(`last_opened_coach_${profile.id}`, today)
    }, 800)
    return () => window.clearTimeout(timer)
  }, [profile.id])
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
    const nextConditions = conditions.includes(condition) && conditions.length === 1 ? [] : [condition]
    const nextAdvice = localCoachAdvice({ profile, targets, memories, conditions: nextConditions, listenRepeats, checkin }, t)
    // Primary condition dictates general readiness
    const primaryCondition = nextConditions[0] || 'siap'
    const nextReadiness = readinessForCondition(primaryCondition)
    const answeredAt = new Date().toISOString()
    setAiStatus('')
    setConditions(nextConditions)
    setReadiness(nextReadiness)

    const moodLabels = nextConditions.map(c => moodLabel(c)).join(', ') || t('coach.condition.ready')
    setMessages((items) => [...items, { id: `${Date.now()}-user`, role: 'user', text: moodLabels }, { id: `${Date.now()}-agent`, role: 'agent', text: `${nextAdvice.title}. ${nextAdvice.body}` }])
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
    pushMessage({ role: 'user', text: advice.action })
    pushMessage({ role: 'agent', text: advice.kind === 'pause' ? t('agent.pauseChosen', { childName: child }) : t('agent.actionChosen', { childName: child }) })
  }
  return <>
    {open && <div className="coach-dialog-layer">
      <button type="button" className="coach-dialog-backdrop" onClick={closeConversation} aria-label={t('agent.closeConversation')}/>
      <section className="coach-panel coach-conversation-panel" role="dialog" aria-modal="true" aria-labelledby="coach-conversation-title">
        <div className="coach-panel-header bg-emerald-50/40 border-b border-emerald-950/5 dark:bg-emerald-950/10 py-3.5 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="coach-avatar shadow-inner rounded-xl"><Bot size={20}/></span>
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
                {t('agent.badge')}
              </span>
              <h2 id="coach-conversation-title" className="font-display text-base font-bold text-forest dark:text-emerald-300 leading-tight">
                {t('agent.title', { name: child })}
              </h2>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" className="coach-close !h-9 !w-9 rounded-lg border border-stone-200/60 dark:border-stone-800/80 bg-white dark:bg-stone-900 shadow-sm flex items-center justify-center text-stone-500 hover:text-stone-800 active:scale-[0.96]" onClick={closeConversation} aria-label={t('agent.closeConversation')}>
            <X size={17}/>
          </button>
        </div>
        <div className="coach-messages bg-stone-50/40 dark:bg-transparent" aria-live="polite">
          <div className="mx-1 my-1 px-3.5 py-2.5 bg-emerald-50/40 border border-emerald-100/50 rounded-xl mb-3">
            <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
              {t('agent.greeting', { role: profile.role || '', childName: child })}
            </p>
          </div>
          {messages.filter(m => m.id !== 'welcome').map((message) => <p key={message.id} className={`coach-message coach-message-${message.role}`}>{message.text}</p>)}
          {isLoading && <p className="coach-message coach-message-agent coach-message-typing" role="status">{t('agent.thinking')}</p>}
          <span ref={messagesEndRef} aria-hidden="true"/>
        </div>
        <div className="coach-footer">
          <div className="coach-quick-replies mb-2 px-5 py-2" role="group" aria-label={t('agent.chooseMood')}>
            {childConditions.map(([value, emoji]) => {
              const active = conditions.includes(value)
              return <button
                type="button"
                key={value}
                aria-pressed={active}
                onClick={() => chooseCondition(value)}
                className={`condition-chip !min-h-8 !py-1 !px-2.5 ${active ? 'condition-chip-active bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white text-stone-600 border-stone-200 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-300'}`}
              >
                <span className="text-xs">{emoji} {moodLabel(value)}</span>
              </button>
            })}
          </div>
          <div className="px-5 pb-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                const today = todayKey()
                window.localStorage.setItem(`last_opened_coach_${profile.id}`, today)
                closeConversation()
              }}
              className="text-xs font-semibold text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
            >
              {locale === 'id' ? 'Jangan tampilkan lagi hari ini' : "Don't show again today"}
            </button>
          </div>
          {readiness === 'ready' && advice.kind === 'start' && <div className="coach-repeat-picker"><p className="coach-section-label">{t('agent.playReciter')}</p><div className="grid grid-cols-3 gap-2">{[1, 3, 5].map((count) => <button type="button" key={count} aria-pressed={listenRepeats === count} onClick={() => chooseRepeat(count)} className={`min-h-11 rounded-xl text-sm font-bold tabular-nums transition-[transform,background-color,color] active:scale-[0.96] ${listenRepeats === count ? 'bg-forest text-white' : 'bg-surface-muted text-forest dark:bg-emerald-950/60'}`}>{count}×</button>)}</div></div>}
          {readiness === 'ready' && <div className="coach-actions"><button type="button" onClick={takeAction} className="coach-primary-action">{advice.action}{advice.kind !== 'pause' && <Play size={15} fill="currentColor"/>}</button><button type="button" disabled={isLoading} onClick={getPersonalAdvice} className="coach-ai-action disabled:opacity-60">{isLoading ? t('agent.composing') : <><Sparkles size={16}/>{t('agent.aiAdvice')}</>}</button></div>}
          <div className="px-5 pt-1 pb-2">
            <button
              type="button"
              onClick={() => {
                setProgressExpanded(true)
                setTimeout(() => {
                  document.getElementById('progress-today')?.focus()
                }, 100)
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-emerald-600/30 bg-emerald-50/80 px-4 text-xs font-bold text-emerald-900 hover:bg-emerald-100/90 transition-[transform,background-color] active:scale-[0.96] dark:border-emerald-700/50 dark:bg-emerald-950/60 dark:text-emerald-200"
            >
              <FileText size={15} />
              <span>{t('agent.directLogButton')}</span>
            </button>
          </div>
          <div className="border-t border-emerald-900/10 dark:border-emerald-900/30">
            <button
              type="button"
              onClick={() => setProgressExpanded(!progressExpanded)}
              className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-stone-50/50 dark:hover:bg-stone-900/35 transition-colors text-left"
            >
              <span className="coach-section-label !mb-0 text-stone-700 dark:text-stone-300 font-bold">
                {t('agent.progressLabel')}
              </span>
              <span className={`text-stone-400 transform transition-transform duration-200 ${progressExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown size={18} />
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${progressExpanded ? 'max-h-[320px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              <form className="pb-5 px-5" onSubmit={interpretProgress}>
                <textarea
                  id="progress-today"
                  value={progressText}
                  onChange={(event) => setProgressText(event.target.value)}
                  rows="4"
                  maxLength="2000"
                  placeholder={t('agent.progressPlaceholder', { name: child }).replace('Aisyah', child)}
                  className="input-field resize-y w-full min-h-[130px] rounded-xl border-sage focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm leading-relaxed"
                  disabled={progressLoading}
                />
                <button type="submit" disabled={progressLoading || !progressText.trim()} className="primary-button mt-3.5 w-full rounded-[14px] bg-emerald-500 hover:bg-emerald-600 active:scale-[0.96] transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 text-white font-bold py-2.5">
                  {progressLoading ? t('agent.progressThinking') : <><Sparkles size={16}/>{t('agent.progressSubmit')}</>}
                </button>
              </form>
            </div>
          </div>
          {progressError && <p role="alert" className="mx-5 mt-3 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-terracotta dark:bg-amber-950/40 dark:text-amber-200">{progressError}</p>}
          {progressState && <div className="mx-5 mt-3 rounded-2xl bg-surface-muted p-4 text-sm text-forest dark:bg-emerald-950/60"><p className="font-bold">{t('agent.progressSummary')}</p><ul className="mt-2 list-disc pl-5">{progressState.entries.map((entry, index) => <li key={`${entry.surahId}-${entry.startAyah}-${index}`}>{entry.type === 'new' ? t('agent.progressNew') : t('agent.progressReview')} · QS. {entry.surahId} · {rangeLabel(entry.startAyah, entry.endAyah, t)}</li>)}</ul>{progressState.unrecognised.length > 0 && <p className="mt-2 text-terracotta">{t('agent.progressUnrecognised', { items: progressState.unrecognised.join(', ') })}</p>}{progressState.clarification && <p className="mt-2 font-semibold text-terracotta">{progressState.clarification}</p>}{!progressState.clarification && progressState.entries.length > 0 && <div className="mt-3 flex gap-2"><button type="button" onClick={confirmProgress} disabled={progressLoading} className="primary-button flex-1 rounded-[14px] active:scale-[0.96] transition-transform">{t('agent.progressConfirm')}</button><button type="button" onClick={() => setProgressState(null)} className="secondary-button flex-1 rounded-[14px] active:scale-[0.96] transition-transform">{t('agent.progressEdit')}</button></div>}</div>}
          {aiStatus && <p className="coach-ai-status" role="status">{aiStatus}</p>}
          <p className="coach-note">{t('agent.advice')}</p>
        </div>
      </section>
    </div>}
    <button type="button" onClick={open ? closeConversation : openConversation} aria-expanded={open} aria-label={open ? t('agent.close') : t('agent.open')} className="pointer-events-auto flex h-12 w-12 items-center justify-center gap-2.5 rounded-full bg-emerald-700 px-4 text-sm font-medium text-white shadow-xl transition-transform duration-200 hover:bg-emerald-600 active:scale-[0.96] dark:bg-emerald-600 dark:hover:bg-emerald-500 sm:w-auto sm:justify-start sm:rounded-2xl sm:px-4"><span className="relative shrink-0"><Bot size={20}/><i className="coach-pulse"/></span><span className="hidden sm:inline">{t('agent.button')}</span></button>
  </>
}

function FloatingCoach({ profile, targets, memories, locale, checkin, onSave, autoOpen, onAutoOpen, onApplyProgress, onAdd, onStart }) {
  return <div className="coach-float-root">
    <CoachConversation profile={profile} targets={targets} memories={memories} locale={locale} checkin={checkin} onSave={onSave} autoOpen={autoOpen} onAutoOpen={onAutoOpen} onApplyProgress={onApplyProgress} onAdd={onAdd} onStart={onStart}/>
  </div>
}

function SavedMemoryPanel({ memories, onStart }) {
  const { t } = useLocale()
  return <aside className="home-memory-panel glass-card h-fit p-5 lg:sticky lg:top-6 lg:p-6" aria-labelledby="home-memory-title">
    <p className="step-label badge-new">{t('addTarget.savedMemory')}</p>
    <h2 id="home-memory-title" className="font-display mt-2 text-2xl text-forest">{t('addTarget.savedMemory')}</h2>
    <p className="text-muted mt-1 text-sm leading-relaxed">{t('addTarget.reviewNotice')}</p>
    {memories.length ? <div className="mt-5 space-y-3">{memories.slice(0, 4).map((memory) => {
      const item = surahFor(memory.surahId)
      return <article key={memory.id} className="rounded-2xl border border-sage/70 bg-surface-raised p-3 dark:border-emerald-900/50 dark:bg-emerald-950/50">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-forest">{item?.name || t('common.surah')}</h3><p className="mt-1 text-xs font-semibold text-stone-500 dark:text-stone-300">{rangeLabel(memory.startAyah, memory.endAyah, t)}</p></div><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-terracotta dark:bg-surface dark:text-emerald-200">{dueLabel(memory, t)}</span></div>
        <button type="button" onClick={() => onStart(memory)} className="secondary-button mt-3 min-h-10 w-full text-sm">{t('common.play')} <Play size={15} fill="currentColor"/></button>
      </article>
    })}</div> : <div className="mt-5 rounded-2xl bg-surface-warm p-5 text-center dark:bg-emerald-950/60"><CircleCheck className="mx-auto text-emerald-600 dark:text-emerald-300" size={24}/><p className="mt-3 text-sm font-semibold leading-relaxed text-stone-600 dark:text-stone-300">{t('addTarget.noMemory')}</p></div>}
  </aside>
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
  if (!isHydrated) return <main className="page-root pb-28"><div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-10" aria-busy="true"><div className="h-36 animate-pulse rounded-[32px] bg-forest/90"/><section className="mt-6 h-80 animate-pulse rounded-[32px] bg-white/90 dark:bg-surface"/><p className="sr-only">Loading data hafalan {profile.name}…</p></div></main>
  return <main className="page-root pb-28"><div className="home-dashboard-layout mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-10">
    <header className="home-hero"><div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10"/><div className="home-hero-top"><p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white/75"><img src="/icons/app-icon.svg" alt="Logo Wali Tahfiz" className="home-hero-brand-mark"/><span>Wali Tahfiz</span><span className="text-white/35">·</span><Sparkles size={15} className="shrink-0"/> {t('home.greeting', { role: profile.role })}</p></div><div className="home-hero-copy"><h1 className="font-display">{t('home.title', { name: profile.name })}</h1><p>{t('home.subtitle')}</p></div><div className="home-hero-child"><ChildSwitcher family={family} onSelect={onSelectChild} onManage={settings}/></div></header>
    <div className="dashboard-status-grid mt-6">
      <div className="stat-card stat-card-target"><span className="stat-card-icon"><CalendarDays size={19}/></span><span><b>{todayTargets.length}</b><small>{t('home.todayTargets')}</small></span></div>
      <div className="stat-card stat-card-complete"><span className="stat-card-icon"><CircleCheck size={19}/></span><span><b>{done}</b><small>{todayTargets.length ? t('home.complete', { done, total: todayTargets.length }) : t('home.ready')}</small></span></div>
      <div className="stat-card stat-card-new"><span className="stat-card-icon"><Sparkles size={19}/></span><span><b>{newTargets.length}</b><small>{t('home.newMemory')}</small></span></div>
      <div className="stat-card stat-card-review"><span className="stat-card-icon"><RotateCcw size={19}/></span><span><b>{reviewTargets.length}</b><small>{t('home.review')}</small></span></div>
    </div>
    <div className="mt-6"><section className="glass-card p-5 lg:p-7"><div className="flex items-end justify-between gap-4"><div><p className="step-label badge-review">{t('home.agenda')}</p><h2 className="font-display mt-2 text-2xl text-forest">{t('home.childTargets', { name: profile.name })}</h2><p className="text-muted mt-1 text-sm">{t('home.chooseOne')}</p></div><button type="button" onClick={() => setShowAdd(true)} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-terracotta px-3 py-2 text-sm font-bold text-white transition-transform active:scale-[0.96]"><Plus size={17}/> {t('common.add')}</button></div>
      <div className="mt-5 space-y-6">
        {reviewRecommendations.length > 0 && (
          <ReviewRecommendations memories={reviewRecommendations} onStart={openReview} onAdd={addReviewTarget}/>
        )}
        {todayTargets.length ? <>{newTargets.length > 0 && <TargetGroup type="new" targets={newTargets} onStart={(item) => item.type === 'review' ? openReview(memories.find((memory) => memory.id === item.memoryId) || { id: item.memoryId || makeId('memory'), childId: profile.id, surahId: item.surahId, startAyah: item.startAyah, endAyah: item.endAyah }) : setStartedTarget(item.id)} onComplete={completeTarget} onDelete={deleteTarget}/>} {reviewTargets.length > 0 && <TargetGroup type="review" targets={reviewTargets} onStart={(item) => item.type === 'review' ? openReview(memories.find((memory) => memory.id === item.memoryId) || { id: item.memoryId || makeId('memory'), childId: profile.id, surahId: item.surahId, startAyah: item.startAyah, endAyah: item.endAyah }) : setStartedTarget(item.id)} onComplete={completeTarget} onDelete={deleteTarget}/>}</> : reviewRecommendations.length === 0 && <div className="rounded-[24px] bg-amber-50 px-5 py-10 text-center dark:bg-emerald-950/60"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-forest dark:bg-surface"><Plus size={22}/></span><h3 className="mt-3 font-display text-xl text-forest">{t('home.noTargets')}</h3><p className="text-muted mt-1 text-sm">{t('home.noTargetsBody')}</p><button type="button" onClick={() => setShowAdd(true)} className="mt-4 min-h-11 font-bold text-terracotta">{t('home.firstTarget')}</button></div>}
      </div></section>
      <SavedMemoryPanel memories={memories} onStart={openReview}/>
      </div></div><FloatingCoach key={profile.id} profile={profile} targets={targets} memories={memories} checkin={checkin} autoOpen={autoOpenCoach} onAutoOpen={onAutoCoachOpened} onSave={saveCheckin} onApplyProgress={applyProgress} onAdd={({ memory, surahId } = {}) => { if (memory) addReviewTarget(memory); else { setSuggestedSurahId(surahId || '1'); setShowAdd(true) } }} onStart={(target) => target.type === 'review' ? openReview(memories.find((memory) => memory.id === target.memoryId)) : setStartedTarget(target.id)}/>{showAdd && <AddTargetSheet memories={memories} targets={todayTargets} initialSurahId={suggestedSurahId} onSave={saveTarget} onClose={() => { setShowAdd(false); setSuggestedSurahId('1') }}/>}</main>
}

const MAIN_ROUTES = ['/', '/report', '/audio', '/settings']

const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.home', icon: House },
  { path: '/report', labelKey: 'nav.report', icon: FileText },
  { path: '/audio', labelKey: 'nav.audio', icon: Headphones },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
]

function BottomNav({ pathname, navigate }) {
  const { t } = useLocale()
  return <nav className="bottom-nav" aria-label={t('nav.label')}>
    <div className="bottom-nav-bar">
      {NAV_ITEMS.map(({ path, labelKey, icon: Icon }) => {
        const active = pathname === path
        return <button key={path} type="button" onClick={() => navigate(path)} aria-current={active ? 'page' : undefined} className={`bottom-nav-item ${active ? 'bottom-nav-item-active' : ''}`}>
          <Icon size={20} strokeWidth={active ? 2.5 : 2}/>
          <span>{t(labelKey)}</span>
        </button>
      })}
    </div>
  </nav>
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
    const allTargets = await db.targets.where('childId').equals(profile.id).toArray()
    const matchingTargets = allTargets.filter((tgt) =>
      (tgt.memoryId && tgt.memoryId === memory.id) ||
      (tgt.type === 'review' && String(tgt.surahId) === String(memory.surahId) && Number(tgt.startAyah) === Number(memory.startAyah) && Number(tgt.endAyah) === Number(memory.endAyah))
    )
    await Promise.all(matchingTargets.filter((target) => target.status !== 'done').map((target) => db.targets.put({ ...target, status: 'done' })))
    writeRouteData(ACTIVE_MEMORY_KEY, null)
    navigate('/')
  }
  const home = profile ? <Home profile={profile} family={family} onSelectChild={selectChild} settings={() => navigate('/settings')} audioLibrary={() => navigate('/audio')} openPractice={openPractice} openReview={openReview}/> : null
  if (!isReady) return <main className="flex min-h-screen items-center justify-center bg-cream"><p className="font-display text-xl text-forest">Menyiapkan data keluarga…</p></main>
  if (!family || !profile) return <Onboarding save={saveFamily} onImport={importData} locale={locale} saveLocale={setLocale} theme={theme} setTheme={setTheme}/>
  const withNav = (content) => MAIN_ROUTES.includes(pathname) ? <>{content}<BottomNav pathname={pathname} navigate={navigate}/></> : content
  if (pathname === '/settings') return withNav(<Suspense fallback={<RouteFallback/>}><LazySettingsPage family={family} save={saveFamily} back={() => navigate('/')} onExport={exportData} onImport={importData} onReset={resetData} qariId={qariId} saveQari={async (nextQariId) => { const normalized = qariFor(nextQariId).id; await saveQuranQari(normalized); setQariId(normalized) }} locale={locale} saveLocale={setLocale} theme={theme} setTheme={setTheme} ui={{ ChildEditor, ChildList, PageHeader, RolePicker }}/></Suspense>)
  if (pathname === '/report') return withNav(<Suspense fallback={<RouteFallback/>}><LazyReportPage family={family} back={() => navigate('/')} onStartReview={openReview}/></Suspense>)
  if (pathname === '/audio') return withNav(<Suspense fallback={<RouteFallback/>}><LazyQuranRangePage back={() => navigate('/')} qariId={qariId} onQariChange={async (nextQariId) => { const normalized = qariFor(nextQariId).id; await saveQuranQari(normalized); setQariId(normalized) }}/></Suspense>)
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
  return withNav(<>{home}<PwaInstallPrompt/></>)
}

   export default function App() {
     const [locale, setLocale] = useState(DEFAULT_LOCALE)
     const [theme, setTheme] = useState(() => getInitialTheme())
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
