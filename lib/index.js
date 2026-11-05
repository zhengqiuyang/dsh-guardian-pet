/**
 * Host half: exposes /guardian-pet/api/state — pet state + weekly battle
 * report over the trust family's channels. Reads the same ledgers the
 * panel aggregates (dsh-trust-panel's engines are an npm dependency here,
 * so the pet works with or without the sibling plugins installed).
 */
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import Schema from '@deepseek-ai/schemastery';
import { aggregate, DEFAULT_PATHS } from 'dsh-trust-panel/lib/aggregate.js';
import { petStateOf, reactionFor, weeklyStats } from './stats.js';
export const name = 'dsh-guardian-pet';
export const inject = ['webServer'];
export const Config = Schema.object({
    panelEventsPath: Schema.string()
        .default('.dsh-trust-panel/events.jsonl')
        .description('trust-panel event log the pet replays for live channel events'),
});
async function readEvents(path) {
    try {
        const text = await readFile(path, 'utf8');
        const out = [];
        for (const line of text.split('\n')) {
            const t = line.trim();
            if (t === '')
                continue;
            try {
                out.push(JSON.parse(t));
            }
            catch {
                // skip malformed
            }
        }
        // newest first, same order the panel serves
        return out.sort((a, b) => (a.time < b.time ? 1 : -1));
    }
    catch {
        return [];
    }
}
export function apply(ctx, config) {
    const cwd = process.cwd();
    const panelEvents = resolve(cwd, config.panelEventsPath);
    const webServer = ctx.webServer;
    const registerRoute = () => {
        void webServer.register({
            kind: 'exact',
            path: '/guardian-pet/api/state',
            handler: async (_req, res) => {
                const r = res;
                const live = await readEvents(panelEvents);
                const summary = await aggregate({ cwd, ...DEFAULT_PATHS }, live, null);
                const state = {
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
//# sourceMappingURL=index.js.map