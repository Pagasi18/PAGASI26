// Un gasto repartido en varias categorías (el contador, 10-nov-2026): lo que lee el formulario de Registrar Egreso.
const fs=require('fs'), path=require('path'), vm=require('vm');
let pass=0, fail=0; const ok=(l,v)=>{ if(v){pass++;console.log('OK   '+l);} else {fail++;console.log('FALLA '+l);} };
const els={}, avisos=[];
const G={ console, Math, JSON, Date, String, Number, Object, Array, parseFloat, parseInt, isNaN, setTimeout, S:{}, _cuentasBanc:[],
  $:id=>els[id]||null, toast:(m)=>avisos.push(m), bsAUsd:(bs,t)=>Math.round(bs/t*100)/100, document:{ createElement:()=>({ style:{} }) } };
G.window=G; vm.createContext(G);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','logic','egresos.js'),'utf8'), G);
const poner=(principal, filas)=>{ Object.keys(els).forEach(k=>delete els[k]); els.eg_cat={ value:principal };
  vm.runInContext('_egCatsIds=['+filas.map((_,i)=>i+1).join(',')+']', G);
  filas.forEach((f,i)=>{ els['eg_cat2_cat_'+(i+1)]={ value:f[0] }; els['eg_cat2_monto_'+(i+1)]={ value:String(f[1]) }; }); avisos.length=0; };
poner('material-de-limpieza', []);
ok('sin filas no hay reparto (el gasto se guarda como siempre)', G._egLeerReparto(30, false, 0)===null);
poner('material-de-limpieza', [['material-de-oficina', 10]]);
let r=G._egLeerReparto(30, false, 0);
ok('dos categorías: la de arriba lleva el resto y la suma es el gasto', r.length===2 && r[0].categoria==='material-de-limpieza' && r[0].monto===20 && r[1].categoria==='material-de-oficina' && r[1].monto===10);
poner('material-de-limpieza', [['material-de-oficina', 30]]);
ok('si la otra categoría se lleva todo, no guarda y avisa', G._egLeerReparto(30, false, 0)===false && avisos.length===1);
poner('material-de-limpieza', [['material-de-limpieza', 10]]);
ok('la misma categoría dos veces no se acepta', G._egLeerReparto(30, false, 0)===false && /repetida/.test(avisos[0]));
poner('material-de-limpieza', [['material-de-oficina', 0]]);
ok('una fila sin monto no se acepta', G._egLeerReparto(30, false, 0)===false);
poner('material-de-limpieza', [['material-de-oficina', 3000], ['condominios', 3000]]);
r=G._egLeerReparto(10000, true, 300);
ok('en bolívares: cada parte pasa a dólares y los centavos del cambio quedan en la principal (suma exacta 33,33)', r.length===3 && r[1].monto===10 && r[2].monto===10 && r[0].monto===13.33 && r[0].montoBs===4000 && Math.abs(r.reduce((a,x)=>a+x.monto,0)-33.33)<0.001);
console.log(''); console.log(pass+' pruebas OK, '+fail+' fallas'); if(fail) process.exitCode=1;
