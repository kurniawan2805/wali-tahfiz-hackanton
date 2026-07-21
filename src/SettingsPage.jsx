import { useRef, useState } from 'react'
import { AlertTriangle, Baby, Check, Download, Plus, Settings, Trash2, Upload, UserRound } from 'lucide-react'
import { normalizeFamilyProfile } from './db'
import { DEFAULT_QARI_ID, QARIS, qariFor } from './quranAudio'

const createChild = () => ({
  id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  age: '',
  icon: '🌙',
  memorized: [],
  repeats: { talaqqi: 3, tikrar: 10, rabt: 1 },
})

export default function SettingsPage({ family, save, back, onExport, onImport, onReset, qariId = DEFAULT_QARI_ID, saveQari, ui }) {
  const { ChildEditor, ChildList, PageHeader, RolePicker } = ui
  const [draft, setDraft] = useState(() => normalizeFamilyProfile(family))
  const [removedChildIds, setRemovedChildIds] = useState([])
  const [pendingDeletion, setPendingDeletion] = useState(null)
  const [showResetConfirmation, setShowResetConfirmation] = useState(false)
  const [transferStatus, setTransferStatus] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  const [selectedQariId, setSelectedQariId] = useState(qariFor(qariId).id)
  const importInputRef = useRef(null)
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
  const submit = async () => { if (!canSave) return; await Promise.all([save(draft, removedChildIds), saveQari?.(selectedQariId)]); back() }
  const handleExport = async () => {
    setIsTransferring(true); setTransferStatus('')
    try { await onExport(); setTransferStatus('Cadangan berhasil diunduh. Simpan file ini di tempat aman.') }
    catch { setTransferStatus('Cadangan belum bisa dibuat. Coba lagi beberapa saat lagi.') }
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
    } catch (error) { setTransferStatus(error instanceof Error ? error.message : 'File cadangan tidak dapat diimpor.') }
    finally { setIsTransferring(false) }
  }
  const handleReset = async () => { await onReset(); setShowResetConfirmation(false) }
  return <main className="app-page pb-32"><div className="page-shell page-shell-settings">
    <PageHeader title="Pengaturan" back={back}/>
    <section className="settings-overview"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-white/65">Keluarga Anda</p><h2 className="font-display mt-1 text-2xl text-white">{draft.role} menemani <span className="text-peach">{draft.children.length}</span> anak</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">Atur profil dan ritme belajar setiap anak dari satu tempat.</p></div><span className="settings-overview-icon" aria-hidden="true"><Settings size={25}/></span></section>
    <section className="settings-section glass-card"><div className="settings-section-heading"><div><p className="step-label bg-[#eff6eb] text-forest"><UserRound size={13}/> PROFIL KELUARGA</p><h2 className="font-display mt-3 text-xl text-slate-700">Sapaan wali</h2><p>Digunakan di seluruh perjalanan hafalan keluarga.</p></div></div><div className="mt-5"><RolePicker value={draft.role} onChange={(role) => setDraft((current) => ({ ...current, role }))}/></div></section>
    <section className="settings-section glass-card"><div className="flex items-start justify-between gap-4"><div className="settings-section-heading"><p className="step-label bg-peach text-terracotta"><Baby size={13}/> ANAK YANG DITEMANI</p><h2 className="font-display mt-3 text-xl text-slate-700">Profil & hafalan</h2><p>Pilih profil untuk melihat atau mengubah datanya.</p></div><button type="button" onClick={addChild} className="settings-add-button"><Plus size={17}/><span>Tambah</span></button></div>{draft.children.length ? <><div className="mt-5"><ChildList children={draft.children} activeChildId={draft.activeChildId} onSelect={(id) => setDraft((current) => ({ ...current, activeChildId: id }))} onRemove={(id) => setPendingDeletion(draft.children.find((child) => child.id === id) || null)}/></div>{activeChild && <div className="settings-editor"><div className="settings-editor-title"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-peach text-xl">{activeChild.icon}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-terracotta">SEDANG DIEDIT</p><h3 className="font-display text-lg text-forest">{activeChild.name || 'Profil anak baru'}</h3></div></div><ChildEditor child={activeChild} onChange={updateChild} autoFocus={!activeChild.name}/></div>}</> : <p className="mt-5 rounded-[22px] bg-[#fffaf2] p-4 text-sm leading-relaxed text-terracotta">Belum ada profil anak. Tambahkan profil pertama, lalu simpan pengaturan.</p>}</section>
    {activeChild && <section className="settings-section glass-card"><div className="settings-section-heading"><p className="step-label bg-sage text-forest">ULANGAN HAFALAN BARU</p><h2 className="font-display mt-3 text-xl text-slate-700">Target di tiap langkah</h2><p>Berlaku khusus untuk <b className="font-semibold text-forest">{activeChild.name || 'anak yang dipilih'}</b>.</p></div><div className="mt-5 space-y-2">{[['talaqqi', 'Dengarkan', 'Putar suara qari bersama'], ['tikrar', 'Ikuti', 'Anak menirukan bacaan wali'], ['rabt', 'Sambungkan', 'Satukan awal dan ujung ayat']].map(([key, title, helper], index) => <div key={key} className="settings-repeat-row"><span className="settings-repeat-index">0{index + 1}</span><span className="min-w-0 flex-1"><b className="block text-forest">{title}</b><small>{helper}</small></span><label className="flex shrink-0 items-center gap-2"><span className="sr-only">Target {title}</span><input aria-label={`Target ${title}`} type="number" min="1" value={activeChild.repeats[key]} onChange={(event) => updateChild({ ...activeChild, repeats: { ...activeChild.repeats, [key]: Math.max(1, Number(event.target.value) || 1) } })} className="settings-repeat-input"/><b className="text-slate-400">×</b></label></div>)}</div></section>}
    <section className="settings-section glass-card"><div className="settings-section-heading"><p className="step-label bg-[#eff6eb] text-forest">AUDIO QUR’AN</p><h2 className="font-display mt-3 text-xl text-slate-700">Pilih qari</h2><p>Ayman Sowaid dipilih secara bawaan. Rekaman Muallim diputar lengkap per surat agar pola tiruannya tetap utuh.</p></div><label className="mt-5 block"><span className="sr-only">Qari pilihan</span><select value={selectedQariId} onChange={(event) => setSelectedQariId(event.target.value)} className="settings-qari-select">{QARIS.map((qari) => <option key={qari.id} value={qari.id}>{qari.name} — {qari.detail}</option>)}</select></label></section>
    <section className="settings-section glass-card"><div className="settings-section-heading"><p className="step-label bg-[#eff6eb] text-forest">CADANGAN DATA</p><h2 className="font-display mt-3 text-xl text-slate-700">Pindah perangkat dengan tenang</h2><p>Unduh cadangan dari perangkat lama, lalu impor file tersebut di perangkat baru. Impor akan menggantikan seluruh data yang ada di perangkat ini.</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={isTransferring} onClick={handleExport} className="secondary-button disabled:cursor-wait disabled:opacity-60"><Download size={18}/>{isTransferring ? 'Menyiapkan…' : 'Ekspor cadangan'}</button><button type="button" disabled={isTransferring} onClick={() => importInputRef.current?.click()} className="primary-button disabled:cursor-wait disabled:opacity-60"><Upload size={18}/>Impor cadangan</button><input ref={importInputRef} onChange={handleImport} type="file" accept="application/json,.json" className="sr-only"/></div>{transferStatus && <p role="status" className="mt-4 rounded-2xl bg-[#eff6eb] p-3 text-sm font-semibold leading-relaxed text-forest">{transferStatus}</p>}</section>
    <section className="settings-section rounded-[24px] bg-[#fff4eb] p-5 shadow-sm sm:p-6"><div className="settings-section-heading"><p className="step-label bg-white text-terracotta"><AlertTriangle size={13}/> ZONA HATI-HATI</p><h2 className="font-display mt-3 text-xl text-terracotta">Hapus semua data</h2><p className="text-[#9e5537]">Menghapus profil keluarga, target, hafalan, dan riwayat dari perangkat ini. Buat cadangan terlebih dahulu bila ingin menyimpannya.</p></div><button type="button" onClick={() => setShowResetConfirmation(true)} className="secondary-button mt-5 !border-[#eab59a] !bg-white !text-terracotta"><Trash2 size={18}/>Reset data aplikasi</button></section>
    <div className="settings-save-bar"><button type="button" disabled={!canSave} onClick={submit} className="primary-button disabled:cursor-not-allowed disabled:opacity-50"><Check size={19}/>{draft.children.length ? 'Simpan pengaturan' : 'Hapus profil & mulai ulang'}</button></div>
  </div>{pendingDeletion && <div className="sheet-backdrop" role="presentation"><section className="sheet sm:max-w-md" role="dialog" aria-modal="true" aria-labelledby="delete-child-title"><p className="step-label bg-peach text-terracotta">KONFIRMASI HAPUS</p><h2 id="delete-child-title" className="font-display mt-3 text-2xl text-forest">Hapus {pendingDeletion.name || 'profil anak'}?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Target hari ini dan hafalan tersimpan milik {pendingDeletion.name || 'anak ini'} akan ikut dihapus saat pengaturan disimpan. Tindakan ini tidak dapat dibatalkan.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setPendingDeletion(null)} className="secondary-button">Batal</button><button type="button" onClick={confirmDelete} className="primary-button !bg-terracotta">Hapus anak</button></div></section></div>}{showResetConfirmation && <div className="sheet-backdrop" role="presentation"><section className="sheet sm:max-w-md" role="dialog" aria-modal="true" aria-labelledby="reset-data-title"><p className="step-label bg-peach text-terracotta"><AlertTriangle size={13}/> KONFIRMASI RESET</p><h2 id="reset-data-title" className="font-display mt-3 text-2xl text-terracotta">Hapus seluruh data?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Data tidak dapat dikembalikan kecuali Anda sudah mengekspor cadangan. Anda akan kembali ke halaman awal.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowResetConfirmation(false)} className="secondary-button">Batal</button><button type="button" onClick={handleReset} className="primary-button !bg-terracotta">Ya, hapus semua</button></div></section></div>}</main>
}
