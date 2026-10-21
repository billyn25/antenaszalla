# Coincidencia de contenido con Antenas Rapid · 21/10/2026

## Alcance y fuente

Comparación del HTML público de antenaszalla.com y www.antenasrapid.com, descargado el 21/10/2026, con el paquete generado desde rapid-base-zalla tras esta corrección. La rama main conserva una versión piloto antigua y no representa la web publicada.

La coincidencia de contenido se confirma por los textos idénticos en las tarjetas de servicios, porteros, cobertura móvil y presentación del trabajo. El historial y el nombre rapid-base-zalla son coherentes con una base compartida, pero no permiten atribuir por sí solos una caída de posicionamiento a ese origen.

## Método

Se extrae texto del elemento main, excluyendo scripts y estilos; se convierte a minúsculas y se tokeniza por palabras Unicode. Se cuentan secuencias únicas de cinco palabras consecutivas. Coincidencia direccional = secuencias presentes también en Rapid / secuencias de Zallatel. No es una puntuación de Google ni una prueba de penalización. Cuenta también texto de acordeones, menús y enlaces dentro de main; no cabecera ni pie.

Reproducción con HTML descargado o generado:

```sh
python scripts/compare-content.py zallatel.html rapid.html
```

## Resultado

| Página | Publicada antes | Generada después |
|---|---:|---:|
| Portada | 27,55 % | 8,73 % |
| Zalla | 8,45 % | 2,94 % |
| Balmaseda | 8,88 % | 3,06 % |
| Güeñes | 8,79 % | 2,85 % |

Muestra local de tres municipios de Bizkaia: no extrapolar estos valores a las 2.007 localidades. Comparar después con Rapid público mantenido como referencia, sin modificar Rapid. Las URLs públicas comparadas son / y /antenas-bizkaia/{zalla,balmaseda,guenes}, con la canónica de cada dominio.

## Corrección

- Redacción propia de las diez fichas de servicios: comprobaciones concretas de recepción, bus de portero, LNB, cabecera, reparto, router y mantenimiento.
- Nuevo texto principal y presentación de la portada.
- Reescritura de los bloques compartidos de porteros, cobertura móvil, criterios de trabajo y preparación del aviso.
- Se mantienen servicios, imágenes, enlaces, datos de contacto, metadatos y generadores de variantes locales.

## Límites y siguiente foco

Esta auditoría aborda coincidencia entre dominios. El generador sigue compartiendo bloques entre municipios de Zallatel. La auditoría interna del proyecto registra un máximo de 0,751 en su muestra global tras el cambio (0,740 antes); usa un método diferente y no es comparable con la tabla anterior. No se ha demostrado una mejora de la diferenciación entre municipios con esta corrección: requiere revisar la composición de bloques y las preguntas por perfiles de instalación, además de la redacción.

No se dispone aquí de datos nuevos de Search Console para atribuir causas de indexación o comprobar recuperación. Debe evaluarse por URL tras el rastreo del cambio, sin prometer posiciones.
