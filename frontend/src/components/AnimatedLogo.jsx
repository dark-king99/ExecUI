/**
 * AnimatedLogo — the ExecUI wordmark, animated.
 *
 * The logo is a raster PNG, so rather than risk re-drawing the mark we keep the
 * real image and animate a light sweep confined to its exact silhouette: the
 * PNG is used as a CSS mask on an overlay whose bright diagonal gradient scrolls
 * across (see .animate-logo-sheen in App.css). Optionally bobs gently (float).
 *
 * Set the size via `className` height (e.g. "h-8"); width follows the aspect.
 */
export default function AnimatedLogo({
  src = "/execui-logo.png",
  alt = "ExecUI",
  className = "h-8",
  float = false,
  sheen = "rgba(255,255,255,0.72)",
}) {
  const mask = {
    WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
    WebkitMaskSize: "contain", maskSize: "contain",
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
    WebkitMaskPosition: "center", maskPosition: "center",
  };
  return (
    <span className={`relative inline-block align-middle ${float ? "animate-logo-float" : ""} ${className}`}>
      <img src={src} alt={alt} draggable="false" className="block h-full w-auto select-none" />
      {/* Light sweep, clipped to the logo shape. Decorative. */}
      <span
        aria-hidden="true"
        className="animate-logo-sheen pointer-events-none absolute inset-0"
        style={{
          ...mask,
          backgroundImage: `linear-gradient(105deg, transparent 40%, ${sheen} 50%, transparent 60%)`,
          backgroundSize: "250% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />
    </span>
  );
}
