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

export const ABECEDARIO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Las 21 que se evaluan y componen la nota. */
export const LETRAS_EVALUABLES = ABECEDARIO.filter(
  (l) => !LETRAS_DINAMICAS.includes(l as (typeof LETRAS_DINAMICAS)[number]),
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
 * - La confianza se normaliza SOBRE el umbral, no sobre cero. Rozar el umbral
 *   vale 0, no medio puntaje.
 * - La fluidez pesa poco a proposito: premia soltura sin convertir el ejercicio
 *   en una carrera, que seria pedagogicamente malo.
 */
export function puntajeLetra(i: InsumosPuntaje): number {
  const confNorm = acotar(
    (i.confianzaMedia - i.umbral) / (1 - i.umbral),
    0,
    1,
  );
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

/** Promedio sobre TODAS las letras evaluables: las no logradas cuentan como 0. */
export function promedioSesion(
  puntajes: Record<string, number>,
  letras: string[] = LETRAS_EVALUABLES,
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
