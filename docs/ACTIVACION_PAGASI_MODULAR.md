# Pagasi Modular - Documento de Activacion

## 1. Que es esta version

Esta version es la app Pagasi separada por archivos para que sea mantenible, sin cambiar la base del negocio:

- Sigue siendo HTML, CSS y JavaScript vanilla.
- Sigue usando Firebase Firestore como fuente principal de datos.
- Sigue usando Firebase Auth para usuarios.
- Sigue usando Firebase Storage para documentos cuando esta disponible.
- La logica financiera existente no fue reemplazada.
- Se agrego un motor contable aislado para auditoria futura de creditos.

Archivo principal:

- `admin.html`

Archivos principales de soporte:

- `assets/pagasi.css`
- `assets/pagasi-app.js`
- `vendor/firebase-app-compat.js`
- `vendor/firebase-auth-compat.js`
- `vendor/firebase-firestore-compat.js`

Carpetas importantes:

- `logic/`: logica de negocio.
- `modules/`: vistas/pantallas.
- `tests/`: pruebas automaticas de formulas y motor contable.

## 2. Donde esta la version lista

Ruta local de trabajo:

`C:\Users\abrah\Documents\Codex\2026-05-19\files-mentioned-by-the-user-admin\pagasi-modular`

El archivo original en Descargas no debe tocarse directamente:

`C:\Users\abrah\Downloads\admin (3).html`

## 3. Que se optimizo

Antes, casi todo estaba en un solo archivo gigante. Ahora la app esta dividida asi:

### Nucleo

- `assets/pagasi-app.js`

Contiene:

- configuracion Firebase
- helpers globales
- estado global `S`
- roles/permisos base
- navegacion
- login/init
- utilidades compartidas

### Logica financiera y creditos

- `logic/financiero.js`
- `logic/creditos.js`
- `logic/credito-ledger.js`
- `logic/pagos.js`

Contienen:

- calculos de planes
- wizard de credito
- edicion de solicitudes sin firma
- confirmacion de contrato
- pagos
- mora
- liquidacion anticipada
- motor contable aislado

### Operacion

- `logic/clientes.js`
- `logic/motos.js`
- `logic/moto-pagos.js`
- `logic/egresos.js`
- `logic/cuentas.js`
- `logic/comisiones.js`
- `logic/facturacion.js`
- `logic/contratos.js`
- `logic/reportes.js`
- `logic/charts.js`
- `logic/documentos.js`
- `logic/usuarios.js`
- `logic/configuracion.js`
- `logic/concesionarios.js`
- `logic/aprobaciones.js`
- `logic/notificaciones.js`
- `logic/backups.js`
- `logic/scores.js`
- `logic/centro.js`

### Pantallas

Cada pantalla queda en `modules/`, por ejemplo:

- `modules/creditos.js`
- `modules/pagos.js`
- `modules/clientes.js`
- `modules/motos.js`
- `modules/cuentas.js`
- `modules/reportes.js`
- `modules/config.js`

## 4. Cambios importantes en creditos

### Credito sin confirmar

Cuando el credito no esta confirmado:

- el boton `Editar` abre el wizard completo
- los datos cargados se guardan como borrador en `wizardDraft`
- al volver a editar, se precargan los campos guardados

### Credito confirmado

Cuando el contrato esta confirmado:

- el boton `Editar` ya no abre el wizard completo
- solo abre el modal limitado de edicion
- permite cambiar datos operativos como estado, cobrador, fecha, GPS y notas

Esto protege la logica contable.

## 5. Motor contable nuevo

Archivo:

`logic/credito-ledger.js`

Por ahora esta aislado. No reemplaza la app actual.

Sirve para:

- generar calendario de cuotas
- calcular cuotas pagadas
- calcular saldo pendiente
- calcular saldo de proxima cuota
- detectar mora por cuota
- generar ledger/eventos del credito

El objetivo siguiente es comparar este motor contra los datos reales actuales antes de migrar pantallas o calculos.

## 6. Como probar antes de activar

Abrir PowerShell en esta carpeta:

`C:\Users\abrah\Documents\Codex\2026-05-19\files-mentioned-by-the-user-admin\pagasi-modular`

Usar este Node:

`C:\Users\abrah\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`

### 6.1. Probar auditoria financiera

```powershell
$node='C:\Users\abrah\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests\financial-audit.test.js
```

Resultado esperado:

```text
Financial audit tests passed.
```

### 6.2. Probar motor contable

```powershell
$node='C:\Users\abrah\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node tests\credito-ledger.test.js
```

Resultado esperado:

```text
Credito ledger tests passed.
```

### 6.3. Probar sintaxis completa

```powershell
$node='C:\Users\abrah\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$root='C:\Users\abrah\Documents\Codex\2026-05-19\files-mentioned-by-the-user-admin\pagasi-modular'
$files = @("$root\assets\pagasi-app.js") + (Get-ChildItem -LiteralPath "$root\logic" -Filter '*.js' | Sort-Object Name | ForEach-Object FullName) + (Get-ChildItem -LiteralPath "$root\modules" -Filter '*.js' | Sort-Object Name | ForEach-Object FullName) + (Get-ChildItem -LiteralPath "$root\tests" -Filter '*.js' | Sort-Object Name | ForEach-Object FullName)
$ok=0; $bad=0
foreach($f in $files){
  & $node --check $f
  if($LASTEXITCODE -eq 0){ $ok++ } else { $bad++; Write-Host "FAILED $f" }
}
Write-Host "Checked=$($files.Count) OK=$ok Failed=$bad"
```

Resultado esperado actual:

```text
Checked=45 OK=45 Failed=0
```

## 7. Como abrirlo localmente

Como es una app estatica, puedes abrir:

`C:\Users\abrah\Documents\Codex\2026-05-19\files-mentioned-by-the-user-admin\pagasi-modular\admin.html`

Recomendado:

- abrirlo con un servidor local o con Firebase Hosting
- no depender de abrir el archivo directo si Firebase Auth exige dominio autorizado

## 8. Como activarlo en produccion

Hay dos caminos.

## Opcion A - Subir a Firebase Hosting

Esta es la opcion recomendada.

### Paso 1. Hacer backup de produccion

Antes de subir:

- guardar copia del `admin.html` actual
- guardar copia de cualquier carpeta actual de assets/scripts
- exportar backup desde Pagasi si esta disponible
- confirmar que nadie esta haciendo cambios criticos en ese momento

### Paso 2. Preparar carpeta publica

La carpeta que debe publicarse es:

`pagasi-modular`

Debe incluir:

- `admin.html`
- `assets/`
- `logic/`
- `modules/`
- `vendor/`

No es obligatorio subir:

- `tests/`
- `docs/`

Pero se pueden conservar fuera de produccion.

### Paso 3. Verificar orden de scripts

En `admin.html`, el orden importante es:

```html
<script src="assets/pagasi-app.js"></script>
<script src="logic/financiero.js"></script>
...
<script src="logic/creditos.js"></script>
<script src="logic/credito-ledger.js"></script>
<script src="logic/pagos.js"></script>
...
<script src="modules/creditos.js"></script>
```

La regla:

- primero nucleo
- luego logic
- luego modules

### Paso 4. Subir

Si usas Firebase CLI:

```powershell
firebase deploy --only hosting
```

La configuracion de `firebase.json` debe apuntar al directorio publicado correcto.

Ejemplo:

```json
{
  "hosting": {
    "public": "pagasi-modular",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ]
  }
}
```

Si ya tienes otra estructura, no cambiarla a ciegas. Solo asegúrate de que `public` apunte a la carpeta donde estan `admin.html`, `assets`, `logic`, `modules` y `vendor`.

### Paso 5. Autorizar dominio

En Firebase Console:

1. Ir a Authentication.
2. Ir a Settings.
3. Ir a Authorized domains.
4. Confirmar que el dominio de la app esta autorizado.

Ejemplos:

- `pagasi-b859b.web.app`
- `pagasi-b859b.firebaseapp.com`
- tu dominio personalizado si existe

### Paso 6. Probar login

Probar:

- Administrador
- vendedor
- cobrador
- usuario con sede limitada

Confirmar:

- que entra
- que ve solo sus modulos
- que no puede eliminar si no tiene permiso

## Opcion B - Reemplazar archivos en el hosting actual

Si no usas Firebase CLI y subes archivos manualmente:

1. Hacer backup de la version actual.
2. Subir `admin.html`.
3. Subir carpetas completas:
   - `assets`
   - `logic`
   - `modules`
   - `vendor`
4. No subir archivos sueltos incompletos.
5. Limpiar cache del navegador.
6. Probar con ventana incognito.

## 9. Checklist funcional antes de decir "activo"

### Login y roles

- Admin entra correctamente.
- Usuario vendedor entra correctamente.
- Usuario cobrador entra correctamente.
- Usuario con una sola sede queda limitado a su sede.
- Usuario sin permiso de eliminar no puede eliminar.

### Creditos

- Crear credito rapido incompleto.
- Guardar solicitud.
- Editar antes de confirmar.
- Verificar que se precargan los valores.
- Cambiar plan o datos de moto.
- Guardar otra vez.
- Confirmar contrato.
- Despues de confirmar, editar abre solo modal limitado.

### Pagos

- Registrar pago normal.
- Registrar pago parcial.
- Registrar pago de mas de una cuota.
- Verificar avance de cuotas.
- Verificar saldo proxima cuota.
- Editar pago.
- Eliminar pago completo.
- Eliminar pago manteniendo amortizacion.

### Mora

- Revisar un credito vencido.
- Confirmar que pasa a mora despues de dias de gracia.
- Confirmar que vuelve a activo al pagar.
- Confirmar que completado/cancelado no queda en mora.

### Inventario

- Crear moto disponible.
- Usarla en credito.
- Confirmar que pasa a financiada.
- Recuperar moto si aplica.
- Eliminar moto y revisar egresos/movimientos asociados.

### Caja y cuentas

- Registrar pago y confirmar movimiento de deposito.
- Registrar egreso y confirmar movimiento de retiro.
- Hacer transferencia entre cuentas.
- Anular movimiento como administrador.

### Documentos

- Subir documento de cliente.
- Confirmar que queda en Firebase Storage.
- Reabrir cliente y verificar que sigue visible.

### Facturacion/recibos

- Generar recibo.
- Generar factura.
- Anular factura.
- Revisar libro SENIAT.

## 10. Como activar el motor contable nuevo

Actualmente `logic/credito-ledger.js` esta cargado, pero no reemplaza calculos actuales.

Esto es correcto para la primera fase.

Para activarlo de forma segura, el siguiente paso es crear una comparacion:

- saldo actual de la app
- saldo calculado por `CreditoLedger.generarEstadoCredito`
- diferencia
- alerta si no cuadra

No se recomienda reemplazar pagos/mora directamente sin comparar primero contra creditos reales.

## 11. Plan recomendado de migracion contable

### Fase 1 - Ya lista

- Motor contable aislado.
- Pruebas automaticas.
- Carga en `admin.html`.
- Sin cambios funcionales.

### Fase 2 - Diagnostico

Agregar vista interna para administradores:

- credito
- saldo actual
- saldo ledger
- cuotas pagadas actual
- cuotas pagadas ledger
- mora actual
- mora ledger
- diferencia

### Fase 3 - Correccion de datos

Si hay diferencias:

- revisar caso por caso
- corregir pagos duplicados
- corregir pagos eliminados
- corregir descuentos/liquidaciones
- no tocar masivamente sin respaldo

### Fase 4 - Activacion

Cuando el diagnostico este limpio:

- usar ledger como fuente principal para estados de cuenta
- usar ledger para mora
- usar ledger para reportes de cartera
- dejar campos guardados como cache, no como verdad final

## 12. Rollback

Si algo falla despues de activar la version modular:

1. Volver al backup anterior del hosting.
2. Restaurar `admin.html` anterior.
3. Restaurar carpetas anteriores si existian.
4. No borrar Firebase.
5. No borrar colecciones.

Esta version no requiere migracion destructiva de datos.

## 13. Estado actual de validacion

Validacion ejecutada:

```text
Credito ledger tests passed.
Financial audit tests passed.
Checked=45 OK=45 Failed=0
All local script refs exist
```

## 14. Recomendacion final

No activar a todos los concesionarios de golpe.

Orden recomendado:

1. Probar local.
2. Subir a un entorno de prueba.
3. Probar con una sede o usuario administrador.
4. Probar flujos de credito y pago.
5. Revisar saldos.
6. Activar al resto.

Pagasi ya tiene la estructura para crecer. El siguiente salto profesional es usar el motor contable como auditor interno antes de convertirlo en la fuente oficial de mora, saldo y estado de cuenta.
