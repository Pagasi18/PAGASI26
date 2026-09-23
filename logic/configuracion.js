// Logica de configuracion comercial: empresa, plan, tasa, cuentas, cobradores, catalogo y planes extra.
// Extraido de assets/pagasi-app.js sin cambiar comportamiento ni calculos financieros.

function cargarEmpresa(){
  if(!db) return;
  db.collection('config').doc('empresa').get().then(function(doc){
    if(doc.exists){
      var d = doc.data()||{};
      _empresa = {
        nombre: d.nombre || 'Pagasi',
        rif: d.rif || 'J-00000000-0',
        ciudad: d.ciudad || 'Caracas',
        tel: d.tel || '',
        email: d.email || '',
        direccion: d.direccion || '',
        representante:d.representante|| '',
        repCI: d.repCI || '',
        // registrales: el contrato los imprime (antes no se cargaban y salian en blanco)
        repCargo: d.repCargo || '', repDoc: d.repDoc || '',
        rm: d.rm || '', rmEstado: d.rmEstado || '', rmFecha: d.rmFecha || '', rmNum: d.rmNum || '', rmTomo: d.rmTomo || '',
        // cuentas que nombra el contrato (22-sep-2026)
        bancoUsd: d.bancoUsd || '', cuentaUsd: d.cuentaUsd || '', billetera: d.billetera || '', billeteraCuenta: d.billeteraCuenta || ''
      };
    }
  }).catch(function(){});
}

// Carga las cuentas bancarias y cobradores desde Firebase al iniciar la app

function cargarCuentasBanc(){
  if(!db) return;
  db.collection('config').doc('cuentasBanc').get().then(function(doc){
    var lista = doc.exists && doc.data().lista ? doc.data().lista : [];
    renderCuentasBanc(lista);
  }).catch(function(){ _cuentasBanc = []; });
  db.collection('config').doc('cobradores').get().then(function(doc){
    _cobradores = (doc.exists && doc.data().lista) ? doc.data().lista : ['Juan Admin'];
    renderCobradores(_cobradores);
  }).catch(function(){ _cobradores = ['Juan Admin']; });
}

// Actualiza la variable global y refresca la UI de configuración si está visible

function renderCuentasBanc(lista){
  _cuentasBanc = lista || [];
  var el = document.getElementById('cuentasBanc-list');
  if(el){
    el.innerHTML = _cuentasBanc.length
      ? _cuentasBanc.map(function(c,i){
          return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surf2);border-radius:8px;border:1px solid var(--rim)">'
            +'<span style="font-size:12px;font-weight:800;color:var(--ink3)">BNK</span>'
            +'<div style="flex:1"><div style="font-weight:700;font-size:13px">'+c.nombre+'</div>'
            +'<div style="font-size:11px;color:var(--ink3)">'+c.tipo+' · '+c.moneda+'</div></div>'
            +'<button class="btn btn-d btn-xs" onclick="_cuentasBanc.splice('+i+',1);guardarCuentasBanc()">✕</button>'
            +'</div>';
        }).join('')
      : '<div style="font-size:12px;color:var(--ink3);padding:8px">Sin cuentas registradas.</div>';
  }
}

// ── Cuando la pantalla lleva horas abierta ──────────────────────────────────
// Las cuentas se leen UNA vez, al entrar. Si alguien crea las cuentas mientras otro
// tiene el sistema abierto, ese otro sigue viendo la lista vacia hasta que recarga, y
// no tiene forma de saberlo: el desplegable simplemente no las trae. Paso el
// 23-sep-2026, el dia que PAGASI 26 empezo a vender. Ahora, cuando algo necesita las
// cuentas y no hay ninguna, se vuelve a preguntar a la base y los desplegables que
// estaban vacios se llenan solos, sin recargar ni perder lo escrito.
function _cuentasRecargarSiVacio(){
  if(_cuentasBanc && _cuentasBanc.length) return;
  if(!db || window._cuentasRecargando) return;
  window._cuentasRecargando = true;
  db.collection('config').doc('cuentasBanc').get().then(function(doc){
    window._cuentasRecargando = false;
    var lista = (doc.exists && doc.data().lista) ? doc.data().lista : [];
    if(!lista.length) return;
    renderCuentasBanc(lista);
    _cuentasRellenarSelects();
  }).catch(function(){ window._cuentasRecargando = false; });
}
// Rellena los desplegables que quedaron con el aviso de "no hay cuentas", sin tocar
// ningun otro: lo que el usuario ya eligio o escribio se respeta.
function _cuentasRellenarSelects(){
  if(!(_cuentasBanc && _cuentasBanc.length)) return;
  var esc = function(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var opciones = '<option value="" selected>— Elegir cuenta —</option>'
    + _cuentasBanc.map(function(c){ return '<option value="'+esc(c.nombre)+'">'+esc(c.nombre)+'</option>'; }).join('');
  var sels = document.querySelectorAll('select');
  Array.prototype.forEach.call(sels, function(sel){
    var o = sel.options && sel.options[0];
    if(!o || String(o.textContent||'').indexOf('No hay cuentas cargadas') === -1) return;
    sel.innerHTML = opciones;
  });
  // Y el aviso rojo que acompanaba al bloque ya no hace falta
  Array.prototype.forEach.call(document.querySelectorAll('.mpago-sin-cuentas'), function(el){ el.remove(); });
}

function renderCobradores(lista){
  _cobradores = lista || ['Juan Admin'];
  var el = document.getElementById('cobradores-list');
  if(el){
    el.innerHTML = _cobradores.length
      ? _cobradores.map(function(u,i){
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:var(--surf2);border-radius:8px;border:1px solid var(--rim);margin-bottom:4px">'
            +'<span style="font-weight:700;font-size:13px">'+u+'</span>'
            +'<button class="btn btn-d btn-xs" onclick="_cobradores.splice('+i+',1);guardarCobradores()">✕</button>'
            +'</div>';
        }).join('')
      : '<div style="font-size:12px;color:var(--ink3);padding:8px">Sin cobradores registrados.</div>';
  }
}

// Update mora badge

function guardarTasaBs(){
  var t = parseFloat(($('cfg_tasa_bs')&&$('cfg_tasa_bs').value)||'');
  if(!t||t<1){ toast('Ingresa una tasa válida (mayor a 1)','error'); return; }
  window._tasaBsGlobal = t;
  if(db) db.collection('config').doc('tasa').set({tasaBs:t,fecha:new Date().toISOString()})
    .then(function(){ toast('✓ Tasa actualizada: '+t+' Bs./$','success'); })
    .catch(function(e){ toast('Error guardando tasa: '+e.message,'error'); });
  else { toast('✓ Tasa actualizada: '+t+' Bs./$','success'); }
}

// ══════════════════════════════════════════════════════════════
// LIMPIAR CACHÉ LOCAL Y RECARGAR TODOS LOS VALORES DESDE FIREBASE
// Resetea los valores en memoria (PLAN, _empresa, _cuentasBanc,
// _cobradores, tasa Bs, motos, clientes, créditos, pagos, etc.)
// y los vuelve a leer de Firestore.
// ══════════════════════════════════════════════════════════════

function guardarEmpresa(){
  var nombre = (($('cfg_empresa')&&$('cfg_empresa').value)||'').trim();
  var rif = (($('cfg_rif')&&$('cfg_rif').value)||'').trim();
  var ciudad = (($('cfg_ciudad')&&$('cfg_ciudad').value)||'').trim();
  var tel = (($('cfg_tel')&&$('cfg_tel').value)||'').trim();
  var email = (($('cfg_email2')&&$('cfg_email2').value)||'').trim();
  var direccion = (($('cfg_direccion')&&$('cfg_direccion').value)||'').trim();
  var representante= (($('cfg_representante')&&$('cfg_representante').value)||'').trim();
  var repCI = (($('cfg_rep_ci')&&$('cfg_rep_ci').value)||'').trim();
  // Datos registrales y del representante (desde el 30-ago estaban en la pantalla
  // pero no se leian: el boton fallaba en silencio y no guardaba nada)
  var repCargo = (($('cfg_rep_cargo')&&$('cfg_rep_cargo').value)||'').trim();
  var repDoc = (($('cfg_rep_doc')&&$('cfg_rep_doc').value)||'').trim();
  var rm = (($('cfg_rm')&&$('cfg_rm').value)||'').trim();
  var rmEstado = (($('cfg_rm_estado')&&$('cfg_rm_estado').value)||'').trim();
  var rmFecha = (($('cfg_rm_fecha')&&$('cfg_rm_fecha').value)||'').trim();
  var rmNum = (($('cfg_rm_num')&&$('cfg_rm_num').value)||'').trim();
  var rmTomo = (($('cfg_rm_tomo')&&$('cfg_rm_tomo').value)||'').trim();
  // Cuentas que nombra el contrato: con dos companias, las de una no pueden salir
  // en el contrato de la otra (22-sep-2026)
  var bancoUsd = (($('cfg_banco_usd')&&$('cfg_banco_usd').value)||'').trim();
  var cuentaUsd = (($('cfg_cuenta_usd')&&$('cfg_cuenta_usd').value)||'').trim();
  var billetera = (($('cfg_billetera')&&$('cfg_billetera').value)||'').trim();
  var billeteraCuenta = (($('cfg_billetera_cuenta')&&$('cfg_billetera_cuenta').value)||'').trim();
  if(!nombre){ toast('Escribe el nombre de la empresa','error'); return; }
  // Actualizar la variable global también (para que contratos/reportes la lean aun sin estar en Config)
  _empresa = { nombre:nombre, rif:rif, ciudad:ciudad, tel:tel, email:email, direccion:direccion,
               representante:representante, repCI:repCI, repCargo:repCargo, repDoc:repDoc,
               rm:rm, rmEstado:rmEstado, rmFecha:rmFecha, rmNum:rmNum, rmTomo:rmTomo,
               bancoUsd:bancoUsd, cuentaUsd:cuentaUsd, billetera:billetera, billeteraCuenta:billeteraCuenta };
  var data = {nombre, rif, ciudad, tel, email, direccion, representante, repCI,
              repCargo, repDoc, rm, rmEstado, rmFecha, rmNum, rmTomo,
              bancoUsd, cuentaUsd, billetera, billeteraCuenta, updated: new Date().toISOString()};
  if(db){
    db.collection('config').doc('empresa').set(data)
      .then(function(){ toast('Empresa guardada — se reflejará en contratos y reportes','success'); if(typeof logActividad==='function') logActividad('config_actualizada','config','empresa',{nombre:nombre}); })
      .catch(function(e){ toast('Error: '+e.message,'error'); });
  } else {
    toast('Empresa guardada (local)','success');
  }
}

function guardarPlan(){
  var factorIn = parseFloat(($('cfg_factor')&&$('cfg_factor').value));
  var inicialIn = parseFloat(($('cfg_ini')&&$('cfg_ini').value));
  var tasaIn = parseFloat(($('cfg_tasa_mensual')&&$('cfg_tasa_mensual').value));
  var plazoIn = parseInt(($('cfg_plazo')&&$('cfg_plazo').value),10);
  var graciaIn = parseInt(($('cfg_gracia')&&$('cfg_gracia').value),10);
  var moraIn = parseFloat(($('cfg_mora')&&$('cfg_mora').value));
  var factor = Number.isFinite(factorIn) ? factorIn : PLAN.factor;
  var inicial = Number.isFinite(inicialIn) ? (inicialIn/100) : PLAN.inicial;
  var tasa = Number.isFinite(tasaIn) ? tasaIn : PLAN.tasaMensual;
  var plazo = Number.isFinite(plazoIn) ? plazoIn : PLAN.plazo;
  var gracia = Number.isFinite(graciaIn) ? graciaIn : (PLAN.diasGracia!=null?PLAN.diasGracia:5);   // punto 34: el 0 es un valor valido
  var mora = Number.isFinite(moraIn) ? moraIn : (PLAN.moraPct||2.5);
  PLAN.factor = factor;
  PLAN.inicial = inicial;
  PLAN.tasaMensual = tasa;
  PLAN.plazo = plazo;
  PLAN.diasGracia = gracia;
  PLAN.moraPct = mora;
  var data = {factor, inicial, tasaMensual:tasa, plazo:plazo, apy:PLAN.apy, diasGracia:gracia, moraPct:mora, updated:new Date().toISOString()};
  try{ localStorage.setItem('pagasi_config_plan', JSON.stringify(data)); }catch(_e){}
  if(db){
    db.collection('config').doc('plan').set(data)
      .then(function(){ toast('Plan financiero guardado','success'); if(typeof logActividad==='function') logActividad('config_actualizada','config','plan',{tasa:tasa,plazo:plazo,inicial:inicial}); nav('config'); })
      .catch(function(e){ toast('Error: '+e.message,'error'); });
  } else {
    toast('Plan guardado (local)','success'); nav('config');
  }
}

// ══════════════════════════════════════════

function agregarCuentaBanc(){
  setMicon('banco'); $('mtt').textContent='Agregar Cuenta / Método de Pago'; $('msb').textContent='Se usará como método de cobro y en el módulo Cuentas';
  $('modal-box').className='modal';
  $('mbd').innerHTML='<div class="fgr c1" style="gap:10px">'
    +'<div class="fg"><label>Nombre *</label><input class="fi" id="cb_nombre" placeholder="Ej: Bancamiga Bs, Binance USDT, Efectivo..."></div>'
    +'<div class="fg"><label>Tipo</label><select class="fs" id="cb_tipo"><option value="banco">Banco / Transferencia</option><option value="efectivo">Efectivo</option><option value="digital">Pago Digital</option><option value="otro">Otro</option></select></div>'
    +'<div class="fg"><label>Moneda</label><select class="fs" id="cb_moneda"><option value="USD">USD ($)</option><option value="BS">Bolívares (Bs)</option></select></div>'
    +'<div class="fg"><label>Número de cuenta (opcional)</label><input class="fi" id="cb_numero" placeholder="Ej: 0172-xxxx-xxxx"></div>'
    +'</div>';
  S.saveFn = function(){
    var nombre = (($('cb_nombre')&&$('cb_nombre').value)||'').trim();
    if(!nombre){ toast('El nombre es obligatorio','error'); return false; }
    var cuenta = {
      nombre: nombre,
      tipo: ($('cb_tipo')&&$('cb_tipo').value)||'banco',
      moneda: ($('cb_moneda')&&$('cb_moneda').value)||'USD',
      numero: ($('cb_numero')&&$('cb_numero').value)||''
    };
    _cuentasBanc.push(cuenta);
    guardarCuentasBanc();
    closeM(); nav('config'); toast('Cuenta agregada','success'); return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Agregar</button>';
  $('ov').style.display='flex';
}

function guardarCuentasBanc(){
  var data = {lista: _cuentasBanc, updated: new Date().toISOString()};
  if(db){
    db.collection('config').doc('cuentasBanc').set(data)
      .then(function(){ renderCuentasBanc(_cuentasBanc); toast('Cuentas guardadas','success'); })
      .catch(function(e){ toast('Error: '+e.message,'error'); });
  } else {
    renderCuentasBanc(_cuentasBanc); toast('Cuentas guardadas (local)','success');
  }
}

function agregarCobrador(){
  setMicon('cliente'); $('mtt').textContent='Agregar Cobrador'; $('msb').textContent='Se mostrará en los formularios de pago y cobranza';
  $('modal-box').className='modal';
  $('mbd').innerHTML='<div class="fg"><label>Nombre del cobrador *</label><input class="fi" id="cob_nombre" placeholder="Ej: Juan Pérez"></div>';
  S.saveFn = function(){
    var nombre = (($('cob_nombre')&&$('cob_nombre').value)||'').trim();
    if(!nombre){ toast('El nombre es obligatorio','error'); return false; }
    _cobradores.push(nombre);
    guardarCobradores();
    closeM(); nav('config'); toast('Cobrador agregado','success'); return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Agregar</button>';
  $('ov').style.display='flex';
}

function guardarCobradores(){
  var data = {lista: _cobradores, updated: new Date().toISOString()};
  if(db){
    db.collection('config').doc('cobradores').set(data)
      .then(function(){ renderCobradores(_cobradores); toast('Cobradores guardados','success'); })
      .catch(function(e){ toast('Error: '+e.message,'error'); });
  } else {
    renderCobradores(_cobradores); toast('Cobradores guardados (local)','success');
  }
}

function openAddCatalogo(){ openEditCatalogo(null); }

function openEditCatalogo(id){
  var item = id ? CATALOGO.find(function(c){return c.id===id;}) : null;
  var ed = !!item;
  setMicon(ed?'editar':'moto');
  $('mtt').textContent = ed ? 'Editar Modelo' : 'Agregar Modelo al Catálogo';
  $('msb').textContent = ed ? item.modelo : 'El precio se usará para calcular cuotas automáticamente';
  $('modal-box').className = 'modal';
  $('mbd').innerHTML = '<div class="fgr c1" style="gap:10px">'
    + '<div class="fg"><label>Nombre del modelo *</label>'
    + '<input class="fi" id="cat_mod" value="' + (item?item.modelo:'') + '" placeholder="Ej: NEW HORSE 150" autofocus></div>'
    + '<div class="fg"><label>Precio USD *</label>'
    + '<input class="fi" id="cat_pr" type="number" step="0.01" value="' + (item?item.precio:'') + '" placeholder="0.00">'
    + '</div></div>'
    + '<div id="cat_preview" style="margin-top:10px"></div>';
  // Live preview
  var prInput = $('cat_pr');
  if(prInput) prInput.addEventListener('input', function(){
    var p = parseFloat(this.value)||0;
    if(!p){ $('cat_preview').innerHTML=''; return; }
    var r = calcMoto(p);
    $('cat_preview').innerHTML = '<div style="background:var(--surf2);border:1px solid var(--rim2);border-radius:8px;padding:11px;display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      + '<div style="font-size:11px;color:var(--ink3)">Inicial '+((PLAN.inicial||0)*100)+'%</div><div style="font-weight:700;font-size:12px">'+fmt(r.ini)+'</div>'
      + '<div style="font-size:11px;color:var(--ink3)">Cuota mensual</div><div style="font-weight:800;font-size:13px;color:var(--p1)">'+fmt(r.cuotaM)+'</div>'
      + '<div style="font-size:11px;color:var(--ink3)">Cuota quincenal</div><div style="font-weight:700;font-size:12px">'+fmt(r.cuotaQ)+'</div>'
      + '<div style="font-size:11px;color:var(--ink3)">Total pagado</div><div style="font-weight:700;font-size:12px">'+fmt(r.totalPagado)+'</div>'
      + '</div>';
  });
  S.saveFn = function(){
    var mod = ($('cat_mod')&&$('cat_mod').value.trim())||'';
    var pr = parseFloat(($('cat_pr')&&$('cat_pr').value))||0;
    if(!mod){ toast('Nombre del modelo obligatorio','error'); return false; }
    if(!pr){ toast('Precio obligatorio','error'); return false; }
    if(ed){
      var i = CATALOGO.findIndex(function(c){return c.id===id;});
      CATALOGO[i] = {id:id, modelo:mod, precio:pr};
      toast('Modelo actualizado · ' + mod, 'success');
    } else {
      var newId = CATALOGO.length ? Math.max.apply(null,CATALOGO.map(function(c){return c.id;}))+1 : 1;
      CATALOGO.push({id:newId, modelo:mod, precio:pr});
      toast('Modelo agregado · ' + mod, 'success');
    }
    // Save to Firestore
    if(db){
      db.collection('config').doc('catalogo').set({items: CATALOGO, version: 3})
        .then(function(){ try{ localStorage.setItem('pagasi_catalogo_config', JSON.stringify(CATALOGO)); localStorage.setItem('pagasi_catalogo_ver','2'); }catch(_e){} })
        .catch(function(){});
    }
    closeM(); nav('plan'); return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="saveM()">' + (ed?'Guardar cambios':'Agregar modelo') + '</button>';
  $('ov').style.display = 'flex';
}

function delCatalogo(id){
  if(!requireDeletePermission()) return;
  var item = CATALOGO.find(function(c){return c.id===id;});
  if(!item) return;
  setMicon('eliminar'); $('mtt').textContent='Eliminar Modelo'; $('msb').textContent='No se puede deshacer';
  $('modal-box').className='modal';
  $('mbd').innerHTML = '<div style="text-align:center;padding:16px 0">'
    + '<div style="font-size:42px;margin-bottom:10px">MOT</div>'
    + '<div style="font-size:15px;font-weight:700">¿Eliminar ' + item.modelo + '?</div>'
    + '<div style="color:var(--ink3);font-size:13px;margin-top:6px">$' + item.precio.toLocaleString('es') + ' · Se eliminará del catálogo permanentemente</div></div>';
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-d" onclick="cDelCatalogo('+id+')">Eliminar</button>';
  $('ov').style.display = 'flex';
}

function cDelCatalogo(id){
  if(!requireDeletePermission()) return;
  var i = CATALOGO.findIndex(function(c){return c.id===id;});
  if(i>=0) CATALOGO.splice(i,1);
  if(db){
    db.collection('config').doc('catalogo').set({items:CATALOGO, version: 3})
      .then(function(){ try{ localStorage.setItem('pagasi_catalogo_config', JSON.stringify(CATALOGO)); localStorage.setItem('pagasi_catalogo_ver','2'); }catch(_e){} })
      .catch(function(){});
  }
  closeM(); nav('plan'); toast('Modelo eliminado','success');
}

// ══════════════════════════════════════════
// PLAN CRUD — agregar nuevo plan
// ══════════════════════════════════════════

function delPlanExtra(idx){
  if(!requireDeletePermission()) return;
  if(!window._planesExtra) return;
  window._planesExtra.splice(idx,1);
  if(db){
    db.collection('config').doc('planes').set({items:window._planesExtra})
      .then(function(){ try{ localStorage.setItem('pagasi_planes_extra', JSON.stringify(window._planesExtra)); }catch(_e){} })
      .catch(function(){});
  }
  nav('plan'); toast('Plan eliminado','success');
}

function openAddPlan(){
  setMicon('plan'); $('mtt').textContent='Nuevo Plan Financiero'; $('msb').textContent='Se agrega como opción adicional';
  $('modal-box').className='modal';
  $('mbd').innerHTML = '<div class="fgr" style="gap:8px">'
    + '<div class="fg"><label>Nombre del plan *</label><input class="fi" id="np_nombre" placeholder="Ej: Plan 12 Meses"></div>'
    + '<div class="fg"><label>Plazo (meses) *</label><input class="fi" id="np_plazo" type="number" min="1" max="60" placeholder="10"></div>'
    + '</div>'
    + '<div class="fgr" style="gap:8px;margin-top:8px">'
    + '<div class="fg"><label>Factor (×) *</label><input class="fi" id="np_factor" type="number" step="0.01" min="1" placeholder="1.90"></div>'
    + '<div class="fg"><label>Inicial mínima (%)</label><input class="fi" id="np_ini" type="number" min="0" max="100" placeholder="40"></div>'
    + '</div>'
    + '<div class="fgr" style="gap:8px;margin-top:8px">'
    + '<div class="fg"><label>Tasa mensual (%)</label><input class="fi" id="np_tasa" type="number" step="0.01" placeholder="13.77"></div>'
    + '<div class="fg"><label>% Mora mensual</label><input class="fi" id="np_mora" type="number" step="0.1" placeholder="5"></div>'
    + '</div>';
  S.saveFn = function(){
    var nombre = ($('np_nombre')&&$('np_nombre').value.trim())||'';
    var plazo = parseInt(($('np_plazo')&&$('np_plazo').value))||0;
    var factor = parseFloat(($('np_factor')&&$('np_factor').value))||0;
    var ini = parseFloat(($('np_ini')&&$('np_ini').value))||40;
    var tasa = parseFloat(($('np_tasa')&&$('np_tasa').value))||0;
    var mora = parseFloat(($('np_mora')&&$('np_mora').value))||5;
    if(!nombre||!plazo||!factor){ toast('Nombre, plazo y factor son obligatorios','error'); return false; }
    var newPlan = {nombre:nombre, plazo:plazo, factor:factor, inicial:ini/100, tasaMensual:tasa, moraPct:mora, diasGracia:5};
    if(db){
      db.collection('config').doc('planes').set({items:(window._planesExtra||[]).concat([newPlan])})
        .then(function(){ toast('Plan "'+nombre+'" guardado','success'); })
        .catch(function(e){ toast('Error al guardar plan','error'); });
    } else {
      toast('Plan guardado localmente','success');
    }
    // Append plan to display
    if(!window._planesExtra) window._planesExtra=[];
    window._planesExtra.push(newPlan);
    closeM(); nav('plan'); return true;
  };
  $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
    + '<button class="btn btn-p" onclick="saveM()">Crear Plan</button>';
  $('ov').style.display='flex';
}


// ══════════════════════════════════════════
// ══════════════════════════════════════════
