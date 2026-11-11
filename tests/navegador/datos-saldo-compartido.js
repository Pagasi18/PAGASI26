/* Datos INVENTADOS para la prueba en navegador del saldo compartido entre sedes (11-nov-2026).
   Tres sedes de un mismo dueño, todavía sin grupo, y una cuarta que no tiene que ver:
     MARCA La Yaguara  enviado 5.000 · consumido   600 · saldo  4.400
     MARCA Chacao      enviado 1.000 · consumido 1.800 · saldo   −800
     MARCA Otra Zona   enviado     0 · consumido   600 · saldo   −600
     MOTOS TORO        enviado 2.000 · consumido   600 · saldo  1.400
   Esperado al armar el grupo "MARCA" con las tres primeras: las tres muestran 3.000 y el TOTAL
   de la tabla sigue en 4.400. Un anticipo de 2.500 a cualquiera las sube a 5.500.               */
(function(){
  var PERMISOS=['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','comisiones','plan','config','users','concesionarios','perm_delete'];
  var CA='Anticipos en concesionarios';
  function cred(id, conc, fecha){
    return { id:id, cli:'CLIENTE '+id, clienteId:'CLI-'+id, modelo:'XPRESS 150', estado:'activo', fecha:fecha, precio:1350, precioBaseReal:1350, ini:750, fin:600,
      precioFinanciado:600, total:900, cuotaQ:75, cuota:150, totalCuotas:12, plazo:6, pagado:0, mora:0, concesionarioId:conc,
      vendedorUid:'u-prueba', vendedorNombre:'Adam Prueba', contratoFirmado:true, pagosRegistrados:[] };
  }
  function ant(id, monto, fecha){ return { id:id, monto:monto, fecha:fecha, metodo:'Banesco', cuenta:'Banesco', ref:'', nota:'', creadoPor:'Adam Prueba', movimientoId:'MOV-ANT-'+id }; }
  var creditos={
    'M-901':cred('M-901','C-YAG','2026-11-04'),
    'M-902':cred('M-902','C-CHA','2026-11-05'), 'M-903':cred('M-903','C-CHA','2026-11-06'), 'M-904':cred('M-904','C-CHA','2026-11-07'),
    'M-905':cred('M-905','C-OTR','2026-11-08'),
    'M-906':cred('M-906','C-TOR','2026-11-05')
  };
  var movimientos={
    'MOV-0':{id:'MOV-0',tipo:'deposito',monto:20000,cuentaDestino:'Banesco',cuentaOrigen:null,fecha:'2026-10-30',concepto:'Saldo inicial de prueba'},
    'MOV-ANT-ANT-1':{id:'MOV-ANT-ANT-1',tipo:'transferencia',tipoOperacion:'anticipo_concesionario',monto:5000,cuentaOrigen:'Banesco',cuentaDestino:CA,concesionarioId:'C-YAG',anticipoId:'ANT-1',fecha:'2026-11-01',concepto:'Anticipo a MARCA La Yaguara'},
    'MOV-ANT-ANT-2':{id:'MOV-ANT-ANT-2',tipo:'transferencia',tipoOperacion:'anticipo_concesionario',monto:1000,cuentaOrigen:'Banesco',cuentaDestino:CA,concesionarioId:'C-CHA',anticipoId:'ANT-2',fecha:'2026-11-03',concepto:'Anticipo a MARCA Chacao'},
    'MOV-ANT-ANT-9':{id:'MOV-ANT-ANT-9',tipo:'transferencia',tipoOperacion:'anticipo_concesionario',monto:2000,cuentaOrigen:'Banesco',cuentaDestino:CA,concesionarioId:'C-TOR',anticipoId:'ANT-9',fecha:'2026-11-02',concepto:'Anticipo a MOTOS TORO'}
  };
  Object.keys(creditos).forEach(function(k){ var c=creditos[k]; movimientos['MOV-'+k]={id:'MOV-'+k,tipo:'retiro',monto:600,cuentaOrigen:CA,cuentaDestino:null,concesionarioId:c.concesionarioId,fecha:c.fecha,concepto:'Compra de moto '+k}; });
  window.__DATOS_PRUEBA={
    usuarioActual:{uid:'u-prueba',email:'adam@pagasi.local',displayName:'Adam Prueba'},
    colecciones:{
      usuarios:{ 'u-prueba':{nombre:'Adam Prueba',email:'adam@pagasi.local',rol:'Administrador',permisos:PERMISOS,concesionarios:[]} },
      config:{ plan:{factor:1.2,inicial:0.45,tasaMensual:0.05,plazo:12,apy:60,diasGracia:5},
        cuentasBanc:{ lista:[{nombre:'Banesco',moneda:'USD'}] } },
      concesionarios:{
        'C-YAG':{id:'C-YAG',nombre:'MARCA La Yaguara',ciudad:'Caracas',rif:'J-11111111-1',activo:true,anticipos:[ant('ANT-1',5000,'2026-11-01')]},
        'C-CHA':{id:'C-CHA',nombre:'MARCA Chacao',ciudad:'Caracas',rif:'J-22222222-2',activo:true,anticipos:[ant('ANT-2',1000,'2026-11-03')]},
        'C-OTR':{id:'C-OTR',nombre:'MARCA Otra Zona',ciudad:'Valencia',rif:'J-33333333-3',activo:true,anticipos:[]},
        'C-TOR':{id:'C-TOR',nombre:'MOTOS TORO',ciudad:'Caracas',rif:'J-44444444-4',activo:true,anticipos:[ant('ANT-9',2000,'2026-11-02')]}
      },
      clientes:{}, motos:{}, creditos:creditos, pagos:{}, movimientos:movimientos,
      egresos:{}, facturas:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
