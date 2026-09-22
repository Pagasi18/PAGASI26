// Busca la direccion del Worker de Cloudflare, revisa que tenga la ruta
// /gps-refresco y, SOLO con GUARDAR=true, la guarda en config/gps.workerUrl.
// La direccion sale del secreto WORKER_URL o, si no hay, del webhook del bot
// de Telegram. Sin esa direccion, el boton de refresco del modulo GPS y el de
// Mi cuenta esperan al barrido.
// El log de GitHub es publico: la direccion no se imprime.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
(async () => {
  let url = String(process.env.WORKER_URL || '').trim();
  let fuente = 'secreto WORKER_URL';
  if (url) {
    if (!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/?$/i.test(url)) {
      console.log('RESULTADO ERROR: WORKER_URL no es una direccion de Cloudflare Workers (https://nombre.cuenta.workers.dev)');
      process.exit(1);
    }
  } else {
    const tok = process.env.TELEGRAM_TOKEN;
    if (!tok) { console.log('RESULTADO ERROR: no hay WORKER_URL ni TELEGRAM_TOKEN'); process.exit(1); }
    const info = await fetch('https://api.telegram.org/bot' + tok + '/getWebhookInfo').then(r => r.json());
    url = (info && info.result && info.result.url) || '';
    fuente = 'webhook de Telegram';
    if (!url) { console.log('RESULTADO SIN_WEBHOOK: el bot de Telegram no tiene webhook y no hay secreto WORKER_URL'); return; }
    console.log('Telegram reporta errores recientes: ' + (info.result.last_error_message ? 'si' : 'no'));
  }
  const base = new URL(url).origin;
  console.log('Direccion tomada de: ' + fuente + ' · '
    + (new URL(url).hostname.endsWith('.workers.dev') ? 'Cloudflare (*.workers.dev)' : 'otro dominio'));

  // GET no dispara nada: la raiz responde "Bot de Pagasi activo." y la ruta
  // /gps-refresco, si esta publicada, responde 405 (solo acepta POST).
  const raiz = await fetch(base + '/').then(r => r.text()).catch(() => '');
  const ruta = await fetch(base + '/gps-refresco').then(r => r.status).catch(() => 0);
  console.log('Worker responde: ' + (raiz.indexOf('Bot de Pagasi activo') > -1 ? 'si' : 'NO')
    + ' · ruta /gps-refresco: ' + (ruta === 405 ? 'publicada' : 'NO (HTTP ' + ruta + ')'));
  if (ruta !== 405) { console.log('RESULTADO SIN_RUTA: el Worker publicado no tiene /gps-refresco'); return; }

  if (process.env.GUARDAR !== 'true') { console.log('RESULTADO ENCONTRADO: no se guardo nada (guardar=false)'); return; }
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  const ref = db.collection('config').doc('gps');
  const antes = ((await ref.get()).data() || {}).workerUrl || '';
  if (antes === base) { console.log('RESULTADO YA_ESTABA: config/gps.workerUrl ya tenia esta direccion'); return; }
  if (antes) { console.log('RESULTADO YA_ESTABA_OTRA: config/gps.workerUrl tenia otra direccion, no se toco'); return; }
  await ref.set({ workerUrl: base }, { merge: true });
  const despues = ((await ref.get()).data() || {}).workerUrl || '';
  console.log(despues === base ? 'RESULTADO GUARDADO: config/gps.workerUrl listo' : 'RESULTADO ERROR: no quedo guardado');
})().catch(e => { console.log('RESULTADO ERROR ' + e.message); process.exit(1); });
