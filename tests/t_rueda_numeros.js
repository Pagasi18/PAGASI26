// La rueda del ratón sobre un campo numérico con el foco le cambiaba el valor en 1 (Adam, 6-nov-2026: el precio de
// 1515 se guardaba como 1514 al editar un crédito). El núcleo le quita el foco al campo antes de que cambie.
const fs = require('fs'), path = require('path'), vm = require('vm');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/pagasi-app.js'), 'utf8');
const bloque = src.slice(src.lastIndexOf("document.addEventListener('wheel'"));
const oyentes = [];
const campo = { tagName: 'INPUT', type: 'number', value: '1515', blur() { G.document.activeElement = null; this.desenfocado = true; } };
const G = { document: { activeElement: campo, addEventListener(t, f, o) { oyentes.push([t, f, o]); } } };
vm.createContext(G); vm.runInContext(bloque, G);
ok('el núcleo escucha la rueda en captura y sin bloquear el desplazamiento', oyentes.length === 1 && oyentes[0][0] === 'wheel' && oyentes[0][2].capture === true && oyentes[0][2].passive === true);
oyentes[0][1]({ target: campo });
ok('la rueda sobre el precio con el foco le quita el foco: el valor sigue en 1515', campo.desenfocado === true && campo.value === '1515');
const texto = { tagName: 'INPUT', type: 'text', blur() { this.desenfocado = true; } }; G.document.activeElement = texto;
oyentes[0][1]({ target: texto });
ok('un campo de texto no se toca', !texto.desenfocado);
console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
