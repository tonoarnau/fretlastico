// Tests de js/teoria-taller.js en las 12 tonalidades: que cada forma suene a lo que dice ser.
(function(){
  const T = window.FretTeoria, res = [], avisos = [];
  const prueba = (nombre, f) => { try { f(); res.push([nombre, null]); } catch (e) { res.push([nombre, e.message]); } };
  const assert = (c, msg) => { if (!c) throw new Error(msg); };
  const openPcs = T.TUNINGS.guitarra.map(T.pitchClassIndex);
  const suenan = shape => shape.strings.map((s, k) => (s.mute ? null : (openPcs[k] + s.fret) % 12));
  const nom = pc => T.DISPLAY[pc];

  prueba('Afinaciones: nombres y MIDI coinciden (guitarra y bajo)', () => {
    for (const inst of ['guitarra', 'bajo'])
      T.TUNINGS[inst].forEach((n, i) => assert(T.pitchClassIndex(n) === T.OPEN_MIDI[inst][i] % 12, `${inst} cuerda ${i}`));
  });
  prueba('Escalas: intervalos ordenados, sin repetir, empiezan en 0 y caben en una octava', () => {
    for (const [k, s] of Object.entries(T.SCALES)) {
      const iv = s.intervals;
      assert(iv[0] === 0 && iv.every((x, i) => i === 0 || x > iv[i - 1]) && iv[iv.length - 1] < 12, k);
    }
  });
  prueba('Grados de la escala mayor: I ii iii IV V vi vii° en las 12 tonalidades', () => {
    for (let r = 0; r < 12; r++) {
      const q = T.triadDiatonicDegrees(r, 'major').map(d => d.quality);
      assert(JSON.stringify(q) === JSON.stringify(['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim']), `${nom(r)}: ${q}`);
    }
  });
  prueba('Grados de la escala menor natural: i ii° III iv v VI VII', () => {
    for (let r = 0; r < 12; r++) {
      const q = T.triadDiatonicDegrees(r, 'minor').map(d => d.quality);
      assert(JSON.stringify(q) === JSON.stringify(['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major']), `${nom(r)}: ${q}`);
    }
  });
  for (const [k, q] of Object.entries(T.CHORD_QUALITIES)) {
    prueba(`Acorde ${q.label}: en las 12 tónicas solo suenan notas del acorde, con la fundamental`, () => {
      for (let r = 0; r < 12; r++) {
        const tonos = q.tones.map(t => (r + t) % 12), pcs = suenan(T.buildChordShape(r, k)).filter(p => p !== null);
        const ajenas = pcs.filter(p => !tonos.includes(p));
        assert(!ajenas.length, `${nom(r)}${q.suffix}: suena ${ajenas.map(nom)} que no es del acorde`);
        assert(pcs.includes(r), `${nom(r)}${q.suffix}: falta la fundamental`);
        const faltan = tonos.filter(t => !pcs.includes(t));
        if (faltan.length && r === 0) avisos.push(`${q.label}: la forma omite ${faltan.map(t => (t - r + 12) % 12 + ' semitonos').join(', ')} (normal en algunos voicings)`);
      }
    });
  }
  for (const k of T.CAGED_ELIGIBLE) {
    prueba(`CAGED ${T.CHORD_QUALITIES[k].label}: cada posición, en las 12 tónicas, suena al acorde y cabe en la mano`, () => {
      for (let r = 0; r < 12; r++) for (const pos of T.computeCagedPositions(r, k)) {
        const tonos = T.CHORD_QUALITIES[k].tones.map(t => (r + t) % 12), pcs = suenan(pos).filter(p => p !== null);
        assert(pcs.every(p => tonos.includes(p)) && pcs.includes(r), `${nom(r)} forma ${pos.name || '?'}: ${pcs.map(nom)}`);
        const pisadas = pos.strings.filter(s => !s.mute).map(s => s.fret);
        assert(Math.min(...pisadas) >= 0 && Math.max(...pisadas) - Math.min(...pisadas) <= 4, `${nom(r)} forma ${pos.name || '?'}: trastes ${pisadas}`);
      }
    });
  }
  prueba('Tríadas: 4 calidades × 12 tónicas × 3 inversiones × juegos de cuerdas, con la nota correcta en el bajo', () => {
    let n = 0;
    for (const set of [...T.TRIAD_STRING_SETS_VERTICAL, ...T.TRIAD_STRING_SETS_HORIZONTAL])
      for (const q of Object.keys(T.TRIAD_QUALITIES)) for (let r = 0; r < 12; r++) for (let inv = 0; inv < 3; inv++) {
        const sh = T.triadComputeShape(r, q, inv, set.idxs);
        if (!sh) continue;
        const obj = T.triadInversionOrder(T.triadTones(r, q), inv);
        const pcs = sh.rows.map(x => x.pc).reverse();   // rows viene de aguda a grave (para pintarla)
        assert(JSON.stringify(pcs) === JSON.stringify(obj), `${nom(r)} ${q} inv ${inv} cuerdas ${set.idxs}: ${pcs.map(nom)}`);
        n++;
      }
    assert(n > 500, `solo ${n} combinaciones con forma`);
  });
  prueba('Power chords: fundamental, quinta y octava en las cuerdas 6.ª a 4.ª, 12 tónicas', () => {
    for (let r = 0; r < 12; r++) for (let c = 0; c <= 3; c++) {
      const p = T.computePowerChordShape(r, c, true);
      const pcs = p.strings.map((s, i) => (T.OPEN_MIDI.guitarra[s] + p.frets[i]) % 12);
      assert(pcs[0] === r && pcs[1] === (r + 7) % 12 && (pcs.length < 3 || pcs[2] === r), `${nom(r)}5 desde la cuerda ${6 - c}: ${pcs.map(nom)}`);
    }
  });

  prueba('Grados: en cada escala de 7 notas salen los números 1 a 7, una vez cada uno', () => {
    for (const [k, e] of Object.entries(T.SCALES)) {
      if (e.intervals.length !== 7) continue;
      const nums = e.intervals.map(iv => T.gradoEnEscala(iv, e.intervals).replace(/[♭♯]/g, '')).sort().join('');
      assert(nums === '1234567', `${e.name}: ${e.intervals.map(iv => T.gradoEnEscala(iv, e.intervals)).join(' ')}`);
    }
  });
  prueba('Grados conocidos: lidio ♯4, locrio ♭5, blues ♭5, jónico ♯5 ♯5, superlocrio ♭4 y ♭♭7', () => {
    const g = (k, iv) => T.gradoEnEscala(iv, T.SCALES[k].intervals);
    assert(g('lidio', 6) === '♯4' && g('locrio', 6) === '♭5' && g('blues', 6) === '♭5', 'cuarta/quinta');
    assert(g('armonica_jonico5', 8) === '♯5' && g('armonica_superloc', 4) === '♭4' && g('armonica_superloc', 9) === '♭♭7', 'aumentada/alterada');
  });
  prueba('Cada escala tiene una sola tónica, como mucho una 3.ª y como mucho una 5.ª', () => {
    for (const [k, e] of Object.entries(T.SCALES)) {
      const f = e.intervals.map(iv => T.funcionEnEscala(iv, e.intervals));
      assert(f.filter(x => x === 'tonica').length === 1 && f.filter(x => x === 'tercera').length <= 1 && f.filter(x => x === 'quinta').length <= 1, `${e.name}: ${f}`);
    }
  });
  prueba('Nombres según la tonalidad: G♯ en Mi mayor, B♭ en Fa mayor y en Re menor, sin alteraciones en La menor', () => {
    const M = T.SCALES.jonico.intervals, m = T.SCALES.eolico.intervals;
    assert(T.nombreEnTonalidad(8, 4, T.SCALES.pent_mayor.intervals) === 'G♯', 'Mi');
    assert(T.nombreEnTonalidad(10, 5, M) === 'B♭' && T.nombreEnTonalidad(10, 2, m) === 'B♭', 'Fa / Re menor');
    assert([0, 2, 4, 5, 7, 9, 11].every(pc => !/[♯♭]/.test(T.nombreEnTonalidad(pc, 9, m))), 'La menor');
  });

  const ul = document.getElementById('r');
  for (const [n, e] of res) { const li = document.createElement('li'); li.className = e ? 'ko' : 'ok'; li.textContent = (e ? '✗ ' : '✓ ') + n + (e ? ` — ${e}` : ''); ul.append(li); }
  for (const a of avisos) { const li = document.createElement('li'); li.className = 'av'; li.textContent = 'ℹ ' + a; ul.append(li); }
  const fallos = res.filter(r => r[1]).length;
  document.getElementById('total').textContent = `${res.length - fallos} de ${res.length} correctos`;
  window.__resultado = { total: res.length, fallos, detalle: res.filter(r => r[1]), avisos };
})();
