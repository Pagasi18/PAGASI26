// Reglas de las metricas anonimas de la pagina publica (14-oct-2026), contra el EMULADOR
// oficial. Corre en GitHub Actions (reglas-probar.yml). Solo de PAGASI 26.
//  · La pagina sin sesion crea su visita con los campos exactos y le agrega eventos de a uno.
//  · No puede meter campos de mas, textos largos, reescribir la lista ni cambiar la fuente.
//  · Solo administradores (o permiso "metricas") leen; nadie mas borra.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, arrayUnion, increment } = require('firebase/firestore');

let pass = 0, fail = 0;
async function prueba(nombre, promesa) {
  try { await promesa; pass++; console.log('OK    ' + nombre); }
  catch (e) { fail++; console.log('FALLA ' + nombre + '\n        → ' + String(e && e.message || e).split('\n')[0]); }
}
const ev = (t, ts) => ({ t, p: 'index', ts: ts || Date.now() });
const visita = (extra) => Object.assign({ vid: 'vabcdefghijk1', fecha: '2026-10-14', hora: 9, inicio: 1, ultima: 1, fuente: 'instagram', medio: '', campana: '', disp: 'telefono', entrada: 'index', ev: [ev('vista', 1)], n: 1, v: 1 }, extra || {});

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-pagasi',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Adam' });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Samantha', permisos: ['dash'] });
    await setDoc(doc(db, 'usuarios/ana'), { rol: 'Empleado', nombre: 'Ana', permisos: ['dash', 'metricas'] });
  });
  const web = env.unauthenticatedContext().firestore();
  const admin = env.authenticatedContext('admin1').firestore();
  const emp = env.authenticatedContext('emp1').firestore();
  const ana = env.authenticatedContext('ana').firestore();

  await prueba('la página crea su visita', assertSucceeds(setDoc(doc(web, 'metricas/sabcdefghij0123'), visita())));
  await prueba('...y le agrega un evento', assertSucceeds(updateDoc(doc(web, 'metricas/sabcdefghij0123'), { ev: arrayUnion(ev('simulo', 2)), n: increment(1), ultima: 2 })));
  await prueba('no puede agregar dos eventos de una vez', assertFails(updateDoc(doc(web, 'metricas/sabcdefghij0123'), { ev: arrayUnion(ev('a', 3), ev('b', 4)), n: increment(1), ultima: 3 })));
  await prueba('no puede cambiar la fuente después', assertFails(updateDoc(doc(web, 'metricas/sabcdefghij0123'), { fuente: 'google', ev: arrayUnion(ev('x', 5)), n: increment(1), ultima: 5 })));
  await prueba('no puede reescribir la lista de eventos', assertFails(updateDoc(doc(web, 'metricas/sabcdefghij0123'), { ev: [ev('vista', 9)], n: increment(1), ultima: 9 })));
  await prueba('no puede crear con campos de más (un nombre, por ejemplo)', assertFails(setDoc(doc(web, 'metricas/sabcdefghij0124'), visita({ nombre: 'Carlos' }))));
  await prueba('no puede crear con textos largos', assertFails(setDoc(doc(web, 'metricas/sabcdefghij0125'), visita({ fuente: 'x'.repeat(200) }))));
  await prueba('no puede crear con un número de visita raro', assertFails(setDoc(doc(web, 'metricas/../usuarios'), visita())));
  await prueba('no puede crear con varios eventos de una vez', assertFails(setDoc(doc(web, 'metricas/sabcdefghij0126'), visita({ ev: [ev('a', 1), ev('b', 2)] }))));
  await prueba('no puede reescribir una visita que ya existe', assertFails(setDoc(doc(web, 'metricas/sabcdefghij0123'), visita())));
  await prueba('la página no puede leer las visitas', assertFails(getDoc(doc(web, 'metricas/sabcdefghij0123'))));
  await prueba('...ni listarlas', assertFails(getDocs(collection(web, 'metricas'))));
  await prueba('un empleado sin permiso no las lee', assertFails(getDocs(collection(emp, 'metricas'))));
  await prueba('con el permiso "metricas" sí', assertSucceeds(getDocs(collection(ana, 'metricas'))));
  await prueba('el administrador las lee', assertSucceeds(getDocs(collection(admin, 'metricas'))));
  await prueba('la página no borra', assertFails(deleteDoc(doc(web, 'metricas/sabcdefghij0123'))));
  await prueba('el administrador sí puede borrar', assertSucceeds(deleteDoc(doc(admin, 'metricas/sabcdefghij0123'))));

  await env.cleanup();
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR ' + (e && e.message || e)); process.exit(1); });
