// Pagasi logic: contratos-dra
// Contratos redactados por el asesor legal (version DRA 30-08-26):
//   1) Contrato de Compraventa de Vehiculo Automotor con Reserva de Dominio
//   2) Contrato de Cesion de Creditos
// Ambos se emiten SIEMPRE juntos: la cesion carece de sentido sin la venta que
// la origina. El texto es literal al documento aprobado; aqui solo se rellenan
// los datos del credito. Los campos que el sistema todavia no guarda (registro
// mercantil del concesionario, su representante) salen como linea en blanco
// para completar a mano.

var _DRA_CUERPO = [
  function(D){ return `CONTRATO DE COMPRAVENTA DE VEHÍCULO AUTOMOTOR CON RESERVA DE DOMINIO`; },
  function(D){ return _draPreambuloCV(D); },
  function(D){ return _draPreambuloFiador(D); },
  function(D){ return `CONSIDERANDO QUE el Concesionario es una agencia distribuidora de motocicletas, en los términos previstos en el artículo 18(1) del Reglamento Parcial de la Ley de Transporte Terrestre sobre el Uso y Circulación de Motocicletas en la Red Vial Nacional y el Transporte Público de Personas en la Modalidad Individual Moto Taxis, contenido en el Decreto Presidencial No. 8.495, publicado en Gaceta Oficial No. 39.772 del 5 de octubre de 2011 (el “Reglamento LTT—Motos”).`; },
  function(D){ return _draVehiculo(D); },
  function(D){ return `CONSIDERANDO QUE Pagasi actúa como agente de cobro del Concesionario conforme a un contrato de mandato celebrado entre el Concesionario y Pagasi (el “Contrato de Mandato”), y como cesionario de las acreencias del precio conforme a un contrato de cesión de créditos celebrado entre el Concesionario y Pagasi en esta misma fecha (el “Contrato de Cesión de Créditos”), cuya existencia el Comprador declara expresamente en este acto estar en pleno conocimiento y, en consecuencia, estar debidamente notificado para todos los efectos legales derivados de la cesión de créditos, la cual es aceptada en este acto por el Comprador.`; },
  function(D){ return `CONSIDERANDO QUE las Partes han convenido en constituir una reserva de dominio sobre el Vehículo a favor de Pagasi (la “Reserva de Dominio”), como mecanismo de garantía del pago íntegro del Precio, de conformidad con lo previsto en los artículos 1.583 y siguientes del Código Civil y la Ley sobre Ventas con Reserva de Dominio.`; },
  function(D){ return `Las Partes, por medio del presente Contrato, expresamente establecen lo siguiente:`; },
  function(D){ return `1. OBJETO DEL CONTRATO`; },
  function(D){ return `1.1	Compraventa del Vehículo. Por medio del presente, el Concesionario vende al Comprador, quien declara adquirir, el Vehículo, para su uso lícito y conforme a los términos y condiciones establecidos en este Contrato. Pagasi financia la adquisición del Vehículo y, en virtud del Contrato de Cesión de Créditos y del Contrato de Mandato, el Comprador acepta expresamente que todos los pagos del Precio se harán exclusivamente a Pagasi, en su condición de agente de cobro del Concesionario y cesionario de los créditos derivados del Precio. La Reserva de Dominio sobre el Vehículo se constituye a favor de Pagasi hasta el pago total del Precio.`; },
  function(D){ return `1.2	Entrega del Vehículo. El Concesionario hace entrega material del Vehículo al Comprador en este acto, conjuntamente con sus llaves, manuales y accesorios. Desde la entrega material, el Comprador asume la posesión, uso, guarda, custodia, conservación, mantenimiento ordinario y responsabilidad civil, administrativa y de tránsito del Vehículo.`; },
  function(D){ return `1.3	Estado del Vehículo; Ausencia de Saneamiento. El Comprador declara que ha revisado e inspeccionado directa y personalmente el Vehículo a su entera satisfacción, y que conoce su estado físico, mecánico, eléctrico, documental y de conservación. En consecuencia, el Comprador acepta recibir el Vehículo en el estado en que se encuentra, sin que el Concesionario ni Pagasi asuman obligación alguna de saneamiento, garantía o responsabilidad por vicios ocultos, defectos mecánicos, eléctricos, estructurales o de funcionamiento del Vehículo; salvo por la responsabilidad de Pagasi respecto de la inexistencia de gravámenes no declarados sobre el Vehículo. Cualquier garantía de fabricante, taller, proveedor o tercero relacionada con el Vehículo (la “Garantía del Fabricante”) será exigible únicamente frente al garante correspondiente, sin que el Concesionario ni Pagasi asuman obligación o responsabilidad alguna por la existencia, alcance, vigencia, cumplimiento o ejecución de dicha Garantía del Fabricante.`; },
  function(D){ return `1.4	Uso y Mantenimiento del Vehículo. Durante el Período de Vigencia el Comprador deberá usar el Vehículo de forma prudente, lícita y conforme a su destino natural, con la diligencia de un buen padre de familia, obligándose a mantenerlo en buen estado de funcionamiento y conservación, realizar oportunamente el mantenimiento preventivo y correctivo ordinario, abstenerse de modificar seriales, placas, piezas esenciales o características de identificación, ni destinarlo a actividades ilícitas o distintas de las autorizadas; en estricto cumplimiento del Reglamento LTT—Motos y el ordenamiento jurídico venezolano. El Comprador asumirá los costos de combustible, lubricantes, consumibles, mantenimiento, reparaciones (independientemente de su cuantía), neumáticos, accesorios, estacionamiento, multas, impuestos, tasas, daños o indemnizaciones a terceros derivadas de accidentes en los que haya estado involucrado el Vehículo, la Póliza de Seguro aludida en la Sección 1.5 del Contrato, y demás gastos, costos, cargas u obligaciones derivadas del uso, tenencia, circulación y custodia del Vehículo.`; },
  function(D){ return `1.5	Póliza de Seguro. Durante el Período de Vigencia el Comprador se obliga a mantener a su propia costa debidamente pagada y vigente la Póliza de Garantía y Responsabilidad Civil o cualquier póliza sustancialmente equivalente, en cumplimiento con la Ley de Transporte Terrestre, el Reglamento LTT—Motos y el ordenamiento jurídico venezolano (la “Póliza de Seguro”).`; },
  function(D){ return `1.6	Dispositivo de Rastreo y Geolocalización; Tratamiento de Datos.`; },
  function(D){ return `(a)	El Comprador declara, reconoce y acepta que Pagasi, directamente o por medio de un proveedor especializado, incluyendo al Concesionario, podrá instalar, mantener, activar, operar, revisar, sustituir o retirar en el Vehículo un dispositivo de rastreo, geolocalización, telemetría o sistema GPS, visible u oculto (el “Dispositivo”), con la finalidad de proteger la propiedad y seguridad del Vehículo, verificar su ubicación en caso de mora, incumplimiento, accidente, hurto, robo, retención, pérdida, abandono, uso no autorizado, riesgo para la conservación del Vehículo o requerimiento de autoridad competente, así como para facilitar la recuperación del Vehículo y la administración ordinaria de este Contrato. Salvo autorización expresa y separada del Comprador, dicho Dispositivo no deberá utilizarse para grabar audio, video o comunicaciones privadas.`; },
  function(D){ return `(b)	El Comprador se obliga a no remover, desconectar, alterar, bloquear, inhibir, manipular, dañar ni interferir de cualquier forma con el Dispositivo, su tarjeta, batería, antena, cableado, software o señal, ni permitir que terceros lo hagan, salvo autorización previa y por escrito de Pagasi o intervención técnica autorizada. Cualquier manipulación no autorizada del Dispositivo constituirá incumplimiento grave de este Contrato y dará derecho a Pagasi a exigir la reparación o reposición correspondiente, reclamar daños y perjuicios, o terminar anticipadamente el Contrato conforme a sus términos. Los costos derivados de mantenimiento extraordinario, reposición, reparación, reinstalación o sustitución causados por daño, pérdida, manipulación, desconexión, negligencia o uso indebido del Dispositivo, serán asumidos por el Comprador.`; },
  function(D){ return `(c)	El Comprador autoriza de manera expresa, libre, informada, específica e inequívoca a Pagasi y a los proveedores que éste designe para recolectar, consultar, almacenar, conservar, procesar y utilizar la información generada por el dispositivo, incluyendo datos de ubicación, rutas, fechas, horas, eventos de encendido o apagado, alertas de movimiento, desconexión, manipulación, batería u otros datos técnicos asociados al Vehículo, únicamente para las finalidades previstas en este Contrato y en la medida necesaria para la protección de los derechos de Pagasi, la ejecución del Contrato, la seguridad del Vehículo y el cumplimiento de obligaciones legales o requerimientos de autoridad competente. Pagasi deberá tratar dicha información con carácter confidencial y adoptar medidas razonables para protegerla contra acceso, uso, divulgación, alteración o pérdida no autorizados; en el entendido que podrá compartir la información únicamente con sus asesores, aseguradoras, proveedores de rastreo, talleres, autoridades administrativas, policiales o judiciales, tribunales competentes, o terceros que intervengan razonablemente en la protección, recuperación, defensa, ejecución o cumplimiento de este Contrato. La información se conservará durante la vigencia del Contrato y por el tiempo adicional que Pagasi estime razonable y prudente, para atender reclamos, investigaciones, obligaciones legales, procedimientos judiciales o administrativos, cobranza, recuperación del Vehículo o defensa de derechos de las Partes.`; },
  function(D){ return `1.7	Cadena de Propiedad del Vehículo. El Concesionario reconoce, declara y manifiesta que el Vehículo no ha sido objeto de ventas, cesiones, transferencias, actos de disposición, ni gravámenes, previos a la Fecha de Celebración, y que ostenta la propiedad plena y legítima del mismo. El Concesionario vende el Vehículo al Comprador mediante el presente Contrato, constituyéndose la Reserva de Dominio a favor de Pagasi hasta el pago total del Precio.`; },
  function(D){ return `2. PRECIO Y CUOTAS`; },
  function(D){ return `2.1	Precio; Inicial y Cuotas Quincenales.`; },
  function(D){ return `(a) Precio. El precio total de la compraventa del Vehículo es la cantidad de ${D.precioLetras} DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA (US$ ${D.precio}) (el “Precio”), que, para dar cumplimiento con lo establecido en el artículo 130 de la Ley del Banco Central de Venezuela, equivale a ${D.precioBs} Bolívares (Bs. ${D.precioBs2}), calculados al tipo de cambio de referencia publicado por el Banco Central de Venezuela vigente para la fecha de redacción y visado de este documento.`; },
  function(D){ return `(b) Inicial. El Comprador paga a Pagasi, en este acto y en la Fecha de Celebración, la cantidad de ${D.inicial} Dólares (US$ ${D.inicial2}), por concepto de cuota inicial (la “Inicial”). Pagasi declara recibir dicho monto a su entera y cabal satisfacción, sirviendo el presente Contrato como suficiente recibo y finiquito de la Inicial.`; },
  function(D){ return `(c) Saldo Financiado; Cuotas Quincenales. El saldo del Precio, esto es, la cantidad de ${D.saldo} Dólares (US$ ${D.saldo2}) (el “Saldo Financiado”), será pagado por el Comprador a Pagasi mediante ${D.nCuotas} (${D.nCuotasLetras}) cuotas quincenales consecutivas, cada una por el monto de ${D.cuota} Dólares (US$ ${D.cuota2}) (cada una, una “Cuota Quincenal”), conforme al cronograma de pagos contenido en el Anexo “A” del presente Contrato.`; },
  function(D){ return `2.2	Vencimiento y Pago de las Cuotas Quincenales.`; },
  function(D){ return `(a) Vencimiento. La primera Cuota Quincenal vencerá a los quince (15) días continuos contados a partir de la Fecha de Celebración, y las sucesivas vencerán cada quince (15) días continuos siguientes, conforme al cronograma del Anexo “A”. Cada Cuota Quincenal podrá ser pagada en cualquier momento dentro del período quincenal que le corresponda, mediante uno o varios pagos parciales o abonos.`; },
  function(D){ return `(b) Período de Gracia; Mora. El Comprador dispondrá de un período de gracia de cinco (5) días continuos contados a partir de la fecha de vencimiento de cada Cuota Quincenal, durante el cual no se causarán intereses moratorios. Transcurrido dicho período de gracia sin que el pago se hubiere completado, el saldo insoluto causará intereses moratorios calculados desde la fecha de vencimiento de la Cuota Quincenal y hasta la fecha en que el pago se haga efectivo, a la Tasa de Intereses Moratorios indicada en la Sección 2.4.`; },
  function(D){ return `(c) Excedentes. Si los pagos efectuados dentro de un período quincenal exceden el monto de la Cuota Quincenal correspondiente, el excedente se imputará automáticamente a la Cuota Quincenal inmediatamente siguiente.`; },
  function(D){ return `2.3	Imputación de los Pagos. Todo pago recibido del Comprador se imputará en el siguiente orden: (i) en primer lugar, al capital pendiente de Cuotas Quincenales anteriores que se encuentren en mora; (ii) en segundo lugar, a los intereses moratorios causados sobre dichas Cuotas Quincenales en mora, calculados hasta la fecha en que el pago se haga efectivo a favor de Pagasi; y (iii) en tercer lugar, a la Cuota Quincenal del período en curso. Una vez cubiertos esos conceptos, cualquier excedente se imputará conforme a lo establecido precedentemente en la Sección 2.2(c).`; },
  function(D){ return `2.4	Intereses Moratorios. Los montos debidos e insolutos de cada Cuota Quincenal generarán intereses moratorios a una tasa del dos por ciento (2%) mensual de interés simple —equivalente al veinticuatro por ciento (24%) anual— o, en su defecto, a la tasa máxima permitida por la legislación venezolana aplicable si ésta resultare menor (la “Tasa de Intereses Moratorios”), calculados en proporción a los días continuos de mora efectivamente transcurridos.`; },
  function(D){ return `2.5	Forma y Moneda de Pago. El Precio, la Inicial y las Cuotas Quincenales se encuentran expresados en Dólares, moneda que las Partes acuerdan como moneda de cuenta del presente Contrato. El Comprador podrá liberarse válidamente de sus obligaciones de pago, a su elección: (i) mediante el pago en Dólares; o (ii) mediante el pago en Bolívares, calculados al tipo de cambio de referencia del EURO publicado por el Banco Central de Venezuela (https://www.bcv.org.ve/estadisticas/tipo-cambio-de-referencia-smc), vigente para la fecha efectiva en que se realice cada pago. Los pagos deberán realizarse a través de los siguientes medios: ${D.medios}.`; },
  function(D){ return `3. VIGENCIA DEL CONTRATO`; },
  function(D){ return `3.1	Período de Vigencia. El Contrato estará vigente desde la Fecha de Celebración, hasta (a) la fecha de vencimiento de la última Cuota Quincenal conforme al cronograma del Anexo “A”, esto es, ${D.dias} (${D.diasLetras}) días continuos contados a partir de la Fecha de Celebración (el “Día de Vencimiento Previsto”); o (b) la fecha posterior al Día de Vencimiento Previsto, en la que el Comprador cumpla con cualquier obligación de pago pendiente bajo la Cláusula 2, en caso que al Día de Vencimiento Previsto el Comprador se encuentre en mora de sus obligaciones bajo dicha cláusula; o (c) la fecha anterior al Día de Vencimiento Previsto, en la que el Comprador haya cumplido con el pago adelantado íntegro del Precio bajo la Cláusula 2 (en todos los casos anteriores, el “Período de Vigencia”).`; },
  function(D){ return `3.2	No-Prorrogable. El Período de Vigencia no será prorrogable en ningún caso, salvo que medie acuerdo expreso y por escrito de las Partes.`; },
  function(D){ return `3.3	Efectos de la Terminación. Terminado el Contrato por cualquier causa distinta al pago íntegro del Precio (incluyendo bajo la Sección 8.1(c)), el Comprador deberá restituir de inmediato el Vehículo a Pagasi, junto con sus llaves, documentos y accesorios, en condiciones razonables de uso y conservación, salvo el desgaste ordinario derivado del uso normal del mismo durante el Período de Vigencia.`; },
  function(D){ return `4. TRANSFERENCIA DE LA PROPIEDAD`; },
  function(D){ return `4.1	Transferencia de la Propiedad. Una vez que el Comprador haya pagado íntegramente el Precio, incluyendo la Inicial, la totalidad de las Cuotas Quincenales, los intereses moratorios y cualesquiera otros montos adeudados bajo este Contrato, la propiedad plena del Vehículo se transferirá automáticamente al Comprador, sin necesidad de declaración adicional alguna de las Partes, y se procederá al levantamiento de la Reserva de Dominio en la forma prevista en la Sección 9.1.`; },
  function(D){ return `4.2	Actos de Formalización. Verificada la transferencia de la propiedad conforme a la Sección 4.1, quedará habilitado el Comprador a realizar los actos, trámites y diligencias para la inscripción y/o registro del título de propiedad correspondiente libre de la Reserva de Dominio; lo cual deberá realizar en estricto cumplimiento de lo previsto en las Cláusulas 9 y 5 del Contrato.`; },
  function(D){ return `5. RESERVA DE DOMINIO`; },
  function(D){ return `5.1	Reserva de Dominio y Prohibición de Enajenar y Gravar. La Reserva de Dominio se constituye a favor de Pagasi como mecanismo de garantía principal del pago íntegro del Precio. Durante el Período de Vigencia, y mientras la Reserva de Dominio se encuentre vigente, el Comprador se obliga a no ceder, vender, transferir la propiedad ni la posesión, dar en usufructo, ni trasladar fuera del territorio de la República Bolivariana de Venezuela, el Vehículo; en el entendido que hasta que se cumplan todas las obligaciones de pago previstas bajo la Cláusula 2 de este Contrato, el Vehículo tendrá, para todos los efectos legales, una prohibición de enajenar y gravar, oponible a terceros (la “Prohibición de Enajenar y Gravar”). La Reserva de Dominio y la Prohibición de Enajenar y Gravar se mantendrán vigentes hasta el levantamiento de las mismas, realizado en la forma prevista en la Sección 9.1.`; },
  function(D){ return `5.2	Razonabilidad de la Reserva de Dominio. La Reserva de Dominio y la Prohibición de Enajenar y Gravar previstas precedentemente en la Sección 5.1 constituyen medidas razonables, racionales y debidamente justificadas en su causa contractual, por cuanto las mismas persiguen garantizar el derecho de crédito correspondiente al cobro del Precio, en caso de mora o incumplimiento contractual del Comprador de sus obligaciones de pago previstas bajo este Contrato, para facilitar el ejercicio de cualquier acción o pretensión de cobro; incluyendo lo establecido en la Sección 8.2 del Contrato. Además, la Reserva de Dominio y la Prohibición de Enajenar y Gravar son medidas voluntarias estrictamente limitadas en el tiempo, al Período de Vigencia.`; },
  function(D){ return `5.3	Nota de Registro. El título de propiedad del Vehículo a favor del Comprador, emitido por el Instituto Nacional de Transporte Terrestre (“INTT”) o cualesquiera otras autoridades competentes, deberá necesariamente incluir una nota, observación o mención sobre la Reserva de Dominio a favor de Pagasi y la Prohibición de Enajenar y Gravar, la cual deberá estar reflejada en el título de propiedad, según lo dispuesto en la Sección 9.1.`; },
  function(D){ return `6. IMPUESTOS`; },
  function(D){ return `6.1	Carga de las Partes. Cada Parte tendrá la carga de pagar los impuestos, tasas o tributos (los “Impuestos”) que correspondan a cada una bajo las transacciones previstas en este Contrato, conforme a la legislación aplicable.`; },
  function(D){ return `6.2	Impuestos Específicos. Cuando así corresponda según lo establecido en el ordenamiento jurídico vigente, a los montos a ser pagados bajo este Contrato por concepto de Inicial, Cuota Quincenal, Precio y/o intereses moratorios, deberá aplicarse (a) el Impuesto al Valor Agregado (“IVA”) y (b) el Impuesto a las Grandes Transacciones Financieras (“IGTF”); los cuales deberán ser pagados por el Comprador a Pagasi, en la forma prevista legalmente.`; },
  function(D){ return `7. RESPONSABILIDAD LEGAL`; },
  function(D){ return `7.1	Responsabilidad del Comprador. Las multas, infracciones de tránsito, impuestos, tasas, daños, accidentes, hechos ilícitos, responsabilidades civiles, penales, administrativas o de cualquier otra naturaleza que se originen con posterioridad a la fecha y hora de entrega material del Vehículo en la Fecha de Celebración, serán por cuenta exclusiva del Comprador.`; },
  function(D){ return `7.2	Oponibilidad a Terceros. Lo previsto en la Sección 7.1 precedente es oponible a terceros, inclusive antes de cualquier registro del derecho de propiedad a favor del Comprador que se realice bajo las Cláusulas 5 y 9 del Contrato.`; },
  function(D){ return `7.3	Indemnidad. El Comprador se obliga a indemnizar y mantener indemne a Pagasi ante cualquier hecho, reclamación, indemnización o daño de un tercero, por el cual se pretendiera o debiera responder Pagasi en contravención a lo previsto precedentemente en esta Cláusula 7.`; },
  function(D){ return `8. INCUMPLIMIENTOS CONTRACTUALES`; },
  function(D){ return `8.1	Remedios Contractuales en Caso de Incumplimiento. Ante cualquier incumplimiento de las obligaciones asumidas bajo este Contrato por el Comprador (“Incumplimientos del Comprador”), Pagasi podrá (a) exigir y demandar el pago inmediato de (i) las sumas vencidas; (ii) intereses moratorios; y/o (iii) daños y perjuicios; y/o (b) ejecutar la Reserva de Dominio y solicitar la restitución del Vehículo conforme a la Sección 8.2; y/o (c) dar por terminado anticipadamente el Contrato mediante comunicación escrita dada al Comprador, sin perjuicio de las acciones legales que correspondan.`; },
  function(D){ return `8.2	Ejecución del Vehículo. En caso de Incumplimientos del Comprador, quedará automáticamente habilitado Pagasi para cobrar sus derechos de crédito mediante la ejecución judicial del Vehículo, para lo cual podrá solicitar y hacer ejecutar medidas cautelares, asegurativas o anticipadas, incluyendo de embargo del Vehículo, ante cualquier tribunal de Venezuela en el que estuviere ubicado el Vehículo; sin perjuicio de lo previsto en la Sección 11.1(b) del Contrato.`; },
  function(D){ return `9. ACTOS DE REGISTRO`; },
  function(D){ return `9.1	Reserva de Dominio; Levantamiento. El título de propiedad del Vehículo a favor del Comprador, emitido por el INTT o cualquier otra autoridad competente en la República Bolivariana de Venezuela, deberá incluir una nota, observación o mención expresa en el mismo, con relación a la existencia de la Reserva de Dominio a favor de Pagasi bajo este Contrato. Una vez pagado íntegramente el Precio y terminado el Contrato, se podrá proceder a levantar la Reserva de Dominio y la Prohibición de Enajenar y Gravar y eliminar dicha observación del título de propiedad del Vehículo, ante el INTT o la autoridad que corresponda.`; },
  function(D){ return `9.2	Gastos. El Comprador asumirá gastos notariales, de autenticación, reconocimiento de firmas, copias certificadas y demás gastos derivados de la formalización del presente Contrato, así como de trámite del título de propiedad ante el INTT o cualquier otra autoridad competente, incluyendo la inscripción o levantamiento de la Prohibición de Enajenar y Gravar sobre el Vehículo.`; },
  function(D){ return `10. NOTIFICACIONES`; },
  function(D){ return `10.1	Forma de las Notificaciones. Las notificaciones y comunicaciones entre las Partes, a efectos de este Contrato, se tendrán como válidas y perfeccionadas cuando se realicen por escrito, y sean remitidas:`; },
  function(D){ return `(a) 	a las direcciones de correo electrónico (“E-Mail”) abajo indicadas en la Sección 10.2; en el entendido de que, en este caso, las mismas se entenderán perfeccionadas, válidas y efectivamente realizadas al día hábil siguiente (a partir de las 00:00 am (hora de Venezuela), de ese día); o`; },
  function(D){ return `(b)  	a las direcciones físicas de oficina abajo indicadas en la Sección 10.2; en el entendido de que, en este caso, las mismas se entenderán perfeccionadas, válidas y efectivamente realizadas única y exclusivamente si la Parte a quien se dirige la comunicación continúa laborando o prestando servicios en la oficina a la cual se dirige la comunicación. En este caso la notificación se entenderá recibida al día hábil siguiente de la fecha de recepción (a partir de las 00:00 am (hora de Venezuela), de ese día).`; },
  function(D){ return `10.2	Direcciones y Destino de las Notificaciones. Las Partes escogen como destino válido para practicar las notificaciones, comunicaciones, citaciones y/o entregas bajo este Contrato, las siguientes direcciones físicas y de E-Mail:`; },
  function(D){ return _draContacto('(a) Al Comprador:', D.cli.email, D.cli.direccion, D.cli.tel); },
  function(D){ return _draContacto('(b) A Pagasi:', D.emp.email, D.emp.direccion, D.emp.tel); },
  function(D){ return _draContacto('(c) Al Concesionario:', D.conc.email, D.conc.direccion, D.conc.telefono); },
  function(D){ return `Cualquier modificación de estas direcciones físicas, de E-Mail y de datos de contacto telefónicos, será comunicada entre las Partes de inmediato.`; },
  function(D){ return `11. DISPOSICIONES GENERALES Y MISCELÁNEAS`; },
  function(D){ return `11.1	Ley Aplicable; Jurisdicción.`; },
  function(D){ return `(a)	El presente Contrato se regirá e interpretará de conformidad con las leyes de la República Bolivariana de Venezuela.`; },
  function(D){ return `(b)	Para todos los efectos derivados de la interpretación, ejecución, cumplimiento, terminación o liquidación del presente Contrato, las Partes eligen como domicilio especial, único y excluyente la ciudad de Caracas, República Bolivariana de Venezuela, a la jurisdicción de cuyos tribunales declaran someterse, con renuncia expresa a cualquier otro fuero o domicilio que pudiera corresponderles, salvo para efectos de lo previsto en la Sección 8.2.`; },
  function(D){ return `11.2 	Confidencialidad. Las Partes se obligan a mantener estricta confidencialidad sobre la existencia, términos, condiciones y disposiciones de este Contrato, y no podrán revelarlos públicamente ni comunicarlos a terceros sin el consentimiento previo y por escrito de la(s) otra(s) Parte(s), salvo cuando la divulgación sea requerida por ley, reglamento, autoridad competente, tribunal, asesor legal, contable o financiero, aseguradora, entidad bancaria, proveedor necesario para la ejecución del Contrato, o cuando sea razonablemente necesaria para ejercer derechos, cumplir obligaciones o defender intereses derivados de este Contrato. La Parte que realice una divulgación permitida deberá procurar que el receptor mantenga la información con carácter confidencial, en la medida que ello sea razonablemente posible.`; },
  function(D){ return `11.3	Acuerdo Definitivo y Vinculante. El presente Contrato tiene la naturaleza de contrato definitivo y vinculante entre las Partes, en base a los términos y condiciones establecidos en el Código Civil. El mismo contiene la totalidad de acuerdos, derechos de crédito, obligaciones, términos y condiciones que regirán las circunstancias y hechos objeto del mismo. La fuerza y validez del Contrato deriva de la ley y la libre intención de las Partes manifestada en el mismo, por lo cual sus efectos serán inmediatos, vinculantes y oponibles a terceros desde la misma Fecha de Celebración. Ninguna disposición de este Contrato puede ser renunciada o rescindida tácitamente sino mediante un instrumento por escrito firmado por la Parte contra la cual se solicita la ejecución de dicha renuncia o terminación; y ningún incumplimiento o demora por parte de cualquiera de las Partes en el ejercicio de cualquier derecho en virtud de este Contrato operará como una renuncia al mismo.`; },
  function(D){ return `11.4	Títulos y Encabezados. Los encabezados y/o títulos de las cláusulas que forman parte del presente Contrato se establecen únicamente para facilitar la lectura, interpretación e implementación del mismo, pero no constituyen parte integrante del Contrato.`; },
  function(D){ return `11.5 	Separabilidad. Las Partes convienen que en caso de que cualquier parte o sección del presente Contrato fuera declarada nula, inválida o inoperante, el mismo deberá ser interpretado omitiendo única y exclusivamente las disposiciones declaradas nulas, inválidas o inoperantes; procurando preservar la validez y eficacia del resto del Contrato, obedeciendo a la intención de las Partes manifestada en el presente Contrato, así como a la buena fe mediante la cual entran en el presente Contrato. Las obligaciones declaradas total o parcialmente nulas, de ser el caso, subsistirán como obligaciones de derecho natural, susceptibles de su cumplimiento por las Partes en base a la buena fe, sin que corresponda la acción de repetición, de enriquecimiento sin causa, de pago de lo indebido ni por responsabilidad contractual o extracontractual alguna, en dicho caso.`; },
  function(D){ return `11.6 	Términos Definidos. Para efectos de la lectura e interpretación del presente Contrato, a menos que el contexto requiera algo distinto:`; },
  function(D){ return `“Bolívar(es)” significa la moneda de curso legal en Venezuela.`; },
  function(D){ return `“Comprador” tiene el significado dado en el preámbulo del mismo.`; },
  function(D){ return `“Concesionario” tiene el significado dado en el preámbulo del mismo.`; },
  function(D){ return `“Contrato” tiene el significado dado en el preámbulo del mismo.`; },
  function(D){ return `“Contrato de Cesión de Créditos” tiene el significado dado en los “Considerandos” del mismo.`; },
  function(D){ return `“Contrato de Mandato” tiene el significado dado en los “Considerandos” del mismo.`; },
  function(D){ return `“Cuota Quincenal” tiene el significado dado en la Sección 2.1(c).`; },
  function(D){ return `“Día de Vencimiento Previsto” tiene el significado dado en la Sección 3.1.`; },
  function(D){ return `“Día Hábil” significa un día (i) diferente al sábado o el domingo o un feriado nacional, y (ii) en el que los bancos comerciales están abiertos y ofrecen servicios en Venezuela.`; },
  function(D){ return `“Dispositivo” tiene el significado dado en la Sección 1.6(a).`; },
  function(D){ return `“Fiador” tiene el significado dado en la Sección 12.1.`; },
  function(D){ return `“Dólar(es)” significa Dólares de los Estados Unidos de América.`; },
  function(D){ return `“E-Mail” tiene el significado dado en la Sección 10.1(a).`; },
  function(D){ return `“Fecha de Celebración” tiene el significado dado en el preámbulo del mismo.`; },
  function(D){ return `“Garantía del Fabricante” tiene el significado dado en la Sección 1.3.`; },
  function(D){ return `“Inicial” tiene el significado dado en la Sección 2.1(b).`; },
  function(D){ return `“IGTF” tiene el significado dado en la Sección 6.2.`; },
  function(D){ return `“Impuestos” tiene el significado dado en la Sección 6.1.`; },
  function(D){ return `“Incumplimientos del Comprador” tiene el significado dado en la Sección 8.1.`; },
  function(D){ return `“INTT” tiene el significado dado en la Sección 5.3.`; },
  function(D){ return `“IVA” tiene el significado dado en la Sección 6.2.`; },
  function(D){ return `“Partes” tiene el significado dado en el preámbulo del mismo.`; },
  function(D){ return `“Pagasi” tiene el significado dado en el preámbulo del mismo.`; },
  function(D){ return `“Período de Vigencia” tiene el significado dado en la Sección 3.1.`; },
  function(D){ return `“Póliza de Seguro” tiene el significado dado en la Sección 1.5.`; },
  function(D){ return `“Precio” tiene el significado dado en la Sección 2.1.`; },
  function(D){ return `“Prohibición de Enajenar y Gravar” tiene el significado dado en la Sección 5.1.`; },
  function(D){ return `“Saldo Financiado” tiene el significado dado en la Sección 2.1(c).`; },
  function(D){ return `“Reglamento LTT—Motos” tiene el significado dado en los “Considerandos” del mismo.`; },
  function(D){ return `“Reserva de Dominio” tiene el significado dado en los “Considerandos” del mismo.`; },
  function(D){ return `“RIF” tiene el significado dado en el preámbulo del mismo.`; },
  function(D){ return `“Tasa de Intereses Moratorios” tiene el significado dado en la Sección 2.4.`; },
  function(D){ return `“Vehículo” tiene el significado dado en los “Considerandos” del mismo.`; },
  function(D){ return `“Venezuela” significa la República Bolivariana de Venezuela.`; },
  function(D){ return `11.7 	Debida Asistencia Legal. El Comprador declara, manifiesta, reconoce y acepta que, durante la negociación del presente Contrato, ha estado en todo momento asesorado por abogados de su elección y confianza. Cada Parte correrá con los gastos de sus abogados y asesores legales, según corresponda.`; },
  function(D){ return `11.8 	Ejemplares. Este Contrato se extiende y suscribe en tres (3) ejemplares que se reputarán como originales del mismo: uno que queda en poder del Comprador, el otro que queda en poder de Pagasi, y el tercero queda en poder del Concesionario, para sus archivos internos.`; },
  function(D){ return `12. FIANZA`; },
  function(D){ return `12.1	Constitución de la Fianza. El Fiador se constituye en este acto en fiador solidario y principal pagador del Comprador frente a Pagasi, por todas y cada una de las obligaciones asumidas por el Comprador bajo el presente Contrato, incluyendo sin limitación el pago íntegro del Precio, la Inicial, las Cuotas Quincenales, los intereses moratorios y cualesquiera otros montos, gastos, costos y costas derivados del mismo.`; },
  function(D){ return `12.2	Renuncia a Beneficios. El Fiador renuncia expresamente a los beneficios de excusión y de división previstos en el Código Civil, así como a cualquier otro beneficio que pudiera corresponderle, de manera que Pagasi podrá exigirle el cumplimiento íntegro de las obligaciones garantizadas sin necesidad de requerir previamente al Comprador ni de ejecutar la Reserva de Dominio.`; },
  function(D){ return `12.3	Vigencia de la Fianza. La fianza permanecerá vigente hasta la extinción total de las obligaciones garantizadas, y no se verá afectada ni extinguida por las prórrogas, modificaciones, refinanciamientos, planes o facilidades de pago que Pagasi pudiera conceder al Comprador, las cuales el Fiador acepta y autoriza desde ahora.`; },
  function(D){ var t=_draContacto('', D.cli.fiador_email, D.cli.fiador_dir, D.cli.fiador_tel); return t ? '12.4\tNotificaciones al Fiador. '+t : ''; },
  function(D){ return `Las Partes firman el presente Contrato en señal de conformidad y aceptación, en la Fecha de Celebración.-`; }
];

var _DRA_CESION = [
  function(D){ return `CONTRATO DE CESIÓN DE CRÉDITOS`; },
  function(D){ return _draPreambuloCE(D); },
  function(D){ return `POR CUANTO, el Cedente celebró en esta misma fecha un contrato de compraventa con reserva de dominio cuyo objeto es la motocicleta allí indicada (el “Contrato de Compraventa”) con el comprador identificado en dicho Contrato de Compraventa  (el “Comprador”), por un precio de venta financiado en cuotas periódicas, generándose así una serie de cuentas por cobrar representadas por las cuotas pendientes de pago por el Comprador, las cuales se detallan en el Anexo “A” del presente Contrato (las “Cuentas por Cobrar”);`; },
  function(D){ return `POR CUANTO, el Cedente tiene la intención de vender, ceder y transferir al Cesionario, y que el Cesionario tiene la intención de adquirir del Cedente, la totalidad de las Cuentas por Cobrar derivadas de los Contratos de Compraventa.`; },
  function(D){ return `Las Partes convienen en celebrar el presente Contrato, en base a los términos y condiciones siguientes:`; },
  function(D){ return `1. OBJETO DE LA CESIÓN`; },
  function(D){ return `1.1	Cesión de Créditos. Por medio del presente Contrato, el Cedente vende, cede y transfiere en forma pura y simple, perfecta e irrevocable a favor del Cesionario y éste declara recibir a su entera satisfacción, los derechos de crédito derivados de las Cuentas por Cobrar (la “Cesión”) contra el Comprador, según se detalla en el Anexo “A”, y causados en el Contrato de Compraventa (los “Documentos de Compraventa”).`; },
  function(D){ return `1.2	Perfeccionamiento de la Cesión. La Cesión se perfecciona en este mismo acto, en la Fecha Efectiva, sin condición suspensiva o precedente alguna; sin perjuicio de la existencia de actos adicionales de acuerdo a lo previsto en la Sección 3.3.`; },
  function(D){ return `1.3	Contraprestación. El precio convenido entre las Partes como contraprestación única y total por la Cesión es la cantidad de ${D.saldo} Dólares (US$ ${D.saldo2}) (el “Precio”). Dicho Precio ha sido pagado a cabalidad por el Cesionario en este mismo acto, en la forma convenida con el Cedente, en la Fecha Efectiva.`; },
  function(D){ return `2. DECLARACIONES DE LAS PARTES`; },
  function(D){ return `2.1	Declaraciones del Cedente. El Cedente declara y garantiza al Cesionario que, a la Fecha Efectiva, las siguientes declaraciones son verdaderas y correctas:`; },
  function(D){ return `(a)	El Cedente tiene plena capacidad contractual para celebrar este Contrato y para ejecutar las obligaciones que se derivan del mismo. La suscripción de este Contrato y la ejecución de la Cesión aquí prevista ha sido debidamente autorizada por las autoridades y representantes con capacidad legal de representación para la realización de actos de disposición del Cedente, según disponen sus estatutos sociales y demás documentos de organización y gobernanza corporativa, sin que se requiera de ninguna otra autorización o aprobación adicional. Este Contrato constituye una obligación legal, válida y vinculante, oponible en contra del Cedente, de acuerdo con los términos contemplados en este Contrato.`; },
  function(D){ return `(b)	El Cedente es el propietario y acreedor legítimo y exclusivo de las Cuentas por Cobrar, y los Documentos de Compraventa que sirven de soporte a las mismas han sido válidamente celebrados, se encuentran libres de cualquier gravamen, y no están sujetos a ninguna limitación a la facultad de disposición.`; },
  function(D){ return `(c)	Las Cuentas por Cobrar corresponden a operaciones comerciales, reales y lícitas derivadas de la venta de motocicletas bajo el Contrato de Compraventa, en virtud de lo cual reconoce la existencia y legitimidad de la Cesión; garantizando en tal sentido, que las Cuentas por Cobrar se encuentran vigentes, siendo derechos de crédito oponibles y ejecutables contra el Comprador, y no han sido objeto de compensación alguna, ni cesión en oportunidades anteriores en favor de terceros.`; },
  function(D){ return `(d)	El Cedente ha recibido del Cesionario en este acto, a su entera y cabal satisfacción, el monto total del Precio, en moneda de curso legal.`; },
  function(D){ return `(e)	El Cedente no se ha involucrado en ninguna actividad que pudiera constituir una violación de la ley aplicable ni ninguna otra norma jurídica o regulación, con respecto a actos de corrupción o normas de prevención de lavado de dinero. Sin limitar la generalidad de lo anterior, ni el Cedente, ni ningún director, funcionario, agente o empleado que actúe en nombre del Cedente, ha utilizado ningún fondo o recurso para realizar, directa o indirectamente, ninguna contribución ilegal, obsequio, soborno u otro pago ilegal a cualquier funcionario, empleado, agente, contratista o representante de (a) cualquier autoridad gubernamental, incluyendo, pero sin limitarse a, entre otros, un agente de aduanas, funcionario de concursos públicos o regulador; (b) cualquier persona o entidad comercial que actúe oficialmente o comercialmente para o en nombre de cualquier autoridad gubernamental, o que sea propiedad, o esté controlada por, el gobierno; (c) cualquier candidato para un cargo político, cualquier partido político o cualquier funcionario de un partido político; o (d) cualquier funcionario, empleado, agente, contratista o representante de cualquier organización internacional pública.`; },
  function(D){ return `(f)	El Cedente declara conocer las limitaciones y requisitos para el perfeccionamiento de la Cesión aplicables a las Cuentas por Cobrar bajo las leyes de Venezuela, para su oponibilidad al Comprador y a terceros, y reconoce que ni el Cesionario ni ningún funcionario, empleado, agente, contratista o representante de éste, han hecho representación, declaración o garantía al respecto.`; },
  function(D){ return `2.2	Declaraciones del Cesionario. El Cesionario declara y garantiza al Cedente que, a la Fecha Efectiva, las siguientes declaraciones son verdaderas y correctas:`; },
  function(D){ return `(a)	El Cesionario tiene plena capacidad contractual para celebrar este Contrato y para ejecutar las obligaciones que se derivan del mismo. La suscripción de este Contrato y la ejecución de la Cesión aquí prevista ha sido debidamente autorizada por las autoridades y representantes con capacidad legal de representación para la realización de actos de disposición del Cesionario, según disponen sus estatutos sociales y demás documentos de organización y gobernanza corporativa, sin que se requiera de ninguna otra autorización o aprobación adicional. Este Contrato constituye una obligación legal, válida y vinculante, oponible en contra del Cesionario, de acuerdo con los términos contemplados en este Contrato.`; },
  function(D){ return `(b)	Los fondos utilizados para el pago del Precio al Cedente no tienen su origen en actividades violatorias de la ley aplicable en materia de lucha contra el blanqueo de capitales, lavado de dinero o financiamiento al terrorismo.`; },
  function(D){ return `(c)	El Cesionario no se ha involucrado en ninguna actividad que pudiera constituir una violación de la ley aplicable ni ninguna otra norma jurídica o regulación, con respecto a actos de corrupción o normas de prevención de lavado de dinero. Sin limitar la generalidad de lo anterior, ni el Cesionario, ni ningún director, funcionario, agente o empleado que actúe en nombre del Cesionario, ha utilizado ningún fondo o recurso para realizar, directa o indirectamente, ninguna contribución ilegal, obsequio, soborno u otro pago ilegal a cualquier funcionario, empleado, agente, contratista o representante de (a) cualquier autoridad gubernamental, incluyendo, pero sin limitarse a, entre otros, un agente de aduanas, funcionario de concursos públicos o regulador; (b) cualquier persona o entidad comercial que actúe oficialmente o comercialmente para o en nombre de cualquier autoridad gubernamental, o que sea propiedad, o esté controlada por, el gobierno; (c) cualquier candidato para un cargo político, cualquier partido político o cualquier funcionario de un partido político; o (d) cualquier funcionario, empleado, agente, contratista o representante de cualquier organización internacional pública.`; },
  function(D){ return `(d)	El Cesionario celebra la Cesión asumiendo los riesgos crediticios derivados de las Cuentas por Cobrar, sin recurso contra el Cedente, y reconoce que ni el Cedente ni ningún funcionario, empleado, agente, contratista o representante de éste, han hecho representación, declaración o garantía de solvencia alguna respecto de dichas Cuentas por Cobrar y el Comprador.`; },
  function(D){ return `(e)	El Cesionario declara conocer las limitaciones y requisitos para el perfeccionamiento de la Cesión aplicables a las Cuentas por Cobrar bajo las Leyes de Venezuela, para su oponibilidad al Comprador y a terceros, y reconoce que ni el Cedente ni ningún funcionario, empleado, agente, contratista o representante de éste, han hecho representación, declaración o garantía al respecto.`; },
  function(D){ return `3. OBLIGACIONES ADICIONALES DE LAS PARTES`; },
  function(D){ return `3.1	Endoso. El Cedente se obliga a entregar, cuando así le sea requerido por el Cesionario, los Documentos de Compraventa y cualesquiera documentos crediticios debidamente endosados.`; },
  function(D){ return `3.2	Pagos del Comprador. A partir de la Fecha Efectiva, el Cedente deberá abstenerse de (i) realizar ni continuar cualquier gestión de cobro (judicial o extrajudicial) de las Cuentas por Cobrar, y de (ii) recibir de parte del Comprador (o de cualesquiera sucesores de éste, o cualquier tercero obrando en representación del Comprador o de forma independiente al mismo) cualquier pago total o parcial relacionado directa o indirectamente con las Cuentas por Cobrar. En caso de recibir información sobre la posibilidad de que materialice algún pago conforme a lo planteado en el párrafo anterior, o si recibiera pago alguno, el Cedente deberá notificar inmediatamente al Cesionario de dicha circunstancia, y restituir al Cesionario de forma inmediata dichos montos recibidos, en la forma que le sea indicada por el Cesionario.`; },
  function(D){ return `3.3	Notificación al Comprador. El Cesionario quedará facultado, a partir de la Fecha Efectiva, para notificar al Comprador de la Cesión de los Documentos de Compraventa correspondientes, y realizar los actos que fueren requeridos bajo el Contrato de Compraventa para perfeccionar dicha notificación y hacer oponible la Cesión a terceros y al Comprador.`; },
  function(D){ return `3.4	Actos Adicionales. Las Partes se obligan a cooperar y actuar coordinadamente de buena fe, con la diligencia de un buen padre de familia y siguiendo las instrucciones dadas al respecto por el Cesionario, para la realización de todos los actos adicionales que razonablemente pudieran ser necesarios, bajo la ley aplicable al Contrato de Compraventa, para procurar la validez, exigibilidad y oponibilidad legal de la Cesión de las Cuentas por Cobrar frente al Comprador y cualquier tercero.`; },
  function(D){ return `4. DISPOSICIONES GENERALES`; },
  function(D){ return `4.1 	Confidencialidad. Las Partes se obligan a mantener estricta confidencialidad sobre la existencia, términos, condiciones y disposiciones de este Contrato, y no podrán revelarlos públicamente ni comunicarlos a terceros sin el consentimiento previo y por escrito de la otra Parte, salvo cuando la divulgación sea requerida por ley, reglamento, autoridad competente, tribunal, panel arbitral, asesor legal, contable o financiero, aseguradora, entidad bancaria, proveedor necesario para la ejecución del Contrato, o cuando sea razonablemente necesaria para ejercer derechos, cumplir obligaciones o defender intereses derivados de este Contrato. La Parte que realice una divulgación permitida deberá procurar que el receptor mantenga la información con carácter confidencial, en la medida que ello sea razonablemente posible.`; },
  function(D){ return `4.2 	Notificaciones. Las notificaciones y comunicaciones entre las Partes, a efectos de este Contrato, se tendrán como válidas y perfeccionadas cuando se realicen por escrito, y sean remitidas: (a) a las direcciones de correo electrónico (“E-Mail”) abajo indicadas; en el entendido de que, en este caso, las mismas se entenderán perfeccionadas, válidas y efectivamente realizadas al día hábil siguiente (a partir de las 00:00 am (hora de Venezuela), de ese día); o (b)  a las direcciones físicas de oficina abajo indicadas; en el entendido de que, en este caso, las mismas se entenderán perfeccionadas, válidas y efectivamente realizadas única y exclusivamente si la Parte a quien se dirige la comunicación continúa laborando o prestando servicios en la oficina a la cual se dirige la comunicación. En este caso la notificación se entenderá recibida al día hábil siguiente de la fecha de recepción (a partir de las 00:00 am (hora de Venezuela), de ese día). Las Partes escogen como destino válido para practicar las notificaciones, comunicaciones, citaciones y/o entregas bajo este Contrato, las siguientes direcciones físicas y de E-Mail:`; },
  function(D){ return _draContacto('(a) Al Cedente:', D.conc.email, D.conc.direccion, D.conc.telefono); },
  function(D){ return _draContacto('(b) Al Cesionario:', D.emp.email, D.emp.direccion, D.emp.tel); },
  function(D){ return `Cualquier modificación de estas direcciones físicas, de E-Mail y de datos de contacto telefónicos, será comunicada entre las Partes de inmediato.`; },
  function(D){ return `4.3 	Ley Aplicable. El presente Contrato se regirá e interpretará de conformidad con las leyes de la República Bolivariana de Venezuela.`; },
  function(D){ return `4.4 	Disputas. Cualquier disputa, reclamo, controversia y/o diferencia relacionada con este Contrato, o que se derive de la interpretación, incumplimiento, terminación o invalidez del mismo, incluyendo cualquier pretensión de daños y perjuicios, será resuelta en forma definitiva mediante arbitraje administrado por el Centro Empresarial de Conciliación y Arbitraje (“CEDCA”), de conformidad con el respectivo Reglamento del CEDCA, vigente para la fecha de inicio de una disputa (el “Reglamento CEDCA”). El arbitraje será tramitado a través del “Procedimiento Expedito” conforme al Reglamento CEDCA y el arbitraje será “de derecho”. El Tribunal arbitral estará compuesto por un (1) solo árbitro designado en la forma prevista en el Reglamento CEDCA. El procedimiento arbitral se llevará a cabo en la ciudad de Caracas, Venezuela, en idioma castellano.`; },
  function(D){ return `4.5 	Acuerdo Definitivo y Vinculante. El presente Contrato tiene la naturaleza de contrato definitivo y vinculante entre las Partes, en base a los términos y condiciones establecidos en el Código Civil. El mismo contiene la totalidad de acuerdos, derechos de crédito, obligaciones, términos y condiciones que regirán las circunstancias y hechos objeto del mismo. La fuerza y validez del Contrato deriva de la ley y la libre intención de las Partes manifestada en el mismo, por lo cual sus efectos serán inmediatos, vinculantes y oponibles a terceros desde la misma Fecha Efectiva. Ninguna disposición de este Contrato puede ser renunciada o rescindida tácitamente sino mediante un instrumento por escrito firmado por la Parte contra la cual se solicita la ejecución de dicha renuncia o terminación; y ningún incumplimiento o demora por parte de cualquiera de las Partes en el ejercicio de cualquier derecho en virtud de este Contrato operará como una renuncia al mismo.`; },
  function(D){ return `4.6 	Encabezados y Títulos. Los encabezados y/o títulos de las cláusulas que forman parte del presente Contrato se establecen únicamente para facilitar la lectura, interpretación e implementación del mismo, pero no constituyen parte integrante del Contrato.`; },
  function(D){ return `4.7 	Separabilidad. Las Partes convienen que en caso de que cualquier parte o sección del presente Contrato fuera declarada nula, inválida o inoperante, el mismo deberá ser interpretado omitiendo única y exclusivamente las disposiciones declaradas nulas, inválidas o inoperantes; procurando preservar la validez y eficacia del resto del Contrato, obedeciendo a la intención de las Partes manifestada en el presente Contrato, así como a la buena fe mediante la cual entran en el presente Contrato. Las obligaciones declaradas total o parcialmente nulas, de ser el caso, subsistirán como obligaciones de derecho natural, susceptibles de su cumplimiento por las Partes en base a la buena fe, sin que corresponda la acción de repetición, de enriquecimiento sin causa, de pago de lo indebido ni por responsabilidad contractual o extracontractual alguna, en dicho caso.`; },
  function(D){ return `4.8 	Ejemplares. Este Contrato se extiende y suscribe en dos (2) ejemplares que se reputarán como originales del mismo; quedando cada ejemplar en poder de cada Parte.`; },
  function(D){ return `Las Partes firman el presente Contrato en señal de conformidad y aceptación, en la Fecha Efectiva.-`; }
];


// ── Redaccion adaptativa: lo que no tiene dato NO se escribe ──────────────
// En vez de dejar rayas en blanco, cada frase solo aparece si hay con que
// llenarla. Asi el contrato sale limpio aunque falten datos registrales.
// "NA", "S/N" y compania se tratan como vacio: el contrato saca la raya en vez de
// imprimirlos como si fueran el dato (punto 20, 21-sep-2026).
function _draTxt(v){ var t = (v==null?'':String(v)).trim(); return (typeof _datoReal==='function') ? _datoReal(t) : t; }

// Describe a una sociedad: nombre + registro mercantil + RIF + representante,
// omitiendo cada tramo que no tenga informacion.
function _draSociedad(d){
  var out = '<strong>' + _draTxt(d.nombre) + '</strong>';
  var reg = [];
  if(_draTxt(d.rm))       reg.push('ante el Registro Mercantil <strong>'+_draTxt(d.rm)+'</strong>');
  if(_draTxt(d.rmEstado)) reg.push('de la Circunscripción Judicial del Estado <strong>'+_draTxt(d.rmEstado)+'</strong>');
  if(_draTxt(d.rmFecha))  reg.push('en fecha <strong>'+_draTxt(d.rmFecha)+'</strong>');
  var libro = [];
  if(_draTxt(d.rmNum))  libro.push('bajo el No. <strong>'+_draTxt(d.rmNum)+'</strong>');
  if(_draTxt(d.rmTomo)) libro.push('Tomo <strong>'+_draTxt(d.rmTomo)+'</strong>');
  if(reg.length || libro.length){
    out += ', sociedad mercantil inscrita ' + reg.join(' ');
    if(libro.length) out += (reg.length?', ':'') + libro.join(', ');
  } else {
    out += ', sociedad mercantil';
  }
  if(_draTxt(d.rif)) out += ', inscrita en el Registro de Información Fiscal (“RIF”) bajo el N° <strong>'+_draTxt(d.rif)+'</strong>';
  return out;
}

// La cedula como se imprime: UNA sola letra de tipo (V, E, J, G o P) y los
// numeros. Muchas fichas ya traen la cedula guardada como "V-22032047" y los
// contratos le pegaban otra "V-" delante: salia "V-V-22032047" en el preambulo,
// el RIF y las firmas (Adam, 16-sep-2026: "se me repite la V- en todos lados...
// no puede pasar"). Acepta "22032047", "V-22032047", "v 22.032.047" y hasta un
// "V-V-" ya guardado; si no trae letra se asume V; algo que no parezca cedula
// (un pasaporte, texto) se imprime tal cual.
function _draCedulaTxt(v){
  var s = String(v == null ? '' : v).trim().toUpperCase();
  if(!s) return '';
  var digitos = s.replace(/[^0-9]/g, '');
  var resto = s.replace(/[VEJGP\s.\-]/g, '');
  if(!digitos || resto !== digitos) return s;
  var letra = (s.match(/[VEJGP]/) || ['V'])[0];
  return letra + '-' + digitos;
}

// Representante de una sociedad: se omite entero si no hay nombre.
function _draRepresentante(d){
  if(!_draTxt(d.rep)) return '';
  var t = ', representada en este acto por <strong>'+_draTxt(d.rep)+'</strong>';
  if(_draTxt(d.repCi)) t += ', titular de la cédula de identidad venezolana número <strong>'+_draCedulaTxt(_draTxt(d.repCi))+'</strong>';
  if(_draTxt(d.repCargo)) t += ', actuando en su carácter de <strong>'+_draTxt(d.repCargo)+'</strong>';
  if(_draTxt(d.repDoc)) t += ', según se desprende de <strong>'+_draTxt(d.repDoc)+'</strong>';
  return t;
}

// Persona natural: nombre + cedula + RIF (el RIF solo si esta cargado).
function _draPersona(nombre, ci, rif){
  var t = '<strong>'+_draTxt(nombre)+'</strong>, venezolano, mayor de edad';
  if(_draTxt(ci))  t += ', titular de la cédula de identidad venezolana número <strong>'+_draCedulaTxt(_draTxt(ci))+'</strong>';
  if(_draTxt(rif)) t += ' y con RIF número <strong>'+_draTxt(rif)+'</strong>';
  return t;
}

function _draDatosPartes(D){
  var emp = D.emp || {}, conc = D.conc || {}, cli = D.cli || {}, c = D.c || {};
  return {
    conc: { nombre: conc.nombre || '', rif: conc.rif || '', rm: conc.rm || '', rmEstado: conc.rmEstado || '',
            rmFecha: conc.rmFecha || '', rmNum: conc.rmNum || '', rmTomo: conc.rmTomo || '',
            rep: conc.representante || '', repCi: conc.repCI || '', repCargo: conc.repCargo || '', repDoc: conc.repDoc || '' },
    // Por decision de la empresa el representante de Pagasi no se identifica en
    // el contrato: firma la compañia, identificada por su RIF.
    emp:  { nombre: _empCtr().nom, rif: _empCtr().rif, rm: emp.rm || '', rmEstado: emp.rmEstado || '',
            rmFecha: emp.rmFecha || '', rmNum: emp.rmNum || '', rmTomo: emp.rmTomo || '', rep: '' },
    cli:  { nombre: cli.nombre || c.cli || '', ci: cli.cedula || cli.ci || '', rif: cli.rif || '' },
    fia:  { nombre: cli.fiador_nom || '', ci: cli.fiador_ci || '', rif: cli.fiador_rif || '', dir: cli.fiador_dir || '' }
  };
}

// Preambulo del contrato de compraventa
function _draPreambuloCV(D){
  var P = _draDatosPartes(D);
  return 'El presente CONTRATO DE COMPRAVENTA DE VEHÍCULO AUTOMOTOR CON RESERVA DE DOMINIO (en lo sucesivo aludido '
   + 'como el “Contrato”) se celebra en la fecha de su otorgamiento (la “Fecha de Celebración”), entre '
   + '(i) ' + _draSociedad(P.conc) + _draRepresentante(P.conc) + ' (en adelante el “Concesionario”); '
   + '(ii) ' + _draSociedad(P.emp) + _draRepresentante(P.emp) + ' (en adelante “Pagasi”); '
   + 'y (iii) ' + _draPersona(P.cli.nombre, P.cli.ci, P.cli.rif)
   + ' (el “Comprador” y junto con el Concesionario y Pagasi, las “Partes” y cada una, una “Parte”); '
   + 'de conformidad con lo previsto en los artículos 1.264, 1.266, 1.268, 1.474 y siguientes, y 1.583 y siguientes '
   + 'del Código Civil, el artículo 71 de la Ley de Transporte Terrestre, y la Ley sobre Ventas con Reserva de '
   + 'Dominio, en base en los términos y condiciones siguientes:';
}

// Intervencion del fiador (se omite completa si el credito no tiene fiador)
function _draPreambuloFiador(D){
  var P = _draDatosPartes(D);
  if(!_draTxt(P.fia.nombre)) return '';
  var t = 'Asimismo, interviene en el presente Contrato (iv) ' + _draPersona(P.fia.nombre, P.fia.ci, P.fia.rif);
  if(_draTxt(P.fia.dir)) t += ', domiciliado en <strong>'+_draTxt(P.fia.dir)+'</strong>';
  return t + ', quien actúa en su carácter de fiador solidario y principal pagador del Comprador (el “Fiador”), '
   + 'quedando comprendido dentro de la definición de “Partes” para todos los efectos de este Contrato.';
}

// Caracteristicas del vehiculo: solo las que tienen dato
function _draVehiculo(D){
  var c = D.c || {}, m = D.moto || {};
  // Cada candidato se limpia por separado: si el credito dice "NA" y la moto trae el
  // dato real, gana el real (antes se perdia la linea entera; revisado el 22-sep-2026)
  var val = function(){ for(var i=0;i<arguments.length;i++){ var t=_draTxt(arguments[i]); if(t) return t; } return ''; };
  var campos = [
    ['marca', val(c.marca, m.marca)], ['modelo', val(c.modelo, m.modelo)], ['año', val(c.anio, m.anio)],
    ['clase', 'MOTO'], ['tipo', val(m.tipo, '')],
    ['color', val(c.color==='—'?'':c.color, m.color)], ['placa', val(c.placa==='—'?'':c.placa, m.placa)],
    ['serial de carrocería o chasis', val(c.serialChasis, c.vin, m.serialChasis, m.vin)],
    ['serial de motor', val(c.serialMotor, m.serialMotor)],
    ['uso', String(c.uso_moto||'PARTICULAR').toUpperCase()]
  ].filter(function(x){ return x[1]; })
   .map(function(x){ return x[0] + ': <strong>' + x[1] + '</strong>'; });
  return 'CONSIDERANDO QUE el Concesionario es propietario de un vehículo a motor o automotor, cuyas características '
   + 'se identifican a continuación: ' + campos.join(', ') + ' (el “Vehículo”), y el Comprador, conociendo el estado, '
   + 'situación y condición general del Vehículo, desea adquirir el mismo del Concesionario con el financiamiento de Pagasi.';
}

// Preambulo de la cesion
function _draPreambuloCE(D){
  var P = _draDatosPartes(D);
  return 'El presente CONTRATO DE CESIÓN DE CRÉDITOS (el “Contrato”) se celebra en fecha ' + D.diaNum + ' de '
   + D.mesAnio + ' (la “Fecha Efectiva”), por y entre: '
   + '(i) ' + _draSociedad(P.conc) + _draRepresentante(P.conc) + ' (en adelante el “Cedente”); '
   + 'y (ii) ' + _draSociedad(P.emp) + _draRepresentante(P.emp)
   + ' (en adelante el “Cesionario” y, junto con el Cedente, las “Partes” y cada una, una “Parte”); '
   + 'en base a los términos y condiciones siguientes:';
}

// Datos de contacto: solo los que existen
function _draContacto(rotulo, email, dir, tel){
  var partes = [];
  if(_draTxt(email)) partes.push('E-Mail: <strong>'+_draTxt(email)+'</strong>');
  if(_draTxt(dir))   partes.push('Dirección: <strong>'+_draTxt(dir)+'</strong>');
  if(_draTxt(tel))   partes.push('Teléfono: <strong>'+_draTxt(tel)+'</strong>');
  if(!partes.length) return '';
  var rom = ['(i) ','(ii) ','(iii) '];
  return rotulo + ' ' + partes.map(function(t,i){ return rom[i]+t; }).join('; ') + '.';
}

// ── Datos del credito volcados en el formato que pide el contrato ──
function _draDatos(credId){
  var id = credId || ($('sel-cred') && $('sel-cred').value);
  var c = (S.creds||[]).find(function(x){ return String(x.id)===String(id); }) || (S.creds||[])[0];
  if(!c) return null;
  var cli  = (S.clientes||[]).find(function(x){ return String(x.id)===String(c.clienteId); })
          || (S.clientes||[]).find(function(x){ return x.nombre===c.cli; }) || {};
  var moto = (S.motos||[]).find(function(m){ return String(m.id)===String(c.motoId); }) || {};
  var emp  = (typeof getEmpresa==='function') ? getEmpresa() : {};
  var conc = (c.concesionarioId && typeof _concGetById==='function') ? (_concGetById(c.concesionarioId)||{}) : {};
  var F    = (typeof _docFinanzas==='function') ? _docFinanzas(c) : {precio:0,inicial:0,cuota:0,nCuotas:0,saldo:0,total:0};

  var num = function(n){ return (parseFloat(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var letras = function(n){ return (typeof _numALetras==='function') ? _numALetras(n) : num(n); };
  // Linea en blanco para completar a mano
  var b = function(len){ return '<span style="display:inline-block;border-bottom:1px solid #94a3b8;min-width:'+((len||10)*5.5)+'px">&nbsp;</span>'; };
  var V = function(v, len){ var s=(v==null?'':String(v)).trim(); return s ? '<strong>'+s+'</strong>' : b(len||14); };
  // Parte un RIF "J-12345678-9" en sus dos tramos para encajar en "J-[●]-[●]"
  var rifPart = function(rif, i){
    var s = String(rif||'').replace(/^[JVEGP]-?/i,'').trim();
    var p = s.split('-');
    if(p.length<2){ p = [s.slice(0,-1), s.slice(-1)]; }
    var val = (p[i]||'').trim();
    return val ? '<strong>'+val+'</strong>' : b(i===0?9:2);
  };

  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var fc = c.fecha ? new Date(c.fecha+'T12:00:00') : new Date();
  var tasaEuro = parseFloat(window._tasaEuro||0) || 0;
  var precioBs = tasaEuro>0 ? num(F.total*tasaEuro) : '';
  var iniPct   = F.total>0 ? (F.inicial/F.total*100) : 0;
  var dias     = (F.nCuotas||0)*15;

  return {
    c:c, cli:cli, moto:moto, emp:emp, conc:conc, F:F, b:b, num:num,
    concNom: V(conc.nombre, 26),
    empNom:  V(_empCtr().nom, 22),
    empRif1: rifPart(emp.rif, 0), empRif2: rifPart(emp.rif, 1),
    // Por decision de la empresa, el contrato NO lleva el nombre ni la cedula del
    // representante legal: van como linea en blanco, se completan al firmar.
    empRep:  b(22), empRepCi: b(12),
    empRm:   V(emp.rm, 14), empRmEstado: V(emp.rmEstado, 12), empRmFecha: V(emp.rmFecha, 10),
    empRmNum: V(emp.rmNum, 6), empRmTomo: V(emp.rmTomo, 6),
    empRepCargo: V(emp.repCargo, 14), empRepDoc: V(emp.repDoc, 18),
    cliNom:  V(cli.nombre || c.cli, 26),
    cliCi:   V(_draCedulaTxt(cli.cedula || cli.ci), 12),
    cliRif1: rifPart(cli.rif || cli.cedula || cli.ci, 0), cliRif2: rifPart(cli.rif, 1),
    fiaNom:  V(cli.fiador_nom, 26), fiaCi: V(_draCedulaTxt(cli.fiador_ci), 12),
    fiaRif1: rifPart(cli.fiador_rif || cli.fiador_ci, 0), fiaRif2: rifPart(cli.fiador_rif, 1),
    fiaDir:  V(cli.fiador_dir, 30), fiaDir2: V(cli.fiador_dir, 24),
    fiaEmail:V(cli.fiador_email, 20), fiaTel: V(cli.fiador_tel, 14),
    marca:   V(c.marca || moto.marca, 12),
    modelo:  V(c.modelo || moto.modelo, 16),
    anio:    V(c.anio || moto.anio, 6),
    tipo:    V(moto.tipo || 'PASEO', 10),
    color:   V((c.color && c.color!=='—') ? c.color : moto.color, 10),
    placa:   V((c.placa && c.placa!=='—') ? c.placa : moto.placa, 10),
    chasis:  V(c.serialChasis || moto.serialChasis || c.vin || moto.vin, 18),
    motor:   V(c.serialMotor || moto.serialMotor, 18),
    uso:     '<strong>'+String(c.uso_moto||'PARTICULAR').toUpperCase()+'</strong>',
    precioLetras:'<strong>'+letras(F.total)+'</strong>', precio:'<strong>'+num(F.total)+'</strong>',
    precioBs: precioBs ? '<strong>'+precioBs+'</strong>' : b(14),
    precioBs2: precioBs ? '<strong>'+precioBs+'</strong>' : b(14),
    inicial:'<strong>'+num(F.inicial)+'</strong>', inicial2:'<strong>'+num(F.inicial)+'</strong>',
    iniPct:'<strong>'+iniPct.toFixed(0)+'</strong>',
    saldo:'<strong>'+num(F.saldo)+'</strong>', saldo2:'<strong>'+num(F.saldo)+'</strong>',
    cuota:'<strong>'+num(F.cuota)+'</strong>', cuota2:'<strong>'+num(F.cuota)+'</strong>',
    nCuotas:'<strong>'+F.nCuotas+'</strong>', nCuotasLetras:'<strong>'+_draEnLetras(F.nCuotas)+'</strong>',
    dias:'<strong>'+dias+'</strong>', diasLetras:'<strong>'+_draEnLetras(dias)+'</strong>',
    medios: V((typeof _cuentasBanc!=='undefined' && _cuentasBanc && _cuentasBanc.length)
              ? _cuentasBanc.map(function(x){return x.nombre;}).join(', ') : '', 40),
    cliEmail: V(cli.email, 20), cliDir: V(cli.direccion, 26), cliTel: V(cli.tel, 14),
    empEmail: V(emp.email, 20), empDir: V(emp.direccion, 26), empTel: V(emp.tel, 14),
    concEmail: V(conc.email, 20), concDir: V(conc.direccion, 26), concTel: V(conc.telefono, 14),
    diaNum: '<strong>'+fc.getDate()+'</strong>', mesAnio: '<strong>'+MESES[fc.getMonth()]+' de '+fc.getFullYear()+'</strong>'
  };
}

function _draEnLetras(n){
  n = parseInt(n,10)||0;
  var u=['CERO','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIUNO','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO'];
  if(n<u.length) return u[n];
  var d=['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  if(n<100) return d[Math.floor(n/10)] + (n%10 ? ' Y '+u[n%10] : '');
  if(n<1000){ var ci=Math.floor(n/100), r=n%100;
    var cs=['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
    return (n===100?'CIEN':cs[ci]) + (r? ' '+_draEnLetras(r):''); }
  return String(n);
}

// Logo: primero el del sidebar (ya cargado), y si no, el archivo del repo
function _draLogo(){
  return (typeof _PAGASI_LOGO_BLUE!=='undefined' && _PAGASI_LOGO_BLUE)
      || ((document.querySelector('.sb-logo img')||{}).src||'')
      || 'assets/pagasi-logo.png';
}

var _DRA_CIERRE    = 'Las Partes firman el presente Contrato en señal de conformidad y aceptación, en la Fecha de Celebración.-';
var _DRA_CIERRE_CE = 'Las Partes firman el presente Contrato en señal de conformidad y aceptación, en la Fecha Efectiva.-';

// ── Estilos y armado del documento ──
function _draEstilos(){
  var az='#2563EB', azD='#1D4ED8';
  return {
    az:az, azD:azD,
    doc:"font-family:'Nunito Sans','Segoe UI',Arial,sans-serif;color:#1f2937;max-width:820px;margin:0 auto;padding:16px 30px;background:#fff",
    h1:'background:'+az+';color:#fff;text-align:center;padding:9px 16px;border-radius:5px;margin:0 0 10px;border-bottom:4px solid '+azD+';font-size:14px;font-weight:900;letter-spacing:.4px;line-height:1.4',
    cl:'color:'+az+';font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:.3px;margin:11px 0 5px;padding-bottom:3px;border-bottom:2px solid '+az+';page-break-after:avoid',
    p:'font-size:11px;line-height:1.45;color:#222;margin:4px 0;text-align:justify',
    sub:'font-size:11px;line-height:1.45;color:#222;margin:4px 0 4px 14px;text-align:justify',
    def:'font-size:8px;line-height:1.25;color:#333;margin:0 0 1px;text-align:left;break-inside:avoid'
  };
}

function _draParrafo(txt, S_){
  // El titulo del documento (primera linea, todo en mayusculas) va como cabecera
  if(/^CONTRATO DE [A-ZÁÉÍÓÚÑ ]+$/.test(txt)) return '<div style="'+S_.h1+'">'+txt+'</div>';
  var esDef = /^[“"]/.test(txt);
  if(esDef) return '<p style="'+S_.def+'">'+txt+'</p>';
  var esSub = /^\d{1,2}\.\d{1,2}\t?/.test(txt);
  var esLit = /^\([a-z]\)/.test(txt);
  var estilo = (esSub||esLit) ? S_.sub : S_.p;
  var t = txt.replace(/^(\d{1,2}\.\d{1,2})\t?\s*([^.]{3,85}\.)/,
            '<strong style="color:'+S_.azD+'">$1 $2</strong>');
  return '<p style="'+estilo+'">'+t+'</p>';
}

// Arma el cuerpo agrupando cada subclausula con sus literales, de modo que
// ninguna se parta entre dos hojas carta. Los encabezados de clausula quedan
// pegados a lo que sigue (nunca solos al pie de una pagina).
function _draCuerpo(lista, D, S_){
  var out = '', buf = '', enDef = false;
  var cerrar = function(){
    if(enDef){ cerrarDef(); return; }
    if(buf){ out += '<div style="page-break-inside:avoid">' + buf + '</div>'; buf = ''; }
  };
  // El listado de definiciones (11.6) se imprime a dos columnas para que ocupe
  // lo menos posible: son 35 lineas cortas que si no se comen una hoja entera.
  var cerrarDef = function(){
    if(buf){ out += '<div style="column-count:3;column-gap:14px;margin:2px 0 6px 10px">' + buf + '</div>'; buf = ''; }
    enDef = false;
  };
  lista.forEach(function(fn){
    var txt = fn(D);
    if(!txt || !String(txt).trim()) return;   // parrafo sin datos: no se imprime
    if(/^CONTRATO DE [A-ZÁÉÍÓÚÑ ]+$/.test(txt)){ cerrar(); out += _draParrafo(txt, S_); return; }
    if(/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑ]/.test(txt)){          // 1. OBJETO DEL CONTRATO
      cerrar();
      out += '<div style="'+S_.cl+';page-break-after:avoid">'+txt+'</div>';
      return;
    }
    if(/^[“"]/.test(txt)){                      // definiciones: dos columnas, letra chica
      if(!enDef) cerrar();                      // el titulillo 11.6 va a todo lo ancho
      buf += _draParrafo(txt, S_);
      enDef = true;
      return;
    }
    if(enDef){ cerrarDef(); }
    if(/^\d{1,2}\.\d{1,2}\t?/.test(txt)) cerrar();     // arranca subclausula nueva
    buf += _draParrafo(txt, S_);
  });
  cerrar();
  return out;
}

// Logo: primero el del sidebar (ya cargado), y si no, el archivo del repo
function _draLogo(){
  return (typeof _PAGASI_LOGO_BLUE!=='undefined' && _PAGASI_LOGO_BLUE)
      || ((document.querySelector('.sb-logo img')||{}).src||'')
      || 'assets/pagasi-logo.png';
}

// ── Estilos y armado del documento ──
function _draEstilos(){
  var az='#2563EB', azD='#1D4ED8';
  return {
    az:az, azD:azD,
    doc:"font-family:'Nunito Sans','Segoe UI',Arial,sans-serif;color:#1f2937;max-width:820px;margin:0 auto;padding:22px 30px;background:#fff",
    h1:'background:'+az+';color:#fff;text-align:center;padding:12px 16px;border-radius:5px;margin:0 0 14px;border-bottom:4px solid '+azD+';font-size:14px;font-weight:900;letter-spacing:.4px;line-height:1.4',
    cl:'color:'+az+';font-weight:900;font-size:12.5px;text-transform:uppercase;letter-spacing:.3px;margin:16px 0 7px;padding-bottom:4px;border-bottom:2px solid '+az+';page-break-after:avoid',
    p:'font-size:11.2px;line-height:1.6;color:#222;margin:6px 0;text-align:justify',
    sub:'font-size:11.2px;line-height:1.6;color:#222;margin:6px 0 6px 14px;text-align:justify',
    def:'font-size:10.6px;line-height:1.5;color:#333;margin:2px 0 2px 20px;text-align:justify'
  };
}

function _draParrafo(txt, S_){
  // El titulo del documento (primera linea, todo en mayusculas) va como cabecera
  if(/^CONTRATO DE [A-ZÁÉÍÓÚÑ ]+$/.test(txt)) return '<div style="'+S_.h1+'">'+txt+'</div>';
  var esClausula = /^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑ]/.test(txt);
  var esSub      = /^\d{1,2}\.\d{1,2}\t?/.test(txt);
  var esLit      = /^\([a-z]\)/.test(txt);
  var esDef      = /^[“"]/.test(txt);
  if(esClausula) return '<div style="'+S_.cl+'">'+txt+'</div>';
  if(esDef)      return '<p style="'+S_.def+'">'+txt+'</p>';
  var estilo = (esSub||esLit) ? S_.sub : S_.p;
  // resalta el numeral y el titulillo en negrita
  var t = txt.replace(/^(\d{1,2}\.\d{1,2})\t?\s*([^.]{3,85}\.)/,
            '<strong style="color:'+S_.azD+'">$1 $2</strong>');
  return '<p style="'+estilo+'">'+t+'</p>';
}

// ── Anexo A: cronograma real de cuotas quincenales ──
function _draCronograma(D, S_){
  var F = D.F, c = D.c;
  var ini = c.fecha ? new Date(c.fecha+'T12:00:00') : new Date();
  var M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var celda = 'display:flex;align-items:center;gap:6px;padding:6px 8px;background:#fff;border:1px solid #BFDBFE;border-radius:5px';
  var badge = 'display:inline-flex;align-items:center;justify-content:center;min-width:21px;height:21px;background:'+S_.az+';color:#fff;font-size:9.5px;font-weight:800;border-radius:50%;flex-shrink:0';
  var h = '<div style="margin:10px 0 6px;page-break-inside:avoid">'
    + '<div style="background:'+S_.az+';color:#fff;text-align:center;padding:8px 10px;border-radius:6px 6px 0 0">'
    +   '<div style="font-size:11px;font-weight:800;letter-spacing:.3px;text-transform:uppercase">Plan de Abonos Quincenales</div>'
    +   '<div style="font-size:9.5px;opacity:.9;margin-top:2px;font-weight:600">'+F.nCuotas+' cuotas quincenales de US$ '+D.num(F.cuota)+' cada una · Total US$ '+D.num(F.saldo)+'</div>'
    + '</div>'
    + '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:0 0 6px 6px;border-top:0;padding:10px">'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">';
  for(var i=0;i<F.nCuotas;i++){
    var f = new Date(ini.getTime()+((i+1)*15*24*60*60*1000));
    h += '<div style="'+celda+'"><span style="'+badge+'">'+(i+1)+'</span>'
       + '<span style="font-size:10px;color:#444;font-weight:600;flex:1;line-height:1.2">'+f.getDate()+' '+M[f.getMonth()]+' '+String(f.getFullYear()).slice(-2)+'</span>'
       + '<span style="font-size:10px;font-weight:800;color:'+S_.azD+';white-space:nowrap">$'+D.num(F.cuota)+'</span></div>';
  }
  return h+'</div></div></div>';
}

// n = cuantas firmas van en la fila (2, 3 o 4). El bloque se mantiene bajo para
// que quepa al pie de la ultima pagina de clausulas y no salte solo a otra hoja.
function _draFirma(rol, nombre, ci, n){
  n = n || 2;
  var ancho = 'calc(' + (100/n).toFixed(4) + '% - ' + (24 - 24/n).toFixed(1) + 'px)';
  // Alturas fijas: asi todas las rayas de firma quedan exactamente a la misma
  // altura aunque un nombre ocupe dos lineas y otro una.
  return '<div style="flex:0 0 '+ancho+';font-size:9.8px">'
    + '<div style="height:24px;text-align:center;font-weight:900;color:#1D4ED8;font-size:10px;line-height:1.2">'+rol+'</div>'
    + '<div style="height:40px"></div>'
    + '<div style="border-top:1px solid #333;padding-top:4px;line-height:1.5;text-align:center">'
    + '<div style="font-weight:800">'+nombre+'</div>'
    + (ci ? '<div>'+ci+'</div>' : '')
    + '<div>Fecha: __________</div></div></div>';
}

// ══════════ 1) CONTRATO DE COMPRAVENTA ══════════
function _htmlCompraventaDRA(credId){
  var D = _draDatos(credId); if(!D) return null;
  var S_ = _draEstilos(), c = D.c;
  var logo = _draLogo();
  var fecha = c.fecha ? new Date(c.fecha+'T12:00:00').toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'}) : '';

  var cuerpo = _draCuerpo(_DRA_CUERPO.slice(0, -1), D, S_);   // sin la linea de cierre

  return '<div class="cdoc" style="'+S_.doc+'">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    +   (logo?'<img src="'+logo+'" style="height:40px;object-fit:contain">':'<div></div>')
    +   '<div style="font-size:10.5px;color:#555;text-align:right;line-height:1.7">'
    +     '<strong>N° de Contrato:</strong> '+c.id+'<br><strong>Fecha:</strong> <strong>'+fecha+'</strong></div></div>'
    + cuerpo
    // Las cuatro firmas viajan juntas: nunca puede quedar una suelta en otra hoja
    + '<div style="page-break-inside:avoid;margin-top:16px">'
    +   _draParrafo(_DRA_CIERRE, S_)
    +   (function(){
          var f = [], hayFiador = !!_draTxt(D.cli.fiador_nom);
          var n = hayFiador ? 4 : 3;
          f.push(['Por el Comprador', D.cliNom, _draCedulaTxt(D.cli.cedula||D.cli.ci) || 'V-________']);
          if(hayFiador) f.push(['Por el Fiador', D.fiaNom, _draCedulaTxt(D.cli.fiador_ci) || 'V-________']);
          f.push(['Por Pagasi', D.empNom, 'RIF ' + String(D.emp.rif || '________')]);
          f.push(['Por el Concesionario', D.concNom, '']);
          return '<div style="display:flex;gap:24px;margin-top:12px;align-items:flex-start">'
               + f.map(function(x){ return _draFirma(x[0], x[1], x[2], n); }).join('') + '</div>';
        })()
    + '</div>'
    // ── Anexo A ──
    + '<div style="page-break-before:always;padding-top:10px">'
    +   '<div style="'+S_.h1+'">ANEXO “A” — CRONOGRAMA DE PAGOS</div>'
    +   '<p style="'+S_.p+'">El presente Anexo forma parte integrante del Contrato y refleja el calendario de vencimiento de las Cuotas Quincenales a cargo del Comprador.</p>'
    +   _draCronograma(D, S_)
    +   '<p style="'+S_.p+';margin-top:12px">El Comprador y el Fiador declaran conocer y aceptar el presente cronograma de pagos.</p>'
    +   '<div style="display:flex;gap:24px;align-items:flex-start;margin-top:18px;page-break-inside:avoid">'
    +     _draFirma('Por el Comprador', D.cliNom, _draCedulaTxt(D.cli.cedula||D.cli.ci) || 'V-________', 2)
    +     (_draTxt(D.cli.fiador_nom) ? _draFirma('Por el Fiador', D.fiaNom, _draCedulaTxt(D.cli.fiador_ci) || 'V-________', 2) : '')
    +   '</div>'
    + '</div></div>';
}

// ══════════ 2) CONTRATO DE CESION DE CREDITOS ══════════
function _htmlCesionDRA(credId){
  var D = _draDatos(credId); if(!D) return null;
  var S_ = _draEstilos(), c = D.c;
  var cuerpo = _draCuerpo(_DRA_CESION.slice(0, -1), D, S_);   // sin la linea de cierre
  var logo = _draLogo();
  var fecha = c.fecha ? new Date(c.fecha+'T12:00:00').toLocaleDateString('es-VE',{day:'2-digit',month:'long',year:'numeric'}) : '';
  return '<div class="cdoc" style="'+S_.doc+'">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    +   (logo?'<img src="'+logo+'" style="height:40px;object-fit:contain">':'<div></div>')
    +   '<div style="font-size:10.5px;color:#555;text-align:right;line-height:1.7">'
    +     '<strong>Crédito:</strong> '+c.id+'<br><strong>Fecha:</strong> <strong>'+fecha+'</strong></div></div>'
    + cuerpo
    + '<div style="page-break-inside:avoid;margin-top:16px">'
    +   _draParrafo(_DRA_CIERRE_CE, S_)
    +   '<div style="display:flex;gap:24px;align-items:flex-start;margin-top:14px">'
    +     _draFirma('Por el Cedente (Concesionario)', D.concNom, '', 2)
    +     _draFirma('Por el Cesionario (Pagasi)', D.empNom, 'RIF ' + String(D.emp.rif || '________'), 2)
    +   '</div>'
    + '</div>'
    + '<div style="page-break-inside:avoid;padding-top:14px">'
    +   '<div style="'+S_.h1+'">ANEXO “A” — CUENTAS POR COBRAR CEDIDAS</div>'
    +   '<p style="'+S_.p+'">Las Cuentas por Cobrar cedidas corresponden a la totalidad de las Cuotas Quincenales pendientes de pago por el Comprador bajo el Contrato de Compraventa de la misma fecha, según el siguiente detalle:</p>'
    +   _draCronograma(D, S_)
    + '</div></div>';
}

// ══════════ Los dos juntos (siempre salen en pareja) ══════════
function _htmlContratosDRA(credId){
  var a = _htmlCompraventaDRA(credId); if(!a) return null;
  var b = _htmlCesionDRA(credId);
  return a + '<div style="page-break-before:always"></div>' + b;
}
function _renderContratosDRA(){ _pintarDoc(_htmlContratosDRA()); }
