import { describe, expect, it } from 'vitest';
import { FOCUS_STYLES, THEMES, clampPan, clampZoom, contrastRatio, evaluateFocus, grade, lensTransform, maxPan, minFocusArea, moveWithKey, panFromPointer, panToShow, ringArea, themeChecks } from './a11y';

const content = { w: 600, h: 400 }, view = { w: 600, h: 400 };

describe('magnification', () => {
  it('clamps zoom to quarter steps between 1.5 and 8', () => {
    expect(clampZoom(1)).toBe(1.5);
    expect(clampZoom(2.3)).toBe(2.25);
    expect(clampZoom(12)).toBe(8);
  });
  it('centres the lens on the pointed-at content', () => {
    expect(lensTransform({ x: 100, y: 50 }, 2, 200)).toEqual({ x: -100, y: 0 });
  });
  it('moves the lens with arrow keys inside the content', () => {
    expect(moveWithKey({ x: 10, y: 10 }, 'ArrowLeft', content)).toEqual({ x: 0, y: 10 });
    expect(moveWithKey({ x: 10, y: 10 }, 'ArrowDown', content, 50)).toEqual({ x: 10, y: 60 });
    expect(moveWithKey({ x: 10, y: 10 }, 'a', content)).toBeNull();
  });
  it('pans within the zoomed content', () => {
    expect(maxPan(content, view, 2)).toEqual({ x: 600, y: 400 });
    expect(clampPan({ x: -5, y: 900 }, content, view, 2)).toEqual({ x: 0, y: 400 });
    expect(panFromPointer({ x: 300, y: 400 }, content, view, 2)).toEqual({ x: 300, y: 400 });
  });
  it('follows focus with the smallest pan that shows the element', () => {
    // Already visible: no change.
    expect(panToShow({ x: 20, y: 20, w: 50, h: 20 }, { x: 0, y: 0 }, content, view, 2)).toEqual({ x: 0, y: 0 });
    // Off to the right and below: scroll just enough, plus margin.
    expect(panToShow({ x: 400, y: 300, w: 100, h: 30 }, { x: 0, y: 0 }, content, view, 2)).toEqual({ x: 416, y: 276 });
    // Behind the current view: align its start.
    expect(panToShow({ x: 10, y: 10, w: 20, h: 20 }, { x: 300, y: 300 }, content, view, 2)).toEqual({ x: 4, y: 4 });
  });
});

describe('contrast', () => {
  it('computes WCAG ratios and grades', () => {
    expect(contrastRatio('#000', '#fff')).toBe(21);
    expect(contrastRatio('#777777', '#ffffff')).toBe(4.47);
    expect(grade(4.47, 'text')).toBe('Fail');
    expect(grade(4.47, 'large')).toBe('AA');
    expect(grade(7.1, 'text')).toBe('AAA');
    expect(grade(3, 'ui')).toBe('AA');
  });
  it('the site default theme fails while the high-contrast themes pass everything', () => {
    const site = themeChecks(THEMES.site);
    expect(site.find((c) => c.label === 'Helper text')!.grade).toBe('Fail');
    expect(site.find((c) => c.label === 'Button label')!.grade).toBe('Fail');
    for (const id of ['high-light', 'high-dark', 'yellow', 'soft-dark'] as const) expect(themeChecks(THEMES[id]).every((c) => c.grade !== 'Fail'), id).toBe(true);
  });
});

describe('focus appearance', () => {
  it('computes ring area against the 2px perimeter minimum', () => {
    expect(minFocusArea(120, 40)).toBe(624);
    expect(ringArea(120, 40, { offset: 2, thickness: 2, color: '#000' })).toBe(688);
    expect(ringArea(120, 40, { offset: 0, thickness: 1, color: '#000' })).toBe(324);
  });
  it('grades the preset styles on a light background', () => {
    expect(evaluateFocus(FOCUS_STYLES.none, 120, 40, '#ffffff').verdict).toBe('Not visible');
    expect(evaluateFocus(FOCUS_STYLES.faint, 120, 40, '#ffffff').verdict).toBe('Visible only (2.4.7 AA)');
    expect(evaluateFocus(FOCUS_STYLES.thin, 120, 40, '#ffffff')).toMatchObject({ contrastOk: true, areaOk: false });
    expect(evaluateFocus(FOCUS_STYLES.ring, 120, 40, '#ffffff').verdict).toBe('Meets 2.4.13 (AAA)');
    expect(evaluateFocus(FOCUS_STYLES.underline, 120, 40, '#ffffff').areaOk).toBe(false);
  });
  it('a single-colour ring fails on dark backgrounds but the two-tone ring works on both', () => {
    expect(evaluateFocus(FOCUS_STYLES.ring, 120, 40, '#000000').contrastOk).toBe(false);
    expect(evaluateFocus(FOCUS_STYLES.double, 120, 40, '#000000').verdict).toBe('Meets 2.4.13 (AAA)');
    expect(evaluateFocus(FOCUS_STYLES.double, 120, 40, '#ffffff').verdict).toBe('Meets 2.4.13 (AAA)');
  });
});
