// ⌘K command palette: jump to pages, flip theme/language, copy email.
import { toggleTheme } from './theme';

const dialog = document.querySelector<HTMLDialogElement>('[data-cmdk]');

if (dialog) {
  const input = dialog.querySelector<HTMLInputElement>('[data-cmdk-input]')!;
  const list = dialog.querySelector<HTMLElement>('[data-cmdk-list]')!;
  const empty = dialog.querySelector<HTMLElement>('[data-cmdk-empty]')!;
  const toast = dialog.querySelector<HTMLElement>('[data-cmdk-toast]');
  const items = [...list.querySelectorAll<HTMLElement>('[data-item]')];
  const groups = [...list.querySelectorAll<HTMLElement>('[data-group]')];
  let active = 0;

  const visible = () => items.filter((el) => !el.hidden);

  function select(index: number) {
    const shown = visible();
    if (!shown.length) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    active = (index + shown.length) % shown.length;
    shown.forEach((el, i) => el.setAttribute('aria-selected', String(i === active)));
    input.setAttribute('aria-activedescendant', shown[active].id);
    shown[active].scrollIntoView({ block: 'nearest' });
  }

  function filter(query: string) {
    const q = query.trim().toLowerCase();
    for (const el of items) {
      const hay = `${el.textContent} ${el.dataset.keywords ?? ''}`.toLowerCase();
      el.hidden = q !== '' && !q.split(/\s+/).every((word) => hay.includes(word));
      el.setAttribute('aria-selected', 'false');
    }
    for (const group of groups) {
      const name = group.dataset.group;
      group.hidden = !items.some((el) => el.dataset.itemGroup === name && !el.hidden);
    }
    empty.hidden = visible().length > 0;
    select(0);
  }

  function open() {
    if (dialog!.open) return;
    input.value = '';
    filter('');
    dialog!.showModal();
    input.focus();
  }

  function close() {
    if (dialog!.open) dialog!.close();
  }

  async function run(el: HTMLElement) {
    const { action, href, external } = el.dataset;
    if (action === 'theme') {
      close();
      toggleTheme();
      return;
    }
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(el.dataset.value ?? '');
        if (toast) {
          toast.hidden = false;
          window.setTimeout(() => {
            toast.hidden = true;
            close();
          }, 900);
        } else {
          close();
        }
      } catch {
        window.location.href = `mailto:${el.dataset.value}`;
      }
      return;
    }
    if (href) {
      close();
      if (external !== undefined) window.open(href, '_blank', 'noopener');
      else window.location.href = href;
    }
  }

  input.addEventListener('input', () => filter(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      select(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      select(active - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = visible()[active];
      if (target) run(target);
    }
  });

  items.forEach((el) => {
    el.addEventListener('click', () => run(el));
    el.addEventListener('pointermove', () => {
      const index = visible().indexOf(el);
      if (index !== -1 && index !== active) select(index);
    });
  });

  // Clicking the backdrop (the dialog box itself, outside the panel) closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  document.querySelectorAll('[data-cmdk-open]').forEach((btn) => btn.addEventListener('click', open));

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dialog.open ? close() : open();
      return;
    }
    if (e.key === '/' && !dialog.open) {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      open();
    }
  });

  // Show the platform's shortcut on trigger buttons.
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll<HTMLElement>('[data-cmdk-key]').forEach((el) => {
    el.textContent = isMac ? '⌘K' : 'Ctrl K';
  });
}
