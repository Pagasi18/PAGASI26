// Pagasi module: halloween
// Adam, 28-oct-2026, con una foto del logo de BC.GAME (una calabaza al pie del ícono y una araña colgando de una
// letra): "algo así en el logo y ya". La versión con saludo, murciélagos y bordes no le gustó y se quitó.
// Solo el logo de la barra lateral: una calabaza al pie del pegaso y una araña que cuelga de la "i" de Pagasi.
// Del 28-oct al 1-nov; el 2-nov desaparece sola. Nada más del sistema cambia.
var HW_DESDE = '2026-10-28', HW_HASTA = '2026-11-01';
function hwActivo(){
  var hoy = (typeof hoyLocalISO === 'function') ? hoyLocalISO() : '';
  return !!hoy && hoy >= HW_DESDE && hoy <= HW_HASTA;
}
function hwAplicar(){
  var logo = (typeof document !== 'undefined' && document.querySelector) ? document.querySelector('.sb-logo') : null;
  if(!logo) return false;
  var ya = logo.querySelector('.hw-logo');
  if(!hwActivo()){ if(ya && ya.remove) ya.remove(); return false; }
  if(ya) return true;
  var d = document.createElement('span'); d.className = 'hw-logo'; d.setAttribute('aria-hidden', 'true');
  d.innerHTML = '<span class="hw-calabaza">🎃</span><span class="hw-hilo"></span><span class="hw-arana">🕷️</span>';
  logo.appendChild(d);
  return true;
}
if(typeof document !== 'undefined' && document.head && document.head.insertAdjacentHTML) document.head.insertAdjacentHTML('beforeend', '<style id="hw-css">'
  + '.sb-logo .hw-logo{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none}'
  + '.sb-logo .hw-calabaza{position:absolute;left:33px;top:41px;font-size:15px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.28))}'
  + '.sb-logo .hw-hilo{position:absolute;left:158px;top:0;width:1px;height:25px;background:rgba(16,26,53,.45)}'
  + '.sb-logo .hw-arana{position:absolute;left:151px;top:21px;font-size:13px;line-height:1;transform-origin:50% -21px;animation:hw-balanceo 2.8s ease-in-out infinite alternate}'
  + '@keyframes hw-balanceo{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}'
  + '@media (prefers-reduced-motion:reduce){.sb-logo .hw-arana{animation:none}}'
  + '</style>');
// El logo ya está en la página cuando carga este archivo (va al final del body); por si acaso, también al terminar de cargar
if(!hwAplicar() && typeof document !== 'undefined' && document.addEventListener) document.addEventListener('DOMContentLoaded', hwAplicar);
