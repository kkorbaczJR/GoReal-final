"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  to: number;
  /** Starting value for the first run; later changes tick from the current value. */
  from?: number;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
};

/** A number that ticks up to its value, Strava-style. */
export default function CountUp({ to, from = 0, duration = 900, delay = 0, format = String }: Props) {
  const [v, setV] = useState(from);
  const current = useRef(from);

  useEffect(() => {
    let raf = 0;
    const start = current.current;
    const timer = setTimeout(() => {
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const next = Math.round(start + (to - start) * (1 - Math.pow(1 - p, 3)));
        current.current = next;
        setV(next);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, duration, delay]);

  return <>{format(v)}</>;
}
