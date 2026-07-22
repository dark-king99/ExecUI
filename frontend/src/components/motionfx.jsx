/**
 * Motion FX kit — shared animation primitives built on Motion for React
 * (motion.dev) plus the CSS keyframes in styles/App.css.
 *
 *   <MeshGradient/>      full-bleed animated "color video" backdrop
 *   <FadeUp/>            scroll-reveal (viewport-triggered, springy)
 *   <Stagger/>+<Item/>   parent/child staggered reveals
 *   <AnimatedNumber/>    counts up when scrolled into view
 *   <TiltCard/>          pointer-tracking 3D tilt with glare
 *   <Marquee/>           infinite horizontal loop (pauses on hover)
 *
 * Everything respects prefers-reduced-motion.
 */
import { useRef, useEffect, useState } from "react";
import { useReducedMotion, useInView, animate, useMotionValue, useSpring, useTransform } from "motion/react";

// ── Animated mesh gradient — the "color video" backdrop ──────────────────────
// Three drifting, blurred, hue-cycling blobs. Pure CSS animation (GPU-cheap);
// `intensity` scales opacity so it works as a hero wash or a subtle card tint.
export function MeshGradient({ className = "", intensity = 1, hue = true }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${hue ? "mesh-hue" : ""} ${className}`}>
      <div className="mesh-blob mesh-1 left-[-10%] top-[-20%] h-[55%] w-[55%] bg-indigo-500" style={{ opacity: 0.32 * intensity }} />
      <div className="mesh-blob mesh-2 right-[-8%] top-[10%] h-[50%] w-[50%] bg-fuchsia-500" style={{ opacity: 0.26 * intensity }} />
      <div className="mesh-blob mesh-3 bottom-[-25%] left-[25%] h-[60%] w-[60%] bg-sky-400" style={{ opacity: 0.28 * intensity }} />
    </div>
  );
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
export function FadeUp({ children, className = "", delay = 0, y = 28, once = true }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(3px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, amount: 0.25, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Staggered container / items ───────────────────────────────────────────────
export function Stagger({ children, className = "", gap = 0.08, delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function Item({ children, className = "", y = 24 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? {} : { opacity: 0, y, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Count-up number, triggered in view ────────────────────────────────────────
export function AnimatedNumber({ value, suffix = "", prefix = "", className = "", duration = 1.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) { setDisplay(value); return; }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return <span ref={ref} className={className}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ── 3D tilt card with glare ───────────────────────────────────────────────────
export function TiltCard({ children, className = "", max = 8 }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 200, damping: 20 });
  // All hooks run unconditionally (before any early return) — rules of hooks.
  const glare = useTransform(
    [mx, my],
    ([x, y]) => `radial-gradient(320px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.14), transparent 55%)`
  );

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { mx.set(0.5); my.set(0.5); };

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={`relative [transform-style:preserve-3d] ${className}`}
      style={{ rotateX: rx, rotateY: ry, perspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      whileHover={{ scale: 1.015 }}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 hover:opacity-100"
        style={{ background: glare }}
      />
    </motion.div>
  );
}

// ── Infinite marquee (duplicated children; pauses on hover) ───────────────────
export function Marquee({ children, className = "", duration = 40, reverse = false }) {
  return (
    <div className={`marquee-mask overflow-hidden ${className}`}>
      <div
        className="animate-marquee flex w-max items-center gap-3 hover:[animation-play-state:paused]"
        style={{ "--marquee-duration": `${duration}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
