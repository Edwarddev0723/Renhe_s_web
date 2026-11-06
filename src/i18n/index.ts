import zh from './zh.json';
import en from './en.json';

export const languages = {
  zh: '中文',
  en: 'English',
};

export const defaultLang = 'zh';

export const translations = {
  zh,
  en,
} as const;

export type Lang = keyof typeof translations;

/** A value that is either shared by both languages or given per language. */
export type Localized<T = string> = T | { zh: T; en: T };

const rawBase = import.meta.env.BASE_URL;
export const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.slice(base.length - 1).split('/');
  if (lang in translations) return lang as Lang;
  return defaultLang;
}

export function otherLang(lang: Lang): Lang {
  return lang === 'zh' ? 'en' : 'zh';
}

/** Pick the right language from a localized value. */
export function pick<T>(value: Localized<T>, lang: Lang): T {
  if (value && typeof value === 'object' && lang in (value as object)) {
    return (value as Record<Lang, T>)[lang];
  }
  return value as T;
}

/** Prefix a site-relative path with the deploy base (`/Renhe_s_web/`). */
export function withBase(path = ''): string {
  return `${base}${path.replace(/^\//, '')}`;
}

/**
 * Localized page URL. `page` is a slug like `about` or `''` for home,
 * optionally with a hash (`#awards`).
 */
export function localePath(lang: Lang, page = ''): string {
  const [slug, hash] = page.replace(/^\//, '').split('#');
  const clean = slug.replace(/\/$/, '');
  const prefix = lang === defaultLang ? '' : `${lang}/`;
  const path = clean ? `${prefix}${clean}/` : prefix;
  return withBase(path) + (hash ? `#${hash}` : '');
}

/** The page slug (`about`, `''` …) for a pathname, independent of language. */
export function pageSlug(pathname: string): string {
  let rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '');
  rest = rest.replace(/\/$/, '');
  const [first, ...tail] = rest.split('/');
  if (first in translations) rest = tail.join('/');
  return rest;
}

export function useTranslations(lang: Lang) {
  return function t(key: string): string {
    const keys = key.split('.');
    let value: any = translations[lang];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to default language
        value = translations[defaultLang];
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }

    return typeof value === 'string' ? value : key;
  };
}

export function getTranslationArray(lang: Lang, key: string): string[] {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return [];
    }
  }

  return Array.isArray(value) ? value : [];
}
