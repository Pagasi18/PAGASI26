// 28-oct-2026, Adam: "algo así en el logo y ya" (foto del logo de BC.GAME con calabaza y araña). modules/halloween.js:
// solo el logo de la barra lateral, del 28-oct al 1-nov, y el 2-nov desaparece solo. Nada más cambia.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

function armar(hoy, conLogo) {
  const css = [], escuchas = [];
  const logo = { hijos: [], querySelector(sel) { return this.hijos.find(h => '.' + h.className === sel) || null; }, appendChild(h) { this.hijos.push(h); } };
  const doc = { querySelector(sel) { return conLogo !== false && sel === '.sb-logo' ? logo : null; }, createElement(tag) { const el = { tag, className: '', innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }; el.remove = () => { logo.hijos = logo.hijos.filter(h => h !== el); }; return el; }, head: { insertAdjacentHTML(_, h) { css.push(h); } }, addEventListener(ev, fn) { escuchas.push([ev, fn]); } };
  const ctx = { console, document: doc, hoyLocalISO: () => hoy };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'modules/halloween.js'), 'utf8'), ctx, { filename: 'modules/halloween.js' });
  return Object.assign(ctx, { css, logo, escuchas });
}

ok('encendido del 28 de octubre al 1 de noviembre', ['2026-10-28', '2026-10-31', '2026-11-01'].every(d => armar(d).hwActivo()));
ok('apagado antes del 28-oct y desde el 2-nov', ['2026-10-27', '2026-11-02', '2026-12-25'].every(d => !armar(d).hwActivo()));

const c = armar('2026-10-31');
ok('al cargar pone en el logo la calabaza y la araña con su hilo, una sola vez', c.logo.hijos.length === 1 && c.logo.hijos[0].className === 'hw-logo' && /hw-calabaza">🎃/.test(c.logo.hijos[0].innerHTML) && /hw-hilo/.test(c.logo.hijos[0].innerHTML) && /hw-arana">🕷️/.test(c.logo.hijos[0].innerHTML) && c.logo.hijos[0].attrs['aria-hidden'] === 'true');
c.hwAplicar(); c.hwAplicar();
ok('volver a aplicarlo no lo duplica', c.logo.hijos.length === 1);
ok('el estilo solo toca el logo (.sb-logo) y la araña no se mueve para quien tiene la animación reducida', c.css.join('').split('.sb-logo ').length >= 5 && !/\.kx-|\.page|body/.test(c.css.join('')) && /prefers-reduced-motion/.test(c.css.join('')));

const f = armar('2026-11-02');
ok('el 2 de noviembre no pone nada', f.logo.hijos.length === 0);
c.hoyLocalISO = () => '2026-11-02'; c.hwAplicar();
ok('si ya estaba puesto y llega el 2-nov, se quita', c.logo.hijos.length === 0);

const s = armar('2026-10-30', false);
ok('si el logo todavía no está en la página, espera a que cargue', s.logo.hijos.length === 0 && s.escuchas.length === 1 && s.escuchas[0][0] === 'DOMContentLoaded');

const admin = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
ok('admin.html carga modules/halloween.js', /<script charset="utf-8" src="modules\/halloween\.js\?v=/.test(admin));
ok('la web pública no lo carga (solo el sistema)', !/halloween/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')) && !/halloween/.test(fs.readFileSync(path.join(ROOT, 'micuenta.html'), 'utf8')));

console.log(`\n${pass} OK · ${fail} fallas`);
if (fail) process.exitCode = 1;
