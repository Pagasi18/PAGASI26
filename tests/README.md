# Pruebas automáticas

Suites de regresión que cargan los módulos reales del app en Node con un
entorno simulado (sin Firebase, sin navegador). Usan fechas RELATIVAS al
día real porque los módulos llaman a `new Date()`.

```bash
node tests/run.js          # corre todas las suites
node tests/t_cobranza.js   # una sola
```

- `t_acuerdos.js`  — acuerdos mensuales de cobranza (semáforo, rodar fecha, promesas, conciliación)
- `t_cobranza.js`  — pestañas Mora Regular / Críticos / Ilocalizables / Mora Total, "vence hoy ≠ mora",
                     tipo de pago en el registro, exportador CSV/PDF (usa el CreditoLedger real)
- `t_coromoto.js`  — libro contable Coromoto (diario cuadrado, ESF/ER/Flujo, períodos, mapeo, impresión)
- `t_auditoria.js` — Auditoría de Datos (nombres normalizados, acción segura "usar el nombre del crédito")

Una prueba que falla imprime `FALLA ...` y el corredor termina con código 1.

## Ventas móviles en un navegador real

Con Playwright instalado y Google Chrome disponible:

```bash
node tests/mobile-ventas.cjs
```

Prueba teléfonos de 320 y 390 px, teléfono horizontal, tablet y escritorio.
Completa la solicitud con un empleado y un vendedor de concesionario; comprueba
el estado final, la inicial sin duplicados, permisos del menú, validación,
navegación Atrás, captura de documentos y posición del botón con teclado simulado.
Verifica el perfil por bloques, la apertura automática del campo pendiente,
la conservación de datos al editar y cambiar de tamaño, la revisión del plan y
la confirmación del guardado con acceso a la solicitud. Comprueba también que las
estadísticas del inicio sigan disponibles al desplegarlas.
La navegación móvil se prueba tocando la barra y el menú de herramientas:
búsqueda, retorno con Atrás, cierre con Escape, foco, tamaños táctiles, permisos
actualizados, acceso de administrador y cierre de sesión.
También revisa la ausencia de desbordes y el tamaño de los campos. Guarda capturas
y un informe en `../output/movil-ventas/despues` (configurable con
`PAGASI_MOBILE_OUTPUT`). Usa exclusivamente Firebase ficticio en memoria y bloquea
las conexiones a las bases reales. `--audit` permite registrar una versión anterior.
