import { useEffect, useRef, useState } from "react";

/**
 * ExecUI ambient background — ported from the design project
 * "Enterprise Software Background Animation" (ExecUI Background.dc.html).
 *
 * Four looping scenes (Flow · Orbit · Signal · Rise, 30s total): drifting color
 * blobs, flowing data streams with travelling pulses, orbiting rings, an arc
 * echo of the logo swoosh, and module chips (CRM, Marketing, Network Ops,
 * Operations, Management) that fade in and out per scene.
 *
 * Self-contained: the design harness's SceneStage/useScene is replaced with a
 * local rAF scene clock, and the stage is scaled to COVER its container. Honors
 * prefers-reduced-motion (renders a single static frame) and is decorative /
 * non-interactive (pointer-events: none).
 */

const SCENES = [
  { name: "Flow", dur: 8 },
  { name: "Orbit", dur: 7 },
  { name: "Signal", dur: 8 },
  { name: "Rise", dur: 7 },
];
const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);
const STAGE_W = 1280;
const STAGE_H = 720;

const THEMES = {
  dark: {
    bg: "linear-gradient(160deg,#0A1622 0%,#122A3E 55%,#0C1D2C 100%)",
    grid: "rgba(140,180,200,0.10)",
    blob1: "radial-gradient(circle, rgba(47,143,165,0.30), transparent 70%)",
    blob2: "radial-gradient(circle, rgba(201,162,39,0.15), transparent 70%)",
    blob3: "radial-gradient(circle, rgba(30,80,120,0.35), transparent 70%)",
    stream: "rgba(94,178,200,", gold: "rgba(212,175,55,",
    ring: "rgba(120,180,200,0.22)", ringDot: "#5FB6CC", ringDotGold: "#D4AF37",
    chipBg: "rgba(13,32,46,0.55)", chipBorder: "rgba(120,180,200,0.30)",
    chipText: "#DCE9F0", chipShadow: "0 8px 24px rgba(0,0,0,0.25)",
    accentBlue: "#5FB6CC", accentGold: "#D4AF37", arc: "rgba(95,182,204,0.35)",
    flat: "#0A1622",
  },
  light: {
    bg: "linear-gradient(160deg,#F6F9FB 0%,#E9F1F5 55%,#F2F6F8 100%)",
    grid: "rgba(22,50,74,0.09)",
    blob1: "radial-gradient(circle, rgba(47,143,165,0.16), transparent 70%)",
    blob2: "radial-gradient(circle, rgba(176,138,26,0.12), transparent 70%)",
    blob3: "radial-gradient(circle, rgba(22,50,74,0.10), transparent 70%)",
    stream: "rgba(29,111,143,", gold: "rgba(160,124,32,",
    ring: "rgba(22,50,74,0.16)", ringDot: "#1D6F8F", ringDotGold: "#A97E14",
    chipBg: "rgba(255,255,255,0.78)", chipBorder: "rgba(22,50,74,0.14)",
    chipText: "#16324A", chipShadow: "0 8px 24px rgba(22,50,74,0.10)",
    accentBlue: "#1D6F8F", accentGold: "#A97E14", arc: "rgba(29,111,143,0.30)",
    flat: "#F6F9FB",
  },
};

const ease = (t) => t * t * (3 - 2 * t);
// smooth fade window: 0 before a / after d, 1 between b and c
function fadeWin(p, a, b, c, d) {
  if (p <= a || p >= d) return 0;
  if (p < b) return ease((p - a) / (b - a));
  if (p > c) return 1 - ease((p - c) / (d - c));
  return 1;
}

const PATHS = [
  { d: "M -60 520 C 300 420 620 610 1340 430", k: "stream", op: 0.45, w: 1.6, pulses: [0.15, 0.62] },
  { d: "M -60 360 C 400 300 800 440 1340 300", k: "stream", op: 0.32, w: 1.3, pulses: [0.4] },
  { d: "M -60 630 C 350 570 700 690 1340 560", k: "stream", op: 0.25, w: 1.2, pulses: [0.8] },
  { d: "M -60 240 C 420 180 760 300 1340 170", k: "gold", op: 0.4, w: 1.4, pulses: [0.3, 0.75] },
];
const DASH = 18; // dash period (3 dash + 15 gap)

function Streams({ p, th }) {
  const off = -DASH * 20 * p; // 20 whole periods per scene → ends match
  return (
    <>
      <svg width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} style={{ position: "absolute", inset: 0 }}>
        {PATHS.map((pa, i) => (
          <path key={i} d={pa.d} fill="none" stroke={`${th[pa.k]}${pa.op})`} strokeWidth={pa.w}
            strokeDasharray="3 15" strokeDashoffset={off} strokeLinecap="round" />
        ))}
      </svg>
      {PATHS.map((pa, i) =>
        pa.pulses.map((ph, j) => {
          const dist = ((p * 2 + ph) % 1) * 100; // 2 whole laps per scene
          const col = pa.k === "gold" ? th.ringDotGold : th.ringDot;
          return (
            <div key={`${i}-${j}`} style={{
              position: "absolute", left: 0, top: 0, width: 7, height: 7, borderRadius: "50%",
              background: col, boxShadow: `0 0 12px 3px ${th[pa.k]}0.55)`,
              offsetPath: `path("${pa.d}")`, offsetDistance: `${dist}%`, offsetRotate: "0deg",
            }} />
          );
        })
      )}
    </>
  );
}

function Orbits({ p, th }) {
  const rings = [
    { r: 78, turns: 2, dots: [{ a: 0, g: false }, { a: 150, g: true }] },
    { r: 128, turns: -1, dots: [{ a: 60, g: false }, { a: 200, g: false }] },
    { r: 182, turns: 1, dots: [{ a: 320, g: true }] },
  ];
  return (
    <div style={{ position: "absolute", left: 930, top: 280, width: 0, height: 0 }}>
      {rings.map((rg, i) => (
        <div key={`r${i}`} style={{
          position: "absolute", left: -rg.r, top: -rg.r, width: rg.r * 2, height: rg.r * 2,
          borderRadius: "50%", border: `1px solid ${th.ring}`,
        }} />
      ))}
      {rings.map((rg, i) =>
        rg.dots.map((d, j) => {
          const ang = d.a + 360 * rg.turns * p;
          return (
            <div key={`d${i}${j}`} style={{
              position: "absolute", left: -3, top: -3, width: 6, height: 6, borderRadius: "50%",
              background: d.g ? th.ringDotGold : th.ringDot,
              boxShadow: `0 0 10px 2px ${d.g ? th.gold : th.stream}0.5)`,
              transform: `rotate(${ang}deg) translateY(${-rg.r}px)`,
            }} />
          );
        })
      )}
      <div style={{
        position: "absolute", left: -26, top: -26, width: 52, height: 52,
        border: `1.5px solid ${th.ring}`, transform: `rotate(${45 + 360 * p}deg)`,
      }} />
      <div style={{
        position: "absolute", left: -5, top: -5, width: 10, height: 10, borderRadius: "50%",
        background: th.ringDotGold, boxShadow: `0 0 16px 4px ${th.gold}0.5)`,
      }} />
    </div>
  );
}

function Glyph({ kind, th }) {
  const b = th.accentBlue, g = th.accentGold;
  const s = { position: "relative", width: 20, height: 20, flex: "0 0 auto" };
  if (kind === "crm") return (
    <div style={s}>
      <div style={{ position: "absolute", left: 1, top: 3, width: 11, height: 11, borderRadius: "50%", border: `1.5px solid ${b}` }} />
      <div style={{ position: "absolute", right: 0, bottom: 2, width: 11, height: 11, borderRadius: "50%", background: g }} />
    </div>);
  if (kind === "bars") return (
    <div style={{ ...s, display: "flex", alignItems: "flex-end", gap: 3, justifyContent: "center" }}>
      <div style={{ width: 4, height: 8, background: b, borderRadius: 1 }} />
      <div style={{ width: 4, height: 13, background: g, borderRadius: 1 }} />
      <div style={{ width: 4, height: 17, background: b, borderRadius: 1 }} />
    </div>);
  if (kind === "net") return (
    <div style={s}>
      <div style={{ position: "absolute", left: 7, top: 7, width: 6, height: 6, borderRadius: "50%", background: g }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: 5, height: 5, borderRadius: "50%", border: `1.5px solid ${b}` }} />
      <div style={{ position: "absolute", right: 0, top: 2, width: 5, height: 5, borderRadius: "50%", border: `1.5px solid ${b}` }} />
      <div style={{ position: "absolute", left: 3, bottom: 0, width: 5, height: 5, borderRadius: "50%", border: `1.5px solid ${b}` }} />
    </div>);
  if (kind === "ops") return (
    <div style={s}>
      <div style={{ position: "absolute", left: 4, top: 4, width: 12, height: 12, border: `1.5px solid ${b}`, transform: "rotate(45deg)" }} />
      <div style={{ position: "absolute", left: 8.5, top: 8.5, width: 3, height: 3, borderRadius: "50%", background: g }} />
    </div>);
  return ( // mgmt — rising chevron
    <div style={s}>
      <div style={{ position: "absolute", left: 2, top: 11, width: 10, height: 2, background: b, transform: "rotate(-35deg)", borderRadius: 1 }} />
      <div style={{ position: "absolute", left: 9, top: 8, width: 9, height: 2, background: g, transform: "rotate(35deg)", borderRadius: 1 }} />
    </div>);
}

function Chip({ c, p, th }) {
  const [a, b, cc, d] = c.w;
  const o = fadeWin(p, a, b, cc, d);
  if (o <= 0) return null;
  const rise = (1 - Math.min(1, Math.max(0, (p - a) / (d - a)))) * 16 - 8;
  const sm = c.size === "sm";
  return (
    <div style={{
      position: "absolute", left: c.x, top: c.y, opacity: o, transform: `translateY(${rise}px)`,
      display: "flex", alignItems: "center", gap: sm ? 8 : 10,
      padding: sm ? "7px 13px" : "10px 16px", borderRadius: 999,
      background: th.chipBg, border: `1px solid ${th.chipBorder}`,
      backdropFilter: "blur(6px)", boxShadow: th.chipShadow,
    }}>
      <Glyph kind={c.g} th={th} />
      <span style={{
        font: `600 ${sm ? 12 : 14}px/1 'Helvetica Neue', Helvetica, Arial, sans-serif`,
        letterSpacing: "0.09em", textTransform: "uppercase", color: th.chipText, whiteSpace: "nowrap",
      }}>{c.label}</span>
    </div>
  );
}

const CHIPS = {
  Flow: [
    { label: "CRM", g: "crm", x: 330, y: 430, w: [0.08, 0.2, 0.72, 0.9] },
    { label: "Marketing", g: "bars", x: 700, y: 555, w: [0.24, 0.36, 0.78, 0.94] },
  ],
  Orbit: [
    { label: "Network Ops", g: "net", x: 640, y: 250, w: [0.1, 0.24, 0.74, 0.92] },
  ],
  Signal: [
    { label: "Operations", g: "ops", x: 380, y: 300, w: [0.08, 0.2, 0.72, 0.9] },
    { label: "Management", g: "mgmt", x: 820, y: 500, w: [0.24, 0.36, 0.78, 0.94] },
  ],
  Rise: [
    { label: "CRM", g: "crm", x: 150, y: 575, size: "sm", w: [0.06, 0.18, 0.78, 0.94] },
    { label: "Marketing", g: "bars", x: 320, y: 548, size: "sm", w: [0.11, 0.23, 0.78, 0.94] },
    { label: "Network Ops", g: "net", x: 545, y: 532, size: "sm", w: [0.16, 0.28, 0.78, 0.94] },
    { label: "Operations", g: "ops", x: 795, y: 548, size: "sm", w: [0.21, 0.33, 0.78, 0.94] },
    { label: "Management", g: "mgmt", x: 1010, y: 575, size: "sm", w: [0.26, 0.38, 0.78, 0.94] },
  ],
};

// One rendered frame of a scene (blobs, streams, orbits, arc, chips).
function Ambient({ sceneName, index, p, th, showModules }) {
  const s2 = (f) => Math.sin(Math.PI * 2 * (f * p)); // integer f → 0 at both ends (seamless loop)
  const camScale = 1 + 0.014 * Math.sin(Math.PI * 2 * p) * (index % 2 === 0 ? 1 : -1);
  const camX = 8 * Math.sin(Math.PI * 2 * p) * (index % 2 === 0 ? -1 : 1);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: th.bg }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(circle, ${th.grid} 1px, transparent 1.5px)`,
        backgroundSize: "30px 30px", opacity: 0.7,
      }} />
      <div style={{ position: "absolute", inset: -40, transform: `scale(${camScale}) translateX(${camX}px)` }}>
        <div style={{
          position: "absolute", left: 90, top: 60, width: 620, height: 620, borderRadius: "50%",
          background: th.blob1, filter: "blur(30px)", transform: `translate(${40 * s2(1)}px, ${26 * s2(2)}px)`,
        }} />
        <div style={{
          position: "absolute", left: 760, top: -140, width: 560, height: 560, borderRadius: "50%",
          background: th.blob2, filter: "blur(30px)", transform: `translate(${-34 * s2(1)}px, ${30 * s2(1)}px)`,
        }} />
        <div style={{
          position: "absolute", left: 480, top: 340, width: 700, height: 700, borderRadius: "50%",
          background: th.blob3, filter: "blur(36px)", transform: `translate(${28 * s2(2)}px, ${-24 * s2(1)}px)`,
        }} />
        <Streams p={p} th={th} />
        <Orbits p={p} th={th} />
        {/* arc echo of the logo swoosh */}
        <div style={{
          position: "absolute", left: -280, top: 655, width: 1840, height: 1500,
          borderRadius: "50%", borderTop: `2px solid ${th.arc}`,
          boxShadow: `0 -8px 30px -6px ${th.stream}0.25)`,
        }} />
        {showModules && (CHIPS[sceneName] || []).map((c, i) => <Chip key={i} c={c} p={p} th={th} />)}
      </div>
    </div>
  );
}

function useIsDark(theme) {
  const [dark, setDark] = useState(() =>
    theme === "auto" ? (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) : theme === "dark"
  );
  useEffect(() => {
    if (theme !== "auto") { setDark(theme === "dark"); return; }
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [theme]);
  return dark;
}

export default function ExecUIBackground({ theme = "auto", showModules = true, className = "", style }) {
  const dark = useIsDark(theme);
  const th = dark ? THEMES.dark : THEMES.light;

  const prefersReduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Scene clock (rAF). Reduced-motion → a single static frame.
  const [frame, setFrame] = useState({ index: 0, name: "Flow", p: 0 });
  useEffect(() => {
    if (prefersReduced) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      let t = ((now - start) / 1000) % TOTAL;
      let idx = 0;
      for (; idx < SCENES.length; idx++) { if (t < SCENES[idx].dur) break; t -= SCENES[idx].dur; }
      if (idx >= SCENES.length) { idx = SCENES.length - 1; t = SCENES[idx].dur; }
      setFrame({ index: idx, name: SCENES[idx].name, p: t / SCENES[idx].dur });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefersReduced]);

  // Scale the fixed 1280×720 stage to COVER the container.
  const wrapRef = useRef(null);
  const [cover, setCover] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width && height) setCover(Math.max(width / STAGE_W, height / STAGE_H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", background: th.flat, ...style }}
    >
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        width: STAGE_W, height: STAGE_H,
        transform: `translate(-50%,-50%) scale(${cover})`, transformOrigin: "center",
      }}>
        <Ambient sceneName={frame.name} index={frame.index} p={frame.p} th={th} showModules={showModules} />
      </div>
    </div>
  );
}
