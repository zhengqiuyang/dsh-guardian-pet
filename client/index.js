/**
 * Client half of dsh-guardian-pet, authored directly in the dsh web
 * module-table format (window.__ModuleLoader__). The pet renders as emoji
 * + CSS keyframes (no art assets in v0.1), follows the guardian state API,
 * and can copy a shareable weekly battle report. zh/en via the DSH locale
 * service, browser language fallback.
 */
// eslint-disable-next-line no-undef
window.__ModuleLoader__.load({
  id: 'dsh-guardian-pet',
  factory: (require) => {
    const react = require('react');
    const h = react.createElement;
    const useState = react.useState;
    const useEffect = react.useEffect;
    const useRef = react.useRef;
    // Guard: the module-table snapshot may predate hooks availability.
    const safeUseRef = (init) => (typeof useRef === 'function' ? useRef(init) : { current: init });

    const inject = ['slots', 'sessions', 'locale'];

    const POLL_MS = 5000;

    /* ---------------- i18n ---------------- */

    const en = {
      tabTitle: 'Guardian',
      loading: 'Waking the guardian…',
      'pet.sleeping': 'Everything is quiet. The guardian dozes beside your agent.',
      'pet.alert': 'The guardian caught something and handled it.',
      'pet.guarding': 'The guardian is bristling — something needs your eyes.',
      'reaction.read': 'Blocked a hidden instruction! 🛡️',
      'reaction.write': 'Stopped an out-of-promise write! ✋',
      'reaction.egress': 'Blocked a trip to a strange site! 🚧',
      'reaction.memory': 'Picked up a rule the agent forgot! 📝',
      'reaction.tools': 'The tool shelf changed… sniffing 🔍',
      'reaction.prompt': 'The opening instructions changed… watching 📜',
      'reaction.composition': 'New plugin smell… checking 🧩',
      'reaction.leave': 'Sniffing at leftovers 🧹',
      'reaction.custody': 'Checking the records… 🔗',
      reportTitle: 'Weekly battle report',
      reportLine: '{quarantined} injections quarantined · {writesBlocked} rogue writes stopped · {egressBlocked} blocked destinations · {recovered} rules recovered · {verified} record checks passed',
      reportQuiet: 'A quiet week — nothing tried anything funny.',
      copy: 'Copy report',
      copied: 'Copied!',
    };

    const zh = {
      tabTitle: '守护兽',
      loading: '正在唤醒守护兽…',
      'pet.sleeping': '一切安静。守护兽在 agent 身边打盹。',
      'pet.alert': '守护兽抓到了什么,已经处理好了。',
      'pet.guarding': '守护兽炸毛了——有情况需要你看一眼。',
      'reaction.read': '挡下了一条藏在文件里的指令!🛡️',
      'reaction.write': '拦住了一次越界写入!✋',
      'reaction.egress': '拦住了一次去陌生网站的请求!🚧',
      'reaction.memory': '捡回了 agent 忘记的规矩!📝',
      'reaction.tools': '工具架变了…嗅嗅 🔍',
      'reaction.prompt': '开场指令变了…盯着 📜',
      'reaction.composition': '有新插件的味道…查查 🧩',
      'reaction.leave': '在闻残留物 🧹',
      'reaction.custody': '清点记录中…🔗',
      reportTitle: '本周战报',
      reportLine: '隔离 {quarantined} 次注入 · 拦下 {writesBlocked} 次越界写入 · 挡住 {egressBlocked} 个陌生目的地 · 找回 {recovered} 条遗忘规矩 · 通过 {verified} 次记录校验',
      reportQuiet: '安静的一周——没有谁想搞事。',
      copy: '复制战报',
      copied: '已复制!',
    };

    let localeService;
    function attachLocale(service) {
      localeService = service;
    }
    function activeLocale() {
      let active = '';
      try {
        active = localeService?.getSnapshot?.().active ?? '';
      } catch {
        active = '';
      }
      if (active.startsWith('zh')) return 'zh';
      if (active.startsWith('en')) return 'en';
      const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
      return nav && nav.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }
    function t(key, params, fallback) {
      const dict = activeLocale() === 'zh' ? zh : en;
      let text = dict[key] ?? en[key] ?? fallback ?? key;
      if (params !== undefined) {
        for (const [k, v] of Object.entries(params)) {
          text = text.split(`{${k}}`).join(String(v));
        }
      }
      return text;
    }

    /* ---------------- rendering ---------------- */

    const C = {
      muted: 'rgba(127,127,127,0.85)',
      faint: 'rgba(127,127,127,0.55)',
      line: 'rgba(127,127,127,0.22)',
      card: 'rgba(127,127,127,0.07)',
    };

    const PET_FACE = { sleeping: '🐉💤', alert: '🐉', guarding: '🐲💥' };

    const STYLE_ID = 'dsh-guardian-pet-style';
    const CSS = `
@keyframes gp-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes gp-zzz { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(-18px); } }
@keyframes gp-shake { 0%,100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-3px) rotate(-4deg); } 75% { transform: translateX(3px) rotate(4deg); } }
@keyframes gp-pop { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
.gp-pet { font-size: 44px; line-height: 1; display: inline-block; }
.gp-sleeping .gp-pet { animation: gp-breathe 3.2s ease-in-out infinite; }
.gp-guarding .gp-pet { animation: gp-shake 0.5s ease-in-out infinite; }
.gp-alert .gp-pet { animation: gp-pop 0.6s ease-out; }
.gp-zzz { position: absolute; right: -14px; top: -6px; font-size: 12px; color: rgba(127,127,127,0.8); animation: gp-zzz 3s linear infinite; }
.gp-reaction { animation: gp-pop 0.5s ease-out; }
`;

    function ensureStyle() {
      try {
        if (document.getElementById(STYLE_ID) === null) {
          const el = document.createElement('style');
          el.id = STYLE_ID;
          el.textContent = CSS;
          document.head.appendChild(el);
        }
      } catch {
        // non-DOM composition — style is cosmetic
      }
    }

    function Pet(props) {
      const state = props.state;
      const reaction = props.reaction;
      const lastSeenRef = safeUseRef('');
      const [showReaction, setShowReaction] = useState(false);

      useEffect(() => {
        if (reaction === null) return;
        if (reaction.since !== lastSeenRef.current) {
          lastSeenRef.current = reaction.since;
          setShowReaction(true);
          const timer = setTimeout(() => setShowReaction(false), 6000);
          return () => clearTimeout(timer);
        }
        return undefined;
      }, [reaction === null ? '' : reaction.since]);

      return h(
        'div',
        {
          className: 'gp-' + state,
          style: { position: 'relative', textAlign: 'center', padding: '18px 0 10px' },
        },
        h('span', { className: 'gp-pet' }, PET_FACE[state] ?? '🐉'),
        state === 'sleeping' ? h('span', { className: 'gp-zzz' }, 'Zzz') : null,
        showReaction && reaction !== null
          ? h(
              'div',
              { className: 'gp-reaction', style: { marginTop: 8, fontSize: 13, fontWeight: 600 } },
              t(reaction.key, undefined, reaction.key)
            )
          : h('div', { style: { marginTop: 8, fontSize: 12, color: C.muted } }, t('pet.' + state))
      );
    }

    function Report(props) {
      const weekly = props.weekly;
      const [copied, setCopied] = useState(false);
      const quiet = weekly.total === 0;
      const line = quiet
        ? t('reportQuiet')
        : t('reportLine', {
            quarantined: weekly.quarantined,
            writesBlocked: weekly.writesBlocked,
            egressBlocked: weekly.egressBlocked,
            recovered: weekly.recovered,
            verified: weekly.verified,
          });

      const copy = () => {
        const text = `🐉 ${t('reportTitle')} · dsh-guardian-pet\n${line}\n— via github.com/zhengqiuyang/dsh-trust-suite`;
        const done = () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        };
        try {
          if (navigator.clipboard !== undefined && navigator.clipboard.writeText !== undefined) {
            void navigator.clipboard.writeText(text).then(done, done);
          } else {
            done();
          }
        } catch {
          done();
        }
      };

      return h(
        'div',
        {
          style: {
            border: '1px solid ' + C.line,
            borderRadius: 10,
            padding: 12,
            background: C.card,
            fontSize: 12,
            lineHeight: 1.6,
          },
        },
        h('div', { style: { fontWeight: 600, marginBottom: 4 } }, '📜 ' + t('reportTitle')),
        h('div', { style: { color: C.muted } }, line),
        h(
          'button',
          {
            onClick: copy,
            style: {
              marginTop: 8,
              fontSize: 11,
              padding: '3px 14px',
              cursor: 'pointer',
              borderRadius: 6,
              border: '1px solid ' + C.line,
              background: 'transparent',
              color: 'inherit',
            },
          },
          copied ? t('copied') : t('copy')
        )
      );
    }

    function Guardian() {
      const [state, setState] = useState(null);

      useEffect(() => {
        ensureStyle();
        let stopped = false;
        const tick = () => {
          fetch('/guardian-pet/api/state')
            .then((r) => (r.ok ? r.json() : null))
            .then((s) => {
              if (!stopped && s !== null) setState(s);
            })
            .catch(() => undefined);
        };
        tick();
        const timer = setInterval(tick, POLL_MS);
        return () => {
          stopped = true;
          clearInterval(timer);
        };
      }, []);

      if (state === null) {
        return h('div', { style: { padding: 16, fontSize: 12, color: C.muted } }, t('loading'));
      }

      return h(
        'div',
        { style: { padding: 12, fontFamily: 'system-ui, -apple-system, sans-serif' } },
        h(Pet, { state: state.petState, reaction: state.reaction }),
        h('div', { style: { height: 10 } }),
        h(Report, { weekly: state.weekly })
      );
    }

    function apply(ctx) {
      try {
        const service = ctx.get('locale');
        if (service !== undefined) attachLocale(service);
      } catch (error) {
        // no locale service — browser language fallback
      }

      ctx.inject(['sidebarRightTabs'], (injected) => {
        const tabs = injected.get('sidebarRightTabs');
        if (tabs === undefined || ctx.slots === undefined) return;

        const offTab = tabs.register({
          id: 'dsh-guardian-pet:main',
          kind: 'guardian-pet',
          title: () => t('tabTitle', undefined, 'Guardian'),
        });

        const slots = ctx.slots;
        const offSlot = slots.inject('sidebar.right.pane.tab', () =>
          slots.register(
            { name: 'sidebar.right.pane.tab', key: 'dsh-guardian-pet:main' },
            () => h('div', { style: { height: '100%', overflowY: 'auto' } }, h(Guardian))
          )
        );

        try {
          const controller = ctx.get('sidebarRight');
          if (controller !== undefined && typeof controller.openTab === 'function') {
            controller.openTab('guardian-pet');
          }
        } catch (error) {
          console.warn('[dsh-guardian-pet] could not auto-open tab', error);
        }

        return () => {
          offSlot();
          offTab();
        };
      });
    }

    const exportsObj = {
      name: 'dsh-guardian-pet/client',
      inject,
      apply,
      _i18n: { attachLocale, t, hasKey: (key) => key in zh && key in en },
    };
    return exportsObj;
  },
});
