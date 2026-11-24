/* Sincronização dos controles com o Firebase (login + Firestore).
   Cada página carrega este arquivo com data-app="nome-do-controle".
   Os dados ficam em users/{seu uid}/apps/{controle}/... e só a sua conta lê e grava. */
(function () {
  var me = document.currentScript;
  var APP = (me && me.dataset.app) || "geral";
  var SHOW_USER = !!(me && me.dataset.showUser);
  var cfg = window.FIREBASE_CONFIG;
  /* Confirmação visual para os botões de salvar/lançar de todas as páginas:
     ui.done(botão, "Salvo")  → botão fica verde com ✓ por 2 s e aparece um aviso embaixo da tela
     ui.toast("texto")        → só o aviso */
  (function () {
    var st = document.createElement("style");
    st.textContent = ".ui-ok{background:#15803D!important;border-color:#15803D!important;color:#fff!important;opacity:1!important;transition:background .2s}" +
      ".ui-toast{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;z-index:99;background:#13203B;color:#fff;font:600 14px system-ui,sans-serif;padding:10px 16px;border-radius:9px;box-shadow:0 6px 20px rgba(0,0,0,.25);transition:opacity .2s,transform .2s;max-width:calc(100% - 32px);text-align:center;pointer-events:none}" +
      ".ui-toast.on{opacity:1;transform:translate(-50%,0)}.ui-toast.err{background:#E11D48}" +
      /* efeito de clique em todos os botões: afunda e volta */
      "button,.btn,a.calc{transition:transform .08s ease,filter .08s ease,box-shadow .08s ease;-webkit-tap-highlight-color:transparent}" +
      "button:not([disabled]):active,.btn:active,a.calc:active,.ui-press{transform:scale(.95);filter:brightness(.88)}" +
      ".ui-busy{position:relative;pointer-events:none;opacity:.85}" +
      ".ui-spin{display:inline-block;width:13px;height:13px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;vertical-align:-2px;margin-right:6px;animation:uispin .7s linear infinite}" +
      "@keyframes uispin{to{transform:rotate(360deg)}}" +
      /* "← Meus Controles" fixo no topo enquanto rola a página */
      "html,body{overflow-x:clip!important}" +
      ".wrap{grid-template-columns:minmax(0,1fr)}.panel{min-width:0;max-width:100%;grid-template-columns:minmax(0,1fr)}.panel>*,.wrap>*{min-width:0;max-width:100%}input[type=file]{max-width:100%;min-width:0}img,canvas,video{max-width:100%}" +
      ".voltar{display:none!important}" +
      /* visual mais vivo em todas as páginas */
      "body{background-image:radial-gradient(900px 420px at 0% -8%,rgba(37,99,235,.16),transparent 62%),radial-gradient(800px 380px at 100% 0%,rgba(124,58,237,.12),transparent 60%),radial-gradient(700px 500px at 50% 110%,rgba(34,197,94,.08),transparent 60%);background-attachment:fixed}" +
      ".panel,.wrap>.grid>a,.step,.it,.ib{box-shadow:0 1px 2px rgba(19,32,59,.05),0 6px 18px -6px rgba(37,99,235,.18)}" +
      "h1{background:linear-gradient(90deg,#2563EB,#7C3AED);-webkit-background-clip:text;background-clip:text;color:transparent!important}" +
      "@media (prefers-color-scheme: dark){h1{background:linear-gradient(90deg,#60A5FA,#C4B5FD);-webkit-background-clip:text;background-clip:text}.panel,.wrap>.grid>a,.step,.it{box-shadow:0 6px 18px -8px rgba(0,0,0,.6)}}";
    (document.head || document.documentElement).appendChild(st);
    var box, tmr;
    function toast(msg, err) {
      if (!document.body) return;
      if (!box) { box = document.createElement("div"); box.className = "ui-toast"; box.setAttribute("role", "status"); document.body.appendChild(box); }
      box.textContent = msg; box.classList.toggle("err", !!err);
      box.classList.add("on"); clearTimeout(tmr); tmr = setTimeout(function () { box.classList.remove("on"); }, 2200);
    }
    function done(btn, label, keep) {
      if (btn && !btn.isConnected) btn = null;
      if (btn) {
        if (btn._uiT) clearTimeout(btn._uiT); else btn._uiOld = btn.innerHTML;
        btn.classList.add("ui-ok"); btn.innerHTML = "✓ " + (label || "Salvo");
        if (!keep) btn._uiT = setTimeout(function () { btn.classList.remove("ui-ok"); btn.innerHTML = btn._uiOld; btn._uiT = null; }, 2000);
      }
      toast("✓ " + (label || "Salvo"));
    }
    /* "apertado" visível também no celular (o :active do iPhone precisa de touchstart) */
    document.addEventListener("touchstart", function () {}, { passive: true });
    document.addEventListener("pointerdown", function (e) {
      var b = e.target.closest && e.target.closest("button,.btn"); if (!b || b.disabled) return;
      b.classList.add("ui-press"); setTimeout(function () { b.classList.remove("ui-press"); }, 140);
    }, true);
    function busy(btn, label) {
      if (!btn) return function () {};
      var old = btn.innerHTML; btn.classList.add("ui-busy"); btn.innerHTML = "<span class='ui-spin'></span>" + (label || "Aguarde…");
      return function () { btn.classList.remove("ui-busy"); btn.innerHTML = old; };
    }
    window.ui = { toast: toast, done: done, busy: busy };
  })();


  /* ===== Layout de site: barra de topo com menu + página em tela cheia (PC, celular em pé e deitado) ===== */
  (function () {
    var file = (decodeURIComponent(location.pathname).split("/").pop() || "index.html").replace(/\.html?$/i, "") || "index";
    document.documentElement.setAttribute("data-page", file);
    var GROUPS = [
      { g: "Opções binárias", s: "OB", k: "ob", c: "#2563EB", items: [["checklist-ob", "Check-list"], ["diario-ob", "Diário"], ["manual-ob", "Manual"], ["progresso-ob", "Progresso"], ["dopamina", "Dopamina"], ["ir-ob", "IR"], ["analise-ob", "Análise"], ["lucro-ob", "Lucro"]] },
      { g: "B3", s: "B3", k: "b3", c: "#0F766E", items: [["checklist-b3", "Check-list"], ["diario-b3", "Diário"], ["manual-b3", "Manual"], ["progresso-b3", "Progresso"], ["dopamina-b3", "Dopamina"], ["ir-b3", "IR"], ["analise-b3", "Análise"], ["lucro-b3", "Lucro"]] },
      { g: "Forex", s: "FX", k: "fx", c: "#0369A1", items: [["checklist-fx", "Check-list"], ["diario-fx", "Diário"], ["manual-fx", "Manual"], ["progresso-fx", "Progresso"], ["dopamina-fx", "Dopamina"], ["ir-fx", "IR"], ["analise-fx", "Análise"], ["lucro-fx", "Lucro"]] },
      { g: "Pessoal", s: "Pessoal", k: "pes", c: "#7C3AED", items: [["salario", "Salário"], ["oracao", "Oração"], ["receitas", "Receitas"], ["limpeza", "Limpeza de peças"], ["compras", "Compras"], ["consorcio", "Consórcios"], ["exercicios", "Exercícios"], ["notas", "Notas"]] }
    ];
    var DESC = { "checklist-ob": "Uma vez por dia", "diario-ob": "6 sessões por dia", "manual-ob": "Os 5 operacionais", "progresso-ob": "Escada e simulador", "dopamina": "Acertei ou errei", "ir-ob": "Resultado mensal", "analise-ob": "Print e seta na vela", "lucro-ob": "Excel da Quotex",
      "checklist-b3": "Uma vez por dia", "diario-b3": "Operações em R$", "manual-b3": "M2 · stop e alvo 2x", "progresso-b3": "Contratos e simulador", "dopamina-b3": "Acertei ou errei", "ir-b3": "Day trade · DARF", "analise-b3": "Print e seta na vela", "lucro-b3": "Extrato · com taxas",
      "checklist-fx": "Uma vez por dia", "diario-fx": "Operações em US$", "manual-fx": "M2 · stop e alvo 2x", "progresso-fx": "Lote e simulador", "dopamina-fx": "Acertei ou errei", "ir-fx": "15% ao ano", "analise-fx": "Print e seta na vela", "lucro-fx": "Dia a dia em US$ e R$",
      "salario": "Danrlei e Cristiane", "oracao": "Noite e consagração", "receitas": "Caderno de receitas", "limpeza": "Lotes e valor", "consorcio": "Simular e acompanhar", "exercicios": "5 degraus", "compras": "Marcar o que pegou", "notas": "Bloco de anotações" };
    var P = function (d) { return "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" + d + "</svg>"; };
    var ICO = { "Check-list": P("<rect x='4' y='3' width='16' height='18' rx='3'/><path d='M8.5 12l2.5 2.5 4.5-5'/>"), "Diário": P("<path d='M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z'/><path d='M5 17a3 3 0 013-3h11M9 8h6'/>"),
      "Manual": P("<path d='M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6z'/><path d='M12 6v14.5'/>"), "Progresso": P("<path d='M4 20h4v-5h4v-5h4V5h4'/><path d='M4 20V16'/>"),
      "Dopamina": P("<path d='M13 2L4 14h7l-1 8 9-12h-7z'/>"), "IR": P("<path d='M6 2h12v20l-3-2-3 2-3-2-3 2z'/><path d='M9 8h6M9 12h6M9 16h3'/>"), "Análise": P("<circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='3.5'/><path d='M12 2v3M12 19v3M2 12h3M19 12h3'/>"),
      "Lucro": P("<path d='M3 20h18'/><path d='M4 16l5-5 4 3 7-8'/><path d='M15 6h5v5'/>"), "Salário": P("<rect x='3' y='6' width='18' height='13' rx='3'/><path d='M16 12.5h2M3 10h18'/>"), "Oração": P("<path d='M12 3v18M7 8h10'/>"),
      "Receitas": P("<path d='M6 13a6 6 0 1112 0v6H6z'/><path d='M6 16h12'/>"), "Limpeza de peças": P("<path d='M14 3l7 7-9 9H5v-7z'/><path d='M10 7l7 7'/>"), "Consórcios": P("<circle cx='9' cy='9' r='5'/><circle cx='15' cy='15' r='5'/>"), "Exercícios": P("<path d='M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12'/>"), "Compras": P("<path d='M3 4h2l2.4 11h10.2L20 8H6.2'/><circle cx='9' cy='19.5' r='1.5'/><circle cx='17' cy='19.5' r='1.5'/>"), "Notas": P("<path d='M6 3h9l4 4v14H6z'/><path d='M14 3v5h5M9 12h7M9 16h5'/>") };
    window.__MC = { GROUPS: GROUPS, ICO: ICO, DESC: DESC };
    /* 19/11/2026: escolher no Menu quais módulos aparecem no painel (fica salvo na conta) */
    var VIS_LS = "mc.modOcultos";
    function visGet() { try { var a = JSON.parse(localStorage.getItem(VIS_LS) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function visAvisa() { try { document.dispatchEvent(new CustomEvent("mc-mods")); } catch (e) {} }
    function visSet(a, local) {
      try { localStorage.setItem(VIS_LS, JSON.stringify(a)); } catch (e) {}
      visAvisa();
      if (!local) salvarConta();
    }
    /* 23/11/2026: ordem dos módulos (painel e menu), escolhida no Menu e salva na conta */
    var ORD_LS = "mc.modOrdem";
    function ordGet() { try { var a = JSON.parse(localStorage.getItem(ORD_LS) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function grupos() {
      var o = ordGet(), p = function (k) { var i = o.indexOf(k); return i < 0 ? 99 : i; };
      return GROUPS.map(function (g, i) { return { g: g, i: i }; }).sort(function (a, b) { return p(a.g.k) - p(b.g.k) || a.i - b.i; }).map(function (x) { return x.g; });
    }
    function ordSet(a, local) {
      try { localStorage.setItem(ORD_LS, JSON.stringify(a)); } catch (e) {}
      visAvisa();
      if (!local) salvarConta();
    }
    function mover(k, dir) {
      var a = grupos().map(function (g) { return g.k; }), i = a.indexOf(k), j = i + dir;
      if (i < 0 || j < 0 || j >= a.length) return;
      a[i] = a[j]; a[j] = k; ordSet(a);
    }
    function salvarConta() {
      if (window.claude) window.claude.use("db").then(function (d) { if (d && d.app) d.app("geral").doc("config/modulos").set({ ocultos: visGet(), ordem: ordGet(), em: new Date().toISOString() }).catch(function () {}); });
    }
    window.__mcVis = { get: visGet, set: visSet, grupos: grupos, ordem: ordGet, setOrdem: ordSet, mover: mover };
    setTimeout(function () {
      if (window.claude) window.claude.use("db").then(function (d) {
        if (!d || !d.app) return;
        d.app("geral").doc("config/modulos").onSnapshot(function (x) {
          if (!x.exists) { if (visGet().length || ordGet().length) salvarConta(); return; }
          var dd = x.data() || {}, r = dd.ocultos || [], ro = dd.ordem;
          if (Array.isArray(ro) && JSON.stringify(ro) !== JSON.stringify(ordGet())) { try { localStorage.setItem(ORD_LS, JSON.stringify(ro)); } catch (e) {} if (JSON.stringify(r) === JSON.stringify(visGet())) visAvisa(); }
          else if (!Array.isArray(ro) && ordGet().length) salvarConta();
          if (JSON.stringify(r) !== JSON.stringify(visGet())) visSet(r, true);
        }, function () {});
      });
    }, 0);
    /* 03/11/2026: guarda quando cada página foi aberta ("Usados por último") e usa a ordem escolhida no módulo também no menu */
    if (file !== "index") { try { var us = JSON.parse(localStorage.getItem("mc.usados") || "{}"); us[file] = Date.now(); localStorage.setItem("mc.usados", JSON.stringify(us)); } catch (e) {} }
    function ordemItens(g) {
      var o = {}, us = {}; try { o = (JSON.parse(localStorage.getItem("mc.ordem") || "{}"))[g.k] || {}; us = JSON.parse(localStorage.getItem("mc.usados") || "{}"); } catch (e) {}
      var it = g.items.map(function (x, i) { return { x: x, i: i }; }), m = o.modo || "padrao";
      if (m === "az") it.sort(function (a, b) { return a.x[1].localeCompare(b.x[1], "pt-BR"); });
      else if (m === "rec") it.sort(function (a, b) { return (us[b.x[0]] || 0) - (us[a.x[0]] || 0) || a.i - b.i; });
      else if (m === "pers" && o.lista) { var pos = function (k) { var i = o.lista.indexOf("p:" + k); return i < 0 ? 999 : i; }; it.sort(function (a, b) { return pos(a.x[0]) - pos(b.x[0]) || a.i - b.i; }); }
      return it.map(function (y) { return y.x; });
    }
    /* 19/11/2026: B3 e Forex viraram módulos separados (cada um com as suas páginas e dados). */
    var mcHref = function (id) { return id; };
    window.__mcHref = mcHref;
    var fileK = file;
    var cur = null;
    GROUPS.forEach(function (g) { g.items.forEach(function (it) { if (it[0] === fileK) cur = { g: g, it: it }; }); });
    if (cur) { document.documentElement.setAttribute("data-group", cur.g.k); document.documentElement.style.setProperty("--gc", cur.g.c); }
    var css =
      /* cores do módulo (OB azul, B3 verde-azulado, Pessoal roxo) no fundo, no título e no logo */
      "html[data-group] body{background-image:radial-gradient(1000px 480px at 0% -8%,color-mix(in srgb,var(--gc) 20%,transparent),transparent 62%),radial-gradient(900px 420px at 100% 0%,color-mix(in srgb,var(--gc) 11%,transparent),transparent 60%)!important}" +
      "html[data-group] h1{background:linear-gradient(90deg,var(--gc),color-mix(in srgb,var(--gc) 50%,#7C3AED))!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important}" +
      /* tom do módulo também nos cartões, linhas, botões e destaques de cada página */
      "html:root[data-group]{--accent:var(--gc);--accent-soft:color-mix(in srgb,var(--gc) 15%,#fff);--surface:color-mix(in srgb,var(--gc) 3%,#fff);--line:color-mix(in srgb,var(--gc) 18%,#DDE4F2);--bg:color-mix(in srgb,var(--gc) 6%,#EEF3FC)}" +
      "@media (prefers-color-scheme: dark){html:root[data-group]:not([data-theme=light]){--accent:color-mix(in srgb,var(--gc) 55%,#fff);--accent-soft:color-mix(in srgb,var(--gc) 38%,#0B1220);--surface:color-mix(in srgb,var(--gc) 9%,#16213A);--line:color-mix(in srgb,var(--gc) 26%,#2A3A5C);--bg:color-mix(in srgb,var(--gc) 5%,#0B1220)}}" +
      "html:root[data-group][data-theme=dark]{--accent:color-mix(in srgb,var(--gc) 55%,#fff);--accent-soft:color-mix(in srgb,var(--gc) 38%,#0B1220);--surface:color-mix(in srgb,var(--gc) 9%,#16213A);--line:color-mix(in srgb,var(--gc) 26%,#2A3A5C);--bg:color-mix(in srgb,var(--gc) 5%,#0B1220)}" +
      "html[data-group] body{min-height:100dvh}" +
      "html[data-group] .panel,html[data-group] .card,html[data-group] .kpi,html[data-group] .box{box-shadow:0 12px 26px -22px var(--gc)}" +
      "html[data-group] .site-logo{background:linear-gradient(135deg,var(--gc),color-mix(in srgb,var(--gc) 55%,#7C3AED))!important}" +
      ":root{--site-max:1680px;--site-pad:clamp(16px,2.6vw,40px);--site-h:58px;--stick:58px}" +
      "html[data-page] .wrap{max-width:var(--site-max)!important;width:100%!important;padding-inline:var(--site-pad)!important;padding-top:20px!important}" +
      ".site-h{position:sticky;top:0;z-index:80;background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--line,#DDE4F2);font-family:'IBM Plex Sans',system-ui,sans-serif;padding-top:env(safe-area-inset-top,0px)}" +
      "@media (prefers-color-scheme: dark){.site-h{background:rgba(15,23,42,.86)}}" +
      ".site-h a{background:none;border:0;padding:0;border-radius:0;position:static;overflow:visible;transform:none;box-shadow:none;display:inline}.site-h a:hover{background:none;border:0;transform:none;box-shadow:none}.site-h a::before{display:none!important}.site-h a span,.site-h a b{font-size:inherit;color:inherit}" +
      ".site-in{max-width:var(--site-max);margin:0 auto;padding:0 var(--site-pad);height:var(--site-h);display:flex;align-items:center;gap:14px}" +
      ".site-h .site-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--fg,#13203B);font:800 1.05rem 'Archivo',system-ui,sans-serif;white-space:nowrap;flex:none}" +
      ".site-logo{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;display:grid;place-items:center;font-size:.78rem;letter-spacing:.02em;box-shadow:0 4px 12px -4px rgba(37,99,235,.6)}" +
      ".site-h .site-logo{color:#fff!important}" +
      ".site-logo svg{width:24px;height:24px;display:block}" +
      ".site-logo{transition:transform .18s ease,box-shadow .18s ease}.site-h .site-brand .t{transition:color .18s ease}" +
      ".site-h .site-brand:hover .site-logo{transform:translateY(-2px) rotate(-6deg) scale(1.06);box-shadow:0 8px 18px -6px rgba(37,99,235,.7)}.site-h .site-brand:hover .t{color:var(--accent,#2563EB)}" +
      ".site-crumb{display:flex;gap:7px;align-items:center;color:var(--muted,#58668A);font-size:.92rem;min-width:0;white-space:nowrap;overflow:hidden}" +
      ".site-crumb .sep{opacity:.5}.site-crumb b{color:var(--fg,#13203B);font-weight:600;overflow:hidden;text-overflow:ellipsis}" +
      ".site-h .site-crumb .tag{font:inherit;display:inline-flex;align-items:center;gap:6px}.site-crumb .tag i{width:8px;height:8px;border-radius:50%}" +
      ".site-quick{display:none;gap:2px;margin-left:auto;align-items:center}" +
      ".site-h .site-quick a{padding:8px 12px;border-radius:9px;text-decoration:none;color:var(--muted,#58668A);font-weight:600;font-size:.88rem;white-space:nowrap}" +
      ".site-h .site-quick a:hover{background:var(--bg,#EEF3FC);color:var(--fg,#13203B)}" +
      ".site-h .site-quick a.on{color:#fff;background:var(--gc,#2563EB)}" +
      ".site-btn{margin-left:auto;flex:none;appearance:none;display:inline-flex;align-items:center;gap:8px;font:600 .9rem 'IBM Plex Sans',system-ui,sans-serif;color:var(--fg,#13203B);background:var(--surface,#fff);border:1px solid var(--line,#DDE4F2);border-radius:10px;padding:8px 14px;cursor:pointer}" +
      ".site-btn:hover,.site-btn[aria-expanded=true]{border-color:var(--accent,#2563EB);color:var(--accent,#2563EB)}" +
      ".site-btn svg{width:18px;height:18px}" +
      ".site-mp+.site-btn{margin-left:6px}.site-h a.site-mp{display:inline-flex!important;align-items:center;gap:8px;padding:8px 14px!important;border:1px solid var(--line,#DDE4F2)!important;border-radius:10px!important;background:var(--surface,#fff)!important;color:var(--fg,#13203B)}.site-h a.site-mp:hover{border-color:var(--gc,var(--accent,#2563EB))!important;color:var(--gc,var(--accent,#2563EB))}@media (max-width:560px){.site-h a.site-mp{padding:8px 10px!important}}" +
      ".site-btn{position:relative}.site-btn.on-line::after{content:'';position:absolute;top:5px;right:5px;width:8px;height:8px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 2px var(--surface,#fff)}" +
      ".site-acct{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:nowrap;border:1px solid var(--line,#DDE4F2);border-radius:10px;padding:10px 12px;background:var(--bg,#EEF3FC)}.site-acct .who{flex:1}" +
      ".site-acct .who{display:flex;align-items:center;gap:10px;min-width:0}.site-acct .who i{width:10px;height:10px;border-radius:50%;background:#22C55E;flex:none}" +
      ".site-acct .who>span{display:grid;min-width:0}.site-acct small{font-size:.72rem;color:var(--muted,#58668A);text-transform:uppercase;letter-spacing:.06em}.site-acct b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg,#13203B)}" +
      ".site-inst{display:flex;align-items:center;gap:10px;flex:1 1 280px;min-width:0;border:1px solid var(--line,#DDE4F2);border-radius:10px;padding:8px 10px 8px 12px;background:var(--bg,#EEF3FC)}.site-inst[hidden]{display:none!important}" +
      ".site-inst img{width:32px;height:32px;border-radius:8px;flex:none}.site-inst .tx{display:grid;flex:1;min-width:0}" +
      ".site-inst small{font-size:.72rem;color:var(--muted,#58668A);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}.site-inst b{font-weight:600;color:var(--fg,#13203B);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".site-inst b.ios{white-space:normal;font-size:.86rem;line-height:1.3}.site-inst-b{appearance:none;flex:none;display:inline-flex;align-items:center;gap:6px;font:600 .9rem 'IBM Plex Sans',system-ui,sans-serif;color:#fff;background:#2563EB;border:1px solid #2563EB;border-radius:9px;padding:8px 14px;cursor:pointer;white-space:nowrap}.site-inst-b:hover{background:#1D4ED8;border-color:#1D4ED8}.site-inst-b svg{width:16px;height:16px}" +
      ".site-h .site-brand .t{overflow:hidden;text-overflow:ellipsis;min-width:0}" +
      "@media (max-width:999px){html[data-group] .site-brand .t{display:none}}" +
      "html[data-page=index]:not([data-g]) .site-h a.site-mp{display:none!important}html[data-page=index]:not([data-g]) .site-mp+.site-btn{margin-left:auto}" +
      ".site-bk{appearance:none;font:600 .9rem 'IBM Plex Sans',system-ui,sans-serif;color:var(--accent,#2563EB);background:transparent;border:1px solid currentColor;border-radius:9px;padding:8px 14px;cursor:pointer;flex:none;white-space:nowrap}.site-bk[disabled]{opacity:.6;cursor:wait}.site-out{appearance:none;font:600 .9rem 'IBM Plex Sans',system-ui,sans-serif;color:#E11D48;background:transparent;border:1px solid #E11D48;border-radius:9px;padding:8px 16px;cursor:pointer}.site-out:hover{background:#E11D48;color:#fff}" +
      /* menu: cartões por área, ícone e descrição em cada página */
      ".site-veil{position:fixed;inset:0;top:calc(var(--site-h) + env(safe-area-inset-top,0px));background:rgba(15,23,42,.34);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);z-index:79;animation:mcFade .18s ease}" +
      ".site-drop{position:absolute;left:0;right:0;top:100%;background:linear-gradient(180deg,var(--surface,#fff),var(--bg,#EEF3FC));border-bottom:1px solid var(--line,#DDE4F2);box-shadow:0 30px 60px -30px rgba(19,32,59,.55);max-height:calc(100dvh - var(--site-h) - env(safe-area-inset-top,0px));overflow:auto;overscroll-behavior:contain;animation:mcDrop .22s cubic-bezier(.2,.8,.2,1)}" +
      "@keyframes mcDrop{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}@keyframes mcFade{from{opacity:0}to{opacity:1}}" +
      ".site-drop-in{max-width:var(--site-max);margin:0 auto;padding:16px var(--site-pad) 26px;display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));align-items:start}" +
      ".site-vis{flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:10px 14px;border-radius:12px;border:1px solid var(--line,#DDE4F2);background:var(--surface,#fff)}" +
      ".site-vis .vh{display:grid;line-height:1.2}.site-vis .vh small{font-size:.72rem;color:var(--muted,#58668A)}.site-vis .vh b{font-size:.9rem;white-space:nowrap}" +
      ".site-vis .vl{display:flex;flex-wrap:wrap;gap:6px}" +
      ".site-vis .vb{appearance:none;display:inline-flex;align-items:center;gap:7px;font:600 .86rem 'IBM Plex Sans',system-ui,sans-serif;color:var(--muted,#58668A);background:var(--bg,#EEF3FC);border:1px solid var(--line,#DDE4F2);border-radius:999px;padding:6px 12px 6px 7px;cursor:pointer;white-space:nowrap}" +
      ".site-vis .vb .ck{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:6px;border:1.5px solid var(--line,#C9D3E6);background:var(--surface,#fff);font-style:normal;font-size:.75rem;color:#fff}" +
      ".site-vis .vb.on{color:var(--fg,#13203B);border-color:var(--gc);background:color-mix(in srgb,var(--gc) 10%,var(--surface,#fff))}" +
      ".site-vis .vb.on .ck{background:var(--gc);border-color:var(--gc)}" +
      ".site-vis .vi{display:inline-flex;align-items:center;gap:2px;border-radius:999px}" +
      "@media (max-width:560px){.site-vis .vl{display:grid;grid-template-columns:1fr;width:100%;gap:6px}.site-vis .vi{display:flex}.site-vis .vi .vb{flex:1;min-width:0;justify-content:flex-start}}" +
      ".site-vis .vm{appearance:none;width:28px;height:30px;border:1px solid var(--line,#DDE4F2);background:var(--surface,#fff);color:var(--fg,#13203B);border-radius:9px;font:700 1.05rem/1 system-ui,sans-serif;cursor:pointer;display:grid;place-items:center;padding:0}" +
      ".site-vis .vm:hover:not(:disabled){border-color:var(--gc);color:var(--gc)}.site-vis .vm:disabled{opacity:.3;cursor:default}" +
      ".site-top{grid-column:1/-1;display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}.site-top .site-acct{flex:1 1 280px;grid-column:auto}" +
      ".site-h .site-drop .site-home{display:flex!important;align-items:center;gap:10px;padding:10px 14px!important;border-radius:12px!important;border:1px solid var(--line,#DDE4F2)!important;background:var(--surface,#fff)!important;color:var(--fg,#13203B);font-weight:600;text-decoration:none;flex:0 0 auto}" +
      ".site-h .site-drop .site-home:hover{border-color:var(--accent,#2563EB)!important;color:var(--accent,#2563EB)}.site-home svg{width:18px;height:18px}" +
      ".site-g{position:relative;background:var(--surface,#fff);border:1px solid var(--line,#DDE4F2);border-radius:16px;padding:14px;overflow:hidden;box-shadow:0 10px 24px -18px rgba(19,32,59,.5);animation:mcDrop .3s cubic-bezier(.2,.8,.2,1) both}" +
      ".site-g:nth-child(3){animation-delay:.04s}.site-g:nth-child(4){animation-delay:.08s}" +
      ".site-g::before{content:'';position:absolute;inset:0 0 auto 0;height:70px;background:linear-gradient(135deg,color-mix(in srgb,var(--gc) 22%,transparent),transparent 75%);pointer-events:none}" +
      ".site-gh{position:relative;display:flex;align-items:center;gap:10px;margin:0 0 12px}" +
      ".site-gh .gi{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--gc),color-mix(in srgb,var(--gc) 55%,#7C3AED));box-shadow:0 6px 14px -6px var(--gc);font:800 .78rem 'Archivo',system-ui,sans-serif;letter-spacing:.02em}" +
      ".site-gh b{font:800 1.02rem 'Archivo',system-ui,sans-serif;color:var(--fg,#13203B)}.site-gh small{display:block;font-size:.74rem;color:var(--muted,#58668A)}" +
      ".site-its{position:relative;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,145px),1fr));gap:6px}" +
      ".site-h .site-drop a.site-it{display:grid!important;grid-template-columns:32px minmax(0,1fr);gap:9px;align-items:center;padding:8px 9px!important;border-radius:11px!important;border:1px solid transparent!important;background:color-mix(in srgb,var(--gc) 5%,var(--surface,#fff))!important;color:var(--fg,#13203B);text-decoration:none;transition:transform .14s ease,border-color .14s,box-shadow .14s,background .14s}" +
      ".site-h .site-drop a.site-it:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--gc) 45%,transparent)!important;box-shadow:0 8px 16px -10px var(--gc)}" +
      ".site-it .ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--gc) 15%,transparent);color:var(--gc)}.site-it .ic svg{width:17px;height:17px}" +
      ".site-it .tx{display:grid;min-width:0;line-height:1.2}.site-it .tx b{font-weight:600;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.site-it .tx small{font-size:.7rem;color:var(--muted,#58668A);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".site-h .site-drop a.site-it.on{background:linear-gradient(135deg,var(--gc),color-mix(in srgb,var(--gc) 70%,#7C3AED))!important;color:#fff;box-shadow:0 8px 18px -8px var(--gc)}" +
      ".site-it.on .ic{background:rgba(255,255,255,.22);color:#fff}.site-it.on .tx small{color:rgba(255,255,255,.85)}" +
      "@media (max-width:560px){.site-drop-in{padding-top:12px;gap:12px}.site-its{grid-template-columns:1fr 1fr}.site-g{padding:12px;border-radius:14px}}" +
      "@media (prefers-reduced-motion:reduce){.site-drop,.site-g,.site-veil{animation:none}}" +
      ".site-crumb,.site-crumb *{text-transform:none!important;letter-spacing:normal!important}" +
      "@media (max-width:900px){.kpi .big{font-size:1.3rem!important;word-break:keep-all}}" +
      /* 17/11/2026: Diário — casas do calendário sempre do mesmo tamanho: bolinhas em até 2 linhas de 5 (máx. 10 entradas) e valor curto */
      "html[data-page^=diario] .month .day{height:60px;min-height:0!important;overflow:hidden}" +
      "html[data-page^=diario] .month .day .dots{display:grid!important;grid-template-columns:repeat(5,5px);grid-auto-rows:5px;gap:2px!important;height:12px;overflow:hidden;flex-wrap:nowrap}" +
      "html[data-page^=diario] .month .day .dot{width:5px!important;height:5px!important}" +
      "html[data-page^=diario] .month .day .v{text-overflow:clip!important;white-space:nowrap;line-height:1}" +
      /* títulos de cartões nunca quebram de linha */
      ".kpi .lbl,.card>.lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:100%}" +
      /* 17/11/2026: calendários com domingo e sábado também no celular (travados quando o mercado fecha) */
      "@media (max-width:640px){.month .grid,.month .dow{gap:4px!important}" +
        ".month .day .v{font-size:.62rem!important;letter-spacing:-.03em}" +
        /* períodos (2026 · jan–mar · abr–jun) numa linha só, rolando para o lado */
        ".per,#per.chips{flex-wrap:nowrap!important;max-width:calc(100vw - 32px);overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.per::-webkit-scrollbar,#per.chips::-webkit-scrollbar{display:none}.per>*,#per.chips>*{flex:none}}" +
      ".day.we,.legend i.we{background-image:repeating-linear-gradient(135deg,transparent 0 5px,rgba(120,135,170,.22) 5px 6.5px)!important}" +
      ".site-back{margin-left:0;padding:8px 12px 8px 8px}.site-back svg{width:18px;height:18px}" +
      "@media (max-width:560px){.site-back .t{display:inline!important}.site-crumb .tag,.site-crumb .sep:first-child{display:none}}" +
      "@media (min-width:1180px){.site-quick{display:flex}.site-quick~.site-btn{margin-left:6px}}" +
      "@media (min-width:1180px) and (max-width:1500px){html[data-group] .site-brand .t{display:none}}" +
      "@media (max-width:560px){.site-brand .t{display:none}.site-btn .t{display:none}.site-btn{padding:8px 10px}}" +
      "@media (orientation:landscape) and (max-height:500px){:root{--site-h:48px;--stick:48px}}" +
      /* listas e cartões mais largos aproveitando a tela */
      "@media (min-width:900px){" +
        "html[data-page=index] .app{grid-template-columns:230px minmax(0,1fr)!important}" +
        "html[data-page=index] .side{top:calc(var(--stick) + 12px)!important}" +
        "html[data-page=index] .grid{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))!important}" +
        "}" +
      "html[data-page^=manual] .tabs{top:var(--stick)!important}" +
      "html[data-page=index] .side{top:var(--stick)!important}" +
      "html[data-page^=checklist] .day{aspect-ratio:auto!important;height:40px}" +
      /* PC: páginas em colunas */
      "@media (min-width:1100px){" +
        "html[data-page] .wrap{grid-auto-flow:row dense}" +
        /* análise: nova análise à esquerda, conversa e salvas à direita */
        "html[data-page^=analise] .wrap{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)!important;grid-template-rows:auto auto auto auto auto 1fr}" + "html[data-page^=analise] .wrap>*{grid-column:1/-1}" +
        "html[data-page^=analise] #nova{grid-column:1;grid-row:3 / 7;align-self:start}" + "html[data-page^=analise] #chatBox{grid-column:2;grid-row:3}html[data-page^=analise] #cfgBox{grid-column:2;grid-row:4}html[data-page^=analise] .wrap>.panel:last-child{grid-column:2;grid-row:5}" +
        /* check-list: itens do dia à esquerda, calendário à direita */
        "html[data-page^=checklist] .wrap{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;align-items:start}" + "html[data-page^=checklist] .wrap>.top{grid-column:1/-1}" +
        "html[data-page^=checklist] .wrap>.panel:last-child{position:sticky;top:calc(var(--stick) + 12px)}" +
        /* diário: calendário grande à esquerda, resumos à direita */
        "html[data-page^=diario] .wrap{grid-template-columns:minmax(0,1.75fr) minmax(320px,1fr)!important;align-items:start}" + "html[data-page^=diario] .wrap>*{grid-column:1/-1}" +
        "html[data-page^=diario] .wrap>.two{grid-column:2;grid-template-columns:minmax(0,1fr)!important}" + "html[data-page^=diario] .wrap>.two~*{grid-column:1/-1}" +
        "html[data-page^=diario] .wrap>.panel:not(.cfg){grid-column:1}" +
        /* IR OB: importação e regras à esquerda, tabela dos meses à direita */
        "html[data-page=ir-ob] .wrap{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)!important;grid-template-rows:auto auto auto auto auto 1fr;align-items:start}" + "html[data-page=ir-ob] .wrap>*{grid-column:1/-1}" +
        "html[data-page=ir-ob] #imp{grid-column:1;grid-row:4}html[data-page=ir-ob] .wrap>.note{grid-column:1;grid-row:5}html[data-page=ir-ob] #imp~.panel:not(.note){grid-column:2;grid-row:4 / 7}" +
        /* IR B3: meses em grade */
        "html[data-page=ir-b3] #meses{grid-template-columns:repeat(auto-fill,minmax(480px,1fr));align-items:start}" +
        /* receitas: busca à esquerda, caderno à direita */
        "html[data-page=receitas] .wrap{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)!important;grid-template-rows:auto auto auto auto 1fr;align-items:start}" + "html[data-page=receitas] .wrap>*{grid-column:1}" +
        "html[data-page=receitas] .wrap>.top{grid-column:1/-1}" + "html[data-page=receitas] .wrap>.panel:last-child{grid-column:2;grid-row:2 / 6}" +
        /* manuais: índice fixo na lateral, conteúdo à direita */
        "html[data-page^=manual] .wrap{grid-template-columns:220px minmax(0,1fr)!important;align-items:start}" + "html[data-page^=manual] .wrap>*{grid-column:2}" +
        "html[data-page^=manual] .wrap>.top{grid-column:1/-1}" +
        "html[data-page^=manual] .wrap>.tabs{grid-column:1;grid-row:2 / span 12;position:sticky!important;top:calc(var(--stick) + 12px)!important;flex-direction:column;flex-wrap:nowrap!important;background:transparent!important;align-self:start}" +
        "html[data-page^=manual] .wrap>.tabs a{display:block;padding:9px 12px!important}" +
        /* limpeza: lotes em grade */
        "html[data-page=limpeza] #lotes{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:16px;align-items:start}" +
      "}" +
      /* oração: texto longo fica confortável de ler */
      "html[data-page=oracao] .wrap{max-width:1100px!important}" +
      /* 23/11/2026: nas páginas, sem o nome comprido do site no topo; só o nome da página */
      "html[data-page]:not([data-page=index]) .site-brand .t{display:none!important}" +
      "html[data-page]:not([data-page=index]) .site-crumb{overflow:visible}html[data-page]:not([data-page=index]) .site-crumb b{overflow:visible;font-size:1rem;font-weight:700}";
    var st2 = document.createElement("style"); st2.textContent = css;
    (document.head || document.documentElement).appendChild(st2);

    function el(t, cls, html) { var e = document.createElement(t); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function goTab(k) { try { sessionStorage.setItem("index.tab", k); } catch (e) {} }
    function build() {
      if (document.querySelector(".site-h")) return;
      var h = el("header", "site-h"); h.setAttribute("role", "banner");
      var inn = el("div", "site-in");
      if (file !== "index") {
        var back = el("button", "site-btn site-back", "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M15 18l-6-6 6-6'/></svg><span class='t'>Voltar</span>");
        back.type = "button"; back.setAttribute("aria-label", "Voltar");
        back.addEventListener("click", function () { var tb = cur ? cur.g.k : null; if (tb) goTab(tb); window.__mcGo ? window.__mcGo("index.html", { tab: tb }) : location.replace("index.html"); });
        inn.appendChild(back);
      }
      inn.appendChild(el("a", "site-brand", "<span class='site-logo' aria-hidden='true'><svg viewBox='0 0 32 32' fill='none' stroke='#fff' stroke-linecap='round' stroke-linejoin='round'><circle cx='16' cy='16' r='10' stroke-opacity='.3' stroke-width='2.6'/><circle cx='16' cy='16' r='10' stroke-width='2.6' stroke-dasharray='46 63' transform='rotate(-90 16 16)'/><path d='M11.6 16.4l3 2.9 5.8-6.3' stroke-width='2.8'/><circle cx='25.6' cy='6.6' r='1.3' fill='#fff' stroke='none'/></svg></span><span class='t'>Central de Controles Pessoais</span>")).href = "index.html";
      var crumb = el("div", "site-crumb");
      /* 23/11/2026: ao lado do Voltar fica só o nome da página onde você está */
      if (cur) crumb.innerHTML = "<b>" + esc(cur.it[1]) + "</b>";
      inn.appendChild(crumb);
      if (cur) {
        var q = el("nav", "site-quick"); q.setAttribute("aria-label", cur.g.g); q.style.setProperty("--gc", cur.g.c);
        ordemItens(cur.g).forEach(function (it) { var a = el("a", it[0] === fileK ? "on" : "", esc(it[1])); a.href = mcHref(it[0]) + ".html"; if (it[0] === fileK) a.setAttribute("aria-current", "page"); q.appendChild(a); });
        inn.appendChild(q);
      }
      var mp = el("a", "site-btn site-mp", "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 10.5 12 3l9 7.5'/><path d='M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5'/></svg><span class='t'>Menu principal</span>");
      mp.href = "index.html#inicio"; mp.setAttribute("aria-label", "Menu principal"); mp.style.textDecoration = "none";
      mp.addEventListener("click", function (e) { try { sessionStorage.removeItem("index.tab"); } catch (x) {} if (file === "index") { e.preventDefault(); if (window.__mcGo) window.__mcGo("index.html"); else if (window.__mcHome) window.__mcHome(); } });
      inn.appendChild(mp);
      var btn = el("button", "site-btn", "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><path d='M4 7h16M4 12h16M4 17h16'/></svg><span class='t'>Menu</span>");
      btn.type = "button"; btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Abrir menu");
      inn.appendChild(btn); h.appendChild(inn);
      var drop = el("div", "site-drop"); drop.hidden = true; var di = el("div", "site-drop-in");
      var home = el("div", "site-top"); di.appendChild(home);
      grupos().forEach(function (g) {
        var col = el("section", "site-g"); col.style.setProperty("--gc", g.c); col.setAttribute("data-k", g.k);
        col.appendChild(el("div", "site-gh", "<span class='gi'>" + esc(g.s === "Pessoal" ? "EU" : g.s) + "</span><span><b>" + esc(g.g) + "</b></span>"));
        var its = el("div", "site-its");
        ordemItens(g).forEach(function (it) { var a = el("a", "site-it" + (it[0] === file ? " on" : ""), "<span class='ic'>" + (ICO[it[1]] || "") + "</span><span class='tx'><b>" + esc(it[1]) + "</b><small>" + esc(DESC[it[0]] || "") + "</small></span>"); a.href = mcHref(it[0]) + ".html"; if (it[0] === fileK) a.setAttribute("aria-current", "page"); a.addEventListener("click", function () { goTab(g.k); }); its.appendChild(a); });
        col.appendChild(its); di.appendChild(col);
      });
      /* conta (e-mail e Sair) dentro do menu */
      var acct = el("div", "site-acct"); acct.hidden = true; home.appendChild(acct);
      /* 12/11/2026: "Instalar app" fica dentro do menu (PC e celular), não mais solto na página inicial */
      var inst = el("div", "site-inst"); inst.hidden = true; home.appendChild(inst);
      /* 19/11/2026: módulos que aparecem no painel */
      var vis = el("div", "site-vis"); home.appendChild(vis);
      function visDraw() {
        var oc = visGet();
        vis.innerHTML = "<span class='vh'><small>Módulos no painel</small><b>Marque e use ‹ › para mudar a ordem</b></span>";
        var lista = el("div", "vl"), gs = grupos();
        gs.forEach(function (g, gi) {
          var on = oc.indexOf(g.k) < 0;
          var b = el("button", "vb" + (on ? " on" : ""), "<i class='ck' aria-hidden='true'>" + (on ? "✓" : "") + "</i>" + esc(g.g));
          b.type = "button"; b.style.setProperty("--gc", g.c); b.setAttribute("aria-pressed", on ? "true" : "false");
          b.onclick = function () {
            var a = visGet(), i = a.indexOf(g.k);
            if (i >= 0) a.splice(i, 1); else {
              if (GROUPS.filter(function (x) { return a.indexOf(x.k) < 0; }).length <= 1) { window.ui && ui.toast("Deixe pelo menos um módulo no painel"); return; }
              a.push(g.k);
            }
            visSet(a);
          };
          var w = el("span", "vi"); w.style.setProperty("--gc", g.c);
          var l = el("button", "vm", "‹"); l.type = "button"; l.disabled = gi === 0; l.setAttribute("aria-label", "Mover " + g.g + " para antes"); l.title = "Mover para antes"; l.onclick = function () { mover(g.k, -1); };
          var r = el("button", "vm", "›"); r.type = "button"; r.disabled = gi === gs.length - 1; r.setAttribute("aria-label", "Mover " + g.g + " para depois"); r.title = "Mover para depois"; r.onclick = function () { mover(g.k, 1); };
          w.appendChild(l); w.appendChild(b); w.appendChild(r);
          lista.appendChild(w);
        });
        vis.appendChild(lista);
        /* seções do menu acompanham a ordem */
        grupos().forEach(function (g) { var c = di.querySelector(".site-g[data-k='" + g.k + "']"); if (c) di.appendChild(c); });
      }
      visDraw(); document.addEventListener("mc-mods", visDraw);
      window.__siteInst = function (modo, acao) {
        if (!modo) { inst.hidden = true; inst.innerHTML = ""; return; }
        inst.hidden = false;
        var ic = "<img src='icon-192.png' alt='' width='32' height='32'>";
        if (modo === "ios") {
          inst.innerHTML = ic + "<span class='tx'><small>Instalar app</small><b class='ios'>Safari → Compartilhar ⬆️ → Adicionar à Tela de Início</b></span>";
        } else {
          inst.innerHTML = ic + "<span class='tx'><small>Instalar app</small><b>Abre como app</b></span>";
          var bi = el("button", "site-inst-b", "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M12 4v11M7 10l5 5 5-5M5 20h14'/></svg>Instalar");
          bi.type = "button"; bi.onclick = function () { setOpen(false); acao(); }; inst.appendChild(bi);
        }
      };
      if (window.__siteInstPend) window.__siteInst.apply(null, window.__siteInstPend);
      window.__siteAcct = function (u, sair) {
        if (!u) { acct.hidden = true; btn.classList.remove("on-line"); return; }
        acct.hidden = false;
        acct.innerHTML = "<span class='who'><i></i><span><small>Conectado</small><b></b></span></span>";
        acct.querySelector("b").textContent = u.email || "sua conta";
        var bk = el("button", "site-bk", "Backup"); bk.type = "button"; bk.title = "Baixa um arquivo com todos os seus dados (backup)";
        bk.onclick = function () { if (window.__siteBackup) window.__siteBackup(bk); }; acct.appendChild(bk);
        var out = el("button", "site-out", "Sair"); out.type = "button"; out.onclick = sair; acct.appendChild(out);
      };
      if (window.__siteAcctPend) window.__siteAcct.apply(null, window.__siteAcctPend);
      drop.appendChild(di); h.appendChild(drop);
      var veil = el("div", "site-veil"); veil.hidden = true; document.body.appendChild(veil);
      veil.addEventListener("click", function () { setOpen(false); });
      function setOpen(o) { drop.hidden = !o; veil.hidden = !o; btn.setAttribute("aria-expanded", o ? "true" : "false"); document.documentElement.style.overflow = o ? "hidden" : ""; }
      btn.addEventListener("click", function (e) { e.stopPropagation(); setOpen(drop.hidden); });
      /* 12/11/2026: clicar em qualquer lugar fora dos cartões e botões fecha o menu (barra do topo, espaços do painel, fundo) */
      document.addEventListener("click", function (e) {
        if (drop.hidden) return;
        var t = e.target;
        if (t.closest && t.closest(".site-g, .site-acct, .site-inst, .site-vis, a, button, input, select, textarea, label")) return;
        setOpen(false);
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
      var tag = crumb.querySelector("[data-k]"); if (tag) tag.addEventListener("click", function () { goTab(tag.dataset.k); });
      document.body.insertBefore(h, document.body.firstChild);
      document.querySelectorAll(".voltar").forEach(function (v) { v.remove(); });
    }
    if (document.body) build(); else document.addEventListener("DOMContentLoaded", build);
  })();

  /* ===== Dia sem nada marcado = não operou (03/11/2026) =====
     Nos controles de todo dia (dopamina, diário, check-list, exercícios), um dia útil que já passou
     e ficou sem registro aparece marcado como "não operou" (ou "não treinou" / "não fez") no calendário. */
  (function () {
    var file = (decodeURIComponent(location.pathname).split("/").pop() || "").replace(/\.html?$/i, "");
    if (!/^(dopamina|diario|checklist|exercicios)/.test(file)) return;
    var txt = /^exercicios/.test(file) ? "não treinou" : /^checklist/.test(file) ? "não fez" : "não operou";
    var curto = /^exercicios/.test(file) ? "não fez" : /^checklist/.test(file) ? "não fez" : "não op.";
    var semTxt = /^checklist/.test(file) ? "não marcado" : /^dopamina/.test(file) ? "s/op" : "sem op";
    var st = document.createElement("style");
    st.textContent = ".day.nop{position:relative;background:color-mix(in srgb,var(--muted,#58668A) 16%,var(--surface,#fff))!important;border:1px dashed color-mix(in srgb,var(--muted,#58668A) 55%,transparent)!important;color:var(--muted,#58668A)!important;opacity:1!important}" +
      ".day.nop::after{content:attr(data-nop);position:absolute;left:2px;right:2px;bottom:2px;font:600 .54rem/1 'IBM Plex Sans',system-ui,sans-serif;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0;text-transform:none;color:var(--muted,#58668A)}" +
      ".day.nop[data-nop-s]::after{font-size:.5rem;bottom:3px}" +
      /* 19/11/2026: do início até 19/11, dia sem operação = "sem op" (neutro, não conta como não operou) */
      ".day.semop{position:relative}.day.semop::after{content:'" + semTxt + "';position:absolute;left:2px;right:2px;bottom:3px;font:600 .52rem/1 'IBM Plex Sans',system-ui,sans-serif;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0;text-transform:none;color:var(--muted,#58668A);opacity:.85}html[data-page^=dopamina] .day.semop::after{bottom:1px;font-size:.48rem}" +
      ".legend .nop-l i{background:color-mix(in srgb,var(--muted,#58668A) 16%,var(--surface,#fff))!important;border:1px dashed var(--muted,#58668A)!important}" +
      ".nop-nota{font-size:.82rem;color:var(--muted,#58668A);margin:2px 0 0}";
    (document.head || document.documentElement).appendChild(st);
    var pend = false;
    function atualizar() {
      pend = false;
      var n = document.querySelectorAll(".day.nop").length;
      document.querySelectorAll(".legend").forEach(function (lg) {
        var s = lg.querySelector(".nop-l");
        if (!s) { s = document.createElement("span"); s.className = "nop-l"; lg.appendChild(s); }
        var t = "<i></i>" + txt + (n ? " · " + n + " dia" + (n > 1 ? "s" : "") : "");
        if (s.innerHTML !== t) s.innerHTML = t;
      });
      // calendário sem legenda (diário): mostra a contagem embaixo dele
      var cal = document.getElementById("cal");
      if (cal && !document.querySelector(".legend")) {
        var p = document.getElementById("nopNota");
        if (!p) { p = document.createElement("p"); p.id = "nopNota"; p.className = "nop-nota"; cal.parentNode.insertBefore(p, cal.nextSibling); }
        var t2 = n ? "Dias úteis sem nada lançado contam como " + txt + ": " + n + " dia" + (n > 1 ? "s" : "") + "." : "";
        if (p.textContent !== t2) p.textContent = t2;
      }
      document.querySelectorAll(".day.nop").forEach(function (d) {
        var a = d.getAttribute("aria-label") || ""; if (a.indexOf(txt) < 0) d.setAttribute("aria-label", (a ? a + ", " : "") + txt);
        d.title = "Nada marcado neste dia: " + txt;
        var wd = d.getBoundingClientRect().width, curta = wd < 74, l = wd < 46 ? "—" : curta ? curto : txt;   // casinha pequena: texto curto; bem pequena: só um traço
        if (d.getAttribute("data-nop") !== l) d.setAttribute("data-nop", l);
        if (curta) { if (!d.hasAttribute("data-nop-s")) d.setAttribute("data-nop-s", ""); } else if (d.hasAttribute("data-nop-s")) d.removeAttribute("data-nop-s");
      });
    }
    function agendar() { if (!pend) { pend = true; requestAnimationFrame(atualizar); } }
    function ligar() { new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true }); agendar(); addEventListener("resize", agendar); }
    if (document.body) ligar(); else document.addEventListener("DOMContentLoaded", ligar);
  })();

  /* ===== Botão voltar do celular (03/11/2026, v3) =====
     O histórico é sempre: [menu principal] → [módulo] → [página].
     De página para página a página é substituída (não acumula), então de qualquer página:
     voltar → módulo, voltar → menu principal, voltar → sai do app. */
  (function () {
    var file = (decodeURIComponent(location.pathname).split("/").pop() || "index.html").replace(/\.html?$/i, "") || "index";
    var isIndex = file === "index";
    var SS = window.sessionStorage;
    function sg(k) { try { return SS.getItem(k); } catch (e) { return null; } }
    function ss(k, v) { try { if (v == null) SS.removeItem(k); else SS.setItem(k, v); } catch (e) {} }
    /* cada posição do histórico guarda o seu número (0 = onde o app abriu) */
    function posAtual() { try { var st = history.state; return st && typeof st.mcPos === "number" ? st.mcPos : null; } catch (e) { return null; } }
    if (posAtual() == null) {
      var np = sg("mc.navPos"); ss("mc.navPos", null);
      try { history.replaceState(Object.assign({}, history.state || {}, { mcPos: np != null && !isNaN(+np) ? +np : 0 }), "", location.href); } catch (e) {}
    }
    window.__mcPos = function () { return posAtual() || 0; };
    window.__mcPush = function (st, url) { history.pushState(Object.assign({}, st || {}, { mcPos: (posAtual() || 0) + 1 }), "", url || location.href); };
    window.__mcReplace = function (st, url) { history.replaceState(Object.assign({}, st || {}, { mcPos: posAtual() || 0 }), "", url || location.href); };
    var grp = null;
    try { (window.__MC.GROUPS || []).forEach(function (g) { g.items.forEach(function (it) { if (it[0] === file) grp = g.k; }); }); } catch (e) {}
    if (grp) ss("mc.lastGroup", grp);
    // página aberta a partir de um módulo: [menu] [módulo] [esta página]
    var depth = !isIndex && sg("mc.depth") === "2";
    // página aberta direto (sem o menu atrás): uma "trava" leva ao menu no 1º voltar
    var need = !isIndex && !depth, armed = false, pend = null;
    function ativo() { try { return !navigator.userActivation || navigator.userActivation.isActive; } catch (e) { return true; } }
    function arm() {
      if (armed || !need || !ativo()) return;
      try { window.__mcPush({ mcGuard: 1 }); armed = true; } catch (e) {}
    }
    ["pointerup", "touchend", "mousedown", "keydown"].forEach(function (ev) { document.addEventListener(ev, arm, true); });
    function ehMenu(url) { try { var f = new URL(url, location.href).pathname.split("/").pop(); return f === "" || /^index\.html?$/i.test(f); } catch (e) { return false; } }
    function trocar(url) {
      if (armed) { pend = url; armed = false; history.back(); setTimeout(function () { if (pend) { var p = pend; pend = null; ss("mc.navPos", String(posAtual() || 0)); location.replace(p); } }, 700); }
      else { ss("mc.navPos", String(posAtual() || 0)); location.replace(url); }
    }
    /* janelas e itens abertos dentro da página (nota aberta, dia do diário, menu ☰, receita aberta…)
       também viram um passo do voltar: o 1º voltar fecha o que está aberto */
    var sub = null, ignorar = 0, pendGo = null;
    function subOpen(close, auto) {
      if (sub) { sub.close = close; return; }
      try { window.__mcPush({ mcSub: 1 }); } catch (e) { return; }
      sub = { close: close, auto: !!auto };
    }
    function subDone() { if (!sub) return; sub = null; ignorar++; history.back(); }
    window.mcSub = { open: function (fn) { subOpen(fn, false); }, done: subDone, aberto: function () { return !!sub; } };
    function overlay() { return document.querySelector("#ov:not([hidden]), .veil, .osh, .site-drop:not([hidden])"); }
    function fecharOverlay() {
      var ov = document.getElementById("ov");
      if (ov && !ov.hidden) { if (typeof window.closeModal === "function") window.closeModal(); else ov.hidden = true; return; }
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    var obsPend = false;
    function checar() {
      obsPend = false;
      var o = overlay();
      if (o && !sub) subOpen(fecharOverlay, true);
      else if (!o && sub && sub.auto) subDone();
    }
    function ligarObs() { new MutationObserver(function () { if (!obsPend) { obsPend = true; setTimeout(checar, 0); } }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] }); }
    if (document.body) ligarObs(); else document.addEventListener("DOMContentLoaded", ligarObs);
    function go(url, opt) {
      if (sub) { // fecha o que estiver aberto antes de sair da página
        sub = null; ignorar++; pendGo = [url, opt]; history.back();
        setTimeout(function () { if (pendGo) { var g = pendGo; pendGo = null; go(g[0], g[1]); } }, 600);
        return;
      }
      if (isIndex) {
        if (ehMenu(url)) { if (window.__mcHome) window.__mcHome(); return; }
        ss("mc.depth", "2"); ss("mc.navPos", String((posAtual() || 0) + 1)); location.href = url; return;           // módulo → página: entra normal
      }
      if (ehMenu(url)) {
        if (depth) { if (opt && opt.tab) history.back(); else history.go(-2); return; } // "Voltar" → módulo; "Menu principal" → menu
        trocar(url); return;
      }
      trocar(url);                                                  // página → página: substitui
    }
    window.__mcGo = go;
    window.__mcNeedGuard = function () {};
    window.addEventListener("popstate", function () {
      if (ignorar) { ignorar--; if (pendGo) { var g = pendGo; pendGo = null; go(g[0], g[1]); } return; }
      if (sub) { var c = sub.close; sub = null; try { c(); } catch (e) {} return; }
      if (pend) { var p = pend; pend = null; ss("mc.navPos", String(posAtual() || 0)); location.replace(p); return; }
      if (!armed) return;
      armed = false; ss("mc.navPos", String(posAtual() || 0)); location.replace("index.html");
    });
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      var u; try { u = new URL(a.getAttribute("href"), location.href); } catch (x) { return; }
      if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return;
      if (u.pathname === location.pathname) {
        // link para uma parte da mesma página: rola sem criar histórico
        if (u.hash && u.hash.length > 1) {
          var alvo = document.getElementById(decodeURIComponent(u.hash.slice(1)));
          if (alvo) { e.preventDefault(); try { history.replaceState(history.state, "", u.hash); } catch (x) {} alvo.scrollIntoView({ behavior: "smooth", block: "start" }); }
        }
        return;
      }
      if (!/(\.html?|\/)$/i.test(u.pathname)) return;
      // o selo do módulo (ex.: "B3") no topo funciona como o "Voltar"
      var opt = a.classList.contains("tag") ? { tab: a.dataset.k } : null;
      e.preventDefault(); go(u.href, opt);
    });
  })();

  /* ===== App instalável (PWA): manifest, ícone e atualização automática ===== */
  (function () {
    var hd = document.head || document.documentElement;
    function tag(t, at) { var e = document.createElement(t); for (var k in at) e.setAttribute(k, at[k]); hd.appendChild(e); return e; }
    if (!document.querySelector("link[rel=manifest]")) tag("link", { rel: "manifest", href: "manifest.webmanifest" });
    if (!document.querySelector("link[rel=apple-touch-icon]")) tag("link", { rel: "apple-touch-icon", href: "apple-touch-icon.png?v=2" });
    if (!document.querySelector("link[rel=icon]")) tag("link", { rel: "icon", type: "image/png", href: "icon-192.png?v=2" });
    if (!document.querySelector("meta[name=theme-color]")) tag("meta", { name: "theme-color", content: "#2563EB" });
    tag("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    tag("meta", { name: "mobile-web-app-capable", content: "yes" });
    tag("meta", { name: "apple-mobile-web-app-title", content: "Controles" });
    tag("meta", { name: "apple-mobile-web-app-status-bar-style", content: "default" });
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").then(function (r) {
          // confere se tem versão nova ao voltar para o app
          document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") r.update().catch(function () {}); });
        }).catch(function () {});
      });
    }
    /* "Instalar app" dentro do menu ☰ (todas as páginas, PC e celular) */
    var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
    if (standalone) return;
    var deferred = null;
    var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    function setInst() { var a = [].slice.call(arguments); if (window.__siteInst) window.__siteInst.apply(null, a); else window.__siteInstPend = a; }
    function instalar() { if (!deferred) return; var d = deferred; d.prompt(); d.userChoice.finally(function () { deferred = null; setInst(null); }); }
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; setInst("btn", instalar); });
    window.addEventListener("appinstalled", function () { deferred = null; setInst(null); });
    if (ios && !window.MSStream) setInst("ios");
  })();

  /* Quotex e Exness no Android: abre no Chrome (no app instalado ele abria dentro do próprio app). PC fica igual. */
  (function () {
    if (!/Android/i.test(navigator.userAgent)) return;
    function fix() {
      document.querySelectorAll('a[href*="quotex.com"],a[href*="exness.com"],a[href*="santandercorretora.com.br"]').forEach(function (a) {
        if (a.dataset.chrome) return; a.dataset.chrome = "1";
        var u = a.href;
        a.href = "intent://" + u.replace(/^https?:\/\//, "") + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" + encodeURIComponent(u) + ";end";
        a.removeAttribute("target");
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fix); else fix();
  })();

  var resolveDb, dbPromise = new Promise(function (r) { resolveDb = r; });
  window.claude = { use: function (name) { return name === "db" ? dbPromise : Promise.resolve(null); } };

  var MSG = {
    "auth/unauthorized-domain": "Este endereço não está liberado. No Firebase: Authentication → Configurações → Domínios autorizados → adicione exatamente " + location.hostname + " (sem https e sem /controles).",
    "auth/operation-not-allowed": "Esse tipo de login não está ativado. No Firebase: Authentication → Método de login → ative Google e também E-mail/senha.",
    "auth/popup-blocked": "O navegador bloqueou a janela do Google. Tentando de outro jeito…",
    "auth/popup-closed-by-user": "A janela do Google foi fechada antes de terminar.",
    "auth/cancelled-popup-request": "A janela do Google foi fechada antes de terminar.",
    "auth/invalid-api-key": "A chave do firebase-config.js está errada. Copie de novo o apiKey do Firebase.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "A chave do firebase-config.js está errada. Copie de novo o apiKey do Firebase.",
    "auth/network-request-failed": "Sem internet ou conexão bloqueada. Tente de novo.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/user-not-found": "Não existe conta com esse e-mail. Toque em Criar conta.",
    "auth/email-already-in-use": "Já existe conta com esse e-mail. Use Entrar.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/web-storage-unsupported": "Este navegador está bloqueando o login. Abra pelo Chrome normal, fora de aba anônima.",
    "auth/missing-initial-state": "O navegador perdeu o login no caminho de volta do Google. Use o login com e-mail e senha abaixo."
  };
  function explain(e) { var c = e && e.code; return MSG[c] || ("Não deu certo (" + (c || (e && e.message) || "erro") + ")."); }

  var bar;
  var css = "font:600 14px system-ui,sans-serif;padding:8px 14px;border-radius:7px;cursor:pointer;";
  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement("div");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Conta");
    bar.style.cssText = "display:grid;gap:8px;margin:10px auto 0;padding:8px 12px;border-radius:10px;border:1px solid rgba(127,140,136,.45);font:13px/1.4 system-ui,sans-serif;width:calc(100% - 32px);max-width:420px;box-sizing:border-box";
    var ref = document.body.firstChild;
    while (ref && ref.classList && (ref.classList.contains("voltar") || ref.classList.contains("site-h"))) ref = ref.nextSibling;
    document.body.insertBefore(bar, ref);
    return bar;
  }
  function errBox(b) { var p = document.createElement("div"); p.style.cssText = "color:#E11D48;font-size:13px"; p.setAttribute("role", "alert"); b.appendChild(p); return p; }

  if (!(cfg && cfg.apiKey && cfg.apiKey.indexOf("COLE") !== 0)) {
    var go0 = function () { var b = ensureBar(); b.textContent = "Firebase ainda não configurado: preencha o firebase-config.js. Por enquanto os dados ficam só neste aparelho."; };
    if (document.body) go0(); else document.addEventListener("DOMContentLoaded", go0);
    resolveDb(null); return;
  }
  if (!window.firebase) {
    var go1 = function () { var b = ensureBar(); b.textContent = "Não carregou o Firebase (sem internet?). Os dados ficam só neste aparelho por enquanto."; };
    if (document.body) go1(); else document.addEventListener("DOMContentLoaded", go1);
    resolveDb(null); return;
  }

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var fs = firebase.firestore();
  try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}

  var lastErr = "";
  auth.getRedirectResult().catch(function (e) { lastErr = explain(e); if (bar && bar._err) bar._err.textContent = lastErr; });

  function adapter(uid) {
    var base = "users/" + uid + "/apps/" + APP + "/";
    return { doc: function (p) { return fs.doc(base + p); }, collection: function (p) { return fs.collection(base + p); },
      // ler outro controle da mesma conta (ex.: o Diário lendo as Metas do Progresso)
      app: function (name) { var b2 = "users/" + uid + "/apps/" + name + "/"; return { doc: function (p) { return fs.doc(b2 + p); }, collection: function (p) { return fs.collection(b2 + p); } }; } };
  }

  function showLogin() {
    var b = ensureBar(); b.innerHTML = ""; b.hidden = false;
    var t = document.createElement("div"); t.textContent = "Entre para sincronizar seus dados entre celular e PC."; b.appendChild(t);
    var g = document.createElement("button"); g.type = "button"; g.textContent = "Entrar com Google";
    g.style.cssText = css + "border:0;background:#2563EB;color:#fff;justify-self:start";
    b.appendChild(g);
    var det = document.createElement("details");
    det.innerHTML = "<summary style='cursor:pointer'>Entrar com e-mail e senha</summary>";
    var f = document.createElement("form"); f.style.cssText = "display:grid;gap:8px;margin-top:8px";
    f.innerHTML = "<input type='email' autocomplete='email' placeholder='E-mail' required style='font:inherit;padding:9px 10px;border-radius:7px;border:1px solid rgba(127,140,136,.6);background:transparent;color:inherit;min-width:0'>" +
      "<input type='password' autocomplete='current-password' placeholder='Senha (mín. 6)' required minlength='6' style='font:inherit;padding:9px 10px;border-radius:7px;border:1px solid rgba(127,140,136,.6);background:transparent;color:inherit;min-width:0'>" +
      "<div style='display:flex;gap:8px;flex-wrap:wrap'><button type='submit' style='" + css + "border:0;background:#2563EB;color:#fff'>Entrar</button><button type='button' data-new style='" + css + "border:1px solid rgba(127,140,136,.6);background:transparent;color:inherit'>Criar conta</button></div>";
    det.appendChild(f); b.appendChild(det);
    var err = errBox(b); b._err = err; err.textContent = lastErr;
    g.onclick = function () {
      err.textContent = "";
      var prov = new firebase.auth.GoogleAuthProvider();
      prov.setCustomParameters({ prompt: "select_account" });
      auth.signInWithPopup(prov).catch(function (e) {
        if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) {
          err.textContent = MSG["auth/popup-blocked"];
          auth.signInWithRedirect(prov).catch(function (e2) { err.textContent = explain(e2); });
        } else err.textContent = explain(e);
      });
    };
    var em = f.querySelector("input[type=email]"), pw = f.querySelector("input[type=password]");
    f.onsubmit = function (ev) { ev.preventDefault(); err.textContent = ""; auth.signInWithEmailAndPassword(em.value.trim(), pw.value).catch(function (e) { err.textContent = explain(e); }); };
    f.querySelector("[data-new]").onclick = function () {
      if (!em.value || pw.value.length < 6) { err.textContent = "Preencha e-mail e uma senha de pelo menos 6 caracteres."; return; }
      err.textContent = ""; auth.createUserWithEmailAndPassword(em.value.trim(), pw.value).catch(function (e) { err.textContent = explain(e); });
    };
  }
  /* 16/11/2026: backup — baixa um .json com todos os dados da conta (todos os controles) */
  var BK = {
    "analise-b3": ["analises2"], "analise-ob": ["analises2"], "checklist-b3n": ["dias"], "checklist-ob3": ["dias"],
    "compras": ["itens"], "consorcio": ["propostas", "config/propostas"], "diario-b3n": ["dias", "config/geral"], "diario-ob3": ["dias", "config/geral"],
    "dopamina-b3n": ["dias"], "dopamina-ob3": ["dias"], "exercicios2": ["dias", "config/geral"], "ir-b3n": ["meses"], "ir-ob3": ["meses"],
    "limpeza": ["lotes"], "lucro-b3": ["dias"], "lucro-ob2": ["meses"], "notas": ["notas", "blocos"], "oracao": ["consagracoes"],
    "progresso-b3m": ["estado/progresso", "estado/simulador"], "progresso-ob2": ["estado/progresso", "estado/simulador"], "receitas": ["receitas"], "salario": ["meses"],
    "analise-fx": ["analises2"], "checklist-fx": ["dias"], "diario-fx": ["dias", "config/geral"], "dopamina-fx": ["dias"], "lucro-fx": ["dias"], "ir-fx": ["config/geral"],
    "progresso-fx": ["estado/progresso", "estado/simulador"]
  };
  function backup(uid, btn) {
    var txt = btn ? btn.textContent : ""; if (btn) { btn.disabled = true; btn.textContent = "Baixando…"; }
    var out = { conta: (auth.currentUser && auth.currentUser.email) || "", gerado: new Date().toISOString(), apps: {} }, jobs = [];
    Object.keys(BK).forEach(function (app) {
      var base = "users/" + uid + "/apps/" + app + "/"; out.apps[app] = {};
      BK[app].forEach(function (p) {
        var isDoc = p.split("/").length % 2 === 0;
        jobs.push((isDoc ? fs.doc(base + p).get() : fs.collection(base + p).get()).then(function (r) {
          if (isDoc) { if (r.exists) out.apps[app][p] = r.data(); }
          else { var m = {}; r.forEach(function (d) { m[d.id] = d.data(); }); if (r.size) out.apps[app][p] = m; }
        }).catch(function () {}));
      });
    });
    return Promise.all(jobs).then(function () {
      var j = JSON.stringify(out, function (k, v) { return v && typeof v.toDate === "function" ? v.toDate().toISOString() : v; }, 1);
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([j], { type: "application/json" }));
      var d = new Date(); a.download = "controles-backup-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + ".json";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      if (window.ui && ui.toast) ui.toast("✓ Cópia dos dados baixada");
    }).finally(function () { if (btn) { btn.disabled = false; btn.textContent = txt; } });
  }
  function showUser(u) {
    if (bar) bar.hidden = true;
    window.__siteBackup = function (btn) { return backup(u.uid, btn); };
    var sair = function () { auth.signOut().then(function () { location.reload(); }); };
    if (window.__siteAcct) window.__siteAcct(u, sair); else window.__siteAcctPend = [u, sair];
    return;
    var b = ensureBar(); b.innerHTML = ""; b.hidden = false;
    b.style.gridTemplateColumns = "1fr auto"; b.style.alignItems = "center";
    var s = document.createElement("span"); s.style.cssText = "min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.8"; var dot = document.createElement("span"); dot.textContent = "● "; dot.style.color = "#22C55E"; s.appendChild(dot); s.appendChild(document.createTextNode("Online · " + (u.email || "sua conta"))); b.appendChild(s);
    var out = document.createElement("button"); out.type = "button"; out.textContent = "Sair";
    out.style.cssText = "font:600 12px system-ui,sans-serif;padding:4px 10px;border-radius:6px;cursor:pointer;border:1px solid rgba(127,140,136,.6);background:transparent;color:inherit";
    out.onclick = function () { auth.signOut().then(function () { location.reload(); }); };
    b.appendChild(out);
  }

  var done = false;
  auth.onAuthStateChanged(function (u) {
    var go = function () {
      if (u) { showUser(u); if (!done) { done = true; resolveDb(adapter(u.uid)); } }
      else showLogin();
    };
    if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  });
})();

/* 17/11/2026: abas B3 | Forex no topo das páginas do módulo "B3 ou Forex" (cada mercado com seus dados). */
(function () {
  var file = (decodeURIComponent(location.pathname).split("/").pop() || "").replace(/\.html?$/i, "");
  return; // 19/11/2026: B3 e Forex agora são módulos separados, sem as abas
  var m = file.match(/^(.*)-(b3|fx)$/); if (!m) return;
  var base = m[1], mk = m[2];
  function liga() {
    var wrap = document.querySelector(".wrap"); if (!wrap || wrap.querySelector(".mkt-tabs")) return;
    var st = document.createElement("style");
    st.textContent = ".mkt-tabs{display:flex;margin-bottom:10px;gap:4px;padding:4px;border-radius:12px;background:var(--surface,#fff);border:1px solid var(--line,#DDE4F2);justify-self:start;width:max-content;max-width:100%}" +
      ".mkt-tabs a{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:9px;font:600 .9rem 'IBM Plex Sans',system-ui,sans-serif;color:var(--muted,#58668A);text-decoration:none;white-space:nowrap}" +
      ".mkt-tabs a.on{background:var(--accent,#0F766E);color:#fff;box-shadow:0 6px 14px -8px var(--accent,#0F766E)}" +
      ".mkt-tabs a:not(.on):hover{color:var(--fg,#13203B);background:var(--bg,#EEF3FC)}" +
      ".mkt-tabs small{font-weight:500;opacity:.8;font-size:.72rem}";
    document.head.appendChild(st);
    var nav = document.createElement("nav"); nav.className = "mkt-tabs"; nav.setAttribute("aria-label", "Mercado");
    [["b3", "B3", "R$"], ["fx", "Forex", "US$"]].forEach(function (x) {
      var a = document.createElement("a"); a.href = base + "-" + x[0] + ".html"; a.className = x[0] === mk ? "on" : "";
      a.innerHTML = x[1] + " <small>" + x[2] + "</small>"; if (x[0] === mk) a.setAttribute("aria-current", "page");
      a.addEventListener("click", function () { try { localStorage.setItem("mc.mercado", x[0]); } catch (e) {} });
      nav.appendChild(a);
    });
    // fica dentro do cabeçalho da página (em cima do título), sem mexer no layout das colunas
    var top = wrap.querySelector(".top"), alvo = top ? (top.firstElementChild || top) : wrap;
    alvo.insertBefore(nav, alvo.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", liga); else liga();
})();

/* ===== 23/11/2026: dias bloqueados e legenda em todos os calendários =====
   Os calendários mostram o mês inteiro. Dias fora do período (antes de 29/10/2026, de 18/12 até o início de janeiro etc.)
   ficam travados como "bloqueado". Todo calendário tem legenda (fim de semana, bloqueado e o resto da página). */
(function () {
  var file = (decodeURIComponent(location.pathname).split("/").pop() || "").replace(/\.html?$/i, "");
  /* 24/11/2026: limite de 19/11 retirado; os controles do trade voltam a contar desde 29/10/2026 (Exercícios volta a 03/11, como era) */
  var INI = /^exercicios/.test(file) ? "2026-11-03" : "2026-10-29";
  window.mcInicio = INI; window.mcInicioHora = "00:00";
  window.mcBloqueado = function (ds) { return ds < INI || (ds >= "2026-12-18" && ds <= "2027-01-10") || ds > "2027-06-30"; };
  var st = document.createElement("style");
  st.textContent =
    ".day.bloq,.legend i.bloq-i{background:repeating-linear-gradient(45deg,color-mix(in srgb,var(--loss,#C2410C) 16%,transparent) 0 2px,transparent 2px 7px),color-mix(in srgb,var(--muted,#58668A) 8%,var(--surface,#fff))!important;border:1px dotted color-mix(in srgb,var(--muted,#58668A) 60%,transparent)!important;color:color-mix(in srgb,var(--muted,#58668A) 75%,transparent)!important}" +
    ".day.bloq{opacity:.6!important;cursor:not-allowed!important;box-shadow:none!important;outline:none!important;transform:none!important}" +
    ".day.bloq .d{opacity:.8}" +
    ".legend i.we-i{background:var(--bg,#F4F6FB);background-image:repeating-linear-gradient(135deg,transparent 0 5px,rgba(120,135,170,.22) 5px 6.5px)!important}" +
    ".legend.mc-leg{display:flex;gap:12px;flex-wrap:wrap;font-size:.78rem;color:var(--muted,#58668A);margin:0 0 4px}" +
    ".legend.mc-leg i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px;border:1px solid var(--line,#DDE4F2)}" +
    ".mc-leg .pos-i{background:var(--win-soft,#DCFCE7)}.mc-leg .neg-i{background:var(--loss-soft,#FEE2E2)}.mc-leg .hj-i{border:2px solid var(--accent,#2563EB)!important;background:var(--surface,#fff)}" +
    ".mc-leg .ex-f{background:var(--win,#16A34A)}.mc-leg .ex-p{background:var(--part-soft,#FEF3C7);border-color:var(--part,#D97706)!important}.mc-leg .ck-h{background:var(--part-soft,#FEF3C7);border-color:var(--part,#D97706)!important}";
  (document.head || document.documentElement).appendChild(st);
  if (!/^(dopamina|diario|checklist|exercicios)/.test(file)) { datas(); return; }
  function sp(cls, i, t) { var s = document.createElement("span"); s.className = cls; s.innerHTML = "<i class='" + i + "'></i>" + t; return s; }
  function legendas() {
    var cal = document.getElementById("cal"); if (!cal) return;
    var lgs = document.querySelectorAll(".legend");
    if (!lgs.length) {
      var lg = document.createElement("div"); lg.className = "legend mc-leg"; lg.setAttribute("aria-label", "Legenda do calendário");
      if (/^diario/.test(file)) { lg.appendChild(sp("", "pos-i", "dia no lucro")); lg.appendChild(sp("", "neg-i", "dia no prejuízo")); }
      lg.appendChild(sp("", "hj-i", "hoje"));
      cal.parentNode.insertBefore(lg, cal); lgs = [lg];
    }
    Array.prototype.forEach.call(lgs, function (lg) {
      var f0 = (lg.textContent || "").trim().charAt(0), up = f0 && f0 === f0.toUpperCase() && f0 !== f0.toLowerCase();
      function sp(c, i, t) { var s = document.createElement("span"); s.className = c; s.innerHTML = "<i class='" + i + "'></i>" + (up ? t.charAt(0).toUpperCase() + t.slice(1) : t); return s; }
      if (/^exercicios/.test(file) && !lg.querySelector(".ex-p")) { var p = sp("", "ex-p", "treino parcial"); lg.appendChild(p); }
      if (/^checklist/.test(file) && !lg.querySelector(".ck-h") && document.querySelector(".day.half")) { lg.appendChild(sp("", "ck-h", "metade")); }
      if (!lg.querySelector("i.we") && !lg.querySelector(".we-l")) lg.appendChild(sp("we-l", "we-i", "fim de semana (travado)"));
      if (!lg.querySelector(".bloq-l")) lg.appendChild(sp("bloq-l", "bloq-i", "bloqueado (fora do período)"));
      var n = lg.querySelector(".nop-l"); if (n) lg.appendChild(n); // "não operou" sempre por último
    });
  }
  var pend = false;
  function ag() { if (!pend) { pend = true; requestAnimationFrame(function () { pend = false; legendas(); }); } }
  function ligar() { new MutationObserver(ag).observe(document.body, { childList: true, subtree: true }); ag(); datas(); }
  if (document.body) ligar(); else document.addEventListener("DOMContentLoaded", ligar);

  /* campos de data (lançar dia no Lucro etc.): não deixa escolher dia bloqueado */
  function datas() {
    if (!/^diario/.test(file)) return; // 24/11/2026: no Lucro não tem mais trava de data
    function prep() {
      document.querySelectorAll("input[type=date]").forEach(function (inp) {
        if (inp.dataset.mcBloq) return; inp.dataset.mcBloq = "1";
        if (!inp.min || inp.min < INI) inp.min = INI;
        var lanc = /^(mD|dData)$/.test(inp.id);
        if (!lanc) return;
        inp.addEventListener("change", function () {
          var v = inp.value; if (!v || !window.mcBloqueado(v)) return;
          inp.value = "";
          var m = "Dia bloqueado: fora do período (conta de 29/10/2026 até 17/12, e volta em 11/01)";
          if (window.ui && ui.toast) ui.toast(m); else alert(m);
        }, true);
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prep); else prep();
    setTimeout(prep, 1500);
  }
})();

/* ===== 23/11/2026: cada página abre onde você clicou por último (período, filtro, mês, ano)
   e essa escolha vai junto para a conta, então vale no PC e no celular ===== */
(function () {
  var file = (decodeURIComponent(location.pathname).split("/").pop() || "index").replace(/\.html?$/i, "") || "index";
  var RX = /^(mc\.per\.|filtro_|lucroOB\.filtro$|lucroB3\.filtro$|lucroFX\.mes$|mc\.irAno\.|mc\.mercado$)/;
  var TK = "mc.prefT", orig = Storage.prototype.setItem, aplicando = false, pend = {}, timer = null;
  var LS; try { LS = window.localStorage; } catch (e) { return; }
  function tget() { try { return JSON.parse(LS.getItem(TK) || "{}") || {}; } catch (e) { return {}; } }
  function enc(k) { return k.replace(/\./g, "~"); }
  function dec(k) { return k.replace(/~/g, "."); }
  function enviar() {
    var p = pend; pend = {}; if (!Object.keys(p).length || !window.claude) return;
    window.claude.use("db").then(function (d) { if (!d || !d.app) return; var o = {}; Object.keys(p).forEach(function (k) { o[enc(k)] = p[k]; }); d.app("geral").doc("config/preferencias").set({ p: o }, { merge: true }).catch(function () {}); });
  }
  Storage.prototype.setItem = function (k, v) {
    var ant = null; if (this === LS && RX.test(k)) { try { ant = this.getItem(k); } catch (e) {} }
    orig.call(this, k, v);
    if (this !== LS || aplicando || !RX.test(k) || ant === String(v)) return;
    var t = tget(); t[k] = Date.now(); orig.call(this, TK, JSON.stringify(t));
    pend[k] = { v: String(v), t: t[k] }; clearTimeout(timer); timer = setTimeout(enviar, 700);
  };
  function daPagina(k) {
    return k.indexOf(file) >= 0 || (file === "lucro-ob" && k === "lucroOB.filtro") || (file === "lucro-b3" && k === "lucroB3.filtro") ||
      (file === "lucro-fx" && k === "lucroFX.mes") || (/^diario/.test(file) && /^filtro_/.test(k)) || (file === "index" && k === "mc.mercado");
  }
  setTimeout(function () {
    if (!window.claude) return;
    window.claude.use("db").then(function (d) {
      if (!d || !d.app) return;
      d.app("geral").doc("config/preferencias").get().then(function (x) {
        var nuvem = (x.exists && (x.data() || {}).p) || {}, t = tget(), mudou = false, subir = {};
        Object.keys(nuvem).forEach(function (ek) {
          var k = dec(ek), c = nuvem[ek] || {}; if (!RX.test(k) || c.v == null) return;
          if ((+c.t || 0) > (+t[k] || 0) && LS.getItem(k) !== c.v) {
            aplicando = true; try { orig.call(LS, k, c.v); } catch (e) {} aplicando = false;
            t[k] = +c.t; if (daPagina(k)) mudou = true;
          }
        });
        orig.call(LS, TK, JSON.stringify(t));
        /* o que só existe neste aparelho (ou é mais novo aqui) sobe para a conta */
        Object.keys(t).forEach(function (k) { var c = nuvem[enc(k)]; if (RX.test(k) && LS.getItem(k) != null && (!c || (+c.t || 0) < t[k])) subir[k] = { v: LS.getItem(k), t: t[k] }; });
        if (Object.keys(subir).length) { pend = Object.assign(subir, pend); enviar(); }
        /* a escolha mais nova veio do outro aparelho: abre a página de novo já nela (uma vez só) */
        var g = "mc.prefRl." + file;
        if (mudou && !sessionStorage.getItem(g)) { try { sessionStorage.setItem(g, "1"); } catch (e) {} location.reload(); }
      }).catch(function () {});
    });
  }, 0);
})();


/* ===== 24/11/2026: dados de volta desde 29/10 =====
   Em 19/11 tudo tinha sido zerado (OB, B3 e Forex passaram a gravar em outro lugar da conta).
   Agora as páginas voltaram a usar os dados antigos (desde 29/10) e, uma vez só, o que foi lançado
   depois do zeramento (19/11 à noite em diante) é copiado para junto deles. Nada é apagado. */
(function () {
  var MAPA = [
    ["checklist-ob4", "checklist-ob3", ["dias"]], ["checklist-b3p", "checklist-b3n", ["dias"]], ["checklist-fx2", "checklist-fx", ["dias"]],
    ["diario-ob4", "diario-ob3", ["dias", "config/geral"]], ["diario-b3p", "diario-b3n", ["dias", "config/geral"]], ["diario-fx2", "diario-fx", ["dias", "config/geral"]],
    ["dopamina-ob4", "dopamina-ob3", ["dias"]], ["dopamina-b3p", "dopamina-b3n", ["dias"]], ["dopamina-fx2", "dopamina-fx", ["dias"]],
    ["ir-ob4", "ir-ob3", ["meses"]], ["ir-b3p", "ir-b3n", ["meses"]], ["ir-fx2", "ir-fx", ["config/geral"]],
    ["lucro-ob3", "lucro-ob2", ["#lucroOB"]], ["lucro-b3p", "lucro-b3", ["dias"]], ["lucro-fx2", "lucro-fx", ["dias"]],
    ["progresso-ob3", "progresso-ob2", ["estado/progresso", "estado/simulador"]], ["progresso-b3p", "progresso-b3m", ["estado/progresso", "estado/simulador"]],
    ["progresso-fx2", "progresso-fx", ["estado/progresso", "estado/simulador", "estado/lotepar"]],
    ["analise-ob", "analise-ob", ["analises3>analises2"]], ["analise-b3", "analise-b3", ["analises3>analises2"]], ["analise-fx", "analise-fx", ["analises3>analises2"]]
  ];
  var FLAG = "config/restaura20261124";
  function plain(o) { return JSON.parse(JSON.stringify(o, function (k, v) { return v && typeof v.toDate === "function" ? v.toDate().toISOString() : v; })); }
  function juntaDoc(velho, novo) {
    var r = Object.assign({}, velho || {}, novo || {});
    if (velho && novo && Array.isArray(velho.conquistados) && Array.isArray(novo.conquistados)) {
      var a = velho.conquistados.slice(); novo.conquistados.forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); r.conquistados = a;
    }
    if (novo && (novo.banca == null || novo.banca === "") && velho && velho.banca != null) r.banca = velho.banca;
    return r;
  }
  function lucroOB(d, de, para) {
    var A = d.app(de).collection("meses"), B = d.app(para).collection("meses");
    return Promise.all([A.get(), B.get()]).then(function (rr) {
      if (!rr[0].size) return;
      var map = new Map();
      [rr[1], rr[0]].forEach(function (q) { q.forEach(function (x) { try { JSON.parse(x.data().ops || "[]").forEach(function (a) { map.set(a[0], a); }); } catch (e) {} }); });
      var porMes = {}; map.forEach(function (a) { var m = String(a[3] || "").slice(0, 7); if (m) (porMes[m] = porMes[m] || []).push(a); });
      var jobs = [];
      Object.keys(porMes).forEach(function (m) {
        var l = porMes[m].sort(function (x, y) { return x[3] < y[3] ? -1 : x[3] > y[3] ? 1 : 0; });
        for (var i = 0; i < l.length; i += 2500) jobs.push(B.doc(i ? m + "_" + (i / 2500 + 1) : m).set({ ops: JSON.stringify(l.slice(i, i + 2500)) }));
      });
      return Promise.all(jobs);
    });
  }
  function copia(d, de, para, p) {
    if (p === "#lucroOB") return lucroOB(d, de, para);
    var pp = p.split(">"), pDe = pp[0], pPara = pp[1] || pp[0];
    if (pDe.split("/").length % 2 === 0) {
      return Promise.all([d.app(de).doc(pDe).get(), d.app(para).doc(pPara).get()]).then(function (r) {
        if (!r[0].exists) return;
        return d.app(para).doc(pPara).set(plain(juntaDoc(r[1].exists ? r[1].data() : null, r[0].data())));
      });
    }
    return d.app(de).collection(pDe).get().then(function (q) {
      var jobs = []; q.forEach(function (x) { jobs.push(d.app(para).doc(pPara + "/" + x.id).set(plain(x.data()), { merge: true })); });
      return Promise.all(jobs);
    });
  }
  setTimeout(function () {
    if (!window.claude) return;
    window.claude.use("db").then(function (d) {
      if (!d || !d.app) return;
      var g = d.app("geral").doc(FLAG);
      g.get().then(function (x) {
        if (x.exists && x.data().feito) return;
        var erros = 0, jobs = [];
        MAPA.forEach(function (m) { m[2].forEach(function (p) { jobs.push(copia(d, m[0], m[1], p).catch(function (e) { erros++; console.warn("restaura", m[0], p, e); })); }); });
        return Promise.all(jobs).then(function () {
          if (erros) { if (window.ui && ui.toast) ui.toast("Não terminou de juntar os dados de 19/11 em diante. Abra de novo com internet.", 1); return; }
          return g.set({ feito: true, em: new Date().toISOString() }).then(function () {
            if (window.ui && ui.toast) ui.toast("✓ Dados desde 29/10 de volta, com o que foi lançado depois de 19/11");
            setTimeout(function () { location.reload(); }, 1600);
          });
        });
      }).catch(function () {});
    });
  }, 800);
})();
