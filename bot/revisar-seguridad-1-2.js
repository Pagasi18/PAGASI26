// SOLO LECTURA. Antes de publicar las Reglas de los puntos 1 y 2 (lista del 18-sep):
//  - ¿Hay clientes con codigo metido en sus datos? (< > " ' ` \ & o "javascript:")
//  - ¿Que leads web no pasarian la regla nueva? (para saber que el formulario no se rompe)
//  - Usuarios por rol, suspendidos, y fichas que ya tienen permisos, sedes o rol raros.
//  - Invitaciones sin usar: edad, rol, y si esa persona YA tiene cuenta (un link asi
//    lo podria reusar un exempleado hasta que se publiquen las Reglas).
// El log es publico: ids y conteos; sin nombres, correos ni tokens.
// A que base habla este robot. Sin PAGASI_PROYECTO no se conecta a ninguna: antes
// el proyecto estaba escrito a mano y un robot copiado escribia en la base de la
// otra compania sin que nadie lo notara (22-sep-2026).
function _proyecto(){
  var p = process.env.PAGASI_PROYECTO || process.env.GOOGLE_CLOUD_PROJECT || '';
  if(!p) throw new Error('Falta PAGASI_PROYECTO: no se sabe a que base conectarse, y no se adivina.');
  return p;
}
const { Firestore } = require('@google-cloud/firestore');
const MALO = /[<>"'`&\\]|javascript:/i;
const dias = iso => { const t = new Date(iso || 0).getTime(); return t ? Math.floor((Date.now() - t) / 86400000) : null; };

(async () => {
  const db = new Firestore({ projectId: _proyecto() });
  const [cSnap, uSnap, iSnap] = await Promise.all([db.collection('clientes').get(), db.collection('usuarios').get(), db.collection('invitaciones').get()]);

  let web = 0; const conCodigo = [], webRaros = [];
  cSnap.forEach(d => {
    const c = d.data() || {}; const campos = [];
    const revisar = (obj, pre) => Object.entries(obj || {}).forEach(([k, v]) => {
      if (typeof v === 'string' && /<|>|javascript:|onerror|onload/i.test(v)) campos.push(pre + k);
      else if (v && typeof v === 'object' && !Array.isArray(v) && pre === '') revisar(v, k + '.');
    });
    revisar(c, '');
    if (campos.length) conCodigo.push(d.id + ' (' + (c.origen || 'panel') + ') campos: ' + campos.join(', '));
    if (c.origen === 'web') {
      web++;
      const txt = Object.entries(c).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v]);
      const raros = txt.filter(([, v]) => MALO.test(v)).map(([k]) => k);
      if (raros.length) webRaros.push(d.id + ': ' + raros.join(', '));
    }
  });
  console.log('CLIENTES: ' + cSnap.size + ' (web ' + web + ')');
  console.log('CON POSIBLE CODIGO (<, >, javascript:, onerror): ' + conCodigo.length);
  conCodigo.forEach(x => console.log('  ' + x));
  console.log('LEADS WEB QUE HOY TIENEN " \' ` \\ & (la regla nueva los rechazaria; el formulario nuevo ya los limpia): ' + webRaros.length);
  webRaros.slice(0, 30).forEach(x => console.log('  ' + x));

  const porRol = {}; let susp = 0; const emails = new Set();
  uSnap.forEach(d => { const u = d.data() || {}; porRol[u.rol || '(sin rol)'] = (porRol[u.rol || '(sin rol)'] || 0) + 1; if (u.suspendido) susp++; if (u.email) emails.add(String(u.email).toLowerCase()); });
  console.log('');
  console.log('USUARIOS: ' + uSnap.size + ' · por rol: ' + Object.entries(porRol).map(([r, n]) => r + ' ' + n).join(' · ') + ' · suspendidos ' + susp);

  const pend = [];
  iSnap.forEach(d => { const i = d.data() || {}; if (i.usado === true) return;
    pend.push({ edad: dias(i.createdAt || i.creadoEn), rol: i.rol || '?', perm: Array.isArray(i.permisos) ? i.permisos.length : 'sin campo', yaTieneCuenta: emails.has(String(i.email || '').toLowerCase()), demo: !!i.isDemo }); });
  pend.sort((a, b) => (b.edad || 0) - (a.edad || 0));
  console.log('INVITACIONES SIN USAR: ' + pend.length + ' (de ' + iSnap.size + ')');
  pend.forEach(p => console.log('  hace ' + (p.edad == null ? '?' : p.edad) + ' dias · rol ' + p.rol + ' · permisos ' + p.perm + (p.demo ? ' · demo' : '') + (p.yaTieneCuenta ? ' · ESA PERSONA YA TIENE CUENTA (link reusable)' : '')));
  console.log('');
  console.log('RESULTADO OK (solo lectura) codigo=' + conCodigo.length + ' webRaros=' + webRaros.length + ' invitacionesSinUsar=' + pend.length);
})().catch(e => { console.log('RESULTADO ERROR: ' + (e && e.message || e)); process.exit(1); });
