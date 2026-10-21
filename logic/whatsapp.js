/* Cobranza por WhatsApp (18-oct-2026) — la logica del modulo.
   El asistente recuerda las cuotas y conversa con el cliente por la API oficial de Meta; el
   cerebro vive en Cloud Functions (functions/). Desde aqui el equipo ve la cola de hoy, las
   conversaciones, toma o devuelve una conversacion, escribe como equipo y edita las
   instrucciones del asistente. Mientras Meta no este conectado, el modulo corre en MODO
   DEMOSTRACION: la cola de recordatorios es real (se calcula con la cartera y el ledger),
   pero no se manda nada y las conversaciones son de muestra, en memoria.

   Colecciones (las escribe el servidor; el equipo solo lee y toma conversaciones):
     conversaciones/{id}            id = 'wa:' + telefono E.164
       canal, telE164, nombre, clienteId, clienteNombre, modo ('bot'|'humano'), atencion
       ('' | 'pide_persona' | 'queja' | 'comprobante' | 'promesa_vencida' | 'error'),
       borrador {tipo, ...}, resumen, noLeidos, ultimoMensaje, ultimoMensajeHora,
       ultimoEntranteHora (ventana de 24 h), atendidoPor, creado, actualizado
     conversaciones/{id}/mensajes/{mid}
       metaId, direccion ('entrante'|'saliente'), autor ('cliente'|'asistente'|'equipo'),
       tipo ('texto'|'imagen'|'plantilla'|'documento'|'audio'), texto, medio {url}, estado
       ('pendiente'|'enviado'|'entregado'|'leido'|'fallo'|'recibido'), error, hora, por
     config/asistente              instrucciones, conectado, telefono, actualizadoPor/En   */

var _waRoot = (typeof window !== 'undefined') ? window : globalThis;   // en Node (pruebas) no hay window
var WA_PREFIJOS = ['412','414','416','422','424','426'];
var WA_GRACIA = 5;            // igual que PLAN.diasGracia
var WA_GRUPOS = [
  { id:'proximas',  titulo:'Vencen en 1 a 3 días',    sub:'Se le escribe 3 días antes, con el monto y la fecha',      tono:'azul' },
  { id:'hoy',       titulo:'Vencen hoy',               sub:'"Hoy es tu día de pago"',                                  tono:'azul' },
  { id:'gracia',    titulo:'Vencidas (1 a 5 días)',    sub:'Todavía en gracia: recordar sin mora',                     tono:'ambar' },
  { id:'atrasadas', titulo:'Atrasadas (6 a 10 días)',  sub:'Ya genera mora: recordatorio firme y pedir fecha de pago', tono:'rojo' },
  { id:'cobrador',  titulo:'Más de 10 días',           sub:'El asistente ya no insiste: pasa a un cobrador',           tono:'gris' },
  { id:'acuerdo',   titulo:'Con acuerdo de pago',      sub:'No se le cobra antes de su fecha: se le recuerda 1 día antes y el mismo día', tono:'verde' }
];

function waTelE164(v){
  var d = String(v == null ? '' : v).replace(/\D/g, '');
  if(d.indexOf('58') === 0 && d.length === 12) d = d.slice(2);
  else if(d.indexOf('0') === 0) d = d.slice(1);
  if(d.length !== 10 || WA_PREFIJOS.indexOf(d.slice(0, 3)) === -1) return '';
  return '+58' + d;
}
function _waEsc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _waDias(a, b){ return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
function _waFechaCorta(iso){ if(!iso) return ''; var m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; var p = String(iso).slice(0,10).split('-'); return p.length === 3 ? parseInt(p[2],10) + ' ' + m[parseInt(p[1],10) - 1] : iso; }
function _waNombrePila(n){ var p = String(n || '').trim().split(/\s+/); return p[0] ? p[0].charAt(0).toUpperCase() + p[0].slice(1).toLowerCase() : 'cliente'; }
function _waMoney(n){ return typeof fmt === 'function' ? fmt(n) : '$' + (parseFloat(n) || 0).toFixed(2); }

// Configuracion del asistente (config/asistente): se lee una vez por sesion
_waRoot._waCfg = _waRoot._waCfg || null;
function waCargarCfg(cb){
  if(_waRoot._waCfg){ if(cb) cb(_waRoot._waCfg); return; }
  if(typeof db === 'undefined' || !db){ _waRoot._waCfg = { instrucciones:'', conectado:false }; if(cb) cb(_waRoot._waCfg); return; }
  db.collection('config').doc('asistente').get().then(function(d){
    _waRoot._waCfg = Object.assign({ instrucciones:'', conectado:false }, d.exists ? d.data() : {});
    if(cb) cb(_waRoot._waCfg);
  }).catch(function(){ _waRoot._waCfg = { instrucciones:'', conectado:false }; if(cb) cb(_waRoot._waCfg); });
}
function waConectado(){ return !!(_waRoot._waCfg && _waRoot._waCfg.conectado); }
// Instagram cuenta como conectado cuando config/asistente trae el usuario de la cuenta (lo pone quien lo conecta)
function waConectadoCanal(canal){ return canal === 'instagram' ? !!(_waRoot._waCfg && _waRoot._waCfg.instagram) : waConectado(); }
// A qué módulo del panel pertenece una conversación (por su id)
function _waModuloDe(id){ return String(id || '').indexOf('ig:') === 0 ? 'instagram' : 'whatsapp'; }

// ── La cola de hoy: a quién le tocaría un mensaje, calculado con el ledger ──
function waColaHoy(creds, pagos, clientes, hoy){
  creds = creds || S.creds || []; pagos = pagos || S.pagos || []; clientes = clientes || S.clientes || [];
  hoy = hoy || (typeof hoyLocalISO === 'function' ? hoyLocalISO() : new Date().toISOString().slice(0, 10));
  var porCliente = {}; clientes.forEach(function(c){ if(c && !c.eliminado) porCliente[String(c.id)] = c; });
  var grupos = {}; WA_GRUPOS.forEach(function(g){ grupos[g.id] = []; });
  var sinTel = 0;
  creds.forEach(function(c){
    if(!c || c.eliminado || ['cancelado','pendiente_revision','completado'].indexOf(c.estado) > -1) return;
    var est; try{ est = CreditoLedger.generarEstadoCredito(c, pagos, { diasGracia: WA_GRACIA, today: hoy }); }catch(e){ return; }
    if(!est || !est.totalCuotas || est.cuotasPagadas >= est.totalCuotas) return;
    // la primera cuota con saldo es la que manda: si está vencida, el atraso; si no, la próxima
    var q = (est.cuotas || []).filter(function(x){ return x && x.saldo > 0.001; })[0];
    if(!q || !q.fechaVence) return;
    var dias = _waDias(q.fechaVence, hoy);   // >0 = vencida hace N días; <0 = vence en N días
    // Acuerdo de pago vigente (Cobranza → Acordar: fechaCompromiso): antes de esa fecha no se le cobra.
    // Se le recuerda 1 día antes y el mismo día, por lo que debe hasta esa fecha. Si la fecha pasa sin
    // pago, el crédito vuelve a los recordatorios normales de atraso.
    var fc = /^\d{4}-\d{2}-\d{2}$/.test(String(c.fechaCompromiso || '')) ? c.fechaCompromiso : '';
    if(fc && fc >= hoy){
      var clA = porCliente[String(c.clienteId)] || {}, telA = waTelE164(clA.telE164 || clA.tel);
      if(!telA) sinTel++;
      var hasta = (est.cuotas || []).filter(function(x){ return x && x.saldo > 0.001 && x.fechaVence && x.fechaVence <= fc; });
      var montoA = Math.round(hasta.reduce(function(s, x){ return s + x.saldo; }, 0) * 100) / 100 || Math.round(q.saldo * 100) / 100;
      grupos.acuerdo.push({ cred: c.id, clienteId: String(c.clienteId || ''), nombre: c.cli || clA.nombre || 'Cliente', tel: telA, telRaw: clA.tel || '', modelo: c.modelo || '',
        cuota: q.numero, monto: montoA, fechaVence: fc, fechaCuota: q.fechaVence, dias: _waDias(fc, hoy), totalCuotas: est.totalCuotas, pagadas: est.cuotasPagadas, acuerdo: true,
        vencidas: hasta.filter(function(x){ return x.fechaVence < hoy; }).length, montoVencido: montoA });
      return;
    }
    var grupo = dias >= -3 && dias <= -1 ? 'proximas' : dias === 0 ? 'hoy' : dias >= 1 && dias <= WA_GRACIA ? 'gracia' : dias > WA_GRACIA && dias <= 10 ? 'atrasadas' : dias > 10 ? 'cobrador' : null;
    if(!grupo) return;
    var cl = porCliente[String(c.clienteId)] || {};
    var tel = waTelE164(cl.telE164 || cl.tel);
    if(!tel) sinTel++;
    var vencido = (est.cuotas || []).filter(function(x){ return x && x.saldo > 0.001 && x.fechaVence && x.fechaVence < hoy; });
    grupos[grupo].push({ cred: c.id, clienteId: String(c.clienteId || ''), nombre: c.cli || cl.nombre || 'Cliente', tel: tel, telRaw: cl.tel || '', modelo: c.modelo || '',
      cuota: q.numero, monto: Math.round(q.saldo * 100) / 100, fechaVence: q.fechaVence, dias: dias, totalCuotas: est.totalCuotas, pagadas: est.cuotasPagadas,
      vencidas: vencido.length, montoVencido: Math.round(vencido.reduce(function(s, x){ return s + x.saldo; }, 0) * 100) / 100 });
  });
  Object.keys(grupos).forEach(function(k){ grupos[k].sort(function(a, b){ return b.dias - a.dias || a.nombre.localeCompare(b.nombre); }); });
  var total = Object.keys(grupos).reduce(function(s, k){ return s + grupos[k].length; }, 0);
  return { hoy: hoy, grupos: grupos, total: total, sinTel: sinTel };
}

// El texto que mandaría el asistente en cada caso (mismas plantillas que se le proponen a Meta)
function waPlantilla(grupo, it){
  var nom = _waNombrePila(it.nombre), monto = _waMoney(it.monto), fecha = _waFechaCorta(it.fechaVence);
  var pagar = 'Puedes pagar por Pago Móvil, transferencia o Binance; si me escribes "cómo pago" te paso los datos. Si ya pagaste, mándame la foto del comprobante y listo.';
  if(grupo === 'proximas') return 'Hola ' + nom + ', soy el asistente de Pagasi. Tu cuota ' + it.cuota + ' de ' + it.totalCuotas + ' (' + monto + ') vence el ' + fecha + '. ' + pagar;
  if(grupo === 'hoy') return 'Hola ' + nom + ', hoy ' + fecha + ' es tu día de pago: cuota ' + it.cuota + ' de ' + it.totalCuotas + ', ' + monto + '. ' + pagar;
  if(grupo === 'acuerdo') return 'Hola ' + nom + ', te recordamos tu acuerdo de pago: ' + monto + ' para el ' + fecha + '. ' + pagar;
  if(grupo === 'gracia') return 'Hola ' + nom + ', tu cuota ' + it.cuota + ' (' + monto + ') venció el ' + fecha + '. Todavía estás a tiempo de pagarla sin recargo. ' + pagar;
  if(grupo === 'atrasadas') return 'Hola ' + nom + ', tu cuota ' + it.cuota + ' (' + monto + ') venció el ' + fecha + ' y ya está generando mora. ¿Qué día puedes pagarla? Dime la fecha y te la anoto. ' + pagar;
  return 'Hola ' + nom + ', tienes ' + it.vencidas + ' cuota' + (it.vencidas === 1 ? '' : 's') + ' vencida' + (it.vencidas === 1 ? '' : 's') + ' por ' + _waMoney(it.montoVencido) + '. Un asesor de Pagasi se va a comunicar contigo hoy para buscar una solución.';
}

// ── Conversaciones: reales (Firestore) o de muestra (memoria) ──
_waRoot._waConvs = _waRoot._waConvs || [];        // lista de conversaciones
_waRoot._waMsgs = _waRoot._waMsgs || {};          // id -> mensajes
_waRoot._waSel = _waRoot._waSel || '';            // conversacion abierta
_waRoot._waUnsub = _waRoot._waUnsub || null;

function _waAhoraMenos(min){ return new Date(Date.now() - min * 60000).toISOString(); }
// Conversaciones de muestra: nacen de la cola real para que se parezcan a la cartera de verdad
function waDemoConversaciones(cola){
  if(_waRoot._waConvs.some(function(c){ return (c.canal || 'whatsapp') === 'whatsapp'; })) return _waRoot._waConvs;
  var cand = [].concat(cola.grupos.hoy, cola.grupos.gracia, cola.grupos.atrasadas, cola.grupos.proximas).filter(function(i){ return i.tel; }).slice(0, 5);
  var nombres = ['María Pérez', 'José Rojas', 'Luisa Mora', 'Carlos Díaz', 'Rosa Gil'];
  while(cand.length < 5){ var k = cand.length; cand.push({ cred: 'M-0' + (11 + k), clienteId: 'demo-' + k, nombre: nombres[k], tel: '+5841400000' + k, cuota: 4 + k, totalCuotas: 24, monto: 50, fechaVence: cola.hoy, dias: k - 1, modelo: 'EK XPRESS 150', vencidas: k > 1 ? 1 : 0, montoVencido: k > 1 ? 50 : 0 }); }
  var guiones = [
    [['cliente','ya pagué, aquí está',null,'imagen'],['asistente','¡Gracias! Recibí tu comprobante y lo pasé al equipo para confirmarlo. En cuanto lo registren te aviso, y vas 1 quincena más en tu racha 🙌','comprobante']],
    [['cliente','cuanto debo?'],['asistente','Hola {nom}, vas al día: tu próxima cuota es la {cuota} de {total}, {monto}, y vence el {fecha}. ¿Te paso los datos para pagar?'],['cliente','si'],['asistente','Pago Móvil: 0414-000-0000 · Banco X · RIF J-00000000-0. Binance: pagasi26. Cuando pagues me mandas la foto del comprobante y lo registro.']],
    [['cliente','esta semana no puedo, pago el sabado'],['asistente','Entendido, {nom}. Te anoto el pago para el sábado y ese día te recuerdo. Si algo cambia me avisas y buscamos otra fecha.','promesa']],
    [['cliente','quiero hablar con una persona, esto está mal cobrado'],['asistente','Claro, {nom}. Ya le avisé a un asesor de Pagasi para que te escriba por aquí mismo. Disculpa la molestia.','pide_persona']],
    [['asistente','Hola {nom}, soy el asistente de Pagasi. Tu cuota {cuota} de {total} ({monto}) vence el {fecha}. Si ya pagaste, mándame la foto del comprobante.','plantilla']]
  ];
  var convs = [];
  cand.forEach(function(it, i){
    // en la demo dos clientes pueden compartir número (datos de prueba): el id lleva el crédito
    var id = 'wa:' + it.tel + ':' + (it.cred || i), g = guiones[i % guiones.length], msgs = [], t = 90 - i * 12, aten = '', borrador = null;
    g.forEach(function(m, j){
      var texto = String(m[1]).replace('{nom}', _waNombrePila(it.nombre)).replace('{cuota}', it.cuota).replace('{total}', it.totalCuotas).replace('{monto}', _waMoney(it.monto)).replace('{fecha}', _waFechaCorta(it.fechaVence));
      msgs.push({ id: id + '-' + j, autor: m[0], direccion: m[0] === 'cliente' ? 'entrante' : 'saliente', tipo: m[3] || (m[2] === 'plantilla' ? 'plantilla' : 'texto'), texto: texto, hora: _waAhoraMenos(t - j * 3), estado: m[0] === 'cliente' ? 'recibido' : (j === g.length - 1 ? 'entregado' : 'leido'), medio: m[3] === 'imagen' ? { url: 'assets/aliados/motos/sbr.webp', demo: true } : null });
      if(m[2] === 'comprobante') aten = 'comprobante';
      if(m[2] === 'pide_persona') aten = 'pide_persona';
      if(m[2] === 'promesa'){ var f = new Date(); f.setDate(f.getDate() + ((6 - f.getDay() + 7) % 7 || 7)); borrador = { tipo: 'promesa', fecha: f.toISOString().slice(0, 10), monto: it.monto, cuota: it.cuota }; }
    });
    var ult = msgs[msgs.length - 1];
    convs.push({ id: id, canal: 'whatsapp', area: 'cobranza', telE164: it.tel, nombre: it.nombre, clienteId: it.clienteId, clienteNombre: it.nombre, cred: it.cred, modo: 'bot', atencion: aten, borrador: borrador,
      resumen: i === 1 ? 'Preguntó cuánto debe; se le dieron los datos de pago.' : (i === 2 ? 'Prometió pagar el sábado.' : ''), noLeidos: aten ? 1 : 0, ultimoMensaje: ult.texto, ultimoMensajeHora: ult.hora,
      ultimoEntranteHora: msgs.filter(function(m){ return m.autor === 'cliente'; }).map(function(m){ return m.hora; }).pop() || _waAhoraMenos(60 * 30), demo: true });
    _waRoot._waMsgs[id] = msgs;
  });
  // Y una de VENTAS por WhatsApp: alguien que no es cliente y pregunta por una moto
  var wv = 'wa:+584125550000', hWv = _waAhoraMenos(40);
  _waRoot._waMsgs[wv] = [
    { id: wv + '-0', autor: 'cliente', direccion: 'entrante', tipo: 'texto', texto: 'buenas, vi la Kavak 250 en la página. cuánto es la cuota?', hora: _waAhoraMenos(46), estado: 'recibido' },
    { id: wv + '-1', autor: 'asistente', direccion: 'saliente', tipo: 'texto', texto: '¡Hola! La Kavak 250 está en $2,900: inicial desde $1,160 (40%) y cuota quincenal de $245 a 12 meses. Son montos de referencia; tu asesor los confirma. ¿En qué ciudad estás?', hora: _waAhoraMenos(45), estado: 'leido' },
    { id: wv + '-2', autor: 'cliente', direccion: 'entrante', tipo: 'texto', texto: 'Valencia. soy Ana Torres, me interesa', hora: _waAhoraMenos(41), estado: 'recibido' },
    { id: wv + '-3', autor: 'asistente', direccion: 'saliente', tipo: 'texto', texto: 'Perfecto, Ana 🙌 Ya le pasé tus datos a un asesor de Pagasi para que te escriba por aquí mismo. Si quieres adelantar, la solicitud está en pagasi.io/solicitar.', hora: hWv, estado: 'entregado' }
  ];
  convs.push({ id: wv, canal: 'whatsapp', area: 'ventas', telE164: '+584125550000', nombre: 'Ana Torres', clienteId: '', clienteNombre: '', cred: '', modo: 'bot', atencion: 'lead',
    borrador: { tipo: 'lead', nombre: 'Ana Torres', ciudad: 'Valencia', modelo: 'Kavak 250', telefono: '584125550000' }, resumen: 'Preguntó por la Kavak 250; quiere que la llamen (Valencia).',
    noLeidos: 1, ultimoMensaje: _waRoot._waMsgs[wv][3].texto, ultimoMensajeHora: hWv, ultimoEntranteHora: _waAhoraMenos(41), demo: true });
  _waRoot._waConvs = _waRoot._waConvs.concat(convs);
  return _waRoot._waConvs;
}
// La demostración de Instagram (ventas): alguien que pregunta por una moto y deja sus datos
function waDemoInstagram(){
  if(_waRoot._waConvs.some(function(c){ return c.canal === 'instagram'; })) return _waRoot._waConvs;
  var ig = 'ig:demo-1', hIg = _waAhoraMenos(25);
  _waRoot._waMsgs[ig] = [
    { id: ig + '-0', autor: 'cliente', direccion: 'entrante', tipo: 'texto', texto: 'hola, cuánto es la inicial de la BRZ 200?', hora: _waAhoraMenos(31), estado: 'recibido' },
    { id: ig + '-1', autor: 'asistente', direccion: 'saliente', tipo: 'texto', texto: '¡Hola! La BRZ 200 está en $1,750: inicial desde $700 (40%) y cuota quincenal de $148 a 12 meses. Son montos de referencia; tu asesor los confirma. ¿En qué ciudad estás?', hora: _waAhoraMenos(30), estado: 'leido' },
    { id: ig + '-2', autor: 'cliente', direccion: 'entrante', tipo: 'texto', texto: 'en Maracay. me interesa, soy Luis Pérez 0414-5550000', hora: _waAhoraMenos(26), estado: 'recibido' },
    { id: ig + '-3', autor: 'asistente', direccion: 'saliente', tipo: 'texto', texto: 'Perfecto, Luis 🙌 Ya le pasé tus datos a un asesor de Pagasi: te escribe por WhatsApp para confirmar disponibilidad en la sede más cercana. Mientras, puedes adelantar la solicitud en pagasi.io/solicitar.', hora: hIg, estado: 'entregado' }
  ];
  _waRoot._waConvs.push({ id: ig, canal: 'instagram', area: 'ventas', igsid: 'demo-1', usuario: 'luisperez.ve', nombre: 'Luis Pérez', telE164: '', clienteId: '', clienteNombre: '', cred: '', modo: 'bot', atencion: 'lead',
    borrador: { tipo: 'lead', nombre: 'Luis Pérez', ciudad: 'Maracay', modelo: 'BRZ 200', telefono: '584145550000' }, resumen: 'Preguntó por la BRZ 200; quiere que lo llamen (Maracay).',
    noLeidos: 1, ultimoMensaje: _waRoot._waMsgs[ig][3].texto, ultimoMensajeHora: hIg, ultimoEntranteHora: _waAhoraMenos(26), demo: true });
  return _waRoot._waConvs;
}
// El asistente de muestra: unas pocas reglas, para ver el flujo sin Meta ni Claude
function waDemoResponder(conv, texto){
  var t = String(texto || '').toLowerCase(), nom = _waNombrePila(conv.nombre);
  if(/pagu[eé]|comprobante|transfer|listo/.test(t)) return { texto: '¡Gracias, ' + nom + '! Si me mandas la foto del comprobante lo paso al equipo para confirmarlo.', atencion: '' };
  if(/cu[aá]nto|debo|saldo|cuota|cu[aá]ndo/.test(t)) return { texto: 'Vas al día, ' + nom + '. Tu próxima cuota es de ' + _waMoney(50) + ' y vence el ' + _waFechaCorta(new Date(Date.now() + 5 * 86400000).toISOString()) + '. ¿Te paso los datos para pagar?', atencion: '' };
  if(/c[oó]mo pago|datos|pago m[oó]vil|binance/.test(t)) return { texto: 'Pago Móvil: 0414-000-0000 · Banco X · RIF J-00000000-0. Binance: pagasi26. Cuando pagues me mandas la foto del comprobante.', atencion: '' };
  if(/el (lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|ma[ñn]ana|quincena|pago el/.test(t)) return { texto: 'Perfecto, ' + nom + ', te lo anoto y ese día te recuerdo. Gracias por avisar.', atencion: '', borrador: { tipo: 'promesa', fecha: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), monto: 50 } };
  if(/persona|asesor|humano|queja|mal cobrado|error|reclamo/.test(t)) return { texto: 'Claro, ' + nom + '. Ya le avisé a un asesor de Pagasi para que te escriba por aquí mismo.', atencion: 'pide_persona' };
  if(/no puedo|no tengo|sin trabajo|dif[ií]cil/.test(t)) return { texto: 'Entiendo, ' + nom + '. Un asesor te va a escribir para buscar una solución juntos. Gracias por contarme.', atencion: 'pide_persona' };
  return { texto: 'Soy el asistente de cobranza de Pagasi y solo puedo ayudarte con tu crédito: cuánto debes, cuándo vence y cómo pagar. Si necesitas otra cosa, te comunico con una persona.', atencion: '' };
}

function waAbrirConversaciones(canal, cb){
  if(typeof canal === 'function'){ cb = canal; canal = 'whatsapp'; }
  canal = canal || 'whatsapp';
  if(!waConectadoCanal(canal)){ if(cb) cb(_waRoot._waConvs); return; }
  _waRoot._waUnsubs = _waRoot._waUnsubs || {};
  if(_waRoot._waUnsubs[canal]){ if(cb) cb(_waRoot._waConvs); return; }
  if(typeof db === 'undefined' || !db){ if(cb) cb([]); return; }
  _waRoot._waUnsubs[canal] = db.collection('conversaciones').where('canal', '==', canal).orderBy('actualizado', 'desc').limit(200).onSnapshot(function(snap){
    var otras = (_waRoot._waConvs || []).filter(function(c){ return (c.canal || 'whatsapp') !== canal; });
    _waRoot._waConvs = otras.concat(snap.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); }));
    // Si la pantalla esta puesta se refresca en el sitio (lista, contadores, hilo si cambio); si no, nav
    if(S.page === 'whatsapp' || S.page === 'instagram'){ if(!(typeof _waRefrescarEnSitio === 'function' && _waRefrescarEnSitio()) && typeof nav === 'function') nav(S.page); }
    if(cb){ cb(_waRoot._waConvs); cb = null; }
  }, function(e){ console.warn('conversaciones ' + canal + ':', e); if(cb) cb([]); });
}
function waAbrirMensajes(id, cb){
  // La conexion que manda es la del canal de ESTA conversacion (Instagram puede estar conectado
  // con WhatsApp todavia en demostracion): si no, el hilo de Instagram salia en blanco (19-oct-2026).
  var conv = _waConv(id), canal = (conv && conv.canal) || (String(id).indexOf('ig:') === 0 ? 'instagram' : 'whatsapp');
  if(!waConectadoCanal(canal)){ if(cb) cb(_waRoot._waMsgs[id] || []); if(typeof _waPintarHilo === 'function') _waPintarHilo(id); return; }
  if(_waRoot._waMsgUnsub) { try{ _waRoot._waMsgUnsub(); }catch(e){} }
  _waRoot._waMsgUnsub = db.collection('conversaciones').doc(id).collection('mensajes').orderBy('hora', 'desc').limit(200).onSnapshot(function(snap){
    // Los 200 más recientes, mostrados en orden cronológico
    _waRoot._waMsgs[id] = snap.docs.map(function(d){ return Object.assign({ id: d.id }, d.data()); }).sort(function(a, b){ return String(a.hora || '').localeCompare(String(b.hora || '')); });
    if(typeof _waPintarHilo === 'function') _waPintarHilo(id);
    if(cb){ cb(_waRoot._waMsgs[id]); cb = null; }
  }, function(e){ console.warn('mensajes ' + id + ':', e); _waRoot._waMsgs[id] = _waRoot._waMsgs[id] || []; if(typeof toast === 'function') toast('No se pudieron leer los mensajes: ' + (e && e.message || e), 'error'); if(typeof _waPintarHilo === 'function') _waPintarHilo(id); if(cb){ cb([]); cb = null; } });
}
function _waConv(id){ return (_waRoot._waConvs || []).find(function(c){ return c.id === id; }); }
function _waActualizar(id, cambios, accion){
  var c = _waConv(id); if(!c) return Promise.resolve();
  Object.assign(c, cambios);
  if(typeof logActividad === 'function' && accion) logActividad(accion, 'whatsapp', id, {});
  if(!waConectadoCanal(c.canal) || typeof db === 'undefined' || !db) return Promise.resolve();
  return db.collection('conversaciones').doc(id).set(Object.assign({}, cambios, { actualizado: new Date().toISOString() }), { merge: true }).catch(function(e){ toast('No se pudo guardar: ' + (e && e.message || e), 'error'); });
}
// Tras una accion sobre la conversacion: refrescar en el sitio si la pantalla esta puesta; si no, nav
function _waTrasCambio(id){ if(typeof _waRefrescarEnSitio === 'function' && _waRefrescarEnSitio(true)) return; if(typeof nav === 'function') nav(_waModuloDe(id)); }
function waAtender(id){ var yo = (S.currentUser && S.currentUser.nombre) || 'Equipo'; _waActualizar(id, { modo: 'humano', atendidoPor: yo, atencion: '', noLeidos: 0 }, 'wa_atender').then(function(){ toast('La conversación es tuya: el asistente se calla hasta que la devuelvas', 'success'); _waTrasCambio(id); }); }
function waDevolver(id){ _waActualizar(id, { modo: 'bot', atendidoPor: '' }, 'wa_devolver').then(function(){ toast('El asistente vuelve a atender', 'info'); _waTrasCambio(id); }); }
function waVisto(id){ _waActualizar(id, { atencion: '', noLeidos: 0 }, 'wa_visto').then(function(){ _waTrasCambio(id); }); }
// Ventana de 24 h de Meta: solo se puede escribir libre si el cliente escribió en las últimas 24 h
function waVentanaAbierta(conv, ahora){ if(!conv || !conv.ultimoEntranteHora) return false; var t = (ahora ? new Date(ahora) : new Date()).getTime() - new Date(conv.ultimoEntranteHora).getTime(); return t < (conv.canal === 'instagram' ? 7 * 24 : 24) * 3600 * 1000; }
function waEnviarEquipo(id, texto){
  var c = _waConv(id); texto = String(texto || '').trim();
  if(!c || !texto) return;
  if(!waVentanaAbierta(c)){ toast(c.canal === 'instagram' ? 'La ventana de 7 días de Instagram está cerrada: solo se puede escribir cuando la persona vuelva a escribir.' : 'La ventana de 24 horas de WhatsApp está cerrada: solo se puede escribir cuando el cliente vuelva a escribir.', 'error'); return; }
  var m = { autor: 'equipo', direccion: 'saliente', tipo: 'texto', texto: texto, hora: new Date().toISOString(), estado: waConectadoCanal(c.canal) ? 'pendiente' : 'entregado', por: (S.currentUser && S.currentUser.nombre) || 'Equipo' };
  (_waRoot._waMsgs[id] = _waRoot._waMsgs[id] || []).push(Object.assign({ id: 'local-' + Date.now() }, m));
  Object.assign(c, { ultimoMensaje: texto, ultimoMensajeHora: m.hora, modo: 'humano', atendidoPor: m.por });
  if(waConectadoCanal(c.canal)) _waMandarAlServidor(id, texto, m);
  if(typeof logActividad === 'function') logActividad('wa_mensaje_equipo', 'whatsapp', id, { largo: texto.length });
  if(typeof _waPintarHilo === 'function') _waPintarHilo(id);
}
// Con Meta conectado el mensaje del equipo lo manda el servidor (Cloud Functions): él habla con
// Meta y guarda el mensaje; aquí solo se pide con la sesión del usuario. La URL se puede cambiar
// en config/asistente.urlEquipo.
var WA_URL_EQUIPO = 'https://pagasi-webhook-5ao0p23z.ue.gateway.dev/equipo';   // la puerta pública (API Gateway) delante del servidor
function waEmpresa(){ return (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG && FIREBASE_CONFIG.projectId === 'pagasi-v2') ? '18' : '26'; }
function _waMandarAlServidor(id, texto, m){
  var url = (_waRoot._waCfg && _waRoot._waCfg.urlEquipo) || WA_URL_EQUIPO;
  var fallo = function(msg){ m.estado = 'fallo'; toast('No se pudo enviar: ' + msg, 'error'); if(typeof _waPintarHilo === 'function') _waPintarHilo(id); };
  var user = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) || null;
  if(!user){ fallo('sin sesión'); return Promise.resolve(); }
  return user.getIdToken().then(function(tok){
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify({ empresa: waEmpresa(), conv: id, texto: texto }) });
  }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if(!r.ok) throw new Error(j.error || ('HTTP ' + r.status)); m.estado = 'enviado'; }); })
    .catch(function(e){ fallo(e && e.message || e); });
}
// En la demostración el "cliente" responde para que se vea el ida y vuelta del asistente
// En la demostración de Instagram el asistente de ventas contesta con frases de muestra
function waDemoResponderVentas(conv, texto){
  var t = String(texto || '').toLowerCase();
  if(/precio|cu[aá]nto|inicial|cuota/.test(t)) return { texto: 'La BRZ 200 está en $1,750: inicial desde $700 (40%) y cuota quincenal de $148 a 12 meses. Son montos de referencia; tu asesor los confirma. ¿Te interesa esa o quieres ver otras?' };
  if(/piden|requisito|papeles|documento|necesito/.test(t)) return { texto: 'Es sencillo: llenas la solicitud en pagasi.io/solicitar (datos personales, trabajo e ingresos y dos referencias), la revisa un asesor y te escribe por WhatsApp. Sin garantía de aprobación hasta esa revisión. ¿Quieres que te llamen?' };
  if(/quiero|c[oó]mo hago|ll[aá]menme|llamen|interesa/.test(t)) return { texto: conv && conv.canal === 'instagram' ? 'Dame tu nombre, tu ciudad y tu WhatsApp y un asesor te escribe hoy mismo 🙌' : 'Dime tu nombre y tu ciudad y un asesor te escribe por aquí mismo hoy 🙌', atencion: 'lead' };
  if(/maracay|valencia|caracas|barquisimeto|tienen en/.test(t)) return { texto: 'Trabajamos con concesionarios aliados; tu asesor te confirma la sede más cercana y la disponibilidad. ¿Qué modelo te interesa?' };
  if(/persona|humano|asesor/.test(t)) return { texto: 'Claro, ya le avisé a un asesor de Pagasi para que te escriba por aquí.', atencion: 'pide_persona' };
  return { texto: '¡Hola! Soy el asistente de Pagasi. ¿Qué moto te interesa o en qué ciudad estás? Te digo inicial y cuota al momento.' };
}
function waDemoClienteEscribe(id, texto){
  var c = _waConv(id); if(!c) return;
  var hora = new Date().toISOString();
  (_waRoot._waMsgs[id] = _waRoot._waMsgs[id] || []).push({ id: 'local-' + Date.now(), autor: 'cliente', direccion: 'entrante', tipo: 'texto', texto: texto, hora: hora, estado: 'recibido' });
  Object.assign(c, { ultimoMensaje: texto, ultimoMensajeHora: hora, ultimoEntranteHora: hora, noLeidos: (c.noLeidos || 0) + 1 });
  if(typeof _waPintarHilo === 'function') _waPintarHilo(id);
  if(c.modo !== 'bot') return;
  setTimeout(function(){
    var r = (c.area === 'ventas' ? waDemoResponderVentas : waDemoResponder)(c, texto), h2 = new Date().toISOString();
    _waRoot._waMsgs[id].push({ id: 'local-' + Date.now(), autor: 'asistente', direccion: 'saliente', tipo: 'texto', texto: r.texto, hora: h2, estado: 'entregado' });
    Object.assign(c, { ultimoMensaje: r.texto, ultimoMensajeHora: h2, atencion: r.atencion || c.atencion || '', borrador: r.borrador || c.borrador || null, resumen: r.borrador ? 'Prometió pagar el ' + _waFechaCorta(r.borrador.fecha) + '.' : c.resumen });
    if(typeof _waPintarHilo === 'function') _waPintarHilo(id);
    if(typeof _waPintarLista === 'function') _waPintarLista();
  }, 900);
}
function waGuardarInstrucciones(texto, datosPago, ventas){
  if(typeof isAdminUser === 'function' && !isAdminUser()){ toast('Solo un administrador cambia las instrucciones del asistente', 'error'); return; }
  var datos = { actualizadoPor: (S.currentUser && S.currentUser.nombre) || '', actualizadoEn: new Date().toISOString() };
  if(typeof texto === 'string') datos.instrucciones = texto;        // cobranza
  if(typeof datosPago === 'string') datos.datosPago = datosPago;   // cómo pagar: lo que el asistente le dice al cliente
  if(typeof ventas === 'string') datos.instruccionesVentas = ventas;   // lo que sabe el de ventas (Instagram)
  _waRoot._waCfg = Object.assign(_waRoot._waCfg || {}, datos);
  var fin = function(){ if(typeof logActividad === 'function') logActividad('asistente_instrucciones', 'whatsapp', 'config/asistente', { campos: Object.keys(datos).join(',') }); toast('Instrucciones guardadas: el asistente las lee en su próxima respuesta', 'success'); };
  if(typeof db === 'undefined' || !db){ fin(); return; }
  db.collection('config').doc('asistente').set(datos, { merge: true }).then(fin).catch(function(e){ toast('No se pudo guardar: ' + (e && e.message || e), 'error'); });
}
if(typeof module !== 'undefined' && module.exports) module.exports = { waTelE164: waTelE164, waColaHoy: waColaHoy, waPlantilla: waPlantilla, waDemoResponder: waDemoResponder, waVentanaAbierta: waVentanaAbierta, waEmpresa: waEmpresa, waDemoResponderVentas: waDemoResponderVentas, waConectadoCanal: waConectadoCanal, _waModuloDe: _waModuloDe, WA_GRUPOS: WA_GRUPOS, WA_URL_EQUIPO: WA_URL_EQUIPO };
