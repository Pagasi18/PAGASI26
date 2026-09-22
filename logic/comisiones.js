// Logica de comisiones. Extraido mecanicamente de assets/pagasi-app.js.
var COMISIONES_DEFAULT = {
  activo: true,
  venta: { tipo: 'fijo', valor: 5 },         // $5 por moto vendida
  cobranza: { tipo: 'fijo', valor: 1 }       // $1 por cobranza
};

// Lee la configuración de comisiones de un usuario, retornando defaults si está activado pero sin config
function _comGetConfig(u){
  if(!u || !u.comisiones || !u.comisiones.activo) return null;
  var c = u.comisiones;
  return {
    activo: true,
    venta: {
      tipo: (c.venta && c.venta.tipo) || 'fijo',
      valor: parseFloat(c.venta && c.venta.valor != null ? c.venta.valor : COMISIONES_DEFAULT.venta.valor)
    },
    cobranza: {
      tipo: (c.cobranza && c.cobranza.tipo) || 'fijo',
      valor: parseFloat(c.cobranza && c.cobranza.valor != null ? c.cobranza.valor : COMISIONES_DEFAULT.cobranza.valor)
    }
  };
}

// Devuelve la lista de usuarios con comisiones activas
function _comGetUsuariosActivos(){
  var lista = (typeof _usersCache !== 'undefined' && Array.isArray(_usersCache)) ? _usersCache : [];
  return lista.filter(function(u){
    return u && u.comisiones && u.comisiones.activo === true;
  });
}

// TODOS los usuarios de Pagasi (no suspendidos) — los que no tienen comisiones
// configuradas aparecen en el módulo con botón "Configurar". Los configurados primero.
function _comGetTodosUsuarios(){
  var lista = (typeof _usersCache !== 'undefined' && Array.isArray(_usersCache)) ? _usersCache : [];
  return lista.filter(function(u){ return u && !u.suspendido; }).slice().sort(function(a,b){
    var ca = (a.comisiones && a.comisiones.activo) ? 0 : 1;
    var cb = (b.comisiones && b.comisiones.activo) ? 0 : 1;
    if(ca !== cb) return ca - cb;
    return String(a.nombre||a.email||'').localeCompare(String(b.nombre||b.email||''));
  });
}

// Modal rápido para configurar las comisiones de un usuario sin salir del módulo
function _comConfigRapida(uid){
  var u = (_usersCache||[]).find(function(x){ return x.uid === uid; });
  if(!u){ toast('Usuario no encontrado','error'); return; }
  var c = _comGetConfig(u) || { activo:false, venta:{tipo:'fijo',valor:5}, cobranza:{tipo:'fijo',valor:1} };
  setMicon('comision');
  $('mtt').textContent = 'Comisiones — ' + (u.nombre || u.email);
  $('msb').textContent = (u.cargo||u.rol||'Usuario') + ' · configuración rápida';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = ''
    + '<label style="display:flex;align-items:center;gap:9px;background:var(--gs);border-radius:10px;padding:11px 13px;cursor:pointer;margin-bottom:13px">'
    + '<input type="checkbox" id="cmr_activo" '+((u.comisiones&&u.comisiones.activo)?'checked':'')+' style="accent-color:var(--green);transform:scale(1.2)">'
    + '<span style="font-weight:800;font-size:13px">Gana comisiones</span></label>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Comisión por venta</label><div style="display:flex;gap:6px">'
    + '<select class="fs" id="cmr_vtipo" style="width:90px"><option value="fijo" '+(c.venta.tipo!=='porc'?'selected':'')+'>$ fijo</option><option value="porc" '+(c.venta.tipo==='porc'?'selected':'')+'>% precio</option></select>'
    + '<input class="fi" id="cmr_vval" type="number" step="0.01" value="'+(c.venta.valor||0)+'" style="flex:1"></div></div>'
    + '<div class="fg"><label>Comisión por cobranza</label><div style="display:flex;gap:6px">'
    + '<select class="fs" id="cmr_ctipo" style="width:90px"><option value="fijo" '+(c.cobranza.tipo!=='porc'?'selected':'')+'>$ fijo</option><option value="porc" '+(c.cobranza.tipo==='porc'?'selected':'')+'>% pago</option></select>'
    + '<input class="fi" id="cmr_cval" type="number" step="0.01" value="'+(c.cobranza.valor||0)+'" style="flex:1"></div></div>'
    + '</div>'
    + '<div style="font-size:11px;color:var(--ink3);margin-top:10px;line-height:1.5">Venta = créditos creados por este usuario · Cobranza = pagos confirmados que registró. Los cambios aplican al histórico completo.</div>';
  S.saveFn = function(){
    var config = {
      activo: !!($('cmr_activo')&&$('cmr_activo').checked),
      venta: { tipo: ($('cmr_vtipo')&&$('cmr_vtipo').value)||'fijo', valor: parseFloat(($('cmr_vval')&&$('cmr_vval').value)||0)||0 },
      cobranza: { tipo: ($('cmr_ctipo')&&$('cmr_ctipo').value)||'fijo', valor: parseFloat(($('cmr_cval')&&$('cmr_cval').value)||0)||0 }
    };
    _comGuardarConfigUsuario(uid, config);
    closeM();
    toast('Comisiones de '+(u.nombre||u.email)+' actualizadas','success');
    nav('comisiones');
    return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="saveM()">Guardar</button>';
  $('ov').style.display='flex';
}

// ── Cálculo de comisiones generadas por un usuario ──
// Retorna { porVenta, porCobranza, ventas:[...], cobranzas:[...] }
function _comCalcGenerado(u){
  var cfg = _comGetConfig(u);
  if(!cfg) return { porVenta:0, porCobranza:0, ventas:[], cobranzas:[] };
  var nombre = (u.nombre || u.email || '').trim();
  if(!nombre) return { porVenta:0, porCobranza:0, ventas:[], cobranzas:[] };
  var nombreLow = nombre.toLowerCase();
  // Por venta: créditos creados por este usuario
  var ventas = [];
  (S.creds || []).forEach(function(c){
    if(c.eliminado) return;
    if(c.estado === 'cancelado') return; // créditos cancelados no pagan comisión
    // La comisión de venta se atribuye al VENDEDOR de la solicitud. Para créditos
    // viejos sin vendedor asignado, se usa quien creó el crédito (compatibilidad).
    var vendedor = (c.vendedorNombre || c.creadoPor || '').trim().toLowerCase();
    if(vendedor !== nombreLow) return;
    var precio = parseFloat(c.precioFinanciado || c.precio || 0) || 0;
    var monto = cfg.venta.tipo === 'porc'
      ? precio * (cfg.venta.valor/100)
      : cfg.venta.valor;
    ventas.push({
      credId: c.id,
      cliente: c.cli,
      modelo: c.modelo || '',
      fecha: c.fecha || c.creadoEn || '',
      precio: precio,
      comision: monto,
      concesionarioId: c.concesionarioId || null
    });
  });
  // Por cobranza: pagos confirmados registrados por este usuario
  var cobranzas = [];
  (S.pagos || []).forEach(function(p){
    if(p.eliminado) return;
    if(p.estado !== 'confirmado') return;
    var quien = (p.cobrador || '').trim().toLowerCase();
    if(quien !== nombreLow) return;
    var monto = cfg.cobranza.tipo === 'porc'
      ? (parseFloat(p.monto)||0) * (cfg.cobranza.valor/100)
      : cfg.cobranza.valor;
    cobranzas.push({
      pagoId: p.id,
      cliente: p.cli,
      fecha: p.fecha || '',
      monto: parseFloat(p.monto)||0,
      comision: monto,
      concesionarioId: p.concesionarioId || null
    });
  });
  return {
    porVenta: ventas.reduce(function(a,v){return a+v.comision;}, 0),
    porCobranza: cobranzas.reduce(function(a,c){return a+c.comision;}, 0),
    ventas: ventas,
    cobranzas: cobranzas
  };
}

// Devuelve desglose de comisiones generadas por concesionario para un usuario
// Retorna un objeto: { 'CONC-XXX': { nombre, porVenta, porCobranza, total, nVentas, nCobranzas }, 'sinAsignar': {...} }
function _comDesglosePorSede(u){
  var gen = _comCalcGenerado(u);
  var out = {};
  function getEntry(concId){
    var key = concId || '_sin';
    if(!out[key]){
      var nombre;
      if(!concId) nombre = 'Sin concesionario';
      else {
        var c = _concGetById ? _concGetById(concId) : null;
        nombre = c ? c.nombre : '(eliminado)';
      }
      out[key] = { id: concId, nombre: nombre, porVenta:0, porCobranza:0, nVentas:0, nCobranzas:0, total:0 };
    }
    return out[key];
  }
  gen.ventas.forEach(function(v){
    var e = getEntry(v.concesionarioId);
    e.porVenta += v.comision;
    e.nVentas += 1;
    e.total += v.comision;
  });
  gen.cobranzas.forEach(function(cb){
    var e = getEntry(cb.concesionarioId);
    e.porCobranza += cb.comision;
    e.nCobranzas += 1;
    e.total += cb.comision;
  });
  // Convertir a array ordenado por total descendente
  return Object.values(out).sort(function(a,b){ return b.total - a.total; });
}

// Devuelve los pagos de comisiones que ya se le hicieron a un usuario (egresos categoría 'comisiones')
function _comGetPagosRealizados(u){
  var nombre = (u.nombre || u.email || '').trim().toLowerCase();
  if(!nombre) return [];
  return (S.egresos || []).filter(function(e){
    return !e.eliminado
      && e.categoria === 'comisiones'
      && e.usuarioComisionNombre
      && String(e.usuarioComisionNombre).trim().toLowerCase() === nombre;
  }).sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); });
}

// Devuelve TOTAL adeudado al usuario (generado - pagado)
function _comGetSaldo(u){
  var gen = _comCalcGenerado(u);
  var pagado = _comGetPagosRealizados(u).reduce(function(a,e){ return a + (parseFloat(e.monto)||0); }, 0);
  var total = gen.porVenta + gen.porCobranza;
  return {
    generado: total,
    porVenta: gen.porVenta,
    porCobranza: gen.porCobranza,
    pagado: pagado,
    saldo: total - pagado,
    nVentas: gen.ventas.length,
    nCobranzas: gen.cobranzas.length,
    ventas: gen.ventas,
    cobranzas: gen.cobranzas
  };
}

// Estadísticas de período: semana actual, mes actual
function _comStatsRango(u){
  var gen = _comCalcGenerado(u);
  var hoy = new Date();
  var hoyYmd = fechaLocalISO(hoy);
  // Inicio de semana (lunes)
  var diaSem = hoy.getDay() || 7; // domingo = 7
  var lunes = new Date(hoy.getTime() - (diaSem-1)*86400000);
  var lunesYmd = fechaLocalISO(lunes);
  // Inicio de mes
  var primMesYmd = hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-01';
  var totalPeriodo = function(items, desde){
    return items.filter(function(it){
      return (it.fecha||'') >= desde && (it.fecha||'') <= hoyYmd;
    }).reduce(function(a,it){ return a + it.comision; }, 0);
  };
  return {
    semana: totalPeriodo(gen.ventas, lunesYmd) + totalPeriodo(gen.cobranzas, lunesYmd),
    mes:    totalPeriodo(gen.ventas, primMesYmd) + totalPeriodo(gen.cobranzas, primMesYmd)
  };
}

// ── Comisiones generadas por un usuario dentro de un rango (corte quincenal) ──
function _comCalcCorte(u, desde, hasta){
  var gen = _comCalcGenerado(u);
  var enR = function(f){ f = String(f||'').slice(0,10); return f >= desde && f <= hasta; };
  var v = gen.ventas.filter(function(x){ return enR(x.fecha); });
  var c = gen.cobranzas.filter(function(x){ return enR(x.fecha); });
  var pv = v.reduce(function(a,x){ return a+x.comision; },0);
  var pc = c.reduce(function(a,x){ return a+x.comision; },0);
  return { ventas:v, cobranzas:c, porVenta:pv, porCobranza:pc, total:pv+pc };
}

// Navegar entre quincenas (dir: -1 anterior, +1 siguiente)
function _comCorteMove(dir){
  var ref = window._comCorteRef || hoyLocalISO();
  var r = _concRangoDe('quincena', ref);
  var base = (dir > 0) ? r.hasta : r.desde;
  var d = (typeof parseFechaLocal==='function') ? parseFechaLocal(base) : new Date(base+'T12:00:00');
  d.setDate(d.getDate() + (dir > 0 ? 1 : -1));
  window._comCorteRef = fechaLocalISO(d);
  window._comTab = 'cortes';
  nav('comisiones');
}
function _comCorteSetFecha(v){
  window._comCorteRef = v || hoyLocalISO();
  window._comTab = 'cortes';
  nav('comisiones');
}

// Pagar el corte: abre el modal de pago con el monto del corte y la nota prellenados
function _comCortePagar(uid, monto, desde, hasta){
  _comAbrirPagar(uid, parseFloat(monto)||0, 'Comisiones quincena '+desde+' → '+hasta);
}

// Exportar el corte quincenal en PDF (ventana Pagasi) o Excel (CSV)
function _comCorteExport(formato){
  var refCorte = window._comCorteRef || hoyLocalISO();
  var rq = _concRangoDe('quincena', refCorte);
  var usuarios = _comGetUsuariosActivos();
  if(!usuarios.length){ toast('Sin usuarios con comisiones activas','info'); return; }
  var filas = usuarios.map(function(u){
    var cc = _comCalcCorte(u, rq.desde, rq.hasta);
    var s = _comGetSaldo(u);
    return { nombre:(u.nombre||u.email||'Usuario'), cc:cc, saldo:s.saldo };
  });
  var totCorte = filas.reduce(function(a,x){ return a+x.cc.total; },0);
  if(formato === 'excel'){
    var n2=function(v){return Math.round((parseFloat(v)||0)*100)/100;};
    var aoa=[];
    aoa.push(['CORTE QUINCENAL DE COMISIONES']);
    aoa.push(['Período', rq.desde+' → '+rq.hasta]);
    aoa.push(['Generado', new Date().toLocaleString('es-VE')]);
    aoa.push([]);
    aoa.push(['Empleado','N° ventas','Comisión ventas','N° cobranzas','Comisión cobranzas','TOTAL DEL CORTE','Saldo global pendiente']);
    filas.forEach(function(x){
      aoa.push([x.nombre, x.cc.ventas.length, n2(x.cc.porVenta), x.cc.cobranzas.length, n2(x.cc.porCobranza), n2(x.cc.total), n2(x.saldo)]);
    });
    aoa.push(['TOTAL','','','','',n2(totCorte),'']);
    aoa.push([]);
    aoa.push(['DETALLE DE OPERACIONES DEL CORTE']);
    aoa.push(['Empleado','Tipo','Fecha','Referencia','Cliente','Base','Comisión']);
    filas.forEach(function(x){
      x.cc.ventas.forEach(function(v){ aoa.push([x.nombre,'Venta',String(v.fecha||'').slice(0,10),v.credId,v.cliente,n2(v.precio),n2(v.comision)]); });
      x.cc.cobranzas.forEach(function(c){ aoa.push([x.nombre,'Cobranza',String(c.fecha||'').slice(0,10),c.pagoId,c.cliente,n2(c.monto),n2(c.comision)]); });
    });
    if(typeof _xlsxDownload==='function') _xlsxDownload('corte-comisiones-'+rq.desde+'_'+rq.hasta+'.xlsx', [{name:'Corte', rows:aoa}]);
    toast('Excel (.xlsx) del corte exportado ✓','success');
    return;
  }
  // PDF
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var html = ''
    + '<h2>CORTE QUINCENAL DE COMISIONES</h2>'
    + '<div style="text-align:center;font-size:11px;color:#555;margin-bottom:16px">Período: '+rq.desde+' → '+rq.hasta+' · Generado: '+new Date().toLocaleString('es-VE')+'</div>'
    + '<h3>Resumen por empleado</h3>'
    + '<table><tr><th>Empleado</th><th>Ventas</th><th>Com. ventas</th><th>Cobranzas</th><th>Com. cobranzas</th><th>TOTAL CORTE</th><th>Saldo global</th></tr>'
    + filas.map(function(x){
        return '<tr><td>'+esc(x.nombre)+'</td><td>'+x.cc.ventas.length+'</td><td>$'+x.cc.porVenta.toFixed(2)+'</td><td>'+x.cc.cobranzas.length+'</td><td>$'+x.cc.porCobranza.toFixed(2)+'</td><td style="font-weight:900">$'+x.cc.total.toFixed(2)+'</td><td>$'+x.saldo.toFixed(2)+'</td></tr>';
      }).join('')
    + '<tr><td style="font-weight:900">TOTAL</td><td></td><td></td><td></td><td></td><td style="font-weight:900">$'+totCorte.toFixed(2)+'</td><td></td></tr></table>'
    + '<h3>Detalle de operaciones</h3>'
    + '<table><tr><th>Empleado</th><th>Tipo</th><th>Fecha</th><th>Referencia</th><th>Cliente</th><th>Base</th><th>Comisión</th></tr>'
    + filas.map(function(x){
        return x.cc.ventas.map(function(v){
            return '<tr><td>'+esc(x.nombre)+'</td><td>Venta</td><td>'+String(v.fecha||'').slice(0,10)+'</td><td>'+esc(v.credId)+'</td><td>'+esc(v.cliente)+'</td><td>$'+(v.precio||0).toFixed(2)+'</td><td>$'+(v.comision||0).toFixed(2)+'</td></tr>';
          }).join('')
          + x.cc.cobranzas.map(function(c){
            return '<tr><td>'+esc(x.nombre)+'</td><td>Cobranza</td><td>'+String(c.fecha||'').slice(0,10)+'</td><td>'+esc(c.pagoId)+'</td><td>'+esc(c.cliente)+'</td><td>$'+(c.monto||0).toFixed(2)+'</td><td>$'+(c.comision||0).toFixed(2)+'</td></tr>';
          }).join('');
      }).join('')
    + '</table>'
    + '<div style="margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:40px">'
    + '<div style="border-top:1px solid #94a3b8;padding-top:6px;text-align:center;font-size:10.5px">Preparado por</div>'
    + '<div style="border-top:1px solid #94a3b8;padding-top:6px;text-align:center;font-size:10.5px">Aprobado por</div>'
    + '</div>';
  _abrirVentanaImpresion('Corte comisiones '+rq.desde, html);
}

// ════════ RENDER PRINCIPAL ════════
function _comisionesRender(){
  if((typeof _usersCache === 'undefined' || !_usersCache.length) && typeof usersReload === 'function'){
    setTimeout(function(){ usersReload(); setTimeout(function(){ if(S.page==='comisiones') nav('comisiones'); },600); },50);
  }
  var usuarios = _comGetTodosUsuarios(); // TODOS los usuarios (los sin configurar salen con "⚙ Configurar")
  var tab = window._comTab || 'vendedores';
  var totalDebe=0, totalPagado=0, totalGenerado=0;
  usuarios.forEach(function(u){ var s=_comGetSaldo(u); totalDebe+=s.saldo; totalPagado+=s.pagado; totalGenerado+=s.generado; });
  var historial = (S.egresos||[]).filter(function(e){ return !e.eliminado && e.categoria==='comisiones'; })
    .sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); });

  // Todas las comisiones generadas (ventas + cobranzas) de todos los usuarios
  var todasGeneradas = [];
  usuarios.forEach(function(u){
    var gen = _comCalcGenerado(u);
    var nombre = u.nombre || u.email || 'Usuario';
    gen.ventas.forEach(function(v){
      todasGeneradas.push({ tipo:'venta', usuario:nombre, uid:u.uid, fecha:v.fecha, ref:v.credId, cliente:v.cliente, detalle:v.modelo, base:v.precio, comision:v.comision });
    });
    gen.cobranzas.forEach(function(cb){
      todasGeneradas.push({ tipo:'cobranza', usuario:nombre, uid:u.uid, fecha:cb.fecha, ref:cb.pagoId, cliente:cb.cliente, detalle:'Pago cuota', base:cb.monto, comision:cb.comision });
    });
  });
  todasGeneradas.sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); });

  var html = '<div class="page">'
    + pageBanner('Vendedores y cobradores · Pago de comisiones','Comisiones',
        '<b>'+usuarios.length+'</b> usuarios · Por pagar: <b style="color:var(--green)">'+fmt(totalDebe)+'</b> · Pagado: <b>'+fmt(totalPagado)+'</b>',
        [{label:'⬇ Exportar Excel', onclick:'_comExportarCSV()'},{label:'Actualizar', onclick:'nav(&quot;comisiones&quot;)'}]);

  // KPIs
  html += '<div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px">'
    + '<div class="stat"><div class="st-v" style="color:var(--green);font-size:26px">'+fmt(totalDebe)+'</div><div class="st-l">Por pagar</div></div>'
    + '<div class="stat"><div class="st-v" style="font-size:26px">'+fmt(totalGenerado)+'</div><div class="st-l">Total generado</div></div>'
    + '<div class="stat"><div class="st-v" style="color:var(--amber);font-size:26px">'+fmt(totalPagado)+'</div><div class="st-l">Pagado total</div></div>'
    + '<div class="stat"><div class="st-v" style="font-size:26px">'+todasGeneradas.length+'</div><div class="st-l">Transacciones</div></div>'
    + '</div>';

  // Tab bar
  html += '<div style="display:flex;gap:0;border-bottom:2px solid var(--rim);margin-bottom:16px;flex-wrap:wrap">'
    + [['vendedores','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px;margin-right:5px"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>Vendedores'],['cortes','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px;margin-right:5px"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>Cortes quincenales'],['generadas','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px;margin-right:5px"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>Generadas'],['historial','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;vertical-align:-3px;margin-right:5px"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>Pagos realizados']].map(function(t){
        var act = tab===t[0];
        return '<button onclick="window._comTab=&quot;'+t[0]+'&quot;;nav(&quot;comisiones&quot;)" style="background:none;border:none;padding:11px 18px;font-size:13px;font-weight:'+(act?'800':'600')+';color:'+(act?'var(--p1)':'var(--ink3)')+';border-bottom:3px solid '+(act?'var(--p1)':'transparent')+';margin-bottom:-2px;cursor:pointer;font-family:var(--f);transition:color .15s">'+t[1]+'</button>';
      }).join('')
    + '</div>';

  // ── Tab: Vendedores ──
  if(tab === 'vendedores'){
    html += '<div style="margin-bottom:14px"><div class="srch"><span class="srch-i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></span><input type="text" id="com-search" placeholder="Buscar vendedor..." oninput="_comFiltrar()"></div></div>';
    if(!usuarios.length){
      html += '<div class="empty"><div class="e-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:32px;height:32px;opacity:.4"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg></div><div class="e-tt">Sin usuarios con comisiones activas</div><button class="btn btn-p btn-sm" style="margin-top:14px" onclick="nav(&quot;users&quot;)">Ir a Usuarios</button></div>';
    } else {
      // Tabla estilo Concesionarios: una fila por vendedor con toda su data
      var filasVend = usuarios.map(function(u){
        var cfg = _comGetConfig(u);
        var s = _comGetSaldo(u);
        var st = _comStatsRango(u);
        var nombre = (u.nombre || u.email || 'Usuario');
        var subLbl = cfg
          ? ('Venta '+(cfg.venta.tipo==='porc' ? cfg.venta.valor+'%' : '$'+cfg.venta.valor)+' · Cobro '+(cfg.cobranza.tipo==='porc' ? cfg.cobranza.valor+'%' : '$'+cfg.cobranza.valor))
          : '<span style="color:var(--amber);font-weight:700">Sin comisiones configuradas</span>';
        var inics = nombre.split(' ').slice(0,2).map(function(w){return (w[0]||'').toUpperCase();}).join('');
        var saldoCol = s.saldo > 0 ? 'var(--green)' : 'var(--ink3)';
        return '<tr class="com-card" data-nombre="'+nombre.toLowerCase().replace(/"/g,'')+'" style="cursor:pointer'+(cfg?'':';opacity:.65')+'" onclick="_comAbrirDetalle(\''+u.uid+'\')">'
          + '<td><div style="display:flex;align-items:center;gap:9px">'
            + '<div style="width:30px;height:30px;border-radius:50%;background:'+(cfg?'var(--grad)':'var(--rim)')+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:'+(cfg?'#fff':'var(--ink3)')+';flex-shrink:0">'+inics+'</div>'
            + '<div style="min-width:0"><div class="tdm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">'+nombre+'</div>'
            + '<div style="font-size:10px;color:var(--ink3)">'+((u.cargo||u.rol)?(u.cargo||u.rol)+' · ':'')+subLbl+'</div></div>'
          + '</div></td>'
          + '<td class="tds" style="text-align:right;font-family:var(--fd)">'+s.nVentas+'</td>'
          + '<td class="tds" style="text-align:right;font-family:var(--fd)">'+s.nCobranzas+'</td>'
          + '<td style="text-align:right;font-family:var(--fd);font-weight:700">'+fmt(s.generado)+'</td>'
          + '<td style="text-align:right;font-family:var(--fd);font-weight:700;color:var(--amber)">'+fmt(s.pagado)+'</td>'
          + '<td style="text-align:right;font-family:var(--fd);font-weight:900;font-size:13.5px;color:'+saldoCol+'">'+fmt(s.saldo)+'</td>'
          + '<td style="text-align:right;font-family:var(--fd);font-weight:700;color:var(--p1)">'+fmt(st.mes)+'</td>'
          + '<td onclick="event.stopPropagation()"><div style="display:flex;gap:4px;justify-content:flex-end">'
            + '<button class="btn btn-g btn-xs" onclick="_comConfigRapida(\''+u.uid+'\')" title="Configurar comisiones">⚙</button>'
            + (cfg
              ? '<button class="btn btn-g btn-xs" onclick="_comAbrirDetalle(\''+u.uid+'\')">Detalle</button>'
                + '<button class="btn btn-p btn-xs" onclick="_comAbrirPagar(\''+u.uid+'\')" '+(s.saldo<=0?'disabled style="opacity:.4;cursor:not-allowed"':'')+'>$ Pagar</button>'
              : '<button class="btn btn-p btn-xs" onclick="_comConfigRapida(\''+u.uid+'\')">⚙ Configurar</button>')
          + '</div></td>'
          + '</tr>';
      }).join('');
      html += '<div class="card">'
        + '<div class="ch"><div><div class="ct">Vendedores y cobradores</div><div class="cs">Por pagar = comisiones generadas − pagos realizados</div></div></div>'
        + '<div class="tw"><table>'
        + '<thead><tr><th>Vendedor</th><th style="text-align:right">Ventas</th><th style="text-align:right">Cobros</th><th style="text-align:right">Generado</th><th style="text-align:right">Pagado</th><th style="text-align:right">Por pagar</th><th style="text-align:right">Este mes</th><th style="text-align:right">Acciones</th></tr></thead>'
        + '<tbody>'+filasVend
        + '<tr style="border-top:2px solid var(--rim);background:var(--surf2)"><td class="tdm" style="font-weight:900">TOTAL</td><td></td><td></td>'
        + '<td style="text-align:right;font-weight:900;font-family:var(--fd)">'+fmt(totalGenerado)+'</td>'
        + '<td style="text-align:right;font-weight:900;font-family:var(--fd);color:var(--amber)">'+fmt(totalPagado)+'</td>'
        + '<td style="text-align:right;font-weight:900;font-family:var(--fd);color:var(--green)">'+fmt(totalDebe)+'</td>'
        + '<td></td><td></td></tr>'
        + '</tbody></table></div></div>';
    }

  // ── Tab: Cortes quincenales ──
  } else if(tab === 'cortes'){
    var refCorte = window._comCorteRef || hoyLocalISO();
    var rq = _concRangoDe('quincena', refCorte);
    var esQ1 = parseInt(rq.desde.slice(8,10),10) === 1;
    var mesLbl = (function(){ try{ var d=(typeof parseFechaLocal==='function')?parseFechaLocal(rq.desde):new Date(rq.desde+'T12:00:00'); return d.toLocaleDateString('es-VE',{month:'long',year:'numeric'}); }catch(e){ return rq.desde.slice(0,7); } })();
    var cortes = usuarios.map(function(u){
      var cc = _comCalcCorte(u, rq.desde, rq.hasta);
      var s = _comGetSaldo(u);
      return { u:u, cc:cc, saldo:s.saldo, cfg:_comGetConfig(u) };
    });
    var totCorte = cortes.reduce(function(a,x){ return a+x.cc.total; },0);
    var conMov = cortes.filter(function(x){ return x.cc.total>0; }).length;
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;background:var(--surf2);border:1px solid var(--rim2);border-radius:10px;padding:10px 12px">'
      + '<button class="btn btn-g btn-sm" onclick="_comCorteMove(-1)">◀ Anterior</button>'
      + '<div style="text-align:center;min-width:210px">'
        + '<div style="font-size:13px;font-weight:900;color:var(--p1);text-transform:capitalize">'+(esQ1?'1ª':'2ª')+' quincena · '+mesLbl+'</div>'
        + '<div style="font-size:10.5px;color:var(--ink3)">'+rq.desde+' → '+rq.hasta+'</div>'
      + '</div>'
      + '<button class="btn btn-g btn-sm" onclick="_comCorteMove(1)">Siguiente ▶</button>'
      + '<input type="date" value="'+refCorte+'" onchange="_comCorteSetFecha(this.value)" style="border:1px solid var(--rim);border-radius:8px;padding:5px 8px;font-size:12px;font-family:var(--f);background:var(--surf);color:var(--ink)">'
      + '<div style="margin-left:auto;display:flex;gap:6px">'
        + '<button class="btn btn-g btn-sm" onclick="_comCorteExport(\'excel\')">⬇ Excel</button>'
        + '<button class="btn btn-g btn-sm" onclick="_comCorteExport(\'pdf\')">🖨 PDF</button>'
      + '</div>'
      + '</div>';
    html += '<div class="sg" style="grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">'
      + '<div class="stat"><div class="st-v" style="font-size:24px;color:var(--green)">'+fmt(totCorte)+'</div><div class="st-l">Comisiones del corte</div></div>'
      + '<div class="stat"><div class="st-v" style="font-size:24px">'+conMov+'</div><div class="st-l">Empleados con comisión</div></div>'
      + '<div class="stat"><div class="st-v" style="font-size:24px;color:var(--amber)">'+fmt(totalDebe)+'</div><div class="st-l">Por pagar global (todas las quincenas)</div></div>'
      + '</div>';
    if(!usuarios.length){
      html += '<div class="empty"><div class="e-tt">Sin usuarios con comisiones activas</div></div>';
    } else {
      var filasCorte = cortes.map(function(x){
        var nombre = (x.u.nombre || x.u.email || 'Usuario');
        var inics = nombre.split(' ').slice(0,2).map(function(w){return (w[0]||'').toUpperCase();}).join('');
        var sinMov = x.cc.total <= 0;
        var aPagar = Math.min(x.cc.total, Math.max(0, x.saldo));
        return '<tr style="'+(sinMov?'opacity:.55':'')+'">'
          + '<td><div style="display:flex;align-items:center;gap:9px">'
            + '<div style="width:28px;height:28px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:900;color:#fff;flex-shrink:0">'+inics+'</div>'
            + '<span class="tdm">'+nombre+'</span>'
          + '</div></td>'
          + '<td class="tds" style="text-align:right">'+x.cc.ventas.length+' · <b style="font-family:var(--fd)">'+fmt(x.cc.porVenta)+'</b></td>'
          + '<td class="tds" style="text-align:right">'+x.cc.cobranzas.length+' · <b style="font-family:var(--fd)">'+fmt(x.cc.porCobranza)+'</b></td>'
          + '<td style="text-align:right;font-family:var(--fd);font-weight:900;font-size:13.5px;color:'+(x.cc.total>0?'var(--green)':'var(--ink3)')+'">'+fmt(x.cc.total)+'</td>'
          + '<td style="text-align:right;font-family:var(--fd);font-weight:700;color:'+(x.saldo>0?'var(--amber)':'var(--ink3)')+'">'+fmt(x.saldo)+'</td>'
          + '<td style="text-align:right">'+(!x.cfg
              ? '<button class="btn btn-g btn-xs" onclick="_comConfigRapida(\''+x.u.uid+'\')">⚙ Configurar</button>'
              : (sinMov
                ? '<span style="font-size:10.5px;color:var(--ink3)">Sin comisiones</span>'
                : (aPagar>0
                  ? '<button class="btn btn-p btn-xs" onclick="_comCortePagar(\''+x.u.uid+'\','+aPagar.toFixed(2)+',\''+rq.desde+'\',\''+rq.hasta+'\')">$ Pagar corte '+fmt(aPagar)+'</button>'
                  : '<span class="bdg b-g" style="font-size:9px">✓ Ya pagado</span>')))
          + '</td>'
          + '</tr>';
      }).join('');
      html += '<div class="card">'
        + '<div class="ch"><div><div class="ct">Corte quincenal</div><div class="cs">Comisiones generadas del '+rq.desde+' al '+rq.hasta+' · "Pagar corte" descuenta del saldo global</div></div></div>'
        + '<div class="tw"><table>'
        + '<thead><tr><th>Empleado</th><th style="text-align:right">Ventas</th><th style="text-align:right">Cobranzas</th><th style="text-align:right">Comisión del corte</th><th style="text-align:right">Saldo global</th><th style="text-align:right">Acción</th></tr></thead>'
        + '<tbody>'+filasCorte
        + '<tr style="border-top:2px solid var(--rim);background:var(--surf2)"><td class="tdm" style="font-weight:900">TOTAL DEL CORTE</td><td></td><td></td>'
        + '<td style="text-align:right;font-weight:900;font-family:var(--fd);color:var(--green)">'+fmt(totCorte)+'</td><td></td><td></td></tr>'
        + '</tbody></table></div></div>';
    }

  // ── Tab: Comisiones Generadas ──
  } else if(tab === 'generadas'){
    if(!todasGeneradas.length){
      html += '<div class="empty"><div class="e-ic"></div><div class="e-tt">Sin comisiones generadas</div><div style="font-size:12px;color:var(--ink3);margin-top:4px">Las comisiones aparecerán aquí cuando se registren ventas y cobranzas.</div></div>';
    } else {
      // Filtro por usuario
      var usuariosUnicos = [];
      var _uSeen = {};
      todasGeneradas.forEach(function(g){ if(!_uSeen[g.uid]){ _uSeen[g.uid]=1; usuariosUnicos.push({uid:g.uid,nombre:g.usuario}); } });
      var filtroU = window._comFiltroUsuario || '';
      var genFiltradas = filtroU ? todasGeneradas.filter(function(g){return g.uid===filtroU;}) : todasGeneradas;
      var totalGenFilt = genFiltradas.reduce(function(a,g){return a+g.comision;},0);
      var totalVentasFilt = genFiltradas.filter(function(g){return g.tipo==='venta';}).reduce(function(a,g){return a+g.comision;},0);
      var totalCobFilt = genFiltradas.filter(function(g){return g.tipo==='cobranza';}).reduce(function(a,g){return a+g.comision;},0);

      // Mini KPIs del filtro
      html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">'
        + '<select class="fs" style="min-width:180px;font-weight:700;color:var(--p1);border-color:rgba(37,99,235,0.3)" onchange="window._comFiltroUsuario=this.value;nav(&quot;comisiones&quot;)">'
        + '<option value="">Todos los vendedores</option>'
        + usuariosUnicos.map(function(u){ return '<option value="'+u.uid+'" '+(filtroU===u.uid?'selected':'')+'>'+u.nombre+'</option>'; }).join('')
        + '</select>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">'
        + '<span style="background:var(--gs);border-radius:20px;padding:5px 12px;font-weight:800;color:var(--p1)">Total: '+fmt(totalGenFilt)+'</span>'
        + '<span style="background:var(--greens);border-radius:20px;padding:5px 12px;font-weight:700;color:var(--green)">Ventas: '+fmt(totalVentasFilt)+'</span>'
        + '<span style="background:var(--blues);border-radius:20px;padding:5px 12px;font-weight:700;color:var(--blue)">Cobranzas: '+fmt(totalCobFilt)+'</span>'
        + '</div>'
        + '</div>'
        + '<div class="card" style="padding:0;overflow:hidden">'
        + '<div class="ch" style="padding:13px 16px;border-bottom:1px solid var(--rim2)">'
        + '<div><div class="ct">Comisiones generadas</div><div class="cs">'+genFiltradas.length+' transacción'+(genFiltradas.length!==1?'es':'')+' · todas las sedes</div></div>'
        + '</div>'
        + '<div style="overflow-x:auto"><table class="tbl"><thead><tr>'
        + '<th style="width:36px"></th>'
        + '<th>Fecha</th>'
        + '<th>Vendedor</th>'
        + '<th>Cliente</th>'
        + '<th>Detalle</th>'
        + '<th style="text-align:right">Base</th>'
        + '<th style="text-align:right">Comisión</th>'
        + '</tr></thead><tbody>'
        + genFiltradas.map(function(g){
            var esVenta = g.tipo === 'venta';
            var iconBg = esVenta ? 'var(--greens)' : 'var(--blues)';
            var iconColor = esVenta ? 'var(--green)' : 'var(--blue)';
            var iconLbl = esVenta ? '·' : '';
            var inics = g.usuario.split(' ').slice(0,2).map(function(w){return (w[0]||'').toUpperCase();}).join('');
            return '<tr>'
              +'<td><div style="width:32px;height:32px;border-radius:9px;background:'+iconBg+';display:flex;align-items:center;justify-content:center;font-size:14px">'+iconLbl+'</div></td>'
              +'<td style="font-size:11.5px;color:var(--ink3);white-space:nowrap">'+(g.fecha||'—')+'</td>'
              +'<td><div style="display:flex;align-items:center;gap:7px">'
                +'<div style="width:26px;height:26px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:900;color:#fff;flex-shrink:0">'+inics+'</div>'
                +'<span style="font-weight:700;font-size:12.5px">'+g.usuario+'</span>'
              +'</div></td>'
              +'<td style="font-size:12px;color:var(--ink2)">'+(g.cliente||'—')+'</td>'
              +'<td style="font-size:11.5px;color:var(--ink3)">'+(g.detalle||'—')+'<br><span style="font-size:10px;background:'+iconBg+';color:'+iconColor+';border-radius:10px;padding:1px 7px;font-weight:700">'+(esVenta?'Venta':'Cobranza')+'</span></td>'
              +'<td style="text-align:right;font-size:12px;color:var(--ink3);font-family:var(--fd)">'+fmt(g.base)+'</td>'
              +'<td style="text-align:right;font-family:var(--fd);font-weight:900;font-size:14px;color:var(--green)">+'+fmt(g.comision)+'</td>'
              +'</tr>';
          }).join('')
        + '</tbody></table></div></div>';
    }

  // ── Tab: Historial de pagos ──
  } else {
    if(!historial.length){
      html += '<div class="empty"><div class="e-ic"></div><div class="e-tt">Sin pagos de comisiones registrados</div><div style="font-size:12px;color:var(--ink3);margin-top:4px">Los pagos aparecerán aquí cuando uses el botón "$ Pagar" en cada tarjeta.</div></div>';
    } else {
      // Mini KPIs del historial
      var totalHistorial = historial.reduce(function(a,e){return a+(parseFloat(e.monto)||0);},0);
      var mesActual = new Date().toISOString().slice(0,7);
      var pagosMes = historial.filter(function(e){return (e.fecha||'').startsWith(mesActual);});
      var totalMes = pagosMes.reduce(function(a,e){return a+(parseFloat(e.monto)||0);},0);

      html += '<div class="sg" style="grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">'
        + '<div class="stat"><div class="st-v" style="font-size:26px;color:var(--amber)">'+fmt(totalHistorial)+'</div><div class="st-l">Total pagado histórico</div></div>'
        + '<div class="stat"><div class="st-v" style="font-size:26px;color:var(--p1)">'+fmt(totalMes)+'</div><div class="st-l">Pagado este mes</div></div>'
        + '<div class="stat"><div class="st-v" style="font-size:26px">'+historial.length+'</div><div class="st-l">Pagos realizados</div></div>'
        + '</div>'
        + '<div class="card" style="padding:0;overflow:hidden">'
        + '<div class="ch" style="padding:13px 16px;border-bottom:1px solid var(--rim2)">'
        + '<div><div class="ct">Historial de pagos</div><div class="cs">'+historial.length+' pago'+(historial.length!==1?'s':'')+' realizados</div></div>'
        + '<button class="btn btn-g btn-sm" onclick="_comExportarCSV()">⬇ Exportar Excel</button>'
        + '</div>'
        + '<div style="overflow-x:auto"><table class="tbl"><thead><tr>'
        + '<th style="width:36px"></th>'
        + '<th>Fecha</th>'
        + '<th>Vendedor</th>'
        + '<th style="text-align:right">Monto</th>'
        + '<th>Cuenta / Forma</th>'
        + '<th>Registrado por</th>'
        + '<th>Notas</th>'
        + '<th style="width:36px"></th>'
        + '</tr></thead><tbody>'
        + historial.map(function(e){
            var inics=(e.usuarioComisionNombre||'?').split(' ').slice(0,2).map(function(w){return (w[0]||'').toUpperCase();}).join('');
            var u=(_usersCache||[]).find(function(x){return (x.nombre||x.email||'').toLowerCase()===(e.usuarioComisionNombre||'').toLowerCase();});
            return '<tr>'
              +'<td><div style="width:32px;height:32px;border-radius:9px;background:var(--ambers);display:flex;align-items:center;justify-content:center;font-size:14px"></div></td>'
              +'<td style="font-size:11.5px;color:var(--ink3);white-space:nowrap;font-family:var(--fd)">'+(e.fecha||'—')+'</td>'
              +'<td><div style="display:flex;align-items:center;gap:7px">'
                +'<div style="width:26px;height:26px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:8.5px;font-weight:900;color:#fff;flex-shrink:0">'+inics+'</div>'
                +'<span style="font-weight:700;font-size:12.5px">'+(e.usuarioComisionNombre||'—')+'</span>'
              +'</div></td>'
              +'<td style="text-align:right;font-family:var(--fd);font-weight:900;font-size:15px;color:var(--amber)">'+fmt(parseFloat(e.monto)||0)+'</td>'
              +'<td style="font-size:11.5px;color:var(--ink2)">'+(e.forma||e.cuenta||'—')+'</td>'
              +'<td style="font-size:11px;color:var(--ink3)">'+(e.creadoPor||'—')+'</td>'
              +'<td style="font-size:11px;color:var(--ink3);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(e.notas||'—')+'</td>'
              +'<td><button class="btn btn-d btn-xs" onclick="_comAbrirEliminarPago('+e.id+',&quot;'+(u&&u.uid||'')+'&quot;)">x</button></td>'
              +'</tr>';
          }).join('')
        + '</tbody></table></div></div>';
    }
  }

  html += '</div>';
  return html;
}

function _comExportarCSV(){
  var usuarios = _comGetUsuariosActivos();
  var n2=function(v){return Math.round((parseFloat(v)||0)*100)/100;};
  var aoa=[];
  aoa.push(['Vendedor','Email','Generado','Por venta','Por cobranza','Pagado','Saldo pendiente','Nº ventas','Nº cobranzas']);
  usuarios.forEach(function(u){
    var s=_comGetSaldo(u);
    aoa.push([u.nombre||u.email||'',u.email||'',n2(s.generado),n2(s.porVenta),n2(s.porCobranza),n2(s.pagado),n2(s.saldo),s.nVentas,s.nCobranzas]);
  });
  aoa.push([]);
  aoa.push(['=== HISTORIAL DE PAGOS ===']);
  aoa.push(['Fecha','Vendedor','Monto','Cuenta','Pagado por','Notas']);
  (S.egresos||[]).filter(function(e){return !e.eliminado&&e.categoria==='comisiones';})
    .sort(function(a,b){return (b.fecha||'').localeCompare(a.fecha||'');})
    .forEach(function(e){ aoa.push([e.fecha||'',e.usuarioComisionNombre||'',n2(e.monto),e.forma||e.cuenta||'',e.creadoPor||'',e.notas||'']); });
  aoa.push([]);
  aoa.push(['=== DETALLE DE VENTAS ===']);
  aoa.push(['Vendedor','Crédito','Cliente','Modelo','Fecha','Precio','Comisión']);
  usuarios.forEach(function(u){
    var gen=_comCalcGenerado(u);
    gen.ventas.forEach(function(v){ aoa.push([u.nombre||u.email||'',v.credId,v.cliente,v.modelo,v.fecha,n2(v.precio),n2(v.comision)]); });
  });
  if(typeof _xlsxDownload==='function') _xlsxDownload('comisiones-'+hoyLocalISO()+'.xlsx', [{name:'Comisiones', rows:aoa}]);
  toast('Excel (.xlsx) descargado','success');
}
// Tarjeta individual de usuario — compacta, igual estilo que cards de cuentas
// Filtrado por buscador
function _comFiltrar(){
  var q = (($('com-search')&&$('com-search').value)||'').toLowerCase().trim();
  document.querySelectorAll('.com-card').forEach(function(card){
    var nm = (card.getAttribute('data-nombre')||'');
    card.style.display = (!q || nm.indexOf(q) !== -1) ? '' : 'none';
  });
}

// ════════ MODAL: PAGAR COMISIÓN ════════
// montoPre/notaPre (opcionales): prellenan el pago — usados por "Pagar corte" quincenal
function _comAbrirPagar(uid, montoPre, notaPre){
  var u = (_usersCache||[]).find(function(x){return x.uid===uid;});
  if(!u){ toast('Usuario no encontrado','error'); return; }
  var s = _comGetSaldo(u);
  if(s.saldo <= 0){ toast('Este usuario no tiene saldo pendiente','info'); return; }
  var montoInicial = (montoPre && montoPre > 0) ? Math.min(montoPre, s.saldo) : s.saldo;
  var notaInicial = String(notaPre||'').replace(/</g,'&lt;');
  var cuentas = (typeof _cuentasBanc !== 'undefined' && _cuentasBanc) ? _cuentasBanc : [];
  if(!cuentas.length){ toast('No hay cuentas bancarias configuradas','error'); return; }
  setMicon('comision');
  $('mtt').textContent='Pagar Comisión';
  $('msb').textContent=u.nombre || u.email;
  $('modal-box').className='modal';
  // Lista de cuentas con saldos
  var cuentasOpts = cuentas.map(function(c){
    var saldo = (typeof saldoCuenta === 'function') ? saldoCuenta(c.nombre) : 0;
    var mon = (c.moneda||'USD').toUpperCase()==='BS' ? 'Bs' : '$';
    return '<option value="'+c.nombre.replace(/"/g,'&quot;')+'" data-saldo="'+saldo+'">'
      + c.nombre + ' (' + mon + ' ' + saldo.toFixed(2) + ')'
      + '</option>';
  }).join('');
  $('mbd').innerHTML = ''
    + '<div style="background:rgba(0,184,118,0.08);border:1px solid rgba(0,184,118,0.25);border-radius:9px;padding:11px 13px;margin-bottom:14px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Saldo a pagar</div>'
    + '<div style="font-family:var(--fd);font-weight:800;font-size:22px;color:var(--green)">$ '+s.saldo.toFixed(2)+'</div></div>'
    + '<div style="text-align:right;font-size:10.5px;color:var(--ink3)">Generado: $'+s.generado.toFixed(2)+'<br>Pagado: $'+s.pagado.toFixed(2)+'</div>'
    + '</div></div>'
    + '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Monto a pagar <span style="color:var(--red)">*</span></label>'
    + '<input class="fi" type="number" step="0.01" min="0.01" max="'+s.saldo+'" id="comp_monto" value="'+montoInicial.toFixed(2)+'" oninput="_comValidarPago()">'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px">Puedes pagar parcial o total. Máximo: $'+s.saldo.toFixed(2)+'</div></div>'
    + '<div class="fg"><label>Cuenta de origen <span style="color:var(--red)">*</span></label>'
    + '<select class="fs" id="comp_cuenta" onchange="_comValidarPago()">'+cuentasOpts+'</select>'
    + '<div id="comp_saldo_warn" style="font-size:10.5px;margin-top:3px;color:var(--ink3)"></div></div>'
    + '<div class="fg"><label>Fecha</label>'
    + '<input class="fi" type="date" id="comp_fecha" value="'+(hoyLocalISO())+'"></div>'
    + '<div class="fg"><label>Notas (opcional)</label>'
    + '<textarea class="fi" id="comp_notas" rows="2" placeholder="Ej: Pago de comisiones primera quincena">'+notaInicial+'</textarea></div>'
    + '</div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" id="comp_btn_save" onclick="_comGuardarPago(\''+uid+'\')">Pagar comisión</button>';
  $('ov').style.display='flex';
  setTimeout(_comValidarPago, 50);
}

// Validación en vivo del modal de pago
function _comValidarPago(){
  var monto = parseFloat(($('comp_monto')&&$('comp_monto').value)||0)||0;
  var sel = $('comp_cuenta');
  var btn = $('comp_btn_save');
  var warn = $('comp_saldo_warn');
  if(!sel || !btn) return;
  var opt = sel.options[sel.selectedIndex];
  var saldoCta = parseFloat(opt && opt.getAttribute('data-saldo') || 0)||0;
  if(monto <= 0){
    if(warn){ warn.textContent='Ingresa un monto válido'; warn.style.color='var(--red)'; }
    btn.disabled = true; btn.style.opacity='.5';
    return;
  }
  if(monto > saldoCta){
    if(warn){ warn.innerHTML='⚠ Saldo insuficiente · Cuenta tiene <b>$'+saldoCta.toFixed(2)+'</b>'; warn.style.color='var(--red)'; }
    btn.disabled = true; btn.style.opacity='.5';
    return;
  }
  if(warn){ warn.innerHTML='Saldo disponible: <b>$'+saldoCta.toFixed(2)+'</b>'; warn.style.color='var(--ink3)'; }
  btn.disabled = false; btn.style.opacity='1';
}

// Guardar pago de comisión
function _comGuardarPago(uid){
  var u = (_usersCache||[]).find(function(x){return x.uid===uid;});
  if(!u){ toast('Usuario no encontrado','error'); return; }
  var monto = parseFloat(($('comp_monto')&&$('comp_monto').value)||0)||0;
  var cuenta = ($('comp_cuenta')&&$('comp_cuenta').value)||'';
  var fecha = ($('comp_fecha')&&$('comp_fecha').value)||hoyLocalISO();
  var notas = ($('comp_notas')&&$('comp_notas').value)||'';
  if(monto <= 0){ toast('Monto inválido','error'); return; }
  if(!cuenta){ toast('Selecciona una cuenta','error'); return; }
  // Validar saldo
  var saldoCta = (typeof saldoCuenta === 'function') ? saldoCuenta(cuenta) : 0;
  if(monto > saldoCta + 0.001){ toast('Saldo insuficiente en '+cuenta,'error'); return; }
  // Validar saldo del usuario
  var s = _comGetSaldo(u);
  if(monto > s.saldo + 0.001){ toast('El monto excede lo adeudado ($'+s.saldo.toFixed(2)+')','error'); return; }
  var hora = new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false});
  var quien = (S.currentUser&&S.currentUser.nombre)||'Admin';
  // 1) Crear egreso. El numero lo da el contador de Firestore: calculado en memoria,
  // dos pagos casi a la vez sacaban el mismo y el segundo borraba al primero (punto 30).
  var _btnCom = document.getElementById('comp_btn_save');
  if(_btnCom) _btnCom.disabled = true;
  nextEgresoIdAsync().then(function(newEgId){
  var concepto = 'Pago de comisión · '+(u.nombre||u.email);
  var newEg = {
    id: newEgId,
    concepto: concepto,
    monto: monto,
    fecha: fecha,
    categoria: 'comisiones',
    forma: cuenta,
    notas: notas,
    usuarioComisionUid: uid,
    usuarioComisionNombre: u.nombre || u.email || '',
    origenAuto: 'comision',
    eliminado: false,
    creadoPor: quien,
    creadoEn: new Date().toISOString()
  };
  if(S.egresos) S.egresos.push(newEg);
  if(DB && DB.saveEgreso) DB.saveEgreso(newEg);
  // 2) Crear movimiento de retiro
  var mov = {
    id: 'MOV-COM-'+uid+'-'+Date.now(),
    tipo: 'retiro',
    tipoOperacion: 'comision',
    concepto: 'Egreso · ' + concepto,
    monto: monto,
    cuentaOrigen: cuenta,
    cuentaDestino: null,
    fecha: fecha,
    referencia: notas,
    realizadoPor: quien,
    tasaBs: window._tasaBsGlobal||1,
    hora: hora,
    usuarioComisionUid: uid,
    usuarioComisionNombre: u.nombre || u.email || '',
    conceptoEgreso: newEg.id
  };
  if(S.movimientos) S.movimientos.push(mov);
  if(DB && DB.saveMovimiento) DB.saveMovimiento(mov);
  closeM();
  toast('Comisión pagada · $'+monto.toFixed(2),'success');
  if(S.page === 'comisiones') nav('comisiones');
  }).catch(function(e){
    if(_btnCom) _btnCom.disabled = false;
    toast('No se pudo reservar el número del gasto: ' + (e && e.message || e), 'error');
  });
}

// ════════ MODAL: DETALLE ════════
function _comAbrirDetalle(uid){
  var u = (_usersCache||[]).find(function(x){return x.uid===uid;});
  if(!u){ toast('Usuario no encontrado','error'); return; }
  var s = _comGetSaldo(u);
  var pagosRealizados = _comGetPagosRealizados(u);
  setMicon('detalle');
  $('mtt').textContent='Detalle · '+(u.nombre||u.email);
  $('msb').textContent='Comisiones generadas y pagos';
  $('modal-box').className='modal modal-lg';
  // Pestañas internas: ventas / cobranzas / pagos
  var tabActual = window._comDetalleTab || 'ventas';
  var tabBtn = function(id, label, count){
    var act = tabActual === id;
    return '<button onclick="_comDetalleSetTab(\''+id+'\',\''+uid+'\')" style="background:none;border:none;padding:9px 16px;font-size:12px;font-weight:'+(act?'800':'600')+';color:'+(act?'var(--p1)':'var(--ink3)')+';border-bottom:3px solid '+(act?'var(--p1)':'transparent')+';margin-bottom:-2px;cursor:pointer;font-family:var(--f)">'
      + label + ' <span style="background:var(--gs);color:var(--ink2);font-size:10px;padding:1px 7px;border-radius:9px;margin-left:4px">'+count+'</span>'
      + '</button>';
  };
  var contenido = '';
  if(tabActual === 'ventas'){
    contenido = s.ventas.length === 0
      ? '<div style="padding:40px;text-align:center;color:var(--ink3);font-size:12.5px">Sin ventas registradas</div>'
      : '<div class="tw" style="overflow-x:auto"><table style="font-size:11.5px;min-width:600px">'
        + '<thead><tr style="background:var(--gs)"><th style="padding:8px;text-align:left">Fecha</th><th style="padding:8px;text-align:left">Crédito</th><th style="padding:8px;text-align:left">Cliente</th><th style="padding:8px;text-align:left">Modelo</th><th style="padding:8px;text-align:right">Precio</th><th style="padding:8px;text-align:right">Comisión</th></tr></thead>'
        + '<tbody>' + s.ventas.map(function(v){
          return '<tr style="border-bottom:1px solid var(--rim2)">'
            + '<td style="padding:6px 8px">'+(v.fecha||'').slice(0,10)+'</td>'
            + '<td style="padding:6px 8px;font-family:var(--fd);font-size:10.5px">'+v.credId+'</td>'
            + '<td style="padding:6px 8px">'+v.cliente+'</td>'
            + '<td style="padding:6px 8px;color:var(--ink3);font-size:10.5px">'+v.modelo+'</td>'
            + '<td style="padding:6px 8px;text-align:right;font-family:var(--fd)">$'+v.precio.toFixed(2)+'</td>'
            + '<td style="padding:6px 8px;text-align:right;font-family:var(--fd);color:var(--p1);font-weight:700">$'+v.comision.toFixed(2)+'</td>'
            + '</tr>';
        }).join('') + '</tbody></table></div>';
  } else if(tabActual === 'cobranzas'){
    contenido = s.cobranzas.length === 0
      ? '<div style="padding:40px;text-align:center;color:var(--ink3);font-size:12.5px">Sin cobranzas registradas</div>'
      : '<div class="tw" style="overflow-x:auto"><table style="font-size:11.5px;min-width:600px">'
        + '<thead><tr style="background:var(--gs)"><th style="padding:8px;text-align:left">Fecha</th><th style="padding:8px;text-align:left">Pago</th><th style="padding:8px;text-align:left">Cliente</th><th style="padding:8px;text-align:right">Monto pagado</th><th style="padding:8px;text-align:right">Comisión</th></tr></thead>'
        + '<tbody>' + s.cobranzas.map(function(c){
          return '<tr style="border-bottom:1px solid var(--rim2)">'
            + '<td style="padding:6px 8px">'+(c.fecha||'').slice(0,10)+'</td>'
            + '<td style="padding:6px 8px;font-family:var(--fd);font-size:10.5px">'+c.pagoId+'</td>'
            + '<td style="padding:6px 8px">'+c.cliente+'</td>'
            + '<td style="padding:6px 8px;text-align:right;font-family:var(--fd)">$'+c.monto.toFixed(2)+'</td>'
            + '<td style="padding:6px 8px;text-align:right;font-family:var(--fd);color:var(--green);font-weight:700">$'+c.comision.toFixed(2)+'</td>'
            + '</tr>';
        }).join('') + '</tbody></table></div>';
  } else { // pagos
    contenido = pagosRealizados.length === 0
      ? '<div style="padding:40px;text-align:center;color:var(--ink3);font-size:12.5px">Aún no se le ha pagado ninguna comisión</div>'
      : '<div class="tw" style="overflow-x:auto"><table style="font-size:11.5px;min-width:700px">'
        + '<thead><tr style="background:var(--gs)"><th style="padding:8px;text-align:left">Fecha</th><th style="padding:8px;text-align:left">Cuenta</th><th style="padding:8px;text-align:right">Monto</th><th style="padding:8px;text-align:left">Notas</th><th style="padding:8px;text-align:left">Pagado por</th><th style="padding:8px;text-align:center">Acción</th></tr></thead>'
        + '<tbody>' + pagosRealizados.map(function(e){
          return '<tr style="border-bottom:1px solid var(--rim2)">'
            + '<td style="padding:6px 8px">'+(e.fecha||'').slice(0,10)+'</td>'
            + '<td style="padding:6px 8px">'+(e.forma||'—')+'</td>'
            + '<td style="padding:6px 8px;text-align:right;font-family:var(--fd);color:var(--p1);font-weight:700">$'+(parseFloat(e.monto)||0).toFixed(2)+'</td>'
            + '<td style="padding:6px 8px;color:var(--ink3);font-size:10.5px">'+(e.notas||'—')+'</td>'
            + '<td style="padding:6px 8px;color:var(--ink3);font-size:10.5px">'+(e.creadoPor||'—')+'</td>'
            + '<td style="padding:6px 8px;text-align:center"><button class="btn btn-d btn-xs" onclick="_comAbrirEliminarPago('+e.id+',\''+uid+'\')">Eliminar</button></td>'
            + '</tr>';
        }).join('') + '</tbody></table></div>';
  }
  $('mbd').innerHTML = ''
    // Resumen arriba
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">'
    + '<div style="background:var(--gs);padding:10px;border-radius:8px"><div style="font-size:9px;font-weight:800;color:var(--ink3);text-transform:uppercase">Generado</div><div style="font-family:var(--fd);font-weight:800;font-size:14px;margin-top:2px">$'+s.generado.toFixed(2)+'</div></div>'
    + '<div style="background:var(--gs);padding:10px;border-radius:8px"><div style="font-size:9px;font-weight:800;color:var(--ink3);text-transform:uppercase">Pagado</div><div style="font-family:var(--fd);font-weight:800;font-size:14px;color:var(--p1);margin-top:2px">$'+s.pagado.toFixed(2)+'</div></div>'
    + '<div style="background:var(--gs);padding:10px;border-radius:8px"><div style="font-size:9px;font-weight:800;color:var(--ink3);text-transform:uppercase">Por pagar</div><div style="font-family:var(--fd);font-weight:800;font-size:14px;color:var(--green);margin-top:2px">$'+s.saldo.toFixed(2)+'</div></div>'
    + '<div style="background:var(--gs);padding:10px;border-radius:8px"><div style="font-size:9px;font-weight:800;color:var(--ink3);text-transform:uppercase">Operaciones</div><div style="font-family:var(--fd);font-weight:800;font-size:14px;margin-top:2px">'+(s.nVentas+s.nCobranzas)+'</div></div>'
    + '</div>'
    // Desglose por sede (Opción C — siempre visible si hay sedes)
    + (function(){
        var desglose = _comDesglosePorSede(u);
        if(!desglose.length) return '';
        return '<div style="background:rgba(74,107,255,0.05);border:1px solid rgba(74,107,255,0.18);border-radius:12px;padding:13px 15px;margin-bottom:16px">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
            + '<div style="font-size:10px;font-weight:800;color:var(--p1);text-transform:uppercase;letter-spacing:.5px">Desglose por sede</div>'
            + '<div style="font-size:10px;color:var(--ink3)">Total: <b style="color:var(--ink1)">$'+s.saldo.toFixed(2)+'</b></div>'
          + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">'
          + desglose.map(function(d){
              var pctSede = s.generado > 0 ? Math.round((d.total/s.generado)*100) : 0;
              return '<div style="background:var(--surf);border:1px solid var(--rim2);border-radius:9px;padding:10px 12px">'
                + '<div style="font-weight:800;font-size:12px;color:var(--ink1);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+d.nombre+'</div>'
                + '<div style="font-family:var(--fd);font-size:18px;font-weight:900;color:var(--p1);line-height:1;margin-bottom:6px">$'+d.total.toFixed(2)+'</div>'
                + '<div style="display:flex;gap:8px;margin-bottom:7px">'
                  + '<span style="font-size:10px;color:var(--ink3)">· <b>'+d.nVentas+'</b> venta'+(d.nVentas===1?'':'s')+' · $'+d.porVenta.toFixed(2)+'</span>'
                + '</div>'
                + '<div style="font-size:10px;color:var(--ink3);margin-bottom:7px"> <b>'+d.nCobranzas+'</b> cobro'+(d.nCobranzas===1?'':'s')+' · $'+d.porCobranza.toFixed(2)+'</div>'
                + '<div style="height:3px;background:var(--rim);border-radius:2px;overflow:hidden">'
                  + '<div style="height:100%;width:'+pctSede+'%;background:var(--grad);border-radius:2px"></div>'
                + '</div>'
                + '<div style="font-size:9px;color:var(--ink3);margin-top:3px;text-align:right">'+pctSede+'% del total</div>'
              + '</div>';
            }).join('')
          + '</div>'
          + '<div style="font-size:10px;color:var(--ink3);margin-top:10px;font-style:italic;text-align:center">El pago se realiza en un solo desembolso sobre el total adeudado, independientemente de la sede.</div>'
          + '</div>';
      })()
    // Tabs
    + '<div style="display:flex;border-bottom:2px solid var(--rim);margin-bottom:12px">'
    + tabBtn('ventas', 'Ventas', s.nVentas)
    + tabBtn('cobranzas', 'Cobranzas', s.nCobranzas)
    + tabBtn('pagos', 'Pagos realizados', pagosRealizados.length)
    + '</div>'
    // Contenido
    + contenido;
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>'
    + (s.saldo > 0 ? '<button class="btn btn-p" onclick="closeM();_comAbrirPagar(\''+uid+'\')">$ Pagar $'+s.saldo.toFixed(2)+'</button>' : '');
  $('ov').style.display='flex';
}

function _comDetalleSetTab(tab, uid){
  window._comDetalleTab = tab;
  _comAbrirDetalle(uid);
}

// ════════ MODAL: ELIMINAR PAGO DE COMISIÓN ════════
function _comAbrirEliminarPago(egId, uid){
  var eg = (S.egresos||[]).find(function(x){return x.id === egId || x.id === Number(egId);});
  if(!eg){ toast('Egreso no encontrado','error'); return; }
  setMicon('eliminar');
  $('mtt').textContent='Eliminar Pago de Comisión';
  $('msb').textContent='$'+(parseFloat(eg.monto)||0).toFixed(2);
  $('modal-box').className='modal';
  $('mbd').innerHTML = ''
    + '<div style="background:rgba(255,71,87,0.08);border:1px solid rgba(255,71,87,0.25);border-radius:9px;padding:11px 13px;margin-bottom:14px;font-size:12px;line-height:1.55">'
    + '<strong style="color:var(--red)">⚠ Atención:</strong> Estás a punto de eliminar el pago de comisión de <b>'+(eg.usuarioComisionNombre||'usuario')+'</b> '
    + 'realizado el <b>'+eg.fecha+'</b> desde la cuenta <b>'+eg.forma+'</b> por <b>$'+(parseFloat(eg.monto)||0).toFixed(2)+'</b>.'
    + '</div>'
    + '<div class="fg"><label>Razón <span style="color:var(--red)">*</span></label>'
    + '<textarea class="fi" id="cdel_razon" rows="2" placeholder="Ej: Error en el monto, pago duplicado, etc."></textarea></div>'
    + '<div style="margin-top:14px">'
    + '<div style="font-size:11px;font-weight:800;color:var(--ink2);margin-bottom:8px">¿Qué hacer con el dinero?</div>'
    + '<label style="display:flex;align-items:flex-start;gap:9px;padding:11px;border:2px solid var(--green);border-radius:10px;cursor:pointer;background:rgba(0,184,118,.05);margin-bottom:7px">'
    + '<input type="radio" name="cdel_dev" value="si" checked style="margin-top:3px;accent-color:var(--green);flex-shrink:0">'
    + '<div><div style="font-size:13px;font-weight:700;color:var(--green)">Devolver el dinero a la cuenta</div>'
    + '<div style="font-size:11px;color:var(--ink3);margin-top:2px;line-height:1.5">Se hace reverso del retiro y la deuda con el vendedor se vuelve a cargar (volverá a aparecer "se le debe").</div></div>'
    + '</label>'
    + '<label style="display:flex;align-items:flex-start;gap:9px;padding:11px;border:2px solid var(--rim);border-radius:10px;cursor:pointer">'
    + '<input type="radio" name="cdel_dev" value="no" style="margin-top:3px;accent-color:var(--ink2);flex-shrink:0">'
    + '<div><div style="font-size:13px;font-weight:700;color:var(--ink1)">No devolver — solo eliminar el registro</div>'
    + '<div style="font-size:11px;color:var(--ink3);margin-top:2px;line-height:1.5">El egreso queda contabilizado pero sin asociarse al usuario. La deuda sigue saldada (no le debes al vendedor).</div></div>'
    + '</label>'
    + '</div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="_comAbrirDetalle(\''+uid+'\')">Cancelar</button>'
    + '<button class="btn btn-d" onclick="_comConfirmarEliminarPago('+eg.id+',\''+uid+'\')">Eliminar pago</button>';
  $('ov').style.display='flex';
}

function _comConfirmarEliminarPago(egId, uid){
  // Anular un pago de comision mueve dinero: mismo permiso que borrar (punto 9)
  if(typeof requireDeletePermission==='function' && !requireDeletePermission()) return;
  var idx = (S.egresos||[]).findIndex(function(x){return x.id === egId || x.id === Number(egId);});
  if(idx < 0){ toast('Egreso no encontrado','error'); return; }
  var razon = ($('cdel_razon')&&$('cdel_razon').value||'').trim();
  if(!razon){ toast('Indica la razón de eliminación','error'); return; }
  var devolver = (document.querySelector('input[name="cdel_dev"]:checked')||{}).value === 'si';
  var eg = S.egresos[idx];
  var quien = (S.currentUser&&S.currentUser.nombre)||'Admin';
  var ahora = new Date().toISOString();
  // Marcar egreso como eliminado
  eg.eliminado = true;
  eg.eliminadoPor = quien;
  eg.eliminadoEn = ahora;
  eg.eliminadoRazon = razon;
  eg.devolvioDinero = devolver;
  // Coromoto lee esta marca: anulado sin regresar = el dinero salio igual
  eg.eliminacionReversaCuenta = devolver;
  if(!devolver){
    // Si no se devuelve el dinero, "desasociar" del usuario para que no afecte su saldo
    // pero conservamos el egreso (el dinero ya salió de la caja)
    eg.usuarioComisionDesasociado = true;
    eg.usuarioComisionUid = '';
    eg.usuarioComisionNombre = '';
    // Cambiar categoría para que no aparezca como comisión activa
    eg.categoria = 'comisiones_anulada';
  }
  if(DB && DB.saveEgreso) DB.saveEgreso(eg);
  // Buscar y manejar el movimiento asociado
  var mov = (S.movimientos||[]).find(function(m){
    return !m.eliminado && m.tipoOperacion === 'comision' && m.conceptoEgreso === egId;
  });
  // El retiro NO se anula (anularlo ya devolvia el dinero y el reverso lo devolvia
  // otra vez; punto 3, 18-sep-2026). Devolver = un deposito de reverso; no devolver = nada.
  if(mov && devolver && !mov.reversoCreado){
    var rev = {
      id: 'MOV-COMREV-'+egId+'-'+Date.now(),
      tipo: 'deposito',
      tipoOperacion: 'comision_reverso',
      concepto: 'Reverso · ' + (mov.concepto||''),
      monto: parseFloat(eg.monto)||0,
      cuentaOrigen: null,
      cuentaDestino: mov.cuentaOrigen,
      fecha: hoyLocalISO(),
      referencia: 'Reverso por eliminación · ' + razon,
      realizadoPor: quien,
      tasaBs: window._tasaBsGlobal||1,
      hora: new Date().toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false}),
      reversoDe: 'comision:'+egId,
      usuarioComisionUid: uid
    };
    mov.reversoCreado = true;
    if(DB && DB.saveMovimiento) DB.saveMovimiento(mov);
    if(S.movimientos) S.movimientos.push(rev);
    if(DB && DB.saveMovimiento) DB.saveMovimiento(rev);
  }
  closeM();
  toast(devolver ? 'Pago eliminado y dinero devuelto a la cuenta' : 'Pago eliminado (dinero no devuelto)', devolver?'success':'info');
  if(S.page === 'comisiones') nav('comisiones');
}

// ════════ INTEGRACIÓN CON PERFIL DE USUARIO ════════
// Esta función se llama desde el modal "Editar Permisos" para guardar la config de comisiones
function _comGuardarConfigUsuario(uid, config){
  if(!DB || !DB.updateUsuario) return;
  DB.updateUsuario(uid, { comisiones: config });
  // Actualizar cache local
  try{
    if(typeof _usersCache !== 'undefined' && Array.isArray(_usersCache)){
      var cached = _usersCache.find(function(x){ return x.uid === uid; });
      if(cached){ cached.comisiones = config; }
    }
  }catch(e){}
}

// Toggle del checkbox "Gana comisiones" en el modal de editar usuario
function _euComToggle(){
  var box = $('eu_com_box');
  var chk = $('eu_com_activo');
  if(box && chk){
    box.style.display = chk.checked ? 'block' : 'none';
  }
}


// ╔══════════════════════════════════════════════════════════╗
// ║  MÓDULO CONCESIONARIOS                                    ║
// ║  - CRUD de sedes/puntos de venta                          ║
// ║  - Asignación de usuarios a múltiples concesionarios      ║
// ║  - Switcher en header para alternar concesionario activo  ║
// ║  ENTREGA 2: Filtros automáticos + asignación histórica.   ║
// ║  Modo Concesionario y Bandeja Aprobaciones → Entrega 3.   ║
// ╚══════════════════════════════════════════════════════════╝

// ── Helpers ──

// Devuelve un concesionario por id (ó null)
