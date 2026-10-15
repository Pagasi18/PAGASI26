// Reglas del vendedor de concesionario (15-oct-2026), probadas contra el EMULADOR oficial.
// Un "Vendedor Concesionario" solo lee y escribe clientes, creditos y motos de SUS sedes,
// sus solicitudes nacen y se quedan en pendiente_revision, y no ve pagos, movimientos,
// cuentas ni GPS. El personal interno y el cliente de Mi cuenta siguen igual.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, runTransaction } = require('firebase/firestore');

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
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Empleada', email: 'emp1@x.com', permisos: ['dash','clientes','creditos','pagos'], concesionarios: ['C1'] });
    await setDoc(doc(db, 'usuarios/vc1'), { rol: 'Vendedor Concesionario', nombre: 'Vendedor Bera', email: 'vc1@x.com', permisos: ['motos','clientes','creditos'], concesionarios: ['C1'] });
    await setDoc(doc(db, 'usuarios/vc0'), { rol: 'Vendedor Concesionario', nombre: 'Vendedor sin sede', email: 'vc0@x.com', permisos: ['motos'], concesionarios: [] });
    await setDoc(doc(db, 'concesionarios/C1'), { id: 'C1', nombre: 'BERA TRINIDAD', activo: true, anticipos: [{ monto: 10000 }] });
    await setDoc(doc(db, 'concesionarios/C2'), { id: 'C2', nombre: 'BERA Chacao', activo: true });
    await setDoc(doc(db, 'clientes/1'), { id: 1, nombre: 'CLIENTE DE C1', cedula: '1', concesionarioId: 'C1', estado: 'activo' });
    await setDoc(doc(db, 'clientes/2'), { id: 2, nombre: 'CLIENTE DE C2', cedula: '2', concesionarioId: 'C2', estado: 'activo' });
    await setDoc(doc(db, 'clientes/3'), { id: 3, nombre: 'CLIENTE VIEJO SIN SEDE', cedula: '3', estado: 'activo' });
    await setDoc(doc(db, 'creditos/CRED-1'), { id: 'CRED-1', cli: 'CLIENTE DE C1', clienteId: '1', concesionarioId: 'C1', estado: 'pendiente_revision', cuotaQ: 80 });
    await setDoc(doc(db, 'creditos/CRED-2'), { id: 'CRED-2', cli: 'CLIENTE DE C2', clienteId: '2', concesionarioId: 'C2', estado: 'activo', cuotaQ: 80 });
    await setDoc(doc(db, 'creditos/CRED-3'), { id: 'CRED-3', cli: 'CLIENTE DE C1', clienteId: '1', concesionarioId: 'C1', estado: 'activo', cuotaQ: 80 });
    await setDoc(doc(db, 'motos/10'), { id: 10, modelo: 'NEW HORSE 150', concesionarioId: 'C1', estado: 'disponible' });
    await setDoc(doc(db, 'motos/20'), { id: 20, modelo: 'LECHUZA II', concesionarioId: 'C2', estado: 'disponible' });
    await setDoc(doc(db, 'pagos/P1'), { id: 'P1', cred: 'CRED-1', monto: 100, estado: 'confirmado' });
    await setDoc(doc(db, 'movimientos/M1'), { id: 'M1', tipo: 'deposito', monto: 100, cuentaDestino: 'Binance' });
    await setDoc(doc(db, 'egresos/1'), { id: 1, monto: 50 });
    await setDoc(doc(db, 'facturas/F1'), { id: 'F1' });
    await setDoc(doc(db, 'gps/G1'), { id: 'G1', creditoId: 'CRED-1', imei: '1234' });
    await setDoc(doc(db, 'contadores/creditos'), { ultimo: 3 });
    await setDoc(doc(db, 'config/plan'), { apy: 600 });
    await setDoc(doc(db, 'config/catalogo'), { items: [] });
    await setDoc(doc(db, 'sesiones_cliente/cli1'), { clienteId: '1', via: 'sms' });
  });
  const vendedor = env.authenticatedContext('vc1', { email: 'vc1@x.com' }).firestore();
  const sinSede = env.authenticatedContext('vc0', { email: 'vc0@x.com' }).firestore();
  const empleada = env.authenticatedContext('emp1', { email: 'emp1@x.com' }).firestore();
  const cliente = env.authenticatedContext('cli1').firestore();
  const lista = (db, col, sedes, campo) => getDocs(query(collection(db, col), where(campo || 'concesionarioId', 'in', sedes)));

  // ── Lo suyo sí ──
  await prueba('lee un cliente de su sede', assertSucceeds(getDoc(doc(vendedor, 'clientes/1'))));
  await prueba('lista los clientes de su sede (consulta filtrada por sede)', assertSucceeds(lista(vendedor, 'clientes', ['C1'])));
  await prueba('lista los creditos de su sede', assertSucceeds(lista(vendedor, 'creditos', ['C1'])));
  await prueba('lista las motos de su sede', assertSucceeds(lista(vendedor, 'motos', ['C1'])));
  await prueba('lee su concesionario (consulta por id)', assertSucceeds(lista(vendedor, 'concesionarios', ['C1'], 'id')));
  await prueba('lee la configuracion del plan y el catalogo', assertSucceeds(getDoc(doc(vendedor, 'config/plan'))));
  await prueba('crea un cliente de su sede', assertSucceeds(setDoc(doc(vendedor, 'clientes/4'), { id: 4, nombre: 'NUEVO', cedula: '4', concesionarioId: 'C1', estado: 'activo' })));
  await prueba('crea una solicitud de su sede en pendiente_revision', assertSucceeds(setDoc(doc(vendedor, 'creditos/CRED-4'), { id: 'CRED-4', cli: 'NUEVO', clienteId: '4', concesionarioId: 'C1', estado: 'pendiente_revision', cuotaQ: 80 })));
  await prueba('crea la moto de esa venta en su sede', assertSucceeds(setDoc(doc(vendedor, 'motos/30'), { id: 30, modelo: 'NEW HORSE 150', concesionarioId: 'C1', estado: 'financiada' })));
  await prueba('edita su solicitud mientras sigue pendiente', assertSucceeds(updateDoc(doc(vendedor, 'creditos/CRED-1'), { cuotaQ: 85 })));
  await prueba('reserva un numero en el contador (transaccion)', assertSucceeds(runTransaction(vendedor, async tx => { const d = await tx.get(doc(vendedor, 'contadores/creditos')); tx.set(doc(vendedor, 'contadores/creditos'), { ultimo: (d.data().ultimo || 0) + 1 }, { merge: true }); })));
  await prueba('lee un numero de credito que no existe (el candado de crearCred)', assertSucceeds(getDoc(doc(vendedor, 'creditos/CRED-999'))));
  await prueba('escribe en la bitacora', assertSucceeds(setDoc(doc(vendedor, 'logs/L1'), { accion: 'x' })));

  // ── Lo ajeno no ──
  await prueba('NO lee un cliente de otra sede', assertFails(getDoc(doc(vendedor, 'clientes/2'))));
  await prueba('NO lee un cliente viejo sin sede', assertFails(getDoc(doc(vendedor, 'clientes/3'))));
  await prueba('NO lista todos los clientes (consulta sin filtro)', assertFails(getDocs(collection(vendedor, 'clientes'))));
  await prueba('NO lista los clientes de otra sede', assertFails(lista(vendedor, 'clientes', ['C2'])));
  await prueba('NO lista mezclando su sede con otra', assertFails(lista(vendedor, 'creditos', ['C1', 'C2'])));
  await prueba('NO lee un credito de otra sede', assertFails(getDoc(doc(vendedor, 'creditos/CRED-2'))));
  await prueba('NO lista todos los creditos', assertFails(getDocs(collection(vendedor, 'creditos'))));
  await prueba('NO lee motos de otra sede', assertFails(getDoc(doc(vendedor, 'motos/20'))));
  await prueba('NO lee el concesionario de otro', assertFails(getDoc(doc(vendedor, 'concesionarios/C2'))));
  await prueba('NO lista todos los concesionarios', assertFails(getDocs(collection(vendedor, 'concesionarios'))));
  await prueba('NO lee pagos', assertFails(getDoc(doc(vendedor, 'pagos/P1'))));
  await prueba('NO lista pagos', assertFails(getDocs(collection(vendedor, 'pagos'))));
  await prueba('NO lee movimientos de cuentas', assertFails(getDocs(collection(vendedor, 'movimientos'))));
  await prueba('NO lee gastos', assertFails(getDocs(collection(vendedor, 'egresos'))));
  await prueba('NO lee facturas', assertFails(getDocs(collection(vendedor, 'facturas'))));
  await prueba('NO lee el GPS', assertFails(getDoc(doc(vendedor, 'gps/G1'))));
  await prueba('NO lista los usuarios (solo su ficha)', assertFails(getDocs(collection(vendedor, 'usuarios'))));
  await prueba('...su ficha si', assertSucceeds(getDoc(doc(vendedor, 'usuarios/vc1'))));
  await prueba('NO lista las sesiones de Mi cuenta', assertFails(getDocs(collection(vendedor, 'sesiones_cliente'))));
  await prueba('NO crea un cliente en otra sede', assertFails(setDoc(doc(vendedor, 'clientes/5'), { id: 5, nombre: 'X', cedula: '5', concesionarioId: 'C2', estado: 'activo' })));
  await prueba('NO crea un cliente sin sede', assertFails(setDoc(doc(vendedor, 'clientes/6'), { id: 6, nombre: 'X', cedula: '6', estado: 'activo' })));
  await prueba('NO crea un credito activo (se salta la aprobacion)', assertFails(setDoc(doc(vendedor, 'creditos/CRED-5'), { id: 'CRED-5', cli: 'X', clienteId: '4', concesionarioId: 'C1', estado: 'activo', cuotaQ: 80 })));
  await prueba('NO crea un credito en otra sede', assertFails(setDoc(doc(vendedor, 'creditos/CRED-6'), { id: 'CRED-6', cli: 'X', clienteId: '4', concesionarioId: 'C2', estado: 'pendiente_revision', cuotaQ: 80 })));
  await prueba('NO se aprueba a si mismo (pendiente -> activo)', assertFails(updateDoc(doc(vendedor, 'creditos/CRED-1'), { estado: 'activo' })));
  await prueba('NO edita un credito activo de su sede', assertFails(updateDoc(doc(vendedor, 'creditos/CRED-3'), { cuotaQ: 1 })));
  await prueba('NO mueve su cliente a otra sede', assertFails(updateDoc(doc(vendedor, 'clientes/1'), { concesionarioId: 'C2' })));
  await prueba('NO registra pagos', assertFails(setDoc(doc(vendedor, 'pagos/P2'), { id: 'P2', cred: 'CRED-1', monto: 1 })));
  await prueba('NO crea movimientos de dinero', assertFails(setDoc(doc(vendedor, 'movimientos/M2'), { id: 'M2', tipo: 'deposito', monto: 1 })));
  await prueba('NO escribe el catalogo de modelos (config/catalogo)', assertFails(updateDoc(doc(vendedor, 'config/catalogo'), { items: [{ modelo: 'X' }] })));
  await prueba('NO toca el concesionario (anticipos)', assertFails(updateDoc(doc(vendedor, 'concesionarios/C1'), { anticipos: [] })));
  await prueba('un vendedor sin sedes asignadas no ve ningun cliente', assertFails(getDoc(doc(sinSede, 'clientes/1'))));

  // ── El personal interno y el cliente siguen igual ──
  await prueba('la empleada lista todos los clientes', assertSucceeds(getDocs(collection(empleada, 'clientes'))));
  await prueba('la empleada lee pagos y movimientos', assertSucceeds(getDocs(collection(empleada, 'pagos'))));
  await prueba('la empleada lee el credito de cualquier sede', assertSucceeds(getDoc(doc(empleada, 'creditos/CRED-2'))));
  await prueba('la empleada aprueba (pendiente -> activo)', assertSucceeds(updateDoc(doc(empleada, 'creditos/CRED-1'), { estado: 'activo' })));
  await prueba('la empleada escribe el catalogo de modelos', assertSucceeds(updateDoc(doc(empleada, 'config/catalogo'), { items: [] })));
  await prueba('el cliente de Mi cuenta lee su ficha', assertSucceeds(getDoc(doc(cliente, 'clientes/1'))));
  await prueba('el cliente lee sus creditos', assertSucceeds(getDoc(doc(cliente, 'creditos/CRED-1'))));
  await prueba('el cliente NO lee otro cliente', assertFails(getDoc(doc(cliente, 'clientes/2'))));

  await env.cleanup();
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA ' + (e && e.stack || e)); process.exitCode = 1; });
