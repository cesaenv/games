# Juegos

Juegos pequeños para jugar en el navegador, hechos con HTML, CSS y JavaScript. Están publicados en GitHub Pages y usan el mismo diseño que mi web ([cesaenv.github.io](https://cesaenv.github.io)).

Por ahora:

- 2048
- Snake
- Buscaminas
- Tetris
- Memoria
- Tres en raya

## Cómo está organizado

Cada juego es una carpeta con su `index.html`. Lo común está en `shared/` (la cabecera, el botón de tema, el panel de jugador automático y los estilos de marcadores, botones y avisos) y el menú es el `index.html` de la raíz.

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
   <link rel="stylesheet" href="../shared/ui.css" />
   <script src="../shared/chrome.js"></script>
   ```

2. Si el juego se puede resolver solo, enlazar también `shared/autoplay.css` y usar `createAutoPanel` de `shared/autoplay.js`. El juego solo tiene que dar una función `step` que haga una jugada y diga si se puede seguir.
3. Añadir la tarjeta en el `index.html` de la raíz.

Si guarda cosas en `localStorage`, la clave tiene que llevar un prefijo propio (por ejemplo `snake.record`), porque todos los juegos comparten dominio.

## Sobre el 2048

Es la versión web de mi proyecto 2048 del máster (la carpeta `docs/`). Incluye tres jugadores automáticos (Random, Algorithm y Smart), escritos en JavaScript, que usan el panel de `shared/autoplay.js`. La versión de escritorio en Python y el entrenamiento de la red neuronal siguen solo en el otro proyecto.

## Sobre el Snake

Tiene tres jugadores automáticos. Random elige al azar entre las direcciones en las que no choca al momento. Algorithm va por el camino más corto a la comida. Smart sigue un recorrido que pasa por todas las casillas y se salta trozos cuando puede, así que acaba llenando el tablero.

## Sobre el Buscaminas

Tablero de 16x16 con 40 minas. La primera casilla que se destapa nunca es una mina. Los tres jugadores automáticos solo miran lo que vería una persona. Random destapa casillas al azar. Algorithm usa la regla básica (si a un número le faltan tantas minas como casillas tiene, todas son minas; si ya no le falta ninguna, el resto son seguras) y adivina cuando no hay nada seguro. Smart añade la deducción entre números vecinos y, cuando tiene que adivinar, calcula el riesgo de cada casilla probando todas las colocaciones de minas posibles.

## Sobre el Tetris

Tablero de 10x20 con las siete piezas, que salen de una bolsa barajada. La IA decide dónde colocar cada pieza y luego la gira, la mueve y la baja paso a paso. Random elige una colocación al azar y pierde enseguida. Algorithm puntúa cada colocación por la altura, los huecos, lo lisa que queda la superficie y las líneas que completa, mirando solo la pieza actual. Smart usa la misma puntuación pero mira también la pieza siguiente, y con eso casi no pierde nunca.

## Sobre la memoria

Tablero de 4x4 con 8 parejas. Los tres jugadores se diferencian en cuántas cartas recuerdan: Random ninguna, Algorithm las dos últimas y Smart todas. El récord es el menor número de intentos.

## Sobre el tres en raya

Juegas con la X contra la máquina, y el modo decide cómo juega ella. Con Iniciar, la máquina juega las dos partes. Random elige una casilla libre al azar. Algorithm gana si puede, si no bloquea, y si no prefiere el centro y las esquinas. Smart usa minimax, que prueba todas las partidas posibles, y nunca pierde.
