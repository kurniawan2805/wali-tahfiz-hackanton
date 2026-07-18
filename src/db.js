import Dexie from 'dexie'

export const db = new Dexie('wali-tahfiz')

const LEGACY_CHILD_ID = 'child-legacy'
const defaultRepeats = { talaqqi: 3, tikrar: 10, rabt: 1 }
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
      role: profile.role || 'Ibu',
      children,
      activeChildId: children.some((child) => child.id === profile.activeChildId) ? profile.activeChildId : children[0]?.id || null,
    }
  }
  const child = legacyChild(profile)
  return { id: 'family', role: profile.role || 'Ibu', activeChildId: child.id, children: [child] }
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

const legacyKeys = { profile: 'wali-tahfiz-profile', targets: 'wali-tahfiz-targets', memories: 'wali-tahfiz-memories', quranRepeat: 'wali-tahfiz-quran-repeat' }
const readLegacyJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }

// Legacy localStorage remains as a recoverable backup. This import runs once.
export async function migrateLegacyStorage() {
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
