// Pagasi module: motos
PG.motos = function(){
  sincronizarInventarioConCreditos({save:true});
  // Filtrar S.motos por concesionario activo en una variable local
  var _MOTOS = _concFiltrar(S.motos||[]);
  const total = _MOTOS.filter(m=>!m.eliminado).length;
  const dispN = _MOTOS.filter(m=>!m.eliminado&&m.estado==='disponible').length;
  const finN = _MOTOS.filter(m=>!m.eliminado&&m.estado==='financiada').length;
  const recN = _MOTOS.filter(m=>!m.eliminado&&m.estado==='recuperada').length;
  const invN = _MOTOS.filter(m=>!m.eliminado&&m.estado==='inventario').length;
  const tabs=[['todas','Todas',total],['disponible','Disponibles',dispN],['financiada','Financiadas',finN],['recuperada','Recuperadas',recN],['inventario','Inventario',invN]];

  // ═══════════ ANÁLISIS DE INVENTARIO ═══════════
  var allMotos = _MOTOS.filter(function(m){return !m.eliminado;});
  // Valor total del inventario
  var valorTotal = allMotos.reduce(function(a,m){return a+(parseFloat(m.precio)||0);},0);
  var valorDisp = allMotos.filter(function(m){return m.estado==='disponible';}).reduce(function(a,m){return a+(parseFloat(m.precio)||0);},0);
  var valorFin = allMotos.filter(function(m){return m.estado==='financiada';}).reduce(function(a,m){return a+(parseFloat(m.precio)||0);},0);
  var valorRec = allMotos.filter(function(m){return m.estado==='recuperada';}).reduce(function(a,m){return a+(parseFloat(m.precio)||0);},0);
  var valorInv = allMotos.filter(function(m){return m.estado==='inventario';}).reduce(function(a,m){return a+(parseFloat(m.precio)||0);},0);

  // Precio promedio
  var precioPromDisp = dispN ? valorDisp/dispN : 0;
  var precioProm = total ? valorTotal/total : 0;

  // Top 5 modelos más vendidos (financiados)
  var modelosCount = {};
  allMotos.filter(function(m){return m.estado==='financiada' || m.estado==='recuperada';}).forEach(function(m){
    var k = m.modelo || 'Sin modelo';
    modelosCount[k] = (modelosCount[k]||0)+1;
  });
  var topModelos = Object.keys(modelosCount).map(function(k){return {modelo:k, count:modelosCount[k]};}).sort(function(a,b){return b.count-a.count;}).slice(0,5);
  var maxModelo = topModelos.length ? Math.max.apply(null, topModelos.map(function(t){return t.count;})) : 1;

  // Distribución por año
  var aniosCount = {};
  allMotos.forEach(function(m){
    var a = m.anio || 'Sin año';
    aniosCount[a] = (aniosCount[a]||0)+1;
  });
  var aniosOrdenados = Object.keys(aniosCount).sort().reverse();

  // Distribución por color
  var coloresCount = {};
  allMotos.forEach(function(m){
    var c = (m.color||'Sin color').toLowerCase();
    coloresCount[c] = (coloresCount[c]||0)+1;
  });
  var coloresArr = Object.keys(coloresCount).map(function(k){return {color:k, count:coloresCount[k]};}).sort(function(a,b){return b.count-a.count;}).slice(0,8);

  // Cuota promedio mensual
  var cuotaPromMensual = total ? allMotos.reduce(function(a,m){return a+(parseFloat(m.cuotaM)||0);},0)/total : 0;

  // Rotación estimada · motos financiadas vs disponibles
  var rotacion = total ? Math.round((finN+recN)/total*100) : 0;

  // Unidades nuevas este mes (basado en fecha de creación si existe)
  var hoy = new Date();
  var inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  var nuevasEsteMes = allMotos.filter(function(m){
    if(!m.fechaCreacion && !m.fecha) return false;
    var f = new Date(m.fechaCreacion || m.fecha);
    return f >= inicioMes;
  }).length;

  // Días promedio en inventario (para disponibles con fecha)
  var diasPromDisponible = 0;
  var countConFecha = 0;
  allMotos.filter(function(m){return m.estado==='disponible';}).forEach(function(m){
    if(m.fechaCreacion || m.fecha){
      var dias = Math.floor((hoy - new Date(m.fechaCreacion || m.fecha))/(1000*60*60*24));
      if(dias>=0){ diasPromDisponible+=dias; countConFecha++; }
    }
  });
  diasPromDisponible = countConFecha ? Math.round(diasPromDisponible/countConFecha) : 0;

  // Porcentaje ocupación (financiadas / total)
  var ocupacion = total ? Math.round(finN/total*100) : 0;

  return`<div class="page">

  ${pageBanner(
    'Inventario · Centro de distribución',
    'Motocicletas',
    '<b>'+total+'</b> unidades · Valor inventario: <b>'+fmt(valorTotal)+'</b> · Ocupación: <b>'+ocupacion+'%</b>',
    [
      {label:'⟳ Resincronizar', onclick:'resyncMotosConFirebase()'},
      {label:'↓ Exportar CSV', onclick:"exportarCSV('motos')"},
      {label:'＋ Al catálogo', onclick:'openAddCatalogo()'},
      {label:'＋ Nueva unidad', onclick:'openAddMoto()', primary:true}
    ]
  )}

  <!-- ═══ KPIs PRINCIPALES ═══ -->
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px">
    <div class="stat">
      <div class="st-v" style="font-size:22px">${total}</div>
      <div class="st-l">Total unidades</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:3px">+${nuevasEsteMes} este mes</div>
    </div>
    <div class="stat">
      <div class="st-v" style="color:var(--green);font-size:26px">${dispN}</div>
      <div class="st-l">Disponibles</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:3px">${fmt(valorDisp)}</div>
    </div>
    <div class="stat">
      <div class="st-v" style="color:var(--p1);font-size:26px">${finN}</div>
      <div class="st-l">Financiadas</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:3px">${total?Math.round(finN/total*100):0}% del total</div>
    </div>
    <div class="stat">
      <div class="st-v" style="color:var(--red);font-size:26px">${recN}</div>
      <div class="st-l">Recuperadas</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:3px">${fmt(valorRec)}</div>
    </div>
    <div class="stat">
      <div class="st-v" style="color:var(--blue,#3b82f6);font-size:22px">${invN}</div>
      <div class="st-l">Inventario</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:3px">${fmt(valorInv)}</div>
    </div>
    <div class="stat">
      <div class="st-v" style="color:var(--amber);font-size:26px">${fmt(precioPromDisp).replace('$','$')}</div>
      <div class="st-l">Precio prom.</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:3px">Disponibles</div>
    </div>
  </div>

  <!-- ═══ BARRA OCUPACIÓN + MODELOS TOP + DISTRIBUCIONES ═══ -->
  <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px;margin-bottom:14px">

    <!-- Distribución de estado (barra apilada) -->
    <div class="card">
      <div class="ch">
        <div>
          <div class="ct"> Estado del inventario</div>
          <div class="cs">Distribución visual · ${total} unidades activas</div>
        </div>
      </div>
      <div style="margin-top:14px">
        <div style="display:flex;height:42px;border-radius:10px;overflow:hidden;background:var(--surf2)">
          ${dispN>0?`<div style="flex:${dispN};background:linear-gradient(135deg,#05a060,#10c878);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;min-width:40px">${dispN}</div>`:''}
          ${finN>0?`<div style="flex:${finN};background:linear-gradient(135deg,#2563EB,#60A5FA);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;min-width:40px">${finN}</div>`:''}
          ${recN>0?`<div style="flex:${recN};background:linear-gradient(135deg,#d93b5a,#f04b6a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;min-width:40px">${recN}</div>`:''}
          ${invN>0?`<div style="flex:${invN};background:linear-gradient(135deg,#3b82f6,#5ba0ff);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800;min-width:40px">${invN}</div>`:''}
          ${total===0?`<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--ink3);font-size:12px">Sin datos</div>`:''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:11px">
          <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:#05a060"></span>Disponible</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:#2563EB"></span>Financiada</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:#d93b5a"></span>Recuperada</span>
          <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:#3b82f6"></span>Inventario</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--rim2)">
        <div><div style="font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Rotación</div><div style="font-size:18px;font-weight:900;color:var(--p1)">${rotacion}%</div></div>
        <div><div style="font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Días prom.</div><div style="font-size:18px;font-weight:900;color:var(--amber)">${diasPromDisponible}d</div></div>
        <div><div style="font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Cuota prom.</div><div style="font-size:18px;font-weight:900;color:var(--green)">${fmt(cuotaPromMensual)}</div></div>
      </div>
    </div>

    <!-- Top modelos -->
    <div class="card">
      <div class="ch">
        <div>
          <div class="ct"> Top modelos</div>
          <div class="cs">Más financiados/vendidos</div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
        ${topModelos.length ? topModelos.map(function(t,i){
          var medals = ['','','','4','5'];
          var w = Math.round(t.count/maxModelo*100);
          return '<div>'
            +'<div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;margin-bottom:3px">'
            +'<span style="display:flex;align-items:center;gap:6px"><span style="font-size:14px">'+medals[i]+'</span><b>'+t.modelo+'</b></span>'
            +'<span style="font-weight:800;color:var(--p1)">'+t.count+'</span>'
            +'</div>'
            +'<div style="height:6px;background:var(--surf2);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+w+'%;background:linear-gradient(90deg,var(--p1),var(--p2,#60A5FA));border-radius:4px"></div></div>'
            +'</div>';
        }).join('') : '<div style="text-align:center;padding:24px 0;color:var(--ink3);font-size:12px">Sin modelos financiados aún</div>'}
      </div>
    </div>

    <!-- Distribución por año/color -->
    <div class="card">
      <div class="ch">
        <div>
          <div class="ct"> Flota por color</div>
          <div class="cs">${coloresArr.length} colores distintos</div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:5px">
        ${coloresArr.length ? coloresArr.slice(0,5).map(function(c){
          var colorMap = {
            'negro':'#1a1a1a','negra':'#1a1a1a','rojo':'#d93b5a','roja':'#d93b5a',
            'azul':'#3b82f6','blanco':'#e5e5e5','blanca':'#e5e5e5',
            'verde':'#05a060','amarillo':'#e8980a','gris':'#8a8a8a','plata':'#b8b8b8',
            'naranja':'#ff8a3c','morado':'#2563EB','rosa':'#ec4899'
          };
          var hex = colorMap[c.color] || '#2563EB';
          return '<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--surf2);border-radius:6px">'
            +'<div style="width:18px;height:18px;border-radius:50%;background:'+hex+';border:2px solid var(--surf);box-shadow:0 1px 3px rgba(0,0,0,.15);flex-shrink:0"></div>'
            +'<div style="flex:1;font-size:11.5px;font-weight:600;text-transform:capitalize">'+c.color+'</div>'
            +'<div style="font-size:12px;font-weight:800;color:var(--p1)">'+c.count+'</div>'
            +'</div>';
        }).join('') : '<div style="text-align:center;padding:24px 0;color:var(--ink3);font-size:12px">Sin datos de color</div>'}
      </div>
      ${aniosOrdenados.length ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--rim2)">
        <div style="font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase;margin-bottom:6px">Por año</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${aniosOrdenados.slice(0,6).map(function(a){
            return '<span style="font-size:10.5px;padding:3px 8px;background:var(--p1);background-opacity:.12;color:var(--p1);border-radius:10px;font-weight:700;background:rgba(37,99,235,.12)">'+a+' · '+aniosCount[a]+'</span>';
          }).join('')}
        </div>
      </div>`:''}
    </div>
  </div>

  <!-- ═══ TOOLBAR + FILTROS ═══ -->
  <div class="card" style="padding:12px 14px;margin-bottom:14px">
    <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap">
      <div style="display:flex;gap:5px;flex-wrap:wrap;flex:1">
        ${tabs.map(function(arr){
          var k=arr[0], l=arr[1], n=arr[2];
          var col = k==='disponible'?'var(--green)':k==='financiada'?'var(--p1)':k==='recuperada'?'var(--red)':k==='inventario'?'var(--blue,#3b82f6)':'var(--ink2)';
          var isActive = S.mTab===k;
          return '<button class="btn btn-sm'+(isActive?' btn-p':' btn-g')+'" onclick="setMTab(\''+k+'\')" style="'+(isActive?'':'border-left:3px solid '+col)+'">'
            +l+' <span style="opacity:.75;font-size:10px;font-weight:900;margin-left:4px">'+n+'</span>'
            +'</button>';
        }).join('')}
      </div>
      <div style="display:flex;gap:6px;align-items:center;font-size:11px;color:var(--ink3)">
        <span style="padding:5px 10px;background:var(--surf2);border-radius:16px"><b>${total}</b> unidades</span>
        <span style="padding:5px 10px;background:var(--surf2);border-radius:16px"><b>${fmt(valorTotal)}</b> inventario</span>
      </div>
    </div>
  </div>

  <!-- ═══ GRID DE UNIDADES ═══ -->
  <div id="mgr">${renderMotoGrid()}</div>
  ${renderMotosEliminadasBloque()}
  </div>`;
};

