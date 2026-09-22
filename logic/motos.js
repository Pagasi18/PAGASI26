// Logica de motos e inventario.
// Extraido de assets/pagasi-app.js sin cambiar comportamiento financiero.
// Los helpers compartidos de pago de compra permanecen en el nucleo por ahora.

function motoEsc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});
}

function creditoAsignadoMoto(m){
  if(!m) return null;
  var lista = Array.isArray(S.creds) ? S.creds : [];
  var directId = m.creditoId || m.credId || '';
  if(directId){
    var directo = lista.find(function(c){return c && !c.eliminado && String(c.id)===String(directId);});
    if(directo) return directo;
  }
  return lista.find(function(c){
    return c && !c.eliminado && String(c.motoId)===String(m.id) && esCreditoVigenteParaInventario(c);
  }) || null;
}

function motoRow(m){
  const estadoBdg={disponible:'b-g',financiada:'b-p',recuperada:'b-a',inventario:'b-b'};
  const estadoStyle={
    disponible:'background:rgba(16,185,129,.12);color:#059669;border:1px solid rgba(16,185,129,.28)',
    financiada:'background:rgba(37,99,235,.12);color:#2563eb;border:1px solid rgba(37,99,235,.28)',
    recuperada:'background:rgba(244,63,94,.12);color:#e11d48;border:1px solid rgba(244,63,94,.28)',
    inventario:'background:rgba(100,116,139,.14);color:#475569;border:1px solid rgba(100,116,139,.28)'
  };
  const estadoOpts=['disponible','financiada','recuperada','inventario'];
  var idArg = JSON.stringify(m.id);
  var cliente = m.cliente || m.propietario || '';
  var cred = creditoAsignadoMoto(m);
  var credArg = cred ? JSON.stringify(cred.id) : '';
  var avance = '';
  if(cred && typeof getCreditoCuotasPagadas==='function' && typeof getCreditoTotalCuotas==='function'){
    avance = getCreditoCuotasPagadas(cred)+'/'+getCreditoTotalCuotas(cred)+' cuotas';
  }else if(cred){
    avance = cred.estado || 'activo';
  }
  return `<tr id="mc-${motoEsc(m.id)}">
    <td>
      <div class="tdm">${motoEsc(m.modelo||'Sin modelo')}${m.anio?` <span style="font-size:10px;color:var(--ink3);font-weight:700">${motoEsc(m.anio)}</span>`:''}</div>
      <div class="tds"><span style="font-weight:800;color:var(--ink2)">${motoEsc(motoNum(m))}</span> · VIN ${motoEsc(m.vin||'-')}${m.color?' - '+motoEsc(m.color):''}</div>
    </td>
    <td>${cred?`<button class="btn btn-g btn-xs" onclick="event.stopPropagation();openAmort(${credArg})">${motoEsc(cred.id||'Credito')}</button><div class="tds">${motoEsc(avance)}</div>`:'<span style="color:var(--ink3);font-size:11px">-</span>'}</td>
    <td>${cliente?`<span class="bdg b-p">${motoEsc(cliente)}</span>`:'<span style="color:var(--ink3);font-size:11px">-</span>'}</td>
    <td class="tds">${motoEsc(m.marca||'-')}</td>
    <td>
      <select class="bdg ${estadoBdg[m.estado]||'b-g'}" onchange="changeMotoStatus(${idArg},this.value)" title="Cambiar estado" style="cursor:pointer;font-weight:800;font-size:10px;${estadoStyle[m.estado]||estadoStyle.disponible}">
        ${estadoOpts.map(function(o){return `<option value="${o}" ${m.estado===o?'selected':''}>${o}</option>`;}).join('')}
      </select>
    </td>
    <td><div class="tdm">${fmt(m.precio)}</div><div class="tds">Inicial ${fmt(m.ini)}</div></td>
    <td><div class="tdm" style="color:var(--p1)">${fmt(m.cuotaM)}</div><div class="tds">${fmt(m.cuotaQ)} quincenal</div></td>
    <td><div class="tdm">${fmt(m.totalPagado)}</div><div class="tds">total plan</div></td>
    <td onclick="event.stopPropagation()">
      <div style="display:flex;gap:4px;justify-content:flex-end;flex-wrap:wrap">
        ${m.estado==='disponible'?`<button class="btn btn-p btn-xs" onclick="openAddCredConMoto(${idArg})">Solicitud</button>`:''}
        <button class="btn btn-g btn-xs" onclick="editMoto(${idArg})">Editar</button>
        <button class="btn btn-d btn-xs" onclick="delMoto(${idArg})">x</button>
      </div>
    </td>
  </tr>`;
}

function changeMotoStatus(id, newStatus){
  const idx = S.motos.findIndex(m=>String(m.id)===String(id));
  if(idx<0) return;
  S.motos[idx].estado = newStatus;
  DB.saveMoto(S.motos[idx]);
  toast(`Estado cambiado a "${newStatus}"`, 'success');
  // re-render just if filtering
  const g=$('mgr');
  if(g) g.innerHTML=renderMotoGrid();
}

function esCreditoVigenteParaInventario(c){
  if(!c || c.eliminado) return false;
  var st = String(c.estado||'activo').toLowerCase();
  // recuperado/rechazado: la moto volvio a Pagasi o nunca salio (antes la marcaba
  // "financiada" con el cliente anterior cada vez que se abria Inventario; punto 6, 18-sep)
  return !['cancelado','liquidado','cerrado','anulado','archivado','eliminado','recuperado','recuperada','rechazado','rechazada'].includes(st);
}

function sincronizarInventarioConCreditos(opts){
  opts = opts || {};
  if(!S || !Array.isArray(S.motos) || !Array.isArray(S.creds)) return;
  var usados = {};
  S.creds.forEach(function(c){
    if(!esCreditoVigenteParaInventario(c) || c.motoId==null || c.motoId==='') return;
    usados[String(c.motoId)] = c;
  });
  S.motos.forEach(function(m){
    if(!m || m.eliminado) return;
    var c = usados[String(m.id)];
    if(c && m.estado !== 'financiada'){
      m.estado = 'financiada';
      m.cliente = c.cli || c.cliente || m.cliente || null;
      if(!m.vin && c.vin) m.vin = c.vin;
      if(!m.color && c.color) m.color = c.color;
      if(!m.placa && c.placa) m.placa = c.placa;
      if(opts.save && DB && DB.saveMoto) DB.saveMoto(m);
    }
  });
}

function renderMotoGrid(){
  sincronizarInventarioConCreditos({save:true});
  const f=S.mTab;
  var _M = _concFiltrar(S.motos||[]);
  const fil = f==='todas'?_M.filter(m=>!m.eliminado):_M.filter(m=>!m.eliminado&&m.estado===f);
  var sort=S.motosSort||{col:'modelo',dir:'asc'};
  var sorted=fil.slice().sort(function(a,b){
    var dir=sort.dir==='desc'?-1:1, col=sort.col||'modelo', va, vb;
    if(col==='precio'||col==='cuotaM'||col==='totalPagado'||col==='anio') return dir*((parseFloat(a[col]||0)||0)-(parseFloat(b[col]||0)||0));
    if(col==='cliente'){ va=String(a.cliente||a.propietario||'').toLowerCase(); vb=String(b.cliente||b.propietario||'').toLowerCase(); return dir*(va<vb?-1:va>vb?1:0); }
    if(col==='credito'){ var ca=creditoAsignadoMoto(a), cb=creditoAsignadoMoto(b); va=String(ca&&ca.id||'').toLowerCase(); vb=String(cb&&cb.id||'').toLowerCase(); return dir*(va<vb?-1:va>vb?1:0); }
    va=String(a[col]||'').toLowerCase(); vb=String(b[col]||'').toLowerCase();
    return dir*(va<vb?-1:va>vb?1:0);
  });
  return sorted.length?`<div class="card" style="margin-bottom:14px">
    <div class="ch"><div><div class="ct">Listado de motocicletas</div><div class="cs">${sorted.length} unidad${sorted.length!==1?'es':''} - ${f==='todas'?'todos los estados':f}</div></div></div>
    <div class="tw tw-compact"><table>
      <thead><tr>
        ${_thSort(S.motosSort||{col:'modelo',dir:'asc'},'setMotosSort','modelo','Motocicleta')}
        ${_thSort(S.motosSort||{col:'modelo',dir:'asc'},'setMotosSort','credito','Credito')}
        ${_thSort(S.motosSort||{col:'modelo',dir:'asc'},'setMotosSort','cliente','Cliente')}
        ${_thSort(S.motosSort||{col:'modelo',dir:'asc'},'setMotosSort','marca','Marca')}
        ${_thSort(S.motosSort||{col:'modelo',dir:'asc'},'setMotosSort','estado','Estado')}
        ${_thSort(S.motosSort||{col:'modelo',dir:'asc'},'setMotosSort','precio','Precio')}
        ${_thSort(S.motosSort||{col:'modelo',dir:'asc'},'setMotosSort','cuotaM','Cuotas')}
        ${_thSort(S.motosSort||{col:'modelo',dir:'asc'},'setMotosSort','totalPagado','Total')}
        <th></th>
      </tr></thead>
      <tbody>${sorted.map(motoRow).join('')}</tbody>
    </table></div>
  </div>`:
    `<div class="empty"><span class="e-ic">MOT</span><div class="e-tt">Sin motos en esta categoria</div></div>`;
}

// Bloque de motos eliminadas con opción de restaurarlas

function renderMotosEliminadasBloque(){
  var eliminadas = _concFiltrar((S.motos||[])).filter(function(m){return m.eliminado;});
  if(!eliminadas.length) return '';
  return '<div style="margin-top:18px;padding:12px 14px;background:var(--surf2);border-radius:10px;border:1px solid rgba(240,75,106,0.25)">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    +'<div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--red);letter-spacing:.4px">Motos eliminadas ('+eliminadas.length+')</div>'
    +'<button class="btn btn-s btn-xs" onclick="restaurarTodasLasMotosEliminadas()" title="Reactivar todas las motos eliminadas">⟲ Restaurar todas</button>'
    +'</div>'
    + eliminadas.map(function(m){
        var fecha = m.eliminadoEn ? m.eliminadoEn.split('T')[0] : '';
        return '<div style="display:flex;align-items:center;gap:10px;padding:7px 6px;border-bottom:1px solid var(--rim)">'
          +'<div style="flex:1">'
          + '<div style="font-size:12.5px;font-weight:700;opacity:.75;text-decoration:line-through">'+(m.modelo||'—')+'</div>'
          + '<div style="font-size:10.5px;color:var(--ink3)">'+motoNum(m)+' · VIN: '+(m.vin||'—')+' · por '+(m.eliminadoPor||'Admin')+(fecha?' · '+fecha:'')+(m.eliminadoRazon?' · '+m.eliminadoRazon:'')+'</div>'
          +'</div>'
          +'<button class="btn btn-s btn-xs" onclick="restaurarMoto(\''+m.id+'\')" title="Volver a activar esta moto">⟲ Restaurar</button>'
          +'</div>';
      }).join('')
    +'</div>';
}

function filterMotos(q){
  var _M = _concFiltrar(S.motos||[]);
  const f = q?_M.filter(function(m){
    var cr = creditoAsignadoMoto(m);
    return `${m.modelo} ${m.vin} ${m.cliente||''} ${m.creditoId||''} ${cr&&cr.id||''} ${cr&&(cr.cli||cr.cliente)||''}`.toLowerCase().includes(q.toLowerCase());
  }):_M.filter(m=>!m.eliminado&&(S.mTab==='todas'?true:m.estado===S.mTab));
  const g=$('mgr');
  var elimHTML=_M.filter(m=>m.eliminado).length
  ?'<div style="margin-top:14px;padding:10px 12px;background:var(--surf2);border-radius:10px;border:1px solid rgba(240,75,106,0.2)">'+'<div style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--red);margin-bottom:6px">Motos eliminadas</div>'+_M.filter(m=>m.eliminado).map(function(m){return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--rim)">'+'<div style="flex:1"><span style="font-size:12px;font-weight:700;opacity:0.6;text-decoration:line-through">'+motoEsc(m.modelo)+'</span>'+'<span style="font-size:10px;color:var(--ink3);margin-left:6px">'+motoEsc(m.vin)+'</span></div>'+'<span style="font-size:10px;color:var(--red)">Del '+motoEsc(m.eliminadoPor||'Admin')+'</span>'+'<span style="font-size:10px;color:var(--ink3)">'+( m.eliminadoRazon?' - '+motoEsc(m.eliminadoRazon):'')+'</span>'+'<span style="font-size:10px;color:var(--ink3)">'+( m.eliminadoEn?' - '+motoEsc(m.eliminadoEn.split('T')[0]):'')+'</span>'+'</div>';}).join('')+'</div>':'';
  if(g) g.innerHTML=(f.length?`<div class="card" style="margin-bottom:14px"><div class="ch"><div><div class="ct">Listado de motocicletas</div><div class="cs">${f.length} resultado${f.length!==1?'s':''}</div></div></div><div class="tw tw-compact"><table><thead><tr><th>Motocicleta</th><th>Credito</th><th>Cliente</th><th>Marca</th><th>Estado</th><th>Precio</th><th>Cuotas</th><th>Total</th><th></th></tr></thead><tbody>${f.map(motoRow).join('')}</tbody></table></div></div>`:`<div class="empty"><span class="e-ic">MOT</span><div class="e-tt">Sin resultados para "${motoEsc(q)}"</div></div>`)+elimHTML;
}

// PAGO DE COMPRA DE MOTO — helpers compartidos
// (usado al crear moto en módulo Motocicletas y
//  al elegir moto del catálogo en wizard de crédito)
// ══════════════════════════════════════════
var _MPAGO_PREFIX = 'mpago';

function openAddMoto(id=null){
  const m=id?S.motos.find(x=>String(x.id)===String(id)):null,ed=!!m;
  setMicon('moto');
  $('mtt').textContent=ed?'Editar Moto':'Nueva Unidad al Inventario';
  $('msb').textContent=ed?m.modelo:'Unidad física — VIN, color, estado';
  $('modal-box').className='modal';
  $('mbd').innerHTML=`
    <div class="fsec">Modelo (del catálogo)</div>
    <div class="fgr">
      <div class="fg"><label>Modelo *</label>
        <select class="fs" id="m_mod_sel" onchange="onCatalogoSelect(this)">
          <option value="">— Seleccionar del catálogo —</option>
          ${CATALOGO.map(c=>`<option value="${c.modelo}" data-precio="${c.precio}" ${(m&&m.modelo)===c.modelo?'selected':''}>${c.modelo} — $${c.precio.toLocaleString('es')}</option>`).join('')}
          <option value="__custom__" ${(m&&!CATALOGO.find(c=>c.modelo===m.modelo))?'selected':''}>＋ Agregar nueva moto al catálogo...</option>
        </select>
      </div>
      <div class="fg"><label>Precio USD *</label><input class="fi" id="m_pr" type="number" value="${(m&&m.precio)||''}" placeholder="0.00" oninput="previewCalc()" ${(m&&CATALOGO.find(c=>c.modelo===m.modelo))?'readonly':''}></div>
    </div>
    <div id="m_custom_div" style="display:${(m&&!CATALOGO.find(c=>c.modelo===m.modelo))?'block':'none'};margin-bottom:8px;background:var(--surf2);border:1px solid var(--rim);border-radius:var(--r8);padding:12px">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--p1);margin-bottom:8px">Nueva moto al catálogo</div>
      <div class="fgr">
        <div class="fg"><label>Marca *</label><input class="fi" id="m_mod_cat_marca" value="" placeholder="Ej: Empire, Bera..."></div>
        <div class="fg"><label>Modelo *</label><input class="fi" id="m_mod_custom" value="${(m&&!CATALOGO.find(c=>c.modelo===m.modelo))?m.modelo:''}" placeholder="Ej: NEW HORSE 150"></div>
        <div class="fg"><label>Precio catálogo USD *</label><input class="fi" id="m_mod_cat_precio" type="number" placeholder="0.00" oninput="var pr=$('m_pr');if(pr&&!pr.readOnly)pr.value=this.value;"></div>
      </div>
      <div style="font-size:11px;color:var(--ink3);margin-top:6px">Esta moto se guardará en el catálogo y quedará disponible para futuras unidades.</div>
    </div>
    <div style="background:var(--surf);border:1px solid var(--rim);border-radius:var(--r8);padding:12px;margin:12px 0">
      <div class="fsec" style="margin:0 0 8px 0">Plan sugerido</div>
      <div class="fgr">
        <div class="fg"><label>Tipo de plan</label><select class="fs" id="m_plan_mode" onchange="previewCalc()"><option value="global" ${!(m&&(m.planModo==='custom'||m.planModo==='apy'))?'selected':''}>Principal</option><option value="custom" ${(m&&m.planModo==='custom')?'selected':''}>Personalizado</option><option value="apy" ${(m&&m.planModo==='apy')?'selected':''}>APY / Meses</option></select></div>
        <div class="fg"><label>Precio base real</label><input class="fi" id="m_precio_base" type="number" value="${(m&&(m.precioBaseReal||m.precio))||''}" placeholder="0.00" oninput="previewCalc()"></div>
      </div>
      <div id="m_plan_custom_box" style="display:${(m&&m.planModo==='custom')?'block':'none'};margin-top:8px">
        <div class="fgr">
          <div class="fg"><label>Inicial real</label><input class="fi" id="m_ini_real" type="number" value="${(m&&m.planModo==='custom'&&(m.ini||''))||''}" placeholder="0.00" oninput="previewCalc()"></div>
          <div class="fg"><label>Cuota quincenal</label><input class="fi" id="m_cuota_q_custom" type="number" value="${(m&&m.planModo==='custom'&&(m.cuotaQ||''))||''}" placeholder="0.00" oninput="previewCalc()"></div>
          <div class="fg"><label>Plazo (meses)</label><input class="fi" id="m_plazo_custom" type="number" min="1" step="1" value="${(m&&m.planModo==='custom'&&(m.plazo||''))||PLAN.plazo}" placeholder="12" oninput="previewCalc()"></div>
        </div>
      </div>
      <div id="m_plan_apy_box" style="display:${(m&&m.planModo==='apy')?'block':'none'};margin-top:8px">
        <div class="fgr">
          <div class="fg"><label>APY objetivo (%)</label><input class="fi" id="m_apy_objetivo" type="number" step="0.01" value="${(m&&m.planModo==='apy'&&(m.apy||(m.plan&&m.plan.apy)||''))||''}" placeholder="413.34" oninput="_mApyCompare()"></div>
          <div class="fg"><label>Plazo (meses)</label><input class="fi" id="m_apy_plazo" type="number" min="1" step="1" value="${(m&&m.planModo==='apy'&&(m.plazo||''))||PLAN.plazo}" placeholder="12" oninput="_mApyCompare()"></div>
        </div>
        <div id="m_apy_compare" style="display:none;margin-top:10px;background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--p1);margin-bottom:8px">Comparativo de iniciales</div>
          <div id="m_apy_compare_grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"></div>
          <div style="font-size:11px;color:var(--ink3);margin-top:8px">Selecciona la opción que deseas aplicar:</div>
          <div class="fg" style="margin-top:6px"><select class="fs" id="m_apy_inicial_sel" onchange="previewCalc()">
            <option value="0.45" ${(m&&m.planModo==='apy'&&Math.abs((m.inicialPct||0)-0.45)<0.001)?'selected':''}>Inicial 45%</option>
            <option value="0.50" ${(!m||!(m.planModo==='apy')||Math.abs((m.inicialPct||0)-0.50)<0.001)?'selected':''}>Inicial 50%</option>
            <option value="0.55" ${(m&&m.planModo==='apy'&&Math.abs((m.inicialPct||0)-0.55)<0.001)?'selected':''}>Inicial 55%</option>
            <option value="custom">Inicial personalizada</option>
          </select></div>
          <button type="button" class="btn btn-g btn-sm" id="m_guardar_plan_apy" style="margin-top:8px" onclick="_mGuardarPlanApy()">Guardar como plan nuevo</button>
        </div>
        <div style="font-size:11px;color:var(--ink3);margin-top:6px">Indicas APY objetivo y plazo. El sistema calcula la cuota quincenal para iniciales de 45%, 50% y 55%.</div>
      </div>
    </div>
    <div id="calc-preview" style="background:var(--gs);border:1px solid var(--rim2);border-radius:var(--r8);padding:13px;margin:12px 0;display:${ed?'grid':'none'};grid-template-columns:repeat(3,1fr);gap:10px"></div>
    <div class="fsec">Identificación y estado</div>
    <div class="fgr">
      <div class="fg"><label>Marca</label><input class="fi" id="m_marca" value="${(m&&m.marca)||''}" placeholder="Ej: Empire, Bera..."></div>
      <div class="fg"><label>Año</label><input class="fi" id="m_anio" type="number" min="1980" max="2100" step="1" value="${(m&&m.anio)||''}" placeholder="${new Date().getFullYear()}"></div>
      <div class="fg"><label>Color</label><input class="fi" id="m_color" value="${(m&&m.color)||''}" placeholder="Negro, Rojo..."></div>
    </div>
    <div class="fgr">
      <div class="fg"><label>VIN</label><input class="fi" id="m_vin" value="${(m&&m.vin)||''}" placeholder="VIN-0000"></div>
      <div class="fg"><label>Serial de Motor</label><input class="fi" id="m_serial_motor" value="${(m&&m.serialMotor)||''}" placeholder="Ej: 162FMJ-..."></div>
      <div class="fg"><label>Serial de Chasis</label><input class="fi" id="m_serial_chasis" value="${(m&&m.serialChasis)||''}" placeholder="Ej: 8LBCF..."></div>
    </div>
    <div class="fgr">
      <div class="fg"><label>Placa (si aplica)</label><input class="fi" id="m_placa" value="${(m&&m.placa)||''}" placeholder="AA123BC"></div>
      <div class="fg"><label>N° de GPS</label><input class="fi" id="m_gps_num" value="${(m&&m.gpsNum)||''}" placeholder="Ej: GPS-12345"></div>
      <div class="fg"><label>Estado</label><select class="fs" id="m_est">${['disponible','financiada','recuperada','inventario','propia'].map(s=>`<option ${(m&&m.estado)===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    ${(function(){
      var _concesList = (S.concesionarios||[]).filter(function(c){return !c.eliminado && c.activo!==false;});
      if(!_concesList.length) return '';
      var _selId = (m&&m.concesionarioId) || _concDefaultId() || '';
      return '<div class="fgr"><div class="fg"><label>Concesionario / Sede</label><select class="fs" id="m_concesionario">'
        + '<option value="">— Sin asignar —</option>'
        + _concesList.map(function(c){
            return '<option value="'+c.id+'" '+(_selId===c.id?'selected':'')+'>'+c.nombre+(c.ciudad?' · '+c.ciudad:'')+'</option>';
          }).join('')
        + '</select></div></div>';
    })()}
    <div class="fgr">
      <div class="fg"><label>Cliente asignado</label><input class="fi" id="m_cli" value="${(m&&m.cliente)||''}" placeholder="Opcional"></div>
    </div>
    <div class="tgl-w" style="margin-top:8px">
      <button class="tgl ${(m&&m.gps)?'on':''}" id="m_gps" onclick="this.classList.toggle('on')"></button>
      <span style="font-size:13px;font-weight:700">GPS instalado</span>
    </div>
    <div class="fgr c1" style="gap:8px;margin-top:9px">
      <div class="fg"><label>Notas</label><textarea class="fta" id="m_notas">${(m&&m.notas)||''}</textarea></div>
    </div>
    ${ed ? '' : _mpagoBloqueHtml('mpago','Forma de pago de la moto','Indica de cuál(es) cuenta(s) o efectivo sale el dinero. Puedes dividir el pago entre varias cuentas. La suma debe coincidir con el precio base real (costo).')}`;
  // "Guardar como plan nuevo" escribe en la configuracion: si el usuario no tiene ese
  // permiso, el boton no se ofrece (antes decia "guardado" y la base lo rechazaba).
  setTimeout(function(){
    var _bp = document.getElementById('m_guardar_plan_apy');
    if(_bp && typeof hasModuleAccess==='function' && !(hasModuleAccess('plan')||hasModuleAccess('config'))) _bp.style.display='none';
  }, 30);
  if(ed) previewCalc();
  S.saveFn=()=>{
    const g=i=>{ var el=$(i); return el?el.value.trim():null; };
    // Resolver nombre del modelo (dropdown catálogo o nueva entrada al catálogo)
    var _selMod = ($('m_mod_sel')&&$('m_mod_sel').value)||'';
    var _modeloFinal = _selMod==='__custom__' ? g('m_mod_custom') : _selMod;
    if(!_modeloFinal){toast('Selecciona un modelo del catálogo','error');return false;}
    // Si es nueva entrada al catálogo, guardarla antes de continuar
    if(_selMod==='__custom__'){
      var _catPrecio = parseFloat(($('m_mod_cat_precio')&&$('m_mod_cat_precio').value))||0;
      if(!_catPrecio){toast('Ingresa el precio del catálogo','error');return false;}
      // Guardar en CATALOGO
      var _newCatId = CATALOGO.length ? Math.max.apply(null,CATALOGO.map(function(c){return c.id||0;}))+1 : 1;
      var _catMarca = (($('m_mod_cat_marca')&&$('m_mod_cat_marca').value)||'').trim();
      var _catEntry = {id:_newCatId, modelo:_modeloFinal, precio:_catPrecio};
      if(_catMarca) _catEntry.marca = _catMarca;
      CATALOGO.push(_catEntry);
      if(db){ db.collection('config').doc('catalogo').set({items:CATALOGO, version:3}).then(function(){ try{localStorage.setItem('pagasi_catalogo_config',JSON.stringify(CATALOGO));}catch(e){} }).catch(function(){}); }
      toast('Moto agregada al catálogo: '+_modeloFinal,'success');
      // Usar el precio del catálogo si no se puso precio en el campo principal
      if(!($('m_pr')&&$('m_pr').value)){ var _prEl=$('m_pr'); if(_prEl){_prEl.value=_catPrecio.toFixed(2);} }
    }
    if(!($('m_pr')&&$('m_pr').value)){toast('El precio es obligatorio','error');return false;}
    const precio=parseFloat($('m_pr').value)||0;
    const planMode=(($('m_plan_mode')&&$('m_plan_mode').value)||'global');
    const precioBaseReal=parseFloat((($('m_precio_base')&&$('m_precio_base').value)||precio))||precio;
    let calc;
    if(planMode==='custom'){
      calc=calcCustomPlan(precioBaseReal, parseFloat(($('m_ini_real')&&$('m_ini_real').value)||0)||0, parseFloat(($('m_cuota_q_custom')&&$('m_cuota_q_custom').value)||0)||0, parseInt((($('m_plazo_custom')&&$('m_plazo_custom').value)||PLAN.plazo),10)||PLAN.plazo);
    } else if(planMode==='apy'){
      const _apy=parseFloat(($('m_apy_objetivo')&&$('m_apy_objetivo').value)||0)||0;
      const _plapy=parseInt((($('m_apy_plazo')&&$('m_apy_plazo').value)||PLAN.plazo),10)||PLAN.plazo;
      var _iniSelRaw = ($('m_apy_inicial_sel')&&$('m_apy_inicial_sel').value)||'0.50';
      var _iniSel;
      if(_iniSelRaw === 'custom'){
        _iniSel = parseFloat(window._mCustomPct)||0;
        if(!(_iniSel>0)){ toast('Ingresa un valor para la inicial personalizada','error'); return false; }
      } else {
        _iniSel = parseFloat(_iniSelRaw)||0.50;
      }
      calc=calcApyPlan(precioBaseReal, _iniSel, _apy, _plapy);
    } else {
      calc=Object.assign({precioBaseReal:precioBaseReal, planModo:'global', plazo:PLAN.plazo, totalCuotas:PLAN.plazo*2}, calcMoto(precioBaseReal));
    }
    // Se reservan de una vez el numero de la moto Y los de sus gastos de compra: con
    // dos personas guardando a la vez, el numero de gasto calculado en memoria hacia
    // que el segundo borrara el gasto del primero (punto 30, 22-sep-2026).
    var _nGastos = (!ed && _pagosMoto && _pagosMoto.length) ? _pagosMoto.length : 0;
    return Promise.all([nextMotoIdAsync(), _nGastos ? nextEgresoIdsAsync(_nGastos) : Promise.resolve(null)])
      .then(function(_res){
    var _nextMotoId = _res[0], _idsGasto = _res[1];
    const obj={id:(m&&m.id)||_nextMotoId,modelo:_modeloFinal,precio,precioBaseReal:calc.precioBaseReal||precioBaseReal,planModo:planMode,marca:g('m_marca')||'',color:g('m_color')||'',anio:(parseInt(g('m_anio'),10)||null),vin:g('m_vin')||'',placa:g('m_placa')||'',serialMotor:g('m_serial_motor')||'',serialChasis:g('m_serial_chasis')||'',gpsNum:g('m_gps_num')||'',estado:($('m_est')&&$('m_est').value)||'disponible',cliente:g('m_cli')||null,gps:($('m_gps')&&$('m_gps').classList).contains('on')||false,notas:g('m_notas')||'',plazo:calc.plazo||PLAN.plazo,totalCuotas:calc.totalCuotas||(PLAN.plazo*2),...calc};
    // Asignar concesionario: si está editando preserva el existente, si es nuevo usa el activo o el default
    if(ed && m && m.concesionarioId){
      obj.concesionarioId = m.concesionarioId;
    } else {
      var _selConc = ($('m_concesionario')&&$('m_concesionario').value);
      obj.concesionarioId = _selConc || _concDefaultId();
    }
    // ── Validar pago de la moto SOLO al crear nueva (no al editar) ──
    var _pagosMoto = null;
    if(!ed){
      var _costoMoto = obj.precioBaseReal || precioBaseReal || 0;
      var _val = _mpagoValidarContraCosto('mpago', _costoMoto);
      if(!_val.ok){ toast(_val.error,'error'); return false; }
      _pagosMoto = _val.pagos;
    }
    if(ed){const i=S.motos.findIndex(x=>String(x.id)===String(m.id));if(i>=0){S.motos[i]=obj;}else{S.motos.push(obj);}}else S.motos.push(obj);
    DB.saveMoto(obj);
    // ── Crear egresos + movimientos por la compra de la moto (solo nueva) ──
    if(!ed && _pagosMoto && _pagosMoto.length){
      _mpagoCrearGastos(obj, _pagosMoto, {fecha: hoyLocalISO(), ids: _idsGasto});
    }
    closeM();nav('motos');toast(ed?'Moto actualizada':'✓ Moto agregada','success');return true;
    }); // end Promise.all(nextMotoIdAsync, nextEgresoIdsAsync)
  };
  $('mft').innerHTML=`<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar</button>`;
  $('ov').style.display='flex';
}

function onCatalogoSelect(sel){
  var v = sel.value;
  var customDiv = $('m_custom_div');
  if(v === '__custom__'){
    if(customDiv) customDiv.style.display='block';
    var pr = $('m_pr');
    if(pr){ pr.value=''; pr.readOnly=false; }
    var catPrecio = $('m_mod_cat_precio');
    if(catPrecio) catPrecio.value='';
    var catMarca = $('m_mod_cat_marca');
    if(catMarca) catMarca.value='';
    var catModelo = $('m_mod_custom');
    if(catModelo) catModelo.value='';
    var calc = $('calc-preview');
    if(calc) calc.style.display='none';
  } else {
    if(customDiv) customDiv.style.display='none';
    var opt = sel.options[sel.selectedIndex];
    var precio = opt ? parseFloat(opt.dataset.precio)||0 : 0;
    var pr = $('m_pr');
    if(pr){ pr.value = precio ? precio.toFixed(2) : ''; pr.readOnly = !!precio; }
    if(precio) previewCalc();
  }
}

function previewCalc(){
  const p=parseFloat(($('m_pr')&&$('m_pr').value))||0;
  const div=$('calc-preview');
  const _mode=(($('m_plan_mode')&&$('m_plan_mode').value)||'global');
  if($('m_plan_custom_box')) $('m_plan_custom_box').style.display=(_mode==='custom')?'block':'none';
  if($('m_plan_apy_box')) $('m_plan_apy_box').style.display=(_mode==='apy')?'block':'none';
  if($('m_precio_base') && (!($('m_precio_base').value) || parseFloat($('m_precio_base').value||0)<=0) && p>0){ $('m_precio_base').value=p.toFixed(2); }
  // Si está visible el bloque de pago de moto (creación nueva), actualizar el costo objetivo (precio base real)
  const _precioBaseActual = parseFloat((($('m_precio_base')&&$('m_precio_base').value)||p))||p;
  if(document.getElementById('mpago-rows')) _mpagoSetCosto('mpago', _precioBaseActual);
  if(_mode==='apy') _mApyCompare();
  if(!p||!div){ if(div) div.style.display='none'; return; }
  const precioBase=_precioBaseActual;
  let r;
  if(_mode==='custom'){
    r=calcCustomPlan(precioBase, parseFloat(($('m_ini_real')&&$('m_ini_real').value)||0)||0, parseFloat(($('m_cuota_q_custom')&&$('m_cuota_q_custom').value)||0)||0, parseInt((($('m_plazo_custom')&&$('m_plazo_custom').value)||PLAN.plazo),10)||PLAN.plazo);
  } else if(_mode==='apy'){
    const _apy=parseFloat(($('m_apy_objetivo')&&$('m_apy_objetivo').value)||0)||0;
    const _plapy=parseInt((($('m_apy_plazo')&&$('m_apy_plazo').value)||PLAN.plazo),10)||PLAN.plazo;
    var _iniSelRaw = ($('m_apy_inicial_sel')&&$('m_apy_inicial_sel').value)||'0.50';
    var _iniSel = (_iniSelRaw === 'custom') ? (parseFloat(window._mCustomPct)||0.50) : (parseFloat(_iniSelRaw)||0.50);
    r=calcApyPlan(precioBase, _iniSel, _apy, _plapy);
  } else {
    r=Object.assign({precioBaseReal:precioBase, plazo:PLAN.plazo}, calcMoto(precioBase));
  }
  div.style.display='grid';
  const modoLabel = _mode==='custom'?'Personalizado': _mode==='apy'?'APY/Mes':'Principal';
  div.innerHTML=[['Modo',modoLabel],['Precio base','$'+(r.precioBaseReal||precioBase).toFixed(2)],['Inicial','$'+r.ini.toFixed(2)],['Cuota Q','$'+r.cuotaQ.toFixed(2)],['Plazo',(r.plazo||PLAN.plazo)+' meses'],['Total a pagar','$'+r.totalPagado.toFixed(2)]].map(([l,v])=>`<div><div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--p1);margin-bottom:2px">${l}</div><div style="font-family:var(--fd);font-weight:900;font-size:16px;color:var(--ink)">${v}</div></div>`).join('');
}

// ── Comparativo APY del modal de motos ──

function _mApyCompare(){
  const precio=parseFloat((($('m_precio_base')&&$('m_precio_base').value)||($('m_pr')&&$('m_pr').value)||0))||0;
  const apy=parseFloat(($('m_apy_objetivo')&&$('m_apy_objetivo').value)||0)||0;
  const plazo=parseInt((($('m_apy_plazo')&&$('m_apy_plazo').value)||0),10)||0;
  const grid=$('m_apy_compare_grid');
  const box=$('m_apy_compare');
  if(!grid||!box) return;
  if(!(precio>0)||!(apy>0)||!(plazo>0)){ box.style.display='none'; return; }
  box.style.display='block';
  const pcts=[0.45,0.50,0.55];
  // 3 cuadros fijos
  var fixedCards = pcts.map(function(pp){
    const r=calcApyPlan(precio,pp,apy,plazo);
    return '<div style="background:var(--surf);border:1px solid var(--rim);border-radius:10px;padding:10px">'
      +'<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--p1);margin-bottom:6px">Inicial '+(pp*100).toFixed(0)+'%</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Inicial</div>'
      +'<div style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:6px">$'+r.ini.toFixed(2)+'</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Cuota quincenal</div>'
      +'<div style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:6px">$'+r.cuotaQ.toFixed(2)+'</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Total a pagar</div>'
      +'<div style="font-size:13px;font-weight:800;color:var(--ink)">$'+r.totalPagado.toFixed(2)+'</div>'
      +'</div>';
  }).join('');
  // 4to cuadro: personalizada (con inputs)
  var prevMode = (window._mCustomMode === '$') ? '$' : '%';
  var prevVal = (window._mCustomVal != null) ? window._mCustomVal : '';
  var customCard = ''
    +'<div style="background:var(--surf);border:2px dashed var(--p1);border-radius:10px;padding:10px">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    +'<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--p1)">Personalizada</div>'
    +'<div style="display:flex;gap:2px;background:var(--gs);border-radius:6px;padding:2px">'
    +'<button type="button" id="m_cust_btn_pct" onclick="_mApyCustomSetMode(\'%\')" style="border:none;background:'+(prevMode==='%'?'var(--p1)':'transparent')+';color:'+(prevMode==='%'?'#fff':'var(--ink2)')+';padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">%</button>'
    +'<button type="button" id="m_cust_btn_dol" onclick="_mApyCustomSetMode(\'$\')" style="border:none;background:'+(prevMode==='$'?'var(--p1)':'transparent')+';color:'+(prevMode==='$'?'#fff':'var(--ink2)')+';padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer">$</button>'
    +'</div>'
    +'</div>'
    +'<input type="number" id="m_cust_input" value="'+prevVal+'" placeholder="'+(prevMode==='%'?'Ej: 60':'Ej: 800')+'" oninput="_mApyCustomCalc()" style="width:100%;border:1px solid var(--rim);border-radius:6px;padding:5px 8px;font-size:13px;font-weight:700;font-family:var(--fd);margin-bottom:6px">'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Inicial</div>'
    +'<div id="m_cust_ini" style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:6px">$0.00</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Cuota quincenal</div>'
    +'<div id="m_cust_cuota" style="font-size:14px;font-weight:900;color:var(--ink);margin-bottom:6px">$0.00</div>'
    +'<div style="font-size:11px;color:var(--ink3);margin-bottom:2px">Total a pagar</div>'
    +'<div id="m_cust_total" style="font-size:13px;font-weight:800;color:var(--ink)">$0.00</div>'
    +'</div>';
  grid.innerHTML = fixedCards + customCard;
  // Recalcular el cuadro custom si ya tenía valor
  setTimeout(_mApyCustomCalc, 0);
}

// Toggle entre % y $ del cuadro personalizado (motos)

function _mApyCustomSetMode(mode){
  window._mCustomMode = mode;
  var bp = $('m_cust_btn_pct'), bd = $('m_cust_btn_dol'), inp = $('m_cust_input');
  if(bp && bd){
    bp.style.background = (mode==='%')?'var(--p1)':'transparent';
    bp.style.color = (mode==='%')?'#fff':'var(--ink2)';
    bd.style.background = (mode==='$')?'var(--p1)':'transparent';
    bd.style.color = (mode==='$')?'#fff':'var(--ink2)';
  }
  if(inp){ inp.placeholder = (mode==='%')?'Ej: 60':'Ej: 800'; }
  _mApyCustomCalc();
}

// Recalcula el cuadro de inicial personalizada (motos)

function _mApyCustomCalc(){
  var precio = parseFloat(($('m_precio_base')&&$('m_precio_base').value)||($('m_pr')&&$('m_pr').value)||0)||0;
  var apy = parseFloat(($('m_apy_objetivo')&&$('m_apy_objetivo').value)||0)||0;
  var plazo = parseInt(($('m_apy_plazo')&&$('m_apy_plazo').value)||0,10)||0;
  var inp = $('m_cust_input');
  var raw = inp ? inp.value : '';
  window._mCustomVal = raw;
  var iniDol = $('m_cust_ini'), cuoEl = $('m_cust_cuota'), totEl = $('m_cust_total');
  if(!iniDol || !cuoEl || !totEl) return;
  if(!(precio>0) || !(apy>0) || !(plazo>0) || raw==='' || isNaN(parseFloat(raw))){
    iniDol.textContent='$0.00'; cuoEl.textContent='$0.00'; totEl.textContent='$0.00';
    return;
  }
  var val = parseFloat(raw)||0;
  var mode = (window._mCustomMode==='$')?'$':'%';
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
    window._mCustomPct = pct;
  }catch(e){
    iniDol.textContent='—'; cuoEl.textContent='—'; totEl.textContent='—';
  }
}

// ── Guardar plan APY del modal de motos como plan nuevo ──

function _mGuardarPlanApy(){
  const precio=parseFloat((($('m_precio_base')&&$('m_precio_base').value)||($('m_pr')&&$('m_pr').value)||0))||0;
  const apy=parseFloat(($('m_apy_objetivo')&&$('m_apy_objetivo').value)||0)||0;
  const plazo=parseInt((($('m_apy_plazo')&&$('m_apy_plazo').value)||0),10)||0;
  var iniSelRaw = ($('m_apy_inicial_sel')&&$('m_apy_inicial_sel').value)||'0.50';
  var iniSel;
  if(iniSelRaw === 'custom'){
    iniSel = parseFloat(window._mCustomPct)||0;
    if(!(iniSel>0)){ if(typeof toast==='function') toast('Ingresa un valor para la inicial personalizada','error'); return; }
  } else {
    iniSel = parseFloat(iniSelRaw)||0.50;
  }
  if(!(precio>0)||!(apy>0)||!(plazo>0)){ if(typeof toast==='function') toast('Completa precio, APY y plazo','error'); return; }
  const r=calcApyPlan(precio,iniSel,apy,plazo);
  const nombre='APY '+apy.toFixed(1)+'% · '+plazo+'m · Ini '+(iniSel*100).toFixed(0)+'%';
  const newPlan={nombre:nombre, plazo:plazo, factor:parseFloat(r.factor.toFixed(4)), inicial:iniSel, tasaMensual:parseFloat(r.tasaMensual.toFixed(2)), apy:apy, moraPct:(PLAN.moraPct||2.5), diasGracia:(PLAN.diasGracia!=null?PLAN.diasGracia:5), origen:'apy'};
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

function editMoto(id){openAddMoto(id);}

function setMTab(t){S.mTab=t;nav('motos');}

function resyncMotosConFirebase(){
  if(!db){ toast('No hay conexión con Firebase','error'); return; }
  var countAntes = (S.motos||[]).length;
  var activasAntes = (S.motos||[]).filter(function(m){return !m.eliminado;}).length;
  var eliminadasAntes = countAntes - activasAntes;
  var msg = '¿Descartar el caché local de motos y recargar solo las que estén en Firebase?\n\n';
  msg += 'Visibles actualmente: '+countAntes+' total\n';
  msg += ' · Activas: '+activasAntes+'\n';
  msg += ' · Marcadas como eliminadas: '+eliminadasAntes+'\n\n';
  msg += 'Esto borrará cualquier moto local que no esté también en Firebase.';
  if(!confirm(msg)) return;
  // Limpiar el caché local
  try{ localStorage.removeItem(MOTOS_CACHE_KEY); }catch(e){}
  toast('Resincronizando motos...','info');
  db.collection('motos').get().then(function(snap){
    var motosRemotas = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
    S.motos = motosRemotas.map(mapMoto);
    saveMotosCache(S.motos);
    var total = S.motos.length;
    var activas = S.motos.filter(function(m){return !m.eliminado;}).length;
    var eliminadas = total - activas;
    var infoMsg = '✓ '+total+' moto(s) en Firebase — '+activas+' activa(s)'+(eliminadas?', '+eliminadas+' marcada(s) como eliminada(s)':'');
    toast(infoMsg,'success');
    nav('motos');
    // Si hay eliminadas, ofrecer restaurarlas
    if(eliminadas>0){
      setTimeout(function(){
        if(confirm('Hay '+eliminadas+' moto(s) marcada(s) como eliminada(s) en Firebase.\n\n¿Quieres restaurarlas (quitarles el flag de eliminado) para que vuelvan a ser visibles?')){
          restaurarTodasLasMotosEliminadas();
        }
      }, 400);
    }
  }).catch(function(e){
    toast('Error al resincronizar: '+(e.message||e),'error');
  });
}

// Restaura todas las motos que tienen el flag eliminado:true (las reactiva)

function restaurarTodasLasMotosEliminadas(){
  if(typeof requireDeletePermission==='function' && !requireDeletePermission()) return;
  // Solo las de la sede que se esta viendo (el bloque que pinta el boton usa _concFiltrar)
  var _lista = (typeof _concFiltrar==='function') ? _concFiltrar(S.motos||[]) : (S.motos||[]);
  var eliminadas = _lista.filter(function(m){return m.eliminado;});
  if(eliminadas.length===0){ toast('No hay motos eliminadas','info'); return; }
  // Restaurar vuelve a descontar la compra de cada moto: hay que avisarlo antes
  var _montoVuelve = 0, _porCuenta = {};
  eliminadas.forEach(function(m){
    (S.egresos||[]).forEach(function(eg){
      if(!eg || !eg.eliminado || String(eg.motoIdRef)!==String(m.id) || eg.origenAuto!=='compra_moto') return;
      // mismo criterio con el que se van a revivir, para no prometer montos que no se mueven
      var loAnulo = eg.anuladoPorMoto
        ? (!m.eliminadoEn || eg.anuladoPorMoto===m.eliminadoEn)
        : (!!eg.eliminadoEn && !!m.eliminadoEn && eg.eliminadoEn===m.eliminadoEn);
      if(!loAnulo) return;
      var monto = parseFloat(eg.monto)||0;
      _montoVuelve += monto;
      var cta = eg.forma || '(sin cuenta)';
      _porCuenta[cta] = (_porCuenta[cta]||0) + monto;
    });
  });
  var _msg = '¿Restaurar '+eliminadas.length+' moto(s)?\n\n';
  if(_montoVuelve > 0){
    _msg += 'Se vuelve a registrar su compra: se descontará '+fmt(_montoVuelve)+' de las cuentas:\n';
    Object.keys(_porCuenta).forEach(function(cta){ _msg += ' · '+cta+': −'+fmt(_porCuenta[cta])+'\n'; });
    _msg += '\nEsto deshace el reverso que devolvió ese dinero.';
  } else {
    _msg += 'No hay compras que revivir: solo vuelven al inventario.';
  }
  if(!confirm(_msg)) return;
  var egTot=0, movTot=0;
  eliminadas.forEach(function(m){
    var r = _motoRestaurarConGastos(m);   // misma logica que "Restaurar" de a una
    egTot += r.egRest; movTot += r.movRest;
  });
  nav('motos');
  toast('✓ '+eliminadas.length+' moto(s) restaurada(s)'+(egTot?' · '+egTot+' gasto(s) de compra revividos':''),'success');
}

// Restaura una sola moto por id

// Restaura una moto Y su compra: revive el gasto que anulo ESE borrado y anula el
// reverso que devolvio el dinero. Sin pantalla: lo usan "Restaurar" y "Restaurar todas"
// (antes "Restaurar todas" solo quitaba la marca y dejaba motos sin costo; 22-sep-2026).
function _motoRestaurarConGastos(m){
  if(!m) return {egRest:0, movRest:0};
  var id = m.id;
  var seDevolvioDinero = !!m.eliminacionReversaCuenta;
  var _elimEn = m.eliminadoEn;
  m.eliminado = false;
  m.eliminadoPor = null;
  m.eliminadoEn = null;
  m.eliminadoRazon = null;
  m.eliminadoPorUid = null;
  m.eliminacionReversaCuenta = null;
  DB.saveMoto(m);
  var egRest=0, movRest=0;
  (S.egresos||[]).forEach(function(eg){
    if(!eg.eliminado || String(eg.motoIdRef)!==String(id) || eg.origenAuto!=='compra_moto') return;
    // Solo los que anulo el borrado de ESTA moto: uno borrado aparte en Finanzas
    // (o por una solicitud rechazada) se queda anulado (punto 12, 21-sep-2026).
    var loAnuloEstaMoto = eg.anuladoPorMoto
      ? (!_elimEn || eg.anuladoPorMoto===_elimEn)
      : (!!eg.eliminadoEn && !!_elimEn && eg.eliminadoEn===_elimEn);
    if(!loAnuloEstaMoto) return;
    eg.eliminado=false;
    eg.eliminadoPor=null; eg.eliminadoEn=null; eg.eliminadoRazon=null; eg.eliminacionReversaCuenta=null; eg.anuladoPorMoto=null;
    if(DB && DB.saveEgreso) DB.saveEgreso(eg);
    egRest++;
  });
  (S.movimientos||[]).forEach(function(mv){
    if(String(mv.motoIdRef)!==String(id) || mv.tipoOperacion!=='compra_moto' || mv.tipo!=='retiro') return;
    if(mv.eliminado){
      // motos borradas antes del 18-sep: el retiro quedaba anulado
      mv.eliminado=false;
      mv.eliminadoPor=null; mv.eliminadoEn=null; mv.eliminadoRazon=null;
      mv.reversoCreado=null;
      if(DB && DB.saveMovimiento) DB.saveMovimiento(mv);
      movRest++;
    } else if(seDevolvioDinero && mv.reversoCreado){
      // el reverso se anula abajo: el retiro queda listo para otro reverso si se vuelve a borrar
      mv.reversoCreado=null;
      if(DB && DB.saveMovimiento) DB.saveMovimiento(mv);
    }
  });
  // Si al eliminar se devolvió el dinero, ahora hay que anular esos reversos para que la cuenta vuelva a quedar con el gasto
  if(seDevolvioDinero){
    (S.movimientos||[]).forEach(function(mv){
      if(!mv.eliminado && mv.reversoDe==='compra_moto:'+id){
        mv.eliminado=true;
        mv.eliminadoPor=(S.currentUser&&S.currentUser.nombre)||'Admin';
        mv.eliminadoEn=new Date().toISOString();
        mv.eliminadoRazon='Restauración de moto — anulación del reverso previo';
        if(DB && DB.saveMovimiento) DB.saveMovimiento(mv);
      }
    });
  }
  return {egRest:egRest, movRest:movRest};
}

function restaurarMoto(id){
  // Restaurar revive el gasto de la compra y anula su reverso: mismo permiso que borrar
  if(typeof requireDeletePermission==='function' && !requireDeletePermission()) return;
  var m = S.motos.find(function(x){return String(x.id)===String(id);});
  if(!m){ toast('Moto no encontrada','error'); return; }
  var _r = _motoRestaurarConGastos(m);
  var egRest = _r.egRest, movRest = _r.movRest;
  nav('motos');
  var detalle = (egRest||movRest) ? ' ('+egRest+' gasto(s) y '+movRest+' movimiento(s) restaurados)' : '';
  toast('✓ Moto "'+m.modelo+'" restaurada'+detalle,'success');
}

function delMoto(id){
  if(!requireDeletePermission()) return;
  const m=S.motos.find(x=>String(x.id)===String(id));if(!m)return;
  setMicon('eliminar');$('mtt').textContent='Eliminar Moto';$('msb').textContent='No se puede deshacer';
  $('modal-box').className='modal';
  $('mbd').innerHTML=`<div style="text-align:center;padding:14px 0"><div style="font-size:46px;margin-bottom:12px">MOT</div><div style="font-size:16px;font-weight:800;margin-bottom:5px">${m.modelo}</div><div style="color:var(--ink3);margin-bottom:18px;font-size:12px">Precio: ${fmt(m.precio)}</div><div style="background:var(--reds);border:1px solid rgba(240,75,106,0.2);border-radius:var(--r8);padding:11px;color:var(--red);font-size:13px;font-weight:700">¿Confirmas eliminar esta moto del catálogo?</div></div>`;
  $('mft').innerHTML=`<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-d" onclick="cDel(${id})">Eliminar</button>`;
  $('ov').style.display='flex';
}
// ══════════════════════════════════════════════════════════════
// SISTEMA DE AUDITORÍA DE ELIMINACIONES
// ══════════════════════════════════════════════════════════════

function cDel(id){
  var i=S.motos.findIndex(x=>String(x.id)===String(id)); if(i<0) return;
  var m=S.motos[i];
  // ¿La moto tiene gastos asociados (compra)? Si sí, mostrar modal extendido con opción de devolver
  if(_mpagoTieneGastos(m.id)){
    _delMotoConPagos(m, i);
    return;
  }
  // Sin gastos asociados: comportamiento original
  confirmarEliminacion({
    titulo:'Eliminar Moto',
    descripcion:'¿Eliminar '+m.modelo+' — '+m.vin+'?',
    onConfirm:function(audit){
      Object.assign(S.motos[i],audit);
      DB.saveMoto(S.motos[i]);
      nav('motos'); toast('Moto eliminada','info');
    }
  });
}

// Eliminar moto que tiene gastos de compra asociados — pregunta si devolver dinero a cuentas

function _delMotoConPagos(m, i){
  if(!requireDeletePermission()) return;
  // Resumen de gastos asociados
  var gastos = (S.egresos||[]).filter(function(eg){
    return !eg.eliminado && String(eg.motoIdRef)===String(m.id) && eg.origenAuto==='compra_moto';
  });
  var totalGastos = gastos.reduce(function(a,g){return a+(parseFloat(g.monto)||0);},0);
  var listaCuentas = gastos.map(function(g){ return '<li style="margin-bottom:3px">'+g.forma+' — <strong>$'+(parseFloat(g.monto)||0).toFixed(2)+'</strong></li>'; }).join('');

  setMicon('eliminar');
  $('mtt').textContent='Eliminar Moto';
  $('msb').textContent='El registro quedará auditado';
  $('modal-box').className='modal';
  $('mbd').innerHTML=''
    +'<div style="text-align:center;padding:8px 0 14px">'
    +'<div style="font-size:14px;font-weight:800;margin-bottom:6px">¿Eliminar '+(m.modelo||'')+(m.vin?' — '+m.vin:'')+'?</div>'
    +'<div style="color:var(--ink3);font-size:12px;margin-bottom:10px">Esta moto tiene <strong>'+gastos.length+' gasto(s)</strong> de compra registrado(s) por <strong>$'+totalGastos.toFixed(2)+'</strong>.</div>'
    +'</div>'
    +'<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px 14px;margin-bottom:12px">'
    +  '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--ink3);margin-bottom:6px">Gastos a anular</div>'
    +  '<ul style="margin:0;padding-left:18px;font-size:12px;color:var(--ink)">'+listaCuentas+'</ul>'
    +'</div>'
    +'<div class="fg"><label>Razón de la eliminación (obligatorio)</label>'
    +'<select class="fs" id="mdel_razon">'
    +'<option value="">— Seleccionar —</option>'
    +'<option>Error de captura</option>'
    +'<option>Moto duplicada</option>'
    +'<option>Datos incorrectos</option>'
    +'<option>Operación cancelada</option>'
    +'<option>Orden del administrador</option>'
    +'<option>Otro</option>'
    +'</select></div>'
    +'<div class="fg" style="margin-top:8px;display:none" id="mdel_otro_wrap">'
    +'<label>Especifica la razón</label>'
    +'<input class="fi" id="mdel_otro" placeholder="Describe la razón..."></div>'
    +'<div class="fg" style="margin-top:10px"><label>¿Qué hacer con el dinero de la(s) cuenta(s)?</label>'
    +'<div style="display:grid;gap:8px">'
    +'<label style="display:flex;gap:8px;align-items:flex-start;background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px 12px"><input type="radio" name="mdel_retorno" value="si" checked> <span><strong>Regresar el dinero a las cuentas</strong><br><span style="color:var(--ink3);font-size:12px">Crea un movimiento de reverso por cada cuenta y suma los montos de nuevo.</span></span></label>'
    +'<label style="display:flex;gap:8px;align-items:flex-start;background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px 12px"><input type="radio" name="mdel_retorno" value="no"> <span><strong>Eliminar sin regresar el dinero</strong><br><span style="color:var(--ink3);font-size:12px">Solo se anulan los gastos, pero no se compensan las cuentas.</span></span></label>'
    +'</div></div>';
  setTimeout(function(){
    var sel=$('mdel_razon');
    if(sel) sel.onchange=function(){ var w=$('mdel_otro_wrap'); if(w) w.style.display=sel.value==='Otro'?'block':'none'; };
  },50);
  S.saveFn=function(){
    var razon=($('mdel_razon')&&$('mdel_razon').value)||'';
    if(razon==='Otro') razon=(($('mdel_otro')&&$('mdel_otro').value)||'').trim()||'Otro';
    if(!razon){ toast('Debes seleccionar una razón','error'); return false; }
    var devolver=(document.querySelector('input[name="mdel_retorno"]:checked')||{}).value!=='no';
    var audit={
      eliminado:true,
      eliminadoPor:(S.currentUser&&S.currentUser.nombre)||'Administrador',
      eliminadoPorUid:(S.currentUser&&S.currentUser.uid)||'',
      eliminadoEn:new Date().toISOString(),
      eliminadoRazon:razon,
      eliminacionReversaCuenta:devolver
    };
    Object.assign(S.motos[i],audit);
    DB.saveMoto(S.motos[i]);
    // Reverso de gastos y movimientos
    _mpagoReversarGastos(m.id, devolver, audit);
    closeM(); nav('motos');
    toast('Moto eliminada'+(devolver?' · Dinero devuelto a las cuentas':' · Sin reverso a cuentas'),'info');
    return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    +'<button class="btn btn-d" onclick="saveM()">Eliminar</button>';
  $('ov').style.display='flex';
}

// ══════════════════════════════════════════
