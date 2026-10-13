// Tests de js/teoria.js: ábrelo en el navegador (tests/index.html) o con el comprobador sin interfaz.
import * as T from '../js/teoria.js';

const resultados = [];
const prueba = (nombre, f) => { try { f(); resultados.push([nombre, null]); } catch (e) { resultados.push([nombre, e.message]); } };
const igual = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} esperaba ${JSON.stringify(b)} y salió ${JSON.stringify(a)}`); };

prueba('La4 = 440 Hz y Do4 = MIDI 60', () => {
  igual(Math.round(T.frecuencia(69)), 440); igual(Math.round(T.frecuencia(60) * 100) / 100, 261.63);
  igual(Math.round(T.midiDeFrecuencia(82.41)), 40, 'Mi2');
});
prueba('Afinación estándar de guitarra: Mi La Re Sol Si Mi', () =>
  igual(T.AFINACION.guitarra.map(m => T.nombreLetra(T.pc(m))), ['E', 'A', 'D', 'G', 'B', 'E']));
prueba('Afinación estándar de bajo: Mi La Re Sol, una octava por debajo', () => {
  igual(T.AFINACION.bajo.map(m => T.nombreLetra(T.pc(m))), ['E', 'A', 'D', 'G']);
  igual(T.AFINACION.bajo.map((m, i) => T.AFINACION.guitarra[i] - m), [12, 12, 12, 12]);
});
prueba('La 1.ª cuerda es la más aguda', () => { igual(T.numeroCuerda('guitarra', 5), 1); igual(T.numeroCuerda('guitarra', 0), 6); });
prueba('Escalas mayores con una letra por grado', () => {
  igual(T.escalaMayor(4), ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'], 'Mi mayor');
  igual(T.escalaMayor(5), ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'], 'Fa mayor');
  igual(T.escalaMayor(0), ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 'Do mayor');
  igual(T.escalaMayor(10), ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'], 'Si bemol mayor');
  igual(T.escalaMayor(11), ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'], 'Si mayor');
});
prueba('Nombres: latino, letras y los dos; la lámina del Taller', () => {
  igual(T.nombreNota(4, { nombres: 'latino' }), 'Mi');
  igual(T.nombreNota(8, { nombres: 'letras', tonica: 4 }), 'G♯');
  igual(T.nombreNota(10, { nombres: 'ambos', tonica: 5 }), 'Si♭ (B♭)');
  igual(T.nombreLetra(8, { estilo: 'lamina' }), 'Ab');
});
for (const [cifrado, a] of Object.entries(T.ACORDES_GUITARRA)) {
  prueba(`La forma de ${a.nombre} suena a ${cifrado}`, () => {
    const pcs = [...new Set(T.notasDeForma(a.trastes).map(T.pc))].sort((x, y) => x - y);
    igual(pcs, [...a.notas].sort((x, y) => x - y), cifrado);
    const grave = T.notasDeForma(a.trastes)[0];
    igual(T.pc(grave), a.notas[0], `${cifrado}: la nota más grave debe ser la fundamental`);
  });
  prueba(`${cifrado}: hay un dedo en cada traste pisado y ninguno en las cuerdas al aire`, () =>
    a.trastes.forEach((t, i) => { if ((t > 0) !== (a.dedos[i] > 0)) throw new Error(`cuerda ${6 - i}: traste ${t}, dedo ${a.dedos[i]}`); }));
}

const ul = document.getElementById('r');
for (const [n, e] of resultados) {
  const li = document.createElement('li'); li.className = e ? 'ko' : 'ok';
  li.textContent = (e ? '✗ ' : '✓ ') + n + (e ? ` — ${e}` : ''); ul.append(li);
}
const fallos = resultados.filter(r => r[1]).length;
document.getElementById('total').textContent = `${resultados.length - fallos} de ${resultados.length} correctos`;
window.__resultado = { total: resultados.length, fallos, detalle: resultados.filter(r => r[1]) };
