/**
 * Host half: exposes /guardian-pet/api/state — pet state + weekly battle
 * report over the trust family's channels. Reads the same ledgers the
 * panel aggregates (dsh-trust-panel's engines are an npm dependency here,
 * so the pet works with or without the sibling plugins installed).
 */
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import { aggregate, DEFAULT_PATHS } from 'dsh-trust-panel/lib/aggregate.js';
import type { TrustEvent } from 'dsh-trust-panel/lib/types.js';
import { petStateOf, reactionFor, weeklyStats, type GuardianState } from './stats.js';

export const name = 'dsh-guardian-pet';
export const inject = ['webServer'];

export interface Config {
  /** Path of the trust-panel event log (read/egress live events persist there). */
  panelEventsPath: string;
}

export const Config: Schema<Config> = Schema.object({
  panelEventsPath: Schema.string()
    .default('.dsh-trust-panel/events.jsonl')
    .description('trust-panel event log the pet replays for live channel events'),
});

async function readEvents(path: string): Promise<TrustEvent[]> {
  try {
    const text = await readFile(path, 'utf8');
    const out: TrustEvent[] = [];
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (t === '') continue;
      try {
        out.push(JSON.parse(t) as TrustEvent);
      } catch {
        // skip malformed
      }
    }
    // newest first, same order the panel serves
    return out.sort((a, b) => (a.time < b.time ? 1 : -1));
  } catch {
    return [];
  }
}

export function apply(ctx: Context, config: Config): void {
  const cwd = process.cwd();
  const panelEvents = resolve(cwd, config.panelEventsPath);

  const webServer = (ctx as unknown as {
    webServer: { register(route: { kind: string; path: string; handler: (req: unknown, res: unknown) => Promise<void> }): unknown };
  }).webServer;

  const registerRoute = (): void => {
    void webServer.register({
      kind: 'exact',
      path: '/guardian-pet/api/state',
      handler: async (_req: unknown, res: unknown) => {
        const r = res as { setHeader(k: string, v: string): void; end(body: string): void };
        const live = await readEvents(panelEvents);
        const summary = await aggregate({ cwd, ...DEFAULT_PATHS }, live, null);
        const state: GuardianState = {
          status: summary.status,
          petState: petStateOf(summary),
          reaction: reactionFor(summary.events),
          weekly: weeklyStats(summary.events),
          generatedAt: new Date().toISOString(),
        };
        r.setHeader('content-type', 'application/json');
        r.end(JSON.stringify(state));
      },
    });
  };
  ctx.effect(() => {
    registerRoute();
    return () => undefined;
  });

  console.log('[dsh-guardian-pet] guardian awake; api at /guardian-pet/api/state');
}
