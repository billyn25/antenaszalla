# Cobertura municipal actual — noviembre de 2026

La versión publicada se desarrolla sobre `rapid-base-zalla`. La ampliación del 13 de noviembre mantiene las 228 fichas anteriores y recupera 26 del País Vasco: **254 páginas municipales**, **2.007 municipios de 11 provincias** y **1.753 localidades agrupadas** mediante redirecciones permanentes. El País Vasco reúne **104 fichas propias**: 47 en Bizkaia, 41 en Gipuzkoa y 16 en Álava. El sitemap contiene **279 URLs indexables**, incluida la guía sobre La Séptima y TDT UHD.

Consulta [el criterio y la migración](docs/consolidacion-municipal.md) y [la asignación completa por municipio](docs/cobertura-municipal.csv). Las cifras de auditorías anteriores corresponden a versiones previas a esta consolidación.

# Antenas Zalla

Nueva web SEO local para Euskadi y Burgos.

## Enfoque
- Una página útil por municipio.
- Arquitectura distinta de Antenas Abaso, Antenas Rapid y Antenista Cerca.
- Contenido centrado en averías, diagnóstico y soluciones.
- Producción indexable solo de forma explícita.
- Preservación de URLs históricas antes de migrar el dominio.

Getaria recupera su URL histórica `/antenas-guipuzcoa/getaria`; las variantes Guetaria redirigen directamente a ella. Lekeitio conserva `/antenas-bizkaia/lekeitio`. Las nuevas prioridades se añaden a la selección geográfica original, sin sustituir ninguna ficha ya publicada.

`npm run build:production` regenera páginas, enlaces, redirecciones y sitemaps y ejecuta las auditorías finales. La selección y las prioridades explícitas por código INE se mantienen en `scripts/municipal-coverage.mjs`. Las solicitudes de indexación se realizan aparte en Search Console; publicar el sitemap no equivale a enviarlo ni a confirmar indexación.
