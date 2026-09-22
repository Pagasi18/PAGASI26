// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
/* Posiciones de los GPS — MiCODUS → Firestore.

   El navegador no puede consultar a MiCODUS desde pagasi.io (CORS), asi que
   este job es la unica forma de que el mapa se actualice solo.

   Solo consulta la posicion de los equipos que en PAGASI estan marcados como
   instalados: son los unicos que estan en una moto. Preguntar por los 500
   seria 500 llamadas para nada.

   Credenciales: MICODUS_USER y MICODUS_PASS, de los secretos del repo.
   Van las de la cuenta principal.

   Hubo una subcuenta de solo lectura (pagasi-lectura) porque creiamos que
   MiCODUS mandaba la clave en la query string. No es asi: el login que
   funciona es un POST de formulario y la clave viaja en el cuerpo. Y la
   subcuenta salia cara: en MiCODUS mover un equipo a una subcuenta lo SACA
   de la principal, asi que cada GPS recien instalado habia que moverlo a
   mano o no aparecia en el mapa. Eso ya dejo una moto invisible.

   Este job solo LEE (GetDevices y GetTracking). No manda comandos.

   Uso local sin escribir nada:  node gps-micodus.js --dry                */

const DRY  = process.argv.includes('--dry');
const BASE = 'https://www.micodus.net';
const USER = process.env.MICODUS_USER || '';
const PASS = process.env.MICODUS_PASS || '';

// Cuantas horas sin reportar antes de considerarlo caido
const HORAS_CAIDO = 48;

// Barrido automatico (Adam, 14-sep-2026: "que se actualice una vez al dia a las
// 8 am, y luego el boton"). Antes se barria cada hora (a 500 motos, unos 45
// centavos al mes).
//   - SIN pedido: toca el barrido del dia si el ultimo EMPEZO antes de las
//     ultimas 8:00 am de Venezuela (12:00 UTC; Venezuela no cambia de hora).
//     El Worker dispara a esa hora y el respaldo de GitHub a las 10: si el de
//     las 8 ya barrio, el respaldo no repite. Un boton tocado ayer por la tarde
//     NO cuenta como el de hoy (con una ventana de 20 h si lo anulaba).
//   - CON pedido (boton del modulo GPS o de Mi cuenta): se barre al momento.
const HORA_BARRIDO_UTC = 12;

// Las 8:00 am de Venezuela mas recientes que ya pasaron
function anclaDiaria(ahoraMs) {
  const d = new Date(ahoraMs);
  const hoy = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), HORA_BARRIDO_UTC);
  return ahoraMs >= hoy ? hoy : hoy - 86400000;
}

// ¿Toca barrer? Puro, para las pruebas. Con fechas raras, barre (mejor de mas).
function decidirBarrido(o) {
  const ahora = Number(o && o.ahoraMs);
  const ultimo = Number(o && o.ultimoMs) || 0;
  // El boton del modulo cuenta como pedido si la bandera sigue en pie, o si se
  // toco DESPUES de que empezo el ultimo barrido (lo tocaron mientras corria).
  const pedidoApp = !!(o && (o.refrescoPedido || (Number(o.refrescoPedidoEnMs) || 0) > ultimo));
  const pedido = pedidoApp || !!(o && o.pidioCliente);
  const diario = !ultimo || !isFinite(ahora) || ultimo < anclaDiaria(ahora);
  return { barrer: pedido || diario,
    motivo: pedido ? (pedidoApp ? 'app' : 'cliente') : diario ? 'diario' : 'nada' };
}

// MiCODUS fallo en la mitad o mas de los equipos (p. ej. se le cayo la sesion a
// mitad): ese barrido no cuenta como hecho.
function barridoFallido(o) {
  const errores = Number(o && o.errores) || 0;
  return errores > 0 && errores >= (Number(o && o.ok) || 0) + (Number(o && o.sinCambio) || 0);
}

// Deja el error en config/gps para que el panel lo muestre (sin romper si no se puede)
async function anotarError(db, texto) {
  if (!db) return;
  try {
    await db.collection('config').doc('gps').set({ ultimoError: String(texto).slice(0, 300), ultimoErrorEn: new Date().toISOString() }, { merge: true });
  } catch (e) { console.log('WARN no se pudo anotar el error: ' + e.message); }
}

// ── Sesion ────────────────────────────────────────────────────────
// Su login es un GET con las credenciales en la URL. Guardamos las cookies
// a mano porque fetch de Node no las persiste entre llamadas.
let COOKIES = {};

function guardarCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie()
            : (res.headers.raw ? res.headers.raw()['set-cookie'] || [] : []);
  for (const c of raw) {
    const [par] = c.split(';');
    const i = par.indexOf('=');
    if (i > 0) COOKIES[par.slice(0, i).trim()] = par.slice(i + 1).trim();
  }
}

function cabeceraCookie() {
  return Object.entries(COOKIES).map(([k, v]) => k + '=' + v).join('; ');
}

async function pedir(url, opts = {}) {
  const res = await fetch(BASE + url, {
    ...opts,
    redirect: 'manual',
    headers: { 'Cookie': cabeceraCookie(), ...(opts.headers || {}) },
  });
  guardarCookies(res);
  return res;
}

async function entrar() {
  if (!USER || !PASS) throw new Error('faltan MICODUS_USER / MICODUS_PASS');

  // Su login es un formulario ASP.NET WebForms: hay que traer __VIEWSTATE y
  // __EVENTVALIDATION de la pagina y devolverlos en el POST, o el servidor lo
  // rechaza. UrlLoginGet.aspx, que parecia el camino corto, es solo el enlace
  // de la cuenta demo.
  const pag = await pedir('/Login2.aspx?v=2');
  const html = await pag.text();

  const oculto = (n) => {
    const re = new RegExp('name="' + n + '"[^>]*value="([^"]*)"');
    const re2 = new RegExp('value="([^"]*)"[^>]*name="' + n + '"');
    const m = html.match(re) || html.match(re2);
    return m ? m[1] : '';
  };

  const form = new URLSearchParams({
    __VIEWSTATE:          oculto('__VIEWSTATE'),
    __VIEWSTATEGENERATOR: oculto('__VIEWSTATEGENERATOR'),
    __EVENTVALIDATION:    oculto('__EVENTVALIDATION'),
    // 0 = entrar por cuenta; 1 es por numero de ID, que es lo que trae la
    // pagina por defecto. Mandar 1 hace que ignore usuario y clave.
    LType:                '0',
    hidGMT:               '0',
    hidLanguage:          'en-us',
    hidYiwenGUID2:        oculto('hidYiwenGUID2'),
    txtUserName:          USER,
    txtAccountPassword:   PASS,
    txtImeiNo:            '',
    txtImeiPassword:      '',
    btnLogin:             'Login',
  });

  if (!form.get('__VIEWSTATE')) throw new Error('no se pudo leer el formulario de login');

  const res = await pedir('/Login2.aspx?v=2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': BASE + '/Login2.aspx?v=2',
    },
    body: form.toString(),
  });

  // Un login bueno responde con redireccion; uno malo vuelve a pintar el
  // formulario con HTTP 200.
  if (res.status >= 300 && res.status < 400) {
    const destino = res.headers.get('location');
    if (destino) await pedir(destino.startsWith('http') ? destino.replace(BASE, '') : destino);
  }

  // Comprobar de verdad: con la clave mala MiCODUS devuelve HTTP 200 y el job
  // seguiria "sin errores" sin escribir nada, que es la peor forma de fallar.
  const uid = await miUserID();
  if (!uid) throw new Error('no se pudo iniciar sesion en MiCODUS (revisa usuario y clave)');
  return uid;
}

// ── Sus respuestas ────────────────────────────────────────────────
// Vienen envueltas en {"d": "..."} y lo de adentro es JavaScript relajado,
// con las claves sin comillas. JSON.parse directo falla.
function abrir(d) {
  if (!d || d === '' || d === '{}') return null;
  return JSON.parse(d.replace(/([{,])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":'));
}

async function llamar(metodo, cuerpo) {
  const res = await pedir('/Ajax/' + metodo, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  if (!res.ok) throw new Error(metodo + ' HTTP ' + res.status);
  const j = await res.json();
  return abrir(j.d);
}

async function listarEquipos(userID) {
  const r = await llamar('DevicesAjax.asmx/GetDevices', {
    UserID: userID, PageNo: 1, PageCount: 1000, SN: '', TimeZones: '', ExpDays: 0,
  });
  return (r && r.devices) || [];
}

// TimeZone 0 para que las marcas vengan en UTC, que es como las guardamos.
async function posicionDe(deviceID) {
  return llamar('DevicesAjax.asmx/GetTracking', { DeviceID: deviceID, TimeZone: '0' });
}

// El UserID de la cuenta con la que entramos. Antes salia de GetLowerUsers2,
// que lista SUBCUENTAS: una cuenta End User no tiene, asi que devolvia vacio y
// el job se quedaba sin saber a quien preguntarle. La plataforma deja el id en
// un campo oculto de su propia pagina, y eso funciona para los dos tipos.
async function miUserID() {
  if (process.env.MICODUS_USERID) return Number(process.env.MICODUS_USERID);
  // Monitor.aspx existe para los dos tipos de cuenta; Distributor.aspx no.
  for (const pag of ['/Monitor.aspx', '/Distributor.aspx', '/Main.aspx']) {
    try {
      const r = await pedir(pag);
      if (r.status >= 300 && r.status < 400) continue;   // rebote al login
      const html = await r.text();
      const m = html.match(/id="hidUserID"[^>]*value="(\d+)"/)
             || html.match(/name="hidUserID"[^>]*value="(\d+)"/)
             || html.match(/hidUserID"?\s*value="(\d+)"/);
      if (m && Number(m[1]) > 0) return Number(m[1]);
    } catch (e) { /* siguiente */ }
  }
  // Ultimo recurso: si es distribuidor, GetLowerUsers2 devuelve su propio id
  try {
    const r = await llamar('UsersAjax.asmx/GetLowerUsers2',
      { UserID: 0, PageNo: 1, PageCount: 1, UserType: -1, IsChildUser: false, Key: '' });
    if (r && r.userID) return Number(r.userID);
  } catch (e) { /* nada */ }
  return 0;
}

function numero(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function horasDesde(utc) {
  if (!utc) return null;
  const d = new Date(String(utc).replace(' ', 'T') + 'Z');
  return isNaN(d) ? null : Math.max(0, Math.round((Date.now() - d.getTime()) / 3600000));
}

// ── GPS en Mi cuenta (Adam, 14-sep-2026) ─────────────────────────
// ¿Algun cliente pidio "Actualizar ubicacion" despues del ultimo barrido?
// pedidos: [{ id, pedidoMs }] de pedidos_gps (hora del servidor).
function hayPedidoNuevo(pedidos, ultimoMs) {
  return (pedidos || []).some(p => Number(p.pedidoMs) > (Number(ultimoMs) || 0));
}

// Que hacer con las fichas que ve el cliente (ubicacion_cliente/{credId}):
// se ponen al dia con la ultima posicion conocida del equipo instalado en ese
// credito, y se borran si ese credito ya no tiene equipo instalado. La ficha
// es la unica fuente de verdad: existe = un admin se lo activo. La ficha lleva SOLO posicion, hora de la
// ultima senal, hora de revision y la direccion del boton: nunca la clave,
// el IMEI ni la linea del equipo.
function planFichas(fichaIds, instalados, posiciones, ahoraISO, workerUrl) {
  const porCred = {};
  (instalados || []).forEach(g => { if (g && g.creditoId) porCred[String(g.creditoId)] = g; });
  const sets = [], deletes = [];
  (fichaIds || []).forEach(credId => {
    const g = porCred[String(credId)];
    if (!g) { deletes.push(String(credId)); return; }
    const p = (posiciones && posiciones[g._id]) || g;
    sets.push({ credId: String(credId), data: {
      credId: String(credId),
      lat: typeof p.lat === 'number' ? p.lat : null,
      lng: typeof p.lng === 'number' ? p.lng : null,
      ultimaSenal: p.ultimaSenal || '',
      revisado: ahoraISO,
      workerUrl: workerUrl || '',
    }});
  });
  return { sets, deletes };
}

// Exportado para las pruebas; el job solo corre si se invoca directo.
module.exports = { abrir, horasDesde, numero, HORAS_CAIDO, hayPedidoNuevo, planFichas, entrar, listarEquipos, decidirBarrido, anclaDiaria, barridoFallido, HORA_BARRIDO_UTC };

// ── Principal ─────────────────────────────────────────────────────
if (require.main !== module) return;

(async () => {
  let db = null, instalados = [], workerUrl = '', inicioBarrido = '';

  if (!DRY) {
    const { Firestore } = require('@google-cloud/firestore');
    db = new Firestore({ projectId: _proyecto() });

    // El job corre seguido pero casi siempre no hace nada: solo lee un
    // documento para ver si toca. Trabaja cuando alguien pidio refresco desde
    // el app, o una vez al dia a la hora del barrido.
    const cfgRef = db.collection('config').doc('gps');
    const cfg = (await cfgRef.get()).data() || {};
    workerUrl = String(cfg.workerUrl || '');
    const ultimo = cfg.ultimaSync ? new Date(cfg.ultimaSync).getTime() : 0;
    const minutos = ultimo ? Math.round((Date.now() - ultimo) / 60000) : 99999;

    // Pedidos de los clientes desde Mi cuenta (boton "Actualizar ubicacion")
    let pidioCliente = false;
    try {
      const pedSnap = await db.collection('pedidos_gps').get();
      pidioCliente = hayPedidoNuevo(pedSnap.docs.map(d => {
        const t = d.data().pedidoEn;
        return { id: d.id, pedidoMs: t && typeof t.toMillis === 'function' ? t.toMillis() : 0 };
      }), ultimo);
    } catch (e) { console.log('WARN pedidos de Mi cuenta: ' + e.message); }

    const decision = decidirBarrido({ refrescoPedido: cfg.refrescoPedido, refrescoPedidoEnMs: cfg.refrescoPedidoEn ? new Date(cfg.refrescoPedidoEn).getTime() : 0,
      pidioCliente, ultimoMs: ultimo, ahoraMs: Date.now() });
    const ultimoTxt = minutos >= 99999 ? 'no hay barridos anteriores'
      : 'ultimo hace ' + (minutos < 120 ? minutos + ' min' : Math.round(minutos / 60) + ' h');

    if (!decision.barrer) {
      console.log('Nada que hacer (' + ultimoTxt + '; sin pedido solo se barre una vez al dia, desde las 8 am)');
      return;
    }
    console.log(decision.motivo === 'app' ? 'Refresco pedido desde el app'
      : decision.motivo === 'cliente' ? 'Refresco pedido por un cliente desde Mi cuenta'
      : 'Barrido del dia (' + ultimoTxt + ')');

    // La bandera del boton del modulo se apaga al TERMINAR bien (abajo): si el
    // barrido falla, el pedido sigue en pie y la proxima corrida lo atiende.
    // ultimaSync guarda la hora de INICIO: un pedido hecho mientras corre queda
    // mas nuevo que ultimaSync y la corrida que espera turno lo atiende.
    inicioBarrido = new Date().toISOString();
    await cfgRef.set({ ultimoIntento: inicioBarrido }, { merge: true });
    // Se piden SOLO los instalados. Leer la coleccion entera costaba 500
    // lecturas por corrida —36.000 al dia— para vigilar dos motos.
    const snap = await db.collection('gps').where('estado', '==', 'instalado').get();
    instalados = snap.docs
      .map(d => ({ _id: d.id, ...d.data() }))
      .filter(g => !g.eliminado && g.idGps);
    if (!instalados.length) {
      console.log('No hay equipos instalados en PAGASI. Nada que consultar.');
      return;
    }
  }

  let userID = 0;
  try {
    userID = await entrar();
  } catch (e) {
    // Transitorio o clave mala. Se anota para que el panel lo muestre, y la corrida
    // sale en rojo: con un barrido al dia, un fallo no debe pasar callado.
    console.log('ERROR ' + e.message);
    await anotarError(db, 'No se pudo entrar a MiCODUS: ' + e.message);
    process.exit(1);
  }
  console.log('MiCODUS: entramos como UserID ' + userID);

  const equipos = await listarEquipos(userID);
  console.log('MiCODUS: ' + equipos.length + ' equipos en la cuenta');
  if (!equipos.length) { console.log('ERROR la cuenta no devolvio equipos'); await anotarError(db, 'MiCODUS no devolvio equipos'); process.exit(1); }

  const porSerial = {};
  equipos.forEach(e => { if (e.sn) porSerial[String(e.sn)] = e; });

  if (DRY) {
    const conPlaca = equipos.filter(e => e.carNum);
    console.log('(dry-run) ' + conPlaca.length + ' con placa asignada');
    for (const e of conPlaca.slice(0, 5)) {
      const p = await posicionDe(e.id);
      console.log('  ' + e.sn + ' ' + (e.carNum || '') + ' → '
        + (p ? p.latitude + ', ' + p.longitude + '  ' + p.deviceUtcDate
             + '  bat ' + p.battery + '%  ' + p.status
             : 'sin posicion'));
    }
    return;
  }

  let ok = 0, sinPos = 0, noEstan = 0, caidos = 0, sinCambio = 0, errores = 0;
  const lote = db.batch();
  const posiciones = {};   // lo recien leido, para las fichas de Mi cuenta

  for (const g of instalados) {
    const eq = porSerial[String(g.idGps)];
    if (!eq) { noEstan++; console.log('  ' + g.idGps + ' no esta en la cuenta de MiCODUS'); continue; }

    let p = null;
    try { p = await posicionDe(eq.id); }
    catch (e) { errores++; console.log('  ' + g.idGps + ' error: ' + e.message); continue; }
    if (!p) { sinPos++; continue; }

    const lat = numero(p.latitude), lng = numero(p.longitude);
    if (lat === null || lng === null || (lat === 0 && lng === 0)) { sinPos++; continue; }

    const horas = horasDesde(p.deviceUtcDate);
    const caido = horas !== null && horas > HORAS_CAIDO;
    if (caido) caidos++;

    // Una moto estacionada manda la misma posicion cada vez. Reescribirla es
    // pagar por no cambiar nada: la mayoria de las motos estan quietas la
    // mayor parte del dia.
    const igual = g.ultimaSenal === (p.deviceUtcDate || '')
      && Math.abs((g.lat || 0) - lat) < 0.00002
      && Math.abs((g.lng || 0) - lng) < 0.00002;
    if (igual) { sinCambio++; continue; }

    posiciones[g._id] = { lat, lng, ultimaSenal: p.deviceUtcDate || '' };
    lote.set(db.collection('gps').doc(g._id), {
      lat, lng,
      ultimaSenal:  p.deviceUtcDate || '',
      bateria:      numero(p.battery),
      voltaje:      p.dy || '',
      acc:          numero(p.acc),
      velocidad:    numero(p.speed),
      rumbo:        numero(p.course),
      dataType:     numero(p.dataType),
      satelites:    numero(p.satellite),
      senal:        numero(p.signal),
      odometro:     numero(p.distance),
      // La placa la manda MiCODUS y sirve para cotejar contra el credito.
      placaMicodus: eq.carNum || '',
      estadoMicodus: caido ? 'SIN SEÑAL RECIENTE' : (p.status || 'ONLINE / OK'),
      sincronizadoEn: new Date().toISOString(),
    }, { merge: true });
    ok++;
  }

  const cfgFin = db.collection('config').doc('gps');
  // Si MiCODUS fallo en la mitad o mas de los equipos, no se da el barrido por
  // hecho: no se tocan ultimaSync ni las fichas de Mi cuenta (que dirian
  // "ubicacion actualizada"), y la corrida sale en rojo para que el respaldo o un
  // boton vuelvan a intentar. Las posiciones que si llegaron se guardan igual.
  if (barridoFallido({ errores, ok, sinCambio })) {
    if (ok) await lote.commit();
    await anotarError(db, 'MiCODUS fallo en ' + errores + ' de ' + instalados.length + ' equipos');
    console.log('ERROR MiCODUS fallo en ' + errores + ' de ' + instalados.length + ' equipos: el barrido no se marca como hecho');
    process.exit(1);
  }

  if (ok) await lote.commit();
  await cfgFin.set({
    ultimaSync: inicioBarrido || new Date().toISOString(),
    ultimaSyncEquipos: ok,
    ultimaSyncSinCambio: sinCambio,
    ultimoError: '',
    refrescoPedido: false,
  }, { merge: true });

  // Fichas de Mi cuenta: posicion + hora de revision de cada credito al que un
  // admin le activo el GPS. "revisado" cambia en CADA barrido: la pagina del
  // cliente lo usa para saber que su pedido ya se atendio. Lleva la hora de
  // INICIO del barrido: un pedido hecho mientras corria no se da por atendido.
  try {
    const fichasSnap = await db.collection('ubicacion_cliente').get();
    if (!fichasSnap.empty) {
      const plan = planFichas(fichasSnap.docs.map(d => d.id), instalados, posiciones, inicioBarrido || new Date().toISOString(), workerUrl);
      let alDia = 0, quitadas = 0;
      for (const x of plan.sets) {
        // update y no set: si un admin la quito mientras corria el barrido, no se revive
        try { await db.collection('ubicacion_cliente').doc(x.credId).update(x.data); alDia++; }
        catch (e) { if (e.code !== 5) console.log('WARN ficha de Mi cuenta: ' + e.message); }
      }
      for (const id of plan.deletes) {
        try { await db.collection('ubicacion_cliente').doc(id).delete(); quitadas++; }
        catch (e) { console.log('WARN ficha de Mi cuenta: ' + e.message); }
      }
      console.log('Mi cuenta: ' + alDia + ' ficha(s) al dia' + (quitadas ? ' · ' + quitadas + ' quitada(s)' : ''));
    }
  } catch (e) { console.log('WARN fichas de Mi cuenta: ' + e.message); }
  console.log('Actualizados ' + ok + ' equipos'
    + (sinCambio ? ' · ' + sinCambio + ' sin moverse (no se reescriben)' : '')
    + (sinPos   ? ' · ' + sinPos   + ' sin posicion' : '')
    + (noEstan  ? ' · ' + noEstan  + ' no estan en MiCODUS' : '')
    + (caidos   ? ' · ' + caidos   + ' sin señal hace mas de ' + HORAS_CAIDO + 'h' : ''));
})().catch(e => { console.error('ERROR', e); process.exit(1); });
