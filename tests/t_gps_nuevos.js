// GPS: equipos nuevos de MiCODUS (bot/gps-nuevos.js): cuáles no están en el
// módulo, a qué crédito pertenecen por el nombre que tienen en MiCODUS (número
// de crédito o placa de UN crédito vigente), los conflictos, los que ya están
// en el módulo sin crédito, y el equipo que se crearía. Sin adivinar.
const path = require('path');
const G = require(path.join(__dirname, '..', 'bot', 'gps-nuevos.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

// ── Nombres y placas ──
ok('placa sin guiones ni espacios', G.placaNormal('ab-123 cd') === 'AB123CD');
ok('número de crédito escrito de varias formas', G.credIdDe('CRED-523') === 'CRED-523' && G.credIdDe('cred 24') === 'CRED-024' && G.credIdDe('Moto CRED1200') === 'CRED-1200' && G.credIdDe('Juan') === '');
ok('forma sin datos: letras A y números 9', G.forma('AB-123-CD') === 'AA-999-AA' && G.forma('José Pérez') === 'AAAA AAAAA');

const creds = [
  { id: 'CRED-523', placa: 'AB-123-CD', estado: 'activo' },
  { id: 'CRED-024', placa: '', estado: 'activo' },
  { id: 'CRED-600', placa: 'QQ111QQ', estado: 'activo' },
  { id: 'CRED-700', placa: 'ZZ999ZZ', estado: 'cancelado' },
  { id: 'CRED-801', placa: 'MM555MM', estado: 'activo' },
  { id: 'CRED-802', placa: 'MM-555-MM', estado: 'activo' },
  { id: 'CRED-010', placa: 'KK222KK', estado: 'activo' },
  { id: 'CRED-900', placa: 'PP333PP', estado: 'activo' },
];
const gpsApp = [
  { _id: 'GPS-A', idGps: '2000', creditoId: 'CRED-010', estado: 'instalado' },
  { _id: 'GPS-B', idGps: '6000', creditoId: 'CRED-600', estado: 'instalado' },
  { _id: 'GPS-C', idGps: '7000', creditoId: '', estado: 'stock' },         // en el módulo sin crédito
  { _id: 'GPS-D', idGps: '8000', estado: 'stock', eliminado: true },        // eliminado: no se vuelve a crear
];
const equipos = [
  { sn: '1001', carNum: 'AB-123-CD' },   // placa de CRED-523
  { sn: '1002', carNum: 'CRED 24' },     // número de CRED-024
  { sn: '1003', carNum: 'Juan Perez' },  // no se reconoce
  { sn: '1004', carNum: 'QQ111QQ' },     // CRED-600 ya tiene equipo
  { sn: '1005', carNum: 'ZZ999ZZ' },     // crédito cancelado
  { sn: '1006', carNum: 'ab123cd' },     // otra vez la placa de CRED-523
  { sn: '1007', carNum: 'CRED-999' },    // crédito que no existe
  { sn: '1008', carNum: 'MM555MM' },     // placa de dos créditos: dudoso
  { sn: '2000', carNum: 'KK222KK' },     // ya está en el módulo
  { sn: '3000', carNum: '' },            // sin nombre
  { sn: '7000', carNum: 'PP333PP' },     // en el módulo sin crédito; MiCODUS apunta a CRED-900
  { sn: '8000', carNum: 'CRED-523' },    // eliminado del módulo: no se vuelve a crear
];

// ── Equipos nuevos ──
const plan = G.planNuevos(equipos, gpsApp, creds);
ok('nuevos: los 9 que no están en el módulo (ni eliminados)', plan.nuevos.length === 9 && !plan.nuevos.some(e => ['2000', '6000', '7000', '8000'].includes(e.sn)));
ok('se reconocen 2: primero por número (CRED-024) y luego por placa (CRED-523)', plan.vinculados.map(v => v.credId + ':' + v.por).join() === 'CRED-024:numero,CRED-523:placa');
ok('el equipo de CRED-523 es el 1001', plan.vinculados.find(v => v.credId === 'CRED-523').sn === '1001');
ok('conflicto: crédito que ya tiene equipo', plan.conflicto.some(k => k.sn === '1004' && k.credId === 'CRED-600' && /ya tiene equipo/.test(k.motivo)));
ok('conflicto: dos equipos de MiCODUS con la misma placa', plan.conflicto.some(k => k.sn === '1006' && k.credId === 'CRED-523' && /mismo credito/.test(k.motivo)));
ok('sin crédito: nombre raro, cancelado, crédito inexistente, placa dudosa y sin nombre', plan.sinCredito.map(e => e.sn).sort().join() === '1003,1005,1007,1008,3000');
ok('un crédito cancelado nunca recibe equipo', !plan.vinculados.some(v => v.credId === 'CRED-700'));
ok('una placa repetida en dos créditos no se adivina', !plan.vinculados.some(v => v.credId === 'CRED-801' || v.credId === 'CRED-802'));

// ── Ya en el módulo sin crédito ──
const sueltos = G.planSinVincular(equipos, gpsApp, creds);
ok('equipo en el módulo sin crédito cuyo nombre en MiCODUS apunta a CRED-900', sueltos.length === 1 && sueltos[0].gpsId === 'GPS-C' && sueltos[0].credId === 'CRED-900' && sueltos[0].por === 'placa');
ok('los eliminados y los que ya tienen crédito no se tocan', !sueltos.some(s => s.gpsId === 'GPS-D' || s.gpsId === 'GPS-A'));

const cambio = G.cambioAsignar(sueltos[0], '2026-09-15T01:00:00.000Z');
ok('asignar: solo pone el crédito, lo marca instalado y deja constancia', Object.keys(cambio).sort().join() === 'actualizado,asignadoPor,creditoId,estado'
  && cambio.creditoId === 'CRED-900' && cambio.estado === 'instalado' && cambio.asignadoPor.includes('placa'));

// ── El equipo que se crearía ──
const doc = G.docNuevo(plan.vinculados.find(v => v.credId === 'CRED-523'), '2026-09-15T01:00:00.000Z', 1);
ok('id con el formato del módulo', /^GPS-\d+-1-[0-9a-z]+$/.test(doc.id));
ok('instalado, con su ID de MiCODUS y su crédito', doc.estado === 'instalado' && doc.idGps === '1001' && doc.creditoId === 'CRED-523' && doc.eliminado === false);
ok('el robot de posiciones lo va a tomar (instalado + ID de MiCODUS)', doc.estado === 'instalado' && !!doc.idGps && !doc.eliminado);
ok('no inventa clave, IMEI ni línea', doc.passwordGps === '' && doc.imei === '' && doc.linea === '');
ok('queda marcado como traído por el robot', doc.importado === true && doc.creadoPor === 'Robot MiCODUS' && doc.observaciones.includes('placa') && doc.placaMicodus === 'AB-123-CD');

// ── Sin datos ──
ok('sin equipos ni módulo: nada que hacer', G.planNuevos([], [], []).nuevos.length === 0 && G.planSinVincular(null, null, null).length === 0);

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
