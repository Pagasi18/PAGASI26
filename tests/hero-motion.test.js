'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const catalog=require('../assets/public/catalog.js');
const source=fs.readFileSync(path.join(__dirname,'../assets/public/hero-motion.js'),'utf8');
function setup(reduced=false){
  const events={},wall={innerHTML:''};
  const button={hidden:true,attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){events[k]=fn;}};
  const hero={dataset:{},querySelector:s=>s==='[data-motion-columns]'?wall:button};
  const media={matches:reduced,addEventListener(k,fn){events.media=fn;}};
  const document={readyState:'complete',hidden:false,querySelector:()=>hero,addEventListener(k,fn){events[k]=fn;}};
  const ctx={document,IntersectionObserver:function(fn){events.intersection=fn;this.observe=()=>{};},window:{PagasiCatalog:catalog,PagasiSite:{escape:String,icon:()=>'',fitPhotos(){}},matchMedia:()=>media}};
  vm.runInNewContext(source,ctx);
  return {hero,button,wall,media,document,events};
}
const t=setup();
assert.equal(t.hero.dataset.motionRunning,'true');
t.events.click();
assert.equal(t.hero.dataset.motionRunning,'false');
assert.equal(t.button.attrs['aria-pressed'],'true');
t.events.intersection([{isIntersecting:false}]);
t.events.intersection([{isIntersecting:true}]);
t.document.hidden=true;t.events.visibilitychange();
t.document.hidden=false;t.events.visibilitychange();
assert.equal(t.hero.dataset.motionRunning,'false','user pause survives visibility changes');
t.events.click();
assert.equal(t.hero.dataset.motionRunning,'true');
t.events.intersection([{isIntersecting:false}]);
assert.equal(t.hero.dataset.motionRunning,'false');
t.events.intersection([{isIntersecting:true}]);
assert.equal(t.hero.dataset.motionRunning,'true');
t.document.hidden=true;t.events.visibilitychange();
assert.equal(t.hero.dataset.motionRunning,'false');
t.document.hidden=false;t.events.visibilitychange();
assert.equal(t.hero.dataset.motionRunning,'true');
console.log('OK pause/resume and offscreen/background suspension preserve user choice');
const r=setup(true);
assert.equal(r.hero.dataset.motionRunning,'false');
assert.equal(r.button.hidden,true);
r.media.matches=false;r.events.media();
assert.equal(r.hero.dataset.motionRunning,'true');
r.events.click();
r.media.matches=true;r.events.media();
r.media.matches=false;r.events.media();
assert.equal(r.hero.dataset.motionRunning,'false','preference change must not override manual pause');
console.log('OK reduced-motion preference respected initially and when changed');
const ids=[...t.wall.innerHTML.matchAll(/data-motion-model="(\d+)"/g)].map(m=>Number(m[1]));
assert.equal(ids.length,32);
assert.equal(new Set(ids).size,16);
// La tira del medio: primero las Veloz que siguen en el catálogo (con halo). Las 3 «por confirmar»
// ya no salen (23-nov-2026, Adam: «estos hay que eliminarlos»): la columna se completa con otras motos
const medio=t.wall.innerHTML.split('<div class="pg-motion-column">')[2];
const idsMedio=[...medio.matchAll(/data-motion-model="(\d+)"/g)].map(m=>Number(m[1]));
assert.deepEqual([...new Set(idsMedio)].slice(0,3),[47,48,49]);
assert.equal(new Set(idsMedio).size,6,'la columna sigue llena');
assert.ok(!idsMedio.some(id=>id>=901&&id<=905),'ninguna de las 5 «por confirmar» fijas');
assert.equal((medio.match(/pg-motion-card pg-motion-card-veloz/g)||[]).length,6);
assert.equal((t.wall.innerHTML.match(/pg-motion-card-veloz/g)||[]).length,6,'solo las Veloz llevan halo');
console.log('OK la tira del medio empieza con las Veloz, con halo azul, y se completa sin las «por confirmar»');
for(const id of new Set(ids))assert.equal(ids.filter(x=>x===id).length,2);
for(const src of [...t.wall.innerHTML.matchAll(/(?:src|srcset)="([^"]+)"/g)].map(x=>x[1]))assert.ok(fs.existsSync(path.join(__dirname,'..',src)),src);
assert.ok(!t.wall.innerHTML.includes('<a '),'decorative wall must not add hidden focusable links');
console.log('OK 16 real models, duplicated for looping, with valid original and optimized photos');
// Si Liz oculta motos de las columnas, se rellenan con otras disponibles (primero de la misma sede)
{
  const C2=require('../assets/public/catalog.js');
  const base=C2.base.filter(m=>![47,49,5,9].includes(m.id));
  C2.aplicar(base.map(m=>Object.assign({},m,{disponible:true})),null,'prueba');
  const t2=setup();
  const cols=t2.wall.innerHTML.split('<div class="pg-motion-column">').slice(1).map(c=>[...new Set([...c.matchAll(/data-motion-model="(\d+)"/g)].map(m=>Number(m[1])))]);
  assert.deepEqual(cols.map(c=>c.length),[5,6,5],'las columnas siguen completas');
  assert.ok(!cols.flat().some(id=>[47,49,5,9].includes(id)),'sin las ocultas');
  assert.equal(new Set(cols.flat()).size,16,'sin repetir');
  console.log('OK con motos ocultas, las columnas se completan con otras del catálogo');
}

