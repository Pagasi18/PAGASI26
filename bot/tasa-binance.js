// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
/* Tasa Binance P2P — aviso mas caro del libro real.
   Corre en GitHub Actions cada 15 min y escribe config/tasa en Firestore.
   El navegador no puede consultar a Binance directo (sin CORS), por eso
   este job es la fuente primaria; el cliente (bcv-auto.js) solo usa
   CriptoYa como respaldo cuando este valor tiene mas de 30 minutos.

   Uso local sin credenciales:  node tasa-binance.js --dry            */

const DRY = process.argv.includes('--dry');

async function tasaTopP2P() {
  const res = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      asset: 'USDT', fiat: 'VES', merchantCheck: false,
      page: 1, rows: 10, tradeType: 'SELL',   // lado en que se vende USDT por Bs
    }),
  });
  if (!res.ok) throw new Error('Binance HTTP ' + res.status);
  const j = await res.json();
  const precios = (j.data || [])
    .map(a => parseFloat(a?.adv?.price))
    .filter(p => p > 100 && p < 100000)
    .sort((a, b) => b - a);
  if (!precios.length) throw new Error('libro P2P vacio');
  // El aviso mas caro, con un tope de cordura: si un aviso-trampa marca un
  // precio absurdo, se ignora todo lo que exceda 15% sobre la mediana.
  const mediana = precios[Math.floor(precios.length / 2)];
  const top = precios.find(p => p <= mediana * 1.15);
  return { top: Math.round(top * 100) / 100, mediana, n: precios.length };
}

function fechaCaracas() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); // YYYY-MM-DD
}

(async () => {
  let t;
  try {
    t = await tasaTopP2P();
  } catch (e) {
    // Transitorio: no reventar el workflow, el proximo cron reintenta
    console.log('WARN no se pudo leer el libro P2P:', e.message);
    process.exit(0);
  }
  console.log(`Binance P2P: aviso mas caro ${t.top} Bs (mediana ${t.mediana}, ${t.n} avisos)`);
  if (DRY) { console.log('(dry-run: no se escribe Firestore)'); return; }

  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: _proyecto() });
  await db.collection('config').doc('tasa').set({
    tasaBinance: t.top,
    fechaBinance: fechaCaracas(),
    fechaBinanceTs: new Date().toISOString(),
    binanceFuente: 'binance-p2p-top',
  }, { merge: true });
  console.log('Firestore actualizado: tasaBinance =', t.top);
})();
