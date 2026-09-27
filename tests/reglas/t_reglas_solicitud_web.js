// Reglas de Firestore de la solicitud web POR PARTES (27-sep-2026), probadas contra el
// EMULADOR oficial (no simuladas). Corre en GitHub Actions (reglas-probar.yml, a mano):
// en la Mac no hay Java. Solo de PAGASI 26: preparar-clon-26.sh lo conserva.
//  · Crear (esLeadWeb): solo la parte 1, sesion anonima, web_uid de ESA sesion, web_ts
//    del servidor, cedula amarrada al id, y en UN lote con el marcador web_sesiones/{uid}
//    (una solicitud por sesion). Nada de notas, score, impresion, obs ni documentos.
//  · Completar (esLeadWebEditando): la misma sesion, las veces que haga falta, solo los
//    campos de las partes 2 a 9 con sus valores cerrados, mientras el lead siga abierto
//    (sin web_cerrado, sin web_fin, sin eliminar, dentro de 7 dias de web_ts).
//  · El equipo sigue igual.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch, serverTimestamp, increment, deleteField, Timestamp } = require('firebase/firestore');

let pass = 0, fail = 0;
async function prueba(nombre, promesa) {
  try { await promesa; pass++; console.log('OK    ' + nombre); }
  catch (e) { fail++; console.log('FALLA ' + nombre + '\n        → ' + String(e && e.message || e).split('\n')[0]); }
}
// La parte 1 tal cual la arma buildClientePayload() de assets/public/request.js
const lead = (ci, uid, cambios) => Object.assign({
  id: 'WEB-' + ci, nombre: 'Carlos Pérez', cedula: 'V-' + ci, tel: '0414-1234567', wa: '0414-1234567',
  trabajo: 'delivery', ingreso: 400, ingreso_rango: '$300 a $500', estado_ubi: 'Miranda',
  moto_interes_id: 1, moto_interes_modelo: 'NEW HORSE 150', moto_interes_precio: 1320, moto_interes_sede: 'EK Bello Monte',
  estado: 'lead', origen: 'web', creado: '2026-09-27T10:00:00.000Z', editadoEn: '2026-09-27T10:00:00.000Z',
  editadoPor: 'Solicitud web', web_uid: uid, web_ts: serverTimestamp(), web_paso: 1
}, cambios || {});
const sin = (o, k) => { const c = Object.assign({}, o); delete c[k]; return c; };
// El lote de la parte 1: el lead y el marcador de la sesion
function crear(db, uid, datos, leadIdMarca) {
  const b = writeBatch(db);
  b.set(doc(db, 'clientes/' + datos.id), datos);
  b.set(doc(db, 'web_sesiones/' + uid), { leadId: leadIdMarca || datos.id, ts: serverTimestamp() });
  return b.commit();
}
// Lo que acompaña a cada parte: web_paso, web_act (hora del servidor), web_n (+1) y editadoEn
const meta = (paso, extra) => Object.assign({ web_paso: paso, web_act: serverTimestamp(), web_n: increment(1), editadoEn: new Date().toISOString() }, extra || {});

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-pagasi',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  const anon = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const hace = dias => Timestamp.fromMillis(Date.now() - dias * 86400000);
  // Fichas que ya existen, puestas con las reglas apagadas
  const abierto = (ci, uid, extra) => Object.assign(lead(ci, uid), { web_ts: Timestamp.now(), web_n: 0 }, extra || {});
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Admin' });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Empleado', email: 'emp1@x.com', permisos: ['dash', 'clientes'] });
    await setDoc(doc(db, 'usuarios/susp1'), { rol: 'Empleado', nombre: 'Suspendido', email: 'susp1@x.com', permisos: ['dash'], suspendido: true });
    await setDoc(doc(db, 'clientes/WEB-30000001'), abierto('30000001', 'anonCerrado', { web_cerrado: true, web_cerrado_por: 'Samantha' }));
    await setDoc(doc(db, 'clientes/WEB-30000002'), abierto('30000002', 'anonVencido', { web_ts: hace(8) }));
    await setDoc(doc(db, 'clientes/WEB-30000003'), abierto('30000003', 'anonEliminado', { eliminado: true }));
    await setDoc(doc(db, 'clientes/WEB-30000004'), abierto('30000004', 'anonObs', { ref1: { nom: 'Maria', ci: '', tel: '0424-1112233', rel: 'Amigo/a', obs: 'Llamada: la conoce hace 10 años' } }));
    await setDoc(doc(db, 'clientes/WEB-30000005'), abierto('30000005', 'anonTope', { web_n: 80 }));
    await setDoc(doc(db, 'clientes/WEB-30000006'), abierto('30000006', 'anonDias', { web_ts: hace(6) }));
    // Un lead del formulario de antes: sin web_uid ni web_ts
    await setDoc(doc(db, 'clientes/WEB-1789798989431'), { id: 'WEB-1789798989431', nombre: 'LEAD VIEJO', cedula: 'V-1111111', tel: '04141234567', estado: 'lead', origen: 'web', notas: 'Solicitud web' });
  });
  const A = anon('anonA');
  const nadie = env.unauthenticatedContext().firestore();
  const sms = env.authenticatedContext('sms1', { firebase: { sign_in_provider: 'phone' }, phone_number: '+584141234567' }).firestore();
  const empleado = env.authenticatedContext('emp1', { email: 'emp1@x.com' }).firestore();
  const suspendido = env.authenticatedContext('susp1', { email: 'susp1@x.com' }).firestore();
  const admin = env.authenticatedContext('admin1').firestore();
  let n = 0;
  const otra = () => 'anonX' + (++n);   // una sesion nueva por prueba de "crear"

  // ── Crear (parte 1) ─────────────────────────────────────────────────────
  await prueba('la parte 1 crea el lead y su marcador en un lote', assertSucceeds(crear(A, 'anonA', lead('12345678', 'anonA'))));
  await prueba('la MISMA sesión no crea una segunda solicitud (otra cédula)', assertFails(crear(A, 'anonA', lead('12345679', 'anonA'))));
  let u = otra();
  await prueba('otra sesión con la MISMA cédula → rechazado (la ficha ya existe)', assertFails(crear(anon(u), u, lead('12345678', u))));
  u = otra(); await prueba('sin web_uid → rechazado', assertFails(crear(anon(u), u, sin(lead('20000001', u), 'web_uid'))));
  u = otra(); await prueba('con el web_uid de otra sesión → rechazado', assertFails(crear(anon(u), u, lead('20000002', 'anonA'))));
  u = otra(); await prueba('cédula que no calza con el id (WEB-20000003 con V-99999999) → rechazado', assertFails(crear(anon(u), u, lead('20000003', u, { cedula: 'V-99999999' }))));
  u = otra(); await prueba('con notas → rechazado', assertFails(crear(anon(u), u, lead('20000004', u, { notas: 'Cliente VIP, aprobar ya' }))));
  u = otra(); await prueba('con score_indexa → rechazado', assertFails(crear(anon(u), u, lead('20000005', u, { score_indexa: 900 }))));
  u = otra(); await prueba('con impresion del vendedor → rechazado', assertFails(crear(anon(u), u, lead('20000006', u, { impresion: 'positiva' }))));
  u = otra(); await prueba('con una referencia y su observación → rechazado', assertFails(crear(anon(u), u, lead('20000007', u, { ref1: { nom: 'A', ci: '', tel: '', rel: '', obs: 'verificada' } }))));
  u = otra(); await prueba('con documentos → rechazado', assertFails(crear(anon(u), u, lead('20000008', u, { documentos: [] }))));
  u = otra(); await prueba('sin lote (el lead solo, sin marcador) → rechazado', assertFails(setDoc(doc(anon(u), 'clientes/WEB-20000009'), lead('20000009', u))));
  u = otra(); await prueba('el marcador solo, sin lead → rechazado', assertFails(setDoc(doc(anon(u), 'web_sesiones/' + u), { leadId: 'WEB-20000010', ts: serverTimestamp() })));
  u = otra(); await prueba('marcador que apunta a otro lead → rechazado', assertFails(crear(anon(u), u, lead('20000011', u), 'WEB-20000012')));
  u = otra(); await prueba('web_ts con la hora del teléfono (no del servidor) → rechazado', assertFails(crear(anon(u), u, lead('20000013', u, { web_ts: Timestamp.now() }))));
  u = otra(); await prueba('teléfono fijo (0212) → rechazado', assertFails(crear(anon(u), u, lead('20000014', u, { tel: '0212-1234567', wa: '0212-1234567' }))));
  u = otra(); await prueba('WhatsApp distinto del teléfono → rechazado', assertFails(crear(anon(u), u, lead('20000015', u, { wa: '0424-7654321' }))));
  u = otra(); await prueba('lead que se dice "activo" → rechazado', assertFails(crear(anon(u), u, lead('20000016', u, { estado: 'activo' }))));
  u = otra(); await prueba('trabajo fuera de la lista → rechazado', assertFails(crear(anon(u), u, lead('20000017', u, { trabajo: 'gerente' }))));
  u = otra(); await prueba('ingreso que no es un punto medio (999) → rechazado', assertFails(crear(anon(u), u, lead('20000018', u, { ingreso: 999 }))));
  u = otra(); await prueba('estado que no es de Venezuela → rechazado', assertFails(crear(anon(u), u, lead('20000019', u, { estado_ubi: 'Narnia' }))));
  u = otra(); await prueba('nombre con HTML → rechazado', assertFails(crear(anon(u), u, lead('20000020', u, { nombre: '<img src=x onerror=alert(1)>' }))));
  u = otra(); await prueba('web_paso distinto de 1 → rechazado', assertFails(crear(anon(u), u, lead('20000021', u, { web_paso: 9 }))));
  await prueba('una sesión por SMS (no anónima) no crea leads web', assertFails(crear(sms, 'sms1', lead('20000022', 'sms1'))));
  await prueba('sin sesión → rechazado', assertFails(setDoc(doc(nadie, 'clientes/WEB-20000023'), lead('20000023', 'x'))));
  u = otra(); await prueba('otra sesión nueva con otra cédula sí crea la suya', assertSucceeds(crear(anon(u), u, lead('20000024', u, { estado_ubi: 'Anzoátegui' }))));
  await prueba('la sesión anónima no lee su propia ficha', assertFails(getDoc(doc(A, 'clientes/WEB-12345678'))));
  await prueba('...ni lista clientes', assertFails(getDocs(collection(A, 'clientes'))));
  await prueba('...ni lee su marcador', assertFails(getDoc(doc(A, 'web_sesiones/anonA'))));

  // ── Completar por partes (misma sesión) ─────────────────────────────────
  const L = doc(A, 'clientes/WEB-12345678');
  await prueba('parte 2: tu moto', assertSucceeds(updateDoc(L, meta(2, { uso_moto: 'delivery', moto_previa: 'no' }))));
  await prueba('parte 3: tu trabajo', assertSucceeds(updateDoc(L, meta(3, { empresa: 'Yummy', cargo: 'Motorizado', antiguedad: '3', dir_trabajo: 'Chacao' }))));
  await prueba('parte 4: tu plata (ingreso exacto, "Nadie más" = 0, inicial por rango)', assertSucceeds(updateDoc(L, meta(4, { dia_cobro: 'semanal', ingreso: 430, ingreso_exacto: true, remesas: 'no', ingreso_familiar: 700, dependientes: 0, ahorro: 'usd', inicial_rango: '<200' }))));
  await prueba('parte 5: créditos, banco y Cashea (los que se quedan)', assertSucceeds(updateDoc(L, meta(5, { historial: 'bueno', deudas: 'menores', deuda_mensual: 50, banco_estado: 'activa', banco_nombre: 'Banesco, Mercantil',
    cashea: 'si', cashea_nivel: '4', cashea_estado: 'al_dia', cashea_linea: 600, cashea_deuda: 'si', cashea_monto: 350, cashea_cuotas_pend: 4, cashea_compras_activas: 2, cashea_prox_monto: 45 }))));
  await prueba('parte 6: dónde vives', assertSucceeds(updateDoc(L, meta(6, { ciudad: 'Sucre, Petare', dir: 'Barrio José Félix Ribas, zona 10 · Ref: frente a la panadería', tiempo_dir: '3', vivienda: 'alquilada' }))));
  await prueba('parte 7: referencias sin cédula ni observación', assertSucceeds(updateDoc(L, meta(7, { ref1: { nom: 'María González', ci: '', tel: '0424-1112233', rel: 'Amigo/a', obs: '' }, ref2: { nom: 'Pedro Díaz', ci: '', tel: '', rel: '', obs: '' } }))));
  await prueba('parte 8: fiador con nombre y teléfono', assertSucceeds(updateDoc(L, meta(8, { fiador: 'si', fiador_nom: 'José Rodríguez', fiador_tel: '0412-7654321', fiador_rel: 'conyuge', fiador_ci: 'V-9876543', fiador_dir: 'Catia', fiador_ing: 600 }))));
  await prueba('parte 9: sobre ti', assertSucceeds(updateDoc(L, meta(9, { fecha_nacimiento: '1995-03-15', email: 'carlos@gmail.com', rif: 'V-12345678-9', conocio: 'redes' }))));
  await prueba('volver a una parte y cambiarla también se puede', assertSucceeds(updateDoc(L, meta(9, { uso_moto: 'personal' }))));
  await prueba('guardar sin datos (solo avanzar) también', assertSucceeds(updateDoc(L, meta(9))));
  await prueba('desde OTRA sesión anónima → rechazado', assertFails(updateDoc(doc(anon('anonB'), 'clientes/WEB-12345678'), meta(3, { empresa: 'Otra' }))));
  await prueba('cambiar el teléfono → rechazado (la ficha es de quien la creó)', assertFails(updateDoc(L, meta(9, { tel: '0424-9999999' }))));
  await prueba('cambiar el WhatsApp → rechazado', assertFails(updateDoc(L, meta(9, { wa: '0424-9999999' }))));
  await prueba('cambiar el nombre o la cédula → rechazado', assertFails(updateDoc(L, meta(9, { nombre: 'Otro Nombre' }))));
  await prueba('ponerse "activo" → rechazado', assertFails(updateDoc(L, meta(9, { estado: 'activo' }))));
  await prueba('escribir notas o score → rechazado', assertFails(updateDoc(L, meta(9, { notas: 'aprobar', score_indexa: 900 }))));
  await prueba('cambiar web_uid → rechazado', assertFails(updateDoc(L, meta(9, { web_uid: 'anonB' }))));
  await prueba('cambiar el estado (es de la parte 1) → rechazado', assertFails(updateDoc(L, meta(9, { estado_ubi: 'Zulia' }))));
  await prueba("un '<' en un texto → rechazado", assertFails(updateDoc(L, meta(3, { empresa: 'Yummy <script>' }))));
  await prueba('comillas en la dirección → rechazado', assertFails(updateDoc(L, meta(6, { dir: 'Petare" onmouseover="x' }))));
  await prueba('código fuera de la lista (uso "carreras") → rechazado', assertFails(updateDoc(L, meta(2, { uso_moto: 'carreras' }))));
  await prueba('nivel de Cashea 0 → rechazado (van de 1 a 6)', assertFails(updateDoc(L, meta(5, { cashea_nivel: '0' }))));
  await prueba('nivel de Cashea como número → rechazado (va como texto)', assertFails(updateDoc(L, meta(5, { cashea_nivel: 4 }))));
  await prueba('7 dependientes → rechazado', assertFails(updateDoc(L, meta(4, { dependientes: 7 }))));
  await prueba('ahorro "si" → rechazado (el asistente usa no/usd/bs)', assertFails(updateDoc(L, meta(4, { ahorro: 'si' }))));
  await prueba('un campo de Cashea que se quitó (cupo) → rechazado', assertFails(updateDoc(L, meta(5, { cashea_cupo: 300 }))));
  await prueba('los datos del empleado sobre Cashea (verificado, obs) → rechazado', assertFails(updateDoc(L, meta(5, { cashea_verificado: 'app' }))));
  await prueba('la pregunta del terremoto → rechazado', assertFails(updateDoc(L, meta(6, { terremoto_afectado: 'no' }))));
  await prueba('cuánto cobra en letras → rechazado', assertFails(updateDoc(L, meta(4, { ingreso: 'quinientos' }))));
  await prueba('un ingreso de mil millones → rechazado', assertFails(updateDoc(L, meta(4, { ingreso: 1000000000 }))));
  await prueba('un ingreso negativo → rechazado', assertFails(updateDoc(L, meta(4, { ingreso: -5 }))));
  await prueba('referencia con observación → rechazado', assertFails(updateDoc(L, meta(7, { ref1: { nom: 'María', ci: '', tel: '', rel: '', obs: 'verificada' } }))));
  await prueba('referencia con cédula → rechazado', assertFails(updateDoc(L, meta(7, { ref1: { nom: 'María', ci: 'V-123456', tel: '', rel: '', obs: '' } }))));
  await prueba('borrarle el teléfono al fiador que dijo "si" → rechazado', assertFails(updateDoc(L, meta(8, { fiador_tel: '' }))));
  await prueba('fiador "tal vez" → rechazado', assertFails(updateDoc(L, meta(8, { fiador: 'tal vez' }))));
  await prueba('borrar un campo → rechazado', assertFails(updateDoc(L, meta(9, { uso_moto: deleteField() }))));
  await prueba('sin sumar web_n → rechazado', assertFails(updateDoc(L, { uso_moto: 'negocio', web_paso: 9, web_act: serverTimestamp(), web_n: 1, editadoEn: new Date().toISOString() })));
  await prueba('web_act con la hora del teléfono → rechazado', assertFails(updateDoc(L, meta(9, { web_act: Timestamp.now() }))));
  await prueba('web_paso fuera de 1 a 9 → rechazado', assertFails(updateDoc(L, meta(12))));
  await prueba('terminar con la hora del teléfono → rechazado', assertFails(updateDoc(L, meta(9, { web_fin: Timestamp.now() }))));
  await prueba('Terminar (web_fin con la hora del servidor)', assertSucceeds(updateDoc(L, meta(9, { web_fin: serverTimestamp() }))));
  await prueba('después de Terminar ya no se cambia nada', assertFails(updateDoc(L, meta(9, { uso_moto: 'negocio' }))));

  // ── Leads que ya no se pueden completar ──
  await prueba('con el formulario cerrado por el asesor (web_cerrado) → rechazado', assertFails(updateDoc(doc(anon('anonCerrado'), 'clientes/WEB-30000001'), meta(2, { uso_moto: 'personal' }))));
  await prueba('pasados 7 días desde web_ts → rechazado', assertFails(updateDoc(doc(anon('anonVencido'), 'clientes/WEB-30000002'), meta(2, { uso_moto: 'personal' }))));
  await prueba('...a los 6 días todavía se puede', assertSucceeds(updateDoc(doc(anon('anonDias'), 'clientes/WEB-30000006'), meta(2, { uso_moto: 'personal' }))));
  await prueba('lead eliminado → rechazado', assertFails(updateDoc(doc(anon('anonEliminado'), 'clientes/WEB-30000003'), meta(2, { uso_moto: 'personal' }))));
  await prueba('una referencia que el equipo ya verificó no se pisa', assertFails(updateDoc(doc(anon('anonObs'), 'clientes/WEB-30000004'), meta(7, { ref1: { nom: 'Otra', ci: '', tel: '', rel: '', obs: '' } }))));
  await prueba('...pero el resto sí se puede llenar', assertSucceeds(updateDoc(doc(anon('anonObs'), 'clientes/WEB-30000004'), meta(2, { uso_moto: 'personal' }))));
  await prueba('con 80 escrituras ya no hay más', assertFails(updateDoc(doc(anon('anonTope'), 'clientes/WEB-30000005'), meta(2, { uso_moto: 'personal' }))));
  await prueba('un lead del formulario de antes (sin web_uid) no se edita desde la web', assertFails(updateDoc(doc(anon('anonA'), 'clientes/WEB-1789798989431'), meta(2, { uso_moto: 'personal' }))));

  // ── El equipo sigue igual ──
  await prueba('un empleado edita el lead web (notas, cerrar el formulario)', assertSucceeds(updateDoc(doc(empleado, 'clientes/WEB-12345678'), { notas: 'Llamado', web_cerrado: true, web_cerrado_por: 'Empleado', web_cerrado_en: '2026-09-27T12:00:00.000Z' })));
  await prueba('...lee la ficha y los marcadores de sesión', assertSucceeds(getDoc(doc(empleado, 'web_sesiones/anonA'))));
  await prueba('...y crea clientes como siempre', assertSucceeds(setDoc(doc(empleado, 'clientes/CLI-77'), { id: 'CLI-77', nombre: 'CLIENTE', estado: 'activo', cualquierCampo: 1 })));
  await prueba('un empleado suspendido ya no edita leads', assertFails(updateDoc(doc(suspendido, 'clientes/WEB-12345678'), { notas: 'x' })));
  await prueba('nadie reescribe un marcador de sesión', assertFails(setDoc(doc(empleado, 'web_sesiones/anonA'), { leadId: 'WEB-99999999', ts: serverTimestamp() })));
  await prueba('el admin puede borrar un marcador', assertSucceeds(deleteDoc(doc(admin, 'web_sesiones/anonA'))));

  await env.cleanup();
  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR ' + (e && e.message || e)); process.exit(1); });
