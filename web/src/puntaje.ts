/**
 * Sistema de puntaje y nota.
 *
 * La distincion que sostiene todo este modulo: el modelo entrega **confianza de
 * deteccion**, no "cuanto se parece tu sena a una correcta". Son cosas distintas.
 * Una confianza de 0.97 puede venir de una sena mal ejecutada; una bien hecha con
 * luz rara puede dar 0.55.
 *
 * Por eso el puntaje NO es la confianza. Se compone de tres senales, y las tres
 * crudas se guardan en la base de datos aparte del puntaje derivado: si manana
 * cambia esta formula, se recalcula el historico sin volver a pedirle a nadie que
 * repita nada.
 */

/** Umbral de confianza por defecto. Calibrado sobre la prueba de encuadre. */
export const UMBRAL_POR_DEFECTO = 0.5;

/** Duracion de la ventana de retencion, en segundos. */
export const VENTANA_RETENCION = 4;

/** Tiempo tras el cual se ofrece saltar la letra, en segundos. */
export const TIEMPO_MAXIMO = 30;

/**
 * Letras que llevan movimiento. Un detector de imagenes fijas no puede
 * evaluarlas: como mucho reconoce una pose congelada del gesto.
 *
 * La lista NO se dedujo, se leyo de las ilustraciones de referencia (img/*.png
 * del repositorio original): estas seis traen marca de movimiento dibujada.
 *
 *   G  flecha circular       S  espiral
 *   J  trazo en gancho       X  flecha diagonal doble
 *                            Z  trazo en Z
 *
 * La H tambien trae flecha lateral pero se evalua igual, por decision de
 * producto: su forma de mano es distintiva por si sola y el modelo la reconoce
 * sin problema. El desplazamiento lateral no cambia la configuracion de dedos.
 *
 * El dataset de entrenamiento SI tiene ejemplos de las seis, pero congelados en
 * un instante. O sea que el modelo las "reconoce" — el problema es que la
 * ilustracion le pide al usuario que se mueva mientras el modelo espera una pose
 * quieta. Evaluarlas seria calificar algo distinto de lo que se ensena.
 *
 * Para volver a evaluarlas basta con sacarlas de esta lista.
 */
export const LETRAS_DINAMICAS = ['G', 'J', 'S', 'X', 'Z'] as const;

/**
 * Confianza a partir de la cual la componente vale el maximo.
 *
 * Antes se normalizaba contra 1.0 — contra una confianza PERFECTA del modelo,
 * que no ocurre nunca: un detector real ronda 0,7-0,9 en una sena bien hecha.
 * Con ese techo, una evaluacion impecable (sena sostenida los 4 s, sin dudar,
 * en las 21 letras) tocaba techo en 6,2 y el 7,0 era inalcanzable por
 * construccion, no por merito.
 *
 * 0,65 es el punto donde el modelo ya esta claramente decidido. Pedir mas es
 * cobrarle al usuario la inseguridad del detector, que no es asunto suyo.
 */
export const CONFIANZA_PLENA = 0.65;

export const ABECEDARIO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Las 21 que se recorren en la evaluacion. */
export const LETRAS_EVALUABLES = ABECEDARIO.filter(
  (l) => !LETRAS_DINAMICAS.includes(l as (typeof LETRAS_DINAMICAS)[number]),
);

/**
 * Letras que SE PRACTICAN en la evaluacion pero NO entran en la nota.
 *
 * La P se mide mal: el modelo no la distingue con fiabilidad, asi que castigar
 * a alguien por no lograrla es castigarlo por un defecto nuestro. Sacarla del
 * recorrido tampoco corresponde — es parte del abecedario y hay que enseniarla
 * — asi que se muestra, se puede lograr, y no pesa en el promedio.
 *
 * Cuando el modelo la reconozca decentemente, se saca de esta lista y vuelve a
 * contar sin tocar nada mas.
 */
export const LETRAS_SIN_PUNTAJE = ['P'] as const;

/** Las que componen la nota: las evaluables menos las que no puntuan. */
export const LETRAS_PUNTUABLES = LETRAS_EVALUABLES.filter(
  (l) => !LETRAS_SIN_PUNTAJE.includes(l as (typeof LETRAS_SIN_PUNTAJE)[number]),
);

export interface InsumosPuntaje {
  /** Fraccion de muestras de la ventana con clase correcta y confianza >= umbral. */
  estabilidad: number;
  /** Media de confianza en esas muestras validas. */
  confianzaMedia: number;
  /** Segundos desde que aparecio la letra hasta completar la ventana. */
  segundosHastaLogro: number;
  umbral: number;
}

const acotar = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/**
 * Puntaje de una letra, 0-100.
 *
 * Pesos: estabilidad 50%, confianza 35%, fluidez 15%.
 *
 * - La estabilidad pesa mas porque es la senal mas honesta de las tres: mide si
 *   el usuario sostuvo la sena, no cuan seguro estaba el modelo.
 * - La confianza se normaliza SOBRE el umbral y contra CONFIANZA_PLENA, no
 *   contra 1.0. Rozar el umbral vale 0, no medio puntaje; llegar a 0,65 vale
 *   todo, porque exigir mas seria exigir una certeza que el modelo no da.
 * - La fluidez pesa poco a proposito: premia soltura sin convertir el ejercicio
 *   en una carrera, que seria pedagogicamente malo.
 */
export function puntajeLetra(i: InsumosPuntaje): number {
  // El maximo protege de un umbral configurado por encima del techo: sin el,
  // el divisor se volveria cero o negativo.
  const rango = Math.max(0.01, CONFIANZA_PLENA - i.umbral);
  const confNorm = acotar((i.confianzaMedia - i.umbral) / rango, 0, 1);
  const bonusTiempo = acotar(
    (TIEMPO_MAXIMO - i.segundosHastaLogro) / (TIEMPO_MAXIMO - VENTANA_RETENCION),
    0,
    1,
  );
  const bruto =
    0.5 * acotar(i.estabilidad, 0, 1) + 0.35 * confNorm + 0.15 * bonusTiempo;
  return acotar(bruto * 100, 0, 100);
}

/**
 * Nota chilena 1,0-7,0 con exigencia al 60%: 60 puntos = 4,0.
 *
 * Se usa la escala con exigencia y no una lineal porque es la que la gente
 * entiende sin que se la expliquen, y hace que un 4,0 signifique algo.
 */
export function nota(promedioPuntaje: number): number {
  const p = acotar(promedioPuntaje, 0, 100);
  const n = p < 60 ? 1 + 3 * (p / 60) : 4 + 3 * ((p - 60) / 40);
  return Math.round(n * 10) / 10;
}

/**
 * Promedio sobre TODAS las letras que puntuan: las no logradas cuentan como 0.
 *
 * Ojo con el denominador: son las PUNTUABLES, no las evaluables. Una letra que
 * se practica pero no puntua no aparece ni en el numerador ni en el divisor —
 * si estuviera solo en el divisor, no puntuar seria lo mismo que fallar.
 */
export function promedioSesion(
  puntajes: Record<string, number>,
  letras: string[] = LETRAS_PUNTUABLES,
): number {
  if (letras.length === 0) return 0;
  const suma = letras.reduce((acc, l) => acc + (puntajes[l] ?? 0), 0);
  return suma / letras.length;
}

export const MENSAJES_REFUERZO = [
  'Muy bien',
  'Excelente',
  'Bien hecho',
  'Perfecto',
];

export function mensajeRefuerzo(): string {
  return MENSAJES_REFUERZO[Math.floor(Math.random() * MENSAJES_REFUERZO.length)];
}
