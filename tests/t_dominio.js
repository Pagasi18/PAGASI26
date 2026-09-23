// El cambio de dominio del 23-sep-2026: pagasi.io pasa a PAGASI 26 (la compañía que
// vende) y PAGASI 18 (la que cobra los créditos de antes) se muda a 18.pagasi.io.
// Lo que se prueba aquí es lo que se rompe callado con ese cambio: los enlaces que los
// clientes YA tienen en el teléfono, y los permisos del Worker que atiende al navegador.
const fs=require('fs'), path=require('path');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');

// Esta suite corre en las dos compañías y cada una tiene su dominio, así que primero
// se averigua en cuál estamos: por el proyecto de Firebase, no por un nombre de carpeta.
const mc=src('micuenta.html');
const ES18 = /projectId: *'pagasi-v2'/.test(mc);
console.log('esta copia es ' + (ES18 ? 'PAGASI 18 (18.pagasi.io)' : 'PAGASI 26 (pagasi.io)'));

// ── El cliente que abre un enlace viejo no se queda tirado ───────────────────
ok('el portal conoce el de la otra compañía', /var PORTAL_HERMANO = 'https:\/\/[0-9a-z.]+\/micuenta\.html'/.test(mc));
ok('...y es el de la OTRA, no el suyo',
  mc.indexOf("var PORTAL_HERMANO = 'https://" + (ES18 ? 'pagasi.io' : '18.pagasi.io') + "/micuenta.html'") > -1);
ok('y lo ofrece cuando el enlace no abre aquí',
  /permission-denied[\s\S]{0,260}showErrConEnlace\('lgErr'/.test(mc));
// Los tres callejones sin salida del portal: el del enlace con cédula, el del teléfono
// que no aparece y el del código por SMS. En los tres el cliente de la otra compañía
// leía un error que sonaba a culpa suya.
ok('el error del enlace ofrece el otro portal',
  /permission-denied[\s\S]{0,260}showErrConEnlace\('lgErr'/.test(mc));
ok('...el del teléfono que no aparece, también',
  (mc.match(/showErrConEnlace\('lgErr','No encontramos ese número/g)||[]).length === 2);
ok('...y ya no queda ninguno de esos avisos sin salida',
  mc.indexOf("showErr('lgErr','No encontramos ese número") === -1);

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

// ── El portal no firma con el nombre de la otra compañía ────────────────────
ok('el pie del portal solo usa los datos de PAGASI 18 en la base de PAGASI 18',
  /EMP_PORTAL = \(String\(\(FIREBASE_CONFIG\|\|\{\}\)\.projectId\|\|''\) === 'pagasi-v2'\)/.test(mc));
ok('...y sin ficha cargada no firma con nadie', /var quien = EMP_PORTAL\.nombre/.test(mc));

// ── El logo del reporte no se rompe si el sistema vive en una subcarpeta ─────
const pg=src('modules/pagos.js');
ok('el logo del reporte se busca desde la carpeta de la página, no desde la raíz',
  /location\.pathname\.replace\(\/\[\^\\\/\]\*\$\/,''\) \+ 'assets\/pagasi-logo\.png'/.test(pg)
  && pg.indexOf("location.origin+'/assets/pagasi-logo.png'") === -1);
ok('el reporte ya no lleva una dirección web escrita a mano', pg.indexOf('www.pagasi.io') === -1);

// ── Cada compañía pide sus archivos con su propia versión ───────────────────
// Los dos sistemas tienen los mismos nombres de archivo. Si además comparten el número
// de versión, el navegador de quien entró a pagasi.io cuando era PAGASI 18 serviría de
// su caché el JavaScript de 18 dentro de 26 — con la llave de Firebase de la otra
// empresa, escribiendo en la base equivocada sin que nadie lo note.
const adm=src('admin.html');
const versiones = (adm.match(/\?v=[^"\s]+/g)||[]);
ok('el admin pide sus archivos con versión', versiones.length > 5);
if(ES18){
  ok('PAGASI 18 usa sus versiones de siempre', versiones.every(v => v.indexOf('?v=26-') !== 0));
} else {
  ok('PAGASI 26 marca todas sus versiones como suyas', versiones.every(v => v.indexOf('?v=26-') === 0));
  ok('...y el bumpeo las seguirá marcando', /VERSION="26-\$\(date/.test(src('bump-version.sh')));
  ok('el que llegue a una dirección que aquí no existe encuentra la suya',
    fs.existsSync(path.join(ROOT,'404.html')) && src('404.html').indexOf('18.pagasi.io/micuenta.html') > -1);
}

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
