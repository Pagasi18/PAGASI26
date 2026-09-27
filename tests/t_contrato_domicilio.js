// 27-sep-2026: el contrato Protect y el de reserva de dominio leian cli.direccion,
// que ninguna ficha tiene (la direccion vive en 'dir'). Salia "domiciliado(a) en
// N/A" en todos los contratos, tambien en la 1.7 y en las notificaciones. Y la
// profesion salia como codigo ("delivery"). Estas pruebas usan una ficha REAL, con
// los nombres de campo que guarda el sistema, no la ficha inventada de t_protect.
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=path.join(__dirname,'..');
let pass=0, fail=0;
const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const ctx={ console:{log(){},warn(){},error(){}}, S:{clientes:[],creds:[],motos:[],gps:[],concesionarios:[]}, window:{} };
ctx.window=ctx; vm.createContext(ctx);
vm.runInContext(['logic/contratos.js'].map(f=>fs.readFileSync(path.join(ROOT,f),'utf8')).join('\n;\n'), ctx, {filename:'contratos.js'});

const real={ id:'1042', nombre:'CARLOS PEREZ', cedula:'V-12345678', dir:'Petare, barrio José Félix Ribas, zona 10, casa 25', ciudad:'Caracas', estado_ubi:'Miranda', trabajo:'delivery', cargo:'', empresa:'' };
ok('domicilio sale de dir + ciudad + estado', ctx._ctrDomicilio(real)==='Petare, barrio José Félix Ribas, zona 10, casa 25, Caracas, Miranda');
ok('sin repetir la ciudad si ya está en la dirección', ctx._ctrDomicilio({dir:'Av. Lecuna, Caracas', ciudad:'Caracas', estado_ubi:'Distrito Capital'})==='Av. Lecuna, Caracas, Distrito Capital');
ok('una ficha vieja con "direccion" sigue sirviendo', ctx._ctrDomicilio({direccion:'Av. Principal, Caracas'})==='Av. Principal, Caracas');
ok('sin ningún dato queda vacío (sale la raya para bolígrafo)', ctx._ctrDomicilio({})==='' && ctx._ctrDomicilio({dir:'N/A'})==='');
ok('oficio: el código se vuelve palabra', ctx._ctrOficio(real)==='Motorizado(a) de delivery' && ctx._ctrOficio({trabajo:'formal'})==='Empleado(a) del sector privado');
ok('oficio: el cargo escrito manda', ctx._ctrOficio({trabajo:'formal', cargo:'Vendedor'})==='Vendedor');
ok('oficio: un texto viejo que no es código se respeta', ctx._ctrOficio({trabajo:'Mecánico'})==='Mecánico');
ok('oficio: remesas no es un oficio (no se inventa)', ctx._ctrOficio({trabajo:'remesas'})==='');
ok('actividad: remesas sí es origen de fondos', ctx._ctrActividad({trabajo:'remesas'})==='Remesas familiares');
ok('actividad: cargo y empresa', ctx._ctrActividad({trabajo:'formal', cargo:'Cajero', empresa:'Farmatodo'})==='Cajero, Farmatodo');

// Los contratos ya no leen cli.direccion directo
const prot=fs.readFileSync(path.join(ROOT,'logic/contratos-protect.js'),'utf8'), dra=fs.readFileSync(path.join(ROOT,'logic/contratos-dra.js'),'utf8');
ok('Protect: domicilio con _ctrDomicilio', /cliDir: V\(E\(_ctrDomicilio\(cli\)\), 40\)/.test(prot) && !/V\(cli\.direccion/.test(prot));
ok('Protect: profesión y actividad sin el código crudo', /cliProf: V\(E\(_ctrOficio\(cli\)\)/.test(prot) && /dc\.actividad \|\| _ctrActividad\(cli\)/.test(prot) && !/cli\.trabajo \|\| cli\.profesion/.test(prot));
ok('Reserva de dominio: domicilio con _ctrDomicilio (dos lugares)', (dra.match(/_ctrDomicilio\(/g)||[]).length===2 && !/cli\.direccion/.test(dra));
console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
