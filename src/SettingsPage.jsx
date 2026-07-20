import { useState } from 'react'
import { Baby, Check, Plus, Settings, UserRound } from 'lucide-react'
import { normalizeFamilyProfile } from './db'

const createChild = () => ({
  id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  age: '',
  icon: '🌙',
  memorized: [],
  repeats: { talaqqi: 3, tikrar: 10, rabt: 1 },
})

export default function SettingsPage({ family, save, back, ui }) {
  const { ChildEditor, ChildList, PageHeader, RolePicker } = ui
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
    <section className="settings-section glass-card"><div className="flex items-start justify-between gap-4"><div className="settings-section-heading"><p className="step-label bg-peach text-terracotta"><Baby size={13}/> ANAK YANG DITEMANI</p><h2 className="font-display mt-3 text-xl text-slate-700">Profil & hafalan</h2><p>Pilih profil untuk melihat atau mengubah datanya.</p></div><button type="button" onClick={addChild} className="settings-add-button"><Plus size={17}/><span>Tambah</span></button></div>{draft.children.length ? <><div className="mt-5"><ChildList children={draft.children} activeChildId={draft.activeChildId} onSelect={(id) => setDraft((current) => ({ ...current, activeChildId: id }))} onRemove={(id) => setPendingDeletion(draft.children.find((child) => child.id === id) || null)}/></div>{activeChild && <div className="settings-editor"><div className="settings-editor-title"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-peach text-xl">{activeChild.icon}</span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-terracotta">SEDANG DIEDIT</p><h3 className="font-display text-lg text-forest">{activeChild.name || 'Profil anak baru'}</h3></div></div><ChildEditor child={activeChild} onChange={updateChild} autoFocus={!activeChild.name}/></div>}</> : <p className="mt-5 rounded-[22px] bg-[#fffaf2] p-4 text-sm leading-relaxed text-terracotta">Belum ada profil anak. Tambahkan profil pertama, lalu simpan pengaturan.</p>}</section>
    {activeChild && <section className="settings-section glass-card"><div className="settings-section-heading"><p className="step-label bg-sage text-forest">ULANGAN HAFALAN BARU</p><h2 className="font-display mt-3 text-xl text-slate-700">Target di tiap langkah</h2><p>Berlaku khusus untuk <b className="font-semibold text-forest">{activeChild.name || 'anak yang dipilih'}</b>.</p></div><div className="mt-5 space-y-2">{[['talaqqi', 'Dengarkan', 'Putar suara qari bersama'], ['tikrar', 'Ikuti', 'Anak menirukan bacaan wali'], ['rabt', 'Sambungkan', 'Satukan awal dan ujung ayat']].map(([key, title, helper], index) => <div key={key} className="settings-repeat-row"><span className="settings-repeat-index">0{index + 1}</span><span className="min-w-0 flex-1"><b className="block text-forest">{title}</b><small>{helper}</small></span><label className="flex shrink-0 items-center gap-2"><span className="sr-only">Target {title}</span><input aria-label={`Target ${title}`} type="number" min="1" value={activeChild.repeats[key]} onChange={(event) => updateChild({ ...activeChild, repeats: { ...activeChild.repeats, [key]: Math.max(1, Number(event.target.value) || 1) } })} className="settings-repeat-input"/><b className="text-slate-400">×</b></label></div>)}</div></section>}
    <div className="settings-save-bar"><button type="button" disabled={!canSave} onClick={submit} className="primary-button disabled:cursor-not-allowed disabled:opacity-50"><Check size={19}/>{draft.children.length ? 'Simpan pengaturan' : 'Hapus profil & mulai ulang'}</button></div>
  </div>{pendingDeletion && <div className="sheet-backdrop" role="presentation"><section className="sheet sm:max-w-md" role="dialog" aria-modal="true" aria-labelledby="delete-child-title"><p className="step-label bg-peach text-terracotta">KONFIRMASI HAPUS</p><h2 id="delete-child-title" className="font-display mt-3 text-2xl text-forest">Hapus {pendingDeletion.name || 'profil anak'}?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Target hari ini dan hafalan tersimpan milik {pendingDeletion.name || 'anak ini'} akan ikut dihapus saat pengaturan disimpan. Tindakan ini tidak dapat dibatalkan.</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setPendingDeletion(null)} className="secondary-button">Batal</button><button type="button" onClick={confirmDelete} className="primary-button !bg-terracotta">Hapus anak</button></div></section></div>}</main>
}
