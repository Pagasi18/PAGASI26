/* Datos INVENTADOS (23-nov-2026) para probar en el navegador los adjuntos de Redes: «Adjuntar» (foto, documento),
   las notas de voz que se oyen en el hilo, el botón «Bajar» y «Llamar». Nada real.
   El servidor de prueba responde POST /equipo-falso (mismo origen) para que el envío se vea completo. */
(function(){
  function hace(min){ return new Date(Date.now() - min * 60000).toISOString(); }
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','redes','redescob','whatsapp','instagram','contratos','notif','reportes','cuentas','config','users','perm_delete'];
  var conv = {}, sub = {};
  function c(id, d, msgs){ conv[id] = d; var m = {}; msgs.forEach(function(x, i){ m[x.id || ('m' + i)] = x; }); sub['conversaciones/' + id + '/mensajes'] = m; }
  c('wav:+584140000002', { canal:'whatsapp', area:'ventas', telE164:'+584140000002', nombre:'Ana Torres', modo:'bot', vendedor:'ADAM', noLeidos:1, ultimoMensaje:'🎤 Nota de voz', ultimoMensajeHora:hace(3), ultimoEntranteHora:hace(3), ultimoAutor:'cliente', actualizado:hace(3), creado:hace(60*24*3) },
    [ { autor:'cliente', direccion:'entrante', tipo:'texto', texto:'precio de la Kavak 250?', hora:hace(70), estado:'recibido' },
      { autor:'asistente', direccion:'saliente', tipo:'texto', texto:'La Kavak 250 está en $2,900, inicial desde $1,160.', hora:hace(69), estado:'leido' },
      { id:'wamid.voz1', autor:'cliente', direccion:'entrante', tipo:'audio', texto:'', medio:{ id:'media1', url:'/prueba-voz.wav', path:'redes_whatsapp/584140000002/wamid.voz1.ogg', mime:'audio/wav', voz:true }, hora:hace(12), estado:'recibido' },
      { id:'wamid.doc1', autor:'cliente', direccion:'entrante', tipo:'documento', texto:'mi constancia', medio:{ id:'media2', url:'/prueba-doc.pdf', path:'redes_whatsapp/584140000002/wamid.doc1.pdf', mime:'application/pdf', nombre:'Constancia de trabajo.pdf' }, hora:hace(10), estado:'recibido' },
      { id:'wamid.voz2', autor:'cliente', direccion:'entrante', tipo:'audio', texto:'', medio:{ id:'media3', mime:'audio/ogg', voz:true }, hora:hace(3), estado:'recibido' },
      { id:'wamid.viejo', autor:'cliente', direccion:'entrante', tipo:'video', texto:'', medio:{ id:'media0', mime:'video/mp4' }, hora:hace(60*24*9), estado:'recibido' } ]);
  c('wa:+584140000001', { canal:'whatsapp', area:'cobranza', telE164:'+584140000001', nombre:'MARIA PEREZ', clienteNombre:'MARIA PEREZ', modo:'bot', noLeidos:0, ultimoMensaje:'ya pagué', ultimoMensajeHora:hace(5), ultimoEntranteHora:hace(5), ultimoAutor:'cliente', actualizado:hace(5), creado:hace(60*24*1) },
    [ { autor:'cliente', direccion:'entrante', tipo:'texto', texto:'ya pagué', hora:hace(5), estado:'recibido' } ]);
  c('ig:555001', { canal:'instagram', area:'ventas', igsid:'555001', usuario:'luisperez.ve', nombre:'Luis Pérez', modo:'bot', noLeidos:0, ultimoMensaje:'en Maracay hay?', ultimoMensajeHora:hace(15), ultimoEntranteHora:hace(15), ultimoAutor:'cliente', actualizado:hace(15), creado:hace(30) },
    [ { autor:'cliente', direccion:'entrante', tipo:'texto', texto:'en Maracay hay?', hora:hace(15), estado:'recibido' } ]);
  var colecciones = {
    usuarios: { 'u-prueba': { nombre:'ADAM', email:'adam@pagasi.local', rol:'Administrador', permisos:PERMISOS, concesionarios:[] } },
    config: { asistente: { conectado:true, telefono:'+58 414-640-1617', instagram:'pagasi.io', instrucciones:'', instruccionesVentas:'', urlEquipo:'/equipo-falso' },
      plan: { factor: 1.2, inicial: 0.45, tasaMensual: 0.05, plazo: 12, apy: 60, diasGracia: 5 }, cuentasBanc: { lista: [] } },
    conversaciones: conv, comentarios_ig: {}, leads: {},
    clientes: {}, motos: {}, creditos: {}, pagos: {}, movimientos: {}, egresos: {}, facturas: {}, cuentasPendientes: {}, tareas: {}, recursos: {}, gps: {}, concesionarios: {}, logs: {}
  };
  Object.keys(sub).forEach(function(k){ colecciones[k] = sub[k]; });
  window.__DATOS_PRUEBA = { usuarioActual: { uid: 'u-prueba', email: 'adam@pagasi.local', displayName: 'ADAM' }, colecciones: colecciones };
})();
