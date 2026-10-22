// Accesos al portal de aliados (22-oct-2026). Adam: "necesito poder crear los usuarios y claves de
// los aliados". El servidor crea la cuenta (usuario@aliados.pagasi.io) con su ficha de Aliado, le
// cambia la clave y le quita o devuelve el acceso; el panel arma el usuario, la clave y la lista.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const aliados = require(path.join(ROOT, 'functions', 'lib', 'aliados.js'));

// Auth y Firestore falsos (los de administrador de la 26)
function falsos() {
  const cuentas = {}, fichas = {}; let n = 0;
  const auth = {
    async createUser(d) { if (Object.values(cuentas).some(c => c.email === d.email)) { const e = new Error('existe'); e.code = 'auth/email-already-exists'; throw e; } const uid = 'u' + (++n); cuentas[uid] = Object.assign({ uid, disabled: false }, d); return { uid }; },
    async updateUser(uid, d) { if (!cuentas[uid]) throw new Error('no existe'); Object.assign(cuentas[uid], d); }
  };
  const db = { collection: () => ({ doc: (id) => ({
    async get() { return { exists: !!fichas[id], data: () => fichas[id] }; },
    async set(d, o) { fichas[id] = Object.assign({}, o && o.merge ? fichas[id] : {}, d); }
  }) }) };
  return { cuentas, fichas, deps: { auth, db, ahora: () => '2026-10-22T12:00:00.000Z' } };
}
const yo = { nombre: 'Adam', uid: 'adam' };
const intenta = async (p) => { try { await p; return null; } catch (e) { return e; } };

(async () => {
  // ── Servidor ──
  const F = falsos();
  const r = await aliados.accion(F.deps, yo, { accion: 'crear', usuario: 'EK', clave: 'abcd2345', nombre: 'Grupo EK', grupo: 'Grupo EK', concesionarios: ['CONC-1', 'CONC-2', ''] });
  const c = F.cuentas[r.uid], f = F.fichas[r.uid];
  ok('crea la cuenta con el correo interno del usuario (en minúsculas) y su clave', c && c.email === 'ek@aliados.pagasi.io' && c.password === 'abcd2345');
  ok('...y su ficha: rol Aliado, sin permisos del sistema, sus sedes, el nombre del grupo y quién la creó', f && f.rol === 'Aliado' && Array.isArray(f.permisos) && !f.permisos.length && f.concesionarios.join() === 'CONC-1,CONC-2' && f.grupo === 'Grupo EK' && f.usuario === 'ek' && f.creadoPor === 'Adam');
  let e = await intenta(aliados.accion(F.deps, yo, { accion: 'crear', usuario: 'ek', clave: 'otra1234', concesionarios: ['CONC-3'] }));
  ok('un usuario repetido no se crea dos veces', e && e.status === 409 && /ya existe/.test(e.message));
  e = await intenta(aliados.accion(F.deps, yo, { accion: 'crear', usuario: 'motos toro', clave: 'abcd2345', concesionarios: ['CONC-3'] }));
  ok('el usuario no puede llevar espacios', e && e.status === 400 && e.codigo === 'usuario');
  e = await intenta(aliados.accion(F.deps, yo, { accion: 'crear', usuario: 'toro', clave: '1234', concesionarios: ['CONC-3'] }));
  ok('la clave necesita al menos 6 caracteres', e && e.codigo === 'clave');
  e = await intenta(aliados.accion(F.deps, yo, { accion: 'crear', usuario: 'toro', clave: 'abcd2345', concesionarios: [] }));
  ok('sin concesionarios no se crea', e && e.codigo === 'sedes' && !Object.values(F.cuentas).some(x => x.email === 'toro@aliados.pagasi.io'));
  await aliados.accion(F.deps, yo, { accion: 'clave', uid: r.uid, clave: 'nueva9876' });
  ok('clave nueva: la cuenta queda con la clave nueva y la ficha dice quién la cambió', F.cuentas[r.uid].password === 'nueva9876' && F.fichas[r.uid].claveCambiadaPor === 'Adam');
  await aliados.accion(F.deps, yo, { accion: 'acceso', uid: r.uid, activo: false });
  ok('quitar acceso: la cuenta queda desactivada y la ficha suspendida', F.cuentas[r.uid].disabled === true && F.fichas[r.uid].suspendido === true);
  await aliados.accion(F.deps, yo, { accion: 'acceso', uid: r.uid, activo: true });
  ok('devolver acceso: vuelve a entrar', F.cuentas[r.uid].disabled === false && F.fichas[r.uid].suspendido === false);
  F.fichas.emp1 = { rol: 'Empleado', nombre: 'Ana' }; F.cuentas.emp1 = { uid: 'emp1' };
  e = await intenta(aliados.accion(F.deps, yo, { accion: 'clave', uid: 'emp1', clave: 'abcdef12' }));
  ok('no le cambia la clave a alguien que no es aliado (un empleado)', e && e.status === 404 && !F.cuentas.emp1.password);
  ok('el correo interno', aliados.correoDe('ek') === 'ek@aliados.pagasi.io' && aliados.usuarioValido('ek.trujillo') && !aliados.usuarioValido('ek trujillo') && !aliados.usuarioValido('ña'));

  // El servidor solo deja pasar a un administrador
  const idx = fs.readFileSync(path.join(ROOT, 'functions', 'index.js'), 'utf8');
  ok('la ruta /aliados exige un administrador del sistema', /\/aliados[\s\S]{0,200}if \(!quien \|\| !quien\.admin\) return res\.status\(403\)/.test(idx) && /admin: \['Administrador', 'admin'\]\.includes\(u\.data\(\)\.rol\)/.test(idx));

  // ── Panel ──
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', style: {}, className: '' });
  const ctx = { console, document: { querySelectorAll: () => [] }, S: { page: 'users', usersTab: 'aliados', concesionarios: [
      { id: 'CONC-1', nombre: 'EMPIRE Bello Monte', ciudad: 'Caracas' }, { id: 'CONC-2', nombre: 'EK Trujillo', ciudad: 'Valera' }, { id: 'CONC-3', nombre: 'MOTOS TORO', ciudad: 'Maracay' }, { id: 'CONC-4', nombre: 'Vieja', eliminado: true }] },
    $: el, setMicon() {}, toast() {}, crypto: require('crypto').webcrypto, FIREBASE_CONFIG: { projectId: 'pagasi26-65ced' } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'logic', 'aliados-accesos.js'), 'utf8') + '\n;var _usersCache = [];', ctx);
  ok('usuario sugerido: "EMPIRE Bello Monte" → ekbellomonte; "Motos Toro, C.A." → motostoroca', ctx.aliadoUsuarioSugerido('EMPIRE Bello Monte') === 'ekbellomonte' && ctx.aliadoUsuarioSugerido('Motos Toro, C.A.') === 'motostoroca' && ctx.aliadoUsuarioSugerido('Haojín') === 'haojin');
  const claves = Array.from({ length: 50 }, () => ctx.aliadoClaveNueva());
  ok('la clave sale de 8 caracteres, 4 letras y 4 números, sin l, o, 0 ni 1', claves.every(k => /^[a-hj-km-np-z]{4}[2-9]{4}$/.test(k)) && new Set(claves).size > 45);
  vm.runInContext("_usersCache = [{ uid: 'u1', rol: 'Aliado', usuario: 'ek', nombre: 'Grupo EK', grupo: 'Grupo EK', concesionarios: ['CONC-1', 'CONC-2'], creadoEn: '2026-10-22T12:00:00Z', creadoPor: 'Adam' }, { uid: 'x', rol: 'Empleado', nombre: 'Ana' }]", ctx);
  let h = ctx._aliadosTabHTML();
  ok('la pestaña Aliados lista al aliado con su usuario, sus sedes y los botones', /Grupo EK/.test(h) && />ek</.test(h) && /EMPIRE Bello Monte · EK Trujillo/.test(h) && /Clave nueva/.test(h) && /Quitar acceso/.test(h) && !/Ana/.test(h));
  ok('...y avisa qué concesionarios activos no tienen acceso (sin los borrados)', /Concesionarios activos sin acceso \(1\)/.test(h) && /MOTOS TORO/.test(h) && !/Vieja/.test(h));
  vm.runInContext("_usersCache[0].suspendido = true", ctx);
  h = ctx._aliadosTabHTML();
  ok('un aliado sin acceso sale marcado y con "Devolver acceso"', /Sin acceso/.test(h) && /Devolver acceso/.test(h) && /Concesionarios activos sin acceso \(3\)/.test(h));
  ok('el mensaje para el aliado trae dónde entrar, el usuario y la clave', /pagasi\.io\/aliados[\s\S]*Usuario: ek[\s\S]*Clave: abcd2345/.test(ctx._alTextoAcceso('Grupo EK', 'ek', 'abcd2345', false)));
  ctx.FIREBASE_CONFIG = { projectId: 'pagasi-v2' };
  ok('en la 18 avisa que los aliados se manejan desde pagasi.io', /desde <b>pagasi\.io<\/b>/.test(ctx._aliadosTabHTML()));

  // ── Portal: entra con el usuario simple ──
  const portal = fs.readFileSync(path.join(ROOT, 'aliados', 'portal.js'), 'utf8');
  ok('el portal convierte el usuario simple en usuario@aliados.pagasi.io y deja la demostración bera/1234', /u \+ '@aliados\.pagasi\.io'/.test(portal) && /signInWithEmailAndPassword\(correoDeUsuario\(u\), c\)/.test(portal) && /CUENTAS\[u\] && CUENTAS\[u\] === c/.test(portal));

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA', e); process.exitCode = 1; });
