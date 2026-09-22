// Worker de Cloudflare (bot/telegram-worker.js) que se publica para el GPS
// (Adam, 14-sep-2026: "una vez al día a las 8 am y el botón"): el disparo
// diario, la ruta /gps-refresco de los botones y que nadie pueda usar la raíz
// sin la clave de Telegram. Se carga el Worker tal cual y se simula fetch.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const SRC = fs.readFileSync(path.join(__dirname, '..', 'bot', 'telegram-worker.js'), 'utf8');

// Petición mínima, como la que recibe el Worker
function peticion(ruta, metodo, cabeceras, cuerpo) {
  const h = {};
  Object.keys(cabeceras || {}).forEach(k => { h[k.toLowerCase()] = cabeceras[k]; });
  return {
    url: 'https://pagasi-bot.ejemplo.workers.dev' + ruta,
    method: metodo,
    headers: { get: k => (String(k).toLowerCase() in h ? h[String(k).toLowerCase()] : null) },
    json: async () => JSON.parse(cuerpo || '{}'),
  };
}

(async () => {
  const W = (await import('data:text/javascript;base64,' + Buffer.from(SRC).toString('base64'))).default;
  let llamadas = [], github = { ok: true, status: 204 };
  global.fetch = async (url, opt) => {
    llamadas.push({ url: String(url), opt: opt || {} });
    return { ok: github.ok, status: github.status, json: async () => ({}), text: async () => '' };
  };
  const env = { GITHUB_PAT: 'PAT-DE-PRUEBA' };

  // ── Raíz ──
  let r = await W.fetch(peticion('/', 'GET'), env);
  ok('la raíz responde "Bot de Pagasi activo." (lo revisa worker-direccion)', (await r.text()).indexOf('Bot de Pagasi activo') > -1);

  // ── /gps-refresco (botones del módulo GPS y de Mi cuenta) ──
  llamadas = [];
  r = await W.fetch(peticion('/gps-refresco', 'GET'), env);
  ok('GET /gps-refresco: 405 y no dispara nada', r.status === 405 && llamadas.length === 0);
  r = await W.fetch(peticion('/gps-refresco', 'OPTIONS', { Origin: 'https://pagasi.io' }), env);
  ok('OPTIONS: permite a pagasi.io', r.headers.get('Access-Control-Allow-Origin') === 'https://pagasi.io');
  r = await W.fetch(peticion('/gps-refresco', 'POST', { Origin: 'https://otro-sitio.com' }), env);
  ok('POST desde otro sitio: 403 y no dispara nada', r.status === 403 && llamadas.length === 0);
  r = await W.fetch(peticion('/gps-refresco', 'POST', { Origin: 'https://pagasi.io' }), env);
  const j = await r.json();
  const disp = llamadas[0] || { opt: {} };
  ok('POST desde pagasi.io: dispara gps-micodus.yml', r.status === 200 && j.ok === true && llamadas.length === 1
    && /\/repos\/Pagasi18\/PAGASI26\/actions\/workflows\/gps-micodus\.yml\/dispatches$/.test(disp.url));
  ok('con el token de GitHub y sobre main', !!disp.opt.headers && disp.opt.headers.Authorization === 'Bearer PAT-DE-PRUEBA' && JSON.parse(disp.opt.body).ref === 'main');
  r = await W.fetch(peticion('/gps-refresco', 'POST', { Origin: 'https://www.pagasi.io' }), env);
  ok('también desde www.pagasi.io', r.status === 200);
  github = { ok: false, status: 401 };
  r = await W.fetch(peticion('/gps-refresco', 'POST', { Origin: 'https://pagasi.io' }), env);
  ok('si GitHub rechaza (token vencido): 502 y ok=false para que el panel avise', r.status === 502 && (await r.json()).ok === false);

  // ── Cron de las 8 am ──
  github = { ok: true, status: 204 }; llamadas = [];
  let espera = null, fallo = null;
  await W.scheduled({ cron: '0 12 * * *' }, env, { waitUntil: p => { espera = p; } });
  try { await espera; } catch (e) { fallo = e; }
  ok('cron de las 8: dispara el barrido', llamadas.length === 1 && /gps-micodus\.yml\/dispatches$/.test(llamadas[0].url) && !fallo);
  github = { ok: false, status: 403 }; llamadas = []; fallo = null;
  await W.scheduled({ cron: '0 12 * * *' }, env, { waitUntil: p => { espera = p; } });
  try { await espera; } catch (e) { fallo = e; }
  ok('cron de las 8: si GitHub no acepta, sale FALLIDO (no en verde)', llamadas.length === 1 && !!fallo && /403/.test(String(fallo.message)));

  // ── La raíz de Telegram no se deja usar sin su clave ──
  github = { ok: true, status: 204 }; llamadas = [];
  const falso = JSON.stringify({ message: { chat: { id: 8571975984 }, text: '📊 Resumen ahora' } });
  r = await W.fetch(peticion('/', 'POST', { 'Content-Type': 'application/json' }, falso), env);
  ok('mensaje falso a la raíz, sin clave de Telegram configurada: se ignora y no dispara nada', r.status === 200 && llamadas.length === 0);
  const envTg = Object.assign({}, env, { TELEGRAM_TOKEN: 'T', TG_SECRET: 'la-buena' });
  r = await W.fetch(peticion('/', 'POST', { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'adivinada' }, falso), envTg);
  ok('con una clave equivocada: tampoco dispara', llamadas.length === 0);
  r = await W.fetch(peticion('/', 'POST', { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 'la-buena' },
    JSON.stringify({ message: { chat: { id: 111 }, text: 'hola' } })), envTg);
  ok('con la clave buena pero de un chat no permitido: se ignora', (await r.text()) === 'ignored' && llamadas.length === 0);

  console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
  if (fail) process.exitCode = 1;
})().catch(e => { console.log('FALLA el Worker no cargó: ' + e.message); process.exitCode = 1; });
