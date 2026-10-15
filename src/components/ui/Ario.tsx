import { cn } from "@/lib/cn";

export type ArioMood =
  "idle" | "happy" | "curious" | "thinking" | "shy" | "sad" | "error" | "sleepy";

interface ArioProps {
  mood?: ArioMood;
  size?: number;
  /**
   * One-off or looping motion, only used on the sign-in screen:
   * "idle" floats and blinks, "error" shakes once, "happy" hops once.
   */
  animate?: "idle" | "error" | "happy";
  /** Accessible name; Ario is decorative unless one is given. */
  label?: string;
  className?: string;
}

const dot = (cx: number, cy: number) => (
  <circle cx={cx} cy={cy} r="1.25" fill="currentColor" stroke="none" />
);

function Eyes({ mood }: { mood: ArioMood }) {
  switch (mood) {
    case "happy":
      // ^ ^
      return <path d="M11 16.2q1.5-2 3 0M18 16.2q1.5-2 3 0" />;
    case "shy":
    case "sleepy":
      return <path d="M11 15.8h3M18 15.8h3" />;
    case "error":
      return (
        <path d="M11.3 14.3l2.4 2.4M13.7 14.3l-2.4 2.4M18.3 14.3l2.4 2.4M20.7 14.3l-2.4 2.4" />
      );
    case "curious":
      // Looking to the right, towards whatever caught Ario's attention.
      return (
        <>
          {dot(13.7, 15.5)}
          {dot(20.7, 15.5)}
        </>
      );
    case "thinking":
      return (
        <>
          {dot(13.3, 14.5)}
          {dot(20.3, 14.5)}
        </>
      );
    default:
      return (
        <>
          {dot(12.5, 15.5)}
          {dot(19.5, 15.5)}
        </>
      );
  }
}

const mouths: Record<ArioMood, string> = {
  idle: "M13.5 19c1.5 1.2 3.5 1.2 5 0",
  happy: "M12.8 18.6c1.7 2.4 4.7 2.4 6.4 0z",
  curious: "M15.2 19.6a.8.8 0 1 0 1.6 0a.8.8 0 1 0-1.6 0",
  thinking: "M14 19.5h4",
  shy: "M14 19.2c1.2.8 2.8.8 4 0",
  sad: "M13.5 20c1.5-1.2 3.5-1.2 5 0",
  error: "M13 19.8q1-1 2 0t2 0 2 0",
  sleepy: "M14.5 19.5h3",
};

/**
 * Ario, ArioQuest's character and symbol. She shows the app's mood: happy on
 * a 2xx, sad on a 4xx, an error face on 5xx or network failures, and so on.
 * Static by default; color comes from the caller (`text-*`).
 */
export function Ario({ mood = "idle", size = 32, animate, label, className }: ArioProps) {
  const looping = animate === "idle";
  const worried = mood === "sad" || mood === "error";
  // SVG parts animate around their own box.
  const part = "[transform-box:fill-box]";

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
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "shrink-0 text-subtle",
        looping && "animate-mascot-float",
        animate === "error" && "animate-mascot-shake",
        animate === "happy" && "animate-mascot-hop",
        className,
      )}
    >
      {/* antenna: the ball glows while Ario is thinking */}
      <g className={cn(looping && `origin-bottom animate-mascot-antenna ${part}`)}>
        <path d="M16 7V4" />
        <circle
          cx="16"
          cy="3"
          r={mood === "thinking" ? 1.5 : 1}
          fill="currentColor"
          stroke="none"
        />
      </g>
      {/* head */}
      <rect x="6" y="7" width="20" height="16" rx="6" />
      {/* visor, or worried brows */}
      {worried ? (
        <path d="M10.8 13.4l2.6-.9M21.2 13.4l-2.6-.9" />
      ) : (
        <path d="M10 13h12" opacity={0.4} />
      )}
      <g className={cn(looping && mood === "idle" && `origin-center animate-mascot-blink ${part}`)}>
        <Eyes mood={mood} />
      </g>
      <path d={mouths[mood]} />
      {mood === "sleepy" && <path d="M24 5h2.5L24 8h2.5" strokeWidth={1.2} />}
      {/* feet */}
      <path d="M11 23v3M21 23v3" />
    </svg>
  );
}
