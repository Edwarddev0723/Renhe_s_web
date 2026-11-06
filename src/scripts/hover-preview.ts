// Floats a cover image next to the cursor while hovering list rows that have `data-cover`.
export function mountHoverPreview(list: HTMLElement) {
  const img = list.nextElementSibling as HTMLImageElement | null;
  if (!img?.matches('[data-preview-img]')) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let x = 0;
  let y = 0;
  let cx = 0;
  let cy = 0;
  let raf = 0;
  let shown = false;

  const loop = () => {
    cx += (x - cx) * 0.18;
    cy += (y - cy) * 0.18;
    img.style.transform = `translate3d(${cx + 24}px, ${cy - img.offsetHeight / 2}px, 0)`;
    raf = shown || Math.abs(x - cx) > 0.5 ? requestAnimationFrame(loop) : 0;
  };

  list.querySelectorAll<HTMLElement>('[data-cover]').forEach((row) => {
    row.addEventListener('pointerenter', (e) => {
      const src = row.dataset.cover;
      if (!src) return;
      if (img.getAttribute('src') !== src) img.src = src;
      if (!shown) {
        cx = x = e.clientX;
        cy = y = e.clientY;
      }
      shown = true;
      img.classList.add('is-shown');
      if (!raf) raf = requestAnimationFrame(loop);
    });
    row.addEventListener('pointerleave', () => {
      shown = false;
      img.classList.remove('is-shown');
    });
  });

  list.addEventListener(
    'pointermove',
    (e) => {
      x = e.clientX;
      y = e.clientY;
    },
    { passive: true }
  );

  // A late scroll would leave the preview floating over the wrong row.
  window.addEventListener(
    'scroll',
    () => {
      if (!shown) return;
      shown = false;
      img.classList.remove('is-shown');
    },
    { passive: true }
  );
}
