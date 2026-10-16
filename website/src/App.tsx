import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { lazy, Suspense } from "react";
import { Hero } from "./sections/Hero";
import { Nav } from "./sections/Nav";

// Everything below the first screen loads after it.
const Protocols = lazy(() => import("./sections/Protocols"));
const Testing = lazy(() => import("./sections/Testing"));
const Runner = lazy(() => import("./sections/Runner"));
const Import = lazy(() => import("./sections/Import"));
const Keyboard = lazy(() => import("./sections/Keyboard"));
const Moods = lazy(() => import("./sections/Moods"));
const FinalCta = lazy(() => import("./sections/FinalCta"));
const Footer = lazy(() => import("./sections/Footer"));

export function App() {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <Nav />
        <main>
          <Hero />
          <Suspense fallback={<div className="h-svh" />}>
            <Protocols />
            <Testing />
            <Runner />
            <Import />
            <Keyboard />
            <Moods />
            <FinalCta />
          </Suspense>
        </main>
        <Suspense>
          <Footer />
        </Suspense>
      </MotionConfig>
    </LazyMotion>
  );
}
