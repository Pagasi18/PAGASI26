// Chats de las cobradoras (bot/avisos-chats.js): quién le tocó Iniciar al bot,
// cómo se encuentra a Samantha (preventiva) y a Jofanny (crítica) por su nombre
// en Telegram, y qué le llega a Adam. Sin adivinar: si hay dos parecidas o no
// aparece, no se asigna.
const path = require('path');
const C = require(path.join(__dirname, '..', 'bot', 'avisos-chats.js'));
let pass = 0, fail = 0;
const ok = (l, v) => { if (v) { pass++; console.log('OK   ' + l); } else { fail++; console.log('FALLA ' + l); } };

const upd = (id, first, last, user, type) => ({ update_id: Math.abs(id) % 1000, message: { message_id: 1, text: '/start',
  chat: { id, type: type || 'private', first_name: first, last_name: last, username: user } } });
const updates = [
  upd(8571975984, 'Adam', '', 'adam'),
  upd(111111111, 'Samantha', 'Pérez', 'sami_p'),
  upd(222222222, 'Jofanny', 'González', ''),
  upd(222222222, 'Jofanny', 'González', ''),        // tocó Iniciar dos veces
  upd(-100123456, 'Grupo', '', '', 'group'),         // un grupo: no cuenta
  { update_id: 9, my_chat_member: { chat: { id: 5 } } } // otro tipo de aviso: no cuenta
];

// ── Quiénes tocaron Iniciar ──
const chats = C.chatsDeUpdates(updates);
ok('solo chats privados y sin repetir', chats.length === 3 && !chats.some(c => c.id.startsWith('-')));
ok('con nombre completo y usuario', chats.find(c => c.id === '111111111').nombre === 'Samantha Pérez' && chats.find(c => c.id === '111111111').usuario === 'sami_p');
ok('sin datos: lista vacía', C.chatsDeUpdates(null).length === 0);

// ── Encontrar a cada una ──
const a = C.asignar(chats, 'Samantha', 'Jofanny');
ok('encuentra a Samantha para preventiva', !!a.preventiva && a.preventiva.id === '111111111');
ok('encuentra a Jofanny para crítica', !!a.critica && a.critica.id === '222222222');
ok('sin importar mayúsculas ni acentos', (C.buscar([{ id: '1', nombre: 'JÓFANNY', usuario: '' }], 'jofanny') || {}).id === '1');
ok('también por el usuario de Telegram', (C.buscar([{ id: '1', nombre: 'Sami', usuario: 'samantha_cobros' }], 'Samantha') || {}).id === '1');
ok('dos parecidas: no adivina', C.buscar([{ id: '1', nombre: 'Samantha A', usuario: '' }, { id: '2', nombre: 'Samantha B', usuario: '' }], 'Samantha') === null);
ok('si no aparece: nada', C.buscar(chats, 'Karla') === null);
ok('nombres muy cortos no se buscan', C.buscar(chats, 'Sa') === null);
const unaSola = C.asignar([{ id: '9', nombre: 'Samantha Jofanny', usuario: '' }], 'Samantha', 'Jofanny');
ok('la misma persona no puede llevar las dos listas', !unaSola.preventiva && !unaSola.critica);

// ── Lo que le llega a Adam ──
const msgOk = C.mensajeParaAdam(a, chats, 'Samantha', 'Jofanny', true);
ok('las dos encontradas y guardadas', msgOk.includes('Preventiva (Samantha): ✅ Samantha Pérez') && msgOk.includes('Crítica (Jofanny): ✅ Jofanny González') && msgOk.includes('Guardado'));
ok('le recuerda que él solo recibe el resumen', msgOk.includes('solo el resumen'));
ok('no muestra números de chat', !/111111111|222222222/.test(msgOk));
const sinJofanny = chats.filter(c => c.id !== '222222222');
const msgFalta = C.mensajeParaAdam(C.asignar(sinJofanny, 'Samantha', 'Jofanny'), sinJofanny, 'Samantha', 'Jofanny', true);
ok('dice a quién no encuentra y quiénes tocaron Iniciar', msgFalta.includes('Crítica (Jofanny): ⚠ no la encuentro') && msgFalta.includes('1. Adam') && msgFalta.includes('Samantha Pérez @sami_p') && msgFalta.includes('toque Iniciar'));
ok('lo que sí encontró queda guardado', msgFalta.includes('Preventiva (Samantha): ✅') && msgFalta.includes('Guardado'));
const msgNadie = C.mensajeParaAdam({ preventiva: null, critica: null }, [], 'Samantha', 'Jofanny', false);
ok('si nadie ha tocado Iniciar, lo dice y no dice "Guardado"', msgNadie.includes('Nadie le ha tocado Iniciar') && !msgNadie.includes('Guardado'));
ok('escapa nombres raros', C.mensajeParaAdam({ preventiva: { id: '1', nombre: '<b>X</b>', usuario: '' }, critica: null }, [], 'Samantha', 'Jofanny', false).includes('&lt;b&gt;X&lt;/b&gt;'));

console.log(''); console.log(pass + ' pruebas OK, ' + fail + ' fallas');
if (fail) process.exitCode = 1;
