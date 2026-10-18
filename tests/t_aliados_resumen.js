// Robot del portal de aliados (17-oct-2026): los calculos puros con datos inventados.
// Dos companias con el mismo concesionario, anticipos solo en la 26 (como pasa de verdad),
// un credito en mora, una solicitud pendiente y una aprobada con minutos.
const path = require('path');
const R = require(path.join(__dirname, '..', 'bot', 'aliados-resumen.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const HOY = '2026-10-17';
const iso = (d) => { const x = new Date(Date.UTC(2026, 9, 17)); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
function cred(id, emp, dias, extra){ return Object.assign({ id, empresa: emp, concesionarioId: 'C-EK', cli: 'MARÍA JOSÉ PÉREZ GARCÍA', marca: 'EK', modelo: 'XPRESS 150', precio: 1300, precioBaseReal: 1300, ini: 520, fin: 780, total: 1200, cuotaQ: 50, totalCuotas: 24, plazo: 12, frecuencia: 'quincenal', fecha: iso(-dias), creado: new Date(Date.UTC(2026, 9, 17 - dias, 14, 0)).toISOString(), estado: 'activo' }, extra || {}); }

// ── nivel y multiplicador ──
ok('niveles: 9.999 Bronce, 10.000 Plata, 25.000 Oro, 50.000 Diamante', R.nivelDe(9999).id === 'bronce' && R.nivelDe(10000).id === 'plata' && R.nivelDe(25000).id === 'oro' && R.nivelDe(50000).id === 'diamante' && R.nivelDe(50000).siguiente === null);
ok('multiplicador por atraso: <5 → 110, 5–10 → 100, 10–15 → 75, >15 → 50', R.multDe(3) === 110 && R.multDe(5) === 100 && R.multDe(10) === 100 && R.multDe(12) === 75 && R.multDe(20) === 50);
ok('lo que puso Pagasi en la moto = precio − inicial (nunca negativo)', R.costoSalida({ precio: 1300, ini: 520 }) === 780 && R.costoSalida({ precio: 1000, ini: 1200 }) === 0);
ok('el nombre del cliente sale corto y capitalizado', R.nombreCorto('MARÍA JOSÉ PÉREZ GARCÍA') === 'María José' && R.nombreCorto('') === 'Cliente');

// ── armar sedes con las dos companias ──
const porEmpresa = {
  '18': { concesionarios: [{ id: 'C-EK', nombre: 'EMPIRE Bello Monte', ciudad: 'Caracas', anticipos: [] }],
          creditos: [cred('CRED-1', '18', 120), cred('CRED-2', '18', 90, { cli: 'JOSÉ ROJAS' })],
          pagos: [{ cred: 'CRED-1', monto: 50, fecha: iso(-105) }, { cred: 'CRED-1', monto: 50, fecha: iso(-90) }, { cred: 'CRED-1', monto: 50, fecha: iso(-75) }, { cred: 'CRED-1', monto: 50, fecha: iso(-60) }, { cred: 'CRED-1', monto: 50, fecha: iso(-45) }, { cred: 'CRED-1', monto: 50, fecha: iso(-30) }, { cred: 'CRED-1', monto: 50, fecha: iso(-15) }, { cred: 'CRED-1', monto: 50, fecha: iso(-1) }] },
  '26': { concesionarios: [{ id: 'C-EK', nombre: 'EMPIRE Bello Monte', ciudad: 'Caracas', anticipos: [{ fecha: iso(-20), monto: 5000 }, { fecha: iso(-5), monto: 2000 }] }, { id: 'C-OTRO', nombre: 'Otro', ciudad: 'Valera', anticipos: [] }],
          creditos: [cred('M-1', '26', 10, { creado: new Date(Date.UTC(2026, 9, 7, 13, 0)).toISOString(), aprobadoEn: new Date(Date.UTC(2026, 9, 7, 13, 31)).toISOString() }), cred('M-2', '26', 3, { fin: 900, precio: 1500, precioBaseReal: 1500, ini: 600 }), cred('M-3', '26', 1, { estado: 'pendiente_revision', vendedorNombre: 'Luis Marques' }), cred('M-4', '26', 2, { estado: 'cancelado' }), cred('M-9', '26', 4, { concesionarioId: 'C-OTRO', fin: 12000 })],
          pagos: [{ cred: 'M-1', monto: 50, fecha: iso(-2) }] }
};
const sedes = R.armarSedes(porEmpresa);
ok('las dos companias se juntan por el id del concesionario', Object.keys(sedes).sort().join() === 'C-EK,C-OTRO' && sedes['C-EK'].creditos.length === 6 && sedes['C-EK'].anticipos.length === 2);
ok('los pagos quedan con su credito y su compania', sedes['C-EK'].pagosPorCred['CRED-1'].length === 8 && sedes['C-EK'].pagosPorCred['M-1'].length === 1);

const r = R.resumenSede(sedes['C-EK'], HOY);
ok('el mes cuenta solo las ventas del mes, sin canceladas ni pendientes: 2 motos, $1.680', r.mes.motos === 2 && r.mes.vol === 1680 && r.mes.nivel === 'bronce' && r.mes.pct === 1);
ok('la comision base es el 1% y el multiplicador sale de la cartera', r.mes.base === 16.8 && r.mes.comision === 16.8 * r.mes.mult / 100);
ok('la cartera (>60 días) son los dos créditos de la 18: uno al día con sus pagos y uno sin pagar → 50% con atraso → multiplicador 50', r.calidad.cartera === 2 && r.calidad.atrasados === 1 && r.calidad.atrasoPct === 50 && r.calidad.mult === 50);
ok('el depósito solo cuenta la compania con anticipos (la 26): 7.000 enviados − 780 − 900 = $5.320', r.deposito.empresas.join() === '26' && r.deposito.enviado === 7000 && r.deposito.consumido === 1680 && r.deposito.saldo === 5320);
ok('el kardex va del más nuevo al más viejo con saldo acumulado', r.deposito.movimientos.length === 4 && r.deposito.movimientos[0].saldo === 5320 && r.deposito.movimientos[r.deposito.movimientos.length - 1].monto === 5000);
ok('las ventas salen sin datos personales: fecha, modelo, nombre corto, financiado y días de atraso', r.ventas.length === 4 && r.ventas.every(v => Object.keys(v).sort().join() === 'completado,dias,empresa,fecha,fin,modelo,nombre') && r.ventas[0].nombre === 'María José');
ok('la solicitud pendiente lleva el nombre de pila del vendedor y la aprobada sus minutos (31)', r.solicitudes.pendientes.length === 1 && r.solicitudes.pendientes[0].vendedor === 'Luis' && r.solicitudes.ultimas[0].minutos === 31 && r.solicitudes.prom === 31 && r.solicitudes.rec === 31);
ok('seis meses, el último es el actual', r.meses.length === 6 && r.meses[5].ym === '2026-10' && r.meses[5].vol === 1680 && r.meses[2].motos === 1);
ok('desde el inicio: 4 motos, la primera hace 120 días, y el bono ya no aplica', r.desde.motos === 4 && r.desde.dias === 120 && r.bono.aplica === false);

// ── ranking entre sedes, sin nombres ajenos ──
const todos = { 'C-EK': r, 'C-OTRO': R.resumenSede(sedes['C-OTRO'], HOY) };
R.ranking(todos);
ok('el ranking ordena por volumen del mes y el otro sale sin nombre', todos['C-OTRO'].ranking.posicion === 1 && todos['C-EK'].ranking.posicion === 2 && todos['C-EK'].ranking.lista[0].nombre === 'Concesionario · Valera' && todos['C-EK'].ranking.lista[1].tu === true && todos['C-EK'].ranking.faltaPrimero === 12000 - 1680);
// ── grupos: varias sedes de un mismo dueño cuentan como un solo aliado ──
const porEmpresaG = JSON.parse(JSON.stringify(porEmpresa));
porEmpresaG['26'].concesionarios.push({ id: 'C-TRU', nombre: 'EK Trujillo', ciudad: 'Valera', grupoAliado: 'EK', anticipos: [{ fecha: iso(-15), monto: 3000 }] });
porEmpresaG['26'].concesionarios[0].grupoAliado = 'EK';
porEmpresaG['26'].creditos.push(cred('M-9', '26', 1, { concesionarioId: 'C-TRU', fin: 9000, precio: 15000, precioBaseReal: 15000, ini: 6000 }));
const sedesG = R.armarSedes(porEmpresaG);
ok('el grupo se lee de la ficha del concesionario (grupoAliado) y las sedes sin grupo quedan sueltas', sedesG['C-EK'].grupo === 'EK' && sedesG['C-TRU'].grupo === 'EK' && !sedesG['C-OTRO'].grupo);
ok('las 3 sedes reales de EK/Haojin se agrupan por defecto aunque la base no tenga el campo', (() => { const pe = { '26': { concesionarios: ['CONC-1778507170776', 'CONC-1781627695646', 'CONC-1779891725132'].map(id => ({ id, nombre: id })), creditos: [], pagos: [] } }; const sd = R.armarSedes(pe); return ['CONC-1778507170776', 'CONC-1781627695646', 'CONC-1779891725132'].every(id => sd[id].grupo === 'EK'); })());
const gruposG = R.armarGrupos(sedesG);
ok('el grupo junta créditos, pagos y anticipos de sus sedes con id G-EK', Object.keys(gruposG).join() === 'G-EK' && gruposG['G-EK'].sedes.join() === 'C-EK,C-TRU' && gruposG['G-EK'].creditos.length === 7 && gruposG['G-EK'].anticipos.length === 3 && gruposG['G-EK'].pagosPorCred['CRED-1'].length === 8);
const resG = {}; Object.keys(sedesG).forEach(id => { resG[id] = R.resumenSede(sedesG[id], HOY); });
const resGr = { 'G-EK': Object.assign(R.resumenSede(gruposG['G-EK'], HOY), { tipo: 'grupo', sedes: gruposG['G-EK'].sedes }) };
ok('el resumen del grupo se calcula sobre todo junto: 3 motos del mes, $10.680 → nivel Plata, depósito $10.000', resGr['G-EK'].mes.motos === 3 && resGr['G-EK'].mes.vol === 10680 && resGr['G-EK'].mes.nivel === 'plata' && resGr['G-EK'].deposito.enviado === 10000);
R.rankingAliados(resG, resGr, sedesG);
ok('en el ranking el grupo cuenta como UN aliado: 2 aliados en total ("Otro" con $12.000 primero, el grupo con $10.680 segundo), y el otro ve al grupo sin nombre', resGr['G-EK'].ranking.total === 2 && resGr['G-EK'].ranking.posicion === 2 && resG['C-OTRO'].ranking.posicion === 1 && resG['C-OTRO'].ranking.total === 2 && resG['C-OTRO'].ranking.lista[1].nombre === 'Concesionario · Caracas' && resG['C-OTRO'].ranking.lista[1].vol === 10680);
ok('las sedes del grupo heredan la posición del grupo y saben a qué grupo pertenecen', resG['C-EK'].ranking.posicion === 2 && resG['C-EK'].ranking.deGrupo === 'EK' && resG['C-EK'].grupoId === 'G-EK' && resG['C-TRU'].grupo === 'EK');
ok('el id del grupo sale del nombre, sin acentos ni espacios', R.grupoIdDe('Grupo Bera · Chacao') === 'G-GRUPO-BERA-CHACAO');

ok('el día de hoy sale en hora de Venezuela', /^\d{4}-\d{2}-\d{2}$/.test(R.hoyCaracas('2026-10-17T03:30:00Z')) && R.hoyCaracas('2026-10-17T03:30:00Z') === '2026-10-16');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
