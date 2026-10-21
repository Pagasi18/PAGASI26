// Mayúsculas y sin tildes en todo el sistema (Adam, 21-oct-2026): la regla de assets/public/mayusculas.js y la del
// servidor (functions/lib/procesar.js), qué campos toca y cuáles deja como se escribieron.
const path = require('path');
const M = require(path.join(__dirname, '..', 'assets', 'public', 'mayusculas.js'));
const procesar = require(path.join(__dirname, '..', 'functions', 'lib', 'procesar.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
// Un campo falso con lo que mira la regla
function campo(tag, attrs, extra) {
  const a = Object.assign({}, attrs || {});
  return Object.assign({ tagName: tag, type: a.type || (tag === 'INPUT' ? 'text' : undefined), id: a.id || '', value: '', readOnly: false, disabled: false,
    getAttribute: k => (k in a ? a[k] : null), closest: sel => (sel === '[data-libre]' && a.libre ? {} : null) }, extra || {});
}

ok('ana → ANA', M.pgMayus('ana') === 'ANA');
ok('Ána con tilde → ANA', M.pgMayus('Ána') === 'ANA');
ok('José María Pérez → JOSE MARIA PEREZ', M.pgMayus('José María Pérez') === 'JOSE MARIA PEREZ');
ok('la Ñ se queda: Peña → PEÑA, Muñoz Núñez → MUÑOZ NUÑEZ', M.pgMayus('Peña') === 'PEÑA' && M.pgMayus('Muñoz Núñez') === 'MUÑOZ NUÑEZ');
ok('la diéresis se quita: Güiria → GUIRIA', M.pgMayus('Güiria') === 'GUIRIA');
ok('números, signos y cédulas no cambian salvo la letra', M.pgMayus('v-12.345.678') === 'V-12.345.678' && M.pgMayus('Av. 4 de Mayo, #3') === 'AV. 4 DE MAYO, #3');
ok('el servidor usa la misma regla', ['ana', 'Ána', 'José María Pérez', 'Peña', 'Güiria'].every(s => procesar.mayus(s) === M.pgMayus(s)));

// Qué campos toca
ok('toca: nombre, cédula, dirección, empresa (campos de texto normales)', ['wz_nom', 'wz_ci', 'wz_ciudad', 'wz_empresa', 'cm_modelo'].every(id => M.aplica(campo('INPUT', { id }))));
ok('toca: notas y observaciones (textarea)', M.aplica(campo('TEXTAREA', { id: 'comp_notas' })) && M.aplica(campo('TEXTAREA', { id: 'wz_dir_det' })));
ok('no toca: correo (tipo email, autocomplete o placeholder con @)', !M.aplica(campo('INPUT', { id: 'x1', type: 'email' }, { type: 'email' })) && !M.aplica(campo('INPUT', { id: 'wz_email' })) && !M.aplica(campo('INPUT', { id: 'x2', autocomplete: 'email' })) && !M.aplica(campo('INPUT', { id: 'x3', placeholder: 'correo@ejemplo.com' })));
ok('no toca: claves, números, fechas y teléfonos', !M.aplica(campo('INPUT', { id: 'p' }, { type: 'password' })) && !M.aplica(campo('INPUT', { id: 'n' }, { type: 'number' })) && !M.aplica(campo('INPUT', { id: 'd' }, { type: 'date' })) && !M.aplica(campo('INPUT', { id: 't' }, { type: 'tel' })));
ok('no toca: buscadores (placeholder "Buscar…" o id que termina en Q)', !M.aplica(campo('INPUT', { id: 'clienteQ' })) && !M.aplica(campo('INPUT', { id: 'zz', placeholder: 'Buscar cliente por nombre o cédula...' })) && !M.aplica(campo('INPUT', { id: 'wz_dir_q' })) && !M.aplica(campo('INPUT', { id: 'cind_q', placeholder: 'Búsqueda de texto completo...' })));
ok('no toca: el chat y las instrucciones de Paola y Patricia (wa-…), ni los mensajes', !M.aplica(campo('TEXTAREA', { id: 'wa-texto' })) && !M.aplica(campo('TEXTAREA', { id: 'wa-instr' })) && !M.aplica(campo('TEXTAREA', { id: 'notif_msg_manual' })));
ok('no toca: redes sociales, enlaces y usuarios', !M.aplica(campo('INPUT', { id: 'prof-instagram', placeholder: '@tuusuario' })) && !M.aplica(campo('INPUT', { id: 'prof-linkedin' })) && !M.aplica(campo('INPUT', { id: 'invite-link-field' })) && !M.aplica(campo('INPUT', { id: 'gps_usuario' })));
ok('no toca: lo marcado data-libre, ni campos de solo lectura o desactivados', !M.aplica(campo('INPUT', { id: 'cm_desc', libre: true })) && !M.aplica(campo('INPUT', { id: 'wz_nom' }, { readOnly: true })) && !M.aplica(campo('INPUT', { id: 'wz_nom' }, { disabled: true })));

// Mientras se escribe: el valor cambia y el cursor se queda donde estaba
const el = campo('INPUT', { id: 'wz_nom' }, { value: 'josé', selectionStart: 3, selectionEnd: 3, setSelectionRange(a, b) { this._sel = [a, b]; } });
M.normalizar(el);
ok('al escribir "josé" queda "JOSE"', el.value === 'JOSE');

console.log(`\n${pass} pruebas OK, ${fail} fallas`);
if (fail) process.exit(1);
