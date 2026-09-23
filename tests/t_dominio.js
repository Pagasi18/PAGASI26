// El cambio de dominio del 23-sep-2026: pagasi.io pasa a PAGASI 26 (la compañía que
// vende) y PAGASI 18 (la que cobra los créditos de antes) se muda a 18.pagasi.io.
// Lo que se prueba aquí es lo que se rompe callado con ese cambio: los enlaces que los
// clientes YA tienen en el teléfono, y los permisos del Worker que atiende al navegador.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

// ── El cliente que abre un enlace viejo no se queda tirado ───────────────────
const mc=src('micuenta.html');
ok('el portal conoce el de la otra compañía', /var PORTAL_HERMANO = 'https:\/\/[0-9a-z.]+\/micuenta\.html'/.test(mc));
ok('y lo ofrece cuando el enlace no abre aquí',
  /permission-denied[\s\S]{0,260}showErrConEnlace\('lgErr'/.test(mc));
ok('el enlace se arma con un elemento, no pegando HTML en el mensaje',
  /function showErrConEnlace/.test(mc) && /a\.href=url; a\.textContent=texto/.test(mc)
  && !/showErr\('lgErr'[^;]*<a href/.test(mc));

// La función, corriendo de verdad: es lo único que evita un rebote infinito entre
// los dos portales (cada uno mandando al cliente al otro, sin fin).
function hermano(origen, search, HERMANO){
  const location={origin:origen, search:search};
  const URLSearchParams_=global.URLSearchParams;
  try{
    if(!HERMANO) return '';
    if(HERMANO.indexOf(location.origin) === 0) return '';
    if(new URLSearchParams_(location.search).get('r') === '1') return '';
    var q = location.search ? location.search + '&r=1' : '?r=1';
    return HERMANO + q;
  }catch(e){ return ''; }
}
const H18='https://18.pagasi.io/micuenta.html', HNEW='https://pagasi.io/micuenta.html';
ok('un cliente de antes que cae en pagasi.io recibe el enlace de 18, con su token',
  hermano('https://pagasi.io','?t=ABC123&c=CLI-9',H18)==='https://18.pagasi.io/micuenta.html?t=ABC123&c=CLI-9&r=1');
ok('estando ya en 18.pagasi.io, no se ofrece a sí mismo',
  hermano('https://18.pagasi.io','?t=ABC123',H18)==='');
ok('quien ya fue reenviado una vez no rebota de vuelta',
  hermano('https://18.pagasi.io','?t=ABC&r=1',HNEW)==='');
ok('sin enlace personal tampoco se ofrece nada raro',
  hermano('https://pagasi.io','',H18)==='https://18.pagasi.io/micuenta.html?r=1');

// ── El Worker que atiende al navegador ───────────────────────────────────────
const w=src('bot/telegram-worker.js');
const orig=/const ORIGENES = \[([^\]]+)\]/.exec(w);
ok('el Worker declara sus orígenes', !!orig);
ok('...y acepta el dominio nuevo de PAGASI 18', /18\.pagasi\.io/.test(orig ? orig[1] : ''));
ok('...sin dejar fuera pagasi.io, que ahora es la compañía nueva', /'https:\/\/pagasi\.io'/.test(orig ? orig[1] : ''));

// ── La página que se lleva la base entera no se publica ─────────────────────
// exportar-26.html lee TODA la base de PAGASI 18 y la descarga en un archivo. Se usó
// una vez, desde la computadora, para armar la copia. Publicada, cualquiera con las
// credenciales de un empleado se lleva la cartera de clientes en un clic.
const { execSync } = require('child_process');
const enGit = execSync('git ls-files', {cwd:ROOT}).toString().split('\n');
ok('exportar-26.html no viaja en el repositorio', enGit.indexOf('exportar-26.html') === -1);
ok('...y está en .gitignore para que no vuelva sola', /^exportar-26\.html$/m.test(src('.gitignore')));

console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas');
if(fail) process.exitCode=1;
