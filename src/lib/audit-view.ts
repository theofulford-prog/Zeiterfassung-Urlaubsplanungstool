// Welche Werte aus dem Änderungsprotokoll jemand sehen darf: Kostensatz nur mit Kostenrecht,
// Vergütung nur mit Personal-/Kostenrecht oder für die eigene Person. Sonst nur „geändert“.
import type { Changes } from "./audit-diff";

const COST_FIELDS = ["costRate"];
const PAY_FIELDS = ["payAmount", "payType"];

export function visibleChanges(changes: Changes, viewer: { showCosts: boolean; showPay: boolean }): Changes {
  const out: Changes = {};
  for (const [field, c] of Object.entries(changes)) {
    const hidden = (COST_FIELDS.includes(field) && !viewer.showCosts) || (PAY_FIELDS.includes(field) && !viewer.showPay);
    out[field] = hidden ? { changed: true } : c;
  }
  return out;
}
