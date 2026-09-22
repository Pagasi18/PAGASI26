// Corre todas las suites tests/t_*.js y resume.
// public-site.test.js entra tambien: estaba fuera de la suite, nadie la corria y se
// quedo desactualizada meses (punto 40 de la lista del 18-sep). Una prueba que no
// corre no es una prueba. Imprime "OK ..." igual que las demas.
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const dir = __dirname;
const suites = fs.readdirSync(dir).filter(f => /^t_.*\.js$/.test(f) || f === 'public-site.test.js').sort();
let totalOk = 0, totalFail = 0, crashed = 0;
for (const f of suites) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = (out.match(/^OK /mg) || []).length;
  const fail = (out.match(/^FALLA /mg) || []).length;
  const crash = r.status !== 0 && fail === 0;
  if (crash) crashed++;
  totalOk += ok; totalFail += fail;
  console.log(`${crash ? '💥' : fail ? '✗' : '✓'} ${f}: ${ok} OK${fail ? ', ' + fail + ' FALLA' : ''}${crash ? ' (se cayó)' : ''}`);
  if (fail || crash) console.log(out.split('\n').filter(l => /^FALLA|Error|at /.test(l)).slice(0, 12).map(l => '    ' + l).join('\n'));
}
console.log(`\n${totalOk} pruebas OK · ${totalFail} fallas · ${crashed} suites caídas`);
process.exit(totalFail || crashed ? 1 : 0);
