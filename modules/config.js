// Pagasi module: config
PG.config = function(){
  setTimeout(function(){
    if(!db) return;
    db.collection('config').doc('empresa').get().then(function(doc){
      if(!doc.exists) return;
      var d=doc.data();
      if($('cfg_empresa'))$('cfg_empresa').value=d.nombre||'';
      if($('cfg_rif')) $('cfg_rif').value=d.rif||'';
      if($('cfg_ciudad')) $('cfg_ciudad').value=d.ciudad||'';
      if($('cfg_tel')) $('cfg_tel').value=d.tel||'';
      if($('cfg_email2')) $('cfg_email2').value=d.email||'';
      if($('cfg_direccion')) $('cfg_direccion').value=d.direccion||'';
      if($('cfg_representante'))$('cfg_representante').value=d.representante||'';
      if($('cfg_rep_ci')) $('cfg_rep_ci').value=d.repCI||'';
      if($('cfg_rep_cargo')) $('cfg_rep_cargo').value=d.repCargo||'';
      if($('cfg_rep_doc')) $('cfg_rep_doc').value=d.repDoc||'';
      if($('cfg_rm')) $('cfg_rm').value=d.rm||'';
      if($('cfg_rm_estado')) $('cfg_rm_estado').value=d.rmEstado||'';
      if($('cfg_rm_fecha')) $('cfg_rm_fecha').value=d.rmFecha||'';
      if($('cfg_rm_num')) $('cfg_rm_num').value=d.rmNum||'';
      if($('cfg_rm_tomo')) $('cfg_rm_tomo').value=d.rmTomo||'';
      if($('cfg_banco_usd')) $('cfg_banco_usd').value=d.bancoUsd||'';
      if($('cfg_cuenta_usd')) $('cfg_cuenta_usd').value=d.cuentaUsd||'';
      if($('cfg_billetera')) $('cfg_billetera').value=d.billetera||'';
      if($('cfg_billetera_cuenta')) $('cfg_billetera_cuenta').value=d.billeteraCuenta||'';
      if($('cfg_cuenta_bs')) $('cfg_cuenta_bs').value=d.cuentaBs||'';
      if($('cfg_pago_movil')) $('cfg_pago_movil').value=d.pagoMovil||'';
    });
    db.collection('config').doc('plan').get().then(function(doc){
      if(!doc.exists) return;
      var d=doc.data();
      if(Object.prototype.hasOwnProperty.call(d,'factor')){PLAN.factor=d.factor;if($('cfg_factor'))$('cfg_factor').value=d.factor;}
      if(Object.prototype.hasOwnProperty.call(d,'inicial')){PLAN.inicial=d.inicial;if($('cfg_ini'))$('cfg_ini').value=(d.inicial*100);}
      if(Object.prototype.hasOwnProperty.call(d,'tasaMensual')){PLAN.tasaMensual=d.tasaMensual;if($('cfg_tasa_mensual'))$('cfg_tasa_mensual').value=d.tasaMensual;}
      if(Object.prototype.hasOwnProperty.call(d,'plazo')){PLAN.plazo=d.plazo;if($('cfg_plazo'))$('cfg_plazo').value=d.plazo;}
      if(Object.prototype.hasOwnProperty.call(d,'apy')){PLAN.apy=d.apy;}
      var graciaCfg=Object.prototype.hasOwnProperty.call(d,'diasGracia')?d.diasGracia:d.gracia;
      if(typeof graciaCfg!=='undefined'&&graciaCfg!==null){PLAN.diasGracia=graciaCfg;if($('cfg_gracia'))$('cfg_gracia').value=graciaCfg;}
      var moraCfg=Object.prototype.hasOwnProperty.call(d,'moraPct')?d.moraPct:d.mora_pct;
      if(typeof moraCfg!=='undefined'&&moraCfg!==null){PLAN.moraPct=moraCfg;if($('cfg_mora'))$('cfg_mora').value=moraCfg;}
    });
    db.collection('config').doc('tasa').get().then(function(doc){
      if(doc.exists&&doc.data().tasaBs){window._tasaBsGlobal=doc.data().tasaBs;if($('cfg_tasa_bs'))$('cfg_tasa_bs').value=doc.data().tasaBs;}
    });
    db.collection('config').doc('cuentasBanc').get().then(function(doc){
      renderCuentasBanc(doc.exists&&doc.data().lista?doc.data().lista:[]);
    }).catch(function(){renderCuentasBanc([]);});
    db.collection('config').doc('cobradores').get().then(function(doc){
      renderCobradores(doc.exists?doc.data().lista:['Juan Admin']);
    });
  },80);

  var cfgTab = window._cfgTab || 'empresa';

  return`<div class="page">

  ${pageBanner(
    'Sistema · Configuración general',
    'Configuración',
    'Empresa, plan financiero, cuentas, cobradores y sistema',
    [{label:'↻ Sincronizar', onclick:'recargarDesdeFirebase()'}]
  )}

  <!-- Estado Firebase — stat compacto -->
  <div class="sg" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">
    <div class="stat">
      <div class="st-v" style="color:${db?'var(--green)':'var(--red)'};font-size:20px">${db?'✓ Online':'✕ Local'}</div>
      <div class="st-l">Firebase</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${db?'Datos en la nube':'Sin sincronización'}</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="font-size:20px;color:var(--p1)">${PLAN.factor}x</div>
      <div class="st-l">Factor activo</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">Plan ${PLAN.plazo} meses</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="font-size:20px;color:var(--amber)">${window._tasaBsGlobal||1} Bs</div>
      <div class="st-l">Tasa de cambio</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">por dólar</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="font-size:20px">${PLAN.inicial*100}% ini · ${PLAN.moraPct||2.5}% mora</div>
      <div class="st-l">Parámetros clave</div>
      <div style="font-size:10px;color:var(--ink3);margin-top:2px">${(PLAN.diasGracia!=null?PLAN.diasGracia:5)}d de gracia</div>
    </div>
  </div>

  <!-- Tabs de configuración -->
  <div style="display:flex;gap:0;border-bottom:2px solid var(--rim);margin-bottom:16px">
    ${[
      ['empresa','🏢 Empresa'],
      ['financiero','📊 Plan Financiero'],
      ['pagos','💳 Cuentas y Cobros'],
      ['sistema','⚙️ Sistema'],
    ].map(([k,l])=>'<button onclick="window._cfgTab=\''+k+'\';nav(\'config\')" style="background:none;border:none;padding:11px 18px;font-size:13px;font-weight:'+(cfgTab===k?800:600)+';color:'+(cfgTab===k?'var(--p1)':'var(--ink3)')+';border-bottom:'+(cfgTab===k?'3px solid var(--p1)':'3px solid transparent')+';margin-bottom:-2px;cursor:pointer;font-family:var(--f);transition:color .15s">'+l+'</button>').join('')}
  </div>

  <!-- TAB: EMPRESA -->
  <div id="cfg-tab-empresa" style="display:${cfgTab==='empresa'?'block':'none'}">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">

      <div class="card">
        <div class="ch"><div><div class="ct">Datos de la Empresa</div><div class="cs">Aparecen en contratos, reportes y documentos</div></div></div>
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:6px">
          <div class="fg"><label>Nombre de la empresa *</label><input class="fi" id="cfg_empresa" placeholder="Pagasi — Financiamiento de Motos"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="fg"><label>RIF</label><input class="fi" id="cfg_rif" placeholder="J-00000000-0"></div>
            <div class="fg"><label>Ciudad</label><input class="fi" id="cfg_ciudad" placeholder="Caracas"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="fg"><label>Teléfono</label><input class="fi" id="cfg_tel" placeholder="0212-555-0000"></div>
            <div class="fg"><label>Email</label><input class="fi" id="cfg_email2" type="email" placeholder="info@pagasi.com"></div>
          </div>
          <div class="fg"><label>Domicilio fiscal</label><input class="fi" id="cfg_direccion" placeholder="Av. Principal, Edif. X, Piso Y, Caracas"></div>
          <div style="margin-top:4px;padding-top:9px;border-top:1px dashed var(--rim2)">
            <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);margin-bottom:7px">Datos registrales · salen en los contratos</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div class="fg"><label>Registro Mercantil</label><input class="fi" id="cfg_rm" placeholder="Ej: Segundo"></div>
              <div class="fg"><label>Circunscripción del Estado</label><input class="fi" id="cfg_rm_estado" placeholder="Ej: Miranda"></div>
            </div>
            <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:8px;margin-top:8px">
              <div class="fg"><label>Fecha de inscripción</label><input class="fi" id="cfg_rm_fecha" placeholder="Ej: 12/03/2024"></div>
              <div class="fg"><label>N°</label><input class="fi" id="cfg_rm_num" placeholder="Ej: 18"></div>
              <div class="fg"><label>Tomo</label><input class="fi" id="cfg_rm_tomo" placeholder="Ej: 145-A"></div>
            </div>
            <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);margin:12px 0 7px">Cuentas que salen en el contrato</div>
            <div style="display:grid;grid-template-columns:1.2fr 1.2fr 1fr;gap:8px">
              <div class="fg"><label>Banco</label><input class="fi" id="cfg_banco_usd" placeholder="Ej: 100% Banco Universal"></div>
              <div class="fg"><label>N° de cuenta en dólares</label><input class="fi" id="cfg_cuenta_usd" placeholder="Ej: 0156-0030-61-0301030586"></div>
              <div class="fg"><label>N° de cuenta en bolívares</label><input class="fi" id="cfg_cuenta_bs" placeholder="Ej: 0156-0030-63-0202268129"></div>
              <div class="fg"><label>Pago Móvil (teléfono)</label><input class="fi" id="cfg_pago_movil" placeholder="Ej: 0424-4433312"></div>
              <div class="fg"><label>Billetera digital</label><input class="fi" id="cfg_billetera" placeholder="Ej: Binance (USDT)"></div>
              <div class="fg"><label>Correo o usuario de la billetera</label><input class="fi" id="cfg_billetera_cuenta" placeholder="Ej: pagos@tuempresa.com"></div>
            </div>
          </div>
          <div style="padding-top:8px;border-top:1px solid var(--rim2)">
            <button class="btn btn-p btn-sm" onclick="guardarEmpresa()">Guardar empresa</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="ch"><div><div class="ct">Representante Legal</div><div class="cs">Firma los contratos y documentos legales</div></div></div>
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:6px">
          <div class="fg"><label>Nombre completo *</label><input class="fi" id="cfg_representante" placeholder="Juan Pérez García"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="fg"><label>Cédula de Identidad</label><input class="fi" id="cfg_rep_ci" placeholder="00.000.000"></div>
            <div class="fg"><label>Cargo</label><input class="fi" id="cfg_rep_cargo" placeholder="Ej: Director"></div>
          </div>
          <div class="fg"><label>Facultad según consta en</label><input class="fi" id="cfg_rep_doc" placeholder="Ej: Acta de Asamblea del 12/03/2024"></div>
          <div style="background:var(--gs);border-radius:9px;padding:11px 13px;font-size:11.5px;color:var(--ink2);line-height:1.55">
            <b style="color:var(--p1)">Tip:</b> Estos datos se insertan automáticamente en los contratos de venta en cuotas y documentos notariales.
          </div>
          <div style="padding-top:8px;border-top:1px solid var(--rim2)">
            <button class="btn btn-p btn-sm" onclick="guardarEmpresa()">Guardar representante</button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- TAB: PLAN FINANCIERO -->
  <div id="cfg-tab-financiero" style="display:${cfgTab==='financiero'?'block':'none'}">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">

      <div class="card">
        <div class="ch"><div><div class="ct">Plan Financiero Principal</div><div class="cs">Parámetros base del sistema de crédito</div></div></div>
        <!-- Preview actual -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 14px">
          ${[['Factor',PLAN.factor+'x','var(--p1)'],['Inicial',PLAN.inicial*100+'%','var(--blue)'],['Tasa/mes',PLAN.tasaMensual+'%','var(--amber)'],['Plazo',PLAN.plazo+'m','var(--green)']].map(([l,v,c])=>`
          <div style="background:var(--surf2);border-radius:9px;padding:9px;text-align:center;border:1px solid var(--rim)">
            <div style="font-family:var(--fd);font-weight:900;font-size:18px;color:${c}">${v}</div>
            <div style="font-size:9.5px;color:var(--ink3);font-weight:700;text-transform:uppercase;letter-spacing:.3px;margin-top:2px">${l}</div>
          </div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div class="fg"><label>Factor de financiamiento (×)</label><input class="fi" id="cfg_factor" type="number" step="0.0001" value="${PLAN.factor}"></div>
          <div class="fg"><label>Inicial mínima (%)</label><input class="fi" id="cfg_ini" type="number" step="0.01" value="${PLAN.inicial*100}"></div>
          <div class="fg"><label>Tasa mensual (%)</label><input class="fi" id="cfg_tasa_mensual" type="number" step="0.01" value="${PLAN.tasaMensual}"></div>
          <div class="fg"><label>Plazo en meses</label><input class="fi" id="cfg_plazo" type="number" min="1" step="1" value="${PLAN.plazo}"></div>
        </div>
        <div style="padding-top:10px;border-top:1px solid var(--rim2);margin-top:4px">
          <button class="btn btn-p btn-sm" onclick="guardarPlan()">Guardar plan financiero</button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px">

        <div class="card">
          <div class="ch"><div><div class="ct">Mora y Gracia</div><div class="cs">Penalización por atraso</div></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
            <div class="fg"><label>Días de gracia</label><input class="fi" id="cfg_gracia" type="number" value="${(PLAN.diasGracia!=null?PLAN.diasGracia:5)}"><div style="font-size:10px;color:var(--ink3);margin-top:3px">Días sin penalización tras vencer</div></div>
            <div class="fg"><label>% mora mensual</label><input class="fi" id="cfg_mora" type="number" step="0.1" value="${PLAN.moraPct||2.5}"><div style="font-size:10px;color:var(--ink3);margin-top:3px">Se aplica tras días de gracia</div></div>
          </div>
          <div style="padding-top:8px;border-top:1px solid var(--rim2);margin-top:4px">
            <button class="btn btn-p btn-sm" onclick="guardarPlan()">Guardar</button>
          </div>
        </div>

        <div class="card">
          <div class="ch"><div><div class="ct">Tasa de Cambio Bs./$</div><div class="cs">Actualización automática diaria · ve.dolarapi.com · BCV oficial</div></div>
            <button class="btn btn-g btn-sm" onclick="bcvForzarActualizacion()">↻ Actualizar ahora</button>
          </div>
          <div id="bcv-auto-badge" style="margin:10px 0">${(typeof _bcvBadgeHTML==='function')?_bcvBadgeHTML():''}</div>
          <div style="border-top:1px solid var(--rim2);padding-top:10px;margin-top:4px">
            <div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Ajuste manual (solo si es necesario)</div>
            <div style="display:flex;gap:8px;align-items:flex-end">
              <div class="fg" style="flex:1"><label>Tasa manual (Bs. por $1)</label><input class="fi" id="cfg_tasa_bs" type="number" step="0.01" min="1" placeholder="Ej: 480.25" value="${window._tasaBsGlobal||1}"></div>
              <button class="btn btn-p btn-sm" style="margin-bottom:1px;flex-shrink:0" onclick="guardarTasaBs()">Guardar manual</button>
            </div>
            <div style="font-size:10.5px;color:var(--ink3);margin-top:6px;line-height:1.5">La tasa se actualiza sola cada día al abrir la app. Usa el ajuste manual solo si la tasa automática falla.</div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- TAB: CUENTAS Y COBROS -->
  <div id="cfg-tab-pagos" style="display:${cfgTab==='pagos'?'block':'none'}">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">

      <div class="card" style="grid-column:1/-1">
        <div class="ch">
          <div><div class="ct">Portal del cliente (Mi Cuenta)</div><div class="cs">Prepara los datos para que los clientes entren con su teléfono y código SMS</div></div>
          <button class="btn btn-p btn-sm" onclick="portalNormalizar()">Revisar datos</button>
        </div>
        <div style="font-size:11.5px;color:var(--ink3);line-height:1.6;margin-top:8px">
          Normaliza las cédulas y los teléfonos de todos los clientes a un formato único y arma el índice que usa el portal.
          Primero muestra un informe de lo que va a cambiar; no escribe nada hasta que lo confirmes.
        </div>
      </div>

      <div class="card">
        <div class="ch">
          <div><div class="ct">Cuentas Bancarias</div><div class="cs">Métodos disponibles para cobros y pagos</div></div>
          <button class="btn btn-p btn-sm" onclick="agregarCuentaBanc()">＋ Agregar</button>
        </div>
        <div id="cuentasBanc-list" style="display:flex;flex-direction:column;gap:6px;margin-top:10px">
          <div style="color:var(--ink3);font-size:12px;padding:8px 0">Cargando...</div>
        </div>
      </div>

      <div class="card">
        <div class="ch">
          <div><div class="ct">Cobradores</div><div class="cs">Usuarios asignables a créditos y cobros</div></div>
          <button class="btn btn-p btn-sm" onclick="agregarCobrador()">＋ Agregar</button>
        </div>
        <div id="cobradores-list" style="margin-top:10px">
          <div style="color:var(--ink3);font-size:12px;padding:8px 0">Cargando...</div>
        </div>
      </div>

    </div>
  </div>

  <!-- TAB: SISTEMA -->
  <div id="cfg-tab-sistema" style="display:${cfgTab==='sistema'?'block':'none'}">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <!-- Sincronización Firebase -->
      <div class="card" style="">
        <div class="ch"><div><div class="ct">Sincronización Firebase</div><div class="cs">Estado de conexión y caché local</div></div></div>
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${db?'var(--greens)':'var(--reds)'};border-radius:9px;margin:8px 0;border:1px solid ${db?'rgba(0,184,118,.2)':'rgba(217,59,90,.2)'}">
          <div style="width:10px;height:10px;border-radius:50%;background:${db?'var(--green)':'var(--red)'};flex-shrink:0"></div>
          <div>
            <div style="font-weight:700;font-size:13px;color:${db?'var(--green)':'var(--red)'}">${db?'Firebase conectado':'Sin conexión Firebase'}</div>
            <div style="font-size:11px;color:var(--ink3)">${db?((typeof FIREBASE_CONFIG!=='undefined'&&FIREBASE_CONFIG.projectId)||'firebase')+' · datos en la nube':'Los datos son locales y temporales'}</div>
          </div>
          <a href="https://console.firebase.google.com" target="_blank" rel="noopener" class="btn btn-g btn-xs" style="margin-left:auto">Consola →</a>
        </div>
        <div style="font-size:12px;color:var(--ink2);line-height:1.55;margin-bottom:12px">Limpia el caché local y vuelve a cargar todos los datos desde Firebase: empresa, plan, tasa, cuentas, cobradores, clientes, créditos y pagos.</div>
        <button class="btn btn-p btn-sm" onclick="recargarDesdeFirebase()">↻ Limpiar caché y recargar</button>
      </div>

      <!-- Reglas Firestore -->
      <div class="card" style="">
        <div class="ch">
          <div><div class="ct">Reglas de Seguridad Firestore</div><div class="cs">Copia en Firebase Console → Firestore → Reglas</div></div>
          <a href="https://console.firebase.google.com" target="_blank" rel="noopener" class="btn btn-g btn-sm">Abrir →</a>
        </div>
        <pre style="font-family:monospace;font-size:11px;background:var(--surf2);border:1px solid var(--rim);padding:12px 14px;border-radius:9px;overflow-x:auto;color:var(--ink);margin:10px 0 0;line-height:1.7">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}</pre>
      </div>

      <!-- Backup -->
      <div class="card" style="">
        <div class="ch"><div><div class="ct">Backup y Restauración</div><div class="cs">Exporta o importa todos los datos</div></div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:10px">
          <div>
            <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);margin-bottom:8px">Exportar</div>
            <div style="display:flex;flex-direction:column;gap:5px">
              <button class="btn btn-p btn-sm" onclick="exportarBackupJSON()" style="justify-content:flex-start">↓ Backup completo (JSON)</button>
              <button class="btn btn-g btn-sm" onclick="exportarCSV('clientes')" style="justify-content:flex-start">↓ CSV Clientes</button>
              <button class="btn btn-g btn-sm" onclick="exportarCSV('creditos')" style="justify-content:flex-start">↓ CSV Créditos</button>
              <button class="btn btn-g btn-sm" onclick="exportarCSV('pagos')" style="justify-content:flex-start">↓ CSV Pagos</button>
              <button class="btn btn-g btn-sm" onclick="exportarCSV('egresos')" style="justify-content:flex-start">↓ CSV Egresos</button>
            </div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);margin-bottom:8px">Importar</div>
            <div style="background:var(--ambers);border:1px solid rgba(232,152,10,.3);border-radius:8px;padding:9px 11px;font-size:11.5px;color:var(--amber);font-weight:600;margin-bottom:9px">La importación reemplaza todos los datos actuales.</div>
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer" class="btn btn-g btn-sm">
              ↑ Cargar archivo JSON
              <input type="file" accept=".json" onchange="importarBackupJSON(this)" style="display:none">
            </label>
          </div>
        </div>
      </div>


      <!-- Auditoría de Datos -->
      <div class="card" style="">
        <div class="ch">
          <div>
            <div class="ct" style="color:var(--red)">Auditoría de Datos</div>
            <div class="cs">Detecta pagos huérfanos (cuyo crédito fue sobreescrito o eliminado)</div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-d btn-sm" onclick="auditarPagosHuerfanos()">🔍 Pagos huérfanos</button>
            <button class="btn btn-d btn-sm" onclick="auditarCompleto()">🔬 Auditoría completa</button>
          </div>
        </div>
        <div id="audit-resultado" style="margin-top:12px"></div>
        <div id="audit-completo-resultado" style="margin-top:12px"></div>
      </div>

      <!-- Bitácora de Actividad -->
      <div class="card" style="grid-column:1 / -1">
        <div class="ch">
          <div>
            <div class="ct">Bitácora de actividad</div>
            <div class="cs">Registro de eventos del sistema: inicios de sesión, créditos, pagos, gastos, ediciones, etc.</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <select id="logs-filtro-modulo" onchange="cfgRenderLogs()" style="font-family:inherit;font-size:12px;font-weight:700;padding:6px 10px;border:1.5px solid var(--rim);border-radius:8px;background:#fff;cursor:pointer">
              <option value="">Todos los módulos</option>
              <option value="auth">Sesiones</option>
              <option value="clientes">Clientes</option>
              <option value="creditos">Créditos</option>
              <option value="pagos">Pagos</option>
              <option value="egresos">Egresos</option>
              <option value="users">Usuarios</option>
              <option value="notif">Notificaciones</option>
              <option value="config">Configuración</option>
              <option value="perfil">Perfil</option>
            </select>
            <select id="logs-filtro-usuario" onchange="cfgRenderLogs()" style="font-family:inherit;font-size:12px;font-weight:700;padding:6px 10px;border:1.5px solid var(--rim);border-radius:8px;background:#fff;cursor:pointer">
              <option value="">Todos los usuarios</option>
            </select>
            <button class="btn btn-g btn-sm" onclick="cfgRefreshLogs()">↻ Actualizar</button>
            <button class="btn btn-g btn-sm" onclick="cfgExportarLogs()">↓ Exportar CSV</button>
          </div>
        </div>
        <div id="logs-stats" style="display:flex;gap:8px;margin:10px 0;font-size:11.5px;color:var(--ink3);font-weight:600"></div>
        <div id="logs-container" style="max-height:540px;overflow-y:auto;border:1px solid var(--rim);border-radius:10px;background:var(--surf)">
          <div style="padding:32px;text-align:center;color:var(--ink3);font-size:12.5px">Cargando bitácora…</div>
        </div>
      </div>

    </div>
  </div>

  </div>`;};

// ══════════════════════════════════════════════════════
// BITÁCORA DE ACTIVIDAD
// ══════════════════════════════════════════════════════
var _logsCache = [];
var _logsLoaded = false;

function cfgLoadLogs(force){
  if(_logsLoaded && !force) { cfgRenderLogs(); return; }
  if(typeof DB === 'undefined' || !DB.getLogs){ return; }
  var cont = document.getElementById('logs-container');
  if(cont) cont.innerHTML = '<div style="padding:32px;text-align:center;color:var(--ink3);font-size:12.5px">Cargando bitácora…</div>';
  // Asegurar que los usuarios estén cargados ANTES de poblar el filtro
  var pUsuarios = Promise.resolve();
  try {
    var needUsuarios = !(typeof _usersCache !== 'undefined' && _usersCache && _usersCache.length);
    if(needUsuarios && DB.getUsuarios){
      pUsuarios = DB.getUsuarios().then(function(arr){
        if(typeof _usersCache !== 'undefined') _usersCache = Array.isArray(arr)?arr:[];
        if(S && (!S._wtUsers || !S._wtUsers.length)) S._wtUsers = Array.isArray(arr)?arr:[];
      }).catch(function(){});
    }
  } catch(e){}
  // Ejecutar logs DESPUÉS de que los usuarios estén cargados para poblar el filtro
  pUsuarios.then(function(){
  DB.getLogs(500).then(function(arr){
    _logsCache = Array.isArray(arr) ? arr : [];
    _logsLoaded = true;
    // Poblar dropdown de usuarios: union de logs + usuarios del sistema
    var userSel = document.getElementById('logs-filtro-usuario');
    if(userSel){
      var names = {};
      _logsCache.forEach(function(l){ if(l.userName) names[l.userName] = true; });
      // Sumar también los usuarios del sistema aunque no tengan logs todavía
      try {
        var lista = (typeof _usersCache !== 'undefined' && _usersCache && _usersCache.length) ? _usersCache : (S._wtUsers||[]);
        lista.forEach(function(u){ if(u && u.nombre) names[u.nombre] = true; else if(u && u.email) names[u.email] = true; });
      } catch(e){}
      // Preservar selección actual del dropdown
      var prevSel = userSel.value;
      var html = '<option value="">Todos los usuarios</option>';
      Object.keys(names).sort().forEach(function(n){ html += '<option value="'+n.replace(/"/g,'&quot;')+'">'+n+'</option>'; });
      userSel.innerHTML = html;
      if(prevSel) userSel.value = prevSel;
    }
    cfgRenderLogs();
  }).catch(function(e){
    console.warn('cargar logs:', e);
    if(cont) cont.innerHTML = '<div style="padding:32px;text-align:center;color:var(--red);font-size:12.5px">Error al cargar bitácora: '+(e.message||e)+'</div>';
  });
  }); // /pUsuarios.then
}

function cfgRefreshLogs(){ _logsLoaded = false; cfgLoadLogs(true); }

function cfgRenderLogs(){
  var cont = document.getElementById('logs-container');
  if(!cont) return;
  var fMod = (document.getElementById('logs-filtro-modulo')||{}).value || '';
  var fUser = (document.getElementById('logs-filtro-usuario')||{}).value || '';
  var filt = _logsCache.filter(function(l){
    if(fMod && l.modulo !== fMod) return false;
    if(fUser && l.userName !== fUser) return false;
    return true;
  });
  // Stats
  var stats = document.getElementById('logs-stats');
  if(stats){
    var hoy = new Date(); hoy.setHours(0,0,0,0);
    var deHoy = filt.filter(function(l){ try { return new Date(l.timestamp) >= hoy; } catch(e){ return false; }}).length;
    stats.innerHTML =
      '<span style="background:var(--gs);padding:5px 11px;border-radius:50px"><b>'+filt.length+'</b> eventos · '+
      '<b style="color:var(--p1)">'+deHoy+'</b> de hoy · '+
      'mostrando los '+Math.min(filt.length,500)+' más recientes</span>';
  }
  if(!filt.length){
    // Mensaje inteligente: si el cache base también está vacío, sugerir revisar reglas
    var msgVacio = _logsCache.length === 0
      ? '<div style="padding:48px 24px;text-align:center;color:var(--ink3);font-size:13px;line-height:1.6">'
        +'<div style="font-size:32px;margin-bottom:12px;opacity:.5">📋</div>'
        +'<div style="font-weight:700;color:var(--ink2);margin-bottom:6px">Aún no hay eventos registrados</div>'
        +'<div style="max-width:380px;margin:0 auto;font-size:11.5px">Verificá que las reglas de Firestore permitan escritura en la colección <code style="background:var(--surf2);padding:1px 6px;border-radius:4px">logs/{id}</code>. Después hacé alguna acción (registrar un pago, editar un cliente) y el evento aparecerá acá.</div>'
        +'</div>'
      : '<div style="padding:48px 24px;text-align:center;color:var(--ink3);font-size:12.5px">Sin eventos que coincidan con los filtros aplicados.</div>';
    cont.innerHTML = msgVacio;
    return;
  }
  var html = '';
  var colMap = {
    login:'#2563EB', logout:'#6B7280',
    cliente_creado:'#00B876', cliente_editado:'#2563EB', cliente_eliminado:'#E8335A',
    credito_creado:'#00B876', credito_editado:'#2563EB', credito_eliminado:'#E8335A',
    pago_registrado:'#00B876', pago_eliminado:'#E8335A',
    egreso_registrado:'#E8335A', egreso_eliminado:'#6B7280',
    usuario_creado:'#00B876', usuario_editado:'#2563EB', usuario_eliminado:'#E8335A',
    perfil_editado:'#2563EB',
    config_actualizada:'#BA7517',
    notif_enviada:'#25D366'
  };
  var labelMap = {
    login:'inició sesión', logout:'cerró sesión',
    cliente_creado:'creó un cliente', cliente_editado:'editó un cliente', cliente_eliminado:'eliminó un cliente',
    credito_creado:'creó un crédito', credito_editado:'editó un crédito', credito_eliminado:'eliminó un crédito',
    pago_registrado:'registró un pago', pago_eliminado:'eliminó un pago',
    egreso_registrado:'registró un gasto', egreso_eliminado:'eliminó un gasto',
    usuario_creado:'creó un usuario', usuario_editado:'editó un usuario', usuario_eliminado:'eliminó un usuario',
    perfil_editado:'editó su perfil',
    config_actualizada:'actualizó la configuración',
    notif_enviada:'envió una notificación'
  };
  function esc(s){ return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  // Color determinístico por nombre: hash → índice en paleta
  var USER_PALETTE = [
    {bg:'#DBEAFE', col:'#1E40AF'},  // azul
    {bg:'#FCE7F3', col:'#9D174D'},  // rosa
    {bg:'#D1FAE5', col:'#065F46'},  // verde
    {bg:'#FEF3C7', col:'#92400E'},  // ámbar
    {bg:'#EDE9FE', col:'#5B21B6'},  // violeta
    {bg:'#FEE2E2', col:'#991B1B'},  // rojo
    {bg:'#CFFAFE', col:'#155E75'},  // cian
    {bg:'#FFEDD5', col:'#9A3412'},  // naranja
    {bg:'#E0E7FF', col:'#3730A3'},  // indigo
    {bg:'#F3E8FF', col:'#6B21A8'},  // púrpura
    {bg:'#FFE4E6', col:'#9F1239'},  // pink rosa
    {bg:'#ECFCCB', col:'#365314'}   // lime
  ];
  function userColor(name){
    var s = String(name||'?').toLowerCase().trim();
    var hash = 0;
    for(var i=0;i<s.length;i++){ hash = ((hash<<5) - hash) + s.charCodeAt(i); hash = hash & 0xffffffff; }
    var idx = Math.abs(hash) % USER_PALETTE.length;
    return USER_PALETTE[idx];
  }
  function userInitials(name){
    var p = String(name||'?').split(/\s+/).filter(Boolean);
    return ((p[0]||'')[0]||'?').toUpperCase() + ((p[1]||'')[0]||'').toUpperCase();
  }
  function fmtTime(ts){
    try {
      var d = new Date(ts);
      var hoy = new Date(); hoy.setHours(0,0,0,0);
      var ayer = new Date(hoy.getTime() - 86400000);
      var dDia = new Date(d); dDia.setHours(0,0,0,0);
      var hh = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
      if(dDia.getTime() === hoy.getTime()) return 'Hoy ' + hh;
      if(dDia.getTime() === ayer.getTime()) return 'Ayer ' + hh;
      return d.toLocaleDateString('es-VE',{day:'2-digit',month:'2-digit'}) + ' ' + hh;
    } catch(e){ return ts; }
  }
  function fmtDetalle(d){
    if(!d) return '';
    if(typeof d === 'string') return d;
    var parts = [];
    Object.keys(d).forEach(function(k){
      var v = d[k];
      if(v === null || v === undefined || v === '') return;
      parts.push(k+': '+v);
    });
    return parts.join(' · ');
  }
  // ── AGRUPAR POR DÍA ──
  function _dayKey(ts){ try { var d=new Date(ts); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); } catch(e){ return 'sin-fecha'; } }
  function _dayLabel(key){
    if(key === 'sin-fecha') return 'Sin fecha';
    var hoy = new Date(); var hoyK = hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'+String(hoy.getDate()).padStart(2,'0');
    var ayer = new Date(hoy.getTime()-86400000); var ayerK = ayer.getFullYear()+'-'+String(ayer.getMonth()+1).padStart(2,'0')+'-'+String(ayer.getDate()).padStart(2,'0');
    if(key === hoyK) return 'Hoy';
    if(key === ayerK) return 'Ayer';
    try {
      var parts = key.split('-');
      var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
      return d.toLocaleDateString('es-VE', {weekday:'long', day:'numeric', month:'long'});
    } catch(e){ return key; }
  }
  function _fmtHora(ts){
    try { var d = new Date(ts); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
    catch(e){ return ''; }
  }

  // Agrupar
  var grupos = {};
  var ordenDias = [];
  filt.forEach(function(l){
    var k = _dayKey(l.timestamp);
    if(!grupos[k]){ grupos[k] = []; ordenDias.push(k); }
    grupos[k].push(l);
  });
  // Días ordenados: más recientes arriba
  ordenDias.sort(function(a,b){ return b.localeCompare(a); });

  // Renderizar día por día
  ordenDias.forEach(function(diaKey, idx){
    var eventos = grupos[diaKey];
    var label = _dayLabel(diaKey);
    var esHoy = idx === 0 && label === 'Hoy';
    // Días expandidos por default: solo HOY. Los demás colapsados.
    // Si hay filtros activos (módulo o usuario), expandir todos para que el usuario vea sin clicks.
    var hayFiltros = fMod || fUser;
    var expanded = esHoy || hayFiltros;
    var diaId = 'logs-dia-'+diaKey;

    // Header del día (sticky, clickeable para expandir/colapsar)
    html +=
      '<div style="position:sticky;top:0;z-index:2;background:linear-gradient(180deg,#FAFBFF,#F3F5FA);'
        +'padding:9px 14px;border-bottom:1px solid var(--rim);'
        +'display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;user-select:none"'
        +'onclick="cfgLogsToggleDia(\''+diaKey+'\')" data-dia="'+diaKey+'">'
        +'<div style="display:flex;align-items:center;gap:9px">'
          +'<span style="font-size:11px;color:var(--ink3);font-weight:700;width:14px;display:inline-block;text-align:center;transition:transform .2s;transform:rotate('+(expanded?'90':'0')+'deg)" class="logs-dia-caret">▶</span>'
          +'<span style="font-size:12.5px;font-weight:800;color:var(--ink);text-transform:capitalize;letter-spacing:-.2px">'+label+'</span>'
          +'<span style="font-size:10px;font-weight:700;color:var(--ink3);background:var(--surf2);padding:2px 8px;border-radius:50px">'+eventos.length+' evento'+(eventos.length!==1?'s':'')+'</span>'
        +'</div>'
        // Mini avatares de usuarios únicos del día
        +(function(){
          var uniq = {};
          eventos.forEach(function(e){ if(!uniq[e.userName]) uniq[e.userName] = userColor(e.userName); });
          var arr = Object.keys(uniq).slice(0,6);
          if(!arr.length) return '';
          return '<div style="display:flex;align-items:center;gap:-4px">'+arr.map(function(name,i){
            var c = uniq[name];
            return '<span style="width:22px;height:22px;border-radius:50%;background:'+c.bg+';color:'+c.col+';display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:9.5px;border:2px solid #fff;margin-left:'+(i===0?'0':'-7px')+';position:relative;z-index:'+(10-i)+'" title="'+esc(name)+'">'+esc(userInitials(name))+'</span>';
          }).join('')+(Object.keys(uniq).length>6?'<span style="margin-left:6px;font-size:10.5px;color:var(--ink3);font-weight:700">+'+(Object.keys(uniq).length-6)+'</span>':'')+'</div>';
        })()
      +'</div>';

    // Eventos del día
    html += '<div id="'+diaId+'" class="logs-dia-body" style="display:'+(expanded?'block':'none')+'">';
    eventos.forEach(function(l){
      var actCol = colMap[l.action] || '#6B7280';
      var lbl = labelMap[l.action] || l.action;
      var det = fmtDetalle(l.detalle);
      var target = l.target ? ' <code style="background:var(--surf2);padding:1px 6px;border-radius:4px;font-size:10.5px;color:var(--ink2);vertical-align:middle">'+esc(l.target)+'</code>' : '';
      var uc = userColor(l.userName);
      var inits = userInitials(l.userName);
      html +=
        '<div style="display:flex;align-items:flex-start;gap:11px;padding:10px 14px;border-bottom:1px solid var(--rim);background:#fff">'
          +'<div style="width:34px;height:34px;border-radius:50%;background:'+uc.bg+';color:'+uc.col+';display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11.5px;flex-shrink:0;border:1.5px solid '+uc.col+'40;letter-spacing:.3px" title="'+esc(l.userName)+'">'+esc(inits)+'</div>'
          +'<div style="flex:1;min-width:0">'
            +'<div style="font-size:13px;line-height:1.5;color:var(--ink);display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
              +'<span style="background:'+uc.bg+';color:'+uc.col+';font-weight:800;font-size:12px;padding:2px 10px;border-radius:50px;letter-spacing:-.01em">'+esc(l.userName)+'</span>'
              +'<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--ink2);font-weight:600">'
                +'<span style="width:7px;height:7px;border-radius:50%;background:'+actCol+';flex-shrink:0"></span>'
                +esc(lbl)
              +'</span>'
              +target
            +'</div>'
            +(det ? '<div style="font-size:11px;color:var(--ink3);margin-top:4px;line-height:1.5;padding-left:2px">'+esc(det)+'</div>' : '')
          +'</div>'
          +'<div style="font-size:11.5px;color:var(--ink3);font-weight:700;white-space:nowrap;flex-shrink:0;font-family:var(--fd);margin-top:3px">'+_fmtHora(l.timestamp)+'</div>'
        +'</div>';
    });
    html += '</div>';
  });
  cont.innerHTML = html;
}

// Expandir/colapsar día en la bitácora
function cfgLogsToggleDia(diaKey){
  var body = document.getElementById('logs-dia-'+diaKey);
  if(!body) return;
  var head = document.querySelector('[data-dia="'+diaKey+'"]');
  var caret = head ? head.querySelector('.logs-dia-caret') : null;
  if(body.style.display === 'none'){
    body.style.display = 'block';
    if(caret) caret.style.transform = 'rotate(90deg)';
  } else {
    body.style.display = 'none';
    if(caret) caret.style.transform = 'rotate(0deg)';
  }
}
window.cfgLogsToggleDia = cfgLogsToggleDia;

function cfgExportarLogs(){
  var fMod = (document.getElementById('logs-filtro-modulo')||{}).value || '';
  var fUser = (document.getElementById('logs-filtro-usuario')||{}).value || '';
  var filt = _logsCache.filter(function(l){
    if(fMod && l.modulo !== fMod) return false;
    if(fUser && l.userName !== fUser) return false;
    return true;
  });
  function csvCell(s){ s=String(s==null?'':s); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
  var rows = [['Fecha/hora','Usuario','Email','Acción','Módulo','Target','Detalle']];
  filt.forEach(function(l){
    var det = l.detalle ? (typeof l.detalle === 'string' ? l.detalle : JSON.stringify(l.detalle)) : '';
    rows.push([l.timestamp, l.userName||'', l.userEmail||'', l.action||'', l.modulo||'', l.target||'', det]);
  });
  var csv = rows.map(function(r){ return r.map(csvCell).join(','); }).join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'pagasi-bitacora-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Auto-cargar logs cuando el tab Sistema esté visible. Como cada cambio de tab
// hace un nav('config') completo, basta con detectar tras cada render si el
// pane de sistema está activo.
(function _autoLoadLogsObserver(){
  if(typeof window === 'undefined') return;
  if(window._logsObsInstalled) return;
  window._logsObsInstalled = true;
  // Cada vez que cambia el DOM (re-renders de config), revisar
  var checkTimer = null;
  var mo = new MutationObserver(function(){
    clearTimeout(checkTimer);
    checkTimer = setTimeout(function(){
      var pane = document.getElementById('cfg-tab-sistema');
      var cont = document.getElementById('logs-container');
      if(pane && pane.style.display !== 'none' && cont && !cont.dataset.loaded){
        cont.dataset.loaded = '1';
        cfgLoadLogs(false);
      }
    }, 150);
  });
  if(document.body) mo.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded', function(){ mo.observe(document.body,{childList:true,subtree:true}); });
})();


// ══════════════════════════════════════════════════════
// AUDITORÍA COMPLETA
// ══════════════════════════════════════════════════════
function auditCompleta(){
  var div = $('audit-resultado');
  if(!div) return;
  div.innerHTML = '<div style="color:var(--ink3);font-size:12px;padding:10px 0">Analizando datos...</div>';

  var pagos    = (S.pagos    ||[]).filter(function(p){ return !p.eliminado; });
  var creds    = (S.creds    ||[]).filter(function(c){ return !c.eliminado; });
  var clientes = (S.clientes ||[]).filter(function(c){ return !c.eliminado; });
  var motos    = (S.motos    ||[]).filter(function(m){ return !m.eliminado; });

  // Lookup maps
  var credMap    = {}; creds.forEach(function(c){ credMap[c.id]=c; });
  var clienteMap = {}; clientes.forEach(function(c){ clienteMap[String(c.id)]=c; });
  var motoMap    = {}; motos.forEach(function(m){ motoMap[String(m.id)]=m; });

  var issues = [];
  function addIssue(categoria, severidad, entidad, id, descripcion, accion, accionFn){
    issues.push({categoria:categoria, severidad:severidad, entidad:entidad, id:id, descripcion:descripcion, accion:accion, accionFn:accionFn});
  }

  // ── 1. PAGOS SIN CLIENTE ASOCIADO ──────────────────
  pagos.forEach(function(p){
    if(!p.cli || p.cli.trim()===''){
      addIssue('Pagos','alta','Pago',p.id,'Sin nombre de cliente registrado (campo cli vacío)','Ver pago',null);
    }
  });

  // ── 2. PAGOS HUÉRFANOS (crédito no existe o cliente distinto) ──
  pagos.forEach(function(p){
    if(!p.cred) return;
    var cred = credMap[p.cred];
    if(!cred){
      addIssue('Pagos','alta','Pago',p.id,
        'Crédito <strong>'+p.cred+'</strong> no existe · '+fmt(p.monto)+' · '+(p.cli||'?')+' · '+p.fecha,
        'Eliminar',function(){ _auditEliminarPagoDirecto(p.id); });
    } else if(p.cli && cred.cli && p.cli !== cred.cli){
      addIssue('Pagos','alta','Pago',p.id,
        'Cliente del pago <strong>'+p.cli+'</strong> ≠ cliente del crédito <strong>'+cred.cli+'</strong> ('+p.cred+')',
        'Eliminar',function(){ _auditEliminarPagoDirecto(p.id); });
    }
  });

  // ── 3. PAGOS DUPLICADOS ─────────────────────────────
  var pagosSeen = {};
  pagos.forEach(function(p){
    var key = (p.cred||'')+'|'+(p.fecha||'')+'|'+(p.monto||0)+'|'+(p.metodo||'');
    if(!pagosSeen[key]) pagosSeen[key]=[];
    pagosSeen[key].push(p);
  });
  Object.keys(pagosSeen).forEach(function(k){
    var group = pagosSeen[k];
    if(group.length > 1){
      group.forEach(function(p, i){
        if(i===0) return; // keep first
        addIssue('Pagos','media','Pago',p.id,
          'Posible duplicado de '+group[0].id+' · mismo crédito/fecha/monto/método · '+fmt(p.monto),
          'Eliminar',function(){ _auditEliminarPagoDirecto(p.id); });
      });
    }
  });

  // ── 4. CRÉDITOS SIN CLIENTE ─────────────────────────
  creds.forEach(function(c){
    var tieneCliente = c.clienteId
      ? !!clienteMap[String(c.clienteId)]
      : clientes.some(function(x){ return x.nombre===c.cli; });
    if(!tieneCliente){
      addIssue('Créditos','media','Crédito',c.id,
        'No se encontró cliente asociado · cli: <strong>'+(c.cli||'vacío')+'</strong> · clienteId: '+(c.clienteId||'—'),
        null,null);
    }
  });

  // ── 5. CLIENTES SIN CÉDULA ──────────────────────────
  clientes.forEach(function(c){
    if(!c.cedula || c.cedula.trim()===''){
      addIssue('Clientes','baja','Cliente',c.nombre||('ID '+c.id),
        'Sin cédula registrada',null,null);
    }
  });

  // ── 6. CÉDULAS DUPLICADAS ───────────────────────────
  var cedulaMap = {};
  clientes.forEach(function(c){
    if(!c.cedula || c.cedula.trim()==='') return;
    var norm = c.cedula.replace(/[\s.\-]/g,'').toLowerCase().replace(/^[ve]/,'');
    if(!cedulaMap[norm]) cedulaMap[norm]=[];
    cedulaMap[norm].push(c);
  });
  Object.keys(cedulaMap).forEach(function(k){
    if(cedulaMap[k].length>1){
      cedulaMap[k].forEach(function(c){
        addIssue('Clientes','alta','Cliente',c.nombre||('ID '+c.id),
          'Cédula <strong>'+c.cedula+'</strong> aparece en '+cedulaMap[k].length+' clientes: '+cedulaMap[k].map(function(x){return x.nombre;}).join(', '),
          null,null);
      });
    }
  });

  // ── 7. MOTOS FINANCIADAS SIN CRÉDITO ACTIVO ─────────
  motos.filter(function(m){ return m.estado==='financiada'; }).forEach(function(m){
    var credActivo = creds.find(function(c){
      return !c.eliminado && String(c.motoId)===String(m.id) && (c.estado==='activo'||c.estado==='mora');
    });
    if(!credActivo){
      addIssue('Motos','media','Moto',m.modelo+' (ID '+m.id+')',
        'Estado: financiada pero sin crédito activo vinculado (motoId='+m.id+')',
        null,null);
    }
  });

  // ── 8. SALDO PENDIENTE INCONSISTENTE ────────────────
  creds.filter(function(c){ return c.estado==='activo'; }).forEach(function(c){
    var pagadoReal = getCreditoPagosConfirmados(c);
    var total = parseFloat(c.total)||0;
    if(total <= 0) return;
    // pagadoReal should not exceed total
    if(pagadoReal > total + 0.01){
      addIssue('Créditos','alta','Crédito',c.id,
        'Pagos confirmados <strong>'+fmt(pagadoReal)+'</strong> superan el total del crédito <strong>'+fmt(total)+'</strong> · exceso: '+fmt(pagadoReal-total),
        null,null);
    }
    // c.pagado (counter) vs real cuotas
    var cuotaBase = parseFloat(c.cuotaQ||c.cuota)||0;
    var pagadoCounter = parseInt(c.pagado,10)||0;
    if(cuotaBase>0){
      var cuotasReales = Math.floor((pagadoReal+0.000001)/cuotaBase);
      if(Math.abs(cuotasReales - pagadoCounter) > 1){
        addIssue('Créditos','media','Crédito',c.id,
          'Contador de cuotas (<strong>'+pagadoCounter+'</strong>) no coincide con pagos registrados (<strong>'+cuotasReales+' cuotas</strong> según montos)',
          null,null);
      }
    }
  });

  // ── RENDER ──────────────────────────────────────────
  window._auditIssues = issues;

  if(issues.length===0){
    div.innerHTML='<div style="background:var(--greens);border-radius:8px;padding:14px;color:var(--green);font-weight:700;font-size:13px;text-align:center">✓ Auditoría completa — Sin discrepancias encontradas</div>';
    return;
  }

  var cats = {};
  issues.forEach(function(i){ if(!cats[i.categoria]) cats[i.categoria]=[]; cats[i.categoria].push(i); });

  var sevColor = {alta:'var(--red)', media:'var(--amber)', baja:'var(--ink3)'};
  var sevBg    = {alta:'var(--reds)', media:'var(--ambers)', baja:'var(--gs)'};

  var html = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">'
    +'<div style="font-weight:800;font-size:13px;color:var(--red)">⚠ '+issues.length+' discrepancia(s)</div>';
  ['alta','media','baja'].forEach(function(s){
    var n = issues.filter(function(i){return i.severidad===s;}).length;
    if(n) html += '<span style="background:'+sevBg[s]+';color:'+sevColor[s]+';font-size:10px;font-weight:700;padding:3px 9px;border-radius:12px">'+n+' '+s+'</span>';
  });
  html += '</div>';

  Object.keys(cats).forEach(function(cat){
    var items = cats[cat];
    html += '<div style="margin-bottom:16px">'
      +'<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--ink3);margin-bottom:7px;padding-bottom:5px;border-bottom:1px solid var(--rim)">'+cat+' · '+items.length+' problema(s)</div>'
      +'<div style="display:flex;flex-direction:column;gap:6px">';

    items.forEach(function(issue, idx){
      var globalIdx = issues.indexOf(issue);
      html += '<div style="background:var(--surf2);border:1px solid var(--rim);border-left:3px solid '+sevColor[issue.severidad]+';border-radius:8px;padding:9px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px">'
        +'<div style="flex:1;min-width:0">'
        +'<div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">'
        +'<span style="background:'+sevBg[issue.severidad]+';color:'+sevColor[issue.severidad]+';font-size:8px;font-weight:800;padding:2px 6px;border-radius:8px;text-transform:uppercase">'+issue.severidad+'</span>'
        +'<span style="font-size:11px;font-weight:700;color:var(--ink);font-family:var(--fm)">'+issue.entidad+': '+issue.id+'</span>'
        +'</div>'
        +'<div style="font-size:11px;color:var(--ink2)">'+issue.descripcion+'</div>'
        +'</div>';
      if(issue.accion && issue.accionFn){
        html += '<button class="btn btn-d btn-sm" style="font-size:10px;flex-shrink:0" onclick="_auditAccion('+globalIdx+')">'+issue.accion+'</button>';
      }
      html += '</div>';
    });
    html += '</div></div>';
  });

  html += '<div style="margin-top:6px;font-size:10px;color:var(--ink3)">Revisá cada caso antes de tomar acción. Las correcciones son permanentes.</div>';
  div.innerHTML = html;
}

function _auditAccion(idx){
  var issue = (window._auditIssues||[])[idx];
  if(issue && issue.accionFn) issue.accionFn();
}

function _auditEliminarPagoDirecto(pagoId){
  var p = (S.pagos||[]).find(function(x){ return x.id===pagoId; });
  if(!p) return;
  // Anular un pago mueve dinero: mismo permiso que en Pagos (revisado el 22-sep-2026)
  if(typeof requireDeletePermission==='function' && !requireDeletePermission()) return;
  if(!confirm('¿Eliminar el pago '+pagoId+' de '+fmt(p.monto)+' ('+( p.cli||'?')+')?\n\nEsta acción es permanente.')) return;
  var pi = (S.pagos||[]).findIndex(function(x){ return x.id===pagoId; });
  if(pi>=0){
    S.pagos[pi].eliminado=true;
    S.pagos[pi].eliminadoRazon='Eliminado desde auditoría completa';
    S.pagos[pi].eliminadoEn=new Date().toISOString();
    DB.savePago(S.pagos[pi]);
  }
  toast('Pago '+pagoId+' eliminado','success');
  auditCompleta();
}


// ══════════════════════════════════════════════════════
// AUDITORÍA COMPLETA
// ══════════════════════════════════════════════════════
function auditarCompleto(){
  var div = $('audit-completo-resultado');
  if(!div) return;
  div.innerHTML = '<div style="color:var(--ink3);font-size:12px;padding:10px 0">Analizando datos...</div>';

  var pagos    = (S.pagos    || []).filter(function(p){ return !p.eliminado; });
  var creds    = (S.creds    || []).filter(function(c){ return !c.eliminado; });
  var clientes = (S.clientes || []).filter(function(c){ return !c.eliminado; });
  var motos    = (S.motos    || []).filter(function(m){ return !m.eliminado; });

  // Lookup maps
  var credMap = {};
  creds.forEach(function(c){ credMap[c.id] = c; });
  var cliById = {};
  clientes.forEach(function(c){ cliById[String(c.id)] = c; });
  var motoById = {};
  motos.forEach(function(m){ motoById[String(m.id)] = m; });

  var issues = [];

  // ── 1. Pagos sin cliente asociado ──
  pagos.forEach(function(p){
    if(!p.cli || p.cli.trim() === ''){
      issues.push({ cat:'Pagos', tipo:'Pago sin cliente', sev:'error',
        desc: p.id + ' · ' + fmt(p.monto) + ' · ' + (p.fecha||'?') + ' · cred: ' + (p.cred||'?'),
        id: p.id, col:'pagos' });
    }
  });

  // ── 2. Pagos huérfanos (cred no existe o es de otro cliente) ──
  pagos.forEach(function(p){
    if(!p.cred) return;
    var cred = credMap[p.cred];
    if(!cred){
      issues.push({ cat:'Pagos', tipo:'Crédito inexistente', sev:'error',
        desc: p.id + ' · ' + (p.cli||'?') + ' · ' + fmt(p.monto) + ' apunta a ' + p.cred + ' (no existe)',
        id: p.id, col:'pagos' });
    } else if(p.cli && cred.cli){
      var relN = _auditNombresRel(p.cli, cred.cli);
      if(relN==='tipeo'){
        issues.push({ cat:'Pagos', tipo:'Nombre con posible error de tipeo', sev:'warn',
          desc: p.id + ' · pago de "' + p.cli + '" en ' + p.cred + ' de "' + cred.cli + '" · mismo cliente, se corrige desde Pagos huérfanos',
          id: p.id, col:'pagos', verPago:p.id });
      } else if(relN==='distinto'){
        issues.push({ cat:'Pagos', tipo:'Cliente no coincide con crédito', sev:'error',
          desc: p.id + ' · pago de "' + p.cli + '" apunta a ' + p.cred + ' que es de "' + cred.cli + '"',
          id: p.id, col:'pagos', verPago:p.id });
      }
    }
  });

  // ── 3. Pagos duplicados (mismo cred + mismo monto + misma fecha + no inicial) ──
  var pagoKey = {};
  pagos.filter(function(p){ return p.estado==='confirmado' && !p.esInicial && p.tipoOperacion!=='inicial_credito'; })
    .forEach(function(p){
      var k = (p.cred||'') + '|' + (p.fecha||'') + '|' + (p.monto||0);
      if(!pagoKey[k]) pagoKey[k] = [];
      pagoKey[k].push(p);
    });
  Object.values(pagoKey).forEach(function(grupo){
    if(grupo.length > 1){
      grupo.sort(function(a,b){ return String(a.id).localeCompare(String(b.id)); });
      var seg = _auditSegundosEntre(grupo[0].id, grupo[1].id);
      var refs = grupo.map(function(p){ return String(p.referencia||'').trim(); });
      var mismaRef = !!refs[0] && refs.every(function(r){ return r===refs[0]; });
      var muyProbable = (seg!=null && seg<=180) || mismaRef;
      issues.push({ cat:'Pagos', tipo: muyProbable ? 'Pago duplicado (muy probable)' : 'Posible pago duplicado', sev: muyProbable ? 'error' : 'warn',
        desc: grupo.map(function(p){ return p.id; }).join(', ') + ' · ' + fmt(grupo[0].monto) + ' · ' + (grupo[0].fecha||'?') + ' · ' + (grupo[0].cred||'?') + ' · ' + (grupo[0].cli||'')
          + (seg!=null ? ' · registrados con ' + _auditFmtDelta(seg) + ' de diferencia' : '')
          + (mismaRef ? ' · MISMA referencia ' + refs[0] : (refs.some(Boolean) ? ' · ref: ' + refs.map(function(r){return r||'—';}).join(' / ') : ' · sin referencia')),
        id: grupo[0].id, col:'pagos', verPago: grupo[0].id });
    }
  });

  // ── 4. Créditos sin cliente registrado ──
  creds.forEach(function(c){
    if(!c.clienteId && !c.cli){
      issues.push({ cat:'Créditos', tipo:'Sin cliente asociado', sev:'error',
        desc: c.id + ' · ' + (c.modelo||'?') + ' · estado: ' + (c.estado||'?'),
        id: c.id, col:'creds' });
    } else if(c.clienteId && !cliById[String(c.clienteId)]){
      issues.push({ cat:'Créditos', tipo:'Cliente ID no existe', sev:'warn',
        desc: c.id + ' · clienteId=' + c.clienteId + ' (' + (c.cli||'?') + ') no está en la lista de clientes',
        id: c.id, col:'creds' });
    }
  });

  // ── 5. Clientes sin cédula ──
  clientes.forEach(function(c){
    if(!c.cedula || c.cedula.trim() === ''){
      issues.push({ cat:'Clientes', tipo:'Sin cédula', sev:'warn',
        desc: 'CLI-' + c.id + ' · ' + (c.nombre||'?') + ' · ' + (c.ciudad||'?'),
        id: c.id, col:'clientes' });
    }
  });

  // ── 6. Cédulas duplicadas entre clientes ──
  var cedulaMap = {};
  clientes.forEach(function(c){
    if(!c.cedula || c.cedula.trim() === '') return;
    var norm = c.cedula.replace(/\s/g,'').toLowerCase();
    if(!cedulaMap[norm]) cedulaMap[norm] = [];
    cedulaMap[norm].push(c);
  });
  Object.entries(cedulaMap).forEach(function(kv){
    var norm = kv[0], grupo = kv[1];
    if(grupo.length > 1){
      var nCred = function(c){ return creds.filter(function(cr){ return String(cr.clienteId)===String(c.id); }).length; };
      issues.push({ cat:'Clientes', tipo:'Cédula duplicada', sev:'error',
        desc: grupo.map(function(c){ var k=nCred(c); return (c.nombre||'?') + ' (CLI-'+c.id+', ' + (k? k+' crédito'+(k!==1?'s':'') : 'sin créditos → se puede eliminar') + ')'; }).join(' / ') + ' · CI: ' + norm,
        id: grupo[0].id, col:'clientes' });
    }
  });

  // ── 7. Motos financiadas sin crédito activo ──
  motos.filter(function(m){ return m.estado === 'financiada'; }).forEach(function(m){
    var credActivo = creds.find(function(c){
      return (String(c.motoId) === String(m.id)) && (c.estado === 'activo' || c.estado === 'mora' || c.estado === 'pendiente_revision');
    });
    if(!credActivo){
      issues.push({ cat:'Motos', tipo:'Financiada sin crédito activo', sev:'warn',
        desc: 'MOT-' + m.id + ' · ' + (m.modelo||'?') + ' · cliente: ' + (m.cliente||'?'),
        id: m.id, col:'motos' });
    }
  });

  // ── 8. Créditos activos sin moto asociada ──
  creds.filter(function(c){ return c.estado === 'activo'; }).forEach(function(c){
    if(c.motoId && !motoById[String(c.motoId)]){
      issues.push({ cat:'Créditos', tipo:'Moto ID no existe', sev:'warn',
        desc: c.id + ' · ' + (c.cli||'?') + ' · motoId=' + c.motoId + ' no está en inventario',
        id: c.id, col:'creds' });
    }
  });

  // ── 9. Saldo no cuadra (pagado > total del crédito) ──
  creds.filter(function(c){ return c.estado === 'activo'; }).forEach(function(c){
    var cobrado = getCreditoPagosConfirmados(c);
    var total = parseFloat(c.total) || 0;
    if(total > 0 && cobrado > total * 1.05){ // 5% tolerancia por redondeo
      issues.push({ cat:'Créditos', tipo:'Cobrado excede el total', sev:'warn',
        desc: c.id + ' · ' + (c.cli||'?') + ' · cobrado ' + fmt(cobrado) + ' > total ' + fmt(total),
        id: c.id, col:'creds' });
    }
  });

  // ── 10. Créditos activos cuyo cliente tiene el estado "inactivo/eliminado" ──
  creds.filter(function(c){ return c.estado === 'activo'; }).forEach(function(c){
    if(!c.clienteId) return;
    var cli = cliById[String(c.clienteId)];
    if(cli && cli.eliminado){
      issues.push({ cat:'Créditos', tipo:'Cliente eliminado tiene crédito activo', sev:'error',
        desc: c.id + ' · ' + (c.cli||'?') + ' · el cliente está marcado como eliminado',
        id: c.id, col:'creds' });
    }
  });

  // ══ RENDER ══
  if(issues.length === 0){
    div.innerHTML = '<div style="background:var(--greens);border-radius:10px;padding:14px 16px;color:var(--green);font-weight:700;font-size:13px">✓ Auditoría completa sin discrepancias.</div>';
    return;
  }

  // Group by category
  var cats = {};
  issues.forEach(function(i){
    if(!cats[i.cat]) cats[i.cat] = [];
    cats[i.cat].push(i);
  });

  var sevColor = { error: 'var(--red)', warn: 'var(--amber)' };
  var sevBg    = { error: 'var(--reds)',  warn: 'var(--ambers)' };
  var sevLabel = { error: 'ERROR', warn: 'AVISO' };

  var html = '<div style="background:var(--reds);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
    + '<div style="color:var(--red);font-weight:700;font-size:13px">⚠ ' + issues.length + ' discrepancia(s) encontrada(s)</div>'
    + '<div style="display:flex;gap:10px;font-size:11px">'
    + '<span style="color:var(--red);font-weight:700">' + issues.filter(function(i){return i.sev==='error';}).length + ' errores</span>'
    + '<span style="color:var(--amber);font-weight:700">' + issues.filter(function(i){return i.sev==='warn';}).length + ' avisos</span>'
    + '</div></div>';

  Object.keys(cats).forEach(function(cat){
    var list = cats[cat];
    html += '<div style="margin-bottom:14px">'
      + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--p1);margin-bottom:7px;padding-bottom:5px;border-bottom:2px solid var(--p1)">'
      + cat + ' <span style="font-weight:600;color:var(--ink3)">(' + list.length + ')</span></div>'
      + '<div style="display:flex;flex-direction:column;gap:5px">';

    list.forEach(function(issue){
      html += '<div style="background:var(--surf2);border-left:3px solid ' + sevColor[issue.sev] + ';border-radius:0 8px 8px 0;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px">'
        + '<div style="flex:1;min-width:0">'
        + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">'
        + '<span style="background:' + sevBg[issue.sev] + ';color:' + sevColor[issue.sev] + ';font-size:8px;font-weight:800;padding:2px 6px;border-radius:10px;flex-shrink:0">' + sevLabel[issue.sev] + '</span>'
        + '<span style="font-size:11.5px;font-weight:700;color:var(--ink)">' + issue.tipo + '</span>'
        + '</div>'
        + '<div style="font-size:10.5px;color:var(--ink3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + String(issue.desc).replace(/"/g,'&quot;') + '">' + issue.desc + '</div>'
        + '</div>'
        + (issue.verPago ? '<button class="btn btn-g btn-sm" style="font-size:10px;flex-shrink:0" title="Abrir en Cobranza → Registro de pagos" onclick="S.pagosQ=\'' + issue.verPago + '\';S.pagosTab=\'todos\';S.pagosTipoF=\'todos\';nav(\'pagos\')">Ver en cobranza</button>' : '')
        + '</div>';
    });

    html += '</div></div>';
  });

  html += '<div style="margin:6px 0 8px;font-size:10.5px;color:var(--ink3)">Los <b>duplicados</b> se eliminan desde Cobranza → Registro de pagos (botón Eliminar), que revierte bien la amortización. Los <b>tipeos</b> se corrigen desde 🔍 Pagos huérfanos con "Usar el nombre del crédito".</div>';
  html += '<button class="btn btn-g btn-sm" style="margin-top:4px" onclick="auditExportarTxt()">↓ Exportar lista</button>';
  div.innerHTML = html;
  window._auditIssues = issues;
}

function auditExportarTxt(){
  var issues = window._auditIssues || [];
  if(!issues.length){ toast('Sin discrepancias que exportar','info'); return; }
  var lines = ['AUDITORÍA COMPLETA PAGASI — ' + new Date().toLocaleString('es-VE'), ''];
  var cats = {};
  issues.forEach(function(i){ if(!cats[i.cat]) cats[i.cat]=[]; cats[i.cat].push(i); });
  Object.keys(cats).forEach(function(cat){
    lines.push('═══ ' + cat.toUpperCase() + ' (' + cats[cat].length + ') ═══');
    cats[cat].forEach(function(i){
      lines.push('[' + i.sev.toUpperCase() + '] ' + i.tipo + ': ' + i.desc);
    });
    lines.push('');
  });
  var blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'auditoria-pagasi-' + hoyLocalISO() + '.txt';
  a.click();
}

// ══════════════════════════════════════════════════════
// AUDITORÍA: pagos huérfanos
// ══════════════════════════════════════════════════════
// Compara nombres ignorando mayusculas, acentos y espacios de mas: si a un
// cliente le corrigieron el nombre, sus pagos viejos NO son huerfanos.
function _auditNombreNorm(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
}
// Accion segura para "cliente distinto": el pago apunta al credito correcto,
// solo quedo con el nombre viejo → se copia el nombre del credito al pago.
// Relacion entre dos nombres: 'igual' | 'parcial' (uno es version corta del
// otro: "Jesus Morgado" vs "Jesus Eduardo Morgado") | 'tipeo' (difieren en
// 1-2 letras) | 'distinto' (personas distintas).
function _auditLev(a,b){
  var m=a.length,n=b.length,prev=[],cur=[],i,j;
  for(j=0;j<=n;j++) prev[j]=j;
  for(i=1;i<=m;i++){ cur=[i]; for(j=1;j<=n;j++){ cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); } prev=cur; }
  return prev[n];
}
function _auditNombresRel(a, b){
  var na=_auditNombreNorm(a), nb=_auditNombreNorm(b);
  if(!na || !nb) return 'distinto';
  if(na===nb) return 'igual';
  var ta=na.split(' ').filter(Boolean), tb=nb.split(' ').filter(Boolean);
  var corto=ta.length<=tb.length?ta:tb, largo=ta.length<=tb.length?tb:ta;
  if(corto.every(function(w){ return largo.indexOf(w)>-1; })) return 'parcial';
  var dist=_auditLev(na,nb);
  if(dist<=2 || dist<=Math.max(na.length,nb.length)*0.15) return 'tipeo';
  // tipeo dentro de una version corta: cada palabra del corto casi-igual a una del largo
  var okTok=corto.every(function(w){ return largo.some(function(v){ return v===w || (w.length>=4 && _auditLev(v,w)<=1); }); });
  if(okTok) return 'tipeo';
  return 'distinto';
}
// Segundos entre dos ids de pago (PAG-<ms>...). null si no se puede saber.
function _auditSegundosEntre(idA, idB){
  var ta=parseInt(String(idA||'').replace(/^PAG-/,'').split('-')[0],10);
  var tb=parseInt(String(idB||'').replace(/^PAG-/,'').split('-')[0],10);
  if(!ta||!tb) return null;
  return Math.round(Math.abs(ta-tb)/1000);
}
function _auditFmtDelta(seg){
  if(seg==null) return '';
  if(seg<60) return seg+' seg';
  if(seg<3600) return Math.round(seg/60)+' min';
  if(seg<86400) return (Math.round(seg/360)/10)+' h';
  return (Math.round(seg/8640)/10)+' días';
}
function auditSincronizarNombre(pagoId, idx){
  var h = (window._auditHuerfanos||[])[idx];
  if(!h || !h.cred) return;
  var p = h.pago;
  if(!confirm('¿Cambiar el nombre del pago ' + p.id + ' de "' + (p.cli||'?') + '" a "' + h.cred.cli + '" (el nombre del crédito ' + h.cred.id + ')?\n\nNo se borra ni se mueve dinero: solo se corrige el nombre.')) return;
  var pi = (S.pagos||[]).findIndex(function(x){ return x.id === pagoId; });
  if(pi >= 0){
    var antes = S.pagos[pi].cli;
    S.pagos[pi].cli = h.cred.cli;
    DB.savePago(S.pagos[pi]);
    if(typeof logActividad==='function') logActividad('auditoria_sync_nombre','pagos',pagoId,{antes:antes, despues:h.cred.cli, cred:h.cred.id});
  }
  toast('Nombre sincronizado con el crédito', 'success');
  auditarPagosHuerfanos();
}
function auditarPagosHuerfanos(){
  var div = $('audit-resultado');
  if(!div) return;
  div.innerHTML = '<div style="color:var(--ink3);font-size:12px;padding:10px 0">Analizando...</div>';

  var pagos  = (S.pagos  || []).filter(function(p){ return !p.eliminado; });
  var creds  = (S.creds  || []).filter(function(c){ return !c.eliminado; });
  var clientes = (S.clientes || []);

  // Build lookup: credId -> credito
  var credMap = {};
  creds.forEach(function(c){ credMap[c.id] = c; });

  // Find orphans: pago.cred does not exist in credMap,
  // OR the cred exists but belongs to a different client name
  var huerfanos = [];
  pagos.forEach(function(p){
    if(!p.cred) return;
    var cred = credMap[p.cred];
    if(!cred){
      // Cred doesn't exist at all
      huerfanos.push({ pago: p, tipo: 'cred_inexistente', cred: null });
    } else if(p.cli && cred.cli){
      var rel = _auditNombresRel(p.cli, cred.cli);
      if(rel==='tipeo') huerfanos.push({ pago: p, tipo: 'tipeo', cred: cred });          // mismo cliente, 1-2 letras
      else if(rel==='distinto') huerfanos.push({ pago: p, tipo: 'cliente_distinto', cred: cred });
      // 'igual' y 'parcial' (nombre corto del mismo cliente) NO son huerfanos
    }
  });

  if(huerfanos.length === 0){
    div.innerHTML = '<div style="background:var(--greens);border-radius:8px;padding:12px 14px;color:var(--green);font-weight:600;font-size:13px">✓ Sin pagos huérfanos. Todos los pagos están correctamente vinculados.</div>';
    return;
  }

  var html = '<div style="background:var(--reds);border-radius:8px;padding:10px 14px;color:var(--red);font-weight:700;font-size:12px;margin-bottom:12px">'
    + '⚠ Se encontraron ' + huerfanos.length + ' pago(s) con problemas</div>';

  html += '<div style="display:flex;flex-direction:column;gap:8px">';
  huerfanos.forEach(function(h, idx){
    var p = h.pago;
    var credInfo = h.cred
      ? ('Crédito ' + h.cred.id + ' pertenece a <strong>' + h.cred.cli + '</strong>')
      : ('Crédito <strong>' + p.cred + '</strong> no existe');
    var tipoLabel = h.tipo === 'cred_inexistente'
      ? '<span style="background:var(--reds);color:var(--red);font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px">CRÉDITO ELIMINADO</span>'
      : h.tipo === 'tipeo'
      ? '<span style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px">MISMO CLIENTE · POSIBLE TIPEO</span>'
      : '<span style="background:var(--ambers);color:var(--amber);font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px">CLIENTE DISTINTO</span>';

    html += '<div style="background:var(--surf2);border:1px solid var(--rim);border-radius:9px;padding:10px 13px">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">'
      + '<div style="flex:1">'
      + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">'
      + tipoLabel
      + '<span style="font-size:11px;font-weight:700;color:var(--ink);font-family:var(--fm)">' + p.id + '</span>'
      + '</div>'
      + '<div style="font-size:12px;font-weight:600;color:var(--ink)">' + (p.cli||'—') + '</div>'
      + '<div style="font-size:10.5px;color:var(--ink3);margin-top:2px">'
      + p.fecha + ' · ' + (p.metodo||'—') + ' · <strong style="color:var(--green)">' + fmt(p.monto) + '</strong>'
      + '</div>'
      + '<div style="font-size:10px;color:var(--ink3);margin-top:3px">Referencia al crédito: <strong>' + p.cred + '</strong> · ' + credInfo + '</div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">'
      + ((h.tipo === 'cliente_distinto' || h.tipo === 'tipeo') ? '<button class="btn btn-p btn-sm" style="font-size:10px" title="El pago apunta al crédito correcto; solo se actualiza el nombre" onclick="auditSincronizarNombre(\'' + p.id + '\',' + idx + ')">✓ Usar el nombre del crédito</button>' : '')
      + '<button class="btn btn-d btn-sm" style="font-size:10px" onclick="auditEliminarPago(\'' + p.id + '\',' + idx + ')">Eliminar pago</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  });
  html += '</div>';
  html += '<div style="margin-top:10px;font-size:10.5px;color:var(--ink3)">Revisá cada caso. <b>Cliente distinto</b>: si el crédito es el correcto y solo cambió el nombre, usá "Usar el nombre del crédito" (no borra nada). Eliminá un pago solo si confirmás que el cobro es incorrecto o ya fue registrado en otro crédito.</div>';

  div.innerHTML = html;
  // Store for reference
  window._auditHuerfanos = huerfanos;
}

function auditEliminarPago(pagoId, idx){
  // Anular un pago mueve dinero: mismo permiso que en Pagos (revisado el 22-sep-2026)
  if(typeof requireDeletePermission==='function' && !requireDeletePermission()) return;
  var h = (window._auditHuerfanos||[])[idx];
  if(!h) return;
  var p = h.pago;
  var confirmMsg = '¿Eliminar el pago ' + p.id + ' de ' + fmt(p.monto) + ' ('+ (p.cli||'?') +') vinculado a ' + p.cred + '?\n\nSolo eliminalo si confirmás que ese cobro es incorrecto o ya fue registrado correctamente en otro crédito.';
  if(!confirm(confirmMsg)) return;

  // Mark as eliminated in local state
  var pi = (S.pagos||[]).findIndex(function(x){ return x.id === pagoId; });
  if(pi >= 0){
    S.pagos[pi].eliminado = true;
    S.pagos[pi].eliminadoRazon = 'Pago huérfano — eliminado desde auditoría';
    S.pagos[pi].eliminadoEn = new Date().toISOString();
    DB.savePago(S.pagos[pi]);
  }
  toast('Pago ' + pagoId + ' eliminado', 'success');
  // Re-run audit to refresh list
  auditarPagosHuerfanos();
}

