// Carbon-saver levels, keyed by lifetime kg CO₂e saved. Mirrors streakTiers:
// the backend may send the level name; otherwise the app derives it here.
export interface CarbonLevel {
  level: number;
  name: string;
  minKg: number;
  range: string;
  color: string;
  bg: string;
}

export const CARBON_LEVELS: CarbonLevel[] = [
  { level: 1, name: 'Sprout', minKg: 0, range: '0–50 kg', color: '#65a30d', bg: '#f7fee7' },
  { level: 2, name: 'Seedling', minKg: 50, range: '50–200 kg', color: '#16a34a', bg: '#f0fdf4' },
  { level: 3, name: 'Sapling', minKg: 200, range: '200–500 kg', color: '#0ea5e9', bg: '#f0f9ff' },
  { level: 4, name: 'Tree', minKg: 500, range: '500–1,000 kg', color: '#7c3aed', bg: '#f5f3ff' },
  { level: 5, name: 'Forest', minKg: 1000, range: '1,000+ kg', color: '#d97706', bg: '#fffbeb' },
];

export function carbonLevelFor(totalSavedKg: number, name?: string | null): CarbonLevel {
  const byName = name ? CARBON_LEVELS.find((l) => l.name.toLowerCase() === name.toLowerCase()) : undefined;
  if (byName) return byName;
  let current = CARBON_LEVELS[0];
  for (const l of CARBON_LEVELS) if (totalSavedKg >= l.minKg) current = l;
  return current;
}

export function formatKg(kg: number): string {
  return kg.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
