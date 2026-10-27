export function createLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return function allow(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    hits.set(key, [...recent, now]);
    return true;
  };
}
