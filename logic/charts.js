// Logica de graficos Chart.js. Extraido mecanicamente de assets/pagasi-app.js.
function wtInjectDataLabels(){
  if(window.innerWidth > 820) return; // solo en mobile
  document.querySelectorAll('.tw table').forEach(function(table){
    // Skip tables inside modals
    if(table.closest('.modal') || table.closest('.m-bd')) return;
    var headers = [];
    table.querySelectorAll('thead th').forEach(function(th){
      // Get clean text without arrows/icons
      headers.push((th.textContent||'').replace(/[↑↓⇅]/g,'').trim());
    });
    if(!headers.length) return;
    table.querySelectorAll('tbody tr').forEach(function(tr){
      tr.querySelectorAll('td').forEach(function(td, i){
        td.setAttribute('data-label', headers[i] || '');
      });
    });
  });
}

// ══════════════════════════════════════════
// GLOBAL SEARCH
// ══════════════════════════════════════════

function globalSearch(q){
  var val = q.trim().toLowerCase();
  // Show/hide clear X
  var clr = $('gs-clear');
  if(clr) clr.style.display = q.length ? '' : 'none';

  // Live filter current page
  if(S.page==='clientes') renderClienteList(q);
  if(S.page==='motos') filterMotos(q);

  var panel = $('gs-panel');
  if(!val){ if(panel) panel.classList.remove('open'); return; }
  if(!panel) return;

  var results = [];
  S.clientes.filter(c=>!c.eliminado).forEach(function(c){
    if((c.nombre+' '+c.cedula+' '+c.tel+' '+(c.email||'')).toLowerCase().includes(val)){
      results.push({tipo:'cliente',icon:'CLI',titulo:c.nombre,
        sub:c.cedula+' · '+c.tel+(c.ciudad?' · '+c.ciudad:''),
        accion:function(){ nav('clientes'); setTimeout(function(){verCliente(c.id);},100); }});
    }
  });
  S.creds.filter(c=>!c.eliminado).forEach(function(c){
    if((c.id+' '+c.cli+' '+c.modelo+' '+(c.vin||'')+' '+(c.placa||'')).toLowerCase().includes(val)){
      results.push({tipo:'crédito',icon:'',titulo:c.id+' — '+c.cli,
        sub:c.modelo+(c.placa&&c.placa!=='—'?' · '+c.placa:'')+' · '+c.estado+' · '+(c.pagado||0)+' cuotas',
        accion:function(){ nav('creditos'); setTimeout(function(){openAmort(c.id);},100); }});
    }
  });
  S.motos.filter(m=>!m.eliminado).forEach(function(m){
    if((m.modelo+' '+(m.vin||'')+' '+(m.cliente||'')+' '+(m.color||'')+' '+(m.placa||'')).toLowerCase().includes(val)){
      results.push({tipo:'moto',icon:'MOT',titulo:m.modelo,
        sub:(m.placa&&m.placa!=='—'?m.placa+' · ':'')+(m.vin||'Sin VIN')+' · '+m.estado+(m.cliente?' · '+m.cliente:''),
        accion:function(){ nav('motos'); }});
    }
  });
  S.pagos.filter(p=>!p.eliminado).forEach(function(p){
    if((p.id+' '+p.cli+' '+(p.referencia||'')+(p.metodo||'')).toLowerCase().includes(val)){
      results.push({tipo:'pago',icon:'PAG',titulo:p.id+' — '+p.cli,
        sub:fmt(p.monto)+' · '+p.fecha+' · '+(p.metodo||''),
        accion:function(){ nav('pagos'); }});
    }
  });
  S.egresos.filter(function(e){return !e.eliminado;}).forEach(function(e){
    if((e.concepto+' '+(e.categoria||'')+(e.forma||'')).toLowerCase().includes(val)){
      results.push({tipo:'egreso',icon:'$',titulo:e.concepto,
        sub:fmt(e.monto)+' · '+(e.fecha||'')+(e.forma?' · '+e.forma:''),
        accion:function(){ nav('conta'); }});
    }
  });

  window._gsActions = results.slice(0,12).map(function(r){ return r.accion; });
  window._gsSelected = -1;

  panel.classList.add('open');
  if(!results.length){
    panel.innerHTML = '<div style="padding:14px;color:var(--ink3);font-size:12px;text-align:center">Sin resultados para "'+q+'"</div>';
    return;
  }
  panel.innerHTML =
    '<div style="padding:7px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--ink3);border-bottom:1px solid var(--rim)">'+
      results.length+' resultado'+(results.length!==1?'s':'')+
    '</div>'+
    results.slice(0,12).map(function(r,i){
      var typeColors={cliente:'var(--gs)','crédito':'rgba(37,99,235,0.08)',moto:'var(--greens)',pago:'var(--greens)',egreso:'var(--reds)'};
      return '<div class="gs-row" data-idx="'+i+'" style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--rim);transition:background .1s" '+
        'onmouseover="gsHover(this,'+i+')" '+
        'onmouseout="" '+
        'onclick="window._gsActions['+i+']()">' +
        '<div style="width:30px;height:30px;border-radius:8px;background:'+(typeColors[r.tipo]||'var(--gs)')+';display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:var(--p1);font-family:var(--fm);flex-shrink:0">'+r.icon+'</div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:12.5px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.titulo+'</div>'+
          '<div style="font-size:10.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.sub+'</div>'+
        '</div>'+
        '<span style="font-size:9px;color:var(--ink3);background:var(--surf2);padding:2px 7px;border-radius:12px;flex-shrink:0">'+r.tipo+'</span>'+
      '</div>';
    }).join('')+
    (results.length>12?'<div style="padding:8px;text-align:center;font-size:11px;color:var(--ink3)">+'+(results.length-12)+' más</div>':'');
}

function gsHover(el,i){
  document.querySelectorAll('.gs-row').forEach(function(r){r.style.background='';});
  el.style.background='var(--surf2)';
  window._gsSelected=i;
}
function gsKeyNav(e){
  var rows = document.querySelectorAll('.gs-row');
  if(!rows.length) return;
  if(e.key==='ArrowDown'){
    e.preventDefault();
    window._gsSelected = Math.min((window._gsSelected||0)+1, rows.length-1);
  } else if(e.key==='ArrowUp'){
    e.preventDefault();
    window._gsSelected = Math.max((window._gsSelected||0)-1, 0);
  } else if(e.key==='Enter'){
    e.preventDefault();
    if(window._gsSelected>=0 && window._gsActions[window._gsSelected]) window._gsActions[window._gsSelected]();
    closeGlobalSearch();
    return;
  } else if(e.key==='Escape'){
    closeGlobalSearch(); $('globalSearch').blur();
    return;
  }
  rows.forEach(function(r,i){
    r.style.background = i===window._gsSelected ? 'var(--surf2)' : '';
  });
}


function closeGlobalSearch(){
  var panel = $('gs-panel');
  if(panel) panel.classList.remove('open');
}

// ══════════════════════════════════════════
// DARK MODE
// ══════════════════════════════════════════
function toggleDark(){
  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  setDark(!isDark);
  setTimeout(function(){
    if(typeof renderDashChart==='function') renderDashChart();
    if(typeof renderDashEgrChart==='function') renderDashEgrChart();
    if(typeof renderDashCuotasChart==='function') renderDashCuotasChart();
    if(typeof renderDashCobrospChart==='function') renderDashCobrospChart();
    if(typeof renderMoraChart==='function') renderMoraChart();
    if(typeof renderCredChart==='function') renderCredChart();
    if(typeof renderFinIngChart==='function') renderFinIngChart();
  }, 120);
  // Retry in case canvas not ready on first paint
  setTimeout(function(){
    if(typeof renderCredChart==='function' && !_credChart) renderCredChart();
    if(typeof renderDashChart==='function' && !_dashChart) renderDashChart();
  }, 600);
  setTimeout(function(){
    if(typeof renderCredChart==='function' && !_credChart) renderCredChart();
  }, 1500);
}
function setDark(on){
  if(on){
    document.documentElement.setAttribute('data-theme','dark');
    document.documentElement.style.setProperty('color-scheme','dark');
  } else {
    document.documentElement.setAttribute('data-theme','light');
    document.documentElement.style.setProperty('color-scheme','light');
  }
  ['darkToggle','darkToggleMob'].forEach(function(id){
    var btn=document.getElementById(id);
    if(btn){ btn.textContent = on ? '☾' : '☀'; btn.title = on ? 'Modo claro' : 'Modo oscuro'; }
  });
  try{ localStorage.setItem('pagasi_theme', on?'dark':'light'); }catch(e){}
}
// Apply saved theme immediately on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function(){
  try{
    var saved = localStorage.getItem('pagasi_theme');
    if(saved==='dark') setDark(true);
    else if(!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) setDark(true);
  }catch(e){}
});

// ══════════════════════════════════════════
// CHART.JS — DASHBOARD INGRESOS
// ══════════════════════════════════════════
var _finIngChart = null;
var _finIngPeriodo = 'diario';
function setFin2Periodo(tipo, periodo){
  var isIng = tipo==='ing';
  var color = isIng ? 'var(--p1)' : 'var(--red)';
  var colorT = isIng ? 'rgba(37,99,235,0.3)' : 'rgba(217,59,90,0.28)';
  var dataType = isIng ? 'ingresos' : 'egresos';
  var prefix = 'fin2-'+tipo;
  var subLabels={diario:'Últimos 30 días',quincenal:'Últimas 8 quincenas',mensual:'Últimos 12 meses'};
  ['d','q','m'].forEach(function(k){
    var p=k==='d'?'diario':k==='q'?'quincenal':'mensual';
    var btn=document.getElementById(prefix+'-'+k);
    if(btn){ btn.className='btn btn-xs'+(p===periodo?' btn-p':''); btn.style.fontSize='10px'; btn.style.padding='4px 9px'; }
  });
  var sub=document.getElementById(prefix+'-sub');
  if(sub) sub.textContent=subLabels[periodo];
  var wrap=document.getElementById(prefix+'-wrap');
  if(!wrap) return;
  var data=getDashData(dataType,periodo);
  var maxV=Math.max.apply(null,data.map(function(x){return x.total;}))||1;
  wrap.innerHTML='<div style="display:flex;align-items:flex-end;gap:3px;height:120px">'
    +data.map(function(b,i){
      var h=b.total>0?Math.max(4,Math.round(b.total/maxV*110)):2;
      var isLast=i===data.length-1;
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end">'
        +(isLast&&b.total>0?'<div style="font-size:8px;font-weight:700;color:'+color+'">$'+Math.round(b.total/1000)+'k</div>':'')
        +'<div style="width:100%;background:'+(isLast?color:colorT)+';border-radius:3px 3px 0 0;height:'+h+'px;min-height:2px"></div>'
        +'<div style="font-size:7px;color:var(--ink3);white-space:nowrap">'+b.label+'</div>'
        +'</div>';
    }).join('')+'</div>';
}


function renderFinIngChart(){
  var canvas=document.getElementById('fin-ing-chart');
  if(!canvas||typeof Chart==='undefined') return;
  // Don't set canvas.height - let CSS control it
  var wrapper=canvas.parentElement;
  if(wrapper) wrapper.style.height='160px';
  var periodo=_finIngPeriodo||'diario';
  var data=getDashData('ingresos',periodo);
  var labels=data.map(function(x){return x.label;}), values=data.map(function(x){return x.total;});
  var isDark=document.documentElement.getAttribute('data-theme')==='dark';
  var p1=isDark?'#3B82F6':'#2563EB', p1t=isDark?'rgba(59,130,246,0.18)':'rgba(37,99,235,0.10)';
  var ink3=isDark?'#6B6896':'#9794BB';
  var subLabels={diario:'Últimos 14 días',quincenal:'Últimas 8 quincenas',mensual:'Últimos 7 meses'};
  var sub=document.getElementById('fin-ing-sub'); if(sub) sub.textContent=subLabels[periodo];
  if(_finIngChart){_finIngChart.destroy();_finIngChart=null;}
  _finIngChart=new Chart(canvas,{type:'bar',data:{labels:labels,datasets:[{label:'Ingresos',data:values,
    backgroundColor:values.map(function(v,i){return i===values.length-1?p1:p1t;}),
    borderColor:'transparent',borderWidth:0,borderRadius:6,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{backgroundColor:isDark?'#252844':'#fff',
        borderColor:isDark?'rgba(37,99,235,0.3)':'rgba(37,99,235,0.2)',borderWidth:1,
        titleColor:isDark?'#E8E6FF':'#0B0B1E',bodyColor:isDark?'#B0ADDB':'#4A4870',padding:10,
        callbacks:{label:function(ctx){return ' $'+(ctx.raw||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}}}},
      scales:{x:{grid:{display:false},border:{display:false},ticks:{color:ink3,font:{size:9}}},
        y:{grid:{color:isDark?'rgba(37,99,235,0.08)':'rgba(37,99,235,0.06)'},border:{display:false,dash:[4,4]},
          ticks:{color:ink3,font:{size:9},callback:function(v){return v>0?'$'+Math.round(v/1000)+'k':'$0';},maxTicksLimit:5}}}}});
}

var _dashChart = null;
var _moraChart = null;
var _credChart = null;
var _dashPeriodo = { ingresos: 'diario', creditos: 'diario', egresos: 'diario', cuotas: 'diario' };

function getDashData(tipo, periodo){
  var now = new Date();
  var buckets = [];
  var matchFn;
  if(periodo === 'diario'){
    for(var i=29; i>=0; i--){
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
      buckets.push({ label: d.getDate()+'/'+(d.getMonth()+1), y:d.getFullYear(), m:d.getMonth(), day:d.getDate(), total:0, count:0, gastos:0, motos:0, iniciales:0 });
    }
    matchFn = function(fecha, b){ 
      // Parse as local date to avoid UTC timezone shift
      var parts = String(fecha).slice(0,10).split('-');
      if(parts.length<3) return false;
      return parseInt(parts[0])===b.y && (parseInt(parts[1])-1)===b.m && parseInt(parts[2])===b.day;
    };
  } else if(periodo === 'quincenal'){
    var seen = {};
    for(var i=0; i<16; i++){
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-(i*15));
      var qk = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+(d.getDate()<=15?1:2);
      if(!seen[qk]){ seen[qk]=true; buckets.unshift({ label:(d.getMonth()+1)+'/Q'+(d.getDate()<=15?1:2), y:d.getFullYear(), m:d.getMonth(), q:d.getDate()<=15?1:2, total:0, count:0, gastos:0, motos:0, iniciales:0 }); }
      if(buckets.length>=8) break;
    }
    buckets = buckets.slice(-8);
    matchFn = function(fecha, b){ var fd=new Date(fecha); var fq=fd.getDate()<=15?1:2; return fd.getFullYear()===b.y&&fd.getMonth()===b.m&&fq===b.q; };
  } else {
    for(var i=11; i>=0; i--){
      var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      buckets.push({ label: d.toLocaleDateString('es-VE',{month:'short'}), y:d.getFullYear(), m:d.getMonth(), total:0, count:0, gastos:0, motos:0, iniciales:0 });
    }
    matchFn = function(fecha, b){ 
      var parts = String(fecha).slice(0,10).split('-');
      if(parts.length<2) return false;
      return parseInt(parts[0])===b.y && (parseInt(parts[1])-1)===b.m;
    };
  }
  var toDateStr = function(v){
    if(!v) return '';
    if(typeof v === 'string') return v.slice(0,10);
    if(v && v.toDate) return v.toDate().toISOString().slice(0,10); // Firestore Timestamp
    if(v instanceof Date) return fechaLocalISO(v);
    if(v && v.seconds) return new Date(v.seconds*1000).toISOString().slice(0,10); // Timestamp object
    return String(v).slice(0,10);
  };

  if(tipo === 'ingresos'){
    var pagosData = _concFiltrar(S.pagos||[]);
    if(!pagosData.length) pagosData = S.pagos||[];
    pagosData.filter(function(p){ return !p.eliminado&&p.estado==='confirmado'&&p.fecha; }).forEach(function(p){
      var f = toDateStr(p.fecha);
      buckets.forEach(function(b){ if(f && matchFn(f,b)){ b.total+=parseFloat(p.monto)||0; b.count++; } });
    });
  } else if(tipo === 'egresos'){
    var egrData = _concFiltrar(S.egresos||[]);
    if(!egrData.length) egrData = S.egresos||[];
    // total = todo (no se toca, lo usan otros sitios); ademas, separado:
    //   gastos    = lo que de verdad cuesta operar
    //   motos     = compra de motos, SOLO lo que Pagasi financia
    //   iniciales = la inicial del cliente (se muestra aparte, no suma)
    var _idsIni = _egrIdsInicial();
    egrData.filter(function(e){ return !e.eliminado&&e.fecha; }).forEach(function(e){
      var f = toDateStr(e.fecha);
      var m = parseFloat(e.monto)||0;
      var esMoto = e.origenAuto==='compra_moto';
      var esIni = esMoto && _idsIni[String(e.id)];
      buckets.forEach(function(b){ if(f && matchFn(f,b)){
        b.total+=m; b.count++;
        if(esIni) b.iniciales+=m; else if(esMoto) b.motos+=m; else b.gastos+=m;
      } });
    });
  } else if(tipo === 'cuotas'){
    // Cuotas cobradas = pagos confirmados que NO son la inicial (mismo criterio que el KPI "Cobrado")
    var pagosCuo = _concFiltrar(S.pagos||[]);
    if(!pagosCuo.length) pagosCuo = S.pagos||[];
    pagosCuo.filter(function(p){ return !p.eliminado&&p.estado==='confirmado'&&!p.esInicial&&p.tipoOperacion!=='inicial_credito'&&p.fecha; }).forEach(function(p){
      var f = toDateStr(p.fecha);
      buckets.forEach(function(b){ if(f && matchFn(f,b)){ b.total+=parseFloat(p.monto)||0; b.count++; } });
    });
  } else {
    var credsData = _concFiltrar(S.creds||[]);
    if(!credsData.length) credsData = S.creds||[];
    // Los cancelados no cuentan: esa venta se anulo (igual que Finanzas y el grafico de concesionarios).
    // Un recuperado si cuenta el dia que se otorgo. (Adam, 14-sep-2026: marcaba 10 con 9 en la lista)
    credsData.filter(function(c){ return !c.eliminado && c.estado!=='cancelado'; }).forEach(function(c){
      var f = toDateStr(c.fecha || c.creadoEn || c.fechaCreacion || c.createdAt || '');
      if(f) buckets.forEach(function(b){ if(matchFn(f,b)){ b.count++; b.total+=parseFloat(c.total||c.precio||0); } });
    });
  }
  return buckets;
}

// ── Egresos: gastos de verdad vs compra de motos, y la inicial del cliente ──
// Cuando se registra la compra de una moto quedan DOS egresos: uno por lo que
// Pagasi transfiere (lo financiado) y otro por la inicial que paga el cliente.
// Esa inicial entra tambien como ingreso, asi que la utilidad no se afecta, pero
// inflaba el grafico: el 17-sep-2026 eran $10.780 de $24.943 (Adam: "separalo y
// quita las iniciales en uno"). Devuelve los ids de los egresos que son la
// inicial: por cada moto, UNO solo, el que coincide con el inicial del credito.
function _egrIdsInicial(){
  var porMoto = {};
  (S.egresos||[]).forEach(function(e){
    if(!e || e.eliminado || e.origenAuto!=='compra_moto' || e.motoIdRef==null) return;
    (porMoto[String(e.motoIdRef)] = porMoto[String(e.motoIdRef)] || []).push(e);
  });
  var iniDeMoto = {};
  (S.creds||[]).forEach(function(c){
    if(!c || c.eliminado || c.estado==='cancelado' || c.motoId==null) return;
    var ini = parseFloat(c.ini)||0;
    if(ini>0) iniDeMoto[String(c.motoId)] = ini;
  });
  var ids = {};
  Object.keys(porMoto).forEach(function(mid){
    var ini = iniDeMoto[mid];
    if(!ini) return;
    var lista = porMoto[mid].slice().sort(function(a,b){
      var f = String(a.fecha||'').localeCompare(String(b.fecha||''));
      return f!==0 ? f : (String(a.id).localeCompare(String(b.id)));
    });
    // 1) Una sola fila que cuadre con la inicial: es el caso normal.
    var encontrado = false;
    for(var i=0;i<lista.length;i++){
      if(Math.abs((parseFloat(lista[i].monto)||0) - ini) <= 1){ ids[String(lista[i].id)] = true; encontrado = true; break; }
    }
    if(encontrado) return;
    // 2) Si la inicial se pago en VARIAS filas (300+200 para una inicial de 500), o se
    // corrigio despues, ninguna sola coincidia: no se apartaba nada y esos dolares se
    // contaban como plata prestada por Pagasi, asi que el flujo de caja del mes salia
    // mas bajo de lo real (punto 27, 22-sep-2026). Se busca la combinacion que sume la
    // inicial. Con mas de 8 filas no se intenta: son 2^8 = 256 sumas como mucho.
    if(lista.length < 2 || lista.length > 8) return;
    var montos = lista.map(function(e){ return parseFloat(e.monto)||0; });
    var mejor = null;
    for(var mask=1; mask < (1<<lista.length); mask++){
      var suma = 0, cuantos = 0;
      for(var b=0;b<lista.length;b++) if(mask & (1<<b)){ suma += montos[b]; cuantos++; }
      if(cuantos < 2) continue;                    // una sola ya se intento arriba
      if(Math.abs(suma - ini) > 0.01) continue;    // aqui si se exige exactitud
      // Ante dos combinaciones que suman igual, la de menos filas
      if(mejor === null || cuantos < mejor.cuantos) mejor = {mask:mask, cuantos:cuantos};
    }
    if(mejor) for(var k=0;k<lista.length;k++) if(mejor.mask & (1<<k)) ids[String(lista[k].id)] = true;
  });
  return ids;
}

// ── Estilo comun de los 4 graficos del dashboard (Adam, 17-sep-2026: "ponme el
// dashboard mas bonito"): barras con degradado y la ultima resaltada, y en la
// cabecera el total del periodo en grande con su promedio.
function _dashBarras(fuerte, rgb, primera){
  return function(context){
    var chart = context.chart, a = chart.chartArea;
    var ultima = primera ? context.dataIndex === 0 : context.dataIndex === context.dataset.data.length - 1;
    if(!a) return ultima ? fuerte : 'rgba('+rgb+',0.18)';
    var g = chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
    if(ultima){ g.addColorStop(0, 'rgba('+rgb+',1)');    g.addColorStop(1, 'rgba('+rgb+',0.6)'); }
    else      { g.addColorStop(0, 'rgba('+rgb+',0.34)'); g.addColorStop(1, 'rgba('+rgb+',0.08)'); }
    return g;
  };
}
// Etiqueta del eje en dinero: antes redondeaba a miles y salian repetidas
// ("$1k, $1k, $2k, $2k"). Con un decimal debajo de 10k ya no se repiten.
function _dashTick(v){
  if(!v) return '$0';
  if(Math.abs(v) < 1000) return '$' + Math.round(v);
  if(Math.abs(v) < 10000) return '$' + (Math.round(v/100)/10).toString().replace('.', ',') + 'k';
  return '$' + Math.round(v/1000) + 'k';
}
function _dashSub(pre, periodo, n, extra){
  var el = document.getElementById('dash-'+pre+'-sub');
  if(!el) return;
  var t = periodo==='diario' ? 'Últimos '+n+' días' : periodo==='quincenal' ? 'Últimas '+n+' quincenas' : 'Últimos '+n+' meses';
  el.textContent = t + (extra||'');
}
function _dashResumen(pre, valores, periodo, dinero){
  var tot = valores.reduce(function(a,b){ return a + (+b||0); }, 0);
  var n = valores.length || 1;
  var fm = function(v){ return (dinero?'$':'') + Math.round(v).toLocaleString('es-VE'); };
  var uni = periodo==='diario' ? 'día' : periodo==='quincenal' ? 'quincena' : 'mes';
  var big = document.getElementById('dash-'+pre+'-big');
  if(big) big.textContent = fm(tot) + (dinero ? '' : ' otorgados');
  var avg = document.getElementById('dash-'+pre+'-avg');
  if(avg){
    var prom = dinero ? fm(tot/n) : (Math.round(tot/n*10)/10).toLocaleString('es-VE');
    avg.textContent = tot>0 ? ' · prom. ' + prom + '/' + uni : '';
  }
}

function setDashPeriodo(tipo, periodo){
  _dashPeriodo[tipo] = periodo;
  var pre = tipo==='ingresos'?'ing':tipo==='egresos'?'egr':tipo==='cuotas'?'cuo':'cred';
  ['d','q','m'].forEach(function(k){
    var p = k==='d'?'diario':k==='q'?'quincenal':'mensual';
    var btn = document.getElementById('dash-'+pre+'-'+k);
    if(btn) btn.className = (p===periodo ? 'on' : '');
  });
  var subLabels={diario:'Últimos 30 días',quincenal:'Últimas 8 quincenas',mensual:'Últimos 7 meses'};
  if(tipo==='egresos'){
    var sub=document.getElementById('dash-egr-sub'); if(sub) sub.textContent=subLabels[periodo];
    renderDashEgrChart();
  } else if(tipo==='ingresos') renderDashChart();
  else if(tipo==='cuotas') renderDashCuotasChart();
  else renderCredChart();
}

function renderCredChart(){
  var canvas = document.getElementById('dash-cred-chart');
  if(!canvas||typeof Chart==='undefined') return;
  var periodo = _dashPeriodo.creditos||'mensual';
  var data = getDashData('creditos', periodo);
  var labels=data.map(function(x){return x.label;}), counts=data.map(function(x){return x.count;});
  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  var g=isDark?'#00D68F':'#00B876', gt=isDark?'rgba(0,214,143,0.18)':'rgba(0,184,118,0.12)', ink3=isDark?'#6B6896':'#9794BB';
  _dashSub('cred', periodo, data.length); _dashResumen('cred', counts, periodo, false);
  if(_credChart){_credChart.destroy();_credChart=null;}
  // Si no hay datos, mostrar placeholder
  var totalCounts = counts.reduce(function(a,b){return a+b;},0);
  var wrap = canvas.parentElement;
  var placeholder = wrap ? wrap.querySelector('.chart-empty') : null;
  if(!placeholder && wrap){ placeholder = document.createElement('div'); placeholder.className='chart-empty'; placeholder.style.cssText='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--ink3);font-size:12px;font-weight:700;gap:6px'; placeholder.innerHTML='<div style="font-size:28px;opacity:.3"></div><div>Sin créditos en este período</div>'; wrap.appendChild(placeholder); }
  if(placeholder) placeholder.style.display = totalCounts===0 ? 'flex' : 'none';
  canvas.style.display = totalCounts===0 ? 'none' : 'block';
  if(totalCounts===0) return;
  _credChart=new Chart(canvas,{type:'bar',data:{labels:labels,datasets:[{label:'Créditos',data:counts,backgroundColor:_dashBarras(g, isDark?'0,214,143':'0,184,118'),borderColor:'transparent',borderWidth:0,borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:isDark?'#252844':'#fff',borderColor:isDark?'rgba(0,214,143,0.3)':'rgba(0,184,118,0.2)',borderWidth:1,titleColor:isDark?'#E8E6FF':'#0B0B1E',bodyColor:isDark?'#B0ADDB':'#4A4870',padding:10,callbacks:{label:function(ctx){return ' '+ctx.raw+' crédito'+(ctx.raw!==1?'s':'')+' otorgado'+(ctx.raw!==1?'s':'');}}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:ink3,font:{size:9}}},y:{grid:{color:isDark?'rgba(0,214,143,0.08)':'rgba(0,184,118,0.06)'},border:{display:false,dash:[4,4]},ticks:{color:ink3,font:{size:9},stepSize:1,maxTicksLimit:5}}}}});
}
function renderMoraChart(){
  var canvas=document.getElementById('mora-chart');
  if(!canvas||typeof Chart==='undefined') return;
  var data=getMoraMensual();
  var labels=data.map(function(x){return x.label;});
  var values=data.map(function(x){return x.mora;});
  var isDark=document.documentElement.getAttribute('data-theme')==='dark';
  var red=isDark?'#E05575':'#D93B5A';
  var redt=isDark?'rgba(217,59,90,0.15)':'rgba(217,59,90,0.08)';
  var ink3=isDark?'#6B6896':'#9794BB';
  if(_moraChart){_moraChart.destroy();_moraChart=null;}
  _moraChart=new Chart(canvas,{type:'line',data:{labels:labels,datasets:[{label:'En mora',data:values,borderColor:red,backgroundColor:redt,borderWidth:2,pointBackgroundColor:red,pointRadius:4,fill:true,tension:0.35}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:isDark?'#252844':'#fff',borderColor:isDark?'rgba(217,59,90,0.3)':'rgba(217,59,90,0.2)',borderWidth:1,titleColor:isDark?'#E8E6FF':'#0B0B1E',bodyColor:isDark?'#B0ADDB':'#4A4870',padding:10,callbacks:{label:function(ctx){return ' '+ctx.raw+' créd. en mora';}}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:ink3,font:{size:10}}},y:{grid:{color:isDark?'rgba(217,59,90,0.08)':'rgba(217,59,90,0.05)'},border:{display:false},ticks:{color:ink3,font:{size:10},stepSize:1,maxTicksLimit:5}}}}});
}

// ── Cobros programados con toggle D/Q/M (igual que dashboard) ──
var _credCobrosChart = null;
var _credCobrosPeriodo = 'diario';

function setCredCobrosPeriodo(periodo){
  _credCobrosPeriodo = periodo;
  ['d','q','m'].forEach(function(k){
    var p = k==='d'?'diario':k==='q'?'quincenal':'mensual';
    var btn = document.getElementById('cred-cobros-'+k);
    if(btn){ btn.className='btn btn-xs'+(p===periodo?' btn-p':''); btn.style.fontSize='10px'; btn.style.padding='4px 9px'; }
  });
  renderCredCobrosChart();
}

function renderCredCobrosChart(){
  var canvas = document.getElementById('cred-cobros-chart');
  if(!canvas || typeof Chart==='undefined') return;
  var periodo = _credCobrosPeriodo || 'diario';
  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  var p1 = isDark ? '#3B82F6' : '#2563EB';
  var p1t = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(37,99,235,0.12)';
  var ink3 = isDark ? '#6B6896' : '#9794BB';
  var green = isDark ? '#1fc47a' : '#00B876';

  // Incluye los de estado 'mora' (siguen debiendo cuotas): sin ellos la grafica proyectaba
  // menos creditos que los que dice la tarjeta "Activos" de la misma pantalla (Adam, 14-sep-2026)
  var activos = _concFiltrar(S.creds||[]).filter(function(c){ return !c.eliminado && (c.estado==='activo'||c.estado==='mora') && c.fecha; });
  var ahora = Date.now();
  var MS_DIA = 24*60*60*1000;
  var MS_QUINCENA = 15*MS_DIA;
  var now = new Date();

  var buckets = [];
  var subTxt = '';

  if(periodo === 'diario'){
    subTxt = 'Próximos 30 días';
    for(var i=0; i<30; i++){
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+i);
      buckets.push({ label: d.getDate()+'/'+(d.getMonth()+1), dayTs: new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(), monto:0, cuotas:0 });
    }
    activos.forEach(function(c){
      var inicio = parseFechaLocal(c.fecha).getTime();
      if(isNaN(inicio)) return;
      var totalCuotas = c.totalCuotas || (c.plazo*2) || 24;
      var pagadas = c.pagado || 0;
      var cuotaV = parseFloat(c.cuotaQ||c.cuota||0)||0;
      if(cuotaV<=0) return;
      for(var k=pagadas+1; k<=totalCuotas; k++){
        var t = inicio + k*MS_QUINCENA;
        if(t > ahora + 30*MS_DIA) break;
        var dTs = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate()).getTime();
        var b = buckets.find(function(bk){ return bk.dayTs === dTs; });
        if(b){ b.monto += cuotaV; b.cuotas++; }
      }
    });
  } else if(periodo === 'quincenal'){
    subTxt = 'Próximas 8 quincenas';
    for(var i=0; i<8; i++){
      var tFut = ahora + i*MS_QUINCENA;
      var d = new Date(tFut);
      var q = d.getDate() <= 15 ? 1 : 2;
      buckets.push({ label: (d.getMonth()+1)+'/Q'+q, ini: tFut, fin: tFut+MS_QUINCENA, monto:0, cuotas:0 });
    }
    activos.forEach(function(c){
      var inicio = parseFechaLocal(c.fecha).getTime();
      if(isNaN(inicio)) return;
      var totalCuotas = c.totalCuotas || (c.plazo*2) || 24;
      var pagadas = c.pagado || 0;
      var cuotaV = parseFloat(c.cuotaQ||c.cuota||0)||0;
      if(cuotaV<=0) return;
      for(var k=pagadas+1; k<=totalCuotas; k++){
        var t = inicio + k*MS_QUINCENA;
        if(t > ahora + 8*MS_QUINCENA) break;
        for(var bi=0; bi<buckets.length; bi++){
          if(t >= buckets[bi].ini && t < buckets[bi].fin){ buckets[bi].monto += cuotaV; buckets[bi].cuotas++; break; }
        }
      }
    });
  } else {
    subTxt = 'Próximos 7 meses';
    for(var i=0; i<7; i++){
      var d = new Date(now.getFullYear(), now.getMonth()+i, 1);
      var nextD = new Date(now.getFullYear(), now.getMonth()+i+1, 1);
      buckets.push({ label: d.toLocaleDateString('es-VE',{month:'short'}), ini: d.getTime(), fin: nextD.getTime(), monto:0, cuotas:0 });
    }
    activos.forEach(function(c){
      var inicio = parseFechaLocal(c.fecha).getTime();
      if(isNaN(inicio)) return;
      var totalCuotas = c.totalCuotas || (c.plazo*2) || 24;
      var pagadas = c.pagado || 0;
      var cuotaV = parseFloat(c.cuotaQ||c.cuota||0)||0;
      if(cuotaV<=0) return;
      for(var k=pagadas+1; k<=totalCuotas; k++){
        var t = inicio + k*MS_QUINCENA;
        if(t > buckets[buckets.length-1].fin) break;
        for(var bi=0; bi<buckets.length; bi++){
          if(t >= buckets[bi].ini && t < buckets[bi].fin){ buckets[bi].monto += cuotaV; buckets[bi].cuotas++; break; }
        }
      }
    });
  }

  var sub = document.getElementById('cred-cobros-sub');
  if(sub) sub.textContent = subTxt;

  var labels = buckets.map(function(b){ return b.label; });
  var values = buckets.map(function(b){ return b.monto; });
  var counts = buckets.map(function(b){ return b.cuotas; });

  if(_credCobrosChart){ _credCobrosChart.destroy(); _credCobrosChart=null; }
  _credCobrosChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: labels, datasets: [{
      label: 'Cobros',
      data: values,
      backgroundColor: values.map(function(v,i){ return i===0 ? p1 : p1t; }),
      borderColor: 'transparent',
      borderWidth: 0, borderRadius: 6, borderSkipped: false
    }]},
    options: { responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:isDark?'#252844':'#fff',
        borderColor:isDark?'rgba(37,99,235,0.3)':'rgba(37,99,235,0.2)', borderWidth:1,
        titleColor:isDark?'#E8E6FF':'#0B0B1E', bodyColor:isDark?'#B0ADDB':'#4A4870', padding:10,
        callbacks:{ label:function(ctx){ var i=ctx.dataIndex; return [' '+fmt(ctx.raw),' '+counts[i]+' cuota'+(counts[i]!==1?'s':'')]; } } } },
      scales:{ x:{ grid:{display:false}, border:{display:false}, ticks:{color:ink3,font:{size:9}} },
        y:{ grid:{color:isDark?'rgba(37,99,235,0.08)':'rgba(37,99,235,0.06)'}, border:{display:false,dash:[4,4]},
          ticks:{color:ink3, font:{size:9}, callback:function(v){ return v>0?'$'+Math.round(v/1000)+'k':'$0'; }, maxTicksLimit:5} } } }
  });
}
// ── Cobros programados — DASHBOARD (reusa la lógica de buckets) ──
function _cobrosProgramadosBuckets(periodo){
  // Mismo criterio que la grafica de Creditos y que las tarjetas: activo + mora
  var activos = _concFiltrar(S.creds||[]).filter(function(c){ return !c.eliminado && (c.estado==='activo'||c.estado==='mora') && c.fecha; });
  var ahora = Date.now();
  var MS_DIA = 24*60*60*1000;
  var MS_QUINCENA = 15*MS_DIA;
  var now = new Date();
  var buckets = [];
  var subTxt = '';
  if(periodo === 'diario'){
    subTxt = 'Próximos 30 días';
    for(var i=0; i<30; i++){
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate()+i);
      buckets.push({ label: d.getDate()+'/'+(d.getMonth()+1), dayTs: new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(), monto:0, cuotas:0 });
    }
    activos.forEach(function(c){
      var inicio = parseFechaLocal(c.fecha).getTime();
      if(isNaN(inicio)) return;
      var totalCuotas = c.totalCuotas || (c.plazo*2) || 24;
      var pagadas = c.pagado || 0;
      var cuotaV = parseFloat(c.cuotaQ||c.cuota||0)||0;
      if(cuotaV<=0) return;
      for(var k=pagadas+1; k<=totalCuotas; k++){
        var t = inicio + k*MS_QUINCENA;
        if(t > ahora + 30*MS_DIA) break;
        var dTs = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate()).getTime();
        var b = buckets.find(function(bk){ return bk.dayTs === dTs; });
        if(b){ b.monto += cuotaV; b.cuotas++; }
      }
    });
  } else if(periodo === 'quincenal'){
    subTxt = 'Próximas 8 quincenas';
    for(var i=0; i<8; i++){
      var tFut = ahora + i*MS_QUINCENA;
      var d = new Date(tFut);
      var q = d.getDate() <= 15 ? 1 : 2;
      buckets.push({ label: (d.getMonth()+1)+'/Q'+q, ini: tFut, fin: tFut+MS_QUINCENA, monto:0, cuotas:0 });
    }
    activos.forEach(function(c){
      var inicio = parseFechaLocal(c.fecha).getTime();
      if(isNaN(inicio)) return;
      var totalCuotas = c.totalCuotas || (c.plazo*2) || 24;
      var pagadas = c.pagado || 0;
      var cuotaV = parseFloat(c.cuotaQ||c.cuota||0)||0;
      if(cuotaV<=0) return;
      for(var k=pagadas+1; k<=totalCuotas; k++){
        var t = inicio + k*MS_QUINCENA;
        if(t > ahora + 8*MS_QUINCENA) break;
        for(var bi=0; bi<buckets.length; bi++){
          if(t >= buckets[bi].ini && t < buckets[bi].fin){ buckets[bi].monto += cuotaV; buckets[bi].cuotas++; break; }
        }
      }
    });
  } else {
    subTxt = 'Próximos 7 meses';
    for(var i=0; i<7; i++){
      var d = new Date(now.getFullYear(), now.getMonth()+i, 1);
      var nextD = new Date(now.getFullYear(), now.getMonth()+i+1, 1);
      buckets.push({ label: d.toLocaleDateString('es-VE',{month:'short'}), ini: d.getTime(), fin: nextD.getTime(), monto:0, cuotas:0 });
    }
    activos.forEach(function(c){
      var inicio = parseFechaLocal(c.fecha).getTime();
      if(isNaN(inicio)) return;
      var totalCuotas = c.totalCuotas || (c.plazo*2) || 24;
      var pagadas = c.pagado || 0;
      var cuotaV = parseFloat(c.cuotaQ||c.cuota||0)||0;
      if(cuotaV<=0) return;
      for(var k=pagadas+1; k<=totalCuotas; k++){
        var t = inicio + k*MS_QUINCENA;
        if(t > buckets[buckets.length-1].fin) break;
        for(var bi=0; bi<buckets.length; bi++){
          if(t >= buckets[bi].ini && t < buckets[bi].fin){ buckets[bi].monto += cuotaV; buckets[bi].cuotas++; break; }
        }
      }
    });
  }
  return { buckets: buckets, subTxt: subTxt };
}

var _dashCobrospChart = null;
var _dashCobrospPeriodo = 'diario';
function setDashCobrospPeriodo(periodo){
  _dashCobrospPeriodo = periodo;
  ['d','q','m'].forEach(function(k){
    var p = k==='d'?'diario':k==='q'?'quincenal':'mensual';
    var btn = document.getElementById('dash-cobrosp-'+k);
    if(btn) btn.className = (p===periodo ? 'on' : '');
  });
  renderDashCobrospChart();
}
function renderDashCobrospChart(){
  var canvas = document.getElementById('dash-cobrosp-chart');
  if(!canvas || typeof Chart==='undefined') return;
  var periodo = _dashCobrospPeriodo || 'diario';
  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  var p1 = isDark ? '#3B82F6' : '#2563EB';
  var p1t = isDark ? 'rgba(59,130,246,0.18)' : 'rgba(37,99,235,0.12)';
  var ink3 = isDark ? '#6B6896' : '#9794BB';
  var r = _cobrosProgramadosBuckets(periodo);
  var buckets = r.buckets;
  var sub = document.getElementById('dash-cobrosp-sub'); if(sub) sub.textContent = r.subTxt;
  var labels = buckets.map(function(b){ return b.label; });
  var values = buckets.map(function(b){ return b.monto; });
  var counts = buckets.map(function(b){ return b.cuotas; });
  _dashResumen('cobrosp', values, periodo, true);
  if(_dashCobrospChart){ _dashCobrospChart.destroy(); _dashCobrospChart=null; }
  _dashCobrospChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: labels, datasets: [{
      label: 'Cobros',
      data: values,
      backgroundColor: _dashBarras(p1, isDark?'59,130,246':'37,99,235', true),
      borderColor: 'transparent',
      borderWidth: 0, borderRadius: 4, borderSkipped: false,
      barPercentage: 0.6, categoryPercentage: 0.82, maxBarThickness: 18
    }]},
    options: { responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
      plugins:{ legend:{display:false}, tooltip:{ backgroundColor:isDark?'#252844':'#fff',
        borderColor:isDark?'rgba(37,99,235,0.3)':'rgba(37,99,235,0.2)', borderWidth:1,
        titleColor:isDark?'#E8E6FF':'#0B0B1E', bodyColor:isDark?'#B0ADDB':'#4A4870', padding:10,
        callbacks:{ label:function(ctx){ var i=ctx.dataIndex; return [' '+fmt(ctx.raw),' '+counts[i]+' cuota'+(counts[i]!==1?'s':'')]; } } } },
      scales:{ x:{ grid:{display:false}, border:{display:false}, ticks:{color:ink3,font:{size:9}} },
        y:{ grid:{color:isDark?'rgba(37,99,235,0.08)':'rgba(37,99,235,0.06)'}, border:{display:false,dash:[4,4]},
          ticks:{color:ink3, font:{size:9}, callback: _dashTick, maxTicksLimit:5} } } }
  });
}
function renderDashChart(){
  var canvas = document.getElementById('dash-chart');
  if(!canvas || typeof Chart === 'undefined') return;
  var wrapper=canvas.parentElement; if(wrapper) wrapper.style.height='160px';
  var periodo = _dashPeriodo.ingresos || 'diario';
  var data = getDashData('ingresos', periodo);
  var labels = data.map(function(x){ return x.label; });
  var values = data.map(function(x){ return x.total; });
  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  var p1 = isDark ? '#3B82F6' : '#2563EB';
  var p1t = isDark ? 'rgba(124,111,240,0.18)' : 'rgba(37,99,235,0.12)';
  var ink3 = isDark ? '#6B6896' : '#9794BB';
  _dashSub('ing', periodo, data.length); _dashResumen('ing', values, periodo, true);
  if(_dashChart){ _dashChart.destroy(); _dashChart=null; }
  _dashChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Ingresos', data: values,
      backgroundColor: _dashBarras(p1, isDark?'59,130,246':'37,99,235'),
      borderColor: values.map(function(v,i){ return i===values.length-1 ? p1 : 'transparent'; }),
      borderWidth: 0, borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: isDark?'#252844':'#fff',
        borderColor: isDark?'rgba(37,99,235,0.3)':'rgba(37,99,235,0.2)', borderWidth: 1,
        titleColor: isDark?'#E8E6FF':'#0B0B1E', bodyColor: isDark?'#B0ADDB':'#4A4870', padding: 10,
        callbacks: { label: function(ctx){ return ' $' + (ctx.raw||0).toLocaleString('es-VE',{minimumFractionDigits:0,maximumFractionDigits:0}); } } } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: ink3, font: { size: 9 } } },
        y: { grid: { color: isDark?'rgba(37,99,235,0.08)':'rgba(37,99,235,0.06)', drawBorder: false },
          border: { display: false, dash: [4,4] },
          ticks: { color: ink3, font: { size: 9 }, callback: _dashTick, maxTicksLimit: 5 } } } }
  });
}

var _dashEgrChart = null;
function renderDashEgrChart(){
  var canvas = document.getElementById('dash-egr-chart');
  if(!canvas || typeof Chart === 'undefined') return;
  var wrapper = canvas.parentElement; if(wrapper) wrapper.style.height='160px';
  var periodo = _dashPeriodo.egresos || 'diario';
  var data = getDashData('egresos', periodo);
  // UNA barra: todo el dinero que sale, SIN la inicial del cliente (Adam,
  // 17-sep-2026: "los gastos operativos siempre estan en cero porque no los
  // cargan... quiero el dinero que sale sin las iniciales"). El globito avisa
  // cuanto de inicial se aparto.
  var labels = data.map(function(x){ return x.label; });
  var values = data.map(function(x){ return (x.gastos||0) + (x.motos||0); });
  var inis   = data.map(function(x){ return x.iniciales||0; });
  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  var red  = isDark ? '#ff5577' : '#D93B5A';
  var redt = isDark ? 'rgba(255,85,119,0.18)' : 'rgba(217,59,90,0.12)';
  var ink3 = isDark ? '#6B6896' : '#9794BB';
  _dashSub('egr', periodo, data.length, ' · sin iniciales'); _dashResumen('egr', values, periodo, true);
  var _d = function(v){ return '$' + Math.round(v||0).toLocaleString('es-VE'); };
  if(_dashEgrChart){ _dashEgrChart.destroy(); _dashEgrChart=null; }
  _dashEgrChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Egresos', data: values,
      backgroundColor: _dashBarras(red, isDark?'255,85,119':'217,59,90'),
      borderColor: 'transparent', borderWidth: 0, borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: isDark?'#252844':'#fff',
        borderColor: isDark?'rgba(217,59,90,0.3)':'rgba(217,59,90,0.2)', borderWidth: 1,
        titleColor: isDark?'#E8E6FF':'#0B0B1E', bodyColor: isDark?'#B0ADDB':'#4A4870', footerColor: ink3, padding: 10,
        callbacks: {
          label: function(ctx){ return ' ' + _d(ctx.raw); },
          footer: function(items){
            if(!items || !items.length) return '';
            var i = items[0].dataIndex;
            return inis[i] > 0 ? 'No incluye ' + _d(inis[i]) + ' de iniciales' : '';
          }
        } } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: ink3, font: { size: 9 } } },
        y: { grid: { color: isDark?'rgba(217,59,90,0.08)':'rgba(217,59,90,0.06)', drawBorder: false },
          border: { display: false, dash: [4,4] },
          ticks: { color: ink3, font: { size: 9 }, callback: _dashTick, maxTicksLimit: 5 } } } }
  });
}

// ══════════════════════════════════════════
// CHART.JS — DASHBOARD CUOTAS COBRADAS
// ══════════════════════════════════════════
var _dashCuotasChart = null;
function renderDashCuotasChart(){
  var canvas = document.getElementById('dash-cuo-chart');
  if(!canvas || typeof Chart === 'undefined') return;
  var wrapper = canvas.parentElement; if(wrapper) wrapper.style.height='160px';
  var periodo = _dashPeriodo.cuotas || 'diario';
  var data = getDashData('cuotas', periodo);
  var labels = data.map(function(x){ return x.label; });
  var counts = data.map(function(x){ return x.count; });
  var montos = data.map(function(x){ return x.total; });
  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  var tl  = isDark ? '#2DD4BF' : '#14B8A6';
  var tlt = isDark ? 'rgba(45,212,191,0.18)' : 'rgba(20,184,166,0.12)';
  var ink3 = isDark ? '#6B6896' : '#9794BB';
  _dashSub('cuo', periodo, data.length); _dashResumen('cuo', montos, periodo, true);
  if(_dashCuotasChart){ _dashCuotasChart.destroy(); _dashCuotasChart=null; }
  _dashCuotasChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: labels, datasets: [{ label: 'Cuotas cobradas', data: montos,
      backgroundColor: _dashBarras(tl, isDark?'45,212,191':'20,184,166'),
      borderColor: 'transparent', borderWidth: 0, borderRadius: 6, borderSkipped: false }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: isDark?'#252844':'#fff',
        borderColor: isDark?'rgba(20,184,166,0.3)':'rgba(20,184,166,0.2)', borderWidth: 1,
        titleColor: isDark?'#E8E6FF':'#0B0B1E', bodyColor: isDark?'#B0ADDB':'#4A4870', padding: 10,
        callbacks: { label: function(ctx){ var i=ctx.dataIndex; var m=montos[i]||0; var n=counts[i]||0; return [' $'+m.toLocaleString('es-VE',{minimumFractionDigits:0,maximumFractionDigits:0})+' cobrado', ' '+n+' cuota'+(n!==1?'s':'')+' cobrada'+(n!==1?'s':'')]; } } } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: ink3, font: { size: 9 } } },
        y: { grid: { color: isDark?'rgba(20,184,166,0.08)':'rgba(20,184,166,0.06)', drawBorder: false },
          border: { display: false, dash: [4,4] },
          ticks: { color: ink3, font: { size: 9 }, callback: _dashTick, maxTicksLimit: 5 } } } }
  });
}

// ══════════════════════════════════════════
// CHARTS DE CONTABILIDAD (Pro)
// ══════════════════════════════════════════
var _contaCharts = {trend:null, cat:null, cumul:null, proj:null, aging:null, metodos:null};
// ══════════════════════════════════════════
// CHARTS DE CRÉDITOS (Pro)
// ══════════════════════════════════════════
var _credsCharts = {estados:null, semanas:null, spread:null, aging:null};
function renderCredsCharts(){
  if(typeof Chart === 'undefined' || !window._credsData) return;
  var data = window._credsData;
  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  var p1 = isDark ? '#3B82F6' : '#2563EB';
  var p1t = isDark ? 'rgba(124,111,240,0.15)' : 'rgba(37,99,235,0.12)';
  var green= isDark ? '#1fc47a' : '#06b06a';
  var red = isDark ? '#ff5577' : '#d93b5a';
  var amber= isDark ? '#ffb93b' : '#f4b42c';
  var ink3 = isDark ? '#6B6896' : '#9794BB';
  var grid = isDark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.06)';
  var surf = isDark ? '#1E2038' : '#fff';
  var gridGreen = isDark ? 'rgba(31,196,122,0.12)' : 'rgba(6,176,106,0.10)';
  var gridAmber = isDark ? 'rgba(255,185,59,0.15)' : 'rgba(244,180,44,0.12)';

  // ── 1) Distribución por estado (donut) ──
  var c1 = document.getElementById('creds-chart-estados');
  if(c1 && data.estados){
    if(_credsCharts.estados){ _credsCharts.estados.destroy(); _credsCharts.estados=null; }
    var e = data.estados;
    var labels = ['Al día','Mora','Completados','Recuperados','Cancelados'];
    var values = [e.activos||0, e.mora||0, e.completados||0, e.recuperados||0, e.cancelados||0];
    var colors = [p1, red, green, amber, ink3];
    // Filtrar los que tienen 0 para que el donut se vea limpio
    var filt = [];
    for(var i=0;i<labels.length;i++){ if(values[i]>0) filt.push({l:labels[i], v:values[i], c:colors[i]}); }
    if(filt.length){
      _credsCharts.estados = new Chart(c1, {
        type:'doughnut',
        data:{
          labels: filt.map(function(x){return x.l;}),
          datasets:[{
            data: filt.map(function(x){return x.v;}),
            backgroundColor: filt.map(function(x){return x.c;}),
            borderColor: surf, borderWidth:2, hoverOffset:6
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false, cutout:'62%',
          plugins:{
            legend:{display:false},
            tooltip:{
              backgroundColor: surf, borderColor:'rgba(37,99,235,0.2)', borderWidth:1,
              titleColor: isDark?'#E8E6FF':'#0B0B1E', bodyColor: isDark?'#B0ADDB':'#4A4870',
              padding:8,
              callbacks:{ label:function(ctx){ return ' '+ctx.label+': '+ctx.raw+' crédito'+(ctx.raw===1?'':'s'); } }
            }
          }
        }
      });
    }
  }

  // ── 2) Cobros programados próximas 4 semanas (bar) ──
  var c2 = document.getElementById('creds-chart-semanas');
  if(c2 && data.semanas){
    if(_credsCharts.semanas){ _credsCharts.semanas.destroy(); _credsCharts.semanas=null; }
    _credsCharts.semanas = new Chart(c2, {
      type:'bar',
      data:{
        labels: data.semanas.map(function(s){ return s.label; }),
        datasets:[{
          label:'Cobros programados',
          data: data.semanas.map(function(s){ return s.monto; }),
          backgroundColor: data.semanas.map(function(s,i){
            var alpha = 1 - (i*0.12);
            return isDark ? 'rgba(124,111,240,'+Math.max(0.45,alpha)+')' : 'rgba(37,99,235,'+Math.max(0.5,alpha)+')';
          }),
          borderColor: p1, borderWidth:1.5,
          borderRadius:8, borderSkipped:false
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor: surf, borderColor:'rgba(37,99,235,0.2)', borderWidth:1,
            titleColor: isDark?'#E8E6FF':'#0B0B1E', bodyColor: isDark?'#B0ADDB':'#4A4870',
            padding:10,
            callbacks:{
              label:function(ctx){ return ' Monto: $'+Math.round(ctx.raw).toLocaleString(); },
              afterLabel:function(ctx){
                var cuotas = data.semanas[ctx.dataIndex].cuotas;
                return ' '+cuotas+' cuota'+(cuotas===1?'':'s');
              }
            }
          }
        },
        scales:{
          x:{ grid:{display:false}, border:{display:false},
              ticks:{color:ink3, font:{size:11, weight:'600'}} },
          y:{ grid:{color:grid, drawBorder:false}, border:{display:false},
              ticks:{color:ink3, font:{size:10},
                callback:function(v){ return v===0?'$0':(Math.abs(v)>=1000?'$'+Math.round(v/1000)+'k':'$'+v); },
                maxTicksLimit:5} }
        }
      }
    });
  }

  // ── 3) Capital vs Intereses (donut) ──
  var c3 = document.getElementById('creds-chart-spread');
  if(c3){
    if(_credsCharts.spread){ _credsCharts.spread.destroy(); _credsCharts.spread=null; }
    var capital = data.precioBaseTotal||0;
    var spread = data.spreadTotal||0;
    if(capital>0 || spread>0){
      _credsCharts.spread = new Chart(c3, {
        type:'doughnut',
        data:{
          labels: ['Capital','Intereses'],
          datasets:[{
            data: [capital, spread],
            backgroundColor: [p1, amber],
            borderColor: surf, borderWidth:2, hoverOffset:6
          }]
        },
        options:{
          responsive:true, maintainAspectRatio:false, cutout:'65%',
          plugins:{
            legend:{display:false},
            tooltip:{
              backgroundColor: surf, borderColor:'rgba(37,99,235,0.2)', borderWidth:1,
              titleColor: isDark?'#E8E6FF':'#0B0B1E', bodyColor: isDark?'#B0ADDB':'#4A4870',
              padding:8,
              callbacks:{ label:function(ctx){ return ' '+ctx.label+': $'+Math.round(ctx.raw).toLocaleString(); } }
            }
          }
        }
      });
    }
  }

  // ── 4) Antigüedad de cartera (bar) ──
  var c4 = document.getElementById('creds-chart-aging');
  if(c4 && data.agingMeses){
    if(_credsCharts.aging){ _credsCharts.aging.destroy(); _credsCharts.aging=null; }
    var a = data.agingMeses;
    var aLabels = ['<3m','3-6m','6-12m','>12m'];
    var aVals = [a['<3m']||0, a['3-6m']||0, a['6-12m']||0, a['>12m']||0];
    _credsCharts.aging = new Chart(c4, {
      type:'bar',
      data:{
        labels: aLabels,
        datasets:[{
          data: aVals,
          backgroundColor: [gridGreen, p1t, gridAmber, gridAmber],
          borderColor: [green, p1, amber, amber], borderWidth:1.5,
          borderRadius:6, borderSkipped:false
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor: surf, borderColor:'rgba(37,99,235,0.2)', borderWidth:1,
            titleColor: isDark?'#E8E6FF':'#0B0B1E', bodyColor: isDark?'#B0ADDB':'#4A4870',
            padding:8,
            callbacks:{ label:function(ctx){ return ' '+ctx.raw+' crédito'+(ctx.raw===1?'':'s'); } }
          }
        },
        scales:{
          x:{ grid:{display:false}, border:{display:false},
              ticks:{color:ink3, font:{size:10.5, weight:'600'}} },
          y:{ grid:{color:grid, drawBorder:false}, border:{display:false},
              ticks:{color:ink3, font:{size:10}, precision:0, maxTicksLimit:5} }
        }
      }
    });
  }
}
// ══════════════════════════════════════════
// SKELETON LOADERS
// ══════════════════════════════════════════
