// 31-oct-2026. Adam: la franja de la portada con todas las sedes, como en el sistema. "Una barra con todas las sedes y ya".
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const barra = (html.match(/<div class="pg-container pg-partners"[^>]*>(.*?)<\/div>/) || [])[1] || '';
const sedes = (barra.match(/<span[^>]*>[^<]+<\/span>/g) || []).map(x => x.replace(/<[^>]+>/g, '').replace('⚡ ', ''));
ok('la barra tiene las 12 sedes', sedes.length === 12 && new Set(sedes).size === 12);
ok('Veloz va primero', sedes[0] === 'VELOZ CHACAO' && sedes[1] === 'VELOZ PTO. LA CRUZ');
ok('están las que nombró Adam', ['VELOZ PTO. LA CRUZ', 'EK BELLO MONTE', 'EK TRUJILLO', 'BERA CHACAO', 'BERA PETARE'].every(s => sedes.includes(s)));
ok('la sede vieja sin marca ya no está', !sedes.includes('BOLEÍTA'));
ok('Ari Benza no sale en la barra (Adam, 31-oct-2026)', !sedes.includes('ARI BENZA'));
ok('es solo la barra: sin enlaces', !/<a\b/.test(barra));
ok('la portada pide la hoja de estilos nueva', html.includes('site.css?v=20261031-'));
console.log(`\n${pass} OK, ${fail} FALLA`);
process.exit(fail ? 1 : 0);
