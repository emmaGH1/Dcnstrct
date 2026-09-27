/**
 * scenarios.ts — canonical scenario definitions
 *
 * SOURCE_ALLOWLIST: packages/api/src/scenarios.ts
 *
 * The scenarioFingerprint is derived from the scenario definition content so
 * that recorded analyses can be invalidated when the scenario changes. It is
 * intentionally a short deterministic string, not a cryptographic hash, because
 * the threat model is drift detection, not security.
 */
import { Scenario, ScenarioId } from "@dcnstrct/shared";
import crypto from "crypto";

export const SCENARIOS: Scenario[] = [
  {
    id: "cancel_preparing",
    label: "Cancel a preparing order",
    description:
      "The order is still being assembled. Cancellation is accepted: the order is marked cancelled, a notification is persisted, and the fulfillment worker checks current state and skips shipment.",
    initialOrderStatus: "preparing",
  },
  {
    id: "cancel_shipped",
    label: "Cancel a shipped order",
    description:
      "The order has already left the warehouse. Cancellation is refused: order state and notifications are unchanged. The response explains the return boundary.",
    initialOrderStatus: "shipped",
  },
];

const SCENARIO_MAP = new Map(SCENARIOS.map((s) => [s.id, s]));

export function getScenario(id: ScenarioId): Scenario {
  const s = SCENARIO_MAP.get(id);
  if (!s) throw new Error(`Unknown scenario: ${id}`);
  return s;
}

/**
 * Fingerprint: stable hash of scenario id + initialOrderStatus.
 * Recorded analyses must match the fingerprint at replay time.
 */
export function scenarioFingerprint(scenarioId: ScenarioId): string {
  const s = getScenario(scenarioId);
  const content = JSON.stringify({ id: s.id, initialOrderStatus: s.initialOrderStatus });
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}

/** Source revision = short git SHA, or "dev" when unavailable */
export const SOURCE_REVISION: string = process.env.SOURCE_REVISION ?? "dev";
