// ══════════════════════════════════════════════════════════════
// BCV AUTO — Actualización automática diaria de la tasa BCV
// Fuente: ve.dolarapi.com (gratuita, sin API key, oficial BCV)
// Flujo: al cargar la app → verifica si la tasa del día ya existe
//        en Firestore → si no, la descarga y la guarda automáticamente
// ══════════════════════════════════════════════════════════════

var _bcvAutoEstado = 'inactivo'; // 'inactivo' | 'cargando' | 'ok' | 'error'
var _bcvAutoFecha  = '';
var _bcvAutoTasa   = 0;
// Tasa Binance (mercado paralelo / P2P)
var _binanceTasa = 0;
var _binanceEstado = 'inactivo';
// Tasa Euro oficial BCV (mercado real venezolano)
var _eurTasa = 0;
var _eurEstado = 'inactivo';

// Endpoints en orden de preferencia (fallback si uno falla)
var _BCV_ENDPOINTS = [
  'https://ve.dolarapi.com/v1/dolares/oficial',
  'https://bcv-api.rafnixg.dev/rates/'
];

// Endpoints para tasa Binance / Paralelo
var _BINANCE_ENDPOINTS = [
  // 1) CriptoYa: libro P2P REAL de Binance (USDT/VES), refrescado al minuto y con CORS abierto.
  //    'bid' = precio al que se vende USDT por Bs, que es la tasa que opera la empresa.
  'https://criptoya.com/api/binancep2p/USDT/VES/100',
  // 2) Paralelo de referencia (EnParaleloVzla) — va atrasado frente al P2P, solo fallback
  'https://ve.dolarapi.com/v1/dolares/paralelo',
  'https://pydolarvenezuela-api.vercel.app/api/v1/dollar?monitor=binance'
];

// Endpoints para EUR/VES oficial BCV (real del mercado venezolano)
// Estrategia: scraping directo de bcv.org.ve via proxy CORS + fallback a APIs
var _EUR_ENDPOINTS = [
  // 1) Scrape directo de la página oficial del BCV via allorigins
  'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.bcv.org.ve/'),
  // 2) Proxy alternativo de scraping
  'https://corsproxy.io/?' + encodeURIComponent('https://www.bcv.org.ve/'),
  // 3) Fallback: API publica con tasa de mercado europea (no necesariamente BCV)
  'https://open.er-api.com/v6/latest/EUR',
  // 4) Endpoint legacy por si vuelve
  'https://ve.dolarapi.com/v1/cotizaciones'
];

// El workflow de GitHub Actions escribe la tasa Binance (aviso mas caro del
// P2P real) cada 15 min. Si ese valor es fresco, el cliente NO lo pisa con
// el fallback de CriptoYa; solo consulta por su cuenta cuando quedo viejo.
// El bot de GitHub Actions escribe la tasa una vez al dia (9:00 Venezuela) con
// el aviso P2P mas caro, que el navegador NO puede consultar por si mismo (el
// endpoint de Binance no permite CORS). Por eso la damos por vigente hasta la
// corrida siguiente: 25 h deja margen si el cron de GitHub se atrasa. Si pasa
// mas tiempo (el bot fallo), el navegador vuelve a CriptoYa como respaldo.
var _BINANCE_VIGENCIA_MS = 25*60*60*1000;
function _binanceEsFresca(d){
  if(!d || !d.fechaBinanceTs) return false;
  var t = Date.parse(d.fechaBinanceTs);
  return !isNaN(t) && (Date.now() - t) < _BINANCE_VIGENCIA_MS;
}

// ── Función principal — llamar al inicio de la app ──
function bcvAutoInit(){
  if(!db){
    console.log('[BCV-Auto] Sin Firebase — actualización automática desactivada');
    // Descargar Binance igual aunque no haya Firebase (no requiere persistencia)
    _binanceFetchTasa(0);
    return;
  }
  var hoy = hoyLocalISO();

  // Verificar si ya tenemos la tasa de hoy en Firestore
  db.collection('config').doc('tasa').get().then(function(doc){
    if(doc.exists){
      var d = doc.data();
      var fechaGuardada = (d.fechaActualizacion||d.fecha||'').slice(0,10);
      var tasaGuardada  = parseFloat(d.tasaBs||0);
      var binanceGuardada = parseFloat(d.tasaBinance||0);
      var euroGuardada = parseFloat(d.tasaEuro||0);

      if(fechaGuardada === hoy && tasaGuardada > 1){
        // Ya tenemos la tasa BCV de hoy — usar directamente
        window._tasaBsGlobal = tasaGuardada;
        _bcvAutoEstado = 'ok';
        _bcvAutoFecha  = fechaGuardada;
        _bcvAutoTasa   = tasaGuardada;
        if(binanceGuardada > 1){
          window._tasaBinance = binanceGuardada;
          _binanceTasa = binanceGuardada;
          _binanceEstado = 'ok';
        }
        if(euroGuardada > 1){
          window._tasaEuro = euroGuardada;
          _eurTasa = euroGuardada;
          _eurEstado = 'ok';
        }
        _bcvActualizarUI();
        console.log('[BCV-Auto] Tasas de hoy ya en Firestore: BCV '+tasaGuardada+' · Binance '+binanceGuardada+' · EUR '+euroGuardada);
        // Si falta alguna, descargarla
        if(!_binanceEsFresca(d)) _binanceFetchTasa(0); // si el workflow la puso hace <30 min, esa manda
        if(!euroGuardada || euroGuardada <= 1) _eurFetchTasa(0);
        return;
      }
    }
    // No hay tasa de hoy → descargar del API
    console.log('[BCV-Auto] Descargando tasas BCV, Binance y EUR de hoy...');
    _bcvAutoEstado = 'cargando';
    _binanceEstado = 'cargando';
    _eurEstado = 'cargando';
    _bcvActualizarUI();
    _bcvFetchTasa(0);
    _binanceFetchTasa(0);
    _eurFetchTasa(0);
  }).catch(function(err){
    console.warn('[BCV-Auto] Error leyendo Firestore:', err.message);
    _bcvFetchTasa(0);
    _binanceFetchTasa(0);
    _eurFetchTasa(0);
  });
}
window.bcvAutoInit = bcvAutoInit;

// ─── EUR fetcher (tasa BCV oficial venezolana, NO calculada) ──
function _eurFetchTasa(endpointIdx){
  if(endpointIdx >= _EUR_ENDPOINTS.length){
    _eurEstado = 'error';
    _bcvActualizarUI();
    return;
  }
  var url = _EUR_ENDPOINTS[endpointIdx];
  var ctrl = (typeof AbortController!=='undefined') ? new AbortController() : null;
  var to = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 6000);
  fetch(url, ctrl ? {signal: ctrl.signal} : {})
    .then(function(res){ clearTimeout(to); if(!res.ok) throw new Error('HTTP '+res.status); return res.text(); })
    .then(function(txt){
      // Algunos endpoints son JSON, otros son HTML scraping
      var data;
      try { data = JSON.parse(txt); } catch(e){ data = {__rawText:txt}; }
      var tasa = _eurParseTasa(data, url);
      if(!tasa || tasa < 1) throw new Error('EUR/VES no encontrado en endpoint #'+(endpointIdx+1));
      tasa = Math.round(tasa * 100) / 100;
      window._tasaEuro = tasa;
      _eurTasa = tasa;
      _eurEstado = 'ok';
      if(db){
        db.collection('config').doc('tasa').set({
          tasaEuro: tasa,
          fechaEuro: hoyLocalISO()
        }, {merge:true}).catch(function(){});
      }
      _bcvActualizarUI();
    })
    .catch(function(err){
      clearTimeout(to);
      _eurFetchTasa(endpointIdx + 1);
    });
}

// Parsea la tasa EUR según el formato de cada API venezolana
function _eurParseTasa(data, url){
  // ─── Caso 1: scraping HTML de bcv.org.ve via proxy ───
  if(data && data.__rawText){
    return _extractEurFromBcvHtml(data.__rawText);
  }
  // ─── Caso 2: allorigins envuelve el HTML en data.contents ───
  if(data && data.contents && typeof data.contents === 'string'){
    return _extractEurFromBcvHtml(data.contents);
  }
  // ─── Caso 3: open.er-api.com base EUR → rates.VES ───
  // { result: "success", rates: { VES: 580.25, USD: 1.08, ... } }
  if(data && data.rates && data.rates.VES && parseFloat(data.rates.VES) > 1){
    return parseFloat(data.rates.VES);
  }
  // ─── Caso 4: pydolarvenezuela v1 ───
  if(data && data.price && parseFloat(data.price) > 1) return parseFloat(data.price);
  // ─── Caso 5: pydolarvenezuela v2 ───
  if(data && data.monitors && data.monitors.bcv && data.monitors.bcv.price) return parseFloat(data.monitors.bcv.price);
  // ─── Caso 6: bcv-api.rafnixg.dev ───
  if(data && data.EUR && data.EUR.rate && parseFloat(data.EUR.rate) > 1) return parseFloat(data.EUR.rate);
  if(data && data.eur && parseFloat(data.eur) > 1) return parseFloat(data.eur);
  // ─── Caso 7: ve.dolarapi cotizaciones (array) ───
  if(Array.isArray(data)){
    var eurEntry = data.find(function(d){ return d && (d.moneda === 'EUR' || d.codigo === 'EUR' || /euro/i.test(d.nombre||'')); });
    if(eurEntry){
      var v = eurEntry.promedio || eurEntry.precio || eurEntry.venta;
      if(v && parseFloat(v) > 1) return parseFloat(v);
    }
  }
  // ─── Otros formatos genéricos ───
  if(data && data.euro && parseFloat(data.euro) > 1) return parseFloat(data.euro);
  if(data && data.tasaEur && parseFloat(data.tasaEur) > 1) return parseFloat(data.tasaEur);
  return 0;
}

// Extrae la tasa EUR del HTML de bcv.org.ve
function _extractEurFromBcvHtml(html){
  if(!html || typeof html !== 'string') return 0;
  // BCV publica el euro en un div#euro con <strong>X,XX</strong>
  // Patrón principal: <div id="euro">...<strong>1.234,56</strong>
  var patterns = [
    /id=['"]euro['"][^>]*>[\s\S]*?<strong>\s*([0-9.,]+)\s*<\/strong>/i,
    /<div[^>]*>\s*EUR\s*<\/div>\s*<div[^>]*>\s*<strong>\s*([0-9.,]+)\s*<\/strong>/i,
    /euro[\s\S]{0,500}?<strong>\s*([0-9.,]+)\s*<\/strong>/i
  ];
  for(var i=0;i<patterns.length;i++){
    var m = html.match(patterns[i]);
    if(m && m[1]){
      // "1.234,56" → 1234.56 (formato venezolano: punto miles, coma decimal)
      var raw = m[1].trim();
      var num = raw.replace(/\./g,'').replace(',','.');
      var v = parseFloat(num);
      if(v && v > 1) return v;
    }
  }
  return 0;
}

// ─── Binance fetcher ──
function _binanceFetchTasa(endpointIdx){
  if(endpointIdx >= _BINANCE_ENDPOINTS.length){
    _binanceEstado = 'error';
    _bcvActualizarUI();
    return;
  }
  var url = _BINANCE_ENDPOINTS[endpointIdx];
  var ctrl = (typeof AbortController!=='undefined') ? new AbortController() : null;
  var to = setTimeout(function(){ if(ctrl) ctrl.abort(); }, 5000);
  fetch(url, ctrl ? {signal: ctrl.signal} : {})
    .then(function(res){ clearTimeout(to); if(!res.ok) throw new Error('HTTP '+res.status); return res.json(); })
    .then(function(data){
      // ve.dolarapi.com /paralelo: { promedio, venta, compra }
      // pydolarvenezuela /binance: { monitors: { binance: { price: X } } }
      var tasa = 0;
      // criptoya binancep2p: { ask, bid } — bid = venta de USDT (la tasa operativa)
      if(data.bid && parseFloat(data.bid) > 1) tasa = parseFloat(data.bid);
      else if(data.ask && parseFloat(data.ask) > 1) tasa = parseFloat(data.ask);
      else if(data.promedio && parseFloat(data.promedio) > 1) tasa = parseFloat(data.promedio);
      else if(data.venta && parseFloat(data.venta) > 1) tasa = parseFloat(data.venta);
      else if(data.price && parseFloat(data.price) > 1) tasa = parseFloat(data.price);
      else if(data.monitors && data.monitors.binance && data.monitors.binance.price) tasa = parseFloat(data.monitors.binance.price);
      if(!tasa || tasa < 1) throw new Error('Tasa Binance inválida');
      tasa = Math.round(tasa * 100) / 100;
      window._tasaBinance = tasa;
      _binanceTasa = tasa;
      _binanceEstado = 'ok';
      // Guardar en Firestore junto con la BCV
      if(db){
        db.collection('config').doc('tasa').set({tasaBinance: tasa, fechaBinance: hoyLocalISO(), fechaBinanceTs: new Date().toISOString(), binanceFuente: 'criptoya-fallback'}, {merge:true}).catch(function(){});
      }
      _bcvActualizarUI();
    })
    .catch(function(){
      clearTimeout(to);
      _binanceFetchTasa(endpointIdx + 1);
    });
}

// ── Descarga la tasa con fallback entre endpoints ──
function _bcvFetchTasa(endpointIdx){
  if(endpointIdx >= _BCV_ENDPOINTS.length){
    _bcvAutoEstado = 'error';
    _bcvActualizarUI();
    console.warn('[BCV-Auto] Todos los endpoints fallaron. Mantener tasa anterior.');
    return;
  }

  var url = _BCV_ENDPOINTS[endpointIdx];
  fetch(url)
    .then(function(res){
      if(!res.ok) throw new Error('HTTP '+res.status);
      return res.json();
    })
    .then(function(data){
      var tasa = _bcvParseTasa(data, url);
      if(!tasa || tasa < 1){
        throw new Error('Tasa inválida: '+tasa);
      }
      _bcvGuardarTasa(tasa, data.fechaActualizacion || data.date || new Date().toISOString());
    })
    .catch(function(err){
      console.warn('[BCV-Auto] Endpoint '+url+' falló:', err.message);
      _bcvFetchTasa(endpointIdx + 1);
    });
}

// ── Parsea la tasa según el formato de cada API ──
function _bcvParseTasa(data, url){
  // ve.dolarapi.com formato: { promedio: 480.25, venta: ..., compra: ... }
  if(data.promedio && parseFloat(data.promedio) > 1) return parseFloat(data.promedio);
  if(data.venta    && parseFloat(data.venta)    > 1) return parseFloat(data.venta);
  // bcv-api.rafnixg.dev formato: { USD: { rate: 480.25 } }
  if(data.USD && data.USD.rate && parseFloat(data.USD.rate) > 1) return parseFloat(data.USD.rate);
  // Formato genérico: { tasa: ... } o { rate: ... } o { dolar: ... }
  if(data.tasa  && parseFloat(data.tasa)  > 1) return parseFloat(data.tasa);
  if(data.rate  && parseFloat(data.rate)  > 1) return parseFloat(data.rate);
  if(data.dolar && parseFloat(data.dolar) > 1) return parseFloat(data.dolar);
  return 0;
}

// ── Guarda la tasa en Firestore y actualiza la UI ──
function _bcvGuardarTasa(tasa, fechaISO){
  var hoy = hoyLocalISO();
  var tasaRedondeada = Math.round(tasa * 100) / 100;

  window._tasaBsGlobal  = tasaRedondeada;
  _bcvAutoEstado        = 'ok';
  _bcvAutoFecha         = hoy;
  _bcvAutoTasa          = tasaRedondeada;

  // Actualizar input de configuración si está visible
  if($('cfg_tasa_bs')) $('cfg_tasa_bs').value = tasaRedondeada;

  // Guardar en Firestore
  if(db){
    db.collection('config').doc('tasa').set({
      tasaBs:            tasaRedondeada,
      fechaActualizacion: hoy,
      fecha:             fechaISO || new Date().toISOString(),
      fuenteAuto:        true,
      api:               _BCV_ENDPOINTS[0]
    }).then(function(){
      console.log('[BCV-Auto] Tasa guardada en Firestore: '+tasaRedondeada+' Bs./$ ('+hoy+')');
      _bcvActualizarUI();
      toast('Tasa BCV actualizada: '+tasaRedondeada+' Bs./$', 'success');
    }).catch(function(err){
      console.warn('[BCV-Auto] Error guardando en Firestore:', err.message);
      _bcvActualizarUI();
    });
  } else {
    _bcvActualizarUI();
  }
}

// ── Actualiza cualquier elemento de UI que muestre la tasa ──
function _bcvActualizarUI(){
  // Badge en el módulo de configuración
  var badge = $('bcv-auto-badge');
  if(badge) badge.innerHTML = _bcvBadgeHTML();

  // KPI de tasa en la card de configuración
  var kpi = $('bcv-kpi-tasa');
  if(kpi){
    kpi.textContent = (_bcvAutoTasa || window._tasaBsGlobal || 1).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' Bs';
  }

  // Input numérico
  if($('cfg_tasa_bs') && _bcvAutoTasa > 1){
    $('cfg_tasa_bs').value = _bcvAutoTasa;
  }

  // Card del Dashboard (Tasa del día)
  function _fmtTasa(v){ return v.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  var dashBCV = document.getElementById('dash-tasa-bcv');
  if(dashBCV){
    var bcv = _bcvAutoTasa || window._tasaBsGlobal || 0;
    dashBCV.textContent = bcv > 1 ? _fmtTasa(bcv) : '—';
  }
  var dashBinance = document.getElementById('dash-tasa-binance');
  if(dashBinance){
    var bin = _binanceTasa || window._tasaBinance || 0;
    dashBinance.textContent = bin > 1 ? _fmtTasa(bin) : '—';
  }
  var dashEur = document.getElementById('dash-tasa-eur');
  if(dashEur){
    var eur = _eurTasa || window._tasaEuro || 0;
    dashEur.textContent = eur > 1 ? _fmtTasa(eur) : '—';
  }
  var dashSpread = document.getElementById('dash-tasa-spread');
  if(dashSpread){
    var b1 = _bcvAutoTasa || window._tasaBsGlobal || 0;
    var b2 = _binanceTasa || window._tasaBinance || 0;
    if(b1 > 1 && b2 > 1){
      // Brecha cambiaria: (paralelo - oficial) / oficial — cuánto está el paralelo por encima del oficial
      var pct = ((b2 - b1) / b1) * 100;
      dashSpread.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
      dashSpread.style.color = pct > 30 ? '#E8335A' : (pct > 15 ? '#BA7517' : '#15803D');
    } else {
      dashSpread.textContent = '—';
    }
  }
  // Brecha EUR oficial → paralelo (Binance): cuánto está el paralelo respecto al euro oficial
  var dashSpreadEur = document.getElementById('dash-tasa-spread-eur');
  if(dashSpreadEur){
    var e1 = _eurTasa || window._tasaEuro || 0;
    var e2 = _binanceTasa || window._tasaBinance || 0;
    if(e1 > 1 && e2 > 1){
      var pctE = ((e2 - e1) / e1) * 100;
      dashSpreadEur.textContent = (pctE >= 0 ? '+' : '') + pctE.toFixed(1) + '%';
      dashSpreadEur.style.color = pctE > 30 ? '#E8335A' : (pctE > 15 ? '#BA7517' : '#15803D');
    } else {
      dashSpreadEur.textContent = '—';
    }
  }
}
window._bcvActualizarUI = _bcvActualizarUI;

// ── HTML del badge de estado ──
function _bcvBadgeHTML(){
  var tasa = _bcvAutoTasa || window._tasaBsGlobal || 1;
  if(_bcvAutoEstado === 'cargando'){
    return '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.2);border-radius:9px;font-size:12px;color:var(--p1)">'
      +'<div style="width:10px;height:10px;border-radius:50%;background:var(--p1);animation:pulse 1s infinite"></div>'
      +'<span><strong>Actualizando tasa BCV...</strong> Consultando ve.dolarapi.com</span>'
      +'</div>';
  }
  if(_bcvAutoEstado === 'ok'){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:var(--greens);border:1px solid rgba(6,176,106,0.2);border-radius:9px">'
      +'<div style="display:flex;align-items:center;gap:8px">'
      +'<div style="width:10px;height:10px;border-radius:50%;background:var(--green)"></div>'
      +'<div>'
      +'<div style="font-size:12px;font-weight:700;color:var(--green)">Tasa BCV actualizada automáticamente</div>'
      +'<div style="font-size:10.5px;color:var(--ink3)">Fuente: ve.dolarapi.com · Fecha: '+(_bcvAutoFecha||hoyLocalISO())+' · Actualiza cada día automáticamente</div>'
      +'</div>'
      +'</div>'
      +'<div style="font-family:var(--fd);font-size:22px;font-weight:900;color:var(--green);white-space:nowrap">'
      +tasa.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' Bs./$'
      +'</div>'
      +'</div>';
  }
  if(_bcvAutoEstado === 'error'){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:var(--reds);border:1px solid rgba(217,59,90,0.2);border-radius:9px">'
      +'<div style="display:flex;align-items:center;gap:8px">'
      +'<div style="width:10px;height:10px;border-radius:50%;background:var(--red)"></div>'
      +'<div>'
      +'<div style="font-size:12px;font-weight:700;color:var(--red)">No se pudo obtener la tasa automáticamente</div>'
      +'<div style="font-size:10.5px;color:var(--ink3)">Usando tasa guardada: '+tasa.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' Bs./$ · Actualiza manualmente o reintenta</div>'
      +'</div>'
      +'</div>'
      +'<button class="btn btn-p btn-sm" onclick="bcvAutoInit()">↻ Reintentar</button>'
      +'</div>';
  }
  // Estado inicial
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:var(--surf2);border:1px solid var(--rim2);border-radius:9px">'
    +'<div style="font-size:12px;color:var(--ink3)">Actualización automática BCV · iniciando...</div>'
    +'<button class="btn btn-g btn-sm" onclick="bcvAutoInit()">↻ Actualizar ahora</button>'
    +'</div>';
}
window._bcvBadgeHTML = _bcvBadgeHTML;

// ── Forzar actualización manual (botón en config) ──
function bcvForzarActualizacion(){
  _bcvAutoEstado = 'cargando';
  _binanceEstado = 'cargando';
  _eurEstado = 'cargando';
  _bcvActualizarUI();
  toast('Consultando tasas BCV, Euro y Binance...', 'info');
  _bcvFetchTasa(0);
  if(db){
    db.collection('config').doc('tasa').get().then(function(doc){
      var d = doc.exists ? doc.data() : null;
      if(_binanceEsFresca(d) && parseFloat(d.tasaBinance) > 1){
        window._tasaBinance = parseFloat(d.tasaBinance);
        _binanceTasa = window._tasaBinance;
        _binanceEstado = 'ok';
        _bcvActualizarUI();
      } else {
        _binanceFetchTasa(0);
      }
    }).catch(function(){ _binanceFetchTasa(0); });
  } else {
    _binanceFetchTasa(0);
  }
  _eurFetchTasa(0);
}
window.bcvForzarActualizacion = bcvForzarActualizacion;
