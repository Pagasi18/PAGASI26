// ╔══════════════════════════════════════════════════════════╗
// ║ FIREBASE — PEGA TU CONFIG AQUÍ ║
// ║ 1. console.firebase.google.com ║
// ║ 2. Engranaje → Configuración del proyecto ║
// ║ 3. Tu app Web → copia el objeto firebaseConfig ║
// ╚══════════════════════════════════════════════════════════╝
var FIREBASE_CONFIG = {
  // Firebase de PAGASI 26 (proyecto pagasi26-65ced). Esta llave va dentro de la
  // pagina y la ve cualquiera: no es un secreto, lo que protege la base son las
  // Reglas. La guarda de mas abajo impide abrir el sistema si queda sin poner.
  apiKey: 'AIzaSyD6IznQjzF7Tdq7UJMXT4rSBdbCNpsmij4',
  authDomain: 'pagasi26-65ced.firebaseapp.com',
  projectId: 'pagasi26-65ced',
  storageBucket: 'pagasi26-65ced.firebasestorage.app',
  messagingSenderId: '415041001199',
  appId: '1:415041001199:web:9844b2b6835fea0e84ad1a'
};

// ── COMO SE NUMERAN LOS CREDITOS ─────────────────────────────────────────────
// Cada compania tiene su serie. PAGASI 18 lleva CRED-001 desde siempre y no se toca;
// PAGASI 26 arranca su propia serie con otra letra (Adam, 22-sep-2026). Cambiar esto
// en una base que YA tiene creditos parte la numeracion en dos: se pone al crear la
// compania y no se vuelve a tocar.
var CRED_PREFIJO = 'M';   // PAGASI 26 lleva su propia serie: M-001, M-002... (Adam, 22-sep-2026)
function credPrefijo(){ return String(CRED_PREFIJO || 'CRED'); }
function credNum(n){ return credPrefijo() + '-' + String(n).padStart(3, '0'); }
function credNumRe(){ return new RegExp('^' + credPrefijo() + '-(\\d+)$'); }
window.credPrefijo = credPrefijo; window.credNum = credNum;

// ══════════════════════════════════════════════════════════════════
// LA MEMORIA DEL NAVEGADOR ES DE UNA SOLA COMPANIA
// ══════════════════════════════════════════════════════════════════
// El app guarda copias en la maquina de cada persona (motos, catalogo, plan de
// pago, score, tareas) para abrir rapido y aguantar sin internet. Chrome guarda
// esa libreta POR DOMINIO, y las llaves no dicen de que compania son.
// Con dos companias eso mezcla datos, y en las motos la copia local le GANA a la
// base (mergeMotosPreferLocal): el inventario de una aparece dentro de la otra.
// Pasa igual cuando un dominio cambia de compania, aunque nunca convivan.
// Por eso la libreta queda marcada con el proyecto de Firebase: si al abrir la
// marca no es la de esta compania, se bota lo que es copia de la base. NO se
// toca lo que es de la persona o del equipo: el tema claro/oscuro, los permisos
// de notificaciones y los documentos que el empleado adjunto y todavia no subio.
// (22-sep-2026, antes de que pagasi.io pase a PAGASI 26)
// ══════════════════════════════════════════════════════════════════
// SIN LLAVE DE FIREBASE, EL SISTEMA NO ABRE
// ══════════════════════════════════════════════════════════════════
// Antes, con la llave sin poner, el app abria igual y solo escribia un aviso en
// la consola que nadie mira: la gente trabajaba y los datos se perdian al
// recargar. Ahora se para en seco y se dice en pantalla (22-sep-2026).
function _faltaLaLlave(){
  try{ return !FIREBASE_CONFIG || String(FIREBASE_CONFIG.apiKey||'').indexOf('FALTA_LA_LLAVE')===0; }catch(e){ return true; }
}
function _pantallaSinLlave(archivo){
  var d = 'font-family:system-ui,sans-serif;max-width:560px;margin:14vh auto;padding:28px 30px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;color:#111;line-height:1.55';
  document.body.innerHTML = '<div style="'+d+'">'
    + '<div style="font-size:19px;font-weight:800;margin-bottom:10px">Falta conectar la base de datos</div>'
    + '<div style="font-size:14px;color:#374151">Esta página todavía no tiene la llave de Firebase de su compañía, '
    + 'así que no se abre: si se abriera, lo que escribieras se perdería.</div>'
    + '<div style="font-size:13px;color:#6b7280;margin-top:14px">Para arreglarlo: Firebase → Configuración del proyecto → '
    + 'Tus apps → app web, y pegar esa llave en <code>'+archivo+'</code>.</div></div>';
}
if(_faltaLaLlave()){
  document.addEventListener('DOMContentLoaded', function(){ _pantallaSinLlave('assets/pagasi-app.js'); });
}

var _MEM_MARCA = 'pagasi_empresa_memoria';
var _MEM_BORRAR = ['pagasi_motos_cache_v1','motosCache','motosCacheV2','pagasi_catalogo_config',
  'pagasi_catalogo_ver','pagasi_config_plan','pagasi_config_score','pagasi_planes_extra',
  'pagasi_inv_oficina','concesionarioActivo','pagasi_workcenter_tasks_v3',
  'pagasi_notif_historial_v1','libroSeniatCfg_v1'];
var _MEM_BORRAR_PREFIJO = ['pagasi_mora_alert_','pgsDaily_','pgsPushLog_','_perfilNagDismissed_'];
var _MEM_RESPETAR = ['pagasi_theme','pgsPushEnabled'];
var _MEM_RESPETAR_PREFIJO = ['pagasi_cli_docs_'];
function _memEsDeLaBase(k){
  if(_MEM_RESPETAR.indexOf(k) > -1) return false;
  for(var i=0;i<_MEM_RESPETAR_PREFIJO.length;i++){ if(k.indexOf(_MEM_RESPETAR_PREFIJO[i])===0) return false; }
  if(_MEM_BORRAR.indexOf(k) > -1) return true;
  for(var j=0;j<_MEM_BORRAR_PREFIJO.length;j++){ if(k.indexOf(_MEM_BORRAR_PREFIJO[j])===0) return true; }
  return false;
}
var _memLimpiadaDe = null;
(function _memoriaDeEstaEmpresa(){
  try{
    var proy = (FIREBASE_CONFIG && FIREBASE_CONFIG.projectId) || '';
    if(!proy || typeof localStorage==='undefined') return;
    var marca = localStorage.getItem(_MEM_MARCA);
    if(marca === proy) return;
    // Sin marca: la libreta es de antes de este cambio y no hay forma de saber de
    // quien es. Se limpia igual, que son copias y se rehacen solas desde la base.
    var llaves = [];
    for(var i=0;i<localStorage.length;i++){ var k = localStorage.key(i); if(k && _memEsDeLaBase(k)) llaves.push(k); }
    llaves.forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
    localStorage.setItem(_MEM_MARCA, proy);
    if(llaves.length) _memLimpiadaDe = { antes: marca || '(sin marca)', ahora: proy, llaves: llaves.length };
  }catch(e){}
})();
// Que no pase callado: si esta computadora traia datos de otra compania, se dice.
if(_memLimpiadaDe){
  setTimeout(function(){
    if(typeof toast==='function') toast('Esta computadora tenía guardados datos de otro sistema Pagasi. Se limpiaron y todo se está leyendo de la base.','info');
  }, 3500);
}

// ════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS del navegador — recordatorios automáticos
// ════════════════════════════════════════════════════════════════
function pushNotifSupported(){
  return ('Notification' in window) && typeof Notification.requestPermission === 'function';
}

function pushNotifState(){
  if(!pushNotifSupported()) return 'no-soportado';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

async function pushNotifRequest(){
  if(!pushNotifSupported()){
    if(typeof toast==='function') toast('Tu navegador no soporta notificaciones','error');
    return false;
  }
  try {
    var perm = await Notification.requestPermission();
    if(perm === 'granted'){
      if(typeof toast==='function') toast('✓ Notificaciones activadas','success');
      try { localStorage.setItem('pgsPushEnabled','1'); } catch(e){}
      // Notificación de prueba
      pushNotifShow('Pagasi activado', 'Recibirás recordatorios de cobros y leads nuevos.', 'check');
      // Iniciar el watcher periódico
      pushNotifIniciarWatcher();
      return true;
    } else {
      if(typeof toast==='function') toast('Permiso de notificaciones denegado','warn');
      return false;
    }
  } catch(e){
    console.error('Push permission error:', e);
    return false;
  }
}

function pushNotifShow(titulo, body, tag){
  if(pushNotifState() !== 'granted') return null;
  try {
    var n = new Notification(titulo, {
      body: body,
      icon: '/PAGASI-V2.0/assets/pagasi-favicon.png',  // GitHub Pages path
      badge: '/PAGASI-V2.0/assets/pagasi-favicon.png',
      tag: tag || 'pagasi-' + Date.now(),
      requireInteraction: false,
      silent: false
    });
    n.onclick = function(){
      window.focus();
      n.close();
    };
    return n;
  } catch(e){
    console.warn('Push notif show error:', e);
    return null;
  }
}

// Mantiene registro de cosas ya notificadas hoy para no spamear
function _pushNotifWasShown(key){
  try {
    var hoy = new Date().toISOString().slice(0,10);
    var raw = localStorage.getItem('pgsPushLog_'+hoy) || '[]';
    var arr = JSON.parse(raw);
    return arr.indexOf(key) >= 0;
  } catch(e){ return false; }
}
function _pushNotifMark(key){
  try {
    var hoy = new Date().toISOString().slice(0,10);
    var raw = localStorage.getItem('pgsPushLog_'+hoy) || '[]';
    var arr = JSON.parse(raw);
    if(arr.indexOf(key) < 0){ arr.push(key); localStorage.setItem('pgsPushLog_'+hoy, JSON.stringify(arr)); }
  } catch(e){}
}

function pushNotifChequearAhora(){
  if(pushNotifState() !== 'granted') return;
  if(!S || !S.creds) return;
  try {
    // 1) Cuotas vencidas (mora > 0)
    var vencidas = (S.creds||[]).filter(function(c){
      return !c.eliminado && c.estado === 'activo' && (parseInt(c.mora,10)||0) > 0;
    });
    var graves = vencidas.filter(function(c){ return (parseInt(c.mora,10)||0) > 30; });
    if(graves.length > 0 && !_pushNotifWasShown('mora-grave-'+graves.length)){
      pushNotifShow(
        '⚠ ' + graves.length + ' clientes con mora grave',
        graves.length + ' clientes tienen +30 días de atraso. Revisa cobranza.',
        'mora-grave'
      );
      _pushNotifMark('mora-grave-'+graves.length);
    }

    // 2) Cuotas que vencen HOY o mañana
    var hoy = new Date(); hoy.setHours(0,0,0,0);
    var manana = new Date(hoy); manana.setDate(hoy.getDate()+1);
    var venceProx = 0;
    (S.creds||[]).forEach(function(c){
      if(c.eliminado || c.estado !== 'activo' || !c.fecha) return;
      var inicio = new Date(c.fecha);
      var siguiente = new Date(inicio.getTime() + (((c.pagado||0)+1) * 15 * 24 * 60 * 60 * 1000));
      siguiente.setHours(0,0,0,0);
      if(siguiente.getTime() === hoy.getTime() || siguiente.getTime() === manana.getTime()){
        venceProx++;
      }
    });
    if(venceProx > 0 && !_pushNotifWasShown('vence-prox-'+venceProx)){
      pushNotifShow(
        '⏰ ' + venceProx + ' cuotas vencen hoy/mañana',
        'Revisa el módulo de cobranza para llamar antes de la fecha.',
        'vence-prox'
      );
      _pushNotifMark('vence-prox-'+venceProx);
    }

    // 3) Leads web nuevos sin atender
    var leadsWeb = (S.clientes||[]).filter(function(cl){
      if(cl.eliminado) return false;
      if(cl.origen !== 'web') return false;
      // Sin crédito asociado todavía
      var tieneCred = (S.creds||[]).some(function(cr){ return cr.cliId === cl.id || cr.cli === cl.nombre; });
      return !tieneCred;
    });
    if(leadsWeb.length > 0 && !_pushNotifWasShown('leads-web-'+leadsWeb.length)){
      pushNotifShow(
        '🎯 ' + leadsWeb.length + ' lead' + (leadsWeb.length!==1?'s':'') + ' web sin atender',
        'Tienes nuevos clientes que llenaron el formulario. Contáctalos antes de que se enfríen.',
        'leads-web'
      );
      _pushNotifMark('leads-web-'+leadsWeb.length);
    }
  } catch(e){ console.warn('pushNotifChequear error:', e); }
}

var _pushNotifTimer = null;
function pushNotifIniciarWatcher(){
  if(_pushNotifTimer) clearInterval(_pushNotifTimer);
  // Chequear al inicio + cada 30 min
  setTimeout(pushNotifChequearAhora, 5000);
  _pushNotifTimer = setInterval(pushNotifChequearAhora, 30 * 60 * 1000);
}

// ════════════════════════════════════════════════════════════════
// REPORTE MENSUAL POR EMAIL — generador + apertura mailto
// ════════════════════════════════════════════════════════════════
function generarReporteMensual(){
  if(!S || !S.creds) return null;
  var hoy = new Date();
  var mesAct = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0');
  var mesAnt = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
  var mesAntK = mesAnt.getFullYear() + '-' + String(mesAnt.getMonth()+1).padStart(2,'0');

  // ─── PAGOS CONFIRMADOS ───
  var pagosConf = (S.pagos||[]).filter(function(p){ return !p.eliminado && p.estado === 'confirmado'; });
  var pagosMesAct = pagosConf.filter(function(p){ return p.fecha && p.fecha.startsWith(mesAct); });
  var pagosMesAnt = pagosConf.filter(function(p){ return p.fecha && p.fecha.startsWith(mesAntK); });

  var cobradoMesAct = pagosMesAct.reduce(function(a,p){ return a + (parseFloat(p.monto)||0); }, 0);
  var cobradoMesAnt = pagosMesAnt.reduce(function(a,p){ return a + (parseFloat(p.monto)||0); }, 0);
  var pctCrec = cobradoMesAnt > 0 ? Math.round((cobradoMesAct - cobradoMesAnt) / cobradoMesAnt * 100) : (cobradoMesAct > 0 ? 100 : 0);

  // Cuotas vs Iniciales
  var iniciales = pagosMesAct.filter(function(p){
    return p.esInicial || p.tipoOperacion === 'inicial_credito' || (p.concepto && String(p.concepto).indexOf('Inicial · ') === 0);
  });
  var cuotas = pagosMesAct.filter(function(p){
    return !(p.esInicial || p.tipoOperacion === 'inicial_credito' || (p.concepto && String(p.concepto).indexOf('Inicial · ') === 0));
  });
  var totalIniciales = iniciales.reduce(function(a,p){ return a + (parseFloat(p.monto)||0); }, 0);
  var totalCuotas = cuotas.reduce(function(a,p){ return a + (parseFloat(p.monto)||0); }, 0);

  // ─── EGRESOS ───
  var egresosTodos = (S.egresos||[]).filter(function(e){ return !e.eliminado; });
  var egresosMesAct = egresosTodos.filter(function(e){ return e.fecha && e.fecha.startsWith(mesAct); });
  var totalEgresos = egresosMesAct.reduce(function(a,e){ return a + (parseFloat(e.monto)||0); }, 0);

  // Egresos por categoría
  var egresosPorCat = {};
  egresosMesAct.forEach(function(e){
    var cat = e.categoria || e.concepto || 'Sin categoría';
    if(!egresosPorCat[cat]) egresosPorCat[cat] = {cat:cat, total:0, count:0};
    egresosPorCat[cat].total += parseFloat(e.monto)||0;
    egresosPorCat[cat].count++;
  });
  var egresosListados = Object.values(egresosPorCat).sort(function(a,b){ return b.total - a.total; });

  // Utilidad
  var utilidad = cobradoMesAct - totalEgresos;

  // ─── CARTERA ───
  var cartera = (S.creds||[]).filter(function(c){ return !c.eliminado && c.estado === 'activo'; })
    .reduce(function(a,c){
      var tot = (parseFloat(c.cuotaQ||c.cuota||0) * (c.totalCuotas || (c.plazo||0)*2));
      var pag = (parseFloat(c.cuotaQ||c.cuota||0) * (parseInt(c.pagado,10)||0));
      return a + Math.max(0, tot - pag);
    }, 0);

  // ─── CRÉDITOS ───
  var creditosActivos = (S.creds||[]).filter(function(c){ return !c.eliminado && c.estado === 'activo'; }).length;
  var creditosCompletados = (S.creds||[]).filter(function(c){ return !c.eliminado && c.estado === 'completado'; }).length;
  var creditosNuevosArr = (S.creds||[]).filter(function(c){
    if(c.eliminado) return false;
    var f = c.fecha || c.creadoEn;
    return f && String(f).startsWith(mesAct);
  });
  var creditosNuevos = creditosNuevosArr.length;
  var montoCreditosNuevos = creditosNuevosArr.reduce(function(a,c){ return a + (parseFloat(c.precio)||0); }, 0);

  // ─── MORA ───
  var enMora = (S.creds||[]).filter(function(c){
    return !c.eliminado && c.estado === 'activo' && (parseInt(c.mora,10)||0) > 0;
  }).sort(function(a,b){ return (parseInt(b.mora,10)||0) - (parseInt(a.mora,10)||0); });
  var moraGraves = enMora.filter(function(c){ return (parseInt(c.mora,10)||0) > 30; });
  var moraLeves = enMora.filter(function(c){ return (parseInt(c.mora,10)||0) <= 30; });

  // ─── TOP COBRADORES ───
  var topCobradoresMap = {};
  pagosMesAct.forEach(function(p){
    var cob = p.cobrador || p.realizadoPor || 'Sin asignar';
    if(!topCobradoresMap[cob]) topCobradoresMap[cob] = {nombre:cob, total:0, count:0};
    topCobradoresMap[cob].total += parseFloat(p.monto)||0;
    topCobradoresMap[cob].count++;
  });
  var topCobradores = Object.values(topCobradoresMap).sort(function(a,b){ return b.total - a.total; });

  // ─── TOP CLIENTES (más pagaron) ───
  var topClientesMap = {};
  pagosMesAct.forEach(function(p){
    var cli = p.cli || 'Sin nombre';
    if(!topClientesMap[cli]) topClientesMap[cli] = {nombre:cli, total:0, count:0};
    topClientesMap[cli].total += parseFloat(p.monto)||0;
    topClientesMap[cli].count++;
  });
  var topClientes = Object.values(topClientesMap).sort(function(a,b){ return b.total - a.total; }).slice(0,10);

  // ─── CLIENTES ───
  var clientesTotales = (S.clientes||[]).filter(function(c){ return !c.eliminado; }).length;
  var clientesNuevos = (S.clientes||[]).filter(function(cl){
    if(cl.eliminado) return false;
    return cl.creado && String(cl.creado).startsWith(mesAct);
  }).length;
  var leadsWeb = (S.clientes||[]).filter(function(cl){
    if(cl.eliminado) return false;
    if(cl.origen !== 'web') return false;
    return cl.creado && String(cl.creado).startsWith(mesAct);
  }).length;

  // ─── INVENTARIO MOTOS ───
  var motosDisponibles = (S.motos||[]).filter(function(m){ return !m.eliminado && m.estado === 'disponible'; }).length;
  var motosVendidas = (S.motos||[]).filter(function(m){ return !m.eliminado && m.estado === 'vendida'; }).length;
  var motosTotal = (S.motos||[]).filter(function(m){ return !m.eliminado; }).length;

  // ─── PAGOS POR SEDE / CONCESIONARIO ───
  var pagosPorSedeMap = {};
  pagosMesAct.forEach(function(p){
    var cred = (S.creds||[]).find(function(c){ return c.id === p.cred; });
    var sede = 'Sin sede';
    if(cred && cred.concesionarioId){
      var conc = (S.concesionarios||[]).find(function(c){ return c.id === cred.concesionarioId; });
      sede = conc ? conc.nombre : 'Sin sede';
    }
    if(!pagosPorSedeMap[sede]) pagosPorSedeMap[sede] = {sede:sede, total:0, count:0};
    pagosPorSedeMap[sede].total += parseFloat(p.monto)||0;
    pagosPorSedeMap[sede].count++;
  });
  var pagosPorSede = Object.values(pagosPorSedeMap).sort(function(a,b){ return b.total - a.total; });

  // ─── FACTURAS EMITIDAS ───
  var facturasMes = (S.facturas||[]).filter(function(f){
    return !f.anulada && f.fechaEmision && String(f.fechaEmision).startsWith(mesAct);
  });
  var facturasAnuladas = (S.facturas||[]).filter(function(f){
    return f.anulada && f.fechaAnulacion && String(f.fechaAnulacion).startsWith(mesAct);
  }).length;

  var mesNombre = hoy.toLocaleDateString('es-VE',{month:'long',year:'numeric'});
  var fmtUsd = function(n){ return '$' + (Math.round(n)||0).toLocaleString('en-US'); };
  var fmtFecha = function(s){ if(!s) return '—'; try { return new Date(s).toLocaleDateString('es-VE',{day:'2-digit',month:'short'}); } catch(e){ return s; } };

  return {
    mes: mesNombre,
    mesAct: mesAct,
    cobradoMesAct: cobradoMesAct,
    cobradoMesAnt: cobradoMesAnt,
    pctCrec: pctCrec,
    cartera: cartera,
    creditosActivos: creditosActivos,
    creditosCompletados: creditosCompletados,
    creditosNuevos: creditosNuevos,
    montoCreditosNuevos: montoCreditosNuevos,
    creditosNuevosArr: creditosNuevosArr,
    enMora: enMora,
    moraGraves: moraGraves,
    moraLeves: moraLeves,
    topCobradores: topCobradores,
    topClientes: topClientes,
    clientesNuevos: clientesNuevos,
    clientesTotales: clientesTotales,
    leadsWeb: leadsWeb,
    pagosMesAct: pagosMesAct,
    pagosCount: pagosMesAct.length,
    iniciales: iniciales,
    cuotas: cuotas,
    totalIniciales: totalIniciales,
    totalCuotas: totalCuotas,
    egresosMesAct: egresosMesAct,
    totalEgresos: totalEgresos,
    egresosListados: egresosListados,
    utilidad: utilidad,
    motosDisponibles: motosDisponibles,
    motosVendidas: motosVendidas,
    motosTotal: motosTotal,
    pagosPorSede: pagosPorSede,
    facturasMes: facturasMes,
    facturasAnuladas: facturasAnuladas,
    fmtUsd: fmtUsd,
    fmtFecha: fmtFecha
  };
}

function reporteMensualHtml(){
  var r = generarReporteMensual();
  if(!r) return '<p>No hay datos para generar reporte.</p>';
  var emp = (typeof getEmpresa==='function') ? getEmpresa() : {nombre:'Pagasi'};

  // Helpers para tablas
  function trEmpty(cols, msg){ return '<tr><td colspan="'+cols+'" style="padding:18px;text-align:center;color:#9ca3af;font-style:italic;font-size:12px">'+msg+'</td></tr>'; }
  function thStyle(extra){ return 'padding:10px 12px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;font-weight:800;background:#f9fafb;'+(extra||''); }
  function tdStyle(extra){ return 'padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12.5px;color:#374151;'+(extra||''); }

  // Tablas
  var trCobradores = r.topCobradores.length ? r.topCobradores.map(function(c,i){
    return '<tr><td style="'+tdStyle()+'">'+(i+1)+'</td>'
      +'<td style="'+tdStyle('font-weight:700;color:#111')+'">'+c.nombre+'</td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;color:#16a34a;font-weight:800')+'">'+r.fmtUsd(c.total)+'</td>'
      +'<td style="'+tdStyle('text-align:right;color:#9ca3af')+'">'+c.count+'</td></tr>';
  }).join('') : trEmpty(4,'Sin cobros registrados este mes');

  var trClientes = r.topClientes.length ? r.topClientes.map(function(c,i){
    return '<tr><td style="'+tdStyle()+'">'+(i+1)+'</td>'
      +'<td style="'+tdStyle('font-weight:700;color:#111')+'">'+c.nombre+'</td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;color:#16a34a;font-weight:800')+'">'+r.fmtUsd(c.total)+'</td>'
      +'<td style="'+tdStyle('text-align:right;color:#9ca3af')+'">'+c.count+'</td></tr>';
  }).join('') : trEmpty(4,'Sin clientes que hayan pagado este mes');

  var trCreditosNuevos = r.creditosNuevosArr.length ? r.creditosNuevosArr.slice(0,15).map(function(c){
    return '<tr><td style="'+tdStyle('font-family:Nunito,sans-serif;color:#6b7280')+'">'+(c.id||'—')+'</td>'
      +'<td style="'+tdStyle('font-weight:700;color:#111')+'">'+(c.cli||'—')+'</td>'
      +'<td style="'+tdStyle()+'">'+(c.modelo||'—')+'</td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;font-weight:700')+'">'+r.fmtUsd(c.precio)+'</td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;color:#2563EB;font-weight:700')+'">'+r.fmtUsd(c.cuotaQ||c.cuota||0)+'</td>'
      +'<td style="'+tdStyle('text-align:center;color:#6b7280;font-size:11.5px')+'">'+r.fmtFecha(c.fecha)+'</td></tr>';
  }).join('') : trEmpty(6,'Sin créditos nuevos este mes');

  var trMora = r.enMora.length ? r.enMora.slice(0,20).map(function(c){
    var moraColor = (c.mora||0) > 30 ? '#dc2626' : (c.mora||0) > 15 ? '#ea580c' : '#ca8a04';
    return '<tr><td style="'+tdStyle('font-family:Nunito,sans-serif;color:#6b7280')+'">'+(c.id||'—')+'</td>'
      +'<td style="'+tdStyle('font-weight:700;color:#111')+'">'+(c.cli||'—')+'</td>'
      +'<td style="'+tdStyle()+'">'+(c.modelo||'—')+'</td>'
      +'<td style="'+tdStyle('text-align:center;font-family:Nunito,sans-serif;font-weight:900;color:'+moraColor)+'">'+c.mora+'d</td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;font-weight:700')+'">'+r.fmtUsd(c.cuotaQ||c.cuota||0)+'</td></tr>';
  }).join('') : trEmpty(5,'Sin clientes en mora 🎉');

  var trIngresos = r.pagosMesAct.length ? r.pagosMesAct.slice(0,20).map(function(p){
    var tipo = (p.esInicial || p.tipoOperacion === 'inicial_credito') ? 'Inicial' : 'Cuota';
    var tipoColor = tipo === 'Inicial' ? '#2563EB' : '#16a34a';
    return '<tr><td style="'+tdStyle('color:#6b7280;font-size:11.5px')+'">'+r.fmtFecha(p.fecha)+'</td>'
      +'<td style="'+tdStyle('font-weight:700;color:#111')+'">'+(p.cli||'—')+'</td>'
      +'<td style="'+tdStyle('font-family:Nunito,sans-serif;color:#6b7280;font-size:11px')+'">'+(p.cred||'—')+'</td>'
      +'<td style="'+tdStyle()+'"><span style="background:'+tipoColor+'18;color:'+tipoColor+';padding:2px 8px;border-radius:50px;font-size:10.5px;font-weight:700">'+tipo+'</span></td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;font-weight:800;color:#16a34a')+'">+'+r.fmtUsd(p.monto)+'</td></tr>';
  }).join('') : trEmpty(5,'Sin pagos registrados este mes');

  var trEgresos = r.egresosMesAct.length ? r.egresosMesAct.slice(0,15).map(function(e){
    return '<tr><td style="'+tdStyle('color:#6b7280;font-size:11.5px')+'">'+r.fmtFecha(e.fecha)+'</td>'
      +'<td style="'+tdStyle('font-weight:700;color:#111')+'">'+(e.concepto||e.descripcion||'—')+'</td>'
      +'<td style="'+tdStyle('color:#6b7280;font-size:11.5px')+'">'+(e.categoria||'Sin categoría')+'</td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;font-weight:800;color:#dc2626')+'">-'+r.fmtUsd(e.monto)+'</td></tr>';
  }).join('') : trEmpty(4,'Sin egresos registrados este mes');

  var trEgresosCat = r.egresosListados.length ? r.egresosListados.map(function(e){
    return '<tr><td style="'+tdStyle('font-weight:700;color:#111')+'">'+e.cat+'</td>'
      +'<td style="'+tdStyle('text-align:right;color:#9ca3af')+'">'+e.count+'</td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;font-weight:800;color:#dc2626')+'">'+r.fmtUsd(e.total)+'</td></tr>';
  }).join('') : trEmpty(3,'Sin egresos');

  var trSedes = r.pagosPorSede.length ? r.pagosPorSede.map(function(s){
    return '<tr><td style="'+tdStyle('font-weight:700;color:#111')+'">'+s.sede+'</td>'
      +'<td style="'+tdStyle('text-align:right;color:#9ca3af')+'">'+s.count+'</td>'
      +'<td style="'+tdStyle('text-align:right;font-family:Nunito,sans-serif;font-weight:800;color:#16a34a')+'">'+r.fmtUsd(s.total)+'</td></tr>';
  }).join('') : trEmpty(3,'Sin pagos por sede');

  // Sección reusable
  function seccion(titulo, sub, contenido){
    return '<div style="margin-bottom:28px"><div style="display:flex;align-items:flex-end;justify-content:space-between;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-bottom:14px">'
      +'<h2 style="font-size:17px;font-weight:800;color:#111;margin:0;letter-spacing:-.3px">'+titulo+'</h2>'
      +(sub?'<div style="font-size:11px;color:#9ca3af;font-weight:600">'+sub+'</div>':'')+'</div>'
      +contenido+'</div>';
  }

  var _logoRM = (typeof _PAGASI_LOGO_BLUE!=='undefined'&&_PAGASI_LOGO_BLUE) || ((document.querySelector('.sb-logo img')||{}).src||'');
  return ''
    +'<div style="font-family:Nunito,\'Nunito Sans\',system-ui,sans-serif;max-width:880px;margin:0 auto;color:#1f2937;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.06)">'

    // Header
    +'<div style="background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 50%,#1E3A8A 100%);color:#fff;padding:38px 40px">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap">'
        +'<div>'
        +(_logoRM?'<div style="background:#fff;border-radius:10px;padding:8px 14px;display:inline-block;margin-bottom:14px;box-shadow:0 4px 12px rgba(0,0,0,.15)"><img src="'+_logoRM+'" alt="Pagasi" style="height:30px;display:block"></div>':'')
        +'<div style="font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.85;margin-bottom:8px">Reporte mensual completo</div>'
        +'<h1 style="font-size:36px;font-weight:900;margin:0;letter-spacing:-1.2px;text-transform:capitalize;line-height:1.05">'+r.mes+'</h1>'
        +'<div style="font-size:13px;opacity:.85;margin-top:10px">'+(emp.nombre||'Pagasi')+(emp.rif?' · RIF '+emp.rif:'')+' · Generado el '+new Date().toLocaleDateString('es-VE',{day:'numeric',month:'long',year:'numeric'})+' a las '+new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'})+'</div></div>'
        +'<div style="background:rgba(255,255,255,.18);backdrop-filter:blur(8px);border-radius:11px;padding:14px 18px;text-align:right;min-width:160px">'
          +'<div style="font-size:10px;font-weight:700;opacity:.85;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px">Utilidad neta</div>'
          +'<div style="font-size:26px;font-weight:900;letter-spacing:-.5px;font-family:Nunito,sans-serif;color:'+(r.utilidad>=0?'#86efac':'#fecaca')+'">'+r.fmtUsd(r.utilidad)+'</div>'
          +'<div style="font-size:10.5px;opacity:.85;margin-top:3px">Ingresos − Egresos</div>'
        +'</div>'
      +'</div>'
    +'</div>'

    // Body
    +'<div style="padding:36px 40px">'

      // ─── 1. RESUMEN EJECUTIVO ───
      +seccion('Resumen financiero','Visión general del mes',''
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">'
          +'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:11px;padding:14px"><div style="font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px">Ingresos</div><div style="font-size:24px;font-weight:900;color:#16a34a;font-family:Nunito,sans-serif">'+r.fmtUsd(r.cobradoMesAct)+'</div><div style="font-size:11px;color:#16a34a;margin-top:3px;font-weight:600">'+r.pagosCount+' pagos · '+(r.pctCrec>=0?'↑ +':'↓ ')+Math.abs(r.pctCrec)+'%</div></div>'
          +'<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:11px;padding:14px"><div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px">Egresos</div><div style="font-size:24px;font-weight:900;color:#dc2626;font-family:Nunito,sans-serif">'+r.fmtUsd(r.totalEgresos)+'</div><div style="font-size:11px;color:#dc2626;margin-top:3px;font-weight:600">'+r.egresosMesAct.length+' transacciones</div></div>'
          +'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:11px;padding:14px"><div style="font-size:10px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px">Cartera activa</div><div style="font-size:24px;font-weight:900;color:#2563EB;font-family:Nunito,sans-serif">'+r.fmtUsd(r.cartera)+'</div><div style="font-size:11px;color:#2563EB;margin-top:3px;font-weight:600">'+r.creditosActivos+' créditos activos</div></div>'
          +'<div style="background:'+(r.enMora.length>0?'#fef2f2':'#f9fafb')+';border:1px solid '+(r.enMora.length>0?'#fecaca':'#e5e7eb')+';border-radius:11px;padding:14px"><div style="font-size:10px;font-weight:700;color:'+(r.enMora.length>0?'#dc2626':'#6b7280')+';text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px">En mora</div><div style="font-size:24px;font-weight:900;color:'+(r.enMora.length>0?'#dc2626':'#6b7280')+'">'+r.enMora.length+'</div><div style="font-size:11px;color:'+(r.enMora.length>0?'#dc2626':'#6b7280')+';margin-top:3px;font-weight:600">'+r.moraGraves.length+' graves (+30d)</div></div>'
        +'</div>'

        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:12px">'
          +'<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:11px;padding:13px"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em">Créditos nuevos</div><div style="font-size:22px;font-weight:900;color:#111">'+r.creditosNuevos+'</div><div style="font-size:11px;color:#6b7280;font-weight:600">'+r.fmtUsd(r.montoCreditosNuevos)+' financiados</div></div>'
          +'<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:11px;padding:13px"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em">Clientes nuevos</div><div style="font-size:22px;font-weight:900;color:#111">'+r.clientesNuevos+'</div><div style="font-size:11px;color:#6b7280;font-weight:600">'+r.leadsWeb+' vinieron por la web</div></div>'
          +'<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:11px;padding:13px"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em">Inventario motos</div><div style="font-size:22px;font-weight:900;color:#111">'+r.motosDisponibles+'</div><div style="font-size:11px;color:#6b7280;font-weight:600">de '+r.motosTotal+' totales · '+r.motosVendidas+' vendidas</div></div>'
          +'<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:11px;padding:13px"><div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em">Facturas SENIAT</div><div style="font-size:22px;font-weight:900;color:#111">'+r.facturasMes.length+'</div><div style="font-size:11px;color:#6b7280;font-weight:600">emitidas · '+r.facturasAnuladas+' anuladas</div></div>'
        +'</div>'

        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">'
          +'<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:11px;padding:13px"><div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Desglose ingresos</div><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:6px"><span>Cuotas regulares</span><span style="font-family:Nunito,sans-serif;color:#059669">'+r.fmtUsd(r.totalCuotas)+' ('+r.cuotas.length+')</span></div><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:4px"><span>Iniciales</span><span style="font-family:Nunito,sans-serif;color:#059669">'+r.fmtUsd(r.totalIniciales)+' ('+r.iniciales.length+')</span></div></div>'
          +'<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:11px;padding:13px"><div style="font-size:10px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Cartera vs mes anterior</div><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:6px"><span>Mes actual</span><span style="font-family:Nunito,sans-serif;color:#b45309">'+r.fmtUsd(r.cobradoMesAct)+'</span></div><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:4px"><span>Mes anterior</span><span style="font-family:Nunito,sans-serif;color:#92400e">'+r.fmtUsd(r.cobradoMesAnt)+'</span></div></div>'
        +'</div>'
      )

      // ─── 2. INGRESOS DETALLADOS ───
      +seccion('Ingresos del mes', 'Pagos confirmados · '+(r.pagosMesAct.length>20?'mostrando 20 de ':'')+r.pagosMesAct.length+' pagos',''
        +'<table style="width:100%;border-collapse:collapse;background:#fff">'
          +'<thead><tr><th style="'+thStyle()+'">Fecha</th><th style="'+thStyle()+'">Cliente</th><th style="'+thStyle()+'">Crédito</th><th style="'+thStyle()+'">Tipo</th><th style="'+thStyle('text-align:right')+'">Monto</th></tr></thead>'
          +'<tbody>'+trIngresos+'</tbody>'
          +(r.pagosMesAct.length>0?'<tfoot><tr><td colspan="4" style="padding:11px 12px;border-top:2px solid #e5e7eb;font-weight:800;color:#111;font-size:13px">TOTAL INGRESOS</td><td style="padding:11px 12px;border-top:2px solid #e5e7eb;text-align:right;font-weight:900;color:#16a34a;font-family:Nunito,sans-serif;font-size:15px">'+r.fmtUsd(r.cobradoMesAct)+'</td></tr></tfoot>':'')
        +'</table>'
      )

      // ─── 3. EGRESOS DETALLADOS ───
      +seccion('Egresos del mes', 'Gastos y salidas · '+(r.egresosMesAct.length>15?'mostrando 15 de ':'')+r.egresosMesAct.length+' egresos',''
        +'<table style="width:100%;border-collapse:collapse;background:#fff;margin-bottom:14px">'
          +'<thead><tr><th style="'+thStyle()+'">Fecha</th><th style="'+thStyle()+'">Concepto</th><th style="'+thStyle()+'">Categoría</th><th style="'+thStyle('text-align:right')+'">Monto</th></tr></thead>'
          +'<tbody>'+trEgresos+'</tbody>'
          +(r.egresosMesAct.length>0?'<tfoot><tr><td colspan="3" style="padding:11px 12px;border-top:2px solid #e5e7eb;font-weight:800;color:#111;font-size:13px">TOTAL EGRESOS</td><td style="padding:11px 12px;border-top:2px solid #e5e7eb;text-align:right;font-weight:900;color:#dc2626;font-family:Nunito,sans-serif;font-size:15px">-'+r.fmtUsd(r.totalEgresos)+'</td></tr></tfoot>':'')
        +'</table>'
        +(r.egresosListados.length?'<div style="background:#f9fafb;border-radius:10px;padding:14px;margin-top:8px"><div style="font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Egresos por categoría</div><table style="width:100%;border-collapse:collapse"><thead><tr><th style="'+thStyle()+'">Categoría</th><th style="'+thStyle('text-align:right')+'">#</th><th style="'+thStyle('text-align:right')+'">Total</th></tr></thead><tbody>'+trEgresosCat+'</tbody></table></div>':'')
      )

      // ─── 4. CRÉDITOS NUEVOS ───
      +seccion('Créditos nuevos otorgados', 'Solicitudes aprobadas en '+r.mes.toLowerCase()+' · '+(r.creditosNuevosArr.length>15?'mostrando 15 de ':'')+r.creditosNuevosArr.length,''
        +'<table style="width:100%;border-collapse:collapse">'
          +'<thead><tr><th style="'+thStyle()+'">Crédito</th><th style="'+thStyle()+'">Cliente</th><th style="'+thStyle()+'">Modelo</th><th style="'+thStyle('text-align:right')+'">Precio</th><th style="'+thStyle('text-align:right')+'">Cuota Q.</th><th style="'+thStyle('text-align:center')+'">Inicio</th></tr></thead>'
          +'<tbody>'+trCreditosNuevos+'</tbody>'
        +'</table>'
      )

      // ─── 5. CARTERA EN MORA ───
      +seccion('Cartera en mora', r.enMora.length+' clientes · '+r.moraGraves.length+' graves (+30d)',''
        +'<table style="width:100%;border-collapse:collapse">'
          +'<thead><tr><th style="'+thStyle()+'">Crédito</th><th style="'+thStyle()+'">Cliente</th><th style="'+thStyle()+'">Modelo</th><th style="'+thStyle('text-align:center')+'">Mora</th><th style="'+thStyle('text-align:right')+'">Cuota</th></tr></thead>'
          +'<tbody>'+trMora+'</tbody>'
        +'</table>'
      )

      // ─── 6. TOP COBRADORES ───
      +seccion('Top cobradores', 'Ranking del equipo en '+r.mes.toLowerCase(),''
        +'<table style="width:100%;border-collapse:collapse">'
          +'<thead><tr><th style="'+thStyle('width:40px')+'">#</th><th style="'+thStyle()+'">Cobrador</th><th style="'+thStyle('text-align:right')+'">Cobrado</th><th style="'+thStyle('text-align:right')+'"># Pagos</th></tr></thead>'
          +'<tbody>'+trCobradores+'</tbody>'
        +'</table>'
      )

      // ─── 7. TOP CLIENTES ───
      +seccion('Top 10 clientes (más pagaron)', 'Quiénes aportaron más este mes',''
        +'<table style="width:100%;border-collapse:collapse">'
          +'<thead><tr><th style="'+thStyle('width:40px')+'">#</th><th style="'+thStyle()+'">Cliente</th><th style="'+thStyle('text-align:right')+'">Aportado</th><th style="'+thStyle('text-align:right')+'"># Pagos</th></tr></thead>'
          +'<tbody>'+trClientes+'</tbody>'
        +'</table>'
      )

      // ─── 8. POR SEDE ───
      +(r.pagosPorSede.length>1 ? seccion('Cobranza por sede', 'Distribución del cobro por concesionario',''
        +'<table style="width:100%;border-collapse:collapse">'
          +'<thead><tr><th style="'+thStyle()+'">Sede</th><th style="'+thStyle('text-align:right')+'"># Pagos</th><th style="'+thStyle('text-align:right')+'">Total</th></tr></thead>'
          +'<tbody>'+trSedes+'</tbody>'
        +'</table>'
      ) : '')

      +'<div style="background:linear-gradient(135deg,#f9fafb,#eff6ff);border-radius:11px;padding:18px;margin-top:24px;border:1px solid #e5e7eb"><div style="font-size:11px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">Notas del reporte</div><div style="font-size:12px;color:#6b7280;line-height:1.7">Este reporte se genera automáticamente desde el admin Pagasi V2 con datos en tiempo real de Firestore. Las tablas detalladas se limitan a los primeros registros más relevantes. Para análisis completo, exporta los datos crudos desde cada módulo. El reporte refleja datos del concesionario activo en el filtro de sede.</div></div>'

    +'</div>'

    +'<div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px">'+
      (emp.nombre||'Pagasi')+' · Sistema Pagasi V2 · '+new Date().toLocaleDateString('es-VE',{day:'numeric',month:'long',year:'numeric'})+'</div>'
  +'</div>';
}

function reporteMensualAbrir(){
  var win = window.open('', '_blank');
  if(!win){ if(typeof toast==='function') toast('Habilita popups para ver el reporte','error'); return; }
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte mensual</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">'
    +'<style>*{-webkit-print-color-adjust:exact;print-color-adjust:exact}@media print{body{background:#fff!important;padding:0!important}button{display:none!important}}</style>'
    +'</head><body style="background:#f3f4f6;padding:24px 0;margin:0;font-family:Nunito,system-ui,sans-serif">'
    +reporteMensualHtml()
    +'<div style="max-width:680px;margin:18px auto 0;text-align:center;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;font-family:Nunito,system-ui,sans-serif">'
      +'<button onclick="window.print()" style="background:#2563EB;color:#fff;border:none;padding:12px 24px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px">Imprimir / PDF</button>'
      +'<button onclick="window.close()" style="background:#fff;color:#374151;border:1px solid #d1d5db;padding:12px 24px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px">Cerrar</button>'
    +'</div>'
    +'</body></html>';
  win.document.write(html);
  win.document.close();
}

function reporteMensualEnviarEmail(){
  var r = generarReporteMensual();
  if(!r){ if(typeof toast==='function') toast('Sin datos para reporte','error'); return; }
  var emp = (typeof getEmpresa==='function') ? getEmpresa() : {nombre:'Pagasi',email:''};
  var emailDest = prompt('¿A qué email enviar el reporte de '+r.mes+'?', emp.email || '');
  if(!emailDest) return;

  var subject = 'Reporte mensual Pagasi — ' + r.mes;
  var body = '═══════════════════════════════════════\n'
    + 'REPORTE MENSUAL · ' + r.mes.toUpperCase() + '\n'
    + (emp.nombre || 'Pagasi') + '\n'
    + '═══════════════════════════════════════\n\n'
    + 'RESUMEN FINANCIERO\n'
    + '──────────────────\n'
    + 'Cobrado este mes:    ' + r.fmtUsd(r.cobradoMesAct) + ' (' + r.pagosCount + ' pagos)\n'
    + 'Mes anterior:        ' + r.fmtUsd(r.cobradoMesAnt) + '\n'
    + 'Crecimiento:         ' + (r.pctCrec>=0?'+':'') + r.pctCrec + '%\n'
    + 'Cartera activa:      ' + r.fmtUsd(r.cartera) + '\n'
    + 'Créditos activos:    ' + r.creditosActivos + '\n\n'
    + 'COBRANZA\n'
    + '────────\n'
    + 'Clientes en mora:    ' + r.enMora + '\n'
    + 'Mora grave (+30d):   ' + r.moraGraves + '\n\n'
    + 'CRECIMIENTO\n'
    + '───────────\n'
    + 'Créditos nuevos:     ' + r.creditosNuevos + '\n'
    + 'Clientes nuevos:     ' + r.clientesNuevos + '\n'
    + 'Leads web:           ' + r.leadsWeb + '\n\n'
    + 'TOP COBRADORES\n'
    + '──────────────\n'
    + (r.topCobradores.length
        ? r.topCobradores.map(function(c,i){ return (i+1) + '. ' + c.nombre + ' — ' + r.fmtUsd(c.total) + ' (' + c.count + ' pagos)'; }).join('\n')
        : 'Sin cobros este mes')
    + '\n\n'
    + '───────────────────────────────────────\n'
    + 'Generado: ' + new Date().toLocaleString('es-VE') + '\n'
    + 'Sistema: Pagasi V2 · https://pagasi.io';

  var mailto = 'mailto:' + encodeURIComponent(emailDest)
    + '?subject=' + encodeURIComponent(subject)
    + '&body=' + encodeURIComponent(body);
  window.location.href = mailto;
}

// ══════════════════════════════════════════════════════════════
// REPORTES PERIÓDICOS — diario · semanal · quincenal · mensual · anual
// + búsqueda por día / mes / rango específico
// Documento confidencial profesional: logo azul + marca de agua + Nunito
// ══════════════════════════════════════════════════════════════
var _PAGASI_LOGO_BLUE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA7sAAAEACAYAAAByCGFpAAAQAElEQVR4Aey9B4BdV3Xu/1vn3DJV0kgz6rZly5aL3Bs2GBdsXMBgMDaYmGKaqOYFkpC8FFAKaf+8kPd4L8V5L0CABOJACKFD6ARwAQxuuMq2em9T7z1n/791RrIlWWU0mpl7R9p79p7T917722vvs769zjk34a3rr+Mt68/jVzdN48aQEkNEICIQEYgIRAQiAhGBiEBEICIQEYgIRAQmOQIJIXs+Fl5EX3YinevbWBqSSV6nQxQ/Xh4RiAhEBCICEYGIQEQgIhARiAhEBCICkx0BEdvkTIzLsexFVGuLWLsuEt7J3qpjLX/MLyIQEYgIRAQiAhGBiEBEICIQEYgITDIEEgizCOF4QvJi8vSl1C0S3knWiFHciUcglhgRiAhEBCICEYGIQEQgIhARiAg0NwIJZmWMdiycUBBeEOnlhOjhbe6Gi9JFBJoMgShORCAiEBGICEQEIgIRgYhARKCpEEggbwURXmgHThTpfSnBXhI9vELjkGKw4oNfxTvQWj+kvOLFEYGIwORDIEocEYgIRAQiAhGBiEBEICLQSAREdtn5BWathzYR3ZPk6b2OJH8pefTwjq5xRG6XrGqla9M8Vq/p5sb7yqPLJ14VEYgIRAQOIwRiVSICEYGIQEQgIhARiAhMIAIiuEVpw0tDSye8/kiz+ePM1zAUjuPRNa0UHkpiGAkCSygRyvOh/hJCcjFds2YUXt6RXBvPiQhEBCICEYEjBoFY0YhARCAiEBGICEQExg8BkVsyZZ8rDUcT4Q3FI82LMHspqV2jrWNZuaolEl5GFurrW0RyjxF+F4NdLm/5fNqXRe8uMUQEIgIRgYhARGC/CMSDEYGIQEQgIhARGDMEEhGxIQgB/9uZrYnwIopLOFn7r4P0KpLkuOjh5cDhxpBSaZ9Ckp0sXE8QtGdg4QwqHV1E7zgxRAQiAhGBiEBEICJwMAjEcyMCEYGIQERgtAi4Z7dPF7t3V4vdor/L2w52CoTrCenVtHJcJLzsP3SRkGyegrEIrAeQhzd/PnlyDFuWV7UdY0QgIhARiAhEBCICEYGIwGgRiNdFBCICEYERIiCya+t0rry7+v/smMor2UFui+WhvJ7ErqFqC+PPEj0bqKf3VB9JhFcn2DGaJBDptS6tn04SzqVu8d1dYogIRAQiAhGBiEBEICIQERhLBGJeEYGIwN4RSLB8BVi/PJGBvYdhwmssJkteQcleQvxK896R8r2bO0sEE9kNTnKrmiSQN9fmY+H5DFWOo2ddq58WU0QgIhARiAhEBCICEYGIQEQgIjAuCMRMIwIFAon+L1PqJYjCamUfMdXxDhHiU8jt5SJwL6OWnMzDGzviV4Z3Qczfye2uVcnTngKvEBJhlugMkV9OJU+eR8hnsiSUtS/GiEBEICIQEYgIRAQiAhGBiEBEICIwAQgcmUX4I7dPQOjDbF+e3WFkDJG20AacSLDrtPUKOuqLmbe5MxJeoeLxPoy6CaNkltZ28eCGCoT5pOEF5KXTSJ/swImxXxNTRCAiEBGICEQEIgIRgYhARCAiEBGICIw5AglJuhJsGxQ/QaTFM/FZayaKiwivcTyEawncSH/tdLqfnBIJL8OhXqpg+TRItHS8it2m/23C60Qdu4LQuoBlyyraF2NEICIQEYgIRAQiAhGBiEBEICIQEYgIjAMC8uyyVfluEhHzj1Tt37urE+WxTHRuq8jusZi9GOzV1DrOpWtVF5eGEod32H/tukjIW1Nw7+6zsBA2wR9vvoBgz6Gz3H3E40UMEYGIQEQgIhARiAhEBCICEYGIQERgfBBIsNo2kVZ/lLlXReRKB44mUgcivHYM2NWk9dcQys/llJVzuPXhKmJzHKkhHzIsK+21+gH35h5LCFdQKy/mzM0dk98jvteaxp0RgYhARCAiEBGICEQEIgIRgYhARKChCCSUss3k+aMivFvZ/0eq2COYSK3IW5hLsCuw/E3UK1cxMO0Ylqxq5Uh9J9VqmkBISyK0yR54gfkkgXVidiaBKxnsXyiP+JE9OcBhGGKVIgIRgYhARCAiEBGICEQEIgIRgYYjkLClZQvYoyJnm0TC6hxcMAgVjJlY8lwtbyblxZRKi+KXmoXGXrEMZWE2m5BcQihfTN42ixvv0769nhx3RgQOCwRiJSICEYGIQEQgIhARiAhEBCICE41AwvSNgwRbK2q2SoUPKB34vV2dtEcsicB1EThLpPlXyJKbmJKdUXy46kh7jzeUc0JWxyzbA6Odm5ogoAXjOOF1BWn9dGZO64yPM++EJy4jAkcEArGSEYGIQEQgIhARiAhEBCIC44xAwuDxOUl5MyQPQ75N5Y3svV2duEdMIXRq38laXkdmryHveA6nrp95xLzH+5Doa17JMdOkQZ4Li33FVJMCHZCfquVVZOlCWta0QLB9XRD3RwQiAhGBwxuBWLuIQEQgIhARiAhEBCICY4tAwlwyKn2bCfkD4lr+VeZ81EUYCcE/XBUWYPnVIm9voh6upN624Ih4j9e/tdzSWyNPNGmQ1BAASnuPRhlsJhYu1PmXUGmdEx9nJoaIQEQgIhAR2IlAXEYEIgIRgYhARCAicEgIJCy1nMHQS5I9IeK1AWNkP0HEPoKJ8EKVYHMI4RItX0dWeikpJ7NyU+dh/7hu75RBkrAJGCToTyv7jIEKwY4V5ldTGjqPqT1dhz0++wQjHogIRAQiAhGBiMD+EYhHIwIRgYhARCAicDAIDH8xeNPGOrltAHtC5KuPA5E0DhhMBK4s8jxdeZ2N2avJ01/Bhs5lxpoZLAllOT3tgLlMthMWq7atGwYhWa+1ftU77LcKpokBC+1gi8l5CZaeRtemjkh4iSEiEBGICEQEIgIRgQMjEM+ICEQEIgIRgf0gMEx2Fy+uQ7pe5PROjLU6f18fV9Khg4qpSG0n2EmQXIfZG7W8lHTNUbxneQuH288TuZc8K8ujm63D2AZBuHKgUBIxnq7zn0OaXydv+GIqG9sj4T0QbPF4RCAiEBGICEQEIgIRgT0RiNsRgYhAROAZBIbJrpM0aluw/H4RtOVg8k4yNsHkvSS0iMQdTbAXEHgjIb2OgfQU/LHm4mvNwThcgnvJC6LrkwbCMchne6C6GWWR3Tk4PqXsWjqzhcUHqw63yYAD4RCPRwQiAhGBiEBEICIQEYgIjC0CMbeIwBGMwDDZLQCYUyNvWwn2c2CD0lh5d5WVqJwTOujWxnOUXlM81pyH84uvNd+yrMrhQuy6FgdCdbuI6zLVs1c13/+jzDqpiCFUIRxD4ApNBlxGRzafLcu1rzga/0UEIgIRgYhARCAiEBGICEQEIgJjgEDM4shB4Bmyext1ks3r5YG9U6RLpJex8+4+g6c/sjtFhO5kQvIySuEt1LJrKLcs5Mn17RwOhHcuGdnAVqz+kLDcrLqO7OvWRgK0kNsiXfdS8splbOuczY33VrQ/xohARCAiEBGICEQEIgIRgYhARCAiMB4IHLZ5OsHaUTkLlIb6wB6VN/JBLeWdZGREjYMI5qQutEA4SqTuMkjeQJLeRDmcxcpV0yf9x6uWWk6SbSOkj2G2HsO/bs0IQ4qFDmFzmtL1lOvPY8ZxPRSPeo8wh3haRCAiEBGICEQEIgIRgYhARCAiEBGICDjx3AWFGcfXqLAa7A4IK/ZL1DikYMq7LLI7nWBngN2o8t6ElS6FtUfz2jVtTGov75waZO4lfww42EkDJ7xTQLhk+cvI+87jtNVd3BhSYogIRAQiAhGBiEBEICIQEYgIRAQiAhGBESGwi2dX57tXsjywCfJ7yG38vLsqqogmsm3+0zscK9L7QszeClxPm53O6jXdw4/wBtO+SRGfFnIT8u5O2Qj2CyXhScbBhZImArqEx/kY1zFYOpX4k0QHh2A8OyIQEYgIRAQiAhGBiEBEICIQETiiEdid7DoUy+cPkdaXi2TdIcK1UsuDeQzXczjYJDIbKiqnR+WJ3Nlrwd5CSC+na/pxvGNd+6Tzat4usjvUu5UkfwDkKT+4R5l1iaJR1v+ZhPwiknAdVjuFyqT7SSJVIcaIQEQgIhARiAhEBCICEYGIQEQgIjDxCDyb7N5uGXXbQEjuALsH2EIQedPKOEd5M+lQGScoXaP0Nix9NSE7h/beHm59uMqkebTZAqXuAbJckwbhXgibVZ9M6SCjTwLYPIJdgdlL6cgX0bl+kj/ifZAQHHanxwpFBCICEYGIQEQgIhARiAhEBCICE4HAs8mul7ppziCWP45l3wFbJqI1yEQEw+Xxn9uRl5ezIXkVIVlCpe8qhjqGv9hcvLs6CR5tnktGC2ux5Meqg78HPRoPuTH8k0QLCFyldA2VcDxr17UxaYg/MUQE9o9APBoRiAhEBCICEYGIQEQgIhARGAcEnFw+O1v37g5t3wR2FxZ+BKxXqitNRDQVkqrcdi2PFVF0r+abRBpfSbV+NrPWz+KWSfC7vEstZzD0ivI+jPEIhD7VJygdXDQSkdxW4HiS8BKtv7hYj4RXMMQYETg8EYi1ighEBCICEYGIQEQgInB4IxAMd965I3NJKLNn8l+j8WN+jid0/igA2TvZ9YwWLBgiGXiSzL4J+cPa1a908GRNF40yivSGijyb3QTOEul9FXnp7WRcS1v7Sax5cmoBCqOr+ChlOrjL3ENeGvT3nn8MtkapxmiCFYS3ndxOxnhpgUEWFvLomlaKxieGiEBEICJwOCMQ6xYRiAhEBCICEYGIwGRHwHmLE1h/PdW/y7R8bQ8zV83Hti6gtOp4bPUJxZJVC1m09hi6Ns3Dz9m8eQrvWd5SfLzYrz8I/rdvsrvUcrKjt5NU/CNL3xe2q8BGR9Y4hGAiesNfbD6OwAtEft9MPbyOUH0e6Zqj8J8pOshKM1HBPeTb0o1Y/SeE/BHJ36+iRzdhYKitQpvyOJHc5OFNr6HN4iPNxBARiAhEBI5EBGKdIwIRgYhARCAiMBkQCMMe3Fseb2HL8ml0rzmGwWmLGUovJA3XkpVeA0Nv0fJdcm6+m3r5VvHPt5Pam8ShXl2cM5BdxkD1XHpmnlKQ45s3dhbE18kzyn8/MIhA7efobSK3taHVKvjbWHIPhG06exQfWtJVhxaHvbyEGQQWQ3I9wd5JvfQq2sN5zF4xB2f7RYUPraAxv3pg1gCBJyD9IRbWaH30j4ObE17aScLJhPBytctLyTkhvsNLDBGBiEBEICJwpCMQ6x8RiAhEBCICzYWAc7NbllVZvaabSscp9FYvJ7fXiw/9Omn+24TkVwn2Bgl9k9L1mF0nvvRy8vwG8nAzgTeLQ71H679DZh8gC78uUvwa2vPnM6N7ERtWz8Dz93KUwd5isredu+17rLuf6uDDIlffxHhMxwaURued1IWHFK0ge60CYR4huVDL15Kn72Kwch3bW08tKuxu8f1UmIkO7t1N0vWambgT7BFhOHrvLkVI1fDtBeH1d3hzu5a6LYqEt8Am/osIRAQiAhGBiEBEYAcCcRERiAhEBBqGm9wBxwAAEABJREFUgL9zu3nzFEpti8iTa8Rd3o3Zr0H6Oq1fKSfq+ZLtRC2PUZqr9Z6nkzELbB7GAnHQRVqeKt53AdjV5Nyi7feRp++gVr6aSusJPLyxg+JJX54VDkx2v211ttVE1sKPVdj3CDb6d0+fVfyodpiuKgmUTlV0odKlJPZGAfBmaqUr6Z9yIis3deIAS1idO4ExGE60Pe1a6v09AyQ8TuAO7T50/Ey5BXl4/R1euA7yl2m246SiofcsmxgiAhGBiEBEICIQEYgIRASACEJEICIw7giID914b4WT+mcxOHChWIuT07cRuBrCGZAfpfUuidEqHlfWUryOVMu9pdLwOcF/raetuM5YAOFcLH8p5G/D0tfSUTuPGWtmDH/Pid3Cgcmun75gwRB56TG5jb8C4afatVWpEY8zq9gd0QQd/gErulTxkyXXtSLj76KUvgmyizhp9Xwm+n3eG+8rs3LVdPx59CXBG48i+ISBJWvJ7Xtg90ne7Uo5hxKsqH8bcCJmL8HCy+moLy6I/j5mNnTuER6DFbM+jk+cFDjCdSFWPyIQEYgIRAQiAhEBiBhEBMYSAdnatyyrMuWoo8m2XyX++A6MVwCnK3UrtSil2ucc1B2Y2hxxtB3XlXRFK9hs8akzxP9eLi/vm6D8fKorZu1JeBNGEpZazkNdvbTkImr2VRGrh3RZ4x5nVuFPRytIX4sqPwsEpL/LauFWQukG2itnMqN/NhPxPq8TqKk9XVj1XPra5JZf303hXZZUHgvvbvIIJN8Tfisk75DvPqRkRd01y2HHk6PZDW7QnlOZt7mzIHXE8DQCTm6XrGqla/1M/KtvT65vx/c9fUJciQhEBCICEYGIQEQgIhAROOIRiACMHgF3/LW2ziUdvIok3AzhQjB/RFnklJSxC6asPL82zI4Wt7qUkL+GgepFsDsHGxnZVW4U3snNG0izH4pFf5NgTwKDSs0Qd1ZYQIY5ku0CQng91N4BvdfS17KY1Wu6Gc/3eddhVLMWeZVPINSvIE9O5eQnnyGdjh8D66H+Q0juFmiblUb/sSpdXEQTvSWooTlO+V5NqF3PYO00up+cEgkvw8EnIvydASufQuBa6qWXktaPZsMj8r4HGz4p/o8IRAQiAhGBiEBEICIQEYgIRAT2RGBE2+7kc8dfSC8U+bwW7AxgGuCe2PGyt5VvqIiF9Yj7nU/Cy2Xjn7krB0skwMjjh48fIkmWiZd/VRcNv78bqGm9WaIq7ICGTsxOEOF8oSr+Zgkn13b6QmqdJ7DmyanFp6oZY5IjiKm1BDVuK8ZZlDJ5WltPpWvTMy9Mb5ozSCV/RDJ9HexBoF8pKB1aNDVtoAU4lpBcQz25kVA5IxJetbE/Tu7P8A/l56ttXi+kXk1uZ5CmFVYPCntTEnIxjiECwt295j7oOf4+yXSkJX9XxevuySdbHA9PYz3ujGGrxawiAhGBiEBEICIQEYgIjA4B2X7HrW+lnJ9ExovBzgSmKrn3VYtxj06oeyC/gKz0MvKWk2hZ49xIpv9BlS1isK6nn9B/n1jz50jsDsw2KYs9PJTa08hoJOAvMocZYIshfwk5byOkrydrv4RpsxbwjnXtuBGKGocxCqX+QEhysB6Vdyl5eBlWO4XKxuGy/MvMqzdsIR26e5jwsgxsiLEIVtS5BWMBSX6ViP5N5NWzmbli2nA9OcKC2vWWZVWS1fPUJpdRy29RU18jXVhIYil5XqdrcTjCQBnH6gpvJ3NO7vxxcX+SYuHWBdjaUxjoOp3+6WcxNOVsBqafU6TajHMZy7Qz35Esx6rcnWV5vbx+nmodZzA07bTid+DC6kWYMOjaNI/la3uKiTb/jsAtj7ewJJSLNNZj0Di2cMw6IhARiAhEBCICEYGIwF4R8MeXq0NzRTQvJeFssOngDkj9n6holMFmyrl1oZYX0x56kOMl4WCDE7YHjt5GWrpHl/4HgV9ouV2psR+skgDPiobqF1rwF5gtnAX5KwXAu0UGb2YoOb/4fV43zMfK4OybWlMZfSovEek8mmBXQnod7fnx9KxrxcnA7YtrbE+XS45v6Rz/wvUGYKwmCwy8vhwNyQuh9Bry9Hy6VnUdUYTXcX7P8hYq1QXC4Cq1w+uF96XCZp7WS5po6KcksivgYxwDBLz/ON5OcG31CaR2HiF5MaXam7X8dfW3D2hy7IPSyT/V+p+QZH9OqP/ZmCbL/4yRprEq28tL8j8t6pXWP1jUMaR/JETfT2a/RZr+KgwtIeQ3Y8lLyVsvp1p+LtW2s4pJgIIIr5/JzRs7uWUHAXYspaTEEBGICEQEIgIRgYhARGBSIBCM7s52QvUU2WIXy96eqyTi2RDhq2DzlZ5HXjqWU9a1JIwm+Puna9asp1b+oSrzeWXxoFIvgVzLZosmgVKlNjCRHc7T8tWk+bsYrFwv7+fptPf24F5AJ0mMMixW7ds312TUbiEEJ68VkdljtX4FiPTW82NZu66Npdo7MGuA4nFmvqEt/+jXWGLn9a0q33mQvUAzLL+CfzSrCQkv4xGWhoQty6sMpiK65avVKq/CwvnCo0fFlTDLlLYy2F7TdoyHgoBjfevDVaau7S7ei3eCS/oOTbD8jnD/VenfqzGuBjTw2QUaK84fTnYujHEy9euRprEq28sjaDyRfuH188RzVcdLVP8XKr0EuIkkvEnTbv9N678tov/7YB8AfqMgwtgr6KxdjBNg9wT7B/WKp07urRQTVI6xTo4xIhARiAhEBCICEYGIQFMisEQe3HpbjzjPhYRkoWRsVXI+osWERy9XnA+X4wysPmN0ZNfldg/llK0rSPJvavOLBHsYrI9AMxJeFLzyKRbawY4h2CUyxN9AKXsb5b4X0dJ+skjStOJ93tEYmEsJhMqgvFWbZNgOqQwvr0XlLVJ6GSRu+B5fEN7FOtcfZ65X79Z5X9PxxzEby499GRIGktkYqmf9tVB+DrNXT0fufA67oBkllLzdnOj2psdQL1+lavqnzv2dgWlaL6EWgjAgvNfRtm2ATU2nqxJzkkTH2r9oPdSxkFJ6pQa4t0vydxB4OcEu1PrJFJNLwR9j6QB84GvRUql4xaCqtjgMEqpPkbx+nnyA7VTdphHo0XKOksabsAhsMcZZBHue1n0S4Cbp4jvJ0t/T9gew0rvJ+m+A9LlM7zm5+Gr45s1Tig/rRY8vMUQEIgIRgYhARCAi0IwIrCpTqs+B/DTZNW73pQ2VMgR5lcMMAqeKD/QkoxfGAlPnD9LL4yT1L6uCX4LwGEY/oalJhEnOitI01f0kyXo1iS3R+hvpb7uMrunHsXJTJ0sKoHSujowoCo++Xnl0U/8NXZHdEHRZqvxFrsMpJLyMzF4qMnwiD2/sYN3inKH+VeT2HWH2fcmzWueOpbdRsgfVk1nK9xLgNQyULmTR+p6C0GtHc0eRVzfwvR08+Qd/3Iu4Z7rl8Zbi95T9cXTHta90LJSuVN1eoQ53qnCdovXhTmdqo0AfOcKdfhYLGR2M8SAR8HbxPpImGtSSV5KHJdLhFzFM5mYJ93Zta6Ah1TIB/R9OHHyYNFeovz1dT9NaUiSEAZrxNIRH8P7YUuAT6JJuztEkwUKNDWfgBNjCSzV5+Hay/HcJya9TK91Mf3YJtamnMGv9LFzHfbLKJxomDSxR0IhARCAiEBGICEQEDlsE3CbJ005yO162zFywKmA0MpgsK+jQ/4WSaX7CoYSllrNwVj9bqw/LSPsCZv6V5slAeMEEAXiDdMvoPE1gvIyQv5uk9HrSweeSbT2GN67vwI1LHWQkobMesGwAwjZdIi8veVFOoJ3cTtb+l0HpFUzJzuCkNdPpruV09D9KPf28zv+xzt2oYkSY9X/MogzsYDOx/Pkk9loClzDjuB2ENzRWGXeto3cWJ1FLNMlwiwjszRs7CwPf32vM155M16xTn/7Q0cAuHzmqtp9Pi0i8e647hi4ilF+K2Q1YOFXZdyqlSjtjIGFIG1vorw6xlEAMB4eAt1H3k1PI83NIsptFyhzrM5RJD4QWLR3v5tErCdSE0TBpIiLCVpDgqvS1HeghhOO0PFfH3fP7Bm3/ujB+N0N2vTy/5+If/dosb69P/nifoYn6sASPMSIQEYgIRAQiAhGBIwiBb8ueCS2dWCL7xabKFkybovaBCoFZ4mVnJYcs0FIR3qHpvWyrPEiWfJaQyMvL5CC8yKR0g7N4xDLMUQOdI2BeRZb+KqWB15IkF3DymqML0utGPsHYXxg8Pie0bdJpd8t4fRizLfhPMxmmvNt06SJ5d19Gxi3C6TLcCzmQi4Dl96qsf9W59wDblTKlsYtGGSe85Bdh+avJep9P19zZ3PpIRXJJtrErauQ5CUs31pfsILdrnpyKf7U2WXMi5Sln05ZfylC4Af/ATyIvl4XfIQlLi48A+YeBPOXZnwrZP1EdPjicSu9X/d6gdX90uVOypEq7x9wGMU1G5NvlRbew+8G4tV8EvL0qGzVx03oaaXYTmD8qfhxBkzmIuGkHMYwWAdOFqfTZPcAtIrnTtb5Aunq29Fle8/ytOv4+TcTdUnh7u7pPxD8IdsuyKt4uOngkx1j3iEBEICIQEYgIRAQagMAiWSs20Ca7Zb7W2mUTuj3TAEH2KNJEwi10gZ1z6GQXBf9CsxPefu4nt3/DCW/gUZr7HV52Cd4wqbadkB6lxroAkptJ6+8V8X0t5ez8goj5z4bsj/TeRl3G6Cqwz5KnnwC+r7yWabkNs7qWLVg4VsurhdHbsfRmah3nkmathKEHwL4sJdGSPtCa/o1ZNBFe6MZE4JPwGkL9Cvp75k444XXD3Anuzq/3hvXHUppyJnn7ZVhdRDz9VZL676nevyPM3q7lTRjXaPkCQfJ8/ENAxnnaN5yCnSN1PgOzs4EzhdqxSu1AqrRrFLENaoPQh3vf3Qu/69G4fmAEli2r0JktBHuJ0iVqj3lK0mm1ADGMIQKGFZiWAI0NQf3WFmn9+eq/NwvzX9PybYTS1VTbTjykbw0o0xgPSwRipSICEYGIQEQgIjD+CFQfSUgT96JOk31Skf1i41/oCEoIkgREwjlmbMiul7mT8Ob5fdr8rKjGF0XsHldR/SIfufZNhugNVJKgnZqhOJqQXKg6yLhMb9XyBtorZxY/V7RP0muBmT19tA88gNm/kdlfKa9/BPu+FOAJoBdZqTom4zU/m5xXkubvJEtfqt0i2dmjJHwHWA0mzyNjHVS3MEOZXkBqr8aGLmNwynzcO0Qw7R+nqLx9ksDft92yfBr+aPJg9Rzy5BrV9y3C4LfJw28SeLO8t9cSkou0PF1tIGIlj3sI03VsioTrUGoVltV9JqOMKVf2CEE5QIZZP1k57HE0bh4IAW+/llkz1CYXqi+I6CKii9qBcdSbAwl1RBw3IaxxOlRU207Ij4JwjtJ1hFyEN7mFvtZLi28N+AfDvJ1Qf9PJMUYEIgK7IhDXIwIRgYhARGB8EMjd9paNbuXxyX8Uubr1hOSRdwAc49MAABAASURBVDcZxeX7vsQJ79HdvfTaA9TSz4N9BXiMyePhZUdwiNRgQaSXBTIsZdznbyRktxY/V9RSPgP/iZAlq1qLnwfZ1bhcajkfmj/Apq4VVPI7SPJ/Esf6SxmsHwP7LgUeoQ+sgpkINc9X/m8SwXun9l2K4URsO5Ap+boWYxpT5TZNpZxDEm4WLbyS6vSjxofwBivwcZy61s+kNvUU+qtXQO1NZPY+1fW/SZZXqf6XSJbTtb1AcvWITLlntkXbagNSLZMiof/DiYMO3qLBEuXfIU/6dAZntOBe5oPO6Ai9oGuViO2A2id5PrmpT9AiJEwpxolDwPFOVVwr2Gz1Bu8zr4BwK1ZSX7bz6Fk5F39qIuo2MUQEIgIHQCAejghEBCICh4rAtpJsE5O9brITxSqQdUJTBMkV5HFOpiZjLs5Sy/FHmt3DG+wzIhefF3l5mMlHeCWyGs0oqw7uVTxBRuUVasI3Q/4u8r6Xk1dPp72359nGpQWc+P91Ty8PzHpS7v0fU6/8k/L5S3lj/kEZy9PLMm33K792peMhPJ+QvIIcGa8cq+0KoIZiPEKq/FWn5CyV+Ups4ArKHUePOeH1d4Jnr5hD0nKWanKdKvIO1e9XxeNfrfIvATtFy7lAp5KTp5LOc50cj3orz6COGI7BTOR68ESe9oSp9Bj3jYB7C5NpXeT1c9SXFyt5e0mH9n1JPDKuCEiXcfzbiv4TOFelvUp73k69/HIG0lPYvHkKl4YSBD9Xh2OMCEQEIgIRgQMhEI9HBCICB4OAbIxKNSFLZG/ICjmYSyfm3FQ2a6sTi7Evzomee3jr4X7S+r/J3lLifoydHsuxL3M8czSRXoJmB+gCW6StF0L+ZkrZ2yj3vagwLleuml78HuZuHhULfNvqOOl9ZOpT9Gd3QPnTBOTpzf9BDfB9QngKqGlfO4S5Wvo7pyKi4640qcrzcs4gT18lWV5Ipbrg2cRd0o0mOkHqnzKNoao81/W3YLxFdbsWszPB5lEQXCefRT1N2+MfjRLGXDJeRChfT5IsZt7mzsL7PP6lT+IS7kupb5sh7NR2zFQ7ViZxZQ4n0b3fpOq7GjvsGPXnS8FeRyi9lv78Ak7qn4W/orDbmEQMEYGIQEQgIhARGCkC8byIwKRHIBm3Giy1HCe8Vvolln+eNHcv730qb5uSP6KrxSSLJpqLCJq/Q2qcSLBrtOftMi7fhpVfyGDnosKj4h9g0kGeDjZMej8+q694vLkU7iTNPg35hzD7uNKPsbAWEw1D5M+UKxMSUghTVPbpmInwVl/EYLqALcur2m9jIoGpLjkdgmM6ME35toDqCMbEByPQopKPJ+QvJqm/ksGBM/Cf0nFyPvHyTIISg9E5q0qlNBtsIdAp/MZv3FABMR40AupLPhkXpqttTiEk10H+VvLea2irHsuja1qJhPegQY0XRAQiAhGBiEBE4NkIxD3PIGCBam9GOa9pX/Nxu0AOVh+90erkwH/rcX+Pyi0V4fUPNvWFR8jyL6rAf4HwE2AzUFeanNFE4KBKCN1giwXli0UY30VSejP9g88n23oMb1zfwbOwkVK419s9vWvnLCdNfkzIP0nI/hck/yEipokBtjKMTdByImKKE17CaZBdT616JX1T5g9/pfkQi69Yr/K8hyT8p/B5RLkNqI4TVS8Vt5doJJKhVaTgOMxeTJ7cjHWcx8wV03CdJobdELhReOWt7eT5sdo/Q9iVtYyxGREwtRWhRWPKPPXp5wOvJyu9gpbSKTy8sSPqtxCJMSIQEYgIRAQiAhGBsUUgD+J0JsIbGmvj71krQ/KEwVGS3WC0rGmhu3s+p6ycg3+AaF+eg6WWs3BWv8jO41jliyIYHwf7oYpfq+UQssqUJmM0bIdxacWjnWcSwvVgv0pp4LUkyQUcv+Uo9vrl5l1ILzOfJBn8PsE+Kig+qfQjpZXKx4mhZiSYiCDCK49dsFNJ8pcRhi4ha5tJ4aE+yOJdD/yry12rusiyo8nS4zQZcAKBucrJvaqJlo2N5u1GK9gxkL6Qev5akfwLmL16OsUEBTHsRKBLWKWZe+aPhTx6dXfi0rxL07jk3xno0ph7usS8Xts30Map8ZF9oRFjRCAiEBGICEQEIgJji4Dl7tXtI5hILyKYY5v9KHNzOZyAbxsd8biUlNZ0CqF8Fnn5ciw9gSfXt+NEZ28SOeG9bU4/G596gvLQN7BExM7+E8xJ3WQmvCiYkpNFkSf/mZzkfIL9ikjje0iGXk17OK/4uaK9TghY4DbNhMw6egv99XtJw2cg/Vvy9N9FEH+B2UawicInlXEsUsOwgZxVz4NVU/fZpuwRvO3d0+/vLvdPObF4rNvKbxVVeo/q8TIIxxCo7HFVIzdNMkmeMBfjErXXrzBUfi4LertHRfIbWZPxLjvpqxLyHkjkNRRa411ezP/QETD1vEAHsEj9+losv5GhWiS8AiTGiEBEICIQEYgIRATGCIHB43NCMkhgAxZ86SRzjDI/hGyCJIIhgm1IRpVND8MVyXN57+xKVfJltIQz2LJ82jBRCPbsfC1w+6lDDM5bQ3nou+SJPLzZ13XeMqXJ9Fu8Enev0evshLFdR+Ux5LlgryFP38Vgi8he5TRWr+nGCaETQ3YJSy3n47P6yGY9RdL7Xcr5P5CEv9UZ3xQhW0bwx4HxWZNh3HVgnKLLPwXLT1e6BspHs+GR8v7LUlu7N9QnO3qmLyQpvYBS+iYsvIvC0y2yD0cpjzbRpETLZopqs+Jdx9nkdqmwvoVq3yWwvhuvUzNJ2khZkqQkfXSiW2qkGLHsg0TASAj+BENYAFxF3V5REN6uTR3ER/YFSYwRgYhARCAiEBGICBw6Ai19mMmBGXopHh0+9BwPOQeXIyB57InRkY/FMqHaBwZlAG+VN1LELlxPzW6hr/X5pGv28ejuDrHdk7l69kbK2+8iyT+pvf+B2YNg2wAndFpM6mgYZQj+yOdCrV+K5W9UXd9MSC9n+ozji/fnCjIlovh0Ve0ZL29f74MMtn0Zq/+N8vmU8rhLy9U6dVDI51qOX/SZkGBGZu2UQhubO0vsSc53lu77b1lW5dT1MylxLnnpNeTJO0RyXy45z4AwR6e2KTlJMi1HHifyTG8vY6aK9AmKm0jsAk5b3UXRRtp7JMdN9xmp9CGI8Jo0kRgmFQKGE94WtdwOwquxOoTFVDa2R8JLDBGBiEBEICIQEYgIHAoCm8gZTLeRh0cJthmRF5oiWIbZFgj3jI7sLrWc9WURr3xDUR9jARaugfydZMlNtCXnFL8/60TICRF7hNstY/3RW8mqPyOpfYrAP2P8BGyD1mug//o3qaPJyMS9hnQBJ5PzYtXqHVB+HVO5gJNWz8ff590TH8f2owsG6W1fR5LeRZ58Ekv+N/4BK3gAb7jAeGAU8Eemh78K/WNSvkje8ThPzRrEZWKP4HK7N7fSegKDvBjjrQRuUNOdozRXZ7cppUqmNBmiCHmYDvl5hOxl9FfO5OQnO/F6Non0DRXDbLK0Y0NhasrCTWNRCFX1UY3TyZUk4aVMGTwB/+4CIbYrMUQEIgIRgYhARCAiMCoEnNNl27eR1h/GbDmBAeUjTqH/jYsqP0iO8BQhuTsZtRzTttXB+sitHyhhhWfsOfiju8HeTrXvGpwI+VdACw/ZHkaVgzO3axsZD1CvfI7E/gH4NmZPAv0Ca3w9mCpkQqKRAG5oztSEwFnyet5Ilt9KKN1Am52OP9rsH3TajVRZwPHxrzZvXrOMtP/byuP/KX2EkH8PS1ZofewwCghrk1LwlPL9T0g+Bu3fZsNj6/DfCWbXoHb0D1dtWD2DcjhLsrxS3v1b1F4vAJMxHdqBVMmUJlssQdJDSC4iFeHN2xaybFllslXiCJI3VnWkCJjGISe8BO+jL9SYeyVt4RhufSTqNzFEBCICEYGIQEQgIjBqBFpnDcmzu1oc5ZdYLm+q2N2oMxuTC53XbBVHkZMwe9yJ2Ohy9ReSoU8Xr8JJb3Bjig6MhcDlIj9vIUl+RQbV+SxeNa/wYhbviQXT8eG41HL8w1Vbn3qS/pZvkNnfEewzyuM+3IMJItSE4ZMn9X+vsxPANghHKV2k9DpIl2ClK6l1nsDKTZ08a1LARHpPHaJn3iZC7X4R5H8Xyn8N2WeFxv1gm4XOoXl5nehaMQvzOLl9CcI/EoZ+wIOta4p3rNklOCF/z/IW8i3zGUwv1RGRXHuFrjtd181QcsPZtH8SR3njjTkEew4hPIeWWTMo9HYSVymKfgQhsJ+qmkYPaJFeH4+FF5GXnkdtXjfFuEMMEYGIQEQgIhARiAhEBA4egdvE19qztWA/JKSPA/1KDeRvNiRb5ynJcBcZq0dPdpUDSdiG5Y+BLwmYG1MiCwQRHzuNYDfqnHdRr76ClvIZdK2fiZMlJ03sDDZM6Pyx3X67i1L+z+R8Qnn+F9jEvKfKhAUTRmUCU1TiCZBfTcjfTkhfR1K7gP092uyTAg91rSQv/4jUPo6Ff1Be3wNbqTTanylSm9mgrl8GfJE0+TTJ4E/YNGcTu3l0g+EGsXvp+6snYdlLwd4A4UrJcayWbZLl0HSJJgohVCXN0arbhWR9c5m/3Em8dsUYEZj0CKSqgT99caLGkReS9C/mzM0d7DYm64zDKca6RAQiAhGBiEBEICIwjghYoD7QK35wH0n+AxUk/mbujNPqBMfhVz3Xi5HeDfm91Pu2jJ6gOItncBPYL0R01gPPVMpUhIV2QjgauJiQvR5zUse1bG89lQ2rZ7Dno7u3W8YJ07dTHfwllD5HsL8h8CWlR5R/r/LJlILS5I8mfMAJVY/q5x9yuoFgt8pz+8yjzc/6arMUyQno3K5t9PU+SLn2H5D8LRa+IJwfLTByLy0jDsKymPlYQW7/SZ58jpx7i3epvS12ZuNGsL977R+has/PISSvIs1uVnkXgM3C62FFfThsgqk+RgeYCEFYRL3UgeNADBGBwwKBFMI08nAOefYi+urHxcf1D4t2HXEl4okRgYhARCAiEBEYUwQ+fPwQ2yvLCfk3xU/uIdCIx5kzzLZDfp/4yrdIh55kwYKhZPQVtUB/3i8W/6RI0pNg/aCq6d+OaBjyYoapWi5SkheQt+qUtzJYeiGDnYtYt6KrIL3FY6LyHi61nA/NH8A9mGnffxGSj4H9i9JdwDqlQZWQa3k4RFMlUqU21Wm+ls8TNq/D7K3k6RX7/GqzY/TRBYP8Yt5qWpMf6ZpP6prbwX6q5Ubl5ZMOgf0HHbchXbtStO7bpLXP6tr72NS1nZ1E18mdE25/vNrfva5l1yjLJZBfrzIWE9SuUNI+r4cWh1kc9u7OJ+SXMFBecMSTgRCkM4dZGx/J1TGNzRZmqy8/D8svoLMcH2c+kvUh1j0iEBGICEQEIgKHhIAFVkzvo1L/JUn4OsZ9YFuBTGn8YxAbhV4V9BCWfEOO1ntYu3kb4k0JhxJ6F9RIwxpV6E4I62Q4+Tu2u+doolNQJYTVnlIuAAAQAElEQVRunXeKAHix0jtJSm+mVnkBg9MWF483L1nV+vS7ke7BnHX0FsrZz7HKp5T3XyvvLwH+pS+fKfByDhfj24RLWfWbArZIy6uAt2Ppa4v3nU9bMZtbllVx8qkDw1EK5RhNm7aVVJ71UPsXEvt7zL5F8fEqG1A+e58UKJRhB9HN7Ztkyadprf98N6Lrkw9blk+jZ/pC0sHnYqWbIXkzhn+E6hjJ0Kr1Q9MdZdLU0fD6TROe54gMnE9l6kz8w1zEEBE4TBAI/v6uqT8nlzBUOpF5G9sg2GFSu1iNiEBE4JAQiBdHBCICEYGDRMC5Cf3rqPNt2ROfBX6htE1pvAmv8rdt4ia/FN/8PHn2NdqHVnL74prKLgx6X44uuRcwlDZALs9reEyFDOwjI9MxkYfQouM9BM6QMNdr33tFfN9Nkr+MpOUsZqw+ijeu73iaVMzs6WPjU08Q6t8mT53MfQyCv8u7CvZD6JiEwbwtindFe4AzCf6+c/4OauWX0NZ+0l4/YLXUcvyLzZs2PoZ/4Cux/wv5l4Ttvh9rNoYgPKH0DZLsn+no/wnL52/hdpOiAE6q5y+fyra2c6hXbiGU3gv5K3XkNIp3sUNF66Z0+MdARVgeh9nVJEOn07688+kJmcO/9rGGhzsCpjHHmCodP1v9/Eo6hubHrzMTQ0QgIhAR2DsCcW9EICJwYAT8ceaOgafE3b5OsNvxJ0+xTQy/Szu2jsphB94gsA7sZ+TJZynxJUrJ40ydr/1WlCcCyqGF+3vkRbRlGD8GWwvi8/q3j2janyq5B2EO2Bnk9iKltwmUXyNPf4WW5EJs9QmsXtPNluVVuhZL0DlbGKxpdqD+GXnZ/lak6z9koMlNjbvH62iH0uESU3a+7xzsEvxDUPXwGvJwPv7e7N68vLefOoR/4KuS3CEoPqFr/lXt8QvMdnrB2REyKdsm4f09stLtlOo/243oEoyVpGydMp0knKO8niucT9W1swiI+OHtp/bQlnYe9tHw/tEB+emE5BpNACziSPttUu9/WQhq8VzJ254YDicEQhlstsacCwnpYvLWDnzCixgiAhGBiEBEICKwfwTi0YjAsxGwUBDNocFlkH1Z9sU/QviuGMRyneu/4lOXPZlrfbRx2CbFhpSn88BHCfZ18Za/Jx38N7blD+PO0qX2dBluzI+2sOHr3GVdT9ZSL/2AwEPa6RU5kFHspClV5eXpDTMwOwnsUoxbyPLfgvSdhOTFDFZFuFYtZKh3Bh7ysJZy+DFZ+nFV6p90/Y8ItoLDzcurCgkLGaFhGoHFkLycNHsb/t5suWUhT65vZ0+D1D2z06ZtpZbcq4mDf1UW/wj8UNevU3I3ftB2wKyOsY3y0BAVkZh12iKYjilaQFSYcr8rz4PC+GdgDwDyFIdVOnOT1rcreRsPaFlXCkqHcyyBzQSeT5K/kJawgFuWVbUdY0TgcEDAsNAK+XFgl1GrHsOyZRViiAhEBCICEYGIQETgYBGI5zsCS0U0/ftCm9Y9Rcm+Jt4mR2Xi32C6k2BPik84z9jJI9wR58Q0+KV7JN+3g9zi5zmf6dP163Tew3LIfVcOvE9QCrdRz79BqW8ZC2f14+XzTDh0sut5PdbdT2noYRlM3wJ7SmmIkQUZWu49C/IahqkEFkA4H7he679KFn6HUHkHLf3XUS09B0tPoF+eh8RWkuVfJKR/RxL+Q9c8CLYNTSEoHT7R8PaRIRqOAuTlTd6AJa8S4TqDNU9OxX8OSAeejt64R3f3Uht4lPLgF8n5O7BvSCmWA4NKBmG60guE3Q30tZ3Pnu8EO2nOZ22iWvsB5Lo++6Cu+xCk/yyj+Kta/y4EefEREcbb2pXVlZHDODi5XSBdu5q0dFHx/u6e2B/GlY9VO+wR0MSjzZB+n6sbx5mU2qay52TaYQ9BrGBEICIQEYgIRAQiAmOHgAX8ydN7u9fSz49JBj9C4C+w/BNg3wHuBXsCfwTZbIuWfWDiKjsT4hfmTw/3YrYRgpybyAEnDpLbF8iTvyfJP0QofUre3J+yZeZ6PnzCIM6F2D04mdp9z2i23LvrXteS/VAE6+eqzFYlZ+kjz81E7Ax5M2kDelQx9/b6l0JfobxuJQ2/p/3vJR26WUBdKhI8F6tvIzORsuRrJOEhgu35RWhdMumj4bgEulST0yG5gZrdApULOKl/VvE1610NU29kn03xrzVXBuVtt38ULl+hUCjzSYgWjEUyal8K+TsYql5Lte3E3d4Jvo06M2ZvIJ/1S/r4kfD+IvXy/yXw51Ku3ye1DwD/Q+nbymezlgfX1rpgkkWTvG0Ec9yuKt7fPWv5FPxDXjoQY0Rg0iMQ0IQjR5Mkz6eczS9eIZn0lYoViAhEBCICEYGIQESgoQg4R/zk9G2s3/Q4vcn3xNc+Ji7x52B/SeBjWn4O+LrSf2n7TizcDeEusDtBJBm+p/1fweyfMP5KXuIPYtn/JG39V3p1ziNTn+Ljs/pwZx17D2NDdj3vTXMGSewxrX5LFVkmgZxYafPgos52YpGqov4oXYfymSVCtUjb5+PvTQZ7AyH/NZL8/ZDeiuWXkuNExF3a/QLk8PQyGonq1i48jtPaVeSlJYStV5O1H8eja1rZlfBiAVeutfM2U+q9W5ufUvoK8CT+jLsbtthc5fc8YfcGSF5DKTyHU1bOwb+KvVSlOGm+zWqFAs2etZ5HpywjzLyflk0/VxYPkKZbldd0zFpQBkqHe0wpfm4pnENu19JXPZXKxvZIeBvQ7AF/f7jGbjOAO2cCJ2LJAHh6uqwh9SXJQ6ZlrmOTbwwydC+wKVi+WBOJp9Cbtu8+phBDRCAiEBGICEQEIgIRgVEgIF7iXl4nvQ/MepLa1p9QGvwaSf3jpLX/JYfmn4jA/i4h+U1ZI79Jym+RJ78F+W8T7AOyTf6CWvX/aflFBus/hlkPsqF1dcFRnO9g+7W7ZOCMQua9XeKMevv2jRh3ExAbt/U6ra50KNF0cao8y1r647wzVJ9jtH6ylueqnEvBXiLie62IyFk6T8aaYOKwCs9UxrxuoQphtup+MSG9hXr5BlpKp7By07O/FOxtsv7orbSWRVD5jDD7OrASE4lFqkSYRhJk3HI9Wf4O6tXrZOguZuWq6SwJjrlOt4ATX1cmJ7+Dx+ci2lOpZ46/JiE00QDGkRAMYWIzMbtM+vYyOodOomfdHhMNRwIQDa1jwOjF7CH1g59Kp+/W8q6JTebjm5LPPPIzlX2f5HlUyxVabgT60IwQ4F84D1pOkhjk3Q1zIT9f9ZjJSh8jJonoUcyIQEQgIhARiAhEBJocAXEK5xMfPXaAnnmb2DD7KepzHmHd2vspb7+Hlo13k265s0i+XhEpdiebO9vc6ebON/fiOh9xjiMjcCQVHjuy66UtWDBE2vc4uX1VZOB+gvXiXhg/dujJMFzeVEuRDlpURye3s4CjtG8mYmpaPxJiSXWdpvqfrnS9COsrsfoZdD/57EdrXRlWTNtGtfwLtctnyfHfvlqJG+OOKE5Ww1HAxVj+RuWlVHk+rO9mz/dSC+/xpjbycBIWdA4yjGUg6+KJjQ0tTZMNJrzsckLpavJ8wfAjn8EaKtURU7jVNKY8ofHlNrLkd6D0Pqz0mxOW8vR9xWyjzzj6zCOZZOCPIfw1/l574MsE+5G271daoWbZhve1sRsHGceQgk2T/KdC5Wjq61tUByOGiEBEICIQEYgIRAQiAmOJwFLLcY5SENdTh/D3bfeV/BwnyX6NCMjBipEc7AX7Pd+FyI7eThCxMpMXMRzK48z7LWrHQTfEUq2L/BVeCN/W5hEQTcQ/0AG4d/VasFdTaz9rv4S3feAenfcp4NsEVuNGOApGWeRhKthJ2n8NWbiRUljIUWuqFASX4bBsmTw/g/PVvpeAnQihDTTNwBEVTFhVVetjVf9rCMll9JdmceN95YaicMQUHnJhvwXsF/TbXZQ3TGzymcadyWcf/Z32pP8/Kdtn8Pfa8/wvSMPvY/YXSv8kOf0jDA9jbNK6P+6c08whUJFezyXUT6OUdnGjxplmljfKFhGICEQEIgIRgYhARGA/CIwt2fWCnH0nfWsI9j3MfijDaS2Bmh+KaYwRsMIQbRXGC0TAriDNbsI6zqNrVRd7emV99mT5/C109P+ENP2UPLjfVrvsJLyBIq8gQ5dOHatST2qk/RlLNfOCgpPeSrUDSqdpUuVC7Zmpa45MgmcF7iL65oT/RSL/Z9M1fUp8f5cJCpZh+QDTNw7ubyZwQo754zSzjt7Cmu41+CM2ycwHaBm8i3TwK4TqP5DU/wf+xUDsPwXOY2Dy9FIH9T79a8KYgk3XJM5ZhHwW85f7mEAMEYGIQEQgIhARiAhEBCYjAsm4CO0fq0p7H4Lk3wl2J2ZbVE6mFOPYI2DKUp5GOwrSF5LVX0eSXMCC3u7h926D6fhw3El4q313kaT/pHb5FgF/1HJQS3mcrI7J4xvCjygPraZ3wTOTFO7VtXQeqTnRlVeTluFMG/I/DMur/w0pvihUpCB0Eux0bb1EuCyma1NHJLxCY/xiUNbS07xOVvJ1bTY6WmCpDT+K44/Y3GY1PjR/oHgXJUxZxna7i5b+z4j0/jUhfBxT38I0ycSOPsdEhgOXZcVETjuwUJNexzNkbfhEl3bEGBGICEQEIgIRgYhARGCyITA+ZNdJ1QNHbyPk92DJ5wXKL0QKtmsZCa9AGIcoQute2TBXeV9KKL2eat8llFbO5tZH5JkJOq4jHr1t3MMbtt9Jziex3D1OqzBz43urtn+G/4TU1mQ9fq5f48ZuS+sULD2dPD9Pu2Yoiezp/8RHJzmDDD8WOkBQLSZehp0lljDrhvy55KVrSQeOp2WNJgF2wXvnmXE5VggEQhJExFwPxirPMc7HhgmwE1/3/K6etwonvWn+KenK/5HOfolgj2P0Exqqv/uot8aSJPRI1pOk11P5dkGAOTxDrFVEICIQEYgIRAQiAoczAuNDdh0x93JsWrMByj/U5pdknD6E/w5uUxp3knDyRxFaGanBZkK4WFi/nnr5BdQ65uyV8PpXmotHmkv/qnN/QECEl8fI7D8ZCg8zMMt/XmUYFffq5ul88ux52rGA4F+E1lpDog2p2KfAvieZx/udcA4cgj/KPU/E5QVk6QvoyOYP433gK+MZo0HAEmGdYlkymqsn/hoLxaSRk95s1lOU6v9FGj4B9h/Aw2B90uOcZgpBCMMU8uQEyLs47ZG0mcSLsowzAjH7iEBEICIQEYgIHEYIjK/BePviGqF3hYy7b8ig+yoW5M0oPIjNZdwdRg0qM1XkK7jn9Tmq1q9Aein1znnszcP70/lb6av+HMLnMfuu2uiHMsbvoXNoK7t6dTtbOnX8VEJyFkYX1iBPj0+UBLYS7G4CX5Q+/UjLTUAjnxgwld+iCYDjIX0xmX/JurVn+BFyHYlxLBEwZeZjVoqVfanNyRIt4J5e/+3rrek90lufZPqcpP8lzUZ4Dce2Xh5ybQAAEABJREFUVROUR5OVZ7NxelVjhGNPDBGBIxGBWOeIQEQgIhARmLwIuFEzjtLLwJs7Z4AtqTyG6RdFCL6hwp7EH5mV9aT1GMcHAZGBMFU4n0duryHYVfTNPIpblslo3aVA975X2jeQdPyX6KK/T/hvWj7B1PmDT5+14ZEy/ckcNdeFIpdHEfxrrU8fnegVkdqwRbL8Av8aL3YHweTlxb3QgcaFVEW3C5/FGC+l1nIerJoa398VKmMew3A7ZzuWY57/OGfok0gnTN9OOX9AZPLzWP5F6fMyhsfEcS78ILIPlNW3pku2BbTn7cSvMh8EePHUiMBhj0CsYETgCEMgaMJXyV/r25luDCn7SzvP0830CAOr6ao7zmRX9V1qOUPTe+nnfhl08mQEeXnDCjB/HHXYcCWGcUBABCxMwTibwA1Uhl5AS8vsZ3kc3duUt67Ff8Zle/ozNs3ZhLcZHoKRdreSpscrj1OVlwg0468z7COYJk+M7ST2BEnbcsl0B0n+fS1XgT3zMS0aElIRg2ma0DmHPLycvHL6YfHBqk33GamZ2j5RMhoeXBbdYMqT5THmvQC2VGPizJ4+huwRHf2KcP2OdGe19LjROixxdkQjkUxTSZJFUJtKl28zCUIw3MBwA2RJKBfj3Y33Vrj14eqIk5/v13oenhfKcxLUPIq4JwJqN28/b0f/dYKiTQ9SF1xvdtUHzyvqw55AT7LtXfTCdcKTt/PBJL/Gk+uDp0InJhkMUdwdCOxFH4q23WWsuOXxFl67po0lm6awZfk0NqyewfK1PbT39jCjfzazV8zZLc1aP6s4tnLVdNY8ORW/1vPYVceW7Lw/yZ7xcarQIcmyQ6q4GFsEZNCMbYZ7ze12y3DCm/T/Qu35GZlN39Z5y5XcgxgJr4AYp+gEbArYGSJgN2Dli6is78Fv/OwSnPC6t8mTt9XOQ0soyavbQ8AfiT5Ku6tKDYwhJ9h2QraaZPsW2kqPQfgS2A+BtVBMoNDAMPzBKuO5GC8T5ifHD1YRw94QWCrCu627j9bKA1j4D0juxr9aH2iWVzwSjA7ybAGh0kn1kWRv1Wj4PjcS3Nh0w+EWGSTvWNeOGyI9K+diWxfAmpPonn4atY4zGJpyNgPTz6E249zdku/z1D/9rOK8GTMXY6tPYMbqo1i9phvP0/NeIuPEy9Ig1PB6Py1AsMKzUMi2i3G2q1G1c704J/g9wZ6+/LBa2QULr/N7lrcUhqYbowtHqAs7dWNPfQirF9G95pjCgL15Yye3SNeW7NAH18GmwnEXHAoZ96EXfsxtgabT6TEG09vH6+j1vUXt9sb1HcUY0bVpHqxaiK09hYGu0/H+7+2+Uwf2XPqxYgzRuX5NadXxzFw1v9AJJ0Ge95Jm1Anpw64YeN/wdIuw8OTrO9OuEztjMc6NcVMeWnZ74OB19fp7f3bi6m0Z1h+L93Vv3533DW/31vbz6Cw/D8svZXvLlQymLyIN11LtvZ6s/waGWl/JUPWm4aT1WngFLf3XkVSuIW+/jHa7CM/D8yr0bIcOuf55uV6+y+FjlrfFkl31SHIfWsWb9+q96aXXf2/JMfHxyq8ZhW5OnAHjJMo/ipT2/YyQf0rJH2l+CqzRX9TlMA8ybpgGnC3ypQ5p57N4xdTCQNLOp+NSGd+ent6hlf41FcLQfHXws7Tl7wF7XlptSPRJkZoM8E3kpa2kW2r8bJqIb34PVv+UZPwu5KvBBmkoYQgVYK7kuYQ0v5K2cAw33lfWvskdzQ5TA7mBzeJjouswnfdi4RvS2yek3/7ESwOFerpob+8KZt7vp7K5swTB9z19QmNWJIPf7PzGd4uMtc2bp+BGa7LmRKptZ5GlF1FLX0y9dBNh4K1Y6b3a937y9A8J6Z9g+Z8R6runJPtzkvxPSesf1Dl/AMl/JyTvJpReR5ZcS8ieT1lE2Y0gJ9FuLHvZbkA3CpOdGDgRdy+CG95unBXGuAh9NvU8PLnB7gZWTWQ/X3tygZUbVW5MNFL+MVMe6YPXY4mMQ/eeuKfFDch6+6kMlM4nb728MEZLtTcXupCXPwClD6qN/3SvurBTN1xPCn1Ifl/n/neS5L+RJ2+g0vcKOmqXFLrmOueGqnt6bpEuLpEM3i5jVreDyWgvOPhkz65G+07d8OXQtNOKiSCfBHDMHLuGyn8wdT3QubtgcYvaxdvH28nby8eIcv35OFmx+qtFRt6u3H5D/f8DRf/3cWCnDuy5dJ0g+ePi3JD8FlnpndTKrytIjZMgHyO8DB+PvEwv+2njXKVMeNyBgxMo9zBO3XI0PgY4sfcxodp+Pp58nPDtwa4z8Yk+J3yuE0tWteLyN2qMO2S8dtR/ifqlj3deH28Xbx8fL7tmnVoQ0M7axVjy0qItLX8blr5X47/aN30/If0jtfefEvhTarnuIeH3sPBbGL8G6XsIybt0XDqUvRXCkuHk6/YOXfNu8vzXdf7v6D7yB9ouxpxhPQvv17W/pYnkd1AvvRYnzj6u+JjlY1chnyZj1q3owuV2+b0tivFF9TpkbBqZgeT3MfsW9U33ent7+L11p176PWvX5Lrp9y8fy3y82iCvumOyRO3q+aD8RlCdZATnjN0pbtw54U0GfyIFEUHhq8r8MSlOPw0lKJLi8I5OUqcSwjnC/WVk6WkyejqeRXh3xcCVqH3KNLDFSpoBbeQXmNEYIg3B+jVwrIFaH4PH5/g7x/7YdQh3YPknZIx8HXgEbJvSkK7IaUTwr1Ubx6roKwjpeczonkYxSGnPZIw5JixtMore9DK7Dg+s2SB874b8Li03KeVNIXcglSwduhHPYkq9haXSAxoUvP/4zd4NN7/ZuUHmhmtfdqkmu16tvv8esA9A9gHJ/F7M3oIlr9KY92Kt6xyeh4XzMc4DO/fZKfj+Cwj2PF1zBWbXEXg9ib2XvPQB0vz3MRlBdZHoav0iqh2nFp5fJ47uIXD5mIigG7uX50abk7pacgHuRchK79K4/n5I/hQn7zl/hic32AsjXQQv5dcI+c0FWatNPQUnyW40TJjsY4iPy+zGjpN9f4TQDaE2LiiIR6i8g7z8u+QlTVzw27rnuTH6akJ4MYRLtLxQy/3ogvRjWE+kD8lFOv8KsJcS7LVavpM8/V0tP0BI3osbqn3VF9Iy9RzSlcfhpOIWGXF+/9QFTERwLPx7HO29PTjZ2okDA29T8b9Blr4fN9pdNwpdkI7A+/GJIJ8EaO1/Ka3p+bg+ufxuWHueunhyRfUNHyNcpx0LfzrD26W/egW10s3kicYI1Zv093CyEnizyMgNYFcDF4NdIL3wcWAv48NOnSiectO5XAm8QukWAu8mD9KzTDhLJ7yP9VYvx8enk9cczWZNyHmfnUid8LJ8AsOfTulvPxv3MJYGX4+PAUlYqj7xJ8LgTyT7n+LjRKEXQZN9ieqRv5VK/7WUSmfj8vvknueH8FWFmzq63rqsrsM+NhR6sHUBg9MWayw/n76WqyD/lWKiwoKT0D+E5P0k/DfV6xYsuRGza7V+pZaXavlcCOcR7BydcwaGJok4hcBJGhcW6djxWh6n7WOVFuxIWg8Ltf8EXX+y9p1aXOt5WHH/cT27RMdURv4Kgr0BRJxdDh+zfOzKyu/G9SirSjfLzynkX7T2mGJ88XvgklAett8nQZuoosNRsnrbeLu4Xra0nE7oeAEhvxlL38tOvfR71q7JddPHrzz5TXy88snsRE47J8hd62fi/d3zHS5kn/8nluy6GDsJb179qQbhf5ay/Jsa+0Ep0XaCup2fE9N4IFDCrFsYX0govRiyhbSsadlnQbMfKcH2mVh+ts7pVkqVGhdNkmN9hLCS0NrHph264vrkhLel/mNI/oFgn8DC9yWof/l7i5YDBGpaZlrm+0xSRJ0TlA49moY2aJWsC4X5BVp2s1K3GSZpSIRagX8zyB8CwTJqad4M0oyJDAsWDJHlT5GkP8BYgZm/3jEmWR9yJkab8pgpjW7lPkzrExsL4+XeCis3dRaG13Z5b4fK15DIIAvJ72n527jR6gaKE1U4U9syRFigLj1HyT3TneD1CK3aru494WNhq8aOdvXXqTq/R+vHaF0GDcozXIiX4SQ6k7EcNLufa0bevQIzuhcxESTBsXBDYdqsBbgxnVTeLmL73wkmMsf1kk/GWRBpsXO175wiObF3AytI/pBcg+VvJCS6JvxaQZItPQN/VNuNJ11AswfHwA1Z93g4uczy5xSPEIbk1yD9AIFbVUcZkFymdnYsFqsNjwObp+1ddMHb2ydw95c0hlsY1oeA68N85XE8SZCRZs9Tni/GDVWz98n7/9tkpbeQlK8qJkJ2TiQURpiMPMYpXBpKxaPalY5TKPe9CBIZ7SLjjgPJK3EiZya9wI328zHOUx3OV7pEuLwYslfrTvpuYfa7+CSBlV/IQMfxPLyxY9iYpvmD64Trr088Hb/lKNLSOTiBJ30nofa75Gofszfi/TckF6lC6s+chLFAaRaBLqBDqVVJ48D+dCLouJ8bpulc1wkfI07YTSe8jyX8BthvqOzX4xNyU3tOokuGuRMVl5dxCp639492TXy0JeeQl28ir72PkL+HYK9T379Gbf98pfO1fQ5mZw8vOQ8LF2j/5RR6EzR5Zr+uY68jtecU76PesqyK5z9Ooo8+W/Uv72de782aWHAvvntHSZ87rAdDS1TP/04o/QGE90H+JoLGS+wy1dlxUH8Oi7R+DIQ5hNCtpbfvjvsGavOndaKCUT6opI6l/Ha572hcYYcOGbOKcoPKx07TeZKHy7R8mXRKcoZfFy4u92+rHd6ET1oMVs/BPb/exk70XPeLdhEOOrkpo8vnuu8Tk3U7D9KbCelvavz5Tby/eN8kDOul37N2TcWYpfHLuErnv1pt91783m/JrST5y/B7WLv03dvfy9kHABNPdl0QJyhzu7bJwPsFxmfB/lXpZ5htVEWcmAT2FuK+Q0RAs0EwTxhfRsJl6m6zig+4PCtXdRr/uZHc5hLsBHW8DkxX0MAQyCXHIHlpI6XK0G6SuD5Nnb+Zgdo9JLVPkSV/qXM/okHrm5LbdexxsFWYrddyM8YmLTfg20XSdrCt2jdMjIuyOFQdTDE6Jcex5JVpDC1LmawhV02CUuPlD2CBYDlJPXC4hKWqj//cV8aD0pdfqlq9BNd3rTUymvp8sIq8FjOolypMZPCblt+8nNRMm3GCyMQl5PZ6kuzXpQIy6H0GPlwknE6TZi5QX+/W/naJ2KLtYWNEd1St+z3OtN+TFvuNfo7tuMb7a6r1stqkqqvaijICC7TvLMxegPF6QvobkLwVylcyNOWk4l1Al9vlZwyDG3NO+IfSU1XuqzAR3JDJs2TPkXzHq6QeJY03tGhb8j5tnO1Yp037Z2AsUDpLMl/F8CTBW8nSF5Csnjf883Q0Z3A8HVefVHCch+RNdXJJ8puQv0V1ukaCn6s2WqR1NyCnaNuxqGhbbYi3ZaJ9tiNpccA4fK6pH3iiyM3bRAMAABAASURBVMPzail0zY1iCyI7LAbpojm5DNLN/FZqvLQwwvx9YTdIvf0IxpgF5eXewlNWyjivPk/yvEnSvY3AtZLl/AKHwnCnS0W6Xqj9d+qGL4t70wx8EmDY0H6O+tb1wNspyRDtyM6k+8kpTU14XSccA38U0ic+OusX6v7/GnL7NbLwTmHxctCkhAVvH7VT6BZOz4wRUAKhZmpfMCgSBwjD51lxTQrF9XvoBBqPOA3sUqXXqj1+jSR5J/Bi+loW42Oay+3ya+eYRc/v0TWtZO3HFRMfPglmQeUn8iLaKSrnaMmiNqdD6y1a3zE27BwrNEaEoIk+ET6zk3T8EmF5M0l4F7XyS2irHovn7+Uog4ZHl8OJnk8A+uslg/Le9meX6F71WvLy+6jnv0fOuyXnTarL5UoiWcLBWKCWnqk+4nVt0f6qtr0Nd7Znou0E9H84McbBlJ8pdy9jZ5kq39tBfdOCj10az4PIt8sbzsXsBboP34xPWmThd8hL7yiIvHs4/YkMf9rJyeSYjzOS9FCjy+T3rt6WkxmqvBxTmwReB3aZ+uhp2lZ/Cd2wL70scNH4FaZRjFdIN3Xf86evcnsrIXk7LQOapJt2zP7008GmIWGpDLyju3vpzR+CIf9K80cJ4TtYsgLMSUdODAdE4CBPMJ3fogHfH7G4ilA6g/KKKbgy6sDT8UYN5NOHNACEmRoI1PHMO+TThxu3EoZ0Q95KecsQi9VNdhVkqfTp47P6eHD2cir5HZTqn4Lk/4P0zzC7jZB/mhC+oEu+pvp/VQP4l4rtYl/4CoZ/NO0uzB5W2ojroKaRGH0wEFHAplEamkpbe0lYGpM1hLwZZJcMwdR+iQZ7m6xQ7lXu5fOHNGCv0vh3t45vUMqUGhsDJqxbwHqoh1a6NC4wzsENGDcE3SAc7FxEVrkcK70Zs/fqpvYasEvVb2W4hbk8fXOU0WqFbMb4BcNUhmlWH1okgxtKMkaCE6yXq2+/C2wJA6XLqXWeUHii3euG9JVDDD4+O/EgO1vt8StKN6q8c8FmgwzUYZlSrZvSvqIV8iOshuWfjtmJBM2WW3gDWemF1Drm4MbjvnJoyP5g7NSH/imSt3yF5H4zabhVfeWVBLtQbbFQabowacGK9kklqimNZzSVlagAlVUYY50qf67kORWSq7WuCRDeSd73cvLq6cVHjMbSM3brIxW6eo6iVrmakKose8lw2chIplWylQvZTDqLtoYTuwTT3mH5DT+3DdenwFnkdr3S66QP5zJ/+dRn2Qc0OkgnXE/di9czXW3ffil55U2QaCKM1wv7S3CyZsh+2WlAS+/taSwYp2BYUUYJdo4RHKX+erZkeolsjiUE3kLWeinTjzqGJ9e3jxm2PkZ4fi2lU6iXbyCxWyTD5UrHq2zXzarW0x3ymdb3Fm3H8VTXVCXrFJ10jNYvIk9+hXp6LS1hAVuWKy+1gQ42JO68R3j7+3vp/nRH1nKjZHkPlr8P7BbJrnGiGJsXSX5NCAWN12qTwssqXaCYpHD9N5ovuExqA5czVCTejvuNzQM7Rel55LxCEzq3yg76XVXpHdTKV9NfOg0n/f74uusDDWwjdgSXo2tTB2n9dPzxcXgdgYvBFmjM3tEmqqdxoLawp3XT2DFe0YPZSVh4ofJ6I5ZfR5sdz9p1bbiOsHvwAnbfM5FbSy1n4ax+qr2PU7avUkpvk8AiJOGXFO9dUgdBo38xjhkCqXLqEKqL5S25hqHWE2nZ43FmHaE+VCe3DVKmjTq3pmsaG82CBHCZ+gvZtPHsqHO+bXX+uqeXtXOWM7TtHmz7NykPfhpr+TvV9y+lX3+q+vw5ef4/SPIPFQlEivkjcdvfh/z/6PhXINyn/NeDDaENpdHFHMPT6K6OVx0pCPjTCZtLm0iS+6R/6zDzsa8Jam8VjGmkaQX/GSrGKwQrDD832LqmHycj/gXC4k3kJlLDK7D8XCwcrZvazhukj2M2XtIcMF/D750lELFwkmCcAfZS7X0HIX0deTifk/pnccuyKnu58TLSsNNYyNrOJAkiuvk1ulQGPu1ajh4Dk6QUJK0Hf2TMwg0ynJ5LvnY6BUmn8cHr7l6b7q5jC31IbUlBckN4OYEzIcyVTrRLP8tK3h6N0wckAag9ghum3do8mZBciT+il2RvodJ3FS2tx4/J48FO9AZnzFL+/nTBq4TDhUpzlFooZChk0epBRdPZLn+blgtI7HJNLN/EgAzozvV7NR513sRH70uuE9nWY+gffD5Z+Y3kuDf9VVpeIAyOISCSFioSTvUZFRa6dAyi4TpZAo0RJuIdTBMh4VpC/k7C0K9QrZ+NP9rsTyx4vXTi6GIweta1UrJTNEaI9IVXCAeNR0FeXOFghRwcdDBdZ5SBacBpuCeNyhX0VubSkI9uqp6u+5s3T8EnOXrrF2ODb2T46Y4lGJr44WzV/Rgll7lF+1z+VEtvC1VjkkbD5U9VL0000KH6zAROxMIF6qfXQ+7EV6lyA23JOfij3N5PirFcuOnkiY8q1/UyBDGK5Aa104skg8h6UNscgl4qE0VT2omH7mHhbI2HKsNeQj0/dm8TMg6grmlgXGo5Hz5hkHu711JJ7oDs44TwT2raOyGskWSDGrxyLWMcOwRK+Pu7JM9VR3kBrTZ7txl9b5PSUB9J/RGwHwMblBpvfDvhTZMaWWfOUmkF+woWcPLw0WMHmHX0FlbPW0WYskw26UOEmfcXiVkPks/6ZZF8X2XzL+jjR5STz5HUPwz53xLsa9LFJ1XKaHQwEKjJ/NmKVbfQ1yv8JJcym/gYS5wUCAysr2mgXo+xUrrT+I/2mSQJhbHToXG5zOyqjQuObug5KfT3HEuI1JZuxuwdBLteN/OzcFIDbSpb45buDFppouiY6KZLq+ScQ0Dycj1J9las98WUWxbu79GqA9bDJyKTwRNJ7GXkXIrZUaCyjISxCakwnqp8z1R6OZaexryNwjrY2GQ/ilxcH5wATF3bTcbZhNKrJdvb8cmEwJloIMcxQKMrGM0VTBKpbXwiwckGJ2v7RSQsgeRm/PHgmSumURihoxDcr6uuniZSc57SK9R2ZyoXGY+UtDSlQ4smSQkiimEOZvIgla+hkh3DsmXaRwOD9NE9/P5+uetESWQxpP8N8lfiE2H+eKOFdglYwrwONFPwdkkhOPnSJAXnScabCIl0IlxJvW3BIY0R7uXPsqOx7EWyV65S3sdrHOrQUno4JjCkWOhQTotJ82sxO5fZM6bi/VQ7JyTunPhyT+7wJMcb1MrvEYbC0S5UvY9Tmi5ZWpSaUQck1pjFYX0yysqxDR8Pi4kUrlK7v0np3dRLNzGUnM/xW46iUZ7ep/WyfjV5/gKMBUCrlmOll8quiKnq3KHx8CQtX4Qll8rLPWvPCZmkOLUZ/vlXSadN20qv3UfW8m8Q/p48kYfNHhU4vRIxU4pxzBAI6ijylMDFUpKTSZ/sYNfBa8bxNVpbVkL9B8L/MYINqOig1NgYwsHJsNRynPj6bwnvL/mEiz8GvaZ7Da31XxDSL5HbRwnJl8GewMw/GnQwZee6QfRqAH4KhrZQWTB59Tc3w3RrkRJoaRwOoRnrsG5xTlbZCvY4lm8X1gejb4xLsKB7RC4DoqrxYhxK8DHHvbmV1hNEbK5Vnd+mUl5F4FyeIbmp9jW73rl8KRba1edleHIpeXgdSfpy/NFCf2fJDTYOIhTEpkUz+MmlhFxeDOYKEycdXtZBZHTAU1OdMQ3yc3QvuIq2oaMa9v7uTn0YbD+WcvpCgr2ZkLwKguvDHMnZquTyjjUGynaMo/mYiXtienQvOV11eZnq8Rrq6XNYtL4HJ2/ayYhDsGIiYrB0KnmuvHCiOxUK0q/FmEWTnBUC8yC/CNIz6GzpxNtmzIo4iIy8XH/v2R/9DenlBHuLrtYESDgfJ7kgg7/AwGju4PKlxRgBImfynpO8gaz6ctrSkxnNR8F8TOmfMg3/1YeQvABM+Y4ToUAexZCfLPwvYbB01IRMgHjb75z4CpwlW+rVkNyqet4I4TzI5xd4GmWMhCMvmKqcgiZSKCbXTgC7TOkNmph4L1a/Cff0+rcDfELZ8WQCgpfjeklZ43bi8iwg+ASgWmk8irei7duV+yKVc4V09DS6O9uFi+ODh+ZSjqUiJk440ilPUM6+RZp+RMJ+ipD8RMKuBxGOQE4MY4GAK4EMBzsZkqugfNxug5e3xYoV8u5mD2kw+bEKXAvW2MeZgwxvy0uk2xKWSq0Z62DDHuEPzR/goe51dKQ/oZTfrvp/XSXJwyvCH0akf05S5A225QTuppRuZOfXo5XRpI3BbNLKPhkEv1S6ZQPbNMH0MP7BtJHp2pjVbC8ZeXsnYFWyvJXNnSWNx76PMQlO5vzd3Go4E/+4TwivV74vADtGfU43qklhwLJHMI1MZQJd2n+aljeIQL6SUv005m3uLB7V1oERxePWt1Ia1M2bywh2LAFNOmAjuvagTwplXSJizfkk5ROpV0QgwjiVpZL2Ft1w90mBNDkNK7+SPLxFenClTvW6t2sp/Ruv+iv38YmOoRujjucCcAJfeq3qdTEzp88ZnlQYIc5LKNGWz1YfvFzXPwfMdcwxYRyCqYxW6dyx5Pnz6U/mcN9941XWvsXfqRNWPgUGr9eJrhNXaHmcUoeSsJ2MOhEqkr0by8/S+HAjwW5kanb6QX8UzJ/8KNsiXX+VUFiEhVYtNWYr97GPav9kuvI/Wzp4Gi2tU3BSM/blDOfoeftE6FDHQtlQV5LZEgI36aB0XySXYpJDMkki7TzCo/qrEz7Xq6CJS44l2EXSh9dq+XZC70toaT+5+HK733fHGyx/r7uU6z7uHt1wguQYT73cWRuNBdaJ2Wmq82XklTns8rj9eHWKnYWPYmkB98DNmL2BpH4PSe12CLcp+W/y+mO1MgapK+OgFOOhIaCBInST24VkpQvoLHeza0e4fXGNrS2rSNJvYdwHoU/FNQb3IIMgSAqSquQZZ72VDvqTBiumbaNalpeX24XR11T3xyh+/oj9TbgEnTOktEod7r8w+zHlgU3cbpPXs8uOYEF127EeF2OPwFJEb5M+GT8rCdYn3dmfno19+XvN0RLJ0oLRQWtF48VeTzrInerL7tU6df1M6qXnknGLyngFucn7FaZrnKmASqThYfQCmAyPIMyME4AXkSc3MjBw5oiNWR+HrTJLuFxESNyIbRci4znumeRsIXAMlp/H0LQZOLnSzvGP0gd/F69rVRdBZVv9dSrzldIDeXLo1rI6znVXceMcTfqAe3mDe+cvBruJrHQZ/T1zcY8LBwrCqHdjqyZNFpKYjH2c9JYPdNUhHk+FuwznZDGlcDRdc1vVFq4nh5jtCC93ous6kQyeJb1wkuMe/nN0dY/kmPxjBJrM8zEihBNVn5doHLyJWvtZIx4jHJ/WygyycAEJZwiX8fDyK9tdYxDuIpoJIun5DFaqDrseHqt1H/+2LJ9GJT0dnwjNwxJ3spTAAAAQAElEQVT8Q0TGcThm4PciG6viDqt8jET6pHYKIn4sBC7X9psguQUqF4zuqRLlMtLokxSbuqZqfDtDbXW6LpsAvVQpRQw+Js6EVBMytnDXMSspjjfjv6WW89c9vazf9DhJ9g3N9N5G8Ruq+Q8l7lNa90ebI+kVGIcUA+oUHIvZFQxWT8C9CU9naIEV0/vIhx5SZ/kB2GqlGo0KZvKYhHZ6p5W5Dxt3MZygrpi2jdbyz8E+JQz+TUTk55ht1PYQoiZop5LHMLxtA4TwlNJ3tP05WkuPMHX+oJ8w6VOw8cd8ZCAFknoY2amT6Sz1t3x7DUu36XY1INVqfB1DUJsHGRahjXJfiaVom0MIys/f5ZkxYy5DXEpIXo/ZC2XIHKv6tmGqOYdJMNUl0AIcS8ivIS+9mlA5A/86pRuqOrDPeNQaEbza0Tp+nrDp0VJtoP/jGxOVJcJpp6p/yWBY5YbDHiWO9eYOfSitFHmrXESSvRazK6ULCzV+tqu0VOlwieo7we+3as9wIcFuJB26lPbqrN2+mbG32t4oXWpNZ0iHziOgvoKIJ8pvbyeP4b5AWaX0EMqLqPZ14nKMYfb7zMonP2asmUGSXECeSieSa3Xuiar7Tm+uNg+DaGrXoLY0FqhuV8m+eNWICW/7sjLJ4GwsOVfXzlafcd1inIP6o01TeacwJM9Z/5oxLlPjgbf9gt5u+uSACdlrdI+4QeOSk/nDY+JrnBvo6exNuqUbjvRiBthi8nAdWSrSy2WySecNT7IJb8Y4+ARIeZv6LiKczJGujLGO7Fde01Hdc8NRmJ2j8XUGlyKdhYSmDha4/dQhZs9aT+/QzzTQfxrjryT1p7D8Dom/HOhTypQabxhKiEkXTWiaPBCEU4Tt8zF5E3ywYUdwD2evrSOY8OYRAv060iCsfdYmTKVtS1kyTEy83TL8XfIs/4V07tMyWv9BBX9TA8gvhZfj0qttERPh4iTYeECIfpE8+STl3p+yQmR5qeU6J8aIwIER6BSJryU+ObJdJ9eUGtTXVPLOaNLoREZ6kh76/eKWZVXqnfM0ll+hPvR6zJ5PCDLUqOLlcJgFE3bF+1To5hsuU72vg/yk4uupPgPOXoIT4fYp00jyUwl2NKEgzHs5ccx3GViL2mGuxroFlPNW9iUjYxA8b/9tyIFpx1ArvxALbyRo0hWbp9wnjz5I2IOKht+/ZIByLtjL5QF5zgG/gt21qkopnwvhDCW/NmUigkl/Q5gC2UKG0il0aZvxDMHwpz6Sfk22lJ5Hnt4svbhCJS5QasXGu3wmPpjXKXi/m6+2fQFpuFEc5Yz9T4oJp65SGyE9lpwFwqgNhA4TENxBEpgpfTyaaaEN78djUqzq5BOhbJpDS9/FUH4DgWuU9XFaHm4TX6rWBEXboV/+DQzjedKSmyjVrqRSXYC/Cz9m7ceOoEnSJJ0BQROW1qHydF/ZcWhiFonK1KRtKoKfTue0R4qxMpmYsg+xlKWW4+/yPjL1KbaVfkjdPiog/0od4F/A7tT6CiLpFQSjjaGsK2fL6Hwe5f6TaNusgSWY9g3HgVkDpNkT2rhTSrReS59c0GICo3mHtVawbrKOFsb9psszYan07+juXgb6RfbTL2Hp/5Lu/R25fUE3mR8Q7C78q9WBr2j27GPa/oRmpO9m/dFbcbJMDBGBESIweHwuklHDrFd6VCPob4SXjt9pppuFVdnWmXIoT1T4JFq7vFhZ+gL15lepjudp7J6B4ePPM+PN+FWkUTl73aoqXCQuXIblLyTPFwz/PIL27hmLsW1rFxZOVZquw6nSBMWQSuOmqrCFZGknh9LeymSf0Q0sf69rMF2gefcXk9hrdO6F0oWZ0omK1h0zLQ7bWNL9VgZZOEf3kZeQls7i5Cc78YmOPavsWCVJB6G+SIeOBb8PCikmJMhGNBEpE9EWuao+ou0Dlzu6M4LhZMffZab3UvLsFunCJQSbo+XhrhOu71W16nzV9XKy8vXSj8VUNrbj7b8noJeq1/RWurT7VJLQo6WPoVpMQDQSLJkq+Y6VLT5GY4Ta3idC+2YeBdmVavPXUnwcLUjviomAhBgOBQGTbrmOdBO4QOlXSMovxr8FsXJVC3vTsdGUNpxPm/TjGF3erTIb0W9NZWvySJODgVlsnF5FFZ1ECmQB9zJ+cvo2Nq9Zppmv78LQR8j5EIHbcdIbbDlBRiLUCTpCDCNEwJXDFXQRIb2Yof457PJiN07YBtN1pMmPpLyPM/xl5hFmPUanBZUM/k6ZvEADbWOU68izWSrC+9EFg2zqXks+8FOwz0rNPiSDcClp/XfJk9/F8r8g6fgMoXY/c7u2FbgRQ0TgIBHIQiBkQ9L4/CCvHK/TExk2FTr6R3+/8HewKut7yCvPx8Irld9ZugHJYySjjSMiGEHjl3GcavtieXgvpb+0j8dXNTNuYYbOW6jk712NHndlcFCxGGdDu3RvrozoVroYn7Kd6A4kR1MvifhzvWQ8U/rgxntJ60dGNMqYdauyzyXkL6XWcSL+wSGCad8z0R8LtKwLw726M4XTxGJkyGDNp2CpjMZnxBrzNSe6tY45+LvMgV+B5ELVuUeprLJMaTLHkcjudRTGNl997wWk2YuZmh2HkxH20An3VoVUE2HJSTrkk1PJSAoYk3OGxwjZYHYUgTbGYoxwoltpm0d56HLJeJPSBUrdeB9B/4lhjBAo6f4rvQmnaxy5nrR0NSWOGZ543UPHRlOgT47mbZ3k4TiCSS9DOppsDvmaEDSZaF7PhXS2ahKRJDnkTCc8AxO1PXWoIBObNj5Ge0mkN/u/BP4Cs09JnB8z/FMxW7QcBDKloBTj/hEoQd6jU84lS45nz49RlLoHCANPkJt/GXuDznNctZigaJjauEWlzcDyKuM6w6xS9hpd9yzjtjn9Bem12Q/RuvGntNTvoGXj3YSZ97OhdXVxfKk1C1HZa00OamdaM7BmGCvUj9UGUlQO9xAS1bVpKqm+Zyn1dunBKGRyonvSmunU7ALdBF+lHM5WmqbUmBuhCm5INLwPuZF4IiZDNi+fSXnFlN28eTtnxkP5aILNIIgQMeGhrC7WSZaK5IxD2e7hd6JP5RISe4lKOAXCFC2PLH1QhVXviu5sc7BwEaXsclrzo3abaPZz/F4XEnnSbCFYJ+B6pMWERFMpCcFaqYc2No/xF9mVeRFdJ7K2mYTyxbIxXql95wsTGasyxbVxBEWNtUGENyxQnTURZJdBOmd3nQjG4IwWkrom/vP50p9WnWtKExNNJQYkI9NwW2zTfcaowo6LvO3bq7OwcKn23KDlkTfxpYpPYPRxtlP9bDGB66hXLmegvIeOjVKaLo1N1t8mDZmtdmwnaG2UWR3SZSY5yDVWhgXYpg4k10QOmoxpWCoy4e/zTpu2FSe9vcn3ZEj9A6XkzwXwx3QT+ZbSA1pfC+bvVGZoh1KM+0agKryOIdh5ZGkPl+7idbmNOi35Oiz/CYZ/qGqIiQ2mcsuYjCKjlVJLA3VXhOt2E+m1Gh8+YZAPHdVfLG/Ttu+XkBMLzZFUmrye5Llm/8NhW+sQckx1DDRJHYP6niZGyxvtoDH3xzLPWi4iY2dBdj0hnKM8NOO7y9iiHUdQlKEROgl2utr4pYTKycX7u9pRYOAz42kyBZ8Zt2SqxrwGjHOa2ArWgmm56b6Db/OiIvv45/qQrxWJSc8n5yVKZ+BjOkesPsgqcXLDAvLkhSSV85ja04VPEOFBfa93WkV6Ml19ZwaYkwxjooNp0iWttZCX0zEv2nUiWdNF3nI+hJdjaIwI01TO2JelTJs+mhvqtGhIOF7jwNUkdg6zZ0x9elLsRhKSlg5C4o+0d0kvSkx0MPecITJjKbOro9dH13Nv+3rpPEivI3AmMFUpVTry4sTVONW426HiTsXyl5KlF+w+7ujIaKLfL9K0oku7wHxJQ0LQKBISTQIlmkgstyK5GnAjPZiqBys6uM/8+ICItve8fKnlxUesPjl9G9b9OAP5DzUgf4I8/R+Q/28sfEGDwc8g+Hu928CcpEXiy16Dd4BuzM6m1H8Mp6xreeYsC2yq92k28RHIHyGwXSl/5viErJlkayVUuultV0cKNiGlHumFZOUAImBNgYOpzUW80rqWTSHQ2AuRq45BdTRs7DOfwBx9zK5sbKeveip5cj2kz1Pp3UoTb5yp0CaKJcyEg10oY/YKQm3e056bLhmymYxIswWEIGMSm1C5TeUFyWAmGetjax+4PszbrNn20umq20uVztb9WUYRpQmtY7MVZsIb2rD8JMiuJrUTn/5VhKVqjyRvA+mI2RRhNrZtwoiC6ayUkLQwZXuKy8QYBdeJLnle6iWNEfl1yvVc3Ws0GXKE6wSkwkF9hVOFyQsZqJzw9CPuPka4t4qwAPIO1xCdM8HREkxkJiSSc7RFy34rfv0jnEIwHw92TnIc2ePBaOE8+OvUdpp4xfwngq4lSU4ZHnfULgef1/AVPvGRJSVCLqIZSpj+ho+M+v+oLvRyLZRV+hRqSRnJlYwqowm5SID7Oxwz+mdjWxcwe8Ucbt7YyS2PtxSf6S8e99I5T8tiAfes/UP3dvxDVh19PyWzL2D2Nxj/E5J/UYf6ASE8qEvWKfUT8A/A5FqPcRgBEyatYAsxOwerzygmG9gRehfUsCBPefIzjI3a65MGWkxQDGrvQJsMxDmQteEznBNUdCymqRAITSXNWAqjGUgqlqh/aTLHDZ6xzHy0eWlsDXlObfrB4d61qkp7fjzYtarPJTLMNJZTJgYhoBsxYR55eqkmZ8+ka/oU/J5WPLJalpGbz9NY2ybcEp08sdE0ziLdy8vmRsLYFK48W9a00JedSJK/HOy5FIT/iCc17AgpWBchOZtgl2A7fhXh2yLCCR3adwxBS9M2ExyG77sJichNNsaeXR8jLDuBJLwEwoWq2UylklKMqG94H8m5gCR7AW2tc4tJMb9HmLxVlsyDpE16YRMMlpeXqNwSecnXR1e82/fl+lEaA6/AOB+vq9d5dLnFq0aHgPe1aep/56j/XU5LbX7xkbjR5bXLVSKYwUavG7vkNOpVL9/f3U1rhRzJqDMa7wsLItOhmcy+cwlDNzFYvYHO2sW0tJxekN8Nq2fgn832z9T77ODSoLoEVcoC/iGrD80fYMvM9ZS33E/b4NfJ+XvS8CdY/r8I9nlCcqc612NKG4EBJSduB2fM6aLDLpoGWJhFbudTT+cyf7kb3cPVvN2EUXkTWXIP5CswhoYPTNB/QwNsmIJ/0jwdmoLPcBLDuCNQDBZWwrx/jXtpBygg5BgZlmcHOHHyHg71lJC3QEhVV41pDa+KxkWrU+rVcoSyLBGZS2wmIXm+6nGZ0nxdWVWKcRgBb1dNLOaLhM3lopbDHwnxL0da3qXxdyqoz9GQkEqmsiY7dU8do/L9g4etpsmO4PrwXNA6oUIMuyCgPuMTIAkXU6otJn2yA/8QEUGEJpmrE7XUiKCVCY/m915LqY6hQA8IswAAEABJREFUAVs8wqoxguRiLIjgo0lsx4AYnkZAeBhHY3YJDJ6BT4q1dJeppT4RJg+4+pBhT58+WVZ8Yg/Z95TOoPj5OUTcVdfJIv9hJWeBu8ZmTUDm1VOoV9o0/o9ep4LGiUST2uacjMaFonzJUq8U97HiX+Ok2U/Jt5Oz2frIbZ0GwlkC/5WE5LcI6W/B0BIG0xeR2PlM7zmZGauPYsvyafhv9t36cLXw/N5IwmICHz5+iKnzNxePOGf1u3Fvb5J9mJL9MSS3Qf5VlfFzrT8FDD/mHMi1Pvnj6GpgEFpJ7FiCLaI3bacYmHZkVu8ZJB0S0bX7CWzV3kxpoqL01doxFpBXOv05fGI48hAIYeSka7KhM7tqutkk0vEKwZImET8jhEEGNMHgY+qBhPLxwg31wCnySFyi049ValHS2KL/Me5EQBNIdIGdRb10Bv0zpssT3k7KPBJ58UJDjYWx0z2fjJ45rZOkdKb06IWq7wItq8SwJwLeP1oJ+cmQX4m1HlN8iCjNK/K8iNhQwfS351UTsR0IKjkwOEZjr48Riza1a77jJNVVk2G2QNWIY4RA2COatn2S40RME4el0nz8t22ToWmE0MHwhJifw6QKy5ZVGCodQ8gvIYTjZeNr4k8aNqkqcdgIa+rdGnc4jpA/h3pbD0soHVLtQj52949DEcTyp/tGcwi018pYwH/ftZovI9jPMHkWQAOjXarT/dPk7yWU3k9Ifl3L19HXchUDpfMZnLaY0qrj6do0j3UrunjtmjY2PFIuiNGmjXVat26mtfYoleQObOizhPTDyu9DSp8m8CMIT4Bt03qNIzeUpfSzSDhXEHSzUuaXVoo4l4zBzo1qj18obRROebF/Yv4ZFqpqox7SZDo9MysHW2w8PyLQ1Aj4h9fKuXQ8aZOu+w3HGi5vCHWNAH1Ua/URyeKGDOXjsPQaSM7SGDFF18lbqP8x7o5AQGOYuefmUpLtx8qb2qURVh4uU/trBN797InbcnIzVqX5o6q1luN1T7lC94xTpNftWAPrRlMH9Xnd27BzyJLTJelUQksLZp3CTce053CIPkaU6ppQz68COxVoV4pjhEDYS/R27ybPzyPnTE04zMBKmiSjBTAaEjTp4RRpNGUv1SReR4dP3si+TM5VDXw9tv1osByra4ySxhe1Qzhd7TGP/jW6L40y87QunUzELU3LUeYxDpdJoHHIdayy9MdmbfMGeQechH4HbA14Bw8yBjhZpOd8NczVMqZer/XfICv/vhrsd7R8t26sN1OrXkVL6UL6p58lYnQK02acwGD7sfhntrdbF/VWNUa2nnLtHiz5D8w+CvbvyuNerW8C6kpHYkzBphGCDJNkd8Vfajltfdup22OAvO7UtJy4GGR2Y13k9YX0tXXs9k7xxElxOJUU69I0CARjbVtZRs00jUGtaBCi0cHMPTo5JAPkmZYHEMgfTewsd5OVLiC3CzUuz8IoH+CqI/ewOekLU9Tep1LnDGE1U+s9BHnzOAyC60OZHsguJgTXh27VqqQU474QCJrQDeFo4fU8SvWjYUj3u9COGA5IQ2hI8HEgjEnJ7umvdHQR7Hx5rJ8H+UwoHqUck+wPy0xcJ8C938/DqgvI1aeCVaUjRuNCIKkfvE5sWV5lyI6C/EJp81EEn/BrXCVGWbLXezgFtYYnVJNn0iizbdhl0iPXJ/ypokWkHZ2Hm23d3GTX290fQ06SZRrnv0LIvyd1WquUq5P4DbONEKbLODgGbLGW52t5mfTtZRpE36Tl+0jz3yfNlpInv42l7yVU3qH1N5AO3Uxp8EZIXkJevpiQnaa8eiDvI9hTEJxYDxGkyByBoRiAktlgJ9KaTtlN8f1R5iRbJ4weJ1gvE4mRyTgMYRouV2XrNLq0TQzjhoA/VpuXbdzyH03GQRo3mutGfE2DTrxRulyuakwzGbrWrvEoaZAkuxYbyM0/5NeLtdZYegDs521so79lEWZXAPLcyHDXSoz7QcDH2sBsjHNk83vbzwArC+nm6neMIvjXVuvJ8fgjmOZ6PSkN21FU/BAuMY0DZpps5kzqyZmQzpNuaPKLxoY8ZLRn+SEL4Z7+kBxLxvMJJtuNqvI0pRj3hYDt0Ak4g1A/DfL5sndbpBeTCzf36m7qmqp7mzyIiTz6QRN9qhtNGwIB1/lMSzl2bEiSDij1KW0n2FbMthQJtmjfNiU/pnOKc+vazpSCUpNH/0aIadzJF1Hun0LXKNslK6muuTCT97+Japw0kSz7EMUC63r6sW33Y6XPkdgdYJvRVLGSYXgdUsRilVrUiaaCZr0IPoieQuBsgj1P+6/A7Fosf4W2X6v0BqU3Y7yNwK265l2YLYHklTrnudrWzJNuzIbnzxEYHNPphMQH1+nsqvib1PlD2T3fvxTmWzBtTxxAicrzr1MeR6kkL8Gq6DWaOOxjSeOJgPexatap8eg4FdMkRkAIGgEHSLPt9PXqxm26kUm6vUX34nWUZmmC8TKNt6cW/dR0NTHsFwETRk5uzDTWZjICmYsdBpMErg/+VWFMk8nhZKBdOpFoGeMBEfAPDwUnNBdpPDiTYFPUpxqLXc6++/4B67PjBNeJUpiB5XJMhNNlP0zREdka+h/jARCQTuTM00kXYYn6k7Vr3ZQmOkoPTGkUdp+/ElfeNkMj3tnkYbY0qjLRwh+wvJ3kFgZwZw62QcvlmD2Mca/W71L6kfL5Lha+qX45nOBbYN8h8APgbum2f9dmmdblGGKbliLA1HU813rzxaDaBdogmUc5tBWvfjaflAchkRkkCcVj1Vo7iCsbd6o/zvzA0dsYrP5MHUSEl3skzHYlnzHR4ulomLoRpEBJ62UtNfsV3Evis0nd2jdLCuo3kWMILJCiHqe0aJe0EGyujvkgXOJIDVbg6BgsFJLdsAupvF2DXJtpRit9BGyL0p7twDgGA6uqHeeRJ8eCOqfPFmolxiMEgcSSw7Km/pMSSe8UzKTXoUN1bHQ9g2TQbDbbqSWDdO7vkbVguFc36Tte8l+AMUs3+7KuP2zjmFYsiNwGjsaSi5SvJjtM961iDNbmJI2nrGshqS2Q9OdHfRAKBxdTYTYdf9QzBNeJGbo8VZr4OPwqQyDRxNehlu46kScLZYNdjNlkfYT1UFEY7fWpMJuh9BzZq/L4hynKKFWaPNHfBU1stvR6EcZUpUbf457BriC5Ngi2GXiSYPdB+C8s/zIWPi5Z/ZdcPkhS/z3Znr+r9Ps6549I0D6lYH+k6/6APP0A5B8A+3Nd83/VVv8OfI/cfk5A5LfI34lvBtqjf00RTdL6JGsIXdSTKv5UX1MINjZCJGOTzQTk4j8n1LtsI2n2IynP51XifQTbG+HVoWdFb8ZETZnoSPp0Msra9+wEJe1PdN6RHYPwIXSTl91L3sbTpFKzeps3D2DZWgGkgSFkWk5gDCW1vbzO+SJIp3KfWmsCS49FNRQBf47A2PE5+YZKMtaF98ysENJuabOMAU3ooDUaGAIBTN5ctslbW2f1oLbZe1iiMbMt10x9Kk9UWKiTWpVMKcaRIGAymQjTIJwCzNSyrOVki8/I6+9l5pl0OT8fTBPKtECD9ZlJFgIVSGZjtlDGdgfmOkLjgmk8GMjDqAXYqRNZ+UIweSZpb3idmGwhSCeYIal71Bq+rtVJEr39/ZU4Eo1x0utCv5tA9kAONojZeo2792spT619TJM7f6672h+S8T9I8o8w0PrvJL3forX+Y1o3/pSWTT9n05p72bD2viL5emXzL4pjffyItoGvEkr/jP/cKeGDpPan6s//D+MbwL1gKwnWS6CGClZqgmgJZrJDLG0CYQ5FBBOkSs+Mmcmh5Dbh196+uEZLbRVk/wn2OSy4wmxFO5RiHGsEzBXFZIDlJ5AmU3YjlZUFGbWwhSQsB+tTh9WAwUSFRBMemtVMTiIv9bDrbwFPlASxnEYhENTvc0pDE6lv419XNwSodenmuJhgM6TfpfEv9AAlGEE3jEGlDZrNHqBrsbb3dk0w2NSmIycR7EKlHq03Xn4JMcmiJvFoF95uxArTBkp/qE9P+HuZlh4lw0lkl5kYR6g+HEIbmt9/ndwEnyhImezBdSJJ58tmeI50fLbS5J7QaUx7+LhQUn8qK00u+71L+hzq0yW3P77uhL3xOh1EdI1eNeWjBL5GsL8mtw+Rl/+R1sFv0Nd7F8nMB1g/6wl629cx6+gtfGj+AB8+YbBIt586xK5p5/6Pz+pj6vzNbOpaQZj9MIN9IsfptygP/bPK+EvM/gry22XL/FBlP6HkjznXtdzHPVZHxj8aEo6gsbo0VGawXe3j9/aDLNhts2CNrstOoY28pHoh5du5a1IsLUiBBmUILiOtfVGN8i8S+xdgkfAyDiFgyrVTHeBYDQCd+GClHUXchMhGdRu5PQ7ysEulmLhgGiTapAfHUsoX0pvu/lvAEydHLCkiMDYI+IRNreUoyJ+jca0H0w1nbHI+xFySAfwr+ENtAxR9nmeHJZLV0pkk9lwCx6lvunH+7POad0+Q3BrPyLTULLuJ4O83DQ2fV5zv14Uxq5oxuQxY9hJ84iaZ1iV0TtcYvRBsMnr599SJIdVjf3qxp04whsHGMK/GZOVPhVXK08jsVAjHcSToREBjCZnGirEdI5ikofpIQlqdJpvxWNWgU/e4Ro91GWYbCeavRX6aNNwmub5Ih4jpI1OfEtfYzEePHeA2q+GvUnpaampLG8F4r3P8XL/Gr/d8pk3byto5yxnadg957auaQL6NNP0LyfBxlftjCCvBBgioDBoUzDQZJWcSk3/MYffQaGXbXZqRbLkCzZ0zQDVzwvtV3Uyd8P6MYFt0uc8maBHjmCBgMrxMs8ohnU9Ipu/23i4K9VI/lq9TG/QT9KddExjLKrtHpZ6BtXexknQCyz5yivJHV5PaCAb3CYTE7PAaiC8NJeo2Awtn64Z3sm4z8u7p/wRCuteigm66Id9OHpZTGuhFPue9nldaV4X+oyGX/MzQOSWlZo9BY4d/cqeGGxjDRs8TwAOq9T1qi7sh3LVbsuD7fqp994E9QrDlaqVNqPIElI8MWx3U9uSP4RDez5z9iNp/uyY/OA9slu4PZSZH8HEuG25LGZ1msilsFWaPqlnv300vAndq31079MR14n6MZbp2DcV1uNFa07Ybrp4vkzwE1X/09Vi2rMKgzRNeFxBs9qTTCUyTGdartt2odl+h5aMY96oeP1GdfFy4S/vv2rH+Uy1/jtlD2reC4XdA3Uba5xjBpAs+PuQ5xZd3RyJ8MLKpZcLgVAKdYI2219TPTW2Je1Y/BvV/lX7+jE3da3HPrb82udS87zJmwfNz8uvEd+6cjWRzH2Mg/yH1yj9B/mHy9N+Fzf24vgRcV0bf3ziEECyDao1qr5bWGBkOQfxnLjUTnk/bipOP7HpNXGlcIfuHniCrivDyTxg/UsVEvBqoJC7b4ZYCMlTyLggyZnnmvV03fLs2DZEnGzWwDzag2pp9Ss6UDMsAABAASURBVKZKrlNIBmc/i4g3QKBYZETg4BEIhv88y2D1BMgvJcggDEF97uBzGvMrjEx5bqOUrWIo7WcpgT2De/HqpekEE9E1jRFBxHfPk5pq2+ugetkA/o5WQWQQccm/Kik/SpL8BWn+fozfwkq/uVtK+E2y5Hew9IM6/r8gfELpK4TkTtywDaxRHtspDGNRA47EIH1Ou1uFybEETtS9oR3TpClNHIK3lclzyza152rJ+6CkvVPp64T804TwN6rLH4P9jpb/vdCJkPwmefo+1WyHTvAnOn6b9Odfdf438a+xFrplG/DJFIq+5LrHERfcq9vZ0knKSar7KdKJTmHc3LbnbjqhCY8QHpDcP1T7fwXSfybY/1H6IEn221B6X6ETxXjBb+FjBPkfaJLwL0nsk6rz18DkueMBLVfpuuH3NIsyODLCUrV4mrVq7Jwpz2Gr+khygIqP52Hvh32S6AG16WdJ6t9gcOAxju7uxcmodo5n4UXeSy3HPb7/0L2ddMoTsmG/r2I/qvHnI1p+B+wpwCdIci0nKgqXIIdhGCDPtZyoYiemnEYq3CHW0AIfXTBI21opRarBJHwE7D8xe1LLAYLfwIjhUBEwpCM2FeN40mQK92kNBe+svekASeYTDPLwqvNq9wRGkyQtauej8I9dDE2Zgt9UieEwR8AIeaLZUOnlYVDTWx+pUKrNg/wy6fPpSh1KzVA33fgQAQjryMobad+sdfN9u4Pevqys9pgFydnqi030+PXuYu7YyrTswz8MQrhHRsWXIfw1uf0hqf0FSf3j5ENfpjd8n/7eOylvuGu3lG65k2ToR9j2bzLY+jld+5Hiupw/UJt9mITPCoMfAo/j3r1A42bnJcQhxcCz23okGV5KSt/QDOmEJj8STULSzJMfXssaxla15TJV74eY/auWH1Ltl0o//hRr+Tsq2pf2f4OB+g8Z7L2j0ImWjXfj6Wmd6P86lcFPSX/+hrT+J7r2D3GS7F9yhZ+DCJMbrxSklyMqrJROZKFbNT9PmMxV3ZtjMk+CPCsGRC584sM269hjBPsB5P+C8T9JMk1y5X9Bvfx/IXyG1vSbxceKdh0nfNzwMWIo/Y4mzb5AFv6fyN2fE/hDjL+iyCu4nj2GjxE+MYaOcpgHtxsHq63koUe1bcX017AqW01Fa9KBb2C1H1LevqrgEksn3IaVGLqnOun1d4HbBx6QLfB58uSvhc5nMHsQQ5On6jk6E8b5X1DLwIDUcS2WDTB4vPrCOJc5gdk3g1F1CNWVonz4eBlhXauw/LtqoI8S8s9LQR6gGEioK/PR3bR1YYxCIKBhKXSoAxxLbp108YzO+GMOVhnAfPAIQWdPcAwlFditAfQMyttmsJJU2zFGBCYHAv748uC06STlcyC9WEKLHISylo2PfuML9EKyQgbBtr3f+ILRmshwyRdgHIuFNgluSs0VAznYILBet/OfK30G40Pk9r8o22cKErNu7f1smP0U/niZf1zEHzXb+bGRXZe3zenHDRP/WMlDM5/Arxus/3j4S531vyYk/x/BPqqyNDvPE1oXhhNkrKjQhsdFqyqkNhez0yGfLnmeuV9oo2lioRP4xIcmy+175MlHlXzC4++w/ItQ+3HxhdUwZRlrutcUbb4vvdipE6vnrYI5j1LqvZdEJCnp+Iz04X+S81fC47Ngv8B1EJPNQgPulyr9UGKSqh+NIgP/uZkskU6EU8CmAc16n66DybuPiGj4tvTgI+TmOnGb1r8o4nonYeb9PCqd8Mddp03bWjzyuuv44OOG64N77GbPWo+PERvW3lfok+tVUr9N/eLPlN8/ABojwhP4F3kn3SSIGSSJJnZM9ThwXIeRpRX1i2lYqOiCkV2nE8c4Bgje73+ptv0Bg5WVFBzCtH+MSzqY7JZaXujS/XNX0Wd3EPgUIfwL2M8ItpGJmDg1lUKyDTPpZEGyGXUwbNTXHsyFB3FuchDnNumpUlKfGdkwawOhchdp9klC4o+O/BBsNTCoJhzdIK2Lj/hohdK2gM3Eyh0MLUvZNdSDvCW5bhI4xhM9YEh/bYoGr5MoV+ZRWlfdVbS4flgiELAkpzTJv8bsj/8uXjEVq5+l8eklWO6P+LWqxUypGWKG2VYJ8hA2dQubiv6tzV2ie/GyFpF1zgSTd5cyzRac1BhOOB8n2Ncx/l5Yf5R06D8Z2n5/QWScxBRf1LQMNzqwwD6Djvk5/ribv9fl1/n1Tn7rcx6hnP+IvPRpcvs/JPyLyvupslrPZCU4HETwJ2uSpIM8X6Qx2Z+40X1DCBxEFhNwaqAwHG2z2kgkJP83kCelVP900Xbehk5SnLB427pt4W3tbb5PvdhFJ/x8Jz9/3dPLhtbVhY5Z7Rv4T5eQSffCf8qIfVL17Jccfs/U6mEcfZzrzDTpUT5DmjBPdXai01wVDqgdNBkWWKs+e6d095ME+9+yJT9NJb+jeLdyp054+xb9fn9jhfTBdcV1pjj31CFcnzwPf08zTX5c5E32v3XaPwmXnwiQdfiEXCELzR5MGCkJrZFKuki1rPaWyZJOYdvI+4TaOtks3H9BKD9JqXsAbdAUQXrj+nLC9O30Z78k1P+dPHxMyP0Acy5jQ4yvftQg170qeRCyLcw9TCZpUzO2lSxpijYeCyH8hjS3axst2f2yKzSLmv2tsv2ClOR+sM1o5zgrCodp0KBm7kHtIs97qEwVoQza1xS1lRxB8iTzqNfPoF6ajt9cm0K0KMS4IXAoH88ZN6EOImPX0fnLpzLUchaWvlJXPldphpL3My2aIBo12QAbSLJH2Na/jdvdINxDrgXLJG/aTbBTZMB36Wiz3U/qGJvw2XHLP636/D2DbV9msO+X9MzbhHth/L6hAxxSkJHi+bgh7CTHv+Tps/NJ/RPK9m8gfEP4HP4EZ6U8dpZ1EWwxmPQ57D4xSoNDYSjaAJasUJN/RwT0Y5TsE7QmPyKb9RTedt6GS00Gsdr0kMTV9a4TrmP+tEBf74OU0y9TT/+f9OHflfX9mG3RMlM6fGP7MhGciibC6merkt1KzacTRr/kWoYlX1Pb/D1UP00p3Il/OXfMdEL64Hrl+uV5et619A7yTB48/g6Sr0iGx3FZCj3VVvNH08SejVjMmvhGkrWojglB/0d84VieaBkh30pIfknau7kpCZ3rycJZ/QwNLqNS98mxf5JefkMoSEelq+OhH0Weth3sUer2MO1ZLy4HowxmI9eLURYxosuSkJDUC1mazTgZkfz7PMkbxz9clc9eQVvtBzrv/5HbR4obG2GZulev9tWVgtIRHg+i+kEKg3VAPo9K1s6Nu8zoFR42y5RbYzA1Sho4e7DkHA1is/Cbq4SJccwRyAnWmDbetSouQ6Dxcuwq04jXg7EklOla1SXSdS5J9kpCcokun6kk4qj/zRADMvZ1U83sCSxfxdCqAbA9MFddpk1rAeYUyXzSSSOsNpok+ji/Huz7mP19YVSm/AT3wH50wSBLndAwDkE47ZydX7fxUbL8m2TpPwi+z6uwR8H6pL2OL00cTPKWDvq9+OojMmKTqarXQtVxipbNY1+4TpsNSiYRivwLqt/fkdb/Ayeh/jjqbVZDOxmP4LrmOndv91r67S4S+6SK+UfdT38MtgEOEw+KKrJ7DIa/5kBYALYQaLaPlWUYvZj9UrJ9nqT2UbXJt9n41BPFxIdPVoyLTmiM8Lz9UedNGx/TfUBEJv8ISfg3gj2Iy9T0OmEGsgvL2cj7uInskpZVx5Ffo4YZ2xhyjD6orade1n2AMLb5j1FuS3V/8jFj7cZV5OG70pGPEezfcV01RErHeMwwdI8PT2H8WOPTSpbP91ctRl+ZJnRINFDpRo/j/q+0gN+4/AedQ+1+qgOfI0v+txTFZ0fuBFsF+ExepmVzKroEa6poJARa1RFmk2lmjj1C0NE9dk3gpul+1EbOsaT5sXSV2jQI26jKjxftHYFQEtENdUwoN7atUVtrzLL0oA1xGhz8Ec/3LG+hvGouVrmYev4aSF8oXRVZDM31aJ8V/Xmr2vuX1No2wmIfK3cH0Ce8hvo6sfxE1WG6rkh3P6GhW3WVvkEyacLTPiJj4Ru4UekeFTcysfEf991Y8cdgt8xcT5LcTUj/RfJ8XkU/zOQgvBxcCMbG6VV5enowm6l6VnW9KTVHHCa6T2hC9Ku6m32alsqP8ffj3KBcKsNy3KW0wM5JkNbBB0nyLxKSjwP/xTDhdZ3lsAo+RmSdneTJCWA9GifKNE/wMa1X4txHbreL6H6arZWf4q/Deb+VAuvYOEcLeFn+ePP29Gdk9q8E+4zkeUAF9xLItWzSGAI+8ZyXRj6W5qbxQOTYsMZVymXw0m2QUk06oDbwzaZMks31w+8hrpuETzP8Hu9PKMYMc0I6cvzZV/B8Cl6ksaiue+bAeor75L7OH8F+swa28d7lk+G49wOTfq/fwPw9Cf9ohL93kQ59Sp3zb8ntc6rbzwms1TKSXoFwwBg0OJnIbpARUw+tdMlcINgBr5u4E8oYs1TcWfRNmcESmsdLJqEmc2xC2YO0L1A8UdCE0u0pkpPcG++tsHLVdHpbTqZWulZG3xuULleaq+REt5n6kmqgm58hr2i4n85tW9jbI8zclzJU2vnIqj/CnOrCZoiZhqatSj/RmHC7Jud+xEPd6wqjckIM2D0gcKPBX6+pC0uzz8lY+YLa/DGGyVfY4+zJu3mjemVnaychOR5MekGz6IPgpqZ/qwl8S7h/jkr5XlZM24aTz4nWiaWWFx+iWb9+OUn7d6QP/wT8mGCbtGxuwpuLqEjIEUe3E/LaNHmlTiIwRak57M2AJm+tn1xe1BA+S1L/AtuTB/F3Jb2/jriCY3Si64SX7e9pJtmXSMPnCfYwRj8u6xgVM+bZGMKxlh9UvmaNH/PMKlhpCm2tFY0LdlDyN+Jk18md+pHbv4F9RHrxTcmuyTvzCZsMbSgdbFRb6F5Pvg7yH4F0r7X+CJvm+BMwB5tX05/fHIPPuMFkmjmzrHgkZf2mx6H+LdL8IyruNrD/0GDyMy1X4l/DC7ohNvPAQgODCalAFbPpGiSqbLrPnpamXklkLzi5fGbf0wcnbMVlcO/SaaSDIr2ryhNW8pFSkCUaGI+Uyu63niM4GKx4d/yWx1tYt6KL6TNEAEqXqZ+8EeMWAs/VciYE3Wy1RlMFtXPog2QZSfYEm+pa1zi6p4hd00uU8y6wo1WPNtUiofEhEGTEJuFBzB9VzX5MMnMjBamhcWGp5fhvOG5PHoL0i1j4hjB7CqzG4RKc2IQtU3FPfwj+CHOzkN06mH+z4w5KyedI+n9REN3bZRfQqKD+5B6bvHUtFfsBif2L9OGn0t2tksgNVy2aLhqJejkHE3QfTpIZkByFhWYZI8Dk1Stea8u/Ssm+Tp4/hr8j6f2UBgUv22VI7VFy+zJJ+CrYsmFZOTyC5a7bGvOCLxtTpxASTTB1kIdjGOrrxCfpGiPJwZW6Uz9aNovgBuk44BgLAAAQAElEQVSs/T3GZ5SJOAwiqzagdcdV92+t7T/6OXWNNyLKYQUh+R6kn2Ww8yf8dP5WGjo27l/wQzmaHMrFk+daC8XMvn8oYqD3AbLwJQ0mfyv5/yfkt2P5HVKcZRQ3RX92nZEqDUdQSDVItKuDpMyu2tP1rmQiulYFc+Pmmf1MaFC5LgNzyZLjqFo77lGbUBEO48J0e1D/8AGyeSqZl9XmjRQnqHwl17MbQ4r/jNCSUOYWEdybN3bSs3IurdXF1CovICRvxOxdYNcBp0CYpqX6jf43X9RMvW0m5D+n3rqO3gUyTvYQ0usMbVA+CvJpYE1SF6thPClj8Wvk+Xdora/BX2nZQ/yGbC4V4R2a3kuvPUCSf14y/EDYyUhBZExbkz0W7+uWO4X/UUrtStYEVfLJDzcCfwn2Jer5L3jg6G1NY8y5bg51ryMZ+p7uq/8K3K+lP20WtN58MahVW5KRtauPEUnSQQjHQugmUGmKCrlTg7BaNfkuofQVtqSPMXfOAEvVP2lwcBlm9vTRmzxCpkmxgGRkrbCrNViyPYsPYErkHExwOyIviG4Q/uFgLh3Dc2XHmiZpOZtay1G0rGmRfo5Mp8dQiFFl5frx4RMGiyeV8nAnIfPXIP6G3L6oOtynPP1+0r9DXzItvX0c5+EU8O26zvNz1pKEn2OJnH71jzPY8l9U2jfQ6Ilhxi8k45d1E+bsyuLv6MyfuY7ylvtpHfwG/rtnxp9LMT6K2Tcl9b1gK4Ft+KfgEfEdVhKO6GDBB4QKiZPbHUhs7iwxlLZCMxi7IhyEGVh+Mn1tU/k2R5ZuM84hBB8wx7mQEWVv6qsiV/IUpN2t3PpwtSFpyapW3ri+o3g8efaKOSzcuoBkzYmUppxJW34p9dJNZOX/hvFe3VBeCeEcpTmqYav2NbNu+iNM8jqmd5HX1u+VGBR9K51KUF/DRNyDT3Spag2NmqAMGyG/i1L4TwZsGVPne10aI9TeSvUZcye8SXYvIfm80s/BtkmfcyZ10L1h4/QqaW06iNhQEBtrfJWKyY81Muq+C7W7GNq+iWYz5pzwJr2rKde+D3xNY8NyMH8Xj6YJQe0bJFluI2/Tb5NQa52iq44jmC8bP+a5HWe2BexO0vTfaU/ux/vjUmue/ueyuEyV/l9i2Zchv0fyHgZjBBBCTpIOEvSnzYZEk15a6JQwZ2D159GSzuOWZVVtj1y3aXDwMcyfFKpsf5Rq/etgfwf536qvfUHrd2P2qBBeq+UWgm0FcRlfmq0HewLjZ0LhS5h9DP9po2TohyxrX4+PRRy+ofED0IRjawEfUHyGxD9i5b97NpT8F+X6Jwn8BdhfAp8C0w0y+EzrcgxXmAEdryn5wBg4soIGAhHaJLSCSIaT3BtJ6K7JwMk1axtaNJA1WpdUftKpuasTqPROpec+bR9ZjXQE1HZYD6FH2nc2Q/n5ZFPPY2D6OfRPP6tItY4zGGka7DoTTzuv3bkcmqK8lTxfT7UZ57Jr8jLzygVUsktIKtdQq76KUu3N5Ml7SPPflnH93zF7C8Y1YGeoz8wF2pRSJdVB/5sz+mzwZsl7P/nQU8O/QbgXQb1vJTaFYAt1tJOgmmqlgTGobB+fHye372iy6xEGZjWHt0aC7Rad8NbmbaU89FMsfFlYPyr0movcYNLRJCEd/smG3eTf24bfC8rVNnnKjibYVALp3k6b0H2BXOX1Kt1LPf022yvLWbCgyXCWdB4/fLzkKj1FGr6N5T8RfluVXH4/2jwpQXoxQnEW6dzSgDz8YdjTH7Q9wkvH7TRjSFI8qfRN8tb7+Nm07XudzBs3AUaY8c4xopT/XH3qm1hYIZmHRnh1c572kDRas2GQb1d9GuupDj4ZZ8cI06t1r34e6fT5+Mcj/WmE5kTv2VLt5DAzZm+go/9eBju+KBv8f2PZn6tet8k++owu+rqw/qb2a1wJvhQZDh8lsw9j9b/VKP0F2gceYNbRW3ACzeEdksO7egeonSuMz2b4J+D9d8+Gtt1DafBruk3+X914/gySv1Jn+Gewb6uryjjhca1vAPwxAO+wbhz6TSlo3+Efi0Gi1EFrpUSXulPdZMAnczBraYLKm2RokVRzwGbSM7NCDIchAqFM4BgCb6aW/6H66p9h+Z/JMP9gkfL0DwnpH+w1DR/7Iyh9cDgFLZXS+geLa4tl/seQ/GmRkvxPi7xD/c/YNeX8GWmua5P3k+e/rpvJWyF7tfrBtRAuEehnSr4F2u+eLu8bqfaZUrNHjWm2SpjeTUjWM5dsrwL7+7qWOdmdjWmiy9TraGjIhbd7bH5BqX4PrNvclEbsToj8nlPJ1hLsB5gmWjHNuO8D653XTNxSehqUDqJN12GkWYd0fwGWt2srodHBiU0IKyD5LtXBh1gxvY+l5vdqmijsEMUC63r6qYWHyO1rwu8xzJrrqYQdko540b68hJWlEzZLetGK6W/EF4/DicOTH1s0Jt9DZj9hYM0GmtnA9zGixjqS+h3C7+caK7YxXAeaKIzc7u2R9NXaICGV/Wz+asHIrx3rCpvGNgvtkJwuqW4Sxi9mID2FLcun4R+TLEhvMCZDWGo5H5o/UPykXmXrg2wrf5fy4O3k9f9DGv6EYH+ksfkPimXI/lL3x49TGfw6/YP3saZ7TXGt5zEZ6nqIMjb+pnSIFRibyy3gs2kfPXaAnnmbsO7HqQ7eTaX2ZXlt/p9uQH+MZX+EmWZMwpcIyZ0q95dSoOVg6rz0aTlIQMYimZZ+U/XO7InDIhQv9lPRMNEpbCr4O1p1ayfkR0HegekIDQ4hlAg2Q7OhJ0mkqfi7lA0WadIX37U4kIVAIFdqBn3WTSi0EcJCadwZBDtHunce2AVFMp6nfc9OcJHOex7wXF17YZEsXICnndcWy/AcCOfvSOfpmvPAzt0teZnYWSrndOBkAgvA5inPbqBTqUXXlZV8fJW82tPs0dsX26rJvXsh+QX1vi3s7SbohkB71kKeiujmIryUaXiwIYItx0QeQ/IUzerB2xUnf8Q67Xtcvepb2v2Y0oBSM0UjL9mIBHJPvw14nzwKTPcERnYd4xQKXaaXJHmAJLuTrZq4aWZi4zC4/eF9roQma8LdGks2aXem1CzRMCvRm/qYtn+ZfIwYyFs0QTgHQxN+5mOE7f+inUfHaemTB8aTkue7hOzJSTFG+LvEIVkme/PbGpeXSfYm8u4G2bihPuLWWkygnvXKjl6ua3rBdD2NDCXd47swO0+ivJZQeR19rZfS1X0iq9d0457eJaGM6zKhsbp7QJRsmL/406qfnL4N/wUa5jzKurX3s2nNvazf+ItiabMfwp16znE+umAQH3PQtQfM/yBP8I/WhjzRVQ3Gze1Wy6ilOZ314AJJphifRmCpOqHPqvlsiT8i8OiUZdS2/YLtle9rxuTTJPwVuX0Qy/8KCx/XICTyyw/IuQezh9QvnsBYB2wDG1B6hgTDMBEOOhuagThwUMEspR5a6U8StskQyirtGHMhkaGjtYPKbFxOlgctTJW37USyLdPoUmuNSzEx04YiYGpXQwZUqKob7Ui0QpHa1C+ll5q59dnbnQnadHxfaee1O5ctOndH2rWMvay7HJ4gxSQX+s8kDIUnjKcw+y/ht5x9Ecb7MPpntOJkF3M8G1vZYiwNWzUO3ydduJ+B/q34GE6TB5dx/bZerKZ7Rn432Eb8/qB/ky76BwstrRKS6QSrSkOsoXUw3V8Dm/CPrNUqy3lq1uTwknqfq9eXk9v3NJIsE4bNI7epVXMZsFUzybX/eJ/ODT1tmB1FME2IhQNfs/8cD+1oMUawTfp5H1ly3z4n8g6tlLG/eqnlxXvmac2/1H03hU6Tj31Bo8wxSKKsNDI71uuSlQfJbR3+6yfqnKMsdSwvSwmyF41TtHy57h//DUveBsmLGKyeQ7ryuIL4+vc5nPi686Tpya8FnMQ6h/Evvu+ain2W4W2hmzxHWIhkd58NLqVxpfAZYff47pwx8dmSSvZDMvsCSf4REav/Ib1ZivEHkH1Iy48p/QfYd4A7CchTYo8Q7Al1ptUUnmDbBgwSaJ6BSwIdMAYS1blMkiTUplQ0S9dFsFm6rkV1brwumaQAER2OgcpUhpalki3GIwMBUzXHKimrIypmBDbi7wvm/KQwsHzs2xsE69THarVWkjAH8lZtNbbfm9Ul+xqwOzT9sXKfJJ0mDLcvrlHK1hCSO2RsyeNhTeS5OQi8Si0JpVob0Cl9KGvp/VCLRkWr6U61Vvp5D0m+kW/TTB5S9hm8zw0Nbtd99T6dcyeETVo2h+xBLWtCtWYHbtsunZdv7gTzVzk6dWVjxwgZZoBGruwOqmEFPqmgHZMiuqwZT2iM8wmQ5dgkfry92puR1HuxsEXYDykFpVHFMbvIpKuEFvU1OW3COcL55eT8KnX7bbLK28iSa0ntPFhzEt1rjmH52p7iw5S3PN7CklDGf4VhUpBgjvjQ6EFoEjWADc+Y+EzJX/f04l90Xj9LBHbWgwz2/ZQ638X4D7Lyx8myv1LF/kAd+/2Y/bE6999g+Se0/m/qTN/AuAeS1RjN0eEl7IiiSeJgJUpDJbryDpJ0IRb8A1WlEV0//icZWAWzGZB3i+9WIWgfMYwWgU33GakMHCPB9EcMhxkCQV2kH/+CY5JqDDvAI37+4Rl/ZBVm0fgnOmQshQHJvlxj7QMM1TazVN4QJkvQPaW3JuOPhyTxAxqrthJkamlj8sRg9LZXdN/rksytSqbUuDiMXy+5PYYly6luGEA3KSZLcHLTXlshPfg+wZ4EcxuBhgczI2dkbev3jKTUqgmcWZhpyciuG59KaoywQfWtlZBPvjFiqeW0Z73ShYfJ7VFBpHVyLRsdTd3q4Oy+weNzTTv1QlBb0E/QX6NrMVy+aeGOkTZp6kzMTlbdLsLyGzHeTZ7+Dknya+T2etJwLdX6RVQ6z8B/fcF/hWFG/2y2LJ/Ge5a3FL8M4STY08SSYFUhxv0hkOzvYDy2LwQs4IPQ7eTcJprrz79v6+4jn7WJ1nUrsfC4OsWDMPRzKgN3kPI9stL3yewH6jR3Qf5LJf8oSU3dXYMxkyVoULCEPEmp1afJq32i6jFNA0Lz6FEICcE6ScIxVLJ2bhRJmyzoRjkjAhOOgLxgFlbJMP0uee0nlLdtwcc29hH8Xf00qRCy6RA0saTev49TJ2B3TkCeMHtEY648eXNqE1Dm2Bbh5KbCao1Xd1E89UPGZApL1f55rQWrz9Bai/RI94iGVkD4hY0k/Iyktp7Vx9eZTMH7Xn1AhMYeA2smcsOIgz/WHkKLxodp6p9l6UXjdCJIAgu9kkGOCZPNNQnHiOXzh0hr6zTGucd/i+rSDGR3xOrw9ImbZC9XwnaCLSOwTfVoNtvXJKtIr+5r0AE2Gye+wS4ktxdB+jpC8qtk6e9h+e9p/b0Uv8LQeyN91RcyUDof/yUIW3sKtnUBToLXPDn1iCPBpaEcS3I0ACg1MO5edLL7ZtzaWcdgLgAAEABJREFUKwL+nH4xU3NvhVseH569ufXhKv77XP48/xvXdzB/+VSGemcwOGOWiO5RZGEh9Y6TqaenkdkFpPWrdQO+SQTxVQS7TOk4ldWKaS+TJQTDkoTQVoa0G5KF6vAaFEiapgbmsuSdBb7ZUCddvk0MEYGIwLMR8MeXt2v3vbp5fwv/eZbiZ1C0Z1/R39VPgsatpFOnHNzMvi4Y0xjIMdssgvUAfVM24cbUmBYwAZkttbzwSOeJJkdzf9qnNgGljl0R92Ek5Sp5aSbQoi3TsnHRcJ3eoP8PU2/dyu3SkcZJM7qSnaCXaxsIdr90e7MwbTZSsJ96BcN/mjAt6R7MFMle1smN0wkjV/n+xMQj5JWtTMYxwnW4tb5V9XhQtdkAmqBkEgavR17bSpL6x103qgbNPNa5zg4TXwvtEGZAfpRkPlE6fZaWzwd7McWvMPA24Dc1Bv4hofQBrf8GDLyNrP8G8tbLcRI80HU6ToL9PeDZK+awctV0XrumLXqChdYExeYhKRNU4b0Vs/99Gry3LK9SXjWXqT0nFY8vDEw/B0+t7edpAL2AEhcXMzst/ddphvvVhPLbRQJ/izT/fXUAV/53QXKjyrlYM/ina3kMhGlalpQmUbQgo1hpUAQ3P0F1OFodv0UVMKXmiJIOf7wSNCtXbsUfqWoOyaIUEYFmQiBImAGlxwnJN0mzh4qfZ8F8v3bvLWosTDrKZDaFHBkAJmNAI8DeTp2IfUZNxawnt0fItm/jdpNXT3smXZS3KdTXEnhYom/TMtdycsQuTSZaWtV9TZ5+qhLalBoVA8EGMVtLWl/N0JZB9qvPNGdwPe4vb5TXSN5p1kpI13MtGhhDCGrp/YwNO2RbitFdq1LLXR/aRNYbbWPWKT7+ljxMe+92nHAx2YLG5E31Pix7ktTkoQ59qsGB20InNVdUPfrzfvKwfLge1i/5JkM9TFrtepxqWZbMbvNqMifI4WP+KwxyXNli2cPnKTkJvhqSV5Lkb9e5v01e+kOtf4CQ/Dr+HvBQ9SbSytV0lp/HYNeZBQlm1UK6Ns3DH4d2B5o705aEcvGLIu5sY5IFHy+aQ2SNW/VCx7wBm0OkZpXiUlI2dU2lXjmTkr1KA/6vFSTWwh+T8yda/yBJ+IDE/y0C71Z6swb4G7R9pZYXanmmlosgzNVyqrZbig5jyommDfsWLCRGPenCSiLt1gOhuQi7Cd3i8crQRZ5V8Eeq9l2beGQkCOTCNIR0JKfGcyYLAlbTWLVK0n6PdOiH9A2twz/Gx36CG7KtgxWNXNPEIaoazxp3/wjkklSGEyso5+sZWN94QiCBRhU3qS7V0iZI5N01LZlkpL2vDLnubTLORgXAGF0UpNEWBvR/jRDspbJgkuG4Cw7b1gxCENFNVoA1nhSYUPVUDoXhyL6Ce/prLS3SZX9fV8t9nTgh+11Wf+dZOGarVKJwNN+n1UkWexfUqLeuE1G8T5K7l9fHP61Osuj1SGprIL8HwnpplSYjJlkdhsU1WUV+/0u11PgXKtrt+t6hOnWpbnN0f9yFBHOxzrsafw+YsIQs/3Xq2VKd9wFd9xsklbdj9VfT13IV/kGswWmLKa06np6Vc/FHoW95vOXpD2IV5DeYrmveGIRCk0nnjdVkIjWZOP4lx8pWDS61hwn2lBS4QuBYKe0ZYGcrnUWw07U8RcdOwPDf3JwNYRrQpmVV+8pa904x2fEO6pAlSvhs1ukEvI4pzRU0CJgIuAn7quM+RtIdwdnkZtLhRO2daGlHMBKHS9XrGqs2kIQ7CPZFqq2PsmCBG4X7r999av1seosMrhmY+Y19/+eP51E3vEm2aRx+hJBrfF6cjWdx45q3e5s2Jdux7FFytgrbRhqyAQpCkJEMz4izv+BPzpg8u5ZOA6sAiVJjoutE8bMmLMffDfRJhMZIMgalSp+zdDPksjvYqgwbqRNQGK9JxuAByG4XCUN5K6Vslq5pwbRNg0Ihsw0Qwjqp9DZ659cbJMmhF+tjhH9Z3OwXmG0Ca3RdApbk+PuZHETwemyrbMSyn0g/Hsfwp4vCQeTQ7Kea6uRjYKql7M/gY2KLhBYJDtPx94AD4gicouNnSS8vAruaPL9BeLwZwm+QJ+/H7L+Tld5JXno1WesVtLWfS772ZBatPWbvP4dEDLsj4DqlMTOvC0dfb+BAtLtgTbxlgeLHvcMykuxrUsZPaPD8jhTzSa33SXDTtit1GaOsbREtUq27wpu2D6Po3j3rUn1PU93nKVWbt3KhTD2vMtieSs7DrB2aBPUoxmREICPYVo1PP4f0K7rZ3sfPpm1nqenGwIFDurmku8bw+7qmXA58xficEUQLybeR2GOUwjYWE8anoInIVfeY6RvlybP1JPlG1cS91A2sjxOaPN9pJOwXAX9yJliqe0KLxlmNtfs9e3wPBteJ0CedXk6W9E9qnXB9ztkO9qR62XbpxMj6J80QsjL1pEP6UG6oNLLMIB+QNbaGWusADwnFhgp0KIVrjBjaMqjxYR25bVNOjdeHUT2qqnq0T+9XuzymdrmbYOuYrO8gc1DB75bOCVL153KRQGMmIsF0YcxSEgm2xWDPgXA5gesJ9mbtfx8Z7ydJfp3E3oj/DrCVzsV/Dskffd7p+b00lCi8vsSwFwQc/L3sjrt2Q8ANwdvm9JPNkme3/m3dTP8vln5M53wXwjLQ4BOoow2lwzOauhwmr44tUAc8H6wbNFzpX1NGk2z+IZ16OSWGiMAEIdDUxRRkgF6S8KD68FcI5R+xac0GDvT4MjuCe23q7RXyZIr2+Iy1admYaCZjz/o05K4iS/tZSmAyB/9ZDugjJOs00sobNYnqY/VEZNcnPhs71rpOJPRrUno1Q5NcJ5aq/ftL/QRbLXujD69bY/U7UJDHEQjhkx+ENsxK+FUjuGRcTvHxLiS9IgorNEZsp0fSjEtBE5Rpb28O/u5u2KSa+JM4YYJK3nsxQVLs/cj+9/ovmGStq8mz72M8qDG8Txc0ti4SoEHRhIHzMB87S8LC76ttGk+nav9MISwCzKn4F6GNa8jtZvx3gAO/gyXvIeQ3E9ovpdx5WuH1XbeiC3/k2X/2SBc1qE5IdmmHNVWbOsjEMBIE1HC3WU1e3o30hZ9Lj/6VLPnfWv4Tlv8QsyeVi2bcbIggddRGk0ZXQBFzyYluAyMVMiBdCZ1YWIzlJxFCB+b7aMZgYBo8rEy1T7NdkpQYIgJHMAI+JpmIgNkjGp2+qK7/n7RtXc7ti92LOHJg8r6Krp1a3JTDiPrVyPM+qDND0OlDJNZLX6+PZ76tXZM5tvSBrQJvJ91FtNKgGLAkH/EjiiFJMZNemO4RDZJ4Z7GBIfK0l3x7DXTPZrIGyV7eOkSabyDYdvU3f0w/NH1t/LH2cuqeq3bJWlZqXDRh6JMfxhoqQ/34I7SNk+bQS+5arFHcNAGSr5FqyzuqkfzQcx1dDkHYGqPUR11LV5/G7gfJ7ftg/l66k3diKBAwDB9LNa7ifahF7d0um3u6lvPxn0PCnot/DdryN5KF39LZ79P2G6hXryw+ojtj9VHcvLGTG++tMNHe3qwcCJbTZMEBbTKRmlwc9/J+fFYfm7pWUMnvIKt8Ekr/E3ItvePyONhmpUEoyOQoBwRdPbbR5fAbpgyqsEZZP6U0oOT7tThANHUn6ACOI6BOV3RCbTZpDMGaVLIoVkRgYhEI5BjuLdTYFL5GWv8qpeRxps7XGOWGx0GIkySafU7awCeTaFTwMStTnQblHRiicwTvljZK0r2Wu5edm9RG5aFegq3UUS21rZVJEa2cEJBekEjeRo270omQQRgkSw8PnXBPXmYDhHwbQRPtAreh0R9bLefC+QBS1DXpYaFKkD6YeukBTh/Hw4EQhqQPW2CgNo7lTEzWPkYk0gdYC4nbbhNT7r5KcULjxGZfx/e33x1H2zUJkSbfVZ+9A/L1Or2uFOPeETD1JB9fU4Y/wOrkt1v7FpCE07XvcrDXiAy/R+m9hPQ1dAxdxLQZJxQ/c3Trw1UmmvTSXMHBay6JJoU0FvCfB/jrnl7SKU+wnf/SwP6P4rZ/ieX/AOFbSg9o3xqC9YL5rFVGKAyYA98sGKMwXJ4MgKJ8v2EuV84/I9hXseAzahu1reP6P7LoBk2bOpjPNo3sikad5QNxUq+ztSNjKYEYRo9AEoIQzNXuuZYRy9EjOfFXBo05JqKLPY7ZV2T8fZ6t1YdZ19PP0oOcfXWvTWp+0238I6vB6tLFXo1jGasHJ79O+juaWV8/SS5DNgyorSZXnSwYhxLG4lof80MyWOjEWOTXDHmYCHySqk7qx0Ea3wwy7U+Gne9wY2W1Q+PtSx8nKln//8/eewBYclT33r/Tfe/EzXmllVihAEgiR2Nj8gMMOGH5wbP54DnI79nm+Tk8A8bYQzJgY2HAgJEJImMkESUQEiAJIaGcd5WllbR5dnc2TLz3dp/vf3p2pNVqw8zszNyZ2a6pmk7VVaf+deqEqu6+tPbJzrGZNaYOhHOahmzoln2pSRDxxIHyzJRzg8sHSfvvxJPvQXITbrtFuvpJ/8t4OAQM02QShE3ehvt8jbdVOE9VeoXSW3Tp7STp/8arr6A+9+Tiq86x0ssUyGrDRY8zjUIyjWiZgaSYEzNUX120h7uXPUiaXEOa/ReenqXGfBxPzpdQukqMeKe28ahGrPiGkIpZxn2d34liilCHueqOGbIQiprR9A1F/W5Xgv0XZp/G+CG5DUEe/W+MLYw1/9hKn5jcrjaGMSzjsV4Kz4nBtCxlpiHgSBZYv9TO/Xh+kYb7t+mtrKG2qK+YrBtPe3KNLHfNLo/n5gm6x9UiCPk5QJ42WHiaT1DJzSumS23qba2RNHaSF5OT3jxioo+lGxotoR+aSMaYq85Eea14/Ho2TIAEX7vn5FqtDn4fMxxNuiGty0bwKq6JsSaRoGo1fjRRYHmNmmSETsz4GBNi1cFBzHbgBU8cSZOO7F5zx/AjKiQWjOrHysFNblQ5F6q8Nbj14uQ6LuNYELDC8Q293Aa+QFiu1vY5YL+hK39Kbn9A1vliFh33BP60u5PinV6OqjDTlNk07Rxz4iMvsdK7deV65vTfhOUavLVPyfn9JzHev0H6dW0vAa5TukOMuEHHPbj16XgA5Hw6dSIhQ27fFIN/JD32/N78updYvWEPZttU1oMYt6mOy/D0G9r/N9LGh6H2BZV8HWZambEn4cl8RJjSLIzeIElqLNjTAHPKUCJwNCEQ8sLoVZPvkrL7HnnlPPq5/YgcXRUmpWmYSnSl2KNJwchVc13ybJaMbcmoQlapl1LJLjWujGNAwKU5C54w6cRK8MYYbp7GWfO8geWyD+S4NZtM15hrkZMzOjoSzG10WSctlxMru2P9eZxJI+cIC+7C2dqhSfxst2RwHbNm8/mR1x+LRbVdW6ERjzPLZvY7GNZb2RGiNY7bZ8ktJt0MseLbLh9gpdKzhOkbtP1z+QBvEhc9k86+pRCPX1cAABAASURBVLxtUh9tPnLeYGJDMrHFHe2lmROzVR9dNciK5XI6V95H5nIu5fg2qp+V8P+wGK1LKJ1FYl/V8Y+0fwXYtcDNwFqwe3F7UIypFVm2AN2EAzuS4tjjvIezvE7X7sa5HbfrwUYExhfITKvL/i9Y1Kv6Lb2Bat5NpbFSs4Ivh/wU1a9ZIGZhkEL2pEEjLQXmLOzdskmHRMBxwhDagdutSudjjW+R52s4eVEvIZ8OefshLsYjioZ0hlUkO5psyMr4T7S6YfnsGuONFjlrpjZJhjEDwp6K4Y0U01/zyc2wrEZDvLFwFqz2B56mtoQuczmaQjpOlWnUCOSYNRjve6WjrmYKM3YORXsGVWNDqZnRVbmTTICcOmf1EO7r8PwHYNJXsmdhD5AplXH8CJhuTZU6wI7F/HnAf8f5Q9oHX8FQ5wls7e7gUO/y6oZxRtkJ47xzwm4ztT9JtNCnLWG4TFjJZUGPICCnt8vy4hHn+MmicHzvm7eO7VvXQP0aWrMfyAn+nJjun0kaXaT+bm3fg9uHsPzfMb5IrAQnyXm4fxf8wiLlfB/sO8R5s69h/llyl1Nr7wf+gdzei+VnqXO/wpzBixnSCrOr3juX76BRScnSE8mrryG+5Ga2GKgozbboapCMfZew9Lr2yzgRCFgSuE5ESWUZk4VAGMTYIJZskLzQxJfkSFL/Lr3JnRy/pI8uySSOMORmKiFViq02TYhG8KITqzZVz5tAweRW6QjbAufJrWciSl8oZzfJjDxonogCj7CMPMlJpwktR9iUaXe7yV6szRC+ZBaHJG9Mm9YldT/ybybIXj5m5SAD3A8N2cbpN6W/bgTrwQkbzinDkSAgfSKp6HQK1yeS80r5FW/BKr9Dnp3Kxp65HAWPNSdHguA+95a7B0XAnDAy4zHnc0+vEc7v4hXbi3d8fdlaqr230N93PUOVnw87qJ3fwhpfIlaC89qn5bx+XOmsItH4KGn948T5euvnSBpfJ80vgORSwolu67mVfPldxKPU81ft5BzNmPWItU/pEZPnT4b0N/D81WL445SqzMbgEo+YZgrpwbMhhk7KZ2MzyzaVCOyDQBgDDZn4vbjfLVlxAUn2WVqHLmJo8H5OXD5AyCAmIMT7eO4xSdZc3eGSa+YNGkTbJ6Bh06SI4gNgbk2mxjE5jYd9/FN09qVGvRruZbNpFmSiJ8mby5eiYkKjm7DNKxrbiTh9GmA8oa0rCxsTArIla0M55pn4IR/TrdM9c5cmYkNPdTQeIK9cCKkWfPxnYBuVBsX7s6u9NCGYJqugVbyzTNrzucL0DPLkjVocexpLHpo3oQ6vNAhuRvOC6nalos0FFbNLMRRNmi7/DkaHBFaX5YTzG+8rfOLkIc45YZDPL+klHNS+zm62r3iYWAlm5X34insKBzacWFtxN42V9xLn43r3MRuLx6XPXribcKKjrCgzHlXswnmJZnOCiSuNp0pAvkEM/jqwE3UlHl8ORmDWBVPrXCu65rupaNWn9V7xuM/Otk5V5w2bWT5V1ZX1jAGBcPrQai6+BbNrMb4O2ZehdjW3HbuZczTh1SV5M4YiD5vVVMthM01BhiwpeXKyYPZRPp44kJiMJYOmGjYUwUVDnkjeF0ez45+Z2pPGx560bXKTzDSxof5uMhmjrj74wRFvjvqO6Z8xfmYtlSXnsnOaSa3LjkV0TCQNXdJT8Qrg7ocfwv0S2axnk/j31YN3YLZLLS5XeY8c7xgPFfC5GCdhyWuE6++SdTxjwh3eI6d1QktovgCd0ObM5MIkPGKwh6MaacQZDuf1QCmuR764R1KBIjEc4hn8v1zfxqkbV0LLC2jY/9CF14u5TxSTd2jbnH4XEVMSLWZzkk6tjq+kfuwS3rylgzO9WsxcBTZ4DHjKMAYERmv8jqHIMusRIOBhaNgQ2HactUoXkNsnZSScR5+tYfnxuwgZsa9cYIKCq7YJKmrcxZjGeKIxXZE0YxaFpDE9ZNNY+jivGPk06AcTDYmlpGb0rLFZwRUmZ9eyFg3jpMntMcbiOJo1H38LPe8p8TRKk8GbsOrjHflMss+wCStzPAUV2IqO8dx7yHvMiScg717STVvLNbh9kdy+oFsuV3pQx/FB14b2XamM40XAir6LD1itJufVWP4m6p3PnBCHN8abecL0CEboJ9EyXQgSKWU8MgQk2MORe9s9rcWPSPe2n06j+utkyf8SI79WTu5qnHaJyNne56lwnK/2voA0exP0vY729Hmw5cks3nxcgc2Zm9qJ3xubBg6waC1jicDoEXCpJqwGtlOO7T0a0z9W+ox4/T9J+2QQLHuILy/vp0uz5ExCKD72YhnDM/uTUMEoinRJsXi8E2ujkVRGccfMyBKGbMOqap3NDIL3Upk0XKaT7z1qzsaEWkGFt+CN0AHNoWMiaw2H3eTs5tYK2tLEEPjmeUKr2WGpaLQkuPLC4fMyqcEwrxD0TGo1U1W4G1m7eDuvSv5qO1X1HqKevGrEhwsPkWVcl2KidsGC3Xh9LZWh7xITuSnniqNuxOlWmZroLT5g1Vy5I0JmcDTR3orZcXjyctkQbywc3oU9c4qFIV2c2VGyyok2Fs2Y7Y5P0cjZ+0/CLxzcl0igx0ru5i1LqM17MlZ9JUn2xyT2B1jyIty0wouYmqOjv50W8NXq99eQ+5+r1X9Hkvy1ZnjeTNryaqg+n8XLTsO3ncCKDSvZvnkxf7BtDm99oK10goVac2NZ++MRcJ3KwIYkunuAe8Xfl5LY50nTT+rcBbRla4vV3HgKRBae8kxeNBkZNsrHXCePihT3NsySyatiKkuWLE/mVCW3O1VrVWkGRHPSAfFlUhfLadt0ksUTkv0NOVuTYYBPdfOiDVlM5lgHThXT31TTsG99ySjrj3e9Lcl1a8gtbZoSDUwOYRK4JcyWUE01kZBK7nmz2yR8xQ+5xXZy0O2yvHg9b+0xm+i3a8mzr6jGs1XZDzFbq+02pQGl+HJD8Jt2yzhGBNR/miA0jsXtpaT5GyB/Mm1b2tCJMZb1aHbHpBPs0RPN32v2gGk+Ak2lwMUM+6ZDEaN84djGV9PO9GrxG1nxeO7GTYs4cfdqejueSZ7El5bPFJP9ufj0dTIGT1WaL7arqmTVpf9HQzSCr1uBpZidQs4LyO3XdPxWsvxvMLogeSdJ/ifUWt9Irfoaqo0X0Tb/2YUTXNl0UrEKvH7rUn5vx9xHnODAXsBShhKBqUDAyXHqQL+2W6V81mLJT8W/n1f6OEntPPpqN9OzZCvxrlOXTY3C93xq6jkYxqbWm4w9ow1P0lnxyGqX2jR/sEqeziMcG3TMDAgj7xBOB1LNTWS0kGQVbWd+HOpMqeRt4oR4IiudUQ3Kvbky4hGwJCdmCz9Em+ZVUtl37RCOvDiDpoawsyaZAHNilffkRb209N4H2SUa358BzpacvBC3G7X/MPFOb0wGK4OOXamMo0fAZFu0CMNjdcuLIH85c/PjOWNNVcfji4aN78bJu2sKmHXyiJ/2JXdJ0IaDFM5pPDYbjxiPpLdqFTEepw2HNVLs/+XD7YUTO5JnZBt5/7S7s3gEN1YiY0VyaMFpdPACkpbXUBl6iwTA34i9/gLnN5Weof1lcBSt5qqx+8UYbCnErJVrtcQXS0k8QXlOVXquJgFeAcnv6vqZeP7X5JV/1Mzhe3TunWSVP9Pxm0mS1zO3/qtU5z2LpctOZdmmVYXze6YmGygMK8pQIjCBCDhOGIkNlTmoMdyj9ADF73DbdyD/JJ59VE7uN+nPbyA+UBePLJ9rmfJMvoLfPOSa+RVtVld9MZs++XVykABV3DtIGhVWtNpBc82UC2vU0wOL2/FkKZi2M0i+5BUX3zaTF1AQD1iFxNvJ0nZ2zp3hDq/6v6O9RfywRNjOVfuky8Qj2mlazEXJaCqPVx2smKTLR5N9UvPk8VqAeKLgB2E6qZVNcuFd6v/BIfGELSCXXeNNbI+biRtsklv8aPFdlvOJk4eKD7K2N26Tlvye7LmPY/YRbb8EfpnSWqXNumkPxas+ZKKx+TzIjAjqT28VpauF6SvJKi9g4fLF436c2WzqeENEHzSaW/ENhz0VSyjDBCIgYEec27fKmd3y0HyWbjyGWCkMZ6k+5+kMLno22fzn0tr5PPKWF9BW+aUixf5g5XnFtfri57Bviryevah4BLfW/rvEiqTZOyH9R3I5am5vBnuJ0qkYywHN/NF85ShCpkk04RK8nmpblUBsk6E8X9uVEoarReNTtBb8dAnNF+i8nGDeoHNvVd7/S5a+myTrIvO/kQD4febVfpl81ypiciImM5SxjCUCR4CA695QynIgGaB4F9ce0vYWcrtY/PhZ0uRDeOOTZHYBHVrJnWonl71h4WkuenKQs6s9mhdMVWssWxu0ajzraKbHbkmbfE8babYC8nYdhbwaU6smLHO8jy3TZ9TlZS5uSDQJou2ob5qUjEF1B6kvZ16jjZksn8+QRhps7dSYP168MEfjLnh+UkCb0EJHJsScQbCG9GvIN5oUjCScwmQRc+QkdglJZnCICbG8RTLPYyGjTa1pLk+YFnPiY0RTCWmXnN54iimeZtrRfQft6eWy275EnsrpRc5vej5uV2q83AG2SRjtBvGiF5MvmfabyY+qfhpHI3ROO/iThekrJEdPGn6cmVkRonGzoiFNbUQo1TO12hcrtAu3LcM3n1I8Epu3v1wrhG+Sk/RnUlrvxJP3kOQfJONDGoQfJM0/IMYaTrGfpR8k58MybB+bjA/i6XvI8r+B7E8YXpF8udr8HCU5uL5Kgzuct5iZSXXOlMp4cARM+Afvp9pWi4QHdh3DOLJUg/0J2j+FxJ+mYl4I9mqct6gv30al/puQnMjGTW0cLcHMjpamTlI7XeU6rhGuQaxtXceDuO3GiZ8Nugfseu3/SPz4RSz5F6mes6g0vqHsVxE/O7ZqWXfxuPJUreRygOCeYzaoK2E4aNOsaOJHb6Gh1d3ZsGpzCibO6JTMOQYSySEdNwvasdab1hpYNoBbQ7cGn2vTjOipaJgn2f1EYTiHNVgzqJiQOhdq9FvPHE1+nAD5HHFD6KsJKXpSC4kJsYZLNli/6tFW/5sV3dX/1o6zHF/aQTiLzaJlIuoNnqgMdooXjlWaoyLVPv0/6qI5oQPjq80LFuzmjuUPMaf/Jo2TH5DXPq3x/yHh8zE8/y+wy8jtVh0/AHQradUX6V1C/2bijVznmiizVPv0ihWwhXjyDLLkl+n0peNe3WV6hWR6kTPTqJEwDSd3Y89cbPdq2uOrv/7bWOXP8PrfqzVvx+2PcH5b+6/Ek18Bfx7Yc3B7trbPJOHpRcKeidmzGD4vJ1Z5Il+kOOf2NOBUHCk/X4l7OLdtGFWdT7Ut+1JAHGG0vTimKifVfmDbpv0O4S4BwGqdewG5a949fYWQnzWCgNkTQnEdLh1pax9ffjixkdBU1kjyUKhWY/hdogFgD2Y7cFuPcae212t7KUlyHvGIcpoQUCfKAAAQAElEQVR8gNT/BWt8Cev9KUO9txePKn9qaR/x4akuk2K2qFtFNSmaDFnPhmRQZKK9ebS4JzjtVPJlLKm30iVqmMEhfg88pVMtWKZ2tak1pv3mRRevxeOoh6MgVvKStIal4m3qor2JPFGgFqugT5ChNpdwDg5H/3S93rm+Qr0tdM7xeBKOzQTp9ylosOWSDbkmxCQrpqC6g1ZhsqxAYyrXYkC9Y0bzAwo9a0zjq0N7K3DTClzRPh02IZoHLc2VUdHsLsmpeKc3VntXLN8GK+/TYpH0an4hnpwtnD5Eah+C9DPK/i3cL8O5CbO7wTdou0PnY2JmxAGOCbsMR7pW/3Xx6IveojavhOyXtF095tXd+ECg54nuNaVpE4OgaUPMzCHErZjtiPdow8lNai8iGfqfGjzv0OD5UxmCvwX2y8DpGi7hIMmAkXNqLsFLm/JpFTFWEseYTO5VJEixQtAZZZgKBKzA24Q/rpUDOxm3F5K1rWLhJvXlVJDQ5DrcvckUPFp9KCKnTuFE2tCjW2RgIafS9m5j/4Aprh8iPa7M/fOqjqLcUJKResUfuwlHFjR7bJvEHw+Krvhq8hop2Bs15q/W8eU4P9T+V7T9V3L7R5L6+4vZ6KHOb0F2Fdu3rmH7ioeLLyufc8Ig51qm+6YR9p6TpEOiP4wBmhqMDmG7iqGkkxm9aiN9smNRq/TGYvJkEYWc0f+mgjvKymMlL88b5Pke3VFXal4MKY3LCbBjaFTnUFuXNo+YI6lZ/IAmcpLsOMmIY8UJshn0/0iKnMp7q5IRlg4UMsL0fyrr3rcuD8zEDwky3AfDSdz36qP7M2Vv4aIKbnPBlkhWtEK0j+aFYrw1r/rH1mxOl+XEpPDZKweKd3ttyQPU9txCW3opLQPfJG38O0n+AdLsfeR8DNKv41ykdCVwM8UENOt0vIV4nQik2y10XV3n6qCJ7LA9pMC170qzNZoaJl8lkZ1beQ5zs0WFv6OTMzmWzu5Yey8eWX7rulaWb1tOnmkFtvYm8uRtGjxvBHuhjK+TgaVKc5TaNICq2qbaBtbBRDos4wxGIJWsU9/mJ2HZadTmzSN4YgY3aIaRLiVj/ZjdrzF3C7hmaf0GKaPrGP6Q0zWAksu5PFAyXbNrwSL/vinODSfnuqK82B44n8pQ2Wa/UL5QlD8Dfqp9KU7/rva/oXQORrxD9AGwd5FV3gW8V07BR0TzF2jNfsBQ4xoqfbcTs9F9nd3ECm48mhUObpc135kUwY+Jd6uFWWcDy/swbzzm2tQfaBwyD2w19WQeM3kV7wwSFg3Mw6vx2sQCYtWaJgZzx9TXoyXBsrr4YSfk2o7hvtGWP/p8BtYi2peR+jEsWNAGrnPMrBD8sGfufLBT1ZYlakOFZgfHSZKcIfHGoWgJGdHQSn+e7QKr0cxgQg/EA4n4IZzETdVmknNEdQ/bGB1QOVbyYb56I+TfERV5qJtn9rV9HN+YMF6wYDebj91EY+W9DA7eylDl53j+PU2IfRbLP4J5F6TvEbecpfRZ8fl52l5Cod9dE9WsxXgAbCNm24hXj0AT3jaEcyBHmJkfvCpclql9z6beuoJV61tmZJtcvJBJZs1teDIjG9AsokPgPLStk7b2kxjitVD9Uymi38N4gUg6TszRqf2q9kMQmbZlnJ0IVCUElpH702nds4iNWmmfne2cfq1yGhpjG8jtiySN95Al75Kr8HY8eTvk79Dx32n7d4VzGQ7m41Lyd+TJO5Xe8ZgU946kKGsk5clj8+W6N1MZUS6Nd5Fk71Y578HtAxSKM/84tJxNtf4lhtq/UzyOTP0a2nfcRMvO20iW3cHdyx5k8YrtxJeUP3HyUDEbHQ4u5tMP8H0oWoprVryG+068MGR9n6tTu2viApDxxyqodhCPAU8tBRNXWzjqQ5WF5PmpYAtgBsmTHnKydq3ipd3iCRmANI8nBBx4hdwWi0dPk2G7gHAci/Mz6F/nuippfbE4/CkSCeHY2IyhPmRESyI+kFNgcgicvIm0CzerihcWk9lxoqODsOG0M+PiGnFDmmhCLD8FS+brKJlxbWgWwV2WE/o1Vn3D+f38kl5WLevmvnlaxV22lqH+m6TXfk41uxCvfJ147zf1D+H5P2D5u3H7EKSf0fbruF8g7C8D04Q3NwN36FjlsAUzTfDQTzxxFk4wZAzzf5NlIuMJMXY6SPxEUKrZzB07e1uf7N2Wm8MhEF9ZjndzKxYGye9o5vitYvyXEisLzhygoiQG0f8yznYEUgwpHDsF0iV0ro++n+1tnh7tMyku9x1U7QY6GleT1K4m3XUdbTtuoGX3jcNO5d5tuxzMA6U25d0/xb0jaf9r+x+37y232nsLkdp6bqVny+24FKevuAeXEt26cj2xWrv8+F3EY1Xh1EYKhRvvGHWpHUxz53b/Hj8Nqe66ZrN9O2ba6nj/PFN3bGAtUsQLcVtA8ZEqZmYY2NIiI2u5Jm3CsOjEtMcMCrl4whrdNJ8nxA6Y/uYpiVsrks1yHGcQlIQz1lkVD/gTRfZqsA61JWGmBKFOdXBQY3Kr7KOh5pPtqWhZBC67LZ3PZTNsbLE3xARIni7CE9kc+VxcXLH3UrkZKwI2/Mhz6OHQx+EAf2ppXzEB3bNwA/GkVffWtYU90c/VzBm8uHgM2qqfxbOzSOrvw9J3Q9KlVeBYGR5eDYbh1eDiaTO7W9cfJlaCoVcUakxQ1zZTcqUZEF16iSWYJmHzygHGznRvgjumkbKXzGTvdpZt3AilsX9C58fT0nB0lzwkBdp4OmRnkNtv4TxVwjyEaIsAnaU4jgeso+WevTPGuR2jFrfDOHlLN0/rGO/kxWMgcnNw/TWXWFf1OWFUZ4099DT6H+NIhjPZrBSPH4fiHEkxkxypawY6tQL5gLFL/Z9UpbQr28XvA+oHP2C+qTpZPO5rC0jzE2lP5xHyfqrqnqh6QrcsaCzE/HQVuUIIt2g7c+K55AxUxAta2cjpE0/kTSXeCmemU1SdIP18AgsrHeDGTAnr1rXQqK4SuS9UOla0Txd+kPT3Bp3Zofu3C2dbVRNhyXYM8UXIP7WkWdFFBcR7rqfgchZXr5uBE9Pi3/akveBn85k3AdKsvh9TvTbsAIfODh0e+jxsiXj6av6qncVj0DGJHb+KsG3HbQzuuqFYDc5rPyRpfH3vavAHyZJ/JB6JJvsonn1ZfXYB2BUaFTdpe6+2W4D4vkF8B2Rk5VenpmH0GDumsZOspm5zOCWOpyGdBybJkVLFJX+ShvYpFAOTHSa3fAmCMHLiq8hn3N7CWx9o4w+2zWHLQ/PZvnkxm7csKbZxHD8N9LZ7WjnTq8UL13Gf0DgkfWGMhKObdTxDWd+IJa9Vl5+Eo9nX2YDfIVtfXjwoApoxJllIkj+FweoCzih54aBQTdwFK4pyG97ODSEmJVWcLP9NPgLCurOvppntnWBS2DJ+kSSkaSFV9Yvx/BmahFzCmjUzz5Dt1MrjYNtKIfhsIblYW7VJ/5sf89GRIJ6o7q5BSw8pu9Uf02DlQisSSS5H0V5Ib2Ulb7u3ZXRtaXKusDVYugBLn0aeiKd9vihKlGZQFD8s2NOQjdQHNgCadtC/pkUjkc3bISpWY/lqwmnEh/UHMyScSYWsuhyz54p0yQrx9wwhfeaTKX7uspwRJ3jEER5ZDT5m5Y7iFxNGVoPru28snGDj+6R+jhzes9Rn79W594F/UivB54FdDtyu8+vVp7uIx55hGshNHhsMw2nDfBmV6twZ9gSjCW8T7TbSqGRkZ+Zt3XiJVzhzUzvrty4lvoq8cPnptM1/NtXGi/D2V1JPX0uWvI6h9NeI37xtq/wSA4ueiW09lSVbnsDGTYv4y/VthfNbOL77oRDKp2VHJ7SfLtB+R+kV4KuVq11scCTYqYgyTiMENGstdUghcBoa4HXRdjjhk+A+D5In4YmMkjWp7pl9sWeNkZqRWCqeN5obXOMvJ/E6lkf/NJeao7H29bs0G13pVT/0EEo6Rg5NCkbI4HlYciqkx9Oyso2ZFELntLXPI81PE9lPwXyuxli0SYczKPb15dDol9zcQbN5giKkYAuB55C2PJlKWyeBtU5M3yh7pm1LG5Wh1Xj+UsjjQ5ftoteUZlaMn6OyXCtX3iOe0ESI/je3BVWNq3hN4BnUFizmJYg/mDmhb0c7Zk8Uis8S0dNnQqyZsl9AND/a41eDR5zgFcu3sW35g8RKcHwROj6KVes4n3gfmPyDYGeBf0XpUqU71LdbgZgcCrvGtT8domHE2FkkmbScwbyN0cjRtGGQSI+ZTYdGjNAggkZ2Z8pWSiFWZn9vx1xO2nUclcqzSP11+OCfgP8defYe8so/inneqfRXJPZX6rC/Bv6ONH+PZli6tP//yJP/KUX4agZbn4NvO4Fd6xcUq8Lh4KI6olND+cwbOpncfxPs5UqrgFaladWJomcWxClogu91aJ06kcIwAyllZLzbduJre8468cs68dJmYED5cm0PFE352nVhJVmymLYlVe3Pzpirpa40XVqXez5dSDnq6Fh4mmu2ekjt3qWx0dC22VHy2CWX8+fT2VhKTIA2m6LR1h+PrFp+HO4vlKN7rPBsGe2t0ypf8ETSGCS3LeBDkhQ+DehrxfITxKsvZaj1eALraUDUQUk4Y02VOSynkv+y+ODZwnCR8laUZl4MfqjUZbjbVsy1pdnyOhEdC3F7Gi39x3LcltYZA2rIs7bKMix5nnhitdoxsyb0xgz0Xtu7yxMiqdPGXETTb9jPCQ4H+PNLeotveMQKcHwQqzJ0MVnrOeTpv0L+7+rXC9S/N+NIhjKkbbPHzDCK8aqQW3wYbRW+tIM1onL4yuH+J6C+ZNT5maRg8gctyhZBsZkhKZh/5Ldt59V+maT+/9Hw/4cnb5Mw+F3MXiameQEJTyc+2+88WYbEKcQWO03bZ+H2y7r2am3fTJ7/tcTwu5T/j+hrfTktc04tflIoHne+b0s7c7JVZOnLlP+l6rjjVFYrUABHGaY7AjLK1bsgg9xidnkQs12EMDEeEPFrlW6m+GkZfqbVwh/g9nWMz2L2GfL0W8BaTI6wF+XocL/oHsbIYt17Eq02h+DP/bIc0WF58/4IxNhLMWvRmE/3v1geTxEC1j4Itg2TUjaa7diEDluM2bM0Zp/Aqd0zwxgsJlWXLsArTxXtzwAWYERbmHGhR/Kx0dZHkm8A64Om84RIiNU7E1/wPE1tPos5cxYRjkNcmW4peGHxkgXkyXNlY7wK7AlCcGZOfKAQ/GDESv9G3Pp1ptkxpFRMTJ8ge+7pxDvygXmzqTps/XIWjt3RIQddCy5yduVt6JbpoffcXPLKRc8RRrUx7KZYwHrrA22EfR8LT5Hi1cNY1Irz8Ypi9FnkPcIam3O78DrXMuIx6HB+lx7bU3wNek7/TWR2Aal9SttPyH+5EOx+YXuohRamLFjopLydlBXU6+10izJmZpghylUD4kyvsn3zYnnpcmSL37b9Hz9CVAAAEABJREFUP2KM34PkxZg9BfwYKYr56oYO7csp9RaM6iMJHUOb7unEWaitVgPsVOV/IeT/HeOvSPz/UM9/k47k2bRVTlVdL8eS1ynPibpH9zJD8BLFR1cMoRuPf2Tqp7qaLmNcTqppaGIPgq+lcGr9UpLkPEg/Q3xOPkvejaXvJE/eo4mPf6X42l7l6yS1b4oXvgQoL/eJN8JZ1uF+0YIfchkpdipJtpDZ/BNEnhvTIBQkuJnG5vShpyDqKPkXhmzLngFINmtcTQeFbDjtYCdpND6PWssMWN11I54aau07QW7ii0T/8UotzNQQ08idfb3kFrJ2N1jOdAhOi2hajdkrGUxO4xk75xTf6pgOtI3QEAb8kofmkVWepvH0ep3W5Id3YuJmZmgIfkhMTq4/hHmfeLv5/GBUhO8K3F7AQPsqZsLvhsZq//yhY8nTF4ofYtFGck5704Ut3HKyathe46MoHNe3rmstXidk04m0djyTLP0V+ltfSW/bfyNrfwVz6i+mvfO5LF52Gos3H8fOnfMIxzfuHV+t0+OuLmEXX4P+6KpB4meQ0l130Nb4Cal9SWPmOzj3qqfDjh0/vhPRUhcVJG1kmjhM+ls5JY4nouCpL2MGOG9uxQcmqpuOoV79FfL6mwXT7+LJL4khVkuAzVUKQyFVN0R7TNcPFW1vvnTvfXPA4mMWT8ftNUp/omM5vtkfa//3lUdKiJmtfJhVwXFCeT7q2A7/yHc3LmPLuFP9e6Na/DP13fc0AfJ5zD6C84/Eb6HGOxMtA98sPic/VL+K6vbriZ+OYfmdxNf24tPz3cfIbfU7wX5Cnvxc226gobR/FL/ZXDnGJ+Cti2BTdf8Ms+I4t71jRmMx9prXKFfVOZZF3+faLyNMLQbx9d1GptW7TIas7dHYij6ZWhr2r80KQ3a5jIRfpiU7mVgNmc7GUBixc1gOyS+rKc9Rmo/NYOemy3L60kEqvgGz7ZK7dfRPqbnRAlNfADxPvPF6+vJTadnRyXThjXB0j90p+6X9dJL8t/baNItFrxwz/Z+psQsnSweopJswQkZMB1ltgrOTxJ9MNX8afW0LmK4r/SK0oK1z9SK85dlgvypElwvLWWJfuBXfyenesJCOzicXrxN6y5+qnf8IeRfwDo1XJf4OS95Nbu/F7e2a4H4zA9mLWbroRGaL06uG0mU5nzh5qPjpo13prZB9V+2+CNgAFrKUpgYP/co8qmmVnjUxjppKzngrT8Z745TdFzM//cuOo1b9b3Jc/j9IXq26nwjFxzyqEgBH2gZTeanKa1P5SzB7kvZfDPZ6jKfhzAN0Xf/L2CwEXBVnYDWgH7MduK3HkINq12t7mY6/J7nxBZx/pZF2ySF6r1ZrP0a18VXSIQmO+jW07lxDvDOx+dhNxOfk47Pyn5CQiRSPl0Q61zIiLVvaT3tFs2v+I/GDVoZVr3ZU/77RwFp1eoVWdo8DOpguhpSImZ3RhHlipPERBMow5QiY05YMyo3Yguc7wWMSKMbnlFOyT4XiCevQ8VPI/GW0N1aza73Gpc5MtxgOzsJF82S4PUPYvYKZ/sgqI2FlnbrvEk8MP7rqksQjl5q5NarSDyvl5LyMNHstc2tP5p4dc4h+aCZdUf+xcnRr9dPFs79FfBPEWClaq8z4IBmR7qqT13biFpMfQ2pSs2WEhhstomeVePTFJI0nMV0nxYI3TunppGUg5NmrRPiTZNu0CcPpE81dvOpjJijso/iobLrlOK3cvoSGnUnuf47lb1DfxOSf5KKdqnKVtI33rPHn4bxS9b1FWPxfsur/LJzeJQtPIMZyMWnh0gG6aybHLss5eVEveetdZFwMyS1qd6+aNHacddOERRPy5i3k2k5YoVNW0CPYHamjOLkUx6PLLfOX0VJ7GUn+RnW8BoMfI4ZvE+wTTXt0qcr0VtUzTw1bqtQxCfWo2DKOGgHXEAsHF60auN8Bdq36R86rf0V9cxa5/SPwfrzxcSqNL9Oa/YBixbb3luJLeFtXrifejzh75UAxezbi0IZgwR4ZCCrjsTGu37ygVwbSHeRJfCpexj2Nx2aKI49ZeM3G+6mkyTzWiKo4PRuTh6PZ7IZJyUo7klUO3nfNJnG21198kRkp4aSb+Miba0TS7OByEnwF+EtI7EXU0mXF6kGzydq3/jBiF/bMIbXTIH+dUHuqRNDUPDW0Lx2j25cuHF3GIlcPOUk1nJu7JAF3K+XF+enwz10TH75aFArz6m8zp3Ea4WhGfzSDvqg3Hl0eHHyGdMsZWCKHhuMp6GwGQYep06QnTdyKj75Ph07KsTwmP+4F36MacqXmRiMRX87H7TmQvkp8cAIbN7WJPmO6hHAG527rIBl6kvB7nWh7AcNfFg87g2kUXLRkJKGPtTeq6FbgnSRPJEt/Hc/+RP3xet36NG21cu2dam+M1RYdV7XfoqRj2rVdoPQEpecSrx3if0Fe/X06/HmctulYwoEO7FTYjI5dlnP3wj5aa/cJn2sx34YfyO6colaaeoKwca2FLKmwotWmqOYjrSb4M2TOI08BJkda4qTdHwqBTfOxxvPI85j5fLo6fpGg1yDQ/4mpOMy0YUDQXMpwcpUeuKSqYqZ0rEidlbEBtlP9cQsk/0WS/Kv44b1Y/hHwL1DNLmSocQ0tO297xLFdvGI7Iyu2o3VsOUiIdyos2apZ4GtV332iY/AAORPcxKfpU2hUFtO5LvjzANnKUxODgBliBMqV3YmBczylxNdWvVXOrq3T7X0aF65ts6OJgDaN0ydp++sai88l37qIYtZfZ5odwxCL93TJTiSr/hrYCzFbAkw3I1YkjSOehhPv7Rr3gfeoBMlu/Z8O0eTkuAxm40TRJoeXMxgafDrLNiyg4A8P3mHyg+qJ9w3nb12Ct8muqbxJ/uNrVO8JhKNropNpHEx9PJiPbqwfQ0a9shOStbj14ISdNQ0ap0kxt2Nwe6nSi7HOY4vX5HTQdOJCRsSHUav5E+VfvFokvVwy4lgQzU0nbgIIiNc3Uj+O3F4jJ/kMte95altMUEpucyh727BibFSADuK1Q0dOr71J5fw5jdY3kNjpbNy0qHifVwUzk8NlGjs7W3vUNi3usENtz5raHLcY+dE/TSVjfJU/Kq+S8RUw2Xe5EbNbMQPu9utgzwDmK00E4CGsxTxWU3l7xEhSzLaJeCzWGf7st0agrpWxeQg4Tl3Vb1O6Bs8/r1muL1OtX0Tu17Kj+w7uXvZg8Y7DRDm2quiAce3SQdzW4cnV2nYrj3hH/x+NJh5qx/14ietVtCftYh979HK5N7EIuMZvnlOu7E4srGMpLQzZbHC3eF6rNmj1hmliyGoEwhzMpC/sd0jzZ3PahvkUDs1YGjjBecOIjRWkNl+N8TJN1r0MfJVSdYJrmsjixtanXRb5B9Smh8DWK2kfZ7oEQ5OShGw+AbPX4unvS4b8Ek/evIr49YVict2NSQkqN8r/g21ziEcv0+Rl5MlbVZVWdO14YdaGiT6aHg5FgGuUj74/u9T3LdZHnjxIMWFt02XywzCXvubJmP0Wee0lNOYe23SHN2TEQ9s6mZucLN58jWh8HYac3ngqQXtM05DUnc1Dfljqon3zly6EVjmpyavEHaeK7+fqvnBgTdvRxsibCp9O6R+NHX5VtuH/hyd/hFVewoLlq4svOsd4G22J0y6fOYt2DNGoyv61HSKvpnR4jJVp0qJ5QloP7A9fRV6JfJEOn3cKcyRTWNfoq3rbvS1UG8eRpfGcvmZ/bJFurigdWQxxjQ3ibNVAuRO3KzXgLoL8m6T+NR3/UGkjzXxs4MhaOBvujkE9hCUbwOLx4a/gLZdQG7incG7jceRzT68Rq65dJgNLgoFJDDHL1lcJJ/d6sIeBIaX9omZe3Rfj+Slkc+dyBtNzXO1HdXlYIjAuBGLctVgfYcg6PTLFYmJqXEVNwk3SEx764pdxrZw10udzyralTZvxDyMvjFiSE0krrwb/TbX5FKU2pWlnEIimiK5/rpWF2Gp3lLFvVUM8sV2578XZrW2uNH2iEXJZDq89AffX4PZnkPwunS3PYPHACuJRyJgYiT5jAkKUE+XFz6ks27SKavY8Odi/p5L/l8ZMTHjEK1ktOjal6R3NHEv2n+g9BM3K3721RpJvV1s34AwoTRd+SOUszRE9T9P02O9C+goGFzyh6P/os8e0agoOgkc29sylmp+uyfzfFGa/TW5PUc0dwi54VrvTLLr6F0bfn/ENhSRdrTteDh5t06RkMR7H2zATNlWN4/naPgm316rc/y07/gzyytOJpyfedk8rzejP8bZo3/viNYAkl5Pr8TRhjutv3+tTve+WcyRf3p5qeg9Q3/QbSDEjMzBvAUn1WWAvVhdPxGMcrrLEOCbB67dL0F1AYp8ibXyY1D5C0jgbz79GyqXgWzR46mhHqYxTiYBLFCKlGD8X5NmPIDmHWvtP6dm4mXNWDxFGtjqPKQ3m1DZpgqSxTkroNrFFj6p/rNJ3ErD5ovfJ5PUFLIxjyjA5CLiMrpxKLZ+c4stSR4VAGLKVbBvGBuUfYHjsandaRDm8LBNtL8GqbyW1lz8y4z9lxo8bYcTGb0WGEWvJb+D+O7idLoQ6lVKl6R1Hu2oz0opjyEiznWrn7ZKA28EaTL9gEKtlthzsBeT2ZvLsT/C+15O0PZOTdh1H9NlbH2gr3vkOe0SdxmGD+jvyBX9Fv8f9Uc4pW59Aw55LPQ2n6s8xeyPOs4TREoyqihU9+j/d47C5nWsyN6dLLWAUofs05W/ZLZV9n3LHU3Su7XSJqeiar5Y8m8z+BymvxdKTiw8eRR9OBZVRTzhkp29bRu7PA/t98eMblOQMegeIKv2bdjEIsuB3ZPfEwWFSjKGBxYuE9zMhf4b4fpHuCBmtzRFGK2hoVZnLQOPM7U3Q+GMq6X+jNudEHtJqedRPQS8zJvSsMZGcgsVkWKL2Gc0K5rn6rV7YXKNZxW8WnYepNznM9am/vHCTGLdyIp6/QoPjZCXNxKqrx0uJo44yOSv+kIr4CbmdDcnZVPg+mV9H99a1DNQe1ODYgROPVShZDERT/jJOFQLRT0av+uBeDawLMfsaSe81rOvcRqzkihGmipTH1XPaaQ1Vv4WcWN3dCpaxbzAJXAvl5Ks1s7iUgS0hoCjDJCHg8SjzJJVdFjtKBE7LaLTIseEO3HYh1TzKG6com7fgvlzpxTIk/wDsDZL3T2Xkva4wNJmMIKMqjKtYJTx140ryOc/HkzerJjk7nEb8igDIiNGZ6RrdXKRJb+r/WGKXZv/zvFey8m7hvk5tHdDtUZY20y5WcOaJb09SepXo/V94/n9J6nI4Ol9Kde5Tsd2r6exbyu/tmEs4r+GYHCxFf5/ZM4/1W5cSDm7c73O0estbVP5fYYl4kBcTX98279S56Wd7cdDg6lOlRkbfGGTvS8jp6N+l/3fr/h3srzdpetA49Hni02eQ8UbMfpd5tWeyffPi4kmQyZQRMZibXYYAABAASURBVCESjlg4ZA3/b1j+P4XGa0TDiaKnA5NNwSwJneuq5H0hi5+rFq3EadF2IqOpsBjPndqepPJfJZl/Jp7+Dyo8p3hq4y/XtzFp/Qmqd2LjwkUVzOfgJn+EysQWPobSHCfGrSWDWOWxdi8HCUlD98R9B7nepNPTS+CGkUDbEtL8+YJKK7toteyIDAPHbEjYPkCS/AC3z2mY/YCOwTVsWbKFkUdiW1Zn1FtioJyo/AvQKNE9ZZwaBBysJty3aXuLtucL/m/ilVvYdvxu4nFlmhzCiIN+kooccVsv/hgURaJb/0fisABfCpodTufMpeDlkYvldsIQGK8hPmEElAUVCJwrE7a6a6cU8hoSn56reBYrZx5fSn82Sf4m8uQPNYZfxtJFJxard/GxoMIAcivadCT/opwY82FUhYNk6dNpVH8LsjMl014DFkZYJzZTjFjPGc9jaz0rh7B8E84NSpLpjM5AognBir5oxV2rrPZkbV+m/nkL5P9PVsf/w+t/RFvfbzGn/mJaO5/HwKJnMrjwadQWPLVIsV+f83Rq855FYlqZy18qp/bXtf8Hw/erHEvfLBxeBDxR5cue8TD0j5zfVOCURlMrIrU++sGXw9bfZTlD3idTXSu7tgmKRzIfqzcPW8ikZ0hF11z1+6m4JsQ8/Z9ahX9pISN27pz3qNPrR95nISPCyY3H2uNd8cSeK375XeL97cRfRnx4CW8TLdPLLudIgnBbsKAN7HjMTgaO9PFlFXGQaAg3bwVkh6EVZPsdQE5v3+vpbzutmMSIyaroB12YtjF4pKW6AONJkC/GqYrWI+c/FTLOWJfs6iXPGyw8bbTjNweLvJGYDkHMMR3I2EvDqvUtWP1Yde7zdeYYbVu0PYJodd2sFd38Iki+SWd6Pbcv2cpHVw1yrmUMdwYUjwzU5up4NdCpNL1wEUGzMroM5nAi3R/Snlbd/RxonEclX8MxC/dQ9NF0aXn8jmS6hcRvJ74uKSn0GMpMgtZ9IWZPoWX3AhbqmDKUCMxWBKTIBvIBTfo+hKMJIPrVUleabjEVfXNE1Mkau68l3tPMWt5C1vliFi55Epu3LCEc1DO9WkxQFYaQm/IfIup65AvnNu576wNthfO8ePNx9Lc8g5aB1+nm/6X0h6rvxXger+K0YUeBTDhXknxPyw6S/FbMNgI1pekcDYt+CSPZF4A/AXgGub9cvP1G8uRtkPyD+vEDpI0PyGR4D/APRTJ/D3n6Pu2/n7yirf+9SvoLcvu94n786ZAfBy7bQk6u6SpHWwi9aVs1Bu5AS+VArjS9okW/xJNZrMZ5FSMyYiB7MQsWn1zIiGLlfiwyAgU3Qk6E8xIyIt7LjVX/evICsuqbSLK/UF1vwvJnKfMSEI8gbmQGhbxqh/w5mjOEbdY3B7MnqlXLGF4U0O6kxhTzsONPUC0vV51/JP77I2qVV1CfezLRD49MdCrHdIrBL6f0dJI1TsZyTZLZcpGXKjUnmtBzb5AkvZKH9eYQMd5azRDhktsWJTTfqQsqInV5Qs/C+aLtqRr0p+hUJ6aBwrhDA/dtmF8hxfs9idjb2bBgD8VKoQw19gmdnYnyzVG3akYolJ5q3udyuTvhCLiw1sCxneS2BrNv4/ZZWu0ihgbvZ9nSfrpseinFs2nQsnM7OTeSeDzK3OCxIQHrFM89kbx1AbV1zRNQTFIw90kqefTFFjRoomo8q06jr6XMORoE+lbXSX2Lsl6jJINWY0Q70y5aoUdaKWb8/dkao2+UjvlrLPkT8uQ1DLXq3OZTWNhzLLvWLyAM27fd08rBUlyPfCs2rKSy6SRaO55J3vlS4gu/pH8lXRIfPno1hvSYL9C2qrpNaWZEc9FqFdGdHNKQPWBrzItvHOQ8iLNGaafS9JLlB6RbJ63gkwrQJv5YwPBK20naPlV9+hxtXwDIAPUX67qS9o1fBnt+cd04Xbx1ivZX6bruj3K0xmtFuczgYOSWyKGvUEml58bQkrNpMGdwG55cL1y0ukt9DHdPXVaLPipsv7ABnw38d/XhX5FWz4Tk10grwzIixny8ix0y4GDyIc6Hcxtf347JtBN3r6Z1jngjC555i5zcvybJ34rZr4KFg90J4hP9m0HRRGvwRWy1e5C4ULjW5rZDvkI5OjEdMyVBdMXkgS9WnacqvU61/m/x8R9A9issWXhCIeujr2LSEld+5WhmDB8ofnoqaciGTF+hMfMs0T1faWxjbsLbYIPkuRZ6tO0hP2zxxS9l5Mrnfti8k5oh6hcdBT1MGeMdvklr1lRo6V1KplkuZwVOy+FvOmgOOVPWp6tahUt+SOZr5Ej3csCVQjF5fZ7qSrQql3eCNd1JYfaGYH5NQqhvLFaD8p+T+FekBL/OgF1frLqfM/IhqukGgjltySD4BvHmViXt6/+jZJqEUptEwTIqvpIF8eiOeOvR6+VeicDsQiDkqVe2kyXXaVzcK/4fUANjjGsz7aKJopDtHZI3q5SepdH7W6L5L8js7SSVP8cab6K/9ZXkLS9gcNGziUdU41HVSLFfPMaq83E98tVa30hW+TNI/o7c3w72Vjk78TjiU7RdArSq/CYbKqJiqmN84yBBkyB+jdr/EGZDU03CEddnhW2UYlTF260UDjDt4hvZCMzV8dy9+x3aj9RW5Cvyy3Gx4n7KIL3Z0+jX6sr9uD2gNF2fABnpqlQ76s98lfrz2eT570in/18y/h5L3kaM+XgXO2RANv+5hZwIWTG08BmFvAg5EY+1t3c+l2rjRTivp2VIDhZ/I1vnbzH7fbAXKoWTO091tGAzkldCzrvaFFsOGWwgXhVYrDwtwsO0nbpoga1rbNpyYR3O4xuAvyRv/Z8MdLyUbP5TWLhtWTHBGSvw4XAqw9RG2YlR9z075tCePkn6NCZKXyV646kQyZ+ppeYxtbm4H+8lSR6GvJfT1IOPyTBzDqaJIlZnLzxGiqTyRAmUmIU5wtkMq0kRPYSnP8DqN8LKXYRhdqB+OUODodoq4eYrwTpkpEwTTJhNIQRiBjaooRKrojeAf5viQ2GN79E+dCcnL+rlQKvuFGF6/Iuf1oivjRoPiP4+EZUr7RM9Fd8t0szhyfT7PIK39rk643fdbMa3oWzAxCKwdqnGdPUhFXqT0nal/caEzkyvGDyciiTpG2QA2akay1ph8d/E+SOdfwdp/gGS/ENQ0da7SJQ8fa8Mdh3rfFyHd+g+rfog48l/VXmepuMnKC1QasWkV9B/jsLQZTmDA7uFwK1q/Y3SqT3CdrrzhUg9bAzeOVg67M3jyOB7cfNx3DuxtyTi5UjjKbVvdV3OxWbdep1K6VabGtqfzjH6uCICO0TvcuLVpHBQzX5DY/tMPHtXISNyPqxV2n8myT+o8x8gZETIDJIPqY0fwtIuSOVY+e/p+JVgzwLkwDBX+Weqk6sm7BMP98X2eEWQpEqSqM1UMf3tc/sU7ZrqqSh1gB0DPF/pv+P5X9Dw/yWKfgOrPIdYgY8ndmJV/kyvFq+14HGvsk9GVNkv8Qpv3tJBvMPd4c8jPpJm/gacJ6vGNqVJrF+lHy4ameR4L4ltYXdlkC5RxswMybQg+yWkUF8i5nsuuGbUaB03Xa6ZiPiNP/PbSBrXkvtWzrb6Icvr3N2qLlyq1IYxPTBhFoToC2ioJQPCVjP93ErCD3D/D/L883RUrqS+ciPxDnWXDCRlnNaxR7zVP69H9N+B2eMfz3O1zpirtp5EUpvHQh1PWoOmsOC0bmDluKAMj0PgMjLm5tvEHnJqCIN2pqziiadD73ir2hSG2FKM1WCnKj1Teui5Gue/pG08tqrEr+j8C3QsHWW6rnyO8rMUiPvbtK2ojHKcCAhWr66RNx4mtyt0+CBmM4UvRO60iA5WU9oJBHY61l4zo2OkexK6tGUMIRYaKo0dkGlCzNfp7v2fihpDYVOadURGtGgSO1b0w0bUmLfTQDLA7dnaPkcyQU6KSzZIRriHzHgecc3taZIhpyjPscqzQGlYRugEMz2M5UORuRmep4R91Nx2R39KRrv6Mpef4Zp8sF9Xv/ypyPrbYgW+v+1VxGspbDqx+BJ7OKLxqPOI81us/HqUo1vGEnVP3BuPTEdZb32grfjK+0m7jqPTpWvS/07ifyac3iBee4qwEo2hn8ZSx4TndZVYw62buvewYI9seYtzOn2ImDaETyI9qH4/RLbJvxT1i46CHqaJMX7KphYqthIzzY4TjzsIqHFCYdTUqofJksuoJg9yzMoQrAcvbKFy16qtWL4Ao+XgGcsro0TAcXKGFfUe4GGwG4Ttt5U+QW6fpq3xE3Zuv4cFC3ZTTESMYgAxDUJ8fKWjv1ftuE9t3IGZBv8+dBmmow48WUWjOofWexMdl3GqECjraQIC5mTbBiCXEZvcBdarsZEzs0KMW024UqH4SEzhALepCVoJYI62kWK/Xfs6H9e9RaO9quO4L+7X7oTEwxsTE1LNIQoZMWQPt2pziCLospzakGRltoZ4XxNi1f+x8pIyHByBcHRZj/kNuG3BmdnYNZbKYW9/SNbWjZAEL8xMGWFozGvsU8iAVskLJSQTCPkwknS893qRn1SyImwBO3h/j+FKYV+NIX+zs1ZcfS1bycjFx82Xb6g3QLJefWYs0+GTgBeR2f8QfX8NyTtJWv43bQO/oRwvYGiBJjfk/MY3HeId7HgXO5zVcILjQ1eRzvQq+6Y4FynyRAqnOX72LsqI7zy0zH06HbmW+Wpa9a/8BW5vEQ0vVnqCUrsoTLRtdoz+6hOPr6da62XopLzZBB1J/c0HNGY78nQuGScL1OPAJCjU1YwjFEJAxlbOWtLGLVQHewily+FCo4onYdC04OOs+3BVzPbrBfahkE2TCxbK7B4h+TPcvwL2r3j+GaqNi6n1rmXxiu3Fb+eOqm+YRsGc7q01LNuGWaxiqa3imEcpNLAW8fECCYeFZPNDMeocsyEkMrxmS1tmQ3+Mqg1TkmnzSTLE52yF7Drx/kZiwnFKKp70SoLf90+TV6lTV+HxTqPw1N5Mj7G621nfIFP/UjXlXiVNijxGXupUGR+HQKFLvUfnr9d4+oXkbjcmZ0EHOtec6G6iwcZd+dmyDdrzbvLkGjXjYZUj51f/Z08MbEbS5LUqZIQRE4ohKyavnsOVbOIHNHVxuHwLTxM355Jn1q+Rr+3hbpjS66baUvGjbDbmYr5KSY6tv5jiXW3/c7zybvH9O/GWP5UNK8c0eS0t2YuJnyKL97OXLHoqS5edim09lXzrU2DLk4v9OLdw+enDP1U271m0Vl9I2vJq4rsQWfX/SFf+nVZy30l85wFejHEi7vO1lc2o/0yDoJ7DbBdu95Lme+jRZMU0IGu8JCTjvXHC7ttISpItxJJniOmWKon5xl16htwRMey1MH8D61fVRlWSWYJZi/ImSmUcHQKubIF3CN1B4ReD4iEN2Jux/Ifqh89qYJ+lPF+kPb2cnm13FU7uOScM0mUzd4ao+zTRnshzoQUSAAAQAElEQVQQye8Ur8YjZjrm0eCeYMwhry4lzdrp0hFlmGAEHov5BBdeFjdGBOIxxXynxgQ3kdsduO3Bma59NMbGTVF2l6NrxNMid+G2m6bjp9WYI/3iecj59bu0uju0VrLy52rTFrDQF5ThEAgMTxatly69SnbR3WCaAPHQtzQ15Fky/vrN2bChn7x+L2bxOHPIi2z85R2Fdw7LiFhIWCsMd2k8NV/G5lU77Bfb6+2DonWr7MIBTHvTs+v2Or7FKv1c0blcZD5JND9Xsuvl2r5Bzukfivq/In6KDHsf8Y52Xn03mb1T+f9WnsxfY5W/Ik/ePnzO36V7/kHlvF+24HvJ8r/R/X+k8n4Ts5fofPg8T9A4n69zLdgoJg+YwmDSSdBN2riLHe27iScbp7D6I6zKhKnSo5gegfA6QlIeuX1TlcRWaCblyXiiTmf8NBk13b0Bt9vp272TMMIeqecQOwkuZm4oR/OFh4iYZtFFjwuhwCbTtq7jQaV4RDlmnO/XuZsw+7HOfUnK+SPqx4/ROnQefXYddy97kHhc+dzTa4TxwwwP8Y4iQz1YejPGJrXmQDPUreS2kPr8FtYolzKVsURgViPQs3IIm/sQ5lcqbRDXj26icVaDMurGScaGQ6OJAuznwm6r7pxCR0C1TVY897Q6u9s2kSWxunuLdEWvqpodbVNDJiFmwkj6hZupcCM5G2UMy1mw0L/M6BC8MKexCc+vko3wgNoSdoQ2ZTwsAi5OKCY9JCPcf6H825SaOY7CkTDifVwRctAYq4FprU8LWusgmSmToKb2pJLDscrajvt87cv59Sfo/JOId7Hx52n7yzjhtL4St1eJp1+jvK9V3lcB8UGyl8rhejHx02TxjjdoBZjVwFKluUptShXlH7/PowImJRb8xh5y7iZPNhY/JyfFPil1TVGhzQV55BFmr2jpn5VijFa1OxhNmzFHDXyLoXU7aW0j7ctHb2zl8ZgFUiieifFkeIy57plwQ7Tr8SmYOhJkasRwcupEwoZ0bkCpV7j0gMm5s3u1vUXpcuBbGgifJsn/SYP8n7Wa+SWSvkuLR5U3H7uJLy/vJ76wPBucXEaCOQP5AJ4/SG73EwpoGD+KYEIKk6D0dvLBtDg3k/+taDUaLSEnTM2IpE2zo08TOpqNwzSqPyYW27fvgOR6UXWTUjz1EPJEu2U8NAJWlx2xlSSM2Dyw68YsJl9DXh/61sm4ahpf7immqeMY/xxJMGfDon7aB+/G/Kdq430qLZyc5rRNlY8qNieT4zYg3KVXkp/RqDxEnsSxCztrDkkTWat4oTHYR57dDvk1kHRT2BkTWccsLSsWcswfEh/8hCS9Sdsd4pNmylcX0k6llrN5KPZ1eIAYemEg24373erzLaJ59Hb5AYprwikTzWH/pKo7HFM5wB5+Spv6oFNpnto2X3y8EHzx3rRg+JzP1z3xemSHzreqHN2rKSyIskzXpm8MfkMTbQnX44kmX0/LxkisMJMeQa2mKSF4UhOE8u2ySuxLmTWFjr2VblSnt2SLxAinKy0SLAJo77Uxb6xGrs4xrpVC3Ua8IzKaMu4Wm2adDdW9R4xbH80tTc/jamk4p4WiULsLpzQc0/2THHgiSYHCgOju3yf1an8XmIxSi0djutUHsSoeX84Mg2Stjm/SdSklk2PrFwHfAPuU0gchV8o+Sdp+HnuqP2Oo93Z2zX+I5cfv4pwTBgkhJ0CZjaGvL8ezIWHQBx68UwymvU01nUuwvEIylOw9N7M3iUf7RlKz2yI6LNcY92YTUta/HwLzVw1Ra3sQkstwu1cpZE7ZT/vB9JjDkOWOZLGtJbMryU34sQOneUZhfKDKEudIPlC1byNjwnNPfRtmvyD3n4FtVpoZupapDDHpwRaMK8jqN9LnOzFNwLvknZtPJSUHqmtCzn3ipBrWuh7LfyoT5k61VTpU3D4hhc/aQsLR2Cm7Il4TuQqrP0R8IdfD3qM5fDHMj/moEC8WnnwT2B1qg9pBtIdZEExtMPFwctCErgwnZkwodJLtUV/dhttNdA7uHLbnR9mCvGLKGUmb6ROTppIysKWFRnWFQD0RLJb1x0dP0TkyGJL8HuAe+uoSoDY6IbAUp7V3iMxj5XJIR6MbwKpoCqMXdDlhIAwSL43HKqvZfRiaJeVm4quNuFZV9k12Hdi1uBJ+NWFsjCQsfhLiUuBinb9Q229B+nWV8wXcP01i/0Ka/iN58vfk9l7gX6DlbPXV+XhyGUP9N+Er7mF7+2a+umjPIw5ul01H/ET+BMX4dPyxx3Zg1WOx5Fhh266SE6VHo0uY50lG3jo7sMjN1LhUKbbaNDUGDSaejG1TCSkr3w+BYux378QaN0qmXClZUTo1+0H0uEOjJpzio15XYC13U5Eect+OEbpodDrscYVOxAnPOdJ3dvclY3X8FFHlfvLKjzC7UZd2Ks0Wo1dNOcLoSFd4GJi30kh/SjiE1d21YlLPaEgv6/oR1jEtbjfx9MJ+2Rd3SndeAbZBqc7MDFNBtfBiEOxBPBFe6X3UE9mq+VbxxCCuP6Z5OEb2UJaETLteY3+jqC37WyBM2xg6yXw9JL+gxR8mJrHHQmxqJq60sdwyFXkfa6RPRY0jdYTT0DlvgQasVnWTI/sKs1lDxW6Dyo2ktS30rR7bYOqfX5cgkfK1sd2nSqcgyiCwQYxuzO7BLQTGjyH/pvY/CfZ+yN5FwtuxyqMpT/+WPHmH8r0Dy95JVnkXNB5NuXXp/vdj+Ye0OHkWaePfaVQ/S6XxZVrsPNKhi9hTv5K2HTfQ1nMrvmwtPm8dPUu2cvbC3cTqbfxs0GxewWW/EDzbsqOTvvxUPH8VTryD0a5cpjQcXUaLWY0k20WtRYbs8Ony/4QikExoaWVhE4dAODV7qg9J1lwieXWjxsguFS4Zpv9l3B+BwEX42E2QXo1nWxlq7ZUs3yq5HTLf979hxh7HRMjdC/toy9eobT/AtcrjphVtGcIztlETSLhplc7sQZzLSOwukENYPEEkfYKHfTNLnF0g7IZetpBULge/lpjckcDQlTI+DgGrEz89RX6lbLXrGKhtJ6GPxLYJuyGM5sgIcxOpB9DDOrt/7LKcubXdZEn8DJnGP7uUJWSfNmWcZgg0xFE95Haj0g309u4g+o/xBAseGc+Nk3LP6Jh1MqruXFcl71sOybM0aJdI4FXGWY2rcwYwv1+rszdDtYfCARtlaeeS01IbIJXwMM2gmTVHeOxProsubEint6ltt2srA8E/hdt7KB4hbvsP8PNpSy+ln6tJd11Hdfv1j6TCSZWj2rL7RiK177iJau8tj6RwYHu23F44sSy/k8bKe7lPzuzWlevZsmQLS4/tKd65/cTJQ0QKBRWpwHaaYCRQpizG++Vzt3UwJz+FNHs9xiuV4j3z6mNoMBlvOb14urHgq3OjHx+TY2YeuFrrZtOE+Nlj+E0TQCeMjC7L2bCon2p6B2QXq9y7JLMGtHWlMj6KQOARKzP3S/ddRiV7gJ6NA3TsGQSTsyvZX+gAmhQsIa1P7Hi/zBps2SJ9Vv8F8cV+uLfgjaa2s0nw7lutU8fZSjzGbnYVnX3dhK6NPMUrJEkG5soTPEPTQpJOnNwdXD5IdehuaZWL1DTJClkxqIVNa9y0rFj97nuEzy1QuYT2lgd5ePkQydxB8YpkRDIgxCauT8YDQT6KrzFHubE66JkmQfOf6fABpUGl5vKzCJiSOFMq8cJWHcBMk238GKs9QExej4d+E2eO576JvcexJC/eK1e5iVITohsLKx2C4xTInywC5mKMl5Ycsx6MW0irD9NYGg4iow/mUi41rL5DXd2v+1ypuTGYzghBdj/GRcLp08S7si32bQYbv2D7Vs2QyTGNVdZ/W7CL+BBUOKRjTfGF5FCqIymMkXBmI3XJaJWUpQzDCKxb1yKDdLX64rVKrwbXvrfq4r4GoetYq7rIoMu2UNslXrQ4p9NlnCAEHM+HBdihPowxQZWVxYwDgZAj4dTgv9DdUprIyLGa9sv4CAKxYsMmSK7A8uuKGfTTTmtQ8X7c41G/Ppo18WoumeU5WVXbRwiemJ34Im9vuh63S0j8R5Kj64hJZpf2nZgaZlopGfFaUryGVLULaK/cO+bHBmdai4PesDE2b98lp+1m4rUoDxmB9GVcLJMQiLEXDuEDOD8hHVxD/4I+XqJxku8cKhZn8AGaGTz3Ub/XH/Zko1/97TdozF+lNkn2lTqhmd23X90uOTSkfgl++6mu3UjPjt1EvzHG0PAM8jrEViUe4PYpO+Why4ZrG6+DOXz3eP+fsabKULqcJI/fsDpGxYTToM24ogSkPyyBeS3tuWZEaYy5lMZgri4ZwNitrTpJ/8dcyATdUCh966eYXfFvYdkXGOr4IR0SdrHiGo7tiJMaCgNzikQZJguBl3iFudUl6pMXaQDHZ+VPFIe0YyQ8NgQf9SnPOsh30bJag/6xGWbkUawumMaVed5U+l2oa0BgaQ2vNJeWpgIxAyoPpyZNHyJJfyzxdJUo3qreC9mq3aM+ho7aSZLchDUupq/6YDGDHoZFXzqIaaIM2wNNGG/DY0w6JcmIcT/hXSV9Fat6fcm9NNLvq40/AlsnWRqr3EfXmHY5LsOPcq8FLqCR38bNC3oJPmCaBVO/7WM4Tgh1ISMGsw1Y/mOKb4gkm0sZwd5gWu23Lbj9HOwXtObbitX+LpxKRWMl69b5PRo3GVMdXDRgqjdoHIMeXr26xkBlHZ5cIMvpSpFd6gSBMD2iJh7cN6hvLidPLiHGZYzP8RBn4eQmg7pVPKL/zYwFrw4TsL+xPnx2Mv/H46DxgZ969WSKR5htsapLlQ4QD3uqAaYVWbsZa9zHhg39OnbGGoZOkpKVg+m+WcJDM+sxmMdayATkdyk/o0+1r8X922DfYnfLTfR1dvPRVYM84txShqlE4NTuNhlmJ8rJeglm4ls6MIlr9gvRf/F1a7d7sPm76FF/7pdlxh3G6mnRLg9HReOk6S3INDYGidnDhaeNfaw3nfyjhQBzupcOkA/ehSc/lFNzncbMDrVeMlv/j94YBkAv5LeT5xfi6drise8RB6e1LyOrasKMwCpWw6eexx3HMk0oydmejDEWeqy2qI8B1pJUpefyi1Rj/KRd6N7pIGMmnzudXONhQFrkPtx+qBWyq+jZsp14KoL9gue235lZcmhOTHwkg3dSSb4jnotJsW1qXCkjYKf443os+REdlfuJx4CJIMzSXdLFeY+Odoh3tNiDa3/qo1lD/Dv6ukPGxbivDt2K5+eL6isx3wpytNARZWgOAoF/vkV9eZn649skdkcxLnUwZnrCXrRwduVPQTbm+yfyhvhiuIlH9z6hlExk2aMqa926Fnprx2P5SyB/ou5pUxpPjEE2oBvvJ8mvJG1sYrwzEYVTMq8HS9eA71SZzekksxBc92H2bTL/HhW/m5MX9T7GyRVxZZxCBOKjVGltAV55lozTp6jmuUoHnpwx4tai7QAAEABJREFUpIRsK5bcSa1vN2HUKfOMjoWxm6ldyW7cNNuMN609prrda5jvIpEx3jRCyopHhUDB/yt3kQ7J0U2+o3tuJiaDaLISpEkhHJz4HdXiXdV4PcV+wf4OTky8JvU+PN8sKsP5m/rxZjTIkgGNs8nTg8EbYfjm3E5WOVd1fQdD+tf2qN2TV68Kb3oMPhh+dPsB4nHutHYJ8Wj3wewXS6aeBw4EkuFkc3O6tGWCQvDBHcfvIa/fjKfnY3aDSt6lNLt5QA08SMyI1f74gJv5D7H224rHl7ssfyR/ISN8j8bMw+D9Ov/oNR1MSXTJCHNNOucZhY0wylqjv9ccuwvjGpyvkyc/Uxs26O6wfV3bMk4lAk4d8m5VeQX4eXQO3kLPwr0+h86ONQYveEN9mfXo1iH1cXP61FVz2OPObqp5PX4LOhFBUxfjcdCWOQtJ02dg9jywI1jVLQzvLSrjF5DdRjKg2XIbH7DxEaE9AxK4uWaXBY5ZM4SHmM62YPxc3fQTWux+li3tZ18hRxkOhMCknltIQm1uu/pkpZTLPPD0gPW5ZuphD+73kjU2smeLBvwBc868k1n7gCaUNonwfvHn+MaYbp6QaASuPaRJjbvVKxNSaFnIpCEQ3wNI+7eSZ1q1sXBo5PCyEwltpaMnhnyI7zDg94trf0RiP8bq6x83QRsTry3ZbpLkHrBdTDVOJuqgpvG+iyytqf7Ji2H4HrNwjyYR12j643zy5Ouq7Holre5Z1N1cWSNCJjwGH2AxiXE/ZhdB9l12t95z0JWURP1hShNOyDQqMFaz8+WS6ZoUI/uOdOwtYLtBXKF/R00seIN+Er9bTb+QzK5i+/3dhAzdF4SQEfmC3bI4QkbsFHdMvb2KN8itn0o+9lX46O/ty7fT1vgFaf5FPMaBPagmDjCMgXbLOMkISLZKxppvheTnsm2/IR19A+tX7SLk8ngrD9601j0yk0PP7cFoAm+KeBMnuSZjzLeDnG854VPn7MYK2Sk9neT2FDkErxA5JyqNd1U3070hDG8h58f0tqwnfqxcJ8cXzYnftKt4D570qYyp7aAY4Ga9EvK3Qf4jKn33Fo8Alo6uuqLJsUccZlUZJ76ewvi0jAMFMwl92475rVTmbofTDpzvQPdO/LmJKzF+I88G98ggvQ98j0TI1I6NfVsS4wR6MVvPwJx+loqafa+X+9MTgZDNtX7N3rf8hIxvisgbcZt6R04VNyUG3xphyD0g3v2RjIvvsye9j2NWDiKBwb4hJl53tIche6fG2zZidnrf65O9H7QWq0WVDVRrA4T8m8w6Q8cdv6SPubV7qNS/r/Z+TpD8RDbCQ6pWclfyVzuzIrraYpJfcBcJ38PtPHora4gV7oMZmLkQcaVmA5AT1PukkREOXUyKuV2GJZIR+U0cTQ5voDssI+QkaEW3YpcwZ/Dhx02GoRC8kvTuopLeKc7YzPCvdjBlwcQLxiCWd1PrGGQ8k87Rhs0rdmCD15L61/H8AtF/F9geoKE0ebymwo/qGLyGHF1nk3DQeMu+QtWvoWdlzxE5uiqM0F/pnj3iS3GF7QBrlh3sokG2oj9Eo60P6bGpcXbjPd2WHXJ0/SmatXo95i8QCIuAA6+S6cJBY3RUPApmfjeJBELacQfxUxcq9KD3jOZC/KYdDa1c5XJUPFaPfDS3TUgeI2axN2rAX6EOWkt2fC8hDCak8LKQI0Ig+qFv904q3Cjj81alA61KiVd8UNceIM1uIfLHfUdU8TS5OYzRIe8VNeswCS+zUEQ6nPLoxDhx20ojuZ+Ofo0R8tFTUeZsHgLmnLN6iKEdD1PJ5MjwVcyvw8VPTl10udLsjKGv0AqIcx+xkpcn36HP7igcnBhbj2u1sKptGqTimhzw+4RRH0UZj8s4OSfMYkzthuwhLd5MzRgLHOKbFNnyh8nyn9JIPyesvkNua8Ckj602pRgw4cFFv/hcbXG7Fbfzsca3aPhaHnlNacLrnHkFjkyK5fmPyZNvgBze4UmxZumcqcHQyRl2dO+D5Efk6QXsSu+neE9X8uBAVMSvjuT1sBm1CjzVk9CWEY+HxoflKoN9xBeiGUcIG2nb8bvJKrdi6m+X02t+rcrWaiND2ubjKLW85VAIjPAarJMvdglp5UtayLiamHiI/uBIg/i1LRkks41Yvll9KLtY/4+02DHfLx41dpLbA3T29XIanjDZIRzd+7a0Mzc7kbTxGvCXqcpjtX3s75Pq5CiiYzaE+QNqxMVSyFdS3bCNeCyCIwxa5iajT4NuvbqmX6VN1UBzsF7VeRupXa36txKznJRh2iAQH9HI87tJ0otAhirsv+Ig4W/bgJs007mBh5cPaX/2xMFtdfGlZukI4TWgholn9X8qo6M6TePTHpYc2Tr8E2Omc1NJxCyra0qbo74Kh7eyR05c5VLcvoQRHyjR7LKcGSmEKSVnKipzcrUxJoru0nZ4Ja+f2wtH95CGxWkZ+ZxujbmbdZ+cPWmmqaC36AOvabMNq2wijBYp26mpWvwRem/Xsm0M2PVa7fkqCV9Q+y9V/VoRJ3AMp2dmjfngAZDMlNwyu1xt+gpJ/bv0JncSK9rh6KuBB425GfJ+wE1Y2EHzzYoL4oGQEa271w9PihWPtV+jpm3DqWs7s/peBI8iauXL9uB2p3jjAnL7Nv12VyEjuiw/6P1aqSJPt4snblWe7UoqR/8nP6oPYmJfzkyS3S9HqZdD0clhQsjBeJXB62vJ2r6t3GerTT/CuRezXdrO1n5XU6c0eoGlIc6xNbh9F+fLeO91E7Kiu29T+lY1sDzsxXu0jSe4Ds7H+943cfvBo0O4bcF8vYodQDw6ic6uG/Ho8j075tCePokcObr2axgn4LQBYxXcagByIvxh8uQyLL+YJFl3ZI8v82gQC9Cay+lU+cYUzqabZq19I9iVVGoPFI8vU4ZphUAI5O3bdmom/lpy0yQLWuVERiERJERsUIrqfvHkNaRZN5dNmXHKlITu03K1bRfuEl4ewmuqFOu+zYs6e/BsLWljBz3k+14s92cCAuaFvO7ZuJmk83LcviiqfyRD/kFt4zHfpvep6JiYGMa52Q618Val86XtviX5MbqVvJA38ZhiI7ldY+4h3StnidB/E0PbwUsR/r4bs3tJBncQRsvB807OlWh7rHb2992JdX5frf4PyZ5vqLJrcNNECTER3dDxVOChasYZPeST1YTlDuLDW5Z/B+pfIKn9gKHB+zlxeWGAHbb0tC47ySrKlygdBXGvjCgmxVLZeH6O+v0ykHOF7L8CV2ZDcEJGxNMtxi2Yn0tu58t5XFM4ujEODtXKuD6Qaazma3XveoxYQTvUHRNzLah2TTyZ309ON6ysH3HBXZZz9soB0nkP4g31tf+nVh2/rHJ/pqRz1qdt6H/XtoxjQyAwy3BhaPYQ2BXCVhNu+TfoTW8mVtaDl5jAEK++tTV6SFV+IbMlByew+FEUlYPthvxuEtmKe/XYJAhQH3Zy/3J9G4sHVjC39iyBe4Yq/20B/mTgwD/boguHiNFhQ7r+kMr4CWn9W3h17bBjKOGoC0cctcxNxfslNDbhhUI94iIPW4BLXGhqBdNqYfzm4lCyg4lmvMMSUWYYFQLxpcz47TG3S3G/CqxbfCJBb0psxe0GKap76dkow9SCX5k14TI57231nRg3g60njA6Yyja66hauvo68IhqqPeU4US/MyKixEb8TnrdvhdrPSfKvajxdqKbcpT6WgqKhfVeambGQ6TYkA1TtQ+1DhkX9u/RJ8Y5mJW+k1WuXDpJWYlLtWo00lVXImZGrk7WtY8kWPL+ZWrqDMFpgsuo6eLldMn7PWT3E9vbN4obryZKvQfJJyL8FdqPSZsJ4c+oUeDN9QkGP1cD2AA+AXUaefAlPvkpH42rWHrOpeKQ/2shhwopWI6/aYXJN3WX3nD6fgrFpXkyKsXCT+vwyyYhz1EhNilmMh5nv+AzziJxTOfDGVZJ74u/s+wxkdxWr/aO1AduX16h3rCdsD7e99oiQmsxo1EhMk5V2K0NzJ3DSWX0eT3Ycs3IH/X6r+v2bGvefJOGbYDcoiRfoB0mEAj/tlfFQCMQ41QSBDeJskT66RZm/pf3PYuK19qE7J+0VipBtewb3SI+sAbsZ9/gys2hhqoJWdWPRMrmRSvKIHhuls+sGkQ5Gq67F48pnepUzN7XT2beU/rbToO91ZJUzcX5bYMvR9Q6VkCqNPhaMrQ4DzUpwiTz1b2K1WziSz2MfqPYuUbmtOgT5NjyMFcsPlG1Cz5nqcVsnZrgC2tbRs1L1T2gNZWEThoCEcTzOXO29izT/Lvh1KnqbUjiBt5HUL6dDxlk4xTo5u6La3hjsI8/uULuu1vjYAlZn6oLGhT0MdpXG//2EI0AZZjQCYdjEBzGy1ptJs69iJqfXfiHeitW7mbjK6+oPOeomJe/3QHqJ2vQlTcxeNKaVPBVSxHg1p7exhSz9mcq5XediImAyDQbR7tuli26Rrr5Nk9S76ZoCHcjBgmROGP0xQbBzyzqSvp+R+OeV+9OSvd/F8msxHlAKQ0qOw1QawaJi31jYKJoQRKtr8Zigc5/ouhJHfF3/JK2D36Fz8A7mr9pJ9CtqG2MKY7OZxlT0GDKn2eTbRI+QI4xCRsRXe4c/YvQVwfYtsJsArSgigzYWC3Q0c6KLJ+qYxVNSd6s9F0L2OfL0h5oIeWDUq/0j7T1bPD/Y2KpxcQXGWqXJlxFODxk30VA/LOzZRYzREXomYhsy58vL+7lzxXoGuEb6/isk+adwzsOT63F7aLidmlDyov9D7k5EzbOljMBDeqLwmbolK9eAXYAln8GzL5P2X0W+YgPxjYTAmkkKq1fXaPhG1X+N+usB1RJO9+TLj5gAxWWX282qey3hdO9t5yicXTfOWDPsxL7tnlYKhzacWqUzbm/hrQ+08Qfb5rB+61LVcQKVyrNoGXgdzh9Lcf6RGvoKsCfouF37o6iPR0Mws4nl4QHde7FmJM4jHN3JWHqX5GHBngaWD5J641EiJmmv6JS8G/OrMbuG9u07JlxwTBLpR22xIdjjNwFjJhW+rn67Qjx+M24/JvG1xe/hqUNnJT6LT6rT3/IwWXKJhMhNOFP0OLOUGslmyK/SuPwpFdtCYTBShpmOQIynYxbukfF0B42qDFk+qSZ9m+KxTwuFNRMM2r3GBfHkwUYs/wX4l8jtP8lrV1BfuXHUK3lq/GPihkX9tAzeqXM/Ij7ICH0ad5NhMEjf2U5IbsTSC8n9foqP46jmZscuy4knAZYfv4vqnnvwuuRP9imten9YpH1eOF+srQwbYjJMbZDDWehWcZUTWEX/KMuExihTBiXCTfUVzoutVw23E6+5JPyn+ukjxSROn13H5mM38dFVg0RbGGPIkorKatVdFaVmRRcNGUm1pkndaPfj6ZisMyEjwt4bspsLx8f930XLD1TdnZITmuiQfnCin3Vq2sYRfukXzetF5ZWyF75GlqbnamwAABAASURBVH6ZjvqVxAr2uPjDnM5FA+TVO2SHaFygSTb6hc/E4zGMsei3u0T/j2WHP8CkyQi1K3R8vM7QveM+0tpPsMZ/qv8/Ivy+qLb+TEmTBXSLFsldjXUJXe0fvXG4fxoCIPp/i0bEbeR2IW6fEWb/CY0fURu4h5CjMYkkhaK8kxdD1jX6d5HkN+BcBvYgZpOtzxuqQ3Zpcqua91Oq2XrC6WY4HMb5dONMKqxYPB+SE6nN0+rslieTbHkStvVUFi4/neq8Z1FtvAhLfp2EPyazvxHf/bnS68FO03axUiumq4w6hHAYJtzQjJV/DyrfYNIc3X3pSuMj+1H/vicndj8Y0+hToWpbeqkU+LrJExyqpYwTh0AI4eI3AevX4PZ1pfMkSC6nJdtKIUQmrqppVVKXjM4wvtvyNVj+Q9F2q9ouwcJkGT8agzJk0IQQfg15cgGNxp3Dry6o9jLODgSCr+J9rWT+ejoqV5L4lzD7LOQy3lwGjYnHxAchM6dXi8WfwfuaQXe2ijQp2PQ74tNPa1LmfKrZrcQjeYVMkPGmDGOOIWv6a93kjStkuFwkXO5l+MvOE2nMZhrHsSJ0G/ADqN0AK3cR/cI0CkHPJ04eKjD1FTLqs6uoNL4hq+Is2Sb/ggXf8GOcm4gVX2wT2E6gHwojqw7RX0rBS5Eg+vDgKfJEivsc3S8+jNVbt8CrW3fHY7XCzS8V336dJPkYaePfqA6dy0B2LXcsf4hYpQqHTQSq/rFHUwuNFtAWtYwmhcRzaloEaM8Dr6klIvCLFf5wfGhcKijOFgFa5U9kO3GfUFF/qG+G+0qXpkcUFYFVQ9vgQfEjN4tW2bKSb/W2b8lmuF12306OREbEvZ193WKvy5V+BEy8jChwNbVBWDs/pVK7iZ4du4kxySSGKD8mupYe28OO7feyp/ozkuwrJPlHhePZGn8XanuzhvEGUbEHOQjEWNUJbY+GGPwl+0vyzdhNrHrH6rfxHfHCp6jUPw1cSMfgGlYs38Y5q4cITJmiEI5mLX2QpPJDcvuJao1V+UEKftLRxEbhgGwFv0vl/0STITexeftj9Fhy6Pr2Kun6/BYseRIuh9YrWrG1/6P9vxGgf0+avwcq/0DCX6isN4K/GLMnYyzTfpu2ic6PPg4DMUDxYjNXkqVf1c3fZI/fNikvU6vwR+JQZ0pmMYOaPnJu4ndcmAyq2Ae0vZR65ZYpERyqsIwThEAomO6eLVQHr1AfXgD5fVJaQxNU+vQtJozvLVu04tb+M433czX+41HuboaNyYkzwAsZYBojvkFy5grw82jleu5euZMwfCjD7ELAvDD4FizYzWDfHaRcgFU/jdkX1c7Lle4nHg8NR6PZxkzwZuH4IOMvHCq/RWPhQtF4toywL1Dpv4L4CZ1PLe2jy458TITBMGjrSOs/kAL/gcbcnRQricj5whlviHaEcei2A+N2PCawGj+jvbGl6IvxljvZ9wWmIX8D360r1zPUeztJ36U0Wr+oVcd/Vh/8E6SfgfybatclFBNl3ILZ3bg9iLNF+2qzyTBCBnL0494U7wFDr5rQS+HQ2k4MyTfJIWOdylqr89fr3GW4fxdPPi974Syd/wjeqv3aRcLvtmIlN5zckJfqMMYbKm0JlVpV5cuGMqNpwYPPMir1nM7Mm0JGl+XFCn9MIFG7jZbat9Xf/w72JfXFzwgnb18ZUfC3zk59dByNe6up6j1KD4tPrie+spzbv5Pnn6Nj4IriY0zBw9EuZTqiGCus9eR+1XOBsJDsZA0TISPEeGpLnZg0SvyOouyQQ73p+gP+/i+HDePLEBiF0/vVRXuKCaR4WsLmfAvsk6Lv45B8E7hC9N1BMclF4B5OVV3X1Rf6z6wIrpZEe+TYycEl2lnIpjVgl0P+Vemij5H5ZyQHf0hbtpaeJVt55KkBm9qxG/22Z0k/bbZG9JwnUXiR6L8XIxb61AYdcYTBER4FFttwu5k8uVBj7Kd01jbuz6MSooep7Gwa5Dt7NGO5BrMHSbyqrVZseSHYi8Rgzweeoe0p4Ctx5mnbCoTDaNqOJrru20u0bQe7jcSkTPgP0tp3mcyXqRkJbqT1VnWIVqJpA0ZLO2MLFgNwo/C6jCy9lNrApv07ZWzllbmbgkAI35hxDGESK1NdJv5tCiVTW2m8k9yy9SHisZjczsHtEhFwH6FcC+OZwGE8QjXukQAMwWXbMe4g12pukp/DUMfPqS3ppjAeKcNsRSDG0Dmafd6yZAt9NSmu9Fys8TEs/wKW/FS8toYwZgqnpDAmM3zc/MYog++tI1ZoBgnDLxyfYgbdz8ftE+T2aRkYPyC+IDzRj4kFJvHlXqvcpTERBt5/4VwtOh6mMHbGgIOT654YYzWK8coD0tU/ky76Jp6HM72OMJyVafpHGW4x8XXOCYPFo3m75j/EwNCaYvWnZeCbkh2fIfUPadLkH0ga7yH3szD/Ap6oz/gh7j8lDETnStyuFh6/0PUrdU6Ta3Y5xmXAxeDfg/TrSv+B2UdI8veLJ/8Jyz+OJV9lzuDFDPXfhM9bRzhiYVgGXVjIMxUx3ujG1o4qjcp8jJbxljIB96kd0Rark7XUaAzmHHHbGH/ospzQt/FoeK9dL4f3G+qTj0LyOfXjJeR2q7brGeZvjVfZr8N8r3aMv9rD3BllhyySY0g/Rrf4626wn2v7FfHLv0L9M7QMXULrnrs1xnYSEzYThWNgEivfqd9Jznni2a+C+NrsIW33EHoZNO4JOiNxiODKFX1cU55etUVYSt54Kpzt24QcCnk0UbSrktFHc8IGiImk+HhdrXctHcI05z+BfxbdHycmudwvI/gg5HT0xfAE1jAvPIqDbpkO8ZA07O2L6LtCzvcT+sdtPfha7f+MkE1mHyVP/hn4ItZ3Gbu67yxWcidMFqnk8caQhRsW7MG1qJcnX1cx/4XbtWAbQWPFqeOI3/RfJ0YVh/OLn63G8Di/j5DlJt5PG9+nxe7XGNPikzn7hGSf/YPs6oZjVg7Smml2eehS4vPozk+xXIPZe3AJQY1ojATXf1PisMGVw5U/V6prf0B3dasD71C5F0sxnS0B9oUpe5laBHCG6M/mzlVTTtBhp7am7UTHhsrdjtt1qu1HVPruJT56hDCe6JrK8iYfgVAyMZiPqv4Tr37ipBrxkYM0+ykVP1v8/GWBfbnSPZht0zaE8hAhyIaVS6b9GOvDaeRcbF3CbnjFTkrZNxcyIMlltPgXVc6XaWu5hnWd2yiMA50p4yxHQPwVYyoMmp6FG4hZ/DT7Lxp2Fol9jDBmzH8hOXoHhdK3nWDDs/jD/DSiOEPHMMYwopOijAwveFO6yXZof53STSrvYm3PKQzYLPtPqF9MGF27lm2btMfEuixn2dJ+8sZdZNXzSbJPyZELo+FK4SA9bJsIIyiMhxhLQfe+adjYHaR41E0rm/hdQIzXr1FJz6bauIA5jfsJPR916eKMikFz8Ew4vrH6E46QLXmA7q1rGdx1A/XKFaT5BVQaXxYUnyLPP0LCB9TG9wrLd4O9CxrvwrJ/ILcuJZ2vvw/LP6S8H6NR/SzhQKdDF5HYlQwOyqFacQ/Bn/HRqag35FPQgfiXCQhdmFaJ26mwArcO9fMobLUJqPeARbjGg9dJazHhc8AcU3tSGEd/h4yIDxkVMmLwXOEkGeFngX9FeP0U7BalB5XC5upjZGwg58FRm3CdG0t03RH3Zbop037YroPa79X+VuLpAexajO9D8hms8S+69kW85Wfs3H4PMTkej+IXfKIrExmjzJARc2v3yLH4LmnyCTz/mqq4Ave7Rd8W7cfTDAOgCWWXbNs3aWAQ+MQEmiFbnPt1fBXY+Upna1LhO4X8iTqiLpoZ9vZ/jLsYfzHWvXF9McZz4Z5XPkhqmujyzw73hV8pam8XBuu0jbbJ1uBRnTF+flBxExYf5a3ol+H+6Mdsh3jpYfXhHeLra1TbxST+VZ37N1L/MFQ/R1a7iDmacLt72YPFxF8sxBR9JJx0Q9NjjNX4NkclX4O1nisZ+kmJyZi41Vix+xnmt17RqbFkNYr2E7JmeJyh/eKc1Yo8hYMrW9H9Th1fTm5fIWl8SpNJF9Bev6/QlUX7dXWfmOyzf/DduDFmCeKz+ZZcp1Xer2FSku7fENGX6cY7CMPD6NF+PwcaTEFspLgGGnDsIQxjQ7PLdgPOhbrvM8AnqXf8YFJmyVX4QWPnuirp4FK161TcFihfrExrM2FRHWd7wNaKSS+GubeTHd9LMAJlKBGYSQhIiIZxF++B7MlvkiLUrG/j33A+K4F8oca1nBFuJ2ZWh2fwuomxjm0f3tINMtDjsUKzeySsbgWuIE9DAH6GrPJJWmvfkrxfQzzaepk1dL2MRxUC4rGQjWHQxuOqc/tvIa/9UErtbMHwftLkI+K1r2BcouN4tPROCh1k27TdrXPSQzJoCn0jJRm652BJjKb8UrT0E4q0UL6+Qfv3gF2Po3qRg6s6jX+Vc/hVequXEwZsrOaF0RW0ShkyWSF0cKxoxbvNeYvGSqsmgxsfFo2fxPNzKXDwMIZuFwl3YBZO8L3DW1+Dqx1wKcMrm58Rjv9GvP/WsGuKj2iFfo86dPPMjuZEX4R8CqMv+ubzS3oJWRV8xMr7SJbdwfata2jZeRvV3lto7bm52MZ+W8+tRNq24zZ82Vpsxd3cp1XbcKDDWYlHT6PMonzLmCzMZBZS9U6yfBVYJ8bobDUmIbgwdWuQVcfqHE4CMfsWKbpCN4SM6D5mI/U9txUrffgXxNv/jCX/gvvn5Rz8QLLiKtwC1WGHJ8Y5Gu+Fg2exCjSSajix2iRH1mRcF2nvNeWPCSPQyq1pdc3uLXSX28/VO+erj+Rg8j7IP0aLf4twwsMBCUM/eHGyeGUEkig/xvHdCzeyi6t1+otY9hGJpU8T4354/F+HIRzsbszuI3R0bN3vUP4blK4gnmYw6fJc8i6pfZb4Enq8mhHyJ+pQpmkTg54Yi0FbjPFwfBu7by5WOPPqN4i+sOr71af/zPDq//dEu9qI8pjke/Iw0Z/D/dqv/UFCZzzCA8huV3JGJupjDERilCHyuuofuX+kvBEeE28hx9v61Bc94Ju1FY9q5TaeOHEuKr6ibMlZWP4+8fI/k/vnaan/kNahG9j3iZIYC4HHKAmb0mxBV8jOHQ8/SPvA5WqT9HisRidnq73fJ37/17hR4/UOgh8xTVJF30TSfnGuwOR6YXQplp5PYjHp+6+k9a8TT3mEjA7+j7p4fBiDADUnwIyB273jvoLgYtm8cpY68mNy4L4mIi4Sob/A/FZgLcadPKp0xVhxTtc8uQ7sZ2rYBcr7OTnuH1IHfoyh9u8IhFvo6+zmnNVDHIRohsPE/T/DU+a2aVW3+mS14SkYc5TGgM1hSHFiNrBPbb2DRIaT1X/B9vu7y9Wqw+BWXp7eCMT4DEMjZtdD2LQOnYfnHxWfv7cQymYxefUN3L6Nu8a6XajxpWTfIVboQA5CZozDAAAQAElEQVQEHwc+AP4B+Ryfwvkug/VbivfeQoFFHcpQxqMVARt2XkKJhWOZHXO/DNrritnsMGrNPwzZe4TORyH/0jCf+U/FR1cSDl7OLRi36/papbswGTiF4pShamHwSUcNPxKmfPYL8EvJ7QLi8TD3T4EcysQ/qgner8jou7R4RzScplhBnAoDVkQ/GoVFGHahg8PIyfy6YZ2Z/AfOPxPGkKUfIpGRmvMxHf+7zv+b7v8wbsLI/qkYY9i3iPEaH1CKsqJMVLYyzs6otoUcGXGCo73Rd7HKdrAU1yNfpLB74t4oY6pwWkhC3eaQ2PHgc3CsaX1jnqv2BpVazuYhbxodB61Y/Rv9E5MQsdIXDmasvlvvT4uJqYafRcr7h3WSa0KW81XUJUo/B7tOMuNGcm4RzrcprQHZqUXytcL9tuKauRwLCwdSssW/q7K+iuX/Tpq9T1s5IVpZGmz/LvFhsnz5XcSrGKEbg3e6LFeZUxSFRdQZ8ilwCIfbk28X4z5pfEBtea/a+0HIPqrtpyGV7PBPE84UqZzC5H3kctarQ/9FNb+akLcT/WrGpCChdgfOMV6DD4LmnoUbiL6IpzvSgR9D8jW88XFcbST6DdkemXSGfU8k/VTpKkJnGGsY9l3u17mHxBNyQG0bwxMkWrCiX+eHneJwjA+aUJ4ib29xb0z4ezxZkzxMscjHHRS+knjQcvGih/90nvrlPzH7CEnj/Vj+EflW5xTObe7XFpN00a+LV2wndGK0N9qNTcNxKZQeE0VjyNUYo/HBsV6uKp6YiQmJLNE4yt5fTGK7+DE3+YXqG5SKff9UgYklH9AEzoc18f1pYrw1GjeyfcXDxFgLGXAIHMbu0AWwIwQH6PmgVnbyH5L550jVQaRdkGtA2YcwziLh49oOp5iNz+z9WgnqIjflyXS98XV6W35ePGceTm4YuIch+jH4HfGBG21b2hisrtYgf5EY7Xil1iMu9tECMrAYICE4v0eeXUxb/tDkvKdLGUoEphgBCbBQriFsYmaN5XfSNnQ97UM/JhQmLf9Jpf4JXGPdG2dh+Vmaifs48bhR0vhyIbD6k8sY6r8JtOrSs2TraATXFDeyrK7pCIjPuiwnlHso+XB8Q//ECl0/V4uvLiyMgoLPQsdk76bi76SaxGOqMhrsw9JD4j/pI6Q48U+S8zGcf1XTPgSN95Il/4jbB7T/UeLR1cIplG6q7lpLOLhhQIUhNaX6iceHERxCV4bOjNWM1p1rCGMoDPxYAff8ewx1fos8/74mBy5hsPGLYiVz3zEW4zbKenwN5ZmmI7CpSovNE4+uBG/H9NcsmmJlNwz6abeyewBAgp+Dr2OcxniNcRsr+W1D1xc6KWl8nbTxScmKD8po/gfy5B1C9h0Uj7Ln7wX+icT+pUjGB0GyJM3/Aeedyvv3hHywXPrLP1+Mr/hCcOiuxsp7i0Wa0IMho5otI5C8DByCntCpSLdW+m5nqHENycBPyOwCWuy8wtkotvUfUs+vpLbnluJphtDlsRIXbQlMmWEhaI4+CPpHeCGc33hSI9pYr1xR2B6Jf5HCAZbcz9J/ILd/HO5jzlJ/f1r7Wh0XTjFZD5eAXY7FpKhdi6NFO4+VxoMk5RnOezlxb5QRK+zxe7dm/0FMSnr+Pjm178ZT+U38C1b/NPGV+bz+I0Ke7+i+g23LHySc25D34XtFv3aZJlDMVe7Mi0F7tCMmZILPYkIiVuOHKj8vJrGDHy35qiaUvlik2K/a+cRrJMGjMZEV/By6r8DEwsc6LBbJuJEKggP0qCweHwjDY+QdmRAA8eGGanYhA+3fK2afwwuPZ8vDsI1OjEeFgvHi8ZNodDQ+mDMG6biJGseNb7u3hZb2lRJ+vyImfj7GQozx48JjQkNHO8FuhvjYSn4hleQBio+AzFBGZYaFktwpQkD8HOM3lEs4IzF7F4IsVqDCEIixHo5wIdhkGISBHjNyIbBi/IdCinujjKmWAVOEUFnNRCEgXhvRP6E3wqALHRRGQfBZz5bbi8dS+/uuZ0/9SvLkp3QM/giT/A09FIqz1nE+4RC2Zj+gY+gSwvip776RuDfKiEdXezTxErwZq3/Bl1HnRDVhQsoRDkFXjJugMXRxGPgxEbBqWXdhfMc2xmJgVOSxOnEPundCaCgLmXgE3LSq1i6H5DgSWwJWBVklNCG4THqjjuV95HmDhacd1qhsApUHrrLLcoLXY3yM6KSwN0Mfha1aPLa+4waG+q4tJoPi1YRwBMOojmQDl0ByqfrgyiJP+46bCvkQP30V9u6M0F0a5yMYxPgPORAyIuRCrD6Hjo5tOFPxuP9s1cP78kK0Mdoa/bevzoj+LSYD+i4lfJe0/Tzy6pcKBzQmUVPX5Afv1WTouyB/B568HascOOXp3xZ54lsAsbAX9ybx1FvtU/I1ztFCwLlanfxh8TpMW+Pa4lWKeG0iVtKDR0OGhzwP/Rb9F/RjM2fsHXhE7ndW7Ym2xfgc6ZNod/BjTExE30SK/Ti39Ngeot8ib9wT944Bkwlw6kRwdEQ4vtExQUgYCKFgYwAFQ42kaEhci06MgTcOgvdD6wgO3Tjj9haGFi/XjMEvy/B5HW4n4LQcQaEjt4opraayturE1eBfIRm8UMrifqbFC/6iqoxHLQKT3/C9MiGEUYzxg6W4HmkMAmvyaS9rmHkI7MdvoYdCv4QuCuPu7IW7NcG4k3CIQxeF4oxtGHyho0JXjSjRuDf4tdBno5sxnj547cWhS0Z+pBhbsY1UjrHp002Ho+RMKtRa41chnikbYqnsh/Rwt0zadRMFMIjbViyJxzInrarJLXjv2IgxEeM7xnnIiEgjciJs03AEw6iOFPshO2KFM/JE3rgv7p+R8iEQ3otDyITAYiTF8VElI4TDSNujP6Nfo39DX0S/h16ILz7HV97DAY0J0JggGXnPv0UTo22aKKluv54DpbgWeYoJlZ5bi4/lxUR/rEiGAxeTDCP+UEzERN1BR6Sg66jrj314M9p/oHSEmEyAsxtE7p/ESEFYpH2JjuNiQOn6/rdM5XGXJ7x5SweLjnsCSeNlmjN9E548Q6TN0X5yRKQ4ue4fwIkPGPxE2y9CejGV/nWEk19goBxlLBEoEZguCJR0zFoELCYenZC7kfbXR3EukoQ/ZSgRmA4IVLpbcVsF+VPBF4ikI7NJVMC447A900uebKCVXnoK+2bcxU3fG/eTEyETIhVyIa5NX8pLyiYSAfV19HukEV0RDmikEYc4HNOxprg3yog0Um7UUfLXRHbeIctqnhA9JFmTePElXqF7w0I6/TR88Ddxe4vSc8Vz81VrqjTe6LqxIWe5V9u7SfwHKvdLJPnlsHAT8XMtqkTXylgiUCJQIjDNESjJKxEoEZhyBOJjmY3KIlJ/Fp48AadNNJhSc6KZ7BofIMk2k/UPIKupOYSUtZYIlAiUCIwfgaPL2Q1F8uQti8gqvwTpmzHTii7PlA96ZI7u8OznkBTTVuI3dM2/rpnQrxA/07R9+fbioyqqZPzdVN5ZIlAiUCJQItBUBMrKSwQmFQE3lna3kw6dAPZ8YDlGRdsmRs9l0/TJntlOVh2iC6cMJQIlAiUCMwyBo8vZja8umz8FwslNXqdt/NTQXOT5Ko09hpPr1DHbJRVwl/zZC8E/Q73tWww0bid+1iEeWRh7yeUdJQIlAiUCJQIlAtMagZK4CUTgjDVVhlpX0Ki+UHbEqRidKt2UmhXDsa1BvkME7KK1b1RfPVXeMpYIlAiUCEwrBI4eZzdWddvTeeTp03B7qgT4CvA2KZTxYBBKYOSR5Qfx/AoS+zKefg4al5LOe7D4+ZQui/d3p1WHl8SUCJQIlAiUCJQINB8BN0Ivn+nV4mORb7unlUhvfaCt2MYHJM+Ma55KVzfT6RsLVOPLGzgsXDSPav2pJPmL1d5jlCbiY5njoyfucsLOGZCNtAXq/QydVNozgUuZSgRKBGYcAuNx9GZcIwuCF5KQtXTiySopkXhseTyf8w/h31B5/bht0PYalfpNrPJpObnnD6/mrtxRPrYsZMpYIlAiUCJQIlAi8DgERpzcTe109i2FTSeyZNFTqc17FvXFz6G987kMLHomC5efjm0+mRUbVvJ7O+YWDnE4hVK+jytyJp+ID2a27OgkaXsSefYqsHgzttmruiKDsHf6UQdRsQHG/XEqlVDGEoESgRKBJiJw9Di7AXLaV9GsaQdulTgcU/LiK4TD7+Uat5D4dyD5JHlDK7r2C/IVG8rV3DEhWmYuESgRKBEoETiaEAjHLn4JYdmmVXLunkn7wK/jLX9KXv17PP0g3viwNO0HSRsfwFznkv9Drf13mVP7FRYtfQqLB1YUv6QQK75RlpT5jIYv2rC1u4M5+SmyJV6DJS/SZPwSjGrz22UNnN3kyXrq1td8emYRBWVTSgRKBKYUgaPL2SWpSpF2gFUlxI3RBVfekfdy78bth7rtP0k4h6TvZ/TsuL94Nzc+KS7tTBlKBEoESgRKBEoESgT2QUCrueGgbty0iLbq06mnvwv5X5D7/8LyN+C8FPPngT1nb3o+bi/D7DeU70yovF1O19vIe99Apz8X33YCUdZfrm8rHoVWZmZaCEf3oW2dZPZktfH1GL8G/gQ1o1Wp2dFFSwbJTqrJg7RYH+fKemo2VWX9sxaBsmElApOJQDKZhU+7ss0Srci2SamOrt0ewt0GMdZL8F+l7dck/D/PYMdF9PfdyfLjdxG/n9Vl5bss066zS4JKBEoESgRKBKYFAvHxpdYNy0laXkSS/RHY/4fnL9M2PsS0XDp5nnRsu5IcPVeiY/gcS3F/os4/R7r7dcAfkyd/SWJ/ANX/Rn/bacVjzrFaHD8rGA6kMk3v6EbQuuWh+aTJU9W+3wR7vfz1k3GEgSwNpkOwIVHSjQ9tp3trDXUIZSgRKBGYKgTKeiYQgWQCy5reRfWsMVIzPKmAjabdmQR9L/hduH1X6dMk+bkM1m+hr7Obc1YP0WWlk0sZSgRKBEoESgRKBA6CQKzoLn7iUmqtL8Lz3wd7JWbh2C2Ufg3HNgWMx4Y4jpTqSjzS246zFLNTlH4V9zfq3j8H+zMG29/AHH8Op2x9AuFAxkeupuu7veGMv3VdK6dvW0Y+5/myKeInEH8LOEXtkYPPaGwTZZ/0mAvv3Vh+L7XOXSw8TSu9k15nWUGJQIlAicAhEBj/pekiWMffgrHc6Y1U2VslxBNMfzo4YCxWdOlTjtvJk2/i9jXS/qvIlj9cvJd7rmVgpfCnDCUCJQIlAiUCJQIHQSCczuqGeeR9z1CO38B5gRzV5XLsWqVfE50bbQyNrfzeojLmSf2u0v1PVzm/hmmlOEv+SgW9hbzzpQwtOI2lG48pPmr1tntai8ecw8lUhuZEN6L+oCUevW6ZcypDvBb8D9WW12j7RG3b1R61rzkUPr5W2TgJ28FuJ+3byTFklKFEoESgRGCGIjCNhOvEIvi40la0Go2WaG8qRRnbtgd42QAAEABJREFUx2V55IRRw+0esG+RNr7PYGNt8chy+V4uZSgRKBEoESgRKBEYFQILN7VSbztJecO5e562Wp0lVmq1O85oxepnCmi115cwstpr9vt4/jc6/5fklTfRmb+ocHwXbz6OXesX8NYH2jjTq1Pm/IaDG85+vFe8ffNihuaegldfIfvjD0j9j8FfonSM6B2r469bJjW66BrEfRNZ8oBq6qfLyqfYKEOJQInATEXg0E7fTG3Voeh2UjmydogsmsH07cpzFc7l9PEAJy4fYOYLe8pQIlAiUCJQIlAiMCUIhKNH2xIS/xU5eL8EtgLjyBxdHhNM5cmG2bvaC8dh9gyMV+P2h6r375T7/8nxfTMDra+gteOZxM8cLdy2jJ075/FWOb9n3N7yWAfYTfeMI+q+Eef2TK8WZUcdC3uOZaDyVOrVV5NU/khu+p+C/YboO13O5CLRGniMs04mK+Rgu5TugHwbrKxThhKBEoESgRmMgBTFDKZ+rKSndZOyqUrxHkq5DOGazbT8CipDDzC4fJCuclaTWRnKRpUIlAiUCJQITAoCq9a3kPsxOM8FWyXnrpXJCibNDhXwNtWzSHWeoPQs4L/JoXyLtlrxTd5O0vK/lee3GcxeSnvnc1m4/HQqm04inNLuDQuLnzWKx40jjTjC4bzun+Ja5BlJ8YGsuD/Ksc0nF4511EH9v8vZfhvkbxNdvw0umnyltm2iKxFd0zHWRVs32G2k2U7KR5gpQ4lAicDMRmC6CtvJQTVJpXxpA5NSlDjncSGTgtwlZ/gWKem76Kv3Ubyf+7h85YkSgdmJQNmqEoESgRKBI0UgVjkblTkk2ZOkU0+SczdHGncq7A0r6hleQZau9wWq+wmi4alKLyHPf4f4qFXu7yK390jXv4us8ueQ/w+y1lfTWn0hg4ueTX3O0wtH2LaeSr71KbDlyUWK/Ti3eNlpDC58WpEv8nfwAuqtr8Iab4KKnNvk78j8HZj9McMrzadDOLl0AKmSKU3H6GADSveR2d3Cq5dysp8ylAiUCMxsBJKZTf5oqXdj59wKpB1SPNWD32WZrnVjdhuNzq2sXl3TcRlLBEoEjmIEyqaXCJQIjBGBjXLo+jvmY4kcRZbo7kPoXV2drGgjK760ybGdhxEfxzpJ23A+nw/2UuC3If9Dcv9/Wsl8L0n+fjwJR/jvtX0HSfI3WOWvihT7nryDnHeR+D9A5QMk+YdkW3wA/G/lUP+Rtr+p9Ksk/jQdr9aK7iIdt6meVMmUpnG0uojbQp5dR+vQJnpWDum4jCUCJQIlAjMagWRGUz9a4ruk2uY14vGmZVI8sT1QuzWj6UNSiBs1O3snLbt301U+vkwZSgRKBEoEHotAeVQicGgE4qf+qkNzpW+foIzaSgdrp8kxHM1UlMjx9lbR0i765mu7VOdWa3sq2DPlmD5fTu6v4PYyhh+Dfo3yvbZIxmuGz8U1f7HO/ZLyP1fnnqF06t5ylmp/rlKbjqtKYW9E3To1raPjaFWXeyG5nt3JNson26Z1h5XElQiUCIwOgRDCo8s5k3Otkbqpd3SS58eqGZ06Mm33j7mU1m4J+/gow2bKjzLsj095XCJQIlAiUCJwQATKk48i4EbbkiqNZKF07XKldqUD6dxHb2nOnomusIFSVV/RflU2wLATbC47wefpeIEc2liZXaz9xXv341w4yXN0X4dSm661Dt9PRcdRnmk7w6JWdc23yga6VivcDxbfK5lhLSjJLREoESgROBACIegPdH52nVuI2jnYIWW0Sg3rVHq8InJy3LaT2K142sMxxCPNylrGEoESgRKBEoESgRKBUSHQJU27pN5Kki/W3nw5iOEAPl7njqqwpmQKWoeTkagNB07oynBiFoR4sq0f7B4qyTUMpd3lqi5lKBEoEZglCCSzpB2HbkY8UpVU2vFkBWZtOKHIHnuPUdPZLbp2v1aAy48yPBad8qhEoESgRKBEoETg8AjEk1R7WqpYPo/cWw5/w9GTY/q21Opgm2X/XE2jcR/3L4nHmSlDiUCJQInAbEDg6HB2V81P5cjOAV+sFI8b7d/uvV9h5i7SRjflI8yzgbfLNpQIlAiUCJQINAOBRqfhqWG2v65tBjVlnYdGYNj+gVvJ7UoayVYuswZTE8paSgRKBEoEJh2Bo0ARuTGYt5ET7w7NB4tHqnhssHhkeRvxFeZauoPyEebHwlMelQiUCJQIlAiUCIwGgdO0Pjh3T0ZiQ5pcDt06mrvKPM1BwFXtIMb9kF9Oy9A95aquEGlqLCsvESgRmGgEZr+zewaJ/Ns5uJ+gNFfJ9gNRwt5D2D9M7neSZHvoKr/CTBlKBEoESgRKBEoExopAl5zdodaa/u/GrYaZj7WIMv9UIRCPL7NR/XQ5qV1Ff62bclWXMkwzBEpySgSOEIHkCO+fAbevSalV4quQJ4vYeUqp0r4xB9uldAe5lV9hpgwlAiUCJQIlAiUC40VAzm1nX00rhT0YfeCN8ZZU3jepCDQ0+b8d8+vI+RG70vtZvVr9Nql1loWXCJQITAACZRFjQ2D2O7tzl7eSVo6BJJzdOVK++7e5rnPdEvq309Yov8I8Nv4pc5cIlAiUCJQIlAg8FoH1uzJSduvkJqX42FG5uisgplGMx8t3YXYTWfJ9yNZQW9RH+VQbZSgRKBGYkQgckuj9Hb9DZp5xF8/wlM6h+ZCfLtpX4rRo+2h0zWdiA3J01+HpPVQavZTCnjKUCJQIlAiUCJQIjB+B0zJqLbt0/1qwnUgJK5VxeiAQjq5W3LlT5Hwfr15DsmxH+VNDQqOMJQIlArMSgdnt7C4kYaC6CPPT5eguUg8OP8KsnSKazjq7Me4mqXTTt6pRnC//lQiUCJQIlAiUCJQIjA+BczWRPMd7wG4BNigNKZWx2Qi4+gXk6NodIuX7pPXLmbtnM2cX7+7qVBlLBEoESgRmHwKz29llUxXSJbg9QQ5vh5za/dpr8RGNLWRSyN53VD/CPPtYu2xRiUCJQIlAiUBzEDBnw4Z+rHGfdO9N4Ntw6s2hpay1QCAc3XiH2rhLffJ99clFNHiQ+avKiYgCoPJfiUCJwGxFYD/nbxY1s8vVtup8Uj9FrVoqRfv4R5idXpL8HhLupTZUPsIsoMr4CALlTolAiUCJQInAeBE497Q67fWNmnC+QkWsJRytcLh0UMYpRiBwN+Ld6fvI7ULV/gNSu49jVg5SvrpFGUoESgRmNwJyCGdhA8PR3bipTcr1WM1gPlszmIvVyv0eYbaGrm/HkptIa1voW13OOgukMpYIHByB8kqJQIlAicBoEdDq7vpdvdQrt0jXXorLucL6CcdrtEWU+SYCgUz49+J2p7Y/0PYH1Oxeli3tp3R0KUOJQInA7Edgljm7bsRHqR7a1kmFJ+D+Qs1iPhNsvoT8vm11OcCDOA/QsJug2sO5llGGEoESgRKBsSBQ5i0RKBE4OAKxulsb2IRlPyHxS6R375cuHqB0eA+O2cRdceGsSXzbDnYj5P8le+h8qvkd7FlSOrqUoUSgROBoQSCZNQ2N1dw3b+lgxYaVVP2ZNCq/JaX6u2rfSXJ6W7XdN+a49Uj5asbZ19NYWr6zsi865X6JQIlAicA4EShvKxF4FAFzBpcPsrv1HvLkO6TEI7R3SzdrpZH80Xzl3oQi4IGtDQrn9Sr3Usw+j7V9h4HsrmJFt5zcFyxlLBEoEThaEEhmRUNjNXf75sV02NMYavltsD9T+n3gaZgf6Ld1w7l9GOcGKv3dnE1DectYIlAiUCJQIlAiMNEIHN3lhWNVW9RHw9dC43zcvq10qxywHQx/tMqPboAmtPVeYGrsBr+TPLmALPkcuf+YHQ8/yInLB+iycpKBMpQIlAgcTQjMfGc3VnRXrZ/PYOWXwP4Y+AOll2GcKKHfqf3HvqsrbSslsE2rujdg+Z1Uav1gpbKlDCUCJQIlAiUCJQKTgEA4vMcv6aM3uRMLh5cvYXapanoQtz5t4zWiUg8LiHHGYScXeoXrQyrjSuH6Jdk5SnYtdy/p5tzTa5SOLmUoESgROPoQmPnO7po1FXorKzFeq+57CWan4L5IDm0Lxv7tC2Uazu1dkFyODW3gEyfVKEOJQIlAiUCJQIlAicDkIRCOVqwsDg3eTysX0uA/SDlXevpG6evNqji+Fnz0Or0CYBxxxMndg1k4uVfj+dfI0o9B+i28vpZjFu7hMiufXqMMJQIlAkcrAvs7gzMPhxWthlXnSFmuFvFLtG3DHufkMhysrtnODWA/J/M1bNujGWULB5gylAiUCJQIlAiUCJQITCIC4fCes3qI25dsJffrtMr7ZensT2H2bdV6k/aln7U6idVwysdtBcoBog9jI4xgj64/KNyugvyrJNlHsbYvk+dXc/fCjZy9coDAnJkZSqpLBEoESgQmAoGZ7+wGCm6plGW7dqtKpnSgqJlN34Hl15H4pWRsIr4UeaCc5bkSgRKBEoESgRKBEoFJQMCcWGmMx5q7d9yHN35Cw/8T+ASefkOO3C+0/wDYTmBQqaFz4fge3RPTXjj/WvmOD0/ZNuFyL25Xyp75KlnlLG2/yO6WK/F56/j8kl4CY+zoxoxZF8oGlQiUCIwDgdnh7CaNEOiRDgaBFETMFvtaLLmYut/N/UsGKBUBZSgRKBEoESgRKBGYcgRixTHeIz1m5Q7ad99FpfZj0qHPU0n/Fcs/j/MjpZuU1mkye4foi58squv4aHF8fW9bNVEvp7/46FTyMHg89n0h7p8RJv+C+ZeKldw7lj/EVxft4WyLnxs6lD2k28pYIjBbECjbUSJweARmh7Mb7fSDzmBmuPUqyxo5uhdQb7mGXd09FLOelKFEoESgRKBEoESgRKBZCITT+4mTh1h6bA/beh5gMP8FefUbVOrh9H4Qks/hXAR2g5ze+5W24dbHyKovxGT2bHHuoh1qj9WG22jbwR4kt1u1vQzLv6b9f5bD+zFa7DwGsmsJJ7dcyaUMJQIlAnsRKDePQ2B2OLuWZySu2czHKb2GFMYuXVuD+3fJGhczb/eG8vHlx/FBeaJEoESgRKBEoESgeQh0WV58MTgct56FGxgYWkNv9XI5u1+j4v8KjQ+JuM/K0btQ6Srt346zDuhWigntQR2P2AGa5GY6rwCPrNrKsUV2CkF3PLK9R23Yovbco3SNnNsfqq3nyIb5F9w+RL31C1h6OTu672DLki18eXk/xcT9QSf7KUOJQIlAicDRjsDscHazqhSHD0kZxKyodEMoOdMxW9XB15Cl35Sy+CGDto75q4agVAyUoUSgRKBEoESgRGDaISD9HD9VdM4Jg8VjueH4dm9dS2/Lz2kZ+gaef5SU9+NohTNWfe17YFfo+CbgLtwe1FYOsO3Ufp/25UQW9kA8Al3XcTiYw86wh61A2A37JmUZV9y3DFepeZEoJuGjPtWtFVtEC/RrhXqXrm9RCod9rWq8AexneHI+ln8Syz4InEWl8WU6hn5Kbc8t3DdvHfF15WJ9FyEAAANzSURBVHj8OzDCok5lK2OJQIlAiUCJwMEQmPnO7uYhp5pLiSQDamSN+IpjvNvi3C898GM5uedgjQvI8/uJnz2I2WMOFcprJQIlAiUCJQIlAiUCzUdAzlw4deHcxfuom4/dBMvvpG3oejqHfgLJ1/DGx8mS95Fm75Pj+FGML4rubyldrHQF2HXk3AKsxew+3RPvvW7W/jalXTrfq9SvFDZEpGHnuHBKwzEdTUL3EPdGOb247SY+sGW2DWcLhQNu92omXjT4DThXApeQJOdhfJZYtXV7N7m9VybMpxjs/DZpck2xgrt15XpN0u8knP9YxS1tGEFXxhKBEoESgdEjkIw+6zTNufA0lyPbEHW9Uho9uD+s/Wu0/w2wz0F+GSx7qPwEP+MP5Z0lAiUCJQIlAiUCTUVgr+MbH2D66KrBwgGMVV9bcTeN3TczVPk5aX6BJre/RNr4dyz/EEmjSxPe79LqaBeYVoL9U1po/RKenCtbQXntxzp/OR7Op1+t/WuUrtXxdeDXF8nCOS0+CnUTcDOPJL9JZcTHopTPrlVe3c9VYFfI/rhM6RKdu5Bhh1YOuH8S+BCN5N3k6T+S+gfJa5/GK19nzuDFUL+Gtp5bYeV99HV286mlfcVj3eHslw6uoCtjiUCJQInA+BBIxnfbNLsrtwEpp7vIuYyUc0EzpUntv6jbTWxfvp1QjpjrfBlLBCYEgbKQEoESgRKBEoFmISB9Hg5gOIKh32PVM971XbF8G9tXPExj5b34srVUe29hoO+6whGuDv2Iqp0v5/eLpLX/IMk/qvRPxGpqkr2brPIusuTvyJN34snbscpwSng7afZOXXsXZI+mLHlXcT7lHcU9cb9lf6/y5GDX3ydn9kNYflbh0FrjS9Q6zqdj6BKGGtfQvuMm4tHscGzDYZ+/amcxIR8f6or2RLuw0mZpFnuV9ZYIlAjMKgRmvrN7Ng2obpNe+LEU1+fIs6/Qkl1OfNUxfsevUBqzqs/KxpQITEcESppKBEoESgSaiICcw30d4HAaw3kccYTja8/xUaf4enF2zP3ky+8qHM5YTQ2nOBzQSG07biDS4K4biNTfdz2ZX0dSu5p+Hk1xHOfjeuRvlwMb5UR523bcVpQddYRDGw54rNbOl1MbH5UKuuLR7KAxbJSgW0ZME8Erqy4RKBEoEZi1CPz/AAAA//88GyLoAAAABklEQVQDAHIuSYyAMlPUAAAAAElFTkSuQmCC';

function generarReportePeriodo(periodo, opts){
  if(!S || !S.creds) return null;
  opts = opts || {};
  periodo = periodo || 'mensual';
  var hoy = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var isoLocal = function(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
  var dShift = function(b,days){ var d=new Date(b); d.setDate(d.getDate()+days); return d; };
  var parseISO = function(s){ return new Date(String(s).slice(0,10)+'T12:00:00'); };
  var hoyISO = isoLocal(hoy);
  var startISO, endISO=hoyISO, prevStartISO, prevEndISO, titulo, rangoLabel, lblPeriodo;

  if(periodo==='diario'){
    startISO=hoyISO; endISO=hoyISO; titulo='Reporte Diario'; lblPeriodo='Resumen del día';
    prevStartISO=isoLocal(dShift(hoy,-1)); prevEndISO=prevStartISO;
    rangoLabel=hoy.toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  } else if(periodo==='dia'){
    var f=opts.fecha||hoyISO; var fd=parseISO(f); startISO=f; endISO=f; titulo='Reporte Diario'; lblPeriodo='Día específico';
    prevStartISO=isoLocal(dShift(fd,-1)); prevEndISO=prevStartISO;
    rangoLabel=fd.toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  } else if(periodo==='semanal'){
    startISO=isoLocal(dShift(hoy,-6)); endISO=hoyISO; titulo='Reporte Semanal'; lblPeriodo='Últimos 7 días';
    prevStartISO=isoLocal(dShift(hoy,-13)); prevEndISO=isoLocal(dShift(hoy,-7));
    rangoLabel=parseISO(startISO).toLocaleDateString('es-VE',{day:'numeric',month:'short'})+' al '+hoy.toLocaleDateString('es-VE',{day:'numeric',month:'short',year:'numeric'});
  } else if(periodo==='quincenal'){
    startISO=isoLocal(dShift(hoy,-14)); endISO=hoyISO; titulo='Reporte Quincenal'; lblPeriodo='Últimos 15 días';
    prevStartISO=isoLocal(dShift(hoy,-29)); prevEndISO=isoLocal(dShift(hoy,-15));
    rangoLabel=parseISO(startISO).toLocaleDateString('es-VE',{day:'numeric',month:'short'})+' al '+hoy.toLocaleDateString('es-VE',{day:'numeric',month:'short',year:'numeric'});
  } else if(periodo==='anual'){
    startISO=hoy.getFullYear()+'-01-01'; endISO=hoyISO; titulo='Reporte Anual'; lblPeriodo='Año en curso';
    prevStartISO=(hoy.getFullYear()-1)+'-01-01'; prevEndISO=(hoy.getFullYear()-1)+'-'+pad(hoy.getMonth()+1)+'-'+pad(hoy.getDate());
    rangoLabel='Año '+hoy.getFullYear();
  } else if(periodo==='mes'){
    var mk=opts.mes||hoyISO.slice(0,7); var y=parseInt(mk.slice(0,4),10), m=parseInt(mk.slice(5,7),10)-1;
    startISO=mk+'-01'; endISO=isoLocal(new Date(y,m+1,0)); titulo='Reporte Mensual'; lblPeriodo='Mes específico';
    prevStartISO=isoLocal(new Date(y,m-1,1)); prevEndISO=isoLocal(new Date(y,m,0));
    rangoLabel=new Date(y,m,1).toLocaleDateString('es-VE',{month:'long',year:'numeric'});
  } else if(periodo==='rango'){
    startISO=opts.desde||hoyISO; endISO=opts.hasta||hoyISO;
    if(startISO>endISO){ var tmp=startISO; startISO=endISO; endISO=tmp; }
    titulo='Reporte Personalizado'; lblPeriodo='Rango de fechas';
    var dias=Math.round((parseISO(endISO)-parseISO(startISO))/86400000)+1;
    prevEndISO=isoLocal(dShift(parseISO(startISO),-1)); prevStartISO=isoLocal(dShift(parseISO(startISO),-dias));
    rangoLabel=parseISO(startISO).toLocaleDateString('es-VE',{day:'numeric',month:'short',year:'numeric'})+' al '+parseISO(endISO).toLocaleDateString('es-VE',{day:'numeric',month:'short',year:'numeric'});
  } else {
    periodo='mensual'; startISO=hoyISO.slice(0,8)+'01'; endISO=hoyISO; titulo='Reporte Mensual'; lblPeriodo='Mes en curso';
    var pmm=new Date(hoy.getFullYear(),hoy.getMonth()-1,1);
    prevStartISO=isoLocal(pmm); prevEndISO=isoLocal(new Date(hoy.getFullYear(),hoy.getMonth(),0));
    rangoLabel=hoy.toLocaleDateString('es-VE',{month:'long',year:'numeric'});
  }
  var inW=function(f,a,b){ if(!f) return false; var s=String(f).slice(0,10); return s>=a && s<=b; };
  var num=function(v){ return parseFloat(v)||0; };

  var pagosConf=(S.pagos||[]).filter(function(p){return !p.eliminado&&p.estado==='confirmado';});
  var pagosWin=pagosConf.filter(function(p){return inW(p.fecha,startISO,endISO);});
  var pagosPrev=pagosConf.filter(function(p){return inW(p.fecha,prevStartISO,prevEndISO);});
  var cobrado=pagosWin.reduce(function(a,p){return a+num(p.monto);},0);
  var cobradoPrev=pagosPrev.reduce(function(a,p){return a+num(p.monto);},0);
  var pctCrec=cobradoPrev>0?Math.round((cobrado-cobradoPrev)/cobradoPrev*100):(cobrado>0?100:0);

  var esIni=function(p){return p.esInicial||p.tipoOperacion==='inicial_credito'||(p.concepto&&String(p.concepto).indexOf('Inicial · ')===0);};
  var iniciales=pagosWin.filter(esIni), cuotas=pagosWin.filter(function(p){return !esIni(p);});
  var totalIniciales=iniciales.reduce(function(a,p){return a+num(p.monto);},0);
  var totalCuotas=cuotas.reduce(function(a,p){return a+num(p.monto);},0);

  var egresosWin=(S.egresos||[]).filter(function(e){return !e.eliminado&&inW(e.fecha,startISO,endISO);});
  var totalEgresos=egresosWin.reduce(function(a,e){return a+num(e.monto);},0);
  var egPorCat={};
  egresosWin.forEach(function(e){var cat=e.categoria||e.concepto||'Sin categoría'; if(!egPorCat[cat])egPorCat[cat]={cat:cat,total:0,count:0}; egPorCat[cat].total+=num(e.monto); egPorCat[cat].count++;});
  var egresosListados=Object.keys(egPorCat).map(function(k){return egPorCat[k];}).sort(function(a,b){return b.total-a.total;});

  var utilidad=cobrado-totalEgresos;
  var margen=cobrado>0?Math.round(utilidad/cobrado*100):0;

  var credsActivos=(S.creds||[]).filter(function(c){return !c.eliminado&&c.estado==='activo';});
  var cartera=credsActivos.reduce(function(a,c){var tot=num(c.cuotaQ||c.cuota)*(c.totalCuotas||(c.plazo||0)*2); var pag=num(c.cuotaQ||c.cuota)*(parseInt(c.pagado,10)||0); return a+Math.max(0,tot-pag);},0);
  var enMora=(S.creds||[]).filter(function(c){return !c.eliminado&&c.estado==='activo'&&(parseInt(c.mora,10)||0)>0;}).sort(function(a,b){return (parseInt(b.mora,10)||0)-(parseInt(a.mora,10)||0);});
  var moraGraves=enMora.filter(function(c){return (parseInt(c.mora,10)||0)>30;});
  var tasaMora=credsActivos.length>0?Math.round(enMora.length/credsActivos.length*100):0;

  var creditosNuevosArr=(S.creds||[]).filter(function(c){if(c.eliminado)return false; return inW(c.fecha||c.creadoEn,startISO,endISO);});
  var montoCreditosNuevos=creditosNuevosArr.reduce(function(a,c){return a+num(c.precio);},0);

  var cobMap={}, cliMap={};
  pagosWin.forEach(function(p){
    var cob=p.cobrador||p.realizadoPor||'Sin asignar'; if(!cobMap[cob])cobMap[cob]={nombre:cob,total:0,count:0}; cobMap[cob].total+=num(p.monto); cobMap[cob].count++;
    var cli=p.cli||'Sin nombre'; if(!cliMap[cli])cliMap[cli]={nombre:cli,total:0,count:0}; cliMap[cli].total+=num(p.monto); cliMap[cli].count++;
  });
  var topCobradores=Object.keys(cobMap).map(function(k){return cobMap[k];}).sort(function(a,b){return b.total-a.total;});
  var topClientes=Object.keys(cliMap).map(function(k){return cliMap[k];}).sort(function(a,b){return b.total-a.total;}).slice(0,10);

  var sedeMap={};
  pagosWin.forEach(function(p){var cred=(S.creds||[]).find(function(c){return c.id===p.cred;}); var sede='Sin sede'; if(cred&&cred.concesionarioId){var conc=(S.concesionarios||[]).find(function(c){return c.id===cred.concesionarioId;}); sede=conc?conc.nombre:'Sin sede';} if(!sedeMap[sede])sedeMap[sede]={sede:sede,total:0,count:0}; sedeMap[sede].total+=num(p.monto); sedeMap[sede].count++;});
  var pagosPorSede=Object.keys(sedeMap).map(function(k){return sedeMap[k];}).sort(function(a,b){return b.total-a.total;});

  var clientesNuevos=(S.clientes||[]).filter(function(cl){return !cl.eliminado&&inW(cl.creado,startISO,endISO);}).length;
  var fmtUsd=function(n){return '$'+(Math.round(n)||0).toLocaleString('en-US');};
  var fmtFecha=function(s){if(!s)return '—'; try{return new Date(String(s).slice(0,10)+'T12:00:00').toLocaleDateString('es-VE',{day:'2-digit',month:'short'});}catch(e){return s;}};

  return {periodo:periodo,titulo:titulo,rangoLabel:rangoLabel,lblPeriodo:lblPeriodo,startISO:startISO,endISO:endISO,
    cobrado:cobrado,cobradoPrev:cobradoPrev,pctCrec:pctCrec,totalCuotas:totalCuotas,totalIniciales:totalIniciales,cuotas:cuotas,iniciales:iniciales,
    pagosWin:pagosWin,pagosCount:pagosWin.length,egresosWin:egresosWin,totalEgresos:totalEgresos,egresosListados:egresosListados,
    utilidad:utilidad,margen:margen,cartera:cartera,creditosActivos:credsActivos.length,
    enMora:enMora,moraGraves:moraGraves,tasaMora:tasaMora,creditosNuevosArr:creditosNuevosArr,creditosNuevos:creditosNuevosArr.length,montoCreditosNuevos:montoCreditosNuevos,
    topCobradores:topCobradores,topClientes:topClientes,pagosPorSede:pagosPorSede,clientesNuevos:clientesNuevos,
    fmtUsd:fmtUsd,fmtFecha:fmtFecha};
}

function reportePeriodoHtml(periodo, opts){
  var r = generarReportePeriodo(periodo, opts);
  if(!r) return '<p style="padding:40px;text-align:center;color:#6b7280">No hay datos para generar el reporte.</p>';
  var emp = (typeof getEmpresa==='function') ? getEmpresa() : {nombre:'Pagasi'};
  var nombreEmp = (emp.nombre||'PAGASI');
  var hoy = new Date();
  var genStr = hoy.toLocaleDateString('es-VE',{day:'numeric',month:'long',year:'numeric'})+' · '+hoy.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit'});
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var empty=function(c,m){return '<tr><td colspan="'+c+'" class="mut" style="padding:15px;text-align:center;font-style:italic">'+m+'</td></tr>';};
  var sec=function(t,sub,c,keep){return '<div class="rp-sec'+(keep?' keep':'')+'"><div class="rp-sec-h"><h2>'+t+'</h2>'+(sub?'<span class="rp-sub">'+sub+'</span>':'')+'</div>'+c+'</div>';};
  var kpi=function(l,v,s,cls){return '<div class="rp-kpi '+cls+'"><div class="rp-kpi-l">'+l+'</div><div class="rp-kpi-v">'+v+'</div>'+(s?'<div class="rp-kpi-s">'+s+'</div>':'')+'</div>';};
  var delta=(r.pctCrec>=0?'▲ +':'▼ ')+Math.abs(r.pctCrec)+'% vs previo';

  var byFechaAsc=function(a,b){var x=String(a.fecha||a.creadoEn||'').slice(0,10),y=String(b.fecha||b.creadoEn||'').slice(0,10); return x<y?-1:x>y?1:0;};
  var trIng=r.pagosWin.length?r.pagosWin.slice().sort(byFechaAsc).map(function(p){var tp=(p.esInicial||p.tipoOperacion==='inicial_credito')?'Inicial':'Cuota';return '<tr><td class="mut">'+r.fmtFecha(p.fecha)+'</td><td class="b" style="color:#111">'+esc(p.cli||'—')+'</td><td class="mut mono">'+esc(p.cred||'—')+'</td><td><span class="pill '+(tp==='Inicial'?'pill-b':'pill-g')+'">'+tp+'</span></td><td class="r num g">+'+r.fmtUsd(p.monto)+'</td></tr>';}).join(''):empty(5,'Sin pagos en este período');
  var trEg=r.egresosWin.length?r.egresosWin.slice().sort(byFechaAsc).map(function(e){return '<tr><td class="mut">'+r.fmtFecha(e.fecha)+'</td><td class="b" style="color:#111">'+esc(e.concepto||e.descripcion||'—')+'</td><td class="mut">'+esc(e.categoria||'Sin categoría')+'</td><td class="r num rd">-'+r.fmtUsd(e.monto)+'</td></tr>';}).join(''):empty(4,'Sin egresos en este período');
  var trEgCat=r.egresosListados.length?r.egresosListados.map(function(e){return '<tr><td class="b" style="color:#111">'+esc(e.cat)+'</td><td class="r mut">'+e.count+'</td><td class="r num rd">'+r.fmtUsd(e.total)+'</td></tr>';}).join(''):empty(3,'Sin egresos');
  var trCred=r.creditosNuevosArr.length?r.creditosNuevosArr.slice().sort(byFechaAsc).map(function(c){return '<tr><td class="mut mono">'+esc(c.id||'—')+'</td><td class="b" style="color:#111">'+esc(c.cli||'—')+'</td><td>'+esc(c.modelo||'—')+'</td><td class="r num">'+r.fmtUsd(c.precio)+'</td><td class="r num" style="color:#2563EB">'+r.fmtUsd(c.cuotaQ||c.cuota||0)+'</td><td class="c mut">'+r.fmtFecha(c.fecha)+'</td></tr>';}).join(''):empty(6,'Sin créditos nuevos en este período');
  var trMora=r.enMora.length?r.enMora.map(function(c){var mc=(c.mora||0)>30?'#dc2626':(c.mora||0)>15?'#ea580c':'#ca8a04';return '<tr><td class="mut mono">'+esc(c.id||'—')+'</td><td class="b" style="color:#111">'+esc(c.cli||'—')+'</td><td>'+esc(c.modelo||'—')+'</td><td class="c num" style="color:'+mc+'">'+c.mora+'d</td><td class="r num">'+r.fmtUsd(c.cuotaQ||c.cuota||0)+'</td></tr>';}).join(''):empty(5,'Sin clientes en mora');
  var trCob=r.topCobradores.length?r.topCobradores.map(function(c,i){return '<tr><td class="mut">'+(i+1)+'</td><td class="b" style="color:#111">'+esc(c.nombre)+'</td><td class="r num g">'+r.fmtUsd(c.total)+'</td><td class="r mut">'+c.count+'</td></tr>';}).join(''):empty(4,'Sin cobros registrados');
  var trCli=r.topClientes.length?r.topClientes.map(function(c,i){return '<tr><td class="mut">'+(i+1)+'</td><td class="b" style="color:#111">'+esc(c.nombre)+'</td><td class="r num g">'+r.fmtUsd(c.total)+'</td><td class="r mut">'+c.count+'</td></tr>';}).join(''):empty(4,'Sin clientes que pagaron');
  var trSede=r.pagosPorSede.map(function(s){return '<tr><td class="b" style="color:#111">'+esc(s.sede)+'</td><td class="r mut">'+s.count+'</td><td class="r num g">'+r.fmtUsd(s.total)+'</td></tr>';}).join('');

  var tbl=function(head,body){return '<table class="rp-t"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table>';};

  return ''
  +'<div class="rp">'
  +'<div class="rp-bar"></div>'
  +'<div class="rp-head">'
    +'<div class="rp-conf">● Confidencial</div>'
    +'<div class="rp-lh"><img class="rp-logo" src="'+_PAGASI_LOGO_BLUE+'" alt="Pagasi"><div class="rp-lh-co"><div class="rp-lh-n">'+esc(nombreEmp)+'</div><div class="rp-lh-s">'+(emp.rif?'RIF '+esc(emp.rif)+' · ':'')+'Reporte financiero interno</div></div></div>'
    +'<div class="rp-title-row"><div><div class="rp-kicker">'+r.lblPeriodo+'</div><h1 class="rp-title">'+r.titulo+'</h1><div class="rp-range">'+esc(r.rangoLabel)+'</div></div>'
      +'<div class="rp-util"><div class="rp-util-l">Utilidad neta</div><div class="rp-util-v" style="color:'+(r.utilidad>=0?'#16a34a':'#dc2626')+'">'+r.fmtUsd(r.utilidad)+'</div><div class="rp-util-s">Margen '+r.margen+'%</div></div></div>'
  +'</div>'
  +'<div class="rp-body">'
    +sec('Resumen financiero','Generado '+genStr,
       '<div class="rp-kpis">'
        +kpi('Ingresos',r.fmtUsd(r.cobrado),r.pagosCount+' pagos · '+delta,'k-g')
        +kpi('Egresos',r.fmtUsd(r.totalEgresos),r.egresosWin.length+' transacciones','k-r')
        +kpi('Utilidad neta',r.fmtUsd(r.utilidad),'Margen '+r.margen+'%',(r.utilidad>=0?'k-g':'k-r'))
        +kpi('Cartera activa',r.fmtUsd(r.cartera),r.creditosActivos+' créditos','k-b')
       +'</div><div class="rp-kpis" style="margin-top:11px">'
        +kpi('Cuotas cobradas',r.fmtUsd(r.totalCuotas),r.cuotas.length+' pagos','k-t')
        +kpi('Iniciales',r.fmtUsd(r.totalIniciales),r.iniciales.length+' pagos','k-b')
        +kpi('Créditos nuevos',String(r.creditosNuevos),r.fmtUsd(r.montoCreditosNuevos)+' financiados · '+r.clientesNuevos+' clientes','k-v')
        +kpi('En mora',String(r.enMora.length),r.moraGraves.length+' graves · '+r.tasaMora+'% tasa',(r.enMora.length>0?'k-r':'k-n'))
       +'</div>', true)
    +sec('Ingresos del período','Pagos confirmados · '+r.pagosWin.length+' pagos',
       tbl('<th>Fecha</th><th>Cliente</th><th>Crédito</th><th>Tipo</th><th class="r">Monto</th>', trIng+(r.pagosWin.length?'<tr class="tot"><td colspan="4">TOTAL INGRESOS</td><td class="r num g">'+r.fmtUsd(r.cobrado)+'</td></tr>':'')))
    +sec('Egresos del período','Gastos · '+r.egresosWin.length+' transacciones',
       tbl('<th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="r">Monto</th>', trEg+(r.egresosWin.length?'<tr class="tot"><td colspan="3">TOTAL EGRESOS</td><td class="r num rd">-'+r.fmtUsd(r.totalEgresos)+'</td></tr>':''))
       +(r.egresosListados.length?'<div class="rp-subcard"><div class="rp-subcard-t">Egresos por categoría</div>'+tbl('<th>Categoría</th><th class="r">#</th><th class="r">Total</th>', trEgCat)+'</div>':''))
    +sec('Créditos nuevos otorgados',String(r.creditosNuevos)+' en el período · '+r.fmtUsd(r.montoCreditosNuevos),
       tbl('<th>Crédito</th><th>Cliente</th><th>Modelo</th><th class="r">Precio</th><th class="r">Cuota Q.</th><th class="c">Inicio</th>', trCred))
    +sec('Cartera en mora',r.enMora.length+' clientes · '+r.moraGraves.length+' graves (+30d) · tasa '+r.tasaMora+'%',
       tbl('<th>Crédito</th><th>Cliente</th><th>Modelo</th><th class="c">Mora</th><th class="r">Cuota</th>', trMora))
    +sec('Top cobradores','Ranking del equipo en el período',
       tbl('<th style="width:36px">#</th><th>Cobrador</th><th class="r">Cobrado</th><th class="r"># Pagos</th>', trCob))
    +sec('Top clientes','Quiénes aportaron más en el período',
       tbl('<th style="width:36px">#</th><th>Cliente</th><th class="r">Aportado</th><th class="r"># Pagos</th>', trCli))
    +(r.pagosPorSede.length>1?sec('Cobranza por sede','Distribución por concesionario',tbl('<th>Sede</th><th class="r"># Pagos</th><th class="r">Total</th>', trSede)):'')
    +'<div class="rp-note"><div class="rp-note-t">Documento confidencial</div><div class="rp-note-b">Este reporte contiene información financiera reservada de '+esc(nombreEmp)+'. Prohibida su divulgación, copia o distribución total o parcial sin autorización. Generado en tiempo real desde el sistema Pagasi; refleja el concesionario activo en el filtro de sede.</div></div>'
  +'</div>'
  +'<div class="rp-foot"><span>'+esc(nombreEmp)+' · '+r.titulo+'</span><span>Confidencial · '+genStr+'</span></div>'
  +'</div>';
}

function reportePeriodoAbrir(periodo, opts){
  var win=window.open('','_blank');
  if(!win){ if(typeof toast==='function') toast('Habilita popups para ver el reporte','error'); return; }
  var titulos={diario:'Reporte Diario',dia:'Reporte Diario',semanal:'Reporte Semanal',quincenal:'Reporte Quincenal',mensual:'Reporte Mensual',mes:'Reporte Mensual',anual:'Reporte Anual',rango:'Reporte Personalizado'};
  var wmSvg="<svg xmlns='http://www.w3.org/2000/svg' width='430' height='320'><text x='215' y='175' transform='rotate(-26 215 160)' font-family='Arial,sans-serif' font-size='30' font-weight='800' fill='rgba(37,99,235,0.07)' text-anchor='middle'>CONFIDENCIAL</text></svg>";
  var wmUrl="data:image/svg+xml;utf8,"+encodeURIComponent(wmSvg);
  var body=reportePeriodoHtml(periodo, opts);
  var css='*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'@page{size:A4;margin:13mm 11mm}'
    +"body{background:#eef1f7;font-family:'Nunito Sans',system-ui,-apple-system,sans-serif;color:#1f2937;-webkit-font-smoothing:antialiased;padding:22px 0}"
    +".rp{max-width:820px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.08);background-image:url('"+wmUrl+"');background-repeat:repeat}"
    +".rp-bar{height:7px;background:linear-gradient(90deg,#1D4ED8 0%,#2563EB 55%,#60A5FA 100%)}"
    +".rp-head{padding:22px 34px 18px;border-bottom:2px solid #1D4ED8;position:relative;background:rgba(255,255,255,.92)}"
    +".rp-conf{position:absolute;top:18px;right:34px;background:#fde8ec;color:#b91c1c;border:1px solid #f5c2cb;font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;padding:4px 11px;border-radius:5px}"
    +".rp-lh{display:flex;align-items:center;gap:15px}.rp-logo{height:40px;width:auto;display:block}"
    +".rp-lh-co{border-left:1px solid #d6dbe3;padding-left:15px}.rp-lh-n{font-family:'Nunito',sans-serif;font-size:15px;font-weight:900;color:#1D4ED8}.rp-lh-s{font-size:8.5px;color:#8a93a3;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-top:3px}"
    +".rp-title-row{margin-top:15px;display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:12px}"
    +".rp-kicker{font-size:9.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#9ca3af}"
    +".rp-title{font-family:'Nunito',sans-serif;font-size:26px;font-weight:900;color:#0f172a;letter-spacing:-.5px;margin:3px 0 0}"
    +".rp-range{font-size:12px;color:#6b7280;margin-top:4px;text-transform:capitalize}"
    +".rp-util{text-align:right}.rp-util-l{font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.1em}.rp-util-v{font-family:'Nunito',sans-serif;font-size:25px;font-weight:900;letter-spacing:-.5px}.rp-util-s{font-size:10px;color:#9ca3af;margin-top:1px}"
    +".rp-body{padding:24px 34px 28px}"
    +".rp-sec{margin-bottom:22px}.rp-sec.keep{break-inside:avoid}"
    +".rp-sec-h{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1D4ED8;padding-bottom:6px;margin-bottom:12px;break-after:avoid}"
    +".rp-sec-h h2{font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;color:#1D4ED8}.rp-sub{font-size:10.5px;color:#9ca3af;font-weight:700}"
    +".rp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}"
    +".rp-kpi{border-radius:11px;padding:13px 14px;border:1px solid #e5e7eb}.rp-kpi-l{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.rp-kpi-v{font-family:'Nunito',sans-serif;font-weight:900;font-size:22px;letter-spacing:-.5px;line-height:1;margin-top:5px}.rp-kpi-s{font-size:10px;font-weight:700;margin-top:4px;opacity:.85}"
    +".k-g{background:#f0fdf4;border-color:#bbf7d0}.k-g .rp-kpi-l,.k-g .rp-kpi-v,.k-g .rp-kpi-s{color:#16a34a}"
    +".k-r{background:#fef2f2;border-color:#fecaca}.k-r .rp-kpi-l,.k-r .rp-kpi-v,.k-r .rp-kpi-s{color:#dc2626}"
    +".k-b{background:#eff6ff;border-color:#bfdbfe}.k-b .rp-kpi-l,.k-b .rp-kpi-v,.k-b .rp-kpi-s{color:#2563EB}"
    +".k-t{background:#f0fdfa;border-color:#99f6e4}.k-t .rp-kpi-l,.k-t .rp-kpi-v,.k-t .rp-kpi-s{color:#0f766e}"
    +".k-v{background:#f5f3ff;border-color:#ddd6fe}.k-v .rp-kpi-l,.k-v .rp-kpi-v,.k-v .rp-kpi-s{color:#7c3aed}"
    +".k-n{background:#f9fafb;border-color:#e5e7eb}.k-n .rp-kpi-l,.k-n .rp-kpi-v,.k-n .rp-kpi-s{color:#6b7280}"
    +"table.rp-t{width:100%;border-collapse:collapse}table.rp-t thead{display:table-header-group}"
    +"table.rp-t th{padding:9px 11px;border-bottom:2px solid #e5e7eb;text-align:left;font-size:9.5px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;font-weight:800;background:#f8fafc}"
    +"table.rp-t td{padding:7px 11px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#374151}table.rp-t tr{break-inside:avoid}"
    +"table.rp-t tr.tot td{border-top:2px solid #e5e7eb;border-bottom:none;font-weight:900;color:#111;font-size:13px;padding-top:10px}"
    +".rp-t .r{text-align:right}.rp-t .c{text-align:center}.rp-t .b{font-weight:700}.rp-t .mut{color:#9ca3af}.rp-t .g{color:#16a34a}.rp-t .rd{color:#dc2626}.rp-t .num{font-family:'Nunito',sans-serif;font-weight:800}.rp-t .mono{font-family:'Nunito Sans',monospace;font-size:11px}"
    +".pill{padding:2px 8px;border-radius:50px;font-size:10px;font-weight:800}.pill-g{background:#dcfce7;color:#16a34a}.pill-b{background:#dbeafe;color:#2563EB}"
    +".rp-subcard{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:13px;margin-top:12px;break-inside:avoid}.rp-subcard-t{font-size:10px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}"
    +".rp-note{background:#f8fafc;border:1px solid #e5e7eb;border-left:3px solid #b91c1c;border-radius:10px;padding:14px 16px;margin-top:18px;break-inside:avoid}.rp-note-t{font-size:10px;font-weight:900;color:#b91c1c;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}.rp-note-b{font-size:11px;color:#6b7280;line-height:1.6}"
    +".rp-foot{padding:15px 34px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#9ca3af;font-weight:700;flex-wrap:wrap;gap:6px}"
    +"@media print{body{background:#fff;padding:0}.rp{box-shadow:none;border-radius:0;max-width:none}.rp-actions{display:none!important}}";
  var html='<!DOCTYPE html><html lang="es-VE"><head><meta charset="UTF-8"><title>'+(titulos[periodo]||'Reporte')+' · Pagasi</title>'
    +'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    +'<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">'
    +'<style>'+css+'</style></head><body>'
    +body
    +'<div class="rp-actions" style="max-width:820px;margin:16px auto 0;text-align:center;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;font-family:Nunito Sans,sans-serif">'
      +'<button onclick="window.print()" style="background:#2563EB;color:#fff;border:none;padding:12px 26px;border-radius:10px;font-weight:800;cursor:pointer;font-size:13px">Imprimir / Guardar PDF</button>'
      +'<button onclick="window.close()" style="background:#fff;color:#374151;border:1px solid #d1d5db;padding:12px 24px;border-radius:10px;font-weight:700;cursor:pointer;font-size:13px">Cerrar</button>'
    +'</div></body></html>';
  win.document.write(html); win.document.close();
}
window.reportePeriodoAbrir = reportePeriodoAbrir;

// Auto-iniciar watcher si ya tenía permiso de antes
(function _pushNotifAutoInit(){
  try {
    if(pushNotifState() === 'granted'){
      // Esperar a que S esté cargado
      var checkS = setInterval(function(){
        if(S && S.creds && S.clientes){
          clearInterval(checkS);
          pushNotifIniciarWatcher();
        }
      }, 1500);
    }
  } catch(e){}
})();

// ─── COTILLÓN / CONFETTI (canvas + card centrada cerrable) ───
function dispararCotillon(nombre, esTeammate, genero){
  cerrarCotillon();
  // Inject animation styles
  if(!document.getElementById('cotillon-styles')){
    var s = document.createElement('style');
    s.id = 'cotillon-styles';
    s.textContent = '@keyframes cotIn{0%{transform:translate(-50%,-50%) scale(.7);opacity:0}55%{transform:translate(-50%,-50%) scale(1.05);opacity:1}100%{transform:translate(-50%,-50%) scale(1)}}@keyframes cotBackdrop{0%{opacity:0}100%{opacity:1}}@keyframes cotCake{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-6px) rotate(2deg)}}@keyframes cotShine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}';
    document.head.appendChild(s);
  }
  // Tomar el logo Pagasi del sidebar (mismo base64 que ya está cargado)
  var _logoEl = document.querySelector('.sb-logo img');
  var _logoSrc = (_logoEl && _logoEl.src) ? _logoEl.src : '';
  // Paleta de colores según género
  var g = String(genero||'').toLowerCase();
  var isMale = (g === 'm' || g === 'masculino' || g === 'hombre');
  var isFemale = (g === 'f' || g === 'femenino' || g === 'mujer');
  // Default = rosado (neutral), si es hombre → azul
  var palette = isMale ? {
    bgCard:   'linear-gradient(145deg,#F0F9FF 0%,#DBEAFE 50%,#E0E7FF 100%)',
    shadow:   '0 30px 80px rgba(59,130,246,.32),0 0 0 1px rgba(255,255,255,.6)',
    tag:      '#1E40AF', titulo:'#1E3A8A', subtitulo:'#1D4ED8',
    closeCol: '#1E3A8A',
    btn:      'linear-gradient(135deg,#3B82F6,#1D4ED8)',
    btnShadow:'0 8px 22px rgba(59,130,246,.42)',
    // Filtro para tintar el logo Pagasi de azul (original es violeta)
    logoFilter:'brightness(0) saturate(100%) invert(20%) sepia(96%) saturate(2300%) hue-rotate(217deg) brightness(95%) contrast(98%) drop-shadow(0 6px 14px rgba(0,0,0,.18))'
  } : {
    bgCard:   'linear-gradient(145deg,#FFF7ED 0%,#FCE7F3 50%,#F3E8FF 100%)',
    shadow:   '0 30px 80px rgba(236,72,153,.32),0 0 0 1px rgba(255,255,255,.6)',
    tag:      '#BE185D', titulo:'#831843', subtitulo:'#9D174D',
    closeCol: '#831843',
    btn:      'linear-gradient(135deg,#EC4899,#BE185D)',
    btnShadow:'0 8px 22px rgba(236,72,153,.42)',
    // Filtro para tintar el logo de rosa fuerte
    logoFilter:'brightness(0) saturate(100%) invert(24%) sepia(92%) saturate(3500%) hue-rotate(316deg) brightness(94%) contrast(96%) drop-shadow(0 6px 14px rgba(0,0,0,.15))'
  };

  // Backdrop oscuro
  var backdrop = document.createElement('div');
  backdrop.id = 'cotillon-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99998;animation:cotBackdrop .4s ease forwards';
  backdrop.onclick = cerrarCotillon;
  document.body.appendChild(backdrop);

  // Canvas confetti
  var canvas = document.createElement('canvas');
  canvas.id = 'cotillon-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var colors = ['#EC4899','#F97316','#FACC15','#22C55E','#3B82F6','#A855F7','#EF4444','#06B6D4','#FB923C','#84CC16'];
  var partis = [];
  function rafaga(originX, originY, vx0, vy0, cantidad){
    for(var i=0;i<cantidad;i++){
      partis.push({
        x: originX, y: originY,
        vx: vx0 + (Math.random()-.5)*4,
        vy: vy0 + (Math.random()-.5)*3 - 2,
        size: 6 + Math.random()*8,
        color: colors[Math.floor(Math.random()*colors.length)],
        rot: Math.random()*Math.PI*2,
        vrot: (Math.random()-.5)*.3,
        shape: ['sq','cr','st'][Math.floor(Math.random()*3)],
        life: 1
      });
    }
  }
  rafaga(canvas.width*.15, canvas.height*.75, 5, -10, 100);
  rafaga(canvas.width*.85, canvas.height*.75, -5, -10, 100);
  setTimeout(function(){ rafaga(canvas.width*.5, canvas.height*.9, 0, -12, 120); }, 300);
  setTimeout(function(){ rafaga(canvas.width*.3, canvas.height*.65, 2, -8, 70); }, 700);
  setTimeout(function(){ rafaga(canvas.width*.7, canvas.height*.65, -2, -8, 70); }, 800);

  // Card centrada con mensaje
  var who = nombre || (typeof S !== 'undefined' && S.currentUser && S.currentUser.nombre) || '';
  // Capitalizar primer nombre por si lo guardaron en minúsculas
  function _cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1).toLowerCase() : s; }
  var primerNombre = who ? _cap(who.split(' ')[0]) : '';
  who = who.split(/\s+/).map(_cap).join(' ');
  // Si es cumpleaños de un COMPAÑERO (no del usuario logueado), cambia el copy
  var _tagline, _titulo, _subtitulo, _btnTxt;
  if(esTeammate){
    _tagline = 'Cumpleaños del equipo';
    _titulo = '¡Hoy cumple años '+(who||'tu compañero/a')+'!';
    _subtitulo = 'No olvides felicitar a '+(primerNombre||'tu compañero/a')+'. Un mensaje rápido por WhatsApp hace el día.';
    _btnTxt = '¡A celebrar!';
  } else {
    _tagline = 'Cumpleaños';
    _titulo = '¡Feliz cumpleaños'+(primerNombre?', '+primerNombre:'')+'!';
    _subtitulo = 'Que este nuevo año te traiga muchos cobros puntuales, clientes satisfechos y motos vendidas. Todo el equipo Pagasi te desea lo mejor.';
    _btnTxt = '¡Gracias, a trabajar!';
  }
  var card = document.createElement('div');
  card.id = 'cotillon-card';
  card.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100000;background:'+palette.bgCard+';border-radius:32px;padding:0;width:90%;max-width:520px;box-shadow:'+palette.shadow+';animation:cotIn .6s cubic-bezier(.34,1.56,.64,1) forwards;overflow:hidden';
  // Logo Pagasi (caballito/pegaso) en lugar de torta — tintado según género
  var logoHTML = _logoSrc
    ? '<div style="margin-bottom:14px;animation:cotCake 2s ease-in-out infinite;display:flex;justify-content:center"><img src="'+_logoSrc+'" alt="Pagasi" style="width:96px;height:auto;filter:'+palette.logoFilter+'"></div>'
    : '<div style="font-size:82px;line-height:1;margin-bottom:14px;animation:cotCake 2s ease-in-out infinite">🐎</div>';
  card.innerHTML = ''
    +'<div style="position:relative;padding:48px 32px 40px;text-align:center;overflow:hidden">'
      +'<div style="position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.7) 50%,transparent 70%);animation:cotShine 2.5s ease-in-out infinite;pointer-events:none"></div>'
      +'<button onclick="cerrarCotillon()" style="position:absolute;top:14px;right:14px;width:34px;height:34px;border:none;background:rgba(255,255,255,.7);border-radius:50%;cursor:pointer;font-size:18px;font-weight:700;color:'+palette.closeCol+';display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);box-shadow:0 4px 12px rgba(0,0,0,.08);z-index:2" aria-label="Cerrar">×</button>'
      +logoHTML
      +'<div style="font-size:11px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:'+palette.tag+';margin-bottom:10px">'+_tagline+'</div>'
      +'<div style="font-size:32px;font-weight:900;color:'+palette.titulo+';letter-spacing:-1.2px;line-height:1.1;margin-bottom:8px">'+_titulo+'</div>'
      +'<div style="font-size:14.5px;color:'+palette.subtitulo+';font-weight:500;line-height:1.55;max-width:380px;margin:0 auto 22px">'+_subtitulo+'</div>'
      +'<button onclick="cerrarCotillon()" style="background:'+palette.btn+';color:#fff;border:none;padding:13px 32px;border-radius:50px;font-weight:800;font-size:14px;cursor:pointer;letter-spacing:.02em;box-shadow:'+palette.btnShadow+';transition:transform .15s">'+_btnTxt+'</button>'
    +'</div>';
  document.body.appendChild(card);

  // Animar partículas
  var gravity = 0.18, drag = 0.992;
  var startTs = Date.now();
  function drawStar(cx, cy, size){
    ctx.beginPath();
    for(var i=0;i<5;i++){
      var ang = (Math.PI*2*i)/5 - Math.PI/2;
      var ang2 = ang + Math.PI/5;
      ctx.lineTo(cx + Math.cos(ang)*size, cy + Math.sin(ang)*size);
      ctx.lineTo(cx + Math.cos(ang2)*size*.5, cy + Math.sin(ang2)*size*.5);
    }
    ctx.closePath();
    ctx.fill();
  }
  function frame(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    var alive = 0;
    for(var i=0;i<partis.length;i++){
      var p = partis[i];
      if(p.life <= 0) continue;
      alive++;
      p.vx *= drag; p.vy = p.vy*drag + gravity;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vrot;
      var elapsed = (Date.now() - startTs) / 1000;
      p.life = Math.max(0, 1 - elapsed/6);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      if(p.shape === 'sq'){ ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size); }
      else if(p.shape === 'st'){ drawStar(0, 0, p.size/2); }
      else { ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    if(document.getElementById('cotillon-canvas') && alive > 0 && (Date.now() - startTs) < 8000){
      requestAnimationFrame(frame);
    } else {
      if(canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  }
  requestAnimationFrame(frame);

  // Listener para Escape cierra el card
  document.addEventListener('keydown', _cotillonEsc);
}

function _cotillonEsc(e){
  if(e.key === 'Escape') cerrarCotillon();
}

function cerrarCotillon(){
  ['cotillon-card','cotillon-backdrop','cotillon-canvas'].forEach(function(id){
    var el = document.getElementById(id);
    if(el && el.parentNode) el.parentNode.removeChild(el);
  });
  document.removeEventListener('keydown', _cotillonEsc);
}

// ─── EDITAR MI PERFIL (cumpleaños, nombre, teléfono) ───
function profProfileChanged(){
  var btn = document.getElementById('prof-save-btn');
  if(btn) btn.style.display = 'inline-flex';
}

// ─── BIENVENIDA: pide datos si el perfil está incompleto ───
function chequearPerfilIncompleto(){
  try {
    if(!S.currentUser || !S.currentUser.uid) return;
    var u = S.currentUser;
    // Campos que consideramos "imprescindibles" para que el perfil esté completo.
    // Las redes sociales se piden "al menos una".
    var faltantes = [];
    if(!u.cedula) faltantes.push('Cédula');
    if(!u.genero) faltantes.push('Género');
    if(!u.cumpleanos && !u.fechaNacimiento) faltantes.push('Cumpleaños');
    if(!u.tel && !u.telefono) faltantes.push('Teléfono');
    if(!u.direccion) faltantes.push('Dirección');
    if(!u.emergencia) faltantes.push('Contacto de emergencia');
    var algunaRed = !!(u.instagram || u.facebook || u.tiktok || u.twitter || u.linkedin);
    if(!algunaRed) faltantes.push('Al menos una red social');
    if(!faltantes.length) return; // perfil completo, no molestamos
    // Anti-spam: no mostrar más de una vez por día por usuario
    var hoy = new Date().toISOString().slice(0,10);
    var lsKey = '_perfilNagDismissed_'+u.uid+'_'+hoy;
    try { if(localStorage.getItem(lsKey)) return; } catch(e){}
    // Construir y mostrar el modal de bienvenida
    setTimeout(function(){ _mostrarBienvenidaPerfil(faltantes, lsKey); }, 1200);
  } catch(e){ console.warn('chequearPerfilIncompleto:', e); }
}

function _mostrarBienvenidaPerfil(faltantes, lsKey){
  if(document.getElementById('welcome-perfil-card')) return;
  // Inyectar estilos si no existen
  if(!document.getElementById('welcome-perfil-styles')){
    var s = document.createElement('style');
    s.id = 'welcome-perfil-styles';
    s.textContent = '@keyframes wpIn{0%{transform:translate(-50%,-50%) scale(.9);opacity:0}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}@keyframes wpBack{0%{opacity:0}100%{opacity:1}}';
    document.head.appendChild(s);
  }
  var nombre = (S.currentUser && S.currentUser.nombre) ? S.currentUser.nombre.split(' ')[0] : '';
  function _cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1).toLowerCase() : s; }
  nombre = _cap(nombre||'');

  // Backdrop
  var backdrop = document.createElement('div');
  backdrop.id = 'welcome-perfil-backdrop';
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99998;animation:wpBack .3s ease forwards';
  document.body.appendChild(backdrop);

  // Logo Pagasi
  var _logoEl = document.querySelector('.sb-logo img');
  var _logoSrc = (_logoEl && _logoEl.src) ? _logoEl.src : '';
  var logoHTML = _logoSrc
    ? '<img src="'+_logoSrc+'" alt="Pagasi" style="width:64px;height:auto;margin:0 auto 14px;display:block;filter:brightness(0) saturate(100%) invert(20%) sepia(96%) saturate(2300%) hue-rotate(217deg) brightness(95%) contrast(98%) drop-shadow(0 4px 10px rgba(0,0,0,.12))">'
    : '<div style="font-size:48px;text-align:center;margin-bottom:14px">🐎</div>';

  // Lista de faltantes
  var faltantesList = faltantes.map(function(f){
    return '<li style="display:flex;align-items:center;gap:9px;padding:7px 0;color:var(--ink2);font-size:13px;font-weight:600"><span style="width:6px;height:6px;border-radius:50%;background:var(--p1);flex-shrink:0"></span>'+f+'</li>';
  }).join('');

  var card = document.createElement('div');
  card.id = 'welcome-perfil-card';
  card.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:100000;background:#fff;border-radius:24px;padding:0;width:90%;max-width:480px;box-shadow:0 30px 80px rgba(37,99,235,.25),0 0 0 1px rgba(255,255,255,.6);animation:wpIn .4s cubic-bezier(.34,1.56,.64,1) forwards;overflow:hidden';
  card.innerHTML = ''
    +'<div style="position:relative;padding:36px 32px 28px;background:linear-gradient(180deg,#F0F9FF 0%,#fff 100%)">'
      +logoHTML
      +'<div style="font-size:11px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:var(--p1);text-align:center;margin-bottom:8px">¡Bienvenid@'+(nombre?', '+nombre:'')+'!</div>'
      +'<div style="font-size:22px;font-weight:900;color:var(--ink);text-align:center;letter-spacing:-.6px;line-height:1.2;margin-bottom:10px">Completá tu perfil</div>'
      +'<div style="font-size:13px;color:var(--ink3);text-align:center;line-height:1.55;max-width:340px;margin:0 auto 18px">Para que el equipo pueda contactarte y celebrar tu cumpleaños, agregá estos datos a tu perfil:</div>'
      +'<ul style="list-style:none;padding:0;margin:0 0 22px;background:var(--surf);border:1px solid var(--rim);border-radius:12px;padding:10px 16px">'+faltantesList+'</ul>'
      +'<div style="display:flex;gap:9px">'
        +'<button onclick="_cerrarBienvenidaPerfil()" style="flex:1;background:var(--surf2);color:var(--ink2);border:1.5px solid var(--rim);font-family:inherit;font-weight:700;font-size:13.5px;padding:12px 0;border-radius:12px;cursor:pointer;transition:.15s">Después</button>'
        +'<button onclick="_abrirPerfilDesdeBienvenida()" style="flex:1.4;background:linear-gradient(135deg,var(--p1),var(--p2));color:#fff;border:none;font-family:inherit;font-weight:800;font-size:13.5px;padding:12px 0;border-radius:12px;cursor:pointer;box-shadow:0 6px 18px rgba(37,99,235,.28);transition:.15s">Completar ahora →</button>'
      +'</div>'
      +'<div style="text-align:center;font-size:10.5px;color:var(--ink4);margin-top:14px">No te molestaremos hasta mañana</div>'
    +'</div>';
  document.body.appendChild(card);

  // Cerrar al hacer click en el backdrop
  backdrop.onclick = function(){ _cerrarBienvenidaPerfil(); };
  // Guardar la clave para marcar como visto
  window._welcomePerfilLSKey = lsKey;
}

function _cerrarBienvenidaPerfil(){
  var b = document.getElementById('welcome-perfil-backdrop');
  var c = document.getElementById('welcome-perfil-card');
  if(b) b.remove();
  if(c) c.remove();
  // Marcar como dismissed para hoy
  try { if(window._welcomePerfilLSKey) localStorage.setItem(window._welcomePerfilLSKey,'1'); } catch(e){}
}

function _abrirPerfilDesdeBienvenida(){
  _cerrarBienvenidaPerfil();
  // Abrir overlay de Mi Perfil
  if(typeof showAdminProfile === 'function') showAdminProfile();
}
window.chequearPerfilIncompleto = chequearPerfilIncompleto;
window._cerrarBienvenidaPerfil = _cerrarBienvenidaPerfil;
window._abrirPerfilDesdeBienvenida = _abrirPerfilDesdeBienvenida;

async function guardarMiPerfil(){
  if(!S.currentUser || !S.currentUser.uid){
    if(typeof toast==='function') toast('No estás logueado','error');
    return;
  }
  var btn = document.getElementById('prof-save-btn');
  function val(id){ var el = document.getElementById(id); return el ? (el.value||'') : ''; }
  if(btn){ btn.disabled = true; btn.textContent = 'Guardando…'; }

  var update = {
    // Datos personales
    nombre: val('prof-nombre').trim(),
    cedula: val('prof-cedula').trim(),
    genero: val('prof-genero').trim(),
    cumpleanos: val('prof-cumple').trim(),
    estadoCivil: val('prof-estadocivil').trim(),
    sede: val('prof-sede').trim(),
    // Contacto
    tel: val('prof-tel').trim(),
    tel2: val('prof-tel2').trim(),
    direccion: val('prof-direccion').trim(),
    emergencia: val('prof-emergencia').trim(),
    // Redes
    instagram: val('prof-instagram').trim().replace(/^@/,''),
    facebook: val('prof-facebook').trim(),
    tiktok: val('prof-tiktok').trim().replace(/^@/,''),
    twitter: val('prof-twitter').trim().replace(/^@/,''),
    linkedin: val('prof-linkedin').trim(),
    actualizadoEn: new Date().toISOString()
  };
  console.log('[Mi Perfil] Guardando:', S.currentUser.uid, update);

  if(!db){
    if(typeof toast==='function') toast('Firebase no inicializado — no se puede guardar','error');
    if(btn){ btn.disabled=false; btn.textContent='Guardar cambios'; }
    return;
  }

  try {
    // 1) Escribir a Firestore con merge
    await db.collection('usuarios').doc(S.currentUser.uid).set(update, {merge:true});
    // 2) Re-leer para verificar que se persistió correctamente
    var verifyDoc = await db.collection('usuarios').doc(S.currentUser.uid).get();
    var saved = verifyDoc.exists ? (verifyDoc.data()||{}) : {};
    console.log('[Mi Perfil] Persistido en Firestore:', saved);
    if(saved.cumpleanos !== update.cumpleanos){
      console.warn('[Mi Perfil] WARNING: cumpleanos guardado difiere del enviado', {enviado:update.cumpleanos, leido:saved.cumpleanos});
    }
    // 3) Actualizar estado local
    Object.assign(S.currentUser, saved); // usar lo que efectivamente quedó en Firestore
    // 4) Sincronizar caché de usuarios
    try {
      var uid = S.currentUser.uid;
      var fullObj = Object.assign({uid:uid, email:S.currentUser.email||''}, saved);
      if(typeof _usersCache !== 'undefined' && Array.isArray(_usersCache)){
        var idx = _usersCache.findIndex(function(u){ return u && u.uid === uid; });
        if(idx >= 0) Object.assign(_usersCache[idx], fullObj);
        else _usersCache.push(fullObj);
      }
      if(S._wtUsers && Array.isArray(S._wtUsers)){
        var idx2 = S._wtUsers.findIndex(function(u){ return u && u.uid === uid; });
        if(idx2 >= 0) Object.assign(S._wtUsers[idx2], fullObj);
        else S._wtUsers.push(fullObj);
      }
    } catch(e){ console.warn('cache sync miPerfil:', e); }
    // 5) Sidebar + log
    if(typeof updateSidebarFooter==='function') updateSidebarFooter();
    if(typeof logActividad==='function') logActividad('perfil_editado','perfil',S.currentUser.uid,{nombre:update.nombre,cumpleanos:update.cumpleanos});
    // 6) Re-render Centro si está abierto, para que aparezca en Mayo al instante
    if(S.page === 'centro' && typeof nav === 'function'){ try { nav('centro'); } catch(e){} }
    if(typeof toast==='function') toast('✓ Perfil guardado'+ (update.cumpleanos?' · cumple '+update.cumpleanos:''),'success');
    if(btn){ btn.style.display='none'; btn.disabled=false; btn.textContent='Guardar cambios'; }
  } catch(e){
    console.error('[Mi Perfil] Error guardando:', e);
    var msg = (e && e.message) || String(e);
    if(/permission|insufficient/i.test(msg)) msg = 'Permiso denegado en Firestore. Pídele al administrador revisar las reglas de usuarios/{uid}.';
    if(typeof toast==='function') toast('Error: '+msg,'error');
    if(btn){ btn.disabled=false; btn.textContent='Guardar cambios'; }
  }
}

// ─── ROTAR TIP DEL DÍA manualmente ───
function dashTipNext(){
  try {
    // Cambiar el tip directamente en el DOM sin re-navegar
    var pool = (typeof WT_TIPS !== 'undefined' && WT_TIPS.length) ? WT_TIPS : null;
    if(!pool) return;
    var prev = window._tipOverride;
    var next = prev;
    var safety = 0;
    while((next === prev || next === undefined) && safety++ < 30){
      next = Math.floor(Math.random()*pool.length);
    }
    window._tipOverride = next;
    var tipEl = document.getElementById('dly-tip-text');
    if(tipEl) tipEl.textContent = pool[next % pool.length];
  } catch(e){ console.warn('dashTipNext:', e); }
}

// ─── TABS del card diario ───
function dashDailyTab(t){
  ['tip','chiste','dato','noticia'].forEach(function(k){
    var btn = document.querySelector('.dly-tab[data-tab="'+k+'"]');
    var pane = document.getElementById('dly-tab-'+k);
    if(btn){
      btn.classList.toggle('is-active', k === t);
      btn.style.color = k === t ? 'var(--ink)' : 'var(--ink3)';
      btn.style.fontWeight = k === t ? '800' : '700';
      btn.style.borderBottomColor = k === t ? 'var(--p1)' : 'transparent';
    }
    if(pane) pane.style.display = k === t ? 'block' : 'none';
  });
  // Si es la primera vez que abren la tab, cargar contenido
  if(t === 'chiste' || t === 'dato' || t === 'noticia'){
    var key = '_dlyLoaded_'+t;
    if(!window[key]){
      window[key] = true;
      dashDailyLoad(t, false);
    }
  }
}

// ─── CARGAR contenido del día desde APIs públicas ───
async function dashDailyLoad(tipo, force){
  var hoyKey = new Date().toISOString().slice(0,10);  // YYYY-MM-DD
  var cacheKey = 'pgsDaily_'+tipo+'_'+hoyKey;
  var textEl = document.getElementById('dly-'+tipo+'-text');
  if(!textEl) return;

  // Si NO force y hay cache de hoy, usarlo
  if(!force){
    try {
      var cached = localStorage.getItem(cacheKey);
      if(cached){
        // Noticias se renderiza como HTML (tiene links), el resto como texto
        if(tipo === 'noticia'){ textEl.innerHTML = cached; }
        else { textEl.textContent = cached; }
        return;
      }
    } catch(e){}
  }

  textEl.textContent = 'Cargando…';

  try {
    var resultado = '';
    if(tipo === 'chiste'){
      // 50% del tiempo usa local (variedad asegurada) y 50% API
      var pool = (typeof WT_CHISTES !== 'undefined' && WT_CHISTES.length) ? WT_CHISTES : null;
      var usarApi = Math.random() < 0.5;
      if(usarApi){
        try {
          var r = await fetch('https://v2.jokeapi.dev/joke/Any?lang=es&type=single&blacklistFlags=nsfw,racist,sexist,political,religious,explicit');
          var d = await r.json();
          if(d.joke){ resultado = d.joke; }
          else if(d.setup && d.delivery){ resultado = d.setup + ' — ' + d.delivery; }
          else throw new Error('API sin chiste');
        } catch(_e){
          if(pool) resultado = pool[Math.floor(Math.random()*pool.length)];
          else throw _e;
        }
      } else {
        // Pool local: garantiza nuevo chiste evitando repetir el anterior
        if(pool){
          var prevChiste = localStorage.getItem(cacheKey) || '';
          var idx = Math.floor(Math.random()*pool.length);
          var safety = 0;
          while(pool[idx] === prevChiste && safety++ < 20){
            idx = Math.floor(Math.random()*pool.length);
          }
          resultado = pool[idx];
        } else {
          // Sin pool local — fallback a API
          var r = await fetch('https://v2.jokeapi.dev/joke/Any?lang=es&type=single&blacklistFlags=nsfw,racist,sexist,political,religious,explicit');
          var d = await r.json();
          resultado = d.joke || (d.setup + ' — ' + d.delivery);
        }
      }
    }
    else if(tipo === 'dato'){
      var pool = (typeof WT_DATOS !== 'undefined' && WT_DATOS.length) ? WT_DATOS : null;
      if(pool){
        // Evitar repetir el dato anterior
        var prevDato = localStorage.getItem(cacheKey) || '';
        var idx = Math.floor(Math.random()*pool.length);
        var safety = 0;
        while(pool[idx] === prevDato && safety++ < 20){
          idx = Math.floor(Math.random()*pool.length);
        }
        resultado = pool[idx];
      } else {
        throw new Error('No hay datos locales');
      }
    }
    else if(tipo === 'noticia'){
      // Múltiples fuentes de noticias con fallback automático
      var noticias = null;
      var fuentesNoticias = [
        // 1) RSS2JSON con Google News VE
        {url:'https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://news.google.com/rss?hl=es-419&gl=VE&ceid=VE:es-419')+'&count=6',
         parse:function(d){ return d.items && d.items.length ? d.items : null; }},
        // 2) AllOrigins proxy con Google News VE
        {url:'https://api.allorigins.win/get?url='+encodeURIComponent('https://news.google.com/rss?hl=es-419&gl=VE&ceid=VE:es-419'),
         parse:function(d){
           if(!d.contents) return null;
           try {
             var doc = new DOMParser().parseFromString(d.contents, 'text/xml');
             var items = doc.querySelectorAll('item');
             var arr = [];
             items.forEach(function(it){
               arr.push({
                 title: (it.querySelector('title')||{}).textContent || '',
                 link: (it.querySelector('link')||{}).textContent || '',
                 author: (it.querySelector('source')||{}).textContent || ''
               });
             });
             return arr.length ? arr.slice(0,6) : null;
           } catch(e) { return null; }
         }},
        // 3) RSS2JSON con BBC Mundo (cobertura LatAm en español)
        {url:'https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://feeds.bbci.co.uk/mundo/rss.xml')+'&count=6',
         parse:function(d){ return d.items && d.items.length ? d.items : null; }},
        // 4) AllOrigins con BBC Mundo
        {url:'https://api.allorigins.win/get?url='+encodeURIComponent('https://feeds.bbci.co.uk/mundo/rss.xml'),
         parse:function(d){
           if(!d.contents) return null;
           try {
             var doc = new DOMParser().parseFromString(d.contents, 'text/xml');
             var items = doc.querySelectorAll('item');
             var arr = [];
             items.forEach(function(it){
               arr.push({
                 title: (it.querySelector('title')||{}).textContent || '',
                 link: (it.querySelector('link')||{}).textContent || '',
                 author: 'BBC Mundo'
               });
             });
             return arr.length ? arr.slice(0,6) : null;
           } catch(e) { return null; }
         }}
      ];

      // Fetch con timeout para no quedar colgado en fuentes lentas
      function _newsfetch(url, timeoutMs){
        return new Promise(function(resolve, reject){
          var ctrl = (typeof AbortController!=='undefined') ? new AbortController() : null;
          var to = setTimeout(function(){ if(ctrl) ctrl.abort(); reject(new Error('timeout')); }, timeoutMs||4000);
          fetch(url, ctrl ? {signal: ctrl.signal} : {})
            .then(function(r){ clearTimeout(to); resolve(r); })
            .catch(function(e){ clearTimeout(to); reject(e); });
        });
      }
      for(var i=0;i<fuentesNoticias.length;i++){
        try {
          var src = fuentesNoticias[i];
          var rr = await _newsfetch(src.url, 4500);
          if(!rr.ok) continue;
          var dd = await rr.json();
          var arr = src.parse(dd);
          if(arr && arr.length){
            noticias = arr;
            break;
          }
        } catch(e){
          // Silencioso: los CORS/timeout de feeds externos no son bugs nuestros,
          // no ensuciar la consola del navegador.
        }
      }

      if(noticias && noticias.length){
        var items = noticias.slice(0,3);
        textEl.innerHTML = items.map(function(it, idx){
          var title = String(it.title||'').replace(/<[^>]*>/g,'').slice(0,180);
          var src = String(it.author||it.source||'').slice(0,40);
          var isLast = idx === items.length - 1;
          return '<div style="margin-bottom:'+(isLast?'0':'10px')+';padding-bottom:'+(isLast?'0':'10px')+';'+(isLast?'':'border-bottom:1px solid var(--rim);')+'">'
            +'<a href="'+(it.link||'#')+'" target="_blank" rel="noopener" style="color:var(--ink);text-decoration:none;font-weight:700;line-height:1.4;display:block;font-size:15px">'+title+'</a>'
            +(src?'<div style="font-size:11px;color:var(--ink3);margin-top:5px;font-weight:600">'+src+'</div>':'')
          +'</div>';
        }).join('');
        try { localStorage.setItem(cacheKey, textEl.innerHTML); } catch(e){}
        return;
      } else throw new Error('Todas las fuentes de noticias fallaron');
    }

    textEl.textContent = resultado;
    try { localStorage.setItem(cacheKey, resultado); } catch(e){}
  } catch(err) {
    // Silencioso: red/CORS no es bug nuestro, usar fallback local sin alarmar consola
    // Fallbacks locales
    var fallbacks = {
      chiste: '¿Por qué los programadores prefieren motos? Porque tienen "throw" y "catch" en cada curva.',
      dato: 'Las motocicletas pueden inclinarse hasta 55° en una curva sin perder estabilidad si el motociclista lo hace correctamente.',
      noticia: 'No se pudo cargar noticias en este momento. Verifica tu conexión a internet.'
    };
    textEl.textContent = fallbacks[tipo] || 'No disponible';
  }
}

// ── Notas de Firestore (consola → Firestore → Reglas): ──────
// rules_version = '2';
// service cloud.firestore {
// match /databases/{database}/documents {
// match /{document=**} {
// allow read, write: if request.auth != null;
//     }
//   }
// }
// ────────────────────────────────────────────────────────────

var db = null;
var auth = null;
var storage = null;
var FIREBASE_READY = false;


function getCreditoTotalCuotas(c){
  return parseInt((c&&c.totalCuotas) || ((c&&c.plazo) ? c.plazo*2 : 20), 10) || 20;
}
function getCreditoCuotaBase(c){
  return parseFloat((c&&(c.cuotaQ||c.cuota)) || 0) || 0;
}
// ── Indice de pagos confirmados por credito ──────────────────────────────
// getCreditoPagosConfirmados recorria los ~2.500 pagos completos por CADA
// credito. La pantalla de creditos lo llama ~12.000 veces por redibujo (KPIs,
// ranking, cartera por modelo, cada fila): 30 millones de comparaciones por
// cada letra del buscador. Adam, 10-sep-2026: "en el buscador cuando buscas un
// credito se tarda full".
// Ahora el recorrido se hace UNA vez por redibujo y el resto son consultas
// directas. El resultado es identico: misma condicion, misma suma en el mismo
// orden. El indice vive un solo tick y ademas se rearma si S.pagos es otro
// array, cambio de largo, o hubo una escritura (_dbSilent), un nav() o un
// closeM(): cualquier cambio local se ve en el redibujo que le sigue.
var _pagosIdx = null;
var _pagosIdxVer = 0;
function _pagosIdxInvalidar(){ _pagosIdxVer++; }
function _pagosIdxObtener(){
  var arr = (S && Array.isArray(S.pagos)) ? S.pagos : null;
  if(!arr) return null;
  if(_pagosIdx && _pagosIdx.ref === arr && _pagosIdx.len === arr.length && _pagosIdx.ver === _pagosIdxVer) return _pagosIdx.map;
  var map = new Map();   // Map compara como ===: un cred '12' no casa con un id 12, igual que antes
  for(var i=0;i<arr.length;i++){
    var p = arr[i];
    if(!(p && !p.eliminado && p.estado==='confirmado' && !p.esInicial && p.tipoOperacion!=='inicial_credito')) continue;
    var e = map.get(p.cred);
    if(!e){ e = {sum:0, n:0}; map.set(p.cred, e); }
    e.sum = e.sum + (parseFloat(p.monto)||0);
    e.n++;
  }
  _pagosIdx = { ref: arr, len: arr.length, ver: _pagosIdxVer, map: map };
  setTimeout(function(){ _pagosIdx = null; }, 0);   // vive un solo tick
  return map;
}
function getCreditoPagosConfirmados(c){
  if(!c) return 0;
  var idx = _pagosIdxObtener();
  var e = idx ? idx.get(c.id) : null;
  if(e && e.n){
    return e.sum;
  }
  if(Array.isArray(c.pagosRegistrados) && c.pagosRegistrados.length){
    return c.pagosRegistrados.reduce(function(a,h){ return a + (parseFloat(h.montoPagado)||0); }, 0);
  }
  return (parseInt(c.pagado,10)||0) * getCreditoCuotaBase(c);
}
// ── fin indice de pagos ──────────────────────────────────────────────────
function getCreditoCuotasPagadas(c){
  if(!c) return 0;
  var totalCuotas = getCreditoTotalCuotas(c);
  var cuotaBase = getCreditoCuotaBase(c);
  var pagadoRegistrado = parseInt(c.pagado,10) || 0;
  var pagadoPorMonto = cuotaBase>0 ? Math.floor((getCreditoPagosConfirmados(c)+0.000001)/cuotaBase) : pagadoRegistrado;
  return Math.max(0, Math.min(totalCuotas, Math.max(pagadoRegistrado, pagadoPorMonto)));
}
function getCreditoSaldoPendiente(c){
  return Math.max(0, (parseFloat((c&&c.total) || 0)||0) - getCreditoPagosConfirmados(c));
}

// ════════════════════════════════════════════════════════════════════
// nextCredId: Genera el siguiente ID de crédito MONOTÓNICAMENTE.
// Toma el máximo número existente (incluyendo eliminados y cancelados)
// y le suma 1 — así un ID nunca se repite aunque se borre uno anterior.
// Esto preserva la trazabilidad contable: si tenías CRED-001, CRED-002
// y CRED-003, y luego eliminas el 002, el siguiente será CRED-004 (no 003).
// ════════════════════════════════════════════════════════════════════
function nextCredId(){
  // Lee S.creds local como fallback offline
  var max = 0;
  var all = (S && Array.isArray(S.creds)) ? S.creds : [];
  all.forEach(function(c){
    if(!c || !c.id) return;
    var m = String(c.id).match(credNumRe());
    if(m){ var n = parseInt(m[1], 10); if(!isNaN(n) && n > max) max = n; }
  });
  return credNum(max + 1);
}
// ════════════════════════════════════════════════════════════════════
// RESERVA ATOMICA DE NUMEROS
//
// Antes, el siguiente numero se sacaba leyendo el maximo existente y
// sumandole 1. Entre esa lectura y el guardado pasan segundos, asi que
// dos vendedores guardando a la vez obtenian EL MISMO numero, y el
// segundo `set()` sobrescribia el credito del primero sin avisar.
// Paso de verdad: CRED-271 y CRED-313 (jul-2026).
//
// Ahora el numero se reserva dentro de una transaccion de Firestore
// sobre contadores/{coleccion}. La transaccion serializa a los
// vendedores: si dos piden a la vez, uno recibe N y el otro N+1.
//
// `minimo` siembra el contador con el maximo realmente existente, para
// que un contador nuevo (o atrasado por una importacion) nunca entregue
// un numero que ya esta en uso.
// ════════════════════════════════════════════════════════════════════
function reservarNumero(nombre, minimo, intentos){
  var ref = db.collection('contadores').doc(String(nombre));
  var quedan = intentos == null ? 6 : intentos;
  return db.runTransaction(function(tx){
    return tx.get(ref).then(function(d){
      var actual = (d.exists && typeof d.data().ultimo === 'number') ? d.data().ultimo : 0;
      var siguiente = Math.max(actual, parseInt(minimo,10)||0) + 1;
      tx.set(ref, { ultimo: siguiente, actualizado: new Date().toISOString() }, { merge:true });
      return siguiente;
    });
  }).catch(function(e){
    // Con varios vendedores guardando al mismo tiempo la transaccion puede
    // agotar sus reintentos internos. Reintentamos con espera creciente.
    // NUNCA devolvemos un numero calculado localmente: seria justamente el
    // numero repetido que borro los creditos 271 y 313.
    if(quedan <= 0) throw e;
    var espera = (7 - quedan) * 120;
    return new Promise(function(res){ setTimeout(res, espera); })
      .then(function(){ return reservarNumero(nombre, minimo, quedan - 1); });
  });
}

// Maximo numero realmente presente en una coleccion (para sembrar el contador)
function _maxNumeroDe(coleccion, regex){
  return db.collection(coleccion).get().then(function(snap){
    var max = 0;
    snap.forEach(function(d){
      var raw = d.id || (d.data && d.data().id) || '';
      var n;
      if(regex){ var m = String(raw).match(regex); n = m ? parseInt(m[1],10) : NaN; }
      else { n = parseInt((d.data && d.data().id) || d.id, 10); }
      if(!isNaN(n) && n > max) max = n;
    });
    return max;
  });
}

// Si la reserva no se puede hacer, estas funciones RECHAZAN. Antes caian en un
// fallback que calculaba el numero con la lista local, y ese es precisamente el
// numero repetido que destruye ventas. Es mejor no crear el credito y avisar,
// que crearlo encima del de otro cliente.
function nextCredIdAsync(){
  if(!db) return Promise.resolve(nextCredId());
  // Rellena huecos primero: si faltan numeros en la secuencia (ej. 319-326 que
  // quedaron reservados en pruebas), la proxima venta toma el mas bajo libre.
  // Cuando no quedan huecos, sigue con el siguiente numero atomico (max+1).
  // El candado DB.crearCred cubre las carreras: si dos toman el mismo hueco a la
  // vez, uno entra y el otro reintenta y agarra el siguiente libre.
  return db.collection('creditos').get().then(function(snap){
    var usados = {}, max = 0;
    snap.forEach(function(d){
      var m = String((d.data && d.data().id) || d.id || '').match(credNumRe());
      if(m){ var n = parseInt(m[1], 10); if(!isNaN(n)){ usados[n] = 1; if(n > max) max = n; } }
    });
    for(var g = 1; g <= max; g++){
      if(!usados[g]) return credNum(g);   // hueco mas bajo
    }
    // Sin huecos: numero siguiente, reservado de forma atomica.
    return reservarNumero('creditos', max).then(function(n){
      return credNum(n);
    });
  });
}

function nextClienteIdAsync(){
  if(!db) return Promise.resolve((S&&S.clientes&&S.clientes.length)?Math.max.apply(null,S.clientes.map(function(x){return parseInt(x.id,10)||0;}))+1:1);
  return _maxNumeroDe('clientes', null)
    .then(function(max){ return reservarNumero('clientes', max); });
}

// ── EL VIN: avisar, no bloquear (punto 29, 22-sep-2026) ───────────────────────
// El VIN entraba como texto libre en los dos sitios donde se escribe (el asistente de
// creditos e Inventario): nadie revisaba largo ni caracteres, ni lo comparaba con el
// de la moto elegida. Un 2 por una Z al copiar de una foto pasaba derecho.
// Devuelve una lista de avisos. NO bloquea: a veces la moto de verdad trae un VIN raro
// y el empleado tiene el papel delante.
function vinAvisos(vin, vinMoto){
  var v = String(vin==null?'':vin).trim().toUpperCase(), a = [];
  if(!v) return a;
  if(/[^A-Z0-9]/.test(v)) a.push('el VIN solo lleva letras y números, sin espacios ni guiones');
  else if(/[IOQ]/.test(v)) a.push('el VIN nunca lleva I, O ni Q: fíjate si es 1 o 0');
  if(v.length !== 17) a.push('tiene ' + v.length + ' caracteres y los de fábrica tienen 17');
  var m = String(vinMoto==null?'':vinMoto).trim().toUpperCase();
  if(m && m !== v) a.push('no coincide con el de la moto en Inventario (' + m + ')');
  if(!m && typeof S!=='undefined' && S.motos){
    var rep = S.motos.filter(function(x){ return x && !x.eliminado && String(x.vin||'').trim().toUpperCase()===v; });
    if(rep.length) a.push('ya hay otra moto con este VIN (' + (typeof motoNum==='function' ? motoNum(rep[0]) : '#'+rep[0].id) + ')');
  }
  return a;
}
window.vinAvisos = vinAvisos;

// El numero de un GASTO salia de Math.max sobre lo que hay en memoria, y DB.saveEgreso
// escribe con set(): si dos personas registran un gasto casi a la vez, las dos sacan el
// mismo numero y la segunda BORRA el de la primera sin avisar. Es lo mismo que se llevo
// por delante los creditos 271 y 313, y por eso las motos y los creditos ya usan el
// contador de Firestore. Ahora los gastos tambien (punto 30, 22-sep-2026).
// Reserva N numeros seguidos de una sola vez: la compra de una moto crea varios gastos
// (uno por cuenta) y pedirlos de uno en uno serian N transacciones.
function nextEgresoIdsAsync(cuantos){
  var n = Math.max(1, parseInt(cuantos,10) || 1);
  var localBase = function(){
    return (S && S.egresos && S.egresos.length)
      ? Math.max.apply(null, S.egresos.map(function(x){ return parseInt(x.id,10)||0; })) : 0;
  };
  var seguidos = function(ultimo){
    var out = []; for(var i=n-1; i>=0; i--) out.push(ultimo - i); return out;
  };
  if(!db) return Promise.resolve(seguidos(localBase() + n));
  return _maxNumeroDe('egresos', null)
    .then(function(max){ return reservarNumero('egresos', Math.max(max, localBase()) + (n-1)); })
    .then(seguidos);
}
function nextEgresoIdAsync(){ return nextEgresoIdsAsync(1).then(function(a){ return a[0]; }); }
window.nextEgresoIdsAsync = nextEgresoIdsAsync; window.nextEgresoIdAsync = nextEgresoIdAsync;

function nextMotoIdAsync(){
  if(!db) return Promise.resolve((S&&S.motos&&S.motos.length)?Math.max.apply(null,S.motos.map(function(x){return parseInt(x.id,10)||0;}))+1:1);
  return _maxNumeroDe('motos', null)
    .then(function(max){ return reservarNumero('motos', max); });
}

function esMovimientoInicialCredito(m){
  if(!m || m.eliminado) return false;
  var concepto = (m.concepto||'');
  return m.tipoOperacion==='inicial_credito' || concepto.indexOf('Inicial · ')===0;
}
function getTotalInicialesCobradas(){
  return (S&&Array.isArray(S.movimientos) ? S.movimientos : []).filter(esMovimientoInicialCredito).reduce(function(a,m){
    return a + (parseFloat(m.monto)||0);
  }, 0);
}
// ¿Este movimiento es de ESTE credito? El texto se compara por palabras completas:
// buscar "CRED-14" dentro del concepto tambien encontraba CRED-140 … CRED-149 y borraba
// movimientos de otros creditos (punto 19, 22-sep-2026).
function _movEsDelCredito(m, credId){
  if(!m || !credId) return false;
  if(m.creditoId===credId || m.conceptoCredito===credId || m.cred===credId) return true;
  var txt = String(m.concepto||'');
  if(!txt) return false;
  var i = txt.indexOf(credId);
  while(i > -1){
    var sig = txt.charAt(i + String(credId).length);
    if(!/[0-9A-Za-z-]/.test(sig)) return true;   // termina ahi: es el credito, no uno mas largo
    i = txt.indexOf(credId, i + 1);
  }
  return false;
}

try {
  if(typeof firebase === 'undefined'){
    console.warn('SDK de Firebase no cargado');
  } else if(FIREBASE_CONFIG.apiKey !== 'TU_API_KEY'){
    var _existingApp;
    try { _existingApp = firebase.app(); } catch(ex) {}
    if(!_existingApp) firebase.initializeApp(FIREBASE_CONFIG);
    if(typeof firebase.firestore !== 'function'){
      throw new Error('Firestore bundle no cargado. Habilita Firestore Database en Firebase Console.');
    }
    db = firebase.firestore();

    // SIN cache local (enablePersistence). Se activo el 8-sep-2026 para
    // acelerar y el sistema se puso mas lento: con ~9.000 documentos cada
    // cambio en tiempo real se escribia ademas en IndexedDB, y synchronizeTabs
    // coordinaba entre pestanas. Se quito el 10-sep. No reactivar sin medir.

    if(typeof firebase.auth === 'function') auth = firebase.auth();
    if(typeof firebase.storage === 'function') storage = firebase.storage();
    FIREBASE_READY = true;
    console.log('Firebase inicializado correctamente');
  } else {
    console.warn('Firebase no configurado');
  }
} catch(e){ console.warn('Firebase init:', e.message); }

// Loader
function showLoader(msg,sub){
  var w=$('ld-wrap'),m=$('ld-msg'),s=$('ld-sub');
  if(w)w.style.display='flex';
  if(m)m.textContent=msg||'Cargando...';
  if(s)s.textContent=sub||'';
}
function hideLoader(){var w=$('ld-wrap');if(w)w.style.display='none';}

// Firebase guarda el mismo objeto — sin conversión necesaria
function mapMoto(r){return r;}
function mapCred(r){return r;}
function mapPago(r){return r;}

// Limpia undefined antes de guardar en Firestore
function clean(o){
  var r={};
  Object.keys(o).forEach(function(k){if(o[k]!==undefined)r[k]=o[k]===null?null:o[k];});
  return r;
}

var _rtUnsubs = [];
var _rtTimer = null;
var _rtStarted = false;
var _rtRenderPending = false;

// Sanea el score_indexa de un cliente EN MEMORIA (sin escribir en la base).
// Es la misma logica que vivia dentro de DB.load. Ojo: el tiempo real deja
// S.clientes crudo, como siempre quedo tras la primera foto; esto solo se usa
// en la carga clasica y, sobre COPIAS, para reparar en la base los corruptos.
// Devuelve true si el score estaba corrupto (objeto en vez de numero).
var _scoreCorruptosVistos = 0;
function _sanearScoreCliente(cli){
  if(!cli) return false;
  var fueCorrupto = false;
  var sr = cli.score_indexa;
  // Caso 1: objeto → rescatar total/score/valor
  if(sr && typeof sr === 'object' && sr !== null){
    fueCorrupto = true;
    _scoreCorruptosVistos++;
    if(_scoreCorruptosVistos <= 2) console.log('[SCORE CORRUPTO]', cli.nombre, 'tenía:', sr);
    var t = parseFloat(sr.total || sr.score || sr.valor || sr.value || 0);
    cli.score_indexa = (t >= 300 && t <= 850) ? t : 0;
    cli._scoreFueCorrupto = true;
  } else {
    var n = parseFloat(sr);
    if(isNaN(n) || n < 300 || n > 850) cli.score_indexa = 0;
    else cli.score_indexa = n;
  }
  // Fallback: si no hay score pero hay ingreso, calcular uno estimado simple
  if(!cli.score_indexa && cli.ingreso){
    var ing = parseFloat(cli.ingreso) || 0;
    var emp = (cli.trabajo || '').toLowerCase();
    // Score base por ingreso (300 a 850 según rango)
    var base = 300;
    if(ing >= 2000) base = 720;
    else if(ing >= 1000) base = 650;
    else if(ing >= 500) base = 580;
    else if(ing >= 300) base = 500;
    else if(ing >= 150) base = 430;
    else base = 380;
    // Bonus/penalización por tipo de empleo
    if(emp.indexOf('formal')>=0 || emp.indexOf('público')>=0 || emp.indexOf('publico')>=0) base += 40;
    else if(emp.indexOf('informal')>=0 || emp.indexOf('indepen')>=0) base -= 20;
    // Limitar 300-850
    cli.score_indexa = Math.max(300, Math.min(850, base));
    cli._scoreEstimado = true;
  }
  return fueCorrupto;
}

function stopRealtime(){
  _rtUnsubs.forEach(function(unsub){ try{ if(typeof unsub==='function') unsub(); }catch(e){} });
  _rtUnsubs = [];
  _rtStarted = false;
  if(typeof _rtObjetosReset==='function') _rtObjetosReset();   // la siguiente foto desempaca todo
  if(_rtTimer){ clearTimeout(_rtTimer); _rtTimer = null; }
}

function _captureFocus(){
  var el = document.activeElement;
  if(!el || !el.id || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return null;
  return {
    id: el.id,
    start: typeof el.selectionStart==='number' ? el.selectionStart : null,
    end: typeof el.selectionEnd==='number' ? el.selectionEnd : null
  };
}

function _restoreFocus(f){
  if(!f || !f.id) return;
  setTimeout(function(){
    var el = document.getElementById(f.id);
    if(!el) return;
    try{ el.focus(); }catch(e){}
    if(f.start!==null && typeof el.setSelectionRange==='function'){
      try{ el.setSelectionRange(f.start, f.end); }catch(e){}
    }
  }, 0);
}

// ── Redibujo en tiempo real ─────────────────────────────────────────────
// Cada cambio de CUALQUIER empleado en las colecciones escuchadas llega a TODAS
// las pantallas abiertas. Antes cada llegada redibujaba la pagina entera a los
// 350 ms, y el redibujo pasaba por nav(), que ademas reseteaba la paginacion.
// A mediodia, con todos registrando pagos, las pantallas no paraban de
// redibujarse, el Dashboard recalculaba sus graficos cada vez, y el empleado
// volvia a la pagina 1 de la tabla. Ademas, con cambios cada menos de 350 ms
// el temporizador se reiniciaba sin fin y la pantalla nunca se actualizaba.
// Desde el 10-sep-2026:
//   - pestana oculta: no se redibuja; se hace una sola vez al volver a ella
//   - como maximo un redibujo cada _RT_MIN_MS mientras sigan llegando cambios;
//     los que llegan mientras tanto entran en ese mismo redibujo
//   - se conserva la pagina de la tabla en la que estaba el empleado
//   - el Dashboard no muestra el esqueleto de "cargando" en estos redibujos
var _RT_MIN_MS = 4000;
var _RT_MIN_DASH_MS = 60000;   // el Dashboard es un resumen: cada 1 min basta (Adam, 11-sep)
var _rtUltimoRender = 0;

function _rtMinPara(pagina){ return pagina==='dash' ? _RT_MIN_DASH_MS : _RT_MIN_MS; }

// Animacion de Chart.js: apagada durante los redibujos por tiempo real del
// Dashboard (7 graficos animando a la vez cada pocos segundos, a mediodia, era
// lo que lo ponia lento). Se restaura al terminar.
var _chartAnimOriginal;
function _chartsAnimacion(encender){
  if(typeof Chart==='undefined' || !Chart || !Chart.defaults) return;
  if(_chartAnimOriginal===undefined) _chartAnimOriginal = Chart.defaults.animation;
  Chart.defaults.animation = encender ? _chartAnimOriginal : false;
}

// ── Diagnostico de tiempos ──────────────────────────────────────────────
// Anota cuanto tarda cada redibujo, cada foto del tiempo real y cada grafico
// (ultimas 300). perfResumen() en la consola lo resume. Lo que pase de
// _PERF_LENTO_MS se manda al registro de actividad (maximo 5 por sesion) para
// poder ver desde afuera QUE fue lo lento y a que hora, en vez de adivinar.
var _perf = [];
var _perfLentosEnviados = 0;
var _PERF_MAX = 300, _PERF_LENTO_MS = 1500, _PERF_LENTOS_MAX = 5;
function _perfAnotar(tipo, det, ms){
  if(!_perf) return;   // por si algo lo llama antes de que cargue este bloque
  _perf.push({ t: Date.now(), tipo: tipo, det: det || '', ms: ms });
  if(_perf.length > _PERF_MAX) _perf.splice(0, _perf.length - _PERF_MAX);
  if(ms >= _PERF_LENTO_MS && _perfLentosEnviados < _PERF_LENTOS_MAX && typeof logActividad==='function'){
    _perfLentosEnviados++;
    try{ logActividad('lento', 'diagnostico', tipo + ' ' + (det || ''), Math.round(ms) + ' ms'); }catch(e){}
  }
}
function perfResumen(){
  var por = {};
  _perf.forEach(function(x){
    var r = por[x.tipo] || (por[x.tipo] = { n:0, total:0, max:0, peor:'' });
    r.n++; r.total += x.ms; if(x.ms > r.max){ r.max = x.ms; r.peor = x.det; }
  });
  Object.keys(por).forEach(function(k){ por[k].promedio = Math.round(por[k].total / por[k].n); });
  try{ console.table(por); }catch(e){ console.log(por); }
  return por;
}
if(typeof window!=='undefined'){ window._perf = _perf; window.perfResumen = perfResumen; }

// Decide que hacer cuando llegan datos nuevos. Pura, para poder probarla.
// Devuelve {accion:'render'|'pendiente'|'esperar', espera:ms}
function _rtDecidir(ahora, ultimo, oculta, modal, minMs){
  if(oculta || modal) return { accion:'pendiente', espera:0 };
  var min = minMs || _RT_MIN_MS;
  var pasado = ahora - (ultimo || 0);
  if(pasado >= min) return { accion:'render', espera:0 };
  return { accion:'esperar', espera:min - pasado };
}

// Redibuja la pagina actual sin sacar al empleado de donde estaba
function _rtRedibujar(){
  if(!S || !S.currentUser || !S.page || typeof nav!=='function') return;
  _rtRenderPending = false;
  _rtUltimoRender = Date.now();
  var focus = _captureFocus();
  window._pgKeep = true;           // nav() lo consume: conserva la paginacion
  window._rtRenderizando = true;   // nav() no muestra el esqueleto
  var _t0 = Date.now();
  try { nav(S.page); }
  finally {
    _perfAnotar('redibujo-rt', S.page, Date.now() - _t0);
    window._rtRenderizando = false;
    window._pgKeep = false;        // por si nav() salio antes de consumirlo (sin acceso)
  }
  _restoreFocus(focus);
}

function scheduleRealtimeRender(){
  if(!S || !S.currentUser) return;
  _rtRenderPending = true;
  if(_rtTimer) return;   // ya viene un redibujo en camino: este cambio entra en ese
  var modal = (typeof _isModalOpen==='function') && _isModalOpen();
  var d = _rtDecidir(Date.now(), _rtUltimoRender, !!document.hidden, modal, _rtMinPara(S.page));
  if(d.accion === 'pendiente') return;   // se hace al volver a la pestana o al cerrar el modal
  _rtTimer = setTimeout(function(){
    _rtTimer = null;
    if(!_rtRenderPending) return;
    try{ if(typeof updateBadge==='function') updateBadge(); }catch(e){}
    var modalAhora = (typeof _isModalOpen==='function') && _isModalOpen();
    if(document.hidden || modalAhora) return;   // queda pendiente
    _rtRedibujar();
  }, Math.max(350, d.espera));
}

function flushRealtimeRender(){
  if(!_rtRenderPending || !S || !S.currentUser || !S.page || typeof nav!=='function') return;
  if(document.hidden) return;
  if(_rtTimer){ clearTimeout(_rtTimer); _rtTimer = null; }
  try{ if(typeof updateBadge==='function') updateBadge(); }catch(e){}
  _rtRedibujar();
}

// Al volver a la pestana, se aplica lo que llego mientras estaba oculta
if(typeof document!=='undefined' && document.addEventListener){
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) flushRealtimeRender();
  });
}
// ── Foto incremental: desempacar solo lo que cambio ────────────────────
// Cada foto de Firestore trae la coleccion COMPLETA; antes se desempacaban
// (d.data()) los ~2.500 pagos o ~540 creditos enteros cada vez que cualquier
// empleado guardaba un solo documento. Ahora se desempaca solo lo que cambio
// (snap.docChanges) y los demas objetos se reusan. El array resultante sigue
// el orden de snap.docs, como siempre, y es un array NUEVO en cada foto (los
// caches que miran la identidad, como el indice de pagos, se rearman).
var _rtObjetos = {};                 // key -> Map(docId -> objeto desempacado)
var _rtUltimaFoto = { cambios: 0, total: 0 };
function _rtObjetosReset(){ _rtObjetos = {}; }
function _rtDesempacar(spec, d){
  var o = Object.assign({ id: d.id }, d.data());
  return (typeof spec.map === 'function') ? spec.map(o) : o;
}
function _rtAplicarFoto(spec, snap){
  var cache = _rtObjetos[spec.key];
  var docs = snap.docs || [];
  var cambios = (cache && typeof snap.docChanges === 'function') ? snap.docChanges() : null;
  if(!cache || !cambios){
    // Primera foto de esta coleccion (o sin docChanges): se desempaca todo
    cache = _rtObjetos[spec.key] = new Map();
    for(var i = 0; i < docs.length; i++) cache.set(docs[i].id, _rtDesempacar(spec, docs[i]));
    _rtUltimaFoto = { cambios: docs.length, total: docs.length };
  } else {
    for(var j = 0; j < cambios.length; j++){
      var ch = cambios[j];
      if(ch.type === 'removed') cache.delete(ch.doc.id);
      else cache.set(ch.doc.id, _rtDesempacar(spec, ch.doc));
    }
    _rtUltimaFoto = { cambios: cambios.length, total: docs.length };
  }
  var arr = new Array(docs.length);
  for(var k = 0; k < docs.length; k++){
    var d = docs[k];
    var o = cache.get(d.id);
    if(!o){ o = _rtDesempacar(spec, d); cache.set(d.id, o); }   // no deberia pasar; por si acaso
    arr[k] = o;
  }
  return arr;
}

// ── Primera bajada (arranque) ───────────────────────────────────────────
// startRealtime avisa aqui cuando cada coleccion entrega su primera foto.
// DB.load({viaRealtime:true}) espera esa señal en lugar de volver a pedir las
// mismas colecciones con .get(): antes cada apertura bajaba TODO dos veces
// (los .get() de DB.load y, encima, la primera foto de cada onSnapshot).
var _rtPrimeras = {};
var _rtFallidas = {};
var _rtBootTotal = 0;
var _rtBootResolver = null;
var _rtBootPromesa = null;

function _rtBootPreparar(total){
  _rtPrimeras = {};
  _rtFallidas = {};
  _rtBootTotal = total;
  _rtBootPromesa = new Promise(function(res){ _rtBootResolver = res; });
  return _rtBootPromesa;
}

function _rtMarcarPrimera(col, fallo){
  if(_rtPrimeras[col]) return;
  _rtPrimeras[col] = true;
  if(fallo) _rtFallidas[col] = true;
  if(_rtBootResolver && _rtBootTotal > 0 && Object.keys(_rtPrimeras).length >= _rtBootTotal){
    var r = _rtBootResolver; _rtBootResolver = null;
    // Si alguna coleccion fallo, el arranque NO se da por completo: DB.load
    // cae a la carga clasica y el app no queda a medias sin darse cuenta.
    r({ completo: Object.keys(_rtFallidas).length === 0 });
  }
}

// Promesa del arranque; con maxMs responde {completo:false} si se pasa el plazo
function realtimeBootListo(maxMs){
  if(!_rtBootPromesa) return Promise.resolve({ completo:false });
  if(!maxMs) return _rtBootPromesa;
  var p = _rtBootPromesa;
  return new Promise(function(res){
    var t = setTimeout(function(){ res({ completo:false }); }, maxMs);
    p.then(function(v){ clearTimeout(t); res(v); });
  });
}
// ── fin redibujo en tiempo real ─────────────────────────────────────────

function _aplicarConcesionarioActivoRealtime(){
  try{
    // El Administrador siempre trabaja con "Todos" por defecto: no forzar sede en tiempo real.
    if(typeof isAdminUser==='function' && isAdminUser()) return;
    var conc = S.concesionarios || [];
    var savedConc = localStorage.getItem('concesionarioActivo');
    // El usuario eligió explícitamente "todas mis sedes": respetarlo.
    var eligioTodas = (typeof _concEligioTodas === 'function') && _concEligioTodas();
    if(eligioTodas) S.concesionarioActivo = null;
    else if(savedConc && conc.find(function(c){return c.id === savedConc;})) S.concesionarioActivo = savedConc;
    if(S.currentUser && !eligioTodas){
      var asignados = S.currentUser.concesionarios || [];
      if(asignados.length === 1){
        S.concesionarioActivo = asignados[0];
        localStorage.setItem('concesionarioActivo', asignados[0]);
      } else if(asignados.length > 1 && (!S.concesionarioActivo || asignados.indexOf(S.concesionarioActivo) === -1)){
        S.concesionarioActivo = asignados[0];
        localStorage.setItem('concesionarioActivo', asignados[0]);
      }
    }
  }catch(e){}
}

function startRealtime(){
  if(!db || !S || !S.currentUser || _rtStarted) return;
  stopRealtime();
  _rtStarted = true;
  var especs = [
    {col:'motos', key:'motos', map:mapMoto},
    {col:'clientes', key:'clientes'},
    {col:'creditos', key:'creds', map:mapCred},
    {col:'pagos', key:'pagos', map:mapPago},
    {col:'egresos', key:'egresos'},
    {col:'movimientos', key:'movimientos'},
    {col:'cuentasPendientes', key:'cuentasPendientes'},
    {col:'facturas', key:'facturas'},
    {col:'concesionarios', key:'concesionarios'},
    {col:'tareas', key:'tareas'},
    {col:'recursos', key:'recursos'}
  ];
  _rtBootPreparar(especs.length);
  especs.forEach(function(spec){
    try{
      var unsub = db.collection(spec.col).onSnapshot(function(snap){
        var _t0 = Date.now();
        var arr = _rtAplicarFoto(spec, snap);   // desempaca solo lo que cambio
        // Motos: la foto del servidor manda, sin mezclar con la cache local
        // (asi fue siempre desde que existe el tiempo real).
        S[spec.key] = arr;
        if(spec.key==='motos') saveMotosCache(S.motos);
        if(spec.key==='concesionarios') _aplicarConcesionarioActivoRealtime();
        _rtMarcarPrimera(spec.col);
        _perfAnotar('datos', spec.col + ' ' + arr.length + ' (' + _rtUltimaFoto.cambios + ' cambios)', Date.now() - _t0);
        scheduleRealtimeRender();
      }, function(err){
        console.warn('Realtime '+spec.col+':', err && (err.message || err));
        _rtMarcarPrimera(spec.col, true);   // no dejar el arranque colgado
      });
      _rtUnsubs.push(unsub);
    }catch(e){
      console.warn('Realtime init '+spec.col+':', e.message);
      _rtMarcarPrimera(spec.col, true);
    }
  });
}

// Parsea una fecha 'YYYY-MM-DD' como hora LOCAL (mediodía) para evitar el corrimiento
// de un día por zona horaria: new Date('2026-06-04') se interpreta como UTC y en VE (UTC-4)
// retrocede al día anterior. Con mediodía local nunca cambia el día.
function parseFechaLocal(v){
  if(!v) return new Date();
  if(v instanceof Date) return v;
  var s = String(v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T12:00:00');
  return new Date(s);
}
function fechaLocalISO(value){
  var d = value ? parseFechaLocal(value) : new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function hoyLocalISO(){ return fechaLocalISO(); }
window.parseFechaLocal = parseFechaLocal;

// Cache local específica para motos — evita perder unidades nuevas entre sesiones
var MOTOS_CACHE_KEY='pagasi_motos_cache_v1';
function loadMotosCache(){
  try{
    var raw=localStorage.getItem(MOTOS_CACHE_KEY);
    var arr=raw?JSON.parse(raw):[];
    return Array.isArray(arr)?arr:[];
  }catch(e){ return []; }
}
function saveMotosCache(arr){
  try{ localStorage.setItem(MOTOS_CACHE_KEY, JSON.stringify(Array.isArray(arr)?arr:[])); }catch(e){}
}
function upsertMotoCache(moto){
  try{
    var arr=loadMotosCache();
    var i=arr.findIndex(function(x){ return String(x.id)===String(moto.id); });
    if(i>=0) arr[i]=clean(moto); else arr.push(clean(moto));
    saveMotosCache(arr);
  }catch(e){}
}
function delMotoCache(id){
  try{
    var arr=loadMotosCache().filter(function(x){ return String(x.id)!==String(id); });
    saveMotosCache(arr);
  }catch(e){}
}
// Estrategia de merge:
// - Union de motos remotas y locales.
// - En caso de conflicto de id, gana la versión local (puede tener cambios aún no subidos a Firebase).
// - Si el caché local quedó "sucio" (motos borradas de Firebase que reaparecen), el usuario puede
// usar el botón "⟳ Resincronizar" del módulo de motos para limpiar el caché local.
function mergeMotosPreferLocal(remote, local){
  var map={};
  (Array.isArray(remote)?remote:[]).forEach(function(x){ if(x&&x.id!=null) map[String(x.id)]=x; });
  (Array.isArray(local)?local:[]).forEach(function(x){ if(x&&x.id!=null) map[String(x.id)]=x; });
  return Object.keys(map).map(function(k){ return map[k]; });
}

// ── DB — persistencia con Firestore ──
// Cola offline: guarda operaciones pendientes cuando no hay conexión
var _dbQueue = [];
var _dbOnline = true;
window.addEventListener('online', function(){ _dbOnline=true; _flushDbQueue(); });
window.addEventListener('offline', function(){ _dbOnline=false; });

function _dbSilent(fn){
  // Ejecuta fn() y avisa errores reales sin romper los flujos existentes.
  if(typeof _pagosIdxInvalidar==='function') _pagosIdxInvalidar();   // toda escritura rearma el indice de pagos
  try {
    var p = fn();
    if(p && p.then) return p.then(function(){ return true; }).catch(function(e){
      var msg = e.message||'';
      if(msg.includes('transport') || msg.includes('WebChannel') || msg.includes('network') || e.code==='unavailable'){
        console.warn('DB write pending/offline:', msg);
        if(typeof toast==='function') toast('Sin conexión estable: Firebase intentará sincronizar el cambio.','info');
        return false;
      }
      console.warn('DB write error:', msg);
      if(typeof toast==='function') toast('No se pudo guardar en Firebase: '+msg,'error');
      return false;
    });
    return Promise.resolve(true);
  } catch(e){
    console.warn('DB error:', e.message);
    if(typeof toast==='function') toast('No se pudo guardar en Firebase: '+e.message,'error');
    return Promise.resolve(false);
  }
}

function _flushDbQueue(){
  var q=_dbQueue.slice(); _dbQueue=[];
  q.forEach(function(fn){ _dbSilent(fn); });
}

var DB = {
  load: function(opts){
    opts = opts || {};
    var motosCacheLocal = loadMotosCache();
    if(!db){
      if(motosCacheLocal.length) S.motos = mergeMotosPreferLocal(S.motos, motosCacheLocal);
      return Promise.resolve();
    }
    // Arranque por tiempo real: las colecciones grandes NO se piden aqui;
    // la primera foto de cada suscripcion de startRealtime ES la carga.
    // La carga clasica (sin opts) sigue igual para respaldos y recargas.
    var viaRT = !!opts.viaRealtime && typeof realtimeBootListo === 'function';
    var NADA = Promise.resolve(null);
    showLoader('Cargando datos...','Conectando con Firebase');
    return Promise.all([
      viaRT ? NADA : db.collection('motos').get(),
      viaRT ? NADA : db.collection('clientes').get(),
      viaRT ? NADA : db.collection('creditos').get(),
      viaRT ? NADA : db.collection('pagos').get(),
      viaRT ? NADA : db.collection('egresos').get(),
      Promise.resolve({docs:[]}),
      viaRT ? NADA : db.collection('movimientos').get(),
      viaRT ? NADA : db.collection('cuentasPendientes').get(),
      db.collection('config').doc('plan').get(),
      db.collection('config').doc('catalogo').get(),
      db.collection('config').doc('planes').get(),
      viaRT ? NADA : db.collection('facturas').get(),
      viaRT ? NADA : db.collection('concesionarios').get(),
      db.collection('config').doc('inventarioOficina').get(),
      db.collection('gps').get(),
      viaRT ? realtimeBootListo(45000) : NADA,
    ]).then(function(snaps){
      // Si la primera bajada por tiempo real no llego completa (una coleccion
      // fallo o pasaron 45 s), se cae a la carga clasica de siempre.
      if(viaRT && !(snaps[15] && snaps[15].completo)){
        console.warn('Carga por tiempo real incompleta; usando la carga clasica.');
        return DB.load();
      }
      function read(snap, withId){return snap.docs.map(function(d){return withId ? Object.assign({id:d.id}, d.data()) : d.data();});}
      // Con viaRealtime estos vienen en null: ya estan en S por el tiempo real
      var m=snaps[0]?read(snaps[0], true):null,cl=snaps[1]?read(snaps[1], true):null,cr=snaps[2]?read(snaps[2]):null,p=snaps[3]?read(snaps[3]):null,e=snaps[4]?read(snaps[4]):null,_skip=snaps[5],mv=snaps[6]?read(snaps[6]):null,pnd=snaps[7]?read(snaps[7]):null;
      var planDoc = snaps[8], catalogoDoc = snaps[9], planesDoc = snaps[10];
      var fac = snaps[11] ? read(snaps[11]) : null;
      var conc = snaps[12] ? read(snaps[12], true) : null;
      if(planDoc && planDoc.exists){
        var pd = planDoc.data() || {};
        if(Object.prototype.hasOwnProperty.call(pd,'factor')) PLAN.factor = pd.factor;
        if(Object.prototype.hasOwnProperty.call(pd,'inicial')) PLAN.inicial = pd.inicial;
        if(Object.prototype.hasOwnProperty.call(pd,'tasaMensual')) PLAN.tasaMensual = pd.tasaMensual;
        if(Object.prototype.hasOwnProperty.call(pd,'plazo')) PLAN.plazo = pd.plazo;
        if(Object.prototype.hasOwnProperty.call(pd,'apy')) PLAN.apy = pd.apy;
        var graciaCfg = Object.prototype.hasOwnProperty.call(pd,'diasGracia') ? pd.diasGracia : pd.gracia;
        if(typeof graciaCfg !== 'undefined' && graciaCfg !== null) PLAN.diasGracia = graciaCfg;
        var moraCfg = Object.prototype.hasOwnProperty.call(pd,'moraPct') ? pd.moraPct : pd.mora_pct;
        if(typeof moraCfg !== 'undefined' && moraCfg !== null) PLAN.moraPct = moraCfg;
      }
      if(catalogoDoc && catalogoDoc.exists){
        var catData = catalogoDoc.data() || {};
        // Solo usar el catálogo de Firestore si está en la versión actual (2).
        // Si es viejo/sin versión, mantener el catálogo completo hardcoded y re-sembrar Firestore una vez.
        if(Array.isArray(catData.items) && catData.items.length && (catData.version||0) >= 3){
          CATALOGO.splice(0, CATALOGO.length);
          catData.items.forEach(function(item){ CATALOGO.push(item); });
        } else {
          db.collection('config').doc('catalogo').set({items: CATALOGO, version: 3}).catch(function(){});
          try{ localStorage.setItem('pagasi_catalogo_config', JSON.stringify(CATALOGO)); localStorage.setItem('pagasi_catalogo_ver','3'); }catch(e){}
        }
      } else {
        db.collection('config').doc('catalogo').set({items: CATALOGO, version: 3}).catch(function(){});
        try{ localStorage.setItem('pagasi_catalogo_config', JSON.stringify(CATALOGO)); localStorage.setItem('pagasi_catalogo_ver','3'); }catch(e){}
      }
      if(planesDoc && planesDoc.exists){
        var extraData = planesDoc.data() || {};
        window._planesExtra = Array.isArray(extraData.items) ? extraData.items : [];
      } else {
        window._planesExtra = window._planesExtra || [];
      }
      if(m){
        S.motos = mergeMotosPreferLocal(m.map(mapMoto), motosCacheLocal);
        saveMotosCache(S.motos);
      }

      // ══════ SANEAR score_indexa corrupto ══════
      // (la logica vive en _sanearScoreCliente)
      var _scoreCorruptos = 0;
      if(cl){ cl.forEach(function(cli){ if(_sanearScoreCliente(cli)) _scoreCorruptos++; }); }
      if(_scoreCorruptos > 0){
        console.log('[SCORE] Se sanearon '+_scoreCorruptos+' scores corruptos de Firestore');
      }

      if(cl) S.clientes = cl;

      // Persistir en background los scores saneados — sobrescribe el objeto corrupto en Firestore
      setTimeout(function(){
        if(!db) return;
        var fixed = 0;
        // Con la carga por tiempo real (cl vacio) S.clientes queda crudo, como
        // siempre quedo tras la primera foto: el saneado se hace sobre COPIAS,
        // solo para encontrar y reparar en la base los scores corruptos.
        (cl || (S.clientes || []).map(function(x){ var y = Object.assign({}, x); _sanearScoreCliente(y); return y; })).forEach(function(cli){
          if(cli._scoreFueCorrupto && cli.id){
            delete cli._scoreFueCorrupto;
            try {
              db.collection('clientes').doc(String(cli.id)).update({
                score_indexa: cli.score_indexa || 0,
                score_saneado: new Date().toISOString()
              }).then(function(){ fixed++; }).catch(function(){});
            } catch(e){}
          }
        });
        if(fixed>0) console.log('[SCORE] Persistidos '+fixed+' scores saneados en Firestore');
      }, 1500);
      if(cr) S.creds = cr.map(mapCred);
      if(p) S.pagos = p.map(mapPago);
      if(e) S.egresos = e;
      if(mv) S.movimientos = mv;
      if(pnd) S.cuentasPendientes = pnd;
      if(fac) S.facturas = fac;
      if(conc) S.concesionarios = conc;
      S.gps = snaps[14] ? read(snaps[14], true) : [];
      try {
        var _invDoc = snaps[13];
        S.inventarioOficina = (_invDoc && _invDoc.exists && Array.isArray((_invDoc.data()||{}).items))
          ? _invDoc.data().items
          : (function(){ try{ return JSON.parse(localStorage.getItem('pagasi_inv_oficina')||'[]'); }catch(e){ return []; } })();
      } catch(e){ S.inventarioOficina = S.inventarioOficina || []; }
      // ── Admin total (sin sedes asignadas) → SIEMPRE arranca con "Todos" ──
      // Solo restauramos el concesionario guardado si el usuario tiene sedes específicas
      // asignadas (no es admin total). Esto evita que el admin se quede pegado en una sede.
      try{
        var esAdminPuro = (typeof isAdminUser==='function' && isAdminUser()) || !S.currentUser || !(S.currentUser.concesionarios||[]).length;
        if(esAdminPuro){
          S.concesionarioActivo = null;
          try{ localStorage.removeItem('concesionarioActivo'); }catch(e){}
        } else {
          var savedConc = localStorage.getItem('concesionarioActivo');
          if(savedConc && (conc || S.concesionarios || []).find(function(c){return c.id === savedConc;})){
            S.concesionarioActivo = savedConc;
          }
        }
      }catch(e){}
      // Si el usuario tiene UNA sola sede asignada, forzarla como activa (no permitir "Todos")
      // EXCEPCIÓN: el Administrador siempre puede quedarse en "Todos".
      try{
        var _eligioTodas = (typeof _concEligioTodas === 'function') && _concEligioTodas();
        if(_eligioTodas){
          // Elección explícita del usuario: ver todas sus sedes juntas.
          S.concesionarioActivo = null;
        } else if(S.currentUser && !(typeof isAdminUser==='function' && isAdminUser())){
          var asignados = S.currentUser.concesionarios || [];
          if(asignados.length === 1){
            S.concesionarioActivo = asignados[0];
            try{ localStorage.setItem('concesionarioActivo', asignados[0]); }catch(e){}
          } else if(asignados.length > 1){
            // Si tiene varias y el savedConc no está en su lista, usar la primera
            if(!S.concesionarioActivo || asignados.indexOf(S.concesionarioActivo) === -1){
              S.concesionarioActivo = asignados[0];
              try{ localStorage.setItem('concesionarioActivo', asignados[0]); }catch(e){}
            }
          }
        }
      }catch(e){}
      calcularMoraAuto();
      cargarCuentasBanc();
      cargarEmpresa();
      hideLoader();
      // Re-render charts now that data is available
      setTimeout(function(){
        if(typeof renderDashChart==='function') renderDashChart();
        if(typeof renderCredChart==='function') renderCredChart();
        if(typeof renderMoraChart==='function') renderMoraChart();
        if(typeof renderFinIngChart==='function') renderFinIngChart();
        // Re-render egresos chart if on dashboard
        if(typeof renderDashEgrChart==='function') renderDashEgrChart();
        if(typeof renderDashCuotasChart==='function') renderDashCuotasChart();
        if(typeof renderDashCobrospChart==='function') renderDashCobrospChart();
      }, 300);
      // Ventana emergente de "Alertas de Mora" al abrir la app: desactivada a pedido del usuario.
      // La info de mora está siempre disponible en Pagos → Atrasados y en el badge del menú.
    }).catch(function(e){
      hideLoader();
      // Si es error de red, trabajar con datos locales sin avisar con error
      if(e.code==='unavailable'||( e.message&&e.message.includes('network'))){
        if(motosCacheLocal.length) S.motos = mergeMotosPreferLocal(S.motos, motosCacheLocal);
        toast('Sin conexión — modo offline activo','info');
      } else {
        if(motosCacheLocal.length) S.motos = mergeMotosPreferLocal(S.motos, motosCacheLocal);
        toast('Error al cargar datos: '+e.message,'error');
      }
    });
  },
  saveMoto: function(o){ upsertMotoCache(o); if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('motos').doc(String(o.id)).set(clean(o)); }); },
  delMoto: function(id){ delMotoCache(id); if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('motos').doc(String(id)).delete(); }); },
  saveCliente: function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('clientes').doc(String(o.id)).set(clean(o), {merge:true}); }); },
  delCliente: function(id){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('clientes').doc(String(id)).delete(); }); },
  saveCred: function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('creditos').doc(o.id).set(clean(o)); }); },
  // Alta de un credito NUEVO. A diferencia de saveCred (que usa set() y pisa en
  // silencio lo que hubiera), esta se niega a escribir si el ID ya existe.
  // Es la red que impide que una venta borre a otra: rechaza en vez de destruir.
  // Rechaza con err.code === 'ID_OCUPADO' para que quien llama pida otro numero.
  crearCred: function(o){
    if(!db) return Promise.resolve(false);
    var ref = db.collection('creditos').doc(o.id);
    return db.runTransaction(function(tx){
      return tx.get(ref).then(function(d){
        if(d.exists){ var e = new Error('El credito '+o.id+' ya existe'); e.code = 'ID_OCUPADO'; throw e; }
        tx.set(ref, clean(o));
      });
    });
  },
  crearMoto: function(o){
    if(!db) return Promise.resolve(false);
    var ref = db.collection('motos').doc(String(o.id));
    return db.runTransaction(function(tx){
      return tx.get(ref).then(function(d){
        if(d.exists){ var e = new Error('La moto '+o.id+' ya existe'); e.code = 'ID_OCUPADO'; throw e; }
        tx.set(ref, clean(o));
      });
    }).then(function(r){ upsertMotoCache(o); return r; });
  },
  updateCred: function(id,u){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('creditos').doc(id).update(u); }); },
  savePago: function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('pagos').doc(o.id).set(clean(o)); }); },
  saveEgreso: function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('egresos').doc(String(o.id)).set(clean(o)); }); },
  delEgreso: function(id){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('egresos').doc(String(id)).delete(); }); },
  saveFactura: function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('facturas').doc(String(o.id)).set(clean(o)); }); },
  saveConcesionario: function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('concesionarios').doc(String(o.id)).set(clean(o)); }); },
  saveGps: function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('gps').doc(String(o.id)).set(clean(o)); }); },
  delGps: function(id){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('gps').doc(String(id)).delete(); }); },
  delConcesionario: function(id){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('concesionarios').doc(String(id)).delete(); }); },
};

// Usuarios e invitaciones en Firestore
DB.getUsuarios = function(){ if(!db) return Promise.resolve([]); return db.collection('usuarios').get().then(function(s){return s.docs.map(function(d){return Object.assign({uid:d.id},d.data());});}); };
DB.saveUsuario = function(uid,data){ if(!db) return Promise.resolve(); return db.collection('usuarios').doc(uid).set(data,{merge:true}); };
DB.updateUsuario = function(uid,data){ if(!db) return Promise.resolve(false); return _dbSilent(function(){ return db.collection('usuarios').doc(uid).update(data); }); };
DB.deleteUsuario = function(uid){ if(!db) return Promise.resolve(false); return _dbSilent(function(){ return db.collection('usuarios').doc(uid).delete(); }); };
DB.saveInvitacion = function(token,data){ if(!db) return; return db.collection('invitaciones').doc(token).set(data); };
DB.getInvitacion = function(token){ if(!db) return Promise.resolve(null); return db.collection('invitaciones').doc(token).get(); };
DB.usarInvitacion = function(token,uid){ if(!db) return Promise.resolve(false); return _dbSilent(function(){ return db.collection('invitaciones').doc(token).update({usado:true,uid:uid,fechaUso:new Date().toISOString()}); }); };
DB.saveCuenta = function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('cuentas').doc(String(o.id)).set(clean(o)); }); };
DB.delCuenta = function(id){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('cuentas').doc(String(id)).delete(); }); };
DB.updateCuenta = function(id,u){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('cuentas').doc(String(id)).update(u); }); };
DB.saveMovimiento = function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('movimientos').doc(o.id).set(clean(o)); }); };
DB.delMovimiento = function(id){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('movimientos').doc(id).delete(); }); };
DB.saveTarea = function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('tareas').doc(String(o.id)).set(clean(o),{merge:true}); }); };
DB.delTarea = function(id){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('tareas').doc(String(id)).delete(); }); };
DB.getTareas = function(){ if(!db) return Promise.resolve([]); return db.collection('tareas').get().then(function(s){return s.docs.map(function(d){return Object.assign({id:d.id},d.data());});}); };
DB.saveRecurso = function(o){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('recursos').doc(String(o.id)).set(clean(o),{merge:true}); }); };
DB.delRecurso = function(id){ if(!db)return Promise.resolve(false); return _dbSilent(function(){ return db.collection('recursos').doc(String(id)).delete(); }); };
DB.getRecursos = function(){ if(!db) return Promise.resolve([]); return db.collection('recursos').get().then(function(s){return s.docs.map(function(d){return Object.assign({id:d.id},d.data());});}); };
DB.saveInventarioOficina = function(){ if(!db) return Promise.resolve(false); return _dbSilent(function(){ return db.collection('config').doc('inventarioOficina').set({items:(S.inventarioOficina||[]), actualizado:new Date().toISOString()}); }); };
// Gestiones de cobranza guardadas en el propio crédito (creditos/{id}.gestiones)
// — evita una colección aparte bloqueada por las reglas; cargan junto con S.creds.
DB.addGestion = function(credId, nota){
  var c = (S.creds||[]).find(function(x){ return String(x.id)===String(credId); });
  if(c){ if(!Array.isArray(c.gestiones)) c.gestiones=[]; c.gestiones.push(nota); }
  if(!db) return Promise.resolve(false);
  return _dbSilent(function(){
    try { return db.collection('creditos').doc(String(credId)).update({ gestiones: firebase.firestore.FieldValue.arrayUnion(nota) }); }
    catch(e){ return db.collection('creditos').doc(String(credId)).update({ gestiones: (c?c.gestiones:[nota]) }); }
  });
};
DB.delGestion = function(credId, gestionId){
  var c = (S.creds||[]).find(function(x){ return String(x.id)===String(credId); });
  if(c && Array.isArray(c.gestiones)){ c.gestiones = c.gestiones.filter(function(g){ return g && g.id!==gestionId; }); }
  if(!db) return Promise.resolve(false);
  return _dbSilent(function(){ return db.collection('creditos').doc(String(credId)).update({ gestiones: (c?c.gestiones:[]) }); });
};

// ══════════════════════════════════════════
// AUDIT LOG / BITÁCORA DE ACTIVIDADES
// ══════════════════════════════════════════
// Colección 'logs' en Firestore. Cada doc: {id, timestamp, uid, userName, userEmail, action, modulo, target, detalle, ip?}
DB.saveLog = function(o){ if(!db) return Promise.resolve(false); return _dbSilent(function(){ return db.collection('logs').doc(String(o.id)).set(clean(o)); }); };
DB.getLogs = function(limite){
  if(!db) return Promise.resolve([]);
  var q = db.collection('logs').orderBy('timestamp','desc');
  if(limite) q = q.limit(limite);
  return q.get().then(function(s){ return s.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); }); }).catch(function(e){ console.warn('getLogs:', e); return []; });
};

// Helper global: registra una actividad. Fire-and-forget — no bloquea la UI.
// Acciones recomendadas: login, logout, cliente_creado, cliente_editado, cliente_eliminado,
//   credito_creado, credito_editado, credito_eliminado, pago_registrado, pago_eliminado,
//   egreso_registrado, egreso_eliminado, usuario_creado, usuario_editado, usuario_eliminado,
//   perfil_editado, config_actualizada, sede_creada, contrato_firmado, notif_enviada, tarea_creada.
function logActividad(action, modulo, target, detalle){
  try {
    if(!db || !S || !S.currentUser) return; // no logueado, no log
    var id = 'LOG-' + Date.now() + '-' + Math.floor(Math.random()*9999);
    var doc = {
      id: id,
      timestamp: new Date().toISOString(),
      uid: S.currentUser.uid || '',
      userName: S.currentUser.nombre || S.currentUser.email || 'Desconocido',
      userEmail: S.currentUser.email || '',
      action: String(action||'desconocido'),
      modulo: String(modulo||'sistema'),
      target: target ? String(target) : '',
      detalle: detalle && typeof detalle === 'object' ? detalle : (detalle ? {nota:String(detalle)} : null)
    };
    DB.saveLog(doc);
  } catch(e){ console.warn('logActividad:', e); }
}
window.logActividad = logActividad;

// ── Lista de módulos disponibles ──
var MODULOS = [
  {id:'dash', label:'Dashboard', grupo:'Principal'},
  {id:'centro', label:'Centro de trabajo', grupo:'Principal'},
  {id:'clientes', label:'Clientes', grupo:'Gestión'},
  {id:'motos', label:'Motocicletas', grupo:'Gestión'},
  {id:'creditos', label:'Créditos', grupo:'Gestión'},
  {id:'pagos', label:'Cobranza', grupo:'Gestión'},
  {id:'contratos', label:'Contratos', grupo:'Operaciones'},
  {id:'notif', label:'Notificaciones', grupo:'Operaciones'},
  {id:'calculadora', label:'Calculadora', grupo:'Operaciones'},
  {id:'reportes', label:'Finanzas', grupo:'Análisis'},
  {id:'cuentas', label:'Cuentas', grupo:'Análisis'},
  {id:'comisiones', label:'Comisiones', grupo:'Análisis'},
  {id:'gps', label:'GPS', grupo:'Operaciones'},
  {id:'concesionarios', label:'Concesionarios', grupo:'Sistema'},
  {id:'aprobaciones', label:'Aprobaciones', grupo:'Operaciones'},
  {id:'plan', label:'Plan & Precios', grupo:'Sistema'},
  {id:'config', label:'Configuración', grupo:'Sistema'},
  {id:'users', label:'Usuarios', grupo:'Sistema'},
];

// (S.currentUser se inicializa después de declarar S)

// ══════════════════════════════════════════
// CATÁLOGO OFICIAL PAGASI — PLAN GLOBAL CONFIGURABLE
// ══════════════════════════════════════════
const PLAN = {plazo:12, factor:2.102343121528029, inicial:0.45, tasaMensual:14.11, apy:413.34, diasGracia:5, moraPct:2.5};

// ══════════════════════════════════════════
// SCORE CFG — Política de riesgo configurable
// ══════════════════════════════════════════
const SCORE_CFG_DEFAULT = {
  // Pesos de los factores (deben sumar 100)
  pesos: { f1:30, f2:30, f3:20, f4:15, f5:5 },
  // Umbrales de aprobación
  umbrales: {
    excelente:700, // ≥ → aprobación automática
    bueno: 600, // ≥ → aprobar
    regular: 500, // ≥ → revisar manualmente
    // < regular → rechazar
  },
  // Hard rejects: condiciones que fuerzan rechazo sin importar el resto
  hardReject: {
    ingresoMinimo: 250, // rechazar si ingreso efectivo < este valor (USD/mes)
    ratioCuotaMax: 0.35, // rechazar si cuota/ingreso > 35%
    historialMaloConDeuda:true,// rechazar si hist=malo y deuda=graves
    sinTelefono: false, // rechazar si no tiene teléfono
    sinReferencias: false, // rechazar si no tiene referencia alguna
  },
  // Ratio cuota/ingreso: políticas
  ratios: {
    ideal: 0.20, // ≤ → bonus
    aceptable: 0.30,
    alto: 0.40,
    muyAlto: 0.50,
  },
  // Ingreso base (para normalizar f2)
  ingreso: {
    minBase: 250, // ingresos por debajo de este valor reciben 0 puntos de base
    maxBase: 3000, // ingresos desde este valor reciben el máximo de base
  }
};
var SCORE_CFG = JSON.parse(JSON.stringify(SCORE_CFG_DEFAULT));
try{
  var _scLs = JSON.parse(localStorage.getItem('pagasi_config_score')||'null');
  if(_scLs && typeof _scLs==='object'){
    if(_scLs.pesos) Object.assign(SCORE_CFG.pesos, _scLs.pesos);
    if(_scLs.umbrales) Object.assign(SCORE_CFG.umbrales, _scLs.umbrales);
    if(_scLs.hardReject) Object.assign(SCORE_CFG.hardReject, _scLs.hardReject);
    if(_scLs.ratios) Object.assign(SCORE_CFG.ratios, _scLs.ratios);
    if(_scLs.ingreso) Object.assign(SCORE_CFG.ingreso, _scLs.ingreso);
  }
}catch(_e){}


try {
  var _catLs = JSON.parse(localStorage.getItem('pagasi_catalogo_config')||'null');
  var _catVer = parseInt(localStorage.getItem('pagasi_catalogo_ver')||'0',10);
  // Solo usar caché local si está en la versión actual (2); si es vieja, se ignora y queda el catálogo completo hardcoded
  if(Array.isArray(_catLs) && _catLs.length && _catVer >= 3){ CATALOGO.splice(0, CATALOGO.length); _catLs.forEach(function(item){ CATALOGO.push(item); }); }
  var _planLs = JSON.parse(localStorage.getItem('pagasi_config_plan')||'null');
  if(_planLs && typeof _planLs==='object'){
    if(Object.prototype.hasOwnProperty.call(_planLs,'factor')) PLAN.factor = _planLs.factor;
    if(Object.prototype.hasOwnProperty.call(_planLs,'inicial')) PLAN.inicial = _planLs.inicial;
    if(Object.prototype.hasOwnProperty.call(_planLs,'tasaMensual')) PLAN.tasaMensual = _planLs.tasaMensual;
    if(Object.prototype.hasOwnProperty.call(_planLs,'plazo')) PLAN.plazo = _planLs.plazo;
    if(Object.prototype.hasOwnProperty.call(_planLs,'apy')) PLAN.apy = _planLs.apy;
    var _gr = Object.prototype.hasOwnProperty.call(_planLs,'diasGracia') ? _planLs.diasGracia : _planLs.gracia;
    if(typeof _gr!=='undefined' && _gr!==null) PLAN.diasGracia = _gr;
    var _mp = Object.prototype.hasOwnProperty.call(_planLs,'moraPct') ? _planLs.moraPct : _planLs.mora_pct;
    if(typeof _mp!=='undefined' && _mp!==null) PLAN.moraPct = _mp;
  }
  window._planesExtra = JSON.parse(localStorage.getItem('pagasi_planes_extra')||'[]') || [];
} catch(_cfgErr) { window._planesExtra = window._planesExtra || []; }


// CATÁLOGO actualizado al 27/05/2026 — 41 motos en 3 sedes
// Fuente: "Actualizacion de Precios.xlsx" (EK Bello Monte, Boleita, Toro Sabana Grande)
const CATALOGO = [
  // ─── EK Bello Monte (17) ────────────────────────────────────
  {id:1,  sede:'EK Bello Monte',     modelo:'NEW HORSE 150',       precio:1320.00},
  {id:2,  sede:'EK Bello Monte',     modelo:'EK XPRESS 150',       precio:1099.00},
  {id:3,  sede:'EK Bello Monte',     modelo:'EK XPRESS II 150',    precio:1126.00},
  {id:4,  sede:'EK Bello Monte',     modelo:'EK XPRESS 200S',      precio:1360.00},
  {id:5,  sede:'EK Bello Monte',     modelo:'EK XPRESS 150 LITE',  precio:1020.00},
  {id:6,  sede:'EK Bello Monte',     modelo:'NEW OWEN II 150',     precio:1265.00},
  {id:7,  sede:'EK Bello Monte',     modelo:'OWEN 200S',           precio:1550.00},
  {id:8,  sede:'EK Bello Monte',     modelo:'RK 200',              precio:1750.00},
  {id:9,  sede:'EK Bello Monte',     modelo:'RK 250',              precio:2075.00},
  {id:10, sede:'EK Bello Monte',     modelo:'TX 250 GS',           precio:2650.00},
  {id:11, sede:'EK Bello Monte',     modelo:'MATRIX 150 LITE',     precio:1290.00},
  {id:12, sede:'EK Bello Monte',     modelo:'MATRIX 150',          precio:1550.00},
  {id:13, sede:'EK Bello Monte',     modelo:'NEW OUTLOOK 175',     precio:2450.00},
  {id:14, sede:'EK Bello Monte',     modelo:'OUTLOOK XL PALETA',   precio:4851.00},
  {id:15, sede:'EK Bello Monte',     modelo:'ATLAS 200HD',         precio:4600.00},
  {id:16, sede:'EK Bello Monte',     modelo:'OWEN 200S AMARILLO',  precio:1500.00},
  {id:17, sede:'EK Bello Monte',     modelo:'ARSEN',               precio:1950.00},
  // ─── Boleita (9) ────────────────────────────────────────────
  {id:18, sede:'Boleita',            modelo:'LECHUZA I',           precio:1700.00},
  {id:19, sede:'Boleita',            modelo:'LECHUZA II',          precio:1900.00},
  {id:20, sede:'Boleita',            modelo:'CUERVO',              precio:1149.00},
  {id:21, sede:'Boleita',            modelo:'CANARIO',             precio:1190.00},
  {id:22, sede:'Boleita',            modelo:'FÉNIX 150',           precio:1450.00},
  {id:23, sede:'Boleita',            modelo:'FÉNIX 200',           precio:1590.00},
  {id:24, sede:'Boleita',            modelo:'ÁGUILA',              precio:980.00},
  {id:25, sede:'Boleita',            modelo:'CÓNDOR',              precio:1190.00},
  {id:26, sede:'Boleita',            modelo:'TUCÁN II',            precio:1239.00},
  // ─── Toro Sabana Grande (15) ────────────────────────────────
  {id:27, sede:'Toro Sabana Grande', modelo:'JAGUAR 150',          precio:1090.00},
  {id:28, sede:'Toro Sabana Grande', modelo:'TRX150 RAYO',         precio:1050.00},
  {id:29, sede:'Toro Sabana Grande', modelo:'TRX150 PALETA',       precio:1070.00},
  {id:30, sede:'Toro Sabana Grande', modelo:'LEÓN 200',            precio:1320.00},
  {id:31, sede:'Toro Sabana Grande', modelo:'REX 150',             precio:1520.00},
  {id:32, sede:'Toro Sabana Grande', modelo:'REX 250',             precio:2090.00},
  {id:33, sede:'Toro Sabana Grande', modelo:'REX 250 MT',          precio:2100.00},
  {id:34, sede:'Toro Sabana Grande', modelo:'R3X',                 precio:2590.00},
  {id:35, sede:'Toro Sabana Grande', modelo:'MOKA',                precio:1295.00},
  {id:36, sede:'Toro Sabana Grande', modelo:'FOX',                 precio:1850.00},
  {id:37, sede:'Toro Sabana Grande', modelo:'POWER',               precio:1880.00},
  {id:38, sede:'Toro Sabana Grande', modelo:'TANK III',            precio:2500.00},
  {id:39, sede:'Toro Sabana Grande', modelo:'TANK',                precio:1920.00},
  {id:40, sede:'Toro Sabana Grande', modelo:'CAPPUCINO',           precio:1890.00},
  {id:41, sede:'Toro Sabana Grande', modelo:'TYPHOON',             precio:1690.00},
  // ─── Benmo Motos Andrés Bello (5) ───────────────────────────
  {id:42, sede:'Benmo Motos Andrés Bello', modelo:'HJ150-8',         precio:1520.00},
  {id:43, sede:'Benmo Motos Andrés Bello', modelo:'GTL 150',         precio:1230.00},
  {id:44, sede:'Benmo Motos Andrés Bello', modelo:'JB STREET 150',   precio:1150.00},
  {id:45, sede:'Benmo Motos Andrés Bello', modelo:'STREET SPORT 150',precio:1320.00},
  {id:46, sede:'Benmo Motos Andrés Bello', modelo:'HM 150 LONCIN',   precio:1110.00}
];

// Calculos financieros y helpers de planes movidos a logic/financiero.js.

const S = {
  motos: [],
  clientes: [],
  creds: [],
  pagos: [],
  egresos: [],
  cuentas: [],
  movimientos:[],
  cuentasPendientes:[],
  facturas: [],
  concesionarios: [], gps:[],
  concesionarioActivo: null, // null = "Todos" / id = trabajando en un concesionario
  page:'dash', mTab:'todas', credTab:'todos', pagosTab:'todos', saveFn:null, clienteFiltro:'',
  credSort:{col:'id',dir:'desc'}, cliSort:{col:'nombre',dir:'asc'}, pagosSort:{col:'fecha',dir:'desc'}, motosSort:{col:'modelo',dir:'asc'}, credFiltro:'',
  pagosDesde:'', pagosHasta:'',
  currentUser: null,
  tareas: []
};

const $=id=>document.getElementById(id);
// Iconos SVG para los iconos de modales (sinergia visual en todo el sistema)
const MODAL_ICONS = {
  cliente:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>','#2563EB','#E6F1FB'],
  star:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>','#F5A623','#FAEEDA'],
  pago:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>','#00B876','#E1F5EE'],
  dinero:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>','#00B876','#E1F5EE'],
  factura:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>','#2563EB','#E6F1FB'],
  imprimir:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>','#4A4870','#EEF0FA'],
  moto:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17h3l3-5h6l2 5"/><path d="M14 12l-2-4h-3"/><path d="M16 8h3"/></svg>','#2563EB','#E6F1FB'],
  banco:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/></svg>','#2563EB','#E6F1FB'],
  plan:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>','#2563EB','#E6F1FB'],
  user:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>','#2563EB','#E6F1FB'],
  conces:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>','#2563EB','#E6F1FB'],
  comision:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>','#F5A623','#FAEEDA'],
  detalle:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>','#2563EB','#E6F1FB'],
  editar:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>','#2563EB','#E6F1FB'],
  eliminar:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>','#E8335A','#FCEBEB'],
  check:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>','#00B876','#E1F5EE'],
  retiro:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>','#E8335A','#FCEBEB'],
  deposito:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>','#00B876','#E1F5EE'],
  transfer:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l5 5-5 5M21 8H9M8 21l-5-5 5-5M3 16h12"/></svg>','#2563EB','#E6F1FB'],
  mensaje:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>','#2563EB','#E6F1FB'],
  nota:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>','#F5A623','#FAEEDA'],
  score:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>','#F5A623','#FAEEDA'],
  llave:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M17 6l3 3M15 8l2 2"/></svg>','#2563EB','#E6F1FB'],
  reloj:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>','#F5A623','#FAEEDA'],
  link:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>','#2563EB','#E6F1FB'],
  rol:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>','#2563EB','#E6F1FB'],
  restaurar:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>','#00B876','#E1F5EE'],
  egreso:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>','#E8335A','#FCEBEB'],
  anular:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>','#E8335A','#FCEBEB'],
  exportar:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>','#00B876','#E1F5EE'],
  config:['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>','#2563EB','#E6F1FB']
};
function setMicon(key){
  var ic = MODAL_ICONS[key];
  var el = $('mic');
  if(!el) return;
  if(ic){
    el.innerHTML = '<svg style="width:20px;height:20px" viewBox="0 0 24 24">'+ic[0].replace('<svg viewBox="0 0 24 24" ','').replace('</svg>','')+'</svg>';
    el.innerHTML = ic[0];
    el.querySelector('svg').style.width='20px';
    el.querySelector('svg').style.height='20px';
    el.style.color = ic[1];
    el.style.background = ic[2];
    el.style.border = 'none';
  } else {
    el.textContent = key;
    el.style.color=''; el.style.background=''; el.style.border='';
  }
}
const fmt=n=>'$'+parseFloat(n).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});
window.S = S;
window.$ = $;
window.fmt = fmt;

// El numero de la moto, como se lee en pantalla y en los papeles: "#501".
// El inventario no mostraba el numero por ningun lado (22-sep-2026). La letra M NO se
// usa aqui: es la serie de los creditos de PAGASI 26, y dos cosas distintas con el
// mismo nombre confunden mas de lo que ayudan.
function motoNum(m){
  var id = (m && typeof m === 'object') ? m.id : m;
  var s = String(id == null ? '' : id).trim();
  if(!s) return '';
  return /^\d+$/.test(s) ? '#' + s : s;
}
window.motoNum = motoNum;

// Formatea una fecha ISO o timestamp como "DD/MM/YYYY HH:MM"
function fmtFechaHora(iso){
  if(!iso) return '';
  try{
    var d = parseFechaLocal(iso);
    if(isNaN(d.getTime())) return '';
    var dd = String(d.getDate()).padStart(2,'0');
    var mm = String(d.getMonth()+1).padStart(2,'0');
    var yy = d.getFullYear();
    var hh = String(d.getHours()).padStart(2,'0');
    var mn = String(d.getMinutes()).padStart(2,'0');
    return dd+'/'+mm+'/'+yy+' '+hh+':'+mn;
  }catch(e){ return ''; }
}
function fmtFecha(iso){
  if(!iso) return '';
  try{
    var d = parseFechaLocal(iso);
    if(isNaN(d.getTime())) return '';
    return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
  }catch(e){ return ''; }
}
const ini=n=>n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const sbg=s=>({activo:'b-g',mora:'b-r',recuperada:'b-a',recuperado:'b-a',disponible:'b-p',financiada:'b-p',inventario:'b-b',confirmado:'b-g',pendiente:'b-a',completado:'b-g',propia:'b-g',cancelado:'b-r'}[s]||'b-x');
const PGL={dash:'Dashboard',centro:'Centro de trabajo',clientes:'Clientes',motos:'Motocicletas',creditos:'Créditos',pagos:'Cobranza',cobranza:'Cobranza',contratos:'Contratos',gps:'GPS',notif:'Notificaciones',calculadora:'Calculadora',reportes:'Finanzas',cuentas:'Cuentas',comisiones:'Comisiones',conta:'Finanzas',plan:'Plan & Precios',config:'Configuración',scores:'Scores',users:'Usuarios',concesionarios:'Concesionarios',aprobaciones:'Aprobaciones',recursos:'Files'};

const EXTRA_PERMS={perm_delete:'Permiso para eliminar'};
function getCurrentPerms(){ return (S.currentUser&&Array.isArray(S.currentUser.permisos)) ? S.currentUser.permisos : []; }
function isAdminUser(){ return !!(S.currentUser && S.currentUser.rol==='Administrador'); }
// ══════════════════════════════════════════
// PERMISOS POR ROL — presets automáticos
// ══════════════════════════════════════════
var ROL_PERMISOS = {
  // Acceso total: dueño del sistema
  Administrador: ['dash','centro','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','plan','config','users','perm_delete'],
  // Supervisa operaciones, ve reportes, NO toca config ni usuarios
  Gerente: ['dash','centro','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas'],
  // Cobra en la oficina: ve todos los clientes, registra pagos, ve cobranza y deudores
  Cobrador: ['dash','centro','clientes','cobranza','pagos','creditos'],
  // Capta clientes, hace solicitudes, NO toca pagos ni cobranza
  Vendedor: ['dash','centro','clientes','creditos','motos'],
  // Solo finanzas: reportes, pagos, cuentas y contabilidad
  Contador: ['dash','centro','pagos','reportes','cuentas'],
  // Empleado general: hace casi todo excepto config/users
  Empleado: ['dash','centro','clientes','motos','creditos','pagos','cobranza','contratos','notif'],
  // Vendedor Concesionario: solo calculadora (motos), clientes y solicitudes (creditos)
  // Los créditos que crea quedan en estado 'pendiente_revision' hasta que admin apruebe
  'Vendedor Concesionario': ['motos','clientes','creditos'],
};

// Roles disponibles para invitar (el nombre visible y su descripción)
var ROLES_INFO = {
  Administrador: { desc:'Control total. Puede gestionar usuarios, configuración y todos los módulos.', color:'#2563EB', icon:'ADM' },
  Gerente: { desc:'Supervisa operaciones y ve reportes. No puede cambiar configuración del sistema.', color:'#e8980a', icon:'GER' },
  Cobrador: { desc:'Cobra y registra pagos. Ve todos los clientes y la cartera de cobranza.', color:'#06b06a', icon:'COB' },
  Vendedor: { desc:'Capta clientes y crea solicitudes de crédito. No ve cobranza ni pagos.', color:'#2194ff', icon:'VEN' },
  Contador: { desc:'Acceso exclusivo a pagos, reportes financieros, cuentas y contabilidad.', color:'#9c64ff', icon:'CNT' },
  Empleado: { desc:'Empleado general. Hace casi todo menos configuración y gestión de usuarios.', color:'#ff6b6b', icon:'EMP' },
  'Vendedor Concesionario': { desc:'Vendedor de un concesionario externo. Solo calculadora, clientes y solicitudes. Los créditos requieren aprobación del admin.', color:'#0ea5e9', icon:'VCO' }
};

// Helper: devuelve true si el usuario es un Empleado (o legacy Cobrador/Vendedor)
function isEmpleadoRole(){
  if(!S.currentUser) return false;
  var r = S.currentUser.rol;
  return r === 'Empleado' || r === 'Cobrador' || r === 'Vendedor';
}

// Vendedor Concesionario: rol especial con sidebar reducido (solo 3 módulos)
function isVendedorConcesionarioRole(){
  if(!S.currentUser) return false;
  return S.currentUser.rol === 'Vendedor Concesionario';
}

// Permisos efectivos del usuario actual
function getPermsEfectivos(){
  if(isAdminUser()) return Object.keys(PGL).concat(['perm_delete']);
  // Todos los demás roles (incluido Empleado / Cobrador / Vendedor):
  // respetar los permisos configurados por el administrador
  return getCurrentPerms();
}

function hasModuleAccess(key){
  if(isAdminUser()) return true;
  // Recursos: repositorio de material disponible para TODOS los usuarios logueados
  if(key === 'recursos') return true;
  // Vendedor Concesionario: solo 3 módulos permitidos + recursos
  if(isVendedorConcesionarioRole()){
    return key === 'motos' || key === 'clientes' || key === 'creditos';
  }
  return getPermsEfectivos().includes(key);
}

// ══════════════════════════════════════════
// LISTENER EN TIEMPO REAL DEL USUARIO ACTUAL
// Cuando el admin cambia rol/permisos en Firestore, el usuario afectado
// recibe la actualización al instante: sidebar se redibuja, módulos
// nuevos aparecen y los retirados desaparecen sin necesidad de re-login.
// ══════════════════════════════════════════
window._currentUserUnsub = null;
function _detachCurrentUserListener(){
  if(typeof window._currentUserUnsub === 'function'){
    try{ window._currentUserUnsub(); }catch(e){}
    window._currentUserUnsub = null;
  }
}
function _attachCurrentUserListener(uid){
  if(!db || !uid) return;
  _detachCurrentUserListener();
  try{
    window._currentUserUnsub = db.collection('usuarios').doc(uid).onSnapshot(function(doc){
      if(!doc || !doc.exists) return;
      if(!S.currentUser || S.currentUser.uid !== uid) return;
      var data = doc.data() || {};
      // Suspendido o eliminado: fuera, antes que cualquier otra cosa. Las Reglas ya no lo
      // dejan tocar la base, asi que seguir en pantalla solo produce errores mudos.
      if((data.suspendido === true || data.eliminado === true) && typeof auth !== 'undefined' && auth){
        try{ toast(data.eliminado === true ? 'Tu cuenta fue eliminada' : 'Tu cuenta ha sido suspendida','error'); }catch(e){}
        setTimeout(function(){ try{ auth.signOut(); }catch(e){} }, 1200);
        return;
      }
      var prevRol = S.currentUser.rol;
      var prevPerms = (S.currentUser.permisos||[]).slice().sort().join('|');
      var nuevoRol = data.rol || S.currentUser.rol;
      var nuevosPerms = Array.isArray(data.permisos) ? data.permisos.slice() : (S.currentUser.permisos||[]);
      var newPermsKey = nuevosPerms.slice().sort().join('|');
      // Si nada cambió, salir
      if(prevRol === nuevoRol && prevPerms === newPermsKey){
        // Solo actualizar nombre si cambió
        var cargoNuevo = data.cargo || '';
        if((data.nombre && data.nombre !== S.currentUser.nombre) || cargoNuevo !== (S.currentUser.cargo||'')){
          if(data.nombre) S.currentUser.nombre = data.nombre;
          S.currentUser.cargo = cargoNuevo;
          if(typeof updateSidebarFooter === 'function') updateSidebarFooter();
        }
        return;
      }
      // Si fue suspendido por admin, cerrar sesión
      if(data.suspendido === true && typeof auth !== 'undefined' && auth){
        try{ toast('Tu cuenta ha sido suspendida','error'); }catch(e){}
        setTimeout(function(){ try{ auth.signOut(); }catch(e){} }, 1200);
        return;
      }
      // Aplicar cambios al usuario en memoria
      S.currentUser.rol = nuevoRol;
      S.currentUser.cargo = data.cargo || '';
      S.currentUser.permisos = nuevosPerms;
      if(data.nombre) S.currentUser.nombre = data.nombre;
      S.currentUser.concesionarios = data.concesionarios || [];
      S.currentUser.comisiones = data.comisiones || null;
      // Auto-set sede activa si tiene 1 sola asignada
      try{
        var _asgn = S.currentUser.concesionarios || [];
        var _todas = (typeof _concEligioTodas === 'function') && _concEligioTodas();
        if((typeof isAdminUser==='function' && isAdminUser()) || _todas){
          /* Administrador, o el usuario eligió "todas": no forzar sede */
        } else if(_asgn.length === 1){
          S.concesionarioActivo = _asgn[0];
          try{ localStorage.setItem('concesionarioActivo', _asgn[0]); }catch(e){}
        } else if(_asgn.length > 1 && _asgn.indexOf(S.concesionarioActivo) === -1){
          S.concesionarioActivo = _asgn[0];
          try{ localStorage.setItem('concesionarioActivo', _asgn[0]); }catch(e){}
        }
      }catch(e){}
      if(typeof _renderConcSwitcher === 'function') _renderConcSwitcher();
      // Avisar al usuario
      try{
        if(prevRol !== nuevoRol){
          toast('Tu rol fue actualizado a '+nuevoRol,'info');
        } else {
          toast('Tus permisos fueron actualizados','info');
        }
      }catch(e){}
      // Redibujar sidebar (mostrará/ocultará módulos según los nuevos permisos)
      if(typeof renderSidebar === 'function') renderSidebar();
      if(typeof updateSidebarFooter === 'function') updateSidebarFooter();
      // Si la página actual ya no es accesible, mover al dashboard (o primer módulo permitido)
      if(S.page && typeof hasModuleAccess === 'function' && !hasModuleAccess(S.page)){
        var fallback = ['dash','centro','clientes','creditos','pagos'].find(function(k){ return hasModuleAccess(k); });
        if(fallback && typeof nav === 'function') nav(fallback);
      } else if(S.page && typeof nav === 'function'){
        // Repintar la página actual por si depende de permisos (ej. botones de eliminar)
        try{ nav(S.page); }catch(e){}
      }
    }, function(err){
      // Errores silenciosos: el usuario ya verá los cambios al refrescar
      console&&console.warn&&console.warn('Listener usuario:', err && err.message);
    });
  }catch(e){
    // Si falla, no rompemos nada — la sesión continúa funcionando
  }
}

// ── Sidebar dinámico: solo muestra módulos con acceso ──
var PG_NAVICONS = {
  gps:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  centro:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>',
  clientes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/><path d="M16 3.5a3 3 0 0 1 0 6"/><path d="M21 20v-1a5 5 0 0 0-3-4.5"/></svg>',
  motos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17h3l3-5h6l2 5"/><path d="M14 12l-2-4h-3"/><path d="M16 8h3"/></svg>',
  creditos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/></svg>',
  pagos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>',
  cobranza:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l1 4v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  contratos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
  notif:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.5 21a2 2 0 0 0 3 0"/></svg>',
  calculadora:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="10" height="3" rx="0.5"/><circle cx="8" cy="13" r="0.6" fill="currentColor"/><circle cx="12" cy="13" r="0.6" fill="currentColor"/><circle cx="16" cy="13" r="0.6" fill="currentColor"/><circle cx="8" cy="17" r="0.6" fill="currentColor"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/><circle cx="16" cy="17" r="0.6" fill="currentColor"/></svg>',
  reportes:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16l3-4 3 2 4-6"/></svg>',
  aprobaciones:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  cuentas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a9 3 0 0 0 18 0a9 3 0 0 0-18 0"/><path d="M3 7v5a9 3 0 0 0 18 0V7"/><path d="M3 12v5a9 3 0 0 0 18 0v-5"/></svg>',
  comisiones:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  conta:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  config:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  scores:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>',
  concesionarios:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>',
  recursos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M12 11v5M9.5 13.5h5"/></svg>'
};
function pgNavIcon(k){ return PG_NAVICONS[k] || ''; }
function renderSidebar(){
  var sb = document.querySelector('.sb-nav');
  if(!sb) return;
  if(!S.currentUser){ return; }

  // Empleado (o legacy Cobrador/Vendedor): sidebar especializado con Nueva Solicitud
  // pero respetando los permisos configurados por el administrador
  if(isEmpleadoRole()){
    var permsEmp = getCurrentPerms();
    var grposEmp = [
      {label:'Mi Trabajo', keys:['dash','centro','recursos']},
      {label:'Gestión', keys:['clientes','motos','creditos','pagos']},
      {label:'Operaciones',keys:['contratos','gps','notif','calculadora']},
      {label:'Análisis', keys:['reportes','cuentas','comisiones']},
      {label:'Sistema', keys:['plan','config','scores','users']},
    ];
    var iconMapEmp = {
      dash:'DB',centro:'WK',clientes:'CLI',motos:'MOT',creditos:'SOL',pagos:'PAG',
      contratos:'CTR',notif:'NOT',reportes:'RPT',
      cuentas:'CTA',comisiones:'CMS',conta:'CNT',plan:'PLN',config:'CFG',scores:'SCR',users:'USR'
    };
    var nameMapEmp = { dash:'Mi Dashboard', creditos:'Solicitudes' };
    var extraMapEmp = {pagos:'<span class="si-bx" id="sb-badge-cob"></span>', centro:'<span class="si-bx" id="sb-badge-wt"></span>'};

    var sidebarEmp = '<div style="padding:10px 8px">'
      +'<div style="margin-bottom:6px">'
      +'<button type="button" style="display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:12px;background:var(--p1);color:#fff;border:none;cursor:pointer;font-family:var(--f);font-size:13px;font-weight:700;width:100%" onclick="openAddCred()">'
      +'<span style="font-size:16px;font-weight:900;line-height:1">＋</span><span>Nueva Solicitud</span></button>'
      +'</div>'
      + grposEmp.map(function(g){
          var items = g.keys.filter(function(k){ return k==='recursos' || permsEmp.includes(k); });
          if(!items.length) return '';
          return '<div class="sb-grp"><div class="sb-lbl">'+g.label+'</div>'
            +items.map(function(k){
              var label = nameMapEmp[k] || PGL[k];
              return '<button type="button" class="si" data-nav="'+k+'" onclick="nav(\''+k+'\')">'
                +'<span class="sic nav-ic">'+pgNavIcon(k)+'</span><span>'+label+'</span>'+(extraMapEmp[k]||'')+'</button>';
            }).join('')
            +'</div>';
        }).join('')
      +'</div>';
    sb.innerHTML = sidebarEmp;
    updateSidebarFooter();
    return;
  }

  // Vendedor Concesionario: sidebar MUY reducido (solo 3 módulos esenciales)
  // No ve admin, finanzas, GPS, otros concesionarios — nada de eso
  if(isVendedorConcesionarioRole()){
    var sidebarVC = '<div style="padding:10px 8px">'
      +'<div style="margin-bottom:6px">'
      +'<button type="button" style="display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:12px;background:var(--p1);color:#fff;border:none;cursor:pointer;font-family:var(--f);font-size:13px;font-weight:700;width:100%" onclick="openAddCred()">'
      +'<span style="font-size:16px;font-weight:900;line-height:1">＋</span><span>Nueva Solicitud</span></button>'
      +'</div>'
      +'<div class="sb-grp"><div class="sb-lbl">Mi Trabajo</div>'
      +'<button type="button" class="si" data-nav="motos" onclick="nav(\'motos\')"><span class="sic nav-ic">'+pgNavIcon('motos')+'</span><span>Motos</span></button>'
      +'<button type="button" class="si" data-nav="calculadora" onclick="nav(\'calculadora\')"><span class="sic nav-ic">'+pgNavIcon('calculadora')+'</span><span>Calculadora</span></button>'
      +'<button type="button" class="si" data-nav="clientes" onclick="nav(\'clientes\')"><span class="sic nav-ic">'+pgNavIcon('clientes')+'</span><span>Clientes</span></button>'
      +'<button type="button" class="si" data-nav="creditos" onclick="nav(\'creditos\')"><span class="sic nav-ic">'+pgNavIcon('creditos')+'</span><span>Solicitudes</span></button>'
      +'<button type="button" class="si" data-nav="recursos" onclick="nav(\'recursos\')"><span class="sic nav-ic">'+pgNavIcon('recursos')+'</span><span>Files</span></button>'
      +'</div>'
      +'</div>';
    sb.innerHTML = sidebarVC;
    updateSidebarFooter();
    return;
  }

  // Otros roles: filtrar módulos según permisos
  var perms = getCurrentPerms();
  var grupos = [
    {label:'Principal', keys:['dash','centro','recursos']},
    {label:'Gestión', keys:['clientes','motos','creditos','pagos']},
    {label:'Operaciones',keys:['contratos','gps','notif','calculadora','aprobaciones']},
    {label:'Análisis', keys:['reportes','cuentas','comisiones']},
    {label:'Sistema', keys:['plan','config','concesionarios','scores','users']},
  ];
  var iconMap = {
    dash:'DB',centro:'WK',clientes:'CLI',motos:'MOT',creditos:'FIN',pagos:'PAG',
    cobranza:'COB',contratos:'CTR',notif:'NOT',reportes:'RPT',aprobaciones:'APR',
    cuentas:'CTA',comisiones:'CMS',conta:'CNT',plan:'PLN',config:'CFG',scores:'SCR',users:'USR',concesionarios:'CNC'
  };
  var extraMap = {pagos:'<span class="si-bx" id="sb-badge-cob"></span>', centro:'<span class="si-bx" id="sb-badge-wt"></span>'};

  sb.innerHTML = grupos.map(function(g){
    var items = g.keys.filter(function(k){ return isAdminUser() || k==='recursos' || perms.includes(k); });
    if(!items.length) return '';
    return '<div class="sb-grp"><div class="sb-lbl">'+g.label+'</div>'
      +items.map(function(k){
        return '<button type="button" class="si" data-nav="'+k+'" onclick="nav(\''+k+'\')">'
          +'<span class="sic nav-ic">'+pgNavIcon(k)+'</span><span>'+PGL[k]+'</span>'+(extraMap[k]||'')+'</button>';
      }).join('')
      +'</div>';
  }).join('');
  updateSidebarFooter();
}

function updateSidebarFooter(){
  if(!S.currentUser) return;
  var nombre = S.currentUser.nombre || S.currentUser.email || 'Usuario';
  // Debajo del nombre va el CARGO (Archivologa, Gerente de Cobranzas...) y solo
  // si no tiene, el rol, como antes. El color sigue saliendo del rol.
  var rol = S.currentUser.cargo || S.currentUser.rol || 'Usuario';
  var inics = nombre.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase()||'U';
  var rolColors = {Administrador:'var(--p1)',Gerente:'var(--p2)',Empleado:'var(--green)',Vendedor:'var(--green)',Cobrador:'var(--green)',Contador:'var(--ink3)'};
  var rolColor = rolColors[S.currentUser.rol] || 'var(--p1)';

  var sbUn = document.querySelector('.sb-un');
  var sbAv = document.querySelector('.sb-av');
  var sbUr = document.querySelector('.sb-ur');
  var mobAv = document.getElementById('mob-av');

  if(sbUn) sbUn.textContent = nombre;
  if(sbAv){ sbAv.textContent = inics; sbAv.style.background = rolColor; }
  if(sbUr){ sbUr.textContent = rol; sbUr.style.background = rolColor; sbUr.style.webkitTextFillColor = '#fff'; sbUr.style.webkitBackgroundClip = 'unset'; sbUr.style.backgroundClip = 'unset'; sbUr.style.color = '#fff'; sbUr.style.fontSize = '10px'; sbUr.style.fontWeight = '700'; sbUr.style.padding = '2px 8px'; sbUr.style.borderRadius = '20px'; }
  if(mobAv){ mobAv.textContent = inics; mobAv.style.background = rolColor; }

  // Also update the footer card to be clickable for all roles
  var sbFoot = document.querySelector('.sb-foot');
  if(sbFoot && !sbFoot.querySelector('.sb-usr[onclick]')){
    var usr = sbFoot.querySelector('.sb-usr');
    if(usr) usr.setAttribute('onclick','showAdminProfile()');
  }

  // ── Badge de mora automático ──
  actualizarBadgeMora();
}

// soloNumero: desde calcularMoraAuto (al cargar, cada 5 min y al registrar pagos) solo se
// refresca el numero; el aviso "entraron en mora hoy" sigue saliendo solo al armar el menu.
function actualizarBadgeMora(soloNumero){
  try{
    var cob = document.getElementById('sb-badge-cob');
    if(!cob) return;
    // Un crédito en mora puede tener estado 'activo' O 'mora'. Antes solo contaba
    // estado==='activo', por eso el badge mostraba muchos menos de los atrasados reales.
    var enMora = _concFiltrar(S.creds||[]).filter(function(c){return !c.eliminado && c.mora>0 && (c.estado==='activo'||c.estado==='mora');}).length;
    if(enMora>0){
      cob.textContent = enMora;
      cob.style.display='flex';
      cob.style.background='var(--red)';
      cob.style.color='#fff';
      cob.style.fontSize='10px';
      cob.style.fontWeight='900';
      cob.style.minWidth='18px';
      cob.style.height='18px';
      cob.style.borderRadius='9px';
      cob.style.alignItems='center';
      cob.style.justifyContent='center';
      cob.style.padding='0 5px';
    } else {
      cob.textContent='';
      cob.style.display='none';
    }
    // Toast de alerta si hay créditos nuevos en mora (mora entre 1-3 días)
    var _moraKey = 'pagasi_mora_alert_'+hoyLocalISO();
    if(!soloNumero && enMora>0 && !sessionStorage.getItem(_moraKey)){
      var nuevosEnMora = _concFiltrar(S.creds||[]).filter(function(c){return !c.eliminado && c.mora>0 && c.mora<=3 && c.estado==='activo';});
      if(nuevosEnMora.length>0){
        sessionStorage.setItem(_moraKey,'1');
        setTimeout(function(){
          toast('⚠️ '+nuevosEnMora.length+' crédito'+(nuevosEnMora.length>1?'s':'')+(nuevosEnMora.length>1?' entraron':' entró')+' en mora hoy','warning',6000);
        }, 1500);
      }
    }
  }catch(e){}
}
function canDeleteAction(){ return isAdminUser() || getCurrentPerms().includes('perm_delete'); }

// ── Pantalla de bienvenida para Vendedor ──
function requireDeletePermission(){
  if(canDeleteAction()) return true;
  toast('No tienes permiso para eliminar','error');
  return false;
}

// Variables globales de configuración
var _cuentasBanc = [];
var _cobradores = ['Juan Admin'];

// ── Helper: lista unificada de cobradores ──
// Devuelve la UNIÓN de:
//   1) Lista manual de _cobradores (config/cobradores en Firestore)
//   2) Usuarios del sistema que tengan comisiones.activo === true
// Dedupe por nombre (case-insensitive con normalización).
// Esto garantiza que cualquiera con comisión configurada aparezca en
// todos los dropdowns de "Recibido por", "Cobrador", "Vendedor", etc.
function getCobradoresList(){
  function normN(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(); }
  var seen = {}; // mapa normalizado → nombre original a usar
  var resultado = [];
  // 1) Lista manual histórica
  (_cobradores||[]).forEach(function(n){
    var k = normN(n);
    if(!k || seen[k]) return;
    seen[k] = n;
    resultado.push(n);
  });
  // 2) Usuarios con comisión activa
  try {
    var lista = (typeof _usersCache !== 'undefined' && _usersCache && _usersCache.length) ? _usersCache :
                (S && S._wtUsers && S._wtUsers.length ? S._wtUsers : []);
    lista.forEach(function(u){
      if(!u || u.eliminado || u.suspendido) return;
      // Cualquier usuario que tenga el objeto comisiones configurado aparece,
      // sin importar si los valores son 0 o si activo está en false.
      // Basta con que el admin haya tocado la sección de comisiones del usuario.
      var tieneComision = !!u.comisiones;
      if(!tieneComision) return;
      var nombre = u.nombre || u.email || '';
      if(!nombre) return;
      var k = normN(nombre);
      if(seen[k]) return;
      seen[k] = nombre;
      resultado.push(nombre);
    });
  } catch(e){ console.warn('getCobradoresList:', e); }
  return resultado;
}
window.getCobradoresList = getCobradoresList;
// Datos de la empresa (nombre, RIF, ciudad, tel, email) — se usan en contratos y reportes
// Fuente única de verdad que NO depende del DOM (Config solo existe cuando estás en esa página)
var _empresa = { nombre:'Pagasi', rif:'J-00000000-0', ciudad:'Caracas', tel:'', email:'', direccion:'', representante:'', repCI:'' };

// Helper global para leer empresa de forma consistente.
// Primero intenta el DOM (por si está en Config editándose), si no usa la variable cacheada.
function getEmpresa(){
  var nombre = ($('cfg_empresa')&&$('cfg_empresa').value) || _empresa.nombre || 'Pagasi';
  var rif = ($('cfg_rif') &&$('cfg_rif').value) || _empresa.rif || 'J-00000000-0';
  var ciudad = ($('cfg_ciudad') &&$('cfg_ciudad').value) || _empresa.ciudad || 'Caracas';
  var tel = ($('cfg_tel') &&$('cfg_tel').value) || _empresa.tel || '';
  var email = ($('cfg_email2') &&$('cfg_email2').value) || _empresa.email || '';
  var direccion = ($('cfg_direccion') &&$('cfg_direccion').value) || _empresa.direccion || '';
  var representante= ($('cfg_representante')&&$('cfg_representante').value)|| _empresa.representante|| '';
  var repCI = ($('cfg_rep_ci') &&$('cfg_rep_ci').value) || _empresa.repCI || '';
  // Datos registrales (registro mercantil, cargo del representante): los usan
  // los contratos. Si no estan en el formulario, salen de _empresa (Firebase).
  var E = function(id, k){ return ((($(id)||{}).value) || _empresa[k] || '').trim(); };
  return { nombre:nombre.trim(), rif:rif.trim(), ciudad:ciudad.trim(), tel:tel.trim(), email:email.trim(),
           direccion:direccion.trim(), representante:representante.trim(), repCI:repCI.trim(),
           repCargo:E('cfg_rep_cargo','repCargo'), repDoc:E('cfg_rep_doc','repDoc'),
           rm:E('cfg_rm','rm'), rmEstado:E('cfg_rm_estado','rmEstado'), rmFecha:E('cfg_rm_fecha','rmFecha'),
           rmNum:E('cfg_rm_num','rmNum'), rmTomo:E('cfg_rm_tomo','rmTomo') };
}

// Cargar datos de empresa desde Firebase al iniciar

function updateBadge(){
  const b=$('mora-badge');
  if(b) b.textContent=S.creds.filter(c=>c.mora>0).length;
  var wb=$('sb-badge-wt');
  if(wb){
    var hoyISO = (typeof hoyLocalISO==='function') ? hoyLocalISO() : new Date().toISOString().slice(0,10);
    // Solo cuenta lo que REQUIERE ATENCIÓN: tareas mías, activas, que vencen hoy o están vencidas.
    var n=(S.tareas||[]).filter(function(t){
      if(!t || t.eliminado || t.archivado || t.estado==='completada') return false;
      if(typeof wtIsMine==='function' && !wtIsMine(t)) return false;
      return t.fecha && t.fecha <= hoyISO;
    }).length;
    wb.textContent=n||'';
    wb.style.display=n?'inline-flex':'none';
  }
}

// ══════════════════════════════════════════
// HISTORY / BACK BUTTON HANDLING
// ══════════════════════════════════════════
// Evita que el botón "atrás" del navegador saque al usuario del sistema.
// Cada navegación interna (nav) hace pushState; el popstate navega
// internamente o cierra modales abiertos.
window._navFromPop = false; // flag: evita push cuando venimos de popstate

function _isModalOpen(){
  try {
    var ov = document.getElementById('ov');
    if(!ov) return false;
    var d = ov.style.display;
    return d && d !== 'none';
  } catch(e){ return false; }
}

function _pushNavState(p){
  try {
    window.history.pushState({app:'pagasi', page:p, t:Date.now()}, '', window.location.href);
  } catch(e){}
}

function _replaceNavState(p){
  try {
    window.history.replaceState({app:'pagasi', page:p, t:Date.now()}, '', window.location.href);
  } catch(e){}
}

window.addEventListener('popstate', function(ev){
  // Si hay un modal abierto, ciérralo y vuelve a poner el estado
  // (no dejamos que el back "navegue" cuando hay un diálogo).
  if(_isModalOpen()){
    try { if(typeof closeM==='function') closeM(); } catch(e){}
    // Reponer el estado para que quedemos en la misma página
    _pushNavState(S.page || 'dash');
    return;
  }
  // Si el usuario aún no ha iniciado sesión, no hacemos nada raro
  if(!S.currentUser){
    // Reponer para que no se salga
    _pushNavState('login');
    return;
  }
  // Navegar a la página del estado (si existe) o al dashboard
  var target = (ev.state && ev.state.page) ? ev.state.page : 'dash';
  window._navFromPop = true;
  try { nav(target); } finally { window._navFromPop = false; }
});

function nav(p){
  var _navT0 = Date.now();
  if(typeof closeMobileMenu==='function') closeMobileMenu();
  // Verificar permiso
  if(S.currentUser){
    if(!hasModuleAccess(p)){
      document.querySelectorAll('.si').forEach(function(e){e.classList.remove('on');});
      $('pgT').textContent = 'Sin acceso'; if($('pgT-mob')) $('pgT-mob').textContent='Sin acceso';
      $('cnt').innerHTML = '<div class="empty" style="padding:80px 20px;text-align:center"><div style="font-size:48px;margin-bottom:14px;opacity:0.4">🔒</div><div class="e-tt" style="font-size:18px;font-weight:800;margin-bottom:8px">Acceso restringido</div><div style="font-size:13px;color:var(--ink3);line-height:1.6;max-width:380px;margin:0 auto">No tienes permiso para ver este módulo.<br>Contacta al administrador.</div></div>';
      return;
    }
  }
  // Registrar en el history del navegador (solo si NO venimos de popstate,
  // para evitar duplicados infinitos al dar back).
  if(!window._navFromPop){
    // Si es la primera navegación de la sesión, reemplazamos el estado base;
    // en las siguientes, hacemos push.
    if(!window.history.state || !window.history.state.app){
      _replaceNavState(p);
    } else if(window.history.state.page !== p){
      _pushNavState(p);
    }
  }
  if(typeof _pagosIdxInvalidar==='function') _pagosIdxInvalidar();   // cada redibujo parte de un indice fresco
  S.page=p;
  S.clienteFiltro='';
  if(window._pgKeep){ window._pgKeep=false; } else { window._pages={}; } // reset pagination on module change (preserve when navigating pages)
  if(p !== 'cuentas') window._cuentasDetalle = null; // reset account detail view
  document.querySelectorAll('.si').forEach(e=>e.classList.remove('on'));
  document.querySelectorAll('.si[data-nav]').forEach(e=>{if(e.dataset.nav===p)e.classList.add('on');});
  $('pgT').textContent=PGL[p]||p; if($('pgT-mob')) $('pgT-mob').textContent=PGL[p]||p;
  updateTopbar();
  if(typeof _renderConcSwitcher === 'function') _renderConcSwitcher();
  if(window.innerWidth<=820) updateMobileNav();
  const fn=PG[p];
  if(fn){
    if(p==='dash'){
      // En un redibujo por tiempo real no se muestra el esqueleto de 'cargando':
      // la pantalla parpadeaba cada vez que otro empleado registraba algo.
      var esRT = !!window._rtRenderizando;
      if(!esRT) showSkeleton();
      setTimeout(function(){
        var _t0 = Date.now();
        $('cnt').innerHTML=fn();
        _perfAnotar('dash-html', esRT ? 'rt' : 'nav', Date.now() - _t0);
        updateBadge();
        if(!isEmpleadoRole()){
          // Cada grafico se destruye y se vuelve a crear en cada redibujo. En
          // un redibujo por tiempo real: sin animacion, y sin las pasadas
          // repetidas de los 900 y 2500 ms (existen para el primer pintado,
          // cuando el lienzo todavia no tiene su tamaño).
          if(esRT) _chartsAnimacion(false);
          var _ch = function(nombre, fnCh){
            if(typeof fnCh!=='function') return;
            var t = Date.now();
            try { fnCh(); } finally { _perfAnotar('grafico', nombre, Date.now() - t); }
          };
          _ch('ingresos', typeof renderDashChart==='function' ? renderDashChart : null);
          setTimeout(function(){ _ch('creditos', typeof renderCredChart==='function' ? renderCredChart : null); }, 50);
          setTimeout(function(){ _ch('mora', typeof renderMoraChart==='function' ? renderMoraChart : null); }, 80);
          setTimeout(function(){ _ch('egresos', typeof renderDashEgrChart==='function' ? renderDashEgrChart : null); }, 200);
          setTimeout(function(){ _ch('cuotas', typeof renderDashCuotasChart==='function' ? renderDashCuotasChart : null); }, 220);
          setTimeout(function(){
            try { _ch('cobros-pendientes', typeof renderDashCobrospChart==='function' ? renderDashCobrospChart : null); }
            finally { if(esRT) _chartsAnimacion(true); }   // aunque el grafico falle, la animacion vuelve
          }, 240);
          if(!esRT){
            setTimeout(function(){
              if(typeof renderCredChart==='function') renderCredChart();
              if(typeof renderDashChart==='function' && !_dashChart) renderDashChart();
              if(typeof renderDashEgrChart==='function') renderDashEgrChart();
              if(typeof renderDashCuotasChart==='function' && !_dashCuotasChart) renderDashCuotasChart();
              if(typeof renderDashCobrospChart==='function' && !_dashCobrospChart) renderDashCobrospChart();
            }, 900);
            setTimeout(function(){
              if(typeof renderDashEgrChart==='function') renderDashEgrChart();
              if(typeof renderDashCuotasChart==='function' && !_dashCuotasChart) renderDashCuotasChart();
            }, 2500);
          }
        }
      },80);
    }
    else {
      $('cnt').innerHTML=fn(); wtInjectDataLabels();
      if(p==='finanzas'){
        setTimeout(function(){ if(typeof renderFinIngChart==='function') renderFinIngChart(); }, 150);
        setTimeout(function(){ if(typeof renderFinIngChart==='function') renderFinIngChart(); }, 600);
        setTimeout(function(){ if(typeof renderFinIngChart==='function') renderFinIngChart(); }, 1500);
      }
    }
  } else {
    $('cnt').innerHTML=`<div class="empty"><span class="e-ic" style="font-size:28px;opacity:0.3;display:block;margin-bottom:10px">···</span><div class="e-tt">En desarrollo</div></div>`;
  }
  updateBadge();
  wtInjectDataLabels();
  _perfAnotar('nav', p, Date.now() - _navT0);
}

// ── Mobile: inyectar data-label en celdas de tabla para CSS card layout ──
// Logica de graficos Chart.js movida a logic/charts.js.

const PG = {};
window.PG = PG;

function showSkeleton(){
  var cnt = $('cnt');
  if(!cnt) return;
  var skCards = Array(4).fill(0).map(()=>
    '<div class="sk-card" style="flex:1">'+
      '<div class="sk sk-line" style="width:35%;height:10px"></div>'+
      '<div class="sk sk-val"></div>'+
      '<div class="sk sk-line" style="width:70%"></div>'+
      '<div class="sk sk-line" style="width:50%;margin-top:12px"></div>'+
    '</div>'
  ).join('');
  cnt.innerHTML = '<div class="page">'+
    '<div style="background:var(--surf2);border-radius:12px;height:80px;margin-bottom:18px" class="sk"></div>'+
    '<div style="display:flex;gap:12px;margin-bottom:14px">'+skCards+'</div>'+
    '<div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:14px">'+
      '<div class="sk-card"><div class="sk sk-title"></div><div class="sk" style="height:110px;border-radius:8px"></div></div>'+
      '<div class="sk-card"><div class="sk sk-title"></div>'+Array(3).fill('<div class="sk sk-line"></div>').join('')+'</div>'+
    '</div>'+
  '</div>';
}


// ══════════════════════════════════════════
// MOTO CARD
// ══════════════════════════════════════════

// Helpers de pago/egreso para compra de motos movidos a logic/moto-pagos.js.

// En la pestaña "En mora" el mas atrasado va arriba; al salir vuelve el mas nuevo arriba (Adam, 14-sep-2026)
function setCredTab(t){S.credTab=t;S.credFiltro='';if(t==='mora')S.credSort={col:'mora',dir:'desc'};else if(S.credSort&&S.credSort.col==='mora')S.credSort={col:'id',dir:'desc'};window._pages={};nav('creditos');}
function setCredSort(col){var cur=S.credSort||{col:'id',dir:'desc'};S.credSort={col:col,dir:(cur.col===col&&cur.dir==='asc')?'desc':'asc'};window._pages={};nav('creditos');}
var _credSearchTimer=null;
function liveSearchCred(q){
  S.credFiltro=q||'';
  pgSet('creditos',1);
  if(_credSearchTimer) clearTimeout(_credSearchTimer);
  _credSearchTimer=setTimeout(function(){
    if(!S || S.page!=='creditos') return;
    var cursor=(q||'').length;
    nav('creditos');
    setTimeout(function(){
      var inp=$('credQ');
      if(inp){
        inp.focus();
        try{ inp.setSelectionRange(cursor,cursor); }catch(e){}
      }
    },0);
  },160);
}
function setCliSort(col){var cur=S.cliSort||{col:'nombre',dir:'asc'};S.cliSort={col:col,dir:(cur.col===col&&cur.dir==='asc')?'desc':'asc'};window._pages={};nav('clientes');}
function setPagosSort(col){var cur=S.pagosSort||{col:'fecha',dir:'desc'};S.pagosSort={col:col,dir:(cur.col===col&&cur.dir==='asc')?'desc':'asc'};window._pages={};nav('pagos');}
function setMotosSort(col){var cur=S.motosSort||{col:'modelo',dir:'asc'};S.motosSort={col:col,dir:(cur.col===col&&cur.dir==='asc')?'desc':'asc'};window._pages={};nav('motos');}
function setCuotasSort(col){var cur=S.cuotasSort||{col:'vence',dir:'asc'};S.cuotasSort={col:col,dir:(cur.col===col&&cur.dir==='asc')?'desc':'asc'};window._pages={};nav('pagos');}
function _thSort(sortState,setFn,col,label){var isActive=sortState.col===col;var arrow=isActive?(sortState.dir==='asc'?'↑':'↓'):'';return '<th onclick="'+setFn+'(\''+col+'\')" style="cursor:pointer;user-select:none;white-space:nowrap">'+label+(arrow?' <span style="color:var(--p1);font-size:10px">'+arrow+'</span>':'<span style="color:var(--ink3);font-size:9px;opacity:.4"> ⇅</span>')+'</th>';}
function getCuotasVencidas(c){
  // Devuelve cuántas cuotas están vencidas sin pagar
  if(!c||c.estado==='completado'||c.estado==='cancelado') return 0;
  var mora = parseInt(c.mora||0,10);
  if(mora<=0) return 0;
  return Math.ceil(mora/15); // 1 cuota cada 15 días
}
function setPagosTab(t){S.pagosTab=t;window._pages={};nav('pagos');}
function setReportesTab(t){S.reportesTab=t;nav('reportes');}
function setRpCobrosPer(m){S.rpCobrosPer=m;S.reportesTab='resumen';nav('reportes');}
function setRpProxPer(m){S.rpProxPer=m;S.reportesTab='resumen';nav('reportes');}
window.setReportesTab=setReportesTab;

// Resincroniza S.motos con Firebase, descartando el caché local.
// Útil cuando el caché local tiene motos "fantasma" que ya no existen en Firebase
// (p.ej. duplicados creados por un bug antiguo, o motos borradas manualmente desde la consola de Firebase).

function confirmarEliminacion(opts){
  // opts: { titulo, descripcion, onConfirm }
  window._delAuditCallback = opts.onConfirm;
  $('mic').textContent='Del';
  $('mtt').textContent = opts.titulo || 'Eliminar registro';
  $('msb').textContent = 'Esta acción quedará registrada con tu nombre';
  $('modal-box').className='modal';
  $('mbd').innerHTML = '<div style="text-align:center;padding:8px 0 14px">'
    +'<div style="font-size:40px;margin-bottom:10px"></div>'
    +'<div style="font-size:14px;font-weight:800;margin-bottom:6px">'+(opts.descripcion||'¿Confirmar eliminación?')+'</div>'
    +'<div style="color:var(--ink3);font-size:12px;margin-bottom:14px">Quedará registrado como eliminado por <strong>'+((S.currentUser&&S.currentUser.nombre)||'Administrador')+'</strong></div>'
    +'</div>'
    +'<div class="fg"><label>Razón de la eliminación (obligatorio)</label>'
    +'<select class="fs" id="del_razon">'
    +'<option value="">— Seleccionar —</option>'
    +'<option>Error de captura</option>'
    +'<option>Pago duplicado</option>'
    +'<option>Cliente solicitó reverso</option>'
    +'<option>Monto incorrecto</option>'
    +'<option>Operación cancelada</option>'
    +'<option>Orden del administrador</option>'
    +'<option>Otro</option>'
    +'</select></div>'
    +'<div class="fg" style="margin-top:8px" id="del_otro_wrap" style="display:none">'
    +'<label>Especifica la razón</label>'
    +'<input class="fi" id="del_otro" placeholder="Describe la razón..."></div>';
  // Show text input when "Otro" selected
  setTimeout(function(){
    var sel = $('del_razon');
    if(sel) sel.onchange = function(){
      var wrap = $('del_otro_wrap');
      if(wrap) wrap.style.display = sel.value==='Otro' ? 'block' : 'none';
    };
  }, 50);
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    +'<button class="btn btn-d" onclick="ejecutarEliminacionAuditada()">Eliminar</button>';
  $('ov').style.display='flex';
}

function ejecutarEliminacionAuditada(){
  if(!requireDeletePermission()) return;
  var razon = ($('del_razon')&&$('del_razon').value)||'';
  if(razon==='Otro') razon = ($('del_otro')&&$('del_otro').value.trim())||'Otro';
  if(!razon){ toast('Debes seleccionar una razón','error'); return; }
  var auditInfo = {
    eliminado: true,
    eliminadoPor: (S.currentUser&&S.currentUser.nombre)||'Administrador',
    eliminadoPorUid: (S.currentUser&&S.currentUser.uid)||'',
    eliminadoEn: new Date().toISOString(),
    eliminadoRazon: razon
  };
  closeM();
  if(window._delAuditCallback) window._delAuditCallback(auditInfo);
  window._delAuditCallback = null;
}

// CLIENTE CRUD
// ══════════════════════════════════════════

// ═══ RESTAURAR PAGO ELIMINADO ═══
// Logica de pagos, cobranza, mora y liquidaciones movida a logic/pagos.js.

// Logica de contratos y documentos legales movida a logic/contratos.js.

// Logica de egresos movida a logic/egresos.js.

// Logica de alertas, recibos, facturas y libro SENIAT movida a logic/facturacion.js.

// Logica de comisiones movida a logic/comisiones.js.

function closeM(){
  window._saveMEnCurso = false;   // el candado del doble clic muere con el modal
  if(typeof _pagosIdxInvalidar==='function') _pagosIdxInvalidar();
  $('ov').style.display='none';
  $('modal-box').className='modal';
  $('mft').style.display='';
  if($('mbd')) $('mbd').style.padding='';
  $('mft').innerHTML=`<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar</button>`;
  if(typeof flushRealtimeRender === 'function') flushRealtimeRender();
}
// Un doble clic guardaba dos veces: se creaban dos motos con sus dos gastos
// (punto 24, 21-sep-2026). El boton se bloquea mientras guarda; si lo que se
// guarda no pasa la validacion (devuelve false), se libera enseguida.
function saveM(){
  if(window._saveMEnCurso) return;
  if(!S.saveFn) return;
  window._saveMEnCurso = true;
  var btn = document.querySelector('#mft .btn-p') || document.querySelector('#mft .btn-d');
  if(btn) btn.disabled = true;
  var liberar = function(){
    window._saveMEnCurso = false;
    var b = document.querySelector('#mft .btn-p') || document.querySelector('#mft .btn-d');
    if(b) b.disabled = false;
  };
  var ok;
  try { ok = S.saveFn(); }
  catch(e){ liberar(); throw e; }
  // Si el guardado es asincrono (reservar el numero de la moto tarda), el candado dura
  // hasta que TERMINA de verdad; el temporizador queda solo de red para los que no
  // devuelven nada (revisado el 22-sep-2026: 1,5 s no alcanzaba y se duplicaba la moto).
  if(ok === false) liberar();
  else if(ok && typeof ok.then === 'function') ok.then(liberar, liberar);
  else setTimeout(liberar, 1500);
  return ok;
}
// Map pages to button labels (empty = hide button)
var TOP_BTN_LABELS = {
  dash: 'Nueva Solicitud',
  centro: 'Nueva tarea',
  clientes: 'Nueva Solicitud',
  creditos: 'Nueva Solicitud',
  contratos: 'Nueva Solicitud',
  motos: 'Nueva Unidad al Inventario',
  pagos: 'Registrar Pago',
  conta: 'Nuevo Egreso',
  cuentas: 'Depositar',
  plan: 'Agregar Modelo',
  cobranza: 'Registrar Pago',
};

function updateTopbar(){
  var p = S.page;
  // + Nuevo button
  var btn = $('topNewBtn');
  var label = $('topNewLabel');
  var lbl = TOP_BTN_LABELS[p];
  if(btn){
    if(lbl){ btn.style.display=''; label.textContent=lbl; }
    else { btn.style.display='none'; }
  }
  // Notification dot
  var mora = S.creds.filter(function(c){return c.mora>0;}).length;
  var pend = S.pagos.filter(function(p){return p.estado==='pendiente';}).length;
  var dot = $('notif-dot');
  if(dot){
    dot.style.display = (mora+pend>0) ? '' : 'none';
    dot.textContent = '';
  }
  // Notification bell badge in mobile
  updateBadge();
}
function toast(msg,type='info'){
  const c=$('toasts'),t=document.createElement('div');t.className=`toast ${type}`;
  const ic={success:'✓',error:'OFF',info:'ℹ️',warn:''};
  t.innerHTML=`<span>${ic[type]||'ℹ️'}</span><span>${msg}</span>`;c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(12px)';t.style.transition='all .26s';},3000);
  setTimeout(()=>t.remove(),3300);
}

// GUARDAR CONFIGURACIÓN


// Mora auto recalculation — refresh every 5 minutes while app is open
(function(){
  function autoMora(){ if(typeof calcularMoraAuto==='function' && S.creds && S.creds.length) calcularMoraAuto(); }
  setInterval(autoMora, 5*60*1000);
})();

function recargarDesdeFirebase(){
  if(!db){
    toast('Firebase no está configurado','error');
    return;
  }
  if(!confirm('¿Limpiar el caché local y recargar todos los valores desde Firebase?\n\nSe descartarán los cambios sin guardar en pantalla.')) return;

  toast('Sincronizando con Firebase...','info');

  // 1) Limpiar caché en memoria de configuración
  try {
    _empresa = { nombre:'Pagasi', rif:'J-00000000-0', ciudad:'Caracas', tel:'', email:'', direccion:'', representante:'', repCI:'' };
    _cuentasBanc = [];
    _cobradores = ['Juan Admin'];
    window._tasaBsGlobal = 1;
    window._planesExtra = [];
  } catch(e){ /* variables pueden no estar definidas todavía */ }

  // 2) Limpiar caché de motos en localStorage para forzar lectura limpia
  try {
    if(typeof localStorage !== 'undefined'){
      localStorage.removeItem('motosCache');
      localStorage.removeItem('motosCacheV2');
    }
  } catch(e){}

  // 3) Recargar configuraciones específicas desde Firestore
  var tareas = [];

  // Empresa
  tareas.push(
    db.collection('config').doc('empresa').get().then(function(doc){
      if(doc.exists){
        var d = doc.data() || {};
        _empresa = {
          nombre: d.nombre || 'Pagasi',
          rif: d.rif || 'J-00000000-0',
          ciudad: d.ciudad || 'Caracas',
          tel: d.tel || '',
          email: d.email || '',
          direccion: d.direccion || '',
          representante: d.representante || '',
          repCI: d.repCI || '',
          repCargo: d.repCargo || '', repDoc: d.repDoc || '',
          rm: d.rm || '', rmEstado: d.rmEstado || '', rmFecha: d.rmFecha || '', rmNum: d.rmNum || '', rmTomo: d.rmTomo || '',
          // cuentas que nombra el contrato (22-sep-2026)
          bancoUsd: d.bancoUsd || '', cuentaUsd: d.cuentaUsd || '', billetera: d.billetera || '', billeteraCuenta: d.billeteraCuenta || ''
        };
      }
    })
  );

  // Tasa Bs
  tareas.push(
    db.collection('config').doc('tasa').get().then(function(doc){
      if(doc.exists && doc.data().tasaBs) window._tasaBsGlobal = doc.data().tasaBs;
    })
  );

  // Cuentas bancarias
  tareas.push(
    db.collection('config').doc('cuentasBanc').get().then(function(doc){
      var lista = (doc.exists && doc.data().lista) ? doc.data().lista : [];
      if(typeof renderCuentasBanc === 'function') renderCuentasBanc(lista);
      else _cuentasBanc = lista;
    })
  );

  // Cobradores
  tareas.push(
    db.collection('config').doc('cobradores').get().then(function(doc){
      var lista = (doc.exists && doc.data().lista) ? doc.data().lista : ['Juan Admin'];
      if(typeof renderCobradores === 'function') renderCobradores(lista);
      else _cobradores = lista;
    })
  );

  // Score config
  tareas.push(
    db.collection('config').doc('score').get().then(function(doc){
      if(doc.exists && typeof SCORE_CFG !== 'undefined'){
        var d = doc.data() || {};
        Object.keys(d).forEach(function(k){ SCORE_CFG[k] = d[k]; });
      }
    }).catch(function(){})
  );

  // Roles y permisos personalizados
  tareas.push(
    db.collection('config').doc('rolesPermisos').get().then(function(doc){
      if(doc.exists && typeof ROL_PERMISOS !== 'undefined'){
        var d = doc.data() || {};
        Object.keys(d).forEach(function(rol){
          if(Array.isArray(d[rol])) ROL_PERMISOS[rol] = d[rol];
        });
      }
    }).catch(function(){})
  );

  // 4) Recargar todos los datos principales (motos, clientes, créditos, pagos, etc.)
  // a través de DB.load() — recarga PLAN, CATALOGO, planes extra, etc.
  tareas.push(
    (typeof DB !== 'undefined' && DB.load) ? DB.load() : Promise.resolve()
  );

  Promise.all(tareas).then(function(){
    toast('✓ Datos recargados desde Firebase','success');
    // Re-render de la página actual para reflejar los nuevos valores
    if(typeof nav === 'function' && S && S.page){
      nav(S.page);
    } else if(typeof nav === 'function'){
      nav('config');
    }
  }).catch(function(e){
    toast('Error al sincronizar: '+(e&&e.message||e),'error');
  });
}

// PUNTO 1 — FINIQUITO DE CONTRATO
// ══════════════════════════════════════════
// Logica de finiquitos, PDFs, CSV, paginacion y reportes movida a logic/reportes.js.

// Logica de cuentas, movimientos, historial y pendientes movida a logic/cuentas.js.

function init() {
  // Mostrar el contenedor principal
  var appRoot = $('app-root');
  if (appRoot) appRoot.style.display = 'flex';

  // Defensa: cerrar cualquier overlay de perfil que haya quedado abierto
  var profOverlay = document.getElementById('profile-overlay');
  if(profOverlay) profOverlay.style.display = 'none';
  document.body.style.overflow = '';

  cargarHistorialNotificaciones();

  // Pre-cargar usuarios desde Firestore para que getCobradoresList() tenga datos
  // disponibles desde el inicio (ej: al abrir modal de pago sin haber visitado Usuarios)
  try {
    if(DB && DB.getUsuarios){
      DB.getUsuarios().then(function(arr){
        if(Array.isArray(arr)){
          if(typeof _usersCache !== 'undefined') _usersCache = arr;
          if(S && (!S._wtUsers || !S._wtUsers.length)) S._wtUsers = arr;
        }
      }).catch(function(e){ console.warn('Pre-carga usuarios init:', e); });
    }
  } catch(e){}

  // Cargar datos desde Firebase o usar datos locales de demostración.
  // startRealtime va PRIMERO: la primera foto de cada suscripcion es la carga
  // inicial, y DB.load({viaRealtime:true}) solo la espera y trae la
  // configuracion. Antes cada apertura bajaba las colecciones DOS veces.
  startRealtime();
  DB.load({ viaRealtime: true }).then(function() {
    // ── Migración única: créditos existentes (sin contratoFirmado) → confirmados automáticamente ──
    // Los créditos creados ANTES de esta versión ya tienen historial contable,
    // así que se marcan como firmados sin tocar nada más.
    (function _migrarContratoFirmado(){
      try {
        (S.creds||[]).forEach(function(c){
          if(c && !c.eliminado && c.contratoFirmado === undefined){
            c.contratoFirmado = true;
            c.fechaContratoFirmado = c.fecha || (c.creado||'').split('T')[0] || '';
            if(DB && DB.updateCred) DB.updateCred(c.id, { contratoFirmado: true, fechaContratoFirmado: c.fechaContratoFirmado });
          }
        });
      } catch(e){ console.warn('migrarContratoFirmado error:', e); }
    })();
    renderSidebar();
    // Vendedor Concesionario → calculadora (motos). Otros roles → dashboard.
    var paginaInicial = isVendedorConcesionarioRole() ? 'motos' : 'dash';
    if(!hasModuleAccess(paginaInicial)){
      // Fallback: ir al primer módulo accesible
      var candidatos = ['motos','clientes','creditos','dash','centro'];
      paginaInicial = candidatos.find(function(p){ return hasModuleAccess(p); }) || 'dash';
    }
    nav(paginaInicial);
    updateBadge();
    startRealtime();
    iniciarListenerSolicitudes();
    // BCV Auto — actualizar tasa diariamente si es necesario
    if(typeof bcvAutoInit === 'function') setTimeout(bcvAutoInit, 1500);
    var isMob = window.innerWidth <= 820;
    var mobBar = $('mobile-topbar');
    var deskBar = $('desktop-topbar');
    if (mobBar) mobBar.style.display = isMob ? 'flex' : 'none';
    if (deskBar) deskBar.style.display = isMob ? 'none' : 'flex';
  }).catch(function(e) {
    console.warn('Error cargando datos:', e);
    renderSidebar();
    var paginaInicial = isVendedorConcesionarioRole() ? 'motos' : 'dash';
    nav(paginaInicial);
    updateBadge();
    startRealtime();
    iniciarListenerSolicitudes();
  });
}

// ── AUTENTICACIÓN ──────────────────────────────────────────
var _doLoginInProgress = false;
async function doLogin() {
  // Guard: prevent concurrent/loop calls
  if (_doLoginInProgress) return;
  _doLoginInProgress = true;
  setTimeout(function(){ _doLoginInProgress = false; }, 4000);

  // Read from whichever login form is visible
  var loginScreen = $('login-screen');
  var inviteScreen = $('invite-screen');
  var usingInvite = inviteScreen && inviteScreen.style.display !== 'none';
  var email = usingInvite
    ? (($('l_user_inv') || {}).value || '').trim()
    : (($('l_user') || {}).value || '').trim();
  var pass = usingInvite
    ? (($('l_pass_inv') || {}).value || '').trim()
    : (($('l_pass') || {}).value || '').trim();
  var errEl = usingInvite ? $('login-err-inv') : $('login-err');
  if (errEl) errEl.style.display = 'none';

  // Validate email before hitting Firebase
  if (auth && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errEl) { errEl.textContent = 'El email no tiene un formato válido.'; errEl.style.display = 'block'; }
    _doLoginInProgress = false;
    return;
  }

  if (!email || !pass) {
    if (errEl) { errEl.textContent = 'Ingresa tu email y contraseña.'; errEl.style.display = 'block'; }
    _doLoginInProgress = false;
    return;
  }

  if (!auth) {
    if (errEl) {
      errEl.textContent = 'Firebase Auth no esta disponible. Revisa la configuracion de Firebase.';
      errEl.style.display = 'block';
    }
    _doLoginInProgress = false;
    return;
  }
  showLoader('Iniciando sesión...', '');
  auth.signInWithEmailAndPassword(email, pass)
    .then(function() { hideLoader(); _doLoginInProgress = false; })
    .catch(function(e) {
      hideLoader();
      _doLoginInProgress = false;
      if (errEl) {
        if (e.code === 'auth/network-request-failed') {
          errEl.textContent = 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
          errEl.style.background = 'rgba(232,152,10,0.08)';
          errEl.style.borderColor = 'rgba(232,152,10,0.3)';
          errEl.style.color = 'var(--amber)';
        } else if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
          errEl.textContent = 'Usuario o contraseña incorrectos.';
          errEl.style.background = '';
          errEl.style.borderColor = '';
          errEl.style.color = '';
        } else {
          errEl.textContent = 'Error: ' + (e.message || e.code);
          errEl.style.background = '';
          errEl.style.borderColor = '';
          errEl.style.color = '';
        }
        errEl.style.display = 'block';
      }
      console.warn('Login error:', e.code, e.message);
    });
}
window.doLogin = doLogin;

// Restablecer contraseña desde la pantalla de login (envía email de reset).
// Clave para recuperar cuentas "huérfanas": al resetear y entrar, el doc de
// Firestore se recrea automáticamente en onAuthStateChanged.
function resetPasswordLogin() {
  var email = (($('l_user') || {}).value || '').trim();
  var errEl = $('login-err');
  if (errEl) { errEl.style.background=''; errEl.style.borderColor=''; errEl.style.color=''; }
  if (!auth) {
    if (errEl) { errEl.textContent = 'Firebase Auth no está disponible.'; errEl.style.display='block'; }
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errEl) { errEl.textContent = 'Escribe tu email arriba y toca de nuevo «¿Olvidaste tu contraseña?».'; errEl.style.display='block'; }
    return;
  }
  showLoader('Enviando email de recuperación...', '');
  auth.sendPasswordResetEmail(email)
    .then(function() {
      hideLoader();
      if (errEl) {
        errEl.textContent = 'Te enviamos un correo a ' + email + ' para restablecer tu contraseña. Revisa tu bandeja (y la carpeta de spam).';
        errEl.style.background = 'rgba(0,184,118,0.08)';
        errEl.style.borderColor = 'rgba(0,184,118,0.3)';
        errEl.style.color = 'var(--green)';
        errEl.style.display = 'block';
      }
    })
    .catch(function(e) {
      hideLoader();
      if (errEl) {
        errEl.textContent = (e.code === 'auth/user-not-found')
          ? 'No hay ninguna cuenta con ese email.'
          : ('Error: ' + (e.message || e.code));
        errEl.style.display = 'block';
      }
      console.warn('Reset password error:', e.code, e.message);
    });
}
window.resetPasswordLogin = resetPasswordLogin;


// ══════════════════════════════════════════════════
// BACKUP — Exportar e Importar datos
// ══════════════════════════════════════════════════


function showAdminProfile() {
  var user = S.currentUser || {};
  var nombre = user.nombre || user.email || 'Usuario';
  var email = (auth && auth.currentUser) ? auth.currentUser.email : (user.email || '—');
  var rol = user.cargo || user.rol || 'Administrador';
  var inicial = nombre.charAt(0).toUpperCase();

  // ── Stats del usuario actual ──
  var solCreadas = S.creds.filter(function(c){ return c.creadoPor === nombre; }).length;
  var misPagos = S.pagos.filter(function(p){ return !p.eliminado && p.cobrador === nombre; });
  var misPagosConf = misPagos.filter(function(p){ return p.estado==='confirmado'; });
  var pagosReg = misPagos.length;
  var totalCobrado = misPagosConf.reduce(function(a,p){ return a+(parseFloat(p.monto)||0); }, 0);
  var credsActivos = S.creds.filter(function(c){ return !c.eliminado && c.estado === 'activo'; }).length;
  var misClientes= new Set(misPagosConf.map(function(p){ return p.cli; })).size;

  // ── Chart: actividad últimas 12 semanas (pagos cobrados por el user) ──
  var hoyProf = new Date(); hoyProf.setHours(0,0,0,0);
  var semProf = [];
  for(var i=11;i>=0;i--){
    var ini = new Date(hoyProf); ini.setDate(hoyProf.getDate() - (i*7 + hoyProf.getDay()));
    var fin = new Date(ini); fin.setDate(ini.getDate()+6);
    var iniS = fechaLocalISO(ini);
    var finS = fechaLocalISO(fin);
    var tot = misPagosConf
      .filter(function(p){ return p.fecha>=iniS && p.fecha<=finS; })
      .reduce(function(a,p){ return a+p.monto; }, 0);
    semProf.push({lbl: String(ini.getDate()).padStart(2,'0')+'/'+String(ini.getMonth()+1).padStart(2,'0'), tot:tot});
  }
  var maxSemProf = Math.max(1, ...semProf.map(function(s){ return s.tot; }));

  // ── Top 5 clientes más atendidos ──
  var topClientesMap = {};
  misPagosConf.forEach(function(p){
    if(!topClientesMap[p.cli]) topClientesMap[p.cli] = {nombre:p.cli, total:0, count:0};
    topClientesMap[p.cli].total += p.monto;
    topClientesMap[p.cli].count++;
  });
  var topClientesList = Object.values(topClientesMap).sort(function(a,b){ return b.total-a.total; }).slice(0,5);

  // ── Actividad mes actual vs mes anterior ──
  var mesAct = hoyProf.getFullYear()+'-'+String(hoyProf.getMonth()+1).padStart(2,'0');
  var mesAnt = new Date(hoyProf.getFullYear(), hoyProf.getMonth()-1, 1);
  var mesAntK = mesAnt.getFullYear()+'-'+String(mesAnt.getMonth()+1).padStart(2,'0');
  var pagosMesAct = misPagosConf.filter(function(p){ return p.fecha && p.fecha.startsWith(mesAct); });
  var pagosMesAnt = misPagosConf.filter(function(p){ return p.fecha && p.fecha.startsWith(mesAntK); });
  var cobradoMesAct = pagosMesAct.reduce(function(a,p){return a+p.monto;}, 0);
  var cobradoMesAnt = pagosMesAnt.reduce(function(a,p){return a+p.monto;}, 0);
  var pctCrecimiento = cobradoMesAnt > 0 ? Math.round((cobradoMesAct-cobradoMesAnt)/cobradoMesAnt*100) : (cobradoMesAct>0?100:0);

  // Rol color
  var rolColors = {Administrador:'var(--p1)',Gerente:'var(--p2)',Empleado:'var(--green)',Vendedor:'var(--green)',Cobrador:'var(--green)',Contador:'var(--ink3)'};
  var rolColor = rolColors[rol] || 'var(--p1)';

  // Módulos accesibles
  var perms = isAdminUser() ? Object.keys(PGL) : (user.permisos || []);
  var modList = perms.filter(function(k){ return PGL[k]; }).map(function(k){ return PGL[k]; });

  // Overlay fullscreen
  var overlay = document.getElementById('profile-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'profile-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2000;background:var(--bg);overflow-y:auto;display:none';
    document.body.appendChild(overlay);
  }
  document.body.style.overflow = 'hidden';
  overlay.style.display = 'block';

  overlay.innerHTML =
    // Header
    '<div style="position:sticky;top:0;z-index:10;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-bottom:1px solid var(--rim);padding:0 20px;height:56px;display:flex;align-items:center;gap:12px">'
    + '<button onclick="document.getElementById(\'profile-overlay\').style.display=\'none\';document.body.style.overflow=\'\'" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--rim);background:var(--surf2);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:var(--ink3);flex-shrink:0">✕</button>'
    + '<div style="font-size:15px;font-weight:800;letter-spacing:-.3px;flex:1">Mi Perfil</div>'
    + '<button class="btn btn-d btn-sm" onclick="doLogout()" style="gap:6px">Cerrar sesión</button>'
    + '</div>'

    // Body
    + '<div style="max-width:900px;margin:0 auto;padding:24px 20px 80px">'

    // Avatar card con gradient
    + '<div style="background:var(--grad);border-radius:16px;padding:24px;margin-bottom:14px;display:flex;align-items:center;gap:20px;color:#fff;box-shadow:0 10px 40px rgba(37,99,235,.2)">'
      + '<div style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.25);backdrop-filter:blur(10px);border:3px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:#fff;flex-shrink:0">'+ inicial +'</div>'
      + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:22px;font-weight:900;letter-spacing:-.4px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+ nombre +'</div>'
        + '<div style="font-size:13px;opacity:.85;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+ email +'</div>'
        + '<span style="display:inline-block;background:rgba(255,255,255,.25);color:#fff;font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;letter-spacing:.3px;backdrop-filter:blur(10px)">'+ rol.toUpperCase() +'</span>'
      + '</div>'
    + '</div>'

    // 6 KPI stats
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin-bottom:14px">'
      + _profKpi('Cobrado total', fmt(totalCobrado), 'var(--green)', 'TOT')
      + _profKpi('Este mes', fmt(cobradoMesAct), pctCrecimiento>=0?'var(--p1)':'var(--red)', (pctCrecimiento>=0?'↑':'↓')+' '+Math.abs(pctCrecimiento)+'%')
      + _profKpi('Pagos registrados', pagosReg, 'var(--p1)', 'PAG')
      + _profKpi('Solicitudes creadas', solCreadas, 'var(--amber)', 'SOL')
      + _profKpi('Clientes atendidos', misClientes, 'var(--green)', 'CLI')
      + _profKpi('Créditos activos', credsActivos, 'var(--p1)', 'ACT')
    + '</div>'

    // ── Mi información editable ──
    + '<div class="card" style="margin-bottom:14px;padding:18px 20px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
        + '<div><div style="font-size:14px;font-weight:800;color:var(--ink);letter-spacing:-.3px">Mi información</div>'
        + '<div style="font-size:11.5px;color:var(--ink3);margin-top:2px">Datos que puedes editar tú mismo</div></div>'
        + '<button id="prof-save-btn" class="btn btn-p btn-sm" onclick="guardarMiPerfil()" style="display:none">Guardar cambios</button>'
      + '</div>'
      // ─── Datos personales ───
      + '<div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin-bottom:10px">Datos personales</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;margin-bottom:18px">'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Nombre completo</label>'
        +   '<input class="fi" id="prof-nombre" type="text" value="'+(user.nombre||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="Tu nombre completo"></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Cédula</label>'
        +   '<input class="fi" id="prof-cedula" type="text" value="'+(user.cedula||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="V-12345678"></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Género</label>'
        +   '<select class="fs" id="prof-genero" onchange="profProfileChanged()">'
        +     '<option value=""'+(!user.genero?' selected':'')+'>— Selecciona —</option>'
        +     '<option value="M"'+(user.genero==='M'?' selected':'')+'>Masculino</option>'
        +     '<option value="F"'+(user.genero==='F'?' selected':'')+'>Femenino</option>'
        +   '</select>'
        +   '<div style="font-size:10.5px;color:var(--ink3);margin-top:4px;line-height:1.4">Personaliza el color del cumpleaños.</div></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Cumpleaños</label>'
        +   '<input class="fi" id="prof-cumple" type="date" value="'+(user.cumpleanos||user.fechaNacimiento||'')+'" oninput="profProfileChanged()">'
        +   '<div style="font-size:10.5px;color:var(--ink3);margin-top:4px;line-height:1.4">El día que cumplas se lanzará un cotillón.</div></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Estado civil</label>'
        +   '<select class="fs" id="prof-estadocivil" onchange="profProfileChanged()">'
        +     '<option value=""'+(!user.estadoCivil?' selected':'')+'>— Selecciona —</option>'
        +     '<option value="soltero"'+(user.estadoCivil==='soltero'?' selected':'')+'>Soltero/a</option>'
        +     '<option value="casado"'+(user.estadoCivil==='casado'?' selected':'')+'>Casado/a</option>'
        +     '<option value="union"'+(user.estadoCivil==='union'?' selected':'')+'>Unión estable</option>'
        +     '<option value="divorciado"'+(user.estadoCivil==='divorciado'?' selected':'')+'>Divorciado/a</option>'
        +     '<option value="viudo"'+(user.estadoCivil==='viudo'?' selected':'')+'>Viudo/a</option>'
        +   '</select></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Sede / Oficina</label>'
        +   '<input class="fi" id="prof-sede" type="text" value="'+(user.sede||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="EK Bello Monte, Boleita..."></div>'
      + '</div>'

      // ─── Contacto ───
      + '<div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin-bottom:10px">Contacto</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;margin-bottom:18px">'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Teléfono</label>'
        +   '<input class="fi" id="prof-tel" type="tel" value="'+(user.tel||user.telefono||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="+58 414 ..."></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Tel. alternativo</label>'
        +   '<input class="fi" id="prof-tel2" type="tel" value="'+(user.tel2||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="Casa o familiar (opcional)"></div>'
        + '<div class="fg" style="grid-column:1 / -1"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Dirección</label>'
        +   '<input class="fi" id="prof-direccion" type="text" value="'+(user.direccion||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="Sector, calle, residencia, piso..."></div>'
        + '<div class="fg" style="grid-column:1 / -1"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Contacto de emergencia</label>'
        +   '<input class="fi" id="prof-emergencia" type="text" value="'+(user.emergencia||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="Nombre y teléfono"></div>'
        + '<div class="fg" style="grid-column:1 / -1"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Email (no editable)</label>'
        +   '<input class="fi" type="email" value="'+email+'" disabled style="background:var(--surf2);color:var(--ink3)"></div>'
      + '</div>'

      // ─── Redes sociales ───
      + '<div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin-bottom:10px">Redes sociales</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Instagram</label>'
        +   '<input class="fi" id="prof-instagram" type="text" value="'+(user.instagram||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="@tuusuario"></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">Facebook</label>'
        +   '<input class="fi" id="prof-facebook" type="text" value="'+(user.facebook||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="usuario o URL"></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">TikTok</label>'
        +   '<input class="fi" id="prof-tiktok" type="text" value="'+(user.tiktok||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="@tuusuario"></div>'
        + '<div class="fg"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">X (Twitter)</label>'
        +   '<input class="fi" id="prof-twitter" type="text" value="'+(user.twitter||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="@tuusuario"></div>'
        + '<div class="fg" style="grid-column:1 / -1"><label style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px;display:block">LinkedIn</label>'
        +   '<input class="fi" id="prof-linkedin" type="text" value="'+(user.linkedin||'').replace(/"/g,'&quot;')+'" oninput="profProfileChanged()" placeholder="linkedin.com/in/tuusuario"></div>'
      + '</div>'
    + '</div>'

    // Chart: cobros últimas 12 semanas
    + '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:14px;padding:18px;margin-bottom:14px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
        + '<div><div style="font-size:14px;font-weight:800">Mi actividad de cobros</div><div style="font-size:11.5px;color:var(--ink3)">Últimas 12 semanas</div></div>'
        + '<div style="font-weight:900;font-size:15px;color:var(--green)">'+ fmt(semProf.reduce(function(a,s){return a+s.tot;}, 0)) +'</div>'
      + '</div>'
      + (misPagosConf.length > 0
        ? '<div style="display:flex;align-items:flex-end;gap:4px;height:140px">'
          + semProf.map(function(s,i){
              return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">'
                + '<div style="font-size:9px;font-weight:800;color:'+(s.tot>0?'var(--green)':'var(--ink3)')+';height:14px">'+(s.tot>0?fmt(s.tot).replace('$','$').slice(0,7):'')+'</div>'
                + '<div style="flex:1;width:100%;display:flex;align-items:flex-end">'
                  + '<div style="width:100%;background:'+(i===semProf.length-1?'var(--p1)':s.tot>0?'var(--green)':'var(--rim)')+';border-radius:4px 4px 0 0;height:'+(s.tot>0?Math.max(8,Math.round(s.tot/maxSemProf*110)):4)+'px"></div>'
                + '</div>'
                + '<div style="font-size:9px;color:var(--ink3);font-weight:600">'+s.lbl+'</div>'
              + '</div>';
            }).join('')
        + '</div>'
        : '<div style="text-align:center;padding:40px 0;color:var(--ink3);font-size:12.5px">Aún no tienes pagos registrados a tu nombre</div>')
    + '</div>'

    // Top clientes
    + (topClientesList.length > 0
      ? '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:14px;padding:18px;margin-bottom:14px">'
        + '<div style="font-size:14px;font-weight:800;margin-bottom:12px">Tus top 5 clientes <span style="color:var(--ink3);font-weight:500;font-size:11.5px">· por monto cobrado</span></div>'
        + topClientesList.map(function(c,i){
            var pct = totalCobrado>0 ? Math.round(c.total/totalCobrado*100) : 0;
            return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--rim2)">'
              + '<div style="width:28px;height:28px;border-radius:8px;background:var(--grad);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;flex-shrink:0">'+(i+1)+'</div>'
              + '<div style="flex:1;min-width:0">'
                + '<div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.nombre+'</div>'
                + '<div style="font-size:10.5px;color:var(--ink3)">'+c.count+' pago'+(c.count!==1?'s':'')+'</div>'
              + '</div>'
              + '<div style="text-align:right;flex-shrink:0">'
                + '<div style="font-size:13.5px;font-weight:900;color:var(--green)">'+fmt(c.total)+'</div>'
                + '<div style="font-size:10.5px;color:var(--ink3)">'+pct+'% de total</div>'
              + '</div>'
            + '</div>';
          }).join('')
      + '</div>'
      : '')

    // Módulos accesibles
    + '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:14px;padding:18px;margin-bottom:14px">'
      + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--ink3);margin-bottom:12px">Módulos con acceso</div>'
      + (isAdminUser()
          ? '<div style="display:flex;flex-wrap:wrap;gap:6px"><span style="background:var(--gs);color:var(--p1);font-size:11.5px;font-weight:700;padding:4px 12px;border-radius:20px;border:1px solid var(--rim2)">Acceso total al sistema</span></div>'
          : (modList.length
            ? '<div style="display:flex;flex-wrap:wrap;gap:6px">'
              + modList.map(function(m){ return '<span style="background:var(--surf2);color:var(--ink2);font-size:11.5px;font-weight:600;padding:4px 11px;border-radius:20px;border:1px solid var(--rim)">'+m+'</span>'; }).join('')
              + '</div>'
            : '<div style="color:var(--ink3);font-size:13px">Solo nueva solicitud</div>'))
    + '</div>'

    // Info de sesión
    + '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:14px;padding:18px;margin-bottom:14px">'
      + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--ink3);margin-bottom:12px">Información de sesión</div>'
      + [
          ['Firebase', db ? '● Conectado · '+(FIREBASE_CONFIG.projectId||'firebase') : '● Sin conexión', db ? 'var(--green)' : 'var(--red)'],
          ['Email', email, 'var(--ink)'],
          ['UID', (auth && auth.currentUser && auth.currentUser.uid) ? auth.currentUser.uid.slice(0,20)+'…' : '--', 'var(--ink3)'],
          ['Último acceso', (auth && auth.currentUser && auth.currentUser.metadata && auth.currentUser.metadata.lastSignInTime) ? new Date(auth.currentUser.metadata.lastSignInTime).toLocaleString('es-VE') : '—', 'var(--ink3)'],
        ].map(function(row){
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--rim2)">'
            + '<span style="font-size:12.5px;color:var(--ink3)">'+ row[0] +'</span>'
            + '<span style="font-size:12.5px;font-weight:600;color:'+ row[2] +'">'+ row[1] +'</span>'
            + '</div>';
        }).join('')
    + '</div>'

    // Cambiar contraseña
    + '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:14px;padding:18px;margin-bottom:14px">'
      + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--ink3);margin-bottom:14px">Cambiar Contraseña</div>'
      + '<div style="display:flex;flex-direction:column;gap:10px">'
        + '<div class="fg"><label>Contraseña actual</label><input id="prof-pass-current" type="password" class="fi" placeholder="Tu contraseña actual" autocomplete="current-password" style="width:100%"></div>'
        + '<div class="fg"><label>Nueva contraseña</label><input id="prof-pass1" type="password" class="fi" placeholder="Mínimo 6 caracteres" autocomplete="new-password" style="width:100%"></div>'
        + '<div class="fg"><label>Confirmar contraseña</label><input id="prof-pass2" type="password" class="fi" placeholder="Repetir contraseña" autocomplete="new-password" style="width:100%"></div>'
        + '<div id="prof-msg" style="display:none;font-size:12px;padding:9px 12px;border-radius:9px"></div>'
        + '<button class="btn btn-p btn-sm" onclick="cambiarPasswordPerfil()" style="align-self:flex-start">Actualizar contraseña</button>'
      + '</div>'
    + '</div>'

    // Cerrar sesión
    + '<button class="btn btn-d" onclick="doLogout()" style="width:100%;justify-content:center;padding:12px;border-radius:12px;font-size:13.5px">Cerrar sesión</button>'

    + '</div>'; // end body
}

function _profKpi(label, val, color, badge){
  return '<div class="stat" style="border-left:3px solid '+color+'">'
    + '<div class="st-ic" style="background:var(--gs);color:'+color+';font-size:9px;font-weight:800">'+badge+'</div>'
    + '<div class="st-v" style="color:'+color+';font-size:17px">'+val+'</div>'
    + '<div class="st-l">'+label+'</div>'
  + '</div>';
}

function cambiarPasswordPerfil() {
  var pCur = ($('prof-pass-current') || {}).value || '';
  var p1 = ($('prof-pass1') || {}).value || '';
  var p2 = ($('prof-pass2') || {}).value || '';
  var msg = $('prof-msg');
  function showMsg(txt, ok) {
    if (!msg) return;
    msg.style.display = 'block';
    msg.style.background = ok ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)';
    msg.style.color = ok ? '#27ae60' : '#e74c3c';
    msg.textContent = txt;
  }
  if (!pCur) return showMsg(' Ingresá tu contraseña actual', false);
  if (p1.length < 6) return showMsg(' La contraseña debe tener al menos 6 caracteres', false);
  if (p1 !== p2) return showMsg('Las contraseñas no coinciden', false);
  var user = auth && auth.currentUser;
  if (!user) return showMsg(' No hay sesión activa', false);
  if (!user.email) return showMsg(' El usuario no tiene email asociado', false);

  showMsg('Verificando…', true);

  // Reautenticar con la contraseña actual y luego actualizar
  var credential = firebase.auth.EmailAuthProvider.credential(user.email, pCur);
  user.reauthenticateWithCredential(credential)
    .then(function() {
      return user.updatePassword(p1);
    })
    .then(function() {
      showMsg('✓ Contraseña actualizada correctamente', true);
      if ($('prof-pass-current')) $('prof-pass-current').value = '';
      if ($('prof-pass1')) $('prof-pass1').value = '';
      if ($('prof-pass2')) $('prof-pass2').value = '';
    })
    .catch(function(e) {
      var code = e && e.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        showMsg(' La contraseña actual es incorrecta', false);
      } else if (code === 'auth/too-many-requests') {
        showMsg(' Demasiados intentos. Esperá un momento e intentá de nuevo.', false);
      } else if (code === 'auth/weak-password') {
        showMsg(' La nueva contraseña es demasiado débil', false);
      } else if (code === 'auth/network-request-failed') {
        showMsg(' Error de conexión. Verificá tu internet.', false);
      } else {
        showMsg(' ' + (e.message || 'Error al actualizar'), false);
      }
    });
}

function doLogout() {
  // Log antes de cerrar (mientras S.currentUser aún existe)
  try { if(typeof logActividad === 'function') logActividad('logout','auth',(S.currentUser&&S.currentUser.uid)||'',null); } catch(e){}
  // Cerrar perfil overlay si está abierto
  var overlay = document.getElementById('profile-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  if(typeof stopRealtime === 'function') stopRealtime();
  if (auth) {
    auth.signOut();
  } else {
    location.reload();
  }
}

// ── Mobile Menu ──────────────────────────
function openMobileMenu(){
  var sidebarEl = document.querySelector('.sb') || document.querySelector('.sidebar');
  var ov = $('sb-overlay');
  if(sidebarEl) { sidebarEl.classList.add('mob-open'); sidebarEl.classList.add('open'); }
  if(ov) { ov.style.display = 'block'; ov.classList.add('open'); }
  document.body.style.overflow = 'hidden';
}
function closeMobileMenu(){
  var sidebarEl = document.querySelector('.sb') || document.querySelector('.sidebar');
  var ov = $('sb-overlay');
  if(sidebarEl) { sidebarEl.classList.remove('mob-open'); sidebarEl.classList.remove('open'); }
  if(ov) { ov.style.display = 'none'; ov.classList.remove('open'); }
  document.body.style.overflow = '';
}

// Cerrar menú automáticamente al navegar en móvil
(function(){
  if(typeof window.nav !== 'function') return;
  var _origNav = window.nav;
  window.nav = function(){
    var r = _origNav.apply(this, arguments);
    if(window.innerWidth <= 820) closeMobileMenu();
    return r;
  };
})();

// ══════════════════════════════════════════
// MOBILE BOTTOM NAV & SEARCH
// ══════════════════════════════════════════
function mbbSelect(page){
  document.querySelectorAll('.mbb-btn').forEach(function(b){ b.classList.remove('on'); });
  var btn = $('mbb-'+page);
  if(btn) btn.classList.add('on');
}

function updateMobileNav(){
  var page = S.page;

  // Empleado (incluye legacy Cobrador/Vendedor): bottom nav especializado
  var mbb = $('mob-bottom-bar');
  if(mbb){
    if(isEmpleadoRole()){
      mbb.innerHTML = ''
        +'<button class="mbb-btn'+(page==='dash'?' on':'')+'" onclick="nav(\'dash\');mbbSelect(\'dash\')">'
        +'<span class="mbb-ic">DB</span><span>Inicio</span></button>'
        +'<button class="mbb-btn'+(page==='pagos'?' on':'')+'" onclick="nav(\'pagos\');mbbSelect(\'pagos\')">'
        +'<span class="mbb-ic">PAG</span><span>Cobrar</span></button>'
        +'<button class="mbb-btn" onclick="openAddCred()" style="color:var(--p1)">'
        +'<span class="mbb-ic" style="background:var(--p1);color:#fff">＋</span><span>Solicitud</span></button>'
        +'<button class="mbb-btn'+(page==='creditos'?' on':'')+'" onclick="nav(\'creditos\');mbbSelect(\'creditos\')">'
        +'<span class="mbb-ic">SOL</span><span>Solicitudes</span></button>';
      return;
    }
  }

  var mapped = {dash:'dash', clientes:'clientes', creditos:'creditos'};
  mbbSelect(mapped[page] || 'more');
}

function openMobSearch(){
  var el = $('mob-search-overlay');
  if(el){ el.classList.add('open'); setTimeout(function(){ var inp=$('mob-srch-input'); if(inp) inp.focus(); },100); }
}

function closeMobSearch(){
  var el = $('mob-search-overlay');
  if(el) el.classList.remove('open');
  var inp = $('mob-srch-input');
  if(inp) inp.value = '';
  var res = $('mob-srch-results');
  if(res) res.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--ink3);font-size:13px">Escribe para buscar en todo el sistema</div>';
}

function mobSearch(q){
  var val = q.trim().toLowerCase();
  var res = $('mob-srch-results');
  if(!res) return;
  if(!val){
    res.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--ink3);font-size:13px">Escribe para buscar en todo el sistema</div>';
    return;
  }
  var results = [];
  S.clientes.filter(c=>!c.eliminado).forEach(function(c){
    if((c.nombre+' '+c.cedula+' '+c.tel).toLowerCase().includes(val))
      results.push({icon:'CLI',titulo:c.nombre,sub:c.cedula+' · '+c.tel,fn:function(){ closeMobSearch(); nav('clientes'); setTimeout(function(){verCliente(c.id);},100); }});
  });
  S.creds.filter(c=>!c.eliminado).forEach(function(c){
    if((c.id+' '+c.cli+' '+c.modelo+' '+(c.placa||'')).toLowerCase().includes(val))
      results.push({icon:'≡',titulo:c.cli+' — '+c.modelo,sub:c.id+(c.placa&&c.placa!=='—'?' · '+c.placa:'')+' · '+c.estado,fn:function(){ closeMobSearch(); nav('creditos'); setTimeout(function(){openAmort(c.id);},100); }});
  });
  S.motos.filter(m=>!m.eliminado).forEach(function(m){
    if((m.modelo+' '+(m.vin||'')+' '+(m.cliente||'')+' '+(m.placa||'')).toLowerCase().includes(val))
      results.push({icon:'MOT',titulo:m.modelo,sub:(m.placa&&m.placa!=='—'?m.placa+' · ':'')+(m.vin||'Sin VIN')+' · '+m.estado,fn:function(){ closeMobSearch(); nav('motos'); }});
  });
  S.pagos.filter(p=>!p.eliminado).forEach(function(p){
    if((p.cli+' '+p.id).toLowerCase().includes(val))
      results.push({icon:'PAG',titulo:p.cli,sub:fmt(p.monto)+' · '+p.fecha,fn:function(){ closeMobSearch(); nav('pagos'); }});
  });
  window._mobSrchFns = results.map(function(r){ return r.fn; });
  if(!results.length){
    res.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--ink3);font-size:13px">Sin resultados para "'+q+'"</div>';
    return;
  }
  res.innerHTML = results.slice(0,15).map(function(r,i){
    return '<div onclick="window._mobSrchFns['+i+']()" style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid var(--rim);cursor:pointer;-webkit-tap-highlight-color:transparent" onmousedown="event.preventDefault()">'+
      '<div style="width:36px;height:36px;border-radius:10px;background:var(--gs);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--p1);font-family:var(--fm);flex-shrink:0">'+r.icon+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:14px;font-weight:600;color:var(--ink)">'+r.titulo+'</div>'+
        '<div style="font-size:11.5px;color:var(--ink3);margin-top:1px">'+r.sub+'</div>'+
      '</div>'+
      '<span style="color:var(--ink3);font-size:18px;font-weight:200">›</span>'+
    '</div>';
  }).join('');
}

// Responsive: ajustar topbars en resize
window.addEventListener('resize', function(){
  if (!$('app-root') || $('app-root').style.display === 'none') return;
  var isMob = window.innerWidth <= 820;
  var mobBar = $('mobile-topbar');
  var deskBar = $('desktop-topbar');
  if (mobBar) mobBar.style.display = isMob ? 'flex' : 'none';
  if (deskBar) deskBar.style.display = isMob ? 'none' : 'flex';
});

setTimeout(function(){ try{ if(window.S && Array.isArray(S.clientes) && Array.isArray(S.creds)) syncTodosEstadosClientes(); }catch(e){} }, 1200);

// ══════════════════════════════════════════════════════════════
// AUTOCAPITALIZACIÓN GLOBAL DE FORMULARIOS
// Aplica en TODA la app mientras se escribe (solicitudes, clientes,
// créditos, modales): la primera letra de cada palabra en mayúscula.
// Placas, VIN, seriales, chasis, GPS y RIF van en MAYÚSCULAS completas.
// NO toca: emails, contraseñas, buscadores, URLs, números, fechas ni
// textareas (notas/observaciones se escriben libres).
// Delegado en document para cubrir también campos creados dinámicamente.
// ══════════════════════════════════════════════════════════════
document.addEventListener('input', function(e){
  var el = e.target;
  if(!el || (el.tagName||'').toLowerCase() !== 'input') return;
  if(((el.type||'text').toLowerCase()) !== 'text') return;
  var key = ((el.id||'')+' '+(el.name||'')+' '+(el.placeholder||'')).toLowerCase();
  if(/mail|correo|clave|pass|url|http|busca|search|srch/.test(key)) return;
  if(/q$/i.test(el.id||'')) return; // buscadores tipo cuotasQ / pagosQ
  var v = el.value; if(!v) return;
  var selS = el.selectionStart, selE = el.selectionEnd;
  var nv;
  if(/placa|vin|serial|chasis|gps|rif/.test(key)){
    nv = v.toUpperCase();
  } else {
    // Primera letra de cada palabra en mayúscula (respeta acrónimos ya escritos)
    nv = v.replace(/(^|[\s.\-\/("'])([a-záéíóúñü])/g, function(m, pre, ch){ return pre + ch.toUpperCase(); });
  }
  if(nv !== v){
    el.value = nv;
    try{ el.setSelectionRange(selS, selE); }catch(_e){}
  }
}, true);
