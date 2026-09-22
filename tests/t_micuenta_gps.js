// GPS en Mi cuenta (Adam, 14-sep-2026): la tarjeta del portal del cliente.
// Solo aparece si Pagasi le activó el GPS a ese crédito. El botón deja un
// pedido (una vez por hora: lo hacen cumplir las reglas de Firebase), avisa al
// Worker y espera a que el robot marque la ficha como revisada. Se prueba la
// sección tal cual está en micuenta.html, con Firebase, el mapa y los
// temporizadores de mentira.
const fs = require('fs'), path = require('path');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'micuenta.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const ini = HTML.indexOf('/* ── GPS en Mi cuenta');
const fin = HTML.indexOf('/* ── Estado de un credito');
ok('la sección del GPS está en micuenta.html', ini > 0 && fin > ini);
const SRC = HTML.slice(ini, fin);
const ESC = (HTML.match(/function esc\(s\)\{[^\n]*\}/) || [''])[0];
ok('se encontró esc() del portal', !!ESC);

// ── Firebase, mapa y página de mentira ──
const AHORA = Date.now();
const HORA = 60 * 60 * 1000;
let docs, escrituras, lecturas, errorSet, fetches, timers, marcas, mapas, els;
function reiniciar() {
  docs = {}; escrituras = []; lecturas = []; errorSet = null; fetches = []; timers = []; marcas = []; mapas = []; els = {};
  S.creditos = []; S.gpsPorCred = {}; S.gpsPedidoPorCred = {}; S.master = false;
}
const SERVER = { __server: true };
const db = {
  collection: col => ({
    doc: id => ({
      get: () => {
        const k = col + '/' + id; lecturas.push(k);
        if (docs[k] === 'DENEGADO') return Promise.reject({ code: 'permission-denied', message: 'Missing or insufficient permissions.' });
        return Promise.resolve({ exists: k in docs, data: () => docs[k] });
      },
      set: data => {
        escrituras.push({ ruta: col + '/' + id, data });
        if (errorSet) return Promise.reject(errorSet);
        const guardado = {};
        Object.keys(data).forEach(c => { guardado[c] = data[c] === SERVER ? { toMillis: () => AHORA } : data[c]; });
        docs[col + '/' + id] = guardado;
        return Promise.resolve();
      },
    }),
  }),
};
const firebase = { firestore: { FieldValue: { serverTimestamp: () => SERVER } } };
let workerOk = true;
const fetchF = (url, opt) => { fetches.push({ url, metodo: opt && opt.method }); return Promise.resolve({ ok: workerOk, status: workerOk ? 200 : 502 }); };
const setTimeoutF = fn => { timers.push(fn); return timers.length; };
const L = {
  map: el => { const m = { el, centro: null, zoom: 16, setView(c, z) { this.centro = c; this.zoom = z; return this; }, getZoom() { return this.zoom; }, invalidateSize() {}, remove() {} }; mapas.push(m); return m; },
  tileLayer: () => ({ addTo() { return this; } }),
  marker: c => { const k = { pos: c, addTo() { return this; }, setLatLng(n) { this.pos = n; } }; marcas.push(k); return k; },
};
const $ = id => {
  if (!els[id]) {
    const clases = new Set();
    els[id] = { id, innerHTML: '', textContent: '', disabled: false,
      classList: { add: c => clases.add(c), remove: c => clases.delete(c), contains: c => clases.has(c) } };
  }
  return els[id];
};
const S = {};
reiniciar();
const ventana = { L };
const documento = { head: { appendChild() {} }, createElement: () => ({}) };
const API = new Function('S', '$', 'db', 'firebase', 'fetch', 'setTimeout', 'L', 'window', 'document',
  ESC + '\n' + SRC + '\n;return { cargarGpsCliente, gpsHTML, actualizarGps, esperarGps, msSenal, haceCuanto, gpsMetaHTML, gpsNotaBoton, pintarMapasGps };'
)(S, $, db, firebase, fetchF, setTimeoutF, L, ventana, documento);

const vaciar = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
const correrTimers = async () => { const t = timers.splice(0); for (const fn of t) { fn(); await vaciar(); } };

(async () => {
  // ── Qué ve el cliente al entrar ──
  S.creditos = [{ id: 'CRED-523' }, { id: 'CRED-600' }, { id: 'CRED-700' }];
  docs['ubicacion_cliente/CRED-523'] = { credId: 'CRED-523', lat: 10.48, lng: -66.9, ultimaSenal: '2026-09-14 16:02:11', revisado: new Date(AHORA - 30 * 60000).toISOString(), workerUrl: 'https://w.example/' };
  docs['pedidos_gps/CRED-523'] = { pedidoEn: { toMillis: () => AHORA - 10 * 60000 } };
  docs['ubicacion_cliente/CRED-700'] = 'DENEGADO';     // reglas aún sin publicar
  await API.cargarGpsCliente();
  ok('carga la ficha del crédito con GPS activado', !!S.gpsPorCred['CRED-523'] && S.gpsPorCred['CRED-523'].lat === 10.48);
  ok('crédito sin ficha: nada', !('CRED-600' in S.gpsPorCred));
  ok('lectura denegada (reglas sin publicar): nada y sin romper', !('CRED-700' in S.gpsPorCred));
  ok('recuerda cuándo fue el último pedido', S.gpsPedidoPorCred['CRED-523'] === AHORA - 10 * 60000);
  ok('solo consulta sus propios créditos', lecturas.length > 0 && lecturas.every(k => /CRED-(523|600|700)$/.test(k)));

  ok('sin GPS activado no aparece nada en la página', API.gpsHTML({ id: 'CRED-600' }) === '');
  const h523 = API.gpsHTML({ id: 'CRED-523' });
  ok('con GPS activado aparece "Dónde está tu moto" con mapa y botón', h523.indexOf('Dónde está tu moto') > -1 && h523.indexOf('gps-CRED-523-mapa') > -1 && h523.indexOf('Actualizar ubicación') > -1);
  ok('pidió hace 10 min: botón apagado y le dice a qué hora puede', /-btn" disabled/.test(h523) && h523.indexOf('Podrás actualizar de nuevo a las') > -1);
  ok('muestra la hora de la última señal', h523.indexOf('Última señal: hace') > -1);
  ok('sin "undefined" ni "NaN" en la tarjeta', !/undefined|NaN/.test(h523));

  S.gpsPedidoPorCred['CRED-523'] = AHORA - 2 * HORA;
  const hLibre = API.gpsHTML({ id: 'CRED-523' });
  ok('pidió hace 2 horas: botón encendido', !/-btn" disabled/.test(hLibre) && hLibre.indexOf('Puedes actualizar una vez por hora.') > -1);

  S.master = true;
  const hMaster = API.gpsHTML({ id: 'CRED-523' });
  ok('modo Pagasi: botón apagado y aviso de solo lectura', /-btn" disabled/.test(hMaster) && hMaster.indexOf('Modo Pagasi: solo lectura') > -1);
  escrituras = [];
  API.actualizarGps('CRED-523'); await vaciar();
  ok('modo Pagasi: tocar el botón no escribe nada (no gasta la hora del cliente)', escrituras.length === 0 && fetches.length === 0);
  S.master = false;

  // ── Horas ──
  ok('hora MiCODUS (UTC) bien leída', API.msSenal('2026-09-14 16:02:11') === Date.UTC(2026, 8, 14, 16, 2, 11));
  ok('hora con zona se respeta', API.msSenal('2026-09-14T12:02:11-04:00') === Date.UTC(2026, 8, 14, 16, 2, 11));
  ok('revisión a mano (solo el día) no se rompe', API.msSenal('2026-09-14') === Date.UTC(2026, 8, 14, 12, 0, 0));
  ok('texto raro: 0', API.msSenal('ayer') === 0 && API.msSenal('') === 0 && API.msSenal(null) === 0);
  ok('solo el día: "Última señal: el 14/09"', API.gpsMetaHTML({ ultimaSenal: '2026-09-14' }) === 'Última señal: el 14/09');
  ok('sin señal: lo dice claro', API.gpsMetaHTML({}).indexOf('todavía no ha enviado') > -1);
  const n = Date.now();
  ok('hace 1 minuto', API.haceCuanto(n - 60000) === 'hace 1 minuto');
  ok('hace 5 minutos', API.haceCuanto(n - 5 * 60000) === 'hace 5 minutos');
  ok('hace 3 horas', API.haceCuanto(n - 3 * HORA) === 'hace 3 horas');
  ok('1 hora y 35 min: "hace 1 hora" (no redondea para arriba)', API.haceCuanto(n - 95 * 60000) === 'hace 1 hora');
  ok('hace 3 días', API.haceCuanto(n - 72 * HORA) === 'hace 3 días');
  ok('reloj adelantado: "hace un momento"', API.haceCuanto(n + 5 * 60000) === 'hace un momento');

  // ── Tocar "Actualizar ubicación" ──
  reiniciar();
  S.creditos = [{ id: 'CRED-523' }];
  docs['ubicacion_cliente/CRED-523'] = { credId: 'CRED-523', lat: 10.48, lng: -66.9, ultimaSenal: '2026-09-14 15:00:00', revisado: new Date(AHORA - 2 * HORA).toISOString(), workerUrl: 'https://w.example/' };
  docs['pedidos_gps/CRED-523'] = { pedidoEn: { toMillis: () => AHORA - 2 * HORA } };
  await API.cargarGpsCliente();
  API.pintarMapasGps(); await vaciar();
  ok('pinta el mapa con el punto de la moto', mapas.length === 1 && marcas.length === 1 && marcas[0].pos[0] === 10.48 && marcas[0].pos[1] === -66.9);

  API.actualizarGps('CRED-523'); await vaciar();
  const ped = escrituras.find(e => e.ruta === 'pedidos_gps/CRED-523');
  ok('deja el pedido en pedidos_gps/CRED-523', !!ped);
  ok('el pedido lleva SOLO pedidoEn con la hora del servidor', !!ped && Object.keys(ped.data).join() === 'pedidoEn' && ped.data.pedidoEn === SERVER);
  ok('no escribe nada más', escrituras.length === 1);
  ok('avisa al Worker (POST a /gps-refresco, sin barra doble)', fetches.length === 1 && fetches[0].url === 'https://w.example/gps-refresco' && fetches[0].metodo === 'POST');
  ok('la hora del pedido es la del servidor', S.gpsPedidoPorCred['CRED-523'] === AHORA);
  ok('el botón dice "Buscando tu moto..." y queda apagado', $('gps-CRED-523-btn').textContent === 'Buscando tu moto...' && $('gps-CRED-523-btn').disabled === true);
  ok('mientras espera, le pide dejar la página abierta', $('gps-CRED-523-nota').textContent.indexOf('Deja esta página abierta') > -1);
  ok('todavía no llegó el robot: sigue esperando', timers.length >= 1);

  // Llega el robot: posición nueva y ficha revisada
  docs['ubicacion_cliente/CRED-523'] = Object.assign({}, docs['ubicacion_cliente/CRED-523'], { lat: 10.5, lng: -66.8, ultimaSenal: '2026-09-14 21:59:00', revisado: new Date(AHORA + 40000).toISOString() });
  await correrTimers();
  ok('al llegar el robot: la moto se mueve en el mismo mapa', marcas[0].pos[0] === 10.5 && marcas[0].pos[1] === -66.8 && mapas.length === 1);
  ok('al llegar el robot: "Listo, ubicación actualizada" y la próxima hora', $('gps-CRED-523-nota').textContent.indexOf('Listo, ubicación actualizada.') === 0 && $('gps-CRED-523-nota').textContent.indexOf('Podrás actualizar de nuevo a las') > -1);
  ok('sin punto doble al final ("p. m.." no)', $('gps-CRED-523-nota').textContent.indexOf('..') === -1);
  ok('el botón vuelve a su texto pero apagado por una hora', $('gps-CRED-523-btn').textContent === 'Actualizar ubicación' && $('gps-CRED-523-btn').disabled === true);
  ok('se actualiza la hora de la última señal', $('gps-CRED-523-meta').innerHTML.indexOf('Última señal:') === 0);

  // Otra vez dentro de la hora: no escribe
  escrituras = []; fetches = [];
  API.actualizarGps('CRED-523'); await vaciar();
  ok('dentro de la hora: no deja otro pedido ni llama al Worker', escrituras.length === 0 && fetches.length === 0);
  ok('dentro de la hora: le dice a qué hora puede', $('gps-CRED-523-nota').textContent.indexOf('Podrás actualizar de nuevo a las') === 0);

  // Las reglas lo rechazan (p. ej. pidió desde otro teléfono hace 20 min)
  S.gpsPedidoPorCred['CRED-523'] = AHORA - 2 * HORA;
  errorSet = { code: 'permission-denied', message: 'Missing or insufficient permissions.' };
  API.actualizarGps('CRED-523'); await vaciar();
  ok('regla rechaza: "Ya pediste una actualización en la última hora" y botón apagado', $('gps-CRED-523-nota').textContent.indexOf('Ya pediste una actualización') === 0 && $('gps-CRED-523-btn').disabled === true);
  ok('regla rechaza: no se llama al Worker', fetches.length === 0);

  errorSet = { code: 'unavailable', message: 'network' };
  API.actualizarGps('CRED-523'); await vaciar();
  ok('sin internet: lo dice y deja reintentar', $('gps-CRED-523-nota').textContent.indexOf('No pudimos pedir la ubicación') === 0 && $('gps-CRED-523-btn').disabled === false);
  errorSet = null;

  // El robot no responde: se rinde a los ~3 minutos sin quedarse pegado
  reiniciar();
  S.creditos = [{ id: 'CRED-523' }];
  docs['ubicacion_cliente/CRED-523'] = { credId: 'CRED-523', lat: 10.48, lng: -66.9, ultimaSenal: '2026-09-14 15:00:00', revisado: new Date(AHORA - 2 * HORA).toISOString(), workerUrl: 'https://w.example' };
  await API.cargarGpsCliente();
  API.actualizarGps('CRED-523'); await vaciar();
  ok('con Worker: avisa y espera la respuesta del robot', fetches.length === 1 && timers.length === 1);
  let vueltas = 0;
  while (timers.length && vueltas < 100) { vueltas++; await correrTimers(); }
  ok('se rinde tras 60 miradas (unos 5 minutos)', lecturas.filter(k => k === 'ubicacion_cliente/CRED-523').length === 1 + 60);
  ok('y lo dice sin asustar', $('gps-CRED-523-nota').textContent.indexOf('No pudimos traer la ubicación esta vez') === 0 && $('gps-CRED-523-nota').textContent.indexOf('unos minutos') === -1 && $('gps-CRED-523-btn').textContent === 'Actualizar ubicación');

  // Sin dirección del Worker (el robot no se despierta al momento): no promete "un minuto"
  reiniciar();
  S.creditos = [{ id: 'CRED-523' }];
  docs['ubicacion_cliente/CRED-523'] = { credId: 'CRED-523', lat: 10.48, lng: -66.9, ultimaSenal: '2026-09-14 15:00:00', revisado: new Date(AHORA - 2 * HORA).toISOString(), workerUrl: '' };
  await API.cargarGpsCliente();
  API.actualizarGps('CRED-523'); await vaciar();
  ok('sin Worker: el pedido igual queda guardado para el robot', escrituras.length === 1 && escrituras[0].ruta === 'pedidos_gps/CRED-523');
  ok('sin Worker: no llama a nada ni se queda esperando', fetches.length === 0 && timers.length === 0);
  ok('sin Worker: dice la verdad (se revisa una vez al día en la mañana)', $('gps-CRED-523-nota').textContent.indexOf('vuelve a mirar mañana') > -1 && $('gps-CRED-523-nota').textContent.indexOf('minuto') === -1);
  ok('sin Worker: el botón vuelve a su texto, apagado por una hora', $('gps-CRED-523-btn').textContent === 'Actualizar ubicación' && $('gps-CRED-523-btn').disabled === true);

  // Worker caído (responde 502): no se queda esperando y dice la verdad
  reiniciar();
  S.creditos = [{ id: 'CRED-523' }];
  docs['ubicacion_cliente/CRED-523'] = { credId: 'CRED-523', lat: 10.48, lng: -66.9, ultimaSenal: '2026-09-14 15:00:00', revisado: new Date(AHORA - 2 * HORA).toISOString(), workerUrl: 'https://w.example' };
  await API.cargarGpsCliente();
  workerOk = false;
  API.actualizarGps('CRED-523'); await vaciar();
  workerOk = true;
  ok('Worker caído: el pedido igual queda guardado', escrituras.length === 1 && escrituras[0].ruta === 'pedidos_gps/CRED-523');
  ok('Worker caído: no se queda esperando', timers.length === 0);
  ok('Worker caído: lo dice claro y sin culpar al GPS del cliente', $('gps-CRED-523-nota').textContent.indexOf('No pudimos buscarla ahora') === 0 && $('gps-CRED-523-btn').disabled === true);

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exitCode = 1;
})();
