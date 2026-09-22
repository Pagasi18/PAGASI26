// Pagasi module: creditos
PG.creditos = function(){
  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA CRÉDITOS PRO · Análisis completo de cartera
  // ══════════════════════════════════════════════════════════════════════════

  // ─── 1. MÉTRICAS CANÓNICAS ───
  const allCreds = _concFiltrar(S.creds||[]).filter(c=>!c.eliminado);
  const registradosCreds = allCreds.filter(c=>c.estado!=='cancelado');
  // Un credito en mora sigue siendo activo (no esta pagado): se cuenta igual que en el
  // dashboard, Cobranza y Cuentas. El sistema le pone estado 'mora' al pasar los dias de
  // gracia, y esta pantalla los dejaba fuera de Activos y de En mora (Adam, 14-sep-2026:
  // aqui 524 activos y 26 en mora contra 556 y 58 en el dashboard).
  const activos = allCreds.filter(c=>c.estado==='activo'||c.estado==='mora');
  const enMora = activos.filter(c=>c.mora>0);
  const alDia = activos.filter(c=>!(c.mora>0));
  const completados= allCreds.filter(c=>c.estado==='completado');
  const recuperados= allCreds.filter(c=>c.estado==='recuperado'||c.estado==='recuperada');
  const cancelados = allCreds.filter(c=>c.estado==='cancelado');

  // ─── 2. VALORES FINANCIEROS ───
  const carteraViva = activos.reduce((a,c)=>a+getCreditoSaldoPendiente(c),0);
  const cuotaEspQuincena = activos.reduce((a,c)=>a+parseFloat(c.cuotaQ||c.cuota||0),0);
  const cuotaEspMes = cuotaEspQuincena*2;
  const valorTotal = registradosCreds.reduce((a,c)=>a+parseFloat(c.total||0),0);
  const cobradoAll = allCreds.reduce((a,c)=>a+getCreditoPagosConfirmados(c),0);
  const inicialAll = getTotalInicialesCobradas();
  const pctRecaudado = valorTotal>0 ? Math.round(((cobradoAll+inicialAll)/(valorTotal+inicialAll))*100) : 0;

  // Capital desembolsado vs spread (intereses) proyectado
  const precioBaseTotal = registradosCreds.reduce((a,c)=>a+parseFloat(c.precioBaseReal||c.precio||0),0);
  const totalACobrarReg = registradosCreds.reduce((a,c)=>a+parseFloat(c.total||0),0);
  const spreadTotal = Math.max(0, totalACobrarReg - precioBaseTotal);
  const spreadCobrado = Math.max(0, (cobradoAll+inicialAll) - precioBaseTotal); // solo cuando cobrado cubre capital
  const spreadPctGanado = spreadTotal>0 ? Math.round(Math.max(0, spreadCobrado)/spreadTotal*100) : 0;

  // ─── 3. MORA $ ───
  const moraAcumulada = activos.reduce((a,c)=>a+(c.moraMonto||0),0);
  const tasaMora = activos.length>0 ? Math.round(enMora.length/activos.length*100) : 0;
  const diasMoraProm = enMora.length>0 ? Math.round(enMora.reduce((a,c)=>a+(c.mora||0),0)/enMora.length) : 0;

  // ─── 4. PROMEDIO / TICKET ───
  const ticketProm = registradosCreds.length>0 ? precioBaseTotal/registradosCreds.length : 0;
  const cuotaProm = activos.length>0 ? cuotaEspQuincena/activos.length : 0;
  const plazoProm = activos.length>0 ? Math.round(activos.reduce((a,c)=>a+(c.plazo||12),0)/activos.length) : 0;

  // ─── 5. AVANCE DE CARTERA ───
  const cuotasPagTot = allCreds.reduce((a,c)=>a+(c.pagado||0),0);
  const cuotasPlanTot= allCreds.reduce((a,c)=>a+(c.totalCuotas||(c.plazo*2)||24),0);
  const avancePct = cuotasPlanTot>0 ? Math.round(cuotasPagTot/cuotasPlanTot*100) : 0;

  // ─── 6. CUOTAS ENTRANTES próximas 4 semanas (cronograma real) ───
  const ahora = Date.now();
  const MS_DIA = 24*60*60*1000;
  const MS_QUINCENA = 15*MS_DIA;
  const semanas = [
    {label:'Esta semana', ini: ahora, fin: ahora+7*MS_DIA, monto:0, cuotas:0},
    {label:'Sem 2', ini: ahora+7*MS_DIA, fin: ahora+14*MS_DIA, monto:0, cuotas:0},
    {label:'Sem 3', ini: ahora+14*MS_DIA, fin: ahora+21*MS_DIA, monto:0, cuotas:0},
    {label:'Sem 4', ini: ahora+21*MS_DIA, fin: ahora+28*MS_DIA, monto:0, cuotas:0},
  ];
  activos.forEach(c=>{
    if(!c.fecha) return;
    const inicio = parseFechaLocal(c.fecha).getTime();
    if(isNaN(inicio)) return;
    const totalCuotas = c.totalCuotas || (c.plazo*2) || 24;
    const pagadas = c.pagado || 0;
    const cuotaV = parseFloat(c.cuotaQ||c.cuota||0)||0;
    if(cuotaV<=0) return;
    for(let k=pagadas+1; k<=totalCuotas; k++){
      const t = inicio + k*MS_QUINCENA;
      for(const sem of semanas){
        if(t >= sem.ini && t < sem.fin){
          sem.monto += cuotaV;
          sem.cuotas += 1;
          break;
        }
      }
      if(t > semanas[3].fin) break; // no seguir buscando
    }
  });

  // ─── 7. TOP 5 CLIENTES por saldo ───
  const topClientes = activos.slice().sort((a,b)=>getCreditoSaldoPendiente(b)-getCreditoSaldoPendiente(a)).slice(0,5);

  // ─── 8. CONCENTRACIÓN POR MODELO (cuántos créditos + cuántos en mora por modelo) ───
  const porModelo = {};
  activos.forEach(c=>{
    const m = c.modelo || 'Sin modelo';
    if(!porModelo[m]) porModelo[m] = {total:0, mora:0, cartera:0};
    porModelo[m].total += 1;
    if(c.mora>0) porModelo[m].mora += 1;
    porModelo[m].cartera += getCreditoSaldoPendiente(c);
  });
  const modelosSorted = Object.entries(porModelo).sort((a,b)=>b[1].cartera-a[1].cartera).slice(0,6);

  // ─── 9. ANTIGÜEDAD DE LA CARTERA ───
  const agingMeses = {'<3m':0, '3-6m':0, '6-12m':0, '>12m':0};
  activos.forEach(c=>{
    if(!c.fecha) return;
    const dias = (ahora - parseFechaLocal(c.fecha).getTime()) / MS_DIA;
    if(dias < 90) agingMeses['<3m']++;
    else if(dias < 180) agingMeses['3-6m']++;
    else if(dias < 365) agingMeses['6-12m']++;
    else agingMeses['>12m']++;
  });

  // ─── 10. Exponer datos a Chart.js ───
  window._credsData = {
    estados:{activos:alDia.length, mora:enMora.length, completados:completados.length, recuperados:recuperados.length, cancelados:cancelados.length},
    semanas, modelos:modelosSorted, agingMeses,
    spreadTotal, spreadCobrado, capitalCobrado: Math.min(cobradoAll+inicialAll, precioBaseTotal), precioBaseTotal
  };
  setTimeout(function(){ if(typeof renderCredsCharts==='function') renderCredsCharts(); if(typeof renderCredCobrosChart==='function') renderCredCobrosChart(); }, 80);

  // ─── 11. Filtro por tab ───
  const tab = S.credTab||'todos';
  // En 'todos' (y cualquier tab que no sea 'archivados') excluimos los cancelados/recuperados
  // para no contaminar la vista principal. Los cancelados van a la pestaña "Archivados".
  const visibles = allCreds.filter(c=>c.estado!=='cancelado' && c.estado!=='recuperado' && c.estado!=='recuperada');
  const archivados = allCreds.filter(c=>c.estado==='cancelado' || c.estado==='recuperado' || c.estado==='recuperada');
  let filtered = visibles;
  if(tab==='activos') filtered = activos;
  if(tab==='mora') filtered = enMora;
  if(tab==='completados')filtered = completados;
  if(tab==='archivados') filtered = archivados;

  // ─── 11b. Ordenamiento de tabla ───
  var _cs = S.credSort || {col:'id', dir:'desc'};   // por defecto el credito mas nuevo arriba (Adam, 11-sep-2026); en "En mora", setCredTab pone el mas atrasado arriba
  filtered = filtered.slice().sort(function(a,b){
    var col=_cs.col, dir=_cs.dir==='asc'?1:-1;
    var va,vb;
    if(col==='id') { va=parseInt(String(a.id).replace(/\D/g,''),10)||0; vb=parseInt(String(b.id).replace(/\D/g,''),10)||0; return dir*(va<vb?-1:va>vb?1:0); }
    if(col==='cli') { va=(a.cli||'').toLowerCase(); vb=(b.cli||'').toLowerCase(); return dir*(va<vb?-1:va>vb?1:0); }
    if(col==='modelo') { va=(a.modelo||'').toLowerCase(); vb=(b.modelo||'').toLowerCase(); return dir*(va<vb?-1:va>vb?1:0); }
    if(col==='sede') { va=(((_concGetById(a.concesionarioId)||{}).nombre)||'').toLowerCase(); vb=(((_concGetById(b.concesionarioId)||{}).nombre)||'').toLowerCase(); return dir*(va<vb?-1:va>vb?1:0); }
    if(col==='fecha') { va=a.fecha||''; vb=b.fecha||''; return dir*(va<vb?-1:va>vb?1:0); }
    if(col==='precio') return dir*(parseFloat(a.precioBaseReal||a.precio||0)-parseFloat(b.precioBaseReal||b.precio||0));
    if(col==='total') return dir*(parseFloat(a.total||0)-parseFloat(b.total||0));
    if(col==='cuota') return dir*(getCreditoCuotaBase(a)-getCreditoCuotaBase(b));
    if(col==='saldo') return dir*(getCreditoSaldoPendiente(a)-getCreditoSaldoPendiente(b));
    if(col==='mora') return dir*((a.mora||0)-(b.mora||0));
    if(col==='apy') { va=Number.isFinite(parseFloat(a.apy))?parseFloat(a.apy):(Number.isFinite(parseFloat((a.plan||{}).apy))?parseFloat((a.plan||{}).apy):parseFloat(PLAN.apy||0)); vb=Number.isFinite(parseFloat(b.apy))?parseFloat(b.apy):(Number.isFinite(parseFloat((b.plan||{}).apy))?parseFloat((b.plan||{}).apy):parseFloat(PLAN.apy||0)); return dir*(va-vb); }
    if(col==='estado') { va=a.estado||''; vb=b.estado||''; return dir*(va<vb?-1:va>vb?1:0); }
    return 0;
  });

  // ─── 11c. Filtro de búsqueda en tiempo real ───
  var _credQ = (S.credFiltro||'').toLowerCase().trim();
  if(_credQ){
    filtered = filtered.filter(function(c){
      return (c.id||'').toLowerCase().includes(_credQ)
        || (c.cli||'').toLowerCase().includes(_credQ)
        || (c.modelo||'').toLowerCase().includes(_credQ)
        || (c.estado||'').toLowerCase().includes(_credQ)
        || (c.fecha||'').includes(_credQ);
    });
  }

  const total = Math.max(1, allCreds.length);
  const segs = [
    {k:'activos', n:alDia.length, c:'var(--p1)', l:'Al día'},
    {k:'mora', n:enMora.length, c:'var(--red)', l:'En mora'},
    {k:'completados',n:completados.length, c:'var(--green)', l:'Completados'},
    {k:'recuperados',n:recuperados.length, c:'var(--amber)', l:'Recuperados'},
    {k:'cancelados', n:cancelados.length, c:'var(--ink3)', l:'Cancelados'},
  ];

  // ══════════════════════════════════════════════════════════════════════
  // HTML
  // ══════════════════════════════════════════════════════════════════════
  return`<div class="page">

  ${pageBanner(
    'Cartera · Análisis de créditos',
    'Créditos',
    '<b>'+registradosCreds.length+'</b> créditos · Valor total: <b>'+fmt(valorTotal)+'</b> · Intereses teóricos: <b>'+fmt(spreadTotal)+'</b>',
    [
      {label:'⚖ Auditar iniciales', onclick:'auditarIniciales()'},
      {label:'🔧 Reparar motos', onclick:'auditarVinculosMoto()'},
      {label:'↓ Exportar CSV', onclick:"exportarCSV('creditos')"},
      {label:'＋ Nueva Solicitud', onclick:'openAddCred()', primary:true}
    ]
  )}

  <!-- ══════════════════════════════════════════════════════════════ -->
  <!-- BANNER: Salud del portafolio -->
  <!-- ══════════════════════════════════════════════════════════════ -->
  <div style="background:${tasaMora<=10?'linear-gradient(135deg,var(--greens),rgba(6,176,106,.04))':tasaMora<=25?'linear-gradient(135deg,var(--ambers),rgba(244,180,44,.04))':'linear-gradient(135deg,var(--reds),rgba(217,59,90,.04))'};border:1px solid ${tasaMora<=10?'rgba(6,176,106,.25)':tasaMora<=25?'rgba(244,180,44,.3)':'rgba(217,59,90,.25)'};border-radius:14px;padding:14px 18px;margin-bottom:14px;display:grid;grid-template-columns:1fr auto auto;gap:16px;align-items:center">
    <div>
      <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:${tasaMora<=10?'var(--green)':tasaMora<=25?'var(--amber)':'var(--red)'};margin-bottom:4px">${tasaMora<=10?'✓ Cartera sana':tasaMora<=25?' Atención — mora elevada':' Cartera estresada'}</div>
      <div style="font-size:14px;font-weight:700;line-height:1.45">
        ${activos.length} créditos activos · <strong style="color:${tasaMora<=10?'var(--green)':tasaMora<=25?'var(--amber)':'var(--red)'}">${enMora.length} en mora (${tasaMora}%)</strong>
        ${enMora.length?` · ${diasMoraProm} días promedio de atraso`:''}
      </div>
      <div style="font-size:11.5px;color:var(--ink3);margin-top:3px">Has recaudado ${pctRecaudado}% del valor total financiado (${fmt(cobradoAll+inicialAll)} de ${fmt(valorTotal+inicialAll)}).</div>
    </div>
    <div style="text-align:right;border-left:1px solid rgba(0,0,0,.08);padding-left:16px">
      <div style="font-size:9.5px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.4px">Cartera viva</div>
      <div style="font-size:22px;font-weight:900;font-family:var(--fd);color:var(--p1);line-height:1.1;margin-top:2px">${fmt(carteraViva)}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">por cobrar a ${activos.length} clientes</div>
    </div>
    <div style="text-align:right;border-left:1px solid rgba(0,0,0,.08);padding-left:16px">
      <div style="font-size:9.5px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.4px">Cuota / mes esperada</div>
      <div style="font-size:22px;font-weight:900;font-family:var(--fd);color:var(--green);line-height:1.1;margin-top:2px">${fmt(cuotaEspMes)}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${fmt(cuotaEspQuincena)} quincena</div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════════ -->
  <!-- KPIs FILA 1 (estado de créditos) -->
  <!-- ══════════════════════════════════════════════════════════════ -->
  <div class="sg" style="grid-template-columns:repeat(5,1fr);margin-bottom:10px">
    <div class="stat">
      <div style="font-size:9.5px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Total creados</div>
      <div style="font-size:20px;font-weight:900;font-family:var(--fd);color:var(--p1);margin-top:3px">${allCreds.length}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">histórico</div>
    </div>
    <div class="stat">
      <div style="font-size:9.5px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Activos</div>
      <div style="font-size:20px;font-weight:900;font-family:var(--fd);color:var(--p1);margin-top:3px">${activos.length}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${alDia.length} al día</div>
    </div>
    <div class="stat">
      <div style="font-size:9.5px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.5px">En mora</div>
      <div style="font-size:20px;font-weight:900;font-family:var(--fd);color:var(--red);margin-top:3px">${enMora.length}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${tasaMora}% · ${fmt(moraAcumulada)}</div>
    </div>
    <div class="stat">
      <div style="font-size:9.5px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Completados</div>
      <div style="font-size:20px;font-weight:900;font-family:var(--fd);color:var(--green);margin-top:3px">${completados.length}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">100% pagados</div>
    </div>
    <div class="stat" onclick="setCredTab('archivados')">
      <div style="font-size:9.5px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.5px">Archivados</div>
      <div style="font-size:20px;font-weight:900;font-family:var(--fd);color:var(--ink3);margin-top:3px">${archivados.length}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">cancelados + recuperados</div>
    </div>
  </div>

  <!-- KPIs FILA 2 (financieros) -->
  <div class="sg" style="grid-template-columns:repeat(6,1fr);margin-bottom:14px">
    <div class="stat" style="padding:11px 13px">
      <div class="st-ic" style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:800">TKT</div>
      <div style="font-size:16px;font-weight:900;font-family:var(--fd);color:var(--ink);margin-top:3px">${fmt(ticketProm)}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">Ticket promedio</div>
    </div>
    <div class="stat" style="padding:11px 13px">
      <div class="st-ic" style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:800">Q/M</div>
      <div style="font-size:16px;font-weight:900;font-family:var(--fd);color:var(--ink);margin-top:3px">${fmt(cuotaProm)}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">Cuota prom (q)</div>
    </div>
    <div class="stat" style="padding:11px 13px">
      <div class="st-ic" style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:800">PLZ</div>
      <div style="font-size:16px;font-weight:900;font-family:var(--fd);color:var(--ink);margin-top:3px">${plazoProm}m</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">Plazo prom</div>
    </div>
    <div class="stat" style="padding:11px 13px">
      <div class="st-ic" style="background:var(--greens);color:var(--green);font-size:9px;font-weight:800">%</div>
      <div style="font-size:16px;font-weight:900;font-family:var(--fd);color:var(--green);margin-top:3px">${pctRecaudado}%</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">Recaudado</div>
    </div>
    <div class="stat" style="padding:11px 13px">
      <div class="st-ic" style="background:var(--ambers);color:var(--amber);font-size:9px;font-weight:800">SPR</div>
      <div style="font-size:16px;font-weight:900;font-family:var(--fd);color:var(--amber);margin-top:3px">${fmt(spreadTotal)}</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">Spread bruto</div>
    </div>
    <div class="stat" style="padding:11px 13px">
      <div class="st-ic" style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:800">AVN</div>
      <div style="font-size:16px;font-weight:900;font-family:var(--fd);color:var(--p1);margin-top:3px">${avancePct}%</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${cuotasPagTot}/${cuotasPlanTot} cuotas</div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════════ -->
  <!-- Filter tabs -->
  <!-- ══════════════════════════════════════════════════════════════ -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
    ${[
      ['todos','Todos',visibles.length],
      ['activos','Activos',activos.length],
      ['mora','En mora',enMora.length],
      ['completados','Completados',completados.length],
      ['archivados','Archivados',archivados.length],
    ].map(([k,l,n])=>`<button class="btn btn-sm${tab===k?' btn-p':' btn-g'}" onclick="setCredTab('${k}')" style="gap:6px">${l} <span style="opacity:.7;font-size:10px;font-weight:800">${n}</span></button>`).join('')}
  </div>

  <!-- ══════════════════════════════════════════════════════════════ -->
  <!-- Tabla principal — primero -->
  <!-- ══════════════════════════════════════════════════════════════ -->
  <div class="card" style="margin-bottom:14px">
    <div class="ch">
      <div><div class="ct">${tab==='archivados'?'Archivados':'Listado de créditos'}</div><div class="cs">${filtered.length} resultado${filtered.length!==1?'s':''} · ${tab==='todos'?'activos, en mora y completados':tab==='archivados'?'créditos cancelados o recuperados':'filtrado por '+tab}</div></div>
      <div class="srch" style="width:240px"><span class="srch-i">◆</span><input type="text" id="credQ" placeholder="Buscar crédito, cliente, modelo..." value="${S.credFiltro||''}" oninput="liveSearchCred(this.value)" style="width:100%"></div>
    </div>
    <div class="tw tw-compact tw-creditos"><table>
    <thead><tr>
      ${['id','cli','modelo','sede','fecha','precio','total','cuota','progreso','saldo','mora','apy','estado'].map(function(col){
        var labels={id:'ID',cli:'Cliente',modelo:'Modelo',sede:'Concesionario',fecha:'Fecha inicio',precio:'Precio',total:'Total',cuota:'Cuota Q.',progreso:'Progreso',saldo:'Saldo',mora:'Mora',apy:'APY',estado:'Estado'};
        if(col==='progreso') return '<th>Progreso</th>';
        var isActive=(_cs.col===col);
        var arrow=isActive?(_cs.dir==='asc'?'↑':'↓'):'';
        return '<th onclick="setCredSort(\''+col+'\')" style="cursor:pointer;user-select:none;white-space:nowrap">'+labels[col]+(arrow?' <span style="color:var(--p1);font-size:10px">'+arrow+'</span>':'<span style="color:var(--ink3);font-size:9px;opacity:.4"> ⇅</span>')+'</th>';
      }).join('')}
      <th></th>
    </tr></thead>
    <tbody>${(()=>{const _cp=pgGet('creditos');return filtered.slice((_cp-1)*50,_cp*50).map(c=>{
      var totalCuotas = getCreditoTotalCuotas(c);
      var cuotaVal = getCreditoCuotaBase(c);
      var totalFinanciado = cuotaVal * totalCuotas;
      var totalAbonado = getCreditoPagosConfirmados(c);
      var saldoPendiente = getCreditoSaldoPendiente(c);
      if(c.estado==='completado' || c.estado==='cancelado') saldoPendiente = 0;
      var cuotasPagadasReal = getCreditoCuotasPagadas(c);
      var pct = totalFinanciado>0 ? Math.round((totalAbonado/totalFinanciado)*100) : 0;
      var saldoColor=saldoPendiente===0?'var(--green)':c.mora>0?'var(--red)':'var(--ink)';
      var moraCell = c.mora>0
        ? `<span class="bdg ${c.mora>60?'b-r':c.mora>30?'b-a':'b-b'}">${c.mora}d</span>`
        : `<span style="color:var(--ink3);font-size:11px">—</span>`;
      var apyVal = Number.isFinite(parseFloat(c.apy)) ? parseFloat(c.apy) : (Number.isFinite(parseFloat((c.plan||{}).apy)) ? parseFloat((c.plan||{}).apy) : parseFloat(PLAN.apy||0));
      var fechaFmt = c.fecha ? parseFechaLocal(c.fecha).toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
      // La hora exacta en que se registro el credito (c.creado); pedida por Adam 10-sep-2026
      var horaCre='';
      if(c.creado){ var _hc=new Date(c.creado); if(!isNaN(_hc.getTime())) horaCre=_hc.toLocaleTimeString('es-VE',{hour:'numeric',minute:'2-digit'}); }
      var precio = parseFloat(c.precioBaseReal||c.precio||0);
      var totalC = parseFloat(c.total||0);
      var sedeName = c.concesionarioId ? (((_concGetById(c.concesionarioId)||{}).nombre)||'—') : '—';
      return`<tr style="cursor:pointer" onclick="openAmort('${c.id}')">
      <td class="tdm" style="font-family:var(--fd)">${c.id}</td>
      <td style="max-width:140px"><div class="tdm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px" title="${c.cli}">${c.cli}</div></td>
      <td class="tds">${c.modelo||'—'}</td>
      <td class="tds" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${sedeName}">${sedeName}</td>
      <td class="tds" style="font-family:var(--fd);font-size:11px;color:var(--ink3);white-space:nowrap">${fechaFmt}${horaCre?`<div style="font-size:9.5px;opacity:.75">${horaCre}</div>`:''}</td>
      <td style="font-family:var(--fd);font-size:11.5px;color:var(--ink3)">${fmt(precio)}</td>
      <td style="font-family:var(--fd);font-size:11.5px;font-weight:700">${fmt(totalC)}</td>
      <td style="font-weight:900;font-family:var(--fd);color:var(--p1)">${fmt(cuotaVal)}</td>
      <td style="min-width:110px"><div class="tds" style="margin-bottom:3px">${cuotasPagadasReal}/${totalCuotas}</div><div class="prog"><div class="pf ${c.mora>0?'p-r':'p-p'}" style="width:${pct}%"></div></div></td>
      <td style="font-weight:900;font-family:var(--fd);color:${saldoColor}">${saldoPendiente===0?'✓ $0':fmt(saldoPendiente)}</td>
      <td>${moraCell}</td>
      <td><span style="font-weight:800;font-family:var(--fd);color:var(--ink)">${apyVal.toFixed(2)}%</span></td>
      <td><span class="bdg ${sbg(c.estado)}">${c.estado}</span></td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap">
        <div style="display:flex;gap:3px;align-items:center">
        <button class="btn btn-g btn-xs" onclick="openAmort('${c.id}')" title="Ver">Ver</button>
        ${c.motoPendiente && !c.motoId && c.estado!=='cancelado' ? `<span class="bdg b-r" title="El crédito se guardó pero la moto no se creó: enlázala desde Inventario o con Reparar motos y registra su compra" style="font-size:9.5px">sin moto</span>` : ''}
        ${!c.contratoFirmado && c.estado!=='cancelado' && c.estado!=='recuperado' && c.estado!=='recuperada' ? `<button class="btn btn-xs" onclick="confirmarContratoFirmado('${c.id}')" title="Confirmar contrato firmado" style="background:#d97706;color:#fff;border:1px solid #b45309;padding:4px 8px;font-weight:700;font-size:10.5px;border-radius:6px;cursor:pointer">Confirmar</button>` : ''}
        <button class="btn btn-p btn-xs" onclick="${!c.contratoFirmado ? `editarCredSinFirma('${c.id}')` : `openEditCred('${c.id}')`}" title="Editar">Editar</button>
        ${c.estado!=="completado"&&c.estado!=="cancelado"&&c.estado!=="recuperado"&&c.estado!=="recuperada"?`<button class="btn btn-s btn-xs" onclick="openLiquidarAnticipado('${c.id}')" title="Liquidar">Liq.</button><button class="btn btn-d btn-xs" onclick="cancelarCred('${c.id}')" title="Cancelar crédito" style="padding:4px 7px">✕</button>`:''}
        ${(c.estado==='cancelado'||c.estado==='recuperado'||c.estado==='recuperada')?`<button class="btn btn-p btn-xs" onclick="restaurarCred('${c.id}')" title="Restaurar crédito">↺</button>`:''}
        </div>
      </td>
    </tr>`;}).join('')})()}
    ${filtered.length===0?`<tr><td colspan="14" style="text-align:center;padding:30px 0;color:var(--ink3);font-size:13px">Sin resultados para este filtro</td></tr>`:''}
    </tbody>
  </table></div>
  </div>
  ${pgControls('creditos',filtered.length,50,'pgNav')}

  <!-- ══════════════════════════════════════════════════════════════ -->
  <!-- Cobros programados con toggle Diario/Quincenal/Mensual -->
  <!-- ══════════════════════════════════════════════════════════════ -->
  <div class="card" style="margin-bottom:12px">
    <div class="ch">
      <div>
        <div class="ct">Cobros programados</div>
        <div class="cs" id="cred-cobros-sub">Según cronograma de créditos activos</div>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-xs btn-p" id="cred-cobros-d" onclick="setCredCobrosPeriodo('diario')"   style="font-size:10px;padding:4px 9px">Diario</button>
        <button class="btn btn-xs"       id="cred-cobros-q" onclick="setCredCobrosPeriodo('quincenal')" style="font-size:10px;padding:4px 9px">Quincenal</button>
        <button class="btn btn-xs"       id="cred-cobros-m" onclick="setCredCobrosPeriodo('mensual')"   style="font-size:10px;padding:4px 9px">Mensual</button>
      </div>
    </div>
    <div style="position:relative;height:200px;margin-top:8px">
      <canvas id="cred-cobros-chart"></canvas>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════════ -->
  <!-- Spread + Antigüedad + Top clientes -->
  <!-- ══════════════════════════════════════════════════════════════ -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:12px;margin-bottom:12px">

    <div class="card">
      <div class="ch"><div><div class="ct">Capital vs Intereses</div><div class="cs">${spreadPctGanado}% del spread ya devengado</div></div></div>
      <div style="position:relative;height:160px;margin-top:4px">
        <canvas id="creds-chart-spread"></canvas>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:10px;padding-top:10px;border-top:1px solid var(--rim2)">
        <div>
          <div style="color:var(--ink3);font-size:10px;font-weight:700;text-transform:uppercase">Capital</div>
          <div style="font-family:var(--fd);font-weight:800">${fmt(precioBaseTotal)}</div>
        </div>
        <div style="text-align:right">
          <div style="color:var(--ink3);font-size:10px;font-weight:700;text-transform:uppercase">Intereses</div>
          <div style="font-family:var(--fd);font-weight:800;color:var(--amber)">${fmt(spreadTotal)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="ch"><div><div class="ct">Antigüedad de Cartera</div><div class="cs">Créditos activos por edad</div></div></div>
      <div style="position:relative;height:160px;margin-top:4px">
        <canvas id="creds-chart-aging"></canvas>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:10px;font-size:10.5px;text-align:center">
        <div style="padding:5px;background:var(--gs);border-radius:5px"><div style="font-weight:800">${agingMeses['<3m']}</div><div style="color:var(--ink3);font-size:9.5px">{'<'}3m</div></div>
        <div style="padding:5px;background:var(--gs);border-radius:5px"><div style="font-weight:800">${agingMeses['3-6m']}</div><div style="color:var(--ink3);font-size:9.5px">3-6m</div></div>
        <div style="padding:5px;background:var(--gs);border-radius:5px"><div style="font-weight:800">${agingMeses['6-12m']}</div><div style="color:var(--ink3);font-size:9.5px">6-12m</div></div>
        <div style="padding:5px;background:var(--gs);border-radius:5px"><div style="font-weight:800">${agingMeses['>12m']}</div><div style="color:var(--ink3);font-size:9.5px">{'>'}12m</div></div>
      </div>
    </div>

    <div class="card">
      <div class="ch"><div><div class="ct">Top 5 Clientes por Saldo</div><div class="cs">Mayor exposición activa</div></div></div>
      ${topClientes.length?topClientes.map((c,i)=>{
        const saldo = getCreditoSaldoPendiente(c);
        const hasMora = c.mora>0;
        return `<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--rim2);cursor:pointer" onclick="openAmort('${c.id}')">
          <div style="width:24px;height:24px;border-radius:50%;background:${hasMora?'var(--reds)':'var(--gs)'};color:${hasMora?'var(--red)':'var(--p1)'};display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:800;flex-shrink:0">${i+1}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.cli}</div>
            <div style="font-size:10px;color:var(--ink3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              <span style="font-family:var(--fd)">${c.id}</span> · ${c.modelo||'—'}${hasMora?` · <span style="color:var(--red);font-weight:700">${c.mora}d mora</span>`:''}
            </div>
          </div>
          <div style="font-weight:800;font-family:var(--fd);font-size:12.5px;color:${hasMora?'var(--red)':'var(--ink)'};flex-shrink:0">${fmt(saldo)}</div>
        </div>`;
      }).join(''):'<div style="padding:24px;text-align:center;color:var(--ink3);font-size:12px">Sin créditos activos</div>'}
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════════ -->
  <!-- Concentración por modelo de moto -->
  <!-- ══════════════════════════════════════════════════════════════ -->
  ${modelosSorted.length?`<div class="card" style="margin-bottom:12px">
    <div class="ch"><div><div class="ct">Concentración por Modelo</div><div class="cs">Top modelos financiados · tasa de mora por modelo</div></div></div>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(6,modelosSorted.length)},1fr);gap:10px;margin-top:6px">
      ${modelosSorted.map(([modelo,info])=>{
        const morapct = info.total>0 ? Math.round(info.mora/info.total*100) : 0;
        const riskColor = morapct<=10?'var(--green)':morapct<=25?'var(--amber)':'var(--red)';
        return `<div style="padding:12px;background:var(--surf2);border-radius:10px">
          <div style="font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink);margin-bottom:6px" title="${modelo}">${modelo}</div>
          <div style="font-size:17px;font-weight:900;font-family:var(--fd);color:var(--p1);line-height:1.1">${info.total}</div>
          <div style="font-size:10px;color:var(--ink3);margin-top:1px">créditos</div>
          <div style="margin-top:7px;padding-top:7px;border-top:1px solid var(--rim2);display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:9px;color:var(--ink3);font-weight:700;text-transform:uppercase">Cartera</div>
              <div style="font-size:11.5px;font-weight:800;font-family:var(--fd)">${fmt(info.cartera)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:9px;color:var(--ink3);font-weight:700;text-transform:uppercase">Mora</div>
              <div style="font-size:11.5px;font-weight:800;font-family:var(--fd);color:${riskColor}">${morapct}%</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`:''}

  </div>`+'';
};

