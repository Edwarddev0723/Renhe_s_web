// Theme switching with an "ink spreading" view transition.
type Theme = 'light' | 'dark';

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function applyTheme(theme: Theme) {
  root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch {
    /* storage blocked: the choice simply won't persist */
  }
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

export function toggleTheme(origin?: { x: number; y: number }) {
  const next: Theme = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };

  if (!doc.startViewTransition || reduceMotion.matches) {
    applyTheme(next);
    return;
  }

  const x = origin?.x ?? window.innerWidth - 40;
  const y = origin?.y ?? 32;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.style.setProperty('--vt-x', `${x}px`);
  root.style.setProperty('--vt-y', `${y}px`);
  root.style.setProperty('--vt-r', `${r}px`);
  root.classList.add('theme-vt');
  const transition = doc.startViewTransition(() => applyTheme(next));
  // A rapid double toggle skips the first transition; that's fine, not an error.
  transition.ready.catch(() => {});
  transition.finished.finally(() => root.classList.remove('theme-vt'));
}
