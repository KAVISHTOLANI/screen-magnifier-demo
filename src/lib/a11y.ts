/* Pure helpers for magnification, contrast themes and focus indicators. */

export interface Pt { x: number; y: number }
export interface Size { w: number; h: number }
export interface Rect { x: number; y: number; w: number; h: number }

export const ZOOM_MIN = 1.5;
export const ZOOM_MAX = 8;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const clampZoom = (z: number) => Math.round(clamp(z, ZOOM_MIN, ZOOM_MAX) * 4) / 4;

/** Transform for the magnified copy inside a lens so that `p` (in content coordinates) appears at the lens centre. */
export function lensTransform(p: Pt, zoom: number, lensSize: number): { x: number; y: number } {
  return { x: lensSize / 2 - p.x * zoom, y: lensSize / 2 - p.y * zoom };
}

/** Moves a point with arrow keys, staying inside the content. Shift moves further. */
export function moveWithKey(p: Pt, key: string, bounds: Size, step = 20): Pt | null {
  const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (key === 'Home') return { x: 0, y: 0 };
  if (!d[key]) return null;
  return { x: clamp(p.x + d[key][0] * step, 0, bounds.w), y: clamp(p.y + d[key][1] * step, 0, bounds.h) };
}

/** Largest pan offset for full-screen zoom: the zoomed content minus the viewport. */
export function maxPan(content: Size, viewport: Size, zoom: number): Pt {
  return { x: Math.max(0, content.w * zoom - viewport.w), y: Math.max(0, content.h * zoom - viewport.h) };
}

export function clampPan(pan: Pt, content: Size, viewport: Size, zoom: number): Pt {
  const m = maxPan(content, viewport, zoom);
  return { x: clamp(pan.x, 0, m.x), y: clamp(pan.y, 0, m.y) };
}

/** Pointer-driven panning: the pointer's position across the viewport maps to the same fraction of the pan range. */
export function panFromPointer(p: Pt, content: Size, viewport: Size, zoom: number): Pt {
  const m = maxPan(content, viewport, zoom);
  return { x: viewport.w ? (clamp(p.x, 0, viewport.w) / viewport.w) * m.x : 0, y: viewport.h ? (clamp(p.y, 0, viewport.h) / viewport.h) * m.y : 0 };
}

/**
 * Focus tracking: the smallest pan change that brings `target` (content coordinates) fully into view with a margin.
 * Targets larger than the viewport are aligned to their top-left corner.
 */
export function panToShow(target: Rect, pan: Pt, content: Size, viewport: Size, zoom: number, margin = 16): Pt {
  const axis = (start: number, len: number, cur: number, view: number) => {
    const a = start * zoom - margin, b = (start + len) * zoom + margin;
    if (b - a > view) return a;
    if (a < cur) return a;
    if (b > cur + view) return b - view;
    return cur;
  };
  return clampPan({ x: axis(target.x, target.w, pan.x, viewport.w), y: axis(target.y, target.h, pan.y, viewport.h) }, content, viewport, zoom);
}

/* ---------- Contrast ---------- */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) throw new Error(`Bad colour ${hex}`);
  const [r, g, b] = rgb.map((c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return Math.floor(((x + 0.05) / (y + 0.05)) * 100) / 100;
}
export type Use = 'text' | 'large' | 'ui';
/** WCAG 2.2 levels: text 4.5 (AA) / 7 (AAA); large text 3 / 4.5; UI components and graphics 3 (AA only). */
export function grade(ratio: number, use: Use): 'AAA' | 'AA' | 'Fail' {
  if (use === 'ui') return ratio >= 3 ? 'AA' : 'Fail';
  const [aa, aaa] = use === 'large' ? [3, 4.5] : [4.5, 7];
  return ratio >= aaa ? 'AAA' : ratio >= aa ? 'AA' : 'Fail';
}

export type ThemeId = 'site' | 'high-light' | 'high-dark' | 'yellow' | 'soft-dark';
export interface Theme { label: string; note: string; bg: string; surface: string; text: string; muted: string; link: string; btnBg: string; btnText: string; border: string }
export const THEMES: Record<ThemeId, Theme> = {
  site: { label: 'Site default', note: 'A typical pale design with grey helper text and a light button — the kind of page that fails.', bg: '#ffffff', surface: '#f4f6f8', text: '#2b2b2b', muted: '#9a9a9a', link: '#4a90d9', btnBg: '#7fb3e6', btnText: '#ffffff', border: '#dde3ea' },
  'high-light': { label: 'High contrast light', note: 'Black on white with classic link blue.', bg: '#ffffff', surface: '#ffffff', text: '#000000', muted: '#333333', link: '#0000c8', btnBg: '#000000', btnText: '#ffffff', border: '#000000' },
  'high-dark': { label: 'High contrast dark', note: 'White on black, as in Windows contrast themes.', bg: '#000000', surface: '#000000', text: '#ffffff', muted: '#e0e0e0', link: '#ffff00', btnBg: '#ffffff', btnText: '#000000', border: '#ffffff' },
  yellow: { label: 'Yellow on black', note: 'Preferred by many people with low vision.', bg: '#000000', surface: '#111111', text: '#ffff00', muted: '#ffff99', link: '#00ffff', btnBg: '#ffff00', btnText: '#000000', border: '#ffff00' },
  'soft-dark': { label: 'Soft dark', note: 'Lower glare for light sensitivity, still above AA.', bg: '#1b1c20', surface: '#25272d', text: '#e8e6e3', muted: '#b4b1ac', link: '#9ecbff', btnBg: '#9ecbff', btnText: '#10151c', border: '#8a8d94' },
};

export interface PairCheck { label: string; fg: string; bg: string; use: Use; ratio: number; grade: 'AAA' | 'AA' | 'Fail' }
export function themeChecks(t: Theme): PairCheck[] {
  const pairs: [string, string, string, Use][] = [
    ['Body text', t.text, t.bg, 'text'],
    ['Helper text', t.muted, t.bg, 'text'],
    ['Links', t.link, t.bg, 'text'],
    ['Button label', t.btnText, t.btnBg, 'text'],
    ['Input border', t.border, t.bg, 'ui'],
  ];
  return pairs.map(([label, fg, bg, use]) => { const ratio = contrastRatio(fg, bg); return { label, fg, bg, use, ratio, grade: grade(ratio, use) }; });
}

/* ---------- Focus indicators (WCAG 2.2, 2.4.7 visible and 2.4.13 focus appearance) ---------- */
export interface Ring { offset: number; thickness: number; color: string }
export interface FocusStyle { label: string; css: string; rings: Ring[]; underline?: { thickness: number; color: string } }
export type FocusId = 'none' | 'faint' | 'thin' | 'ring' | 'double' | 'underline';
export const FOCUS_STYLES: Record<FocusId, FocusStyle> = {
  none: { label: 'Removed (outline: none)', css: 'outline: none;', rings: [] },
  faint: { label: '1px dotted grey', css: 'outline: 1px dotted #c8c8c8;', rings: [{ offset: 0, thickness: 1, color: '#c8c8c8' }] },
  thin: { label: '1px solid accent', css: 'outline: 1px solid #00607a;', rings: [{ offset: 0, thickness: 1, color: '#00607a' }] },
  ring: { label: '2px ring, 2px offset', css: 'outline: 2px solid #00607a;\noutline-offset: 2px;', rings: [{ offset: 2, thickness: 2, color: '#00607a' }] },
  double: { label: 'Two-tone ring', css: 'outline: 3px solid #0b0b0b;\noutline-offset: 2px;\nbox-shadow: 0 0 0 2px #ffffff;', rings: [{ offset: 0, thickness: 2, color: '#ffffff' }, { offset: 2, thickness: 3, color: '#0b0b0b' }] },
  underline: { label: 'Underline only', css: 'outline: none;\nbox-shadow: inset 0 -3px 0 #00607a;', rings: [], underline: { thickness: 3, color: '#00607a' } },
};

/** Area of an outline ring of the given thickness drawn `offset` px outside a w×h box. */
export const ringArea = (w: number, h: number, r: Ring) => (w + 2 * (r.offset + r.thickness)) * (h + 2 * (r.offset + r.thickness)) - (w + 2 * r.offset) * (h + 2 * r.offset);
/** WCAG 2.4.13 minimum: the area of a 2px-thick perimeter of the unfocused component. */
export const minFocusArea = (w: number, h: number) => w * h - Math.max(0, w - 4) * Math.max(0, h - 4);

export interface FocusResult { area: number; minArea: number; areaOk: boolean; contrast: number; contrastOk: boolean; visible: boolean; verdict: 'Meets 2.4.13 (AAA)' | 'Visible only (2.4.7 AA)' | 'Not visible' }
/**
 * Counts only the parts of the indicator that contrast at least 3:1 with what they replace (the background),
 * as 2.4.13 requires. `contrast` reports the best contrast of any part.
 */
export function evaluateFocus(style: FocusStyle, w: number, h: number, background: string): FocusResult {
  const parts = [...style.rings.map((r) => ({ area: ringArea(w, h, r), color: r.color })), ...(style.underline ? [{ area: w * style.underline.thickness, color: style.underline.color }] : [])];
  const scored = parts.map((p) => ({ ...p, c: contrastRatio(p.color, background) }));
  const area = scored.filter((p) => p.c >= 3).reduce((s, p) => s + p.area, 0);
  const contrast = scored.length ? Math.max(...scored.map((p) => p.c)) : 1;
  const minArea = minFocusArea(w, h);
  const visible = scored.some((p) => p.c >= 1.5 && p.area > 0);
  const areaOk = area >= minArea, contrastOk = contrast >= 3;
  return { area, minArea, areaOk, contrast, contrastOk, visible, verdict: areaOk && contrastOk ? 'Meets 2.4.13 (AAA)' : visible ? 'Visible only (2.4.7 AA)' : 'Not visible' };
}
