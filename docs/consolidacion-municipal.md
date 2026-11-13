# Cobertura municipal de Antenas Zalla — 13 de noviembre de 2026

Se mantienen las 228 fichas de la selección anterior y se recuperan 26 localidades del País Vasco: 254 páginas municipales para los 2.007 municipios del inventario histórico en 11 provincias. Los otros 1.753 municipios mantienen cobertura agrupada y redirección directa a su ficha correspondiente. El sitemap final contiene 279 URLs indexables: 254 fichas municipales, 11 índices provinciales y 14 páginas generales y guías, incluida La Séptima y TDT UHD.

## Selección

- Todos los municipios de al menos 5.000 habitantes según el catálogo geográfico existente, con población y coordenadas de la edición IGN 2025-10-20. No se presenta como padrón actualizado a 2026.
- Al menos los ocho municipios más poblados de cada provincia y protección explícita de Zalla.
- Municipios adicionales donde no exista una página conservada a un máximo de 25 km entre coordenadas. La población tiene prioridad al elegir esos puntos.
- Una vez calculada la selección geográfica anterior, se añaden 26 prioridades explícitas por código INE del País Vasco. Se aplica esta ampliación después de la selección base para que ninguna nueva ficha pueda sustituir a una ya publicada, ni siquiera cuando ambas están próximas.
- Asignación al municipio conservado más cercano de la misma provincia. Las distancias son aproximadas, no recorridos por carretera ni garantías de desplazamiento.

La geografía se enlaza por código INE al inventario histórico; no se cambian los nombres ni las URLs conservadas. `content/municipal-geography.json` documenta los datos. `docs/cobertura-municipal.csv` contiene la asignación completa y el build genera `dist/coverage-manifest.json`.

## Resultado por provincia

| Provincia | Municipios cubiertos | Páginas conservadas |
|---|---:|---:|
| Álava | 51 | 16 |
| Bizkaia | 113 | 47 |
| Burgos | 371 | 20 |
| Gipuzkoa | 88 | 41 |
| Cantabria | 102 | 24 |
| Navarra | 272 | 26 |
| La Rioja | 174 | 12 |
| Palencia | 191 | 14 |
| Valladolid | 225 | 19 |
| León | 211 | 22 |
| Segovia | 209 | 13 |

## Ampliación del País Vasco

Los 252 municipios de Bizkaia, Gipuzkoa y Álava siguen localizables en los índices y el buscador. La selección pasa de 78 a 104 fichas propias. No se han retirado páginas de ninguna provincia ni se ha cambiado la URL canónica de las 228 fichas anteriores.

| Provincia | Fichas recuperadas |
|---|---|
| Bizkaia | Sopuerta; Karrantza Harana/Valle de Carranza; Gordexola; Galdames; Artzentales; Trucios-Turtzioz; Lanestosa; Urduña/Orduña; Igorre; Plentzia; Bakio; Mundaka |
| Gipuzkoa | Getaria; Eskoriatza; Zestoa; Soraluze-Placencia de las Armas; Idiazabal; Aia; Mendaro |
| Álava | Artziniega; Zuia; Legutio; Aramaio; Laguardia; Valdegovía/Gaubea; Campezo/Kanpezu |

La ampliación refuerza el entorno de Zalla, las localidades de costa e interior y las consultas que antes se agrupaban en otra localidad, como Urduña/Orduña con Güeñes o Aramaio con Alegría-Dulantzi. Es una decisión editorial de cobertura; no se presenta como resultado de datos de Search Console ni como prueba de intervenciones realizadas.

Getaria recupera su ruta histórica `/antenas-guipuzcoa/getaria`. Las grafías Guetaria y las variantes de ruta Getaria/Gipuzkoa, con extensiones históricas o barra final, resuelven directamente a esa misma ficha mediante 301. Lekeitio permanece en `/antenas-bizkaia/lekeitio`; ambas reciben enlaces destacados en el bloque del País Vasco de la portada, además de su índice provincial y las localidades cercanas.

Las prioridades y alias se declaran en `scripts/municipal-coverage.mjs`. Los tests comparan la selección ampliada con la anterior y exigen que se mantengan todas las fichas originales; la auditoría del resultado construido verifica destinos, cobertura, enlaces, buscador, contador y alias de Getaria.

## Migración

Se mantiene el diseño de la rama publicada `rapid-base-zalla`, incluidos cabecera, hero, marca, fotografías, servicios y contactos. La rama `main` es un prototipo antiguo y no es la base de este cambio.

Cada página conservada incorpora sus pueblos agrupados con anclas propias. Los listados, opciones y datos del buscador apuntan al destino final. Los enlaces de municipios próximos pasan a seleccionarse por distancia entre coordenadas, dentro de la misma provincia. Los alias históricos, incluidas las variantes .html, se resuelven directamente a las páginas conservadas para evitar cadenas.

Se regeneran los sitemaps únicamente con documentos conservados. Se verifica que todos los municipios sigan visibles, que el buscador contenga los 2.007 nombres, que no haya archivos retirados ni enlaces rotos, que los destinos sean de la misma provincia y que se respete el límite de distancia. Las auditorías de producción y SEO se aplican al resultado final.

## Seguimiento

Reenviar https://antenaszalla.com/sitemap.xml en Search Console tras publicar. No se ha enviado automáticamente. Una caída de posiciones no demuestra una penalización y esta reorganización no garantiza recuperar posiciones. Revisar impresiones, clics, consultas e indexación después del nuevo rastreo. No utilizar la herramienta de retiradas para ocultar las URLs consolidadas; las redirecciones permanentes permiten descubrir sus destinos.
