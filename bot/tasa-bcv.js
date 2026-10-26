/* Tasa BCV del día (dólar y euro) → data/tasas-bcv.json
   Adam, 26-oct-2026: "necesito que el mismo sistema todos los días guarde cuánto estuvo el dólar, y si yo
   cambio la fecha, pues agarra el dólar BCV o euro… de ese día en el que se hizo el pago".
   Hasta ahora la tasa del día quedaba guardada solo si alguien abría el panel ese día. Este robot corre en
   GitHub Actions de lunes a viernes (mañana y tarde), lee la página del BCV y guarda la tasa bajo su FECHA
   VALOR (el BCV publica cada tarde la tasa que rige el día hábil siguiente: la del viernes vale para el lunes).
   No necesita claves: la tasa es pública y el archivo vive en el repo, que GitHub Pages sirve al panel
   (logic/tasas.js lo lee junto con el historial de Firestore). Igual en PAGASI 18 y 26.

   Uso local:  node bot/tasa-bcv.js --dry   (muestra, no escribe)                                   */

const fs = require('fs'), path = require('path');
const ARCHIVO = path.join(__dirname, '..', 'data', 'tasas-bcv.json');
const DRY = process.argv.includes('--dry');

// "887,30" o "1.234,56" (formato venezolano) → 887.3 / 1234.56; "886.2271" también
function num(s) {
  s = String(s == null ? '' : s).trim(); if (!s) return 0;
  if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
  const n = Math.round(parseFloat(s) * 10000) / 10000;
  return n > 1 ? n : 0;
}
// La página del BCV: <div id="dolar"> … <strong class="strong-tb">887,30</strong> y "Fecha Valor: <span … content="2026-10-27…">"
function extraerBcv(html) {
  html = String(html || '');
  const v = id => { const m = new RegExp('id=["\']' + id + '["\'][^>]*>[\\s\\S]*?<strong[^>]*>\\s*([0-9.,]+)', 'i').exec(html); return m ? num(m[1]) : 0; };
  const f = /Fecha Valor:\s*<span[^>]*content="(\d{4}-\d{2}-\d{2})/i.exec(html);
  return { usd: v('dolar'), eur: v('euro'), fechaValor: f ? f[1] : '' };
}
function esFinde(iso) { const d = new Date(iso + 'T12:00:00Z').getUTCDay(); return d === 0 || d === 6; }
function hoyCaracas() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); }   // YYYY-MM-DD
// Agrega la tasa de un día. La primera publicación de ese día manda: una corrida posterior no la cambia (solo completa lo que falte)
function agregar(tabla, fecha, entrada) {
  tabla = tabla || {}; entrada = entrada || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return tabla;
  const ya = tabla[fecha] || {}, nueva = Object.assign({}, ya);
  if (!(ya.usd > 1) && entrada.usd > 1) nueva.usd = entrada.usd;
  if (!(ya.eur > 1) && entrada.eur > 1) nueva.eur = entrada.eur;
  if (!ya.fuente && entrada.fuente) nueva.fuente = entrada.fuente;
  if (!ya.publicado && entrada.publicado) nueva.publicado = entrada.publicado;
  if (entrada.aproximada && !(ya.usd > 1)) nueva.aproximada = true;
  if (!(nueva.usd > 1) && !(nueva.eur > 1)) return tabla;
  tabla[fecha] = nueva; return tabla;
}
function ordenar(tabla) { const o = {}; Object.keys(tabla || {}).sort().forEach(k => { o[k] = tabla[k]; }); return o; }

// La página del BCV. Su servidor no manda el certificado intermedio y Node no logra verificar la cadena
// (UNABLE_TO_VERIFY_LEAF_SIGNATURE; los navegadores y curl sí la completan solos). Se lee sin verificar el
// certificado SOLO para bcv.org.ve: es información pública, el valor se revisa (número mayor que 1 y fecha
// valor con forma de fecha) y, si algo no cuadra, se usa ve.dolarapi.com de respaldo.
function leerBcv() {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const req = https.get('https://www.bcv.org.ve/', { headers: { 'User-Agent': 'Mozilla/5.0 (PAGASI tasa-bcv)' }, rejectUnauthorized: false, timeout: 25000 }, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('BCV HTTP ' + res.statusCode)); }
      let html = ''; res.setEncoding('utf8'); res.on('data', c => { if (html.length < 2e6) html += c; });
      res.on('end', () => {
        const r = extraerBcv(html);
        if (!r.usd || !r.fechaValor) return reject(new Error('no se encontró el dólar o la fecha valor en la página'));
        resolve(Object.assign(r, { fuente: 'bcv.org.ve' }));
      });
    });
    req.on('timeout', () => { req.destroy(new Error('BCV no respondió a tiempo')); });
    req.on('error', reject);
  });
}
// Respaldo: ve.dolarapi.com (oficial BCV, sin fecha valor: se guarda bajo hoy, marcada aproximada)
async function leerDolarapi() {
  const res = await fetch('https://ve.dolarapi.com/v1/cotizaciones', { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error('dolarapi HTTP ' + res.status);
  const j = await res.json();
  const usd = (j.find(x => x && x.moneda === 'USD') || {}).promedio, eur = (j.find(x => x && x.moneda === 'EUR') || {}).promedio;
  const r = { usd: num(usd), eur: num(eur), fechaValor: '', fuente: 've.dolarapi.com', aproximada: true };
  if (!r.usd) throw new Error('dolarapi sin dólar');
  return r;
}

async function correr() {
  const hoy = hoyCaracas();
  let r, fecha;
  try { r = await leerBcv(); fecha = r.fechaValor; }
  catch (e) {
    console.log('WARN no se pudo leer bcv.org.ve:', e.message);
    try { r = await leerDolarapi(); fecha = hoy; }
    catch (e2) { console.log('WARN tampoco dolarapi:', e2.message, '· el próximo cron reintenta'); return; }   // transitorio: no reventar el workflow
    if (esFinde(fecha)) { console.log('Fin de semana y sin fecha valor: no se registra (rige la del lunes)'); return; }
  }
  const tabla = fs.existsSync(ARCHIVO) ? JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) : {};
  const antes = JSON.stringify(tabla[fecha] || null);
  agregar(tabla, fecha, { usd: r.usd, eur: r.eur, fuente: r.fuente, publicado: hoy, aproximada: !!r.aproximada });
  console.log(`Tasa con fecha valor ${fecha}: USD ${r.usd} · EUR ${r.eur || '—'} (${r.fuente}${r.aproximada ? ', aproximada' : ''})`);
  if (DRY) { console.log('(dry-run: no se escribe el archivo)'); return; }
  if (JSON.stringify(tabla[fecha]) === antes) { console.log('Sin cambios'); return; }
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify(ordenar(tabla), null, 1) + '\n');
  console.log('Guardado en', path.relative(process.cwd(), ARCHIVO));
}

module.exports = { num, extraerBcv, esFinde, agregar, ordenar, leerBcv, leerDolarapi, correr };
if (require.main === module) correr();
