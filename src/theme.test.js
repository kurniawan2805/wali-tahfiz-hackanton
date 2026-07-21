import test from 'node:test'
import assert from 'node:assert/strict'
import { applyTheme, THEME_COLORS, THEME_STORAGE_KEY } from './theme.js'

function createThemeTarget(initialClasses = []) {
  const classes = new Set(initialClasses)
  const writes = new Map()
  return {
    root: {
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name), contains: (name) => classes.has(name) },
      dataset: {},
      style: {},
    },
    body: {
      classList: { add: (name) => classes.add(`body:${name}`), remove: (name) => classes.delete(`body:${name}`), toggle: (name, enabled) => enabled ? classes.add(`body:${name}`) : classes.delete(`body:${name}`) },
    },
    themeColor: {},
    storage: { setItem: (key, value) => writes.set(key, value) },
    classes,
    writes,
  }
}

test('applyTheme adds dark class and persists dark mode', () => {
  const target = createThemeTarget()
  assert.equal(applyTheme('dark', target), 'dark')
  assert.equal(target.classes.has('dark'), true)
  assert.equal(target.classes.has('body:dark'), true)
  assert.equal(target.root.dataset.theme, 'dark')
  assert.equal(target.root.style.colorScheme, 'dark')
  assert.equal(target.themeColor.content, THEME_COLORS.dark)
  assert.equal(target.writes.get(THEME_STORAGE_KEY), 'dark')
})

test('applyTheme removes stale dark classes and persists light mode', () => {
  const target = createThemeTarget(['dark', 'body:dark'])
  assert.equal(applyTheme('light', target), 'light')
  assert.equal(target.classes.has('dark'), false)
  assert.equal(target.classes.has('body:dark'), false)
  assert.equal(target.root.dataset.theme, 'light')
  assert.equal(target.root.style.colorScheme, 'light')
  assert.equal(target.themeColor.content, THEME_COLORS.light)
  assert.equal(target.writes.get(THEME_STORAGE_KEY), 'light')
})
