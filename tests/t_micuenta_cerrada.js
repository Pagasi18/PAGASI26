// 30-oct-2026. Adam: "apágame para que los clientes no puedan entrar a Mi cuenta desde pagasi.io".
// El interruptor es MICUENTA_CERRADA en micuenta.html. Con true, la página muestra un aviso
// y NO conecta con Firebase: ni SMS, ni enlace ?t=, ni sesión guardada. El equipo sigue
// entrando con ?equipo=1. Firebase y el DOM son falsos: nada toca la red.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const html = fs.readFileSync(path.join(ROOT, 'micuenta.html'), 'utf8');
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');

function elemento(){ const cl = new Set(); let v = '';
  return { innerHTML: '', textContent: '', href: '', src: '', disabled: false, style: {}, get value(){ return v; }, set value(x){ v = String(x); },
    classList: { add(){ for (const x of arguments) cl.add(x); }, remove(){ for (const x of arguments) cl.delete(x); }, toggle(x, f){ if (f === undefined) f = !cl.has(x); f ? cl.add(x) : cl.delete(x); return f; }, contains(x){ return cl.has(x); } },
    addEventListener(){}, removeEventListener(){}, focus(){}, setAttribute(){}, getAttribute(){ return null; }, appendChild(){}, querySelector(){ return null; }, querySelectorAll(){ return []; } }; }

function arrancar(search){
  const els = {}, sel = {};
  const doc = { getElementById(id){ return els[id] || (els[id] = elemento()); }, querySelector(s){ return sel[s] || (sel[s] = elemento()); }, querySelectorAll(){ return []; },
    createElement(){ return elemento(); }, addEventListener(){}, body: elemento(), documentElement: elemento(), visibilityState: 'visible' };
  let conexiones = 0;
  const firebase = { apps: [], initializeApp(){ conexiones++; throw new Error('cerrado: no debe conectar'); }, auth(){ return {}; }, firestore(){ return {}; } };
  const ctx = { console: { log(){}, warn(){}, error(){} }, setTimeout, clearTimeout, setInterval(){ return 0; }, clearInterval(){}, requestAnimationFrame(){ return 0; },
    document: doc, navigator: { userAgent: 'node', language: 'es' },
    location: { hostname: 'pagasi.io', origin: 'https://pagasi.io', href: 'https://pagasi.io/micuenta.html' + (search || ''), search: search || '', hash: '' },
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }, sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    URLSearchParams, encodeURIComponent, fetch(){ return Promise.reject(new Error('sin red')); }, alert(){}, firebase, history: { replaceState(){}, pushState(){} },
    matchMedia(){ return { matches: false, addEventListener(){} }; } };
  ctx.window = ctx; ctx.addEventListener = function(){}; ctx.removeEventListener = function(){};
  vm.createContext(ctx);
  let error = null;
  try { vm.runInContext(inline, ctx, { filename: 'micuenta-inline.js' }); } catch (e) { error = e; }
  return { ctx, el: id => doc.getElementById(id), nota: sel['.pg-motion-note'], conexiones: () => conexiones, error };
}

// ── 1. El interruptor existe y está en CERRADO ──
ok('el interruptor MICUENTA_CERRADA está en el portal y vale true por defecto',
  /var MICUENTA_CERRADA = \(typeof MICUENTA_CERRADA_PRUEBA === 'boolean'\) \? MICUENTA_CERRADA_PRUEBA : true;/.test(html));
ok('el arranque respeta ?equipo=1 (el equipo sigue entrando)', /if\(MICUENTA_CERRADA && !S\.equipo\)\{ mostrarCerrado\(\); return; \}/.test(html));

// ── 2. Un cliente abre pagasi.io/micuenta.html ──
let a = arrancar('');
ok('arranca sin error', !a.error);
ok('no se conecta con Firebase (ni sesión guardada, ni SMS, ni enlace)', a.conexiones() === 0);
ok('muestra el aviso en vez del formulario', /no está disponible por ahora/.test(a.el('lgT').textContent) && /WhatsApp/.test(a.el('lgSub').textContent));
ok('esconde teléfono, código, enlace y la entrada del equipo', ['stepTel','stepCod','stepCed','stepStaff','lgStaff'].every(id => a.el(id).classList.contains('hide')));
ok('la pantalla de entrada queda visible y el portal escondido', !a.el('scLogin').classList.contains('hide') && a.el('scApp').classList.contains('hide'));
ok('el enlace de WhatsApp pasa a ser el botón de ayuda', /Escribir por WhatsApp/.test(a.el('lgWa').textContent) && /^https:\/\/wa\.me\/\d+\?text=/.test(a.el('lgWa').href) && a.el('lgWa').classList.contains('btn'));
ok('la nota de abajo ya no habla del número registrado', a.nota && /paciencia/.test(a.nota.textContent));

// ── 3. Aunque alguien llame a las funciones a mano, no pasa nada ──
a.el('tel').value = '04141234567';
a.ctx.pedirCodigo(); a.ctx.verificarCodigo(); a.ctx.entrarConEnlace();
ok('pedir código, verificar y entrar con enlace no hacen nada', a.conexiones() === 0 && a.el('stepCod').classList.contains('hide'));

// ── 4. Con ?t=...&c=... (enlace personal) tampoco entra ──
a = arrancar('?t=ABC123&c=CLI-9');
ok('el enlace personal ?t= tampoco abre el portal', a.conexiones() === 0 && /no está disponible/.test(a.el('lgT').textContent));

// ── 5. El equipo con ?equipo=1 sí sigue su camino (intenta conectar) ──
a = arrancar('?equipo=1');
ok('con ?equipo=1 el portal intenta conectar con Firebase como siempre', a.conexiones() === 1 && !/no está disponible/.test(a.el('lgT').textContent));

console.log(`\n${pass} OK, ${fail} FALLA`);
process.exit(fail ? 1 : 0);
