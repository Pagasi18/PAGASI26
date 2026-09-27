// 27-sep-2026: la solicitud publica se llena por partes. La parte 1 (seis datos) crea el
// lead WEB-<cedula> en un lote con su marcador de sesion; las partes 2 a 9 lo completan
// con update() de SOLO lo contestado, desde la misma sesion anonima de una app de
// Firebase propia. Esto prueba la pagina (normalizacion, lo que manda cada parte, la
// sesion, el borrador para retomar y las salidas), que sus campos y valores sean los que
// aceptan las Reglas y los del asistente, y la bandeja del panel. Sin navegador ni base.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const tick = () => new Promise(r => setImmediate(r));
const esperar = async (n) => { for (let i = 0; i < (n || 6); i++) await tick(); };

// ── Un DOM minimo: cualquier id existe y guarda value/hidden/clases ────────
function elemento(tag){
  const e = { tag, value:'', textContent:'', innerHTML:'', hidden:false, href:'', disabled:false, selectedIndex:0, options:[], style:{}, attrs:{}, cls:new Set(), oyentes:{},
    classList:{ add(c){ e.cls.add(c); }, remove(c){ e.cls.delete(c); }, contains(c){ return e.cls.has(c); }, toggle(c, on){ if(on===undefined) on=!e.cls.has(c); if(on) e.cls.add(c); else e.cls.delete(c); return on; } },
    setAttribute(k,v){ e.attrs[k]=v; }, removeAttribute(k){ delete e.attrs[k]; }, getAttribute(k){ return e.attrs[k]; }, hasAttribute(k){ return k in e.attrs; },
    addEventListener(t, f){ (e.oyentes[t]=e.oyentes[t]||[]).push(f); }, closest(){ return e.fg||null; }, focus(){}, scrollIntoView(){}, appendChild(){}, insertBefore(){}, querySelector(){ return null; }, querySelectorAll(){ return []; } };
  return e;
}

// ── La base falsa: lotes, update() con increment/serverTimestamp, y "Reglas" minimas ──
const FV = { serverTimestamp(){ return { __ts:true }; }, increment(n){ return { __inc:n }; } };
function negado(){ const e = new Error('Missing or insufficient permissions.'); e.code = 'permission-denied'; return e; }
function aplicar(doc, d){ Object.keys(d).forEach(k => { const v = d[k]; if(v && v.__inc) doc[k] = (doc[k]||0) + v.__inc; else if(v && v.__ts) doc[k] = 'TS'; else doc[k] = v; }); return doc; }
function crearBase(){
  const almacen = {}, log = [];
  const b = { almacen, log, rechazar:null, colgar:false };
  const ref = (col, id) => { const ruta = col+'/'+id; return { ruta, update(d){
    log.push({ tipo:'update', ruta, datos:d });
    if(b.colgar) return new Promise(() => {});
    return (async () => {
      const doc = almacen[ruta]; if(!doc){ const e = new Error('No document to update'); e.code = 'not-found'; throw e; }
      if(doc.web_cerrado || doc.web_fin) throw negado();          // como esLeadWebEditando
      if(b.rechazar && b.rechazar(d)) throw negado();
      aplicar(doc, d);
    })();
  } }; };
  b.db = {
    collection(col){ return { doc(id){ return ref(col, id); } }; },
    batch(){ const ops = []; return { set(r, d){ ops.push([r, d]); }, async commit(){
      log.push({ tipo:'lote', rutas: ops.map(o => o[0].ruta), datos: ops.map(o => o[1]) });
      if(ops.some(o => almacen[o[0].ruta])) throw negado();          // ya existe: la cedula o el marcador
      ops.forEach(o => { almacen[o[0].ruta] = aplicar({}, o[1]); });
    } }; }
  };
  return b;
}
function crearAuth(){
  const a = { currentUser:null, n:0, salidas:0,
    async signInAnonymously(){ a.currentUser = { uid:'anon-'+(++a.n) }; },
    async signOut(){ a.currentUser = null; a.salidas++; },
    onAuthStateChanged(cb){ cb(a.currentUser); return function(){}; } };
  return a;
}
const catalogo = { motos:[{id:1, modelo:'NEW HORSE 150', sedeName:'EK Bello Monte', cc:'150cc', type:'Urbana', precio:1320}],
  get(id){ return String(id)==='1' ? {id:1, name:'New Horse 150', sedeName:'EK Bello Monte', precio:1320} : null; },
  plan(){ return {inicial:660, quincenal:56}; }, money(n){ return '$'+n; } };

// Una "pagina" nueva con la misma base, la misma sesion guardada y el mismo localStorage
function pagina(comp){
  const dom = {};
  const el = id => dom[id] || (dom[id] = elemento(id));
  ['wz_nom','wz_ci','wz_tel','wz_emp','wz_ing_rango','wz_estado'].forEach(id => { el(id).fg = elemento('fg'); });
  el('fs1').cls.add('on');
  const apps = {};
  const ctx = {
    console:{log(){},warn(){},error(){}}, clearTimeout(){},
    setTimeout(f){ if(ctx._vencerTiempos) f(); return 0; },
    document:{ getElementById:el, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento('div'); }, body:elemento('body'), addEventListener(){}, readyState:'complete' },
    location:{ search:'', href:'https://pagasi.io/solicitar.html' }, localStorage: comp.ls,
    URLSearchParams, Date, encodeURIComponent, JSON, Math,
    PagasiCatalog: catalogo, PagasiSite:{ populateModels(){}, escape(s){ return String(s); }, fitPhotos(){} },
    firebase:{ apps:[], app(n){ if(!apps[n]) throw new Error('No Firebase App '+n); return apps[n]; },
      initializeApp(cfg, n){ ctx._appsCreadas.push(n); return (apps[n||'[DEFAULT]'] = { name:n||'[DEFAULT]' }); },
      auth(app){ ctx._authDe = app && app.name; return comp.auth; },
      firestore: Object.assign(function(app){ ctx._dbDe = app && app.name; return comp.base.db; }, { FieldValue: FV }) },
    _appsCreadas: [], _dom: dom
  };
  ctx.window = ctx; ctx.addEventListener = function(){};
  vm.createContext(ctx);
  vm.runInContext(src('assets/public/request.js'), ctx, { filename:'request.js' });
  return ctx;
}
function localStorageFalso(){ return { _m:{}, getItem(k){ return this._m[k]||null; }, setItem(k,v){ this._m[k]=String(v); }, removeItem(k){ delete this._m[k]; } }; }
const BK = 'pagasi_solicitud_borrador_v1';
const reglas = src('firestore.rules');
const listaDe = (txt) => (txt.match(/'[^']*'/g) || []).map(s => s.slice(1, -1));
const trozo = (desde, hasta) => reglas.slice(reglas.indexOf(desde), reglas.indexOf(hasta, reglas.indexOf(desde)));
const CREAR = listaDe(trozo("d.keys().hasOnly([", "])"));
const EDITABLES = listaDe(trozo('function camposWebEditables()', ']'));

(async () => {
  const comp = { ls: localStorageFalso(), auth: crearAuth(), base: crearBase() };
  let P = pagina(comp);
  const D = P._dom;
  await esperar();

  // ── Normalizacion ──
  ok('cédula "v 12.345.678" → V-12345678', P.normCedula('v 12.345.678').valor === 'V-12345678');
  ok('cédula "E-8123456" conserva la E', P.normCedula('E-8123456').valor === 'E-8123456');
  ok('cédula de 5 o de 10 dígitos no vale', P.normCedula('12345') === null && P.normCedula('1234567890') === null);
  ok('teléfono "+58 414 123 45 67" → 0414-1234567', P.normTel('+58 414 123 45 67').valor === '0414-1234567');
  ok('un fijo (0212) no vale para el WhatsApp del cliente', P.normTel('0212-1234567') === null);
  ok('...pero sí para una referencia', P.normTelLibre('0212 555 12 34') === '0212-5551234' && P.normTelLibre('+58 424 111 22 33') === '0424-1112233' && P.normTelLibre('123') === '');
  P._dom.wz_x = elemento('x'); P._dom.wz_x.value = '1.200'; const m1 = P._monto('wz_x'); P._dom.wz_x.value = '$ 45,5'; const m2 = P._monto('wz_x'); P._dom.wz_x.value = 'ochenta'; const m3 = P._monto('wz_x'); P._dom.wz_x.value = ''; const m4 = P._monto('wz_x');
  ok('"1.200" → 1200, "$ 45,5" → 45.5, texto → no se entiende, vacío → nada', m1 === 1200 && m2 === 45.5 && isNaN(m3) && m4 === null);

  // ── La sesion vive en una app PROPIA, no en la del panel ──
  ok('la página usa su propia app de Firebase ("solicitud"), no la del panel ni la de Mi cuenta', P._appsCreadas.indexOf('solicitud') > -1 && P._authDe === 'solicitud' && P._dbDe === 'solicitud');

  // ── Validacion de la parte 1 ──
  D.wz_nom.value = 'Carlos'; D.wz_ci.value = '123'; D.wz_tel.value = '0212';
  let primero = P.validarPaso1(true);
  ok('con todo mal, el primer campo malo es el nombre y cada uno lleva su mensaje', primero === D.wz_nom && /apellido/.test(D.err_wz_nom.textContent) && /Cédula/.test(D.err_wz_ci.textContent) && /estado/.test(D.err_wz_estado.textContent));
  const llenar1 = (ci) => { D.wz_nom.value = 'Carlos Pérez'; D.wz_ci.value = ci; D.wz_tel.value = '0414-1234567'; D.wz_emp.value = 'delivery'; D.wz_ing_rango.value = '400'; D.wz_estado.value = 'Miranda'; D.fM.value = '1'; };
  llenar1('V-12345678');
  ok('con los seis datos bien no hay campo malo', P.validarPaso1(true) === null && D.err_wz_nom.textContent === '');
  D.wz_estado.value = 'Narnia';
  ok('un estado que no está en la lista de 24 no pasa', P.validarPaso1(false) === D.wz_estado);
  D.wz_estado.value = 'Miranda';

  // ── Lo que crea el lead ──
  const p = P.buildClientePayload('anon-x');
  ok('id WEB-<cédula>, cédula y teléfono normalizados', p.id === 'WEB-12345678' && p.cedula === 'V-12345678' && p.tel === '0414-1234567' && p.wa === p.tel);
  ok('el ingreso es el punto medio y el rango va en ingreso_rango (ya no en las notas)', p.ingreso === 400 && p.ingreso_rango === '$300 a $500' && !('notas' in p));
  ok('lleva el estado, la sesión (web_uid), la hora del servidor (web_ts) y la parte 1', p.estado_ubi === 'Miranda' && p.web_uid === 'anon-x' && p.web_ts && p.web_ts.__ts && p.web_paso === 1);
  ok('sin score, impresión, documentos, conocio ni ciudad', ['score_indexa','f1','impresion','docs_count','documentos','conocio','ciudad','notas'].every(k => !(k in p)));
  ok('la moto de interés viaja con modelo, precio y sede', p.moto_interes_id === 1 && p.moto_interes_modelo === 'NEW HORSE 150' && p.moto_interes_precio === 1320 && p.moto_interes_sede === 'EK Bello Monte');
  const fueraCrear = Object.keys(p).filter(k => CREAR.indexOf(k) === -1);
  ok('todos los campos de la parte 1 están en la lista de esLeadWeb' + (fueraCrear.length ? ' (faltan: '+fueraCrear.join(', ')+')' : ''), CREAR.length > 10 && fueraCrear.length === 0);

  // ── Una cedula que ya pidio: mensaje neutro, sin confirmar nada ──
  comp.base.almacen['clientes/WEB-87654321'] = { id:'WEB-87654321', origen:'web' };
  llenar1('V-87654321');
  await P.submitF({ preventDefault(){} });
  ok('cédula que ya existe: sale "escríbenos por WhatsApp" sin decir que ya hay una solicitud', D.fOK.cls.has('on') && /Si ya enviaste tu solicitud, escríbenos por WhatsApp/.test(D.okText.textContent) && !/WEB-87654321/.test(D.okText.textContent + D.okTitulo.textContent) && !/Ya te tenemos|Ya hay una solicitud/.test(D.okText.textContent + D.okTitulo.textContent));
  ok('...cierra la sesión anónima y borra el borrador', comp.auth.currentUser === null && comp.ls.getItem(BK) === null);

  // ── Parte 1 de verdad ──
  P.hacerOtra();
  llenar1('V-12345678');
  await P.submitF({ preventDefault(){} });
  const lote = comp.base.log.filter(x => x.tipo === 'lote').pop();
  ok('la parte 1 crea el lead y el marcador de sesión en UN lote', lote && lote.rutas[0] === 'clientes/WEB-12345678' && /^web_sesiones\/anon-/.test(lote.rutas[1]) && lote.datos[1].leadId === 'WEB-12345678' && lote.datos[1].ts.__ts);
  const uid = comp.auth.currentUser && comp.auth.currentUser.uid;
  ok('...el lead lleva el uid de ESA sesión', comp.base.almacen['clientes/WEB-12345678'].web_uid === uid && lote.rutas[1] === 'web_sesiones/'+uid);
  ok('la sesión NO se cierra después de la parte 1', !!comp.auth.currentUser);
  ok('sale "ya nos llegó" con el número, "Seguir con mi solicitud" y la salida por WhatsApp', D.fMas.cls.has('on') && D.masId.textContent === 'WEB-12345678' && D.masNombre.textContent === 'Carlos');
  let b = JSON.parse(comp.ls.getItem(BK));
  ok('el borrador guarda la solicitud (leadId, sesión, parte) y ya no la cédula ni el teléfono', b.leadId === 'WEB-12345678' && b.uid === uid && b.parte === 2 && !b.wz_ci && !b.wz_tel && b.trabajo === 'delivery');
  await P.submitF({ preventDefault(){} });
  ok('un Enter después de creada no manda otra solicitud', comp.base.log.filter(x => x.tipo === 'lote').length === 2);

  // ── Parte 2: tu moto ──
  const ultimo = () => comp.base.log.filter(x => x.tipo === 'update').pop();
  const doc = () => comp.base.almacen['clientes/WEB-12345678'];
  P.irA(0);
  ok('"Seguir" abre la parte 2 con su barra', D.fsWiz.cls.has('on') && D.p2.hidden === false && D.p3.hidden === true && D.wzPaso.textContent === 'Parte 2 de 9 · Tu moto' && D.wzPct.textContent === '10%');
  ok('...sin "Atrás" en la primera', D.btnAtras.hidden === true && D.btnSiguiente.textContent === 'Siguiente');
  P.elegir('wz_uso', 'delivery'); P.elegir('wz_moto_previa', 'no');
  await P.siguiente(false);
  let u = ultimo();
  ok('"Siguiente" guarda con update() SOLO lo contestado de esa parte', u.ruta === 'clientes/WEB-12345678' && u.datos.uso_moto === 'delivery' && u.datos.moto_previa === 'no' && Object.keys(u.datos).sort().join() === 'editadoEn,moto_previa,uso_moto,web_act,web_n,web_paso');
  ok('...con web_paso, web_act (hora del servidor) y web_n (+1)', u.datos.web_paso === 2 && u.datos.web_act.__ts && u.datos.web_n.__inc === 1 && doc().web_n === 1);
  P.elegir('wz_uso', 'delivery');
  ok('tocar otra vez una opción la quita (siempre se puede "no sé")', D.wz_uso.value === '');
  P.elegir('wz_uso', 'delivery');

  // ── Parte 3: se adapta al trabajo ──
  ok('parte 3 para delivery: pregunta por la app y trae "Motorizado" escrito', D.p3.hidden === false && /app o empresa/.test(D.t_empresa.textContent) && D.wz_cargo.value === 'Motorizado' && D.q_empresa.hidden === false);
  D.wz_empresa.value = 'Yummy <b>'; P.elegir('wz_ant', '3');
  await P.siguiente(false);
  u = ultimo();
  ok('...guarda empresa (sin caracteres de código), cargo y antigüedad', u.datos.empresa === 'Yummy b' && u.datos.cargo === 'Motorizado' && u.datos.antiguedad === '3' && !('dir_trabajo' in u.datos));

  // ── Parte 4: primero cada cuanto cobra, despues cuanto en esa unidad ──
  ok('parte 4 recuerda el rango que marcó', /\$300 a \$500/.test(D.p4rango.textContent));
  P.elegir('wz_dia_cobro', 'semanal');
  ok('...y pregunta el monto en la unidad en que cobra', /en una semana normal/.test(D.t_monto.textContent));
  D.wz_monto.value = '100'; P.elegir('wz_dep', '0'); P.elegir('wz_ahorro', 'usd'); P.elegir('wz_inicial', '<200');
  await P.siguiente(false);
  u = ultimo();
  ok('$100 a la semana → ingreso 430 al mes, marcado como exacto', u.datos.ingreso === 430 && u.datos.ingreso_exacto === true && u.datos.dia_cobro === 'semanal');
  ok('"Nadie más" se guarda como 0 (es una respuesta), el ahorro con los códigos del asistente y la inicial por rango', u.datos.dependientes === 0 && u.datos.ahorro === 'usd' && u.datos.inicial_rango === '<200');
  ok('...y lo que no contestó no va (ni remesas ni ingreso familiar)', !('remesas' in u.datos) && !('ingreso_familiar' in u.datos));
  P.atras();
  ok('"Atrás" vuelve sin escribir en la base', D.p4.hidden === false && comp.base.log.filter(x => x.tipo === 'update').length === 3);
  D.wz_monto.value = 'mucho';
  await P.siguiente(false);
  ok('un monto que no se entiende se marca al lado del campo y no avanza', D.p4.hidden === false && /solo el número/.test(D.err_wz_monto.textContent));
  await P.siguiente(true);
  u = ultimo();
  ok('"No sé esto, siguiente" deja fuera lo que no se entiende y sigue', D.p5.hidden === false && !('ingreso' in u.datos) && u.datos.dia_cobro === 'semanal');
  D.wz_monto.value = '100';

  // ── Parte 5: creditos y banco, y Cashea en UNA pantalla ──
  P.elegir('wz_hist', 'bueno'); P.elegir('wz_deuda', 'menores');
  ok('la deuda mensual solo aparece si dice que debe', D.q_deuda_mensual.hidden === false);
  D.wz_deuda_mensual.value = '50'; P.elegir('wz_deuda', 'no');
  ok('...y se esconde si cambia a "No"', D.q_deuda_mensual.hidden === true);
  P.elegir('wz_banco', 'activa'); P.elegir('wz_banco_nm', 'Banesco', true); P.elegir('wz_banco_nm', 'Mercantil', true);
  await P.siguiente(false);
  u = ultimo();
  ok('créditos y banco: la deuda escondida no viaja y los bancos van juntos', u.datos.historial === 'bueno' && u.datos.deudas === 'no' && !('deuda_mensual' in u.datos) && u.datos.banco_estado === 'activa' && u.datos.banco_nombre === 'Banesco, Mercantil');
  ok('Cashea es su propia pantalla dentro de la parte 5', D.p5c.hidden === false && D.wzPaso.textContent === 'Parte 5 de 9 · Tu Cashea' && D.w_cashea.hidden === true);
  P.elegir('wz_cashea', 'si'); P.elegir('wz_cashea_nivel', '4'); P.elegir('wz_cashea_estado', 'al_dia'); D.wz_cashea_linea.value = '600';
  P.elegir('wz_cashea_deuda', 'si'); D.wz_cashea_monto.value = '350'; D.wz_cashea_cuotas_pend.value = '4'; D.wz_cashea_compras_activas.value = '2'; D.wz_cashea_prox_monto.value = '45';
  await P.siguiente(false);
  u = ultimo();
  ok('Cashea guarda solo los campos que se quedan', u.datos.cashea === 'si' && u.datos.cashea_nivel === '4' && u.datos.cashea_estado === 'al_dia' && u.datos.cashea_linea === 600 && u.datos.cashea_deuda === 'si' && u.datos.cashea_monto === 350 && u.datos.cashea_cuotas_pend === 4 && u.datos.cashea_compras_activas === 2 && u.datos.cashea_prox_monto === 45);
  const QUITADOS = ['cashea_pago','cashea_ultimo_art','cashea_ultimo_monto','cashea_ultima_fecha','cashea_total_compras','cashea_cupo','cashea_cuotas_tiempo','cashea_total_pagado','cashea_atrasos','cashea_bajo_nivel','cashea_antiguedad','cashea_prox_fecha','cashea_verificado','cashea_obs'];
  ok('...ninguno de los que Adam quitó (ni los del empleado) está en la página ni en las Reglas', QUITADOS.every(k => src('assets/public/request.js').indexOf(k) === -1 && src('solicitar.html').indexOf(k) === -1 && EDITABLES.indexOf(k) === -1));

  // ── Parte 6: donde vives ──
  ok('parte 6 muestra el estado que dio al principio', /Miranda/.test(D.p6estado.textContent));
  D.wz_ciudad_res.value = 'Sucre, Petare'; D.wz_dir_det.value = 'Barrio José Félix Ribas, zona 10, casa 25'; D.wz_dir_ref.value = 'frente a la panadería'; P.elegir('wz_tdir', '3'); P.elegir('wz_viv', 'alquilada');
  await P.siguiente(false);
  u = ultimo();
  ok('la dirección lleva el punto de referencia pegado', u.datos.ciudad === 'Sucre, Petare' && u.datos.dir === 'Barrio José Félix Ribas, zona 10, casa 25 · Ref: frente a la panadería' && u.datos.tiempo_dir === '3' && u.datos.vivienda === 'alquilada');

  // ── Parte 7: referencias ──
  D.wz_r1n.value = 'María González'; D.wz_r1t.value = '04241112233'; P.elegir('wz_r1r', 'Amigo/a');
  D.wz_r2n.value = 'Pedro Díaz'; D.wz_r2t.value = '12';
  await P.siguiente(false);
  ok('un teléfono de referencia que no se entiende se marca y no avanza', D.p7.hidden === false && /Revisa el número/.test(D.err_wz_r2t.textContent));
  await P.siguiente(true);
  u = ultimo();
  ok('las referencias van sin cédula ni observación (esas son del equipo)', JSON.stringify(u.datos.ref1) === JSON.stringify({ nom:'María González', ci:'', tel:'0424-1112233', rel:'Amigo/a', obs:'' }) && u.datos.ref2.nom === 'Pedro Díaz' && u.datos.ref2.tel === '' && u.datos.ref2.rel === '');

  // ── Parte 8: fiador ──
  P.elegir('wz_fiador', 'si'); D.wz_fiador_tel.value = '0412 765 43 21';
  await P.siguiente(false);
  ok('fiador con teléfono y sin nombre: se pide el nombre y no avanza', D.p8.hidden === false && /nombre/.test(D.err_wz_fiador_nom.textContent));
  ok('...y con "No sé esto" no viaja nada suelto del fiador (el panel lo abre por su nombre)', Object.keys(P.datosPantalla('p8', false).datos).length === 0);
  D.wz_fiador_tel.value = ''; D.wz_fiador_nom.value = 'José Rodríguez';
  await P.siguiente(false);
  ok('fiador con nombre y sin teléfono: se pide el teléfono', D.p8.hidden === false && /teléfono/.test(D.err_wz_fiador_tel.textContent));
  D.wz_fiador_tel.value = '0412 765 43 21'; P.elegir('wz_fiador_rel', 'conyuge'); D.wz_fiador_ci.value = 'v-9.876.543'; D.wz_fiador_ing.value = '600';
  await P.siguiente(false);
  u = ultimo();
  ok('fiador "si" solo con nombre y teléfono, y lo demás normalizado', u.datos.fiador === 'si' && u.datos.fiador_nom === 'José Rodríguez' && u.datos.fiador_tel === '0412-7654321' && u.datos.fiador_rel === 'conyuge' && u.datos.fiador_ci === 'V-9876543' && u.datos.fiador_ing === 600);

  // ── Parte 9: sobre ti ──
  D.wz_fn_d.value = '15'; D.wz_fn_m.value = '03'; D.wz_fn_a.value = '1995'; D.wz_email.value = ' Carlos@Gmail.com '; D.wz_rif.value = 'v-12345678-9'; P.elegir('wz_conocio', 'redes');
  await P.siguiente(false);
  u = ultimo();
  ok('sobre ti: fecha AAAA-MM-DD, correo en minúsculas, RIF y cómo nos conoció', u.datos.fecha_nacimiento === '1995-03-15' && u.datos.email === 'carlos@gmail.com' && u.datos.rif === 'V-12345678-9' && u.datos.conocio === 'redes' && u.datos.web_paso === 9);
  ok('una fecha que no existe (31 de febrero) no se guarda', P.fechaNacimiento('31','02','2000') === '');

  // ── Terminar ──
  ok('la última pantalla dice "Terminar", sin "No sé esto"', D.pFin.hidden === false && D.btnSiguiente.textContent === 'Terminar' && D.btnNoSe.hidden === true && /parte 9 de 9|Parte 9 de 9/.test(D.wzPaso.textContent));
  ok('...con el resumen de las partes y "Cambiar"', /Parte 3 · Tu trabajo/.test(D.finResumen.innerHTML) && /data-ir="1"/.test(D.finResumen.innerHTML) && /Contestada/.test(D.finResumen.innerHTML));
  // Todo lo que mando la pagina: solo campos que las Reglas dejan, y nada vacio
  const envios = comp.base.log.filter(x => x.tipo === 'update');
  const claves = new Set(); envios.forEach(e => Object.keys(e.datos).forEach(k => claves.add(k)));
  const fueraEd = [...claves].filter(k => EDITABLES.indexOf(k) === -1);
  ok('cada campo que mandan las partes 2 a 9 está en camposWebEditables()' + (fueraEd.length ? ' (faltan: '+fueraEd.join(', ')+')' : ''), EDITABLES.length > 30 && fueraEd.length === 0);
  ok('nunca se manda nombre, cédula, teléfono, estado, origen ni la sesión', ['nombre','cedula','tel','wa','estado','origen','id','web_uid','web_ts','notas','score_indexa','impresion'].every(k => !claves.has(k)));
  ok('nunca se manda un vacío ("" o 0) salvo "Nadie más"', envios.every(e => Object.keys(e.datos).every(k => e.datos[k] !== '' && (e.datos[k] !== 0 || k === 'dependientes'))));
  await P.siguiente(false);
  ok('Terminar escribe web_fin con la hora del servidor', doc().web_fin === 'TS' && ultimo().datos.web_fin.__ts);
  ok('...cierra la sesión, borra el borrador y lo dice', comp.auth.currentUser === null && comp.ls.getItem(BK) === null && D.fOK.cls.has('on') && /Borramos tus respuestas de este teléfono/.test(D.okText.textContent));

  // ── Retomar en el mismo telefono ──
  const comp2 = { ls: localStorageFalso(), auth: crearAuth(), base: crearBase() };
  P = pagina(comp2); let Q = P._dom; await esperar();
  const llenarEn = (dom, ci) => { dom.wz_nom.value = 'Ana Ruiz'; dom.wz_ci.value = ci; dom.wz_tel.value = '0424-7654321'; dom.wz_emp.value = 'remesas'; dom.wz_ing_rango.value = '225'; dom.wz_estado.value = 'Zulia'; };
  llenarEn(Q, 'V-20111222');
  await P.submitF({ preventDefault(){} });
  P.irA(0); P.elegir('wz_uso', 'personal'); await P.siguiente(false);
  ok('parte 3 para quien vive de remesas: sin empresa ni lugar de trabajo', Q.q_empresa.hidden === true && Q.q_dir_trabajo.hidden === true && Q.p3remesas.hidden === false && /te mandan plata/.test(Q.t_ant.textContent));
  Q.wz_cargo.value = 'Vendo tortas';
  await P.salir();
  ok('"Salir y terminar después" guarda lo de la pantalla y muestra hasta cuándo puede seguir', Q.fPausa.cls.has('on') && comp2.base.almacen['clientes/WEB-20111222'].cargo === 'Vendo tortas' && Q.pausaFecha.textContent.length > 5);
  ok('...y deja la sesión viva para retomar en este teléfono', !!comp2.auth.currentUser);
  b = JSON.parse(comp2.ls.getItem(BK));
  ok('...el borrador sabe en qué parte iba', b.leadId === 'WEB-20111222' && b.i === 1 && b.parte === 3 && b.v.wz_cargo === 'Vendo tortas');
  // Vuelve mas tarde: pagina nueva, misma sesion
  P = pagina(comp2); Q = P._dom; await esperar();
  ok('al volver: "¿Seguimos donde quedaste?" en la parte 3, con lo que ya escribió', Q.fRet.cls.has('on') && /parte 3 de 9/.test(Q.retText.textContent) && Q.btnRetSeguir.disabled === false && Q.retNombre.textContent === 'Ana' && Q.wz_cargo.value === 'Vendo tortas');
  await P.seguirDondeQuede();
  ok('...y sigue justo ahí', Q.fsWiz.cls.has('on') && Q.p3.hidden === false);
  // Sin señal: se guarda en el telefono y se reenvia al volver
  P.elegir('wz_ant', '5');
  P._vencerTiempos = true; comp2.base.colgar = true;
  await P.siguiente(false);
  ok('sin señal no se traba: avisa, sigue y deja la parte pendiente', Q.p4.hidden === false && /sin señal/.test(Q.wzAviso.textContent) && JSON.parse(comp2.ls.getItem(BK)).pend.p3 === true);
  P._vencerTiempos = false; comp2.base.colgar = false;
  P = pagina(comp2); Q = P._dom; await esperar();
  await P.seguirDondeQuede();
  ok('al retomar, lo que se quedó sin señal se reenvía', comp2.base.almacen['clientes/WEB-20111222'].antiguedad === '5' && !JSON.parse(comp2.ls.getItem(BK)).pend.p3);
  // La base niega una parte (algo que las Reglas no aceptan): se sigue sin esa parte
  comp2.base.rechazar = d => 'ingreso_familiar' in d;
  Q.wz_ifam.value = '900';
  await P.siguiente(false);
  ok('si la base no acepta una parte pero sí la solicitud, se sigue sin esa parte y se avisa', Q.p5.hidden === false && /asesor te la pregunta/.test(Q.wzAviso.textContent) && !('ingreso_familiar' in comp2.base.almacen['clientes/WEB-20111222']));
  comp2.base.rechazar = null;
  // El equipo cerro el formulario: se acaba y se ofrece WhatsApp
  comp2.base.almacen['clientes/WEB-20111222'].web_cerrado = true;
  P.elegir('wz_hist', 'ninguno');
  await P.siguiente(false);
  ok('con el formulario cerrado por el asesor: "Tu asesor ya tiene tu solicitud", sin sesión ni borrador', Q.fOK.cls.has('on') && /Tu asesor ya tiene tu solicitud/.test(Q.okTitulo.textContent) && comp2.auth.currentUser === null && comp2.ls.getItem(BK) === null);

  // Sesion perdida (otro navegador, datos borrados): se dice y se ofrece WhatsApp
  const comp3 = { ls: localStorageFalso(), auth: crearAuth(), base: crearBase() };
  P = pagina(comp3); Q = P._dom; await esperar();
  llenarEn(Q, 'V-30111222'); await P.submitF({ preventDefault(){} });
  comp3.auth.currentUser = null;
  P = pagina(comp3); Q = P._dom; await esperar();
  ok('borrador sin su sesión: "No podemos seguir desde aquí", WhatsApp y "Hacer otra solicitud"', Q.fOK.cls.has('on') && /No podemos seguir desde aquí/.test(Q.okTitulo.textContent) && /WhatsApp/.test(Q.okText.textContent) && Q.btnNueva.hidden === false && comp3.ls.getItem(BK) === null);
  // Borrador vencido: se borra y se cierra la sesion
  const comp4 = { ls: localStorageFalso(), auth: crearAuth(), base: crearBase() };
  P = pagina(comp4); Q = P._dom; await esperar();
  llenarEn(Q, 'V-40111222'); await P.submitF({ preventDefault(){} });
  b = JSON.parse(comp4.ls.getItem(BK)); b.creadoLead = Date.now() - 8*86400000; comp4.ls.setItem(BK, JSON.stringify(b));
  P = pagina(comp4); Q = P._dom; await esperar();
  ok('borrador de más de 7 días: se borra y se cierra la sesión', comp4.ls.getItem(BK) === null && comp4.auth.currentUser === null && Q.fs1.cls.has('on'));
  // Una sesion vieja sin solicitud a medias no se queda abierta
  comp4.auth.currentUser = { uid:'vieja' };
  P = pagina(comp4); await esperar();
  ok('sesión anónima suelta sin borrador: se cierra al cargar', comp4.auth.currentUser === null);
  // "Prefiero que me escriban por WhatsApp"
  const comp5 = { ls: localStorageFalso(), auth: crearAuth(), base: crearBase() };
  P = pagina(comp5); Q = P._dom; await esperar();
  llenarEn(Q, 'V-50111222'); await P.submitF({ preventDefault(){} });
  await P.prefieroWhatsApp();
  ok('"Prefiero que me escriban por WhatsApp": cierra la sesión, borra el borrador y deja el WhatsApp con el número', comp5.auth.currentUser === null && comp5.ls.getItem(BK) === null && /WEB-50111222/.test(decodeURIComponent(Q.okWA.href)) && Q.okPasos.hidden === false);
  // Borrador de la parte 1 (todavia sin enviar)
  const comp6 = { ls: localStorageFalso(), auth: crearAuth(), base: crearBase() };
  P = pagina(comp6); Q = P._dom; await esperar();
  Q.wz_nom.value = 'Luis Mora'; Q.wz_estado.value = 'Lara'; P.guardarBorrador();
  P = pagina(comp6); Q = P._dom; await esperar();
  ok('lo escrito en la parte 1 vuelve al abrir otra vez', Q.wz_nom.value === 'Luis Mora' && Q.wz_estado.value === 'Lara');

  // ── La pagina ──
  const html = src('solicitar.html'), rq = src('assets/public/request.js');
  ok('la parte 1 pide los seis datos (con el estado en vez de la zona)', ['wz_nom','wz_ci','wz_tel','wz_emp','wz_ing_rango','wz_estado','fM'].every(id => html.indexOf('id="'+id+'"') > -1) && html.indexOf('id="wz_ciudad"') === -1);
  const opcionesEstado = (html.slice(html.indexOf('id="wz_estado"'), html.indexOf('</select>', html.indexOf('id="wz_estado"'))).match(/<option value="([^"]+)"/g) || []).map(s => s.slice(15, -1));
  const estadosReglas = listaDe(trozo('function estadosVe()', ']'));
  ok('los 24 estados son los mismos en la página, en request.js y en las Reglas', opcionesEstado.length === 24 && JSON.stringify(opcionesEstado) === JSON.stringify(P.ESTADOS_VE) && JSON.stringify(estadosReglas) === JSON.stringify(P.ESTADOS_VE));
  ok('cada respuesta de las partes tiene su campo en la página', P.CAMPOS_WIZ.every(id => html.indexOf('id="'+id+'"') > -1));
  ok('nada de fotos, documentos, cuenta bancaria, terremoto, cargo público ni cédula de las referencias',
    !/type="file"/.test(html) && ['terremoto','wz_pep','cargo público','cuenta_digitos','wz_cuenta','banco_cobro','wz_r1ci','wz_r2ci','selfie','Selfie'].every(s => html.indexOf(s) === -1)
    && ['terremoto_afectado','terremoto_danos','pep_detalle',"'pep'",'cuenta_digitos','banco_cobro','web_docs','storage('].every(s => rq.indexOf(s) === -1));
  ok('el aviso fijo: nunca claves, códigos por mensaje ni números de cuenta', html.split('Nunca te pedimos claves, códigos que te lleguen por mensaje ni números de cuenta').length >= 3);
  ok('la pantalla de "ya nos llegó" invita a seguir con un botón grande y deja WhatsApp como enlace chico',
    /Contesta unas preguntas más \(10 a 15 minutos\) y tu asesor no tendrá que preguntarte nada\. Todo es opcional\./.test(html) && /id="btnSeguirSolicitud" class="btn btn-p fbig">Seguir con mi solicitud</.test(html) && /id="btnPrefieroWA" class="flink">Prefiero que me escriban por WhatsApp</.test(html));
  ok('cada parte tiene Siguiente, "No sé esto, siguiente", Atrás y "Salir y terminar después"', /id="btnSiguiente"[^>]*>Siguiente</.test(html) && />No sé esto, siguiente</.test(html) && /id="btnAtras"[^>]*>Atrás</.test(html) && />Salir y terminar después</.test(html));
  ok('la última pantalla: "Todo lo que llenaste ya nos llegó. Toca Terminar para avisarle a tu asesor"', /Todo lo que llenaste ya nos llegó\. Toca <b>Terminar<\/b> para avisarle a tu asesor\./.test(html));
  ok('"Elegir de mis contactos" nace escondido (solo aparece si el navegador lo tiene)', (html.match(/data-contacto="[a-z0-9]+" hidden>Elegir de mis contactos/g) || []).length === 3 && /navigator\.contacts\.select/.test(src('assets/public/request-ui.js')));
  ok('el lenguaje de la calle: "¿Cuántas personas viven de lo que tú ganas?" y la dirección con barrio', /¿Cuántas personas viven de lo que tú ganas\?/.test(html) && /barrio José Félix Ribas/.test(html));
  ok('la página no usa alert() ni guarda la sesión con signOut entre partes', !/alert\(/.test(rq) && (rq.match(/signOut\(\)/g) || []).length === 1);
  ok('la hoja de estilo y los scripts van versionados', /assets\/public\/request\.css\?v=26-/.test(html) && /request\.js\?v=26-20260927-2/.test(html));

  // ── Los valores: los mismos de las Reglas y los del asistente ──
  const O = P.OPC, q = l => '[' + l.map(x => "'"+x+"'").join(', ') + ']';
  const pares = [['uso_moto',O.uso_moto],['moto_previa',O.moto_previa],['antiguedad',O.antiguedad],['dia_cobro',O.dia_cobro],['remesas',O.si_no],['ahorro',O.ahorro],
    ['inicial_rango',O.inicial_rango],['historial',O.historial],['deudas',O.deudas],['banco_estado',O.banco_estado],['cashea',O.si_no],['cashea_nivel',O.cashea_nivel],
    ['cashea_estado',O.cashea_estado],['cashea_deuda',O.si_no],['tiempo_dir',O.tiempo_dir],['vivienda',O.vivienda],['fiador_rel',O.fiador_rel],['conocio',O.conocio]];
  const noCalzan = pares.filter(x => reglas.indexOf('d.'+x[0]+' in '+q(x[1])) === -1).map(x => x[0]);
  ok('cada lista cerrada de la página es la misma de las Reglas' + (noCalzan.length ? ' (no calzan: '+noCalzan.join(', ')+')' : ''), noCalzan.length === 0);
  ok('...y las relaciones de las referencias también', reglas.indexOf("in ['', " + q(O.rel_ref).slice(1)) > -1);
  const cr = src('logic/creditos.js');
  const enAsistente = c => cr.indexOf('value="'+c+'"') > -1 || cr.indexOf("['"+c+"',") > -1 || cr.indexOf(",'"+c+"']") > -1 || cr.indexOf('<option>'+c+'</option>') > -1;
  const ajenos = [].concat(O.uso_moto, O.moto_previa, O.antiguedad, O.dia_cobro, O.ahorro, O.historial, O.deudas, O.banco_estado, O.cashea_estado, O.tiempo_dir, O.vivienda, O.rel_ref, O.fiador_rel, O.conocio, P.TRABAJOS).filter(c => !enAsistente(c));
  ok('cada código que manda la web existe en el asistente "Nueva solicitud"' + (ajenos.length ? ' (no están: '+ajenos.join(', ')+')' : ''), ajenos.length === 0);

  // ── Las Reglas ──
  ok('ya no existe esLeadWebAmpliando (una sola edición)', reglas.indexOf('esLeadWebAmpliando()') === -1 && reglas.indexOf('web_ampliado') === -1);
  ok('crear: solo sesión anónima, web_uid de ESA sesión, web_ts del servidor y cédula amarrada al id',
    /sign_in_provider == 'anonymous'[\s\S]*d\.web_uid == request\.auth\.uid[\s\S]*d\.web_ts == request\.time[\s\S]*d\.cedula\.split\('-'\)\[1\] == id\.split\('-'\)\[1\]/.test(trozo('function esLeadWeb(', 'function camposWebEditables')));
  ok('crear: sin notas, score, impresión, obs ni documentos', ['notas','score_indexa','impresion','documentos','docs_count','ref1','obs','f1'].every(k => CREAR.indexOf(k) === -1));
  ok('crear: el marcador web_sesiones va en el mismo lote (getAfter) y no se reescribe', /getAfter\(\/databases\/\$\(database\)\/documents\/web_sesiones\/\$\(request\.auth\.uid\)\)\.data\.leadId == id/.test(reglas) && /match \/web_sesiones\/\{uid\} \{[\s\S]*?allow update: if false;/.test(reglas));
  const ed = trozo('function esLeadWebEditando()', 'match /clientes/');
  ok('editar: misma sesión, lead web vivo, sin cerrar, sin terminar, sin eliminar y dentro de 7 días',
    ["antes.get('web_uid', '') == request.auth.uid", "antes.get('web_cerrado', false) != true", "antes.get('web_fin', null) == null", "antes.get('eliminado', false) != true", "request.time < antes.web_ts + duration.value(7, 'd')", 'cambia.hasOnly(camposWebEditables())'].every(s => ed.indexOf(s) > -1));
  ok('editar: web_n +1 con tope de 80, web_act y web_fin con la hora del servidor', /d\.get\('web_n', 0\) == antes\.get\('web_n', 0\) \+ 1 && d\.web_n <= 80/.test(ed) && /d\.web_act == request\.time/.test(ed) && /d\.web_fin == request\.time/.test(ed));
  ok('editar: nunca nombre, cédula, teléfono, estado, origen ni la sesión', ['nombre','cedula','tel','wa','estado','origen','id','web_uid','web_ts','notas','score_indexa','estado_ubi'].every(k => EDITABLES.indexOf(k) === -1));
  ok('el staff sigue igual', /allow create: if esStaff\(\) \|\| esLeadWeb\(id\);/.test(reglas) && /allow update: if esStaff\(\) \|\| esLeadWebEditando\(\);/.test(reglas));

  // ── El panel ──
  const cx = { console:{log(){},warn(){},error(){}}, setTimeout(f){ return 0; }, clearTimeout(){}, encodeURIComponent, Date, Promise,
    document:{ getElementById(){ return null; }, querySelector(){ return null; }, createElement(){ return elemento('div'); }, body:elemento('body') },
    S:{ clientes:[], creds:[], currentUser:{ nombre:'Samantha' }, page:'dash' }, toast(){}, fmt(n){ return '$'+n; }, confirm(){ return true; } };
  const guardados = []; cx.DB = { saveCliente(o){ guardados.push(o); return Promise.resolve(true); } };
  cx.window = cx; vm.createContext(cx);
  vm.runInContext(src('logic/solicitudes-web.js'), cx, { filename:'solicitudes-web.js' });
  const hace = min => new Date(Date.now() - min*60000).toISOString();
  const lead = { id:'WEB-12345678', nombre:'Carlos Pérez', origen:'web', estado:'lead', tel:'0414-1234567', creado:'2026-09-27T10:00:00.000Z', moto_interes_modelo:'NEW HORSE 150', moto_interes_sede:'EK Bello Monte',
    ingreso:400, ingreso_rango:'$300 a $500', trabajo:'delivery', estado_ubi:'Miranda', ciudad:'Petare', web_uid:'anon-1', web_paso:5, web_act:{ seconds: Math.floor(Date.now()/1000) - 300 }, uso_moto:'delivery', inicial_rango:'<200', dia_cobro:'semanal' };
  const otro = { id:'C-1', nombre:'Pedro', origen:'panel' };
  cx.S.clientes = [lead, otro];
  ok('pendientes: solo los leads web sin atender, sin cerrar y sin crédito', cx._swPendientes().length === 1 && cx._swPendientes()[0].id === 'WEB-12345678');
  cx.S.creds = [{ id:'M-001', clienteId:'WEB-12345678', cli:'CARLOS PÉREZ', estado:'activo' }];
  ok('...con crédito ya no cuenta (el crédito lo amarra por clienteId, como lo guarda el asistente)', cx._swPendientes().length === 0);
  cx.S.creds = [{ id:'C-0009', cliId:'WEB-12345678', estado:'activo' }];
  ok('...ni con un crédito viejo que usa cliId', cx._swPendientes().length === 0);
  cx.S.creds = [{ id:'M-002', clienteId:'C-77', cli:'Carlos Pérez', estado:'activo' }];
  ok('...pero el crédito de OTRO cliente con el mismo nombre no lo marca', cx._swPendientes().length === 1 && !/Ya tiene crédito/.test(cx._swFichaHtml(lead)));
  cx.S.creds = []; lead.webAtendidaEn = '2026-09-27T11:00:00.000Z'; lead.webAtendidaPor = 'Samantha';
  ok('...marcada como atendida tampoco', cx._swPendientes().length === 0);
  lead.webAtendidaEn = ''; lead.webAtendidaPor = ''; lead.web_cerrado = true;
  ok('...ni con el formulario cerrado', cx._swPendientes().length === 0 && /Formulario cerrado/.test(cx._swFichaHtml(lead)) && !/Sin atender/.test(cx._swFichaHtml(lead)));
  delete lead.web_cerrado;
  let ficha = cx._swFichaHtml(lead);
  ok('la ficha dice cuánto llenó y que sigue llenando', /Llenó 5 de 9 partes · Sigue llenando: último cambio hace 5 min/.test(ficha));
  ok('...el uso de la moto, lo que tiene para la inicial, cómo cobra y el ingreso por rango', /Para trabajar \(delivery, mototaxi\)/.test(ficha) && /Menos de \$200/.test(ficha) && /Semanal/.test(ficha) && /\$300 a \$500/.test(ficha) && /Miranda/.test(ficha));
  lead.web_act = hace(180);
  ok('si hace rato que no toca nada, ya no dice "sigue llenando"', /Llenó 5 de 9 partes · Último cambio hace 3 h/.test(cx._swFichaHtml(lead)));
  lead.web_fin = { toDate(){ return new Date(Date.now() - 120000); } };
  ok('con web_fin dice "Terminó"', /Terminó el formulario · hace 2 min/.test(cx._swFichaHtml(lead)));
  lead.ingreso = 430; lead.ingreso_exacto = true;
  ok('si dio la cifra, se ve la cifra y el rango que marcó', /\$430\/mes \(marcó \$300 a \$500\)/.test(cx._swFichaHtml(lead)));
  const viejo = { id:'WEB-1789798989431', nombre:'Lead Viejo', origen:'web', estado:'lead', ingreso:400, notas:'Solicitud web · Ingreso declarado: $300 a $500 · Interesado en X' };
  ok('los leads de antes (sin ingreso_rango) sacan el rango de las notas', cx._swIngreso(viejo) === '$300 a $500' && /Formulario corto/.test(cx._swAvance(viejo)));
  ficha = cx._swFichaHtml(lead);
  ok('WhatsApp listo, Crear solicitud, Marcar atendida y Cerrar formulario', /wa\.me\/584141234567\?text=/.test(ficha) && /_swCrearSolicitud\('WEB-12345678'\)/.test(ficha) && /_swMarcarAtendida\('WEB-12345678'\)/.test(ficha) && /_swCerrarFormulario\('WEB-12345678'\)/.test(ficha));
  ok('la ficha de un cliente del panel no muestra nada de esto', cx._swFichaHtml(otro) === '');
  await cx._swCerrarFormulario('WEB-12345678');
  const g = guardados.pop();
  ok('"Cerrar formulario" escribe web_cerrado, quién y cuándo', g && g.id === 'WEB-12345678' && g.web_cerrado === true && g.web_cerrado_por === 'Samantha' && /^\d{4}-\d{2}-\d{2}T/.test(g.web_cerrado_en));
  ok('...y ya no ofrece cerrarlo otra vez', !/_swCerrarFormulario/.test(cx._swFichaHtml(lead)));
  const malo = { id:'WEB-11111111', nombre:'<img src=x onerror=alert(1)>', origen:'web', ciudad:'Petare <script>alert(1)</script>', moto_interes_modelo:'X" onmouseover="alert(1)', empresa:'<b>',
    uso_moto:'<script>', inicial_rango:'"><svg onload=alert(1)>', ingreso_rango:'<i>x</i>', dia_cobro:'<u>', trabajo:'<s>', estado_ubi:'<p>', web_cerrado_por:'<b>yo</b>', web_cerrado:true };
  const fm = cx._swFichaHtml(malo);
  ok('todo lo que viene del lead se escapa en la ficha', fm.indexOf('<script>') === -1 && fm.indexOf('<img') === -1 && fm.indexOf('<svg') === -1 && fm.indexOf('<i>x') === -1 && fm.indexOf('<b>yo') === -1 && fm.indexOf('X" onmouseover') === -1 && /&lt;script&gt;/.test(fm));
  // aviso en vivo: nunca con la primera foto, si con las siguientes; y cuando termina
  let avisos = []; cx._swMostrarAviso = function(c, t){ avisos.push(t ? 'fin' : 'nueva'); };
  const foto = (tipo, datos) => ({ docChanges(){ return [{ type:tipo, doc:{ id:'WEB-99', data(){ return Object.assign({ nombre:'Nuevo', origen:'web' }, datos||{}); } } }]; } });
  cx._swAvisarNuevos(foto('added'), false);
  ok('la primera foto de clientes no avisa (trae todo como nuevo)', avisos.length === 0);
  cx._swAvisarNuevos(foto('added'), true); cx._swAvisarNuevos(foto('added'), true);
  ok('las siguientes avisan una sola vez por solicitud', avisos.join() === 'nueva');
  cx._swAvisarNuevos(foto('modified', { web_paso:4 }), true);
  ok('llenar una parte no avisa', avisos.join() === 'nueva');
  cx._swAvisarNuevos(foto('modified', { web_fin:{ seconds: Math.floor(Date.now()/1000) - 30 } }), true);
  cx._swAvisarNuevos(foto('modified', { web_fin:{ seconds: Math.floor(Date.now()/1000) - 30 }, webAtendidaEn:'x' }), true);
  ok('cuando termina el formulario avisa una vez', avisos.join() === 'nueva,fin');
  cx._swAvisarNuevos({ docChanges(){ return [{ type:'modified', doc:{ id:'WEB-98', data(){ return { nombre:'Vieja', origen:'web', web_fin:{ seconds: Math.floor(Date.now()/1000) - 86400*3 } }; } } }]; } }, true);
  ok('...pero no si terminó hace días (el equipo solo tocó la ficha)', avisos.join() === 'nueva,fin');
  cx.S.clientes = [Object.assign({}, lead, { web_fin:null, webAtendidaEn:'', web_cerrado:false })];
  ok('la pestaña de Clientes dice cuántas hay', cx._swChip()[0] === 'web' && /Solicitudes web · 1/.test(cx._swChip()[1]));

  // ── De punta a punta: la web → la ficha → "Crear solicitud" en el panel ──
  // (integracion con PAGASI 18, 27-sep-2026) Lo que la pagina deja escrito en la base tiene
  // que aparecerle YA ESCRITO al empleado en el asistente. Se llenan las 9 partes con la
  // pagina, se toma la ficha que quedo en la base falsa y se abre con el panel de verdad
  // (admin.html entero), igual que el boton "Crear solicitud" de la bandeja.
  {
    const c2 = { ls: localStorageFalso(), auth: crearAuth(), base: crearBase() };
    const Q = pagina(c2), E = Q._dom;
    await esperar();
    E.wz_nom.value = 'Carlos Pérez'; E.wz_ci.value = 'v 12.345.678'; E.wz_tel.value = '0414 123 45 67'; E.wz_emp.value = 'delivery'; E.wz_ing_rango.value = '225'; E.wz_estado.value = 'La Guaira'; E.fM.value = '1';
    await Q.submitF({ preventDefault(){} });
    Q.irA(0);
    Q.elegir('wz_uso', 'negocio'); Q.elegir('wz_moto_previa', 'pagada'); await Q.siguiente(false);
    E.wz_empresa.value = 'Yummy'; E.wz_cargo.value = 'Motorizado'; Q.elegir('wz_ant', '5'); E.wz_dir_trabajo.value = 'Chacao'; await Q.siguiente(false);
    Q.elegir('wz_dia_cobro', 'quincenal'); E.wz_monto.value = '200'; Q.elegir('wz_rem', 'si'); E.wz_ifam.value = '300'; Q.elegir('wz_dep', '2'); Q.elegir('wz_ahorro', 'bs'); Q.elegir('wz_inicial', '400-700'); await Q.siguiente(false);
    Q.elegir('wz_hist', 'mora_leve'); Q.elegir('wz_deuda', 'menores'); E.wz_deuda_mensual.value = '80'; Q.elegir('wz_banco', 'poca'); Q.elegir('wz_banco_nm', 'Banesco', true); await Q.siguiente(false);
    Q.elegir('wz_cashea', 'si'); Q.elegir('wz_cashea_nivel', '5'); Q.elegir('wz_cashea_estado', 'mora_leve'); E.wz_cashea_linea.value = '700';
    Q.elegir('wz_cashea_deuda', 'si'); E.wz_cashea_monto.value = '120'; E.wz_cashea_cuotas_pend.value = '3'; E.wz_cashea_compras_activas.value = '2'; E.wz_cashea_prox_monto.value = '40'; await Q.siguiente(false);
    E.wz_ciudad_res.value = 'Catia La Mar'; E.wz_dir_det.value = 'Calle 3, casa 12'; E.wz_dir_ref.value = 'frente a la panadería'; Q.elegir('wz_tdir', '4'); Q.elegir('wz_viv', 'propia'); await Q.siguiente(false);
    E.wz_r1n.value = 'María González'; E.wz_r1t.value = '04241112233'; Q.elegir('wz_r1r', 'Colega');
    E.wz_r2n.value = 'Luis Díaz'; E.wz_r2t.value = '0212 555 12 34'; Q.elegir('wz_r2r', 'Vecino/a'); await Q.siguiente(false);
    Q.elegir('wz_fiador', 'si'); E.wz_fiador_nom.value = 'José Rodríguez'; E.wz_fiador_tel.value = '0412 765 43 21'; Q.elegir('wz_fiador_rel', 'colega');
    E.wz_fiador_ci.value = 'v-9.876.543'; E.wz_fiador_dir.value = 'Catia'; E.wz_fiador_ing.value = '600'; await Q.siguiente(false);
    E.wz_fn_d.value = '05'; E.wz_fn_m.value = '03'; E.wz_fn_a.value = '1995'; E.wz_email.value = 'carlos@gmail.com'; E.wz_rif.value = 'V-12345678-9'; Q.elegir('wz_conocio', 'vitrina'); await Q.siguiente(false);
    await Q.siguiente(false);   // Terminar
    const L = JSON.parse(JSON.stringify(c2.base.almacen['clientes/WEB-12345678']));
    ok('punta a punta: la página llenó las 9 partes y terminó', L.web_paso === 9 && L.web_fin === 'TS' && L.fiador === 'si' && L.cashea === 'si');
    const fueraReglas = Object.keys(L).filter(k => CREAR.indexOf(k) === -1 && EDITABLES.indexOf(k) === -1);
    ok('...y todo lo que escribió está en las listas de las Reglas' + (fueraReglas.length ? ' (fuera: '+fueraReglas.join(', ')+')' : ''), fueraReglas.length === 0);

    // El panel entero, como lo carga admin.html
    const el2 = () => ({ innerHTML:'', textContent:'', value:'', className:'', style:{}, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], options:[], appendChild(){}, remove(){}, setAttribute(){}, getAttribute(){ return null; }, addEventListener(){}, focus(){}, closest(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; } });
    const F = {}; ['mic','mtt','msb','modal-box','mbd','mft','ov','wz-overlay'].forEach(id => F[id] = el2());
    const pend = [];
    const ax = { console:{log(){},warn(){},error(){}}, setTimeout(f){ pend.push(f); return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
      document:{ getElementById(id){ return F[id] || null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return el2(); }, head:el2(), body:el2(), documentElement:el2(), addEventListener(){}, removeEventListener(){} },
      navigator:{ userAgent:'node', language:'es' }, location:{ href:'https://pagasi.io/admin.html', search:'', hash:'', pathname:'/admin.html' },
      localStorage:{ getItem(){ return null; }, setItem(){}, removeItem(){} }, sessionStorage:{ getItem(){ return null; }, setItem(){}, removeItem(){} },
      fetch(){ return Promise.resolve({ ok:true, json:() => Promise.resolve({}) }); }, alert(){}, prompt(){ return ''; }, confirm(){ return true; }, open(){ return { document:{ write(){}, close(){} } }; },
      db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
    ax.MutationObserver = ax.IntersectionObserver = ax.ResizeObserver = function(){ return { observe(){}, disconnect(){}, unobserve(){} }; };
    ax.addEventListener = ax.removeEventListener = ax.scrollTo = function(){};
    ax.matchMedia = function(){ return { matches:false, addListener(){}, addEventListener(){} }; };
    ax.getComputedStyle = function(){ return { getPropertyValue(){ return ''; } }; };
    ax.history = { state:null, pushState(){}, replaceState(){}, back(){} }; ax.window = ax;
    const scripts = [...src('admin.html').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m => m[1]);
    vm.createContext(ax); vm.runInContext(scripts.map(f => src(f)).join('\n;\n'), ax, { filename:'admin.js' });
    ax.toast = ax.nav = ax.closeM = ax.setMicon = function(){}; ax._puedeVender = () => true;
    const guardadas = [];
    ax.DB.saveCliente = o => { guardadas.push(JSON.parse(JSON.stringify(o))); return Promise.resolve(); };
    ax.DB.crearCred = () => Promise.resolve();
    ax.S.clientes = [L]; ax.S.creds = []; ax.S.motos = []; ax.S.currentUser = { uid:'u-liz', nombre:'Liz', rol:'Administrador', permisos:[] };
    ax.window._wzEditando = null;
    ok('...la bandeja lo muestra terminado, con uso, inicial, cobro y la cifra exacta con su rango', /Terminó el formulario/.test(ax._swFichaHtml(L)) && /Para su negocio/.test(ax._swFichaHtml(L)) && /\$400 a \$700/.test(ax._swFichaHtml(L)) && /\$400(,00)?\/mes \(marcó \$150 a \$300\)/.test(ax._swFichaHtml(L)));
    ax._swCrearSolicitud('WEB-12345678'); pend.splice(0).forEach(f => f());
    const W = ax.WZ;
    ok('..."Crear solicitud" abre el asistente con el lead elegido', W.clienteSel === 'WEB-12345678');
    vm.runInContext('WZ.step=2;', ax); ax._wzRender(); const p2 = F['wz-overlay'].innerHTML;
    // campo del asistente → lo que escribio la web
    const ENC = { wz_nom:'nombre', wz_ci:'cedula', wz_tel:'tel', wz_wa:'wa', wz_email:'email', wz_ciudad:'ciudad', wz_conocio:'conocio', wz_estado:'estado_ubi',
      wz_ciudad_res:'ciudad', wz_dir_det:'dir', wz_tdir:'tiempo_dir', wz_viv:'vivienda', wz_empresa:'empresa', wz_cargo:'cargo', wz_ing:'ingreso', wz_ifam:'ingreso_familiar',
      wz_ant:'antiguedad', wz_rem:'remesas', wz_ahorro:'ahorro', wz_banco:'banco_estado', wz_banco_nm:'banco_nombre',
      wz_cashea_nivel:'cashea_nivel', wz_cashea_estado:'cashea_estado', wz_cashea_deuda:'cashea_deuda', wz_cashea_monto:'cashea_monto', wz_cashea_cuotas_pend:'cashea_cuotas_pend',
      wz_cashea_linea:'cashea_linea', wz_cashea_compras_activas:'cashea_compras_activas', wz_cashea_prox_monto:'cashea_prox_monto',
      wz_fiador_nom:'fiador_nom', wz_fiador_tel:'fiador_tel', wz_fiador_ci:'fiador_ci', wz_fiador_rel:'fiador_rel', wz_fiador_dir:'fiador_dir', wz_fiador_ing:'fiador_ing',
      wz_fecha_nacimiento:'fecha_nacimiento', wz_dia_cobro:'dia_cobro', wz_deuda_mensual:'deuda_mensual', wz_moto_previa:'moto_previa' };
    const REF = { wz_r1n:['ref1','nom'], wz_r1t:['ref1','tel'], wz_r1r:['ref1','rel'], wz_r2n:['ref2','nom'], wz_r2t:['ref2','tel'], wz_r2r:['ref2','rel'] };
    Object.keys(ENC).concat(Object.keys(REF)).forEach(id => F[id] = el2());
    ax._wzHydrate();
    const valor = id => ENC[id] ? L[ENC[id]] : L[REF[id][0]][REF[id][1]];
    const distintos = Object.keys(ENC).concat(Object.keys(REF)).filter(id => valor(id) == null || String(F[id].value) !== String(valor(id)));
    ok('...cada respuesta aparece escrita en su campo del asistente' + (distintos.length ? ' (fallan: '+distintos.map(id => id+'='+JSON.stringify(F[id].value)).join(', ')+')' : ''), distintos.length === 0);
    ok('...trabajo, dependientes, historial y deudas marcados; Cashea y fiador en "Sí"', W['_chip_wz_emp_g'] === L.trabajo && W['_chip_wz_dep_g'] === String(L.dependientes) && W['_chip_wz_hist_g'] === L.historial && W['_chip_wz_deuda_g'] === L.deudas && W.cashea === 'si' && W.fiador_tiene === 'si');
    ok('...con la cifra exacta del ingreso no pide confirmarla', p2.indexOf('wz_pista_ingreso') === -1);
    vm.runInContext('WZ.step=3;', ax); ax._wzRender(); const p3 = F['wz-overlay'].innerHTML; F.wz_uso = el2(); ax._wzHydrate();
    ok('...paso 3: el uso de la moto puesto, y la moto y la inicial como pistas', F.wz_uso.value === L.uso_moto && /El cliente quiere: NEW HORSE 150 · EK Bello Monte/.test(p3) && /El cliente dice que tiene: entre \$400 y \$700/.test(p3));
    // Cada campo que escribe la web tiene destino en el panel: si la web gana uno nuevo, aqui se ve
    const DESTINO = Object.values(ENC).concat(['ref1','ref2','trabajo','dependientes','historial','deudas','cashea','fiador','uso_moto',
      'moto_interes_id','moto_interes_modelo','moto_interes_precio','moto_interes_sede','inicial_rango','ingreso_rango','ingreso_exacto',   // pistas y bandeja
      'rif','dir_trabajo',                                                                                                              // ficha y contrato
      'id','estado','origen','creado','editadoEn','editadoPor','web_uid','web_ts','web_paso','web_act','web_n','web_fin']);
    const sinDestino = Object.keys(L).filter(k => DESTINO.indexOf(k) === -1);
    ok('...ningún dato de la web se queda sin destino en el panel' + (sinDestino.length ? ' (sin destino: '+sinDestino.join(', ')+')' : ''), sinDestino.length === 0);
    vm.runInContext('WZ.step = 4; WZ.precio = 0;', ax);
    ax._wzGuardar();
    await new Promise(r => setTimeout(r, 30)); pend.splice(0).forEach(f => { try{ f(); }catch(e){} });
    const gl = guardadas.find(o => o.id === 'WEB-12345678');
    ok('...al crear el crédito se cierra el formulario y no se pierden el RIF ni la dirección del trabajo', !!gl && gl.web_cerrado === true && gl.web_cerrado_por === 'Liz' && gl.rif === L.rif && gl.dir_trabajo === L.dir_trabajo);
    ok('...y la bandeja lo reconoce: "Ya tiene crédito", ya no "Sin atender"', ax._swTieneCredito(ax.S.clientes[0]) && /Ya tiene crédito/.test(ax._swFichaHtml(ax.S.clientes[0])) && ax._swPendientes().length === 0);
  }

  // ── Los ganchos en los archivos compartidos ──
  ok('admin.html carga solicitudes-web.js', /logic\/solicitudes-web\.js\?v=/.test(src('admin.html')));
  ok('Clientes tiene la pestaña y el filtro', /_swChip/.test(src('modules/clientes.js')) && /filtro==='web'/.test(src('logic/clientes.js')));
  ok('la ficha llama a la tarjeta', /_swFichaHtml\(c\)/.test(src('logic/clientes.js')));
  ok('el tiempo real avisa y el menú cuenta', /_swAvisarNuevos\(snap, !!_rtPrimeras\[spec\.col\]\)/.test(src('assets/pagasi-app.js')) && /_swSidebarBadge\(\)/.test(src('assets/pagasi-app.js')));

  // ── Lo que sobrevive a la regeneracion desde PAGASI 18 ──
  // El script vive fuera del repositorio (en la carpeta de las dos companias): si no esta
  // en esta maquina, no hay nada que revisar.
  const rutaClon = path.join(ROOT, '..', 'preparar-clon-26.sh');
  if(fs.existsSync(rutaClon)){
    const clon = fs.readFileSync(rutaClon, 'utf8');
    const solo = (/SOLO_26="([^"]+)"/.exec(clon) || [,''])[1].replace(/\\\n/g, ' ').split(/\s+/).filter(Boolean);
    ok('preparar-clon-26.sh conserva las pruebas de reglas y su workflow', ['tests/reglas/t_reglas_solicitud_web.js', '.github/workflows/reglas-probar.yml', 'firestore.rules', 'solicitar.html'].every(f => solo.indexOf(f) > -1));
    ok('...y los restaura DESPUÉS de borrar los workflows de PAGASI 18', clon.indexOf('rm -rf reportes .github/workflows') > -1 && clon.indexOf('rm -rf reportes .github/workflows') < clon.indexOf('for f in $SOLO_26'));
  }
  const wf = src('.github/workflows/reglas-probar.yml');
  ok('el workflow de reglas es manual, sin secretos, y corre las de la solicitud web', /workflow_dispatch/.test(wf) && !/secrets\./.test(wf) && /t_reglas_solicitud_web\.js/.test(wf) && /t_reglas_gps_cliente\.js/.test(wf));

  console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
  if(fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exitCode = 1; });
