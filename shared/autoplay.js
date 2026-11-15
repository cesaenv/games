// Panel de jugador automático, común a todos los juegos.
// Pinta el selector de modo, el de velocidad y el botón de iniciar/parar.
// El juego solo tiene que dar step(modo, { instant }): hace UNA jugada y devuelve
// true si se puede seguir o false si ha terminado. Puede ser async (por las animaciones).
// Cada velocidad es el tiempo en ms entre jugadas, o { ms, instant: true } si además el juego
// puede saltarse las animaciones. Con 0 se hacen todas las jugadas que quepan sin pausa.

const SPEEDS = { Slow: 400, Fast: 120, Full: 40 };
const LABELS = {
  title: 'Jugador automático',
  mode: 'Modo',
  speed: 'Velocidad',
  start: 'Iniciar',
  stop: 'Parar',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createAutoPanel(container, options) {
  const {
    step,
    modes = [],
    speeds = SPEEDS,
    onStart = () => {},
    onStop = () => {},
    onModeChange = () => {},
  } = options;
  const labels = { ...LABELS, ...options.labels };
  const speedNames = Object.keys(speeds);

  let mode = options.defaultMode ?? modes[0];
  let speed = options.defaultSpeed ?? speedNames[1] ?? speedNames[0];
  let running = false;
  let run = 0; // número de la ejecución actual, para descartar una que ya se paró

  container.classList.add('auto-panel');
  container.innerHTML = '';

  const title = document.createElement('h2');
  title.className = 'auto-title';
  title.textContent = labels.title;
  container.append(title);

  // Una fila de botones donde solo hay uno activo
  function choice(name, values, current, onSelect) {
    const group = document.createElement('div');
    group.className = 'auto-group';
    const label = document.createElement('span');
    label.className = 'auto-label';
    label.textContent = name;
    const row = document.createElement('div');
    row.className = 'auto-choice';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', name);
    values.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = value;
      button.setAttribute('aria-pressed', String(value === current));
      button.addEventListener('click', () => {
        row.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        onSelect(value);
      });
      row.append(button);
    });
    group.append(label, row);
    container.append(group);
  }

  if (modes.length > 1) {
    choice(labels.mode, modes, mode, (value) => {
      mode = value;
      onModeChange(value);
    });
  }
  choice(labels.speed, speedNames, speed, (value) => {
    speed = value;
  });

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'auto-button';
  button.textContent = labels.start;
  button.addEventListener('click', () => (running ? stop() : start()));
  container.append(button);

  async function loop(id) {
    try {
      while (running && id === run) {
        const config = speeds[speed];
        const ms = typeof config === 'number' ? config : config.ms;
        const instant = typeof config === 'number' ? config === 0 : !!config.instant;
        // Sin pausa se hacen varias jugadas seguidas antes de dejar respirar al navegador
        const started = performance.now();
        let more = true;
        do {
          more = await step(mode, { instant });
          if (!running || id !== run) return;
        } while (more && ms === 0 && performance.now() - started < 12);

        if (!more) {
          stop();
          return;
        }
        await sleep(ms);
      }
    } catch (error) {
      console.error(error);
      if (id === run) stop();
    }
  }

  function start() {
    if (running) return;
    running = true;
    run += 1;
    button.textContent = labels.stop;
    onStart(mode);
    loop(run);
  }

  function stop() {
    if (!running) return;
    running = false;
    run += 1;
    button.textContent = labels.start;
    onStop();
  }

  return {
    start,
    stop,
    isRunning: () => running,
    getMode: () => mode,
  };
}
