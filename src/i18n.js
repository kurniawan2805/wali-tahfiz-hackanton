import { createContext, createElement, useContext, useEffect, useMemo } from 'react'
import id from './locales/id.json'
import en from './locales/en.json'

export const DEFAULT_LOCALE = import.meta.env.VITE_APP_LOCALE === 'en' ? 'en' : 'id'
export const SUPPORTED_LOCALES = [
  { id: 'id', label: 'Bahasa Indonesia', shortLabel: 'ID' },
  { id: 'en', label: 'English', shortLabel: 'EN' },
]

export const messages = { id, en }

const LocaleContext = createContext({ locale: DEFAULT_LOCALE, t: (key) => key })

export function translate(locale, key, values = {}) {
  const message = key.split('.').reduce((result, part) => result?.[part], messages[locale])
    ?? key.split('.').reduce((result, part) => result?.[part], messages.id)
    ?? key
  return String(message).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`)
}

export function LocaleProvider({ locale, children }) {
  useEffect(() => { document.documentElement.lang = locale === 'en' ? 'en' : 'id' }, [locale])
  const value = useMemo(() => ({ locale, t: (key, values) => translate(locale, key, values) }), [locale])
  return createElement(LocaleContext.Provider, { value }, children)
}

export const useLocale = () => useContext(LocaleContext)
