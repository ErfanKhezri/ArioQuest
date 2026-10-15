import { cn } from "@/lib/cn";

/**
 * "Ario", a small explorer shown in empty states and next to error messages.
 * Static by default; only the sign-in screen passes `animate`.
 */
export function Mascot({
  mood = "idle",
  size = 32,
  animate,
  className,
}: {
  mood?: "idle" | "sad";
  size?: number;
  /** "idle": float, blink and wiggle the antenna. "error": shake once, look sad. */
  animate?: "idle" | "error";
  className?: string;
}) {
  const idle = animate === "idle";
  if (animate === "error") mood = "sad";
  // SVG parts animate around their own center.
  const part = "origin-center [transform-box:fill-box]";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        "shrink-0 text-subtle",
        idle && "animate-mascot-float",
        animate === "error" && "animate-mascot-shake",
        className,
      )}
    >
      {/* antenna */}
      <g className={cn(idle && "origin-bottom animate-mascot-antenna [transform-box:fill-box]")}>
        <path d="M16 7V4" />
        <circle cx="16" cy="3" r="1" fill="currentColor" stroke="none" />
      </g>
      {/* head */}
      <rect x="6" y="7" width="20" height="16" rx="6" />
      {/* visor */}
      <path d="M10 13h12" opacity={0.4} />
      <g className={cn(idle && `animate-mascot-blink ${part}`)}>
        <circle cx="12.5" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="19.5" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
      </g>
      {mood === "sad" ? (
        <path d="M13.5 20c1.5-1.2 3.5-1.2 5 0" />
      ) : (
        <path d="M13.5 19c1.5 1.2 3.5 1.2 5 0" />
      )}
      {/* feet */}
      <path d="M11 23v3M21 23v3" />
    </svg>
  );
}
