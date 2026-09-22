// ══════════════════════════════════════════════════════════════
// PROYECCIÓN FIN DE AÑO — Análisis estratégico ejecutivo
// Calcula ritmo histórico y proyecta cierre 2026 con revenue/gastos
// ══════════════════════════════════════════════════════════════

PG.proyeccion = function(){

  setTimeout(function(){ proyRender(); }, 60);

  return `<style>
    .proy-page{background:#FAFAFB;min-height:calc(100vh - 100px);padding-bottom:60px}
    .proy-wrap{max-width:1200px;margin:0 auto}

    /* Print: hide nav, etc. */
    @media print {
      body * { visibility: hidden; }
      .proy-print-area, .proy-print-area * { visibility: visible; }
      .proy-print-area { position:absolute; left:0; top:0; width:100%; background:#fff; }
      .proy-no-print { display:none !important; }
      .proy-card { break-inside: avoid; box-shadow:none !important; border:1px solid #E5E8F0 !important; }
      @page { margin: 14mm; size: A4; }
    }

    .proy-hero{
      background:linear-gradient(135deg,#1D4ED8 0%,#1E40AF 60%,#1E3A8A 100%);
      color:#fff;border-radius:20px;padding:32px 36px;margin-bottom:24px;position:relative;overflow:hidden;
    }
    .proy-hero::before{content:'';position:absolute;top:-100px;right:-80px;width:300px;height:300px;background:radial-gradient(circle,rgba(255,255,255,.12),transparent 70%);pointer-events:none}
    .proy-hero::after{content:'';position:absolute;bottom:-100px;left:-60px;width:240px;height:240px;background:radial-gradient(circle,rgba(255,255,255,.06),transparent 70%);pointer-events:none}
    .proy-hero-tag{display:inline-block;font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;background:rgba(255,255,255,.15);padding:5px 12px;border-radius:50px;color:#fff;backdrop-filter:blur(8px);position:relative;z-index:1}
    .proy-hero-title{font-size:38px;font-weight:900;letter-spacing:-1.5px;margin:14px 0 8px;position:relative;z-index:1;line-height:1.05}
    .proy-hero-sub{font-size:15px;font-weight:500;color:rgba(255,255,255,.85);max-width:660px;position:relative;z-index:1;line-height:1.5}
    .proy-hero-meta{display:flex;gap:24px;margin-top:18px;flex-wrap:wrap;position:relative;z-index:1}
    .proy-hero-meta-it{display:flex;flex-direction:column;gap:2px}
    .proy-hero-meta-l{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.65)}
    .proy-hero-meta-v{font-size:14px;font-weight:800;color:#fff;letter-spacing:-.2px}

    .proy-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
    @media(max-width:900px){.proy-kpis{grid-template-columns:repeat(2,1fr)}}
    .proy-kpi{background:#fff;border:1px solid #E5E8F0;border-radius:16px;padding:18px 20px;position:relative;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.04)}
    .proy-kpi-l{font-size:10px;font-weight:900;color:#94A3B8;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px}
    .proy-kpi-v{font-family:var(--fd);font-size:32px;font-weight:900;color:#0F172A;letter-spacing:-1.2px;line-height:1}
    .proy-kpi-v small{font-size:14px;color:#64748B;font-weight:700;margin-left:4px;font-family:var(--f);letter-spacing:0}
    .proy-kpi-sub{font-size:11px;color:#64748B;font-weight:600;margin-top:6px}
    .proy-kpi-trend{display:inline-flex;align-items:center;gap:4px;background:#D1FAE5;color:#047857;font-size:11px;font-weight:800;padding:3px 8px;border-radius:50px;margin-top:6px;letter-spacing:.04em}
    .proy-kpi-trend.warn{background:#FEF3C7;color:#A16207}
    .proy-kpi-trend.danger{background:#FEE2E2;color:#991B1B}
    .proy-kpi-trend svg{width:11px;height:11px}

    .proy-card{background:#fff;border:1px solid #E5E8F0;border-radius:18px;padding:24px 28px;margin-bottom:18px;box-shadow:0 1px 3px rgba(15,23,42,.04)}
    .proy-card-title{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:900;color:#0F172A;letter-spacing:.16em;text-transform:uppercase;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #F1F3F7}
    .proy-card-title-bar{width:4px;height:18px;background:linear-gradient(180deg,#1D4ED8,#3B82F6);border-radius:3px}
    .proy-card-title-ic{width:26px;height:26px;border-radius:8px;background:#EFF6FF;color:#1D4ED8;display:inline-flex;align-items:center;justify-content:center}
    .proy-card-title-ic svg{width:14px;height:14px}

    /* Tabla de proyección mensual */
    .proy-table{width:100%;border-collapse:collapse;font-size:12.5px}
    .proy-table th{text-align:left;padding:10px 12px;font-size:10.5px;font-weight:900;color:#94A3B8;letter-spacing:.14em;text-transform:uppercase;border-bottom:1px solid #E5E8F0;background:#FAFBFE}
    .proy-table th.right{text-align:right}
    .proy-table td{padding:11px 12px;border-bottom:1px solid #F1F3F7;font-weight:600;color:#1f2937}
    .proy-table td.right{text-align:right;font-family:var(--fd);font-weight:800;letter-spacing:-.3px}
    .proy-table tr.is-current{background:#FFFBEB}
    .proy-table tr.is-current td{color:#0F172A;font-weight:900}
    .proy-table tr.is-future td{color:#1D4ED8}
    .proy-table tr.is-future .proy-pill{background:#DBEAFE;color:#1D4ED8}
    .proy-table tr.is-eoy{background:linear-gradient(135deg,#D1FAE5,#A7F3D0);font-weight:900}
    .proy-table tr.is-eoy td{color:#064E3B;font-weight:900}
    .proy-pill{display:inline-block;font-size:10px;font-weight:900;padding:3px 8px;border-radius:50px;letter-spacing:.06em;text-transform:uppercase;background:#E5E8F0;color:#64748B}

    /* Resumen P&L */
    .proy-pl{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:6px}
    @media(max-width:900px){.proy-pl{grid-template-columns:1fr}}
    .proy-pl-box{background:#FAFBFE;border:1px solid #E5E8F0;border-radius:14px;padding:18px 20px}
    .proy-pl-box.rev{background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-color:#A7F3D0}
    .proy-pl-box.cost{background:linear-gradient(135deg,#FEF3C7,#FDE68A);border-color:#FCD34D}
    .proy-pl-box.net{background:linear-gradient(135deg,#DBEAFE,#BFDBFE);border-color:#93C5FD}
    .proy-pl-l{font-size:10.5px;font-weight:900;color:#475569;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px}
    .proy-pl-v{font-family:var(--fd);font-size:30px;font-weight:900;color:#0F172A;letter-spacing:-1px;line-height:1}
    .proy-pl-v small{font-size:13px;color:#64748B;font-weight:700;margin-left:3px;font-family:var(--f);letter-spacing:0}
    .proy-pl-sub{font-size:11.5px;color:#475569;font-weight:600;margin-top:8px;line-height:1.4}

    /* Assumptions panel */
    .proy-assum{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px}
    @media(max-width:700px){.proy-assum{grid-template-columns:1fr}}
    .proy-assum-it{display:flex;align-items:flex-start;gap:11px;padding:11px 13px;background:#FAFBFE;border:1px solid #F1F3F7;border-radius:11px}
    .proy-assum-ic{width:30px;height:30px;border-radius:9px;background:#EFF6FF;color:#1D4ED8;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
    .proy-assum-ic svg{width:14px;height:14px}
    .proy-assum-l{font-size:11.5px;color:#0F172A;font-weight:800}
    .proy-assum-v{font-family:var(--fd);font-size:13.5px;font-weight:900;color:#1D4ED8;letter-spacing:-.3px;margin-top:3px}
    .proy-assum-d{font-size:10.5px;color:#64748B;font-weight:500;margin-top:3px;line-height:1.4}

    /* Floating action bar */
    .proy-action{
      position:sticky;bottom:18px;
      background:#fff;border:1px solid #E5E8F0;border-radius:16px;padding:14px 18px;
      display:flex;align-items:center;gap:14px;
      box-shadow:0 8px 24px -8px rgba(15,23,42,.18);
      margin-top:20px;
    }
    .proy-action-info{flex:1;font-size:12.5px;color:#475569;font-weight:600}
    .proy-action-info strong{color:#0F172A;font-weight:900}
    .proy-btn{
      background:linear-gradient(135deg,#1D4ED8,#2563EB);color:#fff;
      border:none;font-family:inherit;font-size:13px;font-weight:800;
      padding:11px 18px;border-radius:11px;cursor:pointer;
      display:inline-flex;align-items:center;gap:8px;
      box-shadow:0 6px 16px -4px rgba(37,99,235,.40);
      transition:.2s;
    }
    .proy-btn:hover{transform:translateY(-1px);box-shadow:0 10px 22px -4px rgba(37,99,235,.55)}
    .proy-btn svg{width:15px;height:15px}

    .proy-footer{margin-top:24px;padding-top:18px;border-top:1px dashed #E5E8F0;font-size:11px;color:#94A3B8;text-align:center;line-height:1.6}
  </style>

  <div class="page proy-page">
    <div class="proy-wrap proy-print-area">
      <div id="proy-content"></div>
    </div>
  </div>`;
};

function _proyN(v){ return parseFloat(v) || 0; }
function _proyFmt(n, frac){
  if(!isFinite(n) || n === 0) return '0';
  frac = frac == null ? 0 : frac;
  return n.toLocaleString('es-VE',{minimumFractionDigits:frac, maximumFractionDigits:frac});
}
function _proyMes(d){
  if(!d) return '';
  if(typeof d === 'string') d = new Date(d);
  if(!(d instanceof Date) || isNaN(d)) return '';
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function proyRender(){
  var creds  = (S.creds  || []).filter(function(c){ return c && !c.eliminado; });
  var motos  = (S.motos  || []).filter(function(m){ return m && !m.eliminado; });
  var pagos  = (S.pagos  || []).filter(function(p){ return p && !p.eliminado; });
  var egresos= (S.egresos|| []).filter(function(e){ return e && !e.eliminado; });

  var today = new Date();
  var hoyYM = _proyMes(today);
  var year = today.getFullYear();
  var mesActual = today.getMonth(); // 0-11

  // ─── 1. CRÉDITOS POR MES (histórico) ───
  var credsByMonth = {};
  creds.forEach(function(c){
    var f = c.fecha || c.creado || '';
    var ym = _proyMes(f);
    if(!ym) return;
    credsByMonth[ym] = (credsByMonth[ym] || 0) + 1;
  });

  // Histórico ordenado
  var monthsHist = Object.keys(credsByMonth).sort();
  var totalCreditosHasta = creds.length;

  // ─── 2. RITMO PROMEDIO MENSUAL (últimos 6 meses con actividad) ───
  var last6 = monthsHist.slice(-6);
  var sumLast6 = last6.reduce(function(a,m){ return a + credsByMonth[m]; }, 0);
  var promedioMensual = last6.length ? sumLast6 / last6.length : 0;

  // ─── 3. CUOTA PROMEDIO + INICIAL PROMEDIO ───
  var sumCuota = 0, sumInicial = 0, sumPrecio = 0, nCuota = 0, nInicial = 0, nPrecio = 0;
  creds.forEach(function(c){
    var q = _proyN(c.cuotaQ || c.cuota);
    if(q > 0){ sumCuota += q; nCuota++; }
    var i = _proyN(c.inicial);
    if(i > 0){ sumInicial += i; nInicial++; }
    var pr = _proyN(c.precioVenta || c.precio);
    if(pr > 0){ sumPrecio += pr; nPrecio++; }
  });
  var avgCuota = nCuota ? sumCuota / nCuota : 0;
  var avgInicial = nInicial ? sumInicial / nInicial : 0;
  var avgPrecio = nPrecio ? sumPrecio / nPrecio : 0;

  // ─── 4. EGRESOS PROMEDIO MENSUAL (últimos 6 meses) ───
  var egByMonth = {};
  egresos.forEach(function(e){
    var ym = _proyMes(e.fecha || e.creado);
    if(!ym) return;
    egByMonth[ym] = (egByMonth[ym] || 0) + _proyN(e.monto);
  });
  var egMonths = Object.keys(egByMonth).sort().slice(-6);
  var sumEg6 = egMonths.reduce(function(a,m){ return a + egByMonth[m]; }, 0);
  var promedioEgresoMensual = egMonths.length ? sumEg6 / egMonths.length : 0;

  // ─── 5. PAGOS INGRESO PROMEDIO MENSUAL (últimos 6 meses) ───
  var pgByMonth = {};
  pagos.forEach(function(p){
    var ym = _proyMes(p.fecha || p.creado);
    if(!ym) return;
    pgByMonth[ym] = (pgByMonth[ym] || 0) + _proyN(p.monto);
  });
  var pgMonths = Object.keys(pgByMonth).sort().slice(-6);
  var sumPg6 = pgMonths.reduce(function(a,m){ return a + pgByMonth[m]; }, 0);
  var promedioIngresoMensual = pgMonths.length ? sumPg6 / pgMonths.length : 0;

  // ─── 6. CRÉDITOS ACTIVOS HOY ───
  var credsActivos = creds.filter(function(c){
    return !c.estado || c.estado === 'activo' || c.estado === 'al-dia' || !(/cancelado|recuperado|completado|saldado/.test(String(c.estado).toLowerCase()));
  });

  // ─── 7. INVENTARIO MOTOS ───
  var motosDisponibles = motos.filter(function(m){
    return !m.estado || /disponible|libre/i.test(String(m.estado));
  });
  var motosVendidas = motos.length - motosDisponibles.length;

  // ─── 8. PROYECCIÓN A FIN DE AÑO ───
  var mesesRestantes = 12 - (mesActual + 1); // sin contar mes actual
  var creditosProyectados = Math.round(promedioMensual * mesesRestantes);
  var totalCreditosEoy = totalCreditosHasta + creditosProyectados;

  // Revenue/gastos proyectados
  var revenueProyectado = promedioIngresoMensual * mesesRestantes;
  var egresosProyectados = promedioEgresoMensual * mesesRestantes;
  var netoProyectado = revenueProyectado - egresosProyectados;

  // Inicial proyectado (nuevos créditos × inicial promedio)
  var inicialProyectado = creditosProyectados * avgInicial;

  // ─── 9. TABLA MENSUAL ───
  var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var tableHtml = '';
  var acumulado = 0;
  // histórico
  for(var m = 0; m < 12; m++){
    var ym = year + '-' + String(m+1).padStart(2,'0');
    var esHistorico = m < mesActual;
    var esActual = m === mesActual;
    var esFuturo = m > mesActual;
    var esEoy = m === 11;
    var rowClass = esActual ? 'is-current' : (esFuturo ? 'is-future' : '');
    if(esEoy) rowClass = 'is-eoy';

    var nuevos = esHistorico || esActual ? (credsByMonth[ym] || 0) : Math.round(promedioMensual);
    acumulado += nuevos;
    var ingresos = esHistorico || esActual ? (pgByMonth[ym] || 0) : promedioIngresoMensual;
    var egr = esHistorico || esActual ? (egByMonth[ym] || 0) : promedioEgresoMensual;
    var neto = ingresos - egr;
    var pill = esHistorico ? 'Real' : (esActual ? 'En curso' : 'Proyectado');

    tableHtml += '<tr class="'+rowClass+'">'
      + '<td><strong>'+meses[m]+' '+year+'</strong> <span class="proy-pill">'+pill+'</span></td>'
      + '<td class="right">'+nuevos+'</td>'
      + '<td class="right">'+acumulado+'</td>'
      + '<td class="right">$'+_proyFmt(ingresos)+'</td>'
      + '<td class="right">$'+_proyFmt(egr)+'</td>'
      + '<td class="right" style="color:'+(neto>=0?'#047857':'#991B1B')+'">$'+_proyFmt(neto)+'</td>'
    + '</tr>';
  }

  var html = '';

  // ─── HERO ───
  var hoyStr = today.toLocaleDateString('es-VE',{day:'numeric',month:'long',year:'numeric'});
  html += '<div class="proy-hero">'
    + '<div class="proy-hero-tag">Reporte ejecutivo</div>'
    + '<div class="proy-hero-title">Proyección de cierre 2026</div>'
    + '<div class="proy-hero-sub">Análisis basado en el ritmo real de los últimos 6 meses. Proyecta motos colocadas, ingresos por cuotas y gastos hasta el 31 de diciembre asumiendo continuidad del ritmo actual.</div>'
    + '<div class="proy-hero-meta">'
      + '<div class="proy-hero-meta-it"><span class="proy-hero-meta-l">Generado</span><span class="proy-hero-meta-v">'+hoyStr+'</span></div>'
      + '<div class="proy-hero-meta-it"><span class="proy-hero-meta-l">Base histórica</span><span class="proy-hero-meta-v">'+last6.length+' meses</span></div>'
      + '<div class="proy-hero-meta-it"><span class="proy-hero-meta-l">Meses restantes</span><span class="proy-hero-meta-v">'+mesesRestantes+' meses</span></div>'
      + '<div class="proy-hero-meta-it"><span class="proy-hero-meta-l">Total créditos hoy</span><span class="proy-hero-meta-v">'+totalCreditosHasta+'</span></div>'
    + '</div>'
  + '</div>';

  // ─── KPI cards principales ───
  html += '<div class="proy-kpis">'
    + '<div class="proy-kpi">'
      + '<div class="proy-kpi-l">Motos vendidas EOY</div>'
      + '<div class="proy-kpi-v">'+totalCreditosEoy+'</div>'
      + '<div class="proy-kpi-sub">Hoy '+totalCreditosHasta+' · Proyección +'+creditosProyectados+'</div>'
      + '<div class="proy-kpi-trend"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14l5-5 5 5"/></svg>+'+(totalCreditosHasta?Math.round((creditosProyectados/totalCreditosHasta)*100):0)+'% vs hoy</div>'
    + '</div>'
    + '<div class="proy-kpi">'
      + '<div class="proy-kpi-l">Revenue cuotas EOY</div>'
      + '<div class="proy-kpi-v">$'+_proyFmt(revenueProyectado/1000,0)+'<small>k</small></div>'
      + '<div class="proy-kpi-sub">Próximos '+mesesRestantes+' meses · $'+_proyFmt(promedioIngresoMensual)+'/mes</div>'
      + '<div class="proy-kpi-trend"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14l5-5 5 5"/></svg>Ritmo actual</div>'
    + '</div>'
    + '<div class="proy-kpi">'
      + '<div class="proy-kpi-l">Iniciales EOY</div>'
      + '<div class="proy-kpi-v">$'+_proyFmt(inicialProyectado/1000,0)+'<small>k</small></div>'
      + '<div class="proy-kpi-sub">'+creditosProyectados+' motos × $'+_proyFmt(avgInicial)+' avg</div>'
      + '<div class="proy-kpi-trend"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14l5-5 5 5"/></svg>Cash-in inmediato</div>'
    + '</div>'
    + '<div class="proy-kpi">'
      + '<div class="proy-kpi-l">Resultado neto EOY</div>'
      + '<div class="proy-kpi-v" style="color:'+(netoProyectado>=0?'#047857':'#991B1B')+'">$'+_proyFmt(netoProyectado/1000,0)+'<small>k</small></div>'
      + '<div class="proy-kpi-sub">Revenue − Gastos en '+mesesRestantes+' meses</div>'
      + '<div class="proy-kpi-trend '+(netoProyectado>=0?'':'danger')+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14l5-5 5 5"/></svg>'+(netoProyectado>=0?'Positivo':'Negativo')+'</div>'
    + '</div>'
  + '</div>';

  // ─── Assumptions ───
  html += '<div class="proy-card">'
    + '<div class="proy-card-title">'
      + '<span class="proy-card-title-bar"></span>'
      + '<span class="proy-card-title-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg></span>'
      + 'Supuestos del modelo'
    + '</div>'
    + '<div class="proy-assum">'
      + '<div class="proy-assum-it">'
        + '<div class="proy-assum-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>'
        + '<div style="flex:1">'
          + '<div class="proy-assum-l">Ritmo de colocación</div>'
          + '<div class="proy-assum-v">'+promedioMensual.toFixed(1)+' créditos / mes</div>'
          + '<div class="proy-assum-d">Promedio de los últimos '+last6.length+' meses. Si el ritmo sube, las proyecciones se quedan cortas.</div>'
        + '</div>'
      + '</div>'
      + '<div class="proy-assum-it">'
        + '<div class="proy-assum-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></svg></div>'
        + '<div style="flex:1">'
          + '<div class="proy-assum-l">Cuota quincenal promedio</div>'
          + '<div class="proy-assum-v">$'+_proyFmt(avgCuota,2)+' / quincena</div>'
          + '<div class="proy-assum-d">Promedio sobre '+nCuota+' créditos. La cuota varía según moto + plazo.</div>'
        + '</div>'
      + '</div>'
      + '<div class="proy-assum-it">'
        + '<div class="proy-assum-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>'
        + '<div style="flex:1">'
          + '<div class="proy-assum-l">Inicial promedio</div>'
          + '<div class="proy-assum-v">$'+_proyFmt(avgInicial)+'</div>'
          + '<div class="proy-assum-d">Cash recibido al firmar cada crédito. Promedio sobre '+nInicial+' contratos.</div>'
        + '</div>'
      + '</div>'
      + '<div class="proy-assum-it">'
        + '<div class="proy-assum-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-5"/></svg></div>'
        + '<div style="flex:1">'
          + '<div class="proy-assum-l">Ingresos vs Gastos mensuales</div>'
          + '<div class="proy-assum-v">$'+_proyFmt(promedioIngresoMensual)+' − $'+_proyFmt(promedioEgresoMensual)+'</div>'
          + '<div class="proy-assum-d">Promedio últimos 6 meses. Margen neto mensual = $'+_proyFmt(promedioIngresoMensual-promedioEgresoMensual)+'</div>'
        + '</div>'
      + '</div>'
    + '</div>'
  + '</div>';

  // ─── Tabla mensual ───
  html += '<div class="proy-card">'
    + '<div class="proy-card-title">'
      + '<span class="proy-card-title-bar"></span>'
      + '<span class="proy-card-title-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M9 4v18"/></svg></span>'
      + 'Calendario mensual 2026'
    + '</div>'
    + '<table class="proy-table">'
      + '<thead><tr>'
        + '<th>Mes</th>'
        + '<th class="right">Créditos nuevos</th>'
        + '<th class="right">Acumulado</th>'
        + '<th class="right">Ingresos</th>'
        + '<th class="right">Egresos</th>'
        + '<th class="right">Neto</th>'
      + '</tr></thead>'
      + '<tbody>'+tableHtml+'</tbody>'
    + '</table>'
  + '</div>';

  // ─── P&L Summary ───
  html += '<div class="proy-card">'
    + '<div class="proy-card-title">'
      + '<span class="proy-card-title-bar"></span>'
      + '<span class="proy-card-title-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M5 9l7 7 7-7"/></svg></span>'
      + 'P&L Proyectado de aquí a fin de año'
    + '</div>'
    + '<div class="proy-pl">'
      + '<div class="proy-pl-box rev">'
        + '<div class="proy-pl-l">Ingresos</div>'
        + '<div class="proy-pl-v">$'+_proyFmt(revenueProyectado)+'</div>'
        + '<div class="proy-pl-sub">Cuotas de créditos activos + nuevos · '+mesesRestantes+' meses</div>'
      + '</div>'
      + '<div class="proy-pl-box cost">'
        + '<div class="proy-pl-l">Egresos</div>'
        + '<div class="proy-pl-v">$'+_proyFmt(egresosProyectados)+'</div>'
        + '<div class="proy-pl-sub">Inventario + nómina + operativos · '+mesesRestantes+' meses</div>'
      + '</div>'
      + '<div class="proy-pl-box net">'
        + '<div class="proy-pl-l">Resultado neto</div>'
        + '<div class="proy-pl-v" style="color:'+(netoProyectado>=0?'#047857':'#991B1B')+'">$'+_proyFmt(netoProyectado)+'</div>'
        + '<div class="proy-pl-sub">Margen estimado · '+(revenueProyectado>0?((netoProyectado/revenueProyectado)*100).toFixed(1):0)+'% sobre ingresos</div>'
      + '</div>'
    + '</div>'
    + '<div style="margin-top:18px;padding:14px 18px;background:#FAFBFE;border:1px dashed #CBD5E1;border-radius:12px;font-size:12px;color:#475569;line-height:1.55">'
      + '<strong style="color:#0F172A">Nota:</strong> esta proyección asume continuidad del ritmo actual sin promociones especiales, cambios de tasa BCV/Binance ni eventos externos. No incluye recuperación de motos por mora ni cobros legales. Cash adicional por iniciales de nuevos créditos: <strong style="color:#0F172A">$'+_proyFmt(inicialProyectado)+'</strong> (entra a caja al firmar, no impacta directamente el revenue de cuotas).'
    + '</div>'
  + '</div>';

  // ─── Inventario actual ───
  html += '<div class="proy-card">'
    + '<div class="proy-card-title">'
      + '<span class="proy-card-title-bar"></span>'
      + '<span class="proy-card-title-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>'
      + 'Inventario y cartera activa'
    + '</div>'
    + '<div class="proy-pl">'
      + '<div class="proy-pl-box">'
        + '<div class="proy-pl-l">Motos disponibles hoy</div>'
        + '<div class="proy-pl-v">'+motosDisponibles.length+'</div>'
        + '<div class="proy-pl-sub">De '+motos.length+' totales en inventario</div>'
      + '</div>'
      + '<div class="proy-pl-box">'
        + '<div class="proy-pl-l">Créditos activos</div>'
        + '<div class="proy-pl-v">'+credsActivos.length+'</div>'
        + '<div class="proy-pl-sub">Clientes con cuotas pendientes</div>'
      + '</div>'
      + '<div class="proy-pl-box">'
        + '<div class="proy-pl-l">Cobertura inventario</div>'
        + '<div class="proy-pl-v">'+(promedioMensual>0?(motosDisponibles.length/promedioMensual).toFixed(1):'∞')+'<small>meses</small></div>'
        + '<div class="proy-pl-sub">A ritmo de '+promedioMensual.toFixed(1)+' colocaciones/mes</div>'
      + '</div>'
    + '</div>'
  + '</div>';

  // ─── Acción ───
  html += '<div class="proy-action proy-no-print">'
    + '<div class="proy-action-info">Generá un PDF del reporte completo con <strong>Cmd+P</strong> o el botón →</div>'
    + '<button class="proy-btn" onclick="window.print()">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>'
      + 'Imprimir / Guardar PDF'
    + '</button>'
  + '</div>';

  // ─── Footer ───
  html += '<div class="proy-footer">'
    + 'Pagasi · Proyección generada automáticamente desde Firestore · '+hoyStr
    + '<br>Modelo basado en últimos '+last6.length+' meses de actividad real. Para detalles del cálculo ver supuestos arriba.'
  + '</div>';

  var cont = document.getElementById('proy-content');
  if(cont) cont.innerHTML = html;
}

window.proyRender = proyRender;
