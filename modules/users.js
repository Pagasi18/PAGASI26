// Pagasi module: users
PG.users = function(){
  // Estado inicial de tab (defaults a 'usuarios')
  if(!S.usersTab) S.usersTab = 'usuarios';

  // Iniciar carga real desde Firestore
  setTimeout(function(){ usersReload(); }, 80);

  return`<div class="page">

  ${pageBanner(
    'Administración · Equipo',
    'Usuarios y Permisos',
    'Gestiona los accesos de tu equipo y los roles asignados',
    [
      {label:'↻ Refrescar', onclick:'usersReload()'},
      {label:'Demo temporal', onclick:'openCreateDemoUser()'},
      {label:'＋ Invitar Usuario', onclick:'openInviteUser()', primary:true}
    ]
  )}

  <!-- KPIs compactos -->
  <div class="sg" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:14px">
    <div class="stat" style="">
      <div class="st-v" style="color:var(--p1)" id="users-kpi-total">...</div>
      <div class="st-l">Usuarios activos</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="color:var(--amber)" id="users-kpi-pending">...</div>
      <div class="st-l">Invitaciones pendientes</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="color:var(--green)" id="users-kpi-online">...</div>
      <div class="st-l">Conectados hoy</div>
    </div>
    <div class="stat" style="">
      <div class="st-v" style="color:var(--blue)" id="users-kpi-roles">6</div>
      <div class="st-l">Roles configurados</div>
    </div>
  </div>

  <!-- Tabs -->
  <div style="display:flex;gap:3px;background:var(--surf2);padding:4px;border-radius:11px;margin-bottom:14px;border:1px solid var(--rim);flex-wrap:wrap">
    <button class="us-tab ${S.usersTab==='usuarios'?'is-active':''}" onclick="setUsersTab('usuarios')">
      <span style="font-size:14px"></span> Usuarios
    </button>
    <button class="us-tab ${S.usersTab==='roles'?'is-active':''}" onclick="setUsersTab('roles')">
      <span style="font-size:14px">️</span> Roles y Permisos
    </button>
    <button class="us-tab ${S.usersTab==='invitaciones'?'is-active':''}" onclick="setUsersTab('invitaciones')">
      <span style="font-size:14px">️</span> Invitaciones <span id="tab-inv-badge" style="background:var(--ambers);color:var(--amber);font-size:9.5px;font-weight:800;padding:1px 7px;border-radius:10px;margin-left:4px;display:none">0</span>
    </button>
  </div>

  <!-- Contenido del tab activo -->
  <div id="users-tab-content">
    ${S.usersTab==='usuarios' ? _usersTabUsuariosHTML() :
      S.usersTab==='roles' ? _usersTabRolesHTML() :
      _usersTabInvitacionesHTML()}
  </div>
  </div>`;};
