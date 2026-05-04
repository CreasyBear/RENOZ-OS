export const ALERT_RULES_UNAVAILABLE_TITLE = "Inventory alert rules are temporarily unavailable.";
export const ALERT_RULES_UNAVAILABLE_MESSAGE =
  "Inventory alert rules are temporarily unavailable. Please refresh and try again.";

export function getAlertRulesReadErrorMessage(error: unknown): string | null {
  return error ? ALERT_RULES_UNAVAILABLE_MESSAGE : null;
}
