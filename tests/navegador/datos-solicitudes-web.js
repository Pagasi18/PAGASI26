/* Datos INVENTADOS para probar en el navegador la bandeja de solicitudes web
   (27-sep-2026, formulario por partes): uno que sigue llenando, uno que termino,
   uno cerrado por el equipo, un lead del formulario de antes y un cliente del panel.
   Las horas del formulario (web_ts, web_act, web_fin) van como {seconds}, que es como
   quedan despues de pasar por la cache del navegador. */
(function(){
  var PERMISOS = ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  var ahora = Math.floor(Date.now() / 1000);
  var hace = function(min){ return { seconds: ahora - min * 60, nanoseconds: 0 }; };
  var iso = function(min){ return new Date(Date.now() - min * 60000).toISOString(); };
  window.__DATOS_PRUEBA = {
    usuarioActual: { uid:'u-prueba', email:'adam@pagasi.local', displayName:'Adam Prueba' },
    colecciones: {
      usuarios: { 'u-prueba': { nombre:'Adam Prueba', email:'adam@pagasi.local', rol:'Administrador', permisos:PERMISOS, concesionarios:[] } },
      config: {
        plan: { factor:1.2, inicial:0.45, tasaMensual:0.05, plazo:12, apy:60, diasGracia:5 },
        cuentasBanc: { lista: [ {nombre:'Binance 26', tipo:'Billetera digital', moneda:'USD'} ] }
      },
      concesionarios: { 'C1': { id:'C1', nombre:'EK BELLO MONTE', ciudad:'Caracas', activo:true } },
      clientes: {
        // Va por la parte 5 y toco algo hace 4 minutos: "Sigue llenando"
        'WEB-12345678': { id:'WEB-12345678', nombre:'Carlos Prueba', cedula:'V-12345678', tel:'0414-1234567', wa:'0414-1234567',
          trabajo:'delivery', ingreso:430, ingreso_exacto:true, ingreso_rango:'$300 a $500', estado_ubi:'Miranda',
          moto_interes_id:1, moto_interes_modelo:'NEW HORSE 150', moto_interes_precio:1320, moto_interes_sede:'EK Bello Monte',
          estado:'lead', origen:'web', creado:iso(40), editadoEn:iso(4), editadoPor:'Solicitud web',
          web_uid:'anon-prueba-1', web_ts:hace(40), web_paso:5, web_act:hace(4), web_n:6,
          uso_moto:'delivery', moto_previa:'no', empresa:'Yummy', cargo:'Motorizado', antiguedad:'3', dir_trabajo:'Chacao',
          dia_cobro:'semanal', dependientes:1, ahorro:'no', inicial_rango:'200-400',
          historial:'bueno', deudas:'no', banco_estado:'activa', banco_nombre:'Banesco',
          cashea:'si', cashea_nivel:'4', cashea_estado:'al_dia', cashea_deuda:'si', cashea_monto:350, cashea_cuotas_pend:4 },
        // Termino todo el formulario
        'WEB-23456789': { id:'WEB-23456789', nombre:'Ana Terminó', cedula:'V-23456789', tel:'0424-7654321', wa:'0424-7654321',
          trabajo:'remesas', ingreso:225, ingreso_rango:'$150 a $300', estado_ubi:'Zulia',
          moto_interes_id:null, moto_interes_modelo:'', moto_interes_precio:0, moto_interes_sede:'',
          estado:'lead', origen:'web', creado:iso(300), editadoEn:iso(240), editadoPor:'Solicitud web',
          web_uid:'anon-prueba-2', web_ts:hace(300), web_paso:9, web_act:hace(240), web_fin:hace(240), web_n:11,
          uso_moto:'personal', moto_previa:'pagada', cargo:'Vendo tortas', antiguedad:'5', dia_cobro:'mensual', remesas:'si',
          ingreso_familiar:600, dependientes:2, ahorro:'usd', inicial_rango:'400-700', historial:'ninguno', deudas:'no',
          banco_estado:'poca', cashea:'no', ciudad:'Maracaibo', dir:'Sector La Limpia, calle 79, casa 12 · Ref: frente a la bodega',
          tiempo_dir:'4', vivienda:'familiar',
          ref1:{ nom:'María González', ci:'', tel:'0424-1112233', rel:'Amigo/a', obs:'' },
          fiador:'si', fiador_nom:'José Rodríguez', fiador_tel:'0412-7654321', fiador_rel:'conyuge',
          fecha_nacimiento:'1995-03-15', email:'ana@correo.com', conocio:'redes' },
        // El equipo cerro el formulario
        'WEB-34567890': { id:'WEB-34567890', nombre:'Luis Cerrado', cedula:'V-34567890', tel:'0416-5554433', wa:'0416-5554433',
          trabajo:'formal', ingreso:650, ingreso_rango:'$500 a $800', estado_ubi:'Caracas (D.C.)',
          estado:'lead', origen:'web', creado:iso(3000), editadoEn:iso(2000), editadoPor:'Solicitud web',
          web_uid:'anon-prueba-3', web_ts:hace(3000), web_paso:3, web_act:hace(2900), web_n:3,
          web_cerrado:true, web_cerrado_por:'Samantha', web_cerrado_en:iso(2000) },
        // Del formulario de antes: el rango viaja en las notas
        'WEB-1789798989431': { id:'WEB-1789798989431', nombre:'Pedro Formulario Viejo', cedula:'V-11111111', tel:'0414-1112222', wa:'0414-1112222', ciudad:'Petare, Caracas', trabajo:'informal', ingreso:400,
          notas:'Solicitud web · Ingreso declarado: $300 a $500 · Interesado en NEW HORSE 150 ($1,320 · EK Bello Monte)',
          moto_interes_id:1, moto_interes_modelo:'NEW HORSE 150', moto_interes_precio:1320, moto_interes_sede:'EK Bello Monte',
          estado:'lead', origen:'web', creado:'2026-09-20T09:12:00.000Z', editadoEn:'2026-09-20T09:12:00.000Z', editadoPor:'Solicitud web' },
        'C-1': { id:'C-1', nombre:'Pedro Panel', cedula:'V-9999999', tel:'0424-7654321', ciudad:'Caracas', trabajo:'formal', ingreso:600, estado:'activo', creado:'2026-09-01T10:00:00.000Z' }
      },
      motos: {}, creditos: {}, pagos: {}, egresos: {}, facturas: {}, cuentasPendientes: {}, movimientos: {}, tareas: {}, recursos: {}, gps: {}
    }
  };
})();
