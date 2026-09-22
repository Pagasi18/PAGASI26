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
