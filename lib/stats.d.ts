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
export declare function petStateOf(summary: PanelSummary): PetState;
export declare function reactionFor(events: TrustEvent[]): PetReaction | null;
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
export declare function weeklyStats(events: TrustEvent[], days?: number, now?: Date): WeeklyStats;
export interface GuardianState {
    status: PanelSummary['status'];
    petState: PetState;
    reaction: PetReaction | null;
    weekly: WeeklyStats;
    generatedAt: string;
}
