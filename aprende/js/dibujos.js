// Diagramas en SVG construidos con el DOM (sin innerHTML). Diestro: como en cualquier libro o vídeo;
// zurdo: en espejo.

const NS = 'http://www.w3.org/2000/svg';
export function el(tag, attrs = {}, ...hijos) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const h of hijos) e.append(h);
  return e;
}
const texto = (x, y, t, attrs = {}) => el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...attrs }, String(t));

// Diagrama vertical de acorde: cuerdas en vertical (6.ª a la izquierda en diestro), cejuela arriba.
export function diagramaAcorde({ trastes, dedos, cifrado, zurdo = false }) {
  const n = trastes.length, W = 200, H = 250, x0 = 34, y0 = 58, dx = (W - 2 * x0) / (n - 1), dy = 40, filas = 4;
  const orden = [...Array(n).keys()];
  if (zurdo) orden.reverse();
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagrama', role: 'img', 'aria-label': `Diagrama del acorde ${cifrado}` });
  svg.append(texto(W / 2, 18, cifrado, { class: 'diagrama-titulo' }));
  for (let f = 0; f <= filas; f++)
    svg.append(el('line', { x1: x0, x2: W - x0, y1: y0 + f * dy, y2: y0 + f * dy, class: f === 0 ? 'cejuela' : 'traste' }));
  orden.forEach((c, i) => {
    const x = x0 + i * dx;
    svg.append(el('line', { x1: x, x2: x, y1: y0, y2: y0 + filas * dy, class: 'cuerda', 'stroke-width': 1 + (n - 1 - c) * 0.35 }));
    const t = trastes[c];
    if (t === null) svg.append(texto(x, y0 - 16, '✕', { class: 'muda' }));
    else if (t === 0) svg.append(el('circle', { cx: x, cy: y0 - 16, r: 7, class: 'al-aire' }));
    else {
      const y = y0 + (t - 0.5) * dy;
      svg.append(el('circle', { cx: x, cy: y, r: 14, class: 'dedo' }), texto(x, y + 1, dedos[c], { class: 'dedo-num' }));
    }
  });
  return svg;
}

// Tramo de mástil horizontal, como una tablatura: 1.ª cuerda (aguda) arriba.
// marcas: [{ cuerda (0 = la más grave), traste, texto, tipo: 'objetivo' | 'hecho' | 'suave' }]
export function mastil({ cuerdas = 6, desde = 0, hasta = 5, marcas = [], zurdo = false, nombresCuerdas = [] }) {
  const ancho = 80, alto = 34, mx = 46, my = 22, nT = hasta - desde;
  const W = mx * 2 + nT * ancho, H = my * 2 + (cuerdas - 1) * alto;
  const X = t => { const k = t - desde; return mx + (zurdo ? nT - k : k) * ancho; };
  const Xcentro = t => (t === 0 ? X(0) + (zurdo ? 18 : -18) : (X(t) + X(t - 1)) / 2);
  const Y = c => my + (cuerdas - 1 - c) * alto;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'mastil', role: 'img', 'aria-label': 'Mástil' });
  for (const m of [3, 5, 7, 9, 12, 15]) if (m > desde && m <= hasta)
    svg.append(el('circle', { cx: (X(m) + X(m - 1)) / 2, cy: H / 2, r: 6, class: 'marca-traste' }));
  for (let t = desde; t <= hasta; t++)
    svg.append(el('line', { x1: X(t), x2: X(t), y1: my - 6, y2: H - my + 6, class: t === 0 ? 'cejuela' : 'traste' }));
  for (let c = 0; c < cuerdas; c++) {
    svg.append(el('line', { x1: X(desde), x2: X(hasta), y1: Y(c), y2: Y(c), class: 'cuerda', 'stroke-width': 1 + (cuerdas - 1 - c) * 0.4 }));
    if (nombresCuerdas[c]) svg.append(texto(zurdo ? W - 14 : 14, Y(c), nombresCuerdas[c], { class: 'nombre-cuerda' }));
  }
  for (const m of marcas) {
    const x = Xcentro(m.traste), y = Y(m.cuerda);
    svg.append(el('circle', { cx: x, cy: y, r: 14, class: `punto ${m.tipo || 'objetivo'}` }));
    if (m.texto) svg.append(texto(x, y + 1, m.texto, { class: 'punto-texto' }));
  }
  for (let t = Math.max(1, desde); t <= hasta; t++) svg.append(texto((X(t) + X(t - 1)) / 2, H - 6, t, { class: 'num-traste' }));
  return svg;
}
