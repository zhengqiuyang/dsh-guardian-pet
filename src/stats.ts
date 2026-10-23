/**
 * Pure state mapping and weekly-battle-report statistics over the trust
 * family's aggregated events. No filesystem, no harness — fully testable.
 */
import type { PanelSummary, TrustEvent } from 'dsh-trust-panel/lib/types.js';

/** What the pet is doing right now. */
export type PetState = 'sleeping' | 'alert' | 'guarding';

/** Reaction bubble for the most recent interesting event. */
export interface PetReaction {
  key: string;
  /** Event time the reaction was triggered by (client uses it to fade out). */
  since: string;
}

export function petStateOf(summary: PanelSummary): PetState {
  if (summary.status === 'attention') return 'guarding';
  if (summary.status === 'activity') return 'alert';
  return 'sleeping';
}

const REACTION_BY_CHANNEL: Record<string, string> = {
  read: 'reaction.read',
  write: 'reaction.write',
  egress: 'reaction.egress',
  memory: 'reaction.memory',
  toolsurface: 'reaction.tools',
  prompt: 'reaction.prompt',
  composition: 'reaction.composition',
  leave: 'reaction.leave',
  custody: 'reaction.custody',
};

export function reactionFor(events: TrustEvent[]): PetReaction | null {
  if (events.length === 0) return null;
  const latest = events[0];
  const key = REACTION_BY_CHANNEL[latest.channel];
  if (key === undefined) return null;
  return { key, since: latest.time };
}

export interface WeeklyStats {
  /** injection attempts quarantined (read channel) */
  quarantined: number;
  /** out-of-scope writes blocked (write channel, denied) */
  writesBlocked: number;
  /** egress destinations blocked (egress channel) */
  egressBlocked: number;
  /** forgotten constraints recovered (memory channel) */
  recovered: number;
  /** custody chain verifications passed (custody channel) */
  verified: number;
  /** events total in window */
  total: number;
  /** window start (ISO) */
  since: string;
}

/** Count the battle-report numbers over the last `days` days. */
export function weeklyStats(events: TrustEvent[], days = 7, now = new Date()): WeeklyStats {
  const since = new Date(now.getTime() - days * 86400_000);
  const window = events.filter((e) => Date.parse(e.time) >= since.getTime());
  const stats: WeeklyStats = {
    quarantined: 0,
    writesBlocked: 0,
    egressBlocked: 0,
    recovered: 0,
    verified: 0,
    total: window.length,
    since: since.toISOString(),
  };
  for (const ev of window) {
    if (ev.channel === 'read' && ev.outcome === 'handled') stats.quarantined += 1;
    if (ev.channel === 'write' && ev.outcome === 'handled') stats.writesBlocked += 1;
    if (ev.channel === 'egress') stats.egressBlocked += 1;
    if (ev.channel === 'memory') stats.recovered += 1;
    if (ev.channel === 'custody' && ev.outcome === 'handled') stats.verified += 1;
  }
  return stats;
}

export interface GuardianState {
  status: PanelSummary['status'];
  petState: PetState;
  reaction: PetReaction | null;
  weekly: WeeklyStats;
  generatedAt: string;
}
