// Reglas de Firestore de los puntos 1 y 2 (lista del 18-sep-2026), probadas contra
// el EMULADOR oficial (no simuladas). Corre en GitHub Actions (reglas-probar.yml).
//  1) El formulario publico (sesion anonima) solo crea un lead con los campos del
//     formulario, de su tipo y SIN caracteres con los que se mete codigo en el panel.
//  2) Al aceptar una invitacion el rol y los permisos son los de la invitacion, una
//     invitacion usada no sirve, y nadie se cambia a si mismo permisos, sedes,
//     comisiones ni la suspension.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, getDocs, collection } = require('firebase/firestore');

let pass = 0, fail = 0;
async function prueba(nombre, promesa) {
  try { await promesa; pass++; console.log('OK    ' + nombre); }
  catch (e) { fail++; console.log('FALLA ' + nombre + '\n        → ' + String(e && e.message || e).split('\n')[0]); }
}
// Un lead tal cual lo arma buildClientePayload() del formulario (74 campos)
const LEAD = {"id": "WEB-1789798989431", "nombre": "JOSE PEREZ", "cedula": "V-12345678", "rif": "", "nacionalidad": "", "tel": "04141234567", "wa": "04141234567", "email": "jose@correo.com", "ciudad": "Prueba", "estado_ubi": "Prueba", "dir": "Prueba", "tiempo_dir": "Prueba", "vivienda": "Prueba", "terremoto_afectado": "Prueba", "terremoto_danos": "", "trabajo": "Prueba", "empresa": "Prueba", "cargo": "Prueba", "dir_trabajo": "", "tel_trabajo": "", "antiguedad": "Prueba", "ingreso": 300, "ingreso_familiar": 300, "remesas": "Prueba", "dependientes": 0, "historial": "Prueba", "deudas": "Prueba", "banco_estado": "Prueba", "banco_nombre": "Prueba", "banco_cobro": "Prueba", "cuenta_digitos": "Prueba", "ahorro": "Prueba", "cashea": "Prueba", "cashea_nivel": "Prueba", "cashea_pago": "Prueba", "cashea_estado": "", "cashea_deuda": "no", "cashea_monto": 0, "cashea_cuotas_pend": 0, "cashea_ultimo_art": "", "cashea_ultimo_monto": 0, "cashea_ultima_fecha": "", "cashea_total_compras": "", "cashea_obs": "", "fiador": "Prueba", "fiador_nom": "Prueba", "fiador_tel": "Prueba", "fiador_ci": "Prueba", "fiador_rif": "", "fiador_dir": "", "fiador_email": "", "fiador_rel": "Prueba", "ref1": {"nom": "MARIA", "ci": "", "tel": "04241234567", "rel": "Hermana", "obs": "Vive cerca"}, "ref2": {"nom": "PEDRO", "ci": "", "tel": "04121234567", "rel": "Amigo", "obs": ""}, "docs_count": 0, "documentos": [], "impresion": "", "notas": "Lead web sin moto específica", "conocio": "Prueba", "score_indexa": 600, "f1": 1, "f2": 2, "f3": 3, "f4": 4, "f5": 5, "moto_interes_id": null, "moto_interes_modelo": "", "moto_interes_precio": 0, "moto_interes_sede": "", "estado": "lead", "origen": "web", "creado": "2026-09-19T06:23:09.430Z", "editadoEn": "2026-09-19T06:23:09.430Z", "editadoPor": "Lead web"};
const lead = (id, cambios) => Object.assign({}, LEAD, { id }, cambios || {});

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-pagasi',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Admin' });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Empleado', email: 'emp1@x.com', permisos: ['dash'], concesionarios: ['C1'], suspendido: false });
    await setDoc(doc(db, 'usuarios/susp1'), { rol: 'Empleado', nombre: 'Suspendido', email: 'susp1@x.com', permisos: ['dash'], suspendido: true });
    await setDoc(doc(db, 'invitaciones/INV-1'), { token: 'INV-1', email: 'nuevo@x.com', rol: 'Cobrador', permisos: ['dash', 'cobranza'], usado: false });
    await setDoc(doc(db, 'invitaciones/INV-USADA'), { token: 'INV-USADA', email: 'ex@x.com', rol: 'Vendedor', permisos: ['dash'], usado: true, uid: 'u-ex-viejo' });
    await setDoc(doc(db, 'invitaciones/INV-VIEJA'), { token: 'INV-VIEJA', email: 'viejo@x.com', rol: 'Empleado', usado: false });
  });
  const anonimo = env.authenticatedContext('anon1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const nadie = env.unauthenticatedContext().firestore();
  const admin = env.authenticatedContext('admin1').firestore();
  const empleado = env.authenticatedContext('emp1', { email: 'emp1@x.com' }).firestore();
  const suspendido = env.authenticatedContext('susp1', { email: 'susp1@x.com' }).firestore();
  const nuevo = env.authenticatedContext('u-nuevo', { email: 'nuevo@x.com' }).firestore();
  const ex = env.authenticatedContext('u-ex', { email: 'ex@x.com' }).firestore();
  const viejo = env.authenticatedContext('u-viejo', { email: 'viejo@x.com' }).firestore();
  let n = 1789736201000;
  const nid = () => 'WEB-' + (n++);

  // ── Punto 1: el lead de la web ──
  let id = nid();
  await prueba('el formulario web crea su lead (los 74 campos, valores normales)', assertSucceeds(setDoc(doc(anonimo, 'clientes/' + id), lead(id))));
  id = nid(); await prueba('nombre con HTML (<img onerror>) → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { nombre: '<img src=x onerror=alert(1)>' }))));
  id = nid(); await prueba('comillas dobles para salir de un atributo → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { ciudad: 'Caracas" onmouseover="alert(1)' }))));
  id = nid(); await prueba("comilla simple → rechazado", assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { empresa: "x');alert(1);('" }))));
  id = nid(); await prueba('& (entidades como &#39;) → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { tel: '&#39;);alert(1)//' }))));
  id = nid(); await prueba('campo extra que el formulario no manda → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { rol: 'Administrador' }))));
  id = nid(); await prueba('un numero que llega como texto → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { ingreso: '<b>500</b>' }))));
  id = nid(); await prueba('referencia con HTML → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { ref1: { nom: '<script>x</script>', ci: '', tel: '', rel: '', obs: '' } }))));
  id = nid(); await prueba('referencia con un campo extra → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { ref2: { nom: 'A', ci: '', tel: '', rel: '', obs: '', x: 1 } }))));
  id = nid(); await prueba('documentos cargados desde la web → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { documentos: [{ url: 'x' }] }))));
  id = nid(); await prueba('texto larguisimo (mas de 4.000 letras en total) → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { notas: 'a'.repeat(5000) }))));
  id = nid(); await prueba('nombre de mas de 120 letras → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { nombre: 'A'.repeat(121) }))));
  id = nid(); await prueba('lead que se dice "activo" → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { estado: 'activo' }))));
  await prueba('lead con un numero de ficha que no es WEB-… → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/CLI-1'), lead('CLI-1'))));
  // Punto 21: la ficha de un lead nuevo se llama WEB-<cedula>, asi la base impide el duplicado
  await prueba('lead con el numero de la cedula (WEB-12345678) → entra', assertSucceeds(setDoc(doc(anonimo, 'clientes/WEB-12345678'), lead('WEB-12345678'))));
  await prueba('la MISMA cedula otra vez → rechazado (ya existe la ficha)', assertFails(setDoc(doc(anonimo, 'clientes/WEB-12345678'), lead('WEB-12345678', { nombre: 'OTRO NOMBRE' }))));
  await prueba('un numero de ficha demasiado corto → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/WEB-123'), lead('WEB-123'))));
  id = nid(); await prueba('el id de adentro distinto al de la ficha → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead('WEB-1111111111111'))));
  id = nid(); await prueba('sin nombre → rechazado', assertFails(setDoc(doc(anonimo, 'clientes/' + id), lead(id, { nombre: '' }))));
  id = nid(); await prueba('sin sesion → rechazado', assertFails(setDoc(doc(nadie, 'clientes/' + id), lead(id))));
  await prueba('la sesion anonima sigue sin poder leer clientes', assertFails(getDocs(collection(anonimo, 'clientes'))));
  await prueba('un empleado sigue creando clientes como siempre', assertSucceeds(setDoc(doc(empleado, 'clientes/CLI-77'), { id: 'CLI-77', nombre: 'CLIENTE', estado: 'activo', cualquierCampo: 1 })));

  // ── Punto 2: aceptar invitaciones ──
  const ficha = (uid, email, tok, extra) => Object.assign({ uid, email, nombre: 'Nuevo', inviteToken: tok, inviteStatus: 'aceptada', inviteAcceptedAt: '2026-09-19T12:00:00Z', debeActualizar: false }, extra);
  await prueba('invitado como Cobrador que se pone Administrador → rechazado',
    assertFails(setDoc(doc(nuevo, 'usuarios/u-nuevo'), ficha('u-nuevo', 'nuevo@x.com', 'INV-1', { rol: 'Administrador', permisos: ['dash', 'cobranza'] }))));
  await prueba('invitado que se agrega permisos (users, config) → rechazado',
    assertFails(setDoc(doc(nuevo, 'usuarios/u-nuevo'), ficha('u-nuevo', 'nuevo@x.com', 'INV-1', { rol: 'Cobrador', permisos: ['dash', 'cobranza', 'users', 'config'] }))));
  await prueba('invitado que se asigna sedes → rechazado',
    assertFails(setDoc(doc(nuevo, 'usuarios/u-nuevo'), ficha('u-nuevo', 'nuevo@x.com', 'INV-1', { rol: 'Cobrador', permisos: ['dash', 'cobranza'], concesionarios: ['C1', 'C2'] }))));
  await prueba('invitado con el rol y los permisos de su invitacion → entra',
    assertSucceeds(setDoc(doc(nuevo, 'usuarios/u-nuevo'), ficha('u-nuevo', 'nuevo@x.com', 'INV-1', { rol: 'Cobrador', permisos: ['dash', 'cobranza'] }))));
  await prueba('...y puede marcar su invitacion como usada',
    assertSucceeds(updateDoc(doc(nuevo, 'invitaciones/INV-1'), { usado: true, uid: 'u-nuevo', fechaUso: '2026-09-19T12:00:00Z' })));
  await prueba('exempleado con su link viejo (invitacion usada) → rechazado aunque use su rol',
    assertFails(setDoc(doc(ex, 'usuarios/u-ex'), ficha('u-ex', 'ex@x.com', 'INV-USADA', { rol: 'Vendedor', permisos: ['dash'] }))));
  await prueba('invitacion vieja sin permisos: entra con permisos vacios',
    assertSucceeds(setDoc(doc(viejo, 'usuarios/u-viejo'), ficha('u-viejo', 'viejo@x.com', 'INV-VIEJA', { rol: 'Empleado', permisos: [] }))));

  // ── Punto 2: la ficha propia ──
  await prueba('un empleado edita su perfil y su ultimo acceso', assertSucceeds(updateDoc(doc(empleado, 'usuarios/emp1'), { nombre: 'Empleado Uno', tel: '0414', lastLogin: '2026-09-19T12:00:00Z' })));
  await prueba('...pero NO se da permisos', assertFails(updateDoc(doc(empleado, 'usuarios/emp1'), { permisos: ['dash', 'users', 'config', 'perm_delete'] })));
  await prueba('...ni se agrega sedes', assertFails(updateDoc(doc(empleado, 'usuarios/emp1'), { concesionarios: ['C1', 'C2', 'C3'] })));
  await prueba('...ni se sube la comision', assertFails(updateDoc(doc(empleado, 'usuarios/emp1'), { comisiones: { pct: 50 } })));
  await prueba('...ni se cambia el rol (como antes)', assertFails(updateDoc(doc(empleado, 'usuarios/emp1'), { rol: 'Administrador' })));
  await prueba('un suspendido NO se quita la suspension', assertFails(updateDoc(doc(suspendido, 'usuarios/susp1'), { suspendido: false })));
  await prueba('el admin si cambia permisos, sedes y suspension',
    assertSucceeds(updateDoc(doc(admin, 'usuarios/emp1'), { permisos: ['dash', 'cobranza'], concesionarios: ['C2'], suspendido: true })));

  // ── Punto 9: configuracion y anulaciones ──
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/ger1'), { rol: 'Gerente', nombre: 'Gerente', email: 'ger1@x.com', permisos: ['dash','cobranza','reportes','cuentas'] });
    await setDoc(doc(db, 'usuarios/cob1'), { rol: 'Cobrador', nombre: 'Cobrador', email: 'cob1@x.com', permisos: ['dash','cobranza','pagos'] });
    await setDoc(doc(db, 'config/plan'), { factor: 1.9, diasGracia: 5 });
    await setDoc(doc(db, 'config/tasa'), { tasaBs: 40 });
    await setDoc(doc(db, 'config/cuentasBanc'), { lista: [{ nombre: 'Binance' }] });
    await setDoc(doc(db, 'config/coromoto'), { ajustes: [] });
    await setDoc(doc(db, 'egresos/EG-1'), { id: 'EG-1', concepto: 'Alquiler', monto: 100, eliminado: false });
    await setDoc(doc(db, 'movimientos/MOV-1'), { id: 'MOV-1', tipo: 'retiro', monto: 100, cuentaOrigen: 'Binance', eliminado: false });
    await setDoc(doc(db, 'pagos/PAG-1'), { id: 'PAG-1', cred: 'CRED-1', monto: 50, estado: 'confirmado', eliminado: false });
    await setDoc(doc(db, 'motos/M-1'), { id: 'M-1', modelo: 'MOTO', estado: 'disponible', eliminado: false });
    await setDoc(doc(db, 'creditos/CRED-1'), { id: 'CRED-1', cli: 'X', estado: 'activo' });
  });
  const gerente = env.authenticatedContext('ger1', { email: 'ger1@x.com' }).firestore();
  const cobrador = env.authenticatedContext('cob1', { email: 'cob1@x.com' }).firestore();

  await prueba('un cobrador NO cambia el plan (factor, días de gracia)', assertFails(updateDoc(doc(cobrador, 'config/plan'), { factor: 1.2 })));
  await prueba('un gerente tampoco', assertFails(updateDoc(doc(gerente, 'config/plan'), { factor: 1.2 })));
  await prueba('el admin sí', assertSucceeds(updateDoc(doc(admin, 'config/plan'), { factor: 1.95 })));
  await prueba('un cobrador NO cambia las cuentas bancarias', assertFails(updateDoc(doc(cobrador, 'config/cuentasBanc'), { lista: [] })));
  await prueba('la tasa del día la sigue actualizando cualquier empleado', assertSucceeds(updateDoc(doc(cobrador, 'config/tasa'), { tasaBs: 41 })));
  await prueba('los ajustes contables los toca quien ve Reportes (gerente)', assertSucceeds(updateDoc(doc(gerente, 'config/coromoto'), { ajustes: [{ id: 'a1' }] })));
  await prueba('...pero un cobrador no', assertFails(updateDoc(doc(cobrador, 'config/coromoto'), { ajustes: [] })));

  await prueba('un empleado sin permiso de eliminar NO anula un gasto', assertFails(updateDoc(doc(gerente, 'egresos/EG-1'), { eliminado: true })));
  await prueba('...ni un movimiento de cuenta', assertFails(updateDoc(doc(gerente, 'movimientos/MOV-1'), { eliminado: true })));
  await prueba('...ni un pago', assertFails(updateDoc(doc(cobrador, 'pagos/PAG-1'), { eliminado: true })));
  await prueba('pero sí puede editar un gasto sin anularlo', assertSucceeds(updateDoc(doc(gerente, 'egresos/EG-1'), { concepto: 'Alquiler oficina' })));
  await prueba('y el admin sí anula', assertSucceeds(updateDoc(doc(admin, 'egresos/EG-1'), { eliminado: true, eliminadoPor: 'Admin' })));
  await prueba('...y también revive lo anulado', assertSucceeds(updateDoc(doc(admin, 'egresos/EG-1'), { eliminado: false })));
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'movimientos/MOV-2'), { id: 'MOV-2', tipo: 'retiro', monto: 100, eliminado: true }); });
  await prueba('un empleado sin permiso tampoco revive lo anulado',
    assertFails(updateDoc(doc(gerente, 'movimientos/MOV-2'), { eliminado: false })));
  // Suspendido: la ficha existe pero ya no entra a nada
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'usuarios/susp1'), { rol: 'Empleado', nombre: 'Suspendido', email: 'susp1@x.com', permisos: ['dash'], suspendido: true }); });
  await prueba('un usuario suspendido ya no lee la base', assertFails(getDoc(doc(suspendido, 'creditos/CRED-1'))));
  await prueba('...ni escribe', assertFails(setDoc(doc(suspendido, 'clientes/CLI-99'), { id: 'CLI-99', nombre: 'X' })));
  // El catálogo y los planes los usa el vendedor desde el wizard
  await prueba('un vendedor puede agregar un modelo al catálogo', assertSucceeds(setDoc(doc(cobrador, 'config/catalogo'), { lista: [{ id: 1, modelo: 'NUEVA 150', precio: 1200 }] })));
  await prueba('...y guardar un plan nuevo', assertSucceeds(setDoc(doc(cobrador, 'config/planes'), { lista: [] })));
  await prueba('pero NO el destino de los avisos de Telegram', assertFails(setDoc(doc(cobrador, 'config/avisosTelegram'), { chat: '123' })));
  await prueba('...ni la configuración del GPS entera', assertFails(setDoc(doc(cobrador, 'config/gps'), { workerUrl: 'http://x' })));
  await prueba('una moto no se anula sin permiso de eliminar', assertFails(updateDoc(doc(gerente, 'motos/M-1'), { eliminado: true })));

  await env.cleanup();
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR ' + (e && e.message || e)); process.exit(1); });
