// Animated "Add to Home Screen" demo (iPhone Safari + Android Chrome) for DinoMeals.
// makeDemo(el, {platform:'ios'|'android', lang:'en'|'es', icon}) → { setPlatform, setLang, restart }
// Animated "Add to Home Screen" demo used by the Dino guide (components/HomeScreenGuide.js).
// Plain DOM so it can be shared with the marketing videos; call only in the browser.

const W = 260, H = 540;
const T = {
  en: {
    open: 'Open dinomeals.app in Safari', openA: 'Open dinomeals.app in Chrome',
    share: 'Tap the Share button', menu: 'Tap the ⋮ menu',
    scroll: 'Scroll down and tap “Add to Home Screen”', addA: 'Tap “Add to Home screen” (or “Install app”)',
    add: 'Tap “Add”', addA2: 'Tap “Add”', done: 'Done! Open DinoMeals like an app 🦖',
    ahs: 'Add to Home Screen', ahsA: 'Add to Home screen', cancel: 'Cancel', addBtn: 'Add',
    note: 'An icon will be added to your Home Screen so you can quickly access this website.',
    sheet: ['Copy', 'Add to Reading List', 'Add Bookmark', 'Add to Favorites', 'Find on Page', 'Markup', 'Print'],
    menuItems: ['New tab', 'New Incognito tab', 'History', 'Downloads', 'Bookmarks', 'Share…', 'Find in page', 'Desktop site', 'Settings'],
  },
  es: {
    open: 'Abre dinomeals.app en Safari', openA: 'Abre dinomeals.app en Chrome',
    share: 'Toca el botón Compartir', menu: 'Toca el menú ⋮',
    scroll: 'Baja y toca “Agregar a inicio”', addA: 'Toca “Agregar a la pantalla principal” (o “Instalar app”)',
    add: 'Toca “Agregar”', addA2: 'Toca “Agregar”', done: '¡Listo! Abre DinoMeals como una app 🦖',
    ahs: 'Agregar a inicio', ahsA: 'Agregar a la pantalla principal', cancel: 'Cancelar', addBtn: 'Agregar',
    note: 'Se agregará un ícono a tu pantalla de inicio para que entres rápido a este sitio.',
    sheet: ['Copiar', 'Agregar a lista de lectura', 'Agregar marcador', 'Agregar a favoritos', 'Buscar en la página', 'Marcado', 'Imprimir'],
    menuItems: ['Nueva pestaña', 'Nueva pestaña de incógnito', 'Historial', 'Descargas', 'Favoritos', 'Compartir…', 'Buscar en la página', 'Sitio de escritorio', 'Configuración'],
  },
};
const CSS = `
.dmx{position:relative;width:${W}px;height:${H}px;border-radius:34px;overflow:hidden;background:#121110;font-family:-apple-system,system-ui,'Segoe UI',Roboto,sans-serif;color:#f4ede1;user-select:none;-webkit-user-select:none;transform-origin:top left}
.dmx *{box-sizing:border-box}
.dmx .st{position:absolute;top:0;left:0;right:0;height:30px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font-size:11px;font-weight:600;z-index:8}
.dmx .st i{font-style:normal;letter-spacing:1px}
.dmx .pg{position:absolute;inset:0;padding:40px 16px 0;background:radial-gradient(120% 60% at 50% 25%,#2a1310,#121110 65%)}
.dmx.android .pg{padding-top:84px}
.dmx .pg .mk{width:74px;height:74px;border-radius:50%;background:#f6efe3;margin:18px auto 0;display:grid;place-items:center;box-shadow:0 0 0 3px #9e2019,0 0 30px rgba(226,55,45,.35)}
.dmx .pg .mk img{width:58px}
.dmx .pg h4{font:400 26px/1 Anton,Impact,'Arial Narrow',sans-serif;text-align:center;margin:12px 0 2px;letter-spacing:.02em}
.dmx .pg h4 b{color:#e2372d;font-weight:400}
.dmx .pg p{font-size:10px;color:#a89e90;text-align:center}
.dmx .pg .cta{margin:16px auto 0;width:150px;background:#e2372d;border-radius:99px;text-align:center;padding:9px 0;font:400 13px Anton,Impact,sans-serif;letter-spacing:.08em}
.dmx .pg .rows div{height:34px;border-radius:10px;background:#1f1c19;border:1px solid #342f2a;margin-top:8px}
.dmx .pg .rows{margin-top:16px}
/* iOS Safari bars */
.dmx .sf{position:absolute;left:0;right:0;bottom:0;height:96px;background:rgba(28,26,25,.96);border-top:1px solid #2c2926;z-index:3}
.dmx .sf .url{margin:8px 12px 0;height:34px;border-radius:12px;background:#2d2a28;display:flex;align-items:center;justify-content:center;font-size:12px;gap:5px}
.dmx .sf .url small{font-size:10px;color:#a89e90}
.dmx .sf .tb{display:flex;justify-content:space-around;align-items:center;height:44px;padding:0 6px}
.dmx .sf .tb svg{width:20px;height:20px;stroke:#4c9dff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.dmx .sf .tb .dim svg{stroke:#555}
/* Android Chrome bar */
.dmx .cr{position:absolute;left:0;right:0;top:30px;height:48px;background:#1d1b1a;display:flex;align-items:center;gap:8px;padding:0 10px;z-index:3;border-bottom:1px solid #2c2926}
.dmx .cr .url{flex:1;height:32px;border-radius:16px;background:#2d2a28;display:flex;align-items:center;padding:0 12px;font-size:12px;gap:6px}
.dmx .cr .dots{width:22px;text-align:center;font-size:18px;line-height:1;font-weight:700}
/* share sheet (iOS) */
.dmx .sh{position:absolute;left:0;right:0;bottom:0;height:78%;background:#1c1c1e;border-radius:16px 16px 0 0;transform:translateY(105%);transition:transform .45s cubic-bezier(.2,.8,.2,1);z-index:5;overflow:hidden;padding:12px 12px 0}
.dmx.s-sheet .sh{transform:none}
.dmx .sh .hd{display:flex;gap:10px;align-items:center;padding-bottom:10px;border-bottom:1px solid #2c2c2e}
.dmx .sh .hd img{width:38px;height:38px;border-radius:9px;background:#f6efe3}
.dmx .sh .hd b{display:block;font-size:12px}.dmx .sh .hd small{font-size:10px;color:#8e8e93}
.dmx .sh .apps{display:flex;gap:12px;padding:12px 2px}
.dmx .sh .apps span{width:42px;height:42px;border-radius:50%;display:block}
.dmx .sh .lst{transition:transform .6s ease}
.dmx.s-scroll .sh .lst{transform:translateY(-118px)}
.dmx .sh .row{display:flex;justify-content:space-between;align-items:center;background:#2c2c2e;padding:0 12px;height:38px;font-size:12px;border-bottom:1px solid #1c1c1e}
.dmx .sh .row:first-child{border-radius:10px 10px 0 0}.dmx .sh .row:last-child{border-radius:0 0 10px 10px}
.dmx .sh .grp{margin-bottom:10px}
.dmx .sh .row svg{width:16px;height:16px;stroke:#f4ede1;fill:none;stroke-width:1.8}
.dmx .row.hit{background:#3a3a3c}
/* Chrome menu (Android) */
.dmx .mn{position:absolute;top:34px;right:6px;width:206px;background:#2b2927;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,.6);z-index:5;transform-origin:top right;transform:scale(.6);opacity:0;transition:transform .25s,opacity .25s;padding:4px 0}
.dmx.s-menu .mn{transform:none;opacity:1}
.dmx .mn .ic{display:flex;justify-content:space-around;padding:8px 6px;border-bottom:1px solid #3a3735;font-size:13px;color:#cfc8bd}
.dmx .mn div.it{padding:0 12px;height:30px;display:flex;align-items:center;font-size:11.5px;white-space:nowrap;overflow:hidden}
.dmx .mn div.it.hit{background:#3d3a37}
/* add dialog iOS */
.dmx .dg{position:absolute;inset:0;background:#000;z-index:6;transform:translateY(105%);transition:transform .45s cubic-bezier(.2,.8,.2,1);padding-top:30px}
.dmx.s-dialog .dg{transform:none}
.dmx .dg .bar{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-size:12px;background:#1c1c1e}
.dmx .dg .bar a{color:#4c9dff}.dmx .dg .bar b{font-size:12px}
.dmx .dg .bar a.add{font-weight:700}
.dmx .dg .card{margin:18px 14px 8px;background:#1c1c1e;border-radius:12px;padding:12px;display:flex;gap:12px;align-items:center}
.dmx .dg .card img{width:56px;height:56px;border-radius:13px}
.dmx .dg .card .nm{font-size:13px;border-bottom:1px solid #3a3a3c;padding-bottom:6px;margin-bottom:6px}
.dmx .dg .card small{font-size:10px;color:#8e8e93}
.dmx .dg p{font-size:10px;color:#8e8e93;padding:0 18px;line-height:1.4}
/* add dialog Android */
.dmx .ad{position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:6;display:grid;place-items:center;opacity:0;transition:opacity .25s;pointer-events:none}
.dmx.s-dialog .ad{opacity:1}
.dmx .ad .box{width:220px;background:#2b2927;border-radius:22px;padding:18px 18px 10px;transform:scale(.9);transition:transform .25s}
.dmx.s-dialog .ad .box{transform:none}
.dmx .ad h5{font-size:15px;font-weight:500;margin:0 0 14px}
.dmx .ad .r{display:flex;gap:10px;align-items:center;margin-bottom:16px}
.dmx .ad .r img{width:40px;height:40px;border-radius:50%}
.dmx .ad .r div{flex:1;border-bottom:2px solid #8ab4f8;font-size:13px;padding:4px 0}
.dmx .ad .bt{display:flex;justify-content:flex-end;gap:18px;font-size:12px;color:#8ab4f8;font-weight:600;padding:6px 4px}
/* home screen */
.dmx .hm{position:absolute;inset:0;z-index:7;opacity:0;transition:opacity .45s;background:linear-gradient(160deg,#3b1d16 0%,#1a1110 55%,#0d0b0a 100%);padding:46px 16px 0}
.dmx.s-home .hm{opacity:1}
.dmx .hm .gr{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 10px}
.dmx .hm .ap{text-align:center;font-size:8.5px;color:#eee}
.dmx .hm .ap span{display:block;width:44px;height:44px;border-radius:11px;margin:0 auto 4px}
.dmx.android .hm .ap span{border-radius:50%}
.dmx .hm .ap img{width:44px;height:44px;border-radius:11px;display:block;margin:0 auto 4px}
.dmx.android .hm .ap img{border-radius:50%}
.dmx .hm .new{transform:scale(0);opacity:0}
.dmx.s-pop .hm .new{animation:dmxpop .6s cubic-bezier(.3,1.6,.5,1) forwards}
.dmx .hm .new img{box-shadow:0 0 0 2px rgba(226,55,45,.0)}
.dmx.s-pop .hm .new img{animation:dmxglow 1.6s .5s ease-out}
@keyframes dmxpop{to{transform:none;opacity:1}}
@keyframes dmxglow{0%{box-shadow:0 0 0 0 rgba(255,138,61,.9)}100%{box-shadow:0 0 0 18px rgba(255,138,61,0)}}
.dmx .hm .dock{position:absolute;left:12px;right:12px;bottom:12px;height:62px;border-radius:22px;background:rgba(255,255,255,.12);display:flex;justify-content:space-around;align-items:center}
.dmx .hm .dock span{width:44px;height:44px;border-radius:11px;display:block}
.dmx.android .hm .dock{background:none}.dmx.android .hm .dock span{border-radius:50%}
/* finger + caption */
.dmx .fg{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.85);z-index:9;transition:left .55s cubic-bezier(.4,0,.2,1),top .55s cubic-bezier(.4,0,.2,1),opacity .3s,transform .12s;opacity:0;box-shadow:0 2px 10px rgba(0,0,0,.4)}
.dmx .fg.on{opacity:1}.dmx .fg.tap{transform:scale(.72);background:rgba(255,138,61,.6)}
.dmx .cap{position:absolute;left:10px;right:10px;top:38%;z-index:10;text-align:center;pointer-events:none}
.dmx .cap div{display:inline-block;background:rgba(18,17,16,.92);border:1px solid #e2372d;color:#fff;border-radius:14px;padding:8px 12px;font-size:12.5px;font-weight:700;line-height:1.3;box-shadow:0 8px 24px rgba(0,0,0,.5);opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s}
.dmx .cap div.on{opacity:1;transform:none}
.dmx .cap .n{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#e2372d;font-size:10px;margin-right:6px;vertical-align:1px}
.dmx .cap.low{top:auto;bottom:24%}
`;
let cssDone = false;
const ICONS = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  fwd: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M8 10H6v10h12V10h-2"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1z"/><path d="M12 6v14"/></svg>',
  tabs: '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="13" height="13" rx="2"/><path d="M8 4h10a2 2 0 012 2v10"/></svg>',
  plusSq: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
};
const COLORS = ['#3a7bd5', '#47c27a', '#f2b33d', '#8e5cf7', '#ff6b6b', '#2bb3c0', '#e86fb8', '#7a7a7a', '#5ac8fa', '#ff9f0a', '#30d158', '#bf5af2'];

function build(p, lang, icon) {
  const t = T[lang];
  const ios = p === 'ios';
  const apps = (n, off = 0) => Array.from({ length: n }, (_, i) => `<div class="ap"><span style="background:${COLORS[(i + off) % COLORS.length]}"></span>${['Photos', 'Maps', 'Notes', 'Music', 'Mail', 'Clock', 'Camera', 'Settings', 'Weather', 'Calendar', 'Wallet', 'Podcasts'][(i + off) % 12]}</div>`).join('');
  return `
    <div class="st"><span>9:41</span><i>${ios ? '•••• ▮' : '▾ ▮'}</i></div>
    <div class="pg"><div class="mk"><img src="${icon}" alt=""></div><h4><b>DINO</b> MEALS</h4><p>Meal prep with bite · Riverside, CA</p><div class="cta">ORDER NOW</div><div class="rows"><div></div><div></div><div></div></div></div>
    ${ios ? `
    <div class="sf"><div class="url">🔒 dinomeals.app</div><div class="tb"><span>${ICONS.back}</span><span class="dim">${ICONS.fwd}</span><span class="shr">${ICONS.share}</span><span>${ICONS.book}</span><span>${ICONS.tabs}</span></div></div>
    <div class="sh"><div class="hd"><img src="${icon}" alt=""><div><b>DinoMeals — Meal Prep</b><small>dinomeals.app</small></div></div>
      <div class="apps"><span style="background:#2c7be5"></span><span style="background:#30d158"></span><span style="background:#4c9dff"></span><span style="background:#f2b33d"></span><span style="background:#666"></span></div>
      <div class="lst"><div class="grp">${t.sheet.slice(0, 4).map((x) => `<div class="row">${x}</div>`).join('')}</div>
      <div class="grp"><div class="row">${t.sheet[4]}</div><div class="row ahs">${t.ahs} ${ICONS.plusSq}</div><div class="row">${t.sheet[5]}</div><div class="row">${t.sheet[6]}</div></div></div></div>
    <div class="dg"><div class="bar"><a>${t.cancel}</a><b>${t.ahs}</b><a class="add">${t.addBtn}</a></div>
      <div class="card"><img src="${icon}" alt=""><div style="flex:1"><div class="nm">DinoMeals</div><small>https://dinomeals.app</small></div></div><p>${t.note}</p></div>
    ` : `
    <div class="cr"><div class="url">🔒 dinomeals.app</div><div class="dots">⋮</div></div>
    <div class="mn"><div class="ic"><span>→</span><span>☆</span><span>⤓</span><span>ⓘ</span><span>↻</span></div>
      ${t.menuItems.slice(0, 7).map((x) => `<div class="it">${x}</div>`).join('')}<div class="it ahs">${t.ahsA}</div>${t.menuItems.slice(7).map((x) => `<div class="it">${x}</div>`).join('')}</div>
    <div class="ad"><div class="box"><h5>${t.ahsA}</h5><div class="r"><img src="${icon}" alt=""><div>DinoMeals</div></div><div class="bt"><span>${t.cancel.toUpperCase()}</span><span class="add">${t.addBtn.toUpperCase()}</span></div></div></div>
    `}
    <div class="hm"><div class="gr">${apps(11)}<div class="ap new"><img src="${icon}" alt="">DinoMeals</div></div><div class="dock"><span style="background:#30d158"></span><span style="background:#4c9dff"></span><span style="background:#ff9f0a"></span><span style="background:#e2372d"></span></div></div>
    <div class="fg"></div>
    <div class="cap"><div></div></div>`;
}

export function makeDemo(host, opts = {}) {
  if (!cssDone) { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); cssDone = true; }
  let platform = opts.platform || 'ios', lang = opts.lang || 'en';
  const icon = opts.icon;
  const root = document.createElement('div');
  host.appendChild(root);
  let timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  function pos(el) { // center of an element relative to the demo
    const r = el.getBoundingClientRect(), b = root.getBoundingClientRect(), k = b.width / W;
    return [(r.left - b.left + r.width / 2) / k, (r.top - b.top + r.height / 2) / k];
  }
  function run() {
    timers.forEach(clearTimeout); timers = [];
    const t = T[lang];
    root.className = `dmx ${platform}`;
    root.innerHTML = build(platform, lang, icon);
    const fg = root.querySelector('.fg'), capBox = root.querySelector('.cap'), cap = capBox.firstElementChild;
    const say = (n, text, low) => { cap.classList.remove('on'); later(120, () => { cap.innerHTML = `<span class="n">${n}</span>${text}`; capBox.classList.toggle('low', !!low); cap.classList.add('on'); }); };
    const move = (sel, dx = 0, dy = 0) => { const [x, y] = pos(root.querySelector(sel)); fg.style.left = x + dx + 'px'; fg.style.top = y + dy + 'px'; fg.classList.add('on'); };
    const tap = (hitSel) => { fg.classList.add('tap'); if (hitSel) root.querySelector(hitSel).classList.add('hit'); later(160, () => fg.classList.remove('tap')); };
    const st = (c) => root.classList.add(c);
    fg.style.left = W / 2 + 'px'; fg.style.top = H * 0.62 + 'px';
    if (platform === 'ios') {
      say(1, t.open);
      later(1500, () => { say(2, t.share, true); move('.shr'); });
      later(2600, () => tap());
      later(2800, () => { st('s-sheet'); fg.classList.remove('on'); });
      later(3400, () => { say(3, t.scroll); fg.style.left = '130px'; fg.style.top = '470px'; fg.classList.add('on'); });
      later(3900, () => { fg.style.top = '360px'; st('s-scroll'); });
      later(4700, () => move('.ahs'));
      later(5400, () => tap('.ahs'));
      later(5700, () => { st('s-dialog'); fg.classList.remove('on'); });
      later(6200, () => { say(4, t.add); move('.dg .add'); });
      later(7200, () => tap());
      later(7500, () => { st('s-home'); fg.classList.remove('on'); cap.classList.remove('on'); });
      later(8000, () => st('s-pop'));
      later(8500, () => say('✓', t.done, true));
      later(11500, run);
    } else {
      say(1, t.openA);
      later(1500, () => { say(2, t.menu); move('.dots'); });
      later(2500, () => tap());
      later(2700, () => { st('s-menu'); fg.classList.remove('on'); });
      later(3200, () => { say(3, t.addA, true); move('.mn .ahs'); });
      later(4300, () => tap('.mn .ahs'));
      later(4600, () => { st('s-dialog'); root.classList.remove('s-menu'); fg.classList.remove('on'); });
      later(5100, () => { say(4, t.addA2, true); move('.ad .add'); });
      later(6100, () => tap());
      later(6400, () => { st('s-home'); fg.classList.remove('on'); cap.classList.remove('on'); });
      later(6900, () => st('s-pop'));
      later(7400, () => say('✓', t.done, true));
      later(10400, run);
    }
  }
  run();
  return {
    el: root,
    setPlatform(p) { platform = p; run(); },
    setLang(l) { lang = l; run(); },
    restart: run,
    stop() { timers.forEach(clearTimeout); },
  };
}
