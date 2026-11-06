"""Regenerate the brand images: the constellation mark and the share card.

Writes:
  public/favicon.svg
  public/images/apple-touch-icon.png
  public/images/og-image.png      1200×630 link-preview card

The mark mirrors src/components/Mark.astro. Run from the repo root after
changing the mark or the og-image copy:

    pip install pillow numpy
    python3 scripts/brand-assets.py

Fonts are fetched from Google Fonts as tiny subsets containing only the
characters drawn here (all SIL Open Font License).
"""
import math
import re
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent

INK = (12, 11, 10)
PAPER = (236, 230, 218)
PAPER_BRIGHT = (243, 238, 228)
FG2 = (180, 172, 159)
FG3 = (138, 131, 120)
ACCENT = (229, 67, 44)
ACCENT_TEXT = (255, 107, 82)

TAGLINE = "用 AI 連結學術與產業，讓資料創造價值。"
MONO_TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ·'./-_@+%▲↓→—#|&×◆"


# ------------------------------------------------------------------ fonts
def fetch_font(family: str, text: str, dest: Path) -> Path:
    """Download a Google Fonts subset as TrueType (the plain UA gets .ttf)."""
    query = f"family={family}&text={urllib.parse.quote(text)}"
    css = urllib.request.urlopen(f"https://fonts.googleapis.com/css2?{query}").read().decode()
    url = re.search(r"url\((.+?)\)", css).group(1)
    dest.write_bytes(urllib.request.urlopen(url).read())
    return dest


def load_fonts(tmp: Path) -> dict:
    return {
        "serif": fetch_font("Noto+Serif+TC:wght@600", "黃仁和", tmp / "serif.ttf"),
        "display": fetch_font("Instrument+Serif", "Edward Huang", tmp / "display.ttf"),
        "display_italic": fetch_font("Instrument+Serif:ital@1", "Edward Huang", tmp / "display-italic.ttf"),
        "mono": fetch_font("JetBrains+Mono:wght@500", MONO_TEXT, tmp / "mono.ttf"),
        "sans": fetch_font("Noto+Sans+TC:wght@400", TAGLINE + "台灣大哥大中央大學", tmp / "sans.ttf"),
    }


# ------------------------------------------------------------------ mark
# Same geometry as src/components/Mark.astro (viewBox 0 0 32 32).
MARK_NODES = [(6.5, 20.5), (12.5, 8.5), (22.5, 6.5), (25.5, 18.5), (15.5, 25.5)]
MARK_EDGES = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0), (1, 3)]
MARK_FOCUS = 3


def write_favicon():
    lines = "".join(
        f'<line x1="{MARK_NODES[a][0]}" y1="{MARK_NODES[a][1]}" x2="{MARK_NODES[b][0]}" y2="{MARK_NODES[b][1]}"/>'
        for a, b in MARK_EDGES
    )
    dots = "".join(
        f'<circle cx="{x}" cy="{y}" r="{3.6 if i == MARK_FOCUS else 2.3}" fill="{"#e5432c" if i == MARK_FOCUS else "#ece6da"}"/>'
        for i, (x, y) in enumerate(MARK_NODES)
    )
    (ROOT / "public/favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<rect width="32" height="32" rx="7" fill="#0c0b0a"/>'
        f'<g stroke="#ece6da" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round">{lines}</g>{dots}</svg>\n'
    )


def render_mark(size, bg=INK):
    """The mark on a square tile (iOS rounds the corners itself)."""
    scale = 4
    S = size * scale
    img = Image.new("RGBA", (S, S), bg + (255,))
    d = ImageDraw.Draw(img)
    pad = 0.16 * S
    k = (S - 2 * pad) / 32
    pt = lambda i: (pad + MARK_NODES[i][0] * k, pad + MARK_NODES[i][1] * k)
    for a, b in MARK_EDGES:
        d.line([pt(a), pt(b)], fill=(118, 113, 105, 255), width=round(1.6 * k))
    for i in range(len(MARK_NODES)):
        x, y = pt(i)
        r = (3.6 if i == MARK_FOCUS else 2.3) * k
        d.ellipse([x - r, y - r, x + r, y + r], fill=(ACCENT if i == MARK_FOCUS else PAPER) + (255,))
    return img.resize((size, size), Image.LANCZOS)


def write_touch_icon():
    render_mark(180).convert("RGB").save(ROOT / "public/images/apple-touch-icon.png", optimize=True)


# ------------------------------------------------------------------ og image
# Mirrors the hero's "Fig. 1" (src/components/LatentField.astro).
CLUSTERS = [
    ("VISION-LANGUAGE", (0.58, -0.08, 0.18), 0.2, 115),
    ("REINFORCEMENT LEARNING", (-0.42, -0.52, 0.36), 0.17, 80),
    ("LLM TUNING & DEPLOY", (-0.08, 0.62, -0.32), 0.17, 90),
    ("TRAD. CHINESE NLP", (-0.52, 0.3, 0.2), 0.19, 90),
    ("DIFFUSION", (0.12, -0.56, -0.5), 0.16, 65),
    ("FAIR & EXPLAINABLE", (0.32, 0.5, 0.42), 0.14, 55),
]


def draw_cloud(img, fonts, cx, cy, R, ay=0.75, ax=-0.3, focus=0):
    rng = np.random.default_rng(20240923)
    parts, owner = [], []
    for ci, (_, c, s, n) in enumerate(CLUSTERS):
        parts.append(rng.normal(0, s, (n, 3)) + np.array(c))
        owner += [ci] * n
    ambient = rng.normal(0, 0.55, (240, 3)) * np.array([1, 0.85, 1])
    parts.append(ambient)
    owner = np.array(owner + [-1] * len(ambient))
    P = np.vstack(parts)

    def project(v):
        x, y, z = v[..., 0], v[..., 1], v[..., 2]
        x1 = x * math.cos(ay) + z * math.sin(ay)
        z1 = -x * math.sin(ay) + z * math.cos(ay)
        y2 = y * math.cos(ax) - z1 * math.sin(ax)
        z2 = y * math.sin(ax) + z1 * math.cos(ax)
        p = 3.2 / (3.2 + z2)
        return cx + x1 * p * R, cy - y2 * p * R, np.clip((z2 + 1.4) / 2.8, 0, 1), p

    sx, sy, depth, sc = project(P)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    idx = np.where(owner == focus)[0]
    sub = P[idx]
    for a in range(len(idx)):
        dist = np.sum((sub - sub[a]) ** 2, axis=1)
        dist[a] = np.inf
        for b in np.argsort(dist)[:2]:
            i, j = idx[a], idx[b]
            alpha = int(255 * (0.42 - (depth[i] + depth[j]) / 2 * 0.3))
            d.line([(sx[i], sy[i]), (sx[j], sy[j])], fill=ACCENT + (alpha,), width=1)

    for i in np.argsort(-depth):
        near = 1 - depth[i]
        r = (0.7 + (i * 7919 % 100) / 100 * 1.1) * sc[i] * 1.25
        if owner[i] == -1:
            col, a, r = FG3, 0.16 + near * 0.3, r * 0.85
        elif owner[i] == focus:
            col, a, r = ACCENT, 0.6 + near * 0.4, r * 1.4
        else:
            col, a = PAPER, 0.2 + near * 0.45
        d.ellipse([sx[i] - r, sy[i] - r, sx[i] + r, sy[i] + r], fill=col + (int(255 * a),))

    mono = ImageFont.truetype(str(fonts["mono"]), 13)
    for ci, (label, c, _, _) in enumerate(CLUSTERS):
        lx, ly, ldepth, _ = project(np.array(c, dtype=float))
        is_focus = ci == focus
        right = lx >= cx
        ax2, ay2 = lx + (22 if right else -22), ly - 18
        a = 230 if is_focus else int(255 * (0.35 + (1 - ldepth) * 0.4))
        col = (ACCENT if is_focus else FG3) + (a,)
        d.line([(lx, ly), (ax2, ay2), (ax2 + (8 if right else -8), ay2)], fill=col, width=1)
        tw = d.textlength(label, font=mono)
        d.text((ax2 + 12 if right else ax2 - 12 - tw, ay2 - 8), label, font=mono,
               fill=(ACCENT_TEXT if is_focus else FG3) + (a,))
        if is_focus:
            d.polygon([(lx, ly - 4), (lx + 4, ly), (lx, ly + 4), (lx - 4, ly)], fill=ACCENT + (255,))
    img.alpha_composite(layer)


def write_og(fonts):
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H), INK + (255,))
    font = lambda key, size: ImageFont.truetype(str(fonts[key]), size)

    haze = Image.new("L", (W, H), 0)
    ImageDraw.Draw(haze).ellipse([700, 60, 1260, 620], fill=60)
    img.paste(Image.new("RGBA", (W, H), ACCENT + (255,)), (0, 0), haze.filter(ImageFilter.GaussianBlur(110)))

    draw_cloud(img, fonts, cx=860, cy=280, R=212)

    d = ImageDraw.Draw(img)
    mono = font("mono", 17)
    x0 = 72
    d.polygon([(x0, 100), (x0 + 5, 95), (x0 + 10, 100), (x0 + 5, 105)], fill=ACCENT)
    d.text((x0 + 24, 90), "RESEARCH ENGINEER · VLM / LLM — TAIPEI", font=mono, fill=FG3)

    d.text((x0 - 4, 118), "黃仁和", font=font("serif", 132), fill=PAPER)

    roman, italic = font("display", 58), font("display_italic", 58)
    d.text((x0, 292), "Edward ", font=roman, fill=FG2)
    d.text((x0 + d.textlength("Edward ", font=roman), 292), "Huang", font=italic, fill=FG2)

    d.text((x0, 388), TAGLINE, font=font("sans", 25), fill=FG2)
    d.text((x0, 436), "NCU ADML  ·  Taiwan Mobile  ·  Twinkle AI", font=mono, fill=PAPER)

    # ticker band (▲ is red: in Taiwan's market, red means up)
    d.line([(0, 548), (W, 548)], fill=(42, 40, 37), width=1)
    tick, arrow = font("mono", 16), font("mono", 12)
    x = x0
    for sym, val in [("LOCATE-3B", "74.4%"), ("TANET'24", "BEST PAPER"), ("TWM'24", "CHAMPION")]:
        d.text((x, 578), sym, font=tick, fill=PAPER)
        x += d.textlength(sym + " ", font=tick)
        d.text((x, 578), val, font=tick, fill=FG2)
        x += d.textlength(val + " ", font=tick)
        d.text((x, 579), "▲", font=arrow, fill=ACCENT_TEXT)
        x += 40
    url = "edwarddev0723.github.io/Renhe_s_web"
    d.text((W - 72 - d.textlength(url, font=tick), 578), url, font=tick, fill=FG3)

    img.convert("RGB").save(ROOT / "public/images/og-image.png", optimize=True)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        fonts = load_fonts(Path(tmp))
        write_favicon()
        write_touch_icon()
        write_og(fonts)
    print("wrote favicon.svg, apple-touch-icon.png, og-image.png")


if __name__ == "__main__":
    main()
