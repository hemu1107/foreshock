/**
 * Value shown at progress `t` (0..1) of a count-up.
 * The animation always lands exactly on the real number — it never leaves a
 * placeholder like 0 on screen once it has finished.
 */
export function countAt(value: number, t: number) {
  const p = Math.min(1, Math.max(0, t));
  return Math.round(value * (1 - Math.pow(1 - p, 3)));
}
