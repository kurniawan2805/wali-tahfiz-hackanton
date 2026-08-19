import { useRef, useState } from 'react'
import { AlertTriangle, Baby, Check, ChevronDown, Download, Moon, Plus, Settings, Sun, Trash2, Upload } from 'lucide-react'
import { normalizeFamilyProfile } from './db'
import { DEFAULT_QARI_ID, qariFor } from './quranAudio'
import QariPicker from './QariPicker'
import { SUPPORTED_LOCALES, useLocale } from './i18n'

const createChild = () => ({
  id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  age: '',
  icon: '🌙',
  memorized: [],
  repeats: { talaqqi: 3, tikrar: 10, rabt: 1 },
})

const guardianTitlePresets = ['Ayah', 'Bunda', 'Abi', 'Ummi', 'Papa', 'Mama']

function GuardianGreetingSelector({ value, onChange, t }) {
  const initialIsCustom = !guardianTitlePresets.includes(value)
  const [isCustom, setIsCustom] = useState(initialIsCustom)
  const [customTitle, setCustomTitle] = useState(initialIsCustom ? value : '')

  const choosePreset = (title) => {
    setIsCustom(false)
    onChange(title)
  }

  const chooseCustom = () => {
    if (!isCustom) {
      setCustomTitle('')
      onChange('')
    }
    setIsCustom(true)
  }

  const updateCustomTitle = (event) => {
    const nextTitle = event.target.value
    setCustomTitle(nextTitle)
    onChange(nextTitle)
  }

  const chipClass = (selected) => `min-h-11 rounded-xl px-4 py-2 text-sm transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-[0.96] ${selected
    ? 'border-2 border-emerald-500 bg-emerald-100 font-medium text-emerald-900 shadow-md dark:bg-emerald-900/80 dark:text-emerald-100'
    : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400 dark:hover:bg-stone-800/60'}`

  return <div className="mt-5" role="group" aria-label={t('settings.guardianGreeting.title')}>
    <div className="flex flex-wrap gap-2.5">
      {guardianTitlePresets.map((title) => <button key={title} type="button" onClick={() => choosePreset(title)} aria-pressed={!isCustom && value === title} className={chipClass(!isCustom && value === title)}>{title}</button>)}
      <button type="button" onClick={chooseCustom} aria-pressed={isCustom} className={chipClass(isCustom)}>{t('settings.guardianGreeting.custom')}</button>
    </div>
    {isCustom && <label className="mt-3 block">
      <span className="sr-only">{t('settings.guardianGreeting.title')}</span>
      <input type="text" value={customTitle} onChange={updateCustomTitle} placeholder={t('settings.guardianGreeting.customPlaceholder')} className="min-h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-800 outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/30"/>
    </label>}
  </div>
}

function SettingsAccordion({ id, openSection, onToggle, className = 'settings-section glass-card', children, content }) {
  const isOpen = openSection === id
  const panelId = `settings-panel-${id}`
  return <section className={className}>
    <h2>
      <button type="button" onClick={() => onToggle(id)} aria-expanded={isOpen} aria-controls={panelId} className="settings-accordion-toggle">
        {children}
        <ChevronDown size={21} className={`settings-accordion-chevron ${isOpen ? 'settings-accordion-chevron-open' : ''}`} aria-hidden="true"/>
      </button>
    </h2>
    {isOpen && <div id={panelId} className="settings-accordion-panel">{content}</div>}
  </section>
}

export default function SettingsPage({ family, save, back, onExport, onImport, onReset, qariId = DEFAULT_QARI_ID, saveQari, locale, saveLocale, theme = 'light', setTheme, ui }) {
  const { ChildEditor, ChildList, PageHeader } = ui
  const { t } = useLocale()
  const [draft, setDraft] = useState(() => normalizeFamilyProfile(family))
  const [removedChildIds, setRemovedChildIds] = useState([])
  const [pendingDeletion, setPendingDeletion] = useState(null)
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)
  const [transferStatus, setTransferStatus] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  const [selectedQariId, setSelectedQariId] = useState(qariFor(qariId).id)
  const [openSection, setOpenSection] = useState(null)
  const importInputRef = useRef(null)
  const activeChild = draft.children.find((child) => child.id === draft.activeChildId) || null
  const updateChild = (nextChild) => setDraft((current) => ({ ...current, children: current.children.map((child) => child.id === nextChild.id ? nextChild : child) }))
  const addChild = () => {
    const child = createChild()
    setDraft((current) => ({ ...current, children: [...current.children, child], activeChildId: child.id }))
    setOpenSection('children')
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
  const canSave = Boolean(draft.role.trim()) && (!draft.children.length || draft.children.every((child) => child.name.trim()))
  const submit = async () => { if (!canSave) return; await Promise.all([save(draft, removedChildIds), saveQari?.(selectedQariId)]); back() }
  const handleExport = async () => {
    setIsTransferring(true); setTransferStatus('')
    try { await onExport(); setTransferStatus(t('settings.backupReady')) }
    catch { setTransferStatus(t('settings.backupFailed')) }
    finally { setIsTransferring(false) }
  }
  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setIsTransferring(true); setTransferStatus('')
    try {
      await onImport(JSON.parse(await file.text()))
      back()
    } catch (error) { setTransferStatus(error instanceof Error ? error.message : t('onboarding.importFailed')) }
    finally { setIsTransferring(false) }
  }
  const handleReset = async () => { await onReset(); setShowResetConfirmation(false) }
  const toggleSection = (section) => setOpenSection((current) => current === section ? null : section)
  return <main className="app-page pb-32"><div className="page-shell page-shell-settings">
    <PageHeader title={t('settings.title')} back={back}/>
    <section className="settings-overview"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-white/65">{t('settings.family')}</p><h2 className="font-display mt-1 text-2xl text-white">{t('settings.overview', { role: draft.role, count: draft.children.length, suffix: draft.children.length === 1 ? '' : 'ren' })}</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">{t('settings.overviewBody')}</p></div><span className="settings-overview-icon" aria-hidden="true"><Settings size={25}/></span></section>
    <SettingsAccordion id="language" openSection={openSection} onToggle={toggleSection} content={<div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t('language.label')}>{SUPPORTED_LOCALES.map((option) => <button key={option.id} type="button" onClick={() => saveLocale?.(option.id)} aria-pressed={locale === option.id} className={`qari-choice ${locale === option.id ? 'qari-choice-active' : ''}`}><span className="qari-choice-radio">{option.shortLabel}</span><span><b>{option.id === 'id' ? t('language.indonesian') : t('language.english')}</b><small>{option.id === 'id' ? 'Indonesia' : 'English'}</small></span></button>)}</div>}><div className="settings-section-heading"><p className="step-label">{t('language.label').toUpperCase()}</p><span>{t('language.title')}</span><p>{t('language.description')}</p></div></SettingsAccordion>
    <SettingsAccordion id="appearance" openSection={openSection} onToggle={toggleSection} content={<div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t('settings.appearanceTitle')}><button type="button" onClick={() => setTheme?.('light')} aria-pressed={theme === 'light'} className={`qari-choice ${theme === 'light' ? 'qari-choice-active' : ''}`}><span className="qari-choice-radio"><Sun size={18}/></span><span><b>{t('settings.light')}</b><small>{t('settings.lightBody')}</small></span></button><button type="button" onClick={() => setTheme?.('dark')} aria-pressed={theme === 'dark'} className={`qari-choice ${theme === 'dark' ? 'qari-choice-active' : ''}`}><span className="qari-choice-radio"><Moon size={18}/></span><span><b>{t('settings.dark')}</b><small>{t('settings.darkBody')}</small></span></button></div>}><div className="settings-section-heading"><p className="step-label">{t('settings.appearanceLabel')}</p><span>{t('settings.appearanceTitle')}</span><p>{t('settings.appearanceBody')}</p></div></SettingsAccordion>
    <SettingsAccordion id="family" openSection={openSection} onToggle={toggleSection} content={<GuardianGreetingSelector value={draft.role} onChange={(role) => setDraft((current) => ({ ...current, role }))} t={t}/>}><div className="settings-section-heading"><span>{t('settings.guardianGreeting.title')}</span><p>{t('settings.guardianGreeting.desc')}</p></div></SettingsAccordion>
    <SettingsAccordion id="children" openSection={openSection} onToggle={toggleSection} content={<><button type="button" onClick={addChild} className="settings-add-button mt-5"><Plus size={17}/><span>{t('settings.addChild')}</span></button>{draft.children.length ? <><div className="mt-5"><ChildList children={draft.children} activeChildId={draft.activeChildId} onSelect={(id) => setDraft((current) => ({ ...current, activeChildId: id }))} onRemove={(id) => setPendingDeletion(draft.children.find((child) => child.id === id) || null)}/></div>{activeChild && <div className="settings-editor"><div className="settings-editor-title"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-peach text-xl dark:border dark:border-emerald-800/50 dark:bg-emerald-950/60">{activeChild.icon}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-terracotta dark:text-emerald-200">{t('settings.editing')}</p><h3 className="font-display text-lg text-forest dark:text-emerald-200">{activeChild.name || t('settings.newChild')}</h3></div></div><ChildEditor child={activeChild} onChange={updateChild} autoFocus={!activeChild.name}/></div>}</> : <p className="mt-5 rounded-[22px] bg-surface-warm p-4 text-sm leading-relaxed text-terracotta dark:bg-amber-950/40 dark:text-amber-200">{t('settings.noChildren')}</p>}</>}><div className="settings-section-heading"><p className="step-label"><Baby size={13}/> {t('settings.childrenLabel')}</p><span>{t('settings.childrenTitle')}</span><p>{t('settings.childrenBody')}</p></div></SettingsAccordion>
    {activeChild && <SettingsAccordion id="repeats" openSection={openSection} onToggle={toggleSection} content={<div className="mt-5 space-y-2">{[['talaqqi', 'listen'], ['tikrar', 'repeat'], ['rabt', 'connect']].map(([key, step], index) => { const title = t(`settings.steps.${step}.title`); return <div key={key} className="settings-repeat-row"><span className="settings-repeat-index">0{index + 1}</span><span className="min-w-0 flex-1"><b className="block text-forest dark:text-stone-100">{title}</b><small>{t(`settings.steps.${step}.desc`)}</small></span><label className="flex shrink-0 items-center gap-2"><span className="sr-only">{title}</span><input aria-label={title} type="number" min="1" value={activeChild.repeats[key]} onChange={(event) => updateChild({ ...activeChild, repeats: { ...activeChild.repeats, [key]: Math.max(1, Number(event.target.value) || 1) } })} className="settings-repeat-input"/><b className="text-slate-400 dark:text-stone-400">×</b></label></div> })}</div>}><div className="settings-section-heading"><p className="step-label">{t('settings.repeatsLabel')}</p><span>{t('settings.repeatsTitle')}</span><p>{t('settings.repeatsBody', { name: activeChild.name || t('settings.newChild') })}</p></div></SettingsAccordion>}
    <SettingsAccordion id="audio" openSection={openSection} onToggle={toggleSection} content={<div className="mt-5"><QariPicker value={selectedQariId} onChange={setSelectedQariId}/></div>}><div className="settings-section-heading"><p className="step-label">{t('settings.audioLabel')}</p><span>{t('settings.audioTitle')}</span><p>{t('settings.audioBody')}</p></div></SettingsAccordion>
    <SettingsAccordion id="welcome" openSection={openSection} onToggle={toggleSection} content={<button type="button" onClick={() => window.localStorage.removeItem('hasSeenAgentWelcome')} className="secondary-button mt-5"><Settings size={18}/>{t('settings.welcomeReset')}</button>}><div className="settings-section-heading"><p className="step-label">{t('settings.welcomeLabel')}</p><span>{t('settings.welcomeTitle')}</span><p>{t('settings.welcomeBody')}</p></div></SettingsAccordion>
    <SettingsAccordion id="backup" openSection={openSection} onToggle={toggleSection} content={<><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={isTransferring} onClick={handleExport} className="secondary-button disabled:cursor-wait disabled:opacity-60"><Download size={18}/>{isTransferring ? t('settings.exporting') : t('settings.export')}</button><button type="button" disabled={isTransferring} onClick={() => importInputRef.current?.click()} className="primary-button disabled:cursor-wait disabled:opacity-60"><Upload size={18}/>{t('settings.import')}</button><input ref={importInputRef} onChange={handleImport} type="file" accept="application/json,.json" className="sr-only"/></div>{transferStatus && <p role="status" className="mt-4 rounded-2xl bg-emerald-100 p-3 text-sm font-semibold leading-relaxed text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100">{transferStatus}</p>}</>}><div className="settings-section-heading"><p className="step-label">{t('settings.backupLabel')}</p><span>{t('settings.backupTitle')}</span><p>{t('settings.backupBody')}</p></div></SettingsAccordion>
    <SettingsAccordion id="danger" openSection={openSection} onToggle={toggleSection} className="settings-section settings-section-danger" content={<button type="button" onClick={() => setShowResetConfirmation(true)} className="secondary-button mt-5 !border-[#eab59a] !bg-white !text-terracotta dark:!bg-surface"><Trash2 size={18}/>{t('settings.reset')}</button>}><div className="settings-section-heading"><p className="step-label"><AlertTriangle size={13}/> {t('settings.dangerLabel')}</p><span>{t('settings.dangerTitle')}</span><p>{t('settings.dangerBody')}</p></div></SettingsAccordion>
    <div className="settings-save-bar"><button type="button" disabled={!canSave} onClick={submit} className="primary-button settings-save-button disabled:cursor-not-allowed disabled:opacity-50"><Check size={19}/>{draft.children.length ? t('settings.save') : t('settings.restart')}</button></div>
  </div>{pendingDeletion && <div className="sheet-backdrop" role="presentation"><section className="sheet sm:max-w-md" role="dialog" aria-modal="true" aria-labelledby="delete-child-title"><p className="step-label bg-peach text-terracotta">{t('settings.deleteChildLabel')}</p><h2 id="delete-child-title" className="font-display mt-3 text-2xl text-forest">{t('settings.deleteChildTitle', { name: pendingDeletion.name || t('onboardingStep2.childFallback') })}</h2><p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{t('settings.deleteChildBody', { name: pendingDeletion.name || t('onboardingStep2.childFallback') })}</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setPendingDeletion(null)} className="secondary-button">{t('common.cancel')}</button><button type="button" onClick={confirmDelete} className="primary-button !bg-terracotta">{t('settings.deleteChildConfirm')}</button></div></section></div>}{showResetConfirmation && <div className="sheet-backdrop" role="presentation"><section className="sheet sm:max-w-md" role="dialog" aria-modal="true" aria-labelledby="reset-data-title"><p className="step-label bg-peach text-terracotta"><AlertTriangle size={13}/> {t('settings.resetLabel')}</p><h2 id="reset-data-title" className="font-display mt-3 text-2xl text-terracotta">{t('settings.resetTitle')}</h2><p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{t('settings.resetBody')}</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowResetConfirmation(false)} className="secondary-button">{t('common.cancel')}</button><button type="button" onClick={handleReset} className="primary-button !bg-terracotta">{t('settings.resetConfirm')}</button></div></section></div>}</main>
}
