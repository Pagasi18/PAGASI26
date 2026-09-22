#!/bin/bash
# Bumpea la versión cache-bust de todos los scripts en admin.html
# Para correr antes de cada git push: ./bump-version.sh
set -e
VERSION="$(date +%Y%m%d)-$(date +%H%M)"
echo "→ Bumpeando versión a: $VERSION"

# Usa perl para reemplazar TODOS los ?v=... por la nueva versión. El separador es # y
# no |, porque la alternancia (js|css) del propio regex se comia el cierre.
# micuenta.html (portal del cliente) también se versiona: comparte el motor de
# cálculo con el admin y un arreglo ahí debe llegarle también a los clientes.
# Las HOJAS DE ESTILO van igual: solo se versionaban los .js, así que en agosto
# dos cambios de diseño tardaron un mes en verse — el navegador seguía con el CSS
# viejo en caché (punto 37 de la lista del 18-sep).
perl -i -pe "s#(\.(?:js|css))\?v=[^\"\s]+#\1?v=$VERSION#g" admin.html
[ -f micuenta.html ] && perl -i -pe "s#(\.(?:js|css))\?v=[^\"\s]+#\1?v=$VERSION#g" micuenta.html

COUNT=$(grep -cE "\.(js|css)\?v=$VERSION" admin.html)
echo "✓ $COUNT archivos actualizados a v=$VERSION (admin.html, scripts y estilos)"
if [ -f micuenta.html ]; then
  CP=$(grep -cE "\.(js|css)\?v=$VERSION" micuenta.html || true)
  echo "✓ $CP script(s) actualizados en micuenta.html"
fi
echo ""
echo "Listo para commit. Ahora hacé:"
echo "  git add admin.html && git commit -m 'Bump version' && git push"
