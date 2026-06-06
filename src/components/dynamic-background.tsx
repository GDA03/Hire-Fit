"use client";

import { motion, useReducedMotion } from "motion/react";

export function DynamicBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#F8F7FF]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#F8F7FF_0%,#F4F1FF_45%,#EEFDF7_100%)]" />
      <motion.div
        className="absolute -left-28 top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[#635BFF]/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, 44, 10, 0], y: [0, 26, 58, 0], scale: [1, 1.08, 0.98, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10rem] top-20 h-[30rem] w-[30rem] rounded-full bg-[#14B8A6]/18 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, -52, -28, 0], y: [0, 38, -8, 0], scale: [1, 0.96, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-12rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#A78BFA]/16 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, 38, -44, 0], y: [0, -44, -18, 0], scale: [1, 1.1, 1.02, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(255,255,255,0.46)_58%,rgba(255,255,255,0.82)_100%)]" />
    </div>
  );
}
