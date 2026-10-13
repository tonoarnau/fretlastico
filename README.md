# Fretlastico

Herramientas para aprender guitarra, bajo y piano en el navegador. Se publica con GitHub Pages:
https://tonoarnau.github.io/fretlastico/

- **Taller** (`index.html`): todas las herramientas a la vez (escalas y modos, acordes y CAGED, tríadas, técnica,
  licks, piano y pentagrama, oído, voz, caja de ritmos y loopers, amplificador NAM).
- **Aprende** (`aprende/`): un camino guiado con unidades cortas que te escuchan tocar por el micrófono, progreso
  guardado en el navegador, repasos espaciados y sonidos reales. Prototipo: camino de guitarra con cuatro unidades.

## Aprende: estructura

| Archivo | Qué hace |
| --- | --- |
| `aprende/js/teoria.js` | Notas, nombres según la tonalidad, afinaciones y acordes (sin DOM; con tests) |
| `aprende/js/sonido.js` | Reproductor de muestras, rasgueo y metrónomo con planificación anticipada |
| `aprende/js/escucha.js` | Micrófono: nota que suena (autocorrelación) y parecido con un acorde (croma) |
| `aprende/js/almacen.js` | Perfil, unidades completadas, racha y repasos (localStorage) |
| `aprende/js/dibujos.js` | Diagramas de acorde y mástil en SVG, diestro o zurdo |
| `aprende/js/cursos/guitarra.js` | Las unidades del camino, como datos |
| `aprende/js/app.js` | Navegación, bienvenida, «Hoy toca» y los tipos de paso |

Sin dependencias ni compilación: son módulos JavaScript nativos. Para probarlo en local hace falta un servidor
(los módulos no cargan desde `file://`):

```sh
python3 -m http.server 8000
# http://localhost:8000/aprende/  ·  tests: http://localhost:8000/aprende/tests/
```

El micrófono solo funciona en `https://` o en `localhost`.

## Privacidad

Aprende no tiene cuentas ni servidor: el progreso se guarda en el navegador y el audio del micrófono se analiza en
el dispositivo, sin enviarse a ningún sitio.

## Créditos

Sonidos de guitarra, bajo y piano: [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments), de
Nicholaus Brosowsky, con licencia [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Detalle en
[`aprende/sonidos/CREDITOS.md`](aprende/sonidos/CREDITOS.md).
