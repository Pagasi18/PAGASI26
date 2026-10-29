// Navegador real, Firebase ficticio, ninguna conexión a la base de producción.
// NODE_PATH=/ruta/a/node_modules node tests/mobile-ventas.cjs [--audit]
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),AUDIT=process.argv.includes('--audit');
const OUT=process.env.PAGASI_MOBILE_OUTPUT||path.resolve(ROOT,'../output/movil-ventas',AUDIT?'antes':'despues');
fs.mkdirSync(OUT,{recursive:true});
const fixture=fs.readFileSync(path.join(__dirname,'navegador/datos-ventas-movil.js'),'utf8');
const fake=fs.readFileSync(path.join(__dirname,'navegador/fake-firebase.js'),'utf8');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(ROOT,'.'+name);
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
  try{
    let content=fs.readFileSync(file);
    if(name==='/admin.html')content=Buffer.from(content.toString().replace(/<script\b[^>]*src="https:[\s\S]*?<\/script>/g,'').replace(/<head>/,'<head><script>'+fixture+'\n'+fake+'</script>'));
    // La prueba representa PAGASI 26, aunque se ejecute en el repositorio fuente 18.
    if(name==='/assets/pagasi-app.js')content=Buffer.from(content.toString().replace("projectId: 'pagasi-v2'","projectId: 'pagasi26-65ced'"));
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(content);
  }catch{res.writeHead(404).end();}
});
const reports=[];
async function snapshot(page,name){
  await page.waitForTimeout(220);
  // Los avisos provocados deliberadamente por la prueba se comprueban aparte.
  await page.evaluate(()=>{const t=document.getElementById('toasts');if(t)t.innerHTML='';});
  await page.screenshot({path:path.join(OUT,name+'.png')});
  const r=await page.evaluate(()=>{
    const ov=document.getElementById('wz-overlay'),open=ov&&getComputedStyle(ov).display!=='none';
    const menu=document.getElementById('pg-mobile-menu'),menuOpen=menu&&!menu.hidden;
    const root=menuOpen?menu.querySelector('.pg-menu-panel'):open?ov:document.getElementById('cnt');
    const width=innerWidth;
    return {width,scrollWidth:root.scrollWidth,overflow:[...root.querySelectorAll('input,select,textarea,button,.wz-card')].filter(e=>{
      const s=getComputedStyle(e),r=e.getBoundingClientRect();
      return s.display!=='none'&&r.width>0&&(r.left< -1||r.right>width+1);
    }).map(e=>({id:e.id,text:e.innerText.slice(0,50),right:Math.round(e.getBoundingClientRect().right)})),smallInputs:[...root.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=hidden]),select,textarea')].filter(e=>e.getBoundingClientRect().width>0&&parseFloat(getComputedStyle(e).fontSize)<16).map(e=>e.id),footer:(()=>{const el=root.querySelector('.wz-foot');if(!el)return null;let r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom};})(),nav:[...document.querySelectorAll('#mob-bottom-bar button')].map(e=>e.textContent.trim())};
  });
  if(r.scrollWidth>r.width+1)r.containers=await page.evaluate(()=>[...document.getElementById('cnt').querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width>1&&r.right>innerWidth+1&&!e.closest('thead');}).slice(0,18).map(e=>({tag:e.tagName,cls:e.className,style:e.getAttribute('style'),text:(e.textContent||'').slice(0,70),rect:{x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}})));
  reports.push({name,...r});
  if(!AUDIT&&r.width<=1024){assert(r.scrollWidth<=r.width+1,name+' sin desplazamiento horizontal');assert.equal(r.overflow.length,0,name+' sin campos fuera de pantalla: '+JSON.stringify(r.overflow));assert.equal(r.smallInputs.length,0,name+' sin zoom de iOS: '+r.smallInputs.join(','));}
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const cases=(AUDIT?[{width:390},{width:320},{width:768},{width:1440}]:[{width:390},{width:320},{width:768},{width:844,height:390},{width:1440},{width:390,role:'Vendedor Concesionario'}]).filter(s=>!process.env.PAGASI_TEST_WIDTH||s.width===Number(process.env.PAGASI_TEST_WIDTH));
  for(const scenario of cases){
   const width=scenario.width,role=scenario.role||'Empleado',prefix=width+(scenario.role?'-concesionario':'');
   const ctx=await browser.newContext({viewport:{width,height:scenario.height||(width===320?568:900)},isMobile:width<=1024,hasTouch:width<=1024});
   await ctx.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===origin||['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)?r.continue():r.abort();});
   const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.goto(origin+'/admin.html?rol='+encodeURIComponent(role));
   await page.waitForFunction(()=>typeof S!=='undefined'&&S.currentUser&&S.motos.length>0);
   await page.waitForTimeout(500);
   await page.evaluate(r=>nav(r==='Vendedor Concesionario'?'motos':'dash'),role);
   await snapshot(page,prefix+'-inicio');
   if(width<=1024&&!AUDIT){
    const initial=await page.evaluate(()=>S.page);
    const dock=await page.locator('#mob-bottom-bar').evaluate(el=>({rect:{left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,bottom:el.getBoundingClientRect().bottom},targets:[...el.querySelectorAll('button')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}));
    assert(dock.rect.left>=0&&dock.rect.right<=width+1,'barra dentro de la pantalla');
    assert(dock.targets.every(t=>t.w>=44&&t.h>=44),'accesos cómodos para el dedo');
    await page.locator('#mbb-more').click();await page.locator('.pg-menu-panel').waitFor({state:'visible'});
    assert.equal(await page.locator('.pg-menu-panel').getAttribute('aria-modal'),'true','menú como diálogo');
    assert(await page.evaluate(()=>document.getElementById('app-root').inert),'fondo no interactivo al abrir el menú');
    assert(await page.evaluate(()=>[...document.querySelectorAll('.pg-menu-item')].every(b=>hasModuleAccess(b.dataset.module))),'menú según los permisos');
    assert.equal(await page.locator('.pg-menu-item[data-module="pagos"],.pg-menu-item[data-module="config"]').count(),0,'vendedor no recibe accesos financieros o de administración');
    await snapshot(page,prefix+'-menu');
    await page.locator('#pg-menu-search').fill('calculadora');
    assert.equal(await page.locator('.pg-menu-item:visible').count(),1,'búsqueda del menú filtra accesos');
    await page.locator('.pg-menu-item[data-module="calculadora"]').click();
    await page.waitForFunction(()=>S.page==='calculadora'&&!_pgMenu.open&&!_pgMenu.pop);
    assert.equal(await page.locator('#mbb-more').getAttribute('aria-current'),'page','Más queda activo para las herramientas');
    await page.evaluate(()=>history.back());await page.waitForFunction(p=>S.page===p,initial);
    await page.locator('#mbb-more').click();await page.waitForFunction(()=>_pgMenu.open);
    await page.evaluate(()=>history.back());await page.waitForFunction(()=>!_pgMenu.open);
    assert.equal(await page.evaluate(()=>S.page),initial,'Atrás cierra el menú sin cambiar de página');
    assert(!await page.evaluate(()=>document.getElementById('app-root').inert),'el contenido recupera su interacción');
    if(width===390&&!scenario.role){
     await page.locator('#mbb-more').click();await page.waitForFunction(()=>_pgMenu.open);
     await page.locator('#pg-menu-search').fill('herramienta inexistente');
     assert(await page.locator('.pg-menu-empty').isVisible(),'búsqueda vacía tiene respuesta');
     await page.keyboard.press('Escape');await page.waitForFunction(()=>!_pgMenu.open&&!_pgMenu.pop);
     assert.equal(await page.evaluate(()=>document.activeElement.id),'mbb-more','cerrar devuelve el foco al acceso');
    }
   }
   if(width===390&&!scenario.role&&!AUDIT){
    await page.locator('.pg-dashboard-more>summary').click();
    assert(await page.locator('.pg-dashboard-more').evaluate(e=>e.open),'estadísticas del inicio accesibles');
    await snapshot(page,prefix+'-estadisticas');
    await page.locator('.pg-dashboard-more>summary').click();
    await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(120);
    assert.equal(await page.locator('.pg-dashboard-more').count(),0,'escritorio conserva el dashboard completo');
    assert(!await page.locator('.pg-sales-home').isVisible(),'inicio de ventas reservado al móvil');
    await page.setViewportSize({width,height:900});await page.waitForTimeout(120);
    const login=await ctx.newPage();await login.goto(origin+'/admin.html?anonimo=1');await login.locator('#l_user').waitFor({state:'visible'});
    assert.equal(await login.locator('#l_user').evaluate(e=>getComputedStyle(e).fontSize),'16px');
    assert(!await login.locator('#mob-bottom-bar').isVisible(),'barra oculta antes de iniciar sesión');
    await login.screenshot({path:path.join(OUT,'390-acceso.png')});await login.close();
   }
   if(width<=1024&&!AUDIT){await page.locator('#mbb-clientes').click();assert.equal(await page.locator('#mbb-clientes').getAttribute('aria-current'),'page','sección activa sincronizada');}
   else await page.evaluate(()=>nav('clientes'));
   await page.evaluate(()=>setClienteEstadoFiltro('lead'));
   await snapshot(page,prefix+'-clientes');
   if(!AUDIT){
    assert(!await page.locator('#mob-bottom-bar').innerText().then(t=>t.includes('Cobrar')),'vendedor sin permiso no ve Cobrar');
    if(role==='Vendedor Concesionario')assert(await page.evaluate(()=>hasModuleAccess('calculadora')),'calculadora accesible para el concesionario');
   }
   if(width<=1024&&!AUDIT)await page.locator('#mbb-nueva').click();else await page.evaluate(()=>openAddCred());await page.waitForTimeout(120);
   await snapshot(page,prefix+'-paso1');
   if(!AUDIT){
    if(width===390&&!scenario.role){
     await page.locator('#wz_nom').focus();
     const keyboard=await page.evaluate(()=>{
      const descriptor=Object.getOwnPropertyDescriptor(window,'visualViewport'),original=window.visualViewport;
      Object.defineProperty(window,'visualViewport',{configurable:true,value:{height:innerHeight-300,offsetTop:0}});
      pgMobileViewport();
      const result={bottom:document.querySelector('.wz-foot').getBoundingClientRect().bottom,limit:innerHeight-300,hidden:getComputedStyle(document.querySelector('.wz-steps')).display};
      if(descriptor)Object.defineProperty(window,'visualViewport',descriptor);else Object.defineProperty(window,'visualViewport',{configurable:true,value:original});
      document.activeElement.blur();pgMobileViewport();return result;
     });
     assert(Math.abs(keyboard.bottom-keyboard.limit)<2,'botones encima del teclado simulado');assert.equal(keyboard.hidden,'none');
    }
    await page.locator('[onclick="_wzNext()"]').click();
    assert.equal(await page.evaluate(()=>WZ.step),1,'un obligatorio vacío no avanza');
    assert.equal(await page.locator('#wz_nom').getAttribute('aria-invalid'),'true','campo incorrecto visible');
   }
   await page.locator('#wz_nom').fill('VALERIA EJEMPLO');await page.locator('#wz_ci').fill('V-00000002');await page.locator('#wz_tel').fill('04120000002');
   await page.locator('[onclick="_wzNext()"]').click();await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>WZ.step),2);
   await snapshot(page,prefix+'-paso2');
   if(!AUDIT){
    if(width===390&&!scenario.role){await page.evaluate(()=>toggleDark());await snapshot(page,prefix+'-perfil-oscuro');await page.evaluate(()=>toggleDark());}
    assert.equal(await page.locator('input[capture="environment"]').count(),1,'cámara trasera para documentos');
    assert.equal(await page.locator('input[capture="environment"]').getAttribute('accept'),'image/*');
    if(width===390&&!scenario.role){
     await page.locator('details[data-section="empleo"]>summary').click();
     await page.locator('[onclick="_wzNext()"]').click();
     assert.equal(await page.evaluate(()=>WZ.step),2,'el bloque requerido sigue validando');
     assert(await page.locator('details[data-section="empleo"]').evaluate(e=>e.open),'el error abre el bloque que falta');
    }
   }
   await page.locator('#wz_emp_g').locator('label').first().click();await page.locator('#wz_ing').fill('900');
   if(!AUDIT&&width<=1024){
    await page.waitForFunction(()=>document.querySelector('details[data-section="empleo"]').classList.contains('is-complete'));
    assert.equal(await page.locator('#wz_emp_g').getAttribute('aria-invalid'),null,'la elección corregida limpia su aviso');
    assert(await page.locator('details.pg-form-section').count()>=7,'perfil organizado por bloques');
    await page.locator('details[data-section="referencias"]>summary').click();
    await page.locator('#wz_r1n').fill('REFERENCIA DEMO');await page.locator('#wz_r1t').fill('04120000009');
    await page.locator('details[data-section="empleo"]>summary').click();
    assert.equal(await page.locator('#wz_ing').inputValue(),'900','cerrar bloques conserva el ingreso');
    assert.equal(await page.locator('#wz_r1n').inputValue(),'REFERENCIA DEMO','referencia oculta conservada');
    if(width===390&&!scenario.role){
     assert(!await page.locator('details[data-section="residencia"]').evaluate(e=>e.classList.contains('is-complete')),'un valor de fábrica no marca la residencia como respondida');
     await page.locator('.pg-profile-overview').click();await snapshot(page,prefix+'-perfil-bloques');
     await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(120);
     assert.equal(await page.locator('.pg-form-section').count(),0,'escritorio conserva las tarjetas originales');
     assert.equal(await page.locator('.pg-profile-overview').count(),0,'el control móvil no se duplica al cambiar de tamaño');
     assert.equal(await page.locator('[id^="wz-sec-"]').first().getAttribute('id'),'wz-sec-1','orden de escritorio conservado');
     assert.equal(await page.locator('#wz_ing').inputValue(),'900','el cambio de tamaño conserva los campos');
     await page.setViewportSize({width,height:900});await page.waitForTimeout(120);
     assert.equal(await page.locator('.pg-profile-overview').count(),1,'un solo control al volver al móvil');
     assert.equal(await page.locator('#wz_r1n').inputValue(),'REFERENCIA DEMO','referencias conservadas al volver al móvil');
    }
   }
   await page.locator('[onclick="_wzNext()"]').click();await page.waitForTimeout(250);
   assert.equal(await page.evaluate(()=>WZ.step),3);
   await snapshot(page,prefix+'-paso3');
   if(!AUDIT){
    await page.locator('#wz_moto_inv').selectOption('MOTO-DEMO');await page.waitForTimeout(180);
    await page.locator('#wz_uso').selectOption('personal');
    const account=page.locator('#wz_ini_metodo');if(await account.isVisible())await account.selectOption('BANCO DEMO USD');
    await page.locator('#wz_ini_real').fill('700');await page.locator('#wz_plazo_custom').fill('12');
    await page.locator('#wz_ini_real').dispatchEvent('input');await page.waitForTimeout(120);
    if(!(await page.locator('#wz_cuota_q_custom').inputValue()))await page.locator('#wz_cuota_q_custom').fill('60');
    await page.locator('[onclick="_wzNext()"]').click();await page.waitForTimeout(180);
    assert.equal(await page.evaluate(()=>WZ.step),4,'llega a Resultado: '+await page.evaluate(()=>document.getElementById('toasts')?.innerText||''));
    await snapshot(page,prefix+'-resultado');
    if(width<=1024){
     assert.equal(await page.locator('.pg-review-score').getAttribute('open'),null,'score disponible en un desglose');
     assert(await page.locator('.wz-plan-summary').evaluate(el=>Array.from(el.parentNode.children).indexOf(el)<Array.from(el.parentNode.children).indexOf(el.parentNode.querySelector('.wz-client-summary'))),'plan antes del detalle del cliente');
     if(width===390&&!scenario.role){
      await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(120);
      assert.equal(await page.locator('.pg-review-score').count(),0,'escritorio muestra el resultado original');
      await page.setViewportSize({width,height:900});await page.waitForTimeout(120);
      assert.equal(await page.locator('.pg-review-score').count(),1,'desglose móvil único después de cambiar de tamaño');
      await page.locator('[aria-label="Editar moto y plan"]').click();await page.waitForFunction(()=>WZ.step===3);await page.waitForTimeout(100);
      assert.equal(await page.locator('#wz_ini_real').inputValue(),'700','editar conserva el plan');
      await page.locator('[onclick="_wzNext()"]').click();await page.waitForFunction(()=>WZ.step===4);await page.waitForTimeout(100);
      await page.locator('.wz-step[aria-label="Volver al paso 1"]').click();await page.waitForFunction(()=>WZ.step===1);await page.waitForTimeout(100);
      assert.equal(await page.locator('#wz_nom').inputValue(),'VALERIA EJEMPLO','volver al cliente conserva sus datos');
      await page.locator('[onclick="_wzNext()"]').click();await page.waitForFunction(()=>WZ.step===2);await page.waitForTimeout(100);
      assert.equal(await page.locator('#wz_r1n').inputValue(),'REFERENCIA DEMO','revisión no borra referencias');
      await page.locator('[onclick="_wzNext()"]').click();await page.waitForFunction(()=>WZ.step===3);await page.waitForTimeout(150);
      await page.locator('[onclick="_wzNext()"]').click();await page.waitForFunction(()=>WZ.step===4);
     }
    }
    if(width<=1024){
     await page.evaluate(()=>history.back());await page.waitForFunction(()=>WZ.step===3);
     assert.equal(await page.locator('#wz_ini_real').inputValue(),'700','atrás del teléfono conserva la inicial');
     await page.locator('[onclick="_wzNext()"]').click();await page.waitForFunction(()=>WZ.step===4);
    }
    await page.locator('[onclick="_wzGuardar()"]').click();
    await page.waitForFunction(()=>__prueba.col('creditos').length===1&&document.getElementById('wz-overlay').style.display==='none');
    const saved=await page.evaluate(()=>({credits:__prueba.col('creditos'),payments:__prueba.col('pagos')}));
    assert.equal(saved.credits.length,1,'un crédito por venta');
    assert.equal(saved.credits[0].cli,'VALERIA EJEMPLO');
    assert.equal(saved.credits[0].estado,role==='Vendedor Concesionario'?'pendiente_revision':'activo');
    assert.equal(saved.payments.length,role==='Vendedor Concesionario'?0:1,'inicial sin duplicados y solo cuando corresponde');
    if(saved.payments.length)assert.equal(saved.payments[0].monto,700);
    await snapshot(page,prefix+'-venta-guardada');
    if(width<=1024){
     assert(await page.locator('.pg-sale-success').isVisible(),'confirmación permanente después del guardado');
     assert((await page.locator('.pg-sale-success').innerText()).includes(saved.credits[0].id),'confirmación con el número correcto');
     await page.locator('.pg-sale-actions .btn-p').click();await page.locator('#modal-box').waitFor({state:'visible'});
     assert(await page.locator('#modal-box').evaluate(e=>e.getBoundingClientRect().width<=innerWidth+1),'detalle de la venta cabe en pantalla');
     await page.evaluate(()=>closeM());
     const metrics=page.locator('.pg-credit-toggle');
     if(await metrics.count()){
      await metrics.click();assert.equal(await metrics.getAttribute('aria-expanded'),'true','métricas disponibles al desplegar');
      assert(await page.locator('#cnt').evaluate(e=>e.scrollWidth<=innerWidth+1),'métricas sin desbordar');await metrics.click();
     }
     const more=page.locator('.pg-banner-toggle').first();
     if(await more.count()){await more.click();assert.equal(await more.getAttribute('aria-expanded'),'true','acciones adicionales accesibles');}
    }
    await page.evaluate(()=>openAddCred());await page.waitForTimeout(100);
    await page.locator('#wz_nom').fill('OTRA PRUEBA');await page.locator('#wz_ci').fill('V-00000003');await page.locator('#wz_tel').fill('04120000003');
    await page.locator('[onclick="_wzNext()"]').click();await page.waitForTimeout(100);
    await page.locator('#wz_emp_g').locator('label').first().click();await page.locator('#wz_ing').fill('900');
    await page.locator('[onclick="_wzNext()"]').click();await page.waitForTimeout(100);
   }
   await page.locator('[onclick="_wzPrev()"]').click();await page.waitForTimeout(80);
   assert.equal(await page.locator('#wz_ing').inputValue(),'900','ingreso se conserva al volver');
   await page.evaluate(()=>_wzClose());await page.evaluate(()=>openAddCliente());await page.waitForTimeout(80);
   await snapshot(page,prefix+'-alta-cliente');
   if(width===390&&!scenario.role&&!AUDIT){
    const original=await page.evaluate(()=>{_wzClose();var saved=S.currentUser.permisos.slice();S.currentUser.permisos=['clientes'];nav('clientes');return saved;});
    assert.equal(await page.locator('#mbb-nueva,#mbb-creditos').count(),0,'permisos retirados desaparecen de la barra');
    await page.locator('#mbb-more').click();await page.waitForFunction(()=>_pgMenu.open);
    assert.deepEqual(await page.locator('.pg-menu-item').evaluateAll(items=>items.map(b=>b.dataset.module)),['clientes'],'el menú respeta el permiso actualizado');
    await snapshot(page,'390-menu-acceso-limitado');
    await page.locator('.pg-menu-close').click();await page.waitForFunction(()=>!_pgMenu.open&&!_pgMenu.pop);
    await page.evaluate(perms=>{S.currentUser.permisos=perms;nav('dash');},original);
    await page.locator('.pg-mobile-search').click();await page.locator('#mob-search-overlay').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.activeElement.id==='mob-srch-input');
    await page.evaluate(()=>closeMobSearch());
   }
   assert.equal(errors.length,0,'sin errores JS: '+errors.join('; '));
   await ctx.close();
  }
  if(!AUDIT&&(!process.env.PAGASI_TEST_WIDTH||process.env.PAGASI_TEST_WIDTH==='390')){
   const ctx=await browser.newContext({viewport:{width:390,height:900},isMobile:true,hasTouch:true});
   await ctx.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===origin||['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)?r.continue():r.abort();});
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/admin.html?rol=Administrador');await page.waitForFunction(()=>typeof S!=='undefined'&&S.currentUser&&S.currentUser.rol==='Administrador'&&S.motos.length>0);
   await page.waitForTimeout(600);
   await page.evaluate(()=>nav('clientes'));await page.locator('#mbb-more').click();await page.waitForFunction(()=>_pgMenu.open);
   assert(await page.locator('.pg-menu-item[data-module="config"]').count(),'administración disponible para su rol');
   await snapshot(page,'390-admin-menu');
   await page.locator('#pg-menu-search').fill('configuración');
   await page.evaluate(()=>{scheduleRealtimeRender();flushRealtimeRender();});await page.waitForTimeout(450);
   assert(await page.evaluate(()=>_pgMenu.open),'los cambios del equipo no cierran el menú');
   assert.equal(await page.locator('#pg-menu-search').inputValue(),'configuración','el refresco conserva la búsqueda abierta');
   assert.equal(await page.locator('.pg-menu-item:visible').count(),1,'búsqueda con acentos');await snapshot(page,'390-admin-busqueda');
   await page.keyboard.press('Shift+Tab');assert(await page.locator('.pg-menu-close').evaluate(el=>el===document.activeElement),'navegación con teclado del menú');
   await page.keyboard.press('Shift+Tab');assert(await page.locator('.pg-menu-theme').evaluate(el=>el===document.activeElement),'el foco permanece dentro del menú');
   const themeBefore=await page.evaluate(()=>document.documentElement.getAttribute('data-theme'));
   await page.locator('#pg-menu-theme').click();assert.notEqual(await page.evaluate(()=>document.documentElement.getAttribute('data-theme')),themeBefore,'el cambio de tema sigue disponible en el menú');
   await page.locator('#pg-menu-theme').click();
   await page.locator('.pg-menu-account').click();await page.locator('#profile-overlay').waitFor({state:'visible'});
   assert(!await page.evaluate(()=>_pgMenu.open),'abrir la cuenta cierra el menú');
   await page.evaluate(()=>{document.getElementById('profile-overlay').style.display='none';document.body.style.overflow='';});
   await page.locator('#mbb-more').click();await page.waitForFunction(()=>_pgMenu.open);
   await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>!_pgMenu.open);
   assert(!await page.evaluate(()=>document.getElementById('app-root').inert),'cambiar a escritorio libera el contenido');
   assert(!await page.locator('#mob-bottom-bar').isVisible(),'escritorio conserva su navegación');
   await page.setViewportSize({width:390,height:900});await page.locator('#mbb-more').waitFor({state:'visible'});
   await page.locator('#mbb-more').click();await page.waitForFunction(()=>_pgMenu.open);await page.evaluate(()=>doLogout());
   await page.waitForFunction(()=>!auth.currentUser);await page.locator('#login-screen').waitFor({state:'visible'});
   assert(!await page.locator('#mob-bottom-bar').isVisible(),'cerrar sesión oculta la barra');
   assert(!await page.evaluate(()=>_pgMenu.open),'cerrar sesión cierra el menú');
   assert.equal(errors.length,0,'navegación de administrador sin errores: '+errors.join('; '));await ctx.close();
  }
 }finally{await browser.close();server.close();fs.writeFileSync(path.join(OUT,'auditoria.json'),JSON.stringify(reports,null,2));}
 console.log(JSON.stringify({ok:true,audit:AUDIT,pantallas:reports.length,output:OUT}));
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
