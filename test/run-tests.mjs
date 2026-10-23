import { strict as assert } from 'node:assert';
import { petStateOf, reactionFor, weeklyStats } from '../lib/stats.js';
import {
  compactionEvent,
  egressDeniedEvent,
  prGateEvent,
  readFindingEvent,
  custodyVerifiedEvent,
} from 'dsh-trust-panel/lib/translate.js';

let passed = 0;
function ok(name) {
  passed++;
  console.log(`ok - ${name}`);
}

/* ---------- pet state mapping ---------- */

{
  assert.equal(petStateOf({ status: 'ok' }), 'sleeping');
  assert.equal(petStateOf({ status: 'activity' }), 'alert');
  assert.equal(petStateOf({ status: 'attention' }), 'guarding');
  ok('petStateOf maps summary status to pet state');
}

/* ---------- reaction bubbles ---------- */

{
  const none = reactionFor([]);
  assert.equal(none, null);
  const events = [
    egressDeniedEvent(['https://x.example/']), // newest
    readFindingEvent('INSTR_OVERRIDE', 'high', 'x', 'read_file'),
  ];
  const r = reactionFor(events);
  assert.equal(r.key, 'reaction.egress');
  assert.equal(r.since, events[0].time);
  ok('reactionFor picks the newest event channel');
}

/* ---------- weekly stats ---------- */

{
  const now = new Date('2026-10-20T12:00:00.000Z');
  const mk = (iso) => {
    // build events with controlled timestamps via the translate factories
    const evs = {
      read: () => readFindingEvent('INSTR_OVERRIDE', 'high', 'x', 'read_file'),
      write: () => prGateEvent({ time: iso, tool: 'write', action: 'denied', path: 'a', matchedBy: 'r' }),
      egress: () => egressDeniedEvent(['https://x.example/']),
      memory: () => compactionEvent({ time: iso, constraints: 2, kept: 1, lost: [{ seq: 1, text: 'x' }] }),
      custody: () => custodyVerifiedEvent(3, 'a'.repeat(64)),
    };
    return evs;
  };

  // events inside the window: 1 write + 1 memory + 1 custody; outside: 1 write
  const inside = [
    { ...mk('2026-10-18T00:00:00.000Z').read(), time: '2026-10-18T00:00:00.000Z' },
    mk('2026-10-18T00:00:00.000Z').write(),
    { ...mk('2026-10-18T00:00:00.000Z').egress(), time: '2026-10-18T00:00:00.000Z' },
    mk('2026-10-18T00:00:00.000Z').memory(),
    mk('2026-10-18T00:00:00.000Z').custody(),
  ];
  const outside = [mk('2026-10-01T00:00:00.000Z').write()];
  const stats = weeklyStats([...inside, ...outside], 7, now);

  assert.equal(stats.quarantined, 1, 'read inside window');
  assert.equal(stats.writesBlocked, 1, 'write denied inside window only');
  assert.equal(stats.egressBlocked, 1);
  assert.equal(stats.recovered, 1);
  assert.equal(stats.verified, 1);
  assert.equal(stats.total, inside.length);
  assert.equal(stats.since, '2026-10-13T12:00:00.000Z');
  ok('weeklyStats counts per channel inside the 7d window');
}

/* ---------- i18n dict coverage ---------- */

{
  const loaded = {};
  globalThis.window = { __ModuleLoader__: { load: (def) => { loaded.factory = def.factory; } } };
  const require = (name) => {
    if (name === 'react') {
      return {
        createElement: () => null,
        useState: () => [null, () => {}],
        useEffect: () => {},
        useRef: () => ({ current: '' }),
      };
    }
    throw new Error(`unexpected require: ${name}`);
  };
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../client/index.js', import.meta.url), 'utf8');
  (0, eval)(src);
  const clientExports = loaded.factory(require);
  const hasKey = clientExports._i18n.hasKey;

  const keys = ['tabTitle', 'loading', 'reportTitle', 'reportLine', 'reportQuiet', 'copy', 'copied'];
  for (const state of ['sleeping', 'alert', 'guarding']) keys.push('pet.' + state);
  // every reaction key the host can produce
  for (const ch of ['read', 'write', 'egress', 'memory', 'tools', 'prompt', 'composition', 'leave', 'custody']) {
    keys.push('reaction.' + ch);
  }
  const missing = keys.filter((k) => !hasKey(k));
  assert.deepStrictEqual(missing, [], `missing i18n keys: ${missing.join(', ')}`);

  const t = clientExports._i18n.t;
  clientExports._i18n.attachLocale({ getSnapshot: () => ({ active: 'zh-CN' }) });
  const zhLine = t('reportLine', { quarantined: 3, writesBlocked: 2, egressBlocked: 1, recovered: 4, verified: 9 });
  assert.ok(zhLine.includes('隔离 3 次') && zhLine.includes('找回 4 条'), zhLine);
  clientExports._i18n.attachLocale({ getSnapshot: () => ({ active: 'en-US' }) });
  const enLine = t('reportLine', { quarantined: 3, writesBlocked: 2, egressBlocked: 1, recovered: 4, verified: 9 });
  assert.ok(enLine.includes('3 injections quarantined'), enLine);
  ok('i18n: all keys in both dicts; zh/en report lines render');
}

console.log(`\n${passed} passed`);
