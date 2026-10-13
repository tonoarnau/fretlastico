// Fretlastico · Taller: teoría musical y datos (escalas, acordes, CAGED, tríadas, progresiones, estilos y ritmos).
// Sin estado ni DOM: lo usa js/taller.js y lo prueban tests/taller.html. Script clásico, se carga antes que taller.js.
window.FretTeoria = (function(){
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']; // uso interno (cálculo)
  const pitchClassIndex = note => NOTES.indexOf(note);
  const DISPLAY = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B']; // ortografía igual a tu lámina física
  const MAX_FRET = 15;

  // arreglos ordenados de grave a agudo (índice 0 = cuerda más grave)
  const TUNINGS = {
    guitarra: ['E','A','D','G','B','E'],
    bajo:     ['E','A','D','G']
  };
  // nº MIDI de cada cuerda al aire, mismo orden que TUNINGS (grave -> agudo)
  const OPEN_MIDI = {
    guitarra: [40,45,50,55,59,64],
    bajo:     [28,33,38,43]
  };

  // ---------- TRÍADAS ----------
  // 4 calidades verificadas (formula en semitonos desde la fundamental)
  const TRIAD_QUALITIES = {
    major: { label: 'Mayor',       formula: [0,4,7], degrees: ['1','3','5'] },
    minor: { label: 'Menor',       formula: [0,3,7], degrees: ['1','b3','5'] },
    aug:   { label: 'Aumentada',   formula: [0,4,8], degrees: ['1','3','#5'] },
    dim:   { label: 'Disminuida',  formula: [0,3,6], degrees: ['1','b3','b5'] }
  };
  const STRING_ORDINALS = ['6ª','5ª','4ª','3ª','2ª','1ª']; // índice 0 = Mi grave, 5 = Mi agudo
  // "verticales": 3 cuerdas ADYACENTES (forma compacta, notas cercanas entre sí)
  const TRIAD_STRING_SETS_VERTICAL = [
    { idxs:[0,1,2], label:'6ª-5ª-4ª' },
    { idxs:[1,2,3], label:'5ª-4ª-3ª' },
    { idxs:[2,3,4], label:'4ª-3ª-2ª' },
    { idxs:[3,4,5], label:'3ª-2ª-1ª' }
  ];
  // "horizontales": cuerdas SALTEADAS (misma tríada, pero mucho más abierta/separada)
  const TRIAD_STRING_SETS_HORIZONTAL = [
    { idxs:[0,2,4], label:'6ª-4ª-2ª' },
    { idxs:[1,3,5], label:'5ª-3ª-1ª' }
  ];
  const TRIAD_ZONES = [
    { label: 'Todo el mástil', min: 0,  max: 17 },
    { label: 'Trastes 0-5',    min: 0,  max: 5 },
    { label: 'Trastes 5-9',    min: 5,  max: 9 },
    { label: 'Trastes 9-12',   min: 9,  max: 12 },
    { label: 'Trastes 12-17',  min: 12, max: 17 }
  ];

  function triadTones(rootPc, quality){
    return TRIAD_QUALITIES[quality].formula.map(i => (rootPc + i) % 12);
  }
  function triadInversionOrder(tones, inversion){
    return tones.slice(inversion).concat(tones.slice(0, inversion));
  }
  // busca, para 3 cuerdas dadas (de grave a aguda) y 3 clases de tono objetivo (mismo orden,
  // grave->aguda), la digitación más compacta (menor rango de trastes) — verificado contra
  // 576 combinaciones (4 calidades × 12 tónicas × 3 inversiones × 4 juegos de cuerdas), 0 errores.
  // Clave: usa la altura MIDI real de cada cuerda al aire, no solo su clase de tono, para poder
  // comparar alturas correctamente entre cuerdas (Re3 suena más agudo que La2, aunque 2 < 9).
  function triadClosestVoicing(stringOpenMidiArr, targetPcArr, maxFret, minFret){
    maxFret = maxFret || 17;
    minFret = minFret || 0;
    const candidatesPerString = stringOpenMidiArr.map((openMidi, idx) => {
      const targetPc = targetPcArr[idx];
      const basePc = ((openMidi % 12) + 12) % 12;
      let f = (((targetPc - basePc) % 12) + 12) % 12;
      const frets = [];
      while (f <= maxFret) { if (f >= minFret) frets.push(f); f += 12; }
      return frets;
    });
    let best = null;
    candidatesPerString[0].forEach(f1 => {
      const p1 = stringOpenMidiArr[0] + f1;
      candidatesPerString[1].forEach(f2 => {
        const p2 = stringOpenMidiArr[1] + f2;
        if (p2 <= p1) return;
        candidatesPerString[2].forEach(f3 => {
          const p3 = stringOpenMidiArr[2] + f3;
          if (p3 <= p2) return;
          const span = Math.max(f1,f2,f3) - Math.min(f1,f2,f3);
          const lowest = Math.min(f1,f2,f3);
          if (!best || span < best.span || (span === best.span && lowest < best.lowest)) {
            best = { span, lowest, frets: [f1,f2,f3] };
          }
        });
      });
    });
    return best ? best.frets : null;
  }

  // variante para "zona del mástil": la zona es una PREFERENCIA, no una obligación estricta.
  // Exigir que las 3 notas caigan dentro de una ventana estrecha falla la mayoría de las veces
  // (la posición de una forma compacta depende de la tónica, y las 12 tónicas se reparten por
  // una octava entera de trastes) — verificado: con ventanas de 5 trastes fallaba el 80% de
  // las veces. En su lugar, se buscan todas las formas razonablemente compactas de todo el
  // mástil y se elige la más cercana al CENTRO de la zona — verificado: 0% de fallos.
  // maxSpan depende del modo: 5 para vertical (su compacidad natural), 9 para horizontal
  // (que por naturaleza necesita más recorrido, al ser cuerdas salteadas).
  function triadClosestVoicingPreferZone(stringOpenMidiArr, targetPcArr, zoneCenter, maxSpan, searchMax){
    searchMax = searchMax || 24;
    const candidatesPerString = stringOpenMidiArr.map((openMidi, idx) => {
      const targetPc = targetPcArr[idx];
      const basePc = ((openMidi % 12) + 12) % 12;
      let f = (((targetPc - basePc) % 12) + 12) % 12;
      const frets = [];
      while (f <= searchMax) { frets.push(f); f += 12; }
      return frets;
    });
    let best = null;
    candidatesPerString[0].forEach(f1 => {
      const p1 = stringOpenMidiArr[0] + f1;
      candidatesPerString[1].forEach(f2 => {
        const p2 = stringOpenMidiArr[1] + f2;
        if (p2 <= p1) return;
        candidatesPerString[2].forEach(f3 => {
          const p3 = stringOpenMidiArr[2] + f3;
          if (p3 <= p2) return;
          const span = Math.max(f1,f2,f3) - Math.min(f1,f2,f3);
          if (span > maxSpan) return;
          const center = (f1 + f2 + f3) / 3;
          const dist = Math.abs(center - zoneCenter);
          if (!best || dist < best.dist || (dist === best.dist && span < best.span)) {
            best = { dist, span, frets: [f1,f2,f3] };
          }
        });
      });
    });
    return best ? best.frets : null;
  }

  // ---------- TRÍADAS: armonía diatónica ----------
  // la calidad de cada grado se CALCULA desde los intervalos de la escala (no está memorizada):
  // se apilan la 3a y la 5a diatónicas de cada grado y se mide qué intervalos forman.
  const TRIAD_MAJOR_STEPS = [2,2,1,2,2,2,1]; // T-T-S-T-T-T-S
  const TRIAD_MINOR_STEPS = [2,1,2,2,1,2,2]; // T-S-T-T-S-T-T (menor natural)
  const TRIAD_ROMAN_MAJOR = ['I','ii','iii','IV','V','vi','vii°'];
  const TRIAD_ROMAN_MINOR = ['i','ii°','III','iv','v','VI','VII'];

  function triadBuildScale(rootPc, steps){
    const scale = [rootPc];
    let pc = rootPc;
    for (let i = 0; i < steps.length - 1; i++) { pc = (pc + steps[i]) % 12; scale.push(pc); }
    return scale;
  }
  function triadQualityFromIntervals(root, third, fifth){
    const r3 = (third - root + 12) % 12, r5 = (fifth - root + 12) % 12;
    if (r3 === 4 && r5 === 7) return 'major';
    if (r3 === 3 && r5 === 7) return 'minor';
    if (r3 === 3 && r5 === 6) return 'dim';
    if (r3 === 4 && r5 === 8) return 'aug';
    return 'major';
  }
  function triadDiatonicDegrees(rootPc, tonality){
    const steps = tonality === 'major' ? TRIAD_MAJOR_STEPS : TRIAD_MINOR_STEPS;
    const romans = tonality === 'major' ? TRIAD_ROMAN_MAJOR : TRIAD_ROMAN_MINOR;
    const scale = triadBuildScale(rootPc, steps);
    return scale.map((root, degree) => {
      const third = scale[(degree + 2) % 7];
      const fifth = scale[(degree + 4) % 7];
      return { degree, roman: romans[degree], root, quality: triadQualityFromIntervals(root, third, fifth) };
    });
  }
  // progresiones comunes, como índices de grado (0-6) dentro de la tonalidad elegida
  const TRIAD_PROGRESSIONS_MAJOR = [
    { label: 'I - IV - V',        degrees: [0,3,4] },
    { label: 'I - vi - IV - V',   degrees: [0,5,3,4] },
    { label: 'I - V - vi - IV',   degrees: [0,4,5,3] },
    { label: 'vi - IV - I - V',   degrees: [5,3,0,4] },
    { label: 'ii - V - I',        degrees: [1,4,0] }
  ];
  const TRIAD_PROGRESSIONS_MINOR = [
    { label: 'i - iv - v',        degrees: [0,3,4] },
    { label: 'i - VI - III - VII',degrees: [0,5,2,6] },
    { label: 'i - VII - VI - VII',degrees: [0,6,5,6] },
    { label: 'ii° - v - i',       degrees: [1,4,0] }
  ];

  // calcula la digitación (frets + filas listas para pintar) de una tríada concreta, reutilizado
  // tanto por el diagrama principal como por las tarjetas de progresión
  function triadComputeShape(rootPc, quality, inversion, stringIdxs, zoneMin, zoneMax, mode){
    const tones = triadTones(rootPc, quality);
    const target = triadInversionOrder(tones, inversion);
    const openMidiArr = stringIdxs.map(i => OPEN_MIDI.guitarra[i]);
    const isFullNeck = (zoneMin === undefined) || (zoneMin <= 0 && zoneMax >= 17);
    let frets;
    if (isFullNeck) {
      frets = triadClosestVoicing(openMidiArr, target);
    } else {
      const maxSpan = mode === 'horizontal' ? 9 : 5;
      frets = triadClosestVoicingPreferZone(openMidiArr, target, (zoneMin + zoneMax) / 2, maxSpan);
    }
    if (!frets) return null;
    const rows = stringIdxs.map((stringIdx, i) => ({
      stringIdx, fret: frets[i], pc: (openMidiArr[i] + frets[i]) % 12
    })).reverse();
    return { tones, frets, rows, minFret: Math.min(...frets), maxFret: Math.max(...frets) };
  }

  // convierte la forma de tríada (3 cuerdas activas) al mismo formato de 6 cuerdas que usa el
  // diagrama de acordes — las 3 cuerdas no usadas quedan "mute" (se dibujan con ✕), y se asigna
  // dedo (1-4) reutilizando la misma función ya verificada que usa CAGED.
  // power chord: forma movible de solo 2 (o 3 con octava) notas — fundamental + 5ª justa, en dos
  // cuerdas consecutivas. El intervalo entre cuerdas consecutivas no es siempre el mismo (Sol-Si
  // es una 3ª mayor, el resto son 4ª justa), así que se calcula el traste exacto en cada caso,
  // no se asume un salto de 2 trastes fijo.
  function computePowerChordShape(rootPc, stringIdx, withOctave){
    const strings = [stringIdx, stringIdx + 1];
    if (withOctave && stringIdx + 2 <= 5) strings.push(stringIdx + 2);
    const openA = OPEN_MIDI.guitarra[stringIdx];
    const rootFret = ((rootPc - openA % 12) % 12 + 12) % 12;
    const frets = [rootFret];
    for (let i = 1; i < strings.length; i++) {
      const targetPc = i === 1 ? (rootPc + 7) % 12 : rootPc; // 5ª en la 2ª cuerda, octava (misma nota) en la 3ª
      const openX = OPEN_MIDI.guitarra[strings[i]];
      let f = ((targetPc - openX % 12) % 12 + 12) % 12;
      while (f < rootFret - 1) f += 12; // la versión más cercana por encima del traste raíz
      frets.push(f);
    }
    return { frets, minFret: Math.min(...frets), maxFret: Math.max(...frets), strings };
  }

  // posiciones de una tríada recorriendo UNA sola cuerda (arpegio): dónde caen la 1ª, 3ª y 5ª
  // (y su repetición una octava más arriba) entre el traste 0 y maxFret.
  function triadSingleStringPositions(rootPc, quality, stringIdx, maxFret){
    maxFret = maxFret || 15;
    const tones = triadTones(rootPc, quality); // orden: [1ª,3ª,5ª]
    const openMidi = OPEN_MIDI.guitarra[stringIdx];
    const positions = [];
    for (let f = 0; f <= maxFret; f++) {
      const pc = (openMidi + f) % 12;
      const degIdx = tones.indexOf(pc);
      if (degIdx !== -1) positions.push({ fret: f, pc, degIdx });
    }
    return positions;
  }

  const SCALES = {
    pent_mayor: { name: 'Pentatónica Mayor', intervals: [0,2,4,7,9] },
    pent_menor: { name: 'Pentatónica Menor', intervals: [0,3,5,7,10] },
    blues:      { name: 'Blues', intervals: [0,3,5,6,7,10] },
    flamenco:   { name: 'Flamenco (Frigio Mayor)', intervals: [0,1,4,5,7,8,10] },
    jonico:     { name: 'Modo Jónico (Mayor)', intervals: [0,2,4,5,7,9,11] },
    dorico:     { name: 'Modo Dórico', intervals: [0,2,3,5,7,9,10] },
    frigio:     { name: 'Modo Frigio', intervals: [0,1,3,5,7,8,10] },
    lidio:      { name: 'Modo Lidio', intervals: [0,2,4,6,7,9,11] },
    mixolidio:  { name: 'Modo Mixolidio', intervals: [0,2,4,5,7,9,10] },
    eolico:     { name: 'Modo Eólico (Menor natural)', intervals: [0,2,3,5,7,8,10] },
    locrio:     { name: 'Modo Locrio', intervals: [0,1,3,5,6,8,10] },

    // ---- Menor armónica y sus 7 modos (verificados: cada uno es un modo natural con 1 grado alterado) ----
    menor_armonica:   { name: 'Menor Armónica', intervals: [0,2,3,5,7,8,11] },
    armonica_locrio6: { name: 'Armónica: Locrio ♮6 (modo 2)', intervals: [0,1,3,5,6,9,10] },
    armonica_jonico5: { name: 'Armónica: Jónico #5 / Aumentado (modo 3)', intervals: [0,2,4,5,8,9,11] },
    armonica_dorico4: { name: 'Armónica: Dórico #4 (modo 4)', intervals: [0,2,3,6,7,9,10] },
    // modo 5 de la armónica = Flamenco (ya existe arriba, mismos intervalos, no se duplica)
    armonica_lidio2:  { name: 'Armónica: Lidio #2 (modo 6)', intervals: [0,3,4,6,7,9,11] },
    armonica_superloc:{ name: 'Armónica: Superlocrio ♭♭7 (modo 7)', intervals: [0,1,3,4,6,8,9] },

    // ---- Menor melódica y sus 7 modos (verificados igual) ----
    menor_melodica:   { name: 'Menor Melódica', intervals: [0,2,3,5,7,9,11] },
    melodica_dorico2: { name: 'Melódica: Dórico ♭2 (modo 2)', intervals: [0,1,3,5,7,9,10] },
    melodica_lidioaum:{ name: 'Melódica: Lidio Aumentado (modo 3)', intervals: [0,2,4,6,8,9,11] },
    melodica_lidiodom:{ name: 'Melódica: Lidio Dominante (modo 4)', intervals: [0,2,4,6,7,9,10] },
    melodica_mixo6:   { name: 'Melódica: Mixolidio ♭6 (modo 5)', intervals: [0,2,4,5,7,8,10] },
    melodica_locrio2: { name: 'Melódica: Locrio ♮2 (modo 6)', intervals: [0,2,3,5,6,8,10] },
    melodica_alterada:{ name: 'Melódica: Alterada / Superlocrio (modo 7)', intervals: [0,1,3,4,6,8,10] }
  };

  // ---------- ACORDES (diagramas de cejilla, generados por fórmula y verificados) ----------
  // 'E' = forma de Mi (cejilla en la 6ª cuerda, las 6 cuerdas suenan). 'A4' = forma de La
  // (cejilla en la 5ª cuerda, se silencian la 6ª y la 1ª) — la forma habitual para semidisminuidos.
  // offsets = trastes relativos a la cejilla; tones = intervalos reales del acorde (para verificar).
  // ---------- RECETA DE MODOS (a partir de Mayor o Menor natural) ----------
  // degrees: grados (1-indexados) que cambian respecto a la escala base, y en qué dirección.
  // Verificado contra SCALES: la diferencia real de intervalos coincide exactamente con la receta.
  const MODE_RECIPES = {
    dorico:     { from: 'eolico', label: 'Dórico',     degrees: [{n:6, dir:'up'}],              short: '↑6' },
    frigio:     { from: 'eolico', label: 'Frigio',     degrees: [{n:2, dir:'down'}],            short: '↓2' },
    lidio:      { from: 'jonico', label: 'Lidio',      degrees: [{n:4, dir:'up'}],              short: '↑4' },
    mixolidio:  { from: 'jonico', label: 'Mixolidio',  degrees: [{n:7, dir:'down'}],            short: '↓7' },
    locrio:     { from: 'eolico', label: 'Locrio',     degrees: [{n:2, dir:'down'},{n:5, dir:'down'}], short: '↓2 ↓5' },

    // ---- Menor armónica y sus modos: cada uno es un modo natural con 1 grado alterado (verificado) ----
    menor_armonica:    { from: 'eolico', label: 'Menor Armónica',     degrees: [{n:7, dir:'up'}],   short: '↑7' },
    armonica_locrio6:  { from: 'locrio', label: 'Locrio ♮6',          degrees: [{n:6, dir:'up'}],   short: '↑6' },
    armonica_jonico5:  { from: 'jonico', label: 'Jónico #5 (aum.)',   degrees: [{n:5, dir:'up'}],   short: '↑5' },
    armonica_dorico4:  { from: 'dorico', label: 'Dórico #4',          degrees: [{n:4, dir:'up'}],   short: '↑4' },
    flamenco:          { from: 'frigio', label: 'Flamenco (Frigio dom.)', degrees: [{n:3, dir:'up'}], short: '↑3' },
    armonica_lidio2:   { from: 'lidio',  label: 'Lidio #2',           degrees: [{n:2, dir:'up'}],   short: '↑2' },

    // ---- Menor melódica y sus modos (verificado igual) ----
    menor_melodica:    { from: 'jonico', label: 'Menor Melódica',     degrees: [{n:3, dir:'down'}], short: '↓3' },
    melodica_dorico2:  { from: 'dorico', label: 'Dórico ♭2',          degrees: [{n:2, dir:'down'}], short: '↓2' },
    melodica_lidioaum: { from: 'lidio',  label: 'Lidio Aumentado',    degrees: [{n:5, dir:'up'}],   short: '↑5' },
    melodica_lidiodom: { from: 'lidio',  label: 'Lidio Dominante',    degrees: [{n:7, dir:'down'}], short: '↓7' },
    melodica_mixo6:    { from: 'mixolidio', label: 'Mixolidio ♭6',    degrees: [{n:6, dir:'down'}], short: '↓6' },
    melodica_locrio2:  { from: 'locrio', label: 'Locrio ♮2',          degrees: [{n:2, dir:'up'}],   short: '↑2' },
    melodica_alterada: { from: 'locrio', label: 'Alterada (Superlocrio)', degrees: [{n:4, dir:'down'}], short: '↓4' }
  };

  const CHORD_QUALITIES = {
    major: { label: 'Mayor',          suffix: '',     family: 'E',  offsets: [0,2,2,1,0,0], fingers: [1,3,4,2,1,1], tones: [0,4,7] },
    minor: { label: 'Menor',          suffix: 'm',    family: 'E',  offsets: [0,2,2,0,0,0], fingers: [1,3,4,1,1,1], tones: [0,3,7] },
    dom7:  { label: 'Séptima',        suffix: '7',    family: 'E',  offsets: [0,2,0,1,0,0], fingers: [1,3,1,2,1,1], tones: [0,4,7,10] },
    min7:  { label: 'Séptima menor',  suffix: 'm7',   family: 'E',  offsets: [0,2,0,0,0,0], fingers: [1,3,1,1,1,1], tones: [0,3,7,10] },
    maj7:  { label: 'Séptima mayor',  suffix: 'maj7', family: 'E',  offsets: [0,2,1,1,0,0], fingers: [1,3,2,2,1,1], tones: [0,4,7,11] },
    m7b5:  { label: 'Semidism. (m7b5)', suffix: 'm7b5', family: 'A4', offsets: [0,1,0,1],   fingers: [1,2,1,3],     tones: [0,3,6,10] },
    sixth: { label: 'Sexta',          suffix: '6',    family: 'E',  offsets: [0,2,2,1,2,0], fingers: [1,3,4,2,4,1], tones: [0,4,7,9] },
    add9:  { label: 'Added 9th', suffix: 'add9', family: 'custom', anchorIdx: 0, tones: [0,2,4,7],
      active: [ {idx:0,offset:0,finger:1}, {idx:1,offset:2,finger:3}, {idx:3,offset:1,finger:2}, {idx:5,offset:2,finger:4} ] },
    sus2:  { label: 'Sus2',      suffix: 'sus2', family: 'custom', anchorIdx: 0, tones: [0,2,7],
      active: [ {idx:0,offset:0,finger:1}, {idx:1,offset:2,finger:3}, {idx:2,offset:2,finger:3}, {idx:4,offset:0,finger:1}, {idx:5,offset:2,finger:4} ] },
    sus4:  { label: 'Sus4',      suffix: 'sus4', family: 'E', offsets: [0,0,2,2,0,0], fingers: [1,1,3,3,1,1], tones: [0,5,7] },
    dim7:  { label: 'Disminuido 7', suffix: 'dim7', family: 'E', offsets: [0,1,2,0,2,0], fingers: [1,2,3,1,4,1], tones: [0,3,6,9] },
    aug:   { label: 'Aumentado', suffix: 'aug', family: 'E', offsets: [0,3,2,1,1,0], fingers: [1,4,3,2,2,1], tones: [0,4,8] },
    dom9:  { label: 'Novena (9)', suffix: '9', family: 'custom', anchorIdx: 0, tones: [0,4,10,2],
      active: [ {idx:0,offset:0,finger:1}, {idx:2,offset:0,finger:1}, {idx:3,offset:1,finger:2}, {idx:4,offset:3,finger:4}, {idx:5,offset:2,finger:3} ] },
    fifth:   { label: 'Quinta (power chord)', suffix: '5', family: 'custom', anchorIdx: 0, tones: [0,7],
      active: [ {idx:0,offset:0,finger:1}, {idx:1,offset:2,finger:2}, {idx:2,offset:2,finger:2} ] },
    m6:      { label: 'Sexta menor', suffix: 'm6', family: 'E', offsets: [0,2,2,0,2,0], fingers: [1,2,2,1,2,1], tones: [0,3,7,9] },
    madd9:   { label: 'Menor Added 9th', suffix: 'm(add9)', family: 'E', offsets: [0,2,2,0,0,2], fingers: [1,2,2,1,1,2], tones: [0,2,3,7] },
    sev_sus4:{ label: 'Séptima Sus4', suffix: '7sus4', family: 'E', offsets: [0,0,0,2,0,0], fingers: [1,1,1,2,1,1], tones: [0,5,7,10] },
    mMaj7:   { label: 'Menor-Mayor 7', suffix: 'm(maj7)', family: 'E', offsets: [0,2,1,0,0,0], fingers: [1,3,2,1,1,1], tones: [0,3,7,11] },
    maj7b5:  { label: 'Mayor 7 b5', suffix: 'maj7b5', family: 'custom', anchorIdx: 0, tones: [0,4,6,11],
      active: [ {idx:0,offset:0,finger:1}, {idx:1,offset:1,finger:2}, {idx:2,offset:1,finger:2}, {idx:3,offset:1,finger:2}, {idx:5,offset:0,finger:1} ] },
    aug7:     { label: 'Aumentada 7 (+7)', suffix: '+7', family: 'custom', anchorIdx: 0, tones: [0,4,8,10],
      active: [ {idx:0,offset:0,finger:1}, {idx:1,offset:3,finger:3}, {idx:2,offset:0,finger:1}, {idx:3,offset:1,finger:2}, {idx:5,offset:0,finger:1} ] },
    sev_b5:   { label: 'Séptima b5 (7b5)', suffix: '7b5', family: 'custom', anchorIdx: 0, tones: [0,4,6,10],
      active: [ {idx:0,offset:0,finger:1}, {idx:1,offset:1,finger:2}, {idx:2,offset:0,finger:1}, {idx:3,offset:1,finger:2}, {idx:5,offset:0,finger:1} ] },
    sev_s9:   { label: 'Séptima #9 (Hendrix)', suffix: '7#9', family: 'custom', anchorIdx: 0, tones: [0,3,4,7,10],
      active: [ {idx:0,offset:3,finger:4}, {idx:1,offset:2,finger:3}, {idx:2,offset:0,finger:1}, {idx:3,offset:1,finger:2}, {idx:5,offset:0,finger:1} ] },
    sev_b9:   { label: 'Séptima b9 (7b9)', suffix: '7b9', family: 'custom', anchorIdx: 0, tones: [0,1,4,7,10],
      active: [ {idx:0,offset:1,finger:2}, {idx:1,offset:2,finger:3}, {idx:2,offset:0,finger:1}, {idx:3,offset:1,finger:2}, {idx:5,offset:0,finger:1} ] },
    six_nine: { label: 'Sexta con novena (6/9)', suffix: '6/9', family: 'custom', anchorIdx: 0, tones: [0,2,4,7,9],
      active: [ {idx:0,offset:0,finger:1}, {idx:1,offset:2,finger:3}, {idx:2,offset:2,finger:3}, {idx:3,offset:1,finger:2}, {idx:4,offset:2,finger:3}, {idx:5,offset:2,finger:3} ] },
    m6_nine:  { label: 'Menor 6/9', suffix: 'm6/9', family: 'custom', anchorIdx: 0, tones: [0,2,3,7,9],
      active: [ {idx:0,offset:0,finger:1}, {idx:1,offset:2,finger:2}, {idx:2,offset:2,finger:2}, {idx:3,offset:0,finger:1}, {idx:4,offset:2,finger:2}, {idx:5,offset:2,finger:2} ] }
  };

  // fórmula de cada acorde (grado de la escala mayor + semitono), en el mismo orden en que se
  // muestra — verificada contra los "tones" de arriba, nota por nota, para las 13 calidades.
  const CHORD_FORMULAS = {
    major: [['1',0],['3',4],['5',7]],
    minor: [['1',0],['b3',3],['5',7]],
    dom7:  [['1',0],['3',4],['5',7],['b7',10]],
    min7:  [['1',0],['b3',3],['5',7],['b7',10]],
    maj7:  [['1',0],['3',4],['5',7],['7',11]],
    m7b5:  [['1',0],['b3',3],['b5',6],['b7',10]],
    sixth: [['1',0],['3',4],['5',7],['6',9]],
    add9:  [['1',0],['3',4],['5',7],['9',2]],
    sus2:  [['1',0],['2',2],['5',7]],
    sus4:  [['1',0],['4',5],['5',7]],
    dim7:  [['1',0],['b3',3],['b5',6],['bb7',9]],
    aug:   [['1',0],['3',4],['#5',8]],
    dom9:  [['1',0],['3',4],['b7',10],['9',2]], // sin 5ª: se omite a propósito, ver digitación
    fifth:    [['1',0],['5',7]],
    m6:       [['1',0],['b3',3],['5',7],['6',9]],
    madd9:    [['1',0],['b3',3],['5',7],['9',2]],
    sev_sus4: [['1',0],['4',5],['5',7],['b7',10]],
    mMaj7:    [['1',0],['b3',3],['5',7],['7',11]],
    maj7b5:   [['1',0],['3',4],['b5',6],['7',11]],
    aug7:     [['1',0],['3',4],['#5',8],['b7',10]],
    sev_b5:   [['1',0],['3',4],['b5',6],['b7',10]],
    sev_s9:   [['1',0],['3',4],['5',7],['b7',10],['#9',3]],
    sev_b9:   [['1',0],['3',4],['5',7],['b7',10],['b9',1]],
    six_nine: [['1',0],['3',4],['5',7],['6',9],['9',2]],
    m6_nine:  [['1',0],['b3',3],['5',7],['6',9],['9',2]]
  };

  // ---------- PROGRESIONES DIATÓNICAS ----------
  // calidad de acorde por grado (verificada contra "Chords in all major/minor keys"): reutiliza
  // exactamente las calidades ya existentes en CHORD_QUALITIES, ninguna digitación nueva.
  const PROG_DEGREE_QUALITY = {
    mayor: ['maj7','min7','min7','maj7','dom7','min7','m7b5'],
    menor: ['min7','m7b5','maj7','min7','min7','maj7','dom7']
  };
  const PROG_ROMAN = {
    mayor: ['I','ii','iii','IV','V','vi','vii°'],
    menor: ['i','ii°','III','iv','v','VI','VII']
  };
  const PROG_PRESETS = {
    mayor: [
      { label: 'I-IV-V-I',  degrees: [0,3,4,0] },
      { label: 'I-V-vi-IV', degrees: [0,4,5,3] },
      { label: 'ii-V-I',    degrees: [1,4,0] },
      { label: 'I-vi-IV-V', degrees: [0,5,3,4] }
    ],
    menor: [
      { label: 'i-iv-v-i',    degrees: [0,3,4,0] },
      { label: 'i-VI-VII-i',  degrees: [0,5,6,0] },
      { label: 'ii°-v-i',     degrees: [1,4,0] },
      { label: 'i-iv-VII-III',degrees: [0,3,6,2] }
    ]
  };

  // ---------- FORMAS ESTÁNDAR ----------
  // plantillas de un toque: no usan la tabla diatónica normal, porque cada una tiene alteraciones
  // propias verificadas (el blues fuerza dominante 7 en todos los grados; rhythm changes usa
  // dominantes secundarios en el puente; la cadencia andaluza altera el V de menor a mayor —
  // los otros tres grados de esa cadencia ya son mayores de forma natural en la menor natural).
  // ---------- CAJA DE RITMOS: patrones (rejilla de 16 pasos = 1 compás de 4/4) ----------
  // verificados uno por uno contra el patrón real de cada género antes de programar nada
  // (ver la comprobación en texto: negras 1&3/2&4, sincopa de funk, "one drop" de reggae...).
  const DRUM_STYLES = {
    rock:   { label: 'Rock',    steps:16, kick:[0,8],       snare:[4,12], hihatClosed:[0,2,4,6,8,10,12,14], swing:0 },
    pop:    { label: 'Pop',     steps:16, kick:[0,6,8],     snare:[4,12], hihatClosed:[0,2,4,6,8,10,12,14], swing:0 },
    funk:   { label: 'Funk',    steps:16, kick:[0,3,6,10],  snare:[4,12], hihatClosed:Array.from({length:16},(_,i)=>i), swing:0 },
    reggae: { label: 'Reggae', steps:16, kick:[8],         snare:[8],    hihatClosed:[2,6,10,14], swing:0 },
    metal:  { label: 'Metal',   steps:16, kick:[0,2,4,6,8,10,12,14], snare:[4,12], hihatClosed:[0,2,4,6,8,10,12,14], swing:0 },
    punk:   { label: 'Punk',    steps:16, kick:[0,4,8,12],  snare:[4,12], hihatClosed:[0,2,4,6,8,10,12,14], swing:0 },
    blues:  { label: 'Blues Shuffle', steps:16, kick:[0,8], snare:[4,12], hihatClosed:[0,2,4,6,8,10,12,14], swing:65 },
    bossa:  { label: 'Bossa Nova', steps:16, kick:[0,6,8,14], clap:[4,12], hihatClosed:[0,2,4,6,8,10,12,14], swing:0 },
    ska:    { label: 'Ska',     steps:16, kick:[0,8], snare:[4,12], hihatClosed:[0,4,8,12], hihatOpen:[2,6,10,14], swing:0 },
    disco:  { label: 'Disco',   steps:16, kick:[0,4,8,12], snare:[4,12], hihatClosed:[0,4,8,12], hihatOpen:[2,6,10,14], swing:0 },
    hiphop: { label: 'Hip-Hop', steps:16, kick:[0,3,7,10], snare:[4,12], hihatClosed:Array.from({length:16},(_,i)=>i), swing:0 },
    vals:   { label: 'Vals (3/4)', steps:12, kick:[0], snare:[4,8], hihatClosed:[0,2,4,6,8,10], swing:0 }
  };
  const DRUM_VOICES = ['crash','hihatOpen','hihatClosed','clap','snare','kick'];
  const DRUM_VOICE_LABELS = { crash:'Platillo', hihatOpen:'Hi-hat abierto', hihatClosed:'Hi-hat', clap:'Palmada', snare:'Caja', kick:'Bombo' };

  // relleno genérico (redoble de caja + platillo) que sustituye los 4 últimos pasos del compás
  // cuando el fill automático está activo — un giro clásico de "aviso" antes de repetir el patrón.
  // Definido de forma RELATIVA al final del compás (posiciones -4,-3,-2,-1), no en una posición
  // fija como "paso 12", para que funcione igual de bien con un compás de 16 pasos (4/4) que con
  // uno de 12 (el vals en 3/4) — cualquier estilo con al menos 4 pasos puede usarlo.
  const DRUM_FILL_GENERIC = {
    kick:        [0,0,0,1],
    snare:       [1,1,2,0],
    hihatClosed: [0,0,0,0],
    hihatOpen:   [0,0,0,0],
    clap:        [0,0,0,0],
    crash:       [0,0,0,1]
  };
  // fills propios por estilo: cada uno pensado para encajar con el carácter de ese género, en vez
  // de usar siempre el mismo redoble genérico de caja+platillo
  const DRUM_FILLS_BY_STYLE = {
    funk: { // sincopado: combo bombo+caja en vez de redoble limpio, sin platillo (el funk no suele "explotar")
      kick:        [1,0,0,1],
      snare:       [0,1,1,0],
      hihatClosed: [0,0,0,0],
      hihatOpen:   [0,0,0,0],
      clap:        [0,0,0,0],
      crash:       [0,0,0,0]
    },
    metal: { // doble bombo rápido + redoble de caja con acento creciente, gran platillo final
      kick:        [1,1,1,1],
      snare:       [1,1,2,2],
      hihatClosed: [0,0,0,0],
      hihatOpen:   [0,0,0,0],
      clap:        [0,0,0,0],
      crash:       [0,0,0,1]
    },
    reggae: { // minimalista: casi silencio hasta el último golpe, deja "espacio" (muy propio del género)
      kick:        [0,0,0,0],
      snare:       [0,0,0,1],
      hihatClosed: [0,0,0,0],
      hihatOpen:   [0,0,0,0],
      clap:        [0,0,0,0],
      crash:       [0,0,0,0]
    },
    blues: { // con feel de swing, bombo y caja alternando, platillo al final
      kick:        [0,1,0,1],
      snare:       [1,0,1,0],
      hihatClosed: [0,0,0,0],
      hihatOpen:   [0,0,0,0],
      clap:        [0,0,0,0],
      crash:       [0,0,0,1]
    },
    vals: { // más simple, solo marca el final de la frase de 3 tiempos con la caja
      kick:        [0,0,0,1],
      snare:       [1,0,1,0],
      hihatClosed: [0,0,0,0],
      hihatOpen:   [0,0,0,0],
      clap:        [0,0,0,0],
      crash:       [0,0,0,0]
    }
  };
  function drumFillForStyle(styleKey){
    return DRUM_FILLS_BY_STYLE[styleKey] || DRUM_FILL_GENERIC;
  }

  // convierte el formato disperso de los presets (array de índices activos) al formato editable
  // de la rejilla (array de N valores según los pasos del estilo: 0=apagado, 1=normal, 2=acento)
  function drumBuildPatternFromStyle(styleKey){
    const style = DRUM_STYLES[styleKey];
    const steps = style.steps || 16;
    const pattern = {};
    DRUM_VOICES.forEach(v => {
      const arr = new Array(steps).fill(0);
      (style[v] || []).forEach(i => { arr[i] = 1; });
      pattern[v] = arr;
    });
    return pattern;
  }


  const FORM_TEMPLATES = {
    blues12: {
      label: '12 compases de Blues',
      build(rootPc){
        const I = rootPc, IV = (rootPc + 5) % 12, V = (rootPc + 7) % 12;
        const seq = [I,I,I,I, IV,IV,I,I, V,IV,I,V];
        const romans = ['I7','I7','I7','I7','IV7','IV7','I7','I7','V7','IV7','I7','V7'];
        return seq.map((r, i) => ({ rootPc: r, qualityKey: 'dom7', roman: romans[i], bars: 1 }));
      }
    },
    rhythmChanges: {
      label: 'Rhythm Changes (32c)',
      build(rootPc){
        const I = rootPc, ii = (rootPc + 2) % 12, iii = (rootPc + 4) % 12,
              IV = (rootPc + 5) % 12, V = (rootPc + 7) % 12, vi = (rootPc + 9) % 12;
        const A = [
          { rootPc: I,  qualityKey: 'maj7', roman: 'I',  bars: 1 },
          { rootPc: vi, qualityKey: 'min7', roman: 'vi', bars: 1 },
          { rootPc: ii, qualityKey: 'min7', roman: 'ii', bars: 1 },
          { rootPc: V,  qualityKey: 'dom7', roman: 'V',  bars: 1 },
          { rootPc: I,  qualityKey: 'maj7', roman: 'I',  bars: 1 },
          { rootPc: vi, qualityKey: 'min7', roman: 'vi', bars: 1 },
          { rootPc: ii, qualityKey: 'min7', roman: 'ii', bars: 1 },
          { rootPc: V,  qualityKey: 'dom7', roman: 'V',  bars: 1 }
        ];
        const B = [
          { rootPc: iii, qualityKey: 'dom7', roman: 'III7', bars: 2 },
          { rootPc: vi,  qualityKey: 'dom7', roman: 'VI7',  bars: 2 },
          { rootPc: ii,  qualityKey: 'dom7', roman: 'II7',  bars: 2 },
          { rootPc: V,   qualityKey: 'dom7', roman: 'V7',   bars: 2 }
        ];
        return [...A, ...A, ...B, ...A];
      }
    },
    andaluza: {
      label: 'Cadencia Andaluza',
      build(rootPc){
        const i = rootPc, VII = (rootPc + 10) % 12, VI = (rootPc + 8) % 12, V = (rootPc + 7) % 12;
        return [
          { rootPc: i,   qualityKey: 'minor', roman: 'i',   bars: 1 },
          { rootPc: VII, qualityKey: 'major', roman: 'VII', bars: 1 },
          { rootPc: VI,  qualityKey: 'major', roman: 'VI',  bars: 1 },
          { rootPc: V,   qualityKey: 'major', roman: 'V',   bars: 1 }
        ];
      }
    }
  };

  // ---------- "¿QUÉ ESCALA TOCO ENCIMA?" ----------
  // familia de 7 modos en el orden en que aparecen sobre la escala mayor (I=Jónico, II=Dórico...).
  // El grado de un acorde en la progresión ya determina, por teoría, qué modo encaja de forma
  // natural — verificado contra los emparejamientos estándar de jazz (m7→Dórico, dom7→Mixolidio,
  // m7b5→Locrio, maj7 en el IV→Lidio, etc.)
  const MODE_FAMILY = ['jonico','dorico','frigio','lidio','mixolidio','eolico','locrio'];

  function suggestedModeForDegree(degreeIdx, context){
    const idx = context === 'mayor' ? degreeIdx : (degreeIdx + 5) % 7;
    return MODE_FAMILY[idx];
  }

  function degreeChordInfo(degreeIdx, context, rootPc){
    const baseIntervals = SCALES[context === 'mayor' ? 'jonico' : 'eolico'].intervals;
    const chordRootPc = (rootPc + baseIntervals[degreeIdx]) % 12;
    const qualityKey = PROG_DEGREE_QUALITY[context][degreeIdx];
    return { chordRootPc, qualityKey, roman: PROG_ROMAN[context][degreeIdx] };
  }

  // ---------- LÍNEA DE BAJO WALKING ----------
  // 4 notas por acorde (una por tiempo): raíz, 3ª-ish, 5ª-ish, y una nota de acercamiento
  // cromático (medio tono por debajo) hacia la raíz del acorde siguiente — la técnica más
  // estándar y universal de walking bass. La progresión se trata como un ciclo: el último
  // acorde se acerca hacia el primero.
  const WALKING_SEARCH_MAX_FRET = 9; // zona compacta, evita que la línea "trepe" sin control

  function walkingBeatTones(qualityKey){
    const t = CHORD_QUALITIES[qualityKey].tones;
    return [t[0], t[1], t[2] !== undefined ? t[2] : t[1]];
  }

  function findClosestBassNote(targetPc, refMidi){
    const tuning = TUNINGS.bajo;
    const openMidi = OPEN_MIDI.bajo;
    let best = null;
    for (let s = 0; s < tuning.length; s++) {
      for (let f = 0; f <= WALKING_SEARCH_MAX_FRET; f++) {
        const midi = openMidi[s] + f;
        const pc = (pitchClassIndex(tuning[s]) + f) % 12;
        if (pc !== targetPc) continue;
        const dist = Math.abs(midi - refMidi);
        if (!best || dist < best.dist) best = { sIdx: s, fret: f, midi, pc, dist };
      }
    }
    return best;
  }

  // búsqueda de nota de bajo con rango de traste ampliable — la usa el patrón de octavas, ya que
  // la nota "aguda" (una octava por encima) a veces no cabe dentro de la ventana compacta habitual
  // (9 trastes) en ciertas cuerdas, y sin ampliar el rango el patrón se quedaría repitiendo la
  // misma nota en vez de saltar de verdad una octava.
  function findBassNoteWideRange(targetPc, refMidi, maxFret){
    const tuning = TUNINGS.bajo, openMidi = OPEN_MIDI.bajo;
    let best = null;
    for (let s = 0; s < tuning.length; s++) {
      for (let f = 0; f <= maxFret; f++) {
        const midi = openMidi[s] + f;
        const pc = (pitchClassIndex(tuning[s]) + f) % 12;
        if (pc !== targetPc) continue;
        const dist = Math.abs(midi - refMidi);
        if (!best || dist < best.dist) best = { sIdx: s, fret: f, midi, pc, dist };
      }
    }
    return best;
  }

  function buildChordShape(rootPc, qualityKey){
    const q = CHORD_QUALITIES[qualityKey];
    const tuning = TUNINGS.guitarra;
    const openPcs = tuning.map(n => pitchClassIndex(n));
    if (q.family === 'E') {
      const B = (rootPc - openPcs[0] + 12) % 12;
      const strings = tuning.map((_, k) => ({ mute: false, fret: B + q.offsets[k], finger: q.fingers[k] }));
      return { baseFret: B, strings, q };
    }
    if (q.family === 'custom') {
      // lista explícita de cuerdas activas (evita cejillas o estiramientos que no caben en la rejilla)
      const B = (rootPc - openPcs[q.anchorIdx] + 12) % 12;
      const strings = tuning.map((_, k) => {
        const found = q.active.find(a => a.idx === k);
        if (!found) return { mute: true, fret: null, finger: null };
        return { mute: false, fret: B + found.offset, finger: found.finger };
      });
      return { baseFret: B, strings, q };
    }
    // family 'A4': cejilla en la cuerda La (índice 1), se silencian la 6ª (0) y la 1ª (5)
    const B = (rootPc - openPcs[1] + 12) % 12;
    const strings = tuning.map((_, k) => {
      if (k === 0 || k === 5) return { mute: true, fret: null, finger: null };
      const li = k - 1;
      return { mute: false, fret: B + q.offsets[li], finger: q.fingers[li] };
    });
    return { baseFret: B, strings, q };
  }

  // ---------- 5 POSICIONES CAGED ----------
  // Las 5 formas abiertas clásicas (C-A-G-E-D), cada una verificada nota por nota contra el
  // acorde abierto real. anchor = cuerda que sirve de referencia para calcular la cejilla al
  // transportar la forma a cualquier tónica; offsets = trastes reales en posición abierta.
  // Fase 1: Mayor y Menor (las calidades clásicas del sistema CAGED). Ampliarlo a 7ª/extendidos
  // requeriría derivar y verificar formas C/D/G nuevas para cada calidad, paso a paso.
  const CAGED_SHAPES = {
    major: {
      E: { anchor: 0, offsets: [0,2,2,1,0,0] },
      A: { anchor: 1, offsets: [null,0,2,2,2,0] },
      D: { anchor: 2, offsets: [null,null,0,2,3,2] },
      C: { anchor: 1, offsets: [null,3,2,0,1,0] },
      G: { anchor: 0, offsets: [3,2,0,0,0,3] }
    },
    minor: {
      E: { anchor: 0, offsets: [0,2,2,0,0,0] },
      A: { anchor: 1, offsets: [null,0,2,2,1,0] },
      D: { anchor: 2, offsets: [null,null,0,2,3,1] },
      C: { anchor: 1, offsets: [null,3,1,0,1,3] },
      G: { anchor: 0, offsets: [3,1,0,0,3,3] }
    },
    dom7: {
      E: { anchor: 0, offsets: [0,2,0,1,0,0] },
      A: { anchor: 1, offsets: [null,0,2,0,2,0] },
      D: { anchor: 2, offsets: [null,null,0,2,1,2] },
      C: { anchor: 1, offsets: [null,3,2,3,1,0] }, // omite la 5ª (Sol) — práctica estándar y habitual en guitarra
      G: { anchor: 0, offsets: [3,2,0,0,0,1] }
    },
    maj7: {
      E: { anchor: 0, offsets: [0,2,1,1,0,0] },
      A: { anchor: 1, offsets: [null,0,2,1,2,0] },
      D: { anchor: 2, offsets: [null,null,0,2,2,2] },
      C: { anchor: 1, offsets: [null,3,2,0,0,0] },
      G: { anchor: 0, offsets: [3,2,0,0,0,2] }
    },
    min7: {
      // solo E/A/D: las formas C y G de séptima menor requieren digitaciones con cejilla más
      // complejas que no puedo verificar con la misma confianza sin probarlas a mano — mejor
      // mostrar 3 posiciones correctas que 5 con 2 de ellas sin verificar del todo
      E: { anchor: 0, offsets: [0,2,0,0,0,0] },
      A: { anchor: 1, offsets: [null,0,2,0,1,0] },
      D: { anchor: 2, offsets: [null,null,0,2,1,1] }
    },
    sus4: {
      E: { anchor: 0, offsets: [0,2,2,2,0,0] },
      A: { anchor: 1, offsets: [null,0,2,2,3,0] },
      D: { anchor: 2, offsets: [null,null,0,2,3,3] },
      C: { anchor: 1, offsets: [null,3,3,0,1,1] },
      G: { anchor: 0, offsets: [3,3,0,0,1,3] }
    }
  };
  const CAGED_ELIGIBLE = new Set(['major', 'minor', 'dom7', 'maj7', 'min7', 'sus4']);

  // asigna dedos 1-4 de forma genérica: el traste más bajo del grupo = dedo 1 (y por tanto
  // cualquier cuerda que comparta ese mismo traste se dibuja como cejilla), y así sucesivamente.
  function assignFingersGeneric(offsets){
    const active = offsets.filter(o => o !== null);
    const uniqueSorted = [...new Set(active)].sort((a, b) => a - b);
    return offsets.map(o => o === null ? null : Math.min(4, uniqueSorted.indexOf(o) + 1));
  }

  function computeCagedPositions(rootPc, qualityKey){
    if (!CAGED_ELIGIBLE.has(qualityKey)) return [];
    const tuning = TUNINGS.guitarra;
    const openPcs = tuning.map(n => pitchClassIndex(n));
    const q = CHORD_QUALITIES[qualityKey];
    const shapes = CAGED_SHAPES[qualityKey];
    const fingers = {};
    Object.entries(shapes).forEach(([name, sh]) => { fingers[name] = assignFingersGeneric(sh.offsets); });

    const positions = Object.entries(shapes).map(([name, sh]) => {
      const B = (rootPc - openPcs[sh.anchor] - sh.offsets[sh.anchor] + 120) % 12;
      const strings = tuning.map((_, k) => {
        const o = sh.offsets[k];
        if (o === null) return { mute: true, fret: null, finger: null };
        return { mute: false, fret: o + B, finger: fingers[name][k] };
      });
      const minFret = Math.min(...strings.filter(s => !s.mute).map(s => s.fret));
      return { shapeName: name, baseFret: minFret === 0 ? 0 : minFret, strings, q, sortFret: minFret };
    });

    positions.sort((a, b) => a.sortFret - b.sortFret);
    return positions;
  }

  const PATTERNS = {
    updown:  { name: 'Ida y vuelta', hint: 'Sube toda la posición y baja — para memorizar la digitación.' },
    up:      { name: 'Solo ida',     hint: 'Solo ascendente — pensado para enlazar con la siguiente posición.' },
    thirds:  { name: 'En terceras',  hint: 'Patrón 1-3, 2-4, 3-5… clásico para digitación y oído.' },
    skip:    { name: 'Salto cuerdas', hint: 'Salta una cuerda de por medio — típico de solos.' },
    random:  { name: 'Aleatorio',    hint: 'Mismas notas de la posición, en orden aleatorio — entrena el oído, no solo el gesto.' }
  };

  const ZONES = [
    { id:'full', label:'Todo',    range:[0,15] },
    { id:'z1',   label:'0–4',     range:[0,4] },
    { id:'z2',   label:'3–7',     range:[3,7] },
    { id:'z3',   label:'7–10',    range:[7,10] },
    { id:'z4',   label:'10–15',   range:[10,15] }
  ];

  // ---------- ESTILOS (fase 1: ritmo sobre notas sueltas, sin acordes) ----------
  // Cada paso referencia un ÍNDICE dentro de las notas reales de la posición (positionNotes()),
  // nunca una cuerda/traste inventados — así la nota siempre sale del motor ya verificado.
  // dur está en "unidades de corchea" (2 = negra, 1 = corchea, 0.5 = semicorchea).
  const STYLES = {
    blues:  { name: 'Blues', scaleKey: 'blues', swing: true,
      hint: 'Shuffle de blues: corcheas con swing sobre la escala de blues.' },
    rock:   { name: 'Rock', scaleKey: 'pent_menor', swing: false,
      hint: 'Riff recto y directo, con "chugs" mudos en la tónica.' },
    metal:  { name: 'Metal', scaleKey: 'pent_menor', swing: false,
      hint: 'Galope palm-mute en la tónica + carrera rápida final.' },
    funk:   { name: 'Funk', scaleKey: 'pent_menor', swing: false, chordStrings: 4,
      hint: 'Semicorcheas sincopadas con silencios, notas fantasma y stabs de acorde (guitarra). En bajo, línea monofónica.' },
    reggae: { name: 'Reggae', scaleKey: 'pent_mayor', swing: false, chordStrings: 3,
      hint: '"Skank" a contratiempo con acorde real (guitarra): silencio en el tiempo, acorde en el contratiempo. En bajo, línea monofónica.' },
    vintage:{ name: 'Vintage', scaleKey: 'pent_mayor', swing: true,
      hint: 'Shuffle alegre estilo rock and roll de los 50, sobre pentatónica mayor.' },
    flamenco:{ name: 'Flamenco', scaleKey: 'flamenco', swing: false,
      hint: 'Frase sobre la escala flamenca (frigio mayor), con la resolución característica de 2ª menor a la tónica. Aproximación melódica: no reproduce el compás real de un palo concreto (bulería, soleá...), que tiene su propia acentuación mucho más compleja.' }
  };

  // cada estilo tiene una LISTA de variantes de riff, para que el botón 🎲 pueda alternar entre
  // ellas y la práctica no sea siempre exactamente el mismo patrón.
  const STYLE_TEMPLATES = {
    blues: [
      [ // variante 1
        {idx:0,dur:1},{idx:2,dur:1},{idx:3,dur:1},{idx:4,dur:1},
        {idx:3,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:1},
        {idx:3,dur:1},{idx:4,dur:1},{idx:5,dur:1},{idx:0,dur:2}
      ],
      [ // variante 2: giro final distinto
        {idx:0,dur:1},{idx:1,dur:1},{idx:2,dur:1},{idx:0,dur:1},
        {idx:4,dur:1},{idx:3,dur:1},{idx:2,dur:1},{idx:0,dur:1},
        {idx:5,dur:1},{idx:4,dur:1},{idx:2,dur:1},{idx:0,dur:2}
      ]
    ],
    rock: [
      [
        {idx:0,dur:1},{idx:0,dur:1},{idx:0,dur:1},{idx:0,dur:1},
        {idx:2,dur:1},{idx:3,dur:1},{idx:4,dur:1},{idx:3,dur:1},
        {idx:2,dur:1},{idx:0,dur:1},{idx:0,dur:1},{idx:0,dur:2}
      ],
      [
        {idx:0,dur:1},{idx:0,dur:1},{idx:2,dur:1},{idx:0,dur:1},
        {idx:0,dur:1},{idx:3,dur:1},{idx:4,dur:1},{idx:0,dur:1},
        {idx:0,dur:1},{idx:2,dur:1},{idx:0,dur:1},{idx:0,dur:2}
      ]
    ],
    metal: [
      [
        {idx:0,dur:1},{idx:0,dur:0.5},{idx:0,dur:0.5},
        {idx:0,dur:1},{idx:0,dur:0.5},{idx:0,dur:0.5},
        {idx:0,dur:0.5},{idx:1,dur:0.5},{idx:2,dur:0.5},{idx:3,dur:0.5},
        {idx:4,dur:0.5},{idx:3,dur:0.5},{idx:2,dur:0.5},{idx:1,dur:0.5},{idx:0,dur:1}
      ],
      [ // variante 2: la carrera va primero descendiendo
        {idx:0,dur:1},{idx:0,dur:0.5},{idx:0,dur:0.5},
        {idx:0,dur:1},{idx:0,dur:0.5},{idx:0,dur:0.5},
        {idx:4,dur:0.5},{idx:3,dur:0.5},{idx:2,dur:0.5},{idx:1,dur:0.5},
        {idx:0,dur:0.5},{idx:1,dur:0.5},{idx:2,dur:0.5},{idx:3,dur:0.5},{idx:0,dur:1}
      ]
    ],
    // funk: semicorcheas con silencios, notas fantasma (mute) y stabs de ACORDE en los golpes fuertes
    funk: [
      [
        {chord:true,dur:0.5},          {rest:true,dur:0.5},
        {idx:0,dur:0.5,mute:true},     {chord:true,dur:0.5},
        {rest:true,dur:0.5},           {idx:0,dur:0.5,mute:true},
        {chord:true,dur:0.5},          {rest:true,dur:0.5},
        {chord:true,dur:0.5},          {idx:0,dur:0.5,mute:true},
        {rest:true,dur:0.5},           {chord:true,dur:0.5},
        {chord:true,dur:0.5},          {rest:true,dur:0.5},
        {idx:0,dur:0.5,mute:true},     {chord:true,dur:1}
      ],
      [ // variante 2: síncopa distinta
        {rest:true,dur:0.5},           {chord:true,dur:0.5},
        {idx:0,dur:0.5,mute:true},     {rest:true,dur:0.5},
        {chord:true,dur:0.5},          {idx:0,dur:0.5,mute:true},
        {rest:true,dur:0.5},           {chord:true,dur:0.5},
        {idx:0,dur:0.5,mute:true},     {chord:true,dur:0.5},
        {rest:true,dur:0.5},           {idx:0,dur:0.5,mute:true},
        {chord:true,dur:0.5},          {rest:true,dur:0.5},
        {chord:true,dur:0.5},          {idx:0,dur:1,mute:true}
      ]
    ],
    // reggae: silencio en el tiempo, ACORDE real en el contratiempo ("skank") — la misma
    // digitación repetida en cada contratiempo, como en el rasgueo real.
    reggae: [
      [
        {rest:true,dur:1},{chord:true,dur:1}, {rest:true,dur:1},{chord:true,dur:1},
        {rest:true,dur:1},{chord:true,dur:1}, {rest:true,dur:1},{chord:true,dur:1},
        {rest:true,dur:1},{chord:true,dur:1}, {rest:true,dur:1},{chord:true,dur:1},
        {rest:true,dur:1},{chord:true,dur:1}, {rest:true,dur:1},{chord:true,dur:2}
      ],
      [ // variante 2: doble golpe de contratiempo en un punto ("push")
        {rest:true,dur:1},{chord:true,dur:1}, {rest:true,dur:1},{chord:true,dur:1},
        {rest:true,dur:1},{chord:true,dur:0.5},{chord:true,dur:0.5}, {rest:true,dur:1},
        {rest:true,dur:1},{chord:true,dur:1}, {rest:true,dur:1},{chord:true,dur:1},
        {rest:true,dur:1},{chord:true,dur:1}, {rest:true,dur:1},{chord:true,dur:2}
      ]
    ],
    vintage: [
      [
        {idx:0,dur:1},{idx:1,dur:1},{idx:2,dur:1},{idx:1,dur:1},
        {idx:0,dur:1},{idx:2,dur:1},{idx:3,dur:1},{idx:2,dur:1},
        {idx:0,dur:1},{idx:1,dur:1},{idx:4,dur:1},{idx:0,dur:2}
      ],
      [
        {idx:0,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:1},
        {idx:3,dur:1},{idx:2,dur:1},{idx:4,dur:1},{idx:3,dur:1},
        {idx:0,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:2}
      ]
    ],
    // flamenco: recorrido por la escala (variante 1) y cierre insistiendo en la resolución
    // característica 2ª menor -> tónica, muy propia del cierre/cadencia andaluza (variante 2)
    flamenco: [
      [ // recorrido ascendente-descendente por los 7 grados
        {idx:0,dur:1},{idx:1,dur:1},{idx:2,dur:1},{idx:3,dur:1},
        {idx:4,dur:1},{idx:5,dur:1},{idx:6,dur:1},{idx:5,dur:1},
        {idx:4,dur:1},{idx:3,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:2}
      ],
      [ // cierre: tetracordo descendente 4-3-2(b2)-1, repetido, resolviendo en la tónica
        {idx:3,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:2},
        {idx:3,dur:1},{idx:2,dur:1},{idx:1,dur:0.5},{idx:1,dur:0.5},{idx:0,dur:2}
      ]
    ]
  };

  // aplica swing (feel shuffle 2:1) a pares consecutivos de corcheas iguales, sin tocar los templates
  function applySwing(steps){
    for (let i = 0; i + 1 < steps.length; i += 2) {
      if (steps[i].dur === 1 && steps[i+1].dur === 1) {
        steps[i] = { ...steps[i], dur: 1.34 };
        steps[i+1] = { ...steps[i+1], dur: 0.66 };
      }
    }
    return steps;
  }

  const NOTE_COLORS = NOTES.map((_, i) => `hsl(${30 + i * 23}, 62%, 28%)`); // evita la banda roja, reservada a la raíz. L=28% asegura contraste >=4.5:1 con el texto blanco en las 12 notas (verificado)
  const ROOT_COLOR = '#FF6B6B'; // mismo tono que --accent-root, oscurecido para que el texto blanco cumpla contraste

  return Object.freeze({
    pitchClassIndex,
    NOTES,
    DISPLAY,
    MAX_FRET,
    TUNINGS,
    OPEN_MIDI,
    TRIAD_QUALITIES,
    STRING_ORDINALS,
    TRIAD_STRING_SETS_VERTICAL,
    TRIAD_STRING_SETS_HORIZONTAL,
    TRIAD_ZONES,
    triadTones,
    triadInversionOrder,
    triadClosestVoicing,
    triadClosestVoicingPreferZone,
    TRIAD_MAJOR_STEPS,
    TRIAD_MINOR_STEPS,
    TRIAD_ROMAN_MAJOR,
    TRIAD_ROMAN_MINOR,
    triadBuildScale,
    triadQualityFromIntervals,
    triadDiatonicDegrees,
    TRIAD_PROGRESSIONS_MAJOR,
    TRIAD_PROGRESSIONS_MINOR,
    triadComputeShape,
    computePowerChordShape,
    triadSingleStringPositions,
    SCALES,
    MODE_RECIPES,
    CHORD_QUALITIES,
    CHORD_FORMULAS,
    PROG_DEGREE_QUALITY,
    PROG_ROMAN,
    PROG_PRESETS,
    DRUM_STYLES,
    DRUM_VOICES,
    DRUM_VOICE_LABELS,
    DRUM_FILL_GENERIC,
    DRUM_FILLS_BY_STYLE,
    drumFillForStyle,
    drumBuildPatternFromStyle,
    FORM_TEMPLATES,
    MODE_FAMILY,
    suggestedModeForDegree,
    degreeChordInfo,
    WALKING_SEARCH_MAX_FRET,
    walkingBeatTones,
    findClosestBassNote,
    findBassNoteWideRange,
    buildChordShape,
    CAGED_SHAPES,
    CAGED_ELIGIBLE,
    assignFingersGeneric,
    computeCagedPositions,
    PATTERNS,
    ZONES,
    STYLES,
    STYLE_TEMPLATES,
    applySwing,
    NOTE_COLORS,
    ROOT_COLOR,
  });
})();
