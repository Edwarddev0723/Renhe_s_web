// Site-wide behaviour shared by every page.
import { toggleTheme } from './theme';
import './cmdk';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Theme ---------- */
document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const rect = btn.getBoundingClientRect();
    toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 't' || e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement;
  if (target.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return;
  toggleTheme();
});

/* ---------- Reveal on scroll ---------- */
const revealables = document.querySelectorAll<HTMLElement>('[data-reveal]');
if ('IntersectionObserver' in window && !reduceMotion.matches) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('is-visible'));
}
document.documentElement.setAttribute('data-ready', '');

/* ---------- Cursor spotlight on cards ---------- */
document.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'mouse') return;
    const card = (e.target as HTMLElement).closest<HTMLElement>('.spotlight');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  },
  { passive: true }
);

/* ---------- Navbar ---------- */
const nav = document.querySelector<HTMLElement>('[data-nav]');
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');

function setMenu(open: boolean) {
  if (!menuBtn || !menu) return;
  menuBtn.setAttribute('aria-expanded', String(open));
  menu.toggleAttribute('data-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});
window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => {
  if (e.matches) setMenu(false);
});

if (nav) {
  let ticking = false;
  const onScroll = () => {
    nav.toggleAttribute('data-scrolled', window.scrollY > 12);
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();
}

/* ---------- Copy to clipboard ---------- */
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  const label = btn.querySelector<HTMLElement>('[data-copy-label]');
  const original = label?.textContent ?? '';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy ?? '');
      if (label) label.textContent = btn.dataset.copied ?? 'Copied';
      btn.classList.add('is-copied');
      window.setTimeout(() => {
        if (label) label.textContent = original;
        btn.classList.remove('is-copied');
      }, 1800);
    } catch {
      window.location.href = `mailto:${btn.dataset.copy}`;
    }
  });
});

/* ---------- Counters ---------- */
// Numbers are rendered final in HTML. Only counters still below the fold are
// reset and counted up when they scroll in, so nothing visible ever flashes.
const counters = [...document.querySelectorAll<HTMLElement>('[data-count]')].filter(
  (el) => el.getBoundingClientRect().top > window.innerHeight
);
if (counters.length && 'IntersectionObserver' in window && !reduceMotion.matches) {
  const formatter = (el: HTMLElement) => {
    const decimals = Number(el.dataset.decimals ?? 0);
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };
  const countIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        countIO.unobserve(el);
        const target = Number(el.dataset.count);
        const fmt = formatter(el);
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = fmt.format(target * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => {
    el.textContent = formatter(el).format(0);
    countIO.observe(el);
  });
}
