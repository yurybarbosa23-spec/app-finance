const fs = require('fs')

const css = `
<style scoped>
.ios-app, .ios-modal-bg { --bg: #0d0d0f; --surface: #1c1c1e; --surface2: #2c2c2e; --surface3: #3a3a3c; --blue: #0A84FF; --green: #30D158; --red: #FF453A; --orange: #FF9F0A; --teal: #64D2FF; --purple: #BF5AF2; --sep: rgba(84,84,88,.36); --text2: rgba(235,235,245,.8); --text3: rgba(235,235,245,.5); --r: 16px; --r-lg: 22px; color: #fff; font-family: -apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif; }
* { box-sizing: border-box; margin: 0; padding: 0; }
.ios-app { min-height: 100dvh; background-color: var(--bg); display: flex; flex-direction: column; overflow-x: hidden; transition: background 0.3s; }

/* Splash */
.ios-splash { position: fixed; inset: 0; background: var(--bg); display: flex; align-items: center; justify-content: center; z-index: 999; }
.ios-splash-inner { text-align: center; }
.ios-spinner { width: 28px; height: 28px; border: 2.5px solid rgba(255,255,255,.1); border-top-color: var(--teal); border-radius: 50%; animation: spin .7s linear infinite; margin: 0 auto; }
.ios-spinner.sm { width: 16px; height: 16px; border-width: 2px; }
.ios-spinner.white { border-color: rgba(255,255,255,.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast */
.ios-toast { position: fixed; top: 1rem; left: 50%; transform: translateX(-50%); z-index: 9999; background: var(--surface2); border: 1px solid var(--sep); color: #fff; padding: .75rem 1.5rem; border-radius: 99px; font-size: .85rem; font-weight: 600; backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0,0,0,.4); white-space: nowrap; }
.ios-toast-enter-active, .ios-toast-leave-active { transition: all .3s cubic-bezier(.2,1,.3,1); }
.ios-toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(.95); }
.ios-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-8px); }

/* Overlay */
.ios-overlay { position: fixed; inset: 0; z-index: 9998; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; }
.ios-loading-card { background: var(--surface); border: 1px solid var(--sep); border-radius: var(--r); padding: 1.5rem 2rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 16px 48px rgba(0,0,0,.5); }
.ios-loading-card span { font-size: .875rem; color: var(--text2); }

/* Header */
.ios-header { background: rgba(12,20,36,.85); backdrop-filter: blur(20px) saturate(180%); border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0 1.5rem; height: 4rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 40; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
.ios-header-left { display: flex; align-items: center; gap: .75rem; }
.ios-logo { width: 2.25rem; height: 2.25rem; border-radius: 10px; background: linear-gradient(135deg, var(--teal), var(--green)); display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); }
@media(min-width: 768px) { .ios-header-title { display: block !important; color: #fff; } }

.ios-header-nav { display: none; }
@media(min-width: 1024px) {
  .ios-header-nav { display: flex; align-items: center; gap: 1rem; background: rgba(255,255,255,0.03); padding: 0.25rem; border-radius: 99px; border: 1px solid rgba(255,255,255,0.05); position: relative; z-index: 50; pointer-events: auto; }
  .ios-header-tab { padding: 0.5rem 1.25rem; border-radius: 99px; border: none; background: transparent; color: var(--text2); font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.3s; position: relative; z-index: 51; }
  .ios-header-tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
  .ios-header-tab.active { background: rgba(100,210,255,0.15); color: var(--teal); box-shadow: inset 0 0 0 1px rgba(100,210,255,0.2); }
}

.ios-header-right { display: flex; align-items: center; gap: 0.75rem; }
.ios-user-badge { display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.05); padding: 0.35rem; padding-right: 1rem; border-radius: 99px; border: 1px solid rgba(255,255,255,0.05); }
@media(max-width: 767px) { .ios-user-badge { padding-right: 0.35rem; background: transparent; border: none; } }
.ios-avatar { width: 2.25rem; height: 2.25rem; border-radius: 50%; background: linear-gradient(135deg, var(--teal), var(--blue)); display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 800; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2); }
@media(min-width: 768px) { .ios-greeting { display: block !important; font-size: 0.8rem; color: var(--text2); } .ios-greeting strong { color: #fff; } }

.ios-hdr-btn { width: 2.25rem; height: 2.25rem; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: .9rem; cursor: pointer; color: #fff; transition: all .3s; }
.ios-hdr-btn:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
.ios-hdr-btn-danger:hover { background: rgba(255,69,58,.15); color: var(--red); border-color: rgba(255,69,58,.3); }

/* Main */
.ios-main { flex: 1; padding: 1.5rem 1rem; padding-bottom: 6rem; display: flex; flex-direction: column; align-items: center; }
@media(min-width:1024px) { .ios-main { padding: 2.5rem 3rem 3rem; } }
.ios-content { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; max-width: 1100px; margin: 0 auto; }

/* Balance Card */
@keyframes borderGlow { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
@keyframes shimmer { 0% { transform: translateX(-100%) rotate(12deg); } 100% { transform: translateX(200%) rotate(12deg); } }
.ios-balance-card { position: relative; border-radius: var(--r-lg); overflow: hidden; transform-style: preserve-3d; will-change: transform; padding: 1.5px; background: linear-gradient(135deg, rgba(100,210,255,.4), rgba(48,209,88,.25), rgba(10,132,255,.35), rgba(191,90,242,.2)); background-size: 300% 300%; animation: borderGlow 4s ease-in-out infinite; box-shadow: 0 8px 40px rgba(10,132,255,.15), 0 2px 12px rgba(100,210,255,.1), inset 0 0 0 .5px rgba(255,255,255,.05); }
.ios-balance-glow { position: absolute; inset: 0; z-index: 0; pointer-events: none; transition: background .4s; }
.ios-balance-inner { position: relative; z-index: 1; padding: 1.75rem; background: linear-gradient(160deg, rgba(12,20,36,.92), rgba(8,30,45,.88) 40%, rgba(6,40,35,.82)); border-radius: calc(var(--r-lg) - 1.5px); backdrop-filter: blur(60px) saturate(180%); -webkit-backdrop-filter: blur(60px) saturate(180%); overflow: hidden; }
.ios-balance-inner::before { content: ''; position: absolute; top: -50%; left: -50%; width: 60%; height: 200%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.04), transparent); animation: shimmer 6s ease-in-out infinite; pointer-events: none; }
.ios-balance-inner::after { content: ''; position: absolute; top: 0; right: 0; width: 40%; height: 100%; background: radial-gradient(ellipse at 100% 0%, rgba(100,210,255,.08), transparent 70%); pointer-events: none; }
.ios-balance-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; position: relative; z-index: 1; }
.ios-balance-label { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: rgba(100,210,255,.9); text-shadow: 0 0 20px rgba(100,210,255,.3); }
.ios-balance-sub { font-size: .65rem; color: var(--text3); margin-top: .15rem; }
.ios-balance-badge { font-size: .65rem; background: rgba(255,255,255,.06); border: .5px solid rgba(100,210,255,.2); padding: .3rem .75rem; border-radius: 99px; color: var(--text2); text-transform: capitalize; backdrop-filter: blur(10px); }
.ios-balance-value { font-size: 2.75rem; font-weight: 800; letter-spacing: -.03em; font-variant-numeric: tabular-nums; transition: all .5s cubic-bezier(.2,1,.3,1); line-height: 1.1; margin-bottom: .75rem; position: relative; z-index: 1; background: linear-gradient(135deg, #fff 30%, rgba(100,210,255,.9)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.ios-balance-value.up { filter: drop-shadow(0 0 24px rgba(48,209,88,.6)); transform: scale(1.03); }
.ios-balance-value.down { filter: drop-shadow(0 0 24px rgba(255,69,58,.6)); transform: scale(.97); }
.ios-balance-diff { position: absolute; right: 1.75rem; top: 5rem; font-size: .75rem; font-weight: 800; padding: .25rem .7rem; border-radius: 99px; backdrop-filter: blur(12px); z-index: 2; }
.ios-balance-diff.pos { background: rgba(48,209,88,.15); color: var(--green); border: .5px solid rgba(48,209,88,.3); box-shadow: 0 4px 16px rgba(48,209,88,.15); }
.ios-balance-diff.neg { background: rgba(255,69,58,.15); color: var(--red); border: .5px solid rgba(255,69,58,.3); box-shadow: 0 4px 16px rgba(255,69,58,.15); }
.ios-diff-enter-active { transition: all .4s cubic-bezier(.2,1,.3,1); }
.ios-diff-leave-active { transition: all .6s; }
.ios-diff-enter-from { opacity: 0; transform: translateY(6px) scale(.85); }
.ios-diff-leave-to { opacity: 0; transform: translateY(-10px); }
.ios-balance-bar { height: 5px; border-radius: 99px; background: rgba(255,255,255,.06); overflow: hidden; margin-bottom: .6rem; position: relative; z-index: 1; }
.ios-balance-bar-fill { height: 100%; border-radius: 99px; transition: width 1s ease; position: relative; }
.ios-balance-bar-fill.good { background: linear-gradient(90deg, var(--green), var(--teal)); box-shadow: 0 0 12px rgba(48,209,88,.4); }
.ios-balance-bar-fill.warn { background: linear-gradient(90deg, var(--orange), var(--red)); box-shadow: 0 0 12px rgba(255,159,10,.4); }
.ios-balance-row { display: flex; justify-content: space-between; font-size: .72rem; font-weight: 600; color: var(--text2); position: relative; z-index: 1; }

/* Quick Actions */
.ios-quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
@media(min-width:640px) { .ios-quick-grid { grid-template-columns: repeat(4, 1fr); } }
.ios-quick-btn { display: flex; flex-direction: column; align-items: center; gap: .75rem; padding: 1.25rem .5rem; border-radius: 24px; background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border: .5px solid rgba(255,255,255,0.08); cursor: pointer; transition: all .3s cubic-bezier(.2,1,.3,1); color: #fff; font-family: inherit; box-shadow: 0 4px 15px rgba(0,0,0,.1); position: relative; overflow: hidden; }
.ios-quick-btn::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1), transparent 70%); opacity: 0; transition: opacity .3s; pointer-events: none; }
.ios-quick-btn:hover { transform: translateY(-5px); box-shadow: 0 16px 32px rgba(0,0,0,.3), 0 0 0 1px rgba(255,255,255,0.15); border-color: transparent; }
.ios-quick-btn:hover::before { opacity: 1; }
.ios-quick-btn:active { transform: scale(.96); }
.ios-quick-btn span:last-child { font-size: .8rem; font-weight: 600; color: rgba(255,255,255,.9); letter-spacing: .02em; }
.ios-quick-icon { width: 3.5rem; height: 3.5rem; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1); transition: transform .3s; }
.ios-quick-btn:hover .ios-quick-icon { transform: scale(1.1) rotate(5deg); }
.qb-green { background: linear-gradient(135deg, rgba(48,209,88,.2), rgba(48,209,88,.05)); }
.qb-blue { background: linear-gradient(135deg, rgba(10,132,255,.2), rgba(10,132,255,.05)); }
.qb-orange { background: linear-gradient(135deg, rgba(255,159,10,.2), rgba(255,159,10,.05)); }
.qb-purple { background: linear-gradient(135deg, rgba(191,90,242,.2), rgba(191,90,242,.05)); }

/* Widgets */
.ios-summary-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
@media(min-width:640px) { .ios-summary-grid { grid-template-columns: repeat(3, 1fr); } }
.ios-widget { background: linear-gradient(145deg, rgba(30,30,35,0.8), rgba(20,20,22,0.9)); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.06); border-radius: 28px; padding: 1.5rem; cursor: pointer; transition: all .4s cubic-bezier(.2,1,.3,1); transform-style: preserve-3d; display: flex; flex-direction: column; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,.2); }
.ios-widget::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); transform: skewX(-20deg); transition: all .7s ease; }
.ios-widget::after { content: ''; position: absolute; top: 0; right: 0; width: 150px; height: 150px; background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%); transform: translate(30%, -30%); pointer-events: none; }
.ios-widget:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 20px 40px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,0.1); border-color: transparent; }
.ios-widget:hover::before { left: 150%; }
.ios-widget-icon { width: 2.75rem; height: 2.75rem; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; margin-bottom: 1rem; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05); }
.ios-widget-label { font-size: .8rem; font-weight: 600; color: var(--text2); margin-bottom: .35rem; text-transform: uppercase; letter-spacing: .05em; }
.ios-widget-value { font-weight: 800; font-size: 1.5rem; font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
.wg-green { background: rgba(48,209,88,.12); color: rgba(48,209,88,.9); }
.wg-red { background: rgba(255,69,58,.12); color: rgba(255,69,58,.9); }
.wg-teal { background: rgba(100,210,255,.12); color: rgba(100,210,255,.9); }
.wg-purple { background: rgba(191,90,242,.12); color: rgba(191,90,242,.9); }
.wg-orange { background: rgba(255,159,10,.12); color: rgba(255,159,10,.9); }
.wg-green-text { color: var(--green); text-shadow: 0 0 15px rgba(48,209,88,.3); }
.wg-red-text { color: var(--red); text-shadow: 0 0 15px rgba(255,69,58,.3); }
.wg-teal-text { color: var(--teal); text-shadow: 0 0 15px rgba(100,210,255,.3); }
.wg-purple-text { color: var(--purple); text-shadow: 0 0 15px rgba(191,90,242,.3); }
.wg-orange-text { color: var(--orange); text-shadow: 0 0 15px rgba(255,159,10,.3); }
.wg-blue-text { color: var(--blue); }

/* Widget Cards */
.ios-widget-card { background: linear-gradient(145deg, rgba(35,35,40,0.6), rgba(25,25,30,0.7)); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; overflow: hidden; transition: all .4s ease; transform-style: preserve-3d; box-shadow: 0 10px 30px rgba(0,0,0,.2); }
.ios-widget-card:hover { border-color: rgba(255,255,255,0.15); box-shadow: 0 20px 40px rgba(0,0,0,.35); }
.ios-wc-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 1rem; font-weight: 700; letter-spacing: .02em; background: rgba(0,0,0,0.1); }
.ios-wc-title { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--text2); padding: 0 1.5rem; padding-top: 1.5rem; margin-bottom: 1rem; }
.ios-link { color: var(--teal); font-size: .8rem; font-weight: 600; background: none; border: none; cursor: pointer; font-family: inherit; transition: color .2s; }
.ios-link:hover { color: rgba(100,210,255,1); text-decoration: none; }

/* Account rows */
.ios-account-row { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.04); transition: background .3s; }
.ios-account-row:first-child { border-top: none; }
.ios-account-row:hover { background: rgba(255,255,255,0.03); }
.ios-acc-icon { width: 2.5rem; height: 2.5rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 800; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: transform .3s; }
.ios-account-row:hover .ios-acc-icon { transform: scale(1.08); }
.ios-acc-icon.lg { width: 3rem; height: 3rem; font-size: 1.25rem; border-radius: 14px; }
.ios-acc-info { flex: 1; min-width: 0; }
.ios-acc-name { font-size: .9rem; font-weight: 600; letter-spacing: .01em; color: rgba(255,255,255,.9); }
.ios-acc-bar { height: 3px; border-radius: 99px; background: rgba(255,255,255,.04); margin-top: .35rem; overflow: hidden; }
.ios-acc-bar.full { margin-top: .5rem; }
.ios-acc-bar div { height: 100%; border-radius: 99px; transition: width .7s ease; }
.ios-acc-val { font-weight: 800; font-size: .85rem; font-variant-numeric: tabular-nums; flex-shrink: 0; }

/* Alerts */
.ios-alert-card { background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 20px; overflow: hidden; display: flex; align-items: center; gap: .75rem; padding: .85rem 1rem; border: .5px solid rgba(255,255,255,0.05); }
.ios-alert-card.ios-alert-danger { border-color: rgba(255,69,58,.4); }
.ios-alert-card.ios-alert-warn { border-color: rgba(255,159,10,.4); }
.ios-alert-icon { width: 2.5rem; height: 2.5rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; background: rgba(255,255,255,.04); }
.ios-alert-body { flex: 1; min-width: 0; }
.ios-alert-title { font-size: .8rem; font-weight: 700; margin-bottom: .15rem; }
.ios-alert-danger .ios-alert-title { color: var(--red); }
.ios-alert-warn .ios-alert-title { color: var(--orange); }
.ios-alert-sub { font-size: .7rem; color: var(--text2); }
.ios-alert-sub strong { font-weight: 800; }
.ios-alert-bar { height: 3px; border-radius: 99px; background: rgba(255,255,255,.06); margin-top: .5rem; overflow: hidden; }
.ios-alert-bar div { height: 100%; border-radius: 99px; transition: width .7s; }
.bg-red { background: var(--red); }
.bg-amber { background: var(--orange); }
.bg-green { background: var(--green); }
.bg-blue { background: var(--blue); }
.bg-teal { background: var(--teal); }
.bg-orange { background: var(--orange); }
.bg-purple { background: var(--purple); }

/* Empty states */
.ios-empty-card { background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 20px; padding: 2.5rem 1rem; text-align: center; color: var(--text2); font-size: .85rem; }
.ios-empty-small { text-align: center; color: var(--text3); font-size: .8rem; padding: 1.5rem 0; }
.ios-muted { color: var(--text2); font-size: .75rem; }

/* Contas tab */
.ios-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .5rem; }
.ios-section-title { font-size: 1.1rem; font-weight: 800; }
.ios-total-banner { background: linear-gradient(135deg, rgba(100,210,255,.08), rgba(48,209,88,.06)); border: .5px solid rgba(100,210,255,.15); border-radius: var(--r); padding: 1rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.ios-total-banner p:first-child { font-size: .8rem; color: var(--text2); }
.ios-total-val { font-size: 1.25rem; font-weight: 800; color: var(--teal); font-variant-numeric: tabular-nums; }
.ios-cards-grid { display: grid; grid-template-columns: 1fr; gap: .75rem; }
@media(min-width:640px) { .ios-cards-grid { grid-template-columns: repeat(2, 1fr); } }
.ios-conta-card { background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: .5px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 1.5rem; position: relative; overflow: hidden; transition: all .3s; transform-style: preserve-3d; }
.ios-conta-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,.2); }
.ios-conta-top-bar { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
.ios-conta-header { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
.ios-del-btn { margin-left: auto; width: 1.75rem; height: 1.75rem; border-radius: 8px; background: none; border: none; color: var(--text3); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .7rem; transition: all .2s; opacity: .4; }
.ios-conta-card:hover .ios-del-btn { opacity: 1; }
.ios-del-btn:hover { background: rgba(255,69,58,.1); color: var(--red); }
.ios-conta-saldo { font-size: 1.75rem; font-weight: 800; font-variant-numeric: tabular-nums; margin-bottom: .75rem; }
.ios-conta-footer { display: flex; justify-content: space-between; font-size: .7rem; color: var(--text3); margin-bottom: .35rem; }
.ios-conta-footer span:last-child { font-weight: 600; }

/* Pills & chips */
.ios-pill-btn { font-size: .7rem; font-weight: 600; padding: .35rem .75rem; border-radius: 99px; border: none; cursor: pointer; transition: all .2s; font-family: inherit; background: rgba(100,210,255,.1); color: var(--teal); }
.ios-pill-btn:hover { background: rgba(100,210,255,.2); }
.ios-pill-btn.blue { background: rgba(10,132,255,.1); color: var(--blue); }
.ios-pill-btn.green { background: rgba(48,209,88,.1); color: var(--green); }

/* Segmented control */
.ios-segmented { display: flex; background: var(--surface); border: .5px solid var(--sep); border-radius: 12px; padding: 3px; gap: 3px; margin-bottom: .75rem; }
.ios-segmented.sm { margin-bottom: .5rem; }
.ios-segmented button { flex: 1; padding: .6rem; border-radius: 9px; border: none; background: none; color: var(--text2); font-size: .75rem; font-weight: 600; cursor: pointer; transition: all .25s; font-family: inherit; }
.ios-segmented button.active { background: var(--blue); color: #fff; box-shadow: 0 2px 8px rgba(10,132,255,.3); }

/* Transaction list */
.ios-list-header { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: .5px solid var(--sep); border-radius: var(--r); padding: .7rem 1rem; font-size: .75rem; color: var(--text3); margin-bottom: .5rem; }
.ios-list-total { font-weight: 800; font-size: .85rem; }
.ios-tx-row { display: flex; align-items: center; gap: .7rem; padding: .75rem 1rem; transition: background .2s; }
.ios-tx-row:hover { background: rgba(255,255,255,.02); }
.ios-tx-row.bordered { border-top: .5px solid rgba(84,84,88,.2); }
.ios-tx-icon { width: 2.25rem; height: 2.25rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: .9rem; flex-shrink: 0; }
.ios-tx-info { flex: 1; min-width: 0; }
.ios-tx-desc { font-size: .85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ios-tx-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.ios-tx-actions { display: flex; gap: 2px; opacity: 0; transition: opacity .2s; }
.ios-tx-row:hover .ios-tx-actions { opacity: 1; }
.ios-sm-btn { width: 1.75rem; height: 1.75rem; border-radius: 8px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .7rem; color: var(--text3); transition: all .2s; }
.ios-sm-btn:hover { background: rgba(100,210,255,.1); color: var(--teal); }
.ios-sm-btn.danger:hover { background: rgba(255,69,58,.1); color: var(--red); }

/* Metrics */
.ios-metrics-section { display: flex; flex-direction: column; gap: .75rem; }
.ios-period-label { font-size: .85rem; font-weight: 600; text-transform: capitalize; margin-bottom: .25rem; display: flex; align-items: center; gap: .5rem; }
.ios-period-label::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--purple); }

/* Donuts */
.ios-donut-row { display: flex; align-items: center; gap: 1.5rem; padding: 0 1rem .75rem; }
.ios-donut-wrap { position: relative; flex-shrink: 0; width: 8rem; height: 8rem; }
.ios-donut { width: 100%; height: 100%; transform: rotate(-90deg); }
.ios-donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ios-donut-legend { flex: 1; display: flex; flex-direction: column; gap: .4rem; }
.ios-legend-item { display: flex; align-items: center; gap: .5rem; }
.ios-legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.ios-legend-label { font-size: .75rem; color: var(--text2); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ios-legend-pct { font-size: .75rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.ios-cat-bars { padding: .75rem 1rem 1rem; display: flex; flex-direction: column; gap: .75rem; }
.ios-cat-bar-header { display: flex; justify-content: space-between; font-size: .8rem; margin-bottom: .35rem; }
.ios-cat-bar-header span:first-child { font-weight: 600; }
.ios-progress { height: 5px; border-radius: 99px; background: rgba(255,255,255,.04); overflow: hidden; }
.ios-progress.sm { height: 3px; }
.ios-progress div { height: 100%; border-radius: 99px; transition: width .7s ease; }

/* Bottom Nav */
.ios-bottomnav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 40; background: rgba(0,0,0,.88); backdrop-filter: blur(20px) saturate(180%); border-top: .5px solid var(--sep); }
@media(min-width:1024px) { .ios-bottomnav { display: none; } }
.ios-bottomnav-inner { display: flex; align-items: center; justify-content: space-around; max-width: 28rem; margin: 0 auto; padding: .35rem .5rem; padding-bottom: max(6px, env(safe-area-inset-bottom)); }
.ios-tab-btn { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: .25rem .5rem; background: none; border: none; cursor: pointer; color: var(--text3); transition: color .2s; font-family: inherit; min-width: 3rem; }
.ios-tab-btn.active { color: var(--blue); }
.ios-tab-icon { font-size: 1.25rem; }
.ios-tab-label { font-size: .6rem; font-weight: 600; }
.ios-fab { display: flex; flex-direction: column; align-items: center; gap: 2px; background: none; border: none; cursor: pointer; margin-top: -.75rem; font-family: inherit; }
.ios-fab-inner { width: 3rem; height: 3rem; border-radius: 16px; background: linear-gradient(135deg, var(--teal), var(--blue)); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; box-shadow: 0 4px 16px rgba(10,132,255,.4); transition: transform .2s; }
.ios-fab:active .ios-fab-inner { transform: scale(.92); }

/* Modals */
.ios-modal-bg { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.ios-modal-card { background: rgba(30,30,32,0.4); backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%); border: .5px solid var(--sep); border-radius: var(--r-lg); width: 100%; max-width: 28rem; max-height: 90dvh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,.5); }
.ios-modal-card.sm { max-width: 24rem; }
.ios-modal-header { display: flex; align-items: center; gap: .75rem; padding: 1rem 1.25rem; border-bottom: .5px solid var(--sep); position: sticky; top: 0; background: rgba(30,30,32,0.45); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); z-index: 1; border-radius: var(--r-lg) var(--r-lg) 0 0; }
.ios-modal-header h3 { font-size: .9rem; font-weight: 700; color: #fff; }
.ios-modal-header div { flex: 1; }
.ios-modal-progress { height: 2px; background: rgba(255,255,255,.04); }
.ios-modal-progress div { height: 100%; border-radius: 99px; transition: width .4s ease; }
.ios-modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: .75rem; }
.ios-back, .ios-close { width: 1.75rem; height: 1.75rem; border-radius: 50%; background: rgba(255,255,255,.1); border: none; color: var(--text2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; transition: all .2s; flex-shrink: 0; }
.ios-back:hover, .ios-close:hover { background: var(--surface3); color: #fff; }

/* Modal elements */
.ios-step { display: flex; flex-direction: column; gap: .65rem; }
.ios-step-title { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--text2); }
.ios-option-btn { display: flex; align-items: center; gap: .75rem; padding: .85rem; border-radius: 14px; border: .5px solid var(--sep); background: rgba(255,255,255,.02); cursor: pointer; transition: all .2s; text-align: left; width: 100%; color: #fff; font-family: inherit; }
.ios-option-btn:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.1); }
.ios-option-btn:active { transform: scale(.98); }
.ios-option-btn.selected { border-color: rgba(10,132,255,.5); background: rgba(10,132,255,.06); }
.ios-option-btn:disabled { opacity: .4; cursor: not-allowed; }
.ios-option-btn.green { border-color: rgba(48,209,88,.2); }
.ios-option-btn.green:hover { background: rgba(48,209,88,.06); }
.ios-option-btn.red { border-color: rgba(255,69,58,.2); }
.ios-option-btn.red:hover { background: rgba(255,69,58,.06); }
.ios-option-btn.teal { border-color: rgba(100,210,255,.2); }
.ios-option-btn.blue { border-color: rgba(10,132,255,.2); }
.ios-option-icon { width: 2.75rem; height: 2.75rem; border-radius: 14px; background: rgba(255,255,255,.04); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
.ios-option-title { font-size: .9rem; font-weight: 700; }
.ios-chevron { color: var(--text3); font-size: 1.2rem; margin-left: auto; }
.ios-context-bar { display: flex; align-items: center; gap: .75rem; background: rgba(255,255,255,.03); border-radius: 12px; padding: .6rem .85rem; font-size: 1.3rem; }
.ios-input { width: 100%; background: rgba(255,255,255,.04); border: .5px solid var(--sep); border-radius: 12px; padding: .7rem .85rem; color: #fff; font-size: .85rem; outline: none; transition: border-color .2s; font-family: inherit; }
.ios-input:focus { border-color: var(--blue); }
.ios-input::placeholder { color: var(--text3); }
.ios-input-group { position: relative; }
.ios-input-prefix { position: absolute; left: .85rem; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: .85rem; font-weight: 700; }
.ios-input-big { width: 100%; background: rgba(255,255,255,.04); border: .5px solid var(--sep); border-radius: 14px; padding: 1rem 1rem 1rem 2.75rem; color: #fff; font-size: 1.5rem; font-weight: 800; text-align: center; outline: none; transition: border-color .2s; font-family: inherit; font-variant-numeric: tabular-nums; }
.ios-input-big:focus { border-color: var(--blue); }
.ios-input-big::placeholder { color: rgba(255,255,255,.1); }
.ios-chips { display: flex; flex-wrap: wrap; gap: .35rem; }
.ios-chips.wrap { flex-wrap: wrap; }
.ios-chip { padding: .4rem .75rem; border-radius: 99px; border: .5px solid var(--sep); background: rgba(255,255,255,.03); color: var(--text2); font-size: .75rem; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
.ios-chip:hover { background: rgba(255,255,255,.06); }
.ios-chip.active { border-color: var(--teal); background: rgba(100,210,255,.1); color: var(--teal); }
.ios-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; }
.ios-cat-grid.compact { grid-template-columns: repeat(4, 1fr); }
.ios-cat-btn { display: flex; flex-direction: column; align-items: center; gap: .25rem; padding: .6rem .25rem; border-radius: 12px; border: .5px solid var(--sep); background: rgba(255,255,255,.02); cursor: pointer; transition: all .2s; color: var(--text2); font-family: inherit; }
.ios-cat-btn:hover { background: rgba(255,255,255,.05); }
.ios-cat-btn:active { transform: scale(.95); }
.ios-cat-btn.active { border-color: var(--teal); background: rgba(100,210,255,.08); color: #fff; }
.ios-cat-emoji { font-size: 1.3rem; }
.ios-cat-btn span:last-child { font-size: .65rem; font-weight: 600; }
.ios-btn-full { width: 100%; padding: .85rem; border-radius: 14px; border: none; color: #fff; font-size: .85rem; font-weight: 700; cursor: pointer; transition: all .2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: .5rem; }
.ios-btn-full:hover { filter: brightness(1.1); }
.ios-btn-full:active { transform: scale(.98); }
.ios-btn-full:disabled { opacity: .5; cursor: not-allowed; }
.ios-btn-secondary { flex: 1; padding: .75rem; border-radius: 14px; border: none; background: var(--surface2); color: var(--text2); font-size: .85rem; font-weight: 600; cursor: pointer; transition: all .2s; font-family: inherit; }
.ios-btn-secondary:hover { background: var(--surface3); }
.ios-btn-row { display: flex; gap: .5rem; margin-top: .5rem; }
.ios-label { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--text3); }
.ios-bank-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .35rem; margin-bottom: .5rem; }
.ios-color-row { display: flex; gap: .5rem; flex-wrap: wrap; }
.ios-color-dot { width: 2.25rem; height: 2.25rem; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: all .2s; }
.ios-color-dot:hover { transform: scale(1.15); }
.ios-color-dot.active { border-color: #fff; transform: scale(1.15); box-shadow: 0 0 12px rgba(255,255,255,.2); }
.ios-divider { border: none; border-top: .5px solid var(--sep); margin: .5rem 0; }
.ios-inline-form { display: flex; gap: .5rem; align-items: stretch; }
.ios-inline-form .ios-input-big { padding-left: .75rem; text-align: left; }
.ios-search-wrap { position: relative; display: flex; align-items: center; gap: .5rem; }
.ios-search-wrap > span { position: absolute; left: .75rem; font-size: .85rem; }
.ios-search-wrap .ios-input { padding-left: 2rem; }
.ios-search-wrap .ios-spinner { position: absolute; right: .75rem; }
.ios-user-list { display: flex; flex-direction: column; gap: .35rem; max-height: 40vh; overflow-y: auto; }
.ios-user-avatar { width: 2.25rem; height: 2.25rem; border-radius: 50%; background: rgba(10,132,255,.12); display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; color: var(--blue); flex-shrink: 0; }
.ios-loading-inline { display: flex; align-items: center; justify-content: center; gap: .75rem; padding: 2rem; color: var(--text3); font-size: .85rem; }
.ios-alert-row { display: flex; align-items: center; gap: .65rem; background: rgba(255,255,255,.02); border: .5px solid var(--sep); border-radius: 12px; padding: .65rem .75rem; }
.ios-alert-row-icon { width: 2rem; height: 2rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: .85rem; flex-shrink: 0; }
.ios-alert-row-body { flex: 1; min-width: 0; }
.ios-alert-row-top { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; font-weight: 600; margin-bottom: .3rem; }

/* Transitions */
.ios-modal-enter-active { transition: all .35s cubic-bezier(.2,1,.3,1); }
.ios-modal-leave-active { transition: all .25s ease; }
.ios-modal-enter-from, .ios-modal-leave-to { opacity: 0; }
.ios-modal-enter-from .ios-modal-card { transform: translateY(30px) scale(.97); }
.ios-modal-leave-to .ios-modal-card { transform: translateY(10px) scale(.99); }
.ios-step-enter-active, .ios-step-leave-active { transition: all .2s ease; }
.ios-step-enter-from { opacity: 0; transform: translateX(12px); }
.ios-step-leave-to { opacity: 0; transform: translateX(-12px); }
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
`

fs.writeFileSync('src/views/_css.txt', css, 'utf8')
console.log('CSS written:', css.length, 'chars')
