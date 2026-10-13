# OSCAMON — Edición Huesca

Un juego de rol y captura de criaturas al estilo Pokémon, ambientado en **Huesca y el Alto Aragón**.
Está hecho con HTML5 Canvas y JavaScript puro: no tiene dependencias ni necesita compilación, y todo el pixel art se genera por código.

> Juego de fans no oficial. Todas las criaturas, nombres y gráficos son originales.

## Cómo jugar

Abre `index.html` en el navegador. También puedes servir la carpeta con cualquier servidor estático:

```bash
npx http-server .   # o: python3 -m http.server
```

Funciona en el móvil con mandos táctiles.

**Jugar online:** https://jaimeferrer.github.io/PruebaJuego/ (se publica solo con GitHub Pages cada vez que se sube a `main`).

| Acción | Teclado | Móvil |
|---|---|---|
| Moverse | Flechas / WASD | Cruceta |
| Aceptar / hablar | Z, Espacio, Enter | A |
| Cancelar / correr (mantener) | X, Esc | B |
| Menú (equipo, mochila, Oscadex, guardar) | M | MENÚ |

## El mapa

Es un único mapa de toda la **provincia de Huesca** (200 × 170 casillas), con el norte arriba. Pueblos, ríos y sierras están en su posición real aproximada. Las ciudades de Huesca y Jaca están ampliadas para que quepan sus monumentos. Con la tecla **M → MAPA** ves la provincia entera y dónde estás.

- **Huesca** (punto de partida): el Casco Antiguo con el Coso, la Catedral, San Pedro el Viejo, el Palacio de los Reyes de Aragón (primer Gimnasio), la Plaza de Navarra, el Parque Miguel Servet, el río Isuela, Montearagón y el Salto de Roldán.
- **Hoya de Huesca y Prepirineo**: Ayerbe, el **Castillo de Loarre**, Riglos y sus **Mallos**, el Monasterio de **San Juan de la Peña**, el embalse de La Peña y el puerto de Monrepós por la **Sierra de Guara**.
- **Jacetania**: **Jaca** (Catedral, Ciudadela, Pabellón de Hielo), los valles de **Hecho** y **Ansó**, y **Canfranc** con su Estación Internacional.
- **Alto Gállego y Valle de Tena**: Sabiñánigo, Biescas, Panticosa (su balneario cura al equipo) y Sallent de Gállego, con Formigal.
- **Sobrarbe**: Torla, el **Valle de Ordesa** con la Cola de Caballo y Monte Perdido, Aínsa, Bielsa y el embalse de Mediano con su torre sumergida.
- **Ribagorza**: Graus, Benasque y el **Aneto** (3.404 m), con el refugio de la Renclusa.
- **Somontano y Cinca**: Alquézar, **Barbastro** (segundo Gimnasio, entre viñedos) y Monzón con su castillo templario.
- **Los Monegros**: la estepa y Sariñena.
- **Ríos**: Aragón, Aragón Subordán, Gállego, Ara, Cinca, Ésera, Isuela y Vero.

Con la Medalla Campana puedes coger el **tren Huesca-Canfranc**, con paradas en Huesca, Ayerbe, Sabiñánigo, Jaca y Canfranc. Andando también se llega a todas partes.

## Cómo entrenar a tus Oscamon

- Los Oscamon salvajes son más fuertes cuanto más lejos estés de Huesca. Empieza en el **Parque Miguel Servet** (nivel 2-3) y en la ruta del Salto de Roldán (nivel 2-4). Luego ve a la Hoya (4-7), Loarre (6-9) y Riglos (8-11). El Pirineo es para el final (16-32).
- En el menú de ataques, **▲** marca un ataque muy eficaz y **▼** uno poco eficaz.
- **Todo el equipo gana experiencia**: el que lucha recibe toda y los demás, la mitad. Captura Oscamon de varios tipos.
- Cura gratis en cualquier Centro Oscamon, en tu casa, en el balneario de Panticosa o en los refugios de montaña.
- Si pierdes, apareces en el último Centro Oscamon que visitaste.
- Junto a tu casa hay una entrenadora que da consejos.

## Los Oscamon (23)

| | Tipo | Inspiración |
|---|---|---|
| Parrillín → Laurentón | Fuego | San Lorenzo y su parrilla |
| Isuelín → Isuelón | Agua | Río Isuela |
| Somontín → Somontazo | Planta | Uvas del Somontano |
| Quebranto | Aire | Quebrantahuesos |
| Cierzín | Aire | El cierzo |
| Mallorroc | Roca | Mallos de Riglos |
| Albahaquín | Planta | La albahaca de San Lorenzo |
| Trenzón | Normal | La trenza de Huesca |
| Ranisuela | Agua | Ranas de las acequias |
| Sarrión | Normal/Roca | Sarrio del Pirineo |
| Danzante | Normal | Danzantes de Huesca |
| Campanón | Roca | Leyenda de la Campana de Huesca |
| Armiñín | Hielo | El armiño del Pirineo |
| Nevero | Hielo | Los neveros que aguantan todo el verano |
| Anetón | Hielo/Roca | El glaciar del Aneto |
| Almenazo | Roca | Las almenas del Castillo de Loarre |
| Marmotín | Normal | Marmota del Pirineo |
| Truchón | Agua | Trucha de los ríos de montaña |
| Bayardo (legendario) | Aire/Normal | El caballo de Roldán (Salto de Roldán) |
| Bucardo (legendario) | Roca/Hielo | La cabra montés del Pirineo (Ordesa) |

## Objetivo

1. Elige a tu primer Oscamon en el Laboratorio del Profesor Cajal.
2. Captura Oscamon en la hierba alta y vence a los entrenadores.
3. Gana las tres medallas:
   - **Medalla Campana**: Ramiro II el Monje, en Huesca (tipo Roca).
   - **Medalla Somontano**: Vero, en la bodega de Barbastro (tipo Planta).
   - **Medalla Oroel**: Nieves, en el Pabellón de Hielo de Jaca (tipo Hielo).
4. Atrapa a los legendarios Bayardo y Bucardo y completa el Oscadex.

La partida se guarda en el navegador (`localStorage`) desde el menú. También se guarda sola al curar a tus Oscamon en el Centro.

## Estructura

```
index.html      página y mandos táctiles
css/style.css   interfaz (diálogos, menús, mandos)
js/data.js      tipos, movimientos, especies y objetos
js/map.js       ciudad de Huesca, edificios, carteles y NPC (se incrusta en el mapa grande)
js/jaca.js      ciudad de Jaca (se incrusta en el mapa grande)
js/world.js     mapa de la provincia: relieve, ríos, carreteras, pueblos y regiones
js/gfx.js       pixel art procedural (casillas, edificios, personajes, criaturas)
js/ui.js        entrada, sonido sintetizado, diálogos y menús
js/battle.js    sistema de combate por turnos
js/main.js      mundo, historia, menús y guardado
```
