# OSCAMON — Edición Huesca

Un juego de rol y captura de criaturas al estilo Pokémon, ambientado en **Huesca y el Alto Aragón**.
Está hecho con HTML5 Canvas y JavaScript puro: no tiene dependencias ni necesita compilación, y todo el pixel art se genera por código.

> Juego de fans no oficial. Todas las criaturas, nombres y gráficos son originales.

## Cómo jugar

Abre `index.html` en el navegador. También puedes servir la carpeta con cualquier servidor estático:

```bash
npx http-server .   # o: python3 -m http.server
```

Funciona en el móvil con mandos táctiles. Para publicarlo, activa GitHub Pages en la rama principal.

| Acción | Teclado | Móvil |
|---|---|---|
| Moverse | Flechas / WASD | Cruceta |
| Aceptar / hablar | Z, Espacio, Enter | A |
| Cancelar / correr (mantener) | X, Esc | B |
| Menú (equipo, mochila, Oscadex, guardar) | M | MENÚ |

## El mapa

Es una versión estilizada de Huesca, con el norte arriba:

- **Casco Antiguo**, rodeado por **el Coso**: la Catedral de Santa María, el Ayuntamiento, San Pedro el Viejo y el Palacio de los Reyes de Aragón, que hace de Gimnasio.
- **Plaza de Navarra**, con la Fuente de las Musas y el Círculo Oscense.
- **Parque Miguel Servet**, con estanque y hierba alta.
- **Estación Intermodal** y la vía del tren a Canfranc, al sur.
- **Río Isuela**, al este, con puentes hacia el **Castillo de Montearagón**.
- **Ruta del Pirineo** hacia el **Salto de Roldán**, donde espera un legendario.
- **Mallos de Riglos**, al noroeste, entre rocas rojas.

Con la Medalla Campana puedes coger el tren en la Estación Intermodal y subir a **Jaca**:

- La **Catedral de San Pedro** (románica, siglo XI), la **Torre del Reloj** y el Ayuntamiento.
- La **Ciudadela**, una fortaleza pentagonal con ciervos en el foso.
- El **río Aragón** y el **Puente de San Miguel**.
- El **Pabellón de Hielo**, que es el segundo Gimnasio, con la Líder Nieves.
- La hierba alta de la **Peña Oroel**, con Oscamon de tipo Hielo.

## Los Oscamon (19)

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
| Bayardo (legendario) | Aire/Normal | El caballo de Roldán |

## Objetivo

1. Elige a tu primer Oscamon en el Laboratorio del Profesor Cajal.
2. Captura Oscamon en la hierba alta y vence a los entrenadores.
3. Derrota a **Ramiro II el Monje** en el Gimnasio y consigue la **Medalla Campana**.
4. Viaja en tren a Jaca y vence a **Nieves** en el Pabellón de Hielo para ganar la **Medalla Oroel**.
5. Atrapa al legendario Bayardo y completa el Oscadex.

La partida se guarda en el navegador (`localStorage`) desde el menú. También se guarda sola al curar a tus Oscamon en el Centro.

## Estructura

```
index.html      página y mandos táctiles
css/style.css   interfaz (diálogos, menús, mandos)
js/data.js      tipos, movimientos, especies y objetos
js/map.js       mapa de Huesca, edificios, carteles, NPC y zonas
js/jaca.js      mapa de Jaca y registro de mapas
js/gfx.js       pixel art procedural (casillas, edificios, personajes, criaturas)
js/ui.js        entrada, sonido sintetizado, diálogos y menús
js/battle.js    sistema de combate por turnos
js/main.js      mundo, historia, menús y guardado
```
