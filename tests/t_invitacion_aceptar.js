// 24-nov-2026, Adam: «no me entra este usuario». Un invitado creó su cuenta desde el link, pero la ficha con
// su rol no se guardó y el sistema lo sacaba al entrar. La base solo acepta la ficha si trae EXACTAMENTE el rol
// y los permisos de la invitación (probado ese día en el simulador de Reglas con sus datos: con la invitación
// cargada pasa; con los datos provisionales del formulario —rol Empleado, sin permisos— la rechaza). El
// formulario se abre al instante con esos datos provisionales mientras llega la invitación de la base, y con
// internet lento se podía pulsar «Crear mi cuenta» antes. Desde hoy la invitación se confirma al pulsar el
// botón, ANTES de crear la cuenta; si no se puede, se dice en español y no se crea nada.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
function elemento(){ return { innerHTML:'', textContent:'', value:'', className:'', id:'', style:{}, dataset:{}, checked:false, disabled:false, classList:{add(){},remove(){},contains(){return false;},toggle(){}}, children:[], appendChild(){}, removeChild(){}, remove(){}, insertBefore(){}, setAttribute(){}, getAttribute(){return null;}, removeAttribute(){}, addEventListener(){}, removeEventListener(){}, click(){}, focus(){}, blur(){}, select(){}, closest(){return null;}, matches(){return false;}, getBoundingClientRect(){return {top:0,left:0,width:0,height:0,bottom:0,right:0};}, querySelector(){return null;}, querySelectorAll(){return [];} }; }
const els = {};
const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(){ return null; }, querySelectorAll(){ return []; }, createElement(){ return elemento(); }, createTextNode(){ return elemento(); }, head:elemento(), body:elemento(), documentElement:elemento(), addEventListener(){}, removeEventListener(){}, title:'' };
const ctx = { console:{log(){},warn(){},error(){}}, setTimeout(){return 0;}, clearTimeout(){}, setInterval(){return 0;}, clearInterval(){}, requestAnimationFrame(){return 0;},
  document:doc, navigator:{userAgent:'node',language:'es'}, location:{href:'https://pagasi.io/admin.html?invite=TOK-1&ie=nuevo%40ejemplo.com',search:'?invite=TOK-1&ie=nuevo%40ejemplo.com',hash:'',pathname:'/admin.html'},
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, sessionStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  fetch(){ return Promise.resolve({ok:true,json:()=>Promise.resolve({})}); }, alert(){}, prompt(){ return ''; }, confirm(){ return true; },
  open(){ return { document:{ write(){}, close(){} } }; }, db:null, storage:null, firebase:undefined, innerWidth:1440, innerHeight:900, PG:{}, URLSearchParams };
ctx.MutationObserver=function(){return {observe(){},disconnect(){}};}; ctx.IntersectionObserver=function(){return {observe(){},disconnect(){},unobserve(){}};};
ctx.ResizeObserver=function(){return {observe(){},disconnect(){}};}; ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.matchMedia=function(){return {matches:false,addListener(){},addEventListener(){}};}; ctx.getComputedStyle=function(){return {getPropertyValue(){return '';}};};
ctx.scrollTo=function(){}; ctx.history={state:null,pushState(){},replaceState(){},back(){}}; ctx.window=ctx;
const archivos = [...fs.readFileSync(path.join(ROOT,'admin.html'),'utf8').matchAll(/src="((?:assets|logic|modules)\/[^"?]+\.js)/g)].map(m=>m[1]);
vm.createContext(ctx); vm.runInContext(archivos.map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'app.js'});
ctx.toast = () => {};
ctx._appInited = true;          // la prueba no arranca la aplicación entera al terminar
const S = ctx.S;
const src = fs.readFileSync(path.join(ROOT, 'logic/usuarios.js'), 'utf8');
const admin = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');

// ── Base y cuentas de mentira ────────────────────────────────────────────────
const PERMISOS_ADMIN = ['dash','clientes','creditos','pagos','config','users','perm_delete'];
const invitacion = extra => Object.assign({ token:'TOK-1', email:'nuevo@ejemplo.com', nombre:'nuevo@ejemplo.com', rol:'Administrador', permisos:PERMISOS_ADMIN.slice(), usado:false }, extra || {});
function baseFalsa(estado){
  const escritos = [];
  const col = n => ({
    doc(id){ return {
      get(){
        if(n === 'invitaciones'){
          estado.lecturas = (estado.lecturas || 0) + 1;
          if(estado.cuelgaLeer) return new Promise(() => {});
          if(estado.fallaLeer) return Promise.reject(Object.assign(new Error('Failed to get document because the client is offline.'), { code:'unavailable' }));
        }
        const d = (estado[n] || {})[id];
        return Promise.resolve({ exists: !!d, id, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) });
      },
      set(data){
        escritos.push({ col:n, id, tipo:'set', data });
        if(n === 'usuarios' && data && data.inviteToken){
          if(estado.cuelgaFicha) return new Promise(() => {});
          if(estado.fallaFicha) return Promise.reject(estado.fallaFicha);
        }
        return Promise.resolve();
      },
      update(data){ escritos.push({ col:n, id, tipo:'update', data }); return Promise.resolve(); },
      onSnapshot(){ return function(){}; }
    }; },
    where(){ return col(n); }, limit(){ return col(n); }, orderBy(){ return col(n); },
    get(){ return Promise.resolve({ empty:true, docs:[], size:0, forEach(){} }); }, onSnapshot(){ return function(){}; }, add(){ return Promise.resolve({ id:'x' }); }
  });
  return { escritos, collection: col };
}
function cuentasFalsas(op){
  op = op || {};
  const usuario = email => ({ uid:'UID-1', email, displayName:'', isAnonymous:false, updateProfile(p){ this.displayName = p.displayName; return Promise.resolve(); }, updatePassword(){ return Promise.resolve(); } });
  const a = { currentUser:null, llamadas:[],
    signOut(){ a.llamadas.push('salir'); a.currentUser = null; return Promise.resolve(); },
    createUserWithEmailAndPassword(email){ a.llamadas.push('crear:' + email); if(op.yaExiste) return Promise.reject(Object.assign(new Error('EMAIL_EXISTS'), { code:'auth/email-already-in-use' })); a.currentUser = usuario(email); return Promise.resolve({ user:a.currentUser }); },
    signInWithEmailAndPassword(email){ a.llamadas.push('entrar:' + email); if(op.claveMala) return Promise.reject(Object.assign(new Error('INVALID_LOGIN_CREDENTIALS'), { code:'auth/invalid-credential' })); a.currentUser = usuario(email); return Promise.resolve({ user:a.currentUser }); } };
  return a;
}
const vueltas = async (n) => { for (let i = 0; i < (n || 25); i++) await new Promise(r => setImmediate(r)); };
// Deja la pantalla como la ve el invitado al abrir su link: formulario con datos provisionales.
function abrirLink(estado, op){
  ['invite-screen','login-screen','inv_nombre','inv_pass','inv_pass2','invite-err','inv-info','inv-footer','inv-btn','ld-wrap'].forEach(id => { els[id] = elemento(); });
  els['inv-footer'].innerHTML = 'Pagasi · Sistema interno';
  const db = baseFalsa(estado), auth = cuentasFalsas(op);
  ctx.db = db; ctx.auth = auth; ctx._activandoInvitacion = false; S.pendingInvite = null; S.currentUser = null;
  ctx._resolverInvitacionPendiente();
  return { db, auth };
}
const escribir = (nombre, clave, clave2) => { els['inv_nombre'].value = nombre; els['inv_pass'].value = clave; els['inv_pass2'].value = clave2 === undefined ? clave : clave2; };
const ficha = db => db.escritos.find(w => w.col === 'usuarios' && w.tipo === 'set' && w.data && w.data.inviteToken);
const aviso = () => (els['invite-err'].style.display === 'block' ? els['invite-err'].textContent : '');

(async () => {
  // ════════ 1. Al abrir el link ════════
  let estado = { invitaciones: { 'TOK-1': invitacion() }, cuelgaLeer: true };
  let t = abrirLink(estado);
  ok('el formulario aparece al instante, con datos provisionales mientras llega la invitación',
    els['invite-screen'].style.display === 'flex' && els['login-screen'].style.display === 'none' && S.pendingInvite.rol === 'Empleado' && S.pendingInvite.permisos.length === 0 && S.pendingInvite.token === 'TOK-1');
  ok('el correo sale en el recuadro de arriba, que antes quedaba vacío, y el pie no se toca',
    /Invitación para <b>nuevo@ejemplo\.com<\/b>/.test(els['inv-info'].innerHTML) && els['inv-footer'].innerHTML === 'Pagasi · Sistema interno' && /id="inv-info"/.test(admin));

  // ...y cuando llega, no le borra lo que ya escribió
  estado = { invitaciones: { 'TOK-1': invitacion() } };
  t = abrirLink(estado);
  escribir('Ana Prueba', 'clave123');
  await vueltas();
  ok('cuando llega la invitación de la base, el formulario pasa a tener el rol y los permisos de verdad', S.pendingInvite.rol === 'Administrador' && S.pendingInvite.permisos.length === PERMISOS_ADMIN.length);
  ok('...sin borrarle al invitado el nombre y la clave que ya había escrito', els['inv_nombre'].value === 'Ana Prueba' && els['inv_pass'].value === 'clave123' && els['inv_pass2'].value === 'clave123');
  ctx._showInviteScreenForDoc({ token:'TOK-OTRO', email:'otro@ejemplo.com', nombre:'', rol:'Empleado', permisos:[] });
  ok('si es OTRA invitación, el formulario sí arranca limpio', els['inv_pass'].value === '' && els['inv_pass2'].value === '' && els['inv_nombre'].value === '');

  ctx._showInviteScreenForDoc({ token:'T', email:'<img src=x onerror=alert(1)>@x.com', nombre:'', rol:'Empleado', permisos:[] });
  ok('un correo con código en el link se escribe como texto, no como etiqueta', els['inv-info'].innerHTML.indexOf('<img') < 0 && /&lt;img src=x onerror=alert\(1\)&gt;@x\.com/.test(els['inv-info'].innerHTML));

  estado = { invitaciones: {} };
  t = abrirLink(estado); await vueltas();
  ok('una invitación anulada lo dice apenas se abre el link', /ya no existe/.test(aviso()) && /mande el link de nuevo/.test(aviso()));
  estado = { invitaciones: { 'TOK-1': invitacion({ usado:true }) } };
  t = abrirLink(estado); await vueltas();
  ok('una invitación ya usada también', /ya fue utilizada/.test(aviso()));

  // ════════ 2. El caso de hoy: pulsa «Crear mi cuenta» antes de que cargue la invitación ════════
  estado = { invitaciones: { 'TOK-1': invitacion() }, cuelgaLeer: true };
  t = abrirLink(estado);
  escribir('Ana Prueba', 'clave123');
  ok('(el formulario sigue con los datos provisionales: la invitación no ha llegado)', S.pendingInvite.rol === 'Empleado');
  estado.cuelgaLeer = false;                      // al pulsar el botón la lectura sí responde
  ctx.aceptarInvitacion();
  await vueltas();
  let f = ficha(t.db);
  ok('la ficha se guarda con el rol y los permisos DE LA INVITACIÓN, no con los provisionales',
    !!f && f.id === 'UID-1' && f.data.rol === 'Administrador' && JSON.stringify(f.data.permisos) === JSON.stringify(PERMISOS_ADMIN) && f.data.inviteToken === 'TOK-1' && f.data.email === 'nuevo@ejemplo.com' && f.data.nombre === 'Ana Prueba');
  ok('...la invitación se leyó antes de crear la cuenta', t.auth.llamadas[0] === 'crear:nuevo@ejemplo.com' && estado.lecturas >= 2);
  ok('...la ficha no lleva ningún campo de acceso que la base rechace', ['concesionarios','comisiones','suspendido','eliminado','isDemo','demoExpira','demoHoras'].every(k => !(k in f.data)));
  ok('...la invitación queda marcada como usada y el invitado entra', t.db.escritos.some(w => w.col === 'invitaciones' && w.tipo === 'update' && w.data.usado === true && w.data.uid === 'UID-1') && S.currentUser && S.currentUser.rol === 'Administrador' && els['invite-screen'].style.display === 'none' && ctx._activandoInvitacion === false);

  // ════════ 3. Si la invitación no se puede confirmar, NO se crea la cuenta ════════
  const intentar = async (est, op) => { const x = abrirLink(est, op); escribir('Ana Prueba', 'clave123'); ctx.aceptarInvitacion(); await vueltas(); return x; };
  t = await intentar({ invitaciones: {} });
  ok('invitación anulada: no se crea la cuenta y se dice qué hacer', t.auth.llamadas.length === 0 && !ficha(t.db) && /ya no existe/.test(aviso()) && ctx._activandoInvitacion === false && els['inv-btn'].disabled === false);
  t = await intentar({ invitaciones: { 'TOK-1': invitacion({ usado:true }) } });
  ok('invitación ya usada: tampoco', t.auth.llamadas.length === 0 && !ficha(t.db) && /ya fue utilizada/.test(aviso()));
  t = await intentar({ invitaciones: { 'TOK-1': invitacion() }, fallaLeer: true });
  ok('sin conexión: tampoco, y pide volver a intentar', t.auth.llamadas.length === 0 && !ficha(t.db) && /No se pudo confirmar tu invitación/.test(aviso()) && /vuelve a pulsar «Crear mi cuenta»/.test(aviso()));

  // La lectura que nunca responde: a los 20 segundos se corta
  const relojes = []; const tOrig = ctx.setTimeout; ctx.setTimeout = (fn, ms) => { relojes.push({ fn, ms }); return relojes.length; };
  let x = abrirLink({ invitaciones: { 'TOK-1': invitacion() }, cuelgaLeer: true });
  escribir('Ana Prueba', 'clave123'); ctx.aceptarInvitacion(); await vueltas();
  ok('con la conexión colgada el cartel no gira para siempre: hay un límite de 20 segundos', relojes.some(r => r.ms === 20000) && x.auth.llamadas.length === 0 && aviso() === '');
  relojes.filter(r => r.ms === 20000).forEach(r => r.fn()); await vueltas();
  ok('...y al cumplirse se avisa, sin haber creado la cuenta', x.auth.llamadas.length === 0 && /conexión está muy lenta/.test(aviso()) && ctx._activandoInvitacion === false);
  ctx.setTimeout = tOrig;

  // ════════ 4. La cuenta ya existe (un intento anterior quedó a medias) ════════
  t = await intentar({ invitaciones: { 'TOK-1': invitacion() } }, { yaExiste: true });
  f = ficha(t.db);
  ok('con la misma clave entra y se le completa la ficha', t.auth.llamadas.join(' ') === 'crear:nuevo@ejemplo.com entrar:nuevo@ejemplo.com' && !!f && f.data.rol === 'Administrador' && f.data.permisos.length === PERMISOS_ADMIN.length);
  t = await intentar({ invitaciones: { 'TOK-1': invitacion() } }, { yaExiste: true, claveMala: true });
  ok('con otra clave se le dice que use la misma o la restablezca', !ficha(t.db) && /la contraseña no coincide/.test(aviso()) && /MISMA contraseña/.test(aviso()));

  // ════════ 5. Si la base rechaza la ficha, el mensaje sale en español ════════
  t = await intentar({ invitaciones: { 'TOK-1': invitacion() }, fallaFicha: Object.assign(new Error('Missing or insufficient permissions.'), { code:'permission-denied' }) });
  ok('nada de «Missing or insufficient permissions»: dice que la cuenta quedó creada y qué hacer', !/Missing|insufficient/.test(aviso()) && /Tu cuenta quedó creada/.test(aviso()) && /MISMA contraseña/.test(aviso()) && ctx._activandoInvitacion === false && els['inv-btn'].disabled === false);
  const relojes2 = []; ctx.setTimeout = (fn, ms) => { relojes2.push({ fn, ms }); return relojes2.length; };
  x = abrirLink({ invitaciones: { 'TOK-1': invitacion() }, cuelgaFicha: true });
  escribir('Ana Prueba', 'clave123'); ctx.aceptarInvitacion(); await vueltas();
  relojes2.filter(r => r.ms === 25000).forEach(r => r.fn()); await vueltas();
  ok('si guardar la ficha se queda colgado, a los 25 segundos se avisa en vez de girar para siempre', relojes2.some(r => r.ms === 25000) && /Tu cuenta quedó creada/.test(aviso()));
  ctx.setTimeout = tOrig;

  // ════════ 6. Lo que no cambia ════════
  t = abrirLink({ invitaciones: { 'TOK-1': invitacion() } }); await vueltas();
  escribir('', 'clave123'); ctx.aceptarInvitacion(); await vueltas();
  ok('sin nombre no hace nada', t.auth.llamadas.length === 0 && /nombre completo/.test(aviso()));
  escribir('Ana Prueba', '123'); ctx.aceptarInvitacion(); await vueltas();
  ok('con una clave de menos de 6 caracteres tampoco', t.auth.llamadas.length === 0 && /al menos 6 caracteres/.test(aviso()));
  escribir('Ana Prueba', 'clave123', 'clave124'); ctx.aceptarInvitacion(); await vueltas();
  ok('ni si las dos claves no coinciden', t.auth.llamadas.length === 0 && /no coinciden/.test(aviso()));
  ok('quien entra con una cuenta sin ficha lee que debe abrir otra vez su link', /Esta cuenta todavía no tiene acceso al sistema\. Si te invitaron, abre otra vez el link de tu invitación y escribe tu misma contraseña/.test(src));
  ok('las invitaciones antiguas (guardadas en la ficha) no pasan por la confirmación nueva', /if\(pending && pending\._legacy\) return Promise\.resolve\(pending\);/.test(src));

  console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
