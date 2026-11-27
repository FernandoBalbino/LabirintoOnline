// Gerador pseudoaleatório determinístico (mulberry32) com semente textual.
const hashSeed = (seed) => {
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
};

export function createRandom(seed) {
  let state = hashSeed(seed);
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (max) => Math.floor(next() * max);
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.shuffle = (list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  return next;
}
