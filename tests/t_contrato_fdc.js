// 22-oct-2026, Adam (lo pidió Alejandro): (1) el contrato no menciona ningún tipo de cambio: solo que
// el préstamo es en dólares; (2) en el sistema no aparece "APY": ahora se llama FDC, también en la
// calculadora. Los nombres internos (apy, planModo 'apy') siguen igual: no se ven y los usan los datos.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };
const leer = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ── 1. El contrato vigente (v3 con Pagasi Protect) ──
const ctr = leer('logic/contratos-protect.js');
const textos = ctr.split('\n').filter(l => /function\(D\)\{ return '/.test(l)).join('\n');   // solo las cláusulas que se imprimen
ok('ninguna cláusula habla de tipo de cambio, del BCV ni del euro', !/tipo de cambio|Banco Central|BCV|EURO|bcv\.org/i.test(textos));
ok('ya no cita los artículos 128 y 130 de la Ley del BCV', !/artículo 128|artículo 130/.test(textos));
ok('ni pone el total en bolívares', !/mtaBs|Bs\. /.test(ctr));
ok('la 3.14 dice que el préstamo es en dólares', /3\.14\\tMoneda del Contrato\. El Financiamiento se otorga en Dólares\./.test(ctr));
ok('la 3.5 sigue con el Monto Total Adeudado en dólares', /3\.5\\tMonto Total Adeudado\. La suma del Monto Financiado y de los Intereses Financieros asciende a '\+D\.MTA\+'/.test(ctr));

// ── 2. "APY" ya no aparece en pantalla: es FDC ──
const visibles = ['calculadora.html', 'logic/centro.js', 'logic/creditos.js', 'logic/financiero.js', 'logic/motos.js', 'logic/pagos.js', 'logic/catalogo.js',
  'modules/catalogo.js', 'modules/creditos.js', 'modules/dash.js', 'modules/reportes.js', 'modules/plan.js', 'assets/pagasi-app.js', 'admin.html', 'index.html'];
const conApy = visibles.filter(f => fs.existsSync(path.join(ROOT, f)) && leer(f).split('\n').some(l => !/base64|replace\(\/\\bAPY/.test(l) && /\bAPY\b/.test(l)));
ok('ningún archivo del sistema muestra "APY" (' + (conApy.join(', ') || 'ninguno') + ')', conApy.length === 0);
const calc = leer('calculadora.html');
ok('la calculadora dice FDC objetivo, % FDC y FDC estimado', /FDC objetivo/.test(calc) && /% FDC/.test(calc) && /FDC estimado/.test(calc) && /Método FDC/.test(calc));
ok('el plan de motos se llama "FDC / Meses" y en Cobranza la fila dice FDC', /FDC \/ Meses/.test(leer('logic/motos.js')) && />FDC<\/span>/.test(leer('logic/pagos.js')));
ok('los planes guardados antes con "APY" en el nombre se muestran con FDC', /\.replace\(\/\\bAPY\\b\/g,'FDC'\)/.test(leer('modules/plan.js')));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
