// Perfil y progreso, guardados en este navegador (localStorage). Si el almacenamiento no está disponible
// (modo privado, bloqueado), todo funciona igual durante la sesión y simplemente no se recuerda.

const CLAVE = 'fretlastico.aprende.v1';
const REPASOS = [1, 3, 7, 21];          // días hasta cada repaso tras completar una unidad

const vacio = () => ({
  perfil: null,                          // { instrumento, nivel, objetivo, mano, nombres }
  unidades: {},                          // id → { completada: 'AAAA-MM-DD', repaso: n, proximo: 'AAAA-MM-DD' }
  racha: { dias: 0, ultimo: null },
  minutos: 0,
});

let datos = leer();

function leer() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE));
    return d && typeof d === 'object' ? { ...vacio(), ...d } : vacio();
  } catch { return vacio(); }
}

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* sin almacenamiento: solo esta sesión */ }
}

export const hoy = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const masDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return hoy(d); };

export const perfil = () => datos.perfil;
export function guardarPerfil(p) { datos.perfil = { ...(datos.perfil || {}), ...p }; guardar(); }

export const estadoUnidad = id => datos.unidades[id] || null;
export const completada = id => !!datos.unidades[id];

export function completar(id) {
  const ya = datos.unidades[id];
  if (ya) {                             // era un repaso: pasa al siguiente intervalo
    ya.repaso = Math.min(ya.repaso + 1, REPASOS.length);
    ya.proximo = ya.repaso < REPASOS.length ? masDias(hoy(), REPASOS[ya.repaso]) : null;
  } else {
    datos.unidades[id] = { completada: hoy(), repaso: 0, proximo: masDias(hoy(), REPASOS[0]) };
  }
  practicaHoy(); guardar();
}

export const repasosPendientes = () => Object.entries(datos.unidades)
  .filter(([, u]) => u.proximo && u.proximo <= hoy()).map(([id]) => id);

// Racha: días seguidos con algo de práctica.
export function practicaHoy(minutos = 0) {
  const h = hoy(), r = datos.racha;
  if (r.ultimo !== h) { r.dias = r.ultimo === masDias(h, -1) ? r.dias + 1 : 1; r.ultimo = h; }
  datos.minutos += minutos; guardar();
}

export function racha() {
  const r = datos.racha;
  return r.ultimo === hoy() || r.ultimo === masDias(hoy(), -1) ? r.dias : 0;
}
export const minutosTotales = () => Math.round(datos.minutos);

export function borrarTodo() { datos = vacio(); guardar(); }
