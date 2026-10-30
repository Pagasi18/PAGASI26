// 30-oct-2026. Adam: "necesito mejorar esta página (la entrada del sistema) y la experiencia móvil es muy mala".
// Entrada nueva (panel de marca + tarjeta, ver/ocultar contraseña, botón ocupado) y arreglos del teléfono:
// Cobranza y Contratos en fichas, menú sin accesos repetidos, pestañas que se deslizan, ventanas a una columna.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const leer = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = leer('admin.html'), css = leer('assets/pagasi.css'), mcss = leer('assets/pagasi-mobile.css'), app = leer('assets/pagasi-app.js');

// ── Entrada ──
const login = html.slice(html.indexOf('id="login-screen"'), html.indexOf('id="invite-screen"'));
ok('la entrada conserva los ids que usa el código (l_user, l_pass, login-err)', ['id="l_user"', 'id="l_pass"', 'id="login-err"'].every(s => login.includes(s)));
ok('tiene panel de marca y tarjeta', login.includes('class="login-brand"') && login.includes('class="login-card"') && login.includes('class="login-stage"'));
ok('se puede ver la contraseña (botón con toggleLoginPass)', login.includes('onclick="toggleLoginPass()"') && /function toggleLoginPass\(\)/.test(app) && /window\.toggleLoginPass = toggleLoginPass/.test(app));
ok('el botón Entrar tiene id y se marca ocupado mientras entra', login.includes('id="login-btn"') && /_loginBusy\(true\)/.test(app) && (app.match(/_loginBusy\(false\)/g) || []).length >= 2);
ok('sigue la recuperación de contraseña y la versión', login.includes('onclick="resetPasswordLogin()"') && /Versión 2\.18/.test(login));
ok('ya no dice "Firebase Auth" ni "Ingresa tus credenciales"', !/Firebase Auth/.test(login) && !/Ingresa tus credenciales/.test(login));
ok('estilos: panel de marca en escritorio y apilado en el teléfono', /\.login-stage\{[^}]*grid-template-columns/.test(css) && /@media \(max-width:860px\)\{[\s\S]*\.login-stage\{display:block/.test(css));
ok('en el teléfono el campo no provoca zoom (16px) y el botón mide al menos 52px', /\.login-inp\{font-size:16px!important;min-height:52px\}/.test(mcss) && /\.login-btn\{min-height:52px/.test(mcss));
ok('la invitación conserva su tarjeta', html.includes('id="invite-screen"') && /\.login-wrap>\.login-card\{/.test(css));

// ── Móvil: Cobranza y Contratos en fichas ──
const movil = leer('logic/movil.js');
ok('las tablas de Cobranza y Contratos también pasan a fichas', /\['clientes','motos','creditos','pagos','contratos'\]\.indexOf\(S\.page\)/.test(movil));
ok('en Cobranza las notas y la gestión ocupan el ancho completo de la ficha', /td\[data-label="Gestión de cobro"\][^{]*\{grid-column:1\/-1\}/.test(mcss));
ok('las pestañas hechas con borde inferior se deslizan en vez de partirse', /border-bottom:2px solid var\(--rim\)"\]\[style\*="display:flex"\]\{overflow-x:auto/.test(mcss));
ok('las ventanas de detalle pasan a una columna en el teléfono', /#modal-box \[style\*="grid-template-columns:1fr 1fr"\]/.test(mcss) && /#modal-box \.m-ft\{flex-wrap:wrap\}/.test(mcss));

// ── Menú del teléfono sin repetidos (se corre la función con módulos falsos) ──
const navsrc = leer('logic/movil-navegacion.js');
const ctx = { PGL: { dash: 'Dashboard', clientes: 'Clientes', creditos: 'Créditos', pagos: 'Cobranza', cobranza: 'Cobranza', reportes: 'Finanzas', conta: 'Finanzas', cuentas: 'Cuentas', config: 'Configuración' },
  hasModuleAccess: () => true, sidebarMuestra: () => true, _puedeVender: () => true, S: { page: 'dash' }, document: { createElement(){ return {}; }, getElementById(){ return null; } }, window: {}, console };
vm.createContext(ctx);
vm.runInContext(navsrc.slice(0, navsrc.indexOf('function pgMobileMenuFilter')), ctx, { filename: 'movil-navegacion.js' });
const grupos = ctx.pgMobileMenuEntries();
const etiquetas = [].concat(...grupos.map(g => g.keys.map(k => ctx.pgMobileModuleLabel(k))));
ok('el menú no repite nombres: una sola "Cobranza" y una sola "Finanzas"', etiquetas.filter(e => e === 'Cobranza').length === 1 && etiquetas.filter(e => e === 'Finanzas').length === 1 && new Set(etiquetas).size === etiquetas.length);
ok('y conserva los demás accesos', etiquetas.includes('Inicio') && etiquetas.includes('Clientes') && etiquetas.includes('Cuentas') && etiquetas.includes('Configuración'));

console.log(`\n${pass} OK, ${fail} FALLA`);
process.exit(fail ? 1 : 0);
