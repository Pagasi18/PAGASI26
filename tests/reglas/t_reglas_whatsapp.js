// Reglas de Redes Ventas y Redes Cobranza (1-nov-2026; antes WhatsApp e Instagram, 18-oct), contra
// el EMULADOR oficial. Las conversaciones las escribe el servidor; desde el navegador cada area la ve
// quien tiene su permiso ('redes' = ventas: Instagram y el WhatsApp de ventas; 'redescob' = cobranza:
// el WhatsApp de cobranza) y solo cambia lo de atenderlas. Un usuario de antes, sin esos permisos,
// entra como entraba ('whatsapp' = las dos areas de WhatsApp, 'instagram' = Instagram). Las listas
// piden el canal y, en WhatsApp, el area. Los mensajes no se escriben desde el navegador (salen por
// el endpoint /equipo). config/asistente lo edita solo administracion.
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, addDoc, query, where, orderBy, limit } = require('firebase/firestore');

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
  const WA = 'conversaciones/wa:+584141234567', WAV = 'conversaciones/wav:+584141234568', WAX = 'conversaciones/wa:+584141234569', IG = 'conversaciones/ig:555001';
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios/admin1'), { rol: 'Administrador', nombre: 'Admin' });
    // De antes del 1-nov: solo los canales
    await setDoc(doc(db, 'usuarios/cob1'), { rol: 'Cobrador', nombre: 'Cobradora', email: 'cob1@x.com', permisos: ['dash', 'whatsapp', 'pagos'] });
    await setDoc(doc(db, 'usuarios/ven1'), { rol: 'Vendedor', nombre: 'Vendedora', email: 'ven1@x.com', permisos: ['dash', 'clientes', 'instagram'] });
    // Con los permisos nuevos (los canales se derivan al guardar al usuario)
    await setDoc(doc(db, 'usuarios/cob2'), { rol: 'Cobrador', nombre: 'Cobrador', email: 'cob2@x.com', permisos: ['dash', 'redescob', 'whatsapp', 'pagos'] });
    await setDoc(doc(db, 'usuarios/ven2'), { rol: 'Vendedor', nombre: 'Vendedor', email: 'ven2@x.com', permisos: ['dash', 'clientes', 'redes', 'instagram', 'whatsapp'] });
    await setDoc(doc(db, 'usuarios/emp1'), { rol: 'Empleado', nombre: 'Empleada', email: 'emp1@x.com', permisos: ['dash', 'clientes'] });
    await setDoc(doc(db, 'usuarios/vc1'), { rol: 'Vendedor Concesionario', nombre: 'Vendedor', email: 'vc1@x.com', permisos: ['redes', 'redescob', 'whatsapp', 'instagram'], concesionarios: ['C-EK'] });
    await setDoc(doc(db, WA), { canal: 'whatsapp', area: 'cobranza', telE164: '+584141234567', nombre: 'María', clienteId: 'C1', modo: 'bot', noLeidos: 2, atencion: 'queja', actualizado: '2026-10-18T10:00:00.000Z' });
    await setDoc(doc(db, WA + '/mensajes/wamid.1'), { autor: 'cliente', texto: 'hola', hora: '2026-10-18T10:00:00.000Z' });
    await setDoc(doc(db, WAX), { canal: 'whatsapp', telE164: '+584141234569', nombre: 'Pedro (sin área: de antes)', modo: 'bot', noLeidos: 0, actualizado: '2026-10-17T10:00:00.000Z' });
    await setDoc(doc(db, WAV), { canal: 'whatsapp', area: 'ventas', telE164: '+584141234568', nombre: 'Ana', modo: 'bot', noLeidos: 1, atencion: 'lead', actualizado: '2026-11-01T10:00:00.000Z' });
    await setDoc(doc(db, WAV + '/mensajes/wamid.2'), { autor: 'cliente', texto: 'precio?', hora: '2026-11-01T10:00:00.000Z' });
    await setDoc(doc(db, IG), { canal: 'instagram', area: 'ventas', igsid: '555001', usuario: 'luisperez.ve', nombre: 'Luis', modo: 'bot', noLeidos: 1, atencion: 'lead', actualizado: '2026-10-18T11:00:00.000Z' });
    await setDoc(doc(db, IG + '/mensajes/mid.1'), { autor: 'cliente', texto: 'precio?', hora: '2026-10-18T11:00:00.000Z' });
    await setDoc(doc(db, 'config/asistente'), { instrucciones: 'x', datosPago: 'Pago Móvil' });
    await setDoc(doc(db, 'webhooks_meta/a1'), { crudo: '{}' });
    await setDoc(doc(db, 'recordatorios/26_M-1_2_hoy'), { cred: 'M-1', estado: 'enviado' });
    await setDoc(doc(db, 'recordatorios_corridas/r1'), { hoy: '2026-10-18' });
    await setDoc(doc(db, 'leads/ig:555001'), { canal: 'instagram', nombre: 'Luis', modelo: 'BRZ 200', estado: 'nuevo' });
    await setDoc(doc(db, 'leads/wa:+584160000000'), { canal: 'whatsapp', nombre: 'Ana', modelo: 'Kavak', estado: 'nuevo' });
    await setDoc(doc(db, 'comentarios_ig/c1'), { usuario: 'luis', texto: 'precio?', hora: '2026-10-22T10:00:00.000Z', estado: 'respondido', respuesta: 'Está en $1,750' });
  });
  const ses = (uid, email) => env.authenticatedContext(uid, { email, firebase: { sign_in_provider: 'password' } }).firestore();
  const admin = ses('admin1', 'a@x.com'), cob = ses('cob1', 'cob1@x.com'), ven = ses('ven1', 'ven1@x.com'), cob2 = ses('cob2', 'cob2@x.com'), ven2 = ses('ven2', 'ven2@x.com'), emp = ses('emp1', 'emp1@x.com'), vc = ses('vc1', 'vc1@x.com');
  const nadie = env.unauthenticatedContext().firestore();
  const porCanal = (db, canal) => getDocs(query(collection(db, 'conversaciones'), where('canal', '==', canal)));
  const porArea = (db, canal, area) => getDocs(query(collection(db, 'conversaciones'), where('canal', '==', canal), where('area', '==', area)));
  const comentarios = (db) => getDocs(query(collection(db, 'comentarios_ig'), orderBy('hora', 'desc'), limit(200)));

  // ── Redes Cobranza (permiso 'redescob'): solo el WhatsApp de cobranza ──
  await prueba('el cobrador con Redes Cobranza lee una conversación de cobranza', assertSucceeds(getDoc(doc(cob2, WA))));
  await prueba('...y una de WhatsApp sin área (las de antes son de cobranza)', assertSucceeds(getDoc(doc(cob2, WAX))));
  await prueba('...y lista las de WhatsApp de cobranza (pidiendo canal y área)', assertSucceeds(porArea(cob2, 'whatsapp', 'cobranza')));
  await prueba('...y lee sus mensajes', assertSucceeds(getDocs(collection(cob2, WA + '/mensajes'))));
  await prueba('...la toma (modo humano, atendida por él, sin pendiente)', assertSucceeds(updateDoc(doc(cob2, WA), { modo: 'humano', atendidoPor: 'Cobrador', atencion: '', noLeidos: 0, actualizado: '2026-10-18T11:00:00.000Z' })));
  await prueba('...la devuelve al asistente', assertSucceeds(updateDoc(doc(cob2, WA), { modo: 'bot', atendidoPor: '', actualizado: '2026-10-18T11:01:00.000Z' })));
  await prueba('...y guarda el borrador de la promesa', assertSucceeds(updateDoc(doc(cob2, WA), { borrador: { tipo: 'promesa', fecha: '2026-10-24' } })));
  await prueba('...y lee los recordatorios mandados', assertSucceeds(getDoc(doc(cob2, 'recordatorios/26_M-1_2_hoy'))));
  await prueba('...pero NO lee una de WhatsApp de ventas', assertFails(getDoc(doc(cob2, WAV))));
  await prueba('...ni las lista', assertFails(porArea(cob2, 'whatsapp', 'ventas')));
  await prueba('...ni una lista de WhatsApp sin área (mezclaría las dos)', assertFails(porCanal(cob2, 'whatsapp')));
  await prueba('...ni las de Instagram', assertFails(getDoc(doc(cob2, IG))) && assertFails(porCanal(cob2, 'instagram')));
  await prueba('...ni sus mensajes', assertFails(getDocs(collection(cob2, WAV + '/mensajes'))) && assertFails(getDocs(collection(cob2, IG + '/mensajes'))));
  await prueba('...ni una lista sin canal', assertFails(getDocs(collection(cob2, 'conversaciones'))));
  await prueba('...ni los leads (son de ventas)', assertFails(getDoc(doc(cob2, 'leads/wa:+584160000000'))) && assertFails(getDoc(doc(cob2, 'leads/ig:555001'))));
  await prueba('...ni los comentarios de Instagram', assertFails(comentarios(cob2)) && assertFails(getDoc(doc(cob2, 'comentarios_ig/c1'))));

  // ── Redes Ventas (permiso 'redes'): Instagram y el WhatsApp de ventas ──
  await prueba('el vendedor con Redes Ventas lee una conversación de Instagram', assertSucceeds(getDoc(doc(ven2, IG))));
  await prueba('...y una de WhatsApp de ventas', assertSucceeds(getDoc(doc(ven2, WAV))));
  await prueba('...y lista las de Instagram (sin área) y las de WhatsApp de ventas', assertSucceeds(porCanal(ven2, 'instagram')) && assertSucceeds(porArea(ven2, 'whatsapp', 'ventas')));
  await prueba('...y lee sus mensajes', assertSucceeds(getDocs(collection(ven2, IG + '/mensajes'))) && assertSucceeds(getDocs(collection(ven2, WAV + '/mensajes'))));
  await prueba('...la toma', assertSucceeds(updateDoc(doc(ven2, WAV), { modo: 'humano', atendidoPor: 'Vendedor', atencion: '', noLeidos: 0 })));
  await prueba('...lee los leads de los dos canales y los marca atendidos', assertSucceeds(updateDoc(doc(ven2, 'leads/ig:555001'), { estado: 'atendido', atendidoPor: 'Vendedor', actualizado: 'x' })) && assertSucceeds(updateDoc(doc(ven2, 'leads/wa:+584160000000'), { estado: 'atendido', atendidoPor: 'Vendedor', actualizado: 'x' })));
  await prueba('...y los comentarios de Instagram (como los pide Redes Ventas)', assertSucceeds(comentarios(ven2)) && assertSucceeds(getDoc(doc(ven2, 'comentarios_ig/c1'))));
  await prueba('...pero NO lee una de cobranza', assertFails(getDoc(doc(ven2, WA))));
  await prueba('...ni una de WhatsApp sin área', assertFails(getDoc(doc(ven2, WAX))));
  await prueba('...ni las lista', assertFails(porArea(ven2, 'whatsapp', 'cobranza')) && assertFails(porCanal(ven2, 'whatsapp')));
  await prueba('...ni sus mensajes', assertFails(getDocs(collection(ven2, WA + '/mensajes'))));
  await prueba('...ni los recordatorios', assertFails(getDoc(doc(ven2, 'recordatorios/26_M-1_2_hoy'))));
  await prueba('...ni cambia el teléfono de un lead ni crea leads', assertFails(updateDoc(doc(ven2, 'leads/ig:555001'), { telefono: '0' })) && assertFails(setDoc(doc(ven2, 'leads/ig:9'), { nombre: 'x' })));
  await prueba('...ni escribe ni borra comentarios', Promise.all([assertFails(updateDoc(doc(ven2, 'comentarios_ig/c1'), { estado: 'nuevo' })), assertFails(deleteDoc(doc(ven2, 'comentarios_ig/c1')))]));

  // ── Usuarios de antes, sin los permisos nuevos: entran como entraban ──
  await prueba('la cobradora de antes (solo "whatsapp") lee cobranza y ventas de WhatsApp', assertSucceeds(getDoc(doc(cob, WA))) && assertSucceeds(getDoc(doc(cob, WAV))) && assertSucceeds(porArea(cob, 'whatsapp', 'cobranza')) && assertSucceeds(porArea(cob, 'whatsapp', 'ventas')));
  await prueba('...los leads de WhatsApp y los recordatorios', assertSucceeds(updateDoc(doc(cob, 'leads/wa:+584160000000'), { estado: 'atendido', atendidoPor: 'Cobradora', actualizado: 'x' })) && assertSucceeds(getDoc(doc(cob, 'recordatorios/26_M-1_2_hoy'))));
  await prueba('...pero no Instagram, sus leads ni los comentarios', assertFails(getDoc(doc(cob, IG))) && assertFails(porCanal(cob, 'instagram')) && assertFails(getDoc(doc(cob, 'leads/ig:555001'))) && assertFails(comentarios(cob)));
  await prueba('...y una lista de WhatsApp sin área ya no pasa (hay que pedir el área)', assertFails(porCanal(cob, 'whatsapp')));
  await prueba('la vendedora de antes (solo "instagram") lee Instagram, sus leads y los comentarios', assertSucceeds(getDoc(doc(ven, IG))) && assertSucceeds(porCanal(ven, 'instagram')) && assertSucceeds(getDoc(doc(ven, 'leads/ig:555001'))) && assertSucceeds(comentarios(ven)));
  await prueba('...pero nada de WhatsApp, ni ventas ni cobranza', assertFails(getDoc(doc(ven, WAV))) && assertFails(getDoc(doc(ven, WA))) && assertFails(porArea(ven, 'whatsapp', 'ventas')) && assertFails(getDoc(doc(ven, 'leads/wa:+584160000000'))));

  // ── Lo que no se hace desde el navegador ──
  await prueba('no cambia el teléfono ni el cliente de la conversación', assertFails(updateDoc(doc(cob2, WA), { telE164: '+580000000000' })));
  await prueba('no cambia el canal ni el área (sería saltarse el permiso)', assertFails(updateDoc(doc(ven2, IG), { canal: 'whatsapp' })) && assertFails(updateDoc(doc(ven2, WAV), { area: 'cobranza' })));
  await prueba('no cambia el texto del último mensaje', assertFails(updateDoc(doc(cob2, WA), { ultimoMensaje: 'otro', noLeidos: 0 })));
  await prueba('no crea conversaciones', assertFails(setDoc(doc(cob2, 'conversaciones/wa:+584160000000'), { canal: 'whatsapp', area: 'cobranza', telE164: '+584160000000', modo: 'bot' })));
  await prueba('no las borra', assertFails(deleteDoc(doc(cob2, WA))));
  await prueba('no escribe mensajes directo (van por el endpoint /equipo)', assertFails(addDoc(collection(cob2, WA + '/mensajes'), { autor: 'equipo', texto: 'hola' })));
  await prueba('ni el administrador escribe mensajes directo', assertFails(setDoc(doc(admin, WA + '/mensajes/x1'), { autor: 'equipo', texto: 'hola' })));
  await prueba('no toca los recordatorios', assertFails(setDoc(doc(cob2, 'recordatorios/26_M-1_2_hoy'), { estado: 'fallo' })));

  // ── Quien NO tiene el modulo ──
  await prueba('el administrador lee y atiende las dos áreas, y lista WhatsApp sin área', assertSucceeds(updateDoc(doc(admin, WA), { atencion: '', noLeidos: 0 })) && assertSucceeds(getDoc(doc(admin, IG))) && assertSucceeds(getDoc(doc(admin, WAV))) && assertSucceeds(porCanal(admin, 'whatsapp')) && assertSucceeds(porCanal(admin, 'instagram')) && assertSucceeds(comentarios(admin)));
  await prueba('...pero tampoco escribe comentarios', assertFails(setDoc(doc(admin, 'comentarios_ig/c2'), { texto: 'x' })));
  await prueba('la empleada sin módulos no lee conversaciones', assertFails(getDoc(doc(emp, WA))) && assertFails(getDoc(doc(emp, WAV))) && assertFails(getDoc(doc(emp, IG))) && assertFails(comentarios(emp)));
  await prueba('...ni mensajes', assertFails(getDocs(collection(emp, WA + '/mensajes'))));
  await prueba('el vendedor de concesionario no lee nada aunque le pongan los permisos', assertFails(getDoc(doc(vc, WA))) && assertFails(getDoc(doc(vc, WAV))) && assertFails(getDoc(doc(vc, IG))) && assertFails(comentarios(vc)) && assertFails(porArea(vc, 'whatsapp', 'cobranza')));
  await prueba('sin sesión nada', assertFails(getDoc(doc(nadie, WA))) && assertFails(comentarios(nadie)));

  // ── config/asistente y lo del servidor ──
  await prueba('cualquiera del personal lee config/asistente (para saber si está conectado)', assertSucceeds(getDoc(doc(emp, 'config/asistente'))));
  await prueba('el administrador edita las instrucciones y los datos de pago', assertSucceeds(setDoc(doc(admin, 'config/asistente'), { instrucciones: 'nuevo', instruccionesVentas: 'promo', datosPago: 'Pago Móvil 0414' }, { merge: true })));
  await prueba('el cobrador no edita config/asistente', assertFails(setDoc(doc(cob2, 'config/asistente'), { instrucciones: 'yo' }, { merge: true })));
  await prueba('la empleada tampoco', assertFails(setDoc(doc(emp, 'config/asistente'), { conectado: true }, { merge: true })));
  await prueba('los avisos crudos de Meta los lee solo administración', assertSucceeds(getDoc(doc(admin, 'webhooks_meta/a1'))));
  await prueba('...el cobrador no', assertFails(getDoc(doc(cob2, 'webhooks_meta/a1'))));
  await prueba('...y nadie los escribe', assertFails(setDoc(doc(admin, 'webhooks_meta/a2'), { crudo: '{}' })));
  await prueba('las corridas de recordatorios: lee administración, no se escriben', assertSucceeds(getDoc(doc(admin, 'recordatorios_corridas/r1'))));
  await prueba('...ni el administrador las escribe', assertFails(setDoc(doc(admin, 'recordatorios_corridas/r2'), { hoy: 'x' })));

  await env.cleanup();
  console.log('\n' + pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exit(1);
})().catch(e => { console.error('FALLA', e); process.exit(1); });
