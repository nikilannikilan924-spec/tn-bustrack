'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Lang, t as translate } from './translations';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem('tn-bustrack-lang');
    if (stored === 'en' || stored === 'ta') {
      setLang(stored);
    }
  }, []);

  const handleSetLang = (newLang: Lang) => {
    setLang(newLang);
    window.localStorage.setItem('tn-bustrack-lang', newLang);
  };

  const tFn = (key: string, vars?: Record<string, string>) => translate(lang, key, vars);

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t: tFn }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
