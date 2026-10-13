// Camino de guitarra. Cada unidad es una lista de pasos; los tipos de paso los pinta app.js.
// Cuerdas: índice 0 = 6.ª (Mi grave) … 5 = 1.ª (Mi agudo).

const C1 = 5, C2 = 4;  // 1.ª y 2.ª cuerda

export const UNIDADES = [
  {
    id: 'g1', titulo: 'Conoce y afina tu guitarra', minutos: 5, icono: '🎸',
    objetivo: 'Saber cómo se llaman las cuerdas y dejar la guitarra afinada.',
    pasos: [
      { tipo: 'explica', titulo: 'Seis cuerdas, seis nombres',
        texto: ['La cuerda más gruesa es la 6.ª y la más fina, la 1.ª. Al revés de lo que parece: se cuentan desde abajo, desde la más aguda.',
                'De la más gruesa a la más fina se llaman Mi, La, Re, Sol, Si y Mi. Hay dos Mi: uno grave y otro agudo, dos octavas más arriba.'],
        dibujo: { tipo: 'mastil', desde: 0, hasta: 3, cuerdasAlAire: true },
        escuchar: [{ etiqueta: 'Escucha las seis al aire', cuerdas: [0, 1, 2, 3, 4, 5] }] },
      { tipo: 'explica', titulo: 'Cómo sujetarla',
        texto: ['Sentado, con la guitarra apoyada en la pierna derecha (en la izquierda si eres zurdo) y el mástil un poco hacia arriba.',
                'La mano que pisa las cuerdas va relajada: el pulgar detrás del mástil, sin apretar. La otra mano rasguea o pulsa a la altura de la boca.',
                'Si algo duele, para. Al principio las yemas se quejan un poco; con días de práctica se endurecen.'] },
      { tipo: 'afinar', titulo: 'Afina las seis cuerdas',
        texto: ['Toca cada cuerda al aire y gira su clavija despacio hasta que la aguja quede en el centro.',
                'Si no aparece ninguna nota, acércate al micro o toca un poco más fuerte.'] },
      { tipo: 'fin', texto: 'Ya sabes cómo se llama cada cuerda y tu guitarra está afinada. Afínala siempre antes de practicar: tarda un minuto y todo suena mejor.' },
    ],
  },
  {
    id: 'g2', titulo: 'Tus primeras notas', minutos: 8, icono: '🎵',
    objetivo: 'Pisar una nota limpia y tocar una melodía conocida.',
    pasos: [
      { tipo: 'explica', titulo: 'Cómo pisar una nota',
        texto: ['Pisa con la yema, justo detrás del traste (la barrita de metal), no en medio de la casilla. Así basta con poca fuerza.',
                'Si suena «zumbido», acerca el dedo al traste o aprieta un poco más. Si suena apagado, es que otro dedo está tocando la cuerda.'],
        dibujo: { tipo: 'mastil', desde: 0, hasta: 4, marcas: [{ cuerda: C1, traste: 1, texto: '1' }, { cuerda: C1, traste: 3, texto: '3' }] } },
      { tipo: 'notas', titulo: 'Tres notas en la 1.ª cuerda',
        texto: ['Mi al aire, Fa en el traste 1 (dedo índice) y Sol en el traste 3 (dedo anular). Toca la que se ilumina: te escucho y paso a la siguiente.'],
        desde: 0, hasta: 4,
        secuencia: [{ cuerda: C1, traste: 0 }, { cuerda: C1, traste: 1 }, { cuerda: C1, traste: 3 }, { cuerda: C1, traste: 1 }, { cuerda: C1, traste: 0 }] },
      { tipo: 'notas', titulo: 'Tres notas en la 2.ª cuerda',
        texto: ['Lo mismo una cuerda más abajo: Si al aire, Do en el traste 1 y Re en el traste 3.'],
        desde: 0, hasta: 4,
        secuencia: [{ cuerda: C2, traste: 0 }, { cuerda: C2, traste: 1 }, { cuerda: C2, traste: 3 }, { cuerda: C2, traste: 1 }, { cuerda: C2, traste: 0 }] },
      { tipo: 'notas', titulo: 'Reto: el Himno de la alegría', reto: true,
        texto: ['Con esas notas ya puedes tocar la melodía de Beethoven. Escúchala primero y luego tócala tú, a tu ritmo.'],
        desde: 0, hasta: 4, escucharPrimero: true,
        secuencia: [[C1, 0], [C1, 0], [C1, 1], [C1, 3], [C1, 3], [C1, 1], [C1, 0], [C2, 3], [C2, 1], [C2, 1], [C2, 3], [C1, 0], [C1, 0], [C2, 3], [C2, 3]]
          .map(([cuerda, traste]) => ({ cuerda, traste })) },
      { tipo: 'fin', texto: 'Has tocado tu primera melodía. Repítela mañana: cada vez te saldrá más seguida.' },
    ],
  },
  {
    id: 'g3', titulo: 'Tus dos primeros acordes', minutos: 10, icono: '✋',
    objetivo: 'Tocar Mi menor y La menor sonando limpios.',
    pasos: [
      { tipo: 'explica', titulo: 'Qué es un acorde',
        texto: ['Un acorde son varias notas a la vez. Con la mano izquierda (la derecha si eres zurdo) formas una «figura» y con la otra rasgueas todas las cuerdas.',
                'En los diagramas, las líneas verticales son las cuerdas y las horizontales, los trastes. Los números son los dedos: 1 índice, 2 corazón, 3 anular y 4 meñique. Un círculo es una cuerda al aire y una ✕, una cuerda que no se toca.'] },
      { tipo: 'acorde', acorde: 'Em', titulo: 'Mi menor (Em)',
        texto: ['Mi menor solo necesita dos dedos: el 2 y el 3, en el traste 2 de la 5.ª y la 4.ª cuerda. Rasguea las seis cuerdas.',
                'Toca el acorde: te escucho y te digo si suenan todas sus notas. Necesitas tres rasgueos limpios.'] },
      { tipo: 'acorde', acorde: 'Am', titulo: 'La menor (Am)',
        texto: ['La menor tiene la misma figura que Mi menor, pero una cuerda más abajo y con el dedo 1 en el traste 1 de la 2.ª cuerda.',
                'Ojo: la 6.ª cuerda no se toca. Empieza el rasgueo en la 5.ª.'] },
      { tipo: 'fin', texto: 'Mi menor y La menor: con ellos ya se pueden acompañar canciones enteras. Lo siguiente es pasar de uno a otro sin parar.' },
    ],
  },
  {
    id: 'g4', titulo: 'Cambia de acorde a tiempo', minutos: 8, icono: '⏱️',
    objetivo: 'Pasar de Mi menor a La menor siguiendo el pulso.',
    pasos: [
      { tipo: 'explica', titulo: 'El truco de los dedos que no se mueven',
        texto: ['De Mi menor a La menor, los dedos 2 y 3 bajan juntos una cuerda, sin soltarse, y el dedo 1 se añade. Muévelos como un bloque.',
                'No hace falta que sea rápido: es mejor un cambio lento y a tiempo que uno rápido y a trompicones.'] },
      { tipo: 'cambios', titulo: 'Cuatro pulsos cada uno', acordes: ['Em', 'Am'], bpm: 60, pulsos: 4, vueltas: 4,
        texto: ['Rasguea una vez en cada pulso. Cuando la cuenta llegue a 4, cambia: el acorde siguiente ya aparece en pequeño.'] },
      { tipo: 'cambios', titulo: 'Reto: dos pulsos cada uno', reto: true, acordes: ['Em', 'Am'], bpm: 66, pulsos: 2, vueltas: 6,
        texto: ['Ahora cambias cada dos pulsos y un poco más deprisa. Si te pierdes, no pares: entra en el siguiente pulso.'] },
      { tipo: 'fin', texto: 'Cambiar a tiempo es lo que separa «saber un acorde» de «tocar una canción». En la próxima unidad, tu primera canción con cuatro acordes.' },
    ],
  },
];

export const PROXIMAS = [
  { titulo: 'Tu primera canción: Mi menor, Do, Sol y Re', icono: '🎶' },
  { titulo: 'Rasgueos con ritmo', icono: '🥁' },
  { titulo: 'La pentatónica: tu primera escala para improvisar', icono: '🔥' },
];
