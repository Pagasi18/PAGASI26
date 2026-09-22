// Logica de clientes: listado, detalle, filtros y alta/edicion.
// Extraido de assets/pagasi-app.js sin cambiar comportamiento financiero.

// CLIENTE DETAIL + SEARCH
// ══════════════════════════════════════════
function getCreditosCliente(c){
  if(!c) return [];
  return (S.creds||[]).filter(function(x){
    if(x.eliminado) return false;
    // Match prioritario por cliId: si el crédito tiene cliId, SOLO matchea si coincide con el id del cliente
    if(x.cliId!=null && String(x.cliId)!==''){
      return String(x.cliId)===String(c.id);
    }
    // Fallback por nombre: solo si ambos lados tienen nombre no vacío
    var xnom=(x.cli||'').trim();
    var cnom=(c.nombre||'').trim();
    if(!xnom || !cnom) return false;
    return xnom===cnom;
  });
}
function getClienteEstados(c){
  var credsCli=getCreditosCliente(c);
  var hasActivo=credsCli.some(function(x){ return x.estado==='activo' || x.estado==='mora'; });
  var hasMora=credsCli.some(function(x){ return x.estado==='mora' || ((x.estado==='activo'||x.estado==='mora') && (parseInt(x.mora||0,10)>0)); });
  var hasHistorial=credsCli.length>0;
  var estados=[];
  if(!hasActivo && !hasHistorial){ estados.push('lead'); }
  if(hasActivo){ estados.push('activo'); }
  if(hasMora){ estados.push('mora'); }
  if(!hasActivo && hasHistorial){ estados.push('completado'); }
  return {estados:estados, creds:credsCli};
}
function clienteMatchesFiltro(c, filtro){
  filtro=filtro||'todos';
  if(filtro==='todos') return true;
  var info=getClienteEstados(c).estados;
  return info.indexOf(filtro)>=0;
}
function clienteBadgesHTML(c){
  var estados=getClienteEstados(c).estados;
  if(!estados.length) estados=['lead'];
  var labels={lead:'Lead',activo:'Activo',mora:'En mora',completado:'Completado'};
  var html = estados.map(function(s){ return '<span class="bdg '+sbg(s)+'">'+labels[s]+'</span>'; }).join(' ');
  // Badge especial para leads que llegan desde la web pública
  if(c && c.origen === 'web'){
    html += ' <span class="bdg" style="background:rgba(37,99,235,.14);color:#2563EB;border:1px solid rgba(37,99,235,.30);font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:9.5px;">◆ Lead web</span>';
  }
  return html;
}
function renderClienteList(q=''){
  const estadoFiltro = S.clienteEstadoFiltro || 'todos';
  const base = _concFiltrarClientes(S.clientes||[]).filter(function(c){
    if(c.eliminado) return false;
    if(!clienteMatchesFiltro(c, estadoFiltro)) return false;
    if(!q) return true;
    return `${c.nombre} ${c.cedula} ${c.tel} ${c.ciudad} ${c.trabajo}`.toLowerCase().includes(String(q).toLowerCase());
  });

  function clientePriority(c){
    var creds=S.creds.filter(function(x){return !x.eliminado&&x.cli===c.nombre;});
    var hasMora=creds.some(function(x){return (x.mora||0)>0&&x.estado==='activo';});
    var hasActivo=creds.some(function(x){return x.estado==='activo';});
    var hasCompletado=creds.some(function(x){return x.estado==='completado';});
    if(hasMora) return 0; if(hasActivo) return 1; if(hasCompletado) return 2;
    if(creds.length===0) return 3; return 4;
  }

  var _cliSt=S.cliSort||{col:'creado',dir:'desc'};
  const filtered=(function(){
    var col=_cliSt.col,dir=_cliSt.dir==='asc'?1:-1;
    return base.slice().sort(function(a,b){
      var va,vb;
      if(col==='nombre'){va=(a.nombre||'').toLowerCase();vb=(b.nombre||'').toLowerCase();return dir*(va<vb?-1:va>vb?1:0);}
      if(col==='cedula'){va=a.cedula||'';vb=b.cedula||'';return dir*(va<vb?-1:va>vb?1:0);}
      if(col==='ciudad'){va=(a.ciudad||'').toLowerCase();vb=(b.ciudad||'').toLowerCase();return dir*(va<vb?-1:va>vb?1:0);}
      if(col==='score'){va=parseFloat(a.score_indexa&&typeof a.score_indexa==='object'?a.score_indexa.total||0:a.score_indexa||0)||0;vb=parseFloat(b.score_indexa&&typeof b.score_indexa==='object'?b.score_indexa.total||0:b.score_indexa||0)||0;return dir*(va-vb);}
      if(col==='ingreso'){return dir*(parseFloat(a.ingreso||0)-parseFloat(b.ingreso||0));}
      if(col==='creado'){va=a.creado||'';vb=b.creado||'';return dir*(va<vb?-1:va>vb?1:0);}
      va=(a.nombre||'').toLowerCase();vb=(b.nombre||'').toLowerCase();return dir*(va<vb?-1:va>vb?1:0);
    });
  })();

  if(!filtered.length) return `<div class="empty"><span class="e-ic">◆</span><div class="e-tt">Sin resultados</div></div>`;

  const PER=50; const pg=pgGet('clientes'); const start=(pg-1)*PER;
  const page=filtered.slice(start,start+PER);

  function thS(col,label){
    var on=_cliSt.col===col;
    var arrow=on?(_cliSt.dir==='asc'?'↑':'↓'):'';
    return `<th onclick="setCliSort('${col}')" style="cursor:pointer;user-select:none;white-space:nowrap">${label}${on?` <span style="color:var(--p1);font-size:10px">${arrow}</span>`:'<span style="color:var(--ink3);font-size:9px;opacity:.4"> ⇅</span>'}</th>`;
  }

  // Escapa texto que viene del cliente/lead (puede llegar del formulario público).
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function initialsRow(name){
    var p=(name||'').split(/\s+/).filter(Boolean);
    return ((p[0]||'')[0]||'?').toUpperCase()+((p[1]||'')[0]||'').toUpperCase();
  }
  var rows=page.map(c=>{
    const credsCli=getCreditosCliente(c).filter(x=>x.estado!=='cancelado');
    const activo=credsCli.find(x=>x.estado==='activo');
    const cuotasVenc=activo?getCuotasVencidas(activo):0;

    // Score
    var scRaw=c.score_indexa,scNum;
    if(scRaw&&typeof scRaw==='object') scNum=parseFloat(scRaw.total||0);
    else scNum=parseFloat(scRaw)||0;
    if(isNaN(scNum)||scNum<300||scNum>850) scNum=0;
    const scoreCol=scNum>=700?'var(--green)':scNum>=580?'var(--p1)':scNum>=450?'var(--amber)':scNum>0?'var(--red)':'var(--ink3)';
    const scoreBarW=scNum?Math.round(((scNum-300)/550)*100):0;
    const scoreLbl=scNum>=700?'Excelente':scNum>=580?'Bueno':scNum>=450?'Regular':scNum>0?'Bajo':'—';

    const moraCell=cuotasVenc>0
      ?`<span class="bdg ${cuotasVenc>60?'b-r':cuotasVenc>30?'b-a':'b-b'}">${cuotasVenc}d</span>`
      :`<span style="color:var(--ink3);font-size:11px">—</span>`;

    // Fecha de creación — corta + tooltip con fecha+hora completa
    var fechaCell='<span style="color:var(--ink3);font-size:11px">—</span>';
    if(c.creado){
      try{
        var _d = new Date(c.creado);
        if(!isNaN(_d.getTime())){
          var _meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
          var _hoy = new Date();
          var _diff = Math.floor((_hoy - _d) / 86400000);
          var _corta = _d.getDate()+' '+_meses[_d.getMonth()]+' '+String(_d.getFullYear()).slice(2);
          var _hora = _d.toLocaleTimeString('es-VE',{hour:'2-digit',minute:'2-digit',hour12:false});
          var _rel = _diff===0?'hoy':_diff===1?'ayer':_diff<7?_diff+'d':_diff<30?Math.floor(_diff/7)+'sem':_diff<365?Math.floor(_diff/30)+'m':Math.floor(_diff/365)+'a';
          var _tip = _d.toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'})+' a las '+_hora;
          fechaCell = '<div class="tdm" title="'+_tip+'" style="font-family:var(--fd);font-weight:700;font-size:12px;white-space:nowrap">'+_corta+'</div><div class="tds" style="font-size:10px;color:var(--ink3)">'+_rel+'</div>';
        }
      }catch(_e){}
    }

    // Estilo fila: azul claro para TODOS los leads (sin crédito activo ni historial)
    var estadosCli = getClienteEstados(c).estados || [];
    var esLead = estadosCli.indexOf('lead') >= 0;
    var esLeadWeb = c.origen === 'web';
    var rowStyle = 'cursor:pointer;' + (esLead
      ? 'background:linear-gradient(90deg,rgba(37,99,235,.07) 0%,rgba(37,99,235,.03) 100%);border-left:3px solid var(--p1);'
      : '');
    var leadDot = esLeadWeb
      ? ' <span title="Lead web — vino desde el formulario público" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--p1);box-shadow:0 0 0 3px rgba(37,99,235,.15);margin-left:6px;vertical-align:middle"></span>'
      : (esLead ? ' <span title="Lead — sin crédito activo aún" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(37,99,235,.5);margin-left:6px;vertical-align:middle"></span>' : '');

    return `<tr onclick="verCliente('${c.id}')" style="${rowStyle}">
      <td class="tdm" style="white-space:nowrap"><div style="display:flex;align-items:center;gap:8px">${c.foto?`<img class="cl-av" src="${esc(c.foto)}" alt="">`:`<span class="cl-av is-ini">${esc(initialsRow(c.nombre))}</span>`}<span>${esc(c.nombre)}${c.premium?` <span style="color:var(--amber)">★</span>`:''}${leadDot}</span></div></td>
      <td class="tds">${esc(c.cedula)||'—'}</td>
      <td>${fechaCell}</td>
      <td><div class="tdm">${esc(c.tel)||'—'}</div><div class="tds">${esc(c.ciudad)||'—'}</div></td>
      <td><div class="tdm">${esc(c.trabajo)||'—'}</div><div class="tds" style="color:var(--green);font-weight:700">${c.ingreso?fmt(c.ingreso)+'/mes':'—'}</div></td>
      <td style="min-width:90px">${scNum?`<div style="display:flex;align-items:baseline;gap:2px"><span style="font-weight:900;font-size:13px;color:${scoreCol}">${scNum}</span><span style="font-size:9px;color:var(--ink3)">/850</span></div><div style="background:var(--lift);border-radius:3px;height:3px;width:60px;margin-top:3px;overflow:hidden"><div style="height:100%;width:${scoreBarW}%;background:${scoreCol};border-radius:3px"></div></div><div style="font-size:9px;color:${scoreCol};font-weight:700;margin-top:2px">${scoreLbl}</div>`:'<span style="color:var(--ink3)">—</span>'}</td>
      <td><div class="tdm">${activo?activo.id:'—'}</div><div class="tds">${activo?activo.modelo||'—':'sin activo'}</div></td>
      <td>${moraCell}</td>
      <td>${clienteBadgesHTML(c)}</td>
      <td onclick="event.stopPropagation()"><div style="display:flex;gap:3px">
        <button class="btn btn-g btn-xs" onclick="editCliente('${c.id}')">Editar</button>
        <button class="btn btn-d btn-xs" onclick="delCliente('${c.id}')">✕</button>
      </div></td>
    </tr>`;
  }).join('');

  var deletedBlock=S.clientes.filter(c=>c.eliminado).length
    ?`<div style="margin-top:10px;padding:9px 12px;background:var(--surf2);border-radius:10px;border:1px solid rgba(240,75,106,0.2)">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--red);margin-bottom:6px">Eliminados (${S.clientes.filter(c=>c.eliminado).length})</div>
        ${S.clientes.filter(c=>c.eliminado).map(c=>`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--rim);font-size:11px">
          <span style="flex:1;font-weight:700;opacity:.5;text-decoration:line-through">${esc(c.nombre)}</span>
          <span style="color:var(--ink3)">${esc(c.cedula)}</span>
          <button class="btn btn-g btn-xs" onclick="restaurarCliente('${c.id}')">↩ Restaurar</button>
        </div>`).join('')}
      </div>`:'';

  return `<div class="card" style="margin-bottom:14px">
    <div class="ch">
      <div><div class="ct">Listado de clientes</div><div class="cs">${filtered.length} resultado${filtered.length!==1?'s':''} · ${estadoFiltro==='todos'?'todos los estados':'filtrado por '+estadoFiltro}</div></div>
    </div>
    <div class="tw tw-compact"><table>
      <thead><tr>
        ${thS('nombre','Cliente')}
        ${thS('cedula','Cédula')}
        ${thS('creado','Fecha alta')}
        <th>Contacto</th>
        ${thS('ingreso','Empleo / Ingresos')}
        ${thS('score','Score')}
        <th>Crédito activo</th>
        <th>Mora</th>
        <th>Estado</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    ${deletedBlock}
  </div>${pgControls('clientes',filtered.length,50,'pgNav')}`;
}


// ── Foto de perfil del cliente ─────────────────────────────────────────────
// Se guarda en Storage (clientes/{id}/perfil/) y la URL queda en el campo
// `foto` del cliente; `fotoPath` recuerda la ruta para poder borrar la
// anterior al reemplazarla y no dejar archivos huerfanos.
// Foto de perfil de un cliente. Acepta el id o el nombre, porque los creditos
// referencian al cliente de las dos formas segun cuando se cargaron.
function cliFotoUrl(ref){
  if(!ref) return '';
  var lista = (typeof S!=='undefined' && S.clientes) ? S.clientes : [];
  var c = lista.find(function(x){ return String(x.id)===String(ref); })
       || lista.find(function(x){ return (x.nombre||'')===String(ref); });
  return (c && c.foto) ? String(c.foto) : '';
}

function cliFotoPicker(id){
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = function(){ if(inp.files && inp.files[0]) _cliFotoSubir(id, inp.files[0]); };
  inp.click();
}

function _cliFotoSubir(id, file){
  var c = (S.clientes||[]).find(function(x){ return String(x.id)===String(id); });
  if(!c) return;
  if(!/^image\//.test(file.type||'')){ toast('El archivo debe ser una imagen','error'); return; }
  if(file.size > 5*1024*1024){ toast('La imagen no puede pesar mas de 5 MB','error'); return; }
  if(typeof storage==='undefined' || !storage || typeof storage.ref!=='function'){
    toast('Firebase Storage no esta disponible','error'); return;
  }
  var ext = ((file.name||'').split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
  var path = 'clientes/'+String(id)+'/perfil/foto_'+Date.now()+'.'+ext;
  var anterior = c.fotoPath || '';
  toast('Subiendo foto...','info');
  var ref = storage.ref().child(path);
  ref.put(file, { contentType: file.type||'image/jpeg' })
    .then(function(){ return ref.getDownloadURL(); })
    .then(function(url){
      c.foto = url;
      c.fotoPath = path;
      return (typeof DB!=='undefined' && DB.saveCliente) ? DB.saveCliente(c) : null;
    })
    .then(function(){
      if(anterior && anterior!==path){
        try{ storage.ref().child(anterior).delete().catch(function(){}); }catch(e){}
      }
      if(typeof logActividad==='function') logActividad('cliente_editado','clientes',String(id),'foto de perfil actualizada');
      toast('Foto actualizada','success');
      if(typeof verCliente==='function') verCliente(id);
    })
    .catch(function(err){
      console.warn('[foto cliente] no se pudo subir:', err);
      toast('No se pudo subir la foto','error');
    });
}

function cliFotoQuitar(id){
  var c = (S.clientes||[]).find(function(x){ return String(x.id)===String(id); });
  if(!c || !c.foto) return;
  if(!confirm('Quitar la foto de perfil de este cliente?')) return;
  var path = c.fotoPath || '';
  c.foto = '';
  c.fotoPath = '';
  var p = (typeof DB!=='undefined' && DB.saveCliente) ? DB.saveCliente(c) : null;
  Promise.resolve(p).then(function(){
    if(path && typeof storage!=='undefined' && storage){
      try{ storage.ref().child(path).delete().catch(function(){}); }catch(e){}
    }
    if(typeof logActividad==='function') logActividad('cliente_editado','clientes',String(id),'foto de perfil eliminada');
    toast('Foto eliminada','success');
    if(typeof verCliente==='function') verCliente(id);
  });
}

function verCliente(id){
  const c = S.clientes.find(x=>String(x.id)===String(id));if(!c)return;
  // Fusionar documentos locales con los remotos (por si hubo fallback)
  if(typeof _cliDocMergeInto === 'function') _cliDocMergeInto(c);
  const creditos = getCreditosCliente(c);
  const pagos = S.pagos.filter(function(x){
    if(x.eliminado) return false;
    // Match por cred asociado al cliente
    var credIds = creditos.map(function(cr){return cr.id;});
    if(credIds.indexOf(x.cred)>=0) return true;
    // Fallback por nombre
    return (x.cli||'')===(c.nombre||'') && c.nombre;
  });
  const creditosCompletados=creditos.filter(function(cr){return cr.estado==='completado';});
  const creditosActivos=creditos.filter(function(cr){return cr.estado==='activo'||cr.estado==='mora';});
  const totalPagadoReal=pagos.reduce(function(a,p){return a+(p.monto||0);},0);
  const tuvomora=creditos.some(function(cr){return (cr.mora||0)>0||cr.tuvoMoraHistorica===true||pagos.some(function(p){return p.cred===cr.id&&(p.mora||0)>0;});});
  const esPremium=c.premium===true;

  // Cálculos extras — USAR funciones centrales que respetan pagos eliminados
  var saldoTotal = creditos.reduce(function(a,cr){
    if(cr.estado==='completado' || cr.estado==='cancelado') return a;
    return a + getCreditoSaldoPendiente(cr);
  },0);
  var montoFinanciadoTotal = creditos.reduce(function(a,cr){
    var totalCr=cr.totalCuotas||cr.plazo*2;
    var cuotaV=parseFloat(cr.cuotaQ||cr.cuota||0);
    return a + (cuotaV*totalCr);
  },0);
  var cuotasTotales = creditos.reduce(function(a,cr){return a+(cr.totalCuotas||cr.plazo*2||0);},0);
  var cuotasPagadasTotales = creditos.reduce(function(a,cr){return a+getCreditoCuotasPagadas(cr);},0);
  var ingreso = parseFloat(c.ingreso||0);
  var ingresoFam = parseFloat(c.ingreso_familiar||0);
  var cuotaActivaTotal = creditosActivos.reduce(function(a,cr){return a+parseFloat(cr.cuotaQ||cr.cuota||0);},0);
  var ratioCuotaIng = ingreso>0 ? Math.round((cuotaActivaTotal*2/ingreso)*100) : 0; // 2 cuotas al mes

  var scoreRaw = c.score_indexa;
  var score = (scoreRaw && typeof scoreRaw === 'object') ? (scoreRaw.total||0) : (parseFloat(scoreRaw)||0);

  // ── SCORE INTERNO basado en historial real de pagos ──
  (function(){
    if(!pagos.length && !creditos.length) return; // sin datos reales, dejar score_indexa
    var hoy = new Date();

    // F-A: Puntualidad de pagos (0-100)
    // Comparamos fecha de pago vs fecha esperada de cuota
    var pagosConf = pagos.filter(function(p){ return p.estado==='confirmado' && !p.eliminado; });
    var pagosPuntuales = 0, pagosAtrasados = 0, pagosMuyAtrasados = 0;
    pagosConf.forEach(function(p){
      var cred = creditos.find(function(cr){ return cr.id === p.cred; });
      if(!cred || !cred.fecha || !p.fecha) { pagosPuntuales++; return; }
      var inicio = parseFechaLocal(cred.fecha);
      var numCuota = parseInt(p.numCuota || 1, 10);
      var fechaEsperada = new Date(inicio.getTime() + numCuota * 15 * 24*60*60*1000);
      var fechaPago = new Date(p.fecha);
      var diasDiff = Math.round((fechaPago - fechaEsperada) / (24*60*60*1000));
      if(diasDiff <= 3) pagosPuntuales++;
      else if(diasDiff <= 10) pagosAtrasados++;
      else pagosMuyAtrasados++;
    });
    var totalPagosEv = pagosPuntuales + pagosAtrasados + pagosMuyAtrasados;
    var fA = totalPagosEv > 0
      ? Math.round((pagosPuntuales*100 + pagosAtrasados*50 + pagosMuyAtrasados*0) / totalPagosEv)
      : 60; // sin pagos evaluables, neutro

    // F-B: Mora activa (0-100, penalización)
    var moraActiva = creditos.filter(function(cr){ return !cr.eliminado && cr.mora > 0 && cr.estado==='activo'; });
    var diasMoraMax = moraActiva.reduce(function(max,cr){ return Math.max(max, cr.mora||0); }, 0);
    var fB = 100;
    if(diasMoraMax > 60)      fB = 10;
    else if(diasMoraMax > 30) fB = 30;
    else if(diasMoraMax > 15) fB = 55;
    else if(diasMoraMax > 5)  fB = 75;
    else if(diasMoraMax > 0)  fB = 88;

    // F-C: Historial de créditos completados (0-100)
    var completados = creditos.filter(function(cr){ return cr.estado==='completado' && !cr.eliminado; }).length;
    var cancelados  = creditos.filter(function(cr){ return cr.estado==='cancelado'  && !cr.eliminado; }).length;
    var fC = Math.min(100, 50 + completados*25 - cancelados*20);
    fC = Math.max(0, fC);

    // F-D: Volumen y constancia (pagos en los últimos 3 meses)
    var hace3m = new Date(hoy.getFullYear(), hoy.getMonth()-3, 1);
    var pagosRecientes = pagosConf.filter(function(p){ return p.fecha && new Date(p.fecha) >= hace3m; }).length;
    var fD = Math.min(100, pagosRecientes * 15);

    // ── Combinar con score_indexa (40% historial externo, 60% interno) ──
    var scoreInterno = Math.round(fA*0.35 + fB*0.35 + fC*0.20 + fD*0.10);
    var scoreFinal;
    if(score > 0){
      // Promedio ponderado: 40% score externo, 60% score interno convertido
      var scoreInternoEscalado = Math.round(300 + (scoreInterno/100)*550);
      scoreFinal = Math.round(score*0.4 + scoreInternoEscalado*0.6);
    } else {
      scoreFinal = Math.round(300 + (scoreInterno/100)*550);
    }
    scoreFinal = Math.max(300, Math.min(850, scoreFinal));

    // Guardar sub-factores para el desglose visual
    c._scoreDetalle = {
      fA: fA, fB: fB, fC: fC, fD: fD,
      pagosPuntuales: pagosPuntuales, pagosAtrasados: pagosAtrasados, pagosMuyAtrasados: pagosMuyAtrasados,
      diasMoraMax: diasMoraMax, completados: completados, cancelados: cancelados,
      pagosRecientes: pagosRecientes, scoreInterno: scoreInterno, scorePrevio: score
    };
    score = scoreFinal;

    // Persistir en background si cambió significativamente
    if(Math.abs(scoreFinal - (c.score_indexa||0)) > 10 && c.id){
      c.score_indexa = scoreFinal;
      c.score_actualizado = new Date().toISOString();
      if(typeof DB !== 'undefined' && DB.saveCliente) DB.saveCliente(c);
    }
  })();

  var scoreColor = score>=700?'var(--green)':score>=580?'var(--p1)':score>=450?'var(--amber)':'var(--red)';
  var scoreLabel = score>=700?'EXCELENTE':score>=580?'BUENO':score>=450?'REGULAR':'BAJO';
  var scoreBar   = Math.round(((score-300)/550)*100);

  // Badges de estado

  var estadosInfo = getClienteEstados(c).estados;
  var badgesHero = '';
  if(estadosInfo.indexOf('activo')>=0) badgesHero += '<span class="cf-hero-badge is-green">● ACTIVO</span>';
  if(estadosInfo.indexOf('mora')>=0) badgesHero += '<span class="cf-hero-badge is-red"> EN MORA</span>';
  if(estadosInfo.indexOf('completado')>=0) badgesHero += '<span class="cf-hero-badge">✓ COMPLETADO</span>';
  if(estadosInfo.indexOf('lead')>=0) badgesHero += '<span class="cf-hero-badge is-amber">LEAD</span>';
  if(esPremium) badgesHero += '<span class="cf-hero-badge is-amber">★ PREMIUM</span>';
  if(c.cashea==='si') badgesHero += '<span class="cf-hero-badge">CASHEA</span>';

  // Últimos 6 meses de pagos
  var now = new Date();
  var monthsData = [];
  for(var mi=5; mi>=0; mi--){
    var md = new Date(now.getFullYear(), now.getMonth()-mi, 1);
    var label = md.toLocaleDateString('es-VE',{month:'short'}).replace('.','');
    var sumM = pagos.filter(function(p){
      if(!p.fecha) return false;
      var pd = new Date(p.fecha);
      return pd.getFullYear()===md.getFullYear() && pd.getMonth()===md.getMonth();
    }).reduce(function(a,p){return a+(p.monto||0);},0);
    monthsData.push({label:label, value:sumM});
  }

  // Timeline de eventos
  var timeline = [];
  if(c.creado){
    timeline.push({fecha:c.creado, tipo:'alta', titulo:'Cliente registrado', sub:'Alta en el sistema'});
  }
  creditos.forEach(function(cr){
    if(cr.fecha) timeline.push({fecha:cr.fecha, tipo:'credito', titulo:'Plan creado: '+cr.id, sub:cr.modelo+' · '+fmt(cr.cuotaQ||cr.cuota||0)+' quincenal'});
    if(cr.fechaCompletado) timeline.push({fecha:cr.fechaCompletado, tipo:'completado', titulo:'Plan completado: '+cr.id, sub:'Saldado exitosamente'});
  });
  pagos.slice(0,5).forEach(function(p){
    timeline.push({fecha:p.fecha, tipo:'pago', titulo:'Pago recibido: '+fmt(p.monto||0), sub:(p.metodo||'—')+' · '+(p.cred||'—')});
  });
  timeline.sort(function(a,b){
    var cmp = String(b.fecha||'').localeCompare(String(a.fecha||''));
    if(cmp!==0) return cmp;
    // Desempate: alta siempre al final (más antiguo), pagos y créditos arriba
    var order={pago:0,completado:1,credito:2,alta:3};
    return (order[a.tipo]||0)-(order[b.tipo]||0);
  });
  timeline = timeline.slice(0,8);

  setMicon(esPremium?'star':'cliente');
  $('mtt').textContent=c.nombre||'Cliente';
  $('msb').textContent=(c.cedula||'')+(c.ciudad?' · '+c.ciudad:'');
  $('modal-box').className='modal modal-lg';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  // HTML armado por este codigo: va marcado. Todo lo demas que llega a field() es un
  // dato (del cliente, de la web) y se limpia. Antes bastaba con que el dato empezara
  // por "<span" para pintarse tal cual (punto 1, 19-sep).
  function H(html){ return {__h: html}; }
  function val(v, fallback){
    if(v==null || v==='' || v==='0' || v===0) return H('<span class="cf-field-v is-empty">'+esc(fallback||'—')+'</span>');
    return H('<span class="cf-field-v">'+esc(v)+'</span>');
  }
  function valMoney(v){
    var n = parseFloat(v||0);
    if(!n) return H('<span class="cf-field-v is-empty">—</span>');
    return H('<span class="cf-field-v is-em">'+fmt(n)+'</span>');
  }
  function field(label, v, mono){
    return '<div class="cf-field"><div class="cf-field-l">'+esc(label)+'</div>'
      + (v && typeof v==='object' && v.__h!=null ? v.__h : '<div class="cf-field-v'+(mono?' is-mono':'')+'">'+(v?esc(v):'<span class="cf-field-v is-empty">—</span>')+'</div>')
      + '</div>';
  }
  function initials(name){
    var p = (name||'').split(/\s+/).filter(Boolean);
    return ((p[0]||'')[0]||'?').toUpperCase() + ((p[1]||'')[0]||'').toUpperCase();
  }

  var telWA = (c.wa||c.tel||'').replace(/[^0-9]/g,'').replace(/^0/,'');

  var html = '';

  // ── HERO ──
  html += '<div class="cf-hero">'
    + '<div class="cf-hero-row">'
    + '<div class="cf-avatar-wrap">'
    + '<div class="cf-avatar" onclick="cliFotoPicker(\''+id+'\')" title="'+(c.foto?'Cambiar foto':'Agregar foto')+'">'
    + (c.foto ? '<img src="'+esc(c.foto)+'" alt="">' : esc(initials(c.nombre)))
    + '<span class="cf-avatar-cam">📷</span>'
    + '</div>'
    + (c.foto ? '<button class="cf-avatar-del" onclick="event.stopPropagation();cliFotoQuitar(\''+id+'\')" title="Quitar foto">✕</button>' : '')
    + '</div>'
    + '<div class="cf-hero-info">'
    + '<div class="cf-hero-name">'+esc(c.nombre||'Sin nombre')+(esPremium?'<span style="color:#ffd27a">★</span>':'')+'</div>'
    + '<div class="cf-hero-sub">'+esc(c.cedula||'Sin CI')+(c.ciudad?' · '+esc(c.ciudad):'')+(c.tel?' · '+esc(c.tel):'')+'</div>'
    + (badgesHero?'<div class="cf-hero-badges">'+badgesHero+'</div>':'')
    + '</div>'
    + '<div class="cf-score" onclick="recalcularScoreClienteYRefrescar(\''+c.id+'\')" title="Click para recalcular" style="cursor:pointer;min-width:120px;text-align:center">'
    + (score>0
      ? '<div style="display:flex;align-items:baseline;justify-content:center;gap:2px"><span class="cf-score-v" style="color:'+scoreColor+'">'+score+'</span><span class="cf-score-max" style="color:'+scoreColor+'">/850</span></div>'
        + '<div style="background:var(--gs);border-radius:4px;height:6px;margin:5px 2px;overflow:hidden"><div style="height:100%;width:'+scoreBar+'%;background:'+scoreColor+';border-radius:4px"></div></div>'
        + '<div class="cf-score-l" style="color:'+scoreColor+';font-size:9px;font-weight:900;letter-spacing:.5px">'+scoreLabel+' ↻</div>'
      : '<div class="cf-score-v" style="color:var(--ink3)">—</div><div class="cf-score-l">Calcular ↻</div>'
    )
    + '</div>'
    + '</div>'
    + '<div class="cf-action-btns" style="margin-top:12px">'
    + (telWA?'<a class="cf-action is-wa" href="https://wa.me/58'+telWA+'" target="_blank" onclick="event.stopPropagation()"> WhatsApp</a>':'')
    + (c.tel?'<a class="cf-action" href="tel:'+esc(c.tel)+'" onclick="event.stopPropagation()"> Llamar</a>':'')
    + (c.email?'<a class="cf-action" href="mailto:'+esc(c.email)+'" onclick="event.stopPropagation()">️ Email</a>':'')
    + (creditosActivos.length ? '<button class="cf-action" style="background:var(--p1);color:#fff;border-color:var(--p1);font-weight:800" onclick="closeM();openPagoRapido(\''+creditosActivos[0].id+'\')"> Registrar pago</button>' : '')
    + '</div>'
    + '</div>';

  // ── KPIs ──
  html += '<div class="cf-kpis">'
    + '<div class="cf-kpi"><div class="cf-kpi-v">'+creditos.length+'</div><div class="cf-kpi-l">Planes totales</div><div class="cf-kpi-s">'+creditosActivos.length+' activos · '+creditosCompletados.length+' completados</div></div>'
    + '<div class="cf-kpi is-g"><div class="cf-kpi-v">'+fmt(totalPagadoReal)+'</div><div class="cf-kpi-l">Total pagado</div><div class="cf-kpi-s">'+pagos.length+' pago'+(pagos.length!==1?'s':'')+' registrados</div></div>'
    + '<div class="cf-kpi'+(saldoTotal>0?' is-a':' is-g')+'"><div class="cf-kpi-v">'+fmt(saldoTotal)+'</div><div class="cf-kpi-l">Saldo pendiente</div><div class="cf-kpi-s">'+cuotasPagadasTotales+' de '+cuotasTotales+' cuotas</div></div>'
    + '<div class="cf-kpi'+(tuvomora?' is-r':' is-g')+'"><div class="cf-kpi-v">'+(tuvomora?'Sí':'No')+'</div><div class="cf-kpi-l">Historial de mora</div><div class="cf-kpi-s">'+(tuvomora?'Requiere seguimiento':'Buen comportamiento')+'</div></div>'
    + '</div>';

  // ── TABS ──
  html += '<div class="cf-tabs" id="cf-tabs-'+c.id+'">'
    + '<button class="cf-tab is-active" data-tab="resumen" onclick="cfTab(\''+c.id+'\',\'resumen\')">Resumen</button>'
    + '<button class="cf-tab" data-tab="score" onclick="cfTab(\''+c.id+'\',\'score\')">Score <span class="cf-tab-count" style="background:'+scoreColor+';color:#fff">'+score+'</span></button>'
    + '<button class="cf-tab" data-tab="actividad" onclick="cfTab(\''+c.id+'\',\'actividad\')">Actividad</button>'
    + '<button class="cf-tab" data-tab="perfil" onclick="cfTab(\''+c.id+'\',\'perfil\')">Perfil</button>'
    + '<button class="cf-tab" data-tab="referencias" onclick="cfTab(\''+c.id+'\',\'referencias\')">Referencias</button>'
    + '<button class="cf-tab" data-tab="creditos" onclick="cfTab(\''+c.id+'\',\'creditos\')">Planes <span class="cf-tab-count">'+creditos.length+'</span></button>'
    + '<button class="cf-tab" data-tab="pagos" onclick="cfTab(\''+c.id+'\',\'pagos\')">Pagos <span class="cf-tab-count">'+pagos.length+'</span></button>'
    + '<button class="cf-tab" data-tab="docs" onclick="cfTab(\''+c.id+'\',\'docs\')">Documentos <span class="cf-tab-count">'+(Array.isArray(c.documentos)?c.documentos.length:0)+'</span></button>'
    + '</div>';

  // ── PANEL: RESUMEN ──
  html += '<div class="cf-panel is-active" data-tab="resumen">';
  html += '<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:12px;margin-bottom:12px">';
  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Pagos últimos 6 meses</div></div>'
    + '<div class="cf-chart-wrap"><canvas id="cf-chart-pagos-'+c.id+'"></canvas></div></div>';
  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Avance de cuotas</div></div>'
    + '<div class="cf-chart-wrap is-sm"><canvas id="cf-chart-cuotas-'+c.id+'"></canvas></div>'
    + (cuotasTotales>0?'<div style="text-align:center;font-size:11px;color:var(--ink3);margin-top:6px"><b style="color:var(--p1);font-size:13px">'+Math.round(cuotasPagadasTotales/cuotasTotales*100)+'%</b> completado</div>':'<div style="text-align:center;font-size:11px;color:var(--ink3)">Sin planes</div>')
    + '</div>';
  html += '</div>';

  // Timeline
  if(timeline.length){
    html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Línea de tiempo</div></div>'
      + '<div class="cf-timeline">';
    timeline.forEach(function(t){
      var cls = t.tipo==='pago'?'is-g':t.tipo==='completado'?'is-g':t.tipo==='alta'?'':t.tipo==='mora'?'is-r':'';
      var fecha = '—';
      try{ fecha = new Date(t.fecha).toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'numeric'}); }catch(e){}
      html += '<div class="cf-tl-item">'
        + '<div class="cf-tl-dot '+cls+'"></div>'
        + '<div class="cf-tl-d">'+esc(fecha)+'</div>'
        + '<div class="cf-tl-t">'+esc(t.titulo)+'</div>'
        + '<div class="cf-tl-s">'+esc(t.sub||'')+'</div>'
        + '</div>';
    });
    html += '</div></div>';
  }
  html += '</div>';

  // ── PANEL: SCORE INTERNO ──
  html += '<div class="cf-panel" data-tab="score">';
  var sd = c._scoreDetalle || {};
  var fmtBar = function(val, color){
    return '<div style="display:flex;align-items:center;gap:8px">'
      + '<div style="flex:1;background:var(--gs);border-radius:4px;height:8px;overflow:hidden">'
      + '<div style="height:100%;width:'+Math.round(val)+'%;background:'+color+';border-radius:4px;transition:width .6s"></div></div>'
      + '<span style="font-size:11px;font-weight:800;color:'+color+';min-width:32px;text-align:right">'+Math.round(val)+'</span></div>';
  };
  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t">Desglose del Score · '+score+'/850</div>'
    + '<button class="btn btn-g btn-xs" onclick="recalcularScoreClienteYRefrescar(\''+c.id+'\')">↻ Recalcular</button></div>';
  // Big score display
  html += '<div style="text-align:center;padding:20px 0 16px">'
    + '<div style="font-family:var(--fd);font-size:64px;font-weight:900;line-height:1;color:'+scoreColor+'">'+score+'</div>'
    + '<div style="background:var(--gs);border-radius:6px;height:10px;margin:10px auto;max-width:280px;overflow:hidden">'
    + '<div style="height:100%;width:'+scoreBar+'%;background:'+scoreColor+';border-radius:6px"></div></div>'
    + '<div style="font-size:11px;font-weight:900;color:'+scoreColor+';letter-spacing:1px">'+scoreLabel+'</div>'
    + '<div style="font-size:10px;color:var(--ink3);margin-top:4px">Rango: 300 (mínimo) → 850 (perfecto)</div>'
    + '</div>';
  // Factor breakdown
  html += '<div style="display:grid;gap:10px;margin-top:4px">';
  var factors = [
    {label:'Puntualidad de pagos', val: sd.fA!=null?sd.fA:60, color:'var(--green)',
     sub: sd.pagosPuntuales!=null ? sd.pagosPuntuales+' puntuales · '+sd.pagosAtrasados+' con retraso · '+sd.pagosMuyAtrasados+' tardíos' : 'Sin datos de pagos'},
    {label:'Comportamiento de mora', val: sd.fB!=null?sd.fB:80, color:'var(--p1)',
     sub: sd.diasMoraMax!=null ? (sd.diasMoraMax===0?'Sin mora activa':sd.diasMoraMax+' días mora máxima') : 'Sin datos'},
    {label:'Historial de créditos', val: sd.fC!=null?sd.fC:50, color:'var(--amber)',
     sub: sd.completados!=null ? sd.completados+' planes completados · '+sd.cancelados+' cancelados' : 'Sin datos'},
    {label:'Actividad reciente', val: sd.fD!=null?sd.fD:40, color:'var(--p2)',
     sub: sd.pagosRecientes!=null ? sd.pagosRecientes+' pagos en los últimos 3 meses' : 'Sin datos'},
  ];
  factors.forEach(function(f){
    html += '<div style="background:var(--surf2);border-radius:10px;padding:12px 14px">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:6px">'
      + '<span style="font-size:12px;font-weight:700">'+f.label+'</span>'
      + '</div>'
      + fmtBar(f.val, f.color)
      + '<div style="font-size:10px;color:var(--ink3);margin-top:5px">'+f.sub+'</div>'
      + '</div>';
  });
  html += '</div>';
  // Decision box
  var decisionBg = score>=700?'rgba(93,216,160,.1)':score>=580?'rgba(37,99,235,.1)':score>=450?'rgba(232,152,10,.1)':'rgba(217,59,90,.1)';
  var decisionText = score>=700?'APROBACIÓN AUTOMÁTICA':score>=580?'APROBAR':score>=450?'REVISAR MANUALMENTE':'RECHAZAR';
  html += '<div style="background:'+decisionBg+';border:1px solid '+scoreColor+';border-radius:10px;padding:14px;margin-top:12px;text-align:center">'
    + '<div style="font-size:10px;color:var(--ink3);font-weight:700;margin-bottom:4px">DECISIÓN RECOMENDADA</div>'
    + '<div style="font-size:15px;font-weight:900;color:'+scoreColor+'">'+decisionText+'</div>'
    + (sd.scorePrevio&&sd.scorePrevio>0?'<div style="font-size:10px;color:var(--ink3);margin-top:4px">Score externo (Indexa/manual): '+sd.scorePrevio+' · Score interno: '+Math.round(300+(sd.scoreInterno/100)*550)+'</div>':'')
    + '</div>';
  html += '</div></div>';

  // ── PANEL: ACTIVIDAD ──
  html += '<div class="cf-panel" data-tab="actividad">';
  // Build full activity timeline
  var actTimeline = [];
  if(c.creado) actTimeline.push({fecha:c.creado, tipo:'alta', ico:'👤', titulo:'Cliente registrado', sub:'Alta en el sistema', color:'var(--p1)'});
  creditos.forEach(function(cr){
    if(cr.fecha) actTimeline.push({fecha:cr.fecha, tipo:'credito', ico:'📋', titulo:'Crédito aprobado: '+cr.id, sub:(cr.modelo||'—')+' · Total: '+fmt(cr.total||0)+' · '+( cr.plazo||'?')+'M', color:'var(--p1)'});
    if(cr.fechaCompletado) actTimeline.push({fecha:cr.fechaCompletado, tipo:'completado', ico:'✅', titulo:'Plan completado: '+cr.id, sub:'Saldado exitosamente · '+cr.modelo, color:'var(--green)'});
    if(cr.mora>0) actTimeline.push({fecha:hoyLocalISO(), tipo:'mora', ico:'⚠️', titulo:'En mora: '+cr.id, sub:cr.mora+' días · Saldo: '+fmt(cr.saldo||0), color:'var(--red)'});
  });
  pagos.forEach(function(p){
    if(!p.eliminado) actTimeline.push({
      fecha:p.fecha, tipo:'pago', ico:'💰',
      titulo:'Pago recibido: '+fmt(p.monto||0),
      sub:(p.metodo||'—')+' · Crédito: '+(p.cred||'—')+(p.cobrador?' · '+p.cobrador:''),
      color:'var(--green)'
    });
  });
  (Array.isArray(c.notas)?c.notas:[]).forEach(function(n){
    actTimeline.push({fecha:n.fecha||n.creado, tipo:'nota', ico:'📝', titulo:'Nota: '+esc(n.texto||n.titulo||'').slice(0,60), sub:'por '+(n.autor||'Sistema'), color:'var(--ink3)'});
  });
  actTimeline.sort(function(a,b){ return String(b.fecha||'').localeCompare(String(a.fecha||'')); });

  html += '<div class="cf-section">';
  html += '<div class="cf-section-h"><div class="cf-section-t">Historial completo · '+actTimeline.length+' eventos</div></div>';
  if(!actTimeline.length){
    html += '<div style="text-align:center;padding:30px;color:var(--ink3);font-size:13px">Sin actividad registrada</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:0">';
    actTimeline.forEach(function(t, i){
      var fecha = '—';
      try { fecha = fmtFechaHora(t.fecha); } catch(e){}
      html += '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:'+(i<actTimeline.length-1?'1px solid var(--rim2)':'none')+'">'
        + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">'
        + '<div style="width:32px;height:32px;border-radius:50%;background:var(--surf2);border:2px solid '+t.color+';display:flex;align-items:center;justify-content:center;font-size:14px">'+t.ico+'</div>'
        + (i<actTimeline.length-1?'<div style="width:2px;flex:1;background:var(--rim2);margin-top:4px;min-height:16px"></div>':'')
        + '</div>'
        + '<div style="flex:1;padding-top:4px">'
        + '<div style="font-weight:700;font-size:12px;color:var(--ink)">'+esc(t.titulo)+'</div>'
        + '<div style="font-size:11px;color:var(--ink3);margin-top:2px">'+esc(t.sub||'')+'</div>'
        + '<div style="font-size:10px;color:var(--ink3);margin-top:3px;opacity:.7">'+fecha+'</div>'
        + '</div></div>';
    });
    html += '</div>';
  }
  html += '</div></div>';

  // ── PANEL: PERFIL (Personal + Laboral + Financiero) ──
  html += '<div class="cf-panel" data-tab="perfil">';
  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t">Datos personales</div></div>'
    + '<div class="cf-grid-3">'
    + field('Nombre completo', c.nombre)
    + field('Cédula', c.cedula||c.ci, true)
    + field('Teléfono', c.tel, true)
    + field('WhatsApp', c.wa||c.tel, true)
    + field('Email', c.email)
    + field('Cliente desde', c.creado?new Date(c.creado).toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'numeric'}):'—')
    + '</div></div>';

  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Residencia</div></div>'
    + '<div class="cf-grid-2">'
    + field('Ciudad', c.ciudad)
    + field('Estado', c.estado_ubi)
    + '</div>'
    + '<div class="cf-field" style="margin-top:10px"><div class="cf-field-l">Dirección completa</div><div class="cf-field-v'+(!c.dir?' is-empty':'')+'" style="line-height:1.5">'+esc(c.dir||'No registrada')+'</div></div>'
    + '<div class="cf-grid-2" style="margin-top:10px">'
    + field('Tipo de vivienda', c.vivienda)
    + field('Tiempo en la dirección', c.tiempo_dir)
    + '</div>'
    // Terremoto — dato de riesgo: destacado si reportó daños
    + (c.terremoto_afectado==='si'
      ? '<div style="margin-top:10px;background:'+(c.terremoto_danos==='graves'?'var(--reds)':'var(--ambers)')+';border:1px solid '+(c.terremoto_danos==='graves'?'rgba(217,59,90,.35)':'rgba(244,180,44,.4)')+';border-radius:10px;padding:9px 12px;font-size:12px"><b style="color:'+(c.terremoto_danos==='graves'?'var(--red)':'var(--amber)')+'">⚠ Afectado por el terremoto</b> · Daños '+esc(c.terremoto_danos||'leves')+'</div>'
      : (c.terremoto_afectado==='no' ? '<div class="cf-grid-2" style="margin-top:10px">'+field('¿Afectado por el terremoto?','No')+'</div>' : ''))
    + '</div>';

  if(c.emergencia || c.notas || c.impresion || c.conocio){
    html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t">ℹ️ Información adicional</div></div>'
      + '<div class="cf-grid-2">'
      + (c.conocio?field('¿Cómo nos conoció?', c.conocio):'')
      + (c.impresion?field('Impresión del asesor', c.impresion):'')
      + '</div>'
      + (c.emergencia?'<div class="cf-field" style="margin-top:10px"><div class="cf-field-l">Contacto de emergencia</div><div class="cf-field-v">'+esc(c.emergencia)+'</div></div>':'')
      + (c.notas?'<div class="cf-field" style="margin-top:10px"><div class="cf-field-l">Notas internas</div><div class="cf-field-v" style="line-height:1.5">'+esc(c.notas)+'</div></div>':'')
      + '</div>';
  }
  html += '<div style="height:1px;background:var(--rim);margin:18px 0"></div>';
  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Empleo</div></div>'
    + '<div class="cf-grid-3">'
    + field('Tipo de empleo', c.trabajo)
    + field('Empresa', c.empresa)
    + field('Cargo', c.cargo)
    + field('Antigüedad', c.antiguedad)
    + '</div></div>';

  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Ingresos</div></div>'
    + '<div class="cf-grid-3">'
    + field('Ingreso mensual', valMoney(ingreso))
    + field('Ingreso familiar', valMoney(ingresoFam))
    + field('Recibe remesas', c.remesas==='si'?H('<span class="cf-field-v" style="color:var(--green)">✓ Sí</span>'):H('<span class="cf-field-v is-empty">No</span>'))
    + field('Dependientes', c.dependientes)
    + field('Deudas previas', c.deudas)
    + field('Historial crediticio', c.historial)
    + '</div>';
  if(ingreso>0 && cuotaActivaTotal>0){
    var cuotaMensual = cuotaActivaTotal*2;
    var indicColor = ratioCuotaIng<=30?'var(--green)':ratioCuotaIng<=50?'var(--amber)':'var(--red)';
    html += '<div style="margin-top:12px;padding:10px 12px;background:var(--surf2);border-radius:9px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px">'
      + '<div style="font-size:11px;color:var(--ink2);font-weight:700">Capacidad de pago (cuota mensual vs. ingreso)</div>'
      + '<div style="font-size:18px;font-weight:900;color:'+indicColor+'">'+ratioCuotaIng+'%</div>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--ink3)">Cuota mensual: '+fmt(cuotaMensual)+' sobre ingreso '+fmt(ingreso)+' · '+(ratioCuotaIng<=30?'Saludable':ratioCuotaIng<=50?'Aceptable':'Alto compromiso')+'</div>'
      + '</div>';
  }
  html += '</div>';
  html += '<div style="height:1px;background:var(--rim);margin:18px 0"></div>';
  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Información bancaria</div></div>'
    + '<div class="cf-grid-3">'
    + field('Banco principal', c.banco_nombre)
    + field('Banco para cobros', c.banco_cobro)
    + field('Estado de cuenta', c.banco_estado)
    + field('Cuenta (últimos 4)', c.cuenta_digitos, true)
    + field('Ahorros declarados', c.ahorro?valMoney(c.ahorro):null)
    + '</div></div>';

  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Perfil Cashea</div></div>';
  if(c.cashea==='si' || c.cashea_nivel || c.cashea_deuda==='si' || c.cashea_ultimo_art){
    // Estado bonito con color
    var casheaEstadoLbl = {al_dia:'Al día',mora_leve:'Mora leve (<30d)',mora_grave:'Mora grave (>30d)',completado:'Canceló todo'}[c.cashea_estado] || '—';
    var casheaEstadoCol = {al_dia:'var(--green)',mora_leve:'var(--amber)',mora_grave:'var(--red)',completado:'var(--p1)'}[c.cashea_estado] || 'var(--ink3)';
    html += '<div class="cf-grid-3">'
      + field('Cliente Cashea', H('<span class="cf-field-v" style="color:var(--green)">✓ Sí</span>'))
      + field('Nivel', c.cashea_nivel ? 'Nivel '+c.cashea_nivel : null)
      + field('Estado actual', c.cashea_estado ? H('<span class="cf-field-v" style="color:'+casheaEstadoCol+';font-weight:800">'+esc(casheaEstadoLbl)+'</span>') : null)
      + '</div>';
    // Deuda activa
    if(c.cashea_deuda==='si' || c.cashea_monto>0){
      html += '<div style="margin-top:12px;padding:10px 12px;background:var(--ambers);border-radius:9px">'
        + '<div style="font-size:11px;font-weight:800;color:var(--amber);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px"> Deuda activa con Cashea</div>'
        + '<div class="cf-grid-3">'
        + field('Monto deuda', c.cashea_monto>0 ? valMoney(c.cashea_monto) : null)
        + field('Cuotas pendientes', c.cashea_cuotas_pend||null)
        + field('Último pago', c.cashea_pago ? new Date(c.cashea_pago).toLocaleDateString('es-VE') : null)
        + '</div></div>';
    }
    // Historial de compras
    if(c.cashea_ultimo_art || c.cashea_total_compras){
      var totalComprasLbl = {'1':'1 producto','2-3':'2 a 3 productos','4-5':'4 a 5 productos','6+':'6 o más productos'}[c.cashea_total_compras] || c.cashea_total_compras || '—';
      html += '<div style="margin-top:10px;padding:10px 12px;background:var(--surf2);border-radius:9px">'
        + '<div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px"> Historial de compras Cashea</div>'
        + '<div class="cf-grid-3">'
        + field('Último artículo', c.cashea_ultimo_art)
        + field('Monto', c.cashea_ultimo_monto>0 ? valMoney(c.cashea_ultimo_monto) : null)
        + field('Fecha compra', c.cashea_ultima_fecha ? new Date(c.cashea_ultima_fecha).toLocaleDateString('es-VE') : null)
        + '</div>'
        + '<div style="margin-top:8px">'+field('Total compras históricas', totalComprasLbl)+'</div>'
        + (c.cashea_obs ? '<div style="margin-top:8px"><div class="cf-field-l">Observaciones</div><div class="cf-field-v" style="line-height:1.4;font-style:italic">"'+esc(c.cashea_obs)+'"</div></div>' : '')
        + '</div>';
    }
  } else {
    html += '<div style="color:var(--ink3);font-size:12.5px;padding:6px 0;font-style:italic">No es cliente Cashea</div>';
  }
  html += '</div>';

  if(c.fiador==='si' || c.fiador_nom){
    html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Fiador</div></div>'
      + '<div class="cf-grid-3">'
      + field('Nombre', c.fiador_nom)
      + field('Cédula', c.fiador_ci, true)
      + field('Teléfono', c.fiador_tel, true)
      + field('Relación', c.fiador_rel)
      + '</div></div>';
  }
  html += '</div>';

  // ── PANEL: REFERENCIAS ──
  html += '<div class="cf-panel" data-tab="referencias">';
  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t"> Referencias personales</div></div>';
  var refs = [c.ref1, c.ref2].filter(function(r){return r && (r.nom||r.tel);});
  if(refs.length){
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    refs.forEach(function(r){
      html += '<div class="cf-ref-card">'
        + '<div class="cf-ref-av">'+esc(initials(r.nom))+'</div>'
        + '<div class="cf-ref-body">'
        + '<div class="cf-ref-n">'+esc(r.nom||'Sin nombre')+'</div>'
        + '<div class="cf-ref-r">'+esc(r.rel||'—')+'</div>'
        + (r.tel?'<div class="cf-ref-m" style="font-family:var(--fd)"> '+esc(r.tel)+'</div>':'')
        + (r.obs?'<div class="cf-ref-m" style="margin-top:4px;font-style:italic">"'+esc(r.obs)+'"</div>':'')
        + '</div></div>';
    });
    html += '</div>';
  } else {
    html += '<div style="color:var(--ink3);font-size:12px;padding:10px 0;font-style:italic">Sin referencias registradas</div>';
  }
  html += '</div>';
  html += '</div>';

  // ── PANEL: CRÉDITOS ──
  html += '<div class="cf-panel" data-tab="creditos">';
  if(creditos.length){
    html += '<div class="cf-section">'
      + '<div class="cf-section-h"><div class="cf-section-t">Historial completo · '+creditos.length+' plan'+(creditos.length!==1?'es':'')+'</div></div>'
      + '<div class="lst" style="max-height:none">';
    creditos.forEach(function(cr){
      var totalCr=cr.totalCuotas||cr.plazo*2;
      var cuotaV=parseFloat(cr.cuotaQ||cr.cuota||0);
      var abonado=Array.isArray(cr.pagosRegistrados)?cr.pagosRegistrados.reduce(function(a,h){return a+(h.montoPagado||0);},0):(cr.pagado||0)*cuotaV;
      var saldo=Math.max(0,parseFloat((cuotaV*totalCr-abonado).toFixed(2)));
      var pct=cuotaV*totalCr>0?Math.round(abonado/(cuotaV*totalCr)*100):0;
      var tuvoMoraCr=(cr.tuvoMoraHistorica===true)||pagos.some(function(p){return p.cred===cr.id&&(p.mora||0)>0;});
      html += '<div class="li" style="flex-direction:column;align-items:flex-start;gap:6px;cursor:pointer" onclick="openAmort(\''+cr.id+'\')">'
        + '<div style="display:flex;width:100%;align-items:center;gap:8px">'
        + '<div class="li-ic" style="background:var(--gs)">'+(cr.estado==='completado'?'✓':'≡')+'</div>'
        + '<div style="flex:1"><div style="font-weight:700;color:var(--ink);font-size:12.5px">'+esc(cr.id)+' · '+esc(cr.modelo||'—')+'</div>'
        + '<div style="font-size:10.5px;color:var(--ink3)">Inicio: '+esc(cr.fecha||'—')+(cr.fechaCompletado?' · Completado: '+esc(cr.fechaCompletado):'')+'</div></div>'
        + '<div style="text-align:right"><span class="bdg '+sbg(cr.estado)+'">'+esc(cr.estado)+'</span>'
        + (tuvoMoraCr?'<span class="bdg b-r" style="margin-left:3px;font-size:9px">mora</span>':'')+'</div>'
        + '</div>'
        + '<div style="width:100%;padding-left:44px">'
        + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">'
        + '<span style="color:var(--ink3)">'+(cr.pagado||0)+'/'+totalCr+' cuotas · Abonado: <strong style="color:var(--green)">'+fmt(abonado)+'</strong></span>'
        + '<span style="color:'+(saldo>0?'var(--p1)':'var(--green)')+';font-weight:800">'+(saldo>0?'Saldo: '+fmt(saldo):'✓ Saldado')+'</span>'
        + '</div>'
        + '<div class="prog"><div class="pf '+((cr.mora||0)>0?'p-r':'p-p')+'" style="width:'+pct+'%"></div></div>'
        + '</div></div>';
    });
    html += '</div></div>';
  } else {
    html += '<div class="cf-section" style="text-align:center;padding:30px 20px"><div style="font-size:13px;font-weight:700;color:var(--ink2)">Sin planes registrados</div><div style="font-size:11.5px;color:var(--ink3);margin-top:4px">Este cliente aún no tiene un plan de cuotas activo</div></div>';
  }
  html += '</div>';

  // ── PANEL: PAGOS ──
  html += '<div class="cf-panel" data-tab="pagos">';
  if(pagos.length){
    html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t">Últimos '+Math.min(pagos.length,30)+' pagos</div><div style="font-size:12px;font-weight:800;color:var(--green)">Total: '+fmt(totalPagadoReal)+'</div></div>'
      + '<div class="lst">';
    pagos.slice(0,30).forEach(function(p){
      html += '<div class="li">'
        + '<div class="li-ic" style="background:var(--greens);font-size:9px;font-weight:900;color:var(--green)">PAG</div>'
        + '<div style="flex:1"><div style="font-weight:700;color:var(--ink);font-size:12px">'+esc(p.fecha||'—')+' · '+esc(p.metodo||'—')+'</div>'
        + '<div class="tds">'+esc(p.cred||'—')+(p.banco?' · '+esc(p.banco):'')+'</div></div>'
        + '<div style="text-align:right"><div style="font-weight:800;color:var(--green);font-family:var(--fd)">'+fmt(p.monto||0)+'</div>'
        + (p.estado?'<span class="bdg '+sbg(p.estado)+'" style="font-size:9px">'+esc(p.estado)+'</span>':'')+'</div>'
        + '</div>';
    });
    html += '</div></div>';
  } else {
    html += '<div class="cf-section" style="text-align:center;padding:30px 20px"><div style="font-size:13px;font-weight:700;color:var(--ink2)">Sin pagos registrados</div></div>';
  }
  html += '</div>';

  // ── PANEL: DOCUMENTOS ──
  html += '<div class="cf-panel" data-tab="docs">';
  html += '<div class="cf-section"><div class="cf-section-h"><div class="cf-section-t">Expediente del cliente</div></div>'
    + _renderCliDocManager(c) + '</div>';
  html += '</div>';

  $('mbd').innerHTML = html;

  var _credActivoId = creditos.length>0 ? creditos.find(function(cr){return cr.estado==='activo';})||creditos[0] : null;
  $('mft').innerHTML=`<button class="btn btn-g" onclick="closeM()">Cerrar</button>${_credActivoId?`<button class="btn btn-g" onclick="closeM();openAmort('${_credActivoId.id}')">Ver crédito</button>`:''}<button class="btn btn-g" onclick="portalAcceso('${id}')" title="Generar el enlace de Mi Cuenta para este cliente">Portal</button><button class="btn btn-p" onclick="closeM();editCliente('${id}')">Editar</button>${creditosCompletados.length?`<button class="btn btn-s btn-sm" onclick="abrirFiniquito('${creditosCompletados[creditosCompletados.length-1].id}')">Ver Finiquito</button>`:''}`;
  $('ov').style.display='flex';

  // Render charts después de que el DOM esté visible
  setTimeout(function(){ cfRenderCharts(c.id, monthsData, cuotasPagadasTotales, cuotasTotales); }, 60);
}

function cfTab(clienteId, tab){
  var modal = $('mbd');
  if(!modal) return;
  var tabs = modal.querySelectorAll('.cf-tab');
  tabs.forEach(function(t){
    var active = t.getAttribute('data-tab')===tab;
    t.classList.toggle('is-active', active);
    if(active && t.scrollIntoView){
      try{ t.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'}); }catch(e){}
    }
  });
  var panels = modal.querySelectorAll('.cf-panel');
  panels.forEach(function(p){ p.classList.toggle('is-active', p.getAttribute('data-tab')===tab); });
}

var _cfCharts = {};
function cfRenderCharts(cliId, monthsData, pagadas, totales){
  // Destruir charts previos si existen
  Object.keys(_cfCharts).forEach(function(k){
    try{ _cfCharts[k].destroy(); }catch(e){}
    delete _cfCharts[k];
  });

  var isDark = document.documentElement.getAttribute('data-theme')==='dark';
  var p1 = isDark?'#7c6ff0':'#2563EB';
  var p1t = isDark?'rgba(124,111,240,.18)':'rgba(37,99,235,.12)';
  var ink3 = isDark?'#6B6896':'#9794BB';

  // Chart 1: pagos mensuales
  var canvas1 = document.getElementById('cf-chart-pagos-'+cliId);
  if(canvas1 && window.Chart){
    _cfCharts.pagos = new Chart(canvas1, {
      type:'bar',
      data:{
        labels: monthsData.map(function(m){return m.label;}),
        datasets:[{
          data: monthsData.map(function(m){return m.value;}),
          backgroundColor: monthsData.map(function(m,i){return i===monthsData.length-1?p1:p1t;}),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:isDark?'#252844':'#fff',
            borderColor:'rgba(37,99,235,.3)', borderWidth:1,
            titleColor:isDark?'#E8E6FF':'#0B0B1E',
            bodyColor:isDark?'#B0ADDB':'#4A4870',
            padding:10,
            callbacks:{ label:function(ctx){ return ' $'+ctx.raw.toLocaleString(); } }
          }
        },
        scales:{
          x:{ grid:{display:false}, border:{display:false}, ticks:{color:ink3,font:{size:10,weight:'600'}} },
          y:{ grid:{color:'rgba(150,150,180,.08)'}, border:{display:false}, ticks:{color:ink3,font:{size:10},callback:function(v){return '$'+(v>=1000?(v/1000)+'k':v);}} }
        }
      }
    });
  }

  // Chart 2: donut avance de cuotas
  var canvas2 = document.getElementById('cf-chart-cuotas-'+cliId);
  if(canvas2 && window.Chart){
    var restantes = Math.max(0, totales-pagadas);
    _cfCharts.cuotas = new Chart(canvas2, {
      type:'doughnut',
      data:{
        labels:['Pagadas','Pendientes'],
        datasets:[{
          data:[pagadas, restantes],
          backgroundColor:[p1, isDark?'rgba(124,111,240,.15)':'rgba(37,99,235,.12)'],
          borderWidth:0,
          spacing:2
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        cutout:'72%',
        plugins:{
          legend:{
            position:'bottom',
            labels:{color:ink3,font:{size:10,weight:'600'},boxWidth:10,padding:8}
          },
          tooltip:{
            backgroundColor:isDark?'#252844':'#fff',
            borderColor:'rgba(37,99,235,.3)', borderWidth:1,
            titleColor:isDark?'#E8E6FF':'#0B0B1E',
            bodyColor:isDark?'#B0ADDB':'#4A4870',
            padding:10,
            callbacks:{ label:function(ctx){ return ' '+ctx.label+': '+ctx.raw+' cuota'+(ctx.raw!==1?'s':''); } }
          }
        }
      }
    });
  }
}


// ══════════════════════════════════════════
// INGRESOS REALES POR MES
// ══════════════════════════════════════════
function getMoraMensual(){
  var now=new Date(), months=[];
  for(var i=5;i>=0;i--){
    var d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push({y:d.getFullYear(),m:d.getMonth(),label:d.toLocaleDateString('es-VE',{month:'short'})});
  }
  var creds=_concFiltrar(S.creds||[]).filter(function(c){return !c.eliminado;});
  return months.map(function(mo){
    // Pagos confirmados en mora ese mes (fecha de pago > fecha de vencimiento estimada)
    var enMora=creds.filter(function(c){
      if(!c.fecha||c.estado==='cancelado') return false;
      var pagos=(S.pagos||[]).filter(function(p){
        return !p.eliminado && p.cred===c.id && p.estado==='confirmado' && p.fecha;
      });
      var pagosMes=pagos.filter(function(p){
        var pd=new Date(p.fecha);
        return pd.getFullYear()===mo.y && pd.getMonth()===mo.m;
      });
      return pagosMes.length>0 && c.mora>0;
    }).length;
    var totalActivos=creds.filter(function(c){ return c.estado==='activo'; }).length;
    return {label:mo.label, mora:enMora, total:Math.max(1,totalActivos)};
  });
}

// ══════════════════════════════════════════
// DASHBOARD ESPECIALIZADO PARA EMPLEADO
// ══════════════════════════════════════════
function empleadoDashHTML(){
  const me = (S.currentUser && S.currentUser.nombre) || 'Empleado';
  const rol = (S.currentUser && S.currentUser.rol) || 'Empleado';
  const hoy = new Date();
  const hoyStr = fechaLocalISO(hoy);
  const hoyTxt = hoy.toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long'});
  const horaActual = hoy.getHours();
  const saludo = horaActual < 12 ? 'Buenos días' : horaActual < 19 ? 'Buenas tardes' : 'Buenas noches';

  // Semana actual
  const d = new Date(hoy); d.setHours(0,0,0,0);
  const dow = d.getDay();
  const lunesOffset = dow===0?-6:1-dow;
  const lunes = new Date(d); lunes.setDate(d.getDate()+lunesOffset);
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate()+6);
  const lunesStr = fechaLocalISO(lunes);
  const domingoStr = fechaLocalISO(domingo);

  // Mes actual
  const primerDiaMes = fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const ultimoDiaMes = fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth()+1, 0));

  const activos = S.creds.filter(c=>!c.eliminado && c.estado==='activo');

  // ─── EN MORA ordenado por urgencia ───
  const enMora = activos.filter(c=>c.mora>0).sort((a,b)=>b.mora-a.mora);
  const mora1a7 = enMora.filter(c=>c.mora<=7).length;
  const mora8a30 = enMora.filter(c=>c.mora>7 && c.mora<=30).length;
  const mora31mas = enMora.filter(c=>c.mora>30).length;

  // ─── PAGOS por mí ───
  const misPagosConf = S.pagos.filter(p=>!p.eliminado && p.cobrador===me && p.estado==='confirmado');
  const misPagosHoy = misPagosConf.filter(p=>p.fecha===hoyStr);
  const misPagosSemana = misPagosConf.filter(p=>p.fecha>=lunesStr && p.fecha<=domingoStr);
  const misPagosMes = misPagosConf.filter(p=>p.fecha>=primerDiaMes && p.fecha<=ultimoDiaMes);

  const cobradoHoy = misPagosHoy.reduce((a,p)=>a+(p.monto||0),0);
  const cobradoSemana = misPagosSemana.reduce((a,p)=>a+(p.monto||0),0);
  const cobradoMes = misPagosMes.reduce((a,p)=>a+(p.monto||0),0);

  // ─── METAS (calculadas: meta = 80% de lo cobrable) ───
  const esperadoSemana = activos.reduce((a,c)=>{
    // cuotas que deberían vencerse esta semana
    return a + parseFloat(c.cuotaQ||c.cuota||0) * 0.5;
  }, 0);
  const metaSemana = Math.round(esperadoSemana * 0.8);
  const avanceMeta = metaSemana > 0 ? Math.min(100, Math.round((cobradoSemana/metaSemana)*100)) : 0;

  // ─── RANKING del equipo (solo cobros confirmados del mes) ───
  const cobrosPorCobrador = {};
  S.pagos.filter(p=>!p.eliminado && p.estado==='confirmado' && p.fecha>=primerDiaMes).forEach(p=>{
    const nom = p.cobrador||'Sin asignar';
    if(!cobrosPorCobrador[nom]) cobrosPorCobrador[nom] = {monto:0, count:0};
    cobrosPorCobrador[nom].monto += (p.monto||0);
    cobrosPorCobrador[nom].count += 1;
  });
  const ranking = Object.keys(cobrosPorCobrador).map(nom=>({
    nombre: nom,
    monto: cobrosPorCobrador[nom].monto,
    count: cobrosPorCobrador[nom].count
  })).sort((a,b)=>b.monto-a.monto);
  const miPosicion = ranking.findIndex(r=>r.nombre===me) + 1;

  // ─── MIS SOLICITUDES ───
  const misSolicitudes = S.creds.filter(c=>!c.eliminado && c.creadoPor===me)
    .sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')).slice(0,5);
  const misSolicitudesActivas = S.creds.filter(c=>!c.eliminado && c.creadoPor===me && c.estado==='activo').length;
  const misSolicitudesCompletadas = S.creds.filter(c=>!c.eliminado && c.creadoPor===me && c.estado==='completado').length;

  // ─── A COBRAR ESTA SEMANA ───
  function proximaCuota(c){
    if(!c.fecha) return null;
    const inicio = parseFechaLocal(c.fecha);
    if(isNaN(inicio.getTime())) return null;
    const pagadas = c.pagado||0;
    const proxima = new Date(inicio);
    proxima.setDate(inicio.getDate() + (pagadas+1)*15);
    return proxima;
  }
  const enSemana = activos.filter(c=>{
    if(c.mora>0) return false;
    const px = proximaCuota(c);
    if(!px) return false;
    return px>=lunes && px<=domingo;
  }).map(c=>({...c, _proxima:proximaCuota(c)}))
    .sort((a,b)=>a._proxima-b._proxima);

  const totalAcobrarMora = enMora.reduce((a,c)=>a+parseFloat(c.cuotaQ||c.cuota||0),0);
  const totalAcobrarSem = enSemana.reduce((a,c)=>a+parseFloat(c.cuotaQ||c.cuota||0),0);
  const totalAcobrar = totalAcobrarMora + totalAcobrarSem;

  // ─── CLIENTES POR LLAMAR HOY (mora + vence hoy) ───
  const porLlamarHoy = enMora.slice(0,5).concat(
    enSemana.filter(c=>c.fechaLocalISO(_proxima)===hoyStr).slice(0,3)
  );

  return `<div class="page">

  <!-- ══ HERO HEADER ══ -->
  <div style="background:linear-gradient(135deg,var(--p1) 0%,var(--p2) 100%);color:#fff;border-radius:16px;padding:20px 22px;margin-bottom:14px;box-shadow:0 8px 32px rgba(37,99,235,.18);position:relative;overflow:hidden">
    <div style="position:absolute;top:-40px;right:-20px;width:180px;height:180px;background:radial-gradient(circle,rgba(255,255,255,.12) 0%,transparent 70%);pointer-events:none"></div>
    <div style="position:relative;z-index:1">
      <div style="font-size:12px;opacity:.85;font-weight:600;margin-bottom:3px;text-transform:capitalize">${hoyTxt}</div>
      <div style="font-size:22px;font-weight:900;letter-spacing:-.4px;margin-bottom:3px">${saludo}, ${me.split(' ')[0]}</div>
      <div style="font-size:11.5px;opacity:.85;margin-bottom:14px">${rol}${miPosicion>0?` · Posición #${miPosicion} este mes `:''}</div>

      <!-- Stats mensuales del cobrador -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        <div style="background:rgba(255,255,255,.14);border-radius:10px;padding:10px 12px;backdrop-filter:blur(8px)">
          <div style="font-size:9.5px;opacity:.8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Hoy</div>
          <div style="font-size:17px;font-weight:900;font-family:var(--fd);margin-top:2px">${fmt(cobradoHoy)}</div>
          <div style="font-size:10px;opacity:.75;margin-top:1px">${misPagosHoy.length} cobro${misPagosHoy.length!==1?'s':''}</div>
        </div>
        <div style="background:rgba(255,255,255,.14);border-radius:10px;padding:10px 12px;backdrop-filter:blur(8px)">
          <div style="font-size:9.5px;opacity:.8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Esta semana</div>
          <div style="font-size:17px;font-weight:900;font-family:var(--fd);margin-top:2px">${fmt(cobradoSemana)}</div>
          <div style="font-size:10px;opacity:.75;margin-top:1px">${misPagosSemana.length} cobro${misPagosSemana.length!==1?'s':''}</div>
        </div>
        <div style="background:rgba(255,255,255,.14);border-radius:10px;padding:10px 12px;backdrop-filter:blur(8px)">
          <div style="font-size:9.5px;opacity:.8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Este mes</div>
          <div style="font-size:17px;font-weight:900;font-family:var(--fd);margin-top:2px">${fmt(cobradoMes)}</div>
          <div style="font-size:10px;opacity:.75;margin-top:1px">${misPagosMes.length} cobro${misPagosMes.length!==1?'s':''}</div>
        </div>
      </div>

      ${metaSemana>0 ? `
      <!-- Progreso meta semanal -->
      <div style="background:rgba(255,255,255,.1);border-radius:10px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:11px;font-weight:700">Meta semanal: ${fmt(metaSemana)}</div>
          <div style="font-size:11px;font-weight:800">${avanceMeta}%</div>
        </div>
        <div style="background:rgba(255,255,255,.15);height:6px;border-radius:3px;overflow:hidden">
          <div style="background:var(--p1);height:100%;width:${avanceMeta}%;border-radius:3px;transition:width .5s ease"></div>
        </div>
        ${avanceMeta >= 100 ? '<div style="font-size:10.5px;margin-top:5px;font-weight:700"> ¡Meta cumplida! Sigue así</div>' : ''}
      </div>
      ` : ''}
    </div>
  </div>

  <!-- ══ ACCIONES RÁPIDAS ══ -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
    <button onclick="openAddPago()" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;border-radius:12px;border:1px solid var(--rim);background:var(--surf);cursor:pointer;transition:all .15s;font-family:var(--f)" onmouseover="this.style.borderColor='var(--green)';this.style.background='var(--greens)'" onmouseout="this.style.borderColor='var(--rim)';this.style.background='var(--surf)'">
      <div style="font-size:22px"></div>
      <div style="font-size:11.5px;font-weight:800;color:var(--ink)">Registrar Pago</div>
      <div style="font-size:9.5px;color:var(--ink3)">Cobro rápido</div>
    </button>
    <button onclick="openAddCred()" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;border-radius:12px;border:1px solid var(--rim);background:var(--surf);cursor:pointer;transition:all .15s;font-family:var(--f)" onmouseover="this.style.borderColor='var(--p1)';this.style.background='var(--gs)'" onmouseout="this.style.borderColor='var(--rim)';this.style.background='var(--surf)'">
      <div style="font-size:22px"></div>
      <div style="font-size:11.5px;font-weight:800;color:var(--ink)">Nueva Solicitud</div>
      <div style="font-size:9.5px;color:var(--ink3)">Capturar cliente</div>
    </button>
    <button onclick="nav(&quot;cobranza&quot;)" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;border-radius:12px;border:1px solid var(--rim);background:var(--surf);cursor:pointer;transition:all .15s;font-family:var(--f)" onmouseover="this.style.borderColor='var(--amber)';this.style.background='var(--ambers)'" onmouseout="this.style.borderColor='var(--rim)';this.style.background='var(--surf)'">
      <div style="font-size:22px"></div>
      <div style="font-size:11.5px;font-weight:800;color:var(--ink)">Ver Cobranza</div>
      <div style="font-size:9.5px;color:var(--ink3)">Todos los créditos</div>
    </button>
  </div>

  <!-- ══ ALERTAS Y URGENCIAS ══ -->
  ${enMora.length>0 ? `
  <div style="background:linear-gradient(135deg,rgba(217,59,90,.08) 0%,rgba(217,59,90,.02) 100%);border:1px solid rgba(217,59,90,.25);border-radius:12px;padding:14px 16px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:38px;height:38px;background:var(--red);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">️</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:800;color:var(--red)">${enMora.length} cliente${enMora.length!==1?'s':''} en mora</div>
        <div style="font-size:11.5px;color:var(--ink2)">${fmt(totalAcobrarMora)} por recuperar</div>
      </div>
      <button class="btn btn-r btn-sm" onclick="nav('pagos')">Ver todos →</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
      <div style="background:rgba(255,255,255,.4);border-radius:8px;padding:7px 9px;text-align:center">
        <div style="font-size:16px;font-weight:900;color:var(--amber);line-height:1">${mora1a7}</div>
        <div style="font-size:9.5px;color:var(--ink3);font-weight:600;margin-top:2px">1-7 días</div>
      </div>
      <div style="background:rgba(255,255,255,.4);border-radius:8px;padding:7px 9px;text-align:center">
        <div style="font-size:16px;font-weight:900;color:var(--amber);line-height:1">${mora8a30}</div>
        <div style="font-size:9.5px;color:var(--ink3);font-weight:600;margin-top:2px">8-30 días</div>
      </div>
      <div style="background:rgba(255,255,255,.4);border-radius:8px;padding:7px 9px;text-align:center">
        <div style="font-size:16px;font-weight:900;color:var(--red);line-height:1">${mora31mas}</div>
        <div style="font-size:9.5px;color:var(--ink3);font-weight:600;margin-top:2px">+30 días</div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- ══ A LLAMAR HOY — top priorizada ══ -->
  ${porLlamarHoy.length>0 ? `
  <div class="card" style="margin-bottom:12px">
    <div class="ch">
      <div>
        <div class="ct"> Llamar hoy · Lista priorizada</div>
        <div class="cs">${porLlamarHoy.length} clientes · Los más urgentes primero</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;padding:0 14px 14px">
      ${porLlamarHoy.map(c=>{
        const esMora = c.mora>0;
        const urgColor = esMora ? (c.mora>30?'var(--red)':'var(--amber)') : 'var(--p1)';
        const urgTxt = esMora ? c.mora+'d mora' : 'Vence hoy';
        const cuota = fmt(c.cuotaQ||c.cuota||0);
        const telClean = (c.tel||'').replace(/\D/g,'');
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surf2);border-radius:10px;border-left:3px solid ${urgColor}">
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.cli}</div>
            <div style="font-size:10.5px;color:var(--ink3);margin-top:1px">${c.modelo} · <span style="color:${urgColor};font-weight:700">${urgTxt}</span> · <span style="font-weight:800;font-family:var(--fd)">${cuota}</span></div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            ${telClean?`<a href="tel:${telClean}" class="btn btn-g btn-xs" style="padding:6px 9px" title="Llamar"></a>`:''}
            ${telClean?`<a href="https://wa.me/58${telClean}" target="_blank" class="btn btn-g btn-xs" style="padding:6px 9px;background:#25D366;color:#fff;border-color:#25D366" title="WhatsApp"></a>`:''}
            <button class="btn btn-p btn-xs" style="padding:6px 9px" onclick="openPagoRapido('${c.id}')" title="Cobrar ahora"></button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
  ` : `
  <div style="background:linear-gradient(135deg,rgba(46,204,113,.08) 0%,rgba(46,204,113,.02) 100%);border:1px solid rgba(46,204,113,.25);border-radius:12px;padding:20px;margin-bottom:14px;text-align:center">
    <div style="font-size:32px;margin-bottom:8px"></div>
    <div style="font-size:14px;font-weight:800;color:var(--green)">¡Sin urgencias hoy!</div>
    <div style="font-size:12px;color:var(--ink3);margin-top:4px">No hay mora ni vencimientos urgentes. Buen trabajo.</div>
  </div>
  `}

  <!-- ══ PRÓXIMOS VENCIMIENTOS DE LA SEMANA ══ -->
  <div class="card" style="margin-bottom:12px">
    <div class="ch">
      <div>
        <div class="ct"> Esta semana</div>
        <div class="cs">${enSemana.length} vencimiento${enSemana.length!==1?'s':''} · ${fmt(totalAcobrarSem)} esperado</div>
      </div>
      ${enSemana.length>6?`<button class="btn btn-g btn-sm" onclick="nav('pagos')">Ver todos →</button>`:''}
    </div>
    ${enSemana.length ? `<div class="tw"><table>
      <thead><tr><th>Día</th><th>Cliente</th><th>Modelo</th><th>Cuota</th><th></th></tr></thead>
      <tbody>${enSemana.slice(0,6).map(c=>{
        const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
        const px = c._proxima;
        const esHoy = fechaLocalISO(px)===hoyStr;
        const mañana = new Date(hoy); mañana.setDate(hoy.getDate()+1);
        const esMañana = fechaLocalISO(px)===fechaLocalISO(mañana);
        const diaLbl = esHoy?'HOY':esMañana?'MAÑANA':dias[px.getDay()]+' '+px.getDate();
        const diaColor = esHoy?'var(--amber)':esMañana?'var(--p1)':'var(--ink3)';
        return `<tr ${esHoy?'style="background:rgba(232,152,10,.06)"':''}>
          <td style="white-space:nowrap"><span style="font-size:10px;font-weight:800;color:${diaColor};text-transform:uppercase">${diaLbl}</span></td>
          <td class="tdm">${c.cli}<div class="tds" style="font-size:10px">${c.tel||''}</div></td>
          <td class="tds">${c.modelo}</td>
          <td style="font-weight:700;font-family:var(--fd)">${fmt(c.cuotaQ||c.cuota||0)}</td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn btn-p btn-xs" onclick="openPagoRapido('${c.id}')" title="Cobrar"></button>
            ${c.tel?`<a href="https://wa.me/58${(c.tel||'').replace(/\D/g,'')}" target="_blank" class="btn btn-xs" style="background:#25D366;color:#fff;border-color:#25D366;padding:4px 7px" title="WhatsApp"></a>`:''}
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
    ` : `<div style="text-align:center;padding:28px 0;color:var(--ink3);font-size:13px">Sin vencimientos esta semana</div>`}
  </div>

  <!-- ══ RANKING DEL EQUIPO ══ -->
  ${ranking.length > 1 ? `
  <div class="card" style="margin-bottom:12px">
    <div class="ch">
      <div>
        <div class="ct"> Ranking del mes</div>
        <div class="cs">Cobros confirmados · Este mes</div>
      </div>
    </div>
    <div style="padding:4px 14px 14px">
      ${ranking.slice(0,5).map((r,i)=>{
        const esMio = r.nombre===me;
        const medalla = i===0?'':i===1?'':i===2?'':'#'+(i+1);
        const maxMonto = ranking[0].monto || 1;
        const pctBar = Math.round((r.monto/maxMonto)*100);
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 4px;${i<ranking.length-1?'border-bottom:1px solid var(--rim);':''}${esMio?'background:var(--gs);margin:0 -10px;padding:10px 14px;border-radius:8px':''}">
          <div style="flex-shrink:0;width:32px;text-align:center;font-size:${i<3?'20px':'12px'};font-weight:800;color:${i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--ink3)'}">${medalla}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-size:12.5px;font-weight:${esMio?'900':'700'};color:${esMio?'var(--p1)':'var(--ink)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.nombre}${esMio?' <span style="background:var(--p1);color:#fff;font-size:8.5px;font-weight:800;padding:1px 5px;border-radius:4px;margin-left:3px">TÚ</span>':''}</div>
              <div style="font-size:12px;font-weight:900;font-family:var(--fd);color:var(--ink);flex-shrink:0">${fmt(r.monto)}</div>
            </div>
            <div style="background:var(--surf2);height:4px;border-radius:2px;overflow:hidden">
              <div style="background:${i===0?'#ffd700':esMio?'var(--p1)':'var(--ink3)'};height:100%;width:${pctBar}%;border-radius:2px;transition:width .5s ease"></div>
            </div>
            <div style="font-size:9.5px;color:var(--ink3);margin-top:2px">${r.count} cobro${r.count!==1?'s':''}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
  ` : ''}

  <!-- ══ MIS SOLICITUDES RECIENTES ══ -->
  ${misSolicitudes.length > 0 ? `
  <div class="card">
    <div class="ch">
      <div>
        <div class="ct"> Mis solicitudes recientes</div>
        <div class="cs">${misSolicitudesActivas} activas · ${misSolicitudesCompletadas} completadas</div>
      </div>
      <button class="btn btn-g btn-sm" onclick="nav('creditos')">Ver todas →</button>
    </div>
    <div class="tw"><table>
      <thead><tr><th>ID</th><th>Cliente</th><th>Modelo</th><th>Estado</th></tr></thead>
      <tbody>${misSolicitudes.map(c=>`<tr onclick="openAmort('${c.id}')" style="cursor:pointer">
        <td class="tds" style="font-family:monospace;font-size:11px">${c.id}</td>
        <td class="tdm">${c.cli}</td>
        <td class="tds">${c.modelo}</td>
        <td><span class="bdg ${sbg(c.estado)}">${c.estado}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>
  ` : `
  <div class="card" style="padding:24px;text-align:center">
    <div style="font-size:32px;margin-bottom:8px;opacity:.4"></div>
    <div style="font-size:13px;font-weight:700;color:var(--ink2);margin-bottom:4px">Aún no has creado solicitudes</div>
    <div style="font-size:11.5px;color:var(--ink3);margin-bottom:12px">Crea la primera para que empiece a contar</div>
    <button class="btn btn-p btn-sm" onclick="openAddCred()">＋ Crear solicitud</button>
  </div>
  `}

  </div>`;
}


// ══════════════════════════════════════════
// PAGES
// ══════════════════════════════════════════

// Helper: Banner estándar morado para todas las páginas.
// Todos los banners usan el mismo gradiente morado para unidad visual.
// actions: array de objetos { label, onclick, primary?:bool } (opcional)
function pageBanner(tagline, title, subtitle, actions){
  var actionsHTML = '';
  if(actions && actions.length){
    actionsHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + actions.map(function(a){
      var st = a.primary
        ? 'background:var(--surf);color:var(--p1);font-weight:800'
        : 'background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(4px)';
      return '<button class="btn btn-sm" onclick="'+(a.onclick||'')+'" style="'+st+'">'+a.label+'</button>';
    }).join('') + '</div>';
  }
  return '<div style="background:var(--grad);border-radius:var(--r16);padding:20px 24px;margin-bottom:14px;color:#fff;position:relative;overflow:hidden">'
    +'<div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.08)"></div>'
    +'<div style="position:absolute;bottom:-60px;right:60px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.06)"></div>'
    +'<div style="position:relative;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap">'
    +'<div>'
    +(tagline?'<div style="font-size:11px;font-weight:800;opacity:.85;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">'+tagline+'</div>':'')
    +'<div style="font-size:24px;font-weight:900;letter-spacing:-.5px;margin-bottom:3px">'+title+'</div>'
    +(subtitle?'<div style="font-size:12.5px;opacity:.85;max-width:640px;line-height:1.5">'+subtitle+'</div>':'')
    +'</div>'
    + actionsHTML
    +'</div></div>';
}


// ══════════════════════════════════════════
// ══════════════════════════════════════════

// ══════════════════════════════════════════
// USUARIOS — TAB CONTENT HELPERS
// ══════════════════════════════════════════

// LIVE SEARCH CLIENTES
// ══════════════════════════════════════════
function setClienteEstadoFiltro(f){
  S.clienteEstadoFiltro=f||'todos';
  pgSet('clientes',1);
  // Actualizar visualmente los chips inmediatamente
  var chips = document.querySelectorAll('.page button[onclick^="setClienteEstadoFiltro"]');
  chips.forEach(function(btn){
    var m = btn.getAttribute('onclick').match(/setClienteEstadoFiltro\('([^']+)'\)/);
    var val = m ? m[1] : '';
    btn.classList.remove('btn-p','btn-g');
    btn.classList.add(val===S.clienteEstadoFiltro ? 'btn-p' : 'btn-g');
  });
  const list=$('clienteList');
  if(list) list.innerHTML=renderClienteList(($('clienteQ')&&$('clienteQ').value)||'');
}
function liveSearchCliente(q){
  pgSet('clientes',1);
  const list=$('clienteList');
  if(list) list.innerHTML=renderClienteList(q);
}

// ══════════════════════════════════════════

function _cliInitFromCliente(c){
  WZ = { step:1, totalSteps:2, score:0, f1:0,f2:0,f3:0,f4:0,f5:0, cuota:0,ratio:0,monto:0,precio:0,plazo:0,ini:0,ing:0, mode:'cliente', clienteEditId:(c&&c.id)||null };
  if(!c) return;
  WZ.nom = WZ.wz_nom = c.nombre || '';
  WZ.rif = WZ.wz_rif = c.rif || '';
  WZ.nacionalidad = WZ.wz_nacionalidad = c.nacionalidad || '';
  WZ.ci = WZ.wz_ci = _wzFmtCedula(c.cedula || '');
  WZ.tel = WZ.wz_tel = c.tel || '';
  WZ.wa = WZ.wz_wa = c.wa || c.tel || '';
  WZ.email = WZ.wz_email = c.email || '';
  WZ.ciudad = WZ.wz_ciudad = c.ciudad || '';
  WZ.emp = WZ.wz_emp = c.trabajo || '';
  WZ.ant = WZ.wz_ant = c.antiguedad || '';
  WZ.ing = WZ.wz_ing = c.ingreso || '';
  WZ.ifam = WZ.wz_ifam = c.ingreso_familiar || '';
  WZ.conocio = WZ.wz_conocio = c.conocio || '';
  WZ.viv = WZ.wz_viv = c.vivienda || '';
  WZ.terremoto = WZ.wz_terremoto = c.terremoto_afectado || 'no';
  WZ.terremotoDanos = WZ.wz_terremoto_danos = c.terremoto_danos || '';
  WZ.tdir = WZ.wz_tdir = c.tiempo_dir || '';
  WZ.estado_ubi = WZ.wz_estado = c.estado_ubi || '';
  WZ.ciudad_res = WZ.wz_ciudad_res = c.ciudad || '';
  WZ.dir_det = WZ.wz_dir_det = c.dir || '';
  WZ.empresa = WZ.wz_empresa = c.empresa || '';
  WZ.dir_trabajo = WZ.wz_dir_trabajo = c.dir_trabajo || '';
  WZ.tel_trabajo = WZ.wz_tel_trabajo = c.tel_trabajo || '';
  WZ.cargo = WZ.wz_cargo = c.cargo || '';
  WZ.rem = WZ.wz_rem = c.remesas || '';
  WZ.dep = c.dependientes || 0;
  WZ.hist = c.historial || '';
  WZ.deuda = c.deudas || '';
  WZ.banco = WZ.wz_banco = c.banco_estado || '';
  WZ.banco_nm = WZ.wz_banco_nm = c.banco_nombre || '';
  WZ.banco_cobro = WZ.wz_banco_cobro = c.banco_cobro || '';
  WZ.cuenta = WZ.wz_cuenta = c.cuenta_digitos || '';
  WZ.ahorro = WZ.wz_ahorro = c.ahorro || '';
  WZ.cashea = c.cashea || 'no';
  WZ.cashea_nivel = WZ.wz_cashea_nivel = c.cashea_nivel || '';
  WZ.cashea_pago = WZ.wz_cashea_pago = c.cashea_pago || '';
  WZ.cashea_estado = WZ.wz_cashea_estado = c.cashea_estado || '';
  WZ.cashea_deuda = WZ.wz_cashea_deuda = c.cashea_deuda || 'no';
  WZ.cashea_monto = WZ.wz_cashea_monto = c.cashea_monto || '';
  WZ.cashea_cuotas_pend = WZ.wz_cashea_cuotas_pend = c.cashea_cuotas_pend || '';
  WZ.cashea_ultimo_art = WZ.wz_cashea_ultimo_art = c.cashea_ultimo_art || '';
  WZ.cashea_ultimo_monto = WZ.wz_cashea_ultimo_monto = c.cashea_ultimo_monto || '';
  WZ.cashea_ultima_fecha = WZ.wz_cashea_ultima_fecha = c.cashea_ultima_fecha || '';
  WZ.cashea_total_compras = WZ.wz_cashea_total_compras = c.cashea_total_compras || '';
  WZ.cashea_obs = WZ.wz_cashea_obs = c.cashea_obs || '';
  WZ.fiador_tiene = c.fiador || 'no';
  WZ.fiador_nom = WZ.wz_fiador_nom = c.fiador_nom || '';
  WZ.fiador_rif = WZ.wz_fiador_rif = c.fiador_rif || '';
  WZ.fiador_dir = WZ.wz_fiador_dir = c.fiador_dir || '';
  WZ.fiador_email = WZ.wz_fiador_email = c.fiador_email || '';
  WZ.fiador_tel = WZ.wz_fiador_tel = c.fiador_tel || '';
  WZ.fiador_ci = WZ.wz_fiador_ci = _wzFmtCedula(c.fiador_ci || '');
  WZ.fiador_rel = WZ.wz_fiador_rel = c.fiador_rel || '';
  WZ.r1n = WZ.wz_r1n = c.ref1&&c.ref1.nom || '';
  WZ.r1ci = WZ.wz_r1ci = c.ref1&&c.ref1.ci || '';
  WZ.r1t = WZ.wz_r1t = c.ref1&&c.ref1.tel || '';
  WZ.r1r = WZ.wz_r1r = c.ref1&&c.ref1.rel || '';
  WZ.r1obs = WZ.wz_r1obs = c.ref1&&c.ref1.obs || '';
  WZ.r2n = WZ.wz_r2n = c.ref2&&c.ref2.nom || '';
  WZ.r2ci = WZ.wz_r2ci = c.ref2&&c.ref2.ci || '';
  WZ.r2t = WZ.wz_r2t = c.ref2&&c.ref2.tel || '';
  WZ.r2r = WZ.wz_r2r = c.ref2&&c.ref2.rel || '';
  WZ.r2obs = WZ.wz_r2obs = c.ref2&&c.ref2.obs || '';
  _wzLoadDocsUpFromCliente(c);
  WZ.docsCount = WZ.wz_docsCount = (c.documentos&&c.documentos.length) || c.docs_count || 0;
  WZ.impresion = WZ.wz_impresion = c.impresion || '';
  WZ.obs = WZ.wz_obs = c.notas || c.obs || '';
  WZ.score = c.score_indexa || 0;
  WZ.f1 = c.f1 || 0; WZ.f2 = c.f2 || 0; WZ.f3 = c.f3 || 0; WZ.f4 = c.f4 || 0; WZ.f5 = c.f5 || 0;
  WZ['_chip_wz_emp_g'] = WZ.emp || '';
  WZ['_chip_wz_dep_g'] = String(WZ.dep || 0);
  WZ['_chip_wz_hist_g'] = WZ.hist || '';
  WZ['_chip_wz_deuda_g'] = WZ.deuda || '';
  WZ['_chip_wz_impresion_g'] = WZ.impresion || '';
}

function _cliScorePill(){
  function scoreCol(s){ return s>=625?'var(--green)':s>=450?'var(--amber)':'var(--red)'; }
  function scoreLbl(s){ return s>=750?'Excelente':s>=625?'Bueno':s>=450?'Regular':'Bajo'; }
  return WZ.score>0
    ? '<div style="display:flex;align-items:center;gap:10px;background:var(--surf);border:1.5px solid var(--rim2);border-radius:50px;padding:7px 16px">'
        +'<div style="font-size:22px;font-weight:900;letter-spacing:-1px;color:'+scoreCol(WZ.score)+'">'+WZ.score+'</div>'
        +'<div><div style="font-size:10px;font-weight:700;color:'+scoreCol(WZ.score)+'">'+scoreLbl(WZ.score)+'</div>'
        +'<div style="font-size:9px;color:var(--ink3)">Score Indexa /850</div></div>'
        +'</div>'
    : '<div style="font-size:12px;color:var(--ink3);padding:7px 16px;background:var(--surf2);border-radius:50px;border:1px solid var(--rim)">CrediScore aparece al completar perfil</div>';
}

function _cliStep1(){
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    + _wzFg('Nombre completo *','wz_nom','text','Ej: Carlos Pérez','',true)
    + _wzFg('N° Cédula *','wz_ci','text','V-12345678','oninput="_wzCedulaInput(event)" autocapitalize="characters"',true)
    + _wzFg('RIF','wz_rif','text','J-12345678-9')
    + _wzFg('Nacionalidad','wz_nacionalidad','text','Venezolano/a')
    + _wzFg('Teléfono *','wz_tel','tel','0412-0000000','',true)
    + _wzFg('WhatsApp','wz_wa','tel','0412-0000000')
    + _wzFg('Correo','wz_email','email','correo@ejemplo.com')
    + _wzFg('Ciudad','wz_ciudad','text','Ej: Caracas')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">'
    + '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px">Tipo de empleo *</label>'
    + '<select class="fs" id="wz_emp" onchange="_wzScore()">'
    + '<option value="">Seleccionar...</option>'
    + '<option value="formal">Formal / Empleado</option>'
    + '<option value="publico">Empleado Público</option>'
    + '<option value="delivery">Delivery / Motorizado</option>'
    + '<option value="independiente">Independiente</option>'
    + '<option value="comerciante">Comercio / Negocio</option>'
    + '<option value="remesas">Remesas</option>'
    + '<option value="informal">Informal</option>'
    + '</select></div>'
    + '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px">Antigüedad laboral</label>'
    + '<select class="fs" id="wz_ant" onchange="_wzScore()">'
    + '<option value="">Seleccionar...</option>'
    + '<option value="1">Menos de 6 meses</option>'
    + '<option value="2">6 meses – 1 año</option>'
    + '<option value="3">1 a 3 años</option>'
    + '<option value="5">Más de 3 años</option>'
    + '</select></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">'
    + _wzFg('Ingreso mensual (USD) *','wz_ing','number','0','oninput="_wzScore()"',true)
    + _wzFg('Ingreso familiar total (USD)','wz_ifam','number','0','oninput="_wzScore()"')
    + '</div>'
    + '<div style="margin-top:10px"><label class="fsec" style="display:block;margin-bottom:5px">¿Cómo nos conoció?</label>'
    + '<select class="fs" id="wz_conocio" onchange="_wzScore()">'
    + '<option value="">Seleccionar...</option>'
    + '<option value="referido">Referido por cliente</option>'
    + '<option value="redes">Redes sociales</option>'
    + '<option value="vitrina">Vitrina / local</option>'
    + '<option value="google">Google / internet</option>'
    + '<option value="anterior">Cliente anterior</option>'
    + '<option value="otro">Otro</option>'
    + '</select></div>';
}

function _cliStep2(){
  function _s(title){ return '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:var(--p1);margin:18px 0 8px;padding-bottom:6px;border-bottom:1px solid var(--rim)">'+title+'</div>'; }
  function _s2(title){ return '<div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--ink3);margin:12px 0 6px">'+title+'</div>'; }
  function _row2(a,b){ return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'+a+b+'</div>'; }
  function _fg(label,inner){ return '<div class="fg"><label class="fsec" style="display:block;margin-bottom:5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3)">'+label+'</label>'+inner+'</div>'; }
  function _sel(id,opts,onch){ return '<select class="fs" id="'+id+'" onchange="'+(onch||'')+'">'+opts+'</select>'; }
  function _inp(id,type,ph,extra){ return '<input class="fi" id="'+id+'" type="'+(type||'text')+'" placeholder="'+(ph||'')+'" '+(extra||'')+' style="width:100%">'; }
  function _chip(label,group,val,onch){ return '<label style="flex:1;min-width:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:var(--surf2);border:1.5px solid var(--rim);border-radius:10px;padding:9px 6px;cursor:pointer;text-align:center;font-size:12px;font-weight:700;transition:.15s" onclick="_wzChip(this,\''+group+'\',\''+val+'\')">'+label+'</label>'; }
  return _s('Residencia')
  +'<div class="fg" style="margin-bottom:10px"><label class="fsec" style="display:block;margin-bottom:5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3)">Dirección</label>'
  +'<div style="position:relative">'
  +'<input class="fi" id="wz_dir_q" type="text" placeholder=" Busca tu dirección en Venezuela..." autocomplete="off" oninput="_wzAddrBuscar(this.value)" onblur="setTimeout(function(){var d=document.getElementById(\'wz_addr_drop\');if(d)d.style.display=\'none\';},220)" style="width:100%">'
  +'<div id="wz_addr_drop" style="display:none;position:absolute;left:0;right:0;top:calc(100% + 3px);background:var(--surf);border:1.5px solid var(--p1);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:500;max-height:180px;overflow-y:auto"></div>'
  +'</div></div>'
  +_row2(
    _fg('Estado',_sel('wz_estado','<option value="">Seleccionar...</option><option>Caracas (D.C.)</option><option>Miranda</option><option>Carabobo</option><option>Aragua</option><option>Zulia</option><option>Lara</option><option>Bolívar</option><option>Anzoátegui</option><option>Mérida</option><option>Táchira</option><option>Monagas</option><option>Sucre</option><option>Falcón</option><option>Barinas</option><option>Apure</option><option>Otro</option>')),
    _fg('Ciudad / Municipio',_inp('wz_ciudad_res','text','Se completa al buscar'))
  )
  +'<div style="margin-bottom:10px">'+_fg('Detalle (apto, piso, referencia)','<textarea class="fta" id="wz_dir_det" placeholder="Piso 3, apto 3-A, frente al Banco..." style="min-height:50px;width:100%"></textarea>')+'</div>'
  +_row2(
    _fg('Tiempo en esta dirección',_sel('wz_tdir','<option value="0">Seleccionar...</option><option value="1">Menos de 1 año</option><option value="2">1–3 años</option><option value="3">3–5 años</option><option value="4">Más de 5 años</option>','_wzScore()')),
    _fg('Tipo de vivienda',_sel('wz_viv','<option value="propia">Propia</option><option value="alquilada">Alquilada</option><option value="familiar">Familiar / prestada</option><option value="otro">Otro</option>','_wzScore()'))
  )
  +_row2(
    _fg('¿Fue afectado por el terremoto?',_sel('wz_terremoto','<option value="no">No</option><option value="si">Sí</option>','_wzTerremotoToggle()')),
    '<div id="wz_terremoto_danos_wrap" style="'+((typeof WZ!=='undefined'&&WZ&&WZ.terremoto)==='si'?'':'display:none')+'">'+_fg('Nivel de daños',_sel('wz_terremoto_danos','<option value="leves">Daños leves</option><option value="moderados">Daños moderados</option><option value="graves">Daños graves</option>'))+'</div>'
  )
  +_s('Empleo e Ingresos')
  +'<div style="margin-bottom:10px">'+_fg('Tipo de empleo *',
    '<div style="display:flex;flex-wrap:wrap;gap:7px" id="wz_emp_g">'
    +[['Formal / Empleado','formal'],['Público','publico'],['Delivery','delivery'],['Independiente','independiente'],['Comerciante','comerciante'],['Remesas','remesas'],['Informal','informal']]
    .map(function(x){ return _chip(x[0],'wz_emp_g',x[1],'_wzScore()'); }).join('')
    +'</div>'
  )+'</div>'
  +_row2(
    _fg('Empresa',_inp('wz_empresa','text','Nombre de la empresa')),
    _fg('Cargo / actividad',_inp('wz_cargo','text','Ej: vendedor, delivery, comerciante'))
  )
  +_row2(
    _fg('Dirección de trabajo',_inp('wz_dir_trabajo','text','Ej: Av. Principal, Local 3...')),
    _fg('Teléfono laboral',_inp('wz_tel_trabajo','tel','0212-0000000'))
  )
  +_row2(
    _fg('Ingreso mensual propio (USD)',_inp('wz_ing','number','0','oninput="_wzScore()"')),
    _fg('Ingreso familiar total (USD)',_inp('wz_ifam','number','0','oninput="_wzScore()"'))
  )
  +_row2(
    _fg('Antigüedad laboral',_sel('wz_ant','<option value="">Seleccionar...</option><option value="1">Menos de 6 meses</option><option value="2">6 meses – 1 año</option><option value="3">1 a 3 años</option><option value="5">Más de 3 años</option>','_wzScore()')),
    _fg('¿Recibe remesas?',_sel('wz_rem','<option value="no">No</option><option value="si">Sí</option>','_wzScore()'))
  )
  +'<div style="margin-bottom:10px">'+_fg('Dependientes económicos',
    '<div style="display:flex;gap:7px">'
    +[['0','0'],['1','1'],['2','2'],['3+','3']].map(function(x){ return _chip(x[0],'wz_dep_g',x[1],'_wzScore()'); }).join('')
    +'</div>'
  )+'</div>'
  +_s('Historial Financiero')
  +'<div style="margin-bottom:10px">'+_fg('Créditos anteriores *',
    '<div style="display:flex;flex-wrap:wrap;gap:7px">'
    +[['Sin historial','ninguno'],['Puntual ','bueno'],['Mora leve ️','mora_leve'],['Mora grave ','malo']]
    .map(function(x){ return _chip(x[0],'wz_hist_g',x[1],'_wzScore()'); }).join('')
    +'</div>'
  )+'</div>'
  +'<div style="margin-bottom:10px">'+_fg('Deudas activas actualmente',
    '<div style="display:flex;gap:7px">'
    +[['Sin deudas','no'],['Menores','menores'],['Importantes','graves']]
    .map(function(x){ return _chip(x[0],'wz_deuda_g',x[1],'_wzScore()'); }).join('')
    +'</div>'
  )+'</div>'
  +_row2(
    _fg('Cuenta bancaria',_sel('wz_banco','<option value="activa">Activa con movimientos</option><option value="poca">Poco movimiento</option><option value="no">Sin cuenta bancaria</option>','_wzScore()')),
    _fg('Banco(s)',_inp('wz_banco_nm','text','Ej: Banesco, Mercantil'))
  )
  +'<div style="margin-bottom:10px">'+_fg('Banco para cobro de cuotas',_sel('wz_banco_cobro','<option value="">Seleccionar...</option><option value="bdv">Banco de Venezuela</option><option value="banesco">Banesco</option><option value="mercantil">Mercantil</option><option value="provincial">BBVA Provincial</option><option value="bicentenario">Bicentenario</option><option value="venezolano">Venezolano de Crédito</option><option value="exterior">Banco Exterior</option><option value="otro">Otro</option>'))+'</div>'
  +_row2(
    _fg('Número de cuenta (últimos 4 dígitos)',_inp('wz_cuenta','text','XXXX','maxlength="4"')),
    _fg('¿Tiene ahorros?',_sel('wz_ahorro','<option value="no">No</option><option value="usd">Sí, en USD</option><option value="bs">Sí, en Bs</option>'))
  )
  +_s('Cashea')
  +'<div style="margin-bottom:10px">'+_fg('¿Tiene cuenta Cashea?',
    '<div style="display:flex;gap:8px">'
    +'<label style="flex:1;display:flex;align-items:center;gap:8px;background:var(--surf2);border:1.5px solid var(--rim);border-radius:10px;padding:10px 12px;cursor:pointer">'
    +'<input type="radio" name="wz_cashea" value="no" checked onchange="_wzToggleCashea(\'no\')" style="accent-color:var(--p1)"> Sin Cashea</label>'
    +'<label style="flex:1;display:flex;align-items:center;gap:8px;background:var(--surf2);border:1.5px solid var(--rim);border-radius:10px;padding:10px 12px;cursor:pointer">'
    +'<input type="radio" name="wz_cashea" value="si" onchange="_wzToggleCashea(\'si\')" style="accent-color:var(--p1)"> Tiene Cashea</label>'
    +'</div>'
  )+'</div>'
  +'<div id="wz_cashea_det" style="display:none;background:var(--surf2);border:1px solid var(--rim);border-radius:12px;padding:12px">'
  +_row2(
    _fg('Nivel Cashea',_sel('wz_cashea_nivel','<option value="">Seleccionar...</option><option value="1">Nivel 1 — Básico</option><option value="2">Nivel 2 — Bronce</option><option value="3">Nivel 3 — Plata</option><option value="4">Nivel 4 — Oro</option>','_wzScore()')),
    _fg('Estado con Cashea',_sel('wz_cashea_estado','<option value="">Seleccionar...</option><option value="al_dia">Al día</option><option value="mora_leve">Mora < 30 días</option><option value="mora_grave">Mora > 30 días</option><option value="completado">Ya canceló todo</option>','_wzScore()'))
  )
  +_row2(
    _fg('¿Tiene deuda activa con Cashea?',_sel('wz_cashea_deuda','<option value="no">No</option><option value="si">Sí</option>','_wzToggleCasheaDeuda(this.value)')),
    _fg('Fecha último pago Cashea',_inp('wz_cashea_pago','date',''))
  )
  +'<div id="wz_cashea_deuda_det" style="display:none">'
  +_row2(
    _fg('Monto deuda actual (USD)',_inp('wz_cashea_monto','number','Ej: 350','_wzScore()')),
    _fg('Cuotas pendientes',_inp('wz_cashea_cuotas_pend','number','Ej: 4'))
  )+'</div>'
  +_s2('Historial de compras Cashea')
  +_row2(
    _fg('Último artículo comprado',_inp('wz_cashea_ultimo_art','text','Ej: Nevera LG, iPhone 13, TV Samsung...')),
    _fg('Monto último artículo (USD)',_inp('wz_cashea_ultimo_monto','number','Ej: 450'))
  )
  +_row2(
    _fg('Fecha de compra',_inp('wz_cashea_ultima_fecha','date','')),
    _fg('Total compras con Cashea',_sel('wz_cashea_total_compras','<option value="">—</option><option value="1">1 producto</option><option value="2-3">2 a 3 productos</option><option value="4-5">4 a 5 productos</option><option value="6+">6 o más</option>','_wzScore()'))
  )
  +_fg('Observaciones sobre Cashea',_inp('wz_cashea_obs','text','Ej: Cliente con buen historial, pagó iPhone sin atrasos...'))
  +'</div>'
  +_s('Referencias Personales')
  +'<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:12px;padding:12px;margin-bottom:10px">'
  +'<div style="font-size:11px;font-weight:700;color:var(--ink3);margin-bottom:10px">Referencia 1</div>'
  +_row2(_fg('Nombre',_inp('wz_r1n','text','Nombre y apellido')),_fg('Cédula',_inp('wz_r1ci','text','V-12345678','oninput="_wzCedulaInput(event)" autocapitalize="characters"')))
  +_row2(_fg('Teléfono',_inp('wz_r1t','tel','0412-0000000')),_fg('Relación',_sel('wz_r1r','<option>Familiar directo</option><option>Amigo/a</option><option>Colega</option><option>Vecino/a</option>')))
  +_row2(_fg('Observación',_inp('wz_r1obs','text','Notas...')),_fg('',''))
  +'</div>'
  +'<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:12px;padding:12px;margin-bottom:10px">'
  +'<div style="font-size:11px;font-weight:700;color:var(--ink3);margin-bottom:10px">Referencia 2</div>'
  +_row2(_fg('Nombre',_inp('wz_r2n','text','Nombre y apellido')),_fg('Cédula',_inp('wz_r2ci','text','V-12345678','oninput="_wzCedulaInput(event)" autocapitalize="characters"')))
  +_row2(_fg('Teléfono',_inp('wz_r2t','tel','0412-0000000')),_fg('Relación',_sel('wz_r2r','<option>Familiar directo</option><option>Amigo/a</option><option>Colega</option><option>Vecino/a</option>')))
  +_row2(_fg('Observación',_inp('wz_r2obs','text','Notas...')),_fg('',''))
  +'</div>'
  +_s('Fiador / Garante')
  +'<div style="margin-bottom:10px">'+_fg('¿Presenta fiador?',
    '<div style="display:flex;gap:8px">'
    +'<label style="flex:1;display:flex;align-items:center;gap:8px;background:var(--surf2);border:1.5px solid var(--rim);border-radius:10px;padding:10px 12px;cursor:pointer">'
    +'<input type="radio" name="wz_fiador" value="no" checked onchange="_wzToggleFiador(\'no\');_wzScore()" style="accent-color:var(--p1)"> Sin fiador</label>'
    +'<label style="flex:1;display:flex;align-items:center;gap:8px;background:var(--surf2);border:1.5px solid var(--rim);border-radius:10px;padding:10px 12px;cursor:pointer">'
    +'<input type="radio" name="wz_fiador" value="si" onchange="_wzToggleFiador(\'si\');_wzScore()" style="accent-color:var(--p1)"> Tiene fiador</label>'
    +'</div>'
  )+'</div>'
  +'<div id="wz_fiador_det" style="display:none">'
  +_row2(_fg('Nombre del fiador',_inp('wz_fiador_nom','text','Nombre y apellido')),_fg('Teléfono',_inp('wz_fiador_tel','tel','0412-0000000')))
  +_row2(_fg('Cédula del fiador',_inp('wz_fiador_ci','text','V-12345678','oninput="_wzCedulaInput(event)" autocapitalize="characters"')),_fg('RIF del fiador',_inp('wz_fiador_rif','text','J-12345678-9')))
  +_row2(_fg('Relación',_sel('wz_fiador_rel','<option value="familiar">Familiar directo</option><option value="conyuge">Cónyuge / pareja</option><option value="amigo">Amigo/a</option><option value="colega">Colega / socio</option>')),_fg('Correo del fiador',_inp('wz_fiador_email','email','correo@ejemplo.com')))
  +_row2(_fg('Dirección del fiador',_inp('wz_fiador_dir','text','Dirección completa...')),_fg('',''))
  +'</div>'
  +_s('Notas del Vendedor')
  +'<div style="margin-bottom:10px">'+_fg('Impresión general',
    '<div style="display:flex;gap:7px">'
    +[['Positiva ','positiva'],['Neutral ','neutral'],['Dudosa ','dudosa']].map(function(x){ return _chip(x[0],'wz_impresion_g',x[1],''); }).join('')
    +'</div>'
  )+'</div>'
  +'<div style="margin-bottom:6px">'+_fg('Observaciones adicionales','<textarea class="fta" id="wz_obs" rows="3" placeholder="Detalles de la visita, condiciones especiales, actitud del cliente..." style="min-height:80px;width:100%"></textarea>')+'</div>';
}

function _cliHydrate(){
  var ids=['wz_nom','wz_ci','wz_rif','wz_nacionalidad','wz_tel','wz_wa','wz_email','wz_ciudad','wz_emp','wz_ant','wz_ing','wz_ifam','wz_conocio','wz_estado','wz_ciudad_res','wz_dir_det','wz_dir_q','wz_tdir','wz_viv','wz_empresa','wz_cargo','wz_dir_trabajo','wz_tel_trabajo','wz_rem','wz_banco','wz_banco_nm','wz_banco_cobro','wz_cuenta','wz_ahorro','wz_cashea_nivel','wz_cashea_pago','wz_cashea_estado','wz_cashea_deuda','wz_cashea_monto','wz_cashea_cuotas_pend','wz_cashea_ultimo_art','wz_cashea_ultimo_monto','wz_cashea_ultima_fecha','wz_cashea_total_compras','wz_cashea_obs','wz_r1n','wz_r1ci','wz_r1t','wz_r1r','wz_r1obs','wz_r2n','wz_r2ci','wz_r2t','wz_r2r','wz_r2obs','wz_fiador_nom','wz_fiador_tel','wz_fiador_ci','wz_fiador_rif','wz_fiador_dir','wz_fiador_email','wz_fiador_rel','wz_obs'];
  ids.forEach(function(id){ var el=document.getElementById(id); if(el && WZ[id]!=null) el.value=WZ[id]; });
  ['wz_emp','wz_ant','wz_conocio','wz_estado','wz_tdir','wz_viv','wz_rem','wz_banco','wz_banco_cobro','wz_ahorro','wz_cashea_nivel','wz_cashea_estado','wz_cashea_deuda','wz_cashea_total_compras','wz_r1r','wz_r2r','wz_fiador_rel','wz_uso','wz_plan_mode','wz_apy_inicial_sel'].forEach(function(id){ var el=document.getElementById(id); if(el && WZ[id]!=null && WZ[id]!=='') el.value=WZ[id]; });
  var cashea = WZ.cashea||'no';
  var casheaRadio=document.querySelector('input[name="wz_cashea"][value="'+cashea+'"]'); if(casheaRadio) casheaRadio.checked=true; _wzToggleCashea(cashea); if(WZ.cashea_deuda==='si') _wzToggleCasheaDeuda('si');
  var fiador = WZ.fiador_tiene||'no';
  var fiadorRadio=document.querySelector('input[name="wz_fiador"][value="'+fiador+'"]'); if(fiadorRadio) fiadorRadio.checked=true; _wzToggleFiador(fiador);
  function pick(group,val){ if(!val) return; var container=document.getElementById(group); if(container){ Array.from(container.children).forEach(function(el){ if((el.getAttribute('onclick')||'').indexOf("'"+val+"'")>=0) _wzChip(el,group,val); }); } }
  pick('wz_emp_g', WZ.emp||WZ['_chip_wz_emp_g']);
  pick('wz_hist_g', WZ.hist||WZ['_chip_wz_hist_g']);
  pick('wz_deuda_g', WZ.deuda||WZ['_chip_wz_deuda_g']);
  pick('wz_impresion_g', WZ.impresion||WZ['_chip_wz_impresion_g']);
  pick('wz_dep_g', String(WZ.dep||WZ['_chip_wz_dep_g']||''));
  _wzScore();
}

function _cliCollectStep(step){
  var g=function(id){ var el=document.getElementById(id); return el?el.value.trim():''; };
  if(step===1){
    WZ.nom = WZ.wz_nom = g('wz_nom');
    WZ.ci = WZ.wz_ci = _wzFmtCedula(g('wz_ci'));
    WZ.rif = WZ.wz_rif = g('wz_rif');
    WZ.nacionalidad = WZ.wz_nacionalidad = g('wz_nacionalidad');
    WZ.tel = WZ.wz_tel = g('wz_tel');
    WZ.wa = WZ.wz_wa = g('wz_wa');
    WZ.email = WZ.wz_email = g('wz_email');
    WZ.ciudad = WZ.wz_ciudad = g('wz_ciudad');
    WZ.emp = WZ.wz_emp = g('wz_emp');
    WZ.ant = WZ.wz_ant = g('wz_ant');
    WZ.ing = WZ.wz_ing = parseFloat((document.getElementById('wz_ing')||{}).value)||0;
    WZ.ifam = WZ.wz_ifam = parseFloat((document.getElementById('wz_ifam')||{}).value)||0;
    WZ.conocio = WZ.wz_conocio = g('wz_conocio');
  }
  if(step===2){
    WZ.obs = WZ.wz_obs = g('wz_obs');
    WZ.viv = WZ.wz_viv = g('wz_viv');
    WZ.terremoto = WZ.wz_terremoto = g('wz_terremoto');
    WZ.terremotoDanos = WZ.wz_terremoto_danos = g('wz_terremoto_danos');
    WZ.tdir = WZ.wz_tdir = g('wz_tdir');
    WZ.estado_ubi = WZ.wz_estado = g('wz_estado');
    WZ.ciudad_res = WZ.wz_ciudad_res = g('wz_ciudad_res');
    WZ.dir_det = WZ.wz_dir_det = g('wz_dir_det');
    WZ.dir_q = WZ.wz_dir_q = g('wz_dir_q');
    WZ.emp = _wzChipVal('wz_emp_g')||g('wz_emp')||WZ.emp||'';
    WZ.empresa = WZ.wz_empresa = g('wz_empresa');
    WZ.cargo = WZ.wz_cargo = g('wz_cargo');
    WZ.dir_trabajo = WZ.wz_dir_trabajo = g('wz_dir_trabajo');
    WZ.tel_trabajo = WZ.wz_tel_trabajo = g('wz_tel_trabajo');
    WZ.ing = parseFloat(g('wz_ing'))||WZ.ing||0;
    WZ.ifam = parseFloat(g('wz_ifam'))||WZ.ifam||0;
    WZ.ant = g('wz_ant')||WZ.ant||'';
    WZ.rem = WZ.wz_rem = g('wz_rem');
    WZ.dep = parseInt(_wzChipVal('wz_dep_g')||0);
    WZ.hist = _wzChipVal('wz_hist_g')||'ninguno';
    WZ.deuda = _wzChipVal('wz_deuda_g')||'no';
    WZ.banco = WZ.wz_banco = g('wz_banco');
    WZ.banco_nm = WZ.wz_banco_nm = g('wz_banco_nm');
    WZ.banco_cobro = WZ.wz_banco_cobro = g('wz_banco_cobro');
    WZ.cuenta = WZ.wz_cuenta = g('wz_cuenta');
    WZ.ahorro = WZ.wz_ahorro = g('wz_ahorro');
    WZ.cashea = (document.querySelector('input[name="wz_cashea"]:checked')||{value:'no'}).value;
    WZ.cashea_nivel = WZ.wz_cashea_nivel = g('wz_cashea_nivel');
    WZ.cashea_pago = WZ.wz_cashea_pago = g('wz_cashea_pago');
    WZ.cashea_estado = WZ.wz_cashea_estado = g('wz_cashea_estado');
    WZ.cashea_deuda = WZ.wz_cashea_deuda = g('wz_cashea_deuda');
    WZ.cashea_monto = WZ.wz_cashea_monto = g('wz_cashea_monto');
    WZ.cashea_cuotas_pend = WZ.wz_cashea_cuotas_pend = g('wz_cashea_cuotas_pend');
    WZ.cashea_ultimo_art = WZ.wz_cashea_ultimo_art = g('wz_cashea_ultimo_art');
    WZ.cashea_ultimo_monto = WZ.wz_cashea_ultimo_monto = g('wz_cashea_ultimo_monto');
    WZ.cashea_ultima_fecha = WZ.wz_cashea_ultima_fecha = g('wz_cashea_ultima_fecha');
    WZ.cashea_total_compras = WZ.wz_cashea_total_compras = g('wz_cashea_total_compras');
    WZ.cashea_obs = WZ.wz_cashea_obs = g('wz_cashea_obs');
    WZ.fiador_tiene = (document.querySelector('input[name="wz_fiador"]:checked')||{value:'no'}).value;
    WZ.fiador_nom = WZ.wz_fiador_nom = g('wz_fiador_nom');
    WZ.fiador_tel = WZ.wz_fiador_tel = g('wz_fiador_tel');
    WZ.fiador_ci = WZ.wz_fiador_ci = _wzFmtCedula(g('wz_fiador_ci'));
    WZ.fiador_rif = WZ.wz_fiador_rif = g('wz_fiador_rif');
    WZ.fiador_dir = WZ.wz_fiador_dir = g('wz_fiador_dir');
    WZ.fiador_email = WZ.wz_fiador_email = g('wz_fiador_email');
    WZ.fiador_rel = WZ.wz_fiador_rel = g('wz_fiador_rel');
    WZ.r1n = WZ.wz_r1n = g('wz_r1n'); WZ.r1ci = WZ.wz_r1ci = _wzFmtCedula(g('wz_r1ci')); WZ.r1t = WZ.wz_r1t = g('wz_r1t'); WZ.r1r = WZ.wz_r1r = g('wz_r1r'); WZ.r1obs = WZ.wz_r1obs = g('wz_r1obs');
    WZ.r2n = WZ.wz_r2n = g('wz_r2n'); WZ.r2ci = WZ.wz_r2ci = _wzFmtCedula(g('wz_r2ci')); WZ.r2t = WZ.wz_r2t = g('wz_r2t'); WZ.r2r = WZ.wz_r2r = g('wz_r2r'); WZ.r2obs = WZ.wz_r2obs = g('wz_r2obs');
    WZ.impresion = _wzChipVal('wz_impresion_g')||'';
  }
}

function _cliValidar(step){
  _cliCollectStep(step);
  if(step===1){
    if(!WZ.nom){ toast('El nombre es obligatorio','error'); return false; }
    if(!WZ.ci){ toast('La cédula es obligatoria','error'); return false; }
    if(!WZ.tel){ toast('El teléfono es obligatorio','error'); return false; }
    if(!WZ.emp){ toast('Selecciona el tipo de empleo','error'); return false; }
    if((parseFloat(WZ.ing)||0)<=0){ toast('El ingreso mensual es obligatorio','error'); return false; }
  }
  _wzScore();
  return true;
}

function _cliRender(){
  var overlay=document.getElementById('wz-overlay');
  if(!overlay){ overlay=document.createElement('div'); overlay.id='wz-overlay'; overlay.style.cssText='position:fixed;inset:0;z-index:2000;background:var(--bg);overflow-y:auto;display:none'; document.body.appendChild(overlay); }
  overlay.style.display='block';
  document.body.style.overflow='hidden';
  var stepsTpl = ['① Cliente','② Perfil'].map(function(l,i){
    var on=WZ.step===i+1, done=WZ.step>i+1;
    return '<div style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:'+(on?'700':'500')+';color:'+(on?'var(--p1)':done?'var(--green)':'var(--ink3)')+'">'
      +'<div style="width:20px;height:20px;border-radius:50%;background:'+(on?'var(--p1)':done?'var(--green)':'var(--rim2)')+';color:'+(on||done?'#fff':'var(--ink3)')+';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0">'+(done?'✓':(i+1))+'</div>'
      +'<span style="white-space:nowrap">'+l.slice(2)+'</span></div>' + (i<1?'<div style="height:1px;background:var(--rim);flex:1;min-width:8px"></div>':'');
  }).join('');
  var current = WZ.step===1 ? _cliStep1() : _cliStep2();
  var btnBack = WZ.step>1
    ? '<button onclick="_cliPrev()" style="padding:11px 20px;border-radius:12px;border:1.5px solid var(--rim);background:var(--surf2);color:var(--ink2);font-family:var(--f);font-weight:700;font-size:13px;cursor:pointer">← Atrás</button>'
    : '<button onclick="_wzClose()" style="padding:11px 20px;border-radius:12px;border:1.5px solid var(--rim);background:var(--surf2);color:var(--ink2);font-family:var(--f);font-weight:700;font-size:13px;cursor:pointer">Cancelar</button>';
  var btnNext = WZ.step<2
    ? '<button onclick="_cliNext()" style="padding:11px 24px;border-radius:12px;background:var(--p1);color:#fff;font-family:var(--f);font-weight:700;font-size:13px;border:none;cursor:pointer;box-shadow:0 2px 10px rgba(37,99,235,.25)">Siguiente →</button>'
    : '<button onclick="_cliGuardar()" style="padding:11px 24px;border-radius:12px;background:var(--green);color:#fff;font-family:var(--f);font-weight:700;font-size:13px;border:none;cursor:pointer"> Guardar Cliente</button>';
  overlay.innerHTML = '<div style="max-width:1180px;margin:0 auto;padding:26px 20px 34px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:14px;flex-wrap:wrap">'
    + '<div style="display:flex;align-items:center;gap:12px">'
    + '<button onclick="_wzClose()" style="width:40px;height:40px;border-radius:12px;border:1.5px solid var(--rim);background:var(--surf2);cursor:pointer;font-size:18px">←</button>'
    + '<div style="flex:1"><div style="font-size:15px;font-weight:800;letter-spacing:-.3px">'+(WZ.clienteEditId?'Editar Cliente':'Nuevo Cliente')+'</div><div style="font-size:11px;color:var(--ink3)">Paso '+WZ.step+' de 2</div></div>'
    + '</div>'
    + '<div data-wz-header style="display:flex;align-items:center;justify-content:flex-end;min-height:44px">'+_cliScorePill()+'</div>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:18px">'+stepsTpl+'</div>'
    + '<div style="background:var(--surf);border:1.5px solid var(--rim);border-radius:20px;padding:20px 18px 16px;box-shadow:0 2px 8px rgba(0,0,0,.04)">'
    + '<div style="font-size:12px;color:var(--ink3);margin-bottom:18px">'+['Información personal y laboral','Perfil crediticio y CrediScore'][WZ.step-1]+'</div>'
    + current
    + '<div style="display:flex;justify-content:space-between;gap:10px;margin-top:22px">'+btnBack+btnNext+'</div>'
    + '</div></div>';
  _cliHydrate();
}

function _cliNext(){ if(!_cliValidar(WZ.step)) return; WZ.step=Math.min(2,WZ.step+1); _cliRender(); }
function _cliPrev(){ _cliCollectStep(WZ.step); WZ.step=Math.max(1,WZ.step-1); _cliRender(); }

function _cliGuardar(){
  if(!_cliValidar(WZ.step)) return;
  var edId=WZ.clienteEditId;
  var cedNorm=(WZ.ci||'').replace(/\s/g,'').toLowerCase();
  var dup=(S.clientes||[]).find(function(x){ return !x.eliminado && x.cedula && x.cedula.replace(/\s/g,'').toLowerCase()===cedNorm && String(x.id)!==String(edId||''); });
  if(dup){ toast(' Ya existe un cliente con esa cédula: '+dup.nombre,'error'); return; }
  nextClienteIdAsync().then(function(_nextCliId){
  var obj={
    id: edId || _nextCliId,
    nombre: WZ.nom||'',
    cedula: WZ.ci||'',
    rif: WZ.rif||'',
    nacionalidad: WZ.nacionalidad||'',
    tel: WZ.tel||'',
    wa: WZ.wa||WZ.tel||'',
    email: WZ.email||'',
    ciudad: WZ.ciudad_res||WZ.ciudad||'',
    estado_ubi: WZ.estado_ubi||'',
    dir: WZ.dir_det||'',
    trabajo: WZ.emp||'',
    empresa: WZ.empresa||'',
    cargo: WZ.cargo||'',
    dir_trabajo: WZ.dir_trabajo||'',
    tel_trabajo: WZ.tel_trabajo||'',
    ingreso: WZ.ing||0,
    ingreso_familiar: WZ.ifam||0,
    antiguedad: WZ.ant||'',
    remesas: WZ.rem||'no',
    dependientes: WZ.dep||0,
    vivienda: WZ.viv||'',
    tiempo_dir: WZ.tdir||'',
    terremoto_afectado: WZ.terremoto||'no',
    terremoto_danos: (WZ.terremoto==='si') ? (WZ.terremotoDanos||'leves') : '',
    historial: WZ.hist||'',
    deudas: WZ.deuda||'',
    banco_estado: WZ.banco||'',
    banco_nombre: WZ.banco_nm||'',
    banco_cobro: WZ.banco_cobro||'',
    cuenta_digitos: WZ.cuenta||'',
    ahorro: WZ.ahorro||'',
    cashea: WZ.cashea||'no',
    cashea_nivel: WZ.cashea_nivel||'',
    cashea_pago: WZ.cashea_pago||'',
    cashea_estado: WZ.cashea_estado||'',
    cashea_deuda: WZ.cashea_deuda||'no',
    cashea_monto: parseFloat(WZ.cashea_monto)||0,
    cashea_cuotas_pend: parseInt(WZ.cashea_cuotas_pend)||0,
    cashea_ultimo_art: WZ.cashea_ultimo_art||'',
    cashea_ultimo_monto: parseFloat(WZ.cashea_ultimo_monto)||0,
    cashea_ultima_fecha: WZ.cashea_ultima_fecha||'',
    cashea_total_compras: WZ.cashea_total_compras||'',
    cashea_obs: WZ.cashea_obs||'',
    fiador: WZ.fiador_tiene||'no',
    fiador_nom: WZ.fiador_nom||'',
    fiador_tel: WZ.fiador_tel||'',
    fiador_ci: WZ.fiador_ci||'',
    fiador_rif: WZ.fiador_rif||'',
    fiador_dir: WZ.fiador_dir||'',
    fiador_email: WZ.fiador_email||'',
    fiador_rel: WZ.fiador_rel||'',
    ref1:{nom:WZ.r1n||'',ci:WZ.r1ci||'',tel:WZ.r1t||'',rel:WZ.r1r||'',obs:WZ.r1obs||''},
    ref2:{nom:WZ.r2n||'',ci:WZ.r2ci||'',tel:WZ.r2t||'',rel:WZ.r2r||'',obs:WZ.r2obs||''},
    docs_count: WZ.docsCount||0,
    documentos: _wzGetClientDocsArray(),
    impresion: WZ.impresion||'',
    notas: WZ.obs||'',
    conocio: WZ.conocio||'',
    score_indexa: WZ.score||0,
    f1:WZ.f1||0, f2:WZ.f2||0, f3:WZ.f3||0, f4:WZ.f4||0, f5:WZ.f5||0,
    estado: 'activo',
    creado: (edId && (S.clientes||[]).find(function(x){return String(x.id)===String(edId);}) && (S.clientes||[]).find(function(x){return String(x.id)===String(edId);}).creado) || new Date().toISOString()
  };
  var idx=(S.clientes||[]).findIndex(function(x){ return String(x.id)===String(obj.id); });
  var _oldNombre = (idx>=0 && S.clientes[idx]) ? (S.clientes[idx].nombre||'') : '';
  if(idx>=0){
    obj.editadoEn = new Date().toISOString();
    obj.editadoPor = (S.currentUser&&S.currentUser.nombre)||'Admin';
    obj.editadoPorUid = (S.currentUser&&S.currentUser.uid)||'';
    // Preservar concesionarioId existente al editar
    if(S.clientes[idx].concesionarioId !== undefined) obj.concesionarioId = S.clientes[idx].concesionarioId;
    S.clientes[idx]=Object.assign({}, S.clientes[idx], obj);
  } else {
    obj.concesionarioId = _concDefaultId();
    S.clientes.push(obj);
  }
  DB.saveCliente(obj);
  // ── ROOT FIX: propagar el nombre del cliente a sus créditos y motos ──
  // Créditos y motos guardan el nombre del cliente como copia (el sistema enlaza
  // por nombre: cr.cli === cliente.nombre). Si al renombrar no se propaga, el
  // crédito se "desengancha" y su moto se ve mal / se agarra la de otro cliente.
  // Se empareja por clienteId (estable) y, para créditos viejos sin él, por el
  // nombre anterior.
  if(idx>=0){
    try{
      var _nuevoNom = obj.nombre||'';
      (S.creds||[]).forEach(function(cr){
        if(!cr || cr.eliminado) return;
        var _pertenece = (cr.clienteId!=null && String(cr.clienteId)===String(obj.id))
                      || (_oldNombre && cr.cli===_oldNombre && (cr.clienteId==null || String(cr.clienteId)===''));
        if(_pertenece && cr.cli!==_nuevoNom){
          cr.cli=_nuevoNom;
          if(DB.updateCred) DB.updateCred(cr.id,{cli:_nuevoNom});
          if(cr.motoId!=null && String(cr.motoId)!==''){
            var _mi=(S.motos||[]).findIndex(function(m){return m && String(m.id)===String(cr.motoId);});
            if(_mi>=0 && S.motos[_mi].cliente!==_nuevoNom){ S.motos[_mi].cliente=_nuevoNom; if(DB.saveMoto) DB.saveMoto(S.motos[_mi]); }
          }
        }
      });
    }catch(_e){ console.warn('sync nombre cliente→créditos:', _e&&_e.message); }
  }
  if(typeof logActividad==='function') logActividad(idx>=0?'cliente_editado':'cliente_creado','clientes',String(obj.id),{nombre:obj.nombre, cedula:obj.cedula||'', estado:obj.estado});
  _wzClose();
  nav('clientes');
  toast(idx>=0?'Cliente actualizado':'Cliente registrado','success');
  }); // end nextClienteIdAsync
}

function openAddCliente(id=null){
  var c=id?(S.clientes||[]).find(function(x){return String(x.id)===String(id);}):null;
  _cliInitFromCliente(c||null);
  _cliRender();
}
function editCliente(id){openAddCliente(id);}
function delCliente(id){
  if(!requireDeletePermission()) return;
  const c=S.clientes.find(x=>x.id===id);if(!c)return;
  if(S.creds.some(cr=>cr.cli===c.nombre&&cr.estado==='activo')){toast('No puedes eliminar un cliente con crédito activo','error');return;}
  confirmarEliminacion({titulo:'Eliminar Cliente',descripcion:'¿Eliminar a '+c.nombre+'?',onConfirm:function(audit){Object.assign(c,audit);DB.saveCliente(c);if(typeof logActividad==='function') logActividad('cliente_eliminado','clientes',String(c.id),{nombre:c.nombre});nav('clientes');toast('Cliente eliminado','info');}});
}

function restaurarCliente(id){
  const c=S.clientes.find(x=>x.id===id);
  if(!c||!c.eliminado){toast('Cliente no encontrado o no está eliminado','error');return;}
  if(!confirm('¿Restaurar al cliente '+c.nombre+' al sistema?')) return;
  delete c.eliminado;
  delete c.eliminadoPor;
  delete c.eliminadoPorUid;
  delete c.eliminadoEn;
  delete c.eliminadoRazon;
  DB.saveCliente(c);
  nav('clientes');
  toast('Cliente '+c.nombre+' restaurado al sistema','success');
}
window.restaurarCliente=restaurarCliente;
