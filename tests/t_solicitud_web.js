// 27-sep-2026: la solicitud publica se acorto a una pantalla de seis datos, con errores
// al lado del campo, borrador local, exito util y bandeja para el equipo. Esto prueba
// la logica pura del formulario (normalizacion, validacion, payload) y la del panel
// (pendientes, tarjeta de la ficha, aviso en vivo) sin navegador ni base.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── Un DOM minimo para request.js ──────────────────────────────────────────
function elemento(tag){
  const e = { tag, value:'', textContent:'', innerHTML:'', hidden:false, href:'', disabled:false, selectedIndex:0, options:[], attrs:{}, cls:new Set(), oyentes:{},
    classList:{ add(c){ e.cls.add(c); }, remove(c){ e.cls.delete(c); }, contains(c){ return e.cls.has(c); }, toggle(c, on){ if(on===undefined) on=!e.cls.has(c); if(on) e.cls.add(c); else e.cls.delete(c); return on; } },
    setAttribute(k,v){ e.attrs[k]=v; }, removeAttribute(k){ delete e.attrs[k]; }, getAttribute(k){ return e.attrs[k]; },
    addEventListener(t, f){ (e.oyentes[t]=e.oyentes[t]||[]).push(f); }, closest(){ return e.fg||null; }, focus(){}, scrollIntoView(){}, appendChild(){}, insertBefore(){}, querySelector(){ return null; }, querySelectorAll(){ return []; } };
  return e;
}
const dom = {};
['wz_nom','wz_ci','wz_tel','wz_emp','wz_ing_rango','wz_ciudad','fM','fPlan','fAviso','formSolicitud','fs1','fs2','fOK','fOK2','okNombre','okId','okTitulo','okText','okWA','okWA2','okExtra','btnGuardarSolicitud','btnAdelantar','btnOmitir','btnGuardarExtra','wz_cashea','wz_fiador','casheaWrap','fiadorWrap',
 'wz_ant','wz_empresa','wz_viv','wz_dep_g','wz_hist_g','wz_deuda_g','wz_banco','wz_cashea_nivel','wz_cashea_pago','wz_fiador_nom','wz_fiador_rel','wz_conocio','wz_r1n','wz_r1t',
 'err_wz_nom','err_wz_ci','err_wz_tel','err_wz_emp','err_wz_ing_rango'].forEach(id => { dom[id] = elemento(id); });
['wz_nom','wz_ci','wz_tel','wz_emp','wz_ing_rango'].forEach(id => { dom[id].fg = elemento('fg'); });
dom.wz_ing_rango.options = [{text:'Elige un rango'},{text:'Menos de $150'},{text:'$150 a $300'},{text:'$300 a $500'},{text:'$500 a $800'},{text:'Más de $800'}];
const catalogo = { motos:[{id:1, modelo:'NEW HORSE 150', sedeName:'EK Bello Monte', cc:'150cc', type:'Urbana', precio:1320}],
  get(id){ return String(id)==='1' ? {id:1, name:'New Horse 150', sedeName:'EK Bello Monte', precio:1320} : null; },
  plan(){ return {inicial:660, quincenal:56}; }, money(n){ return '$'+n; } };
let almacen = {};
const ctx = {
  console:{log(){},warn(){},error(){}}, setTimeout(f){ return 0; }, clearTimeout(){},
  document:{ getElementById(id){ return dom[id]||null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento('div'); }, body:elemento('body'), addEventListener(){}, readyState:'complete' },
  location:{ search:'', href:'https://pagasi.io/solicitar.html' }, localStorage:{ _m:{}, getItem(k){ return this._m[k]||null; }, setItem(k,v){ this._m[k]=v; }, removeItem(k){ delete this._m[k]; } },
  URLSearchParams: URLSearchParams, Date: Date, encodeURIComponent: encodeURIComponent,
  PagasiCatalog: catalogo, PagasiSite:{ populateModels(){}, escape(s){ return String(s); }, fitPhotos(){} },
  firebase:{ apps:[], initializeApp(){ return {}; }, app(){ return {}; }, auth(){ return ctx._auth; }, firestore(){ return ctx._db; } },
  _auth:{ currentUser:null, async signInAnonymously(){ ctx._auth.currentUser = { uid:'anon-1' }; }, async signOut(){ ctx._auth.currentUser = null; } },
  _db:{ collection(){ return { doc(id){ return { async set(d){ if(almacen[id]) { const e = new Error('Missing or insufficient permissions.'); e.code='permission-denied'; throw e; } almacen[id] = d; }, async update(d){ if(!almacen[id]) throw new Error('no existe'); Object.assign(almacen[id], d); } }; } }; } },
};
ctx.window = ctx; ctx.addEventListener = function(){};
vm.createContext(ctx);
vm.runInContext(src('assets/public/request.js'), ctx, { filename:'request.js' });

// ── Normalizacion ──
ok('cédula "v 12.345.678" → V-12345678', ctx.normCedula('v 12.345.678').valor === 'V-12345678');
ok('cédula "E-8123456" conserva la E', ctx.normCedula('E-8123456').valor === 'E-8123456');
ok('cédula de 5 dígitos no vale', ctx.normCedula('12345') === null);
ok('cédula de 10 dígitos no vale', ctx.normCedula('1234567890') === null);
ok('teléfono "+58 414 123 45 67" → 0414-1234567', ctx.normTel('+58 414 123 45 67').valor === '0414-1234567');
ok('teléfono "4241234567" → 0424-1234567', ctx.normTel('4241234567').valor === '0424-1234567');
ok('...y el wa es 58 + número sin el cero', ctx.normTel('0416-1234567').wa === '584161234567');
ok('un fijo (0212) no vale: la respuesta va por WhatsApp', ctx.normTel('0212-1234567') === null);
ok('ID del lead sale de la cédula', /^WEB-/.test('WEB-'+ctx.normCedula('V-12345678').digitos) && ctx.normCedula('V-12345678').digitos === '12345678');

// ── Validacion en linea ──
dom.wz_nom.value = 'Carlos'; dom.wz_ci.value = '123'; dom.wz_tel.value = '0212'; dom.wz_emp.value = ''; dom.wz_ing_rango.value = '';
let primero = ctx.validarPaso1(true);
ok('con todo mal, el primer campo malo es el nombre', primero === dom.wz_nom);
ok('...y cada campo malo queda marcado con su mensaje', dom.wz_nom.cls.has('is-bad') && /apellido/.test(dom.err_wz_nom.textContent) && /Cédula/.test(dom.err_wz_ci.textContent) && /celular/.test(dom.err_wz_tel.textContent));
ok('...el error va al lado del campo (has-err en el grupo), no en un alert', dom.wz_nom.fg.cls.has('has-err'));
dom.wz_nom.value = 'Carlos Pérez'; dom.wz_ci.value = 'V-12345678'; dom.wz_tel.value = '0414-1234567'; dom.wz_emp.value = 'delivery'; dom.wz_ing_rango.value = '400'; dom.wz_ing_rango.selectedIndex = 3;
ok('con los seis datos bien no hay campo malo', ctx.validarPaso1(true) === null);
ok('...y los errores se limpian', !dom.wz_nom.cls.has('is-bad') && dom.err_wz_nom.textContent === '' && !dom.wz_nom.fg.cls.has('has-err'));
ok('un nombre con números no pasa', !ctx._nombreOk('Carlos 123'));

// ── Payload ──
dom.fM.value = '1'; dom.wz_ciudad.value = 'Petare, Caracas';
const p = ctx.buildClientePayload();
ok('id WEB-<cédula>', p.id === 'WEB-12345678');
ok('cédula y teléfono ya normalizados', p.cedula === 'V-12345678' && p.tel === '0414-1234567' && p.wa === '0414-1234567');
ok('estado lead y origen web', p.estado === 'lead' && p.origen === 'web');
ok('sin score web (lo calcula el sistema al aprobar)', !('score_indexa' in p) && !('f1' in p));
ok('el ingreso guarda el punto medio del rango y el rango va en las notas', p.ingreso === 400 && /Ingreso declarado: \$300 a \$500/.test(p.notas));
ok('la moto de interés viaja con modelo, precio y sede', p.moto_interes_id === 1 && p.moto_interes_modelo === 'NEW HORSE 150' && p.moto_interes_precio === 1320 && p.moto_interes_sede === 'EK Bello Monte');
ok('sin campos sensibles: ni dirección, ni cuenta, ni cédula del fiador, ni email', !('dir' in p) && !('cuenta_digitos' in p) && !('fiador_ci' in p) && !('email' in p) && !('banco_cobro' in p));
// Todos los campos del payload tienen que estar en la lista blanca de las Reglas
const reglas = src('firestore.rules');
const lista = reglas.slice(reglas.indexOf('function esLeadWeb'), reglas.indexOf('function esLeadWebAmpliando'));
const fuera = Object.keys(p).filter(k => !new RegExp("'"+k+"'").test(lista));
ok('todos los campos del lead están en la lista blanca de las Reglas' + (fuera.length ? ' (faltan: '+fuera.join(', ')+')' : ''), fuera.length === 0);
ok('la segunda pantalla nace apagada hasta publicar las Reglas', ctx.ADELANTAR_EVALUACION === false);
ok('...y con ella apagada el lead NO lleva web_uid (la regla vieja lo rechazaría)', !('web_uid' in p));

// ── Envio ──
(async () => {
  await ctx.submitF({ preventDefault(){} });
  ok('el envío crea el lead en clientes/WEB-<cédula>', !!almacen['WEB-12345678'] && almacen['WEB-12345678'].nombre === 'Carlos Pérez');
  ok('la sesión anónima se cierra al terminar', ctx._auth.currentUser === null);
  ok('pasa a la pantalla de éxito con el número y el nombre', dom.fOK.cls.has('on') && !dom.fs1.cls.has('on') && dom.okId.textContent === 'WEB-12345678' && dom.okNombre.textContent === 'Carlos');
  ok('el WhatsApp va con el mensaje escrito (nombre, número y moto)', /wa\.me\/584242177798\?text=/.test(dom.okWA.href) && /WEB-12345678/.test(decodeURIComponent(dom.okWA.href)) && /NEW HORSE 150/.test(decodeURIComponent(dom.okWA.href)));
  ok('la oferta de adelantar la evaluación no se muestra con la llave apagada', dom.okExtra.hidden === true);
  ok('el borrador se borra al enviar', ctx.localStorage.getItem('pagasi_solicitud_borrador_v1') === null);
  // Segunda vez con la misma cedula: la base rechaza, y se dice
  dom.fs1.cls.add('on'); dom.fOK.cls.delete('on');
  await ctx.submitF({ preventDefault(){} });
  ok('la misma cédula otra vez: "ya te tenemos", sin alert', dom.fOK.cls.has('on') && /Ya te tenemos/.test(dom.okTitulo.innerHTML) && /Ya hay una solicitud/.test(dom.okText.innerHTML));

  // ── Borrador ──
  dom.wz_nom.value = 'Ana Ruiz'; ctx.guardarBorrador();
  const b = JSON.parse(ctx.localStorage.getItem('pagasi_solicitud_borrador_v1'));
  ok('el borrador guarda lo escrito en el navegador', b && b.wz_nom === 'Ana Ruiz' && b.fM === '1');
  dom.wz_nom.value = ''; ctx.cargarBorrador();
  ok('...y lo repone al volver', dom.wz_nom.value === 'Ana Ruiz');

  // ── Lo que se guarda en la segunda pantalla ──
  dom.wz_ant.value = '3'; dom.wz_viv.value = 'propia'; dom.wz_cashea.value = 'si'; dom.wz_cashea_nivel.value = '4'; dom.wz_dep_g.value = '2'; dom.wz_r1n.value = 'Luis Mora'; dom.wz_r1t.value = '04241112233';
  const x = ctx.buildExtraPayload();
  ok('la segunda pantalla solo manda lo respondido', x.antiguedad === '3' && x.vivienda === 'propia' && x.cashea_nivel === '4' && x.dependientes === 2 && !('historial' in x) && !('fiador_nom' in x));
  ok('...con la referencia normalizada y la marca de una sola vez', x.ref1.nom === 'Luis Mora' && x.ref1.tel === '0424-1112233' && typeof x.web_ampliado === 'string');
  const listaX = reglas.slice(reglas.indexOf('function esLeadWebAmpliando'), reglas.indexOf('match /clientes/'));
  const fueraX = Object.keys(x).filter(k => !new RegExp("'"+k+"'").test(listaX));
  ok('...y todos sus campos están en la regla esLeadWebAmpliando' + (fueraX.length ? ' (faltan: '+fueraX.join(', ')+')' : ''), fueraX.length === 0);
  ok('las Reglas dejan al lead completar SU ficha, una vez, desde su misma sesión', /allow update: if esStaff\(\) \|\| esLeadWebAmpliando\(\);/.test(reglas) && /antes\.get\('web_uid', ''\) == request\.auth\.uid/.test(reglas) && /antes\.get\('web_ampliado', ''\) == ''/.test(reglas));

  // ── La pagina ──
  const html = src('solicitar.html');
  ok('la pantalla 1 pide seis datos y nada más', ['wz_nom','wz_ci','wz_tel','wz_emp','wz_ing_rango','wz_ciudad','fM'].every(id => html.indexOf('id="'+id+'"') > -1) && html.indexOf('id="wz_dir_det"') === -1 && html.indexOf('id="wz_cuenta"') === -1 && html.indexOf('id="wz_terremoto"') === -1);
  ok('el botón dice "Enviar solicitud", no "Guardar en Pagasi"', /id="btnGuardarSolicitud"[^>]*>Enviar solicitud</.test(html) && html.indexOf('Guardar en Pagasi') === -1);
  ok('la página no usa alert() para validar', !/alert\(/.test(src('assets/public/request.js')));
  ok('la hoja de estilo propia va enlazada y versionada', /assets\/public\/request\.css\?v=26-/.test(html));
  ok('la pantalla de éxito explica los tres pasos y tiene el WhatsApp', /class="fpasos"/.test(html) && /id="okWA"/.test(html));

  // ── El panel ──
  const cx = { console:{log(){},warn(){},error(){}}, setTimeout(f){ return 0; }, clearTimeout(){}, encodeURIComponent, Date, Promise,
    document:{ getElementById(){ return null; }, querySelector(){ return null; }, createElement(){ return elemento('div'); }, body:elemento('body') },
    S:{ clientes:[], creds:[], currentUser:{ nombre:'Samantha' }, page:'dash' }, toast(){}, fmt(n){ return '$'+n; } };
  cx.window = cx; vm.createContext(cx);
  vm.runInContext(src('logic/solicitudes-web.js'), cx, { filename:'solicitudes-web.js' });
  const lead = { id:'WEB-12345678', nombre:'Carlos Pérez', origen:'web', estado:'lead', tel:'0414-1234567', creado:'2026-09-27T10:00:00.000Z', moto_interes_modelo:'NEW HORSE 150', moto_interes_sede:'EK Bello Monte', notas:'Solicitud web · Ingreso declarado: $300 a $500 · Interesado en NEW HORSE 150', trabajo:'delivery', ciudad:'Petare' };
  const otro = { id:'C-1', nombre:'Pedro', origen:'panel' };
  cx.S.clientes = [lead, otro];
  ok('pendientes: solo los leads web sin atender y sin crédito', cx._swPendientes().length === 1 && cx._swPendientes()[0].id === 'WEB-12345678');
  cx.S.creds = [{ id:'M-001', cliId:'WEB-12345678', estado:'activo' }];
  ok('...con crédito ya no cuenta', cx._swPendientes().length === 0);
  cx.S.creds = []; lead.webAtendidaEn = '2026-09-27T11:00:00.000Z'; lead.webAtendidaPor = 'Samantha';
  ok('...marcada como atendida tampoco', cx._swPendientes().length === 0);
  lead.webAtendidaEn = ''; lead.webAtendidaPor = '';
  const ficha = cx._swFichaHtml(lead);
  ok('la ficha muestra de dónde vino, la moto, el rango y la zona', /Solicitud web · WEB-12345678/.test(ficha) && /NEW HORSE 150/.test(ficha) && /\$300 a \$500/.test(ficha) && /Petare/.test(ficha));
  ok('...con WhatsApp listo, Crear solicitud y Marcar atendida', /wa\.me\/584141234567\?text=/.test(ficha) && /_swCrearSolicitud\('WEB-12345678'\)/.test(ficha) && /_swMarcarAtendida\('WEB-12345678'\)/.test(ficha));
  ok('...y el mensaje de WhatsApp lleva el nombre y la moto', /Hola%20Carlos/.test(ficha) && /NEW%20HORSE%20150/.test(ficha));
  ok('la ficha de un cliente del panel no muestra nada de esto', cx._swFichaHtml(otro) === '');
  lead.ciudad = 'Petare <script>alert(1)</script>'; lead.moto_interes_modelo = 'X" onmouseover="alert(1)';
  ok('lo que escribió el cliente se escapa en la ficha (lo escribe cualquiera en la web)', cx._swFichaHtml(lead).indexOf('<script>') === -1 && /&lt;script&gt;/.test(cx._swFichaHtml(lead)) && cx._swFichaHtml(lead).indexOf('X" onmouseover') === -1);
  lead.ciudad = 'Petare'; lead.moto_interes_modelo = 'NEW HORSE 150';
  // aviso en vivo: nunca con la primera foto, si con las siguientes
  let avisos = 0; cx._swMostrarAviso = function(){ avisos++; };
  const foto = { docChanges(){ return [{ type:'added', doc:{ id:'WEB-99', data(){ return { nombre:'Nuevo', origen:'web' }; } } }]; } };
  cx._swAvisarNuevos(foto, false);
  ok('la primera foto de clientes no avisa (trae todo como nuevo)', avisos === 0);
  cx._swAvisarNuevos(foto, true);
  cx._swAvisarNuevos(foto, true);
  ok('las siguientes avisan una sola vez por solicitud', avisos === 1);
  ok('la pestaña de Clientes dice cuántas hay', cx._swChip()[0] === 'web' && /Solicitudes web · 1/.test(cx._swChip()[1]));

  // ── Los ganchos en los archivos compartidos ──
  ok('admin.html carga solicitudes-web.js', /logic\/solicitudes-web\.js\?v=/.test(src('admin.html')));
  ok('Clientes tiene la pestaña y el filtro', /_swChip/.test(src('modules/clientes.js')) && /filtro==='web'/.test(src('logic/clientes.js')));
  ok('la ficha llama a la tarjeta', /_swFichaHtml\(c\)/.test(src('logic/clientes.js')));
  ok('el tiempo real avisa y el menú cuenta', /_swAvisarNuevos\(snap, !!_rtPrimeras\[spec\.col\]\)/.test(src('assets/pagasi-app.js')) && /_swSidebarBadge\(\)/.test(src('assets/pagasi-app.js')));

  console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
  if(fail) process.exitCode = 1;
})();
