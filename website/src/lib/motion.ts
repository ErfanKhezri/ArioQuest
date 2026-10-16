import type { Variants } from "motion/react";

export const ease = [0.16, 1, 0.3, 1] as const;

/** A section's parts rise in one after another: heading, text, then the fragment. */
export const group: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

/** Spread on an `m.*` element to play `group` once when it scrolls into view. */
export const inView = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, amount: 0.2 },
  variants: group,
} as const;

export const press = { whileHover: { y: -1 }, whileTap: { scale: 0.97 } } as const;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
