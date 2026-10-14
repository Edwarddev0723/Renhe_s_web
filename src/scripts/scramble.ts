// Cycles through phrases, "decoding" each one through random glyphs.
const LATIN = '01<>/\\_-=+*#%░▒▓';
const CJK = '資料模型學習深度神經網路語言視覺公平金融嵌入訓練推論';

export function mountScramble(el: HTMLElement) {
  const phrases: string[] = JSON.parse(el.dataset.phrases ?? '[]');
  if (phrases.length < 2) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pool = /[㐀-鿿]/.test(phrases.join('')) ? CJK + LATIN : LATIN;
  const hold = Number(el.dataset.hold ?? 3200);
  let index = 0;
  let timer = 0;

  const randomGlyph = () => pool[Math.floor(Math.random() * pool.length)];

  function scrambleTo(next: string) {
    if (reduce) {
      el.textContent = next;
      return;
    }
    const from = el.textContent ?? '';
    const length = Math.max(from.length, next.length);
    const queue = Array.from({ length }, (_, i) => {
      const start = Math.floor(Math.random() * 12);
      return { from: from[i] ?? '', to: next[i] ?? '', start, end: start + 10 + Math.floor(Math.random() * 16) };
    });
    let frame = 0;
    const tick = () => {
      let done = 0;
      let html = '';
      for (const q of queue) {
        if (frame >= q.end) {
          done++;
          html += escape(q.to);
        } else if (frame >= q.start) {
          html += `<span class="scramble-glyph">${escape(randomGlyph())}</span>`;
        } else {
          html += escape(q.from);
        }
      }
      el.innerHTML = html;
      if (done < queue.length) {
        frame++;
        requestAnimationFrame(tick);
      }
    };
    tick();
  }

  function schedule() {
    timer = window.setTimeout(() => {
      index = (index + 1) % phrases.length;
      scrambleTo(phrases[index]);
      schedule();
    }, hold);
  }

  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(timer);
    if (!document.hidden) schedule();
  });

  schedule();
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
