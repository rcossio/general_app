import en from './en'
import it from './it'
import es from './es'

export type Locale = 'en' | 'it' | 'es'

export const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
]

export const translations: Record<Locale, typeof en> = { en, it, es }
