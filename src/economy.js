export const RESOURCE_LIMIT = 99_999;

const RESOURCE_KEYS = ["credits", "alloys", "food", "fuel", "influence", "science"];

/** Apply a resource change while keeping every stock within the save format's bounds. */
export function applyResourceChanges(resources, changes) {
  const applied = {};
  for (const key of RESOURCE_KEYS) {
    if (!Object.hasOwn(changes, key)) continue;
    const before = Number.isFinite(resources[key]) ? resources[key] : 0;
    const after = Math.max(0, Math.min(RESOURCE_LIMIT, before + changes[key]));
    resources[key] = after;
    applied[key] = after - before;
  }
  return applied;
}
