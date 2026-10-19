# Fórmulas de Pagasi

*19 de octubre de 2026 · main de la 18, commit 1f61ca0. Versión navegable: https://claude.ai/artifact/2187RuuSJhm8LjgFsi97zN*

Todo lo que el sistema calcula con números, dónde vive cada fórmula (archivo:línea) y con qué valores trabaja. Los valores marcados *(Configuración)* se leen de Firestore y mandan sobre el código.

**Valores en la base el 19-oct-2026:** `config/plan` igual en 18 y 26 desde el 10-jul-2026 (plazo 12, factor 2,102343, inicial 0,45, tasaMensual 14,11, apy 413,34, diasGracia 5, moraPct 2,5). `catalogo/_condiciones` en la 26: apy 500, seguroPct 0, inicialMin 40, inicialMax 60, plazos [6, 9, 12] (15-oct-2026); la 18 no tiene el documento y usa el respaldo del código, que es igual. `config/tasa`: USD BCV 881,07 · EUR BCV 991,16 · Binance 1.003. `config/score` y `config/facturacion` no existen en ninguna base: rigen los valores del código.

## 1. La cuota del crédito — `logic/financiero.js`

Hay tres formas de llegar a la cuota, según el modo que elija el asistente de crédito. Desde el 15 de octubre la cuota de los créditos nuevos sale del plan del catálogo (sección 2) y se puede editar a mano.

| Fórmula | Dónde | Qué calcula | Expresión y valores |
|---|---|---|---|
| Plan global (factor) | financiero.js:2-15 | Inicial, financiado, total y cuota con el factor del plan. | `ini = precio × inicial% · fin = precio − ini · total = fin × factor · cuotaM = total / plazo · cuotaQ = cuotaM / 2 · totalPagado = ini + total` *(Configuración)* plan: plazo 12, factor 2,1023, inicial 45% |
| Cuota francesa | financiero.js:16-23 | Cuota fija dada una tasa por período. | `cuota = pv × i / (1 − (1+i)^−n)`; si la tasa es 0: `pv / n` |
| Tasa implícita | financiero.js:24-35 | La tasa quincenal que hace que una cuota amortice el financiado (por bisección). | 80 iteraciones, tolerancia 1e-7. Si `cuota × n ≤ financiado`, tasa 0. |
| Plan a mano | financiero.js:36-51 | Cuando el vendedor escribe la cuota. | `fin = precio − ini · total = cuota × (plazo × 2) · factor = total / fin · APY = ((1 + tasaQ)^24 − 1) × 100` |
| Plan por APY | financiero.js:53-69 | Cuota a partir de un APY objetivo. | `tasaQ = (1 + APY/100)^(1/24) − 1 · cuotaQ = francesa(tasaQ, plazo×2, fin)` Inicial por defecto en este modo: 50% |
| APY mostrado | financiero.js:49 · calculadora.html:1496 | Rendimiento anual equivalente de la cuota. | `((1 + tasaQ)^24 − 1) × 100` · 24 quincenas al año |
| Cuota "editada" | financiero.js:321-327 | Marca el crédito si la cuota se apartó de la fórmula. | `\|cuota − cuotaFórmula\| ≥ 1` dólar. Se ve en Aprobaciones y en el detalle. |
| Chips de inicial | creditos.js:1972-1978 | Opciones que ofrece el asistente. | Mínimo del catálogo (40%) y 45 / 50 / 55 / 60 / 70%. Inicial menor al mínimo: solo avisa, no bloquea. |

## 2. Plan global y plan del catálogo — `assets/pagasi-app.js · assets/public/catalog.js`

| Fórmula | Dónde | Qué calcula | Expresión y valores |
|---|---|---|---|
| PLAN (por defecto) | pagasi-app.js:2660 | Valores del plan global si Configuración no dice otra cosa. | `plazo 12 · factor 2,102343 · inicial 0,45 · tasaMensual 14,11 · apy 413,34 · diasGracia 5 · moraPct 2,5` *(Configuración)* se lee de localStorage y luego de `config/plan` |
| Guardar plan | configuracion.js:177-205 | Lo que escribe Configuración. | Guarda el APY tal cual estaba: si cambian factor, plazo o inicial, **el APY guardado no se recalcula**. |
| Condiciones del catálogo | catalog.js:666 · financiero.js:303 | Respaldo si Firestore no tiene `catalogo/_condiciones`. | `apy 500 · seguro 0% · inicial mínima 40% · máxima 60% · plazos 6, 9, 12` *(Configuración)* (módulo Catálogo web, solo administrador) |
| Plan del catálogo (exacto) | catalog.js:697-707 | La cuota de la web y, desde el 15-oct, la del crédito. | `cuotas = meses × 2 · inicial = precio × pct · financiado = precio − inicial · tasaQ = (1 + apy/100)^(1/24) − 1 · quincenal = financiado × tasaQ / (1 − (1+tasaQ)^−cuotas)` |
| Redondeo de la web | catalog.js:712-718 | Lo que se muestra y se guarda. | Todo **hacia arriba** al dólar: `⌈x⌉` en cuota e inicial; `financiado = ⌈precio⌉ − ⌈inicial⌉`; `total = cuota × cuotas`. La cuota se calcula con el financiado exacto; el financiado que se muestra sale de los redondeados. |
| Plan del catálogo en el crédito | financiero.js:307-317 | Cómo el asistente aplica la fórmula de la web. | Plazo por defecto: el último de la lista (12). Inicial: la escrita; si está vacía, la mínima (40%). |
| Validación de condiciones | catalog.js:684-695 | Rangos aceptados al guardar. | `0 < apy < 5000 · 0 ≤ seguro < 50 · 0 < inicialMin < 100 · inicialMax ≥ inicialMin · plazos de 1 a 60` |

## 3. Detalle del crédito y listados — `logic/pagos.js (openAmort) · modules/creditos.js · assets/pagasi-app.js`

El modal "Detalle del Crédito" está en logic/pagos.js, no en el módulo de créditos. Estas son las cifras que se ven ahí y en el listado.

| Cifra | Dónde | Expresión | Notas |
|---|---|---|---|
| Total financiado | pagos.js:538 | `(precioBaseReal \|\| precio) − inicial` | El que Adam llama "el del sistema". |
| Monto total a pagar | pagos.js:411, 539 | `c.total` | Suma de las cuotas. No incluye la inicial. |
| Intereses (spread) | pagos.js:414 | `max(0, total − precioBase)` | Resta el precio completo, no el financiado. **[Diferencia 7]** |
| ROI | pagos.js:546 | `(total − financiado) / financiado × 100` | Aquí sí resta el financiado. |
| Inicial % | pagos.js:537 | `round(inicial / precioBase × 100)` |  |
| Cuota mensual | pagos.js:454 | `cuotaM \|\| cuotaMensual \|\| cuotaQ × 2` |  |
| APY | pagos.js:451 | `c.apy → c.plan.apy → PLAN.apy` | Con dos decimales. |
| Ratio cuota / ingreso | pagos.js:523 | `round(cuotaMensual / ingreso × 100)` | Rojo si > 40%, ámbar si > 25%. |
| % pagado (cuotas) | pagos.js:422 | `round(cuotasPagadas / totalCuotas × 100)` |  |
| Cuotas pagadas | pagasi-app.js:1609-1616 | `max(pagadoRegistrado, ⌊pagosConfirmados / cuota⌋)` | Acotado al total de cuotas. |
| Saldo pendiente | pagasi-app.js:1617 | `max(0, total − pagosConfirmados)` | Hay otras tres fórmulas de saldo. **[Diferencia 6]** |
| Fechas | pagos.js:404-429 | `finContrato = inicio + n × 15 días · próximoPago = inicio + (pagadas + 1) × 15 días` | Días restantes: hasta el fin del contrato. |
| Tabla de amortización | pagos.js:346-364 | `tQ = tasaMensual / 100 / 2 · interés = saldo × tQ · capital = cuota − interés` | Tasa simple ÷ 2, distinta del 12% ÷ 24 del contrato Protect. |
| Saldo por cuota (pantalla y PDF) | pagos.js:296-340 | Cada abono entra desde su cuota y el excedente pasa a las siguientes. | Residuos menores a $0,10 se tratan como 0. |
| % recaudado (listado) | creditos.js:28 | `(cobrado + iniciales) / (valorTotal + iniciales) × 100` |  |
| Spread del listado | creditos.js:31-35 | `Σ total − Σ precioBase`; ganado: `(cobrado + iniciales) − Σ precioBase` |  |
| Tasa de mora (listado) | creditos.js:38-40 | `enMora / activos × 100` | Sano ≤ 10, atención ≤ 25, estresada > 25. Insignia roja > 60 días, ámbar > 30. |
| "Financiado" de la fila | creditos.js:310 | `cuota × totalCuotas` | Aquí "financiado" significa suma de cuotas. |
| Cuotas de respaldo | pagasi-app.js:1559 | `totalCuotas \|\| plazo × 2 \|\| 20` | Otros sitios usan 24. **[Diferencia 5]** |

## 4. El ledger: cuotas, pagos y mora — `logic/credito-ledger.js`

Es la fuente de verdad para Mi cuenta, los PDF, el dashboard, los robots y el asistente de WhatsApp. El panel de Pagos repite parte de esta lógica (logic/pagos.js:1167-1287).

| Regla | Dónde | Expresión y valores |
|---|---|---|
| Fecha de cada cuota | ledger:95-96 | `vence_k = fecha del crédito + k × 15 días`, k = 1 … n. La primera a los 15 días, anclada a las 12:00. |
| Número de cuotas | ledger:37-39 | `totalCuotas \|\| plazo × 2 \|\| 0` |
| Días de gracia | ledger:92, 158 | `opts.diasGracia`, si no 5. Hasta el día 5 la cuota no cuenta como morosa. |
| Días de atraso | ledger:117-119, 163-165 | `atraso = round((hoy − vence) / día)`; `diasMora = atraso > gracia ? atraso : 0`. Se recalcula después de imputar: una cuota pagada tiene 0. |
| Pagos que cuentan | ledger:45-62 | Confirmados (o sin estado), no eliminados, sin la inicial; ordenados por fecha y luego por id. Con `excluirLiquidacion` se dejan fuera los LIQ-ANT. |
| Imputación | ledger:64-84 | A la cuota más vieja con saldo: `aplicado = min(restante, saldo)`. Pagada si saldo ≤ 0,001; si no, parcial. El excedente pasa a la siguiente; lo que sobra tras la última se descarta. |
| Descuento de liquidación | ledger:141-150 | Entra como un pago más de tipo `descuento_liquidacion` si hay liquidación activa. |
| Cuotas pagadas | ledger:168-172 | Consecutivas desde la 1 con saldo ≤ 0,001. |
| Estado | ledger:177-182 | `pagadas ≥ n → completado · maxMora > 0 → mora · si no → activo`. Conserva cancelado y recuperado. |
| Saldo y total pagado | ledger:174-175 | `Σ saldo de las cuotas` · `Σ pagado`. Redondeo a 2 decimales con `Number.EPSILON`. |
| Monto de originación | ledger:209 | `inicial + total` |

## 5. Mora en las pantallas — `logic/pagos.js · modules/dash.js · modules/pagos.js · modules/reportes.js`

Hoy el sistema **no cobra dinero de mora**: solo cuenta días. El porcentaje de mora de Configuración (2,5%) se guarda y se muestra, pero ninguna fórmula lo usa, y el campo `moraMonto` no lo calcula nadie.

| Regla | Dónde | Expresión y valores |
|---|---|---|
| Días de mora guardados (c.mora) | pagos.js:1434-1484 | `vence = inicio + (cuotasPagadas + 1) × 15 días · mora = días desde vence (si > 0) · estado = mora > gracia ? 'mora' : 'activo'` Cuenta desde el día 1; el estado cambia después de la gracia. **[Diferencia 2]** |
| Estados que no se tocan | pagos.js:1440 | completado, cancelado, recuperado, pendiente_revision, rechazado. |
| Dashboard | dash.js:14-98 | En mora si `c.mora > 0`. % de mora = `enMora / activos × 100`. Reparto: con compromiso = acuerdo; ilocalizable; > 30 días = crítico; resto regular. Tramos 1-15, 16-30, 31-60, +60. Monto vencido = Σ saldo de cuotas del ledger con vencimiento anterior a hoy. |
| Pantalla de Pagos | modules/pagos.js:108-204 | Vencida: cuota del ledger con `fechaVence < hoy`. Atrasado si hay vencidas o `c.mora > 0`. Días = `max(c.mora, díasLedger)`. Críticos > 30 días. Se listan los que vencen en 30 días o ya están en mora. |
| Reporte del contador | reportes.js:1403, 1532-1537 | Cuotas vencidas = `⌊mora / 15⌋`. Interés de mora **estimado** = `saldoVencido × 2,5%` fijo en el código. Niveles: > 30 crítico, > 14 alto, resto moderado. |
| Cuotas vencidas (otra) | pagasi-app.js:3653 | `⌈mora / 15⌉` **[Diferencia 4]** |
| Ficha del empleado | clientes.js:1066-1072 | Solo cuenta estado 'activo' (excluye 'mora'). Tramos ≤ 7, 8-30, > 30. |

## 6. Contratos — `logic/contratos-protect.js · logic/contratos-dra.js · logic/contratos.js`

El contrato se elige por la fecha del crédito: Protect desde el 7 de septiembre de 2026, DRA desde el 31 de agosto, y los anteriores imprimen su versión vieja. Ninguno toca la cuota: la cuota impresa es la que cobra el sistema.

| Fórmula | Dónde | Expresión y valores |
|---|---|---|
| Protect · tasa | contratos-protect.js:80-81 | `12% anual → i = 0,12 / 24 = 0,5% por quincena` *(fijo en código)* |
| Protect · despeje | contratos-protect.js:89-119 | `anualidad = (1 − (1+i)^−n) / i · MF = cuota × anualidad ← "Monto Financiado" · saldoPrecio = precio − inicial ← usa c.precio, no precioBaseReal · Protect = MF − saldoPrecio (mínimo 0) · intereses = cuota × n − MF · MTA = MF + intereses = suma de las cuotas` Ejemplo M-012: cuota 106 × 12 → MF 1.231,61; saldo 719; Protect 512,61; intereses 40,39; MTA 1.272. |
| Protect · cronograma | contratos-protect.js:106-115 | `interés_k = saldo × i`; la última cuota absorbe el redondeo; fecha k = fecha + k × 15 días. |
| Protect · mora y pagos | contratos-protect.js:319-323 | Gracia 5 días; mora desde el día 6, **no retroactiva**, **3% anual** simple. Orden de imputación 3.13: gastos → mora → intereses → capital vencido → cuota en curso (el sistema no imputa así). Pago en Bs al **EURO** del BCV. |
| Protect · reparto contable | metodologia.js:24-53 | `IVA 16% · base = Protect / 1,16 · iva = Protect − base`; cada cobro se reparte en proporción `cobrado / total`. |
| DRA · datos | contratos-dra.js:319-395 | "Precio" = inicial + cuotas (no el precio de la moto); `precioBs = total × tasaEuro`; `iniPct = inicial / total`; días = n × 15. Primera cuota a 15 días; gracia 5 días; mora **2% mensual retroactiva**; EURO BCV. |
| Arriendo-venta · canon | contratos.js:338-365 | `canonMensual = cuotaQ × 2 · totalCánones = canon × plazoMeses · precioEjercicio = 1 canon`. Vence el último día hábil del mes. Mora 2,5% mensual, gracia 5 días. |
| Pagaré | contratos.js:664-668 | `monto = cuota × n` (si faltan datos: fin o total). Más de 5 días → 2,5% mensual "retroactivamente"; vencimiento anticipado con 4 cuotas o 60 días. |
| Agente de cobro | contratos.js:915-925 | `saldo = cuota × n · total = inicial + saldo · comisión = total − precio` ("Servicio de Asistencia Administrativa"). Recargo 2,5% mensual desde el día 5. |
| Fin de contrato (módulo) | modules/contratos.js:10-12 | `fecha + plazo × 30 días`; el resto del sistema usa n × 15. **[Diferencia 14]** |

## 7. Concesionarios y aliados — `logic/concesionarios.js · bot/aliados-resumen.js · aliados/portal.js`

| Fórmula | Dónde | Expresión y valores |
|---|---|---|
| Lo que puso Pagasi en la moto | concesionarios.js:888-895 · aliados-resumen.js:46-50 | `costoSalida = (precioBaseReal \|\| precio) − inicial`, nunca negativo. Es lo que se descuenta del depósito de la sede, aunque el saldo quede negativo. |
| Saldo del depósito | concesionarios.js:897-907 | `enviado = Σ anticipos · consumido = Σ costoSalida (sin cancelados) · saldo = enviado − consumido`. En el portal solo cuentan las compañías con anticipos cargados. |
| Volumen del mes del aliado | aliados-resumen.js:88-94 | `Σ fin` de las ventas del mes (sin canceladas ni pendientes); `fin = c.fin \|\| costoSalida`. |
| Niveles | aliados-resumen.js:26-39 · portal.js:16 | Bronce desde $0 → 1,0% · Plata desde $10.000 → 1,5% · Oro desde $25.000 → 2,0% · Diamante desde $50.000 → 2,5%. Sobre el volumen del mes. |
| Calidad y multiplicador | aliados-resumen.js:40, 96-98 | Cartera = ventas con más de 60 días y no completadas; atrasados = más de 30 días de atraso (sin gracia); `% = atrasados / cartera`. Multiplicador: < 5% → 110% · ≤ 10% → 100% · ≤ 15% → 75% · > 15% → 50%. |
| Comisión del mes | aliados-resumen.js:100, 136 | `base = volumen × pct nivel · comisión = base × multiplicador` ("estimada": no se paga desde el sistema). |
| Comisión acumulada | aliados-resumen.js:124-125 | `Σ por mes volumen_m × pct(nivel_m)`, sin multiplicador. |
| Bono de inicio | aliados-resumen.js:131, 145 | Meta 20 solicitudes en los primeros 30 días → $2.000 (el monto solo está en el texto). El código lo deja activo 60 días. **[Diferencia 10]** |
| Grupo de sedes | aliados-resumen.js:24 | Las sedes con el mismo "Grupo de aliado" (o las 3 de EK por defecto) cuentan como un solo aliado: todo lo anterior se calcula sobre la unión. |

## 8. Comisiones de vendedores y cobradores — `logic/comisiones.js`

| Fórmula | Dónde | Expresión y valores |
|---|---|---|
| Valores por defecto | comisiones.js:2-6 | Venta: fijo $5 por crédito · Cobranza: fijo $1 por pago. *(Configuración)* por usuario (tipo fijo o porcentaje). |
| Por venta | comisiones.js:94-116 | `base = precioFinanciado \|\| precio`; si es porcentaje, `base × valor / 100`. Cuenta créditos no eliminados ni cancelados, por uid del vendedor o por nombre. |
| Por cobranza | comisiones.js:129-136 | Pago confirmado con ese cobrador: fijo, o `monto × valor / 100`. |
| Saldo y corte | comisiones.js:201-249, 473 | `saldo = total − egresos de categoría comisiones a su nombre`. Corte quincenal: días 1-15 y 16-fin. A pagar: `min(total del corte, saldo)`. La semana empieza el lunes. |
| Meta semanal del cobrador | clientes.js:1086-1090 | `esperado = Σ cuotaQ × 0,5 · meta = 80% del esperado · avance = cobrado / meta` |

## 9. Score Indexa — `logic/scores.js · assets/pagasi-app.js · logic/clientes.js`

El score es una etiqueta: no decide el estado del crédito (eso lo decide el rol de quien lo crea). Hay dos fórmulas de score que conviven.

| Fórmula | Dónde | Expresión y valores |
|---|---|---|
| Pesos y umbrales | pagasi-app.js:2665-2695 | Pesos f1 30 · f2 30 · f3 20 · f4 15 · f5 5. Umbrales: excelente 700 (aprobación automática), bueno 600, regular 500. Rechazo directo: ingreso < 250, ratio cuota/ingreso > 0,35, historial malo con deuda grave. Ratios: ideal 0,20 · aceptable 0,30 · alto 0,40 · muy alto 0,50. Ingreso base 250 a 3.000. *(Configuración)* (config/score) |
| f1 · historial | scores.js:331-345 | Base: ninguno 50, bueno 100, mora leve 35, malo 5. Deudas menores −12, graves −35. Banco +10 / −10. Cashea: nivel ≥ 5 → +15, ≥ 3 → +12, ≥ 2 → +7, ≥ 1 → +3; completado +15, al día +10, mora leve −15, mora grave −35; deuda > 500 −8, > 200 −4. |
| f2 · ingreso | scores.js:348-368 | `ratio = cuotaQ × 2 / max(ingreso, ingresoFamiliar)`; `f2 = min(100, (ingreso − 250) / (3000 − 250) × 100) × base/70`. Base por empleo: formal 80, público 70, independiente 60, comerciante 65, delivery 70, remesas 55, informal 30. Dependientes 1 → −8, 2 → −18, 3+ → −28. Vivienda propia +10, alquilada −8. Ratio ≤ ideal +12; ≤ aceptable 0; ≤ alto −18; ≤ muy alto −38; peor −60. |
| f3 · estabilidad | scores.js:371-376 | Base por empleo: formal 78, público 70, independiente 65, comerciante 68, delivery 70, remesas 60, informal 38. Antigüedad: 1 → 0, 2 → +10, 3 → +22, 5 → +35. Uso delivery +15, negocio +7. Remesas +8. |
| f4 · respaldo | scores.js:379-385 | Base 25; fiador +45; vivienda propia +15, familiar +5; banco +10 / −10. |
| f5 · origen | scores.js:388-393 | Base 50; referido +30, cliente anterior +22, redes +5; sin deudas +10, deudas graves −15; remesas +8. |
| Score final | scores.js:409-417 | `raw = Σ f_i × peso_i / Σ pesos × 10 · score = 300 + raw / 1000 × 550`, acotado 300 a 850; rechazo directo = 300. Decisión: ≥ 700 automática, ≥ 600 aprobar, ≥ 500 revisar, menor rechazar. |
| Score de respaldo | pagasi-app.js:1903-1919 | Si no hay score pero sí ingreso: ≥ 2000 → 720, ≥ 1000 → 650, ≥ 500 → 580, ≥ 300 → 500, ≥ 150 → 430, menos → 380. Formal/público +40; informal/independiente −20. |
| Score interno (ficha) | clientes.js:329-402 | Puntualidad, peor mora, historial y actividad reciente: `interno = fA × 0,35 + fB × 0,35 + fC × 0,20 + fD × 0,10`; `final = score × 0,4 + (300 + interno / 100 × 550) × 0,6`. **Sobrescribe el score Indexa** si cambia más de 10 puntos. **[Diferencia 9]** |

## 10. Catálogo web y calculadora — `assets/public/catalog.js · calculadora.html · logic/catalogo.js`

| Fórmula | Dónde | Expresión y valores |
|---|---|---|
| Plan mostrado en la web | catalog.js:697-718 | La de la sección 2: APY 500, inicial 40%, 12 meses, redondeo hacia arriba. "Montos referenciales". |
| Calculadora de vendedores | calculadora.html:1380-1641 | Mismas fórmulas duplicadas (cuota francesa, tasa implícita, APY). Deslizador de APY de 350 a 900, arranca en 500. Inicial personalizada hasta 90%. Tasa mensual mostrada: `((1 + apy/100)^(1/24) − 1) × 200`. |
| Excel del catálogo | catalogo.js:11, 348-350 | Plazos 6, 9 y 12 con la inicial mínima. |
| Asistente de ventas (WhatsApp e Instagram) | functions/lib/ventas.js:18-34 | Usa la misma `calcPlan` con la inicial mínima y el plazo más largo, y dice que son referenciales. |
| Comentarios desactualizados | catalog.js:662 · catalogo.js:23 | Hablan de 650% y seguro 4,5%; el código tiene 500 y 0. **[Diferencia 8]** |

## 11. Tasa de cambio — `logic/bcv-auto.js · bot/tasa-binance.js · modules/calculadora.js`

| Fórmula | Dónde | Expresión y valores |
|---|---|---|
| Tasa del día | pagasi-app.js:3880 · config/tasa | USD BCV redondeada a 2 decimales; también EUR BCV. Antes de cargar vale 1. *(Configuración)* |
| Binance P2P | tasa-binance.js:22-31 | 10 avisos de venta; se descartan los menores a 100 y mayores a 100.000; se toma el más caro que no pase de `mediana × 1,15`. Vigencia 25 horas. |
| En pagos y movimientos | pagos.js:109 … cuentas.js:1097 | Se guarda la tasa del momento (`tasaBs`); los montos siguen en USD. Cuentas permite tasa manual. |
| A bolívares | facturacion.js:537 · reportes.js:1222 · coromoto.js:977 | `monto × tasa`. Facturas y reporte del contador con USD BCV; los contratos DRA y Protect con **EURO** BCV. |
| Calculadora de tasas | modules/calculadora.js:415-621 | A USD: `Bs / tasa`, `EUR × eur / bcv`. Brecha: `(binance − bcv) / binance`; el dashboard la calcula sobre el BCV. **[Diferencia 12]** |

## 12. Liquidación anticipada y pagos parciales — `logic/pagos.js`

| Regla | Dónde | Expresión y valores |
|---|---|---|
| Saldo para liquidar | pagos.js:865-878 | `cuota × n − Σ pagosRegistrados`; menos de $0,05 cuenta como 0. |
| Monto final | pagos.js:929-976 | `final = saldo − descuento`; el descuento se escribe a mano. Si el descuento pasa del 40% del saldo, pide confirmación. No se liquidan completados, cancelados, recuperados, pendientes ni rechazados. |
| Imputación de la liquidación | pagos.js:1034-1056 | Primero el pago, luego el descuento, cuota a cuota. El crédito queda completado con cierre "liquidación anticipada". Si se borra el pago LIQ-ANT, se revierte. |
| Pago parcial sugerido | pagos.js:267-289 | Si `0 < saldoPróximaCuota < cuota`, sugiere lo que falta de esa cuota. |
| Acuerdos mensuales | pagos.js:1654-1683 | Solo Administrador o Gerente. Semáforo: vencido rojo, hoy amarillo, futuro verde. Siguiente fecha: +1 mes con tope de fin de mes. |

## 13. Reportes, dashboard y proyecciones — `modules/dash.js · modules/reportes.js · logic/reportes.js · modules/proyeccion.js`

| Cifra | Dónde | Expresión y valores |
|---|---|---|
| Cartera | dash.js:27 | `Σ saldo pendiente` de activos y en mora. |
| Ingresos y utilidad | dash.js:28-38 | `ingresos = iniciales + cuotas cobradas · utilidad = ingresos − egresos` (históricos). |
| Flujo del mes | dash.js:44-48 | `cuotas cobradas del mes − prestado del mes − gastos del mes`; prestado = egresos de compra de moto. |
| % de cobro | dash.js:102 · reportes.js:43 | `min(100, cobradoHistórico / cuotaEsperadaDeUnaQuincena × 100)`. Compara un histórico contra una sola quincena. |
| Margen y ROI histórico | modules/reportes.js:35, 140 | `utilidad / ingresos` · `utilidad / egresos` (≥ 50 verde). |
| Dinero en la calle | modules/reportes.js:54-59 | `Σ cuota × (n − pagadas)` |
| Variación mensual | modules/reportes.js:90-93 | `(actual − anterior) / anterior × 100`; con anterior 0 vale 100. |
| Proyección 12 meses | modules/reportes.js:98-122 | Cuotas pendientes con fecha `inicio + k × 15 días`, ignorando las anteriores a hoy − 90 días. |
| Panel de finanzas | logic/reportes.js:274-336 | `principal = precio − inicial` (usa c.precio) · `interés = total − principal` · cuotas repartidas en capital e interés con `ratio = principal / total` · `% recuperado = (total − por cobrar) / total`. |
| Proyección de fin de año | proyeccion.js:162-222 | `créditos = promedio mensual × meses restantes`; ingresos y egresos con promedio de 6 meses; `meses restantes = 12 − (mes actual + 1)`. |
| Antigüedad de la cartera | creditos.js:98-106 | Tramos < 90, < 180, < 365 días. |

## 14. Mi cuenta: racha y niveles del cliente — `micuenta.html · logic/gamificacion.js`

| Regla | Dónde | Expresión y valores |
|---|---|---|
| Gracia | micuenta.html:762 | 5 días fijos (no lee Configuración). **[Diferencia 3]** |
| Vencido para el cliente | micuenta.html:1593-1597 | Cuota con `fechaVence ≤ hoy`: la que vence hoy ya cuenta. El dashboard usa <. **[Diferencia 2]** |
| Progreso de la moto | micuenta.html:1841-1846 | `% = (inicial + pagado) / (inicial + total) × 100` |
| Niveles del cliente | gamificacion.js:19-24 | Bronce 0 cuotas · Plata 4 (vale $60) · Oro 12 (vale $150) · Platino 20 (vale $150). Son cuotas puntuales acumuladas. |
| Puntos y racha | gamificacion.js:38-137 | Adelantada 15 puntos, puntual 10, tarde 0. Puntual = pagado acumulado hasta el vencimiento + gracia; adelantada = hasta el día anterior al vencimiento. Racha = cortes puntuales consecutivos al final; se guarda el récord. |

## 15. Cumplimiento (AML) — `logic/aml.js`

| Regla | Dónde | Expresión y valores |
|---|---|---|
| Efectivo | aml.js:16, 220, 261 | Alerta si el método es efectivo y el monto ≥ **US$ 1.000**. |
| Ventana de alertas | aml.js:256-264 | 90 días. Toda liquidación anticipada genera alerta. |
| Listas vencidas | aml.js:270 | Más de 35 días sin revisar, solo clientes con crédito activo o en mora. |
| Coincidencias con listas | aml.js:53-77 | Por documento (cédula de 6+ dígitos más una palabra del nombre), por nombre completo (3+ palabras todas presentes) o parcial (2 de 2, o 3+ de 4+). PEP lo aprueba el Oficial de Cumplimiento; no hay puntaje numérico de riesgo. |

## 16. Recordatorios y mensajería — `logic/whatsapp.js · functions/lib/recordatorios.js · bot/`

| Regla | Dónde | Expresión y valores |
|---|---|---|
| Grupos de la cola | whatsapp.js:76 | Por días a la primera cuota con saldo: −2 a −1 próximas · 0 hoy · 1 a 5 gracia · 6 a 10 atrasadas · > 10 cobrador. Gracia fija 5. |
| Envío automático | recordatorios.js:18 · index.js | Solo los días exactos −2, 0, +3 y +6, a las 8:30 am Caracas. El grupo "cobrador" no se envía. Clave contra repetidos: empresa_crédito_cuota_tipo. |
| Ventanas de respuesta | whatsapp.js:215 · procesar.js:232 | WhatsApp 24 h; Instagram 7 días (pasadas 24 h, como agente humano). |
| Avisos por Telegram (apagados) | bot/avisos-cuotas.js:59-61 | Aviso 3 días antes, crítico > 30 días. **[Diferencia 11]** |

## 17. Impuestos e indicadores contables — `modules/reportes.js · logic/facturacion.js · logic/coromoto.js`

| Fórmula | Dónde | Expresión y valores |
|---|---|---|
| IVA e IGTF en el reporte del contador | reportes.js:1276-1408, 1496 | IVA 16% e IGTF 3% fijos. `base = monto / 1,16 · iva = monto − base` solo sobre cuotas; IGTF `monto × 3%` si es Sujeto Pasivo Especial y paga en divisas; crédito fiscal de la moto `p − p / 1,16`; ISLR provisión `max(0, utilidad × 12 × 34%)`. |
| IVA e IGTF en facturación | facturacion.js:350-367, 783-813 | Factura: `base = monto / ((1 + iva)(1 + igtf)) · igtf = (base + iva) × alícuota`. Libro SENIAT: `base = total / (1 + iva) · igtf = total × alícuota`. Alícuotas de Configuración (16 y 3; IVA apagado por defecto). **[Diferencia 13]** |
| Indicadores de referencia (Coromoto) | coromoto.js:609-629 | Razón corriente ≥ 1,5 · prueba ácida ≥ 1 · efectivo ≥ 0,3 · solvencia ≥ 1,5 · endeudamiento ≤ 60% · apalancamiento ≤ 1,5 · autonomía ≥ 40% · días de cobro ≤ 60 · márgenes ≥ 30/15/10% · ROA ≥ 8% · ROE ≥ 15%. |

## Diferencias entre duplicados

La misma regla escrita en dos sitios con valores distintos. Ninguna rompe el sistema hoy, pero cada una es una pregunta que alguien va a hacer. Están en orden de cuánto dinero o cuánta confusión pueden causar.

| Dónde | Tasa de mora | Desde cuándo |
|---|---|---|
| Contrato Protect (desde 7-sep) | 3% anual | día 6, no retroactiva |
| Contrato DRA (31-ago a 6-sep) | 2% mensual | desde el vencimiento, retroactiva |
| Arriendo-venta, agente de cobro, pagaré | 2,5% mensual | día 5 |
| Reporte del contador (estimado) | 2,5% fijo | sobre lo vencido |
| Sistema | no cobra | solo cuenta días |

### 1. Mora en dinero: cuatro versiones y ninguna se cobra

Configuración dice 2,5% (y 5% en los planes extra). Ninguna fórmula lo usa y el monto de mora no se calcula. Los contratos dicen cosas distintas entre sí.

| Dónde | Tasa de mora | Desde cuándo |
|---|---|---|
| Contrato Protect (desde 7-sep) | 3% anual | día 6, no retroactiva |
| Contrato DRA (31-ago a 6-sep) | 2% mensual | desde el vencimiento, retroactiva |
| Arriendo-venta, agente de cobro, pagaré | 2,5% mensual | día 5 |
| Reporte del contador (estimado) | 2,5% fijo | sobre lo vencido |
| Sistema | no cobra | solo cuenta días |

### 2. Días de mora: desde el día 1 o desde el día 6

El campo guardado `c.mora` (dashboard, listados, Cobranza) cuenta desde el primer día de atraso. El estado "mora" y el ledger (Mi cuenta, PDF, robots) cuentan después de los 5 días de gracia. Además, la cuota que vence hoy ya es "vencida" en Mi cuenta y en los robots, pero no en el dashboard ni en Pagos.

### 3. Días de gracia: configurable en unos sitios, fijo en otros

La web lee los días de gracia de Configuración. Mi cuenta, WhatsApp, los robots y el ledger por defecto usan 5 fijos. Si alguien cambia la gracia en Configuración, la mitad del sistema no se entera.

### 4. Cuotas vencidas: redondeo hacia arriba o hacia abajo

La ficha del cliente calcula `⌈mora / 15⌉`; el reporte del contador `⌊mora / 15⌋`. Con 20 días de mora uno dice 2 cuotas y el otro 1.

### 5. Total de cuotas cuando falta el dato

20 en la función central, 24 en listados y gráficas, 0 en el ledger y 12 × 2 en los contratos. Solo afecta créditos viejos sin el campo guardado.

### 6. Saldo pendiente: cuatro fórmulas

`total − pagos confirmados` (detalle y dashboard) · `cuota × n − pagos registrados` (liquidación) · suma de saldos del ledger (Mi cuenta, PDF) · `cuota × (n − pagadas)` (reportes). Con pagos parciales o editados dan centavos distintos.

### 7. "Intereses" y "spread": tres bases distintas

El detalle y los listados restan el **precio completo** al total de cuotas (por eso M-012 muestra "intereses $36" en una moto que paga $553 de más). El ROI del mismo detalle resta el **financiado**. El panel de finanzas resta `precio − inicial` pero usando `c.precio` en vez de `precioBaseReal`.

### 8. APY: 413 guardado, 500 en el catálogo, 905 real

El plan global tiene APY 413,34 y no se recalcula al cambiar el plan. El catálogo usa 500 y redondea la cuota hacia arriba. El crédito guarda el APY implícito de la cuota final (si la cuota se editó, puede ser 900+). Los comentarios del código todavía dicen 650% y seguro 4,5%.

### 9. Score: tres tablas de umbrales y dos fórmulas

Configuración 700 / 600 / 500; etiquetas de pantalla 750 / 625 / 450; ficha del cliente 700 / 580 / 450. La ficha además recalcula un "score interno" con otra fórmula y **sobrescribe el score Indexa** guardado si cambia más de 10 puntos.

### 10. Bono del aliado: 30 o 60 días

El texto promete el bono por 20 solicitudes en los primeros 30 días; el código lo deja activo 60 días.

### 11. Aviso preventivo: 2 o 3 días antes

WhatsApp avisa 2 días antes del vencimiento; los avisos de Telegram (hoy apagados) estaban a 3.

### 12. Brecha cambiaria: sobre BCV o sobre Binance

El dashboard la calcula sobre el BCV; la calculadora de tasas sobre Binance. Son porcentajes distintos para la misma brecha.

### 13. IGTF: tres convenciones

Dentro del total y sobre base más IVA (factura); encima del total (libro SENIAT); sobre el bruto con el IVA siempre en 16% (reporte del contador).

### 14. Fin del contrato: 30 días por mes o 15 por cuota

El módulo de Contratos calcula el vencimiento con `plazo × 30` días; el detalle, el ledger y los contratos usan `n × 15`. Un crédito de 12 meses termina 5 días antes en un sitio que en el otro.

