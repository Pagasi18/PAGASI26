// Idiomas del panel (27-nov-2026). El panel está en español; logic/i18n.js traduce lo que se VE
// con el diccionario assets/i18n-en.js. Aquí se cuida lo que no puede pasar: que se traduzca un
// nombre o un mensaje al cliente, que un texto quede mitad y mitad, y que el idioma se guarde
// donde debe (la ficha del usuario).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const eq = (l, a, b) => ok(l + (a === b ? '' : '  → salió ' + JSON.stringify(a) + ', se esperaba ' + JSON.stringify(b)), a === b);

global.window = {};
require(path.join(ROOT, 'assets/i18n-en.js'));
const I = require(path.join(ROOT, 'logic/i18n.js'));
const D = global.window.PG_I18N_EN;

// ── Motor, con un diccionario chico y conocido ──
const P = I.pgI18nPreparar({
  x: { 'Guardar': 'Save', 'Créditos': 'Credits', 'Activo': 'Active', 'Sin responder': 'Unanswered', 'Administrador': 'Administrator', 'Cuota': 'Installment', 'Clientes': 'Customers' },
  t: [['{0} contrato{1} · click en una fila', '{0} contract{1} · click a row'], ['Hola, {0}!', 'Hello, {0}!'], ['{0} de {1}', '{0} of {1}'],
      ['{0} marcado{1} · {2} vencido', '{0} marked · {2} overdue'], ['Estado: {0}', 'Status: {0}'], ['No se pudo guardar: {0}', 'Could not save: {0}']]
});
const T = s => I.pgI18nTexto(s, P);
eq('una palabra del diccionario', T('Guardar'), 'Save');
eq('con espacios alrededor', T('  Guardar \n'), 'Save');
eq('lo que no está en el diccionario se deja (null)', T('Juan Pérez'), null);
eq('minúscula: usa la entrada en mayúscula y respeta la caja', T('créditos'), 'credits');
eq('MAYÚSCULAS: igual', T('CRÉDITOS'), 'CREDITS');
eq('plantilla con plural pegado', T('25 contratos · click en una fila'), '25 contracts · click a row');
eq('plantilla con plural vacío', T('1 contrato · click en una fila'), '1 contract · click a row');
eq('plantilla que suelta un hueco (adjetivo)', T('3 marcados · 2 vencido'), '3 marked · 2 overdue');
eq('el dato de adentro se traduce si es del diccionario', T('Estado: Activo'), 'Status: Active');
eq('el dato de adentro que no se conoce queda igual', T('No se pudo guardar: sin conexión'), 'Could not save: sin conexión');
eq('saludo con un nombre', T('Hola, adam!'), 'Hello, adam!');
eq('"3 de 24" sí (son números)', T('3 de 24'), '3 of 24');
eq('"Juan de Dios" NO: es un nombre', T('Juan de Dios'), null);
eq('"María del Mar" NO', T('María del Mar'), null);
eq('número + palabra', T('148 créditos'), '148 credits');
eq('con paréntesis', T('Sin responder (3)'), 'Unanswered (3)');
eq('separado por · : el nombre queda igual', T('Administrador · adam'), 'Administrator · adam');
eq('con números en medio, todo o nada: "Cuota 3 de 24"', T('Cuota 3 de 24'), 'Installment 3 of 24');
eq('un mensaje al cliente NO queda mitad y mitad', T('Hola Cliente, tu cuota 3 de 24 vence el 30. Si ya pagaste, avísame.'), null);
eq('otro mensaje con palabras del diccionario', T('ya pagué mis Créditos, gracias'), null);
eq('fecha larga', T('viernes, 27 de noviembre de 2026'), 'Friday, 27 November 2026');
eq('fecha en mayúsculas', T('VIERNES, 27 DE NOVIEMBRE DE 2026'), 'FRIDAY, 27 NOVEMBER 2026');
eq('fecha corta con acento', T('mié, 4 nov.'), 'Wed, 4 Nov.');
eq('mes y año', T('noviembre de 2026'), 'November 2026');
eq('un número solo no se toca', T('1.234,50'), null);
eq('idioma desconocido = español', I.pgIdiomaValido('fr'), 'es');
eq('inglés es válido', I.pgIdiomaValido('en'), 'en');

// ── El diccionario de verdad ──
const R = I.pgI18nPreparar(D);
const TR = s => I.pgI18nTexto(s, R);
ok('el diccionario tiene miles de textos', Object.keys(D.x).length > 4000 && D.t.length > 800);
ok('ninguna plantilla inventa huecos', D.t.every(p => { const f = new Set(p[0].match(/\{\d+\}/g) || []); return (p[1].match(/\{\d+\}/g) || []).every(h => f.has(h)); }));
ok('ninguna traducción quedó vacía', Object.values(D.x).every(v => typeof v === 'string' && v.trim()) && D.t.every(p => p[1].trim()));
eq('Guardar', TR('Guardar'), 'Save');
eq('Créditos', TR('Créditos'), 'Credits');
eq('Cobranza', TR('Cobranza'), 'Collections');
ok('los nombres de las cuentas de QuickBooks no se traducen', TR('CARTERA DE FINANCIAMIENTO') === null && TR('INGRESOS POR PAGASI PROTEC') === null);
ok('un nombre de cliente no se toca', TR('JEAN MANUEL DURAN GODOY') === null && TR('María del Mar Pérez') === null);
ok('un mensaje de cobranza al cliente no se toca', TR('Hola Cliente, soy el asistente de Pagasi. Tu cuota 3 de 24 ($45) vence el 30 nov. Si ya pagaste, mándame la foto del comprobante.') === null);
ok('lo que escribe el cliente no se toca', TR('ya pagué') === null && TR('cuánto debo?') === null && TR('pago el sábado') === null);

// ── Dónde está puesto ──
const admin = src('admin.html'), usr = src('logic/usuarios.js'), cfg = src('modules/config.js'), app = src('assets/pagasi-app.js'), mot = src('logic/i18n.js');
ok('admin.html carga logic/i18n.js justo después del núcleo', /assets\/pagasi-app\.js\?v=[^"]*"><\/script>\s*<script charset="utf-8" src="logic\/i18n\.js\?v=/.test(admin));
ok('el diccionario NO se carga para todos (solo quien usa otro idioma)', !/i18n-en\.js/.test(admin));
ok('al entrar se aplica el idioma de la ficha (dos entradas: sesión y activación)', (usr.match(/pgIdiomaUsuario\(\)/g) || []).length >= 2);
ok('al invitar, el admin elige el idioma y va en la invitación', /pgIdiomaSelectHTML\('invu_idioma'/.test(usr) && /idioma: \(typeof pgIdiomaValido==='function' && \$\('invu_idioma'\)\)/.test(usr));
ok('la ficha nace con el idioma de la invitación', /if\(pending\.idioma === 'en'\) updateData\.idioma = 'en'/.test(usr));
ok('al editar un usuario se puede cambiar su idioma', /pgIdiomaSelectHTML\('eu_idioma',u\.idioma\)/.test(usr) && /idioma:idiomaNuevo/.test(usr));
ok('si el admin se lo cambia, se aplica sin recargar', /data\.idioma\|\|'es'\) !== \(S\.currentUser\.idioma\|\|'es'\)/.test(app));
ok('Configuración tiene la tarjeta de idioma', /pgIdiomaSelectHTML\('cfg_idioma'/.test(cfg) && /pgIdiomaGuardar\(/.test(cfg));
ok('el idioma se guarda en la ficha propia por DB', /DB\.updateUsuario\(u\.uid, \{ idioma: idioma \}\)/.test(mot));
ok('el idioma no es un campo de acceso en las Reglas (cada quien puede guardar el suyo)', !/camposDeAcceso\(\)\s*\{\s*return \[[^\]]*idioma/.test(src('firestore.rules')));
ok('no se traduce dentro de textarea, editores ni bloques data-noi18n', /TEXTAREA/.test(mot) && /isContentEditable/.test(mot) && /data-noi18n/.test(mot));
ok('un <option> sin value conserva su valor en español', /padre\.tagName === 'OPTION' && !padre\.hasAttribute\('value'\)/.test(mot));
ok('el teléfono compara con el texto en español, no con el traducido', /pgTextoEs\(title\)/.test(src('logic/movil-navegacion.js')) && /pgTextoEs\(state\)/.test(src('logic/movil-ventas.js')));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
