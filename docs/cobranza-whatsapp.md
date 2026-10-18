# Cobranza por WhatsApp y ventas por Instagram

*18 de octubre de 2026.* Un asistente con dos caras y un solo servidor, y dos módulos en el panel (Adam, 18-oct: "Instagram aparte; en WhatsApp, ventas y cobranza"):
- **Módulo WhatsApp**, con dos áreas:
  - **Cobranza**: el cliente registrado. Recuerda las cuotas, responde lo que pregunta de su crédito y le pasa al equipo lo que no le toca. Sirve a las dos compañías (PAGASI 18 y PAGASI 26) con un solo número.
  - **Ventas**: quien escribe al WhatsApp y no es cliente (o escribe al número de ventas, si se configura `config/asistente.numeros`). El asistente de ventas responde con el catálogo y anota a quien quiere comprar como lead, ya con su teléfono.
- **Módulo Instagram** (permiso `instagram`, lo tienen Administrador, Gerente, Empleado y Vendedor): los mensajes directos de la cuenta de Pagasi, atendidos por el mismo asistente de ventas con el catálogo real de pagasi.io (precio, inicial y cuota con la misma fórmula de la web), las sedes y cómo solicitar. Quien quiere comprar queda como **lead**. Siempre en la 26.

Las dos pantallas comparten el motor (`modules/whatsapp.js`: lista, hilo, ficha, pestaña Asistente); `modules/instagram.js` es el módulo aparte. Cada canal se lee con su permiso: las Reglas exigen `where('canal','==',…)` en las listas y hay un índice compuesto `conversaciones (canal, actualizado desc)` creado en los dos proyectos el 18-oct.

## Las piezas

| Pieza | Dónde | Qué hace |
|---|---|---|
| Pantalla **Cobranza WhatsApp** | `modules/whatsapp.js`, `logic/whatsapp.js` | Hoy (la cola del día), Conversaciones (atender, devolver, promesa), Asistente (instrucciones, cómo pagar, estado) |
| Webhook `whatsappWebhook` | `functions/index.js` (proyecto **pagasi26-65ced**, us-east1) · `https://whatsappwebhook-xo5umdw5cq-ue.a.run.app` (también `https://us-east1-pagasi26-65ced.cloudfunctions.net/whatsappWebhook`) | GET: verificación de Meta · POST: recibe mensajes y estados · POST `/equipo`: el panel manda como equipo |
| Robot `recordatoriosWhatsApp` | `functions/index.js` | Todos los días 8:30 am (Caracas): plantillas 2 días antes, el día, al 3.º y al 6.º día de vencida |
| El cerebro | `functions/lib/cerebro.js` + `briefing.js` | Claude (`claude-sonnet-5-5`) con una herramienta `responder`: respuesta, promesa, resumen, handoff |
| El flujo | `functions/lib/procesar.js` | Dónde vive la conversación, de qué cliente es, qué se guarda, cuándo se calla; `procesarInstagram` para ventas |
| Ventas | `functions/lib/ventas.js` | El briefing de ventas: catálogo (`catalogo` + `_condiciones`), sedes (`concesionarios`), pasos de la solicitud, reglas (no aprobar, no pedir cédula, lead) |
| Meta | `functions/lib/meta.js` | Firma, verificación, parseo del aviso, envío de texto y plantillas, bajar medios |

## Dónde queda cada cosa

- La conversación vive en la compañía del cliente: el número se busca en `indice_clientes` de la 26 y luego de la 18. Un número que no es cliente queda en la 26 y pasa a una persona.
- `conversaciones/wa:+58414…` con sus `mensajes/{id de Meta}`. Usar el id de Meta como id del documento es lo que evita procesar dos veces un reenvío del webhook.
- Una imagen o PDF del cliente va a Storage (`comprobantes_whatsapp/<tel>/<id>`), crea un `comprobantes` pendiente con `origen: 'whatsapp'` (se confirma desde Pagos como los del portal) y marca la conversación con `atencion: 'comprobante'`.
- Auditoría en la 26: `webhooks_meta` (cada aviso crudo), `recordatorios/{empresa}_{crédito}_{cuota}_{tipo}` (cada envío, no se repite), `recordatorios_corridas` (el resultado de cada mañana).
- `config/asistente` (en la 26, lo lee el servidor): `instrucciones` (cobranza), `instruccionesVentas` (ventas, WhatsApp e Instagram), `datosPago`, `plantillas` (`{proximas, hoy, gracia, atrasadas}` con los nombres aprobados por Meta), `conectado` (WhatsApp), `telefono`, `numeros` opcional (`{ventas, cobranza}` si hay dos números), `instagram` (el usuario de la cuenta: con él el módulo Instagram deja de estar en demostración), `urlEquipo` opcional.
- Cada conversación lleva `canal` (`whatsapp` | `instagram`) y `area` (`cobranza` | `ventas`). Por WhatsApp hay una sola conversación por teléfono: el área es la del último mensaje (un cliente que escribe al número de ventas lo atiende ventas; un desconocido al de cobranza, también ventas).
- Instagram: conversaciones `ig:<IGSID>` en la 26 (`usuario`, `nombre`, sin cliente). Leads en `leads/{convId}` (`ig:…` o `wa:…`) con canal, nombre, ciudad, modelo, teléfono, `estado: 'nuevo'` (el equipo lo pasa a atendido). Los mensajes del equipo salen normal dentro de las 24 h y como agente humano (etiqueta HUMAN_AGENT, hay que pedirla en la app) hasta 7 días; después hay que esperar a que la persona vuelva a escribir.

## Reglas fijas del asistente (en el briefing, no se editan desde la pantalla)

Solo habla del crédito del cliente. No inventa montos: todo sale del ledger. No aprueba, descuenta,
refinancia ni promete. No pide cédula ni documentos. Nunca amenaza. Si el cliente se queja, pide
una persona, manda una imagen o dice que no puede pagar, se calla y avisa. Si dice cuándo paga,
queda como borrador de promesa para que el equipo lo confirme con un clic. Cuando una persona
toma la conversación (`modo: 'humano'`), el asistente no responde hasta que la devuelvan.

## Reglas fijas del asistente de ventas (Instagram)

Solo habla de las motos, los planes y cómo solicitar; si alguien pregunta por un crédito que ya
tiene, lo manda a Mi cuenta o al WhatsApp. Cifras únicamente del catálogo. No aprueba ni promete
entrega. No pide cédula ni documentos: para que un asesor llame basta nombre, ciudad, modelo y
WhatsApp, y eso queda como lead. Instrucciones extra del equipo en el panel (pestaña Asistente,
"Ventas por Instagram").

## Lo que hace falta para encenderlo

1. **Meta**: cuenta de WhatsApp Business verificada, una app con el producto WhatsApp, el número
   dedicado a cobranza, y cuatro plantillas aprobadas (una por tipo de recordatorio, 5 variables:
   nombre, cuota, total, monto, fecha). Webhook: la URL del `whatsappWebhook` y el token de
   verificación (`firebase functions:secrets:access WHATSAPP_VERIFY_TOKEN`). Suscribirse a `messages`.
2. **Secretos** (los escribe Adam, nunca pasan por el chat):
   ```
   firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN   --project pagasi26-65ced
   firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID --project pagasi26-65ced
   firebase functions:secrets:set WHATSAPP_APP_SECRET      --project pagasi26-65ced
   firebase functions:secrets:set ANTHROPIC_API_KEY        --project pagasi26-65ced
   ```
   Después de cambiar un secreto hay que volver a desplegar (`firebase deploy --only functions --project pagasi26-65ced`): las funciones quedan atadas a la versión del secreto que existía al desplegar. Mientras `WHATSAPP_APP_SECRET` diga `pendiente`, el webhook rechaza todo.
3. **Permisos** (hechos el 18-oct-2026): la cuenta de cómputo de la 26 (`415041001199-compute@developer.gserviceaccount.com`) corre y construye las funciones. En proyectos nuevos no trae Editor, así que tiene en la 26 `cloudbuild.builds.builder`, `datastore.user`, `storage.objectAdmin`, `logging.logWriter` y `artifactregistry.writer`; y para atender a los clientes de la 18, `datastore.user` en `pagasi-v2` y `storage.objectAdmin` en el bucket `pagasi-v2.firebasestorage.app`. Las imágenes de los contenedores se borran a los 3 días (`functions:artifacts:setpolicy`). La organización de Google de pagasi.io restringe por dominio quién puede invocar servicios (`iam.allowedPolicyMemberDomains`), y Meta llama sin credenciales: **falta** ponerle al proyecto 26 (solo a él) una excepción de esa política para que el webhook acepte `allUsers` (hoy toda llamada externa recibe 403 de Google antes de llegar al código). Lo crea un Administrador de políticas de la organización (`orgpolicy.policyAdmin`): política `iam.allowedPolicyMemberDomains` → "Permitir todo" en el proyecto pagasi26-65ced; después `gcloud run services add-iam-policy-binding whatsappwebhook --region us-east1 --member allUsers --role roles/run.invoker` o un redeploy (el código ya trae `invoker: 'public'`). La seguridad real es la firma de Meta y el token de Firebase.
4. **Firestore Rules** publicadas en las dos compañías (bloque "Cobranza por WhatsApp").
5. `config/asistente`: `conectado: true`, `telefono`, `datosPago`, `plantillas`. Con `conectado` en falso, la pantalla sigue en demostración y el robot de la mañana no manda nada.
6. Consentimiento: una línea en el contrato y en la solicitud web para recibir avisos por WhatsApp.
7. **Instagram**: la cuenta de Pagasi debe ser profesional (empresa) y estar ligada a una página de Facebook; en la misma app de Meta se agrega el producto Instagram con `instagram_manage_messages` (y el permiso de etiqueta de agente humano), se suscribe el mismo webhook al objeto `instagram` (campo `messages`), y se guardan `INSTAGRAM_ACCESS_TOKEN` (token de la página o de la cuenta) e `INSTAGRAM_ACCOUNT_ID` (id de la cuenta profesional) con `firebase functions:secrets:set`. Mientras digan `pendiente`, los mensajes de Instagram se saltan sin romper nada.

## Despliegue

Desde la raíz del repo (el `firebase.json` de la raíz solo tiene las funciones):

```
cd functions && npm install && cd ..
firebase deploy --only functions --project pagasi26-65ced
```

El `predeploy` copia `logic/whatsapp.js` y `logic/credito-ledger.js` a `functions/logic/` (no van al
repo) para que el robot calcule la cola con el mismo código que la pantalla.

## Pruebas

- `node tests/t_whatsapp_webhook.js`: parseo de Meta (WhatsApp e Instagram), briefings de cobranza y de ventas, cerebro (validación y turnos, promesa y lead), el flujo completo con bases falsas, comprobantes, estados, el equipo por los dos canales, los recordatorios.
- `node tests/t_whatsapp_cola.js`: la cola del día y la pantalla.
- `tests/reglas/t_reglas_whatsapp.js`: las Reglas contra el emulador (workflow `reglas-probar`).

## Medir si sirve

Comparar, por quincena, la mora a 5/15/30 días y las cuotas cobradas dentro de la gracia entre
quienes recibieron recordatorio y quienes no (los que no tienen celular válido quedan como grupo
de comparación natural). `recordatorios` guarda a quién se le mandó qué y cuándo.
