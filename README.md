# dsh-guardian-pet

> **If this helps you, please give it a star** — it helps others find it. Thanks!

🐉 A guardian pet for your [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) agent.

It lives in your right sidebar and mirrors the state of the
[dsh trust family](https://github.com/zhengqiuyang/dsh-trust-suite)'s nine channels:

| What happens | The guardian |
|---|---|
| Everything is quiet | curls up beside your agent and dozes (Zzz) |
| Something suspicious was read | snaps awake — "Blocked a hidden instruction! 🛡️" |
| An out-of-promise write, a strange destination | bristles and shakes — the reaction bubble names it |
| A rule your agent forgot | picks it up and puts it back 📝 |
| Records checked | counts them, calmly 🔗 |

Plus a **weekly battle report** card — one line of what the guards caught this
week (injections quarantined, rogue writes stopped, rules recovered, record
checks passed) with a one-click copy that formats it as a shareable text
snippet. Show off your dragon's work.

## Install

```sh
dsh plugin --profile web add dsh-guardian-pet
```

Best with its family: `dsh plugin --profile web add dsh-trust-suite` installs
all nine guards plus [dsh-trust-panel](https://github.com/zhengqiuyang/dsh-trust-panel),
and the pet reads the same ledgers they write.

## How it works

- The host half serves `/guardian-pet/api/state`: it aggregates the trust
  family's ledgers with dsh-trust-panel's engines (a regular npm dependency —
  works with or without the sibling plugins installed) and maps the summary
  to a pet state (`sleeping` / `alert` / `guarding`) plus per-channel reaction
  bubbles and 7-day battle statistics.
- The web client is authored directly in dsh's module-table format; the pet is
  emoji + CSS keyframes (breathing doze, bristle shake, Zzz drift) — no art
  assets, no build step, dark/light-theme safe.
- Bilingual (zh/en) through the DSH locale service with browser-language
  fallback; every host key is pinned to exist in both dictionaries by a
  regression test.

## Design notes

- **Zero LLM calls** — the pet is a skin over deterministic engines; it never
  judges anything itself, it only reflects what the trust family recorded.
- **Emotion is the interface**: the same nine-channel data the
  [trust panel](https://github.com/zhengqiuyang/dsh-trust-panel) shows as
  cards, the guardian shows as a creature with moods — pick whichever way you
  like being told "you're safe".

## Compatibility

- DSH 0.2.x (source snapshot 0.2.1-alpha.2, 2026-10-23): disposable-profile
  install → boot → sidebar tab composes → `/guardian-pet/api/state` verified
  with live ledger data; reaction bubble and weekly report verified in-browser.
- Node ≥ 20.

## License

MIT
