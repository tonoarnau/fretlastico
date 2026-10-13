// Fretlastico · Taller: lógica de la app (antes dentro de index.html). Script clásico, se carga al final del body.
(function(){
  const {
    pitchClassIndex, NOTES, DISPLAY, MAX_FRET, TUNINGS, OPEN_MIDI, TRIAD_QUALITIES, STRING_ORDINALS, TRIAD_STRING_SETS_VERTICAL, TRIAD_STRING_SETS_HORIZONTAL, TRIAD_ZONES, triadTones, triadInversionOrder, triadClosestVoicing, triadClosestVoicingPreferZone, TRIAD_MAJOR_STEPS, TRIAD_MINOR_STEPS, TRIAD_ROMAN_MAJOR, TRIAD_ROMAN_MINOR, triadBuildScale, triadQualityFromIntervals, triadDiatonicDegrees, TRIAD_PROGRESSIONS_MAJOR, TRIAD_PROGRESSIONS_MINOR, triadComputeShape, computePowerChordShape, triadSingleStringPositions, SCALES, MODE_RECIPES, CHORD_QUALITIES, CHORD_FORMULAS, PROG_DEGREE_QUALITY, PROG_ROMAN, PROG_PRESETS, DRUM_STYLES, DRUM_VOICES, DRUM_VOICE_LABELS, DRUM_FILL_GENERIC, DRUM_FILLS_BY_STYLE, drumFillForStyle, drumBuildPatternFromStyle, FORM_TEMPLATES, MODE_FAMILY, suggestedModeForDegree, degreeChordInfo, WALKING_SEARCH_MAX_FRET, walkingBeatTones, findClosestBassNote, findBassNoteWideRange, buildChordShape, CAGED_SHAPES, CAGED_ELIGIBLE, assignFingersGeneric, computeCagedPositions, PATTERNS, ZONES, STYLES, STYLE_TEMPLATES, applySwing, NOTE_COLORS, ROOT_COLOR
  } = window.FretTeoria;   // js/teoria-taller.js

  function triadShapeToSvgFormat(shape, stringIdxs, rootPc){
    const offsets = new Array(6).fill(null);
    stringIdxs.forEach((si, i) => { offsets[si] = shape.frets[i]; });
    const fingers = assignFingersGeneric(offsets);
    const strings = new Array(6).fill(null).map(() => ({ mute: true, fret: null, finger: null, pc: null, isRoot: false }));
    stringIdxs.forEach((si, i) => {
      const fret = shape.frets[i];
      const pc = (OPEN_MIDI.guitarra[si] + fret) % 12;
      strings[si] = { mute: false, fret, finger: fingers[si], pc, isRoot: pc === rootPc };
    });
    return { strings, minFret: shape.minFret, maxFret: shape.maxFret };
  }

  // dibuja el diagrama SVG de la tríada, con el MISMO lenguaje visual que el diagrama de acordes
  // (renderChordSVG): traste, cuerdas en orden zurdo-consciente, ✕ en las cuerdas no tocadas.
  // A diferencia de los acordes (que muestran solo el dedo, ya que el nombre del acorde va aparte),
  // aquí la cabeza del círculo muestra la NOTA — lo que hace falta memorizar en una tríada — con
  // una pequeña insignia de dedo en la esquina, igual que en el mástil de Escalas.
  // blank=true (modo quiz): sin nombres de nota, sin colorear la fundamental, sin insignia de dedo.
  function renderTriadSVG(shape, stringIdxs, rootPc, blank){
    const svgShape = triadShapeToSvgFormat(shape, stringIdxs, rootPc);
    const W = 160, H = 190;
    const nStrings = 6;
    const marginX = 24, marginTop = 34, marginBottom = 22;
    const gridW = W - marginX * 2;
    const gridH = H - marginTop - marginBottom;
    const span = svgShape.maxFret - svgShape.minFret;
    const fretsShown = Math.max(4, span + 2);
    const stepX = gridW / (nStrings - 1);
    const stepY = gridH / fretsShown;
    const order = state.lefty ? [5,4,3,2,1,0] : [0,1,2,3,4,5];
    const xAt = col => marginX + col * stepX;
    const isOpenPosition = svgShape.minFret === 0;
    const fretBase = isOpenPosition ? 0 : svgShape.minFret;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
    svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="none"/>`;

    if (isOpenPosition) {
      svg += `<rect x="${marginX}" y="${marginTop-3}" width="${gridW}" height="4" fill="var(--bone,#ede4d3)"/>`;
    } else {
      svg += `<line x1="${marginX}" y1="${marginTop}" x2="${marginX+gridW}" y2="${marginTop}" stroke="#9aa0a8" stroke-width="1.5"/>`;
      svg += `<text x="${marginX+gridW+4}" y="${marginTop+10}" font-size="11" fill="#9aa0a8" font-family="Oswald, sans-serif">${fretBase}fr</text>`;
    }

    for (let f = 1; f <= fretsShown; f++) {
      const y = marginTop + f * stepY;
      svg += `<line x1="${marginX}" y1="${y}" x2="${marginX+gridW}" y2="${y}" stroke="#4a5561" stroke-width="1"/>`;
    }
    for (let c = 0; c < nStrings; c++) {
      const x = xAt(c);
      svg += `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop+gridH}" stroke="#4a5561" stroke-width="1"/>`;
    }

    order.forEach((origIdx, col) => {
      const s = svgShape.strings[origIdx];
      const x = xAt(col);
      if (s.mute) {
        svg += `<text x="${x}" y="${marginTop-10}" font-size="13" fill="#9aa0a8" text-anchor="middle" font-family="'Inter', sans-serif">✕</text>`;
        return;
      }
      const color = blank ? '#8792AC' : (s.isRoot ? 'var(--accent-root,#FF6B6B)' : NOTE_COLORS[s.pc]);
      const label = blank ? '' : DISPLAY[s.pc];
      if (s.fret === 0 && isOpenPosition) {
        svg += `<circle cx="${x}" cy="${marginTop-10}" r="8" fill="none" stroke="${color}" stroke-width="2"/>`;
        if (!blank) svg += `<text x="${x}" y="${marginTop-7}" font-size="8" font-weight="700" fill="${color}" text-anchor="middle" font-family="'Inter', sans-serif">${label}</text>`;
      } else {
        const rowIdx = isOpenPosition ? (s.fret - fretBase - 1) : (s.fret - fretBase);
        const y = marginTop + (rowIdx + 0.5) * stepY;
        svg += `<circle cx="${x}" cy="${y}" r="11" fill="${color}"/>`;
        if (!blank) {
          svg += `<text x="${x}" y="${y+4}" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" font-family="'Inter', sans-serif">${label}</text>`;
          svg += `<circle cx="${x+9}" cy="${y+8}" r="6.5" fill="var(--panel,#141B2E)" stroke="#fff" stroke-width="1"/>`;
          svg += `<text x="${x+9}" y="${y+10.5}" font-size="8" font-weight="700" fill="#fff" text-anchor="middle" font-family="'Inter', sans-serif">${s.finger}</text>`;
        }
      }
    });

    svg += `</svg>`;
    return svg;
  }

  // diagrama SVG de la tríada arpegiada en una sola cuerda: línea de cuerda horizontal con marcas
  // de traste y las notas encima. Consciente de zurdos: el traste 0 (clavijero) va a la derecha
  // en modo zurdo, igual que el resto del mástil de la app.
  function renderTriadSingleStringSVG(positions, stringIdx, rootPc){
    const maxFret = 15;
    const W = 640, H = 84;
    const marginL = 34, marginR = 18;
    const gridW = W - marginL - marginR;
    const stepX = gridW / maxFret;
    const stringY = 34;
    const fretX = f => state.lefty ? (marginL + (maxFret - f) * stepX) : (marginL + f * stepX);

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
    svg += `<text x="4" y="${stringY+4}" font-size="12" font-weight="700" fill="#8792AC" font-family="Oswald, sans-serif">${STRING_ORDINALS[stringIdx]}</text>`;
    svg += `<line x1="${marginL}" y1="${stringY}" x2="${marginL+gridW}" y2="${stringY}" stroke="#9aa0a8" stroke-width="2"/>`;
    for (let f = 0; f <= maxFret; f++) {
      const x = fretX(f);
      svg += `<line x1="${x}" y1="${stringY-7}" x2="${x}" y2="${stringY+7}" stroke="#4a5561" stroke-width="1"/>`;
      svg += `<text x="${x}" y="${stringY+24}" font-size="9" fill="#8792AC" text-anchor="middle" font-family="Oswald, sans-serif">${f}</text>`;
    }
    positions.forEach(pos => {
      const x = fretX(pos.fret);
      const isRoot = pos.pc === rootPc;
      const color = isRoot ? 'var(--accent-root,#FF6B6B)' : NOTE_COLORS[pos.pc];
      svg += `<circle cx="${x}" cy="${stringY}" r="11" fill="${color}"/>`;
      svg += `<text x="${x}" y="${stringY+4}" font-size="10" font-weight="700" fill="#fff" text-anchor="middle" font-family="'Inter', sans-serif">${DISPLAY[pos.pc]}</text>`;
    });
    svg += `</svg>`;
    return svg;
  }

  // ---------- "TOCA / IMPROVISA ENCIMA" (tipo backing track de YouTube) ----------
  // sugerencia de UNA escala para improvisar sobre TODA la progresión en bucle, no acorde a
  // acorde. Para progresiones diatónicas normales: la escala de la tónica en su contexto
  // (mayor/menor). Para las formas estándar, cada una tiene su propia lógica verificada:
  // - Blues: pentatónica/blues menor de la tónica (funciona aunque los acordes sean dominante 7)
  // - Rhythm Changes: escala mayor de la tónica para las secciones A (el puente idealmente
  //   pide mixolidio por acorde, se avisa de la simplificación)
  // - Cadencia Andaluza: el centro tonal real es el ACORDE V FINAL (el "modo de Mi" flamenco),
  //   no la tónica que construye la cadencia — por eso se recalcula la raíz sumando 7 semitonos.
  function getJamSuggestion(){
    if (state.activeForm === 'blues12') {
      return { rootPc: state.root, scaleKey: 'pent_menor', altScaleKey: 'blues',
        note: 'Sobre un blues, la pentatónica/blues menor de la tónica funciona casi siempre, aunque los acordes sean de dominante 7ª — es la base de todo el vocabulario del blues.' };
    }
    if (state.activeForm === 'rhythmChanges') {
      return { rootPc: state.root, scaleKey: 'jonico', altScaleKey: 'pent_mayor',
        note: 'Funciona bien en las secciones A. En el puente (8 compases centrales), cada acorde de dominante pide idealmente su propio Mixolidio para sonar "dentro" — aquí se simplifica con una sola escala para todo el tema.' };
    }
    if (state.activeForm === 'andaluza') {
      const vRootPc = (state.root + 7) % 12;
      return { rootPc: vRootPc, scaleKey: 'flamenco', altScaleKey: 'frigio',
        note: 'El "modo de Mi" flamenco: el centro tonal real de la cadencia es el acorde V final (aquí ' + DISPLAY[vRootPc] + '), no la tónica que la construye.' };
    }
    if (state.progKey === 'mayor') {
      return { rootPc: state.root, scaleKey: 'jonico', altScaleKey: 'pent_mayor',
        note: 'Truco de rock/blues-rock: la pentatónica MENOR de esa misma tónica (' + DISPLAY[state.root] + ') también funciona muy bien encima, aunque los acordes sean mayores — es el sonido "rock and roll" clásico (Chuck Berry, AC/DC, etc.).' };
    }
    return { rootPc: state.root, scaleKey: 'eolico', altScaleKey: 'pent_menor', note: null };
  }

  function renderJamSummary(){
    const box = $('#jamSummary');
    const hasContent = !!state.activeForm || state.progression.length > 0;
    if (!hasContent) { box.style.display = 'none'; return; }
    const sug = getJamSuggestion();
    const scaleName = SCALES[sug.scaleKey].name;
    const altName = SCALES[sug.altScaleKey].name;
    box.innerHTML = `
      <div class="jam-summary-text">
        <div class="jam-summary-title">🎧 Toca / improvisa encima (tipo backing track)</div>
        <div class="jam-summary-main">Prueba <b>${DISPLAY[sug.rootPc]} ${scaleName}</b></div>
        <div class="jam-summary-alt">También funciona: ${DISPLAY[sug.rootPc]} ${altName}</div>
        ${sug.note ? `<div class="jam-summary-note">${sug.note}</div>` : ''}
      </div>
      <button class="jam-summary-btn" id="jamGoBtn">Ver en Escalas</button>`;
    $('#jamGoBtn').addEventListener('click', () => {
      state.root = sug.rootPc;
      state.scaleKey = sug.scaleKey;
      state.tab = 'escalas';
      render();
    });
  }

  // obtiene la lista de acordes actual, sea de una progresión manual (grados) o de una forma
  // estándar activa (blues12, rhythm changes, cadencia andaluza) — antes la línea de bajo walking
  // solo funcionaba con progresión manual, y con una forma activa se quedaba vacía sin avisar.
  function getWalkingBassChordList(){
    if (state.activeForm) {
      return FORM_TEMPLATES[state.activeForm].build(state.root)
        .map(c => ({ chordRootPc: c.rootPc, qualityKey: c.qualityKey }));
    }
    if (state.progression.length > 0) {
      return state.progression.map(d => degreeChordInfo(d, state.progKey, state.root));
    }
    return [];
  }

  function buildWalkingBassLine(){
    const chords = getWalkingBassChordList();
    if (chords.length === 0) return [];
    let refMidi = OPEN_MIDI.bajo[0] + 5; // arranque cómodo, ni muy grave ni muy agudo
    const line = [];
    chords.forEach((chord, i) => {
      const next = chords[(i + 1) % chords.length];
      const [b1, b2, b3] = walkingBeatTones(chord.qualityKey).map(iv => (chord.chordRootPc + iv) % 12);
      const approachPc = (next.chordRootPc - 1 + 12) % 12;
      [b1, b2, b3, approachPc].forEach((targetPc, beat) => {
        const note = findClosestBassNote(targetPc, refMidi);
        if (!note) return;
        line.push({ sIdx: note.sIdx, fret: note.fret, pc: note.pc, midi: note.midi, accent: beat === 0 });
        refMidi = note.midi;
      });
    });
    return line;
  }

  // patrón raíz-quinta ("boom-chick"): el patrón de bajo más simple y común, previo al walking —
  // alterna la fundamental y la 5ª del acorde, una por tiempo.
  function buildRootFifthBassLine(){
    const chords = getWalkingBassChordList();
    if (chords.length === 0) return [];
    let refMidi = OPEN_MIDI.bajo[0] + 5;
    const line = [];
    chords.forEach(chord => {
      const rootPc = chord.chordRootPc;
      const fifthPc = (rootPc + 7) % 12;
      [rootPc, fifthPc, rootPc, fifthPc].forEach((targetPc, beat) => {
        const note = findClosestBassNote(targetPc, refMidi);
        if (!note) return;
        line.push({ sIdx: note.sIdx, fret: note.fret, pc: note.pc, midi: note.midi, accent: beat === 0 });
        refMidi = note.midi;
      });
    });
    return line;
  }

  // patrón de octavas: alterna la fundamental grave y la misma nota una octava más aguda —
  // patrón muy usado en rock/pop, y un buen paso intermedio antes del walking bass.
  function buildRootOctaveBassLine(){
    const chords = getWalkingBassChordList();
    if (chords.length === 0) return [];
    let refMidi = OPEN_MIDI.bajo[0] + 5;
    const line = [];
    chords.forEach(chord => {
      const rootPc = chord.chordRootPc;
      const low = findBassNoteWideRange(rootPc, refMidi, WALKING_SEARCH_MAX_FRET);
      if (!low) return;
      const high = findBassNoteWideRange(rootPc, low.midi + 12, 15) || low;
      [low, high, low, high].forEach((note, beat) => {
        line.push({ sIdx: note.sIdx, fret: note.fret, pc: note.pc, midi: note.midi, accent: beat === 0 });
      });
      refMidi = low.midi;
    });
    return line;
  }

  // elige qué constructor de línea de bajo usar según el patrón seleccionado — se llama desde
  // los mismos sitios que antes llamaban solo a buildWalkingBassLine, así no hace falta tocar
  // cada punto de uso por separado.
  function buildBassLine(){
    if (state.bassPattern === 'raiz5') return buildRootFifthBassLine();
    if (state.bassPattern === 'octavas') return buildRootOctaveBassLine();
    return buildWalkingBassLine();
  }

  // dibuja el diagrama SVG del acorde. Diestro: columnas 6ª cuerda (grave) -> 1ª (aguda), izq->der,
  // igual que un diagrama de acorde estándar. Zurdo: se invierte (1ª cuerda a la izquierda, 6ª a la
  // derecha) — el espejo real de cómo se ve el diagrama en una guitarra de zurdo.
  function renderChordSVG(shape){
    const W = 160, H = 190;
    const nStrings = 6;
    const marginX = 24, marginTop = 34, marginBottom = 22;
    const gridW = W - marginX * 2;
    const gridH = H - marginTop - marginBottom;
    const fretsShown = 4;
    const stepX = gridW / (nStrings - 1);
    const stepY = gridH / fretsShown;

    const order = state.lefty ? [5,4,3,2,1,0] : [0,1,2,3,4,5];
    const xAt = col => marginX + col * stepX;
    const isOpenPosition = shape.baseFret === 0;
    // trastes representados en la rejilla: si es posición abierta, 1..4; si no, baseFret..baseFret+3
    const fretBase = isOpenPosition ? 0 : shape.baseFret;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
    svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="none"/>`;

    // cejilla / nut
    if (isOpenPosition) {
      svg += `<rect x="${marginX}" y="${marginTop-3}" width="${gridW}" height="4" fill="var(--bone,#ede4d3)"/>`;
    } else {
      svg += `<line x1="${marginX}" y1="${marginTop}" x2="${marginX+gridW}" y2="${marginTop}" stroke="#9aa0a8" stroke-width="1.5"/>`;
      svg += `<text x="${marginX+gridW+4}" y="${marginTop+10}" font-size="11" fill="#9aa0a8" font-family="Oswald, sans-serif">${fretBase}fr</text>`;
    }

    // lineas de traste horizontales
    for (let f = 1; f <= fretsShown; f++) {
      const y = marginTop + f * stepY;
      svg += `<line x1="${marginX}" y1="${y}" x2="${marginX+gridW}" y2="${y}" stroke="#4a5561" stroke-width="1"/>`;
    }
    // lineas de cuerda verticales
    for (let c = 0; c < nStrings; c++) {
      const x = xAt(c);
      svg += `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop+gridH}" stroke="#4a5561" stroke-width="1"/>`;
    }

    // barra (cejilla): solo cuerdas realmente traste-adas (nunca al aire) con dedo 1 en el mismo traste
    const fingerOnes = shape.strings.map((s,i)=>({s,i})).filter(o => !o.s.mute && o.s.finger === 1 && o.s.fret > 0);
    let barreCoveredIdx = new Set();
    if (fingerOnes.length >= 2) {
      const targetFret = fingerOnes[0].s.fret;
      const sameFret = fingerOnes.filter(o => o.s.fret === targetFret);
      if (sameFret.length >= 2) {
        const idxs = sameFret.map(o => order.indexOf(o.i));
        const c1 = Math.min(...idxs), c2 = Math.max(...idxs);
        const rowIdx = isOpenPosition ? (targetFret - fretBase - 1) : (targetFret - fretBase);
        const y = marginTop + (rowIdx + 0.5) * stepY;
        svg += `<line x1="${xAt(c1)}" y1="${y}" x2="${xAt(c2)}" y2="${y}" stroke="#FFB020" stroke-width="10" stroke-linecap="round" opacity="0.85"/>`;
        sameFret.forEach(o => barreCoveredIdx.add(o.i));
      }
    }

    // X / O encima de la cejilla, puntos de traste y numero de dedo
    order.forEach((origIdx, col) => {
      const s = shape.strings[origIdx];
      const x = xAt(col);
      if (s.mute) {
        svg += `<text x="${x}" y="${marginTop-10}" font-size="13" fill="#9aa0a8" text-anchor="middle" font-family="'Inter', sans-serif">✕</text>`;
      } else if (s.fret === 0 && isOpenPosition) {
        svg += `<circle cx="${x}" cy="${marginTop-10}" r="4.5" fill="none" stroke="#f3ece0" stroke-width="1.5"/>`;
      } else if (barreCoveredIdx.has(origIdx)) {
        // ya representada por la barra de cejilla, no se repite el punto individual
      } else {
        // fila 0-indexada: en posición abierta la fila 0 es el traste 1 (el 0 se dibuja como "O" arriba);
        // en cejilla la fila 0 es el propio traste de la cejilla (donde se dibuja la barra).
        const rowIdx = isOpenPosition ? (s.fret - fretBase - 1) : (s.fret - fretBase);
        const y = marginTop + (rowIdx + 0.5) * stepY;
        svg += `<circle cx="${x}" cy="${y}" r="9" fill="#FFB020"/>`;
        svg += `<text x="${x}" y="${y+4}" font-size="10.5" font-weight="700" fill="#241300" text-anchor="middle" font-family="'Inter', sans-serif">${s.finger}</text>`;
      }
    });

    svg += `</svg>`;
    return svg;
  }
  const state = {
    tab: 'escalas', // 'escalas' | 'estilos'
    style: 'blues',
    styleZone: null,   // caja elegida para los riffs de estilo (independiente de la zona de Escalas)
    styleVariant: 0,   // qué variante del riff de este estilo se usa
    chordQuality: 'major', // calidad de acorde seleccionada en la pestaña Acordes
    extBuild: { root: 0, base: 'major', step: 'triad' },
    seventhHarmonyKey: 'mayor',
    reverseAnalysis: { chords: [], build: { root: 0, quality: 'major' }, bestKey: null },
    acordesMode: 'individual', // 'individual' | 'progresion'
    progKey: 'mayor', // 'mayor' | 'menor'
    progression: [], // secuencia de grados (0-6) construida por el usuario
    progShapes: [], // formas ya construidas de cada acorde de la progresión, en el mismo orden
    progViewMode: 'acordes', // 'acordes' | 'bajo' (línea de bajo sobre la progresión)
    bassPattern: 'walking', // 'walking' | 'raiz5' | 'octavas'
    cagedView: 'single', // 'single' | 'caged' (5 posiciones CAGED del acorde individual)
    progPlaying: false,
    currentChord: null,
    instrument: 'guitarra',
    scaleKey: 'pent_mayor',
    root: 4, // índice de clase de nota (4 = Mi), no letra, para no mezclar ortografías
    lefty: true,
    zoneMode: 'manual', // 'manual' (ZONES fijas) | 'auto' (cajas movibles según tónica)
    zone: 'full',
    pattern: 'updown',
    playing: false,
    chromatic: false,
    threeNPS: false,   // modo "3 notas por cuerda", solo para escalas de 7 notas
    npsPattern: null,  // patrón elegido (id), null = el primero disponible
    chromaticStartFret: 1, // traste de inicio del ejercicio cromático 1-2-3-4
    tecnicaExercise: 'arana', // 'arana' | 'arana_inv' | 'zigzag' | 'barrido' | 'salto'
    powerChord: { root: 4, stringIdx: 0, withOctave: true }, // Mi por defecto, cuerda grave
    lickTech: { type: 'ligado', stringIdx: 0, startFret: 0 },
    speedTrainer: false,   // entrenador de velocidad: sube el bpm cada vuelta completa
    speedIncrement: 5,      // cuánto sube el bpm por vuelta
    pickingMode: 'off',     // 'off' | 'alternate' | 'economy' — patrón de púa sobre Escalas/Técnica
    sequenceMode: 'off',    // 'off' | 'groups3' | 'groups4' | 'thirds' — secuencia de calentamiento por todo el mástil
    capo: 0,                // traste de la cejilla (0 = sin cejilla)
    activeForm: null,       // 'blues12' | 'rhythmChanges' | 'andaluza' | null (progresión manual)
    pianoClefView: 'both',  // 'both' | 'treble' | 'bass'
    pianoMode: 'note',      // 'note' | 'chord'
    pianoChordRoot: 0,
    pianoChordOctave: 3,
    pianoChordQuality: 'major',
    pianoVoicing: 'closed', // 'closed' | 'rootlessA' | 'rootlessB'
    pianoScale: { root: 0, octave: 4 },
    drumMachine: { active: false, playing: false, style: 'rock', volume: 0.75, fillEnabled: false, pattern: null, humanize: false, speedFeel: 'normal',
      muted: { crash:false, hihatOpen:false, hihatClosed:false, clap:false, snare:false, kick:false },
      fx: { reverb:0, chorus:0, delay:0 } },
    pianoLooper: { active:false, volume:0.5, chords:[], pattern:'pad', timbre:'triangle', presetTonality:'major', build:{ root:0, quality:'major', octave:3, bars:1 } },
    bassLooper: { active:false, volume:0.6, pattern:'raiz5', octave:1 }, // usa los MISMOS acordes que pianoLooper.chords — no duplica la progresión
    lickMode: 'house', // 'house' | 'box' — pestaña Licks
    lickId: 0,
    voiceQuiz: { rangeLow: 55, rangeHigh: 72, calibrated: false, targetMidi: null, score: 0, streak: 0, toleranceCents: 25, calibStep: null },
    namAmp: { mode:'none', modelName:null, jsonText:null }, // 'none'|'on' — un único slot, se rellena con cualquier .nam elegido del dispositivo
    oido: { mode:'intervalo', playback:'melodic', target:null, guess:null, score:0, attempts:0 },
    triad: { root: 0, quality: 'major', inversion: 0, mode: 'vertical', stringSetIdx: 0,
             tonality: 'major', progressionIdx: null, progShapes: [], mapShapes: [], zoneIdx: 0, singleStringIdx: 0,
             voiceLeading: false },
    triadQuiz: { active: false, score: 0, attempts: 0, target: null, guessRoot: null, guessQuality: null, guessInversion: null },
    bpm: 100,
    metronome: { active: false, timeSignature: '4/4', subdivision: 1, swing: 0, compasActive: false, compasPalo: 'solea' },
    quiz: { active: false, target: null, locked: false, score: 0, attempts: 0 }
  };

  const $ = sel => document.querySelector(sel);

  // ---------- FRETTEACHER: base de conocimiento local (sin IA, sin clave de API) ----------
  // cada entrada: keywords para la búsqueda por palabras clave, y opcionalmente una acción que
  // configura la app por el usuario (cambia de pestaña, elige tónica/escala, etc.)
  const FRETTEACHER_KB = [
    {
      id: 'guia-escalas-0', featured: true,
      title: '🎯 Guíame con escalas hoy (nivel 0)',
      keywords: ['escala','escalas','practicar escala','guia escala','nivel 0','empezar escala','como estudio escalas'],
      answer: `Vamos paso a paso, sin prisa. El objetivo de hoy no es tocar rápido — es que tu mano aprenda DÓNDE está cada nota.

1) Elige Do mayor. Es la escala más fácil para empezar: no tiene sostenidos ni bemoles, así que puedes centrarte solo en la digitación. Ve a la pestaña "Escalas", tónica "C", modo "Jónico" (así se llama la escala mayor dentro del sistema de modos).

2) Baja el tempo a 60 BPM o menos. Ir despacio al principio es lo que hace que luego puedas ir rápido.

3) Toca la escala completa subiendo y bajando, mirando el mástil, diciendo en voz alta el nombre de cada nota mientras la tocas (Do, Re, Mi, Fa...). Repite 5 veces.

4) Ahora fíjate en los números de dedo que sugiere la app bajo cada nota. Tócala otra vez prestando atención solo a los dedos, sin mirar los nombres.

5) Cuando lo sientas cómodo (puede que hoy, puede que en varias sesiones), prueba el modo Quiz de la pestaña Escalas: te pone una nota al azar y tienes que identificarla. Es la forma de comprobar si de verdad te la sabes, no solo si la memorizaste de un vistazo.

Consejo: no hace falta dominar los 7 modos de golpe. Con la escala mayor (Jónico) y la menor natural (Eólico) tienes de sobra para empezar a tocar canciones reales.`,
      action: { label: 'Llévame a Escalas (Do mayor)', apply: () => { state.tab = 'escalas'; state.root = 0; state.scaleKey = 'jonico'; render(); } }
    },
    {
      id: 'guia-triadas-0', featured: true,
      title: '🎯 Guíame con tríadas hoy (nivel 0)',
      keywords: ['triada','triadas','tríada','tríadas','practicar triada','nivel 0','empezar triada'],
      answer: `Una tríada es el acorde más pequeño que existe: solo 3 notas (fundamental, 3ª y 5ª). Aprenderlas bien es la base de todo lo demás — acordes con séptima, progresiones, improvisación.

1) Ve a la pestaña "Tríadas", elige tónica "C" (Do), calidad "Mayor", inversión "Fundamental", disposición "Vertical".

2) Verás un diagrama con 3 cuerdas activas (las otras 3 aparecen con ✕, no se tocan) y un número de dedo en cada una. Coloca los dedos exactamente como indica y rasguea solo esas 3 cuerdas.

3) Toca esa forma 10 veces seguidas, sin prisa, asegurándote de que las 3 notas suenan limpias.

4) Cambia la Inversión a "1ª inversión" y luego "2ª inversión" — es la MISMA tríada, pero empezando por una nota distinta. Tócalas las 3 seguidas y escucha cómo cambia el color del acorde aunque sean las mismas 3 notas.

5) Abre "Mapa del mástil" — te enseña las 4 posiciones distintas donde se puede tocar esta misma tríada a lo largo del mástil. Tócalas de la más grave a la más aguda.

Consejo: no hace falta aprenderte las 4 posiciones de golpe. Con la fundamental en posición vertical ya puedes acompañar canciones sencillas — las demás son para cuando quieras más recorrido por el mástil.`,
      action: { label: 'Llévame a Tríadas (Do mayor)', apply: () => { state.tab = 'triadas'; state.triad.root = 0; state.triad.quality = 'major'; state.triad.inversion = 0; state.triad.mode = 'vertical'; render(); } }
    },
    {
      id: 'guia-acordes-progresiones', featured: true,
      title: '🎯 Qué acordes aprendo y sus progresiones',
      keywords: ['acordes','progresion','progresiones','que acordes aprender','primeros acordes','cambios de acorde'],
      answer: `Si vienes de cero, este es el orden que más rinde:

Primeros 5 acordes (los "acordes abiertos" clásicos):
  Do mayor, Sol mayor, Re mayor, Mi menor, La menor
  → Con estos 5 puedes tocar cientos de canciones reales.

Primera progresión para practicar cambios:
  I - IV - V  (en Do mayor: Do - Fa - Sol)
  → Es la base del blues, del rock clásico y de la música folk.

Segunda progresión (muy usada en pop):
  I - vi - IV - V  (en Do mayor: Do - La menor - Fa - Sol)
  → Se la conoce como "la progresión de los 50" — está en cientos de canciones.

Cómo practicarlas en la app:
  Ve a "Acordes" → modo "Progresión" → elige la tonalidad → toca los grados en el orden que quieras (I, IV, V...) y pulsa reproducir para escuchar cómo suenan encadenados antes de tocarlos tú.

Consejo: no memorices acordes sueltos, memoriza CAMBIOS entre dos acordes. Practica pasar de Do a Sol una y otra vez hasta que tu mano lo haga sin pensar, luego añade el siguiente cambio.`,
      action: { label: 'Llévame a Acordes (progresión)', apply: () => { state.tab = 'acordes'; state.acordesMode = 'progresion'; render(); } }
    },
    { id: 'uso-pestanas', title: '¿Qué hace cada pestaña?',
      keywords: ['pestañas','pestaña','secciones','que hace cada','navegar','tabs'],
      answer: `Escalas: mástil con todas las escalas y modos, con quiz de notas.
Estilos: riffs de ejemplo en distintos géneros (blues, flamenco, rock...).
Acordes: acordes CAGED individuales o progresiones (por grados o formas como el blues de 12 compases), con línea de bajo (walking, raíz-quinta u octavas).
Mástil: vista de referencia libre de todo el diapasón.
Técnica: arpegios, picking alterno/económico, power chords, y técnicas de mástil (ligados, deslizamiento, bending).
Piano: teclado de 6 octavas — notas, acordes (con voicings rootless de jazz), o escalas con digitación de dedos.
Tríadas: teoría, digitaciones, armonía por grados, mapa del mástil y quiz.
Oído: entrenamiento auditivo — identificar intervalos y calidad de acorde (mayor/menor/aumentada/disminuida) solo escuchando.
Encima de todo: la Caja de Ritmos & Looper, siempre accesible, con batería (silenciable por instrumento), looper de piano, looper de bajo y efectos (reverb/chorus/delay).` },
    { id: 'uso-oido', title: '¿Cómo uso la pestaña Oído?',
      keywords: ['oido','entrenamiento auditivo','intervalos','reconocer acorde','identificar de oido'],
      answer: `Tiene 2 modos. Intervalos: suenan 2 notas (elige si melódico, una tras otra, o armónico, juntas — el armónico es más difícil) y adivinas la distancia entre ellas entre 12 opciones. Calidad de acorde: suena una tríada completa y adivinas si es Mayor, Menor, Aumentada o Disminuida, solo de oído. Lleva marcador de aciertos y botón para repetir el sonido.` },
    { id: 'uso-power-chords', title: '¿Qué son los power chords y cómo los uso?',
      keywords: ['power chord','power chords','acorde de 5a','acordes de quinta'],
      answer: `En Técnica, despliega "Power chords". Son acordes de solo 2 notas (fundamental y 5ª, sin tercera) — la base del rock, punk y metal. Elige tónica y cuerda de partida (6ª o 5ª normalmente), y opcionalmente añade una 3ª nota con "+ Octava". Es una forma movible: la misma digitación sirve en cualquier traste.` },
    { id: 'uso-tecnicas-mastil', title: '¿Qué son ligados, deslizamiento y bending?',
      keywords: ['ligados','hammer-on','pull-off','deslizamiento','slide','bending','bend'],
      answer: `En Técnica, despliega "Técnicas de mástil". Ligados: pulsas la cuerda una sola vez y martilleas o tiras con los dedos para que sigan sonando notas sin volver a pulsar. Deslizamiento: pulsas y deslizas el dedo al siguiente traste sin soltar la presión. Bending: subes la altura de la nota empujando la cuerda, sin cambiar de traste. Elige cuerda y traste de inicio, y pulsa "Escuchar" para oír una simulación de cada una.` },
    { id: 'uso-patrones-bajo', title: '¿Qué patrones de línea de bajo hay además del walking?',
      keywords: ['patron de bajo','raiz quinta','octavas bajo','patron raiz-quinta'],
      answer: `En Acordes → Progresión → vista "Línea de bajo", hay un selector "Patrón" con 3 opciones. Raíz-Quinta: alterna la fundamental y la 5ª de cada acorde (el patrón más simple, bueno para empezar). Octavas: alterna la fundamental grave y la misma nota una octava más aguda. Walking: la línea con notas de aproximación cromática, más avanzada. Los 3 usan la misma progresión que hayas construido. (Esto es distinto del looper de bajo automático de la Caja de Ritmos — ver esa pregunta aparte.)` },
    { id: 'uso-bajo-looper', title: '¿Cómo funciona la línea de bajo del looper en la Caja de Ritmos?',
      keywords: ['bajo looper','linea de bajo caja de ritmos','bajo automatico','practicar con bajo y bateria','walking bajo looper'],
      answer: `Dentro de "🥁 Caja de Ritmos & Looper", debajo del Looper de piano, hay una fila "🎸 Línea de bajo (looper)". No escribes acordes aparte: toca sobre la MISMA lista que hayas puesto en el Looper de piano justo arriba. Actívala con su propio botón, elige patrón (Raíz sostenida, Raíz-Quinta, Octavas o Walking) y registro (Grave/Medio). Con batería + este bajo + el looper de piano sonando a la vez, tienes una base completa para practicar guitarra encima — y todo pasa por el mismo EQ (reverb/chorus/delay) del conjunto.` },
    { id: 'uso-ampli-nam', title: '¿Qué es el "Ampli (NAM)" del EQ y cómo lo uso?',
      keywords: ['nam','ampli','neural amp modeler','clean','distorsion','distorsión','sonido real','ampli real','tone3000'],
      answer: `Dentro de "🎛️ EQ · efectos del conjunto" hay un botón "📁 Cargar .nam" y un selector "Sin ampli / Con ampli NAM". Usa una tecnología llamada Neural Amp Modeler — una captura de un ampli real (no un filtro genérico) que colorea el sonido de forma mucho más realista. Elige cualquier archivo .nam de tu dispositivo (descárgalo de tone3000.com) — no hay modelos predefinidos ni nada que subir a la web, se carga localmente en tu navegador y se activa al momento. Afecta a las notas que toques en Escalas/Mástil/Técnica y a la línea de bajo del looper (no a la batería ni al looper de piano). "Sin ampli" vuelve al sonido normal sin tener que recargar nada; para cambiar de captura, vuelve a pulsar "Cargar .nam" y elige otra.` },
    { id: 'uso-licks', title: '¿Qué es la pestaña Licks y cómo la uso?',
      keywords: ['licks','house pattern','bb box','solos','practicar solos','frases','pentatonica'],
      answer: `La pestaña Licks tiene frases cortas (originales, no copiadas de ningún curso) para practicar improvisación de solos, no solo subir y bajar la escala. Tres modos: "🏠 House Pattern (BB Box)" — patrón clásico del blues en 2 cuerdas agudas — "Caja pentatónica" — usa la Zona del mástil elegida arriba — y "🎵 Transcrito de audio" — licks sacados de audios reales que el usuario sube, con detección automática de tono. Elige un lick de la lista, y lo ves en el mástil animado y en tablatura (debajo). Muévete de tónica como en cualquier otra pestaña — los licks se recalculan solos para la nueva tónica, incluidos los transcritos de audio.` },
    { id: 'uso-transcripcion-audio', title: '¿Puedo subir un audio para que se convierta en lick?',
      keywords: ['transcribir','audio','looperman','wav','transcripcion','subir loop','detectar notas'],
      answer: `Sí — sube un WAV/MP3 de un loop de guitarra (Looperman, muestras propias, etc.) y se analiza por detección de tono automática (autocorrelación), sin depender de ningún servicio externo. Funciona mejor con líneas monofónicas limpias (una nota a la vez, sin acordes ni mucha distorsión) — cuanta más info tenga el nombre del archivo o tú me des sobre la tonalidad y el BPM, más fiable sale la transcripción. El resultado se muestra siempre para que lo compruebes contra el audio original antes de darlo por bueno — la detección automática puede fallar en algún punto puntual, sobre todo con bends, acordes o mucha distorsión.` },
    { id: 'uso-voz', title: '¿Cómo funciona la pestaña Voz (entrenamiento de entonación)?',
      keywords: ['voz','entonacion','cantar','afinacion','microfono','oido','pitch','calibracion vocal'],
      answer: `La pestaña Voz usa el micrófono de tu dispositivo (pide permiso la primera vez) para entrenar entonación cantada. Primero hay una calibración opcional: cantas tu nota más grave y más aguda cómodas, para que la app no te pida notas fuera de tu registro — si la saltas, usa un rango medio por defecto. Luego, en el modo Quiz: pulsa "Escuchar nota" para oír la nota objetivo, "Cantar" para que el micrófono empiece a escuchar, y un medidor tipo afinador te dice en tiempo real si vas alto, bajo o afinado (en cents, no solo en Hz). Sostener la nota afinada un momento cuenta como acierto y pasa a la siguiente nota sola. No se graba ni se sube nada — todo el procesamiento de audio ocurre en tu propio navegador.` },
    { id: 'uso-backing-track-youtube', title: '¿Cómo practico con un backing track de YouTube?',
      keywords: ['backing track','youtube','video de youtube','practicar con video','que escala usar con backing track','tonalidad del video'],
      answer: `Dentro del panel de FretTeacher (🎓, abajo a la derecha) hay una caja específica: "🎯 O pega el título de un backing track de YouTube...". Pega ahí el título completo del vídeo (cuantos más datos, mejor: título + lo que ponga la descripción) y pulsa Analizar. Si detecta la tonalidad (busca patrones como "A Minor" o una lista de acordes tipo "Am-F-C-G"), te muestra la tónica, el modo, el relativo, y dos botones: uno para ir a Escalas con la Pentatónica correspondiente y otro con la escala completa. Si no detecta nada claro, te deja elegir tónica y modo a mano con un par de botones y te lleva igual. Esto es un analizador de patrones de texto, no entiende el vídeo ni lo escucha — si el título no sigue un formato reconocible, usa el selector manual que aparece debajo.
La app no se sincroniza con el vídeo (son dos reproductores independientes): pon el vídeo sonando aparte y toca por encima con la escala que te indique.` },
    { id: 'uso-piano-escala', title: '¿Cómo veo la digitación de una escala en el piano?',
      keywords: ['digitacion piano','dedos piano','digitacion de escalas'],
      answer: `En Piano, elige el modo "Escala", tónica y octava. Se muestran los números de dedo (mano derecha) directamente sobre las teclas del teclado. Solo está verificada para Do, Sol, Re, La, Mi y Fa mayor — para el resto de tonalidades se ve la escala pero sin digitación, para no arriesgarme a enseñar algo mal.` },
    { id: 'uso-piano-rootless', title: '¿Qué son los voicings rootless del piano?',
      keywords: ['rootless','voicing','voicings','acorde sin fundamental'],
      answer: `En Piano → modo Acorde, con una calidad de séptima (maj7, min7 o dom7) aparece un selector "Voicing". Cerrado es el acorde normal. Rootless tipo A (3-5-7-9) y tipo B (7-9-3-5) son voicings de jazz que omiten la fundamental — se usan en la mano izquierda cuando otro instrumento (el bajo) ya la está tocando, para no duplicarla y sonar más "abierto".` },
    { id: 'uso-caja-ritmos-avanzado', title: '¿Qué más puedo hacer en la Caja de Ritmos además de elegir un estilo?',
      keywords: ['silenciar instrumento','silencio','mute','instrumento','bateria','eq','reverb','chorus','delay','looper de piano'],
      answer: `Cada fila de instrumento tiene un botón 🔊/🔇 para silenciarlo sin borrar lo que tenías programado. El "Looper de piano" te deja construir un bucle de acordes (con patrón Pad, Negras o Primer tiempo) sincronizado con el ritmo — o cargar una progresión típica ya hecha (I-IV-V, I-vi-IV-V...) con un botón, sin añadir los acordes a mano. También tiene un selector de sonido (Suave/Puro/Brillante). Debajo, la "Línea de bajo (looper)" toca automáticamente sobre la MISMA lista de acordes del looper de piano (no hace falta escribirla dos veces), con 4 patrones: Raíz sostenida, Raíz-Quinta, Octavas y Walking. Y "EQ · efectos del conjunto" tiene 3 mandos (Reverb, Chorus, Delay) que afectan a la batería y a los dos loopers juntos.` },
    { id: 'uso-zurdo', title: '¿Cómo cambio a zurdo?',
      keywords: ['zurdo','zurda','mano izquierda','cambiar mano','diestro'],
      answer: `En ⚙️ Ajustes (arriba, junto al título) está el botón ⇄ de la mano — lo tocas y toda la app (mástil, acordes, tríadas) se voltea a orientación zurda, con el clavijero a la derecha. Se aplica en toda la aplicación, no solo en una pestaña.` },
    { id: 'uso-zona-mastil', title: '¿Qué es la "Zona del mástil" en Tríadas?',
      keywords: ['zona del mastil','zona mastil','trastes 0-5','trastes 9-12'],
      answer: `Te deja elegir en qué parte del mástil (graves, medios, agudos) quieres ver la tríada. Como una nota fija en una cuerda fija solo se repite cada 12 trastes, la app elige automáticamente qué juego de cuerdas encaja mejor en la zona que pediste — no hace falta que tú elijas las cuerdas a mano, se ajustan solas.` },
    { id: 'uso-caja-ritmos', title: '¿Cómo uso la Caja de Ritmos & Looper?',
      keywords: ['caja de ritmos','bateria','batería','looper','ritmo'],
      answer: `Despliega la sección "🥁 Caja de Ritmos & Looper" (arriba de las pestañas). Elige un estilo (Rock, Funk, Blues Shuffle, Vals...), pulsa Reproducir, y toca las casillas para editar el patrón a tu gusto (apagada → normal → acento). El botón 🔇 de cada fila silencia esa voz sin borrar lo que tenías programado. El "Looper de piano" te deja añadir acordes que suenan en bucle sincronizados con el ritmo, y justo debajo la "Línea de bajo (looper)" toca automáticamente sobre esos mismos acordes — actívala también para tener batería + bajo + piano sonando juntos y practicar guitarra encima. El "EQ" te deja añadir reverb, chorus y delay a todo el conjunto.` },
    { id: 'uso-quiz', title: '¿Cómo activo el modo Quiz?',
      keywords: ['quiz','examen','identificar notas','poner a prueba'],
      answer: `Está disponible en varias pestañas: en Escalas (identificar notas del mástil), y en Tríadas (adivinar tónica, calidad e inversión de una digitación "ciega", sin nombres de nota). Busca el botón "Modo Quiz" dentro de cada sección.` },
    { id: 'teoria-triada', title: '¿Qué es una tríada?',
      keywords: ['que es una triada','definicion triada','tríada definicion'],
      answer: `Una tríada es un acorde de 3 notas construido apilando terceras: la fundamental (1ª), la tercera (3ª) y la quinta (5ª). Según la distancia entre esas notas, es Mayor, Menor, Aumentada o Disminuida. Es el acorde más básico — todos los acordes más complejos (con séptima, novena...) se construyen añadiendo notas encima de una tríada.` },
    { id: 'teoria-inversion', title: '¿Qué es una inversión?',
      keywords: ['inversion','inversiones','que es una inversion'],
      answer: `Es la misma tríada (las mismas 3 notas), pero tocada empezando por una nota distinta a la fundamental. Fundamental: empieza en la 1ª. 1ª inversión: empieza en la 3ª. 2ª inversión: empieza en la 5ª. Suenan distinto (más abierto o más cerrado) aunque sean exactamente las mismas notas.` },
    { id: 'teoria-modo', title: '¿Qué es un modo (dórico, mixolidio...)?',
      keywords: ['modo','modos','dorico','frigio','lidio','mixolidio','locrio','que es un modo'],
      answer: `Los modos son las 7 escalas que salen de tocar las mismas 7 notas de una escala mayor, pero empezando desde cada uno de sus grados. Por ejemplo, las teclas blancas del piano empezando en Do dan el modo Jónico (escala mayor); las mismas teclas empezando en Re dan el modo Dórico. Cada uno tiene un color/carácter distinto aunque compartan las mismas notas.` },
    { id: 'teoria-progresion', title: '¿Qué es una progresión de acordes?',
      keywords: ['progresion de acordes','que es una progresion','grados romanos'],
      answer: `Es una secuencia de acordes tocados en orden, normalmente descrita con números romanos (I, IV, V, vi...) que indican el grado de la escala sobre el que se construye cada acorde, no una nota fija — así la misma progresión "I-IV-V" funciona en cualquier tonalidad, cambiando solo qué notas concretas se tocan.` },
    { id: 'uso-extensiones', title: '¿Cómo se construye un acorde con séptima o novena?',
      keywords: ['septima','novena','extension','extensiones','construir acorde con septima','apilar terceras'],
      answer: `En Acordes, despliega "Séptimas y extensiones, paso a paso". Elige tónica y base (mayor/menor), y ve pulsando 1. Tríada → 2. + 7ª → 3. + 9ª — cada paso apila una tercera más encima del anterior. Verás las notas y sus grados (1, 3, 5, 7, 9) en cada paso, con sonido para comparar cómo cambia el color del acorde.` },
    { id: 'uso-armonia-septimas', title: '¿Qué es la armonía por grados con séptimas?',
      keywords: ['armonia con septimas','armonia jazz','armonia bossa','grados con septima'],
      answer: `En Acordes, despliega "Armonía por grados con séptimas". Es como la armonía por grados de Tríadas, pero con acordes de 4 notas (maj7, m7, 7, m7b5) en vez de solo 3 — el sonido característico del jazz y la bossa nova. Usa la tónica que tengas elegida arriba, y puedes tocar cada acorde tocando su tarjeta.` },
    { id: 'uso-mapa-sitio', title: '¿Hay un mapa de todo lo que ofrece la app?',
      keywords: ['mapa del sitio','mapa','todo lo que ofrece','de un vistazo','que hay en la app'],
      answer: `Sí — arriba del todo, junto al título "Fretlastico", hay un icono 🗺️. Lo pulsas y se abre un panel con TODO lo que ofrece la app, sección por sección, cada línea llevándote directamente ahí. A diferencia del footer (que se oculta en Piano/Tríadas/Oído), este botón está siempre visible en cualquier pestaña.` },
    { id: 'uso-cadencias', title: '¿Qué son las cadencias (auténtica, plagal, rota)?',
      keywords: ['cadencia','cadencias','autentica','plagal','rota','como termina una frase'],
      answer: `En Acordes, despliega "Cadencias". Son solo 2 acordes que definen cómo "termina" una frase musical. Auténtica (V-I): la más conclusiva, el final por excelencia. Plagal (IV-I): más suave, la cadencia "Amén" de los himnos. Rota (V-vi): el oído espera el I pero se desvía al vi — sorprende. Elige tónica y toca cada tarjeta para escucharlas.` },
    { id: 'uso-oido-progresiones', title: '¿Puedo entrenar el oído con progresiones, no solo intervalos?',
      keywords: ['reconocer progresiones de oido','progresiones de oido','identificar progresion de oido'],
      answer: `Sí — en Oído, el 3er modo "Progresiones". Suena una progresión de 2 a 4 acordes en una tonalidad al azar, y adivinas cuál es entre 8 opciones (5 progresiones típicas + las 3 cadencias). Es el modo más difícil de los 3, buena forma de comprobar si de verdad reconoces lo que tocas.` },
    { id: 'uso-cejilla', title: '¿Cómo funciona la cejilla (barré) más allá de CAGED?',
      keywords: ['cejilla','barre','como funciona la cejilla','dedo indice'],
      answer: `En Técnica, despliega "Cejilla (barré) más allá de CAGED". El dedo índice pisa varias cuerdas a la vez, haciendo de "cejuela móvil" — por eso las formas E y A (que en posición abierta usan cuerdas al aire) se pueden mover a cualquier traste. Elige tónica y calidad, y te muestra en qué traste exacto va la cejilla para cada forma — por ejemplo, Fa mayor con la forma E siempre va en el traste 1.` },
    { id: 'uso-caged-septimas', title: '¿La vista CAGED funciona con acordes de séptima?',
      keywords: ['caged septima','caged 7','caged maj7','caged min7','caged sus4','vista caged'],
      answer: `Sí. Además de Mayor y Menor, la vista CAGED (Acordes → modo individual) también funciona con Séptima (dom7), Séptima mayor (maj7), Séptima menor (min7) y Sus4 — 5 posiciones para todas salvo Séptima menor, que solo tiene 3 (las formas C y G de esa calidad necesitan digitaciones con cejilla más avanzadas que preferí no incluir sin poder verificarlas del todo). Disminuido y Aumentado no tienen vista CAGED a propósito: son acordes simétricos (se repiten cada 3 semitonos) que normalmente se tocan como una única forma movible, no como 5 posiciones distintas.` },
    { id: 'uso-que-escala', title: '¿Qué escala toco sobre un acorde?',
      keywords: ['que escala toco','escala sobre acorde','que escala usar','improvisar sobre acorde'],
      answer: `En Acordes → modo individual, despliega "Qué escala toco sobre este acorde" — según la calidad de acorde que tengas elegida (Mayor, Menor, Séptima, Séptima mayor, Séptima menor, Semidisminuido), te sugiere qué escalas encajan y por qué, con un botón para saltar directo a Escalas ya configurado con esa escala.` },
    { id: 'uso-analizador-inverso', title: '¿Cómo sé en qué tonalidad está una canción a partir de sus acordes?',
      keywords: ['analizador de progresion','en que tonalidad esta','identificar tonalidad','acordes de una cancion'],
      answer: `En Acordes, despliega "Analizador y transportador de progresiones". Añade los acordes tal y como los conozcas (ej. Do, Lam, Fa, Sol) y pulsa "Analizar tonalidad" — prueba las 24 tonalidades posibles y te dice cuál encaja mejor, con los números romanos de cada acorde. Si dos tonalidades empatan (típicamente una mayor y su relativa menor, que comparten los mismos acordes), te lo avisa — ahí solo el oído distingue cuál es la de verdad.` },
    { id: 'uso-transportador', title: '¿Cómo transporto una progresión a otra tonalidad?',
      keywords: ['transportar progresion','cambiar de tonalidad','transportador'],
      answer: `En la misma sección "Analizador y transportador de progresiones" de Acordes: después de construir tu lista de acordes, aparece "Transportar a" con las 12 tónicas — elige la que quieras y verás la misma progresión trasladada, manteniendo los mismos intervalos entre acordes, con botón para escucharla.` },
    { id: 'uso-metronomo-subdivisiones', title: '¿El metrónomo tiene subdivisiones (corcheas, tresillos)?',
      keywords: ['metronomo subdivisiones','corcheas','tresillos','semicorcheas','metronomo avanzado'],
      answer: `Sí — activa el metrónomo y aparecen las opciones avanzadas, con Negras, Corcheas, Tresillos y Semicorcheas. Cada subdivisión suena con un clic más suave que el pulso principal, para que se distingan bien al oído.` },
    {
      id: 'sugerencia-aleatoria', featured: true,
      title: '🎲 No sé qué practicar hoy',
      keywords: ['no se que practicar','sugerencia','que practico','aleatorio','sorprendeme','dame una idea'],
      dynamic: () => FRETTEACHER_RANDOM_POOL[Math.floor(Math.random() * FRETTEACHER_RANDOM_POOL.length)]
    },
    {
      id: 'plan-20-min', featured: true,
      title: '📅 Plan de sesión de 20 minutos',
      keywords: ['plan de sesion','20 minutos','plan de estudio','rutina','sesion completa'],
      answer: `Una sesión corta pero completa — un poco de cada cosa, en vez de machacar solo una:

<b>5 min — Calentamiento (Escalas)</b>: Do mayor, subiendo y bajando despacio, con metrónomo a 70 BPM.

<b>5 min — Tríadas</b>: elige un acorde de la progresión de hoy (ej. Do mayor) y toca sus 3 inversiones seguidas, sin parar entre una y otra.

<b>5 min — Cambios (Acordes)</b>: practica el cambio entre dos acordes de una progresión sencilla (ej. Do → Sol) hasta que no tengas que pensarlo.

<b>5 min — Ritmo</b>: activa la Caja de Ritmos (estilo Rock o el que prefieras) a 80 BPM, y toca encima lo que acabas de practicar — es la parte que más se salta la gente, y la que más se nota.

Consejo: si un día solo tienes 5 minutos, haz solo el primer bloque. Practicar poco pero todos los días rinde más que una sesión larga una vez por semana.`,
      action: { label: 'Empezar (Escalas, Do mayor)', apply: () => { state.tab = 'escalas'; state.root = 0; state.scaleKey = 'jonico'; render(); } }
    },
  ];

  // pool de sugerencias para el botón "No sé qué practicar hoy" — cada vez que se pulsa, elige
  // una al azar. Variadas en tema y dificultad, todas con pasos concretos y tiempo estimado.
  const FRETTEACHER_RANDOM_POOL = [
    { title: '🎲 Pentatónica menor en La (10 min)',
      answer: 'La pentatónica menor es la escala más usada en rock y blues — solo 5 notas, fácil de memorizar rápido. Tócala subiendo y bajando por 2 octavas, luego improvisa libremente sobre ella durante 5 minutos sin pensar en "hacerlo bien", solo explorando.',
      action: { label: 'Ir a Escalas (La pentatónica menor)', apply: () => { state.tab = 'escalas'; state.root = 9; state.scaleKey = 'pent_menor'; render(); } } },
    { title: '🎲 Tríada de Sol mayor, las 3 inversiones (10 min)',
      answer: 'Toca la fundamental, luego la 1ª inversión, luego la 2ª — cada una 8 veces seguidas antes de pasar a la siguiente. Al final, intenta encadenar las 3 sin mirar el diagrama.',
      action: { label: 'Ir a Tríadas (Sol mayor)', apply: () => { state.tab = 'triadas'; state.triad.root = 7; state.triad.quality = 'major'; state.triad.inversion = 0; render(); } } },
    { title: '🎲 Modo Dórico en Re (10 min)',
      answer: 'El Dórico tiene ese color "menor pero con un punto brillante" — muy usado en jazz y funk. Tócalo despacio prestando atención a cómo suena distinto de la escala menor natural, aunque solo cambie una nota.',
      action: { label: 'Ir a Escalas (Re Dórico)', apply: () => { state.tab = 'escalas'; state.root = 2; state.scaleKey = 'dorico'; render(); } } },
    { title: '🎲 Progresión I-vi-IV-V en Do mayor (15 min)',
      answer: 'La "progresión de los 50" — Do, La menor, Fa, Sol. Practica primero cada cambio por separado (Do→Lam, Lam→Fa, Fa→Sol), luego encadénalos todos con la Caja de Ritmos sonando de fondo a tempo lento.',
      action: { label: 'Ir a Acordes (progresión)', apply: () => { state.tab = 'acordes'; state.acordesMode = 'progresion'; render(); } } },
    { title: '🎲 Walking bass sobre un blues de 12 compases (15 min)',
      answer: 'Ve a Acordes → Progresión → elige la forma "12 compases de Blues" → cambia la vista a "Línea de bajo" → elige el patrón "Walking". Escúchala primero un par de veces reproduciéndola, luego intenta tocarla tú encima del ritmo.',
      action: { label: 'Ir a Acordes (progresión)', apply: () => { state.tab = 'acordes'; state.acordesMode = 'progresion'; render(); } } },
    { title: '🎲 Tríadas en horizontal, Mi menor (10 min)',
      answer: 'Las disposiciones horizontales (cuerdas salteadas) suenan más abiertas que las verticales — un color distinto para la misma tríada. Compara cómo suena Mi menor en vertical y en horizontal, tocando una justo después de la otra.',
      action: { label: 'Ir a Tríadas (Mi menor, horizontal)', apply: () => { state.tab = 'triadas'; state.triad.root = 4; state.triad.quality = 'minor'; state.triad.mode = 'horizontal'; render(); } } },
    { title: '🎲 Picking alterno a 80 BPM (10 min)',
      answer: 'Ve a la pestaña Técnica, elige un ejercicio de picking alterno, y ponlo a 80 BPM con el metrónomo. Si te cuesta mantenerlo limpio, baja a 60 BPM — la velocidad se gana con precisión, no al revés.',
      action: { label: 'Ir a Técnica', apply: () => { state.tab = 'tecnica'; render(); } } },
    { title: '🎲 Escala mayor + Caja de Ritmos juntas (10 min)',
      answer: 'Activa la Caja de Ritmos (Rock o el estilo que prefieras) a 70 BPM, y toca la escala de Do mayor completa encima, en negras, marcando cada nota con el pulso. Tocar con ritmo de fondo cambia por completo cómo se siente estudiar una escala.',
      action: { label: 'Ir a Escalas (Do mayor)', apply: () => { state.tab = 'escalas'; state.root = 0; state.scaleKey = 'jonico'; render(); } } },
  ];

  function populateCapoSelect(){
    const sel = $('#capoSelect');
    sel.innerHTML = '';
    for (let i = 0; i <= 11; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i === 0 ? 'Sin cejilla' : 'Traste ' + i;
      sel.appendChild(opt);
    }
    sel.value = state.capo;
  }

  // explica la cejilla en términos de "forma/tónica que ves" -> "nota que realmente suena",
  // usando la tónica actualmente seleccionada como ejemplo ilustrativo
  function updateCapoInfo(){
    const info = $('#capoInfo');
    if (state.capo === 0) { info.style.display = 'none'; return; }
    const shapeName = DISPLAY[state.root];
    const soundingPc = (state.root + state.capo) % 12;
    const soundingName = DISPLAY[soundingPc];
    info.innerHTML = `<b>Cejilla en el traste ${state.capo}:</b> tocando "en posición abierta" (como si no hubiera cejilla) sonarás transportado +${state.capo} semitono${state.capo > 1 ? 's' : ''} — por ejemplo, lo que ves/tocas como <b>${shapeName}</b> suena realmente a <b>${soundingName}</b>. Los trastes detrás de la cejilla (oscurecidos) quedan fuera de alcance.`;
    info.style.display = 'block';
  }

  function populateScaleSelect(){
    const sel = $('#scaleSelect');
    sel.innerHTML = '';
    Object.entries(SCALES).forEach(([key, s]) => {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = s.name;
      sel.appendChild(opt);
    });
    sel.value = state.scaleKey;
  }

  function populateRootButtons(){
    const wrap = $('#rootButtons');
    wrap.innerHTML = '';
    DISPLAY.forEach((label, pc) => {
      const b = document.createElement('button');
      b.className = 'note-btn' + (pc === state.root ? ' selected' : '');
      b.textContent = label;
      b.dataset.pc = pc;
      b.addEventListener('click', () => { state.root = pc; render(); });
      wrap.appendChild(b);
    });
  }

  // calcula ventanas de 5 trastes ancladas al traste EXACTO donde la tónica suena en cada cuerda
  // (fórmula: traste = (tónica - nota_al_aire + 12) % 12, verificable, no una tabla memorizada).
  // Así las cajas se desplazan de verdad al cambiar de tónica.
  function computeBoxes(){
    const tuning = TUNINGS[state.instrument];
    const rootIdx = state.root;
    const W = 4; // ventana de 5 trastes (s..s+4)

    const anchorsSet = new Set();
    tuning.forEach(openNote => {
      const openPc = pitchClassIndex(openNote);
      anchorsSet.add((rootIdx - openPc + 12) % 12);
    });
    const anchors = Array.from(anchorsSet).sort((a, b) => a - b);
    const merged = [];
    anchors.forEach(a => { if (merged.length === 0 || a - merged[merged.length - 1] >= 2) merged.push(a); });

    const inScale = scaleSet();
    function windowValid(s){
      for (let sIdx = 0; sIdx < tuning.length; sIdx++) {
        const openNote = tuning[sIdx];
        let has = false;
        for (let f = Math.max(0, s); f <= Math.min(MAX_FRET, s + W); f++) {
          const pc = (pitchClassIndex(openNote) + f) % 12;
          if (inScale.has(pc)) { has = true; break; }
        }
        if (!has) return false;
      }
      return true;
    }

    const starts = [];
    merged.forEach(a => {
      let s = a;
      if (s + W > MAX_FRET) s = MAX_FRET - W;
      if (s < 0) s = 0;
      if (windowValid(s)) starts.push(s);
    });
    const uniqueStarts = Array.from(new Set(starts)).sort((a, b) => a - b);

    return uniqueStarts.slice(0, 5).map((s, i) => ({
      id: 'box' + i,
      label: 'Caja ' + (i + 1),
      range: [s, Math.min(s + W, MAX_FRET)]
    }));
  }

  function activeZoneList(){
    return state.zoneMode === 'auto' ? computeBoxes() : ZONES;
  }

  function renderZoneButtons(){
    const wrap = $('#zoneGroup');
    wrap.innerHTML = '';
    const list = activeZoneList();
    if (list.length === 0) {
      const span = document.createElement('span');
      span.className = 'label';
      span.textContent = 'Sin cajas válidas para esta escala/tónica';
      wrap.appendChild(span);
      return;
    }
    if (!list.find(z => z.id === state.zone)) state.zone = list[0].id;
    list.forEach(z => {
      const b = document.createElement('button');
      b.textContent = z.label;
      b.title = state.zoneMode === 'auto' ? `Trastes ${z.range[0]}–${z.range[1]}` : '';
      b.dataset.zone = z.id;
      if (z.id === state.zone) b.classList.add('active');
      b.addEventListener('click', () => { state.zone = z.id; render(); });
      wrap.appendChild(b);
    });
  }

  // muestra/oculta el toggle "3 Notas/Cuerda" (solo aplica a escalas de 7 notas, en la pestaña
  // Escalas) y, si está activo, puebla los botones de patrón disponibles para la tónica actual.
  function renderNPSControls(){
    const inEscalas = state.tab === 'escalas';
    const eligible = inEscalas && THREE_NPS_SCALES.has(state.scaleKey);
    $('#npsModeWrap').style.display = eligible ? 'flex' : 'none';
    if (!eligible) { state.threeNPS = false; }
    $('#npsModeToggle').classList.toggle('active', state.threeNPS);

    $('#sequenceModeWrap').style.display = inEscalas ? 'flex' : 'none';
    if (!inEscalas) state.sequenceMode = 'off';
    const usingSeq = usingSequenceMode();
    $('#sequenceModeToggle').classList.toggle('active', usingSeq);

    const showPatterns = eligible && state.threeNPS && !usingSeq;
    $('#npsPatternRow').style.display = showPatterns ? 'flex' : 'none';
    $('#sequenceGroupRow').style.display = usingSeq ? 'flex' : 'none';
    $('#zoneGroup').style.display = (showPatterns || usingSeq) ? 'none' : 'flex';
    $('#boxModeWrap').style.display = (showPatterns || usingSeq) ? 'none' : 'flex';

    if (usingSeq) {
      document.querySelectorAll('#sequenceGroupGroup button').forEach(b => {
        b.classList.toggle('active', b.dataset.seq === state.sequenceMode);
      });
      return;
    }
    if (!showPatterns) return;

    const patterns = compute3NPSPatterns();
    const wrap = $('#npsPatternGroup');
    wrap.innerHTML = '';
    if (patterns.length === 0) {
      wrap.innerHTML = '<span class="label">Sin patrones válidos para esta tónica</span>';
      return;
    }
    if (!patterns.find(p => p.id === state.npsPattern)) state.npsPattern = patterns[0].id;
    patterns.forEach(p => {
      const b = document.createElement('button');
      b.textContent = p.label;
      b.title = `Trastes ${p.range[0]}–${p.range[1]}`;
      if (p.id === state.npsPattern) b.classList.add('active');
      b.addEventListener('click', () => { state.npsPattern = p.id; render(); });
      wrap.appendChild(b);
    });
  }

  function renderTecnicaControls(){
    const exWrap = $('#tecnicaExerciseGroup');
    exWrap.innerHTML = '';
    Object.entries(TECNICA_EXERCISES).forEach(([key, ex]) => {
      const b = document.createElement('button');
      b.textContent = ex.label;
      b.dataset.exercise = key;
      if (state.tecnicaExercise === key) b.classList.add('active');
      b.addEventListener('click', () => { state.tecnicaExercise = key; render(); });
      exWrap.appendChild(b);
    });

    const wrap = $('#tecnicaStartGroup');
    wrap.innerHTML = '';
    const options = [1, 2, 3, 4, 5, 7, 9, 12];
    options.forEach(f => {
      const b = document.createElement('button');
      b.textContent = 'Traste ' + f;
      b.dataset.startFret = f;
      if (state.chromaticStartFret === f) b.classList.add('active');
      b.addEventListener('click', () => { state.chromaticStartFret = f; render(); });
      wrap.appendChild(b);
    });
  }

  // selector de posición para la pestaña Estilos: igual que las cajas automáticas de Escalas,
  // pero guardando la elección en state.styleZone (independiente de la zona de la pestaña Escalas)
  function renderStyleZoneButtons(boxes){
    const wrap = $('#styleZoneGroup');
    wrap.innerHTML = '';
    if (boxes.length === 0) {
      const span = document.createElement('span');
      span.className = 'label';
      span.textContent = 'Sin cajas válidas para esta tónica';
      wrap.appendChild(span);
      return;
    }
    boxes.forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.title = `Trastes ${b.range[0]}–${b.range[1]}`;
      btn.dataset.zone = b.id;
      if (b.id === state.styleZone) btn.classList.add('active');
      btn.addEventListener('click', () => { state.styleZone = b.id; render(); });
      wrap.appendChild(btn);
    });
  }

  function populatePatternButtons(){
    const wrap = $('#patternGroup');
    wrap.innerHTML = '';
    Object.entries(PATTERNS).forEach(([key, p]) => {
      const b = document.createElement('button');
      b.textContent = p.name;
      b.title = p.hint;
      b.dataset.pattern = key;
      if (key === state.pattern) b.classList.add('active');
      b.addEventListener('click', () => { state.pattern = key; render(); });
      wrap.appendChild(b);
    });
  }

  function populateStyleButtons(){
    const wrap = $('#styleGroup');
    wrap.innerHTML = '';
    Object.entries(STYLES).forEach(([key, s]) => {
      const b = document.createElement('button');
      b.textContent = s.name;
      b.title = s.hint;
      b.dataset.style = key;
      if (key === state.style) b.classList.add('active');
      b.addEventListener('click', () => { state.style = key; state.styleVariant = 0; render(); });
      wrap.appendChild(b);
    });
  }

  function populateChordQualityButtons(){
    const wrap = $('#chordQualityGroup');
    wrap.innerHTML = '';
    Object.entries(CHORD_QUALITIES).forEach(([key, q]) => {
      const b = document.createElement('button');
      b.textContent = q.label;
      b.dataset.quality = key;
      if (key === state.chordQuality) b.classList.add('active');
      b.addEventListener('click', () => { state.chordQuality = key; render(); });
      wrap.appendChild(b);
    });
  }

  // pinta un acorde concreto (raíz+calidad) en el diagrama grande y la info — reutilizable tanto
  // por el modo "Acorde individual" como por el modo "Progresión"
  function displayChord(rootPc, qualityKey){
    const shape = buildChordShape(rootPc, qualityKey);
    $('#chordDiagramWrap').innerHTML = renderChordSVG(shape);
    const q = shape.q;
    const rootName = DISPLAY[rootPc];
    $('#chordInfoName').textContent = rootName + q.suffix;

    const formula = CHORD_FORMULAS[qualityKey];
    const formulaText = formula.map(([deg]) => deg).join('-');
    const toneNames = formula.map(([, semi]) => DISPLAY[(rootPc + semi) % 12]);
    $('#chordInfoTones').innerHTML =
      '<b>Fórmula:</b> ' + formulaText + '<br>' +
      '<b>Notas:</b> ' + toneNames.join(' - ');

    state.currentChord = { shape, name: rootName + q.suffix };
  }

  // ---------- ACORDES: séptimas y extensiones, paso a paso ----------
  const EXT_INTERVALS = {
    major: { triad: [0,4,7], seventh: [0,4,7,11], ninth: [0,4,7,11,14] }, // tríada -> maj7 -> maj9
    minor: { triad: [0,3,7], seventh: [0,3,7,10], ninth: [0,3,7,10,14] }, // tríada -> min7 -> min9
  };
  const EXT_DEGREE_LABELS = { major: ['1','3','5','7M','9'], minor: ['1','b3','5','7m','9'] };

  function renderExtensionsSection(){
    if (!$('#extRootGroup').children.length) {
      DISPLAY.forEach((name, pc) => {
        const b = document.createElement('button');
        b.textContent = name;
        if (pc === state.extBuild.root) b.classList.add('active');
        b.addEventListener('click', () => {
          state.extBuild.root = pc;
          document.querySelectorAll('#extRootGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderExtensionsDisplay();
        });
        $('#extRootGroup').appendChild(b);
      });
      document.querySelectorAll('#extBaseGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.extBuild.base = b.dataset.ebase;
          document.querySelectorAll('#extBaseGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderExtensionsDisplay();
        });
      });
      document.querySelectorAll('#extStepGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.extBuild.step = b.dataset.estep;
          document.querySelectorAll('#extStepGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderExtensionsDisplay();
        });
      });
      $('#extPlayBtn').addEventListener('click', playExtensionChord);
    }
    renderExtensionsDisplay();
  }

  function extensionMidiNotes(){
    const b = state.extBuild;
    const rootMidi = (4 + 1) * 12 + b.root; // octava 4 fija (Do4 = 60), convención estándar del piano
    return EXT_INTERVALS[b.base][b.step].map(iv => rootMidi + iv);
  }

  function renderExtensionsDisplay(){
    const b = state.extBuild;
    const intervals = EXT_INTERVALS[b.base][b.step];
    const degreeLabels = EXT_DEGREE_LABELS[b.base].slice(0, intervals.length);
    const stepLabel = { triad: 'Tríada (3 notas)', seventh: 'Con séptima (4 notas)', ninth: 'Con novena (5 notas)' }[b.step];
    $('#extInfo').innerHTML = `<b>${DISPLAY[b.root]} ${b.base === 'major' ? 'mayor' : 'menor'} — ${stepLabel}:</b><br>` +
      intervals.map((iv, i) => `${DISPLAY[(b.root + iv) % 12]} (${degreeLabels[i]})`).join(' · ');
  }

  function playExtensionChord(){
    extensionMidiNotes().forEach(midi => playPianoTone(midi));
  }

  // ---------- ACORDES: armonía por grados con séptimas (jazz/bossa) ----------
  function renderSeventhHarmonySection(){
    if (!$('#seventhHarmonyKeyGroup').dataset.wired) {
      $('#seventhHarmonyKeyGroup').dataset.wired = '1';
      document.querySelectorAll('#seventhHarmonyKeyGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.seventhHarmonyKey = b.dataset.shkey;
          document.querySelectorAll('#seventhHarmonyKeyGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderSeventhHarmonyCards();
        });
      });
    }
    renderSeventhHarmonyCards();
  }

  function renderSeventhHarmonyCards(){
    const wrap = $('#seventhHarmonyCards');
    wrap.innerHTML = '';
    const context = state.seventhHarmonyKey;
    const baseIntervals = SCALES[context === 'mayor' ? 'jonico' : 'eolico'].intervals;
    PROG_ROMAN[context].forEach((roman, i) => {
      const degreeRootPc = (state.root + baseIntervals[i]) % 12;
      const qualityKey = PROG_DEGREE_QUALITY[context][i];
      const q = CHORD_QUALITIES[qualityKey];
      const card = document.createElement('div');
      card.className = 'chord-mini-card triad-card';
      card.innerHTML = `<div class="chord-mini-roman">${roman}</div>
        <div class="theory-note-small" style="padding:8px 4px;">${q.tones.map(iv => DISPLAY[(degreeRootPc + iv) % 12]).join(' · ')}</div>`;
      const label = document.createElement('div');
      label.className = 'chord-mini-label';
      label.textContent = DISPLAY[degreeRootPc] + q.suffix;
      card.appendChild(label);
      card.addEventListener('click', () => {
        const rootMidi = (4 + 1) * 12 + degreeRootPc;
        q.tones.forEach(iv => playPianoTone(rootMidi + iv));
      });
      wrap.appendChild(card);
    });
  }

  // ---------- ACORDES: qué escala toco sobre este acorde ----------
  // cada escala propuesta se verificó que CONTIENE todas las notas del acorde correspondiente
  const CHORD_SCALE_MAP = {
    major: [{ key: 'jonico', note: 'La opción más directa y estable: la propia escala mayor de esa tónica.' }],
    minor: [{ key: 'eolico', note: 'La escala menor natural — la opción más directa.' },
            { key: 'dorico', note: 'Un color algo más brillante, muy usado en jazz y funk.' }],
    dom7:  [{ key: 'mixolidio', note: 'La opción clásica para un acorde de dominante (V7).' }],
    maj7:  [{ key: 'jonico', note: 'La escala mayor de toda la vida.' },
            { key: 'lidio', note: 'Un color más "flotante", muy propio del jazz.' }],
    min7:  [{ key: 'dorico', note: 'La opción más común en jazz para un acorde min7.' },
            { key: 'eolico', note: 'Más oscura, propia de tonalidades menores.' }],
    m7b5:  [{ key: 'locrio', note: 'El modo que corresponde exactamente a este acorde (el vii del tono mayor).' }],
  };

  function renderChordScaleSection(){
    const body = $('#chordScaleBody');
    body.innerHTML = '';
    const q = state.chordQuality;
    const options = CHORD_SCALE_MAP[q];
    if (!options) {
      body.innerHTML = `<p class="theory-note theory-note-small">Para "${CHORD_QUALITIES[q].label}" todavía no tengo una recomendación de escala verificada — prueba con Mayor, Menor, Séptima, Séptima mayor, Séptima menor o Semidisminuido.</p>`;
      return;
    }
    const intro = document.createElement('p');
    intro.className = 'theory-note theory-note-small';
    intro.innerHTML = `Sobre un acorde de <b>${DISPLAY[state.root]} ${CHORD_QUALITIES[q].label}</b>, estas escalas encajan (contienen todas las notas del acorde):`;
    body.appendChild(intro);
    options.forEach(opt => {
      const box = document.createElement('div');
      box.className = 'ft-answer';
      box.innerHTML = `<h4>${DISPLAY[state.root]} ${SCALES[opt.key].name}</h4><p>${opt.note}</p>`;
      const btn = document.createElement('button');
      btn.className = 'ft-action-btn';
      btn.textContent = 'Ver en Escalas';
      btn.addEventListener('click', () => { state.tab = 'escalas'; state.scaleKey = opt.key; render(); });
      box.appendChild(btn);
      body.appendChild(box);
    });
  }

  // ---------- ACORDES: analizador de progresión inversa y transportador ----------
  // ---------- ACORDES: cadencias ----------
  // definidas como grados (0-6) dentro de la tonalidad mayor — reutiliza triadDiatonicDegrees,
  // ya verificada, para calcular los acordes reales según la tónica elegida
  const CADENCES = [
    { key: 'autentica', label: 'Auténtica (V - I)', degrees: [4, 0], desc: 'La más conclusiva — el "final" por excelencia. El V crea tensión que el I resuelve por completo.' },
    { key: 'plagal', label: 'Plagal (IV - I)', degrees: [3, 0], desc: 'La cadencia "Amén" de los himnos religiosos — más suave que la auténtica, menos tensión que resolver.' },
    { key: 'rota', label: 'Rota (V - vi)', degrees: [4, 5], desc: 'También llamada "interrumpida": el V promete resolver en el I, pero se desvía hacia el vi — sorprende al oído.' },
  ];

  // ---------- TÉCNICA: cejilla (barré) más allá de CAGED ----------
  // reutiliza computeCagedPositions (ya verificada para las 5 posiciones CAGED), filtrando solo
  // a las formas E y A — las 2 que de verdad se usan como cejilla movible en la práctica — y
  // señalando explícitamente en qué traste hay que colocar el dedo índice.
  function renderBarreTechSection(){
    if (!$('#barreRootGroup').children.length) {
      DISPLAY.forEach((name, pc) => {
        const b = document.createElement('button');
        b.textContent = name;
        if (pc === 5) b.classList.add('active'); // Fa por defecto: el ejemplo clásico de cejilla
        b.addEventListener('click', () => {
          document.querySelectorAll('#barreRootGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderBarreCards();
        });
        $('#barreRootGroup').appendChild(b);
      });
      document.querySelectorAll('#barreQualityGroup button').forEach(b => {
        b.addEventListener('click', () => {
          document.querySelectorAll('#barreQualityGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderBarreCards();
        });
      });
    }
    renderBarreCards();
  }

  function renderBarreCards(){
    const rootBtn = document.querySelector('#barreRootGroup button.active');
    const qualityBtn = document.querySelector('#barreQualityGroup button.active');
    const rootPc = rootBtn ? DISPLAY.indexOf(rootBtn.textContent) : 5;
    const quality = qualityBtn ? qualityBtn.dataset.bq : 'major';
    const positions = computeCagedPositions(rootPc, quality).filter(p => p.shapeName === 'E' || p.shapeName === 'A');
    const wrap = $('#barreCards');
    wrap.innerHTML = '';
    positions.forEach(shape => {
      const card = document.createElement('div');
      card.className = 'chord-mini-card triad-card';
      const barreNote = shape.baseFret > 0
        ? `Cejilla con el índice en el traste ${shape.baseFret}`
        : 'Posición abierta — no hace falta cejilla aquí';
      card.innerHTML = `<div class="chord-mini-roman">Forma ${shape.shapeName}</div>
        <div class="chord-mini-diagram">${renderChordSVG(shape)}</div>`;
      const label = document.createElement('div');
      label.className = 'chord-mini-label';
      label.textContent = barreNote;
      card.appendChild(label);
      wrap.appendChild(card);
    });
  }

  function renderCadencesSection(){
    if (!$('#cadenceRootGroup').children.length) {
      DISPLAY.forEach((name, pc) => {
        const b = document.createElement('button');
        b.textContent = name;
        if (pc === state.root) b.classList.add('active');
        b.addEventListener('click', () => {
          document.querySelectorAll('#cadenceRootGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderCadenceCards(pc);
        });
        $('#cadenceRootGroup').appendChild(b);
      });
    }
    const activeBtn = document.querySelector('#cadenceRootGroup button.active');
    renderCadenceCards(activeBtn ? DISPLAY.indexOf(activeBtn.textContent) : state.root);
  }

  function renderCadenceCards(rootPc){
    const wrap = $('#cadenceCards');
    wrap.innerHTML = '';
    const diatonic = triadDiatonicDegrees(rootPc, 'major');
    CADENCES.forEach(cad => {
      const chords = cad.degrees.map(d => diatonic[d]);
      const card = document.createElement('div');
      card.className = 'chord-mini-card triad-card';
      const names = chords.map(c => DISPLAY[c.root] + (c.quality === 'minor' ? 'm' : c.quality === 'dim' ? '°' : ''));
      card.innerHTML = `<div class="chord-mini-roman">${cad.label}</div>
        <div class="theory-note-small" style="padding:8px 4px;">${cad.desc}</div>`;
      const label = document.createElement('div');
      label.className = 'chord-mini-label';
      label.textContent = names.join(' → ');
      card.appendChild(label);
      card.addEventListener('click', () => {
        chords.forEach((c, i) => setTimeout(() => {
          const rootMidi = (4 + 1) * 12 + c.root;
          TRIAD_QUALITIES[c.quality].formula.forEach(iv => playPianoTone(rootMidi + iv));
        }, i * 800));
      });
      wrap.appendChild(card);
    });
  }

  function renderReverseAnalysisSection(){
    if (!$('#raRootGroup').children.length) {
      DISPLAY.forEach((name, pc) => {
        const b = document.createElement('button');
        b.textContent = name;
        if (pc === state.reverseAnalysis.build.root) b.classList.add('active');
        b.addEventListener('click', () => {
          state.reverseAnalysis.build.root = pc;
          document.querySelectorAll('#raRootGroup button').forEach(x => x.classList.toggle('active', x === b));
        });
        $('#raRootGroup').appendChild(b);
      });
      document.querySelectorAll('#raQualityGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.reverseAnalysis.build.quality = b.dataset.raq;
          document.querySelectorAll('#raQualityGroup button').forEach(x => x.classList.toggle('active', x === b));
        });
      });
      $('#raAddBtn').addEventListener('click', () => {
        const b = state.reverseAnalysis.build;
        state.reverseAnalysis.chords.push({ root: b.root, quality: b.quality });
        state.reverseAnalysis.bestKey = null;
        renderRaChordList();
      });
      $('#raClearBtn').addEventListener('click', () => {
        state.reverseAnalysis.chords = [];
        state.reverseAnalysis.bestKey = null;
        renderRaChordList();
      });
      $('#raAnalyzeBtn').addEventListener('click', runReverseAnalysis);

      DISPLAY.forEach((name, pc) => {
        const b = document.createElement('button');
        b.textContent = name;
        b.addEventListener('click', () => {
          document.querySelectorAll('#raTransposeGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderTransposedProgression(pc);
        });
        $('#raTransposeGroup').appendChild(b);
      });
    }
    renderRaChordList();
  }

  function renderRaChordList(){
    const wrap = $('#raChordList');
    wrap.innerHTML = '';
    if (state.reverseAnalysis.chords.length === 0) {
      wrap.innerHTML = '<span class="theory-note-small">Añade al menos 3-4 acordes para un análisis fiable.</span>';
    } else {
      state.reverseAnalysis.chords.forEach((c, i) => {
        const chip = document.createElement('div');
        chip.className = 'drum-looper-chip';
        const q = TRIAD_QUALITIES[c.quality];
        chip.innerHTML = `<span>${DISPLAY[c.root]}${c.quality === 'major' ? '' : c.quality === 'minor' ? 'm' : c.quality === 'dim' ? '°' : '+'}</span>`;
        const rm = document.createElement('button');
        rm.textContent = '✕';
        rm.addEventListener('click', () => {
          state.reverseAnalysis.chords.splice(i, 1);
          state.reverseAnalysis.bestKey = null;
          renderRaChordList();
        });
        chip.appendChild(rm);
        wrap.appendChild(chip);
      });
    }
    $('#raAnalysisResult').innerHTML = '';
    $('#raTransposeRow').style.display = 'none';
    $('#raTransposeResult').innerHTML = '';
  }

  // prueba las 24 tonalidades posibles (12 tónicas x mayor/menor) y cuenta cuántos acordes de la
  // lista encajan exactamente (misma tónica y misma calidad) en cada una — reutiliza
  // triadDiatonicDegrees, ya verificada, en vez de repetir la lógica de armonía diatónica
  function analyzeProgressionChords(inputChords){
    const candidates = [];
    for (let root = 0; root < 12; root++) {
      ['major', 'minor'].forEach(tonality => {
        const diatonic = triadDiatonicDegrees(root, tonality);
        let matches = 0;
        const romanFor = inputChords.map(ch => {
          const found = diatonic.find(d => d.root === ch.root && d.quality === ch.quality);
          if (found) matches++;
          return found ? found.roman : '?';
        });
        candidates.push({ root, tonality, matches, romanFor });
      });
    }
    candidates.sort((a, b) => b.matches - a.matches);
    return candidates;
  }

  function runReverseAnalysis(){
    const chords = state.reverseAnalysis.chords;
    if (chords.length < 2) {
      $('#raAnalysisResult').innerHTML = '<p class="theory-note-small">Añade al menos 2 acordes para poder analizar.</p>';
      return;
    }
    const results = analyzeProgressionChords(chords);
    const topScore = results[0].matches;
    const top = results.filter(r => r.matches === topScore).slice(0, 3); // puede haber empate (ej. relativas mayor/menor)
    state.reverseAnalysis.bestKey = { root: top[0].root, tonality: top[0].tonality };

    const wrap = $('#raAnalysisResult');
    wrap.innerHTML = '';
    top.forEach((r, i) => {
      const box = document.createElement('div');
      box.className = 'ft-answer';
      const tonalityLabel = r.tonality === 'major' ? 'mayor' : 'menor';
      box.innerHTML = `<h4>${i === 0 ? '🏆 ' : ''}${DISPLAY[r.root]} ${tonalityLabel} (${r.matches}/${chords.length} acordes encajan)</h4>
        <p>${r.romanFor.join(' - ')}</p>`;
      wrap.appendChild(box);
    });
    if (top.length > 1) {
      const note = document.createElement('p');
      note.className = 'theory-note-small';
      note.textContent = 'Hay más de una tonalidad con la misma puntuación — es normal: las tonalidades relativas (ej. Do mayor y La menor) comparten exactamente los mismos acordes, así que solo el oído (cuál "suena a casa") distingue cuál es la de verdad.';
      wrap.appendChild(note);
    }
    $('#raTransposeRow').style.display = 'flex';
  }

  function renderTransposedProgression(targetRoot){
    const chords = state.reverseAnalysis.chords;
    if (chords.length === 0) return;
    const shift = ((targetRoot - chords[0].root) % 12 + 12) % 12;
    const transposed = chords.map(c => ({ root: (c.root + shift) % 12, quality: c.quality }));
    const wrap = $('#raTransposeResult');
    wrap.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'ft-answer';
    const qSuffix = q => q === 'major' ? '' : q === 'minor' ? 'm' : q === 'dim' ? '°' : '+';
    box.innerHTML = `<h4>Transportada (+${shift} semitono${shift === 1 ? '' : 's'})</h4>
      <p>${transposed.map(c => DISPLAY[c.root] + qSuffix(c.quality)).join(' - ')}</p>`;
    const btn = document.createElement('button');
    btn.className = 'ft-action-btn';
    btn.textContent = '🔊 Escuchar';
    btn.addEventListener('click', () => {
      transposed.forEach((c, i) => setTimeout(() => {
        const rootMidi = (4 + 1) * 12 + c.root;
        TRIAD_QUALITIES[c.quality].formula.forEach(iv => playPianoTone(rootMidi + iv));
      }, i * 700));
    });
    box.appendChild(btn);
    wrap.appendChild(box);
  }

  function renderChordPanel(){
    document.querySelectorAll('#chordQualityGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.quality === state.chordQuality);
    });
    document.querySelectorAll('#acordesModeGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.acmode === state.acordesMode);
    });
    document.querySelectorAll('#progViewGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.progview === state.progViewMode);
    });
    document.querySelectorAll('#cagedViewGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.cagedview === state.cagedView);
    });
    document.querySelectorAll('#progFormGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.form === state.activeForm);
    });

    const isProg = state.acordesMode === 'progresion';
    const isIndividual = state.acordesMode === 'individual';
    const walking = isProg && state.progViewMode === 'bajo';
    const cagedEligible = isIndividual && CAGED_ELIGIBLE.has(state.chordQuality);
    const showCaged = cagedEligible && state.cagedView === 'caged';

    $('#chordQualityRow').style.display = isIndividual ? 'flex' : 'none';
    $('#cagedToggleRow').style.display = cagedEligible ? 'flex' : 'none';
    $('#progKeyRow').style.display = isProg ? 'flex' : 'none';
    $('#progFormRow').style.display = isProg ? 'flex' : 'none';
    $('#progDegreesRow').style.display = (isProg && !state.activeForm) ? 'flex' : 'none';
    $('#progSequenceRow').style.display = (isProg && !walking) ? 'flex' : 'none';
    $('#progViewRow').style.display = isProg ? 'flex' : 'none';
    $('#bassPatternRow').style.display = walking ? 'flex' : 'none';
    $('#jamSummary').style.display = isProg ? 'flex' : 'none';

    $('#chordPanel').style.display = (isIndividual && !showCaged) ? 'flex' : 'none';
    $('#cagedPanel').style.display = showCaged ? 'flex' : 'none';
    $('#progChordsPanel').style.display = (isProg && !walking) ? 'flex' : 'none';
    $('.board-shell').style.display = walking ? 'flex' : 'none';
    $('.riff-panel').style.display = walking ? 'flex' : 'none';
    $('#fingerLine').style.display = walking ? '' : 'none';

    if (isProg) renderJamSummary();

    if (walking) {
      if (state.instrument !== 'bajo') state.instrument = 'bajo';
      updateRiffPanel();
    } else if (isProg) {
      renderProgControls();
      renderProgChordsPanel();
    } else if (showCaged) {
      renderCagedPanel();
    } else {
      displayChord(state.root, state.chordQuality);
    }
  }

  // pinta TODAS las tarjetas de acorde de la progresión a la vez (no una sola que va cambiando),
  // para poder seguirlas al propio ritmo o verlas resaltarse en directo al reproducir
  function chordFormulaText(qualityKey){
    return CHORD_FORMULAS[qualityKey].map(([deg]) => deg).join('-');
  }

  function renderCagedPanel(){
    const row = $('#cagedRow');
    row.innerHTML = '';
    const positions = computeCagedPositions(state.root, state.chordQuality);
    const q = CHORD_QUALITIES[state.chordQuality];
    const chordName = DISPLAY[state.root] + q.suffix;
    const formulaText = chordFormulaText(state.chordQuality);

    if (positions.length === 0) {
      row.innerHTML = '<span class="prog-empty-hint">Las 5 posiciones CAGED están disponibles para acordes Mayor y Menor.</span>';
      return;
    }

    positions.forEach((shape, i) => {
      const card = document.createElement('div');
      card.className = 'chord-mini-card';
      card.innerHTML = `
        <div class="chord-mini-roman">Posición ${i + 1} · forma ${shape.shapeName}</div>
        <div class="chord-mini-diagram">${renderChordSVG(shape)}</div>
        <div class="chord-mini-label">${chordName}</div>
        <div class="chord-mini-scale">Fórmula: ${formulaText}</div>`;
      card.addEventListener('click', () => strumChordShape(shape));
      row.appendChild(card);
    });
  }


  function renderProgChordsPanel(){
    const row = $('#progChordsRow');
    row.innerHTML = '';
    state.progShapes = [];

    if (state.activeForm) {
      const steps = FORM_TEMPLATES[state.activeForm].build(state.root);
      steps.forEach((step) => {
        const shape = buildChordShape(step.rootPc, step.qualityKey);
        const q = shape.q;
        const chordName = DISPLAY[step.rootPc] + q.suffix;
        state.progShapes.push({ shape, name: chordName });

        const card = document.createElement('div');
        card.className = 'chord-mini-card';
        card.innerHTML = `
          <div class="chord-mini-roman">${step.roman}${step.bars > 1 ? ' (x' + step.bars + ')' : ''}</div>
          <div class="chord-mini-diagram">${renderChordSVG(shape)}</div>
          <div class="chord-mini-label">${chordName}</div>
          <div class="chord-mini-scale">Fórmula: ${chordFormulaText(step.qualityKey)}</div>`;
        card.addEventListener('click', () => strumChordShape(shape));
        row.appendChild(card);
      });
      return;
    }

    if (state.progression.length === 0) {
      row.innerHTML = '<span class="prog-empty-hint">Construye una progresión arriba para verla aquí, acorde a acorde.</span>';
      return;
    }

    state.progression.forEach((d, i) => {
      const info = degreeChordInfo(d, state.progKey, state.root);
      const shape = buildChordShape(info.chordRootPc, info.qualityKey);
      const q = shape.q;
      const chordName = DISPLAY[info.chordRootPc] + q.suffix;
      state.progShapes.push({ shape, name: chordName });

      const modeKey = suggestedModeForDegree(d, state.progKey);
      const modeName = SCALES[modeKey].name;

      const card = document.createElement('div');
      card.className = 'chord-mini-card';
      card.dataset.step = i;
      card.innerHTML = `
        <div class="chord-mini-roman">${info.roman}</div>
        <div class="chord-mini-diagram">${renderChordSVG(shape)}</div>
        <div class="chord-mini-label">${chordName}</div>
        <div class="chord-mini-scale">Fórmula: ${chordFormulaText(info.qualityKey)}</div>
        <div class="chord-mini-scale">🎯 ${DISPLAY[info.chordRootPc]} ${modeName}</div>
        <button class="chord-mini-gobtn" data-root="${info.chordRootPc}" data-scale="${modeKey}">Ver en Escalas</button>`;
      card.addEventListener('click', () => strumChordShape(shape));
      card.querySelector('.chord-mini-gobtn').addEventListener('click', (e) => {
        e.stopPropagation();
        state.root = info.chordRootPc;
        state.scaleKey = modeKey;
        state.tab = 'escalas';
        render();
      });
      row.appendChild(card);
    });
  }


  function renderProgControls(){
    document.querySelectorAll('#progKeyGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.key === state.progKey);
    });

    // presets de la tonalidad activa
    const presetWrap = $('#progPresetGroup');
    presetWrap.innerHTML = '';
    PROG_PRESETS[state.progKey].forEach(preset => {
      const b = document.createElement('button');
      b.textContent = preset.label;
      b.addEventListener('click', () => {
        state.progression = preset.degrees.slice();
        state.activeForm = null;
        render();
      });
      presetWrap.appendChild(b);
    });

    // los 7 grados diatónicos de la tónica actual, como botones para construir la progresión
    const degWrap = $('#progDegreesGroup');
    degWrap.innerHTML = '';
    for (let d = 0; d < 7; d++) {
      const info = degreeChordInfo(d, state.progKey, state.root);
      const q = CHORD_QUALITIES[info.qualityKey];
      const b = document.createElement('button');
      b.textContent = `${info.roman} ${DISPLAY[info.chordRootPc]}${q.suffix}`;
      b.addEventListener('click', () => {
        state.progression.push(d);
        state.activeForm = null;
        render();
      });
      degWrap.appendChild(b);
    }

    // chips de la secuencia construida
    const chipsWrap = $('#progChips');
    chipsWrap.innerHTML = '';
    if (state.activeForm) {
      const steps = FORM_TEMPLATES[state.activeForm].build(state.root);
      chipsWrap.innerHTML = `<span class="prog-chip" style="cursor:default;">${FORM_TEMPLATES[state.activeForm].label}: ${steps.map(s => s.roman).join(' - ')}</span>`;
    } else if (state.progression.length === 0) {
      chipsWrap.innerHTML = '<span class="prog-empty-hint">Toca los grados de arriba, o elige un preset, para construir tu progresión…</span>';
    } else {
      state.progression.forEach((d, i) => {
        const info = degreeChordInfo(d, state.progKey, state.root);
        const q = CHORD_QUALITIES[info.qualityKey];
        const chip = document.createElement('span');
        chip.className = 'prog-chip';
        chip.textContent = `${info.roman} ${DISPLAY[info.chordRootPc]}${q.suffix}`;
        chip.dataset.step = i;
        chipsWrap.appendChild(chip);
        if (i < state.progression.length - 1) {
          const arrow = document.createElement('span');
          arrow.className = 'prog-chip-arrow';
          arrow.textContent = '→';
          chipsWrap.appendChild(arrow);
        }
      });
    }
    $('#progPlayBtn').disabled = (state.progression.length === 0 && !state.activeForm) || state.progPlaying;
  }

  // muestra los botones "convertir a modo" solo cuando la escala activa es Mayor o Menor
  // (las escalas "base" de la receta), y solo en la pestaña Escalas.
  function renderModeConvertRow(){
    const modeRecipe = MODE_RECIPES[state.scaleKey];
    const forwardRecipes = Object.entries(MODE_RECIPES).filter(([key, r]) => r.from === state.scaleKey);
    const show = state.tab === 'escalas' && (modeRecipe || forwardRecipes.length > 0);
    $('#modeConvertRow').style.display = show ? 'flex' : 'none';
    if (!show) return;
    const wrap = $('#modeConvertGroup');
    wrap.innerHTML = '';

    if (modeRecipe) {
      // la escala actual es un modo derivado: ofrecer la vuelta a su escala de partida
      const b = document.createElement('button');
      b.textContent = `← Volver a ${SCALES[modeRecipe.from].name}`;
      b.title = `Vuelve a la escala de donde sale este modo`;
      b.addEventListener('click', () => convertToMode(modeRecipe.from, modeRecipe));
      wrap.appendChild(b);
    }

    forwardRecipes.forEach(([key, recipe]) => {
      const b = document.createElement('button');
      b.textContent = `→ ${recipe.label} (${recipe.short})`;
      b.title = `${SCALES[recipe.from].name} con el grado ${recipe.degrees.map(d=>d.n).join(' y ')} ${recipe.degrees[0].dir==='up'?'subido':'bajado'}`;
      b.addEventListener('click', () => convertToMode(key, recipe));
      wrap.appendChild(b);
    });
  }

  // cambia la escala al modo elegido y resalta un instante la(s) nota(s) que realmente cambian
  function convertToMode(targetKey, recipe){
    const baseIntervals = SCALES[state.scaleKey].intervals;
    const targetIntervals = SCALES[targetKey].intervals;
    const changedPcs = recipe.degrees.map(d => (state.root + targetIntervals[d.n - 1]) % 12);

    state.scaleKey = targetKey;
    render();

    changedPcs.forEach(pc => {
      document.querySelectorAll(`.note-circle[data-pc="${pc}"]`).forEach(el => {
        el.classList.add('mode-flash');
        setTimeout(() => el.classList.remove('mode-flash'), 2300);
      });
    });
  }

  // ---------- 3 NOTAS POR CUERDA (Three Notes Per String) ----------
  // Solo tiene sentido con escalas de 7 notas (modos y flamenco); pentatónica/blues quedan fuera.
  const THREE_NPS_SCALES = new Set([
    'jonico','dorico','frigio','lidio','mixolidio','eolico','locrio','flamenco',
    'menor_armonica','armonica_locrio6','armonica_jonico5','armonica_dorico4','armonica_lidio2','armonica_superloc',
    'menor_melodica','melodica_dorico2','melodica_lidioaum','melodica_lidiodom','melodica_mixo6','melodica_locrio2','melodica_alterada'
  ]);

  // construye la secuencia empezando en la cuerda más grave, en el traste indicado: avanza
  // cuerda a cuerda tomando siempre las 3 notas de la escala más graves que sean más agudas que
  // la última tomada (sin repetir traste hacia atrás). Devuelve null si no caben 3 en alguna cuerda
  // o si el resultado se sale del mástil (traste > MAX_FRET).
  function build3NPSSequence(startFret){
    const tuning = TUNINGS[state.instrument];
    const openMidi = OPEN_MIDI[state.instrument];
    const inScale = scaleSet();
    const seq = [];
    let lastMidi = openMidi[0] + startFret - 1;
    for (let s = 0; s < tuning.length; s++) {
      const openNote = tuning[s];
      const found = [];
      for (let f = 0; f <= MAX_FRET + 4; f++) { // margen de búsqueda; se descarta después si no cabe
        const midi = openMidi[s] + f;
        const pc = (pitchClassIndex(openNote) + f) % 12;
        if (midi > lastMidi && inScale.has(pc)) {
          found.push({ sIdx: s, fret: f, pc, midi });
          if (found.length === 3) break;
        }
      }
      if (found.length < 3) return null;
      seq.push(...found);
      lastMidi = found[2].midi;
    }
    if (Math.max(...seq.map(n => n.fret)) > MAX_FRET) return null;
    return seq;
  }

  // patrones disponibles para la tónica/escala/instrumento actuales: uno por cada grado de la
  // escala que pueda servir de nota de partida en la cuerda más grave y quepa entero en el mástil.
  function compute3NPSPatterns(){
    const tuning = TUNINGS[state.instrument];
    const inScale = scaleSet();
    const patterns = [];
    for (let f = 0; f <= MAX_FRET; f++) {
      const pc0 = (pitchClassIndex(tuning[0]) + f) % 12;
      if (!inScale.has(pc0)) continue;
      const seq = build3NPSSequence(f);
      if (seq) patterns.push({ startFret: f, seq });
    }
    return patterns.map((p, i) => ({
      id: 'nps' + i,
      label: 'Patrón ' + (i + 1),
      range: [Math.min(...p.seq.map(n => n.fret)), Math.max(...p.seq.map(n => n.fret))],
      seq: p.seq
    }));
  }

  function current3NPSPattern(){
    const patterns = compute3NPSPatterns();
    if (patterns.length === 0) return null;
    return patterns.find(p => p.id === state.npsPattern) || patterns[0];
  }

  // ---------- EJERCICIOS DE DESTREZA (TÉCNICA) ----------
  // no dependen de ninguna escala: en cada cuerda se tocan 4 trastes consecutivos con los 4 dedos.
  // Varias variantes clásicas de dexterity, todas construidas a partir de los mismos datos base.
  function chromaticNotesPerString(){
    const tuning = TUNINGS[state.instrument];
    const openMidi = OPEN_MIDI[state.instrument];
    const start = state.chromaticStartFret;
    return tuning.map((openNote, sIdx) => {
      const frets = [start, start + 1, start + 2, start + 3].filter(f => f <= MAX_FRET);
      return frets.map(f => ({
        sIdx, fret: f, pc: (pitchClassIndex(openNote) + f) % 12,
        midi: openMidi[sIdx] + f, finger: f - start + 1
      }));
    });
  }

  // set de "cuerda-traste" para filtrar el mástil (igual patrón que 3NPS/mástil)
  function chromaticSet(){
    const set = new Set();
    chromaticNotesPerString().forEach(strNotes => strNotes.forEach(n => set.add(n.sIdx + '-' + n.fret)));
    return set;
  }

  // "pares primero, luego impares": genera un orden de cuerdas que salta (no toca dos cuerdas
  // adyacentes seguidas) siempre que sea posible. En instrumentos de 4 cuerdas la última
  // transición no puede evitar ser adyacente (matemáticamente, con solo 4 elementos) — se avisa
  // en la etiqueta del ejercicio.
  function stringSkipOrder(n){
    const evens = [], odds = [];
    for (let i = 0; i < n; i++) (i % 2 === 0 ? evens : odds).push(i);
    return evens.concat(odds);
  }

  const TECNICA_EXERCISES = {
    arana:     { label: 'Araña (1-2-3-4)' },
    arana_inv: { label: 'Araña invertida (4-3-2-1)' },
    zigzag:    { label: 'Zigzag (1-3-2-4)' },
    barrido:   { label: 'Barrido por traste' },
    salto:     { label: 'Salto de cuerdas' }
  };

  // construye solo el tramo de IDA de cada variante; la vuelta se genera siempre igual (espejo)
  function buildExerciseAscent(perString, exerciseKey){
    const minLen = Math.min(...perString.map(s => s.length));
    if (minLen === 0) return [];
    const trimmed = perString.map(s => s.slice(0, minLen));

    switch (exerciseKey) {
      case 'arana_inv':
        return trimmed.map(s => s.slice().reverse()).flat();
      case 'zigzag': {
        if (minLen < 4) return trimmed.flat(); // no hay suficientes notas para reordenar 1-3-2-4
        return trimmed.map(s => [s[0], s[2], s[1], s[3]]).flat();
      }
      case 'barrido': {
        const seq = [];
        for (let i = 0; i < minLen; i++) trimmed.forEach(s => seq.push(s[i]));
        return seq;
      }
      case 'salto': {
        const order = stringSkipOrder(trimmed.length);
        return order.map(i => trimmed[i]).flat();
      }
      case 'arana':
      default:
        return trimmed.flat();
    }
  }

  // secuencia completa "ida y vuelta": la ida según la variante elegida, y la vuelta es siempre
  // el espejo exacto de la ida (mismas notas, orden invertido, sin repetir la nota bisagra).
  function buildChromaticExercise(){
    const perString = chromaticNotesPerString();
    const asc = buildExerciseAscent(perString, state.tecnicaExercise);
    if (asc.length === 0) return [];
    return asc.concat(asc.slice(0, -1).reverse());
  }


  function scaleSet(){
    if (state.chromatic) return new Set(NOTES.map((_, i) => i)); // las 12 notas, para verificar posiciones
    const rootIdx = state.root;
    const intervals = SCALES[state.scaleKey].intervals;
    return new Set(intervals.map(i => (rootIdx + i) % 12));
  }

  // sugerencia de dedo (1-4) para una posición de mano fija: solo tiene sentido con una caja/zona
  // concreta (no en "Todo", que abarca los 15 trastes). Aproximación estándar: dedo = distancia
  // desde el primer traste de la ventana + 1, tope en el meñique (4).
  function fingerFor(fret, lo){
    if (fret === 0) return null; // cuerda al aire, sin dedo
    return Math.min(4, Math.max(1, fret - lo + 1));
  }

  function usingWalkingBass(){
    return state.tab === 'acordes' && state.acordesMode === 'progresion' && state.progViewMode === 'bajo';
  }

  function currentRange(){
    if (state.tab === 'mastil') return [1, 16]; // mástil de referencia completo, traste 1 al 16
    if (state.tab === 'tecnica') {
      const s = state.chromaticStartFret;
      return [s, Math.min(s + 3, MAX_FRET)];
    }
    if (usingWalkingBass()) {
      const line = buildBassLine();
      if (line.length > 0) return [Math.min(...line.map(n => n.fret)), Math.max(...line.map(n => n.fret))];
      return [0, WALKING_SEARCH_MAX_FRET];
    }
    if (state.tab === 'licks' && state.lickMode === 'house') {
      const notes = houseBoxNotes();
      if (notes.length > 0) return [Math.min(...notes.map(n => n.fret)), Math.max(...notes.map(n => n.fret))];
      return [0, 4];
    }
    if (state.tab === 'licks' && state.lickMode === 'transcrito') {
      const notes = currentLickNotes();
      if (notes.length > 0) return [Math.min(...notes.map(n => n.fret)), Math.max(...notes.map(n => n.fret))];
      return [0, 4];
    }
    if (usingSequenceMode()) return [0, MAX_FRET]; // secuencia de calentamiento: mástil entero
    if (state.tab === 'escalas' && state.threeNPS && THREE_NPS_SCALES.has(state.scaleKey)) {
      const pattern = current3NPSPattern();
      if (pattern) return pattern.range;
    }
    const list = activeZoneList();
    const z = list.find(z => z.id === state.zone) || list[0] || { range: [0, MAX_FRET] };
    return z.range;
  }

  // orden de trastes izquierda->derecha según mano
  function fretOrder(){
    const [lo, hi] = currentRange();
    const frets = [];
    for (let f = lo; f <= hi; f++) frets.push(f);
    return state.lefty ? frets.slice().reverse() : frets;
  }

  // orden de cuerdas arriba->abajo (índices sobre TUNINGS[instrumento])
  // diestro: grave arriba -> aguda abajo (vista estándar del guitarrista)
  // zurdo:   aguda arriba -> grave abajo (Mi grave queda ABAJO)
  function stringRenderOrder(){
    const n = TUNINGS[state.instrument].length;
    const idx = [...Array(n).keys()];
    return state.lefty ? idx.slice().reverse() : idx;
  }

  // Vista de cada sección. Estilos, Licks, Mástil, Técnica y la línea de bajo reutilizan el motor de escalas ya
  // verificado con su propia escala/zona: se aplica sobre `state` mientras se pinta O SE CONSTRUYE UN RIFF y se
  // restaura al acabar, así la pestaña "Escalas" nunca se entera del préstamo.
  // Antes el préstamo solo envolvía render(): lo que reconstruía el riff fuera de render (el entrenador de velocidad,
  // el patrón de púa) usaba la escala de Escalas — en Estilos el riff cambiaba de notas tras la primera vuelta.
  let vistaActiva = false;
  function conVistaDeSeccion(fn){
    if (vistaActiva) return fn([]);            // ya dentro de una vista (p. ej. render → updateRiffPanel)
    const usingStyle = state.tab === 'estilos';
    const usingMastil = state.tab === 'mastil';
    const usingTecnica = state.tab === 'tecnica';
    const usingLicks = state.tab === 'licks';
    const usingWalking = usingWalkingBass();
    const saved = usingStyle
      ? { scaleKey: state.scaleKey, chromatic: state.chromatic, zoneMode: state.zoneMode, zone: state.zone }
      : null;
    const savedLicks = usingLicks ? { scaleKey: state.scaleKey, chromatic: state.chromatic } : null;
    const savedChromatic = (usingMastil || usingTecnica || usingWalking) ? state.chromatic : null;
    let styleBoxes = [];
    if (usingStyle) {
      // la escala propia del estilo y la caja elegida (o la primera, si aún no se ha elegido ninguna o la tónica
      // cambió y esa caja ya no existe)
      state.scaleKey = STYLES[state.style].scaleKey;
      state.chromatic = false;
      state.zoneMode = 'auto';
      styleBoxes = computeBoxes();
      const validChoice = styleBoxes.find(b => b.id === state.styleZone);
      state.zone = validChoice ? validChoice.id : (styleBoxes.length ? styleBoxes[0].id : 'full');
      state.styleZone = state.zone;
    }
    if (usingMastil || usingTecnica || usingWalking) {
      state.chromatic = true; // mástil / técnica / línea de bajo: no dependen de ninguna escala
    }
    if (usingLicks) {
      // Licks siempre usa pentatónica menor (base clásica del blues/rock), tanto en modo
      // House Pattern como en modo Caja — la Zona (para el modo Caja) es la que ya elige
      // el usuario en la fila de Zona reutilizada, sin tocarla aquí.
      state.chromatic = false;
      state.scaleKey = 'pent_menor';
    }
    vistaActiva = true;
    try {
      return fn(styleBoxes);
    } finally {
      vistaActiva = false;
      if (usingStyle) Object.assign(state, saved);
      if (usingLicks) Object.assign(state, savedLicks);
      if (usingMastil || usingTecnica || usingWalking) state.chromatic = savedChromatic; // se restaura la preferencia real del usuario
    }
  }

  function render(){
    conVistaDeSeccion(styleBoxes => renderInner(state.tab === 'estilos', styleBoxes));
  }

  // pestañas "autocontenidas" (no forman parte del mástil de guitarra/bajo: Piano, Tríadas,
  // Oído) — ocultan TODO lo específico de guitarra/bajo de golpe, en un único sitio. Antes cada
  // pestaña autocontenida repetía su propia lista a mano, y 7 elementos nuevos (power chords,
  // técnicas de mástil, y 5 de la fila de progresión) se habían quedado fuera de las 3 listas —
  // se quedaban visibles "colgando" si venías de otra pestaña con esas filas abiertas. Con una
  // sola lista centralizada, cualquier fila nueva que se añada en el futuro solo hay que
  // incluirla aquí una vez.
  const GUITAR_ONLY_IDS = [
    'rootRow', 'zoneRow', 'fingerLine', 'chordPanel', 'progChordsPanel', 'instrumentGroup',
    'quizPanel', 'chordQualityRow', 'acordesModeRow', 'progKeyRow', 'progDegreesRow',
    'progSequenceRow', 'tecnicaRow', 'tecnicaExerciseRow', 'pickingModeRow', 'theorySection',
    'modeTheorySection', 'circleTheorySection', 'powerChordSection', 'lickTechSection', 'barreTechSection',
    'cagedToggleRow', 'progFormRow', 'progViewRow', 'bassPatternRow', 'jamSummary',
    'extensionsSection', 'seventhHarmonySection', 'chordScaleSection', 'chromaticApproachSection',
    'reverseAnalysisSection', 'cadencesSection',
    'patternGroup', 'styleGroup', 'styleRandomBtn', 'scaleSelect', 'chromaticToggle',
    'quizToggle', 'styleZoneRow', 'licksRow', 'licksPickRow', 'licksExplainer'
  ];
  const GUITAR_ONLY_CLASSES = ['board-shell', 'riff-panel'];

  function hideAllGuitarUI(){
    GUITAR_ONLY_IDS.forEach(id => { const el = $('#' + id); if (el) el.style.display = 'none'; });
    GUITAR_ONLY_CLASSES.forEach(cls => { const el = document.querySelector('.' + cls); if (el) el.style.display = 'none'; });
    $('footer').style.display = 'none';
  }

  function renderInner(usingStyle, styleBoxes){
    const usingAcordes = state.tab === 'acordes';
    const usingMastil = state.tab === 'mastil';
    const usingTecnica = state.tab === 'tecnica';
    const usingLicks = state.tab === 'licks';
    const usingPiano = state.tab === 'piano';
    const usingTriads = state.tab === 'triads';
    const usingOido = state.tab === 'oido';
    const usingVoice = state.tab === 'voz';
    if (!usingVoice) stopVoiceListening(); // corta el micro al salir de la pestaña, por privacidad y batería
    document.querySelectorAll('#tabGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === state.tab);
    });
    $('#oidoShell').style.display = usingOido ? 'flex' : 'none';
    $('#triadShell').style.display = usingTriads ? 'flex' : 'none';
    $('#pianoShell').style.display = usingPiano ? 'flex' : 'none';
    $('#voiceShell').style.display = usingVoice ? 'flex' : 'none';
    if (usingOido) { hideAllGuitarUI(); renderOidoSection(); return; }
    if (usingTriads) { hideAllGuitarUI(); renderTriadSection(); return; }
    if (usingPiano) { hideAllGuitarUI(); renderPianoSection(); return; }
    if (usingVoice) { hideAllGuitarUI(); renderVoiceSection(); return; }
    $('#rootRow').style.display = 'flex';
    $('#theorySection').style.display = '';
    $('#modeTheorySection').style.display = '';
    $('#circleTheorySection').style.display = '';
    $('footer').style.display = '';
    $('#zoneRow').style.display = (usingStyle || usingAcordes || usingMastil || usingTecnica || (usingLicks && state.lickMode === 'house')) ? 'none' : 'flex';
    $('#styleZoneRow').style.display = (usingStyle && !usingAcordes) ? 'flex' : 'none';
    $('#tecnicaRow').style.display = usingTecnica ? 'flex' : 'none';
    $('#tecnicaExerciseRow').style.display = usingTecnica ? 'flex' : 'none';
    $('#licksRow').style.display = usingLicks ? 'flex' : 'none';
    $('#licksPickRow').style.display = usingLicks ? 'flex' : 'none';
    $('#licksExplainer').style.display = usingLicks ? 'block' : 'none';
    if (usingLicks) renderLicksControls();
    $('#powerChordSection').style.display = usingTecnica ? '' : 'none';
    $('#lickTechSection').style.display = usingTecnica ? '' : 'none';
    $('#barreTechSection').style.display = usingTecnica ? '' : 'none';
    if (usingTecnica) { renderPowerChordSection(); renderLickTechSection(); renderBarreTechSection(); }
    $('#pickingModeRow').style.display = (state.tab === 'escalas' || usingTecnica) ? 'flex' : 'none';
    $('#chordQualityRow').style.display = usingAcordes ? 'flex' : 'none';
    $('#acordesModeRow').style.display = usingAcordes ? 'flex' : 'none';
    $('#progKeyRow').style.display = (usingAcordes && state.acordesMode === 'progresion') ? 'flex' : 'none';
    $('#progDegreesRow').style.display = (usingAcordes && state.acordesMode === 'progresion') ? 'flex' : 'none';
    $('#progSequenceRow').style.display = (usingAcordes && state.acordesMode === 'progresion') ? 'flex' : 'none';
    $('#progFormRow').style.display = (usingAcordes && state.acordesMode === 'progresion') ? 'flex' : 'none';
    $('#progViewRow').style.display = (usingAcordes && state.acordesMode === 'progresion') ? 'flex' : 'none';
    $('#bassPatternRow').style.display = (usingAcordes && state.acordesMode === 'progresion' && state.progViewMode === 'bajo') ? 'flex' : 'none';
    $('#jamSummary').style.display = (usingAcordes && state.acordesMode === 'progresion') ? 'flex' : 'none';
    $('#cagedToggleRow').style.display = (usingAcordes && state.acordesMode === 'individual' && CAGED_ELIGIBLE.has(state.chordQuality)) ? 'flex' : 'none';
    $('#extensionsSection').style.display = usingAcordes ? '' : 'none';
    $('#seventhHarmonySection').style.display = usingAcordes ? '' : 'none';
    $('#chordScaleSection').style.display = (usingAcordes && state.acordesMode === 'individual') ? '' : 'none';
    $('#chromaticApproachSection').style.display = usingAcordes ? '' : 'none';
    $('#reverseAnalysisSection').style.display = usingAcordes ? '' : 'none';
    $('#cadencesSection').style.display = usingAcordes ? '' : 'none';
    if (usingAcordes) {
      renderExtensionsSection();
      renderSeventhHarmonySection();
      if (state.acordesMode === 'individual') renderChordScaleSection();
      renderReverseAnalysisSection();
      renderCadencesSection();
    }
    $('.board-shell').style.display = usingAcordes ? 'none' : 'flex';
    $('.riff-panel').style.display = (usingAcordes || usingMastil) ? 'none' : 'flex';
    $('#fingerLine').style.display = (usingAcordes || usingMastil) ? 'none' : '';
    $('#chordPanel').style.display = usingAcordes ? 'flex' : 'none';
    if (!usingAcordes) $('#progChordsPanel').style.display = 'none';
    $('#instrumentGroup').style.display = usingAcordes ? 'none' : 'flex';
    if (state.quiz.active && (usingAcordes || usingMastil || usingTecnica)) { stopQuiz(); }
    $('#quizPanel').style.display = ((usingAcordes || usingMastil || usingTecnica) || !state.quiz.active) ? 'none' : 'flex';
    $('#patternGroup').style.display = (usingStyle || usingTecnica) ? 'none' : 'flex';
    $('#styleGroup').style.display = usingStyle ? 'flex' : 'none';
    $('#styleRandomBtn').style.display = usingStyle ? '' : 'none';
    $('#scaleSelect').style.display = (usingStyle || usingMastil || usingTecnica) ? 'none' : '';
    $('#chromaticToggle').style.display = (usingStyle || usingAcordes || usingMastil || usingTecnica) ? 'none' : '';
    $('#quizToggle').style.display = (usingStyle || usingAcordes || usingMastil || usingTecnica) ? 'none' : '';
    $('#riffPanelLabel').textContent = usingStyle ? 'Riff de estilo' : (usingTecnica ? TECNICA_EXERCISES[state.tecnicaExercise].label : 'Riff de práctica');
    document.querySelectorAll('#styleGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.style === state.style);
    });
    if (usingStyle) renderStyleZoneButtons(styleBoxes);
    if (usingAcordes) renderChordPanel();
    if (usingTecnica) renderTecnicaControls();
    renderModeConvertRow();
    updateCapoInfo();
    $('#fretCountFooter').textContent = usingMastil
      ? '16 trastes · vista de referencia completa · la mano se cambia en ⚙️ Ajustes'
      : '15 trastes · la mano se cambia en ⚙️ Ajustes';

    $('#instrumentTag').textContent =
      (state.instrument === 'guitarra' ? 'GUITARRA' : 'BAJO') +
      ' · AFINACIÓN ESTÁNDAR (' + TUNINGS[state.instrument].join('-') + ')';

    document.querySelectorAll('#instrumentGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.instrument === state.instrument);
    });
    document.querySelectorAll('.note-btn').forEach(b => {
      b.classList.toggle('selected', Number(b.dataset.pc) === state.root);
    });
    renderZoneButtons();
    renderNPSControls();
    document.querySelectorAll('#patternGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.pattern === state.pattern);
    });
    $('#boxModeToggle').classList.toggle('active', state.zoneMode === 'auto');
    $('#handToggle').classList.toggle('active', state.lefty);
    $('#handToggle').title = state.lefty ? 'Vista zurda (clavijero der., Mi grave abajo)' : 'Vista diestra (clavijero izq., Mi grave arriba)';
    $('#chromaticToggle').classList.toggle('active', state.chromatic);
    $('#scaleSelect').disabled = state.chromatic;

    const tuning = TUNINGS[state.instrument];
    const fOrder = fretOrder();
    const sOrder = stringRenderOrder();
    const inScale = scaleSet();
    const rootIdx = state.root;

    // en modo "3 notas por cuerda", solo se muestran las notas exactas del patrón elegido,
    // no cualquier nota de la escala que caiga dentro del rango de trastes mostrado
    const nps3Active = state.tab === 'escalas' && state.threeNPS && THREE_NPS_SCALES.has(state.scaleKey);
    let nps3Set = null;
    if (nps3Active) {
      const pattern = current3NPSPattern();
      if (pattern) nps3Set = new Set(pattern.seq.map(n => n.sIdx + '-' + n.fret));
    }
    // en la pestaña Técnica, solo se muestran las notas del ejercicio cromático (4 trastes x cuerda)
    if (state.tab === 'tecnica') nps3Set = chromaticSet();
    // en la vista "línea de bajo" de Acordes > Progresión, solo las notas exactas de esa línea
    if (usingWalkingBass()) {
      nps3Set = new Set(buildBassLine().map(n => n.sIdx + '-' + n.fret));
    }
    // Licks en modo House Pattern: solo esas 5 notas concretas en las 2 cuerdas agudas,
    // no toda la caja pentatónica genérica de la Zona (que sí se muestra en modo "Caja")
    if (state.tab === 'licks' && state.lickMode === 'house') {
      nps3Set = new Set(houseBoxNotes().map(n => n.sIdx + '-' + n.fret));
    }
    if (state.tab === 'licks' && state.lickMode === 'transcrito') {
      nps3Set = new Set(currentLickNotes().map(n => n.sIdx + '-' + n.fret));
    }

    // numeración de trastes (espaciador a la DERECHA, alineado con la columna de etiquetas de cuerda)
    // con cejilla puesta, se renumera relativo a ella (la cejilla pasa a ser el "0")
    const fretNumbers = $('#fretNumbers');
    fretNumbers.style.gridTemplateColumns = `repeat(${fOrder.length}, 1fr) 40px`;
    fretNumbers.innerHTML = '';
    fOrder.forEach(f => {
      const d = document.createElement('div');
      if (state.capo > 0) {
        d.textContent = f >= state.capo ? (f - state.capo) : '';
        if (f === state.capo) d.classList.add('capo-num');
      } else {
        d.textContent = f;
        if (f === 0) d.classList.add('nut-num');
      }
      fretNumbers.appendChild(d);
    });
    fretNumbers.appendChild(document.createElement('div'));

    // mástil
    const board = $('#fretboard');
    board.classList.toggle('quiz-mode', state.quiz.active);
    board.innerHTML = '';
    board.style.gridTemplateRows = `repeat(${sOrder.length}, 1fr)`;
    board.style.gridTemplateColumns = `repeat(${fOrder.length}, 1fr)`;

    // líneas de traste: continuas de arriba a abajo, calculadas una sola vez sobre todo el mástil
    const fretLines = document.createElement('div');
    fretLines.className = 'fret-lines';
    for (let i = 1; i < fOrder.length; i++) {
      const a = fOrder[i - 1], b = fOrder[i];
      const isNut = (a === 0 && b === 1) || (a === 1 && b === 0);
      const isCapo = state.capo > 0 && ((a === state.capo - 1 && b === state.capo) || (a === state.capo && b === state.capo - 1));
      const wire = document.createElement('div');
      wire.className = 'fret-wire' + (isNut ? ' nut-wire' : '') + (isCapo ? ' capo-wire' : '');
      wire.style.left = ((i / fOrder.length) * 100) + '%';
      fretLines.appendChild(wire);
    }
    board.appendChild(fretLines);

    // columna de etiquetas de cuerda (a la derecha del mástil)
    const labelsCol = $('#stringLabels');
    labelsCol.innerHTML = '';

    sOrder.forEach(sIdx => {
      const openNote = tuning[sIdx];
      const row = document.createElement('div');
      row.className = 'string-row';
      row.style.gridTemplateColumns = `repeat(${fOrder.length}, 1fr)`;

      const stringLine = document.createElement('div');
      stringLine.className = 'string-line';
      row.appendChild(stringLine);

      fOrder.forEach((fret) => {
        const cell = document.createElement('div');
        cell.className = 'fret-cell' + (state.capo > 0 && fret < state.capo ? ' behind-capo' : '');
        cell.dataset.string = sIdx;
        cell.dataset.fret = fret;

        if ([3,5,7,9,15].includes(fret)) {
          const dot = document.createElement('div');
          dot.className = 'inlay';
          cell.appendChild(dot);
        } else if (fret === 12) {
          const d1 = document.createElement('div'); d1.className = 'inlay double-a';
          const d2 = document.createElement('div'); d2.className = 'inlay double-b';
          cell.appendChild(d1); cell.appendChild(d2);
        }

        const pc = (pitchClassIndex(openNote) + fret) % 12;
        const isScaleTone = inScale.has(pc) && (!nps3Set || nps3Set.has(sIdx + '-' + fret));
        if (isScaleTone) {
          if (state.quiz.active) {
            const dot = document.createElement('div');
            dot.className = 'quiz-dot';
            cell.appendChild(dot);
          } else {
            const circle = document.createElement('div');
            const isRoot = pc === rootIdx;
            circle.className = 'note-circle' + (isRoot ? ' is-root' : '');
            circle.style.background = isRoot ? ROOT_COLOR : NOTE_COLORS[pc];
            circle.textContent = DISPLAY[pc];
            circle.dataset.pc = pc;
            cell.appendChild(circle);

            if ((state.zone !== 'full' || nps3Set) && !usingSequenceMode()) {
              const finger = fingerFor(fret, currentRange()[0]);
              if (finger) {
                const badge = document.createElement('div');
                badge.className = 'finger-badge';
                badge.textContent = finger;
                cell.appendChild(badge);
              }
            }
          }
        }

        if (state.quiz.active) {
          cell.addEventListener('click', () => handleQuizGuess(cell, pc));
        }

        row.appendChild(cell);
      });

      board.appendChild(row);

      // etiqueta de esta cuerda, en la columna aparte
      const stringNumber = tuning.length - sIdx; // cuerda 6..1 (guitarra) o 4..1 (bajo)
      const labelWrap = document.createElement('div');
      labelWrap.className = 'string-label';
      labelWrap.innerHTML = `<span class="badge"><span class="snum">${stringNumber}</span><span class="sletter">${openNote}</span></span>`;
      labelWrap.title = `Cuerda ${stringNumber} · afinada en ${openNote}`;
      labelsCol.appendChild(labelWrap);
    });

    updateRiffPanel();
    renderTheorySection();
  }

  // ---------- RIFF ----------
  // notas reales de la posición actual (cuerda+traste), ordenadas de grave a agudo, sin duplicar altura
  function usingSequenceMode(){
    return state.tab === 'escalas' && state.sequenceMode !== 'off';
  }

  // secuencia de calentamiento fiel a la escala: agrupa las notas reales (ya ordenadas y sin
  // duplicar altura) en grupos que se deslizan nota a nota por todo el mástil — el efecto
  // "recorrido rápido de mástil completo" típico de vídeos de demo de guitarra, pero usando
  // siempre notas verdaderas de la escala, no una caja fija repetida.
  // lista base "diagonal": sube por el mástil (o por el tramo lo-hi indicado) tomando varias
  // notas por cuerda y avanzando a la siguiente — la misma mecánica que ya usa 3 Notas/Cuerda,
  // generalizada a cualquier escala. Evita el sesgo de "ordenar todo por altura y deduplicar",
  // que siempre prefería la cuerda más grave en caso de empate de altura (más notorio cuanto
  // más ancho es el tramo, por eso se usa quirúrgicamente solo cuando el rango es amplio).
  const SEQUENCE_SPAN_FRETS = 4; // anchura de trastes que se toma en cada cuerda antes de avanzar
  function buildDiagonalRangeNotes(lo, hi){
    const tuning = TUNINGS[state.instrument];
    const openMidi = OPEN_MIDI[state.instrument];
    const inScale = scaleSet();
    const notes = [];
    let lastMidi = openMidi[0] + lo - 1;
    for (let s = 0; s < tuning.length; s++) {
      const openNote = tuning[s];
      let startFret = null;
      for (let f = lo; f <= hi; f++) {
        const midi = openMidi[s] + f;
        const pc = (pitchClassIndex(openNote) + f) % 12;
        if (midi > lastMidi && inScale.has(pc)) { startFret = f; break; }
      }
      if (startFret === null) continue; // esta cuerda no aporta nada nuevo por encima de lo ya tocado
      for (let f = startFret; f <= Math.min(startFret + SEQUENCE_SPAN_FRETS, hi); f++) {
        const midi = openMidi[s] + f;
        const pc = (pitchClassIndex(openNote) + f) % 12;
        if (inScale.has(pc)) { notes.push({ sIdx: s, fret: f, pc, midi }); lastMidi = midi; }
      }
    }
    return notes;
  }

  function buildSequenceFromNotes(notes){
    if (notes.length === 0) return [];
    let asc;
    if (state.sequenceMode === 'groups3') {
      asc = [];
      for (let i = 0; i <= notes.length - 3; i++) asc.push(notes[i], notes[i+1], notes[i+2]);
    } else if (state.sequenceMode === 'groups4') {
      asc = [];
      for (let i = 0; i <= notes.length - 4; i++) asc.push(notes[i], notes[i+1], notes[i+2], notes[i+3]);
    } else if (state.sequenceMode === 'thirds') {
      asc = [];
      for (let i = 0; i <= notes.length - 3; i++) asc.push(notes[i], notes[i+2]);
    } else {
      asc = notes;
    }
    if (asc.length === 0) return notes; // mástil visible demasiado corto para agrupar
    return asc.concat(asc.slice(0, -1).reverse()); // ida y vuelta, espejo exacto
  }

  function positionNotes(){
    if (state.tab === 'escalas' && state.threeNPS && THREE_NPS_SCALES.has(state.scaleKey)) {
      const pattern = current3NPSPattern();
      if (pattern) return pattern.seq.map(n => ({ ...n })); // ya viene ordenada ascendente por construcción
    }

    const [lo, hi] = currentRange();

    // en tramos anchos (p.ej. la zona "Todo"), el método diagonal evita que la nota se quede
    // pegada en la cuerda más grave por simple orden de iteración; en cajas normales (estrechas)
    // se mantiene intacto el método ya verificado.
    if (hi - lo > 8) return buildDiagonalRangeNotes(lo, hi);

    const tuning = TUNINGS[state.instrument];
    const midiOpen = OPEN_MIDI[state.instrument];
    const inScale = scaleSet();

    let notes = [];
    tuning.forEach((openNote, sIdx) => {
      for (let f = lo; f <= hi; f++) {
        const pc = (pitchClassIndex(openNote) + f) % 12;
        if (inScale.has(pc)) notes.push({ sIdx, fret: f, pc, midi: midiOpen[sIdx] + f });
      }
    });
    notes.sort((a,b) => a.midi - b.midi);

    const deduped = [];
    let lastMidi = null;
    notes.forEach(n => { if (n.midi !== lastMidi) { deduped.push(n); lastMidi = n.midi; } });
    return deduped;
  }

  function shuffle(arr){
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // aplica el patrón de práctica elegido sobre las notas de la posición
  function applyPattern(notes){
    if (notes.length === 0) return [];
    switch (state.pattern) {
      case 'up':
        return notes;
      case 'thirds': {
        const seq = [];
        for (let i = 0; i <= notes.length - 3; i++) { seq.push(notes[i], notes[i+2]); }
        if (seq.length === 0) return notes; // posición demasiado corta para terceras
        return seq;
      }
      case 'skip': {
        const filtered = notes.filter(n => n.sIdx % 2 === 0);
        const base = filtered.length ? filtered : notes;
        const descending = base.slice(0, -1).reverse();
        return base.concat(descending);
      }
      case 'random':
        return shuffle(notes);
      case 'updown':
      default: {
        const descending = notes.slice(0, -1).reverse();
        return notes.concat(descending);
      }
    }
  }

  // construye un "stab" de acorde real: para cada una de las N cuerdas más agudas del instrumento,
  // toma la nota de la escala más cercana al inicio de la caja actual en esa cuerda. Todas las notas
  // salen de scaleSet()/currentRange(), ya verificados — no se inventa ninguna digitación con nombre,
  // solo se asegura que cada cuerda suene una nota real de la escala dentro de la misma posición de mano.
  function buildChordVoicing(stringCount){
    const tuning = TUNINGS[state.instrument];
    const midiOpen = OPEN_MIDI[state.instrument];
    const [lo, hi] = currentRange();
    const inScale = scaleSet();
    const n = tuning.length;
    const chosenStrings = [];
    for (let i = Math.max(0, n - stringCount); i < n; i++) chosenStrings.push(i);

    const voicing = [];
    chosenStrings.forEach(sIdx => {
      const openNote = tuning[sIdx];
      for (let f = lo; f <= hi; f++) {
        const pc = (pitchClassIndex(openNote) + f) % 12;
        if (inScale.has(pc)) { voicing.push({ sIdx, fret: f, pc, midi: midiOpen[sIdx] + f }); break; }
      }
    });
    return voicing;
  }

  function buildRiff(){
    if (usingSequenceMode()) return buildSequenceFromNotes(buildDiagonalRangeNotes(0, MAX_FRET));
    return applyPattern(positionNotes());
  }

  // ---------- LICKS ----------
  // "House Pattern" (también llamado BB Box): patrón de Griff Hamlin (Blues Guitar Unleashed) que
  // mezcla, en solo 2 cuerdas agudas, 5 notas concretas de la pentatónica menor — 5ª, b7ª (por
  // debajo de la tónica), tónica, b3ª y 4ª — sin necesitar moverse de sitio en el mástil. Aquí se
  // reconstruye la forma buscando esas 5 notas EXACTAS (grados verificados) dentro de la ventana
  // de trastes más grave posible en las 2 cuerdas más agudas — no es una copia de ningún diagrama
  // de un curso de pago, es la teoría real recalculada desde cero.
  function houseBoxNotes(){
    const tuning = TUNINGS[state.instrument];
    const midiOpen = OPEN_MIDI[state.instrument];
    const n = tuning.length;
    const topStrings = [n - 2, n - 1];
    const rootPc = state.root;
    const wantedPcs = [(rootPc + 7) % 12, (rootPc + 10) % 12, rootPc, (rootPc + 3) % 12, (rootPc + 5) % 12];
    let best = null;
    for (let lo = 0; lo <= 11 && !best; lo++) {
      const hi = lo + 4;
      const found = [];
      let ok = true;
      for (const pc of wantedPcs) {
        let match = null;
        for (const sIdx of topStrings) {
          for (let f = lo; f <= hi; f++) {
            if ((pitchClassIndex(tuning[sIdx]) + f) % 12 === pc) { match = { sIdx, fret: f, pc, midi: midiOpen[sIdx] + f }; break; }
          }
          if (match) break;
        }
        if (!match) { ok = false; break; }
        found.push(match);
      }
      if (ok) best = found;
    }
    if (!best) return [];
    best.sort((a, b) => a.midi - b.midi);
    const dedup = [];
    let lastMidi = null;
    best.forEach(nt => { if (nt.midi !== lastMidi) { dedup.push(nt); lastMidi = nt.midi; } });
    return dedup;
  }

  // licks ORIGINALES (no reproducidos de ningún curso), pensados para practicar frases de solo
  // reales en vez de solo subir/bajar la escala. Cada paso referencia un índice dentro de las
  // notas reales de la caja activa (houseBoxNotes() o positionNotes(), según el modo) — igual
  // que ya hacen los riffs de Estilos, así que cualquier nota siempre sale del motor verificado.
  const LICK_LIBRARY = {
    house: [
      { name: 'Frase corta', steps: [
        {idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:2},{idx:3,dur:1},{idx:4,dur:2},{idx:2,dur:2}
      ]},
      { name: 'Repetición rítmica', steps: [
        {idx:4,dur:1},{idx:3,dur:1},{idx:4,dur:1},{idx:3,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:3}
      ]},
      { name: 'Resolución a la tónica', steps: [
        {idx:1,dur:1},{idx:2,dur:1},{idx:3,dur:1},{idx:4,dur:1},{idx:3,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:4}
      ]}
    ],
    box: [
      { name: 'Ascendente-descendente', steps: [
        {idx:0,dur:1},{idx:1,dur:1},{idx:2,dur:1},{idx:3,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:3}
      ]},
      { name: 'Motivo repetido', steps: [
        {idx:0,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:2},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:3}
      ]},
      { name: 'Frase larga con silencio', steps: [
        {idx:3,dur:1},{idx:2,dur:1},{idx:1,dur:1},{idx:0,dur:1},{rest:true,dur:1},{idx:1,dur:1},{idx:0,dur:3}
      ]}
    ]
  };

  // ---------- LICKS TRANSCRITOS de audio (subidos por el usuario) ----------
  // cada paso es {interval, sOffset, dur8}: "interval" = semitonos desde la tónica actual (así
  // se transpone solo a cualquier Tónica), "sOffset" = cuerda desde la más grave (0=Mi grave en
  // guitarra), fija para conservar la digitación/posición original de la transcripción — igual
  // de "movible" que el House Pattern, pero con notas verificadas de un audio real en vez de una
  // fórmula teórica. Transcrito por detección de tono (autocorrelación) desde el WAV subido:
  // "Birmingham Gangsters, 70 BPM, Em" (Looperman) — verificado a mano contra el propio audio,
  // pero al ser detección automática puede tener algún error puntual; revisa contra el original.
  const TRANSCRIBED_LICKS = [
    { name: 'Loop "Birmingham Gangsters" — riff principal (comp. 1)', bpmHint: 70, steps: [
      {interval:0,sOffset:0,dur8:1},{interval:10,sOffset:2,dur8:0.5},{interval:0,sOffset:0,dur8:0.5},
      {interval:10,sOffset:2,dur8:0.5},{interval:0,sOffset:2,dur8:1},{interval:0,sOffset:2,dur8:0.5},
      {interval:3,sOffset:3,dur8:0.5},{interval:0,sOffset:2,dur8:0.5},{interval:10,sOffset:2,dur8:0.5},
      {interval:7,sOffset:1,dur8:0.5},{interval:10,sOffset:2,dur8:1},{interval:0,sOffset:2,dur8:1},
      {interval:0,sOffset:0,dur8:0.5}
    ]},
    { name: 'Loop "Birmingham Gangsters" — subida (comp. 2)', bpmHint: 70, steps: [
      {interval:5,sOffset:3,dur8:1.5},{interval:5,sOffset:3,dur8:0.5},{interval:5,sOffset:3,dur8:2},
      {interval:5,sOffset:3,dur8:1},{interval:0,sOffset:2,dur8:0.5},{interval:10,sOffset:2,dur8:0.5},
      {interval:0,sOffset:0,dur8:0.5}
    ]},
    { name: 'Loop "Birmingham Gangsters" — giro final (comp. 4)', bpmHint: 70, steps: [
      {interval:0,sOffset:2,dur8:0.5},{interval:3,sOffset:3,dur8:1},{interval:3,sOffset:3,dur8:1},
      {interval:3,sOffset:3,dur8:0.5},{interval:3,sOffset:3,dur8:0.5},{interval:0,sOffset:2,dur8:0.5},
      {interval:2,sOffset:2,dur8:0.5},{interval:2,sOffset:2,dur8:0.5},{interval:2,sOffset:2,dur8:0.5},
      {interval:2,sOffset:2,dur8:1},{interval:10,sOffset:2,dur8:0.5},{interval:10,sOffset:2,dur8:0.5},
      {interval:10,sOffset:2,dur8:0.5}
    ]}
  ];

  function transcribedLickNotes(lick){
    const tuning = TUNINGS[state.instrument];
    const midiOpen = OPEN_MIDI[state.instrument];
    const n = tuning.length;
    return lick.steps.map(step => {
      const sIdx = Math.min(step.sOffset, n - 1);
      const targetPc = (state.root + step.interval) % 12;
      const openPc = pitchClassIndex(tuning[sIdx]);
      const fret = ((targetPc - openPc) % 12 + 12) % 12;
      return { sIdx, fret, pc: targetPc, midi: midiOpen[sIdx] + fret, dur8: step.dur8 };
    });
  }

  function currentLickNotes(){
    if (state.lickMode === 'house') return houseBoxNotes();
    if (state.lickMode === 'transcrito') return transcribedLickNotes(TRANSCRIBED_LICKS[Math.min(state.lickId, TRANSCRIBED_LICKS.length - 1)]);
    return positionNotes();
  }

  function buildLickRiff(){
    if (state.lickMode === 'transcrito') {
      const lick = TRANSCRIBED_LICKS[Math.min(state.lickId, TRANSCRIBED_LICKS.length - 1)];
      const notes = transcribedLickNotes(lick);
      return notes.map((n, i) => ({ ...n, durSec: (n.dur8 / 2) * (60 / state.bpm), accent: n.pc === state.root, mute: false }));
    }
    const notes = currentLickNotes();
    if (notes.length === 0) return [];
    const lib = LICK_LIBRARY[state.lickMode];
    const lickIdx = Math.min(state.lickId, lib.length - 1);
    const lick = lib[lickIdx];
    return lick.steps.map(step => {
      const durSec = (step.dur / 2) * (60 / state.bpm);
      if (step.rest) return { rest: true, sIdx: null, fret: null, midi: null, durSec };
      const n = notes[((step.idx % notes.length) + notes.length) % notes.length];
      return { ...n, durSec, accent: n.pc === state.root, mute: false };
    });
  }

  function renderLicksControls(){
    document.querySelectorAll('#licksModeGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.lickmode === state.lickMode);
    });
    const lib = state.lickMode === 'transcrito' ? TRANSCRIBED_LICKS : LICK_LIBRARY[state.lickMode];
    if (state.lickId >= lib.length) state.lickId = 0;
    const pickWrap = $('#licksPickGroup');
    pickWrap.innerHTML = '';
    lib.forEach((lick, i) => {
      const b = document.createElement('button');
      b.textContent = lick.name;
      if (i === state.lickId) b.classList.add('active');
      b.addEventListener('click', () => { state.lickId = i; render(); });
      pickWrap.appendChild(b);
    });
    $('#licksExplainer').textContent = state.lickMode === 'house'
      ? 'House Pattern (BB Box): 5 notas de la pentatónica menor repartidas en solo 2 cuerdas agudas, sin cambiar de posición — patrón de Griff Hamlin (Blues Guitar Unleashed), recalculado aquí con teoría real, no copiado de ningún diagrama.'
      : state.lickMode === 'transcrito'
      ? 'Transcrito automáticamente de un audio real (detección de tono por autocorrelación) — puede tener algún error puntual de la propia detección, contrástalo escuchando el original. Se transpone solo a la Tónica que elijas arriba, conservando la digitación original.'
      : 'Caja pentatónica: usa la Zona del mástil elegida arriba como si fuera una escala más — cambia de Zona para practicar el mismo lick en otra posición del mástil.';
  }

  // riff de estilo: aplica la plantilla rítmica del estilo sobre las notas reales de la caja
  // ya calculada (positionNotes ya está operando bajo el contexto de escala/caja prestado por render()).
  function buildStyleRiff(){
    const notes = positionNotes();
    if (notes.length === 0) return [];
    const style = STYLES[state.style];
    const variants = STYLE_TEMPLATES[state.style];
    const variantIdx = ((state.styleVariant % variants.length) + variants.length) % variants.length;
    let template = variants[variantIdx].map(s => ({ ...s }));
    if (style.swing) applySwing(template);

    // los acordes solo suenan en guitarra (en bajo no se rasguean varias cuerdas a la vez:
    // ahí se cae de forma natural a la línea monofónica, que es lo correcto para un bajo).
    const canChord = state.instrument === 'guitarra' && style.chordStrings;
    const chordVoicing = canChord ? buildChordVoicing(style.chordStrings) : null;

    let prevIdx = null;
    return template.map(step => {
      const durSec = (step.dur / 2) * (60 / state.bpm);

      if (step.rest) { prevIdx = null; return { rest: true, sIdx: null, fret: null, midi: null, durSec }; }

      if (step.chord) {
        prevIdx = null;
        if (chordVoicing && chordVoicing.length > 0) {
          return { chord: true, notesList: chordVoicing, durSec, accent: false, mute: false };
        }
        // sin acorde disponible (bajo, o caja sin suficientes cuerdas): cae a la tónica sola
        const n0 = notes[0];
        return { ...n0, durSec, accent: n0.pc === state.root, mute: false };
      }

      const n = notes[((step.idx % notes.length) + notes.length) % notes.length];
      const mute = step.mute !== undefined ? step.mute : (step.idx === prevIdx);
      prevIdx = step.idx;
      return { ...n, durSec, accent: n.pc === state.root, mute };
    });
  }

  function renderTab(riff){
    const sOrder = stringRenderOrder();
    const tuning = TUNINGS[state.instrument];
    if (riff.length === 0) return 'No hay notas de esta escala en esta zona del mástil.';

    const rows = sOrder.map(sIdx => ({ sIdx, text: tuning[sIdx] + '|' }));
    riff.forEach(step => {
      if (step.chord) {
        const byString = new Map(step.notesList.map(n => [n.sIdx, n.fret]));
        rows.forEach(row => {
          if (byString.has(row.sIdx)) {
            const fstr = String(byString.get(row.sIdx));
            row.text += (fstr.length === 1 ? '-' + fstr : fstr) + '-';
          } else {
            row.text += '---';
          }
        });
        return;
      }
      rows.forEach(row => {
        if (row.sIdx === step.sIdx) {
          const fstr = String(step.fret);
          let cell = (fstr.length === 1 ? '-' + fstr : fstr);
          row.text += cell + (step.mute ? 'x' : (step.accent ? '!' : '-'));
        } else {
          row.text += '---';
        }
      });
    });
    rows.forEach(r => r.text += '|');
    return rows.map(r => r.text).join('\n');
  }

  let currentRiff = [];
  // ---------- TEORÍA: acordes diatónicos de la escala mayor ----------
  // Reutiliza los intervalos ya verificados de SCALES.jonico (escala mayor) — no son datos nuevos.
  // El patrón de calidad de acorde (maj7-m7-m7-maj7-7-m7-m7b5) es invariante en cualquier tonalidad,
  // verificado contra Do, Si y La mayor.
  const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const QUALITY_7TH = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
  const QUALITY_TRIAD = ['', 'm', 'm', '', '', 'm', 'dim']; // sufijo de tríada simple (vacío = mayor)
  const PROGRESSION_4263 = [3, 1, 5, 2]; // grados IV-ii-vi-iii (0-indexados)

  function diatonicChords(rootPc){
    const majorIntervals = SCALES.jonico.intervals;
    return majorIntervals.map((_, d) => {
      const tones = [0,2,4,6].map(k => DISPLAY[(rootPc + majorIntervals[(d + k) % 7]) % 12]);
      const rootName = DISPLAY[(rootPc + majorIntervals[d]) % 12];
      return {
        roman: ROMAN[d],
        tones,
        chord7: rootName + QUALITY_7TH[d],
        triad: rootName + QUALITY_TRIAD[d]
      };
    });
  }

  // ---------- CÍRCULO DE QUINTAS ----------
  // orden verificado por fórmula (cada paso +7 semitonos = 5ª justa), no copiado de la imagen
  const CIRCLE_ORDER = Array.from({ length: 12 }, (_, i) => (7 * i) % 12);
  const SHARP_ORDER = ['F#','C#','G#','D#','A#','E#','B#'];
  const FLAT_ORDER = ['Bb','Eb','Ab','Db','Gb','Cb','Fb'];

  function circleAccidentals(i){
    if (i === 0) return { count: 0, type: null, notes: [] };
    if (i <= 6) return { count: i, type: 'sostenido', notes: SHARP_ORDER.slice(0, i) };
    const n = 12 - i;
    return { count: n, type: 'bemol', notes: FLAT_ORDER.slice(0, n) };
  }

  // ---------- PIANO Y PENTAGRAMA ----------
  // Sistema de coordenadas verificado: "índice diatónico" = octava*7 + índice de letra (C=0..B=6).
  // La posición en el pentagrama es simplemente esa distancia (en pasos línea/espacio) respecto
  // al Do central (Do4). Cada paso = 1 unidad vertical; una línea a la siguiente = 2 unidades.
  // Verificado: clave de Sol, líneas Mi4-Sol4-Si4-Re5-Fa5 (pasos +2,+4,+6,+8,+10) y clave de Fa,
  // líneas Sol2-Si2-Re3-Fa3-La3 (pasos -10,-8,-6,-4,-2) — coincide exactamente con la teoría.
  const PIANO_LETTERS = ['C','D','E','F','G','A','B'];

  // intenta usar una tipografía musical externa (Google Fonts) para los accidentes, más elegante
  // que las formas vectoriales; si no hay conexión, el CDN falla, o tarda demasiado, se queda en
  // "false" y pianoDrawNoteAt usa el fallback vectorial de siempre — nunca se rompe por esto.
  let pianoMusicFontReady = false;
  function pianoDetectMusicFont(){
    const statusEl = document.getElementById('pianoFontStatus');
    const setStatus = (ok) => {
      pianoMusicFontReady = ok;
      console.log('[Fretlastico] Tipografía musical (Noto Music):', ok ? 'CARGADA ✓' : 'no disponible, usando alternativa vectorial');
      if (statusEl) {
        statusEl.textContent = ok ? '🔤 Tipografía musical: cargada ✓' : '🔤 Tipografía musical: no disponible (usando alternativa)';
        statusEl.className = 'piano-font-status ' + (ok ? 'ok' : 'fallback');
      }
      // si el pentagrama ya se había dibujado (el usuario entró en Piano antes de confirmar la
      // tipografía), se redibuja la clave para que pase de la letra de seguridad al símbolo real
      const kb = document.getElementById('pianoKeyboard');
      if (kb && kb.children.length) renderStaffBase();
    };
    if (!(window.document && document.fonts && document.fonts.load)) { setStatus(false); return; } // navegador sin Font Loading API: fallback de serie
    const timeout = new Promise(resolve => setTimeout(() => resolve(false), 2500));
    const loadCheck = document.fonts.load('24px "Noto Music"')
      .then(() => document.fonts.check('24px "Noto Music"'))
      .catch(() => false);
    Promise.race([loadCheck, timeout]).then(setStatus);
  }
  // letra y accidente de cada clase de tono, coherente con el DISPLAY que ya usa toda la app
  const PIANO_NOTE_INFO = [
    { letter: 'C', acc: null }, { letter: 'D', acc: 'b' }, { letter: 'D', acc: null }, { letter: 'E', acc: 'b' },
    { letter: 'E', acc: null }, { letter: 'F', acc: null }, { letter: 'F', acc: '#' }, { letter: 'G', acc: null },
    { letter: 'A', acc: 'b' }, { letter: 'A', acc: null }, { letter: 'B', acc: 'b' }, { letter: 'B', acc: null }
  ];
  const PIANO_MIN_OCTAVE = 1, PIANO_MAX_OCTAVE = 7; // Do1 a Do7 (6 octavas)
  const PIANO_STEP_PX = 6;        // píxeles por paso diatónico (igual en las 3 vistas, fijo)
  const PIANO_MARGIN_TOP = 70;    // hueco fijo arriba (símbolo de clave, con margen extra)
  const PIANO_MARGIN_BOTTOM = 40; // hueco fijo abajo (margen extra)
  const PIANO_VIEWBOX_W = 700;
  // altura fija: cabe siempre el rango completo Do1-Do7 (42 pasos), sea cual sea la vista
  const PIANO_VIEWBOX_H = PIANO_MARGIN_TOP + PIANO_MARGIN_BOTTOM + 42 * PIANO_STEP_PX;

  function pianoDiatonicIndex(letter, octave){ return octave * 7 + PIANO_LETTERS.indexOf(letter); }
  const PIANO_C4_INDEX = pianoDiatonicIndex('C', 4);

  function pianoNoteData(pc, octave){
    const info = PIANO_NOTE_INFO[pc];
    const relPos = pianoDiatonicIndex(info.letter, octave) - PIANO_C4_INDEX;
    const midi = (octave + 1) * 12 + pc; // convención estándar: Do4 = 60
    return { pc, octave, letter: info.letter, acc: info.acc, relPos, midi, isBlack: info.acc !== null };
  }

  function pianoKeyList(){
    const keys = [];
    for (let oct = PIANO_MIN_OCTAVE; oct <= PIANO_MAX_OCTAVE; oct++) {
      for (let pc = 0; pc < 12; pc++) {
        if (oct === PIANO_MAX_OCTAVE && pc > 0) break; // terminar justo en Do6 inclusive
        keys.push(pianoNoteData(pc, oct));
      }
    }
    return keys;
  }

  // parámetros de dibujo según la vista de clave elegida: el mismo stepPx y la misma altura
  // total en las 3 vistas — solo cambia refRel (el punto de referencia) y, con él, dónde cae
  // el centerY dentro de esa altura fija. Así el rango completo del piano cabe siempre, sin
  // que el pentagrama tenga que crecer ni encogerse nunca.
  function pianoStaffParams(){
    const refRel = state.pianoClefView === 'treble' ? 6 : state.pianoClefView === 'bass' ? -6 : 0;
    const clefs = state.pianoClefView === 'treble' ? ['treble'] : state.pianoClefView === 'bass' ? ['bass'] : ['treble', 'bass'];
    const centerY = PIANO_MARGIN_TOP + (21 - refRel) * PIANO_STEP_PX;
    return { stepPx: PIANO_STEP_PX, centerY, refRel, clefs };
  }
  function pianoY(relPos, params){
    const p = params || pianoStaffParams();
    return p.centerY - (relPos - p.refRel) * p.stepPx;
  }

  // líneas adicionales necesarias para una nota fuera del pentagrama visible. En modo "ambas
  // claves" cada nota se lee por la clave que le es natural (comportamiento de gran pentagrama
  // realista: el Do central queda aislado entre ambas). En modo de una sola clave, TODAS las
  // notas se fuerzan a esa única clave, así que el patrón de líneas también debe extenderse
  // hacia el lado que en modo "ambas" cubriría la otra clave (por eso antes solo salían las
  // líneas de un lado en cada vista individual).
  function pianoLedgerPositions(relPos, params){
    const p = params || pianoStaffParams();
    if (p.clefs.length === 2) {
      if (relPos === 0) return [0]; // Do central: su propia línea adicional, aislada
      if (relPos > 10) {
        const evenMax = relPos % 2 === 0 ? relPos : relPos - 1;
        const positions = [];
        for (let x = 12; x <= evenMax; x += 2) positions.push(x);
        return positions;
      }
      if (relPos < -10) {
        const evenMin = relPos % 2 === 0 ? relPos : relPos + 1;
        const positions = [];
        for (let x = -12; x >= evenMin; x -= 2) positions.push(x);
        return positions;
      }
      return [];
    }
    // una sola clave visible: el límite superior/inferior real de ESA clave
    const top = p.clefs[0] === 'treble' ? 10 : -2;
    const bottom = p.clefs[0] === 'treble' ? 2 : -10;
    if (relPos > top) {
      const evenMax = relPos % 2 === 0 ? relPos : relPos - 1;
      const positions = [];
      for (let x = top + 2; x <= evenMax; x += 2) positions.push(x);
      return positions;
    }
    if (relPos < bottom) {
      const evenMin = relPos % 2 === 0 ? relPos : relPos + 1;
      const positions = [];
      for (let x = bottom - 2; x >= evenMin; x -= 2) positions.push(x);
      return positions;
    }
    return [];
  }

  // posiciones (en pasos) de las líneas reales del pentagrama visible según la vista de clave
  function pianoBaseLineRelPositions(p){
    const rels = [];
    if (p.clefs.includes('treble')) rels.push(2,4,6,8,10);
    if (p.clefs.includes('bass')) rels.push(-10,-8,-6,-4,-2);
    return rels;
  }

  function renderStaffBase(){
    const svg = $('#staffSVG');
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${PIANO_VIEWBOX_W} ${PIANO_VIEWBOX_H}`); // fijo, no vuelve a cambiar nunca
    const ns = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      return el;
    };
    const p = pianoStaffParams();
    const lineX1 = 70, lineX2 = PIANO_VIEWBOX_W - 40;

    if (p.clefs.includes('treble')) {
      [2,4,6,8,10].forEach(rel => {
        svg.appendChild(mk('line', { x1: lineX1, x2: lineX2, y1: pianoY(rel,p), y2: pianoY(rel,p), stroke: '#2a2a2a', 'stroke-width': 0.9 }));
      });
      if (pianoMusicFontReady) {
        // símbolo real de clave de Sol, con la tipografía musical ya confirmada como cargada
        const clefG = mk('text', { x: 10, y: pianoY(6,p) + 11, 'font-family': '"Noto Music", serif', 'font-size': 38, fill: '#1a1a1a' });
        clefG.textContent = '\u{1D11E}';
        svg.appendChild(clefG);
      } else {
        // "G" en la propia línea de Sol (2a linea, rel=4): letra en tipografia estandar, garantizado
        // que se ve en cualquier dispositivo (los símbolos Unicode de clave musical no siempre
        // renderizan bien, lo que podía dejar la clave "invisible" hasta que aparecía una nota).
        const clefG = mk('text', { x: 14, y: pianoY(4,p) + 9, 'font-size': 26, 'font-family': 'Georgia, serif', 'font-weight': 700, fill: '#1a1a1a' });
        clefG.textContent = 'G';
        svg.appendChild(clefG);
      }
    }
    if (p.clefs.includes('bass')) {
      [-10,-8,-6,-4,-2].forEach(rel => {
        svg.appendChild(mk('line', { x1: lineX1, x2: lineX2, y1: pianoY(rel,p), y2: pianoY(rel,p), stroke: '#2a2a2a', 'stroke-width': 0.9 }));
      });
      if (pianoMusicFontReady) {
        // símbolo real de clave de Fa
        const clefF = mk('text', { x: 10, y: pianoY(-6,p) + 8, 'font-family': '"Noto Music", serif', 'font-size': 24, fill: '#1a1a1a' });
        clefF.textContent = '\u{1D122}';
        svg.appendChild(clefF);
      } else {
        // "F" en su propia línea (2a linea empezando por arriba, rel=-4), mismo motivo que arriba
        const clefF = mk('text', { x: 14, y: pianoY(-4,p) + 8, 'font-size': 24, 'font-family': 'Georgia, serif', 'font-weight': 700, fill: '#1a1a1a' });
        clefF.textContent = 'F';
        svg.appendChild(clefF);
      }
    }
    svg.appendChild(mk('g', { id: 'staffNoteLayer' }));
    void svg.offsetHeight; // fuerza un repintado inmediato (evita que el navegador deje el dibujo a medias)
  }

  function clearStaffNote(){
    const layer = $('#staffSVG').querySelector('#staffNoteLayer');
    if (layer) layer.innerHTML = '';
    $('#pianoBigNote').textContent = '—';
  }

  // dibuja una cabeza de nota (con su accidente, líneas adicionales y guía vertical) en la
  // posición X indicada — reutilizable tanto para una nota suelta como para varias de un acorde.
  function pianoDrawNoteAt(layer, mk, p, note, nx){
    const y = pianoY(note.relPos, p);
    const ledgerPositions = pianoLedgerPositions(note.relPos, p);

    // líneas adicionales (rayitas horizontales)
    ledgerPositions.forEach(rel => {
      const ly = pianoY(rel, p);
      layer.appendChild(mk('line', { x1: nx - 16, x2: nx + 16, y1: ly, y2: ly, stroke: '#000000', 'stroke-width': 1.2 }));
    });

    // accidente (sostenido/bemol): si la tipografía musical externa cargó bien, se usa como
    // texto (más elegante); si no hay conexión o falla, se dibuja con formas vectoriales
    // (garantizado que se ve igual en cualquier dispositivo, sin depender de red).
    if (note.acc === '#' || note.acc === 'b') {
      if (pianoMusicFontReady) {
        const sym = mk('text', { x: nx - 22, y: y + 7, 'font-family': '"Noto Music", serif', 'font-size': 22, fill: '#1a1a1a' });
        sym.textContent = note.acc === '#' ? '\u266F' : '\u266D';
        layer.appendChild(sym);
      } else if (note.acc === '#') {
        const ax = nx - 20;
        layer.appendChild(mk('line', { x1: ax - 3, x2: ax - 3, y1: y - 8, y2: y + 7, stroke: '#1a1a1a', 'stroke-width': 1.4 }));
        layer.appendChild(mk('line', { x1: ax + 3, x2: ax + 3, y1: y - 9, y2: y + 6, stroke: '#1a1a1a', 'stroke-width': 1.4 }));
        layer.appendChild(mk('line', { x1: ax - 6, x2: ax + 6, y1: y - 2.5, y2: y - 4.5, stroke: '#1a1a1a', 'stroke-width': 1.8 }));
        layer.appendChild(mk('line', { x1: ax - 6, x2: ax + 6, y1: y + 4.5, y2: y + 2.5, stroke: '#1a1a1a', 'stroke-width': 1.8 }));
      } else {
        const ax = nx - 18;
        layer.appendChild(mk('line', { x1: ax, x2: ax, y1: y - 9, y2: y + 5, stroke: '#1a1a1a', 'stroke-width': 1.5 }));
        layer.appendChild(mk('ellipse', { cx: ax + 3, cy: y + 2, rx: 3.6, ry: 3, fill: '#1a1a1a' }));
      }
    }

    // cabeza de nota (elipse rellena) — tamaño original: con el espaciado fijo de líneas (6px
    // por paso), agrandarla rompe hasta una simple 3ª (2 pasos = 12px, ry agrandado necesitaba
    // 17px) — verificado que este tamaño es el máximo que cabe sin solape en una 3ª.
    const head = mk('ellipse', { cx: nx, cy: y, rx: 8, ry: 6, fill: '#1a1a1a', transform: `rotate(-18 ${nx} ${y})` });
    layer.appendChild(head);
    return { ledgerPositions, y };
  }

  // dibuja UNA sola línea vertical guía compartida (no una por nota), a partir de las posiciones
  // de línea adicional y las alturas Y de todas las notas que la necesiten — evita el fallo de
  // que dos notas contiguas en un acorde dibujaran cada una su propia guía, dando dos líneas.
  function pianoDrawSharedGuide(layer, mk, p, entries, guideX){
    const allLedgerRels = entries.flatMap(e => e.ledgerPositions);
    if (allLedgerRels.length === 0) return;
    const allYs = allLedgerRels.map(rel => pianoY(rel, p)).concat(entries.map(e => e.y));
    const yTop = Math.min(...allYs) - 4;
    const yBottom = Math.max(...allYs) + 4;
    layer.appendChild(mk('line', {
      x1: guideX, x2: guideX, y1: yTop, y2: yBottom,
      stroke: '#1a1a1a', 'stroke-width': 1
    }));
  }

  function showNoteOnStaff(pc, octave){
    const note = pianoNoteData(pc, octave);
    const ns = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      return el;
    };
    const p = pianoStaffParams();
    const svg = $('#staffSVG');
    let layer = svg.querySelector('#staffNoteLayer');
    if (!layer) { layer = mk('g', { id: 'staffNoteLayer' }); svg.appendChild(layer); }
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    const noteX = 380; // centrada, en vez de pegada al borde derecho — aprovecha mejor el ancho del pentagrama
    const entry = pianoDrawNoteAt(layer, mk, p, note, noteX);
    pianoDrawSharedGuide(layer, mk, p, [entry], noteX + 8);
    const ledgerCount = entry.ledgerPositions.length;

    const accText = note.acc ? (note.acc === '#' ? '#' : 'b') : '';
    const ledgerNote = ledgerCount > 0 ? `  ·  ${ledgerCount} línea${ledgerCount>1?'s':''} adicional${ledgerCount>1?'es':''}` : '';
    $('#pianoNoteDisplay').textContent = `${note.letter}${accText}${note.octave}  ·  ${note.isBlack ? DISPLAY[note.pc] : note.letter}${ledgerNote}`;
    $('#pianoBigNote').textContent = `${note.letter}${accText}${note.octave}`;
    void svg.offsetHeight; // fuerza repintado, igual que en renderStaffBase
  }

  let pianoAudioNodes = null;
  function playPianoTone(midi){
    if (tocarMuestra('piano', midi, 1.1, getAudioCtx().destination)) return;
    const ctx = getAudioCtx();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.15);
  }

  // ---------- VOZ: entrenamiento de entonación ----------
  // detección de tono por autocorrelación (técnica estándar de dominio público, ACF2+), la misma
  // familia de algoritmo ya usada y verificada para transcribir audio subido — aquí corre en vivo
  // fotograma a fotograma sobre el micrófono, en vez de una sola vez sobre un archivo.
  let voiceStream = null, voiceSourceNode = null, voiceAnalyser = null, voiceRAF = null;
  let voiceInTuneFrames = 0;
  const VOICE_HOLD_FRAMES_TO_SCORE = 40; // ~0.6-0.7s sostenido en afinación, a ritmo de requestAnimationFrame

  function autoCorrelatePitch(buf, sampleRate){
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1; // demasiado silencio/ruido para fiarse

    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buf[i]) < thres) { r1 = i; break; } }
    for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; } }
    const trimmed = buf.slice(r1, r2);
    const n = trimmed.length;
    if (n < 8) return -1;

    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n - i; j++) sum += trimmed[j] * trimmed[j + i];
      c[i] = sum;
    }
    let d = 0;
    while (d < n - 1 && c[d] > c[d + 1]) d++;
    let maxVal = -1, maxPos = -1;
    for (let i = d; i < n; i++) { if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; } }
    if (maxPos <= 0) return -1;

    // interpolación parabólica alrededor del pico, para más precisión que solo el bin entero
    let T0 = maxPos;
    const x1 = c[T0 - 1] || 0, x2 = c[T0], x3 = c[T0 + 1] || 0;
    const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);
    if (T0 <= 0) return -1;
    return sampleRate / T0;
  }

  function freqToMidiCents(freq){
    const midiFloat = 69 + 12 * Math.log2(freq / 440);
    const midiRound = Math.round(midiFloat);
    return { midi: midiRound, cents: (midiFloat - midiRound) * 100 };
  }

  async function startVoiceListening(){
    try {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      voiceStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      voiceSourceNode = ctx.createMediaStreamSource(voiceStream);
      voiceAnalyser = ctx.createAnalyser();
      voiceAnalyser.fftSize = 2048;
      voiceSourceNode.connect(voiceAnalyser);
      voiceInTuneFrames = 0;
      $('#voiceListenBtn').style.display = 'none';
      $('#voiceStopBtn').style.display = '';
      voiceListenLoop();
    } catch (err) {
      $('#voiceFeedbackLabel').textContent = '❌ No se pudo acceder al micrófono: ' + err.message + ' (revisa los permisos del navegador)';
    }
  }

  function stopVoiceListening(){
    if (voiceRAF) cancelAnimationFrame(voiceRAF);
    voiceRAF = null;
    if (voiceStream) { voiceStream.getTracks().forEach(t => t.stop()); voiceStream = null; }
    voiceSourceNode = null; voiceAnalyser = null;
    const btn = $('#voiceListenBtn'), stopBtn = $('#voiceStopBtn');
    if (btn) btn.style.display = '';
    if (stopBtn) stopBtn.style.display = 'none';
  }

  function voiceListenLoop(){
    if (!voiceAnalyser) return;
    const ctx = getAudioCtx();
    const buf = new Float32Array(voiceAnalyser.fftSize);
    voiceAnalyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelatePitch(buf, ctx.sampleRate);
    const needle = $('#voiceMeterNeedle');
    const feedback = $('#voiceFeedbackLabel');
    if (freq > 0 && state.voiceQuiz.targetMidi !== null) {
      const targetFreq = 440 * Math.pow(2, (state.voiceQuiz.targetMidi - 69) / 12);
      const centsFromTarget = 1200 * Math.log2(freq / targetFreq);
      const clamped = Math.max(-50, Math.min(50, centsFromTarget));
      needle.style.left = (50 + clamped) + '%';
      const tol = state.voiceQuiz.toleranceCents;
      feedback.classList.remove('tuned', 'high', 'low');
      if (Math.abs(centsFromTarget) <= tol) {
        feedback.textContent = '✅ Afinado';
        feedback.classList.add('tuned');
        voiceInTuneFrames++;
        if (voiceInTuneFrames >= VOICE_HOLD_FRAMES_TO_SCORE) {
          registerVoiceHit();
        }
      } else if (centsFromTarget > tol) {
        feedback.textContent = '🔼 Alto (+' + Math.round(centsFromTarget) + ' cents)';
        feedback.classList.add('high');
        voiceInTuneFrames = 0;
      } else {
        feedback.textContent = '🔽 Bajo (' + Math.round(centsFromTarget) + ' cents)';
        feedback.classList.add('low');
        voiceInTuneFrames = 0;
      }
    } else {
      voiceInTuneFrames = 0;
    }
    voiceRAF = requestAnimationFrame(voiceListenLoop);
  }

  function registerVoiceHit(){
    state.voiceQuiz.score++;
    state.voiceQuiz.streak++;
    $('#voiceScoreLabel').textContent = state.voiceQuiz.score;
    $('#voiceStreakLabel').textContent = state.voiceQuiz.streak;
    $('#voiceFeedbackLabel').textContent = '🎉 ¡Bien! Siguiente nota en un momento...';
    stopVoiceListening();
    setTimeout(() => { pickNewVoiceTarget(); }, 1200);
  }

  function pickNewVoiceTarget(){
    const q = state.voiceQuiz;
    const lo = q.rangeLow, hi = Math.max(q.rangeLow + 1, q.rangeHigh);
    q.targetMidi = lo + Math.floor(Math.random() * (hi - lo + 1));
    const pc = ((q.targetMidi % 12) + 12) % 12;
    const octave = Math.floor(q.targetMidi / 12) - 1;
    $('#voiceTargetNoteLabel').textContent = BT_DISPLAY_ES_SAFE()[pc] + octave;
    $('#voiceMeterNeedle').style.left = '50%';
    $('#voiceFeedbackLabel').textContent = 'Pulsa "Escuchar nota" y luego "Cantar"';
    $('#voiceFeedbackLabel').classList.remove('tuned', 'high', 'low');
    voiceInTuneFrames = 0;
  }

  // BT_DISPLAY_ES se define más abajo en el archivo (usado primero por el analizador de backing
  // tracks de FretTeacher) — este wrapper evita depender del orden de declaración en el script.
  function BT_DISPLAY_ES_SAFE(){
    return ['Do','Reb','Re','Mib','Mi','Fa','Fa#','Sol','Lab','La','Sib','Si'];
  }

  function renderVoiceSection(){
    const q = state.voiceQuiz;
    $('#voiceCalibBox').style.display = q.calibrated ? 'none' : 'block';
    $('#voiceQuizBox').style.display = q.calibrated ? 'block' : 'none';
    if (q.calibrated && q.targetMidi === null) pickNewVoiceTarget();
  }

  // ---------- VOZ: calibración de rango (comparte el mismo detector de tono) ----------
  let calibStream = null, calibAnalyser = null, calibRAF = null, calibLastMidi = null;

  async function toggleCalibListen(which){
    const btn = $(which === 'low' ? '#voiceCalibLowBtn' : '#voiceCalibHighBtn');
    if (calibStream && state.voiceQuiz.calibStep === which) {
      // segunda pulsación: fija la nota detectada ahora mismo
      if (calibLastMidi !== null) {
        state.voiceQuiz[which === 'low' ? 'rangeLow' : 'rangeHigh'] = calibLastMidi;
        const pc = ((calibLastMidi % 12) + 12) % 12;
        const octave = Math.floor(calibLastMidi / 12) - 1;
        $(which === 'low' ? '#voiceCalibLowLabel' : '#voiceCalibHighLabel').textContent = BT_DISPLAY_ES_SAFE()[pc] + octave + ' ✅';
      }
      stopCalibListen();
      btn.textContent = which === 'low' ? '🎙️ Escuchar (grave)' : '🎙️ Escuchar (aguda)';
      maybeFinishCalibration();
      return;
    }
    stopCalibListen();
    state.voiceQuiz.calibStep = which;
    try {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      calibStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
      const src = ctx.createMediaStreamSource(calibStream);
      calibAnalyser = ctx.createAnalyser();
      calibAnalyser.fftSize = 2048;
      src.connect(calibAnalyser);
      btn.textContent = '✅ Fijar (canta ahora)';
      const label = $(which === 'low' ? '#voiceCalibLowLabel' : '#voiceCalibHighLabel');
      const loop = () => {
        if (!calibAnalyser) return;
        const buf = new Float32Array(calibAnalyser.fftSize);
        calibAnalyser.getFloatTimeDomainData(buf);
        const freq = autoCorrelatePitch(buf, ctx.sampleRate);
        if (freq > 0) {
          const { midi } = freqToMidiCents(freq);
          calibLastMidi = midi;
          const pc = ((midi % 12) + 12) % 12;
          const octave = Math.floor(midi / 12) - 1;
          label.textContent = 'escuchando: ' + BT_DISPLAY_ES_SAFE()[pc] + octave;
        }
        calibRAF = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      $(which === 'low' ? '#voiceCalibLowLabel' : '#voiceCalibHighLabel').textContent = '❌ ' + err.message;
    }
  }

  function stopCalibListen(){
    if (calibRAF) cancelAnimationFrame(calibRAF);
    calibRAF = null;
    if (calibStream) { calibStream.getTracks().forEach(t => t.stop()); calibStream = null; }
    calibAnalyser = null; calibLastMidi = null;
  }

  function maybeFinishCalibration(){
    const q = state.voiceQuiz;
    // si el usuario ya fijó al menos la grave o la aguda, con la otra rellenamos un valor por
    // defecto razonable en vez de bloquear — mejor calibración parcial que ninguna
    if ($('#voiceCalibLowLabel').textContent.includes('✅') || $('#voiceCalibHighLabel').textContent.includes('✅')) {
      if (q.rangeHigh <= q.rangeLow) q.rangeHigh = q.rangeLow + 12;
      q.calibrated = true;
      render();
    }
  }

  function renderPianoKeyboard(){
    const wrap = $('#pianoKeyboard');
    wrap.innerHTML = '';
    const keys = pianoKeyList();
    const whiteKeys = keys.filter(k => !k.isBlack);

    whiteKeys.forEach((k, i) => {
      const isMiddleC = k.letter === 'C' && k.octave === 4;
      const el = document.createElement('div');
      el.className = 'piano-key-white' + (k.letter === 'C' ? ' c-label' : '') + (isMiddleC ? ' middle-c' : '');
      el.dataset.pc = k.pc;
      el.dataset.octave = k.octave;
      if (k.letter === 'C' && !isMiddleC) el.dataset.label = 'Do' + k.octave;
      el.addEventListener('click', () => pianoKeyPressed(k.pc, k.octave));
      wrap.appendChild(el);
    });

    // negras superpuestas: se posicionan a caballo entre la blanca natural inmediatamente
    // inferior (pc-1, que para las 5 negras siempre cae en una tecla blanca) y la siguiente.
    // Usar directamente la clase de tono (no la letra) evita la asimetría entre sostenidos
    // (F#, que comparte letra con la nota de la que sale) y bemoles (que comparten letra con
    // la nota a la que va) — esa asimetría desplazaba el Fa# una tecla entera hacia la izquierda.
    // La posición se da en % (no en píxeles): así escala sola con el ancho del teclado, sin
    // tener que recalcular nada en JS si la pantalla cambia de tamaño.
    const whiteWidthPct = 100 / whiteKeys.length;
    keys.filter(k => k.isBlack).forEach(k => {
      const belowIdx = whiteKeys.findIndex(w => w.octave === k.octave && w.pc === k.pc - 1);
      const el = document.createElement('div');
      el.className = 'piano-key-black';
      el.dataset.pc = k.pc;
      el.dataset.octave = k.octave;
      el.style.left = `calc(${(belowIdx + 1) * whiteWidthPct}% - 0.7%)`;
      el.addEventListener('click', (e) => { e.stopPropagation(); pianoKeyPressed(k.pc, k.octave); });
      wrap.appendChild(el);
    });

    wrap.parentElement.scrollLeft = 0; // arrancar viendo Do1 (el más grave), no una vista desplazada
  }

  // centra el desplazamiento horizontal del teclado sobre las teclas indicadas — sobre todo útil
  // en móvil, donde el teclado no cabe entero y hay que desplazarse para encontrar las teclas.
  // En iPad/escritorio, donde suele caber entero, esto no tiene ningún efecto visible.
  function pianoScrollToKeys(keyEls){
    const wrap = document.querySelector('.piano-keyboard-wrap');
    if (!wrap || keyEls.length === 0) return;
    const lefts = keyEls.map(el => el.offsetLeft);
    const rights = keyEls.map(el => el.offsetLeft + el.offsetWidth);
    const center = (Math.min(...lefts) + Math.max(...rights)) / 2;
    const target = center - wrap.clientWidth / 2;
    wrap.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }

  function pianoKeyPressed(pc, octave){
    document.querySelectorAll('.piano-key-white.active, .piano-key-black.active').forEach(el => el.classList.remove('active'));
    const sel = document.querySelector(`.piano-keyboard [data-pc="${pc}"][data-octave="${octave}"]`);
    if (sel) { sel.classList.add('active'); pianoScrollToKeys([sel]); }
    showNoteOnStaff(pc, octave);
    playPianoTone(pianoNoteData(pc, octave).midi);
  }

  function pianoRandomNote(){
    document.querySelectorAll('.piano-key-white.active, .piano-key-black.active').forEach(el => el.classList.remove('active'));
    const keys = pianoKeyList();
    const pick = keys[Math.floor(Math.random() * keys.length)];
    showNoteOnStaff(pick.pc, pick.octave);
    $('#pianoNoteDisplay').textContent = '¿Qué tecla es esta nota? Búscala en el teclado…';
  }

  // ---------- ACORDES EN EL PIANO ----------
  // reutiliza CHORD_FORMULAS (ya construido y verificado para la guitarra). El semitono ahí
  // guardado viene "reducido" (0-11, pensado para digitaciones compactas de guitarra); para el
  // piano hay que expandir las notas de extensión (9a/11a/13a) a su octava real por encima del
  // séptimo, si no, una 9a se dibujaría pegada a la fundamental en vez de por encima del acorde.
  function pianoChordNotes(rootPc, rootOctave, qualityKey){
    const formula = CHORD_FORMULAS[qualityKey];
    const rootMidi = (rootOctave + 1) * 12 + rootPc; // Do4 = MIDI 60, misma convención que pianoNoteData
    return formula.map(([label, semitone]) => {
      const needsOctaveUp = label.includes('9') || label.includes('11') || label.includes('13');
      const midi = rootMidi + semitone + (needsOctaveUp ? 12 : 0);
      const octave = Math.floor(midi / 12) - 1;
      const pc = ((midi % 12) + 12) % 12;
      return pianoNoteData(pc, octave);
    });
  }

  function showChordOnStaff(notes, chordLabel){
    const ns = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      return el;
    };
    const p = pianoStaffParams();
    const svg = $('#staffSVG');
    let layer = svg.querySelector('#staffNoteLayer');
    if (!layer) { layer = mk('g', { id: 'staffNoteLayer' }); svg.appendChild(layer); }
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    // separación anti-colisión: si dos notas quedan a un solo paso (línea/espacio contiguos),
    // se alternan a los lados en vez de dibujarse pegadas una encima de otra.
    const sorted = [...notes].sort((a, b) => a.relPos - b.relPos);
    let lastRel = null, side = 1;
    const entries = [];
    sorted.forEach(note => {
      let offsetX = 0;
      if (lastRel !== null && Math.abs(note.relPos - lastRel) === 1) {
        offsetX = side * 13;
        side = -side;
      } else {
        side = 1;
      }
      lastRel = note.relPos;
      entries.push(pianoDrawNoteAt(layer, mk, p, note, 380 + offsetX));
    });
    pianoDrawSharedGuide(layer, mk, p, entries, 386); // una sola guía para todo el acorde, no una por nota
    const totalLedger = entries.reduce((sum, e) => sum + e.ledgerPositions.length, 0);

    const names = sorted.map(n => n.letter + (n.acc ? (n.acc === '#' ? '#' : 'b') : '') + n.octave).join(' - ');
    $('#pianoNoteDisplay').textContent = names + (totalLedger > 0 ? `  ·  ${totalLedger} línea${totalLedger>1?'s':''} adicional${totalLedger>1?'es':''} en total` : '');
    $('#pianoBigNote').textContent = chordLabel;
    void svg.offsetHeight;
  }

  function highlightPianoKeys(notes){
    document.querySelectorAll('.piano-key-white.active, .piano-key-black.active').forEach(el => el.classList.remove('active'));
    const els = [];
    notes.forEach(n => {
      const sel = document.querySelector(`.piano-keyboard [data-pc="${n.pc}"][data-octave="${n.octave}"]`);
      if (sel) { sel.classList.add('active'); els.push(sel); }
    });
    pianoScrollToKeys(els);
  }

  function playChordTones(notes){
    notes.forEach(n => playPianoTone(n.midi));
  }

  // voicings "rootless" de jazz: se usan sobre todo en la mano izquierda para acompañar, cuando
  // otro instrumento (normalmente el bajo) ya está tocando la fundamental — así se evita
  // duplicarla y el voicing suena más "abierto" y propio del estilo. Simplificado con 3ª-5ª-7ª-9ª
  // (en vez de sustituir la 5ª por la 13ª, que sería la versión más avanzada).
  const ROOTLESS_BASE_TONES = { maj7: [4, 7, 11], min7: [3, 7, 10], dom7: [4, 7, 10] };
  function pianoRootlessNotes(rootPc, rootOctave, qualityKey, voicingType){
    const base = ROOTLESS_BASE_TONES[qualityKey];
    if (!base) return null; // solo disponible para maj7 / min7 / dom7 por ahora
    const [third, fifth, seventh] = base;
    const ninth = 2;
    const rootMidi = (rootOctave + 1) * 12 + rootPc;
    const intervals = voicingType === 'rootlessA'
      ? [third, fifth, seventh, ninth + 12]
      : [seventh, ninth + 12, third + 12, fifth + 12];
    return intervals.map(iv => {
      const midi = rootMidi + iv;
      const pc = ((midi % 12) + 12) % 12;
      const octave = Math.floor(midi / 12) - 1;
      return pianoNoteData(pc, octave);
    });
  }

  function pianoShowCurrentChord(){
    const rootlessNotes = state.pianoVoicing !== 'closed'
      ? pianoRootlessNotes(state.pianoChordRoot, state.pianoChordOctave, state.pianoChordQuality, state.pianoVoicing)
      : null;
    const notes = rootlessNotes || pianoChordNotes(state.pianoChordRoot, state.pianoChordOctave, state.pianoChordQuality);
    const q = CHORD_QUALITIES[state.pianoChordQuality];
    const voicingTag = rootlessNotes ? (state.pianoVoicing === 'rootlessA' ? ' · rootless A' : ' · rootless B') : '';
    const chordLabel = DISPLAY[state.pianoChordRoot] + q.suffix + voicingTag;
    showChordOnStaff(notes, chordLabel);
    highlightPianoKeys(notes);
    return notes;
  }

  // ---------- TRÍADAS: interfaz ----------
  function populateTriadControls(){
    const rootWrap = $('#triadRootGroup');
    rootWrap.innerHTML = '';
    DISPLAY.forEach((name, pc) => {
      const b = document.createElement('button');
      b.textContent = name;
      b.dataset.root = pc;
      if (pc === state.triad.root) b.classList.add('active');
      b.addEventListener('click', () => {
        state.triad.root = pc;
        document.querySelectorAll('#triadRootGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderTriadDiagram();
        renderTriadHarmony();
        renderTriadMapCards();
      });
      rootWrap.appendChild(b);
    });

    const qualWrap = $('#triadQualityGroup');
    qualWrap.innerHTML = '';
    Object.entries(TRIAD_QUALITIES).forEach(([key, q]) => {
      const b = document.createElement('button');
      b.textContent = q.label;
      b.dataset.quality = key;
      if (key === state.triad.quality) b.classList.add('active');
      b.addEventListener('click', () => {
        state.triad.quality = key;
        document.querySelectorAll('#triadQualityGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderTriadDiagram();
        renderTriadMapCards();
      });
      qualWrap.appendChild(b);
    });

    document.querySelectorAll('#triadInversionGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.triad.inversion = Number(b.dataset.inv);
        document.querySelectorAll('#triadInversionGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderTriadDiagram();
        renderTriadMapCards();
      });
    });

    document.querySelectorAll('#triadModeGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.triad.mode = b.dataset.tmode;
        state.triad.stringSetIdx = 0;
        document.querySelectorAll('#triadModeGroup button').forEach(x => x.classList.toggle('active', x === b));
        updateTriadModeVisibility();
        renderTriadStringSetOptions();
        renderTriadDiagram();
        renderTriadProgressionCards();
      });
    });

    const zoneWrap = $('#triadZoneGroup');
    zoneWrap.innerHTML = '';
    TRIAD_ZONES.forEach((zone, i) => {
      const b = document.createElement('button');
      b.textContent = zone.label;
      if (i === state.triad.zoneIdx) b.classList.add('active');
      b.addEventListener('click', () => {
        state.triad.zoneIdx = i;
        document.querySelectorAll('#triadZoneGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderTriadDiagram();
      });
      zoneWrap.appendChild(b);
    });

    const singleWrap = $('#triadSingleStringGroup');
    singleWrap.innerHTML = '';
    STRING_ORDINALS.forEach((label, i) => {
      const b = document.createElement('button');
      b.textContent = label;
      if (i === state.triad.singleStringIdx) b.classList.add('active');
      b.addEventListener('click', () => {
        state.triad.singleStringIdx = i;
        document.querySelectorAll('#triadSingleStringGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderTriadDiagram();
      });
      singleWrap.appendChild(b);
    });

    updateTriadModeVisibility();
    renderTriadStringSetOptions();
  }

  function updateTriadModeVisibility(){
    const isSingle = state.triad.mode === 'single';
    $('#triadStringSetLabel').textContent = isSingle ? 'Cuerda' : 'Cuerdas';
    $('#triadStringSetGroup').style.display = isSingle ? 'none' : 'flex';
    $('#triadSingleStringGroup').style.display = isSingle ? 'flex' : 'none';
    $('#triadZoneRow').style.display = isSingle ? 'none' : 'flex'; // en una cuerda no aplica zona: se ve el arpegio entero
  }

  function renderTriadStringSetOptions(){
    const sets = state.triad.mode === 'vertical' ? TRIAD_STRING_SETS_VERTICAL : TRIAD_STRING_SETS_HORIZONTAL;
    const wrap = $('#triadStringSetGroup');
    wrap.innerHTML = '';
    sets.forEach((set, i) => {
      const b = document.createElement('button');
      b.textContent = set.label;
      if (i === state.triad.stringSetIdx) b.classList.add('active');
      b.addEventListener('click', () => {
        state.triad.stringSetIdx = i;
        document.querySelectorAll('#triadStringSetGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderTriadDiagram();
        renderTriadProgressionCards();
      });
      wrap.appendChild(b);
    });
  }

  function renderTriadDiagram(){
    const t = state.triad;
    const quality = TRIAD_QUALITIES[t.quality];
    const wrap = $('#triadDiagram');
    const info = $('#triadInfo');
    wrap.classList.toggle('wide', t.mode === 'single');

    if (t.mode === 'single') {
      const positions = triadSingleStringPositions(t.root, t.quality, t.singleStringIdx, 15);
      wrap.innerHTML = renderTriadSingleStringSVG(positions, t.singleStringIdx, t.root);

      const degreeLabels = ['1ª (fundamental)', '3ª', '5ª'];
      info.innerHTML = `
        <div><b>${DISPLAY[t.root]} ${quality.label}</b> · arpegio en la cuerda ${STRING_ORDINALS[t.singleStringIdx]}</div>
        <div>${positions.map(p => `traste ${p.fret}: ${DISPLAY[p.pc]} (${degreeLabels[p.degIdx]})`).join(' · ')}</div>
        <div class="theory-note-small">Recorre esta cuerda de grave a agudo tocando solo estas notas: es la
        misma tríada, pero desplegada como escala en una sola cuerda en vez de en acorde.</div>
      `;
      return;
    }

    const sets = t.mode === 'vertical' ? TRIAD_STRING_SETS_VERTICAL : TRIAD_STRING_SETS_HORIZONTAL;
    const zone = TRIAD_ZONES[t.zoneIdx];
    const isFullNeck = zone.min <= 0 && zone.max >= 17;

    let stringSet, shape, autoPicked = false;
    if (isFullNeck) {
      stringSet = sets[t.stringSetIdx];
      shape = triadComputeShape(t.root, t.quality, t.inversion, stringSet.idxs);
    } else {
      // zona concreta: para una combinación fija de 3 cuerdas, cada nota solo aparece cada 12
      // trastes exactos — así que casi nunca cabe una digitación entera dentro de una zona de
      // solo 4-5 trastes con esas cuerdas fijas. En su lugar, se elige automáticamente qué juego
      // de cuerdas (de las disponibles en este modo) cae más cerca de esa zona — misma búsqueda
      // ya verificada que usa el "Mapa del mástil".
      const zoneCenter = (zone.min + zone.max) / 2;
      let best = null;
      sets.forEach((set, idx) => {
        const s = triadComputeShape(t.root, t.quality, t.inversion, set.idxs);
        if (!s) return;
        const avgFret = s.frets.reduce((a, b) => a + b, 0) / s.frets.length;
        const dist = Math.abs(avgFret - zoneCenter);
        if (!best || dist < best.dist) best = { idx, set, shape: s, dist };
      });
      if (best) {
        stringSet = best.set;
        shape = best.shape;
        autoPicked = true;
        if (t.stringSetIdx !== best.idx) {
          t.stringSetIdx = best.idx;
          document.querySelectorAll('#triadStringSetGroup button').forEach((b, i) => b.classList.toggle('active', i === best.idx));
        }
      }
    }

    if (!shape) {
      wrap.innerHTML = '';
      wrap.textContent = 'No hay ninguna digitación de esta tríada disponible cerca de esta zona.';
      info.innerHTML = '';
      return;
    }
    wrap.innerHTML = renderTriadSVG(shape, stringSet.idxs, t.root);

    // panel informativo: qué nota va en cada cuerda, y qué grado es
    const invLabel = ['Fundamental', '1ª inversión', '2ª inversión'][t.inversion];
    const bassRow = shape.rows[shape.rows.length - 1]; // última fila = cuerda más grave del conjunto
    const autoNote = autoPicked
      ? `<div class="theory-note-small">Cuerdas (${stringSet.label}) elegidas automáticamente por ser las que mejor caen en esta zona.</div>`
      : '';
    info.innerHTML = `
      <div><b>${DISPLAY[t.root]} ${quality.label}</b> · ${invLabel}</div>
      <div>Notas: ${quality.degrees.map((d,i) => DISPLAY[shape.tones[i]] + ' (' + d + ')').join(' · ')}</div>
      <div>Nota más grave (bajo): <b>${DISPLAY[bassRow.pc]}</b>, en la cuerda ${STRING_ORDINALS[bassRow.stringIdx]}</div>
      <div>Disposición: ${t.mode === 'vertical' ? 'vertical (cuerdas adyacentes, forma compacta)' : 'horizontal (cuerdas salteadas, más abierta)'}</div>
      <div>Rango de la digitación: ${shape.minFret === shape.maxFret ? 'los 3 dedos en el mismo traste' : (shape.maxFret - shape.minFret) + ' trastes'}</div>
      ${autoNote}
    `;
  }

  function renderTriadMapCards(){
    const t = state.triad;
    const wrap = $('#triadMapCards');
    wrap.innerHTML = '';
    // el mapa de posiciones solo tiene sentido con las 4 combinaciones verticales (con las 2
    // horizontales no hay suficientes para "mapear" el mástil de forma continua)
    const shapes = TRIAD_STRING_SETS_VERTICAL.map(set => {
      const shape = triadComputeShape(t.root, t.quality, t.inversion, set.idxs);
      return shape ? { shape, idxs: set.idxs, label: set.label } : null;
    }).filter(Boolean).sort((a, b) => a.shape.minFret - b.shape.minFret);
    state.triad.mapShapes = shapes.map(e => ({ shape: e.shape, stringIdxs: e.idxs }));

    shapes.forEach((entry, i) => {
      const card = document.createElement('div');
      card.className = 'chord-mini-card triad-card';
      card.dataset.step = i;
      const diagram = document.createElement('div');
      diagram.className = 'chord-mini-diagram';
      card.innerHTML = `<div class="chord-mini-roman">Posición ${i + 1} · cuerdas ${entry.label}</div>`;
      card.appendChild(diagram);
      const label = document.createElement('div');
      label.className = 'chord-mini-label';
      label.textContent = 'Traste ' + entry.shape.minFret;
      card.appendChild(label);
      diagram.innerHTML = renderTriadSVG(entry.shape, entry.idxs, t.root);
      card.addEventListener('click', () => strumTriadShape(entry.shape, entry.idxs));
      wrap.appendChild(card);
    });
    $('#triadMapPlayBtn').disabled = shapes.length === 0;
  }

  function renderTriadDegreesTable(){
    const rootLabel = $('#triadHarmonyRootLabel');
    if (rootLabel) rootLabel.textContent = DISPLAY[state.triad.root];
    const degrees = triadDiatonicDegrees(state.triad.root, state.triad.tonality);
    const table = $('#triadDegreesTable');
    let html = '<tr><th>Grado</th><th>Nota</th><th>Calidad</th></tr>';
    degrees.forEach(d => {
      html += `<tr><td>${d.roman}</td><td>${DISPLAY[d.root]}</td><td>${TRIAD_QUALITIES[d.quality].label}</td></tr>`;
    });
    table.innerHTML = html;
  }

  function renderTriadProgressionButtons(){
    const list = state.triad.tonality === 'major' ? TRIAD_PROGRESSIONS_MAJOR : TRIAD_PROGRESSIONS_MINOR;
    const wrap = $('#triadProgressionGroup');
    wrap.innerHTML = '';
    list.forEach((prog, i) => {
      const b = document.createElement('button');
      b.textContent = prog.label;
      if (i === state.triad.progressionIdx) b.classList.add('active');
      b.addEventListener('click', () => {
        state.triad.progressionIdx = (state.triad.progressionIdx === i) ? null : i;
        renderTriadProgressionButtons();
        renderTriadProgressionCards();
      });
      wrap.appendChild(b);
    });
  }

  async function strumTriadShape(shape, stringIdxs, sustain){
    const openMidi = OPEN_MIDI.guitarra;
    for (let i = 0; i < stringIdxs.length; i++) {
      playTone(openMidi[stringIdxs[i]] + shape.frets[i], sustain ?? 1.1, stringIdxs[i], 6);
      await sleep(35);
    }
  }

  // elige, de las 3 inversiones posibles, la que quede más cerca (menor salto de traste medio)
  // de la forma anterior — conducción de voces: mueve la mano lo mínimo posible entre acordes.
  function triadBestInversionShape(rootPc, quality, stringIdxs, prevShape){
    let best = null;
    for (let inv = 0; inv < 3; inv++) {
      const shape = triadComputeShape(rootPc, quality, inv, stringIdxs);
      if (!shape) continue;
      const avgFret = shape.frets.reduce((a,b) => a+b, 0) / shape.frets.length;
      const prevAvg = prevShape ? prevShape.frets.reduce((a,b) => a+b, 0) / prevShape.frets.length : avgFret;
      const dist = Math.abs(avgFret - prevAvg);
      if (!best || dist < best.dist) best = { shape, dist, inversion: inv };
    }
    return best;
  }

  function renderTriadProgressionCards(){
    const wrap = $('#triadProgressionCards');
    wrap.innerHTML = '';
    state.triad.progShapes = [];
    if (state.triad.progressionIdx === null) {
      $('#triadProgPlayBtn').disabled = true;
      return;
    }
    const list = state.triad.tonality === 'major' ? TRIAD_PROGRESSIONS_MAJOR : TRIAD_PROGRESSIONS_MINOR;
    const prog = list[state.triad.progressionIdx];
    // la lista menor tiene menos progresiones que la mayor (y el modo horizontal, menos juegos de cuerdas que el
    // vertical): al cambiar, el índice elegido podía quedar fuera y la sección se rompía
    if (!prog) { state.triad.progressionIdx = null; $('#triadProgPlayBtn').disabled = true; return; }
    const degrees = triadDiatonicDegrees(state.triad.root, state.triad.tonality);
    const sets = state.triad.mode === 'vertical' ? TRIAD_STRING_SETS_VERTICAL : TRIAD_STRING_SETS_HORIZONTAL;
    if (!sets[state.triad.stringSetIdx]) state.triad.stringSetIdx = 0;
    const stringSet = sets[state.triad.stringSetIdx];
    let prevShape = null;
    prog.degrees.forEach((degIdx, i) => {
      const d = degrees[degIdx];
      let shape, invUsed;
      if (state.triad.voiceLeading) {
        const best = triadBestInversionShape(d.root, d.quality, stringSet.idxs, prevShape);
        shape = best ? best.shape : null;
        invUsed = best ? best.inversion : 0;
      } else {
        shape = triadComputeShape(d.root, d.quality, 0, stringSet.idxs); // fundamental, para ver el grado con claridad
        invUsed = 0;
      }
      if (shape) prevShape = shape;
      const chordName = DISPLAY[d.root] + ' ' + TRIAD_QUALITIES[d.quality].label;
      state.triad.progShapes.push(shape ? { shape, stringIdxs: stringSet.idxs } : null);

      const card = document.createElement('div');
      card.className = 'chord-mini-card triad-card';
      card.dataset.step = i;
      const diagram = document.createElement('div');
      diagram.className = 'chord-mini-diagram';
      const invTag = state.triad.voiceLeading ? ` · ${['fund.','1ª inv','2ª inv'][invUsed]}` : '';
      card.innerHTML = `<div class="chord-mini-roman">${d.roman}${invTag}</div>`;
      card.appendChild(diagram);
      const label = document.createElement('div');
      label.className = 'chord-mini-label';
      label.textContent = chordName;
      card.appendChild(label);
      if (shape) {
        diagram.innerHTML = renderTriadSVG(shape, stringSet.idxs, d.root);
        card.addEventListener('click', () => strumTriadShape(shape, stringSet.idxs));
      } else {
        diagram.textContent = '—';
      }
      wrap.appendChild(card);
    });
    $('#triadProgPlayBtn').disabled = false;
  }

  function renderTriadHarmony(){
    renderTriadDegreesTable();
    renderTriadProgressionButtons();
    renderTriadProgressionCards();
  }

  // ---------- TRÍADAS: quiz ----------
  function populateTriadQuizControls(){
    const rootWrap = $('#triadQuizRootGroup');
    rootWrap.innerHTML = '';
    DISPLAY.forEach((name, pc) => {
      const b = document.createElement('button');
      b.textContent = name;
      b.addEventListener('click', () => {
        state.triadQuiz.guessRoot = pc;
        document.querySelectorAll('#triadQuizRootGroup button').forEach(x => x.classList.toggle('active', x === b));
      });
      rootWrap.appendChild(b);
    });
    const qualWrap = $('#triadQuizQualityGroup');
    qualWrap.innerHTML = '';
    Object.entries(TRIAD_QUALITIES).forEach(([key, q]) => {
      const b = document.createElement('button');
      b.textContent = q.label;
      b.addEventListener('click', () => {
        state.triadQuiz.guessQuality = key;
        document.querySelectorAll('#triadQuizQualityGroup button').forEach(x => x.classList.toggle('active', x === b));
      });
      qualWrap.appendChild(b);
    });
    document.querySelectorAll('#triadQuizInversionGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.triadQuiz.guessInversion = Number(b.dataset.qinv);
        document.querySelectorAll('#triadQuizInversionGroup button').forEach(x => x.classList.toggle('active', x === b));
      });
    });
  }

  function nextTriadQuizRound(){
    const root = Math.floor(Math.random() * 12);
    const qualityKeys = Object.keys(TRIAD_QUALITIES);
    const quality = qualityKeys[Math.floor(Math.random() * qualityKeys.length)];
    const inversion = Math.floor(Math.random() * 3);
    const stringSet = TRIAD_STRING_SETS_VERTICAL[Math.floor(Math.random() * TRIAD_STRING_SETS_VERTICAL.length)];
    const shape = triadComputeShape(root, quality, inversion, stringSet.idxs);
    state.triadQuiz.target = { root, quality, inversion, stringSet, shape };
    state.triadQuiz.guessRoot = null;
    state.triadQuiz.guessQuality = null;
    state.triadQuiz.guessInversion = null;
    document.querySelectorAll('#triadQuizRootGroup button, #triadQuizQualityGroup button, #triadQuizInversionGroup button')
      .forEach(b => b.classList.remove('active'));
    $('#triadQuizFeedback').textContent = '';
    $('#triadQuizDiagram').innerHTML = renderTriadSVG(shape, stringSet.idxs, root, true); // blank=true: sin nombres ni fundamental marcada
  }

  function checkTriadQuizAnswer(){
    const q = state.triadQuiz;
    if (!q.target) return;
    const missing = [];
    if (q.guessRoot === null) missing.push('la tónica');
    if (q.guessQuality === null) missing.push('la calidad');
    if (q.guessInversion === null) missing.push('la inversión');
    if (missing.length) {
      $('#triadQuizFeedback').textContent = 'Todavía falta elegir: ' + missing.join(', ') + '.';
      return;
    }
    q.attempts++;
    const correct = q.guessRoot === q.target.root && q.guessQuality === q.target.quality && q.guessInversion === q.target.inversion;
    if (correct) q.score++;
    const invLabel = ['Fundamental', '1ª inversión', '2ª inversión'];
    $('#triadQuizFeedback').textContent = correct
      ? '✅ ¡Correcto!'
      : `❌ Era ${DISPLAY[q.target.root]} ${TRIAD_QUALITIES[q.target.quality].label} · ${invLabel[q.target.inversion]}`;
    $('#triadQuizStatus').textContent = `Aciertos: ${q.score}/${q.attempts}`;
    if (correct) setTimeout(() => { if (state.triadQuiz.active) nextTriadQuizRound(); }, 900);
  }

  function startTriadQuiz(){
    state.triadQuiz.active = true;
    state.triadQuiz.score = 0;
    state.triadQuiz.attempts = 0;
    $('#triadNormalView').style.display = 'none';
    $('#triadQuizPanel').style.display = 'block';
    if (!$('#triadQuizRootGroup').children.length) populateTriadQuizControls();
    $('#triadQuizStatus').textContent = 'Aciertos: 0/0';
    nextTriadQuizRound();
  }

  function stopTriadQuiz(){
    state.triadQuiz.active = false;
    $('#triadQuizPanel').style.display = 'none';
    $('#triadNormalView').style.display = 'flex';
  }

  // ---------- TÉCNICA: power chords ----------
  function renderPowerChordSection(){
    if (!$('#powerChordRootGroup').children.length) {
      DISPLAY.forEach((name, pc) => {
        const b = document.createElement('button');
        b.textContent = name;
        if (pc === state.powerChord.root) b.classList.add('active');
        b.addEventListener('click', () => {
          state.powerChord.root = pc;
          document.querySelectorAll('#powerChordRootGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderPowerChordDiagram();
        });
        $('#powerChordRootGroup').appendChild(b);
      });
      document.querySelectorAll('#powerChordStringGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.powerChord.stringIdx = Number(b.dataset.pstring);
          document.querySelectorAll('#powerChordStringGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderPowerChordDiagram();
        });
      });
      $('#powerChordOctaveToggle').classList.add('active');
      $('#powerChordOctaveToggle').addEventListener('click', () => {
        state.powerChord.withOctave = !state.powerChord.withOctave;
        $('#powerChordOctaveToggle').classList.toggle('active', state.powerChord.withOctave);
        renderPowerChordDiagram();
      });
      $('#powerChordPlayBtn').addEventListener('click', playPowerChord);
    }
    renderPowerChordDiagram();
  }

  function renderPowerChordDiagram(){
    const pc = state.powerChord;
    const shape = computePowerChordShape(pc.root, pc.stringIdx, pc.withOctave);
    $('#powerChordDiagram').innerHTML = renderTriadSVG(shape, shape.strings, pc.root);
  }

  function playPowerChord(){
    const pc = state.powerChord;
    const shape = computePowerChordShape(pc.root, pc.stringIdx, pc.withOctave);
    shape.strings.forEach((sIdx, i) => {
      const midi = OPEN_MIDI.guitarra[sIdx] + shape.frets[i];
      playTone(midi, 1.2, sIdx, 6);
    });
  }

  // ---------- TÉCNICA: ligados, deslizamiento, bending ----------
  const LICK_TECH_EXPLAINERS = {
    ligado: 'Pulsa la cuerda una sola vez y usa los dedos para "martillear" (hammer-on) o "tirar" (pull-off) sin volver a pulsar — así suenan varias notas seguidas con una sola pulsada de púa.',
    slide:  'Pulsa la nota y desliza el dedo por la cuerda hasta el siguiente traste sin soltar la presión — la nota "resbala" de una altura a otra, sin silencio entre medias.',
    bend:   'Empuja o tira de la cuerda hacia arriba con el dedo para subir la altura de la nota sin cambiar de traste — muy característico del blues y el rock. Aquí se simula un bend de un tono completo.'
  };

  function playSlideTone(midiStart, midiEnd, dur){
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const freqStart = 440 * Math.pow(2, (midiStart - 69) / 12);
    const freqEnd = 440 * Math.pow(2, (midiEnd - 69) / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, now + dur * 0.6);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain.gain.setValueAtTime(0.22, now + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + dur + 0.05);
  }

  function playBendTone(midiStart, midiBend, dur){
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const freqStart = 440 * Math.pow(2, (midiStart - 69) / 12);
    const freqBend = 440 * Math.pow(2, (midiBend - 69) / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(freqBend, now + dur * 0.35);
    osc.frequency.setValueAtTime(freqBend, now + dur * 0.65);
    osc.frequency.exponentialRampToValueAtTime(freqStart, now + dur * 0.95);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain.gain.setValueAtTime(0.22, now + dur * 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + dur + 0.05);
  }

  function renderLickTechSection(){
    if (!$('#lickTechStringGroup').children.length) {
      STRING_ORDINALS.forEach((label, sIdx) => {
        const b = document.createElement('button');
        b.textContent = label;
        if (sIdx === state.lickTech.stringIdx) b.classList.add('active');
        b.addEventListener('click', () => {
          state.lickTech.stringIdx = sIdx;
          document.querySelectorAll('#lickTechStringGroup button').forEach(x => x.classList.toggle('active', x === b));
        });
        $('#lickTechStringGroup').appendChild(b);
      });
      document.querySelectorAll('#lickTechGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.lickTech.type = b.dataset.ltech;
          document.querySelectorAll('#lickTechGroup button').forEach(x => x.classList.toggle('active', x === b));
          $('#lickTechExplainer').textContent = LICK_TECH_EXPLAINERS[state.lickTech.type];
        });
      });
      document.querySelectorAll('#lickTechFretGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.lickTech.startFret = Number(b.dataset.lfret);
          document.querySelectorAll('#lickTechFretGroup button').forEach(x => x.classList.toggle('active', x === b));
        });
      });
      $('#lickTechPlayBtn').addEventListener('click', playLickTech);
      $('#lickTechExplainer').textContent = LICK_TECH_EXPLAINERS[state.lickTech.type];
    }
  }

  function playLickTech(){
    const lt = state.lickTech;
    const openMidi = OPEN_MIDI.guitarra[lt.stringIdx];
    const f0 = lt.startFret;
    if (lt.type === 'ligado') {
      const sequence = [f0, f0 + 2, f0 + 3, f0 + 2]; // hammer-on subiendo, pull-off bajando
      sequence.forEach((f, i) => setTimeout(() => playTone(openMidi + f, 0.5, lt.stringIdx, 6), i * 180));
    } else if (lt.type === 'slide') {
      playSlideTone(openMidi + f0, openMidi + f0 + 5, 0.8);
    } else if (lt.type === 'bend') {
      playBendTone(openMidi + f0, openMidi + f0 + 2, 1.0); // bend de un tono completo (2 semitonos)
    }
  }

  function renderTriadSection(){
    if (!$('#triadRootGroup').children.length) {
      populateTriadControls();
      document.querySelectorAll('#triadTonalityGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.triad.tonality = b.dataset.tonality;
          state.triad.progressionIdx = null;
          document.querySelectorAll('#triadTonalityGroup button').forEach(x => x.classList.toggle('active', x === b));
          renderTriadHarmony();
        });
      });
    }
    renderTriadDiagram();
    renderTriadHarmony();
    renderTriadMapCards();
  }

  // ---------- OÍDO: entrenamiento auditivo (intervalos y calidad de acorde) ----------
  const INTERVALS = [
    { semitones: 1,  name: '2ª menor' },
    { semitones: 2,  name: '2ª mayor' },
    { semitones: 3,  name: '3ª menor' },
    { semitones: 4,  name: '3ª mayor' },
    { semitones: 5,  name: '4ª justa' },
    { semitones: 6,  name: 'Tritono' },
    { semitones: 7,  name: '5ª justa' },
    { semitones: 8,  name: '6ª menor' },
    { semitones: 9,  name: '6ª mayor' },
    { semitones: 10, name: '7ª menor' },
    { semitones: 11, name: '7ª mayor' },
    { semitones: 12, name: 'Octava' },
  ];
  const OIDO_QUALITY_LABELS = { major: 'Mayor', minor: 'Menor', aug: 'Aumentada', dim: 'Disminuida' };
  // pool de progresiones a reconocer de oído: reutiliza las progresiones ya verificadas de
  // Tríadas más las 3 cadencias — nada nuevo que verificar, ya está probado en otras secciones
  const OIDO_PROGRESSION_POOL = [
    ...TRIAD_PROGRESSIONS_MAJOR.map(p => ({ label: p.label, degrees: p.degrees })),
    ...CADENCES.map(c => ({ label: c.label, degrees: c.degrees })),
  ];

  function renderOidoSection(){
    if (!$('#oidoModeGroup').dataset.wired) {
      $('#oidoModeGroup').dataset.wired = '1';
      document.querySelectorAll('#oidoModeGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.oido.mode = b.dataset.omode;
          document.querySelectorAll('#oidoModeGroup button').forEach(x => x.classList.toggle('active', x === b));
          $('#oidoPlaybackRow').style.display = state.oido.mode === 'intervalo' ? 'flex' : 'none';
          oidoNewRound();
        });
      });
      document.querySelectorAll('#oidoPlaybackGroup button').forEach(b => {
        b.addEventListener('click', () => {
          state.oido.playback = b.dataset.playback;
          document.querySelectorAll('#oidoPlaybackGroup button').forEach(x => x.classList.toggle('active', x === b));
        });
      });
      $('#oidoPlayBtn').addEventListener('click', oidoPlayCurrent);
      $('#oidoRepeatBtn').addEventListener('click', oidoPlayCurrent);
      $('#oidoNextBtn').addEventListener('click', oidoNewRound);
      oidoNewRound();
    }
    $('#oidoExplainer').textContent = state.oido.mode === 'intervalo'
      ? 'Suenan 2 notas. Identifica la distancia entre ellas (el intervalo). Elige "Melódico" para oírlas una tras otra, o "Armónico" para oírlas juntas — el armónico es más difícil.'
      : state.oido.mode === 'acorde'
      ? 'Suena una tríada (3 notas juntas). Identifica si es Mayor, Menor, Aumentada o Disminuida, solo de oído.'
      : 'Suena una progresión de 2 a 4 acordes, en una tonalidad al azar. Identifica cuál es — incluye progresiones típicas y las 3 cadencias.';
  }

  function oidoNewRound(){
    const q = state.oido;
    q.guess = null;
    $('#oidoFeedback').textContent = '';
    const rootMidi = 55 + Math.floor(Math.random() * 13); // rango cómodo, ni muy grave ni muy agudo
    if (q.mode === 'intervalo') {
      const iv = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
      q.target = { rootMidi, semitones: iv.semitones, label: iv.name };
    } else if (q.mode === 'acorde') {
      const qualities = Object.keys(OIDO_QUALITY_LABELS);
      const quality = qualities[Math.floor(Math.random() * qualities.length)];
      q.target = { rootMidi, quality, label: OIDO_QUALITY_LABELS[quality] };
    } else {
      const rootPc = Math.floor(Math.random() * 12);
      const prog = OIDO_PROGRESSION_POOL[Math.floor(Math.random() * OIDO_PROGRESSION_POOL.length)];
      const diatonic = triadDiatonicDegrees(rootPc, 'major');
      const chords = prog.degrees.map(d => diatonic[d]);
      q.target = { rootPc, chords, label: prog.label };
    }
    renderOidoAnswerButtons();
    oidoPlayCurrent();
  }

  function oidoPlayCurrent(){
    const q = state.oido;
    if (!q.target) return;
    if (q.mode === 'intervalo') {
      const note2 = q.target.rootMidi + q.target.semitones;
      playPianoTone(q.target.rootMidi);
      if (q.playback === 'melodic') setTimeout(() => playPianoTone(note2), 550);
      else playPianoTone(note2);
    } else if (q.mode === 'acorde') {
      TRIAD_QUALITIES[q.target.quality].formula.forEach(iv => playPianoTone(q.target.rootMidi + iv));
    } else {
      q.target.chords.forEach((c, i) => setTimeout(() => {
        const rootMidi = (4 + 1) * 12 + c.root;
        TRIAD_QUALITIES[c.quality].formula.forEach(iv => playPianoTone(rootMidi + iv));
      }, i * 800));
    }
  }

  function renderOidoAnswerButtons(){
    const wrap = $('#oidoAnswerGroup');
    wrap.innerHTML = '';
    const q = state.oido;
    const options = q.mode === 'intervalo' ? INTERVALS.map(iv => iv.name)
      : q.mode === 'acorde' ? Object.values(OIDO_QUALITY_LABELS)
      : OIDO_PROGRESSION_POOL.map(p => p.label);
    options.forEach(opt => {
      const b = document.createElement('button');
      b.textContent = opt;
      b.addEventListener('click', () => oidoCheckAnswer(opt));
      wrap.appendChild(b);
    });
  }

  function oidoCheckAnswer(guessLabel){
    const q = state.oido;
    if (q.guess !== null || !q.target) return; // ya contestada esta ronda
    q.guess = guessLabel;
    q.attempts++;
    const correct = guessLabel === q.target.label;
    if (correct) q.score++;
    $('#oidoFeedback').textContent = correct ? '✅ ¡Correcto!' : `❌ Era: ${q.target.label}`;
    $('#oidoStatus').textContent = `Aciertos: ${q.score}/${q.attempts}`;
    document.querySelectorAll('#oidoAnswerGroup button').forEach(b => {
      if (b.textContent === q.target.label) b.classList.add('correct');
      else if (b.textContent === guessLabel) b.classList.add('wrong');
    });
  }

  function renderPianoSection(){
    if (!$('#pianoKeyboard').children.length) {
      renderStaffBase();
      renderPianoKeyboard();
      populatePianoChordControls();
    }
  }

  function pianoSetClefView(view){
    state.pianoClefView = view;
    document.querySelectorAll('#pianoClefGroup button').forEach(b => b.classList.toggle('active', b.dataset.clef === view));
    renderStaffBase();
  }

  function populatePianoChordControls(){
    const rootWrap = $('#pianoChordRootGroup');
    rootWrap.innerHTML = '';
    DISPLAY.forEach((name, pc) => {
      const b = document.createElement('button');
      b.textContent = name;
      b.dataset.root = pc;
      if (pc === state.pianoChordRoot) b.classList.add('active');
      b.addEventListener('click', () => {
        state.pianoChordRoot = pc;
        document.querySelectorAll('#pianoChordRootGroup button').forEach(x => x.classList.toggle('active', x === b));
        pianoShowCurrentChord();
      });
      rootWrap.appendChild(b);
    });

    const sel = $('#pianoChordQualitySelect');
    sel.innerHTML = '';
    Object.entries(CHORD_QUALITIES).forEach(([key, q]) => {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = q.label;
      sel.appendChild(opt);
    });
    sel.value = state.pianoChordQuality;
    sel.addEventListener('change', (e) => {
      state.pianoChordQuality = e.target.value;
      pianoUpdateVoicingRowVisibility();
      pianoShowCurrentChord();
    });

    document.querySelectorAll('#pianoChordOctaveGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.pianoChordOctave = Number(b.dataset.oct);
        document.querySelectorAll('#pianoChordOctaveGroup button').forEach(x => x.classList.toggle('active', x === b));
        pianoShowCurrentChord();
      });
    });

    $('#pianoChordPlayBtn').addEventListener('click', () => {
      const notes = pianoShowCurrentChord();
      playChordTones(notes);
    });

    document.querySelectorAll('#pianoVoicingGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.pianoVoicing = b.dataset.voicing;
        document.querySelectorAll('#pianoVoicingGroup button').forEach(x => x.classList.toggle('active', x === b));
        pianoShowCurrentChord();
      });
    });
    pianoUpdateVoicingRowVisibility();
  }

  function pianoSetMode(mode){
    state.pianoMode = mode;
    document.querySelectorAll('#pianoModeGroup button').forEach(b => b.classList.toggle('active', b.dataset.pmode === mode));
    $('#pianoRandomBtn').style.display = mode === 'note' ? '' : 'none';
    $('#pianoNoteDisplay').style.display = mode === 'note' ? '' : 'none';
    $('#pianoChordRow').style.display = mode === 'chord' ? 'flex' : 'none';
    $('#pianoScaleRow').style.display = mode === 'scale' ? 'flex' : 'none';
    $('#pianoScaleInfo').style.display = mode === 'scale' ? '' : 'none';
    document.querySelectorAll('.piano-key-white.active, .piano-key-black.active').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.piano-key-white .finger-badge, .piano-key-black .finger-badge').forEach(el => el.remove());
    clearStaffNote();
    pianoUpdateVoicingRowVisibility();
    if (mode === 'chord') pianoShowCurrentChord();
    if (mode === 'scale') { if (!$('#pianoScaleRootGroup').children.length) populatePianoScaleControls(); renderPianoScale(); }
  }

  function pianoUpdateVoicingRowVisibility(){
    const eligible = ROOTLESS_BASE_TONES[state.pianoChordQuality] !== undefined;
    $('#pianoVoicingRow').style.display = (state.pianoMode === 'chord' && eligible) ? 'flex' : 'none';
  }

  // ---------- PIANO: modo Escala (digitación de mano derecha) ----------
  const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
  // digitación estándar de mano derecha, escala mayor ascendente — verificada solo para estas 6
  // tonalidades (las que no cruzan el pulgar de forma atípica). Do/Sol/Re/La/Mi: 1-2-3,1-2-3-4-5.
  // Fa es la excepción: el 4º dedo toca el Sib en vez de cruzar el pulgar.
  const PIANO_SCALE_FINGERING_RH = {
    0: [1,2,3,1,2,3,4,5], 7: [1,2,3,1,2,3,4,5], 2: [1,2,3,1,2,3,4,5],
    9: [1,2,3,1,2,3,4,5], 4: [1,2,3,1,2,3,4,5], 5: [1,2,3,4,1,2,3,4],
  };

  function populatePianoScaleControls(){
    const rootWrap = $('#pianoScaleRootGroup');
    DISPLAY.forEach((name, pc) => {
      const b = document.createElement('button');
      b.textContent = name;
      if (pc === state.pianoScale.root) b.classList.add('active');
      b.addEventListener('click', () => {
        state.pianoScale.root = pc;
        document.querySelectorAll('#pianoScaleRootGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderPianoScale();
      });
      rootWrap.appendChild(b);
    });
    document.querySelectorAll('#pianoScaleOctaveGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.pianoScale.octave = Number(b.dataset.soct);
        document.querySelectorAll('#pianoScaleOctaveGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderPianoScale();
      });
    });
    $('#pianoScalePlayBtn').addEventListener('click', playPianoScale);
  }

  function pianoScaleNotes(){
    const { root, octave } = state.pianoScale;
    return MAJOR_SCALE_INTERVALS.map(iv => {
      const totalPc = root + iv;
      const pc = ((totalPc % 12) + 12) % 12;
      const oct = octave + Math.floor(totalPc / 12);
      return pianoNoteData(pc, oct);
    });
  }

  // dibuja la escala completa repartida a lo ancho del pentagrama (como una escala real escrita
  // en el papel), en vez de apiladas en el mismo sitio como si fuera un acorde — cada nota con su
  // propia línea guía si necesita líneas adicionales.
  function showScaleOnStaff(notes){
    const ns = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => {
      const el = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
      return el;
    };
    const p = pianoStaffParams();
    const svg = $('#staffSVG');
    let layer = svg.querySelector('#staffNoteLayer');
    if (!layer) { layer = mk('g', { id: 'staffNoteLayer' }); svg.appendChild(layer); }
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    const marginL = 130, marginR = 40;
    const usableWidth = 700 - marginL - marginR;
    const step = notes.length > 1 ? usableWidth / (notes.length - 1) : 0;
    notes.forEach((note, i) => {
      const nx = marginL + i * step;
      const entry = pianoDrawNoteAt(layer, mk, p, note, nx);
      pianoDrawSharedGuide(layer, mk, p, [entry], nx + 8);
    });
    void svg.offsetHeight;
  }

  function renderPianoScale(){
    document.querySelectorAll('.piano-key-white .finger-badge, .piano-key-black .finger-badge').forEach(el => el.remove());
    const notes = pianoScaleNotes();
    showScaleOnStaff(notes);
    const fingering = PIANO_SCALE_FINGERING_RH[state.pianoScale.root];
    const info = $('#pianoScaleInfo');
    if (!fingering) {
      info.textContent = `Escala de ${DISPLAY[state.pianoScale.root]} mayor: ${notes.map(n => DISPLAY[n.pc]).join('-')}. La digitación todavía no está verificada para esta tonalidad — de momento solo está confirmada para Do, Sol, Re, La, Mi y Fa mayor.`;
    } else {
      info.innerHTML = `Escala de ${DISPLAY[state.pianoScale.root]} mayor (mano derecha, ascendente): ` +
        notes.map((n, i) => `${DISPLAY[n.pc]} (${fingering[i]})`).join(' - ');
      notes.forEach((n, i) => {
        const keyEl = document.querySelector(`.piano-keyboard [data-pc="${n.pc}"][data-octave="${n.octave}"]`);
        if (keyEl) {
          const badge = document.createElement('span');
          badge.className = 'finger-badge';
          badge.textContent = fingering[i];
          keyEl.appendChild(badge);
        }
      });
    }
  }

  function playPianoScale(){
    const notes = pianoScaleNotes();
    notes.forEach((n, i) => setTimeout(() => {
      document.querySelectorAll('.piano-key-white.active, .piano-key-black.active').forEach(el => el.classList.remove('active'));
      const keyEl = document.querySelector(`.piano-keyboard [data-pc="${n.pc}"][data-octave="${n.octave}"]`);
      if (keyEl) { keyEl.classList.add('active'); pianoScrollToKeys([keyEl]); }
      playPianoTone(n.midi);
    }, i * 400));
  }

  let circleSelected = 0;

  function renderCircleWheel(){
    const wheel = $('#circleWheel');
    wheel.innerHTML = '';
    const R = 42;
    CIRCLE_ORDER.forEach((majorPc, i) => {
      const minorPc = (majorPc + 9) % 12;
      const angle = (i * 30 - 90) * Math.PI / 180;
      const x = 50 + R * Math.cos(angle);
      const y = 50 + R * Math.sin(angle);
      const node = document.createElement('div');
      node.className = 'circle-node';
      node.style.left = x + '%';
      node.style.top = y + '%';
      node.dataset.idx = i;
      node.innerHTML = `<span class="cn-major">${DISPLAY[majorPc]}</span><span class="cn-minor">${DISPLAY[minorPc]}m</span>`;
      node.addEventListener('click', () => { circleSelected = i; renderCircleInfo(); });
      wheel.appendChild(node);
    });
    renderCircleInfo();
  }

  function renderCircleInfo(){
    document.querySelectorAll('.circle-node').forEach(node => {
      const idx = Number(node.dataset.idx);
      node.classList.toggle('selected', idx === circleSelected);
      const isNeighbor = idx === (circleSelected + 1) % 12 || idx === (circleSelected + 11) % 12;
      node.classList.toggle('neighbor', isNeighbor);
    });

    const majorPc = CIRCLE_ORDER[circleSelected];
    const minorPc = (majorPc + 9) % 12;
    const acc = circleAccidentals(circleSelected);
    const vPc = CIRCLE_ORDER[(circleSelected + 1) % 12];
    const ivPc = CIRCLE_ORDER[(circleSelected + 11) % 12];
    const accText = acc.count === 0 ? 'Sin sostenidos ni bemoles' : `${acc.count} ${acc.type}${acc.count > 1 ? 's' : ''}: ${acc.notes.join(', ')}`;

    $('#circleInfo').innerHTML = `
      <div class="circle-info-name">${DISPLAY[majorPc]} mayor</div>
      <div class="circle-info-row"><b>Armadura:</b> ${accText}</div>
      <div class="circle-info-row"><b>Relativa menor:</b> ${DISPLAY[minorPc]}m</div>
      <div class="circle-info-row"><b>Vecinas:</b> ${DISPLAY[ivPc]} (su IV) ← ${DISPLAY[majorPc]} → ${DISPLAY[vPc]} (su V)</div>
      <button class="play-btn" id="circleUseRootBtn">Usar ${DISPLAY[majorPc]} como tónica</button>`;
    $('#circleUseRootBtn').addEventListener('click', () => { state.root = majorPc; render(); });
  }

  function renderTheorySection(){
    const chords = diatonicChords(state.root);
    const table = $('#theoryTable');
    table.innerHTML = `
      <thead><tr><th>Grado</th><th>Notas (1-3-5-7)</th><th>Acorde</th><th>Tríada simple</th></tr></thead>
      <tbody>${chords.map((c, d) => `
        <tr class="${PROGRESSION_4263.includes(d) ? 'highlight' : ''}">
          <td>${c.roman}</td><td>${c.tones.join('-')}</td><td>${c.chord7}</td><td>${c.triad}</td>
        </tr>`).join('')}</tbody>`;

    const prog = PROGRESSION_4263.map(d => chords[d]);
    $('#theoryProgression').innerHTML =
      `<b>Progresión 4-2-6-3</b> (IV-ii-vi-iii) en ${DISPLAY[state.root]} mayor: ` +
      `${prog.map(c => c.chord7).join(' - ')} &nbsp;·&nbsp; con tríadas: ${prog.map(c => c.triad).join(' - ')}`;

    circleSelected = CIRCLE_ORDER.indexOf(state.root);
    renderCircleInfo();
  }

  // ---------- PATRÓN DE PÚA (alternada / económica) ----------
  // Alternada: siempre abajo-arriba-abajo-arriba, cambie o no de cuerda.
  // Económica: dentro de la misma cuerda también alterna; al cambiar de cuerda, si la última
  // pulsada fue hacia abajo y la nueva cuerda tiene índice MAYOR (barrido natural hacia cuerdas
  // más agudas), continúa hacia abajo sin alternar; simétricamente hacia arriba al bajar de
  // cuerda. Es el motivo real por el que los patrones de 3 notas por cuerda son tan populares:
  // con un número impar de notas por cuerda, el cambio de cuerda siempre cae en el lado económico.
  function buildPickingSequence(notes, mode){
    if (mode === 'off' || notes.length === 0) return null;
    const picks = [];
    let last = 'D';
    notes.forEach((n, i) => {
      if (i === 0) { picks.push(last); return; }
      const prev = notes[i - 1];
      if (mode === 'alternate') {
        last = last === 'D' ? 'U' : 'D';
      } else if (n.sIdx === prev.sIdx) {
        last = last === 'D' ? 'U' : 'D'; // misma cuerda: siempre alterna
      } else if (last === 'D' && n.sIdx > prev.sIdx) {
        // continúa hacia abajo: barrido natural hacia una cuerda más aguda
      } else if (last === 'U' && n.sIdx < prev.sIdx) {
        // continúa hacia arriba: barrido natural hacia una cuerda más grave
      } else {
        last = last === 'D' ? 'U' : 'D'; // no hay continuidad económica: alterna
      }
      picks.push(last);
    });
    return picks;
  }

  function rebuildCurrentRiff(){ conVistaDeSeccion(construirRiffActual); }
  function construirRiffActual(){
    currentRiff = state.tab === 'estilos' ? buildStyleRiff()
      : state.tab === 'tecnica' ? buildChromaticExercise()
      : state.tab === 'licks' ? buildLickRiff()
      : usingWalkingBass() ? buildBassLine()
      : buildRiff();
    $('#tabDisplay').textContent = renderTab(currentRiff);
    $('#playRiffBtn').disabled = currentRiff.length === 0 || state.playing;

    const nps3Active = (state.tab === 'escalas' && state.threeNPS && THREE_NPS_SCALES.has(state.scaleKey)) || state.tab === 'tecnica' || usingWalkingBass();
    const fingerEl = $('#fingerLine');
    if (usingSequenceMode()) {
      fingerEl.textContent = 'Secuencia por todo el mástil: la digitación de dedos cambia de posición, así que aquí no se sugiere un número fijo.';
    } else if ((state.zone === 'full' && !nps3Active) || currentRiff.length === 0) {
      fingerEl.textContent = (state.zone === 'full' && !nps3Active)
        ? 'Selecciona una caja/zona del mástil (no "Todo") para ver sugerencia de dedos.'
        : (usingWalkingBass() ? 'Construye una progresión en Acordes para generar la línea de bajo.' : '');
    } else {
      const lo = currentRange()[0];
      const fingers = currentRiff.map(step => step.rest ? '·' : (step.chord ? 'ac' : (fingerFor(step.fret, lo) ?? '0')));
      fingerEl.innerHTML = '<b>Dedos:</b> ' + fingers.join('-') + '  (0 = cuerda al aire)'
        + (state.tab === 'estilos' ? '  ·  <b>x</b> = palm-mute  ·  <b>!</b> = acento  ·  <b>·</b> = silencio  ·  <b>ac</b> = acorde' : '')
        + (usingWalkingBass() ? '  ·  cada nota = un tiempo; la 1ª de cada acorde (acentuada) es la raíz' : '');
    }

    const pickingEl = $('#pickingLine');
    const showPicking = (state.tab === 'escalas' || state.tab === 'tecnica') && state.pickingMode !== 'off' && currentRiff.length > 0;
    if (showPicking) {
      const picks = buildPickingSequence(currentRiff, state.pickingMode);
      const arrows = picks.map(p => p === 'D' ? '↓' : '↑');
      const modeName = state.pickingMode === 'alternate' ? 'alternada' : 'económica';
      pickingEl.innerHTML = `<b>Púa (${modeName}):</b> ` + arrows.join(' ');
    } else {
      pickingEl.textContent = '';
    }
  }

  function updateRiffPanel(){
    if (state.playing) stopRiff(); // el riff va a cambiar: cortamos limpio lo que sonaba antes
    rebuildCurrentRiff();
  }

  // ---------- AUDIO + ANIMACIÓN ----------
  let audioCtx = null;
  // ---------- AMPLI NAM (Neural Amp Modeler) — motor real de bajo nivel ----------
  // se importa dinámicamente (import() funciona dentro de un <script> clásico) usando el
  // importmap del <head>; nada de esto bloquea la carga inicial de la app, solo se activa
  // si el usuario elige un ampli en el EQ.
  let namEngine = null, namNode = null;
  let namDryGain = null, namWetGain = null; // mismo patrón dry/wet validado en la prueba aislada
  let namLoadedText = null; // último texto de modelo ya cargado en el nodo — evita recargar si no ha cambiado

  // cualquier fuente de guitarra/bajo sintetizada (nota interactiva o looper) llama a esto en
  // vez de conectar directo al destino/bus — reparte la señal por los caminos seco/procesado
  // y el gain de cada uno decide cuál se oye, sin reconectar nada al cambiar de ampli
  function ampChainInput(){
    const ctx = getAudioCtx();
    if (!namDryGain) {
      namDryGain = ctx.createGain(); namDryGain.gain.value = 1;
      namWetGain = ctx.createGain(); namWetGain.gain.value = 0;
      namDryGain.connect(getDrumMasterBus());
      namWetGain.connect(getDrumMasterBus());
    }
    const input = ctx.createGain(); // nodo de entrada nuevo por nota, se conecta a ambos caminos
    input.connect(namDryGain);
    if (namNode) input.connect(namNode);
    return input;
  }

  async function setNamAmpMode(mode){
    state.namAmp.mode = mode;
    const statusEl = $('#namAmpStatus');
    if (mode === 'none') {
      if (namDryGain) { namDryGain.gain.value = 1; namWetGain.gain.value = 0; }
      if (statusEl) statusEl.textContent = state.namAmp.modelName ? ('cargado: ' + state.namAmp.modelName + ' (en pausa)') : '';
      return;
    }
    if (!state.namAmp.jsonText) {
      if (statusEl) statusEl.textContent = 'Carga primero un archivo .nam';
      state.namAmp.mode = 'none';
      return;
    }
    try {
      if (statusEl) statusEl.textContent = 'cargando...';
      const ctx = getAudioCtx();
      ampChainInput(); // asegura que dryGain/wetGain existan antes de conectar namNode
      if (!namEngine) {
        const { NamEngine } = await import('neural-amp-modeler-wasm/engine');
        namEngine = await NamEngine.attach(ctx);
        namNode = await namEngine.createNode();
        namNode.connect(namWetGain);
      }
      if (namLoadedText !== state.namAmp.jsonText) {
        await namNode.loadModel(state.namAmp.jsonText);
        namLoadedText = state.namAmp.jsonText;
      }
      namDryGain.gain.value = 0; namWetGain.gain.value = 1;
      if (statusEl) statusEl.textContent = '✅ ' + state.namAmp.modelName;
    } catch (err) {
      if (statusEl) statusEl.textContent = '❌ ' + err.message;
      state.namAmp.mode = 'none';
      document.querySelectorAll('#namAmpGroup button').forEach(b => b.classList.toggle('active', b.dataset.namMode === 'none'));
    }
  }

  function getAudioCtx(){
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // ---------- MUESTRAS REALES (las mismas de Aprende: tonejs-instruments, CC BY 3.0; ver aprende/sonidos/CREDITOS.md) ----------
  // Una nota de cada tres semitonos por instrumento; las intermedias, cambiando la velocidad (como mucho ±2 semitonos).
  // Mientras se descargan, fuera de ese rango o con el ajuste «Sintético», suena la síntesis de siempre.
  const MUESTRAS_TALLER = {
    guitarra: ['guitar-acoustic', ['E2', 'G2', 'As2', 'Cs3', 'E3', 'G3', 'As3', 'Cs4', 'E4', 'G4', 'As4', 'Cs5'], 1.0],
    bajo: ['bass-electric', ['E1', 'G1', 'As1', 'Cs2', 'E2', 'G2', 'As2', 'Cs3', 'E3', 'G3', 'As3', 'Cs4'], 1.0],
    piano: ['piano', ['C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6'], 0.5],
  };
  const bancosMuestras = {};   // instrumento → Map(midi → AudioBuffer) | 'cargando' | null (falló)
  const midiDeMuestra = n => ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[n[0]] + (n[1] === 's' ? 1 : 0) + 12 * (Number(n.slice(n[1] === 's' ? 2 : 1)) + 1);
  function bancoMuestras(inst){
    if (bancosMuestras[inst] === undefined && location.protocol === 'file:') bancosMuestras[inst] = null;   // abierto desde el disco: el navegador no deja leerlas
    if (bancosMuestras[inst] === undefined) {
      bancosMuestras[inst] = 'cargando';
      const [carpeta, notas] = MUESTRAS_TALLER[inst], ctx = getAudioCtx();
      Promise.all(notas.map(async n => {
        const r = await fetch(`aprende/sonidos/${carpeta}/${n}.mp3`);
        if (!r.ok) throw new Error(r.status);
        return [midiDeMuestra(n), await ctx.decodeAudioData(await r.arrayBuffer())];
      })).then(pares => { bancosMuestras[inst] = new Map(pares); })
        .catch(() => { bancosMuestras[inst] = null; });   // sin red o desde file://: se queda la síntesis
    }
    return bancosMuestras[inst] instanceof Map ? bancosMuestras[inst] : null;
  }
  // Toca una muestra si puede; devuelve false para que quien llama use la síntesis.
  function tocarMuestra(inst, midi, dur, destino){
    if (state.sonidoReal === false) return false;
    const banco = bancoMuestras(inst);
    if (!banco) return false;
    let mejor = null;
    for (const m of banco.keys()) if (mejor === null || Math.abs(m - midi) < Math.abs(mejor - midi)) mejor = m;
    if (Math.abs(mejor - midi) > 2) return false;
    const ctx = getAudioCtx(), t = ctx.currentTime;
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = banco.get(mejor);
    src.playbackRate.value = Math.pow(2, (midi - mejor) / 12);
    gain.gain.setValueAtTime(MUESTRAS_TALLER[inst][2], t);
    gain.gain.setTargetAtTime(0.0001, t + dur, 0.15);    // se apaga suave al acabar la nota
    src.connect(gain).connect(typeof destino === 'function' ? destino() : destino);
    src.start(t); src.stop(t + dur + 1.2);
    return true;
  }

  // ---------- CAJA DE RITMOS: síntesis de batería (sin muestras de audio) ----------
  // Cada voz se genera con osciladores/ruido + envolventes, técnicas estándar de cualquier
  // caja de ritmos analógica clásica (ej. el hi-hat de 6 ondas cuadradas inarmónicas es la
  // técnica real de la TR-808/909, no una simplificación nuestra).
  function drumNoiseBuffer(ctx, durationSec){
    const n = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // ---------- CAJA DE RITMOS & LOOPER: bus maestro y efectos ----------
  // arquitectura "send/return": la señal seca (drumMasterBus -> destino) siempre suena entera;
  // cada efecto tiene su propio "envío" (0% por defecto) que mezcla más señal procesada encima,
  // sin restar nunca de la seca — así subir un efecto nunca "apaga" el sonido limpio.
  let drumMasterBus = null;
  const drumFxSends = { delay: null, reverb: null, chorus: null };

  function buildSyntheticImpulseResponse(ctx, duration, decay){
    const rate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * duration));
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  function getDrumMasterBus(){
    const ctx = getAudioCtx();
    if (drumMasterBus) return drumMasterBus;
    drumMasterBus = ctx.createGain();
    drumMasterBus.gain.value = 1;
    drumMasterBus.connect(ctx.destination); // señal seca, siempre activa

    // DELAY: eco con realimentación
    const delaySend = ctx.createGain(); delaySend.gain.value = 0;
    const delayNode = ctx.createDelay(1.5); delayNode.delayTime.value = 0.32;
    const delayFeedback = ctx.createGain(); delayFeedback.gain.value = 0.35;
    drumMasterBus.connect(delaySend);
    delaySend.connect(delayNode);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(ctx.destination);
    drumFxSends.delay = delaySend;

    // REVERB: respuesta de impulso sintética (ruido con caída exponencial, verificado)
    const reverbSend = ctx.createGain(); reverbSend.gain.value = 0;
    const convolver = ctx.createConvolver();
    convolver.buffer = buildSyntheticImpulseResponse(ctx, 2.2, 2.2);
    drumMasterBus.connect(reverbSend);
    reverbSend.connect(convolver);
    convolver.connect(ctx.destination);
    drumFxSends.reverb = reverbSend;

    // CHORUS: línea de retardo corta modulada por un LFO lento
    const chorusSend = ctx.createGain(); chorusSend.gain.value = 0;
    const chorusDelay = ctx.createDelay(0.05);
    chorusDelay.delayTime.value = 0.015;
    const chorusLFO = ctx.createOscillator();
    chorusLFO.type = 'sine'; chorusLFO.frequency.value = 0.8;
    const chorusLFOGain = ctx.createGain(); chorusLFOGain.gain.value = 0.006;
    chorusLFO.connect(chorusLFOGain);
    chorusLFOGain.connect(chorusDelay.delayTime);
    chorusLFO.start();
    drumMasterBus.connect(chorusSend);
    chorusSend.connect(chorusDelay);
    chorusDelay.connect(ctx.destination);
    drumFxSends.chorus = chorusSend;

    return drumMasterBus;
  }

  function setDrumFxSend(name, amount01){
    getDrumMasterBus(); // asegura que está inicializado
    if (drumFxSends[name]) drumFxSends[name].gain.value = amount01;
  }

  // ---------- LOOPER DE PIANO ----------
  // reutiliza pianoChordNotes (ya construido y verificado para el modo Acorde del Piano) para
  // saber qué notas tocar; el sonido va por el MISMO bus maestro que la batería, así que los
  // efectos (reverb/chorus/delay) se aplican por igual a los dos.
  function playLooperChordTone(time, midi, vol, dur, staccato){
    const ctx = getAudioCtx();
    const bus = getDrumMasterBus();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const timbre = state.pianoLooper.timbre;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = timbre === 'sine' ? 'sine' : timbre === 'bright' ? 'sawtooth' : 'triangle';
    osc.frequency.value = freq;
    const safeVol = Math.max(vol, 0.0001); // exponentialRampToValueAtTime no admite 0 exacto como destino
    const attack = staccato ? 0.006 : 0.05; // ataque mucho más rápido y percusivo en modo staccato
    const sustainUntil = time + (staccato ? dur * 0.3 : dur * 0.7);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(safeVol, time + attack);
    gain.gain.setValueAtTime(safeVol, sustainUntil);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain).connect(bus);
    osc.start(time);
    osc.stop(time + dur + 0.05);

    // "brillante": una segunda voz sutil una octava por encima, más suave y con caída rápida,
    // para dar un toque de brillo tipo campana sin cambiar el tono fundamental
    if (timbre === 'bright') {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      const safeVol2 = Math.max(vol * 0.25, 0.0001);
      gain2.gain.setValueAtTime(0.0001, time);
      gain2.gain.exponentialRampToValueAtTime(safeVol2, time + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(dur, 0.5));
      osc2.connect(gain2).connect(bus);
      osc2.start(time);
      osc2.stop(time + Math.min(dur, 0.5) + 0.05);
    }
  }

  function pianoLooperTotalBars(){
    return state.pianoLooper.chords.reduce((sum, c) => sum + c.bars, 0);
  }

  // encuentra qué acorde de la lista corresponde a un número de compás dentro del bucle completo,
  // y si ese compás es el PRIMERO del acorde (para no repetirlo en cada compás que dura, solo al
  // empezar su turno)
  function pianoLooperChordAtBar(barIndexInLoop){
    let acc = 0;
    for (let idx = 0; idx < state.pianoLooper.chords.length; idx++) {
      const chord = state.pianoLooper.chords[idx];
      if (barIndexInLoop < acc + chord.bars) return { chord, idx, isFirstBarOfChord: barIndexInLoop === acc };
      acc += chord.bars;
    }
    return null;
  }

  function pianoLooperPlayChord(time, chordSpec, dur, staccato){
    const notes = pianoChordNotes(chordSpec.root, chordSpec.octave, chordSpec.quality);
    notes.forEach(n => playLooperChordTone(time, n.midi, state.pianoLooper.volume, dur, staccato));
  }

  // resalta en la lista de acordes cuál está sonando AHORA — se programa con setTimeout para que
  // el resaltado visual aparezca en el mismo instante exacto que el sonido, no cuando se programa
  // (que va por delante, igual que ya hace flashDrumStep con los pasos de la rejilla).
  function flashPianoLooperChord(idx, time){
    const ctx = getAudioCtx();
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      document.querySelectorAll('.drum-looper-chip').forEach(chip => {
        chip.classList.toggle('current-chord', Number(chip.dataset.idx) === idx);
      });
    }, delayMs);
  }

  // se llama en CADA paso del secuenciador (no solo al empezar compás), para poder soportar
  // patrones que tocan varias veces por compás (ej. "Negras") además del "Pad" sostenido.
  function pianoLooperMaybeTrigger(barIndex, stepIndex, time, totalStepsInBar){
    if (!state.pianoLooper.active) return;
    const totalBars = pianoLooperTotalBars();
    if (totalBars === 0) return;
    const posInLoop = barIndex % totalBars;
    const info = pianoLooperChordAtBar(posInLoop);
    if (!info) return;
    if (stepIndex === 0) flashPianoLooperChord(info.idx, time); // resaltar al empezar cada compás, pase lo que pase con el patrón
    const beatDur = 60 / state.bpm;
    const pattern = state.pianoLooper.pattern;

    if (pattern === 'pad') {
      // sostenido: suena una vez al EMPEZAR el turno del acorde, y se mantiene todo su rango
      if (stepIndex !== 0 || !info.isFirstBarOfChord) return;
      const barDur = beatDur * (totalStepsInBar / 4);
      const holdDur = barDur * info.chord.bars * 0.92;
      pianoLooperPlayChord(time, info.chord, holdDur, false);
    } else if (pattern === 'quarters') {
      // negras: un toque corto y percusivo en cada tiempo (cada 4 pasos = una negra), con hueco
      // de silencio claro entre golpe y golpe para que se note el pulso, no un pad continuo
      if (stepIndex % 4 !== 0) return;
      pianoLooperPlayChord(time, info.chord, beatDur * 0.4, true);
    } else if (pattern === 'downbeat') {
      // primer tiempo: un solo toque corto y percusivo al principio de CADA compás
      if (stepIndex !== 0) return;
      pianoLooperPlayChord(time, info.chord, beatDur * 0.5, true);
    }
  }


  // ---------- LOOPER DE BAJO ----------
  // reutiliza pluckedBuffer (el mismo Karplus-Strong ya verificado para guitarra/bajo) y comparte
  // el bus maestro con la batería y el looper de piano, para que el reverb/chorus/delay del EQ
  // se apliquen por igual a los 3. NO reutiliza playTone/playMuteTone porque esas funciones
  // disparan la nota en ctx.currentTime (pensadas para tocar en vivo), y aquí hace falta
  // programarla en un instante futuro exacto (el mismo "time" que ya usa drumScheduler).
  // ataque de púa/dedo específico para el bajo: reutiliza pickAttackBuffer (ya verificada para
  // guitarra), pero con el paso alto más bajo (900Hz en vez de 1600Hz) porque el "golpe" de una
  // cuerda de bajo es más grave que el de una de guitarra — con 1600Hz el ataque sonaba fino y
  // "de juguete", que es justo lo que hacía que el bajo se notase poco real.
  function playBassPickAttack(ctx, bus, time, peakGain){
    const dur = 0.014 + Math.random() * 0.008;
    const buffer = pickAttackBuffer(ctx, dur);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0005, time + dur);
    src.connect(hp).connect(gain).connect(ampChainInput()); // mismo camino que el cuerpo de la nota, para que el ataque y el tono pasen juntos por el ampli
    src.start(time);
  }

  function playBassLooperTone(time, midi, vol, dur){
    const ctx = getAudioCtx();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const ringTail = dur + 0.3;
    // decay y filtro ligeramente aleatorios (±) para que dos notas iguales seguidas no suenen
    // clónicas — el mismo truco que ya usa pluckedBuffer para la guitarra, aplicado aquí también
    // al corte del filtro, que antes era un valor fijo.
    const buffer = pluckedBuffer(ctx, freq, ringTail, 0.9965 + Math.random() * 0.0008);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 950 + Math.random() * 150; filter.Q.value = 0.8;
    // realce en 90-130Hz: el "cuerpo"/resonancia grave de una caja de bajo real, que faltaba del
    // todo antes (por eso sonaba plano/sintético) — mismo concepto que el filtro "body" de la
    // guitarra (180Hz), pero bajado de frecuencia y con más ganancia porque el bajo vive más grave.
    const body = ctx.createBiquadFilter();
    body.type = 'peaking'; body.frequency.value = 100; body.Q.value = 1.3; body.gain.value = 7;
    const gain = ctx.createGain();
    const safeVol = Math.max(vol, 0.0001);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(safeVol, time + 0.01);
    gain.gain.setValueAtTime(safeVol, time + Math.max(dur - 0.05, 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.05);
    src.connect(filter).connect(body).connect(gain).connect(ampChainInput());
    src.start(time);
    src.stop(time + ringTail + 0.05);
    playBassPickAttack(ctx, null, time, 0.16); // el "clack" del ataque, antes ausente por completo
  }

  // ¿es este el ÚLTIMO compás que le toca sonar a este acorde antes de pasar al siguiente?
  // hace falta para el patrón "walking": la nota de aproximación cromática solo debe sonar en el
  // último tiempo del último compás del acorde actual, no en cada compás si el acorde dura varios.
  function pianoLooperIsLastBarOfChord(posInLoop, chordIdx){
    let acc = 0;
    for (let i = 0; i < state.pianoLooper.chords.length; i++) {
      const c = state.pianoLooper.chords[i];
      if (i === chordIdx) return posInLoop === acc + c.bars - 1;
      acc += c.bars;
    }
    return true;
  }

  // se llama en cada paso del secuenciador, igual que pianoLooperMaybeTrigger — comparten
  // deliberadamente la MISMA lista de acordes (state.pianoLooper.chords) para no obligar al
  // usuario a escribir la progresión dos veces.
  function bassLooperMaybeTrigger(barIndex, stepIndex, time, totalStepsInBar){
    if (!state.bassLooper.active) return;
    const totalBars = pianoLooperTotalBars();
    if (totalBars === 0) return;
    const posInLoop = barIndex % totalBars;
    const info = pianoLooperChordAtBar(posInLoop);
    if (!info) return;
    const beatDur = 60 / state.bpm;
    const pattern = state.bassLooper.pattern;
    const octaveBase = state.bassLooper.octave;
    const rootMidi = (octaveBase + 1) * 12 + info.chord.root; // Do4 = MIDI 60, misma convención que pianoChordNotes

    if (pattern === 'raiz') {
      // una sola nota sostenida al empezar el turno del acorde, como el patrón "Pad" del piano
      if (stepIndex !== 0 || !info.isFirstBarOfChord) return;
      const barDur = beatDur * (totalStepsInBar / 4);
      const holdDur = barDur * info.chord.bars * 0.92;
      playBassLooperTone(time, rootMidi, state.bassLooper.volume, holdDur);
      return;
    }

    // el resto de patrones tocan una vez por TIEMPO (cada 4 pasos, ya sea compás de 4 o de 3 —
    // los estilos de la app siempre usan 4 pasos por tiempo, incluido el Vals de 12 pasos/3 tiempos)
    if (stepIndex % 4 !== 0) return;
    const beatIdx = stepIndex / 4;
    const dur = beatDur * 0.55;

    if (pattern === 'raiz5') {
      const fifthMidi = (octaveBase + 1) * 12 + ((info.chord.root + 7) % 12);
      playBassLooperTone(time, beatIdx % 2 === 0 ? rootMidi : fifthMidi, state.bassLooper.volume, dur);
    } else if (pattern === 'octavas') {
      playBassLooperTone(time, beatIdx % 2 === 0 ? rootMidi : rootMidi + 12, state.bassLooper.volume, dur);
    } else if (pattern === 'walking') {
      const beatsInBar = totalStepsInBar / 4;
      const isLastBeat = beatIdx === beatsInBar - 1;
      if (isLastBeat && pianoLooperIsLastBarOfChord(posInLoop, info.idx)) {
        // nota de aproximación cromática (medio tono por debajo) hacia la raíz del SIGUIENTE
        // acorde del bucle — misma técnica ya documentada en la línea de bajo walking de Acordes
        const nextInfo = pianoLooperChordAtBar((posInLoop + 1) % totalBars);
        const nextRootPc = nextInfo ? nextInfo.chord.root : info.chord.root;
        const approachPc = (nextRootPc - 1 + 12) % 12;
        playBassLooperTone(time, (octaveBase + 1) * 12 + approachPc, state.bassLooper.volume, dur);
      } else {
        const tones = walkingBeatTones(info.chord.quality); // [raíz, 3ª-ish, 5ª-ish], ya verificado
        const pc = (info.chord.root + tones[beatIdx % tones.length]) % 12;
        playBassLooperTone(time, (octaveBase + 1) * 12 + pc, state.bassLooper.volume, dur);
      }
    }
  }

  function playDrumKick(time, vol){
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.15);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);
    osc.connect(gain).connect(getDrumMasterBus());
    osc.start(time); osc.stop(time + 0.4);
  }

  function playDrumSnare(time, vol){
    const ctx = getAudioCtx();
    // cuerpo tonal (el "golpe" grave del parche)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    oscGain.gain.setValueAtTime(vol * 0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(oscGain).connect(getDrumMasterBus());
    osc.start(time); osc.stop(time + 0.12);
    // ruido filtrado (el "chasquido" del bordón)
    const noise = ctx.createBufferSource();
    noise.buffer = drumNoiseBuffer(ctx, 0.2);
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass'; filt.frequency.value = 1200;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    noise.connect(filt).connect(noiseGain).connect(getDrumMasterBus());
    noise.start(time);
  }

  const DRUM_HIHAT_FREQS = [205, 304, 369, 522, 626, 810]; // ratios inarmónicos clásicos (TR-808/909)
  function playDrumHihat(time, open, vol){
    const ctx = getAudioCtx();
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass'; bandpass.frequency.value = 10000; bandpass.Q.value = 0.6;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass'; highpass.frequency.value = 7000;
    const gain = ctx.createGain();
    const dur = open ? 0.32 : 0.06;
    gain.gain.setValueAtTime(vol * 0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    DRUM_HIHAT_FREQS.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'square'; osc.frequency.value = freq;
      osc.connect(bandpass);
      osc.start(time); osc.stop(time + dur + 0.02);
    });
    bandpass.connect(highpass).connect(gain).connect(getDrumMasterBus());
  }

  function playDrumClap(time, vol){
    const ctx = getAudioCtx();
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass'; bandpass.frequency.value = 1200; bandpass.Q.value = 1.2;
    bandpass.connect(getDrumMasterBus());
    [0, 0.012, 0.024, 0.036].forEach((offset, i) => {
      const isLast = i === 3;
      const noise = ctx.createBufferSource();
      noise.buffer = drumNoiseBuffer(ctx, 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.6, time + offset);
      g.gain.exponentialRampToValueAtTime(0.001, time + offset + (isLast ? 0.15 : 0.02));
      noise.connect(g).connect(bandpass);
      noise.start(time + offset);
    });
  }

  function playDrumTom(time, pitch, vol){
    const freqs = { low: 100, mid: 150, high: 220 };
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqs[pitch], time);
    osc.frequency.exponentialRampToValueAtTime(freqs[pitch] * 0.6, time + 0.2);
    gain.gain.setValueAtTime(vol * 0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time); osc.stop(time + 0.26);
  }

  function playDrumCrash(time, vol){
    const ctx = getAudioCtx();
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass'; highpass.frequency.value = 4500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.3);
    [205,304,369,522,626,810,900,1200].forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = 'square'; osc.frequency.value = f;
      osc.connect(highpass);
      osc.start(time); osc.stop(time + 1.35);
    });
    highpass.connect(gain).connect(getDrumMasterBus());
  }

  // ---------- CAJA DE RITMOS: secuenciador ----------
  // mismo planificador "look-ahead" ya verificado que usa el metrónomo: programa los golpes
  // con el reloj del AudioContext (preciso), revisando cada 25ms si hay que programar más.
  let drumTimerId = null;
  let drumNextStepTime = 0;
  let drumStepIndex = 0;
  let drumBarCount = 0;
  const DRUM_SCHEDULE_AHEAD = 0.15;
  const DRUM_LOOKAHEAD_MS = 25;

  function drumEnsurePattern(){
    if (!state.drumMachine.pattern) state.drumMachine.pattern = drumBuildPatternFromStyle(state.drumMachine.style);
  }

  function drumCurrentSteps(){
    return (DRUM_STYLES[state.drumMachine.style].steps) || 16;
  }

  // valor efectivo de un paso: normalmente el patrón editable, pero si el fill automático está
  // activo y estamos en un compás de fill (cada 4), los últimos 4 pasos se sustituyen por el
  // redoble genérico — definido de forma relativa al final del compás, así funciona igual con
  // un compás de 16 pasos que con uno de 12 (el vals en 3/4).
  function drumEffectiveStep(voice, step, isFillBar, totalSteps){
    if (isFillBar && step >= totalSteps - 4) return drumFillForStyle(state.drumMachine.style)[voice][step - (totalSteps - 4)];
    return state.drumMachine.pattern[voice][step];
  }

  // humanización: un pellizco aleatorio y sutil de tiempo (±8ms) y volumen (±8%) por golpe, para
  // que no suene tan "de máquina" — desactivable, ya que a veces se prefiere la precisión robótica.
  function drumHumanize(time, vol){
    if (!state.drumMachine.humanize) return { time, vol };
    const timeJitter = (Math.random() - 0.5) * 0.016;
    const volJitter = 1 + (Math.random() - 0.5) * 0.16;
    return { time: time + timeJitter, vol: Math.max(0.05, vol * volJitter) };
  }

  function drumScheduleStep(step, time, isFillBar, totalSteps){
    const baseVol = state.drumMachine.volume;
    DRUM_VOICES.forEach(voice => {
      if (state.drumMachine.muted[voice]) return;
      const val = drumEffectiveStep(voice, step, isFillBar, totalSteps);
      if (!val) return;
      const vol = val === 2 ? baseVol * 1.35 : baseVol; // el acento suena más fuerte
      const h = drumHumanize(time, vol);
      if (voice === 'kick') playDrumKick(h.time, h.vol);
      else if (voice === 'snare') playDrumSnare(h.time, h.vol);
      else if (voice === 'hihatClosed') playDrumHihat(h.time, false, h.vol);
      else if (voice === 'hihatOpen') playDrumHihat(h.time, true, h.vol);
      else if (voice === 'clap') playDrumClap(h.time, h.vol);
      else if (voice === 'crash') playDrumCrash(h.time, h.vol);
    });

    const ctx = getAudioCtx();
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => flashDrumStep(step, isFillBar, totalSteps), delayMs);
  }

  function flashDrumStep(step, isFillBar, totalSteps){
    document.querySelectorAll('.drum-step-cell').forEach(el => {
      const isCurrent = Number(el.dataset.step) === step;
      el.classList.toggle('current', isCurrent);
      el.classList.toggle('fill-active', isCurrent && isFillBar && step >= totalSteps - 4);
    });
  }

  function drumScheduler(){
    const ctx = getAudioCtx();
    const feelMultiplier = state.drumMachine.speedFeel === 'half' ? 2 : state.drumMachine.speedFeel === 'double' ? 0.5 : 1;
    while (drumNextStepTime < ctx.currentTime + DRUM_SCHEDULE_AHEAD) {
      const style = DRUM_STYLES[state.drumMachine.style];
      const totalSteps = style.steps || 16;
      const isFillBar = state.drumMachine.fillEnabled && (drumBarCount % 4 === 3);
      pianoLooperMaybeTrigger(drumBarCount, drumStepIndex, drumNextStepTime, totalSteps);
      bassLooperMaybeTrigger(drumBarCount, drumStepIndex, drumNextStepTime, totalSteps);
      drumScheduleStep(drumStepIndex, drumNextStepTime, isFillBar, totalSteps);
      const beatDur = 60 / state.bpm;      // duración de una negra
      let stepDur = (beatDur / 4) * feelMultiplier; // cada paso = semicorchea, estirada o encogida
                                            // según el "feel" — el BPM real (state.bpm) no cambia,
                                            // solo cuánto dura cada paso en la práctica.
      if (style.swing > 0) {
        // swing: los pasos "pares" (los "y" de cada corchea) se retrasan, mismo principio
        // matemático ya verificado para el swing del metrónomo — al 100% da el "feel" de tresillo
        const firstFrac = 0.5 + (style.swing / 100) * (1 / 6);
        const isOffbeat = drumStepIndex % 2 === 1;
        stepDur = (beatDur / 2) * feelMultiplier * (isOffbeat ? (1 - firstFrac) : firstFrac);
      }
      drumNextStepTime += stepDur;
      drumStepIndex = (drumStepIndex + 1) % totalSteps;
      if (drumStepIndex === 0) drumBarCount++;
    }
    drumTimerId = setTimeout(drumScheduler, DRUM_LOOKAHEAD_MS);
  }

  function startDrumMachine(){
    if (state.drumMachine.playing) return;
    drumEnsurePattern();
    state.drumMachine.playing = true;
    drumStepIndex = 0;
    drumBarCount = 0;
    const ctx = getAudioCtx();
    drumNextStepTime = ctx.currentTime + 0.06;
    drumScheduler();
    $('#drumPlayBtn').textContent = '⏹ Detener';
    $('#drumPlayBtn').classList.add('active');
    $('#drumSummary').textContent = '🥁 Caja de Ritmos & Looper · ▶ sonando';
  }

  function stopDrumMachine(){
    state.drumMachine.playing = false;
    if (drumTimerId) clearTimeout(drumTimerId);
    drumTimerId = null;
    $('#drumPlayBtn').textContent = '▶ Reproducir';
    $('#drumPlayBtn').classList.remove('active');
    $('#drumSummary').textContent = '🥁 Caja de Ritmos & Looper';
    document.querySelectorAll('.drum-step-cell.current').forEach(el => el.classList.remove('current','fill-active'));
  }

  function drumCellClicked(voice, step){
    drumEnsurePattern();
    const cur = state.drumMachine.pattern[voice][step];
    state.drumMachine.pattern[voice][step] = (cur + 1) % 3; // apagado -> normal -> acento -> apagado
    renderDrumGrid();
  }

  // variación aleatoria: mueve 1-2 golpes ya existentes (de bombo/caja/hi-hat) ±1 o ±2 pasos,
  // sin tocar nunca el primer pulso del compás (el "esqueleto" que identifica al estilo) ni
  // pisar un golpe que ya esté ahí — así el patrón sigue sonando reconocible, solo un poco distinto.
  function drumApplyVariation(){
    drumEnsurePattern();
    const steps = drumCurrentSteps();
    const candidateVoices = ['kick', 'snare', 'hihatClosed'];
    const changes = 1 + Math.floor(Math.random() * 2); // 1 o 2 cambios
    for (let c = 0; c < changes; c++) {
      const voice = candidateVoices[Math.floor(Math.random() * candidateVoices.length)];
      const arr = state.drumMachine.pattern[voice];
      const activeIdxs = arr.map((v, i) => ({ v, i })).filter(o => o.v > 0 && o.i !== 0);
      if (activeIdxs.length === 0) continue;
      const pick = activeIdxs[Math.floor(Math.random() * activeIdxs.length)];
      const shift = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
      const dest = ((pick.i + shift) % steps + steps) % steps;
      if (arr[dest] === 0 && dest !== 0) {
        arr[dest] = arr[pick.i];
        arr[pick.i] = 0;
      }
    }
    renderDrumGrid();
  }

  function renderDrumGrid(){
    drumEnsurePattern();
    const totalSteps = drumCurrentSteps();
    const wrap = $('#drumStepGrid');
    wrap.innerHTML = '';
    DRUM_VOICES.forEach(voice => {
      const rowEl = document.createElement('div');
      rowEl.className = 'drum-row';
      const muteBtn = document.createElement('button');
      muteBtn.className = 'drum-mute-btn' + (state.drumMachine.muted[voice] ? ' active' : '');
      muteBtn.textContent = state.drumMachine.muted[voice] ? '🔇' : '🔊';
      muteBtn.title = 'Silenciar ' + DRUM_VOICE_LABELS[voice];
      muteBtn.addEventListener('click', () => {
        state.drumMachine.muted[voice] = !state.drumMachine.muted[voice];
        renderDrumGrid();
      });
      rowEl.appendChild(muteBtn);
      const label = document.createElement('span');
      label.className = 'drum-row-label';
      label.textContent = DRUM_VOICE_LABELS[voice];
      rowEl.appendChild(label);
      const cellsEl = document.createElement('div');
      cellsEl.className = 'drum-row-cells';
      cellsEl.style.gridTemplateColumns = `repeat(${totalSteps}, 1fr)`;
      for (let i = 0; i < totalSteps; i++) {
        const val = state.drumMachine.pattern[voice][i];
        const cell = document.createElement('div');
        cell.className = 'drum-step-cell' + (val === 1 ? ' on' : '') + (val === 2 ? ' accent' : '') + (i % 4 === 0 ? ' beat-start' : '');
        cell.dataset.step = i;
        cell.addEventListener('click', () => drumCellClicked(voice, i));
        cellsEl.appendChild(cell);
      }
      rowEl.appendChild(cellsEl);
      wrap.appendChild(rowEl);
    });
  }

  function renderDrumSection(){
    document.querySelectorAll('#drumStyleGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.dstyle === state.drumMachine.style);
    });
    $('#drumVolumeSlider').value = Math.round(state.drumMachine.volume * 100);
    $('#drumVolumeLabel').textContent = Math.round(state.drumMachine.volume * 100) + '%';
    $('#drumFillToggle').classList.toggle('active', state.drumMachine.fillEnabled);
    $('#drumHumanizeToggle').classList.toggle('active', state.drumMachine.humanize);
    document.querySelectorAll('#drumSpeedFeelGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.feel === state.drumMachine.speedFeel);
    });
    $('#drumBpmSlider').value = state.bpm;
    $('#drumBpmLabel').textContent = state.bpm + ' BPM';
    if (!$('#pianoLooperRootGroup').children.length) populatePianoLooperControls();
    renderPianoLooperList();
    renderDrumGrid();
  }

  function populatePianoLooperControls(){
    const rootWrap = $('#pianoLooperRootGroup');
    rootWrap.innerHTML = '';
    DISPLAY.forEach((name, pc) => {
      const b = document.createElement('button');
      b.textContent = name;
      if (pc === state.pianoLooper.build.root) b.classList.add('active');
      b.addEventListener('click', () => {
        state.pianoLooper.build.root = pc;
        document.querySelectorAll('#pianoLooperRootGroup button').forEach(x => x.classList.toggle('active', x === b));
      });
      rootWrap.appendChild(b);
    });

    const sel = $('#pianoLooperQualitySelect');
    sel.innerHTML = '';
    Object.entries(CHORD_QUALITIES).forEach(([key, q]) => {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = q.label;
      sel.appendChild(opt);
    });
    sel.value = state.pianoLooper.build.quality;
    sel.addEventListener('change', e => { state.pianoLooper.build.quality = e.target.value; });

    document.querySelectorAll('#pianoLooperOctaveGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.pianoLooper.build.octave = Number(b.dataset.oct);
        document.querySelectorAll('#pianoLooperOctaveGroup button').forEach(x => x.classList.toggle('active', x === b));
      });
    });
    document.querySelectorAll('#pianoLooperBarsGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.pianoLooper.build.bars = Number(b.dataset.bars);
        document.querySelectorAll('#pianoLooperBarsGroup button').forEach(x => x.classList.toggle('active', x === b));
      });
    });
    $('#pianoLooperAddBtn').addEventListener('click', () => {
      const b = state.pianoLooper.build;
      state.pianoLooper.chords.push({ root: b.root, quality: b.quality, octave: b.octave, bars: b.bars });
      renderPianoLooperList();
    });

    document.querySelectorAll('#pianoLooperTimbreGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.pianoLooper.timbre = b.dataset.timbre;
        document.querySelectorAll('#pianoLooperTimbreGroup button').forEach(x => x.classList.toggle('active', x === b));
      });
    });

    document.querySelectorAll('#pianoLooperPresetTonalityGroup button').forEach(b => {
      b.addEventListener('click', () => {
        state.pianoLooper.presetTonality = b.dataset.ptonality;
        document.querySelectorAll('#pianoLooperPresetTonalityGroup button').forEach(x => x.classList.toggle('active', x === b));
        renderPianoLooperPresetButtons();
      });
    });
    renderPianoLooperPresetButtons();
    $('#pianoLooperPresetLoadBtn').addEventListener('click', pianoLooperLoadPreset);
  }

  function renderPianoLooperPresetButtons(){
    const wrap = $('#pianoLooperPresetGroup');
    wrap.innerHTML = '';
    const list = state.pianoLooper.presetTonality === 'major' ? TRIAD_PROGRESSIONS_MAJOR : TRIAD_PROGRESSIONS_MINOR;
    list.forEach((preset, i) => {
      const b = document.createElement('button');
      b.textContent = preset.label;
      if (i === 0) b.classList.add('active');
      b.dataset.presetIdx = i;
      b.addEventListener('click', () => {
        document.querySelectorAll('#pianoLooperPresetGroup button').forEach(x => x.classList.toggle('active', x === b));
      });
      wrap.appendChild(b);
    });
  }

  // carga una progresión típica ya construida (reutiliza triadDiatonicDegrees, ya verificada en
  // Tríadas) — sustituye por completo la lista actual de acordes del looper, usando como tónica
  // la que tengas elegida en el constructor de arriba
  function pianoLooperLoadPreset(){
    const list = state.pianoLooper.presetTonality === 'major' ? TRIAD_PROGRESSIONS_MAJOR : TRIAD_PROGRESSIONS_MINOR;
    const activeBtn = document.querySelector('#pianoLooperPresetGroup button.active');
    const presetIdx = activeBtn ? Number(activeBtn.dataset.presetIdx) : 0;
    const preset = list[presetIdx];
    if (!preset) return;
    const rootPc = state.pianoLooper.build.root;
    const octave = state.pianoLooper.build.octave;
    const diatonic = triadDiatonicDegrees(rootPc, state.pianoLooper.presetTonality);
    state.pianoLooper.chords = preset.degrees.map(d => {
      const deg = diatonic[d];
      return { root: deg.root, quality: deg.quality, octave, bars: 1 };
    });
    renderPianoLooperList();
  }

  function renderPianoLooperList(){
    const wrap = $('#pianoLooperList');
    wrap.innerHTML = '';
    if (state.pianoLooper.chords.length === 0) {
      wrap.innerHTML = '<span class="theory-note-small">Añade acordes arriba para formar el bucle — sonarán en este orden, sincronizados con el ritmo.</span>';
      return;
    }
    state.pianoLooper.chords.forEach((c, i) => {
      const chip = document.createElement('div');
      chip.className = 'drum-looper-chip';
      chip.dataset.idx = i;
      const q = CHORD_QUALITIES[c.quality];
      const nameSpan = document.createElement('span');
      nameSpan.textContent = `${DISPLAY[c.root]}${q.suffix} (oct.${c.octave})`;
      chip.appendChild(nameSpan);
      const barsBtn = document.createElement('button');
      barsBtn.className = 'drum-looper-bars-btn';
      barsBtn.textContent = c.bars + 'c';
      barsBtn.title = 'Toca para cambiar cuántos compases dura este acorde';
      barsBtn.addEventListener('click', () => {
        c.bars = c.bars === 1 ? 2 : c.bars === 2 ? 4 : 1; // cicla 1 -> 2 -> 4 -> 1
        renderPianoLooperList();
      });
      chip.appendChild(barsBtn);
      const rm = document.createElement('button');
      rm.textContent = '✕';
      rm.addEventListener('click', () => {
        state.pianoLooper.chords.splice(i, 1);
        renderPianoLooperList();
      });
      chip.appendChild(rm);
      wrap.appendChild(chip);
    });
    const totalBars = pianoLooperTotalBars();
    const totalSteps = drumCurrentSteps();
    const barDurSec = (60 / state.bpm) * (totalSteps / 4);
    const info = document.createElement('div');
    info.className = 'theory-note-small';
    info.style.width = '100%';
    info.textContent = `Bucle total: ${totalBars} compás${totalBars === 1 ? '' : 'es'} (~${(totalBars * barDurSec).toFixed(1)}s a este tempo) · ` +
      (state.pianoLooper.chords.length === 1
        ? 'con un solo acorde, los compases solo se notan en el patrón "Pad" (controla cada cuánto vuelve a atacar).'
        : 'toca el número de compases de una tarjeta para cambiarlo (1→2→4→1) sin tener que quitarla y añadirla de nuevo.');
    wrap.appendChild(info);
  }

  // Karplus-Strong: modelo físico clásico de cuerda pulsada. Se llena una línea de retardo con
  // ruido (el "pluck" inicial) y se hace circular por un filtro de media móvil con amortiguación;
  // eso reproduce cómo las frecuencias altas se apagan antes que las bajas en una cuerda real,
  // dando ataque + cuerpo + caída natural en vez de un tono plano. 100% generado en el momento,
  // sin muestras de audio externas. blend varía muy ligeramente en cada nota (en vez de fijo en 0.5)
  // para que dos golpes de la misma nota no suenen clónicos, como pasa con una cuerda real.
  function pluckedBuffer(ctx, freq, duration, decay){
    const sampleRate = ctx.sampleRate;
    const totalSamples = Math.max(1, Math.floor(sampleRate * duration));
    const N = Math.max(2, Math.round(sampleRate / freq));
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1; // impulso de ruido = el "pluck"
    // variación orgánica mínima del decaimiento (siempre queda por debajo de 1: seguro, sin riesgo
    // de inestabilidad). NO se toca el coeficiente 0.5 del filtro: eso sí puede volverse inestable
    // y producir un crecimiento de volumen fuera de control si se desvía de 0.5.
    const microDecay = decay * (0.999 + Math.random() * 0.001);

    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const out = buffer.getChannelData(0);
    let idx = 0;
    for (let i = 0; i < totalSamples; i++) {
      const nextIdx = (idx + 1) % N;
      out[i] = ring[idx];
      ring[idx] = microDecay * 0.5 * (ring[idx] + ring[nextIdx]); // filtro de media + amortiguación
      idx = nextIdx;
    }
    return buffer;
  }

  // ataque de púa: ráfaga de ruido brillante y muy corta (unos ms) que se suma al inicio de la nota.
  // Es lo que el Karplus-Strong "puro" no tiene y por lo que puede sonar un poco sintético: el golpe
  // de la púa contra la cuerda es más ruido de alta frecuencia que tono, y desaparece casi al instante.
  function pickAttackBuffer(ctx, duration){
    const sampleRate = ctx.sampleRate;
    const n = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, n, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const decay = 1 - i / n;
      data[i] = (Math.random() * 2 - 1) * decay * decay;
    }
    return buffer;
  }

  function playPickAttack(ctx, peakGain){
    const dur = 0.01 + Math.random() * 0.006;
    const buffer = pickAttackBuffer(ctx, dur);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1600;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + dur);
    src.connect(hp).connect(gain).connect(ampChainInput());
    src.start();
  }

  function playBuffer(buffer, ctx, peakGain, dur, cutoff){
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = 0.7;
    // pequeño realce alrededor de 150-200Hz: simula la resonancia "de caja" del cuerpo de la guitarra,
    // ese cuerpo/calidez que un tono sintético puro no tiene.
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 180;
    body.Q.value = 1.1;
    body.gain.value = 5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + dur);
    src.connect(filter).connect(body).connect(gain).connect(ampChainInput());
    src.start();
  }

  const lerp = (a, b, t) => a + (b - a) * t;

  // cuánto de "grave/gruesa" (1) a "aguda/fina" (0) es la cuerda que suena, según su posición
  // dentro del instrumento actual (0 = cuerda más grave). Cuerdas graves reales suenan más
  // oscuras y sostienen más tiempo; las agudas son más brillantes y se apagan antes.
  function stringThickness(sIdx, totalStrings){
    if (sIdx === null || sIdx === undefined || !totalStrings || totalStrings <= 1) return 0.5;
    return 1 - (sIdx / (totalStrings - 1));
  }

  function playTone(midi, dur, sIdx, totalStrings){
    if (tocarMuestra(state.instrument, midi, dur + 0.35, ampChainInput)) return;   // muestra real, también por el ampli NAM
    const ctx = getAudioCtx();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const thickness = stringThickness(sIdx, totalStrings);
    const decay = lerp(0.994, 0.9975, thickness);   // grave sostiene más
    const cutoff = lerp(5200, 2200, thickness);      // grave = más oscura (cuerpo)
    const ringTail = dur + 0.35;
    const buffer = pluckedBuffer(ctx, freq, ringTail, decay);
    playBuffer(buffer, ctx, 0.9, ringTail, cutoff);
    playPickAttack(ctx, lerp(0.14, 0.22, 1 - thickness)); // cuerdas agudas, ataque algo más presente
  }

  function playMuteTone(midi, dur, sIdx, totalStrings){
    // palm-mute: mayor amortiguación (decay más bajo) y duración corta -> sonido apagado/percusivo
    const ctx = getAudioCtx();
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const thickness = stringThickness(sIdx, totalStrings);
    const d = Math.max(0.08, dur);
    const buffer = pluckedBuffer(ctx, freq, d, lerp(0.84, 0.89, thickness));
    playBuffer(buffer, ctx, 0.85, d, lerp(1400, 900, thickness));
    playPickAttack(ctx, 0.1);
  }


  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
  function findCell(sIdx, fret){
    return document.querySelector(`.fret-cell[data-string="${sIdx}"][data-fret="${fret}"]`);
  }

  // ---------- METRÓNOMO ----------
  // planificador "look-ahead": programa los clics con el reloj del AudioContext (preciso),
  // en vez de fiarse de setTimeout a pelo (que puede acumular retraso). Técnica estándar de Web Audio.
  let metroTimerId = null;
  let metroNextClickTime = 0;
  let metroBeatCount = 0;  // cuenta de PULSOS PRINCIPALES (no subdivisiones), 0-indexed
  let metroSubCount = 0;   // posición dentro del pulso actual: 0..subdivision-1
  const METRO_SCHEDULE_AHEAD = 0.12; // segundos que se programan por adelantado
  const METRO_LOOKAHEAD_MS = 25;     // cada cuánto se revisa si hay que programar más clics

  // patrón de acentos real de cada palo flamenco (grado de la teoría, no genérico 4/4).
  // Soleá / Bulería / Alegrías comparten el ciclo de 12 tiempos con acentos en 3-6-8-10-12
  // (el esqueleto "amalgama" estándar de la enseñanza flamenca). Los Tangos NO usan ese ciclo:
  // son un compás binario de 4 tiempos, con acentos en 1 y 3.
  const COMPAS_PATTERNS = {
    solea:    { beats: 12, strong: [3,6,8,10,12], label: 'Soleá',    defaultBpm: 80  },
    buleria:  { beats: 12, strong: [3,6,8,10,12], label: 'Bulería',  defaultBpm: 180 },
    alegrias: { beats: 12, strong: [3,6,8,10,12], label: 'Alegrías', defaultBpm: 130 },
    tangos:   { beats: 4,  strong: [1,3],         label: 'Tangos',  defaultBpm: 100 }
  };

  // compases regulares e irregulares para riffs/técnica y el metrónomo genérico (sin compás
  // flamenco activo). Agrupaciones: 6/8 = 3+3 (compuesto binario), 5/4 = 3+2, 7/8 = 2+2+3
  // (las agrupaciones más citadas en métodos; otras piezas pueden agrupar distinto).
  const TIME_SIGNATURES = {
    '2/2': { beats: 2, strong: [1],     label: '2/2' },
    '4/4': { beats: 4, strong: [1],     label: '4/4' },
    '3/4': { beats: 3, strong: [1],     label: '3/4' },
    '6/8': { beats: 6, strong: [1,4],   label: '6/8' },
    '5/4': { beats: 5, strong: [1,4],   label: '5/4' },
    '7/8': { beats: 7, strong: [1,3,5], label: '7/8' }
  };

  function currentCycleLength(){
    if (state.metronome.compasActive) return COMPAS_PATTERNS[state.metronome.compasPalo].beats;
    return TIME_SIGNATURES[state.metronome.timeSignature].beats;
  }
  function isStrongBeat(beatPos1){
    if (state.metronome.compasActive) {
      return COMPAS_PATTERNS[state.metronome.compasPalo].strong.includes(beatPos1);
    }
    return TIME_SIGNATURES[state.metronome.timeSignature].strong.includes(beatPos1);
  }

  function updateTimeSigBadge(){
    const [num, den] = state.metronome.timeSignature.split('/');
    $('#timeSigNum').textContent = num;
    $('#timeSigDen').textContent = den;
    document.querySelectorAll('#timeSigGroup button').forEach(b => {
      b.classList.toggle('active', b.dataset.sig === state.metronome.timeSignature);
    });
  }

  // kind: 'strong' (acento real), 'weak' (pulso principal sin acento), 'sub' (subdivisión, más suave)
  function metronomeClick(time, kind){
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = kind === 'strong' ? 1600 : kind === 'weak' ? 1050 : 750;
    const peak = kind === 'strong' ? 0.38 : kind === 'weak' ? 0.2 : 0.1;
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);

    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => flashMetroDot(kind), delayMs);
  }

  function flashMetroDot(kind){
    const dot = $('#metroDot');
    if (dot) {
      dot.classList.remove('beat', 'accent');
      void dot.offsetWidth; // fuerza reflow para reiniciar la transición si el beat anterior aún no había terminado
      dot.classList.add(kind === 'strong' ? 'accent' : 'beat');
      setTimeout(() => dot.classList.remove('beat', 'accent'), 100);
    }
    flashCompasWheel(currentMetroBeatPos1, kind); // se usa tanto en compás flamenco como en compás normal
  }

  let currentMetroBeatPos1 = 1; // posición 1-indexada del último pulso principal (para la rueda visual)

  function flashCompasWheel(beatPos1, kind){
    const el = document.querySelector(`.compas-beat[data-pos="${beatPos1}"]`);
    if (!el) return;
    el.classList.remove('lit', 'sub-lit');
    void el.offsetWidth;
    el.classList.add(kind === 'sub' ? 'sub-lit' : 'lit');
    setTimeout(() => el.classList.remove('lit', 'sub-lit'), 110);
  }

  // dibuja la rueda de tiempos numerada: el patrón del palo flamenco si el compás flamenco está
  // activo, o si no, el de la firma de compás elegida (4/4, 7/8...). Se usa siempre que suena
  // el metrónomo, no solo en modo flamenco — así se ve claramente el cambio al elegir otra firma.
  function renderCompasWheel(){
    const wheel = $('#compasWheel');
    const pattern = state.metronome.compasActive
      ? COMPAS_PATTERNS[state.metronome.compasPalo]
      : TIME_SIGNATURES[state.metronome.timeSignature];
    wheel.innerHTML = '';
    for (let pos = 1; pos <= pattern.beats; pos++) {
      const dot = document.createElement('div');
      dot.className = 'compas-beat' + (pattern.strong.includes(pos) ? ' strong' : '');
      dot.dataset.pos = pos;
      dot.textContent = pos;
      wheel.appendChild(dot);
    }
    wheel.style.display = state.metronome.active ? 'flex' : 'none';
  }

  function metroScheduler(){
    const ctx = getAudioCtx();
    while (metroNextClickTime < ctx.currentTime + METRO_SCHEDULE_AHEAD) {
      const subdivision = state.metronome.subdivision;
      const cycleLen = currentCycleLength();
      const beatPos1 = (metroBeatCount % cycleLen) + 1;
      const isMainBeat = metroSubCount === 0;
      const kind = isMainBeat ? (isStrongBeat(beatPos1) ? 'strong' : 'weak') : 'sub';

      if (isMainBeat) currentMetroBeatPos1 = beatPos1;
      metronomeClick(metroNextClickTime, kind);

      const beatDur = 60 / state.bpm;
      let stepDur = beatDur / subdivision;
      if (subdivision === 2 && state.metronome.swing > 0) {
        // swing: la primera corchea se alarga y la segunda se acorta en la misma proporción;
        // al 100% de swing coincide exactamente con el "feel" de tresillo (2/3 - 1/3)
        const firstFrac = 0.5 + (state.metronome.swing / 100) * (1 / 6);
        stepDur = beatDur * (metroSubCount === 0 ? firstFrac : (1 - firstFrac));
      }
      metroNextClickTime += stepDur;

      metroSubCount++;
      if (metroSubCount >= subdivision) { metroSubCount = 0; metroBeatCount++; }
    }
    metroTimerId = setTimeout(metroScheduler, METRO_LOOKAHEAD_MS);
  }

  function startMetronome(){
    if (state.metronome.active) return;
    state.metronome.active = true;
    metroBeatCount = 0;
    metroSubCount = 0;
    const ctx = getAudioCtx();
    metroNextClickTime = ctx.currentTime + 0.05;
    metroScheduler();
    $('#metroToggle').classList.add('active');
    $('#metroAdvanced').style.display = 'flex';
    renderCompasWheel();
  }

  function stopMetronome(){
    state.metronome.active = false;
    if (metroTimerId) clearTimeout(metroTimerId);
    metroTimerId = null;
    $('#metroToggle').classList.remove('active');
    $('#metroDot').classList.remove('beat', 'accent');
    $('#metroAdvanced').style.display = 'none';
    $('#compasWheel').style.display = 'none';
  }

  let riffPlayToken = 0; // se incrementa al detener/resetear, invalida cualquier reproducción en curso
  let riffActiveEls = []; // elementos con highlight activo ahora mismo, para poder limpiarlos si se corta

  function clearRiffHighlights(){
    riffActiveEls.forEach(({ el, cls }) => {
      if (!el) return;
      el.classList.remove('playing');
      if (cls) el.classList.remove(cls);
    });
    riffActiveEls = [];
  }

  async function playRiff(){
    if (state.playing || currentRiff.length === 0) return;
    const myToken = ++riffPlayToken;
    state.playing = true;
    $('#playRiffBtn').disabled = true;
    $('#stopRiffBtn').disabled = false;

    // el compás (elegido o el de compás flamenco si está activo) se aplica como acento métrico
    // a Escalas y Técnica, que no tienen ritmo propio; Estilos ya trae su propio patrón rítmico.
    const applyMetric = state.tab === 'escalas' || state.tab === 'tecnica';
    let metricIndex = 0;
    if (!applyMetric) $('#timeSigPos').textContent = '';

    do {
      const quarterMs = 60000 / state.bpm; // fallback para riffs de escala (sin ritmo propio)
      const totalStrings = TUNINGS[state.instrument].length;
      for (const step of currentRiff) {
        if (myToken !== riffPlayToken) return; // se ha detenido/reseteado desde fuera

        const stepMs = step.durSec ? step.durSec * 1000 : quarterMs;

        if (step.rest) { await sleep(stepMs); continue; }

        if (step.chord) {
          const circles = step.notesList.map(n => {
            const cell = findCell(n.sIdx, n.fret);
            const circle = cell ? cell.querySelector('.note-circle') : null;
            if (circle) circle.classList.add('playing');
            playTone(n.midi, Math.min(0.4, stepMs / 1000 * 0.85), n.sIdx, totalStrings);
            return circle;
          });
          riffActiveEls = circles.map(el => ({ el, cls: null }));
          await sleep(stepMs);
          if (myToken !== riffPlayToken) return;
          circles.forEach(c => { if (c) c.classList.remove('playing'); });
          riffActiveEls = [];
          continue;
        }

        const cell = findCell(step.sIdx, step.fret);
        const circle = cell ? cell.querySelector('.note-circle') : null;
        let cls = step.mute ? 'muted' : (step.accent ? 'accent' : null);

        if (applyMetric) {
          const cycleLen = currentCycleLength();
          const beatPos1 = (metricIndex % cycleLen) + 1;
          if (!cls && isStrongBeat(beatPos1)) cls = 'accent';
          $('#timeSigPos').textContent = beatPos1 + '/' + cycleLen;
          metricIndex++;
        }

        if (circle) { circle.classList.add('playing'); if (cls) circle.classList.add(cls); }
        riffActiveEls = circle ? [{ el: circle, cls }] : [];
        if (step.mute) {
          playMuteTone(step.midi, Math.min(0.12, stepMs / 1000 * 0.6), step.sIdx, totalStrings);
        } else {
          playTone(step.midi, Math.min(0.4, stepMs / 1000 * 0.85), step.sIdx, totalStrings);
        }
        await sleep(stepMs);
        if (myToken !== riffPlayToken) return;
        if (circle) { circle.classList.remove('playing'); if (cls) circle.classList.remove(cls); }
        riffActiveEls = [];
      }
      if (myToken !== riffPlayToken) return;

      if (state.speedTrainer) {
        state.bpm = Math.min(250, state.bpm + state.speedIncrement);
        $('#bpmSlider').value = state.bpm;
        $('#bpmLabel').textContent = state.bpm + ' BPM';
        $('#drumBpmSlider').value = state.bpm;
        $('#drumBpmLabel').textContent = state.bpm + ' BPM';
        rebuildCurrentRiff(); // por si el riff lleva duración fija (estilos), recalcula con el nuevo bpm
        await sleep(300);
      }
    } while (state.speedTrainer && myToken === riffPlayToken);

    state.playing = false;
    $('#playRiffBtn').disabled = currentRiff.length === 0;
    $('#stopRiffBtn').disabled = true;
    if (applyMetric) $('#timeSigPos').textContent = '';
  }

  function stopRiff(){
    riffPlayToken++; // invalida el bucle en curso, si lo hay
    clearRiffHighlights();
    state.playing = false;
    $('#playRiffBtn').disabled = currentRiff.length === 0;
    $('#stopRiffBtn').disabled = true;
    $('#timeSigPos').textContent = '';
  }

  function resetRiff(){
    stopRiff();
    // limpieza completa por si quedara algún resto visual suelto en el mástil
    document.querySelectorAll('.note-circle.playing, .note-circle.muted, .note-circle.accent')
      .forEach(el => el.classList.remove('playing', 'muted', 'accent'));
  }


  // ---------- MODO QUIZ (adivina la nota) ----------
  function startQuiz(){
    state.quiz.active = true;
    state.quiz.score = 0;
    state.quiz.attempts = 0;
    $('#quizPanel').style.display = 'flex';
    nextQuizRound();
  }

  function stopQuiz(){
    state.quiz.active = false;
    state.quiz.target = null;
    $('#quizPanel').style.display = 'none';
    render();
  }

  function nextQuizRound(){
    const notes = positionNotes();
    if (notes.length === 0) {
      $('#quizStatus').textContent = 'No hay notas de esta escala en esta zona del mástil.';
      state.quiz.target = null;
      render();
      return;
    }
    state.quiz.target = notes[Math.floor(Math.random() * notes.length)];
    state.quiz.locked = false;
    render();
    playTone(state.quiz.target.midi, 0.6, state.quiz.target.sIdx, TUNINGS[state.instrument].length);
  }

  function updateQuizStatus(){
    $('#quizStatus').textContent = `Aciertos: ${state.quiz.score}/${state.quiz.attempts}`;
  }

  function handleQuizGuess(cellEl, pc){
    if (!state.quiz.active || !state.quiz.target || state.quiz.locked) return;
    state.quiz.locked = true;
    state.quiz.attempts++;
    const correct = pc === state.quiz.target.pc;
    if (correct) state.quiz.score++;
    cellEl.classList.add(correct ? 'quiz-correct' : 'quiz-wrong');
    updateQuizStatus();
    setTimeout(() => { if (state.quiz.active) nextQuizRound(); }, correct ? 650 : 850);
  }

  // ---------- eventos ----------
  document.querySelectorAll('#tabGroup button').forEach(b => {
    b.addEventListener('click', () => {
      if (state.quiz.active) { stopQuiz(); $('#quizToggle').classList.remove('active'); }
      state.tab = b.dataset.tab;
      render();
    });
  });
  document.querySelectorAll('#instrumentGroup button').forEach(b => {
    b.addEventListener('click', () => { state.instrument = b.dataset.instrument; render(); });
  });
  $('#scaleSelect').addEventListener('change', e => { state.scaleKey = e.target.value; render(); });
  $('#handToggle').addEventListener('click', () => { state.lefty = !state.lefty; render(); });
  $('#capoSelect').addEventListener('change', (e) => { state.capo = Number(e.target.value); render(); });
  $('#chromaticToggle').addEventListener('click', () => { state.chromatic = !state.chromatic; render(); });
  $('#boxModeToggle').addEventListener('click', () => {
    state.zoneMode = state.zoneMode === 'auto' ? 'manual' : 'auto';
    state.zone = state.zoneMode === 'auto' ? 'box0' : 'full';
    render();
  });
  $('#npsModeToggle').addEventListener('click', () => {
    state.threeNPS = !state.threeNPS;
    state.npsPattern = null;
    if (state.threeNPS) state.sequenceMode = 'off';
    render();
  });
  $('#sequenceModeToggle').addEventListener('click', () => {
    state.sequenceMode = state.sequenceMode === 'off' ? 'groups3' : 'off';
    if (state.sequenceMode !== 'off') state.threeNPS = false;
    render();
  });
  document.querySelectorAll('#sequenceGroupGroup button').forEach(b => {
    b.addEventListener('click', () => { state.sequenceMode = b.dataset.seq; render(); });
  });
  $('#playRiffBtn').addEventListener('click', playRiff);
  $('#stopRiffBtn').addEventListener('click', stopRiff);
  $('#resetRiffBtn').addEventListener('click', resetRiff);
  $('#styleRandomBtn').addEventListener('click', () => {
    const variants = STYLE_TEMPLATES[state.style];
    if (!variants || variants.length <= 1) return;
    let next = state.styleVariant;
    while (next === state.styleVariant) next = Math.floor(Math.random() * variants.length);
    state.styleVariant = next;
    render();
  });
  $('#fontSizeSlider').addEventListener('input', e => {
    document.documentElement.style.setProperty('--fs-scale', e.target.value);
  });
  $('#bpmSlider').addEventListener('input', e => {
    state.bpm = Number(e.target.value);
    $('#bpmLabel').textContent = state.bpm + ' BPM';
    $('#drumBpmSlider').value = state.bpm;
    $('#drumBpmLabel').textContent = state.bpm + ' BPM';
    // los riffs de estilo llevan la duración de cada nota ya calculada en bpm en el momento de
    // construirse (para poder tener ritmos como el galope o el swing) — sin volver a construir el
    // riff aquí, cambiar el tempo no tenía ningún efecto sobre ellos hasta el siguiente render().
    render();
    renderPianoLooperList();
  });
  $('#drumBpmSlider').addEventListener('input', e => {
    state.bpm = Number(e.target.value);
    $('#drumBpmLabel').textContent = state.bpm + ' BPM';
    $('#bpmSlider').value = state.bpm;
    $('#bpmLabel').textContent = state.bpm + ' BPM';
    render();
    renderPianoLooperList();
  });
  $('#metroToggle').addEventListener('click', () => {
    if (state.metronome.active) stopMetronome(); else startMetronome();
  });
  document.querySelectorAll('#subdivGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.metronome.subdivision = Number(b.dataset.subdiv);
      document.querySelectorAll('#subdivGroup button').forEach(x => x.classList.toggle('active', x === b));
      $('#swingWrap').style.display = state.metronome.subdivision === 2 ? 'flex' : 'none';
    });
  });
  $('#swingSlider').addEventListener('input', (e) => {
    state.metronome.swing = Number(e.target.value);
    $('#swingLabel').textContent = state.metronome.swing + '%';
  });
  $('#compasToggle').addEventListener('click', () => {
    state.metronome.compasActive = !state.metronome.compasActive;
    $('#compasToggle').classList.toggle('active', state.metronome.compasActive);
    $('#compasPaloGroup').style.display = state.metronome.compasActive ? 'flex' : 'none';
    if (state.metronome.compasActive) { metroBeatCount = 0; metroSubCount = 0; }
    renderCompasWheel();
  });
  document.querySelectorAll('#compasPaloGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.metronome.compasPalo = b.dataset.palo;
      document.querySelectorAll('#compasPaloGroup button').forEach(x => x.classList.toggle('active', x === b));
      const pattern = COMPAS_PATTERNS[b.dataset.palo];
      state.bpm = pattern.defaultBpm;
      $('#bpmSlider').value = state.bpm;
      $('#bpmLabel').textContent = state.bpm + ' BPM';
      $('#drumBpmSlider').value = state.bpm;
      $('#drumBpmLabel').textContent = state.bpm + ' BPM';
      metroBeatCount = 0; metroSubCount = 0;
      renderCompasWheel();
    });
  });
  document.querySelectorAll('#subdivGroup button').forEach(b => {
    if (Number(b.dataset.subdiv) === state.metronome.subdivision) b.classList.add('active');
  });
  document.querySelectorAll('#compasPaloGroup button').forEach(b => {
    if (b.dataset.palo === state.metronome.compasPalo) b.classList.add('active');
  });
  document.querySelectorAll('#timeSigGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.metronome.timeSignature = b.dataset.sig;
      updateTimeSigBadge();
      metroBeatCount = 0; metroSubCount = 0;
      renderCompasWheel();
    });
  });
  updateTimeSigBadge();
  document.querySelectorAll('#pickingModeGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.pickingMode = b.dataset.picking;
      document.querySelectorAll('#pickingModeGroup button').forEach(x => x.classList.toggle('active', x === b));
      rebuildCurrentRiff();
    });
  });
  $('#speedTrainerToggle').addEventListener('click', () => {
    state.speedTrainer = !state.speedTrainer;
    $('#speedTrainerToggle').classList.toggle('active', state.speedTrainer);
  });
  $('#quizToggle').addEventListener('click', () => {
    if (state.quiz.active) stopQuiz(); else startQuiz();
    $('#quizToggle').classList.toggle('active', state.quiz.active);
  });
  $('#quizRepeatBtn').addEventListener('click', () => {
    if (state.quiz.target) playTone(state.quiz.target.midi, 0.6, state.quiz.target.sIdx, TUNINGS[state.instrument].length);
  });
  $('#quizExitBtn').addEventListener('click', () => {
    stopQuiz();
    $('#quizToggle').classList.remove('active');
  });
  async function strumChordShape(shape, sustain){
    const openMidi = OPEN_MIDI.guitarra;
    const order = state.lefty ? [5,4,3,2,1,0] : [0,1,2,3,4,5];
    const strumOrder = state.lefty ? order.slice().reverse() : order;
    for (const idx of strumOrder) {
      const s = shape.strings[idx];
      if (s.mute) continue;
      playTone(openMidi[idx] + s.fret, sustain ?? 1.1, idx, 6);
      await sleep(28);
    }
  }

  $('#chordPlayBtn').addEventListener('click', async () => {
    if (!state.currentChord) return;
    await strumChordShape(state.currentChord.shape);
  });

  document.querySelectorAll('#acordesModeGroup button').forEach(b => {
    b.addEventListener('click', () => { state.acordesMode = b.dataset.acmode; render(); });
  });
  document.querySelectorAll('#progViewGroup button').forEach(b => {
    b.addEventListener('click', () => { state.progViewMode = b.dataset.progview; render(); });
  });
  document.querySelectorAll('#bassPatternGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.bassPattern = b.dataset.bpattern;
      document.querySelectorAll('#bassPatternGroup button').forEach(x => x.classList.toggle('active', x === b));
      render();
    });
  });
  document.querySelectorAll('#cagedViewGroup button').forEach(b => {
    b.addEventListener('click', () => { state.cagedView = b.dataset.cagedview; render(); });
  });
  document.querySelectorAll('#progKeyGroup button').forEach(b => {
    b.addEventListener('click', () => { state.progKey = b.dataset.key; state.progression = []; state.activeForm = null; render(); });
  });
  document.querySelectorAll('#progFormGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.activeForm = state.activeForm === b.dataset.form ? null : b.dataset.form;
      state.progression = [];
      render();
    });
  });
  $('#progUndoBtn').addEventListener('click', () => { state.progression.pop(); state.activeForm = null; render(); });
  $('#progClearBtn').addEventListener('click', () => { state.progression = []; state.activeForm = null; render(); });
  $('#progPlayBtn').addEventListener('click', async () => {
    if (state.progPlaying || state.progShapes.length === 0) return;
    state.progPlaying = true;
    $('#progPlayBtn').disabled = true;
    const chips = document.querySelectorAll('#progChips .prog-chip');
    const cards = document.querySelectorAll('#progChordsRow .chord-mini-card');
    for (let i = 0; i < state.progShapes.length; i++) {
      chips.forEach((chip, ci) => chip.classList.toggle('current', ci === i));
      cards.forEach((card, ci) => card.classList.toggle('current', ci === i));
      if (cards[i]) cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      const entry = state.progShapes[i];
      if (entry) await strumChordShape(entry.shape, 1.3);
      await sleep(250);
    }
    chips.forEach(chip => chip.classList.remove('current'));
    cards.forEach(card => card.classList.remove('current'));
    state.progPlaying = false;
    $('#progPlayBtn').disabled = (state.progression.length === 0 && !state.activeForm);
  });

  let triadProgPlaying = false;
  $('#triadProgPlayBtn').addEventListener('click', async () => {
    const shapes = state.triad.progShapes || [];
    if (triadProgPlaying || shapes.length === 0) return;
    triadProgPlaying = true;
    $('#triadProgPlayBtn').disabled = true;
    const cards = document.querySelectorAll('#triadProgressionCards .chord-mini-card');
    for (let i = 0; i < shapes.length; i++) {
      cards.forEach((card, ci) => card.classList.toggle('current', ci === i));
      if (cards[i]) cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      const entry = shapes[i];
      if (entry) await strumTriadShape(entry.shape, entry.stringIdxs, 1.3);
      await sleep(250);
    }
    cards.forEach(card => card.classList.remove('current'));
    triadProgPlaying = false;
    $('#triadProgPlayBtn').disabled = false;
  });

  let triadMapPlaying = false;
  $('#triadMapPlayBtn').addEventListener('click', async () => {
    const shapes = state.triad.mapShapes || [];
    if (triadMapPlaying || shapes.length === 0) return;
    triadMapPlaying = true;
    $('#triadMapPlayBtn').disabled = true;
    const cards = document.querySelectorAll('#triadMapCards .chord-mini-card');
    for (let i = 0; i < shapes.length; i++) {
      cards.forEach((card, ci) => card.classList.toggle('current', ci === i));
      if (cards[i]) cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      const entry = shapes[i];
      if (entry) await strumTriadShape(entry.shape, entry.stringIdxs, 1.3);
      await sleep(250);
    }
    cards.forEach(card => card.classList.remove('current'));
    triadMapPlaying = false;
    $('#triadMapPlayBtn').disabled = false;
  });

  $('#triadVoiceLeadingToggle').addEventListener('click', () => {
    state.triad.voiceLeading = !state.triad.voiceLeading;
    $('#triadVoiceLeadingToggle').classList.toggle('active', state.triad.voiceLeading);
    renderTriadProgressionCards();
  });

  $('#triadQuizToggle').addEventListener('click', () => {
    if (state.triadQuiz.active) stopTriadQuiz(); else startTriadQuiz();
    $('#triadQuizToggle').classList.toggle('active', state.triadQuiz.active);
  });
  $('#triadQuizCheckBtn').addEventListener('click', checkTriadQuizAnswer);
  $('#triadQuizNextBtn').addEventListener('click', nextTriadQuizRound);

  populateScaleSelect();
  populateRootButtons();
  populatePatternButtons();
  populateStyleButtons();
  populateChordQualityButtons();
  populateCapoSelect();
  renderCircleWheel();
  $('#pianoRandomBtn').addEventListener('click', pianoRandomNote);
  document.querySelectorAll('#pianoClefGroup button').forEach(b => {
    b.addEventListener('click', () => pianoSetClefView(b.dataset.clef));
  });
  document.querySelectorAll('#pianoModeGroup button').forEach(b => {
    b.addEventListener('click', () => pianoSetMode(b.dataset.pmode));
  });
  pianoDetectMusicFont();

  document.querySelectorAll('#drumStyleGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.drumMachine.style = b.dataset.dstyle;
      state.drumMachine.pattern = drumBuildPatternFromStyle(b.dataset.dstyle);
      renderDrumSection();
    });
  });
  $('#drumPlayBtn').addEventListener('click', () => {
    if (state.drumMachine.playing) stopDrumMachine(); else startDrumMachine();
  });
  $('#drumVolumeSlider').addEventListener('input', (e) => {
    state.drumMachine.volume = Number(e.target.value) / 100;
    $('#drumVolumeLabel').textContent = e.target.value + '%';
  });
  $('#drumFillToggle').addEventListener('click', () => {
    state.drumMachine.fillEnabled = !state.drumMachine.fillEnabled;
    $('#drumFillToggle').classList.toggle('active', state.drumMachine.fillEnabled);
  });
  $('#drumHumanizeToggle').addEventListener('click', () => {
    state.drumMachine.humanize = !state.drumMachine.humanize;
    $('#drumHumanizeToggle').classList.toggle('active', state.drumMachine.humanize);
  });
  $('#drumVariationBtn').addEventListener('click', drumApplyVariation);
  document.querySelectorAll('#drumSpeedFeelGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.drumMachine.speedFeel = b.dataset.feel;
      document.querySelectorAll('#drumSpeedFeelGroup button').forEach(x => x.classList.toggle('active', x === b));
    });
  });
  $('#drumResetBtn').addEventListener('click', () => {
    state.drumMachine.pattern = drumBuildPatternFromStyle(state.drumMachine.style);
    renderDrumGrid();
  });

  $('#pianoLooperToggle').addEventListener('click', () => {
    state.pianoLooper.active = !state.pianoLooper.active;
    $('#pianoLooperToggle').textContent = state.pianoLooper.active ? '⏹ Desactivar' : '▶ Activar';
    $('#pianoLooperToggle').classList.toggle('active', state.pianoLooper.active);
    if (!state.pianoLooper.active) {
      document.querySelectorAll('.drum-looper-chip.current-chord').forEach(c => c.classList.remove('current-chord'));
    }
  });
  document.querySelectorAll('#pianoLooperPatternGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.pianoLooper.pattern = b.dataset.pattern;
      document.querySelectorAll('#pianoLooperPatternGroup button').forEach(x => x.classList.toggle('active', x === b));
    });
  });
  $('#pianoLooperVolSlider').addEventListener('input', e => {
    state.pianoLooper.volume = Number(e.target.value) / 100;
    $('#pianoLooperVolLabel').textContent = e.target.value + '%';
  });
  $('#bassLooperToggle').addEventListener('click', () => {
    state.bassLooper.active = !state.bassLooper.active;
    $('#bassLooperToggle').textContent = state.bassLooper.active ? '⏹ Desactivar' : '▶ Activar';
    $('#bassLooperToggle').classList.toggle('active', state.bassLooper.active);
  });
  document.querySelectorAll('#bassLooperPatternGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.bassLooper.pattern = b.dataset.bpattern;
      document.querySelectorAll('#bassLooperPatternGroup button').forEach(x => x.classList.toggle('active', x === b));
    });
  });
  $('#bassLooperVolSlider').addEventListener('input', e => {
    state.bassLooper.volume = Number(e.target.value) / 100;
    $('#bassLooperVolLabel').textContent = e.target.value + '%';
  });
  document.querySelectorAll('#bassLooperOctaveGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.bassLooper.octave = Number(b.dataset.boct);
      document.querySelectorAll('#bassLooperOctaveGroup button').forEach(x => x.classList.toggle('active', x === b));
    });
  });
  document.querySelectorAll('#licksModeGroup button').forEach(b => {
    b.addEventListener('click', () => {
      state.lickMode = b.dataset.lickmode;
      state.lickId = 0;
      render();
    });
  });
  $('#voiceCalibLowBtn').addEventListener('click', () => toggleCalibListen('low'));
  $('#voiceCalibHighBtn').addEventListener('click', () => toggleCalibListen('high'));
  $('#voiceCalibSkipBtn').addEventListener('click', () => {
    stopCalibListen();
    state.voiceQuiz.calibrated = true;
    render();
  });
  $('#voiceRecalibBtn').addEventListener('click', () => {
    stopVoiceListening();
    state.voiceQuiz.calibrated = false;
    state.voiceQuiz.targetMidi = null;
    $('#voiceCalibLowLabel').textContent = 'sin fijar';
    $('#voiceCalibHighLabel').textContent = 'sin fijar';
    render();
  });
  $('#voicePlayTargetBtn').addEventListener('click', () => {
    if (state.voiceQuiz.targetMidi !== null) playPianoTone(state.voiceQuiz.targetMidi);
  });
  $('#voiceListenBtn').addEventListener('click', startVoiceListening);
  $('#voiceStopBtn').addEventListener('click', stopVoiceListening);
  $('#voiceSkipBtn').addEventListener('click', () => {
    stopVoiceListening();
    state.voiceQuiz.streak = 0;
    $('#voiceStreakLabel').textContent = 0;
    pickNewVoiceTarget();
  });
  document.querySelectorAll('#namAmpGroup button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#namAmpGroup button').forEach(x => x.classList.toggle('active', x === b));
      setNamAmpMode(b.dataset.namMode);
    });
  });
  $('#namFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.namAmp.jsonText = await file.text();
    state.namAmp.modelName = file.name;
    document.querySelector('#namAmpGroup button[data-nam-mode="on"]').disabled = false;
    document.querySelectorAll('#namAmpGroup button').forEach(x => x.classList.toggle('active', x.dataset.namMode === 'on'));
    setNamAmpMode('on'); // cargar y aplicar de inmediato, tal como se pidió
  });
  $('#drumFxReverbSlider').addEventListener('input', e => {
    setDrumFxSend('reverb', Number(e.target.value) / 100);
    $('#drumFxReverbLabel').textContent = e.target.value + '%';
  });
  $('#drumFxChorusSlider').addEventListener('input', e => {
    setDrumFxSend('chorus', Number(e.target.value) / 100);
    $('#drumFxChorusLabel').textContent = e.target.value + '%';
  });
  $('#drumFxDelaySlider').addEventListener('input', e => {
    setDrumFxSend('delay', Number(e.target.value) / 100);
    $('#drumFxDelayLabel').textContent = e.target.value + '%';
  });
  renderDrumSection();

  // ---------- FRETTEACHER: analizador de títulos de backing track ----------
  // heurística por patrones de texto (NO es un modelo de lenguaje: no entiende el título, solo
  // busca formas típicas que usan casi todos los canales de backing tracks). Dos estrategias,
  // por orden de fiabilidad:
  // 1) forma explícita "Nota (#/b)? Major|Minor" (ej. "A Minor", "F# Minor", "Bb Major") — la
  //    inmensa mayoría de títulos la incluyen literal, así que es la más fiable con diferencia.
  // 2) si no aparece, se busca una lista de 3+ acordes tipo "Am-F-C-G" o "Am F C G" y se toma el
  //    PRIMER acorde como referencia de tonalidad — es una suposición razonable (el primer acorde
  //    de una progresión simple suele ser el "de casa"), no una certeza, y el resultado lo avisa.
  const BT_NOTE_TO_PC = { C:0, 'C#':1, Db:1, D:2, 'D#':3, Eb:3, E:4, F:5, 'F#':6, Gb:6, G:7, 'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11 };
  const BT_DISPLAY_ES = ['Do','Reb','Re','Mib','Mi','Fa','Fa#','Sol','Lab','La','Sib','Si']; // mismo orden/índices que DISPLAY

  function btParseTitle(text){
    const raw = (text || '').trim();
    if (!raw) return null;
    const bpmMatch = raw.match(/(\d{2,3})\s*bpm/i);
    const bpm = bpmMatch ? Number(bpmMatch[1]) : null;

    let m = raw.match(/\b([A-G])\s*(#|b|♭|♯)?\s*(major|minor|maj|min)\b/i);
    if (m) {
      let acc = (m[2] || '').toLowerCase();
      if (acc === '♭') acc = 'b'; if (acc === '♯') acc = '#';
      const pc = BT_NOTE_TO_PC[m[1].toUpperCase() + acc];
      if (pc !== undefined) {
        const mode = m[3].toLowerCase().startsWith('maj') ? 'mayor' : 'menor';
        return { pc, mode, bpm, source: 'explicit' };
      }
    }

    const chordTokenRe = '[A-G](?:#|b)?m?(?:aj7|7|maj7|sus4|sus2|dim|aug)?';
    const chordListRe = new RegExp(`\\b(${chordTokenRe})(?:\\s*-\\s*|\\s+)(${chordTokenRe})(?:\\s*-\\s*|\\s+)(${chordTokenRe})`);
    const chordListMatch = raw.match(chordListRe);
    if (chordListMatch) {
      const cm = chordListMatch[1].match(/^([A-G])(#|b)?(m)?/);
      if (cm) {
        const pc = BT_NOTE_TO_PC[cm[1].toUpperCase() + (cm[2] || '').toLowerCase()];
        if (pc !== undefined) return { pc, mode: cm[3] ? 'menor' : 'mayor', bpm, source: 'chord' };
      }
    }

    return bpm !== null ? { pc: null, mode: null, bpm, source: 'bpm-only' } : null;
  }

  let ftManualRoot = 0, ftManualMode = 'mayor';

  function ftGoToScale(pc, scaleKey){
    state.tab = 'escalas'; state.root = pc; state.scaleKey = scaleKey;
    render();
    $('#fretTeacherPanel').style.display = 'none';
  }

  function ftRenderManualPicker(container){
    const row1 = document.createElement('div');
    row1.className = 'ft-manual-row';
    const rootWrap = document.createElement('div');
    rootWrap.className = 'pill-group';
    BT_DISPLAY_ES.forEach((name, pc) => {
      const b = document.createElement('button');
      b.textContent = name;
      if (pc === ftManualRoot) b.classList.add('active');
      b.addEventListener('click', () => {
        ftManualRoot = pc;
        rootWrap.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      });
      rootWrap.appendChild(b);
    });
    row1.appendChild(rootWrap);

    const modeWrap = document.createElement('div');
    modeWrap.className = 'pill-group';
    ['mayor', 'menor'].forEach(mode => {
      const b = document.createElement('button');
      b.textContent = mode === 'mayor' ? 'Mayor' : 'Menor';
      if (mode === ftManualMode) b.classList.add('active');
      b.addEventListener('click', () => {
        ftManualMode = mode;
        modeWrap.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      });
      modeWrap.appendChild(b);
    });
    row1.appendChild(modeWrap);
    container.appendChild(row1);

    const btn = document.createElement('button');
    btn.className = 'ft-action-btn';
    btn.style.marginTop = '8px';
    btn.textContent = 'Ir a Escalas con esta tónica y modo';
    btn.addEventListener('click', () => {
      ftGoToScale(ftManualRoot, ftManualMode === 'menor' ? 'pent_menor' : 'pent_mayor');
    });
    container.appendChild(btn);
  }

  function ftRenderBackingResult(){
    const text = $('#ftBackingInput').value;
    const wrap = $('#ftBackingResult');
    const parsed = btParseTitle(text);
    wrap.style.display = 'block';
    wrap.innerHTML = '';

    if (!parsed || parsed.pc === null) {
      const h4 = document.createElement('h4');
      h4.textContent = 'No he podido detectar la tonalidad';
      const p = document.createElement('p');
      p.textContent = `No encuentro un patrón claro como "A Minor" o una lista de acordes tipo "Am-F-C-G" en ese texto${parsed && parsed.bpm ? ` (sí detecté ${parsed.bpm} BPM)` : ''}. Elige tú mismo la tónica y el modo, y te llevo a Escalas:`;
      wrap.appendChild(h4); wrap.appendChild(p);
      ftRenderManualPicker(wrap);
      return;
    }

    const rootName = BT_DISPLAY_ES[parsed.pc];
    const relativePc = parsed.mode === 'menor' ? (parsed.pc + 3) % 12 : (parsed.pc + 9) % 12;
    const relativeName = BT_DISPLAY_ES[relativePc];
    const relativeMode = parsed.mode === 'menor' ? 'mayor' : 'menor';
    const pentKey = parsed.mode === 'menor' ? 'pent_menor' : 'pent_mayor';
    const fullKey = parsed.mode === 'menor' ? 'eolico' : 'jonico';
    const confidenceNote = parsed.source === 'chord'
      ? ' — detectado a partir del primer acorde de la lista; suele ser la tónica, pero confírmalo si lo sabes seguro'
      : '';

    const h4 = document.createElement('h4');
    h4.textContent = `${rootName} ${parsed.mode}${confidenceNote ? ' (probable)' : ''}`;
    const p = document.createElement('p');
    p.textContent = `Relativo: ${relativeName} ${relativeMode} (mismas notas, cambia cuál sientes como "casa").${parsed.bpm ? ` Tempo detectado: ${parsed.bpm} BPM.` : ''}${confidenceNote}`;
    wrap.appendChild(h4); wrap.appendChild(p);

    const btnPent = document.createElement('button');
    btnPent.className = 'ft-action-btn';
    btnPent.textContent = `Ir a Escalas (${rootName} Pentatónica ${parsed.mode})`;
    btnPent.addEventListener('click', () => ftGoToScale(parsed.pc, pentKey));
    wrap.appendChild(btnPent);

    const btnFull = document.createElement('button');
    btnFull.className = 'ft-action-btn';
    btnFull.textContent = `Ir a Escalas (${rootName} Escala ${parsed.mode} completa)`;
    btnFull.addEventListener('click', () => ftGoToScale(parsed.pc, fullKey));
    wrap.appendChild(btnFull);
  }

  // ---------- FRETTEACHER: interfaz ----------
  function ftRenderQuickButtons(){
    const wrap = $('#ftQuickRow');
    wrap.innerHTML = '';
    FRETTEACHER_KB.filter(e => e.featured).forEach(entry => {
      const b = document.createElement('button');
      b.className = 'ft-quick-btn';
      b.textContent = entry.title;
      b.addEventListener('click', () => ftShowEntries([entry]));
      wrap.appendChild(b);
    });
  }

  // búsqueda simple por coincidencia de palabras clave: puntúa cada entrada según cuántas
  // palabras de la pregunta aparecen en sus keywords o en su título, y devuelve las mejores
  function ftSearch(query){
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const words = q.split(/\s+/).filter(w => w.length > 2);
    const scored = FRETTEACHER_KB.map(entry => {
      let score = 0;
      const haystack = (entry.title + ' ' + entry.keywords.join(' ')).toLowerCase();
      if (haystack.includes(q)) score += 10; // coincidencia de la frase completa
      words.forEach(w => { if (haystack.includes(w)) score += 1; });
      return { entry, score };
    }).filter(s => s.score >= 2).sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map(s => s.entry);
  }

  function ftShowEntries(entries){
    const wrap = $('#ftResults');
    wrap.innerHTML = '';
    if (entries.length === 0) {
      wrap.innerHTML = '<p class="theory-note-small">No he encontrado nada parecido — prueba con otras palabras, o elige una de las guías de arriba.</p>';
      return;
    }
    entries.forEach(rawEntry => {
      const entry = rawEntry.dynamic ? rawEntry.dynamic() : rawEntry;
      const box = document.createElement('div');
      box.className = 'ft-answer';
      box.innerHTML = `<h4>${entry.title}</h4><p>${entry.answer}</p>`;
      if (entry.action) {
        const btn = document.createElement('button');
        btn.className = 'ft-action-btn';
        btn.textContent = entry.action.label;
        btn.addEventListener('click', () => { entry.action.apply(); $('#fretTeacherPanel').style.display = 'none'; });
        box.appendChild(btn);
      }
      wrap.appendChild(box);
    });
  }

  // consejo contextual: mira en qué pestaña y con qué está el usuario ahora mismo, y da un
  // consejo concreto adaptado a eso — no genérico, distinto según lo que tenga seleccionado
  function ftContextualTip(){
    const t = state.tab;
    if (t === 'escalas') {
      const scaleName = SCALES[state.scaleKey] ? SCALES[state.scaleKey].name : state.scaleKey;
      return { title: '📍 Ahora mismo: Escalas', text: `Tienes seleccionada ${DISPLAY[state.root]} ${scaleName}. Consejo: tócala subiendo y bajando 3 veces seguidas sin parar antes de probar el Quiz — el error más común es pasar al quiz demasiado pronto, sin haber automatizado el patrón todavía.` };
    }
    if (t === 'triadas') {
      const q = TRIAD_QUALITIES[state.triad.quality];
      const invLabel = ['fundamental', '1ª inversión', '2ª inversión'][state.triad.inversion];
      return { title: '📍 Ahora mismo: Tríadas', text: `Tienes ${DISPLAY[state.triad.root]} ${q.label}, en ${invLabel}, disposición ${state.triad.mode}. Consejo: cuando la domines, cambia SOLO la inversión (no la tónica) y practica ese cambio — así entrenas el oído para reconocer inversiones, que es lo que más cuesta al principio.` };
    }
    if (t === 'acordes') {
      if (state.acordesMode === 'progresion') {
        return { title: '📍 Ahora mismo: Acordes (progresión)', text: 'Estás en modo Progresión. Consejo: no intentes memorizar la progresión entera de golpe — practica el cambio ENTRE LOS DOS PRIMEROS acordes hasta que sea automático, luego añade el tercero, y así sucesivamente.' };
      }
      return { title: '📍 Ahora mismo: Acordes', text: 'Estás en modo acorde individual. Consejo: prueba a activar la vista CAGED — verás las 5 posiciones de este mismo acorde por todo el mástil, muy útil para dejar de depender de una sola forma.' };
    }
    if (t === 'piano') {
      return { title: '📍 Ahora mismo: Piano', text: 'Consejo: si estás memorizando cómo se ve un acorde en el pentagrama, prueba primero en "Solo clave de Sol" o "Solo clave de Fa" (según el registro del acorde) — con las dos claves a la vez al principio cuesta más saber dónde mirar.' };
    }
    if (t === 'mastil') {
      return { title: '📍 Ahora mismo: Mástil', text: 'Esta vista es de referencia libre — buena para explorar el diapasón sin un objetivo concreto. Si estás empezando, mejor vuelve a Escalas o Tríadas, que te guían paso a paso.' };
    }
    if (t === 'tecnica') {
      return { title: '📍 Ahora mismo: Técnica', text: 'Consejo: practica siempre con metrónomo, aunque vayas despacio — la técnica que se entrena sin pulso estable no se transfiere bien a tocar canciones reales.' };
    }
    if (t === 'licks') {
      return { title: '📍 Ahora mismo: Licks', text: 'Consejo: aprende el lick de memoria primero SIN el metrónomo, y solo después ponle tempo — mezclar "aprender las notas" y "meterlo en tiempo" a la vez suele ser lo que más frena al principio.' };
    }
    if (t === 'estilos') {
      return { title: '📍 Ahora mismo: Estilos', text: `Estás explorando riffs de estilo (${state.style}). Consejo: no te limites a escuchar — activa la reproducción lenta y tócalo tú encima, aunque sea a trozos.` };
    }
    return null;
  }

  function ftRenderContextTip(){
    const box = $('#ftContextTip');
    const tip = ftContextualTip();
    if (!tip) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.innerHTML = `<h4>${tip.title}</h4><p>${tip.text}</p>`;
  }

  ftRenderQuickButtons();
  $('#fretTeacherFab').addEventListener('click', () => {
    const panel = $('#fretTeacherPanel');
    const opening = panel.style.display === 'none';
    panel.style.display = opening ? 'flex' : 'none';
    if (opening) ftRenderContextTip();
  });
  $('#fretTeacherClose').addEventListener('click', () => { $('#fretTeacherPanel').style.display = 'none'; });
  $('#ftSearchBtn').addEventListener('click', () => ftShowEntries(ftSearch($('#ftSearchInput').value)));
  $('#ftSearchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') ftShowEntries(ftSearch($('#ftSearchInput').value));
  });
  $('#ftBackingBtn').addEventListener('click', ftRenderBackingResult);
  $('#ftBackingInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') ftRenderBackingResult();
  });

  // ---------- MAPA DEL SITIO ----------
  const SITE_MAP = [
    { title: '🎸 Escalas', items: [
      { label: 'Mástil con 21 escalas y modos (jónico, dórico, pentatónicas, blues, flamenco...)', apply: () => { state.tab = 'escalas'; render(); } },
      { label: 'Quiz de identificación de notas', apply: () => { state.tab = 'escalas'; render(); } },
      { label: 'Secuencias diagonales (araña, zigzag, terceras...)', apply: () => { state.tab = 'escalas'; render(); } },
    ]},
    { title: '🎵 Estilos', items: [
      { label: 'Riffs de ejemplo en varios géneros (blues, rock, flamenco...)', apply: () => { state.tab = 'estilos'; render(); } },
    ]},
    { title: '🎼 Acordes', items: [
      { label: 'Acordes CAGED (25 calidades; 6 con las 5 posiciones movibles)', apply: () => { state.tab = 'acordes'; state.acordesMode = 'individual'; render(); } },
      { label: 'Progresiones por grados o formas estándar (blues 12c, rhythm changes, cadencia andaluza)', apply: () => { state.tab = 'acordes'; state.acordesMode = 'progresion'; render(); } },
      { label: 'Línea de bajo: Walking, Raíz-Quinta, Octavas', apply: () => { state.tab = 'acordes'; state.acordesMode = 'progresion'; state.progViewMode = 'bajo'; render(); } },
      { label: 'Séptimas y extensiones, paso a paso', apply: () => { state.tab = 'acordes'; render(); } },
      { label: 'Armonía por grados con séptimas (jazz/bossa)', apply: () => { state.tab = 'acordes'; render(); } },
      { label: 'Qué escala toco sobre este acorde', apply: () => { state.tab = 'acordes'; state.acordesMode = 'individual'; render(); } },
      { label: 'Notas de aproximación cromática', apply: () => { state.tab = 'acordes'; render(); } },
      { label: 'Analizador y transportador de progresiones', apply: () => { state.tab = 'acordes'; render(); } },
    ]},
    { title: '🎯 Mástil', items: [
      { label: 'Vista de referencia libre de todo el diapasón', apply: () => { state.tab = 'mastil'; render(); } },
    ]},
    { title: '🎯 Técnica', items: [
      { label: 'Arpegios y picking (alterno/económico)', apply: () => { state.tab = 'tecnica'; render(); } },
      { label: 'Power chords (acordes de 5ª)', apply: () => { state.tab = 'tecnica'; render(); } },
      { label: 'Técnicas de mástil: ligados, deslizamiento, bending', apply: () => { state.tab = 'tecnica'; render(); } },
    ]},
    { title: '🎹 Piano', items: [
      { label: 'Nota individual y Acorde (25 calidades + voicings rootless de jazz)', apply: () => { state.tab = 'piano'; render(); } },
      { label: 'Escala con digitación de dedos (verificada en 6 tonalidades)', apply: () => { state.tab = 'piano'; render(); } },
    ]},
    { title: '🔺 Tríadas', items: [
      { label: 'Teoría y digitaciones (vertical / horizontal / una cuerda)', apply: () => { state.tab = 'triads'; render(); } },
      { label: 'Zona del mástil y Mapa del mástil', apply: () => { state.tab = 'triads'; render(); } },
      { label: 'Armonía por grados, progresiones con conducción de voces', apply: () => { state.tab = 'triads'; render(); } },
      { label: 'Quiz de digitación "ciega"', apply: () => { state.tab = 'triads'; render(); } },
    ]},
    { title: '👂 Oído', items: [
      { label: 'Intervalos (melódico / armónico)', apply: () => { state.tab = 'oido'; render(); } },
      { label: 'Calidad de acorde (mayor / menor / aumentada / disminuida)', apply: () => { state.tab = 'oido'; render(); } },
    ]},
    { title: '🥁 Caja de Ritmos & Looper (siempre disponible, encima de las pestañas)', items: [
      { label: '12 estilos, fill automático, variación, humanizar, ½×/1×/2×', apply: null },
      { label: 'Silenciar cada instrumento por separado', apply: null },
      { label: 'Looper de piano (patrones Pad / Negras / Primer tiempo)', apply: null },
      { label: 'Línea de bajo automática (Raíz / Raíz-Quinta / Octavas / Walking, sobre los acordes del looper de piano)', apply: null },
      { label: 'EQ del conjunto: Reverb, Chorus, Delay', apply: null },
    ]},
    { title: '🎓 FretTeacher', items: [
      { label: 'Guías paso a paso, búsqueda por palabras clave, consejo según lo que tengas abierto', apply: () => { $('#siteMapPanel').style.display = 'none'; $('#fretTeacherFab').click(); } },
    ]},
  ];

  function renderSiteMap(){
    const wrap = $('#siteMapResults');
    wrap.innerHTML = '';
    SITE_MAP.forEach(section => {
      const sec = document.createElement('div');
      sec.className = 'sm-section';
      const title = document.createElement('div');
      title.className = 'sm-section-title';
      title.textContent = section.title;
      sec.appendChild(title);
      section.items.forEach(item => {
        const el = document.createElement(item.apply ? 'button' : 'div');
        el.className = 'sm-item';
        el.textContent = item.label;
        if (item.apply) {
          el.addEventListener('click', () => { item.apply(); $('#siteMapPanel').style.display = 'none'; });
        }
        sec.appendChild(el);
      });
      wrap.appendChild(sec);
    });
  }

  $('#siteMapFab').addEventListener('click', () => {
    const panel = $('#siteMapPanel');
    const opening = panel.style.display === 'none';
    panel.style.display = opening ? 'flex' : 'none';
    if (opening) renderSiteMap();
  });
  $('#siteMapClose').addEventListener('click', () => { $('#siteMapPanel').style.display = 'none'; });


  // ───── Rediseño 2026-10 (fase 1): grupos de secciones, ajustes recordados, mano, ritmos flotantes ─────
  // Capa por encima de la app: no cambia la lógica de las pestañas, solo cómo se llega a ellas y qué se recuerda.
  const GRUPOS = { escalas: ['escalas', 'mastil'], acordes: ['acordes', 'triads'], tocar: ['estilos', 'licks', 'tecnica'], oido: ['oido', 'voz'], piano: ['piano'] };
  const grupoDe = tab => Object.keys(GRUPOS).find(g => GRUPOS[g].includes(tab)) || 'escalas';
  const ultimaDelGrupo = {};
  document.querySelectorAll('#grupoNav button').forEach(b => b.addEventListener('click', () => {
    const g = b.dataset.grupo;
    if (grupoDe(state.tab) === g) return;
    const destino = ultimaDelGrupo[g] || GRUPOS[g][0];
    document.querySelector(`#tabGroup button[data-tab="${destino}"]`).click();   // el mismo camino que la pestaña de siempre
  }));
  function sincronizarGrupos(){
    const g = grupoDe(state.tab);
    ultimaDelGrupo[g] = state.tab;
    document.querySelectorAll('#grupoNav button').forEach(b => b.setAttribute('aria-current', String(b.dataset.grupo === g)));
    document.querySelectorAll('#tabGroup button').forEach(b => { b.hidden = !GRUPOS[g].includes(b.dataset.tab); });
    document.querySelector('.sub-tabs').classList.toggle('solo-una', GRUPOS[g].length < 2);
  }

  // Ajustes recordados en este navegador (si el almacenamiento falla, la app funciona igual sin recordar).
  const CLAVE_TALLER = 'fretlastico.taller.v1';
  let ajustesGuardados = null;
  try { ajustesGuardados = JSON.parse(localStorage.getItem(CLAVE_TALLER)); } catch (e) { ajustesGuardados = null; }
  const tabsValidas = [...document.querySelectorAll('#tabGroup button')].map(b => b.dataset.tab);
  const entero = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  if (ajustesGuardados && typeof ajustesGuardados === 'object') {
    const g = ajustesGuardados;
    if (g.instrument === 'guitarra' || g.instrument === 'bajo') state.instrument = g.instrument;
    if (typeof g.lefty === 'boolean') state.lefty = g.lefty;
    if (entero(g.capo, 0, 11)) state.capo = g.capo;
    if (tabsValidas.includes(g.tab)) state.tab = g.tab;
    if (entero(g.root, 0, 11)) state.root = g.root;
    if (typeof g.scaleKey === 'string' && Object.prototype.hasOwnProperty.call(SCALES, g.scaleKey)) state.scaleKey = g.scaleKey;
    if (entero(g.bpm, 50, 250)) state.bpm = g.bpm;
    const fs = Number(g.fs);
    if (fs >= 0.85 && fs <= 1.5) { $('#fontSizeSlider').value = fs; document.documentElement.style.setProperty('--fs-scale', fs); }
  } else {
    state.lefty = false;   // para cualquiera: diestro por defecto; se pregunta la primera vez (abajo)
  }
  state.sonidoReal = !(ajustesGuardados && ajustesGuardados.sonidoReal === false);
  $('#capoSelect').value = state.capo;
  $('#scaleSelect').value = state.scaleKey;
  $('#bpmSlider').value = state.bpm; $('#bpmLabel').textContent = state.bpm + ' BPM';
  $('#drumBpmSlider').value = state.bpm; $('#drumBpmLabel').textContent = state.bpm + ' BPM';
  function guardarAjustes(){
    try {
      localStorage.setItem(CLAVE_TALLER, JSON.stringify({
        instrument: state.instrument, lefty: state.lefty, capo: state.capo, tab: state.tab, root: state.root,
        scaleKey: state.scaleKey, bpm: state.bpm, fs: $('#fontSizeSlider').value, sonidoReal: state.sonidoReal,
        manoElegida: !!(ajustesGuardados && ajustesGuardados.manoElegida) || manoElegida }));
    } catch (e) { /* sin almacenamiento: solo esta sesión */ }
  }
  $('#fontSizeSlider').addEventListener('change', guardarAjustes);
  $('#bpmSlider').addEventListener('change', guardarAjustes);

  // La primera vez, ¿diestro o zurdo? (antes la app arrancaba siempre en zurdo)
  let manoElegida = false;
  if (!(ajustesGuardados && ajustesGuardados.manoElegida)) {
    const caja = document.createElement('div');
    caja.className = 'eleccion-mano'; caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-modal', 'true'); caja.setAttribute('aria-labelledby', 'manoTitulo');
    const interior = document.createElement('div'); interior.className = 'caja';
    const h2 = document.createElement('h2'); h2.id = 'manoTitulo'; h2.textContent = '¿Con qué mano rasgueas?';
    const p = document.createElement('p'); p.textContent = 'Así el mástil y los diagramas salen como los ves en tu instrumento. Puedes cambiarlo cuando quieras en ⚙️ Ajustes.';
    const botones = document.createElement('div'); botones.className = 'botones';
    [['Con la derecha', false, 'Diestro'], ['Con la izquierda', true, 'Zurdo']].forEach(([texto, zurdo, sub]) => {
      const b = document.createElement('button'); b.textContent = `${texto} · ${sub}`;
      b.addEventListener('click', () => { state.lefty = zurdo; manoElegida = true; caja.remove(); render(); });
      botones.appendChild(b);
    });
    interior.append(h2, p, botones); caja.appendChild(interior); document.body.appendChild(caja);
    setTimeout(() => botones.firstChild.focus(), 50);
  }
  $('#handToggle').addEventListener('click', () => { manoElegida = true; guardarAjustes(); });

  // Panel de ajustes (mano, cejilla, tamaño de letra)
  $('#ajustesBtn').addEventListener('click', () => {
    const panel = $('#ajustesPanel'), abrir = panel.hidden;
    panel.hidden = !abrir; $('#ajustesBtn').setAttribute('aria-expanded', String(abrir)); $('#ajustesBtn').classList.toggle('active', abrir);
  });

  // Enlaces directos: index.html#acordes?tonica=9&acorde=minor (también escala=…, instrumento=…).
  // Se aplican al cargar y al cambiar el hash, mandan sobre lo recordado y luego se quitan de la barra de direcciones.
  function aplicarEnlace(){
    const m = location.hash.match(/^#([a-z]+)(?:\?(.*))?$/);
    if (!m || !tabsValidas.includes(m[1])) return false;
    state.tab = m[1];
    const q = new URLSearchParams(m[2] || '');
    const tonica = Number(q.get('tonica'));
    if (q.has('tonica') && entero(tonica, 0, 11)) state.root = tonica;
    if (q.has('escala') && Object.prototype.hasOwnProperty.call(SCALES, q.get('escala'))) state.scaleKey = q.get('escala');
    if (q.has('acorde') && Object.prototype.hasOwnProperty.call(CHORD_QUALITIES, q.get('acorde'))) { state.chordQuality = q.get('acorde'); state.acordesMode = 'individual'; }
    if (q.get('instrumento') === 'guitarra' || q.get('instrumento') === 'bajo') state.instrument = q.get('instrumento');
    $('#scaleSelect').value = state.scaleKey;
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  }
  aplicarEnlace();
  window.addEventListener('hashchange', () => { if (aplicarEnlace()) render(); });

  // Sonido real o sintético; las muestras se descargan en el primer toque (el audio solo arranca tras un gesto)
  document.querySelectorAll('#sonidoGroup button').forEach(b => b.addEventListener('click', () => { state.sonidoReal = b.dataset.sonido === 'real'; render(); }));
  const precargar = () => { if (state.sonidoReal) { bancoMuestras(state.instrument); if (state.tab === 'piano') bancoMuestras('piano'); } };
  document.addEventListener('pointerdown', precargar, { capture: true });

  // Caja de ritmos: hoja deslizable con botón flotante, disponible en cualquier sección
  const abrirRitmos = abrir => { $('#ritmoHoja').hidden = !abrir; $('#ritmoFab').setAttribute('aria-expanded', String(abrir)); };
  $('#ritmoFab').addEventListener('click', () => abrirRitmos($('#ritmoHoja').hidden));
  $('#ritmoCerrar').addEventListener('click', () => abrirRitmos(false));
  new MutationObserver(() => $('#ritmoFab').classList.toggle('sonando', $('#drumSummary').textContent.includes('sonando')))
    .observe($('#drumSummary'), { childList: true, characterData: true, subtree: true });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    abrirRitmos(false); $('#ajustesPanel').hidden = true; $('#ajustesBtn').setAttribute('aria-expanded', 'false');
  });

  // Botones de solo icono: su título también como nombre accesible (lectores de pantalla)
  document.querySelectorAll('button[title]').forEach(b => {
    if (!b.getAttribute('aria-label') && !/[\p{L}\p{N}]{2,}/u.test(b.textContent)) b.setAttribute('aria-label', b.title);
  });

  // Tras cada render: grupos, mano, ajustes guardados y mástil centrado en la cejuela (en el móvil se desliza)
  let ultimaVista = '';
  const renderBase = render;
  render = function(){
    try { renderBase(); } finally { despuesDeRender(); }   // aunque una sección falle, la navegación y los ajustes siguen al día
  };
  function despuesDeRender(){
    sincronizarGrupos();
    $('#manoValor').textContent = state.lefty ? 'Zurdo' : 'Diestro';
    document.querySelectorAll('#sonidoGroup button').forEach(b => b.classList.toggle('active', (b.dataset.sonido === 'real') === state.sonidoReal));
    guardarAjustes();
    const vista = state.tab + state.lefty + state.instrument, shell = document.querySelector('.board-shell');
    if (vista !== ultimaVista && shell && shell.scrollWidth > shell.clientWidth) shell.scrollLeft = state.lefty ? shell.scrollWidth : 0;
    ultimaVista = vista;
  }
  render();
})();
