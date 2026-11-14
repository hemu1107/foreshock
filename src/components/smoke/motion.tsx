import { useEffect, useRef, useState } from 'react';
import { countAt } from '@/lib/display';

/** True when the visitor has asked the system to cut animation. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Fires once, the first time the element is scrolled into view. */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return { ref, inView };
}

/** Counts from 0 to `value` once `active` is true. Reduced motion jumps straight there. */
export function useCountUp(value: number, active: boolean, duration = 600) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion() || duration <= 0 || value === 0) { setShown(value); return; }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setShown(countAt(value, (now - start) / duration));
      if (now - start < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, value]);
  return shown;
}

/** A number that counts up the first time it is seen. */
export function CountUp({ value, duration = 600, className }: { value: number; duration?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const shown = useCountUp(value, inView, duration);
  return <span ref={ref} className={className}>{shown}</span>;
}
