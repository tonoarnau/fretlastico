// Sonido: muestras reales (tonejs-instruments, CC BY 3.0; ver sonidos/CREDITOS.md) con un reproductor propio,
// rasgueos y metrónomo. Cada instrumento se descarga la primera vez que suena; si falla, suena una síntesis sencilla.

const MUESTRAS = {
  'guitar-acoustic': ['E2', 'G2', 'As2', 'Cs3', 'E3', 'G3', 'As3', 'Cs4', 'E4', 'G4', 'As4', 'Cs5'],
  'guitar-electric': ['Cs2', 'E2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6'],
  'bass-electric': ['E1', 'G1', 'As1', 'Cs2', 'E2', 'G2', 'As2', 'Cs3', 'E3', 'G3', 'As3', 'Cs4'],
  'piano': ['C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6'],
};
export const INSTRUMENTO_DE = { guitarra: 'guitar-acoustic', bajo: 'bass-electric', piano: 'piano' };

const BASE = new URL('../sonidos/', import.meta.url);
const LETRA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiDeNombre = n => LETRA[n[0]] + (n[1] === 's' ? 1 : 0) + 12 * (Number(n.slice(n[1] === 's' ? 2 : 1)) + 1);

let ctx = null, maestro = null;
const cargados = {};   // instrumento → Promise<Map<midi, AudioBuffer>>

// El navegador solo deja arrancar el audio tras un gesto del usuario: llamar desde un clic.
export function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    maestro = ctx.createDynamicsCompressor();
    maestro.threshold.value = -12; maestro.ratio.value = 3;
    maestro.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function cargar(inst) {
  if (!cargados[inst]) {
    audio();
    cargados[inst] = Promise.all(MUESTRAS[inst].map(async n => {
      const r = await fetch(new URL(`${inst}/${n}.mp3`, BASE));
      if (!r.ok) throw new Error(`${inst}/${n}: ${r.status}`);
      return [midiDeNombre(n), await ctx.decodeAudioData(await r.arrayBuffer())];
    })).then(pares => new Map(pares)).catch(e => { console.warn('Muestras no disponibles, uso síntesis:', e); return null; });
  }
  return cargados[inst];
}

function sintesis(midi, t, dur, vel) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(maestro); o.start(t); o.stop(t + dur + 0.05);
}

// Toca una nota MIDI. Devuelve la hora (ctx) a la que suena.
export async function nota(inst, midi, { cuando = 0, dur = 1.6, vel = 0.9 } = {}) {
  const banco = await cargar(inst);
  const t = Math.max(ctx.currentTime, cuando || ctx.currentTime);
  if (!banco) { sintesis(midi, t, dur, vel); return t; }
  let mejor = null;
  for (const m of banco.keys()) if (mejor === null || Math.abs(m - midi) < Math.abs(mejor - midi)) mejor = m;
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = banco.get(mejor);
  s.playbackRate.value = Math.pow(2, (midi - mejor) / 12);
  g.gain.setValueAtTime(vel, t);
  g.gain.setTargetAtTime(0, t + dur, 0.12);   // apagado suave, como al levantar el dedo
  s.connect(g).connect(maestro);
  s.start(t); s.stop(t + dur + 1);
  return t;
}

// Rasgueo: las notas de un acorde con un pequeño desfase (hacia abajo: de grave a aguda).
export async function rasgueo(inst, midis, { cuando = 0, haciaAbajo = true, separacion = 0.028, dur = 2.2 } = {}) {
  await cargar(inst);
  const t0 = Math.max(ctx.currentTime + 0.02, cuando || 0);
  const orden = haciaAbajo ? midis : [...midis].reverse();
  orden.forEach((m, i) => nota(inst, m, { cuando: t0 + i * separacion, dur, vel: 0.75 + 0.2 * (i / orden.length) }));
  return t0;
}

// Metrónomo con planificación anticipada (no depende de la precisión de setTimeout).
// alPulso(n, hora) se llama justo a tiempo para animar la interfaz; n empieza en 0.
export function metronomo({ bpm = 60, compas = 4, alPulso = () => {}, sonar = true } = {}) {
  audio();
  let siguiente = ctx.currentTime + 0.15, n = 0, activo = true, temporizador = null;
  const programados = [];
  const tic = (t, fuerte) => {
    if (!sonar) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = fuerte ? 1500 : 1000;
    g.gain.setValueAtTime(fuerte ? 0.5 : 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(maestro); o.start(t); o.stop(t + 0.06);
  };
  const planificar = () => {
    while (activo && siguiente < ctx.currentTime + 0.12) {
      tic(siguiente, n % compas === 0);
      programados.push([n, siguiente]);
      siguiente += 60 / bpm; n++;
    }
    while (programados.length && programados[0][1] <= ctx.currentTime + 0.01) {
      const [k, t] = programados.shift(); alPulso(k, t);
    }
    if (activo) temporizador = setTimeout(planificar, 20);
  };
  planificar();
  return {
    parar() { activo = false; clearTimeout(temporizador); },
    set bpm(v) { bpm = v; },
    get bpm() { return bpm; },
  };
}
