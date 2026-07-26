// Launch day — the app goes live 2026-07-26, celebration runs that calendar day only.
const LAUNCH_DAY_START = new Date('2026-07-26T00:00:00');
const LAUNCH_DAY_END = new Date(LAUNCH_DAY_START.getTime() + 24 * 60 * 60 * 1000);

export function isLaunchDay(now: Date = new Date()): boolean {
  return now >= LAUNCH_DAY_START && now < LAUNCH_DAY_END;
}
