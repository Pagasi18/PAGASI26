// Motor contable de creditos: calendario de cuotas y ledger de eventos.
// Primera fase: helpers puros, sin escrituras en Firebase ni cambios de comportamiento.
(function(root){
  'use strict';

  var DAY_MS = 24 * 60 * 60 * 1000;
  var QUINCENA_MS = 15 * DAY_MS;

  function n(v){
    var x = parseFloat(v);
    return isNaN(x) ? 0 : x;
  }

  function i(v){
    var x = parseInt(v, 10);
    return isNaN(x) ? 0 : x;
  }

  function r2(v){
    return Math.round((n(v) + Number.EPSILON) * 100) / 100;
  }

  function isoDate(d){
    if(!d || isNaN(d.getTime())) return '';
    if(typeof root.fechaLocalISO === 'function') return root.fechaLocalISO(d);
    var local = new Date(d);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    return local.toISOString().split('T')[0];
  }

  function dateFromISO(s){
    if(!s) return null;
    var d = new Date(String(s).slice(0,10) + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  function totalCuotas(cred){
    return i(cred && cred.totalCuotas) || ((i(cred && cred.plazo) || 0) * 2) || 0;
  }

  function cuotaBase(cred){
    return n(cred && (cred.cuotaQ || cred.cuota));
  }

  function pagosAplicables(credId, pagos, opts){
    opts = opts || {};
    return (Array.isArray(pagos) ? pagos : [])
      .filter(function(p){
        if(!p || String(p.cred) !== String(credId)) return false;
        if((p.estado || 'confirmado') !== 'confirmado') return false;
        if(p.eliminado && p.mantenerEnAmortizacion !== true) return false;
        if(p.esInicial || p.tipoOperacion === 'inicial_credito') return false;
        if(opts.excluirLiquidacion && (p.tipo === 'liquidacion' || p.referencia === 'LIQ-ANT')) return false;
        return true;
      })
      .slice()
      .sort(function(a,b){
        var fa = String(a.fecha || '').localeCompare(String(b.fecha || ''));
        if(fa !== 0) return fa;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });
  }

  function aplicarMontoACuotas(cuotas, monto, meta){
    var restante = r2(monto);
    var eventos = [];
    for(var idx = 0; idx < cuotas.length && restante > 0.001; idx++){
      var cuota = cuotas[idx];
      if(cuota.saldo <= 0.001) continue;
      var aplicado = r2(Math.min(restante, cuota.saldo));
      cuota.pagado = r2(cuota.pagado + aplicado);
      cuota.saldo = r2(cuota.saldo - aplicado);
      cuota.estado = cuota.saldo <= 0.001 ? 'pagada' : 'parcial';
      restante = r2(restante - aplicado);
      eventos.push({
        cuota: cuota.numero,
        monto: aplicado,
        fecha: meta.fecha || '',
        pagoId: meta.pagoId || '',
        tipo: meta.tipo || 'pago'
      });
    }
    return {restante: restante, aplicaciones: eventos};
  }

  function crearCalendarioCuotas(cred, opts){
    opts = opts || {};
    var count = totalCuotas(cred);
    var montoCuota = cuotaBase(cred);
    var inicio = dateFromISO(cred && cred.fecha);
    var today = opts.today ? dateFromISO(opts.today) : dateFromISO(isoDate(new Date()));
    var gracia = opts.diasGracia != null ? i(opts.diasGracia) : 5;
    var cuotas = [];

    for(var k = 1; k <= count; k++){
      var vence = inicio ? new Date(inicio.getTime() + k * QUINCENA_MS) : null;
      cuotas.push({
        numero: k,
        fechaVence: isoDate(vence),
        monto: r2(montoCuota),
        pagado: 0,
        saldo: r2(montoCuota),
        estado: 'pendiente',
        diasMora: 0,
        aplicaciones: []
      });
    }

    if(today){
      cuotas.forEach(function(c){
        var vence = dateFromISO(c.fechaVence);
        if(!vence || c.saldo <= 0.001) return;
        // round y no floor: las dos fechas van ancladas al mediodia, asi que sin cambio de
        // hora la resta es exacta y da lo mismo. Con cambio de hora (un usuario en EEUU,
        // Espana o Chile) la diferencia real es N dias menos una hora y floor la bajaba un
        // dia entero: la mora salia corta (punto 35, 22-sep-2026).
        var atraso = Math.round((today.getTime() - vence.getTime()) / DAY_MS);
        c.diasMora = atraso > gracia ? atraso : 0;
        if(c.diasMora > 0) c.estado = 'mora';
      });
    }

    return cuotas;
  }

  function generarEstadoCredito(cred, pagos, opts){
    opts = opts || {};
    var cuotas = crearCalendarioCuotas(cred, opts);
    var aplicaciones = [];
    var listaPagos = pagosAplicables(cred && cred.id, pagos, opts);

    listaPagos.forEach(function(p){
      var res = aplicarMontoACuotas(cuotas, p.monto, {
        fecha: p.fecha,
        pagoId: p.id,
        tipo: p.tipo || 'pago'
      });
      aplicaciones = aplicaciones.concat(res.aplicaciones);
    });

    var descuento = n(opts.descuentoLiquidacion != null ? opts.descuentoLiquidacion : (cred && cred.descuentoLiquidacion));
    var liquidacionActiva = opts.liquidacionActiva !== false;
    if(descuento > 0 && liquidacionActiva){
      var desc = aplicarMontoACuotas(cuotas, descuento, {
        fecha: (cred && cred.fechaCompletado) || opts.today || '',
        pagoId: 'DESC-LIQ-' + ((cred && cred.id) || ''),
        tipo: 'descuento_liquidacion'
      });
      aplicaciones = aplicaciones.concat(desc.aplicaciones);
    }

    // La mora se RECALCULA aqui, ya con los pagos aplicados. crearCalendario-
    // Cuotas la calcula sobre el calendario "en seco" (todas las cuotas con su
    // saldo completo), asi que una cuota pagada tarde seguia contando como mora
    // para siempre: un credito al dia con historial de atraso reportaba mora.
    // Solo debe contar la mora de lo que HOY sigue sin pagarse.
    var hoyRef = opts.today ? dateFromISO(opts.today) : dateFromISO(isoDate(new Date()));
    var graciaRef = opts.diasGracia != null ? i(opts.diasGracia) : 5;
    cuotas.forEach(function(c){
      c.aplicaciones = aplicaciones.filter(function(a){ return a.cuota === c.numero; });
      if(c.saldo <= 0.001){ c.diasMora = 0; c.estado = 'pagada'; return; }
      var venceRef = dateFromISO(c.fechaVence);
      var atraso = (venceRef && hoyRef) ? Math.round((hoyRef.getTime() - venceRef.getTime()) / DAY_MS) : 0;   // round: ver punto 35
      c.diasMora = atraso > graciaRef ? atraso : 0;
      c.estado = c.diasMora > 0 ? 'mora' : (c.pagado > 0.001 ? 'parcial' : 'pendiente');
    });

    var pagadas = 0;
    for(var x = 0; x < cuotas.length; x++){
      if(cuotas[x].saldo <= 0.001) pagadas++;
      else break;
    }

    var saldoPendiente = r2(cuotas.reduce(function(a,c){ return a + c.saldo; }, 0));
    var totalPagado = r2(cuotas.reduce(function(a,c){ return a + c.pagado; }, 0));
    var prox = cuotas[pagadas] || null;
    var maxMora = cuotas.reduce(function(a,c){ return Math.max(a, c.diasMora || 0); }, 0);
    var estado = cuotas.length && pagadas >= cuotas.length ? 'completado' : (maxMora > 0 ? 'mora' : 'activo');

    if(cred && (cred.estado === 'cancelado' || cred.estado === 'recuperado' || cred.estado === 'recuperada')){
      estado = cred.estado;
    }

    return {
      creditoId: cred && cred.id,
      totalCuotas: cuotas.length,
      cuotaBase: r2(cuotaBase(cred)),
      cuotasPagadas: pagadas,
      saldoProxCuota: prox ? r2(prox.saldo) : 0,
      saldoPendiente: saldoPendiente,
      totalPagado: totalPagado,
      moraDias: maxMora,
      estado: estado,
      cuotas: cuotas,
      aplicaciones: aplicaciones
    };
  }

  function generarLedgerCredito(cred, pagos, movimientos, opts){
    opts = opts || {};
    var ledger = [];
    if(!cred) return ledger;

    ledger.push({
      tipo: 'originacion_credito',
      fecha: cred.creado || cred.fecha || '',
      creditoId: cred.id,
      cliente: cred.cli || '',
      monto: r2((n(cred.ini) || 0) + (n(cred.total) || 0)),
      detalle: 'Credito creado'
    });

    if(n(cred.ini) > 0){
      ledger.push({
        tipo: 'inicial_credito',
        fecha: cred.fecha || '',
        creditoId: cred.id,
        monto: r2(cred.ini),
        detalle: 'Inicial pactada'
      });
    }

    pagosAplicables(cred.id, pagos, opts).forEach(function(p){
      ledger.push({
        tipo: p.tipo === 'liquidacion' ? 'liquidacion' : 'pago_cuota',
        fecha: p.fecha || '',
        creditoId: cred.id,
        pagoId: p.id || '',
        monto: r2(p.monto),
        cuenta: p.cuenta || p.metodo || '',
        detalle: p.referencia || ''
      });
    });

    if(n(cred.descuentoLiquidacion) > 0){
      ledger.push({
        tipo: 'descuento_liquidacion',
        fecha: cred.fechaCompletado || '',
        creditoId: cred.id,
        monto: r2(cred.descuentoLiquidacion),
        detalle: cred.motivoLiquidacion || 'Descuento por liquidacion anticipada'
      });
    }

    (Array.isArray(movimientos) ? movimientos : []).forEach(function(m){
      if(!m || m.eliminado) return;
      var linked = m.conceptoCredito === cred.id || (m.concepto || '').indexOf(String(cred.id)) >= 0;
      if(!linked) return;
      ledger.push({
        tipo: 'movimiento_cuenta',
        fecha: m.fecha || '',
        creditoId: cred.id,
        movimientoId: m.id || '',
        monto: r2(m.monto),
        cuentaOrigen: m.cuentaOrigen || '',
        cuentaDestino: m.cuentaDestino || '',
        detalle: m.concepto || ''
      });
    });

    return ledger.sort(function(a,b){
      var fa = String(a.fecha || '').localeCompare(String(b.fecha || ''));
      if(fa !== 0) return fa;
      return String(a.tipo || '').localeCompare(String(b.tipo || ''));
    });
  }

  var api = {
    crearCalendarioCuotas: crearCalendarioCuotas,
    generarEstadoCredito: generarEstadoCredito,
    generarLedgerCredito: generarLedgerCredito,
    pagosAplicables: pagosAplicables
  };

  root.CreditoLedger = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
