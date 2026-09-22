// Pagasi module: plan — Catálogo como TABLA (estilo clientes/creditos)
PG.plan = function(){
  // ───────────── Planes financieros (sin cambios, sigue como cards arriba) ─────────────
  var todosPlanes = [{
    nombre: 'Plan ' + PLAN.plazo + ' Meses · Pagasi',
    plazo: PLAN.plazo, factor: PLAN.factor,
    inicial: PLAN.inicial, tasaMensual: PLAN.tasaMensual,
    principal: true
  }].concat(window._planesExtra || []);

  var planesHTML = todosPlanes.map(function(p, i){
    var esPrincipal = !!p.principal;
    var inicialPct = p.inicial ? Math.round(p.inicial * 100) : (p.inicial === 0 ? 0 : p.inicial);
    return '<div class="card" style="padding:16px 18px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">'
        +'<div style="flex:1;font-weight:800;font-size:13.5px;color:var(--ink)">'+(p.nombre||('Plan '+p.plazo+' Meses'))+'</div>'
        +(esPrincipal?'<span style="background:var(--gs);color:var(--p1);border-radius:20px;padding:3px 9px;font-size:9.5px;font-weight:800">PRINCIPAL</span>':'')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
        +'<div style="background:var(--surf2);border-radius:9px;padding:9px 10px;text-align:center">'
          +'<div style="font-family:var(--fd);font-weight:900;font-size:20px;color:var(--ink)">'+p.plazo+'</div>'
          +'<div style="font-size:9.5px;color:var(--ink3);font-weight:700;margin-top:1px;text-transform:uppercase;letter-spacing:.3px">meses plazo</div>'
        +'</div>'
        +'<div style="background:var(--surf2);border-radius:9px;padding:9px 10px;text-align:center">'
          +'<div style="font-family:var(--fd);font-weight:900;font-size:20px;color:var(--ink)">'+p.factor+'x</div>'
          +'<div style="font-size:9.5px;color:var(--ink3);font-weight:700;margin-top:1px;text-transform:uppercase;letter-spacing:.3px">factor</div>'
        +'</div>'
        +'<div style="background:var(--surf2);border-radius:9px;padding:9px 10px;text-align:center">'
          +'<div style="font-family:var(--fd);font-weight:900;font-size:20px;color:var(--ink)">'+inicialPct+'%</div>'
          +'<div style="font-size:9.5px;color:var(--ink3);font-weight:700;margin-top:1px;text-transform:uppercase;letter-spacing:.3px">inicial mín.</div>'
        +'</div>'
        +'<div style="background:var(--surf2);border-radius:9px;padding:9px 10px;text-align:center">'
          +'<div style="font-family:var(--fd);font-weight:900;font-size:20px;color:var(--ink)">'+(p.tasaMensual||'—')+(p.tasaMensual?'%':'')+'</div>'
          +'<div style="font-size:9.5px;color:var(--ink3);font-weight:700;margin-top:1px;text-transform:uppercase;letter-spacing:.3px">tasa mensual</div>'
        +'</div>'
      +'</div>'
      +(esPrincipal
        ? '<button class="btn btn-p btn-sm" style="width:100%" onclick="nav(\'config\')">Editar plan principal</button>'
        : '<div style="display:flex;gap:6px;border-top:1px solid var(--rim2);padding-top:10px"><button class="btn btn-d btn-xs" style="flex:1" onclick="delPlanExtra('+(i-1)+')">Eliminar plan</button></div>'
      )
    +'</div>';
  }).join('');

  // ───────────── CATÁLOGO como TABLA ─────────────
  // Estado: filtro sede + búsqueda + ordenamiento
  var filtroSede = window._planSedeFiltro || '_todas';
  var queryPlan = (window._planQuery || '').trim().toLowerCase();
  var sortPlan = window._planSort || {col:'id', dir:'asc'};

  // Sedes únicas en CATALOGO (preservando orden de aparición)
  var sedesUnicas = [];
  var sedeCount = {};
  CATALOGO.forEach(function(c){
    var s = c.sede || 'Sin sede';
    if(!sedeCount[s]){ sedesUnicas.push(s); sedeCount[s] = 0; }
    sedeCount[s]++;
  });

  // Filtrar y ordenar
  var motosFiltradas = CATALOGO.filter(function(c){
    var s = c.sede || 'Sin sede';
    if(filtroSede !== '_todas' && s !== filtroSede) return false;
    if(queryPlan){
      var hay = (c.modelo + ' ' + s + ' ' + (c.id||'') + ' ' + (c.precio||'')).toLowerCase();
      if(hay.indexOf(queryPlan) < 0) return false;
    }
    return true;
  }).sort(function(a, b){
    var col = sortPlan.col, dir = sortPlan.dir === 'asc' ? 1 : -1;
    if(col === 'modelo'){ var va=(a.modelo||'').toLowerCase(), vb=(b.modelo||'').toLowerCase(); return dir*(va<vb?-1:va>vb?1:0); }
    if(col === 'sede'){ var sa=(a.sede||'').toLowerCase(), sb=(b.sede||'').toLowerCase(); return dir*(sa<sb?-1:sa>sb?1:0); }
    if(col === 'precio'){ return dir*((parseFloat(a.precio)||0) - (parseFloat(b.precio)||0)); }
    if(col === 'cuotaM'){
      var ra = calcMoto(a.precio), rb = calcMoto(b.precio);
      return dir*((ra.cuotaM||0) - (rb.cuotaM||0));
    }
    if(col === 'inicial'){
      var ria = calcMoto(a.precio), rib = calcMoto(b.precio);
      return dir*((ria.ini||0) - (rib.ini||0));
    }
    // default: id
    return dir*((parseInt(a.id,10)||0) - (parseInt(b.id,10)||0));
  });

  // Helper para header sortable (igual a clientes)
  function thS(col, label, opts){
    opts = opts || {};
    var on = sortPlan.col === col;
    var arrow = on ? (sortPlan.dir==='asc'?'↑':'↓') : '';
    var alignRight = opts.right ? ';text-align:right' : '';
    return '<th onclick="setPlanSort(\''+col+'\')" style="cursor:pointer;user-select:none;white-space:nowrap'+alignRight+'">'
      + label + (on?' <span style="color:var(--p1);font-size:10px">'+arrow+'</span>':'<span style="color:var(--ink3);font-size:9px;opacity:.4"> ⇅</span>')
      + '</th>';
  }

  // Color de cada sede (consistente, por hash del nombre)
  function colorSede(s){
    var colors = {
      'EK Bello Monte':       {bg:'rgba(37,99,235,.10)',  br:'rgba(37,99,235,.30)',  fg:'#2563EB'},
      'Boleita':              {bg:'rgba(124,108,245,.10)', br:'rgba(124,108,245,.30)', fg:'#6D5BF0'},
      'Toro Sabana Grande':   {bg:'rgba(22,163,74,.10)',   br:'rgba(22,163,74,.30)',   fg:'#16A34A'},
    };
    return colors[s] || {bg:'var(--surf2)', br:'var(--rim)', fg:'var(--ink3)'};
  }

  // Filas de la tabla
  var rows = motosFiltradas.map(function(c){
    var r = calcMoto(c.precio);
    var col = colorSede(c.sede);
    var sedeBadge = c.sede
      ? '<span style="background:'+col.bg+';color:'+col.fg+';border:1px solid '+col.br+';font-size:9.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:50px;white-space:nowrap">'+c.sede+'</span>'
      : '<span style="color:var(--ink3);font-size:11px">—</span>';
    return '<tr style="cursor:default">'
      + '<td class="tds" style="font-family:var(--fd);color:var(--ink3);font-weight:700">'+(c.id||'')+'</td>'
      + '<td class="tdm" style="font-weight:800;font-size:13px;white-space:nowrap">'+c.modelo+'</td>'
      + '<td>'+sedeBadge+'</td>'
      + '<td class="tdm" style="font-family:var(--fd);font-weight:700;text-align:right;white-space:nowrap">'+fmt(c.precio)+'</td>'
      + '<td class="tds" style="font-family:var(--fd);text-align:right;color:var(--ink2);white-space:nowrap">'+fmt(r.ini)+'</td>'
      + '<td class="tds" style="font-family:var(--fd);text-align:right;color:var(--ink2);white-space:nowrap">'+fmt(r.fin)+'</td>'
      + '<td class="tds" style="font-family:var(--fd);text-align:right;color:var(--ink2);white-space:nowrap">'+fmt(r.total)+'</td>'
      + '<td style="text-align:right;white-space:nowrap">'
        + '<div style="font-family:var(--fd);font-weight:900;font-size:14px;color:var(--p1)">'+fmt(r.cuotaM)+'</div>'
        + '<div style="font-size:10px;color:var(--ink3);font-weight:600">Q: '+fmt(r.cuotaQ)+'</div>'
      + '</td>'
      + '<td onclick="event.stopPropagation()" style="white-space:nowrap"><div style="display:flex;gap:4px;justify-content:flex-end">'
        + '<button class="btn btn-p btn-xs" title="Crear solicitud" onclick="openAddCredConCatalogo('+c.id+')">+ Solicitud</button>'
        + '<button class="btn btn-g btn-xs" title="Editar modelo" onclick="openEditCatalogo('+c.id+')">Editar</button>'
        + '<button class="btn btn-d btn-xs" title="Eliminar" onclick="delCatalogo('+c.id+')">✕</button>'
      + '</div></td>'
    + '</tr>';
  }).join('');

  // Chips de filtro por sede
  var chipsHTML = '<button class="btn '+(filtroSede==='_todas'?'btn-p':'btn-g')+' btn-xs" onclick="setPlanSedeFiltro(\'_todas\')">Todas ('+CATALOGO.length+')</button>'
    + sedesUnicas.map(function(s){
        var c = colorSede(s);
        var active = filtroSede === s;
        var style = active
          ? 'background:'+c.fg+';color:#fff;border-color:'+c.fg
          : 'background:transparent;color:'+c.fg+';border:1px solid '+c.br;
        return '<button class="btn btn-xs" style="'+style+'" onclick="setPlanSedeFiltro('+JSON.stringify(s).replace(/"/g,'&quot;')+')">'+s+' ('+sedeCount[s]+')</button>';
      }).join('');

  // Stats rápidos del filtro actual
  var preciosArr = motosFiltradas.map(function(c){ return parseFloat(c.precio)||0; });
  var minP = preciosArr.length ? Math.min.apply(null, preciosArr) : 0;
  var maxP = preciosArr.length ? Math.max.apply(null, preciosArr) : 0;
  var avgP = preciosArr.length ? preciosArr.reduce(function(a,b){return a+b;},0) / preciosArr.length : 0;

  return`<div class="page">

  ${pageBanner(
    'Configuración · Planes y catálogo',
    'Planes Financieros',
    '<b>'+todosPlanes.length+'</b> plan'+(todosPlanes.length!==1?'es activos':' activo')+' · <b>'+CATALOGO.length+'</b> modelos en catálogo · Factor '+PLAN.factor+'x',
    [
      {label:'＋ Nuevo Plan', onclick:'openAddPlan()'},
      {label:'＋ Agregar Modelo', onclick:'openAddCatalogo()', primary:true}
    ]
  )}

  <!-- CATÁLOGO como TABLA (ahora arriba — protagonista) -->
  <div class="card" style="margin-bottom:14px">
    <div class="ch">
      <div>
        <div class="ct">Catálogo de Motocicletas</div>
        <div class="cs">${motosFiltradas.length} de ${CATALOGO.length} modelo${CATALOGO.length!==1?'s':''} ${filtroSede==='_todas'?'· '+sedesUnicas.length+' sedes':'en '+filtroSede} · Factor ${PLAN.factor}x</div>
      </div>
      <button class="btn btn-p btn-sm" onclick="openAddCatalogo()">＋ Agregar Modelo</button>
    </div>

    <!-- Toolbar: chips + búsqueda + stats -->
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px;padding-bottom:10px;border-bottom:1px solid var(--rim)">
      <div style="display:flex;flex-wrap:wrap;gap:5px">${chipsHTML}</div>
      <div style="flex:1;min-width:200px;max-width:340px">
        <div class="srch" style="width:100%">
          <span class="srch-i">⌕</span>
          <input type="text" id="planQ" placeholder="Buscar modelo, sede, precio..." oninput="setPlanQuery(this.value)" value="${queryPlan.replace(/"/g,'&quot;')}">
        </div>
      </div>
      ${motosFiltradas.length ? '<div style="display:flex;gap:14px;font-size:11px;color:var(--ink3);font-weight:600">'
        +'<span>Min <b style="color:var(--ink);font-family:var(--fd)">'+fmt(minP)+'</b></span>'
        +'<span>Max <b style="color:var(--ink);font-family:var(--fd)">'+fmt(maxP)+'</b></span>'
        +'<span>Prom <b style="color:var(--ink);font-family:var(--fd)">'+fmt(avgP)+'</b></span>'
      +'</div>' : ''}
    </div>

    ${motosFiltradas.length === 0
      ? '<div class="empty" style="margin-top:14px"><span class="e-ic">◆</span><div class="e-tt">Sin resultados</div><div style="font-size:11.5px;color:var(--ink3);margin-top:4px">Ajusta el filtro de sede o la búsqueda</div></div>'
      : '<div class="tw tw-compact" style="margin-top:8px"><table>'
        + '<thead><tr>'
          + thS('id', '#')
          + thS('modelo', 'Modelo')
          + thS('sede', 'Sede')
          + thS('precio', 'Precio', {right:true})
          + thS('inicial', 'Inicial', {right:true})
          + '<th style="text-align:right;white-space:nowrap">Financiado</th>'
          + '<th style="text-align:right;white-space:nowrap">Total</th>'
          + thS('cuotaM', 'Cuota / Quincenal', {right:true})
          + '<th style="text-align:right">Acciones</th>'
        + '</tr></thead>'
        + '<tbody>' + rows + '</tbody>'
      + '</table></div>'
    }
  </div>

  <!-- PLANES (cards abajo) -->
  <div class="card">
    <div class="ch">
      <div><div class="ct">Planes Financieros</div><div class="cs">${todosPlanes.length} plan${todosPlanes.length!==1?'es':''} activo${todosPlanes.length!==1?'s':''}</div></div>
      <button class="btn btn-p btn-sm" onclick="openAddPlan()">＋ Nuevo Plan</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-top:12px">
      ${planesHTML}
    </div>
  </div>

  </div>`;
};

// ───────── Helpers globales para la página Plan & Precios ─────────
function setPlanSedeFiltro(s){
  window._planSedeFiltro = s;
  if(typeof nav==='function') nav('plan');
}

function setPlanSort(col){
  var s = window._planSort || {col:'id', dir:'asc'};
  if(s.col === col){ s.dir = (s.dir === 'asc' ? 'desc' : 'asc'); }
  else { s.col = col; s.dir = (col === 'precio' || col === 'cuotaM' || col === 'inicial') ? 'desc' : 'asc'; }
  window._planSort = s;
  if(typeof nav==='function') nav('plan');
}

function setPlanQuery(q){
  window._planQuery = q || '';
  // Re-render con debounce para no perder foco al tipear
  clearTimeout(window._planQueryDb);
  window._planQueryDb = setTimeout(function(){
    if(typeof nav==='function') nav('plan');
    // Restaurar foco al input
    setTimeout(function(){
      var inp = document.getElementById('planQ');
      if(inp){ inp.focus(); var v = inp.value; inp.value=''; inp.value=v; }
    }, 50);
  }, 280);
}
