/* Datos INVENTADOS para ver los porcentajes de las pestanas de Cobranza
   (17-sep-2026). 20 creditos vigentes; 5 atrasados: 2 mora regular, 2 criticos
   (+30 dias) y 1 con acuerdo mensual. Esperado: Mora Total 5 (25,0% de la
   cartera), Mora Regular 2 (40% de la mora), Criticos 2 (40% de la mora).     */
(function(){
  function iso(d){ var p=function(n){return String(n).padStart(2,'0');}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  function dias(n){ var d=new Date(); d.setDate(d.getDate()+n); return iso(d); }
  var PERMISOS=['dash','centro','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'];
  var creditos={}, clientes={}, motos={};
  function credito(id, diasAtraso, extra){
    var o = { id:id, cli:'CLIENTE '+id, clienteId:'CLI-'+id, motoId:'M-'+id, modelo:'SUZUKI GN 125',
      estado:'activo', fecha:dias(-(15+diasAtraso)), cuotaQ:100, cuota:200, totalCuotas:12, plazo:6,
      pagado:0, mora:diasAtraso, total:1200, fin:1200, precio:1200, inicial:0, ini:0,
      concesionarioId:'CO-P', contratoFirmado:true, frecuencia:'quincenal', pagosRegistrados:[] };
    if(extra) Object.keys(extra).forEach(function(k){ o[k]=extra[k]; });
    return o;
  }
  for(var i=1;i<=15;i++){
    var id='CRED-1'+String(i).padStart(2,'0');
    creditos[id]=credito(id,0,{fecha:dias(-1),mora:0});
    clientes['CLI-'+id]={id:'CLI-'+id,nombre:'CLIENTE '+id,cedula:'V-1000000'+i,tel:'0414000000'+i,estado:'activo',concesionarioId:'CO-P'};
    motos['M-'+id]={id:'M-'+id,modelo:'SUZUKI GN 125',placa:'AA'+i,estado:'vendida',precio:1200,concesionarioId:'CO-P'};
  }
  [['CRED-201',3],['CRED-202',8],['CRED-203',45],['CRED-204',60],['CRED-205',10]].forEach(function(x){
    creditos[x[0]]=credito(x[0],x[1], x[0]==='CRED-205' ? {fechaCompromiso:dias(5)} : null);
    clientes['CLI-'+x[0]]={id:'CLI-'+x[0],nombre:'CLIENTE '+x[0],cedula:'V-2000000',tel:'04142000000',estado:'activo',concesionarioId:'CO-P'};
    motos['M-'+x[0]]={id:'M-'+x[0],modelo:'SUZUKI GN 125',placa:'BB'+x[0],estado:'vendida',precio:1200,concesionarioId:'CO-P'};
  });
  window.__DATOS_PRUEBA={
    usuarioActual:{uid:'u-prueba',email:'prueba@pagasi.local',displayName:'Prueba Cobranza'},
    colecciones:{
      usuarios:{'u-prueba':{nombre:'Prueba Cobranza',email:'prueba@pagasi.local',rol:'Administrador',permisos:PERMISOS,concesionarios:[]}},
      config:{plan:{factor:1.2,inicial:0.45,tasaMensual:0.05,plazo:12,apy:60,diasGracia:5}},
      concesionarios:{'CO-P':{id:'CO-P',nombre:'Sede Prueba'}},
      clientes:clientes, motos:motos, creditos:creditos,
      pagos:{}, movimientos:{}, egresos:{}, facturas:{}, cuentasPendientes:{}, tareas:{}, recursos:{}, gps:{}
    }
  };
})();
