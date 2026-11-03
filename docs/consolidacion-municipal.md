# Consolidación municipal de Antenas Zallatel — 3 de noviembre de 2026

Se conservan 228 páginas municipales, que cubren los 2.007 municipios del inventario histórico en 11 provincias. Se retiran 1.779 documentos redundantes y se redirigen directamente a páginas que incorporan sus nombres y cobertura de servicio. El sitemap final contiene 251 URLs indexables.

## Selección

- Todos los municipios de al menos 5.000 habitantes según el catálogo geográfico existente, con población y coordenadas de la edición IGN 2025-10-20. No se presenta como padrón actualizado a 2026.
- Al menos los ocho municipios más poblados de cada provincia y protección explícita de Zalla.
- Municipios adicionales donde no exista una página conservada a un máximo de 25 km entre coordenadas. La población tiene prioridad al elegir esos puntos.
- Asignación al municipio conservado más cercano de la misma provincia. Las distancias son aproximadas, no recorridos por carretera ni garantías de desplazamiento.

La geografía se enlaza por código INE al inventario histórico; no se cambian los nombres ni las URLs conservadas. `content/municipal-geography.json` documenta los datos. `docs/cobertura-municipal.csv` contiene la asignación completa y el build genera `dist/coverage-manifest.json`.

## Resultado por provincia

| Provincia | Municipios cubiertos | Páginas conservadas |
|---|---:|---:|
| Álava | 51 | 9 |
| Bizkaia | 113 | 35 |
| Burgos | 371 | 20 |
| Gipuzkoa | 88 | 34 |
| Cantabria | 102 | 24 |
| Navarra | 272 | 26 |
| La Rioja | 174 | 12 |
| Palencia | 191 | 14 |
| Valladolid | 225 | 19 |
| León | 211 | 22 |
| Segovia | 209 | 13 |

## Migración

Se mantiene el diseño de la rama publicada `rapid-base-zalla`, incluidos cabecera, hero, marca, fotografías, servicios y contactos. La rama `main` es un prototipo antiguo y no es la base de este cambio.

Cada página conservada incorpora sus pueblos agrupados con anclas propias. Los listados, opciones y datos del buscador apuntan al destino final. Los enlaces de municipios próximos pasan a seleccionarse por distancia entre coordenadas, dentro de la misma provincia. Los alias históricos, incluidas las variantes .html, se resuelven directamente a las páginas conservadas para evitar cadenas.

Se regeneran los sitemaps únicamente con documentos conservados. Se verifica que todos los municipios sigan visibles, que el buscador contenga los 2.007 nombres, que no haya archivos retirados ni enlaces rotos, que los destinos sean de la misma provincia y que se respete el límite de distancia. Las auditorías de producción y SEO se aplican al resultado final.

## Seguimiento

Reenviar https://antenaszalla.com/sitemap.xml en Search Console tras publicar. No se ha enviado automáticamente. Una caída de posiciones no demuestra una penalización y esta reorganización no garantiza recuperar posiciones. Revisar impresiones, clics, consultas e indexación después del nuevo rastreo. No utilizar la herramienta de retiradas para ocultar las URLs consolidadas; las redirecciones permanentes permiten descubrir sus destinos.
