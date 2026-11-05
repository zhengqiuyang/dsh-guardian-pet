export function petStateOf(summary) {
    if (summary.status === 'attention')
        return 'guarding';
    if (summary.status === 'activity')
        return 'alert';
    return 'sleeping';
}
const REACTION_BY_CHANNEL = {
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
export function reactionFor(events) {
    if (events.length === 0)
        return null;
    const latest = events[0];
    const key = REACTION_BY_CHANNEL[latest.channel];
    if (key === undefined)
        return null;
    return { key, since: latest.time };
}
/** Count the battle-report numbers over the last `days` days. */
export function weeklyStats(events, days = 7, now = new Date()) {
    const since = new Date(now.getTime() - days * 86400_000);
    const window = events.filter((e) => Date.parse(e.time) >= since.getTime());
    const stats = {
        quarantined: 0,
        writesBlocked: 0,
        egressBlocked: 0,
        recovered: 0,
        verified: 0,
        total: window.length,
        since: since.toISOString(),
    };
    for (const ev of window) {
        if (ev.channel === 'read' && ev.outcome === 'handled')
            stats.quarantined += 1;
        if (ev.channel === 'write' && ev.outcome === 'handled')
            stats.writesBlocked += 1;
        if (ev.channel === 'egress')
            stats.egressBlocked += 1;
        if (ev.channel === 'memory')
            stats.recovered += 1;
        if (ev.channel === 'custody' && ev.outcome === 'handled')
            stats.verified += 1;
    }
    return stats;
}
//# sourceMappingURL=stats.js.map