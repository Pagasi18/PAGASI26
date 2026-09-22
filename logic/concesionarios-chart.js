// Chart del modulo de Concesionarios: como va cada sede en el tiempo.
// Pedido de Adam el 8-sep-2026, mejorado el mismo dia.
//
// La primera version solo apilaba barras. Mostraba QUE paso, pero no si la
// cosa va bien: no habia total, ni promedio, ni comparacion con el periodo
// anterior, ni forma de aislar una sede. Ahora arriba van cuatro numeros que
// contestan eso de un vistazo, la leyenda dice cuanto subio o bajo cada sede,
// y se puede hacer clic para ver una sola.
//
// Se alimenta de S.creds (fecha + concesionarioId), que es dato real. NO usa
// los anticipos. Solo LEE y pinta: no toca ningun calculo del modulo.

var _concChart = null;
var _concChartPeriodo = 'mes';    // dia · mes · ano
var _concChartModo = 'motos';     // motos · monto · parte  (parte = participacion %)
var _concChartOculta = {};        // sedes apagadas desde la leyenda

var _CONC_COLORES = ['#2563EB','#7C6DFF','#06B06A','#F59E0B','#EF4444','#0EA5E9',
                     '#8B5CF6','#14B8A6','#F97316','#EC4899','#64748B'];

// n buckets hacia atras desde hoy. desplazado=1 devuelve el periodo ANTERIOR,
// que es contra lo que se compara.
function _concChartBuckets(periodo, desplazado){
  var hoy = new Date(), b = [], d = desplazado || 0;
  if(periodo === 'dia'){
    for(var i=29; i>=0; i--){
      var f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()-i-(d*30));
      b.push({ clave: f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0')+'-'+String(f.getDate()).padStart(2,'0'),
               label: f.getDate()+'/'+(f.getMonth()+1), domingo: f.getDay()===0 });
    }
  } else if(periodo === 'ano'){
    for(var a=4; a>=0; a--) { var y = hoy.getFullYear()-a-(d*5); b.push({ clave:String(y), label:String(y) }); }
  } else {
    var M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    for(var k=11; k>=0; k--){
      var m = new Date(hoy.getFullYear(), hoy.getMonth()-k-(d*12), 1);
      b.push({ clave: m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0'),
               label: M[m.getMonth()]+' '+String(m.getFullYear()).slice(-2) });
    }
  }
  return b;
}

function _concChartCorte(periodo){ return periodo==='dia' ? 10 : (periodo==='ano' ? 4 : 7); }

function _concChartValor(c){
  return (_concChartModo === 'motos' || _concChartModo === 'parte')
    ? 1 : (parseFloat(c.precioBaseReal||c.precio)||0);
}

// Suma por sede y por bucket. desplazado=1 = periodo anterior.
function _concChartSumar(buckets, corte){
  var idx = {}; buckets.forEach(function(b,i){ idx[b.clave] = i; });
  var por = {}, tot = {};
  (S.creds||[]).forEach(function(c){
    if(!c || c.eliminado || c.estado==='cancelado' || c.estado==='rechazado') return;
    var f = String(c.fecha||''); if(f.length < 7) return;
    var i = idx[f.slice(0, corte)]; if(i === undefined) return;
    var sid = c.concesionarioId; if(!sid) return;
    if(!por[sid]) { por[sid] = buckets.map(function(){ return 0; }); tot[sid] = 0; }
    var v = _concChartValor(c);
    por[sid][i] += v; tot[sid] += v;
  });
  return { por: por, tot: tot };
}

function _concChartDatos(){
  var periodo = _concChartPeriodo, corte = _concChartCorte(periodo);
  var buckets = _concChartBuckets(periodo);
  var ahora = _concChartSumar(buckets, corte);
  var antes = _concChartSumar(_concChartBuckets(periodo, 1), corte);

  var vivas = (S.concesionarios||[]).filter(function(c){ return c && !c.eliminado; });
  var sedes = vivas.filter(function(s){ return (ahora.tot[s.id]||0) > 0; })
                   .sort(function(a,b){ return (ahora.tot[b.id]||0) - (ahora.tot[a.id]||0); });

  var series = {};
  sedes.forEach(function(s){ series[s.id] = ahora.por[s.id] || buckets.map(function(){ return 0; }); });

  var total = sedes.reduce(function(s,x){ return s + (ahora.tot[x.id]||0); }, 0);
  var totalAntes = vivas.reduce(function(s,x){ return s + (antes.tot[x.id]||0); }, 0);

  // Por bucket, para el promedio y el mejor
  var porBucket = buckets.map(function(_, i){
    return sedes.reduce(function(s,x){ return s + (series[x.id][i]||0); }, 0);
  });
  // El promedio se calcula sobre los buckets con movimiento: en "dias" hay
  // domingos y feriados en cero que hundirian el numero sin decir nada.
  var conMov = porBucket.filter(function(v){ return v > 0; });
  var promedio = conMov.length ? total / conMov.length : 0;
  var mejorI = porBucket.reduce(function(bi, v, i, a){ return v > a[bi] ? i : bi; }, 0);

  return {
    buckets: buckets, sedes: sedes, series: series, totales: ahora.tot, totalesAntes: antes.tot,
    total: total, totalAntes: totalAntes, promedio: promedio, porBucket: porBucket,
    mejor: { label: buckets[mejorI] ? buckets[mejorI].label : '—', valor: porBucket[mejorI] || 0 },
    activos: conMov.length
  };
}

// ── Formato ──
function _concChartFmt(v, modo){
  var m = modo || _concChartModo;
  if(m === 'monto') return '$' + Math.round(v||0).toLocaleString('es-VE');
  if(m === 'parte') return (v||0).toFixed(1) + '%';
  var n = Math.round((v||0) * 10) / 10;
  return n + ' moto' + (n === 1 ? '' : 's');
}
function _concChartDelta(hoy, antes){
  if(!antes) return hoy ? {txt:'nuevo', col:'var(--green)'} : {txt:'—', col:'var(--ink3)'};
  var p = Math.round(((hoy - antes) / antes) * 100);
  if(p === 0) return {txt:'igual', col:'var(--ink3)'};
  return { txt: (p>0?'▲ ':'▼ ') + Math.abs(p) + '%', col: p>0 ? 'var(--green)' : 'var(--red)' };
}

function _concChartHtml(){
  var D = _concChartDatos();
  var esParte = (_concChartModo === 'parte');
  var btn = function(v, txt, actual, fn){
    return '<button class="btn '+(v===actual?'btn-p':'btn-g')+' btn-xs" onclick="'+fn+'(\''+v+'\')">'+txt+'</button>';
  };
  var sub = ({dia:'Últimos 30 días', mes:'Últimos 12 meses', ano:'Últimos 5 años'})[_concChartPeriodo];
  var unidad = ({dia:'día', mes:'mes', ano:'año'})[_concChartPeriodo];
  // "mes" no pluraliza con una s: seria "mess"
  var unidades = ({dia:'días', mes:'meses', ano:'años'})[_concChartPeriodo];
  var d = _concChartDelta(D.total, D.totalAntes);
  var comparado = ({dia:'30 días previos', mes:'12 meses previos', ano:'5 años previos'})[_concChartPeriodo];

  var kpi = function(valor, etiqueta, extra){
    return '<div style="flex:1;min-width:120px;padding:11px 14px;background:var(--surf2);border:1px solid var(--rim2);border-radius:9px">'
      + '<div style="font-family:var(--fd);font-weight:900;font-size:20px;line-height:1.1">'+valor+'</div>'
      + '<div style="font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px;margin-top:3px">'+etiqueta+'</div>'
      + (extra||'') + '</div>';
  };

  var html = '<div class="card" style="margin-bottom:14px">'
    + '<div class="ch">'
    +   '<div><div class="ct">Motos por concesionario</div>'
    +   '<div class="cs">'+sub+' · '+D.sedes.length+' sede'+(D.sedes.length!==1?'s':'')+' con movimiento</div></div>'
    +   '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
    +     '<div style="display:flex;gap:4px">'
    +       btn('motos','Motos',_concChartModo,'_concChartSetModo')
    +       btn('monto','Monto',_concChartModo,'_concChartSetModo')
    +       btn('parte','Participación',_concChartModo,'_concChartSetModo')
    +     '</div>'
    +     '<div style="width:1px;height:20px;background:var(--rim2)"></div>'
    +     '<div style="display:flex;gap:4px">'
    +       btn('dia','Días',_concChartPeriodo,'_concChartSetPeriodo')
    +       btn('mes','Meses',_concChartPeriodo,'_concChartSetPeriodo')
    +       btn('ano','Años',_concChartPeriodo,'_concChartSetPeriodo')
    +     '</div>'
    +   '</div>'
    + '</div>';

  // Los cuatro numeros que contestan "¿vamos bien?"
  if(!esParte){
    html += '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'
      + kpi(_concChartFmt(D.total), 'Total del período',
            '<div style="font-size:10.5px;font-weight:800;color:'+d.col+';margin-top:4px">'+d.txt
            + '<span style="color:var(--ink3);font-weight:600"> vs '+comparado+'</span></div>')
      + kpi(_concChartFmt(D.promedio), 'Promedio por '+unidad,
            '<div style="font-size:10.5px;color:var(--ink3);margin-top:4px">'+D.activos+' '+(D.activos===1?unidad:unidades)+' con ventas</div>')
      + kpi(_concChartFmt(D.mejor.valor), 'Mejor '+unidad,
            '<div style="font-size:10.5px;color:var(--ink3);margin-top:4px">'+D.mejor.label+'</div>')
      + kpi(D.sedes.length ? (D.sedes[0].nombre||D.sedes[0].id) : '—', 'Sede que más vende',
            D.sedes.length ? '<div style="font-size:10.5px;color:var(--ink3);margin-top:4px">'
              + _concChartFmt(D.totales[D.sedes[0].id]) + ' · '
              + Math.round((D.totales[D.sedes[0].id]/(D.total||1))*100) + '% del total</div>' : '')
      + '</div>';
  }

  html += '<div style="height:240px;margin-top:14px"><canvas id="conc-chart"></canvas></div>'
    + '<div id="conc-chart-leyenda" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px"></div>'
    + (Object.keys(_concChartOculta).length
        ? '<div style="margin-top:8px"><button class="btn btn-g btn-xs" onclick="_concChartVerTodas()">Ver todas las sedes</button></div>' : '')
    + '</div>';
  return html;
}

function _concChartSetPeriodo(p){ _concChartPeriodo = p; if(typeof nav==='function') nav('concesionarios'); }
function _concChartSetModo(m){ _concChartModo = m; if(typeof nav==='function') nav('concesionarios'); }
function _concChartToggleSede(id){
  if(_concChartOculta[id]) delete _concChartOculta[id]; else _concChartOculta[id] = true;
  if(typeof nav==='function') nav('concesionarios');
}
function _concChartVerTodas(){ _concChartOculta = {}; if(typeof nav==='function') nav('concesionarios'); }

function _concChartPintar(){
  var canvas = document.getElementById('conc-chart');
  if(!canvas || typeof Chart === 'undefined') return;
  var D = _concChartDatos();
  var esParte = (_concChartModo === 'parte');
  var oscuro = document.documentElement.getAttribute('data-theme') === 'dark';
  var ink3 = oscuro ? '#6B6896' : '#9794BB';

  var visibles = D.sedes.filter(function(s){ return !_concChartOculta[s.id]; });
  var color = {};
  D.sedes.forEach(function(s,i){ color[s.id] = _CONC_COLORES[i % _CONC_COLORES.length]; });

  // En "participacion" cada columna se lleva a 100 %
  var series = {};
  visibles.forEach(function(s){ series[s.id] = D.series[s.id].slice(); });
  if(esParte){
    D.buckets.forEach(function(_, i){
      var t = visibles.reduce(function(a,s){ return a + D.series[s.id][i]; }, 0);
      visibles.forEach(function(s){ series[s.id][i] = t ? (D.series[s.id][i]/t)*100 : 0; });
    });
  }

  var datasets = visibles.map(function(s){
    return { label: s.nombre || s.id, data: series[s.id], backgroundColor: color[s.id],
             borderWidth: 0, borderRadius: 3, borderSkipped: false, order: 2 };
  });

  // Linea de promedio: la referencia que dice si un dia fue bueno o malo
  if(!esParte && D.promedio > 0 && !Object.keys(_concChartOculta).length){
    datasets.push({ type:'line', label:'Promedio', data: D.buckets.map(function(){ return D.promedio; }),
      borderColor: oscuro ? 'rgba(232,230,255,.45)' : 'rgba(11,11,30,.32)', borderWidth: 1.5,
      borderDash: [5,4], pointRadius: 0, fill: false, order: 1, tension: 0 });
  }

  if(_concChart){ _concChart.destroy(); _concChart = null; }
  _concChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: D.buckets.map(function(b){ return b.label; }), datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: oscuro ? '#252844' : '#fff',
          borderColor: oscuro ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.2)', borderWidth: 1,
          titleColor: oscuro ? '#E8E6FF' : '#0B0B1E', bodyColor: oscuro ? '#B0ADDB' : '#4A4870',
          padding: 10, itemSort: function(a,b){ return b.raw - a.raw; },
          callbacks: {
            label: function(ctx){
              if(ctx.dataset.type === 'line') return ' Promedio: ' + _concChartFmt(ctx.raw);
              return ctx.raw ? ' ' + ctx.dataset.label + ': ' + _concChartFmt(ctx.raw) : null;
            },
            footer: function(items){
              if(esParte) return '';
              var t = items.filter(function(x){ return x.dataset.type !== 'line'; })
                           .reduce(function(s,x){ return s + (x.raw||0); }, 0);
              return t ? 'Total: ' + _concChartFmt(t) : '';
            }
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { display: false }, border: { display: false },
             ticks: { color: ink3, font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 15 } },
        y: { stacked: true, max: esParte ? 100 : undefined,
             grid: { color: oscuro ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.06)' },
             border: { display: false, dash: [4,4] },
             ticks: { color: ink3, font: { size: 9 }, maxTicksLimit: 5,
                      precision: (_concChartModo==='motos') ? 0 : undefined,
                      callback: function(v){
                        if(esParte) return v + '%';
                        if(_concChartModo === 'monto') return v >= 1000 ? '$'+Math.round(v/1000)+'k' : '$'+v;
                        return v;
                      } } }
      }
    }
  });

  // Leyenda: clic para aislar, y cuanto subio o bajo cada sede
  var ley = document.getElementById('conc-chart-leyenda');
  if(ley){
    ley.innerHTML = D.sedes.map(function(s){
      var off = !!_concChartOculta[s.id];
      var tot = D.totales[s.id] || 0;
      var dd = _concChartDelta(tot, D.totalesAntes[s.id] || 0);
      var pct = D.total ? Math.round((tot/D.total)*100) : 0;
      return '<button onclick="_concChartToggleSede(\''+s.id+'\')" title="'+(off?'Mostrar':'Ocultar')+' esta sede"'
        + ' style="display:inline-flex;align-items:center;gap:7px;padding:5px 10px;border-radius:7px;cursor:pointer;'
        + 'background:'+(off?'transparent':'var(--surf2)')+';border:1px solid var(--rim2);'
        + 'font-size:11px;color:var(--ink2);opacity:'+(off?'.45':'1')+';font-family:inherit">'
        + '<span style="width:9px;height:9px;border-radius:2px;background:'+color[s.id]+';flex-shrink:0"></span>'
        + '<span>'+(s.nombre||s.id)+'</span>'
        + '<b style="color:var(--ink)">'+_concChartFmt(tot)+'</b>'
        + '<span style="color:var(--ink3)">'+pct+'%</span>'
        + '<span style="color:'+dd.col+';font-weight:800">'+dd.txt+'</span>'
        + '</button>';
    }).join('') || '<span style="font-size:11px;color:var(--ink3)">Sin movimiento en este período.</span>';
  }
}
