// Reglas del catalogo de pagasi.io (13-oct-2026), probadas contra el EMULADOR oficial.
// Corre en GitHub Actions (reglas-probar.yml): en la Mac no hay Java. Solo de PAGASI 26.
//  · Cualquiera lee el catalogo (la web publica lo muestra sin sesion).
//  · Escriben los administradores y quien tenga el permiso "catalogo" (Liz).
//  · Las condiciones (_condiciones) las crea un administrador; la tasa, la inicial y los
//    plazos solo los cambia un administrador. Liz si puede cambiar el seguro.
//  · Nadie sin sesion, ni un empleado sin el permiso, ni uno suspendido escribe.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection } = require('firebase/firestore');

let pass = 0, fail = 0;
async function prueba(nombre, promesa) {
  try { await promesa; pass++; console.log('OK    ' + nombre); }
  catch (e) { fail++; console.log('FALLA ' + nombre + '\n        → ' + String(e && e.message || e).split('\n')[0]); }
}
const moto = (id, extra) => Object.assign({ id, modelo: 'NEW HORSE 150', name: 'New Horse 150', sede: 'ek', sedeName: 'EK Bello Monte', precio: 1320, disponible: true, orden: id }, extra || {});

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-pagasi',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Adam' });
    await setDoc(doc(db, 'usuarios/liz'), { rol: 'Empleado', nombre: 'Liz', permisos: ['dash', 'catalogo'] });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Samantha', permisos: ['dash', 'pagos'] });
    await setDoc(doc(db, 'usuarios/lizSusp'), { rol: 'Empleado', nombre: 'Liz vieja', permisos: ['catalogo'], suspendido: true });
    await setDoc(doc(db, 'catalogo/1'), moto(1));
    await setDoc(doc(db, 'catalogo/_condiciones'), { apy: 650, seguroPct: 4.5, inicialMin: 40, inicialMax: 60, plazos: [6, 9, 12] });
  });
  const publico = env.unauthenticatedContext().firestore();
  const anon = env.authenticatedContext('anonX', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const admin = env.authenticatedContext('admin1').firestore();
  const liz = env.authenticatedContext('liz').firestore();
  const emp = env.authenticatedContext('emp1').firestore();
  const susp = env.authenticatedContext('lizSusp').firestore();

  // ── Leer: la web, sin sesion ──
  await prueba('la web sin sesión lee el catálogo completo', assertSucceeds(getDocs(collection(publico, 'catalogo'))));
  await prueba('...y las condiciones', assertSucceeds(getDoc(doc(publico, 'catalogo/_condiciones'))));
  await prueba('sin sesión no se escribe nada', assertFails(updateDoc(doc(publico, 'catalogo/1'), { precio: 1 })));
  await prueba('la sesión anónima de la solicitud web tampoco', assertFails(updateDoc(doc(anon, 'catalogo/1'), { precio: 1 })));

  // ── Liz (permiso "catalogo") ──
  await prueba('Liz cambia el precio de contado', assertSucceeds(updateDoc(doc(liz, 'catalogo/1'), { precio: 1400, actualizadoPor: 'Liz' })));
  await prueba('Liz pone la foto y la disponibilidad', assertSucceeds(setDoc(doc(liz, 'catalogo/1'), { image: 'https://x/y.jpg', imagePath: 'catalogo/1-1.jpg', disponible: false }, { merge: true })));
  await prueba('Liz agrega un modelo nuevo', assertSucceeds(setDoc(doc(liz, 'catalogo/47'), moto(47, { modelo: 'NUEVA 250', precio: 2100 }))));
  await prueba('Liz marca un modelo como eliminado', assertSucceeds(updateDoc(doc(liz, 'catalogo/47'), { eliminado: true, disponible: false })));
  await prueba('Liz cambia el seguro', assertSucceeds(updateDoc(doc(liz, 'catalogo/_condiciones'), { seguroPct: 5 })));
  await prueba('Liz NO cambia la tasa', assertFails(updateDoc(doc(liz, 'catalogo/_condiciones'), { apy: 900 })));
  await prueba('Liz NO cambia la tasa aunque vaya junto con el seguro', assertFails(updateDoc(doc(liz, 'catalogo/_condiciones'), { seguroPct: 4.5, apy: 900 })));
  await prueba('Liz NO cambia la inicial mínima ni los plazos', assertFails(updateDoc(doc(liz, 'catalogo/_condiciones'), { inicialMin: 20 })));
  await prueba('...ni los plazos', assertFails(updateDoc(doc(liz, 'catalogo/_condiciones'), { plazos: [6, 9, 12, 24] })));
  await prueba('Liz NO borra un documento de verdad', assertFails(deleteDoc(doc(liz, 'catalogo/1'))));

  // ── Otros empleados ──
  await prueba('un empleado sin el permiso no cambia precios', assertFails(updateDoc(doc(emp, 'catalogo/1'), { precio: 1 })));
  await prueba('...ni agrega modelos', assertFails(setDoc(doc(emp, 'catalogo/48'), moto(48))));
  await prueba('...pero sí lo puede leer', assertSucceeds(getDoc(doc(emp, 'catalogo/1'))));
  await prueba('alguien suspendido con el permiso ya no escribe', assertFails(updateDoc(doc(susp, 'catalogo/1'), { precio: 1 })));

  // ── Administrador ──
  await prueba('el administrador cambia la tasa', assertSucceeds(updateDoc(doc(admin, 'catalogo/_condiciones'), { apy: 650, seguroPct: 4.5 })));
  await prueba('el administrador borra un documento', assertSucceeds(deleteDoc(doc(admin, 'catalogo/47'))));
  await env.withSecurityRulesDisabled(async ctx => { await deleteDoc(doc(ctx.firestore(), 'catalogo/_condiciones')); });
  await prueba('Liz NO crea las condiciones desde cero', assertFails(setDoc(doc(liz, 'catalogo/_condiciones'), { apy: 650, seguroPct: 4.5 })));
  await prueba('el administrador sí las crea', assertSucceeds(setDoc(doc(admin, 'catalogo/_condiciones'), { apy: 650, seguroPct: 4.5, inicialMin: 40, inicialMax: 60, plazos: [6, 9, 12] })));

  await env.cleanup();
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR ' + (e && e.message || e)); process.exit(1); });
