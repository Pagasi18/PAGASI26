// Reglas del rol Aliado (17-oct-2026), probadas contra el EMULADOR oficial.
// El dueno de un concesionario aliado entra a pagasi.io/aliados con su cuenta y SOLO lee los
// resumenes (aliados_resumen) de sus sedes y su propia ficha. Nada mas: ni clientes, ni
// creditos, ni pagos, ni config. El personal interno sigue leyendo los resumenes y nadie los
// escribe desde el navegador (los arma el robot con la cuenta de servicio).
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, getDocs, collection } = require('firebase/firestore');

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
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Admin' });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Empleada', email: 'emp1@x.com', permisos: ['dash', 'clientes'] });
    await setDoc(doc(db, 'usuarios/ali1'), { rol: 'Aliado', nombre: 'Dueño EK', email: 'ali1@x.com', permisos: [], concesionarios: ['C-EK', 'C-HJ'] });
    await setDoc(doc(db, 'aliados_resumen/C-EK'), { concId: 'C-EK', nombre: 'EMPIRE Bello Monte', mes: { motos: 3 } });
    await setDoc(doc(db, 'aliados_resumen/C-HJ'), { concId: 'C-HJ', nombre: 'HAOJIN', mes: { motos: 1 } });
    await setDoc(doc(db, 'aliados_resumen/C-OTRO'), { concId: 'C-OTRO', nombre: 'BERA Chacao', mes: { motos: 9 } });
    await setDoc(doc(db, 'clientes/1'), { id: 1, nombre: 'CLIENTE', cedula: '1', concesionarioId: 'C-EK' });
    await setDoc(doc(db, 'creditos/M-1'), { id: 'M-1', cli: 'CLIENTE', concesionarioId: 'C-EK', estado: 'activo' });
    await setDoc(doc(db, 'pagos/P1'), { id: 'P1', cred: 'M-1', monto: 50 });
    await setDoc(doc(db, 'concesionarios/C-EK'), { id: 'C-EK', nombre: 'EMPIRE Bello Monte', anticipos: [{ monto: 5000 }] });
    await setDoc(doc(db, 'config/plan'), { apy: 500 });
    await setDoc(doc(db, 'config/cuentasBanc'), { cuentas: [] });
    await setDoc(doc(db, 'contadores/creditos'), { ultimo: 10 });
  });

  const ali = env.authenticatedContext('ali1', { email: 'ali1@x.com', firebase: { sign_in_provider: 'password' } }).firestore();
  const emp = env.authenticatedContext('emp1', { email: 'emp1@x.com', firebase: { sign_in_provider: 'password' } }).firestore();
  const admin = env.authenticatedContext('admin1', { email: 'a@x.com', firebase: { sign_in_provider: 'password' } }).firestore();
  const nadie = env.unauthenticatedContext().firestore();

  // ── Lo que SI puede el aliado ──
  await prueba('el aliado lee el resumen de su sede', assertSucceeds(getDoc(doc(ali, 'aliados_resumen/C-EK'))));
  await prueba('...y el de su otra sede', assertSucceeds(getDoc(doc(ali, 'aliados_resumen/C-HJ'))));
  await prueba('...y su propia ficha (de ahí sabe sus sedes)', assertSucceeds(getDoc(doc(ali, 'usuarios/ali1'))));

  // ── Lo que NO puede ──
  await prueba('no lee el resumen de un concesionario que no es suyo', assertFails(getDoc(doc(ali, 'aliados_resumen/C-OTRO'))));
  await prueba('no lista todos los resúmenes', assertFails(getDocs(collection(ali, 'aliados_resumen'))));
  await prueba('no escribe un resumen (eso lo hace el robot)', assertFails(setDoc(doc(ali, 'aliados_resumen/C-EK'), { mes: { motos: 99 } })));
  await prueba('no lee clientes (ni los de su sede)', assertFails(getDoc(doc(ali, 'clientes/1'))));
  await prueba('no lee créditos', assertFails(getDoc(doc(ali, 'creditos/M-1'))));
  await prueba('no lee pagos', assertFails(getDoc(doc(ali, 'pagos/P1'))));
  await prueba('no lee la ficha del concesionario (anticipos, claves)', assertFails(getDoc(doc(ali, 'concesionarios/C-EK'))));
  await prueba('no lee la configuración (plan, cuentas bancarias)', assertFails(getDoc(doc(ali, 'config/plan'))));
  await prueba('...ni las cuentas bancarias', assertFails(getDoc(doc(ali, 'config/cuentasBanc'))));
  await prueba('no lee los contadores', assertFails(getDoc(doc(ali, 'contadores/creditos'))));
  await prueba('no lista los usuarios', assertFails(getDocs(collection(ali, 'usuarios'))));
  await prueba('no se da sedes nuevas a sí mismo', assertFails(setDoc(doc(ali, 'usuarios/ali1'), { concesionarios: ['C-EK', 'C-HJ', 'C-OTRO'] }, { merge: true })));

  // ── Los demás siguen igual ──
  await prueba('el personal interno lee cualquier resumen', assertSucceeds(getDoc(doc(emp, 'aliados_resumen/C-OTRO'))));
  await prueba('...y los puede listar', assertSucceeds(getDocs(collection(emp, 'aliados_resumen'))));
  await prueba('el administrador tampoco escribe resúmenes desde el navegador', assertFails(setDoc(doc(admin, 'aliados_resumen/C-EK'), { mes: { motos: 1 } })));
  await prueba('sin sesión no se lee nada', assertFails(getDoc(doc(nadie, 'aliados_resumen/C-EK'))));

  await env.cleanup();
  console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exit(1);
})().catch(e => { console.error('FALLA', e); process.exit(1); });
