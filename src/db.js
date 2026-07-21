import Dexie from 'dexie'

export const db = new Dexie('wali-tahfiz')

const LEGACY_CHILD_ID = 'child-legacy'
const defaultRepeats = { talaqqi: 3, tikrar: 10, rabt: 1 }
const normalizeRole = (role) => role === 'Ibu' ? 'Bunda' : (role || 'Bunda')
const legacyMemorized = (memorized) => {
  if (Array.isArray(memorized)) return memorized
  if (!memorized) return []
  return [memorized.fatihah && '1', ...(memorized.juz30 ? Array.from({ length: 37 }, (_, index) => String(78 + index)) : [])].filter(Boolean)
}

function legacyChild(profile = {}, id = LEGACY_CHILD_ID) {
  return {
    id,
    name: profile.name || '',
    age: profile.age || '',
    icon: profile.icon || '🌙',
    memorized: legacyMemorized(profile.memorized),
    repeats: { ...defaultRepeats, ...(profile.repeats || {}) },
  }
}

export function normalizeFamilyProfile(profile) {
  if (!profile) return null
  if (Array.isArray(profile.children)) {
    const children = profile.children.map((child, index) => ({
      ...legacyChild(child, child.id || `${LEGACY_CHILD_ID}-${index + 1}`),
      ...child,
      id: child.id || `${LEGACY_CHILD_ID}-${index + 1}`,
      memorized: legacyMemorized(child.memorized),
      repeats: { ...defaultRepeats, ...(child.repeats || {}) },
    }))
    return {
      ...profile,
      id: 'family',
      role: normalizeRole(profile.role),
      children,
      activeChildId: children.some((child) => child.id === profile.activeChildId) ? profile.activeChildId : children[0]?.id || null,
    }
  }
  const child = legacyChild(profile)
  return { id: 'family', role: normalizeRole(profile.role), activeChildId: child.id, children: [child] }
}

db.version(1).stores({
  profiles: '&id, updatedAt',
  targets: '&id, createdAt, status, type',
  memories: '&id, surahId, nextReviewAt',
  preferences: '&key',
  meta: '&key',
})

db.version(2).stores({
  profiles: '&id, updatedAt',
  targets: '&id, childId, createdAt, status, type',
  memories: '&id, childId, surahId, nextReviewAt',
  preferences: '&key',
  meta: '&key',
}).upgrade(async (transaction) => {
  const profiles = transaction.table('profiles')
  const targets = transaction.table('targets')
  const memories = transaction.table('memories')
  const saved = await profiles.get('family')
  if (!saved) return

  const family = normalizeFamilyProfile(saved)
  const childId = family.activeChildId || LEGACY_CHILD_ID
  await profiles.put({ ...family, updatedAt: saved.updatedAt || new Date().toISOString() })
  await targets.toCollection().modify((target) => { if (!target.childId) target.childId = childId })
  await memories.toCollection().modify((memory) => { if (!memory.childId) memory.childId = childId })
})

// Daily coaching context is intentionally local to this device and scoped to one child.
// It contains only learning-state signals, never free-form conversation history.
db.version(3).stores({
  profiles: '&id, updatedAt',
  targets: '&id, childId, createdAt, status, type',
  memories: '&id, childId, surahId, nextReviewAt',
  preferences: '&key',
  meta: '&key',
  coachCheckins: '&id, childId, date, [childId+date], updatedAt',
})

// These compound indexes keep the home screen's day-scoped and memory-scoped
// lookups from growing with the family's historical data.
db.version(4).stores({
  profiles: '&id, updatedAt',
  targets: '&id, childId, createdAt, status, type, [childId+createdAt], [childId+memoryId]',
  memories: '&id, childId, surahId, nextReviewAt, [childId+surahId], [childId+nextReviewAt]',
  preferences: '&key',
  meta: '&key',
  coachCheckins: '&id, childId, date, [childId+date], updatedAt',
})

const legacyKeys = { profile: 'wali-tahfiz-profile', targets: 'wali-tahfiz-targets', memories: 'wali-tahfiz-memories', quranRepeat: 'wali-tahfiz-quran-repeat' }
const readLegacyJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
const backupTables = ['profiles', 'targets', 'memories', 'preferences', 'coachCheckins']

export const BACKUP_FORMAT = 'wali-tahfiz-backup'
export const BACKUP_VERSION = 1

export function validateBackup(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) throw new Error('File cadangan tidak dikenali.')
  if (backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION || !backup.data || typeof backup.data !== 'object') {
    throw new Error('File ini bukan cadangan Wali Tahfiz yang didukung.')
  }
  if (!backup.data.profiles?.some((profile) => profile?.id === 'family')) throw new Error('Cadangan ini tidak memiliki profil keluarga.')
  if (backupTables.some((table) => !Array.isArray(backup.data[table]))) throw new Error('Isi cadangan tidak lengkap.')
  return backup
}

export async function createBackup() {
  const entries = await Promise.all(backupTables.map(async (table) => [table, await db.table(table).toArray()]))
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: Object.fromEntries(entries) }
}

export async function restoreBackup(candidate) {
  const backup = validateBackup(candidate)
  const family = normalizeFamilyProfile(backup.data.profiles.find((profile) => profile.id === 'family'))
  await db.transaction('rw', db.profiles, db.targets, db.memories, db.preferences, db.coachCheckins, async () => {
    await Promise.all(backupTables.map((table) => db.table(table).clear()))
    await db.profiles.put({ ...family, id: 'family', updatedAt: family.updatedAt || new Date().toISOString() })
    await Promise.all(backupTables.filter((table) => table !== 'profiles').map((table) => {
      const rows = backup.data[table]
      return rows.length ? db.table(table).bulkPut(rows) : Promise.resolve()
    }))
  })
  // A legacy backup on the receiving device must not overwrite this restore
  // during the one-time startup migration.
  Object.values(legacyKeys).forEach((key) => localStorage.removeItem(key))
  return family
}

export async function clearAllData() {
  await db.transaction('rw', db.profiles, db.targets, db.memories, db.preferences, db.coachCheckins, db.meta, async () => {
    await Promise.all([...backupTables, 'meta'].map((table) => db.table(table).clear()))
  })
  Object.values(legacyKeys).forEach((key) => localStorage.removeItem(key))
}

export function hasLegacyStorage() {
  return Object.values(legacyKeys).some((key) => localStorage.getItem(key) !== null)
}

// Legacy localStorage remains as a recoverable backup. This import runs once.
export async function migrateLegacyStorage() {
  if (!hasLegacyStorage()) return
  if (await db.meta.get('legacy-localstorage-v1')) return
  const profile = readLegacyJson(legacyKeys.profile, null)
  const targets = readLegacyJson(legacyKeys.targets, [])
  const memories = readLegacyJson(legacyKeys.memories, [])
  const quranRepeat = Number(localStorage.getItem(legacyKeys.quranRepeat))
  const family = normalizeFamilyProfile(profile)
  const childId = family?.activeChildId
  await db.transaction('rw', db.profiles, db.targets, db.memories, db.preferences, db.meta, async () => {
    if (family) await db.profiles.put({ ...family, updatedAt: new Date().toISOString() })
    if (Array.isArray(targets) && targets.length) await db.targets.bulkPut(targets.map((target) => ({ ...target, childId })))
    if (Array.isArray(memories) && memories.length) await db.memories.bulkPut(memories.map((memory) => ({ ...memory, childId })))
    if ([1, 2, 3, 5].includes(quranRepeat)) await db.preferences.put({ key: 'quran-repeat', value: quranRepeat })
    await db.meta.put({ key: 'legacy-localstorage-v1', migratedAt: new Date().toISOString() })
  })
}

export const getProfile = () => db.profiles.get('family')
export const saveProfile = (profile) => db.profiles.put({ ...normalizeFamilyProfile(profile), id: 'family', updatedAt: new Date().toISOString() })
export const getQuranRepeat = () => db.preferences.get('quran-repeat')
export const saveQuranRepeat = (value) => db.preferences.put({ key: 'quran-repeat', value })
export const getQuranRange = () => db.preferences.get('quran-range')
export const saveQuranRange = (value) => db.preferences.put({ key: 'quran-range', value })
export const getQuranQari = () => db.preferences.get('quran-qari')
export const saveQuranQari = (value) => db.preferences.put({ key: 'quran-qari', value })
export const getAppLocale = () => db.preferences.get('app-locale')
export const saveAppLocale = (value) => db.preferences.put({ key: 'app-locale', value })

export function localDayBounds(day) {
  const start = new Date(`${day}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function getTargetsForDay(childId, day) {
  const { start, end } = localDayBounds(day)
  return db.targets
    .where('[childId+createdAt]')
    .between([childId, start], [childId, end], true, false)
    .reverse()
    .toArray()
}

export const getTargetsForMemory = (childId, memoryId) => db.targets.where('[childId+memoryId]').equals([childId, memoryId]).toArray()
