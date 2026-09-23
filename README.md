# PAGASI 26, C.A. — sistema de crédito

Copia del sistema de PAGASI 18 para la compañía nueva. Arranca **sin créditos, sin pagos
y sin movimientos**: los créditos nuevos nacen aquí, numerados **M-001** en adelante.
PAGASI 18 se queda solo con la cobranza de los que ya existen, en su propia base y con
su propia serie (CRED-001).

Las dos compañías **no comparten nada**: base de datos distinta, repositorio distinto y
dirección distinta.

El árbol se arma con `preparar-clon-26.sh` desde la rama de PAGASI 18, así que no se
edita a mano: si hace falta rehacerlo, se vuelve a correr el script.

---

## Puesta en marcha, en orden

### 1. La llave de Firebase (sin esto no abre nada)

En Firebase: ⚙️ → *Configuración del proyecto* → *Tus apps* → app web (si no hay, crearla
con el botón `</>`). Copiar el bloque `firebaseConfig` y pegarlo en los **tres** archivos:

- `assets/pagasi-app.js` — el sistema
- `assets/public/request.js` — el formulario público de solicitudes
- `micuenta.html` — el portal del cliente

Buscar `FALTA_LA_LLAVE_DE_PAGASI_26`. Mientras diga eso, las tres páginas muestran un
cartel y **no dejan trabajar**, a propósito: antes abrían igual y lo que se escribía se
perdía al recargar.

### 2. Firebase: lo que hay que encender

Un proyecto nuevo viene con todo apagado.

| Dónde | Qué |
|---|---|
| Authentication → Sign-in method | **Correo y contraseña** (el equipo entra por aquí) |
| Authentication → Sign-in method | **Anónimo** — lo usa el formulario público para poder guardar la solicitud |
| Authentication → Sign-in method | **Teléfono (SMS)** — lo usa el portal del cliente |
| Authentication → Settings → Dominios autorizados | La dirección desde la que se sirve el sistema |
| Firestore → Reglas | Pegar `firestore.rules` y publicar |
| Storage → Reglas | Pegar `storage.rules` y publicar |

Las Reglas hay que pegarlas **a mano la primera vez**: el robot que las publica en PAGASI 18
compara contra un commit ya publicado, y aquí todavía no hay ninguno.

**Ojo con el plan:** en el plan gratis (Spark) **no se activa el almacenamiento de archivos**,
que es donde viven las cédulas y las fotos. Si se van a subir documentos, el proyecto tiene
que pasar a Blaze. El resto del sistema funciona igual en Spark.

### 3. El primer administrador (el huevo y la gallina)

Las Reglas exigen una ficha de empleado para escribir, y la ficha solo la puede crear un
administrador o una invitación. En una base vacía no hay ni lo uno ni lo otro: **la primera
ficha se siembra desde la consola**, que no pasa por las Reglas.

1. Authentication → *Add user*: correo y contraseña. Copiar el **UID** que queda.
2. Firestore → *Start collection* `usuarios` → documento con ese **UID exacto** como ID:

```
nombre  (string)  Adam
email   (string)  el mismo correo del paso 1
rol     (string)  Administrador
```

Con eso ya se entra al sistema y desde ahí se invita al resto, sin volver a tocar la consola.

### 4. Configuración (antes de vender)

- **Empresa:** nombre, RIF, registro mercantil, domicilio, teléfono, correo, banco, número
  de cuenta y billetera. Todo eso sale impreso en el contrato. Si falta algo, el contrato
  sale con rayas y el sistema avisa al imprimir.
- **Cuentas bancarias:** sin esto un pago se guarda pero no entra en ninguna cuenta.
- **Plan de pago y tasa:** si no se cargan, los primeros créditos se calculan con los
  valores de fábrica del código, que no tienen por qué ser los de esta compañía.

### 5. Prueba antes de abrirle a nadie

Un crédito de mentira: que salga **M-001**, contrato impreso (que diga PAGASI 26 y su RIF),
una cuota cobrada, que el dinero entre a la cuenta correcta, y borrarlo.

---

## El dominio

**Desde el 23-sep-2026, `pagasi.io` sirve a PAGASI 26** (este repositorio) y PAGASI 18 vive
en **`18.pagasi.io`**. El cambio se hizo de madrugada, en este orden — que es el que importa:

1. Crear en el DNS (Squarespace) el registro `CNAME 18 → pagasi18.github.io`.
2. En PAGASI 18, **cambiar** su archivo `CNAME` a `18.pagasi.io`. No se borra: borrarlo lo
   deja sin dominio propio.
3. Comprobar que `18.pagasi.io` responde.
4. Recién entonces, encender `pagasi.io` aquí.
5. En Firebase, autorizar los dominios nuevos en **los dos** proyectos (Authentication →
   Settings → Authorized domains). Sin eso el portal no manda el código por SMS.
6. Volver a publicar el Worker de Cloudflare, que lleva la lista de dominios permitidos.

El interruptor de este repositorio es el archivo **`.dominio-propio`**: mientras exista,
cada regeneración del clon vuelve a escribir `CNAME` con `pagasi.io`. Sin él, esta copia
vuelve a vivir en `pagasi18.github.io/PAGASI26/`.

**Las versiones de los archivos llevan `26-` delante** (`?v=26-AAAAMMDD-HHMM`). No es
decoración: las dos compañías tienen los mismos nombres de archivo, y sin ese prefijo el
navegador de quien entró a pagasi.io cuando era PAGASI 18 serviría de su caché el
JavaScript de la otra compañía — con su llave de Firebase, escribiendo en la base
equivocada y sin un solo error en pantalla.

**Ojo con GitHub Pages:** un repositorio **privado** solo publica con GitHub Pro. Con la
cuenta gratis hay que dejarlo público. Y aunque el repositorio sea privado, **la página
publicada la ve cualquiera**: lo privado es el código, no el sitio.

---

## Lo que NO viajó desde PAGASI 18

| | Por qué |
|---|---|
| Créditos, pagos, gastos, movimientos y la numeración | Es el punto de abrir una compañía nueva |
| El archivo `CNAME` de PAGASI 18 | Aquí se escribe el propio (`pagasi.io`) cuando existe `.dominio-propio` |
| Las 27 tareas programadas (`.github/workflows`) | Son la cobranza de PAGASI 18; corriendo desde aquí escribirían **en la base de PAGASI 18** |
| `reportes/` (13 MB) | Informes y documentos internos de PAGASI 18 |
| `bot/gps-instalados.json` | Datos reales de clientes |
| `assets/firma-vendedora.png` | Una firma manuscrita real, que ningún archivo usa |
| `docs/micodus-api.md` | El usuario, el identificador y equipos reales de la cuenta de GPS de PAGASI 18 |
| `tests/t_gpsbot.js` | Comprueba los horarios de un robot que aquí no existe |
| `tests/public-site.test.js` | Compara contra un commit del historial de PAGASI 18, que este repositorio no tiene |

Y lo que se cambió para que esto no pueda tocar a PAGASI 18:

- La serie de créditos es **M-001** (`CRED_PREFIJO` en `assets/pagasi-app.js`). Se pone al
  crear la compañía y no se vuelve a tocar: cambiarlo con créditos ya hechos parte la
  numeración en dos.
- Los robots de `bot/` **fallan** si nadie les dice a qué base hablar (`PAGASI_PROYECTO`).
  Antes llevaban el proyecto de PAGASI 18 escrito a mano.
- El Worker de Cloudflare se llama `pagasi26-bot`, no `pagasi-bot`: con el mismo nombre, un
  despliegue desde aquí **pisaba** el de PAGASI 18 y lo dejaba sin GPS ni Telegram. Y apunta
  a este repositorio, no al de 18.

## Pruebas

```
node tests/run.js
```
