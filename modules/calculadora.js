// ══════════════════════════════════════════════════════════════
// CALCULADORA DE TASAS — Conversor profesional estilo Wise
// ══════════════════════════════════════════════════════════════

PG.calculadora = function(){
  var bcv = window._tasaBsGlobal || 0;
  var eur = window._tasaEuro || 0;
  var bin = window._tasaBinance || 0;
  var monedaDe = window._calcMonedaDe || 'USD';
  var monedaA  = window._calcMonedaA  || 'Bs';
  var fuente   = window._calcFuente   || 'BCV';  // BCV o BINANCE
  var monto    = (typeof window._calcMonto === 'number') ? window._calcMonto : 100;

  // ─── Currency flags/dots ───────────────────────────────────
  function curIcon(m, size){
    size = size || 28;
    var styles = {
      USD: {bg:'linear-gradient(135deg,#15803D,#166534)', sym:'$', font:.62},
      Bs : {bg:'linear-gradient(135deg,#374151,#0f172a)', sym:'Bs', font:.40},
      EUR: {bg:'linear-gradient(135deg,#003399,#001F66)', sym:'€', font:.58, color:'#FFD700'},
      USDT:{bg:'linear-gradient(135deg,#26A17B,#1F8765)', sym:'₮', font:.56}
    };
    var s = styles[m] || styles.USD;
    var color = s.color || '#fff';
    return '<span style="display:inline-flex;align-items:center;justify-content:center;width:'+size+'px;height:'+size+'px;border-radius:'+Math.round(size*.32)+'px;background:'+s.bg+';color:'+color+';font-weight:900;font-size:'+(size*s.font)+'px;font-family:var(--fd);flex-shrink:0;letter-spacing:-.5px;box-shadow:0 4px 10px -2px rgba(0,0,0,.20)">'+s.sym+'</span>';
  }

  setTimeout(function(){
    calcRender();
    var inp = document.getElementById('calc-monto');
    if(inp){ inp.focus(); inp.select(); }
  }, 60);

  var styles = `<style>
    /* ════════ BASE ════════ */
    .calc-page{background:
      radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37,99,235,.04) 0%, transparent 60%),
      linear-gradient(180deg,#F7F8FB 0%, #FAFAFB 600px);
      min-height:calc(100vh - 100px);
      position:relative;
    }
    .calc-page::before{
      content:'';position:absolute;inset:0;pointer-events:none;
      background-image:linear-gradient(rgba(37,99,235,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.025) 1px,transparent 1px);
      background-size:48px 48px;
      mask-image:radial-gradient(ellipse 70% 50% at 50% 0%, #000 0%, transparent 60%);
    }
    .calc-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:22px;margin-top:8px;align-items:start;position:relative;z-index:1}
    @media(max-width:1080px){.calc-grid{grid-template-columns:1fr}}

    /* ════════ Live rate ticker ════════ */
    .cv-ticker{
      display:flex;align-items:stretch;gap:0;
      background:#fff;border:1px solid #E8EBF2;border-radius:16px;
      padding:0;overflow:hidden;margin-bottom:16px;
      box-shadow:0 1px 3px rgba(15,23,42,.04),0 8px 20px -10px rgba(15,23,42,.06);
    }
    .cv-tk-item{flex:1;padding:16px 20px;display:flex;align-items:center;gap:14px;border-right:1px solid #F1F3F7;position:relative;transition:background .2s}
    .cv-tk-item:hover{background:#FAFBFE}
    .cv-tk-item:last-of-type{border-right:none}
    .cv-tk-flag{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-weight:900;color:#fff;flex-shrink:0;font-size:13px;letter-spacing:-.3px;box-shadow:0 4px 10px -2px rgba(0,0,0,.18)}
    .cv-tk-flag.bcv{background:linear-gradient(135deg,#1D4ED8,#1E3A8A)}
    .cv-tk-flag.eur{background:linear-gradient(135deg,#003399,#001F66);color:#FFD700}
    .cv-tk-flag.bin{background:linear-gradient(135deg,#F0B90B,#D08F00);color:#1f1f23}
    .cv-tk-info{display:flex;flex-direction:column;min-width:0;line-height:1.15;flex:1}
    .cv-tk-lbl{font-size:10px;font-weight:900;color:#94A3B8;letter-spacing:.18em;text-transform:uppercase}
    .cv-tk-val{font-family:var(--fd);font-size:19px;font-weight:900;color:#0F172A;letter-spacing:-.7px;margin-top:3px}
    .cv-tk-val small{font-size:10.5px;color:#94A3B8;font-weight:700;margin-left:4px;letter-spacing:0;font-family:var(--f)}
    .cv-tk-dot{width:7px;height:7px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 3px rgba(34,197,94,.18);flex-shrink:0;animation:livePulse 2s ease-in-out infinite}
    @keyframes livePulse{0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,.18)}50%{box-shadow:0 0 0 6px rgba(34,197,94,.10)}}
    .cv-tk-refresh{padding:0 18px;display:flex;align-items:center;justify-content:center;background:#F8FAFC;border-left:1px solid #ECEEF3;cursor:pointer;color:#64748B;transition:.25s}
    .cv-tk-refresh:hover{background:linear-gradient(135deg,#1D4ED8,#2563EB);color:#fff}
    .cv-tk-refresh:active svg{transform:rotate(180deg)}
    .cv-tk-refresh svg{width:17px;height:17px;transition:transform .5s}

    /* ════════ Converter card ════════ */
    .cv-conv{
      background:#fff;border:1px solid #E8EBF2;border-radius:20px;padding:0;overflow:hidden;
      box-shadow:0 1px 3px rgba(15,23,42,.04),0 12px 32px -16px rgba(15,23,42,.10);
    }
    .cv-row{padding:22px 28px;position:relative;transition:background .2s}
    .cv-row + .cv-row{border-top:1px solid #F1F3F7}
    .cv-row.is-from{background:linear-gradient(180deg,#FCFDFF 0%,#fff 100%)}
    .cv-row.is-to{background:linear-gradient(180deg,#FAFBFF 0%,#fff 100%)}
    .cv-row-label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:900;color:#94A3B8;letter-spacing:.18em;text-transform:uppercase;margin-bottom:14px}
    .cv-row-label svg{width:13px;height:13px;color:#CBD5E1}
    .cv-row-body{display:flex;align-items:center;gap:14px}
    .cv-cur-pick{display:inline-flex;align-items:center;gap:11px;background:#F4F6FB;border:1.5px solid #E5E8F0;padding:11px 14px 11px 12px;border-radius:14px;cursor:pointer;transition:.2s;flex-shrink:0;min-width:148px}
    .cv-cur-pick:hover{border-color:#1D4ED8;background:#fff;box-shadow:0 4px 14px -4px rgba(37,99,235,.20);transform:translateY(-1px)}
    .cv-cur-pick-name{font-size:14.5px;font-weight:900;color:#0F172A;letter-spacing:-.3px;line-height:1}
    .cv-cur-pick-sub{font-size:10.5px;color:#64748B;font-weight:600;margin-top:3px;letter-spacing:.02em}
    .cv-cur-pick svg.chev{width:14px;height:14px;color:#9CA3AF;margin-left:auto;transition:transform .2s}
    .cv-cur-pick:hover svg.chev{transform:translateY(2px);color:#1D4ED8}
    .cv-amount{flex:1;text-align:right;font-family:var(--fd);font-size:42px;font-weight:800;color:#0F172A;background:transparent;border:none;outline:none;letter-spacing:-1.6px;padding:0;width:100%;min-width:0;line-height:1}
    .cv-amount::placeholder{color:#CBD5E1}
    .cv-amount[readonly]{
      color:#1D4ED8;font-weight:900;cursor:default;
      background:linear-gradient(135deg,#1D4ED8 0%, #3B82F6 100%);
      -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
    }
    .cv-amount.is-to{color:#1D4ED8;font-weight:900}

    /* Swap button between FROM and TO rows */
    .cv-swap{position:absolute;left:28px;top:100%;transform:translateY(-50%);z-index:3;width:42px;height:42px;border-radius:50%;background:#fff;border:1.5px solid #E5E8F0;color:#1D4ED8;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px -4px rgba(15,23,42,.12),0 2px 4px rgba(15,23,42,.06);transition:.25s cubic-bezier(.4,0,.2,1)}
    .cv-swap:hover{transform:translateY(-50%) rotate(180deg);background:linear-gradient(135deg,#1D4ED8,#2563EB);color:#fff;border-color:#1D4ED8;box-shadow:0 10px 24px -4px rgba(37,99,235,.40)}
    .cv-swap svg{width:17px;height:17px}

    /* Source toggle: BCV vs BINANCE — premium pill switcher */
    .cv-src{display:flex;background:#F4F6FB;border:1.5px solid #E5E8F0;border-radius:13px;padding:4px;gap:0;position:relative}
    .cv-src-btn{flex:1;background:transparent;border:none;font-family:inherit;padding:11px 14px;font-size:12.5px;font-weight:800;color:#64748B;cursor:pointer;border-radius:9px;display:flex;align-items:center;justify-content:flex-start;gap:9px;letter-spacing:-.1px;transition:.2s;position:relative}
    .cv-src-btn.is-active{background:#fff;color:#0F172A;box-shadow:0 3px 8px rgba(15,23,42,.08),0 0 0 1px rgba(15,23,42,.04)}
    .cv-src-btn svg{width:14px;height:14px;flex-shrink:0}
    .cv-src-btn.is-active svg{color:#1D4ED8}
    .cv-src-rate{font-family:var(--fd);font-weight:900;color:#1D4ED8;font-size:12.5px;margin-left:auto;letter-spacing:-.3px}
    .cv-src-rate small{font-size:9.5px;color:#94A3B8;font-weight:700;margin-left:2px;font-family:var(--f);letter-spacing:0}

    /* Quick amount chips */
    .cv-quick{display:flex;flex-wrap:wrap;gap:7px;padding:14px 28px 22px;background:linear-gradient(180deg,#FAFBFE 0%,#F8FAFC 100%);border-top:1px solid #F1F3F7}
    .cv-quick-lbl{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:900;color:#94A3B8;letter-spacing:.16em;text-transform:uppercase;margin-right:4px;align-self:center}
    .cv-quick-lbl svg{width:11px;height:11px;color:#CBD5E1}
    .cv-quick button{background:#fff;border:1px solid #E5E8F0;color:#1D4ED8;font-family:var(--fd);font-size:12.5px;font-weight:800;padding:7px 13px;border-radius:9px;cursor:pointer;transition:.2s;letter-spacing:-.2px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
    .cv-quick button:hover{background:linear-gradient(135deg,#1D4ED8,#2563EB);color:#fff;border-color:#1D4ED8;transform:translateY(-2px);box-shadow:0 6px 14px -2px rgba(37,99,235,.30)}

    /* ════════ Right panel: stats ════════ */
    .cv-panel{
      background:#fff;border:1px solid #E8EBF2;border-radius:18px;padding:22px 24px;margin-bottom:14px;
      box-shadow:0 1px 3px rgba(15,23,42,.04),0 8px 20px -12px rgba(15,23,42,.08);
    }
    .cv-panel-title{display:flex;align-items:center;gap:9px;font-size:11px;font-weight:900;color:#475569;letter-spacing:.18em;text-transform:uppercase;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #F1F3F7}
    .cv-panel-title-bar{width:4px;height:16px;background:linear-gradient(180deg,#1D4ED8,#3B82F6);border-radius:3px}
    .cv-panel-title-ic{width:22px;height:22px;border-radius:7px;background:#EFF6FF;color:#1D4ED8;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
    .cv-panel-title-ic svg{width:12px;height:12px}

    /* Cruz multi-conversion list */
    .cv-cruz-row{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px dashed #EEF1F6;transition:padding .2s}
    .cv-cruz-row:last-child{border-bottom:none}
    .cv-cruz-row:hover{padding-left:4px}
    .cv-cruz-info{flex:1;min-width:0}
    .cv-cruz-from{font-size:12px;color:#1f2937;font-weight:700;letter-spacing:-.1px;line-height:1.25;display:flex;align-items:center;gap:6px}
    .cv-cruz-from .arrow{color:#94A3B8;font-weight:600}
    .cv-cruz-method{font-size:10.5px;color:#94A3B8;font-weight:600;margin-top:3px;letter-spacing:0;display:flex;align-items:center;gap:5px}
    .cv-cruz-method::before{content:'';width:4px;height:4px;border-radius:50%;background:#CBD5E1}
    .cv-cruz-val{font-family:var(--fd);font-size:17px;font-weight:900;color:#0F172A;letter-spacing:-.5px;text-align:right;white-space:nowrap;line-height:1}
    .cv-cruz-val small{font-size:10.5px;color:#64748B;font-weight:700;margin-left:5px;font-family:var(--f);letter-spacing:0}

    /* Brechas dashboard */
    .cv-br-row{display:grid;grid-template-columns:1fr auto;gap:14px;padding:14px 0;border-bottom:1px dashed #EEF1F6;align-items:center}
    .cv-br-row:last-child{border-bottom:none}
    .cv-br-lbl{font-size:12.5px;color:#0f172a;font-weight:800;letter-spacing:-.2px}
    .cv-br-sub{font-size:10.5px;color:#94A3B8;font-weight:600;margin-top:3px}
    .cv-br-val{font-family:var(--fd);font-size:20px;font-weight:900;letter-spacing:-.6px;white-space:nowrap;text-align:right;line-height:1}
    .cv-br-arrow{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:900;padding:3px 9px;border-radius:50px;margin-top:4px;letter-spacing:.04em;text-transform:lowercase}
    .cv-br-arrow.up{background:#FEF3C7;color:#A16207}
    .cv-br-arrow.high{background:#FEE2E2;color:#991B1B}
    .cv-br-arrow.low{background:#D1FAE5;color:#047857}
    .cv-br-arrow svg{width:10px;height:10px}

    /* ════════ Selector modal ════════ */
    .cv-modal{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:9999;animation:cvBackdropIn .25s ease}
    @keyframes cvBackdropIn{from{opacity:0}to{opacity:1}}
    .cv-modal.is-open{display:flex}
    .cv-modal-inner{background:#fff;border-radius:20px;padding:10px;width:320px;box-shadow:0 32px 72px rgba(15,23,42,.40),0 0 0 1px rgba(255,255,255,.08);animation:cvModalIn .28s cubic-bezier(.34,1.56,.64,1)}
    @keyframes cvModalIn{0%{transform:scale(.92) translateY(20px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}
    .cv-modal-head{padding:16px 16px 10px;font-size:11px;font-weight:900;color:#94A3B8;letter-spacing:.16em;text-transform:uppercase}
    .cv-modal-opt{display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:12px;cursor:pointer;transition:.15s}
    .cv-modal-opt:hover{background:#F4F6FB;transform:translateX(2px)}
    .cv-modal-opt-name{font-size:14.5px;font-weight:900;color:#0F172A;letter-spacing:-.3px}
    .cv-modal-opt-sub{font-size:11px;color:#64748B;font-weight:600;margin-top:2px}
    .cv-modal-opt.is-selected{background:linear-gradient(135deg,#EFF6FF 0%, #DBEAFE 100%);box-shadow:inset 0 0 0 1px rgba(37,99,235,.20)}
    .cv-modal-opt.is-selected .cv-modal-opt-name{color:#1D4ED8}
    .cv-modal-opt-check{margin-left:auto;color:#1D4ED8;opacity:0;transition:.2s}
    .cv-modal-opt.is-selected .cv-modal-opt-check{opacity:1}
    .cv-modal-opt-check svg{width:16px;height:16px}

    /* ════════ Summary line con rate prominent ════════ */
    .cv-summary{
      display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 28px;
      background:linear-gradient(135deg,#EFF6FF 0%,#DBEAFE 60%,#BFDBFE 100%);
      border-bottom:1px solid rgba(37,99,235,.16);
      position:relative;overflow:hidden;
    }
    .cv-summary::before{
      content:'';position:absolute;top:0;right:0;width:200px;height:100%;
      background:radial-gradient(circle at 100% 50%, rgba(255,255,255,.5) 0%, transparent 70%);
      pointer-events:none;
    }
    .cv-summary-ic{
      width:28px;height:28px;border-radius:8px;
      background:rgba(255,255,255,.7);backdrop-filter:blur(8px);
      color:#1D4ED8;display:inline-flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(37,99,235,.12);flex-shrink:0;position:relative;z-index:1;
    }
    .cv-summary-ic svg{width:14px;height:14px}
    .cv-summary-eq{font-family:var(--fd);font-size:14px;font-weight:700;color:#1E40AF;letter-spacing:-.3px;position:relative;z-index:1}
    .cv-summary-eq strong{color:#0F172A}
    .cv-summary-rate{
      font-family:inherit;font-size:11px;font-weight:900;color:#fff;
      background:linear-gradient(135deg,#1D4ED8,#2563EB);
      padding:5px 11px;border-radius:50px;margin-left:auto;
      letter-spacing:.08em;text-transform:uppercase;
      box-shadow:0 4px 10px -2px rgba(37,99,235,.40);
      position:relative;z-index:1;
    }
  </style>`;

  function rateForActiveSource(){
    return fuente === 'BINANCE' ? bin : bcv;
  }

  return styles + `<div class="page calc-page">

  ${pageBanner(
    'Operaciones',
    'Calculadora de tasas',
    'Convierte entre Bs, USD, EUR y USDT con tasas en vivo del BCV y mercado paralelo'
  )}

  <div class="calc-grid">

    <!-- COLUMNA IZQUIERDA: TICKER + CONVERSOR + ATAJOS -->
    <div>
      <!-- Live rates ticker -->
      <div class="cv-ticker" id="cv-ticker">
        <div class="cv-tk-item">
          <span class="cv-tk-flag bcv">B</span>
          <div class="cv-tk-info">
            <span class="cv-tk-lbl">BCV oficial</span>
            <span class="cv-tk-val" id="cv-tk-bcv">${bcv>1?_calcFmt(bcv):'—'}<small>Bs/$</small></span>
          </div>
          <span class="cv-tk-dot"></span>
        </div>
        <div class="cv-tk-item">
          <span class="cv-tk-flag eur">€</span>
          <div class="cv-tk-info">
            <span class="cv-tk-lbl">Euro BCV</span>
            <span class="cv-tk-val" id="cv-tk-eur">${eur>1?_calcFmt(eur):'—'}<small>Bs/€</small></span>
          </div>
          <span class="cv-tk-dot"></span>
        </div>
        <div class="cv-tk-item">
          <span class="cv-tk-flag bin">₿</span>
          <div class="cv-tk-info">
            <span class="cv-tk-lbl">Binance P2P</span>
            <span class="cv-tk-val" id="cv-tk-bin">${bin>1?_calcFmt(bin):'—'}<small>Bs/$</small></span>
          </div>
          <span class="cv-tk-dot"></span>
        </div>
        <button class="cv-tk-refresh" onclick="bcvForzarActualizacion&&bcvForzarActualizacion();setTimeout(calcRender,800)" title="Actualizar tasas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/></svg>
        </button>
      </div>

      <!-- Converter card -->
      <div class="cv-conv">
        <!-- Source toggle -->
        <div style="padding:20px 28px 0">
          <div class="cv-src">
            <button class="cv-src-btn ${fuente==='BCV'?'is-active':''}" onclick="calcSetFuente('BCV')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18M5 22V8l7-5 7 5v14M9 12h2M13 12h2M9 16h2M13 16h2"/></svg>
              Tasa BCV
              <span class="cv-src-rate" id="cv-src-bcv">${bcv>1?_calcFmt(bcv):'—'}<small>Bs</small></span>
            </button>
            <button class="cv-src-btn ${fuente==='BINANCE'?'is-active':''}" onclick="calcSetFuente('BINANCE')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>
              Binance P2P
              <span class="cv-src-rate" id="cv-src-bin">${bin>1?_calcFmt(bin):'—'}<small>Bs</small></span>
            </button>
          </div>
        </div>

        <!-- FROM row -->
        <div class="cv-row is-from">
          <div class="cv-row-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Tú envías
          </div>
          <div class="cv-row-body">
            <button class="cv-cur-pick" onclick="calcOpenSelector('de')">
              ${curIcon(monedaDe, 32)}
              <div style="text-align:left">
                <div class="cv-cur-pick-name" id="cv-de-name">${monedaDe}</div>
                <div class="cv-cur-pick-sub" id="cv-de-sub">${_calcCurName(monedaDe)}</div>
              </div>
              <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <input type="text" inputmode="decimal" id="calc-monto" class="cv-amount"
                   value="${monto.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}"
                   oninput="calcOnInput(event)" onfocus="this.select()" placeholder="0,00">
          </div>
          <button class="cv-swap" onclick="calcSwap()" title="Intercambiar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5-5 5 5"/><path d="M12 5v14"/><path d="M17 14l-5 5-5-5"/></svg>
          </button>
        </div>

        <!-- TO row -->
        <div class="cv-row is-to">
          <div class="cv-row-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Reciben
          </div>
          <div class="cv-row-body">
            <button class="cv-cur-pick" onclick="calcOpenSelector('a')">
              ${curIcon(monedaA, 32)}
              <div style="text-align:left">
                <div class="cv-cur-pick-name" id="cv-a-name">${monedaA}</div>
                <div class="cv-cur-pick-sub" id="cv-a-sub">${_calcCurName(monedaA)}</div>
              </div>
              <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <input type="text" id="calc-result" class="cv-amount is-to" readonly value="0,00">
          </div>
        </div>

        <!-- Summary -->
        <div class="cv-summary" id="cv-summary">
          <span class="cv-summary-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/></svg>
          </span>
          <span class="cv-summary-eq" id="cv-summary-eq">1 ${monedaDe} = … ${monedaA}</span>
          <span class="cv-summary-rate" id="cv-summary-rate">${fuente==='BCV'?'BCV oficial':'Binance P2P'}</span>
        </div>

        <!-- Quick amounts -->
        <div class="cv-quick">
          <span class="cv-quick-lbl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>
            Atajos
          </span>
          <button onclick="calcQuick(10)">10</button>
          <button onclick="calcQuick(50)">50</button>
          <button onclick="calcQuick(100)">100</button>
          <button onclick="calcQuick(500)">500</button>
          <button onclick="calcQuick(1000)">1.000</button>
          <button onclick="calcQuick(5000)">5.000</button>
          <button onclick="calcQuick(10000)">10.000</button>
        </div>
      </div>
    </div>

    <!-- COLUMNA DERECHA: CRUZ + BRECHAS -->
    <div>
      <!-- Equivalencias cruzadas -->
      <div class="cv-panel">
        <div class="cv-panel-title">
          <span class="cv-panel-title-bar"></span>
          <span class="cv-panel-title-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l10-10M7 7h10v10"/></svg>
          </span>
          Equivalencias cruzadas
        </div>
        <div id="cv-cruz"></div>
      </div>

      <!-- Brechas dashboard -->
      <div class="cv-panel">
        <div class="cv-panel-title">
          <span class="cv-panel-title-bar"></span>
          <span class="cv-panel-title-ic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-5"/></svg>
          </span>
          Brechas del mercado
        </div>
        <div id="cv-brechas"></div>
      </div>
    </div>

  </div>

  <!-- Selector modal -->
  <div class="cv-modal" id="cv-modal" onclick="if(event.target===this)calcCloseSelector()">
    <div class="cv-modal-inner">
      <div class="cv-modal-head">Elegí una moneda</div>
      <div id="cv-modal-opts"></div>
    </div>
  </div>

  </div>`;
};

// ─── ESTADO ───
window._calcMonedaDe = window._calcMonedaDe || 'USD';
window._calcMonedaA  = window._calcMonedaA  || 'Bs';
window._calcFuente   = window._calcFuente   || 'BCV';
window._calcMonto    = (typeof window._calcMonto === 'number') ? window._calcMonto : 100;
window._calcSelectorTarget = 'de';

function _calcCurName(m){
  return {USD:'Dólar EE.UU.', Bs:'Bolívares VE', EUR:'Euro', USDT:'Tether USDT'}[m] || m;
}

function _calcParseMonto(str){
  if(typeof str === 'number') return str;
  str = String(str||'').trim();
  if(!str) return 0;
  var lastComma = str.lastIndexOf(',');
  var lastDot = str.lastIndexOf('.');
  if(lastComma > lastDot){ str = str.replace(/\./g,'').replace(',','.'); }
  else if(lastDot > lastComma){ str = str.replace(/,/g,''); }
  else {
    if((str.match(/\./g)||[]).length > 1) str = str.replace(/\./g,'');
    if((str.match(/,/g)||[]).length > 1) str = str.replace(/,/g,'');
    str = str.replace(',','.');
  }
  var n = parseFloat(str);
  return isFinite(n) ? n : 0;
}

function _calcFmt(n, frac){
  if(!isFinite(n) || n === 0) return '0,00';
  frac = (frac == null) ? 2 : frac;
  return n.toLocaleString('es-VE',{minimumFractionDigits:frac, maximumFractionDigits:frac});
}

// Convierte cualquier moneda a USD usando la fuente activa
function _calcToUsd(monto, m, fuente, bcv, eur, bin){
  var rate = fuente === 'BINANCE' ? bin : bcv;
  if(m==='USD' || m==='USDT') return monto;
  if(m==='Bs')  return rate>0 ? monto/rate : 0;
  if(m==='EUR') return bcv>0 && eur>0 ? (monto*eur)/bcv : 0;
  return 0;
}

// Convierte USD a moneda destino usando la fuente activa
function _calcFromUsd(usd, m, fuente, bcv, eur, bin){
  var rate = fuente === 'BINANCE' ? bin : bcv;
  if(m==='USD' || m==='USDT') return usd;
  if(m==='Bs')  return usd * rate;
  if(m==='EUR') return eur>0 && bcv>0 ? (usd*bcv)/eur : 0;
  return 0;
}

function calcOnInput(ev){
  // Sin reformateo en vivo: el usuario escribe libre (dígitos, "," o "." para decimales).
  // El parser interpreta el valor. Así no se rompe al pasar de 3 dígitos.
  window._calcMonto = _calcParseMonto(ev.target.value);
  calcRender();
}

function calcSetFuente(f){
  window._calcFuente = f;
  document.querySelectorAll('.cv-src-btn').forEach(function(b,i){
    b.classList.toggle('is-active', (i===0&&f==='BCV')||(i===1&&f==='BINANCE'));
  });
  calcRender();
}

function calcSwap(){
  var de = window._calcMonedaDe, a = window._calcMonedaA;
  window._calcMonedaDe = a;
  window._calcMonedaA = de;
  // Refresh: re-render full page sections that show de/a
  nav('calculadora');
}

function calcQuick(monto){
  window._calcMonto = monto;
  var input = document.getElementById('calc-monto');
  if(input) input.value = monto.toLocaleString('es-VE',{minimumFractionDigits:2, maximumFractionDigits:2});
  calcRender();
}

// ─── Selector modal ───
function calcOpenSelector(target){
  window._calcSelectorTarget = target;
  var modal = document.getElementById('cv-modal');
  var opts = document.getElementById('cv-modal-opts');
  if(!modal || !opts) return;
  var current = target==='de' ? window._calcMonedaDe : window._calcMonedaA;
  var monedas = ['USD','Bs','EUR','USDT'];
  var html = '';
  var styles = {
    USD: {bg:'#15803D', sym:'$', font:.65},
    Bs : {bg:'#1f1f23', sym:'Bs', font:.42},
    EUR: {bg:'#003399', sym:'€', font:.62},
    USDT:{bg:'#26A17B', sym:'₮', font:.58}
  };
  monedas.forEach(function(m){
    var s = styles[m];
    html += '<div class="cv-modal-opt '+(m===current?'is-selected':'')+'" onclick="calcSelect(\''+m+'\')">'
      + '<span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;background:'+s.bg+';color:#fff;font-weight:900;font-size:'+(36*s.font)+'px;font-family:var(--fd);flex-shrink:0;letter-spacing:-.5px;box-shadow:0 4px 10px -2px rgba(0,0,0,.18)">'+s.sym+'</span>'
      + '<div style="flex:1">'
        + '<div class="cv-modal-opt-name">'+m+'</div>'
        + '<div class="cv-modal-opt-sub">'+_calcCurName(m)+'</div>'
      + '</div>'
      + '<span class="cv-modal-opt-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>'
    + '</div>';
  });
  opts.innerHTML = html;
  modal.classList.add('is-open');
}

function calcCloseSelector(){
  var modal = document.getElementById('cv-modal');
  if(modal) modal.classList.remove('is-open');
}

function calcSelect(m){
  var target = window._calcSelectorTarget;
  if(target==='de') window._calcMonedaDe = m;
  else window._calcMonedaA = m;
  // Si las dos quedan iguales, intercambiar
  if(window._calcMonedaDe === window._calcMonedaA){
    if(target==='de') window._calcMonedaA = (m==='USD'?'Bs':'USD');
    else window._calcMonedaDe = (m==='USD'?'Bs':'USD');
  }
  calcCloseSelector();
  nav('calculadora');
}

// ─── RENDER ───
function calcRender(){
  var bcv = window._tasaBsGlobal || 0;
  var eur = window._tasaEuro || 0;
  var bin = window._tasaBinance || 0;
  var fuente = window._calcFuente || 'BCV';
  var de = window._calcMonedaDe || 'USD';
  var a  = window._calcMonedaA  || 'Bs';
  var monto = window._calcMonto || 0;

  // Update ticker values
  var setText = function(id, v){ var el = document.getElementById(id); if(el) el.innerHTML = v; };
  setText('cv-tk-bcv', (bcv>1 ? _calcFmt(bcv) : '—')+'<small>Bs/$</small>');
  setText('cv-tk-eur', (eur>1 ? _calcFmt(eur) : '—')+'<small>Bs/€</small>');
  setText('cv-tk-bin', (bin>1 ? _calcFmt(bin) : '—')+'<small>Bs/$</small>');
  setText('cv-src-bcv', bcv>1 ? _calcFmt(bcv) : '—');
  setText('cv-src-bin', bin>1 ? _calcFmt(bin) : '—');

  // Compute result: de → USD → a
  var enUsd = _calcToUsd(monto, de, fuente, bcv, eur, bin);
  var result = _calcFromUsd(enUsd, a, fuente, bcv, eur, bin);

  var resultEl = document.getElementById('calc-result');
  if(resultEl) resultEl.value = _calcFmt(result);

  // Summary line: "1 USD = 544,58 Bs · BCV"
  var unidad = _calcFromUsd(_calcToUsd(1, de, fuente, bcv, eur, bin), a, fuente, bcv, eur, bin);
  setText('cv-summary-eq', '1 '+de+' = <strong style="font-weight:900">'+_calcFmt(unidad, unidad<1?4:2)+'</strong> '+a);

  // ─── EQUIVALENCIAS CRUZADAS (todas las otras conversiones del monto) ───
  var otras = ['USD','Bs','EUR','USDT'].filter(function(x){ return x !== de && x !== a; });
  // siempre mostrar también la misma moneda con la otra fuente si aplica (BCV vs Binance)
  var cruz = '';
  function cruzRow(fromTxt, toTxt, valor, cur, method){
    return '<div class="cv-cruz-row">'
      + '<div class="cv-cruz-info">'
        + '<div class="cv-cruz-from">'+fromTxt+' <span class="arrow">→</span> '+toTxt+'</div>'
        + '<div class="cv-cruz-method">'+method+'</div>'
      + '</div>'
      + '<div class="cv-cruz-val">'+_calcFmt(valor)+'<small>'+cur+'</small></div>'
    + '</div>';
  }

  // Conversión a las otras monedas
  otras.forEach(function(m){
    var v = _calcFromUsd(enUsd, m, fuente, bcv, eur, bin);
    if(v > 0){
      cruz += cruzRow(monto.toLocaleString('es-VE')+' '+de, m, v, m, 'Vía '+(fuente==='BCV'?'BCV oficial':'Binance P2P'));
    }
  });

  // Misma conversión pero con la otra fuente (para que se vea la brecha en práctica)
  if(fuente === 'BCV' && bin > 1){
    var resultBin = _calcFromUsd(_calcToUsd(monto, de, 'BINANCE', bcv, eur, bin), a, 'BINANCE', bcv, eur, bin);
    if(resultBin > 0 && Math.abs(resultBin - result) > 0.01){
      cruz += cruzRow(monto.toLocaleString('es-VE')+' '+de, a, resultBin, a, 'Si usaras Binance P2P en vez de BCV');
    }
  } else if(fuente === 'BINANCE' && bcv > 1){
    var resultBcv = _calcFromUsd(_calcToUsd(monto, de, 'BCV', bcv, eur, bin), a, 'BCV', bcv, eur, bin);
    if(resultBcv > 0 && Math.abs(resultBcv - result) > 0.01){
      cruz += cruzRow(monto.toLocaleString('es-VE')+' '+de, a, resultBcv, a, 'Si usaras BCV oficial en vez de Binance');
    }
  }

  var cruzEl = document.getElementById('cv-cruz');
  if(cruzEl) cruzEl.innerHTML = cruz || '<div style="padding:14px;text-align:center;color:#9CA3AF;font-size:12px">Sin equivalencias adicionales</div>';

  // ─── BRECHAS DASHBOARD ───
  var br = '';
  function brRow(lbl, sub, val, arrow, arrowKind){
    var arrowSvg = arrowKind==='high'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l10-10M7 7h10v10"/></svg>'
      : arrowKind==='up'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14l5-5 5 5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    return '<div class="cv-br-row">'
      + '<div>'
        + '<div class="cv-br-lbl">'+lbl+'</div>'
        + '<div class="cv-br-sub">'+sub+'</div>'
      + '</div>'
      + '<div style="text-align:right">'
        + '<div class="cv-br-val" style="color:'+(arrowKind==='high'?'#991B1B':(arrowKind==='low'?'#047857':'#A16207'))+'">'+val+'</div>'
        + (arrow ? '<span class="cv-br-arrow '+arrowKind+'">'+arrowSvg+arrow+'</span>' : '')
      + '</div>'
    + '</div>';
  }
  function brKind(pct){ return pct > 30 ? 'high' : (pct > 15 ? 'up' : 'low'); }

  if(bcv > 1 && bin > 1){
    var pct = ((bin - bcv) / bin) * 100;
    br += brRow(
      'BCV vs Binance (USD)',
      'Brecha del paralelo sobre el oficial',
      (pct>=0?'+':'')+pct.toFixed(1)+'%',
      'Bs '+_calcFmt(bin-bcv)+' por USD',
      brKind(pct)
    );
  }

  if(bcv > 1 && eur > 1){
    var eurUsdBcv = eur / bcv;
    br += brRow(
      'EUR/USD implícito',
      'Cross-rate del BCV (mercado int. ≈ 1.08)',
      eurUsdBcv.toFixed(4),
      '',
      'low'
    );
  }

  if(bcv > 1 && eur > 1 && bin > 1){
    var eurParalelo = bin * (eur / bcv);
    var pctE = ((eurParalelo - eur) / eurParalelo) * 100;
    br += brRow(
      'EUR oficial vs paralelo',
      '1 EUR paralelo ≈ Bs '+_calcFmt(eurParalelo),
      (pctE>=0?'+':'')+pctE.toFixed(1)+'%',
      'Bs '+_calcFmt(eurParalelo-eur)+' por EUR',
      brKind(pctE)
    );
  }

  if(bcv > 1 && bin > 1){
    br += brRow(
      'Premium USD paralelo',
      'Cuánto más caro es el dólar Binance',
      'Bs '+_calcFmt(bin - bcv),
      'sobre el oficial',
      'up'
    );
  }

  var brEl = document.getElementById('cv-brechas');
  if(brEl) brEl.innerHTML = br || '<div style="padding:14px;text-align:center;color:#9CA3AF;font-size:12px">Cargando tasas…</div>';
}

window.calcOnInput = calcOnInput;
window.calcSetFuente = calcSetFuente;
window.calcSwap = calcSwap;
window.calcQuick = calcQuick;
window.calcOpenSelector = calcOpenSelector;
window.calcCloseSelector = calcCloseSelector;
window.calcSelect = calcSelect;
window.calcRender = calcRender;
