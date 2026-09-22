// Pagasi module: cobranza — RETIRADO
// La cobranza se unificó dentro de "Pagos" → tabla "Cuotas Próximas" con el filtro
// "🔴 Atrasados" (misma lista, con notas de estado, gestiones, Cobrar, Avisar, Llamar
// y Recuperar moto). Los gráficos de rendimiento se movieron a Finanzas/Reportes.
// Se deja este alias para que cualquier navegación residual a 'cobranza' muestre Pagos
// en vez de romperse.
PG.cobranza = function(){
  return (typeof PG.pagos === 'function') ? PG.pagos() : '';
};
