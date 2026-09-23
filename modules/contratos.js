// Pagasi module: contratos
PG.contratos = function(){
  var credsActivos = S.creds.filter(function(c){return !c.eliminado && c.estado!=='cancelado' && c.estado!=='recuperado' && c.estado!=='recuperada';});
  var credsArchivados = S.creds.filter(function(c){return !c.eliminado && (c.estado==='cancelado' || c.estado==='recuperado' || c.estado==='recuperada');});

  // ═══════════ MÉTRICAS DE CONTRATOS ═══════════
  var totalContratos = credsActivos.length + credsArchivados.length;
  var enMora = credsActivos.filter(function(c){return c.mora>0;}).length;
  var porVencer30d = credsActivos.filter(function(c){
    if(!c.fecha) return false;
    var dias = Math.floor((parseFechaLocal(c.fecha).getTime() + (c.plazo||12)*30*24*60*60*1000 - Date.now())/(1000*60*60*24));
    return dias>0 && dias<=30;
  }).length;

  // Valor total de contratos
  var valorActivos = credsActivos.reduce(function(a,c){return a+(parseFloat(c.total)||0);},0);
  var valorArchivados = credsArchivados.reduce(function(a,c){return a+(parseFloat(c.total)||0);},0);

  // Contratos del mes
  var hoy = new Date();
  var iniMes = fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  var nuevosMes = credsActivos.filter(function(c){return c.fecha && c.fecha >= iniMes;}).length;

  // Contratos por tipo de documento (contamos los 3 tipos)
  // Promedio de plazo y cuota
  var plazoProm = credsActivos.length ? Math.round(credsActivos.reduce(function(a,c){return a+(parseFloat(c.plazo)||0);},0)/credsActivos.length) : 0;
  var cuotaProm = credsActivos.length ? credsActivos.reduce(function(a,c){return a+(parseFloat(c.cuotaM)||0);},0)/credsActivos.length : 0;

  // Clientes recientes
  // Mas nuevo arriba, como en Creditos: fecha mas reciente primero y, dentro del
  // mismo dia, el numero de credito mas alto (Adam, 17-sep-2026: el listado
  // mostraba los 15 del dia en orden ascendente y "no se sabia que orden era").
  var _ctrNum = function(c){ return parseInt(String(c.id||'').replace(/\D/g,''), 10) || 0; };
  var _ctrOrden = function(a,b){
    var f = String(b.fecha||'').localeCompare(String(a.fecha||''));
    return f !== 0 ? f : (_ctrNum(b) - _ctrNum(a));
  };
  var credsRecientes = credsActivos.slice().sort(_ctrOrden).slice(0,6);

  // Distribución por estado
  var activos = credsActivos.filter(function(c){return c.estado==='activo' && (!c.mora||c.mora===0);}).length;
  var activosMora = credsActivos.filter(function(c){return c.mora>0;}).length;
  var completados = credsActivos.filter(function(c){return c.estado==='completado';}).length;
  var recuperados = credsArchivados.filter(function(c){return c.estado==='recuperado' || c.estado==='recuperada';}).length;
  var cancelados = credsArchivados.filter(function(c){return c.estado==='cancelado';}).length;

  return`<div class="page">

  ${pageBanner(
    'Gestión documental · Legal',
    'Contratos y Documentos',
    '<b>'+totalContratos+'</b> contratos · Valor cartera: <b>'+fmt(valorActivos)+'</b> · +'+nuevosMes+' este mes',
    [
      {label:'↓ Exportar CSV', onclick:"exportarCSV('creditos')"},
      {label:'Vista previa', onclick:'renderContrato()'},
      {label:'↓ Descargar PDF', onclick:'descargarContratoPDF()', primary:true}
    ]
  )}


  <!-- ═══ LISTADO DE CONTRATOS (en lista, como Clientes y Créditos) ═══ -->
  ${totalContratos?`<div class="card" style="margin-bottom:14px">
    <div class="ch">
      <div>
        <div class="ct">Listado de contratos</div>
        <div class="cs">${totalContratos} contrato${totalContratos!==1?'s':''} · click en una fila para ver el detalle</div>
      </div>
      <div class="srch" style="width:260px"><span class="srch-i">◆</span><input type="text" id="ctrQ" placeholder="Buscar por ID, cliente, modelo, concesionario..." oninput="var q=this.value.toLowerCase();var rs=document.querySelectorAll('#ctr-tbody tr');for(var i=0;i&lt;rs.length;i++){rs[i].style.display=(rs[i].getAttribute('data-s')||'').indexOf(q)>=0?'':'none';}" style="width:100%"></div>
    </div>
    <div class="tw tw-compact"><table>
      <thead><tr>
        <th>ID</th><th>Cliente</th><th>Modelo</th><th>Concesionario</th><th>Fecha</th><th style="white-space:nowrap">Total</th><th>Estado</th><th style="text-align:right">Acciones</th>
      </tr></thead>
      <tbody id="ctr-tbody">${credsActivos.concat(credsArchivados).sort(_ctrOrden).map(function(c){
        var estColor = c.mora>0 ? 'var(--red)' : (c.estado==='completado' ? 'var(--green)' : ((c.estado==='cancelado'||c.estado==='recuperado'||c.estado==='recuperada') ? '#6b7280' : 'var(--p1)'));
        var estLabel = c.mora>0 ? ('En mora '+c.mora+'d') : (c.estado==='completado' ? 'Completado' : (c.estado==='cancelado' ? 'Cancelado' : ((c.estado==='recuperado'||c.estado==='recuperada') ? 'Recuperado' : 'Activo')));
        var fechaFmt = c.fecha ? parseFechaLocal(c.fecha).toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
        var concNom = (c.concesionarioId && typeof _concGetById==='function') ? ((_concGetById(c.concesionarioId)||{}).nombre||'') : '';
        var s = (c.id+' '+(c.cli||'')+' '+(c.modelo||'')+' '+concNom+' '+estLabel).toLowerCase().replace(/"/g,'');
        return '<tr data-s="'+s+'" style="cursor:pointer" onclick="openAmort(\''+c.id+'\')">'
          +'<td class="tdm" style="font-family:var(--fd)">'+c.id+'</td>'
          +'<td style="max-width:180px"><div class="tdm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+(c.cli||'')+'">'+(c.cli||'—')+'</div></td>'
          +'<td class="tds">'+(c.modelo||'—')+'</td>'
          +'<td class="tds" style="max-width:150px"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+concNom+'">'+(concNom||'—')+'</div></td>'
          +'<td class="tds" style="font-family:var(--fd);font-size:11px;color:var(--ink3);white-space:nowrap">'+fechaFmt+'</td>'
          +'<td style="font-family:var(--fd);font-weight:700;white-space:nowrap">'+fmt(c.total||0)+'</td>'
          +'<td><span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:9.5px;font-weight:800;color:#fff;background:'+estColor+';white-space:nowrap">'+estLabel+'</span></td>'
          +'<td onclick="event.stopPropagation()" style="white-space:nowrap;text-align:right"><div style="display:inline-flex;gap:4px">'
            +'<button class="btn btn-g btn-xs" onclick="event.stopPropagation();verContratoById(\''+c.id+'\')" title="Ver contrato">Ver</button>'
            +'<button class="btn btn-p btn-xs" onclick="descargarContratoPDFById(\''+c.id+'\')" title="Descargar PDF">↓ PDF</button>'
          +'</div></td>'
          +'</tr>';
      }).join('')}</tbody>
    </table></div>
  </div>`:''}

  <!-- ═══ GENERADOR + VISTA PREVIA ═══ -->
  <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:12px">
    <div class="card">
      <div class="ch">
        <div>
          <div class="ct">️ Generador de Contrato</div>
          <div class="cs">Selecciona crédito y tipo de documento</div>
        </div>
      </div>
      <div class="fgr c1" style="gap:9px;margin-top:12px">
        <div class="fg"><label> Cliente / Crédito</label><select class="fs" id="sel-cred" onchange="onCredContratoChange()">${credsActivos.map(c=>`<option value="${c.id}">${c.id} — ${c.cli} · ${c.modelo}</option>`).join('')||'<option value="">— Sin créditos activos —</option>'}</select></div>
        <div class="fg"><label> Tipo de documento</label><select class="fs" id="sel-tipo-doc" onchange="renderContrato()"><option value="protect">Financiamiento + Pagasi Protect</option></select></div>
      </div>
      <div style="margin-top:12px;padding:12px 14px;background:linear-gradient(135deg,rgba(37,99,235,.06),rgba(124,109,255,.03));border:1px solid rgba(37,99,235,.15);border-radius:10px;font-size:11.5px;color:var(--ink2);line-height:1.5">
        <div style="display:flex;align-items:flex-start;gap:8px">
          <span style="font-size:14px"></span>
          <div><b style="color:var(--p1)">Autocompletado inteligente:</b> se toman los datos de la empresa (Configuración), del cliente asignado y de la moto del crédito. Verifica que toda la información esté actualizada antes de descargar.</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px">
        <button class="btn btn-p btn-sm" onclick="onCredContratoChange()">️ Vista Previa</button>
        <button class="btn btn-g btn-sm" onclick="descargarContratoPDF()">↓ Descargar PDF</button>
      </div>

      <!-- Impresión por lote: todos los contratos de una fecha en un solo documento -->
      <div style="margin-top:11px;padding:11px 12px;background:var(--surf2);border:1px solid var(--rim);border-radius:10px">
        <div style="font-size:11.5px;font-weight:800;color:var(--p1);margin-bottom:7px">Imprimir por lote</div>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
          <input type="date" class="fi" id="ctr-fecha-lote" value="${hoyLocalISO()}" style="flex:1;min-width:135px">
          <button class="btn btn-p btn-sm" onclick="imprimirContratosDelDia()" style="white-space:nowrap">Contratos del día</button>
        </div>
        <div style="font-size:10.5px;color:var(--ink3);margin-top:6px">Genera el contrato único (venta + cesión) de todos los créditos de esa fecha, en un solo documento.</div>
      </div>

      <!-- Lista de contratos activos -->
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--rim)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div class="ct" style="margin:0"> Contratos Activos</div>
          <span style="background:var(--p1);color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:800">${credsActivos.length}</span>
        </div>
        <div class="lst" style="max-height:260px;overflow-y:auto">${credsActivos.length?credsActivos.map(function(c){
          var col = c.mora>0?'var(--red)':'var(--green)';
          return '<div class="li" style="">'
            +'<div class="li-ic" style="background:var(--gs)">CTR</div>'
            +'<div style="flex:1;min-width:0">'
            +'<div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.id+' — '+c.cli+'</div>'
            +'<div style="font-size:10.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.modelo+' · '+c.fecha+(c.mora>0?' · <span style="color:var(--red);font-weight:700">Mora '+c.mora+'d</span>':'')+'</div>'
            +'</div>'
            +'<button class="btn btn-g btn-xs" onclick="descargarContratoPDFById(\''+c.id+'\')" title="Descargar PDF">↓</button>'
            +'</div>';
        }).join(''):'<div style="text-align:center;padding:24px 10px;color:var(--ink3);font-size:12px"><span style="font-size:28px;display:block;margin-bottom:6px;opacity:.3"></span>Sin contratos activos</div>'}</div>
      </div>

      <!-- Archivados -->
      ${credsArchivados.length?`<div style="margin-top:12px">
        <details style="cursor:pointer">
          <summary style="font-size:11.5px;font-weight:700;color:var(--ink3);padding:8px 12px;background:var(--gs);border:1px solid var(--rim2);border-radius:8px;list-style:none;display:flex;justify-content:space-between;align-items:center">
            <span> Archivados · ${credsArchivados.length}</span>
            <span style="opacity:.6">▾</span>
          </summary>
          <div class="lst" style="max-height:200px;overflow-y:auto;margin-top:6px">${credsArchivados.map(function(c){
            var col = c.estado==='recuperado'||c.estado==='recuperada' ? 'var(--red)' : '#6b7280';
            return '<div class="li" style="background:var(--gs);opacity:.85;">'
              +'<div class="li-ic" style="background:var(--rim)">ARC</div>'
              +'<div style="flex:1;min-width:0">'
              +'<div style="font-size:12px;font-weight:700;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.id+' — '+c.cli+'</div>'
              +'<div style="font-size:10.5px;color:var(--ink3)">'+c.modelo+' · '+c.fecha+' · <span style="color:'+col+';font-weight:700">'+c.estado+'</span></div>'
              +'</div>'
              +'<button class="btn btn-g btn-xs" onclick="descargarContratoPDFById(\''+c.id+'\')">↓</button>'
              +'</div>';
          }).join('')}</div>
        </details>
      </div>`:''}
    </div>

    <!-- Vista previa -->
    <div id="cz">
      <div class="card" style="padding:40px 24px;text-align:center">
        <div style="font-size:56px;margin-bottom:14px;opacity:.2"></div>
        <div style="font-size:17px;font-weight:800;margin-bottom:6px">Vista previa del contrato</div>
        <div style="font-size:12px;color:var(--ink3);max-width:360px;margin:0 auto 18px;line-height:1.6">
          Selecciona un crédito activo de la lista de la izquierda y haz clic en <b>"Vista Previa"</b> para ver el documento generado.
        </div>
        <div style="display:inline-flex;gap:6px;padding:8px 14px;background:var(--surf2);border-radius:100px;font-size:11px;color:var(--ink3)">
          <span></span>
          <span>Los datos se toman automáticamente de Configuración</span>
        </div>
      </div>

      <!-- Checklist legal -->
      <div class="card" style="margin-top:12px;padding:14px">
        <div style="font-size:12.5px;font-weight:800;margin-bottom:10px"> Checklist legal antes de firmar</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${['Verificar datos del cliente y de la moto','Revisar el plazo y cuotas acordados','Confirmar datos de la empresa y representante','Validar las condiciones especiales','Obtener firma y copia de cédula'].map(function(t){
            return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surf2);border-radius:6px;font-size:11.5px"><span style="color:var(--green);font-weight:900">✓</span><span>'+t+'</span></div>';
          }).join('')}
        </div>
      </div>
    </div>

  </div>

  <!-- ═══ TIPOS DE DOCUMENTOS (al fondo) ═══ -->
  <div class="card" style="margin-top:14px">
    <div class="ch">
      <div>
        <div class="ct">Tipos de documentos</div>
        <div class="cs">Plantillas disponibles</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px">
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:linear-gradient(135deg,rgba(37,99,235,.08),rgba(124,109,255,.04));border:1px solid rgba(37,99,235,.2);border-radius:10px">
        <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,var(--p1),#60A5FA);flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-size:12.5px;font-weight:800">Contrato de Arrendamiento</div>
          <div style="font-size:10.5px;color:var(--ink3);margin-top:1px">Con Opción a Compra</div>
        </div>
        <span style="background:var(--green);color:#fff;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800">ACTIVO</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surf2);border:1px solid var(--rim2);border-radius:10px">
        <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,var(--amber),#ffa94d);flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-size:12.5px;font-weight:800">Pagaré</div>
          <div style="font-size:10.5px;color:var(--ink3);margin-top:1px">Documento ejecutivo de deuda</div>
        </div>
        <span style="background:var(--green);color:#fff;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800">ACTIVO</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surf2);border:1px solid var(--rim2);border-radius:10px">
        <div style="width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,var(--blue,#3b82f6),#60a5fa);flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-size:12.5px;font-weight:800">Carta de Instrucciones</div>
          <div style="font-size:10.5px;color:var(--ink3);margin-top:1px">Instrucciones de pago y cobro</div>
        </div>
        <span style="background:var(--green);color:#fff;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:800">ACTIVO</span>
      </div>
    </div>
  </div>
  </div>`;
};

