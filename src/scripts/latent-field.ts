// "Fig. 1" — research interests as clusters in a slowly rotating 3D embedding.
// Ink dots for the cloud, vermilion for the cluster in focus.

type Vec3 = [number, number, number];

interface ClusterSpec {
  id: string;
  label: string;
  caption: string;
  c: Vec3;
  s: number;
  n: number;
}

interface Point {
  x: number;
  y: number;
  z: number;
  cluster: number;
  r: number;
  nb: number[];
}

const TAU = Math.PI * 2;
const FOCAL = 3.2;
const AUTO_SWITCH_MS = 3800;
const PIN_MS = 9000;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function mountLatentField(root: HTMLElement) {
  const canvas = root.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const specs: ClusterSpec[] = JSON.parse(root.dataset.clusters ?? '[]');
  if (!specs.length) return;
  const labelEl = root.querySelector<HTMLElement>('[data-latent-label]');
  const captionEl = root.querySelector<HTMLElement>('[data-latent-caption]');
  const captionBox = root.querySelector<HTMLElement>('[data-latent-box]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Build the cloud (seeded, so it's the same every visit) ---------- */
  const rand = mulberry32(20240923);
  const gauss = () => {
    let u = 0;
    while (u === 0) u = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rand());
  };
  const density = window.innerWidth < 640 ? 0.55 : 1;

  const points: Point[] = [];
  specs.forEach((spec, ci) => {
    const start = points.length;
    const n = Math.round(spec.n * density);
    for (let i = 0; i < n; i++) {
      points.push({
        x: spec.c[0] + gauss() * spec.s,
        y: spec.c[1] + gauss() * spec.s,
        z: spec.c[2] + gauss() * spec.s,
        cluster: ci,
        r: 0.7 + rand() * 1.1,
        nb: [],
      });
    }
    // Two nearest neighbours inside the cluster become constellation edges.
    for (let i = start; i < points.length; i++) {
      const a = points[i];
      let b1 = -1;
      let b2 = -1;
      let d1 = Infinity;
      let d2 = Infinity;
      for (let j = start; j < points.length; j++) {
        if (i === j) continue;
        const b = points[j];
        const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
        if (d < d1) {
          d2 = d1;
          b2 = b1;
          d1 = d;
          b1 = j;
        } else if (d < d2) {
          d2 = d;
          b2 = j;
        }
      }
      a.nb = [b1, b2].filter((j) => j >= 0);
    }
  });

  const ambient = Math.round(240 * density);
  for (let i = 0; i < ambient; i++) {
    const w = 0.3 + Math.cbrt(rand()) * 1.0;
    const th = TAU * rand();
    const ph = Math.acos(2 * rand() - 1);
    points.push({
      x: w * Math.sin(ph) * Math.cos(th),
      y: w * Math.sin(ph) * Math.sin(th) * 0.85,
      z: w * Math.cos(ph),
      cluster: -1,
      r: 0.4 + rand() * 0.7,
      nb: [],
    });
  }

  /* ---------- State ---------- */
  const proj = new Float32Array(points.length * 4); // sx, sy, depth(0 near..1 far), scale
  const order = points.map((_, i) => i);
  const centers = specs.map(() => ({ sx: 0, sy: 0, depth: 0, scale: 1 }));
  const labelBoxes = specs.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));

  let w = 0;
  let h = 0;
  let dpr = 1;
  let ay = 0.55;
  let ax = -0.32;
  let vy = 0;
  let parX = 0;
  let parY = 0;
  let targetParX = 0;
  let targetParY = 0;
  let active = 0;
  let hovered = -1;
  let activation = reduce ? 1 : 0;
  let lastSwitch = performance.now();
  let pinnedUntil = 0;
  let dragging = false;
  let dragMoved = 0;
  let lastX = 0;
  let lastY = 0;
  let introStart = performance.now();
  let inView = true;
  let raf = 0;
  let lastFrame = performance.now();

  let colors = readColors();

  function readColors() {
    const cs = getComputedStyle(root);
    const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
    return {
      fg: v('--fg', '#ece6da'),
      muted: v('--fg-3', '#8a8378'),
      accent: v('--accent', '#e5432c'),
      accentText: v('--accent-fg', '#ff6b52'),
    };
  }

  function resize() {
    const rect = canvas!.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas!.width = Math.max(1, Math.round(w * dpr));
    canvas!.height = Math.max(1, Math.round(h * dpr));
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestDraw();
  }

  function setActive(index: number, now = performance.now()) {
    if (index === active && activation > 0) return;
    active = index;
    activation = reduce ? 1 : 0;
    lastSwitch = now;
    if (labelEl && captionEl) {
      captionBox?.classList.remove('is-swapping');
      void captionBox?.offsetWidth; // restart the CSS fade
      captionBox?.classList.add('is-swapping');
      labelEl.textContent = specs[index].label;
      captionEl.textContent = specs[index].caption;
    }
  }

  /* ---------- Projection ---------- */
  function projectAll(scaleIn: number) {
    const cy0 = Math.cos(ay + parX);
    const sy0 = Math.sin(ay + parX);
    const cx0 = Math.cos(ax + parY);
    const sx0 = Math.sin(ax + parY);
    // On phones the cloud is a backdrop above the name: centred, smaller, higher.
    const narrow = w < 560;
    const R = Math.min(w, h) * (narrow ? 0.38 : 0.42);
    const cx = w * (narrow ? 0.5 : 0.53);
    const cy = h * (narrow ? 0.42 : 0.5);

    const project = (x: number, y: number, z: number, out: { sx: number; sy: number; depth: number; scale: number }) => {
      x *= scaleIn;
      y *= scaleIn;
      z *= scaleIn;
      const x1 = x * cy0 + z * sy0;
      const z1 = -x * sy0 + z * cy0;
      const y2 = y * cx0 - z1 * sx0;
      const z2 = y * sx0 + z1 * cx0;
      const p = FOCAL / (FOCAL + z2);
      out.sx = cx + x1 * p * R;
      out.sy = cy - y2 * p * R;
      out.depth = Math.min(1, Math.max(0, (z2 + 1.4) / 2.8));
      out.scale = p;
    };

    const tmp = { sx: 0, sy: 0, depth: 0, scale: 1 };
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      project(pt.x, pt.y, pt.z, tmp);
      proj[i * 4] = tmp.sx;
      proj[i * 4 + 1] = tmp.sy;
      proj[i * 4 + 2] = tmp.depth;
      proj[i * 4 + 3] = tmp.scale;
    }
    specs.forEach((spec, i) => project(spec.c[0], spec.c[1], spec.c[2], centers[i]));
    order.sort((a, b) => proj[b * 4 + 2] - proj[a * 4 + 2]);
  }

  /* ---------- Drawing ---------- */
  function draw(now: number) {
    const intro = reduce ? 1 : easeOutCubic(Math.min(1, (now - introStart) / 1800));
    projectAll(0.35 + intro * 0.65);
    ctx!.clearRect(0, 0, w, h);

    const focus = hovered >= 0 ? hovered : active;
    const act = easeOutCubic(activation);

    // Constellation edges for the cluster in focus
    ctx!.lineWidth = 0.7;
    ctx!.strokeStyle = colors.accent;
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (pt.cluster !== focus) continue;
      for (const j of pt.nb) {
        const depth = (proj[i * 4 + 2] + proj[j * 4 + 2]) / 2;
        ctx!.globalAlpha = (0.42 - depth * 0.3) * act * intro;
        ctx!.beginPath();
        ctx!.moveTo(proj[i * 4], proj[i * 4 + 1]);
        ctx!.lineTo(proj[j * 4], proj[j * 4 + 1]);
        ctx!.stroke();
      }
    }

    // Dots, far to near
    for (const i of order) {
      const pt = points[i];
      const sx = proj[i * 4];
      const sy = proj[i * 4 + 1];
      const depth = proj[i * 4 + 2];
      const scale = proj[i * 4 + 3];
      const near = 1 - depth;
      let alpha: number;
      let radius = pt.r * scale;

      if (pt.cluster === -1) {
        ctx!.fillStyle = colors.muted;
        alpha = 0.18 + near * 0.32;
        radius *= 0.85;
      } else if (pt.cluster === focus) {
        ctx!.fillStyle = act > 0.02 ? colors.accent : colors.fg;
        alpha = 0.55 + near * 0.45;
        radius *= 1 + 0.4 * act;
      } else {
        ctx!.fillStyle = colors.fg;
        alpha = 0.22 + near * 0.5;
      }

      ctx!.globalAlpha = alpha * intro;
      ctx!.beginPath();
      ctx!.arc(sx, sy, Math.max(0.45, radius), 0, TAU);
      ctx!.fill();
    }

    // Labels, with a hairline leader from each cluster's centre.
    // Phones only label the cluster in focus; the rest would just be clutter.
    const narrow = w < 560;
    const fontSize = narrow ? 10 : 11;
    ctx!.font = `500 ${fontSize}px "JetBrains Mono", "Noto Sans TC", ui-monospace, monospace`;
    ctx!.textBaseline = 'middle';
    specs.forEach((spec, i) => {
      const c = centers[i];
      const isFocus = i === focus;
      const text = spec.label.toUpperCase();
      const tw = ctx!.measureText(text).width;
      // Point the label outward, unless that would push it off the canvas.
      let right = c.sx >= w / 2;
      if (right && c.sx + 34 + tw > w - 6) right = false;
      else if (!right && c.sx - 34 - tw < 6) right = true;
      const lx = c.sx + (right ? 22 : -22);
      const ly = c.sy - 18;
      const near = 1 - c.depth;
      const fade = intro * (isFocus ? 1 : 0.4 + near * 0.5);
      const tx = right ? lx + 12 : lx - 12 - tw;
      const labelled = !narrow || isFocus;
      labelBoxes[i] = labelled ? { x: tx - 6, y: ly - 12, w: tw + 12, h: 24 } : { x: 0, y: 0, w: 0, h: 0 };

      if (labelled) {
        ctx!.globalAlpha = fade * (isFocus ? 0.9 : 0.5);
        ctx!.strokeStyle = isFocus ? colors.accent : colors.muted;
        ctx!.lineWidth = 0.75;
        ctx!.beginPath();
        ctx!.moveTo(c.sx, c.sy);
        ctx!.lineTo(lx, ly);
        ctx!.lineTo(lx + (right ? 8 : -8), ly);
        ctx!.stroke();

        ctx!.globalAlpha = fade;
        ctx!.fillStyle = isFocus ? colors.accentText : colors.muted;
        ctx!.fillText(text, tx, ly + 0.5);
      }

      if (isFocus) {
        // diamond marker + soft pulse at the centroid
        ctx!.globalAlpha = intro;
        ctx!.fillStyle = colors.accent;
        ctx!.save();
        ctx!.translate(c.sx, c.sy);
        ctx!.rotate(Math.PI / 4);
        ctx!.fillRect(-3, -3, 6, 6);
        ctx!.restore();
        if (!reduce) {
          const t = ((now - lastSwitch) % 1800) / 1800;
          ctx!.globalAlpha = (1 - t) * 0.45 * intro;
          ctx!.strokeStyle = colors.accent;
          ctx!.beginPath();
          ctx!.arc(c.sx, c.sy, 6 + t * 26, 0, TAU);
          ctx!.stroke();
        }
      }
    });

    ctx!.globalAlpha = 1;
  }

  /* ---------- Loop ---------- */
  function frame(now: number) {
    raf = 0;
    const dt = Math.min(64, now - lastFrame);
    lastFrame = now;

    if (!reduce) {
      if (!dragging) {
        ay += 0.00011 * dt + vy;
        vy *= 0.93;
      }
      parX += (targetParX - parX) * 0.04;
      parY += (targetParY - parY) * 0.04;
      activation = Math.min(1, activation + dt / 650);
      if (hovered === -1 && !dragging && now > pinnedUntil && now - lastSwitch > AUTO_SWITCH_MS) {
        setActive((active + 1) % specs.length, now);
      }
    }

    draw(now);
    if (!reduce && inView && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function requestDraw() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ---------- Interaction ---------- */
  function hitTest(x: number, y: number) {
    let best = -1;
    let bestD = 44 * 44;
    specs.forEach((_, i) => {
      const b = labelBoxes[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        best = i;
        bestD = -1;
        return;
      }
      if (bestD < 0) return;
      const d = (centers[i].sx - x) ** 2 + (centers[i].sy - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  const local = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      dragMoved += Math.abs(dx) + Math.abs(dy);
      ay += dx * 0.006;
      ax = Math.max(-1.2, Math.min(1.2, ax + dy * 0.004));
      vy = dx * 0.0025;
      requestDraw();
      return;
    }
    const { x, y } = local(e);
    const hit = hitTest(x, y);
    if (hit !== hovered) {
      hovered = hit;
      if (hit >= 0) setActive(hit);
      requestDraw();
    }
    canvas.style.cursor = hit >= 0 ? 'pointer' : 'grab';
  });

  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (dragMoved < 6) {
      const { x, y } = local(e);
      const hit = hitTest(x, y);
      if (hit >= 0) {
        setActive(hit);
        pinnedUntil = performance.now() + PIN_MS;
      }
    }
    requestDraw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    if (dragging) return;
    hovered = -1;
    lastSwitch = performance.now();
    requestDraw();
  });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      targetParX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      targetParY = (e.clientY / window.innerHeight - 0.5) * 0.25;
      if (!reduce) requestDraw();
    },
    { passive: true }
  );

  /* ---------- Lifecycle ---------- */
  new ResizeObserver(resize).observe(canvas);

  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView) {
        lastFrame = performance.now();
        requestDraw();
      }
    },
    { threshold: 0 }
  ).observe(root);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastFrame = performance.now();
      requestDraw();
    }
  });

  window.addEventListener('themechange', () => {
    colors = readColors();
    requestDraw();
  });

  // Fonts change label widths; redraw once they're in.
  document.fonts?.ready.then(() => requestDraw());

  introStart = performance.now();
  setActive(0);
  resize();
}
