export const THEME_STORAGE_KEY = 'wali-tahfiz:theme'
export const THEME_COLORS = { light: '#FDFBF7', dark: '#0C1311' }

   export function normalizeTheme(theme) {
     return theme === 'dark' ? 'dark' : 'light'
   }

   export function getInitialTheme({ storage = window.localStorage, mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null } = {}) {
     const saved = storage?.getItem(THEME_STORAGE_KEY)
     if (saved === 'dark' || saved === 'light') return saved
     if (mediaQuery?.matches) return 'dark'
     return 'light'
   }

   export function applyTheme(theme, { root = document.documentElement, body = document.body, storage = window.localStorage, themeColor = document.querySelector('meta[name="theme-color"]') } = {}) {
  const resolvedTheme = normalizeTheme(theme)
  const isDark = resolvedTheme === 'dark'

  // Apply the class to both document layers. This also clears a stale body class
  // left behind by an earlier app version or a restored PWA session.
  root.classList.toggle('dark', isDark)
  body?.classList.toggle('dark', isDark)

  root.dataset.theme = resolvedTheme
  root.style.colorScheme = resolvedTheme
  if (themeColor) themeColor.content = THEME_COLORS[resolvedTheme]
  storage.setItem(THEME_STORAGE_KEY, resolvedTheme)

  return resolvedTheme
}
