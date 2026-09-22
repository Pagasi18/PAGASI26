// UNA SOLA definicion de "en mora" para los robots de Telegram, la misma del sistema
// (dashboard, Creditos, Cobranza y Reportes desde el 15-sep-2026):
//   · cartera vigente = credito no eliminado con estado 'activo' o 'mora'
//     (los viejos sin estado cuentan como activos);
//   · en mora = vigente con AL MENOS UN dia de atraso.
// Antes resumen.js y reporte.js miraban solo estado === 'mora', que el sistema pone
// a partir del dia 6 (dias de gracia) y que ademas se queda viejo si nadie abre el
// app: los robots reportaban menos morosos que la pantalla (punto 26, 21-sep-2026).
const VIGENTES = ['activo', 'mora', ''];

function vigente(c) {
  return !!c && !c.eliminado && VIGENTES.indexOf(String(c.estado || '')) > -1;
}

function _dias(desdeISO, hastaISO) {
  const a = new Date(String(desdeISO) + 'T12:00:00'), b = new Date(String(hastaISO) + 'T12:00:00');
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000);
}

// Dias de atraso: lo que dice el motor de cuotas (la vencida mas vieja sin pagar) o el
// campo guardado del credito, el que sea mayor. Asi nunca reporta MENOS que la pantalla.
function diasAtraso(c, est, hoyISO) {
  let dias = parseInt(c && c.mora, 10) || 0;
  const cuotas = (est && est.cuotas) || [];
  for (let i = 0; i < cuotas.length; i++) {
    const q = cuotas[i];
    if ((Number(q.saldo) || 0) <= 0.01) continue;
    if (String(q.fechaVence || '') && String(q.fechaVence) < String(hoyISO)) {
      dias = Math.max(dias, _dias(q.fechaVence, hoyISO));
      break;   // la mas vieja manda
    }
  }
  return dias;
}

function enMora(c, est, hoyISO) { return vigente(c) && diasAtraso(c, est, hoyISO) > 0; }

module.exports = { vigente, diasAtraso, enMora };
