/* Datos INVENTADOS (23-oct-2026) para ver Métricas web en el navegador: unas 250 visitas por día de
   los últimos 20 días, con fuentes, motos, simulador, WhatsApp y solicitudes. Nada real. */
(function(){
  var semilla = 7; function azar(){ semilla = (semilla * 9301 + 49297) % 233280; return semilla / 233280; }
  function hoyVE(){ return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); }
  function restar(iso, n){ var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
  var horaAhora = +new Date().toLocaleString('en-US', { timeZone: 'America/Caracas', hour: 'numeric', hour12: false }) % 24;
  var FUENTES = [['directo', 40], ['interno', 22], ['google', 20], ['instagram', 7], ['ig', 5], ['l.wl.co', 2], ['facebook', 1], ['chatgptcom', 1], ['tiktok', 1]];
  var MOTOS = [47, 1, 6, 12, 30, 22, 9];
  function una(lista){ var t = lista.reduce(function(a, x){ return a + x[1]; }, 0), r = azar() * t; for(var i = 0; i < lista.length; i++){ r -= lista[i][1]; if(r <= 0) return lista[i][0]; } return lista[0][0]; }
  var metricas = {}, n = 0, hoy = hoyVE();
  for(var d = 19; d >= 0; d--){
    var fecha = restar(hoy, d), cuantas = 180 + Math.round(azar() * 160);
    for(var k = 0; k < cuantas; k++){
      var hora = Math.min(23, Math.floor(6 + azar() * azar() * 18 + azar() * 6));
      if(d === 0 && hora > horaAhora) continue;
      var t0 = 1790000000000 + n * 100000, ev = [{ t: 'vista', p: 'index', ts: t0 }], fu = una(FUENTES), m = MOTOS[Math.floor(azar() * azar() * MOTOS.length)];
      var tt = t0;
      function sig(t, extra){ tt += 5000 + Math.round(azar() * 60000); var e = { t: t, p: 'x', ts: tt }; if(extra) e.m = extra; ev.push(e); }
      var conv = fu === 'instagram' || fu === 'ig' ? 1.6 : fu === 'google' ? 1.2 : 1;
      if(azar() < 0.55){ sig('ver_moto', m);
        if(azar() < 0.35 * conv){ sig('simulo', m); if(azar() < 0.5){ sig('quiero', m); if(azar() < 0.35){ sig('solicitud_inicio'); if(azar() < 0.4) sig('solicitud_enviada'); } } }
        if(azar() < 0.12 * conv) sig('whatsapp', m);
      } else if(azar() < 0.1) sig('vista');
      if(azar() < 0.5) sig('sale');
      metricas['s' + (n++)] = { vid: 'v' + Math.floor(azar() * cuantas * 14), fecha: fecha, hora: hora, inicio: t0, ultima: tt, fuente: fu, medio: fu === 'ig' ? 'social' : '', campana: (fu === 'instagram' && azar() < 0.3) ? 'veloz' : '',
        disp: azar() < 0.86 ? 'telefono' : (azar() < 0.9 ? 'computadora' : 'tablet'), entrada: azar() < 0.7 ? 'index' : (azar() < 0.6 ? 'simulador' : 'catalogo'), ev: ev, n: ev.length, v: 1 };
    }
  }
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','config','users','catalogo','metricas','perm_delete'];
  window.__DATOS_PRUEBA = { usuarioActual: { uid: 'u-prueba', email: 'adam@pagasi.io', displayName: 'adam' }, colecciones: {
    usuarios: { 'u-prueba': { nombre: 'ADAM', email: 'adam@pagasi.io', rol: 'Administrador', permisos: PERMISOS, concesionarios: [] } },
    metricas: metricas, clientes: {}, creditos: {}, pagos: {}, motos: {}, concesionarios: {}, egresos: {}, movimientos: {}, cuentasPendientes: {}, tareas: {}, recursos: {}, gps: {}
  } };
})();
