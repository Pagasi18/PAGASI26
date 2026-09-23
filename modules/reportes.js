// Pagasi module: reportes
PG.reportes = function(){
  // Tab interno: 'resumen' (default), 'proyecciones', 'egresos', 'exportar'
  var tab = S.reportesTab || 'dashfin';

  // Variables filtradas por concesionario activo
  var _SPAGOS = _concFiltrar(S.pagos||[]);
  var _SCREDS = _concFiltrar(S.creds||[]);
  var _SEGR = _concFiltrarEgresos(S.egresos||[]);
  var _SMOTOS = _concFiltrar(S.motos||[]);

  // ══════════ CÁLCULOS COMPARTIDOS ══════════
  const pagosConf = _SPAGOS.filter(p=>!p.eliminado&&p.estado==='confirmado');
  const pagosPend = _SPAGOS.filter(p=>!p.eliminado&&p.estado==='pendiente');
  // Un credito en mora sigue siendo activo: se cuenta como en el dashboard y en Creditos.
  // Antes credsActivos era solo estado 'activo' pero credsMora contaba a todos los atrasados,
  // asi que la tasa de mora podia pasar de 100% (Adam, 14-sep-2026).
  const credsActivos= _SCREDS.filter(c=>!c.eliminado&&(c.estado==='activo'||c.estado==='mora'));
  const credsMora = credsActivos.filter(c=>c.mora>0);
  const credsComp = _SCREDS.filter(c=>!c.eliminado&&c.estado==='completado');
  const credsRec = _SCREDS.filter(c=>!c.eliminado&&(c.estado==='recuperada'||c.estado==='recuperado'));
  const totalCuotas= pagosConf.filter(p=>!p.esInicial&&p.tipoOperacion!=='inicial_credito').reduce((a,p)=>a+p.monto,0);
  const totalIniciales= getTotalInicialesCobradas();
  // La inicial que el cliente paga en la tienda queda registrada como un egreso de
  // compra de moto, pero NO es plata que salio de Pagasi (entra tambien como ingreso).
  // El dashboard ya la saca desde el 17-sep; Reportes seguia contandola (punto 17, 21-sep).
  // Los egresos de la inicial se siguen viendo en el historial, marcados, pero no suman.
  const _idsEgrIni = (typeof _egrIdsInicial==='function') ? _egrIdsInicial() : {};
  const esEgrInicial = e => !!(e && _idsEgrIni[String(e.id)]);
  const egresosTodos = _SEGR.filter(e=>!e.eliminado);
  const totalEgresosIni = egresosTodos.filter(esEgrInicial).reduce((a,e)=>a+(e.monto||0),0);
  const totalEgresos= egresosTodos.filter(e=>!esEgrInicial(e)).reduce((a,e)=>a+(e.monto||0),0);
  const totalIngresos=totalCuotas+totalIniciales;
  const utilidad = totalIngresos-totalEgresos;
  const margen = totalIngresos>0?Math.round(utilidad/totalIngresos*100):0;

  // Cartera y proyecciones (de conta)
  const creds = _SCREDS.filter(c=>!c.eliminado);
  const nTotal = creds.length;
  const cartera = credsActivos.reduce((a,c)=>a+(typeof getCreditoSaldoPendiente==='function'?getCreditoSaldoPendiente(c):0),0);
  const cuotaEsp = credsActivos.reduce((a,c)=>a+parseFloat(c.cuotaQ||c.cuota||0),0);
  const cuotaEspMes = cuotaEsp*2;
  const pctCobro = cuotaEsp>0?Math.min(100,Math.round(totalCuotas/cuotaEsp*100)):0;
  const tasaMora = credsActivos.length>0?Math.round(credsMora.length/credsActivos.length*100):0;
  const diasMoraProm = credsMora.length>0 ? Math.round(credsMora.reduce((a,c)=>a+(c.mora||0),0)/credsMora.length) : 0;
  const moraAcumulada = credsActivos.reduce((a,c)=>a+(c.moraMonto||0),0);

  const totalPrecioBase = creds.reduce((a,c)=>a+parseFloat(c.precioBaseReal||c.precio||0),0);
  const totalAFinanciar = creds.reduce((a,c)=>a+parseFloat(c.total||0),0);
  const spreadBrutoTotal = totalAFinanciar - totalPrecioBase;

  // Dinero en la calle
  const dineroCalle = credsActivos.reduce((a,c)=>{
    const cuotaV=parseFloat(c.cuotaQ||c.cuota||0);
    const totalC=c.totalCuotas||c.plazo*2;
    const pagado=c.pagado||0;
    return a+Math.max(0,cuotaV*(totalC-pagado));
  },0);

  // Inventario
  const valorInventario=_SMOTOS.filter(m=>!m.eliminado&&m.estado==='disponible').reduce((a,m)=>a+(m.precio||0),0);

  // ══════════ SERIE 12 MESES (para proyecciones) ══════════
  const now = new Date();
  const egresos = egresosTodos.filter(e=>!esEgrInicial(e));
  const serie = [];
  for(let i=11;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const label = d.toLocaleDateString('es-VE',{month:'short'}).replace('.','') + (i===11||m===0?' '+String(y).slice(2):'');
    const ingMes = pagosConf.filter(p=>{
      if(!p.fecha) return false;
      const pd = new Date(p.fecha);
      return pd.getFullYear()===y && pd.getMonth()===m;
    }).reduce((a,p)=>a+(parseFloat(p.monto)||0),0);
    const egMes = egresos.filter(e=>{
      if(!e.fecha) return false;
      const ed = new Date(e.fecha);
      return ed.getFullYear()===y && ed.getMonth()===m;
    }).reduce((a,e)=>a+(e.monto||0),0);
    const nuevosMes = creds.filter(c=>{
      if(!c.fecha) return false;
      const cd = parseFechaLocal(c.fecha);
      return cd.getFullYear()===y && cd.getMonth()===m;
    }).length;
    serie.push({label, y, m, ingresos:ingMes, egresos:egMes, utilidad:ingMes-egMes, nuevos:nuevosMes});
  }
  const mActual = serie[serie.length-1];
  const mAnterior = serie[serie.length-2] || {ingresos:0,egresos:0,utilidad:0,nuevos:0};
  const deltaIng = mAnterior.ingresos>0 ? Math.round((mActual.ingresos-mAnterior.ingresos)/mAnterior.ingresos*100) : (mActual.ingresos>0?100:0);
  const deltaEg = mAnterior.egresos>0 ? Math.round((mActual.egresos-mAnterior.egresos)/mAnterior.egresos*100) : (mActual.egresos>0?100:0);
  const deltaUt = mAnterior.utilidad!==0 ? Math.round((mActual.utilidad-mAnterior.utilidad)/Math.abs(mAnterior.utilidad)*100) : 0;
  const deltaNuev = mAnterior.nuevos>0 ? Math.round((mActual.nuevos-mAnterior.nuevos)/mAnterior.nuevos*100) : (mActual.nuevos>0?100:0);

  // Proyección futura 12 meses
  const hoyTs = Date.now();
  const MS_QUINCENA = 15*24*60*60*1000;
  const futMeses = [];
  for(let i=1;i<=12;i++){
    const d = new Date(now.getFullYear(), now.getMonth()+i, 1);
    futMeses.push({y:d.getFullYear(), m:d.getMonth(), label:d.toLocaleDateString('es-VE',{month:'short'}).replace('.','')+' '+String(d.getFullYear()).slice(2), esperado:0, cuotas:0});
  }
  credsActivos.forEach(c=>{
    if(!c.fecha) return;
    const inicio = parseFechaLocal(c.fecha);
    if(isNaN(inicio.getTime())) return;
    const totalCuotasCred = c.totalCuotas || (c.plazo*2) || 24;
    const pagadas = c.pagado || 0;
    const cuotaMonto = parseFloat(c.cuotaQ||c.cuota||0) || 0;
    if(cuotaMonto<=0) return;
    for(let k=pagadas+1; k<=totalCuotasCred; k++){
      const cuotaFecha = new Date(inicio.getTime() + k*MS_QUINCENA);
      if(cuotaFecha.getTime() < hoyTs - 90*24*60*60*1000) continue;
      const cy = cuotaFecha.getFullYear();
      const cm = cuotaFecha.getMonth();
      const bucket = futMeses.find(x=>x.y===cy && x.m===cm);
      if(bucket){
        bucket.esperado += cuotaMonto;
        bucket.cuotas += 1;
      }
    }
  });

  const proyRealmes = futMeses[0] ? futMeses[0].esperado : 0;
  const proy3Real = futMeses.slice(0,3).reduce((a,x)=>a+x.esperado,0);
  const proy6Real = futMeses.slice(0,6).reduce((a,x)=>a+x.esperado,0);
  const proy12Real = futMeses.slice(0,12).reduce((a,x)=>a+x.esperado,0);

  // Burn rate
  const ultimos3 = serie.slice(-3);
  const promIngHist = ultimos3.reduce((a,x)=>a+x.ingresos,0)/3;
  const promEg = ultimos3.reduce((a,x)=>a+x.egresos,0)/3;
  let acumulado = utilidad;
  let mesBreakeven = null;
  futMeses.forEach((fm)=>{
    acumulado += fm.esperado - promEg;
    if(mesBreakeven===null && acumulado>=0 && utilidad<0) mesBreakeven = fm.label;
  });

  const roi = totalEgresos>0 ? Math.round(utilidad/totalEgresos*100) : 0;
  const coberturaFuturaPct = promEg>0 ? Math.round(proyRealmes/promEg*100) : 0;

  // Top clientes / Cartera
  const topClientes=credsActivos.map(c=>{
    const cuotaV=parseFloat(c.cuotaQ||c.cuota||0);
    const totalC=c.totalCuotas||c.plazo*2;
    const saldo=Math.max(0,cuotaV*(totalC-(c.pagado||0)));
    return {cli:c.cli,modelo:c.modelo,saldo,mora:c.mora,id:c.id};
  }).sort((a,b)=>b.saldo-a.saldo).slice(0,8);

  const meses=[];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setMonth(d.getMonth()-i);
    const lbl=d.toLocaleDateString('es-VE',{month:'short',year:'2-digit'});
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const tot=pagosConf.filter(p=>p.fecha&&p.fecha.startsWith(key)).reduce((a,p)=>a+p.monto,0);
    meses.push({lbl,tot,key});
  }
  const maxMes=Math.max(1,...meses.map(m=>m.tot));

  // Egresos por categoría
  const egresosCat={};
  egresos.forEach(e=>{
    const cat=e.categoria||e.forma||'Otros';
    egresosCat[cat]=(egresosCat[cat]||0)+(e.monto||0);
  });
  const catSorted = Object.entries(egresosCat).sort((a,b)=>b[1]-a[1]);
  const maxCatMonto = catSorted.length ? catSorted[0][1] : 1;

  // Helper chip comparativo
  const chip = (lbl, val, upGood) => {
    const positive = upGood ? val>=0 : val<=0;
    const color = positive ? 'green' : 'red';
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:var(--${color}s);color:var(--${color});font-size:10.5px;font-weight:700">${val>=0?'▲':'▼'} ${Math.abs(val)}%  ${lbl}</span>`;
  };

  // ══════════ HTML ══════════
  var tabs = [
    {k:'dashfin', lbl:'Dashboard Finanzas', sub:'Cartera · principal e interés · mora'},
    {k:'resumen', lbl:'Resumen', sub:'Estado general · KPIs'},
    {k:'metodologia', lbl:'Nueva metodología', sub:'12 % interés · Protect · IVA'},
    {k:'periodicos', lbl:'Reportes', sub:'Diario · Semanal · Quincenal · Mensual'},
    {k:'proyecciones', lbl:'Proyecciones', sub:'Flujo futuro · 12 meses'},
    {k:'egresos', lbl:'Egresos', sub:'Gastos · categorías'},
    {k:'inventario', lbl:'Inventario de oficina', sub:'Activos · equipos · mobiliario'},
    {k:'exportar', lbl:'Exportar', sub:'Reportes · CSV · Backup'},
    {k:'libroseniat', lbl:'Libro SENIAT', sub:'Ventas · IVA · IGTF'},
    {k:'contador', lbl:'📋 Contador', sub:'Reporte semanal · Tributario'},
    {k:'coromoto', lbl:'Coromoto', sub:'Libro contable · estados financieros'}
  ];

  // ══════════ RENDIMIENTO DE COBRANZA (movido desde el módulo Cobranza) ══════════
  var _cbHoy = new Date(); _cbHoy.setHours(0,0,0,0);
  var _cbISO = function(d){ return (typeof fechaLocalISO==='function') ? fechaLocalISO(d) : d.toISOString().slice(0,10); };
  var _cbPagosConf = pagosConf; // confirmados (ya filtrados por concesionario)
  // Recuperación por semana (últimas 8 semanas)
  var semanasCob = [];
  for(var _si=7; _si>=0; _si--){
    var _ini = new Date(_cbHoy); _ini.setDate(_cbHoy.getDate() - (_si*7 + _cbHoy.getDay()));
    var _fin = new Date(_ini); _fin.setDate(_ini.getDate()+6);
    var _iniS=_cbISO(_ini), _finS=_cbISO(_fin);
    var _sp = _cbPagosConf.filter(function(p){ return p.fecha>=_iniS && p.fecha<=_finS; });
    semanasCob.push({ lbl:String(_ini.getDate()).padStart(2,'0')+'/'+String(_ini.getMonth()+1).padStart(2,'0'), tot:_sp.reduce(function(a,p){return a+p.monto;},0), cnt:_sp.length });
  }
  var maxSemCob = Math.max(1, Math.max.apply(null, semanasCob.map(function(s){return s.tot;})));
  var totSemCob = semanasCob.reduce(function(a,s){return a+s.tot;},0);
  var tendSemCob = (semanasCob[6].tot>0) ? Math.round((semanasCob[7].tot - semanasCob[6].tot)/semanasCob[6].tot*100) : 0;
  // Top cobradores del mes actual
  var _iniMesCob = _cbISO(new Date(_cbHoy.getFullYear(), _cbHoy.getMonth(), 1));
  var _cobMesTot = 0, _cobStats = {};
  _cbPagosConf.filter(function(p){ return p.fecha>=_iniMesCob; }).forEach(function(p){
    var k = p.cobrador || 'Sin asignar';
    if(!_cobStats[k]) _cobStats[k] = {cnt:0, tot:0};
    _cobStats[k].cnt++; _cobStats[k].tot += p.monto; _cobMesTot += p.monto;
  });
  var topCobradoresMes = Object.keys(_cobStats).map(function(k){ return {nombre:k, cnt:_cobStats[k].cnt, tot:_cobStats[k].tot}; }).sort(function(a,b){return b.tot-a.tot;}).slice(0,5);

  // ══ Gráficos de Cobros / Próximas cuotas con selector de período (movidos desde Cobranza) ══
  var _rpCobPer = S.rpCobrosPer || 'diario';
  var _rpProxPer = S.rpProxPer || 'diario';
  var _rpGracia = (typeof PLAN!=='undefined' && PLAN.diasGracia!=null) ? PLAN.diasGracia : 5;
  var _rpCobItems = pagosConf.map(function(p){ return { fecha:p.fecha, monto:parseFloat(p.monto||0) }; }).filter(function(x){ return x.fecha; });
  var _rpFutCuotas = [];
  _SCREDS.forEach(function(c){
    if(!c || c.eliminado) return;
    if(!(c.estado==='activo'||c.estado==='mora')) return;
    if(typeof CreditoLedger==='undefined' || !CreditoLedger.generarEstadoCredito) return;
    var est; try{ est = CreditoLedger.generarEstadoCredito(c, S.pagos, {diasGracia:_rpGracia}); }catch(e){ return; }
    if(!est || !est.cuotas) return;
    var _mc = parseFloat(c.cuotaQ||c.cuota||0);
    for(var _qi=(est.cuotasPagadas||0); _qi<est.cuotas.length; _qi++){
      var _q = est.cuotas[_qi];
      if(_q && _q.fechaVence) _rpFutCuotas.push({ fecha:_q.fechaVence, monto:_mc });
    }
  });
  var _rpHoyISO = _cbISO(new Date());
  var serieRpCob = (typeof _pgSerie==='function') ? _pgSerie(_rpCobItems, _rpCobPer, 'past') : [];
  var serieRpProx = (typeof _pgSerie==='function') ? _pgSerie(_rpFutCuotas, _rpProxPer, 'future') : [];
  var maxRpCob = Math.max(1, Math.max.apply(null, serieRpCob.map(function(x){return x.tot;}).concat([0])));
  var maxRpProx = Math.max(1, Math.max.apply(null, serieRpProx.map(function(x){return x.tot;}).concat([0])));
  var totRpCob = serieRpCob.reduce(function(a,x){return a+x.tot;},0);
  var totRpProx = serieRpProx.reduce(function(a,x){return a+x.tot;},0);
  var totRpVencido = _rpFutCuotas.filter(function(x){ return x.fecha < _rpHoyISO; }).reduce(function(a,x){return a+x.monto;},0);
  var _rpBarChart = function(serie, per, maxV, color, setter){
    return '<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:8px">'
      + ['diario','quincenal','mensual','anual','total'].map(function(m){ return '<button class="btn btn-xs '+(per===m?'btn-p':'btn-g')+'" onclick="'+setter+'(\''+m+'\')" style="font-size:9.5px;padding:3px 8px;text-transform:capitalize">'+m+'</button>'; }).join('')
      + '</div>'
      + '<div style="display:flex;align-items:flex-end;gap:4px;height:120px">'
      + serie.map(function(d){ return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0">'
          +'<div style="font-size:8px;font-weight:700;color:var(--ink3);height:11px;white-space:nowrap">'+(d.tot>0?_fmtK(d.tot):'')+'</div>'
          +'<div style="flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center">'
          +'<div style="width:100%;max-width:'+(serie.length<=2?'70px':'100%')+';background:'+(d.tot>0?color:'var(--rim)')+';border-radius:3px 3px 0 0;height:'+(d.tot>0?Math.max(6,Math.round(d.tot/maxV*90)):3)+'px;transition:height .3s"></div>'
          +'</div>'
          +'<div style="font-size:9px;color:var(--ink3);font-weight:600;white-space:nowrap">'+d.lbl+'</div>'
        +'</div>'; }).join('')
      + '</div>';
  };

  return`<div class="page">

  ${pageBanner(
    'Analytics · Finanzas y contabilidad',
    'Finanzas',
    '<b>'+fmt(totalIngresos)+'</b> ingresos · <b>'+fmt(totalEgresos)+'</b> egresos · Utilidad: <b>'+fmt(utilidad)+'</b> · Cartera: <b>'+fmt(cartera)+'</b>',
    [
      {label:'↻ Actualizar', onclick:"nav('reportes')"},
      {label:'＋ Registrar Egreso', onclick:'openAddEgreso()', primary:true}
    ]
  )}

  <!-- BOTÓN GRANDE DESTACADO: Reporte mensual -->
  <div style="background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 50%,#1E40AF 100%);border-radius:16px;padding:22px 26px;margin-bottom:18px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;color:#fff;box-shadow:0 14px 40px rgba(37,99,235,.22);position:relative;overflow:hidden">
    <div style="position:absolute;top:-30px;right:-30px;width:200px;height:200px;background:radial-gradient(circle,rgba(255,255,255,.10) 0%,transparent 70%);pointer-events:none"></div>
    <div style="width:60px;height:60px;background:rgba(255,255,255,.18);backdrop-filter:blur(8px);border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid rgba(255,255,255,.2)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    </div>
    <div style="flex:1;min-width:240px;position:relative;z-index:1">
      <div style="font-size:10.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;opacity:.85;margin-bottom:4px">Reporte mensual completo</div>
      <div style="font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:5px;text-transform:capitalize">${new Date().toLocaleDateString('es-VE',{month:'long',year:'numeric'})}</div>
      <div style="font-size:13px;opacity:.85;line-height:1.5">Genera un reporte ejecutivo con todos los ingresos, egresos, créditos, mora, top cobradores, clientes y más. Listo para imprimir o enviar por email.</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;position:relative;z-index:1">
      <button onclick="reporteMensualAbrir()" style="background:#fff;color:#1E40AF;border:none;padding:14px 22px;border-radius:11px;font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 6px 16px rgba(0,0,0,.18);transition:transform .15s">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="14 2 14 8 20 8"/><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
        Ver reporte
      </button>
      <button onclick="reporteMensualEnviarEmail()" style="background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(8px);padding:14px 22px;border-radius:11px;font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:background .15s" onmouseover="this.style.background='rgba(255,255,255,.26)'" onmouseout="this.style.background='rgba(255,255,255,.16)'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Enviar por email
      </button>
    </div>
  </div>

  <!-- Tabs internas -->
  <div style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid var(--rim);flex-wrap:wrap">
    ${tabs.map(function(t){
      var isActive = tab===t.k;
      return '<button onclick="setReportesTab(\''+t.k+'\')" style="background:none;border:none;padding:10px 18px;font-size:13px;font-weight:'+(isActive?'800':'600')+';color:'+(isActive?'var(--p1)':'var(--ink3)')+';border-bottom:3px solid '+(isActive?'var(--p1)':'transparent')+';margin-bottom:-2px;cursor:pointer;font-family:var(--f);display:flex;flex-direction:column;align-items:flex-start;gap:1px">'
        +'<span>'+t.lbl+'</span>'
        +'<span style="font-size:10px;font-weight:500;color:var(--ink3)">'+t.sub+'</span>'
        +'</button>';
    }).join('')}
  </div>

  ${tab==='dashfin' ? _renderDashFin() : ''}

  ${tab==='resumen' ? `
  <!-- ════════ TAB: RESUMEN ════════ -->

  <!-- Banner salud operativa -->
  <div style="background:${utilidad>=0?'linear-gradient(135deg,var(--greens),rgba(6,176,106,.04))':'linear-gradient(135deg,rgba(37,99,235,.08),rgba(37,99,235,.02))'};border:1px solid ${utilidad>=0?'rgba(6,176,106,.25)':'rgba(37,99,235,.2)'};border-radius:14px;padding:16px 20px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
    <div>
      <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:${utilidad>=0?'var(--green)':'var(--p1)'};margin-bottom:4px">${utilidad>=0?'✓ Operación en positivo':'◐ Operación en fase de recuperación'}</div>
      <div style="font-size:14px;font-weight:700;margin-bottom:4px">${utilidad>=0?`Caja positiva — margen ${margen}%. Cobrado ${fmt(totalIngresos)} vs ${fmt(totalEgresos)} egresos.`:`Déficit de <span style="color:var(--red)">${fmt(Math.abs(utilidad))}</span> — normal en financiamiento. Capital en calle: <strong>${fmt(cartera)}</strong>`}</div>
      <div style="font-size:12px;color:var(--ink3)">Flujo esperado 12m: <strong style="color:var(--green)">${fmt(proy12Real)}</strong>${mesBreakeven?' · Break-even: <strong style="color:var(--p1)">'+mesBreakeven+'</strong>':''} · Spread bruto acumulado: <strong>${fmt(spreadBrutoTotal)}</strong></div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Utilidad proyectada 12m</div>
      <div style="font-size:26px;font-weight:900;font-family:var(--fd);color:${(utilidad+proy12Real-promEg*12)>=0?'var(--green)':'var(--red)'}">${fmt(utilidad+proy12Real-promEg*12)}</div>
      <div style="font-size:10px;color:var(--ink3)">Caja + cobranza futura − burn rate</div>
    </div>
  </div>

  <!-- ROW 1: KPIs financieros principales -->
  <div class="sg" style="grid-template-columns:repeat(4,1fr);margin-bottom:10px">
    <div class="stat"><div class="st-ic" style="background:var(--greens);color:var(--green);font-size:9px;font-weight:800">ING</div>
      <div class="st-v" style="color:var(--green)">${fmt(totalIngresos)}</div><div class="st-l">Ingresos totales</div>
      <div style="font-size:10px;margin-top:4px">${chip('vs mes ant.',deltaIng,true)}</div></div>
    <div class="stat"><div class="st-ic" style="background:var(--reds);color:var(--red);font-size:9px;font-weight:800">EGR</div>
      <div class="st-v" style="color:var(--red)">${fmt(totalEgresos)}</div><div class="st-l">Egresos totales</div>
      <div style="font-size:10px;margin-top:4px">${chip('vs mes ant.',deltaEg,false)}</div></div>
    <div class="stat"><div class="st-ic" style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:800">UTL</div>
      <div class="st-v" style="color:${utilidad>=0?'var(--green)':'var(--red)'}">${fmt(utilidad)}</div><div class="st-l">Utilidad neta · ${margen}% margen</div>
      <div style="font-size:10px;margin-top:4px">${chip('vs mes ant.',deltaUt,true)}</div></div>
    <div class="stat"><div class="st-ic" style="background:var(--ambers);color:var(--amber);font-size:9px;font-weight:800">$↗</div>
      <div class="st-v" style="color:var(--amber)">${fmt(dineroCalle)}</div><div class="st-l">Dinero en la calle</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:4px">Cartera pendiente</div></div>
  </div>

  <!-- ROW 2: KPIs cartera -->
  <div class="sg" style="grid-template-columns:repeat(6,1fr);margin-bottom:14px">
    <div class="stat"><div class="st-v" style="font-size:20px">${credsActivos.length}</div><div class="st-l">Créditos activos</div></div>
    <div class="stat"><div class="st-v" style="font-size:20px;color:var(--red)">${credsMora.length}</div><div class="st-l">En mora <span style="font-size:10px;opacity:.6">${tasaMora}%</span></div></div>
    <div class="stat"><div class="st-v" style="font-size:20px;color:var(--green)">${credsComp.length}</div><div class="st-l">Completados</div></div>
    <div class="stat"><div class="st-v" style="font-size:20px">${pctCobro}%</div><div class="st-l">Efectividad cobro</div></div>
    <div class="stat"><div class="st-v" style="font-size:20px;color:var(--amber)">${fmt(valorInventario)}</div><div class="st-l">Val. inventario</div></div>
    <div class="stat"><div class="st-v" style="font-size:20px">${S.clientes.filter(c=>!c.eliminado).length}</div><div class="st-l">Clientes totales</div></div>
  </div>

  <!-- ROW 3: Charts Ingresos + Egresos por mes (12 meses) -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
    <div class="card">
      <div class="ch" style="margin-bottom:10px">
        <div><div class="ct">Ingresos</div><div class="cs" id="fin2-ing-sub">Últimos 30 días</div></div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs btn-p" id="fin2-ing-d" onclick="setFin2Periodo('ing','diario')"    style="font-size:10px;padding:4px 9px">Diario</button>
          <button class="btn btn-xs" id="fin2-ing-q" onclick="setFin2Periodo('ing','quincenal')" style="font-size:10px;padding:4px 9px">Quincenal</button>
          <button class="btn btn-xs" id="fin2-ing-m" onclick="setFin2Periodo('ing','mensual')"   style="font-size:10px;padding:4px 9px">Mensual</button>
          <button class="btn btn-g btn-sm" onclick="exportarCSV('pagos')" style="margin-left:2px">↓ CSV</button>
        </div>
      </div>
      <div id="fin2-ing-wrap" style="height:130px">
        ${(function(){
          var data=getDashData('ingresos','diario');
          var maxV=Math.max.apply(null,data.map(function(x){return x.total;}))||1;
          return '<div style="display:flex;align-items:flex-end;gap:3px;height:120px">'
            +data.map(function(b,i){
              var h=b.total>0?Math.max(4,Math.round(b.total/maxV*110)):2;
              var isLast=i===data.length-1;
              return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end">'
                +(isLast&&b.total>0?'<div style="font-size:8px;font-weight:700;color:var(--p1)">$'+Math.round(b.total/1000)+'k</div>':'')
                +'<div style="width:100%;background:'+(isLast?'var(--p1)':'rgba(37,99,235,0.3)')+';border-radius:3px 3px 0 0;height:'+h+'px;min-height:2px"></div>'
                +'<div style="font-size:7px;color:var(--ink3);white-space:nowrap">'+b.label+'</div>'
                +'</div>';
            }).join('')+'</div>';
        })()}
      </div>
    </div>
    <div class="card">
      <div class="ch" style="margin-bottom:10px">
        <div><div class="ct">Egresos</div><div class="cs" id="fin2-egr-sub">Últimos 30 días</div></div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-xs btn-p" id="fin2-egr-d" onclick="setFin2Periodo('egr','diario')"    style="font-size:10px;padding:4px 9px">Diario</button>
          <button class="btn btn-xs" id="fin2-egr-q" onclick="setFin2Periodo('egr','quincenal')" style="font-size:10px;padding:4px 9px">Quincenal</button>
          <button class="btn btn-xs" id="fin2-egr-m" onclick="setFin2Periodo('egr','mensual')"   style="font-size:10px;padding:4px 9px">Mensual</button>
          <button class="btn btn-g btn-sm" onclick="setReportesTab('egresos')" style="margin-left:2px">Ver detalle →</button>
        </div>
      </div>
      <div id="fin2-egr-wrap" style="height:130px">
        ${(function(){
          var data=getDashData('egresos','diario');
          // Mismo criterio que el dashboard: gastos + compra de motos, sin las
          // iniciales de los clientes (Adam, 17-sep-2026)
          data.forEach(function(b){ b.total = (b.gastos||0) + (b.motos||0); });
          var maxV=Math.max.apply(null,data.map(function(x){return x.total;}))||1;
          return '<div style="display:flex;align-items:flex-end;gap:3px;height:120px">'
            +data.map(function(b,i){
              var h=b.total>0?Math.max(4,Math.round(b.total/maxV*110)):2;
              var isLast=i===data.length-1;
              return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end">'
                +(isLast&&b.total>0?'<div style="font-size:8px;font-weight:700;color:var(--red)">$'+Math.round(b.total/1000)+'k</div>':'')
                +'<div style="width:100%;background:'+(isLast?'var(--red)':'rgba(217,59,90,0.28)')+';border-radius:3px 3px 0 0;height:'+h+'px;min-height:2px"></div>'
                +'<div style="font-size:7px;color:var(--ink3);white-space:nowrap">'+b.label+'</div>'
                +'</div>';
            }).join('')+'</div>';
        })()}
      </div>
    </div>
  </div>

  <!-- ROW 4: Resumen financiero + KPIs clave -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
    <div class="card">
      <div class="ch"><div class="ct">Resumen financiero</div></div>
      ${[
        ['Iniciales cobradas', fmt(totalIniciales), 'green'],
        ['Cuotas cobradas', fmt(totalCuotas), 'green'],
        ['Total ingresos', fmt(totalIngresos), 'green'],
        ['Egresos registrados', fmt(totalEgresos), 'red'],
        ['Utilidad neta', fmt(utilidad), utilidad>=0?'green':'red'],
        ['Cuota esperada/mes', fmt(cuotaEspMes), 'p1'],
        ['Spread bruto total', fmt(spreadBrutoTotal), 'p1'],
        ['Burn rate mensual', fmt(promEg), 'amber'],
      ].map(row=>{var l=row[0],v=row[1],c=row[2];return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--rim2);font-size:12.5px">
        <span style="color:var(--ink3)">${l}</span>
        <span style="font-weight:800;font-family:var(--fd);color:var(--${c})">${v}</span>
      </div>`;}).join('')}
    </div>
    <div class="card">
      <div class="ch"><div><div class="ct">Indicadores clave</div><div class="cs">KPIs de negocio y salud operativa</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[
          ['Margen operativo', margen+'%', margen>=30?'green':margen>=10?'amber':'red'],
          ['ROI histórico', roi+'%', roi>=50?'green':roi>=0?'amber':'red'],
          ['Tasa de mora', tasaMora+'%', tasaMora<=5?'green':tasaMora<=15?'amber':'red'],
          ['Días mora prom.', diasMoraProm+'d', diasMoraProm<=7?'green':diasMoraProm<=20?'amber':'red'],
          ['Cobertura futura', coberturaFuturaPct+'%', coberturaFuturaPct>=100?'green':'amber'],
          ['Break-even', mesBreakeven||(utilidad>=0?'Ya':'>12m'), mesBreakeven?'p1':(utilidad>=0?'green':'red')],
        ].map(function(row){var l=row[0],v=row[1],c=row[2];return `<div style="padding:11px;background:var(--surf2);border-radius:10px;border-left:3px solid var(--${c})">
          <div style="font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.4px">${l}</div>
          <div style="font-size:18px;font-weight:900;font-family:var(--fd);color:var(--${c});margin-top:3px">${v}</div>
        </div>`;}).join('')}
      </div>
    </div>
  </div>

  <!-- ROW 5: Créditos más rentables + Egresos por categoría -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
    <div class="card">
      <div class="ch"><div><div class="ct">Créditos más rentables</div><div class="cs">Mayor spread generado por crédito</div></div></div>
      <div class="tw tw-compact"><table>
        <thead><tr><th>Cliente</th><th>Modelo</th><th>APY</th><th>Spread</th><th>Estado</th></tr></thead>
        <tbody>${(function(){
          var ranked = _SCREDS.filter(c=>!c.eliminado).map(function(c){
            var precio=parseFloat(c.precioBaseReal||c.precio||0);
            var total=parseFloat(c.total||0);
            var spread=total-precio;
            var apy=parseFloat(c.apy||(c.plan&&c.plan.apy)||0);
            return {c:c, spread:spread, apy:apy};
          }).filter(function(x){return x.spread>0;})
            .sort(function(a,b){return b.spread-a.spread;})
            .slice(0,8);
          return ranked.map(function(x){
            var c=x.c;
            var col=c.estado==='completado'?'b-g':c.mora>0?'b-r':'b-p';
            return '<tr onclick="openAmort('+JSON.stringify(c.id)+')" style="cursor:pointer">'
              +'<td class="tdm">'+c.cli+'</td>'
              +'<td class="tds">'+(c.modelo||'—')+'</td>'
              +'<td style="font-weight:800;font-family:var(--fd);color:var(--p1)">'+x.apy.toFixed(1)+'%</td>'
              +'<td style="font-weight:800;font-family:var(--fd);color:var(--green)">'+fmt(x.spread)+'</td>'
              +'<td><span class="bdg '+col+'">'+c.estado+'</span></td>'
              +'</tr>';
          }).join('');
        })()}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="ch"><div><div class="ct">Egresos por categoría</div><div class="cs">Distribución del gasto total</div></div></div>
      ${(function(){
        var cats={};
        _SEGR.filter(function(e){return !e.eliminado&&e.monto;}).forEach(function(e){
          var k=e.categoria||e.tipo||'Sin categoría';
          cats[k]=(cats[k]||0)+(e.monto||0);
        });
        var arr=Object.keys(cats).map(function(k){return {k:k,v:cats[k]};}).sort(function(a,b){return b.v-a.v;});
        var total=arr.reduce(function(a,x){return a+x.v;},0)||1;
        var colors=['var(--red)','var(--amber)','var(--p1)','var(--green)','var(--ink3)'];
        if(!arr.length) return '<div style="text-align:center;padding:30px;color:var(--ink3);font-size:13px">Sin egresos registrados</div>';
        return arr.slice(0,6).map(function(x,i){
          var pct=Math.round(x.v/total*100);
          return '<div style="margin-bottom:10px">'
            +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">'
              +'<span style="color:var(--ink);font-weight:600">'+x.k+'</span>'
              +'<span style="font-weight:800;font-family:var(--fd);color:'+(colors[i]||'var(--ink)')+'">'+fmt(x.v)+' <span style="font-size:10px;opacity:.6">'+pct+'%</span></span>'
            +'</div>'
            +'<div style="height:7px;background:var(--rim);border-radius:4px;overflow:hidden">'
              +'<div style="height:100%;width:'+pct+'%;background:'+(colors[i]||'var(--ink3)')+';border-radius:4px;transition:width .5s"></div>'
            +'</div>'
          +'</div>';
        }).join('');
      })()}
    </div>
  </div>

  <!-- ROW 6: Top cartera + Mora detallada -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
    <div class="card">
      <div class="ch"><div><div class="ct">Top cartera activa</div><div class="cs">Mayores saldos pendientes</div></div></div>
      <div class="tw tw-compact"><table>
        <thead><tr><th>Cliente</th><th>Modelo</th><th>Saldo</th><th>Mora</th></tr></thead>
        <tbody>${topClientes.map(c=>`<tr onclick="openAmort('${c.id}')" style="cursor:pointer">
          <td class="tdm">${c.cli}</td>
          <td class="tds">${c.modelo}</td>
          <td style="font-weight:800;font-family:var(--fd);color:var(--p1)">${fmt(c.saldo)}</td>
          <td>${c.mora>0?`<span class="bdg b-r">${c.mora}d</span>`:'<span class="bdg b-g">Al día</span>'}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="ch"><div><div class="ct">Mora detallada</div><div class="cs">${credsMora.length} créditos · ${fmt(moraAcumulada)} acumulado</div></div>
        <button class="btn btn-g btn-sm" onclick="nav('pagos')">→ Cobrar</button>
      </div>
      ${credsMora.length?`<div class="tw tw-compact"><table>
        <thead><tr><th>Cliente</th><th>Días</th><th>Cuota</th></tr></thead>
        <tbody>${credsMora.sort((a,b)=>b.mora-a.mora).slice(0,8).map(c=>`<tr onclick="openAmort('${c.id}')" style="cursor:pointer">
          <td><div class="tdm">${c.cli}</div><div class="tds">${c.modelo||'—'}</div></td>
          <td><span class="bdg ${c.mora>60?'b-r':c.mora>30?'b-a':'b-b'}">${c.mora}d</span></td>
          <td style="font-weight:700;color:var(--red)">${fmt(c.cuotaQ||c.cuota||0)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`:`<div style="text-align:center;padding:28px;color:var(--green);font-size:13px;font-weight:700">✓ Sin créditos en mora</div>`}
    </div>
  </div>

  <!-- ROW 6b: RENDIMIENTO DE COBRANZA (movido desde el módulo Cobranza) -->
  <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:12px;margin-bottom:12px">

    <!-- Recuperación semanal -->
    <div class="card">
      <div class="ch">
        <div><div class="ct">📈 Recuperación semanal</div><div class="cs">Cobros confirmados · últimas 8 semanas</div></div>
        <div style="text-align:right">
          <div style="font-weight:900;font-size:18px;color:var(--green)">${fmt(totSemCob)}</div>
          <div style="font-size:10px;color:var(--ink3)">${semanasCob.reduce((a,s)=>a+s.cnt,0)} pagos · tend. <b style="color:${tendSemCob>0?'var(--green)':tendSemCob<0?'var(--red)':'var(--ink3)'}">${tendSemCob>0?'↑ +':tendSemCob<0?'↓ ':''}${tendSemCob}%</b></div>
        </div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:5px;height:120px;margin-top:12px">
        ${semanasCob.map((s,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="font-size:8px;font-weight:700;color:var(--ink3);height:11px">${s.tot>0?fmt(s.tot).slice(0,6):''}</div>
          <div style="flex:1;width:100%;display:flex;align-items:flex-end">
            <div style="width:100%;background:${i===semanasCob.length-1?'var(--p1)':s.tot>0?'var(--greens)':'var(--rim)'};border:${s.tot>0?'none':'1px solid var(--rim2)'};border-radius:4px 4px 0 0;height:${s.tot>0?Math.max(6,Math.round(s.tot/maxSemCob*100)):4}px"></div>
          </div>
          <div style="font-size:8.5px;color:${i===semanasCob.length-1?'var(--p1)':'var(--ink3)'};font-weight:${i===semanasCob.length-1?900:600}">${s.lbl}</div>
        </div>`).join('')}
      </div>
    </div>

    <!-- Top cobradores del mes -->
    <div class="card">
      <div class="ch"><div><div class="ct">🏆 Cobradores del mes</div><div class="cs">Por monto recaudado</div></div></div>
      ${topCobradoresMes.length ? topCobradoresMes.map(function(c,i){
        var medals=['🥇','🥈','🥉','','']; var pct = _cobMesTot>0 ? Math.round(c.tot/_cobMesTot*100) : 0;
        return '<div style="padding:9px 0;border-bottom:1px solid var(--rim2)">'
          +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
            +'<span style="font-size:15px;width:20px">'+(medals[i]||(i+1))+'</span>'
            +'<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.nombre+'</div>'
            +'<div style="font-size:10.5px;color:var(--ink3)">'+c.cnt+' pagos · '+pct+'% del total</div></div>'
            +'<div style="font-size:14px;font-weight:900;color:var(--green)">'+fmt(c.tot)+'</div>'
          +'</div>'
          +'<div style="height:5px;background:var(--rim);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--grad);border-radius:3px"></div></div>'
        +'</div>';
      }).join('') : '<div style="color:var(--ink3);font-size:12px;text-align:center;padding:24px 0">Sin cobros registrados este mes</div>'}
    </div>
  </div>

  <!-- ROW 6c: Cobros y Próximas cuotas a cobrar (selector de período · movido desde Cobranza) -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
    <div class="card">
      <div class="ch" style="margin-bottom:6px">
        <div><div class="ct">Cobros</div><div class="cs">Pagos confirmados · <span style="text-transform:capitalize">${_rpCobPer}</span></div></div>
        <div style="text-align:right"><div style="font-weight:900;font-size:16px;color:var(--p1);font-family:var(--fd)">${fmt(totRpCob)}</div><div style="font-size:10px;color:var(--ink3)">en el rango</div></div>
      </div>
      ${_rpBarChart(serieRpCob, _rpCobPer, maxRpCob, 'var(--p1)', 'setRpCobrosPer')}
    </div>
    <div class="card">
      <div class="ch" style="margin-bottom:6px">
        <div><div class="ct">Próximas cuotas a cobrar</div><div class="cs">Por vencer · <span style="text-transform:capitalize">${_rpProxPer}</span></div></div>
        <div style="text-align:right"><div style="font-weight:900;font-size:16px;color:var(--green);font-family:var(--fd)">${fmt(totRpProx)}</div>${totRpVencido>0?`<div style="font-size:10px;color:var(--red);font-weight:700">${fmt(totRpVencido)} vencido</div>`:'<div style="font-size:10px;color:var(--ink3)">sin vencidas</div>'}</div>
      </div>
      ${_rpBarChart(serieRpProx, _rpProxPer, maxRpProx, 'var(--green)', 'setRpProxPer')}
    </div>
  </div>

  <!-- ROW 7: Ingresos por mes vs egresos (trend) + Inventario -->
  <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:12px;margin-bottom:12px">
    <div class="card">
      <div class="ch"><div><div class="ct">Tendencia ingresos vs egresos</div><div class="cs">12 meses · utilidad mensual</div></div></div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr>
            <th style="text-align:left;padding:5px 8px;color:var(--ink3);font-weight:700;font-size:10px;text-transform:uppercase">Mes</th>
            <th style="text-align:right;padding:5px 8px;color:var(--green);font-weight:700;font-size:10px">Ingresos</th>
            <th style="text-align:right;padding:5px 8px;color:var(--red);font-weight:700;font-size:10px">Egresos</th>
            <th style="text-align:right;padding:5px 8px;color:var(--p1);font-weight:700;font-size:10px">Utilidad</th>
            <th style="text-align:right;padding:5px 8px;color:var(--ink3);font-weight:700;font-size:10px">Créditos</th>
          </tr></thead>
          <tbody>${serie.map((s,i)=>`<tr style="border-bottom:1px solid var(--rim2);${i===serie.length-1?'background:var(--surf2);font-weight:700':''}">
            <td style="padding:6px 8px;color:var(--ink);font-weight:${i===serie.length-1?'800':'500'}">${s.label}</td>
            <td style="padding:6px 8px;text-align:right;color:var(--green);font-family:var(--fd)">${s.ingresos>0?fmt(s.ingresos):'—'}</td>
            <td style="padding:6px 8px;text-align:right;color:var(--red);font-family:var(--fd)">${s.egresos>0?fmt(s.egresos):'—'}</td>
            <td style="padding:6px 8px;text-align:right;color:${s.utilidad>=0?'var(--green)':'var(--red)'};font-family:var(--fd);font-weight:700">${s.ingresos>0||s.egresos>0?fmt(s.utilidad):'—'}</td>
            <td style="padding:6px 8px;text-align:right;color:var(--ink3)">${s.nuevos>0?s.nuevos:'—'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="ch"><div class="ct">Inventario de motos</div><div class="cs">${_SMOTOS.filter(m=>!m.eliminado).length} unidades totales</div></div>
      ${[
        ['Disponibles', _SMOTOS.filter(m=>!m.eliminado&&m.estado==='disponible').length, 'green'],
        ['Financiadas', _SMOTOS.filter(m=>!m.eliminado&&m.estado==='financiada').length, 'p1'],
        ['Recuperadas', _SMOTOS.filter(m=>!m.eliminado&&(m.estado==='recuperada'||m.estado==='recuperado')).length, 'amber'],
        ['Inventario', _SMOTOS.filter(m=>!m.eliminado&&m.estado==='inventario').length, 'ink3'],
      ].map(row=>{var l=row[0],n=row[1],c=row[2];
        const tot=Math.max(1,_SMOTOS.filter(m=>!m.eliminado).length);
        const pct=Math.round(n/tot*100);
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:4px">
            <span style="color:var(--ink3)">${l}</span>
            <span style="color:var(--${c});font-weight:800">${n} <span style="opacity:.5;font-size:10px">${pct}%</span></span>
          </div>
          <div style="height:6px;background:var(--rim);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--${c});border-radius:3px;transition:width .6s"></div>
          </div>
        </div>`;
      }).join('')}
      <div style="margin-top:10px;padding:10px;background:var(--gs);border-radius:9px;border:1px solid var(--rim2);display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12px;font-weight:700;color:var(--ink3)">Valor en stock disponible</span>
        <span style="font-weight:900;font-family:var(--fd);color:var(--p1)">${fmt(valorInventario)}</span>
      </div>
    </div>
  </div>

  <!-- ROW 8: Top modelos por rentabilidad + Pagos recientes -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="card">
      <div class="ch"><div><div class="ct">Modelos más vendidos</div><div class="cs">Por cantidad de créditos otorgados</div></div></div>
      ${(function(){
        var mods={};
        _SCREDS.filter(function(c){return !c.eliminado&&c.modelo;}).forEach(function(c){
          var k=c.modelo;
          if(!mods[k]) mods[k]={n:0,ingreso:0,spread:0};
          mods[k].n++;
          mods[k].ingreso+=parseFloat(c.total||0);
          mods[k].spread+=parseFloat(c.total||0)-parseFloat(c.precioBaseReal||c.precio||0);
        });
        var arr=Object.keys(mods).map(function(k){return {k:k,n:mods[k].n,ingreso:mods[k].ingreso,spread:mods[k].spread};})
          .sort(function(a,b){return b.n-a.n;}).slice(0,6);
        var maxN=arr.length?arr[0].n:1;
        if(!arr.length) return '<div style="text-align:center;padding:30px;color:var(--ink3)">Sin datos</div>';
        return '<div style="display:flex;flex-direction:column;gap:9px">'
          +arr.map(function(x){
            var pct=Math.round(x.n/maxN*100);
            return '<div>'
              +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
                +'<span style="font-size:12.5px;font-weight:700;color:var(--ink)">'+x.k+'</span>'
                +'<div style="text-align:right">'
                  +'<span style="font-size:12px;font-weight:800;color:var(--p1)">'+x.n+' ud.</span>'
                  +' <span style="font-size:10px;color:var(--green)">+'+fmt(x.spread)+'</span>'
                +'</div>'
              +'</div>'
              +'<div style="height:5px;background:var(--rim);border-radius:3px;overflow:hidden">'
                +'<div style="height:100%;width:'+pct+'%;background:var(--p1);border-radius:3px;transition:width .5s"></div>'
              +'</div>'
            +'</div>';
          }).join('')+'</div>';
      })()}
    </div>
    <div class="card">
      <div class="ch"><div><div class="ct">Pagos recientes</div><div class="cs">Últimos 10 confirmados</div></div>
        <button class="btn btn-g btn-sm" onclick="nav('pagos')">Ver todos →</button>
      </div>
      <div class="tw tw-compact"><table>
        <thead><tr><th>Cliente</th><th>Fecha</th><th>Monto</th><th>Tipo</th></tr></thead>
        <tbody>${(function(){
          var recientes=pagosConf.filter(function(p){return p.fecha;})
            .sort(function(a,b){return (b.fecha||'')>(a.fecha||'')?1:-1;}).slice(0,10);
          return recientes.map(function(p){
            var esIni=p.esInicial||p.tipoOperacion==='inicial_credito';
            return '<tr>'
              +'<td class="tdm">'+(p.cli||p.cred||'—')+'</td>'
              +'<td class="tds">'+(p.fecha||'').slice(0,10)+'</td>'
              +'<td style="font-weight:800;font-family:var(--fd);color:var(--green)">'+fmt(p.monto||0)+'</td>'
              +'<td><span class="bdg '+(esIni?'b-a':'b-g')+'">'+(esIni?'Inicial':'Cuota')+'</span></td>'
              +'</tr>';
          }).join('');
        })()}</tbody>
      </table></div>
    </div>
  </div>
  ` : tab==='proyecciones' ? `
  <!-- ════════ TAB: PROYECCIONES ════════ -->

  <!-- Resumen proyección -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
    <div class="stat" style="">
      <div class="st-v" style="color:var(--p1);font-size:22px">${fmt(proyRealmes)}</div>
      <div class="st-l">Próximo mes</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${futMeses[0]?futMeses[0].cuotas:0} cuotas esperadas</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="color:var(--green);font-size:22px">${fmt(proy3Real)}</div>
      <div class="st-l">Próximos 3 meses</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${futMeses.slice(0,3).reduce((a,x)=>a+x.cuotas,0)} cuotas</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="color:var(--amber);font-size:22px">${fmt(proy6Real)}</div>
      <div class="st-l">Próximos 6 meses</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${futMeses.slice(0,6).reduce((a,x)=>a+x.cuotas,0)} cuotas</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="color:var(--green);font-size:22px">${fmt(proy12Real)}</div>
      <div class="st-l">Próximos 12 meses</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${futMeses.slice(0,12).reduce((a,x)=>a+x.cuotas,0)} cuotas</div>
    </div>
  </div>

  <!-- Serie histórica 12 meses (barras) -->
  <div class="card" style="margin-bottom:12px">
    <div class="ch"><div><div class="ct">Serie histórica · últimos 12 meses</div><div class="cs">Ingresos vs egresos · utilidad neta mensual</div></div></div>
    <div style="display:flex;align-items:flex-end;gap:6px;height:180px;margin-top:14px;padding:0 4px">
      ${(function(){
        var maxVal = Math.max(1, Math.max.apply(null, serie.map(function(s){return Math.max(s.ingresos, s.egresos);})));
        return serie.map(function(s){
          var hIng = s.ingresos>0 ? Math.max(6, Math.round(s.ingresos/maxVal*150)) : 2;
          var hEg = s.egresos>0 ? Math.max(6, Math.round(s.egresos/maxVal*150)) : 2;
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0">'
            +'<div style="font-size:9px;font-weight:800;color:'+(s.utilidad>=0?'var(--green)':'var(--red)')+';height:12px;white-space:nowrap">'+(s.utilidad!==0?fmt(s.utilidad).slice(0,7):'')+'</div>'
            +'<div style="flex:1;width:100%;display:flex;align-items:flex-end;gap:2px">'
            +'<div style="flex:1;background:linear-gradient(180deg,var(--green),#10c878);border-radius:3px 3px 0 0;height:'+hIng+'px" title="Ingresos: '+fmt(s.ingresos)+'"></div>'
            +'<div style="flex:1;background:linear-gradient(180deg,var(--red),#ef4e6f);border-radius:3px 3px 0 0;height:'+hEg+'px" title="Egresos: '+fmt(s.egresos)+'"></div>'
            +'</div>'
            +'<div style="font-size:9px;color:var(--ink3);font-weight:600">'+s.label+'</div>'
            +'</div>';
        }).join('');
      })()}
    </div>
    <div style="display:flex;gap:14px;margin-top:14px;padding-top:10px;border-top:1px solid var(--rim2);font-size:11px;flex-wrap:wrap">
      <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:var(--green)"></span>Ingresos</span>
      <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:2px;background:var(--red)"></span>Egresos</span>
      <span style="color:var(--ink3)">Promedio ingresos últimos 3m: <b style="color:var(--green)">${fmt(promIngHist)}</b></span>
      <span style="color:var(--ink3)">Burn promedio: <b style="color:var(--red)">${fmt(promEg)}/mes</b></span>
    </div>
  </div>

  <!-- Comparativa mes actual vs anterior -->
  <div class="card" style="margin-bottom:12px">
    <div class="ch"><div><div class="ct">Comparativa · ${mActual.label} vs ${mAnterior.label||'—'}</div><div class="cs">Variación intermensual</div></div></div>
    <table style="width:100%;margin-top:10px">
      <thead style="border-bottom:1px solid var(--rim2)">
        <tr>
          <th style="text-align:left;padding:8px 6px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Métrica</th>
          <th style="text-align:right;padding:8px 6px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Mes anterior</th>
          <th style="text-align:right;padding:8px 6px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Mes actual</th>
          <th style="text-align:right;padding:8px 6px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Diferencia</th>
          <th style="text-align:right;padding:8px 6px;font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase">Variación</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['Ingresos cobrados', mAnterior.ingresos, mActual.ingresos, deltaIng, 'green', true],
          ['Egresos', mAnterior.egresos, mActual.egresos, deltaEg, 'red', false],
          ['Utilidad neta', mAnterior.utilidad, mActual.utilidad, deltaUt, mActual.utilidad>=0?'green':'red', true],
          ['Créditos nuevos', mAnterior.nuevos, mActual.nuevos, deltaNuev, 'p1', true],
        ].map(function(row){
          var l=row[0],prev=row[1],curr=row[2],d=row[3],c=row[4],upGood=row[5];
          const positive = upGood ? d>=0 : d<=0;
          const diff = curr-prev;
          return `<tr style="border-bottom:1px solid var(--rim2)">
            <td style="padding:11px 6px;font-weight:600">${l}</td>
            <td style="padding:11px 6px;text-align:right;font-family:var(--fd);color:var(--ink3)">${l==='Créditos nuevos'?prev:fmt(prev)}</td>
            <td style="padding:11px 6px;text-align:right;font-family:var(--fd);font-weight:800;color:var(--${c})">${l==='Créditos nuevos'?curr:fmt(curr)}</td>
            <td style="padding:11px 6px;text-align:right;font-family:var(--fd);color:${diff>=0?'var(--green)':'var(--red)'};font-weight:700">${diff>=0?'+':''}${l==='Créditos nuevos'?diff:fmt(diff)}</td>
            <td style="padding:11px 6px;text-align:right;font-family:var(--fd);font-weight:800;color:${positive?'var(--green)':'var(--red)'}">${d>=0?'+':''}${d}%</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- Proyección futura 12 meses -->
  <div class="card">
    <div class="ch"><div><div class="ct">Proyección futura · próximos 12 meses</div><div class="cs">Cobros esperados según cronogramas firmados</div></div>
      <div style="font-weight:900;font-size:18px;color:var(--green);font-family:var(--fd)">${fmt(proy12Real)}</div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:5px;height:150px;margin-top:14px;padding:0 4px">
      ${(function(){
        var maxE = Math.max(1, Math.max.apply(null, futMeses.map(function(f){return f.esperado;})));
        return futMeses.map(function(f){
          var h = f.esperado>0 ? Math.max(8, Math.round(f.esperado/maxE*130)) : 3;
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">'
            +'<div style="font-size:9px;font-weight:800;color:var(--p1);height:12px;white-space:nowrap">'+(f.esperado>0?fmt(f.esperado).slice(0,7):'')+'</div>'
            +'<div style="flex:1;width:100%;display:flex;align-items:flex-end">'
            +'<div style="width:100%;background:linear-gradient(180deg,var(--p1),#60A5FA);border-radius:3px 3px 0 0;height:'+h+'px" title="'+f.label+': '+fmt(f.esperado)+' ('+f.cuotas+' cuotas)"></div>'
            +'</div>'
            +'<div style="font-size:9px;color:var(--ink3);font-weight:600">'+f.label.split(' ')[0]+'</div>'
            +'</div>';
        }).join('');
      })()}
    </div>
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--rim2);display:flex;gap:16px;flex-wrap:wrap;font-size:11.5px">
      <span style="color:var(--ink3)">Total cuotas esperadas: <b>${futMeses.reduce((a,x)=>a+x.cuotas,0)}</b></span>
      <span style="color:var(--ink3)">Promedio mensual: <b style="color:var(--green)">${fmt(proy12Real/12)}</b></span>
      <span style="color:var(--ink3)">Cobertura vs burn: <b style="color:${coberturaFuturaPct>=100?'var(--green)':'var(--amber)'}">${coberturaFuturaPct}%</b></span>
    </div>
  </div>

  ` : tab==='egresos' ? `
  <!-- ════════ TAB: EGRESOS ════════ -->

  <!-- Totales -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
    <div class="stat" style="">
      <div class="st-v" style="color:var(--red);font-size:22px">${fmt(totalEgresos)}</div>
      <div class="st-l">Total egresos</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${egresos.length} registros${totalEgresosIni>0?` · sin ${fmt(totalEgresosIni)} de iniciales`:''}</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="color:var(--amber);font-size:22px">${Object.keys(egresosCat).length}</div>
      <div class="st-l">Categorías</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">Distintas categorías de gasto</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="color:var(--p1);font-size:22px">${fmt(promEg)}</div>
      <div class="st-l">Promedio mensual</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">Últimos 3 meses (burn rate)</div>
    </div>
  </div>

  <!-- Categorías -->
  <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:12px;margin-bottom:12px">
    <div class="card">
      <div class="ch"><div><div class="ct">Egresos por categoría</div><div class="cs">Distribución del gasto</div></div></div>
      ${catSorted.length ? catSorted.map(function(row){
        var cat=row[0], tot=row[1];
        var pct = Math.round(tot/maxCatMonto*100);
        var pctTot = Math.round(tot/totalEgresos*100);
        return '<div style="margin-bottom:10px">'
          +'<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">'
          +'<span style="font-weight:700">'+cat+'</span>'
          +'<span style="font-family:var(--fd);font-weight:800;color:var(--red)">'+fmt(tot)+' <span style="opacity:.6;font-size:10px;color:var(--ink3)">'+pctTot+'%</span></span>'
          +'</div>'
          +'<div style="height:7px;background:var(--rim);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--red),#ef4e6f);border-radius:3px"></div></div>'
          +'</div>';
      }).join('') : '<div style="text-align:center;padding:30px 0;color:var(--ink3);font-size:12.5px">Sin egresos registrados</div>'}
    </div>

    <div class="card">
      <div class="ch">
        <div><div class="ct">Historial de egresos</div><div class="cs">${egresosTodos.length} registro${egresosTodos.length===1?'':'s'}${totalEgresosIni>0?` · ${fmt(totalEgresosIni)} son iniciales de clientes y no cuentan como salida`:''}</div></div>
        <button class="btn btn-p btn-sm" onclick="openAddEgreso()">＋ Nuevo Egreso</button>
      </div>
      <div style="max-height:360px;overflow-y:auto;margin:0 -4px;padding:0 4px">
        ${egresosTodos.length?egresosTodos.slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).map(e=>`
          <div style="display:flex;align-items:center;gap:10px;padding:10px 6px;border-bottom:1px solid var(--rim2)">
            <div style="width:36px;height:36px;border-radius:8px;background:var(--reds);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:var(--red);flex-shrink:0">${(e.categoria||'$').substring(0,3).toUpperCase()}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.concepto}</div>
              <div style="font-size:10.5px;color:var(--ink3);margin-top:2px">
                <span style="padding:1px 6px;border-radius:4px;background:var(--surf2);margin-right:4px">${e.categoria||'Sin categoría'}</span>${esEgrInicial(e)?'<span style="padding:1px 6px;border-radius:4px;background:var(--gs);color:var(--p1);font-weight:700;margin-right:4px">inicial del cliente · no es salida</span>':''}
                ${e.forma||'—'} · ${e.fecha||'—'}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <span style="font-weight:800;font-family:var(--fd);color:var(--red);font-size:14px">-${fmt(e.monto)}</span>
              <button class="btn btn-d btn-xs btn-ic" onclick="delEgreso(${e.id})" title="Eliminar">✕</button>
            </div>
          </div>`).join(''):`<div style="text-align:center;padding:40px 0;color:var(--ink3)">
            <div style="font-size:13px;font-weight:600;margin-bottom:4px">Sin egresos registrados</div>
            <div style="font-size:11.5px">Haz clic en "Nuevo Egreso" para comenzar</div>
          </div>`}
      </div>
      ${egresosTodos.length?`<div style="margin-top:12px;background:var(--reds);border:1px solid rgba(217,59,90,.2);border-radius:10px;padding:11px 13px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:13px">Total egresos acumulados${totalEgresosIni>0?' <span style="font-weight:500;font-size:11px;color:var(--ink3)">(sin las iniciales de clientes)</span>':''}</span>
        <span style="color:var(--red);font-weight:900;font-family:var(--fd);font-size:16px">-${fmt(totalEgresos)}</span>
      </div>`:''}
    </div>
  </div>

  ` : tab==='exportar' ? `
  <!-- ════════ TAB: EXPORTAR ════════ -->

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">

    <!-- Ver / Generar reportes con formato -->
    <div class="card">
      <div class="ch"><div><div class="ct">Ver reportes</div><div class="cs">Abrir reporte con formato · imprimir o guardar PDF</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
        ${[
          ['Ingresos','ingresos'],
          ['Créditos','creditos'],
          ['Mora','mora'],
          ['Inventario','inventario'],
          ['P&L','pyl'],
          ['Flujo de caja','flujo'],
          ['Plan','plan'],
        ].map(row=>{var l=row[0],t=row[1];return `<button class="btn btn-g btn-sm" style="justify-content:flex-start" onclick="generarReporte('${t}')">
          ${l}
        </button>`;}).join('')}
      </div>
    </div>

    <!-- Exportar CSV / Backup -->
    <div class="card">
      <div class="ch"><div><div class="ct">Exportar datos</div><div class="cs">CSV para Excel · Backup JSON</div></div></div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
      ${[
        ['Cartera completa (CSV)', "exportarCSV('creditos')", 'btn-g'],
        ['Clientes (CSV)', "exportarCSV('clientes')", 'btn-g'],
        ['Pagos confirmados (CSV)', "exportarCSV('pagos')", 'btn-g'],
        ['Egresos (CSV)', "exportarCSV('egresos')", 'btn-g'],
        ['Backup completo (JSON)', 'exportarBackupJSON()', 'btn-p'],
      ].map(row=>{var l=row[0],fn=row[1],cls=row[2];return `<button class="btn ${cls} btn-sm" style="justify-content:flex-start" onclick="${fn}">
        <span style="font-family:var(--fm);font-size:9px;opacity:.6;margin-right:6px">↓</span>${l}
      </button>`;}).join('')}
      </div>
      <div style="margin-top:14px;padding:11px;background:var(--gs);border-radius:9px;border:1px solid var(--rim2)">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--p1);margin-bottom:8px">Resumen rápido</div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0">
          <span style="color:var(--ink3)">Pagos por confirmar</span>
          <span style="font-weight:800;color:var(--amber)">${pagosPend.length}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0">
          <span style="color:var(--ink3)">Monto pendiente</span>
          <span style="font-weight:800;color:var(--amber)">${fmt(pagosPend.reduce((a,p)=>a+p.monto,0))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0">
          <span style="color:var(--ink3)">Motos recuperadas</span>
          <span style="font-weight:800;color:var(--red)">${credsRec.length}</span>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  ${tab==='periodicos' ? _renderTabReportesPeriodicos() : ''}

  ${tab==='inventario' ? _renderTabInventario() : ''}

  ${tab==='metodologia' ? (typeof _renderNuevaMetodologia==='function' ? _renderNuevaMetodologia() : '') : ''}

  ${tab==='libroseniat' ? _renderLibroSeniat() : ''}

  ${tab==='contador' ? _renderTabContador({
    pagosConf, credsActivos, credsMora, credsComp,
    totalIngresos, totalEgresos, utilidad,
    _SCREDS, _SPAGOS, _SEGR, _SMOTOS,
    serie, mActual
  }) : ''}

  ${tab==='coromoto' ? (typeof _renderCoromoto==='function' ? _renderCoromoto() : '') : ''}

  </div>`;
};

// ══════════════════════════════════════════════════════════════
// TAB: REPORTES PERIÓDICOS — diario / semanal / quincenal / mensual
// ══════════════════════════════════════════════════════════════
function _renderTabReportesPeriodicos(){
  var defs=[
    {k:'diario', lbl:'Diario', desc:'Cierre del día de hoy'},
    {k:'semanal', lbl:'Semanal', desc:'Resumen de los últimos 7 días'},
    {k:'quincenal', lbl:'Quincenal', desc:'Resumen de los últimos 15 días'},
    {k:'mensual', lbl:'Mensual', desc:'Mes calendario en curso'},
    {k:'anual', lbl:'Anual', desc:'Acumulado del año en curso'}
  ];
  var cal='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="19" height="19"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  var docIc='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  var rows=defs.map(function(d){
    var r=(typeof generarReportePeriodo==='function')?generarReportePeriodo(d.k):null;
    var ing=r?r.fmtUsd(r.cobrado):'$0', ut=r?r.fmtUsd(r.utilidad):'$0', utc=(r&&r.utilidad<0)?'var(--red)':'var(--green)';
    var rango=r?r.rangoLabel:'', np=r?r.pagosCount:0;
    return '<div class="card" style="display:flex;align-items:center;gap:14px;padding:13px 16px;margin-bottom:9px;flex-wrap:wrap">'
      +'<div style="width:40px;height:40px;border-radius:11px;background:rgba(37,99,235,.10);color:var(--p1);display:flex;align-items:center;justify-content:center;flex-shrink:0">'+cal+'</div>'
      +'<div style="flex:1;min-width:150px"><div style="font-size:14.5px;font-weight:800;color:var(--ink)">Reporte '+d.lbl+'</div><div style="font-size:11px;color:var(--ink3);font-weight:600;margin-top:1px;text-transform:capitalize">'+d.desc+(rango?' · '+rango:'')+' · '+np+' pago'+(np!==1?'s':'')+'</div></div>'
      +'<div style="display:flex;gap:20px;align-items:center">'
        +'<div style="text-align:right"><div style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3)">Ingresos</div><div style="font-family:var(--fd);font-weight:900;font-size:15px;color:var(--green)">'+ing+'</div></div>'
        +'<div style="text-align:right"><div style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3)">Utilidad</div><div style="font-family:var(--fd);font-weight:900;font-size:15px;color:'+utc+'">'+ut+'</div></div>'
      +'</div>'
      +'<button class="btn btn-p btn-sm" onclick="reportePeriodoAbrir(\''+d.k+'\')" style="font-weight:800;display:inline-flex;align-items:center;gap:7px;white-space:nowrap">'+docIc+'Generar</button>'
    +'</div>';
  }).join('');
  var hoyISO=(typeof fechaLocalISO==='function')?fechaLocalISO(new Date()):new Date().toISOString().slice(0,10);
  var mesISO=hoyISO.slice(0,7);
  var hoyDia=new Date().getDate();
  var bxStyle='background:var(--surf2);border:1px solid var(--rim);border-radius:12px;padding:13px 14px';
  var lblStyle='font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);margin-bottom:8px';
  return '<div>'
    +'<div style="display:flex;align-items:flex-start;gap:11px;padding:13px 16px;background:rgba(37,99,235,.05);border:1px solid rgba(37,99,235,.14);border-radius:12px;margin-bottom:16px">'
      +'<svg viewBox="0 0 24 24" fill="none" stroke="var(--p1)" stroke-width="2" width="18" height="18" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01" stroke-linecap="round"/></svg>'
      +'<div style="font-size:12px;color:var(--ink2);line-height:1.55">Cada reporte se genera con el <b>logo de Pagasi</b>, marca de agua <b>CONFIDENCIAL</b> y el detalle completo de ingresos, egresos, cartera, mora y rankings. Se abre en una pestaña nueva, listo para <b>imprimir o guardar en PDF</b>.</div>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:10px;margin:2px 0 10px"><span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--ink3)">Reportes estándar</span><div style="flex:1;height:1px;background:var(--rim)"></div></div>'
    +rows
    +'<div class="card" style="margin-top:16px">'
      +'<div class="ch"><div><div class="ct">Buscar un reporte específico</div><div class="cs">Generá el reporte de un día exacto (ej. ayer), un mes o un rango de fechas</div></div></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1.3fr;gap:12px;margin-top:10px">'
        +'<div style="'+bxStyle+'">'
          +'<div style="'+lblStyle+'">Por día</div>'
          +'<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"><button class="btn btn-g btn-xs" onclick="reporteDiaRapido(0)">Hoy</button><button class="btn btn-g btn-xs" onclick="reporteDiaRapido(1)">Ayer</button><button class="btn btn-g btn-xs" onclick="reporteDiaRapido(2)">Antier</button></div>'
          +'<div style="display:flex;gap:8px;margin-bottom:8px"><select class="fs" id="rep-dia-mes" onchange="_repRebuildDias()" style="flex:1.6">'+_repMesOpts(mesISO)+'</select><select class="fs" id="rep-dia-dia" style="flex:.8">'+_repDiaOpts(mesISO,hoyDia)+'</select></div>'
          +'<button class="btn btn-p btn-sm" onclick="reportePeriodoCustom(\'dia\')" style="width:100%;justify-content:center;font-weight:800">Generar reporte</button>'
        +'</div>'
        +'<div style="'+bxStyle+'">'
          +'<div style="'+lblStyle+'">Por mes</div>'
          +'<select class="fs" id="rep-mes" style="width:100%;margin-bottom:8px">'+_repMesOpts(mesISO)+'</select>'
          +'<div style="font-size:10.5px;color:var(--ink3);font-weight:600;margin-bottom:8px">Reporte mensual completo del mes elegido.</div>'
          +'<button class="btn btn-p btn-sm" onclick="reportePeriodoCustom(\'mes\')" style="width:100%;justify-content:center;font-weight:800">Generar reporte</button>'
        +'</div>'
        +'<div style="'+bxStyle+'">'
          +'<div style="'+lblStyle+'">Por rango de fechas</div>'
          +'<div style="display:flex;gap:8px;margin-bottom:8px"><div style="flex:1"><label style="font-size:9px;font-weight:700;color:var(--ink3)">Desde</label><input class="fi" type="date" id="rep-desde" value="'+hoyISO+'" style="width:100%"></div><div style="flex:1"><label style="font-size:9px;font-weight:700;color:var(--ink3)">Hasta</label><input class="fi" type="date" id="rep-hasta" value="'+hoyISO+'" style="width:100%"></div></div>'
          +'<button class="btn btn-p btn-sm" onclick="reportePeriodoCustom(\'rango\')" style="width:100%;justify-content:center;font-weight:800">Generar reporte</button>'
        +'</div>'
      +'</div>'
    +'</div>'
  +'</div>';
}
function reportePeriodoCustom(tipo){
  var g=function(id){var el=document.getElementById(id);return el?el.value:'';};
  if(tipo==='dia'){ var mv=g('rep-dia-mes'), dv=parseInt(g('rep-dia-dia'),10); if(!mv||!dv){ if(typeof toast==='function') toast('Elegí mes y día','warn'); return; } reportePeriodoAbrir('dia',{fecha:mv+'-'+String(dv).padStart(2,'0')}); }
  else if(tipo==='mes'){ var m=g('rep-mes'); if(!m){ if(typeof toast==='function') toast('Elegí un mes','warn'); return; } reportePeriodoAbrir('mes',{mes:m}); }
  else if(tipo==='rango'){ var d=g('rep-desde'), h=g('rep-hasta'); if(!d||!h){ if(typeof toast==='function') toast('Elegí desde y hasta','warn'); return; } reportePeriodoAbrir('rango',{desde:d,hasta:h}); }
}
function reporteDiaRapido(off){ var dt=new Date(); dt.setDate(dt.getDate()-off); var f=(typeof fechaLocalISO==='function')?fechaLocalISO(dt):dt.toISOString().slice(0,10); reportePeriodoAbrir('dia',{fecha:f}); }
// Opciones de meses (últimos 18) y días (según el mes elegido) para los desplegables
function _repMesOpts(sel){
  var out=[], base=new Date();
  for(var i=0;i<18;i++){ var d=new Date(base.getFullYear(), base.getMonth()-i, 1);
    var val=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    var lbl=d.toLocaleDateString('es-VE',{month:'long',year:'numeric'}); lbl=lbl.charAt(0).toUpperCase()+lbl.slice(1);
    out.push('<option value="'+val+'"'+(val===sel?' selected':'')+'>'+lbl+'</option>'); }
  return out.join('');
}
function _repDiaOpts(mesVal, selDia){
  var y=parseInt(String(mesVal).slice(0,4),10), m=parseInt(String(mesVal).slice(5,7),10)-1;
  var n=new Date(y,m+1,0).getDate(); var out=[];
  for(var i=1;i<=n;i++){ out.push('<option value="'+i+'"'+(i===selDia?' selected':'')+'>'+i+'</option>'); }
  return out.join('');
}
function _repRebuildDias(){
  var ms=document.getElementById('rep-dia-mes'), ds=document.getElementById('rep-dia-dia');
  if(!ms||!ds) return;
  var cur=parseInt(ds.value,10)||1;
  var y=parseInt(ms.value.slice(0,4),10), m=parseInt(ms.value.slice(5,7),10)-1;
  var n=new Date(y,m+1,0).getDate(); if(cur>n) cur=n;
  ds.innerHTML=_repDiaOpts(ms.value, cur);
}

// ══════════════════════════════════════════════════════════════
// TAB: INVENTARIO DE OFICINA — activos / equipos / mobiliario
// Se guarda en config/inventarioOficina (permitido por las reglas)
// ══════════════════════════════════════════════════════════════
var INV_CATS=['Computadora','Laptop','Monitor','Impresora','Teléfono / Celular','Tablet','Silla','Escritorio','Mueble / Mobiliario','Aire acondicionado','Cámara / Seguridad','Router / Red','UPS / Batería','Herramienta','Vehículo','Otro'];
var INV_ESTADOS=['Nuevo','Bueno','Regular','Para reparar','Dañado'];

function _renderTabInventario(){
  var items = Array.isArray(S.inventarioOficina) ? S.inventarioOficina : [];
  var ed = window._invEdit ? items.find(function(x){return x.id===window._invEdit;}) : null;
  var v = function(s){ return (s==null?'':String(s)).replace(/"/g,'&quot;'); };
  var hoyISO = (typeof fechaLocalISO==='function') ? fechaLocalISO(new Date()) : new Date().toISOString().slice(0,10);
  var lineN = function(x){ return parseInt(x.cantidad,10)||0; };
  var lineV = function(x){ return (parseFloat(x.valorUnit)||0)*lineN(x); };
  var valorTotal = items.reduce(function(a,x){return a+lineV(x);},0);
  var unidades = items.reduce(function(a,x){return a+lineN(x);},0);

  var porCat={}; items.forEach(function(x){var c=x.categoria||'Otro'; if(!porCat[c])porCat[c]={n:0,val:0}; porCat[c].n+=lineN(x); porCat[c].val+=lineV(x);});
  var catKeys=Object.keys(porCat).sort(function(a,b){return porCat[b].val-porCat[a].val;});
  var catChips=catKeys.map(function(c){return '<span style="display:inline-flex;align-items:center;gap:7px;background:var(--surf2);border:1px solid var(--rim);border-radius:50px;padding:5px 12px;font-size:11px;font-weight:700;color:var(--ink2)">'+c+' <b style="color:var(--p1);font-family:var(--fd)">'+porCat[c].n+'</b> · <span style="font-family:var(--fd);color:var(--green)">'+fmt(porCat[c].val)+'</span></span>';}).join('');

  var optsCat = INV_CATS.map(function(c){return '<option value="'+c+'"'+((ed&&ed.categoria===c)?' selected':'')+'>'+c+'</option>';}).join('');
  var optsEst = INV_ESTADOS.map(function(s){var sel=ed?(ed.estado===s):(s==='Bueno'); return '<option value="'+s+'"'+(sel?' selected':'')+'>'+s+'</option>';}).join('');
  var ubicList = ['Oficina'];
  (S.concesionarios||[]).filter(function(c){return !c.eliminado;}).forEach(function(c){ ubicList.push('Concesionario: '+(c.nombre||c.id)); });
  ubicList.push('Otro lugar');
  if(ed && ed.ubicacion && ubicList.indexOf(ed.ubicacion)<0) ubicList.unshift(ed.ubicacion);
  var optsUbic = ubicList.map(function(u){var sel=ed?(ed.ubicacion===u):(u==='Oficina'); return '<option value="'+v(u)+'"'+(sel?' selected':'')+'>'+u+'</option>';}).join('');

  var rows = items.slice().sort(function(a,b){return lineV(b)-lineV(a);}).map(function(x){
    var cant=lineN(x), vu=parseFloat(x.valorUnit)||0, vt=lineV(x);
    var estCol=(x.estado==='Dañado'||x.estado==='Para reparar')?'var(--red)':(x.estado==='Regular'?'var(--amber)':'var(--green)');
    return '<tr>'
      +'<td class="tdm" style="font-weight:700">'+(x.nombre||'—')+(x.nota?'<div style="font-size:10px;color:var(--ink3);font-weight:500;white-space:normal;margin-top:2px">'+x.nota+'</div>':'')+'</td>'
      +'<td><span style="display:inline-block;background:var(--gs);color:var(--p1);font-size:10px;font-weight:700;padding:2px 9px;border-radius:50px;white-space:nowrap">'+(x.categoria||'Otro')+'</span></td>'
      +'<td class="tds" style="font-size:11px;color:var(--ink2)">'+(x.ubicacion||'—')+'</td>'
      +'<td style="text-align:center;font-family:var(--fd);font-weight:700">'+cant+'</td>'
      +'<td style="text-align:right;font-family:var(--fd);color:var(--ink2)">'+fmt(vu)+'</td>'
      +'<td style="text-align:right;font-family:var(--fd);font-weight:900;color:var(--ink)">'+fmt(vt)+'</td>'
      +'<td><span style="font-size:11px;font-weight:700;color:'+estCol+'">'+(x.estado||'—')+'</span></td>'
      +'<td class="tds" style="font-size:11px;color:var(--ink3);white-space:nowrap">'+(x.fecha||'—')+'</td>'
      +'<td style="white-space:nowrap;text-align:right"><div style="display:inline-flex;gap:4px"><button class="btn btn-g btn-xs" onclick="invEditar(\''+x.id+'\')">Editar</button><button class="btn btn-d btn-xs" onclick="invEliminar(\''+x.id+'\')" style="padding:4px 8px">✕</button></div></td>'
    +'</tr>';
  }).join('');

  return '<div>'
    // Resumen
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">'
      +'<div class="stat"><div class="st-v" style="color:var(--p1);font-size:24px">'+items.length+'</div><div class="st-l">Artículos</div><div style="font-size:10px;color:var(--ink3);margin-top:2px">Registros distintos</div></div>'
      +'<div class="stat"><div class="st-v" style="color:var(--ink);font-size:24px">'+unidades+'</div><div class="st-l">Unidades</div><div style="font-size:10px;color:var(--ink3);margin-top:2px">Suma de cantidades</div></div>'
      +'<div class="stat"><div class="st-v" style="color:var(--green);font-size:24px">'+fmt(valorTotal)+'</div><div class="st-l">Valor total</div><div style="font-size:10px;color:var(--ink3);margin-top:2px">Inventario valorizado</div></div>'
      +'<div class="stat"><div class="st-v" style="color:var(--amber);font-size:24px">'+catKeys.length+'</div><div class="st-l">Categorías</div><div style="font-size:10px;color:var(--ink3);margin-top:2px">En uso</div></div>'
    +'</div>'
    +(catChips?'<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px">'+catChips+'</div>':'')
    // Formulario agregar / editar
    +'<div class="card" style="margin-bottom:14px;border:'+(ed?'1.5px solid var(--p1)':'1px solid var(--rim)')+'">'
      +'<div class="ch"><div><div class="ct">'+(ed?'Editar artículo':'Agregar artículo')+'</div><div class="cs">'+(ed?'Modificá los datos y guardá los cambios':'Computadoras, impresoras, sillas, monitores, escritorios y más')+'</div></div></div>'
      +'<div class="fgr" style="grid-template-columns:repeat(3,1fr);gap:12px;margin-top:6px">'
        +'<div class="fg"><label>Artículo</label><input class="fi" id="inv-nombre" placeholder="Ej: Laptop Dell Latitude" value="'+(ed?v(ed.nombre):'')+'"></div>'
        +'<div class="fg"><label>Categoría</label><select class="fs" id="inv-cat">'+optsCat+'</select></div>'
        +'<div class="fg"><label>Ubicación · dónde está</label><select class="fs" id="inv-ubicacion">'+optsUbic+'</select></div>'
        +'<div class="fg"><label>Cantidad</label><input class="fi" id="inv-cant" type="number" min="1" step="1" value="'+(ed?(parseInt(ed.cantidad,10)||1):1)+'"></div>'
        +'<div class="fg"><label>Valor unitario (USD)</label><input class="fi" id="inv-valor" type="number" min="0" step="0.01" placeholder="0.00" value="'+(ed?(parseFloat(ed.valorUnit)||''):'')+'"></div>'
        +'<div class="fg"><label>Estado</label><select class="fs" id="inv-estado">'+optsEst+'</select></div>'
        +'<div class="fg"><label>Fecha de adquisición</label><input class="fi" id="inv-fecha" type="date" value="'+(ed&&ed.fecha?v(ed.fecha):hoyISO)+'"></div>'
        +'<div class="fg" style="grid-column:2/-1"><label>Nota / serial (opcional)</label><input class="fi" id="inv-nota" placeholder="Ej: Serial ABC123 · responsable" value="'+(ed?v(ed.nota):'')+'"></div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:12px">'
        +'<button class="btn btn-p btn-sm" onclick="invAgregar()" style="font-weight:800">'+(ed?'Guardar cambios':'＋ Agregar al inventario')+'</button>'
        +(ed?'<button class="btn btn-g btn-sm" onclick="invCancelarEdicion()">Cancelar</button>':'')
      +'</div>'
    +'</div>'
    // Tabla
    +'<div class="card">'
      +'<div class="ch"><div><div class="ct">Artículos registrados</div><div class="cs">'+items.length+' artículo'+(items.length!==1?'s':'')+' · valor total '+fmt(valorTotal)+'</div></div></div>'
      +(items.length
        ? '<div class="tw tw-compact" style="margin-top:6px"><table><thead><tr><th>Artículo</th><th>Categoría</th><th>Ubicación</th><th style="text-align:center">Cant.</th><th style="text-align:right">Valor unit.</th><th style="text-align:right">Valor total</th><th>Estado</th><th>Adquirido</th><th></th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td colspan="5" style="padding-top:10px;font-weight:800;border-top:2px solid var(--ink)">TOTAL INVENTARIO</td><td style="padding-top:10px;text-align:right;font-weight:900;font-family:var(--fd);color:var(--green);font-size:15px;border-top:2px solid var(--ink)">'+fmt(valorTotal)+'</td><td colspan="3" style="border-top:2px solid var(--ink)"></td></tr></tfoot></table></div>'
        : '<div style="text-align:center;padding:34px 12px;color:var(--ink3)"><div style="font-size:13px;font-weight:700;margin-bottom:4px">Aún no hay artículos registrados</div><div style="font-size:12px">Agregá tu primer activo de oficina con el formulario de arriba.</div></div>')
    +'</div>'
  +'</div>';
}

function invAgregar(){
  var g=function(id){var el=document.getElementById(id);return el?el.value:'';};
  var nombre=(g('inv-nombre')||'').trim();
  if(!nombre){ if(typeof toast==='function') toast('Ponle un nombre al artículo','warn'); return; }
  var cant=parseInt(g('inv-cant'),10); if(!cant||cant<1) cant=1;
  var valor=parseFloat(g('inv-valor'))||0;
  var fecha=g('inv-fecha')|| ((typeof fechaLocalISO==='function')?fechaLocalISO(new Date()):new Date().toISOString().slice(0,10));
  var obj={categoria:g('inv-cat')||'Otro', ubicacion:g('inv-ubicacion')||'Oficina', cantidad:cant, valorUnit:valor, fecha:fecha, estado:g('inv-estado')||'Bueno', nota:(g('inv-nota')||'').trim(), nombre:nombre};
  if(!Array.isArray(S.inventarioOficina)) S.inventarioOficina=[];
  if(window._invEdit){
    var it=S.inventarioOficina.find(function(x){return x.id===window._invEdit;});
    if(it){ it.nombre=obj.nombre; it.categoria=obj.categoria; it.ubicacion=obj.ubicacion; it.cantidad=obj.cantidad; it.valorUnit=obj.valorUnit; it.fecha=obj.fecha; it.estado=obj.estado; it.nota=obj.nota; }
    window._invEdit=null;
    if(typeof toast==='function') toast('Artículo actualizado','success');
  } else {
    obj.id='inv_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
    obj.creado=new Date().toISOString();
    S.inventarioOficina.push(obj);
    if(typeof toast==='function') toast('Artículo agregado al inventario','success');
  }
  if(typeof DB!=='undefined' && DB.saveInventarioOficina) DB.saveInventarioOficina();
  try{ localStorage.setItem('pagasi_inv_oficina', JSON.stringify(S.inventarioOficina)); }catch(e){}
  if(typeof logActividad==='function') logActividad('inventario','finanzas',nombre,'Inventario de oficina');
  S.reportesTab='inventario'; nav('reportes');
}
function invEditar(id){ window._invEdit=id; S.reportesTab='inventario'; nav('reportes'); setTimeout(function(){var el=document.getElementById('inv-nombre'); if(el){el.focus(); try{el.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){}}},120); }
function invCancelarEdicion(){ window._invEdit=null; S.reportesTab='inventario'; nav('reportes'); }
function invEliminar(id){
  if(!confirm('¿Eliminar este artículo del inventario de oficina?')) return;
  S.inventarioOficina=(S.inventarioOficina||[]).filter(function(x){return x.id!==id;});
  if(window._invEdit===id) window._invEdit=null;
  if(typeof DB!=='undefined' && DB.saveInventarioOficina) DB.saveInventarioOficina();
  try{ localStorage.setItem('pagasi_inv_oficina', JSON.stringify(S.inventarioOficina)); }catch(e){}
  if(typeof toast==='function') toast('Artículo eliminado','success');
  S.reportesTab='inventario'; nav('reportes');
}

// ══════════════════════════════════════════════════════════════
// TAB: CONTADOR — Reporte Semanal para el Contador
// IVA según LIVA Venezuela: arrendamiento con opción a compra
// = venta a plazos. Hecho imponible: cada cuota pagada o exigible.
// Base imponible: monto total de cada cuota (incluye capital + rendimiento).
// La inicial también es base imponible (es parte del precio de venta).
// Referencia: Art. 3 num. 14, Art. 13 num. 4 y Art. 20 LIVA Venezuela.
// ══════════════════════════════════════════════════════════════

// Estado de fechas del reporte (persiste en sesión)
var _contFechaIni = '';
var _contFechaFin = '';

function _contGetSemanaActual(){
  var hoy = new Date();
  var diaSem = hoy.getDay() || 7;
  var lunes = new Date(hoy); lunes.setDate(hoy.getDate() - diaSem + 1);
  var viernes = new Date(lunes); viernes.setDate(lunes.getDate() + 4);
  var toISO = function(d){ return d.toISOString().slice(0,10); };
  return { ini: toISO(lunes), fin: toISO(viernes) };
}

function _contCambiarFechas(){
  var ini = document.getElementById('cont_fecha_ini');
  var fin = document.getElementById('cont_fecha_fin');
  if(ini && fin){
    _contFechaIni = ini.value;
    _contFechaFin = fin.value;
  }
  // Re-renderizar solo el contenido del tab sin recargar todo
  var wrap = document.getElementById('cont_tab_body');
  if(wrap) wrap.innerHTML = _contGenerarCuerpo();
}
window._contCambiarFechas = _contCambiarFechas;

function _renderTabContador(ctx){
  // Inicializar fechas si no están seteadas
  if(!_contFechaIni || !_contFechaFin){
    var sem = _contGetSemanaActual();
    _contFechaIni = sem.ini;
    _contFechaFin = sem.fin;
  }

  var emp = (typeof getEmpresa === 'function') ? getEmpresa() : {};
  var tasaBCV = window._tasaBsGlobal || 1;

  var html = '';

  // ── Aviso legal IVA ──
  html += '<div style="background:#fff8e7;border:1px solid #e8c842;border-left:4px solid #c9a400;border-radius:8px;padding:12px 16px;font-size:11.5px;color:#7a5c00;line-height:1.65;margin-bottom:14px">'
    + '<strong>⚖ Base legal IVA aplicada (Art. 3 num.14 + Art. 13 num.4 LIVA Venezuela):</strong> El arrendamiento con opción a compra de bienes muebles se trata como <strong>venta a plazos</strong>. '
    + 'El hecho imponible ocurre en el momento en que se pague o sea exigible <strong>cada cuota</strong>. '
    + 'La <strong>base imponible es el monto total de cada cuota</strong> (capital + rendimiento financiero). '
    + 'La cuota inicial también es base imponible. El IVA de la moto ya pagado por tu empresa al importador/concesionario es tu <strong>crédito fiscal</strong> — regístralo para deducirlo del débito. '
    + 'Confirmar con el contador si el precio de venta ya incluye IVA o es más IVA.'
    + '</div>';

  // ── Selector de fechas ──
  var semLabel = _contFechaIni && _contFechaFin
    ? (new Date(_contFechaIni+'T12:00:00').toLocaleDateString('es-VE',{day:'2-digit',month:'long'}) + ' al ' + new Date(_contFechaFin+'T12:00:00').toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'}))
    : '—';

  html += '<div style="background:var(--surf);border:1px solid var(--rim2);border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">'
    + '<span style="font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px">Período:</span>'
    + '<input type="date" id="cont_fecha_ini" value="'+_contFechaIni+'" onchange="_contCambiarFechas()" style="border:1px solid var(--rim2);border-radius:6px;padding:6px 10px;font-size:12px;font-family:var(--fd);color:var(--ink);background:var(--bg)">'
    + '<span style="color:var(--ink3);font-size:12px">al</span>'
    + '<input type="date" id="cont_fecha_fin" value="'+_contFechaFin+'" onchange="_contCambiarFechas()" style="border:1px solid var(--rim2);border-radius:6px;padding:6px 10px;font-size:12px;font-family:var(--fd);color:var(--ink);background:var(--bg)">'
    + '<span style="font-size:11px;color:var(--ink3);margin-left:4px">'+semLabel+'</span>'
    + '<div style="margin-left:auto;display:flex;gap:8px">'
    + '<button class="btn btn-g btn-sm" onclick="_contadorExportarCSV()">⬇ CSV</button>'
    + '<button class="btn btn-p btn-sm" onclick="_contadorImprimir()">🖨 PDF</button>'
    + '</div>'
    + '</div>';

  // ── Header empresa ──
  html += '<div style="background:var(--ink);border-radius:10px;padding:14px 20px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">'
    + '<div>'
    + '<div style="font-size:16px;font-weight:900;color:#fff">Reporte Semanal · Contador</div>'
    + '<div style="font-size:11px;color:#aab;margin-top:3px">'+semLabel+'</div>'
    + '</div>'
    + '<div style="text-align:right;font-size:11px;color:#aab;line-height:1.8">'
    + '<strong style="color:#dde">'+(emp.nombre||'PAGASI')+'</strong><br>'
    + 'RIF: '+(emp.rif||'—')+'<br>'
    + 'Tasa BCV: <strong style="color:#e8c842">'+tasaBCV.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})+' Bs./$</strong>'
    + '</div>'
    + '</div>';

  // Contenedor del cuerpo dinámico
  html += '<div id="cont_tab_body">'+_contGenerarCuerpo()+'</div>';

  return html;
}

function _contGenerarCuerpo(){
  var tasaBCV = window._tasaBsGlobal || 1;
  var emp = (typeof getEmpresa === 'function') ? getEmpresa() : {};
  var fIni = _contFechaIni;
  var fFin = _contFechaFin;
  var IVA  = 0.16;
  var IGTF = 0.03; // 3% para SPE que cobran en divisas

  // Detectar si es SPE (usa config del Libro SENIAT si existe)
  var esSPE = (typeof _libroSeniatCfg !== 'undefined') ? (_libroSeniatCfg.esSPE || false) : false;

  // ── Helpers de estilo ──
  var th  = 'padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#aab;white-space:nowrap;text-align:left';
  var thR = 'padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#aab;white-space:nowrap;text-align:right';
  var td0 = 'padding:8px 12px;font-size:12px;border-bottom:1px solid var(--rim2)';
  var tdM = td0+';font-family:var(--fd)';
  var tdR = tdM+';text-align:right';
  var trH = 'background:var(--ink)';
  var card= 'background:var(--surf);border:1px solid var(--rim2);border-radius:10px;overflow:hidden;margin-bottom:4px';

  var chip2 = function(txt,col,bg){
    return '<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;background:'+(bg||'var(--'+col+'s)')+';color:var(--'+col+')">'+txt+'</span>';
  };
  var secHdr = function(n,t,s){
    return '<div style="display:flex;align-items:center;gap:10px;margin:18px 0 10px">'
      +'<span style="background:#e8ecff;color:var(--p1);font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;font-family:var(--fd)">'+n+'</span>'
      +'<div><div style="font-size:13px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.4px">'+t+'</div>'
      +(s?'<div style="font-size:10.5px;color:var(--ink3)">'+s+'</div>':'')+'</div></div>';
  };
  var fmtBs = function(n){ return 'Bs. '+Math.round(n||0).toLocaleString('es-VE'); };
  var fmtBCV = tasaBCV.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});

  // ── Normalizar fecha a YYYY-MM-DD para comparación segura ──
  var toISO = function(d){
    if(!d) return '';
    if(typeof d === 'string') return d.slice(0,10);
    if(d && d.toDate) return d.toDate().toISOString().slice(0,10); // Firestore Timestamp
    return new Date(d).toISOString().slice(0,10);
  };

  // ── Filtrar datos por período ──
  var pagosSemana = (S.pagos||[]).filter(function(p){
    var f = toISO(p.fecha);
    return !p.eliminado && p.estado==='confirmado' && f >= fIni && f <= fFin;
  }).sort(function(a,b){ return toISO(a.fecha).localeCompare(toISO(b.fecha)); });

  var egresosSemana = (S.egresos||[]).filter(function(e){
    var f = toISO(e.fecha);
    return !e.eliminado && f >= fIni && f <= fFin;
  }).sort(function(a,b){ return toISO(a.fecha).localeCompare(toISO(b.fecha)); });

  var contratosNuevos = (S.creds||[]).filter(function(c){
    var f = toISO(c.fecha);
    return !c.eliminado && f >= fIni && f <= fFin;
  });

  var credsMoraList = (S.creds||[]).filter(function(c){
    // Tambien los de estado 'mora' (los mas atrasados): antes el reporte los dejaba fuera
    return !c.eliminado && c.mora > 0 && (c.estado === 'activo' || c.estado === 'mora');
  }).sort(function(a,b){ return (b.mora||0)-(a.mora||0); });

  var motosAll = (S.motos||[]).filter(function(m){ return !m.eliminado; });

  // ── Detectar método de pago en divisas (para IGTF) ──
  var esMetodoDivisa = function(p){
    var m = (p.metodo||p.medio||'').toLowerCase();
    var cuentas = S.cuentas||[];
    var cuenta = cuentas.find(function(c){ return c.nombre && m.includes(c.nombre.toLowerCase()); });
    if(cuenta) return (cuenta.moneda||'').toLowerCase().includes('usd') || (cuenta.moneda||'').toLowerCase().includes('$');
    return /zelle|usdt|cripto|divisa|dólar|dollar|usd|\$/.test(m);
  };

  // ══════════════════════════════════════════════
  // CÁLCULO IVA + IGTF POR PAGO
  // IVA: solo cuotas (no inicial — compensada por crédito fiscal de compra moto)
  // IGTF 3%: si eres SPE y el pago es en divisas — sobre monto bruto
  // ══════════════════════════════════════════════
  var totCobrosUSD=0, totBaseIVA=0, totIVA=0, totIGTF=0, totInicialesUSD=0;

  var filasLibro = pagosSemana.map(function(p,idx){
    var monto  = parseFloat(p.monto||0);
    var esIni  = p.esInicial || p.tipoOperacion==='inicial_credito';
    var divisa = esMetodoDivisa(p);

    // IVA: cuotas sí, iniciales no (crédito fiscal de compra compensa)
    var base_iva = esIni ? 0 : monto/(1+IVA);
    var iva      = esIni ? 0 : monto - base_iva;

    // IGTF: 3% sobre el monto bruto si SPE + cobro en divisas
    var igtf = (esSPE && divisa) ? monto * IGTF : 0;

    totCobrosUSD += monto;
    totBaseIVA   += base_iva;
    totIVA       += iva;
    totIGTF      += igtf;
    if(esIni) totInicialesUSD += monto;

    var cli  = (S.clientes||[]).find(function(x){ return x.nombre===p.cli||String(x.id)===String(p.clienteId); })||{};
    var cred = (S.creds||[]).find(function(c){ return String(c.id)===String(p.credId||p.cred); })||{};
    var fac  = (S.facturas||[]).find(function(f){ return f.pagoId===p.id&&!f.anulada; });
    var ci   = cli.cedula||cli.rif||'—';
    var conc = esIni ? 'Inicial — crédito fiscal compra moto compensa IVA' : 'Cuota '+(p.numCuota||idx+1);

    var ivaCell  = esIni ? chip2('Crédito fiscal','green') : fmt(iva);
    var igtfCell = igtf>0 ? '<span style="color:var(--amber);font-weight:700">'+fmt(igtf)+'</span>' : (esSPE?'<span style="color:var(--ink3);font-size:10px">No divisa</span>':'—');
    var facBadge = fac ? chip2('✓ Emitida','green') : chip2('PENDIENTE','red');

    return '<tr style="border-bottom:1px solid var(--rim2)'+(esIni?';background:rgba(6,176,106,0.04)':'')+'">'
      +'<td style="'+td0+';font-family:var(--fd);color:var(--ink3)">'+(idx+1)+'</td>'
      +'<td style="'+tdM+'">'+toISO(p.fecha)+'</td>'
      +'<td style="'+tdM+';font-size:10.5px">'+(p.id||'—')+'</td>'
      +'<td style="'+td0+';font-weight:700">'+(p.cli||'—')+'</td>'
      +'<td style="'+tdM+';font-size:10.5px">'+ci+'</td>'
      +'<td style="'+tdM+';font-size:10.5px">'+(cred.id||p.credId||'—')+'</td>'
      +'<td style="'+td0+';font-size:11px">'+conc+'</td>'
      +'<td style="'+tdR+';font-weight:700">'+fmt(monto)+'</td>'
      +'<td style="'+tdR+'">'+(esIni?'—':fmt(base_iva))+'</td>'
      +'<td style="'+tdR+'">'+ivaCell+'</td>'
      +'<td style="'+tdR+'">'+igtfCell+'</td>'
      +'<td style="'+tdR+'">'+fmtBCV+'</td>'
      +'<td style="'+tdR+'">'+(esIni?'—':fmtBs(base_iva*tasaBCV))+'</td>'
      +'<td style="'+tdR+'">'+(esIni?'—':fmtBs(iva*tasaBCV))+'</td>'
      +'<td style="'+tdR+'">'+(igtf>0?fmtBs(igtf*tasaBCV):'—')+'</td>'
      +'<td style="'+td0+'">'+(p.metodo||p.medio||'—')+'</td>'
      +'<td style="'+td0+'">'+facBadge+'</td>'
      +'</tr>';
  }).join('');

  // ── Totales derivados ──
  var totalEgresosSem      = egresosSemana.reduce(function(a,e){ return a+(e.monto||0); },0);
  var totalInicialesSemana = contratosNuevos.reduce(function(a,c){ return a+(parseFloat(c.ini)||0); },0);
  var credsMoraTotal       = credsMoraList.reduce(function(a,c){
    return a+(parseFloat(c.cuotaQ||c.cuota||0)*Math.max(0,Math.floor(c.mora/15)));
  },0);
  var ivaCredMotosPeriodo  = contratosNuevos.reduce(function(a,c){
    var p=parseFloat(c.precioBaseReal||c.precio||0); return a+(p-p/1.16);
  },0);
  var ivaNetoUSD = Math.max(0, totIVA - ivaCredMotosPeriodo);

  var html = '';

  // ════ 01 KPIs ════
  html += secHdr('01','Resumen Financiero del Período','Datos reales · IVA solo cuotas · IGTF si SPE');
  html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:4px">';
  [
    {lbl:'Cobros Brutos',         val:fmt(totCobrosUSD),   sub:pagosSemana.length+' pagos confirmados',              col:'p1'},
    {lbl:'IVA Débito (cuotas)',   val:fmt(totIVA),         sub:fmtBs(totIVA*tasaBCV),                               col:'amber'},
    {lbl:'IGTF 3% '+(esSPE?'(SPE)':'(no SPE)'), val:fmt(totIGTF), sub:esSPE?fmtBs(totIGTF*tasaBCV):'Config. en Libro SENIAT', col:esSPE?'amber':'ink3'},
    {lbl:'Contratos Nuevos',      val:contratosNuevos.length, sub:'Iniciales: '+fmt(totalInicialesSemana),           col:'green'},
    {lbl:'Cartera Morosa',        val:credsMoraList.length,   sub:fmt(credsMoraTotal)+' saldo vencido',              col:'red'},
  ].forEach(function(k){
    html += '<div style="background:var(--surf);border:1px solid var(--rim2);border-radius:10px;padding:14px 16px;position:relative;overflow:hidden">'
      +'<div style="position:absolute;top:0;left:0;right:0;height:3px;background:var(--'+k.col+')"></div>'
      +'<div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.7px;margin-bottom:7px">'+k.lbl+'</div>'
      +'<div style="font-family:var(--fd);font-size:20px;font-weight:900;color:var(--'+k.col+')">'+k.val+'</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-top:3px">'+k.sub+'</div>'
      +'</div>';
  });
  html += '</div>';

  // ════ 02 LIBRO DE COBROS ════
  html += secHdr('02','Libro de Cobros — Ingresos del Período','IVA: cuotas / 1.16 · Inicial: crédito fiscal compensa · IGTF: 3% cobros en divisas si SPE');
  html += '<div style="'+card+'"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11.5px">'
    +'<thead><tr style="'+trH+'">'
    +'<th style="'+th+'">#</th><th style="'+th+'">Fecha</th><th style="'+th+'">Recibo</th>'
    +'<th style="'+th+'">Cliente</th><th style="'+th+'">CI/RIF</th><th style="'+th+'">Contrato</th>'
    +'<th style="'+th+'">Concepto</th>'
    +'<th style="'+thR+'">USD Cobrado</th><th style="'+thR+'">Base IVA USD</th><th style="'+thR+'">IVA 16%</th>'
    +'<th style="'+thR+'">IGTF 3%</th>'
    +'<th style="'+thR+'">Tasa BCV</th><th style="'+thR+'">Base IVA Bs.</th><th style="'+thR+'">IVA Bs.</th><th style="'+thR+'">IGTF Bs.</th>'
    +'<th style="'+th+'">Método</th><th style="'+th+'">Factura</th>'
    +'</tr></thead><tbody>'
    +(pagosSemana.length ? filasLibro : '<tr><td colspan="17" style="text-align:center;padding:24px;color:var(--ink3)">Sin cobros en el período seleccionado</td></tr>')
    +'</tbody>'
    +'<tfoot><tr style="'+trH+'">'
    +'<td colspan="7" style="padding:10px 12px;color:#fff;font-weight:700">TOTAL PERÍODO</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#fff;font-weight:900;font-family:var(--fd)">'+fmt(totCobrosUSD)+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#dde;font-family:var(--fd)">'+fmt(totBaseIVA)+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:var(--amber);font-weight:900;font-family:var(--fd)">'+fmt(totIVA)+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:var(--amber);font-weight:900;font-family:var(--fd)">'+(totIGTF>0?fmt(totIGTF):(esSPE?'$0.00':'N/A'))+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#aab">—</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#dde;font-family:var(--fd)">'+fmtBs(totBaseIVA*tasaBCV)+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:var(--amber);font-weight:900;font-family:var(--fd)">'+fmtBs(totIVA*tasaBCV)+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:var(--amber);font-weight:900;font-family:var(--fd)">'+(totIGTF>0?fmtBs(totIGTF*tasaBCV):'—')+'</td>'
    +'<td colspan="2"></td>'
    +'</tr></tfoot>'
    +'</table></div></div>';

  // ════ 03 TRIBUTARIO SENIAT ════
  html += secHdr('03','Cálculo Tributario SENIAT','IVA · IGTF · Crédito fiscal · ISLR');
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">';

  // BOX IVA + IGTF
  html += '<div style="background:var(--surf);border:1px solid var(--rim2);border-radius:10px;padding:16px 18px">'
    +'<div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--rim2)">IVA + IGTF — Período</div>'
    +_contRow('Cobros brutos período',                fmt(totCobrosUSD),            'ink2')
    +_contRow('Iniciales cobradas (sin IVA neto)',    fmt(totInicialesUSD),         'green')
    +_contRow('Base imponible IVA (cuotas)',          fmt(totBaseIVA),              'ink2')
    +_contRow('(+) IVA débito fiscal 16%',           fmt(totIVA),                  'amber')
    +_contRow('(−) Crédito fiscal motos (estimado)', fmt(ivaCredMotosPeriodo),     'green')
    +'<div style="margin-top:10px;background:var(--ink);color:#fff;border-radius:7px;padding:10px 14px;margin-bottom:10px">'
    +'<div style="font-size:10px;color:#aab;margin-bottom:3px">IVA NETO A PAGAR (estimado)</div>'
    +'<div style="font-family:var(--fd);font-size:16px;font-weight:900">'+fmt(ivaNetoUSD)+'</div>'
    +'<div style="font-size:10.5px;color:#aab">'+fmtBs(ivaNetoUSD*tasaBCV)+' · Usar facturas reales del concesionario</div>'
    +'</div>'
    +(esSPE
      ? _contRow('(+) IGTF 3% cobros en divisas', fmt(totIGTF), 'amber')
        +'<div style="margin-top:8px;background:rgba(245,166,35,0.1);border:1px solid rgba(245,166,35,0.3);border-radius:6px;padding:9px 12px;font-size:10.5px;color:var(--ink2);line-height:1.6">'
        +'⚠ <strong>IGTF (3%):</strong> Como Sujeto Pasivo Especial debes percibir el IGTF en cada cobro en divisas y enterarlo al SENIAT quincenalmente. Declarar en forma F-99035.'
        +'</div>'
      : '<div style="margin-top:8px;background:var(--surf2);border-radius:6px;padding:9px 12px;font-size:10.5px;color:var(--ink3);line-height:1.6">'
        +'ℹ <strong>IGTF:</strong> Solo aplica si eres Sujeto Pasivo Especial (SPE). Actívalo en <em>Finanzas → Libro SENIAT → Configuración fiscal</em> si el SENIAT te calificó como SPE.'
        +'</div>')
    +'<div style="font-size:10px;color:var(--ink3);margin-top:8px">Declaración IVA: primeros 15 días del mes siguiente · Form-30 SENIAT</div>'
    +'</div>';

  // BOX ISLR
  var ingMesAct = (S.pagos||[]).filter(function(p){
    var f=toISO(p.fecha); var hoy=new Date(); var y=hoy.getFullYear(),m=hoy.getMonth();
    return !p.eliminado&&p.estado==='confirmado'&&f&&new Date(f).getFullYear()===y&&new Date(f).getMonth()===m;
  }).reduce(function(a,p){ return a+(p.monto||0); },0);
  var egMesAct = (S.egresos||[]).filter(function(e){
    var f=toISO(e.fecha); var hoy=new Date(); var y=hoy.getFullYear(),m=hoy.getMonth();
    return !e.eliminado&&f&&new Date(f).getFullYear()===y&&new Date(f).getMonth()===m;
  }).reduce(function(a,e){ return a+(e.monto||0); },0);
  var utilMes = ingMesAct - egMesAct;
  var provISLR = Math.max(0, utilMes*12*0.34);

  html += '<div style="background:var(--surf);border:1px solid var(--rim2);border-radius:10px;padding:16px 18px">'
    +'<div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--rim2)">ISLR — Proyección mes actual</div>'
    +_contRow('Ingresos mes en curso',         fmt(ingMesAct),   'p1')
    +_contRow('Egresos mes en curso',          fmt(egMesAct),    'red')
    +_contRow('Utilidad neta estimada mes',    fmt(utilMes),     utilMes>=0?'green':'red')
    +_contRow('Anualizado (×12)',              fmt(utilMes*12),  'ink2')
    +_contRow('Tasa ISLR societaria',          '34%',            'ink3')
    +'<div style="margin-top:10px;background:var(--ink);color:#fff;border-radius:7px;padding:10px 14px">'
    +'<div style="font-size:10px;color:#aab;margin-bottom:3px">PROVISIÓN ISLR anual estimada</div>'
    +'<div style="font-family:var(--fd);font-size:16px;font-weight:900">'+fmt(provISLR)+'</div>'
    +'</div>'
    +'<div style="font-size:10px;color:var(--ink3);margin-top:8px;line-height:1.55">Declaración anual hasta 31/03 · Deducciones: depreciación motos + honorarios bufete + seguros + gastos operativos</div>'
    +'</div>';
  html += '</div>';

  // ════ 04 MORA ════
  html += secHdr('04','Cartera Morosa — Estado Actual','Alerta: +30 días → Art. 599 CPC — secuestro del bien');
  html += '<div style="'+card+'"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="'+trH+'">'
    +'<th style="'+th+'">Cliente</th><th style="'+th+'">CI</th><th style="'+th+'">Contrato</th>'
    +'<th style="'+th+'">Moto</th><th style="'+thR+'">Canon Q</th>'
    +'<th style="'+thR+'">Días Mora</th><th style="'+thR+'">Cuotas Venc.</th>'
    +'<th style="'+thR+'">Saldo Vencido</th><th style="'+thR+'">Interés 2.5%</th>'
    +'<th style="'+th+'">Nivel</th><th style="'+th+'">Acción requerida</th>'
    +'</tr></thead><tbody>';

  var totMoraUSD=0, totIntUSD=0;
  if(!credsMoraList.length){
    html += '<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--green);font-weight:700">✓ Sin créditos en mora</td></tr>';
  } else {
    credsMoraList.forEach(function(c){
      var cli=(S.clientes||[]).find(function(x){ return x.nombre===c.cli; })||{};
      var cuotaV=parseFloat(c.cuotaQ||c.cuota||0);
      var cVenc=Math.max(0,Math.floor(c.mora/15));
      var saldo=cuotaV*cVenc, int=saldo*0.025;
      totMoraUSD+=saldo; totIntUSD+=int;
      var nivel,nc,nb,accion;
      if(c.mora>30){nivel='Crítico +30d';nc='red';nb='var(--reds)';accion='⚖ Acción judicial — contactar bufete hoy';}
      else if(c.mora>14){nivel='Alto 16-30d';nc='amber';nb='var(--ambers)';accion='📄 Carta formal de mora + reestructuración';}
      else{nivel='Moderado 1-14d';nc='ink3';nb='var(--surf2)';accion='📱 WhatsApp + llamada referencias';}
      html+='<tr style="border-bottom:1px solid var(--rim2)">'
        +'<td style="'+td0+';font-weight:700">'+c.cli+'</td>'
        +'<td style="'+tdM+';font-size:10.5px">'+(cli.cedula||'—')+'</td>'
        +'<td style="'+tdM+';font-size:10.5px">'+(c.id||'—')+'</td>'
        +'<td style="'+td0+'">'+(c.modelo||'—')+'</td>'
        +'<td style="'+tdR+'">'+fmt(cuotaV)+'</td>'
        +'<td style="'+tdR+';font-weight:900;color:var(--'+nc+')">'+c.mora+'</td>'
        +'<td style="'+tdR+'">'+cVenc+'</td>'
        +'<td style="'+tdR+';font-weight:700">'+fmt(saldo)+'</td>'
        +'<td style="'+tdR+';color:var(--amber)">'+fmt(int)+'</td>'
        +'<td style="'+td0+'"><span style="background:'+nb+';color:var(--'+nc+');padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700">'+nivel+'</span></td>'
        +'<td style="'+td0+';font-size:11px">'+accion+'</td>'
        +'</tr>';
    });
  }
  html+='</tbody><tfoot><tr style="'+trH+'">'
    +'<td colspan="7" style="padding:10px 12px;color:#fff;font-weight:700">TOTAL CARTERA VENCIDA</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#fff;font-weight:900;font-family:var(--fd)">'+fmt(totMoraUSD)+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:var(--amber);font-weight:700">'+fmt(totIntUSD)+'</td>'
    +'<td colspan="2"></td>'
    +'</tr></tfoot></table></div></div>';

  // ════ 05 CONTRATOS NUEVOS ════
  html += secHdr('05','Contratos Nuevos — Aperturados en el Período','IVA moto pagado al concesionario = crédito fiscal tuyo');
  html += '<div style="'+card+'"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="'+trH+'">'
    +'<th style="'+th+'">Fecha</th><th style="'+th+'">N° Contrato</th><th style="'+th+'">Cliente</th>'
    +'<th style="'+th+'">Moto</th><th style="'+th+'">VIN</th>'
    +'<th style="'+thR+'">Precio Moto</th><th style="'+thR+'">Crédito Fiscal (IVA moto)</th>'
    +'<th style="'+thR+'">Inicial Cobrada</th><th style="'+thR+'">Saldo Financiar</th>'
    +'<th style="'+th+'">Plazo</th><th style="'+th+'">Notaría</th>'
    +'</tr></thead><tbody>';

  var totIni=0,totCredFiscal=0,totFin2=0;
  if(!contratosNuevos.length){
    html+='<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--ink3)">Sin contratos nuevos en el período</td></tr>';
  } else {
    contratosNuevos.forEach(function(c){
      var ini=parseFloat(c.ini||0);
      var precio=parseFloat(c.precioBaseReal||c.precio||0);
      var credFisc=precio-precio/1.16;
      totIni+=ini; totCredFiscal+=credFisc; totFin2+=parseFloat(c.fin||0);
      var not=c.notariaOk?chip2('✓ Autenticado','green'):chip2('PENDIENTE','red');
      html+='<tr style="border-bottom:1px solid var(--rim2)">'
        +'<td style="'+tdM+'">'+toISO(c.fecha)+'</td>'
        +'<td style="'+tdM+';font-weight:700">'+(c.id||'—')+'</td>'
        +'<td style="'+td0+';font-weight:700">'+c.cli+'</td>'
        +'<td style="'+td0+'">'+(c.modelo||'—')+'</td>'
        +'<td style="'+tdM+';font-size:10px">'+(c.vin||c.serialChasis||'—')+'</td>'
        +'<td style="'+tdR+'">'+fmt(precio)+'</td>'
        +'<td style="'+tdR+';color:var(--green);font-weight:700">'+fmt(credFisc)+'</td>'
        +'<td style="'+tdR+';font-weight:700">'+fmt(ini)+'</td>'
        +'<td style="'+tdR+'">'+fmt(c.fin||0)+'</td>'
        +'<td style="'+td0+'">'+(c.plazo||'—')+' m</td>'
        +'<td style="'+td0+'">'+not+'</td>'
        +'</tr>';
    });
  }
  html+='</tbody><tfoot><tr style="'+trH+'">'
    +'<td colspan="5" style="padding:10px 12px;color:#fff;font-weight:700">TOTALES</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#dde;font-family:var(--fd)">—</td>'
    +'<td style="padding:10px 12px;text-align:right;color:var(--green);font-weight:900;font-family:var(--fd)">'+fmt(totCredFiscal)+' crédito</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#fff;font-weight:900;font-family:var(--fd)">'+fmt(totIni)+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#dde;font-family:var(--fd)">'+fmt(totFin2)+'</td>'
    +'<td colspan="2"></td>'
    +'</tr></tfoot></table></div></div>';

  // ════ 06 INVENTARIO MOTOS ════
  html += secHdr('06','Inventario de Motocicletas','Estado · seguros · contrato activo');
  html += '<div style="'+card+'"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="'+trH+'">'
    +'<th style="'+th+'">VIN / Serial</th><th style="'+th+'">Marca / Modelo</th>'
    +'<th style="'+th+'">Año</th><th style="'+th+'">Placa</th>'
    +'<th style="'+thR+'">Costo Adq.</th><th style="'+th+'">Estado</th>'
    +'<th style="'+th+'">Contrato</th><th style="'+th+'">Cliente</th><th style="'+th+'">Seguro Vence</th>'
    +'</tr></thead><tbody>';

  var hoyStr=new Date().toISOString().slice(0,10);
  var en30=new Date(new Date().getTime()+30*86400000).toISOString().slice(0,10);
  if(!motosAll.length){
    html+='<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--ink3)">Sin motos registradas</td></tr>';
  } else {
    motosAll.forEach(function(m){
      var ec=m.estado==='disponible'?'green':m.estado==='financiada'?'p1':(m.estado==='recuperada'||m.estado==='recuperado')?'amber':'ink3';
      var cred=(S.creds||[]).find(function(c){ return String(c.motoId)===String(m.id)&&c.estado==='activo'; });
      var sv=m.seguroVence||'—';
      var scol=sv==='—'?'var(--ink3)':sv<hoyStr?'var(--red)':sv<=en30?'var(--amber)':'var(--green)';
      html+='<tr style="border-bottom:1px solid var(--rim2)">'
        +'<td style="'+tdM+';font-size:10px">'+(m.vin||m.serialChasis||'—')+'</td>'
        +'<td style="'+td0+';font-weight:700">'+(m.marca||'')+' '+(m.modelo||'')+'</td>'
        +'<td style="'+tdM+'">'+(m.anio||'—')+'</td>'
        +'<td style="'+tdM+'">'+(m.placa||'—')+'</td>'
        +'<td style="'+tdR+'">'+fmt(m.precio||m.costo||0)+'</td>'
        +'<td style="'+td0+'"><span class="bdg b-'+ec+'">'+((m.estado||'—').toUpperCase())+'</span></td>'
        +'<td style="'+tdM+';font-size:10.5px">'+(cred?cred.id:'—')+'</td>'
        +'<td style="'+td0+'">'+(cred?cred.cli:'—')+'</td>'
        +'<td style="'+tdM+';color:'+scol+'">'+sv+'</td>'
        +'</tr>';
    });
  }
  html+='</tbody></table></div></div>';

  // ════ 07 EGRESOS ════
  html += secHdr('07','Egresos / Gastos del Período','Todos deducibles ISLR con comprobante');
  html += '<div style="'+card+'"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="'+trH+'">'
    +'<th style="'+th+'">Fecha</th><th style="'+th+'">Descripción</th><th style="'+th+'">Categoría</th>'
    +'<th style="'+thR+'">Monto USD</th><th style="'+thR+'">Monto Bs.</th><th style="'+th+'">Referencia</th>'
    +'</tr></thead><tbody>';

  var totEgUSD=0,totEgBs=0;
  if(!egresosSemana.length){
    html+='<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--ink3)">Sin egresos en el período</td></tr>';
  } else {
    egresosSemana.forEach(function(e){
      var bs2=(e.monto||0)*tasaBCV; totEgUSD+=(e.monto||0); totEgBs+=bs2;
      html+='<tr style="border-bottom:1px solid var(--rim2)">'
        +'<td style="'+tdM+'">'+toISO(e.fecha)+'</td>'
        +'<td style="'+td0+';font-weight:600">'+(e.concepto||e.descripcion||'—')+'</td>'
        +'<td style="'+td0+'"><span style="background:var(--surf2);color:var(--ink3);padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700">'+(e.categoria||e.tipo||'Otros')+'</span></td>'
        +'<td style="'+tdR+';font-weight:700">'+fmt(e.monto||0)+'</td>'
        +'<td style="'+tdR+'">'+fmtBs(bs2)+'</td>'
        +'<td style="'+tdM+';font-size:10.5px">'+(e.referencia||e.comprobante||'—')+'</td>'
        +'</tr>';
    });
  }
  html+='</tbody><tfoot><tr style="'+trH+'">'
    +'<td colspan="3" style="padding:10px 12px;color:#fff;font-weight:700">TOTAL EGRESOS</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#fff;font-weight:900;font-family:var(--fd)">'+fmt(totEgUSD)+'</td>'
    +'<td style="padding:10px 12px;text-align:right;color:#dde;font-family:var(--fd)">'+fmtBs(totEgBs)+'</td>'
    +'<td></td>'
    +'</tr></tfoot></table></div></div>';

  // ════ 08 ALERTAS LEGALES ════
  var alertas=[];
  credsMoraList.forEach(function(c){
    var cuotaV=parseFloat(c.cuotaQ||c.cuota||0), cVenc=Math.max(0,Math.floor(c.mora/15));
    var niv,tip,acc,pla;
    if(c.mora>30){niv='CRÍTICO';tip='JUDICIAL';acc='Art. 599 CPC — solicitar secuestro del bien al bufete';pla='Inmediato';}
    else if(c.mora>14){niv='PENDIENTE';tip='COBRANZA';acc='Emitir carta formal de mora + propuesta reestructuración';pla='3 días hábiles';}
    else{niv='EN GESTIÓN';tip='COBRANZA';acc='Contacto WhatsApp + verificar referencias';pla='7 días';}
    alertas.push({ct:(c.id||'—')+' / '+c.cli, al:c.mora+'d mora · Saldo vencido: '+fmt(cuotaV*cVenc), tip, pla, est:niv, res:c.mora>30?'Bufete':'Administrador'});
  });
  var sinFac=pagosSemana.filter(function(p){ return !(S.facturas||[]).find(function(f){ return f.pagoId===p.id&&!f.anulada; }); });
  if(sinFac.length) alertas.push({ct:'SENIAT',al:sinFac.length+' cobro(s) sin factura fiscal emitida',tip:'TRIBUTARIO',pla:'Antes declaración IVA',est:'URGENTE',res:'Contador'});
  contratosNuevos.forEach(function(c){ if(!c.notariaOk) alertas.push({ct:(c.id||'—')+' / '+c.cli,al:'Autenticar ante Notaría Pública (Art. 599 CPC requiere documento autenticado)',tip:'LEGAL',pla:'7 días hábiles',est:'PENDIENTE',res:'Administrador'}); });
  motosAll.forEach(function(m){
    if(m.seguroVence){
      var diff3=(new Date(m.seguroVence)-new Date())/86400000;
      if(diff3<30) alertas.push({ct:'Moto '+(m.placa||m.vin),al:'Seguro RC vence '+m.seguroVence+(diff3<0?' — VENCIDO':' — '+Math.round(diff3)+'d'),tip:'SEGURO',pla:m.seguroVence,est:diff3<0?'CRÍTICO':'AVISAR',res:'Administrador'});
    }
  });

  html += secHdr('08','Alertas Legales y Documentación Pendiente','');
  html += '<div style="'+card+'"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
    +'<thead><tr style="'+trH+'">'
    +'<th style="'+th+'">Cliente / Contrato</th><th style="'+th+'">Alerta</th>'
    +'<th style="'+th+'">Tipo</th><th style="'+th+'">Plazo</th><th style="'+th+'">Estado</th><th style="'+th+'">Responsable</th>'
    +'</tr></thead><tbody>';
  if(!alertas.length){
    html+='<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--green);font-weight:700">✓ Sin alertas pendientes</td></tr>';
  } else {
    alertas.forEach(function(a){
      var sc=(a.est==='CRÍTICO'||a.est==='URGENTE')?'var(--reds);color:var(--red)':a.est==='PENDIENTE'?'var(--ambers);color:var(--amber)':'var(--surf2);color:var(--ink3)';
      var tc=a.tip==='JUDICIAL'?'var(--reds);color:var(--red)':a.tip==='TRIBUTARIO'?'var(--ambers);color:var(--amber)':a.tip==='LEGAL'?'#e8ecff;color:var(--p1)':'var(--surf2);color:var(--ink3)';
      html+='<tr style="border-bottom:1px solid var(--rim2)">'
        +'<td style="'+td0+';font-weight:700">'+a.ct+'</td>'
        +'<td style="'+td0+';font-size:11px">'+a.al+'</td>'
        +'<td style="'+td0+'"><span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;background:'+tc+'">'+a.tip+'</span></td>'
        +'<td style="'+tdM+'">'+(a.pla||'—')+'</td>'
        +'<td style="'+td0+'"><span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;background:'+sc+'">'+a.est+'</span></td>'
        +'<td style="'+td0+'">'+a.res+'</td>'
        +'</tr>';
    });
  }
  html+='</tbody></table></div></div>';

  // ════ 09 RESUMEN EJECUTIVO ════
  html += secHdr('09','Resumen Ejecutivo y Firma','');
  var criticos=alertas.filter(function(a){ return a.est==='CRÍTICO'||a.est==='URGENTE'; }).length;
  var semLbl2=fIni&&fFin?(new Date(fIni+'T12:00:00').toLocaleDateString('es-VE',{day:'2-digit',month:'long'})+' al '+new Date(fFin+'T12:00:00').toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'})):'—';
  html+='<div style="background:var(--surf);border:1px solid var(--rim2);border-radius:10px;padding:16px 20px;margin-bottom:16px;font-size:12px;line-height:1.85;color:var(--ink2)">'
    +'Período <strong>'+semLbl2+'</strong> · '
    +'Cobros: <strong>'+fmt(totCobrosUSD)+'</strong> ('+pagosSemana.length+' pagos) · '
    +'IVA débito: <strong>'+fmt(totIVA)+'</strong> · '
    +(esSPE?'IGTF: <strong>'+fmt(totIGTF)+'</strong> · ':'')
    +'IVA neto estimado: <strong>'+fmt(ivaNetoUSD)+'</strong> · '
    +'Tasa BCV: <strong>'+fmtBCV+'</strong><br>'
    +'Contratos nuevos: <strong>'+contratosNuevos.length+'</strong> · Iniciales: <strong>'+fmt(totalInicialesSemana)+'</strong> · '
    +'Egresos: <strong>'+fmt(totEgUSD)+'</strong> · '
    +'Mora: <strong>'+credsMoraList.length+'</strong> cliente(s) · <strong>'+fmt(totMoraUSD)+'</strong> vencido<br>'
    +(criticos>0?'<strong style="color:var(--red)">⚠ '+criticos+' alerta(s) crítica(s) requieren acción inmediata.</strong>':'<span style="color:var(--green)">✓ Sin alertas críticas este período.</span>')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px">'
    +'<div style="border-top:1px solid var(--ink2);padding-top:10px;font-size:11px;color:var(--ink3);text-align:center;line-height:1.9"><strong style="color:var(--ink2);font-size:12px">Preparado por</strong><br>Responsable Administrativo<br>Nombre: _________________________<br>Firma: _________________________</div>'
    +'<div style="border-top:1px solid var(--ink2);padding-top:10px;font-size:11px;color:var(--ink3);text-align:center;line-height:1.9"><strong style="color:var(--ink2);font-size:12px">Revisado por</strong><br>Contador / Asesor Tributario<br>Nombre: _________________________<br>Inprecontador N°: _________________________</div>'
    +'</div>';

  return html;
}

// Helper row cajas tributarias
function _contRow(lbl, val, col){
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px dashed var(--rim2);font-size:12px">'
    + '<span style="color:var(--ink2)">'+lbl+'</span>'
    + '<span style="font-family:var(--fd);font-weight:700;color:var(--'+col+')">'+val+'</span>'
    + '</div>';
}

// Imprimir
function _contadorImprimir(){
  var wrap = document.getElementById('cont_tab_body');
  var header = document.querySelector('[data-cont-header]');
  var contenido = (header?header.outerHTML:'') + (wrap?wrap.innerHTML:'<p>Error cargando contenido</p>');
  var estilos='body{font-family:Arial,sans-serif;padding:20px;color:#111;font-size:11px}'
    +'table{width:100%;border-collapse:collapse}th,td{padding:5px 8px;border-bottom:1px solid #eee}'
    +'th{background:#0a0f1e;color:#dde;font-size:9px;text-transform:uppercase}'
    +'@media print{button{display:none!important}}';
  var w=window.open('','_blank','width=1100,height=800');
  w.document.write('<html><head><title>Reporte Contador · PAGASI</title><style>'+estilos+'</style></head><body>'+contenido+'<br><button onclick="window.print()" style="background:#1a2eff;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;margin-top:12px">🖨 Imprimir / PDF</button><script>setTimeout(function(){window.print();},600);<\/script></body></html>');
  w.document.close();
}
window._contadorImprimir = _contadorImprimir;

// Exportar CSV
function _contadorExportarCSV(){
  var tasaBCV=window._tasaBsGlobal||1;
  var fIni=_contFechaIni, fFin=_contFechaFin;
  var pagos=(S.pagos||[]).filter(function(p){ return !p.eliminado&&p.estado==='confirmado'&&p.fecha&&p.fecha>=fIni&&p.fecha<=fFin; });
  var rows=[['Fecha','Recibo','Cliente','Contrato','Concepto','Cobrado_USD','Base_IVA_USD','IVA_16_USD','Tasa_BCV','Base_IVA_Bs','IVA_Bs','Metodo_Pago']];
  pagos.forEach(function(p){
    var m=p.monto||0, base=m/1.16, iva=m-base, bs=m*tasaBCV, baseBs=base*tasaBCV, ivaBs=iva*tasaBCV;
    var esIni=p.esInicial||p.tipoOperacion==='inicial_credito';
    rows.push([p.fecha||'',p.id||'',p.cli||'',p.credId||p.cred||'',esIni?'Inicial':'Cuota',m.toFixed(2),base.toFixed(2),iva.toFixed(2),tasaBCV.toFixed(2),baseBs.toFixed(2),ivaBs.toFixed(2),p.metodo||p.medio||'']);
  });
  var csv=rows.map(function(r){ return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
  var toISO=function(d){ return d.toISOString().slice(0,10); };
  var a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download='PAGASI_Contador_'+fIni+'_'+fFin+'.csv'; a.click();
}
window._contadorExportarCSV = _contadorExportarCSV;
