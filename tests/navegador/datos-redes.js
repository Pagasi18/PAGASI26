/* Datos INVENTADOS (22-oct-2026) para ver Redes sociales en el navegador: WhatsApp (cobranza y
   ventas) e Instagram conectados, y comentarios de Instagram. Nada real. */
(function(){
  function hace(min){ return new Date(Date.now() - min * 60000).toISOString(); }
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','whatsapp','instagram','contratos','notif','reportes','cuentas','config','users','perm_delete'];
  var conv = {}, sub = {};
  function c(id, d, msgs){ conv[id] = d; var m = {}; msgs.forEach(function(x, i){ m['m' + i] = x; }); sub['conversaciones/' + id + '/mensajes'] = m; }
  c('wa:+584140000001', { canal:'whatsapp', area:'cobranza', telE164:'+584140000001', nombre:'MARIA PEREZ', clienteNombre:'MARIA PEREZ', modo:'bot', noLeidos:2, atencion:'comprobante', ultimoMensaje:'ya pagué, aquí está', ultimoMensajeHora:hace(5), ultimoEntranteHora:hace(5), ultimoAutor:'cliente', actualizado:hace(5), creado:hace(60*24*1) },
    [ { autor:'asistente', direccion:'saliente', tipo:'plantilla', texto:'Hola María, tu cuota 4 de 24 ($50,00) vence hoy.', hora:hace(120), estado:'leido' },
      { autor:'cliente', direccion:'entrante', tipo:'texto', texto:'ya pagué, aquí está', hora:hace(5), estado:'recibido' } ]);
  c('wa:+584140000002', { canal:'whatsapp', area:'ventas', telE164:'+584140000002', nombre:'Ana Torres', modo:'bot', vendedor:'Marianne Molina', noLeidos:0, borrador:{ tipo:'lead', modelo:'Kavak 250', ciudad:'Valencia', telefono:'584140000002' }, ultimoMensaje:'Perfecto, Ana 🙌 Ya le pasé tus datos a un asesor', ultimoMensajeHora:hace(60), ultimoEntranteHora:hace(62), ultimoAutor:'asistente', actualizado:hace(60), creado:hace(60*24*3) },
    [ { autor:'cliente', direccion:'entrante', tipo:'texto', texto:'precio de la Kavak 250?', hora:hace(70), estado:'recibido' },
      { autor:'asistente', direccion:'saliente', tipo:'texto', texto:'La Kavak 250 está en $2,900, inicial desde $1,160.', hora:hace(69), estado:'leido' } ]);
  c('ig:555001', { canal:'instagram', area:'ventas', igsid:'555001', usuario:'luisperez.ve', nombre:'Luis Pérez', modo:'bot', vendedor:'Liz Alejandra', noLeidos:1, ultimoMensaje:'en Maracay hay?', ultimoMensajeHora:hace(15), ultimoEntranteHora:hace(15), ultimoAutor:'cliente', actualizado:hace(15), origenComentario:'c1', creado:hace(30) },
    [ { autor:'asistente', direccion:'saliente', tipo:'texto', texto:'Hola 👋 Soy Paola, asesora comercial de Pagasi. Vi tu comentario en la publicación.', hora:hace(40), estado:'enviado' },
      { autor:'cliente', direccion:'entrante', tipo:'texto', texto:'en Maracay hay?', hora:hace(15), estado:'recibido' } ]);
  var colecciones = {
    usuarios: { 'u-prueba': { nombre:'ADAM', email:'adam@pagasi.io', rol:'Administrador', permisos:PERMISOS, concesionarios:[] } },
    config: { asistente: { conectado:true, telefono:'+58 414-2719914', instagram:'pagasi.io', instrucciones:'', instruccionesVentas:'' },
      redesMetricas: { actualizado: hace(30), seguidoresDias: (function(){ var o = {}, d = new Date(); for(var i = 12; i >= 0; i--){ var x = new Date(d); x.setDate(d.getDate() - i); o[x.toISOString().slice(0,10)] = 640 + (12 - i) * 2; } return o; })(),
        instagram: { usuario:'pagasi.io', seguidores:664, publicaciones:12, posts: [
          { id:'1', texto:'La EK Xpress 150 en cuotas quincenales. Inicial desde 40%.', fecha:hace(60*24*2), tipo:'IMAGE', enlace:'https://instagram.com/p/x', imagen:'assets/public/ek-xpress-hero.webp', meGusta:6, comentarios:11 },
          { id:'2', texto:'Tu próxima moto, en cuotas.', fecha:hace(60*24*5), tipo:'IMAGE', enlace:'https://instagram.com/p/y', imagen:'assets/public/ek-xpress-scene-v2.webp', meGusta:5, comentarios:2 },
          { id:'3', texto:'Sedes en Caracas, Valencia y Maracay.', fecha:hace(60*24*9), tipo:'CAROUSEL_ALBUM', enlace:'https://instagram.com/p/z', imagen:'', meGusta:2, comentarios:0 } ] } } },
    conversaciones: conv,
    comentarios_ig: {
      c1: { comentarioId:'c1', usuario:'luisperez.ve', texto:'Precio de la BRZ 200?', hora:hace(42), tipoMedia:'FEED', estado:'respondido', respuesta:'La BRZ 200 está en $1,750 con inicial desde $700. Escríbeme por directo y te paso todo.', respondidoEn:hace(41), privado:{ enviado:true, igsid:'555001' } },
      c2: { comentarioId:'c2', usuario:'carlos_moto', texto:'🔥🔥🔥', hora:hace(90), tipoMedia:'AD', estado:'sin-respuesta', motivo:'solo emoji o vacío' },
      c3: { comentarioId:'c3', usuario:'jose.r', texto:'Llevo una semana esperando que me llamen', hora:hace(200), tipoMedia:'FEED', estado:'fallo', reclamo:true, error:'Meta HTTP 400' }
    },
    clientes:{}, creditos:{}, pagos:{}, motos:{}, concesionarios:{}, egresos:{}, movimientos:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
  };
  Object.keys(sub).forEach(function(k){ colecciones[k] = sub[k]; });
  window.__DATOS_PRUEBA = { usuarioActual:{ uid:'u-prueba', email:'adam@pagasi.io', displayName:'adam' }, colecciones: colecciones };
})();
