// Teoría musical de Fretlastico Aprende: notas, nombres según la tonalidad, afinaciones y acordes.
// Sin dependencias ni acceso al DOM, para poder probarlo aparte (tests/index.html).

export const SOSTENIDOS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const BEMOLES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// La ortografía de la lámina del Taller (index.html): siempre igual, sin depender de la tonalidad.
export const LAMINA = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const LATINO = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

export const pc = midi => ((midi % 12) + 12) % 12;
export const octava = midi => Math.floor(midi / 12) - 1;
export const frecuencia = midi => 440 * Math.pow(2, (midi - 69) / 12);
export const midiDeFrecuencia = f => 69 + 12 * Math.log2(f / 440);

// Tonalidades mayores que se escriben con bemoles (por su armadura); el resto, con sostenidos.
const TONOS_BEMOL = new Set([5, 10, 3, 8, 1, 6]); // F, Bb, Eb, Ab, Db, Gb

// Nombre de una clase de nota (0-11).
//   tonica: tónica de la tonalidad mayor de referencia (null = sostenidos)
//   estilo: 'tonalidad' | 'lamina'
export function nombreLetra(p, { tonica = null, estilo = 'tonalidad' } = {}) {
  if (estilo === 'lamina') return LAMINA[pc(p)];
  return (tonica !== null && TONOS_BEMOL.has(pc(tonica)) ? BEMOLES : SOSTENIDOS)[pc(p)];
}

// «Mi» / «E» / «Mi (E)» según la preferencia del usuario ('latino' | 'letras' | 'ambos').
export function nombreNota(p, { nombres = 'ambos', ...op } = {}) {
  const letra = nombreLetra(p, op);
  const latino = LATINO[letra[0]] + letra.slice(1).replace('#', '♯').replace('b', '♭');
  const letraBonita = letra[0] + letra.slice(1).replace('#', '♯').replace('b', '♭');
  if (nombres === 'latino') return latino;
  if (nombres === 'letras') return letraBonita;
  return `${latino} (${letraBonita})`;
}

// Escala mayor de una tónica, escrita con una letra por grado (E mayor → E F# G# A B C# D#).
export function escalaMayor(tonica) {
  const pasos = [0, 2, 4, 5, 7, 9, 11];
  const letras = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const letraTonica = nombreLetra(tonica, { tonica })[0];
  const i0 = letras.indexOf(letraTonica);
  return pasos.map((s, g) => {
    const objetivo = pc(tonica + s);
    const letra = letras[(i0 + g) % 7];
    let d = objetivo - natural[letra];
    if (d > 6) d -= 12;
    if (d < -6) d += 12;
    return letra + (d > 0 ? '#'.repeat(d) : 'b'.repeat(-d));
  });
}

// Afinaciones estándar, de la cuerda más grave a la más aguda (MIDI).
export const AFINACION = {
  guitarra: [40, 45, 50, 55, 59, 64], // Mi2 La2 Re3 Sol3 Si3 Mi4
  bajo: [28, 33, 38, 43],             // Mi1 La1 Re2 Sol2
};

// Número de cuerda como lo dice un profesor: la 1.ª es la más aguda.
export const numeroCuerda = (instrumento, indiceGraveAAguda) => AFINACION[instrumento].length - indiceGraveAAguda;

// Acordes abiertos de guitarra. trastes: de la 6.ª a la 1.ª (null = no se toca); dedos: 1 índice … 4 meñique.
export const ACORDES_GUITARRA = {
  Em: { nombre: 'Mi menor', cifrado: 'Em', trastes: [0, 2, 2, 0, 0, 0], dedos: [0, 2, 3, 0, 0, 0], notas: [4, 7, 11] },
  Am: { nombre: 'La menor', cifrado: 'Am', trastes: [null, 0, 2, 2, 1, 0], dedos: [0, 0, 2, 3, 1, 0], notas: [9, 0, 4] },
  E:  { nombre: 'Mi mayor', cifrado: 'E',  trastes: [0, 2, 2, 1, 0, 0], dedos: [0, 2, 3, 1, 0, 0], notas: [4, 8, 11] },
  C:  { nombre: 'Do mayor', cifrado: 'C',  trastes: [null, 3, 2, 0, 1, 0], dedos: [0, 3, 2, 0, 1, 0], notas: [0, 4, 7] },
  G:  { nombre: 'Sol mayor', cifrado: 'G', trastes: [3, 2, 0, 0, 0, 3], dedos: [2, 1, 0, 0, 0, 3], notas: [7, 11, 2] },
  D:  { nombre: 'Re mayor', cifrado: 'D',  trastes: [null, null, 0, 2, 3, 2], dedos: [0, 0, 0, 1, 3, 2], notas: [2, 6, 9] },
};

// Notas MIDI que suenan con una forma de acorde (de grave a aguda).
export function notasDeForma(trastes, instrumento = 'guitarra') {
  return trastes.map((t, i) => (t === null ? null : AFINACION[instrumento][i] + t)).filter(n => n !== null);
}

export const notaEnTraste = (instrumento, cuerda, traste) => AFINACION[instrumento][cuerda] + traste;
