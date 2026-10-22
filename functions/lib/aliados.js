/* Accesos al portal de aliados (22-oct-2026, Adam: "necesito poder crear los usuarios y claves de
   los aliados... vienen nuevos concesionarios, y también los que tenemos actuales").
   Un administrador del sistema crea el acceso desde Usuarios o desde Concesionarios: un usuario
   (sin correo) y una clave. La cuenta vive en Firebase de la 26, que es donde entra el portal, con
   un correo interno usuario@aliados.pagasi.io; el aliado escribe solo su usuario. Su ficha en
   /usuarios lleva rol Aliado y las sedes que ve. El administrador también le cambia la clave
   (el aliado no tiene correo para recuperarla) o le quita y le devuelve el acceso.            */
'use strict';
const DOMINIO = 'aliados.pagasi.io';
const usuarioValido = u => /^[a-z0-9][a-z0-9._-]{1,29}$/.test(u);
const correoDe = u => u + '@' + DOMINIO;
function falla(status, codigo, mensaje) { const e = new Error(mensaje); e.status = status; e.codigo = codigo; return e; }
function claveValida(c) { if (c.length < 6 || c.length > 64) throw falla(400, 'clave', 'La clave debe tener de 6 a 64 caracteres.'); }

// deps: { auth (Auth de administrador de la 26), db (Firestore de la 26), ahora }
// quien: { nombre, uid } del administrador que lo pide
async function accion(deps, quien, body) {
  body = body || {};
  const que = String(body.accion || '');
  if (que === 'crear') {
    const usuario = String(body.usuario || '').trim().toLowerCase();
    const clave = String(body.clave || '');
    const sedes = (Array.isArray(body.concesionarios) ? body.concesionarios : []).map(s => String(s).trim()).filter(Boolean).slice(0, 30);
    const nombre = String(body.nombre || '').trim().slice(0, 80) || usuario;
    const grupo = String(body.grupo || '').trim().slice(0, 60);
    if (!usuarioValido(usuario)) throw falla(400, 'usuario', 'El usuario debe tener de 2 a 30 letras o números (puede llevar punto o guion), sin espacios ni acentos.');
    claveValida(clave);
    if (!sedes.length) throw falla(400, 'sedes', 'Marca al menos un concesionario.');
    let cuenta;
    try { cuenta = await deps.auth.createUser({ email: correoDe(usuario), password: clave, displayName: nombre }); }
    catch (e) { if (e && e.code === 'auth/email-already-exists') throw falla(409, 'existe', 'Ese usuario ya existe. Escoge otro, o cámbiale la clave al que ya está.'); throw e; }
    const ficha = { uid: cuenta.uid, email: correoDe(usuario), usuario, nombre, rol: 'Aliado', permisos: [], concesionarios: sedes,
      inviteStatus: 'aceptada', debeActualizar: false, accesoPortal: true, creadoPor: quien.nombre || '', creadoPorUid: quien.uid || '', creadoEn: deps.ahora() };
    if (grupo) ficha.grupo = grupo;
    await deps.db.collection('usuarios').doc(cuenta.uid).set(ficha);
    return { ok: true, uid: cuenta.uid, usuario };
  }
  if (que === 'clave' || que === 'acceso') {
    const uid = String(body.uid || '');
    const d = uid ? await deps.db.collection('usuarios').doc(uid).get() : null;
    if (!d || !d.exists || d.data().rol !== 'Aliado') throw falla(404, 'no-aliado', 'Ese usuario no es un aliado.');
    if (que === 'clave') {
      const clave = String(body.clave || ''); claveValida(clave);
      await deps.auth.updateUser(uid, { password: clave });
      await deps.db.collection('usuarios').doc(uid).set({ claveCambiadaPor: quien.nombre || '', claveCambiadaEn: deps.ahora() }, { merge: true });
      return { ok: true, uid };
    }
    const activo = body.activo !== false;
    await deps.auth.updateUser(uid, { disabled: !activo });
    await deps.db.collection('usuarios').doc(uid).set({ suspendido: !activo, accesoPortal: activo, accesoCambiadoPor: quien.nombre || '', accesoCambiadoEn: deps.ahora() }, { merge: true });
    return { ok: true, uid, activo };
  }
  throw falla(400, 'accion', 'No sé hacer eso.');
}

module.exports = { accion, usuarioValido, correoDe, DOMINIO };
