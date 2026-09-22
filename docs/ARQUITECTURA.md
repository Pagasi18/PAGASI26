# Arquitectura del Sistema PAGASI v2.0

> Documento de referencia técnica. Explica cómo está organizado el sistema,
> cómo se comunican las piezas, y cómo trabajar sobre el código sin romper nada.
> Última actualización: mayo 2026.

---

## 1. ¿Qué es PAGASI?

Sistema de gestión de créditos de motocicletas. Maneja todo el ciclo del negocio:
clientes, inventario de motos, solicitudes de crédito, pagos, cobranza, contratos,
comisiones de vendedores, cuentas/tesorería y reportes.

**Tipo de aplicación:** App web de una sola página (SPA), sin backend propio.
**Tecnología:** HTML + CSS + JavaScript puro (sin frameworks) + Firebase.

---

## 2. Stack tecnológico

| Capa | Tecnología | Dónde vive |
|------|-----------|------------|
| Interfaz | HTML/CSS/JS vanilla | `admin.html`, `assets/` |
| Base de datos | Firebase Firestore | Nube (Google) |
| Autenticación | Firebase Auth | Nube (Google) |
| Almacenamiento archivos | Firebase Storage | Nube (Google) |
| Gráficos | Chart.js (CDN) | Cargado por CDN |
| Hosting | GitHub Pages | github.io |

No hay sistema de build (Vite/Webpack). Los archivos JS se cargan directamente
con etiquetas `<script>` en `admin.html`, en un orden específico (ver sección 6).

---

## 3. Estructura de carpetas

```
PAGASI-V2.0-main/
├── admin.html          # Punto de entrada. Carga todos los scripts y el login.
├── assets/
│   ├── pagasi-app.js    # NÚCLEO: estado global, router, acceso a BD, sidebar
│   └── pagasi.css       # TODOS los estilos (claro/oscuro, cards, modales, etc.)
├── logic/               # LÓGICA de negocio (cálculos, datos, validaciones)
├── modules/             # VISTAS (generan el HTML de cada pantalla)
├── vendor/              # Librerías de Firebase (copias locales)
├── tests/               # Pruebas automáticas (sobre todo financieras)
└── docs/                # Esta documentación
```

### La regla `modules/` vs `logic/`

- **`modules/X.js`** → genera la **vista** (el HTML que ve el usuario en la pantalla X).
  Registra una función en el objeto global `PG` (ej: `PG.creditos = function(){...}`).
- **`logic/X.js`** → contiene la **lógica** de ese módulo: cálculos, wizards,
  funciones auxiliares, validaciones. Lo que NO es HTML directo.

Cuando trabajes en una pantalla, normalmente tocarás los DOS archivos del par.

---

## 4. Los tres objetos globales (lo más importante de entender)

Todo el sistema gira en torno a tres objetos globales definidos en `assets/pagasi-app.js`:

### `S` — Estado global (State)
Guarda TODOS los datos cargados en memoria y la configuración de la sesión actual.
```js
const S = {
  motos: [], clientes: [], creds: [], pagos: [],      // datos de Firestore
  egresos: [], cuentas: [], movimientos: [],
  facturas: [], concesionarios: [], tareas: [],
  currentUser: null,            // el usuario logueado (incluye su .rol)
  page: 'dash',                 // página actual
  concesionarioActivo: null,    // null = "Todos"; o el id si trabaja en uno
  // ...filtros y orden de cada tabla (credSort, cliSort, etc.)
};
```
**Importante:** casi todo el código lee y escribe en `S`. Es el corazón compartido.
Si cambias la forma de un dato en `S`, puede afectar muchos módulos. Cuidado aquí.

### `PG` — Registro de Páginas (Pages)
Cada módulo de vista registra su función aquí. El router las llama por nombre.
```js
PG.dash = function(){ return '<...html...>'; };
PG.clientes = function(){ return '<...html...>'; };
```

### `DB` — Acceso a Firestore (Database)
Todas las funciones que leen/escriben en la base de datos. Centralizado aquí.
```js
DB.getUsuarios  = function(){ ... };
DB.saveUsuario  = function(uid, data){ ... };
DB.deleteUsuario= function(uid){ ... };
// ...una por cada operación de cada colección
```
**Regla:** si necesitas tocar la base de datos, hazlo a través de `DB`,
no escribas llamadas a Firestore sueltas por ahí. Mantiene todo en un lugar.

---

## 5. Cómo funciona la navegación (el router)

1. El usuario hace clic en el sidebar → se llama `nav('creditos')`.
2. `nav()` (en `pagasi-app.js`) busca `PG.creditos()` y obtiene su HTML.
3. Inserta ese HTML en el área principal de la pantalla.
4. `renderSidebar()` redibuja el menú lateral marcando la página activa.

> **Lección aprendida:** el sidebar y el dashboard se generan por JavaScript
> (`renderSidebar()` y `PG.dash()`), NO desde el HTML estático de `admin.html`.
> Si editas el HTML estático del sidebar, el JS lo sobreescribe al cargar.
> **Para cambiar el sidebar o el dashboard, edita el JavaScript, no el HTML.**

---

## 6. Orden de carga de scripts (en `admin.html`)

El orden importa porque los módulos dependen del núcleo. Secuencia:

1. **Librerías Firebase** (app, auth, firestore, storage) — desde CDN
2. **Chart.js** — desde CDN
3. **`assets/pagasi-app.js`** — el núcleo (define `S`, `PG`, `DB`, `nav`)
4. **Todos los `logic/*.js`** — la lógica de negocio
5. **Todos los `modules/*.js`** — las vistas

Si agregas un módulo nuevo, su `<script>` debe ir DESPUÉS del núcleo.

---

## 7. Las colecciones de Firestore (la base de datos)

| Colección | Qué guarda |
|-----------|-----------|
| `usuarios` | Cuentas del sistema y su `rol`. **(Sensible: define permisos)** |
| `clientes` | Datos de los clientes |
| `motos` | Inventario de motocicletas |
| `creditos` | Solicitudes y créditos otorgados |
| `pagos` | Pagos de cuotas |
| `facturas` | Facturas emitidas |
| `cuentas` | Cuentas de tesorería (bancos, caja) |
| `movimientos` | Movimientos de cuentas (ingresos/egresos) |
| `cuentasPendientes` | Cuentas por cobrar/pagar pendientes |
| `egresos` | Gastos del negocio |
| `concesionarios` | Concesionarios asociados |
| `comisiones` | (derivadas de ventas/cobranzas) |
| `tareas` | Tareas del Centro de Trabajo |
| `invitaciones` | Invitaciones para crear cuentas |
| `config` | Configuración del sistema |

El ID del documento en `usuarios` es el UID de Firebase Auth del usuario.

---

## 8. Roles y permisos

Los roles viven en el campo `rol` de cada documento de `usuarios`:
- **`Administrador`** — acceso total
- **`Vendedor Concesionario`** — acceso limitado a su concesionario
- (otros roles de empleado intermedios)

**IMPORTANTE — doble capa de permisos:**
1. **En el cliente (JS):** funciones como `isAdminUser()`, `hasModuleAccess()`
   controlan qué se MUESTRA. Esto es solo cosmético: se puede saltar.
2. **En el servidor (Firestore Rules):** es la seguridad REAL. Ver `docs/SEGURIDAD.md`.

Nunca confíes solo en la capa del cliente para proteger datos.

---

## 9. El motor contable (lo más delicado)

`logic/credito-ledger.js` es el **motor de cálculo de créditos**: calcula el
calendario de cuotas y lleva el registro de eventos (ledger). Es código "puro"
(sin tocar Firebase), lo cual permite probarlo de forma aislada.

`tests/credito-ledger.test.js` y `tests/financial-audit.test.js` verifican que
los cálculos de dinero sean correctos.

> **Regla de oro:** antes de modificar cualquier cálculo financiero, corre los tests.
> Después de modificarlo, vuelve a correrlos. Ver sección 11.

---

## 10. Cómo agregar un módulo nuevo (receta)

1. Crea `logic/mimodulo.js` con la lógica (funciones auxiliares, cálculos).
2. Crea `modules/mimodulo.js` con la vista: `PG.mimodulo = function(){ return '<html>'; };`
3. Agrega ambos `<script>` en `admin.html` DESPUÉS del núcleo (orden: logic antes que modules).
4. Agrega la entrada al menú del sidebar (en `renderSidebar()` dentro de `pagasi-app.js`)
   y, si aplica, su icono en `PG_NAVICONS`.
5. Si usa datos nuevos, agrega los métodos `DB.xxx` correspondientes.
6. Prueba navegando a la pantalla nueva.

---

## 11. Cómo trabajar sin romper nada (flujo seguro)

1. **Antes de cambiar:** identifica si tocas vista (`modules/`) o lógica (`logic/`).
2. **Valida la sintaxis** de cada archivo JS que cambies:
   ```
   node -c logic/creditos.js
   ```
3. **Si tocaste cálculos financieros, corre los tests:**
   ```
   node tests/credito-ledger.test.js
   node tests/financial-audit.test.js
   ```
4. **Cuando subas a GitHub:** sube la CARPETA COMPLETA, no archivos sueltos.
   Los cambios suelen estar repartidos en varios archivos (.css, .js de varios módulos).
5. **Versión de caché:** si cambiaste el CSS, actualiza el `?v=` del enlace al CSS
   en `admin.html` para que los navegadores carguen la versión nueva.

---

## 12. Convenciones de estilo visual (sinergia)

- Colores principales: azul `#2563EB` (primario), verde `#00B876` (éxito),
  rojo `#E8335A` (alerta/mora), ámbar `#BA7517` (advertencia).
- Las tarjetas usan la clase `.card` o `.stat` (radio redondeado, sombra suave).
- Los badges de estado usan `.bdg` + color (`.b-g`, `.b-r`, `.b-a`, `.b-b`).
- Iconos de menú: SVG en `PG_NAVICONS`. Iconos de modal: SVG en `MODAL_ICONS` + `setMicon()`.
- Evitar rayas de color laterales en tarjetas (`border-left`/`border-top` de color):
  rompen la consistencia. Usar badges para comunicar estado.

---

## 13. Puntos de atención conocidos (deuda técnica)

Honestamente, para futuras mejoras:
- **Archivos grandes:** `logic/creditos.js` (~2500 líneas), `clientes.js`, `usuarios.js`
  son grandes y difíciles de mantener. Candidatos a dividirse en piezas más chicas.
- **Estado global muy usado:** `S.` se usa ~1100 veces. Funciona, pero acopla los
  módulos entre sí. Cambiar la forma de un dato en `S` puede tener efectos lejanos.
- **Tests parciales:** solo la parte contable (ledger) tiene pruebas. Pagos,
  comisiones y cobranza también tocan dinero y se beneficiarían de tests.

Ninguno de estos es urgente; son mejoras de mantenibilidad a futuro.
