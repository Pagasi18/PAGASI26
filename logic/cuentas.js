// Logica de cuentas, movimientos, historial y pendientes. Extraido mecanicamente de assets/pagasi-app.js.
window._cuentasTab = window._cuentasTab || 'cuentas';
window._cuentasSubTab = window._cuentasSubTab || 'cobrar';
window._cuentasMes = window._cuentasMes || (function(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1); })();

function switchCuentasTab(t){
  window._cuentasDetalle=null; window._cuentasTab=t; nav('cuentas');
}
function switchCuentasSubTab(t){
  window._cuentasDetalle=null; window._cuentasSubTab=t; nav('cuentas');
}
function setCuentasMes(v){
  window._cuentasMes=v; nav('cuentas');
}

// El monto de un movimiento puede venir como TEXTO ('100') si es viejo, importado o lo
// escribio un robot. Sin convertir, JavaScript concatena en vez de sumar y el saldo sale
// disparatado: un deposito '100', otro de 50 y un retiro de 30 daban 10020 en vez de 120
// (punto 31, 22-sep-2026). Todo el archivo suma por aqui.
function montoMov(m){ var v = parseFloat(m && m.monto); return isNaN(v) ? 0 : Math.round(v*100)/100; }

// ══════════════════════════════════════════════════════════════════
// EL DINERO QUE ESTA EN PODER DE LOS CONCESIONARIOS
// ══════════════════════════════════════════════════════════════════
// 23-sep-2026, Adam: "los anticipos aparecen como un egreso de la cuenta, pero en
// realidad siguen siendo un activo de pagasi, y solo se deduce de la cuenta cuando
// prestamos dinero en el concesionario".
// Tiene razon. Cuando Pagasi le manda $10.000 a una sede, el dinero SALE del banco
// — eso es cierto y el saldo de Binance tiene que bajar — pero Pagasi no perdio
// $10.000: los tiene en poder del concesionario y siguen siendo suyos. Registrarlo
// como una salida a secas hacia ver a la empresa mas pobre de lo que es.
// Por eso el anticipo no sale del sistema: se MUEVE a esta cuenta, que es donde el
// dinero espera. De ahi se descuenta cuando sale una moto, que es el momento en que
// deja de ser efectivo y se convierte en un credito por cobrar.
var CUENTA_ANTICIPOS = 'Anticipos en concesionarios';

// Lo que queda del anticipo de UNA sede: lo que se le mando menos lo que ya se uso
// en motos suyas.
function saldoAnticipoDe(concesionarioId){
  if(!concesionarioId) return 0;
  var s = 0;
  (S.movimientos||[]).forEach(function(m){
    if(!m || m.eliminado) return;
    if(String(m.concesionarioId||'') !== String(concesionarioId)) return;
    var v = montoMov(m);
    if(m.cuentaDestino === CUENTA_ANTICIPOS) s += v;
    if(m.cuentaOrigen  === CUENTA_ANTICIPOS) s -= v;
  });
  return Math.round(s*100)/100;
}
// Todas las sedes que tienen dinero de Pagasi esperando, de mayor a menor.
function anticiposConSaldo(){
  var por = {};
  (S.movimientos||[]).forEach(function(m){
    if(!m || m.eliminado || !m.concesionarioId) return;
    if(m.cuentaDestino !== CUENTA_ANTICIPOS && m.cuentaOrigen !== CUENTA_ANTICIPOS) return;
    por[String(m.concesionarioId)] = true;
  });
  return Object.keys(por).map(function(cid){
    var c = (typeof _concGetById==='function') ? (_concGetById(cid)||{}) : {};
    return { id: cid, nombre: c.nombre || cid, saldo: saldoAnticipoDe(cid) };
  }).filter(function(x){ return x.saldo > 0.004; })
    .sort(function(a,b){ return b.saldo - a.saldo; });
}

function saldoCuenta(nombre){
  var s=0;
  S.movimientos.filter(function(m){return !m.eliminado;}).forEach(function(m){
    var v = montoMov(m);
    if(m.cuentaDestino===nombre) s+=v;
    if(m.cuentaOrigen===nombre) s-=v;
  });
  return Math.round(s*100)/100;
}
function totalCuentas(){
  // El dinero que esta en los concesionarios SUMA: salio del banco pero sigue siendo
  // de Pagasi. Si no se contara aqui, mandar un anticipo haria ver a la empresa mas
  // pobre, que es justo lo que estaba mal (23-sep-2026).
  return (_cuentasBanc||[]).reduce(function(a,c){return a+saldoCuenta(c.nombre);},0)
       + saldoCuenta(CUENTA_ANTICIPOS);
}
function movsCuenta(cid){
  return S.movimientos.filter(function(m){return m.cuentaOrigen===cid||m.cuentaDestino===cid;})
    .sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');});
}

// ── Helpers ──
function nombreMesEsp(yyyy_mm){
  var meses=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var p=yyyy_mm.split('-'); return meses[parseInt(p[1])-1]+' '+p[0];
}

// ── PAGE RENDER ──
function renderCuentas(){
  // Si hay una cuenta seleccionada, mostrar su detalle
  if(window._cuentasDetalle){
    return renderDetalleCuenta(window._cuentasDetalle);
  }

  var tab=window._cuentasTab||'cuentas';

  // Métricas rápidas para el banner
  var cuentasList = (typeof _cuentasBanc!=='undefined' && _cuentasBanc)?_cuentasBanc:[];
  var totalSaldo = 0;
  try{
    cuentasList.forEach(function(c){ totalSaldo += (typeof saldoCuenta==='function' ? saldoCuenta(c.nombre) : 0); });
  }catch(e){}
  var nCuentas = cuentasList.length;
  var pendientesCount = (typeof S!=='undefined' && S && S.cuentasPendientes) ? S.cuentasPendientes.filter(function(p){return !p.confirmado;}).length : 0;

  var banner = '';
  if(typeof pageBanner==='function'){
    banner = pageBanner(
      'Tesorería · Cuentas bancarias',
      'Cuentas',
      '<b>'+nCuentas+'</b> cuenta'+(nCuentas!==1?'s':'')+' bancaria'+(nCuentas!==1?'s':'')+' · Saldo total: <b>'+(typeof fmt==='function'?fmt(totalSaldo):'$'+totalSaldo)+'</b>'+(pendientesCount>0?' · <b>'+pendientesCount+'</b> pendiente'+(pendientesCount!==1?'s':'')+' por confirmar':''),
      [
        {label:'＋ Nuevo Depósito', onclick:'openDeposito(null)', primary:true},
        {label:'↓ Exportar CSV', onclick:"exportarCSV('movimientos')"}
      ]
    );
  }

  var tabBar='<div style="display:flex;gap:0;border-bottom:2px solid var(--rim);margin-bottom:20px">'
    +['cuentas','historial','pendientes'].map(function(t){
      var labels={cuentas:' Cuentas',historial:' Historial',pendientes:'⏳ Pendientes'};
      var active=tab===t;
      return '<button onclick="switchCuentasTab(\''+t+'\')" style="'
        +'background:none;border:none;padding:11px 20px;font-size:13px;font-weight:'+(active?'800':'600')
        +';color:'+(active?'var(--p1)':'var(--ink3)')
        +';border-bottom:'+(active?'3px solid var(--p1)':'3px solid transparent')
        +';margin-bottom:-2px;cursor:pointer;font-family:var(--f);transition:color .15s;letter-spacing:.1px">'+labels[t]+'</button>';
    }).join('')+'</div>';

  var body='';
  if(tab==='cuentas') body=renderTabCuentasBanc();
  else if(tab==='historial') body=renderTabHistorial();
  else body=renderTabPendientes();

  return '<div class="page">'+banner+tabBar+body+'</div>';
}

// ═══════════════════════════════
// TAB 1: CUENTAS BANCARIAS
// ═══════════════════════════════
function renderTabCuentasBanc(){
  var cuentas=_cuentasBanc||[];
  var total=cuentas.reduce(function(a,c){return a+saldoCuenta(c.nombre);},0);

  // ═══ Métricas del mes para los KPIs ═══
  var now = new Date();
  var mesKey = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var movsMes = (S.movimientos||[]).filter(function(m){
    return !m.eliminado && (m.fecha||'').startsWith(mesKey);
  });
  var ingresosMes = movsMes.filter(function(m){return m.cuentaDestino && m.tipo!=='transferencia';}).reduce(function(a,m){return a+montoMov(m);},0);
  var egresosMes = movsMes.filter(function(m){return m.cuentaOrigen && m.tipo!=='transferencia';}).reduce(function(a,m){return a+montoMov(m);},0);
  var transfMes = movsMes.filter(function(m){return m.tipo==='transferencia';}).length;
  var netoMes = ingresosMes - egresosMes;

  // Últimos 6 meses de flujo neto (para mini-chart)
  var flujo6m = [];
  for(var i=5;i>=0;i--){
    var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    var k = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    var ms = (S.movimientos||[]).filter(function(m){return !m.eliminado && (m.fecha||'').startsWith(k);});
    var ing = ms.filter(function(m){return m.cuentaDestino && m.tipo!=='transferencia';}).reduce(function(a,m){return a+montoMov(m);},0);
    var eg = ms.filter(function(m){return m.cuentaOrigen && m.tipo!=='transferencia';}).reduce(function(a,m){return a+montoMov(m);},0);
    flujo6m.push({lbl:d.toLocaleDateString('es-VE',{month:'short'}), ing:ing, eg:eg, neto:ing-eg});
  }
  var maxFlujo = Math.max(1, ...flujo6m.map(function(f){return Math.max(f.ing,f.eg);}));

  // ═══ KPIs row ═══
  var kpisHTML = '<div class="sg" style="grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px">'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--p1);font-size:26px">'+fmt(total)+'</div>'
      +'<div class="st-l">Saldo total</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+nCuentasLbl(cuentas.length)+'</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--green);font-size:26px">'+fmt(ingresosMes)+'</div>'
      +'<div class="st-l">Ingresos del mes</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+movsMes.filter(function(m){return m.cuentaDestino && m.tipo!=='transferencia';}).length+' movimientos</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--red);font-size:26px">'+fmt(egresosMes)+'</div>'
      +'<div class="st-l">Egresos del mes</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+movsMes.filter(function(m){return m.cuentaOrigen && m.tipo!=='transferencia';}).length+' movimientos</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:'+(netoMes>=0?'var(--green)':'var(--red)')+';font-size:26px">'+(netoMes>=0?'+':'')+fmt(netoMes)+'</div>'
      +'<div class="st-l">Flujo neto</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+now.toLocaleDateString('es-VE',{month:'long'})+'</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--amber);font-size:26px">'+transfMes+'</div>'
      +'<div class="st-l">Transferencias</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">Entre cuentas</div>'
    +'</div>'
    +'</div>';

  // ═══ Mini chart flujo 6 meses ═══
  var chartHTML = '<div class="card" style="margin-bottom:14px">'
    +'<div class="ch"><div><div class="ct">Flujo de caja · últimos 6 meses</div><div class="cs">Ingresos vs egresos por mes</div></div>'
    +'<div style="display:flex;gap:12px;font-size:11px">'
    +'<span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:var(--green)"></span>Ingresos</span>'
    +'<span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:var(--red)"></span>Egresos</span>'
    +'</div></div>'
    +'<div style="display:flex;align-items:flex-end;gap:8px;height:140px;margin-top:14px;padding:0 4px">'
    +flujo6m.map(function(f){
      var hIng = f.ing>0 ? Math.max(6, Math.round(f.ing/maxFlujo*115)) : 2;
      var hEg = f.eg>0 ? Math.max(6, Math.round(f.eg/maxFlujo*115)) : 2;
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">'
        +'<div style="font-size:9px;font-weight:800;color:'+(f.neto>=0?'var(--green)':'var(--red)')+';height:12px;white-space:nowrap">'+(f.neto!==0?(f.neto>=0?'+':'')+fmt(f.neto).slice(0,6):'')+'</div>'
        +'<div style="flex:1;width:100%;display:flex;align-items:flex-end;gap:3px">'
        +'<div style="flex:1;background:linear-gradient(180deg,var(--green),#10c878);border-radius:3px 3px 0 0;height:'+hIng+'px" title="Ingresos: '+fmt(f.ing)+'"></div>'
        +'<div style="flex:1;background:linear-gradient(180deg,var(--red),#ef4e6f);border-radius:3px 3px 0 0;height:'+hEg+'px" title="Egresos: '+fmt(f.eg)+'"></div>'
        +'</div>'
        +'<div style="font-size:10px;color:var(--ink3);font-weight:600;text-transform:capitalize">'+f.lbl.replace('.','')+'</div>'
        +'</div>';
    }).join('')
    +'</div></div>';

  // ═══ Cards de cuentas — compactas, coherentes con .card del sistema ═══
  var cardsHTML=cuentas.length?cuentas.map(function(c){
    var saldo=saldoCuenta(c.nombre);
    var pctTotal = total>0 ? Math.round(saldo/total*100) : 0;

    var movsCuenta = (S.movimientos||[]).filter(function(m){
      return !m.eliminado && (m.cuentaDestino===c.nombre || m.cuentaOrigen===c.nombre);
    });
    var nMovs = movsCuenta.length;
    var movsCuentaMes = movsCuenta.filter(function(m){return (m.fecha||'').startsWith(mesKey);});
    var ingCuentaMes = movsCuentaMes.filter(function(m){return m.cuentaDestino===c.nombre;}).reduce(function(a,m){return a+montoMov(m);},0);
    var egCuentaMes = movsCuentaMes.filter(function(m){return m.cuentaOrigen===c.nombre;}).reduce(function(a,m){return a+montoMov(m);},0);
    var moneda = (c.moneda||'USD').toUpperCase()==='BS'?'Bs':'$';
    var accentColor = (c.moneda||'USD').toUpperCase()==='BS' ? '#60A5FA' : 'var(--p1)';

    return '<div class="card" onclick="verMovsCuenta(\''+c.nombre+'\')" style="cursor:pointer;padding:16px 18px">'

      // Fila 1: ícono + nombre + badge moneda
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
        +'<div style="width:36px;height:36px;border-radius:10px;background:var(--gs);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:'+accentColor+';flex-shrink:0">'+moneda+'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-weight:800;font-size:13.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.nombre+'</div>'
          +'<div style="font-size:10.5px;color:var(--ink3);margin-top:1px">'+nMovs+' movimientos totales</div>'
        +'</div>'
        +'<span style="background:var(--gs);color:'+accentColor+';border-radius:20px;padding:3px 9px;font-size:10px;font-weight:800;flex-shrink:0">'+(c.moneda||'USD')+'</span>'
      +'</div>'

      // Saldo
      +'<div style="font-family:var(--fd);font-weight:900;font-size:22px;letter-spacing:-1px;color:var(--ink);line-height:1;margin-bottom:10px">'+fmt(saldo)+'</div>'

      // Barra de porcentaje
      +'<div style="height:4px;background:var(--rim);border-radius:2px;overflow:hidden;margin-bottom:10px">'
        +'<div style="height:100%;width:'+pctTotal+'%;background:'+accentColor+';border-radius:2px"></div>'
      +'</div>'

      // Ingresos/egresos del mes en una fila
      +'<div style="display:flex;gap:12px;margin-bottom:12px;font-size:11.5px">'
        +'<div style="flex:1">'
          +'<div style="color:var(--ink3);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">↑ Ingresó</div>'
          +'<div style="font-weight:800;color:var(--green);font-family:var(--fd)">'+fmt(ingCuentaMes)+'</div>'
        +'</div>'
        +'<div style="flex:1">'
          +'<div style="color:var(--ink3);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">↓ Salió</div>'
          +'<div style="font-weight:800;color:var(--red);font-family:var(--fd)">'+fmt(egCuentaMes)+'</div>'
        +'</div>'
        +'<div style="flex:1;text-align:right">'
          +'<div style="color:var(--ink3);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">% Total</div>'
          +'<div style="font-weight:800;color:'+accentColor+';font-family:var(--fd)">'+pctTotal+'%</div>'
        +'</div>'
      +'</div>'

      // Botones acción
      +'<div style="display:flex;gap:5px;border-top:1px solid var(--rim2);padding-top:10px" onclick="event.stopPropagation()">'
        +'<button class="btn btn-p btn-xs" style="flex:1" onclick="openDeposito(\''+c.nombre+'\')">＋</button>'
        +'<button class="btn btn-d btn-xs" style="flex:1" onclick="openRetiro(\''+c.nombre+'\')">−</button>'
        +'<button class="btn btn-g btn-xs" style="flex:1" onclick="openTransferencia(\''+c.nombre+'\')">⇄</button>'
        +'<button class="btn btn-g btn-xs" style="flex:1" onclick="verMovsCuenta(\''+c.nombre+'\')">Ver →</button>'
      +'</div>'
    +'</div>';
  }).join(''):'<div class="empty" style="padding:40px 20px;grid-column:1/-1"><div style="font-size:16px;font-weight:700;margin-bottom:8px">Sin cuentas configuradas</div><div style="font-size:12.5px;color:var(--ink3);margin-bottom:14px">Las cuentas bancarias sirven para registrar ingresos y egresos con trazabilidad completa.</div><button class="btn btn-p btn-sm" onclick="nav(\'config\')">＋ Crear primera cuenta</button></div>';

  // Toolbar superior
  var toolbar = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
      +'<button class="btn btn-p btn-sm" onclick="openDeposito(null)">＋ Ingresar saldo</button>'
      +'<button class="btn btn-d btn-sm" onclick="openRetiro(null)">− Retirar</button>'
      +'<button class="btn btn-g btn-sm" onclick="openTransferencia(null)">⇄ Transferir</button>'
    +'</div>'
    +'<button class="btn btn-g btn-sm" onclick="nav(\'config\')">＋ Nueva cuenta</button>'
    +'</div>';

  return '<div>'
    + kpisHTML
    + chartHTML
    + toolbar
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">'
    + cardsHTML
    + '</div></div>';
}

// Helper para pluralización
function nCuentasLbl(n){
  return n+' '+(n===1?'cuenta activa':'cuentas activas');
}


// ═══════════════════════════════
// TAB 2: HISTORIAL
// ═══════════════════════════════

// ═══════════════════════════════
// VER MOVIMIENTOS DE UNA CUENTA
// ═══════════════════════════════════════════════════════
// DETALLE DE CUENTA BANCARIA — Vista completa con buscador
// ═══════════════════════════════════════════════════════
function verMovsCuenta(nombre){
  window._cuentasDetalle = nombre;
  window._cuentasTab = 'cuentas';
  nav('cuentas');
}

function renderDetalleCuenta(nombre){
  // Mostrar TODOS (incluyendo anulados para auditoría), ordenados por fecha desc
  var todos = (S.movimientos||[]).filter(function(m){
    return m.cuentaOrigen===nombre || m.cuentaDestino===nombre;
  }).sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||'') || (b.hora||'').localeCompare(a.hora||''); });

  // Para los totales y saldo: SOLO los NO eliminados
  var activos = todos.filter(function(m){ return !m.eliminado; });
  var totalIng = activos.filter(function(m){return m.cuentaDestino===nombre;}).reduce(function(a,m){return a+montoMov(m);},0);
  var totalEg = activos.filter(function(m){return m.cuentaOrigen===nombre;}).reduce(function(a,m){return a+montoMov(m);},0);
  var saldo = totalIng - totalEg;

  var esAdmin = S.currentUser && S.currentUser.rol === 'Administrador';

  function buildRow(m){
    var anulado = !!m.eliminado;
    var esIng = m.cuentaDestino===nombre;
    var iconBg = anulado ? 'var(--surf2)' : (esIng ? 'var(--greens)' : 'var(--reds)');
    var iconColor = anulado ? 'var(--ink3)' : (esIng ? 'var(--green)' : 'var(--red)');
    var arrow = esIng
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+iconColor+'" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+iconColor+'" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
    var monto = (esIng ? '+' : '−') + fmt(m.monto||0);
    var contrap = esIng ? (m.cuentaOrigen||'Externo') : (m.cuentaDestino||'Externo');
    var rowStyle = anulado ? 'opacity:0.45' : '';
    var tags = '';
    if(anulado) tags += '<span style="font-size:9.5px;background:rgba(231,76,60,0.12);color:var(--red);border-radius:20px;padding:1px 8px;font-weight:800;margin-left:5px">ANULADO</span>';
    if(m.tipo==='transferencia') tags += '<span style="font-size:9.5px;background:rgba(37,99,235,0.10);color:var(--p1);border-radius:20px;padding:1px 7px;font-weight:700;margin-left:4px">⇄ Transf.</span>';
    if(m.referencia) tags += '<span style="font-size:9.5px;background:var(--surf2);color:var(--ink3);border-radius:20px;padding:1px 7px;margin-left:4px">#'+m.referencia+'</span>';
    if(anulado && m.eliminadoPor) tags += '<span style="font-size:9.5px;color:var(--ink3);margin-left:5px">Anuló: '+m.eliminadoPor+(m.eliminadoEn?' · '+m.eliminadoEn.split('T')[0]:'')+'</span>';

    var accionCell = '';
    if(!anulado && esAdmin){
      accionCell = '<button onclick="event.stopPropagation();anularMovimiento(\''+m.id+'\',\''+nombre+'\')" '
        +'title="Anular movimiento (solo Admin)" '
        +'style="background:none;border:none;cursor:pointer;color:var(--ink3);font-size:13px;padding:4px 7px;border-radius:6px;transition:all .15s" '
        +'onmouseover="this.style.color=\'var(--red)\';this.style.background=\'var(--reds)\'" '
        +'onmouseout="this.style.color=\'var(--ink3)\';this.style.background=\'none\'"></button>';
    }

    return '<tr class="det-row" style="'+rowStyle+'" data-buscar="'
      +([m.concepto,m.referencia,m.realizadoPor,String(m.monto||0),(m.fecha||''),contrap,(m.tipo||''),(anulado?'anulado':'')].join(' ')).toLowerCase()+'">'
      +'<td style="width:38px">'
        +'<div style="width:34px;height:34px;border-radius:10px;background:'+iconBg+';display:flex;align-items:center;justify-content:center">'+arrow+'</div>'
      +'</td>'
      +'<td>'
        +'<div style="font-size:12.5px;font-weight:700;color:var(--ink);'+(anulado?'text-decoration:line-through;':'')+'">'+(m.concepto||m.descripcion||'Movimiento')+tags+'</div>'
        +'<div style="font-size:10.5px;color:var(--ink3);margin-top:2px">'+function(){
            if(!m.fecha) return '—';
            if(m.fecha.indexOf('T')!==-1||m.fecha.length>10) return fmtFechaHora(m.fecha);
            var h=(m.hora||'').trim();
            if(h&&(h.indexOf('a. m.')!==-1||h.indexOf('p. m.')!==-1||h.indexOf('a.m.')!==-1||h.indexOf('p.m.')!==-1)){
              try{var isPM=h.indexOf('p. m.')!==-1||h.indexOf('p.m.')!==-1;var parts=h.replace(/[ap]\. ?m\./i,'').trim().split(':');var hh=parseInt(parts[0],10);var mm=parseInt(parts[1]||'0',10);if(isPM&&hh!==12)hh+=12;if(!isPM&&hh===12)hh=0;h=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');}catch(e){h='';}
            }
            var dd=m.fecha.split('-');
            return dd.length===3?(dd[2]+'/'+dd[1]+'/'+dd[0]+(h?' '+h:'')):(m.fecha+(h?' '+h:''));
          }()+'</div>'
      +'</td>'
      +'<td style="font-size:11.5px;color:var(--ink2)">'+(m.tipo==='transferencia'?(esIng?'Desde: ':'Hacia: ')+contrap:contrap)+'</td>'
      +'<td style="font-size:11px;color:var(--ink3)">'+(m.referencia||'—')+'</td>'
      +'<td style="font-size:11px;color:var(--ink3)">'+(m.realizadoPor||'—')+'</td>'
      +'<td style="text-align:right;font-family:var(--fd);font-weight:800;font-size:14px;color:'+iconColor+';'+(anulado?'text-decoration:line-through;':'')+'">'+monto+'</td>'
      +'<td style="width:36px">'+accionCell+'</td>'
      +'</tr>';
  }

  var rowsHTML = todos.length ? todos.map(buildRow).join('') : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--ink3);font-size:13px">Sin movimientos registrados para esta cuenta</td></tr>';

  return '<div class="page">'
    // ── HEADER: volver + nombre ──
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">'
      +'<button onclick="window._cuentasDetalle=null;nav(\'cuentas\')" class="btn btn-g btn-sm" style="gap:6px">← Volver</button>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<div style="width:38px;height:38px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:800">BNK</div>'
        +'<div>'
          +'<div style="font-weight:900;font-size:17px;color:var(--ink);letter-spacing:-0.3px">'+nombre+'</div>'
          +'<div style="font-size:11px;color:var(--ink3)">'+activos.length+' activo(s)'+(todos.length>activos.length?' · '+(todos.length-activos.length)+' anulado(s)':'')+'</div>'
        +'</div>'
      +'</div>'
      +'<div style="margin-left:auto;display:flex;gap:8px">'
        +'<button class="btn btn-p btn-sm" onclick="openDeposito(\''+nombre+'\')">＋ Ingresar</button>'
        +'<button class="btn btn-d btn-sm" onclick="openRetiro(\''+nombre+'\')">− Retirar</button>'
        +'<button class="btn btn-g btn-sm" onclick="openTransferencia(\''+nombre+'\')">⇄ Transferir</button>'
      +'</div>'
    +'</div>'

    // ── STATS ──
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:18px">'
      +'<div class="card" style="padding:16px 20px">'
        +'<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--ink3);font-weight:700;margin-bottom:6px">Saldo actual</div>'
        +'<div style="font-family:var(--fd);font-weight:900;font-size:24px;color:var(--ink);letter-spacing:-1px">'+fmt(saldo)+'</div>'
      +'</div>'
      +'<div class="card" style="padding:16px 20px">'
        +'<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--green);font-weight:700;margin-bottom:6px">↑ Total ingresos</div>'
        +'<div style="font-family:var(--fd);font-weight:900;font-size:24px;color:var(--green);letter-spacing:-1px">+'+fmt(totalIng)+'</div>'
        +'<div style="font-size:10.5px;color:var(--ink3);margin-top:2px">'+activos.filter(function(m){return m.cuentaDestino===nombre;}).length+' transacciones</div>'
      +'</div>'
      +'<div class="card" style="padding:16px 20px">'
        +'<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--red);font-weight:700;margin-bottom:6px">↓ Total egresos</div>'
        +'<div style="font-family:var(--fd);font-weight:900;font-size:24px;color:var(--red);letter-spacing:-1px">−'+fmt(totalEg)+'</div>'
        +'<div style="font-size:10.5px;color:var(--ink3);margin-top:2px">'+activos.filter(function(m){return m.cuentaOrigen===nombre;}).length+' transacciones</div>'
      +'</div>'
    +'</div>'

    // ── TABLA CON BUSCADOR ──
    +'<div class="card">'
      +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">'
        // Buscador
        +'<div style="position:relative;flex:1;min-width:220px">'
          +'<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--ink3);font-size:12px;pointer-events:none"></span>'
          +'<input id="det-srch" type="text" placeholder="Buscar por concepto, monto, referencia, fecha, usuario..." '
            +'style="width:100%;box-sizing:border-box;padding:8px 10px 8px 30px;border:1px solid var(--rim);border-radius:10px;font-size:12.5px;background:var(--surf2);color:var(--ink);font-family:var(--f);outline:none" '
            +'oninput="filtrarDetalleCuenta(this.value)" '
            +'onfocus="this.style.borderColor=\'var(--p1)\';this.style.boxShadow=\'0 0 0 3px var(--gb)\'" '
            +'onblur="this.style.borderColor=\'var(--rim)\';this.style.boxShadow=\'\'">'
        +'</div>'
        // Filtro tipo
        +'<div style="display:flex;gap:4px">'
          +'<button id="det-f-todos" class="btn btn-p btn-sm" onclick="filtrarDetallePorTipo(\'todos\')">Todos</button>'
          +'<button id="det-f-ingresos" class="btn btn-g btn-sm" onclick="filtrarDetallePorTipo(\'ingresos\')">↑ Ingresos</button>'
          +'<button id="det-f-egresos" class="btn btn-g btn-sm" onclick="filtrarDetallePorTipo(\'egresos\')">↓ Egresos</button>'
        +'</div>'
        // Contador resultados
        +'<div id="det-count" style="font-size:11.5px;font-weight:700;color:var(--ink3)">'+todos.length+' registro(s)</div>'
      +'</div>'
      +'<div style="overflow-x:auto">'
        +'<table class="tbl" id="det-table">'
          +'<thead><tr>'
            +'<th style="width:38px"></th>'
            +'<th>Concepto</th>'
            +'<th>Contraparte</th>'
            +'<th>Referencia</th>'
            +'<th>Realizado por</th>'
            +'<th style="text-align:right">Monto</th>'
            +'<th></th>'
          +'</tr></thead>'
          +'<tbody id="det-tbody">'+rowsHTML+'</tbody>'
        +'</table>'
      +'</div>'
    +'</div>'
  +'</div>';
}

// ── Filtrar la tabla de detalle por texto ──
function filtrarDetalleCuenta(q){
  var lower = q.trim().toLowerCase();
  var rows = document.querySelectorAll('#det-tbody .det-row');
  var vis = 0;
  rows.forEach(function(r){
    var match = !lower || (r.dataset.buscar||'').includes(lower);
    r.style.display = match ? '' : 'none';
    if(match) vis++;
  });
  var cnt = document.getElementById('det-count');
  if(cnt) cnt.textContent = vis+' resultado(s)';
}

// ── Filtrar por tipo ──
var _detTipo = 'todos';
function filtrarDetallePorTipo(tipo){
  _detTipo = tipo;
  ['todos','ingresos','egresos'].forEach(function(t){
    var btn = document.getElementById('det-f-'+t);
    if(btn){ btn.className = t===tipo ? 'btn btn-p btn-sm' : 'btn btn-g btn-sm'; }
  });
  var rows = document.querySelectorAll('#det-tbody .det-row');
  var vis = 0;
  rows.forEach(function(r){
    var esIng = r.querySelector('svg line[x1="12"][y1="19"]') !== null;
    var show = tipo==='todos' || (tipo==='ingresos'&&esIng) || (tipo==='egresos'&&!esIng);
    // Re-check buscar filter too
    var srch = (document.getElementById('det-srch')||{}).value||'';
    var matchQ = !srch.trim() || (r.dataset.buscar||'').includes(srch.trim().toLowerCase());
    r.style.display = (show && matchQ) ? '' : 'none';
    if(show && matchQ) vis++;
  });
  var cnt = document.getElementById('det-count');
  if(cnt) cnt.textContent = vis+' resultado(s)';
}

// ── Eliminar movimiento desde el detalle ──
function anularMovimiento(id, cuenta){
  // Solo administradores pueden anular movimientos
  if(!S.currentUser || S.currentUser.rol !== 'Administrador'){
    toast('Solo el Administrador puede anular movimientos','error');
    return;
  }
  var idx = (S.movimientos||[]).findIndex(function(m){return m.id===id;});
  if(idx<0) return;
  var m = S.movimientos[idx];
  if(m.eliminado){ toast('Este movimiento ya fue anulado','error'); return; }

  // Modal de confirmación con razón
  setMicon('anular');
  $('mtt').textContent='Anular movimiento';
  $('msb').textContent='El movimiento seguirá visible pero no contará en saldos ni contabilidad';
  $('modal-box').className='modal';
  $('mbd').innerHTML=
    '<div style="background:rgba(231,76,60,0.07);border:1px solid rgba(231,76,60,0.2);border-radius:12px;padding:14px 16px;margin-bottom:14px">'
    +'<div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:4px">'+(m.concepto||'Movimiento')+'</div>'
    +'<div style="font-size:12px;color:var(--ink3)">'+(m.fecha||'')+(m.referencia?' · #'+m.referencia:'')+'</div>'
    +'<div style="font-family:var(--fd);font-weight:900;font-size:20px;margin-top:8px;color:var(--red)">'+fmt(m.monto||0)+'</div>'
    +'</div>'
    +'<div class="fg"><label>Razón de anulación *</label>'
    +'<input class="fi" id="anul_razon" placeholder="Ej: Error de registro, duplicado, reverso..." autofocus></div>';
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    +'<button class="btn btn-d" onclick="confirmarAnulacion(\''+id+'\',\''+cuenta+'\')"> Confirmar anulación</button>';
  $('ov').style.display='flex';
}

function confirmarAnulacion(id, cuenta){
  var razon = ($('anul_razon')||{}).value||'';
  if(!razon.trim()){ toast('La razón de anulación es obligatoria','error'); return; }
  var idx = (S.movimientos||[]).findIndex(function(m){return m.id===id;});
  if(idx<0){ closeM(); return; }
  Object.assign(S.movimientos[idx], {
    eliminado: true,
    eliminadoPor: (S.currentUser&&S.currentUser.nombre)||'Admin',
    eliminadoEn: new Date().toISOString(),
    eliminadoRazon: razon.trim()
  });
  DB.saveMovimiento(S.movimientos[idx]);
  closeM();
  window._cuentasDetalle = cuenta;
  nav('cuentas');
  toast('Movimiento anulado · quedará visible en auditoría','info');
}

function renderTabHistorial(){
  var mes=window._cuentasMes;
  var movs=S.movimientos.filter(function(m){
    var f=(m.fecha||'');
    return f.startsWith(mes); // incluye anulados para auditoría
  }).sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');});

  // Build month options (last 12 months)
  var mesOpts='';
  var now=new Date();
  for(var i=0;i<24;i++){
    var d=new Date(now.getFullYear(),now.getMonth()-i,1);
    var val=d.getFullYear()+'-'+(d.getMonth()+1<10?'0':'')+(d.getMonth()+1);
    var lbl=nombreMesEsp(val);
    mesOpts+='<option value="'+val+'" '+(val===mes?'selected':'')+'>'+lbl+'</option>';
  }

  var tasaBs=window._tasaBsGlobal||1;
  var esAdmin = S.currentUser && S.currentUser.rol === 'Administrador';

  // ═══ KPIs del mes ═══
  var movsActivos = movs.filter(function(m){return !m.eliminado;});
  var totalIngresos = movsActivos.filter(function(m){return m.cuentaDestino && m.tipo!=='transferencia';}).reduce(function(a,m){return a+montoMov(m);},0);
  var totalEgresos = movsActivos.filter(function(m){return m.cuentaOrigen && m.tipo!=='transferencia';}).reduce(function(a,m){return a+montoMov(m);},0);
  var totalTransf = movsActivos.filter(function(m){return m.tipo==='transferencia';}).length;
  var neto = totalIngresos - totalEgresos;
  var anulados = movs.filter(function(m){return m.eliminado;}).length;
  var promedioPorMov = movsActivos.length>0 ? (totalIngresos+totalEgresos)/movsActivos.length : 0;

  var kpisHTML = '<div class="sg" style="grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px">'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--green);font-size:26px">+'+fmt(totalIngresos)+'</div>'
      +'<div class="st-l">Ingresos</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+movsActivos.filter(function(m){return m.cuentaDestino && m.tipo!=='transferencia';}).length+' movimientos</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--red);font-size:26px">-'+fmt(totalEgresos)+'</div>'
      +'<div class="st-l">Egresos</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+movsActivos.filter(function(m){return m.cuentaOrigen && m.tipo!=='transferencia';}).length+' movimientos</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:'+(neto>=0?'var(--green)':'var(--red)')+';font-size:26px">'+(neto>=0?'+':'')+fmt(neto)+'</div>'
      +'<div class="st-l">Neto</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">Balance del mes</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--p1);font-size:26px">'+movs.length+'</div>'
      +'<div class="st-l">Movimientos</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+totalTransf+' transferencias'+(anulados>0?' · '+anulados+' anulados':'')+'</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--amber);font-size:26px">'+fmt(promedioPorMov)+'</div>'
      +'<div class="st-l">Promedio</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">Por movimiento</div>'
    +'</div>'
    +'</div>';

  // ═══ Mini chart de flujo diario ═══
  var diasEnMes = new Date(parseInt(mes.split('-')[0]), parseInt(mes.split('-')[1]), 0).getDate();
  var flujoDiario = [];
  for(var d=1; d<=diasEnMes; d++){
    var dayKey = mes+'-'+String(d).padStart(2,'0');
    var movsDia = movsActivos.filter(function(m){return (m.fecha||'').startsWith(dayKey);});
    var ing = movsDia.filter(function(m){return m.cuentaDestino && m.tipo!=='transferencia';}).reduce(function(a,m){return a+montoMov(m);},0);
    var eg = movsDia.filter(function(m){return m.cuentaOrigen && m.tipo!=='transferencia';}).reduce(function(a,m){return a+montoMov(m);},0);
    flujoDiario.push({dia:d, ing:ing, eg:eg});
  }
  var maxDia = Math.max(1, ...flujoDiario.map(function(f){return Math.max(f.ing,f.eg);}));

  var chartDiario = '<div class="card" style="margin-bottom:14px">'
    +'<div class="ch"><div><div class="ct">Actividad diaria</div><div class="cs">Flujo por día en '+nombreMesEsp(mes)+'</div></div></div>'
    +'<div style="display:flex;align-items:flex-end;gap:2px;height:90px;margin-top:12px;padding:0 4px">'
    +flujoDiario.map(function(f){
      var hIng = f.ing>0 ? Math.max(3, Math.round(f.ing/maxDia*70)) : 1;
      var hEg = f.eg>0 ? Math.max(3, Math.round(f.eg/maxDia*70)) : 1;
      var showLabel = f.dia%5===0 || f.dia===1;
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px" title="Día '+f.dia+': +'+fmt(f.ing)+' / -'+fmt(f.eg)+'">'
        +'<div style="flex:1;width:100%;display:flex;align-items:flex-end;gap:1px">'
        +'<div style="flex:1;background:var(--green);border-radius:2px 2px 0 0;height:'+hIng+'px;opacity:.85"></div>'
        +'<div style="flex:1;background:var(--red);border-radius:2px 2px 0 0;height:'+hEg+'px;opacity:.85"></div>'
        +'</div>'
        +'<div style="font-size:8.5px;color:var(--ink3);font-weight:600;height:10px">'+(showLabel?f.dia:'')+'</div>'
        +'</div>';
    }).join('')
    +'</div></div>';

  // ═══ Tabla de movimientos ═══
  var rows=movs.length?movs.map(function(m){
    var cuenta=m.cuentaDestino||m.cuentaOrigen||'—';
    var esIngreso=!!m.cuentaDestino&&m.tipo!=='transferencia';
    var esTransfer = m.tipo==='transferencia';
    var anulado=!!m.eliminado;
    var monto=m.monto||0;
    var tasaM=m.tasaBs||tasaBs;
    var comision=m.comision||0;
    var realizadoPor=m.realizadoPor||S.currentUser&&S.currentUser.nombre||'—';
    var fechaFmt=(function(){
      if(!m.fecha) return '—';
      // If hora exists and is a clean HH:MM string, combine directly
      var h = (m.hora||'').trim();
      // Clean up old locale strings with "a. m."/"p. m." notation
      if(h && (h.indexOf('a. m.')!==-1 || h.indexOf('p. m.')!==-1 || h.indexOf('a.m.')!==-1 || h.indexOf('p.m.')!==-1)){
        try{
          var isPM = h.indexOf('p. m.')!==-1 || h.indexOf('p.m.')!==-1;
          var parts = h.replace(/[ap]\. ?m\./i,'').trim().split(':');
          var hh = parseInt(parts[0],10);
          var mm = parseInt(parts[1]||'0',10);
          if(isPM && hh!==12) hh+=12;
          if(!isPM && hh===12) hh=0;
          h = String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
        }catch(e){ h=''; }
      }
      // Try to parse as ISO if fecha contains time
      if(m.fecha.indexOf('T')!==-1 || m.fecha.length>10) return fmtFechaHora(m.fecha);
      // fecha is YYYY-MM-DD, combine with cleaned hora
      var dd = m.fecha.split('-'); // [yyyy,mm,dd]
      if(dd.length===3){
        var fmtD = dd[2]+'/'+dd[1]+'/'+dd[0];
        return h ? (fmtD+' '+h) : fmtD;
      }
      return m.fecha+(h?' '+h:'');
    })();
    var tipoColor = anulado ? 'var(--ink3)' : (esTransfer ? 'var(--amber)' : (esIngreso ? '#27ae60' : '#e74c3c'));
    var tipoIcon = esTransfer ? '⇄' : (esIngreso ? '↩' : '↪');
    var tipoBg = anulado ? 'var(--surf2)' : (esTransfer ? 'var(--ambers)' : (esIngreso ? 'var(--greens)' : 'var(--reds)'));
    var anulTag=anulado?'<span style="font-size:9px;background:rgba(231,76,60,0.12);color:var(--red);border-radius:20px;padding:2px 8px;font-weight:800;margin-left:6px">ANULADO</span>':'';
    var anulBtn=(!anulado&&esAdmin)?'<button onclick="anularMovimiento(\''+m.id+'\',null)" title="Anular movimiento" style="background:none;border:none;cursor:pointer;color:var(--ink3);font-size:14px;padding:4px 8px;border-radius:6px;transition:all .15s" onmouseover="this.style.color=\'var(--red)\';this.style.background=\'var(--reds)\'" onmouseout="this.style.color=\'var(--ink3)\';this.style.background=\'none\'"></button>':'';
    var montoColor = anulado ? 'var(--ink3)' : (esIngreso ? '#27ae60' : '#e74c3c');

    return '<tr style="'+(anulado?'opacity:0.55;':'')+'transition:background .15s" onmouseover="this.style.background=\'var(--surf2)\'" onmouseout="this.style.background=\'\'">'
      +'<td style="padding:11px 8px"><div style="display:flex;align-items:center;gap:8px">'
        +'<span style="width:30px;height:30px;border-radius:50%;background:'+tipoBg+';display:inline-flex;align-items:center;justify-content:center;font-size:14px;color:'+tipoColor+';font-weight:800;flex-shrink:0">'+tipoIcon+'</span>'
        +'<span style="'+(anulado?'text-decoration:line-through;color:var(--ink3)':'font-weight:600')+'">'+cuenta+'</span>'+anulTag
      +'</div></td>'
      +'<td style="white-space:nowrap;color:var(--ink3);font-size:11.5px">'+fechaFmt+'</td>'
      +'<td style="font-size:11.5px">'+realizadoPor+'</td>'
      +'<td class="tdm" style="max-width:220px;'+(anulado?'text-decoration:line-through;':'')+'">'+( m.concepto||'<span style="color:var(--ink3);font-style:italic">sin concepto</span>' )+'</td>'
      +'<td style="text-align:right;white-space:nowrap;font-size:11px;color:var(--ink3)">'+tasaM+' Bs/$</td>'
      +'<td style="text-align:right;font-size:11px;color:var(--ink3)">'+(comision>0?'BS '+parseFloat(comision).toFixed(2):'—')+'</td>'
      +'<td style="text-align:right;font-weight:800;color:'+montoColor+';white-space:nowrap;font-family:var(--fd);'+(anulado?'text-decoration:line-through;':'')+'">'+(esIngreso?'+':esTransfer?'':'-')+'$'+parseFloat(monto).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td>'
      +'<td style="text-align:center">'+anulBtn+'</td>'
      +'</tr>';
  }).join(''):'<tr><td colspan="8" style="text-align:center;padding:40px 20px;color:var(--ink3)"><div style="font-size:14px;font-weight:700;margin-bottom:4px">Sin movimientos en '+nombreMesEsp(mes)+'</div><div style="font-size:11.5px">No se registraron movimientos este mes</div></td></tr>';

  return '<div>'
    + kpisHTML
    + chartDiario
    +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<span style="font-size:12.5px;font-weight:700;color:var(--ink3)">Mes</span>'
        +'<select class="fs" onchange="setCuentasMes(this.value)" style="min-width:180px;font-weight:700;color:var(--p1);border-color:rgba(37,99,235,0.3)">'+mesOpts+'</select>'
      +'</div>'
      +'<button class="btn btn-p btn-sm" onclick="exportHistorialXLS()">↓ Exportar CSV</button>'
    +'</div>'
    +'<div class="card" style="overflow:hidden">'
    +'<div class="ch" style="padding-bottom:10px;border-bottom:1px solid var(--rim2)"><div><div class="ct">Historial detallado</div><div class="cs">Registros de entrada y salida de todas las cuentas bancarias</div></div>'
    +'<div style="font-weight:800;font-size:14px;color:var(--p1);font-family:var(--fd)">'+movs.length+' <span style="font-size:11px;color:var(--ink3);font-weight:600;font-family:var(--f)">registros</span></div></div>'
    +'<div style="overflow-x:auto;margin:0 -4px;padding:0 4px">'
    +'<table class="tbl" style="margin-top:10px;width:100%"><thead><tr style="border-bottom:2px solid var(--rim2)">'
    +'<th style="text-align:left;padding:10px 8px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px">Cuenta</th>'
    +'<th style="text-align:left;padding:10px 8px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px">Fecha</th>'
    +'<th style="text-align:left;padding:10px 8px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px">Usuario</th>'
    +'<th style="text-align:left;padding:10px 8px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px">Concepto</th>'
    +'<th style="text-align:right;padding:10px 8px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px">Tasa</th>'
    +'<th style="text-align:right;padding:10px 8px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px">Comisión</th>'
    +'<th style="text-align:right;padding:10px 8px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px">Monto</th>'
    +'<th style="width:40px"></th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table>'
    +'</div></div></div>';
}

function exportHistorialXLS(){
  var mes=window._cuentasMes;
  var movs=S.movimientos.filter(function(m){
    return !m.eliminado&&(m.fecha||'').startsWith(mes);
  }).sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');});
  if(!movs.length){toast('No hay movimientos en este mes','info');return;}
  var rows=[['Cuenta','Fecha','Realizado por','Concepto','Tasa de cambio','Comision','Monto']];
  var tasaBs=window._tasaBsGlobal||1;
  movs.forEach(function(m){
    rows.push([
      m.cuentaDestino||m.cuentaOrigen||'',
      (m.fecha||'')+' '+(m.hora||''),
      m.realizadoPor||'',
      m.concepto||'',
      m.tasaBs||tasaBs,
      m.comision||0,
      m.monto||0
    ]);
  });
  var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download='historial-'+mes+'.csv';a.click();
  URL.revokeObjectURL(url);
  toast('Historial exportado','success');
}

// ═══════════════════════════════
// TAB 3: CUENTAS PENDIENTES
// ═══════════════════════════════
function renderTabPendientes(){
  var subTab=window._cuentasSubTab||'cobrar';
  var ocultarCero=window._ocultarCero!==false;

  // ═══ KPIs de pendientes ═══
  var credActivosKpi = S.creds.filter(function(c){return !c.eliminado&&(c.estado==='activo'||c.estado==='mora');});
  var totalPorCobrar = credActivosKpi.reduce(function(a,c){return a+(getCreditoSaldoPendiente(c)||0);},0);
  var manualCobrarKpi = (S.cuentasPendientes||[]).filter(function(p){return p.tipo==='cobrar'&&!p.pagado&&!p.eliminado;});
  var manualPagarKpi = (S.cuentasPendientes||[]).filter(function(p){return p.tipo==='pagar'&&!p.pagado&&!p.eliminado;});
  var totalManualCobrar = manualCobrarKpi.reduce(function(a,p){return a+(p.monto||0);},0);
  var totalManualPagar = manualPagarKpi.reduce(function(a,p){return a+(p.monto||0);},0);
  // En mora = con dias de atraso, no solo los que pasaron los dias de gracia (estado 'mora'):
  // asi cuadra con el dashboard y con Creditos (Adam, 14-sep-2026).
  var clientesMoraKpi = credActivosKpi.filter(function(c){return (c.mora||0)>0;}).length;
  var clientesAlDiaKpi = credActivosKpi.length - clientesMoraKpi;

  var kpisHTML = '<div class="sg" style="grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--green);font-size:26px">'+fmt(totalPorCobrar + totalManualCobrar)+'</div>'
      +'<div class="st-l">Por cobrar</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+credActivosKpi.length+' créditos'+(manualCobrarKpi.length>0?' · '+manualCobrarKpi.length+' manuales':'')+'</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--red);font-size:26px">'+fmt(totalManualPagar)+'</div>'
      +'<div class="st-l">Por pagar</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+manualPagarKpi.length+' pendiente'+(manualPagarKpi.length!==1?'s':'')+'</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:'+(clientesMoraKpi>0?'var(--red)':'var(--green)')+';font-size:26px">'+clientesMoraKpi+'</div>'
      +'<div class="st-l">En mora</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">'+clientesAlDiaKpi+' al día</div>'
    +'</div>'
    +'<div class="stat">'
      +'<div class="st-v" style="color:var(--p1);font-size:26px">'+fmt((totalPorCobrar + totalManualCobrar) - totalManualPagar)+'</div>'
      +'<div class="st-l">Balance neto</div>'
      +'<div style="font-size:10px;color:var(--ink3);margin-top:2px">Por cobrar − por pagar</div>'
    +'</div>'
    +'</div>';

  var subTabBar='<div style="display:flex;gap:0;border-bottom:1px solid var(--rim);margin-bottom:16px">'
    +[['cobrar','Cuentas por cobrar'],['pagar','Cuentas por pagar']].map(function(p){
      var active=subTab===p[0];
      return '<button onclick="switchCuentasSubTab(\''+p[0]+'\')" style="'
        +'background:none;border:none;padding:11px 18px;font-size:13px;font-weight:'+(active?'800':'600')
        +';color:'+(active?'var(--p1)':'var(--ink3)')
        +';border-bottom:'+(active?'2px solid var(--p1)':'2px solid transparent')
        +';margin-bottom:-1px;cursor:pointer;font-family:var(--f);transition:color .15s">'+p[1]+'</button>';
    }).join('')
    +'<label style="display:flex;align-items:center;gap:6px;margin-left:auto;font-size:12px;font-weight:600;color:var(--ink2);cursor:pointer;padding:0 8px">'
    +'<input type="checkbox" '+(ocultarCero?'checked':'')+' onchange="window._ocultarCero=this.checked;nav(\'cuentas\')" style="accent-color:var(--p1)"> Ocultar cuentas en cero</label>'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'
    +(subTab==='cobrar'
      ? '<button class="btn btn-p btn-sm" onclick="openAgregarPendiente(\'cobrar\')">＋ Agregar pendiente por cobrar</button>'
      : '<button class="btn btn-d btn-sm" onclick="openAgregarPendiente(\'pagar\')" style="background:rgba(231,76,60,0.12);color:#e74c3c;border:1px solid rgba(231,76,60,0.25)">＋ Agregar pendiente por pagar</button>'
    )
    +'</div>';

  var body='';
  if(subTab==='cobrar') body=renderCobrar(ocultarCero);
  else body=renderPagar(ocultarCero);

  return '<div>'+kpisHTML+subTabBar+body+'</div>';
}

function renderCobrar(ocultarCero){
  // Manual pendientes por cobrar
  var manualCobrar=(S.cuentasPendientes||[]).filter(function(p){return p.tipo==='cobrar'&&!p.pagado&&!p.eliminado;});
  // Group creditos by client, compute pending cuotas
  var credActivos=S.creds.filter(function(c){return !c.eliminado&&(c.estado==='activo'||c.estado==='mora');});
  var byCliente={};
  credActivos.forEach(function(c){
    if(!byCliente[c.cli]) byCliente[c.cli]={cli:c.cli,creds:[],total:0,pendCount:0,diasRest:null};
    var saldoPend=getCreditoSaldoPendiente(c);
    var cuotasRestantes=Math.max(0,getCreditoTotalCuotas(c)-getCreditoCuotasPagadas(c));
    byCliente[c.cli].creds.push({id:c.id,saldoPend:saldoPend,cuotasRestantes:cuotasRestantes,fecha:c.fecha,estado:c.estado,mora:c.mora||0});
    byCliente[c.cli].total+=saldoPend;
    byCliente[c.cli].pendCount+=cuotasRestantes;
  });

  var grupos=Object.values(byCliente).filter(function(g){
    return !ocultarCero||g.total>0;
  }).sort(function(a,b){return b.total-a.total;});

  var totalCobrar=grupos.reduce(function(a,g){return a+g.total;},0);

  if(!grupos.length && !manualCobrar.length) return '<div class="empty"><span class="e-ic">✓</span><div class="e-tt">Sin cuentas pendientes por cobrar</div><div style="font-size:12px;color:var(--ink3);margin-top:6px"><button class="btn btn-p btn-sm" onclick="openAgregarPendiente(\'cobrar\')">＋ Agregar pendiente</button></div></div>';

  var rowsManual=manualCobrar.map(function(p,idx){
    return '<tr style="background:rgba(37,99,235,0.03)">'
      +'<td><span style="font-size:10px;background:rgba(37,99,235,0.12);color:var(--p1);border-radius:20px;padding:2px 8px;font-weight:700;margin-right:6px">MANUAL</span>'+p.descripcion+'</td>'
      +'<td style="text-align:center;color:var(--ink3)">'+( p.contraparte||'—' )+'</td>'
      +'<td style="text-align:right;font-weight:700">'+fmt(p.monto||0)+'</td>'
      +'<td style="text-align:center">'+(p.fechaVenc?'<span style="font-size:11px;color:var(--amber)">'+p.fechaVenc+'</span>':'—')+'</td>'
      +'<td style="text-align:center;display:flex;gap:6px;justify-content:center;align-items:center">'
      +'<button class="btn btn-p btn-xs" onclick="marcarPendientePagado(\''+p.id+'\')">✓ Cobrado</button>'
      +'<button class="btn btn-d btn-xs" onclick="delPendiente(\''+p.id+'\')">✕</button>'
      +'</td></tr>';
  }).join('');

  var rows=grupos.map(function(g,idx){
    var expired=g.creds.some(function(c){return (c.mora||0)>0;});   // atrasado desde el dia 1, como el KPI de arriba
    var diasLabel=expired?'<span style="color:#e74c3c;font-weight:700">Expirado</span>':'<span style="color:var(--ink2)">—</span>';
    return '<tr>'
      +'<td><span style="cursor:pointer;font-size:11px;color:var(--p1)" onclick="toggleCobrarRow('+idx+')">▶</span> Cliente: '+g.cli+'</td>'
      +'<td style="text-align:center;font-weight:700">'+g.pendCount+'</td>'
      +'<td style="text-align:right;font-weight:700">'+fmt(g.total)+'</td>'
      +'<td style="text-align:center">'+diasLabel+'</td>'
      +'<td style="text-align:center">'
      +'<button onclick="cobrarTodoCliente(\''+g.cli+'\')" class="btn btn-p btn-xs">Cobrar todo</button>'
      +'<button style="background:none;border:none;font-size:16px;cursor:pointer;color:var(--ink3);padding:4px 6px">⋮</button>'
      +'</td></tr>'
      +'<tr id="cobrar-row-'+idx+'" style="display:none"><td colspan="5" style="padding:0">'
      +'<div style="padding:10px 20px 10px 40px;background:var(--base);border-bottom:1px solid var(--rim)">'
      +g.creds.map(function(cr){
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px">'
          +'<span style="color:var(--ink2)">'+cr.id+'</span>'
          +'<span>'+cr.cuotasRestantes+' cuotas</span>'
          +'<span style="font-weight:700;color:var(--p1)">'+fmt(cr.saldoPend)+'</span>'
          +'</div>';
      }).join('')
      +'</div></td></tr>';
  }).join('');

  var totalManual=manualCobrar.reduce(function(a,p){return a+(p.monto||0);},0);
  var totalCobrarFull=totalCobrar+totalManual;

  return '<div class="card">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">'
    +'<div><div class="ct" style="color:var(--p1)">Cuentas pendientes por cobrar</div></div>'
    +'<div style="display:flex;gap:10px;align-items:center">'
    +'<input type="text" class="fi" placeholder="Búsqueda de texto completo..." style="min-width:220px;font-size:12px" oninput="filtrarCobrar(this.value)">'
    +'<div style="background:rgba(37,99,235,0.12);border-radius:20px;padding:8px 16px;font-weight:800;font-size:13px;color:var(--p1)">Total: '+fmt(totalCobrarFull)+'</div>'
    +'</div></div>'
    +'<div style="overflow-x:auto"><table class="tbl" id="cobrar-table"><thead><tr>'
    +'<th>Asunto ↑</th><th style="text-align:center">Contraparte / Cuotas ↑</th>'
    +'<th style="text-align:right">Por cobrar ↑</th><th style="text-align:center">Vencimiento ↑</th>'
    +'<th style="text-align:center">Acción</th></tr></thead>'
    +'<tbody>'+rows+rowsManual+'</tbody></table></div>'
    +'<div style="font-size:12px;color:var(--ink3);padding-top:12px">'+(grupos.length+manualCobrar.length)+' resultado(s) — '+(manualCobrar.length)+' manuales</div>'
    +'</div>';
}

function renderPagar(ocultarCero){
  var manualPagar=(S.cuentasPendientes||[]).filter(function(p){return p.tipo==='pagar'&&!p.pagado&&!p.eliminado;});
  var egresos=S.egresos.filter(function(e){return !e.eliminado;});
  // Group by categoria
  var byCateg={};
  egresos.forEach(function(e){
    var cat=e.categoria||'otros';
    if(!byCateg[cat]) byCateg[cat]={cat:cat,items:[],total:0};
    byCateg[cat].items.push(e);
    byCateg[cat].total+=(e.monto||0);
  });
  var grupos=Object.values(byCateg).filter(function(g){return !ocultarCero||g.total>0;})
    .sort(function(a,b){return b.total-a.total;});
  var totalPagar=grupos.reduce(function(a,g){return a+g.total;},0);

  if(!grupos.length && !manualPagar.length) return '<div class="empty"><span class="e-ic">✓</span><div class="e-tt">Sin cuentas pendientes por pagar</div><div style="font-size:12px;color:var(--ink3);margin-top:6px"><button class="btn btn-d btn-sm" onclick="openAgregarPendiente(\'pagar\')">＋ Agregar pendiente</button></div></div>';

  var rowsManualPagar=manualPagar.map(function(p){
    return '<tr style="background:rgba(231,76,60,0.03)">'
      +'<td><span style="font-size:10px;background:rgba(231,76,60,0.12);color:#e74c3c;border-radius:20px;padding:2px 8px;font-weight:700;margin-right:6px">MANUAL</span>'+p.descripcion+'</td>'
      +'<td style="text-align:center;color:var(--ink3)">'+( p.contraparte||'—' )+'</td>'
      +'<td style="text-align:right;font-weight:700;color:#e74c3c">'+fmt(p.monto||0)+'</td>'
      +'<td style="text-align:center">'+(p.fechaVenc?'<span style="font-size:11px;color:var(--amber)">'+p.fechaVenc+'</span>':'—')+'</td>'
      +'<td style="text-align:center;display:flex;gap:6px;justify-content:center;align-items:center">'
      +'<button class="btn btn-g btn-xs" onclick="marcarPendientePagado(\''+p.id+'\')">✓ Pagado</button>'
      +'<button class="btn btn-d btn-xs" onclick="delPendiente(\''+p.id+'\')">✕</button>'
      +'</td></tr>';
  }).join('');

  var rows=grupos.map(function(g,idx){
    var catLabel={inventario:'Inventario',equipos:'Equipos',operativo:'Operativo',nomina:'Nómina',otros:'Otros'}[g.cat]||g.cat;
    return '<tr>'
      +'<td><span style="cursor:pointer;font-size:11px;color:var(--p1)" onclick="togglePagarRow('+idx+')">▶</span> '+catLabel+'</td>'
      +'<td style="text-align:center;font-weight:700">'+g.items.length+'</td>'
      +'<td style="text-align:right;font-weight:700;color:var(--red)">'+fmt(g.total)+'</td>'
      +'<td style="text-align:center"><span style="color:var(--ink3)">—</span></td>'
      +'<td style="text-align:center">'
      +'<button onclick="nav(\'conta\')" class="btn btn-g btn-xs">Ver detalle</button>'
      +'</td></tr>'
      +'<tr id="pagar-row-'+idx+'" style="display:none"><td colspan="5" style="padding:0">'
      +'<div style="padding:10px 20px 10px 40px;background:var(--base);border-bottom:1px solid var(--rim)">'
      +g.items.slice(0,5).map(function(e){
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12px">'
          +'<span style="color:var(--ink2)">'+e.concepto+'</span>'
          +'<span style="color:var(--ink3)">'+e.fecha+'</span>'
          +'<span style="font-weight:700;color:var(--red)">'+fmt(e.monto)+'</span>'
          +'</div>';
      }).join('')
      +'</div></td></tr>';
  }).join('');

  var totalManualPagar=manualPagar.reduce(function(a,p){return a+(p.monto||0);},0);
  var totalPagarFull=totalPagar+totalManualPagar;

  return '<div class="card">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">'
    +'<div><div class="ct" style="color:var(--red,#e74c3c)">Cuentas por pagar</div></div>'
    +'<div style="display:flex;gap:10px;align-items:center">'
    +'<input type="text" class="fi" placeholder="Búsqueda de texto completo..." style="min-width:220px;font-size:12px">'
    +'<div style="background:rgba(231,76,60,0.10);border-radius:20px;padding:8px 16px;font-weight:800;font-size:13px;color:#e74c3c">Total: '+fmt(totalPagarFull)+'</div>'
    +'</div></div>'
    +'<div style="overflow-x:auto"><table class="tbl"><thead><tr>'
    +'<th>Descripción</th><th style="text-align:center">Contraparte</th>'
    +'<th style="text-align:right">Por pagar</th><th style="text-align:center">Vencimiento</th>'
    +'<th style="text-align:center">Acción</th></tr></thead>'
    +'<tbody>'+rows+rowsManualPagar+'</tbody></table></div>'
    +'<div style="font-size:12px;color:var(--ink3);padding-top:12px">'+(grupos.length+manualPagar.length)+' resultado(s) — '+(manualPagar.length)+' manuales</div>'
    +'</div>';
}

function toggleCobrarRow(idx){
  var row=document.getElementById('cobrar-row-'+idx);
  if(row){row.style.display=(row.style.display==='none'?'':'none');}
}
function togglePagarRow(idx){
  var row=document.getElementById('pagar-row-'+idx);
  if(row){row.style.display=(row.style.display==='none'?'':'none');}
}
function cobrarTodoCliente(cli){
  nav('pagos');
  setTimeout(function(){toast('Registra el pago para '+cli,'info');},200);
}
function filtrarCobrar(q){
  var rows=document.querySelectorAll('#cobrar-table tbody tr');
  var lower=q.toLowerCase();
  rows.forEach(function(r){
    if(!r.id||!r.id.startsWith('cobrar-row-')){
      r.style.display=(r.textContent.toLowerCase().includes(lower)||!q)?'':'none';
    }
  });
}

// ── PENDIENTES MANUALES ──────────────────────────────────────────
function openAgregarPendiente(tipo){
  var esCobrar=tipo==='cobrar';
  var color=esCobrar?'var(--p1)':'#e74c3c';
  var label=esCobrar?'por cobrar':'por pagar';
  setMicon('pago');
  $('mtt').textContent='Nueva cuenta pendiente '+label;
  $('msb').textContent='Se agregará a cuentas '+label;
  $('modal-box').className='modal';
  $('mbd').innerHTML=
    '<div class="fgr c1" style="gap:10px">'
    +'<div class="fg"><label>Descripción *</label><input class="fi" id="pnd_desc" placeholder="Ej: Pago alquiler local, Cobro cliente ABC..."></div>'
    +'<div class="fg"><label>Contraparte</label><input class="fi" id="pnd_contra" placeholder="Nombre del cliente o proveedor"></div>'
    +'<div class="fgr c2" style="gap:10px">'
    +'<div class="fg"><label>Monto *</label><input class="fi" id="pnd_monto" type="number" min="0" step="0.01" placeholder="0.00"></div>'
    +'<div class="fg"><label>Fecha de vencimiento</label><input class="fi" id="pnd_fecha" type="date"></div>'
    +'</div>'
    +'<div class="fg"><label>Notas</label><input class="fi" id="pnd_notas" placeholder="Opcional..."></div>'
    +'</div>';
  $('mft').innerHTML='<button class="btn btn-g btn-sm" onclick="closeM()">Cancelar</button>'
    +'<button class="btn btn-p btn-sm" style="background:'+color+'" onclick="savePendiente(\''+tipo+'\')">＋ Guardar pendiente</button>';
  $('ov').style.display='flex';
}

function savePendiente(tipo){
  var desc=($('pnd_desc')||{}).value||'';
  var monto=parseFloat(($('pnd_monto')||{}).value||'0');
  if(!desc.trim()){toast('La descripción es obligatoria','error');return;}
  if(isNaN(monto)||monto<0){toast('Monto inválido','error');return;}
  if(!S.cuentasPendientes) S.cuentasPendientes=[];
  var obj={
    id:'PND-'+Date.now(),
    tipo:tipo,
    descripcion:desc.trim(),
    contraparte:($('pnd_contra')||{}).value||'',
    monto:monto,
    fechaVenc:($('pnd_fecha')||{}).value||'',
    notas:($('pnd_notas')||{}).value||'',
    creadoEn:hoyLocalISO(),
    creadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin',
    pagado:false,
    eliminado:false
  };
  S.cuentasPendientes.push(obj);
  if(db){
    db.collection('cuentasPendientes').doc(obj.id).set(obj).catch(function(){});
  }
  closeM();
  nav('cuentas');
  window._cuentasTab='pendientes';
  window._cuentasSubTab=tipo;
  nav('cuentas');
  toast('Pendiente agregado','success');
}

function delPendiente(id){
  var idx=S.cuentasPendientes.findIndex(function(p){return p.id===id;});
  if(idx<0) return;
  S.cuentasPendientes[idx].eliminado=true;
  if(db){db.collection('cuentasPendientes').doc(id).update({eliminado:true}).catch(function(){});}
  nav('cuentas');
  toast('Pendiente eliminado','info');
}

function marcarPendientePagado(id){
  var idx=S.cuentasPendientes.findIndex(function(p){return p.id===id;});
  if(idx<0) return;
  S.cuentasPendientes[idx].pagado=true;
  S.cuentasPendientes[idx].pagadoEn=hoyLocalISO();
  if(db){db.collection('cuentasPendientes').doc(id).update({pagado:true,pagadoEn:S.cuentasPendientes[idx].pagadoEn}).catch(function(){});}
  nav('cuentas');
  toast('Marcado como '+(S.cuentasPendientes[idx].tipo==='cobrar'?'cobrado':'pagado'),'success');
}


// ── DEPÓSITO ──
function openDeposito(cuentaNombre){
  setMicon('deposito');$('mtt').textContent='Registrar Depósito';
  $('msb').textContent=cuentaNombre||'Selecciona la cuenta';
  $('modal-box').className='modal';
  var opts = (_cuentasBanc||[]).map(function(cu){
    return '<option value="'+cu.nombre+'" '+(cu.nombre===cuentaNombre?'selected':'')+'>'+cu.nombre+'</option>';
  }).join('');
  $('mbd').innerHTML='<div class="fgr c1" style="gap:9px">'
    +'<div class="fg"><label>Cuenta destino *</label>'
    +(opts?'<select class="fs" id="dep_cuenta">'+opts+'</select>'
      :'<input class="fi" id="dep_cuenta" placeholder="Nombre de la cuenta">')
    +'</div>'
    +'<div class="fg"><label>Concepto *</label><input class="fi" id="dep_conc" placeholder="Ej: Cobro cuota, pago inicial..."></div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Monto *</label><input class="fi" id="dep_monto" type="number" step="0.01" placeholder="0.00"></div>'
    +'<div class="fg"><label>Fecha</label><input class="fi" id="dep_fecha" type="date" value="'+hoyLocalISO()+'"></div></div>'
    +'<div class="fg"><label>Referencia / Comprobante</label><input class="fi" id="dep_ref" placeholder="Opcional"></div>'
    +'<div class="fgr" style="gap:8px"><div class="fg"><label>Tasa Bs./$</label><input class="fi" id="dep_tasa" type="number" step="0.01" placeholder="Ej: 478.58" value="'+(window._tasaBsGlobal||1)+'"></div>'
    +'<div class="fg"><label>Moneda</label><select class="fs" id="dep_moneda"><option value="USD">USD $</option><option value="BS">Bs.</option></select></div></div>'
    +'</div>';
  S.saveFn=function(){
    var cnombre=($('dep_cuenta')&&$('dep_cuenta').value)||cuentaNombre||'';
    var conc=($('dep_conc')&&$('dep_conc').value.trim())||'';
    var monto=parseFloat(($('dep_monto')&&$('dep_monto').value))||0;
    if(!cnombre){toast('Selecciona una cuenta','error');return false;}
    if(!conc||monto<=0){toast('Concepto y monto obligatorios','error');return false;}
    var mov={id:'MOV-'+Date.now(),tipo:'deposito',concepto:conc,monto:monto,
      cuentaOrigen:null,cuentaDestino:cnombre,
      fecha:($('dep_fecha')&&$('dep_fecha').value)||hoyLocalISO(),
      hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false}),
      referencia:($('dep_ref')&&$('dep_ref').value)||'',
      tasaBs:parseFloat(($('dep_tasa')&&$('dep_tasa').value))||window._tasaBsGlobal||1,
      monedaMov:($('dep_moneda')&&$('dep_moneda').value)||'USD',
      realizadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin'};
    S.movimientos.push(mov); DB.saveMovimiento(mov);
    closeM(); nav('cuentas'); toast('Depósito registrado · '+fmt(monto),'success'); return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    +'<button class="btn btn-p" onclick="saveM()">Registrar Depósito</button>';
  $('ov').style.display='flex';
}

// ── RETIRO ──
function openRetiro(cuentaNombre){
  setMicon('retiro');$('mtt').textContent='Registrar Retiro';
  $('msb').textContent=cuentaNombre||'Selecciona la cuenta';
  $('modal-box').className='modal';
  var opts = (_cuentasBanc||[]).map(function(cu){
    return '<option value="'+cu.nombre+'" '+(cu.nombre===cuentaNombre?'selected':'')+'>'+cu.nombre+'</option>';
  }).join('');
  $('mbd').innerHTML='<div class="fgr c1" style="gap:9px">'
    +'<div class="fg"><label>Cuenta origen *</label>'
    +(opts?'<select class="fs" id="ret_cuenta">'+opts+'</select>'
      :'<input class="fi" id="ret_cuenta" placeholder="Nombre de la cuenta">')
    +'</div>'
    +'<div class="fg"><label>Concepto *</label><input class="fi" id="ret_conc" placeholder="Ej: Pago proveedor, nómina..."></div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Monto *</label><input class="fi" id="ret_monto" type="number" step="0.01" placeholder="0.00"></div>'
    +'<div class="fg"><label>Fecha</label><input class="fi" id="ret_fecha" type="date" value="'+hoyLocalISO()+'"></div></div>'
    +'<div class="fg"><label>Referencia</label><input class="fi" id="ret_ref" placeholder="Opcional"></div>'
    +'<div class="fgr" style="gap:8px"><div class="fg"><label>Tasa Bs./$</label><input class="fi" id="ret_tasa" type="number" step="0.01" placeholder="Ej: 478.58" value="'+(window._tasaBsGlobal||1)+'"></div>'
    +'<div class="fg"><label>Moneda</label><select class="fs" id="ret_moneda"><option value="USD">USD $</option><option value="BS">Bs.</option></select></div></div>'
    +'</div>';
  S.saveFn=function(){
    var cnombre=($('ret_cuenta')&&$('ret_cuenta').value)||cuentaNombre||'';
    var conc=($('ret_conc')&&$('ret_conc').value.trim())||'';
    var monto=parseFloat(($('ret_monto')&&$('ret_monto').value))||0;
    if(!cnombre){toast('Selecciona una cuenta','error');return false;}
    if(!conc||monto<=0){toast('Concepto y monto obligatorios','error');return false;}
    var mov={id:'MOV-'+Date.now(),tipo:'retiro',concepto:conc,monto:monto,
      cuentaOrigen:cnombre,cuentaDestino:null,
      fecha:($('ret_fecha')&&$('ret_fecha').value)||hoyLocalISO(),
      hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false}),
      referencia:($('ret_ref')&&$('ret_ref').value)||'',
      tasaBs:parseFloat(($('ret_tasa')&&$('ret_tasa').value))||window._tasaBsGlobal||1,
      monedaMov:($('ret_moneda')&&$('ret_moneda').value)||'USD',
      realizadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin'};
    S.movimientos.push(mov); DB.saveMovimiento(mov);
    closeM(); nav('cuentas'); toast('Retiro registrado · '+fmt(monto),'success'); return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    +'<button class="btn btn-d" onclick="saveM()">Registrar Retiro</button>';
  $('ov').style.display='flex';
}

// ── TRANSFERENCIA ──
function openTransferencia(cuentaNombre){
  setMicon('transfer');$('mtt').textContent='Transferencia entre Cuentas';$('msb').textContent='Mueve dinero entre cuentas';
  $('modal-box').className='modal';
  var opts = (_cuentasBanc||[]).map(function(cu){
    return '<option value="'+cu.nombre+'">'+cu.nombre+'</option>';
  }).join('');
  var optsOrig = (_cuentasBanc||[]).map(function(cu){
    return '<option value="'+cu.nombre+'" '+(cu.nombre===cuentaNombre?'selected':'')+'>'+cu.nombre+'</option>';
  }).join('');
  if(!opts){ toast('Agrega cuentas en Configuración primero','error'); return; }
  $('mbd').innerHTML='<div class="fgr c1" style="gap:9px">'
    +'<div class="fg"><label>Cuenta origen *</label><select class="fs" id="tr_origen">'+optsOrig+'</select></div>'
    +'<div style="text-align:center;font-size:22px;color:var(--p1);margin:4px 0">⬇️</div>'
    +'<div class="fg"><label>Cuenta destino *</label><select class="fs" id="tr_destino">'+opts+'</select></div>'
    +'<div class="fgr" style="gap:8px">'
    +'<div class="fg"><label>Monto *</label><input class="fi" id="tr_monto" type="number" step="0.01" placeholder="0.00"></div>'
    +'<div class="fg"><label>Fecha</label><input class="fi" id="tr_fecha" type="date" value="'+hoyLocalISO()+'"></div></div>'
    +'<div class="fg"><label>Concepto</label><input class="fi" id="tr_conc" placeholder="Ej: Traspaso operativo..."></div>'
    +'<div class="fg"><label>Referencia</label><input class="fi" id="tr_ref" placeholder="Opcional"></div>'
    +'<div class="fg"><label>Tasa Bs./$</label><input class="fi" id="tr_tasa" type="number" step="0.01" placeholder="Ej: 478.58" value="'+(window._tasaBsGlobal||1)+'"></div>'
    +'</div>';
  S.saveFn=function(){
    var orig=($('tr_origen')&&$('tr_origen').value)||'';
    var dest=($('tr_destino')&&$('tr_destino').value)||'';
    var monto=parseFloat(($('tr_monto')&&$('tr_monto').value))||0;
    if(!orig||!dest){toast('Selecciona origen y destino','error');return false;}
    if(orig===dest){toast('El origen y destino deben ser distintos','error');return false;}
    if(monto<=0){toast('Ingresa un monto válido','error');return false;}
    var conc=($('tr_conc')&&$('tr_conc').value)||'Transferencia interna';
    var mov={id:'MOV-'+Date.now(),tipo:'transferencia',concepto:conc,monto:monto,
      cuentaOrigen:orig,cuentaDestino:dest,
      fecha:($('tr_fecha')&&$('tr_fecha').value)||hoyLocalISO(),
      hora:new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false}),
      referencia:($('tr_ref')&&$('tr_ref').value)||'',
      tasaBs:parseFloat(($('tr_tasa')&&$('tr_tasa').value))||window._tasaBsGlobal||1,
      monedaMov:'USD',
      realizadoPor:(S.currentUser&&S.currentUser.nombre)||'Admin'};
    S.movimientos.push(mov); DB.saveMovimiento(mov);
    closeM(); nav('cuentas'); toast('Transferencia registrada · '+fmt(monto),'success'); return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    +'<button class="btn btn-p" onclick="saveM()">Transferir</button>';
  $('ov').style.display='flex';
}


function delMovimiento(id){
  if(!S.currentUser || S.currentUser.rol !== 'Administrador'){
    toast('Solo el Administrador puede anular movimientos','error');
    return;
  }
  var i=S.movimientos.findIndex(function(x){return x.id===id;});
  if(i<0) return;
  anularMovimiento(id, null);
}


// ══════════════════════════════════════════
// NOTIFICACIONES — funciones reales
// ══════════════════════════════════════════


// ── INIT — arranca la app después del login ─────────────────
