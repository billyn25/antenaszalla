import {createHash} from 'node:crypto';
// Conditional diagnostic cases, never assertions about a municipality's infrastructure.
const alternatives={
 tdt:[
  ['La TV falla después de una tormenta','Si el fallo comenzó tras viento o lluvia, se comprueban fijaciones, orientación y posibles entradas de agua en el coaxial. Antes de sustituir equipos se mide la recepción y se contrasta con la señal que llega a la vivienda.'],
  ['Solo desaparece un grupo de canales','Cuando varios canales fallan juntos, interesa comparar los múltiplex con medidor de campo. Se revisan calidad, nivel y configuración de la cabecera; aumentar la ganancia de todos los canales puede empeorar una saturación.'],
  ['Hay señal, pero aparecen cortes y bloques','Un nivel alto no garantiza una imagen estable. Se contrastan MER y errores de recepción para distinguir señal degradada, ecos o interferencias de un problema en el reparto. La solución depende de dónde se pierde calidad.'],
  ['La recepción cambia al conectar otro televisor','Se comprueban repartidores, derivadores, tomas y conectores. Una conexión defectuosa o una distribución mal adaptada puede afectar a varias salidas; conviene comparar cada punto antes de cambiar la antena del tejado.'],
  ['El cable exterior está agrietado','Si la cubierta del coaxial se cuartea o entra humedad, se revisan el tramo expuesto, las conexiones y las pérdidas. Para exterior se valora cable con cubierta adecuada a intemperie y conectores protegidos, sin ocultar empalmes deteriorados.']
 ],
 portero:[
  ['El abrepuertas zumba pero la puerta sigue cerrada','Se diferencia un fallo eléctrico de un problema de ajuste mecánico. Se comprueban alimentación bajo carga, conexiones y alineación del cerradero; aumentar tensión o sustituir el telefonillo sin medir puede no resolver la apertura.'],
  ['La llamada llega a una vivienda equivocada','En una instalación con este síntoma se revisan conexiones, programación y correspondencia de terminales según el sistema. Primero se identifica si la avería apareció tras una reparación o si afecta a más viviendas.'],
  ['Se oye un zumbido durante la conversación','La revisión separa interferencias, alimentación y conexiones de audio. Conviene indicar si el ruido aparece en todos los terminales, únicamente al abrir o solo en una vivienda para delimitar el tramo afectado.'],
  ['El telefonillo antiguo ya no tiene recambio directo','Antes de montar un terminal universal se identifica la tecnología de la instalación y su esquema compatible. Un sistema convencional, uno digital y uno de dos hilos no admiten necesariamente el mismo recambio.'],
  ['La apertura falla de forma intermitente','Se comparan pulsador, contactos, fuente y cerradero cuando la orden de apertura llega unas veces y otras no. Saber si ocurre con calor, humedad o desde todos los vecinos ayuda a preparar la comprobación, sin dar por confirmada la causa.']
 ],
 videoportero:[
  ['La imagen se ve oscura solo por la noche','Se compara la imagen de día y de noche y se revisan iluminación de la placa, lente y alimentación. La falta de luz y un defecto de cámara requieren soluciones distintas; no se cambia el monitor sin contrastar la señal.'],
  ['Una segunda entrada no muestra vídeo','Si hay varias placas, se comprueba desde cuál falla la llamada o la imagen. La revisión puede incluir configuración de accesos, distribuidores y conexiones, comparando el funcionamiento de otras viviendas antes de sustituir elementos.'],
  ['Quieres añadir otro monitor dentro de casa','La ampliación depende de la capacidad del sistema, su alimentación y el cableado disponible. Se identifica la referencia de la placa y de los monitores antes de presupuestar otro punto o una función adicional.'],
  ['La placa de calle tiene humedad o condensación','Se revisan estanqueidad, pasos de cable y estado del módulo de cámara. Secar el frontal puede ocultar temporalmente el síntoma; interesa localizar la entrada de agua y comprobar el funcionamiento antes de cerrar la intervención.'],
  ['Necesitas renovar la placa del edificio','Se comprueba compatibilidad con los terminales de las viviendas, número de accesos y alimentación. La elección entre renovar solo la placa o el conjunto se concreta tras identificar el sistema, los recambios disponibles y el estado del cableado.']
 ]
};
export function localFaultRows(original,id,page){
 if(page.type!=='town') return original;
 const seed=page.path||`${page.province}|${page.name}`;
 return [...original,...(alternatives[id]||[])].map(row=>({row,key:createHash('sha256').update(`${seed}|${id}|${row[0]}`).digest('hex')})).sort((a,b)=>a.key.localeCompare(b.key)).slice(0,original.length).map(x=>x.row);
}
