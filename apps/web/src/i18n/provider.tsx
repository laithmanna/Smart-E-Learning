'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { en, type Messages } from './messages/en';
import { ar } from './messages/ar';

export type Locale = 'en' | 'ar';
export const LOCALES: Locale[] = ['en', 'ar'];

const MESSAGES: Record<Locale, Messages> = { en, ar };
const STORAGE_KEY = 'sel_locale';

interface LocaleContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (l: Locale) => void;
  t: <K extends DotPaths<Messages>>(key: K) => string;
}

// Generate dot-path types from the messages object
type DotPaths<T> = {
  [K in keyof T]: T[K] extends string
    ? K & string
    : T[K] extends object
      ? `${K & string}.${DotPaths<T[K]>}`
      : never;
}[keyof T];

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getNested(obj: unknown, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in cur) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  return typeof cur === 'string' ? cur : path;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') {
      setLocaleState(saved);
    }
    setHydrated(true);
  }, []);

  // Apply <html lang> + dir whenever locale changes
  useEffect(() => {
    if (!hydrated) return;
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, hydrated]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    <K extends DotPaths<Messages>>(key: K): string => {
      return getNested(MESSAGES[locale], key);
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be inside <LocaleProvider>');
  return ctx;
}

export function useT() {
  return useLocale().t;
}
