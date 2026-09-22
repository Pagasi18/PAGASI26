// Pagasi module: scores
PG.scores = function(){
  setTimeout(function(){
    // Cargar score desde Firebase
    if(db){
      db.collection('config').doc('score').get().then(function(doc){
        if(doc.exists){
          var d=doc.data();
          if(d && typeof d==='object'){
            if(d.pesos) Object.assign(SCORE_CFG.pesos, d.pesos);
            if(d.umbrales) Object.assign(SCORE_CFG.umbrales, d.umbrales);
            if(d.hardReject) Object.assign(SCORE_CFG.hardReject, d.hardReject);
            if(d.ratios) Object.assign(SCORE_CFG.ratios, d.ratios);
            if(d.ingreso) Object.assign(SCORE_CFG.ingreso, d.ingreso);
          }
        }
        scRenderPesos();
      }).catch(function(){ scRenderPesos(); });
    } else {
      scRenderPesos();
    }
    // Listeners umbrales para preview
    ['sc_umb_exc','sc_umb_bue','sc_umb_reg'].forEach(function(id){
      var el=$(id); if(el) el.oninput = scRenderScalePreview;
    });
    scRenderScalePreview();
  },80);

  // ═══════════ ANÁLISIS DE PORTFOLIO EN VIVO ═══════════
  var clientesConScore = S.clientes.filter(function(c){
    if(c.eliminado) return false;
    var s = c.score_indexa;
    if(s && typeof s==='object') s = s.total||s.score||s.valor||0;
    s = parseFloat(s)||0;
    return s >= 300 && s <= 850;
  });

  var totalClientes = S.clientes.filter(function(c){return !c.eliminado;}).length;
  var sinScore = totalClientes - clientesConScore.length;
  var cobertura = totalClientes ? Math.round(clientesConScore.length / totalClientes * 100) : 0;

  // Extraer scores
  function getScore(c){
    var s = c.score_indexa;
    if(s && typeof s==='object') s = s.total||s.score||s.valor||0;
    return parseFloat(s)||0;
  }

  var scores = clientesConScore.map(getScore);
  var scoreProm = scores.length ? Math.round(scores.reduce(function(a,b){return a+b;},0) / scores.length) : 0;
  var scoreMin = scores.length ? Math.min.apply(null, scores) : 0;
  var scoreMax = scores.length ? Math.max.apply(null, scores) : 0;
  var scoreMediana = 0;
  if(scores.length){
    var sorted = scores.slice().sort(function(a,b){return a-b;});
    scoreMediana = sorted[Math.floor(sorted.length/2)];
  }

  // Clasificar
  var umbExc = SCORE_CFG.umbrales.excelente;
  var umbBue = SCORE_CFG.umbrales.bueno;
  var umbReg = SCORE_CFG.umbrales.regular;
  var nExc = scores.filter(function(s){return s>=umbExc;}).length;
  var nBue = scores.filter(function(s){return s>=umbBue && s<umbExc;}).length;
  var nReg = scores.filter(function(s){return s>=umbReg && s<umbBue;}).length;
  var nBajo = scores.filter(function(s){return s<umbReg;}).length;

  // Histograma por rangos de 50 puntos (300-850 = 11 bins)
  var bins = [];
  for(var i=300; i<850; i+=50){
    var count = scores.filter(function(s){return s>=i && s<i+50;}).length;
    bins.push({rango:i+'-'+(i+49), min:i, max:i+49, count:count});
  }
  var maxBin = Math.max(1, Math.max.apply(null, bins.map(function(b){return b.count;})));

  // Tasa de aprobación histórica (basada en créditos creados vs clientes con score)
  var totalCredsCreados = S.creds.filter(function(c){return !c.eliminado && c.estado!=='cancelado';}).length;
  var tasaAprobacion = totalClientes ? Math.round(totalCredsCreados / totalClientes * 100) : 0;

  // Correlación score vs mora
  var clientesEnMora = S.creds.filter(function(c){return !c.eliminado && c.mora>0;});
  var clientesConScoreEnMora = 0;
  var scoreSumEnMora = 0;
  clientesEnMora.forEach(function(cr){
    var cli = S.clientes.find(function(x){return x.nombre===cr.cli;});
    if(cli){
      var s = getScore(cli);
      if(s>0){ clientesConScoreEnMora++; scoreSumEnMora += s; }
    }
  });
  var scoreProMora = clientesConScoreEnMora ? Math.round(scoreSumEnMora/clientesConScoreEnMora) : 0;

  // Distribución por decisión (visual donut)
  var totalClasificados = nExc + nBue + nReg + nBajo;
  function pct(n){ return totalClasificados ? Math.round(n/totalClasificados*100) : 0; }

  // Top 5 mejores y peores scores
  var ranked = clientesConScore.map(function(c){return {c:c, s:getScore(c)};}).sort(function(a,b){return b.s-a.s;});
  var topMejores = ranked.slice(0,5);
  var topPeores = ranked.slice(-5).reverse();

  // Reglas activas (hard rejects)
  var reglasActivas = 0;
  if(SCORE_CFG.hardReject.historialMaloConDeuda) reglasActivas++;
  if(SCORE_CFG.hardReject.sinTelefono) reglasActivas++;
  if(SCORE_CFG.hardReject.sinReferencias) reglasActivas++;

  return`<div class="page">

    ${pageBanner(
      'Motor de decisión · Score Indexa v2.0',
      'Política de Riesgo Crediticio',
      'Configura cómo se evalúa cada solicitud. Los cambios se aplican a nuevas solicitudes y al recalcular el portfolio.',
      [
        {label:'Simulador', onclick:'abrirScoreSimulador()'},
        {label:'Análisis completo', onclick:'abrirScoreAnalisis()'},
        {label:'↻ Recalcular portfolio', onclick:'recalcularScoresYRecargar()'},
        {label:'Guardar cambios', onclick:'guardarScoreCfg()', primary:true}
      ]
    )}

    <!-- ═══ KPIs DEL PORTFOLIO ═══ -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px">
      <div class="stat" style="">
        <div class="st-v" style="color:var(--p1);font-size:24px">${scoreProm||'—'}</div>
        <div class="st-l">Score promedio</div>
        <div style="font-size:10px;color:var(--ink3);margin-top:3px">Mediana: ${scoreMediana||'—'}</div>
      </div>
      <div class="stat" style="">
        <div class="st-v" style="color:var(--green);font-size:24px">${nExc}</div>
        <div class="st-l">Excelente ≥${umbExc}</div>
        <div style="font-size:10px;color:var(--ink3);margin-top:3px">${pct(nExc)}% del total</div>
      </div>
      <div class="stat" style="">
        <div class="st-v" style="color:var(--p1);font-size:24px">${nBue}</div>
        <div class="st-l">Bueno ${umbBue}-${umbExc-1}</div>
        <div style="font-size:10px;color:var(--ink3);margin-top:3px">${pct(nBue)}% del total</div>
      </div>
      <div class="stat" style="">
        <div class="st-v" style="color:var(--amber);font-size:24px">${nReg}</div>
        <div class="st-l">Regular ${umbReg}-${umbBue-1}</div>
        <div style="font-size:10px;color:var(--ink3);margin-top:3px">${pct(nReg)}% del total</div>
      </div>
      <div class="stat" style="">
        <div class="st-v" style="color:var(--red);font-size:24px">${nBajo}</div>
        <div class="st-l">Rechazable &lt;${umbReg}</div>
        <div style="font-size:10px;color:var(--ink3);margin-top:3px">${pct(nBajo)}% del total</div>
      </div>
      <div class="stat" style="">
        <div class="st-v" style="font-size:24px">${cobertura}%</div>
        <div class="st-l">Cobertura</div>
        <div style="font-size:10px;color:var(--ink3);margin-top:3px">${clientesConScore.length}/${totalClientes} clientes</div>
      </div>
    </div>

    <!-- ═══ DISTRIBUCIÓN VISUAL + DONUT ═══ -->
    <div style="display:grid;grid-template-columns:1.7fr 1fr;gap:12px;margin-bottom:14px">

      <!-- Histograma de scores -->
      <div class="card">
        <div class="ch">
          <div>
            <div class="ct"> Distribución de scores · Portfolio</div>
            <div class="cs">Histograma de los ${clientesConScore.length} clientes calificados · rangos de 50 puntos</div>
          </div>
          <div style="display:flex;gap:12px;font-size:10.5px">
            <span style="color:var(--red);font-weight:700">&lt;${umbReg}</span>
            <span style="color:var(--amber);font-weight:700">${umbReg}-${umbBue-1}</span>
            <span style="color:var(--p1);font-weight:700">${umbBue}-${umbExc-1}</span>
            <span style="color:var(--green);font-weight:700">≥${umbExc}</span>
          </div>
        </div>
        <div style="display:flex;align-items:flex-end;gap:4px;height:160px;margin-top:12px;padding:0 4px">
          ${bins.map(function(b){
            var col = b.min>=umbExc ? 'var(--green)' :
                      b.min>=umbBue ? 'var(--p1)' :
                      b.min>=umbReg ? 'var(--amber)' : 'var(--red)';
            var h = b.count>0 ? Math.max(8, Math.round(b.count/maxBin*130)) : 3;
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
              <div style="font-size:9.5px;font-weight:800;color:${b.count>0?col:'var(--ink3)'};height:14px">${b.count>0?b.count:''}</div>
              <div style="flex:1;width:100%;display:flex;align-items:flex-end">
                <div style="width:100%;background:${col};border-radius:4px 4px 0 0;height:${h}px;opacity:${b.count>0?1:.15};transition:height .3s" title="${b.rango}: ${b.count} clientes"></div>
              </div>
              <div style="font-size:8.5px;color:var(--ink3);font-weight:600;transform:rotate(-35deg);transform-origin:top;white-space:nowrap;margin-top:2px">${b.min}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:20px;padding-top:12px;border-top:1px solid var(--rim2)">
          <div style="font-size:10.5px"><span style="color:var(--ink3)">Mínimo:</span> <b style="color:var(--red)">${scoreMin||'—'}</b></div>
          <div style="font-size:10.5px"><span style="color:var(--ink3)">Promedio:</span> <b style="color:var(--p1)">${scoreProm||'—'}</b></div>
          <div style="font-size:10.5px"><span style="color:var(--ink3)">Mediana:</span> <b>${scoreMediana||'—'}</b></div>
          <div style="font-size:10.5px"><span style="color:var(--ink3)">Máximo:</span> <b style="color:var(--green)">${scoreMax||'—'}</b></div>
        </div>
      </div>

      <!-- Donut de decisiones -->
      <div class="card">
        <div class="ch">
          <div>
            <div class="ct"> Tasa de aprobación</div>
            <div class="cs">Con los umbrales actuales</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;padding:18px 0">
          ${(function(){
            var ang = 0;
            var segments = [
              {n:nExc, col:'#05a060'},
              {n:nBue, col:'#2563EB'},
              {n:nReg, col:'#e8980a'},
              {n:nBajo, col:'#d93b5a'}
            ];
            var total = Math.max(1, totalClasificados);
            var paths = segments.map(function(seg){
              if(seg.n===0) return '';
              var a1 = ang;
              var a2 = ang + (seg.n/total)*360;
              ang = a2;
              var r = 55, cx=70, cy=70;
              var x1 = cx + r*Math.cos((a1-90)*Math.PI/180);
              var y1 = cy + r*Math.sin((a1-90)*Math.PI/180);
              var x2 = cx + r*Math.cos((a2-90)*Math.PI/180);
              var y2 = cy + r*Math.sin((a2-90)*Math.PI/180);
              var large = (a2-a1)>180 ? 1 : 0;
              return '<path d="M '+cx+' '+cy+' L '+x1+' '+y1+' A '+r+' '+r+' 0 '+large+' 1 '+x2+' '+y2+' Z" fill="'+seg.col+'"/>';
            }).join('');
            return '<svg width="140" height="140" viewBox="0 0 140 140">'
              + (totalClasificados?paths:'<circle cx="70" cy="70" r="55" fill="var(--rim)"/>')
              + '<circle cx="70" cy="70" r="34" fill="var(--surf)"/>'
              + '<text x="70" y="68" text-anchor="middle" font-size="22" font-weight="900" fill="var(--ink)">'+(nExc+nBue)+'</text>'
              + '<text x="70" y="84" text-anchor="middle" font-size="9" font-weight="700" fill="var(--ink3)">APROBABLES</text>'
              + '</svg>';
          })()}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px"><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#05a060"></span>Excelente</span><b>${nExc} · ${pct(nExc)}%</b></div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px"><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#2563EB"></span>Bueno</span><b>${nBue} · ${pct(nBue)}%</b></div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px"><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#e8980a"></span>Regular</span><b>${nReg} · ${pct(nReg)}%</b></div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px"><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#d93b5a"></span>Rechazado</span><b>${nBajo} · ${pct(nBajo)}%</b></div>
        </div>
      </div>
    </div>

    <!-- ═══ ESCALA VISUAL ═══ -->
    <div class="card" style="margin-bottom:14px">
      <div class="ch" style="margin-bottom:10px">
        <div>
          <div class="ct">️ Escala de decisión · 300 a 850 puntos</div>
          <div class="cs">Rango FICO estándar adaptado · cada zona tiene su regla</div>
        </div>
      </div>
      <div style="position:relative;height:48px;border-radius:10px;overflow:hidden;background:var(--surf2);margin-top:6px">
        <div style="position:absolute;inset:0;display:flex">
          <div style="flex:${umbReg-300};background:linear-gradient(90deg,#8B0000,#d93b5a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;letter-spacing:.3px">RECHAZO</div>
          <div style="flex:${umbBue-umbReg};background:linear-gradient(90deg,#d93b5a,#e8980a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;letter-spacing:.3px">REVISAR</div>
          <div style="flex:${umbExc-umbBue};background:linear-gradient(90deg,#e8980a,#2563EB);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;letter-spacing:.3px">APROBAR</div>
          <div style="flex:${850-umbExc};background:linear-gradient(90deg,#2563EB,#05a060);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;letter-spacing:.3px">AUTO-APROBAR</div>
        </div>
        ${scoreProm?`<div style="position:absolute;top:-4px;bottom:-4px;left:${((scoreProm-300)/550)*100}%;width:2px;background:#000;box-shadow:0 0 0 1px #fff"></div><div style="position:absolute;top:-18px;left:${((scoreProm-300)/550)*100}%;transform:translateX(-50%);font-size:9px;font-weight:800;background:#000;color:#fff;padding:1px 6px;border-radius:3px">Prom: ${scoreProm}</div>`:''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--ink3);margin-top:4px;font-weight:700">
        <span>300</span><span>${umbReg}</span><span>${umbBue}</span><span>${umbExc}</span><span>850</span>
      </div>
    </div>

    <!-- ═══ CONFIGURACIÓN PRINCIPAL (TABS) ═══ -->
    <div class="card" style="margin-bottom:14px">
      <div class="ch" style="border-bottom:2px solid var(--rim);padding-bottom:10px;margin-bottom:14px">
        <div>
          <div class="ct">️ Configuración del motor de decisión</div>
          <div class="cs">Ajusta cada parámetro según tu apetito de riesgo · los cambios se guardan al hacer clic en "Guardar"</div>
        </div>
      </div>

      <!-- Tabs internas del módulo -->
      <div class="cf-tabs" id="sc-tabs">
        <button class="cf-tab is-active" data-sctab="pesos" onclick="scTab('pesos')">️ Pesos de factores</button>
        <button class="cf-tab" data-sctab="umbrales" onclick="scTab('umbrales')"> Umbrales</button>
        <button class="cf-tab" data-sctab="hard" onclick="scTab('hard')"> Rechazos automáticos</button>
        <button class="cf-tab" data-sctab="ratio" onclick="scTab('ratio')"> Ratio cuota/ingreso</button>
      </div>

      <!-- PANEL: PESOS -->
      <div class="cf-panel is-active" data-sctab="pesos">
        <div style="background:linear-gradient(135deg,rgba(37,99,235,.08),rgba(124,109,255,.05));border:1px solid rgba(37,99,235,.15);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:var(--ink2);line-height:1.5">
          <b>️ Cada factor aporta un % al score final.</b> La suma debe ser 100%. Ajusta según el perfil de riesgo que quieras priorizar. Un peso mayor en "Ingreso" hará más estricto el filtro por capacidad de pago; un peso mayor en "Historial" premiará a quienes ya pagaron bien antes.
        </div>
        <div id="sc-pesos-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"></div>
        <div style="margin-top:10px;padding:12px 14px;background:var(--gs);border-radius:9px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--rim2)">
          <div>
            <div style="font-size:11.5px;color:var(--ink2);font-weight:700">Suma total de pesos</div>
            <div style="font-size:10px;color:var(--ink3);margin-top:2px">Debe ser exactamente 100% para que el modelo sea coherente</div>
          </div>
          <div id="sc-pesos-sum" style="font-size:28px;font-weight:900;color:var(--p1);font-family:var(--fd);letter-spacing:-.5px">100%</div>
        </div>
      </div>

      <!-- PANEL: UMBRALES -->
      <div class="cf-panel" data-sctab="umbrales">
        <div style="background:linear-gradient(135deg,rgba(232,152,10,.08),rgba(217,59,90,.05));border:1px solid rgba(232,152,10,.15);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:var(--ink2);line-height:1.5">
          <b> Umbrales de decisión.</b> Define qué score se considera excelente/bueno/regular. Las solicitudes bajo el umbral regular se rechazan automáticamente.
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          <div class="fg"><label style="color:var(--green);font-weight:700">✓ Excelente (auto-aprobación) ≥</label><input class="fi" id="sc_umb_exc" type="number" min="300" max="850" value="${SCORE_CFG.umbrales.excelente}"><div style="font-size:10.5px;color:var(--ink3);margin-top:3px">${nExc} clientes en esta categoría</div></div>
          <div class="fg"><label style="color:var(--p1);font-weight:700">○ Bueno (aprobar) ≥</label><input class="fi" id="sc_umb_bue" type="number" min="300" max="850" value="${SCORE_CFG.umbrales.bueno}"><div style="font-size:10.5px;color:var(--ink3);margin-top:3px">${nBue} clientes en esta categoría</div></div>
          <div class="fg"><label style="color:var(--amber);font-weight:700"> Regular (revisar manual) ≥</label><input class="fi" id="sc_umb_reg" type="number" min="300" max="850" value="${SCORE_CFG.umbrales.regular}"><div style="font-size:10.5px;color:var(--ink3);margin-top:3px">${nReg} clientes en esta categoría</div></div>
        </div>
        <div style="margin-top:12px;padding:12px 14px;background:var(--reds);border-radius:9px;font-size:11.5px;color:var(--ink2)">
          <b style="color:var(--red)"> Atención:</b> Todo score por <b>debajo del umbral regular (${umbReg})</b> se rechaza automáticamente. Actualmente hay <b>${nBajo} clientes</b> (${pct(nBajo)}%) que caerían en esta categoría.
        </div>
        <!-- Barra visual -->
        <div style="margin-top:14px">
          <div style="font-size:11px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Vista previa dinámica de la escala</div>
          <div id="sc-scale-preview" style="position:relative;height:40px;border-radius:8px;overflow:hidden;background:var(--surf2)"></div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--ink3);margin-top:3px;font-weight:600"><span>300</span><span>850</span></div>
        </div>
      </div>

      <!-- PANEL: HARD REJECTS -->
      <div class="cf-panel" data-sctab="hard">
        <div style="background:var(--reds);border:1px solid rgba(217,59,90,.25);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:var(--ink2);line-height:1.5">
          <b style="color:var(--red)"> Rechazos automáticos.</b> Si se cumple cualquiera de estas condiciones, la solicitud se rechaza <b>sin importar el score</b>. Úsalos para filtrar riesgos inaceptables. Actualmente tienes <b>${reglasActivas} reglas activas</b>.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="fg"><label style="font-weight:700"> Ingreso mínimo mensual (USD)</label><input class="fi" id="sc_hr_ing" type="number" min="0" step="10" value="${SCORE_CFG.hardReject.ingresoMinimo}"><div style="font-size:10.5px;color:var(--ink3);margin-top:3px">Rechaza si ingreso efectivo es menor</div></div>
          <div class="fg"><label style="font-weight:700"> Ratio cuota/ingreso máximo (%)</label><input class="fi" id="sc_hr_ratio" type="number" min="10" max="80" step="1" value="${Math.round(SCORE_CFG.hardReject.ratioCuotaMax*100)}"><div style="font-size:10.5px;color:var(--ink3);margin-top:3px">Ej: 35 = cuota no puede superar el 35% del ingreso</div></div>
        </div>
        <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:12px 14px;background:var(--surf2);border-radius:10px;border:1px solid var(--rim2);transition:all .2s">
            <input type="checkbox" id="sc_hr_histmalo" ${SCORE_CFG.hardReject.historialMaloConDeuda?'checked':''} style="width:18px;height:18px;accent-color:var(--red)">
            <div style="flex:1"><div style="font-size:12.5px;font-weight:700"> Rechazar historial malo + deudas graves</div><div style="font-size:10.5px;color:var(--ink3);margin-top:2px">Combinación especialmente riesgosa · probabilidad de mora &gt;85%</div></div>
            ${SCORE_CFG.hardReject.historialMaloConDeuda?'<span style="background:var(--red);color:#fff;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800">ACTIVO</span>':''}
          </label>
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:12px 14px;background:var(--surf2);border-radius:10px;border:1px solid var(--rim2);transition:all .2s">
            <input type="checkbox" id="sc_hr_notel" ${SCORE_CFG.hardReject.sinTelefono?'checked':''} style="width:18px;height:18px;accent-color:var(--red)">
            <div style="flex:1"><div style="font-size:12.5px;font-weight:700"> Rechazar sin teléfono de contacto</div><div style="font-size:10.5px;color:var(--ink3);margin-top:2px">Imposible hacer cobranza · requisito mínimo</div></div>
            ${SCORE_CFG.hardReject.sinTelefono?'<span style="background:var(--red);color:#fff;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800">ACTIVO</span>':''}
          </label>
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:12px 14px;background:var(--surf2);border-radius:10px;border:1px solid var(--rim2);transition:all .2s">
            <input type="checkbox" id="sc_hr_noref" ${SCORE_CFG.hardReject.sinReferencias?'checked':''} style="width:18px;height:18px;accent-color:var(--red)">
            <div style="flex:1"><div style="font-size:12.5px;font-weight:700"> Rechazar sin ninguna referencia</div><div style="font-size:10.5px;color:var(--ink3);margin-top:2px">Ni personal ni fiador · sin red de apoyo</div></div>
            ${SCORE_CFG.hardReject.sinReferencias?'<span style="background:var(--red);color:#fff;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800">ACTIVO</span>':''}
          </label>
        </div>
      </div>

      <!-- PANEL: RATIO -->
      <div class="cf-panel" data-sctab="ratio">
        <div style="background:linear-gradient(135deg,rgba(5,160,96,.08),rgba(37,99,235,.05));border:1px solid rgba(5,160,96,.15);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:var(--ink2);line-height:1.5">
          <b> Ratio cuota/ingreso.</b> Qué % del ingreso mensual representa la cuota. Ratios bajos = menos riesgo de mora. La regla de oro en banca de consumo es no superar el 35%.
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
          <div class="fg"><label style="color:var(--green);font-weight:700"> Ideal ≤ (%)</label><input class="fi" id="sc_r_ideal" type="number" min="5" max="50" step="1" value="${Math.round(SCORE_CFG.ratios.ideal*100)}"><div style="font-size:10px;color:var(--ink3);margin-top:3px">Bonus al score · +30 pts</div></div>
          <div class="fg"><label style="color:var(--p1);font-weight:700"> Aceptable ≤ (%)</label><input class="fi" id="sc_r_ace" type="number" min="10" max="60" step="1" value="${Math.round(SCORE_CFG.ratios.aceptable*100)}"><div style="font-size:10px;color:var(--ink3);margin-top:3px">Sin penalización · +0 pts</div></div>
          <div class="fg"><label style="color:var(--amber);font-weight:700"> Alto ≤ (%)</label><input class="fi" id="sc_r_alto" type="number" min="15" max="70" step="1" value="${Math.round(SCORE_CFG.ratios.alto*100)}"><div style="font-size:10px;color:var(--ink3);margin-top:3px">Penalización media · -30 pts</div></div>
          <div class="fg"><label style="color:var(--red);font-weight:700"> Muy alto ≤ (%)</label><input class="fi" id="sc_r_muyalto" type="number" min="20" max="90" step="1" value="${Math.round(SCORE_CFG.ratios.muyAlto*100)}"><div style="font-size:10px;color:var(--ink3);margin-top:3px">Penalización fuerte · -70 pts</div></div>
        </div>
        <div style="margin-top:14px;padding:14px 16px;background:var(--gs);border-radius:10px;border:1px solid var(--rim2)">
          <div style="font-size:11px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px"> Ingreso base para el cálculo</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="fg"><label>Ingreso mínimo base (USD)</label><input class="fi" id="sc_ing_min" type="number" min="0" value="${SCORE_CFG.ingreso.minBase}"><div style="font-size:10px;color:var(--ink3);margin-top:3px">Ingresos debajo reciben 0 puntos</div></div>
            <div class="fg"><label>Ingreso máximo base (USD)</label><input class="fi" id="sc_ing_max" type="number" min="0" value="${SCORE_CFG.ingreso.maxBase}"><div style="font-size:10px;color:var(--ink3);margin-top:3px">Ingresos arriba reciben el 100%</div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ RANKINGS DE CLIENTES ═══ -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div class="card">
        <div class="ch">
          <div>
            <div class="ct" style="color:var(--green)"> Top 5 mejores scores</div>
            <div class="cs">Los clientes de menor riesgo · ideales para up-selling</div>
          </div>
        </div>
        ${topMejores.length ? topMejores.map(function(item,i){
          var medals = ['','','','4️⃣','5️⃣'];
          var c = item.c; var s = item.s;
          return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--rim2);cursor:pointer" onclick="verCliente(\''+c.id+'\')">'
            +'<div style="font-size:20px;width:32px;text-align:center">'+medals[i]+'</div>'
            +'<div style="flex:1;min-width:0">'
            + '<div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(c.nombre||'—')+'</div>'
            + '<div style="font-size:11px;color:var(--ink3)">'+(c.ciudad||'—')+' · '+(c.trabajo||'Sin empleo registrado')+'</div>'
            +'</div>'
            +'<div style="text-align:right;flex-shrink:0">'
            + '<div style="font-size:20px;font-weight:900;color:var(--green);line-height:1;letter-spacing:-.5px">'+s+'</div>'
            + '<div style="font-size:10px;color:var(--ink3);margin-top:2px">/ 850</div>'
            +'</div>'
            +'</div>';
        }).join('') : '<div style="text-align:center;padding:28px 0;color:var(--ink3);font-size:12px">Sin clientes calificados todavía</div>'}
      </div>
      <div class="card">
        <div class="ch">
          <div>
            <div class="ct" style="color:var(--red)">️ Top 5 menores scores</div>
            <div class="cs">Clientes de mayor riesgo · requieren seguimiento</div>
          </div>
        </div>
        ${topPeores.length ? topPeores.map(function(item,i){
          var c = item.c; var s = item.s;
          var col = s<umbReg?'var(--red)':s<umbBue?'var(--amber)':'var(--p1)';
          return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--rim2);cursor:pointer" onclick="verCliente(\''+c.id+'\')">'
            +'<div style="width:28px;height:28px;border-radius:8px;background:'+col+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;flex-shrink:0">'+(i+1)+'</div>'
            +'<div style="flex:1;min-width:0">'
            + '<div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(c.nombre||'—')+'</div>'
            + '<div style="font-size:11px;color:var(--ink3)">'+(c.ciudad||'—')+' · '+(c.trabajo||'Sin empleo registrado')+'</div>'
            +'</div>'
            +'<div style="text-align:right;flex-shrink:0">'
            + '<div style="font-size:20px;font-weight:900;color:'+col+';line-height:1;letter-spacing:-.5px">'+s+'</div>'
            + '<div style="font-size:10px;color:var(--ink3);margin-top:2px">/ 850</div>'
            +'</div>'
            +'</div>';
        }).join('') : '<div style="text-align:center;padding:28px 0;color:var(--ink3);font-size:12px">Sin clientes calificados todavía</div>'}
      </div>
    </div>

    <!-- ═══ INSIGHTS / ANALYSIS ═══ -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
      <div class="card" style="">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--p1);margin-bottom:8px"> Insight · Correlación</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:6px">Score promedio en clientes con mora: <span style="color:var(--red)">${scoreProMora||'—'}</span></div>
        <div style="font-size:11.5px;color:var(--ink3);line-height:1.5">
          ${scoreProMora && scoreProm ? (scoreProMora < scoreProm - 50 ? 'El modelo predice bien: los clientes en mora tienen score significativamente menor ('+(scoreProm-scoreProMora)+' puntos menos que el promedio).' : 'Revisa los pesos: el score no está separando bien a los buenos de los malos pagadores.') : 'Necesitas más datos históricos para validar el modelo.'}
        </div>
      </div>
      <div class="card" style="">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--amber);margin-bottom:8px"> Insight · Cobertura</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:6px">${sinScore} clientes sin score asignado</div>
        <div style="font-size:11.5px;color:var(--ink3);line-height:1.5">
          ${sinScore>0?'Haz clic en "Recalcular portfolio" para calificar a todos tus clientes con la configuración actual y obtener mejores insights.':'✓ Excelente · todos tus clientes están calificados.'}
        </div>
      </div>
      <div class="card" style="">
        <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green);margin-bottom:8px"> Insight · Portfolio</div>
        <div style="font-size:15px;font-weight:800;margin-bottom:6px">${pct(nExc+nBue)}% de los clientes son aprobables</div>
        <div style="font-size:11.5px;color:var(--ink3);line-height:1.5">
          ${pct(nExc+nBue) > 60 ? 'Tu base de clientes es sólida. Considera subir los umbrales si buscas un portfolio de menor riesgo.' : pct(nExc+nBue) < 30 ? 'Tasa baja de aprobación. Quizá deberías revisar los criterios de adquisición de nuevos clientes.' : 'Tasa de aprobación saludable y balanceada.'}
        </div>
      </div>
    </div>

  </div>`;
};

