import assert from 'node:assert/strict'
import test from 'node:test'
import { BACKUP_FORMAT, BACKUP_VERSION, localDayBounds, validateBackup } from './db.js'

test('day-scoped target bounds cover the local calendar day only', () => {
  const { start, end } = localDayBounds('2026-07-19')
  assert.ok(new Date(start) < new Date(end))
  assert.equal(new Date(end).getTime() - new Date(start).getTime(), 24 * 60 * 60 * 1000)
})

test('backup validation accepts a complete Wali Tahfiz backup', () => {
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    data: {
      profiles: [{ id: 'family', role: 'Bunda', children: [], activeChildId: null }],
      targets: [], memories: [], preferences: [], coachCheckins: [],
    },
  }
  assert.equal(validateBackup(backup), backup)
})

test('backup validation rejects unsupported or incomplete files', () => {
  assert.throws(() => validateBackup({}), /tidak dikenali|didukung/)
  assert.throws(() => validateBackup({ format: BACKUP_FORMAT, version: BACKUP_VERSION, data: { profiles: [] } }), /profil keluarga|tidak lengkap/)
})
