/* PAGASI 18 + 26 (21-nov-2026). Adam: "un dashboard de qué tiene pagasi 18 y 26 juntos…
   quiero ver los créditos, dinero en la calle, cantidad de mora… solo las cosas básicas".

   Lo básico de la cartera de UNA compañía, con las MISMAS cuentas del Dashboard del panel
   (modules/dash.js) para que el número de aquí sea el que cada compañía ve en su pantalla:

     créditos  los que están en cartera: no borrados, en estado activo o mora
     cartera   lo que falta por cobrar de esos créditos: total − pagos confirmados que no son la inicial
     enMora    los que tienen al menos un día de atraso
     vencido   el saldo de sus cuotas ya vencidas (el mismo ledger del Dashboard)

   El panel recalcula los días de atraso cada vez que alguien lo abre (calcularMoraAuto, en
   logic/pagos.js) y los guarda en el crédito. Aquí se calculan otra vez con la fecha de hoy:
   si nadie abrió el panel de una compañía ese día, el dato guardado estaría viejo.

   Es una función pura: recibe los créditos y los pagos tal como están en la base. La usa el
   servidor (functions/lib/grupo.js; al desplegar se copia a functions/logic, ver firebase.json);
   el panel no la carga. tests/t_grupo_18_26.js la compara con el Dashboard. */
(function(root){
  'use strict';

  var DIA = 86400000;
  // Estados que calcularMoraAuto no toca: cerrados o fuera de la cartera
  var NO_RECALCULA = ['completado','cancelado','recuperado','recuperada','pendiente_revision','rechazado','rechazada'];

  function totalCuotas(c){ return parseInt((c && c.totalCuotas) || ((c && c.plazo) ? c.plazo * 2 : 20), 10) || 20; }   // getCreditoTotalCuotas
  function cuotaBase(c){ return parseFloat((c && (c.cuotaQ || c.cuota)) || 0) || 0; }                                // getCreditoCuotaBase

  // El día (en días desde 1970) de una fecha, en hora de Venezuela (UTC−4, sin cambio de hora):
  // 'AAAA-MM-DD' es ese día; una fecha con hora se pasa a la hora local, como hace el panel.
  function diaDe(v){
    if(v == null || v === '') return null;
    var s = String(v), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if(m) return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DIA);
    var t = (v instanceof Date) ? v.getTime() : new Date(s).getTime();
    return isNaN(t) ? null : Math.floor((t - 4 * 3600000) / DIA);
  }

  // Cómo dejaría calcularMoraAuto este crédito hoy: su estado y sus días de atraso
  function estadoHoy(c, hoyN, gracia){
    if(!c.fecha) return { estado: c.estado, mora: c.mora };          // sin fecha no se recalcula
    if(NO_RECALCULA.indexOf(String(c.estado || '')) > -1) return { estado: c.estado, mora: 0 };
    var pagadas = parseInt(c.pagado || 0, 10) || 0, tc = totalCuotas(c);
    if(pagadas >= tc && tc > 0) return { estado: 'completado', mora: 0 };
    var inicio = diaDe(c.fecha);
    var atraso = (inicio == null || hoyN == null) ? NaN : hoyN - (inicio + (pagadas + 1) * 15);
    return { estado: atraso > gracia ? 'mora' : 'activo', mora: atraso > 0 ? atraso : 0 };
  }

  // Pagos confirmados que no son la inicial, por crédito (igual que _pagosIdxObtener del panel)
  function indicePagos(pagos){
    var map = new Map();   // Map compara como ===: un cred '12' no casa con un id 12, igual que en el panel
    (pagos || []).forEach(function(p){
      if(!(p && !p.eliminado && p.estado === 'confirmado' && !p.esInicial && p.tipoOperacion !== 'inicial_credito')) return;
      var e = map.get(p.cred);
      if(!e){ e = { sum: 0, n: 0 }; map.set(p.cred, e); }
      e.sum = e.sum + (parseFloat(p.monto) || 0);
      e.n++;
    });
    return map;
  }
  function pagosConfirmados(c, idx){                                  // getCreditoPagosConfirmados
    var e = idx.get(c.id);
    if(e && e.n) return e.sum;
    if(Array.isArray(c.pagosRegistrados) && c.pagosRegistrados.length)
      return c.pagosRegistrados.reduce(function(a, h){ return a + (parseFloat(h.montoPagado) || 0); }, 0);
    return (parseInt(c.pagado, 10) || 0) * cuotaBase(c);
  }
  function saldoPendiente(c, idx){ return Math.max(0, (parseFloat((c && c.total) || 0) || 0) - pagosConfirmados(c, idx)); }

  // Lo vencido de un crédito atrasado: el saldo de sus cuotas vencidas o, si no hay ninguna,
  // lo que falta de la próxima (el mismo cálculo del Dashboard)
  function vencidoDe(c, pagos, ledger, hoy, gracia){
    try {
      if(!ledger || !ledger.generarEstadoCredito) throw 0;
      var est = ledger.generarEstadoCredito(c, pagos, { diasGracia: gracia, today: hoy });
      var venc = 0, n = 0;
      (est.cuotas || []).forEach(function(q){ if(q && q.saldo > 0.001 && q.fechaVence && q.fechaVence < hoy){ venc += q.saldo; n++; } });
      if(n) return venc;
      var prox = (est.cuotas || [])[est.cuotasPagadas];
      return prox ? (prox.saldo || 0) : (parseFloat(c.cuotaQ || c.cuota) || 0);
    } catch(e){ return parseFloat(c.cuotaQ || c.cuota) || 0; }
  }

  var centavos = function(v){ return Math.round((v || 0) * 100) / 100; };

  // creds y pagos: los documentos de la base, cada uno con su id. opts: hoy ('AAAA-MM-DD' en
  // Venezuela), gracia (días de gracia de la compañía; 5 si no se dice) y ledger (CreditoLedger).
  function grupoResumen(creds, pagos, opts){
    opts = opts || {};
    var hoy = String(opts.hoy || ''), hoyN = diaDe(hoy);
    var gracia = (opts.gracia != null && isFinite(Number(opts.gracia))) ? Number(opts.gracia) : 5;
    var ledger = opts.ledger || (root && root.CreditoLedger) || null;
    var idx = indicePagos(pagos);
    var r = { creditos: 0, cartera: 0, alDia: 0, enMora: 0, vencido: 0 };
    (creds || []).forEach(function(c0){
      if(!c0 || c0.eliminado) return;
      var e = estadoHoy(c0, hoyN, gracia);
      if(e.estado !== 'activo' && e.estado !== 'mora') return;
      var c = Object.assign({}, c0, { estado: e.estado, mora: e.mora });
      r.creditos++;
      r.cartera += saldoPendiente(c, idx);
      if(!(c.mora > 0)) return;
      r.enMora++;
      r.vencido += vencidoDe(c, pagos, ledger, hoy, gracia);
    });
    r.alDia = Math.max(0, r.creditos - r.enMora);
    r.cartera = centavos(r.cartera);
    r.vencido = centavos(r.vencido);
    return r;
  }

  // Las dos juntas: se suman. Si falta alguna (no se pudo leer), no hay total.
  function grupoSumar(lista){
    var t = { creditos: 0, cartera: 0, alDia: 0, enMora: 0, vencido: 0 };
    for(var i = 0; i < lista.length; i++){
      var x = lista[i];
      if(!x || typeof x.creditos !== 'number') return null;
      t.creditos += x.creditos; t.cartera += x.cartera; t.alDia += x.alDia; t.enMora += x.enMora; t.vencido += x.vencido;
    }
    t.cartera = centavos(t.cartera); t.vencido = centavos(t.vencido);
    return t;
  }

  var api = { grupoResumen: grupoResumen, grupoSumar: grupoSumar, estadoHoy: estadoHoy, diaDe: diaDe };
  if(root){ root.grupoResumen = grupoResumen; root.grupoSumar = grupoSumar; }
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : null);
