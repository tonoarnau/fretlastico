// Escucha por micrófono: qué nota suena (afinador, primeras notas) y si suena un acorde concreto.
// Todo se procesa en el navegador; el audio no sale del dispositivo.
import { audio } from './sonido.js';
import { midiDeFrecuencia, pc } from './teoria.js';

let flujo = null, analizador = null, fuente = null;
const buf = new Float32Array(4096);

export const microDisponible = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
export const abierto = () => !!analizador;

// Nivel de la señal (RMS, 0-1): para saber si está sonando algo.
export function nivel() {
  if (!analizador) return 0;
  analizador.getFloatTimeDomainData(buf);
  let s = 0;
  for (const x of buf) s += x * x;
  return Math.sqrt(s / buf.length);
}

export async function abrir() {
  if (analizador) return true;
  const ctx = audio();
  flujo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  fuente = ctx.createMediaStreamSource(flujo);
  analizador = ctx.createAnalyser();
  analizador.fftSize = 8192;
  analizador.smoothingTimeConstant = 0.6;
  fuente.connect(analizador);
  return true;
}

export function cerrar() {
  if (flujo) flujo.getTracks().forEach(t => t.stop());
  if (fuente) fuente.disconnect();
  flujo = analizador = fuente = null;
}

// Frecuencia fundamental por autocorrelación normalizada (rango 30–1200 Hz). null si no hay una nota clara.
export function tono() {
  if (!analizador) return null;
  const sr = analizador.context.sampleRate;
  analizador.getFloatTimeDomainData(buf);
  let rms = 0;
  for (const x of buf) rms += x * x;
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.01) return null;                      // silencio
  const minLag = Math.floor(sr / 1200), maxLag = Math.floor(sr / 30), N = buf.length - maxLag;
  let mejor = -1, mejorLag = -1;
  const r = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < N; i++) { const a = buf[i], b = buf[i + lag]; s += a * b; e1 += a * a; e2 += b * b; }
    r[lag] = s / Math.sqrt(e1 * e2 + 1e-12);
  }
  // el primer pico alto (evita confundir la nota con su octava grave)
  const umbral = Math.max(...r.subarray(minLag, maxLag + 1)) * 0.9;
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (r[lag] >= umbral && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) { mejor = r[lag]; mejorLag = lag; break; }
  }
  if (mejorLag < 0 || mejor < 0.75) return null;
  const a = r[mejorLag - 1], b = r[mejorLag], c = r[mejorLag + 1];
  const ajuste = (a - c) / (2 * (a - 2 * b + c) || 1);    // interpolación parabólica
  const f = sr / (mejorLag + ajuste);
  const m = midiDeFrecuencia(f);
  return { frecuencia: f, midi: Math.round(m), cents: Math.round((m - Math.round(m)) * 100), claridad: mejor };
}

// Energía de cada clase de nota (0-11) entre 70 y 1400 Hz, normalizada a suma 1.
export function croma() {
  if (!analizador) return null;
  const n = analizador.frequencyBinCount, sr = analizador.context.sampleRate;
  const db = new Float32Array(n);
  analizador.getFloatFrequencyData(db);
  const c = new Array(12).fill(0);
  let total = 0;
  for (let k = 1; k < n; k++) {
    const f = k * sr / analizador.fftSize;
    if (f < 70) continue;
    if (f > 1400) break;
    const mag = Math.pow(10, db[k] / 20);
    const e = mag * mag;
    c[pc(Math.round(midiDeFrecuencia(f)))] += e; total += e;
  }
  if (total < 1e-7) return null;                    // silencio
  return c.map(x => x / total);
}

// Parecido (0-1) entre lo que suena y un acorde: la energía en sus notas frente a la de las demás.
export function parecidoAcorde(c, notas) {
  if (!c) return 0;
  const dentro = notas.reduce((s, p) => s + c[p], 0);
  const minima = Math.min(...notas.map(p => c[p]));          // que suenen todas, no solo una
  return Math.min(1, dentro) * Math.min(1, minima * notas.length * 2.2);
}
