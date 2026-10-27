export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const percent = (value: number, max: number) => (max <= 0 ? 0 : Math.round((clamp(value, 0, max) / max) * 100));

export const GAUGE_R = 44;
export const GAUGE_C = 2 * Math.PI * GAUGE_R;
export const gaugeOffset = (value: number, max: number) => GAUGE_C * (1 - clamp(value, 0, max) / (max || 1));

/** Point on a radar axis. Axis 0 points up; f is 0..1 of the radius. */
export function radarPoint(i: number, n: number, f: number, c = 120, R = 78): [number, number] {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [c + Math.cos(a) * R * f, c + Math.sin(a) * R * f];
}

export function segmentsOn(value: number, max: number, n: number) {
  return max <= 0 ? 0 : Math.round((clamp(value, 0, max) / max) * n);
}
