// Reglas de la Lista negra (26-nov-2026), probadas contra el EMULADOR oficial.
// La lista la lee y la llena quien tiene el permiso «listanegra» (y los administradores); modificar o
// eliminar, solo un administrador. El vendedor NO lee la lista: solo pregunta por una marca del índice,
// sabiendo la cédula o el teléfono. Lo automático y malapagas no se escriben desde el navegador.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, addDoc } = require('firebase/firestore');

let pass = 0, fail = 0;
async function prueba(nombre, promesa) {
  try { await promesa; pass++; console.log('OK    ' + nombre); }
  catch (e) { fail++; console.log('FALLA ' + nombre + '\n        → ' + String(e && e.message || e).split('\n')[0]); }
}

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-pagasi',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  const persona = k => ({ cedula: 'V-' + k.slice(1), cedulaKey: k, nombre: 'PERSONA ' + k, telefono: '', telKey: '', motivo: 'Mala paga', comentario: '' });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Admin' });
    await setDoc(doc(db, 'usuarios/ver1'), { rol: 'Empleado', nombre: 'Verificación', permisos: ['dash', 'listanegra'] });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Vendedor', nombre: 'Vendedor', permisos: ['dash', 'clientes', 'creditos'] });
    await setDoc(doc(db, 'usuarios/vc1'), { rol: 'Vendedor Concesionario', nombre: 'Vendedor de sede', permisos: ['clientes', 'listanegra'], concesionarios: ['C1'] });
    await setDoc(doc(db, 'usuarios/sus1'), { rol: 'Empleado', nombre: 'Suspendida', permisos: ['listanegra'], suspendido: true });
    await setDoc(doc(db, 'listaNegra/C11111111'), persona('C11111111'));
    await setDoc(doc(db, 'listaNegraAuto/C22222222'), persona('C22222222'));
    await setDoc(doc(db, 'malapagas/33333333'), { nombre: 'X', montoAdeudado: 100 });
    await setDoc(doc(db, 'listaNegraIndice/M-C11111111'), { t: 'manual' });
    await setDoc(doc(db, 'listaNegraIndice/A-C22222222'), { t: 'auto' });
    await setDoc(doc(db, 'listaNegraAvisos/A1'), { uid: 'emp1', estado: 'pendiente', fecha: '2026-11-26', coincidencias: [] });
    await setDoc(doc(db, 'listaNegraPases/C11111111'), { clave: 'C11111111', hasta: '2026-12-31' });
  });
  const admin = env.authenticatedContext('admin1', { email: 'a@x.com' }).firestore();
  const ver = env.authenticatedContext('ver1', { email: 'v@x.com' }).firestore();
  const vend = env.authenticatedContext('emp1', { email: 'e@x.com' }).firestore();
  const vc = env.authenticatedContext('vc1', { email: 'vc@x.com' }).firestore();
  const susp = env.authenticatedContext('sus1', { email: 's@x.com' }).firestore();
  const nadie = env.unauthenticatedContext().firestore();
  const extrano = env.authenticatedContext('sinficha', { email: 'z@x.com' }).firestore();

  // ── La lista ──
  await prueba('Verificación lee una persona de la lista', assertSucceeds(getDoc(doc(ver, 'listaNegra/C11111111'))));
  await prueba('Verificación lee la lista completa', assertSucceeds(getDocs(collection(ver, 'listaNegra'))));
  await prueba('Verificación anota a alguien nuevo', assertSucceeds(setDoc(doc(ver, 'listaNegra/C44444444'), persona('C44444444'))));
  await prueba('...pero no con una clave que no es la de su cédula', assertFails(setDoc(doc(ver, 'listaNegra/C55555555'), persona('C99999999'))));
  await prueba('Verificación NO modifica', assertFails(updateDoc(doc(ver, 'listaNegra/C11111111'), { comentario: 'cambio' })));
  await prueba('Verificación NO elimina', assertFails(deleteDoc(doc(ver, 'listaNegra/C11111111'))));
  await prueba('un administrador modifica', assertSucceeds(updateDoc(doc(admin, 'listaNegra/C11111111'), { comentario: 'cambio' })));
  await prueba('...pero no le cambia la cédula', assertFails(updateDoc(doc(admin, 'listaNegra/C11111111'), { cedulaKey: 'C00000000' })));
  await prueba('un administrador elimina', assertSucceeds(deleteDoc(doc(admin, 'listaNegra/C44444444'))));
  await prueba('un vendedor NO lee una persona', assertFails(getDoc(doc(vend, 'listaNegra/C11111111'))));
  await prueba('un vendedor NO lee la lista', assertFails(getDocs(collection(vend, 'listaNegra'))));
  await prueba('un vendedor NO anota', assertFails(setDoc(doc(vend, 'listaNegra/C66666666'), persona('C66666666'))));
  await prueba('un vendedor de concesionario NO lee, aunque le marquen el permiso', assertFails(getDoc(doc(vc, 'listaNegra/C11111111'))));
  await prueba('una suspendida con el permiso NO lee', assertFails(getDoc(doc(susp, 'listaNegra/C11111111'))));
  await prueba('sin sesión nadie lee', assertFails(getDoc(doc(nadie, 'listaNegra/C11111111'))));

  // ── Las marcas ──
  await prueba('un vendedor pregunta por UNA marca', assertSucceeds(getDoc(doc(vend, 'listaNegraIndice/M-C11111111'))));
  await prueba('un vendedor de concesionario también', assertSucceeds(getDoc(doc(vc, 'listaNegraIndice/A-C22222222'))));
  await prueba('...y por una que no existe (le dice que no está)', assertSucceeds(getDoc(doc(vend, 'listaNegraIndice/M-C00000001'))));
  await prueba('un vendedor NO puede listar las marcas', assertFails(getDocs(collection(vend, 'listaNegraIndice'))));
  await prueba('ni Verificación las lista (no hace falta)', assertFails(getDocs(collection(ver, 'listaNegraIndice'))));
  await prueba('un vendedor NO pone marcas', assertFails(setDoc(doc(vend, 'listaNegraIndice/M-C77777777'), { t: 'manual' })));
  await prueba('Verificación pone la marca de una cédula', assertSucceeds(setDoc(doc(ver, 'listaNegraIndice/M-C77777777'), { t: 'manual' })));
  await prueba('...y la de un teléfono', assertSucceeds(setDoc(doc(ver, 'listaNegraIndice/M-T4141234567'), { t: 'manual' })));
  await prueba('...pero no una marca del robot', assertFails(setDoc(doc(ver, 'listaNegraIndice/A-C77777777'), { t: 'auto' })));
  await prueba('...ni una con otro formato', assertFails(setDoc(doc(ver, 'listaNegraIndice/M-cualquiercosa'), { t: 'x' })));
  await prueba('Verificación NO quita marcas', assertFails(deleteDoc(doc(ver, 'listaNegraIndice/M-C11111111'))));
  await prueba('un administrador quita una marca puesta a mano', assertSucceeds(deleteDoc(doc(admin, 'listaNegraIndice/M-C77777777'))));
  await prueba('...pero no una del robot', assertFails(deleteDoc(doc(admin, 'listaNegraIndice/A-C22222222'))));
  await prueba('una cuenta sin ficha NO pregunta por marcas', assertFails(getDoc(doc(extrano, 'listaNegraIndice/M-C11111111'))));
  await prueba('sin sesión tampoco', assertFails(getDoc(doc(nadie, 'listaNegraIndice/M-C11111111'))));

  // ── Lo automático y malapagas ──
  await prueba('Verificación lee la mala paga automática', assertSucceeds(getDocs(collection(ver, 'listaNegraAuto'))));
  await prueba('un vendedor no', assertFails(getDoc(doc(vend, 'listaNegraAuto/C22222222'))));
  await prueba('nadie la escribe desde el navegador, ni un administrador', assertFails(setDoc(doc(admin, 'listaNegraAuto/C88888888'), persona('C88888888'))));
  await prueba('Verificación consulta UNA cédula en malapagas', assertSucceeds(getDoc(doc(ver, 'malapagas/33333333'))));
  await prueba('...pero no se la puede bajar entera', assertFails(getDocs(collection(ver, 'malapagas'))));
  await prueba('un vendedor no consulta malapagas', assertFails(getDoc(doc(vend, 'malapagas/33333333'))));
  await prueba('nadie escribe en malapagas', assertFails(setDoc(doc(admin, 'malapagas/44444444'), { nombre: 'Y' })));

  // ── Los avisos de frenados ──
  await prueba('el vendedor frenado deja su aviso', assertSucceeds(addDoc(collection(vend, 'listaNegraAvisos'), { uid: 'emp1', estado: 'pendiente', fecha: '2026-11-26', coincidencias: [] })));
  await prueba('el vendedor de concesionario también', assertSucceeds(addDoc(collection(vc, 'listaNegraAvisos'), { uid: 'vc1', estado: 'pendiente', fecha: '2026-11-26', coincidencias: [] })));
  await prueba('...pero no a nombre de otro', assertFails(addDoc(collection(vend, 'listaNegraAvisos'), { uid: 'ver1', estado: 'pendiente' })));
  await prueba('...ni ya autorizado', assertFails(addDoc(collection(vend, 'listaNegraAvisos'), { uid: 'emp1', estado: 'autorizado' })));
  await prueba('el vendedor NO lee los avisos', assertFails(getDoc(doc(vend, 'listaNegraAvisos/A1'))));
  await prueba('Verificación los lee', assertSucceeds(getDocs(collection(ver, 'listaNegraAvisos'))));
  await prueba('Verificación resuelve un aviso', assertSucceeds(updateDoc(doc(ver, 'listaNegraAvisos/A1'), { estado: 'autorizado', resueltoPor: 'V', resueltoEn: '2026-11-26' })));
  await prueba('...sin poder cambiarle lo demás', assertFails(updateDoc(doc(ver, 'listaNegraAvisos/A1'), { uid: 'otro' })));
  await prueba('el vendedor NO se autoriza su propio aviso', assertFails(updateDoc(doc(vend, 'listaNegraAvisos/A1'), { estado: 'autorizado' })));

  // ── Los vistos buenos ──
  await prueba('un vendedor consulta si hay visto bueno para una clave', assertSucceeds(getDoc(doc(vend, 'listaNegraPases/C11111111'))));
  await prueba('un vendedor NO se da el visto bueno', assertFails(setDoc(doc(vend, 'listaNegraPases/C11111111'), { clave: 'C11111111', hasta: '2099-01-01' })));
  await prueba('un vendedor de concesionario tampoco', assertFails(setDoc(doc(vc, 'listaNegraPases/C22222222'), { clave: 'C22222222', hasta: '2099-01-01' })));
  await prueba('un vendedor NO lista los vistos buenos', assertFails(getDocs(collection(vend, 'listaNegraPases'))));
  await prueba('Verificación da el visto bueno', assertSucceeds(setDoc(doc(ver, 'listaNegraPases/C22222222'), { clave: 'C22222222', hasta: '2026-12-03' })));

  await env.cleanup();
  console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba se cayó: ' + (e && e.stack || e)); process.exit(1); });
