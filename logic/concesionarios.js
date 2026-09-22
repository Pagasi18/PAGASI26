// Pagasi logic: concesionarios
function _concGetById(id){
  if(!id) return null;
  return (S.concesionarios||[]).find(function(c){return c.id===id;}) || null;
}

// Devuelve los concesionarios que el usuario actual puede ver
// Admin (sin restricciones de concesionario) ve todos
function _concGetVisibles(){
  var all = (S.concesionarios||[]).filter(function(c){return !c.eliminado;});
  var u = S.currentUser;
  if(!u) return all;
  // Si el usuario tiene rol Administrador y no tiene asignaciones específicas, ve todos
  var asignados = u.concesionarios || [];
  if((u.rol === 'Administrador' || u.rol === 'Gerente') && (!asignados.length)){
    return all;
  }
  // Si tiene asignaciones explícitas, filtramos
  if(asignados.length){
    return all.filter(function(c){ return asignados.indexOf(c.id) !== -1; });
  }
  // Sin asignaciones y no admin → ve todos por compatibilidad (mientras está en transición)
  return all;
}

// ── HELPERS DE FILTRADO POR CONCESIONARIO (Entrega 2) ──
// Estos helpers son usados por todos los módulos (Motos, Créditos, Pagos, Clientes, etc)
// para filtrar automáticamente según el concesionario activo.

// Decide si un registro pasa el filtro de concesionario activo
// item.concesionarioId puede ser: undefined/null (sin asignar) ó un id específico
function _concPasaFiltro(item){
  if(!item) return false;
  var activo = S.concesionarioActivo;
  var u = S.currentUser || {};
  var asignados = u.concesionarios || [];
  var esAdminTotal = (u.rol === 'Administrador' || u.rol === 'Gerente') && !asignados.length;

  // 1) Si hay un concesionario activo en el switcher → filtrar por ese
  if(activo){
    return item.concesionarioId === activo;
  }
  // 2) Sin activo y admin total → ve todo (incluyendo sin asignar)
  if(esAdminTotal){
    return true;
  }
  // 3) Sin activo, usuario con asignaciones específicas → ve solo lo de sus sedes
  if(asignados.length){
    return asignados.indexOf(item.concesionarioId) !== -1;
  }
  // 4) Fallback: ve todo (compatibilidad)
  return true;
}

// Filtra cualquier array de registros según el concesionario activo
function _concFiltrar(arr){
  if(!Array.isArray(arr)) return [];
  return arr.filter(_concPasaFiltro);
}

// Filtra clientes SIN aplicar el filtro de concesionario activo
// Los clientes son globales: se ven en todos los módulos/concesionarios
function _concFiltrarClientes(arr){
  if(!Array.isArray(arr)) return [];
  var u = S.currentUser || {};
  var asignados = u.concesionarios || [];
  var esAdminTotal = (u.rol === 'Administrador' || u.rol === 'Gerente') && !asignados.length;
  if(esAdminTotal) return arr.filter(function(c){ return c; });
  if(asignados.length){
    return arr.filter(function(c){
      if(!c) return false;
      return !c.concesionarioId || asignados.indexOf(c.concesionarioId) !== -1;
    });
  }
  return arr.filter(function(c){ return c; });
}

// Filtra egresos por concesionario activo PERO incluye los sin sede asignada (histórico)
function _concFiltrarEgresos(arr){
  if(!Array.isArray(arr)) return [];
  var activo = S.concesionarioActivo;
  var u = S.currentUser || {};
  var asignados = u.concesionarios || [];
  var esAdminTotal = (u.rol === 'Administrador' || u.rol === 'Gerente') && !asignados.length;
  if(esAdminTotal) return arr.filter(function(e){ return e; });
  if(activo){
    // Muestra los del concesionario activo + los que no tienen sede asignada (histórico)
    return arr.filter(function(e){
      if(!e) return false;
      return !e.concesionarioId || e.concesionarioId === activo;
    });
  }
  if(asignados.length){
    return arr.filter(function(e){
      if(!e) return false;
      return !e.concesionarioId || asignados.indexOf(e.concesionarioId) !== -1;
    });
  }
  return arr.filter(function(e){ return e; });
}

// Devuelve el concesionarioId por defecto al crear un nuevo registro
// Si hay uno activo en el switcher → ese
// Si el usuario tiene UN solo concesionario asignado → ese
// Si no → null (sin asignar)
function _concDefaultId(){
  var activo = S.concesionarioActivo;
  if(activo) return activo;
  var u = S.currentUser || {};
  var asignados = u.concesionarios || [];
  if(asignados.length === 1) return asignados[0];
  return null;
}

// Cuenta registros sin concesionarioId (histórico sin asignar)
function _concContarSinAsignar(){
  return {
    motos: (S.motos||[]).filter(function(m){return !m.eliminado && !m.concesionarioId;}).length,
    creds: (S.creds||[]).filter(function(cr){return !cr.eliminado && !cr.concesionarioId;}).length,
    clis:  (S.clientes||[]).filter(function(cl){return !cl.eliminado && !cl.concesionarioId;}).length,
    pagos: (S.pagos||[]).filter(function(p){return !p.eliminado && !p.concesionarioId;}).length
  };
}

// Cambia el concesionario activo y guarda en localStorage
// Marcador explícito de "ver todas las sedes". Antes se borraba la preferencia,
// lo que era indistinguible de "nunca eligió", y el arranque devolvía al usuario
// a su primera sede pisando su elección.
var CONC_TODAS = '__TODAS__';
function _concEligioTodas(){
  try{ return localStorage.getItem('concesionarioActivo') === CONC_TODAS; }catch(e){ return false; }
}
function _concSetActivo(id){
  S.concesionarioActivo = id || null;
  try{
    if(id) localStorage.setItem('concesionarioActivo', id);
    else localStorage.setItem('concesionarioActivo', CONC_TODAS);
  }catch(e){}
  if(typeof toast === 'function'){
    var nombre = id ? ((_concGetById(id)||{}).nombre || id) : 'Todos los concesionarios';
    toast('Trabajando en: '+nombre,'info');
  }
  // Re-render página actual
  if(typeof nav === 'function' && S.page) nav(S.page);
}

// Renderiza el switcher en el header
function _renderConcSwitcher(){
  var wrap = document.getElementById('conc-switcher');
  if(!wrap) return;
  var visibles = _concGetVisibles();
  // Si no hay concesionarios creados todavía, ocultamos el switcher
  if(!visibles.length){
    wrap.style.display = 'none';
    return;
  }
  var u = S.currentUser || {};
  var asignados = u.concesionarios || [];
  // El Administrador SIEMPRE puede ver "Todos" (aunque tenga sedes asignadas).
  // El Gerente sólo cuando no tiene sedes específicas. Los empleados nunca.
  var esAdminPuro = (u.rol === 'Administrador') || (u.rol === 'Gerente' && asignados.length === 0);
  // Si tiene UNA sola sede asignada → mostrar como info estática (sin opción de cambiar)
  if(asignados.length === 1 && !esAdminPuro){
    var sedeUnica = _concGetById(asignados[0]);
    if(!sedeUnica){
      wrap.style.display = 'none';
      return;
    }
    // Forzar activo en su sede
    if(S.concesionarioActivo !== asignados[0]){
      S.concesionarioActivo = asignados[0];
      try{ localStorage.setItem('concesionarioActivo', asignados[0]); }catch(e){}
    }
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.innerHTML = ''
      + '<div style="display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--surf2);border:1px solid var(--rim2);border-radius:9px;font-family:var(--f);font-size:12.5px;font-weight:700;color:var(--ink)">'
      + '<span style="width:7px;height:7px;border-radius:50%;background:var(--p1)"></span>'
      + '<span style="font-size:9.5px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Sede</span>'
      + '<span style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+sedeUnica.nombre+'</span>'
      + '</div>';
    return;
  }
  var activo = S.concesionarioActivo;
  // Verificar que el activo siga siendo visible (y dentro de las asignadas si aplica)
  if(activo && !visibles.find(function(c){return c.id===activo;})){
    S.concesionarioActivo = null;
    activo = null;
  }
  // Cualquiera que legítimamente vea MÁS DE UNA sede puede elegir verlas todas
  // juntas. No amplía el acceso: al poner activo=null, _concPasaFiltro sigue
  // restringiendo a las sedes asignadas del usuario (solo las une en una vista).
  // El caso de UNA sola sede asignada ya se resolvió arriba (queda fijo).
  var puedeVerTodos = esAdminPuro || visibles.length > 1;
  // Si NO puede ver todos y no tiene activo, forzar a su primera sede
  if(!puedeVerTodos && !activo && asignados.length){
    S.concesionarioActivo = asignados[0];
    activo = asignados[0];
    try{ localStorage.setItem('concesionarioActivo', asignados[0]); }catch(e){}
  }
  var labelTodos = (esAdminPuro || !asignados.length) ? 'Todos los concesionarios' : 'Todas mis sedes';
  var labelActivo = activo ? ((_concGetById(activo)||{}).nombre || '?') : (esAdminPuro || !asignados.length ? 'Todos' : 'Todas mis sedes');
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.innerHTML = ''
    + '<button type="button" id="conc-sw-btn" onclick="_concToggleDropdown()" '
    + 'style="display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--surf2);border:1px solid var(--rim2);border-radius:9px;cursor:pointer;font-family:var(--f);font-size:12.5px;font-weight:700;color:var(--ink);transition:.15s">'
    + '<span style="width:7px;height:7px;border-radius:50%;background:'+(activo?'var(--p1)':'var(--green)')+'"></span>'
    + '<span style="font-size:9.5px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Sede</span>'
    + '<span style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+labelActivo+'</span>'
    + '<span style="font-size:9px;color:var(--ink3)">▾</span>'
    + '</button>'
    + '<div id="conc-sw-menu" style="display:none;position:absolute;top:48px;right:20px;background:var(--surf);border:1px solid var(--rim);border-radius:11px;padding:6px;min-width:240px;box-shadow:0 12px 40px rgba(0,0,0,.18);z-index:9999">'
      + (puedeVerTodos
        ? '<button type="button" onclick="_concSetActivo(null);_concCloseDropdown()" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 11px;background:'+(!activo?'rgba(0,184,118,.1)':'transparent')+';border:none;border-radius:7px;cursor:pointer;font-size:12.5px;color:var(--ink);font-weight:'+(!activo?'700':'500')+'">'
          + '<span style="width:6px;height:6px;border-radius:50%;background:var(--green)"></span>'
          + '<span>'+labelTodos+'</span>'
          + (!activo ? '<span style="margin-left:auto;color:var(--green);font-size:10px">✓</span>' : '')
          + '</button>'
          + '<div style="height:1px;background:var(--rim2);margin:4px 0"></div>'
        : '')
      + visibles.map(function(c){
        var sel = activo === c.id;
        return '<button type="button" onclick="_concSetActivo(\''+c.id+'\');_concCloseDropdown()" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 11px;background:'+(sel?'rgba(74,107,255,.13)':'transparent')+';border:none;border-radius:7px;cursor:pointer;font-size:12.5px;color:var(--ink);font-weight:'+(sel?'700':'500')+'">'
          + '<span style="width:6px;height:6px;border-radius:50%;background:var(--p1)"></span>'
          + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+c.nombre+'</span>'
          + (sel ? '<span style="color:var(--p1);font-size:10px">✓</span>' : '')
          + '</button>';
      }).join('')
    + '</div>';
}

function _concToggleDropdown(){
  var menu = document.getElementById('conc-sw-menu');
  if(!menu) return;
  if(menu.style.display === 'block'){
    menu.style.display = 'none';
  } else {
    menu.style.display = 'block';
    // Click outside cierra
    setTimeout(function(){
      function close(e){
        if(e.target.closest && (e.target.closest('#conc-sw-menu') || e.target.closest('#conc-sw-btn'))) return;
        _concCloseDropdown();
        document.removeEventListener('click', close);
      }
      document.addEventListener('click', close);
    }, 50);
  }
}

function _concCloseDropdown(){
  var menu = document.getElementById('conc-sw-menu');
  if(menu) menu.style.display = 'none';
}

// ════════ MÓDULO CRUD DE CONCESIONARIOS ════════

function _concRender(){
  var lista = (S.concesionarios||[]).filter(function(c){return !c.eliminado;});
  // Stats por concesionario (motos, créditos, clientes, pagos)
  function statsDe(cid){
    return {
      motos: (S.motos||[]).filter(function(m){return !m.eliminado && m.concesionarioId === cid;}).length,
      creds: (S.creds||[]).filter(function(cr){return !cr.eliminado && cr.concesionarioId === cid;}).length,
      clis:  (S.clientes||[]).filter(function(cl){return !cl.eliminado && cl.concesionarioId === cid;}).length,
      pagos: (S.pagos||[]).filter(function(p){return !p.eliminado && p.concesionarioId === cid;}).length
    };
  }
  // Sin asignar (histórico)
  var sinAsig = {
    motos: (S.motos||[]).filter(function(m){return !m.eliminado && !m.concesionarioId;}).length,
    creds: (S.creds||[]).filter(function(cr){return !cr.eliminado && !cr.concesionarioId;}).length,
    clis:  (S.clientes||[]).filter(function(cl){return !cl.eliminado && !cl.concesionarioId;}).length,
    pagos: (S.pagos||[]).filter(function(p){return !p.eliminado && !p.concesionarioId;}).length
  };
  var html = '<div class="page">'
    + (typeof pageBanner === 'function'
      ? pageBanner(
          'Sedes y puntos de venta · Multi-sucursal',
          'Concesionarios',
          'Define cada sede física donde operas. Asigna usuarios y filtra datos por concesionario para mantener cada operación clara y separada.',
          [{label:'+ Nuevo concesionario', onclick:'_concOpenEdit(null)', primary:true}]
        )
      : '<div style="margin-bottom:14px"><h1 style="font-size:22px;margin:0">Concesionarios</h1></div>'
    )
    // KPIs
    + '<div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px">'
    + '<div class="stat" style="">'
    + '<div class="st-v" style="font-size:22px">'+lista.filter(function(c){return c.activo!==false;}).length+'</div>'
    + '<div class="st-l">Sedes activas</div>'
    + '</div>'
    + '<div class="stat">'
    + '<div class="st-v" style="font-size:22px">'+lista.length+'</div>'
    + '<div class="st-l">Total sedes</div>'
    + '</div>'
    + '<div class="stat" style="">'
    + '<div class="st-v" style="color:var(--amber);font-size:22px">'+(sinAsig.creds+sinAsig.motos+sinAsig.clis+sinAsig.pagos)+'</div>'
    + '<div class="st-l">Sin asignar</div>'
    + '<div style="font-size:10px;color:var(--ink3);margin-top:3px">registros históricos</div>'
    + '</div>'
    + '<div class="stat">'
    + '<div class="st-v" style="font-size:22px">'+((typeof _usersCache!=='undefined'&&_usersCache)?_usersCache.filter(function(u){return u.concesionarios && u.concesionarios.length;}).length:0)+'</div>'
    + '<div class="st-l">Usuarios asignados</div>'
    + '</div>'
    + '</div>';
  // Mensaje informativo
  html += ''
    + '<div style="background:rgba(0,184,118,0.08);border:1px solid rgba(0,184,118,0.25);border-radius:10px;padding:11px 14px;margin-bottom:16px;font-size:11.5px;color:var(--ink2);line-height:1.6">'
    + '<strong style="color:var(--green)">Entrega 2 — Filtros y operaciones por sede activos.</strong> '
    + 'El switcher arriba filtra todos los módulos por concesionario. Los registros nuevos heredan la sede activa automáticamente. '
    + 'Usa <b>"Asignar histórico"</b> abajo para migrar registros antiguos a sus sedes.'
    + '</div>';

  // Bloque de asignación de histórico (masivo + individual)
  var totalSinAsig = sinAsig.creds + sinAsig.motos + sinAsig.clis + sinAsig.pagos;
  if(totalSinAsig > 0 && lista.length > 0){
    html += ''
      + '<div style="background:rgba(255,165,0,0.07);border:1px solid rgba(255,165,0,0.3);border-radius:10px;padding:13px 16px;margin-bottom:16px">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">'
      + '<div style="flex:1;min-width:240px">'
      + '<div style="font-size:11px;font-weight:800;color:var(--amber);text-transform:uppercase;letter-spacing:.5px">Asignación de histórico</div>'
      + '<div style="font-size:12px;color:var(--ink2);margin-top:5px;line-height:1.5">Tienes <b style="color:var(--amber);font-family:var(--fd)">'+totalSinAsig+'</b> registros sin concesionario asignado:</div>'
      + '<div style="display:flex;gap:14px;margin-top:6px;font-size:11px;color:var(--ink3);flex-wrap:wrap">'
      + '<span><b style="color:var(--ink2);font-family:var(--fd)">'+sinAsig.motos+'</b> motos</span>'
      + '<span><b style="color:var(--ink2);font-family:var(--fd)">'+sinAsig.creds+'</b> créditos</span>'
      + '<span><b style="color:var(--ink2);font-family:var(--fd)">'+sinAsig.clis+'</b> clientes</span>'
      + '<span><b style="color:var(--ink2);font-family:var(--fd)">'+sinAsig.pagos+'</b> pagos</span>'
      + '</div></div>'
      + '<div style="display:flex;gap:7px;flex-wrap:wrap">'
      + '<button class="btn btn-p btn-sm" onclick="_concAbrirAsignarMasivo()">⇒ Asignar masivo</button>'
      + '<button class="btn btn-g btn-sm" onclick="_concAbrirAsignarIndividual()">⌗ Asignar individual</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }
  // Lista de concesionarios
  if(lista.length === 0){
    html += '<div style="padding:60px 20px;text-align:center;background:var(--surf);border-radius:14px;border:1px dashed var(--rim2)">'
      + '<div style="font-size:36px;margin-bottom:12px;opacity:.4">⌂</div>'
      + '<div style="font-size:14px;font-weight:700;color:var(--ink2);margin-bottom:6px">Sin concesionarios creados</div>'
      + '<div style="font-size:11.5px;color:var(--ink3);max-width:380px;margin:0 auto;line-height:1.55">Crea tu primer concesionario para empezar a separar la operación por sede.</div>'
      + '<button class="btn btn-p btn-sm" style="margin-top:14px" onclick="_concOpenEdit(null)">+ Crear primer concesionario</button>'
      + '</div>';
  } else {
    var totFin = {env:0, con:0};
    var filasConc = lista.map(function(c){
      var st = statsDe(c.id);
      var fin = _concFinanzasDe(c.id);
      totFin.env += fin.enviado; totFin.con += fin.consumido;
      var saldoCol = fin.saldo > 0 ? 'var(--green)' : (fin.saldo < 0 ? 'var(--red)' : 'var(--ink3)');
      return '<tr style="cursor:pointer" onclick="_concAbrirDetalle(\''+c.id+'\')">'
        + '<td class="tdm">'+(c.nombre||'—')+(c.activo===false?' <span class="bdg b-r" style="font-size:8.5px">INACTIVO</span>':'')+'</td>'
        + '<td class="tds">'+(c.ciudad||'—')+'</td>'
        + '<td class="tds" style="text-align:right;font-family:var(--fd)">'+st.motos+'</td>'
        + '<td class="tds" style="text-align:right;font-family:var(--fd);color:var(--p1);font-weight:700">'+st.creds+'</td>'
        + '<td style="text-align:right;font-family:var(--fd);font-weight:700;color:var(--p1)">'+fmt(fin.enviado)+'</td>'
        + '<td style="text-align:right;font-family:var(--fd);font-weight:700;color:var(--amber)">−'+fmt(fin.consumido).replace('$','$')+'</td>'
        + '<td style="text-align:right;font-family:var(--fd);font-weight:900;font-size:13.5px;color:'+saldoCol+'">'+fmt(fin.saldo)+'</td>'
        + '<td onclick="event.stopPropagation()"><div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">'
          + '<button class="btn btn-p btn-xs" onclick="_concOpenAnticipo(\''+c.id+'\')" title="Registrar dinero enviado a esta sede">＋ Anticipo</button>'
          + '<button class="btn btn-g btn-xs" onclick="_concAbrirDetalle(\''+c.id+'\')">Detalle</button>'
          + '<button class="btn btn-g btn-xs" onclick="_concOpenReporte(\''+c.id+'\')" title="Reporte diario/quincenal/mensual en PDF o Excel">Reporte</button>'
          + '<button class="btn btn-g btn-xs" onclick="_concOpenEdit(\''+c.id+'\')">Editar</button>'
        + '</div></td>'
        + '</tr>';
    }).join('');
    var saldoTot = totFin.env - totFin.con;
    // Chart de motos por sede (concesionarios-chart.js). Se pinta despues del render.
    if(typeof _concChartHtml==='function'){
      html += _concChartHtml();
      setTimeout(function(){ if(typeof _concChartPintar==='function') _concChartPintar(); }, 30);
    }
    html += '<div class="card">'
      + '<div class="ch"><div><div class="ct">Concesionarios</div><div class="cs">Saldo = anticipos enviados − costo de las motos que salieron</div></div>'
      + '<button class="btn btn-p btn-sm" onclick="_concAbrirDetalleTotal()">Σ Detalle total</button></div>'
      + '<div class="tw"><table>'
      + '<thead><tr><th>Sede</th><th>Ciudad</th><th style="text-align:right">Motos</th><th style="text-align:right">Créditos</th><th style="text-align:right">Enviado</th><th style="text-align:right">Consumido</th><th style="text-align:right">Saldo</th><th style="text-align:right">Acciones</th></tr></thead>'
      + '<tbody>'+filasConc
      + '<tr style="border-top:2px solid var(--rim);background:var(--surf2)"><td class="tdm" style="font-weight:900">TOTAL</td><td></td><td></td><td></td>'
      + '<td style="text-align:right;font-weight:900;font-family:var(--fd);color:var(--p1)">'+fmt(totFin.env)+'</td>'
      + '<td style="text-align:right;font-weight:900;font-family:var(--fd);color:var(--amber)">−'+fmt(totFin.con).replace('$','$')+'</td>'
      + '<td style="text-align:right;font-weight:900;font-family:var(--fd);color:'+(saldoTot>=0?'var(--green)':'var(--red)')+'">'+fmt(saldoTot)+'</td><td></td></tr>'
      + '</tbody></table></div></div>';
  }
  html += '</div>';
  return html;
}

// Modal: crear / editar concesionario
function _concOpenEdit(id){
  var existing = id ? _concGetById(id) : null;
  var c = existing || { id:'', nombre:'', direccion:'', ciudad:'', telefono:'', activo:true };
  setMicon('conces');
  $('mtt').textContent= existing ? 'Editar Concesionario' : 'Nuevo Concesionario';
  $('msb').textContent= existing ? c.id : 'Sede o punto de venta';
  $('modal-box').className='modal';
  $('mbd').innerHTML = ''
    + '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Nombre del concesionario <span style="color:var(--red)">*</span></label>'
    + '<input class="fi" id="conc_nombre" value="'+(c.nombre||'').replace(/"/g,'&quot;')+'" placeholder="Ej: Maracay Centro" maxlength="80"></div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Ciudad</label><input class="fi" id="conc_ciudad" value="'+(c.ciudad||'').replace(/"/g,'&quot;')+'" placeholder="Ej: Maracay"></div>'
    + '<div class="fg"><label>Teléfono</label><input class="fi" id="conc_telefono" value="'+(c.telefono||'').replace(/"/g,'&quot;')+'" placeholder="Ej: 0414-1234567"></div>'
    + '</div>'
    + '<div class="fg"><label>Dirección</label><textarea class="fi" id="conc_direccion" rows="2" placeholder="Av. Bolívar, c/c Av. Sucre...">'+(c.direccion||'').replace(/</g,'&lt;')+'</textarea></div>'
    + '<div class="fg"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="conc_activo" '+(c.activo!==false?'checked':'')+' style="accent-color:var(--green);transform:scale(1.15)"> Concesionario activo</label>'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px">Si está inactivo, no aparecerá en los selectores de creación de motos/créditos.</div></div>'
    + '</div>';
  S.saveFn = function(){
    var nombre = (($('conc_nombre')&&$('conc_nombre').value)||'').trim();
    if(!nombre){ toast('El nombre es obligatorio','error'); return false; }
    var newConc = existing ? Object.assign({}, existing) : { id: 'CONC-'+Date.now() };
    newConc.nombre = nombre;
    newConc.ciudad = (($('conc_ciudad')&&$('conc_ciudad').value)||'').trim();
    newConc.telefono = (($('conc_telefono')&&$('conc_telefono').value)||'').trim();
    newConc.direccion = (($('conc_direccion')&&$('conc_direccion').value)||'').trim();
    newConc.activo = !!($('conc_activo')&&$('conc_activo').checked);
    if(!existing){
      newConc.createdAt = new Date().toISOString();
      newConc.creadoPor = (S.currentUser&&S.currentUser.nombre)||'Admin';
      S.concesionarios.push(newConc);
    } else {
      newConc.updatedAt = new Date().toISOString();
      var idx = S.concesionarios.findIndex(function(x){return x.id===existing.id;});
      if(idx>=0) S.concesionarios[idx] = newConc;
    }
    if(DB && DB.saveConcesionario) DB.saveConcesionario(newConc);
    closeM();
    toast(existing ? 'Concesionario actualizado' : 'Concesionario creado','success');
    nav('concesionarios');
    return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + (existing ? '<button class="btn btn-d btn-sm" onclick="_concEliminar(\''+existing.id+'\')">Eliminar</button>' : '')
    + '<button class="btn btn-p" onclick="saveM()">'+(existing?'Guardar cambios':'Crear concesionario')+'</button>';
  $('ov').style.display='flex';
}

function _concEliminar(id){
  var c = _concGetById(id);
  if(!c){ toast('No encontrado','error'); return; }
  // Verificar dependencias
  var nMotos = (S.motos||[]).filter(function(m){return !m.eliminado && m.concesionarioId===id;}).length;
  var nCreds = (S.creds||[]).filter(function(cr){return !cr.eliminado && cr.concesionarioId===id;}).length;
  var nClis = (S.clientes||[]).filter(function(cl){return !cl.eliminado && cl.concesionarioId===id;}).length;
  var nUsr = ((typeof _usersCache!=='undefined'&&_usersCache)?_usersCache.filter(function(u){return (u.concesionarios||[]).indexOf(id)!==-1;}).length:0);
  if(nMotos > 0 || nCreds > 0 || nClis > 0 || nUsr > 0){
    var msg = 'Este concesionario tiene datos asociados:\n\n';
    if(nMotos) msg += '• '+nMotos+' moto(s)\n';
    if(nCreds) msg += '• '+nCreds+' crédito(s)\n';
    if(nClis) msg += '• '+nClis+' cliente(s)\n';
    if(nUsr) msg += '• '+nUsr+' usuario(s) asignado(s)\n';
    msg += '\nMejor desactívalo en lugar de eliminarlo. ¿Marcar como inactivo?';
    if(confirm(msg)){
      c.activo = false;
      c.updatedAt = new Date().toISOString();
      if(DB && DB.saveConcesionario) DB.saveConcesionario(c);
      closeM();
      toast('Concesionario marcado como inactivo','info');
      nav('concesionarios');
    }
    return;
  }
  if(confirm('¿Eliminar concesionario "'+c.nombre+'"? Esta acción no se puede deshacer.')){
    c.eliminado = true;
    c.eliminadoEn = new Date().toISOString();
    c.eliminadoPor = (S.currentUser&&S.currentUser.nombre)||'Admin';
    if(DB && DB.saveConcesionario) DB.saveConcesionario(c);
    closeM();
    toast('Concesionario eliminado','info');
    nav('concesionarios');
  }
}

function _concAbrirDetalle(id){
  var c = _concGetById(id);
  if(!c){ toast('No encontrado','error'); return; }
  // ── Filtro por período (día / quincena / mes / año / todo) ──
  window._concDetId = id;
  if(!window._concDetF || window._concDetF.id !== id){ window._concDetF = { id:id, tipo:'todo', fecha:hoyLocalISO() }; }
  var _f = window._concDetF;
  var _rango = _concRangoDe(_f.tipo, _f.fecha); // null = todo
  var _enRango = function(fecha){ return !_rango || ((fecha||'') >= _rango.desde && (fecha||'') <= _rango.hasta); };
  var fin = _concFinanzasDe(id);
  var usuarios = (typeof _usersCache!=='undefined'&&_usersCache) ? _usersCache.filter(function(u){return (u.concesionarios||[]).indexOf(id)!==-1;}) : [];
  var saldoCol = fin.saldo > 0 ? 'var(--green)' : (fin.saldo < 0 ? 'var(--red)' : 'var(--ink3)');
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  // Aplicar el filtro a anticipos y créditos (el saldo global NO cambia con el filtro)
  var antF = fin.anticipos.filter(function(a){ return _enRango(a.fecha); });
  var credsF = fin.creds.filter(function(cr){ return _enRango(cr.fecha); });
  var envP = antF.reduce(function(s,a){ return s+(parseFloat(a.monto)||0); },0);
  var conP = credsF.reduce(function(s,cr){ return s+(parseFloat(cr.precioBaseReal||cr.precio)||0); },0);
  // Créditos (motos que salieron) — más recientes primero
  var credsOrd = credsF.slice().sort(function(a,b){ return String(b.fecha||'').localeCompare(String(a.fecha||'')); });
  var filasCreds = credsOrd.map(function(cr){
    var costo = parseFloat(cr.precioBaseReal||cr.precio)||0;
    return '<tr style="cursor:pointer" onclick="closeM();openAmort(\''+cr.id+'\')">'
      + '<td class="tds" style="font-family:var(--fd)">'+cr.id+'</td>'
      + '<td class="tds">'+(cr.fecha||'—')+'</td>'
      + '<td class="tdm">'+esc(cr.cli||'—')+'</td>'
      + '<td class="tds">'+esc(cr.modelo||'—')+'</td>'
      + '<td class="tds">'+esc(cr.placa||cr.serialMotor||'—')+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:700;color:var(--amber)">−'+fmt(costo)+'</td>'
      + '<td class="tds">'+(cr.estado||'')+'</td>'
      + '</tr>';
  }).join('');
  // Anticipos — más recientes primero (filtrados por período)
  var antOrd = antF.slice().sort(function(a,b){ return String(b.fecha||'').localeCompare(String(a.fecha||'')); });
  var filasAnt = antOrd.map(function(a){
    return '<tr>'
      + '<td class="tds">'+(a.fecha||'—')+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:800;color:'+((parseFloat(a.monto)||0)>=0?'var(--green)':'var(--red)')+'">'+fmt(parseFloat(a.monto)||0)+'</td>'
      + '<td class="tds">'+esc(a.metodo||'—')+'</td>'
      + '<td class="tds">'+esc(a.ref||'—')+'</td>'
      + '<td class="tds" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(a.nota||'')+'">'+esc(a.nota||'—')+'</td>'
      + '<td class="tds">'+esc(a.creadoPor||'')+'</td>'
      + '<td><button class="btn btn-d btn-xs" onclick="_concDelAnticipo(\''+id+'\',\''+a.id+'\')" title="Eliminar anticipo">✕</button></td>'
      + '</tr>';
  }).join('');
  // ── Kardex: TODAS las entradas (anticipos) y salidas (motos) con saldo acumulado ──
  // El saldo acumulado se calcula sobre el histórico COMPLETO (para que sea real);
  // el filtro de período solo decide qué filas se muestran.
  var movsAll = fin.anticipos.map(function(a){
      return { fecha:a.fecha||'', det:'Anticipo · '+(a.metodo||'—')+(a.ref?' · '+a.ref:'')+(a.nota?' · '+a.nota:''), monto:parseFloat(a.monto)||0 };
    }).concat(fin.creds.map(function(cr){
      return { fecha:cr.fecha||'', det:cr.id+' · '+(cr.cli||'')+' · '+(cr.modelo||''), monto:-(parseFloat(cr.precioBaseReal||cr.precio)||0), credId:cr.id };
    })).sort(function(a,b){ return String(a.fecha).localeCompare(String(b.fecha)); });
  var _run = 0;
  movsAll.forEach(function(m){ _run += m.monto; m.saldo = _run; });
  var movs = movsAll.filter(function(m){ return _enRango(m.fecha); });
  var filasMov = movs.slice().reverse().map(function(m){
    var esIn = m.monto >= 0;
    return '<tr'+(m.credId?' style="cursor:pointer" onclick="closeM();openAmort(\''+m.credId+'\')"':'')+'>'
      + '<td class="tds">'+(m.fecha||'—')+'</td>'
      + '<td><span class="bdg '+(esIn?'b-g':'b-a')+'" style="font-size:8.5px">'+(esIn?'ENTRADA':'SALIDA')+'</span></td>'
      + '<td class="tds" style="max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(m.det)+'">'+esc(m.det)+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:800;color:var(--green)">'+(esIn?fmt(m.monto):'')+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:800;color:var(--red)">'+(!esIn?'−'+fmt(Math.abs(m.monto)):'')+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:900;color:'+(m.saldo>=0?'var(--green)':'var(--red)')+'">'+fmt(m.saldo)+'</td>'
      + '</tr>';
  }).join('');
  setMicon('conces');
  $('mtt').textContent= c.nombre;
  $('msb').textContent= 'Detalle del concesionario · saldo y movimientos';
  $('modal-box').className='modal modal-lg';
  $('mbd').innerHTML = ''
    // ── Finanzas: enviado / consumido / saldo ──
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px">'
    + '<div style="background:var(--surf);padding:13px;border-radius:10px;text-align:center;border:1px solid var(--rim2)"><div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Enviado (anticipos)</div><div style="font-family:var(--fd);font-weight:900;font-size:20px;margin-top:3px;color:var(--p1)">'+fmt(fin.enviado)+'</div><div style="font-size:10px;color:var(--ink3);margin-top:2px">'+fin.anticipos.length+' envío'+(fin.anticipos.length!==1?'s':'')+'</div></div>'
    + '<div style="background:var(--surf);padding:13px;border-radius:10px;text-align:center;border:1px solid var(--rim2)"><div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Consumido (motos)</div><div style="font-family:var(--fd);font-weight:900;font-size:20px;margin-top:3px;color:var(--amber)">−'+fmt(fin.consumido)+'</div><div style="font-size:10px;color:var(--ink3);margin-top:2px">'+fin.creds.length+' moto'+(fin.creds.length!==1?'s':'')+' vendida'+(fin.creds.length!==1?'s':'')+'</div></div>'
    + '<div style="background:'+(fin.saldo>=0?'rgba(6,176,106,.08)':'rgba(232,51,90,.08)')+';padding:13px;border-radius:10px;text-align:center;border:1.5px solid '+saldoCol+'"><div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Saldo disponible</div><div style="font-family:var(--fd);font-weight:900;font-size:22px;margin-top:3px;color:'+saldoCol+'">'+fmt(fin.saldo)+'</div><div style="font-size:10px;color:var(--ink3);margin-top:2px">'+(fin.saldo<0?'⚠ le debemos a la sede':'a favor en la sede')+'</div></div>'
    + '</div>'
    // ── Info básica compacta ──
    + '<div style="background:var(--gs);padding:10px 13px;border-radius:9px;margin-bottom:13px;font-size:11.5px;color:var(--ink2);display:flex;gap:14px;flex-wrap:wrap">'
    + (c.ciudad?'<span><b>Ciudad:</b> '+esc(c.ciudad)+'</span>':'')
    + (c.telefono?'<span><b>Tel:</b> '+esc(c.telefono)+'</span>':'')
    + '<span><b>Estado:</b> '+(c.activo!==false?'<span style="color:var(--green);font-weight:700">Activo</span>':'<span style="color:var(--red);font-weight:700">Inactivo</span>')+'</span>'
    + '<span><b>Usuarios:</b> '+usuarios.length+'</span>'
    + '</div>'
    // ── Filtro por período ──
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;background:var(--surf2);border:1px solid var(--rim2);border-radius:10px;padding:8px 10px">'
    + '<span style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Filtrar:</span>'
    + [['dia','Día'],['quincena','Quincena'],['mes','Mes'],['ano','Año'],['todo','Todo']].map(function(t){
        return '<button class="btn btn-xs '+(_f.tipo===t[0]?'btn-p':'btn-g')+'" onclick="_concDetSetTipo(\''+t[0]+'\')" style="font-size:10px;padding:3px 10px">'+t[1]+'</button>';
      }).join('')
    + '<input type="date" value="'+_f.fecha+'" onchange="_concDetSetFecha(this.value)" style="border:1px solid var(--rim);border-radius:8px;padding:4px 8px;font-size:11.5px;font-family:var(--f);background:var(--surf);color:var(--ink)'+(_f.tipo==='todo'?';opacity:.45':'')+'">'
    + (_rango?'<span style="font-size:10.5px;color:var(--ink3)">'+_rango.desde+' → '+_rango.hasta+'</span>':'')
    + (_rango?'<span style="margin-left:auto;font-size:11px;font-weight:800"><span style="color:var(--green)">+'+fmt(envP).replace('$','$')+'</span> · <span style="color:var(--red)">−'+fmt(conP)+'</span> <span style="color:var(--ink3);font-weight:600">en el período</span></span>':'')
    + '</div>'
    // ── Historial de movimientos (kardex con saldo acumulado) ──
    + '<div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">Historial de movimientos — entradas y salidas ('+movs.length+')</div>'
    + (movs.length===0
      ? '<div style="padding:14px;text-align:center;background:var(--gs);border-radius:9px;color:var(--ink3);font-size:11.5px;margin-bottom:13px">Sin movimientos todavía.</div>'
      : '<div class="tw tw-compact" style="max-height:240px;overflow-y:auto;margin-bottom:13px"><table>'
        + '<thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th style="text-align:right">Entrada</th><th style="text-align:right">Salida</th><th style="text-align:right">Saldo</th></tr></thead>'
        + '<tbody>'+filasMov+'</tbody></table></div>')
    // ── Anticipos enviados ──
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">'
    + '<div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Dinero enviado — anticipos ('+antF.length+')</div>'
    + '<button class="btn btn-p btn-xs" onclick="_concOpenAnticipo(\''+id+'\')">＋ Registrar anticipo</button>'
    + '</div>'
    + (antF.length===0
      ? '<div style="padding:14px;text-align:center;background:var(--gs);border-radius:9px;color:var(--ink3);font-size:11.5px;margin-bottom:13px">'+(_rango?'Sin anticipos en este período.':'Sin anticipos registrados. Usa "＋ Registrar anticipo" cuando le mandes dinero a esta sede.')+'</div>'
      : '<div class="tw tw-compact" style="max-height:180px;overflow-y:auto;margin-bottom:13px"><table>'
        + '<thead><tr><th>Fecha</th><th style="text-align:right">Monto</th><th>Método</th><th>Referencia</th><th>Nota</th><th>Por</th><th></th></tr></thead>'
        + '<tbody>'+filasAnt+'</tbody></table></div>')
    // ── Motos que salieron ──
    + '<div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">Motos que salieron — contratos ('+credsF.length+')</div>'
    + (credsF.length===0
      ? '<div style="padding:14px;text-align:center;background:var(--gs);border-radius:9px;color:var(--ink3);font-size:11.5px">'+(_rango?'Sin motos vendidas en este período.':'Aún no han salido motos de esta sede.')+'</div>'
      : '<div class="tw tw-compact" style="max-height:260px;overflow-y:auto"><table>'
        + '<thead><tr><th>Crédito</th><th>Fecha</th><th>Cliente</th><th>Modelo</th><th>Placa/Serial</th><th style="text-align:right">Costo</th><th>Estado</th></tr></thead>'
        + '<tbody>'+filasCreds+'</tbody></table></div>');
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>'
    + '<button class="btn btn-g" onclick="_concOpenReporte(\''+c.id+'\')">Reporte PDF/Excel</button>'
    + '<button class="btn btn-p" onclick="_concOpenAnticipo(\''+c.id+'\')">＋ Anticipo</button>';
  $('ov').style.display='flex';
}


// ╔══════════════════════════════════════════════════════════╗
// ║  ASIGNACIÓN DE HISTÓRICO POR CONCESIONARIO (Entrega 2)    ║
// ║  - Modal masivo: aplicar a todo lo sin asignar de un tipo ║
// ║  - Modal individual: lista filtrable, asignar uno por uno ║
// ╚══════════════════════════════════════════════════════════╝

// Modal: asignación masiva
function _concAbrirAsignarMasivo(){
  var concesList = (S.concesionarios||[]).filter(function(c){return !c.eliminado && c.activo!==false;});
  if(!concesList.length){ toast('No hay concesionarios disponibles','error'); return; }
  var sin = _concContarSinAsignar();
  setMicon('conces');
  $('mtt').textContent='Asignación Masiva de Histórico';
  $('msb').textContent='Aplicar concesionario a todo lo sin asignar';
  $('modal-box').className='modal';
  $('mbd').innerHTML = ''
    + '<div style="background:rgba(255,165,0,0.08);border:1px solid rgba(255,165,0,0.3);border-radius:9px;padding:11px 13px;margin-bottom:14px;font-size:11.5px;line-height:1.55">'
    + '<strong style="color:var(--amber)">⚠ Atención:</strong> Esta acción asignará TODOS los registros sin concesionario al sede que selecciones. Útil si todo tu histórico viene de una sola sede.'
    + '</div>'
    + '<div class="fg" style="margin-bottom:10px"><label>Concesionario destino</label>'
    + '<select class="fs" id="cmas_sede">'
    + concesList.map(function(c){
        return '<option value="'+c.id+'">'+c.nombre+(c.ciudad?' · '+c.ciudad:'')+'</option>';
      }).join('')
    + '</select></div>'
    + '<div style="margin-top:14px"><div style="font-size:11px;font-weight:800;color:var(--ink2);margin-bottom:8px">¿Qué tipos asignar?</div>'
    + '<div style="display:grid;gap:6px">'
    + '<label style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--gs);border-radius:8px;cursor:pointer'+(sin.motos===0?';opacity:.5':'')+'">'
    + '<input type="checkbox" id="cmas_motos" '+(sin.motos>0?'checked':'disabled')+' style="accent-color:var(--p1);transform:scale(1.1)">'
    + '<span style="flex:1"><b>Motos</b> · '+sin.motos+' sin asignar</span></label>'
    + '<label style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--gs);border-radius:8px;cursor:pointer'+(sin.creds===0?';opacity:.5':'')+'">'
    + '<input type="checkbox" id="cmas_creds" '+(sin.creds>0?'checked':'disabled')+' style="accent-color:var(--p1);transform:scale(1.1)">'
    + '<span style="flex:1"><b>Créditos</b> · '+sin.creds+' sin asignar</span></label>'
    + '<label style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--gs);border-radius:8px;cursor:pointer'+(sin.clis===0?';opacity:.5':'')+'">'
    + '<input type="checkbox" id="cmas_clis" '+(sin.clis>0?'checked':'disabled')+' style="accent-color:var(--p1);transform:scale(1.1)">'
    + '<span style="flex:1"><b>Clientes</b> · '+sin.clis+' sin asignar</span></label>'
    + '<label style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--gs);border-radius:8px;cursor:pointer'+(sin.pagos===0?';opacity:.5':'')+'">'
    + '<input type="checkbox" id="cmas_pagos" '+(sin.pagos>0?'checked':'disabled')+' style="accent-color:var(--p1);transform:scale(1.1)">'
    + '<span style="flex:1"><b>Pagos</b> · '+sin.pagos+' sin asignar</span></label>'
    + '</div></div>'
    + '<div id="cmas_info" style="margin-top:11px;font-size:11px;color:var(--ink3);font-style:italic"></div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="_concEjecutarMasivo()">Asignar registros</button>';
  $('ov').style.display='flex';
}

function _concEjecutarMasivo(){
  var sedeId = ($('cmas_sede')&&$('cmas_sede').value);
  if(!sedeId){ toast('Selecciona un concesionario','error'); return; }
  var sede = _concGetById(sedeId);
  if(!sede){ toast('Concesionario no encontrado','error'); return; }
  var hacerMotos = !!($('cmas_motos')&&$('cmas_motos').checked);
  var hacerCreds = !!($('cmas_creds')&&$('cmas_creds').checked);
  var hacerClis  = !!($('cmas_clis')&&$('cmas_clis').checked);
  var hacerPagos = !!($('cmas_pagos')&&$('cmas_pagos').checked);
  if(!hacerMotos && !hacerCreds && !hacerClis && !hacerPagos){
    toast('Selecciona al menos un tipo','error'); return;
  }
  if(!confirm('¿Asignar todos los registros sin concesionario seleccionados a "'+sede.nombre+'"?\n\nEsto modificará registros en la base de datos.')) return;
  var total = 0;
  if(hacerMotos){
    (S.motos||[]).forEach(function(m){
      if(!m.eliminado && !m.concesionarioId){
        m.concesionarioId = sedeId;
        if(DB && DB.saveMoto) DB.saveMoto(m);
        total++;
      }
    });
  }
  if(hacerCreds){
    (S.creds||[]).forEach(function(c){
      if(!c.eliminado && !c.concesionarioId){
        c.concesionarioId = sedeId;
        if(DB && DB.saveCred) DB.saveCred(c);
        total++;
        // Cascadear a los pagos de este crédito sin sede
        (S.pagos||[]).forEach(function(p){
          if(!p.eliminado && !p.concesionarioId && p.cred === c.id){
            p.concesionarioId = sedeId;
            if(DB && DB.savePago) DB.savePago(p);
            total++;
          }
        });
      }
    });
  }
  if(hacerClis){
    (S.clientes||[]).forEach(function(cl){
      if(!cl.eliminado && !cl.concesionarioId){
        cl.concesionarioId = sedeId;
        if(DB && DB.saveCliente) DB.saveCliente(cl);
        total++;
      }
    });
  }
  if(hacerPagos){
    (S.pagos||[]).forEach(function(p){
      if(!p.eliminado && !p.concesionarioId){
        p.concesionarioId = sedeId;
        if(DB && DB.savePago) DB.savePago(p);
        total++;
      }
    });
  }
  closeM();
  toast(total+' registros asignados a '+sede.nombre,'success');
  nav('concesionarios');
}

// Modal: asignación individual con lista filtrable
var _concAsignIndState = { tipo:'motos', q:'' };

function _concAbrirAsignarIndividual(){
  _concAsignIndState = { tipo:'motos', q:'' };
  _concRenderAsignarIndividual();
  $('ov').style.display='flex';
}

function _concRenderAsignarIndividual(){
  var concesList = (S.concesionarios||[]).filter(function(c){return !c.eliminado && c.activo!==false;});
  if(!concesList.length){ toast('No hay concesionarios disponibles','error'); return; }
  var tipo = _concAsignIndState.tipo || 'motos';
  var q = (_concAsignIndState.q || '').toLowerCase().trim();
  setMicon('detalle');
  $('mtt').textContent='Asignación Individual';
  $('msb').textContent='Asigna registros uno por uno';
  $('modal-box').className='modal modal-lg';
  // Tab buttons
  var sin = _concContarSinAsignar();
  var tabBtn = function(t, lbl, count){
    var act = tipo === t;
    return '<button onclick="_concAsignSetTipo(\''+t+'\')" style="background:none;border:none;padding:9px 14px;font-size:12px;font-weight:'+(act?'800':'600')+';color:'+(act?'var(--p1)':'var(--ink3)')+';border-bottom:3px solid '+(act?'var(--p1)':'transparent')+';margin-bottom:-2px;cursor:pointer;font-family:var(--f)">'
      + lbl + ' <span style="background:'+(act?'var(--p1)':'var(--gs)')+';color:'+(act?'#fff':'var(--ink2)')+';font-size:10px;padding:1px 7px;border-radius:9px;margin-left:4px">'+count+'</span>'
      + '</button>';
  };
  // Datos según tipo
  var registros = [];
  if(tipo==='motos'){
    registros = (S.motos||[]).filter(function(m){return !m.eliminado && !m.concesionarioId;});
    if(q) registros = registros.filter(function(m){ return (((m.modelo||'')+' '+(m.vin||'')+' '+(m.cliente||'')).toLowerCase().indexOf(q) !== -1); });
  } else if(tipo==='creds'){
    registros = (S.creds||[]).filter(function(c){return !c.eliminado && !c.concesionarioId;});
    if(q) registros = registros.filter(function(c){ return (((c.cli||'')+' '+(c.modelo||'')+' '+(c.id||'')).toLowerCase().indexOf(q) !== -1); });
  } else if(tipo==='clis'){
    registros = (S.clientes||[]).filter(function(cl){return !cl.eliminado && !cl.concesionarioId;});
    if(q) registros = registros.filter(function(cl){ return (((cl.nombre||'')+' '+(cl.cedula||'')+' '+(cl.tel||'')).toLowerCase().indexOf(q) !== -1); });
  } else { // pagos
    registros = (S.pagos||[]).filter(function(p){return !p.eliminado && !p.concesionarioId;});
    if(q) registros = registros.filter(function(p){ return (((p.cli||'')+' '+(p.id||'')+' '+(p.cred||'')).toLowerCase().indexOf(q) !== -1); });
  }
  registros = registros.slice(0, 200); // limitar para no colgar el navegador
  // Construir select de sedes para cada fila
  var sedesOpts = '<option value="">— Sin asignar —</option>' + concesList.map(function(c){ return '<option value="'+c.id+'">'+c.nombre+'</option>'; }).join('');
  // Render filas según tipo
  var filas;
  if(registros.length === 0){
    filas = '<div style="padding:40px 20px;text-align:center;color:var(--ink3);font-size:12.5px">' + (q ? 'Sin resultados para "'+q+'"' : 'No hay registros sin asignar de este tipo') + '</div>';
  } else {
    filas = '<div style="display:grid;gap:5px;max-height:380px;overflow-y:auto">'
      + registros.map(function(r){
          var label, sub;
          if(tipo==='motos'){
            label = (r.modelo||'(sin modelo)') + ' · ' + (r.estado||'');
            sub = 'VIN: '+(r.vin||'—')+(r.cliente?' · Cliente: '+r.cliente:'');
          } else if(tipo==='creds'){
            label = r.id + ' · ' + (r.cli||'');
            sub = (r.modelo||'') + ' · ' + (r.estado||'') + (r.fecha?' · '+r.fecha:'');
          } else if(tipo==='clis'){
            label = r.nombre || '(sin nombre)';
            sub = 'C.I.: '+(r.cedula||'—')+(r.tel?' · '+r.tel:'')+(r.ciudad?' · '+r.ciudad:'');
          } else {
            label = r.id + ' · ' + (r.cli||'');
            sub = '$'+(parseFloat(r.monto)||0).toFixed(2)+(r.fecha?' · '+r.fecha:'')+' · '+(r.metodo||'');
          }
          return '<div style="display:grid;grid-template-columns:1fr auto;gap:10px;padding:9px 11px;background:var(--gs);border-radius:8px;align-items:center">'
            + '<div style="min-width:0">'
            + '<div style="font-size:12.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+label+'</div>'
            + '<div style="font-size:10.5px;color:var(--ink3);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+sub+'</div>'
            + '</div>'
            + '<select class="fs" style="min-width:160px;font-size:11.5px" onchange="_concAsignarUno(\''+tipo+'\',\''+String(r.id).replace(/\'/g,'')+'\', this.value)">'+sedesOpts+'</select>'
            + '</div>';
        }).join('')
      + '</div>';
    if((tipo==='motos'?sin.motos:tipo==='creds'?sin.creds:tipo==='clis'?sin.clis:sin.pagos) > 200){
      filas += '<div style="margin-top:9px;padding:8px;background:rgba(255,165,0,.08);border-radius:7px;text-align:center;font-size:11px;color:var(--ink3)">Mostrando los primeros 200. Usa el buscador para filtrar.</div>';
    }
  }
  $('mbd').innerHTML = ''
    // Tabs por tipo
    + '<div style="display:flex;border-bottom:2px solid var(--rim);margin-bottom:12px">'
    + tabBtn('motos','Motos',sin.motos)
    + tabBtn('creds','Créditos',sin.creds)
    + tabBtn('clis','Clientes',sin.clis)
    + tabBtn('pagos','Pagos',sin.pagos)
    + '</div>'
    // Buscador
    + '<div class="fg" style="margin-bottom:12px"><input class="fi" id="cind_q" placeholder="Buscar..." value="'+q.replace(/"/g,'&quot;')+'" oninput="_concAsignSetQ(this.value)" style="font-size:12.5px"></div>'
    // Lista
    + filas;
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM();nav(\'concesionarios\')">Cerrar</button>';
}

function _concAsignSetTipo(t){
  _concAsignIndState.tipo = t;
  _concAsignIndState.q = '';
  _concRenderAsignarIndividual();
}

var _concAsignDebounce;
function _concAsignSetQ(v){
  _concAsignIndState.q = v || '';
  clearTimeout(_concAsignDebounce);
  _concAsignDebounce = setTimeout(_concRenderAsignarIndividual, 200);
}

function _concAsignarUno(tipo, id, sedeId){
  if(!sedeId) return;
  var coll, saveFn;
  if(tipo==='motos'){ coll=S.motos; saveFn=DB.saveMoto; }
  else if(tipo==='creds'){ coll=S.creds; saveFn=DB.saveCred; }
  else if(tipo==='clis'){ coll=S.clientes; saveFn=DB.saveCliente; }
  else { coll=S.pagos; saveFn=DB.savePago; }
  if(!coll) return;
  var it = coll.find(function(x){ return String(x.id) === String(id); });
  if(!it){ toast('Registro no encontrado','error'); return; }
  it.concesionarioId = sedeId;
  if(saveFn) saveFn(it);
  // Si es crédito, cascadear a sus pagos sin sede
  if(tipo==='creds'){
    var nPagos = 0;
    (S.pagos||[]).forEach(function(p){
      if(!p.eliminado && !p.concesionarioId && p.cred === it.id){
        p.concesionarioId = sedeId;
        if(DB && DB.savePago) DB.savePago(p);
        nPagos++;
      }
    });
    toast('Crédito asignado' + (nPagos > 0 ? ' + '+nPagos+' pago(s)' : ''), 'success');
  } else {
    toast('Asignado','success');
  }
  _concRenderAsignarIndividual();
}


// ╔══════════════════════════════════════════════════════════╗
// ║  FINANZAS POR CONCESIONARIO — ANTICIPOS Y SALDO           ║
// ║  Les mandamos dinero por adelantado (anticipos); cada     ║
// ║  moto vendida descuenta su costo (precio base real).      ║
// ║  Saldo = Σ anticipos − Σ costos de motos que salieron.    ║
// ║  Los anticipos viven en el doc del concesionario          ║
// ║  (c.anticipos[]) — no requiere reglas nuevas de Firestore.║
// ╚══════════════════════════════════════════════════════════╝

function _concFinanzasDe(cid){
  var c = _concGetById(cid) || {};
  var anticipos = Array.isArray(c.anticipos) ? c.anticipos.filter(function(a){ return a && !a.eliminado; }) : [];
  var enviado = anticipos.reduce(function(s,a){ return s + (parseFloat(a.monto)||0); }, 0);
  // Motos que salieron = créditos de esta sede (cancelados no consumen: la venta se anuló)
  var creds = (S.creds||[]).filter(function(cr){
    return cr && !cr.eliminado && cr.concesionarioId === cid && cr.estado !== 'cancelado';
  });
  var consumido = creds.reduce(function(s,cr){ return s + (parseFloat(cr.precioBaseReal||cr.precio)||0); }, 0);
  return { anticipos: anticipos, creds: creds, enviado: enviado, consumido: consumido, saldo: enviado - consumido };
}

// Rango de fechas para el filtro del detalle: dia / quincena / mes / ano / todo (null)
function _concRangoDe(tipo, fecha){
  var f = fecha || hoyLocalISO();
  if(tipo==='dia') return { desde:f, hasta:f };
  if(tipo==='quincena'){
    var day = parseInt(f.slice(8,10),10), ym = f.slice(0,7);
    if(day<=15) return { desde:ym+'-01', hasta:ym+'-15' };
    var last = new Date(parseInt(ym.slice(0,4),10), parseInt(ym.slice(5,7),10), 0).getDate();
    return { desde:ym+'-16', hasta:ym+'-'+String(last).padStart(2,'0') };
  }
  if(tipo==='mes'){
    var ym2 = f.slice(0,7);
    var l2 = new Date(parseInt(ym2.slice(0,4),10), parseInt(ym2.slice(5,7),10), 0).getDate();
    return { desde:ym2+'-01', hasta:ym2+'-'+String(l2).padStart(2,'0') };
  }
  if(tipo==='ano'){
    var y = f.slice(0,4);
    return { desde:y+'-01-01', hasta:y+'-12-31' };
  }
  return null; // todo
}

function _concDetSetTipo(t){
  if(window._concDetF) window._concDetF.tipo = t;
  if(window._concDetId) _concAbrirDetalle(window._concDetId);
}
function _concDetSetFecha(v){
  if(window._concDetF) window._concDetF.fecha = v || hoyLocalISO();
  if(window._concDetId) _concAbrirDetalle(window._concDetId);
}

// ── Detalle TOTAL: consolidado de todos los concesionarios ──
function _concDetTotSetTipo(t){ if(window._concDetTotF) window._concDetTotF.tipo = t; _concAbrirDetalleTotal(true); }
function _concDetTotSetFecha(v){ if(window._concDetTotF) window._concDetTotF.fecha = v || hoyLocalISO(); _concAbrirDetalleTotal(true); }

function _concAbrirDetalleTotal(keep){
  var lista = (S.concesionarios||[]).filter(function(c){ return !c.eliminado; });
  if(!lista.length){ toast('No hay concesionarios','error'); return; }
  if(!keep || !window._concDetTotF){ window._concDetTotF = { tipo:'todo', fecha:hoyLocalISO() }; }
  var _f = window._concDetTotF;
  var _rango = _concRangoDe(_f.tipo, _f.fecha);
  var _enRango = function(fecha){ return !_rango || ((fecha||'') >= _rango.desde && (fecha||'') <= _rango.hasta); };
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

  // Consolidar: finanzas por sede + kardex global con nombre de sede
  var totEnv = 0, totCon = 0, movsAll = [];
  var filasSedes = lista.map(function(c){
    var fin = _concFinanzasDe(c.id);
    totEnv += fin.enviado; totCon += fin.consumido;
    fin.anticipos.forEach(function(a){
      movsAll.push({ fecha:a.fecha||'', sede:c.nombre||c.id, det:'Anticipo · '+(a.metodo||'—')+(a.ref?' · '+a.ref:''), monto:parseFloat(a.monto)||0 });
    });
    fin.creds.forEach(function(cr){
      movsAll.push({ fecha:cr.fecha||'', sede:c.nombre||c.id, det:cr.id+' · '+(cr.cli||'')+' · '+(cr.modelo||''), monto:-(parseFloat(cr.precioBaseReal||cr.precio)||0), credId:cr.id });
    });
    var sc = fin.saldo > 0 ? 'var(--green)' : (fin.saldo < 0 ? 'var(--red)' : 'var(--ink3)');
    return '<tr style="cursor:pointer" onclick="_concAbrirDetalle(\''+c.id+'\')">'
      + '<td class="tdm">'+esc(c.nombre||'—')+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:700;color:var(--p1)">'+fmt(fin.enviado)+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:700;color:var(--amber)">−'+fmt(fin.consumido)+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:900;color:'+sc+'">'+fmt(fin.saldo)+'</td>'
      + '</tr>';
  }).join('');
  var totSaldo = totEnv - totCon;
  var saldoCol = totSaldo > 0 ? 'var(--green)' : (totSaldo < 0 ? 'var(--red)' : 'var(--ink3)');

  // Kardex global: saldo acumulado sobre TODO; el filtro decide qué filas se ven
  movsAll.sort(function(a,b){ return String(a.fecha).localeCompare(String(b.fecha)); });
  var _run = 0;
  movsAll.forEach(function(m){ _run += m.monto; m.saldo = _run; });
  var movs = movsAll.filter(function(m){ return _enRango(m.fecha); });
  var envP = movs.filter(function(m){ return m.monto >= 0; }).reduce(function(s,m){ return s+m.monto; },0);
  var conP = movs.filter(function(m){ return m.monto < 0; }).reduce(function(s,m){ return s-m.monto; },0);
  var filasMov = movs.slice().reverse().map(function(m){
    var esIn = m.monto >= 0;
    return '<tr'+(m.credId?' style="cursor:pointer" onclick="closeM();openAmort(\''+m.credId+'\')"':'')+'>'
      + '<td class="tds">'+(m.fecha||'—')+'</td>'
      + '<td class="tds" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(m.sede)+'">'+esc(m.sede)+'</td>'
      + '<td><span class="bdg '+(esIn?'b-g':'b-a')+'" style="font-size:8.5px">'+(esIn?'ENTRADA':'SALIDA')+'</span></td>'
      + '<td class="tds" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(m.det)+'">'+esc(m.det)+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:800;color:var(--green)">'+(esIn?fmt(m.monto):'')+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:800;color:var(--red)">'+(!esIn?'−'+fmt(Math.abs(m.monto)):'')+'</td>'
      + '<td style="text-align:right;font-family:var(--fd);font-weight:900;color:'+(m.saldo>=0?'var(--green)':'var(--red)')+'">'+fmt(m.saldo)+'</td>'
      + '</tr>';
  }).join('');

  setMicon('conces');
  $('mtt').textContent = 'Σ Total — Todos los concesionarios';
  $('msb').textContent = lista.length+' sedes · consolidado de anticipos y motos';
  $('modal-box').className = 'modal modal-lg';
  $('mbd').innerHTML = ''
    // KPIs globales
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:13px">'
    + '<div style="background:var(--surf);padding:13px;border-radius:10px;text-align:center;border:1px solid var(--rim2)"><div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Enviado total</div><div style="font-family:var(--fd);font-weight:900;font-size:20px;margin-top:3px;color:var(--p1)">'+fmt(totEnv)+'</div></div>'
    + '<div style="background:var(--surf);padding:13px;border-radius:10px;text-align:center;border:1px solid var(--rim2)"><div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Consumido total</div><div style="font-family:var(--fd);font-weight:900;font-size:20px;margin-top:3px;color:var(--amber)">−'+fmt(totCon)+'</div></div>'
    + '<div style="background:'+(totSaldo>=0?'rgba(6,176,106,.08)':'rgba(232,51,90,.08)')+';padding:13px;border-radius:10px;text-align:center;border:1.5px solid '+saldoCol+'"><div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Saldo total</div><div style="font-family:var(--fd);font-weight:900;font-size:22px;margin-top:3px;color:'+saldoCol+'">'+fmt(totSaldo)+'</div></div>'
    + '</div>'
    // Resumen por sede
    + '<div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">Resumen por sede ('+lista.length+')</div>'
    + '<div class="tw tw-compact" style="max-height:180px;overflow-y:auto;margin-bottom:13px"><table>'
    + '<thead><tr><th>Sede</th><th style="text-align:right">Enviado</th><th style="text-align:right">Consumido</th><th style="text-align:right">Saldo</th></tr></thead>'
    + '<tbody>'+filasSedes+'</tbody></table></div>'
    // Filtro por período
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;background:var(--surf2);border:1px solid var(--rim2);border-radius:10px;padding:8px 10px">'
    + '<span style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Filtrar:</span>'
    + [['dia','Día'],['quincena','Quincena'],['mes','Mes'],['ano','Año'],['todo','Todo']].map(function(t){
        return '<button class="btn btn-xs '+(_f.tipo===t[0]?'btn-p':'btn-g')+'" onclick="_concDetTotSetTipo(\''+t[0]+'\')" style="font-size:10px;padding:3px 10px">'+t[1]+'</button>';
      }).join('')
    + '<input type="date" value="'+_f.fecha+'" onchange="_concDetTotSetFecha(this.value)" style="border:1px solid var(--rim);border-radius:8px;padding:4px 8px;font-size:11.5px;font-family:var(--f);background:var(--surf);color:var(--ink)'+(_f.tipo==='todo'?';opacity:.45':'')+'">'
    + (_rango?'<span style="font-size:10.5px;color:var(--ink3)">'+_rango.desde+' → '+_rango.hasta+'</span>':'')
    + (_rango?'<span style="margin-left:auto;font-size:11px;font-weight:800"><span style="color:var(--green)">+'+fmt(envP)+'</span> · <span style="color:var(--red)">−'+fmt(conP)+'</span> <span style="color:var(--ink3);font-weight:600">en el período</span></span>':'')
    + '</div>'
    // Kardex global
    + '<div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">Historial global — entradas y salidas ('+movs.length+')</div>'
    + (movs.length===0
      ? '<div style="padding:14px;text-align:center;background:var(--gs);border-radius:9px;color:var(--ink3);font-size:11.5px">'+(_rango?'Sin movimientos en este período.':'Sin movimientos todavía.')+'</div>'
      : '<div class="tw tw-compact" style="max-height:280px;overflow-y:auto"><table>'
        + '<thead><tr><th>Fecha</th><th>Sede</th><th>Tipo</th><th>Detalle</th><th style="text-align:right">Entrada</th><th style="text-align:right">Salida</th><th style="text-align:right">Saldo</th></tr></thead>'
        + '<tbody>'+filasMov+'</tbody></table></div>');
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cerrar</button>';
  $('ov').style.display='flex';
}

// Modal: registrar anticipo (dinero enviado a la sede)
function _concOpenAnticipo(cid){
  var c = _concGetById(cid);
  if(!c){ toast('Concesionario no encontrado','error'); return; }
  var fin = _concFinanzasDe(cid);
  setMicon('conces');
  $('mtt').textContent = '＋ Anticipo — ' + c.nombre;
  $('msb').textContent = 'Saldo actual: ' + fmt(fin.saldo);
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = ''
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Fecha</label><input class="fi" id="cant_fecha" type="date" value="'+hoyLocalISO()+'"></div>'
    + '<div class="fg"><label>Monto (USD) <span style="color:var(--red)">*</span></label><input class="fi" id="cant_monto" type="number" step="0.01" placeholder="10000"></div>'
    + '</div>'
    + '<div class="fgr" style="gap:10px">'
    + '<div class="fg"><label>Método</label><select class="fs" id="cant_metodo"><option>Binance</option><option>Efectivo</option><option>Transferencia bancaria</option><option>Otro</option></select></div>'
    + '<div class="fg"><label>Referencia (opcional)</label><input class="fi" id="cant_ref" placeholder="N° de operación / hash"></div>'
    + '</div>'
    + '<div class="fg"><label>Nota (opcional)</label><input class="fi" id="cant_nota" placeholder="Ej: anticipo para lote de 10 motos"></div>'
    + '<div style="font-size:11px;color:var(--ink3);margin-top:8px;line-height:1.5">También puedes registrar un <b>monto negativo</b> como ajuste (ej: la sede nos devolvió dinero).</div>';
  S.saveFn = function(){
    var monto = parseFloat(($('cant_monto')&&$('cant_monto').value)||'');
    if(!monto || isNaN(monto)){ toast('Indica el monto del anticipo','error'); return false; }
    var ant = {
      id: 'ANT-'+Date.now(),
      fecha: ($('cant_fecha')&&$('cant_fecha').value) || hoyLocalISO(),
      monto: monto,
      metodo: ($('cant_metodo')&&$('cant_metodo').value) || 'Otro',
      ref: (($('cant_ref')&&$('cant_ref').value)||'').trim(),
      nota: (($('cant_nota')&&$('cant_nota').value)||'').trim(),
      creadoPor: (S.currentUser&&S.currentUser.nombre)||'Admin',
      creadoEn: new Date().toISOString()
    };
    if(!Array.isArray(c.anticipos)) c.anticipos = [];
    c.anticipos.push(ant);
    c.updatedAt = new Date().toISOString();
    if(DB && DB.saveConcesionario) DB.saveConcesionario(c);
    if(typeof logActividad==='function') logActividad('Anticipo a concesionario','concesionarios',c.id,fmt(monto)+' · '+ant.metodo);
    closeM();
    toast('Anticipo de '+fmt(monto)+' registrado en '+c.nombre,'success');
    nav('concesionarios');
    return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="saveM()">Registrar anticipo</button>';
  $('ov').style.display='flex';
}

function _concDelAnticipo(cid, antId){
  var c = _concGetById(cid);
  if(!c || !Array.isArray(c.anticipos)) return;
  var a = c.anticipos.find(function(x){ return x && x.id === antId; });
  if(!a){ toast('Anticipo no encontrado','error'); return; }
  if(!confirm('¿Eliminar el anticipo de '+fmt(parseFloat(a.monto)||0)+' del '+(a.fecha||'')+'?')) return;
  a.eliminado = true;
  a.eliminadoEn = new Date().toISOString();
  a.eliminadoPor = (S.currentUser&&S.currentUser.nombre)||'Admin';
  c.updatedAt = new Date().toISOString();
  if(DB && DB.saveConcesionario) DB.saveConcesionario(c);
  toast('Anticipo eliminado','info');
  _concAbrirDetalle(cid);
}

// ── Reportes por concesionario (diario / quincenal / mensual / rango) ──
function _concOpenReporte(cid){
  var c = _concGetById(cid);
  if(!c){ toast('Concesionario no encontrado','error'); return; }
  setMicon('conces');
  $('mtt').textContent = 'Reporte — ' + c.nombre;
  $('msb').textContent = 'Diario · Quincenal · Mensual · Rango — PDF o Excel';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = ''
    + '<div class="fg" style="margin-bottom:10px"><label>Período</label>'
    + '<select class="fs" id="crep_tipo" onchange="var r=this.value===\'rango\';document.getElementById(\'crep_rango_box\').style.display=r?\'grid\':\'none\';document.getElementById(\'crep_fecha_box\').style.display=r?\'none\':\'block\'">'
    + '<option value="diario">Diario (un día)</option>'
    + '<option value="quincenal">Quincenal (1–15 / 16–fin)</option>'
    + '<option value="mensual">Mensual (mes completo)</option>'
    + '<option value="rango">Rango personalizado</option>'
    + '</select></div>'
    + '<div class="fg" id="crep_fecha_box" style="margin-bottom:10px"><label>Fecha de referencia</label><input class="fi" id="crep_fecha" type="date" value="'+hoyLocalISO()+'">'
    + '<div style="font-size:10.5px;color:var(--ink3);margin-top:4px">Diario usa ese día · Quincenal usa su quincena · Mensual usa su mes.</div></div>'
    + '<div id="crep_rango_box" style="display:none;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    + '<div class="fg"><label>Desde</label><input class="fi" id="crep_desde" type="date" value="'+hoyLocalISO()+'"></div>'
    + '<div class="fg"><label>Hasta</label><input class="fi" id="crep_hasta" type="date" value="'+hoyLocalISO()+'"></div>'
    + '</div>'
    + '<div style="font-size:11.5px;color:var(--ink2);background:var(--gs);border-radius:8px;padding:10px 12px;line-height:1.55">El reporte incluye: <b>motos que salieron</b> (crédito, cliente, cédula, teléfono, modelo, costo), <b>anticipos enviados</b> y el <b>saldo</b> de la sede.</div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-g" onclick="_concGenerarReporte(\''+cid+'\',\'excel\')">⬇ Excel (CSV)</button>'
    + '<button class="btn btn-p" onclick="_concGenerarReporte(\''+cid+'\',\'pdf\')">🖨 PDF</button>';
  $('ov').style.display='flex';
}

function _concRangoReporte(){
  var tipo = (($('crep_tipo')||{}).value) || 'diario';
  var f = (($('crep_fecha')||{}).value) || hoyLocalISO();
  var d = f, h = f, lbl = 'Diario · '+f;
  if(tipo==='quincenal'){
    var day = parseInt(f.slice(8,10),10), ym = f.slice(0,7);
    if(day<=15){ d=ym+'-01'; h=ym+'-15'; }
    else { d=ym+'-16'; var last=new Date(parseInt(ym.slice(0,4),10), parseInt(ym.slice(5,7),10), 0).getDate(); h=ym+'-'+String(last).padStart(2,'0'); }
    lbl = 'Quincenal · '+d+' → '+h;
  } else if(tipo==='mensual'){
    var ym2 = f.slice(0,7);
    d = ym2+'-01';
    var l2 = new Date(parseInt(ym2.slice(0,4),10), parseInt(ym2.slice(5,7),10), 0).getDate();
    h = ym2+'-'+String(l2).padStart(2,'0');
    lbl = 'Mensual · '+ym2;
  } else if(tipo==='rango'){
    d = (($('crep_desde')||{}).value) || f;
    h = (($('crep_hasta')||{}).value) || f;
    lbl = 'Rango · '+d+' → '+h;
  }
  return { desde:d, hasta:h, tipo:tipo, lbl:lbl };
}

function _concGenerarReporte(cid, formato){
  var c = _concGetById(cid);
  if(!c){ toast('Concesionario no encontrado','error'); return; }
  var r = _concRangoReporte();
  var fin = _concFinanzasDe(cid);
  var enR = function(fecha){ return (fecha||'') >= r.desde && (fecha||'') <= r.hasta; };
  var credsP = fin.creds.filter(function(cr){ return enR(cr.fecha); })
    .sort(function(a,b){ return String(a.fecha||'').localeCompare(String(b.fecha||'')); });
  var antP = fin.anticipos.filter(function(a){ return enR(a.fecha); })
    .sort(function(a,b){ return String(a.fecha||'').localeCompare(String(b.fecha||'')); });
  var costoP = credsP.reduce(function(s,cr){ return s + (parseFloat(cr.precioBaseReal||cr.precio)||0); }, 0);
  var ventaP = credsP.reduce(function(s,cr){ return s + (parseFloat(cr.precio)||0); }, 0);
  var antTotalP = antP.reduce(function(s,a){ return s + (parseFloat(a.monto)||0); }, 0);
  var cliDe = function(cr){
    return (S.clientes||[]).find(function(x){ return x && !x.eliminado && ((cr.clienteId && String(x.id)===String(cr.clienteId)) || x.nombre===cr.cli); }) || {};
  };
  if(formato === 'excel'){
    var n2 = function(v){ return Math.round((parseFloat(v)||0)*100)/100; };
    var aoa = [];
    aoa.push(['REPORTE DE CONCESIONARIO', c.nombre]);
    aoa.push(['Período', r.lbl]);
    aoa.push(['Generado', new Date().toLocaleString('es-VE')]);
    aoa.push([]);
    aoa.push(['RESUMEN']);
    aoa.push(['Motos que salieron (período)', credsP.length]);
    aoa.push(['Costo consumido (período)', n2(costoP)]);
    aoa.push(['Precio de venta total (período)', n2(ventaP)]);
    aoa.push(['Anticipos enviados (período)', n2(antTotalP)]);
    aoa.push(['— SALDO GLOBAL DE LA SEDE —', n2(fin.saldo)]);
    aoa.push(['Total enviado histórico', n2(fin.enviado)]);
    aoa.push(['Total consumido histórico', n2(fin.consumido)]);
    aoa.push([]);
    aoa.push(['MOTOS QUE SALIERON']);
    aoa.push(['N° Crédito','Fecha','Cliente','Cédula','Teléfono','Modelo','Placa/Serial','Precio venta','Costo (deducción)','Estado']);
    credsP.forEach(function(cr){
      var cl = cliDe(cr);
      aoa.push([cr.id, cr.fecha||'', cr.cli||'', cl.cedula||'', cl.tel||'', cr.modelo||'', cr.placa||cr.serialMotor||'', n2(cr.precio), n2(cr.precioBaseReal||cr.precio), cr.estado||'']);
    });
    aoa.push([]);
    aoa.push(['ANTICIPOS ENVIADOS']);
    aoa.push(['Fecha','Monto','Método','Referencia','Nota','Registrado por']);
    antP.forEach(function(a){
      aoa.push([a.fecha||'', n2(a.monto), a.metodo||'', a.ref||'', a.nota||'', a.creadoPor||'']);
    });
    var slug = (c.nombre||'sede').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(typeof _xlsxDownload==='function') _xlsxDownload('reporte-'+slug+'-'+r.desde+'_'+r.hasta+'.xlsx', [{name:'Reporte', rows:aoa}]);
    toast('Excel (.xlsx) exportado ✓','success');
    return;
  }
  // ── PDF ──
  var esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var html = ''
    + '<h2>PAGASI — REPORTE DE CONCESIONARIO</h2>'
    + '<div style="text-align:center;font-size:12px;margin-bottom:4px"><b>'+esc(c.nombre)+'</b>'+(c.ciudad?' · '+esc(c.ciudad):'')+'</div>'
    + '<div style="text-align:center;font-size:11px;color:#555;margin-bottom:16px">'+esc(r.lbl)+' · Generado: '+new Date().toLocaleString('es-VE')+'</div>'
    + '<h3>Resumen del período</h3>'
    + '<table><tr><th>Motos que salieron</th><th>Costo consumido</th><th>Venta total</th><th>Anticipos enviados</th></tr>'
    + '<tr><td>'+credsP.length+'</td><td>$'+costoP.toFixed(2)+'</td><td>$'+ventaP.toFixed(2)+'</td><td>$'+antTotalP.toFixed(2)+'</td></tr></table>'
    + '<h3>Saldo global de la sede</h3>'
    + '<table><tr><th>Total enviado</th><th>Total consumido</th><th>SALDO DISPONIBLE</th></tr>'
    + '<tr><td>$'+fin.enviado.toFixed(2)+'</td><td>−$'+fin.consumido.toFixed(2)+'</td><td style="font-weight:900;'+(fin.saldo<0?'color:#c0392b':'color:#0a7a4b')+'">$'+fin.saldo.toFixed(2)+'</td></tr></table>'
    + '<h3>Motos que salieron ('+credsP.length+')</h3>'
    + (credsP.length===0 ? '<div style="color:#777;font-size:11px">Sin ventas en el período.</div>'
      : '<table><tr><th>Crédito</th><th>Fecha</th><th>Cliente</th><th>Cédula</th><th>Teléfono</th><th>Modelo</th><th>Placa/Serial</th><th>Costo</th><th>Estado</th></tr>'
        + credsP.map(function(cr){
            var cl = cliDe(cr);
            return '<tr><td>'+esc(cr.id)+'</td><td>'+esc(cr.fecha||'')+'</td><td>'+esc(cr.cli||'')+'</td><td>'+esc(cl.cedula||'')+'</td><td>'+esc(cl.tel||'')+'</td><td>'+esc(cr.modelo||'')+'</td><td>'+esc(cr.placa||cr.serialMotor||'')+'</td><td>−$'+(parseFloat(cr.precioBaseReal||cr.precio)||0).toFixed(2)+'</td><td>'+esc(cr.estado||'')+'</td></tr>';
          }).join('')
        + '<tr><td colspan="7" style="text-align:right;font-weight:800">TOTAL COSTO</td><td style="font-weight:900">−$'+costoP.toFixed(2)+'</td><td></td></tr></table>')
    + '<h3>Anticipos enviados ('+antP.length+')</h3>'
    + (antP.length===0 ? '<div style="color:#777;font-size:11px">Sin anticipos en el período.</div>'
      : '<table><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Referencia</th><th>Nota</th><th>Registrado por</th></tr>'
        + antP.map(function(a){
            return '<tr><td>'+esc(a.fecha||'')+'</td><td>$'+(parseFloat(a.monto)||0).toFixed(2)+'</td><td>'+esc(a.metodo||'')+'</td><td>'+esc(a.ref||'')+'</td><td>'+esc(a.nota||'')+'</td><td>'+esc(a.creadoPor||'')+'</td></tr>';
          }).join('')
        + '<tr><td style="font-weight:800">TOTAL</td><td style="font-weight:900">$'+antTotalP.toFixed(2)+'</td><td colspan="4"></td></tr></table>');
  _abrirVentanaImpresion('Reporte '+c.nombre+' '+r.desde, html);
}

// ╔══════════════════════════════════════════════════════════╗
// ║  BANDEJA DE APROBACIONES (Entrega 3)                      ║
// ║  Créditos creados por Vendedores Concesionario en estado  ║
// ║  'pendiente_revision' que requieren tu visto bueno.       ║
// ╚══════════════════════════════════════════════════════════╝

// Cuenta créditos pendientes de revisión (visibles según concesionario activo)
