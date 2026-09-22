// Pagasi logic: gps — control de dispositivos de rastreo y sus lineas SIM.
// Reemplaza el Excel "PAGASI Control GPS_MASTER". Cada fila del Excel es un
// equipo: una SIM Movistar + un GPS + (cuando se instala) un credito.
//
// El mapa y el corte de motor quedan preparados pero inertes hasta que se
// conecte la API de MiCODUS: sin ella no hay posiciones que pintar ni canal
// por donde mandar el comando.

// ══════════════════════════════════════════════════════════════════
// DATOS
// ══════════════════════════════════════════════════════════════════

var GPS_ESTADOS = [
  {v:'stock',     l:'En stock',   c:'#64748B', d:'Equipo recibido, sin instalar'},
  {v:'instalado', l:'Instalado',  c:'#00B876', d:'Montado en una moto y asociado a un credito'},
  {v:'retirado',  l:'Retirado',   c:'#F59E0B', d:'Desmontado — credito cancelado o moto recuperada'},
  {v:'falla',     l:'Con falla',  c:'#F04B6A', d:'Equipo o linea con problema'}
];

function _gpsEstadoDef(v){
  var e = GPS_ESTADOS.find(function(x){ return x.v === String(v||'stock'); });
  return e || GPS_ESTADOS[0];
}

// Ids unicos aun creando 500 de golpe. Con Date.now()+aleatorio, importar el
// lote entero producia colisiones y unos equipos pisaban a otros al guardar.
var _gpsSeq = 0;
function _gpsNuevoId(){
  _gpsSeq++;
  return 'GPS-' + Date.now() + '-' + _gpsSeq.toString(36) + '-' +
         Math.floor(Math.random()*1296).toString(36);
}

function _gpsLista(){
  return (S.gps || []).filter(function(g){ return g && !g.eliminado; });
}

function _gpsById(id){
  if(!id) return null;
  return _gpsLista().find(function(g){ return g.id === id; }) || null;
}

// El equipo guarda solo el creditoId. Cliente, moto, placa y mora se leen del
// credito, para que no queden dos verdades como pasaba en el Excel.
function _gpsCredInfo(creditoId){
  if(!creditoId) return null;
  var c = (S.creds||[]).find(function(x){ return x && !x.eliminado && x.id === creditoId; });
  if(!c) return null;
  var dias = parseInt(c.mora, 10) || 0;
  return {
    cred: c,
    cliente: c.cli || '',
    modelo: c.modelo || c.marca || '',
    placa: c.placa || '',
    concesionarioId: c.concesionarioId || '',
    estado: String(c.estado || ''),
    diasMora: dias,
    enMora: dias > 0 || String(c.estado||'') === 'mora',
    vivo: ['cancelado','recuperado','recuperada'].indexOf(String(c.estado||'')) === -1
  };
}

// Creditos vigentes que deberian tener un equipo montado.
function _gpsCredsVivos(){
  return (S.creds||[]).filter(function(c){
    if(!c || c.eliminado) return false;
    var e = String(c.estado||'');
    return e !== 'cancelado' && e !== 'recuperado' && e !== 'recuperada'
        && e !== 'pendiente_revision' && e !== 'rechazado' && e !== 'rechazada';
  });
}

// Horas desde el ultimo reporte del equipo.
//
// MiCODUS manda "2026-09-01 22:42:07" en campos llamados deviceUtcDate y
// serverUtcDate: son UTC. JavaScript, sin zona explicita, los lee como hora
// LOCAL — y en Venezuela (UTC-4) eso adelanta la marca cuatro horas: una moto
// muda desde hace cuatro horas aparecia como recien reportada, y la alerta de
// +48h saltaba tarde. Por eso una marca completa sin zona se toma como UTC.
function _gpsParseFecha(f){
  var t = String(f || '').trim();
  if(!t) return null;
  var d;
  if(t.length <= 10){
    // Solo fecha (carga manual): mediodia local, para que no baile con la zona.
    d = new Date(t + 'T12:00:00');
  } else if(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(t)){
    d = new Date(t);                          // ya trae su zona
  } else {
    d = new Date(t.replace(' ', 'T') + 'Z');  // sin zona → UTC, como manda MiCODUS
  }
  return isNaN(d) ? null : d;
}

// ── Posicion ────────────────────────────────────────────────────
function _gpsTienePos(g){
  return g && typeof g.lat === 'number' && typeof g.lng === 'number'
      && Math.abs(g.lat) <= 90 && Math.abs(g.lng) <= 180
      && !(g.lat === 0 && g.lng === 0);
}

// El equipo dice de donde saco la posicion: 1 GPS, 2 antena (LBS), 3 wifi.
// Con antena el error es de cientos de metros — no sirve para senalar una casa.
function _gpsFuente(g){
  var t = parseInt(g && g.dataType, 10);
  if(t === 2) return {k:'lbs',  l:'por antena', fino:false};
  if(t === 3) return {k:'wifi', l:'por WiFi',   fino:false};
  return {k:'gps', l:'GPS', fino:true};
}

function _gpsHorasSinReportar(g){
  var d = _gpsParseFecha(g && (g.ultimaSenal || g.ultimaRevision));
  if(!d) return null;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 3600000));
}

// Color del punto en el mapa: rojo mora, ambar sin reportar hace rato, verde al dia.
function _gpsColor(g){
  var info = _gpsCredInfo(g.creditoId);
  if(info && info.enMora) return '#F04B6A';
  var h = _gpsHorasSinReportar(g);
  if(h !== null && h > 48) return '#F59E0B';
  return '#00B876';
}

// ── Revision manual: mientras no haya API, alguien entra a MiCODUS y
// confirma que el equipo responde. Estos son los mismos campos que la
// API va a llenar sola despues, asi que nada de esto se tira.
var GPS_DIAS_REVISION = 15;

function _gpsDiasSinRevisar(g){
  var f = g && (g.ultimaRevision || g.fechaInstalacion);
  if(!f) return null;
  var d = _gpsParseFecha(String(f).slice(0,10));
  if(!d) return null;
  // Dias de CALENDARIO, no horas. Restando marcas de tiempo, a las 00:30 una
  // revision de hace 20 dias daba 19: faltaban 12 horas para completar el
  // vigesimo. "Hace 20 dias" no puede depender de la hora en que se mire.
  var hoy = new Date();
  var a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  var b = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.max(0, Math.round((b - a) / 86400000));
}

// Equipos instalados que llevan demasiado sin que nadie confirme que responden.
function _gpsSinRevisar(){
  return _gpsLista().filter(function(g){
    if(String(g.estado||'') !== 'instalado') return false;
    var d = _gpsDiasSinRevisar(g);
    return d === null || d > GPS_DIAS_REVISION;
  });
}

// Un equipo caido en un credito con mora es la peor combinacion: hay saldo
// vencido y la moto dejo de reportar.
function _gpsCaidosEnMora(){
  return _gpsLista().filter(function(g){
    if(String(g.estado||'') !== 'instalado') return false;
    var est = String(g.estadoMicodus||'').toUpperCase();
    var caido = est.indexOf('OFF') > -1 || est.indexOf('SIN SE') > -1 || est.indexOf('DESCON') > -1;
    if(!caido) return false;
    var info = _gpsCredInfo(g.creditoId);
    return info && info.enMora;
  });
}

// ══════════════════════════════════════════════════════════════════
// COBERTURA — que creditos vivos NO tienen equipo
// ══════════════════════════════════════════════════════════════════

function _gpsCobertura(){
  var vivos = _gpsCredsVivos();
  var conEquipo = {};
  _gpsLista().forEach(function(g){
    if(g.creditoId && String(g.estado||'') === 'instalado') conEquipo[g.creditoId] = g;
  });
  var sin = vivos.filter(function(c){ return !conEquipo[c.id]; });
  var sinYMora = sin.filter(function(c){
    return (parseInt(c.mora,10)||0) > 0 || String(c.estado||'') === 'mora';
  });
  return {
    vivos: vivos.length,
    cubiertos: vivos.length - sin.length,
    sin: sin,
    sinYMora: sinYMora,
    pct: vivos.length ? Math.round(((vivos.length - sin.length) / vivos.length) * 100) : 0
  };
}

// Equipos instalados en creditos que ya no estan vivos: hay que ir a buscarlos.
function _gpsPorRecuperar(){
  return _gpsLista().filter(function(g){
    if(String(g.estado||'') !== 'instalado' || !g.creditoId) return false;
    var info = _gpsCredInfo(g.creditoId);
    return info && !info.vivo;
  });
}

// ══════════════════════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════════════════════

function _gpsTab(){ return window._gpsTabActual || 'mapa'; }
function _gpsSetTab(t){
  window._gpsTabActual = t;
  // Se limpia el buscador al cambiar de pestaña: un filtro viejo que no
  // coincide con nada deja la tabla vacia y parece que la pestaña no responde.
  window._gpsFiltroActual = {q:'', estado:''};
  nav('gps');
}

function _gpsRender(){
  var lista = _gpsLista();
  var cob = _gpsCobertura();
  var porRec = _gpsPorRecuperar();
  var instalados = lista.filter(function(g){ return String(g.estado||'') === 'instalado'; });
  var stock = lista.filter(function(g){ return String(g.estado||'') === 'stock'; });
  var fallas = lista.filter(function(g){ return String(g.estado||'') === 'falla'; });
  var sinRev = _gpsSinRevisar();
  var caidos = _gpsCaidosEnMora();

  var html = '<div class="page">'
    + (typeof pageBanner === 'function'
        ? pageBanner('Rastreo · Equipos y lineas SIM', 'GPS',
            'Control de los dispositivos de rastreo: inventario de equipos y SIMs, instalaciones, y que creditos vigentes quedaron sin cubrir.',
            [{label:'+ Nuevo equipo', onclick:'_gpsOpenEdit(null)', primary:true},
             {label:'Importar del Excel', onclick:'_gpsImportarAbrir()'}])
        : '<div style="margin-bottom:14px"><h1 style="font-size:22px;margin:0">GPS</h1></div>');

  // ── KPIs ──
  html += '<div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px">'
    + '<div class="stat"><div class="st-v" style="font-size:22px">' + instalados.length + '</div>'
    + '<div class="st-l">Instalados</div></div>'
    + '<div class="stat"><div class="st-v" style="font-size:22px">' + stock.length + '</div>'
    + '<div class="st-l">En stock</div></div>'
    + '<div class="stat"><div class="st-v" style="font-size:22px;color:' + (cob.pct >= 90 ? 'var(--green)' : cob.pct >= 50 ? 'var(--amber)' : 'var(--red)') + '">' + cob.pct + '%</div>'
    + '<div class="st-l">Cobertura</div>'
    + '<div style="font-size:10px;color:var(--ink3);margin-top:3px">' + cob.cubiertos + ' de ' + cob.vivos + ' creditos</div></div>'
    + '<div class="stat"><div class="st-v" style="font-size:22px;color:' + (cob.sinYMora.length ? 'var(--red)' : 'var(--ink)') + '">' + cob.sinYMora.length + '</div>'
    + '<div class="st-l">En mora sin GPS</div></div>'
    + '<div class="stat"><div class="st-v" style="font-size:22px;color:' + (sinRev.length ? 'var(--amber)' : 'var(--ink)') + '">' + sinRev.length + '</div>'
    + '<div class="st-l">Sin revisar</div>'
    + '<div style="font-size:10px;color:var(--ink3);margin-top:3px">+' + GPS_DIAS_REVISION + ' dias</div></div>'
    + '<div class="stat"><div class="st-v" style="font-size:22px;color:' + (fallas.length ? 'var(--amber)' : 'var(--ink)') + '">' + fallas.length + '</div>'
    + '<div class="st-l">Con falla</div></div>'
    + '</div>';

  // ── Lo mas urgente primero: equipo caido justo donde hay mora ──
  if(caidos.length){
    html += '<div style="background:rgba(240,75,106,0.1);border:1px solid rgba(240,75,106,0.35);border-radius:10px;padding:13px 16px;margin-bottom:14px">'
      + '<div style="font-weight:800;color:var(--red);font-size:13px;margin-bottom:5px">'
      + caidos.length + ' equipo' + (caidos.length===1?'':'s') + ' sin señal en creditos con mora</div>'
      + '<div style="font-size:11.5px;color:var(--ink2);line-height:1.6;margin-bottom:7px">'
      + 'Hay saldo vencido y la moto dejo de reportar. Puede ser bateria, la SIM sin saldo, o que le quitaron el equipo.</div>';
    caidos.forEach(function(g){
      var i = _gpsCredInfo(g.creditoId);
      html += '<div style="font-size:11.5px;padding:2px 0"><b>' + _gpsE(g.idGps||g.id) + '</b> · ' + g.creditoId
        + ' · ' + (i ? i.cliente + ' · ' + i.diasMora + ' dias de mora' : '') + '</div>';
    });
    html += '</div>';
  }

  // Equipos montados en creditos que ya se cerraron: son reutilizables y
  // hoy se pierden de vista. Vivia en la pestaña Cobertura, que se quito.
  if(porRec.length){
    html += '<div style="background:rgba(255,165,0,0.08);border:1px solid rgba(255,165,0,0.3);border-radius:10px;padding:12px 15px;margin-bottom:12px">'
      + '<div style="font-weight:800;color:var(--amber);font-size:12.5px;margin-bottom:5px">'
      + porRec.length + ' equipo' + (porRec.length===1?'':'s') + ' por recuperar</div>'
      + '<div style="font-size:11.5px;color:var(--ink2);line-height:1.55">'
      + 'Siguen instalados en creditos que ya se cerraron. Se pueden desmontar y reutilizar: ';
    html += porRec.slice(0,8).map(function(g){
      var i = _gpsCredInfo(g.creditoId);
      return '<b>' + _gpsE(g.idGps||g.id) + '</b> (' + g.creditoId + (i ? ' · ' + i.estado : '') + ')';
    }).join(' · ');
    if(porRec.length > 8) html += ' y ' + (porRec.length-8) + ' mas';
    html += '</div></div>';
  }

  if(sinRev.length){
    html += '<div style="background:rgba(255,165,0,0.06);border:1px solid rgba(255,165,0,0.22);border-radius:10px;padding:11px 15px;margin-bottom:12px;font-size:11.5px;color:var(--ink2);line-height:1.55">'
      + '<b style="color:var(--amber)">' + sinRev.length + ' equipo' + (sinRev.length===1?'':'s')
      + ' sin revisar en mas de ' + GPS_DIAS_REVISION + ' dias.</b> '
      + 'Un GPS que dejo de reportar no avisa solo.</div>';
  }

  // ── Estado de la sincronizacion + boton de actualizar ──
  setTimeout(_gpsCargarCfg, 40);
  html += '<div id="gps-sync" style="background:var(--surf2);border:1px solid var(--rim);border-radius:10px;'
    + 'padding:9px 14px;margin-bottom:12px">' + _gpsHtmlSync() + '</div>';

  // ── Aviso: solo mientras no haya ningun equipo reportando ──
  if(!lista.some(_gpsTienePos)){
    html += '<div style="background:rgba(29,78,216,0.07);border:1px solid rgba(29,78,216,0.25);border-radius:10px;padding:11px 14px;margin-bottom:16px;font-size:11.5px;color:var(--ink2);line-height:1.6">'
      + '<strong style="color:var(--p1)">Todavia sin posiciones.</strong> '
      + 'El bot consulta MiCODUS una vez al dia y cuando alguien le da a Actualizar. '
      + 'Si nunca ha traido nada, revisa que el ID GPS de cada equipo sea igual al serial que muestra MiCODUS.'
      + '</div>';
  }

  // ── Pestañas ──
  var conPos = lista.filter(_gpsTienePos).length;
  var tabs = [
    {k:'mapa',      l:'Mapa',      n:conPos},
    {k:'equipos',   l:'Equipos',   n:lista.length},
    {k:'sims',      l:'Lineas SIM', n:lista.filter(function(g){return !!g.iccid;}).length}
  ];
  var act = _gpsTab();
  html += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;border-bottom:1px solid var(--rim);padding-bottom:0">';
  tabs.forEach(function(t){
    var on = act === t.k;
    html += '<button class="btn btn-sm" onclick="_gpsSetTab(\'' + t.k + '\')" '
      + 'style="border-radius:8px 8px 0 0;border-bottom:2px solid ' + (on ? 'var(--p1)' : 'transparent') + ';'
      + 'background:' + (on ? 'var(--surf2)' : 'transparent') + ';font-weight:' + (on ? '800' : '600') + ';'
      + 'color:' + (on ? 'var(--p1)' : 'var(--ink2)') + '">'
      + t.l + (t.n ? ' <span style="opacity:.6;font-size:10px">' + t.n + '</span>' : '') + '</button>';
  });
  html += '</div>';

  if(act === 'sims')           html += _gpsHtmlSims(lista);
  else if(act === 'mapa')      html += _gpsHtmlMapa(instalados);
  else                         html += _gpsHtmlEquipos(lista);

  html += '</div>';
  return html;
}

// ── Pestaña: equipos ─────────────────────────────────────────────
function _gpsFiltro(){
  return window._gpsFiltroActual || {q:'', estado:''};
}
function _gpsSetFiltro(campo, valor){
  var f = _gpsFiltro();
  f[campo] = valor;
  window._gpsFiltroActual = f;
  _gpsRepintarTabla();
}
// Repinta solo la tabla: con 500 filas, redibujar la pagina entera en cada
// tecla hace que el buscador se sienta trabado.
function _gpsRepintarTabla(){
  var cont = document.getElementById('gps-tabla');
  if(!cont){ nav('gps'); return; }
  cont.innerHTML = _gpsFilasEquipos();
}

// Todo lo que entra por el Excel pegado o por MiCODUS es texto AJENO: una celda con un
// < rompe la tabla y una con <img onerror=...> corre codigo en la sesion del admin. Se
// pinta escapado, como ya se hacia con el mensaje de error del robot (punto 32, 22-sep-2026).
function _gpsE(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function _gpsCoincide(g, q){
  if(!q) return true;
  var info = _gpsCredInfo(g.creditoId);
  var heno = [g.idGps, g.imei, g.linea, g.iccid, g.creditoId,
              info && info.cliente, info && info.modelo, info && info.placa,
              g.tecnico, g.observaciones].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every(function(t){ return heno.indexOf(t) > -1; });
}

function _gpsHtmlEquipos(lista){
  if(!lista.length){
    return '<div class="empty" style="padding:60px 20px;text-align:center">'
      + '<div style="font-size:40px;margin-bottom:12px;opacity:.35">📡</div>'
      + '<div style="font-size:16px;font-weight:800;margin-bottom:6px">Todavia no hay equipos cargados</div>'
      + '<div style="font-size:12.5px;color:var(--ink3);max-width:400px;margin:0 auto 16px;line-height:1.6">'
      + 'Puedes cargarlos uno por uno, o pegar de una vez las filas del Excel con el boton de importar.</div>'
      + '<button class="btn btn-p btn-sm" onclick="_gpsImportarAbrir()">Importar del Excel</button></div>';
  }
  var f = _gpsFiltro();
  var h = '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">'
    + '<input class="fi" id="gps-buscar" value="' + String(f.q||'').replace(/"/g,'&quot;') + '" '
    + 'placeholder="Buscar por serial, IMEI, linea, cliente, credito o placa..." '
    + 'oninput="_gpsSetFiltro(\'q\', this.value)" '
    + 'style="flex:1;min-width:260px">'
    + '<select class="fs" onchange="_gpsSetFiltro(\'estado\', this.value)" style="width:auto;min-width:150px">'
    + '<option value="">Todos los estados</option>'
    + GPS_ESTADOS.map(function(e){
        return '<option value="' + e.v + '"' + (f.estado===e.v?' selected':'') + '>' + e.l + '</option>';
      }).join('')
    + '</select></div>'
    + '<div id="gps-tabla">' + _gpsFilasEquipos() + '</div>';
  return h;
}

var GPS_POR_PAGINA = 60;

function _gpsFilasEquipos(){
  var f = _gpsFiltro();
  var todos = _gpsLista().filter(function(g){
    if(f.estado && String(g.estado||'') !== f.estado) return false;
    return _gpsCoincide(g, f.q);
  });
  // Los instalados primero: son los que estan en la calle.
  todos.sort(function(a,b){
    var pa = String(a.estado||'')==='instalado' ? 0 : 1;
    var pb = String(b.estado||'')==='instalado' ? 0 : 1;
    if(pa !== pb) return pa - pb;
    return String(a.idGps||'').localeCompare(String(b.idGps||''));
  });

  if(!todos.length){
    return '<div style="padding:40px 20px;text-align:center;color:var(--ink3);font-size:13px">'
      + 'Ningun equipo coincide con la busqueda.</div>';
  }
  var ver = todos.slice(0, GPS_POR_PAGINA);

  var h = '<div style="overflow-x:auto"><table class="tbl"><thead><tr>'
    + '<th>Estado</th><th>ID GPS</th><th>IMEI</th><th>Linea Movistar</th>'
    + '<th>Credito</th><th>Cliente</th><th>Moto</th><th>Revisado</th><th></th>'
    + '</tr></thead><tbody>';

  ver.forEach(function(g){
    var def = _gpsEstadoDef(g.estado);
    var info = _gpsCredInfo(g.creditoId);
    var alerta = info && !info.vivo && String(g.estado||'')==='instalado';
    var esStock = String(g.estado||'') !== 'instalado';
    h += '<tr' + (alerta ? ' style="background:rgba(240,75,106,0.05)"' : '') + '>'
      + '<td><span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;'
      + 'color:' + def.c + ';background:' + def.c + '1a;border:1px solid ' + def.c + '40">' + def.l + '</span></td>'
      + '<td style="font-family:ui-monospace,monospace;font-size:11.5px">' + _gpsE(g.idGps || '—') + '</td>'
      + '<td style="font-family:ui-monospace,monospace;font-size:11px;color:var(--ink3)">' + _gpsE(g.imei || '—') + '</td>'
      + '<td style="font-family:ui-monospace,monospace;font-size:11.5px">' + _gpsE(g.linea || '—') + '</td>'
      + '<td>' + (g.creditoId ? '<b>' + g.creditoId + '</b>' : '<span style="color:var(--ink3)">—</span>') + '</td>'
      + '<td>' + (info ? info.cliente : '<span style="color:var(--ink3)">—</span>')
      + (info && info.enMora ? ' <span style="color:var(--red);font-size:10px;font-weight:800">' + info.diasMora + 'd mora</span>' : '') + '</td>'
      + '<td style="font-size:11.5px">' + (info ? (info.modelo + (info.placa ? ' · ' + info.placa : '')) : '—') + '</td>'
      + '<td style="font-size:11.5px">' + _gpsHtmlRevision(g) + '</td>'
      + '<td style="white-space:nowrap">'
      + (esStock
          ? '<button class="btn btn-p btn-xs" onclick="_gpsAsignar(\'' + g.id + '\')">Asignar</button> '
          : '<button class="btn btn-g btn-xs" onclick="_gpsRevisar(\'' + g.id + '\')">Revisar</button> ')
      + '<button class="btn btn-g btn-xs" onclick="_gpsOpenEdit(\'' + g.id + '\')">Ver</button></td>'
      + '</tr>';
    if(alerta){
      h += '<tr><td colspan="9" style="padding:4px 10px 8px;font-size:11px;color:var(--red)">'
        + '⚠ El credito ' + g.creditoId + ' ya no esta vigente (' + info.estado + ') pero el equipo sigue instalado. Hay que recuperarlo.'
        + '</td></tr>';
    }
  });
  h += '</tbody></table></div>';

  if(todos.length > ver.length){
    h += '<div style="padding:12px 4px;font-size:12px;color:var(--ink3);text-align:center">'
      + 'Mostrando ' + ver.length + ' de <b>' + todos.length + '</b>. '
      + 'Usa el buscador para llegar al que necesitas.</div>';
  } else {
    h += '<div style="padding:10px 4px;font-size:11.5px;color:var(--ink3)">' + todos.length + ' equipos</div>';
  }
  return h;
}

// Buscador del selector de credito. Un <select> con 470 opciones es
// inusable: no se puede escribir para filtrar y hay que bajar a rueda.
function _gpsBuscarCred(q){
  var cont = document.getElementById('gpsa_lista');
  if(!cont) return;
  var libres = window._gpsCredsLibres || [];
  var t = String(q||'').trim().toLowerCase();

  var hits = !t ? libres : libres.filter(function(c){
    var heno = [c.id, c.cli, c.ci, c.cedula, c.modelo, c.marca, c.placa, c.tel]
      .join(' ').toLowerCase();
    return t.split(/\s+/).every(function(w){ return heno.indexOf(w) > -1; });
  });

  if(!hits.length){
    cont.innerHTML = '<div style="padding:18px 14px;text-align:center;color:var(--ink3);font-size:12px">'
      + 'Ningun credito coincide con "' + String(q).replace(/</g,'&lt;') + '"</div>';
    return;
  }

  var elegido = (document.getElementById('gpsa_cred')||{}).value || '';
  cont.innerHTML = hits.slice(0, 40).map(function(c){
    var d = parseInt(c.mora,10)||0;
    var on = c.id === elegido;
    return '<div onclick="_gpsElegirCred(\'' + c.id + '\')" '
      + 'style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--rim);'
      + (on ? 'background:var(--p1);color:#fff' : '') + '" '
      + (on ? '' : 'onmouseover="this.style.background=\'var(--surf2)\'" onmouseout="this.style.background=\'\'"')
      + '>'
      + '<div style="font-weight:700;font-size:12.5px">' + (c.cli||'(sin nombre)') + '</div>'
      + '<div style="font-size:11px;' + (on ? 'opacity:.85' : 'color:var(--ink3)') + '">'
      + c.id + (c.fecha ? ' · ' + c.fecha : '')
      + ((c.modelo||c.marca) ? ' · ' + (c.modelo||c.marca) : '')
      + (c.placa ? ' · ' + c.placa : '')
      + (d ? '  ·  ' + d + ' d de mora' : '')
      + '</div></div>';
  }).join('')
  + (hits.length > 40
      ? '<div style="padding:8px 12px;font-size:11px;color:var(--ink3);text-align:center">'
        + 'y ' + (hits.length-40) + ' mas — sigue escribiendo</div>'
      : '');
}

function _gpsElegirCred(id){
  var h = document.getElementById('gpsa_cred');
  if(h) h.value = id;
  var c = (window._gpsCredsLibres||[]).find(function(x){ return x.id === id; });
  var b = document.getElementById('gpsa_buscar');
  if(b && c) b.value = (c.cli||'') + '  ·  ' + c.id;
  _gpsBuscarCred('');
}

// CRED-467 → 467, para desempatar dos creditos del mismo dia.
function _gpsNumCred(id){
  var m = String(id||'').match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

// Cuanto lleva sin que nadie confirme que el equipo responde.
function _gpsHtmlRevision(g){
  if(String(g.estado||'') !== 'instalado'){
    return '<span style="color:var(--ink3)">—</span>';
  }
  var d = _gpsDiasSinRevisar(g);
  if(d === null) return '<span style="color:var(--amber);font-weight:800">nunca</span>';
  var col = d > GPS_DIAS_REVISION ? 'var(--amber)' : 'var(--ink3)';
  var txt = d === 0 ? 'hoy' : 'hace ' + d + ' d';
  return '<span style="color:' + col + (d > GPS_DIAS_REVISION ? ';font-weight:800' : '') + '">' + txt + '</span>'
    + (g.estadoMicodus ? '<br><span style="font-size:10px;color:var(--ink3)">' + _gpsE(g.estadoMicodus) + '</span>' : '');
}

// Un clic: quien reviso, cuando, y como respondio el equipo. Es lo mismo que
// hoy se anota en las columnas ESTADO MiCODUS y VERIFICADO POR del Excel.
function _gpsRevisar(id){
  var g = _gpsById(id);
  if(!g) return;
  setMicon('check');
  $('mtt').textContent = 'Revisar equipo';
  $('msb').textContent = _gpsE(g.idGps || g.id) + (g.creditoId ? ' · ' + g.creditoId : '');
  $('modal-box').className = 'modal';
  var info = _gpsCredInfo(g.creditoId);
  $('mbd').innerHTML = ''
    + (info ? '<div style="font-size:12.5px;color:var(--ink2);margin-bottom:12px">'
        + '<b>' + info.cliente + '</b> · ' + info.modelo + (info.placa ? ' · ' + info.placa : '')
        + (info.enMora ? ' · <span style="color:var(--red);font-weight:800">' + info.diasMora + ' dias de mora</span>' : '')
        + '</div>' : '')
    + '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>¿Como respondio en MiCODUS?</label><select class="fs" id="gpsr_estado">'
    + '<option value="ONLINE / OK">ONLINE — responde bien</option>'
    + '<option value="OFFLINE">OFFLINE — no reporta</option>'
    + '<option value="SIN SEÑAL RECIENTE">Sin señal reciente</option>'
    + '<option value="BATERIA BAJA">Bateria baja</option>'
    + '<option value="FALLA">Con falla</option>'
    + '</select></div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Latitud</label><input class="fi" id="gpsr_lat" value="' + (typeof g.lat==='number'?g.lat:'') + '" placeholder="10.4806"></div>'
    + '<div class="fg"><label>Longitud</label><input class="fi" id="gpsr_lng" value="' + (typeof g.lng==='number'?g.lng:'') + '" placeholder="-66.9036"></div>'
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:-4px">Opcional. Copialas de MiCODUS y la moto aparece en el mapa. Cuando la API este conectada esto se llena solo.</div>'
    + '<div class="fg"><label>Nota</label><input class="fi" id="gpsr_nota" placeholder="Opcional"></div>'
    + '</div>';
  S.saveFn = function(){
    var est = ($('gpsr_estado')||{}).value || '';
    var lat = parseFloat(($('gpsr_lat')||{}).value);
    var lng = parseFloat(($('gpsr_lng')||{}).value);
    var o = Object.assign({}, g);
    o.estadoMicodus = est;
    o.ultimaRevision = (typeof hoyLocalISO === 'function') ? hoyLocalISO() : new Date().toISOString().slice(0,10);
    o.verificadoPor = (S.currentUser && S.currentUser.nombre) || 'Admin';
    // Solo se guardan coordenadas si las dos son numeros validos y estan en rango.
    if(!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180){
      o.lat = lat; o.lng = lng; o.ultimaSenal = o.ultimaRevision;
    }
    var nota = (($('gpsr_nota')||{}).value || '').trim();
    if(nota) o.observaciones = nota;
    if(est.indexOf('FALLA') > -1) o.estado = 'falla';
    var i = S.gps.findIndex(function(x){ return x.id === g.id; });
    if(i >= 0) S.gps[i] = o;
    if(DB && DB.saveGps) DB.saveGps(o);
    if(typeof logActividad === 'function') logActividad('gps_revisar','gps',g.id,{estado:est});
    closeM();
    toast('Equipo revisado', 'success');
    nav('gps');
    return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="saveM()">Guardar revision</button>';
  $('ov').style.display = 'flex';
}

// ── Asignar un equipo a un credito, sin salir de la tabla ────────
function _gpsAsignar(id){
  var g = _gpsById(id);
  if(!g) return;

  // Solo creditos vivos que todavia no tengan equipo montado.
  var tomados = {};
  _gpsLista().forEach(function(x){
    if(x.creditoId && String(x.estado||'')==='instalado' && x.id !== id) tomados[x.creditoId] = 1;
  });
  var libres = _gpsCredsVivos().filter(function(c){ return !tomados[c.id]; });
  // Los creditos mas nuevos primero. El GPS se monta en la venta del dia; a las
  // motos ya entregadas no se les esta retrofiteando, asi que ordenar por mora
  // solo dejaba arriba creditos viejos que nadie va a tocar.
  libres.sort(function(a,b){
    var fa = String(a.fecha||''), fb = String(b.fecha||'');
    if(fa !== fb) return fb.localeCompare(fa);
    return (_gpsNumCred(b.id) - _gpsNumCred(a.id));
  });

  setMicon('moto');
  $('mtt').textContent = 'Asignar equipo';
  $('msb').textContent = g.idGps || g.id;
  $('modal-box').className = 'modal';

  var esc = function(v){ return String(v==null?'':v).replace(/"/g,'&quot;'); };
  window._gpsCredsLibres = libres;
  var hoy = (typeof hoyLocalISO === 'function') ? hoyLocalISO() : new Date().toISOString().slice(0,10);
  $('mbd').innerHTML = ''
    + '<div style="font-size:12.5px;color:var(--ink2);line-height:1.6;margin-bottom:12px">'
    + 'Equipo <b style="font-family:ui-monospace,monospace">' + _gpsE(g.idGps||g.id) + '</b>'
    + (g.linea ? ' · linea ' + _gpsE(g.linea) : '')

    + '</div>'
    + '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Cliente o credito <span style="color:var(--red)">*</span></label>'
    + '<input class="fi" id="gpsa_buscar" placeholder="Escribe el nombre, la cedula, el N° de credito o la placa..." '
    + 'oninput="_gpsBuscarCred(this.value)" autocomplete="off">'
    + '<input type="hidden" id="gpsa_cred" value="">'
    + '<div id="gpsa_lista" style="max-height:230px;overflow-y:auto;border:1px solid var(--rim);'
    + 'border-radius:8px;margin-top:6px;background:var(--surf)"></div>'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:5px">'
    + libres.length + ' creditos vigentes sin equipo, <b>los mas nuevos primero</b>. '
    + 'El cliente, la moto y la placa salen del credito.</div></div>'
    + '<div style="font-size:11px;font-weight:800;color:var(--p1);letter-spacing:.06em;text-transform:uppercase;margin-top:6px">SIM Movistar</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>N° de linea</label><input class="fi" id="gpsa_linea" value="' + esc(g.linea) + '" placeholder="Ej: 143557051"></div>'
    + '<div class="fg"><label>ICCID</label><input class="fi" id="gpsa_iccid" value="' + esc(g.iccid) + '" placeholder="Ej: 895804420015136641"></div>'
    + '</div>'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:-4px">'
    + (g.linea ? 'Este equipo ya trae su SIM cargada. Cambiala solo si la reemplazaron.'
               : 'La SIM que le pusiste a este equipo. Si todavia no tiene, dejalo en blanco.')
    + '</div>'
    + '<div style="font-size:11px;font-weight:800;color:var(--p1);letter-spacing:.06em;text-transform:uppercase;margin-top:6px">Instalacion</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Dia</label><input type="date" class="fi" id="gpsa_fecha" value="' + hoy + '"></div>'
    + '<div class="fg"><label>Tecnico</label><input class="fi" id="gpsa_tecnico" value="' + esc(g.tecnico) + '" placeholder="Quien la instalo"></div>'
    + '</div>'
    + '</div>';

  setTimeout(function(){ _gpsBuscarCred(''); }, 30);

  S.saveFn = function(){
    var cred = (($('gpsa_cred')||{}).value || '').trim();
    if(!cred){ toast('Elige el credito', 'error'); return false; }
    // Por si alguien asigno el mismo credito en otra pestaña mientras tanto.
    var choque = _gpsLista().find(function(x){
      return x.id !== id && x.creditoId === cred && String(x.estado||'')==='instalado';
    });
    if(choque){
      toast('El credito ' + cred + ' ya tiene el equipo ' + (choque.idGps||choque.id), 'error');
      return false;
    }
    var linea = (($('gpsa_linea')||{}).value || '').trim();
    var iccid = (($('gpsa_iccid')||{}).value || '').trim();
    // Una linea no puede estar en dos equipos: se cargo mal en alguno.
    if(linea){
      var repe = _gpsLista().find(function(x){ return x.id !== id && x.linea === linea; });
      if(repe){
        toast('La linea ' + linea + ' ya esta en el equipo ' + (repe.idGps||repe.id), 'error');
        return false;
      }
    }
    var o = Object.assign({}, g, {
      estado: 'instalado',
      creditoId: cred,
      linea: linea,
      iccid: iccid,
      fechaInstalacion: (($('gpsa_fecha')||{}).value || hoy),
      tecnico: (($('gpsa_tecnico')||{}).value || '').trim(),
      actualizado: new Date().toISOString()
    });
    var i = S.gps.findIndex(function(x){ return x.id === id; });
    if(i >= 0) S.gps[i] = o;
    if(DB && DB.saveGps) DB.saveGps(o);
    if(typeof logActividad === 'function') logActividad('gps_asignar','gps',id,{credito:cred});
    closeM();
    var info = _gpsCredInfo(cred);
    toast('Equipo asignado a ' + (info ? info.cliente : cred), 'success');
    nav('gps');
    return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="saveM()">Asignar</button>';
  $('ov').style.display = 'flex';
}

// ── Pestaña: lineas SIM ──────────────────────────────────────────
function _gpsHtmlSims(lista){
  var conSim = lista.filter(function(g){ return !!(g.iccid || g.linea); });
  if(!conSim.length){
    return '<div class="empty" style="padding:50px 20px;text-align:center;color:var(--ink3)">'
      + 'Todavia no hay lineas cargadas.</div>';
  }
  // Duplicados: una misma linea o ICCID en dos equipos es un error de carga.
  var porLinea = {}, porIccid = {};
  conSim.forEach(function(g){
    if(g.linea){ (porLinea[g.linea] = porLinea[g.linea] || []).push(g); }
    if(g.iccid){ (porIccid[g.iccid] = porIccid[g.iccid] || []).push(g); }
  });
  var dups = [];
  Object.keys(porLinea).forEach(function(k){ if(porLinea[k].length > 1) dups.push({tipo:'linea', v:k, n:porLinea[k].length}); });
  Object.keys(porIccid).forEach(function(k){ if(porIccid[k].length > 1) dups.push({tipo:'ICCID', v:k, n:porIccid[k].length}); });

  var h = '';
  if(dups.length){
    h += '<div style="background:rgba(240,75,106,0.08);border:1px solid rgba(240,75,106,0.3);border-radius:10px;padding:12px 15px;margin-bottom:14px">'
      + '<div style="font-weight:800;color:var(--red);font-size:12.5px;margin-bottom:5px">Repetidos</div>';
    dups.forEach(function(d){
      h += '<div style="font-size:11.5px;color:var(--ink2)">El ' + d.tipo + ' <b style="font-family:ui-monospace,monospace">' + d.v + '</b> aparece en ' + d.n + ' equipos.</div>';
    });
    h += '</div>';
  }
  h += '<div style="overflow-x:auto"><table class="tbl"><thead><tr>'
    + '<th>Linea Movistar</th><th>ICCID</th><th>Equipo</th><th>Estado</th><th>Asignada a</th><th></th>'
    + '</tr></thead><tbody>';
  conSim.slice().sort(function(a,b){ return String(a.linea||'').localeCompare(String(b.linea||'')); })
    .forEach(function(g){
      var def = _gpsEstadoDef(g.estado);
      var info = _gpsCredInfo(g.creditoId);
      h += '<tr>'
        + '<td style="font-family:ui-monospace,monospace;font-size:11.5px">' + _gpsE(g.linea || '—') + '</td>'
        + '<td style="font-family:ui-monospace,monospace;font-size:11px;color:var(--ink3)">' + _gpsE(g.iccid || '—') + '</td>'
        + '<td style="font-family:ui-monospace,monospace;font-size:11.5px">' + _gpsE(g.idGps || '—') + '</td>'
        + '<td><span style="color:' + def.c + ';font-weight:800;font-size:11px">' + def.l + '</span></td>'
        + '<td style="font-size:11.5px">' + (info ? info.cliente + ' · ' + g.creditoId : '<span style="color:var(--ink3)">libre</span>') + '</td>'
        + '<td style="white-space:nowrap">'
        + (String(g.estado||'') !== 'instalado'
            ? '<button class="btn btn-p btn-xs" onclick="_gpsAsignar(\'' + g.id + '\')">Asignar a cliente</button>'
            : '<button class="btn btn-g btn-xs" onclick="_gpsOpenEdit(\'' + g.id + '\')">Ver</button>')
        + '</td>'
        + '</tr>';
    });
  h += '</tbody></table></div>';
  return h;
}

// ── Sincronizacion con MiCODUS ───────────────────────────────────
// El navegador no puede llamar a MiCODUS (CORS) ni disparar el bot (haria
// falta un token de GitHub en el JS, que es publico). Asi que el boton solo
// deja una señal en Firebase y el Worker despierta al robot al momento; sin
// Worker, la atiende el barrido de las 8 am (Adam, 14-sep-2026).

function _gpsCfg(){ return window._gpsConfig || {}; }

function _gpsCargarCfg(){
  if(typeof db === 'undefined' || !db) return;
  db.collection('config').doc('gps').get().then(function(d){
    window._gpsConfig = (d && d.exists) ? d.data() : {};
    var el = document.getElementById('gps-sync');
    if(el) el.innerHTML = _gpsHtmlSync();
  }).catch(function(){});
}

function _gpsHtmlSync(){
  var c = _gpsCfg();
  // "Buscando..." solo mientras el pedido es reciente: si en 15 min no llego el
  // barrido (el Worker no pudo despertar al robot), vuelve el boton para reintentar.
  var pedidoEn = _gpsParseFecha(c.refrescoPedidoEn);
  var pedido = !!c.refrescoPedido && !!pedidoEn && (Date.now() - pedidoEn.getTime()) < 15 * 60000;
  var d = _gpsParseFecha(c.ultimaSync);
  var min = d ? Math.round((Date.now() - d.getTime()) / 60000) : null;
  var cuando = min === null ? 'nunca'
    : min < 1   ? 'hace un momento'
    : min < 60  ? 'hace ' + min + ' min'
    : min < 1440? 'hace ' + Math.floor(min/60) + ' h'
    : 'hace ' + Math.floor(min/1440) + ' d';
  // Si el ultimo intento del robot fallo despues del ultimo barrido bueno, se dice
  var errEn = _gpsParseFecha(c.ultimoErrorEn);
  var conError = !!(c.ultimoError && errEn && (!d || errEn.getTime() > d.getTime()));
  var escT = function(t){ return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

  return '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
    + '<span style="font-size:11.5px;color:var(--ink3)">'
    + 'Posiciones actualizadas <b style="color:' + (min !== null && min > 1500 ? 'var(--amber)' : 'var(--ink2)') + '">'
    + cuando + '</b>'
    + (typeof c.ultimaSyncEquipos === 'number' ? ' · ' + c.ultimaSyncEquipos + ' equipos' : '')
    + '</span>'
    + (conError ? '<span style="font-size:11.5px;color:var(--red);font-weight:700">Último intento falló: ' + escT(c.ultimoError) + '</span>' : '')
    + (pedido
        ? '<span style="font-size:11.5px;color:var(--p1);font-weight:700">Buscando posiciones nuevas...</span>'
        : '<button class="btn btn-p btn-xs" onclick="_gpsPedirRefresco()">↻ Actualizar ahora</button>')
    + '</div>';
}

// URL del Worker de Cloudflare que dispara el job. Se guarda en
// config/gps.workerUrl para no tenerla escrita en el codigo: si cambia, se
// cambia ahi y listo.
function _gpsWorkerUrl(){
  var u = String(_gpsCfg().workerUrl || '').trim();
  return u ? u.replace(/\/+$/, '') + '/gps-refresco' : '';
}

function _gpsAvisoSinWorker(){
  if(typeof toast === 'function') toast('No se pudo buscar ahora. Queda pedido y el botón vuelve en 15 minutos para reintentar.', 'error');
}

function _gpsPedirRefresco(){
  if(typeof db === 'undefined' || !db){ toast('Sin conexion con la base', 'error'); return; }

  // Se dispara el job de una. GitHub retrasa los workflows programados de
  // repos publicos horas enteras, asi que esperar al cron no sirve para un
  // boton. Si no hay Worker configurado, igual queda la bandera y el proximo
  // barrido lo recoge.
  var url = _gpsWorkerUrl();
  if(url){
    fetch(url, {method:'POST'})
      .then(function(r){ return r.json(); })
      .then(function(j){ if(!j || !j.ok){ console.warn('[gps] el Worker no pudo disparar el job', j); _gpsAvisoSinWorker(); } })
      .catch(function(e){ console.warn('[gps] no se pudo avisar al Worker', e); _gpsAvisoSinWorker(); });
  }

  db.collection('config').doc('gps').set({
    refrescoPedido: true,
    refrescoPedidoPor: (S.currentUser && S.currentUser.nombre) || 'Admin',
    refrescoPedidoEn: new Date().toISOString()
  }, {merge:true}).then(function(){
    window._gpsConfig = Object.assign({}, _gpsCfg(), {refrescoPedido:true, refrescoPedidoEn:new Date().toISOString()});
    var el = document.getElementById('gps-sync');
    if(el) el.innerHTML = _gpsHtmlSync();
    toast(_gpsWorkerUrl() ? 'Buscando posiciones nuevas...'
                          : 'Pedido anotado. Sin el Worker llega en la próxima corrida automática (puede ser mañana).', 'success');
    if(typeof logActividad === 'function') logActividad('gps_refresco','gps','',{});
    // Se vuelve a mirar solo, para que el usuario vea llegar la respuesta.
    var n = 0, pedidoEn = new Date().toISOString();
    // Vuelve el boton (sin esperar los 15 min) y se repinta el estado
    var soltar = function(c){
      window._gpsConfig = Object.assign({}, c || _gpsCfg(), {refrescoPedido:false});
      var el2 = document.getElementById('gps-sync');
      if(el2) el2.innerHTML = _gpsHtmlSync();
    };
    var reloj = setInterval(function(){
      n++;
      if(S.page !== 'gps'){ clearInterval(reloj); return; }
      if(n > 40){
        // ~13 min sin respuesta: se avisa y vuelve el boton (antes se cortaba callado)
        clearInterval(reloj);
        soltar();
        toast('No llegaron posiciones nuevas todavía. Puedes volver a intentar.', 'error');
        return;
      }
      db.collection('config').doc('gps').get().then(function(d){
        var c = (d && d.exists) ? d.data() : {};
        if(c.ultimoError && c.ultimoErrorEn && String(c.ultimoErrorEn) > pedidoEn){
          clearInterval(reloj);
          soltar(c);
          toast('No se pudieron traer posiciones: ' + c.ultimoError, 'error');
          return;
        }
        if(!c.refrescoPedido){
          clearInterval(reloj);
          window._gpsConfig = c;
          toast('Posiciones actualizadas', 'success');
          nav('gps');
        }
      }).catch(function(){});
    }, 20000);
  }).catch(function(e){
    toast('No se pudo pedir el refresco: ' + (e.message||''), 'error');
  });
}

// ── Pestaña: mapa ────────────────────────────────────────────────
// Tres columnas: lista filtrable | mapa | detalle del seleccionado.
// El detalle trae lo que MiCODUS no sabe — el credito, la cuota, la mora —
// que es lo que de verdad se necesita cuando uno mira una moto en el mapa.

function _gpsSel(){ return window._gpsSeleccionado || null; }

function _gpsFiltroMapa(){ return window._gpsFiltroMapaActual || {q:'', grupo:'todos'}; }
function _gpsSetFiltroMapa(campo, valor){
  var f = _gpsFiltroMapa();
  f[campo] = valor;
  window._gpsFiltroMapaActual = f;
  _gpsRepintarPanel();
}

// Clasifica cada equipo en un solo grupo, por lo que hay que atender primero.
function _gpsGrupo(g){
  var info = _gpsCredInfo(g.creditoId);
  if(info && info.enMora) return 'mora';
  var h = _gpsHorasSinReportar(g);
  if(h !== null && h > 48) return 'mudos';
  if(typeof g.velocidad === 'number' && g.velocidad > 3) return 'moviendo';
  return 'aldia';
}

function _gpsHtmlMapa(instalados){
  var conPos = instalados.filter(_gpsTienePos);
  var sinPos = instalados.length - conPos.length;

  if(!conPos.length){
    return '<div class="empty" style="padding:56px 20px;text-align:center">'
      + '<div style="font-size:40px;margin-bottom:12px;opacity:.35">🗺️</div>'
      + '<div style="font-size:16px;font-weight:800;margin-bottom:8px">El mapa esta listo, faltan las posiciones</div>'
      + '<div style="font-size:12.5px;color:var(--ink3);max-width:470px;margin:0 auto;line-height:1.65">'
      + (instalados.length
          ? 'Hay <b>' + instalados.length + '</b> equipo' + (instalados.length===1?'':'s') + ' instalado'
            + (instalados.length===1?'':'s') + ' esperando su primera posicion.'
          : 'Todavia no hay equipos instalados. Un equipo en stock no reporta nada.')
      + '<br><br>Las coordenadas llegan de MiCODUS. Mientras se conecta, se pueden cargar a mano '
      + 'desde el boton <b>Revisar</b> de cada equipo.</div></div>';
  }

  // Si el seleccionado ya no esta, se limpia
  if(_gpsSel() && !conPos.some(function(g){ return g.id === _gpsSel(); })) window._gpsSeleccionado = null;

  setTimeout(_gpsPintarMapa, 60);
  var angosto = (typeof window !== 'undefined' && window.innerWidth && window.innerWidth < 1100);
  var alto = angosto ? 460 : 600;

  var h = '<div style="display:grid;gap:10px;align-items:start;'
    + (angosto ? 'grid-template-columns:1fr' : 'grid-template-columns:300px minmax(0,1fr) 340px') + '">';

  // ── Columna 1: buscador, filtros y lista ──
  h += '<div id="gps-panel" style="border:1px solid var(--rim);border-radius:12px;background:var(--surf);'
    + 'height:' + alto + 'px;display:flex;flex-direction:column;overflow:hidden">'
    + _gpsHtmlPanel(conPos) + '</div>';

  // ── Columna 2: mapa ──
  h += '<div id="gps-mapa" style="height:' + alto + 'px;border-radius:12px;border:1px solid var(--rim);'
    + 'overflow:hidden;background:var(--surf2)"></div>';

  // ── Columna 3: detalle ──
  h += '<div id="gps-detalle" style="border:1px solid var(--rim);border-radius:12px;background:var(--surf);'
    + 'height:' + alto + 'px;overflow-y:auto">' + _gpsHtmlDetalle(_gpsSel()) + '</div>';

  h += '</div>';
  h += '<div style="font-size:11px;color:var(--ink3);margin-top:8px">'
    + conPos.length + ' de ' + instalados.length + ' equipos instalados con posicion conocida'
    + (sinPos ? ' · <b>' + sinPos + '</b> sin reportar todavia' : '')
    + '</div>';
  return h;
}

// Panel izquierdo completo. Se repinta solo el, no la pagina entera.
function _gpsHtmlPanel(conPos){
  var f = _gpsFiltroMapa();
  var cuenta = {todos:conPos.length, moviendo:0, mora:0, mudos:0, aldia:0};
  conPos.forEach(function(g){ cuenta[_gpsGrupo(g)]++; });

  var chips = [
    {k:'todos',    l:'Todos',      c:'var(--ink2)'},
    {k:'moviendo', l:'En marcha',  c:'var(--green)'},
    {k:'mora',     l:'En mora',    c:'var(--red)'},
    {k:'mudos',    l:'Sin señal',  c:'var(--amber)'}
  ];

  var h = '<div style="padding:10px 10px 8px;border-bottom:1px solid var(--rim)">'
    + '<input class="fi" id="gps-mapa-buscar" value="' + String(f.q||'').replace(/"/g,'&quot;') + '" '
    + 'placeholder="Buscar cliente, placa o credito..." oninput="_gpsSetFiltroMapa(\'q\', this.value)" '
    + 'style="width:100%;font-size:12.5px">'
    + '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">';
  chips.forEach(function(c){
    var on = f.grupo === c.k;
    h += '<button class="btn btn-xs" onclick="_gpsSetFiltroMapa(\'grupo\', \'' + c.k + '\')" '
      + 'style="border-radius:999px;padding:3px 10px;font-size:10.5px;font-weight:700;'
      + (on ? 'background:var(--p1);color:#fff;border:1px solid var(--p1)'
            : 'background:transparent;color:' + c.c + ';border:1px solid var(--rim)') + '">'
      + c.l + ' ' + (cuenta[c.k]||0) + '</button>';
  });
  h += '</div></div>';

  h += '<div style="flex:1;overflow-y:auto">' + _gpsListaMapa(conPos) + '</div>';
  return h;
}

function _gpsRepintarPanel(){
  var cont = document.getElementById('gps-panel');
  if(!cont){ nav('gps'); return; }
  var conPos = _gpsLista().filter(function(g){
    return String(g.estado||'')==='instalado' && _gpsTienePos(g);
  });
  cont.innerHTML = _gpsHtmlPanel(conPos);
  _gpsPintarMapa();
}

// Lista de la izquierda. Ordenada por urgencia: mora, mudos, el resto.
function _gpsListaMapa(conPos){
  var f = _gpsFiltroMapa();
  var t = String(f.q||'').trim().toLowerCase();

  var vistos = conPos.filter(function(g){
    if(f.grupo !== 'todos' && _gpsGrupo(g) !== f.grupo) return false;
    if(!t) return true;
    var info = _gpsCredInfo(g.creditoId);
    var heno = [g.idGps, g.creditoId, info && info.cliente, info && info.placa, info && info.modelo]
      .join(' ').toLowerCase();
    return t.split(/\s+/).every(function(w){ return heno.indexOf(w) > -1; });
  });

  if(!vistos.length){
    return '<div style="padding:26px 14px;text-align:center;color:var(--ink3);font-size:12px">'
      + 'Ninguna moto en este grupo.</div>';
  }

  var orden = vistos.slice().sort(function(a,b){
    var pa = ['mora','mudos','moviendo','aldia'].indexOf(_gpsGrupo(a));
    var pb = ['mora','mudos','moviendo','aldia'].indexOf(_gpsGrupo(b));
    if(pa !== pb) return pa - pb;
    var ia = _gpsCredInfo(a.creditoId), ib = _gpsCredInfo(b.creditoId);
    return ((ib&&ib.diasMora)||0) - ((ia&&ia.diasMora)||0);
  });

  var sel = _gpsSel();
  var h = '';
  orden.forEach(function(g){
    var info  = _gpsCredInfo(g.creditoId);
    var color = _gpsColor(g);
    var horas = _gpsHorasSinReportar(g);
    var on = g.id === sel;
    var moviendo = (typeof g.velocidad === 'number' && g.velocidad > 3);

    h += '<div onclick="_gpsSeleccionar(\'' + g.id + '\')" '
      + 'style="padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--rim);'
      + (on ? 'background:var(--surf2);border-left:3px solid ' + color + ';padding-left:9px' : 'border-left:3px solid transparent') + '">'
      + '<div style="display:flex;align-items:center;gap:7px">'
      + '<span style="width:8px;height:8px;border-radius:50%;background:' + color + ';flex:0 0 8px"></span>'
      + '<span style="font-weight:' + (on?'800':'700') + ';font-size:12px;line-height:1.3;overflow:hidden;'
      + 'text-overflow:ellipsis;white-space:nowrap">' + (info ? info.cliente : _gpsE(g.idGps||g.id)) + '</span>'
      + (moviendo ? '<span style="margin-left:auto;font-size:9.5px;font-weight:800;color:var(--green);white-space:nowrap">'
                    + Math.round(g.velocidad) + ' km/h</span>' : '')
      + '</div>'
      + '<div style="font-size:10.5px;color:var(--ink3);margin:2px 0 0 15px;line-height:1.45">'
      + (g.creditoId || '') + (info && info.placa ? ' · ' + info.placa : '')
      + (horas !== null ? '<br>' + (horas === 0 ? 'hace menos de 1 h'
                                  : horas < 48 ? 'hace ' + horas + ' h'
                                  : '<span style="color:var(--amber);font-weight:700">' + Math.floor(horas/24) + ' d sin reportar</span>') : '')
      + (info && info.enMora ? '<br><span style="color:var(--red);font-weight:800">' + info.diasMora + ' d de mora</span>' : '')
      + '</div></div>';
  });
  return h;
}

// ── Panel derecho: el detalle ────────────────────────────────────
function _gpsHtmlDetalle(id){
  var g = id ? _gpsById(id) : null;
  if(!g){
    return '<div style="padding:40px 20px;text-align:center;color:var(--ink3);font-size:12.5px;line-height:1.6">'
      + '<div style="font-size:30px;opacity:.3;margin-bottom:10px">👈</div>'
      + 'Elige una moto de la lista<br>para ver su detalle.</div>';
  }
  var info   = _gpsCredInfo(g.creditoId);
  var color  = _gpsColor(g);
  var fuente = _gpsFuente(g);
  var horas  = _gpsHorasSinReportar(g);
  var moviendo = (typeof g.velocidad === 'number' && g.velocidad > 3);

  var fila = function(k, v, extra){
    if(v === null || v === undefined || v === '') return '';
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:11.5px">'
      + '<span style="color:var(--ink3)">' + k + '</span>'
      + '<span style="font-weight:600;text-align:right;' + (extra||'') + '">' + v + '</span></div>';
  };
  var titulo = function(t){
    return '<div style="font-size:10px;font-weight:800;color:var(--p1);letter-spacing:.08em;'
      + 'text-transform:uppercase;margin:14px 0 4px">' + t + '</div>';
  };

  var h = '<div style="padding:14px">';

  // Cabecera
  h += '<div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:3px">'
    + '<span style="width:10px;height:10px;border-radius:50%;background:' + color + ';flex:0 0 10px;margin-top:5px"></span>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-weight:800;font-size:14px;line-height:1.25">' + (info ? info.cliente : _gpsE(g.idGps||g.id)) + '</div>'
    + '<div style="font-size:11px;color:var(--ink3);font-family:ui-monospace,monospace">' + (g.idGps||'') + '</div>'
    + '</div></div>';

  // Estado grande
  h += '<div style="background:var(--surf2);border-radius:9px;padding:9px 11px;margin:9px 0;'
    + 'display:flex;align-items:center;justify-content:space-between;gap:8px">'
    + '<span style="font-weight:800;font-size:13px;color:' + (moviendo ? 'var(--green)' : 'var(--ink)') + '">'
    + (moviendo ? 'En marcha' : 'Detenida') + '</span>'
    + '<span style="font-size:11px;color:var(--ink3)">'
    + (horas === null ? 'sin marca'
       : horas === 0 ? 'reporto hace menos de 1 h'
       : horas < 48 ? 'reporto hace ' + horas + ' h'
       : '<b style="color:var(--amber)">' + Math.floor(horas/24) + ' d sin reportar</b>')
    + '</span></div>';

  // Donde esta
  h += titulo('Donde esta');
  h += '<div id="gps-dir" style="font-size:12px;line-height:1.5;color:var(--ink2);min-height:18px">'
    + (window._gpsDirs && window._gpsDirs[_gpsClaveDir(g)]
        ? window._gpsDirs[_gpsClaveDir(g)]
        : '<span style="color:var(--ink3)">buscando la direccion...</span>')
    + '</div>';
  h += fila('Coordenadas', '<span style="font-family:ui-monospace,monospace;font-size:11px">'
        + g.lat.toFixed(5) + ', ' + g.lng.toFixed(5) + '</span>');
  h += fila('Precision', fuente.fino ? 'GPS' : fuente.l + ' · aproximada',
        fuente.fino ? '' : 'color:var(--amber)');

  // El credito — esto MiCODUS no lo tiene
  if(info){
    h += titulo('El credito');
    h += fila('N°', '<b>' + g.creditoId + '</b>');
    h += fila('Moto', info.modelo + (info.placa ? ' · ' + info.placa : ''));
    if(typeof info.cred.cuota === 'number') fila('Cuota', fmt ? fmt(info.cred.cuota) : info.cred.cuota);
    h += fila('Estado', info.enMora
        ? '<span style="color:var(--red)">' + info.diasMora + ' dias de mora</span>'
        : '<span style="color:var(--green)">al dia</span>');
    // GPS en Mi cuenta: solo un admin decide que cliente ve su moto (Adam, 14-sep-2026).
    // La verdad es la ficha ubicacion_cliente/{credito}: se consulta aparte.
    if(typeof isAdminUser === 'function' && isAdminUser() && String(g.estado||'') === 'instalado' && !g.eliminado){
      h += '<div id="gps-mc" data-gps="' + g.id + '">' + _gpsMiCuentaHtml(g) + '</div>';
      setTimeout(function(){ _gpsMiCuentaRevisar(g.id); }, 0);
    }
  }

  // El equipo
  h += titulo('El equipo');
  if(typeof g.velocidad === 'number') h += fila('Velocidad', Math.round(g.velocidad) + ' km/h');
  if(g.voltaje) h += fila('Voltaje', g.voltaje + ' V');
  if(typeof g.bateria === 'number') h += fila('Bateria', g.bateria + '%',
      g.bateria < 30 ? 'color:var(--red)' : '');
  if(g.acc !== undefined && g.acc !== null) h += fila('Contacto', (g.acc === 1 || g.acc === '1') ? 'encendido' : 'apagado');
  if(typeof g.satelites === 'number') h += fila('Satelites', g.satelites);
  if(typeof g.senal === 'number') h += fila('Señal GSM', g.senal);
  if(typeof g.odometro === 'number') h += fila('Odometro', (g.odometro/1000).toFixed(1) + ' km');

  // La SIM
  if(g.linea || g.iccid){
    h += titulo('SIM Movistar');
    if(g.linea) h += fila('Linea', '<span style="font-family:ui-monospace,monospace;font-size:11px">' + _gpsE(g.linea) + '</span>');
    if(g.iccid) h += fila('ICCID', '<span style="font-family:ui-monospace,monospace;font-size:10.5px">' + _gpsE(g.iccid) + '</span>');
  }

  // Instalacion
  if(g.fechaInstalacion || g.tecnico){
    h += titulo('Instalacion');
    if(g.fechaInstalacion) h += fila('Dia', _gpsE(g.fechaInstalacion));
    if(g.tecnico) h += fila('Tecnico', _gpsE(g.tecnico));
    var d = _gpsDiasSinRevisar(g);
    if(d !== null) h += fila('Revisado', d === 0 ? 'hoy' : 'hace ' + d + ' d',
        d > GPS_DIAS_REVISION ? 'color:var(--amber)' : '');
  }

  // Acciones
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:16px">'
    + '<button class="btn btn-g btn-xs" onclick="_gpsRevisar(\'' + g.id + '\')">Revisar</button>'
    + '<button class="btn btn-g btn-xs" onclick="_gpsOpenEdit(\'' + g.id + '\')">Editar</button>'
    + '</div>';

  h += '</div>';
  return h;
}

// ── GPS en Mi cuenta ─────────────────────────────────────────────
// Un admin activa o quita la ficha que ve el cliente (ubicacion_cliente/{credito}).
// La ficha trae SOLO la posicion y la hora de la ultima senal: la clave del
// equipo, el IMEI y la linea se quedan en /gps. Existe la ficha = el cliente
// ve su moto; el robot la mantiene al dia en cada barrido.
var _gpsMiCuenta = {};   // credito -> { visible: true|false|null, t, cargando, error }

function _gpsMiCuentaHtml(g){
  var c = _gpsMiCuenta[String(g.creditoId)] || {};
  var estado = c.error ? '<span style="color:var(--ink3)">no se pudo consultar</span>'
    : c.visible === true  ? '<span style="color:var(--green)">el cliente ve su moto</span>'
    : c.visible === false ? '<span style="color:var(--ink3)">el cliente no la ve</span>'
    : '<span style="color:var(--ink3)">consultando...</span>';
  var h = '<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:11.5px">'
    + '<span style="color:var(--ink3)">Mi cuenta</span>'
    + '<span style="font-weight:600;text-align:right">' + estado + '</span></div>';
  if(!c.cargando && (c.visible === true || c.visible === false)){
    h += '<button class="btn btn-xs ' + (c.visible ? 'btn-g' : 'btn-p') + '" style="width:100%;margin-top:6px" '
      + 'onclick="_gpsVisibleCliente(\'' + g.id + '\',' + (c.visible ? 'false' : 'true') + ')">'
      + (c.visible ? 'Quitarle su moto de Mi cuenta' : '📍 Mostrarle su moto en Mi cuenta') + '</button>';
  }
  return h;
}

function _gpsMiCuentaRevisar(id, forzar){
  var g = _gpsById(id);
  if(!g || !g.creditoId || typeof db === 'undefined' || !db) return;
  var cred = String(g.creditoId), c = _gpsMiCuenta[cred], edad = c ? Date.now() - c.t : 0;
  if(!forzar && c && (c.cargando ? edad < 15000 : edad < 60000)) return;
  _gpsMiCuenta[cred] = { visible: (c && c.visible !== undefined) ? c.visible : null, t: Date.now(), cargando: true };
  db.collection('ubicacion_cliente').doc(cred).get().then(function(d){
    _gpsMiCuenta[cred] = { visible: !!d.exists, t: Date.now() };
  }).catch(function(){
    _gpsMiCuenta[cred] = { visible: null, error: true, t: Date.now() };
  }).then(function(){ _gpsMiCuentaPintar(id); });
}

function _gpsMiCuentaPintar(id){
  var el = document.getElementById('gps-mc');
  var g = _gpsById(id);
  if(el && g && el.getAttribute('data-gps') === String(id)) el.innerHTML = _gpsMiCuentaHtml(g);
}

function _gpsVisibleCliente(id, activar){
  if(!(typeof isAdminUser === 'function' && isAdminUser())){ toast('Solo un administrador puede cambiar esto', 'error'); return; }
  var g = _gpsById(id);
  if(!g || !g.creditoId){ toast('Este equipo no tiene un credito asignado', 'error'); return; }
  if(typeof db === 'undefined' || !db){ toast('Sin conexion con la base', 'error'); return; }
  var info = _gpsCredInfo(g.creditoId);
  var quien = (info && info.cliente) ? info.cliente : String(g.creditoId);
  if(!confirm(activar
      ? '¿Mostrarle a ' + quien + ' donde esta su moto en Mi cuenta?\n\nSolo vera el punto en el mapa y la hora de la ultima señal. Podra actualizar una vez por hora.'
      : '¿Quitarle a ' + quien + ' la ubicacion de su moto en Mi cuenta?')) return;
  var cred = String(g.creditoId);
  var ficha = db.collection('ubicacion_cliente').doc(cred);
  var antes = _gpsMiCuenta[cred] || {};
  _gpsMiCuenta[cred] = { visible: antes.visible === undefined ? null : antes.visible, t: Date.now(), cargando: true };
  _gpsMiCuentaPintar(id);
  _dbSilent(function(){
    return activar
      ? ficha.set({
          credId: cred,
          lat: typeof g.lat === 'number' ? g.lat : null,
          lng: typeof g.lng === 'number' ? g.lng : null,
          ultimaSenal: g.ultimaSenal || '',
          revisado: new Date().toISOString(),
          workerUrl: String(_gpsCfg().workerUrl || '')
        })
      : ficha.delete();
  }).then(function(ok){
    if(ok){
      if(typeof logActividad === 'function') logActividad(activar ? 'gps_mi_cuenta_activar' : 'gps_mi_cuenta_quitar', 'gps', String(g.id), { credito: cred });
      toast(activar ? 'Listo: ' + quien + ' ya puede ver su moto en Mi cuenta' : 'Listo: ' + quien + ' ya no la ve en Mi cuenta', 'success');
    }
    _gpsMiCuentaRevisar(id, true);
  });
}

function _gpsClaveDir(g){
  return g.lat.toFixed(4) + ',' + g.lng.toFixed(4);
}

// Direccion en texto. Nominatim de OpenStreetMap: gratis y sin llave. Se
// cachea por coordenada redondeada para no repetir la consulta.
function _gpsBuscarDireccion(g){
  window._gpsDirs = window._gpsDirs || {};
  var clave = _gpsClaveDir(g);
  if(window._gpsDirs[clave]) return;
  fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&accept-language=es'
        + '&lat=' + g.lat + '&lon=' + g.lng)
    .then(function(r){ return r.json(); })
    .then(function(j){
      var a = j && j.address;
      var partes = a ? [a.suburb || a.neighbourhood || a.village || a.hamlet,
                        a.town || a.city || a.municipality,
                        a.state].filter(Boolean) : [];
      var txt = partes.length ? partes.join(', ') : (j && j.display_name) || 'Sin direccion conocida';
      window._gpsDirs[clave] = txt;
      var el = document.getElementById('gps-dir');
      if(el && _gpsSel() === g.id) el.textContent = txt;
    })
    .catch(function(){
      var el = document.getElementById('gps-dir');
      if(el && _gpsSel() === g.id) el.textContent = 'No se pudo obtener la direccion';
    });
}

function _gpsSeleccionar(id){
  window._gpsSeleccionado = id;
  var g = _gpsById(id);
  var det = document.getElementById('gps-detalle');
  if(det) det.innerHTML = _gpsHtmlDetalle(id);
  var pan = document.getElementById('gps-panel');
  if(pan){
    var conPos = _gpsLista().filter(function(x){
      return String(x.estado||'')==='instalado' && _gpsTienePos(x);
    });
    pan.innerHTML = _gpsHtmlPanel(conPos);
  }
  if(g && _gpsTienePos(g)){
    _gpsBuscarDireccion(g);
    _gpsIrA(id);
  }
}

// Centrar el mapa en un equipo y abrir su globo.
function _gpsIrA(id){
  var m = window._gpsMarcadores && window._gpsMarcadores[id];
  var mapa = window._gpsMapaObj;
  if(!m || !mapa) return;
  mapa.setView(m.getLatLng(), Math.max(mapa.getZoom(), 15), {animate:true});
  m.openPopup();
}

// Leaflet se carga bajo demanda: no tiene sentido pagarlo en cada carga del app.
function _gpsPintarMapa(){
  var cont = document.getElementById('gps-mapa');
  if(!cont) return;
  // Se comprueba L.map, no solo L: Leaflet puede quedar a medias si el CDN
  // responde lento o parcial, y ahi L existe pero no sirve.
  if(typeof L === 'undefined' || typeof L.map !== 'function'){
    if(window._gpsLeafletCargando) return;
    window._gpsLeafletCargando = true;
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    js.onload = function(){ window._gpsLeafletCargando = false; _gpsPintarMapa(); };
    js.onerror = function(){
      window._gpsLeafletCargando = false;
      cont.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ink3);font-size:12.5px">'
        + 'No se pudo cargar el mapa. Revisa la conexion.</div>';
    };
    document.head.appendChild(js);
    return;
  }

  var f = _gpsFiltroMapa();
  var puntos = _gpsLista().filter(function(g){
    if(String(g.estado||'') !== 'instalado' || !_gpsTienePos(g)) return false;
    return f.grupo === 'todos' || _gpsGrupo(g) === f.grupo;
  });
  if(!puntos.length) return;

  if(window._gpsMapaObj){ try{ window._gpsMapaObj.remove(); }catch(e){} window._gpsMapaObj = null; }
  var mapa = L.map(cont, {scrollWheelZoom:true}).setView([puntos[0].lat, puntos[0].lng], 12);
  window._gpsMapaObj = mapa;
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap'
  }).addTo(mapa);

  var bounds = [];
  window._gpsMarcadores = {};
  var sel = _gpsSel();
  puntos.forEach(function(g){
    var info  = _gpsCredInfo(g.creditoId);
    var color = _gpsColor(g);
    var fuente = _gpsFuente(g);
    var horas = _gpsHorasSinReportar(g);

    if(!fuente.fino){
      L.circle([g.lat, g.lng], {radius:400, color:color, weight:1, opacity:.5,
        fillColor:color, fillOpacity:.08, dashArray:'4,4'}).addTo(mapa);
    }
    var m = L.circleMarker([g.lat, g.lng], {
      radius: g.id === sel ? 11 : 8, color:'#fff', weight: g.id === sel ? 3 : 2,
      fillColor:color, fillOpacity:.95
    }).addTo(mapa);
    window._gpsMarcadores[g.id] = m;
    m.on('click', function(){ _gpsSeleccionar(g.id); });

    var pop = '<div style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;line-height:1.55;min-width:170px">'
      + '<div style="font-weight:800;font-size:13px;margin-bottom:2px">'
      + (info ? info.cliente : _gpsE(g.idGps || g.id)) + '</div>';
    if(g.creditoId) pop += '<div style="color:#555">' + g.creditoId
      + (info && info.placa ? ' · ' + info.placa : '') + '</div>';
    if(info && info.enMora) pop += '<div style="color:#F04B6A;font-weight:700">' + info.diasMora + ' dias de mora</div>';
    if(horas !== null) pop += '<div style="color:#888;font-size:11px">'
      + (horas === 0 ? 'hace menos de 1 h' : 'hace ' + horas + ' h') + '</div>';
    pop += '</div>';
    m.bindPopup(pop);
    bounds.push([g.lat, g.lng]);
  });

  if(bounds.length > 1) mapa.fitBounds(bounds, {padding:[40,40], maxZoom:15});
  setTimeout(function(){ try{ mapa.invalidateSize(); }catch(e){} }, 120);
}

// ══════════════════════════════════════════════════════════════════
// CRUD
// ══════════════════════════════════════════════════════════════════

function _gpsOpenEdit(id, credPre){
  var ex = id ? _gpsById(id) : null;
  var g = ex || {
    id:'', estado:'stock', iccid:'', linea:'', idGps:'', passwordGps:'', imei:'',
    creditoId: credPre || '', fechaInstalacion:'', tecnico:'', verificadoPor:'', observaciones:''
  };
  var esc = function(v){ return String(v==null?'':v).replace(/"/g,'&quot;'); };

  setMicon('llave');
  $('mtt').textContent = ex ? 'Equipo GPS' : 'Nuevo equipo GPS';
  $('msb').textContent = ex ? (ex.idGps || ex.id) : 'Dispositivo de rastreo + linea SIM';
  $('modal-box').className = 'modal';

  var credsOpts = '<option value="">— sin asignar —</option>';
  _gpsCredsVivos().slice().sort(function(a,b){ return String(a.id).localeCompare(String(b.id)); })
    .forEach(function(c){
      credsOpts += '<option value="' + c.id + '"' + (g.creditoId === c.id ? ' selected' : '') + '>'
        + c.id + ' — ' + (c.cli || '') + ' · ' + (c.modelo || c.marca || '') + '</option>';
    });

  $('mbd').innerHTML = ''
    + '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Estado del equipo</label><select class="fs" id="gps_estado">'
    + GPS_ESTADOS.map(function(e){
        return '<option value="' + e.v + '"' + (String(g.estado||'stock')===e.v?' selected':'') + '>' + e.l + ' — ' + e.d + '</option>';
      }).join('')
    + '</select></div>'

    + '<div style="font-size:11px;font-weight:800;color:var(--p1);letter-spacing:.06em;text-transform:uppercase;margin-top:4px">Equipo</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>ID GPS</label><input class="fi" id="gps_idgps" value="' + esc(g.idGps) + '" placeholder="Ej: 19210075478"></div>'
    + '<div class="fg"><label>IMEI</label><input class="fi" id="gps_imei" value="' + esc(g.imei) + '" placeholder="15 digitos"></div>'
    + '</div>'
    + '<div class="fg"><label>Password del equipo</label>'
    + '<input class="fi" id="gps_pass" type="password" value="' + esc(g.passwordGps) + '" placeholder="Solo si el equipo la exige">'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px">Se guarda oculta. Cualquiera con acceso a este modulo puede revelarla, asi que trata este campo como una llave.</div></div>'

    + '<div style="font-size:11px;font-weight:800;color:var(--p1);letter-spacing:.06em;text-transform:uppercase;margin-top:4px">Linea Movistar</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>N° de linea</label><input class="fi" id="gps_linea" value="' + esc(g.linea) + '" placeholder="Ej: 143557051"></div>'
    + '<div class="fg"><label>ICCID</label><input class="fi" id="gps_iccid" value="' + esc(g.iccid) + '" placeholder="Ej: 895804420015136641"></div>'
    + '</div>'

    + '<div style="font-size:11px;font-weight:800;color:var(--p1);letter-spacing:.06em;text-transform:uppercase;margin-top:4px">Instalacion</div>'
    + '<div class="fg"><label>Credito</label><select class="fs" id="gps_cred">' + credsOpts + '</select>'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px">El cliente, la moto y la placa se leen del credito. No hay que copiarlos.</div></div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Dia de instalacion</label><input type="date" class="fi" id="gps_fecha" value="' + esc(g.fechaInstalacion) + '"></div>'
    + '<div class="fg"><label>Tecnico que instalo</label><input class="fi" id="gps_tecnico" value="' + esc(g.tecnico) + '" placeholder="Nombre"></div>'
    + '</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Verificado por</label><input class="fi" id="gps_verif" value="' + esc(g.verificadoPor) + '" placeholder="Nombre"></div>'
    + '<div class="fg"><label>Estado en MiCODUS</label><input class="fi" id="gps_micodus" value="' + esc(g.estadoMicodus) + '" placeholder="ONLINE / OK"></div>'
    + '</div>'
    + '<div class="fg"><label>Observaciones</label><textarea class="fi" id="gps_obs" rows="2">' + String(g.observaciones||'').replace(/</g,'&lt;') + '</textarea></div>'
    + '</div>';

  S.saveFn = function(){
    var v = function(k){ var e = $(k); return e ? String(e.value||'').trim() : ''; };
    var idGps = v('gps_idgps'), imei = v('gps_imei'), linea = v('gps_linea');
    if(!idGps && !imei && !linea){
      toast('Pon al menos el ID del GPS, el IMEI o la linea', 'error'); return false;
    }
    var estado = v('gps_estado') || 'stock';
    var cred = v('gps_cred');
    if(estado === 'instalado' && !cred){
      toast('Un equipo instalado tiene que tener credito asignado', 'error'); return false;
    }
    // Un mismo credito no puede tener dos equipos instalados a la vez.
    if(estado === 'instalado' && cred){
      var choque = _gpsLista().find(function(x){
        return x.id !== (ex && ex.id) && x.creditoId === cred && String(x.estado||'')==='instalado';
      });
      if(choque){
        toast('El credito ' + cred + ' ya tiene el equipo ' + (choque.idGps||choque.id) + ' instalado', 'error');
        return false;
      }
    }
    var o = ex ? Object.assign({}, ex) : { id: _gpsNuevoId() };
    o.estado = estado;
    o.idGps = idGps; o.imei = imei; o.linea = linea;
    o.iccid = v('gps_iccid');
    o.passwordGps = v('gps_pass');
    o.creditoId = cred;
    o.fechaInstalacion = v('gps_fecha');
    o.tecnico = v('gps_tecnico');
    o.verificadoPor = v('gps_verif');
    o.estadoMicodus = v('gps_micodus');
    o.observaciones = v('gps_obs');
    o.eliminado = false;
    if(!ex){
      o.creado = new Date().toISOString();
      o.creadoPor = (S.currentUser && S.currentUser.nombre) || 'Admin';
      S.gps = S.gps || [];
      S.gps.push(o);
    } else {
      o.actualizado = new Date().toISOString();
      var i = S.gps.findIndex(function(x){ return x.id === ex.id; });
      if(i >= 0) S.gps[i] = o;
    }
    if(DB && DB.saveGps) DB.saveGps(o);
    if(typeof logActividad === 'function') logActividad(ex?'gps_editar':'gps_crear','gps',o.id,{estado:o.estado, credito:o.creditoId});
    closeM();
    toast(ex ? 'Equipo actualizado' : 'Equipo registrado', 'success');
    nav('gps');
    return true;
  };

  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + (ex ? '<button class="btn btn-g btn-sm" onclick="_gpsVerPassword(\'' + ex.id + '\')">Ver password</button>' : '')
    + (ex ? '<button class="btn btn-d btn-sm" onclick="_gpsEliminar(\'' + ex.id + '\')">Eliminar</button>' : '')
    + '<button class="btn btn-p" onclick="saveM()">' + (ex ? 'Guardar cambios' : 'Registrar equipo') + '</button>';
  $('ov').style.display = 'flex';
}

// Revelar la password deja rastro: es una credencial del equipo.
function _gpsVerPassword(id){
  var g = _gpsById(id);
  if(!g) return;
  var campo = $('gps_pass');
  if(!campo) return;
  if(campo.type === 'password'){
    campo.type = 'text';
    if(typeof logActividad === 'function') logActividad('gps_ver_password','gps',id,{idGps:g.idGps||''});
  } else {
    campo.type = 'password';
  }
}

function _gpsEliminar(id){
  var g = _gpsById(id);
  if(!g) return;
  if(!confirm('¿Eliminar el equipo ' + _gpsE(g.idGps || g.id) + '?\n\nQueda marcado como eliminado, no se borra del historial.')) return;
  g.eliminado = true;
  g.eliminadoEn = new Date().toISOString();
  g.eliminadoPor = (S.currentUser && S.currentUser.nombre) || 'Admin';
  if(DB && DB.saveGps) DB.saveGps(g);
  if(typeof logActividad === 'function') logActividad('gps_eliminar','gps',id,{});
  closeM();
  toast('Equipo eliminado', 'success');
  nav('gps');
}

// ══════════════════════════════════════════════════════════════════
// IMPORTAR DESDE EL EXCEL
// ══════════════════════════════════════════════════════════════════

function _gpsImportarAbrir(){
  setMicon('exportar');
  $('mtt').textContent = 'Importar equipos';
  $('msb').textContent = 'Pegar filas del Excel';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = ''
    + '<div style="font-size:12.5px;color:var(--ink2);line-height:1.65;margin-bottom:12px">'
    + 'Copia las filas del Excel (sin el encabezado) y pegalas aqui. Se esperan las columnas en este orden:'
    + '<div style="font-family:ui-monospace,monospace;font-size:10.5px;background:var(--surf2);border-radius:6px;padding:8px 10px;margin-top:7px;line-height:1.7">'
    + 'ESTADO · ICCID · LINEA · ID GPS · PASSWORD · IMEI · CLIENTE · N° CRED · MODELO · PLACA · CONCESIONARIO · DIA INSTALACION · TECNICO · ESTADO MiCODUS · VERIFICADO POR · OBSERVACIONES'
    + '</div></div>'
    + '<div class="fg"><label>Filas</label>'
    + '<textarea class="fi" id="gps_imp" rows="9" placeholder="Pega aqui — una fila por equipo, columnas separadas por tabulador"></textarea></div>'
    + '<div id="gps_imp_prev" style="font-size:11.5px;color:var(--ink3);margin-top:8px"></div>';
  S.saveFn = _gpsImportarProcesar;
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="saveM()">Importar</button>';
  $('ov').style.display = 'flex';
}

// El Excel trae cliente, modelo y placa, pero el sistema los saca del credito.
// Se ignoran a proposito para no crear una segunda verdad.
function _gpsImportarProcesar(){
  var txt = ($('gps_imp') && $('gps_imp').value) || '';
  var lineas = txt.split(/\r?\n/).map(function(l){ return l.trim(); }).filter(Boolean);
  if(!lineas.length){ toast('No pegaste nada', 'error'); return false; }

  var creds = {};
  (S.creds||[]).forEach(function(c){ if(c && !c.eliminado) creds[String(c.id).toUpperCase()] = c.id; });

  var nuevos = [], saltados = 0, sinCred = 0;
  var yaIdGps = {}, yaImei = {};
  _gpsLista().forEach(function(g){
    if(g.idGps) yaIdGps[String(g.idGps)] = 1;
    if(g.imei) yaImei[String(g.imei)] = 1;
  });

  lineas.forEach(function(l){
    var c = l.split('\t');
    if(c.length < 2) c = l.split(/\s{2,}|;/);
    var get = function(i){ return String(c[i]==null?'':c[i]).trim(); };
    var idGps = get(3), imei = get(5), linea = get(2);
    if(!idGps && !imei && !linea) return;
    if((idGps && yaIdGps[idGps]) || (imei && yaImei[imei])){ saltados++; return; }

    var credRaw = get(7).toUpperCase().replace(/\s+/g,'');
    // Ojo: no basta con mirar que credPrefijo exista. Se comprueba que devuelva un
    // texto: si no, se usa CRED y no se arma un prefijo con cualquier cosa.
    var _pre = 'CRED';
    try { var _p = (typeof credPrefijo==='function') ? credPrefijo() : ''; if(typeof _p === 'string' && _p) _pre = _p; } catch(e){}
    if(credRaw && credRaw.indexOf(_pre) === 0 && credRaw.indexOf('-') === -1){
      credRaw = credRaw.replace(_pre, _pre + '-');
    }
    var credId = creds[credRaw] || '';
    if(credRaw && !credId) sinCred++;

    var est = get(0).toUpperCase();
    var estado = est.indexOf('INSTAL') > -1 ? 'instalado'
               : est.indexOf('RETIR') > -1 ? 'retirado'
               : est.indexOf('FALL') > -1 ? 'falla' : 'stock';
    if(estado === 'instalado' && !credId) estado = 'stock';

    var f = get(11);
    var fecha = '';
    var mm = f.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if(mm){
      var yy = mm[3].length === 2 ? '20' + mm[3] : mm[3];
      fecha = yy + '-' + ('0'+mm[2]).slice(-2) + '-' + ('0'+mm[1]).slice(-2);
    } else if(/^\d{4}-\d{2}-\d{2}/.test(f)) fecha = f.slice(0,10);

    nuevos.push({
      id: _gpsNuevoId(),
      estado: estado,
      iccid: get(1), linea: linea, idGps: idGps, passwordGps: get(4), imei: imei,
      creditoId: credId,
      fechaInstalacion: fecha,
      tecnico: get(12), estadoMicodus: get(13), verificadoPor: get(14), observaciones: get(15),
      eliminado: false,
      creado: new Date().toISOString(),
      creadoPor: (S.currentUser && S.currentUser.nombre) || 'Admin',
      importado: true
    });
    if(idGps) yaIdGps[idGps] = 1;
    if(imei) yaImei[imei] = 1;
  });

  if(!nuevos.length){
    toast(saltados ? 'Todas las filas ya estaban cargadas' : 'No se entendio ninguna fila', 'error');
    return false;
  }
  S.gps = (S.gps || []).concat(nuevos);
  nuevos.forEach(function(o){ if(DB && DB.saveGps) DB.saveGps(o); });
  if(typeof logActividad === 'function') logActividad('gps_importar','gps','',{n:nuevos.length});
  closeM();
  var msg = nuevos.length + ' equipo' + (nuevos.length===1?'':'s') + ' importado' + (nuevos.length===1?'':'s');
  if(saltados) msg += ' · ' + saltados + ' repetido' + (saltados===1?'':'s') + ' omitido' + (saltados===1?'':'s');
  if(sinCred) msg += ' · ' + sinCred + ' con credito no encontrado';
  toast(msg, 'success');
  nav('gps');
  return true;
}
