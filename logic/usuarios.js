// Logica de usuarios, roles, permisos e invitaciones.
// Extraido de assets/pagasi-app.js sin cambiar comportamiento.

function setUsersTab(tab){
  S.usersTab = tab;
  var host = $('users-tab-content');
  if(!host) return;
  // Update tab buttons
  document.querySelectorAll('.us-tab').forEach(function(b){ b.classList.remove('is-active'); });
  var activeBtn = document.querySelector('.us-tab[onclick*="setUsersTab(\''+tab+'\')"]');
  if(activeBtn) activeBtn.classList.add('is-active');
  // Render content
  if(tab==='usuarios') host.innerHTML = _usersTabUsuariosHTML();
  else if(tab==='roles') host.innerHTML = _usersTabRolesHTML();
  else host.innerHTML = _usersTabInvitacionesHTML();
  // Reload data
  setTimeout(usersReload, 50);
}

// ══════════════════════════════════════════
// MATRIZ DE ROLES — toggle de permiso por rol
// Al hacer clic en una celda de la matriz:
//  1. Se invierte el permiso de ese rol en memoria (ROL_PERMISOS).
//  2. Se persiste ROL_PERMISOS en Firestore (config/rolesPermisos) para que
//     sobreviva recargas del navegador.
//  3. Se actualiza el campo "permisos" de TODOS los usuarios con ese rol
//     (excepto aquellos cuya configuración fue personalizada manualmente,
//     pero como el flujo del sistema asigna ROL_PERMISOS al cambiar el rol,
//     consideramos que todos los usuarios con ese rol siguen el preset).
//  4. Se redibuja la matriz para reflejar el nuevo estado.
// El listener en tiempo real se encarga de notificar a los usuarios afectados
// que tienen sesión activa.
// ══════════════════════════════════════════
function toggleRolePerm(rol, modKey){
  if(!isAdminUser()){ toast('Solo administradores pueden modificar la matriz','error'); return; }
  if(rol === 'Administrador'){ toast('El Administrador siempre tiene acceso total','info'); return; }
  if(!db){ toast('Requiere conexión','error'); return; }
  if(!Array.isArray(ROL_PERMISOS[rol])) ROL_PERMISOS[rol] = [];
  var idx = ROL_PERMISOS[rol].indexOf(modKey);
  var dando = idx < 0; // true si se está concediendo el permiso
  if(dando){
    ROL_PERMISOS[rol].push(modKey);
  } else {
    ROL_PERMISOS[rol].splice(idx, 1);
  }
  // Persistir el preset del rol
  try{
    var payload = {};
    payload[rol] = ROL_PERMISOS[rol];
    db.collection('config').doc('rolesPermisos').set(payload, {merge:true}).catch(function(){});
  }catch(e){}
  // Propagar a usuarios existentes con ese rol
  try{
    var lista = (typeof _usersCache !== 'undefined' && Array.isArray(_usersCache)) ? _usersCache : [];
    var afectados = lista.filter(function(u){ return u.rol === rol; });
    afectados.forEach(function(u){
      var perms = Array.isArray(u.permisos) ? u.permisos.slice() : [];
      var i = perms.indexOf(modKey);
      if(dando && i < 0) perms.push(modKey);
      else if(!dando && i >= 0) perms.splice(i, 1);
      // Actualizar en Firestore
      db.collection('usuarios').doc(u.uid).update({ permisos: perms }).catch(function(){});
      // Actualizar cache local
      u.permisos = perms;
    });
    if(afectados.length){
      toast((dando?'Permiso concedido a ':'Permiso retirado de ')+rol+' ('+afectados.length+' usuario'+(afectados.length===1?'':'s')+')','success');
    } else {
      toast(dando?'Permiso concedido al rol '+rol:'Permiso retirado del rol '+rol,'success');
    }
  }catch(e){}
  // Repintar matriz para mostrar el nuevo estado visual
  if(S.usersTab === 'roles'){
    var host = $('users-tab-content');
    if(host) host.innerHTML = _usersTabRolesHTML();
    // Restaurar contadores de usuarios por rol
    Object.keys(ROLES_INFO).forEach(function(r){
      var count = (typeof _usersCache !== 'undefined' ? _usersCache : []).filter(function(u){return u.rol===r;}).length;
      var el = $('role-count-'+r.replace(/\s+/g,'_'));
      if(el) el.textContent = count;
    });
  }
}

// Cargar preset ROL_PERMISOS desde Firestore (si fue personalizado antes)
function _cargarRolesPermisosFirestore(){
  if(!db) return;
  try{
    db.collection('config').doc('rolesPermisos').get().then(function(doc){
      if(!doc || !doc.exists) return;
      var data = doc.data() || {};
      Object.keys(ROL_PERMISOS).forEach(function(r){
        if(Array.isArray(data[r])) ROL_PERMISOS[r] = data[r].slice();
      });
      // Si el usuario está viendo la pestaña Roles, refrescar
      if(S.usersTab === 'roles'){
        var host = $('users-tab-content');
        if(host) host.innerHTML = _usersTabRolesHTML();
      }
    }).catch(function(){});
  }catch(e){}
}

// TAB 1: Lista de usuarios
function _usersTabUsuariosHTML(){
  return '<div>'
    +'<div style="padding:0 0 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<div class="srch" style="flex:1;min-width:200px"><span class="srch-i"></span><input type="text" id="users-search" placeholder="Buscar por nombre, email o rol..." oninput="_usersFiltroUpdate()"></div>'
    + '<select class="fs" id="users-filter-rol" onchange="_usersFiltroUpdate()" style="width:auto;min-width:140px">'
    + '<option value="">Todos los roles</option>'
    + Object.keys(ROLES_INFO).map(function(r){return '<option value="'+r+'">'+r+'</option>';}).join('')
    + '</select>'
    +'</div>'
    + '<div id="users-list"><div style="padding:40px 20px;text-align:center;color:var(--ink3);font-size:12px">Cargando...</div></div>'
    +'</div>';
}

// TAB 2: Matriz de roles y permisos
function _usersTabRolesHTML(){
  var roles = Object.keys(ROLES_INFO);
  var grupos = {};
  MODULOS.forEach(function(m){
    if(!grupos[m.grupo]) grupos[m.grupo] = [];
    grupos[m.grupo].push(m);
  });

  var html = '<div class="card" style="margin-bottom:12px">'
    +'<div class="ch"><div><div class="ct">Matriz de Roles y Permisos</div><div class="cs">Define qué puede hacer cada rol en el sistema</div></div></div>'
    +'<div style="padding:14px 6px;overflow-x:auto"><table style="width:100%;border-collapse:separate;border-spacing:0">'
    // HEADER: roles con íconos y descripción
    +'<thead><tr>'
    + '<th style="text-align:left;padding:10px 14px;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink3);border-bottom:1px solid var(--rim);position:sticky;left:0;background:var(--surf);z-index:2;min-width:140px">Módulo</th>'
    + roles.map(function(r){
         var info = ROLES_INFO[r];
         var count = ROL_PERMISOS[r] ? ROL_PERMISOS[r].filter(function(p){return p!=='perm_delete';}).length : 0;
         return '<th style="padding:10px 8px;text-align:center;border-bottom:1px solid var(--rim);min-width:100px">'
           +'<div style="display:flex;flex-direction:column;align-items:center;gap:3px">'
           + '<div style="width:32px;height:32px;border-radius:9px;background:'+info.color+'22;color:'+info.color+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">'+info.icon+'</div>'
           + '<div style="font-size:11px;font-weight:800;color:var(--ink)">'+r+'</div>'
           + '<div style="font-size:9.5px;color:var(--ink3);font-weight:600">'+count+' módulos</div>'
           +'</div></th>';
       }).join('')
    +'</tr></thead>'
    +'<tbody>'
    // Una fila por grupo seguida por sus módulos
    +Object.keys(grupos).map(function(grupo){
       return '<tr><td colspan="'+(roles.length+1)+'" style="padding:14px 14px 6px 14px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--ink3);background:var(--surf2)">'+grupo+'</td></tr>'
         +grupos[grupo].map(function(m){
           return '<tr style="transition:background .12s" onmouseover="this.style.background=\'var(--surf2)\'" onmouseout="this.style.background=\'\'">'
             +'<td style="padding:9px 14px;font-size:12px;font-weight:600;color:var(--ink);position:sticky;left:0;background:inherit;border-right:1px solid var(--rim)">'+m.label+'</td>'
             +roles.map(function(r){
               var hasAccess = (ROL_PERMISOS[r]||[]).indexOf(m.id)>=0;
               var isAdmin = r==='Administrador';
               // El rol Administrador siempre tiene acceso a todo: no se puede editar.
               var clickAttr = isAdmin ? '' : ' onclick="toggleRolePerm(\''+r+'\',\''+m.id+'\')"';
               var cellCursor = isAdmin ? 'default' : 'pointer';
               var cellTitle = isAdmin ? 'Administrador siempre tiene acceso' : (hasAccess?'Quitar acceso':'Conceder acceso');
               return '<td style="text-align:center;padding:8px;cursor:'+cellCursor+'" title="'+cellTitle+'"'+clickAttr+'>'
                 +(hasAccess
                   ? '<div style="display:inline-flex;width:24px;height:24px;border-radius:6px;background:'+ROLES_INFO[r].color+';color:#fff;align-items:center;justify-content:center;font-size:13px;font-weight:900" title="Con acceso">✓</div>'
                   : '<div style="display:inline-flex;width:24px;height:24px;border-radius:6px;background:var(--surf2);color:var(--ink3);align-items:center;justify-content:center;font-size:12px;border:1px solid var(--rim)" title="Sin acceso">–</div>')
                 +'</td>';
             }).join('')
             +'</tr>';
         }).join('');
     }).join('')
    // Fila especial: acciones destructivas (perm_delete)
    +'<tr><td colspan="'+(roles.length+1)+'" style="padding:14px 14px 6px 14px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--red);background:var(--surf2)"> Acciones críticas</td></tr>'
    +'<tr>'
    + '<td style="padding:9px 14px;font-size:12px;font-weight:600;color:var(--ink);position:sticky;left:0;background:inherit;border-right:1px solid var(--rim)">Eliminar registros</td>'
    + roles.map(function(r){
        var hasDelete = (ROL_PERMISOS[r]||[]).indexOf('perm_delete')>=0;
        var isAdmin = r==='Administrador';
        var clickAttr = isAdmin ? '' : ' onclick="toggleRolePerm(\''+r+'\',\'perm_delete\')"';
        var cellCursor = isAdmin ? 'default' : 'pointer';
        var cellTitle = isAdmin ? 'Administrador siempre puede eliminar' : (hasDelete?'Quitar permiso de eliminar':'Conceder permiso de eliminar');
        return '<td style="text-align:center;padding:8px;cursor:'+cellCursor+'" title="'+cellTitle+'"'+clickAttr+'>'
          +(hasDelete
             ? '<div style="display:inline-flex;width:24px;height:24px;border-radius:6px;background:var(--red);color:#fff;align-items:center;justify-content:center;font-size:13px;font-weight:900">✓</div>'
             : '<div style="display:inline-flex;width:24px;height:24px;border-radius:6px;background:var(--surf2);color:var(--ink3);align-items:center;justify-content:center;font-size:12px;border:1px solid var(--rim)">–</div>')
          +'</td>';
      }).join('')
    +'</tr>'
    +'</tbody></table></div>'
    +'</div>'
    // Tarjetas descriptivas de cada rol
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px">'
    +roles.map(function(r){
        var info = ROLES_INFO[r];
        var count = ROL_PERMISOS[r] ? ROL_PERMISOS[r].filter(function(p){return p!=='perm_delete';}).length : 0;
        return '<div style="background:var(--surf);border:1px solid var(--rim);border-left:4px solid '+info.color+';border-radius:10px;padding:14px">'
          +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
          + '<div style="width:36px;height:36px;border-radius:9px;background:'+info.color+'22;color:'+info.color+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900">'+info.icon+'</div>'
          + '<div><div style="font-weight:800;font-size:14px">'+r+'</div><div style="font-size:10px;color:var(--ink3);font-weight:600">'+count+' módulos · <span id="role-count-'+r.replace(/\s+/g,'_')+'">0</span> usuarios</div></div>'
          +'</div>'
          +'<div style="font-size:11.5px;color:var(--ink2);line-height:1.5">'+info.desc+'</div>'
          +'</div>';
      }).join('')
    +'</div>';

  return html;
}

// TAB 3: Invitaciones pendientes
function _usersTabInvitacionesHTML(){
  return '<div class="card">'
    +'<div class="ch"><div><div class="ct">Invitaciones Pendientes</div><div class="cs">Usuarios invitados que aún no han aceptado</div></div></div>'
    +'<div id="invites-list" style="padding:0">'
    + '<div style="padding:40px 20px;text-align:center;color:var(--ink3);font-size:12px">Cargando...</div>'
    +'</div>'
    +'</div>';
}

// Global cache de usuarios para filtrado local
var _usersCache = [];

// Recargar datos de Firestore y actualizar UI
function usersReload(){
  if(typeof DB==='undefined' || !DB.getUsuarios){
    var ul=$('users-list'); if(ul) ul.innerHTML='<div style="padding:24px;text-align:center;color:var(--red);font-size:12px">Sin conexión a Firebase</div>';
    return;
  }
  // Cargar preset de roles personalizado (si existe)
  if(typeof _cargarRolesPermisosFirestore === 'function') _cargarRolesPermisosFirestore();
  DB.getUsuarios().then(function(lista){
    _usersCache = lista || [];
    // KPIs
    var total = _usersCache.length;
    var online = _usersCache.filter(function(u){
      if(!u.lastLogin) return false;
      var h = (Date.now() - new Date(u.lastLogin).getTime()) / 3600000;
      return h < 24;
    }).length;
    if($('users-kpi-total')) $('users-kpi-total').textContent = total;
    if($('users-kpi-online')) $('users-kpi-online').textContent = online;
    // Role counts (para las tarjetas de roles)
    Object.keys(ROLES_INFO).forEach(function(r){
      var count = _usersCache.filter(function(u){return u.rol===r;}).length;
      var el = $('role-count-'+r.replace(/\s+/g,'_'));
      if(el) el.textContent = count;
    });
    // Render según tab activo
    if(S.usersTab==='usuarios') _usersRenderList();
  }).catch(function(e){
    var ul = $('users-list');
    if(ul) ul.innerHTML='<div style="padding:24px;text-align:center;color:var(--red);font-size:12px">Error: '+(e.message||'sin conexión')+'</div>';
  });
  // Invitaciones
  if(typeof db!=='undefined' && db){
    db.collection('invitaciones').where('usado','==',false).get().then(function(snap){
      var count = snap.size;
      if($('users-kpi-pending')) $('users-kpi-pending').textContent = count;
      var badge = $('tab-inv-badge');
      if(badge){ badge.textContent = count; badge.style.display = count>0?'inline-block':'none'; }
      // Render invites tab si está activo
      if(S.usersTab==='invitaciones') _usersRenderInvites(snap);
    }).catch(function(){
      if($('users-kpi-pending')) $('users-kpi-pending').textContent = '0';
    });
  }
}

function _usersFiltroUpdate(){
  _usersRenderList();
}

function _usersRenderList(){
  var host = $('users-list');
  if(!host) return;
  var q = ($('users-search') && $('users-search').value || '').toLowerCase().trim();
  var rolFilter = ($('users-filter-rol') && $('users-filter-rol').value) || '';

  var list = _usersCache.filter(function(u){
    if(rolFilter && u.rol!==rolFilter) return false;
    if(!q) return true;
    var blob = ((u.nombre||'')+' '+(u.email||'')+' '+(u.rol||'')).toLowerCase();
    return blob.indexOf(q)>=0;
  });

  if(!list.length){
    host.innerHTML = '<div style="padding:50px 20px;text-align:center"><div style="font-size:32px;margin-bottom:10px;opacity:.4"></div>'
      +'<div style="font-size:13px;font-weight:700;color:var(--ink2);margin-bottom:4px">Sin usuarios</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-bottom:14px">'+(q||rolFilter?'No se encontraron usuarios con esos criterios':'Usa "Invitar Usuario" para agregar el primero')+'</div>'
      +(!q && !rolFilter ? '<button class="btn btn-p btn-sm" onclick="openInviteUser()">＋ Invitar al primero</button>':'')
      +'</div>';
    return;
  }

  // Ordenar: admin primero, luego por último login
  list.sort(function(a,b){
    if(a.rol==='Administrador' && b.rol!=='Administrador') return -1;
    if(b.rol==='Administrador' && a.rol!=='Administrador') return 1;
    var la = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
    var lb = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
    if(la !== lb) return lb - la;
    return (a.nombre||a.email||'').localeCompare(b.nombre||b.email||'');
  });

  host.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;padding:14px">'
    + list.map(function(u){
    var nombre = u.nombre || u.email || '?';
    var initials = nombre.split(' ').slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase();
    var info = ROLES_INFO[u.rol] || {color:'#888', icon:'?'};
    var esMio = S.currentUser && S.currentUser.uid === u.uid;
    var mods = (u.permisos||[]).filter(function(p){return p!=='perm_delete';}).length;
    var lastTxt = 'Nunca';
    var lastColor = 'var(--ink3)';
    var isOnline = false;
    if(u.lastLogin){
      var mins = Math.floor((Date.now() - new Date(u.lastLogin).getTime())/60000);
      if(mins < 5){ lastTxt='En línea'; lastColor='var(--green)'; isOnline=true; }
      else if(mins < 60){ lastTxt='hace '+mins+'m'; lastColor='var(--ink2)'; }
      else if(mins < 1440){ lastTxt='hace '+Math.floor(mins/60)+'h'; lastColor='var(--ink3)'; }
      else if(mins < 10080){ lastTxt='hace '+Math.floor(mins/1440)+'d'; lastColor='var(--ink3)'; }
      else lastTxt = new Date(u.lastLogin).toLocaleDateString('es-VE');
    }

    return '<div class="card" onclick="openUserPanel(\''+u.uid+'\')" style="cursor:pointer;padding:14px 16px">'
      // Avatar + nombre
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
        +'<div style="position:relative;flex-shrink:0">'
          +'<div style="width:38px;height:38px;border-radius:50%;background:'+info.color+';display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff">'+initials+'</div>'
          +(isOnline?'<div style="position:absolute;bottom:1px;right:1px;width:9px;height:9px;border-radius:50%;background:var(--green);border:2px solid var(--surf)"></div>':'')
        +'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-weight:800;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
            +nombre+(esMio?' <span style="background:var(--gs);color:var(--p1);font-size:8.5px;font-weight:800;padding:1px 5px;border-radius:4px;vertical-align:middle">TÚ</span>':'')
          +'</div>'
          +'<div style="font-size:10.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">'+(u.email||'')+'</div>'
        +'</div>'
      +'</div>'
      // Stats fila
      +'<div style="display:flex;gap:10px;margin-bottom:10px;font-size:11px">'
        +'<div style="flex:1">'
          +'<div style="color:var(--ink3);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">'+(u.cargo?'Cargo':'Rol')+'</div>'
          +'<div style="font-weight:800;color:'+info.color+'">'+info.icon+' '+String(u.cargo||u.rol||'—').replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div>'
          +(u.cargo?'<div style="font-size:9.5px;color:var(--ink3);margin-top:1px">permisos: '+String(u.rol||'—').replace(/</g,'&lt;')+'</div>':'')
        +'</div>'
        +'<div style="flex:1;text-align:right">'
          +'<div style="color:var(--ink3);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Último acceso</div>'
          +'<div style="font-weight:700;color:'+lastColor+'">'+lastTxt+'</div>'
        +'</div>'
      +'</div>'
      // Módulos bar
      +'<div style="display:flex;align-items:center;gap:6px;padding-top:8px;border-top:1px solid var(--rim2)">'
        +'<div style="flex:1;height:4px;background:var(--rim);border-radius:2px;overflow:hidden">'
          +'<div style="height:100%;width:'+Math.round(mods/20*100)+'%;background:'+info.color+';border-radius:2px"></div>'
        +'</div>'
        +'<span style="font-size:10px;font-weight:700;color:var(--ink3);flex-shrink:0">'+mods+' módulos</span>'
        +'<span style="font-size:14px;color:var(--ink3);flex-shrink:0">›</span>'
      +'</div>'
    +'</div>';
  }).join('') + '</div>';
}

function _usersRenderInvites(snap){
  var host = $('invites-list');
  if(!host) return;
  if(!snap || snap.empty){
    host.innerHTML = '<div style="padding:50px 20px;text-align:center"><div style="font-size:32px;margin-bottom:10px;opacity:.4">️</div>'
      +'<div style="font-size:13px;font-weight:700;color:var(--ink2);margin-bottom:4px">Sin invitaciones pendientes</div>'
      +'<div style="font-size:11px;color:var(--ink3);margin-bottom:14px">Todas las invitaciones que envíes aparecerán aquí hasta que sean aceptadas</div>'
      +'<button class="btn btn-p btn-sm" onclick="openInviteUser()">＋ Enviar nueva invitación</button>'
      +'</div>';
    return;
  }

  host.innerHTML = snap.docs.map(function(d){
    var inv = d.data();
    var info = ROLES_INFO[inv.rol] || {color:'#888',icon:'?'};
    var age = inv.createdAt ? Math.floor((Date.now()-new Date(inv.createdAt).getTime())/86400000) : 0;
    var ageTxt = age===0 ? 'hoy' : age===1 ? 'ayer' : 'hace '+age+' días';
    var isOld = age >= 7;
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--rim)">'
      +'<div style="width:38px;height:38px;border-radius:50%;background:'+info.color+'22;color:'+info.color+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex-shrink:0">'+info.icon+'</div>'
      +'<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+inv.email+'</div>'
      + '<div style="font-size:11px;color:var(--ink3)">Invitado como <b style="color:'+info.color+'">'+inv.rol+'</b> · '+(inv.permisos||[]).length+' módulos · <span style="color:'+(isOld?'var(--amber)':'var(--ink3)')+'">'+ageTxt+'</span></div>'
      +'</div>'
      +'<button class="btn btn-g btn-xs" onclick="copiarLink(\''+d.id+'\')">Copiar link</button>'
      +'<button class="btn btn-d btn-xs" onclick="revocarInvitacion(\''+d.id+'\')">Revocar</button>'
      +'</div>';
  }).join('');
}

function revocarInvitacion(token){
  if(!confirm('¿Revocar esta invitación? El link dejará de funcionar.')) return;
  if(!db) return;
  db.collection('invitaciones').doc(token).delete()
    .then(function(){ toast('Invitación revocada','info'); usersReload(); })
    .catch(function(e){ toast('Error: '+e.message,'error'); });
}

// ── Panel lateral de detalle del usuario ──
function openUserPanel(uid){
  var u = _usersCache.find(function(x){return x.uid===uid;});
  if(!u){ toast('Usuario no encontrado','error'); return; }

  var info = ROLES_INFO[u.rol] || {color:'#2563EB', icon:'?', desc:'Sin descripción'};
  var esMio = !!(S.currentUser && S.currentUser.uid === uid);
  var nombre = String(u.nombre || u.email || 'Sin nombre');
  var initials = nombre.split(' ').slice(0,2).map(function(w){return (w[0]||'').toUpperCase();}).join('') || '?';

  var panel = document.getElementById('user-side-panel');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'user-side-panel';
    panel.className = 'user-panel';
    document.body.appendChild(panel);
  }
  var bd = document.getElementById('user-panel-backdrop');
  if(!bd){
    bd = document.createElement('div');
    bd.id = 'user-panel-backdrop';
    bd.className = 'user-panel-backdrop';
    bd.addEventListener('click', closeUserPanel);
    document.body.appendChild(bd);
  }
  while(panel.firstChild) panel.removeChild(panel.firstChild);

  function el(tag, opts){
    var e = document.createElement(tag);
    if(!opts) return e;
    if(opts.cls) e.className = opts.cls;
    if(opts.text != null) e.textContent = opts.text;
    if(opts.html != null) e.innerHTML = opts.html;
    if(opts.style) { for(var k in opts.style) e.style[k] = opts.style[k]; }
    if(opts.onclick) e.addEventListener('click', opts.onclick);
    if(opts.title) e.title = opts.title;
    if(opts.ariaLabel) e.setAttribute('aria-label', opts.ariaLabel);
    return e;
  }

  // ─── HERO (claro, sin gradiente oscuro) ───
  var hero = el('div', { cls:'up-hero' });
  // Borde de acento superior del color del rol
  hero.style.borderTop = '3px solid ' + info.color;

  var btnClose = el('button', { cls:'up-close', text:'✕', ariaLabel:'Cerrar', onclick: closeUserPanel });
  hero.appendChild(btnClose);

  var heroRow = el('div', { cls:'up-hero-row' });
  var avatar = el('div', { cls:'up-avatar', text:initials });
  avatar.style.background = info.color;
  heroRow.appendChild(avatar);

  var heroInfo = el('div', { cls:'up-hero-info' });
  var nameDiv = el('div', { cls:'up-hero-name' });
  nameDiv.textContent = nombre;
  if(esMio){
    var tag = el('span', { cls:'up-mine-tag', text:'TÚ' });
    nameDiv.appendChild(document.createTextNode(' '));
    nameDiv.appendChild(tag);
  }
  heroInfo.appendChild(nameDiv);
  heroInfo.appendChild(el('div', { cls:'up-hero-email', text: u.email || 'sin email' }));

  var roleBadge = el('div', { cls:'up-hero-role' });
  roleBadge.style.background = info.color + '18';
  roleBadge.style.color = info.color;
  roleBadge.appendChild(el('span', { cls:'up-role-icon', text: info.icon }));
  roleBadge.appendChild(document.createTextNode(' '+(u.rol || 'Sin rol')));
  heroInfo.appendChild(roleBadge);

  heroRow.appendChild(heroInfo);
  hero.appendChild(heroRow);
  panel.appendChild(hero);

  // ─── BODY ───
  var body = el('div', { cls:'up-body' });

  // Estado y último acceso
  var estadoTxt = 'Activo', estadoColor = 'var(--green)', estadoIcon = '✓';
  if(u.suspendido){
    estadoTxt = 'Suspendido'; estadoColor = 'var(--red)'; estadoIcon = '⊘';
  } else if(u.demoExpira){
    var ahora = Date.now();
    var expira = new Date(u.demoExpira).getTime();
    if(expira > ahora){
      var horasRest = Math.floor((expira-ahora)/3600000);
      var minsRest = Math.floor(((expira-ahora)%3600000)/60000);
      estadoTxt = 'Demo · '+horasRest+'h '+minsRest+'m'; estadoColor = 'var(--amber)'; estadoIcon = '⏱';
    } else { estadoTxt = 'Demo expirado'; estadoColor = 'var(--red)'; estadoIcon = '⊘'; }
  }

  var lastTxt = 'Nunca', lastColor = 'var(--ink3)';
  if(u.lastLogin){
    var d = new Date(u.lastLogin);
    var mins = Math.floor((Date.now()-d.getTime())/60000);
    if(mins < 5){ lastTxt='En línea ahora'; lastColor='var(--green)'; }
    else if(mins < 60){ lastTxt='hace '+mins+' min'; lastColor='var(--ink2)'; }
    else if(mins < 1440){ lastTxt='hace '+Math.floor(mins/60)+'h'; lastColor='var(--ink2)'; }
    else lastTxt = d.toLocaleDateString('es-VE',{day:'2-digit',month:'short',year:'2-digit'});
  }

  var perms = Array.isArray(u.permisos) ? u.permisos : [];
  var permCount = perms.filter(function(p){return p!=='perm_delete';}).length;

  var stats = el('div', { cls:'up-stats' });
  function addStat(label, value, color){
    var s = el('div', { cls:'up-stat' });
    s.appendChild(el('div', { cls:'up-stat-l', text:label }));
    var v = el('div', { cls:'up-stat-v', text:value });
    if(color) v.style.color = color;
    s.appendChild(v);
    stats.appendChild(s);
  }
  addStat('Estado', estadoIcon+' '+estadoTxt, estadoColor);
  addStat('Último acceso', lastTxt, lastColor);
  addStat('Módulos', permCount+' / '+MODULOS.length, info.color);
  body.appendChild(stats);

  // Comisiones (si aplica)
  if(u.comisiones && u.comisiones.activo){
    var comV = u.comisiones.venta || {tipo:'fijo',valor:5};
    var comC = u.comisiones.cobranza || {tipo:'fijo',valor:1};
    var ventaLbl = comV.tipo === 'porc' ? comV.valor+'% del precio' : '$'+comV.valor+' fijos';
    var cobroLbl = comC.tipo === 'porc' ? comC.valor+'% del pago' : '$'+comC.valor+' fijos';
    var saldoDebido = 0;
    try{ if(typeof _comGetSaldo === 'function'){ saldoDebido = _comGetSaldo(u).saldo; } }catch(e){}
    var secCom = el('div', { cls:'up-section' });
    var comCard = el('div', { style:{ background:'rgba(0,184,118,.07)', border:'1px solid rgba(0,184,118,.2)', borderRadius:'9px', padding:'10px 12px' } });
    var comHd = el('div', { style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' } });
    comHd.appendChild(el('div', { text:'COMISIONES ACTIVAS', style:{ fontSize:'9.5px', fontWeight:'800', color:'var(--green)', letterSpacing:'.5px', textTransform:'uppercase' } }));
    if(saldoDebido > 0.01){
      comHd.appendChild(el('div', { text:'Debe: $'+saldoDebido.toFixed(2), style:{ fontSize:'12px', fontWeight:'800', color:'var(--green)', fontFamily:'var(--fd)' } }));
    }
    comCard.appendChild(comHd);
    comCard.innerHTML += '<div style="font-size:11px;color:var(--ink2)">Venta: <b>'+ventaLbl+'</b> · Cobro: <b>'+cobroLbl+'</b></div>';
    var comBtn = el('button', { cls:'btn btn-p btn-xs', text:'Ver comisiones →', style:{ marginTop:'8px', width:'100%' },
      onclick: function(){ closeUserPanel(); nav('comisiones'); }
    });
    comCard.appendChild(comBtn);
    secCom.appendChild(comCard);
    body.appendChild(secCom);
  }

  // ── ACCIONES ──
  var secActions = el('div', { cls:'up-section' });
  secActions.appendChild(el('div', { cls:'up-section-title', text:'ACCIONES' }));
  var actionsCt = el('div', { cls:'up-actions' });

  function addAction(icon, title, desc, onClick){
    var btn = el('button', { cls:'up-action-btn', onclick: onClick });
    var ic = el('div', { cls:'up-action-ic' });
    ic.innerHTML = icon;
    btn.appendChild(ic);
    var textWrap = el('div', { cls:'up-action-tx' });
    textWrap.appendChild(el('div', { cls:'up-action-t', text:title }));
    textWrap.appendChild(el('div', { cls:'up-action-d', text:desc }));
    btn.appendChild(textWrap);
    btn.innerHTML += '<span style="color:#8a92b2;font-size:16px;margin-left:auto;padding-left:8px">›</span>';
    actionsCt.appendChild(btn);
  }

  var iconShield = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  var iconUser   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var iconMail   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>';
  var iconLink   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  var iconPause  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8980a" stroke-width="2.2" stroke-linecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  var iconPlay   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00b876" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5,3 19,12 5,21"/></svg>';

  var iconEdit   = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
  addAction(iconEdit,   'Editar datos personales', 'Cédula, género, cumpleaños, contacto, redes', function(){ closeUserPanel(); editarPerfilPersonal(uid); });
  addAction(iconShield, 'Editar permisos', 'Cambiar módulos con acceso', function(){ closeUserPanel(); editarUsuario(uid); });
  addAction(iconUser,   'Cambiar rol', 'Reasignar a otro rol', function(){ closeUserPanel(); cambiarRolUsuario(uid); });
  if(u.email){
    addAction(iconMail, 'Email de reset', 'El usuario recibirá un correo', function(){ closeUserPanel(); cambiarPasswordUsuario(uid); });
  }
  addAction(iconLink, 'Link de invitación', 'Copiar enlace para reenviar', function(){ closeUserPanel(); copiarInvitacionUsuario(uid); });
  if(!esMio){
    var suspIc = u.suspendido ? iconPlay : iconPause;
    addAction(suspIc,
              u.suspendido?'Reactivar usuario':'Suspender usuario',
              u.suspendido?'Permitir acceso de nuevo':'Bloquear sin eliminar',
              function(){ closeUserPanel(); toggleSuspenderUsuario(uid); });
  }

  secActions.appendChild(actionsCt);
  body.appendChild(secActions);

  // ── PERMISOS — chips compactos ──
  var secPerms = el('div', { cls:'up-section' });
  var permsTitleRow = el('div', { style:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'7px' } });
  permsTitleRow.appendChild(el('div', { cls:'up-section-title', style:{ margin:'0' }, text:'MÓDULOS CON ACCESO' }));
  permsTitleRow.appendChild(el('div', { text: permCount+' de '+MODULOS.length, style:{ fontSize:'10px', fontWeight:'700', color: info.color } }));
  secPerms.appendChild(permsTitleRow);

  var chipsWrap = el('div', { cls:'up-perms-grid' });
  perms.filter(function(p){ return p !== 'perm_delete'; }).forEach(function(pId){
    var mod = MODULOS.find(function(m){ return m.id === pId; });
    var lbl = mod ? mod.label : pId;
    var chip = el('span', { cls:'up-perm-chip has', text: lbl });
    chip.style.borderColor = info.color + '40';
    chip.style.background = info.color + '0f';
    chip.style.color = info.color;
    chipsWrap.appendChild(chip);
  });
  if(!permCount){
    chipsWrap.appendChild(el('span', { text:'Sin módulos asignados', style:{ fontSize:'11.5px', color:'var(--ink3)', fontStyle:'italic' } }));
  }
  secPerms.appendChild(chipsWrap);
  body.appendChild(secPerms);

  // ── LOG DE ACTIVIDAD ──
  var secLog = el('div', { cls:'up-section' });
  secLog.appendChild(el('div', { cls:'up-section-title', text:'ACTIVIDAD RECIENTE' }));

  var nombreLow = nombre.toLowerCase();
  // Pagos registrados por este usuario
  var pagosUser = (S.pagos||[]).filter(function(p){
    return !p.eliminado && (p.cobrador||'').toLowerCase() === nombreLow;
  }).sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); }).slice(0,5);
  // Créditos creados por este usuario
  var credsUser = (S.creds||[]).filter(function(c){
    return !c.eliminado && (c.creadoPor||'').toLowerCase() === nombreLow;
  }).sort(function(a,b){ return (b.fecha||b.creadoEn||'').localeCompare(a.fecha||a.creadoEn||''); }).slice(0,3);

  // Combinar y ordenar
  var logItems = [];
  pagosUser.forEach(function(p){
    logItems.push({ tipo:'pago', fecha:p.fecha||'', desc:'Cobro '+p.cred+' — '+p.cli, monto:p.monto, estado:p.estado });
  });
  credsUser.forEach(function(c){
    logItems.push({ tipo:'credito', fecha:c.fecha||c.creadoEn||'', desc:'Crédito '+c.id+' — '+c.cli, monto:c.total, modelo:c.modelo });
  });
  logItems.sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); });
  logItems = logItems.slice(0,7);

  if(!logItems.length){
    secLog.appendChild(el('div', { text:'Sin actividad registrada para este usuario', style:{ fontSize:'11.5px', color:'var(--ink3)', fontStyle:'italic', padding:'8px 0' } }));
  } else {
    var logWrap = el('div', { style:{ background:'var(--surf)', border:'1px solid var(--rim)', borderRadius:'10px', padding:'4px 12px' } });
    logItems.forEach(function(it){
      var row = el('div', { cls:'up-log-row' });
      var icBg = it.tipo==='pago' ? 'var(--greens)' : 'var(--gs)';
      var icColor = it.tipo==='pago' ? 'var(--green)' : 'var(--p1)';
      var icTxt = it.tipo==='pago' ? '💵' : '📋';
      var ic = el('div', { cls:'up-log-ic', text:icTxt });
      ic.style.background = icBg;
      row.appendChild(ic);
      var txt = el('div', { style:{ flex:'1', minWidth:'0' } });
      txt.appendChild(el('div', { text: it.desc, style:{ fontWeight:'700', fontSize:'11.5px', color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' } }));
      var sub = el('div', { style:{ display:'flex', gap:'8px', marginTop:'1px', fontSize:'10.5px', color:'var(--ink3)' } });
      sub.appendChild(el('span', { text: it.fecha||'—' }));
      if(it.tipo==='pago' && it.estado){
        var sb = el('span', { text: it.estado });
        sb.style.color = it.estado==='confirmado' ? 'var(--green)' : 'var(--amber)';
        sub.appendChild(sb);
      }
      if(it.modelo) sub.appendChild(el('span', { text: it.modelo }));
      txt.appendChild(sub);
      row.appendChild(txt);
      if(it.monto){
        var m = el('div', { text:(it.tipo==='pago'?'+':'')+fmt(it.monto), style:{ fontFamily:'var(--fd)', fontWeight:'800', fontSize:'12px', color:it.tipo==='pago'?'var(--green)':'var(--ink3)', flexShrink:'0', paddingLeft:'6px' } });
        row.appendChild(m);
      }
      logWrap.appendChild(row);
    });
    secLog.appendChild(logWrap);
  }
  body.appendChild(secLog);

  // Descripción del rol (compacta al final)
  var secRol = el('div', { cls:'up-section' });
  var rolCard = el('div', { cls:'up-rol-card', style:{ borderLeft:'3px solid '+info.color, background:info.color+'08' } });
  rolCard.appendChild(el('div', { cls:'up-rol-title', text:'Sobre el rol '+(u.rol||'').toUpperCase(), style:{ color:info.color } }));
  rolCard.appendChild(el('div', { cls:'up-rol-desc', text:(info.desc || '') }));
  secRol.appendChild(rolCard);
  body.appendChild(secRol);

  panel.appendChild(body);

  // ─── FOOTER ───
  var footer = el('div', { cls:'up-footer' });
  if(!esMio && canDeleteAction()){
    var delBtn = el('button', { cls:'btn btn-d btn-sm', text:'Eliminar usuario', style:{ flex:'1' },
      onclick: function(){ closeUserPanel(); confirmarEliminarUsuario(uid, nombre); }
    });
    footer.appendChild(delBtn);
  }
  var closeBtn = el('button', { cls:'btn btn-g btn-sm', text:'Cerrar', style:{ flex:'1' }, onclick: closeUserPanel });
  footer.appendChild(closeBtn);
  panel.appendChild(footer);

  panel.classList.add('open');
  bd.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeUserPanel(){
  var panel = $('user-side-panel');
  var bd = $('user-panel-backdrop');
  if(panel) panel.classList.remove('open');
  if(bd) bd.classList.remove('open');
  document.body.style.overflow='';
}

// ── Cambiar rol ──
function cambiarRolUsuario(uid){
  var u = _usersCache.find(function(x){return x.uid===uid;});
  if(!u){ toast('Usuario no encontrado','error'); return; }
  if(!db){ toast('Requiere Firebase','error'); return; }

  setMicon('rol'); $('mtt').textContent='Cambiar Rol'; $('msb').textContent=u.nombre||u.email;
  $('modal-box').className='modal';

  var rolesHtml = Object.keys(ROLES_INFO).map(function(r){
    var info = ROLES_INFO[r];
    var count = (ROL_PERMISOS[r]||[]).filter(function(p){return p!=='perm_delete';}).length;
    var isCurrent = r === u.rol;
    return '<label data-cr="'+r+'" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:2px solid '+(isCurrent?info.color:'var(--rim)')+';border-radius:10px;cursor:pointer;background:'+(isCurrent?info.color+'0a':'var(--surf)')+';margin-bottom:6px;transition:all .15s">'
      +'<input type="radio" name="cr_rol" value="'+r+'" '+(isCurrent?'checked':'')+' style="margin-top:4px;accent-color:'+info.color+';flex-shrink:0">'
      +'<div style="width:30px;height:30px;border-radius:8px;background:'+info.color+'22;color:'+info.color+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0">'+info.icon+'</div>'
      +'<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:800;color:var(--ink)">'+r+' <span style="font-size:9.5px;color:var(--ink3);background:var(--surf2);padding:1px 6px;border-radius:5px;font-weight:700">'+count+' mód.</span>'+(isCurrent?' <span style="background:var(--gs);color:var(--p1);font-size:9px;font-weight:800;padding:2px 6px;border-radius:5px">ACTUAL</span>':'')+'</div>'
      + '<div style="font-size:11px;color:var(--ink3);line-height:1.4;margin-top:2px">'+info.desc+'</div>'
      +'</div></label>';
  }).join('');

  $('mbd').innerHTML = '<div style="padding:10px 12px;background:var(--ambers);border-radius:8px;margin-bottom:12px;font-size:11.5px;color:var(--ink2);line-height:1.5"> Al cambiar el rol, los permisos se <b>resetean</b> a los del nuevo rol.</div>'
    + '<div>'+rolesHtml+'</div>';

  S.saveFn = function(){
    var sel = document.querySelector('input[name="cr_rol"]:checked');
    if(!sel){ toast('Selecciona un rol','error'); return false; }
    var nuevoRol = sel.value;
    if(nuevoRol === u.rol){ toast('Ya tiene ese rol','info'); closeM(); return true; }
    var nuevosPerms = (ROL_PERMISOS[nuevoRol]||[]).slice();

    db.collection('usuarios').doc(uid).update({
      rol: nuevoRol,
      permisos: nuevosPerms
    }).then(function(){
      u.rol = nuevoRol;
      u.permisos = nuevosPerms;
      toast('Rol cambiado a '+nuevoRol+' ✓','success');
      closeM();
      usersReload();
    }).catch(function(e){
      toast('Error: '+e.message,'error');
    });
    return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Aplicar cambio</button>';
  $('ov').style.display='flex';
}

// ── Suspender / reactivar ──
function toggleSuspenderUsuario(uid){
  var u = _usersCache.find(function(x){return x.uid===uid;});
  if(!u){ toast('Usuario no encontrado','error'); return; }
  if(!db){ toast('Requiere Firebase','error'); return; }
  var nuevoEstado = !u.suspendido;
  var accion = nuevoEstado ? 'suspender' : 'reactivar';
  if(!confirm('¿Seguro que quieres '+accion+' a '+(u.nombre||u.email)+'?')) return;

  db.collection('usuarios').doc(uid).update({
    suspendido: nuevoEstado,
    suspendidoEn: nuevoEstado ? new Date().toISOString() : null,
    suspendidoPor: nuevoEstado ? ((S.currentUser&&S.currentUser.nombre)||'Admin') : null
  }).then(function(){
    u.suspendido = nuevoEstado;
    toast('Usuario '+(nuevoEstado?'suspendido':'reactivado')+' ✓','success');
    usersReload();
  }).catch(function(e){
    toast('Error: '+e.message,'error');
  });
}

// ── Cambiar contraseña ──
function cambiarPasswordUsuario(uid){
  var u = _usersCache.find(function(x){return x.uid===uid;});
  if(!u){ toast('Usuario no encontrado','error'); return; }

  setMicon('llave'); $('mtt').textContent='Cambiar Contraseña'; $('msb').textContent=u.nombre||u.email;
  $('modal-box').className='modal';
  $('mbd').innerHTML = '<div style="padding:10px 12px;background:var(--gs);border-radius:8px;margin-bottom:12px;font-size:11.5px;color:var(--ink2);line-height:1.5">'
    +'Establece una nueva contraseña para este usuario. El sistema le enviará un email con las nuevas credenciales.</div>'
    +'<div class="fg" style="margin-bottom:10px"><label>Nueva contraseña *</label><input class="fi" id="cp_new" type="password" placeholder="Mín. 6 caracteres" autocomplete="new-password"></div>'
    +'<div class="fg"><label>Confirmar contraseña *</label><input class="fi" id="cp_confirm" type="password" placeholder="Repetir la contraseña" autocomplete="new-password"></div>'
    +'<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">'
    +'<button type="button" class="btn btn-g btn-xs" onclick="_cpGen(8)">Generar 8 caracteres</button>'
    +'<button type="button" class="btn btn-g btn-xs" onclick="_cpGen(12)">Generar 12 caracteres</button>'
    +'</div>';

  S.saveFn = function(){
    var pw = ($('cp_new')&&$('cp_new').value)||'';
    var pc = ($('cp_confirm')&&$('cp_confirm').value)||'';
    if(pw.length < 6){ toast('La contraseña debe tener al menos 6 caracteres','error'); return false; }
    if(pw !== pc){ toast('Las contraseñas no coinciden','error'); return false; }
    if(!auth){
      toast('Firebase Auth no esta disponible. No se puede actualizar la contrasena.','error');
      return false;
    }

    // En el admin SDK del cliente no se pueden cambiar passwords de otros usuarios directamente.
    // Lo que hacemos es disparar "password reset email" que Firebase envía al usuario.
    if(auth.sendPasswordResetEmail && u.email){
      auth.sendPasswordResetEmail(u.email).then(function(){
        toast('Email de restablecimiento enviado a '+u.email,'success');
        closeM();
      }).catch(function(e){
        toast('Error: '+e.message,'error');
      });
    } else {
      toast('Proveedor de auth no soporta esta acción. Usa link de invitación.','error');
    }
    return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Enviar email de reset</button>';
  $('ov').style.display='flex';
}

function _cpGen(len){
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  var s = '';
  for(var i=0; i<len; i++) s += chars.charAt(Math.floor(Math.random()*chars.length));
  var newEl = $('cp_new'), cEl = $('cp_confirm');
  if(newEl){ newEl.value = s; newEl.type = 'text'; }
  if(cEl){ cEl.value = s; cEl.type = 'text'; }
  toast('Contraseña generada: '+s+' (cópiala antes de guardar)','info');
}

// ── Usuario DEMO con expiración ──
function openCreateDemoUser(){
  if(!db){ toast('Requiere Firebase activo','error'); return; }
  setMicon('reloj'); $('mtt').textContent='Crear Usuario Demo'; $('msb').textContent='Acceso temporal con expiración automática';
  $('modal-box').className='modal';

  var horasOpts = [1,2,3,4,5,6,7,8,9,10,11,12,24,48,72].map(function(h){
    var lbl = h<=12 ? h+' hora'+(h>1?'s':'') : (h/24)+' día'+(h>24?'s':'');
    return '<option value="'+h+'"'+(h===4?' selected':'')+'>'+lbl+'</option>';
  }).join('');

  var rolesOpts = Object.keys(ROLES_INFO).map(function(r){
    return '<option value="'+r+'"'+(r==='Vendedor'?' selected':'')+'>'+r+' — '+ROLES_INFO[r].desc.substring(0,50)+'...</option>';
  }).join('');

  $('mbd').innerHTML = '<div style="padding:12px 14px;background:linear-gradient(135deg,rgba(232,152,10,.1),rgba(232,152,10,.03));border:1px solid rgba(232,152,10,.3);border-radius:10px;margin-bottom:14px">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><span style="font-size:22px">⏱</span><div style="font-size:13px;font-weight:800;color:var(--amber)">Usuario de acceso temporal</div></div>'
    +'<div style="font-size:11.5px;color:var(--ink2);line-height:1.5">Crea un usuario que <b>expira automáticamente</b> después del tiempo seleccionado. Ideal para mostrar el sistema a prospectos, demostrar funcionalidades, o dar acceso puntual a consultores.</div>'
    +'</div>'

    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    +'<div class="fg"><label>Email *</label><input class="fi" id="du_email" type="email" placeholder="demo@ejemplo.com" autofocus></div>'
    +'<div class="fg"><label>Nombre</label><input class="fi" id="du_nombre" placeholder="Juan Pérez"></div>'
    +'</div>'

    +'<div class="fg" style="margin-bottom:10px"><label>Rol que tendrá durante el demo</label>'
    +'<select class="fs" id="du_rol">'+rolesOpts+'</select></div>'

    +'<div class="fg" style="margin-bottom:14px"><label>Duración del acceso</label>'
    +'<select class="fs" id="du_horas">'+horasOpts+'</select>'
    +'<div style="font-size:10.5px;color:var(--ink3);margin-top:4px">Después de este tiempo, el usuario no podrá iniciar sesión</div></div>'

    +'<div style="padding:10px 12px;background:var(--surf2);border-radius:9px;border:1px solid var(--rim)">'
    +'<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:var(--ink3);margin-bottom:6px">Vista previa</div>'
    +'<div id="du-preview" style="font-size:11.5px;color:var(--ink2);line-height:1.6"></div>'
    +'</div>';

  // Listener para actualizar preview
  function updatePreview(){
    var email = ($('du_email')&&$('du_email').value)||'(sin email)';
    var rol = ($('du_rol')&&$('du_rol').value)||'Vendedor';
    var horas = parseInt(($('du_horas')&&$('du_horas').value)||'4', 10);
    var expira = new Date(Date.now() + horas*3600000);
    var info = ROLES_INFO[rol]||{color:'#888',icon:'?'};
    var prev = $('du-preview');
    if(prev){
      prev.innerHTML = '• El usuario <b>'+email+'</b><br>'
        +'• Tendrá rol <span style="color:'+info.color+';font-weight:800">'+rol+'</span> ('+(ROL_PERMISOS[rol]||[]).filter(function(p){return p!=='perm_delete';}).length+' módulos)<br>'
        +'• Podrá iniciar sesión por <b>'+horas+' hora'+(horas!==1?'s':'')+'</b><br>'
        +'• Expira el <b>'+expira.toLocaleString('es-VE')+'</b><br>'
        +'• Después de expirar, se bloqueará automáticamente';
    }
  }
  ['du_email','du_rol','du_horas'].forEach(function(id){
    var el=$(id); if(el) el.addEventListener('input', updatePreview);
    if(el) el.addEventListener('change', updatePreview);
  });
  setTimeout(updatePreview, 50);

  S.saveFn = function(){
    var email = (($('du_email')&&$('du_email').value)||'').trim().toLowerCase();
    var nombre = (($('du_nombre')&&$('du_nombre').value)||'').trim();
    if(!email || !email.includes('@')){ toast('Email inválido','error'); return false; }
    var rol = ($('du_rol')&&$('du_rol').value)||'Vendedor';
    var horas = parseInt(($('du_horas')&&$('du_horas').value)||'4', 10);
    var expira = new Date(Date.now() + horas*3600000).toISOString();
    var permisos = (ROL_PERMISOS[rol]||[]).slice();

    var inviteToken = 'DEMO-'+Date.now()+'-'+_randomToken(16);
    var inviteLink = _buildInviteLink(inviteToken, email);

    showLoader('Creando acceso demo...','');
    DB.saveInvitacion(inviteToken, {
      token: inviteToken,
      email: email,
      nombre: nombre || 'Usuario Demo',
      rol: rol,
      permisos: permisos,
      creadoPor: (S.currentUser&&S.currentUser.nombre)||'Admin',
      creadoEn: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      usado: false,
      isDemo: true,
      demoHoras: horas,
      demoExpira: expira,
      inviteLink: inviteLink
    }).then(function(){
      hideLoader();
      closeM();
      if(typeof usersReload==='function') setTimeout(usersReload, 300);
      setTimeout(function(){ mostrarLinkInvitacion(inviteLink, email); }, 250);
      toast('Demo creado · Expira en '+horas+'h','success');
    }).catch(function(e){
      hideLoader();
      toast('Error: '+e.message,'error');
    });
    return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Crear acceso demo ⏱</button>';
  $('ov').style.display='flex';
}

// ══════════════════════════════════════════

function _buildInviteLink(token, email){
  var base = window.location.href.split('?')[0];
  var qs = '?invite=' + encodeURIComponent(token);
  if(email) qs += '&ie=' + encodeURIComponent(email);
  return base + qs;
}
function _randomToken(len){
  len = len || 32;
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  var out='';
  for(var i=0;i<len;i++) out += chars.charAt(Math.floor(Math.random()*chars.length));
  return out;
}
// ══════════════════════════════════════════
// GESTIÓN DE USUARIOS
// ══════════════════════════════════════════
function openInviteUser(){
  if(!db||!auth){ toast('Requiere Firebase activo para invitar usuarios','error'); return; }
  setMicon('user'); $('mtt').textContent='Invitar Nuevo Usuario'; $('msb').textContent='Elige un rol y envía la invitación';
  $('modal-box').className='modal modal-lg';

  function buildCheckboxes(presetPerms){
    // Agrupar por categoría
    var grupos = {};
    MODULOS.forEach(function(m){
      if(!grupos[m.grupo]) grupos[m.grupo] = [];
      grupos[m.grupo].push(m);
    });
    var html = '';
    Object.keys(grupos).forEach(function(g){
      html += '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--ink3);padding:0 8px 4px;letter-spacing:.5px">'+g+'</div>';
      html += grupos[g].map(function(m){
        var checked = presetPerms ? presetPerms.indexOf(m.id)>=0 : true;
        return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 8px;cursor:pointer;border-radius:6px;transition:background .1s" onmouseover="this.style.background=\'var(--surf2)\'" onmouseout="this.style.background=\'\'">'
          +'<input type="checkbox" value="'+m.id+'" '+(checked?'checked':'')+' style="accent-color:var(--p1);width:14px;height:14px"> '+m.label+'</label>';
      }).join('');
      html += '</div>';
    });
    // Extra: permiso destructivo
    html += '<div style="border-top:1px dashed var(--rim);padding-top:8px;margin-top:6px"><label style="display:flex;align-items:center;gap:8px;font-size:12px;padding:6px 8px;cursor:pointer;border-radius:6px;color:var(--red)" onmouseover="this.style.background=\'var(--reds)\'" onmouseout="this.style.background=\'\'">'
      +'<input type="checkbox" value="perm_delete" style="accent-color:var(--red);width:14px;height:14px"> Puede eliminar registros</label></div>';
    return html;
  }

  // Tarjetas de roles (selección visual)
  var rolesHtml = Object.keys(ROLES_INFO).map(function(r){
    var info = ROLES_INFO[r];
    var count = (ROL_PERMISOS[r]||[]).filter(function(p){return p!=='perm_delete';}).length;
    return '<label data-rol="'+r+'" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:2px solid var(--rim);border-radius:10px;cursor:pointer;background:var(--surf);transition:all .15s" onclick="_invSelectRol(\''+r+'\')">'
      +'<input type="radio" name="invu_rol_pick" value="'+r+'" style="margin-top:4px;accent-color:'+info.color+';flex-shrink:0">'
      +'<div style="width:32px;height:32px;border-radius:8px;background:'+info.color+'22;color:'+info.color+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;flex-shrink:0">'+info.icon+'</div>'
      +'<div style="flex:1;min-width:0">'
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px"><span style="font-size:13px;font-weight:800;color:var(--ink)">'+r+'</span><span style="font-size:9.5px;font-weight:700;color:var(--ink3);background:var(--surf2);padding:1px 6px;border-radius:5px">'+count+' mód.</span></div>'
      + '<div style="font-size:11px;color:var(--ink3);line-height:1.4">'+info.desc+'</div>'
      +'</div></label>';
  }).join('');

  $('mbd').innerHTML=''
    // Sección 1: Datos
    +'<div style="margin-bottom:16px">'
    + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--ink3);margin-bottom:8px">① Datos del usuario</div>'
    + '<div class="fg" style="margin-bottom:10px"><label>Email *</label><input class="fi" id="invu_email" type="email" placeholder="empleado@pagasi.com" autofocus></div>'
    + '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:10px">'
    + '<div class="fg"><label>Nombre completo</label><input class="fi" id="invu_nombre" placeholder="Nombre completo"></div>'
    + '<div class="fg"><label>🎂 Cumpleaños</label><input class="fi" id="invu_cumple" type="date" placeholder="dd/mm/aaaa"></div>'
    + '</div>'
    +'</div>'

    // Sección 2: Rol (tarjetas)
    +'<div style="margin-bottom:16px">'
    + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--ink3);margin-bottom:8px">② Rol del usuario</div>'
    + '<div id="invu_roles_cards" style="display:grid;grid-template-columns:1fr;gap:6px">'+rolesHtml+'</div>'
    + '<input type="hidden" id="invu_rol" value="Empleado">'
    +'</div>'

    // Sección 3: Permisos (personalizables)
    +'<div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
    + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--ink3)">③ Permisos específicos</div>'
    + '<button type="button" class="btn btn-g btn-xs" onclick="_invTogglePerms()">Personalizar</button>'
    + '</div>'
    + '<div id="invu_perms_preview" style="background:var(--surf2);border-radius:10px;padding:10px 14px;font-size:11.5px;color:var(--ink2);line-height:1.5">'
    + 'Al usuario se le asignarán automáticamente los permisos del rol <b id="invu_perms_role_name" style="color:var(--p1)">Empleado</b>. Toca "Personalizar" para ajustar módulo por módulo.'
    + '</div>'
    + '<div id="invu_perms_detail" style="display:none;background:var(--surf2);border:1px solid var(--rim);border-radius:10px;padding:10px;margin-top:6px">'
    + '<div id="inv_mod_list">'+buildCheckboxes(ROL_PERMISOS.Empleado||[])+'</div>'
    + '</div>'
    +'</div>';

  // Preseleccionar "Empleado" por defecto
  setTimeout(function(){
    var def = document.querySelector('label[data-rol="Empleado"]');
    if(def) _invSelectRol('Empleado');
  }, 60);

  S.saveFn=function(){
    var email=(($('invu_email')&&$('invu_email').value)||'').trim().toLowerCase();
    var nombre=(($('invu_nombre')&&$('invu_nombre').value)||'').trim();
    var cumple=(($('invu_cumple')&&$('invu_cumple').value)||'').trim();
    if(!email||!email.includes('@')){ toast('Ingresa un email válido','error'); return false; }
    var rol=($('invu_rol')&&$('invu_rol').value)||'Empleado';
    var permisos=[];
    // Si el panel de personalización está abierto, leer checkboxes; sino usar preset del rol
    var detailOpen = $('invu_perms_detail') && $('invu_perms_detail').style.display !== 'none';
    if(detailOpen){
      document.querySelectorAll('#inv_mod_list input[type=checkbox]:checked').forEach(function(cb){ permisos.push(cb.value); });
    } else {
      permisos = (ROL_PERMISOS[rol]||[]).slice();
    }

    var inviteToken = 'INV-'+Date.now()+'-'+_randomToken(18);
    var inviteLink = _buildInviteLink(inviteToken, email);

    showLoader('Guardando invitación...','');
    DB.saveInvitacion(inviteToken, {
      token: inviteToken,
      email: email,
      nombre: nombre || email,
      cumpleanos: cumple || '',
      rol: rol,
      permisos: permisos,
      creadoPor: (S.currentUser&&S.currentUser.nombre)||'Admin',
      creadoEn: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      usado: false,
      inviteLink: inviteLink
    }).then(function(){
      hideLoader();
      closeM();
      if(typeof usersReload==='function') setTimeout(usersReload, 300);
      // Mostrar modal con link inmediatamente
      setTimeout(function(){ mostrarLinkInvitacion(inviteLink, email); }, 250);
    }).catch(function(e){
      hideLoader();
      toast('Error guardando invitación: '+(e.message||e),'error');
    });
    return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Crear invitación →</button>';
  $('ov').style.display='flex';
}

// Seleccionar rol en el modal de invitar (tarjeta activa)
function _invSelectRol(rol){
  var hidden = $('invu_rol');
  if(hidden) hidden.value = rol;
  // Marcar radio
  var r = document.querySelector('input[name="invu_rol_pick"][value="'+rol+'"]');
  if(r) r.checked = true;
  // Resaltar tarjeta activa
  document.querySelectorAll('#invu_roles_cards label').forEach(function(lbl){
    var isActive = lbl.getAttribute('data-rol') === rol;
    var info = ROLES_INFO[lbl.getAttribute('data-rol')] || {color:'#888'};
    lbl.style.borderColor = isActive ? info.color : 'var(--rim)';
    lbl.style.background = isActive ? info.color+'0a' : 'var(--surf)';
    lbl.style.boxShadow = isActive ? '0 2px 12px '+info.color+'20' : 'none';
  });
  // Actualizar descripción en preview
  var pRole = $('invu_perms_role_name');
  if(pRole) pRole.textContent = rol;
  // Actualizar checkboxes del detail (por si usuario lo abre después)
  var modList = $('inv_mod_list');
  if(modList){
    var preset = (ROL_PERMISOS[rol] || []);
    modList.querySelectorAll('input[type=checkbox]').forEach(function(cb){
      cb.checked = preset.indexOf(cb.value) >= 0;
    });
  }
}

// Toggle entre preview de permisos y detalle editable
function _invTogglePerms(){
  var preview = $('invu_perms_preview');
  var detail = $('invu_perms_detail');
  if(!preview || !detail) return;
  var isOpen = detail.style.display !== 'none';
  if(isOpen){
    detail.style.display = 'none';
    preview.style.display = '';
  } else {
    detail.style.display = '';
    preview.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// EDITAR DATOS PERSONALES DE OTRO USUARIO (admin)
// Espeja Mi Perfil: 14 campos. Solo admins pueden hacerlo.
// ═══════════════════════════════════════════════════════════════
function editarPerfilPersonal(uid){
  if(!db){ toast('Requiere Firebase activo','error'); return; }
  if(typeof isAdminUser==='function' && !isAdminUser()){ toast('Solo los administradores pueden editar perfiles ajenos','error'); return; }
  db.collection('usuarios').doc(uid).get().then(function(doc){
    if(!doc.exists){ toast('Usuario no encontrado','error'); return; }
    var u = doc.data() || {};
    function esc(s){ return String(s==null?'':s).replace(/"/g,'&quot;'); }
    setMicon('editar');
    $('mtt').textContent = 'Editar datos personales';
    $('msb').textContent = u.nombre || u.email || uid;
    $('modal-box').className = 'modal';
    $('mbd').innerHTML =
      '<div style="font-size:11.5px;color:var(--ink3);background:rgba(37,99,235,.06);border-left:3px solid var(--p1);padding:9px 13px;border-radius:8px;margin-bottom:14px;line-height:1.5">'
      +'Estás editando los datos de <b>'+esc(u.nombre||u.email)+'</b>. Los cambios quedan registrados en la bitácora.'
      +'</div>'
      // ─── Personales ───
      +'<div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px">Datos personales</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;margin-bottom:14px">'
        +'<div class="fg"><label>Nombre completo</label><input class="fi" id="ep_nombre" type="text" value="'+esc(u.nombre)+'"></div>'
        +'<div class="fg"><label>Cédula</label><input class="fi" id="ep_cedula" type="text" value="'+esc(u.cedula)+'" placeholder="V-12345678"></div>'
        +'<div class="fg"><label>Género</label>'
          +'<select class="fs" id="ep_genero">'
          +'<option value=""'+(!u.genero?' selected':'')+'>— Selecciona —</option>'
          +'<option value="M"'+(u.genero==='M'?' selected':'')+'>Masculino</option>'
          +'<option value="F"'+(u.genero==='F'?' selected':'')+'>Femenino</option>'
          +'</select></div>'
        +'<div class="fg"><label>Cumpleaños</label><input class="fi" id="ep_cumple" type="date" value="'+esc(u.cumpleanos||u.fechaNacimiento)+'"></div>'
        +'<div class="fg"><label>Estado civil</label>'
          +'<select class="fs" id="ep_estadocivil">'
          +'<option value=""'+(!u.estadoCivil?' selected':'')+'>— Selecciona —</option>'
          +'<option value="soltero"'+(u.estadoCivil==='soltero'?' selected':'')+'>Soltero/a</option>'
          +'<option value="casado"'+(u.estadoCivil==='casado'?' selected':'')+'>Casado/a</option>'
          +'<option value="union"'+(u.estadoCivil==='union'?' selected':'')+'>Unión estable</option>'
          +'<option value="divorciado"'+(u.estadoCivil==='divorciado'?' selected':'')+'>Divorciado/a</option>'
          +'<option value="viudo"'+(u.estadoCivil==='viudo'?' selected':'')+'>Viudo/a</option>'
          +'</select></div>'
        +'<div class="fg"><label>Sede / Oficina</label><input class="fi" id="ep_sede" type="text" value="'+esc(u.sede)+'" placeholder="EK Bello Monte, Boleita..."></div>'
      +'</div>'
      // ─── Contacto ───
      +'<div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px">Contacto</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;margin-bottom:14px">'
        +'<div class="fg"><label>Teléfono</label><input class="fi" id="ep_tel" type="tel" value="'+esc(u.tel||u.telefono)+'" placeholder="+58 414 ..."></div>'
        +'<div class="fg"><label>Tel. alternativo</label><input class="fi" id="ep_tel2" type="tel" value="'+esc(u.tel2)+'" placeholder="Casa o familiar"></div>'
        +'<div class="fg" style="grid-column:1 / -1"><label>Dirección</label><input class="fi" id="ep_direccion" type="text" value="'+esc(u.direccion)+'"></div>'
        +'<div class="fg" style="grid-column:1 / -1"><label>Contacto de emergencia</label><input class="fi" id="ep_emergencia" type="text" value="'+esc(u.emergencia)+'" placeholder="Nombre y teléfono"></div>'
      +'</div>'
      // ─── Redes ───
      +'<div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin-bottom:8px">Redes sociales</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start">'
        +'<div class="fg"><label>Instagram</label><input class="fi" id="ep_instagram" type="text" value="'+esc(u.instagram)+'" placeholder="@tuusuario"></div>'
        +'<div class="fg"><label>Facebook</label><input class="fi" id="ep_facebook" type="text" value="'+esc(u.facebook)+'"></div>'
        +'<div class="fg"><label>TikTok</label><input class="fi" id="ep_tiktok" type="text" value="'+esc(u.tiktok)+'" placeholder="@tuusuario"></div>'
        +'<div class="fg"><label>X (Twitter)</label><input class="fi" id="ep_twitter" type="text" value="'+esc(u.twitter)+'" placeholder="@tuusuario"></div>'
        +'<div class="fg" style="grid-column:1 / -1"><label>LinkedIn</label><input class="fi" id="ep_linkedin" type="text" value="'+esc(u.linkedin)+'" placeholder="linkedin.com/in/tuusuario"></div>'
      +'</div>';

    S.saveFn = function(){
      function val(id){ var el = $(id); return el ? (el.value||'') : ''; }
      var update = {
        nombre: val('ep_nombre').trim(),
        cedula: val('ep_cedula').trim(),
        genero: val('ep_genero').trim(),
        cumpleanos: val('ep_cumple').trim(),
        estadoCivil: val('ep_estadocivil').trim(),
        sede: val('ep_sede').trim(),
        tel: val('ep_tel').trim(),
        tel2: val('ep_tel2').trim(),
        direccion: val('ep_direccion').trim(),
        emergencia: val('ep_emergencia').trim(),
        instagram: val('ep_instagram').trim().replace(/^@/,''),
        facebook: val('ep_facebook').trim(),
        tiktok: val('ep_tiktok').trim().replace(/^@/,''),
        twitter: val('ep_twitter').trim().replace(/^@/,''),
        linkedin: val('ep_linkedin').trim(),
        actualizadoEn: new Date().toISOString(),
        actualizadoPor: (S.currentUser&&S.currentUser.nombre)||'Admin'
      };
      db.collection('usuarios').doc(uid).set(update, {merge:true}).then(function(){
        // Sincronizar caché
        try {
          if(typeof _usersCache !== 'undefined' && Array.isArray(_usersCache)){
            var idx = _usersCache.findIndex(function(x){return x && x.uid===uid;});
            if(idx>=0) Object.assign(_usersCache[idx], update);
          }
          if(S._wtUsers){
            var idx2 = S._wtUsers.findIndex(function(x){return x && x.uid===uid;});
            if(idx2>=0) Object.assign(S._wtUsers[idx2], update);
          }
        } catch(e){}
        if(typeof logActividad==='function') logActividad('usuario_editado','users',uid,{nombre:update.nombre, campos:'datos personales (admin)'});
        toast('✓ Datos personales actualizados','success');
        closeM(); nav('users');
      }).catch(function(err){
        toast('Error: '+(err.message||err),'error');
      });
      return false; // Manejar cierre manualmente para esperar el save
    };
    $('mft').innerHTML = '<button class="btn btn-g" onclick="closeM()">Cancelar</button>'
                       + '<button class="btn btn-p" onclick="saveM()">Guardar cambios</button>';
    $('ov').style.display = 'flex';
  }).catch(function(e){ toast('Error: '+e.message,'error'); });
}
window.editarPerfilPersonal = editarPerfilPersonal;

function editarUsuario(uid){
  if(!db){ toast('Requiere Firebase activo','error'); return; }
  db.collection('usuarios').doc(uid).get().then(function(doc){
    if(!doc.exists){ toast('Usuario no encontrado','error'); return; }
    var u=doc.data();
    setMicon('editar'); $('mtt').textContent='Editar Permisos'; $('msb').textContent=u.nombre||u.email;
    $('modal-box').className='modal';
    var modCheckboxes=Object.keys(PGL).map(function(key){
      var checked=(u.permisos||[]).includes(key);
      return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 0;cursor:pointer">'
        +'<input type="checkbox" value="'+key+'" '+(checked?'checked':'')+' style="accent-color:var(--p1)"> '+PGL[key]+'</label>';
    }).join('') + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 0;cursor:pointer"><input type="checkbox" value="perm_delete" '+(((u.permisos||[]).includes('perm_delete'))?'checked':'')+' style="accent-color:var(--p1)"> '+EXTRA_PERMS.perm_delete+'</label>';
    // Sección Comisiones
    var comActivo = !!(u.comisiones && u.comisiones.activo);
    var comV = (u.comisiones && u.comisiones.venta) || {tipo:'fijo',valor:5};
    var comC = (u.comisiones && u.comisiones.cobranza) || {tipo:'fijo',valor:1};
    var comSection = ''
      + '<div style="margin-top:14px;padding:12px;background:var(--gs);border-radius:10px;border:1px solid var(--rim2)">'
      + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12.5px;font-weight:700"><input type="checkbox" id="eu_com_activo" '+(comActivo?'checked':'')+' onchange="_euComToggle()" style="accent-color:var(--green);transform:scale(1.15)"> Gana comisiones</label>'
      + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px;line-height:1.5">Cuando se active, este usuario aparecerá en el módulo <b>Comisiones</b> y se le calcularán los pagos por sus ventas y cobranzas.</div>'
      + '<div id="eu_com_box" style="margin-top:12px;display:'+(comActivo?'block':'none')+'">'
      + '<div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">Comisión por venta (al crear crédito)</div>'
      + '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px;margin-bottom:11px">'
      + '<select class="fs" id="eu_com_v_tipo" style="min-width:130px"><option value="fijo" '+(comV.tipo==='fijo'?'selected':'')+'>Monto fijo ($)</option><option value="porc" '+(comV.tipo==='porc'?'selected':'')+'>Porcentaje (%)</option></select>'
      + '<input class="fi" id="eu_com_v_val" type="number" step="0.01" min="0" value="'+(comV.valor||5)+'" placeholder="Valor">'
      + '</div>'
      + '<div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">Comisión por cobranza (por cada pago)</div>'
      + '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px">'
      + '<select class="fs" id="eu_com_c_tipo" style="min-width:130px"><option value="fijo" '+(comC.tipo==='fijo'?'selected':'')+'>Monto fijo ($)</option><option value="porc" '+(comC.tipo==='porc'?'selected':'')+'>Porcentaje (%)</option></select>'
      + '<input class="fi" id="eu_com_c_val" type="number" step="0.01" min="0" value="'+(comC.valor||1)+'" placeholder="Valor">'
      + '</div>'
      + '</div>'
      + '</div>';
    // Sección Concesionarios
    var asignadosUsr = u.concesionarios || [];
    var concListaActivos = (S.concesionarios||[]).filter(function(cc){return !cc.eliminado;});
    var concSection;
    if(concListaActivos.length === 0){
      concSection = ''
        + '<div style="margin-top:14px;padding:12px;background:var(--gs);border-radius:10px;border:1px solid var(--rim2)">'
        + '<div style="font-size:12.5px;font-weight:700">Concesionarios asignados</div>'
        + '<div style="font-size:10.5px;color:var(--ink3);margin-top:5px;line-height:1.5">Aún no has creado concesionarios. Para asignar al usuario a una sede específica, primero <a href="#" onclick="closeM();nav(\'concesionarios\');return false" style="color:var(--p1)">crea concesionarios</a>. Mientras tanto, este usuario ve todos los datos (vista global).</div>'
        + '</div>';
    } else {
      concSection = ''
        + '<div style="margin-top:14px;padding:12px;background:var(--gs);border-radius:10px;border:1px solid var(--rim2)">'
        + '<div style="font-size:12.5px;font-weight:700">Concesionarios asignados</div>'
        + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px;line-height:1.5">Marca a qué sedes tiene acceso. Si no marcas ninguna y el rol es Administrador/Gerente, ve todos. Para roles inferiores, sin asignación → ve todos los datos (vista global).</div>'
        + '<div style="margin-top:10px;display:grid;gap:5px;max-height:180px;overflow-y:auto;padding:4px">'
        + concListaActivos.map(function(cc){
            var checked = asignadosUsr.indexOf(cc.id) !== -1;
            return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;padding:5px 8px;cursor:pointer;background:'+(checked?'rgba(74,107,255,.1)':'var(--surf2)')+';border-radius:6px;border:1px solid '+(checked?'rgba(74,107,255,.3)':'transparent')+'">'
              + '<input type="checkbox" class="eu-conc-cb" value="'+cc.id+'" '+(checked?'checked':'')+' style="accent-color:var(--p1)">'
              + '<div style="flex:1"><div style="font-weight:'+(checked?'700':'600')+'">'+cc.nombre+'</div>'
              + (cc.ciudad ? '<div style="font-size:10px;color:var(--ink3)">'+cc.ciudad+'</div>' : '')
              + '</div>'
              + (cc.activo===false ? '<span style="color:var(--red);font-size:9px;font-weight:700">INACTIVO</span>' : '')
              + '</label>';
          }).join('')
        + '</div>'
        + '<div style="display:flex;gap:6px;margin-top:9px">'
        + '<button type="button" class="btn btn-g btn-xs" onclick="document.querySelectorAll(\'.eu-conc-cb\').forEach(function(cb){cb.checked=true})">Marcar todos</button>'
        + '<button type="button" class="btn btn-g btn-xs" onclick="document.querySelectorAll(\'.eu-conc-cb\').forEach(function(cb){cb.checked=false})">Ninguno</button>'
        + '</div>'
        + '</div>';
    }
    $('mbd').innerHTML=''
      +'<div style="background:var(--surf2);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px">'
      +'<div style="font-weight:800">'+( u.nombre||u.email)+'</div>'
      +'<div style="color:var(--ink3)">'+u.email+'</div></div>'
      // Cargo: el nombre real del puesto. Es lo que ve el empleado debajo de su
      // nombre; el rol de abajo es solo permisos (Adam, 15-sep-2026: "tengo
      // empleados que no son ni vendedores ni gerentes... se me estan quejando
      // los empleados por los nombres de los roles").
      +'<div class="fg"><label>Cargo — es lo que ve el empleado debajo de su nombre</label>'
      +'<input class="fi" id="eu_cargo" maxlength="40" placeholder="Archivologa, Gerente de Cobranzas, Analista de Contratos..." value="'+String(u.cargo||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'">'
      +'<div style="font-size:10.5px;color:var(--ink3);margin-top:4px">Si lo dejas vacio se sigue viendo el rol, como hasta ahora.</div></div>'
      +'<div class="fg"><label>Rol — manda en los permisos; no se lo mostramos a nadie mas</label><select class="fs" id="eu_rol">'
      +(function(){
        // Oferta de roles disponibles — incluimos el rol actual aunque sea legacy, para no perderlo por error
        var roles = ['Administrador','Gerente','Empleado','Contador','Vendedor Concesionario'];
        if(u.rol && roles.indexOf(u.rol)===-1) roles.push(u.rol); // preservar legacy Cobrador/Vendedor si aplica
        return roles.map(function(r){
          var label = r;
          if(r==='Empleado') label = 'Empleado — dashboard, cobranza y solicitudes';
          else if(r==='Administrador') label = 'Administrador — acceso total';
          else if(r==='Gerente') label = 'Gerente — gestión operativa';
          else if(r==='Contador') label = 'Contador — reportes y contabilidad';
          else if(r==='Vendedor Concesionario') label = 'Vendedor Concesionario — solo calculadora, clientes y solicitudes';
          else if(r==='Cobrador'||r==='Vendedor') label = r+' (legacy — migra a Empleado)';
          return '<option value="'+r+'" '+(u.rol===r?'selected':'')+'>'+label+'</option>';
        }).join('');
      })()
      +'</select></div>'
      +'<div style="margin-top:12px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:var(--ink3);margin-bottom:8px">Módulos con acceso</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;max-height:200px;overflow-y:auto;padding:4px">'+modCheckboxes+'</div></div>'
      + concSection
      + comSection;
    S.saveFn=function(){
      var rol=($('eu_rol')&&$('eu_rol').value)||u.rol;
      var cargo=String(($('eu_cargo')&&$('eu_cargo').value)||'').trim().slice(0,40);
      var permisos=[];
      // Solo recoger checkboxes de PERMISOS (no el de comisiones ni los de concesionarios)
      document.querySelectorAll('#mbd input[type=checkbox]').forEach(function(cb){
        if(cb.id === 'eu_com_activo') return; // saltar el de comisiones
        if(cb.classList && cb.classList.contains('eu-conc-cb')) return; // saltar concesionarios
        if(cb.checked) permisos.push(cb.value);
      });
      // Recoger concesionarios asignados
      var concesAsig = [];
      document.querySelectorAll('.eu-conc-cb:checked').forEach(function(cb){
        concesAsig.push(cb.value);
      });
      // Construir config de comisiones
      var comActivoNuevo = !!($('eu_com_activo')&&$('eu_com_activo').checked);
      var comNueva = comActivoNuevo ? {
        activo: true,
        venta: {
          tipo: ($('eu_com_v_tipo')&&$('eu_com_v_tipo').value)||'fijo',
          valor: parseFloat(($('eu_com_v_val')&&$('eu_com_v_val').value)||5)||0
        },
        cobranza: {
          tipo: ($('eu_com_c_tipo')&&$('eu_com_c_tipo').value)||'fijo',
          valor: parseFloat(($('eu_com_c_val')&&$('eu_com_c_val').value)||1)||0
        }
      } : { activo: false };
      // IMPORTANTE: esperar a que la escritura confirme ANTES de recargar la lista.
      // Antes se navegaba de inmediato (fire-and-forget) y usersReload() releía
      // Firestore ganándole la carrera a la escritura -> el rol "revertía" solo.
      // Además, si la escritura se rechaza (permisos/reglas), ya NO marcamos éxito.
      DB.updateUsuario(uid,{rol:rol,cargo:cargo,permisos:permisos,comisiones:comNueva,concesionarios:concesAsig}).then(function(ok){
        if(ok===false){
          toast('El rol NO se guardó (Firebase rechazó el cambio). Revisá el mensaje de error y avisá.','error');
          return;
        }
        if(typeof logActividad==='function') logActividad('usuario_editado','users',uid,{rol:rol, permisos:permisos.length});
        // Cache local sincronizado
        try{
          if(typeof _usersCache !== 'undefined' && Array.isArray(_usersCache)){
            var cached = _usersCache.find(function(x){ return x.uid === uid; });
            if(cached){ cached.rol = rol; cached.cargo = cargo; cached.permisos = permisos; cached.comisiones = comNueva; cached.concesionarios = concesAsig; }
          }
        }catch(e){}
        // Si es el usuario actual, actualizar currentUser y re-render switcher
        try{
          if(S.currentUser && S.currentUser.uid === uid){
            S.currentUser.concesionarios = concesAsig;
            S.currentUser.rol = rol;
            S.currentUser.cargo = cargo;
            if(typeof updateSidebarFooter === 'function') updateSidebarFooter();
            if(typeof _renderConcSwitcher === 'function') _renderConcSwitcher();
          }
        }catch(e){}
        closeM(); nav('users'); toast((cargo ? cargo+' · permisos de '+rol : 'Rol actualizado a '+rol)+' ✓','success');
      });
      return true;
    };
    $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-p" onclick="saveM()">Guardar cambios</button>';
    $('ov').style.display='flex';
  }).catch(function(e){ toast('Error: '+e.message,'error'); });
}

function confirmarEliminarUsuario(uid,nombre){
  if(!requireDeletePermission()) return;
  setMicon('eliminar'); $('mtt').textContent='Eliminar Usuario'; $('msb').textContent=nombre;
  $('modal-box').className='modal';
  $('mbd').innerHTML='<div style="text-align:center;padding:12px 0">'
    +'<div style="font-size:38px;margin-bottom:10px"></div>'
    +'<div style="font-size:14px;font-weight:800;margin-bottom:6px">¿Eliminar a <em>'+nombre+'</em>?</div>'
    +'<div style="font-size:12px;color:var(--ink3)">Esta acción eliminará el perfil del usuario del sistema. No se puede deshacer.</div>'
    +'</div>';
  S.saveFn=function(){
    DB.deleteUsuario(uid);
    if(typeof logActividad==='function') logActividad('usuario_eliminado','users',uid,{nombre:nombre});
    closeM(); nav('users'); toast('Usuario eliminado','info'); return true;
  };
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()">Cancelar</button><button class="btn btn-d" onclick="saveM()">Sí, eliminar</button>';
  $('ov').style.display='flex';
}

function copiarLink(token){
  var url = (token&&String(token).indexOf('http')===0) ? token : window.location.href.split('?')[0]+'?invite='+token;
  if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(function(){ toast('Link copiado al portapapeles','success'); });
  } else {
    prompt('Copia este link de invitación:',url);
  }
}
function mostrarLinkInvitacion(link, email){
  setMicon('link'); $('mtt').textContent='Link de invitación'; $('msb').textContent='Envíalo a '+email;
  $('modal-box').className='modal';
  $('mbd').innerHTML=''
    +'<div style="text-align:center;margin-bottom:16px">'
    +'<div style="font-size:32px;margin-bottom:6px"></div>'
    +'<div style="font-size:13px;font-weight:800;color:var(--ink1);margin-bottom:4px">Invitación lista para <span style="color:var(--p1)">'+email+'</span></div>'
    +'<div style="font-size:11.5px;color:var(--ink3)">El usuario abre este link, elige su contraseña y activa su cuenta</div>'
    +'</div>'
    +'<div style="background:var(--surf2);border:2px solid var(--p1);border-radius:10px;padding:12px 14px;margin-bottom:14px">'
    +'<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--p1);margin-bottom:7px"> Link de activación</div>'
    +'<input id="invite-link-field" type="text" value="'+link+'" readonly onclick="this.select()" style="width:100%;background:var(--bg);border:1px solid var(--rim);border-radius:6px;padding:8px 10px;font-size:11px;font-family:monospace;color:var(--ink1);outline:none;cursor:text;box-sizing:border-box">'
    +'</div>'
    +'<button id="inv-copy-btn" class="btn btn-p" style="width:100%;font-size:13.5px;font-weight:800;padding:11px" onclick="(function(){'
    +'var inp=document.getElementById(\'invite-link-field\');'
    +'inp.select();'
    +'var copyDone=function(){'
    +'var b=document.getElementById(\'inv-copy-btn\');'
    +'if(b){b.textContent=\'✓ ¡Copiado!\';b.style.background=\'var(--green)\';} '
    +'setTimeout(function(){if(b){b.textContent=\' Copiar link\';b.style.background=\'\';}},2500);'
    +'};'
    +'if(navigator.clipboard&&navigator.clipboard.writeText){'
    +'navigator.clipboard.writeText(inp.value).then(copyDone).catch(function(){try{document.execCommand(\'copy\');copyDone();}catch(ex){}});'
    +'} else {try{document.execCommand(\'copy\');copyDone();}catch(ex){toast(\'Selecciona el link y cópialo manualmente\',\'info\');}}'
    +'})()"> Copiar link</button>';
  $('mft').innerHTML='<button class="btn btn-g" onclick="closeM()" style="min-width:90px">Cerrar</button>';
  $('ov').style.display='flex';
  setTimeout(function(){ var f=$('invite-link-field'); if(f){f.focus();f.select();} }, 200);
}

function copiarInvitacionUsuario(uid){
  if(!db){ toast('Requiere Firebase activo','error'); return; }
  if(!uid){ toast('Usuario no válido','error'); return; }
  db.collection('usuarios').doc(uid).get().then(function(doc){
    if(!doc.exists){ toast('Usuario no encontrado','error'); return; }
    var data = doc.data() || {};
    if(!data.email){ toast('El usuario no tiene email válido','error'); return; }
    // Si tiene token activo, reconstruir link y mostrarlo
    if(data.inviteToken){
      var link = _buildInviteLink(data.inviteToken);
      mostrarLinkInvitacion(link, data.email);
      return;
    }
    // Si no hay inviteToken, regenerar una nueva invitación
    var nuevoToken = 'INV-'+Date.now()+'-'+_randomToken(18);
    var nuevoLink = _buildInviteLink(nuevoToken, data.email);
    // Buscar rol y permisos del usuario para guardarlos en la nueva invitación
    var rol = data.rol || 'Empleado';
    // Nunca una invitacion sin permisos: al aceptarla se copian tal cual (punto 2)
    var permisos = (Array.isArray(data.permisos) && data.permisos.length) ? data.permisos
      : ((typeof ROL_PERMISOS!=='undefined' && ROL_PERMISOS[rol]) || ['dash']);
    var payload = { token: nuevoToken, email: data.email, nombre: data.nombre||data.email,
      rol: rol, permisos: permisos, creadoPor: (S.currentUser&&S.currentUser.nombre)||'Admin',
      creadoEn: new Date().toISOString(), usado: false, inviteLink: nuevoLink };
    DB.saveInvitacion(nuevoToken, payload).then(function(){
      mostrarLinkInvitacion(nuevoLink, data.email);
    }).catch(function(e){ toast('Error: '+(e.message||e),'error'); });
  }).catch(function(e){
    toast('Error: '+(e.message||e),'error');
  });
}


function _getInviteToken(){
  try { return new URLSearchParams(window.location.search).get('invite') || ''; } catch(e) { return ''; }
}
function _clearInviteParams(){
  try {
    var url = window.location.href.split('?')[0];
    window.history.replaceState({}, document.title, url);
  } catch(e) {}
}
function _showInviteScreenForDoc(docData){
  var invSc = $('invite-screen');
  var loginSc = $('login-screen');
  if(loginSc) loginSc.style.display = 'none';
  if(invSc) invSc.style.display = 'flex';
  S.pendingInvite = docData || null;
  if($('inv_nombre')) $('inv_nombre').value = docData && docData.nombre && docData.nombre!==docData.email ? docData.nombre : '';
  if($('inv_pass')) $('inv_pass').value = '';
  if($('inv_pass2')) $('inv_pass2').value = '';
  if($('invite-err')) $('invite-err').style.display = 'none';
  if($('inv-footer')) $('inv-footer').innerHTML = 'Invitación para <b>' + ((docData&&docData.email)||'') + '</b><br>Elige tu nombre y tu clave para activar la cuenta.';
}
function _resolverInvitacionPendiente(){
  if(!auth) return;
  // Durante una activación en curso este flujo pisaría S.pendingInvite con el
  // placeholder (rol Empleado, permisos []) y limpiaría el formulario.
  if(window._activandoInvitacion) return;
  var token = _getInviteToken();
  if(!token) return;

  // Extraer email del parámetro &ie= embebido en el link
  var emailFromUrl = '';
  try { emailFromUrl = decodeURIComponent(new URLSearchParams(window.location.search).get('ie') || ''); } catch(e){}

  // Si tenemos el email desde el URL, mostrar el formulario INMEDIATAMENTE sin esperar Firestore
  // (evita el problema de reglas de seguridad para usuarios no autenticados)
  if(emailFromUrl){
    var quickData = { token: token, email: emailFromUrl, nombre: '', rol: 'Empleado', permisos: [] };
    _showInviteScreenForDoc(quickData);
    // Luego intentar cargar datos completos de Firestore para pre-rellenar nombre/rol si es posible
    if(db){
      db.collection('invitaciones').doc(token).get().then(function(doc){
        if(doc.exists){
          var d = doc.data()||{};
          if(d.usado){ return; } // ya usada, pero no forzamos salida (el usuario ya ve el form)
          d.token = token;
          _showInviteScreenForDoc(d); // actualizar con datos completos
        }
      }).catch(function(){}); // ignorar errores de permisos
    }
    return;
  }

  // Fallback: sin email en URL, intentar Firestore (flujo legacy)
  if(!db){ if($('login-err')){ $('login-err').textContent='No se puede verificar la invitación sin conexión.'; $('login-err').style.display='block'; } return; }
  db.collection('invitaciones').doc(token).get().then(function(doc){
    if(doc.exists){
      var data = doc.data() || {};
      if(data.usado){
        if($('login-err')){ $('login-err').textContent='Esta invitación ya fue utilizada. Inicia sesión con tu cuenta.'; $('login-err').style.display='block'; }
        _clearInviteParams(); return;
      }
      data.token = token;
      _showInviteScreenForDoc(data);
      return;
    }
    // Flujo legacy: buscar en 'usuarios' por inviteToken
    db.collection('usuarios').where('inviteToken','==',token).limit(1).get().then(function(snap){
      if(snap.empty){
        if($('login-err')){ $('login-err').textContent='El link de invitación no es válido o ya fue usado.'; $('login-err').style.display='block'; }
        _clearInviteParams(); return;
      }
      var d = snap.docs[0]; var data = d.data()||{}; data.uid = d.id; data._legacy = true;
      if(data.inviteStatus==='aceptada'){
        if($('login-err')){ $('login-err').textContent='Esta invitación ya fue utilizada. Inicia sesión con tu cuenta.'; $('login-err').style.display='block'; }
        _clearInviteParams(); return;
      }
      _showInviteScreenForDoc(data);
    }).catch(function(e){
      if($('login-err')){ $('login-err').textContent='Error al abrir la invitación: '+(e.message||e); $('login-err').style.display='block'; }
    });
  }).catch(function(e){
    // Reglas de Firestore bloquean la lectura - mostrar form vacío igual
    if(emailFromUrl){
      _showInviteScreenForDoc({ token: token, email: emailFromUrl, nombre: '', rol: 'Empleado', permisos: [] });
    } else {
      if($('login-err')){ $('login-err').textContent='No se pudo verificar la invitación. Por favor intenta de nuevo.'; $('login-err').style.display='block'; }
    }
  });
}

function aceptarInvitacion() {
  var nombre = (($('inv_nombre') || {}).value || '').trim();
  var pass = (($('inv_pass') || {}).value || '');
  var pass2 = (($('inv_pass2') || {}).value || '');
  var errEl = $('invite-err');
  if (errEl) errEl.style.display = 'none';

  var pending = S.pendingInvite || null;
  if (!pending || !pending.email) {
    if (errEl) { errEl.textContent = ' Esta invitación no es válida o ya expiró'; errEl.style.display = 'block'; }
    return;
  }
  if (!nombre) {
    if (errEl) { errEl.textContent = ' Ingresa tu nombre completo'; errEl.style.display = 'block'; }
    return;
  }
  if (pass.length < 6) {
    if (errEl) { errEl.textContent = ' La contraseña debe tener al menos 6 caracteres'; errEl.style.display = 'block'; }
    return;
  }
  if (pass !== pass2) {
    if (errEl) { errEl.textContent = ' Las contraseñas no coinciden'; errEl.style.display = 'block'; }
    return;
  }

  // Sin token no se puede crear la ficha (la regla de Firestore lo exige):
  // avisar ANTES de crear la cuenta en Auth, para no dejarla huérfana.
  if (!(pending.token || pending.inviteToken)) {
    if (errEl) { errEl.textContent = 'El link de invitación no es válido o está incompleto. Pídele al administrador que te reenvíe la invitación.'; errEl.style.display = 'block'; }
    return;
  }
  // Reentrada (doble Enter): los inputs tienen onkeydown y no se deshabilitan.
  if (window._activandoInvitacion) return;

  var btn = $('inv-btn');
  if (btn) btn.disabled = true;
  showLoader('Activando cuenta...', '');

  // ── FIX: carrera al aceptar una invitación ──
  // createUserWithEmailAndPassword dispara onAuthStateChanged ANTES de que
  // finalizarActivacion escriba la ficha en /usuarios. El listener no la
  // encontraba, hacía signOut() por seguridad y la escritura fallaba por
  // permisos: la cuenta quedaba creada en Auth pero sin ficha, y el usuario
  // ya no podía reintentar (email-already-in-use). Esta bandera le dice al
  // listener que hay una activación en curso y debe esperar.
  window._activandoInvitacion = true;

  var token = pending.token || pending.inviteToken || null;
  var isLegacy = !!(pending._legacy && pending.inviteTempPass);
  var _activacionData = null;

  function finalizarActivacion(user) {
    return user.updateProfile({ displayName: nombre })
      .then(function(){
        var updateData = {
          uid: user.uid,
          // El token queda en la ficha para que las reglas de Firestore puedan
          // verificar que esta cuenta fue realmente invitada por un admin.
          inviteToken: token,
          nombre: nombre,
          email: user.email,
          rol: pending.rol || 'Empleado',
          // Nunca escribir permisos vacíos: el listener de arranque rellena un
          // array vacío con el set COMPLETO (incluido users/config/perm_delete),
          // así que un [] aquí se convertiría en acceso total en el siguiente login.
          // Exactamente los de la invitacion: las Reglas de Firestore lo exigen (punto 2,
          // 19-sep) para que nadie se ponga otros al aceptar. Las invitaciones siempre
          // traen permisos (al crearlas y al regenerarlas); si una vieja no los trae, el
          // admin se los asigna despues desde Usuarios.
          permisos: Array.isArray(pending.permisos) ? pending.permisos : [],
          inviteStatus: 'aceptada',
          inviteAcceptedAt: new Date().toISOString(),
          debeActualizar: false
        };
        // Limpiar campos temporales del flujo legacy. Solo cuando el doc YA existe:
        // si fuese una creación, borrar inviteToken viola la regla de Firestore
        // (exige que inviteToken sea string) y la escritura se denegaría.
        if(isLegacy && pending.inviteTempPass && pending.uid === user.uid){
          updateData.inviteTempPass = firebase.firestore.FieldValue.delete();
          updateData.inviteLink = firebase.firestore.FieldValue.delete();
        }
        _activacionData = updateData;
        return db.collection('usuarios').doc(user.uid).set(updateData, { merge: true });
      })
      .then(function(){
        // Hidratar la sesión ANTES de arrancar la app: el listener salió temprano
        // (la ficha aún no existía), y onAuthStateChanged no se vuelve a disparar
        // con el mismo uid. Sin esto, S.currentUser queda null → sidebar vacío y
        // nav() sin control de permisos.
        S.currentUser = Object.assign({}, _activacionData, {
          uid: user.uid,
          email: user.email,
          nombre: _activacionData.nombre || user.email,
          concesionarios: _activacionData.concesionarios || [],
          comisiones: _activacionData.comisiones || null,
          lastLogin: new Date().toISOString()
        });
        var _sbUn = document.querySelector('.sb-un');
        if (_sbUn) _sbUn.textContent = S.currentUser.nombre;
        var _sbAv = document.querySelector('.sb-av');
        if (_sbAv) _sbAv.textContent = (S.currentUser.nombre||'A').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
        if(typeof updateSidebarFooter === 'function') updateSidebarFooter();
        if(typeof _attachCurrentUserListener === 'function') _attachCurrentUserListener(user.uid);
        db.collection('usuarios').doc(user.uid).set({ lastLogin: S.currentUser.lastLogin }, {merge:true}).catch(function(){});
        if(typeof logActividad === 'function') logActividad('login','auth',user.uid,{rol:S.currentUser.rol,via:'invitacion'});
        // Recién ahora es seguro soltar la bandera: la ficha existe y la sesión
        // está hidratada, así que cualquier get() en vuelo del listener validará bien.
        window._activandoInvitacion = false;
        // Marcar la invitación como usada. Puede fallar por permisos si las reglas
        // aún no permiten que el invitado la marque; no debe molestar al usuario.
        if(token){ try{ Promise.resolve(DB.usarInvitacion(token, user.uid)).catch(function(){}); }catch(_e){} }
        hideLoader();
        _clearInviteParams();
        S.pendingInvite = null;
        $('invite-screen').style.display = 'none';
        if (!window._appInited) { window._appInited = true; init(); }
      });
  }

  var p;
  if (isLegacy) {
    // Flujo legacy: iniciar sesión con contraseña temporal y actualizarla
    var doAuth = Promise.resolve();
    if(auth.currentUser && auth.currentUser.email !== pending.email) doAuth = auth.signOut();
    p = doAuth
      .then(function(){
        if(auth.currentUser && auth.currentUser.email === pending.email) return auth.currentUser;
        return auth.signInWithEmailAndPassword(pending.email, pending.inviteTempPass).then(function(r){ return r.user; });
      })
      .then(function(user){ return user.updatePassword(pass).then(function(){ return user; }); })
      .then(finalizarActivacion);
  } else {
    // Nuevo flujo: crear el usuario directamente con la contraseña elegida
    var doSignOut = auth.currentUser ? auth.signOut() : Promise.resolve();
    p = doSignOut
      .then(function(){ return auth.createUserWithEmailAndPassword(pending.email, pass); })
      .catch(function(e){
        // RECUPERACIÓN: la cuenta ya existe en Auth pero la invitación sigue
        // pendiente (activación previa que quedó a medias). Como el invitado
        // llegó con un token válido, se intenta iniciar sesión con la clave que
        // acaba de escribir para poder completar su ficha en /usuarios.
        if(e && e.code === 'auth/email-already-in-use'){
          return auth.signInWithEmailAndPassword(pending.email, pass).catch(function(){
            var err = new Error('Ya existe una cuenta con este correo y la contraseña no coincide. Si ya intentaste activarla antes, escribe la MISMA contraseña que usaste esa vez. Si no la recuerdas, usa «¿Olvidaste tu contraseña?» en la pantalla de inicio.');
            err.code = 'pagasi/clave-no-coincide';
            throw err;
          });
        }
        throw e;
      })
      .then(function(r){ return r.user; })
      .then(finalizarActivacion);
  }

  p.catch(function(e) {
    window._activandoInvitacion = false;
    hideLoader();
    if (btn) btn.disabled = false;
    var msg = e.message || 'Error al activar la cuenta';
    if(e.code === 'auth/email-already-in-use') msg = 'Este email ya tiene una cuenta. Inicia sesión con tu contraseña, o usa «¿Olvidaste tu contraseña?» en la pantalla de inicio para restablecerla y entrar.';
    if(e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') msg = 'La contraseña no coincide con la cuenta existente. Si ya intentaste activarla antes, escribe la MISMA contraseña de esa vez.';
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  });
}


function iniciarListenerSolicitudes(){}

// ── Arranque con Firebase Auth ──────────────────────────────
if (auth) {
  auth.onAuthStateChanged(function(user) {
    var inviteToken = _getInviteToken();
    if (inviteToken && (!user || (S.pendingInvite && user.email===S.pendingInvite.email))) {
      _resolverInvitacionPendiente();
      if (!user) return;
    }
    if (user) {
      // ── SEGURIDAD: una sesión ANÓNIMA (la que crea el formulario público
      // solicitar.html con signInAnonymously) NO debe entrar al admin. Se cierra. ──
      if (user.isAnonymous) { try{ auth.signOut(); }catch(e){} return; }
      $('login-screen').style.display = 'none';
      var invSc = $('invite-screen');
      if (invSc && !inviteToken) invSc.style.display = 'none';
      // Cargar datos del usuario desde Firestore
      if (db) {
        db.collection('usuarios').doc(user.uid).get().then(function(doc) {
          // ── SEGURIDAD (FIX CRÍTICO): si NO existe ficha en 'usuarios', NO es un
          // administrador legítimo. Antes se auto-creaba una cuenta Administrador con
          // TODOS los permisos para cualquier usuario autenticado (incluido un lead del
          // formulario público) — agujero gravísimo. Ahora se DENIEGA y se cierra sesión.
          if (!doc.exists) {
            // Si hay una activación de invitación en curso, la ficha se está
            // escribiendo en este mismo instante: NO cerrar sesión (eso abortaba
            // la escritura y dejaba la cuenta creada pero sin ficha).
            if (window._activandoInvitacion) return;
            try{ auth.signOut(); }catch(e){}
            S.currentUser = null;
            var _lsD = $('login-screen'); if (_lsD) _lsD.style.display = 'flex';
            var _arD = $('app-root'); if (_arD) _arD.style.display = 'none';
            var _erD = $('login-err'); if (_erD) { _erD.textContent = 'Esta cuenta no tiene acceso al sistema. Pedile a un administrador que te dé acceso.'; _erD.style.display = 'block'; }
            return;
          }
          var data = doc.data() || {};
          // El doc existe: completar solo campos faltantes (nombre/rol/permisos) si hace falta.
          var needsUpdate = {};
          if (!data.email) needsUpdate.email = user.email;
          if (!data.nombre) needsUpdate.nombre = user.displayName || (user.email||'').split('@')[0] || 'Usuario';
          if (!data.rol || data.rol === 'admin') needsUpdate.rol = 'Administrador'; // normalizar minúscula legacy
          // SEGURIDAD: solo rellenar si el campo FALTA por completo, y con los
          // permisos del ROL — nunca con el set total de administrador. Antes, una
          // ficha con permisos:[] (p. ej. creada por una invitación sin permisos)
          // se auto-escalaba a users/config/perm_delete en el siguiente login.
          if (!Array.isArray(data.permisos)) {
            needsUpdate.permisos = (data.rol === 'Administrador' || data.rol === 'admin')
              ? ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete']
              : ((typeof ROL_PERMISOS!=='undefined' && ROL_PERMISOS[data.rol]) || ['dash']);
          }
          if (Object.keys(needsUpdate).length > 0) {
            db.collection('usuarios').doc(user.uid).set(needsUpdate, {merge:true}).catch(function(){});
            Object.assign(data, needsUpdate);
          }
          // ── Registrar ÚLTIMO ACCESO (alimenta la columna "Último acceso") ──
          // Antes nunca se escribía, por eso todos mostraban "Nunca".
          var _lastLoginISO = new Date().toISOString();
          data.lastLogin = _lastLoginISO;
          db.collection('usuarios').doc(user.uid).set({ lastLogin: _lastLoginISO }, {merge:true}).catch(function(){});
          // Copiamos PRIMERO todos los campos del doc (cumpleanos, tel, genero, instagram, facebook, etc.)
          // y después sobre-escribimos los críticos con defaults seguros.
          S.currentUser = Object.assign({}, data, {
            uid: user.uid,
            email: user.email,
            nombre: data.nombre || user.displayName || user.email,
            rol: data.rol || 'Administrador',
            permisos: data.permisos || ['dash','clientes','motos','creditos','pagos','cobranza','contratos','notif','reportes','cuentas','conta','plan','config','users','perm_delete'],
            concesionarios: data.concesionarios || [],
            comisiones: data.comisiones || null
          });
          var sbUn = document.querySelector('.sb-un');
          if (sbUn) sbUn.textContent = S.currentUser.nombre;
          var sbAv = document.querySelector('.sb-av');
          if (sbAv) sbAv.textContent = (S.currentUser.nombre||'A').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
          if(typeof updateSidebarFooter === 'function') updateSidebarFooter();
          // ── Listener en tiempo real sobre el documento del usuario actual ──
          // Si el admin cambia rol o permisos desde otra sesión, se reflejan al instante.
          if(typeof _attachCurrentUserListener === 'function') _attachCurrentUserListener(user.uid);
          // ── Log de inicio de sesión ──
          if(typeof logActividad === 'function') logActividad('login','auth',user.uid,{rol:S.currentUser.rol});
          // Inicializar la app SOLO para usuarios autorizados (con ficha válida en 'usuarios').
          if (!window._appInited) { window._appInited = true; init(); }
        }).catch(function(){
          // Misma salvedad: durante una activación en curso, esperar.
          if (window._activandoInvitacion) return;
          // ── SEGURIDAD: ante un error validando la ficha, NO conceder admin: denegar acceso. ──
          try{ auth.signOut(); }catch(e){}
          S.currentUser = null;
          var _lsE = $('login-screen'); if (_lsE) _lsE.style.display = 'flex';
          var _arE = $('app-root'); if (_arE) _arE.style.display = 'none';
        });
      } else {
        // ── SEGURIDAD: sin Firestore disponible no se puede validar la ficha del
        // usuario; NO conceder admin. Se muestra el login. ──
        S.currentUser = null;
        var _lsN = $('login-screen'); if (_lsN) _lsN.style.display = 'flex';
        var _arN = $('app-root'); if (_arN) _arN.style.display = 'none';
      }
    } else {
      window._appInited = false;
      // Desuscribir listener del documento del usuario al cerrar sesión
      if(typeof _detachCurrentUserListener === 'function') _detachCurrentUserListener();
      if(typeof stopRealtime === 'function') stopRealtime();
      var inviteToken = _getInviteToken();
      if (inviteToken) {
        var appRoot = $('app-root');
        if (appRoot) appRoot.style.display = 'none';
        _resolverInvitacionPendiente();
      } else {
        $('login-screen').style.display = 'flex';
        var invSc = $('invite-screen');
        if (invSc) invSc.style.display = 'none';
        var appRoot = $('app-root');
        if (appRoot) appRoot.style.display = 'none';
        var mEl = $('login-mode');
        if (mEl) mEl.textContent = 'Firebase Auth activo';
      }
    }
  });
}
