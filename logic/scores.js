// Logica de Scores: politica de riesgo, simulador, recalculo y analisis.
// Extraido de assets/pagasi-app.js sin cambiar formulas, pesos ni umbrales.

// SCORE: módulo de política de riesgo
// ══════════════════════════════════════════
var SCORE_FACTOR_META = [
  {k:'f1', nombre:'Historial crediticio', desc:'Comportamiento previo, mora, deudas, bancos'},
  {k:'f2', nombre:'Capacidad de pago', desc:'Ingresos, dependientes, ratio cuota/ingreso'},
  {k:'f3', nombre:'Estabilidad laboral', desc:'Tipo de empleo, antigüedad, uso de la moto'},
  {k:'f4', nombre:'Garantías', desc:'Fiador, vivienda propia, banco activo'},
  {k:'f5', nombre:'Origen y confianza', desc:'Referido, deudas, remesas'}
];

function scTab(tab){
  var card = $('sc-tabs');
  if(!card) return;
  var host = card.parentElement;
  Array.from(host.querySelectorAll('[data-sctab]')).forEach(function(el){
    var isBtn = el.classList.contains('cf-tab');
    var match = el.getAttribute('data-sctab')===tab;
    if(isBtn) el.classList.toggle('is-active', match);
    else el.classList.toggle('is-active', match);
  });
  if(tab==='pesos') scRenderPesos();
  if(tab==='umbrales') scRenderScalePreview();
}

function scRenderPesos(){
  var grid = $('sc-pesos-grid');
  if(!grid) return;
  var html = '';
  SCORE_FACTOR_META.forEach(function(f){
    var val = SCORE_CFG.pesos[f.k]||0;
    html += '<div style="padding:12px 14px;background:var(--surf2);border-radius:10px;border:1px solid var(--rim)">'
      + '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;gap:8px">'
      + '<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:800;color:var(--ink)">'+f.nombre+'</div>'
      + '<div style="font-size:10.5px;color:var(--ink3);margin-top:1px">'+f.desc+'</div></div>'
      + '<div style="font-size:22px;font-weight:900;color:var(--p1);font-family:var(--fd);line-height:1" id="sc-pct-'+f.k+'">'+val+'%</div>'
      + '</div>'
      + '<input type="range" id="sc-rng-'+f.k+'" min="0" max="60" step="1" value="'+val+'" oninput="scOnPesoChange(\''+f.k+'\', this.value)" style="width:100%;accent-color:var(--p1);cursor:pointer">'
      + '</div>';
  });
  grid.innerHTML = html;
  scUpdatePesosSum();
}

function scOnPesoChange(k, v){
  SCORE_CFG.pesos[k] = parseInt(v,10)||0;
  var el = $('sc-pct-'+k); if(el) el.textContent = SCORE_CFG.pesos[k]+'%';
  scUpdatePesosSum();
}

function scUpdatePesosSum(){
  var sum = Object.keys(SCORE_CFG.pesos).reduce(function(a,k){return a+(SCORE_CFG.pesos[k]||0);},0);
  var el = $('sc-pesos-sum');
  if(el){
    el.textContent = sum+'%';
    el.style.color = sum===100 ? 'var(--green)' : sum>100 ? 'var(--red)' : 'var(--amber)';
  }
}

function scRenderScalePreview(){
  var el = $('sc-scale-preview');
  if(!el) return;
  var reg = parseInt(($('sc_umb_reg')&&$('sc_umb_reg').value)||SCORE_CFG.umbrales.regular, 10);
  var bue = parseInt(($('sc_umb_bue')&&$('sc_umb_bue').value)||SCORE_CFG.umbrales.bueno, 10);
  var exc = parseInt(($('sc_umb_exc')&&$('sc_umb_exc').value)||SCORE_CFG.umbrales.excelente, 10);
  function pct(v){ return Math.max(0,Math.min(100, (v-300)/(850-300)*100 )); }
  var html = ''
    + '<div style="position:absolute;left:0;top:0;bottom:0;width:'+pct(reg)+'%;background:var(--red);opacity:.4"></div>'
    + '<div style="position:absolute;left:'+pct(reg)+'%;top:0;bottom:0;width:'+(pct(bue)-pct(reg))+'%;background:var(--amber);opacity:.45"></div>'
    + '<div style="position:absolute;left:'+pct(bue)+'%;top:0;bottom:0;width:'+(pct(exc)-pct(bue))+'%;background:var(--p1);opacity:.45"></div>'
    + '<div style="position:absolute;left:'+pct(exc)+'%;top:0;bottom:0;right:0;background:var(--green);opacity:.5"></div>'
    + '<div style="position:absolute;left:'+pct(reg)+'%;top:0;bottom:0;border-left:2px dashed var(--ink2)"><div style="position:absolute;bottom:3px;left:3px;font-size:10px;font-weight:800;color:var(--ink)">'+reg+'</div></div>'
    + '<div style="position:absolute;left:'+pct(bue)+'%;top:0;bottom:0;border-left:2px dashed var(--ink2)"><div style="position:absolute;bottom:3px;left:3px;font-size:10px;font-weight:800;color:var(--ink)">'+bue+'</div></div>'
    + '<div style="position:absolute;left:'+pct(exc)+'%;top:0;bottom:0;border-left:2px dashed var(--ink2)"><div style="position:absolute;bottom:3px;left:3px;font-size:10px;font-weight:800;color:var(--ink)">'+exc+'</div></div>'
    + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-around;font-size:10px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.35);pointer-events:none"><span>Rechaza</span><span>Revisa</span><span>Aprueba</span><span>Auto</span></div>';
  el.innerHTML = html;
}

function guardarScoreCfg(){
  // Pesos
  SCORE_FACTOR_META.forEach(function(f){
    var rng = $('sc-rng-'+f.k);
    if(rng) SCORE_CFG.pesos[f.k] = parseInt(rng.value,10)||0;
  });
  var sum = Object.keys(SCORE_CFG.pesos).reduce(function(a,k){return a+(SCORE_CFG.pesos[k]||0);},0);
  if(sum!==100){
    toast('La suma de pesos debe ser 100% (actualmente '+sum+'%)','error');
    return;
  }
  // Umbrales
  var exc = parseInt(($('sc_umb_exc')&&$('sc_umb_exc').value),10);
  var bue = parseInt(($('sc_umb_bue')&&$('sc_umb_bue').value),10);
  var reg = parseInt(($('sc_umb_reg')&&$('sc_umb_reg').value),10);
  if(!(reg<bue && bue<exc)){ toast('Los umbrales deben ser: regular < bueno < excelente','error'); return; }
  SCORE_CFG.umbrales.excelente = exc;
  SCORE_CFG.umbrales.bueno = bue;
  SCORE_CFG.umbrales.regular = reg;
  // Hard rejects
  SCORE_CFG.hardReject.ingresoMinimo = parseFloat(($('sc_hr_ing')&&$('sc_hr_ing').value))||0;
  SCORE_CFG.hardReject.ratioCuotaMax = (parseFloat(($('sc_hr_ratio')&&$('sc_hr_ratio').value))||35)/100;
  SCORE_CFG.hardReject.historialMaloConDeuda = !!($('sc_hr_histmalo')&&$('sc_hr_histmalo').checked);
  SCORE_CFG.hardReject.sinTelefono = !!($('sc_hr_notel')&&$('sc_hr_notel').checked);
  SCORE_CFG.hardReject.sinReferencias = !!($('sc_hr_noref')&&$('sc_hr_noref').checked);
  // Ratios
  SCORE_CFG.ratios.ideal = (parseFloat(($('sc_r_ideal')&&$('sc_r_ideal').value))||20)/100;
  SCORE_CFG.ratios.aceptable = (parseFloat(($('sc_r_ace')&&$('sc_r_ace').value))||30)/100;
  SCORE_CFG.ratios.alto = (parseFloat(($('sc_r_alto')&&$('sc_r_alto').value))||40)/100;
  SCORE_CFG.ratios.muyAlto = (parseFloat(($('sc_r_muyalto')&&$('sc_r_muyalto').value))||50)/100;
  // Ingresos base
  SCORE_CFG.ingreso.minBase = parseFloat(($('sc_ing_min')&&$('sc_ing_min').value))||100;
  SCORE_CFG.ingreso.maxBase = parseFloat(($('sc_ing_max')&&$('sc_ing_max').value))||3000;

  try{ localStorage.setItem('pagasi_config_score', JSON.stringify(SCORE_CFG)); }catch(_e){}
  if(typeof db!=='undefined' && db){
    db.collection('config').doc('score').set(SCORE_CFG)
      .then(function(){ toast('Política de riesgo guardada ✓','success'); })
      .catch(function(e){ toast('Error: '+e.message,'error'); });
  } else {
    toast('Política guardada (local) ✓','success');
  }
}

// ── Simulador interactivo ──
function abrirScoreSimulador(){
  setMicon('score'); $('mtt').textContent='Simulador de Score'; $('msb').textContent='Prueba distintos escenarios con la política actual';
  $('modal-box').className='modal modal-lg';
  $('mbd').innerHTML = ''
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'
    + '<div>'
    + '<div style="font-size:11px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Datos del solicitante</div>'
    + '<div class="fg"><label>Ingreso mensual (USD)</label><input class="fi" id="sim_ing" type="number" value="500" oninput="scSimular()"></div>'
    + '<div class="fg"><label>Ingreso familiar (USD)</label><input class="fi" id="sim_ifam" type="number" value="0" oninput="scSimular()"></div>'
    + '<div class="fg"><label>Cuota quincenal (USD)</label><input class="fi" id="sim_cuota" type="number" value="100" oninput="scSimular()"></div>'
    + '<div class="fg"><label>Tipo de empleo</label><select class="fs" id="sim_emp" onchange="scSimular()">'
    + '<option value="formal">Formal</option><option value="publico">Público</option><option value="independiente">Independiente</option>'
    + '<option value="comerciante">Comerciante</option><option value="delivery">Delivery</option><option value="remesas">Remesas</option>'
    + '<option value="informal" selected>Informal</option></select></div>'
    + '<div class="fg"><label>Antigüedad (años)</label><select class="fs" id="sim_ant" onchange="scSimular()"><option value="1">&lt;1</option><option value="2">1-2</option><option value="3" selected>2-3</option><option value="5">3+</option></select></div>'
    + '<div class="fg"><label>Historial crediticio</label><select class="fs" id="sim_hist" onchange="scSimular()"><option value="bueno">Bueno</option><option value="ninguno" selected>Ninguno</option><option value="mora_leve">Mora leve pasada</option><option value="malo">Malo</option></select></div>'
    + '<div class="fg"><label>Deudas actuales</label><select class="fs" id="sim_deuda" onchange="scSimular()"><option value="no" selected>No</option><option value="menores">Menores</option><option value="graves">Graves</option></select></div>'
    + '<div class="fg"><label>Dependientes</label><select class="fs" id="sim_dep" onchange="scSimular()"><option value="0" selected>0</option><option value="1">1</option><option value="2">2</option><option value="3">3+</option></select></div>'
    + '<div class="fg"><label>Banco</label><select class="fs" id="sim_banco" onchange="scSimular()"><option value="activa" selected>Cuenta activa</option><option value="inactiva">Inactiva</option><option value="no">Sin cuenta</option></select></div>'
    + '<div class="fg"><label>Vivienda</label><select class="fs" id="sim_viv" onchange="scSimular()"><option value="propia">Propia</option><option value="familiar" selected>Familiar</option><option value="alquilada">Alquilada</option></select></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px"><input type="checkbox" id="sim_fiador" onchange="scSimular()" style="accent-color:var(--p1)">Tiene fiador</label>'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px"><input type="checkbox" id="sim_tel" onchange="scSimular()" checked style="accent-color:var(--p1)">Tiene teléfono</label>'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px"><input type="checkbox" id="sim_ref" onchange="scSimular()" checked style="accent-color:var(--p1)">Tiene referencia</label>'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px"><input type="checkbox" id="sim_rem" onchange="scSimular()" style="accent-color:var(--p1)">Recibe remesas</label>'
    + '</div>'
    + '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">'
    + '<button class="btn btn-g btn-xs" onclick="scSimPreset(\'alexis\')">Preset: Alexis ($10k)</button>'
    + '<button class="btn btn-g btn-xs" onclick="scSimPreset(\'carlos\')">Preset: Carlos ($200)</button>'
    + '<button class="btn btn-g btn-xs" onclick="scSimPreset(\'ideal\')">Preset: Cliente ideal</button>'
    + '</div>'
    + '</div>'
    + '<div id="sim-resultado" style="padding:14px;background:var(--surf2);border-radius:12px;border:1px solid var(--rim);align-self:start">Cargando...</div>'
    + '</div>';
  $('mft').innerHTML='<button class="btn btn-p" onclick="closeM()">Cerrar</button>';
  $('ov').style.display='flex';
  setTimeout(scSimular, 30);
}

function scSimPreset(p){
  if(p==='alexis'){
    $('sim_ing').value=10000; $('sim_ifam').value=0; $('sim_cuota').value=150;
    $('sim_emp').value='formal'; $('sim_ant').value='5';
    $('sim_hist').value='ninguno'; $('sim_deuda').value='no'; $('sim_dep').value='1';
    $('sim_banco').value='activa'; $('sim_viv').value='propia';
    $('sim_fiador').checked=false; $('sim_tel').checked=true; $('sim_ref').checked=true; $('sim_rem').checked=false;
  } else if(p==='carlos'){
    $('sim_ing').value=200; $('sim_ifam').value=0; $('sim_cuota').value=60;
    $('sim_emp').value='informal'; $('sim_ant').value='2';
    $('sim_hist').value='ninguno'; $('sim_deuda').value='no'; $('sim_dep').value='2';
    $('sim_banco').value='inactiva'; $('sim_viv').value='alquilada';
    $('sim_fiador').checked=false; $('sim_tel').checked=true; $('sim_ref').checked=true; $('sim_rem').checked=false;
  } else if(p==='ideal'){
    $('sim_ing').value=1500; $('sim_ifam').value=0; $('sim_cuota').value=150;
    $('sim_emp').value='formal'; $('sim_ant').value='5';
    $('sim_hist').value='bueno'; $('sim_deuda').value='no'; $('sim_dep').value='0';
    $('sim_banco').value='activa'; $('sim_viv').value='propia';
    $('sim_fiador').checked=true; $('sim_tel').checked=true; $('sim_ref').checked=true; $('sim_rem').checked=false;
  }
  scSimular();
}

// Motor de cálculo reutilizable (usa SCORE_CFG actual)
// Recalcula el score de un cliente a partir de sus datos actuales y la configuración SCORE_CFG vigente
function recalcularScoreCliente(c, persistir){
  if(!c) return 0;
  var input = {
    ing: parseFloat(c.ingreso || c.wz_ing || 0),
    ifam: parseFloat(c.ingreso_familiar || c.wz_ifam || 0),
    cuotaQ: parseFloat(c.cuotaQ || 0),
    emp: c.tipo_empleo || c.trabajo_tipo || c.emp || 'informal',
    ant: c.antiguedad_laboral || c.ant || '3',
    hist: c.historial_crediticio || c.hist || 'ninguno',
    deuda: c.deudas_actuales || c.deuda || 'no',
    dep: parseInt(c.dependientes || c.dep || 0, 10),
    banco: c.cuenta_bancaria || c.banco || 'activa',
    viv: c.tipo_vivienda || c.viv || 'familiar',
    rem: c.recibe_remesas === 'si' || c.recibe_remesas === true || c.rem === 'si',
    fiador: !!c.fiador || !!c.tieneFiador,
    tieneTel: !!(c.tel || c.telefono),
    tieneRef: !!((c.referencias && c.referencias.length) || c.ref1_nombre || c.ref2_nombre),
    // Datos Cashea
    cashea_estado: c.cashea_estado || '',
    cashea_total_compras: c.cashea_total_compras || '',
    cashea_deuda: parseFloat(c.cashea_deuda || 0)
  };
  var result = calcularScoreConCfg(input);
  var nuevoScore = result && result.total ? result.total : (result || 0);
  if(persistir && nuevoScore && c.id){
    c.score_indexa = nuevoScore;
    c.score_actualizado = new Date().toISOString();
    if(typeof DB !== 'undefined' && DB.saveCliente) DB.saveCliente(c);
  }
  return nuevoScore;
}

// Recalcula el score de TODOS los clientes (usado al cambiar configuración o bajo demanda)
function recalcularTodosLosScores(){
  if(!S.clientes || !S.clientes.length) return 0;
  var n = 0;
  S.clientes.forEach(function(c){
    if(c.eliminado) return;
    var viejo = c.score_indexa || 0;
    var nuevo = recalcularScoreCliente(c, true);
    if(nuevo && nuevo !== viejo) n++;
  });
  return n;
}

// Recalcula todos los scores y refresca la lista visualmente
function recalcularScoresYRecargar(){
  if(!confirm('¿Recalcular el score de todos los clientes con la configuración actual?\n\nEsto puede tardar unos segundos.')) return;
  toast('Recalculando scores...','info');
  setTimeout(function(){
    var n = recalcularTodosLosScores();
    toast('✓ Recalculados '+n+' cliente'+(n!==1?'s':'')+' con cambios','success');
    var list = $('clienteList');
    if(list) list.innerHTML = renderClienteList(($('clienteQ')&&$('clienteQ').value)||'');
  }, 80);
}

// Recalcula score al vuelo en la ficha y actualiza la UI
function recalcularScoreClienteYRefrescar(cliId){
  var c = S.clientes.find(function(x){return x.id===cliId;});
  if(!c){ toast('Cliente no encontrado','error'); return; }
  var viejo = c.score_indexa || 0;
  var nuevo = recalcularScoreCliente(c, true);
  if(nuevo === viejo){
    toast('Score ya está actualizado: '+nuevo,'info');
  } else {
    toast('Score actualizado: '+viejo+' → '+nuevo,'success');
    // Refrescar la ficha
    closeM();
    setTimeout(function(){ verCliente(cliId); }, 200);
  }
}

function calcularScoreConCfg(input){
  var ing = parseFloat(input.ing||0);
  var ifam = parseFloat(input.ifam||0);
  var cuotaQ = parseFloat(input.cuotaQ||0);
  var emp = input.emp||'informal';
  var ant = String(input.ant||'3');
  var hist = input.hist||'ninguno';
  var deuda = input.deuda||'no';
  var dep = parseInt(input.dep||0, 10);
  var banco = input.banco||'activa';
  var viv = input.viv||'familiar';
  var rem = input.rem?'si':'no';
  var fiador = !!input.fiador;
  var tieneTel = input.tieneTel!==false;
  var tieneRef = input.tieneRef!==false;

  var ingEf = Math.max(ing, ifam);
  var ratio = (cuotaQ>0 && ingEf>0) ? cuotaQ*2/ingEf : 0; // cuota mensual / ingreso

  // f1: historial
  var f1 = {ninguno:50, bueno:100, mora_leve:35, malo:5}[hist]||50;
  if(deuda==='menores') f1 = Math.max(0, f1-12);
  else if(deuda==='graves') f1 = Math.max(0, f1-35);
  if(banco==='activa') f1 = Math.min(100, f1+10);
  else if(banco==='no') f1 = Math.max(0, f1-10);
  f1 = Math.max(0, Math.min(100, f1));

  // f2: capacidad
  var minB = SCORE_CFG.ingreso.minBase||100;
  var maxB = SCORE_CFG.ingreso.maxBase||3000;
  var f2 = 0;
  if(ingEf>=minB){
    f2 = Math.min(100, ((ingEf-minB)/(maxB-minB))*100);
  }
  var ingBase = {formal:80, publico:70, independiente:60, comerciante:65, delivery:70, remesas:55, informal:30}[emp]||50;
  f2 = f2 * (ingBase/70);
  if(dep===1) f2 = Math.max(0, f2-8);
  else if(dep===2) f2 = Math.max(0, f2-18);
  else if(dep>=3) f2 = Math.max(0, f2-28);
  if(viv==='propia') f2 = Math.min(100, f2+10);
  else if(viv==='alquilada') f2 = Math.max(0, f2-8);
  if(ratio>0){
    if(ratio<=SCORE_CFG.ratios.ideal) f2 = Math.min(100, f2+12);
    else if(ratio<=SCORE_CFG.ratios.aceptable) {}
    else if(ratio<=SCORE_CFG.ratios.alto) f2 = Math.max(0, f2-18);
    else if(ratio<=SCORE_CFG.ratios.muyAlto) f2 = Math.max(0, f2-38);
    else f2 = Math.max(0, f2-60);
  }
  f2 = Math.max(0, Math.min(100, f2));

  // f3: estabilidad laboral
  var empBase = {formal:78, publico:70, independiente:65, comerciante:68, delivery:70, remesas:60, informal:38}[emp]||30;
  var antBase = {'1':0, '2':10, '3':22, '5':35}[ant]||0;
  var f3 = Math.min(100, empBase+antBase);
  if(rem==='si'&&emp!=='remesas') f3 = Math.min(100, f3+8);
  f3 = Math.max(0, Math.min(100, f3));

  // f4: garantías
  var f4 = 25;
  if(fiador) f4 = Math.min(100, f4+45);
  if(viv==='propia') f4 = Math.min(100, f4+15);
  else if(viv==='familiar') f4 = Math.min(100, f4+5);
  if(banco==='activa') f4 = Math.min(100, f4+10);
  else if(banco==='no') f4 = Math.max(0, f4-10);
  f4 = Math.max(0, Math.min(100, f4));

  // f5: confianza
  var f5 = 50;
  if(deuda==='no') f5 = Math.min(100, f5+10);
  else if(deuda==='graves') f5 = Math.max(0, f5-15);
  if(rem==='si') f5 = Math.min(100, f5+8);
  f5 = Math.max(0, Math.min(100, f5));

  // Hard rejects
  var motivosRechazo = [];
  if(SCORE_CFG.hardReject.ingresoMinimo>0 && ingEf<SCORE_CFG.hardReject.ingresoMinimo)
    motivosRechazo.push('Ingreso ('+ingEf+') < mínimo requerido ('+SCORE_CFG.hardReject.ingresoMinimo+')');
  if(SCORE_CFG.hardReject.ratioCuotaMax>0 && ratio>SCORE_CFG.hardReject.ratioCuotaMax)
    motivosRechazo.push('Ratio cuota/ingreso '+(Math.round(ratio*100))+'% > máximo '+(Math.round(SCORE_CFG.hardReject.ratioCuotaMax*100))+'%');
  if(SCORE_CFG.hardReject.historialMaloConDeuda && hist==='malo' && deuda==='graves')
    motivosRechazo.push('Historial malo + deudas graves');
  if(SCORE_CFG.hardReject.sinTelefono && !tieneTel) motivosRechazo.push('Sin teléfono de contacto');
  if(SCORE_CFG.hardReject.sinReferencias && !tieneRef) motivosRechazo.push('Sin referencias');

  // Score
  var p = SCORE_CFG.pesos;
  var raw = (f1*p.f1 + f2*p.f2 + f3*p.f3 + f4*p.f4 + f5*p.f5)/100*10;
  var score = motivosRechazo.length>0 ? 300 : Math.max(300, Math.min(850, Math.round(300+(raw/1000)*550)));

  var decision, decisionColor;
  if(motivosRechazo.length>0){ decision='RECHAZO AUTOMÁTICO'; decisionColor='var(--red)'; }
  else if(score>=SCORE_CFG.umbrales.excelente){ decision='APROBACIÓN AUTOMÁTICA'; decisionColor='var(--green)'; }
  else if(score>=SCORE_CFG.umbrales.bueno){ decision='APROBAR'; decisionColor='var(--p1)'; }
  else if(score>=SCORE_CFG.umbrales.regular){ decision='REVISAR MANUALMENTE'; decisionColor='var(--amber)'; }
  else { decision='RECHAZAR'; decisionColor='var(--red)'; }

  return {score:score, decision:decision, decisionColor:decisionColor, motivosRechazo:motivosRechazo,
          f1:Math.round(f1), f2:Math.round(f2), f3:Math.round(f3), f4:Math.round(f4), f5:Math.round(f5),
          ratio:ratio, ingEf:ingEf};
}

function scSimular(){
  var res = calcularScoreConCfg({
    ing: ($('sim_ing')&&$('sim_ing').value)||0,
    ifam: ($('sim_ifam')&&$('sim_ifam').value)||0,
    cuotaQ: ($('sim_cuota')&&$('sim_cuota').value)||0,
    emp: ($('sim_emp')&&$('sim_emp').value)||'informal',
    ant: ($('sim_ant')&&$('sim_ant').value)||'3',
    hist: ($('sim_hist')&&$('sim_hist').value)||'ninguno',
    deuda: ($('sim_deuda')&&$('sim_deuda').value)||'no',
    dep: ($('sim_dep')&&$('sim_dep').value)||0,
    banco: ($('sim_banco')&&$('sim_banco').value)||'activa',
    viv: ($('sim_viv')&&$('sim_viv').value)||'familiar',
    rem: $('sim_rem')&&$('sim_rem').checked,
    fiador: $('sim_fiador')&&$('sim_fiador').checked,
    tieneTel: !($('sim_tel')&&!$('sim_tel').checked),
    tieneRef: !($('sim_ref')&&!$('sim_ref').checked)
  });

  var host = $('sim-resultado');
  if(!host) return;

  var html = '';
  html += '<div style="text-align:center;padding:10px 0 14px;border-bottom:1px solid var(--rim);margin-bottom:14px">'
    + '<div style="font-size:56px;font-weight:900;letter-spacing:-2px;line-height:1;color:'+res.decisionColor+'">'+res.score+'</div>'
    + '<div style="font-size:12px;color:var(--ink3);margin-top:4px">Score Indexa / 850</div>'
    + '<div style="display:inline-block;margin-top:10px;padding:6px 14px;background:'+res.decisionColor+';color:#fff;font-weight:800;font-size:12px;letter-spacing:.3px;border-radius:999px">'+res.decision+'</div>'
    + '</div>';

  if(res.motivosRechazo.length){
    html += '<div style="padding:10px 12px;background:var(--reds);border-radius:8px;margin-bottom:12px">'
      + '<div style="font-size:11px;font-weight:800;color:var(--red);text-transform:uppercase;margin-bottom:4px"> Rechazo automático por:</div>';
    res.motivosRechazo.forEach(function(m){
      html += '<div style="font-size:12px;color:var(--ink);margin-top:3px">• '+m+'</div>';
    });
    html += '</div>';
  }

  html += '<div style="font-size:11px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Desglose por factor</div>';
  SCORE_FACTOR_META.forEach(function(f){
    var v = res[f.k];
    var peso = SCORE_CFG.pesos[f.k];
    var contrib = Math.round(v*peso/100);
    var col = v>=70?'var(--green)':v>=50?'var(--p1)':v>=30?'var(--amber)':'var(--red)';
    html += '<div style="padding:8px 0;border-bottom:1px solid var(--rim)">'
      + '<div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">'
      + '<span style="font-weight:700;color:var(--ink)">'+f.nombre+' <span style="color:var(--ink3);font-weight:500">(peso '+peso+'%)</span></span>'
      + '<span style="font-weight:900;color:'+col+';font-family:var(--fd)">'+v+'/100</span>'
      + '</div>'
      + '<div style="height:5px;background:var(--rim);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+v+'%;background:'+col+'"></div></div>'
      + '<div style="font-size:10px;color:var(--ink3);margin-top:3px">Aporta '+contrib+' pts al score</div>'
      + '</div>';
  });
  if(res.ratio>0){
    var r = Math.round(res.ratio*100);
    var rcol = r<=20?'var(--green)':r<=30?'var(--p1)':r<=40?'var(--amber)':'var(--red)';
    html += '<div style="margin-top:10px;padding:10px 12px;background:var(--gs);border-radius:9px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<div style="font-size:11px;color:var(--ink2);font-weight:700">Ratio cuota mensual / ingreso</div>'
      + '<div style="font-size:18px;font-weight:900;color:'+rcol+'">'+r+'%</div>'
      + '</div></div>';
  }
  host.innerHTML = html;
}

// ── Análisis del portafolio actual ──
function abrirScoreAnalisis(){
  setMicon('detalle'); $('mtt').textContent='Análisis del Portafolio'; $('msb').textContent='Distribución de score y mora actual';
  $('modal-box').className='modal modal-lg';

  // Recopilar datos
  var clientes = (S.clientes||[]).filter(function(c){return !c.eliminado;});
  var bandas = [
    {lbl:'Bajo (<450)', min:300, max:450, col:'var(--red)'},
    {lbl:'Regular (450-549)', min:450, max:550, col:'rgba(232,152,10,.7)'},
    {lbl:'Bueno (550-624)', min:550, max:625, col:'var(--amber)'},
    {lbl:'Muy bueno (625-749)', min:625, max:750, col:'var(--p1)'},
    {lbl:'Excelente (≥750)', min:750, max:851, col:'var(--green)'}
  ];
  var stats = bandas.map(function(b){
    var enBanda = clientes.filter(function(c){ var s=c.score_indexa||0; return s>=b.min && s<b.max; });
    var conCred = enBanda.filter(function(c){ return getCreditosCliente(c).length>0; });
    var enMora = enBanda.filter(function(c){
      return getCreditosCliente(c).some(function(cr){ return (cr.mora||0)>0; });
    });
    var tuvoMora = enBanda.filter(function(c){
      return getCreditosCliente(c).some(function(cr){ return cr.tuvoMoraHistorica===true || (cr.mora||0)>0; });
    });
    return {
      lbl:b.lbl, col:b.col,
      total:enBanda.length,
      conCred:conCred.length,
      enMora:enMora.length,
      tuvoMora:tuvoMora.length,
      pctMora: conCred.length>0 ? Math.round(tuvoMora.length/conCred.length*100) : 0
    };
  });
  var totalCli = clientes.length;
  var maxBanda = Math.max.apply(null, stats.map(function(s){return s.total;}).concat([1]));

  var html = '';
  // Resumen
  var totalMora = clientes.filter(function(c){
    return getCreditosCliente(c).some(function(cr){ return (cr.mora||0)>0; });
  }).length;
  var totalConCred = clientes.filter(function(c){ return getCreditosCliente(c).length>0; }).length;
  var pctMoraGlobal = totalConCred>0 ? Math.round(totalMora/totalConCred*100) : 0;

  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">'
    + '<div class="cf-kpi"><div class="cf-kpi-v">'+totalCli+'</div><div class="cf-kpi-l">Clientes totales</div></div>'
    + '<div class="cf-kpi"><div class="cf-kpi-v">'+totalConCred+'</div><div class="cf-kpi-l">Con plan</div></div>'
    + '<div class="cf-kpi is-r"><div class="cf-kpi-v">'+totalMora+'</div><div class="cf-kpi-l">En mora hoy</div></div>'
    + '<div class="cf-kpi'+(pctMoraGlobal>15?' is-r':pctMoraGlobal>8?' is-a':' is-g')+'"><div class="cf-kpi-v">'+pctMoraGlobal+'%</div><div class="cf-kpi-l">Tasa de mora</div></div>'
    + '</div>';

  // Distribución por banda con tasa de mora
  html += '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:12px;padding:14px 16px;margin-bottom:12px">'
    + '<div style="font-size:11px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Distribución por banda de score · tasa de mora histórica</div>';
  stats.forEach(function(s){
    var wBar = Math.round(s.total/maxBanda*100);
    var moraCol = s.pctMora>=30?'var(--red)':s.pctMora>=15?'var(--amber)':'var(--green)';
    html += '<div style="padding:9px 0;border-bottom:1px solid var(--rim)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;margin-bottom:5px">'
      + '<div style="font-weight:800;color:var(--ink)">'+s.lbl+'</div>'
      + '<div style="display:flex;gap:14px;align-items:center">'
      + '<span style="font-size:11px;color:var(--ink3)">'+s.conCred+' con plan</span>'
      + '<span style="font-weight:900;color:'+moraCol+';font-family:var(--fd);font-size:13px">'+s.pctMora+'% mora</span>'
      + '<span style="font-weight:800;color:var(--ink);font-family:var(--fd);min-width:30px;text-align:right">'+s.total+'</span>'
      + '</div>'
      + '</div>'
      + '<div style="height:8px;background:var(--surf2);border-radius:4px;overflow:hidden">'
      + '<div style="height:100%;width:'+wBar+'%;background:'+s.col+';border-radius:4px"></div>'
      + '</div></div>';
  });
  html += '</div>';

  // Alertas / recomendaciones
  var recos = [];
  stats.forEach(function(s, i){
    if(i<2 && s.pctMora>=25) recos.push({tipo:'warn', txt:'La banda "'+s.lbl+'" tiene '+s.pctMora+'% de mora. Considera <b>subir el umbral de rechazo</b> o endurecer hard-rejects.'});
    if(i>=3 && s.pctMora>=15) recos.push({tipo:'warn', txt:'La banda "'+s.lbl+'" (supuestamente buena) tiene '+s.pctMora+'% de mora. El modelo puede estar siendo <b>demasiado permisivo</b>.'});
  });
  if(pctMoraGlobal>15) recos.push({tipo:'crit', txt:'Tasa global de mora de <b>'+pctMoraGlobal+'%</b> es alta. Revisa los pesos de los factores y los hard-rejects.'});
  if(pctMoraGlobal<3 && totalConCred>10) recos.push({tipo:'ok', txt:'Mora global de '+pctMoraGlobal+'% muy baja. Podrías <b>relajar requisitos</b> para captar más clientes sin subir demasiado el riesgo.'});

  // Casos concretos
  var alexis = clientes.find(function(c){ return /alexis\s+ramos/i.test(c.nombre||''); });
  var carlos = clientes.find(function(c){ return /carlos\s+l[oó]pez/i.test(c.nombre||''); });
  if(alexis || carlos){
    html += '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:12px;padding:14px 16px;margin-bottom:12px">'
      + '<div style="font-size:11px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px">Casos específicos</div>';
    [alexis, carlos].filter(Boolean).forEach(function(c){
      var s = c.score_indexa||0;
      var ing = c.ingreso||0;
      var col = s>=625?'var(--green)':s>=450?'var(--amber)':'var(--red)';
      html += '<div style="display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--rim)">'
        + '<div style="width:54px;text-align:center"><div style="font-size:22px;font-weight:900;color:'+col+';line-height:1">'+s+'</div><div style="font-size:9px;color:var(--ink3)">/850</div></div>'
        + '<div style="flex:1"><div style="font-weight:800;font-size:13px">'+c.nombre+'</div>'
        + '<div style="font-size:11px;color:var(--ink3)">Ingreso: $'+ing+'/mes · '+(c.trabajo||'—')+' · '+(c.ciudad||'—')+'</div></div>'
        + '</div>';
    });
    html += '<div style="padding:10px 12px;background:var(--ambers);border-radius:8px;margin-top:10px;font-size:11.5px;color:var(--ink2);line-height:1.5">'
      + '<b>Observación:</b> si un cliente con $200/mes está arriba de 600, probablemente el peso de "Capacidad de pago" es bajo o el ingreso mínimo base es muy permisivo. Ve a la pestaña Ratio y revisa "Ingreso mínimo base".'
      + '</div></div>';
  }

  if(recos.length){
    html += '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:12px;padding:14px 16px">'
      + '<div style="font-size:11px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px"> Recomendaciones</div>';
    recos.forEach(function(r){
      var bg = r.tipo==='crit'?'var(--reds)':r.tipo==='warn'?'var(--ambers)':'var(--greens)';
      var bc = r.tipo==='crit'?'var(--red)':r.tipo==='warn'?'var(--amber)':'var(--green)';
      html += '<div style="padding:10px 12px;background:'+bg+';border-radius:8px;margin-bottom:6px;font-size:12px;color:var(--ink2);line-height:1.5">'+r.txt+'</div>';
    });
    html += '</div>';
  }

  $('mbd').innerHTML = html;
  $('mft').innerHTML='<button class="btn btn-p" onclick="closeM()">Cerrar</button>';
  $('ov').style.display='flex';
}
