// 1-nov-2026, Adam: "divideme el modulo de redes sociales entre cobranza y ventas". Redes Ventas
// ('redes': Paola) y Redes Cobranza ('redescob': Patricia) son dos modulos con la misma pantalla,
// cada uno con su permiso. 'whatsapp' e 'instagram' siguen siendo los canales que miran las Reglas
// y se derivan de los dos permisos nuevos al guardar al usuario.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

// ── A. Permisos y menú, con el app completo (como t_modulos_prueba) ──
{
  function elemento(){ var v=''; return { innerHTML:'', textContent:'', get value(){ return v; }, set value(x){ v = String(x); }, className:'', id:'', style:{}, dataset:{}, checked:false, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, appendChild(){}, removeChild(){}, insertAdjacentHTML(){}, addEventListener(){}, removeEventListener(){}, focus(){}, blur(){}, click(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getBoundingClientRect(){return {top:0,left:0,width:0,height:0};}, closest(){return null;}, children:[], childNodes:[], parentNode:null, scrollIntoView(){}, remove(){} }; }
  const els = {}, sbNav = elemento();
  const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(sel){ return sel === '.sb-nav' ? sbNav : null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){}, hidden:false, visibilityState:'visible', title:'' };
  const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
    document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html',search:'',hash:'',pathname:'/admin.html'},
    localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    fetch(){ return Promise.resolve({ok:false,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){ return ''; }, confirm(){ return true; },
    open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{} };
  ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
  ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
  ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
  ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
  const archivos = [...fs.readFileSync(path.join(ROOT,'admin.html'),'utf8').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
  vm.createContext(ctx); vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
  ctx.toast = () => {}; ctx.setMicon = () => {}; ctx.logActividad = () => {}; ctx.nav = () => {}; ctx.closeM = () => {};
  const S = ctx.S; S.creds = [];
  const menu = () => { ctx.renderSidebar(); return [...sbNav.innerHTML.matchAll(/data-nav="([a-z]+)"/g)].map(m => m[1]); };
  const usuario = (rol, permisos) => { S.currentUser = { uid:'u', email:'u@x.com', nombre:'U', rol, permisos, concesionarios:[] }; };
  const ROL = vm.runInContext('ROL_PERMISOS', ctx), MODULOS = vm.runInContext('MODULOS', ctx), PGL = vm.runInContext('PGL', ctx);

  ok('los módulos otorgables son Redes Ventas y Redes Cobranza; WhatsApp e Instagram ya no se marcan', MODULOS.some(m => m.id === 'redes' && m.label === 'Redes Ventas') && MODULOS.some(m => m.id === 'redescob' && m.label === 'Redes Cobranza') && !MODULOS.some(m => m.id === 'whatsapp' || m.id === 'instagram'));
  ok('el menú los llama Redes Ventas y Redes Cobranza', PGL.redes === 'Redes Ventas' && PGL.redescob === 'Redes Cobranza');
  usuario('Administrador', []); let m = menu();
  ok('un administrador ve los dos en el menú, uno al lado del otro', m.indexOf('redes') > -1 && m.indexOf('redescob') === m.indexOf('redes') + 1 && !m.includes('whatsapp') && !m.includes('instagram'));
  usuario('Cobrador', ROL.Cobrador.slice()); m = menu();
  ok('un cobrador (preset del rol) ve Redes Cobranza y no Redes Ventas', m.includes('redescob') && !m.includes('redes') && ctx.hasModuleAccess('redescob') && !ctx.hasModuleAccess('redes'));
  usuario('Vendedor', ROL.Vendedor.slice()); m = menu();
  ok('un vendedor (preset del rol) ve Redes Ventas y no Redes Cobranza', m.includes('redes') && !m.includes('redescob') && ctx.hasModuleAccess('redes') && !ctx.hasModuleAccess('redescob'));
  ok('...y su preset trae los dos canales de las Reglas (WhatsApp de ventas e Instagram)', ROL.Vendedor.includes('whatsapp') && ROL.Vendedor.includes('instagram'));
  usuario('Gerente', ROL.Gerente.slice()); m = menu();
  ok('un gerente ve los dos', m.includes('redes') && m.includes('redescob'));
  usuario('Empleado', ['clientes','whatsapp']); m = menu();
  ok('usuario de antes, solo con "whatsapp": entra a los dos, como entraba', m.includes('redes') && m.includes('redescob') && ctx.hasModuleAccess('redes') && ctx.hasModuleAccess('redescob'));
  usuario('Empleado', ['clientes','instagram']); m = menu();
  ok('usuario de antes, solo con "instagram": solo Redes Ventas', m.includes('redes') && !m.includes('redescob') && !ctx.hasModuleAccess('redescob'));
  usuario('Empleado', ['clientes','redescob','whatsapp']); m = menu();
  ok('ya con los permisos nuevos manda lo marcado: Redes Cobranza sí, Redes Ventas no (aunque tenga el canal whatsapp)', m.includes('redescob') && !m.includes('redes') && !ctx.hasModuleAccess('redes'));
  usuario('Empleado', ['clientes']); m = menu();
  ok('sin ninguno, ninguno', !m.includes('redes') && !m.includes('redescob'));
  usuario('Vendedor Concesionario', ['redes','redescob','whatsapp','instagram']);
  ok('un vendedor de concesionario no entra a ninguno aunque se los marquen', !ctx.hasModuleAccess('redes') && !ctx.hasModuleAccess('redescob'));
  const pcc = vm.runInContext('permisosConCanales', ctx);
  ok('permisosConCanales: Redes Ventas da los canales instagram y whatsapp', JSON.stringify(pcc(['clientes','redes']).sort()) === JSON.stringify(['clientes','instagram','redes','whatsapp']));
  ok('...Redes Cobranza da solo whatsapp', JSON.stringify(pcc(['redescob']).sort()) === JSON.stringify(['redescob','whatsapp']));
  ok('...y si se quitan los dos, se van también los canales', JSON.stringify(pcc(['clientes','whatsapp','instagram'])) === JSON.stringify(['clientes']));
  const usrc = fs.readFileSync(path.join(ROOT,'logic/usuarios.js'),'utf8');
  ok('Usuarios: las casillas no muestran whatsapp ni instagram y al guardar se derivan los canales', /key !== 'whatsapp' && key !== 'instagram'/.test(usrc) && (usrc.match(/permisos = permisosConCanales\(permisos\)/g) || []).length === 2);
  const nav = vm.runInContext('PG_NAVICONS', ctx);
  ok('cada módulo tiene su icono en el menú', /<svg/.test(nav.redes) && /<svg/.test(nav.redescob) && nav.redes !== nav.redescob);
  const mov = vm.runInContext('PG_MENU_GROUPS', ctx).find(g => g.label === 'Seguimiento');
  ok('en el menú del teléfono están los dos, en Seguimiento', mov.keys.includes('redes') && mov.keys.includes('redescob'));
}

// ── B. La pantalla: cada módulo muestra solo su área (como t_redes_sociales) ──
{
  const els = {};
  function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', scrollTop: 0, scrollHeight: 0 }); }
  const doc = { getElementById(id) { return els[id] || null; }, head: { insertAdjacentHTML() {} }, querySelector() { return null; }, querySelectorAll() { return []; } };
  const navs = [], timers = [];
  const ctx = { console: { log() {}, warn() {}, error() {} }, document: doc, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
    S: { page: 'redes', currentUser: { nombre: 'Liz Alejandra', uid: 'u3' }, creds: [], pagos: [], clientes: [] }, PG: {}, nav: (p) => { navs.push(p); }, toast() {}, logActividad() {},
    isAdminUser: () => false, fmt: (n) => '$' + n, hoyLocalISO: () => '2026-11-01', CreditoLedger: { generarEstadoCredito() { return { cuotas: [], cuotasPagadas: 0, totalCuotas: 0 }; } },
    fetch() { return Promise.resolve({ ok: false, json: () => Promise.resolve({}) }); } };
  ctx.window = ctx;
  function consulta() { const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, get() { return Promise.resolve({ docs: [] }); }, onSnapshot() { return () => {}; }, doc() { return { get() { return new Promise(() => {}); }, set() { return Promise.resolve(); }, collection() { return consulta(); } }; } }; return q; }
  ctx.db = { collection: consulta };
  vm.createContext(ctx);
  for (const f of ['logic/whatsapp.js', 'modules/whatsapp.js', 'modules/redes.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const flush = () => { while (timers.length) timers.shift()(); };
  const montar = (mod) => { ['wa-items', 'wa-filtros', 'wa-hilo', 'wa-ficha', 'wa-q', 'rs-vend'].forEach(el); ctx.S.page = mod; const h = ctx.PG[mod](); flush(); return h; };
  const items = () => (els['wa-items'].innerHTML.match(/class="wa-item/g) || []).length;
  ctx._waCfg = { conectado: true, telefono: '+58 414-640-1617', instagram: 'pagasi.io' };
  const hoy = new Date().toISOString();
  ctx._waConvs = [
    { id: 'wa:+584140000001', canal: 'whatsapp', area: 'cobranza', nombre: 'María', telE164: '+584140000001', noLeidos: 2, ultimoMensaje: 'ya pagué', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy, ultimoAutor: 'cliente', borrador: { tipo: 'promesa', fecha: '2026-11-06' } },
    { id: 'wa:+584140000009', canal: 'whatsapp', nombre: 'Pedro (sin área: es de antes, cobranza)', telE164: '+584140000009', noLeidos: 0, ultimoMensaje: 'ok', ultimoMensajeHora: hoy },
    { id: 'wa:+584140000002', canal: 'whatsapp', area: 'ventas', nombre: 'Ana', telE164: '+584140000002', noLeidos: 1, ultimoMensaje: 'precio?', ultimoMensajeHora: hoy, ultimoEntranteHora: hoy, vendedor: 'Marianne Molina' },
    { id: 'ig:1', canal: 'instagram', area: 'ventas', nombre: 'Luis', usuario: 'luis', noLeidos: 1, ultimoMensaje: 'hola', ultimoMensajeHora: hoy, vendedor: 'Liz Alejandra' }
  ];
  ctx.hasModuleAccess = () => true;
  ctx._rsTab = 'todos'; ctx._rsVista = 'bandeja'; ctx._waVendSel = null;
  let h = montar('redescob');
  ok('Redes Cobranza: María y Pedro (las de WhatsApp sin área son de cobranza), nada de ventas', items() === 2 && /María/.test(els['wa-items'].innerHTML) && /Pedro/.test(els['wa-items'].innerHTML) && !/Ana|Luis/.test(els['wa-items'].innerHTML));
  ok('...aunque la vendedora entre "viendo lo suyo": en cobranza no hay filtro de vendedor', ctx._waVendSel === null && !/id="rs-vend"/.test(h));
  ok('...sin pestañas, con la cola de hoy y Patricia; sin Métricas ni Paola', !/class="rs-tabs"/.test(h) && /Cobranza de hoy/.test(h) && /rsAsistente\('cobranza'\)/.test(h) && !/Métricas/.test(h) && !/rsAsistente\('ventas'\)/.test(h));
  ok('...el filtro "Con promesa" cuenta a María', />Con promesa \(1\)</.test(els['wa-filtros'].innerHTML));
  ok('en Redes Cobranza la pantalla se refresca en el sitio', ctx._rsEnBandeja() && ctx._waRefrescarEnSitio() === true);
  ctx._waVendSel = '';
  h = montar('redes');
  ok('Redes Ventas (Todos): Ana y Luis; nada de cobranza', items() === 2 && /Ana/.test(els['wa-items'].innerHTML) && /Luis/.test(els['wa-items'].innerHTML) && !/María|Pedro/.test(els['wa-items'].innerHTML));
  ok('...con pestañas, barra de vendedores, Métricas y Paola; sin la cola ni Patricia', /class="rs-tabs"/.test(h) && /id="rs-vend"/.test(h) && /Métricas/.test(h) && /rsAsistente\('ventas'\)/.test(h) && !/Cobranza de hoy/.test(h) && !/rsAsistente\('cobranza'\)/.test(h));
  ok('...los globos de ventas no cuentan lo de cobranza: Todos 2, WhatsApp 1, Instagram 1', /id="rs-b-todos"><span class="b">2</.test(h) && /id="rs-b-whatsapp"><span class="b">1</.test(h) && /id="rs-b-instagram"><span class="b">1</.test(h));
  ctx._rsTab = 'whatsapp'; montar('redes');
  ok('...la pestaña WhatsApp de ventas: solo Ana', items() === 1 && /Ana/.test(els['wa-items'].innerHTML));
  // Abrir una conversación lleva al módulo que le toca
  ctx.S.page = 'clientes'; navs.length = 0;
  ctx.waAbrir('wa:+584140000001');
  ok('abrir una de cobranza desde otra pantalla navega a Redes Cobranza', navs[navs.length - 1] === 'redescob' && ctx._waSel === 'wa:+584140000001');
  ctx.S.page = 'redescob'; navs.length = 0; ctx._rsTab = 'todos';
  ctx.waAbrir('ig:1');
  ok('abrir una de Instagram estando en Redes Cobranza navega a Redes Ventas', navs[navs.length - 1] === 'redes' && ctx._waSel === 'ig:1');
  ctx.S.page = 'redes'; ctx._rsTab = 'instagram'; montar('redes'); navs.length = 0;
  ctx.waAbrir('wa:+584140000002');
  ok('abrir una de WhatsApp ventas estando en Instagram se queda en Redes Ventas, en Todos', navs[navs.length - 1] === 'redes' && ctx._rsTab === 'todos');
  ok('la ventana de Patricia sigue teniendo el aviso de los recordatorios y las cuentas de las dos compañías', (() => { ['ov','mtt','msb','mbd','mft','modal-box'].forEach(el); els['ov'].style = {}; ctx.closeM = () => {}; ctx.setMicon = () => {}; try { ctx.rsAsistente('cobranza'); } catch (e) { return false; } return /clientes de verdad/.test(els['mbd'].innerHTML) && /id="rs-pago26"/.test(els['mbd'].innerHTML); })());
}

// ── C. Las listas piden el área (las Reglas dejan leer solo la del módulo) ──
{
  const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok('el servidor anota area: cobranza en la conversación que abre un recordatorio', /canal: 'whatsapp', area: 'cobranza', telE164: it\.tel/.test(src('functions/lib/recordatorios.js')));
  ok('las Reglas van por área: veArea, veCobranza, veVentasDe; ya no veCanal', /function veArea\(d\)/.test(src('firestore.rules')) && /function veCobranza\(\)/.test(src('firestore.rules')) && !/veCanal\(/.test(src('firestore.rules')));
  ok('...y las listas sin área de WhatsApp quedan para el administrador (get y list por separado)', /allow get: if veArea\(resource\.data\);\s*allow list: if veLista\(resource\.data\);/.test(src('firestore.rules')) && /function veLista\(d\) \{ return esAdmin\(\) \? esInterno\(\)/.test(src('firestore.rules')));
  const wheres = [], snaps = {};
  const ctx = { console: { log() {}, warn() {}, error() {} }, document: { getElementById() { return null; } }, setTimeout() { return 0; }, S: { page: 'clientes', currentUser: { nombre: 'X' } }, nav() {}, _waRefrescarEnSitio() { return true; } };
  ctx.window = ctx;
  ctx.db = { collection(col) { const w = []; const q = { where(a, b, c) { w.push([a, b, c]); return q; }, orderBy() { return q; }, limit() { return q; }, onSnapshot(fn) { wheres.push(w.slice()); snaps[w.map(x => x[2]).join(':')] = fn; return () => {}; } }; return q; } };
  vm.createContext(ctx); vm.runInContext(src('logic/whatsapp.js'), ctx, { filename: 'logic/whatsapp.js' });
  ctx._waCfg = { conectado: true, instagram: 'pagasi.io' };
  const snap = (docs) => ({ docs: docs.map(d => ({ id: d.id, data: () => d })) });
  ctx.waAbrirConversaciones('whatsapp', 'cobranza'); ctx.waAbrirConversaciones('whatsapp', 'ventas'); ctx.waAbrirConversaciones('instagram');
  ok('Redes Cobranza pide canal whatsapp y área cobranza; Redes Ventas, área ventas; Instagram solo el canal', JSON.stringify(wheres) === JSON.stringify([[['canal', '==', 'whatsapp'], ['area', '==', 'cobranza']], [['canal', '==', 'whatsapp'], ['area', '==', 'ventas']], [['canal', '==', 'instagram']]]));
  ok('cada lista es su propia escucha (no se repite si se vuelve a pedir)', (ctx.waAbrirConversaciones('whatsapp', 'cobranza'), wheres.length === 3 && Object.keys(ctx._waUnsubs).sort().join() === 'instagram,whatsapp:cobranza,whatsapp:ventas'));
  snaps['whatsapp:cobranza'](snap([{ id: 'wa:+1', canal: 'whatsapp', area: 'cobranza' }, { id: 'wa:+9', canal: 'whatsapp' }]));
  snaps['whatsapp:ventas'](snap([{ id: 'wav:+2', canal: 'whatsapp', area: 'ventas' }]));
  snaps['instagram'](snap([{ id: 'ig:3', canal: 'instagram', area: 'ventas' }]));
  ok('las tres listas conviven en memoria', ctx._waConvs.map(c => c.id).sort().join() === 'ig:3,wa:+1,wa:+9,wav:+2');
  snaps['whatsapp:cobranza'](snap([{ id: 'wa:+1', canal: 'whatsapp', area: 'cobranza' }]));
  ok('una foto nueva de cobranza reemplaza solo lo de cobranza (la de ventas y la de Instagram siguen)', ctx._waConvs.map(c => c.id).sort().join() === 'ig:3,wa:+1,wav:+2');
}

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
