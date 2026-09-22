# Seguridad de PAGASI

Resumen del modelo de seguridad del sistema y buenas prácticas.

---

## Las dos capas de seguridad

1. **Capa del cliente (JavaScript)** — funciones como `isAdminUser()`,
   `hasModuleAccess()`. Controlan qué se MUESTRA en pantalla.
   **No es seguridad real**: se puede saltar abriendo la consola del navegador.

2. **Capa del servidor (Firestore Rules)** — se ejecuta en los servidores de
   Google. **Es la seguridad REAL.** No se puede saltar.

> Nunca confíes solo en la capa del cliente para proteger datos sensibles.

---

## Reglas de Firestore aplicadas

Las reglas viven en la consola de Firebase (Firestore → Rules). Modelo actual:

- **Lectura/escritura:** requiere estar logueado (`request.auth != null`).
- **Colección `usuarios`:** solo el Administrador puede modificarla
  (evita que alguien se auto-ascienda de rol). Lectura permitida a logueados.
- **Borrado** de datos operativos (clientes, créditos, pagos, etc.):
  reservado solo al Administrador.
- **`config` e `invitaciones`:** solo Administrador escribe.
- **Por defecto:** todo lo no listado queda bloqueado.

El archivo de reglas de referencia está en `firestore.rules` (en la entrega).
Si lo modificas, pruébalo en el "Rules Playground" antes de publicar, y recuerda
que Firebase guarda versiones anteriores por si necesitas revertir.

---

## Sobre las llaves de Firebase en el código

El `apiKey` y demás config de Firebase aparecen en `pagasi-app.js`.
**Esto es normal y NO es una vulnerabilidad.** Las llaves de Firebase para web
son públicas por diseño; lo que protege los datos son las Reglas de Firestore,
no esconder las llaves.

---

## Sobre el código visible (GitHub / F12)

- El código del cliente (HTML/CSS/JS) **siempre es visible** con F12. Es así en
  toda app web; no se puede ni vale la pena ocultar. La seguridad no depende de eso.
- El repositorio en GitHub Pages es público (decisión tomada). Aceptable porque
  los datos están protegidos por las Reglas de Firestore.

---

## Pendientes / recomendaciones de seguridad

- **Registro de cuentas:** confirmar que solo se entra por invitación, no registro
  abierto a cualquiera. Revisar en Firebase → Authentication → Sign-in method.
- **Contraseñas fuertes** para todo el equipo.
- **Verificación en dos pasos (2FA)** al menos para la cuenta de Administrador.
- **No dejar sesiones abiertas** en computadoras compartidas.
- (Futuro) **Log de auditoría:** registrar quién hace cada cambio sensible
  (modificar pagos, borrar créditos). Muy recomendable para un sistema financiero.
