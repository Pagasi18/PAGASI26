// Calculos financieros y helpers de planes. Extraido mecanicamente de assets/pagasi-app.js.
function calcMoto(precio, planOverride=null){
  const plan = planOverride || PLAN;
  const precioNum = parseFloat(precio)||0;
  const inicialPct = parseFloat(plan&&plan.inicial)||0;
  const factor = parseFloat(plan&&plan.factor)||0;
  const plazo = parseInt(plan&&plan.plazo,10)||0;
  const ini = precioNum * inicialPct;
  const fin = precioNum - ini;
  const total = fin * factor;
  const cuotaM = plazo>0 ? (total / plazo) : 0;
  const cuotaQ = cuotaM / 2;
  const totalPagado = ini + total;
  return {ini,fin,total,cuotaM,cuotaQ,totalPagado};
}
function pmtRate(periodRate, nper, pv){
  periodRate=parseFloat(periodRate)||0;
  nper=parseInt(nper,10)||0;
  pv=parseFloat(pv)||0;
  if(nper<=0||pv<=0) return 0;
  if(Math.abs(periodRate)<1e-9) return pv/nper;
  return (pv*periodRate)/(1-Math.pow(1+periodRate,-nper));
}
function solveQuincenalRate(montoFinanciado, cuotaQ, totalCuotas){
  var pv=parseFloat(montoFinanciado)||0;
  var pmt=parseFloat(cuotaQ)||0;
  var n=parseInt(totalCuotas,10)||0;
  if(pv<=0||pmt<=0||n<=0) return 0;
  var ratio=(pmt*n)/pv;
  if(ratio<=1.000001) return 0;
  var low=0, high=1;
  for(var i=0;i<80;i++){ var test=pmtRate(high,n,pv); if(test>=pmt) break; high*=2; }
  for(var j=0;j<80;j++){ var mid=(low+high)/2; var val=pmtRate(mid,n,pv); if(Math.abs(val-pmt)<1e-7) return mid; if(val>pmt) high=mid; else low=mid; }
  return (low+high)/2;
}
function calcCustomPlan(precioBaseReal, inicialReal, cuotaQ, plazoMeses){
  var precio=parseFloat(precioBaseReal)||0;
  var ini=parseFloat(inicialReal)||0;
  var cuota=parseFloat(cuotaQ)||0;
  var plazo=parseInt(plazoMeses,10)||0;
  var totalCuotas=Math.max(0,plazo*2);
  var fin=Math.max(0, precio-ini);
  var total=cuota*totalCuotas;
  var totalPagado=ini+total;
  var factor=fin>0 ? (total/fin) : 0;
  var inicialPct=precio>0 ? (ini/precio) : 0;
  var tasaQ=solveQuincenalRate(fin, cuota, totalCuotas);
  var tasaMensual=tasaQ*2*100;
  var apy=(Math.pow(1+tasaQ,24)-1)*100;
  return {precioBaseReal:precio, ini:ini, fin:fin, total:total, cuotaQ:cuota, cuotaM:cuota*2, totalPagado:totalPagado, plazo:plazo, totalCuotas:totalCuotas, factor:factor, inicialPct:inicialPct, tasaQuincenal:tasaQ*100, tasaMensual:tasaMensual, apy:apy};
}
// ── CALCULADORA APY: dada precio, %inicial, APY objetivo y plazo, calcula la cuota quincenal ──
function calcApyPlan(precioBaseReal, inicialPct, apyObjetivo, plazoMeses){
  var precio=parseFloat(precioBaseReal)||0;
  var iniPct=parseFloat(inicialPct)||0;
  var apy=parseFloat(apyObjetivo)||0;
  var plazo=parseInt(plazoMeses,10)||0;
  var totalCuotas=Math.max(0, plazo*2);
  var ini=precio*iniPct;
  var fin=Math.max(0, precio-ini);
  // tasa quincenal a partir del APY: (1+APY)^(1/24) - 1
  var tasaQ = Math.pow(1 + apy/100, 1/24) - 1;
  var cuotaQ = pmtRate(tasaQ, totalCuotas, fin);
  var total = cuotaQ*totalCuotas;
  var totalPagado = ini+total;
  var factor = fin>0 ? (total/fin) : 0;
  var tasaMensual = tasaQ*2*100;
  return {precioBaseReal:precio, ini:ini, fin:fin, total:total, cuotaQ:cuotaQ, cuotaM:cuotaQ*2, totalPagado:totalPagado, plazo:plazo, totalCuotas:totalCuotas, factor:factor, inicialPct:iniPct, tasaQuincenal:tasaQ*100, tasaMensual:tasaMensual, apy:apy};
}
function getWzPlanConfig(){
  var modo=((document.getElementById('wz_plan_mode')||{}).value)||WZ.planMode||'global';
  var precioBase=parseFloat(((document.getElementById('wz_precio_base_real')||{}).value));
  if(!(precioBase>0)) precioBase=parseFloat(WZ.precioBaseReal||WZ.precio)||0;
  if(modo!=='custom'){
    var baseCalc=calcMoto(precioBase||WZ.precio||0);
    return {mode:'global', precioBaseReal:precioBase||parseFloat(WZ.precio)||0, ini:baseCalc.ini, fin:baseCalc.fin, total:baseCalc.total, cuotaQ:baseCalc.cuotaQ, cuotaM:baseCalc.cuotaM, totalPagado:baseCalc.totalPagado, plazo:PLAN.plazo, totalCuotas:PLAN.plazo*2, factor:PLAN.factor, inicialPct:PLAN.inicial, tasaMensual:PLAN.tasaMensual, apy:PLAN.apy, sourcePlan:{plazo:PLAN.plazo, factor:PLAN.factor, inicial:PLAN.inicial, tasaMensual:PLAN.tasaMensual, apy:PLAN.apy}};
  }
  if(modo==='apy'){
    var apyObj=parseFloat(((document.getElementById('wz_apy_objetivo')||{}).value))||0;
    var plazoApy=parseInt(((document.getElementById('wz_apy_plazo')||{}).value),10)||0;
    var iniSelEl = document.getElementById('wz_apy_inicial_sel');
    var iniSelRaw = iniSelEl ? iniSelEl.value : '0.50';
    var iniSel;
    if(iniSelRaw === 'custom'){
      iniSel = parseFloat(window._wzCustomPct)||0.50;
    } else {
      iniSel = parseFloat(iniSelRaw);
    }
    if(!(iniSel>0)) iniSel=0.50; // 50% por defecto
    var apyCalc=calcApyPlan(precioBase||WZ.precio||0, iniSel, apyObj, plazoApy);
    apyCalc.mode='apy';
    apyCalc.sourcePlan={plazo:apyCalc.plazo, factor:apyCalc.factor, inicial:apyCalc.inicialPct, tasaMensual:apyCalc.tasaMensual, apy:apyCalc.apy};
    return apyCalc;
  }
  var inicialReal=parseFloat(((document.getElementById('wz_ini_real')||{}).value));
  if(!(inicialReal>=0)) inicialReal=parseFloat(WZ.ini)||0;
  var cuotaQ=parseFloat(((document.getElementById('wz_cuota_q_custom')||{}).value));
  if(!(cuotaQ>0)) cuotaQ=parseFloat(WZ.cuota)||0;
  var plazo=parseInt(((document.getElementById('wz_plazo_custom')||{}).value),10);
  if(!(plazo>0)) plazo=parseInt(WZ.plazo,10)||0;
  var custom=calcCustomPlan(precioBase,inicialReal,cuotaQ,plazo);
  custom.mode='custom';
  custom.sourcePlan={plazo:custom.plazo, factor:custom.factor, inicial:custom.inicialPct, tasaMensual:custom.tasaMensual, apy:custom.apy};
  return custom;
}

function _wzCredPlanFields(r, fallback){
  fallback = fallback || {};
  r = r || {};
  var precioBase = r.precioBaseReal || WZ.precio || fallback.precioBaseReal || 0;
  var factor = r.factor || fallback.factor || PLAN.factor;
  var inicialPct = (typeof r.inicialPct === 'number') ? r.inicialPct : (fallback.inicialPct != null ? fallback.inicialPct : PLAN.inicial);
  var tasaMensual = (typeof r.tasaMensual === 'number') ? r.tasaMensual : (fallback.tasaMensual != null ? fallback.tasaMensual : PLAN.tasaMensual);
  var apy = (typeof r.apy === 'number') ? r.apy : ((fallback.plan && fallback.plan.apy != null) ? fallback.plan.apy : PLAN.apy);
  var plazo = r.plazo || fallback.plazo || PLAN.plazo;
  return {
    precioBaseReal: precioBase,
    // Con `r.ini || fallback.ini` el CERO se trataba como vacio: poner la inicial en 0
    // dejaba la vieja, mientras fin y total SI se recalculaban con el 0 — y entonces
    // ini+fin dejaba de dar el precio (punto 15, 22-sep-2026). Los demas campos no
    // sufren esto porque cuota, plazo y fin nunca valen 0 de verdad; la inicial si.
    ini: (typeof r.ini === 'number' && isFinite(r.ini)) ? r.ini : (parseFloat(fallback.ini) || 0),
    fin: r.fin || fallback.fin || 0,
    total: r.total || fallback.total || 0,
    cuota: r.cuotaQ || fallback.cuota || 0,
    cuotaQ: r.cuotaQ || fallback.cuotaQ || 0,
    cuotaM: r.cuotaM || fallback.cuotaM || 0,
    plazo: plazo,
    totalCuotas: r.totalCuotas || fallback.totalCuotas || (plazo*2),
    factor: factor,
    inicialPct: inicialPct,
    tasaMensual: tasaMensual,
    planModo: r.mode || fallback.planModo || 'global',
    plan: {plazo:plazo, factor:factor, inicial:inicialPct, tasaMensual:tasaMensual, apy:apy, precioBaseReal:precioBase}
  };
}

function _wzTogglePlanMode(v){
  WZ.planMode=v||(((document.getElementById('wz_plan_mode')||{}).value)||'global');
  var box=document.getElementById('wz_plan_custom_box');
  if(box) box.style.display=WZ.planMode==='custom'?'block':'none';
  var boxApy=document.getElementById('wz_plan_apy_box');
  if(boxApy) boxApy.style.display=WZ.planMode==='apy'?'block':'none';
  var precioBase=document.getElementById('wz_precio_base_real');
  if(precioBase && !precioBase.value && (WZ.precio||0)>0) precioBase.value=(parseFloat(WZ.precio)||0).toFixed(2);
  _wzActualizarFinPreview((document.getElementById('wz_precio')||{}).value || WZ.precio || 0);
  if(typeof _wzMpagoSync==='function') _wzMpagoSync();
  _wzScore();
}

// ── Comparativo APY: calcula cuotas para iniciales 45%, 50%, 55% ──
function _wzApyCompare(){
  var precio=parseFloat(((document.getElementById('wz_precio_base_real')||{}).value))||parseFloat(WZ.precio)||0;
  var apy=parseFloat(((document.getElementById('wz_apy_objetivo')||{}).value))||0;
  var plazo=parseInt(((document.getElementById('wz_apy_plazo')||{}).value),10)||0;
  var grid=document.getElementById('wz_apy_compare_grid');
  var box=document.getElementById('wz_apy_compare');
  if(!grid||!box) return;
  if(!(precio>0)||!(apy>0)||!(plazo>0)){ box.style.display='none'; _wzActualizarFinPreview(WZ.precio||0); return; }
  box.style.display='block';
  var pcts=[0.45,0.50,0.55];
  var fixedCards = pcts.map(function(p){
    var r=calcApyPlan(precio,p,apy,plazo);
    return '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:10px;padding:10px">'
      +'<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--p1);margin-bottom:6px">Inicial '+(p*100).toFixed(0)+'%</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Inicial</div>'
      +'<div style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:6px">$'+r.ini.toFixed(2)+'</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Cuota quincenal</div>'
      +'<div style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:6px">$'+r.cuotaQ.toFixed(2)+'</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Total a pagar</div>'
      +'<div style="font-size:13px;font-weight:800;color:var(--ink)">$'+r.totalPagado.toFixed(2)+'</div>'
      +'</div>';
  }).join('');
  var prevMode = (window._wzCustomMode === '$') ? '$' : '%';
  var prevVal = (window._wzCustomVal != null) ? window._wzCustomVal : '';
  var customCard = ''
    +'<div style="background:var(--surf);border:2px dashed var(--p1);border-radius:10px;padding:10px">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    +'<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--p1)">Personalizada</div>'
    +'<div style="display:flex;gap:2px;background:var(--gs);border-radius:6px;padding:2px">'
    +'<button type="button" id="wz_cust_btn_pct" onclick="_wzApyCustomSetMode(\'%\')" style="border:none;background:'+(prevMode==='%'?'var(--p1)':'transparent')+';color:'+(prevMode==='%'?'#fff':'var(--ink2)')+';padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">%</button>'
    +'<button type="button" id="wz_cust_btn_dol" onclick="_wzApyCustomSetMode(\'$\')" style="border:none;background:'+(prevMode==='$'?'var(--p1)':'transparent')+';color:'+(prevMode==='$'?'#fff':'var(--ink2)')+';padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">$</button>'
    +'</div>'
    +'</div>'
    +'<input type="number" id="wz_cust_input" value="'+prevVal+'" placeholder="'+(prevMode==='%'?'Ej: 60':'Ej: 800')+'" oninput="_wzApyCustomCalc()" style="width:100%;border:1px solid var(--rim);border-radius:6px;padding:5px 8px;font-size:13px;font-weight:700;font-family:var(--fd);margin-bottom:6px">'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Inicial</div>'
    +'<div id="wz_cust_ini" style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:6px">$0.00</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Cuota quincenal</div>'
    +'<div id="wz_cust_cuota" style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:6px">$0.00</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Total a pagar</div>'
    +'<div id="wz_cust_total" style="font-size:13px;font-weight:800;color:var(--ink)">$0.00</div>'
    +'</div>';
  grid.innerHTML = fixedCards + customCard;
  setTimeout(_wzApyCustomCalc, 0);
  _wzActualizarFinPreview(WZ.precio||0);
  _wzScore();
}

// Toggle entre % y $ del cuadro personalizado (wizard crédito)
function _wzApyCustomSetMode(mode){
  window._wzCustomMode = mode;
  var bp = document.getElementById('wz_cust_btn_pct'), bd = document.getElementById('wz_cust_btn_dol'), inp = document.getElementById('wz_cust_input');
  if(bp && bd){
    bp.style.background = (mode==='%')?'var(--p1)':'transparent';
    bp.style.color = (mode==='%')?'#fff':'var(--ink2)';
    bd.style.background = (mode==='$')?'var(--p1)':'transparent';
    bd.style.color = (mode==='$')?'#fff':'var(--ink2)';
  }
  if(inp){ inp.placeholder = (mode==='%')?'Ej: 60':'Ej: 800'; }
  _wzApyCustomCalc();
}

// Recalcula el cuadro de inicial personalizada (wizard crédito)
function _wzApyCustomCalc(){
  var precio = parseFloat(((document.getElementById('wz_precio_base_real')||{}).value))||parseFloat(WZ.precio)||0;
  var apy = parseFloat(((document.getElementById('wz_apy_objetivo')||{}).value))||0;
  var plazo = parseInt(((document.getElementById('wz_apy_plazo')||{}).value),10)||0;
  var inp = document.getElementById('wz_cust_input');
  var raw = inp ? inp.value : '';
  window._wzCustomVal = raw;
  var iniDol = document.getElementById('wz_cust_ini');
  var cuoEl = document.getElementById('wz_cust_cuota');
  var totEl = document.getElementById('wz_cust_total');
  if(!iniDol || !cuoEl || !totEl) return;
  if(!(precio>0) || !(apy>0) || !(plazo>0) || raw==='' || isNaN(parseFloat(raw))){
    iniDol.textContent='$0.00'; cuoEl.textContent='$0.00'; totEl.textContent='$0.00';
    return;
  }
  var val = parseFloat(raw)||0;
  var mode = (window._wzCustomMode==='$')?'$':'%';
  var pct;
  if(mode==='%'){
    pct = val/100;
  } else {
    pct = (precio>0) ? (val/precio) : 0;
  }
  if(pct < 0) pct = 0;
  if(pct > 1) pct = 1;
  try{
    var r = calcApyPlan(precio, pct, apy, plazo);
    iniDol.textContent = '$'+r.ini.toFixed(2);
    cuoEl.textContent = '$'+r.cuotaQ.toFixed(2);
    totEl.textContent = '$'+r.totalPagado.toFixed(2);
    window._wzCustomPct = pct;
    // Actualizar también el preview financiero del wizard si la inicial seleccionada es "custom"
    var sel = document.getElementById('wz_apy_inicial_sel');
    if(sel && sel.value === 'custom'){
      _wzActualizarFinPreview(WZ.precio||0);
      _wzMpagoSync();
      _wzScore();
    }
  }catch(e){
    iniDol.textContent='—'; cuoEl.textContent='—'; totEl.textContent='—';
  }
}

// ── Guardar el plan APY actual como plan nuevo en planesExtra ──
function _wzGuardarPlanApy(){
  var precio=parseFloat(((document.getElementById('wz_precio_base_real')||{}).value))||parseFloat(WZ.precio)||0;
  var apy=parseFloat(((document.getElementById('wz_apy_objetivo')||{}).value))||0;
  var plazo=parseInt(((document.getElementById('wz_apy_plazo')||{}).value),10)||0;
  var iniSelEl = document.getElementById('wz_apy_inicial_sel');
  var iniSelRaw = iniSelEl ? iniSelEl.value : '0.50';
  var iniSel;
  if(iniSelRaw === 'custom'){
    iniSel = parseFloat(window._wzCustomPct)||0;
    if(!(iniSel>0)){ if(typeof toast==='function') toast('Ingresa un valor para la inicial personalizada','error'); return; }
  } else {
    iniSel = parseFloat(iniSelRaw)||0.50;
  }
  if(!(precio>0)||!(apy>0)||!(plazo>0)){ if(typeof toast==='function') toast('Completa precio, APY y plazo','error'); return; }
  var r=calcApyPlan(precio,iniSel,apy,plazo);
  var nombre='APY '+apy.toFixed(1)+'% · '+plazo+'m · Ini '+(iniSel*100).toFixed(0)+'%';
  var newPlan={nombre:nombre, plazo:plazo, factor:parseFloat(r.factor.toFixed(4)), inicial:iniSel, tasaMensual:parseFloat(r.tasaMensual.toFixed(2)), apy:apy, moraPct:(PLAN.moraPct||2.5), diasGracia:(PLAN.diasGracia!=null?PLAN.diasGracia:5), origen:'apy'};
  if(!window._planesExtra) window._planesExtra=[];
  window._planesExtra.push(newPlan);
  try{ localStorage.setItem('pagasi_planes_extra', JSON.stringify(window._planesExtra)); }catch(_e){}
  if(typeof db!=='undefined' && db){
    db.collection('config').doc('planes').set({items:window._planesExtra})
      .then(function(){ if(typeof toast==='function') toast('Plan "'+nombre+'" guardado','success'); })
      .catch(function(){ if(typeof toast==='function') toast('Plan guardado localmente','success'); });
  } else {
    if(typeof toast==='function') toast('Plan "'+nombre+'" guardado localmente','success');
  }
}

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
