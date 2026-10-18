// Cobranza por WhatsApp (18-oct-2026): la cola de hoy se arma con el ledger y cada cliente cae en
// el grupo que le toca; las plantillas llevan nombre, cuota, monto y fecha; el asistente de
// muestra responde a lo basico; y la ventana de 24 h de Meta se respeta.
const path = require('path');
const W = require(path.join(__dirname, '..', 'logic', 'whatsapp.js'));
global.CreditoLedger = require(path.join(__dirname, '..', 'logic', 'credito-ledger.js'));
global.S = { creds: [], pagos: [], clientes: [] };
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const HOY = '2026-10-18';
const iso = d => { const x = new Date(Date.UTC(2026, 9, 18)); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
// credito quincenal de $50 que arranco hace `dias` dias; con `pagadas` cuotas pagadas a tiempo
function cred(id, dias, pagadas, cli){ return { id, cli: cli || 'CLIENTE ' + id, clienteId: 'C-' + id, modelo: 'EK XPRESS 150', estado: 'activo', fecha: iso(-dias), cuotaQ: 50, cuota: 100, totalCuotas: 24, plazo: 12, total: 1200, fin: 1200, precio: 1800, ini: 600, frecuencia: 'quincenal' }; }
function pagosDe(id, dias, n){ const out = []; for (let k = 1; k <= n; k++) out.push({ id: id + '-p' + k, cred: id, monto: 50, fecha: iso(-dias + 15 * k - 1), estado: 'confirmado' }); return out; }
const creds = [
  cred('A', 13, 0, 'ANA LÓPEZ'),     // la cuota 1 vence en 2 dias
  cred('B', 15, 0, 'JOSÉ ROJAS'),    // vence hoy
  cred('C', 18, 0, 'LUISA MORA'),    // vencida hace 3 dias (gracia)
  cred('D', 23, 0, 'CARLOS DÍAZ'),   // vencida hace 8 dias (atrasada)
  cred('E', 40, 0, 'ROSA GIL'),      // vencida hace 25 dias (cobrador), dos cuotas
  cred('F', 50, 3, 'PEDRO SILVA'),   // paga al dia: su cuota 4 vence en 10 dias → no sale hoy
  Object.assign(cred('G', 20, 0), { estado: 'cancelado' })
];
const pagos = pagosDe('F', 50, 3);
const clientes = [{ id: 'C-A', nombre: 'ANA LÓPEZ', tel: '04141234567' }, { id: 'C-B', nombre: 'JOSÉ ROJAS', telE164: '+584241112233' }, { id: 'C-C', nombre: 'LUISA MORA', tel: '0212-555-1234' }, { id: 'C-D', nombre: 'CARLOS DÍAZ', tel: '0416 000 0000' }, { id: 'C-E', nombre: 'ROSA GIL', tel: '04261111111' }, { id: 'C-F', nombre: 'PEDRO SILVA', tel: '04120000000' }];

const cola = W.waColaHoy(creds, pagos, clientes, HOY);
const en = g => cola.grupos[g].map(i => i.cred).join();
ok('vence en 2 días → "próximas"', en('proximas') === 'A' && cola.grupos.proximas[0].dias === -2);
ok('vence hoy → "hoy"', en('hoy') === 'B' && cola.grupos.hoy[0].dias === 0);
ok('vencida hace 3 días → "gracia"', en('gracia') === 'C');
ok('vencida hace 8 días → "atrasadas"', en('atrasadas') === 'D');
ok('vencida hace 25 días → "cobrador", con sus dos cuotas vencidas sumadas', en('cobrador') === 'E' && cola.grupos.cobrador[0].vencidas === 2 && cola.grupos.cobrador[0].montoVencido === 100);
ok('el que paga al día no sale, y el cancelado tampoco', !JSON.stringify(cola.grupos).includes('"F"') && !JSON.stringify(cola.grupos).includes('"G"') && cola.total === 5);
ok('el teléfono sale en E.164 y el fijo cuenta como "sin celular"', cola.grupos.proximas[0].tel === '+584141234567' && cola.grupos.hoy[0].tel === '+584241112233' && cola.grupos.gracia[0].tel === '' && cola.sinTel === 1);
ok('cada fila trae cuota, monto, fecha y avance', cola.grupos.proximas[0].cuota === 1 && cola.grupos.proximas[0].monto === 50 && cola.grupos.proximas[0].fechaVence === iso(2) && cola.grupos.proximas[0].totalCuotas === 24);

// ── Plantillas ──
const p = W.waPlantilla('proximas', cola.grupos.proximas[0]);
ok('la plantilla de "vence en 2 días" saluda por el nombre de pila, dice cuota, monto y fecha', /Hola Ana/.test(p) && /cuota 1 de 24/.test(p) && /\$50/.test(p) && new RegExp(W.waPlantilla('proximas', cola.grupos.proximas[0]).includes('20 oct') ? '20 oct' : '').test(p) && /comprobante/.test(p));
ok('la de atrasadas pide fecha de pago', /Qué día puedes pagarla/.test(W.waPlantilla('atrasadas', cola.grupos.atrasadas[0])));
ok('la de más de 10 días anuncia al asesor y no insiste', /asesor de Pagasi/.test(W.waPlantilla('cobrador', cola.grupos.cobrador[0])) && /2 cuotas vencidas/.test(W.waPlantilla('cobrador', cola.grupos.cobrador[0])));
ok('ninguna plantilla amenaza ni habla de abogados', !/abogado|demanda|embargo|penal/i.test(W.WA_GRUPOS.map(g => W.waPlantilla(g.id, cola.grupos.proximas[0])).join(' ')));

// ── El asistente de muestra ──
const conv = { nombre: 'MARÍA PÉREZ' };
ok('"cuánto debo" → cifras', /próxima cuota/.test(W.waDemoResponder(conv, 'cuánto debo?').texto));
ok('"pago el sábado" → promesa anotada', W.waDemoResponder(conv, 'pago el sábado').borrador && W.waDemoResponder(conv, 'pago el sábado').borrador.tipo === 'promesa');
ok('"quiero hablar con una persona" → se calla y avisa', W.waDemoResponder(conv, 'quiero hablar con una persona').atencion === 'pide_persona');
ok('"no puedo pagar" → avisa a una persona, sin regañar', W.waDemoResponder(conv, 'no puedo pagar').atencion === 'pide_persona' && /Entiendo/.test(W.waDemoResponder(conv, 'no puedo pagar').texto));
ok('un tema ajeno → explica que solo atiende el crédito', /solo puedo ayudarte con tu crédito/.test(W.waDemoResponder(conv, 'venden cauchos?').texto));

// ── Ventana de 24 h ──
const ahora = '2026-10-18T15:00:00.000Z';
ok('con el último mensaje del cliente hace 2 h la ventana está abierta', W.waVentanaAbierta({ ultimoEntranteHora: '2026-10-18T13:00:00.000Z' }, ahora) === true);
ok('con el último mensaje hace 25 h está cerrada; sin mensajes, también', W.waVentanaAbierta({ ultimoEntranteHora: '2026-10-17T13:00:00.000Z' }, ahora) === false && W.waVentanaAbierta({}, ahora) === false);
ok('teléfonos: 0422 de Digitel vale, fijos y cortos no', W.waTelE164('0422-123-4567') === '+584221234567' && W.waTelE164('02125551234') === '' && W.waTelE164('414123') === '');

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas'); if (fail) process.exitCode = 1;
