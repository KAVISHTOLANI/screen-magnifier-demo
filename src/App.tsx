import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { DemoTag, Field, Landing, NotFound, Notice, PageHead, Shell, copyText, useFlash, usePersistentState, useRoute } from './shared/ui';
import {
  FOCUS_STYLES, THEMES, ZOOM_MAX, ZOOM_MIN, clampPan, clampZoom, evaluateFocus, hexToRgb, lensTransform, moveWithKey, panFromPointer, panToShow, themeChecks,
  type FocusId, type Pt, type Size, type ThemeId,
} from './lib/a11y';

const KEY = 'focus-field:store';
const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/magnifier', label: 'Magnifier' },
  { to: '/contrast', label: 'Contrast' },
  { to: '/focus', label: 'Focus' },
  { to: '/notes', label: 'Notes' },
];

type Mode = 'lens' | 'zoom';
interface Store {
  mode: Mode;
  zoom: number;
  follow: boolean;
  theme: ThemeId;
  textScale: number;
  spacing: boolean;
  focus: FocusId;
  focusBg: string;
}
const DEFAULTS: Store = { mode: 'lens', zoom: 2.5, follow: true, theme: 'site', textScale: 1, spacing: false, focus: 'ring', focusBg: '#ffffff' };

export default function App() {
  const [route] = useRoute();
  const [raw, setStore] = usePersistentState<Store>(KEY, DEFAULTS);
  const store = { ...DEFAULTS, ...raw };
  const ctx = { store, setStore };
  let page: ReactNode;
  if (route === '/') page = <Home />;
  else if (route === '/magnifier') page = <MagnifierPage {...ctx} />;
  else if (route === '/contrast') page = <ContrastPage {...ctx} />;
  else if (route === '/focus') page = <FocusPage {...ctx} />;
  else if (route === '/notes') page = <Notes />;
  else page = <NotFound />;
  return (
    <Shell name="Focus Field" wordmark={['Focus', 'Field']} nav={NAV} route={route} cta={{ to: '/magnifier', label: 'Try the magnifier' }} footerNote="A teaching demo. It doesn’t replace your operating system’s magnifier or testing with people who use one.">
      {page}
    </Shell>
  );
}

type Ctx = { store: Store; setStore: (s: Store) => void };

/* ---------- The fictional sample page used everywhere ---------- */
function themeVars(id: ThemeId): CSSProperties {
  const t = THEMES[id];
  return { '--s-bg': t.bg, '--s-surface': t.surface, '--s-text': t.text, '--s-muted': t.muted, '--s-link': t.link, '--s-btn-bg': t.btnBg, '--s-btn-text': t.btnText, '--s-border': t.border } as CSSProperties;
}

interface FormState { name: string; err: boolean; sent: boolean; remind: boolean }
const EMPTY_FORM: FormState = { name: '', err: false, sent: false, remind: false };

function SampleSite({ store, copy = false, form: outer, setForm: setOuter }: { store: Store; copy?: boolean; form?: FormState; setForm?: (f: FormState) => void }) {
  const [inner, setInner] = useState(EMPTY_FORM);
  const form = outer ?? inner, setForm = setOuter ?? setInner;
  const { name, err, sent } = form;
  const errId = useId();
  const stop = (e: React.MouseEvent) => e.preventDefault();
  return (
    <div className={`sample fs-${store.focus} ${store.spacing ? 'spaced' : ''}`} style={{ ...themeVars(store.theme), fontSize: `${15 * store.textScale}px` }} lang="en">
      <div className="s-nav">
        <strong className="s-brand">Harbour Street Library</strong>
        <a href="#sample" onClick={stop}>What’s on</a> <a href="#sample" onClick={stop}>Opening hours</a> <a href="#sample" onClick={stop}>My account</a>
      </div>
      <div className="s-body">
        <h3>Autumn reading club</h3>
        <p>Join a small group every Thursday evening to talk about one short novel a month. Tea is provided, and large-print and audio editions are available on request.</p>
        <p className="s-muted">Sessions are free. Booking closes on Friday at 5 pm.</p>
        {sent ? (
          <p className="s-done" role={copy ? undefined : 'status'}>Place reserved for {name} (demo only — nothing was sent).</p>
        ) : (
          <form className="s-form" noValidate onSubmit={(e) => { e.preventDefault(); setForm(name.trim() ? { ...form, sent: true } : { ...form, err: true }); }}>
            <label>Your name<input value={name} onChange={(e) => setForm({ ...form, name: e.target.value, err: false })} aria-invalid={err || undefined} aria-describedby={err ? errId : undefined} autoComplete="off" /></label>
            {err && <span className="s-err" id={errId}>Enter your name to reserve.</span>}
            <label className="s-check"><input type="checkbox" checked={form.remind} onChange={(e) => setForm({ ...form, remind: e.target.checked })} /> Email me a reminder</label>
            <button type="submit">Reserve a place</button>
          </form>
        )}
        {sent && <button type="button" className="s-link-btn" onClick={() => setForm(EMPTY_FORM)}>Reserve another</button>}
      </div>
    </div>
  );
}

/* ---------- Hero ---------- */
const HERO_POINTS: Pt[] = [{ x: 110, y: 92 }, { x: 205, y: 150 }, { x: 70, y: 212 }];
function HeroPreview() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % HERO_POINTS.length), 2600);
    return () => window.clearInterval(t);
  }, []);
  const p = HERO_POINTS[i], L = 150, z = 2.2, tr = lensTransform(p, z, L);
  const mini: Store = { ...DEFAULTS, theme: 'site' };
  return (
    <div className="hero-wrap"><div className="hero-ff">
      <div className="hero-page" aria-hidden="true" inert><SampleSite store={mini} copy /></div>
      <div className="lens hero-lens" style={{ left: p.x - L / 2, top: p.y - L / 2, width: L, height: L }} aria-hidden="true">
        <div className="lens-inner" style={{ width: 300, transform: `translate(${tr.x}px, ${tr.y}px) scale(${z})` }} inert><SampleSite store={mini} copy /></div>
      </div>
    </div><p className="hero-cap small">{z}× lens over a sample page — fictional content</p></div>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Low-vision design demo"
      title={<>Design for people who <em>zoom in.</em></>}
      lead="Feel what using a screen magnifier is like, see how contrast themes change a page, and measure whether your focus indicators are actually visible — on one sample page you can operate."
      primary={{ href: '#/magnifier', label: 'Try the magnifier' }}
      secondary={{ href: '#/focus', label: 'Check focus styles' }}
      previewLabel="Lens magnifier"
      preview={<HeroPreview />}
      meta={['Runs in your browser', 'Keyboard operable', 'WCAG 2.2 maths']}
      steps={[
        { title: 'Magnify', body: 'Use a lens or full-screen zoom up to 8×, with the view following keyboard focus like real magnifiers do.' },
        { title: 'Re-theme', body: 'Switch between high-contrast themes, enlarge text to 200 % and apply the WCAG text-spacing override.' },
        { title: 'Measure focus', body: 'Compare focus styles against the WCAG 2.2 focus-appearance area and 3:1 contrast rules on light and dark backgrounds.' },
      ]}
      stepsIntro="When you magnify 4×, you see a sixteenth of the screen at once. Anything that changes outside that window — an error message, a toast, a focus ring — is easy to miss."
      features={[
        { title: 'Follow focus', body: 'Tab through the sample form and watch the magnified view track the focused control.' },
        { title: 'Live contrast checks', body: 'Each theme lists the ratio for text, helper text, links, buttons and borders with AA/AAA grades.' },
        { title: 'Copyable CSS', body: 'Every focus style comes with the CSS that produces it.' },
        { title: 'Honest limits', body: 'A browser demo of the experience — not a substitute for ZoomText, Windows Magnifier or macOS Zoom.' },
      ]}
      closing={{ title: <>If they can’t see focus, <em>they’re lost.</em></>, action: { href: '#/focus', label: 'Measure your focus style' } }}
    />
  );
}

/* ---------- Magnifier ---------- */
function useSize(ref: React.RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const LENS = 200;
function MagnifierPage({ store, setStore }: Ctx) {
  const stage = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const contentSize = useSize(content);
  const stageSize = useSize(stage);
  const [lens, setLens] = useState<Pt>({ x: 120, y: 90 });
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const [announce, setAnnounce] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const z = store.zoom;
  const zoomView: Size = { w: stageSize.w, h: stageSize.h };
  const set = (patch: Partial<Store>) => setStore({ ...store, ...patch });

  useEffect(() => { setPan((p) => clampPan(p, contentSize, zoomView, z)); }, [z, contentSize.w, contentSize.h, stageSize.w, stageSize.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const followFocus = useCallback((e: React.FocusEvent) => {
    if (!store.follow || !content.current || e.target === stage.current) return;
    const r = (e.target as HTMLElement).getBoundingClientRect(), c = content.current.getBoundingClientRect();
    const label = (e.target as HTMLElement).textContent?.trim() || (e.target as HTMLInputElement).closest('label')?.textContent?.trim() || 'control';
    if (store.mode === 'lens') setLens({ x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 });
    else setPan((p) => panToShow({ x: (r.left - c.left) / z, y: (r.top - c.top) / z, w: r.width / z, h: r.height / z }, p, contentSize, zoomView, z));
    setAnnounce(`Following focus: ${label.slice(0, 40)}`);
  }, [store.follow, store.mode, z, contentSize, zoomView.w, zoomView.h]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPointer(e: React.PointerEvent) {
    const s = stage.current!.getBoundingClientRect();
    const p = { x: e.clientX - s.left, y: e.clientY - s.top };
    if (store.mode === 'lens') setLens(p);
    else setPan(panFromPointer(p, contentSize, zoomView, z));
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.target !== stage.current) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); return set({ zoom: clampZoom(z + 0.5) }); }
    if (e.key === '-') { e.preventDefault(); return set({ zoom: clampZoom(z - 0.5) }); }
    const step = e.shiftKey ? 80 : 24;
    if (store.mode === 'lens') {
      const next = moveWithKey(lens, e.key, contentSize, step);
      if (next) { e.preventDefault(); setLens(next); }
    } else {
      const next = moveWithKey(pan, e.key, { w: contentSize.w * z, h: contentSize.h * z }, step * 2);
      if (next) { e.preventDefault(); setPan(clampPan(next, contentSize, zoomView, z)); }
    }
  }
  const t = lensTransform(lens, z, LENS);

  return (
    <div className="stack">
      <PageHead eyebrow="Magnifier" title={<>Magnify <em>the page.</em></>} description="Point at the sample page, or focus the stage and use the arrow keys (Shift for bigger steps, + and − to zoom). Tab into the form to see follow-focus." />
      <div className="card filters">
        <div className="tabs" role="radiogroup" aria-label="Magnifier mode">
          <button type="button" role="radio" aria-checked={store.mode === 'lens'} onClick={() => set({ mode: 'lens' })}>Lens</button>
          <button type="button" role="radio" aria-checked={store.mode === 'zoom'} onClick={() => set({ mode: 'zoom' })}>Full-screen zoom</button>
        </div>
        <Field label={`Zoom: ${z}×`} className="grow">{(p) => <input {...p} type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.25} value={z} onChange={(e) => set({ zoom: clampZoom(Number(e.target.value)) })} />}</Field>
        <label className="check"><input type="checkbox" checked={store.follow} onChange={(e) => set({ follow: e.target.checked })} /> Follow keyboard focus</label>
      </div>
      <p><DemoTag /> <span className="small muted">Fictional library page. Theme: {THEMES[store.theme].label} — change it on the <a href="#/contrast">Contrast</a> page.</span></p>
      <div
        ref={stage}
        className={`stage mode-${store.mode}`}
        tabIndex={0}
        role="group"
        aria-label={`Magnifier stage, ${store.mode === 'lens' ? 'lens' : 'full-screen zoom'} at ${z}×. Arrow keys move the view.`}
        onPointerMove={onPointer}
        onKeyDown={onKey}
        onFocusCapture={followFocus}
      >
        <div ref={content} className="stage-content" style={store.mode === 'zoom' ? { transform: `translate(${-pan.x}px, ${-pan.y}px) scale(${z})` } : undefined}>
          <SampleSite store={store} form={form} setForm={setForm} />
        </div>
        {store.mode === 'lens' && (
          <div className="lens" style={{ left: lens.x - LENS / 2, top: lens.y - LENS / 2, width: LENS, height: LENS }} aria-hidden="true">
            <div className="lens-inner" style={{ width: contentSize.w || undefined, transform: `translate(${t.x}px, ${t.y}px) scale(${z})` }} inert><SampleSite store={store} form={form} setForm={setForm} copy /></div>
          </div>
        )}
        {store.mode === 'zoom' && contentSize.w > 0 && (
          <div className="minimap" aria-hidden="true"><i style={{ left: `${(pan.x / (contentSize.w * z)) * 100}%`, top: `${(pan.y / (contentSize.h * z)) * 100}%`, width: `${100 / z}%`, height: `${Math.min(100, (stageSize.h / (contentSize.h * z)) * 100)}%` }} /></div>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      <div className="grid-2">
        <section className="card stack">
          <h2 className="h3">What to notice</h2>
          <ul className="notice-list">
            <li>At {z}× you see about {Math.round(100 / (z * z))} % of the page at once.</li>
            <li>Submit the form empty: the error appears below the field — easy to miss if the lens is elsewhere.</li>
            <li>Content placed far from the thing that triggers it (a toast in a corner, help text in a sidebar) is effectively invisible.</li>
          </ul>
        </section>
        <section className="card stack">
          <h2 className="h3">Real magnifiers</h2>
          <p className="small">Windows Magnifier (Win + Plus), macOS Zoom (Accessibility settings), ZoomText and browser zoom. They follow focus and the text caret, which is why visible focus and nearby error messages matter.</p>
        </section>
      </div>
    </div>
  );
}

/* ---------- Contrast ---------- */
const GRADE_CLASS = { AAA: 'badge-ok', AA: 'badge-accent', Fail: 'badge-err' } as const;
function ContrastPage({ store, setStore }: Ctx) {
  const set = (patch: Partial<Store>) => setStore({ ...store, ...patch });
  const checks = themeChecks(THEMES[store.theme]);
  const fails = checks.filter((c) => c.grade === 'Fail').length;
  return (
    <div className="stack">
      <PageHead eyebrow="Contrast & text" title={<>Same page, <em>other settings.</em></>} description="Low-vision users often force their own colours, enlarge text or loosen spacing. Good pages survive all three." />
      <div className="card stack">
        <div className="theme-pick" role="radiogroup" aria-label="Colour theme">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={store.theme === id} className="theme-opt" onClick={() => set({ theme: id })}>
              <span className="theme-sw" style={{ background: THEMES[id].bg, color: THEMES[id].text, borderColor: THEMES[id].border }}>Aa</span>
              {THEMES[id].label}
            </button>
          ))}
        </div>
        <div className="filters plain">
          <Field label="Text size">{(p) => <select {...p} value={store.textScale} onChange={(e) => set({ textScale: Number(e.target.value) })}><option value={1}>100 %</option><option value={1.5}>150 %</option><option value={2}>200 %</option></select>}</Field>
          <label className="check"><input type="checkbox" checked={store.spacing} onChange={(e) => set({ spacing: e.target.checked })} /> WCAG text-spacing override</label>
        </div>
      </div>
      <div className="contrast-layout">
        <div className="stack">
          <p className="small muted">{THEMES[store.theme].note}</p>
          <div className="sample-frame"><SampleSite store={store} /></div>
        </div>
        <section className="card stack" aria-labelledby="ck-t">
          <h2 id="ck-t" className="h3">Contrast checks</h2>
          {fails ? <Notice kind="error"><span data-testid="fails">{fails} check{fails === 1 ? '' : 's'} fail WCAG AA.</span></Notice> : <Notice kind="success"><span data-testid="fails">Every check passes WCAG AA.</span></Notice>}
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Contrast ratios for {THEMES[store.theme].label}</caption>
              <thead><tr><th scope="col">Element</th><th scope="col" className="num">Ratio</th><th scope="col">Grade</th></tr></thead>
              <tbody>{checks.map((c) => (
                <tr key={c.label}>
                  <th scope="row"><span className="pair-sw" style={{ background: c.bg, color: c.fg, borderColor: c.use === 'ui' ? c.fg : 'transparent' }} aria-hidden="true">{c.use === 'ui' ? '' : 'Aa'}</span>{c.label}</th>
                  <td className="num nowrap">{c.ratio.toFixed(2)}:1</td>
                  <td><span className={`badge ${GRADE_CLASS[c.grade]}`}>{c.grade}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <p className="small muted">Text needs 4.5:1 (AA) or 7:1 (AAA). Borders and other UI parts need 3:1.</p>
        </section>
      </div>
    </div>
  );
}

/* ---------- Focus ---------- */
function FocusPage({ store, setStore }: Ctx) {
  const [w, setW] = useState('160');
  const [h, setH] = useState('44');
  const [bgText, setBgText] = useState(store.focusBg);
  const [flash, setFlash] = useFlash();
  const set = (patch: Partial<Store>) => setStore({ ...store, ...patch });
  const wn = Number(w), hn = Number(h);
  const sizeErr = !(wn >= 16 && wn <= 600 && hn >= 16 && hn <= 200) ? 'Width 16–600 and height 16–200 px.' : null;
  const bgErr = hexToRgb(bgText) ? null : 'Enter a hex colour such as #ffffff.';
  const bg = store.focusBg;
  const style = FOCUS_STYLES[store.focus];
  return (
    <div className="stack">
      <PageHead eyebrow="Focus indicators" title={<>Can you <em>see focus?</em></>} description="WCAG 2.4.7 (AA) requires a visible focus indicator. 2.4.13 Focus Appearance (AAA) sets a minimum: an area at least a 2 px perimeter of the control, with 3:1 contrast against what it replaces." />
      <div className="card filters">
        <Field label="Control width (px)" error={sizeErr}>{(p) => <input {...p} inputMode="numeric" value={w} onChange={(e) => setW(e.target.value)} />}</Field>
        <Field label="Control height (px)">{(p) => <input {...p} inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} />}</Field>
        <Field label="Page background" error={bgErr}>{(p) => <input {...p} value={bgText} onChange={(e) => { setBgText(e.target.value); const rgb = hexToRgb(e.target.value); if (rgb) set({ focusBg: '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('') }); }} />}</Field>
        <div className="field"><span className="label">Presets</span><div className="row-gap">{['#ffffff', '#f2efe8', '#1b1c20', '#000000'].map((c) => <button key={c} type="button" className="bg-chip" style={{ background: c }} aria-label={`Background ${c}`} aria-pressed={bg === c} onClick={() => { setBgText(c); set({ focusBg: c }); }} />)}</div></div>
      </div>
      {!sizeErr && (
        <div className="table-wrap card flush">
          <table className="table">
            <caption className="sr-only">Focus styles measured on a {wn} × {hn} px control over {bg}</caption>
            <thead><tr><th scope="col">Style</th><th scope="col" className="num">Area (px²)</th><th scope="col" className="num">Needed</th><th scope="col" className="num">Contrast</th><th scope="col">Result</th></tr></thead>
            <tbody>{(Object.keys(FOCUS_STYLES) as FocusId[]).map((id) => {
              const r = evaluateFocus(FOCUS_STYLES[id], wn, hn, bg);
              const cls = r.verdict.startsWith('Meets') ? 'badge-ok' : r.visible ? 'badge-warn' : 'badge-err';
              return (
                <tr key={id} className={store.focus === id ? 'is-sel' : ''}>
                  <th scope="row"><button type="button" className="linklike" aria-pressed={store.focus === id} onClick={() => set({ focus: id })}>{FOCUS_STYLES[id].label}</button></th>
                  <td className={`num ${r.areaOk ? '' : 'low'}`}>{r.area}</td>
                  <td className="num">{r.minArea}</td>
                  <td className={`num ${r.contrastOk ? '' : 'low'}`}>{r.contrast.toFixed(2)}:1</td>
                  <td><span className={`badge ${cls}`}>{r.verdict}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      <div className="grid-2">
        <section className="card stack" aria-labelledby="try-t">
          <h2 id="try-t" className="h3">Try it: {style.label}</h2>
          <p className="small muted">Press Tab to move into these controls. The selected style is also used on the magnifier’s sample page.</p>
          <div className={`focus-demo fs-${store.focus}`} style={{ background: bg, color: (hexToRgb(bg)?.reduce((a, b) => a + b, 0) ?? 765) < 380 ? '#f2f2f2' : '#1a1a1a' }} data-testid="focus-demo">
            <button type="button" style={{ width: wn || undefined, height: hn || undefined }}>Button</button>
            <a href="#focus-demo" onClick={(e) => e.preventDefault()}>A text link</a>
            <input aria-label="Sample input" placeholder="Input" />
          </div>
        </section>
        <section className="card stack" aria-labelledby="css-t">
          <h2 id="css-t" className="h3">CSS</h2>
          {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
          <pre className="code" data-testid="css">{`:focus-visible {\n  ${style.css.replace(/\n/g, '\n  ')}\n}`}</pre>
          <div><button type="button" className="btn btn-sm" onClick={async () => setFlash((await copyText(`:focus-visible {\n  ${style.css.replace(/\n/g, '\n  ')}\n}`)) ? { kind: 'success', text: 'CSS copied.' } : { kind: 'error', text: 'Couldn’t copy — select the text instead.' })}>Copy CSS</button></div>
          <p className="small muted">Area counts only the parts with at least 3:1 contrast against the background. Approximation: it doesn’t account for rounded corners or the control’s own colour.</p>
        </section>
      </div>
    </div>
  );
}

function Notes() {
  return (
    <div className="stack prose-page">
      <PageHead eyebrow="Notes" title={<>Building for <em>magnification.</em></>} />
      <section className="card stack">
        <h2 className="h3">Checklist</h2>
        <ul>
          <li><strong>Never block zoom.</strong> Avoid <code>maximum-scale=1</code> or <code>user-scalable=no</code> in the viewport meta tag.</li>
          <li><strong>Reflow at 400 %.</strong> At 320 CSS px wide, content should fit without horizontal scrolling (WCAG 1.4.10).</li>
          <li><strong>Size text in rem.</strong> Text should resize to 200 % without loss of content (1.4.4).</li>
          <li><strong>Survive text spacing.</strong> Line height 1.5, paragraph spacing 2×, letter spacing 0.12em and word spacing 0.16em must not clip text (1.4.12).</li>
          <li><strong>Keep related things close.</strong> Put errors next to their field and confirmations near the button that caused them.</li>
          <li><strong>Make focus obvious.</strong> Use <code>:focus-visible</code> with a two-tone ring so it works on any background.</li>
          <li><strong>Respect forced colours.</strong> Test with Windows contrast themes; use <code>forced-colors</code> media queries only to restore meaning, not to override choices.</li>
        </ul>
      </section>
      <section className="card stack">
        <h2 className="h3">How this demo works</h2>
        <p>The lens renders a second, inert copy of the sample page, scaled and translated so the point under the pointer sits at the lens centre. Full-screen zoom scales the page inside a clipped stage and pans to keep the focused element in view with the smallest movement, as operating-system magnifiers do.</p>
      </section>
    </div>
  );
}
