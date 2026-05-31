"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number | null;
  className?: string;
  duration?: number;
}

export function AnimatedScore({ value, className = "", duration = 800 }: Props) {
  const [display, setDisplay] = useState(value ?? 0);
  const prevRef = useRef(value ?? 0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) return;

    const from = prevRef.current;
    const to = value;
    const diff = to - from;
    if (diff === 0) return;

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * eased);
      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const color =
    display >= 75
      ? "text-emerald-400"
      : display >= 50
        ? "text-amber-400"
        : "text-red-400";

  return (
    <span className={`${color} ${className} tabular-nums`}>
      {value === null ? "—" : display}
    </span>
  );
}
