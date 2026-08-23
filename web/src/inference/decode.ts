/**
 * Decodifica la salida cruda de YOLOv9-t exportado por Ultralytics.
 *
 * Forma: [1, 4 + numClases, anchors]  ->  a 320px: [1, 30, 2100]
 *   filas 0-3  : cx, cy, w, h en pixeles de la entrada (NO normalizados)
 *   filas 4-29 : puntaje por clase, sigmoide ya aplicada. No hay objectness.
 *
 * Como en el ejercicio solo hay una mano en cuadro y solo interesa la letra,
 * basta con quedarse con el mejor anchor global: se salta NMS por completo.
 */
import type { Deteccion } from './types';

export function decodificar(
  salida: Float32Array,
  numClases: number,
  anchors: number,
  clases: string[],
  umbral: number,
): Deteccion {
  let mejorScore = -1;
  let mejorAnchor = -1;
  let mejorClase = -1;

  for (let c = 0; c < numClases; c++) {
    const base = (4 + c) * anchors;
    for (let a = 0; a < anchors; a++) {
      const s = salida[base + a];
      if (s > mejorScore) {
        mejorScore = s;
        mejorAnchor = a;
        mejorClase = c;
      }
    }
  }

  if (mejorAnchor < 0 || mejorScore < umbral) {
    // Se devuelve el score igual: distinguir "no hay mano" de "hay algo dudoso"
    // es justo lo que hace falta para calibrar el umbral con datos reales.
    return { letra: null, score: Math.max(mejorScore, 0), caja: null };
  }

  return {
    letra: clases[mejorClase],
    score: mejorScore,
    caja: [
      salida[0 * anchors + mejorAnchor],
      salida[1 * anchors + mejorAnchor],
      salida[2 * anchors + mejorAnchor],
      salida[3 * anchors + mejorAnchor],
    ],
  };
}
