import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Download, Share2, X, Gamepad2 } from 'lucide-react-native';

// Children's Day (14 Nov) decorations for the website: bunting, balloons, confetti,
// newspaper paper planes, three recycled-material buddies, a balloon-pop game and a
// "Little Green Hero" certificate. Plain SVG + CSS, no images. Decorations are
// aria-hidden; only the balloons and the buddies take taps. Layers pause while
// scrolled out of view, and motion stops for visitors who ask for reduced motion.
const CSS = `
.kvk-paused, .kvk-paused * { animation-play-state: paused !important; }

.kvk-flag { transform-box: fill-box; transform-origin: 50% 0; animation: kvk-flutter 2.6s ease-in-out infinite; }
@keyframes kvk-flutter { 0%, 100% { transform: rotate(-5deg) skewX(-2deg); } 50% { transform: rotate(5deg) skewX(2deg); } }

.kvk-rise { position: absolute; bottom: -110px; animation: kvk-rise var(--dur) linear infinite; }
@keyframes kvk-rise { 0% { transform: translate(0, 0); opacity: 0; } 6% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translate(var(--dx), calc(-100% - var(--h))); opacity: 0; } }
.kvk-sway { transform-origin: 50% 0; animation: kvk-sway 3.4s ease-in-out infinite; }
@keyframes kvk-sway { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }

.kvk-confetti { position: absolute; top: -16px; opacity: 0; animation: kvk-fall var(--dur) linear infinite; }
@keyframes kvk-fall {
  0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
  8% { opacity: .95; }
  100% { opacity: .95; transform: translate(var(--dx), var(--fall)) rotate(var(--rot)); }
}

.kvk-plane { position: absolute; left: 0; animation: kvk-fly var(--dur) ease-in-out infinite; }
@keyframes kvk-fly {
  0% { transform: translate(-90px, 0) rotate(-4deg); opacity: 0; }
  5% { opacity: 1; }
  25% { transform: translate(calc(var(--w) * .25), -26px) rotate(-12deg); }
  50% { transform: translate(calc(var(--w) * .5), 12px) rotate(6deg); }
  75% { transform: translate(calc(var(--w) * .75), -20px) rotate(-8deg); }
  95% { opacity: 1; }
  100% { transform: translate(calc(var(--w) + 90px), 0) rotate(-2deg); opacity: 0; }
}

.kvk-cloud { position: absolute; animation: kvk-drift var(--dur) linear infinite; }
@keyframes kvk-drift { from { transform: translateX(-30vw); } to { transform: translateX(130vw); } }

.kvk-rainbow {
  background: linear-gradient(90deg, #f43f5e, #fb923c, #facc15, #4ade80, #38bdf8, #a78bfa, #f472b6, #f43f5e);
  background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: kvk-slide 6s linear infinite;
}
@keyframes kvk-slide { from { background-position: 0% 0; } to { background-position: 300% 0; } }

@property --kvk-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.kvk-border {
  position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-radius: inherit; padding: 2px; pointer-events: none;
  background: conic-gradient(from var(--kvk-a), #f43f5e, #fb923c, #facc15, #4ade80, #38bdf8, #a78bfa, #f472b6, #f43f5e);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: .85; animation: kvk-border 5s linear infinite;
}
@keyframes kvk-border { to { --kvk-a: 360deg; } }

.kvk-burst span { position: absolute; left: 0; top: 0; width: 7px; height: 7px; margin: -3.5px; border-radius: 2px; animation: kvk-burst .8s ease-out forwards; }
@keyframes kvk-burst { from { opacity: 1; transform: rotate(var(--a)) translateX(0) rotate(0deg); } to { opacity: 0; transform: rotate(var(--a)) translateX(var(--d)) rotate(220deg); } }

.kvk-buddy { pointer-events: auto; cursor: pointer; transform-origin: 50% 100%; animation: kvk-peek .9s cubic-bezier(.2, 1.4, .4, 1) both; }
@keyframes kvk-peek { from { transform: translateY(110%); } to { transform: translateY(0); } }
.kvk-bob { transform-origin: 50% 100%; animation: kvk-bob 3.2s ease-in-out infinite; }
@keyframes kvk-bob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(2deg); } }
.kvk-jump { animation: kvk-jump .7s cubic-bezier(.3, 1.6, .5, 1); }
@keyframes kvk-jump { 0% { transform: translateY(0) scale(1, 1); } 20% { transform: translateY(2px) scale(1.1, .88); } 55% { transform: translateY(-22px) scale(.95, 1.06); } 100% { transform: translateY(0) scale(1, 1); } }
.kvk-pupil { transform: translate(var(--px, 0px), var(--py, 0px)); transition: transform .12s ease-out; }
.kvk-eyes { transform-box: fill-box; transform-origin: 50% 50%; animation: kvk-blink 5s ease-in-out infinite; }
@keyframes kvk-blink { 0%, 94%, 100% { transform: scaleY(1); } 96% { transform: scaleY(.1); } }
.kvk-wave { transform-box: fill-box; transform-origin: 10% 90%; animation: kvk-wave 1.8s ease-in-out infinite; }
@keyframes kvk-wave { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-28deg); } }
.kvk-bubble { animation: kvk-bubble .35s cubic-bezier(.2, 1.4, .4, 1) both; }
@keyframes kvk-bubble { from { opacity: 0; transform: translateY(8px) scale(.8); } to { opacity: 1; transform: none; } }

.kvk-balloon { pointer-events: auto; cursor: pointer; }
.kvk-balloon:hover svg { transform: scale(1.08); }
.kvk-balloon svg { transition: transform .15s ease; }

.kvk-pop-in { animation: kvk-popin .45s cubic-bezier(.2, 1.5, .4, 1) both; }
@keyframes kvk-popin { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: none; } }
.kvk-card-in { animation: kvk-cardin .7s cubic-bezier(.2, 1.3, .4, 1) .15s both; }
@keyframes kvk-cardin { from { opacity: 0; transform: translateY(60px) scale(.85) rotate(-3deg); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .kvk-flag, .kvk-rise, .kvk-sway, .kvk-confetti, .kvk-plane, .kvk-cloud, .kvk-rainbow, .kvk-border,
  .kvk-buddy, .kvk-bob, .kvk-jump, .kvk-eyes, .kvk-wave, .kvk-bubble, .kvk-pop-in, .kvk-card-in { animation: none !important; }
  .kvk-confetti, .kvk-plane, .kvk-cloud, .kvk-burst { display: none; }
  .kvk-rise { bottom: 20%; opacity: .9; }
}
`;

function ensureCss() {
  if (typeof document === 'undefined' || document.getElementById('kv-kids-css')) return;
  const el = document.createElement('style');
  el.id = 'kv-kids-css';
  el.textContent = CSS;
  document.head.appendChild(el);
}

function usePauseOffscreen() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => el.classList.toggle('kvk-paused', !entry.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

const reducedMotion = () => {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

const cssVars = (vars: Record<string, string>) => vars as React.CSSProperties;
const RAINBOW = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const layer: React.CSSProperties = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none', overflow: 'hidden' };

// ─── Text and borders ──────────────────────────────────────────────────────────

export function KidsShimmerText({ text }: { text: string }) {
  ensureCss();
  return <span className="kvk-rainbow">{text}</span>;
}

// A rainbow running round the border of the card it's placed in.
export function KidsRainbowBorder({ delay = 0 }: { delay?: number }) {
  ensureCss();
  return <div aria-hidden className="kvk-border" style={{ animationDelay: `${-delay}s` }} />;
}

// ─── Bunting ───────────────────────────────────────────────────────────────────

const SEG = 120;

// Rainbow pennant flags in swags across the full width, fluttering.
export function KidsBunting({ top = 0, compact = false }: { top?: number; compact?: boolean }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const h = compact ? 36 : 48;
  const sag = compact ? 10 : 14;
  const flag = compact ? 14 : 19;
  return (
    <div ref={ref} aria-hidden style={{ position: 'absolute', top, left: 0, right: 0, height: h + 6, overflow: 'hidden', pointerEvents: 'none', display: 'flex', zIndex: 2 }}>
      {Array.from({ length: 22 }, (_, seg) => (
        <svg key={seg} width={SEG} height={h + 6} viewBox={`0 0 ${SEG} ${h + 6}`} style={{ flexShrink: 0, overflow: 'visible' }}>
          <path d={`M0 3 Q${SEG / 2} ${3 + sag * 2} ${SEG} 3`} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" />
          {[0.14, 0.38, 0.62, 0.86].map((t, k) => {
            const x = SEG * t;
            const y = 3 + 2 * t * (1 - t) * sag * 2;
            const color = RAINBOW[(seg * 4 + k) % RAINBOW.length];
            return (
              <g key={k} className="kvk-flag" style={{ animationDelay: `${((seg * 4 + k) * 0.23) % 2.6}s` }}>
                <path d={`M${x - flag / 2} ${y} L${x + flag / 2} ${y} L${x} ${y + flag * 1.15} Z`} fill={color} />
                <circle cx={x} cy={y + flag * 0.38} r={flag * 0.13} fill="#ffffff" opacity="0.6" />
              </g>
            );
          })}
        </svg>
      ))}
    </div>
  );
}

// ─── Balloons ──────────────────────────────────────────────────────────────────

function BalloonSvg({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size * 1.9} viewBox="0 0 40 76" style={{ overflow: 'visible', display: 'block' }}>
      <path d="M20 42 q-5 8 0 16 q5 8 0 16" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
      <ellipse cx="20" cy="20" rx="16" ry="19.5" fill={color} />
      <ellipse cx="20" cy="20" rx="16" ry="19.5" fill="url(#kvk-shade)" />
      <ellipse cx="13.5" cy="12.5" rx="3.6" ry="6" fill="#ffffff" opacity="0.5" transform="rotate(-18 13.5 12.5)" />
      <path d="M17 38.5 L20 43 L23 38.5 Z" fill={color} />
    </svg>
  );
}

// Shared shading gradient for the balloons (one copy per page is enough).
function BalloonDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <radialGradient id="kvk-shade" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Decorative balloons drifting up behind the content.
export function KidsBalloons({ count = 8, height = 600, from = 0 }: { count?: number; height?: number; from?: number }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const items = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      left: from + 3 + ((i * 97) % 94) * ((100 - from) / 100),
      size: 22 + Math.random() * 16,
      dur: 14 + Math.random() * 10,
      delay: -Math.random() * 24,
      dx: (Math.random() - 0.5) * 80,
      color: RAINBOW[i % RAINBOW.length],
      o: 0.55 + Math.random() * 0.3,
    })),
    [count, from],
  );
  return (
    <div ref={ref} aria-hidden style={layer}>
      <BalloonDefs />
      {items.map((b, i) => (
        <div key={i} className="kvk-rise" style={{ left: `${b.left}%`, opacity: b.o, animationDelay: `${b.delay.toFixed(1)}s`, ...cssVars({ '--dur': `${b.dur.toFixed(1)}s`, '--dx': `${b.dx.toFixed(0)}px`, '--h': `${height}px` }) }}>
          <div className="kvk-sway" style={{ animationDelay: `${-i * 0.7}s` }}><BalloonSvg color={b.color} size={b.size} /></div>
        </div>
      ))}
    </div>
  );
}

// ─── Confetti and paper planes ─────────────────────────────────────────────────

export function KidsConfetti({ count = 18, fall = 520 }: { count?: number; fall?: number }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const bits = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      w: 5 + Math.random() * 4,
      h: i % 3 === 0 ? 5 + Math.random() * 4 : 10 + Math.random() * 6,
      round: i % 3 === 0,
      color: RAINBOW[i % RAINBOW.length],
      dur: 7 + Math.random() * 6,
      delay: -Math.random() * 13,
      dx: (Math.random() - 0.5) * 140,
      rot: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
    })),
    [count],
  );
  return (
    <div ref={ref} aria-hidden style={layer}>
      {bits.map((c, i) => (
        <span
          key={i}
          className="kvk-confetti"
          style={{
            left: `${c.left}%`, width: c.w, height: c.h, background: c.color, borderRadius: c.round ? '50%' : 2,
            animationDelay: `${c.delay.toFixed(1)}s`,
            ...cssVars({ '--dur': `${c.dur.toFixed(1)}s`, '--dx': `${c.dx.toFixed(0)}px`, '--rot': `${c.rot.toFixed(0)}deg`, '--fall': `${fall}px` }),
          }}
        />
      ))}
    </div>
  );
}

// A paper plane folded from a newspaper page (grey print lines on it).
function PlaneSvg({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 64 40" style={{ overflow: 'visible', display: 'block' }}>
      <path d="M2 20 L62 3 L26 25 Z" fill="#f8fafc" />
      <path d="M26 25 L62 3 L32 37 Z" fill="#e2e8f0" />
      <path d="M26 25 L32 37 L23 30 Z" fill="#cbd5e1" />
      <g stroke="#94a3b8" strokeWidth="0.9" opacity="0.8">
        <path d="M14 18 L44 9.5" /><path d="M18 20 L48 11.5" /><path d="M23 21.5 L52 13" />
        <path d="M33 27 L52 13.5" /><path d="M35 30 L55 12" />
      </g>
      <path d="M2 20 L62 3" stroke="#cbd5e1" strokeWidth="0.8" />
    </svg>
  );
}

export function KidsPaperPlanes({ count = 2, width = 1200 }: { count?: number; width?: number }) {
  ensureCss();
  const ref = usePauseOffscreen();
  return (
    <div ref={ref} aria-hidden style={layer}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="kvk-plane" style={{ top: `${18 + i * 34}%`, animationDelay: `${-i * 7.5}s`, ...cssVars({ '--dur': `${15 + i * 4}s`, '--w': `${width}px` }) }}>
          <PlaneSvg size={i ? 44 : 58} />
        </div>
      ))}
    </div>
  );
}

// ─── Recycle buddies ───────────────────────────────────────────────────────────

type BuddyName = 'botlu' | 'kaagzi' | 'tinku';

const BUDDY_LINES: Record<BuddyName, string[]> = {
  botlu: [
    "Hi, I'm Botlu! Recycled, I can become a T-shirt or a park bench.",
    'Rinse me and squash me before you recycle me. Thank you!',
    'A plastic bottle can stay around for hundreds of years. Recycle me instead!',
  ],
  kaagzi: [
    "Hi, I'm Kaagzi! Recycled paper becomes brand new notebooks.",
    'Fold me into a paper plane first, then recycle me!',
    'Paper can be recycled again and again, many times over.',
  ],
  tinku: [
    "Hi, I'm Tinku! A can can be recycled forever and never wears out.",
    'A recycled can can be back on the shop shelf in a few weeks.',
    'Recycling one can saves enough energy to run a TV for hours.',
  ],
};

const Eyes = ({ cx1, cx2, cy }: { cx1: number; cx2: number; cy: number }) => (
  <g className="kvk-eyes">
    <circle cx={cx1} cy={cy} r="5.2" fill="#ffffff" />
    <circle cx={cx2} cy={cy} r="5.2" fill="#ffffff" />
    <g className="kvk-pupil">
      <circle cx={cx1} cy={cy} r="2.6" fill="#0f172a" />
      <circle cx={cx2} cy={cy} r="2.6" fill="#0f172a" />
      <circle cx={cx1 + 0.9} cy={cy - 0.9} r="0.8" fill="#ffffff" />
      <circle cx={cx2 + 0.9} cy={cy - 0.9} r="0.8" fill="#ffffff" />
    </g>
  </g>
);

const Smile = ({ cx, cy }: { cx: number; cy: number }) => (
  <g>
    <path d={`M${cx - 5} ${cy} Q${cx} ${cy + 6} ${cx + 5} ${cy}`} fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx={cx - 10} cy={cy - 1} r="2.6" fill="#fb7185" opacity="0.55" />
    <circle cx={cx + 10} cy={cy - 1} r="2.6" fill="#fb7185" opacity="0.55" />
  </g>
);

function BuddyArt({ name }: { name: BuddyName }) {
  if (name === 'botlu') {
    return (
      <svg width="64" height="104" viewBox="0 0 64 104" style={{ overflow: 'visible', display: 'block' }}>
        <path className="kvk-wave" d="M14 58 Q4 52 6 42" fill="none" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M50 58 Q58 64 56 72" fill="none" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="23" y="2" width="18" height="10" rx="2.5" fill="#16a34a" />
        <rect x="25" y="11" width="14" height="5" fill="#bae6fd" />
        <path d="M24 16 Q16 22 15 34 L15 94 Q15 102 23 102 L41 102 Q49 102 49 94 L49 34 Q48 22 40 16 Z" fill="#7dd3fc" stroke="#0ea5e9" strokeWidth="1.5" />
        <path d="M20 36 L20 90" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        <rect x="15" y="62" width="34" height="18" fill="#4ade80" />
        <path d="M24 71 q4 -5 8 0 q4 5 8 0" fill="none" stroke="#ffffff" strokeWidth="1.6" />
        <Eyes cx1={26} cx2={38} cy={42} />
        <Smile cx={32} cy={51} />
      </svg>
    );
  }
  if (name === 'kaagzi') {
    return (
      <svg width="74" height="100" viewBox="0 0 74 100" style={{ overflow: 'visible', display: 'block' }}>
        <path d="M14 6 L37 -10 L60 6 Z" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.2" />
        <path className="kvk-wave" d="M10 56 Q0 50 2 40" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M64 56 Q72 62 70 70" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M10 6 L56 6 L64 14 L64 98 L10 98 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
        <path d="M56 6 L56 14 L64 14 Z" fill="#e2e8f0" />
        <rect x="16" y="12" width="34" height="7" rx="1.5" fill="#64748b" />
        <g stroke="#cbd5e1" strokeWidth="1.4">
          <path d="M16 62 L58 62" /><path d="M16 68 L58 68" /><path d="M16 74 L46 74" /><path d="M16 82 L58 82" /><path d="M16 88 L52 88" />
        </g>
        <Eyes cx1={30} cx2={44} cy={36} />
        <Smile cx={37} cy={46} />
      </svg>
    );
  }
  return (
    <svg width="64" height="96" viewBox="0 0 64 96" style={{ overflow: 'visible', display: 'block' }}>
      <path className="kvk-wave" d="M10 56 Q0 50 2 40" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M54 56 Q62 62 60 70" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="10" y="14" width="44" height="78" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
      <ellipse cx="32" cy="14" rx="22" ry="6" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" />
      <ellipse cx="38" cy="13" rx="6" ry="2.4" fill="none" stroke="#64748b" strokeWidth="1.6" />
      <rect x="10" y="50" width="44" height="28" fill="#f87171" />
      <path d="M10 64 L54 64" stroke="#ffffff" strokeWidth="2" opacity="0.6" />
      <path d="M16 20 L16 86" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Eyes cx1={25} cx2={39} cy={32} />
      <Smile cx={32} cy={42} />
    </svg>
  );
}

function Buddy({ name, style, delay, scale = 1 }: { name: BuddyName; style: React.CSSProperties; delay: number; scale?: number }) {
  const [line, setLine] = useState<string | null>(null);
  const [jump, setJump] = useState(0);
  const turn = useRef(0);
  const hide = useRef<any>(null);
  useEffect(() => () => clearTimeout(hide.current), []);
  const tap = () => {
    const lines = BUDDY_LINES[name];
    setLine(lines[turn.current % lines.length]);
    turn.current += 1;
    setJump((j) => j + 1);
    clearTimeout(hide.current);
    hide.current = setTimeout(() => setLine(null), 4200);
  };
  return (
    <div style={{ position: 'absolute', bottom: 0, ...style }}>
      {line && (
        <div className="kvk-bubble" style={b.bubble}>
          {line}
          <span style={b.tail} />
        </div>
      )}
      <div
        className="kvk-buddy"
        data-buddy
        role="button"
        tabIndex={0}
        aria-label={`${name === 'botlu' ? 'Botlu the bottle' : name === 'kaagzi' ? 'Kaagzi the newspaper' : 'Tinku the can'}: tap for a recycling fact`}
        onClick={tap}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') tap(); }}
        style={{ animationDelay: `${delay}s`, transform: `scale(${scale})` }}
      >
        <div className="kvk-bob" style={{ animationDelay: `${-delay * 2}s` }}>
          <div key={jump} className={jump ? 'kvk-jump' : undefined}><BuddyArt name={name} /></div>
        </div>
      </div>
    </div>
  );
}

const b: Record<string, React.CSSProperties> = {
  bubble: {
    position: 'absolute', bottom: '100%', left: '50%', marginLeft: -100, marginBottom: 10, width: 200,
    background: '#ffffff', color: '#0f172a', borderRadius: 14, padding: '10px 12px', fontSize: 12.5, lineHeight: '17px',
    fontWeight: 600, boxShadow: '0 10px 24px rgba(15,23,42,0.25)', fontFamily: 'system-ui, -apple-system, sans-serif', zIndex: 5,
  },
  tail: { position: 'absolute', top: '100%', left: '50%', marginLeft: -7, width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '8px solid #ffffff' },
};

// Botlu the bottle, Kaagzi the newspaper and Tinku the can peek up from the bottom
// edge of their parent. Their eyes follow the pointer; a tap makes them jump and say
// a recycling fact. Give the parent some bottom padding so they don't cover content.
export function RecycleBuddies({ compact = false }: { compact?: boolean }) {
  ensureCss();
  const ref = usePauseOffscreen();
  useEffect(() => {
    const root = ref.current;
    if (!root || reducedMotion()) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.querySelectorAll<HTMLElement>('[data-buddy]').forEach((el) => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height * 0.4);
          const d = Math.max(1, Math.hypot(dx, dy));
          el.style.setProperty('--px', `${((dx / d) * 2.2).toFixed(2)}px`);
          el.style.setProperty('--py', `${((dy / d) * 2.2).toFixed(2)}px`);
        });
      });
    };
    window.addEventListener('pointermove', move);
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(frame); };
  }, [ref]);
  return (
    <div ref={ref} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 0, pointerEvents: 'none', zIndex: 3 }}>
      {compact ? (
        <>
          <Buddy name="botlu" style={{ left: 10 }} delay={0.6} scale={0.8} />
          <Buddy name="tinku" style={{ right: 12 }} delay={0.9} scale={0.8} />
        </>
      ) : (
        <>
          <Buddy name="botlu" style={{ left: '3%' }} delay={0.6} />
          <Buddy name="kaagzi" style={{ right: 'calc(3% + 78px)' }} delay={0.9} />
          <Buddy name="tinku" style={{ right: '3%' }} delay={1.2} />
        </>
      )}
    </div>
  );
}

// ─── Balloon-pop game ──────────────────────────────────────────────────────────

const POP_FACTS = [
  'Turn off the tap while brushing your teeth.',
  'Carry a cloth bag to the market.',
  'Old crayons can be melted into new ones.',
  'Sort dry and wet waste at home.',
  'Say no to plastic straws.',
  'Plant a seed and watch it grow!',
  'Switch off the fan when you leave the room.',
  'Give old toys and books a second life.',
];
const GOAL = 5;
const POPS_KEY = 'kvKidsPops';

type GameBalloon = { id: number; left: number; color: string; dur: number; delay: number; size: number };
type Pop = { id: number; x: number; y: number; color: string; fact: string };

let balloonId = 0;
const newBalloon = (initial: boolean): GameBalloon => ({
  id: ++balloonId,
  left: 6 + Math.random() * 86,
  color: pick(RAINBOW),
  dur: 11 + Math.random() * 6,
  delay: initial ? -Math.random() * 10 : 0,
  size: 30 + Math.random() * 10,
});

const readPops = () => { try { return Number(sessionStorage.getItem(POPS_KEY)) || 0; } catch { return 0; } };

function Burst({ color }: { color: string }) {
  return (
    <div aria-hidden className="kvk-burst" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}>
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} style={{ background: i % 2 ? color : RAINBOW[i % RAINBOW.length], ...cssVars({ '--a': `${(i * 360) / 16}deg`, '--d': `${34 + (i % 4) * 9}px` }) }} />
      ))}
    </div>
  );
}

// Balloons float up through the parent; tapping one pops it with confetti and a small
// eco tip. Popping five unlocks a "Little Eco Hero" badge (kept for this tab).
export function BalloonPopGame({ count = 4, height = 560 }: { count?: number; height?: number }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const [balloons, setBalloons] = useState<GameBalloon[]>(() => Array.from({ length: count }, () => newBalloon(true)));
  const [pops, setPops] = useState<Pop[]>([]);
  const [score, setScore] = useState(readPops);
  const [won, setWon] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { setNarrow((ref.current?.clientWidth || 1000) < 640); }, [ref]);
  const timers = useRef<any[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pop = (bl: GameBalloon, e: React.MouseEvent<HTMLDivElement>) => {
    const root = ref.current?.getBoundingClientRect();
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    if (!root) return;
    const p: Pop = { id: bl.id, x: r.left + r.width / 2 - root.left, y: r.top + r.width / 2 - root.top, color: bl.color, fact: pick(POP_FACTS) };
    setBalloons((list) => list.filter((x) => x.id !== bl.id));
    setPops((list) => [...list.slice(-2), p]);
    const next = score + 1;
    setScore(next);
    try { sessionStorage.setItem(POPS_KEY, String(next)); } catch { /* storage blocked */ }
    if (next === GOAL) { setWon(true); timers.current.push(setTimeout(() => setWon(false), 5200)); }
    timers.current.push(setTimeout(() => setPops((list) => list.filter((x) => x.id !== p.id)), 2600));
    timers.current.push(setTimeout(() => setBalloons((list) => [...list, newBalloon(false)]), 1500));
  };

  return (
    <div ref={ref} style={{ ...layer, zIndex: 4 }}>
      <BalloonDefs />
      {balloons.map((bl) => (
        <div
          key={bl.id}
          className="kvk-rise kvk-balloon"
          role="button"
          aria-label="Pop the balloon"
          onClick={(e) => pop(bl, e)}
          style={{ left: `${bl.left}%`, animationDelay: `${bl.delay.toFixed(1)}s`, ...cssVars({ '--dur': `${bl.dur.toFixed(1)}s`, '--dx': '0px', '--h': `${height}px` }) }}
        >
          <div className="kvk-sway"><BalloonSvg color={bl.color} size={bl.size} /></div>
        </div>
      ))}
      {pops.map((p) => (
        <div key={p.id} style={{ position: 'absolute', left: p.x, top: p.y }}>
          <Burst color={p.color} />
          <div className="kvk-pop-in" style={g.fact}>{p.fact}</div>
        </div>
      ))}
      <div style={g.hud}>
        {score >= GOAL ? (
          <span style={g.hudWon}>Little Eco Hero unlocked</span>
        ) : (
          <span>{narrow ? `Pop ${GOAL} balloons` : `Pop ${GOAL} balloons to become a Little Eco Hero`} · {score}/{GOAL}</span>
        )}
      </div>
      {won && (
        <div className="kvk-pop-in" style={g.win} role="status">
          <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="#facc15" stroke="#f59e0b" strokeWidth="1" /></svg>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900 }}>You're a Little Eco Hero!</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>Now show a grown-up how to recycle at home.</div>
          </div>
          <div style={{ position: 'absolute', left: '50%', top: '50%' }}><Burst color="#facc15" /></div>
        </div>
      )}
    </div>
  );
}

const g: Record<string, React.CSSProperties> = {
  fact: {
    position: 'absolute', left: -90, top: -64, width: 180, textAlign: 'center', background: '#ffffff', color: '#0f172a',
    borderRadius: 12, padding: '8px 10px', fontSize: 12.5, fontWeight: 700, lineHeight: '16px',
    boxShadow: '0 8px 20px rgba(15,23,42,0.25)', fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  hud: {
    position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', whiteSpace: 'nowrap', pointerEvents: 'none',
    background: 'rgba(15,23,42,0.35)', color: '#ffffff', borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 700,
    fontFamily: 'system-ui, -apple-system, sans-serif', border: '1px solid rgba(255,255,255,0.25)', maxWidth: '92%', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  hudWon: { color: '#fde68a' },
  win: {
    position: 'absolute', left: '50%', top: '42%', marginLeft: -150, width: 300, display: 'flex', alignItems: 'center', gap: 12,
    background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#ffffff', borderRadius: 18, padding: '14px 16px',
    boxShadow: '0 16px 40px rgba(0,0,0,0.35)', fontFamily: 'system-ui, -apple-system, sans-serif', zIndex: 6,
  },
};

// ─── Page backdrop and header decoration ───────────────────────────────────────

const doodleTile = (color: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'>`
    + `<g fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>`
    + `<path d='M30 18l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z'/>`
    + `<path d='M120 40c8-10 22-6 22 6 0 10-22 22-22 22s-22-12-22-22c0-12 14-16 22-6z'/>`
    + `<path d='M40 120c10-18 34-18 40 0-10 12-30 12-40 0z M60 112v20'/>`
    + `<circle cx='140' cy='130' r='12'/><path d='M140 112v-6 M140 154v-6 M122 130h-6 M164 130h-6'/>`
    + `<path d='M96 160c6-6 12 6 18 0s12 6 18 0'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

function Cloud({ w }: { w: number }) {
  return (
    <svg width={w} height={w * 0.5} viewBox="0 0 120 60" aria-hidden>
      <path d="M20 50 Q4 50 6 36 Q8 24 22 26 Q24 8 44 10 Q58 0 72 12 Q92 6 96 24 Q114 24 114 38 Q114 50 98 50 Z" fill="#ffffff" />
    </svg>
  );
}

// Page background for the day: a soft sky, clouds drifting, a faint doodle print and
// a few balloons rising. Place it first inside a full-size parent; it doesn't scroll.
export function KidsBackdrop({ dark }: { dark: boolean }) {
  ensureCss();
  const ref = usePauseOffscreen();
  return (
    <div ref={ref} aria-hidden style={layer}>
      <div style={{ ...layer, background: dark ? 'radial-gradient(60vw 50vh at 10% 0%, rgba(56,189,248,0.16), transparent), radial-gradient(60vw 50vh at 90% 60%, rgba(244,114,182,0.14), transparent)' : 'linear-gradient(180deg, #e0f2fe 0%, #f5f3ff 45%, #fdf2f8 75%, #fefce8 100%)' }} />
      {!dark && [0, 1, 2].map((i) => (
        <div key={i} className="kvk-cloud" style={{ top: `${8 + i * 26}%`, opacity: 0.85 - i * 0.15, animationDelay: `${-i * 23}s`, ...cssVars({ '--dur': `${70 + i * 18}s` }) }}>
          <Cloud w={150 - i * 20} />
        </div>
      ))}
      <div style={{ ...layer, backgroundImage: doodleTile(dark ? '#a78bfa' : '#8b5cf6'), backgroundSize: '180px 180px', opacity: dark ? 0.06 : 0.1 }} />
      <KidsBalloons count={6} height={1000} />
    </div>
  );
}

// Decoration for a page's green header: a bunch of balloons in the corner, a paper
// plane, confetti and (on phones, with no navbar above) bunting. The header needs
// overflow hidden.
export function KidsHeaderDecor({ wide }: { wide: boolean }) {
  ensureCss();
  const ref = usePauseOffscreen();
  const { width } = useWindowDimensions();
  return (
    <div ref={ref} aria-hidden style={layer}>
      <BalloonDefs />
      {!wide && <KidsBunting compact />}
      <KidsConfetti count={wide ? 14 : 8} fall={260} />
      <KidsPaperPlanes count={1} width={width} />
      <div style={{ position: 'absolute', right: wide ? 40 : 14, top: wide ? 18 : 40, display: 'flex', alignItems: 'flex-start', opacity: 0.95 }}>
        {[['#f472b6', 24, 10], ['#38bdf8', 30, 0], ['#facc15', 22, 14]].map(([c, s, y], i) => (
          <div key={i} className="kvk-sway" style={{ marginLeft: -6, marginTop: y as number, animationDelay: `${-i * 1.1}s` }}>
            <BalloonSvg color={c as string} size={(s as number) * (wide ? 1.2 : 1)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cards ─────────────────────────────────────────────────────────────────────

const SKY: [string, string, string] = ['#0284c7', '#6366f1', '#a21caf'];

// "Turn old toys and books into smiles": the day's pickup nudge.
export function KidsToyCard({ onPress, isMobile = false }: { onPress: () => void; isMobile?: boolean }) {
  ensureCss();
  return (
    <LinearGradient colors={SKY} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[k.card, isMobile && k.cardMobile]}>
      <KidsConfetti count={isMobile ? 8 : 14} fall={320} />
      {!isMobile && <KidsBalloons count={5} height={360} from={62} />}
      <View style={[k.row, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, maxWidth: 560 }}>
          <Text style={k.kicker}>Children's Day special</Text>
          <Text style={[k.title, isMobile && { fontSize: 22 }]}>Turn old toys and books into smiles</Text>
          <Text style={k.sub}>Outgrown notebooks, old storybooks and broken plastic toys? Give them a second life and earn KarmaCoins.</Text>
          <TouchableOpacity style={k.cta} onPress={onPress} activeOpacity={0.85}>
            <Text style={k.ctaText}>Schedule a pickup</Text>
            <ArrowRight size={16} color="#4c1d95" />
          </TouchableOpacity>
        </View>
        {!isMobile && (
          <div aria-hidden style={{ display: 'flex', alignItems: 'flex-end', gap: 10, paddingRight: 8 }}>
            <div className="kvk-bob"><BuddyArt name="botlu" /></div>
            <div className="kvk-bob" style={{ animationDelay: '-1s' }}><BuddyArt name="kaagzi" /></div>
            <div className="kvk-bob" style={{ animationDelay: '-2s' }}><BuddyArt name="tinku" /></div>
          </div>
        )}
      </View>
    </LinearGradient>
  );
}

// A slim bar under a page header, leading to a pickup.
export function KidsStrip({ onPress }: { onPress: () => void }) {
  ensureCss();
  const narrow = useWindowDimensions().width < 420;
  return (
    <LinearGradient colors={SKY} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[k.strip, narrow && { flexWrap: 'wrap' }]}>
      <KidsConfetti count={6} fall={120} />
      <div aria-hidden style={{ flexShrink: 0, transform: 'scale(0.55)', margin: '-22px -14px -26px -10px' }}><BuddyArt name="tinku" /></div>
      <View style={{ flex: 1 }}>
        <Text style={k.stripTitle}>Children's Day clear-out?</Text>
        <Text style={k.stripSub}>Old notebooks and plastic toys earn KarmaCoins.</Text>
      </View>
      <TouchableOpacity style={[k.cta, k.stripCta, narrow && { width: '100%', justifyContent: 'center', marginTop: 4 }]} onPress={onPress} activeOpacity={0.85}>
        <Text style={[k.ctaText, { fontSize: 14 }]}>Schedule</Text>
        <ArrowRight size={15} color="#4c1d95" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const k = StyleSheet.create({
  card: { borderRadius: 22, overflow: 'hidden', padding: 28 },
  cardMobile: { padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  kicker: { color: '#fde68a', fontSize: 13, fontWeight: '900', letterSpacing: 0.4, marginBottom: 6 },
  title: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginBottom: 8 },
  sub: { color: 'rgba(255,255,255,0.88)', fontSize: 15, lineHeight: 22, marginBottom: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#fde68a', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  ctaText: { color: '#4c1d95', fontSize: 15, fontWeight: '900' },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 12 },
  stripTitle: { color: '#fde68a', fontSize: 15, fontWeight: '900' },
  stripSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12.5, marginTop: 2 },
  stripCta: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 9 },
});

// ─── Greeting and certificate ──────────────────────────────────────────────────

const CERT_DATE = '14 November 2026';
const shownName = (name: string) => (name || '').trim() || 'Eco Hero';
const certChips = (pickups: number, quizDays: number) => {
  const chips: { text: string; bg: string; fg: string }[] = [];
  if (pickups > 0) chips.push({ text: `${pickups} ${pickups === 1 ? 'pickup' : 'pickups'}`, bg: '#dcfce7', fg: '#15803d' });
  if (quizDays > 0) chips.push({ text: `${quizDays} quiz ${quizDays === 1 ? 'day' : 'days'}`, bg: '#ede9fe', fg: '#6d28d9' });
  return chips.length ? chips : [{ text: 'Starting the green journey', bg: '#e0f2fe', fg: '#0369a1' }];
};

// Draws the certificate as a 1200×850 PNG for download and sharing.
async function certificateBlob(name: string, pickups: number, quizDays: number): Promise<Blob | null> {
  const W = 1200, H = 850;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (!x) return null;
  const font = (w: number, s: number) => `${w} ${s}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  x.fillStyle = '#fffdf5'; x.fillRect(0, 0, W, H);
  RAINBOW.forEach((col, i) => { x.strokeStyle = col; x.lineWidth = 7; x.strokeRect(18 + i * 7, 18 + i * 7, W - 36 - i * 14, H - 36 - i * 14); });
  const balloon = (bx: number, by: number, col: string, r: number) => {
    x.strokeStyle = '#94a3b8'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, by + r * 1.2); x.quadraticCurveTo(bx - 10, by + r * 2, bx, by + r * 2.8); x.stroke();
    x.fillStyle = col; x.beginPath(); x.ellipse(bx, by, r, r * 1.2, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(bx - r * 0.35, by - r * 0.4, r * 0.22, r * 0.36, -0.3, 0, Math.PI * 2); x.fill();
  };
  balloon(140, 170, '#f472b6', 34); balloon(200, 140, '#38bdf8', 40); balloon(W - 150, 160, '#facc15', 38); balloon(W - 210, 200, '#4ade80', 30);
  x.textAlign = 'center';
  x.fillStyle = '#15803d'; x.font = font(800, 30); x.fillText('KarmaVer$e', W / 2, 140);
  const grad = x.createLinearGradient(W / 2 - 330, 0, W / 2 + 330, 0);
  RAINBOW.forEach((col, i) => grad.addColorStop(i / (RAINBOW.length - 1), col));
  x.fillStyle = grad; x.font = font(900, 74); x.fillText('Little Green Hero', W / 2, 240);
  x.fillStyle = '#475569'; x.font = font(600, 26); x.fillText('This certificate is proudly presented to', W / 2, 310);
  x.fillStyle = '#0f172a'; let size = 64; x.font = font(900, size);
  const nm = shownName(name);
  while (x.measureText(nm).width > W - 280 && size > 34) { size -= 4; x.font = font(900, size); }
  x.fillText(nm, W / 2, 395);
  x.strokeStyle = '#cbd5e1'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 300, 420); x.lineTo(W / 2 + 300, 420); x.stroke();
  x.fillStyle = '#334155'; x.font = font(600, 26); x.fillText('for helping keep our planet clean and green', W / 2, 470);
  const chips = certChips(pickups, quizDays);
  x.font = font(800, 26);
  const cw = chips.map((ch) => x.measureText(ch.text).width + 56);
  let cx = W / 2 - (cw.reduce((a, v) => a + v, 0) + 24 * (chips.length - 1)) / 2;
  chips.forEach((ch, i) => {
    x.fillStyle = ch.bg;
    x.beginPath(); x.roundRect(cx, 510, cw[i], 56, 28); x.fill();
    x.fillStyle = ch.fg; x.fillText(ch.text, cx + cw[i] / 2, 548);
    cx += cw[i] + 24;
  });
  x.fillStyle = '#facc15'; x.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 26 : 60; const a = (Math.PI / 5) * i - Math.PI / 2; x.lineTo(W / 2 + r * Math.cos(a), 680 + r * Math.sin(a)); }
  x.closePath(); x.fill(); x.strokeStyle = '#f59e0b'; x.lineWidth = 3; x.stroke();
  x.textAlign = 'left'; x.fillStyle = '#64748b'; x.font = font(700, 22); x.fillText(`Children's Day, ${CERT_DATE}`, 110, 720);
  x.textAlign = 'right'; x.fillText('Team KarmaVer$e · karmaverse.earth', W - 110, 720);
  return new Promise((resolve) => c.toBlob((bl) => resolve(bl), 'image/png'));
}

// Once-per-user Children's Day greeting: balloons rise, the card pops in with the
// user's own Little Green Hero certificate to download or share, and a quiz nudge.
export function KidsGreetingModal({ visible, name, pickups, quizDays, onClose, onQuiz }: {
  visible: boolean; name: string; pickups: number; quizDays: number; onClose: () => void; onQuiz: () => void;
}) {
  ensureCss();
  const [note, setNote] = useState('');
  const fileName = 'little-green-hero.png';
  const shareText = `I'm a Little Green Hero on KarmaVer$e! Join me in keeping our planet clean and green.`;
  const url = 'https://karmaverse.earth';

  const download = async () => {
    const blob = await certificateBlob(name, pickups, quizDays);
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setNote('Certificate downloaded');
  };

  const share = async () => {
    try {
      const blob = await certificateBlob(name, pickups, quizDays);
      const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
      const nav: any = navigator;
      if (file && nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], text: `${shareText} ${url}` }); return; }
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`, '_blank', 'noopener');
    } catch { /* share sheet dismissed */ }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <KidsBalloons count={10} height={900} />
          <KidsConfetti count={24} fall={900} />
        </div>
        <div className="kvk-card-in" style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
          <LinearGradient colors={SKY} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={m.card}>
            <KidsBunting compact />
            <TouchableOpacity onPress={onClose} style={m.close} accessibilityLabel="Close">
              <X size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <Text style={m.greet}><KidsShimmerText text={`Happy Children's Day${name ? `, ${name}` : ''}!`} /></Text>
            <Text style={m.sub}>
              {pickups > 0
                ? `Thank you for ${pickups} eco ${pickups === 1 ? 'action' : 'actions'}. Here's your Little Green Hero certificate.`
                : "Here's your Little Green Hero certificate. Today, play the eco-quiz with your kids."}
            </Text>

            <View style={m.cert}>
              <KidsRainbowBorder />
              <Text style={m.certBrand}>KarmaVer$e</Text>
              <Text style={m.certTitle}><KidsShimmerText text="Little Green Hero" /></Text>
              <Text style={m.certSmall}>proudly presented to</Text>
              <Text style={m.certName} numberOfLines={1}>{shownName(name)}</Text>
              <View style={m.certChips}>
                {certChips(pickups, quizDays).map((ch) => (
                  <Text key={ch.text} style={[m.chip, { backgroundColor: ch.bg, color: ch.fg }]}>{ch.text}</Text>
                ))}
              </View>
              <Text style={m.certDate}>Children's Day, {CERT_DATE}</Text>
            </View>

            <View style={m.row}>
              <TouchableOpacity style={m.cta} onPress={download} activeOpacity={0.85}>
                <Download size={16} color="#4c1d95" />
                <Text style={m.ctaText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.cta} onPress={share} activeOpacity={0.85}>
                <Share2 size={16} color="#4c1d95" />
                <Text style={m.ctaText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.ctaAlt} onPress={onQuiz} activeOpacity={0.85}>
                <Gamepad2 size={16} color="#ffffff" />
                <Text style={m.ctaAltText}>Play quiz</Text>
              </TouchableOpacity>
            </View>
            {!!note && <Text style={m.note}>{note}</Text>}
          </LinearGradient>
        </div>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { borderRadius: 24, overflow: 'hidden', paddingHorizontal: 22, paddingTop: 50, paddingBottom: 22, alignItems: 'center' },
  close: { position: 'absolute', top: 40, right: 12, padding: 6 },
  greet: { fontSize: 25, fontWeight: '900', textAlign: 'center', marginBottom: 8, paddingHorizontal: 16 },
  sub: { color: 'rgba(255,255,255,0.9)', fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  cert: { width: '100%', backgroundColor: '#fffdf5', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', marginBottom: 16 },
  certBrand: { color: '#15803d', fontSize: 13, fontWeight: '900' },
  certTitle: { fontSize: 26, fontWeight: '900', marginTop: 2 },
  certSmall: { color: '#64748b', fontSize: 12.5, fontWeight: '600', marginTop: 6 },
  certName: { color: '#0f172a', fontSize: 22, fontWeight: '900', marginTop: 2, maxWidth: '100%' },
  certChips: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: { fontSize: 12.5, fontWeight: '800', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden' },
  certDate: { color: '#94a3b8', fontSize: 11.5, fontWeight: '700', marginTop: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fde68a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  ctaText: { color: '#4c1d95', fontSize: 14, fontWeight: '900' },
  ctaAlt: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  ctaAltText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  note: { color: '#fde68a', fontSize: 12.5, fontWeight: '700', marginTop: 10 },
});
