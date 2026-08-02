#!/usr/bin/env python3
"""Regenerate components/ui/Icon.jsx.

The 13 module icons are drawn as clean geometry on a 24x24 grid, then given a
hand-drawn tremor by resampling each stroke to even spacing and displacing the
points with smooth low-frequency noise. The wobble is baked into the path data
here rather than applied at runtime with an SVG turbulence filter, so the nav
costs nothing extra to repaint.

Style is matched to the reference PNG set: single weight, round caps and joins,
no fill, slight tremor. Seeds are fixed so output is deterministic.

Usage:  python3 scripts/build-icons.py
"""
import json
import math
import pathlib
import random

# --- geometry helpers -------------------------------------------------------

def circle(cx, cy, r, n=48):
    return [(cx + r * math.cos(2 * math.pi * i / n),
             cy + r * math.sin(2 * math.pi * i / n)) for i in range(n + 1)]

def arc(cx, cy, r, a0, a1, n=24):
    a0, a1 = math.radians(a0), math.radians(a1)
    return [(cx + r * math.cos(a0 + (a1 - a0) * i / n),
             cy + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

def rect(x, y, w, h, r=0):
    if r <= 0:
        return [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)]
    pts = []
    pts += arc(x + w - r, y + r, r, -90, 0)
    pts += arc(x + w - r, y + h - r, r, 0, 90)
    pts += arc(x + r, y + h - r, r, 90, 180)
    pts += arc(x + r, y + r, r, 180, 270)
    pts.append(pts[0])
    return pts

def rot_rect(cx, cy, w, h, ang, r=0.5):
    pts = rect(-w / 2, -h / 2, w, h, r)
    a = math.radians(ang)
    return [(cx + x * math.cos(a) - y * math.sin(a),
             cy + x * math.sin(a) + y * math.cos(a)) for x, y in pts]

def line(*pts):
    return list(pts)

# --- roughening -------------------------------------------------------------

def resample(pts, step=1.1):
    """Even spacing, so the tremor reads consistently along every stroke."""
    out = [pts[0]]
    carry = 0.0
    for a, b in zip(pts, pts[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy)
        if d < 1e-9:
            continue
        t = carry
        while t + step <= d:
            t += step
            out.append((a[0] + dx * t / d, a[1] + dy * t / d))
        carry = t - d
    if out[-1] != pts[-1]:
        out.append(pts[-1])
    return out

def smooth_noise(n, rng, octaves=(4, 9), amp=(1.0, 0.45)):
    """Two sine waves at random phase: a slow hand wobble plus a finer tremor."""
    out = [0.0] * n
    for period, a in zip(octaves, amp):
        ph = rng.uniform(0, 2 * math.pi)
        f = rng.uniform(0.85, 1.15)
        for i in range(n):
            out[i] += a * math.sin(ph + 2 * math.pi * f * i / period)
    return out

def roughen(pts, rng, amount=0.16, step=1.1):
    pts = resample(pts, step)
    n = len(pts)
    nx, ny = smooth_noise(n, rng), smooth_noise(n, rng)
    closed = abs(pts[0][0] - pts[-1][0]) < 1e-6 and abs(pts[0][1] - pts[-1][1]) < 1e-6
    out = []
    for i, (x, y) in enumerate(pts):
        # taper to zero at the ends of an open stroke so joins stay tight
        t = 1.0 if closed else min(1.0, min(i, n - 1 - i) / max(1.0, n * 0.18))
        out.append((x + nx[i] * amount * t, y + ny[i] * amount * t))
    if closed:
        out[-1] = out[0]
    return out

def to_path(pts, prec=2):
    f = lambda v: f"{v:.{prec}f}".rstrip("0").rstrip(".")
    return f"M{f(pts[0][0])} {f(pts[0][1])}" + "".join(f"L{f(x)} {f(y)}" for x, y in pts[1:])

def render(subpaths, seed, amount=0.16):
    rng = random.Random(seed)
    return "".join(to_path(roughen(sp, rng, amount)) for sp in subpaths)

# --- the 13 modules ---------------------------------------------------------

I = {}
I["dashboard"] = [line((3, 10.5), (12, 3.5), (21, 10.5)),
                  line((5.2, 9.2), (5.2, 20), (18.8, 20), (18.8, 9.2)),
                  rect(10, 14, 4, 6)]
I["scheduler"] = [rect(3, 5, 18, 16, 1.6), line((3, 9.5), (21, 9.5)),
                  line((7.5, 3), (7.5, 6.5)), line((16.5, 3), (16.5, 6.5)),
                  line((6.5, 13), (13, 13)), line((6.5, 16.5), (17, 16.5))]
I["planning"] = [rect(4.5, 4, 15, 17, 1.6), rect(9, 2.2, 6, 3.4, 0.8),
                 line((8, 11), (9.5, 12.5), (12.5, 9.2)),
                 line((8, 16), (9.5, 17.5), (12.5, 14.2)),
                 line((14.5, 11.6), (16.5, 11.6)), line((14.5, 16.6), (16.5, 16.6))]
I["guests"] = [circle(9, 8.2, 3.1), arc(9, 17.4, 5.4, 180, 360),
               circle(16.6, 9.2, 2.4), arc(16.6, 17.4, 4.2, 200, 340)]
I["rsvp"] = [rect(3, 5.5, 18, 13, 1.4), line((3.6, 6.4), (12, 13), (20.4, 6.4)),
             line((3.8, 17.6), (9.6, 12.2)), line((20.2, 17.6), (14.4, 12.2))]
# a place setting reads as "seating" far better than a top-down table
I["tables"] = [circle(12, 12, 5.2), circle(12, 12, 3.2),
               line((4.2, 5.2), (4.2, 9.4)), line((6.2, 5.2), (6.2, 9.4)),
               line((5.2, 5.2), (5.2, 9.4)), line((5.2, 9.4), (5.2, 19.2)),
               line((19, 5.2), (19, 19.2)),
               line((19, 5.2), (17.4, 7.2), (17.4, 10.4), (19, 11.4))]
I["vendors"] = [line((3, 9), (4.6, 4.6), (19.4, 4.6), (21, 9)), line((3, 9), (21, 9)),
                line((4.8, 9), (4.8, 20), (19.2, 20), (19.2, 9)), rect(8.6, 13, 6.8, 7)]
I["budget"] = [line((6.4, 8), (8.6, 4.2), (15.4, 4.2), (17.6, 8)),
               rect(3.6, 8, 16.8, 12, 2.2), circle(12, 14, 2.5)]
I["finance"] = [line((3.5, 20.5), (20.5, 20.5)), line((6.5, 20.5), (6.5, 14)),
                line((11, 20.5), (11, 9.5)), line((15.5, 20.5), (15.5, 16)),
                line((20, 20.5), (20, 6))]
I["moodboards"] = [rect(3, 5, 18, 14, 1.4), line((3.6, 15.4), (8.8, 10.4), (13, 14.4)),
                   line((13, 14.4), (16.2, 11.4), (20.4, 15.4)), circle(16.4, 8.6, 1.4)]
# a hanger, not a dress: unambiguous down to 16px
I["attire"] = [arc(12, 5.4, 1.6, -155, -25), line((12, 7), (12, 8.6)),
               line((12, 8.6), (4.2, 15.2)), line((12, 8.6), (19.8, 15.2)),
               line((4.2, 15.2), (19.8, 15.2)), arc(12, 15.2, 7.8, 15, 165)]
I["traditions"] = [line((12, 6.4), (12, 19.6)),
                   line((12, 6.4), (6, 4.6), (3.2, 5.6), (3.2, 18), (6, 17), (12, 19.6)),
                   line((12, 6.4), (18, 4.6), (20.8, 5.6), (20.8, 18), (18, 17), (12, 19.6))]
I["settings"] = ([circle(12, 12, 3.1)]
                 + [line((12 + 4.9 * math.cos(math.radians(a)), 12 + 4.9 * math.sin(math.radians(a))),
                         (12 + 7.4 * math.cos(math.radians(a)), 12 + 7.4 * math.sin(math.radians(a))))
                    for a in range(0, 360, 45)]
                 + [circle(12, 12, 5.0)])

# --- traditions cards (lib/traditions.js) -----------------------------------
# Drawn rather than reused from the module set: these illustrate ceremonies,
# not navigation. arc() sweeps a0 -> a1 linearly, where 0=right, 90=down,
# 180=left, 270=up — so a cup floor is 180 -> 0 and a dome is 180 -> 360.

I["redEnvelope"] = [rect(6.2, 2.8, 11.6, 18.4, 1.8),
                    line((6.2, 4.4), (8.6, 7.6), (12, 8.8), (15.4, 7.6), (17.8, 4.4)),
                    circle(12, 14.4, 2.6), circle(12, 14.4, 0.9)]
I["tea"] = [line((5.8, 10.6), (6.8, 14.6)) + arc(12, 14.6, 5.2, 180, 0) + line((17.2, 14.6), (18.2, 10.6)),
            line((4.6, 10.6), (19.4, 10.6)), arc(18.4, 12.4, 2.4, -66, 66),
            line((3.4, 19.6), (20.6, 19.6)),
            line((9.4, 8.2), (10.3, 6.6), (9.4, 5)), line((13.4, 8.2), (14.3, 6.6), (13.4, 5))]
# mâm quả, the covered offering tray carried at Lễ Ăn Hỏi, not a wrapped present
I["giftTray"] = [arc(12, 14.6, 7, 180, 360), line((12, 7.6), (12, 6)), circle(12, 5, 1.1),
                 line((3.4, 14.6), (20.6, 14.6)), line((6, 14.6), (7, 18), (17, 18), (18, 14.6)),
                 line((9, 18), (9, 20.2)), line((15, 18), (15, 20.2)),
                 line((7.4, 20.2), (16.6, 20.2))]
# a chapel reads as the wrong tradition entirely, so Lễ Cưới gets rings
I["rings"] = [circle(8.9, 14.2, 4.9), circle(15.1, 14.2, 4.9),
              line((8.9, 9.3), (7.7, 6.6), (10.1, 6.6), (8.9, 9.3))]

SEEDS = {"tables": 777, "attire": 5150,
         "redEnvelope": 8101, "tea": 8207, "giftTray": 8311, "rings": 8419}
ORDER = ["dashboard", "scheduler", "planning", "guests", "rsvp", "tables", "vendors",
         "budget", "finance", "moodboards", "attire", "traditions", "settings",
         "redEnvelope", "tea", "giftTray", "rings"]

def main():
    paths = {}
    for i, k in enumerate(ORDER):
        paths[k] = render(I[k], seed=SEEDS.get(k, 1000 + list(I).index(k) * 37), amount=0.17)

    body = "\n".join(f'  {k}:\n    "{paths[k]}",' for k in ORDER)
    src = f'''// Hand-drawn module icons, matching the line style of the reference set.
//
// The tremor is baked into the path data at design time rather than applied at
// runtime with an SVG turbulence filter. A filter would have to re-run on every
// nav repaint for all 13 icons, which is exactly the kind of cost the recent
// nav performance work removed.
//
// Regenerate with scripts/build-icons.py.

const PATHS = {{
{body}
}};

export const ICON_NAMES = Object.keys(PATHS);

/**
 * @param {{object}} props
 * @param {{string}} props.name   key from PATHS
 * @param {{number}} [props.size] px, defaults to 20
 * @param {{string}} [props.className]
 */
export default function Icon({{ name, size = 20, className = "", ...rest }}) {{
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={{size}}
      height={{size}}
      className={{className}}
      fill="none"
      stroke="currentColor"
      strokeWidth={{1.5}}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {{...rest}}
    >
      <path d={{d}} />
    </svg>
  );
}}
'''
    out = pathlib.Path(__file__).resolve().parent.parent / "components" / "ui" / "Icon.jsx"
    out.write_text(src, encoding="utf-8")
    print(f"wrote {out} ({len(src)} bytes, {len(paths)} icons)")

if __name__ == "__main__":
    main()
