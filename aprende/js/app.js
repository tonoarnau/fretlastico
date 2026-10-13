// Fretlastico Aprende: navegación, bienvenida, «Hoy toca» y reproductor de unidades.
import * as T from './teoria.js';
import * as S from './sonido.js';
import * as E from './escucha.js';
import * as A from './almacen.js';
import { diagramaAcorde, mastil } from './dibujos.js';
import { UNIDADES, PROXIMAS } from './cursos/guitarra.js';

const raiz = document.getElementById('app');
const vivo = document.getElementById('aviso-vivo');   // región aria-live para lectores de pantalla

// h('div', { class: 'x', onclick: f }, 'texto', otroNodo): crea elementos; el texto entra siempre como texto.
function h(tag, attrs = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;          // por CSSOM: la CSP no deja atributos style en línea
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}
const avisar = t => { vivo.textContent = ''; setTimeout(() => (vivo.textContent = t), 30); };

const perfil = () => A.perfil() || {};
const zurdo = () => perfil().mano === 'zurdo';
const nombre = p => T.nombreNota(p, { nombres: perfil().nombres || 'ambos', tonica: 0 });
const INST = () => S.INSTRUMENTO_DE[perfil().instrumento] || 'guitar-acoustic';

// Cada pantalla puede dejar una función de limpieza (parar micro, metrónomo, bucles).
let limpiar = [];
const alSalir = f => limpiar.push(f);
function pintar(...nodos) {
  limpiar.forEach(f => { try { f(); } catch {} }); limpiar = [];
  raiz.replaceChildren(...nodos);
  const t = raiz.querySelector('h1, h2'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}

// ── rutas ────────────────────────────────────────────────────────────────────────────────────────────────────────
function ruta() {
  const [, pagina, a, b] = location.hash.split('/');
  if (!A.perfil() && pagina !== 'creditos') return bienvenida();
  if (pagina === 'unidad') return unidad(a, Number(b) || 0);
  if (pagina === 'ajustes') return ajustes();
  if (pagina === 'creditos') return creditos();
  return inicio();
}
window.addEventListener('hashchange', ruta);
const ir = r => { if (location.hash === r) ruta(); else location.hash = r; };

// ── bienvenida: tres preguntas y dos ajustes ────────────────────────────────────────────────────────────────────
function bienvenida(paso = 0, resp = {}) {
  const preguntas = [
    { clave: 'instrumento', titulo: '¿Qué quieres aprender?', opciones: [
      ['guitarra', '🎸', 'Guitarra', 'Acordes, canciones y tus primeros solos'],
      ['bajo', '🎸', 'Bajo', 'El pulso de la banda (camino en preparación)'],
      ['piano', '🎹', 'Piano', 'Las dos manos, paso a paso (camino en preparación)']] },
    { clave: 'nivel', titulo: '¿Has tocado alguna vez?', opciones: [
      ['cero', '🌱', 'Nunca, empiezo de cero', 'Empezamos por afinar y las primeras notas'],
      ['algo', '🌿', 'Sé algo', 'Puedes saltar lo que ya domines']] },
    { clave: 'objetivo', titulo: '¿Qué te apetece tocar?', opciones: [
      ['canciones', '🎶', 'Canciones', 'Acompañar temas que te gustan'],
      ['improvisar', '🔥', 'Improvisar', 'Solos y melodías propias'],
      ['todo', '✨', 'Un poco de todo', 'Te propongo un camino equilibrado']] },
    { clave: 'mano', titulo: '¿Con qué mano rasgueas?', opciones: [
      ['diestro', '👉', 'Con la derecha', 'Diestro: los diagramas como en libros y vídeos'],
      ['zurdo', '👈', 'Con la izquierda', 'Zurdo: los diagramas en espejo']] },
    { clave: 'nombres', titulo: '¿Cómo prefieres llamar a las notas?', opciones: [
      ['ambos', '🔤', 'Do (C), los dos', 'Recomendado: las canciones usan letras'],
      ['latino', 'Do', 'Do, Re, Mi', 'Como en el colegio'],
      ['letras', 'C', 'C, D, E', 'Como en los cifrados de acordes']] },
  ];
  const q = preguntas[paso];
  const elegir = v => {
    const r = { ...resp, [q.clave]: v };
    if (paso + 1 < preguntas.length) bienvenida(paso + 1, r);
    else { A.guardarPerfil(r); ir('#/hoy'); }
  };
  pintar(h('main', { class: 'pantalla bienvenida' },
    paso === 0 && h('div', { class: 'marca' }, h('span', { class: 'logo' }, 'Fret', h('b', {}, 'lastico')), h('span', { class: 'sello' }, 'Aprende')),
    paso === 0 && h('p', { class: 'entradilla' }, 'Un camino guiado, con lecciones cortas que te escuchan tocar. Sin agobios: cada día, un paso.'),
    h('div', { class: 'puntos', 'aria-label': `Pregunta ${paso + 1} de ${preguntas.length}` }, preguntas.map((_, i) => h('span', { class: i <= paso ? 'on' : '' }))),
    h('h1', {}, q.titulo),
    h('div', { class: 'opciones' }, q.opciones.map(([v, ic, t, d]) =>
      h('button', { class: 'opcion', onclick: () => elegir(v) }, h('span', { class: 'ic', 'aria-hidden': 'true' }, ic), h('span', {}, h('b', {}, t), h('small', {}, d))))),
    paso > 0 && h('button', { class: 'enlace', onclick: () => bienvenida(paso - 1, resp) }, '← Atrás')));
}

// ── inicio: «Hoy toca» ──────────────────────────────────────────────────────────────────────────────────────────
function siguienteUnidad() {
  const p = perfil();
  const pendientes = UNIDADES.filter(u => !A.completada(u.id));
  // quien ya sabe algo empieza por los acordes (las dos primeras siguen ahí por si las quiere)
  if (p.nivel === 'algo' && !A.completada('g1') && !A.completada('g2')) return pendientes.find(u => u.id === 'g3') || pendientes[0] || null;
  return pendientes[0] || null;
}

function inicio() {
  const p = perfil();
  if (p.instrumento && p.instrumento !== 'guitarra') return enPreparacion(p.instrumento);
  const sig = siguienteUnidad(), racha = A.racha(), repasos = A.repasosPendientes();
  const hechas = UNIDADES.filter(u => A.completada(u.id)).length;
  pintar(
    cabecera(),
    h('main', { class: 'pantalla' },
      h('section', { class: 'resumen' },
        h('div', { class: 'dato' }, h('b', {}, racha ? `🔥 ${racha}` : '—'), h('small', {}, racha === 1 ? 'día seguido' : 'días seguidos')),
        h('div', { class: 'dato' }, h('b', {}, `${hechas}/${UNIDADES.length}`), h('small', {}, 'unidades')),
        h('div', { class: 'dato' }, h('b', {}, A.minutosTotales()), h('small', {}, 'minutos'))),
      h('h1', {}, sig ? 'Hoy toca' : '¡Camino completado!'),
      sig ? tarjetaUnidad(sig, true)
          : h('p', { class: 'nota' }, 'Has terminado las unidades disponibles. Repasa las que quieras o explora el Taller mientras preparamos las siguientes.'),
      repasos.length > 0 && h('section', {},
        h('h2', {}, 'Repaso de hoy'),
        h('p', { class: 'nota' }, 'Volver a algo unos días después es lo que hace que se quede. Son unos minutos.'),
        repasos.map(id => tarjetaUnidad(UNIDADES.find(u => u.id === id), false, true))),
      h('section', {},
        h('h2', {}, 'Tu camino de guitarra'),
        h('ol', { class: 'camino' },
          UNIDADES.map((u, i) => h('li', { class: A.completada(u.id) ? 'hecha' : u === sig ? 'actual' : '' },
            h('a', { href: `#/unidad/${u.id}/0` },
              h('span', { class: 'hito', 'aria-hidden': 'true' }, A.completada(u.id) ? '✓' : i + 1),
              h('span', {}, h('b', {}, u.titulo), h('small', {}, `${u.minutos} min · ${u.objetivo}`))))),
          PROXIMAS.map(u => h('li', { class: 'proxima' },
            h('span', { class: 'hito', 'aria-hidden': 'true' }, '·'),
            h('span', {}, h('b', {}, u.titulo), h('small', {}, 'Próximamente')))))),
      h('section', { class: 'taller' },
        h('h2', {}, '¿Buscas algo concreto?'),
        h('p', { class: 'nota' }, 'El Taller tiene todas las herramientas a la vez: escalas, acordes, caja de ritmos, tríadas, oído…'),
        h('a', { class: 'boton secundario', href: '../index.html' }, 'Abrir el Taller →')),
      pie()));
}

function tarjetaUnidad(u, principal, repaso = false) {
  return h('a', { class: `tarjeta${principal ? ' principal' : ''}`, href: `#/unidad/${u.id}/0` },
    h('span', { class: 'ic', 'aria-hidden': 'true' }, u.icono),
    h('span', {}, h('small', {}, repaso ? 'Repaso' : `Unidad ${UNIDADES.indexOf(u) + 1} · ${u.minutos} min`), h('b', {}, u.titulo), h('span', { class: 'obj' }, u.objetivo)),
    h('span', { class: 'flecha', 'aria-hidden': 'true' }, '▶'));
}

function enPreparacion(inst) {
  pintar(cabecera(), h('main', { class: 'pantalla' },
    h('h1', {}, inst === 'bajo' ? 'El camino de bajo está en camino' : 'El camino de piano está en camino'),
    h('p', {}, 'Este prototipo empieza por la guitarra. Mientras tanto puedes probar el camino de guitarra o usar el Taller, que ya tiene ',
      inst === 'bajo' ? 'el mástil de bajo, líneas de bajo y el looper.' : 'el teclado con acordes, escalas con digitación y pentagrama.'),
    h('div', { class: 'acciones' },
      h('button', { class: 'boton', onclick: () => { A.guardarPerfil({ instrumento: 'guitarra' }); ir('#/hoy'); } }, 'Probar el camino de guitarra'),
      h('a', { class: 'boton secundario', href: '../index.html' }, 'Abrir el Taller')),
    pie()));
}

const cabecera = () => h('header', { class: 'cabecera' },
  h('a', { href: '#/hoy', class: 'marca' }, h('span', { class: 'logo' }, 'Fret', h('b', {}, 'lastico')), h('span', { class: 'sello' }, 'Aprende')),
  h('a', { href: '#/ajustes', class: 'icono', 'aria-label': 'Ajustes' }, '⚙️'));
const pie = () => h('footer', { class: 'pie' }, h('a', { href: '#/creditos' }, 'Créditos y licencias'));

// ── reproductor de unidades ─────────────────────────────────────────────────────────────────────────────────────
let inicioUnidad = null;
function unidad(id, i) {
  const u = UNIDADES.find(x => x.id === id);
  if (!u) return ir('#/hoy');
  if (i === 0 || !inicioUnidad) inicioUnidad = Date.now();
  const paso = u.pasos[Math.min(i, u.pasos.length - 1)];
  const listo = { valor: !['afinar', 'notas', 'acorde', 'cambios'].includes(paso.tipo) };
  const siguiente = h('button', { class: 'boton', disabled: !listo.valor, onclick: () => ir(`#/unidad/${id}/${i + 1}`) }, 'Siguiente');
  const completar = () => { siguiente.disabled = false; siguiente.classList.add('latido'); avisar('¡Conseguido! Puedes pasar al siguiente paso.'); };
  const cuerpo = PASOS[paso.tipo](paso, completar, u);
  const ultimo = paso.tipo === 'fin';
  pintar(h('div', { class: 'reproductor' },
    h('header', { class: 'barra' },
      h('a', { href: '#/hoy', class: 'icono', 'aria-label': 'Salir de la unidad' }, '✕'),
      h('div', { class: 'progreso', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': u.pasos.length, 'aria-valuenow': i + 1 },
        h('span', { style: `width:${((i + 1) / u.pasos.length) * 100}%` })),
      h('span', { class: 'contador' }, `${i + 1}/${u.pasos.length}`)),
    h('main', { class: 'pantalla paso' }, paso.titulo && h('h2', {}, paso.titulo), cuerpo),
    !ultimo && h('nav', { class: 'navegacion' },
      i > 0 ? h('button', { class: 'boton secundario', onclick: () => ir(`#/unidad/${id}/${i - 1}`) }, 'Atrás') : h('span'),
      !listo.valor && h('button', { class: 'enlace', onclick: () => ir(`#/unidad/${id}/${i + 1}`) }, 'Saltar'),
      siguiente)));
  alSalir(() => { if (!location.hash.startsWith(`#/unidad/${id}/`)) E.cerrar(); });
}

const parrafos = t => (t || []).map(x => h('p', {}, x));

// Botón «activar micrófono» con su explicación; llama a alAbrir cuando hay permiso.
function panelMicro(alAbrir, alternativa) {
  if (E.abierto()) { setTimeout(alAbrir); return null; }   // ya dio permiso en un paso anterior
  const caja = h('div', { class: 'micro' });
  const sinMicro = h('button', { class: 'enlace', onclick: alternativa }, 'No tengo micro o prefiero no usarlo');
  if (!E.microDisponible()) { caja.append(h('p', { class: 'nota' }, 'Este navegador no deja usar el micrófono.'), sinMicro); return caja; }
  caja.append(
    h('button', { class: 'boton', onclick: async () => {
      try { S.audio(); await E.abrir(); caja.remove(); alAbrir(); }
      catch { caja.replaceChildren(h('p', { class: 'nota' }, 'No he podido usar el micrófono. Revisa el permiso del navegador o sigue sin él.'), sinMicro); }
    } }, '🎙️ Activar el micrófono'),
    h('p', { class: 'nota' }, 'Te escucho para saber si suena bien. El sonido se analiza en tu dispositivo y no se envía a ningún sitio.'),
    sinMicro);
  return caja;
}

// Bucle de análisis (~15 por segundo) que se para al salir del paso.
function bucle(f) {
  let activo = true, ultimo = 0;
  const vuelta = t => { if (!activo) return; if (t - ultimo > 66) { ultimo = t; f(t); } requestAnimationFrame(vuelta); };
  requestAnimationFrame(vuelta);
  alSalir(() => { activo = false; });
}

const PASOS = {
  explica(p) {
    const partes = [...parrafos(p.texto)];
    if (p.dibujo?.tipo === 'mastil') {
      const nombres = T.AFINACION.guitarra.map(m => T.nombreNota(T.pc(m), { nombres: perfil().nombres === 'letras' ? 'letras' : 'latino' }));
      partes.push(h('figure', { class: 'figura' }, mastil({
        desde: p.dibujo.desde, hasta: p.dibujo.hasta, zurdo: zurdo(),
        nombresCuerdas: p.dibujo.cuerdasAlAire ? nombres : [],
        marcas: p.dibujo.marcas || (p.dibujo.cuerdasAlAire ? T.AFINACION.guitarra.map((_, c) => ({ cuerda: c, traste: 0, texto: String(T.numeroCuerda('guitarra', c)), tipo: 'suave' })) : []),
      })));
    }
    for (const e of p.escuchar || []) partes.push(h('button', { class: 'boton secundario', onclick: async () => {
      const t0 = S.audio().currentTime + 0.05;
      e.cuerdas.forEach((c, k) => S.nota(INST(), T.AFINACION.guitarra[c], { cuando: t0 + k * 0.7, dur: 1.2 }));
    } }, `🔊 ${e.etiqueta}`));
    return partes;
  },

  afinar(p, completar) {
    const afinadas = new Set();
    const cuerdas = T.AFINACION.guitarra.map((m, c) => h('button', { class: 'cuerda-chip', onclick: () => S.nota(INST(), m, { dur: 2.5 }) },
      h('small', {}, `${T.numeroCuerda('guitarra', c)}.ª`), h('b', {}, nombre(T.pc(m)))));
    const aguja = h('div', { class: 'aguja' });
    const lectura = h('p', { class: 'lectura', 'aria-live': 'polite' }, 'Toca una cuerda al aire');
    const medidor = h('div', { class: 'medidor', 'aria-hidden': 'true' }, h('span', { class: 'zona-ok' }), aguja);
    let estable = 0, cuerdaActual = -1;
    const escuchar = () => bucle(() => {
      const r = E.tono();
      if (!r) { aguja.style.opacity = 0.25; return; }
      const m = T.midiDeFrecuencia(r.frecuencia);
      let c = 0;
      T.AFINACION.guitarra.forEach((x, k) => { if (Math.abs(x - m) < Math.abs(T.AFINACION.guitarra[c] - m)) c = k; });
      const cents = Math.round((m - T.AFINACION.guitarra[c]) * 100);
      if (Math.abs(cents) > 450) return;               // demasiado lejos de cualquier cuerda: no es una cuerda al aire
      aguja.style.opacity = 1;
      aguja.style.left = `${50 + Math.max(-50, Math.min(50, cents))}%`;     // ±50 cents = todo el medidor
      cuerdas.forEach((b, k) => b.classList.toggle('escuchando', k === c));
      const ok = Math.abs(cents) <= 7;
      lectura.textContent = `${T.numeroCuerda('guitarra', c)}.ª cuerda (${nombre(T.pc(T.AFINACION.guitarra[c]))}): ` +
        (ok ? 'afinada ✓' : cents < 0 ? `un poco grave, aprieta la clavija (${cents} cents)` : `un poco aguda, afloja la clavija (+${cents} cents)`);
      estable = ok && c === cuerdaActual ? estable + 1 : ok ? 1 : 0; cuerdaActual = c;
      if (estable >= 6 && !afinadas.has(c)) {
        afinadas.add(c); cuerdas[c].classList.add('hecha'); avisar(`${T.numeroCuerda('guitarra', c)}.ª cuerda afinada`);
        if (afinadas.size === 6) completar();
      }
    });
    return [...parrafos(p.texto), h('div', { class: 'cuerdas' }, cuerdas), medidor, lectura,
      h('p', { class: 'nota' }, 'Pulsa una cuerda de la lista para oír cómo debe sonar.'),
      panelMicro(escuchar, () => { lectura.textContent = 'Afina de oído: pulsa cada cuerda de la lista y gira la clavija hasta que tu guitarra suene igual.'; completar(); })];
  },

  notas(p, completar) {
    let k = 0, interrumpido = true, aciertoEn = 0;
    const figura = h('figure', { class: 'figura' });
    const objetivo = h('p', { class: 'objetivo-nota', 'aria-live': 'polite' });
    const pintarMastil = () => {
      // una marca por posición (en una melodía se repiten): la de ahora resaltada, las demás en suave
      const actual = p.secuencia[k], vistas = new Map();
      for (const n of p.secuencia) vistas.set(`${n.cuerda}-${n.traste}`, n);
      figura.replaceChildren(mastil({ desde: p.desde, hasta: p.hasta, zurdo: zurdo(),
        marcas: [...vistas.values()].map(n => ({ ...n,
          tipo: k >= p.secuencia.length ? 'hecho' : n === actual || (actual && n.cuerda === actual.cuerda && n.traste === actual.traste) ? 'objetivo' : 'suave',
          texto: nombre(T.pc(T.notaEnTraste('guitarra', n.cuerda, n.traste))).split(' ')[0] })) }));
      if (k < p.secuencia.length) {
        const n = p.secuencia[k];
        objetivo.textContent = `Toca ${nombre(T.pc(T.notaEnTraste('guitarra', n.cuerda, n.traste)))}: ${T.numeroCuerda('guitarra', n.cuerda)}.ª cuerda, ` +
          (n.traste === 0 ? 'al aire' : `traste ${n.traste}`) + `  ·  ${k + 1} de ${p.secuencia.length}`;
      } else objetivo.textContent = '¡Bien tocado! ✓';
    };
    const avanzar = () => { k++; pintarMastil(); if (k >= p.secuencia.length) completar(); };
    const escuchar = () => bucle(t => {
      if (k >= p.secuencia.length) return;
      const r = E.tono();
      const meta = T.notaEnTraste('guitarra', p.secuencia[k].cuerda, p.secuencia[k].traste);
      if (!r) { interrumpido = true; return; }
      const bien = r.midi === meta || Math.abs(r.midi - meta) === 12;   // la octava también vale: el micro a veces la confunde
      const anterior = k > 0 ? T.notaEnTraste('guitarra', p.secuencia[k - 1].cuerda, p.secuencia[k - 1].traste) : null;
      if (!bien) { interrumpido = true; return; }
      if (meta === anterior && !interrumpido && t - aciertoEn < 900) return;  // nota repetida: espera a que se vuelva a pulsar
      aciertoEn = t; interrumpido = false; avanzar();
    });
    pintarMastil();
    const tocarSecuencia = () => {
      const t0 = S.audio().currentTime + 0.1;
      p.secuencia.forEach((n, j) => S.nota(INST(), T.notaEnTraste('guitarra', n.cuerda, n.traste), { cuando: t0 + j * 0.55, dur: 0.6 }));
    };
    return [...parrafos(p.texto), figura, objetivo,
      h('div', { class: 'acciones' },
        h('button', { class: 'boton secundario', onclick: () => { const n = p.secuencia[Math.min(k, p.secuencia.length - 1)]; S.nota(INST(), T.notaEnTraste('guitarra', n.cuerda, n.traste)); } }, '🔊 Esta nota'),
        p.escucharPrimero && h('button', { class: 'boton secundario', onclick: tocarSecuencia }, '🔊 Toda la melodía')),
      panelMicro(escuchar, () => {
        const b = h('button', { class: 'boton', onclick: () => { avanzar(); if (k >= p.secuencia.length) b.remove(); } }, 'La he tocado →');
        figura.after(b);
      })];
  },

  acorde(p, completar) {
    const a = T.ACORDES_GUITARRA[p.acorde];
    let buenos = 0, enRasgueo = false, sostenido = 0, flojo = 0;
    const marcador = h('div', { class: 'rasgueos', 'aria-label': 'Rasgueos limpios' }, [0, 1, 2].map(() => h('span')));
    const chips = a.notas.map(n => h('span', { class: 'chip-nota' }, nombre(n)));
    const estado = h('p', { class: 'lectura', 'aria-live': 'polite' }, 'Rasguea el acorde');
    const escuchar = () => bucle(() => {
      if (buenos >= 3) return;
      const nivel = E.nivel(), c = E.croma();
      if (!c || nivel < 0.012) { enRasgueo = false; sostenido = 0; flojo = 0; chips.forEach(x => x.classList.remove('on')); return; }
      a.notas.forEach((n, j) => chips[j].classList.toggle('on', c[n] > 0.08));
      const par = E.parecidoAcorde(c, a.notas);
      if (par > 0.55) { sostenido++; flojo = 0; } else { sostenido = 0; if (++flojo > 6) enRasgueo = false; }  // el acorde se apagó
      if (sostenido >= 4 && !enRasgueo) {
        enRasgueo = true; buenos++;
        marcador.children[buenos - 1].classList.add('on');
        estado.textContent = buenos < 3 ? `¡Limpio! ${buenos} de 3. Para el sonido con la mano y rasguea otra vez.` : '¡Tres rasgueos limpios! ✓';
        if (buenos === 3) completar();
      } else if (!enRasgueo && par < 0.3 && nivel > 0.03) {
        const falta = a.notas.filter(n => c[n] < 0.05).map(nombre);
        if (falta.length) estado.textContent = `No oigo bien: ${falta.join(', ')}. Revisa que ningún dedo roce otra cuerda.`;
      }
    });
    return [...parrafos(p.texto),
      h('figure', { class: 'figura acorde' }, diagramaAcorde({ ...a, zurdo: zurdo() }),
        h('figcaption', {}, h('b', {}, a.nombre), ' · notas: ', chips)),
      h('button', { class: 'boton secundario', onclick: () => S.rasgueo(INST(), T.notasDeForma(a.trastes)) }, '🔊 Cómo suena'),
      h('a', { class: 'enlace', href: `../index.html#acordes?tonica=${a.notas[0]}&acorde=${a.cifrado.endsWith('m') ? 'minor' : 'major'}` }, 'Más formas de este acorde en el Taller →'),
      marcador, estado,
      panelMicro(escuchar, () => {
        estado.textContent = 'Sin micro: rasguea despacio cuerda a cuerda y escucha que ninguna zumbe ni suene apagada.';
        const b = h('button', { class: 'boton', onclick: () => { b.remove(); completar(); } }, 'Ya me suena limpio');
        estado.after(b);
      })];
  },

  cambios(p, completar) {
    const total = p.acordes.length * p.vueltas;
    let metro = null, bpm = p.bpm, hechos = 0;
    const grande = h('figure', { class: 'figura acorde grande' }), pequeno = h('div', { class: 'siguiente-acorde' });
    const cuenta = h('div', { class: 'cuenta', 'aria-hidden': 'true' }, [...Array(p.pulsos)].map((_, i) => h('span', {}, i + 1)));
    const progreso = h('p', { class: 'lectura', 'aria-live': 'polite' }, `0 de ${total} acordes`);
    const etiquetaBpm = h('b', {}, `${bpm}`);
    const mostrar = j => {
      const a = T.ACORDES_GUITARRA[p.acordes[j % p.acordes.length]], s = T.ACORDES_GUITARRA[p.acordes[(j + 1) % p.acordes.length]];
      grande.replaceChildren(diagramaAcorde({ ...a, zurdo: zurdo() }));
      pequeno.replaceChildren('Siguiente: ', h('b', {}, s.cifrado));
    };
    mostrar(0);
    const boton = h('button', { class: 'boton', onclick: () => {
      if (metro) { metro.parar(); metro = null; boton.textContent = '▶ Empezar'; return; }
      S.audio(); hechos = 0; boton.textContent = '■ Parar';
      const precuenta = p.pulsos;                  // un compás de cuenta antes de empezar
      metro = S.metronomo({ bpm, compas: p.pulsos, alPulso: n => {
        const enCompas = n % p.pulsos;
        [...cuenta.children].forEach((x, i) => x.classList.toggle('on', i === enCompas));
        if (n < precuenta) { progreso.textContent = `Preparado… ${precuenta - n}`; return; }
        const j = Math.floor((n - precuenta) / p.pulsos);
        if (enCompas === 0) {
          if (j >= total) { metro.parar(); metro = null; boton.textContent = '▶ Otra vez'; progreso.textContent = `¡${total} acordes a tiempo! ✓`; completar(); return; }
          mostrar(j); hechos = j + 1; progreso.textContent = `${hechos} de ${total} acordes`;
        }
      } });
    } }, '▶ Empezar');
    alSalir(() => metro && metro.parar());
    const cambiarBpm = d => { bpm = Math.max(40, Math.min(120, bpm + d)); etiquetaBpm.textContent = bpm; if (metro) metro.bpm = bpm; };
    return [...parrafos(p.texto), h('div', { class: 'escenario' }, grande, pequeno), cuenta, progreso,
      h('div', { class: 'acciones' }, boton,
        h('div', { class: 'tempo' }, h('button', { class: 'redondo', 'aria-label': 'Más lento', onclick: () => cambiarBpm(-4) }, '−'), etiquetaBpm, h('small', {}, 'BPM'),
          h('button', { class: 'redondo', 'aria-label': 'Más rápido', onclick: () => cambiarBpm(4) }, '+')))];
  },

  fin(p, _, u) {
    const minutos = Math.min(30, (Date.now() - (inicioUnidad || Date.now())) / 60000);
    return [h('div', { class: 'celebracion', 'aria-hidden': 'true' }, '🎉'), h('p', { class: 'grande' }, p.texto),
      h('button', { class: 'boton', onclick: () => { A.completar(u.id); A.practicaHoy(minutos); inicioUnidad = null; ir('#/hoy'); } }, 'Completar unidad ✓')];
  },
};

// ── ajustes y créditos ──────────────────────────────────────────────────────────────────────────────────────────
function ajustes() {
  const p = perfil();
  const grupo = (titulo, clave, ops) => h('fieldset', { class: 'grupo' }, h('legend', {}, titulo),
    ops.map(([v, t]) => h('button', { class: `pastilla${p[clave] === v ? ' activa' : ''}`, 'aria-pressed': String(p[clave] === v),
      onclick: () => { A.guardarPerfil({ [clave]: v }); ajustes(); } }, t)));
  pintar(cabecera(), h('main', { class: 'pantalla' }, h('h1', {}, 'Ajustes'),
    grupo('Instrumento', 'instrumento', [['guitarra', 'Guitarra'], ['bajo', 'Bajo'], ['piano', 'Piano']]),
    grupo('Mano que rasguea', 'mano', [['diestro', 'Derecha (diestro)'], ['zurdo', 'Izquierda (zurdo)']]),
    grupo('Nombres de las notas', 'nombres', [['ambos', 'Do (C)'], ['latino', 'Do Re Mi'], ['letras', 'C D E']]),
    h('fieldset', { class: 'grupo' }, h('legend', {}, 'Tus datos'),
      h('p', { class: 'nota' }, 'Tu progreso se guarda solo en este navegador. No hay cuentas ni se envía nada.'),
      h('button', { class: 'boton peligro', onclick: () => { if (confirm('¿Borrar tu perfil y todo tu progreso?')) { A.borrarTodo(); ir('#/'); } } }, 'Borrar mi progreso')),
    h('a', { class: 'boton secundario', href: '#/hoy' }, '← Volver'), pie()));
}

function creditos() {
  pintar(cabecera(), h('main', { class: 'pantalla' }, h('h1', {}, 'Créditos y licencias'),
    h('p', {}, 'Sonidos de guitarra, bajo y piano: ', h('a', { href: 'https://github.com/nbrosowsky/tonejs-instruments', rel: 'noopener' }, 'tonejs-instruments'),
      ' de Nicholaus Brosowsky, con licencia ', h('a', { href: 'https://creativecommons.org/licenses/by/3.0/', rel: 'noopener' }, 'CC BY 3.0'),
      '. Grabaciones originales: University of Iowa Electronic Music Studios (guitarra acústica), Karoryfer Samples (guitarra eléctrica y bajo) y Versilian Studios, VSCO 2 Community Edition (piano). Se usa una selección de notas, sin otras modificaciones.'),
    h('p', {}, 'Melodía del reto de la unidad 2: «Himno de la alegría», Ludwig van Beethoven (dominio público).'),
    h('a', { class: 'boton secundario', href: A.perfil() ? '#/hoy' : '#/' }, '← Volver')));
}

ruta();
