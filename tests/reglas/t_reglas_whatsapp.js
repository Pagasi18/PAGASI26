// Reglas de WhatsApp e Instagram (18-oct-2026), contra el EMULADOR oficial.
// Las conversaciones las escribe el servidor; desde el navegador cada canal lo ve quien tiene su
// modulo ('whatsapp' o 'instagram') y solo cambia lo de atenderlas. Las listas piden un canal.
// Los mensajes no se escriben desde el navegador (salen por el endpoint /equipo).
// config/asistente lo edita solo administracion.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, addDoc, query, where } = require('firebase/firestore');

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
  const WA = 'conversaciones/wa:+584141234567', IG = 'conversaciones/ig:555001';
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Admin' });
    await setDoc(doc(db, 'usuarios/cob1'), { rol: 'Cobrador', nombre: 'Cobradora', email: 'cob1@x.com', permisos: ['dash', 'whatsapp', 'pagos'] });
    await setDoc(doc(db, 'usuarios/ven1'), { rol: 'Vendedor', nombre: 'Vendedora', email: 'ven1@x.com', permisos: ['dash', 'clientes', 'instagram'] });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Empleada', email: 'emp1@x.com', permisos: ['dash', 'clientes'] });
    await setDoc(doc(db, 'usuarios/vc1'), { rol: 'Vendedor Concesionario', nombre: 'Vendedor', email: 'vc1@x.com', permisos: ['whatsapp', 'instagram'], concesionarios: ['C-EK'] });
    await setDoc(doc(db, WA), { canal: 'whatsapp', area: 'cobranza', telE164: '+584141234567', nombre: 'María', clienteId: 'C1', modo: 'bot', noLeidos: 2, atencion: 'queja', actualizado: '2026-10-18T10:00:00.000Z' });
    await setDoc(doc(db, WA + '/mensajes/wamid.1'), { autor: 'cliente', texto: 'hola', hora: '2026-10-18T10:00:00.000Z' });
    await setDoc(doc(db, IG), { canal: 'instagram', area: 'ventas', igsid: '555001', usuario: 'luisperez.ve', nombre: 'Luis', modo: 'bot', noLeidos: 1, atencion: 'lead', actualizado: '2026-10-18T11:00:00.000Z' });
    await setDoc(doc(db, IG + '/mensajes/mid.1'), { autor: 'cliente', texto: 'precio?', hora: '2026-10-18T11:00:00.000Z' });
    await setDoc(doc(db, 'config/asistente'), { instrucciones: 'x', datosPago: 'Pago Móvil' });
    await setDoc(doc(db, 'webhooks_meta/a1'), { crudo: '{}' });
    await setDoc(doc(db, 'recordatorios/26_M-1_2_hoy'), { cred: 'M-1', estado: 'enviado' });
    await setDoc(doc(db, 'recordatorios_corridas/r1'), { hoy: '2026-10-18' });
    await setDoc(doc(db, 'leads/ig:555001'), { canal: 'instagram', nombre: 'Luis', modelo: 'BRZ 200', estado: 'nuevo' });
    await setDoc(doc(db, 'leads/wa:+584160000000'), { canal: 'whatsapp', nombre: 'Ana', modelo: 'Kavak', estado: 'nuevo' });
  });
  const ses = (uid, email) => env.authenticatedContext(uid, { email, firebase: { sign_in_provider: 'password' } }).firestore();
  const admin = ses('admin1', 'a@x.com'), cob = ses('cob1', 'cob1@x.com'), ven = ses('ven1', 'ven1@x.com'), emp = ses('emp1', 'emp1@x.com'), vc = ses('vc1', 'vc1@x.com');
  const nadie = env.unauthenticatedContext().firestore();
  const porCanal = (db, canal) => getDocs(query(collection(db, 'conversaciones'), where('canal', '==', canal)));

  // ── WhatsApp: quien tiene el modulo whatsapp ──
  await prueba('la cobradora con WhatsApp lee una conversación de WhatsApp', assertSucceeds(getDoc(doc(cob, WA))));
  await prueba('...y lista las de WhatsApp (pidiendo el canal)', assertSucceeds(porCanal(cob, 'whatsapp')));
  await prueba('...y lee sus mensajes', assertSucceeds(getDocs(collection(cob, WA + '/mensajes'))));
  await prueba('...la toma (modo humano, atendida por ella, sin pendiente)', assertSucceeds(updateDoc(doc(cob, WA), { modo: 'humano', atendidoPor: 'Cobradora', atencion: '', noLeidos: 0, actualizado: '2026-10-18T11:00:00.000Z' })));
  await prueba('...la devuelve al asistente', assertSucceeds(updateDoc(doc(cob, WA), { modo: 'bot', atendidoPor: '', actualizado: '2026-10-18T11:01:00.000Z' })));
  await prueba('...y guarda el borrador de la promesa', assertSucceeds(updateDoc(doc(cob, WA), { borrador: { tipo: 'promesa', fecha: '2026-10-24' } })));
  await prueba('...pero NO lee las de Instagram', assertFails(getDoc(doc(cob, IG))));
  await prueba('...ni las lista', assertFails(porCanal(cob, 'instagram')));
  await prueba('...ni sus mensajes', assertFails(getDocs(collection(cob, IG + '/mensajes'))));
  await prueba('...ni una lista sin canal', assertFails(getDocs(collection(cob, 'conversaciones'))));
  await prueba('la cobradora lee los recordatorios mandados', assertSucceeds(getDoc(doc(cob, 'recordatorios/26_M-1_2_hoy'))));
  await prueba('...y los leads de WhatsApp, y los marca atendidos', assertSucceeds(updateDoc(doc(cob, 'leads/wa:+584160000000'), { estado: 'atendido', atendidoPor: 'Cobradora', actualizado: 'x' })));
  await prueba('...pero no los de Instagram', assertFails(getDoc(doc(cob, 'leads/ig:555001'))));

  // ── Instagram: quien tiene el modulo instagram ──
  await prueba('la vendedora con Instagram lee una conversación de Instagram', assertSucceeds(getDoc(doc(ven, IG))));
  await prueba('...y lista las de Instagram', assertSucceeds(porCanal(ven, 'instagram')));
  await prueba('...y lee sus mensajes', assertSucceeds(getDocs(collection(ven, IG + '/mensajes'))));
  await prueba('...la toma', assertSucceeds(updateDoc(doc(ven, IG), { modo: 'humano', atendidoPor: 'Vendedora', atencion: '', noLeidos: 0 })));
  await prueba('...lee el lead de Instagram y lo marca atendido', assertSucceeds(updateDoc(doc(ven, 'leads/ig:555001'), { estado: 'atendido', atendidoPor: 'Vendedora', actualizado: 'x' })));
  await prueba('...pero NO lee las de WhatsApp', assertFails(getDoc(doc(ven, WA))));
  await prueba('...ni las lista', assertFails(porCanal(ven, 'whatsapp')));
  await prueba('...ni sus mensajes', assertFails(getDocs(collection(ven, WA + '/mensajes'))));
  await prueba('...ni los leads de WhatsApp', assertFails(getDoc(doc(ven, 'leads/wa:+584160000000'))));
  await prueba('...ni cambia el teléfono de un lead ni crea leads', assertFails(updateDoc(doc(ven, 'leads/ig:555001'), { telefono: '0' })) && assertFails(setDoc(doc(ven, 'leads/ig:9'), { nombre: 'x' })));

  // ── Lo que no se hace desde el navegador ──
  await prueba('no cambia el teléfono ni el cliente de la conversación', assertFails(updateDoc(doc(cob, WA), { telE164: '+580000000000' })));
  await prueba('no cambia el canal (sería saltarse el permiso)', assertFails(updateDoc(doc(ven, IG), { canal: 'whatsapp' })));
  await prueba('no cambia el texto del último mensaje', assertFails(updateDoc(doc(cob, WA), { ultimoMensaje: 'otro', noLeidos: 0 })));
  await prueba('no crea conversaciones', assertFails(setDoc(doc(cob, 'conversaciones/wa:+584160000000'), { canal: 'whatsapp', telE164: '+584160000000', modo: 'bot' })));
  await prueba('no las borra', assertFails(deleteDoc(doc(cob, WA))));
  await prueba('no escribe mensajes directo (van por el endpoint /equipo)', assertFails(addDoc(collection(cob, WA + '/mensajes'), { autor: 'equipo', texto: 'hola' })));
  await prueba('ni el administrador escribe mensajes directo', assertFails(setDoc(doc(admin, WA + '/mensajes/x1'), { autor: 'equipo', texto: 'hola' })));
  await prueba('no toca los recordatorios', assertFails(setDoc(doc(cob, 'recordatorios/26_M-1_2_hoy'), { estado: 'fallo' })));

  // ── Quien NO tiene el modulo ──
  await prueba('el administrador lee y atiende los dos canales', assertSucceeds(updateDoc(doc(admin, WA), { atencion: '', noLeidos: 0 })) && assertSucceeds(getDoc(doc(admin, IG))) && assertSucceeds(porCanal(admin, 'instagram')));
  await prueba('la empleada sin módulos no lee conversaciones', assertFails(getDoc(doc(emp, WA))) && assertFails(getDoc(doc(emp, IG))));
  await prueba('...ni mensajes', assertFails(getDocs(collection(emp, WA + '/mensajes'))));
  await prueba('el vendedor de concesionario no las lee aunque le pongan los permisos', assertFails(getDoc(doc(vc, WA))) && assertFails(getDoc(doc(vc, IG))));
  await prueba('sin sesión nada', assertFails(getDoc(doc(nadie, WA))));

  // ── config/asistente y lo del servidor ──
  await prueba('cualquiera del personal lee config/asistente (para saber si está conectado)', assertSucceeds(getDoc(doc(emp, 'config/asistente'))));
  await prueba('el administrador edita las instrucciones y los datos de pago', assertSucceeds(setDoc(doc(admin, 'config/asistente'), { instrucciones: 'nuevo', instruccionesVentas: 'promo', datosPago: 'Pago Móvil 0414' }, { merge: true })));
  await prueba('la cobradora no edita config/asistente', assertFails(setDoc(doc(cob, 'config/asistente'), { instrucciones: 'yo' }, { merge: true })));
  await prueba('la empleada tampoco', assertFails(setDoc(doc(emp, 'config/asistente'), { conectado: true }, { merge: true })));
  await prueba('los avisos crudos de Meta los lee solo administración', assertSucceeds(getDoc(doc(admin, 'webhooks_meta/a1'))));
  await prueba('...la cobradora no', assertFails(getDoc(doc(cob, 'webhooks_meta/a1'))));
  await prueba('...y nadie los escribe', assertFails(setDoc(doc(admin, 'webhooks_meta/a2'), { crudo: '{}' })));
  await prueba('las corridas de recordatorios: lee administración, no se escriben', assertSucceeds(getDoc(doc(admin, 'recordatorios_corridas/r1'))));
  await prueba('...ni el administrador las escribe', assertFails(setDoc(doc(admin, 'recordatorios_corridas/r2'), { hoy: 'x' })));

  await env.cleanup();
  console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exit(1);
})().catch(e => { console.error('FALLA', e); process.exit(1); });
