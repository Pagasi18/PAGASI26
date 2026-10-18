// Portal de aliados (17-oct-2026): lo que arma el robot lo entiende el portal. Se corre el robot
// con datos inventados, se le pasan sus resúmenes a portal.js (sin DOM) y se revisa que las
// cifras del tablero salgan bien, incluido el grupo (la suma de las sedes).
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = require(path.join(ROOT, 'bot', 'aliados-resumen.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

// portal.js sin DOM: solo expone desdeResumenes
const ctx = { window: {}, document: { getElementById(){ return null; }, querySelectorAll(){ return []; } }, console, matchMedia: null, requestAnimationFrame: null };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'aliados', 'portal.js'), 'utf8'), ctx, { filename: 'portal.js' });
ok('portal.js carga sin DOM y expone el traductor de resúmenes', ctx.PortalAliados && typeof ctx.PortalAliados.desdeResumenes === 'function');

const HOY = '2026-10-17';
const iso = d => { const x = new Date(Date.UTC(2026, 9, 17)); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
function cred(id, emp, conc, dias, extra){ return Object.assign({ id, empresa: emp, concesionarioId: conc, cli: 'ANA LÓPEZ', marca: 'EK', modelo: 'XPRESS 150', precio: 1300, precioBaseReal: 1300, ini: 520, fin: 780, total: 1200, cuotaQ: 50, totalCuotas: 24, plazo: 12, frecuencia: 'quincenal', fecha: iso(-dias), creado: new Date(Date.UTC(2026, 9, 17 - dias, 14, 0)).toISOString(), estado: 'activo' }, extra || {}); }
const porEmpresa = {
  '18': { concesionarios: [{ id: 'C-BM', nombre: 'EMPIRE Bello Monte', ciudad: 'Caracas' }, { id: 'C-HJ', nombre: 'HAOJIN', ciudad: 'Boleíta' }], creditos: [cred('CRED-1', '18', 'C-BM', 100), cred('CRED-2', '18', 'C-HJ', 95)], pagos: [] },
  '26': { concesionarios: [{ id: 'C-BM', nombre: 'EMPIRE Bello Monte', ciudad: 'Caracas', anticipos: [{ fecha: iso(-20), monto: 10000 }] }, { id: 'C-HJ', nombre: 'HAOJIN', ciudad: 'Boleíta', anticipos: [{ fecha: iso(-10), monto: 3000 }] }, { id: 'C-X', nombre: 'Otro', ciudad: 'Valera', anticipos: [] }],
          creditos: [cred('M-1', '26', 'C-BM', 5), cred('M-2', '26', 'C-BM', 2, { fin: 900 }), cred('M-3', '26', 'C-HJ', 4), cred('M-4', '26', 'C-X', 1, { fin: 20000 }), cred('M-5', '26', 'C-BM', 0, { estado: 'pendiente_revision', vendedorNombre: 'Luis M' })], pagos: [] }
};
const sedes = R.armarSedes(porEmpresa);
const resumenes = {}; Object.keys(sedes).forEach(id => { resumenes[id] = R.resumenSede(sedes[id], HOY); }); R.ranking(resumenes);
const docs = ['C-BM', 'C-HJ'].map(id => Object.assign({ concId: id, actualizadoEn: '2026-10-17T14:05:00.000Z', hoy: HOY }, resumenes[id]));

const D = ctx.PortalAliados.desdeResumenes(docs, { nombre: 'Dueño EK', grupo: 'Grupo EK · Haojin' });
ok('no es demo, el grupo lleva su nombre y las dos sedes', D.demo === false && D.nombre === 'Grupo EK · Haojin' && D.orden.join() === 'todas,C-BM,C-HJ' && D.NOM['C-BM'] === 'EK Bello Monte' && D.NOM.todas === 'Las 2');
ok('la sede: motos y volumen del mes, saldo del depósito y total histórico', D.SEDES['C-BM'].motos === 2 && D.SEDES['C-BM'].vol === 1680 && D.SEDES['C-BM'].dep === 10000 && D.SEDES['C-BM'].saldo === 10000 - 780 - 780 && D.SEDES['C-BM'].total === 3);   // el depósito descuenta precio − inicial, no lo financiado
ok('el grupo suma las sedes: 3 motos, $2.460, depósito $13.000, saldo $10.660, 5 motos desde el inicio', D.SEDES.todas.motos === 3 && D.SEDES.todas.vol === 2460 && D.SEDES.todas.dep === 13000 && D.SEDES.todas.saldo === 10660 && D.SEDES.todas.total === 5);
ok('el bono no aplica (aliado viejo) y la cartera >60 días son los dos créditos de la 18', D.SEDES.todas.bono === null && D.SEDES.todas.cartera === 2);
ok('las ventas vienen ordenadas por fecha, con sede, modelo, nombre corto y estado', D.VENTAS.length === 5 && D.VENTAS[0][1] === 'C-BM' && D.VENTAS[0][2] === 'EK XPRESS 150' && D.VENTAS[0][3] === 'Ana López' && ['aldia','atraso'].includes(D.VENTAS[0][4]));
ok('la solicitud pendiente aparece primero, con el vendedor', D.SOL[0][0] === 'Pendiente' && /Luis/.test(D.SOL[0][3]) && D.SOL[0][4] === 'ojo');
ok('los movimientos del depósito llevan saldo acumulado', D.MOVS.length === 5 && typeof D.MOVS[0][4] === 'number');
ok('el ranking de la sede marca "tú" y deja a los demás sin nombre', D.RANK['C-BM'].some(r => r[2]) && D.RANK['C-BM'].some(r => /Concesionario · /.test(r[0])) && D.totalAliados === 3);
ok('la hora de actualización sale del robot', /a las \d{1,2}:\d{2}/.test(D.actualizado));
ok('las etiquetas de la gráfica son los últimos seis meses', D.SEDES.todas.etiquetas.length === 6 && D.SEDES.todas.etiquetas[5] === 'Oct' && D.SEDES.todas.meses[5] === 2460);
ok('sin resúmenes no se rompe', ctx.PortalAliados.desdeResumenes([], {}).orden.join() === 'todas');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
