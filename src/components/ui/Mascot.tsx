import { cn } from "@/lib/cn";

/**
 * "Ario", a small explorer used only in empty states and next to error
 * messages. Static on purpose: no animation.
 */
export function Mascot({
  mood = "idle",
  size = 32,
  className,
}: {
  mood?: "idle" | "sad";
  size?: number;
  className?: string;
}) {
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
      className={cn("shrink-0 text-subtle", className)}
    >
      {/* antenna */}
      <path d="M16 7V4" />
      <circle cx="16" cy="3" r="1" fill="currentColor" stroke="none" />
      {/* head */}
      <rect x="6" y="7" width="20" height="16" rx="6" />
      {/* visor */}
      <path d="M10 13h12" opacity={0.4} />
      <circle cx="12.5" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
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
