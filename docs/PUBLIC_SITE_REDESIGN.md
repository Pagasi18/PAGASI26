# Rediseño del sitio público Pagasi

Base de comparación: `4585bcf`. Implementación: septiembre de 2026.

## Alcance

Inicio, catálogo, simulador, solicitud, nosotros y presentación de Mi Cuenta. Se conserva el logo original `assets/pagasi-logo.png`, con mayor tamaño. La interfaz usa azul y blanco, componentes compartidos y navegación adaptable; no requiere compilación ni cambia el despliegue de GitHub Pages.

Los estilos y scripts nuevos están en `assets/public/`. El panel administrativo, `modules/`, `logic/`, las reglas de Firebase y las integraciones de cobranza no se modifican.

## Contratos conservados

- Los 46 IDs, precios y concesionarios del catálogo original se mantienen.
- `catalog.js` centraliza la fórmula existente del simulador: inicial del 50%, 12 meses, 24 cuotas y APY del 380%. Los resultados redondeados coinciden con el simulador anterior. La vista mensual es una equivalencia informativa; no cambia la frecuencia de pago.
- Los importes de portada y catálogo ahora se derivan de esa misma fórmula. Antes existían cifras estáticas inconsistentes entre páginas.
- Los campos, opciones, validación, evaluación, estructura del documento de solicitud, colección `clientes`, autenticación anónima, protección contra doble envío y manejo de errores permanecen iguales.
- La solicitud recibe los 46 modelos compartidos, corrigiendo la omisión anterior de los IDs 42–46 (Benmo). Catálogo, simulador y solicitud conservan el modelo por `?moto=ID`.
- El código del portal de clientes y sus dependencias son idénticos a la base: autenticación, permisos del equipo, lectura de créditos, cálculo de cuotas, gamificación y envío de comprobantes. El cambio del portal es de HTML y CSS.
- WhatsApp de ventas sigue en las páginas públicas; Mi Cuenta conserva la línea de cobranza.

## Imágenes

La primera portada usaba una vista ilustrativa de la EK Xpress 150 Lite en tres cuartos. La portada actual usa las fotografías reales del catálogo en columnas animadas (ver revisión al final). La ilustración permanece en la galería del simulador, identificada como tal y con acceso a la foto real. El logo no fue generado ni sustituido.

Archivo publicado: `assets/public/ek-xpress-hero.webp` (1254 × 1254, 185.326 bytes). Se convirtió el PNG generado a WebP con calidad 90 para reducir su peso aproximadamente un 89%, sin cambiar composición. El PNG maestro corresponde a `exec-3f2917a5-0bc7-4fcb-9a60-3216df6693fe.png` en la carpeta local de imágenes generadas de Codex.

Se conservan las fotografías reales disponibles. Los cinco modelos Benmo muestran “Fotografía por confirmar” hasta disponer de las fotos correctas; no se les asigna la imagen de otra moto.

## Validación

- `node tests/public-site.test.js`: 13 comprobaciones aprobadas, sin red. Compara los 46 planes con la fórmula original, IDs y campos, SDKs, código del portal, evaluación y payload con distintos perfiles, modelos Benmo, pasos del formulario, protección contra doble envío y reintentos ante errores.
- `node tests/credito-ledger.test.js`: aprobado.
- `node tests/financial-audit.test.js`: aprobado.
- `node tests/run.js`: 909 aprobadas y 3 fallos preexistentes en Coromoto. El resultado fue idéntico antes y después del rediseño: ER periodo (500 / 1500), ER neta (300 / 1300) y resultados acumulados (1000 / 0), expresados como esperado / obtenido. No se modificó esa lógica.
- Navegador: seis páginas revisadas a 320, 390, 768 y 1440 px, sin desbordamiento horizontal ni imágenes visibles rotas. Navegación móvil, filtros, búsqueda sin resultados, ordenamiento, cambios de modelo y equivalencia mensual comprobados.
- Recorrido completo catálogo → simulador → solicitud probado, incluidos modelos Benmo. Avanzar y retroceder en la solicitud conserva los datos. No se envían solicitudes ni SMS reales durante estas pruebas.
- Acceso del equipo revisado con `?equipo=1`. Presentación del portal con crédito y pagos revisada en escritorio y a 320 px mediante un documento temporal con datos ficticios y sin scripts de red. El documento temporal se eliminó y no se publica. No se probó una sesión real de cliente ni el envío real de comprobantes.
- Sintaxis JavaScript, enlaces locales e IDs únicos revisados; consola del navegador sin errores en las páginas públicas.

## Publicación y reversión

GitHub Pages sirve la raíz de `main`, con dominio `pagasi.io`. Las rutas existentes permanecen iguales. Los recursos nuevos llevan versión en sus URLs. Para revertir, hacer `git revert` del commit del rediseño y publicar el revert en `main`; no requiere migración de datos.

## Corrección visual posterior a la primera publicación

La revisión del sitio completo encontró una incompatibilidad entre los iconos insertados por JavaScript y los selectores directos del CSS. En móvil dejaba los párrafos de beneficios en una columna de solo 40 px y separaba la lupa del buscador. Se corrige insertando los SVG como hijos directos, con una asignación explícita de columnas para títulos y párrafos.

Se ajustan también:

- Composición de portada, jerarquía tipográfica, separación de botones y tamaño de la oferta. La moto aparece completa sobre una base y la oferta no tapa las ruedas. En 390 × 844 px la tarjeta de cuotas completa termina aproximadamente en el píxel 824.
- Escena ilustrativa `assets/public/ek-xpress-scene-v2.webp` (1254 × 1254, 180.362 bytes), generada con la herramienta integrada a partir de la ilustración anterior. Brief: conservar la EK Xpress 150 Lite y su ángulo de tres cuartos, mostrar ambas ruedas y espejos completos, círculo blanco, base elíptica blanca, fondo azul, sin textos ni precios. Se mantiene la foto original en la galería. El intento de recorte transparente no se usa porque su fondo de cuadrícula estaba incrustado.
- Encuadre CSS de las fotos reales mediante límites de sus márgenes blancos. No se alteran los archivos, colores, modelos, precios ni IDs. Las imágenes que son afiches conservan el encuadre completo. El encuadre se actualiza al cambiar modelo, filtrar o redimensionar.
- Buscador con lupa alineada; filtros y ordenamiento juntos en móvil. Fichas con fotos mayores, etiquetas legibles e importes alineados.
- Ficha compacta en el simulador móvil y solicitud inmediatamente después del importe calculado.
- Campos y textos más legibles en la solicitud. Se evita que el WhatsApp flotante tape el botón Continuar. En portada se muestra después de salir de la sección principal.
- Contactos del pie visibles también en móvil, iconos de beneficios y aliados consistentes y presentación de acceso a Mi Cuenta revisada.

Validación de la corrección: 13 contratos del sitio público aprobados; comparación del código del portal, SDKs, cálculo y payload con la base aprobada. Navegador: 30 combinaciones (seis páginas a 320, 390, 768, 1024 y 1440 px), sin desbordamiento horizontal, párrafos largos en columnas menores de 100 px, encabezados o botones recortados ni imágenes visibles rotas. Se probaron búsqueda sin resultados, reinicio, orden por cuota, filtros Benmo, cambio entre ilustración y foto real, equivalencia mensual, traslado del ID 46 a la solicitud, cambio del modelo en el resumen, menú con Escape, preguntas frecuentes y acceso del equipo sin iniciar sesión ni enviar datos reales.

## Hero con movimiento inspirado en maben.io

Se sustituye el titular gigante “Llévatela YA!!” y la escena estática de portada por “Tu próxima moto. En cuotas.” y tres columnas inclinadas de fotos reales. Las columnas alternan dirección y repiten grupos idénticos para un movimiento continuo sin saltos. En móvil, las columnas aparecen debajo del texto y los botones, conservando la animación. El logo y el azul de Pagasi permanecen.

- `hero-motion.css` y `hero-motion.js` están limitados a la portada. Los 12 modelos mostrados se leen del catálogo compartido. Las tarjetas decorativas no duplican enlaces en el orden de tabulación ni anuncios del lector de pantalla.
- Las fotos tienen copias WebP de 600 px en `assets/public/motion-motos/`, 312.930 bytes en total. Se conserva la foto original como alternativa en `picture`; no se cambian colores ni modelos. El encuadre reutiliza los límites de márgenes blancos existentes.
- Control accesible de pausa/reanudación. La animación se detiene al salir de la sección, ocultar la pestaña o activar movimiento reducido. Una pausa manual se conserva al volver a la sección o cambiar la preferencia del sistema.
- El único ajuste compartido es reconocer la nueva clase del hero para mantener la aparición del WhatsApp flotante después de la portada. No se alteran catálogo, cálculos, solicitud, cuenta ni servicios.
- `node tests/hero-motion.test.js`: control de pausa, visibilidad, preferencia de movimiento reducido y correspondencia de fotos/modelos. `node tests/public-site.test.js`: los 13 contratos conservados.
- Navegador: portada comprobada a 320, 390, 768, 1024 y 1440 px, sin desbordamiento horizontal ni fotos rotas; imágenes WebP seleccionadas. Pausar mantiene las mismas posiciones entre observaciones y reanudar reactiva las tres columnas. Grupos duplicados verificados idénticos; consola sin errores. El botón de catálogo conserva el recorrido a la EK Xpress 150 Lite con inicial $510 y cuota $44.

## Tarjetas de motos destacadas

Se rediseña únicamente la selección de motos de la portada: categoría y nombre antes de la foto, fondo suave detrás de la moto real, cuota e inicial agrupadas con distinta jerarquía, precio de contado separado y enlace de acción con flecha circular. El catálogo completo conserva sus tarjetas. Los filtros se agrupan en un control con iconos y estado seleccionado. En tablet se muestran dos tarjetas y una tercera horizontal; en móvil, una columna.

Los mismos grupos de IDs y los cálculos de `PagasiCatalog.plan()` alimentan la sección. Se conservan los enlaces de modelo al simulador, las fotografías y los datos originales. El WhatsApp flotante se oculta mientras esta sección está visible y vuelve a aparecer después para evitar que tape las acciones en móvil.

Validación: 13 contratos del sitio público y pruebas de movimiento del hero aprobados; interfaz revisada a 320, 390, 768, 1024 y 1440 px, sin desbordamientos ni fotos rotas. Los tres filtros muestran sus IDs e importes originales. Recorrido a Matrix 150 Lite comprobado: ID 11, inicial $645, cuota $55 y solicitud con el mismo ID. Pares de importes de los ocho modelos de esta selección contrastados con el catálogo compartido. Se comprobó que WhatsApp reaparece fuera de las tarjetas y que la consola no presenta errores.
