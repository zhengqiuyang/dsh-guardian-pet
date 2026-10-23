// Structural declarations for dsh-trust-panel's published surface (its npm
// package ships lib/ without .d.ts resolution from external consumers).
declare module 'dsh-trust-panel/lib/types.js' {
  export type Channel =
    | 'read' | 'write' | 'custody' | 'toolsurface' | 'leave'
    | 'egress' | 'prompt' | 'composition' | 'memory';
  export type Outcome = 'handled' | 'attention';
  export interface TrustEvent {
    key?: string;
    time: string;
    channel: Channel;
    outcome: Outcome;
    titleKey: string;
    titleParams?: Record<string, string | number>;
    title: string;
    detailKey?: string;
    detailParams?: Record<string, string | number>;
    detail?: string;
    evidence?: string;
    source: string;
  }
  export interface ChannelStatus {
    channel: Channel;
    present: boolean;
    labelKey: string;
    label: string;
    noteKey: string;
    noteParams?: Record<string, string | number>;
    note: string;
    count: number;
  }
  export interface PanelSummary {
    status: 'ok' | 'activity' | 'attention';
    statusText: string;
    generatedAt: string;
    channels: ChannelStatus[];
    events: TrustEvent[];
  }
}
declare module 'dsh-trust-panel/lib/aggregate.js' {
  import type { PanelSummary, TrustEvent } from 'dsh-trust-panel/lib/types.js';
  import type { ToolSurfaceSnapshot } from 'dsh-mcp-test/lib/diff.js';
  export interface AggregatePaths {
    cwd: string;
    prGateLedger: string;
    attestLedger: string;
    attestKeysDir: string;
    compactionLedger: string;
    mcpBaseline: string;
    promptBaseline: string;
    freezeBaseline: string;
  }
  export const DEFAULT_PATHS: Omit<AggregatePaths, 'cwd'>;
  export function aggregate(
    paths: AggregatePaths,
    liveEvents: TrustEvent[],
    currentSnapshot: ToolSurfaceSnapshot | null
  ): Promise<PanelSummary>;
}
declare module 'dsh-trust-panel/lib/translate.js' {
  import type { TrustEvent } from 'dsh-trust-panel/lib/types.js';
  export function readFindingEvent(ruleId: string, severity: string, evidence: string, toolName: string, source?: string): TrustEvent;
  export function prGateEvent(line: { time: string; tool: string; action: 'written' | 'denied'; path?: string; matchedBy?: string; residueKinds?: string[] }): TrustEvent | null;
  export function custodyVerifiedEvent(count: number, headDigest: string, source?: string): TrustEvent;
  export function egressDeniedEvent(urls: string[], source?: string): TrustEvent;
  export function compactionEvent(line: { time: string; constraints: number; kept: number; lost: { seq: number; text: string }[] }, source?: string): TrustEvent;
}
