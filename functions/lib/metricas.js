/* Métricas de Instagram para Redes sociales (22-oct-2026, Adam: "¿puedes poner las métricas de
   los post, ads, etc.?"). Con los permisos de hoy Meta deja leer la cuenta (seguidores,
   publicaciones) y los "me gusta" y comentarios de cada publicación. El alcance, las vistas y los
   anuncios piden permisos que la app todavía no tiene (instagram_manage_insights, ads_read): el
   panel lo dice. Sin librerias: fetch de Node 20 contra graph.facebook.com.                    */
'use strict';
const GRAPH = 'https://graph.facebook.com/v22.0';

async function instagram(f, { token, cuenta }) {
  const get = async (ruta) => {
    const r = await f(`${GRAPH}/${ruta}${ruta.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error((j.error && j.error.message) || ('Meta HTTP ' + r.status));
    return j;
  };
  const c = await get(`${cuenta}?fields=username,followers_count,follows_count,media_count`);
  const m = await get(`${cuenta}/media?fields=id,caption,like_count,comments_count,timestamp,media_type,media_product_type,permalink,thumbnail_url,media_url&limit=24`);
  const posts = (m.data || []).map(p => ({
    id: String(p.id), texto: String(p.caption || '').slice(0, 280), fecha: p.timestamp || '', tipo: p.media_type || '', producto: p.media_product_type || '',
    enlace: p.permalink || '', imagen: p.thumbnail_url || p.media_url || '', meGusta: +p.like_count || 0, comentarios: +p.comments_count || 0
  }));
  return { usuario: c.username || '', seguidores: +c.followers_count || 0, siguiendo: +c.follows_count || 0, publicaciones: +c.media_count || 0, posts };
}

module.exports = { instagram };
