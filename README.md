# Juegos

Juegos pequeños para jugar en el navegador, hechos con HTML, CSS y JavaScript. Están publicados en GitHub Pages y usan el mismo diseño que mi web ([cesaenv.github.io](https://cesaenv.github.io)).

Por ahora:

- 2048

## Cómo está organizado

Cada juego es una carpeta con su `index.html`. Lo común está en `shared/` (la cabecera, el botón de tema y el panel de jugador automático) y el menú es el `index.html` de la raíz.

Los colores y la tipografía no están en este repo. Cada página carga `https://cesaenv.github.io/theme.css`, que es el mismo archivo que usa mi web, así que si cambio el diseño allí se cambia aquí también. Por eso en los juegos uso solo las variables del tema (`--bg`, `--surface`, `--accent`...) y nunca colores sueltos. Si cambio el valor de una variable no pasa nada, pero si la renombro o la borro hay que revisar los juegos.

El tema claro/oscuro también se comparte con la web, porque están en el mismo dominio y guardan la preferencia en el mismo sitio.

## Probarlo en local

Hace falta tener la web en marcha (`npm run dev` en `cesaenv-web`, puerto 4321) para que coja el tema, y aquí:

```
python -m http.server 8000
```

y abrir http://localhost:8000. Hay que hacerlo así porque los módulos de JavaScript no funcionan abriendo el archivo directamente.

## Añadir un juego

1. Crear una carpeta con su `index.html`, con esto en el `<head>`:

   ```html
   <link rel="stylesheet" href="https://cesaenv.github.io/theme.css" />
   <link rel="stylesheet" href="../shared/games.css" />
   <script src="../shared/chrome.js"></script>
   ```

2. Si el juego se puede resolver solo, enlazar también `shared/autoplay.css` y usar `createAutoPanel` de `shared/autoplay.js`. El juego solo tiene que dar una función `step` que haga una jugada y diga si se puede seguir.
3. Añadir la tarjeta en el `index.html` de la raíz.

Si guarda cosas en `localStorage`, la clave tiene que llevar un prefijo propio (por ejemplo `snake.record`), porque todos los juegos comparten dominio.

## Sobre el 2048

Es la versión web de mi proyecto 2048 del máster (la carpeta `docs/`). Incluye tres jugadores automáticos (Random, Algorithm y Smart), escritos en JavaScript, que usan el panel de `shared/autoplay.js`. La versión de escritorio en Python y el entrenamiento de la red neuronal siguen solo en el otro proyecto.
