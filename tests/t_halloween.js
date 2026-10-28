// 28-oct-2026, Adam: "decórame el dashboard de Halloween… solo el sistema… un detalle… que empiece de una vez y se
// quite el 2 de noviembre". modules/halloween.js: se enciende solo entre el 28-oct y el 1-nov, pone el saludo arriba
// del Dashboard (el de administradores y el de empleados), el sombrero en el pegaso y los murciélagos una sola vez.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function armar(hoy) {
  const css = [];
  const logo = { hijos: [], querySelector(sel) { return this.hijos.find(h => '.' + h.className === sel) || null; }, appendChild(h) { this.hijos.push(h); } };
  const doc = { querySelector(sel) { return sel === '.sb-logo' ? logo : null; }, createElement(tag) { const el = { tag, className: '', innerHTML: '' }; el.remove = () => { logo.hijos = logo.hijos.filter(h => h !== el); }; return el; }, head: { insertAdjacentHTML(_, h) { css.push(h); } } };
  const almacen = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; };
  const ctx = { console, document: doc, localStorage: almacen(), sessionStorage: almacen(), hoyLocalISO: () => hoy, S: { page: 'dash' }, navegado: [], nav(p) { ctx.navegado.push(p); },
    PG: { dash: () => '<div class="page">TABLERO<div class="kx-card">1</div></div>' } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'modules/halloween.js'), 'utf8'), ctx, { filename: 'modules/halloween.js' });
  return Object.assign(ctx, { css, logo });
}

// ── Cuándo ──
ok('encendido del 28 de octubre al 1 de noviembre', ['2026-10-28', '2026-10-31', '2026-11-01'].every(d => armar(d).hwActivo()));
ok('apagado antes del 28-oct y desde el 2-nov', ['2026-10-27', '2026-11-02', '2026-12-25'].every(d => !armar(d).hwActivo()));
const off = armar('2026-10-30'); off.localStorage.setItem('pg_hw_off', '1');
ok('si alguien lo quitó en su navegador, apagado aunque sea 30 de octubre', !off.hwActivo());

// ── El Dashboard ──
const c = armar('2026-10-31');
const h1 = c.PG.dash();
ok('el saludo va adentro de .page, antes del tablero, y las tarjetas quedan marcadas con hw-page', /^<div class="page hw-page"><div class="hw-bats"/.test(h1) && /class="hw-banner"/.test(h1) && /Feliz Halloween, equipo/.test(h1) && /se quita solo el 2 de noviembre/.test(h1) && /onclick="hwQuitar\(\)"/.test(h1) && h1.indexOf('TABLERO<div class="kx-card">1</div></div>') > 0);
ok('la calabaza y la telaraña están, y el rojo de la mora no se toca (el módulo no cambia colores de tarjetas)', /🎃/.test(h1) && /class="hw-web"/.test(h1) && !/\.kx-card\{[^}]*color/.test(c.css.join('')));
const h2 = c.PG.dash();
ok('al redibujarse el Dashboard los murciélagos ya no vuelven a cruzar (una vez por sesión)', !/hw-bats/.test(h2) && /hw-banner/.test(h2));
ok('el sombrero se pone en el pegaso una sola vez aunque el Dashboard se redibuje', c.logo.hijos.length === 1 && c.logo.hijos[0].className === 'hw-hat' && /<svg/.test(c.logo.hijos[0].innerHTML));
ok('el estilo va con el módulo: borde naranja solo en el Dashboard y sin animación para quien la tiene reducida', /\.hw-page \.kx-card\{border-top:3px solid #f28c28\}/.test(c.css.join('')) && /prefers-reduced-motion/.test(c.css.join('')) && /\.sb-logo \.hw-hat/.test(c.css.join('')));

// El de los empleados no empieza con .page: el saludo va en su propia caja, delante
c.PG.dash = c.PG.dash; const e = armar('2026-10-29'); const origE = e.PG.dash; e.PG.dash = origE;
const he = e.hwDecorarDash('<div class="emp-dash">EMPLEADO</div>');
ok('el dashboard de los empleados también lo lleva', /^<div class="hw-page"><div class="hw-bats"[\s\S]*hw-banner[\s\S]*<\/div><div class="emp-dash">EMPLEADO<\/div>$/.test(he));

// ── Quitar ──
c.hwQuitar();
ok('"Quitar" lo apaga en ese navegador, le quita el sombrero al pegaso y redibuja el Dashboard', c.localStorage.getItem('pg_hw_off') === '1' && !c.hwActivo() && c.logo.hijos.length === 0 && c.navegado[0] === 'dash' && c.PG.dash() === '<div class="page">TABLERO<div class="kx-card">1</div></div>');

// ── Fuera de fecha no deja rastro ──
const f = armar('2026-11-02'); const hf = f.PG.dash();
ok('el 2 de noviembre el Dashboard sale exactamente igual que siempre y sin sombrero', hf === '<div class="page">TABLERO<div class="kx-card">1</div></div>' && f.logo.hijos.length === 0);

// ── Cargado en el sistema ──
const admin = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
ok('admin.html carga modules/halloween.js justo después de modules/dash.js (envuelve PG.dash)', /modules\/dash\.js\?v=[^"]+"><\/script>\s*<script charset="utf-8" src="modules\/halloween\.js\?v=/.test(admin));
ok('la web pública no lo carga (solo el sistema)', !/halloween/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')) && !/halloween/.test(fs.readFileSync(path.join(ROOT, 'micuenta.html'), 'utf8')));

console.log(`\n${pass} OK · ${fail} fallas`);
if (fail) process.exitCode = 1;
