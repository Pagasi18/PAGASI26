// Reglas de Firestore del GPS en Mi cuenta, probadas contra el EMULADOR oficial
// (no simuladas): el cliente ve solo su ficha, no puede leer /gps, y su pedido
// de "Actualizar ubicacion" se rechaza si ya pidio en la ultima hora.
// Corre en GitHub Actions (workflow reglas-probar.yml): aqui no hay Java.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp, Timestamp } = require('firebase/firestore');

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

  // Datos de base, con las reglas apagadas
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Admin' });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Empleado' });
    await setDoc(doc(db, 'sesiones_cliente/cli1'), { clienteId: 'CLI-1', via: 'sms', telE164: '+584140000001', creadoEn: 'x' });
    await setDoc(doc(db, 'sesiones_cliente/cli2'), { clienteId: 'CLI-2', via: 'sms', telE164: '+584140000002', creadoEn: 'x' });
    await setDoc(doc(db, 'creditos/CRED-523'), { id: 'CRED-523', clienteId: 'CLI-1' });
    await setDoc(doc(db, 'creditos/CRED-524'), { id: 'CRED-524', clienteId: 'CLI-1' });   // sin GPS activo
    await setDoc(doc(db, 'creditos/CRED-999'), { id: 'CRED-999', clienteId: 'CLI-2' });
    await setDoc(doc(db, 'gps/G1'), { idGps: '123', creditoId: 'CRED-523', pass: '123456', imei: '8665', lat: 10.4, lng: -66.8 });
    await setDoc(doc(db, 'ubicacion_cliente/CRED-523'), { credId: 'CRED-523', lat: 10.4, lng: -66.8, ultimaSenal: '2026-09-14 12:00:00' });
    await setDoc(doc(db, 'ubicacion_cliente/CRED-999'), { credId: 'CRED-999', lat: 10.5, lng: -66.9, ultimaSenal: '2026-09-14 12:00:00' });
  });

  const cliente = env.authenticatedContext('cli1').firestore();
  const otroCliente = env.authenticatedContext('cli2').firestore();
  const admin = env.authenticatedContext('admin1').firestore();
  const empleado = env.authenticatedContext('emp1').firestore();
  const nadie = env.unauthenticatedContext().firestore();

  // ── Ficha de ubicación ──
  await prueba('el cliente ve la ficha de SU crédito', assertSucceeds(getDoc(doc(cliente, 'ubicacion_cliente/CRED-523'))));
  await prueba('el cliente NO ve la ficha del crédito de otro', assertFails(getDoc(doc(cliente, 'ubicacion_cliente/CRED-999'))));
  await prueba('el cliente NO puede listar las fichas', assertFails(getDocs(collection(cliente, 'ubicacion_cliente'))));
  await prueba('el cliente NO puede escribir su ficha', assertFails(setDoc(doc(cliente, 'ubicacion_cliente/CRED-523'), { credId: 'CRED-523', lat: 0, lng: 0 })));
  await prueba('el cliente NO puede borrar su ficha', assertFails(deleteDoc(doc(cliente, 'ubicacion_cliente/CRED-523'))));
  await prueba('sin sesión no se ve ninguna ficha', assertFails(getDoc(doc(nadie, 'ubicacion_cliente/CRED-523'))));
  await prueba('el cliente sigue SIN poder leer /gps (clave del equipo)', assertFails(getDoc(doc(cliente, 'gps/G1'))));
  await prueba('el admin ve cualquier ficha', assertSucceeds(getDoc(doc(admin, 'ubicacion_cliente/CRED-999'))));
  await prueba('el admin puede activar (crear) una ficha', assertSucceeds(setDoc(doc(admin, 'ubicacion_cliente/CRED-524'), { credId: 'CRED-524', lat: 1, lng: 2 })));
  await prueba('el admin puede desactivar (borrar) una ficha', assertSucceeds(deleteDoc(doc(admin, 'ubicacion_cliente/CRED-524'))));
  await prueba('un empleado también ve las fichas (es staff)', assertSucceeds(getDoc(doc(empleado, 'ubicacion_cliente/CRED-523'))));

  // ── Pedido de "Actualizar ubicación" ──
  await prueba('el cliente puede pedir actualizar SU moto', assertSucceeds(setDoc(doc(cliente, 'pedidos_gps/CRED-523'), { pedidoEn: serverTimestamp() })));
  await prueba('...pero NO otra vez en la misma hora', assertFails(setDoc(doc(cliente, 'pedidos_gps/CRED-523'), { pedidoEn: serverTimestamp() })));
  await prueba('el cliente ve su pedido (para mostrar cuándo puede volver)', assertSucceeds(getDoc(doc(cliente, 'pedidos_gps/CRED-523'))));
  await prueba('el cliente NO puede pedir por el crédito de otro', assertFails(setDoc(doc(cliente, 'pedidos_gps/CRED-999'), { pedidoEn: serverTimestamp() })));
  await prueba('el cliente NO puede pedir si su GPS no está activo', assertFails(setDoc(doc(cliente, 'pedidos_gps/CRED-524'), { pedidoEn: serverTimestamp() })));
  await prueba('NO se puede poner una hora inventada', assertFails(setDoc(doc(otroCliente, 'pedidos_gps/CRED-999'), { pedidoEn: Timestamp.fromMillis(Date.now() - 5 * 3600e3) })));
  await prueba('NO se pueden meter otros campos', assertFails(setDoc(doc(otroCliente, 'pedidos_gps/CRED-999'), { pedidoEn: serverTimestamp(), extra: '<b>x</b>' })));
  await prueba('sin sesión no se puede pedir', assertFails(setDoc(doc(nadie, 'pedidos_gps/CRED-523'), { pedidoEn: serverTimestamp() })));

  // Pasó más de una hora desde el último pedido: se puede otra vez
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'pedidos_gps/CRED-523'), { pedidoEn: Timestamp.fromMillis(Date.now() - 2 * 3600e3) });
  });
  await prueba('pasada la hora, el cliente puede pedir de nuevo', assertSucceeds(setDoc(doc(cliente, 'pedidos_gps/CRED-523'), { pedidoEn: serverTimestamp() })));
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'pedidos_gps/CRED-523'), { pedidoEn: Timestamp.fromMillis(Date.now() - 50 * 60e3) });
  });
  await prueba('a los 50 minutos todavía NO', assertFails(setDoc(doc(cliente, 'pedidos_gps/CRED-523'), { pedidoEn: serverTimestamp() })));
  await prueba('el staff puede pedir cuando quiera', assertSucceeds(setDoc(doc(admin, 'pedidos_gps/CRED-523'), { pedidoEn: serverTimestamp() })));
  await prueba('el cliente NO puede listar pedidos', assertFails(getDocs(collection(cliente, 'pedidos_gps'))));
  await prueba('el cliente NO puede borrar su pedido (para saltarse la hora)', assertFails(deleteDoc(doc(cliente, 'pedidos_gps/CRED-523'))));

  // ── Lo de antes sigue igual ──
  await prueba('el cliente sigue viendo su crédito', assertSucceeds(getDoc(doc(cliente, 'creditos/CRED-523'))));
  await prueba('el cliente sigue sin ver el crédito de otro', assertFails(getDoc(doc(cliente, 'creditos/CRED-999'))));

  await env.cleanup();
  console.log('\nRESULTADO ok=' + pass + ' fallas=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FALLA la prueba no pudo correr: ' + e.message); process.exit(1); });
